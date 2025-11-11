// Antidote Test - Phase 3: Validate Option A (Partial Error Handling)
// Purpose: Test all 3 problem books with original getProducts query
// Method: Use existing getProducts query, log raw response to verify partial errors
// Expected: All 3 books return descriptions despite customerReviewsTop errors
// Run this in browser console on amazon.com/yourbooks AFTER PAGE REFRESH
// Script: antidote-test-03-three-victims.js

const THREE_VICTIMS = [
    {
        position: 2037,
        asin: 'B0085HN8N6',
        title: '99 Reasons to Hate Cats: Cartoons for Cat Lovers',
        expectedDescription: 939
    },
    {
        position: 2321,
        asin: '0684862670',
        title: 'Queen\'s Ransom',
        expectedDescription: 'unknown'
    },
    {
        position: 2322,
        asin: '0684862689',
        title: 'To Ruin A Queen',
        expectedDescription: 'unknown'
    }
];

const PHASE_INFO = {
    phase: 3,
    name: 'Validate Option A - Partial Error Handling',
    hypothesis: 'All 3 victims return descriptions despite customerReviewsTop errors',
    method: 'Use existing getProducts query, examine raw response for partial errors',
    expectedOutcome: 'data.data contains descriptions, data.errors contains customerReviewsTop errors'
};

async function antidoteTest03() {
    console.log('========================================');
    console.log('ANTIDOTE TEST - PHASE 3');
    console.log('Script: antidote-test-03-three-victims.js');
    console.log('========================================');
    console.log('');
    console.log('PHASE INFO:');
    console.log(`   Phase: ${PHASE_INFO.phase}`);
    console.log(`   Name: ${PHASE_INFO.name}`);
    console.log(`   Hypothesis: ${PHASE_INFO.hypothesis}`);
    console.log(`   Method: ${PHASE_INFO.method}`);
    console.log(`   Expected: ${PHASE_INFO.expectedOutcome}`);
    console.log('');
    console.log('TARGET VICTIMS:');
    THREE_VICTIMS.forEach(v => {
        console.log(`   ${v.position}. ${v.title}`);
        console.log(`      ASIN: ${v.asin}`);
    });
    console.log('');

    // Get CSRF token
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

    // Original getProducts query (same as library-fetcher)
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

    console.log('[2/2] Testing all 3 victims with getProducts query...');
    console.log('');

    const testStartTime = Date.now();
    const results = [];

    for (let i = 0; i < THREE_VICTIMS.length; i++) {
        const victim = THREE_VICTIMS[i];
        const fetchStartTime = Date.now();

        console.log(`[${i + 1}/3] Testing: ${victim.title}`);
        console.log(`   Position: ${victim.position}`);
        console.log(`   ASIN: ${victim.asin}`);

        try {
            const response = await enrichBook(victim.asin);
            const fetchDuration = ((Date.now() - fetchStartTime) / 1000).toFixed(2);

            if (!response.ok) {
                console.log(`   ❌ ${fetchDuration}s - HTTP ERROR: ${response.status} ${response.statusText}`);
                results.push({
                    victim,
                    httpError: true,
                    httpStatus: response.status,
                    fetchDurationSec: parseFloat(fetchDuration)
                });
                console.log('');
                continue;
            }

            const data = response.data;

            // Log raw response for analysis
            console.log(`   📦 ${fetchDuration}s - Response received`);
            console.log('');
            console.log('   RAW RESPONSE:');
            console.log('   ' + JSON.stringify(data, null, 2).split('\n').join('\n   '));
            console.log('');

            // Analyze response
            const hasErrors = data.errors && data.errors.length > 0;
            const hasData = data?.data?.getProducts?.[0];
            const product = data?.data?.getProducts?.[0];

            // Extract description
            let description = '';
            if (product) {
                const descSection = product.description?.sections?.[0];
                const descContent = descSection?.content;

                if (typeof descContent === 'string') {
                    description = descContent;
                } else if (descContent?.text) {
                    description = descContent.text;
                }
            }

            // Extract reviews
            const reviews = product?.customerReviewsTop?.reviews || [];

            // Determine result
            const result = {
                victim,
                httpOk: true,
                hasErrors,
                hasData,
                descriptionLength: description.length,
                reviewCount: reviews.length,
                fetchDurationSec: parseFloat(fetchDuration),
                errors: data.errors || [],
                partialError: hasErrors && hasData
            };

            results.push(result);

            // Log analysis
            if (result.partialError) {
                console.log('   ⚠️  PARTIAL ERROR (This is what we expect!)');
                console.log(`      Errors present: YES (${result.errors.length})`);
                console.log(`      Data present: YES`);
                console.log(`      Description: ${result.descriptionLength} chars`);
                console.log(`      Reviews: ${result.reviewCount}`);
                console.log('');
                console.log('   Error details:');
                result.errors.forEach(err => {
                    console.log(`      Message: ${err.message}`);
                    console.log(`      Path: ${err.path?.join(' → ') || 'N/A'}`);
                });
            } else if (!hasErrors && hasData) {
                console.log('   ✅ COMPLETE SUCCESS (No errors at all!)');
                console.log(`      Description: ${result.descriptionLength} chars`);
                console.log(`      Reviews: ${result.reviewCount}`);
            } else if (hasErrors && !hasData) {
                console.log('   ❌ TOTAL FAILURE');
                console.log('      Errors present: YES');
                console.log('      Data present: NO');
            } else {
                console.log('   ❓ UNEXPECTED STATE');
                console.log(`      Errors: ${hasErrors}`);
                console.log(`      Data: ${hasData}`);
            }

        } catch (error) {
            const fetchDuration = ((Date.now() - fetchStartTime) / 1000).toFixed(2);
            console.log(`   ❌ ${fetchDuration}s - EXCEPTION: ${error.message}`);
            results.push({
                victim,
                exception: true,
                error: error.message,
                fetchDurationSec: parseFloat(fetchDuration)
            });
        }

        console.log('');

        // Delay before next book
        if (i < THREE_VICTIMS.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
    }

    const totalDurationMs = Date.now() - testStartTime;
    const totalDurationSec = Math.round(totalDurationMs / 1000);

    console.log('========================================');
    console.log('📊 PHASE 3 RESULTS');
    console.log('========================================');
    console.log('');
    console.log(`⏱️  TOTAL DURATION: ${totalDurationSec} seconds`);
    console.log('');

    // Results summary
    const partialErrors = results.filter(r => r.partialError).length;
    const completeSuccesses = results.filter(r => !r.hasErrors && r.hasData).length;
    const totalFailures = results.filter(r => r.httpError || r.exception || (r.hasErrors && !r.hasData)).length;
    const gotDescriptions = results.filter(r => r.descriptionLength > 0).length;

    console.log('📋 SUMMARY:');
    console.log(`   Books tested: ${results.length}`);
    console.log(`   Partial errors (errors + data): ${partialErrors}`);
    console.log(`   Complete successes (no errors): ${completeSuccesses}`);
    console.log(`   Total failures (no data): ${totalFailures}`);
    console.log(`   Got descriptions: ${gotDescriptions}/${results.length}`);
    console.log('');

    console.log('📋 INDIVIDUAL RESULTS:');
    results.forEach((r, idx) => {
        const victim = r.victim;
        console.log(`   ${idx + 1}. ${victim.title}`);
        if (r.partialError) {
            console.log(`      ⚠️  Partial error - Got description (${r.descriptionLength} chars) despite errors`);
        } else if (!r.hasErrors && r.hasData) {
            console.log(`      ✅ Complete success - ${r.descriptionLength} chars, ${r.reviewCount} reviews`);
        } else if (r.httpError) {
            console.log(`      ❌ HTTP error - ${r.httpStatus}`);
        } else if (r.exception) {
            console.log(`      ❌ Exception - ${r.error}`);
        } else {
            console.log(`      ❌ Total failure - No data returned`);
        }
    });
    console.log('');

    // Analysis
    console.log('========================================');
    console.log('📋 ANALYSIS');
    console.log('========================================');
    console.log('');

    if (gotDescriptions === 3) {
        console.log('🎉 HYPOTHESIS CONFIRMED!');
        console.log('');
        console.log('✅ ALL 3 victims returned descriptions!');
        console.log('');
        if (partialErrors > 0) {
            console.log(`⚠️  ${partialErrors} book(s) had partial errors (customerReviewsTop failed)`);
            console.log('   But we still got the description data!');
            console.log('');
        }
        console.log('💡 ROOT CAUSE VALIDATED:');
        console.log('   - getProducts DOES return descriptions');
        console.log('   - Only customerReviewsTop field fails');
        console.log('   - Our error handling was discarding valid data');
        console.log('');
        console.log('🎯 SOLUTION: Option A (Partial Error Handling)');
        console.log('   1. Check if data.errors exists');
        console.log('   2. If YES, also check if data.data exists');
        console.log('   3. If BOTH exist, log warning but continue extracting');
        console.log('   4. Only fail if errors exist AND no data');
        console.log('');
        console.log('📝 IMPLEMENTATION:');
        console.log('   if (data.errors) {');
        console.log('       if (data.data?.getProducts?.[0]) {');
        console.log('           console.log("⚠️  Partial error - continuing...");');
        console.log('           // Continue to extract description');
        console.log('       } else {');
        console.log('           return { apiError: true, errorMessage: ... };');
        console.log('       }');
        console.log('   }');
    } else {
        console.log('❌ UNEXPECTED RESULT');
        console.log('');
        console.log(`   Expected: 3/3 books with descriptions`);
        console.log(`   Got: ${gotDescriptions}/3 books with descriptions`);
        console.log('');
        console.log('💡 NEXT STEPS:');
        console.log('   1. Review raw responses above');
        console.log('   2. Investigate why some books didn\'t return data');
        console.log('   3. May need different approach for those books');
    }

    console.log('');
    console.log('========================================');

    // Save results
    const phaseResults = {
        phase: 3,
        phaseInfo: PHASE_INFO,
        victims: THREE_VICTIMS,
        testResults: results,
        summary: {
            totalBooks: results.length,
            partialErrors,
            completeSuccesses,
            totalFailures,
            gotDescriptions
        },
        totalDurationSec,
        hypothesisConfirmed: (gotDescriptions === 3)
    };

    window.antidoteTest03Results = phaseResults;
    console.log('📦 Results saved to: window.antidoteTest03Results');
}

// Instructions
console.log('');
console.log('========================================');
console.log('🔬 ANTIDOTE TEST - PHASE 3 (VALIDATE OPTION A)');
console.log('========================================');
console.log('');
console.log('Purpose: Validate that all 3 problem books return descriptions');
console.log('         when using original getProducts query');
console.log('');
console.log('This will test:');
console.log('   1. Cats (position 2037, ASIN B0085HN8N6)');
console.log('   2. Queen\'s Ransom (position 2321, ASIN 0684862670)');
console.log('   3. To Ruin A Queen (position 2322, ASIN 0684862689)');
console.log('');
console.log('Expected outcome:');
console.log('   - All 3 books return descriptions in data.data');
console.log('   - Some/all may have errors in data.errors');
console.log('   - This proves Option A (partial error handling) will work');
console.log('');
console.log('PREREQUISITES:');
console.log('✅ Fresh page refresh completed');
console.log('✅ On amazon.com/yourbooks');
console.log('');
console.log('READY TO RUN!');
console.log('   Script loaded successfully.');
console.log('   Starting test automatically...');
console.log('');
console.log('ESTIMATED DURATION: ~5 seconds');
console.log('');
console.log('========================================');
console.log('');

// Auto-invoke the test
antidoteTest03();
