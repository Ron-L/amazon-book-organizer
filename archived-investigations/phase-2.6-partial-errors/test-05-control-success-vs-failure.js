// test-05-control-success-vs-failure.js
// Browser Console Test - Control test: Compare working vs failing book
//
// VERSION: v1.0 (2025-11-10 14:40)
//
// PURPOSE: Verify test script works correctly by testing both:
//   1. A book that DOES have topReviews in production (Necroscope - B003J5UJD6)
//   2. A book that DOESN'T have topReviews in production (Lethal Code - B00J9P2EMO)
//
// EXPECTED RESULTS:
//   - Necroscope: Should retrieve topReviews successfully (no errors)
//   - Lethal Code: Should fail with "Customer Id or Marketplace Id is invalid" error
//
// INSTRUCTIONS:
// 1. Go to: https://www.amazon.com/yourbooks
// 2. Open Developer Tools (F12) → Console tab
// 3. Paste this ENTIRE script and press Enter
// 4. Review the comparative output

const SCRIPT_VERSION = 'v1.0';
const SCRIPT_DATE = '2025-11-10 14:40';

console.log(`Script: test-05-control-success-vs-failure.js ${SCRIPT_VERSION} (${SCRIPT_DATE})`);
console.log('');

// Test books: one success, one failure
const TEST_BOOKS = [
    {
        asin: 'B003J5UJD6',
        title: 'Necroscope: Avengers',
        expected: 'SUCCESS (has 14 topReviews in production library)',
        reviewCount: '238'
    },
    {
        asin: 'B00J9P2EMO',
        title: 'Lethal Code',
        expected: 'FAILURE (has 0 topReviews in production library)',
        reviewCount: '1,674'
    }
];

// Extract CSRF token from meta tag
const csrfMeta = document.querySelector('meta[name="anti-csrftoken-a2z"]');
const csrfToken = csrfMeta ? csrfMeta.getAttribute('content') : null;

console.log('='.repeat(80));
console.log(`TEST 05 - Control Test: Success vs Failure (${SCRIPT_VERSION})`);
console.log('='.repeat(80));
console.log('');
console.log('Purpose: Verify test script correctly handles both working and failing books');
console.log('Method: getProducts + x-client-id: your-books (production config)');
console.log('Headers: Copied EXACTLY from library-fetcher.js lines 1218-1223');
console.log('');
console.log(`CSRF Token: ${csrfToken ? 'Found ✅' : 'NOT FOUND ❌'}`);
console.log('');
console.log('Test Books:');
TEST_BOOKS.forEach((book, idx) => {
    console.log(`  ${idx + 1}. ${book.title} (${book.asin})`);
    console.log(`     Expected: ${book.expected}`);
});
console.log('');

// Query copied EXACTLY from library-fetcher.js lines 1167-1210
function buildQuery(asin) {
    return `query enrichBook {
        getProducts(input: [{asin: "${asin}"}]) {
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
}

const results = [];

async function testBook(book, index) {
    console.log(`--- Test ${index + 1}/${TEST_BOOKS.length}: ${book.title} ---`);
    console.log(`ASIN: ${book.asin}`);
    console.log(`Expected: ${book.expected}`);
    console.log('');

    const startTime = Date.now();

    try {
        // Headers copied EXACTLY from library-fetcher.js lines 1218-1223
        const headers = {
            'accept': 'application/json, text/plain, */*',
            'content-type': 'application/json',
            'anti-csrftoken-a2z': csrfToken,
            'x-client-id': 'your-books'
        };

        const response = await fetch('https://www.amazon.com/kindle-reader-api', {
            method: 'POST',
            headers: headers,
            credentials: 'include',
            body: JSON.stringify({
                query: buildQuery(book.asin),
                operationName: 'enrichBook'
            })
        });

        const duration = ((Date.now() - startTime) / 1000).toFixed(2);

        if (!response.ok) {
            console.log(`❌ HTTP ${response.status}`);
            results.push({
                ...book,
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

        if (hasData && topReviewsCount > 0) {
            console.log(`First Review Preview: ${productData.customerReviewsTop.reviews[0].contentAbstract.textAbstract.substring(0, 80)}...`);
        }

        console.log('');

        // Verdict
        let verdict = '';
        if (!hasErrors && topReviewsCount > 0) {
            verdict = '✅ COMPLETE SUCCESS';
        } else if (hasErrors && topReviewsCount === 0) {
            verdict = '⚠️  PARTIAL ERROR (no topReviews)';
        } else if (hasErrors && topReviewsCount > 0) {
            verdict = '⚠️  PARTIAL ERROR (but got some topReviews)';
        } else if (!hasErrors && topReviewsCount === 0) {
            verdict = '❓ NO ERRORS but no topReviews';
        }

        console.log(verdict);
        console.log('');

        // Store result
        results.push({
            ...book,
            duration,
            hasErrors,
            hasData,
            reviewCount,
            topReviewsCount,
            errorMessage: hasErrors ? result.errors[0].message : null,
            errorPath: hasErrors ? result.errors[0].path?.join(' → ') : null,
            verdict
        });

    } catch (err) {
        console.error(`❌ FETCH FAILED: ${err.message}`);
        results.push({
            ...book,
            exception: err.message,
            success: false
        });
        console.log('');
    }
}

async function runTests() {
    for (let i = 0; i < TEST_BOOKS.length; i++) {
        await testBook(TEST_BOOKS[i], i);

        // Delay between tests
        if (i < TEST_BOOKS.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 2000));
        }
    }

    // Comparison table
    console.log('='.repeat(80));
    console.log('RESULTS SUMMARY');
    console.log('='.repeat(80));
    console.log('');

    console.log('Book                | Reviews Retrieved | Expected | Result');
    console.log('-'.repeat(80));

    results.forEach(r => {
        if (r.success === false) {
            console.log(`${r.title.padEnd(19)} | FAILED`);
            return;
        }

        const retrieved = r.topReviewsCount.toString().padStart(2);
        const expectSuccess = r.expected.includes('SUCCESS');
        const actualSuccess = r.topReviewsCount > 0;
        const match = expectSuccess === actualSuccess ? '✅ Match' : '❌ MISMATCH';

        console.log(`${r.title.padEnd(19)} | ${retrieved} topReviews      | ${expectSuccess ? 'Success ' : 'Failure '} | ${match}`);
    });

    console.log('');

    // Analysis
    console.log('='.repeat(80));
    console.log('ANALYSIS');
    console.log('='.repeat(80));
    console.log('');

    const matches = results.filter(r => {
        const expectSuccess = r.expected.includes('SUCCESS');
        const actualSuccess = r.topReviewsCount > 0;
        return expectSuccess === actualSuccess;
    });

    const mismatches = results.filter(r => {
        const expectSuccess = r.expected.includes('SUCCESS');
        const actualSuccess = r.topReviewsCount > 0;
        return expectSuccess !== actualSuccess;
    });

    if (mismatches.length === 0) {
        console.log('✅ TEST SCRIPT VALIDATED');
        console.log('');
        console.log('All test results match expectations:');
        results.forEach(r => {
            const expectSuccess = r.expected.includes('SUCCESS');
            if (expectSuccess) {
                console.log(`  - ${r.title}: Expected success → Got ${r.topReviewsCount} topReviews ✅`);
            } else {
                console.log(`  - ${r.title}: Expected failure → Got 0 topReviews (error: ${r.errorMessage}) ✅`);
            }
        });
        console.log('');
        console.log('Conclusion: Test script is working correctly.');
        console.log('The "Customer Id or Marketplace Id is invalid" error is REAL and');
        console.log('affects specific ASINs, not a test script bug.');
    } else {
        console.log('❌ TEST SCRIPT ISSUE DETECTED');
        console.log('');
        console.log('Mismatches found:');
        mismatches.forEach(r => {
            const expectSuccess = r.expected.includes('SUCCESS');
            const actualSuccess = r.topReviewsCount > 0;
            console.log(`  - ${r.title}:`);
            console.log(`    Expected: ${expectSuccess ? 'Success' : 'Failure'}`);
            console.log(`    Actual: ${actualSuccess ? 'Success' : 'Failure'} (${r.topReviewsCount} topReviews)`);
            if (r.errorMessage) {
                console.log(`    Error: ${r.errorMessage}`);
            }
        });
        console.log('');
        console.log('This suggests the test script is NOT matching production behavior.');
    }

    console.log('');
}

// Auto-run
runTests();
