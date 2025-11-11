// Diagnostic script to test if SEQUENCE matters (shuffle books 0-2018)
// Run this in browser console on amazon.com/yourbooks
// Script: diag-06-shuffle-test.js

const CATS_POSITION = 2019; // Position where Cats originally fails
const DELAY_MS = 3000; // 3 seconds between requests (same as Pass 2 in fetcher)

async function testShuffleSequence() {
    console.log('========================================');
    console.log('SHUFFLE SEQUENCE TEST (Test 7)');
    console.log('Script: diag-06-shuffle-test.js');
    console.log('========================================');
    console.log('');
    console.log('HYPOTHESIS:');
    console.log('   Does failure require a specific SEQUENCE of books?');
    console.log('   Or just cumulative count/variety/time?');
    console.log('');
    console.log('METHOD:');
    console.log('   1. Shuffle books 0-2018 (randomize order before Cats)');
    console.log('   2. Keep books 2019+ in original order');
    console.log('   3. Fetch in shuffled order with same timing');
    console.log('   4. Check if Cats still fails at position 2019');
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

    // Separate books into two groups
    const booksToShuffle = library.books.slice(0, CATS_POSITION); // 0-2018
    const booksToKeep = library.books.slice(CATS_POSITION); // 2019+

    console.log(`   📚 Books to shuffle: ${booksToShuffle.length} (positions 0-${CATS_POSITION - 1})`);
    console.log(`   📌 Books to keep in order: ${booksToKeep.length} (positions ${CATS_POSITION}+)`);
    console.log('');

    // Fisher-Yates shuffle
    console.log('   🔀 Shuffling first 2019 books...');
    for (let i = booksToShuffle.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [booksToShuffle[i], booksToShuffle[j]] = [booksToShuffle[j], booksToShuffle[i]];
    }
    console.log('   ✅ Shuffle complete!');
    console.log('');

    // Merge shuffled + original order
    const testBooks = [...booksToShuffle, ...booksToKeep];

    console.log('   📊 First 5 shuffled books:');
    for (let i = 0; i < 5 && i < testBooks.length; i++) {
        console.log(`      ${i}: ${testBooks[i].title.substring(0, 50)}...`);
    }
    console.log('');
    console.log('   📊 Books at Cats position (2019-2023):');
    for (let i = CATS_POSITION; i < CATS_POSITION + 5 && i < testBooks.length; i++) {
        console.log(`      ${i}: ${testBooks[i].title.substring(0, 50)}...`);
    }
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

    // Step 2: Enrich books in shuffled order
    console.log('[3/3] Starting shuffled fetch test...');
    console.log('');

    const totalBooks = testBooks.length;
    const estimatedMinutes = Math.ceil((totalBooks * (DELAY_MS + 1500)) / 1000 / 60);
    console.log(`   📖 Total books: ${totalBooks}`);
    console.log(`   ⏱️  Estimated time: ~${estimatedMinutes} minutes (${(estimatedMinutes / 60).toFixed(1)} hours)`);
    console.log(`   🎯 Watching for Cats book at position ${CATS_POSITION}`);
    console.log('');

    const startTime = Date.now();
    const results = {
        successes: 0,
        failures: 0,
        catsResult: null,
        catsPosition: null,
        firstFailureAt: null,
        failureDetails: []
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

    // Process each book in shuffled order
    for (let i = 0; i < testBooks.length; i++) {
        const book = testBooks[i];
        const percent = Math.round((i / testBooks.length) * 100);
        const progressBar = '█'.repeat(Math.floor(percent / 2)) + '░'.repeat(50 - Math.floor(percent / 2));
        const elapsedMin = Math.round((Date.now() - startTime) / 1000 / 60);

        console.log(`[${i + 1}/${testBooks.length}] [${progressBar}] ${percent}% - ${book.title.substring(0, 40)}...`);

        // Special notice when we reach Cats position
        if (i === CATS_POSITION) {
            console.log('');
            console.log('========================================');
            console.log('🎯 CRITICAL POSITION: CATS BOOK (2019)');
            console.log('========================================');
            console.log(`   ASIN: ${book.asin}`);
            console.log(`   Title: ${book.title}`);
            console.log(`   Elapsed: ${elapsedMin} minutes`);
            console.log('   Testing if Cats fails after shuffled sequence...');
            console.log('');
        }

        try {
            const result = await enrichBook(book.asin);

            results.successes++;
            console.log(`   ✅ ${result.description.length} chars, ${result.reviews} reviews`);

            // Track Cats result
            if (i === CATS_POSITION) {
                results.catsResult = 'SUCCESS';
                results.catsPosition = i;
                console.log('');
                console.log('========================================');
                console.log('✅ CATS BOOK SUCCEEDED!');
                console.log('========================================');
                console.log('');
                console.log('💡 CRITICAL FINDING:');
                console.log('   → Cats succeeded after shuffled sequence');
                console.log('   → SEQUENCE MATTERS!');
                console.log('   → Failure requires specific book order before Cats');
                console.log('');
                console.log('📌 CONCLUSION:');
                console.log('   The error is NOT just about:');
                console.log('   - Total book count (same 2019 books)');
                console.log('   - Time elapsed (similar duration)');
                console.log('   - Variety (same book diversity)');
                console.log('');
                console.log('   The error IS about:');
                console.log('   - Specific SEQUENCE of books');
                console.log('   - Amazon API state affected by book order');
                console.log('   - Specific combinations triggering the error');
                console.log('');
                console.log('========================================');
            }

        } catch (error) {
            results.failures++;
            console.log(`   ❌ FAILED: ${error.message}`);

            if (!results.firstFailureAt) {
                results.firstFailureAt = i;
            }

            results.failureDetails.push({
                position: i,
                asin: book.asin,
                title: book.title,
                error: error.message,
                elapsedMin
            });

            // Track Cats result
            if (i === CATS_POSITION) {
                results.catsResult = 'FAILURE';
                results.catsPosition = i;
                console.log('');
                console.log('========================================');
                console.log('❌ CATS BOOK FAILED!');
                console.log('========================================');
                console.log('');
                console.log('💡 CRITICAL FINDING:');
                console.log('   → Cats failed even after shuffled sequence');
                console.log('   → SEQUENCE DOES NOT MATTER!');
                console.log('   → Failure is about cumulative properties:');
                console.log('      - Total books processed (~2019)');
                console.log('      - Time elapsed (~144 min)');
                console.log('      - Variety of different books');
                console.log('');
                console.log('📌 CONCLUSION:');
                console.log('   Amazon API degrades after processing:');
                console.log('   - ~2019 different book ASINs (any order)');
                console.log('   - Over ~144 minutes duration');
                console.log('   - High variety of books');
                console.log('');
                console.log('   Recommendation:');
                console.log('   - Implement API cooldown after 1800 books');
                console.log('   - Pause 60 seconds to let API state reset');
                console.log('   - Continue fetch after cooldown');
                console.log('');
                console.log('========================================');
            }
        }

        // Progress updates every 50 books
        if ((i + 1) % 50 === 0) {
            const remainingBooks = testBooks.length - (i + 1);
            const remainingMin = Math.ceil((remainingBooks * (DELAY_MS + 1500)) / 1000 / 60);
            console.log(`📊 Progress: Book ${i + 1}/${testBooks.length} | ${elapsedMin}/${estimatedMinutes}min elapsed`);
            console.log(`   Remaining: ~${remainingMin}m | Successes: ${results.successes} | Failures: ${results.failures}`);
        }

        // Delay between requests (same as fetcher)
        if (i < testBooks.length - 1) {
            await new Promise(resolve => setTimeout(resolve, DELAY_MS));
        }
    }

    // Final results
    const totalDuration = Date.now() - startTime;
    const durationMin = Math.round(totalDuration / 1000 / 60);

    console.log('');
    console.log('========================================');
    console.log('📊 SHUFFLE TEST COMPLETE');
    console.log('========================================');
    console.log('');
    console.log('⏱️  TIMING:');
    console.log(`   Total duration: ${durationMin} minutes`);
    console.log('');
    console.log('📈 RESULTS:');
    console.log(`   Total books: ${testBooks.length}`);
    console.log(`   Successes: ${results.successes}`);
    console.log(`   Failures: ${results.failures}`);
    console.log('');
    console.log('🎯 CATS BOOK (Position 2019):');
    console.log(`   Result: ${results.catsResult || 'NOT REACHED'}`);
    console.log('');

    if (results.failures > 0) {
        console.log('❌ FAILURES:');
        results.failureDetails.forEach((f, idx) => {
            console.log(`   ${idx + 1}. Position ${f.position}: ${f.title.substring(0, 50)}`);
            console.log(`      ASIN: ${f.asin}`);
            console.log(`      Error: ${f.error}`);
            console.log(`      Time: ${f.elapsedMin} min`);
        });
        console.log('');
    }

    console.log('========================================');

    // Save results
    window.shuffleTestResults = results;
    console.log('📦 Results saved to: window.shuffleTestResults');
    console.log('');
}

// Instructions
console.log('');
console.log('========================================');
console.log('🔬 SHUFFLE SEQUENCE TEST (Test 7)');
console.log('========================================');
console.log('');
console.log('This test determines if book SEQUENCE matters.');
console.log('');
console.log('TO RUN:');
console.log('1. Paste this entire script into console');
console.log('2. Press Enter');
console.log('3. Run: testShuffleSequence();');
console.log('4. Select your amazon-library.json file in the picker');
console.log('5. Walk away - test runs for ~3 hours');
console.log('');
console.log('METHOD:');
console.log('- Shuffles books 0-2018 (before Cats)');
console.log('- Keeps books 2019+ in original order');
console.log('- Fetches in shuffled order with same timing');
console.log('- Tests if Cats still fails at position 2019');
console.log('');
console.log('OUTCOMES:');
console.log('- Cats succeeds → SEQUENCE matters (specific order triggers failure)');
console.log('- Cats fails → SEQUENCE does NOT matter (cumulative properties trigger failure)');
console.log('');
console.log('========================================');
