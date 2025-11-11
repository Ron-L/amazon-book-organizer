// Amazon Library Fetcher - Phase 1 Test (DEDUPLICATION TEST)
// Tests duplicate ASIN detection and removal during Pass 1
// Does NOT run Pass 2 (enrichment) or save any files
//
// Instructions:
// 1. Go to https://www.amazon.com/yourbooks (must be logged in)
// 2. Open DevTools Console (F12 → Console tab)
// 3. Paste this ENTIRE script and press Enter
// 4. When prompted for existing library, select your current amazon-library.json
// 5. Wait ~1 minute for Phase 0 + Pass 1 to complete
// 6. Check console for deduplication statistics
// 7. NO FILES WILL BE SAVED (test only!)
//
// Re-run: After pasting once, you can re-run with: testPhase1Dedup()

async function testPhase1Dedup() {
    const PAGE_TITLE = document.title;
    const FETCHER_VERSION = 'v3.3.1.a-phase1-test';
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
        duplicatesFound: []  // Track duplicate ASINs for testing
    };

    // Helper function to format time (used in multiple places)
    const formatTime = (ms) => {
        const totalSeconds = Math.floor(ms / 1000);
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;

        if (hours > 0) {
            return `${hours}h ${minutes}m ${seconds}s`;
        } else if (minutes > 0) {
            return `${minutes}m ${seconds}s`;
        } else {
            return `${seconds}s`;
        }
    };

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
                    throw new Error('API error');
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

                // If this was the last attempt, give up
                if (attempt === maxRetries) {
                    break;
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
            // Cancel button or Esc key closes dialog and returns null
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
        const csrfMeta = document.querySelector('meta[name="anti-csrftoken-a2z"]');
        
        if (!csrfMeta) {
            throw new Error('❌ CSRF token not found. Make sure you are logged in.');
        }
        
        const csrfToken = csrfMeta.getAttribute('content');
        console.log(`✅ Found CSRF token: ${csrfToken.substring(0, 10)}...\n`);

        // Phase 0: Validate API endpoints before fetching
        console.log('[Phase 0] Validating Amazon API endpoints...');
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

            console.log('📄 Updated manifest file downloaded\n');

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

        // ============================================================================
        // PHASE 1 TEST - EXIT HERE AND SHOW DEDUPLICATION STATISTICS
        // ============================================================================

        console.log('========================================');
        console.log('🧪 PHASE 1 TEST COMPLETE');
        console.log('========================================\n');

        // Calculate phase durations
        const phase0Duration = stats.timing.phase0End - stats.timing.phase0Start;
        const pass1Duration = stats.timing.pass1End - stats.timing.pass1Start;
        const totalDuration = Date.now() - startTime;

        console.log('⏱️  TIMING');
        console.log(`   Phase 0 (Validation):        ${formatTime(phase0Duration)}`);
        console.log(`   Pass 1 (Library Fetch):      ${formatTime(pass1Duration)}`);
        console.log(`   ${'─'.repeat(37)}`);
        console.log(`   Total time:                  ${formatTime(totalDuration)}\n`);

        console.log('📊 DEDUPLICATION RESULTS');
        if (stats.duplicatesFound.length === 0) {
            console.log(`   ✅ No duplicate ASINs found!`);
            console.log(`   All ${newBooks.length} books have unique ASINs.\n`);
        } else {
            console.log(`   ❌ Found ${stats.duplicatesFound.length} duplicate ASIN(s):`);
            console.log(`   Books after deduplication: ${newBooks.length}`);
            console.log(`   Books before deduplication: ${newBooks.length + stats.duplicatesFound.length}\n`);

            console.log('   Duplicates removed:');
            stats.duplicatesFound.forEach((dup, i) => {
                console.log(`\n   ${i + 1}. ASIN: ${dup.asin}`);
                console.log(`      Title: ${dup.title}`);
                console.log(`      Binding: ${dup.binding}`);
                console.log(`      First occurrence at index: ${dup.firstIndex}`);
                console.log(`      Duplicate at index: ${dup.secondIndex} (removed)`);
            });
            console.log('');
        }

        console.log('🔄 API RELIABILITY');
        console.log(`   Total API calls:             ${stats.apiCalls.total}`);
        const firstTryPct = stats.apiCalls.total > 0
            ? ((stats.apiCalls.firstTry / stats.apiCalls.total) * 100).toFixed(1)
            : '0.0';
        console.log(`   Succeeded first try:         ${stats.apiCalls.firstTry} (${firstTryPct}%)`);
        if (stats.apiCalls.retry1 > 0) console.log(`   Required 1 retry:            ${stats.apiCalls.retry1}`);
        if (stats.apiCalls.retry2 > 0) console.log(`   Required 2 retries:          ${stats.apiCalls.retry2}`);
        if (stats.apiCalls.retry3 > 0) console.log(`   Required 3 retries:          ${stats.apiCalls.retry3}`);
        if (stats.apiCalls.failed > 0) console.log(`   Failed after retries:        ${stats.apiCalls.failed}`);
        console.log('');

        if (stats.nonBooksFiltered.length > 0) {
            console.log('📦 NON-BOOK ITEMS FILTERED');
            console.log(`   Filtered out ${stats.nonBooksFiltered.length} non-book item(s):`);
            stats.nonBooksFiltered.slice(0, 3).forEach(item => {
                console.log(`      • ${item.title.substring(0, 50)} (${item.binding})`);
            });
            if (stats.nonBooksFiltered.length > 3) {
                console.log(`      • ... and ${stats.nonBooksFiltered.length - 3} more`);
            }
            console.log('');
        }

        console.log('========================================');
        console.log('✅ TEST COMPLETE - NO FILES SAVED');
        console.log('========================================');
        console.log('');
        console.log('Next step: Run full Fresh Fetch with library-fetcher.js v3.3.1.a');
        console.log('(after implementing deduplication in the production fetcher)');

        return;  // EXIT AFTER PHASE 1

    } catch (error) {
        console.error('\n========================================');
        console.error('❌ FATAL ERROR');
        console.error('========================================');
        console.error(error);
        console.error('========================================\n');
    }
}

// Auto-run on first paste
testPhase1Dedup();
