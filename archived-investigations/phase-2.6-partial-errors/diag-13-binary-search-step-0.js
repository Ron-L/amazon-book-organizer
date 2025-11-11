// Binary Search for Minimum Poison Threshold - Step 0 (Baseline Confirmation)
// Tests: Does [1809, 2321] cause position 2037 (Cats) to fail in isolation?
// Run this in browser console on amazon.com/yourbooks AFTER PAGE REFRESH
// Script: diag-13-binary-search-step-0.js

const TARGET_VICTIM = {
    position: 2037,
    asin: 'B0085HN8N6',
    title: '99 Reasons to Hate Cats: Cartoons for Cat Lovers'
};

const TEST_RANGE = {
    start: 1809,
    end: 2321,
    totalBooks: 513
};

const DELAY_MS = 3000; // Match full fetch timing

async function binarySearchStep0() {
    console.log('========================================');
    console.log('BINARY SEARCH - STEP 0 (Baseline)');
    console.log('Script: diag-13-binary-search-step-0.js');
    console.log('========================================');
    console.log('');
    console.log('PURPOSE:');
    console.log('   Confirm Iteration 10 result is reproducible after page refresh');
    console.log('');
    console.log('RANGE:');
    console.log(`   Start: ${TEST_RANGE.start}`);
    console.log(`   End: ${TEST_RANGE.end}`);
    console.log(`   Total books: ${TEST_RANGE.totalBooks}`);
    console.log('');
    console.log('TARGET VICTIM:');
    console.log(`   Position: ${TARGET_VICTIM.position}`);
    console.log(`   Title: ${TARGET_VICTIM.title}`);
    console.log(`   ASIN: ${TARGET_VICTIM.asin}`);
    console.log('');
    console.log('EXPECTED:');
    console.log('   Position 2037 (Cats) should FAIL');
    console.log('   This confirms poison threshold is within this range');
    console.log('');

    // Step 0: Load library from file
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

    // Step 2: Fetch books in range
    console.log('[3/3] Fetching books...');
    console.log('');

    const startTime = Date.now();
    const estimatedMinutes = Math.ceil((TEST_RANGE.totalBooks * (DELAY_MS + 1500)) / 1000 / 60);
    console.log(`   Estimated time: ~${estimatedMinutes} minutes`);
    console.log('');

    let successes = 0;
    let failures = 0;
    let victimFailed = false;
    let victimError = null;

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

    // Fetch books in range
    for (let i = TEST_RANGE.start; i <= TEST_RANGE.end; i++) {
        const book = library.books[i];
        const isVictim = (i === TARGET_VICTIM.position);
        const progressNum = i - TEST_RANGE.start + 1;

        // Progress indicator every 50 books or for victim
        if (progressNum % 50 === 0 || isVictim) {
            const percentComplete = Math.round((progressNum / TEST_RANGE.totalBooks) * 100);
            console.log(`   [${progressNum}/${TEST_RANGE.totalBooks}] Progress: ${percentComplete}%`);
        }

        if (isVictim) {
            console.log('');
            console.log('   🎯 TARGET VICTIM REACHED:');
            console.log(`      Position: ${i}`);
            console.log(`      Title: ${book.title}`);
            console.log(`      ASIN: ${book.asin}`);
            console.log('');
        }

        try {
            const result = await enrichBook(book.asin);
            successes++;

            if (isVictim) {
                console.log(`      ✅ VICTIM SUCCEEDED: ${result.description.length} chars, ${result.reviews} reviews`);
                console.log('');
            }

        } catch (error) {
            failures++;

            if (isVictim) {
                victimFailed = true;
                victimError = error.message;
                console.log(`      ❌ VICTIM FAILED: ${error.message}`);
                console.log('');
            } else {
                console.log(`   ❌ FAILURE at position ${i}: ${book.title.substring(0, 50)}...`);
                console.log(`      ASIN: ${book.asin}`);
                console.log(`      Error: ${error.message}`);
            }
        }

        // Delay between requests (except after last book)
        if (i < TEST_RANGE.end) {
            await new Promise(resolve => setTimeout(resolve, DELAY_MS));
        }
    }

    const duration = Math.round((Date.now() - startTime) / 1000 / 60);

    console.log('');
    console.log('========================================');
    console.log('📊 STEP 0 RESULTS');
    console.log('========================================');
    console.log('');
    console.log(`⏱️  Duration: ${duration} minutes`);
    console.log(`   Total books: ${TEST_RANGE.totalBooks}`);
    console.log(`   Successes: ${successes}`);
    console.log(`   Failures: ${failures}`);
    console.log('');
    console.log('🎯 TARGET VICTIM (Position 2037 - Cats):');
    console.log(`   Result: ${victimFailed ? '❌ FAILED' : '✅ SUCCEEDED'}`);
    if (victimFailed) {
        console.log(`   Error: ${victimError}`);
    }
    console.log('');

    // Decision tree
    console.log('========================================');
    console.log('📋 NEXT STEPS');
    console.log('========================================');
    console.log('');

    if (victimFailed) {
        console.log('✅ BASELINE CONFIRMED!');
        console.log('');
        console.log('   Victim failed as expected.');
        console.log('   Poison threshold exists within this range.');
        console.log('');
        console.log('🔍 NEXT ACTION:');
        console.log('   1. Refresh page');
        console.log('   2. Report to Claude: "Step 0 FAILED (victim failed)"');
        console.log('   3. Claude will provide binary search Step 1 script');
        console.log('');
        console.log('   Binary search will narrow down the 256-book range');
        console.log('   between Iteration 9 [2065, 2321] and this test.');
    } else {
        console.log('⚠️ UNEXPECTED RESULT!');
        console.log('');
        console.log('   Victim SUCCEEDED (expected to fail).');
        console.log('   This means either:');
        console.log('   1. Prior iterations ARE required (cumulative across sessions)');
        console.log('   2. Timing/fresh page state affects poison buildup');
        console.log('   3. Test 12 results were session-specific');
        console.log('');
        console.log('🔍 NEXT ACTION:');
        console.log('   1. Report to Claude: "Step 0 SUCCEEDED (victim succeeded)"');
        console.log('   2. Discuss implications and alternative investigation paths');
    }

    console.log('');
    console.log('========================================');

    // Save results
    const results = {
        step: 0,
        range: TEST_RANGE,
        victim: TARGET_VICTIM,
        victimFailed,
        victimError,
        successes,
        failures,
        durationMin: duration
    };

    window.binarySearchStep0Results = results;
    console.log('📦 Results saved to: window.binarySearchStep0Results');
}

// Instructions
console.log('');
console.log('========================================');
console.log('🔬 BINARY SEARCH - STEP 0');
console.log('========================================');
console.log('');
console.log('This script tests if range [1809, 2321] causes Cats to fail');
console.log('after a fresh page refresh.');
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
console.log('DURATION: ~30 minutes');
console.log('');
console.log('========================================');
console.log('');

// Auto-invoke the test
binarySearchStep0();
