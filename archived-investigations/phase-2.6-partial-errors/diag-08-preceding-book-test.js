// Diagnostic script to test if PRECEDING book triggers failure
// Tests: Does the book immediately BEFORE the failing book set up the failure?
// Run this in browser console on amazon.com/yourbooks
// Script: diag-08-preceding-book-test.js

const TEST_PAIRS = [
    { name: 'Cats Pair', positions: [2036, 2037] },           // Exponential Apocalypse → Cats
    { name: 'Queen 1 Pair', positions: [2320, 2321] },        // Book before Queen's Ransom → Queen's Ransom
    { name: 'Queen 2 Pair', positions: [2321, 2322] }         // Queen's Ransom → To Ruin A Queen
];

const DELAY_MS = 3000; // 3 seconds between requests

async function testPrecedingBookTrigger() {
    console.log('========================================');
    console.log('PRECEDING BOOK TRIGGER TEST (Test 8b)');
    console.log('Script: diag-08-preceding-book-test.js');
    console.log('========================================');
    console.log('');
    console.log('HYPOTHESIS:');
    console.log('   Does the book IMMEDIATELY BEFORE a failing book');
    console.log('   set up the failure condition in Amazon API?');
    console.log('');
    console.log('METHOD:');
    console.log('   Test each failing book with its immediate predecessor:');
    console.log('   1. Cats (2037) with book at 2036');
    console.log('   2. Queen\'s Ransom (2321) with book at 2320');
    console.log('   3. To Ruin A Queen (2322) with book at 2321 (Queen\'s Ransom)');
    console.log('');
    console.log('EXPECTED:');
    console.log('   If hypothesis is TRUE: All 3 pairs will fail on 2nd book');
    console.log('   If hypothesis is FALSE: Failures are random or cumulative');
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

    // Step 2: Test each pair
    console.log('[3/3] Testing book pairs...');
    console.log('');

    const startTime = Date.now();
    const results = {
        pairs: [],
        patternsFound: {
            allFailOnSecond: true,
            anySuccessOnSecond: false
        }
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

    // Test each pair
    for (let pairIdx = 0; pairIdx < TEST_PAIRS.length; pairIdx++) {
        const pair = TEST_PAIRS[pairIdx];
        const [pos1, pos2] = pair.positions;
        const book1 = library.books[pos1];
        const book2 = library.books[pos2];

        console.log('========================================');
        console.log(`PAIR ${pairIdx + 1}/3: ${pair.name}`);
        console.log('========================================');
        console.log(`   Position ${pos1}: ${book1.title}`);
        console.log(`   Position ${pos2}: ${book2.title}`);
        console.log('');

        const pairResult = {
            name: pair.name,
            positions: pair.positions,
            book1: { position: pos1, title: book1.title, asin: book1.asin, result: null },
            book2: { position: pos2, title: book2.title, asin: book2.asin, result: null }
        };

        // Test book 1 (preceding book)
        console.log(`   [1/2] Testing book at position ${pos1}:`);
        console.log(`         ${book1.title.substring(0, 60)}...`);
        console.log(`         ASIN: ${book1.asin}`);

        try {
            const result = await enrichBook(book1.asin);
            pairResult.book1.result = 'SUCCESS';
            pairResult.book1.description = result.description.length;
            pairResult.book1.reviews = result.reviews;
            console.log(`         ✅ SUCCESS: ${result.description.length} chars, ${result.reviews} reviews`);
        } catch (error) {
            pairResult.book1.result = 'FAILURE';
            pairResult.book1.error = error.message;
            console.log(`         ❌ FAILED: ${error.message}`);
        }

        console.log('');

        // Delay before second book
        await new Promise(resolve => setTimeout(resolve, DELAY_MS));

        // Test book 2 (potentially failing book)
        console.log(`   [2/2] Testing book at position ${pos2}:`);
        console.log(`         ${book2.title.substring(0, 60)}...`);
        console.log(`         ASIN: ${book2.asin}`);
        console.log(`         🎯 This book historically fails in full fetch`);

        try {
            const result = await enrichBook(book2.asin);
            pairResult.book2.result = 'SUCCESS';
            pairResult.book2.description = result.description.length;
            pairResult.book2.reviews = result.reviews;
            console.log(`         ✅ SUCCESS: ${result.description.length} chars, ${result.reviews} reviews`);

            results.patternsFound.allFailOnSecond = false;
            results.patternsFound.anySuccessOnSecond = true;
        } catch (error) {
            pairResult.book2.result = 'FAILURE';
            pairResult.book2.error = error.message;
            console.log(`         ❌ FAILED: ${error.message}`);
        }

        console.log('');
        console.log('---');
        console.log(`📊 PAIR ${pairIdx + 1} RESULTS:`);
        console.log(`   Book 1 (${pos1}): ${pairResult.book1.result}`);
        console.log(`   Book 2 (${pos2}): ${pairResult.book2.result}`);
        console.log('');

        results.pairs.push(pairResult);

        // Delay before next pair (unless last pair)
        if (pairIdx < TEST_PAIRS.length - 1) {
            console.log('   ⏳ Waiting 5 seconds before next pair...');
            console.log('');
            await new Promise(resolve => setTimeout(resolve, 5000));
        }
    }

    // Final analysis
    const totalDuration = Math.round((Date.now() - startTime) / 1000);

    console.log('========================================');
    console.log('📊 PRECEDING BOOK TEST COMPLETE');
    console.log('========================================');
    console.log('');
    console.log('⏱️  TIMING:');
    console.log(`   Total duration: ${totalDuration} seconds`);
    console.log('');

    console.log('📈 RESULTS SUMMARY:');
    results.pairs.forEach((pair, idx) => {
        console.log(`   Pair ${idx + 1} (${pair.name}):`);
        console.log(`      Book 1 (${pair.positions[0]}): ${pair.book1.result}`);
        console.log(`      Book 2 (${pair.positions[1]}): ${pair.book2.result} ${pair.book2.result === 'FAILURE' ? '← FAILED!' : ''}`);
    });
    console.log('');

    // Pattern analysis
    console.log('🔍 PATTERN ANALYSIS:');
    console.log('');

    const failuresOnSecond = results.pairs.filter(p => p.book2.result === 'FAILURE').length;
    const successesOnSecond = results.pairs.filter(p => p.book2.result === 'SUCCESS').length;

    if (results.patternsFound.allFailOnSecond) {
        console.log('✅ HYPOTHESIS CONFIRMED!');
        console.log('   → ALL second books FAILED');
        console.log('   → The preceding book DOES trigger the failure');
        console.log('');
        console.log('💡 CRITICAL FINDING:');
        console.log('   The book IMMEDIATELY BEFORE causes API state corruption');
        console.log('   that makes the NEXT book fail.');
        console.log('');
        console.log('📌 IMPLICATION:');
        console.log('   - Not cumulative (total books processed)');
        console.log('   - Not time-based');
        console.log('   - Specific book → next book transition triggers failure');
        console.log('   - These 3 specific books have problematic predecessors');
        console.log('');
        console.log('🎯 NEXT STEPS:');
        console.log('   1. Examine the 3 preceding books for common properties');
        console.log('   2. Test if inserting different books before Cats prevents failure');
        console.log('   3. Investigate what makes these specific books toxic');
        console.log('');
    } else if (failuresOnSecond > 0 && successesOnSecond > 0) {
        console.log('⚠️ MIXED RESULTS');
        console.log(`   → ${failuresOnSecond}/3 second books FAILED`);
        console.log(`   → ${successesOnSecond}/3 second books SUCCEEDED`);
        console.log('');
        console.log('💡 FINDING:');
        console.log('   The preceding book hypothesis is PARTIALLY true.');
        console.log('   Some pairs trigger failure, others don\'t.');
        console.log('');
        console.log('📌 POSSIBLE EXPLANATIONS:');
        console.log('   1. Time-dependent: API state resets between pairs');
        console.log('   2. Order-dependent: Early pairs succeed, later pairs fail');
        console.log('   3. Specific combinations: Only certain book pairs trigger failure');
        console.log('');
    } else if (results.patternsFound.anySuccessOnSecond) {
        console.log('❌ HYPOTHESIS DISPROVEN');
        console.log('   → ALL second books SUCCEEDED');
        console.log('   → The preceding book does NOT trigger failure');
        console.log('');
        console.log('💡 FINDING:');
        console.log('   Failures require more context than just the preceding book.');
        console.log('   Likely cumulative state over many books.');
        console.log('');
        console.log('📌 BACK TO:');
        console.log('   - Cumulative theory (total books processed)');
        console.log('   - Time-based degradation');
        console.log('   - Amazon server-side state variation');
        console.log('');
    }

    console.log('========================================');

    // Save results
    window.precedingBookTestResults = results;
    console.log('📦 Results saved to: window.precedingBookTestResults');
    console.log('');
}

// Instructions
console.log('');
console.log('========================================');
console.log('🔬 PRECEDING BOOK TRIGGER TEST (Test 8b)');
console.log('========================================');
console.log('');
console.log('This test checks if the book BEFORE a failing book triggers the failure.');
console.log('');
console.log('READY TO RUN!');
console.log('   Script loaded successfully.');
console.log('   Starting test automatically...');
console.log('');
console.log('TESTS:');
console.log('- Pair 1: Book 2036 → Cats (2037)');
console.log('- Pair 2: Book 2320 → Queen\'s Ransom (2321)');
console.log('- Pair 3: Queen\'s Ransom (2321) → To Ruin A Queen (2322)');
console.log('');
console.log('DURATION: ~30 seconds total');
console.log('');
console.log('========================================');
console.log('');

// Auto-invoke the test
testPrecedingBookTrigger();
