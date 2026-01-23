// Amazon Wishlist Fetcher (Schema v2.0)
// Adds books to wishlist from Amazon product pages or series pages via DOM scraping
//
// Auto-detects page type:
// - Product page: Adds single book
// - Series page: Adds all unowned books in series (skips books you already own)
//
// Flow:
// 1. Detect page type (product vs series)
// 2. Scrape book metadata from page DOM
// 3. Build book object(s) (onWishlist: true, ownershipType: 'wishlist', addedToWishlist: today)
// 4. Read existing amazon-library.json
// 5. Prepend book(s) to books.items (no duplicate check - App Loader handles)
// 6. Write file back
// 7. Show success toast
//
// Note: Description and reviews NOT available via DOM scraping.
// These fields can be enriched later via Library Fetcher Pass 3.
//
// Uses top.document/top.location to handle iframe context (e.g., ad clicks).
//
// Re-run: After pasting once, you can re-run with: addToWishlist()

async function addToWishlist() {
    'use strict';

    const FETCHER_VERSION = 'v1.4.0';
    const SCHEMA_VERSION = '2.1';
    const LIBRARY_FILENAME = 'amazon-library.json';

    // Use top-level document/window to handle iframe context (e.g., if user clicked an ad)
    const doc = top.document;
    const win = top.window;

    console.log('========================================');
    console.log(`Amazon Wishlist Importer ${FETCHER_VERSION}`);
    console.log('========================================\n');

    // ============================================================================
    // Progress UI (toast-style overlay with optional progress bar)
    // ============================================================================
    const progressUI = (() => {
        let overlay = null;

        function create() {
            overlay = doc.createElement('div');
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
                    📚 Wishlist Importer ${FETCHER_VERSION}
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

        function showComplete(message, autoCloseMs = 10000) {
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
                    ✅ Added to Wishlist!
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

        return { create, updatePhase, showProgressBar, updateProgress, remove, showComplete, showError };
    })();

    // Initialize progress UI
    progressUI.create();

    // ============================================================================
    // Shared Helper Functions
    // ============================================================================

    /**
     * Extract ASIN from a URL
     * Handles /gp/product/ASIN and /dp/ASIN patterns
     */
    function extractAsinFromUrl(url) {
        if (!url) return null;
        const gpMatch = url.match(/\/gp\/product\/([A-Z0-9]{10})/i);
        if (gpMatch) return gpMatch[1].toUpperCase();
        const dpMatch = url.match(/\/dp\/([A-Z0-9]{10})/i);
        if (dpMatch) return dpMatch[1].toUpperCase();
        return null;
    }

    /**
     * Parse review count from text like "8,391" or "(5,230)"
     */
    function parseReviewCount(text) {
        if (!text) return null;
        const numericString = text.replace(/[(),\s]/g, '').replace(/[^\d]/g, '');
        if (numericString) {
            return parseInt(numericString, 10);
        }
        return null;
    }

    /**
     * Wait for a condition to be true, with timeout
     */
    function waitFor(conditionFn, timeoutMs = 5000, pollMs = 100) {
        return new Promise((resolve) => {
            const startTime = Date.now();
            const check = () => {
                if (conditionFn()) {
                    resolve(true);
                } else if (Date.now() - startTime > timeoutMs) {
                    resolve(false); // Timeout - don't reject, just return false
                } else {
                    setTimeout(check, pollMs);
                }
            };
            check();
        });
    }

    /**
     * Get today's date in YYYY-MM-DD format
     */
    function getTodayDate() {
        return new Date().toISOString().split('T')[0];
    }

    // ============================================================================
    // Page Type Detection
    // ============================================================================

    /**
     * Detect if this is a series page (has series book cards)
     */
    function isSeriesPage() {
        return doc.querySelectorAll('.series-childAsin-item').length > 0;
    }

    /**
     * Detect if this is a product page (has product title)
     */
    function isProductPage() {
        return doc.querySelector('#productTitle') !== null;
    }

    // ============================================================================
    // Product Page Scraping (Single Book)
    // ============================================================================

    function scrapeProductPage() {
        // Extract ASIN from DOM or URL
        let asin = null;
        const reviewsElement = doc.querySelector('#averageCustomerReviews[data-asin]');
        if (reviewsElement) {
            const domAsin = reviewsElement.getAttribute('data-asin');
            if (domAsin && domAsin.length === 10) {
                asin = domAsin.toUpperCase();
            }
        }
        if (!asin) {
            asin = extractAsinFromUrl(win.location.href);
        }
        if (!asin) {
            throw new Error('Could not find ASIN. Please navigate to a book product page.');
        }

        // Extract title
        const titleElement = doc.querySelector('#productTitle');
        const title = titleElement ? titleElement.textContent.trim() : null;
        if (!title) {
            throw new Error('Could not find book title on page. Is this a product page?');
        }

        // Extract author
        const authorElement = doc.querySelector('#bylineInfo .author a');
        const author = authorElement ? authorElement.textContent.trim() : 'Unknown Author';

        // Extract cover URL
        const imgElement = doc.querySelector('#landingImage[src]');
        const coverUrl = imgElement ? imgElement.getAttribute('src') : null;

        // Extract rating
        let rating = null;
        const ratingElement = doc.querySelector('#acrPopover[title]');
        if (ratingElement) {
            const titleText = ratingElement.getAttribute('title');
            const match = titleText.match(/^([\d.]+)\s+out\s+of/i);
            if (match) {
                rating = parseFloat(match[1]);
            }
        }

        // Extract review count
        const reviewCountElement = doc.querySelector('#acrCustomerReviewText');
        const reviewCount = reviewCountElement ? parseReviewCount(reviewCountElement.textContent) : null;

        // Extract series info
        let series = null;
        let seriesPosition = null;
        const seriesElement = doc.querySelector('#seriesBulletWidget_feature_div a');
        if (seriesElement) {
            const text = seriesElement.textContent.trim();
            const match = text.match(/Book\s+(\d+)\s+of\s+\d+:\s*(.+)/i);
            if (match) {
                series = match[2].trim();
                seriesPosition = parseInt(match[1], 10);
            }
        }

        // Extract description (try multiple selectors)
        let description = null;
        const descEl = doc.querySelector('#bookDescription_feature_div .a-expander-content') ||
                       doc.querySelector('#bookDescription_feature_div span:not(.a-expander-prompt)') ||
                       doc.querySelector('#productDescription p');
        if (descEl) {
            description = descEl.textContent.trim();
        }

        // Extract price (try multiple selectors)
        let currentPrice = null;
        const priceEl = doc.querySelector('#kindle-price') ||
                        doc.querySelector('.ebook-price-value') ||  // Kindle price in newer product pages
                        doc.querySelector('.kindle-price .a-color-price') ||
                        doc.querySelector('#price') ||
                        doc.querySelector('.a-price .a-offscreen') ||
                        doc.querySelector('#tmmSwatches .a-color-price') ||
                        doc.querySelector('.swatchElement.selected .a-color-price') ||
                        doc.querySelector('.aok-offscreen');
        if (priceEl) {
            currentPrice = priceEl.textContent.trim();
            // Ensure price starts with $
            if (currentPrice && !currentPrice.startsWith('$')) {
                currentPrice = '$' + currentPrice;
            }
        }
        // Debug: log what we found
        console.log(`   Price found: ${currentPrice || 'NONE'}`);
        console.log(`   Description found: ${description ? 'YES (' + description.substring(0, 50) + '...)' : 'NONE'}`);

        return {
            asin,
            onWishlist: true,
            ownershipType: 'wishlist',
            addedToWishlist: getTodayDate(),
            title,
            authors: author,
            coverUrl,
            rating,
            reviewCount,
            series,
            seriesPosition,
            description,
            // Include price fields if price was found
            ...(currentPrice && { currentPrice, priceAsOf: getTodayDate() })
        };
    }

    // ============================================================================
    // Series Page Scraping (Multiple Books)
    // ============================================================================

    /**
     * Extract book data from a series-childAsin-item element
     */
    function extractBookFromSeriesCard(cardElement, seriesName) {
        // Get ASIN from the image link
        const imageLink = cardElement.querySelector('.itemImageLink');
        const asin = imageLink ? extractAsinFromUrl(imageLink.getAttribute('href')) : null;
        if (!asin) return null;

        // Get title
        const titleElement = cardElement.querySelector('.itemBookTitle h3');
        const title = titleElement ? titleElement.textContent.trim() : null;
        if (!title) return null;

        // Get author - look for the contributor link
        const authorElement = cardElement.querySelector('.series-childAsin-item-details-contributor');
        let author = 'Unknown Author';
        if (authorElement) {
            author = authorElement.textContent.trim().replace(/\s*\(Author\)\s*$/, '').trim();
        }

        // Get cover URL
        const coverElement = cardElement.querySelector('.asinImage');
        const coverUrl = coverElement ? coverElement.getAttribute('src') : null;

        // Get rating - look for the star rating text
        let rating = null;
        const ratingContainer = cardElement.querySelector('.a-icon-star-small');
        if (ratingContainer) {
            const altText = ratingContainer.querySelector('.a-icon-alt');
            if (altText) {
                const match = altText.textContent.match(/^([\d.]+)\s+out\s+of/i);
                if (match) rating = parseFloat(match[1]);
            }
        }
        // Fallback: look for rating in nearby span
        if (!rating) {
            const ratingSpan = cardElement.querySelector('a[href*="/product-reviews/"]')?.previousElementSibling;
            if (ratingSpan && ratingSpan.classList.contains('a-size-base')) {
                const ratingText = ratingSpan.textContent.trim();
                const ratingMatch = ratingText.match(/^[\d.]+$/);
                if (ratingMatch) rating = parseFloat(ratingMatch[0]);
            }
        }

        // Get review count
        const reviewCountElement = cardElement.querySelector('span[aria-label*="ratings"]');
        const reviewCount = reviewCountElement ? parseReviewCount(reviewCountElement.textContent) : null;

        // Get series position from the position label
        let seriesPosition = null;
        const positionElement = cardElement.querySelector('.itemPositionLabel');
        if (positionElement) {
            const posText = positionElement.textContent.trim();
            const posMatch = posText.match(/^\d+$/);
            if (posMatch) seriesPosition = parseInt(posMatch[0], 10);
        }

        return {
            asin,
            // v1.3.0.a - onWishlist replaces isOwned
            onWishlist: true,
            ownershipType: 'wishlist',
            addedToWishlist: getTodayDate(),
            title,
            authors: author,
            coverUrl,
            rating,
            reviewCount,
            series: seriesName,
            seriesPosition
        };
    }

    async function scrapeSeriesPage() {
        // Get series name
        const ogTitle = doc.querySelector('meta[property="og:title"]');
        const seriesName = ogTitle ? ogTitle.getAttribute('content') : 'Unknown Series';

        // Get total book count from pagination element
        const paginationElement = doc.querySelector('#seriesAsinListPagination');
        const totalBooks = paginationElement ?
            parseInt(paginationElement.getAttribute('data-number_of_items') || '0', 10) :
            doc.querySelectorAll('.series-childAsin-item').length;
        const pageSize = paginationElement ?
            parseInt(paginationElement.getAttribute('data-page_size') || '20', 10) :
            20;

        let initialCards = doc.querySelectorAll('.series-childAsin-item');
        console.log(`   Series: "${seriesName}"`);
        console.log(`   Total books in series: ${totalBooks}`);
        console.log(`   Currently loaded: ${initialCards.length}\n`);

        // Load all books if pagination exists
        if (initialCards.length < totalBooks && totalBooks > pageSize) {
            progressUI.updatePhase('Loading All Books', 'Clicking "Show All"...');
            console.log('[Loading] Clicking "Show All" to load remaining books...');

            const showAllLink = doc.querySelector('#seriesAsinListShowAll a, #seriesAsinListShowAll_textSection a');
            if (showAllLink) {
                showAllLink.click();

                const initialCount = initialCards.length;
                const loaded = await waitFor(() => {
                    return doc.querySelectorAll('.series-childAsin-item').length > initialCount;
                }, 10000, 500);

                if (loaded) {
                    const newCount = doc.querySelectorAll('.series-childAsin-item').length;
                    console.log(`   ✅ Loaded ${newCount} books (was ${initialCount})\n`);
                } else {
                    console.log('   ⚠️  "Show All" may not have loaded more books\n');
                }
            }
        }

        // Scrape all book cards
        progressUI.showProgressBar();
        const allCards = doc.querySelectorAll('.series-childAsin-item');
        const wishlistBooks = [];
        let skippedOwned = 0;
        let skippedErrors = 0;

        for (let i = 0; i < allCards.length; i++) {
            const card = allCards[i];
            progressUI.updateProgress(i + 1, allCards.length);

            // Skip owned books (have hasOwnership class)
            if (card.classList.contains('hasOwnership')) {
                skippedOwned++;
                continue;
            }

            // Extract book data
            const book = extractBookFromSeriesCard(card, seriesName);
            if (book) {
                wishlistBooks.push(book);
            } else {
                skippedErrors++;
            }
        }

        console.log(`   ✅ Imported ${wishlistBooks.length} wishlist books`);
        console.log(`   ℹ️  Skipped ${skippedOwned} owned books`);
        if (skippedErrors > 0) {
            console.log(`   ⚠️  Failed to import ${skippedErrors} books`);
        }

        // Sort by series position descending so when we unshift, position 1 ends up first
        wishlistBooks.sort((a, b) => (b.seriesPosition || 0) - (a.seriesPosition || 0));

        return {
            books: wishlistBooks,
            seriesName,
            skippedOwned,
            skippedErrors
        };
    }

    // ============================================================================
    // File I/O (Shared)
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

        if (fileHandle) {
            const writable = await fileHandle.createWritable();
            await writable.write(jsonData);
            await writable.close();
            console.log('   ✅ Updated library file in place\n');
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
        // Step 1: Detect page type
        progressUI.updatePhase('Detecting Page Type', 'Analyzing page...');
        console.log('[1] Detecting page type...');

        const isSeries = isSeriesPage();
        const isProduct = isProductPage();

        if (isSeries) {
            console.log('   ✅ Detected: Series page\n');
            progressUI.updatePhase('Series Page Detected', 'Scraping series books...');

            // Scrape series
            console.log('[2] Scraping series page...');
            const { books, seriesName, skippedOwned, skippedErrors } = await scrapeSeriesPage();

            if (books.length === 0) {
                progressUI.showComplete(
                    `No new books to add.<br>You already own all ${skippedOwned} books in <strong>${seriesName}</strong>!`,
                    15000
                );
                new Image().src = 'https://readerwrangler.goatcounter.com/count?p=/event/wishlist-fetcher-completed';
                console.log('========================================');
                console.log('✅ NO BOOKS TO ADD');
                console.log(`   You already own all ${skippedOwned} books in "${seriesName}"`);
                console.log('========================================\n');
                return;
            }

            // Load library file
            console.log('[3] Loading library file...');
            const { existingData, fileHandle, hasFileSystemAccess } = await loadLibraryFile();

            // Add books to library
            progressUI.updatePhase('Adding to Wishlist', `Adding ${books.length} books...`);
            console.log(`[4] Adding ${books.length} books to library...`);

            for (const book of books) {
                existingData.books.items.unshift(book);
                new Image().src = 'https://readerwrangler.goatcounter.com/count?p=/event/wishlist-item-added';
            }
            console.log(`   ✅ Added ${books.length} books\n`);

            // Save library file
            console.log('[5] Saving library file...');
            await saveLibraryFile(existingData, fileHandle, hasFileSystemAccess);

            // Success!
            console.log('========================================');
            console.log('✅ SERIES WISHLIST ADD COMPLETE!');
            console.log('========================================');
            console.log(`   Series: "${seriesName}"`);
            console.log(`   Added: ${books.length} books`);
            console.log(`   Skipped (owned): ${skippedOwned} books`);
            console.log(`   Total books in library: ${existingData.books.items.length}`);
            console.log('========================================\n');

            progressUI.showComplete(
                `<strong>${seriesName}</strong><br>` +
                `Added ${books.length} books to wishlist<br>` +
                `<span style="color: #888; font-size: 12px;">Skipped ${skippedOwned} owned books</span>`,
                15000
            );
            new Image().src = 'https://readerwrangler.goatcounter.com/count?p=/event/wishlist-fetcher-completed';

        } else if (isProduct) {
            console.log('   ✅ Detected: Product page\n');
            progressUI.updatePhase('Product Page Detected', 'Scraping book info...');

            // Scrape product
            console.log('[2] Scraping product page...');
            const book = scrapeProductPage();

            console.log(`   ✅ Found: "${book.title}"`);
            console.log(`   Author: ${book.authors}`);
            console.log(`   ASIN: ${book.asin}\n`);

            // Load library file
            console.log('[3] Loading library file...');
            const { existingData, fileHandle, hasFileSystemAccess } = await loadLibraryFile();

            // Add book to library
            progressUI.updatePhase('Adding to Wishlist', 'Updating library...');
            console.log('[4] Adding book to library...');

            existingData.books.items.unshift(book);
            new Image().src = 'https://readerwrangler.goatcounter.com/count?p=/event/wishlist-item-added';
            console.log(`   ✅ Added "${book.title}"\n`);

            // Save library file
            console.log('[5] Saving library file...');
            await saveLibraryFile(existingData, fileHandle, hasFileSystemAccess);

            // Success!
            console.log('========================================');
            console.log('✅ WISHLIST ADD COMPLETE!');
            console.log('========================================');
            console.log(`   Added: "${book.title}"`);
            console.log(`   By: ${book.authors}`);
            console.log(`   Total books in library: ${existingData.books.items.length}`);
            console.log('========================================\n');

            progressUI.showComplete(`<strong>${book.title}</strong><br>by ${book.authors}`);
            new Image().src = 'https://readerwrangler.goatcounter.com/count?p=/event/wishlist-fetcher-completed';

        } else {
            throw new Error('Could not detect page type. Please navigate to a book product page or series page.');
        }

    } catch (error) {
        console.error('\n========================================');
        console.error('❌ ERROR');
        console.error('========================================');
        console.error(error.message);
        console.error('========================================\n');

        progressUI.showError(error.message);
    }
}

// Auto-run on first paste
addToWishlist();
