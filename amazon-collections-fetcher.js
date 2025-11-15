// Amazon Collections Fetcher v1.0.2.a
// Fetches collection membership and read status for all books in your library
//
// Instructions:
// 1. Go to https://www.amazon.com/hz/mycd/digital-console/contentlist/booksAll/dateDsc/
// 2. Open DevTools Console (F12 → Console tab)
// 3. Paste this ENTIRE script and press Enter
// 4. Wait for completion (will take several minutes for large libraries)
// 5. Downloads amazon-collections.json when complete
// 6. Upload to organizer along with amazon-library.json
//
// Re-run: After pasting once, you can re-run anytime in the same console session
//         by pressing Up Arrow (to recall the function call) or typing: fetchAmazonCollections()

async function fetchAmazonCollections() {
    const FETCHER_VERSION = 'v1.0.2.a';
    const SCHEMA_VERSION = '1.0';
    const PAGE_TITLE = document.title;

    console.log('========================================');
    console.log(`Amazon Collections Fetcher ${FETCHER_VERSION}`);
    console.log(`📄 Page: ${PAGE_TITLE}`);
    console.log('Fetches collection membership and read status');
    console.log('========================================\n');

    const startTime = Date.now();
    const ENDPOINT = 'https://www.amazon.com/hz/mycd/digital-console/ajax';
    const BATCH_SIZE = 25;
    const FETCH_DELAY_MS = 2000; // 2 seconds between requests
    const FILENAME = 'amazon-collections.json';

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
                z-index: 10000;
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
                min-width: 300px;
                max-width: 400px;
            `;

            overlay.innerHTML = `
                <div style="font-size: 18px; font-weight: bold; color: #333; margin-bottom: 10px;">
                    📚 Collections Fetcher ${FETCHER_VERSION}
                </div>
                <div id="progressPhase" style="font-size: 14px; color: #667eea; margin-bottom: 8px; font-weight: 500;">
                    Starting...
                </div>
                <div id="progressDetail" style="font-size: 13px; color: #666; margin-bottom: 15px;">
                    Initializing
                </div>
                <div style="font-size: 12px; color: #999; border-top: 1px solid #eee; padding-top: 10px;">
                    ⏱️ Large libraries take time: ~1½ minutes per 1000 books<br>
                    💡 Open Console (F12) for detailed progress<br>
                    🔄 Refresh page to cancel
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

    // ==========================================
    // Phase 0: Pre-flight Validation
    // ==========================================
    console.log('[Phase 0] Pre-flight validation...\n');
    progressUI.updatePhase('Validating APIs', 'Testing Amazon endpoints');

    // 0.1: Verify we're on the right page
    console.log('  [0.1] Checking page URL...');
    if (!window.location.href.includes('amazon.com/hz/mycd/digital-console')) {
        console.error('❌ WRONG PAGE');
        console.error('   Current URL:', window.location.href);
        console.error('   Required URL: https://www.amazon.com/hz/mycd/digital-console/contentlist/booksAll/dateDsc/');
        console.error('\n📋 DIAGNOSTIC:');
        console.error('   You must run this script on the Amazon "Manage Your Content and Devices" page');
        console.error('   Navigate to the URL above and try again');
        return;
    }
    console.log('  ✅ Page URL correct\n');

    // 0.2: Extract CSRF token
    console.log('  [0.2] Extracting CSRF token...');
    const csrfToken = window.csrfToken;

    if (!csrfToken) {
        console.error('❌ CSRF TOKEN NOT FOUND');
        console.error('   Checked: window.csrfToken');
        console.error('\n📋 DIAGNOSTIC:');
        console.error('   Amazon may have changed their page structure');
        console.error('   The CSRF token is required for API authentication');
        console.error('\n🔍 DEBUG STEPS FOR FUTURE CLAUDE:');
        console.error('   1. Check if window.csrfToken exists: window.csrfToken');
        console.error('   2. Search for csrf in cookies: document.cookie');
        console.error('   3. Search page scripts for token: Look for "csrfToken" in <script> tags');
        console.error('   4. Check Network tab for working AJAX calls to see token location');
        return;
    }
    console.log('  ✅ CSRF token extracted:', csrfToken.substring(0, 20) + '...\n');

    // 0.3: Test API endpoint with minimal request
    console.log('  [0.3] Testing API endpoint...');

    const testActivityInput = {
        contentType: 'Ebook',
        contentCategoryReference: 'booksAll',
        itemStatusList: ['Active', 'Expired'],
        excludeExpiredItemsFor: [
            'KOLL', 'Purchase', 'Pottermore', 'FreeTrial',
            'DeviceRegistration', 'KindleUnlimited', 'Sample',
            'Prime', 'ComicsUnlimited', 'Comixology'
        ],
        originTypes: [
            'Purchase', 'PublicLibraryLending', 'PersonalLending',
            'Sample', 'ComicsUnlimited', 'KOLL', 'RFFLending',
            'Pottermore', 'Prime', 'Rental', 'DeviceRegistration',
            'FreeTrial', 'KindleUnlimited', 'Comixology'
        ],
        showSharedContent: true,
        fetchCriteria: {
            sortOrder: 'DESCENDING',
            sortIndex: 'DATE',
            startIndex: 0,
            batchSize: 1, // Just 1 book for testing
            totalContentCount: -1
        },
        surfaceType: 'Tablet'
    };

    try {
        const testBody = new URLSearchParams({
            activity: 'GetContentOwnershipData',
            activityInput: JSON.stringify(testActivityInput),
            clientId: 'MYCD_WebService',
            csrfToken: csrfToken
        });

        const testResponse = await fetch(ENDPOINT, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Accept': 'application/json, text/plain, */*'
            },
            body: testBody.toString(),
            credentials: 'include'
        });

        if (!testResponse.ok) {
            console.error('❌ API TEST FAILED - HTTP ERROR');
            console.error('   Status:', testResponse.status, testResponse.statusText);
            console.error('   Endpoint:', ENDPOINT);
            console.error('\n📋 DIAGNOSTIC:');
            if (testResponse.status === 401 || testResponse.status === 403) {
                console.error('   Authentication/session error');
                console.error('   1. Your session may have expired - Refresh the page and try again');
                console.error('   2. You may not be logged in - Log in to Amazon and try again');
            } else if (testResponse.status === 404) {
                console.error('   API endpoint not found');
                console.error('   Amazon may have changed their API structure');
            } else {
                console.error('   Network or server error');
                console.error('   Check your internet connection');
            }
            console.error('\n🔍 DEBUG STEPS FOR FUTURE CLAUDE:');
            console.error('   1. Check Network tab in DevTools for failed request');
            console.error('   2. Look for working AJAX calls to identify correct endpoint');
            console.error('   3. Verify CSRF token format hasn\'t changed');
            return;
        }

        const testData = await testResponse.json();

        // 0.4: Validate response structure
        console.log('  [0.4] Validating response structure...');

        if (!testData.GetContentOwnershipData) {
            console.error('❌ UNEXPECTED API RESPONSE STRUCTURE');
            console.error('   Response keys:', Object.keys(testData));
            console.error('   Expected key: "GetContentOwnershipData"');
            console.error('\n📋 DIAGNOSTIC:');
            console.error('   Amazon API structure has changed');
            console.error('\n🔍 DEBUG STEPS FOR FUTURE CLAUDE:');
            console.error('   1. Full response:', JSON.stringify(testData, null, 2));
            console.error('   2. Check Network tab for working API calls');
            console.error('   3. Look for new response structure in recent AJAX calls');
            return;
        }

        const ownershipData = testData.GetContentOwnershipData;

        if (!ownershipData.items || ownershipData.items.length === 0) {
            console.error('❌ API RETURNED NO BOOKS');
            console.error('   Response:', ownershipData);
            console.error('\n📋 DIAGNOSTIC:');
            console.error('   Either your library is empty (unlikely) or API filtering is incorrect');
            console.error('\n🔍 DEBUG STEPS FOR FUTURE CLAUDE:');
            console.error('   1. Check if numberOfItems field exists:', ownershipData.numberOfItems);
            console.error('   2. Full response:', JSON.stringify(ownershipData, null, 2));
            return;
        }

        // 0.5: Validate book data structure
        console.log('  [0.5] Validating book data structure...');

        const sampleBook = ownershipData.items[0];
        const requiredFields = ['asin', 'title', 'readStatus', 'collectionList'];
        const missingFields = requiredFields.filter(field => !(field in sampleBook));

        if (missingFields.length > 0) {
            console.error('❌ MISSING REQUIRED FIELDS IN BOOK DATA');
            console.error('   Missing fields:', missingFields);
            console.error('   Sample book keys:', Object.keys(sampleBook));
            console.error('\n📋 DIAGNOSTIC:');
            console.error('   Amazon API response structure has changed');
            console.error('\n🔍 DEBUG STEPS FOR FUTURE CLAUDE:');
            console.error('   1. Sample book data:', JSON.stringify(sampleBook, null, 2));
            console.error('   2. Check Network tab for field name changes');
            console.error('   3. Look for alternative field names (e.g., "collections" vs "collectionList")');
            return;
        }

        // 0.6: Test actual data extraction
        console.log('  [0.6] Testing data extraction...');

        // Test the same transformation logic that Phase 2 will use
        const testCollections = (sampleBook.collectionList || []).map(col => ({
            id: col.collectionId,
            name: col.collectionName
        }));

        const testOutput = {
            asin: sampleBook.asin,
            title: sampleBook.title || 'Unknown Title',
            readStatus: sampleBook.readStatus || 'UNKNOWN',
            collections: testCollections
        };

        // Validate extraction results
        const extractionResults = [];

        if (testOutput.asin) {
            extractionResults.push(`✅ ASIN: ${testOutput.asin}`);
        } else {
            extractionResults.push(`❌ ASIN: FAILED`);
        }

        if (testOutput.title && testOutput.title !== 'Unknown Title') {
            extractionResults.push(`✅ Title: "${testOutput.title.substring(0, 40)}${testOutput.title.length > 40 ? '...' : ''}"`);
        } else {
            extractionResults.push(`⚠️  Title: empty or missing`);
        }

        if (['READ', 'UNREAD', 'UNKNOWN'].includes(testOutput.readStatus)) {
            extractionResults.push(`✅ Read Status: ${testOutput.readStatus}`);
        } else {
            extractionResults.push(`⚠️  Read Status: unexpected value "${testOutput.readStatus}"`);
        }

        if (testCollections.length > 0) {
            const collectionNames = testCollections.map(c => c.name).join(', ');
            extractionResults.push(`✅ Collections: ${testCollections.length} (${collectionNames})`);
        } else {
            extractionResults.push(`⚠️  Collections: none (book may not be in any collections)`);
        }

        console.log('');
        console.log('  📊 Extraction Test Results:');
        extractionResults.forEach(result => console.log(`     ${result}`));
        console.log('');
        console.log('  Sample output:');
        console.log('  ', JSON.stringify(testOutput, null, 2).split('\n').join('\n  '));

        const totalBooks = ownershipData.numberOfItems || 0;
        const expectedPages = totalBooks > 0 ? Math.ceil(totalBooks / BATCH_SIZE) : 0;
        const safetyLimit = expectedPages + 2; // Allow 2 extra pages for API inconsistencies

        console.log('');
        console.log('✅ Phase 0 validation complete!');
        console.log(`   Total books in library: ${totalBooks}`);
        console.log(`   Expected pages: ${expectedPages}`);
        console.log(`   Safety limit: ${safetyLimit} pages (expected + 2 buffer)`);
        console.log(`   Estimated time: ${Math.ceil(expectedPages * FETCH_DELAY_MS / 1000 / 60)} minutes\n`);

    } catch (error) {
        console.error('❌ PHASE 0 VALIDATION FAILED - EXCEPTION');
        console.error('   Error:', error.message);
        console.error('\n📋 DIAGNOSTIC:');
        console.error('   Unexpected error during API test');
        console.error('\n🔍 DEBUG STEPS FOR FUTURE CLAUDE:');
        console.error('   1. Full error:', error);
        console.error('   2. Stack trace:', error.stack);
        console.error('   3. Check browser console for additional errors');
        return;
    }

    // ==========================================
    // Phase 1: Fetch All Books
    // ==========================================
    console.log('[Phase 1] Fetching all books with collections and read status...\n');
    progressUI.updatePhase('Fetching Collections', 'Retrieving books and collection memberships');

    const activityInput = {
        contentType: 'Ebook',
        contentCategoryReference: 'booksAll',
        itemStatusList: ['Active', 'Expired'],
        excludeExpiredItemsFor: [
            'KOLL', 'Purchase', 'Pottermore', 'FreeTrial',
            'DeviceRegistration', 'KindleUnlimited', 'Sample',
            'Prime', 'ComicsUnlimited', 'Comixology'
        ],
        originTypes: [
            'Purchase', 'PublicLibraryLending', 'PersonalLending',
            'Sample', 'ComicsUnlimited', 'KOLL', 'RFFLending',
            'Pottermore', 'Prime', 'Rental', 'DeviceRegistration',
            'FreeTrial', 'KindleUnlimited', 'Comixology'
        ],
        showSharedContent: true,
        fetchCriteria: {
            sortOrder: 'DESCENDING',
            sortIndex: 'DATE',
            startIndex: 0,
            batchSize: BATCH_SIZE,
            totalContentCount: -1
        },
        surfaceType: 'Tablet'
    };

    let allBooks = [];
    let totalCount = 0;
    let expectedPages = 0;
    let safetyLimit = 0;
    let pageNum = 0;

    while (true) {
        const startIndex = pageNum * BATCH_SIZE;
        activityInput.fetchCriteria.startIndex = startIndex;

        const estimatedPages = totalCount > 0 ? Math.ceil(totalCount / BATCH_SIZE) : '?';
        console.log(`  Fetching page ${pageNum + 1}/${estimatedPages} (books ${startIndex + 1}-${startIndex + BATCH_SIZE})...`);

        try {
            const bodyParams = new URLSearchParams({
                activity: 'GetContentOwnershipData',
                activityInput: JSON.stringify(activityInput),
                clientId: 'MYCD_WebService',
                csrfToken: csrfToken
            });

            const response = await fetch(ENDPOINT, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Accept': 'application/json, text/plain, */*'
                },
                body: bodyParams.toString(),
                credentials: 'include'
            });

            if (!response.ok) {
                console.error(`\n❌ Error fetching page ${pageNum + 1}`);
                console.error(`   HTTP ${response.status}: ${response.statusText}`);
                console.error('   Session may have expired or network error occurred');
                console.error('   Progress saved up to page', pageNum);
                console.error('   You can try running the script again');
                return;
            }

            const data = await response.json();
            const ownershipData = data.GetContentOwnershipData;

            if (!ownershipData || !ownershipData.items) {
                console.error(`\n❌ Unexpected response on page ${pageNum + 1}`);
                console.error('   API may have changed or returned error');
                console.error('   Response:', data);
                return;
            }

            // Update total count and calculate safety limit
            totalCount = ownershipData.numberOfItems || totalCount;
            if (pageNum === 0 && totalCount > 0) {
                expectedPages = Math.ceil(totalCount / BATCH_SIZE);
                safetyLimit = expectedPages + 2;
            }

            const books = ownershipData.items || [];

            console.log(`  ✅ Received ${books.length} books`);

            // Stop condition 1: Empty response (API says "no more")
            if (books.length === 0) {
                console.log(`  📊 Received 0 books - end of data\n`);
                break;
            }

            allBooks = allBooks.concat(books);
            pageNum++;

            // Stop condition 2: Safety limit reached
            if (safetyLimit > 0 && pageNum >= safetyLimit) {
                console.error(`\n❌ SAFETY LIMIT REACHED`);
                console.error(`   Expected ${expectedPages} pages, fetched ${pageNum}`);
                console.error(`   API may be returning duplicate data or stuck in a loop`);
                console.error(`   Stopping to prevent infinite fetch`);
                console.error(`   Working with ${allBooks.length} books fetched so far\n`);
                break;
            }

            // Stop condition 3: We have all books based on count
            if (totalCount > 0 && allBooks.length >= totalCount) {
                console.log(`  📊 Fetched all books based on total count\n`);
                break;
            }

            // Rate limiting - delay before next request
            console.log(`  ⏳ Waiting ${FETCH_DELAY_MS / 1000} seconds before next request...\n`);
            await new Promise(resolve => setTimeout(resolve, FETCH_DELAY_MS));

        } catch (error) {
            console.error(`\n❌ Exception on page ${pageNum + 1}:`, error.message);
            console.error('   Progress saved up to page', pageNum);
            console.error('   You may be able to retry');
            return;
        }
    }

    console.log('✅ Phase 1 complete!');
    console.log(`   Total books fetched: ${allBooks.length}`);
    console.log(`   Total pages fetched: ${pageNum}\n`);

    // Validate book count matches expected
    if (totalCount > 0 && allBooks.length !== totalCount) {
        console.warn('⚠️  BOOK COUNT MISMATCH');
        console.warn(`   API reported total: ${totalCount}`);
        console.warn(`   Actually fetched: ${allBooks.length}`);
        console.warn(`   Difference: ${Math.abs(allBooks.length - totalCount)}`);
        if (allBooks.length < totalCount) {
            console.warn('   Some books may be missing from the fetch');
        } else {
            console.warn('   Fetched more books than expected (possible duplicates?)');
        }
        console.warn('   Proceeding with fetched data...\n');
    }

    // ==========================================
    // Phase 2: Process and Format Data
    // ==========================================
    console.log('[Phase 2] Processing book data...\n');
    progressUI.updatePhase('Processing Data', `Organizing ${allBooks.length} books and read status`);

    let booksWithCollections = 0;
    const processedBooks = allBooks.map(book => {
        // Transform collectionList into simpler format
        const collections = (book.collectionList || []).map(col => ({
            id: col.collectionId,
            name: col.collectionName
        }));

        if (collections.length > 0) {
            booksWithCollections++;
        }

        return {
            asin: book.asin,
            title: book.title || 'Unknown Title',
            readStatus: book.readStatus || 'UNKNOWN',
            collections: collections
        };
    });

    // Count read status breakdown
    const readStatusCounts = { READ: 0, UNREAD: 0, UNKNOWN: 0 };
    processedBooks.forEach(book => {
        readStatusCounts[book.readStatus] = (readStatusCounts[book.readStatus] || 0) + 1;
    });

    console.log('  📊 Statistics:');
    console.log(`     Books with collections: ${booksWithCollections}`);
    console.log(`     Books without collections: ${processedBooks.length - booksWithCollections}`);
    console.log(`     Read status breakdown:`, readStatusCounts);
    console.log('');

    // ==========================================
    // Phase 3: Generate JSON and Download
    // ==========================================
    console.log('[Phase 3] Generating JSON file...\n');
    progressUI.updatePhase('Saving Collections', 'Generating and downloading JSON file');

    const outputData = {
        schemaVersion: SCHEMA_VERSION,
        generatedAt: Date.now(),
        fetcherVersion: FETCHER_VERSION,
        totalBooksScanned: processedBooks.length,
        booksWithCollections: booksWithCollections,
        books: processedBooks
    };

    const jsonString = JSON.stringify(outputData, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const downloadLink = document.createElement('a');
    downloadLink.href = url;
    downloadLink.download = FILENAME;
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
    URL.revokeObjectURL(url);

    const elapsedMs = Date.now() - startTime;
    const elapsedMin = Math.floor(elapsedMs / 60000);
    const elapsedSec = Math.floor((elapsedMs % 60000) / 1000);

    console.log(`✅ File downloaded: ${FILENAME}`);
    console.log(`   File size: ${(jsonString.length / 1024).toFixed(2)} KB`);
    console.log(`   Time elapsed: ${elapsedMin}m ${elapsedSec}s\n`);

    console.log('========================================');
    console.log('✅ COLLECTIONS FETCH COMPLETE!');
    console.log('========================================');
    console.log('Next steps:');
    console.log('1. Locate the downloaded file in your browser\'s download location');
    console.log('2. Upload both amazon-library.json AND amazon-collections.json to the organizer');
    console.log('3. The organizer will merge the data and enable collection filtering\n');

    // Show completion in progress UI
    progressUI.showComplete(`Downloaded ${allBooks.length} books to ${FILENAME}`);

}

// Auto-run on first paste with error handling
(async () => {
    try {
        await fetchAmazonCollections();
    } catch (error) {
        console.error('❌ Fatal error:', error);
        if (typeof progressUI !== 'undefined' && progressUI.showError) {
            progressUI.showError(error.message || 'An unknown error occurred');
        }
    }
})();
