// Series Page Fetcher (Schema v2.1)
// Bulk imports all books from an Amazon series page as wishlist entries
//
// Uses Amazon's seriesAsinList API to fetch all books in a single request
// Includes gap detection to identify missing books in series numbering
//
// Flow:
// 1. Extract series ASIN from current page
// 2. Fetch all books via API (pageSize=200)
// 3. Parse HTML response to extract book data
// 4. Detect gaps in series numbering
// 5. Read existing amazon-library.json
// 6. Add new books (skip owned, skip duplicates)
// 7. Write file back
// 8. Show summary with gap report
//
// Re-run: After pasting once, you can re-run with: importSeries()

async function importSeries() {
    'use strict';

    const FETCHER_VERSION = 'v1.2.0-alpha.1';
    const SCHEMA_VERSION = '2.1';
    const LIBRARY_FILENAME = 'amazon-library.json';

    // Use top-level document/window to handle iframe context
    const doc = top.document;
    const win = top.window;

    console.log('========================================');
    console.log(`Series Page Fetcher ${FETCHER_VERSION}`);
    console.log('========================================\n');

    // ============================================================================
    // Progress UI (toast-style overlay)
    // ============================================================================
    const progressUI = (() => {
        let overlay = null;

        function create() {
            overlay = doc.createElement('div');
            overlay.id = 'series-fetcher-progress';
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
                min-width: 320px;
                max-width: 420px;
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
                " onmouseover="this.style.color='#333'" onmouseout="this.style.color='#999'" onclick="this.parentElement.remove()">✕</button>
                <div style="font-size: 18px; font-weight: bold; color: #333; margin-bottom: 10px;">
                    📚 Series Importer ${FETCHER_VERSION}
                </div>
                <div id="progressPhase" style="font-size: 14px; color: #667eea; margin-bottom: 8px; font-weight: 500;">
                    Starting...
                </div>
                <div id="progressDetail" style="font-size: 13px; color: #666; margin-bottom: 10px;">
                    Initializing
                </div>
                <div id="progressBarContainer" style="
                    background: #e0e0e0;
                    border-radius: 4px;
                    height: 8px;
                    overflow: hidden;
                    display: none;
                ">
                    <div id="progressBar" style="
                        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                        height: 100%;
                        width: 0%;
                        transition: width 0.3s ease;
                    "></div>
                </div>
            `;

            doc.body.appendChild(overlay);
        }

        function updatePhase(phase, detail = '') {
            if (!overlay) create();
            const phaseElement = overlay.querySelector('#progressPhase');
            const detailElement = overlay.querySelector('#progressDetail');
            if (phaseElement) phaseElement.textContent = phase;
            if (detailElement) detailElement.textContent = detail;
        }

        function showProgressBar() {
            if (!overlay) create();
            const container = overlay.querySelector('#progressBarContainer');
            if (container) container.style.display = 'block';
        }

        function updateProgress(current, total) {
            if (!overlay) return;
            const bar = overlay.querySelector('#progressBar');
            if (bar) {
                const percent = Math.round((current / total) * 100);
                bar.style.width = `${percent}%`;
            }
        }

        function remove() {
            if (overlay && overlay.parentElement) {
                overlay.style.transition = 'opacity 0.3s';
                overlay.style.opacity = '0';
                setTimeout(() => overlay.remove(), 300);
            }
        }

        function showComplete(message, autoCloseMs = 15000) {
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
                <div style="font-size: 18px; font-weight: bold; color: #2e7d32; margin-bottom: 10px;">
                    ✅ Series Import Complete!
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
            setTimeout(remove, autoCloseMs);
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

        // Show save button and return Promise that resolves with 'save' or 'cancel'.
        // WHY THIS EXISTS: createWritable() requires an active "user gesture" (click/keypress).
        // After fetching, the original gesture from file selection has expired.
        // This button provides a fresh user gesture immediately before calling createWritable.
        function showSaveButton(bookCount) {
            return new Promise((resolve) => {
                if (!overlay) create();
                overlay.innerHTML = `
                    <div style="font-size: 18px; font-weight: bold; color: #2e7d32; margin-bottom: 10px;">
                        ✅ Fetch Complete!
                    </div>
                    <div style="font-size: 14px; color: #666; margin-bottom: 15px;">
                        ${bookCount.toLocaleString()} books ready to save
                    </div>
                    <button id="saveLibraryBtn" style="
                        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                        color: white;
                        border: none;
                        padding: 12px 20px;
                        border-radius: 8px;
                        font-size: 16px;
                        font-weight: bold;
                        cursor: pointer;
                        width: 100%;
                        transition: transform 0.1s;
                    ">
                        💾 Save Library File
                    </button>
                    <div style="font-size: 12px; color: #999; margin-top: 10px; text-align: center;">
                        Click to save updated library
                    </div>
                    <button id="cancelSaveBtn" title="Discard downloaded data" style="
                        background: transparent;
                        color: #999;
                        border: 1px solid #ccc;
                        padding: 6px 16px;
                        border-radius: 4px;
                        font-size: 12px;
                        cursor: pointer;
                        margin-top: 15px;
                    ">
                        Cancel
                    </button>
                `;
                const saveBtn = overlay.querySelector('#saveLibraryBtn');
                saveBtn.onmouseover = () => saveBtn.style.transform = 'scale(1.02)';
                saveBtn.onmouseout = () => saveBtn.style.transform = 'scale(1)';
                saveBtn.onclick = () => {
                    resolve('save');
                };
                const cancelBtn = overlay.querySelector('#cancelSaveBtn');
                cancelBtn.onmouseover = () => { cancelBtn.style.borderColor = '#999'; cancelBtn.style.color = '#666'; };
                cancelBtn.onmouseout = () => { cancelBtn.style.borderColor = '#ccc'; cancelBtn.style.color = '#999'; };
                cancelBtn.onclick = () => {
                    resolve('cancel');
                };
            });
        }

        return { create, updatePhase, showProgressBar, updateProgress, remove, showComplete, showError, showSaveButton };
    })();

    // Initialize progress UI
    progressUI.create();

    // ============================================================================
    // Helper Functions
    // ============================================================================

    function getTodayDate() {
        return new Date().toISOString().split('T')[0];
    }

    function extractAsinFromUrl(url) {
        if (!url) return null;
        const gpMatch = url.match(/\/gp\/product\/([A-Z0-9]{10})/i);
        if (gpMatch) return gpMatch[1].toUpperCase();
        const dpMatch = url.match(/\/dp\/([A-Z0-9]{10})/i);
        if (dpMatch) return dpMatch[1].toUpperCase();
        return null;
    }

    // ============================================================================
    // Series Detection & API Fetch
    // ============================================================================

    function getSeriesAsin() {
        // Try to get from URL first
        const urlAsin = extractAsinFromUrl(win.location.href);
        if (urlAsin) return urlAsin;

        // Try to find from page elements
        const paginationEl = doc.querySelector('#seriesAsinListPagination[data-asin]');
        if (paginationEl) {
            return paginationEl.getAttribute('data-asin');
        }

        return null;
    }

    function getSeriesName() {
        // Try og:title meta tag
        const ogTitle = doc.querySelector('meta[property="og:title"]');
        if (ogTitle) {
            return ogTitle.getAttribute('content') || 'Unknown Series';
        }

        // Try page title
        const title = doc.querySelector('title');
        if (title) {
            return title.textContent.replace(/ - Amazon\.com.*$/, '').trim() || 'Unknown Series';
        }

        return 'Unknown Series';
    }

    async function fetchSeriesBooks(seriesAsin) {
        const url = `https://www.amazon.com/kindle-dbs/productPage/ajax/seriesAsinList?asin=${seriesAsin}&pageNumber=1&pageSize=200&binding=kindle_edition`;

        console.log(`[API] Fetching series books from: ${url}`);

        const response = await fetch(url, {
            headers: {
                'accept': 'text/html,*/*',
                'x-requested-with': 'XMLHttpRequest'
            }
        });

        if (!response.ok) {
            throw new Error(`API request failed: ${response.status} ${response.statusText}`);
        }

        return response.text();
    }

    // ============================================================================
    // HTML Parsing
    // ============================================================================

    function parseSeriesBooks(html, seriesName) {
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        const books = [];
        const skippedOwned = [];

        // Track data completeness
        const completeness = {
            total: 0,
            withPrice: 0,
            withDescription: 0,
            withRating: 0,
            withCover: 0
        };

        doc.querySelectorAll('.series-childAsin-item').forEach(item => {
            // Check if owned
            if (item.classList.contains('hasOwnership')) {
                const titleEl = item.querySelector('.itemBookTitle h3');
                skippedOwned.push(titleEl?.textContent?.trim() || 'Unknown');
                return;
            }

            // Extract ASIN from image link
            const imageLink = item.querySelector('a.itemImageLink');
            const asinMatch = imageLink?.getAttribute('href')?.match(/\/gp\/product\/([A-Z0-9]{10})/i) ||
                              imageLink?.getAttribute('href')?.match(/\/dp\/([A-Z0-9]{10})/i);
            const asin = asinMatch?.[1]?.toUpperCase();
            if (!asin) return;

            // Extract title
            const title = item.querySelector('.itemBookTitle h3')?.textContent?.trim() || '';
            if (!title) return;

            // Extract authors
            const authorEls = item.querySelectorAll('a.series-childAsin-item-details-contributor');
            const authors = [...authorEls]
                .map(a => a.textContent.replace(/\s*\(Author\)\s*,?\s*/g, '').trim())
                .filter(Boolean)
                .join(', ') || 'Unknown Author';

            // Extract cover URL
            const coverUrl = item.querySelector('img.asinImage')?.getAttribute('src') || null;

            // Extract rating
            let rating = null;
            const ratingAlt = item.querySelector('.a-icon-star-small .a-icon-alt');
            if (ratingAlt) {
                const match = ratingAlt.textContent.match(/^([\d.]+)\s+out\s+of/i);
                if (match) rating = parseFloat(match[1]);
            }
            // Fallback: look for rating number before review link
            if (!rating) {
                const ratingSpan = item.querySelector('.a-size-base');
                if (ratingSpan) {
                    const ratingMatch = ratingSpan.textContent.trim().match(/^[\d.]+$/);
                    if (ratingMatch) rating = parseFloat(ratingMatch[0]);
                }
            }

            // Extract review count
            let reviewCount = null;
            const reviewEl = item.querySelector('span[aria-label*="ratings"]');
            if (reviewEl) {
                const countStr = reviewEl.getAttribute('aria-label')?.replace(/[^\d]/g, '');
                if (countStr) reviewCount = parseInt(countStr, 10);
            }

            // Extract series position
            let seriesPosition = null;
            const posLabel = item.querySelector('.itemPositionLabel');
            if (posLabel) {
                const ariaLabel = posLabel.getAttribute('aria-label');
                if (ariaLabel) {
                    const posMatch = ariaLabel.match(/Book\s+(\d+)/i);
                    if (posMatch) seriesPosition = parseInt(posMatch[1], 10);
                } else {
                    const posText = posLabel.textContent.trim();
                    const posMatch = posText.match(/^\d+$/);
                    if (posMatch) seriesPosition = parseInt(posMatch[0], 10);
                }
            }

            // Extract Kindle price (try multiple selectors)
            let kindlePrice = null;
            // Try .ebook-price-value first (newer Amazon layout)
            const ebookPriceEl = item.querySelector('.ebook-price-value');
            if (ebookPriceEl) {
                kindlePrice = ebookPriceEl.textContent.trim();
            }
            // Try format twister
            if (!kindlePrice) {
                const priceEl = item.querySelector('.formatTwister a[href*="storeType=ebooks"]')
                    ?.closest('.formatTwister')?.querySelector('.a-text-bold');
                if (priceEl) {
                    kindlePrice = priceEl.textContent.trim();
                }
            }
            // Fallback: look for price in item details
            if (!kindlePrice) {
                const altPriceEl = item.querySelector('.a-price .a-offscreen') ||
                                   item.querySelector('.a-color-price') ||
                                   item.querySelector('[data-a-color="price"]');
                if (altPriceEl) {
                    kindlePrice = altPriceEl.textContent.trim();
                }
            }
            // Ensure price starts with $
            if (kindlePrice && !kindlePrice.startsWith('$')) {
                kindlePrice = '$' + kindlePrice;
            }

            // Extract description (optional)
            const description = item.querySelector('.collectionDescription span')?.textContent?.trim() || '';

            const book = {
                asin,
                onWishlist: true,
                ownershipType: 'wishlist',
                addedToWishlist: getTodayDate(),
                title,
                authors,
                coverUrl,
                rating,
                reviewCount,
                series: seriesName,
                seriesPosition,
                description,
                // Store price if available (for future price tracking)
                ...(kindlePrice && { currentPrice: kindlePrice, priceAsOf: getTodayDate() })
            };

            books.push(book);

            // Track completeness
            completeness.total++;
            if (kindlePrice) completeness.withPrice++;
            if (description) completeness.withDescription++;
            if (rating) completeness.withRating++;
            if (coverUrl) completeness.withCover++;
        });

        return { books, skippedOwned, completeness };
    }

    // ============================================================================
    // Gap Detection
    // ============================================================================

    function detectGaps(books) {
        const positions = books
            .map(b => b.seriesPosition)
            .filter(p => p !== null && p !== undefined)
            .sort((a, b) => a - b);

        if (positions.length === 0) {
            return { hasGaps: false, maxPosition: 0, foundCount: 0, missing: [] };
        }

        const maxPosition = Math.max(...positions);
        const missing = [];

        for (let i = 1; i <= maxPosition; i++) {
            if (!positions.includes(i)) {
                missing.push(i);
            }
        }

        return {
            hasGaps: missing.length > 0,
            maxPosition,
            foundCount: positions.length,
            missing
        };
    }

    function formatGapRanges(missing) {
        if (missing.length === 0) return '';

        const ranges = [];
        let start = missing[0];
        let end = missing[0];

        for (let i = 1; i <= missing.length; i++) {
            if (i < missing.length && missing[i] === end + 1) {
                end = missing[i];
            } else {
                if (start === end) {
                    ranges.push(`#${start}`);
                } else {
                    ranges.push(`#${start}-${end}`);
                }
                if (i < missing.length) {
                    start = missing[i];
                    end = missing[i];
                }
            }
        }

        return ranges.join(', ');
    }

    // ============================================================================
    // File I/O
    // ============================================================================

    async function loadLibraryFile() {
        progressUI.updatePhase('Loading Library', 'Select your amazon-library.json file...');
        console.log('[File] Loading existing library file...');
        console.log('   📂 Please select your amazon-library.json file\n');

        const hasFileSystemAccess = 'showOpenFilePicker' in win;

        let existingData = null;
        let fileHandle = null;

        if (hasFileSystemAccess) {
            try {
                const [handle] = await win.showOpenFilePicker({
                    types: [{ description: 'JSON files', accept: { 'application/json': ['.json'] } }]
                });
                fileHandle = handle;
                const file = await handle.getFile();
                const fileText = await file.text();
                existingData = JSON.parse(fileText);
            } catch (e) {
                if (e.name === 'AbortError') {
                    throw new Error('File selection cancelled. Please select your amazon-library.json file.');
                }
                throw e;
            }
        } else {
            console.log('   ⚠️  Note: Your browser doesn\'t support File System Access API');
            console.log('   File will be downloaded - you must manually replace the old file\n');

            const fileInput = doc.createElement('input');
            fileInput.type = 'file';
            fileInput.accept = '.json';

            const file = await new Promise((resolve, reject) => {
                fileInput.onchange = (e) => resolve(e.target.files[0]);
                fileInput.oncancel = () => reject(new Error('File selection cancelled'));
                fileInput.click();
            });

            const fileText = await file.text();
            existingData = JSON.parse(fileText);
        }

        // Validate file format
        if (existingData.isBackup === true) {
            throw new Error('This is a backup file. Please select amazon-library.json instead.');
        }

        if (!existingData.schemaVersion?.startsWith('2.')) {
            throw new Error(`Unsupported schema version: ${existingData.schemaVersion || 'unknown'}. Expected 2.x.`);
        }

        if (!existingData.books || !existingData.books.items) {
            throw new Error('Invalid library file - missing books.items');
        }

        console.log(`   ✅ Loaded library with ${existingData.books.items.length} books\n`);

        return { existingData, fileHandle, hasFileSystemAccess };
    }

    async function saveLibraryFile(existingData, fileHandle, hasFileSystemAccess) {
        progressUI.updatePhase('Saving', 'Writing updated library file...');
        console.log('[File] Saving updated library file...');

        const jsonData = JSON.stringify(existingData, null, 2);

        // Path 0: Relay upload (if configured — auto-initialized by relay-client.js)
        if (window.RWRelay && window.RWRelay.isConfigured()) {
            try {
                progressUI.updatePhase('Uploading', 'Compressing and encrypting...');
                const manifest = await window.RWRelay.upload(jsonData, (phase, detail) => {
                    progressUI.updatePhase('Uploading', detail);
                });
                console.log(`✅ Uploaded to relay (${manifest.bookCount} books, ${(manifest.compressedBytes / 1024).toFixed(0)} KB compressed)`);
                return; // Relay succeeded, skip file save
            } catch (relayError) {
                console.error('⚠️ Relay upload failed, falling back to file save:', relayError.message);
            }
        }

        // File save (fallback if relay not configured or failed)
        if (fileHandle) {
            // Show save button to get fresh user gesture before writing
            // Chrome requires an active "user gesture" for createWritable() - the original
            // gesture from file selection has expired after fetching data
            const userChoice = await progressUI.showSaveButton(existingData.books.items.length);
            if (userChoice === 'cancel') {
                console.error('   ❌ Save cancelled by user - data discarded');
                progressUI.showError('Cancelled - your downloaded data was discarded');
                return;
            }

            // Now we have a fresh user gesture from the button click
            try {
                const writable = await fileHandle.createWritable();
                await writable.write(jsonData);
                await writable.close();
                console.log('   ✅ Updated library file in place\n');
            } catch (e) {
                console.error('   ❌ Failed to save file:', e.message);
                progressUI.showError(`Failed to save: ${e.message}`);
                return;
            }
        } else {
            console.log('   ⚠️  IMPORTANT: Save this file as "amazon-library.json", replacing your existing file!\n');

            const blob = new Blob([jsonData], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = doc.createElement('a');
            a.href = url;
            a.download = LIBRARY_FILENAME;
            doc.body.appendChild(a);
            a.click();
            doc.body.removeChild(a);
            URL.revokeObjectURL(url);

            console.log(`   ✅ Downloaded updated library file\n`);
        }
    }

    // ============================================================================
    // Main Flow
    // ============================================================================

    try {
        // Step 1: Get series info
        progressUI.updatePhase('Detecting Series', 'Extracting series information...');
        console.log('[1] Detecting series...');

        const seriesAsin = getSeriesAsin();
        if (!seriesAsin) {
            throw new Error('Could not find series ASIN. Please navigate to a series page.');
        }

        const seriesName = getSeriesName();
        console.log(`   Series: "${seriesName}"`);
        console.log(`   ASIN: ${seriesAsin}\n`);

        // Step 2: Fetch all books via API
        progressUI.updatePhase('Fetching Series', 'Downloading book list from Amazon...');
        console.log('[2] Fetching series books via API...');

        const html = await fetchSeriesBooks(seriesAsin);
        const bookCount = (html.match(/series-childAsin-item/g) || []).length;
        console.log(`   ✅ Received ${bookCount} book entries\n`);

        // Step 3: Parse books
        progressUI.updatePhase('Parsing Books', 'Extracting book data...');
        console.log('[3] Parsing book data...');

        const { books, skippedOwned, completeness } = parseSeriesBooks(html, seriesName);
        console.log(`   ✅ Parsed ${books.length} wishlist candidates`);
        console.log(`   ℹ️  Skipped ${skippedOwned.length} owned books`);

        // Log data completeness
        if (completeness.total > 0) {
            const missingPrice = completeness.total - completeness.withPrice;
            const missingDesc = completeness.total - completeness.withDescription;
            const missingRating = completeness.total - completeness.withRating;

            if (missingPrice > 0 || missingDesc > 0) {
                console.log(`   ℹ️  Data completeness:`);
                console.log(`      - Price: ${completeness.withPrice}/${completeness.total} (${missingPrice} missing)`);
                console.log(`      - Description: ${completeness.withDescription}/${completeness.total} (${missingDesc} missing)`);
                console.log(`      - Rating: ${completeness.withRating}/${completeness.total} (${missingRating} missing)`);
                console.log(`      Note: Missing data can be filled by running Library Fetcher`);
            }
        }
        console.log('');

        // Step 4: Detect gaps
        progressUI.updatePhase('Analyzing Series', 'Checking for gaps...');
        console.log('[4] Detecting gaps in series numbering...');

        const gapInfo = detectGaps(books);
        if (gapInfo.hasGaps) {
            console.log(`   ⚠️  Gap detected!`);
            console.log(`   Expected: Books 1-${gapInfo.maxPosition}`);
            console.log(`   Found: ${gapInfo.foundCount} books`);
            console.log(`   Missing: ${formatGapRanges(gapInfo.missing)}`);
            console.log(`   (${gapInfo.missing.length} books not in Amazon's series metadata)\n`);
        } else {
            console.log(`   ✅ No gaps detected (${gapInfo.foundCount} books, max position: ${gapInfo.maxPosition})\n`);
        }

        // Step 5: Check if any books to add
        if (books.length === 0) {
            let message = `No new books to add.<br>`;
            if (skippedOwned.length > 0) {
                message += `You already own all ${skippedOwned.length} books in <strong>${seriesName}</strong>!`;
            } else {
                message += `No books found in <strong>${seriesName}</strong>.`;
            }
            progressUI.showComplete(message, 15000);
            console.log('========================================');
            console.log('✅ NO BOOKS TO ADD');
            console.log('========================================\n');
            return;
        }

        // Step 6: Load library file
        console.log('[5] Loading library file...');
        const { existingData, fileHandle, hasFileSystemAccess } = await loadLibraryFile();

        // Step 7: Check for duplicates and add books
        progressUI.updatePhase('Adding to Wishlist', `Processing ${books.length} books...`);
        progressUI.showProgressBar();
        console.log(`[6] Adding ${books.length} books to library...`);

        const existingAsins = new Set(existingData.books.items.map(b => b.asin));
        let addedCount = 0;
        let duplicateCount = 0;

        // Sort by series position descending so unshift puts them in order
        books.sort((a, b) => (b.seriesPosition || 0) - (a.seriesPosition || 0));

        for (let i = 0; i < books.length; i++) {
            const book = books[i];
            progressUI.updateProgress(i + 1, books.length);

            if (existingAsins.has(book.asin)) {
                duplicateCount++;
                continue;
            }

            existingData.books.items.unshift(book);
            existingAsins.add(book.asin);
            addedCount++;
        }

        console.log(`   ✅ Added ${addedCount} books`);
        if (duplicateCount > 0) {
            console.log(`   ℹ️  Skipped ${duplicateCount} duplicates (already in library)\n`);
        }

        // Step 8: Save library file
        console.log('[7] Saving library file...');
        await saveLibraryFile(existingData, fileHandle, hasFileSystemAccess);

        // Step 9: Show summary
        console.log('========================================');
        console.log('✅ SERIES IMPORT COMPLETE!');
        console.log('========================================');
        console.log(`   Series: "${seriesName}"`);
        console.log(`   Added: ${addedCount} books`);
        console.log(`   Skipped (owned): ${skippedOwned.length} books`);
        console.log(`   Skipped (duplicate): ${duplicateCount} books`);
        if (gapInfo.hasGaps) {
            console.log(`   ⚠️  Gap: ${gapInfo.missing.length} books missing from Amazon's series list`);
            console.log(`      Missing: ${formatGapRanges(gapInfo.missing)}`);
        }
        // Data completeness in final summary
        const missingPrice = completeness.total - completeness.withPrice;
        const missingDesc = completeness.total - completeness.withDescription;
        if (missingPrice > 0 || missingDesc > 0) {
            console.log(`   ℹ️  Data completeness:`);
            if (missingPrice > 0) console.log(`      - ${missingPrice} books missing price`);
            if (missingDesc > 0) console.log(`      - ${missingDesc} books missing description`);
            console.log(`      Run Library Fetcher to fill missing data`);
        }
        console.log(`   Total books in library: ${existingData.books.items.length}`);
        console.log('========================================\n');

        // Build summary message
        let summaryMessage = `<strong>${seriesName}</strong><br>`;
        summaryMessage += `Added ${addedCount} books to wishlist<br>`;

        const skips = [];
        if (skippedOwned.length > 0) skips.push(`${skippedOwned.length} owned`);
        if (duplicateCount > 0) skips.push(`${duplicateCount} already in wishlist`);
        if (skips.length > 0) {
            summaryMessage += `<span style="color: #888; font-size: 12px;">Skipped: ${skips.join(', ')}</span><br>`;
        }

        if (gapInfo.hasGaps) {
            summaryMessage += `<br><span style="color: #f57c00; font-size: 12px;">`;
            summaryMessage += `⚠️ ${gapInfo.missing.length} books missing from Amazon's series list<br>`;
            summaryMessage += `(${formatGapRanges(gapInfo.missing)})</span>`;
        }

        // Note about missing data if applicable
        const missingPriceCount = completeness.total - completeness.withPrice;
        if (missingPriceCount > 0) {
            summaryMessage += `<br><span style="color: #1976d2; font-size: 11px;">`;
            summaryMessage += `ℹ️ ${missingPriceCount} books missing price - run Library Fetcher to complete</span>`;
        }

        progressUI.showComplete(summaryMessage, 20000);

        // Analytics
        new Image().src = 'https://readerwrangler.goatcounter.com/count?p=/event/series-import-completed';

    } catch (error) {
        console.error('\n========================================');
        console.error('❌ ERROR');
        console.error('========================================');
        console.error(error.message);
        console.error(error.stack);
        console.error('========================================\n');

        progressUI.showError(error.message);
    }
}

// Auto-run on first paste
importSeries();
