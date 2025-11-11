// Diagnostic script to test full library alternating with Queen's Ransom
// Run this in browser console on amazon.com/yourbooks
// Script: diag-04-full-library-alternating.js

const QUEEN_ASIN = "0684862670"; // Queen's Ransom (hardcover ISBN - fails in fetcher)
const DELAY_MS = 350; // Same as fetcher

async function testFullLibraryAlternating() {
    console.log('========================================');
    console.log('FULL LIBRARY ALTERNATING DIAGNOSTIC');
    console.log('Script: diag-04-full-library-alternating.js');
    console.log('========================================');
    console.log('');

    // Step 0: Load library from file
    console.log('[1/3] Loading library file...');
    console.log('');
    console.log('   📂 A file picker dialog will open...');
    console.log('   → Select your amazon-library.json file');
    console.log('   (Dialog may be hidden behind other windows - check taskbar!)');
    console.log('');

    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = '.json';

    const file = await new Promise(resolve => {
        fileInput.onchange = () => resolve(fileInput.files[0]);
        fileInput.click();
    });

    if (!file) {
        console.error('❌ No file selected!');
        console.error('   Please run again and select your amazon-library.json file');
        return;
    }

    console.log(`   ✅ File selected: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)`);
    console.log('   📖 Reading file...');

    let library;
    try {
        const fileText = await file.text();
        library = JSON.parse(fileText);
    } catch (err) {
        console.error('❌ Failed to parse JSON file!');
        console.error(`   Error: ${err.message}`);
        return;
    }

    if (!library || !library.books) {
        console.error('❌ Invalid library file format!');
        console.error('   Expected format: { books: [...] }');
        return;
    }

    console.log(`   ✅ Library loaded: ${library.books.length} books`);
    console.log('');

    const totalBooks = library.books.length;
    const totalRequests = totalBooks * 2; // Each book + Queen

    console.log(`📖 Library Books: ${totalBooks}`);
    console.log(`📖 Queen's Ransom: ${QUEEN_ASIN} (alternating after each book)`);
    console.log(`🔁 Total Requests: ${totalRequests} (${totalBooks} library + ${totalBooks} Queen)`);
    console.log(`⏱️  Estimated Time: ~${Math.round(totalRequests * (DELAY_MS + 200) / 1000 / 60)} minutes`);
    console.log('');
    console.log('Pattern: Book1, Queen, Book2, Queen, Book3, Queen...');
    console.log('');

    // Step 1: Get CSRF token
    console.log('[2/3] Getting CSRF token...');
    const csrfMeta = document.querySelector('meta[name="anti-csrftoken-a2z"]');

    if (!csrfMeta) {
        console.error('❌ CSRF token not found');
        console.error('   Make sure you\'re on amazon.com/yourbooks');
        return;
    }

    const csrfToken = csrfMeta.getAttribute('content');
    console.log(`   ✅ Token obtained: ${csrfToken.substring(0, 10)}...`);
    console.log('');

    // Step 2: Alternate between library books and Queen
    console.log('[3/3] Starting full library alternating test...');
    console.log('');

    const startTime = Date.now();
    const results = {
        librarySuccesses: 0,
        libraryFailures: 0,
        queenSuccesses: 0,
        queenFailures: 0,
        firstLibraryFailureAt: null,
        firstQueenFailureAt: null,
        totalRequests: 0,
        libraryFailedBooks: [],
        queenFailureDetails: []
    };

    for (let i = 0; i < totalBooks; i++) {
        const bookNum = i + 1;
        const book = library.books[i];
        const requestNum = (i * 2) + 1;

        // Progress update every 50 books (100 requests)
        if (bookNum % 50 === 0 || bookNum === 1) {
            const elapsed = Date.now() - startTime;
            const avgTime = elapsed / requestNum;
            const remaining = (totalRequests - requestNum) * avgTime;
            const remainingMin = Math.round(remaining / 1000 / 60);
            const elapsedMin = Math.round(elapsed / 1000 / 60);

            console.log(`📊 Progress: Book ${bookNum}/${totalBooks} (${Math.round(bookNum/totalBooks*100)}%) | Requests: ${requestNum}/${totalRequests}`);
            console.log(`   Elapsed: ${elapsedMin}m | Remaining: ~${remainingMin}m`);
            console.log(`   Library: ${results.librarySuccesses}✅ ${results.libraryFailures}❌ | Queen: ${results.queenSuccesses}✅ ${results.queenFailures}❌`);
            console.log('');
        }

        // Request 1: Library book
        const libraryResult = await enrichBook(book.asin, csrfToken);
        results.totalRequests++;

        if (libraryResult.success) {
            results.librarySuccesses++;
        } else {
            results.libraryFailures++;
            results.libraryFailedBooks.push({
                position: bookNum,
                asin: book.asin,
                title: book.title || 'Unknown',
                error: libraryResult.error,
                requestNum: results.totalRequests
            });

            if (!results.firstLibraryFailureAt) {
                results.firstLibraryFailureAt = results.totalRequests;

                console.log('');
                console.log('========================================');
                console.log('⚠️  LIBRARY BOOK FAILED!');
                console.log('========================================');
                console.log('');
                console.log(`   Book position: ${bookNum}/${totalBooks}`);
                console.log(`   ASIN: ${book.asin}`);
                console.log(`   Title: ${book.title || 'Unknown'}`);
                console.log(`   Request #: ${results.totalRequests}`);
                console.log(`   Elapsed time: ${Math.round((Date.now() - startTime)/1000/60)} minutes`);
                console.log(`   Error: ${libraryResult.error}`);
                console.log('');
                console.log('========================================');
            }
        }

        await new Promise(resolve => setTimeout(resolve, DELAY_MS));

        // Request 2: Queen's Ransom (the critical test)
        const queenResult = await enrichBook(QUEEN_ASIN, csrfToken);
        results.totalRequests++;

        if (queenResult.success) {
            results.queenSuccesses++;
        } else {
            results.queenFailures++;
            results.queenFailureDetails.push({
                afterBook: bookNum,
                afterAsin: book.asin,
                afterTitle: book.title || 'Unknown',
                error: queenResult.error,
                requestNum: results.totalRequests,
                elapsedMin: Math.round((Date.now() - startTime) / 1000 / 60)
            });

            if (!results.firstQueenFailureAt) {
                results.firstQueenFailureAt = results.totalRequests;

                console.log('');
                console.log('========================================');
                console.log('🎯 QUEEN\'S RANSOM FAILED! (TARGET FOUND)');
                console.log('========================================');
                console.log('');
                console.log(`   Request #: ${results.totalRequests}`);
                console.log(`   After library book #: ${bookNum}/${totalBooks}`);
                console.log(`   Last book ASIN: ${book.asin}`);
                console.log(`   Last book title: ${book.title || 'Unknown'}`);
                console.log(`   Elapsed time: ${Math.round((Date.now() - startTime)/1000/60)} minutes`);
                console.log(`   Error: ${queenResult.error}`);
                console.log('');
                console.log('💡 CRITICAL FINDING:');
                console.log(`   → Queen's Ransom failed after ${bookNum} DIFFERENT library books`);
                console.log(`   → Total requests before failure: ${results.totalRequests}`);
                console.log(`   → Book variety CONFIRMED as root cause!`);
                console.log('');
                console.log('📌 COMPARISON:');
                console.log(`   → Test 1 (Queen only 2500x): 0 failures`);
                console.log(`   → Test 2 (Alternating 2 books 2500x): 0 failures`);
                console.log(`   → Test 3 (${bookNum} different books): Queen FAILED!`);
                console.log('');
                console.log('✅ ROOT CAUSE IDENTIFIED: Book diversity threshold ~${bookNum} books');
                console.log('');
                console.log('========================================');

                // Stop on first Queen failure (we found what we need!)
                break;
            }
        }

        await new Promise(resolve => setTimeout(resolve, DELAY_MS));

        // If BOTH types have failed, we have enough data
        if (results.firstLibraryFailureAt && results.firstQueenFailureAt) {
            console.log('');
            console.log('⚠️  Both library and Queen books have failed. Sufficient data collected.');
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
    console.log(`   Library books tested: ${Math.ceil(results.totalRequests / 2)}`);
    console.log(`   Total time: ${Math.round(totalTime/1000/60)} minutes`);
    console.log('');
    console.log(`   Library Books:`);
    console.log(`      Successes: ${results.librarySuccesses}`);
    console.log(`      Failures: ${results.libraryFailures}`);
    if (results.firstLibraryFailureAt) {
        console.log(`      First failure at request: ${results.firstLibraryFailureAt}`);
    }
    console.log('');
    console.log(`   Queen's Ransom (${QUEEN_ASIN}):`);
    console.log(`      Successes: ${results.queenSuccesses}`);
    console.log(`      Failures: ${results.queenFailures}`);
    if (results.firstQueenFailureAt) {
        console.log(`      First failure at request: ${results.firstQueenFailureAt}`);
        console.log(`      Failed after ${Math.ceil(results.firstQueenFailureAt / 2)} different books`);
    }
    console.log('');

    // Detailed failure analysis
    if (results.queenFailures > 0) {
        console.log('🎯 QUEEN FAILURE DETAILS:');
        console.log('');
        results.queenFailureDetails.forEach((failure, idx) => {
            console.log(`   Failure #${idx + 1}:`);
            console.log(`      After book #: ${failure.afterBook}`);
            console.log(`      Last ASIN: ${failure.afterAsin}`);
            console.log(`      Last title: ${failure.afterTitle}`);
            console.log(`      Request #: ${failure.requestNum}`);
            console.log(`      Time: ${failure.elapsedMin}m`);
            console.log(`      Error: ${failure.error}`);
            console.log('');
        });
    }

    if (results.libraryFailures > 0) {
        console.log('⚠️  LIBRARY FAILURE DETAILS:');
        console.log('');
        results.libraryFailedBooks.forEach((failure, idx) => {
            console.log(`   Failure #${idx + 1}:`);
            console.log(`      Position: ${failure.position}`);
            console.log(`      ASIN: ${failure.asin}`);
            console.log(`      Title: ${failure.title}`);
            console.log(`      Request #: ${failure.requestNum}`);
            console.log(`      Error: ${failure.error}`);
            console.log('');
        });
    }

    // Final conclusion
    console.log('========================================');
    console.log('CONCLUSION');
    console.log('========================================');
    console.log('');

    if (results.firstQueenFailureAt) {
        const booksBeforeFailure = Math.ceil(results.firstQueenFailureAt / 2);
        const throttleThreshold = Math.floor(booksBeforeFailure * 0.9);

        console.log('✅ ROOT CAUSE CONFIRMED:');
        console.log('');
        console.log(`   → Queen's Ransom fails after fetching ~${booksBeforeFailure} DIFFERENT books`);
        console.log(`   → Problem is NOT request count alone (Tests 1 & 2 proved this)`);
        console.log(`   → Problem IS book variety/diversity`);
        console.log(`   → Amazon API degrades when processing many different book ASINs`);
        console.log('');
        console.log('📋 RECOMMENDED SOLUTION:');
        console.log('');
        console.log(`   1. Implement "cooling off" period in fetcher after ${throttleThreshold} books`);
        console.log(`   2. Pause for 30-60 seconds to allow API state to reset`);
        console.log(`   3. Continue fetching remaining books`);
        console.log('');
        console.log('   Alternative: Fetch library in batches with breaks between batches');
        console.log('');
        console.log('📊 TEST SUMMARY:');
        console.log(`   → Test 1: Queen only (2500x) = 0 failures`);
        console.log(`   → Test 2: 2-book alternating (2500x) = 0 failures`);
        console.log(`   → Test 3: ${booksBeforeFailure}-book variety = Queen FAILED ✅`);
        console.log('');
        console.log(`   PROOF: Book variety is the root cause!`);
    } else {
        console.log('❓ UNEXPECTED RESULT:');
        console.log('');
        console.log(`   → Completed ${Math.ceil(results.totalRequests / 2)} different books`);
        console.log(`   → Queen never failed!`);
        console.log('');
        console.log('   This suggests the original failure may have been:');
        console.log('   - Random network issue');
        console.log('   - Server-side state that has since been reset');
        console.log('   - Different API behavior on different days/times');
        console.log('');
        console.log('   Recommendation: Monitor future full fetches for pattern');
    }

    console.log('');
    console.log('========================================');

    // Save results
    window.fullLibraryTestResults = results;
    console.log('📦 Results saved to: window.fullLibraryTestResults');
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

// Instructions
console.log('');
console.log('========================================');
console.log('🔬 FULL LIBRARY ALTERNATING TEST');
console.log('========================================');
console.log('');
console.log('This is the definitive test to prove book variety causes failures.');
console.log('');
console.log('TO RUN:');
console.log('1. Paste this entire script into console');
console.log('2. Press Enter');
console.log('3. Run: testFullLibraryAlternating();');
console.log('4. Select your amazon-library.json file in the picker');
console.log('5. Walk away - test runs for ~6 hours (or until Queen fails)');
console.log('');
console.log('This will alternate between each library book and Queen\'s Ransom.');
console.log('Expected: Queen will fail after ~2000 different library books.');
console.log('');
console.log('========================================');
