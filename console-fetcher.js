// Kindle Incremental Library Fetcher v2.0.0 (Combined Pass 1+2 + Manifest)
// Fetches new books and enriches them with descriptions & reviews
// Also generates a manifest file for the organizer to track updates
// 
// Instructions:
// 1. Go to https://www.amazon.com/yourbooks (must be logged in)
// 2. Open DevTools Console (F12 → Console tab)
// 3. Paste this ENTIRE script and press Enter
// 4. If you have existing data, select kindle-library.json when prompted
//    (If no existing file, just cancel the dialog - will fetch ALL books)
// 5. Wait for completion (~5 min first time, ~2-3 hours with enrichment)
// 6. Downloads kindle-library.json AND kindle-manifest.json
// 7. Upload library file to organizer!

(async function() {
    const PAGE_TITLE = document.title;
    const FETCHER_VERSION = 'v2.0.0';
    const SCHEMA_VERSION = '2.0';
    
    console.log('========================================');
    console.log(`Kindle Incremental Fetcher ${FETCHER_VERSION}`);
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
    const LIBRARY_FILENAME = 'kindle-library.json';
    const MANIFEST_FILENAME = 'kindle-manifest.json';
    const startTime = Date.now();
    
    try {
        // Step 1: Load existing data (if any)
        console.log('[1/6] Checking for existing library data...');
        console.log('   If you have kindle-library.json, select it.');
        console.log('   If this is your first run, click Cancel.\n');
        
        let existingBooks = [];
        let mostRecentDate = null;
        
        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.accept = '.json';
        
        const file = await new Promise((resolve) => {
            const timeout = setTimeout(() => resolve(null), 30000); // 30 sec timeout
            fileInput.onchange = (e) => {
                clearTimeout(timeout);
                resolve(e.target.files[0]);
            };
            fileInput.click();
        });
        
        if (file) {
            const fileText = await file.text();
            existingBooks = JSON.parse(fileText);
            
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
        
        // Step 3: Fetch new books (Pass 1)
        console.log('[3/6] Fetching new books from library...');
        console.log('   Will stop when we reach existing books\n');
        
        const newBooks = [];
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
                                                height
                                                width
                                            }
                                            lowRes {
                                                physicalId
                                                extension
                                                height
                                                width
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
                                    pastPurchase {
                                        purchaseHistory {
                                            lastOrderDate
                                            lastOrderDateV2
                                            orderLink {
                                                data {
                                                    displayString
                                                }
                                                url
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
                    console.log(`   ⚠️  HTTP ${response.status} - Stopping`);
                    break;
                }
                
                const data = await response.json();
                
                if (data.errors) {
                    console.error('   ❌ GraphQL errors:', data.errors);
                    break;
                }
                
                const library = data?.data?.getCustomerLibrary?.books;
                
                if (!library || !library.edges) {
                    console.log('   ⚠️  No data returned - Stopping');
                    break;
                }
                
                const books = library.edges;
                
                // Process each book and check for overlap
                for (const edge of books) {
                    const node = edge.node;
                    const product = node.product;
                    
                    if (!product) continue;
                    
                    const acquisitionDate = node.relationshipCreationDate || 
                                          product.pastPurchase?.purchaseHistory?.lastOrderDate ||
                                          product.pastPurchase?.purchaseHistory?.lastOrderDateV2 ||
                                          null;
                    
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
                    
                    // Extract book data
                    const title = product.title?.displayString || 'Unknown Title';
                    
                    const authors = product.byLine?.contributors
                        ?.map(c => c.name || c.contributor?.author?.profile?.displayName)
                        .filter(Boolean)
                        .join(', ') || 'Unknown Author';
                    
                    let coverUrl = null;
                    const images = product.images?.images?.[0];
                    if (images?.hiRes?.physicalId && images?.hiRes?.extension) {
                        coverUrl = `https://images-na.ssl-images-amazon.com/images/I/${images.hiRes.physicalId}.${images.hiRes.extension}`;
                    } else if (images?.lowRes?.physicalId && images?.lowRes?.extension) {
                        coverUrl = `https://images-na.ssl-images-amazon.com/images/I/${images.lowRes.physicalId}.${images.lowRes.extension}`;
                    } else {
                        coverUrl = `https://images-na.ssl-images-amazon.com/images/P/${product.asin}.01.LZZZZZZZ.jpg`;
                    }
                    
                    const rating = product.customerReviewsSummary?.rating?.value || null;
                    const reviewCount = product.customerReviewsSummary?.count?.displayString || null;
                    
                    const seriesData = product.bookSeries?.singleBookView?.series;
                    const series = seriesData?.title || null;
                    const seriesPosition = seriesData?.position || null;
                    
                    const binding = product.bindingInformation?.binding?.displayString || null;
                    
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
            
            console.log('📄 Updated manifest file downloaded');
            console.log('========================================');
            return;
        }
        
        console.log(`\n✅ Pass 1 complete: Found ${newBooks.length} new books\n`);
        
        // Step 4: Enrich new books (Pass 2)
        console.log('[4/6] Enriching new books with descriptions & reviews...');
        const estimatedTime = Math.ceil((newBooks.length * ENRICH_DELAY_MS) / 1000 / 60);
        console.log(`   Estimated time: ~${estimatedTime} minutes\n`);
        
        let enrichedCount = 0;
        let errorCount = 0;
        
        for (let i = 0; i < newBooks.length; i++) {
            const book = newBooks[i];
            const percent = Math.round((i / newBooks.length) * 100);
            const progressBar = '█'.repeat(Math.floor(percent / 2)) + '░'.repeat(50 - Math.floor(percent / 2));
            
            console.log(`[${i + 1}/${newBooks.length}] [${progressBar}] ${percent}% - ${book.title.substring(0, 40)}...`);
            
            try {
                const query = `query enrichBook {
                    getProducts(input: [{asin: "${book.asin}"}]) {
                        asin
                        description {
                            sections(filter: {types: PRODUCT_DESCRIPTION}) {
                                content
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
                
                if (!response.ok) {
                    console.log(`   ⚠️  HTTP ${response.status} - Skipping`);
                    errorCount++;
                    continue;
                }
                
                const data = await response.json();
                
                if (data.errors) {
                    console.log(`   ⚠️  API error - Skipping`);
                    errorCount++;
                    continue;
                }
                
                const product = data?.data?.getProducts?.[0];
                
                if (!product) {
                    console.log(`   ⚠️  No data - Skipping`);
                    errorCount++;
                    continue;
                }
                
                // Extract description
                let description = '';
                const descContent = product.description?.sections?.[0]?.content;
                if (descContent) {
                    if (descContent.text) {
                        description = descContent.text;
                    } else if (descContent.__typename === 'ProductRichContent' && descContent.text) {
                        description = descContent.text;
                    }
                }
                
                // Extract reviews
                const topReviews = product.customerReviewsTop?.reviews?.map(review => ({
                    stars: review.stars,
                    title: review.title,
                    text: review.contentAbstract?.textAbstract || '',
                    reviewer: review.contributor?.publicProfile?.publicProfile?.publicName?.displayString || 'Anonymous'
                })) || [];
                
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
                console.log(`   ❌ ${error.message}`);
                errorCount++;
            }
            
            if (i < newBooks.length - 1) {
                await new Promise(resolve => setTimeout(resolve, ENRICH_DELAY_MS));
            }
        }
        
        console.log(`\n✅ Pass 2 complete: Enriched ${enrichedCount}/${newBooks.length} books`);
        if (errorCount > 0) {
            console.log(`   ⚠️  ${errorCount} errors (books will have basic info only)\n`);
        }
        console.log('');
        
        // Step 5: Merge and save library
        console.log('[5/6] Merging with existing data and saving library...');
        
        // Prepend new books (most recent first)
        const finalBooks = [...newBooks, ...existingBooks];
        
        const jsonData = JSON.stringify(finalBooks, null, 2);
        const blob = new Blob([jsonData], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = LIBRARY_FILENAME;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        console.log(`✅ Library saved: ${LIBRARY_FILENAME}`);
        
        // Step 6: Create and save manifest
        console.log('[6/6] Creating manifest file...');
        
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
        
        console.log(`✅ Manifest saved: ${MANIFEST_FILENAME}`);
        
        const elapsedSeconds = Math.round((Date.now() - startTime) / 1000);
        const elapsedMinutes = Math.floor(elapsedSeconds / 60);
        const remainingSeconds = elapsedSeconds % 60;
        
        console.log('\n========================================');
        console.log('✅ SUCCESS!');
        console.log('========================================');
        console.log(`📚 Total library: ${finalBooks.length} books`);
        console.log(`   New books: ${newBooks.length}`);
        console.log(`   Existing: ${existingBooks.length}`);
        console.log(`💾 Files:`);
        console.log(`   - ${LIBRARY_FILENAME}`);
        console.log(`   - ${MANIFEST_FILENAME}`);
        console.log(`⏱️  Time: ${elapsedMinutes}m ${remainingSeconds}s`);
        console.log('\n👉 Next steps:');
        console.log('   1. Find both files in Downloads folder');
        console.log('   2. Place them in same folder as organizer HTML');
        console.log('   3. Organizer will auto-detect manifest and show status');
        console.log('   4. Click status indicator to sync if needed');
        console.log('\n💡 Next time you run this script:');
        console.log('   - Select kindle-library.json when prompted');
        console.log('   - Only NEW books will be fetched & enriched');
        console.log('   - Both files will be updated automatically');
        console.log('   - Organizer will detect the update via manifest');
        console.log('========================================\n');
        
    } catch (error) {
        console.error('\n========================================');
        console.error('❌ FATAL ERROR');
        console.error('========================================');
        console.error(error);
        console.error('========================================\n');
    }
})();