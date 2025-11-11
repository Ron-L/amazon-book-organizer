// Antidote Test - Phase 0: Null Antidote (Baseline)
// Purpose: Confirm that repeated fetches don't clear failure state
// Tests: 5 consecutive Cats fetches with decreasing delays
// Expected: ALL 5 fetches should FAIL
// Run this in browser console on amazon.com/yourbooks AFTER PAGE REFRESH
// Script: antidote-test-00-null.js

const TARGET_VICTIM = {
    position: 2037,
    asin: 'B0085HN8N6',
    title: '99 Reasons to Hate Cats: Cartoons for Cat Lovers'
};

const PHASE_INFO = {
    phase: 0,
    name: 'Null Antidote (Baseline)',
    hypothesis: 'Repeated fetches with varying delays do NOT clear failure state',
    antidote: 'None - just repeat fetches',
    expectedOutcome: 'All 5 fetches FAIL - failure state is sticky'
};

const TEST_DELAYS = [
    { attempt: 1, delayMs: 3000, description: '3 seconds (diagnostic script standard)' },
    { attempt: 2, delayMs: 1500, description: '1.5 seconds (50% reduction)' },
    { attempt: 3, delayMs: 750, description: '0.75 seconds (50% reduction)' },
    { attempt: 4, delayMs: 375, description: '0.375 seconds (50% reduction)' },
    { attempt: 5, delayMs: 0, description: 'Back-to-back (no delay)' }
];

async function antidoteTest00() {
    console.log('========================================');
    console.log('ANTIDOTE TEST - PHASE 0');
    console.log('Script: antidote-test-00-null.js');
    console.log('========================================');
    console.log('');
    console.log('PHASE INFO:');
    console.log(`   Phase: ${PHASE_INFO.phase}`);
    console.log(`   Name: ${PHASE_INFO.name}`);
    console.log(`   Hypothesis: ${PHASE_INFO.hypothesis}`);
    console.log(`   Antidote: ${PHASE_INFO.antidote}`);
    console.log(`   Expected: ${PHASE_INFO.expectedOutcome}`);
    console.log('');
    console.log('TARGET VICTIM:');
    console.log(`   Position: ${TARGET_VICTIM.position}`);
    console.log(`   Title: ${TARGET_VICTIM.title}`);
    console.log(`   ASIN: ${TARGET_VICTIM.asin}`);
    console.log('');
    console.log('TEST PLAN:');
    console.log('   Fetch Cats 5 times with decreasing delays:');
    TEST_DELAYS.forEach(td => {
        console.log(`   ${td.attempt}. ${td.description}`);
    });
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

    // GraphQL query for enrichment (same as diagnostic scripts)
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

        return {
            ok: response.ok,
            status: response.status,
            statusText: response.statusText,
            data: response.ok ? await response.json() : null
        };
    };

    // Fetch Cats 5 times with decreasing delays
    console.log('[3/3] Testing repeated fetches...');
    console.log('');

    const testStartTime = Date.now();
    const book = library.books[TARGET_VICTIM.position];
    const results = [];

    for (let i = 0; i < TEST_DELAYS.length; i++) {
        const testDelay = TEST_DELAYS[i];
        const fetchStartTime = Date.now();

        console.log(`[${testDelay.attempt}/5] Fetch attempt ${testDelay.attempt}: ${testDelay.description}`);
        console.log(`   Fetching: ${book.title}`);
        console.log(`   ASIN: ${book.asin}`);

        try {
            const response = await enrichBook(book.asin);
            const fetchDuration = ((Date.now() - fetchStartTime) / 1000).toFixed(2);

            const result = {
                attempt: testDelay.attempt,
                delayMs: testDelay.delayMs,
                httpStatus: response.status,
                httpOk: response.ok,
                fetchDurationSec: parseFloat(fetchDuration),
                success: false,
                error: null,
                description: '',
                reviews: 0
            };

            if (!response.ok) {
                result.error = `HTTP ${response.status} ${response.statusText}`;
                console.log(`   ❌ ${fetchDuration}s - HTTP ERROR: ${response.status} ${response.statusText}`);
            } else {
                const data = response.data;

                if (data.errors) {
                    result.error = data.errors[0]?.message || 'GraphQL error';
                    console.log(`   ❌ ${fetchDuration}s - GraphQL ERROR: ${result.error}`);
                } else {
                    const product = data?.data?.getProducts?.[0];

                    if (!product) {
                        result.error = 'No product data returned';
                        console.log(`   ❌ ${fetchDuration}s - NO DATA: ${result.error}`);
                    } else {
                        // Success!
                        const descSection = product.description?.sections?.[0];
                        const descContent = descSection?.content;
                        let description = '';

                        if (typeof descContent === 'string') {
                            description = descContent;
                        } else if (descContent?.text) {
                            description = descContent.text;
                        }

                        const reviews = product.customerReviewsTop?.reviews || [];

                        result.success = true;
                        result.description = description;
                        result.reviews = reviews.length;

                        console.log(`   ✅ ${fetchDuration}s - SUCCESS!`);
                        console.log(`      Description: ${description.length} chars`);
                        console.log(`      Reviews: ${reviews.length}`);
                    }
                }
            }

            results.push(result);

        } catch (error) {
            const fetchDuration = ((Date.now() - fetchStartTime) / 1000).toFixed(2);
            const result = {
                attempt: testDelay.attempt,
                delayMs: testDelay.delayMs,
                httpStatus: null,
                httpOk: false,
                fetchDurationSec: parseFloat(fetchDuration),
                success: false,
                error: error.message,
                description: '',
                reviews: 0
            };
            results.push(result);
            console.log(`   ❌ ${fetchDuration}s - EXCEPTION: ${error.message}`);
        }

        console.log('');

        // Apply delay before next fetch (except after last one)
        if (i < TEST_DELAYS.length - 1) {
            const nextDelay = TEST_DELAYS[i + 1];
            if (nextDelay.delayMs > 0) {
                console.log(`   ⏳ Waiting ${nextDelay.delayMs}ms before next fetch...`);
                console.log('');
                await new Promise(resolve => setTimeout(resolve, nextDelay.delayMs));
            }
        }
    }

    const totalDurationMs = Date.now() - testStartTime;
    const totalDurationSec = Math.round(totalDurationMs / 1000);

    console.log('========================================');
    console.log('📊 PHASE 0 RESULTS');
    console.log('========================================');
    console.log('');
    console.log(`⏱️  TOTAL DURATION: ${totalDurationSec} seconds`);
    console.log(`   Test ended at: ${new Date().toLocaleTimeString()}`);
    console.log('');

    // Results summary
    const successes = results.filter(r => r.success).length;
    const failures = results.filter(r => !r.success).length;
    const httpErrors = results.filter(r => !r.httpOk).length;
    const graphqlErrors = results.filter(r => r.httpOk && r.error && r.error.includes('Customer Id')).length;

    console.log('📋 FETCH RESULTS:');
    results.forEach(r => {
        const statusIcon = r.success ? '✅' : '❌';
        const statusText = r.success ? 'SUCCESS' : 'FAILED';
        console.log(`   ${statusIcon} Attempt ${r.attempt} (${r.delayMs}ms delay): ${statusText}`);
        if (!r.success) {
            console.log(`      HTTP: ${r.httpStatus || 'N/A'}, Error: ${r.error}`);
        } else {
            console.log(`      Description: ${r.description.length} chars, Reviews: ${r.reviews}`);
        }
    });
    console.log('');

    console.log('📊 SUMMARY:');
    console.log(`   Total fetches: ${results.length}`);
    console.log(`   Successes: ${successes}`);
    console.log(`   Failures: ${failures}`);
    console.log(`   HTTP errors: ${httpErrors}`);
    console.log(`   GraphQL "Customer Id" errors: ${graphqlErrors}`);
    console.log('');

    // Analysis
    console.log('========================================');
    console.log('📋 ANALYSIS');
    console.log('========================================');
    console.log('');

    if (failures === 5) {
        console.log('✅ HYPOTHESIS CONFIRMED');
        console.log('   All 5 fetches FAILED as expected');
        console.log('');
        console.log('🔍 CONCLUSIONS:');
        console.log('   - Failure state is STICKY');
        console.log('   - Timing/delays do NOT clear the failure');
        console.log('   - Repeated fetches do NOT act as antidote');
        console.log('   - HTTP status remains 200 (no rate limiting)');
        console.log('');
        console.log('💡 NEXT STEPS:');
        console.log('   Proceed to Phase 1: Test different endpoint antidote');
    } else if (successes === 5) {
        console.log('❌ UNEXPECTED: All 5 fetches SUCCEEDED');
        console.log('');
        console.log('🔍 CONCLUSIONS:');
        console.log('   - Cats is NOT inherently broken with this endpoint');
        console.log('   - Something about page refresh cleared the issue');
        console.log('   - Need to re-evaluate Step 7 results');
        console.log('');
        console.log('💡 NEXT STEPS:');
        console.log('   1. Re-run Step 7 to confirm Cats failure');
        console.log('   2. Investigate what makes Cats succeed vs fail');
    } else if (successes > 0 && failures > 0) {
        console.log('⚠️  MIXED RESULTS: Some succeeded, some failed');
        console.log('');
        console.log('🔍 CONCLUSIONS:');
        console.log('   - Failure state may be timing-dependent');
        console.log('   - OR failure state can be cleared by repetition');
        console.log('   - Need to analyze which attempts succeeded');
        console.log('');

        const firstSuccess = results.find(r => r.success);
        if (firstSuccess) {
            console.log(`   First success at attempt ${firstSuccess.attempt} (${firstSuccess.delayMs}ms delay)`);
        }

        console.log('');
        console.log('💡 NEXT STEPS:');
        console.log('   1. Re-run Phase 0 to see if pattern repeats');
        console.log('   2. Investigate timing patterns');
    }

    console.log('');
    console.log('========================================');

    // Save results
    const phaseResults = {
        phase: 0,
        phaseInfo: PHASE_INFO,
        victim: TARGET_VICTIM,
        testDelays: TEST_DELAYS,
        fetchResults: results,
        summary: {
            totalFetches: results.length,
            successes,
            failures,
            httpErrors,
            graphqlErrors
        },
        totalDurationSec,
        hypothesisConfirmed: (failures === 5)
    };

    window.antidoteTest00Results = phaseResults;
    console.log('📦 Results saved to: window.antidoteTest00Results');
}

// Instructions
console.log('');
console.log('========================================');
console.log('🔬 ANTIDOTE TEST - PHASE 0 (NULL)');
console.log('========================================');
console.log('');
console.log('Purpose: Confirm repeated fetches don\'t clear failure');
console.log('');
console.log('This will fetch Cats 5 times with decreasing delays:');
console.log('   1. 3000ms delay (diagnostic standard)');
console.log('   2. 1500ms delay (50% reduction)');
console.log('   3. 750ms delay (50% reduction)');
console.log('   4. 375ms delay (50% reduction)');
console.log('   5. 0ms delay (back-to-back)');
console.log('');
console.log('Expected: ALL 5 should FAIL');
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
console.log('ESTIMATED DURATION: ~10 seconds');
console.log('');
console.log('========================================');
console.log('');

// Auto-invoke the test
antidoteTest00();
