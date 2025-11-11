// test-04-compare-all-root-fields.js
// Browser Console Test - Test getProducts with different x-client-id values
//
// VERSION: v1.2 (2025-11-10 14:36)
// CHANGELOG:
//   v1.0 - Initial version with invented query structure (FAILED - validation errors)
//   v1.1 - Fixed query structure copied from library-fetcher.js line 1168
//   v1.2 - Fixed headers to match library-fetcher.js lines 1218-1223 exactly
//
// IMPORTANT: Query structure copied EXACTLY from library-fetcher.js line 1168
// IMPORTANT: Headers copied EXACTLY from library-fetcher.js lines 1218-1223
//
// INSTRUCTIONS:
// 1. Go to: https://www.amazon.com/yourbooks
// 2. Open Developer Tools (F12) → Console tab
// 3. Paste this ENTIRE script and press Enter
// 4. Review the comparative output

const SCRIPT_VERSION = 'v1.2';
const SCRIPT_DATE = '2025-11-10 14:36';

console.log(`Script: test-04-compare-all-root-fields.js ${SCRIPT_VERSION} (${SCRIPT_DATE})`);
console.log('');

// Test one ASIN with highest review count from analyze-review-data.js
const TEST_ASIN = 'B00J9P2EMO'; // Lethal Code (1674 reviews)
const TEST_TITLE = 'Lethal Code';

// Extract CSRF token from meta tag
const csrfMeta = document.querySelector('meta[name="anti-csrftoken-a2z"]');
const csrfToken = csrfMeta ? csrfMeta.getAttribute('content') : null;

console.log('='.repeat(80));
console.log(`TEST 04 - Compare x-client-id Values (${SCRIPT_VERSION})`);
console.log('='.repeat(80));
console.log('');
console.log('Purpose: Test if x-client-id affects review retrieval');
console.log(`Test Book: ${TEST_TITLE} (ASIN: ${TEST_ASIN})`);
console.log('Endpoint: /kindle-reader-api');
console.log('Root Field: getProducts (copied from library-fetcher.js)');
console.log('Headers: Copied EXACTLY from library-fetcher.js lines 1218-1223');
console.log('');
console.log('Testing:');
console.log('  1. x-client-id: your-books (current fetcher)');
console.log('  2. x-client-id: quickview (Amazon popup)');
console.log('');
console.log(`CSRF Token: ${csrfToken ? 'Found ✅' : 'NOT FOUND ❌'}`);
console.log('');

// Query copied EXACTLY from library-fetcher.js lines 1167-1210
// Only change: hardcoded TEST_ASIN instead of ${book.asin}
const query = `query enrichBook {
    getProducts(input: [{asin: "${TEST_ASIN}"}]) {
        asin
        description {
            sections(filter: {types: PRODUCT_DESCRIPTION}) {
                content
            }
        }
        auxiliaryStoreRecommendations(
            recommendationTypes: ["AI_SUMMARIES"]
        ) {
            recommendations {
                recommendationType
                sharedContent {
                    contentAbstract {
                        textAbstract
                    }
                }
            }
        }
        customerReviewsSummary {
            count {
                displayString
            }
            rating {
                value
            }
        }
        customerReviewsTop {
            reviews {
                contentAbstract {
                    textAbstract
                }
                contributor {
                    publicProfile {
                        publicProfile {
                            publicName {
                                displayString
                            }
                        }
                    }
                }
                title
                stars
            }
        }
    }
}`;

const tests = [
    {
        name: 'getProducts + your-books',
        clientId: 'your-books',
        note: 'Current fetcher (baseline)'
    },
    {
        name: 'getProducts + quickview',
        clientId: 'quickview',
        note: 'Amazon popup method'
    }
];

const results = [];

async function runTest(test, index) {
    console.log(`--- Test ${index + 1}/${tests.length}: ${test.name} ---`);
    console.log(`Note: ${test.note}`);
    console.log('');

    const startTime = Date.now();

    try {
        // Headers copied EXACTLY from library-fetcher.js lines 1218-1223
        const headers = {
            'accept': 'application/json, text/plain, */*',
            'content-type': 'application/json',
            'anti-csrftoken-a2z': csrfToken,
            'x-client-id': test.clientId
        };

        const response = await fetch('https://www.amazon.com/kindle-reader-api', {
            method: 'POST',
            headers: headers,
            credentials: 'include',
            body: JSON.stringify({
                query: query,
                operationName: 'enrichBook'
            })
        });

        const duration = ((Date.now() - startTime) / 1000).toFixed(2);

        if (!response.ok) {
            console.log(`❌ HTTP ${response.status}`);
            results.push({
                name: test.name,
                clientId: test.clientId,
                httpStatus: response.status,
                success: false
            });
            console.log('');
            return;
        }

        const result = await response.json();

        const hasErrors = result.errors && result.errors.length > 0;
        const productData = result.data?.getProducts?.[0];
        const hasData = !!productData;

        // Extract review data
        let reviewCount = 'N/A';
        let topReviewsCount = 0;

        if (hasData) {
            reviewCount = productData.customerReviewsSummary?.count?.displayString || 'N/A';
            topReviewsCount = productData.customerReviewsTop?.reviews?.length || 0;
        }

        console.log(`Duration: ${duration}s`);
        console.log(`Has Errors: ${hasErrors ? 'YES ⚠️' : 'NO ✅'}`);
        console.log(`Has Data: ${hasData ? 'YES ✅' : 'NO ❌'}`);
        console.log(`Review Count: ${reviewCount}`);
        console.log(`Top Reviews Retrieved: ${topReviewsCount}`);

        if (hasErrors) {
            console.log('Errors:');
            result.errors.forEach(err => {
                console.log(`  - ${err.message}`);
                console.log(`    Path: ${err.path?.join(' → ') || 'N/A'}`);
            });
        }

        console.log('');

        // Store result
        results.push({
            name: test.name,
            clientId: test.clientId,
            duration,
            hasErrors,
            hasData,
            reviewCount,
            topReviewsCount,
            errorMessage: hasErrors ? result.errors[0].message : null,
            errorPath: hasErrors ? result.errors[0].path?.join(' → ') : null
        });

    } catch (err) {
        console.error(`❌ FETCH FAILED: ${err.message}`);
        results.push({
            name: test.name,
            clientId: test.clientId,
            exception: err.message,
            success: false
        });
        console.log('');
    }
}

async function runAllTests() {
    for (let i = 0; i < tests.length; i++) {
        await runTest(tests[i], i);

        // Delay between tests
        if (i < tests.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 2000));
        }
    }

    // Comparison table
    console.log('='.repeat(80));
    console.log('COMPARISON TABLE');
    console.log('='.repeat(80));
    console.log('');

    console.log('Configuration                      | Errors | Data | Reviews | Duration');
    console.log('-'.repeat(80));

    results.forEach(r => {
        if (r.success === false) {
            console.log(`${r.name.padEnd(34)} | FAILED`);
            return;
        }

        const errors = r.hasErrors ? 'YES ⚠️ ' : 'NO ✅ ';
        const data = r.hasData ? 'YES ✅' : 'NO ❌';
        const reviews = r.topReviewsCount.toString().padStart(3);
        const duration = `${r.duration}s`.padStart(6);

        console.log(`${r.name.padEnd(34)} | ${errors} | ${data} | ${reviews}     | ${duration}`);
    });

    console.log('');

    // Analysis
    console.log('='.repeat(80));
    console.log('ANALYSIS');
    console.log('='.repeat(80));
    console.log('');

    const successful = results.filter(r => r.hasData && !r.hasErrors);
    const partialErrors = results.filter(r => r.hasData && r.hasErrors);
    const failures = results.filter(r => !r.hasData);

    console.log(`Complete Success (data + no errors): ${successful.length}/2`);
    successful.forEach(r => console.log(`  - ${r.name} → ${r.topReviewsCount} reviews`));
    console.log('');

    console.log(`Partial Errors (data + errors): ${partialErrors.length}/2`);
    partialErrors.forEach(r => console.log(`  - ${r.name} → ${r.topReviewsCount} reviews (${r.errorMessage})`));
    console.log('');

    console.log(`Total Failures (no data): ${failures.length}/2`);
    failures.forEach(r => console.log(`  - ${r.name}`));
    console.log('');

    // Find the winner
    console.log('='.repeat(80));
    console.log('RECOMMENDATION');
    console.log('='.repeat(80));
    console.log('');

    const withReviews = results.filter(r => r.topReviewsCount > 0);

    if (withReviews.length > 0) {
        console.log('🎉 FOUND WORKING CONFIGURATION(S):');
        withReviews.forEach(r => {
            const errorStatus = r.hasErrors ? ' (with partial errors)' : ' (clean success)';
            console.log(`  ✅ ${r.name} → ${r.topReviewsCount} reviews${errorStatus}`);
        });
        console.log('');

        // Find best option
        const cleanSuccess = withReviews.find(r => !r.hasErrors);
        if (cleanSuccess) {
            console.log(`🏆 BEST OPTION: "${cleanSuccess.name}"`);
            console.log(`   - No errors`);
            console.log(`   - Retrieved ${cleanSuccess.topReviewsCount} reviews`);
            console.log(`   - Duration: ${cleanSuccess.duration}s`);
        } else {
            console.log(`🏆 BEST OPTION: "${withReviews[0].name}"`);
            console.log(`   - Partial errors but got ${withReviews[0].topReviewsCount} reviews`);
            console.log(`   - Duration: ${withReviews[0].duration}s`);
        }
    } else if (partialErrors.length === 2 && partialErrors.every(r => r.topReviewsCount === 0)) {
        console.log('❌ TOTAL FAILURE - Both configurations failed to retrieve review text');
        console.log('');
        console.log('Conclusion:');
        console.log('  - x-client-id does NOT affect review retrieval');
        console.log('  - Problem is likely:');
        console.log('    • ASIN-specific issue (this book cannot return topReviews)');
        console.log('    • Amazon API restriction on review text retrieval');
        console.log('    • Account permissions');
        console.log('');
        console.log('Next step: Test with a different ASIN that DOES have topReviews');
    } else {
        console.log('📊 MIXED RESULTS');
        console.log('');
        console.log('Key Findings:');

        const yourBooksSuccess = results.find(r => r.clientId === 'your-books' && r.topReviewsCount > 0);
        const quickviewSuccess = results.find(r => r.clientId === 'quickview' && r.topReviewsCount > 0);

        console.log('');
        console.log('By Client ID:');
        console.log(`  your-books: ${yourBooksSuccess ? `✅ Works (${yourBooksSuccess.topReviewsCount} reviews)` : '❌ No reviews'}`);
        console.log(`  quickview: ${quickviewSuccess ? `✅ Works (${quickviewSuccess.topReviewsCount} reviews)` : '❌ No reviews'}`);
        console.log('');

        if (yourBooksSuccess && !quickviewSuccess) {
            console.log('💡 CONCLUSION: x-client-id: your-books is superior for review retrieval');
        } else if (quickviewSuccess && !yourBooksSuccess) {
            console.log('💡 CONCLUSION: x-client-id: quickview is superior for review retrieval');
        }
    }

    console.log('');
}

// Auto-run
runAllTests();
