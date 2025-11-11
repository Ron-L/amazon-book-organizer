// Diagnostic script to test if Queen's Ransom fails when requested repeatedly
// Run this in browser console on amazon.com/yourbooks
// Script: diag-02-queen-repetition-test.js

const TARGET_ASIN = "0684862670"; // Queen's Ransom (hardcover ISBN)
const MAX_REQUESTS = 2500;
const DELAY_MS = 350; // Same as fetcher

async function testQueenRepetition() {
    console.log('========================================');
    console.log('QUEEN REPETITION DIAGNOSTIC');
    console.log('Script: diag-02-queen-repetition-test.js');
    console.log('========================================');
    console.log('');
    console.log(`📖 Target Book: Queen's Ransom (${TARGET_ASIN})`);
    console.log(`🔁 Total Requests: ${MAX_REQUESTS}`);
    console.log(`⏱️  Estimated Time: ~${Math.round(MAX_REQUESTS * (DELAY_MS + 200) / 1000 / 60)} minutes`);
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

    // Step 2: Request Queen's Ransom repeatedly
    console.log('[2/2] Starting repetition test...');
    console.log('');

    const startTime = Date.now();
    const results = {
        successes: 0,
        failures: 0,
        firstFailureAt: null,
        totalRequests: 0,
        descriptions: []
    };

    for (let i = 0; i < MAX_REQUESTS; i++) {
        const requestNum = i + 1;

        // Progress update every 100 requests
        if (requestNum % 100 === 0 || requestNum === 1) {
            const elapsed = Date.now() - startTime;
            const avgTime = elapsed / requestNum;
            const remaining = (MAX_REQUESTS - requestNum) * avgTime;
            const remainingMin = Math.round(remaining / 1000 / 60);

            console.log(`📊 Progress: ${requestNum}/${MAX_REQUESTS} (${Math.round(requestNum/MAX_REQUESTS*100)}%)`);
            console.log(`   Elapsed: ${Math.round(elapsed/1000/60)}m | Remaining: ~${remainingMin}m`);
            console.log(`   Success: ${results.successes} | Failures: ${results.failures}`);
            console.log('');
        }

        // Make the request
        const result = await enrichBook(TARGET_ASIN, csrfToken);
        results.totalRequests = requestNum;

        if (result.success) {
            results.successes++;
            results.descriptions.push(result.descriptionLength);
        } else {
            results.failures++;

            if (!results.firstFailureAt) {
                results.firstFailureAt = requestNum;

                console.log('');
                console.log('========================================');
                console.log('🎯 FIRST FAILURE DETECTED!');
                console.log('========================================');
                console.log('');
                console.log(`   Request #: ${requestNum}`);
                console.log(`   Elapsed time: ${Math.round((Date.now() - startTime)/1000/60)} minutes`);
                console.log(`   Error: ${result.error}`);
                console.log('');
                console.log('💡 ANALYSIS:');
                console.log(`   → Queen's Ransom failed after ${requestNum} requests`);
                console.log(`   → This proves request count threshold exists`);
                console.log(`   → Fetcher should implement throttling after ~${Math.floor(requestNum * 0.9)} books`);
                console.log('');
                console.log('========================================');

                // Stop on first failure
                break;
            }
        }

        // Delay between requests (same as fetcher)
        await new Promise(resolve => setTimeout(resolve, DELAY_MS));
    }

    // Final summary
    const totalTime = Date.now() - startTime;
    console.log('');
    console.log('========================================');
    console.log('TEST COMPLETE');
    console.log('========================================');
    console.log('');
    console.log(`📊 Final Statistics:`);
    console.log(`   Total requests: ${results.totalRequests}`);
    console.log(`   Successes: ${results.successes}`);
    console.log(`   Failures: ${results.failures}`);
    console.log(`   Total time: ${Math.round(totalTime/1000/60)} minutes`);
    console.log('');

    if (results.firstFailureAt) {
        console.log('🎯 CONCLUSION:');
        console.log(`   ✅ Queen's Ransom FAILED at request #${results.firstFailureAt}`);
        console.log(`   → Problem is REQUEST COUNT threshold for this book`);
        console.log(`   → Solution: Implement throttling in fetcher after ~${Math.floor(results.firstFailureAt * 0.9)} books`);
    } else {
        console.log('💡 CONCLUSION:');
        console.log(`   ❌ Queen's Ransom NEVER FAILED (${results.successes}/${MAX_REQUESTS} succeeded)`);
        console.log(`   → Problem is NOT simple request count for single book`);
        console.log(`   → Next test: Option 2 (alternating Kindle + Queen)`);
        console.log(`   → Hypothesis: Problem requires variety of different books`);
    }

    console.log('');
    console.log('========================================');

    // Save results
    window.queenTestResults = results;
    console.log('📦 Results saved to: window.queenTestResults');
}

// ============================================================================
// Extraction Functions (EXACT copy from fetcher)
// ============================================================================

const extractTextFromFragments = (fragments) => {
    if (!fragments || !Array.isArray(fragments)) return '';

    const textParts = [];

    for (const frag of fragments) {
        if (frag.text) {
            textParts.push(frag.text);
        }

        if (frag.paragraph?.text) {
            textParts.push(frag.paragraph.text);
        }

        if (frag.paragraph?.fragments) {
            textParts.push(extractTextFromFragments(frag.paragraph.fragments));
        }

        if (frag.semanticContent?.content?.text) {
            textParts.push(frag.semanticContent.content.text);
        }

        if (frag.semanticContent?.content?.fragments) {
            textParts.push(extractTextFromFragments(frag.semanticContent.content.fragments));
        }

        if (frag.semanticContent?.content?.paragraph?.text) {
            textParts.push(frag.semanticContent.content.paragraph.text);
        }

        if (frag.semanticContent?.content?.paragraph?.fragments) {
            textParts.push(extractTextFromFragments(frag.semanticContent.content.paragraph.fragments));
        }
    }

    return textParts.join('');
};

const extractDescription = (product) => {
    const descSection = product.description?.sections?.[0];
    const descContent = descSection?.content;

    if (!descContent) return '';

    if (typeof descContent === 'string') {
        return descContent;
    }

    if (descContent.text) {
        return descContent.text;
    }

    if (descContent.paragraph?.text) {
        return descContent.paragraph.text;
    }

    if (descContent.paragraph?.fragments) {
        return extractTextFromFragments(descContent.paragraph.fragments).trim();
    }

    if (descContent.fragments) {
        return extractTextFromFragments(descContent.fragments).trim();
    }

    if (descContent.semanticContent?.content?.fragments) {
        return extractTextFromFragments(descContent.semanticContent.content.fragments).trim();
    }

    if (descContent.semanticContent?.content?.text) {
        return descContent.semanticContent.content.text;
    }

    return '';
};

const extractAISummary = (product) => {
    const recommendations = product.auxiliaryStoreRecommendations?.recommendations || [];

    for (const rec of recommendations) {
        if (rec.recommendationType === 'AI_SUMMARIES' && rec.sharedContent?.length > 0) {
            return rec.sharedContent[0].contentAbstract?.textAbstract || '';
        }
    }

    return '';
};

// ============================================================================
// Enrichment function (EXACT copy from fetcher Phase 2)
// ============================================================================

async function enrichBook(asin, csrfToken) {
    const query = `query enrichBook {
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
        }
    }`;

    try {
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

        const product = data?.data?.getProducts?.[0];

        if (!product) {
            return {
                success: false,
                error: 'No product data returned'
            };
        }

        let description = extractDescription(product);

        if (!description) {
            description = extractAISummary(product);
        }

        return {
            success: true,
            description,
            descriptionLength: description.length,
            reviewCount: product.customerReviewsSummary?.count?.displayString || '0',
            rating: product.customerReviewsSummary?.rating?.value || 0
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
console.log('');
console.log('========================================');
console.log('🔬 QUEEN REPETITION TEST');
console.log('========================================');
console.log('');
console.log('This test will request Queen\'s Ransom 2500 times.');
console.log('It will stop immediately if a failure occurs.');
console.log('');
console.log('Starting in 3 seconds...');
console.log('');

setTimeout(() => {
    testQueenRepetition();
}, 3000);
