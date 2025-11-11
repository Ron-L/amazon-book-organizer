// Diagnostic script to find MINIMUM number of books before Cats that triggers failure
// Run this in browser console on amazon.com/yourbooks
// Script: diag-07-reverse-binary-search.js

const CATS_ASIN = 'B0085HN8N6'; // Find Cats by ASIN, not position
const DELAY_MS = 3000; // 3 seconds between requests (same as Pass 2 in fetcher)

async function testReverseBinarySearch() {
    console.log('========================================');
    console.log('REVERSE BINARY SEARCH TEST (Test 8)');
    console.log('Script: diag-07-reverse-binary-search.js');
    console.log('========================================');
    console.log('');
    console.log('GOAL:');
    console.log('   Find the MINIMUM number of books needed before Cats to trigger failure');
    console.log('');
    console.log('METHOD:');
    console.log('   Start from END, work backwards with exponential growth:');
    console.log('   - Iteration 1: Fetch books [N-1, N] (2 books total)');
    console.log('   - Iteration 2: Fetch books [N-2, N] (3 books total)');
    console.log('   - Iteration 3: Fetch books [N-4, N] (5 books total)');
    console.log('   - Iteration 4: Fetch books [N-8, N] (9 books total)');
    console.log('   - Continue doubling until Cats FAILS');
    console.log('');
    console.log('EXPECTED:');
    console.log('   Threshold around ~2000 books (based on Test 7 results)');
    console.log('');

    // Step 0: Load library from file
    console.log('[1/3] Loading library file...');
    console.log('');
    console.log('   📂 A file picker dialog will open...');
    console.log('   → Select your amazon-library.json file');
    console.log('   (Dialog may be hidden behind other windows - check taskbar!)');
    console.log('');

    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = '.json';

    const file = await new Promise(resolve => {
        fileInput.onchange = () => resolve(fileInput.files[0]);
        fileInput.click();
    });

    if (!file) {
        console.error('❌ No file selected!');
        console.error('   Please run again and select your amazon-library.json file');
        return;
    }

    console.log(`   ✅ File selected: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)`);
    console.log('   📖 Reading file...');

    let library;
    try {
        const fileText = await file.text();
        library = JSON.parse(fileText);
    } catch (err) {
        console.error('❌ Failed to parse JSON file!');
        console.error(`   Error: ${err.message}`);
        return;
    }

    if (!library || !library.books) {
        console.error('❌ Invalid library file format!');
        console.error('   Expected format: { books: [...] }');
        return;
    }

    console.log(`   ✅ Library loaded: ${library.books.length} books`);
    console.log('');

    // Find Cats position by ASIN (not hardcoded position)
    const catsIndex = library.books.findIndex(b => b.asin === CATS_ASIN);

    if (catsIndex === -1) {
        console.error(`❌ Cats book not found (ASIN: ${CATS_ASIN})`);
        console.error('   Please verify the library file contains this book');
        return;
    }

    const catsBook = library.books[catsIndex];
    console.log('   🎯 Cats book found:');
    console.log(`      Position: ${catsIndex}`);
    console.log(`      ASIN: ${catsBook.asin}`);
    console.log(`      Title: ${catsBook.title}`);
    console.log('');

    // Step 1: Get CSRF token
    console.log('[2/3] Getting CSRF token...');
    const csrfMeta = document.querySelector('meta[name="anti-csrftoken-a2z"]');

    if (!csrfMeta) {
        console.error('❌ CSRF token not found');
        console.error('   Make sure you\'re on amazon.com/yourbooks');
        return;
    }

    const csrfToken = csrfMeta.getAttribute('content');
    console.log(`   ✅ Token obtained: ${csrfToken.substring(0, 10)}...`);
    console.log('');

    // Step 2: Start reverse binary search
    console.log('[3/3] Starting reverse binary search...');
    console.log('');

    const startTime = Date.now();
    const results = {
        iterations: [],
        thresholdFound: false,
        thresholdRange: null,
        totalBooksProcessed: 0
    };

    // GraphQL query for enrichment (same as fetcher Pass 2)
    const enrichQuery = (asin) => `query enrichBook {
        getProducts(input: [{asin: "${asin}"}]) {
            asin
            description {
                sections(filter: {types: PRODUCT_DESCRIPTION}) {
                    content
                }
            }
            customerReviewsTop {
                reviews {
                    contentAbstract {
                        textAbstract
                    }
                    title
                    stars
                }
            }
        }
    }`;

    const enrichBook = async (asin) => {
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
                query: enrichQuery(asin),
                operationName: 'enrichBook'
            })
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();

        if (data.errors) {
            throw new Error(data.errors[0]?.message || 'GraphQL error');
        }

        const product = data?.data?.getProducts?.[0];

        if (!product) {
            throw new Error('No product data returned');
        }

        // Extract description
        const descSection = product.description?.sections?.[0];
        const descContent = descSection?.content;
        let description = '';

        if (typeof descContent === 'string') {
            description = descContent;
        } else if (descContent?.text) {
            description = descContent.text;
        }

        const reviews = product.customerReviewsTop?.reviews || [];

        return { description, reviews: reviews.length };
    };

    // Reverse binary search with exponential growth
    let X = 1; // Start with 1 book before Cats
    let iteration = 0;

    while (X <= catsIndex) {
        iteration++;
        const startIndex = Math.max(0, catsIndex - X);
        const booksInRange = catsIndex - startIndex + 1; // +1 to include Cats
        const estimatedMinutes = Math.ceil((booksInRange * (DELAY_MS + 1500)) / 1000 / 60);

        console.log('========================================');
        console.log(`ITERATION ${iteration}: Testing range [${startIndex}, ${catsIndex}]`);
        console.log('========================================');
        console.log(`   Books before Cats: ${X}`);
        console.log(`   Total books in range: ${booksInRange}`);
        console.log(`   Estimated time: ~${estimatedMinutes} minutes`);
        console.log('');

        const iterationStartTime = Date.now();
        let successes = 0;
        let failures = 0;
        let catsFailed = false;
        let failureDetails = [];

        // Fetch books in range [startIndex, catsIndex]
        for (let i = startIndex; i <= catsIndex; i++) {
            const book = library.books[i];
            const isCatsBook = (i === catsIndex);
            const progressInRange = i - startIndex + 1;

            if (isCatsBook) {
                console.log('   ---');
                console.log(`   🎯 TESTING CATS BOOK (position ${i}):`);
                console.log(`      ASIN: ${book.asin}`);
                console.log(`      Title: ${book.title}`);
            } else {
                console.log(`   [${progressInRange}/${booksInRange}] ${book.title.substring(0, 50)}...`);
            }

            try {
                const result = await enrichBook(book.asin);
                successes++;

                if (isCatsBook) {
                    console.log(`      ✅ SUCCESS: ${result.description.length} chars, ${result.reviews} reviews`);
                } else {
                    console.log(`      ✅ ${result.description.length} chars, ${result.reviews} reviews`);
                }

            } catch (error) {
                failures++;

                if (isCatsBook) {
                    catsFailed = true;
                    console.log(`      ❌ FAILED: ${error.message}`);
                } else {
                    console.log(`      ❌ FAILED: ${error.message}`);
                }

                failureDetails.push({
                    position: i,
                    asin: book.asin,
                    title: book.title,
                    error: error.message
                });
            }

            // Delay between requests (except after last book)
            if (i < catsIndex) {
                await new Promise(resolve => setTimeout(resolve, DELAY_MS));
            }
        }

        const iterationDuration = Math.round((Date.now() - iterationStartTime) / 1000 / 60);

        console.log('');
        console.log('---');
        console.log(`📊 ITERATION ${iteration} RESULTS:`);
        console.log(`   Duration: ${iterationDuration} minutes`);
        console.log(`   Successes: ${successes}`);
        console.log(`   Failures: ${failures}`);
        console.log(`   Cats result: ${catsFailed ? '❌ FAILED' : '✅ SUCCEEDED'}`);
        console.log('');

        results.iterations.push({
            iteration,
            booksBeforeCats: X,
            totalBooks: booksInRange,
            successes,
            failures,
            catsFailed,
            durationMin: iterationDuration,
            failureDetails
        });

        results.totalBooksProcessed += booksInRange;

        // Check if we found the threshold
        if (catsFailed) {
            console.log('========================================');
            console.log('✅ THRESHOLD FOUND!');
            console.log('========================================');
            console.log('');
            console.log(`💡 CRITICAL FINDING:`);
            console.log(`   → Cats FAILED after ${X} books`);
            console.log(`   → Cats SUCCEEDED in previous iteration after ${X / 2} books`);
            console.log(`   → Failure threshold is between ${X / 2} and ${X} books`);
            console.log('');

            results.thresholdFound = true;
            results.thresholdRange = { min: X / 2, max: X };
            break;
        } else {
            console.log(`   → Cats SUCCEEDED after ${X} books`);
            console.log(`   → Doubling range to ${X * 2} books for next iteration`);
            console.log('');
        }

        // Double X for next iteration
        const nextX = X * 2;

        // If doubling exceeds catsIndex, limit to catsIndex
        if (nextX >= catsIndex) {
            if (X === catsIndex) {
                console.log('========================================');
                console.log('⚠️ THRESHOLD NOT FOUND');
                console.log('========================================');
                console.log('');
                console.log('💡 FINDING:');
                console.log(`   → Cats SUCCEEDED even with ALL ${catsIndex} books before it`);
                console.log('   → Failure does NOT occur in this library configuration');
                console.log('   → This contradicts previous test results');
                console.log('');
                console.log('📌 POSSIBLE EXPLANATIONS:');
                console.log('   1. Amazon API state changed (less restrictive now)');
                console.log('   2. Different library file used (not the failing one)');
                console.log('   3. Token/session is fresher than during original fetch');
                console.log('   4. Time of day affects API rate limiting');
                console.log('');
                break;
            }

            X = catsIndex;
            console.log(`   → Next iteration will test FULL library (${X} books before Cats)`);
        } else {
            X = nextX;
        }

        console.log('');
    }

    // Final summary
    const totalDuration = Math.round((Date.now() - startTime) / 1000 / 60);

    console.log('========================================');
    console.log('📊 REVERSE BINARY SEARCH COMPLETE');
    console.log('========================================');
    console.log('');
    console.log('⏱️  TIMING:');
    console.log(`   Total duration: ${totalDuration} minutes`);
    console.log(`   Total books processed: ${results.totalBooksProcessed}`);
    console.log(`   Total iterations: ${results.iterations.length}`);
    console.log('');

    if (results.thresholdFound) {
        console.log('✅ THRESHOLD FOUND:');
        console.log(`   Min: ${results.thresholdRange.min} books`);
        console.log(`   Max: ${results.thresholdRange.max} books`);
        console.log('');
        console.log('📌 CONCLUSION:');
        console.log(`   Amazon API starts failing after processing ~${results.thresholdRange.min}-${results.thresholdRange.max} different books`);
        console.log('');
        console.log('💡 RECOMMENDATION:');
        console.log(`   Implement cooldown in library-fetcher.js after ${Math.floor(results.thresholdRange.min * 0.9)} books`);
        console.log('   - Pause 60 seconds to let API state reset');
        console.log('   - Get fresh CSRF token');
        console.log('   - Continue fetch after cooldown');
        console.log('');
    } else {
        console.log('⚠️ THRESHOLD NOT FOUND');
        console.log('   See details above for possible explanations');
        console.log('');
    }

    console.log('📊 ITERATION SUMMARY:');
    results.iterations.forEach(iter => {
        console.log(`   Iteration ${iter.iteration}: ${iter.booksBeforeCats} books → ${iter.catsFailed ? '❌ FAILED' : '✅ SUCCEEDED'} (${iter.durationMin}m)`);
    });
    console.log('');

    console.log('========================================');

    // Save results
    window.reverseBinarySearchResults = results;
    console.log('📦 Results saved to: window.reverseBinarySearchResults');
    console.log('');
}

// Instructions
console.log('');
console.log('========================================');
console.log('🔬 REVERSE BINARY SEARCH TEST (Test 8)');
console.log('========================================');
console.log('');
console.log('This test finds the MINIMUM number of books needed to trigger failure.');
console.log('');
console.log('READY TO RUN!');
console.log('   Script loaded successfully.');
console.log('   Starting test automatically...');
console.log('');
console.log('METHOD:');
console.log('- Start with 1 book before Cats');
console.log('- Double the range each iteration (1, 2, 4, 8, 16...)');
console.log('- Continue until Cats FAILS');
console.log('- Much faster than traditional binary search');
console.log('');
console.log('EXPECTED:');
console.log('- Threshold around ~2000 books (based on Test 7)');
console.log('- Estimated time: ~3-4 hours total');
console.log('');
console.log('========================================');
console.log('');

// Auto-invoke the test
testReverseBinarySearch();
