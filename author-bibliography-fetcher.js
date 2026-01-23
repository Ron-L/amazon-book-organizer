// Author Bibliography Fetcher (Schema v2.1)
// Bulk imports all Kindle books from an Amazon author page as wishlist entries
//
// Extracts book data from the embedded JSON config on the author page.
// No API calls needed - all data is available in the initial page load.
//
// Flow:
// 1. User navigates to author page (e.g., amazon.com/stores/Author-Name/author/B001IGJOCA)
// 2. Extract embedded config JSON from page DOM
// 3. Filter for Kindle editions only
// 4. Map product data to library schema
// 5. Handle pagination if more books exist (call /juvec API)
// 6. Read existing amazon-library.json
// 7. Add new books (skip duplicates)
// 8. Write file back
//
// Re-run: After pasting once, you can re-run with: importBibliography()

async function importBibliography() {
    'use strict';

    const FETCHER_VERSION = 'v1.0.0.a';
    const SCHEMA_VERSION = '2.1';
    const LIBRARY_FILENAME = 'amazon-library.json';

    // Use top-level document/window to handle iframe context
    const doc = top.document;
    const win = top.window;

    console.log('========================================');
    console.log(`Author Bibliography Fetcher ${FETCHER_VERSION}`);
    console.log('========================================\n');

    // ============================================================================
    // Progress UI (toast-style overlay)
    // ============================================================================
    const progressUI = (() => {
        let overlay = null;

        function create() {
            overlay = doc.createElement('div');
            overlay.id = 'bibliography-fetcher-progress';
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
                    📚 Bibliography Importer ${FETCHER_VERSION}
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
                    ✅ Bibliography Import Complete!
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
    // Helper Functions
    // ============================================================================

    function getTodayDate() {
        return new Date().toISOString().split('T')[0];
    }

    // ============================================================================
    // Extract Embedded Config from Page
    // ============================================================================

    function extractAuthorConfig() {
        // Find script tags containing the author product grid config
        const scripts = doc.querySelectorAll('script');

        for (const script of scripts) {
            const text = script.textContent || '';

            // Look for the config object that contains ASINList and products
            if (text.includes('author-productgridallbooks') && text.includes('"ASINList"')) {
                // Extract the config object - it's assigned to a variable
                const configMatch = text.match(/var\s+config\s*=\s*(\{[\s\S]*?\});?\s*(?:var|const|let|function|\s*$)/);
                if (configMatch) {
                    try {
                        const config = JSON.parse(configMatch[1]);
                        return config;
                    } catch (e) {
                        console.log('   Failed to parse config from var assignment');
                    }
                }

                // Alternative: look for the widgetId pattern and extract config
                const widgetMatch = text.match(/"widgetId"\s*:\s*"author-productgridallbooks[^"]*"[\s\S]*?"content"\s*:\s*(\{[\s\S]*?\})\s*,\s*"(?:endpoint|sectionType)/);
                if (widgetMatch) {
                    try {
                        // This is partial, need the full config
                    } catch (e) {
                        // Continue searching
                    }
                }
            }
        }

        // Alternative approach: look for inline JSON in the page with specific markers
        const pageHtml = doc.documentElement.innerHTML;

        // Find the content block that has ASINList and products
        const asinListMatch = pageHtml.match(/"content"\s*:\s*\{[^}]*"ASINList"\s*:\s*\[([^\]]+)\]/);
        const productsMatch = pageHtml.match(/"products"\s*:\s*\[(\{[\s\S]*?\})\s*\]/);

        if (asinListMatch) {
            // Try to extract a larger config block
            const startIdx = pageHtml.indexOf('"authorId"');
            if (startIdx !== -1) {
                // Work backwards to find the opening brace
                let braceCount = 0;
                let configStart = startIdx;
                for (let i = startIdx; i >= 0; i--) {
                    if (pageHtml[i] === '}') braceCount++;
                    if (pageHtml[i] === '{') {
                        if (braceCount === 0) {
                            configStart = i;
                            break;
                        }
                        braceCount--;
                    }
                }

                // Now find the matching closing brace
                braceCount = 0;
                for (let i = configStart; i < pageHtml.length; i++) {
                    if (pageHtml[i] === '{') braceCount++;
                    if (pageHtml[i] === '}') {
                        braceCount--;
                        if (braceCount === 0) {
                            try {
                                const configStr = pageHtml.substring(configStart, i + 1);
                                const config = JSON.parse(configStr);
                                if (config.content && config.content.products) {
                                    return config;
                                }
                            } catch (e) {
                                // Continue trying
                            }
                        }
                    }
                }
            }
        }

        return null;
    }

    function getAuthorName() {
        // Try pageContext.brandName from config
        const config = extractAuthorConfig();
        if (config?.pageContext?.brandName) {
            return config.pageContext.brandName;
        }

        // Try og:title meta tag
        const ogTitle = doc.querySelector('meta[property="og:title"]');
        if (ogTitle) {
            const title = ogTitle.getAttribute('content') || '';
            // Remove " - Amazon.com" suffix
            return title.replace(/\s*[-–]\s*Amazon\.com.*$/i, '').trim() || 'Unknown Author';
        }

        // Try page title
        const titleEl = doc.querySelector('title');
        if (titleEl) {
            const title = titleEl.textContent || '';
            return title.replace(/\s*[-–]\s*Amazon\.com.*$/i, '').trim() || 'Unknown Author';
        }

        return 'Unknown Author';
    }

    function getAuthorId() {
        // Try to get from URL
        const urlMatch = win.location.href.match(/\/author\/([A-Z0-9]{10})/i);
        if (urlMatch) {
            return urlMatch[1].toUpperCase();
        }

        // Try from config
        const config = extractAuthorConfig();
        if (config?.pageContext?.authorId) {
            return config.pageContext.authorId;
        }

        return null;
    }

    // ============================================================================
    // Parse Products from Embedded Data
    // ============================================================================

    function parseProductsFromConfig(config) {
        const books = [];
        const completeness = {
            total: 0,
            withPrice: 0,
            withRating: 0,
            withCover: 0
        };

        const products = config?.content?.products || [];

        for (const product of products) {
            // Only process Kindle editions
            const binding = product.bindingInformation?.binding?.symbol;
            if (binding !== 'kindle_edition') {
                continue;
            }

            const asin = product.asin;
            if (!asin) continue;

            // Extract title
            const title = product.title?.displayString || '';
            if (!title) continue;

            // Extract author(s)
            const contributors = product.byLine?.contributors || [];
            const authors = contributors
                .filter(c => c.roles?.some(r => r.type === 'author'))
                .map(c => c.name)
                .filter(Boolean)
                .join(', ') || 'Unknown Author';

            // Extract cover URL (prefer hiRes)
            const images = product.productImages?.images || [];
            const coverUrl = images[0]?.hiRes?.url || images[0]?.lowRes?.url || null;

            // Extract rating
            const rating = product.customerReviewsSummary?.rating?.value || null;

            // Extract review count
            const reviewCount = product.customerReviewsSummary?.count?.value || null;

            // Extract price - find the Kindle buying option
            let currentPrice = null;
            const buyingOptions = product.buyingOptions || [];
            for (const option of buyingOptions) {
                // Look for KINDLE_ALC or similar Kindle buying option
                if (option.type === 'KINDLE_ALC' || option.type === 'NEW') {
                    const priceValue = option.price?.priceToPay?.moneyValueOrRange?.value;
                    if (priceValue?.amount !== undefined) {
                        currentPrice = priceValue.displayString || `$${priceValue.amount.toFixed(2)}`;
                        break;
                    }
                }
            }

            // Extract series info if available
            const seriesInfo = product.bookSeriesInfo;
            const series = seriesInfo?.seriesTitle || null;
            const seriesPosition = seriesInfo?.position || null;

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
                // Include series info if available
                ...(series && { series }),
                ...(seriesPosition && { seriesPosition }),
                // Include price if available
                ...(currentPrice && { currentPrice, priceAsOf: getTodayDate() })
            };

            books.push(book);

            // Track completeness
            completeness.total++;
            if (currentPrice) completeness.withPrice++;
            if (rating) completeness.withRating++;
            if (coverUrl) completeness.withCover++;
        }

        return { books, completeness };
    }

    // ============================================================================
    // Fetch Additional Pages via /juvec API (if needed)
    // ============================================================================

    async function fetchAdditionalBooks(config, existingAsins) {
        const totalCount = config?.content?.totalCount || 0;
        const currentProducts = config?.content?.products || [];
        const pageSize = config?.content?.authorSearch?.pageSize || 112;

        // If we have all books, no need for additional fetches
        if (currentProducts.length >= totalCount) {
            return [];
        }

        console.log(`   ℹ️  Page has ${currentProducts.length} of ${totalCount} total books`);
        console.log(`   Fetching additional books via API...`);

        // Get the ASINs we don't have yet
        const loadedAsins = new Set(currentProducts.map(p => p.asin));
        const allAsins = config?.content?.ASINList || [];
        const remainingAsins = allAsins.filter(asin => !loadedAsins.has(asin));

        if (remainingAsins.length === 0) {
            console.log(`   All ASINs already loaded`);
            return [];
        }

        // For now, we'll just note the limitation
        // The /juvec API requires complex request context that's hard to replicate
        console.log(`   ⚠️  ${remainingAsins.length} additional ASINs exist but pagination API is complex`);
        console.log(`   Consider scrolling/clicking "Show More" on the page first to load all books`);

        return [];
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
        // Step 1: Verify we're on an author page
        progressUI.updatePhase('Detecting Author Page', 'Checking page type...');
        console.log('[1] Detecting author page...');

        const authorId = getAuthorId();
        if (!authorId) {
            throw new Error('Could not find author ID. Please navigate to an Amazon author page (e.g., amazon.com/stores/Author-Name/author/B001IGJOCA)');
        }

        const authorName = getAuthorName();
        console.log(`   Author: "${authorName}"`);
        console.log(`   ID: ${authorId}\n`);

        // Step 2: Extract embedded config
        progressUI.updatePhase('Extracting Data', 'Parsing page data...');
        console.log('[2] Extracting embedded book data...');

        const config = extractAuthorConfig();
        if (!config) {
            throw new Error('Could not find book data on this page. Make sure you are on the author\'s "All Books" page.');
        }

        const totalCount = config?.content?.totalCount || 0;
        const pageSize = config?.content?.authorSearch?.pageSize || 0;
        console.log(`   Found config with ${totalCount} total books (page size: ${pageSize})\n`);

        // Step 3: Parse books from config
        progressUI.updatePhase('Parsing Books', 'Extracting Kindle editions...');
        console.log('[3] Parsing book data...');

        const { books, completeness } = parseProductsFromConfig(config);
        console.log(`   ✅ Found ${books.length} Kindle editions`);

        // Log data completeness
        if (completeness.total > 0) {
            const missingPrice = completeness.total - completeness.withPrice;
            const missingRating = completeness.total - completeness.withRating;

            if (missingPrice > 0) {
                console.log(`   ℹ️  Data completeness:`);
                console.log(`      - Price: ${completeness.withPrice}/${completeness.total} (${missingPrice} missing)`);
                console.log(`      - Rating: ${completeness.withRating}/${completeness.total} (${missingRating} missing)`);
                console.log(`      Note: Missing data can be filled by running Library Fetcher`);
            }
        }
        console.log('');

        // Step 4: Check if any books to add
        if (books.length === 0) {
            progressUI.showComplete(`No Kindle books found for <strong>${authorName}</strong>.<br>Try scrolling down to load more books, then run again.`, 15000);
            console.log('========================================');
            console.log('✅ NO KINDLE BOOKS FOUND');
            console.log('========================================\n');
            return;
        }

        // Step 5: Load library file
        console.log('[4] Loading library file...');
        const { existingData, fileHandle, hasFileSystemAccess } = await loadLibraryFile();

        // Step 6: Check for duplicates and add books
        progressUI.updatePhase('Adding to Wishlist', `Processing ${books.length} books...`);
        progressUI.showProgressBar();
        console.log(`[5] Adding ${books.length} books to library...`);

        const existingAsins = new Set(existingData.books.items.map(b => b.asin));
        let addedCount = 0;
        let duplicateCount = 0;

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

        // Step 7: Save library file
        console.log('[6] Saving library file...');
        await saveLibraryFile(existingData, fileHandle, hasFileSystemAccess);

        // Step 8: Show summary
        console.log('========================================');
        console.log('✅ BIBLIOGRAPHY IMPORT COMPLETE!');
        console.log('========================================');
        console.log(`   Author: "${authorName}"`);
        console.log(`   Added: ${addedCount} Kindle books`);
        console.log(`   Skipped (duplicate): ${duplicateCount} books`);
        // Data completeness in final summary
        const missingPrice = completeness.total - completeness.withPrice;
        if (missingPrice > 0) {
            console.log(`   ℹ️  ${missingPrice} books missing price - run Library Fetcher to complete`);
        }
        console.log(`   Total books in library: ${existingData.books.items.length}`);
        console.log('========================================\n');

        // Build summary message
        let summaryMessage = `<strong>${authorName}</strong><br>`;
        summaryMessage += `Added ${addedCount} Kindle books to wishlist<br>`;

        if (duplicateCount > 0) {
            summaryMessage += `<span style="color: #888; font-size: 12px;">Skipped: ${duplicateCount} already in library</span><br>`;
        }

        // Note about missing data if applicable
        if (missingPrice > 0) {
            summaryMessage += `<br><span style="color: #1976d2; font-size: 11px;">`;
            summaryMessage += `ℹ️ ${missingPrice} books missing price - run Library Fetcher to complete</span>`;
        }

        // Note if pagination was needed
        if (totalCount > books.length) {
            summaryMessage += `<br><span style="color: #f57c00; font-size: 11px;">`;
            summaryMessage += `⚠️ Only ${books.length} of ${totalCount} books loaded. Scroll down on page to load more.</span>`;
        }

        progressUI.showComplete(summaryMessage, 20000);

        // Analytics
        new Image().src = 'https://readerwrangler.goatcounter.com/count?p=/event/bibliography-import-completed';

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
importBibliography();
