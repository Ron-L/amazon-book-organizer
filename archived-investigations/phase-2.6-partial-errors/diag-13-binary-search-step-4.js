// Binary Search for Minimum Poison Threshold - Step 4
// Previous: [2020, 2037] = 18 books → FAILED (Cats failed)
// Next: 18 × 0.5 = 9 books
// Testing: [2029, 2037] = 9 books
// Run this in browser console on amazon.com/yourbooks AFTER PAGE REFRESH
// Script: diag-13-binary-search-step-4.js

const TARGET_VICTIM = {
    position: 2037,
    asin: 'B0085HN8N6',
    title: '99 Reasons to Hate Cats: Cartoons for Cat Lovers'
};

const TEST_RANGE = {
    start: 2029,
    end: 2037,
    totalBooks: 9
};

const PREVIOUS_TEST = {
    range: '[2020, 2037]',
    books: 18,
    result: 'FAILED (Cats failed)',
    multiplier: 0.5,
    reasoning: 'Error occurred, so reduce range by 0.5'
};

const DELAY_MS = 3000; // DO NOT CHANGE - working correctly

async function binarySearchStep4() {
    console.log('========================================');
    console.log('BINARY SEARCH - STEP 4');
    console.log('Script: diag-13-binary-search-step-4.js');
    console.log('========================================');
    console.log('');
    console.log('PREVIOUS TEST:');
    console.log(`   Range: ${PREVIOUS_TEST.range} = ${PREVIOUS_TEST.books} books`);
    console.log(`   Result: ${PREVIOUS_TEST.result}`);
    console.log(`   Action: ${PREVIOUS_TEST.books} × ${PREVIOUS_TEST.multiplier} = ${TEST_RANGE.totalBooks} books`);
    console.log(`   Reasoning: ${PREVIOUS_TEST.reasoning}`);
    console.log('');
    console.log('CURRENT TEST:');
    console.log(`   Range: [${TEST_RANGE.start}, ${TEST_RANGE.end}] = ${TEST_RANGE.totalBooks} books`);
    console.log('');
    console.log('TARGET VICTIM:');
    console.log(`   Position: ${TARGET_VICTIM.position}`);
    console.log(`   Title: ${TARGET_VICTIM.title}`);
    console.log(`   ASIN: ${TARGET_VICTIM.asin}`);
    console.log('');

    // Load library from file
    console.log('[1/3] Loading library file...');
    console.log('');
    console.log('   📂 A file picker dialog will open...');
    console.log('   → Select your amazon-library.json file');
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
        return;
    }

    console.log(`   ✅ File selected: ${file.name}`);

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
        return;
    }

    console.log(`   ✅ Library loaded: ${library.books.length} books`);
    console.log('');

    // Get CSRF token
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

    // Fetch books in range
    console.log('[3/3] Fetching books...');
    console.log('');

    const startTime = Date.now();
    console.log(`   Test started at: ${new Date(startTime).toLocaleTimeString()}`);
    console.log('');

    let successes = 0;
    let failures = 0;
    let victimFailed = false;
    let victimError = null;
    let allFailures = [];

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

    // Fetch books in range
    for (let i = TEST_RANGE.start; i <= TEST_RANGE.end; i++) {
        const book = library.books[i];
        const isVictim = (i === TARGET_VICTIM.position);
        const progressNum = i - TEST_RANGE.start + 1;
        const percentComplete = Math.round((progressNum / TEST_RANGE.totalBooks) * 100);

        // Progress bar
        const barLength = 20;
        const filled = Math.round((progressNum / TEST_RANGE.totalBooks) * barLength);
        const bar = '█'.repeat(filled) + '░'.repeat(barLength - filled);

        const fetchStartTime = Date.now();

        // Print what we're fetching
        console.log(`[${progressNum}/${TEST_RANGE.totalBooks}] ${bar} ${percentComplete}% | Pos ${i}: ${book.title.substring(0, 40)}... (${book.asin})`);

        try {
            const result = await enrichBook(book.asin);
            const fetchDuration = ((Date.now() - fetchStartTime) / 1000).toFixed(1);
            successes++;

            console.log(`   ✅ ${fetchDuration}s - ${result.description.length} chars, ${result.reviews} reviews${isVictim ? ' 🎯 TARGET VICTIM' : ''}`);

        } catch (error) {
            const fetchDuration = ((Date.now() - fetchStartTime) / 1000).toFixed(1);
            failures++;

            const failureInfo = {
                position: i,
                asin: book.asin,
                title: book.title,
                error: error.message,
                isVictim
            };
            allFailures.push(failureInfo);

            console.log(`   ❌ ${fetchDuration}s - ${error.message}${isVictim ? ' 🎯 TARGET VICTIM' : ''}`);

            if (isVictim) {
                victimFailed = true;
                victimError = error.message;
            }
        }

        // Delay between requests (except after last book)
        if (i < TEST_RANGE.end) {
            await new Promise(resolve => setTimeout(resolve, DELAY_MS));
        }
    }

    const durationMs = Date.now() - startTime;
    const durationMin = Math.round(durationMs / 1000 / 60);
    const durationSec = Math.round(durationMs / 1000);
    const avgSecondsPerBook = (durationSec / TEST_RANGE.totalBooks).toFixed(1);

    console.log('');
    console.log('========================================');
    console.log('📊 STEP 4 RESULTS');
    console.log('========================================');
    console.log('');
    console.log(`⏱️  ACTUAL DURATION: ${durationMin} minutes (${durationSec} seconds)`);
    console.log(`   Average: ${avgSecondsPerBook} seconds per book`);
    console.log(`   Test ended at: ${new Date().toLocaleTimeString()}`);
    console.log(`   Total books: ${TEST_RANGE.totalBooks}`);
    console.log(`   Successes: ${successes}`);
    console.log(`   Failures: ${failures}`);
    console.log('');

    // Report ALL failures
    if (allFailures.length > 0) {
        console.log('❌ ALL FAILURES:');
        allFailures.forEach((f, idx) => {
            const victimTag = f.isVictim ? ' 🎯 TARGET VICTIM' : '';
            console.log(`   ${idx + 1}. Position ${f.position}:${victimTag}`);
            console.log(`      Title: ${f.title.substring(0, 60)}...`);
            console.log(`      ASIN: ${f.asin}`);
            console.log(`      Error: ${f.error}`);
        });
        console.log('');
    }

    console.log('🎯 TARGET VICTIM (Position 2037 - Cats):');
    console.log(`   Result: ${victimFailed ? '❌ FAILED' : '✅ SUCCEEDED'}`);
    if (victimFailed) {
        console.log(`   Error: ${victimError}`);
    }
    console.log('');

    // Next step calculation
    console.log('========================================');
    console.log('📋 NEXT STEP');
    console.log('========================================');
    console.log('');

    if (victimFailed) {
        const nextSize = Math.round(TEST_RANGE.totalBooks * 0.5);
        const nextStart = TARGET_VICTIM.position - nextSize + 1;
        console.log(`✅ Cats FAILED - Error reproduced`);
        console.log('');
        console.log(`   Action: Reduce range by 0.5`);
        console.log(`   Calculation: ${TEST_RANGE.totalBooks} × 0.5 = ${nextSize} books`);
        console.log(`   Next range: [${nextStart}, ${TARGET_VICTIM.position}]`);
        console.log('');
        console.log('🔍 NEXT ACTION:');
        console.log('   1. Refresh page');
        console.log('   2. Report to Claude: "Step 4 FAILED (victim failed)"');
        console.log('   3. Claude will provide next script');
    } else {
        const nextSize = Math.round(TEST_RANGE.totalBooks * 1.5);
        const nextStart = TARGET_VICTIM.position - nextSize + 1;
        console.log(`⚠️  Cats SUCCEEDED - Error NOT reproduced`);
        console.log('');
        console.log(`   Action: Increase range by 1.5`);
        console.log(`   Calculation: ${TEST_RANGE.totalBooks} × 1.5 = ${nextSize} books`);
        console.log(`   Next range: [${nextStart}, ${TARGET_VICTIM.position}]`);
        console.log('');
        console.log('🔍 NEXT ACTION:');
        console.log('   1. Refresh page');
        console.log('   2. Report to Claude: "Step 4 SUCCEEDED (victim succeeded)"');
        console.log('   3. Claude will provide next script');
    }

    console.log('');
    console.log('========================================');

    // Save results
    const results = {
        step: 4,
        range: TEST_RANGE,
        previousTest: PREVIOUS_TEST,
        victim: TARGET_VICTIM,
        victimFailed,
        victimError,
        successes,
        failures,
        allFailures,
        durationMin,
        durationSec,
        avgSecondsPerBook: parseFloat(avgSecondsPerBook)
    };

    window.binarySearchStep4Results = results;
    console.log('📦 Results saved to: window.binarySearchStep4Results');
}

// Instructions
console.log('');
console.log('========================================');
console.log('🔬 BINARY SEARCH - STEP 4');
console.log('========================================');
console.log('');
console.log('Testing: [2029, 2037] = 9 books');
console.log('');
console.log('PREREQUISITES:');
console.log('✅ Fresh page refresh completed');
console.log('✅ On amazon.com/yourbooks');
console.log('✅ Have amazon-library.json file ready');
console.log('');
console.log('READY TO RUN!');
console.log('   Script loaded successfully.');
console.log('   Starting test automatically...');
console.log('');
console.log('ESTIMATED DURATION: ~30 seconds');
console.log('');
console.log('========================================');
console.log('');

// Auto-invoke the test
binarySearchStep4();
