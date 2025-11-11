// Diagnostic script to test alternating requests between known-good Kindle and Queen's Ransom
// Run this in browser console on amazon.com/yourbooks
// Script: diag-03-alternating-test.js

const KINDLE_ASIN = "B003J5UJD6"; // Known-good Kindle book (succeeded in all tests)
const QUEEN_ASIN = "0684862670"; // Queen's Ransom (hardcover ISBN - fails in fetcher)
const MAX_PAIRS = 1250; // 1250 pairs = 2500 total requests
const DELAY_MS = 350; // Same as fetcher

async function testAlternating() {
    console.log('========================================');
    console.log('ALTERNATING REQUEST DIAGNOSTIC');
    console.log('Script: diag-03-alternating-test.js');
    console.log('========================================');
    console.log('');
    console.log(`📖 Book A (Kindle): ${KINDLE_ASIN}`);
    console.log(`📖 Book B (Queen): ${QUEEN_ASIN}`);
    console.log(`🔁 Total Pairs: ${MAX_PAIRS} (${MAX_PAIRS * 2} total requests)`);
    console.log(`⏱️  Estimated Time: ~${Math.round(MAX_PAIRS * 2 * (DELAY_MS + 200) / 1000 / 60)} minutes`);
    console.log('');
    console.log('Pattern: Kindle, Queen, Kindle, Queen, Kindle, Queen...');
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

    // Step 2: Alternate between Kindle and Queen
    console.log('[2/2] Starting alternating test...');
    console.log('');

    const startTime = Date.now();
    const results = {
        kindleSuccesses: 0,
        kindleFailures: 0,
        queenSuccesses: 0,
        queenFailures: 0,
        firstKindleFailureAt: null,
        firstQueenFailureAt: null,
        totalRequests: 0,
        kindleDescriptions: [],
        queenDescriptions: []
    };

    for (let i = 0; i < MAX_PAIRS; i++) {
        const pairNum = i + 1;
        const requestNum = (i * 2) + 1;

        // Progress update every 50 pairs (100 requests)
        if (pairNum % 50 === 0 || pairNum === 1) {
            const elapsed = Date.now() - startTime;
            const avgTime = elapsed / requestNum;
            const remaining = (MAX_PAIRS * 2 - requestNum) * avgTime;
            const remainingMin = Math.round(remaining / 1000 / 60);

            console.log(`📊 Progress: Pair ${pairNum}/${MAX_PAIRS} (${Math.round(pairNum/MAX_PAIRS*100)}%) | Requests: ${requestNum}/${MAX_PAIRS * 2}`);
            console.log(`   Elapsed: ${Math.round(elapsed/1000/60)}m | Remaining: ~${remainingMin}m`);
            console.log(`   Kindle: ${results.kindleSuccesses}✅ ${results.kindleFailures}❌ | Queen: ${results.queenSuccesses}✅ ${results.queenFailures}❌`);
            console.log('');
        }

        // Request 1: Kindle book
        const kindleResult = await enrichBook(KINDLE_ASIN, csrfToken);
        results.totalRequests++;

        if (kindleResult.success) {
            results.kindleSuccesses++;
            results.kindleDescriptions.push(kindleResult.descriptionLength);
        } else {
            results.kindleFailures++;

            if (!results.firstKindleFailureAt) {
                results.firstKindleFailureAt = results.totalRequests;

                console.log('');
                console.log('========================================');
                console.log('⚠️  KINDLE BOOK FAILED!');
                console.log('========================================');
                console.log('');
                console.log(`   Request #: ${results.totalRequests}`);
                console.log(`   Pair #: ${pairNum}`);
                console.log(`   Elapsed time: ${Math.round((Date.now() - startTime)/1000/60)} minutes`);
                console.log(`   Error: ${kindleResult.error}`);
                console.log('');
                console.log('💡 This is unexpected - Kindle book has never failed before!');
                console.log('');
                console.log('========================================');
            }
        }

        await new Promise(resolve => setTimeout(resolve, DELAY_MS));

        // Request 2: Queen's Ransom
        const queenResult = await enrichBook(QUEEN_ASIN, csrfToken);
        results.totalRequests++;

        if (queenResult.success) {
            results.queenSuccesses++;
            results.queenDescriptions.push(queenResult.descriptionLength);
        } else {
            results.queenFailures++;

            if (!results.firstQueenFailureAt) {
                results.firstQueenFailureAt = results.totalRequests;

                console.log('');
                console.log('========================================');
                console.log('🎯 QUEEN\'S RANSOM FAILED!');
                console.log('========================================');
                console.log('');
                console.log(`   Request #: ${results.totalRequests}`);
                console.log(`   Pair #: ${pairNum}`);
                console.log(`   Elapsed time: ${Math.round((Date.now() - startTime)/1000/60)} minutes`);
                console.log(`   Error: ${queenResult.error}`);
                console.log('');
                console.log('💡 ANALYSIS:');
                console.log(`   → Queen's Ransom failed after ${pairNum} alternating pairs (${results.totalRequests} total requests)`);
                console.log(`   → Alternating with different book DOES trigger the failure`);
                console.log(`   → Problem requires variety of different books in sequence`);
                console.log('');
                console.log('========================================');

                // Stop on first Queen failure
                break;
            }
        }

        await new Promise(resolve => setTimeout(resolve, DELAY_MS));

        // If BOTH books have failed, stop the test
        if (results.firstKindleFailureAt && results.firstQueenFailureAt) {
            console.log('');
            console.log('⚠️  Both books have failed. Stopping test.');
            console.log('');
            break;
        }
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
    console.log(`   Total pairs completed: ${Math.floor(results.totalRequests / 2)}`);
    console.log(`   Total time: ${Math.round(totalTime/1000/60)} minutes`);
    console.log('');
    console.log(`   Kindle (${KINDLE_ASIN}):`);
    console.log(`      Successes: ${results.kindleSuccesses}`);
    console.log(`      Failures: ${results.kindleFailures}`);
    if (results.firstKindleFailureAt) {
        console.log(`      First failure at request: ${results.firstKindleFailureAt}`);
    }
    console.log('');
    console.log(`   Queen (${QUEEN_ASIN}):`);
    console.log(`      Successes: ${results.queenSuccesses}`);
    console.log(`      Failures: ${results.queenFailures}`);
    if (results.firstQueenFailureAt) {
        console.log(`      First failure at request: ${results.firstQueenFailureAt}`);
    }
    console.log('');

    // Analysis
    if (results.firstQueenFailureAt && !results.firstKindleFailureAt) {
        console.log('🎯 CONCLUSION:');
        console.log(`   ✅ Queen's Ransom FAILED at request #${results.firstQueenFailureAt} (pair #${Math.ceil(results.firstQueenFailureAt/2)})`);
        console.log(`   ✅ Kindle book NEVER FAILED (${results.kindleSuccesses}/${results.kindleSuccesses} succeeded)`);
        console.log('');
        console.log('💡 KEY INSIGHTS:');
        console.log(`   → Alternating between 2 different books DOES trigger Queen failure`);
        console.log(`   → Queen fails after ~${Math.ceil(results.firstQueenFailureAt/2)} pairs (variety matters!)`);
        console.log(`   → Problem is NOT simply "request count" - it's about DIFFERENT books`);
        console.log('');
        console.log('📌 COMPARISON:');
        console.log(`   → Test 1 (Queen only): 2500 requests, 0 failures`);
        console.log(`   → Test 2 (Alternating): ${results.firstQueenFailureAt} requests, Queen failed`);
        console.log(`   → Difference: Book variety triggers the failure!`);
    } else if (results.firstKindleFailureAt && results.firstQueenFailureAt) {
        console.log('⚠️  CONCLUSION:');
        console.log('   BOTH books failed during alternating test');
        console.log(`   → Kindle failed at request #${results.firstKindleFailureAt}`);
        console.log(`   → Queen failed at request #${results.firstQueenFailureAt}`);
        console.log('');
        console.log('💡 This suggests:');
        console.log('   → General API degradation after many requests with variety');
        console.log('   → Not specific to Queen\'s Ransom');
    } else if (results.firstKindleFailureAt && !results.firstQueenFailureAt) {
        console.log('❓ UNEXPECTED CONCLUSION:');
        console.log('   Kindle book failed but Queen\'s Ransom never did!');
        console.log(`   → Kindle failed at request #${results.firstKindleFailureAt}`);
        console.log(`   → Queen succeeded all ${results.queenSuccesses} times`);
        console.log('');
        console.log('💡 This is very strange and requires further investigation.');
    } else {
        console.log('💡 CONCLUSION:');
        console.log(`   ❌ Neither book failed (${results.totalRequests} requests)`);
        console.log('');
        console.log('📌 COMPARISON:');
        console.log(`   → Test 1 (Queen only): 2500 requests, 0 failures`);
        console.log(`   → Test 2 (Alternating): ${results.totalRequests} requests, 0 failures`);
        console.log('');
        console.log('💡 This suggests:');
        console.log('   → Need MORE VARIETY (more than 2 different books)');
        console.log('   → Next test: Option 1 (full library with all different books)');
    }

    console.log('');
    console.log('========================================');

    // Save results
    window.alternatingTestResults = results;
    console.log('📦 Results saved to: window.alternatingTestResults');
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
console.log('🔬 ALTERNATING REQUEST TEST');
console.log('========================================');
console.log('');
console.log('This test alternates between Kindle and Queen\'s Ransom.');
console.log('Pattern: Kindle, Queen, Kindle, Queen, etc.');
console.log('It will stop when Queen\'s Ransom fails.');
console.log('');
console.log('Starting in 3 seconds...');
console.log('');

setTimeout(() => {
    testAlternating();
}, 3000);
