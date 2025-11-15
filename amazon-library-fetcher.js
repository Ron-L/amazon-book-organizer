// Amazon Library Fetcher v3.3.3.a (Combined Pass 1+2 + Manifest + Deduplication + Partial Error Handling + Stats)
// Fetches library books and enriches them with descriptions & reviews
// Also generates a manifest file for the organizer to track updates
// Schema Version: 3.0.0 (Compatible with: Organizer v3.3.0+ when released)
//
// Instructions:
// 1. Go to https://www.amazon.com/yourbooks (must be logged in)
// 2. Open DevTools Console (F12 → Console tab)
// 3. Paste this ENTIRE script and press Enter
// 4. If you have existing data, select amazon-library.json when prompted
//    (If no existing file, just cancel the dialog - will fetch ALL books)
// 5. Wait for completion (~5 min first time, ~2-3 hours with enrichment)
// 6. Downloads amazon-library.json AND amazon-manifest.json
// 7. Upload library file to organizer!
//
// Re-run: After pasting once, you can re-run with: fetchAmazonLibrary()

async function fetchAmazonLibrary() {
    const PAGE_TITLE = document.title;
    const FETCHER_VERSION = 'v3.3.2';
    const SCHEMA_VERSION = '3.0.0';

    console.log('========================================');
    console.log(`Amazon Library Fetcher ${FETCHER_VERSION}`);
    console.log(`📄 Page: ${PAGE_TITLE}`);
    console.log('Combined Pass 1 (titles) + Pass 2 (enrichment) + Manifest');
    console.log('========================================\n');

    // Verify we're on the right page
    if (!window.location.href.includes('amazon.com/yourbooks')) {
        console.error('❌ ERROR: Wrong page!');
        console.error('   Please run this on: https://www.amazon.com/yourbooks');
        return;
    }

    const PAGE_SIZE = 30;
    const FETCH_DELAY_MS = 2000; // 2 seconds between library pages
    const ENRICH_DELAY_MS = 3000; // 3 seconds between enrichment requests
    const LIBRARY_FILENAME = 'amazon-library.json';
    const MANIFEST_FILENAME = 'amazon-manifest.json';
    const startTime = Date.now();

    // Retry configuration for API errors
    const MAX_RETRIES = 3;
    const RETRY_DELAYS_MS = [5000, 10000, 20000]; // Exponential backoff: 5s, 10s, 20s

    // CSRF token (initialized later, but declared here for scope access in fetchWithRetry)
    let csrfToken = null;

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
            mergeStart: 0,
            mergeEnd: 0,
            manifestStart: 0,
            manifestEnd: 0
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
        duplicatesFound: []  // Track duplicate ASINs
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

    // ============================================================================
    // Progress Overlay UI (Option C - Minimal)
    // ============================================================================
    const progressUI = (() => {
        let overlay = null;
        let phaseElement = null;
        let detailElement = null;

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
                <div style="font-size: 18px; font-weight: bold; color: #333; margin-bottom: 10px;">
                    📚 Library Fetcher ${FETCHER_VERSION}
                </div>
                <div id="progressPhase" style="font-size: 14px; color: #667eea; margin-bottom: 8px; font-weight: 500;">
                    Starting...
                </div>
                <div id="progressDetail" style="font-size: 13px; color: #666; margin-bottom: 15px;">
                    Initializing
                </div>
                <div style="font-size: 12px; color: #999; border-top: 1px solid #eee; padding-top: 10px;">
                    ⏱️ Large libraries take time: ~1 hour per 1000 books<br>
                    💡 Open Console (F12) for detailed progress
                </div>
            `;

            phaseElement = overlay.querySelector('#progressPhase');
            detailElement = overlay.querySelector('#progressDetail');
            document.body.appendChild(overlay);
        }

        function updatePhase(phase, detail = '') {
            if (!overlay) create();
            if (phaseElement) phaseElement.textContent = phase;
            if (detailElement) detailElement.textContent = detail;
        }

        function remove() {
            if (overlay && overlay.parentElement) {
                overlay.style.transition = 'opacity 0.3s';
                overlay.style.opacity = '0';
                setTimeout(() => overlay.remove(), 300);
            }
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

        return { create, updatePhase, remove, showComplete, showError };
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

    const extractCoverUrl = (product) => {
        const images = product.images?.images?.[0];
        if (images?.hiRes?.physicalId && images?.hiRes?.extension) {
            return `https://images-na.ssl-images-amazon.com/images/I/${images.hiRes.physicalId}.${images.hiRes.extension}`;
        } else if (images?.lowRes?.physicalId && images?.lowRes?.extension) {
            return `https://images-na.ssl-images-amazon.com/images/I/${images.lowRes.physicalId}.${images.lowRes.extension}`;
        } else {
            return `https://images-na.ssl-images-amazon.com/images/P/${product.asin}.01.LZZZZZZZ.jpg`;
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
        // Step 1: Load existing data (if any)
        console.log('[1/6] Checking for existing library data...');
        progressUI.updatePhase('Checking Library Data', 'Select existing library file or cancel to fetch all books');
        console.log('');
        console.log('   📂 A file picker dialog will open...');
        console.log('');
        console.log('   • If you have amazon-library.json: SELECT IT');
        console.log('   • If this is your first run: CLICK CANCEL');
        console.log('');
        console.log('   (Dialog may be hidden behind other windows - check taskbar!)\n');

        let existingBooks = [];
        let mostRecentDate = null;

        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.accept = '.json';

        const file = await new Promise((resolve) => {
            fileInput.onchange = (e) => {
                resolve(e.target.files[0]);
            };
            fileInput.oncancel = () => resolve(null);
            fileInput.click();
        });

        if (file) {
            const fileText = await file.text();
            const parsedData = JSON.parse(fileText);

            // Only support schema v3.0.0+ (object with metadata)
            if (parsedData.metadata && parsedData.books) {
                existingBooks = parsedData.books;
                console.log(`   📋 Loaded schema ${parsedData.metadata.schemaVersion} (${existingBooks.length} books)`);
            } else {
                console.error('   ❌ Unsupported JSON format');
                console.error('   Expected: {metadata, books} (schema v3.0.0+)');
                console.error('   Received:', Object.keys(parsedData));
                console.error('   Please use library-fetcher.js v3.3.0+ to generate a fresh library file');
                return;
            }

            // Find most recent acquisition date
            for (const book of existingBooks) {
                if (book.acquisitionDate) {
                    const bookDate = parseInt(book.acquisitionDate);
                    if (!mostRecentDate || bookDate > mostRecentDate) {
                        mostRecentDate = bookDate;
                    }
                }
            }

            console.log(`✅ Loaded ${existingBooks.length} existing books`);
            if (mostRecentDate) {
                const date = new Date(mostRecentDate);
                console.log(`   Most recent: ${date.toLocaleDateString()}`);
            }
        } else {
            console.log('📂 No existing file - will fetch ALL books');
        }
        console.log('');

        // Step 2: Find CSRF token
        console.log('[2/6] Getting CSRF token...');
        progressUI.updatePhase('Getting CSRF Token', 'Authenticating with Amazon API');
        const csrfMeta = document.querySelector('meta[name="anti-csrftoken-a2z"]');

        if (!csrfMeta) {
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
                    headers: {
                        'accept': 'application/json, text/plain, */*',
                        'content-type': 'application/json',
                        'anti-csrftoken-a2z': csrfToken,
                        'x-client-id': 'your-books'
                    },
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
                headers: {
                    'accept': 'application/json, text/plain, */*',
                    'content-type': 'application/json',
                    'anti-csrftoken-a2z': csrfToken,
                    'x-client-id': 'your-books'
                },
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
                    headers: {
                        'accept': 'application/json, text/plain, */*',
                        'content-type': 'application/json',
                        'anti-csrftoken-a2z': csrfToken,
                        'x-client-id': 'your-books'
                    },
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
            const testCoverUrl = extractCoverUrl(testProduct);
            const testImages = testProduct.images?.images?.[0];
            if (testImages?.hiRes?.physicalId) {
                extractionResults.push(`✅ Cover: hiRes`);
            } else if (testImages?.lowRes?.physicalId) {
                extractionResults.push(`✅ Cover: lowRes`);
            } else {
                extractionResults.push(`⚠️  Cover: fallback URL (no image data)`);
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

        // Step 3: Fetch new books (Pass 1)
        stats.timing.pass1Start = Date.now();
        console.log('[3/6] Fetching new books from library...');
        progressUI.updatePhase('Fetching Titles', 'Retrieving books from your library');
        console.log('   Will stop when we reach existing books\n');

        const newBooks = [];
        const seenASINs = new Map();  // Track ASINs to detect duplicates
        let cursor = "";
        let pageNum = 0;
        let hasMore = true;
        let foundOverlap = false;
        
        while (hasMore && !foundOverlap) {
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
                        headers: {
                            'accept': 'application/json, text/plain, */*',
                            'content-type': 'application/json',
                            'anti-csrftoken-a2z': csrfToken,
                            'x-client-id': 'your-books'
                        },
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
                
                const books = library.edges;
                
                // Process each book and check for overlap
                for (const edge of books) {
                    const node = edge.node;
                    const product = node.product;
                    
                    if (!product) continue;
                    
                    // Use relationshipCreationDate (always present in the node)
                    const acquisitionDate = node.relationshipCreationDate || null;
                    
                    // Check if this book already exists (by ASIN and date)
                    if (mostRecentDate && acquisitionDate) {
                        const bookDate = parseInt(acquisitionDate);
                        if (bookDate <= mostRecentDate) {
                            // Found overlap - stop fetching
                            console.log(`   🔍 Found overlap at ASIN ${product.asin}`);
                            foundOverlap = true;
                            break;
                        }
                    }
                    
                    // Extract book data - using shared functions
                    const title = product.title?.displayString || 'Unknown Title';
                    const authors = extractAuthors(product);
                    const coverUrl = extractCoverUrl(product);

                    const rating = product.customerReviewsSummary?.rating?.value || null;
                    const reviewCount = product.customerReviewsSummary?.count?.displayString || null;

                    const seriesData = product.bookSeries?.singleBookView?.series;
                    const series = seriesData?.title || null;
                    const seriesPosition = seriesData?.position || null;

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

                    // Add book and track ASIN
                    seenASINs.set(product.asin, newBooks.length);
                    newBooks.push({
                        asin: product.asin,
                        title,
                        authors,
                        coverUrl,
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
        
        if (newBooks.length === 0) {
            console.log('✅ No new books to fetch!');
            console.log('   Your library is up to date.\n');

            // Still create a manifest showing current state
            const manifest = {
                schemaVersion: SCHEMA_VERSION,
                fetcherVersion: FETCHER_VERSION,
                lastFetched: new Date().toISOString(),
                totalBooks: existingBooks.length,
                newBooksAdded: 0,
                enrichmentComplete: true
            };

            const manifestBlob = new Blob([JSON.stringify(manifest, null, 2)], { type: 'application/json' });
            const manifestUrl = URL.createObjectURL(manifestBlob);
            const manifestLink = document.createElement('a');
            manifestLink.href = manifestUrl;
            manifestLink.download = MANIFEST_FILENAME;
            document.body.appendChild(manifestLink);
            manifestLink.click();
            document.body.removeChild(manifestLink);
            URL.revokeObjectURL(manifestUrl);

            console.log(`✅ Saved manifest file: ${MANIFEST_FILENAME}\n`);

            // Calculate phase durations
            stats.timing.pass1End = Date.now();
            const phase0Duration = stats.timing.phase0End - stats.timing.phase0Start;
            const pass1Duration = stats.timing.pass1End - stats.timing.pass1Start;
            const totalDuration = Date.now() - startTime;

            console.log('========================================');
            console.log('✅ VALIDATION COMPLETE!');
            console.log('========================================\n');

            console.log('⏱️  TIMING');
            console.log(`   Phase 0 (Validation):        ${formatTime(phase0Duration)}`);
            console.log(`   Pass 1 (Check for new):       ${formatTime(pass1Duration)}`);
            console.log(`   ${'─'.repeat(37)}`);
            console.log(`   Total time:                   ${formatTime(totalDuration)}\n`);

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

            if (stats.nonBooksFiltered.length > 0) {
                console.log('📊 ITEMS FILTERED');
                console.log(`   Non-books filtered:           ${stats.nonBooksFiltered.length}`);
                stats.nonBooksFiltered.slice(0, 3).forEach(item => {
                    console.log(`      • ${item.title.substring(0, 50)} (${item.binding})`);
                });
                if (stats.nonBooksFiltered.length > 3) {
                    console.log(`      • ... and ${stats.nonBooksFiltered.length - 3} more`);
                }
                console.log('');
            }

            console.log('💾 LIBRARY STATUS');
            console.log(`   ✅ Total books in library:    ${existingBooks.length}`);
            console.log(`   ✅ Manifest updated\n`);

            console.log('========================================');
            return;
        }
        
        stats.timing.pass1End = Date.now();
        console.log(`\n✅ Pass 1 complete: Found ${newBooks.length} new books\n`);

        // Step 4: Enrich new books (Pass 2)
        stats.timing.pass2Start = Date.now();
        console.log('[4/6] Enriching new books with descriptions & reviews...');
        progressUI.updatePhase('Enriching Data', `Fetching descriptions & reviews for ${newBooks.length} books`);

        const estimatedTime = Math.ceil((newBooks.length * ENRICH_DELAY_MS) / 1000 / 60);
        console.log(`   Estimated time: ~${estimatedTime} minutes\n`);

        let enrichedCount = 0;
        let errorCount = 0;
        const booksWithoutDescriptions = []; // Track books where description extraction failed

        for (let i = 0; i < newBooks.length; i++) {
            const book = newBooks[i];
            const percent = Math.round((i / newBooks.length) * 100);
            const progressBar = '█'.repeat(Math.floor(percent / 2)) + '░'.repeat(50 - Math.floor(percent / 2));

            console.log(`[${i + 1}/${newBooks.length}] [${progressBar}] ${percent}% - ${book.title.substring(0, 40)}...`);

            try {
                // Wrap fetch logic in retry function
                const result = await fetchWithRetry(async () => {
                    const query = `query enrichBook {
                        getProducts(input: [{asin: "${book.asin}"}]) {
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
                        }
                    }`;

                    const response = await fetch('https://www.amazon.com/kindle-reader-api', {
                        method: 'POST',
                        headers: {
                            'accept': 'application/json, text/plain, */*',
                            'content-type': 'application/json',
                            'anti-csrftoken-a2z': csrfToken,
                            'x-client-id': 'your-books'
                        },
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
                        const product = data?.data?.getProducts?.[0];

                        if (product) {
                            // PARTIAL ERROR: We got errors BUT also got data
                            // Log warning but continue with extraction
                            console.log(`   ⚠️  Partial error: ${errorMsg}`);
                            console.log(`   📦 But got product data - continuing...`);
                            console.log(`   🔍 Error path: ${data.errors[0]?.path?.join(' → ') || 'N/A'}`);

                            // Log raw error details for debugging future issues
                            console.log(`   📄 Raw error details:`, JSON.stringify(data.errors, null, 2));

                            // Track this partial error for statistics
                            stats.partialErrorBooks.push({
                                position: i + 1,
                                title: book.title,
                                asin: book.asin,
                                errorMessage: errorMsg,
                                errorPath: data.errors[0]?.path?.join(' → ') || 'N/A'
                            });

                            // Continue to extract from product data
                            return { product, partialError: true };
                        } else {
                            // TOTAL FAILURE: Errors and NO data
                            console.log(`   ❌ Total failure: ${errorMsg}`);
                            console.log(`   📄 Raw response dump:`, JSON.stringify(data, null, 2));
                            return { apiError: true, errorMessage: errorMsg };
                        }
                    }

                    const product = data?.data?.getProducts?.[0];

                    if (!product) {
                        console.log(`   ⚠️  No product data in response`);
                        console.log(`   📄 Raw response dump:`, JSON.stringify(data, null, 2));
                        return { noData: true };
                    }

                    // Success - return product
                    return { product };
                }, book.title);

                // Extract product from successful result
                const product = result.product;

                // Extract data - using shared functions
                let description = extractDescription(product);

                // Fallback to AI summary if no traditional description
                if (!description) {
                    description = extractAISummary(product);
                    if (description) {
                        stats.aiSummariesUsed.push({ title: book.title, asin: book.asin });
                        console.log(`   📝 Using AI summary (${description.length} chars)`);
                    }
                }

                const topReviews = extractReviews(product);

                // Track books without descriptions
                if (!description) {
                    booksWithoutDescriptions.push({
                        asin: book.asin,
                        title: book.title,
                        authors: book.authors
                    });

                    const descSection = product.description?.sections?.[0];
                    if (descSection) {
                        console.log(`   ⚠️  No description extracted. Structure: ${JSON.stringify(descSection).substring(0, 200)}...`);
                    }
                }

                // Update book
                newBooks[i].description = description;
                newBooks[i].topReviews = topReviews;

                // Update rating if fresher
                if (product.customerReviewsSummary?.rating?.value) {
                    newBooks[i].rating = product.customerReviewsSummary.rating.value;
                    newBooks[i].reviewCount = product.customerReviewsSummary.count?.displayString || null;
                }

                enrichedCount++;
                console.log(`   ✅ ${description.length} chars, ${topReviews.length} reviews`);

            } catch (error) {
                stats.apiErrorBooks.push({ title: book.title, asin: book.asin });
                console.log(`   ❌ Failed after ${MAX_RETRIES} retries: ${error.message}`);
                errorCount++;
            }

            if (i < newBooks.length - 1) {
                await new Promise(resolve => setTimeout(resolve, ENRICH_DELAY_MS));
            }
        }
        
        stats.timing.pass2End = Date.now();
        console.log(`\n✅ Pass 2 complete: Enriched ${enrichedCount}/${newBooks.length} books`);
        if (errorCount > 0) {
            console.log(`   ⚠️  ${errorCount} errors (books will have basic info only)\n`);
        }
        console.log('');
        
        // Step 5: Merge and save library
        stats.timing.mergeStart = Date.now();
        console.log('[5/6] Merging with existing data and saving library...');
        progressUI.updatePhase('Saving Library', 'Merging and downloading library file');

        // Prepend new books (most recent first)
        const finalBooks = [...newBooks, ...existingBooks];

        // Create output with metadata (Schema v3.0.0)
        const outputData = {
            metadata: {
                schemaVersion: SCHEMA_VERSION,
                fetcherVersion: FETCHER_VERSION,
                fetchDate: new Date().toISOString(),
                totalBooks: finalBooks.length,
                booksWithoutDescriptions: booksWithoutDescriptions.length,
                booksWithoutDescriptionsDetails: booksWithoutDescriptions
            },
            books: finalBooks
        };

        const jsonData = JSON.stringify(outputData, null, 2);

        const blob = new Blob([jsonData], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = LIBRARY_FILENAME;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        console.log(`✅ Saved library file: ${LIBRARY_FILENAME}`);

        // Step 6: Create and save manifest
        console.log('[6/6] Creating manifest file...');
        progressUI.updatePhase('Creating Manifest', 'Generating metadata file');

        const manifest = {
            schemaVersion: SCHEMA_VERSION,
            fetcherVersion: FETCHER_VERSION,
            lastFetched: new Date().toISOString(),
            totalBooks: finalBooks.length,
            newBooksAdded: newBooks.length,
            enrichmentComplete: errorCount === 0,
            enrichmentStats: {
                enriched: enrichedCount,
                failed: errorCount,
                total: newBooks.length
            }
        };
        
        const manifestBlob = new Blob([JSON.stringify(manifest, null, 2)], { type: 'application/json' });
        const manifestUrl = URL.createObjectURL(manifestBlob);
        const manifestLink = document.createElement('a');
        manifestLink.href = manifestUrl;
        manifestLink.download = MANIFEST_FILENAME;
        document.body.appendChild(manifestLink);
        manifestLink.click();
        document.body.removeChild(manifestLink);
        URL.revokeObjectURL(manifestUrl);

        console.log(`✅ Saved manifest file: ${MANIFEST_FILENAME}`);

        // Calculate phase durations
        const phase0Duration = stats.timing.phase0End - stats.timing.phase0Start;
        const pass1Duration = stats.timing.pass1End - stats.timing.pass1Start;
        const pass2Duration = stats.timing.pass2End - stats.timing.pass2Start;
        const mergeDuration = stats.timing.mergeEnd - stats.timing.mergeStart;
        const manifestDuration = stats.timing.manifestEnd - stats.timing.manifestStart;
        const totalDuration = Date.now() - startTime;

        console.log('\n========================================');
        console.log('✅ LIBRARY FETCH COMPLETE!');
        console.log('========================================\n');

        console.log('⏱️  TIMING');
        console.log(`   Phase 0 (Validation):        ${formatTime(phase0Duration)}`);
        console.log(`   Pass 1 (Fetch titles):        ${formatTime(pass1Duration)}`);
        console.log(`   Pass 2 (Enrich):              ${formatTime(pass2Duration)}`);
        console.log(`   Pass 3 (Merge & save):        ${formatTime(mergeDuration)}`);
        console.log(`   Pass 4 (Manifest):            ${formatTime(manifestDuration)}`);
        console.log(`   ${'─'.repeat(37)}`);
        console.log(`   Total time:                   ${formatTime(totalDuration)}\n`);

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
            console.log(`   Books with partial errors:    ${stats.partialErrorBooks.length}`);
            stats.partialErrorBooks.forEach(item => {
                console.log(`      • [${item.position}] ${item.title.substring(0, 50)}`);
                console.log(`        ASIN: ${item.asin}`);
                console.log(`        Error: ${item.errorMessage}`);
                console.log(`        Path: ${item.errorPath}`);
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

        console.log('💾 FILES SAVED');
        console.log(`   ✅ ${LIBRARY_FILENAME} (${finalBooks.length} books)`);
        console.log(`   ✅ ${MANIFEST_FILENAME}`);
        console.log('========================================\n');
        console.log('👉 Next steps:');
        console.log('   1. Find both files in your browser\'s save location');
        console.log('   2. Place them in same folder as organizer HTML');
        console.log('   3. Organizer will auto-detect manifest and show status');
        console.log('   4. Click status indicator to sync if needed\n');
        console.log('💡 Next time you run this script:');
        console.log('   - Select amazon-library.json when prompted');
        console.log('   - Only NEW books will be fetched & enriched');
        console.log('   - Both files will be updated automatically');
        console.log('   - Organizer will detect the update via manifest');
        console.log('========================================\n');

        // Show completion UI
        progressUI.showComplete(`Downloaded ${finalBooks.length} books to ${LIBRARY_FILENAME}`);

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