// Diagnostic script to find Queens' poison using reverse binary search
// Tests: What book/sequence before Queens triggers their failure?
// Run this in browser console on amazon.com/yourbooks
// Script: diag-12-queens-reverse-sparse-output.js
//
// DIFFERENCE FROM diag-10:
// - Sparse console output (iteration summaries + progress every 50 books + failures only)
// - Single file download at end only (no dialogs during test)
// - Continuous save to window.queensReverseBinarySearchResults as backup

const QUEEN1_ASIN = '0425197484';  // Undead and Unemployed (Queen Betsy, Book 2)
const QUEEN1_POSITION = 2321;       // Position in original library
const DELAY_MS = 3000;              // 3 seconds (match full fetch timing exactly)

async function testQueensReverseBinarySearch() {
    console.log('========================================');
    console.log('QUEENS REVERSE BINARY SEARCH (Test 12)');
    console.log('Script: diag-12-queens-reverse-sparse-output.js');
    console.log('========================================');
    console.log('');
    console.log('GOAL:');
    console.log('   Find the POISON for Queens (what causes them to fail)');
    console.log('');
    console.log('METHOD:');
    console.log('   Start from END, work backwards with exponential growth:');
    console.log('   - Iteration 1: Fetch books [N-1, N] (1 book before Queen, then Queen)');
    console.log('   - Iteration 2: Fetch books [N-2, N] (2 books before Queen, then Queen)');
    console.log('   - Iteration 3: Fetch books [N-4, N] (4 books before Queen, then Queen)');
    console.log('   - Continue doubling until Queen FAILS');
    console.log('');
    console.log('OUTPUT:');
    console.log('   ✅ Sparse console output (prevents buffer overflow)');
    console.log('   ✅ Progress updates every 50 books');
    console.log('   ✅ All failures logged immediately');
    console.log('   ✅ Single file download at end: test-12-final-results.json');
    console.log('   ✅ Backup saved to: window.queensReverseBinarySearchResults');
    console.log('');
    console.log('HYPOTHESIS:');
    console.log('   Queens have different poison than Cats (Apoc only poisons Cats)');
    console.log('   Both Queens likely fail from same poison (they\'re consecutive)');
    console.log('');

    // Helper function to download file
    const downloadFile = (filename, content) => {
        const blob = new Blob([content], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
    };

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

    // Find Queen by ASIN (not hardcoded position)
    const queenIndex = library.books.findIndex(b => b.asin === QUEEN1_ASIN);

    if (queenIndex === -1) {
        console.error(`❌ Queen 1 not found (ASIN: ${QUEEN1_ASIN})`);
        console.error('   Please verify the library file contains this book');
        return;
    }

    const queenBook = library.books[queenIndex];
    console.log('   👑 QUEEN 1 (Target Victim):');
    console.log(`      Position: ${queenIndex}`);
    console.log(`      ASIN: ${queenBook.asin}`);
    console.log(`      Title: ${queenBook.title}`);
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
        testName: 'Queens Reverse Binary Search (Test 12)',
        testDate: new Date().toISOString(),
        queen: {
            position: queenIndex,
            asin: queenBook.asin,
            title: queenBook.title
        },
        iterations: [],
        thresholdFound: false,
        thresholdRange: null,
        totalBooksProcessed: 0
    };

    // GraphQL query for enrichment
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
    let X = 1; // Start with 1 book before Queen
    let iteration = 0;

    while (X <= queenIndex) {
        iteration++;
        const startIndex = Math.max(0, queenIndex - X);
        const booksInRange = queenIndex - startIndex + 1; // +1 to include Queen
        const estimatedMinutes = Math.ceil((booksInRange * (DELAY_MS + 1500)) / 1000 / 60);

        console.log('========================================');
        console.log(`ITERATION ${iteration}: Testing range [${startIndex}, ${queenIndex}]`);
        console.log('========================================');
        console.log(`   Books before Queen: ${X}`);
        console.log(`   Total books in range: ${booksInRange}`);
        console.log(`   Estimated time: ~${estimatedMinutes} minutes`);
        console.log('');

        const iterationStartTime = Date.now();
        let successes = 0;
        let failures = 0;
        let queenFailed = false;
        let failureDetails = [];

        // Fetch books in range [startIndex, queenIndex]
        for (let i = startIndex; i <= queenIndex; i++) {
            const book = library.books[i];
            const isQueenBook = (i === queenIndex);
            const progressInRange = i - startIndex + 1;

            // Progress indicator every 50 books
            if (progressInRange % 50 === 0 && !isQueenBook) {
                const percentComplete = Math.round((progressInRange / booksInRange) * 100);
                console.log(`   [${progressInRange}/${booksInRange}] Progress: ${percentComplete}% complete...`);
            }

            // Always log Queen book
            if (isQueenBook) {
                console.log('   ---');
                console.log(`   👑 TESTING QUEEN (position ${i}):`);
                console.log(`      ASIN: ${book.asin}`);
                console.log(`      Title: ${book.title}`);
            }

            try {
                const result = await enrichBook(book.asin);
                successes++;

                if (isQueenBook) {
                    console.log(`      ✅ SUCCESS: ${result.description.length} chars, ${result.reviews} reviews`);
                }

            } catch (error) {
                failures++;

                // Always log failures
                if (isQueenBook) {
                    queenFailed = true;
                    console.log(`      ❌ FAILED: ${error.message}`);
                } else {
                    console.log(`   ❌ FAILURE at position ${i}: ${book.title.substring(0, 50)}...`);
                    console.log(`      ASIN: ${book.asin}`);
                    console.log(`      Error: ${error.message}`);
                }

                failureDetails.push({
                    position: i,
                    asin: book.asin,
                    title: book.title,
                    error: error.message
                });
            }

            // Delay between requests (except after last book)
            if (i < queenIndex) {
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
        if (failures > 0) {
            console.log(`   Failed positions: ${failureDetails.map(f => f.position).join(', ')}`);
        }
        console.log(`   Queen result: ${queenFailed ? '❌ FAILED' : '✅ SUCCEEDED'}`);
        console.log('');

        const iterationResult = {
            iteration,
            booksBeforeQueen: X,
            totalBooks: booksInRange,
            rangeStart: startIndex,
            rangeEnd: queenIndex,
            successes,
            failures,
            queenFailed,
            durationMin: iterationDuration,
            failureDetails
        };

        results.iterations.push(iterationResult);
        results.totalBooksProcessed += booksInRange;

        // Update window object continuously as backup
        window.queensReverseBinarySearchResults = results;

        // Check if we found the threshold
        if (queenFailed) {
            console.log('========================================');
            console.log('✅ POISON FOUND!');
            console.log('========================================');
            console.log('');
            console.log(`💡 CRITICAL FINDING:`);
            console.log(`   → Queen FAILED after ${X} books`);
            console.log(`   → Queen SUCCEEDED in previous iteration after ${X / 2} books`);
            console.log(`   → Poison threshold is between ${X / 2} and ${X} books before Queen`);
            console.log('');

            // Identify potential poison book(s)
            if (failureDetails.length > 1) {
                console.log('⚠️ MULTIPLE FAILURES IN THIS ITERATION:');
                failureDetails.forEach((f, idx) => {
                    console.log(`   ${idx + 1}. Position ${f.position}: ${f.title.substring(0, 60)}`);
                    console.log(`      ASIN: ${f.asin}`);
                    console.log(`      ${f.position === queenIndex ? '👑 THIS IS QUEEN' : '🧪 Potential poison'}`);
                });
                console.log('');
            }

            // Find the book immediately before Queen in this range
            const bookBeforeQueen = library.books[queenIndex - 1];
            console.log('🎯 BOOK IMMEDIATELY BEFORE QUEEN:');
            console.log(`   Position: ${queenIndex - 1}`);
            console.log(`   ASIN: ${bookBeforeQueen.asin}`);
            console.log(`   Title: ${bookBeforeQueen.title}`);
            console.log('');
            console.log('   This book is the LEADING CANDIDATE for Queens\' poison.');
            console.log('   (Like "Apoc" is for Cats)');
            console.log('');

            results.thresholdFound = true;
            results.thresholdRange = { min: X / 2, max: X };
            results.leadingPoisonCandidate = {
                position: queenIndex - 1,
                asin: bookBeforeQueen.asin,
                title: bookBeforeQueen.title
            };
            break;
        } else {
            console.log(`   → Queen SUCCEEDED after ${X} books`);
            console.log(`   → Doubling range to ${X * 2} books for next iteration`);
            console.log('');
        }

        // Double X for next iteration
        const nextX = X * 2;

        // If doubling exceeds queenIndex, limit to queenIndex
        if (nextX >= queenIndex) {
            if (X === queenIndex) {
                console.log('========================================');
                console.log('⚠️ POISON NOT FOUND');
                console.log('========================================');
                console.log('');
                console.log('💡 FINDING:');
                console.log(`   → Queen SUCCEEDED even with ALL ${queenIndex} books before it`);
                console.log('   → Poison does NOT occur in this test configuration');
                console.log('');
                console.log('📌 POSSIBLE EXPLANATIONS:');
                console.log('   1. Fresh page/session prevents poison accumulation');
                console.log('   2. Time between tests allows Amazon API to reset');
                console.log('   3. Full fetch has additional factors not replicated here');
                console.log('   4. Queens\' poison requires specific cumulative state');
                console.log('');
                break;
            }

            X = queenIndex;
            console.log(`   → Next iteration will test FULL library (${X} books before Queen)`);
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
        console.log('✅ POISON THRESHOLD FOUND:');
        console.log(`   Min: ${results.thresholdRange.min} books before Queen`);
        console.log(`   Max: ${results.thresholdRange.max} books before Queen`);
        console.log('');

        if (results.leadingPoisonCandidate) {
            console.log('🧪 LEADING POISON CANDIDATE:');
            console.log(`   Position: ${results.leadingPoisonCandidate.position}`);
            console.log(`   ASIN: ${results.leadingPoisonCandidate.asin}`);
            console.log(`   Title: ${results.leadingPoisonCandidate.title}`);
            console.log('');
            console.log('🎯 NEXT TEST:');
            console.log('   Run same test as Test 9 (toxic book test):');
            console.log('   1. Fetch this candidate poison');
            console.log('   2. Fetch Queens immediately after');
            console.log('   3. Confirm if this is Queens\' true poison');
            console.log('');
        }
    } else {
        console.log('⚠️ POISON NOT FOUND');
        console.log('   See details above for possible explanations');
        console.log('');
    }

    console.log('📊 ITERATION SUMMARY:');
    results.iterations.forEach(iter => {
        const failureInfo = iter.failures > 0 ? ` (${iter.failures} failures)` : '';
        console.log(`   Iteration ${iter.iteration}: ${iter.booksBeforeQueen} books → ${iter.queenFailed ? '❌ FAILED' : '✅ SUCCEEDED'} (${iter.durationMin}m)${failureInfo}`);
    });
    console.log('');

    console.log('========================================');

    // Save final results
    results.status = 'completed';
    results.totalDurationMin = totalDuration;

    window.queensReverseBinarySearchResults = results;
    console.log('📦 Results saved to: window.queensReverseBinarySearchResults');
    console.log('');

    // Download final results file
    console.log('💾 Downloading final results file...');
    downloadFile('test-12-final-results.json', JSON.stringify(results, null, 2));
    console.log('✅ Downloaded: test-12-final-results.json');
    console.log('');
    console.log('🎉 Test complete! Check your Downloads folder for results.');
    console.log('');
}

// Instructions
console.log('');
console.log('========================================');
console.log('🔬 QUEENS REVERSE BINARY SEARCH (Test 12)');
console.log('========================================');
console.log('');
console.log('This test finds the POISON for Queens using reverse binary search.');
console.log('');
console.log('✅ FEATURES:');
console.log('   - Sparse console output (no buffer overflow)');
console.log('   - Progress updates every 50 books');
console.log('   - All failures logged immediately');
console.log('   - Single file at end (no dialogs during test)');
console.log('   - Backup: window.queensReverseBinarySearchResults');
console.log('');
console.log('READY TO RUN!');
console.log('   Script loaded successfully.');
console.log('   Starting test automatically...');
console.log('');
console.log('METHOD:');
console.log('- Start with 1 book before Queen');
console.log('- Double the range each iteration (1, 2, 4, 8, 16...)');
console.log('- Continue until Queen FAILS');
console.log('- Find which book is Queens\' poison');
console.log('');
console.log('EXPECTED RUNTIME: ~7 hours');
console.log('');
console.log('========================================');
console.log('');

// Auto-invoke the test
testQueensReverseBinarySearch();
