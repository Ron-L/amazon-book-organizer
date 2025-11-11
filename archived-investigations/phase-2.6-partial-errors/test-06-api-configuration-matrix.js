// test-06-api-configuration-matrix.js
// Browser Console Test - Test ALL valid API configuration combinations
//
// VERSION: v1.0 (2025-11-11 08:30)
//
// PURPOSE: Map which API configurations return HTTP 200 (even if partial errors)
//
// STRATEGY: Test success = HTTP 200 + data returned (even with GraphQL errors)
//           This tells us which combinations are VALID, regardless of Amazon's
//           random "Customer Id or Marketplace Id is invalid" errors
//
// INSTRUCTIONS:
// 1. Go to: https://www.amazon.com/yourbooks
// 2. Open Developer Tools (F12) → Console tab
// 3. Paste this ENTIRE script and press Enter
// 4. Review the configuration matrix output

const SCRIPT_VERSION = 'v1.0';
const SCRIPT_DATE = '2025-11-11 08:30';

console.log(`Script: test-06-api-configuration-matrix.js ${SCRIPT_VERSION} (${SCRIPT_DATE})`);
console.log('');

// Test books: 1 known-working, 1 consistent-failure
const TEST_BOOKS = [
    {
        asin: 'B003J5UJD6',
        title: 'Necroscope: Avengers',
        expected: 'Should work (has topReviews in production)'
    },
    {
        asin: 'B0085HN8N6',
        title: '99 Reasons to Hate Cats',
        expected: 'Consistent failure (one of the 3)'
    }
];

// Extract CSRF token from meta tag
const csrfMeta = document.querySelector('meta[name="anti-csrftoken-a2z"]');
const csrfToken = csrfMeta ? csrfMeta.getAttribute('content') : null;

console.log('='.repeat(80));
console.log(`TEST 06 - API Configuration Matrix (${SCRIPT_VERSION})`);
console.log('='.repeat(80));
console.log('');
console.log('Purpose: Map all valid API configurations (HTTP 200 + data)');
console.log('');
console.log('Test Books:');
TEST_BOOKS.forEach((book, idx) => {
    console.log(`  ${idx + 1}. ${book.title} (${book.asin})`);
    console.log(`     Expected: ${book.expected}`);
});
console.log('');
console.log(`CSRF Token: ${csrfToken ? 'Found ✅' : 'NOT FOUND ❌'}`);
console.log('');

// API Configurations to test
const configurations = [
    {
        name: 'getProducts + your-books',
        rootField: 'getProducts',
        clientId: 'your-books',
        operationName: 'enrichBook',
        buildQuery: (asin) => `query enrichBook {
            getProducts(input: [{asin: "${asin}"}]) {
                asin
                title {
                    displayString
                }
                customerReviewsSummary {
                    count {
                        displayString
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
        }`,
        note: 'Current production config'
    },
    {
        name: 'getProducts + quickview',
        rootField: 'getProducts',
        clientId: 'quickview',
        operationName: 'enrichBook',
        buildQuery: (asin) => `query enrichBook {
            getProducts(input: [{asin: "${asin}"}]) {
                asin
                title {
                    displayString
                }
                customerReviewsSummary {
                    count {
                        displayString
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
        }`,
        note: 'Plural + popup context'
    },
    {
        name: 'getProduct + your-books',
        rootField: 'getProduct',
        clientId: 'your-books',
        operationName: 'getProductTest',
        buildQuery: (asin) => `query getProductTest($asin: ID!) {
            getProduct(asin: $asin) {
                asin
                title {
                    displayString
                }
                customerReviewsSummary {
                    count {
                        displayString
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
        }`,
        variables: (asin) => ({ asin }),
        note: 'Singular + library context'
    },
    {
        name: 'getProduct + quickview',
        rootField: 'getProduct',
        clientId: 'quickview',
        operationName: 'getProductTest',
        buildQuery: (asin) => `query getProductTest($asin: ID!) {
            getProduct(asin: $asin) {
                asin
                title {
                    displayString
                }
                customerReviewsSummary {
                    count {
                        displayString
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
        }`,
        variables: (asin) => ({ asin }),
        note: 'Singular + popup context (Amazon popup)'
    },
    {
        name: 'getProductByAsin + your-books',
        rootField: 'getProductByAsin',
        clientId: 'your-books',
        operationName: 'getProductByAsinTest',
        buildQuery: (asin) => `query getProductByAsinTest($asin: String!) {
            getProductByAsin(asin: $asin) {
                asin
                title
                customerReviews {
                    totalReviewCount
                    topReviews {
                        text
                        rating
                        title
                    }
                }
            }
        }`,
        variables: (asin) => ({ asin }),
        note: 'Old endpoint + library context'
    },
    {
        name: 'getProductByAsin + quickview',
        rootField: 'getProductByAsin',
        clientId: 'quickview',
        operationName: 'getProductByAsinTest',
        buildQuery: (asin) => `query getProductByAsinTest($asin: String!) {
            getProductByAsin(asin: $asin) {
                asin
                title
                customerReviews {
                    totalReviewCount
                    topReviews {
                        text
                        rating
                        title
                    }
                }
            }
        }`,
        variables: (asin) => ({ asin }),
        note: 'Old endpoint + popup context'
    }
];

const results = [];

async function testConfiguration(config, book, testIndex) {
    const testId = `${config.name} × ${book.title}`;
    console.log(`[${testIndex}/${configurations.length * TEST_BOOKS.length}] Testing: ${testId}...`);

    const startTime = Date.now();

    try {
        // Headers copied from library-fetcher.js
        const headers = {
            'accept': 'application/json, text/plain, */*',
            'content-type': 'application/json',
            'anti-csrftoken-a2z': csrfToken,
            'x-client-id': config.clientId
        };

        const body = {
            query: config.buildQuery(book.asin),
            operationName: config.operationName
        };

        if (config.variables) {
            body.variables = config.variables(book.asin);
        }

        const response = await fetch('https://www.amazon.com/kindle-reader-api', {
            method: 'POST',
            headers: headers,
            credentials: 'include',
            body: JSON.stringify(body)
        });

        const duration = ((Date.now() - startTime) / 1000).toFixed(2);

        // Check HTTP status
        if (!response.ok) {
            console.log(`   ❌ HTTP ${response.status}`);
            results.push({
                config: config.name,
                book: book.title,
                asin: book.asin,
                httpStatus: response.status,
                valid: false,
                reason: `HTTP ${response.status}`
            });
            return;
        }

        // Parse response
        const data = await response.json();

        // Check for data (regardless of errors)
        const hasData = !!(
            data.data?.getProducts?.[0] ||
            data.data?.getProduct ||
            data.data?.getProductByAsin
        );

        const hasErrors = data.errors && data.errors.length > 0;

        // Extract review data
        let reviewCount = 'N/A';
        let topReviewsCount = 0;
        let errorMessage = null;

        if (hasData) {
            const product =
                data.data?.getProducts?.[0] ||
                data.data?.getProduct ||
                data.data?.getProductByAsin;

            // Different structures for different root fields
            if (config.rootField === 'getProductByAsin') {
                reviewCount = product.customerReviews?.totalReviewCount || 'N/A';
                topReviewsCount = product.customerReviews?.topReviews?.length || 0;
            } else {
                reviewCount = product.customerReviewsSummary?.count?.displayString || 'N/A';
                topReviewsCount = product.customerReviewsTop?.reviews?.length || 0;
            }
        }

        if (hasErrors) {
            errorMessage = data.errors[0].message;
        }

        // Determine validity: HTTP 200 + data = VALID configuration
        const valid = hasData;

        const status = valid
            ? (hasErrors ? '⚠️  PARTIAL' : '✅ VALID')
            : '❌ INVALID';

        console.log(`   ${status} (${duration}s) - Reviews: ${topReviewsCount}, Errors: ${hasErrors ? 'YES' : 'NO'}`);

        results.push({
            config: config.name,
            book: book.title,
            asin: book.asin,
            httpStatus: 200,
            valid,
            hasErrors,
            errorMessage,
            reviewCount,
            topReviewsCount,
            duration
        });

    } catch (err) {
        console.error(`   ❌ FETCH FAILED: ${err.message}`);
        results.push({
            config: config.name,
            book: book.title,
            asin: book.asin,
            exception: err.message,
            valid: false,
            reason: 'Exception'
        });
    }
}

async function runAllTests() {
    let testIndex = 0;

    for (const book of TEST_BOOKS) {
        console.log('');
        console.log(`${'='.repeat(80)}`);
        console.log(`Testing: ${book.title} (${book.asin})`);
        console.log(`${'='.repeat(80)}`);
        console.log('');

        for (const config of configurations) {
            testIndex++;
            await testConfiguration(config, book, testIndex);

            // Delay between tests
            if (testIndex < configurations.length * TEST_BOOKS.length) {
                await new Promise(resolve => setTimeout(resolve, 1500));
            }
        }
    }

    // Summary matrix
    console.log('');
    console.log('='.repeat(80));
    console.log('CONFIGURATION MATRIX');
    console.log('='.repeat(80));
    console.log('');

    console.log('Legend:');
    console.log('  ✅ VALID   = HTTP 200 + data returned (no errors)');
    console.log('  ⚠️  PARTIAL = HTTP 200 + data returned (with GraphQL errors)');
    console.log('  ❌ INVALID = HTTP error OR no data returned');
    console.log('');

    // Group by configuration
    const configNames = [...new Set(results.map(r => r.config))];
    const bookNames = [...new Set(results.map(r => r.book))];

    console.log('Configuration'.padEnd(35) + ' | ' + bookNames.map(b => b.substring(0, 20).padEnd(20)).join(' | '));
    console.log('-'.repeat(35 + 3 + (bookNames.length * 23)));

    configNames.forEach(configName => {
        const configResults = bookNames.map(bookName => {
            const result = results.find(r => r.config === configName && r.book === bookName);
            if (!result) return '?'.padEnd(20);

            if (!result.valid) {
                return `❌ ${result.reason || 'FAIL'}`.padEnd(20);
            }

            const symbol = result.hasErrors ? '⚠️ ' : '✅';
            const reviews = result.topReviewsCount.toString().padStart(2);
            return `${symbol} ${reviews} rev`.padEnd(20);
        });

        console.log(configName.padEnd(35) + ' | ' + configResults.join(' | '));
    });

    console.log('');

    // Analysis
    console.log('='.repeat(80));
    console.log('ANALYSIS');
    console.log('='.repeat(80));
    console.log('');

    const validConfigs = results.filter(r => r.valid);
    const invalidConfigs = results.filter(r => !r.valid);

    console.log(`Valid configurations: ${validConfigs.length}/${results.length}`);
    console.log('');

    // Group by config name
    const configSuccessRates = {};
    configNames.forEach(configName => {
        const configResults = results.filter(r => r.config === configName);
        const successCount = configResults.filter(r => r.valid).length;
        const totalCount = configResults.length;
        const successRate = ((successCount / totalCount) * 100).toFixed(0);
        configSuccessRates[configName] = { successCount, totalCount, successRate };
    });

    console.log('Configuration Success Rates:');
    Object.entries(configSuccessRates)
        .sort((a, b) => b[1].successRate - a[1].successRate)
        .forEach(([name, stats]) => {
            const bar = '█'.repeat(Math.floor(stats.successRate / 5));
            console.log(`  ${name.padEnd(35)} ${stats.successCount}/${stats.totalCount} ${bar} ${stats.successRate}%`);
        });

    console.log('');

    // Review retrieval analysis
    console.log('Review Retrieval Results:');
    const withReviews = validConfigs.filter(r => r.topReviewsCount > 0);
    const withoutReviews = validConfigs.filter(r => r.topReviewsCount === 0);

    console.log(`  Configurations that retrieved reviews: ${withReviews.length}/${validConfigs.length}`);
    withReviews.forEach(r => {
        console.log(`    • ${r.config} × ${r.book} → ${r.topReviewsCount} reviews`);
    });
    console.log('');

    console.log(`  Configurations with 0 reviews: ${withoutReviews.length}/${validConfigs.length}`);
    withoutReviews.forEach(r => {
        const reason = r.errorMessage || 'Unknown';
        console.log(`    • ${r.config} × ${r.book} → ${reason}`);
    });

    console.log('');

    // Recommendations
    console.log('='.repeat(80));
    console.log('RECOMMENDATIONS');
    console.log('='.repeat(80));
    console.log('');

    const bestConfig = Object.entries(configSuccessRates)
        .sort((a, b) => b[1].successRate - a[1].successRate)[0];

    console.log(`🏆 Most Reliable Configuration: ${bestConfig[0]}`);
    console.log(`   Success Rate: ${bestConfig[1].successRate}%`);
    console.log('');

    console.log('📝 For Phase 3 Retry Logic:');
    console.log('   1. Use primary config (current production) first');
    console.log('   2. On failure, try configurations in order of success rate');
    console.log('   3. Accept partial errors (⚠️) as long as data is returned');
    console.log('   4. Track which configs work for each book over time');
    console.log('');

    console.log('💡 Key Insight:');
    console.log('   Even "valid" configs may return 0 reviews due to Amazon\'s');
    console.log('   random "Customer Id or Marketplace Id is invalid" errors.');
    console.log('   Retrying the SAME config later may succeed!');
    console.log('');
}

// Auto-run
runAllTests();
