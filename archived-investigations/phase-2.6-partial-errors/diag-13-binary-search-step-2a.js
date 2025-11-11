// Binary Search for Minimum Poison Threshold - Step 2A (VERBOSE)
// Tests: Does [2001, 2321] cause position 2037 (Cats) to fail?
// Run this in browser console on amazon.com/yourbooks AFTER PAGE REFRESH
// Script: diag-13-binary-search-step-2a.js
// CHANGE: Shows detailed output for EVERY fetch to analyze timing

const TARGET_VICTIM = {
    position: 2037,
    asin: 'B0085HN8N6',
    title: '99 Reasons to Hate Cats: Cartoons for Cat Lovers'
};

const TEST_RANGE = {
    start: 2001,
    end: 2321,
    totalBooks: 321
};

const SEARCH_BOUNDS = {
    lowerBound: { start: 2065, end: 2321, books: 257, result: 'SUCCESS' },
    upperBound: { start: 1937, end: 2321, books: 385, result: 'FAILED' }
};

const DELAY_MS = 3000; // Match full fetch timing (DO NOT CHANGE - working as-is)

async function binarySearchStep2A() {
    console.log('========================================');
    console.log('BINARY SEARCH - STEP 2A (VERBOSE)');
    console.log('Script: diag-13-binary-search-step-2a.js');
    console.log('========================================');
    console.log('');
    console.log('SEARCH PROGRESS:');
    console.log(`   Lower bound: [${SEARCH_BOUNDS.lowerBound.start}, ${SEARCH_BOUNDS.lowerBound.end}] = ${SEARCH_BOUNDS.lowerBound.books} books → ${SEARCH_BOUNDS.lowerBound.result}`);
    console.log(`   Upper bound: [${SEARCH_BOUNDS.upperBound.start}, ${SEARCH_BOUNDS.upperBound.end}] = ${SEARCH_BOUNDS.upperBound.books} books → ${SEARCH_BOUNDS.upperBound.result}`);
    console.log(`   Testing midpoint: [${TEST_RANGE.start}, ${TEST_RANGE.end}] = ${TEST_RANGE.totalBooks} books`);
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
    console.log(`   Test started at: ${new Date(startTime).toLocaleTimeString()}`);
    console.log('');

    let successes = 0;
    let failures = 0;
    let victimFailed = false;
    let victimError = null;
    let allFailures = []; // Track ALL failures, not just victim

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
        const percentComplete = Math.round((progressNum / TEST_RANGE.totalBooks) * 100);

        // Progress bar
        const barLength = 20;
        const filled = Math.round((progressNum / TEST_RANGE.totalBooks) * barLength);
        const bar = '█'.repeat(filled) + '░'.repeat(barLength - filled);

        const fetchStartTime = Date.now();

        // ALWAYS print what we're fetching
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
    console.log('📊 STEP 2A RESULTS');
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

    console.log('========================================');

    // Save results
    const results = {
        step: '2A',
        range: TEST_RANGE,
        victim: TARGET_VICTIM,
        victimFailed,
        victimError,
        successes,
        failures,
        allFailures,
        durationMin,
        durationSec,
        avgSecondsPerBook: parseFloat(avgSecondsPerBook),
        searchBounds: SEARCH_BOUNDS
    };

    window.binarySearchStep2AResults = results;
    console.log('📦 Results saved to: window.binarySearchStep2AResults');
}

// Instructions
console.log('');
console.log('========================================');
console.log('🔬 BINARY SEARCH - STEP 2A (VERBOSE)');
console.log('========================================');
console.log('');
console.log('This script tests if range [2001, 2321] causes Cats to fail.');
console.log('');
console.log('CHANGE FROM STEP 2:');
console.log('- Shows detailed output for EVERY fetch');
console.log('- Displays progress bar');
console.log('- Shows individual fetch duration');
console.log('- Helps diagnose timing issues');
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
console.log('ESTIMATED DURATION: ~2-5 minutes');
console.log('');
console.log('========================================');
console.log('');

// Auto-invoke the test
binarySearchStep2A();
