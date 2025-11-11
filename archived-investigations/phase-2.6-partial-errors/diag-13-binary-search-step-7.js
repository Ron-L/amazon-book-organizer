// Binary Search for Minimum Poison Threshold - Step 7
// Previous: [2036, 2037] = 2 books → FAILED (Cats failed)
// Next: Testing Cats ALONE to determine if inherently problematic
// Testing: [2037, 2037] = 1 book (Cats only)
// Run this in browser console on amazon.com/yourbooks AFTER PAGE REFRESH
// Script: diag-13-binary-search-step-7.js

const TARGET_VICTIM = {
    position: 2037,
    asin: 'B0085HN8N6',
    title: '99 Reasons to Hate Cats: Cartoons for Cat Lovers'
};

const TEST_RANGE = {
    start: 2037,
    end: 2037,
    totalBooks: 1
};

const PREVIOUS_TEST = {
    range: '[2036, 2037]',
    books: 2,
    result: 'FAILED (Cats failed)',
    reasoning: 'Even 1 book before Cats causes failure - testing Cats alone'
};

const DELAY_MS = 3000; // DO NOT CHANGE - working correctly

async function binarySearchStep7() {
    console.log('========================================');
    console.log('BINARY SEARCH - STEP 7 (CRITICAL TEST)');
    console.log('Script: diag-13-binary-search-step-7.js');
    console.log('========================================');
    console.log('');
    console.log('PREVIOUS TEST:');
    console.log(`   Range: ${PREVIOUS_TEST.range} = ${PREVIOUS_TEST.books} books`);
    console.log(`   Result: ${PREVIOUS_TEST.result}`);
    console.log(`   Reasoning: ${PREVIOUS_TEST.reasoning}`);
    console.log('');
    console.log('⚠️  CRITICAL TEST:');
    console.log('   Testing Cats ALONE (no prior books)');
    console.log('   This determines if Cats is:');
    console.log('   A) Inherently unenrichable via /kindle-reader-api');
    console.log('   B) Only fails when preceded by other books');
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
    console.log('[3/3] Fetching Cats ALONE...');
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

    // Fetch Cats
    const book = library.books[TARGET_VICTIM.position];
    const fetchStartTime = Date.now();

    console.log(`🎯 Fetching TARGET VICTIM: ${book.title} (${book.asin})`);
    console.log('');

    try {
        const result = await enrichBook(book.asin);
        const fetchDuration = ((Date.now() - fetchStartTime) / 1000).toFixed(1);
        successes++;

        console.log(`   ✅ ${fetchDuration}s - SUCCEEDED`);
        console.log(`      Description: ${result.description.length} chars`);
        console.log(`      Reviews: ${result.reviews}`);

    } catch (error) {
        const fetchDuration = ((Date.now() - fetchStartTime) / 1000).toFixed(1);
        failures++;
        victimFailed = true;
        victimError = error.message;

        const failureInfo = {
            position: TARGET_VICTIM.position,
            asin: book.asin,
            title: book.title,
            error: error.message,
            isVictim: true
        };
        allFailures.push(failureInfo);

        console.log(`   ❌ ${fetchDuration}s - FAILED`);
        console.log(`      Error: ${error.message}`);
    }

    const durationMs = Date.now() - startTime;
    const durationSec = Math.round(durationMs / 1000);

    console.log('');
    console.log('========================================');
    console.log('📊 STEP 7 RESULTS (CRITICAL)');
    console.log('========================================');
    console.log('');
    console.log(`⏱️  ACTUAL DURATION: ${durationSec} seconds`);
    console.log(`   Test ended at: ${new Date().toLocaleTimeString()}`);
    console.log('');

    console.log('🎯 TARGET VICTIM (Position 2037 - Cats):');
    console.log(`   Result: ${victimFailed ? '❌ FAILED' : '✅ SUCCEEDED'}`);
    if (victimFailed) {
        console.log(`   Error: ${victimError}`);
    }
    console.log('');

    // Analysis
    console.log('========================================');
    console.log('📋 CRITICAL ANALYSIS');
    console.log('========================================');
    console.log('');

    if (victimFailed) {
        console.log('❌ Cats FAILED when fetched ALONE');
        console.log('');
        console.log('🔍 CONCLUSION:');
        console.log('   Cats (ASIN B0085HN8N6) is INHERENTLY unenrichable');
        console.log('   via the /kindle-reader-api endpoint');
        console.log('');
        console.log('   This means:');
        console.log('   - NOT a cumulative poison issue');
        console.log('   - NOT dependent on prior books');
        console.log('   - This specific ASIN is problematic with this API');
        console.log('');
        console.log('💡 NEXT STEPS:');
        console.log('   1. Test with /digital-graphql/v1 endpoint (antidote test)');
        console.log('   2. Investigate other failing books (1251, 1649, 1784)');
        console.log('   3. Determine if they also fail when fetched alone');
    } else {
        console.log('✅ Cats SUCCEEDED when fetched ALONE');
        console.log('');
        console.log('🔍 CONCLUSION:');
        console.log('   Cats requires at least 1 prior book to fail');
        console.log('   Position 2036 book is the minimum poison trigger');
        console.log('');
        console.log('   This means:');
        console.log('   - Cumulative poison IS the issue');
        console.log('   - Position 2036 causes Cats to become unenrichable');
        console.log('   - Need to investigate position 2036 book characteristics');
        console.log('');
        console.log('💡 NEXT STEPS:');
        console.log('   1. Investigate position 2036 book');
        console.log('   2. Test other failing books (1251, 1649, 1784)');
        console.log('   3. Look for common patterns in poison books');
    }

    console.log('');
    console.log('========================================');

    // Save results
    const results = {
        step: 7,
        range: TEST_RANGE,
        previousTest: PREVIOUS_TEST,
        victim: TARGET_VICTIM,
        victimFailed,
        victimError,
        successes,
        failures,
        allFailures,
        durationSec,
        conclusion: victimFailed ? 'Cats is inherently unenrichable via /kindle-reader-api' : 'Cats needs prior books to fail - cumulative poison confirmed'
    };

    window.binarySearchStep7Results = results;
    console.log('📦 Results saved to: window.binarySearchStep7Results');
}

// Instructions
console.log('');
console.log('========================================');
console.log('🔬 BINARY SEARCH - STEP 7 (CRITICAL)');
console.log('========================================');
console.log('');
console.log('Testing: [2037, 2037] = 1 book (Cats ALONE)');
console.log('');
console.log('⚠️  This is the CRITICAL test that determines:');
console.log('   - Is Cats inherently unenrichable?');
console.log('   - OR does it need prior books to fail?');
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
console.log('ESTIMATED DURATION: ~1 second');
console.log('');
console.log('========================================');
console.log('');

// Auto-invoke the test
binarySearchStep7();
