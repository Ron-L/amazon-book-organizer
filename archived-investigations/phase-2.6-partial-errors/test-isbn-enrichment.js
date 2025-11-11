// Minimal test script - exact copy of fetcher's enrichment code
// Run on amazon.com/yourbooks
// Script: test-isbn-enrichment.js

const TEST_CASES = [
    { name: "Known-bad ISBN #1", id: "0684862670" },
    { name: "Known-bad ISBN #2", id: "0684862689" },
    { name: "Known-good ISBN", id: "0684838419" },  // TO SHIELD THE QUEEN
    { name: "Real ASIN for bad #1", id: "B000FC0T6S" },
    { name: "Real ASIN for bad #2", id: "B0033DDIU0" }
];

async function testEnrichment() {
    console.log('========================================');
    console.log('ISBN ENRICHMENT TEST');
    console.log('Script: test-isbn-enrichment.js');
    console.log('========================================');
    console.log('');

    const results = [];

    for (const testCase of TEST_CASES) {
        console.log(`Testing: ${testCase.name}`);
        console.log(`   ID: ${testCase.id}`);

        const result = await enrichBook(testCase.id);
        results.push({
            ...testCase,
            ...result
        });

        if (result.success) {
            console.log(`   ✅ SUCCESS`);
            console.log(`      Title: ${result.title}`);
            console.log(`      Authors: ${result.authors}`);
            console.log(`      Description: ${result.descriptionLength} chars`);
        } else {
            console.log(`   ❌ FAILED`);
            console.log(`      Error: ${result.error}`);
        }
        console.log('');

        // Small delay between tests
        await new Promise(resolve => setTimeout(resolve, 1500));
    }

    // Summary
    console.log('========================================');
    console.log('RESULTS SUMMARY');
    console.log('========================================');
    console.log('');

    const isbnResults = results.filter(r => /^\d{10}$/.test(r.id));
    const asinResults = results.filter(r => /^B[A-Z0-9]{9}$/.test(r.id));

    console.log('📊 ISBN Results:');
    isbnResults.forEach(r => {
        const status = r.success ? '✅' : '❌';
        console.log(`   ${status} ${r.name} (${r.id})`);
        if (r.success) {
            console.log(`      "${r.title}"`);
        } else {
            console.log(`      Error: ${r.error}`);
        }
    });
    console.log('');

    console.log('📊 ASIN Results:');
    asinResults.forEach(r => {
        const status = r.success ? '✅' : '❌';
        console.log(`   ${status} ${r.name} (${r.id})`);
        if (r.success) {
            console.log(`      "${r.title}"`);
        } else {
            console.log(`      Error: ${r.error}`);
        }
    });
    console.log('');

    // Analysis
    const isbnSuccesses = isbnResults.filter(r => r.success).length;
    const isbnFailures = isbnResults.filter(r => !r.success).length;
    const asinSuccesses = asinResults.filter(r => r.success).length;
    const asinFailures = asinResults.filter(r => !r.success).length;

    console.log('💡 ANALYSIS:');
    console.log(`   ISBNs: ${isbnSuccesses} success, ${isbnFailures} failure`);
    console.log(`   ASINs: ${asinSuccesses} success, ${asinFailures} failure`);
    console.log('');

    if (isbnFailures === 2 && isbnSuccesses === 1) {
        console.log('   ✅ Pattern confirmed: 2 specific ISBNs fail, others work');
        console.log('   → These 2 ISBNs are special cases in Amazon\'s system');
        console.log('');
    }

    if (asinSuccesses === 2) {
        console.log('   ✅ Real ASINs work - conversion is possible');
        console.log('   → Solution: Need ISBN→ASIN mapping for problem books');
        console.log('');
    }

    console.log('========================================');

    // Save results
    window.enrichmentTestResults = results;
    console.log('📦 Results saved to: window.enrichmentTestResults');
}

// EXACT copy of enrichBook from fetcher
async function enrichBook(asin) {
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

    try {
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

        if (!response.ok) {
            return {
                success: false,
                error: `HTTP ${response.status}`,
                httpStatus: response.status
            };
        }

        const data = await response.json();

        if (data.errors) {
            return {
                success: false,
                error: data.errors[0]?.message || 'GraphQL error',
                graphqlError: data.errors[0]
            };
        }

        if (!data.data?.getProductByAsin) {
            return {
                success: false,
                error: 'No product data returned'
            };
        }

        const product = data.data.getProductByAsin;

        // Extract description (same logic as fetcher)
        let description = '';
        if (product.productDescription?.plaintext) {
            description = product.productDescription.plaintext;
        } else if (product.productDescription?.content?.content) {
            description = product.productDescription.content.content;
        } else if (product.auxiliaryStoreRecommendations?.details) {
            // Try AI summary fallback
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
            binding: product.binding || '',
            description,
            descriptionLength: description.length,
            pageCount: product.pageCount || 0,
            reviewCount: product.customerReviews?.totalReviewCount || 0,
            rating: product.customerReviews?.averageStarRating || 0
        };

    } catch (err) {
        return {
            success: false,
            error: err.message,
            exception: err
        };
    }
}

// Auto-run
console.log('🚀 Starting ISBN enrichment test...');
console.log('');
testEnrichment();
