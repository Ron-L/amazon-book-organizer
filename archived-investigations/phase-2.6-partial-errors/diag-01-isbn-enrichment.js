// Diagnostic script to test ISBN vs ASIN enrichment with proper CSRF token handling
// Run this in browser console on amazon.com/yourbooks
// Script: diag-01-isbn-enrichment.js

const TEST_CASES = [
    { name: "Timeout #1 - Queen's Ransom", id: "0684862670", type: "ISBN (timeout)" },
    { name: "Timeout #2 - To Ruin A Queen", id: "0684862689", type: "ISBN (timeout)" },
    { name: "Control - TO SHIELD THE QUEEN", id: "0684838419", type: "ISBN (works)" },
    // Add a couple newer books to test if there's a fetch limit after 2000+ books
    // (Replace these with actual ASINs from the START of your library - newest books)
    { name: "Newer book control #1", id: "B003J5UJD6", type: "ASIN (newer)" },
    { name: "Newer book control #2", id: "B0FWCYMY93", type: "ASIN (newer)" }
];

async function testISBNEnrichment() {
    console.log('========================================');
    console.log('ISBN ENRICHMENT DIAGNOSTIC');
    console.log('Script: diag-01-isbn-enrichment.js');
    console.log('========================================');
    console.log('');

    // Step 1: Get CSRF token (REUSE fetcher's stale token)
    console.log('[1/3] Getting CSRF token...');
    console.log('');

    // ⚠️ TOKEN PASSING TEST: Reuse fetcher's token instead of reading fresh token
    const csrfToken = window.fetcherCsrfToken;

    if (!csrfToken) {
        console.error('❌ Fetcher token not found in window.fetcherCsrfToken');
        console.log('   Make sure library-fetcher.js exposed the token');
        return;
    }

    console.log(`   ✅ Using fetcher's token (2.5 hours old): ${csrfToken.substring(0, 10)}...`);
    console.log(`   🔬 TEST: If this fails, proves token staleness is the issue`);
    console.log('');

    // Step 2: Test enrichment API with each test case
    console.log('[2/3] Testing enrichment API...');
    console.log('');

    const results = [];

    for (const testCase of TEST_CASES) {
        console.log(`Testing: ${testCase.name}`);
        console.log(`   ID: ${testCase.id} (${testCase.type})`);

        const result = await enrichBook(testCase.id, csrfToken);
        results.push({
            ...testCase,
            ...result
        });

        if (result.success) {
            console.log(`   ✅ SUCCESS`);
            console.log(`      Description: ${result.descriptionLength} chars`);
            console.log(`      Reviews: ${result.reviewCount}`);
            console.log(`      Rating: ${result.rating}`);
        } else {
            console.log(`   ❌ FAILED`);
            console.log(`      Error: ${result.error}`);
        }
        console.log('');

        // Small delay between tests
        await new Promise(resolve => setTimeout(resolve, 1500));
    }

    // Step 3: Summary and analysis
    console.log('[3/3] Analysis');
    console.log('');
    console.log('========================================');
    console.log('RESULTS SUMMARY');
    console.log('========================================');
    console.log('');

    const timeoutBooks = results.filter(r => r.type.includes('timeout'));
    const controlBooks = results.filter(r => r.type.includes('works') || r.type.includes('newer'));

    console.log('📊 Timeout Books (2 Queen books):');
    timeoutBooks.forEach(r => {
        const status = r.success ? '✅' : '❌';
        console.log(`   ${status} ${r.name} (${r.id})`);
        if (r.success) {
            console.log(`      Description: ${r.descriptionLength} chars`);
        } else {
            console.log(`      Error: ${r.error}`);
        }
    });
    console.log('');

    console.log('📊 Control Books (known to work in fetcher):');
    controlBooks.forEach(r => {
        const status = r.success ? '✅' : '❌';
        console.log(`   ${status} ${r.name} (${r.id})`);
        if (r.success) {
            console.log(`      Description: ${r.descriptionLength} chars`);
        } else {
            console.log(`      Error: ${r.error}`);
        }
    });
    console.log('');

    // Analysis
    const timeoutSuccesses = timeoutBooks.filter(r => r.success).length;
    const timeoutFailures = timeoutBooks.filter(r => !r.success).length;
    const controlSuccesses = controlBooks.filter(r => r.success).length;
    const controlFailures = controlBooks.filter(r => !r.success).length;

    console.log('💡 ANALYSIS:');
    console.log(`   Timeout books: ${timeoutSuccesses} success, ${timeoutFailures} failure`);
    console.log(`   Control books: ${controlSuccesses} success, ${controlFailures} failure`);
    console.log('');

    if (timeoutSuccesses === 2 && controlSuccesses >= 2) {
        console.log('   ✅ All books succeeded in diagnostic!');
        console.log('   → The "timeouts" in fetcher are NOT API failures');
        console.log('   → These ISBNs work fine when tested individually');
        console.log('   → Problem is likely:');
        console.log('      • Fetcher retry logic timing out on empty descriptions');
        console.log('      • OR cumulative rate limiting after 2000+ fetches');
        console.log('');
    } else if (timeoutFailures === 2 && controlSuccesses >= 2) {
        console.log('   ❌ Timeout books failed, controls succeeded');
        console.log('   → These 2 ISBNs have a specific problem');
        console.log('   → Not a rate limit issue (controls work)');
        console.log('');
    } else if (timeoutFailures > 0 && controlFailures > 0) {
        console.log('   ⚠️  Both timeout books AND controls failed');
        console.log('   → Possible rate limiting after 2000+ fetches');
        console.log('   → Amazon may throttle after many sequential requests');
        console.log('');
    }

    console.log('========================================');

    // Save results
    window.isbnTestResults = results;
    console.log('📦 Results saved to: window.isbnTestResults');

    // ========================================================================
    // 🔬 RETRY FAILURES WITH FRESH TOKEN
    // ========================================================================

    const failedBooks = results.filter(r => !r.success);

    if (failedBooks.length > 0) {
        console.log('');
        console.log('========================================');
        console.log('🔬 RETRY TEST: Fresh Token');
        console.log('========================================');
        console.log('');
        console.log(`Found ${failedBooks.length} failures with stale token.`);
        console.log('Now retrying with FRESH token from page...');
        console.log('');

        // Get fresh token
        const csrfMeta = document.querySelector('meta[name="anti-csrftoken-a2z"]');
        if (!csrfMeta) {
            console.error('❌ Cannot get fresh token - meta tag not found');
            return;
        }

        const freshToken = csrfMeta.getAttribute('content');
        console.log(`   ✅ Fresh token: ${freshToken.substring(0, 10)}...`);
        console.log('');

        const retryResults = [];

        for (const failed of failedBooks) {
            console.log(`Retrying: ${failed.name}`);
            console.log(`   ID: ${failed.id} (${failed.type})`);

            const result = await enrichBook(failed.id, freshToken);
            retryResults.push({
                ...failed,
                retrySuccess: result.success,
                retryDescription: result.description,
                retryDescriptionLength: result.descriptionLength,
                retryError: result.error
            });

            if (result.success) {
                console.log(`   ✅ SUCCESS with fresh token!`);
                console.log(`      Description: ${result.descriptionLength} chars`);
            } else {
                console.log(`   ❌ STILL FAILED with fresh token`);
                console.log(`      Error: ${result.error}`);
            }
            console.log('');

            await new Promise(resolve => setTimeout(resolve, 1500));
        }

        console.log('========================================');
        console.log('RETRY RESULTS SUMMARY');
        console.log('========================================');
        console.log('');

        const retrySuccesses = retryResults.filter(r => r.retrySuccess).length;
        const retryFailures = retryResults.filter(r => !r.retrySuccess).length;

        console.log(`Retried: ${retryResults.length} books`);
        console.log(`   Succeeded with fresh token: ${retrySuccesses}`);
        console.log(`   Still failed with fresh token: ${retryFailures}`);
        console.log('');

        if (retrySuccesses === failedBooks.length) {
            console.log('✅ SMOKING GUN: All failures succeeded with fresh token!');
            console.log('   → Proves token staleness is the root cause');
            console.log('   → Solution: Refresh CSRF token periodically during fetch');
        } else if (retrySuccesses > 0) {
            console.log('⚠️  PARTIAL: Some failures succeeded with fresh token');
            console.log('   → Token staleness is ONE factor, but not the only one');
        } else {
            console.log('❌ NO CHANGE: All books still failed with fresh token');
            console.log('   → Token staleness is NOT the issue');
            console.log('   → Something else is different (timing, page state, etc.)');
        }

        console.log('========================================');

        window.isbnRetryResults = retryResults;
        console.log('📦 Retry results saved to: window.isbnRetryResults');
    }
}

// ============================================================================
// Extraction Functions (EXACT copy from fetcher lines 106-205)
// ============================================================================

// RECURSIVE fragment extractor - handles arbitrarily deep nesting
const extractTextFromFragments = (fragments) => {
    if (!fragments || !Array.isArray(fragments)) return '';

    const textParts = [];

    for (const frag of fragments) {
        // Direct text
        if (frag.text) {
            textParts.push(frag.text);
        }

        // Text in paragraph
        if (frag.paragraph?.text) {
            textParts.push(frag.paragraph.text);
        }

        // Fragments in paragraph (RECURSIVE)
        if (frag.paragraph?.fragments) {
            textParts.push(extractTextFromFragments(frag.paragraph.fragments));
        }

        // Text in semanticContent
        if (frag.semanticContent?.content?.text) {
            textParts.push(frag.semanticContent.content.text);
        }

        // Nested fragments in semanticContent (RECURSIVE!)
        if (frag.semanticContent?.content?.fragments) {
            textParts.push(extractTextFromFragments(frag.semanticContent.content.fragments));
        }

        // Paragraph in semanticContent
        if (frag.semanticContent?.content?.paragraph?.text) {
            textParts.push(frag.semanticContent.content.paragraph.text);
        }

        // Fragments in paragraph in semanticContent (RECURSIVE)
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

    // Simple string
    if (typeof descContent === 'string') {
        return descContent;
    }

    // Direct text
    if (descContent.text) {
        return descContent.text;
    }

    // Paragraph with text
    if (descContent.paragraph?.text) {
        return descContent.paragraph.text;
    }

    // Paragraph with fragments
    if (descContent.paragraph?.fragments) {
        return extractTextFromFragments(descContent.paragraph.fragments).trim();
    }

    // Direct fragments (most common case)
    if (descContent.fragments) {
        return extractTextFromFragments(descContent.fragments).trim();
    }

    // semanticContent with nested fragments
    if (descContent.semanticContent?.content?.fragments) {
        return extractTextFromFragments(descContent.semanticContent.content.fragments).trim();
    }

    // semanticContent with text
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

        // Extract description using complete fetcher logic
        let description = extractDescription(product);

        // Fallback to AI summary if no traditional description
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

// Auto-run - AFTER fetcher completes, test if diagnostic still works
// (This script expects to be pasted AFTER library-fetcher.js)
console.log('');
console.log('========================================');
console.log('DIAGNOSTIC QUEUED');
console.log('========================================');
console.log('');
console.log('✅ Diagnostic will run automatically after the fetcher completes');
console.log('   (The fetcher will start in a moment...)');
console.log('');

// Hook into the global fetchAmazonLibrary completion
if (typeof fetchAmazonLibrary === 'function') {
    const originalFetchAmazonLibrary = fetchAmazonLibrary;

    window.fetchAmazonLibrary = async function() {
        console.log('🚀 Starting full library fetch...');
        console.log('   This will take approximately 3 hours.');
        console.log('   The diagnostic will run automatically when this completes.');
        console.log('');

        // Run the original fetcher
        await originalFetchAmazonLibrary();

        // After fetcher completes, run diagnostic
        console.log('');
        console.log('========================================');
        console.log('FETCHER COMPLETE - STARTING DIAGNOSTIC');
        console.log('========================================');
        console.log('');
        console.log('🔬 Testing if API still works after 3-hour fetch session...');
        console.log('');

        await testISBNEnrichment();
    };

    // Start the wrapped fetcher
    fetchAmazonLibrary();
} else {
    console.error('❌ ERROR: fetchAmazonLibrary() not found!');
    console.error('   Make sure you pasted library-fetcher.js first.');
}
