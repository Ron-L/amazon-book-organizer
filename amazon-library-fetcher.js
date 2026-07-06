// Amazon Library Fetcher
// Fetches library books and enriches them with descriptions, reviews, tags, and prices
//
// Phases:
// - Phase 1: Fetch book titles/metadata (incremental - stops at overlap)
// - Phase 2: Enrich with descriptions & reviews (new books + gap-fill)
// - Phase 3: Fetch tags/genres (incremental - 10 books per run)
// - Phase 4: Fetch prices for wishlist books (all wishlist every run)
// - Phase 5: Background orphan scan (full library scan, flags removed books)
//
// Instructions:
// 1. Go to https://www.amazon.com/yourbooks (must be logged in)
// 2. Click the bookmarklet and select "Import Library"
// 3. Wait for completion — data uploads automatically through the encrypted relay
// 4. Open ReaderWrangler to see your library
//
// Re-run: After pasting once, you can re-run with: fetchAmazonLibrary()

async function fetchAmazonLibrary() {
    const PAGE_TITLE = document.title;
    const FETCHER_VERSION = 'v4.11.9-alpha.1';
    const SCHEMA_VERSION = '2.1';

    console.log('========================================');
    console.log(`Amazon Library Fetcher ${FETCHER_VERSION}`);
    console.log(`📄 Page: ${PAGE_TITLE}`);
    console.log('Phase 1 (titles) + Phase 2 (enrichment) + Phase 3 (tags) + Phase 4 (prices) + Phase 5 (orphan scan)');
    console.log('========================================\n');

    // Verify we're on the right page
    if (!window.location.href.includes('amazon.com/yourbooks')) {
        console.error('❌ ERROR: Wrong page!');
        console.error('   Please run this on: https://www.amazon.com/yourbooks');
        return;
    }

    const PAGE_SIZE = 30;
    const FETCH_DELAY_MS = 0; // No delay - network RTT provides natural throttling
    const ENRICH_DELAY_MS = 0; // No delay - network RTT provides natural throttling
    const ENRICH_BATCH_SIZE = 30; // Max ASINs per getProducts call (Amazon limit)
    // v4.11.7 - Recovery batches 30 ASINs/call again. The old "empty batch" behavior was NOT batch-composition
    // sensitivity — it was the missing ignorePSLD header (see apiHeaders). Without it, product-null ASINs
    // resolve to nothing, so a batch made ENTIRELY of them returned empty (which is what the recovery batches
    // were). With the header they resolve, so batching is safe again (validated: 30/30, incl. hash-dependent).
    const RECOVERY_BATCH_SIZE = 30;
    const LIBRARY_FILENAME = 'amazon-library.json';
    const startTime = Date.now();

    // Retry configuration for API errors
    const MAX_RETRIES = 3;
    const RETRY_DELAYS_MS = [5000, 10000, 20000]; // Exponential backoff: 5s, 10s, 20s

    // CSRF token (initialized later, but declared here for scope access in fetchWithRetry)
    let csrfToken = null;

    // Headers for EVERY kindle-reader-api call. Centralized so the one fragile piece lives in one place.
    // x-aapi-experimental-params carries ignorePSLD:true — it lets Amazon resolve products that lack
    // Product Sales/Listing Data (older / library-only editions) instead of returning a null product.
    // Without it, ~350 owned books (e.g. the Gideon Sable series) come back product-null and were dropped.
    // Validated safe: ignorePSLD does NOT strip prices or genres from normal books.
    // FRAGILITY: the blob embeds an experiment hash (…f3beacefbe4b) Amazon could rotate; Phase 0's canary
    // self-test detects a stale hash and flags it (same rotation caveat as the LIBRARY exclude-tag hashes).
    function apiHeaders() {
        return {
            'accept': 'application/json, text/plain, */*',
            'content-type': 'application/json',
            'anti-csrftoken-a2z': csrfToken,
            'x-client-id': 'your-books',
            'x-amz-portal-marketplace-id': 'ATVPDKIKX0DER',
            'x-cc-currency-of-preference': 'USD',
            'x-aapi-experimental-params': 'W3siZXhwZXJpbWVudElkIjoiaWdub3JlUFNMRF9mM2JlYWNlZmJlNGIiLCJleHBlcmltZW50S2V5IjoiaWdub3JlUFNMRCIsInZhbHVlIjoidHJ1ZSJ9XQ=='
        };
    }

    // Demo whitelist — filter to specific ASINs for tutorial video recording
    let whitelistASINs = null;
    if (localStorage.getItem('readerwrangler-demo-whitelist-enabled') === 'true') {
        try {
            const asinList = JSON.parse(localStorage.getItem('readerwrangler-demo-whitelist') || '[]');
            if (asinList.length > 0) {
                whitelistASINs = new Set(asinList);
                console.log(`🔒 Demo whitelist active: ${whitelistASINs.size} ASINs`);
            }
        } catch (e) {
            console.warn('⚠️ Demo whitelist parse error, ignoring:', e.message);
        }
    }

    // Book-only bindings (filter out non-book items)
    const BOOK_BINDINGS = [
        'Kindle Edition',
        'Paperback',
        'Hardcover',
        'Mass Market Paperback',
        'Board book',
        'Unknown Binding',
        'Audible Audiobook',
        'Kindle Edition with Audio/Video'
    ];

    // Global tracking for statistics
    const stats = {
        timing: {
            phase0Start: 0,
            phase0End: 0,
            pass1Start: 0,
            pass1End: 0,
            pass2Start: 0,
            pass2End: 0,
            phase3Start: 0,
            phase3End: 0,
            phase4Start: 0,
            phase4End: 0,
            mergeStart: 0,
            mergeEnd: 0
        },
        apiCalls: {
            total: 0,
            firstTry: 0,
            retry1: 0,
            retry2: 0,
            retry3: 0,
            failed: 0
        },
        nonBooksFiltered: [],
        booksWithoutAuthors: [],
        aiSummariesUsed: [],
        apiErrorBooks: [],
        partialErrorBooks: [],  // Track books with partial errors (got data anyway)
        duplicatesFound: [],  // Track duplicate ASINs
        // v4.11.0 - Completeness: no silent drops. Books the library query returns with product=null are
        // recovered by ASIN via getProducts; whatever can't be resolved is flagged (delisted), never dropped.
        recoveredBooks: [],     // null-product library nodes recovered via getProducts
        unrecoverableBooks: [], // null-product nodes with no product data anywhere (delisted/unavailable)
        unknownNodeTypes: [],   // library node __typenames we don't handle (flagged + GoatCounter, never silent)
        recoveryCandidates: 0,  // how many missing books the recovery pass attempted (integrity: = recovered + unrecoverable + deferred)
        seriesFromTitle: 0,     // recovered books whose series/# was parsed from the title (dead editions with bookSeries=null)
        ownershipUpgraded: [],  // v4.11.8 - books promoted sample/wishlist/borrowed → purchased via pastPurchase (Amazon leaves relationshipSubType stale)
        libraryTotalCount: null, // Amazon's reported library total, for reconciliation
        errorCategories: {
            amazonTimeout: 0,      // 504.1 / Backend Future timed out
            customerMarketplace: 0, // Customer Id or Marketplace Id invalid
            other: 0               // Unrecognized errors
        },
        ownershipTypes: {
            purchased: 0,    // count only (most common)
            sample: 0,
            borrowed: 0,     // Family Library sharing
            prime: 0,        // Prime Reading
            kindleUnlimited: 0, // Kindle Unlimited (KU)
            koll: 0,         // Kindle Owners' Lending Library
            comixology: 0,   // Comixology Unlimited
            insideAmazon: 0, // Amazon Insider (employee/internal testing program — speculative)
            unknown: []      // { asin, title, rawType } - for investigation
        }
    };

    // Helper function to format time (used in multiple places)
    const formatTime = (ms) => {
        const totalSeconds = Math.floor(ms / 1000);
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;

        if (hours > 0) return `${hours}h ${minutes}m ${seconds}s`;
        else if (minutes > 0) return `${minutes}m ${seconds}s`;
        else return `${seconds}s`;
    };

    // Helper function to format friendly error messages from Amazon API errors
    // Returns { message, category } for both display and stats tracking
    const formatApiError = (errorMsg) => {
        // 504.1 timeout - Amazon backend service timeout
        if (errorMsg.includes('504.1') || errorMsg.includes('Backend Future timed out')) {
            return {
                message: 'Amazon server timeout (504.1) - temporary issue, data still retrieved',
                category: 'amazonTimeout'
            };
        }
        // Customer/Marketplace ID error - benign internal error
        if (errorMsg.includes('Customer Id or Marketplace Id is invalid')) {
            return {
                message: 'Amazon internal error (Customer/Marketplace ID) - data still retrieved',
                category: 'customerMarketplace'
            };
        }
        // Return original if no match (truncate if very long)
        const truncatedMsg = errorMsg.length > 100 ? errorMsg.substring(0, 100) + '...' : errorMsg;
        return {
            message: truncatedMsg,
            category: 'other'
        };
    };


    // ============================================================================
    // Progress Overlay UI (Option C - Minimal + Progress Bar + Abort)
    // ============================================================================
    const progressUI = (() => {
        let overlay = null;
        let infoBanner = null;
        let phaseElement = null;
        let detailElement = null;
        let progressBarFill = null;
        let progressText = null;
        let timerElement = null;
        let phaseStartTime = null;
        let abortRequested = false;

        function create() {
            overlay = document.createElement('div');
            overlay.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                background: white;
                border-radius: 12px;
                box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
                padding: 20px;
                padding-top: 35px;
                z-index: 10000;
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
                min-width: 300px;
                max-width: 400px;
            `;

            overlay.innerHTML = `
                <button id="closeBtn" style="
                    position: absolute;
                    top: 8px;
                    right: 8px;
                    background: none;
                    border: none;
                    font-size: 20px;
                    color: #999;
                    cursor: pointer;
                    padding: 4px 8px;
                    line-height: 1;
                " onmouseover="this.style.color='#333'" onmouseout="this.style.color='#999'">✕</button>
                <div style="font-size: 18px; font-weight: bold; color: #333; margin-bottom: 10px;">
                    📚 Library Download ${FETCHER_VERSION}
                </div>
                <div id="infoBanner" style="display: none; font-size: 13px; color: #856404; background: #fff3cd; border: 1px solid #ffc107; border-radius: 6px; padding: 8px 12px; margin-bottom: 10px;">
                </div>
                <div id="progressPhase" style="font-size: 14px; color: #667eea; margin-bottom: 8px; font-weight: 500;">
                    Starting...
                </div>
                <div id="progressDetail" style="font-size: 13px; color: #666; margin-bottom: 8px;">
                    Initializing
                </div>
                <div id="progressBarContainer" style="display: none; margin-bottom: 8px;">
                    <div style="background: #e0e0e0; border-radius: 4px; height: 8px; overflow: hidden;">
                        <div id="progressBarFill" style="background: linear-gradient(90deg, #667eea, #764ba2); height: 100%; width: 0%; transition: width 0.3s ease;"></div>
                    </div>
                    <div id="progressText" style="font-size: 12px; color: #666; margin-top: 4px; text-align: center;"></div>
                </div>
                <div id="timerDisplay" style="font-size: 12px; color: #999; text-align: center; padding-top: 8px; border-top: 1px solid #eee;">
                    ⏱️ Elapsed: 0s
                </div>
            `;

            infoBanner = overlay.querySelector('#infoBanner');
            phaseElement = overlay.querySelector('#progressPhase');
            detailElement = overlay.querySelector('#progressDetail');
            progressBarFill = overlay.querySelector('#progressBarFill');
            progressText = overlay.querySelector('#progressText');
            timerElement = overlay.querySelector('#timerDisplay');

            // Add click handler for X button - sets abort flag and removes overlay
            const closeBtn = overlay.querySelector('#closeBtn');
            if (closeBtn) {
                closeBtn.onclick = () => {
                    abortRequested = true;
                    console.log('⚠️ Abort requested by user - will stop after current operation');
                    overlay.remove();
                };
            }

            document.body.appendChild(overlay);
        }

        function isAborted() {
            return abortRequested;
        }

        function updatePhase(phase, detail = '') {
            if (!overlay) create();
            if (phaseElement) phaseElement.textContent = phase;
            if (detailElement) detailElement.textContent = detail;
            // Reset timer when phase changes
            phaseStartTime = Date.now();
            updateTimer();
        }

        function updateTimer() {
            if (!overlay || !phaseStartTime) return;
            const elapsed = Date.now() - phaseStartTime;
            const seconds = Math.floor(elapsed / 1000);
            const minutes = Math.floor(seconds / 60);
            const remainingSeconds = seconds % 60;
            const timeStr = minutes > 0 ? `${minutes}m ${remainingSeconds}s` : `${seconds}s`;
            if (timerElement) timerElement.textContent = `⏱️ Elapsed: ${timeStr}`;
        }

        function updateProgress(current, total) {
            if (!overlay) create();
            const container = overlay.querySelector('#progressBarContainer');
            if (container) container.style.display = 'block';

            const percent = Math.round((current / total) * 100);
            if (progressBarFill) progressBarFill.style.width = `${percent}%`;
            if (progressText) progressText.textContent = `${current.toLocaleString()} of ${total.toLocaleString()} books (${percent}%)`;
            updateTimer(); // Update elapsed time with each progress update
        }

        function updateDetail(detail) {
            if (!overlay) create();
            if (detailElement) detailElement.textContent = detail;
            updateTimer(); // Update elapsed time
        }

        function remove() {
            if (overlay && overlay.parentElement) {
                overlay.style.transition = 'opacity 0.3s';
                overlay.style.opacity = '0';
                setTimeout(() => overlay.remove(), 300);
            }
        }

        // v4.10.0-alpha.2 - Multi-state completion dialog for fetch + orphan scan
        // State 2: fetch done, orphan scan in progress (no close button)
        // State 3a/3b/3c: everything done (close button appears)
        function showFetchComplete(message) {
            if (!overlay) return;
            // Build the multi-state dialog — fetch result at top, orphan area below
            overlay.innerHTML = `
                <div style="font-size: 18px; font-weight: bold; color: #333; margin-bottom: 10px;">
                    📚 Library Download ${FETCHER_VERSION}
                </div>
                <div style="font-size: 14px; color: #2e7d32; margin-bottom: 4px; font-weight: 500;">
                    ✅ ${message}
                </div>
                <div id="importHint" style="font-size: 13px; color: #666; margin-bottom: 12px;">
                    Import from Relay in the app to load your updated library.
                </div>
                <div id="orphanSection" style="border-top: 1px solid #eee; padding-top: 12px;">
                    <div id="orphanStatus" style="font-size: 14px; color: #667eea; margin-bottom: 8px; font-weight: 500;">
                        Scanning for orphans...
                    </div>
                    <div id="orphanDetail" style="font-size: 13px; color: #666; margin-bottom: 8px;">
                        Checking which books are still in your Amazon library
                    </div>
                    <div id="orphanBarContainer" style="margin-bottom: 8px;">
                        <div style="background: #e0e0e0; border-radius: 4px; height: 8px; overflow: hidden;">
                            <div id="orphanBarFill" style="background: linear-gradient(90deg, #667eea, #764ba2); height: 100%; width: 0%; transition: width 0.3s ease;"></div>
                        </div>
                        <div id="orphanBarText" style="font-size: 12px; color: #666; margin-top: 4px; text-align: center;"></div>
                    </div>
                    <div style="font-size: 12px; color: #999;">
                        Leave this tab open to complete the scan.
                    </div>
                </div>
                <div id="closeSection" style="display: none; margin-top: 15px;">
                    <button id="closeBtn2" style="
                        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                        color: white;
                        border: none;
                        padding: 10px 20px;
                        border-radius: 8px;
                        font-size: 14px;
                        font-weight: bold;
                        cursor: pointer;
                        width: 100%;
                    ">
                        Close
                    </button>
                </div>
            `;
            overlay.querySelector('#closeBtn2')?.addEventListener('click', () => overlay.remove());
        }

        function updateOrphanProgress(currentPage, estimatedTotalPages) {
            if (!overlay) return;
            const fill = overlay.querySelector('#orphanBarFill');
            const text = overlay.querySelector('#orphanBarText');
            if (fill && estimatedTotalPages > 0) {
                const percent = Math.round((currentPage / estimatedTotalPages) * 100);
                fill.style.width = `${Math.min(percent, 100)}%`;
            }
            if (text) text.textContent = `Page ${currentPage} of ~${estimatedTotalPages}`;
        }

        function showOrphanResult(resultHtml) {
            if (!overlay) return;
            // Remove the top import hint — the orphan result section now has the CTA
            const importHint = overlay.querySelector('#importHint');
            if (importHint) importHint.remove();
            const orphanSection = overlay.querySelector('#orphanSection');
            if (orphanSection) {
                orphanSection.innerHTML = `<div style="font-size: 14px; color: #666; line-height: 1.6;">${resultHtml}</div>`;
            }
            const closeSection = overlay.querySelector('#closeSection');
            if (closeSection) closeSection.style.display = 'block';
        }

        function showComplete(message) {
            if (!overlay) return;
            overlay.innerHTML = `
                <button style="
                    position: absolute;
                    top: 8px;
                    right: 8px;
                    background: none;
                    border: none;
                    font-size: 20px;
                    color: #999;
                    cursor: pointer;
                    padding: 4px 8px;
                    line-height: 1;
                " onmouseover="this.style.color='#333'" onmouseout="this.style.color='#999'" onclick="this.parentElement.remove()">✕</button>
                <div style="font-size: 18px; font-weight: bold; color: #2e7d32; margin-bottom: 10px;">
                    ✅ Complete!
                </div>
                <div style="font-size: 14px; color: #666; margin-bottom: 15px;">
                    ${message}
                </div>
                <button style="
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    color: white;
                    border: none;
                    padding: 10px 20px;
                    border-radius: 8px;
                    font-size: 14px;
                    font-weight: bold;
                    cursor: pointer;
                    width: 100%;
                " onclick="this.parentElement.remove()">
                    Close
                </button>
            `;
            // Auto-dismiss after 30 seconds
            setTimeout(remove, 30000);
        }

        function showError(message) {
            if (!overlay) create();
            overlay.innerHTML = `
                <button style="
                    position: absolute;
                    top: 8px;
                    right: 8px;
                    background: none;
                    border: none;
                    font-size: 20px;
                    color: #999;
                    cursor: pointer;
                    padding: 4px 8px;
                    line-height: 1;
                " onmouseover="this.style.color='#333'" onmouseout="this.style.color='#999'" onclick="this.parentElement.remove()">✕</button>
                <div style="font-size: 18px; font-weight: bold; color: #c62828; margin-bottom: 10px;">
                    ❌ Error
                </div>
                <div style="font-size: 14px; color: #666; margin-bottom: 15px;">
                    ${message}
                </div>
                <div style="font-size: 12px; color: #999; border-top: 1px solid #eee; padding-top: 10px;">
                    Check console for details
                </div>
                <button style="
                    background: #f44336;
                    color: white;
                    border: none;
                    padding: 10px 20px;
                    border-radius: 8px;
                    font-size: 14px;
                    font-weight: bold;
                    cursor: pointer;
                    width: 100%;
                    margin-top: 10px;
                " onclick="this.parentElement.remove()">
                    Close
                </button>
            `;
        }

        function showRetryUpload(errorMessage) {
            return new Promise((resolve) => {
                if (!overlay) create();
                overlay.innerHTML = `
                    <div style="font-size: 18px; font-weight: bold; color: #d32f2f; margin-bottom: 10px;">
                        ❌ Upload Failed
                    </div>
                    <div style="font-size: 14px; color: #666; margin-bottom: 15px;">
                        ${errorMessage}
                    </div>
                    <button id="retryBtn" style="
                        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                        color: white; border: none; padding: 12px 20px;
                        border-radius: 8px; font-size: 16px; font-weight: bold;
                        cursor: pointer; width: 100%; transition: transform 0.1s;
                    ">
                        🔄 Retry Upload
                    </button>
                    <button id="cancelBtn" title="Discard data" style="
                        background: transparent; color: #999;
                        border: 1px solid #ccc; padding: 6px 16px;
                        border-radius: 4px; font-size: 12px;
                        cursor: pointer; margin-top: 15px;
                    ">
                        Cancel
                    </button>
                `;
                const retryBtn = overlay.querySelector('#retryBtn');
                retryBtn.onmouseover = () => retryBtn.style.transform = 'scale(1.02)';
                retryBtn.onmouseout = () => retryBtn.style.transform = 'scale(1)';
                retryBtn.onclick = () => resolve('retry');
                overlay.querySelector('#cancelBtn').onclick = () => resolve('cancel');
            });
        }

        function showInfoBanner(text) {
            if (!overlay) create();
            if (infoBanner) {
                infoBanner.textContent = text;
                infoBanner.style.display = 'block';
            }
        }

        return { create, updatePhase, updateDetail, updateProgress, remove, showComplete, showFetchComplete, updateOrphanProgress, showOrphanResult, showError, isAborted, showRetryUpload, showInfoBanner };
    })();

    // Initialize progress UI
    progressUI.create();

    // ============================================================================
    // Shared Extraction Functions
    // These ensure Phase 0, Pass 1, and Pass 2 all extract data identically
    // ============================================================================

    // RECURSIVE fragment extractor - handles arbitrarily deep nesting
    const extractTextFromFragments = (fragments) => {
        if (!fragments || !Array.isArray(fragments)) return '';

        const textParts = [];

        for (const frag of fragments) {
            // Direct text
            if (frag.text) {
                textParts.push(frag.text);
            }

            // Text in paragraph
            if (frag.paragraph?.text) {
                textParts.push(frag.paragraph.text);
            }

            // Fragments in paragraph (RECURSIVE)
            if (frag.paragraph?.fragments) {
                textParts.push(extractTextFromFragments(frag.paragraph.fragments));
            }

            // Text in semanticContent
            if (frag.semanticContent?.content?.text) {
                textParts.push(frag.semanticContent.content.text);
            }

            // Nested fragments in semanticContent (RECURSIVE!)
            if (frag.semanticContent?.content?.fragments) {
                textParts.push(extractTextFromFragments(frag.semanticContent.content.fragments));
            }

            // Paragraph in semanticContent
            if (frag.semanticContent?.content?.paragraph?.text) {
                textParts.push(frag.semanticContent.content.paragraph.text);
            }

            // Fragments in paragraph in semanticContent (RECURSIVE)
            if (frag.semanticContent?.content?.paragraph?.fragments) {
                textParts.push(extractTextFromFragments(frag.semanticContent.content.paragraph.fragments));
            }
        }

        return textParts.join('');
    };

    const extractDescription = (product) => {
        const descSection = product.description?.sections?.[0];
        const descContent = descSection?.content;

        if (!descContent) return '';

        // Simple string
        if (typeof descContent === 'string') {
            return descContent;
        }

        // Direct text
        if (descContent.text) {
            return descContent.text;
        }

        // Paragraph with text
        if (descContent.paragraph?.text) {
            return descContent.paragraph.text;
        }

        // Paragraph with fragments
        if (descContent.paragraph?.fragments) {
            return extractTextFromFragments(descContent.paragraph.fragments).trim();
        }

        // Direct fragments (most common case)
        if (descContent.fragments) {
            return extractTextFromFragments(descContent.fragments).trim();
        }

        // semanticContent with nested fragments
        if (descContent.semanticContent?.content?.fragments) {
            return extractTextFromFragments(descContent.semanticContent.content.fragments).trim();
        }

        // semanticContent with text
        if (descContent.semanticContent?.content?.text) {
            return descContent.semanticContent.content.text;
        }

        return '';
    };

    const extractAISummary = (product) => {
        const recommendations = product.auxiliaryStoreRecommendations?.recommendations || [];

        for (const rec of recommendations) {
            if (rec.recommendationType === 'AI_SUMMARIES' && rec.sharedContent?.length > 0) {
                return rec.sharedContent[0].contentAbstract?.textAbstract || '';
            }
        }

        return '';
    };

    const extractAuthors = (product) => {
        return product.byLine?.contributors
            ?.map(c => c.name || c.contributor?.author?.profile?.displayName)
            .filter(Boolean)
            .join(', ') || 'Unknown Author';
    };

    const extractCoverUrls = (product) => {
        const images = product.images?.images?.[0];
        const hiResUrl = (images?.hiRes?.physicalId && images?.hiRes?.extension)
            ? `https://images-na.ssl-images-amazon.com/images/I/${images.hiRes.physicalId}.${images.hiRes.extension}`
            : null;
        const lowResUrl = (images?.lowRes?.physicalId && images?.lowRes?.extension)
            ? `https://images-na.ssl-images-amazon.com/images/I/${images.lowRes.physicalId}.${images.lowRes.extension}`
            : null;
        const fallbackUrl = `https://images-na.ssl-images-amazon.com/images/P/${product.asin}.01.LZZZZZZZ.jpg`;

        // coverUrl: prefer lowRes for smaller file size (311x500 vs 1594x2560)
        // coverUrlHiRes: archive hiRes for future use (zoom, print, etc.)
        return {
            coverUrl: lowResUrl || hiResUrl || fallbackUrl,
            coverUrlHiRes: hiResUrl
        };
    };

    // v4.11.7 - Last-resort series recovery from the TITLE. Dead/delisted editions (the null-product books
    // we recover via getProducts) come back with bookSeries=null — Amazon has no series record for them.
    // But the title almost always carries it, e.g. "Where is Anybody? (A Gideon Sable novel Book 5)".
    // Precision-first (validated ~98% correct position on 800 real books): trust ONLY a clear number marker
    // inside the LAST parenthetical; leave it null otherwise. "Wrong is worse than none." Never overrides
    // real API series data — used only as a fallback when bookSeries is absent.
    const parseSeriesFromTitle = (title) => {
        if (!title) return { series: null, seriesPosition: null };
        const parens = [...title.matchAll(/\(([^()]*)\)/g)];
        if (!parens.length) return { series: null, seriesPosition: null };
        const inner = parens[parens.length - 1][1].trim();
        const pm = inner.match(/\bbook\s+(\d+)\b/i) || inner.match(/#\s*(\d+)\b/) || inner.match(/,\s*(\d+)\s*$/);
        if (!pm) return { series: null, seriesPosition: null };
        const pos = parseInt(pm[1], 10);
        if (!(pos > 0) || pos > 400) return { series: null, seriesPosition: null }; // guard absurd publisher numbers
        let name = inner.slice(0, pm.index).replace(/[\s,:–—-]+$/, '').trim();
        name = name.replace(/^(a|an|the)\s+/i, '').replace(/\s+(novels?|series|saga|trilogy|books?)$/i, '').trim();
        if (!name) return { series: null, seriesPosition: null };
        return { series: name, seriesPosition: String(pos) };
    };

    // v4.11.0 - Map Amazon relationshipSubType → our ownershipType, with stats tracking. Shared by the
    // Phase 1 loop and the null-product recovery pass so both classify + count ownership identically.
    const resolveOwnershipType = (rawType, asin, title) => {
        switch (rawType) {
            case 'Purchase': stats.ownershipTypes.purchased++; return 'purchased';
            case 'Sample': stats.ownershipTypes.sample++; return 'sample';
            case 'Sharing': stats.ownershipTypes.borrowed++; return 'borrowed';
            case 'Prime': stats.ownershipTypes.prime++; return 'prime';
            case 'KindleUnlimited': stats.ownershipTypes.kindleUnlimited++; return 'kindleUnlimited';
            case 'KOLL': stats.ownershipTypes.koll++; return 'koll';
            case 'Comixology': stats.ownershipTypes.comixology++; return 'comixology';
            case 'InsideAmazon': stats.ownershipTypes.insideAmazon++; return 'insideAmazon';
            default:
                stats.ownershipTypes.unknown.push({ asin, title, rawType });
                return 'unknown';
        }
    };

    const extractReviews = (product) => {
        return product.customerReviewsTop?.reviews?.map(review => ({
            stars: review.stars,
            title: review.title,
            text: review.contentAbstract?.textAbstract || '',
            reviewer: review.contributor?.publicProfile?.publicProfile?.publicName?.displayString || 'Anonymous'
        })) || [];
    };

    const extractPublicationDate = (product) => {
        // Search overview.sectionGroups for book_details-publication_date
        // Date appears in 3 section groups (TechSpec, DetailBullets, RichProductInfo) - use first match
        const sectionGroups = product.overview?.sectionGroups || [];

        for (const group of sectionGroups) {
            for (const section of (group.sections || [])) {
                for (const attr of (section.attributes || [])) {
                    if (attr.label?.id === 'book_details-publication_date') {
                        const displayContent = attr.granularizedValue?.displayContent;
                        if (!displayContent) continue;

                        // displayContent is now a raw Object - could be structured or simple
                        let dateText = null;

                        // Try fragments[0].text first (original structure)
                        if (displayContent.fragments?.[0]?.text) {
                            dateText = displayContent.fragments[0].text;
                        }
                        // Try direct string if displayContent is just text
                        else if (typeof displayContent === 'string') {
                            dateText = displayContent;
                        }
                        // Try text property directly
                        else if (displayContent.text) {
                            dateText = displayContent.text;
                        }

                        if (dateText) {
                            // Parse human-readable date (e.g., "August 26, 2014") to ISO format
                            try {
                                const parsed = new Date(dateText);
                                if (!isNaN(parsed.getTime())) {
                                    return parsed.toISOString().split('T')[0]; // "2014-08-26"
                                }
                            } catch (e) {
                                // Fall back to raw text if parsing fails
                            }
                            return dateText; // Return raw text if parsing failed
                        }
                    }
                }
            }
        }
        return '';
    };

    // ============================================================================
    // Retry Helper Function
    // ============================================================================

    /**
     * Fetch with exponential backoff retry logic
     * @param {Function} fetchFn - Async function that performs the fetch
     * @param {string} bookTitle - Book title for logging
     * @param {number} maxRetries - Maximum retry attempts
     * @returns {Promise<Object>} - Response data or throws error
     */
    const fetchWithRetry = async (fetchFn, context, maxRetries = MAX_RETRIES) => {
        let lastError = null;
        stats.apiCalls.total++;

        for (let attempt = 0; attempt <= maxRetries; attempt++) {
            try {
                const result = await fetchFn();

                // Check for HTTP errors
                if (result.httpError) {
                    throw new Error(`HTTP ${result.httpStatus}`);
                }

                // Check for API errors
                if (result.apiError) {
                    // ⚠️ DIAGNOSTIC: Include actual error message in exception
                    const errorMsg = result.errorMessage || 'API error';
                    throw new Error(errorMsg);
                }

                // Check for missing data
                if (result.noData) {
                    throw new Error('No data returned');
                }

                // Success! Track which attempt succeeded
                if (attempt === 0) {
                    stats.apiCalls.firstTry++;
                } else if (attempt === 1) {
                    stats.apiCalls.retry1++;
                } else if (attempt === 2) {
                    stats.apiCalls.retry2++;
                } else if (attempt === 3) {
                    stats.apiCalls.retry3++;
                }

                return result;

            } catch (error) {
                lastError = error;

                // If this was the last attempt, try ONE MORE TIME with fresh token
                if (attempt === maxRetries) {
                    console.log(`   🔄 All retries failed. Trying with FRESH token...`);

                    try {
                        // Get fresh CSRF token from page
                        const freshCsrfMeta = document.querySelector('meta[name="anti-csrftoken-a2z"]');
                        if (freshCsrfMeta) {
                            const freshToken = freshCsrfMeta.getAttribute('content');
                            const oldToken = csrfToken;

                            // Compare tokens
                            if (freshToken === oldToken) {
                                console.log(`   🔍 Token comparison: IDENTICAL (token has not changed)`);
                                console.log(`      Old: ${oldToken.substring(0, 20)}...`);
                                console.log(`      New: ${freshToken.substring(0, 20)}...`);
                            } else {
                                console.log(`   🔍 Token comparison: DIFFERENT (token has been refreshed)`);
                                console.log(`      Old: ${oldToken.substring(0, 20)}...`);
                                console.log(`      New: ${freshToken.substring(0, 20)}...`);
                            }

                            // Update global token for subsequent requests
                            csrfToken = freshToken;

                            // Retry with fresh token
                            const freshResult = await fetchFn();

                            // Check for errors with fresh token
                            if (freshResult.httpError) {
                                console.log(`   ❌ Fresh token failed with HTTP ${freshResult.httpStatus}`);
                                csrfToken = oldToken; // Restore old token
                                break;
                            }

                            if (freshResult.apiError) {
                                console.log(`   ❌ Fresh token failed with API error: ${freshResult.errorMessage}`);
                                csrfToken = oldToken; // Restore old token
                                break;
                            }

                            if (freshResult.noData) {
                                console.log(`   ❌ Fresh token returned no data`);
                                csrfToken = oldToken; // Restore old token
                                break;
                            }

                            // SUCCESS WITH FRESH TOKEN!
                            console.log(`   ✅ SUCCESS with fresh token! Continuing with refreshed token.`);
                            stats.apiCalls.retry3++; // Count as successful retry
                            return freshResult;
                        } else {
                            console.log(`   ⚠️  Could not find fresh token on page`);
                        }
                    } catch (freshError) {
                        console.log(`   ❌ Fresh token attempt failed: ${freshError.message}`);
                    }

                    break; // Give up after fresh token attempt
                }

                // Otherwise, wait and retry
                const delay = RETRY_DELAYS_MS[attempt];
                console.log(`   ⏳ Retry ${attempt + 1}/${maxRetries} after ${delay/1000}s...`);
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }

        // All retries exhausted - track failure
        stats.apiCalls.failed++;
        throw lastError;
    };

    // ============================================================================

    try {
        // Step 1: Load existing data from relay (if any)
        console.log('[1/7] Checking for existing library data on relay...');

        if (!window.RWRelay || !window.RWRelay.isConfigured()) {
            progressUI.showError('Relay not configured. Please reinstall the bookmarklet from Relay Setup in the app.');
            return;
        }

        let existingBooks = [];
        let existingCollections = null; // Preserve collections section if present
        let mostRecentDate = null;

        progressUI.updatePhase('Checking Relay', 'Looking for existing library data...');
        try {
            const status = await window.RWRelay.checkStatus();
            if (status) {
                progressUI.updatePhase('Downloading', 'Loading existing library from relay...');
                const existingJson = await window.RWRelay.download((phase, detail) => {
                    progressUI.updatePhase('Downloading', detail);
                });
                const parsedData = JSON.parse(existingJson);

                if (parsedData.isBackup === true) {
                    console.log('   ⚠️ Backup data found on relay - ignoring, will fetch complete library');
                } else if (parsedData.schemaVersion?.startsWith('2.')) {
                    if (parsedData.books && parsedData.books.items) {
                        existingBooks = parsedData.books.items;
                        console.log(`   📋 Loaded ${parsedData.schemaVersion} library (${existingBooks.length} books)`);
                        if (parsedData.collections) {
                            existingCollections = parsedData.collections;
                            console.log(`   📋 Preserving existing collections data`);
                        }
                    }
                } else {
                    console.log('   ⚠️ Unrecognized data on relay - will fetch complete library');
                }

                // Find most recent acquisition date for incremental fetching
                for (const book of existingBooks) {
                    if (book.acquisitionDate) {
                        const bookDate = parseInt(book.acquisitionDate);
                        if (!mostRecentDate || bookDate > mostRecentDate) {
                            mostRecentDate = bookDate;
                        }
                    }
                }

                // Demo whitelist filter — remove non-whitelisted books from existing data
                if (whitelistASINs && existingBooks.length > 0) {
                    const beforeCount = existingBooks.length;
                    existingBooks = existingBooks.filter(b => whitelistASINs.has(b.asin));
                    if (existingBooks.length !== beforeCount) {
                        console.log(`   🔒 Whitelist filtered existing books: ${beforeCount} → ${existingBooks.length}`);
                    }
                }

                if (existingBooks.length > 0) {
                    console.log(`✅ Loaded ${existingBooks.length} existing books from relay`);
                    if (mostRecentDate) {
                        const date = new Date(mostRecentDate);
                        console.log(`   Most recent: ${date.toLocaleDateString()}`);
                    }
                }
            } else {
                console.log('📂 No existing data on relay - will fetch ALL books');
            }
        } catch (e) {
            console.log('   ⚠️ Could not load from relay - will fetch complete library');
            console.log(`   (${e.message})`);
        }
        console.log('');

        // Step 2: Find CSRF token
        console.log('[2/7] Getting CSRF token...');
        progressUI.updatePhase('Getting CSRF Token', 'Authenticating with Amazon API');
        const csrfMeta = document.querySelector('meta[name="anti-csrftoken-a2z"]');

        if (!csrfMeta) {
            new Image().src = 'https://readerwrangler.goatcounter.com/count?p=/event/fetch-phase0-no-csrf';
            throw new Error('❌ CSRF token not found. Make sure you are logged in.');
        }

        csrfToken = csrfMeta.getAttribute('content'); // Assign to existing variable (declared at top)
        console.log(`✅ Found CSRF token: ${csrfToken.substring(0, 10)}...\n`);

        // Phase 0: Validate API endpoints before fetching
        console.log('[Phase 0] Validating Amazon API endpoints...');
        progressUI.updatePhase('Validating APIs', 'Testing Amazon endpoints and extraction logic');
        stats.timing.phase0Start = Date.now();
        console.log('   Testing library query...');

        // Test library query with minimal request (1 book)
        const testLibraryQuery = `query ccGetCustomerLibraryBooks {
            getCustomerLibrary {
                books(after: "", first: 1, sortBy: {sortField: ACQUISITION_DATE, sortOrder: DESCENDING}, selectionCriteria: {tags: [], query: "NOT (222711ade9d0f22714af93d1c8afec60 OR 858f501de8e2d7ece33f768936463ac8)"}, groupBySeries: false) {
                    pageInfo {
                        hasNextPage
                        endCursor
                    }
                    totalCount {
                        number
                        relation
                    }
                    edges {
                        node {
                            asin
                            product {
                                asin
                                title {
                                    displayString
                                }
                            }
                        }
                    }
                    __typename
                }
            }
        }`;

        try {
            const result = await fetchWithRetry(async () => {
                const testLibraryResponse = await fetch('https://www.amazon.com/kindle-reader-api', {
                    method: 'POST',
                    headers: apiHeaders(),
                    credentials: 'include',
                    body: JSON.stringify({
                        query: testLibraryQuery,
                        operationName: 'ccGetCustomerLibraryBooks'
                    })
                });

                if (!testLibraryResponse.ok) {
                    return { httpError: true, httpStatus: testLibraryResponse.status };
                }

                const testLibraryData = await testLibraryResponse.json();

                if (testLibraryData.errors) {
                    return { apiError: true, errors: testLibraryData.errors };
                }

                const testLibrary = testLibraryData?.data?.getCustomerLibrary?.books;

                if (!testLibrary || !testLibrary.edges) {
                    return { noData: true };
                }

                // Success
                return { library: testLibrary };
            }, 'Phase 0 library test');

            const testLibrary = result.library;
            console.log(`   ✅ Library API working (found ${testLibrary.totalCount?.number || 0} books)`);

        } catch (error) {
            new Image().src = 'https://readerwrangler.goatcounter.com/count?p=/event/fetch-phase0-library-fail';
            console.error('\n❌ LIBRARY API VALIDATION FAILED');
            console.error('========================================');
            console.error('The library query failed. This usually means:');
            console.error('1. You are not logged into Amazon - Log in and try again');
            console.error('2. Your session has expired - Refresh the page and try again');
            console.error('3. Amazon API structure has changed - Report this issue');
            console.error('4. Network/firewall issues - Check your connection');
            console.error('');
            console.error('Technical details:');
            console.error(error.message);
            console.error('========================================\n');
            throw error;
        }

        // Test enrichment query with a sample ASIN
        console.log('   Testing enrichment query...');

        // Get a test ASIN from the library test result
        let testAsin = 'B000FC0U6Q'; // Default fallback ASIN

        try {
            const testLibraryResponse = await fetch('https://www.amazon.com/kindle-reader-api', {
                method: 'POST',
                headers: apiHeaders(),
                credentials: 'include',
                body: JSON.stringify({
                    query: testLibraryQuery,
                    operationName: 'ccGetCustomerLibraryBooks'
                })
            });

            const testLibraryData = await testLibraryResponse.json();
            const firstBook = testLibraryData?.data?.getCustomerLibrary?.books?.edges?.[0];
            if (firstBook?.node?.product?.asin) {
                testAsin = firstBook.node.product.asin;
            }
        } catch {
            // Use fallback ASIN if we can't get one from library
        }

        const testEnrichQuery = `query enrichBook {
            getProducts(input: [{asin: "${testAsin}"}]) {
                asin
                title {
                    displayString
                }
                byLine {
                    contributors {
                        name
                        contributor {
                            author {
                                profile {
                                    displayName
                                }
                            }
                        }
                    }
                }
                images {
                    images {
                        hiRes {
                            physicalId
                            extension
                        }
                        lowRes {
                            physicalId
                            extension
                        }
                    }
                }
                customerReviewsSummary {
                    count {
                        displayString
                    }
                    rating {
                        value
                    }
                }
                bookSeries {
                    singleBookView {
                        series {
                            title
                            position
                        }
                    }
                }
                bindingInformation {
                    binding {
                        displayString
                    }
                }
                description {
                    sections(filter: {types: PRODUCT_DESCRIPTION}) {
                        content
                    }
                }
                auxiliaryStoreRecommendations(
                    recommendationTypes: ["AI_SUMMARIES"]
                ) {
                    recommendations {
                        recommendationType
                        sharedContent {
                            contentAbstract {
                                textAbstract
                            }
                        }
                    }
                }
                customerReviewsTop {
                    reviews {
                        contentAbstract {
                            textAbstract
                        }
                        contributor {
                            publicProfile {
                                publicProfile {
                                    publicName {
                                        displayString
                                    }
                                }
                            }
                        }
                        title
                        stars
                    }
                }
            }
        }`;

        try {
            const enrichResult = await fetchWithRetry(async () => {
                const testEnrichResponse = await fetch('https://www.amazon.com/kindle-reader-api', {
                    method: 'POST',
                    headers: apiHeaders(),
                    credentials: 'include',
                    body: JSON.stringify({
                        query: testEnrichQuery,
                        operationName: 'enrichBook'
                    })
                });

                if (!testEnrichResponse.ok) {
                    return { httpError: true, httpStatus: testEnrichResponse.status };
                }

                const testEnrichData = await testEnrichResponse.json();

                if (testEnrichData.errors) {
                    return { apiError: true, errors: testEnrichData.errors };
                }

                const testProduct = testEnrichData?.data?.getProducts?.[0];

                if (!testProduct) {
                    return { noData: true };
                }

                // Success
                return { product: testProduct };
            }, `Phase 0 enrichment test (${testAsin})`);

            const testProduct = enrichResult.product;
            console.log(`   ✅ Enrichment API working (tested ASIN: ${testAsin})`);

            // Now validate that we can actually extract ALL the data
            console.log('   Testing data extraction...');

            const extractionResults = [];

            // Test title extraction (Pass 1)
            const testTitle = testProduct.title?.displayString;
            if (testTitle) {
                extractionResults.push(`✅ Title: "${testTitle.substring(0, 40)}${testTitle.length > 40 ? '...' : ''}"`);
            } else {
                extractionResults.push(`❌ Title: FAILED`);
            }

            // Test author extraction (Pass 1) - using shared function
            const testAuthors = extractAuthors(testProduct);
            if (testAuthors && testAuthors !== 'Unknown Author') {
                extractionResults.push(`✅ Author: "${testAuthors}"`);
            } else {
                extractionResults.push(`⚠️  Author: empty (may be unavailable)`);
            }

            // Test cover URL extraction (Pass 1) - using shared function
            const testCoverUrls = extractCoverUrls(testProduct);
            const testImages = testProduct.images?.images?.[0];
            if (testImages?.lowRes?.physicalId) {
                extractionResults.push(`✅ Cover: lowRes (primary)`);
            } else if (testImages?.hiRes?.physicalId) {
                extractionResults.push(`✅ Cover: hiRes (fallback)`);
            } else {
                extractionResults.push(`⚠️  Cover: fallback URL (no image data)`);
            }
            if (testCoverUrls.coverUrlHiRes) {
                extractionResults.push(`✅ Cover HiRes: available`);
            }

            // Test rating extraction (Pass 1)
            const testRating = testProduct.customerReviewsSummary?.rating?.value;
            const testReviewCount = testProduct.customerReviewsSummary?.count?.displayString;
            if (testRating) {
                extractionResults.push(`✅ Rating: ${testRating} (${testReviewCount || '0'} reviews)`);
            } else {
                extractionResults.push(`⚠️  Rating: none (may be unavailable)`);
            }

            // Test series extraction (Pass 1)
            const testSeriesData = testProduct.bookSeries?.singleBookView?.series;
            if (testSeriesData?.title) {
                extractionResults.push(`✅ Series: "${testSeriesData.title}" #${testSeriesData.position || '?'}`);
            } else {
                extractionResults.push(`⚠️  Series: none (may not be in series)`);
            }

            // Test binding extraction (Pass 1)
            const testBinding = testProduct.bindingInformation?.binding?.displayString;
            if (testBinding) {
                extractionResults.push(`✅ Binding: ${testBinding}`);
            } else {
                extractionResults.push(`⚠️  Binding: empty (may be unavailable)`);
            }

            // Test description extraction (Pass 2) - using shared function
            const testDescription = extractDescription(testProduct);

            if (testDescription) {
                extractionResults.push(`✅ Description: ${testDescription.length} characters`);
            } else {
                extractionResults.push(`❌ Description: FAILED (empty)`);
                const testDescSection = testProduct.description?.sections?.[0];
                if (testDescSection) {
                    console.log(`      Structure: ${JSON.stringify(testDescSection).substring(0, 200)}...`);
                }
            }

            // Test reviews extraction (Pass 2) - using shared function
            const testReviews = extractReviews(testProduct);

            if (testReviews.length > 0) {
                extractionResults.push(`✅ Reviews: ${testReviews.length} top reviews`);
            } else {
                extractionResults.push(`⚠️  Reviews: none (may be unavailable)`);
            }

            // Report all extraction results
            console.log('');
            console.log('   📊 Field Extraction Results:');
            extractionResults.forEach(result => console.log(`      ${result}`));

            console.log('');
            stats.timing.phase0End = Date.now();
            console.log('✅ Phase 0 complete: All API endpoints and extraction logic validated\n');

        } catch (error) {
            new Image().src = 'https://readerwrangler.goatcounter.com/count?p=/event/fetch-phase0-enrich-fail';
            console.error('\n❌ ENRICHMENT API VALIDATION FAILED');
            console.error('========================================');
            console.error('The enrichment query failed. This usually means:');
            console.error('1. Amazon API structure has changed');
            console.error('2. The test ASIN is invalid or restricted');
            console.error('3. Network/firewall issues');
            console.error('4. Rate limiting (unlikely on first request)');
            console.error('');
            console.error('Technical details:');
            console.error(error.message);
            console.error('');
            console.error('⚠️  You can continue, but enrichment may fail.');
            console.error('   Basic book data should still work.');
            console.error('========================================\n');

            // Don't throw - allow continuation with warning
            console.log('⚠️  Continuing without enrichment validation...\n');
        }

        // Phase 0 canary: confirm the ignorePSLD experiment hash still resolves hash-dependent books.
        // CANARY is an owned book that returns product-null WITHOUT the experimental header and resolves WITH it.
        // If Amazon rotates the hash, recovery would silently under-perform — so detect + flag it here.
        try {
            const CANARY_ASIN = 'B0CVS92TRQ'; // Gideon Sable #5 — owned, hash-dependent (its edition lacks PSLD)
            const leanHeaders = { 'accept': 'application/json, text/plain, */*', 'content-type': 'application/json', 'anti-csrftoken-a2z': csrfToken, 'x-client-id': 'your-books' };
            const probe = async (asin, headers) => {
                const resp = await fetch('https://www.amazon.com/kindle-reader-api', {
                    method: 'POST', headers, credentials: 'include',
                    body: JSON.stringify({ query: `query enrichBook { getProducts(input: [{asin: "${asin}"}]) { asin title { displayString } } }`, operationName: 'enrichBook' })
                });
                const d = await resp.json();
                return (d?.data?.getProducts || []).length;
            };
            const withMods = await probe(CANARY_ASIN, apiHeaders());
            if (withMods > 0) {
                console.log('   ✅ Experimental-header canary OK (hash-dependent book resolves with the ignorePSLD header)\n');
            } else if ((await probe(CANARY_ASIN, leanHeaders)) > 0) {
                console.warn('   ⚠️ Canary no longer hash-dependent (resolves without the header) — mods still applied (harmless), but pick a new canary.\n');
                new Image().src = 'https://readerwrangler.goatcounter.com/count?p=/event/fetch-phase0-canary-stale';
            } else if ((await probe(testAsin, leanHeaders)) > 0) {
                console.error('   ❌ EXPERIMENTAL HASH LIKELY STALE: the canary failed WITH the header, but a normal book resolves WITHOUT it (endpoint OK).');
                console.error('      Null-product recovery will under-perform. Update x-aapi-experimental-params in apiHeaders().\n');
                new Image().src = 'https://readerwrangler.goatcounter.com/count?p=/event/fetch-phase0-hash-stale';
            } else {
                console.error('   ❌ Endpoint/auth problem: even a normal book did not resolve — not a hash issue.\n');
                new Image().src = 'https://readerwrangler.goatcounter.com/count?p=/event/fetch-phase0-endpoint-fail';
            }
        } catch (e) {
            console.warn('   ⚠️ Canary self-test could not run:', e.message, '\n');
            new Image().src = 'https://readerwrangler.goatcounter.com/count?p=/event/fetch-phase0-canary-error';
        }

        // Step 3: Fetch new books (Phase 1)
        stats.timing.pass1Start = Date.now();
        console.log('[3/7] Fetching new books from library...');
        if (existingBooks.length === 0) {
            progressUI.showInfoBanner('Full library scan — relay data expired. This may take a few minutes.');
            console.log('   Full scan - no existing relay data\n');
        } else {
            progressUI.showInfoBanner(`Incremental scan — checking for new books since last fetch (${existingBooks.length} existing).`);
            console.log(`   Incremental scan - ${existingBooks.length} existing books on relay\n`);
        }
        progressUI.updatePhase('Downloading Titles', existingBooks.length === 0 ? 'Scanning full library...' : 'Checking for new books...');

        const newBooks = [];
        const seenASINs = new Map();  // Track ASINs to detect duplicates
        // v4.11.0 - ASINs whose library node had product=null; recovered by ASIN after Phase 1 (never dropped)
        const nullProductAsins = new Map(); // asin -> { asin, relationshipSubType, acquisitionDate }

        // Seed seenASINs with existing books so Phase 1 doesn't re-add them as new
        for (let i = 0; i < existingBooks.length; i++) {
            seenASINs.set(existingBooks[i].asin, -1); // -1 = existing, not in newBooks
        }
        let cursor = "";
        let pageNum = 0;
        let hasMore = true;
        let foundOverlap = false;
        
        while (hasMore && !foundOverlap) {
            // Check for user abort
            if (progressUI.isAborted()) {
                console.log('⚠️ Fetch aborted by user during Pass 1');
                return;
            }

            pageNum++;
            console.log(`📖 Fetching page ${pageNum}...`);
            
            const query = `query ccGetCustomerLibraryBooks {
                getCustomerLibrary {
                    books(after: "${cursor}", first: ${PAGE_SIZE}, sortBy: {sortField: ACQUISITION_DATE, sortOrder: DESCENDING}, selectionCriteria: {tags: [], query: "NOT (222711ade9d0f22714af93d1c8afec60 OR 858f501de8e2d7ece33f768936463ac8)"}, groupBySeries: false) {
                        pageInfo {
                            hasNextPage
                            endCursor
                        }
                        totalCount {
                            number
                            relation
                        }
                        edges {
                            node {
                                asin
                                relationshipType
                                relationshipSubType
                                relationshipCreationDate
                                __typename
                                product {
                                    asin
                                    title {
                                        displayString
                                    }
                                    images {
                                        images {
                                            hiRes {
                                                physicalId
                                                extension
                                            }
                                            lowRes {
                                                physicalId
                                                extension
                                            }
                                        }
                                    }
                                    customerReviewsSummary {
                                        count {
                                            displayString
                                        }
                                        rating {
                                            fullStarCount
                                            hasHalfStar
                                            value
                                        }
                                    }
                                    byLine {
                                        contributors {
                                            name
                                            contributor {
                                                author {
                                                    profile {
                                                        displayName
                                                        contributorPage {
                                                            url
                                                        }
                                                    }
                                                }
                                            }
                                        }
                                    }
                                    bindingInformation {
                                        binding {
                                            displayString
                                            symbol
                                        }
                                    }
                                    bookSeries {
                                        singleBookView {
                                            series {
                                                title
                                                position
                                                link {
                                                    url
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                        __typename
                    }
                }
            }`;
            
            try {
                const result = await fetchWithRetry(async () => {
                    const response = await fetch('https://www.amazon.com/kindle-reader-api', {
                        method: 'POST',
                        headers: apiHeaders(),
                        credentials: 'include',
                        body: JSON.stringify({
                            query: query,
                            operationName: 'ccGetCustomerLibraryBooks'
                        })
                    });

                    if (!response.ok) {
                        return { httpError: true, httpStatus: response.status };
                    }

                    const data = await response.json();

                    if (data.errors) {
                        return { apiError: true, errors: data.errors };
                    }

                    const library = data?.data?.getCustomerLibrary?.books;

                    if (!library || !library.edges) {
                        return { noData: true };
                    }

                    // Success
                    return { library };
                }, `Pass 1 page ${pageNum}`);

                const library = result.library;

                // v4.11.0 - Capture Amazon's reported library total once (page 1) for reconciliation.
                if (stats.libraryTotalCount === null && typeof library.totalCount?.number === 'number') {
                    stats.libraryTotalCount = library.totalCount.number;
                }

                const books = library.edges;

                // Process each book and check for overlap
                for (const edge of books) {
                    const node = edge.node;

                    // v4.11.0 - Overlap check first, using the node date (present with or without product),
                    // so product-null nodes still participate in the incremental stop.
                    const acquisitionDate = node.relationshipCreationDate || null;
                    if (mostRecentDate && acquisitionDate) {
                        const bookDate = parseInt(acquisitionDate);
                        if (bookDate <= mostRecentDate) {
                            console.log(`   🔍 Found overlap at ASIN ${node.asin}`);
                            foundOverlap = true;
                            break;
                        }
                    }

                    // v4.11.0 - Node-type classifier: NO silent drops. Handle known single-book / borrowed
                    // nodes; anything else is counted + GoatCounter-flagged so a new Amazon shape surfaces.
                    const typename = node.__typename;
                    if (typename !== 'CustomerLibrarySingleBookNode' && typename !== 'CustomerLibraryBorrowedSingleBookNode') {
                        stats.unknownNodeTypes.push({ asin: node.asin, typename: typename || null });
                        new Image().src = `https://readerwrangler.goatcounter.com/count?p=/event/fetch-unknown-node-type=${encodeURIComponent(typename || 'null')}`;
                        continue;
                    }

                    const product = node.product;

                    // v4.11.0 - product=null: DON'T drop. Queue for recovery by ASIN (getProducts) after Phase 1.
                    if (!product) {
                        if (node.asin && !seenASINs.has(node.asin) && !nullProductAsins.has(node.asin)) {
                            nullProductAsins.set(node.asin, {
                                asin: node.asin,
                                relationshipSubType: node.relationshipSubType,
                                acquisitionDate
                            });
                        }
                        continue;
                    }

                    // Extract book data - using shared functions
                    const title = product.title?.displayString || 'Unknown Title';
                    const authors = extractAuthors(product);
                    const { coverUrl, coverUrlHiRes } = extractCoverUrls(product);

                    const rating = product.customerReviewsSummary?.rating?.value || null;
                    const reviewCount = product.customerReviewsSummary?.count?.displayString || null;

                    const seriesData = product.bookSeries?.singleBookView?.series;
                    let series = seriesData?.title || null;
                    let seriesPosition = seriesData?.position || null;
                    if (!series) {
                        // Dead editions resolve inline (via the ignorePSLD header) but carry bookSeries=null — parse from title.
                        const parsed = parseSeriesFromTitle(title);
                        if (parsed.series) { series = parsed.series; seriesPosition = parsed.seriesPosition; stats.seriesFromTitle++; }
                    }

                    const binding = product.bindingInformation?.binding?.displayString || null;

                    // Filter out non-book items (DVDs, CDs, Maps, Shoes, etc.)
                    if (binding && !BOOK_BINDINGS.includes(binding)) {
                        stats.nonBooksFiltered.push({ title, asin: product.asin, binding });
                        console.log(`   ⏭️  Skipping non-book: ${title} (${binding})`);
                        continue;
                    }

                    // Track books without authors
                    if (!authors || authors === 'Unknown Author') {
                        stats.booksWithoutAuthors.push({ title, asin: product.asin });
                    }

                    // Check for duplicate ASIN
                    if (seenASINs.has(product.asin)) {
                        const firstIndex = seenASINs.get(product.asin);
                        stats.duplicatesFound.push({
                            asin: product.asin,
                            title,
                            binding,
                            firstIndex,
                            secondIndex: newBooks.length
                        });
                        console.log(`   🔁 Duplicate ASIN detected: ${product.asin} - "${title}" (skipping)`);
                        continue;  // Skip this duplicate
                    }

                    // Extract ownership type from relationshipSubType (shared helper — see resolveOwnershipType)
                    // Known values: Purchase, Sample, Sharing, Prime, KindleUnlimited, KOLL, Comixology, InsideAmazon
                    const rawOwnershipType = node.relationshipSubType?.[0] || 'Purchase';
                    const ownershipType = resolveOwnershipType(rawOwnershipType, product.asin, title);

                    // Demo whitelist filter — skip books not in whitelist
                    if (whitelistASINs && !whitelistASINs.has(product.asin)) {
                        continue;
                    }

                    // Add book and track ASIN
                    seenASINs.set(product.asin, newBooks.length);
                    newBooks.push({
                        asin: product.asin,
                        // v4.8.0.a - onWishlist replaces isOwned (false = owned library book)
                        onWishlist: false,
                        ownershipType, // 'purchased', 'sample', 'borrowed', or 'unknown'
                        title,
                        authors,
                        coverUrl,
                        coverUrlHiRes,
                        rating,
                        reviewCount,
                        series,
                        seriesPosition,
                        acquisitionDate,
                        binding,
                        description: null, // Will be enriched in Pass 2
                        topReviews: []
                    });
                }
                
                if (foundOverlap) {
                    console.log(`   ✅ Stopped at overlap - found ${newBooks.length} new books\n`);
                    break;
                }
                
                console.log(`   ✅ Page ${pageNum}: ${books.length} books (${newBooks.length} total new)`);
                progressUI.updateDetail(`Retrieved ${newBooks.length.toLocaleString()} titles`);
                
                // Check pagination
                hasMore = library.pageInfo?.hasNextPage || false;
                cursor = library.pageInfo?.endCursor || "";
                
                if (hasMore && !foundOverlap) {
                    await new Promise(resolve => setTimeout(resolve, FETCH_DELAY_MS));
                }
                
            } catch (error) {
                console.error(`   ❌ Error on page ${pageNum}:`, error.message);
                break;
            }
        }
        
        stats.timing.pass1End = Date.now();

        if (newBooks.length === 0) {
            console.log('✅ No new books to fetch - checking tags & prices...\n');
        } else {
            console.log(`\n✅ Phase 1 complete: Found ${newBooks.length} new books\n`);
        }

        // ============================================================================
        // v4.11.0 - Completeness recovery. No book Amazon lists in Your Books gets silently dropped.
        // The library query returns some owned books with product=null (a bad product sub-field nulls the
        // whole product, or the list result omits it). Phase 1 queued those ASINs in nullProductAsins.
        // On an INCREMENTAL fetch the loop stops at overlap, so OLD missing books were never even seen — so
        // when we're short of Amazon's totalCount we sweep the full library (lean) for every ASIN we don't
        // yet have. Then we recover them all by ASIN via getProducts. Whatever can't be resolved is flagged
        // (delisted), never dropped. (Stage 2 will persist the reconciliation so the sweep is skipped once
        // the library is fully accounted for — keeping incremental fetches fast.)
        // ============================================================================
        {
            const recoveryTargets = new Map(nullProductAsins); // asin -> { asin, relationshipSubType, acquisitionDate }
            const capturedCount = existingBooks.length + newBooks.length;
            // v4.11.8-alpha.2 - Trigger on ANY count mismatch, not just a shortfall. A SURPLUS (more local books
            // than Amazon lists — accumulated orphans / old samples) HIDES individual missing books: e.g. 3028 local
            // vs 2790 Amazon still had 11 owned books absent after a permanent-delete. So sweep whenever the counts
            // disagree. (Proper Stage 2: reconcile the full ASIN sets — ideally folded into the orphan scan, which
            // already does a full pass — so an exact-count-with-offsetting-errors case is covered too.)
            const shouldSweep = existingBooks.length > 0
                && stats.libraryTotalCount != null
                && capturedCount !== stats.libraryTotalCount;

            if (shouldSweep && !progressUI.isAborted()) {
                console.log(`🩹 Recovery sweep: local ${capturedCount} vs Amazon ${stats.libraryTotalCount} — scanning the full library for owned books not yet captured...`);
                progressUI.updatePhase('Recovering', 'Scanning full library for books not yet captured...');
                let sweepCursor = "", sweepPage = 0, sweepHasMore = true;
                while (sweepHasMore && !progressUI.isAborted()) {
                    sweepPage++;
                    const sweepQuery = `query ccGetCustomerLibraryBooks {
                        getCustomerLibrary {
                            books(after: "${sweepCursor}", first: ${PAGE_SIZE}, sortBy: {sortField: ACQUISITION_DATE, sortOrder: DESCENDING}, selectionCriteria: {tags: [], query: "NOT (222711ade9d0f22714af93d1c8afec60 OR 858f501de8e2d7ece33f768936463ac8)"}, groupBySeries: false) {
                                pageInfo { hasNextPage endCursor }
                                edges { node { asin __typename relationshipSubType relationshipCreationDate } }
                            }
                        }
                    }`;
                    let sweepResult;
                    try {
                        sweepResult = await fetchWithRetry(async () => {
                            const resp = await fetch('https://www.amazon.com/kindle-reader-api', {
                                method: 'POST',
                                headers: apiHeaders(),
                                credentials: 'include',
                                body: JSON.stringify({ query: sweepQuery, operationName: 'ccGetCustomerLibraryBooks' })
                            });
                            if (!resp.ok) return { httpError: true, httpStatus: resp.status };
                            const d = await resp.json();
                            const lib = d?.data?.getCustomerLibrary?.books;
                            if (!lib) return { apiError: true, errorMessage: d.errors?.[0]?.message || 'sweep error' };
                            return { lib };
                        }, `Recovery sweep page ${sweepPage}`);
                    } catch (e) {
                        console.warn(`   ⚠️ Recovery sweep page ${sweepPage} failed: ${e.message} — stopping sweep`);
                        break;
                    }
                    const lib = sweepResult.lib;
                    for (const e of lib.edges) {
                        const n = e.node;
                        const tn = n.__typename;
                        if (tn !== 'CustomerLibrarySingleBookNode' && tn !== 'CustomerLibraryBorrowedSingleBookNode') {
                            if (!stats.unknownNodeTypes.some(u => u.asin === n.asin)) {
                                stats.unknownNodeTypes.push({ asin: n.asin, typename: tn || null });
                            }
                            continue;
                        }
                        if (n.asin && !seenASINs.has(n.asin) && !recoveryTargets.has(n.asin)) {
                            recoveryTargets.set(n.asin, { asin: n.asin, relationshipSubType: n.relationshipSubType, acquisitionDate: n.relationshipCreationDate || null });
                        }
                    }
                    sweepHasMore = lib.pageInfo?.hasNextPage || false;
                    sweepCursor = lib.pageInfo?.endCursor || "";
                }
                console.log(`   🩹 Sweep collected ${recoveryTargets.size} candidate(s) to recover`);
            }

            // Recover each target by ASIN via getProducts (identity fields), build records, add to newBooks.
            const targetList = [...recoveryTargets.values()].filter(t => t.asin && !seenASINs.has(t.asin));
            stats.recoveryCandidates = targetList.length;
            if (targetList.length > 0 && !progressUI.isAborted()) {
                console.log(`[Recovery] Fetching ${targetList.length} book(s) the library query returned without product data...`);
                progressUI.updatePhase('Recovering', `Recovering ${targetList.length} book(s) missing from the list...`);
                const recBatches = Math.ceil(targetList.length / RECOVERY_BATCH_SIZE);
                for (let b = 0; b < recBatches && !progressUI.isAborted(); b++) {
                    const batch = targetList.slice(b * RECOVERY_BATCH_SIZE, (b + 1) * RECOVERY_BATCH_SIZE);
                    const inputStr = '[' + batch.map(t => `{asin: "${t.asin}"}`).join(', ') + ']';
                    // Lean identity query — MUST stay minimal: getProducts OMITS a product entirely if ANY
                    // requested field errors for it, and these books (already fragile — that's why the list
                    // query nulled them) choke on deep/optional fields. This is exactly the field set proven
                    // to return B0F9QNX9NL. No images{} (its non-nullable sub-fields null products lacking a
                    // hi-res cover; cover falls back to the ASIN URL), no deep byLine, no reviews (enrichment
                    // fills rating/description afterward anyway).
                    const recQuery = `query recoverBook {
                        getProducts(input: ${inputStr}) {
                            asin
                            title { displayString }
                            byLine { contributors { name } }
                            bindingInformation { binding { displayString } }
                            bookSeries { singleBookView { series { title position } } }
                        }
                    }`;
                    let recResult;
                    try {
                        recResult = await fetchWithRetry(async () => {
                            const resp = await fetch('https://www.amazon.com/kindle-reader-api', {
                                method: 'POST',
                                headers: apiHeaders(),
                                credentials: 'include',
                                body: JSON.stringify({ query: recQuery, operationName: 'recoverBook' })
                            });
                            if (!resp.ok) return { httpError: true, httpStatus: resp.status };
                            const d = await resp.json();
                            const products = d?.data?.getProducts || [];
                            if (d.errors && products.length === 0) return { apiError: true, errorMessage: d.errors?.[0]?.message || 'recovery error' };
                            return { products };
                        }, `Recovery batch ${b + 1}/${recBatches}`);
                    } catch (e) {
                        console.warn(`   ⚠️ Recovery batch ${b + 1} failed: ${e.message} — will retry on the next fetch's sweep`);
                        continue;
                    }
                    const prodMap = new Map();
                    for (const p of (recResult.products || [])) { if (p?.asin) prodMap.set(p.asin, p); }
                    for (const t of batch) {
                        const product = prodMap.get(t.asin);
                        if (!product) {
                            // getProducts omitted it entirely → no product data anywhere (delisted/unavailable).
                            // Flag it, never silent. A present-but-sparse product still gets built below.
                            stats.unrecoverableBooks.push({ asin: t.asin });
                            new Image().src = 'https://readerwrangler.goatcounter.com/count?p=/event/fetch-delisted';
                            continue;
                        }
                        if (seenASINs.has(t.asin)) continue;
                        const title = product.title?.displayString || 'Unknown Title';
                        // v4.11.0 - NO binding filter here: these are items Amazon already lists in the owned
                        // Kindle library, so they're legitimate. And getProducts' binding is unreliable for them
                        // (it returned "Audio CD" for a Kindle-owned book — likely the same catalog inconsistency
                        // that nulls them in the list query), so keep it only if it's a real book binding, else
                        // leave it null rather than store a wrong Format.
                        let binding = product.bindingInformation?.binding?.displayString || null;
                        if (binding && !BOOK_BINDINGS.includes(binding)) binding = null;
                        const authors = extractAuthors(product);
                        const { coverUrl, coverUrlHiRes } = extractCoverUrls(product);
                        const seriesData = product.bookSeries?.singleBookView?.series;
                        let series = seriesData?.title || null;
                        let seriesPosition = seriesData?.position || null;
                        if (!series) {
                            // Dead editions return bookSeries=null; recover series + # from the title. Never overrides API data.
                            const parsed = parseSeriesFromTitle(title);
                            if (parsed.series) { series = parsed.series; seriesPosition = parsed.seriesPosition; stats.seriesFromTitle++; }
                        }
                        const rawOwnershipType = t.relationshipSubType?.[0] || 'Purchase';
                        const ownershipType = resolveOwnershipType(rawOwnershipType, t.asin, title);
                        seenASINs.set(t.asin, newBooks.length);
                        newBooks.push({
                            asin: t.asin,
                            onWishlist: false,
                            ownershipType,
                            title,
                            authors,
                            coverUrl,
                            coverUrlHiRes,
                            rating: product.customerReviewsSummary?.rating?.value || null,
                            reviewCount: product.customerReviewsSummary?.count?.displayString || null,
                            series,
                            seriesPosition,
                            acquisitionDate: t.acquisitionDate || null,
                            binding,
                            description: null,
                            topReviews: [],
                            recovered: true // v4.11.0 - recovered via getProducts (not in the flat list result)
                        });
                        stats.recoveredBooks.push({ asin: t.asin, title });
                    }
                }
                console.log(`[Recovery] ✅ Recovered ${stats.recoveredBooks.length}, unrecoverable ${stats.unrecoverableBooks.length}`);
            }
        }

        // Step 4: Enrich books (Phase 2) - BATCH MODE
        // Enriches: new books + existing books missing descriptions (gap-fill)
        stats.timing.pass2Start = Date.now();

        // Find existing books needing enrichment (gap-fill for past glitches)
        // v4.10.0-alpha.2 - Extended to gap-fill missing reviews (same API call, zero extra requests)
        const existingBooksNeedingEnrichment = existingBooks.filter(b =>
            !b.description || !b.topReviews || b.topReviews.length === 0
        );
        const booksToEnrich = [...newBooks, ...existingBooksNeedingEnrichment];

        // Track Phase 2 results (declared outside else block for use in output file)
        const booksWithoutDescriptions = [];
        let enrichedCount = 0;
        let errorCount = 0;

        if (booksToEnrich.length === 0) {
            console.log('[4/7] Skipping enrichment (no books need enrichment)\n');
            stats.timing.pass2End = Date.now();
        } else {
            const newCount = newBooks.length;
            const gapFillCount = existingBooksNeedingEnrichment.length;
            console.log(`[4/7] Enriching books with descriptions & reviews...`);
            console.log(`   ${newCount} new books + ${gapFillCount} existing books needing gap-fill (descriptions + reviews)`);
        progressUI.updatePhase('Enriching Data', `Downloading descriptions & reviews for ${booksToEnrich.length} books`);

        const totalBatches = Math.ceil(booksToEnrich.length / ENRICH_BATCH_SIZE);
        console.log(`   Batch mode: ${ENRICH_BATCH_SIZE} books per request, ${totalBatches} batches total\n`);

        // Process books in batches
        for (let batchNum = 0; batchNum < totalBatches; batchNum++) {
            // Check for user abort
            if (progressUI.isAborted()) {
                console.log('⚠️ Fetch aborted by user during Pass 2 (enrichment)');
                return;
            }

            const batchStart = batchNum * ENRICH_BATCH_SIZE;
            const batchEnd = Math.min(batchStart + ENRICH_BATCH_SIZE, booksToEnrich.length);
            const batchBooks = booksToEnrich.slice(batchStart, batchEnd);
            const percent = Math.round((batchStart / booksToEnrich.length) * 100);
            const progressBar = '█'.repeat(Math.floor(percent / 2)) + '░'.repeat(50 - Math.floor(percent / 2));

            console.log(`[Batch ${batchNum + 1}/${totalBatches}] [${progressBar}] ${percent}% - ${batchBooks.length} books...`);

            // Update visual progress bar
            progressUI.updateProgress(batchStart, booksToEnrich.length);

            try {
                // Build GraphQL-compatible input: [{asin: "X"}, {asin: "Y"}, ...]
                const inputStr = '[' + batchBooks.map(book => `{asin: "${book.asin}"}`).join(', ') + ']';

                // Wrap fetch logic in retry function
                const result = await fetchWithRetry(async () => {
                    const query = `query enrichBook {
                        getProducts(input: ${inputStr}) {
                            asin
                            description {
                                sections(filter: {types: PRODUCT_DESCRIPTION}) {
                                    content
                                }
                            }
                            auxiliaryStoreRecommendations(
                                recommendationTypes: ["AI_SUMMARIES"]
                            ) {
                                recommendations {
                                    recommendationType
                                    sharedContent {
                                        contentAbstract {
                                            textAbstract
                                        }
                                    }
                                }
                            }
                            customerReviewsSummary {
                                count {
                                    displayString
                                }
                                rating {
                                    value
                                }
                            }
                            customerReviewsTop {
                                reviews {
                                    contentAbstract {
                                        textAbstract
                                    }
                                    contributor {
                                        publicProfile {
                                            publicProfile {
                                                publicName {
                                                    displayString
                                                }
                                            }
                                        }
                                    }
                                    title
                                    stars
                                }
                            }
                            overview {
                                sectionGroups {
                                    name { id }
                                    sections {
                                        attributes {
                                            label { id }
                                            granularizedValue {
                                                displayContent
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }`;

                    const response = await fetch('https://www.amazon.com/kindle-reader-api', {
                        method: 'POST',
                        headers: apiHeaders(),
                        credentials: 'include',
                        body: JSON.stringify({
                            query: query,
                            operationName: 'enrichBook'
                        })
                    });

                    // Return structured result for retry logic
                    if (!response.ok) {
                        return { httpError: true, httpStatus: response.status };
                    }

                    const data = await response.json();

                    // Check for GraphQL errors - but don't fail immediately
                    if (data.errors) {
                        const errorMsg = data.errors[0]?.message || 'Unknown GraphQL error';
                        const products = data?.data?.getProducts || [];

                        if (products.length > 0) {
                            // PARTIAL ERROR: We got errors BUT also got some data
                            const { message: friendlyError, category: errorCategory } = formatApiError(errorMsg);
                            console.log(`   ⚠️  Partial error: ${friendlyError}`);
                            console.log(`   📦 Got ${products.length}/${batchBooks.length} products - continuing...`);

                            // Track partial errors (store friendly version)
                            stats.partialErrorBooks.push({
                                batch: batchNum + 1,
                                errorMessage: friendlyError,
                                errorCategory: errorCategory,
                                productsReturned: products.length,
                                productsRequested: batchBooks.length
                            });

                            // Increment error category counter
                            stats.errorCategories[errorCategory]++;

                            return { products, partialError: true };
                        } else {
                            // TOTAL FAILURE: Errors and NO data
                            console.log(`   ❌ Total failure: ${errorMsg}`);
                            return { apiError: true, errorMessage: errorMsg };
                        }
                    }

                    const products = data?.data?.getProducts || [];

                    if (products.length === 0) {
                        console.log(`   ⚠️  No products in response`);
                        return { noData: true };
                    }

                    // Success - return all products
                    return { products };
                }, `Batch ${batchNum + 1}`);

                // Process each product in the batch
                const products = result.products || [];

                // Create ASIN lookup map for efficient matching
                const productMap = new Map();
                for (const product of products) {
                    if (product.asin) {
                        productMap.set(product.asin, product);
                    }
                }

                // Match products back to books and extract data
                let batchEnriched = 0;
                for (const book of batchBooks) {
                    const product = productMap.get(book.asin);

                    if (!product) {
                        console.log(`   ⚠️  No data for: ${book.title.substring(0, 40)}...`);
                        errorCount++;
                        continue;
                    }

                    // Extract data - using shared functions
                    let description = extractDescription(product);

                    // Fallback to AI summary if no traditional description
                    if (!description) {
                        description = extractAISummary(product);
                        if (description) {
                            stats.aiSummariesUsed.push({ title: book.title, asin: book.asin });
                        }
                    }

                    const topReviews = extractReviews(product);
                    const publicationDate = extractPublicationDate(product);

                    // Track books without descriptions
                    if (!description) {
                        booksWithoutDescriptions.push({
                            asin: book.asin,
                            title: book.title,
                            authors: book.authors
                        });
                    }

                    // Update book directly (batchBooks contains references to actual objects)
                    book.description = description;
                    book.topReviews = topReviews;
                    book.publicationDate = publicationDate;

                    // Update rating if fresher
                    if (product.customerReviewsSummary?.rating?.value) {
                        book.rating = product.customerReviewsSummary.rating.value;
                        book.reviewCount = product.customerReviewsSummary.count?.displayString || null;
                    }

                    batchEnriched++;
                    enrichedCount++;
                }

                console.log(`   ✅ Enriched ${batchEnriched}/${batchBooks.length} books in batch`);

            } catch (error) {
                // Batch failed - log all books in batch as errors
                for (const book of batchBooks) {
                    stats.apiErrorBooks.push({ title: book.title, asin: book.asin });
                }
                console.log(`   ❌ Batch failed after ${MAX_RETRIES} retries: ${error.message}`);
                errorCount += batchBooks.length;
            }

            // Delay between batches (if configured)
            if (batchNum < totalBatches - 1 && ENRICH_DELAY_MS > 0) {
                await new Promise(resolve => setTimeout(resolve, ENRICH_DELAY_MS));
            }
        }
        
            stats.timing.pass2End = Date.now();
            progressUI.updateProgress(booksToEnrich.length, booksToEnrich.length); // Show 100%
            console.log(`\n✅ Phase 2 complete: Enriched ${enrichedCount}/${booksToEnrich.length} books`);
            if (errorCount > 0) {
                console.log(`   ⚠️  ${errorCount} errors (books will have basic info only)`);
            }
            // v4.8.0.b - Log books without descriptions to console (moved from JSON output)
            if (booksWithoutDescriptions.length > 0) {
                console.log(`   📋 Books without descriptions (${booksWithoutDescriptions.length}):`);
                booksWithoutDescriptions.forEach(b => {
                    console.log(`      - ${b.asin}: ${b.title} by ${b.authors}`);
                });
            }
            console.log('');
        } // End of Phase 2 else block (when booksToEnrich.length > 0)

        // ============================================================================
        // Phase 3: Tags/Genres (incremental - only books without genres array)
        // ============================================================================
        // Tags are static, so we only fetch once per book. Cap at 10 per run to limit time.
        stats.timing.phase3Start = Date.now();
        console.log('[5/7] Fetching tags/genres for books...');

        // Combine new books with existing books to find all books needing tags
        const allBooksForTags = [...newBooks, ...existingBooks];
        const booksNeedingTags = allBooksForTags.filter(book => !book.genres);
        const TAGS_CAP = 10; // Cap per run to limit time (1-at-a-time API)
        const booksToFetchTags = booksNeedingTags.slice(0, TAGS_CAP);

        if (booksToFetchTags.length === 0) {
            console.log('   ✅ All books already have tags\n');
        } else {
            console.log(`   Found ${booksNeedingTags.length} books needing tags (processing ${booksToFetchTags.length} this run)`);
            progressUI.updatePhase('Fetching Tags', `Processing ${booksToFetchTags.length} books`);

            let tagsSuccessCount = 0;
            let tagsErrorCount = 0;

            for (let i = 0; i < booksToFetchTags.length; i++) {
                // Check for user abort
                if (progressUI.isAborted()) {
                    console.log('⚠️ Fetch aborted by user during Phase 3 (tags)');
                    return;
                }

                const book = booksToFetchTags[i];
                progressUI.updateProgress(i, booksToFetchTags.length);
                progressUI.updateDetail(`${book.title.substring(0, 40)}...`);

                try {
                    const tagsQuery = `query qvGetSingleItemRecommendation {
                        getCustomerLibrary {
                            bookRecommendations(
                                after: ""
                                first: 10
                                asin: "${book.asin}"
                                selectionCriteria: {tags: []}
                                libraryType: OWNED
                            ) {
                                tags {
                                    tag {
                                        id
                                        name
                                        rank
                                    }
                                }
                            }
                        }
                    }`;

                    const result = await fetchWithRetry(async () => {
                        const response = await fetch('https://www.amazon.com/kindle-reader-api', {
                            method: 'POST',
                            headers: apiHeaders(),
                            credentials: 'include',
                            body: JSON.stringify({
                                query: tagsQuery,
                                operationName: 'qvGetSingleItemRecommendation'
                            })
                        });

                        if (!response.ok) {
                            return { httpError: true, httpStatus: response.status };
                        }

                        const data = await response.json();

                        if (data.errors) {
                            return { apiError: true, errorMessage: data.errors[0]?.message || 'API error' };
                        }

                        const recommendations = data?.data?.getCustomerLibrary?.bookRecommendations;
                        if (!recommendations) {
                            return { noData: true };
                        }

                        return { recommendations };
                    }, `Tags for ${book.asin}`);

                    // Extract tag names
                    const tags = result.recommendations?.tags || [];
                    const genreNames = tags.map(t => t.tag?.name).filter(Boolean);

                    // Update the book (find it in the appropriate array)
                    book.genres = genreNames;
                    tagsSuccessCount++;

                    console.log(`   ✅ ${i + 1}/${booksToFetchTags.length}: ${book.title.substring(0, 40)}... (${genreNames.length} tags)`);

                } catch (error) {
                    console.log(`   ❌ ${i + 1}/${booksToFetchTags.length}: ${book.title.substring(0, 40)}... - ${error.message}`);
                    tagsErrorCount++;
                }
            }

            progressUI.updateProgress(booksToFetchTags.length, booksToFetchTags.length);
            console.log(`\n✅ Phase 3 complete: ${tagsSuccessCount}/${booksToFetchTags.length} books tagged`);
            if (booksNeedingTags.length > TAGS_CAP) {
                console.log(`   ℹ️  ${booksNeedingTags.length - TAGS_CAP} more books need tags (will process next run)`);
            }
            console.log('');
        }
        stats.timing.phase3End = Date.now();

        // ============================================================================
        // Phase 4: Prices (all books every run - prices change frequently)
        // ============================================================================
        stats.timing.phase4Start = Date.now();
        console.log('[6/7] Fetching prices for all books...');

        // Combine new books with existing to get all books
        const allBooksForPrices = [...newBooks, ...existingBooks];
        const PRICE_BATCH_SIZE = 30; // Same as enrichment batch size
        const TEMP_OWNERSHIP = ['sample', 'borrowed', 'prime', 'kindleUnlimited', 'koll', 'wishlist', 'unknown']; // v4.11.8 - upgradeable

        if (allBooksForPrices.length === 0) {
            console.log('   ✅ No books to price\n');
        } else {
            console.log(`   Found ${allBooksForPrices.length} books`);
            progressUI.updatePhase('Fetching Prices', `Processing ${allBooksForPrices.length} books`);

            const priceBatches = Math.ceil(allBooksForPrices.length / PRICE_BATCH_SIZE);
            let pricesSuccessCount = 0;
            let pricesErrorCount = 0;
            let unpricedDebugCount = 0; // v4.11.9 TEMP price-debug — remove after diagnosis
            let wishlistDebugShown = false; // v4.11.9 TEMP — guarantee one unpriced-wishlist sample

            for (let batchNum = 0; batchNum < priceBatches; batchNum++) {
                // Check for user abort
                if (progressUI.isAborted()) {
                    console.log('⚠️ Fetch aborted by user during Phase 4 (prices)');
                    return;
                }

                const batchStart = batchNum * PRICE_BATCH_SIZE;
                const batchEnd = Math.min(batchStart + PRICE_BATCH_SIZE, allBooksForPrices.length);
                const batchBooks = allBooksForPrices.slice(batchStart, batchEnd);

                progressUI.updateProgress(batchStart, allBooksForPrices.length);

                try {
                    // Build GraphQL-compatible input
                    const inputStr = '[' + batchBooks.map(book => `{asin: "${book.asin}"}`).join(', ') + ']';

                    const priceQuery = `query qvGetMediaMatrixProductsQuickView {
                        getProducts(input: ${inputStr}) {
                            asin
                            pastPurchase { purchaseHistory { lastOrderDate lastOrderDateV2 } }
                            buyingOptions {
                                options {
                                    type
                                    callToAction { readNow { url } }
                                    price {
                                        basisPrice {
                                            moneyValueOrRange {
                                                value {
                                                    amount
                                                }
                                            }
                                        }
                                        priceToPay {
                                            moneyValueOrRange {
                                                value {
                                                    amount
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }`;

                    const result = await fetchWithRetry(async () => {
                        const response = await fetch('https://www.amazon.com/kindle-reader-api', {
                            method: 'POST',
                            headers: apiHeaders(),
                            credentials: 'include',
                            body: JSON.stringify({
                                query: priceQuery,
                                operationName: 'qvGetMediaMatrixProductsQuickView'
                            })
                        });

                        if (!response.ok) {
                            return { httpError: true, httpStatus: response.status };
                        }

                        const data = await response.json();

                        if (data.errors && !data.data?.getProducts?.length) {
                            return { apiError: true, errorMessage: data.errors[0]?.message || 'API error' };
                        }

                        const products = data?.data?.getProducts || [];
                        if (products.length === 0) {
                            return { noData: true };
                        }

                        return { products };
                    }, `Prices batch ${batchNum + 1}`);

                    // Create ASIN lookup map
                    const productMap = new Map();
                    for (const product of result.products) {
                        if (product.asin) {
                            productMap.set(product.asin, product);
                        }
                    }

                    // Update each book with price data
                    const now = new Date().toISOString();

                    for (const book of batchBooks) {
                        const product = productMap.get(book.asin);
                        let priceWasSet = false;
                        if (product) {
                            // Find Kindle buying option
                            const kindleOption = product.buyingOptions?.options?.find(
                                opt => opt.type === 'KINDLE_ALC' || opt.type === 'KINDLE'
                            ) || product.buyingOptions?.options?.[0];

                            if (kindleOption?.price) {
                                book.currentPrice = kindleOption.price.priceToPay?.moneyValueOrRange?.value?.amount ?? null;
                                book.listPrice = kindleOption.price.basisPrice?.moneyValueOrRange?.value?.amount ?? null;
                                book.priceFetchedAt = now;
                                pricesSuccessCount++;
                                priceWasSet = true;
                            }

                            // v4.11.8 - Ownership upgrade. Amazon leaves relationshipSubType as "Sample" (etc.) after you
                            // BUY a sampled/wishlisted book; the real purchase shows only in pastPurchase + a "Read Now".
                            // If both are present and the book is still a temporary type, promote to purchased and use the
                            // order date as acquisitionDate (so it sorts as a recent purchase). Runs for EVERY book each
                            // run, so it also fixes books the incremental scan already had.
                            const orderDate = product.pastPurchase?.purchaseHistory?.lastOrderDateV2;
                            const canReadNow = (product.buyingOptions?.options || []).some(o => o.callToAction?.readNow?.url);
                            if (orderDate && canReadNow && (book.onWishlist || TEMP_OWNERSHIP.includes(book.ownershipType))) {
                                stats.ownershipUpgraded.push({ asin: book.asin, title: book.title, from: book.onWishlist ? 'wishlist' : book.ownershipType });
                                book.ownershipType = 'purchased';
                                book.onWishlist = false;
                                const ms = Date.parse(orderDate);
                                if (!isNaN(ms)) book.acquisitionDate = String(ms);
                            }
                        }

                        // v4.11.9 TEMP price-debug — sample the books that come back with no usable price (the
                        // ~520/run "$0.00" set). Dump the 1st + every 50th, with raw buyingOptions, to see whether
                        // Amazon returns no price or we're mis-extracting. REMOVE after diagnosis.
                        if (!priceWasSet) {
                            const wishlistSample = !!book.onWishlist && !wishlistDebugShown;
                            if (unpricedDebugCount % 50 === 0 || wishlistSample) {
                                console.log(`   🔎 [price-debug #${unpricedDebugCount}${wishlistSample ? ' WISHLIST' : ''}] ${book.asin} "${(book.title || '').slice(0, 50)}" own=${book.ownershipType} wish=${!!book.onWishlist} productReturned=${!!product}`);
                                if (product) console.log('        buyingOptions:', JSON.stringify(product.buyingOptions, null, 2));
                                if (wishlistSample) wishlistDebugShown = true;
                            }
                            unpricedDebugCount++;
                        }
                    }

                    console.log(`   ✅ Batch ${batchNum + 1}/${priceBatches}: ${result.products.length} prices fetched`);

                } catch (error) {
                    console.log(`   ❌ Batch ${batchNum + 1}/${priceBatches}: ${error.message}`);
                    pricesErrorCount += batchBooks.length;
                }
            }

            progressUI.updateProgress(allBooksForPrices.length, allBooksForPrices.length);
            console.log(`\n✅ Phase 4 complete: ${pricesSuccessCount}/${allBooksForPrices.length} prices updated`);
            if (stats.ownershipUpgraded.length > 0) {
                console.log(`   ⬆️  Ownership upgraded to purchased: ${stats.ownershipUpgraded.length} (Amazon left them as sample/wishlist after purchase)`);
                stats.ownershipUpgraded.slice(0, 10).forEach(b => console.log(`      • ${(b.title || b.asin).substring(0, 50)} (was ${b.from})`));
                if (stats.ownershipUpgraded.length > 10) console.log(`      • ... and ${stats.ownershipUpgraded.length - 10} more`);
            }
            console.log('');
        }
        stats.timing.phase4End = Date.now();

        // Step 7: Merge and save library
        stats.timing.mergeStart = Date.now();
        console.log('[7/7] Merging with existing data and saving library...');
        progressUI.updatePhase('Saving Library', 'Merging and downloading library file');

        // v4.11.7 - Retro-backfill series for EXISTING books that have none (dead editions recovered by earlier
        // runs before this parser existed, e.g. the Gideon Sable novels). Title-only, precision-first; never
        // overwrites an existing series. This is what repairs already-saved books without a full re-fetch.
        let backfilled = 0;
        for (const b of existingBooks) {
            if (b && !b.series && b.title) {
                const parsed = parseSeriesFromTitle(b.title);
                if (parsed.series) { b.series = parsed.series; b.seriesPosition = parsed.seriesPosition; backfilled++; }
            }
        }
        if (backfilled > 0) {
            console.log(`   🏷️  Backfilled series from title for ${backfilled} existing book(s) that had none`);
            stats.seriesFromTitle += backfilled;
        }

        // Prepend new books (most recent first), keeping existing books with their updates
        const finalBooks = [...newBooks, ...existingBooks];

        // Summary of what changed
        if (newBooks.length > 0) {
            console.log(`   📚 Found ${newBooks.length} new book${newBooks.length === 1 ? '' : 's'} to add`);
        } else {
            console.log('   📚 No new books (existing library updated with tags/prices/enrichment)');
        }

        // Create output in Schema v2.0 unified format
        // Library Fetcher owns: schemaVersion, books
        // Preserves any existing collections section from input file
        // v4.8.0.b - Removed booksWithoutDescriptionsDetails from JSON (now console-only)
        const outputData = {
            schemaVersion: SCHEMA_VERSION,
            books: {
                fetchDate: new Date().toISOString(),
                fetcherVersion: FETCHER_VERSION,
                totalBooks: finalBooks.length,
                items: finalBooks
            }
        };
        // Preserve existing collections section if present
        if (existingCollections) {
            outputData.collections = existingCollections;
        }

        const jsonData = JSON.stringify(outputData, null, 2);

        // Mark merge phase complete (before save - merge/prep is done)
        stats.timing.mergeEnd = Date.now();

        // Calculate and print timing summary BEFORE save (so devs can see it even if they cancel)
        const phase0Duration = stats.timing.phase0End - stats.timing.phase0Start;
        const phase1Duration = stats.timing.pass1End - stats.timing.pass1Start;
        const phase2Duration = stats.timing.pass2End - stats.timing.pass2Start;
        const phase3Duration = stats.timing.phase3End - stats.timing.phase3Start;
        const phase4Duration = stats.timing.phase4End - stats.timing.phase4Start;
        const mergeDuration = stats.timing.mergeEnd - stats.timing.mergeStart;
        const totalDuration = Date.now() - startTime;

        console.log('\n========================================');
        console.log('✅ FETCH COMPLETE - READY TO SAVE');
        console.log('========================================\n');

        console.log('⏱️  TIMING');
        console.log(`   Phase 0 (Validation):        ${formatTime(phase0Duration)}`);
        console.log(`   Phase 1 (Fetch titles):      ${formatTime(phase1Duration)}`);
        console.log(`   Phase 2 (Enrich):            ${formatTime(phase2Duration)}`);
        console.log(`   Phase 3 (Tags):              ${formatTime(phase3Duration)}`);
        console.log(`   Phase 4 (Prices):            ${formatTime(phase4Duration)}`);
        console.log(`   Merge & Save:                ${formatTime(mergeDuration)}`);
        console.log(`   ${'─'.repeat(37)}`);
        console.log(`   Total time:                  ${formatTime(totalDuration)}\n`);

        // Ownership type summary (for new books only) - shown before save so user sees it even if cancelled
        console.log('🏷️  OWNERSHIP TYPES (new books)');
        console.log(`   Purchased:                    ${stats.ownershipTypes.purchased}`);
        if (stats.ownershipTypes.sample > 0) {
            console.log(`   Sample:                       ${stats.ownershipTypes.sample}`);
        }
        if (stats.ownershipTypes.borrowed > 0) {
            console.log(`   Borrowed (Family):            ${stats.ownershipTypes.borrowed}`);
        }
        if (stats.ownershipTypes.prime > 0) {
            console.log(`   Prime Reading:                ${stats.ownershipTypes.prime}`);
        }
        if (stats.ownershipTypes.kindleUnlimited > 0) {
            console.log(`   Kindle Unlimited:             ${stats.ownershipTypes.kindleUnlimited}`);
        }
        if (stats.ownershipTypes.koll > 0) {
            console.log(`   KOLL:                         ${stats.ownershipTypes.koll}`);
        }
        if (stats.ownershipTypes.comixology > 0) {
            console.log(`   Comixology:                   ${stats.ownershipTypes.comixology}`);
        }
        if (stats.ownershipTypes.insideAmazon > 0) {
            console.log(`   Amazon Insider:               ${stats.ownershipTypes.insideAmazon}`);
        }
        if (stats.ownershipTypes.unknown.length > 0) {
            console.log(`   Unknown:                      ${stats.ownershipTypes.unknown.length}`);
            console.log('');
            console.log('⚠️  UNKNOWN OWNERSHIP TYPES FOUND');

            // Send telemetry for each unique unknown type (helps discover new ownership types)
            const uniqueUnknownTypes = [...new Set(stats.ownershipTypes.unknown.map(item => item.rawType))];
            uniqueUnknownTypes.forEach(rawType => {
                new Image().src = `https://readerwrangler.goatcounter.com/count?p=/event/newOwnershipType=${encodeURIComponent(rawType)}`;
            });
            console.log('   (Note: Unknown types still import normally - this info helps improve future versions)');
            console.log('   Please report these at: https://github.com/Ron-L/readerwrangler/issues/new');
            console.log('');
            console.log('   Copy everything below this line and paste into a new issue:');
            console.log('   ─────────────────────────────────────────────────────────');
            console.log('   **Bug Report: Unknown Ownership Types**');
            console.log('');
            console.log(`   Fetcher Version: ${FETCHER_VERSION}`);
            console.log(`   Date: ${new Date().toISOString().split('T')[0]}`);
            console.log('');
            console.log('   Unknown types found:');
            stats.ownershipTypes.unknown.forEach(item => {
                console.log(`   - \`${item.rawType}\` | ${item.asin} | ${item.title}`);
            });
            console.log('   ─────────────────────────────────────────────────────────');
        }
        console.log('');

        // Upload to relay with retry
        progressUI.updatePhase('Uploading', 'Compressing and encrypting...');
        console.log('[Relay] Uploading library to relay...');

        let uploaded = false;
        while (!uploaded) {
            try {
                const manifest = await window.RWRelay.upload(jsonData, (phase, detail) => {
                    progressUI.updatePhase('Uploading', detail);
                });
                console.log(`✅ Uploaded to relay (${manifest.bookCount} books, ${(manifest.compressedBytes / 1024).toFixed(0)} KB compressed)`);
                uploaded = true;
            } catch (relayError) {
                console.error('❌ Relay upload failed:', relayError.message);
                const choice = await progressUI.showRetryUpload(relayError.message);
                if (choice === 'cancel') {
                    progressUI.showError('Upload cancelled — your fetched data was not saved.');
                    return;
                }
            }
        }

        const totalFetched = newBooks.length + stats.nonBooksFiltered.length;
        console.log('📊 FETCH RESULTS');
        console.log(`   Total books fetched:          ${totalFetched}`);
        if (stats.nonBooksFiltered.length > 0) {
            console.log(`   Non-books filtered:           ${stats.nonBooksFiltered.length}`);
            stats.nonBooksFiltered.slice(0, 3).forEach(item => {
                console.log(`      • ${item.title.substring(0, 50)} (${item.binding})`);
            });
            if (stats.nonBooksFiltered.length > 3) {
                console.log(`      • ... and ${stats.nonBooksFiltered.length - 3} more`);
            }
        }
        console.log(`   Books kept:                   ${newBooks.length}\n`);

        // v4.11.0 - COMPLETENESS / reconciliation (no silent drops)
        console.log('🧮 COMPLETENESS');
        if (stats.recoveredBooks.length > 0) {
            console.log(`   Recovered (were missing):     ${stats.recoveredBooks.length}`);
            if (stats.seriesFromTitle > 0) console.log(`      ↳ series parsed from title:   ${stats.seriesFromTitle} (dead editions Amazon had no series record for)`);
            stats.recoveredBooks.slice(0, 5).forEach(b => console.log(`      • ${(b.title || b.asin).substring(0, 50)}`));
            if (stats.recoveredBooks.length > 5) console.log(`      • ... and ${stats.recoveredBooks.length - 5} more`);
        }
        if (stats.unrecoverableBooks.length > 0) {
            console.log(`   ⚠️ Unavailable/delisted:       ${stats.unrecoverableBooks.length} (in Amazon's count but no product data anywhere — cannot import)`);
            console.log(`      ASINs: ${stats.unrecoverableBooks.slice(0, 10).map(b => b.asin).join(', ')}${stats.unrecoverableBooks.length > 10 ? ', ...' : ''}`);
        }
        if (stats.unknownNodeTypes.length > 0) {
            const byType = {};
            stats.unknownNodeTypes.forEach(u => { byType[u.typename] = (byType[u.typename] || 0) + 1; });
            console.log(`   ⚠️ Unknown node types:         ${stats.unknownNodeTypes.length} ${JSON.stringify(byType)} (flagged to GoatCounter — investigate)`);
        }
        // Recovery integrity: every book the sweep flagged as missing must be recovered, flagged, or deferred.
        const recoveryTouched = stats.recoveredBooks.length + stats.unrecoverableBooks.length;
        const deferred = Math.max(0, stats.recoveryCandidates - recoveryTouched);
        if (stats.recoveryCandidates > 0) {
            console.log(`   Recovery integrity: ${stats.recoveryCandidates} missing = ${stats.recoveredBooks.length} recovered + ${stats.unrecoverableBooks.length} unavailable/delisted${deferred ? ` + ${deferred} deferred (batch error — retried next run)` : ''}`);
            if (deferred === 0) {
                console.log(`   ✅ No silent drops — every missing book was recovered or explicitly flagged.`);
            }
        }
        // Library vs Amazon is intentionally NOT claimed as "reconciled": Amazon's totalCount is a FILTERED
        // live count (excludes archived / hidden-tag books), while our library accumulates across fetches and
        // keeps orphans/returned books Amazon no longer lists. Holding MORE than Amazon's count is expected and
        // means nothing is missing — the gap is surplus, not loss (only a fraction are the flagged orphans).
        if (stats.libraryTotalCount != null) {
            console.log(`   Library holds ${finalBooks.length}; Amazon's filtered live count is ${stats.libraryTotalCount}. Holding ≥ that means nothing's missing — the surplus is books RW keeps that Amazon's filters exclude or has since removed (see orphan scan).`);
        }
        console.log('');
        if (stats.recoveredBooks.length > 0 || stats.unrecoverableBooks.length > 0) {
            progressUI.showInfoBanner(`Completeness: recovered ${stats.recoveredBooks.length} previously-missing book(s)${stats.unrecoverableBooks.length ? `; ${stats.unrecoverableBooks.length} unavailable/delisted (see console)` : ''}.`);
        }

        console.log('🔄 API RELIABILITY');
        console.log(`   Total API calls:              ${stats.apiCalls.total}`);
        const firstTryPct = ((stats.apiCalls.firstTry / stats.apiCalls.total) * 100).toFixed(1);
        console.log(`   Succeeded first try:          ${stats.apiCalls.firstTry} (${firstTryPct}%)`);
        if (stats.apiCalls.retry1 > 0) {
            const retry1Pct = ((stats.apiCalls.retry1 / stats.apiCalls.total) * 100).toFixed(1);
            console.log(`   Needed 1 retry:               ${stats.apiCalls.retry1} (${retry1Pct}%)`);
        }
        if (stats.apiCalls.retry2 > 0) {
            const retry2Pct = ((stats.apiCalls.retry2 / stats.apiCalls.total) * 100).toFixed(1);
            console.log(`   Needed 2 retries:             ${stats.apiCalls.retry2} (${retry2Pct}%)`);
        }
        if (stats.apiCalls.retry3 > 0) {
            const retry3Pct = ((stats.apiCalls.retry3 / stats.apiCalls.total) * 100).toFixed(1);
            console.log(`   Needed 3 retries:             ${stats.apiCalls.retry3} (${retry3Pct}%)`);
        }
        if (stats.apiCalls.failed > 0) {
            const failedPct = ((stats.apiCalls.failed / stats.apiCalls.total) * 100).toFixed(1);
            console.log(`   Failed after 3 retries:       ${stats.apiCalls.failed} (${failedPct}%)`);
        }
        console.log('');

        const successRate = ((enrichedCount / newBooks.length) * 100).toFixed(2);
        console.log('📝 ENRICHMENT RESULTS');
        console.log(`   Successfully enriched:        ${enrichedCount}/${newBooks.length} (${successRate}%)`);
        if (stats.apiErrorBooks.length > 0) {
            console.log(`   Failed after retries:         ${stats.apiErrorBooks.length}`);
            stats.apiErrorBooks.slice(0, 3).forEach(item => {
                console.log(`      • ${item.title.substring(0, 50)}`);
            });
            if (stats.apiErrorBooks.length > 3) {
                console.log(`      • ... and ${stats.apiErrorBooks.length - 3} more`);
            }
        }
        console.log('');

        if (stats.duplicatesFound.length > 0) {
            console.log('🔁 DUPLICATES REMOVED');
            console.log(`   Duplicate ASINs found:        ${stats.duplicatesFound.length}`);
            stats.duplicatesFound.slice(0, 3).forEach(item => {
                console.log(`      • ${item.title.substring(0, 50)} (ASIN: ${item.asin})`);
            });
            if (stats.duplicatesFound.length > 3) {
                console.log(`      • ... and ${stats.duplicatesFound.length - 3} more`);
            }
            console.log('');
        }

        if (stats.partialErrorBooks.length > 0) {
            console.log('⚠️  PARTIAL ERRORS (Got data anyway)');
            console.log(`   Batches with partial errors:  ${stats.partialErrorBooks.length}`);
            // Show category breakdown
            if (stats.errorCategories.amazonTimeout > 0) {
                console.log(`   └ Amazon timeouts (504.1):    ${stats.errorCategories.amazonTimeout}`);
            }
            if (stats.errorCategories.customerMarketplace > 0) {
                console.log(`   └ Customer/Marketplace:       ${stats.errorCategories.customerMarketplace}`);
            }
            if (stats.errorCategories.other > 0) {
                console.log(`   └ Other errors:               ${stats.errorCategories.other}`);
            }
            // Show batch details
            stats.partialErrorBooks.forEach(item => {
                console.log(`      • Batch ${item.batch}: ${item.productsReturned}/${item.productsRequested} products returned`);
                console.log(`        Error: ${item.errorMessage}`);
            });
            console.log('');
        }

        console.log('⚠️  DATA QUALITY NOTES');
        console.log(`   Books without descriptions:   ${booksWithoutDescriptions.length}`);
        booksWithoutDescriptions.slice(0, 3).forEach(item => {
            console.log(`      • ${item.title} (ASIN: ${item.asin})`);
        });
        if (booksWithoutDescriptions.length > 3) {
            console.log(`      • ... and ${booksWithoutDescriptions.length - 3} more`);
        }
        console.log('');

        if (stats.booksWithoutAuthors.length > 0) {
            console.log(`   Books without authors:        ${stats.booksWithoutAuthors.length}`);
            stats.booksWithoutAuthors.slice(0, 3).forEach(item => {
                console.log(`      • ${item.title.substring(0, 50)} (ASIN: ${item.asin})`);
            });
            if (stats.booksWithoutAuthors.length > 3) {
                console.log(`      • ... and ${stats.booksWithoutAuthors.length - 3} more`);
            }
            console.log('');
        }

        if (stats.aiSummariesUsed.length > 0) {
            console.log(`   AI summaries used:            ${stats.aiSummariesUsed.length}`);
            stats.aiSummariesUsed.slice(0, 3).forEach(item => {
                console.log(`      • ${item.title.substring(0, 50)} (ASIN: ${item.asin})`);
            });
            if (stats.aiSummariesUsed.length > 3) {
                console.log(`      • ... and ${stats.aiSummariesUsed.length - 3} more`);
            }
            console.log('');
        }

        console.log('💾 FILE SAVED');
        console.log(`   ✅ ${LIBRARY_FILENAME} (${finalBooks.length} books)`);
        console.log('========================================\n');
        console.log('👉 Next steps:');
        console.log('   1. Find the library file in your Downloads folder');
        console.log('   2. Keep it somewhere you can find it later (Desktop, Documents, etc.)');
        console.log('   3. Open ReaderWrangler and load your library file to start organizing!');
        console.log('   4. Status bar will show your data is fresh\n');
        console.log('💡 Next time you run this script:');
        console.log('   - Select amazon-library.json when prompted');
        console.log('   - Only NEW books will be fetched & enriched');
        console.log('   - Library file will be updated automatically');
        console.log('   - Status bar will reflect the new fetch');
        console.log('========================================\n');

        // Show fetch-complete UI and begin orphan scan
        const fetchCompleteMessage = `Library updated: ${finalBooks.length} books (${newBooks.length} new)`;
        progressUI.showFetchComplete(fetchCompleteMessage);
        new Image().src = 'https://readerwrangler.goatcounter.com/count?p=/event/library-fetcher-completed';

        // ============================================================================
        // Phase 5: Background Orphan Scan
        // ============================================================================
        // Full-library scan to identify books no longer in Amazon account.
        // Runs after main fetch + upload. User can close tab to skip.
        console.log('\n========================================');
        console.log('🔍 ORPHAN SCAN - Checking for removed books');
        console.log('========================================\n');

        try {
            const amazonAsins = new Set();
            let orphanCursor = "";
            let orphanPage = 0;
            let orphanHasMore = true;
            let orphanTotalPages = 0; // Set from first API response

            while (orphanHasMore) {
                orphanPage++;
                if (orphanTotalPages > 0) {
                    progressUI.updateOrphanProgress(orphanPage, orphanTotalPages);
                }

                // Minimal query - just ASINs and binding (to filter non-books)
                const orphanQuery = `query ccGetCustomerLibraryBooks {
                    getCustomerLibrary {
                        books(after: "${orphanCursor}", first: ${PAGE_SIZE}, sortBy: {sortField: ACQUISITION_DATE, sortOrder: DESCENDING}, selectionCriteria: {tags: [], query: "NOT (222711ade9d0f22714af93d1c8afec60 OR 858f501de8e2d7ece33f768936463ac8)"}, groupBySeries: false) {
                            pageInfo {
                                hasNextPage
                                endCursor
                            }
                            totalCount {
                                number
                            }
                            edges {
                                node {
                                    asin
                                    product {
                                        asin
                                        bindingInformation {
                                            binding {
                                                displayString
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }`;

                const result = await fetchWithRetry(async () => {
                    const response = await fetch('https://www.amazon.com/kindle-reader-api', {
                        method: 'POST',
                        headers: apiHeaders(),
                        credentials: 'include',
                        body: JSON.stringify({
                            query: orphanQuery,
                            operationName: 'ccGetCustomerLibraryBooks'
                        })
                    });

                    if (!response.ok) {
                        return { httpError: true, httpStatus: response.status };
                    }

                    const data = await response.json();
                    if (data.errors) {
                        return { apiError: true, errors: data.errors };
                    }

                    const library = data?.data?.getCustomerLibrary?.books;
                    if (!library || !library.edges) {
                        return { noData: true };
                    }

                    return { library };
                }, `Orphan scan page ${orphanPage}`);

                const library = result.library;

                // On first page, get totalCount from API for accurate progress estimate
                if (orphanPage === 1 && library.totalCount?.number) {
                    orphanTotalPages = Math.ceil(library.totalCount.number / PAGE_SIZE);
                    console.log(`   📊 Amazon reports ${library.totalCount.number} total items (~${orphanTotalPages} pages)`);
                    progressUI.updateOrphanProgress(orphanPage, orphanTotalPages);
                }

                for (const edge of library.edges) {
                    const node = edge.node;
                    if (!node?.asin) continue;
                    const product = node.product;
                    // v4.11.0 - A null-product node is STILL present in Amazon's library (just unresolved by the
                    // list query), so it is NOT an orphan — count its ASIN so recovered books aren't false-flagged.
                    // Only skip genuine non-books (product present with a non-book binding).
                    if (product) {
                        const binding = product.bindingInformation?.binding?.displayString || null;
                        if (binding && !BOOK_BINDINGS.includes(binding)) continue; // Skip real non-books
                    }
                    amazonAsins.add(node.asin);
                }

                console.log(`   📖 Orphan scan page ${orphanPage}${orphanTotalPages ? '/' + orphanTotalPages : ''}: ${library.edges.length} items (${amazonAsins.size} book ASINs total)`);

                orphanHasMore = library.pageInfo?.hasNextPage || false;
                orphanCursor = library.pageInfo?.endCursor || "";

                if (orphanHasMore) {
                    await new Promise(resolve => setTimeout(resolve, FETCH_DELAY_MS));
                }
            }

            console.log(`\n✅ Orphan scan complete: ${amazonAsins.size} books found in Amazon library`);

            // Compare against our library — find orphans
            // Skip wishlist-only books (they wouldn't be in the Amazon library scan)
            const orphanedBooks = finalBooks.filter(b =>
                !amazonAsins.has(b.asin) && !b.onWishlist
            );

            const orphanScanDate = new Date().toISOString();

            // Mark all books with orphan status
            for (const book of finalBooks) {
                if (book.onWishlist) {
                    // Wishlist books are not in the library scan — don't mark them
                    continue;
                }
                if (amazonAsins.has(book.asin)) {
                    book.orphanStatus = 'verified';
                    book.orphanCheckedDate = orphanScanDate;
                } else {
                    book.orphanStatus = 'orphan';
                    book.orphanCheckedDate = orphanScanDate;
                }
            }

            console.log(`   📊 Orphans found: ${orphanedBooks.length}`);

            // Build ownership breakdown for orphans
            if (orphanedBooks.length > 0) {
                const orphanByType = {};
                for (const book of orphanedBooks) {
                    const type = book.ownershipType || 'unknown';
                    orphanByType[type] = (orphanByType[type] || 0) + 1;
                    console.log(`   🔍 Orphan: ${book.title} (${type})`);
                }

                const typeSummary = Object.entries(orphanByType)
                    .map(([type, count]) => `${count} ${type}`)
                    .join(', ');

                // Re-upload with orphan flags
                const updatedOutputData = {
                    schemaVersion: SCHEMA_VERSION,
                    books: {
                        fetchDate: outputData.books.fetchDate,
                        fetcherVersion: FETCHER_VERSION,
                        totalBooks: finalBooks.length,
                        orphanScanComplete: true,
                        orphanScanProgress: `${orphanPage}/${orphanPage}`,
                        orphanScanDate,
                        orphanCount: orphanedBooks.length,
                        items: finalBooks
                    }
                };
                if (existingCollections) {
                    updatedOutputData.collections = existingCollections;
                }

                const updatedJsonData = JSON.stringify(updatedOutputData, null, 2);
                progressUI.updateOrphanProgress(orphanPage, orphanPage); // Show 100%

                console.log('[Relay] Re-uploading library with orphan flags...');
                await window.RWRelay.upload(updatedJsonData, (phase, detail) => {
                    console.log(`   📡 Orphan re-upload: ${detail}`);
                });
                console.log('✅ Library re-uploaded with orphan data');

                progressUI.showOrphanResult(
                    `✅ Orphan scan: <strong>${orphanedBooks.length}</strong> book${orphanedBooks.length === 1 ? '' : 's'} no longer in your Amazon library (${typeSummary}).<br><br>Import from Relay in the app to review.`
                );
            } else {
                // No orphans — update metadata and re-upload
                const updatedOutputData = {
                    schemaVersion: SCHEMA_VERSION,
                    books: {
                        fetchDate: outputData.books.fetchDate,
                        fetcherVersion: FETCHER_VERSION,
                        totalBooks: finalBooks.length,
                        orphanScanComplete: true,
                        orphanScanProgress: `${orphanPage}/${orphanPage}`,
                        orphanScanDate,
                        orphanCount: 0,
                        items: finalBooks
                    }
                };
                if (existingCollections) {
                    updatedOutputData.collections = existingCollections;
                }

                const updatedJsonData = JSON.stringify(updatedOutputData, null, 2);
                console.log('[Relay] Re-uploading library with verified status...');
                await window.RWRelay.upload(updatedJsonData, (phase, detail) => {
                    console.log(`   📡 Orphan re-upload: ${detail}`);
                });
                console.log('✅ Library re-uploaded - all books verified');

                progressUI.showOrphanResult('✅ All books verified — no orphans.<br><br>Import from Relay in the app to load your updated library.');
            }

        } catch (orphanError) {
            console.error('⚠️ Orphan scan failed:', orphanError.message);

            // Try to upload partial results if we have any orphan data
            const partialOrphans = finalBooks.filter(b => b.orphanStatus === 'orphan');
            const partialVerified = finalBooks.filter(b => b.orphanStatus === 'verified');

            if (partialVerified.length > 0 || partialOrphans.length > 0) {
                // We have partial data — upload what we have
                const partialOutputData = {
                    schemaVersion: SCHEMA_VERSION,
                    books: {
                        fetchDate: outputData.books.fetchDate,
                        fetcherVersion: FETCHER_VERSION,
                        totalBooks: finalBooks.length,
                        orphanScanComplete: false,
                        orphanScanDate: new Date().toISOString(),
                        orphanCount: partialOrphans.length,
                        items: finalBooks
                    }
                };
                if (existingCollections) {
                    partialOutputData.collections = existingCollections;
                }

                try {
                    const partialJsonData = JSON.stringify(partialOutputData, null, 2);
                    await window.RWRelay.upload(partialJsonData, () => {});
                    console.log(`✅ Partial orphan data uploaded (${partialVerified.length} verified, ${partialOrphans.length} orphans)`);

                    progressUI.showOrphanResult(
                        `⚠️ Orphan scan incomplete. Partial results uploaded.<br>Import from Relay to review what was found so far.`
                    );
                } catch (uploadErr) {
                    console.error('❌ Partial orphan upload also failed:', uploadErr.message);
                    progressUI.showOrphanResult(
                        `⚠️ Orphan scan failed: ${orphanError.message}<br>Your library data was saved successfully before the scan.<br><br>Import from Relay in the app to load your updated library.`
                    );
                }
            } else {
                progressUI.showOrphanResult(
                    `⚠️ Orphan scan failed: ${orphanError.message}<br>Your library data was saved successfully before the scan.<br><br>Import from Relay in the app to load your updated library.`
                );
            }
        }

    } catch (error) {
        console.error('\n========================================');
        console.error('❌ FATAL ERROR');
        console.error('========================================');
        console.error(error);
        console.error('========================================\n');

        // Show error UI
        progressUI.showError(error.message || 'An unknown error occurred');
    }
}

// Auto-run on first paste
fetchAmazonLibrary();