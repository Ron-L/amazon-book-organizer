// Antidote Test - Phase 1: Different Endpoint Antidote
// Purpose: Test if /digital-graphql/v1 endpoint can clear failure state
// Test sequence:
//   1. Fetch Cats via /kindle-reader-api → expect FAIL
//   2. ANTIDOTE: Fetch Cats via /digital-graphql/v1 → expect SUCCESS
//   3. Fetch Cats via /kindle-reader-api → check if now SUCCESS
// Run this in browser console on amazon.com/yourbooks AFTER PAGE REFRESH
// Script: antidote-test-01-endpoint.js

const TARGET_VICTIM = {
    asin: 'B0085HN8N6',
    title: '99 Reasons to Hate Cats: Cartoons for Cat Lovers'
};

const PHASE_INFO = {
    phase: 1,
    name: 'Different Endpoint Antidote',
    hypothesis: 'Fetching via /digital-graphql/v1 clears failure state for /kindle-reader-api',
    antidote: 'Fetch Cats via /digital-graphql/v1 (same ASIN, different endpoint)',
    expectedOutcome: 'Baseline FAILS, antidote SUCCEEDS, verification SUCCEEDS'
};

async function antidoteTest01() {
    console.log('========================================');
    console.log('ANTIDOTE TEST - PHASE 1');
    console.log('Script: antidote-test-01-endpoint.js');
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
    console.log(`   Title: ${TARGET_VICTIM.title}`);
    console.log(`   ASIN: ${TARGET_VICTIM.asin}`);
    console.log('');
    console.log('TEST SEQUENCE:');
    console.log('   1. Baseline: Fetch via /kindle-reader-api (expect FAIL)');
    console.log('   2. Antidote: Fetch via /digital-graphql/v1 (expect SUCCESS)');
    console.log('   3. Verify: Fetch via /kindle-reader-api (check if SUCCESS)');
    console.log('');

    // Get CSRF token (only needed for /kindle-reader-api)
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

    // Function: Fetch via /kindle-reader-api (the problematic endpoint)
    const fetchViaKindleReaderAPI = async (asin) => {
        const query = `query enrichBook {
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
                query,
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

    // Function: Fetch via /digital-graphql/v1 (the antidote endpoint)
    const fetchViaDigitalGraphQL = async (asin) => {
        const query = `
            query enrichBook($asin: String!) {
                getProductByAsin(asin: $asin) {
                    asin
                    title
                    authors
                    binding
                    pageCount
                    publicationDate
                    publisher
                    productDescription {
                        plaintext
                        content {
                            content
                        }
                    }
                    auxiliaryStoreRecommendations {
                        details {
                            ... on SemanticContent {
                                fragments {
                                    content
                                }
                            }
                        }
                    }
                    customerReviews {
                        totalReviewCount
                        averageStarRating
                    }
                }
            }
        `;

        const response = await fetch('https://www.amazon.com/digital-graphql/v1', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify({
                query,
                variables: { asin }
            })
        });

        return {
            ok: response.ok,
            status: response.status,
            statusText: response.statusText,
            data: response.ok ? await response.json() : null
        };
    };

    // Helper: Parse response and determine success
    const parseKindleReaderAPIResponse = (response) => {
        if (!response.ok) {
            return { success: false, error: `HTTP ${response.status} ${response.statusText}` };
        }

        const data = response.data;
        if (data.errors) {
            return { success: false, error: data.errors[0]?.message || 'GraphQL error' };
        }

        const product = data?.data?.getProducts?.[0];
        if (!product) {
            return { success: false, error: 'No product data returned' };
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

        return {
            success: true,
            description,
            reviews: reviews.length
        };
    };

    const parseDigitalGraphQLResponse = (response) => {
        if (!response.ok) {
            return { success: false, error: `HTTP ${response.status} ${response.statusText}` };
        }

        const data = response.data;
        if (data.errors) {
            return { success: false, error: data.errors[0]?.message || 'GraphQL error' };
        }

        if (!data.data?.getProductByAsin) {
            return { success: false, error: 'No product data returned' };
        }

        const product = data.data.getProductByAsin;

        // Extract description
        let description = '';
        if (product.productDescription?.plaintext) {
            description = product.productDescription.plaintext;
        } else if (product.productDescription?.content?.content) {
            description = product.productDescription.content.content;
        } else if (product.auxiliaryStoreRecommendations?.details) {
            for (const detail of product.auxiliaryStoreRecommendations.details) {
                if (detail.fragments && detail.fragments.length > 0) {
                    description = detail.fragments.map(f => f.content).join(' ');
                    if (description) break;
                }
            }
        }

        return {
            success: true,
            title: product.title || '',
            authors: product.authors?.join(', ') || '',
            description,
            reviewCount: product.customerReviews?.totalReviewCount || 0
        };
    };

    // Run the test sequence
    console.log('[2/2] Running test sequence...');
    console.log('');

    const results = {
        baseline: null,
        antidote: null,
        verification: null
    };

    // STEP 1: Baseline fetch via /kindle-reader-api
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('STEP 1: BASELINE FETCH');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('Endpoint: /kindle-reader-api');
    console.log('Expected: FAIL');
    console.log('');

    let baselineStart = Date.now();
    try {
        const response = await fetchViaKindleReaderAPI(TARGET_VICTIM.asin);
        const duration = ((Date.now() - baselineStart) / 1000).toFixed(2);
        const parsed = parseKindleReaderAPIResponse(response);

        results.baseline = {
            endpoint: '/kindle-reader-api',
            httpStatus: response.status,
            httpOk: response.ok,
            durationSec: parseFloat(duration),
            ...parsed
        };

        if (parsed.success) {
            console.log(`⚠️  ${duration}s - UNEXPECTED SUCCESS!`);
            console.log(`   Description: ${parsed.description.length} chars`);
            console.log(`   Reviews: ${parsed.reviews}`);
        } else {
            console.log(`✅ ${duration}s - FAILED as expected`);
            console.log(`   Error: ${parsed.error}`);
        }
    } catch (error) {
        const duration = ((Date.now() - baselineStart) / 1000).toFixed(2);
        results.baseline = {
            endpoint: '/kindle-reader-api',
            httpStatus: null,
            httpOk: false,
            durationSec: parseFloat(duration),
            success: false,
            error: error.message
        };
        console.log(`✅ ${duration}s - FAILED as expected`);
        console.log(`   Exception: ${error.message}`);
    }

    console.log('');

    // Small delay before antidote
    console.log('⏳ Waiting 1.5 seconds before antidote...');
    console.log('');
    await new Promise(resolve => setTimeout(resolve, 1500));

    // STEP 2: Antidote fetch via /digital-graphql/v1
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('STEP 2: ANTIDOTE FETCH');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('Endpoint: /digital-graphql/v1');
    console.log('Expected: SUCCESS');
    console.log('');

    let antidoteStart = Date.now();
    try {
        const response = await fetchViaDigitalGraphQL(TARGET_VICTIM.asin);
        const duration = ((Date.now() - antidoteStart) / 1000).toFixed(2);
        const parsed = parseDigitalGraphQLResponse(response);

        results.antidote = {
            endpoint: '/digital-graphql/v1',
            httpStatus: response.status,
            httpOk: response.ok,
            durationSec: parseFloat(duration),
            ...parsed
        };

        if (parsed.success) {
            console.log(`✅ ${duration}s - SUCCESS as expected`);
            console.log(`   Title: ${parsed.title}`);
            console.log(`   Authors: ${parsed.authors}`);
            console.log(`   Description: ${parsed.description.length} chars`);
            console.log(`   Review count: ${parsed.reviewCount}`);
        } else {
            console.log(`⚠️  ${duration}s - UNEXPECTED FAILURE!`);
            console.log(`   Error: ${parsed.error}`);
        }
    } catch (error) {
        const duration = ((Date.now() - antidoteStart) / 1000).toFixed(2);
        results.antidote = {
            endpoint: '/digital-graphql/v1',
            httpStatus: null,
            httpOk: false,
            durationSec: parseFloat(duration),
            success: false,
            error: error.message
        };
        console.log(`⚠️  ${duration}s - UNEXPECTED FAILURE!`);
        console.log(`   Exception: ${error.message}`);
    }

    console.log('');

    // Small delay before verification
    console.log('⏳ Waiting 1.5 seconds before verification...');
    console.log('');
    await new Promise(resolve => setTimeout(resolve, 1500));

    // STEP 3: Verification fetch via /kindle-reader-api
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('STEP 3: VERIFICATION FETCH');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('Endpoint: /kindle-reader-api');
    console.log('Expected: SUCCESS (if antidote worked)');
    console.log('');

    let verifyStart = Date.now();
    try {
        const response = await fetchViaKindleReaderAPI(TARGET_VICTIM.asin);
        const duration = ((Date.now() - verifyStart) / 1000).toFixed(2);
        const parsed = parseKindleReaderAPIResponse(response);

        results.verification = {
            endpoint: '/kindle-reader-api',
            httpStatus: response.status,
            httpOk: response.ok,
            durationSec: parseFloat(duration),
            ...parsed
        };

        if (parsed.success) {
            console.log(`🎉 ${duration}s - SUCCESS! Antidote worked!`);
            console.log(`   Description: ${parsed.description.length} chars`);
            console.log(`   Reviews: ${parsed.reviews}`);
        } else {
            console.log(`❌ ${duration}s - FAILED - Antidote did NOT work`);
            console.log(`   Error: ${parsed.error}`);
        }
    } catch (error) {
        const duration = ((Date.now() - verifyStart) / 1000).toFixed(2);
        results.verification = {
            endpoint: '/kindle-reader-api',
            httpStatus: null,
            httpOk: false,
            durationSec: parseFloat(duration),
            success: false,
            error: error.message
        };
        console.log(`❌ ${duration}s - FAILED - Antidote did NOT work`);
        console.log(`   Exception: ${error.message}`);
    }

    console.log('');

    // Analysis
    console.log('========================================');
    console.log('📊 PHASE 1 RESULTS');
    console.log('========================================');
    console.log('');

    console.log('📋 SUMMARY:');
    console.log(`   Baseline (/kindle-reader-api):     ${results.baseline.success ? '✅ SUCCESS' : '❌ FAILED'}`);
    console.log(`   Antidote (/digital-graphql/v1):    ${results.antidote.success ? '✅ SUCCESS' : '❌ FAILED'}`);
    console.log(`   Verification (/kindle-reader-api): ${results.verification.success ? '✅ SUCCESS' : '❌ FAILED'}`);
    console.log('');

    // Determine if antidote worked
    const baselineFailed = !results.baseline.success;
    const antidoteSucceeded = results.antidote.success;
    const verificationSucceeded = results.verification.success;

    const antidoteWorked = baselineFailed && antidoteSucceeded && verificationSucceeded;

    console.log('========================================');
    console.log('📋 ANALYSIS');
    console.log('========================================');
    console.log('');

    if (antidoteWorked) {
        console.log('🎉 ANTIDOTE CONFIRMED!');
        console.log('');
        console.log('✅ Pattern:');
        console.log('   1. /kindle-reader-api → FAILED (baseline)');
        console.log('   2. /digital-graphql/v1 → SUCCESS (antidote)');
        console.log('   3. /kindle-reader-api → SUCCESS (cleared!)');
        console.log('');
        console.log('🔍 CONCLUSION:');
        console.log('   Fetching via /digital-graphql/v1 CLEARS the failure state');
        console.log('   for subsequent /kindle-reader-api requests.');
        console.log('');
        console.log('💡 IMPLEMENTATION:');
        console.log('   When /kindle-reader-api fails with "Customer Id" error:');
        console.log('   1. Retry same book via /digital-graphql/v1');
        console.log('   2. Use data from /digital-graphql/v1 response');
        console.log('   3. Continue with /kindle-reader-api for remaining books');
        console.log('');
        console.log('💡 NEXT STEPS:');
        console.log('   1. Implement antidote in library-fetcher.js');
        console.log('   2. Test with full library fetch');
        console.log('   3. Verify other failing books also clear');
    } else if (!baselineFailed) {
        console.log('⚠️  UNEXPECTED: Baseline succeeded');
        console.log('');
        console.log('   The baseline fetch via /kindle-reader-api succeeded,');
        console.log('   which means Cats is NOT failing on this page load.');
        console.log('');
        console.log('💡 NEXT STEPS:');
        console.log('   1. Re-run Phase 0a to confirm failure');
        console.log('   2. Re-run Phase 1 after confirming failure');
    } else if (!antidoteSucceeded) {
        console.log('❌ ANTIDOTE FAILED');
        console.log('');
        console.log('   The antidote fetch via /digital-graphql/v1 failed,');
        console.log('   which is unexpected. This endpoint should work.');
        console.log('');
        console.log('💡 NEXT STEPS:');
        console.log('   1. Check network errors');
        console.log('   2. Verify session is still valid');
        console.log('   3. Re-run Phase 1');
    } else if (!verificationSucceeded) {
        console.log('❌ ANTIDOTE DID NOT WORK');
        console.log('');
        console.log('✅ Pattern:');
        console.log('   1. /kindle-reader-api → FAILED (baseline)');
        console.log('   2. /digital-graphql/v1 → SUCCESS (antidote)');
        console.log('   3. /kindle-reader-api → FAILED (still broken)');
        console.log('');
        console.log('🔍 CONCLUSION:');
        console.log('   Fetching via /digital-graphql/v1 does NOT clear');
        console.log('   the failure state for /kindle-reader-api.');
        console.log('');
        console.log('💡 NEXT STEPS:');
        console.log('   Proceed to Phase 2: Test time-based antidote');
    }

    console.log('');
    console.log('========================================');

    // Save results
    const phaseResults = {
        phase: 1,
        phaseInfo: PHASE_INFO,
        victim: TARGET_VICTIM,
        results,
        antidoteWorked,
        pattern: {
            baselineFailed,
            antidoteSucceeded,
            verificationSucceeded
        }
    };

    window.antidoteTest01Results = phaseResults;
    console.log('📦 Results saved to: window.antidoteTest01Results');
}

// Instructions
console.log('');
console.log('========================================');
console.log('🔬 ANTIDOTE TEST - PHASE 1 (ENDPOINT)');
console.log('========================================');
console.log('');
console.log('Purpose: Test if different endpoint clears failure');
console.log('');
console.log('Test sequence:');
console.log('   1. Fetch via /kindle-reader-api (expect FAIL)');
console.log('   2. Fetch via /digital-graphql/v1 (expect SUCCESS)');
console.log('   3. Fetch via /kindle-reader-api (check if SUCCESS)');
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
antidoteTest01();
