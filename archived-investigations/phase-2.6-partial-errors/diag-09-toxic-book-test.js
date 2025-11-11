// Diagnostic script to test if "Exponential Apocalypse" is universally toxic
// Tests: Does the book that triggers Cats failure also trigger Queens failures?
// Run this in browser console on amazon.com/yourbooks
// Script: diag-09-toxic-book-test.js

// Hardcoded book data (from Test 8b results)
const TOXIC_BOOK = {
    asin: 'B002PDOQFA',
    title: 'Exponential Apocalypse',
    position: 2036
};

const TEST_VICTIMS = [
    { name: 'Cats', asin: 'B0085HN8N6', title: '99 Reasons to Hate Cats: Cartoons for Cat Lovers', position: 2037 },
    { name: 'Queen 1', asin: '0425197484', title: 'Undead and Unemployed (Queen Betsy, Book 2)', position: 2321 },
    { name: 'Queen 2', asin: 'B000EUKR1S', title: 'Undead and Unappreciated (Queen Betsy, Book 3)', position: 2322 }
];

const DELAY_MS = 3000; // 3 seconds between requests

async function testToxicBook() {
    console.log('========================================');
    console.log('TOXIC BOOK TEST (Test 9)');
    console.log('Script: diag-09-toxic-book-test.js');
    console.log('========================================');
    console.log('');
    console.log('HYPOTHESIS:');
    console.log('   Is "Exponential Apocalypse" (position 2036) universally toxic?');
    console.log('   Does it corrupt ALL books that follow it, not just Cats?');
    console.log('');
    console.log('METHOD:');
    console.log('   For each victim book:');
    console.log('   1. Fetch "Exponential Apocalypse" (2036)');
    console.log('   2. Fetch victim book (Cats, Queen 1, Queen 2)');
    console.log('   3. Check if victim fails');
    console.log('');
    console.log('EXPECTED:');
    console.log('   If universally toxic: ALL victims fail');
    console.log('   If Cats-specific: Only Cats fails, Queens succeed');
    console.log('');

    console.log('🧪 TOXIC BOOK:');
    console.log(`   ASIN: ${TOXIC_BOOK.asin}`);
    console.log(`   Title: ${TOXIC_BOOK.title}`);
    console.log(`   Position: ${TOXIC_BOOK.position} (from original library)`);
    console.log('');

    // Step 1: Get CSRF token
    console.log('[1/2] Getting CSRF token...');
    const csrfMeta = document.querySelector('meta[name="anti-csrftoken-a2z"]');

    if (!csrfMeta) {
        console.error('❌ CSRF token not found');
        console.error('   Make sure you\'re on amazon.com/yourbooks');
        return;
    }

    const csrfToken = csrfMeta.getAttribute('content');
    console.log(`   ✅ Token obtained: ${csrfToken.substring(0, 10)}...`);
    console.log('');

    // Step 2: Test each victim
    console.log('[2/2] Testing toxic book with each victim...');
    console.log('');

    const startTime = Date.now();
    const results = {
        toxicBook: {
            position: TOXIC_BOOK.position,
            asin: TOXIC_BOOK.asin,
            title: TOXIC_BOOK.title
        },
        victims: [],
        patternsFound: {
            allVictimsFailed: true,
            anyVictimSucceeded: false
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

    // Test each victim
    for (let victimIdx = 0; victimIdx < TEST_VICTIMS.length; victimIdx++) {
        const victim = TEST_VICTIMS[victimIdx];

        console.log('========================================');
        console.log(`VICTIM ${victimIdx + 1}/3: ${victim.name}`);
        console.log('========================================');
        console.log(`   Position: ${victim.position} (from original library)`);
        console.log(`   Title: ${victim.title}`);
        console.log(`   ASIN: ${victim.asin}`);
        console.log('');

        const victimResult = {
            name: victim.name,
            position: victim.position,
            asin: victim.asin,
            title: victim.title,
            toxicResult: null,
            victimResult: null
        };

        // Step 1: Fetch toxic book
        console.log(`   [1/2] Fetching TOXIC book (${TOXIC_BOOK.title.substring(0, 50)}...):`);
        console.log(`         ASIN: ${TOXIC_BOOK.asin}`);

        try {
            const result = await enrichBook(TOXIC_BOOK.asin);
            victimResult.toxicResult = 'SUCCESS';
            victimResult.toxicDescription = result.description.length;
            victimResult.toxicReviews = result.reviews;
            console.log(`         ✅ SUCCESS: ${result.description.length} chars, ${result.reviews} reviews`);
        } catch (error) {
            victimResult.toxicResult = 'FAILURE';
            victimResult.toxicError = error.message;
            console.log(`         ❌ FAILED: ${error.message}`);
            console.log(`         ⚠️ Toxic book itself failed - skipping victim test`);
            results.victims.push(victimResult);

            if (victimIdx < TEST_VICTIMS.length - 1) {
                console.log('');
                console.log('   ⏳ Waiting 5 seconds before next victim...');
                console.log('');
                await new Promise(resolve => setTimeout(resolve, 5000));
            }
            continue;
        }

        console.log('');

        // Delay before victim
        await new Promise(resolve => setTimeout(resolve, DELAY_MS));

        // Step 2: Fetch victim book
        console.log(`   [2/2] Fetching VICTIM book (${victim.title.substring(0, 50)}...):`);
        console.log(`         ASIN: ${victim.asin}`);
        console.log(`         🎯 Testing if toxic book corrupted API state...`);

        try {
            const result = await enrichBook(victim.asin);
            victimResult.victimResult = 'SUCCESS';
            victimResult.victimDescription = result.description.length;
            victimResult.victimReviews = result.reviews;
            console.log(`         ✅ SUCCESS: ${result.description.length} chars, ${result.reviews} reviews`);

            results.patternsFound.allVictimsFailed = false;
            results.patternsFound.anyVictimSucceeded = true;
        } catch (error) {
            victimResult.victimResult = 'FAILURE';
            victimResult.victimError = error.message;
            console.log(`         ❌ FAILED: ${error.message}`);
        }

        console.log('');
        console.log('---');
        console.log(`📊 VICTIM ${victimIdx + 1} RESULTS:`);
        console.log(`   Toxic book: ${victimResult.toxicResult}`);
        console.log(`   Victim: ${victimResult.victimResult} ${victimResult.victimResult === 'FAILURE' ? '← CORRUPTED!' : '← NOT corrupted'}`);
        console.log('');

        results.victims.push(victimResult);

        // Delay before next victim (unless last)
        if (victimIdx < TEST_VICTIMS.length - 1) {
            console.log('   ⏳ Waiting 5 seconds before next victim...');
            console.log('');
            await new Promise(resolve => setTimeout(resolve, 5000));
        }
    }

    // Final analysis
    const totalDuration = Math.round((Date.now() - startTime) / 1000);

    console.log('========================================');
    console.log('📊 TOXIC BOOK TEST COMPLETE');
    console.log('========================================');
    console.log('');
    console.log('⏱️  TIMING:');
    console.log(`   Total duration: ${totalDuration} seconds`);
    console.log('');

    console.log('📈 RESULTS SUMMARY:');
    results.victims.forEach((victim, idx) => {
        console.log(`   Victim ${idx + 1} (${victim.name}):`);
        console.log(`      Toxic book: ${victim.toxicResult}`);
        console.log(`      Victim: ${victim.victimResult} ${victim.victimResult === 'FAILURE' ? '← FAILED!' : ''}`);
    });
    console.log('');

    // Pattern analysis
    console.log('🔍 PATTERN ANALYSIS:');
    console.log('');

    const failedVictims = results.victims.filter(v => v.victimResult === 'FAILURE').length;
    const succeededVictims = results.victims.filter(v => v.victimResult === 'SUCCESS').length;

    if (results.patternsFound.allVictimsFailed) {
        console.log('✅ HYPOTHESIS CONFIRMED!');
        console.log('   → ALL victims FAILED after toxic book');
        console.log('   → "Exponential Apocalypse" is UNIVERSALLY TOXIC');
        console.log('');
        console.log('💡 CRITICAL FINDING:');
        console.log('   This specific book corrupts Amazon API state');
        console.log('   for ANY book that follows it (not just Cats).');
        console.log('');
        console.log('📌 IMPLICATION:');
        console.log('   - Problem is with "Exponential Apocalypse" itself');
        console.log('   - Not about Cats/Queens specifically');
        console.log('   - API state corruption affects next request');
        console.log('');
        console.log('🎯 NEXT STEPS:');
        console.log('   1. Examine "Exponential Apocalypse" metadata (ASIN: B002PDOQFA)');
        console.log('   2. Test if OTHER books also corrupt API state');
        console.log('   3. Identify common properties of toxic books');
        console.log('   4. Implement cooldown/workaround for toxic books');
        console.log('');
    } else if (failedVictims > 0 && succeededVictims > 0) {
        console.log('⚠️ MIXED RESULTS');
        console.log(`   → ${failedVictims}/3 victims FAILED`);
        console.log(`   → ${succeededVictims}/3 victims SUCCEEDED`);
        console.log('');
        console.log('💡 FINDING:');
        console.log('   The toxic book hypothesis is PARTIALLY true.');
        console.log('   Some victims fail, others succeed.');
        console.log('');
        console.log('📌 POSSIBLE EXPLANATIONS:');
        console.log('   1. Cats-specific interaction with toxic book');
        console.log('   2. Position-dependent corruption (Queens far from Cats)');
        console.log('   3. Time allows API to recover between tests');
        console.log('   4. Specific book combinations matter');
        console.log('');
    } else if (results.patternsFound.anyVictimSucceeded) {
        console.log('❌ HYPOTHESIS DISPROVEN');
        console.log('   → ALL victims SUCCEEDED');
        console.log('   → "Exponential Apocalypse" is NOT universally toxic');
        console.log('');
        console.log('💡 FINDING:');
        console.log('   The toxic book only affects Cats, not Queens.');
        console.log('   This suggests a SPECIFIC interaction between');
        console.log('   "Exponential Apocalypse" and "Cats" book.');
        console.log('');
        console.log('📌 IMPLICATION:');
        console.log('   - Queens failures require different preceding context');
        console.log('   - Need to find what book/sequence triggers Queens failures');
        console.log('   - Reverse binary search for Queens is next step');
        console.log('');
    }

    console.log('========================================');

    // Save results
    window.toxicBookTestResults = results;
    console.log('📦 Results saved to: window.toxicBookTestResults');
    console.log('');
}

// Instructions
console.log('');
console.log('========================================');
console.log('🔬 TOXIC BOOK TEST (Test 9)');
console.log('========================================');
console.log('');
console.log('This test checks if "Exponential Apocalypse" is universally toxic.');
console.log('');
console.log('READY TO RUN!');
console.log('   Script loaded successfully.');
console.log('   Starting test automatically...');
console.log('');
console.log('TESTS:');
console.log('- Victim 1: Exponential Apocalypse → Cats');
console.log('- Victim 2: Exponential Apocalypse → Queen 1');
console.log('- Victim 3: Exponential Apocalypse → Queen 2');
console.log('');
console.log('DURATION: ~30 seconds total');
console.log('');
console.log('========================================');
console.log('');

// Auto-invoke the test
testToxicBook();
