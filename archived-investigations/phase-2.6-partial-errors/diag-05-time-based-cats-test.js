// Diagnostic script to test if TIME (144-minute session) causes Cats book to fail
// Run this in browser console on amazon.com/yourbooks
// Script: diag-05-time-based-cats-test.js

const CATS_ASIN = "B0085HN8N6"; // 99 Reasons to Hate Cats (fails in fetcher at 144 min)
const TARGET_DURATION_MS = 144 * 60 * 1000; // 144 minutes in milliseconds
const DELAY_PER_BOOK_MS = 4500; // 4.5 seconds between book requests

async function testTimeBasedCatsFailure() {
    console.log('========================================');
    console.log('TIME-BASED CATS FAILURE TEST');
    console.log('Script: diag-05-time-based-cats-test.js');
    console.log('========================================');
    console.log('');
    console.log('🎯 HYPOTHESIS: 144-minute session causes Cats book to fail');
    console.log('');
    console.log('TEST APPROACH:');
    console.log('  1. Fetch library books with long delays (4.5s each)');
    console.log('  2. Continue until 144 minutes elapsed');
    console.log('  3. Try Cats book (B0085HN8N6) for FIRST time');
    console.log('  4. Does it fail? That answers our question!');
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

    // Step 2: Fetch books slowly until 144 minutes elapsed
    console.log('[3/3] Starting time-based test...');
    console.log('');
    console.log(`⏱️  Target duration: ${TARGET_DURATION_MS / 60000} minutes`);
    console.log(`⏱️  Delay per book: ${DELAY_PER_BOOK_MS / 1000} seconds`);
    console.log(`📚 Estimated books before target: ~${Math.floor(TARGET_DURATION_MS / DELAY_PER_BOOK_MS)}`);
    console.log('');

    const startTime = Date.now();
    const results = {
        librarySuccesses: 0,
        libraryFailures: 0,
        libraryFailedBooks: [],
        totalElapsed: 0
    };

    let bookIndex = 0;

    // Fetch library books until 144 minutes elapsed
    while (true) {
        const elapsed = Date.now() - startTime;

        // Check if we've reached target duration
        if (elapsed >= TARGET_DURATION_MS) {
            results.totalElapsed = elapsed;
            console.log('');
            console.log('⏰ TARGET DURATION REACHED!');
            console.log(`   Elapsed: ${Math.round(elapsed / 60000)} minutes`);
            console.log(`   Books fetched: ${bookIndex}`);
            console.log('');
            break;
        }

        // Check if we've run out of library books (unlikely)
        if (bookIndex >= library.books.length) {
            results.totalElapsed = elapsed;
            console.log('');
            console.log('📚 RAN OUT OF LIBRARY BOOKS!');
            console.log(`   Elapsed: ${Math.round(elapsed / 60000)} minutes (${Math.round(elapsed / 60000)} < 144)`);
            console.log(`   Books fetched: ${bookIndex}`);
            console.log('   Note: Test incomplete - did not reach 144 minutes');
            console.log('');
            break;
        }

        const book = library.books[bookIndex];
        const bookNum = bookIndex + 1;

        // Progress update every 50 books
        if (bookNum % 50 === 0 || bookNum === 1) {
            const elapsedMin = Math.round(elapsed / 60000);
            const remainingMin = Math.round((TARGET_DURATION_MS - elapsed) / 60000);
            const percentComplete = Math.round((elapsed / TARGET_DURATION_MS) * 100);

            console.log(`📊 Progress: Book ${bookNum} | ${elapsedMin}/${Math.round(TARGET_DURATION_MS / 60000)}min (${percentComplete}%)`);
            console.log(`   Remaining: ~${remainingMin}m | Successes: ${results.librarySuccesses} | Failures: ${results.libraryFailures}`);
            console.log('');
        }

        // Fetch library book
        const libraryResult = await enrichBook(book.asin, csrfToken);

        if (libraryResult.success) {
            results.librarySuccesses++;
        } else {
            results.libraryFailures++;
            results.libraryFailedBooks.push({
                position: bookNum,
                asin: book.asin,
                title: book.title || 'Unknown',
                error: libraryResult.error,
                elapsedMin: Math.round(elapsed / 60000)
            });

            console.log('');
            console.log('⚠️  LIBRARY BOOK FAILED (unexpected):');
            console.log(`   Position: ${bookNum}`);
            console.log(`   ASIN: ${book.asin}`);
            console.log(`   Title: ${book.title || 'Unknown'}`);
            console.log(`   Error: ${libraryResult.error}`);
            console.log('');
        }

        bookIndex++;

        // Wait before next request
        await new Promise(resolve => setTimeout(resolve, DELAY_PER_BOOK_MS));
    }

    // Step 3: THE CRITICAL TEST - Try Cats book after 144 minutes
    console.log('========================================');
    console.log('🐱 CRITICAL TEST: FETCHING CATS BOOK');
    console.log('========================================');
    console.log('');
    console.log(`   ASIN: ${CATS_ASIN}`);
    console.log(`   Title: 99 Reasons to Hate Cats`);
    console.log(`   Elapsed time: ${Math.round(results.totalElapsed / 60000)} minutes`);
    console.log('');
    console.log('   This is the moment of truth...');
    console.log('');

    const catsResult = await enrichBook(CATS_ASIN, csrfToken);

    console.log('========================================');
    console.log('TEST COMPLETE');
    console.log('========================================');
    console.log('');

    // Results summary
    console.log('📊 WARMUP PHASE RESULTS:');
    console.log(`   Library books fetched: ${bookIndex}`);
    console.log(`   Successes: ${results.librarySuccesses}`);
    console.log(`   Failures: ${results.libraryFailures}`);
    console.log(`   Duration: ${Math.round(results.totalElapsed / 60000)} minutes`);
    console.log('');

    if (results.libraryFailures > 0) {
        console.log('⚠️  UNEXPECTED LIBRARY FAILURES:');
        results.libraryFailedBooks.forEach((failure, idx) => {
            console.log(`   ${idx + 1}. Position ${failure.position}: ${failure.title} (${failure.asin})`);
            console.log(`      Error: ${failure.error} at ${failure.elapsedMin}m`);
        });
        console.log('');
    }

    console.log('🐱 CATS BOOK RESULT:');
    console.log('');

    if (catsResult.success) {
        console.log('   ✅ CATS BOOK SUCCEEDED!');
        console.log(`   Description length: ${catsResult.descriptionLength} chars`);
        console.log('');
        console.log('========================================');
        console.log('CONCLUSION: TIME ALONE IS NOT THE CAUSE');
        console.log('========================================');
        console.log('');
        console.log('💡 ANALYSIS:');
        console.log(`   → Cats book succeeded after ${Math.round(results.totalElapsed / 60000)}-minute session`);
        console.log('   → TIME (session duration) is NOT the root cause');
        console.log('   → Original failure must require additional factors:');
        console.log('      - Specific sequence of books before Cats?');
        console.log('      - Specific book variety/characteristics?');
        console.log('      - Amazon server-side state that varies?');
        console.log('');
        console.log('📌 COMPARISON:');
        console.log('   → Original fetch: Cats failed at 144 min with 2019 different books');
        console.log(`   → This test: Cats succeeded at ${Math.round(results.totalElapsed / 60000)} min with ${bookIndex} different books`);
        console.log('   → Difference: Not just time - something about book sequence?');
        console.log('');
        console.log('🔬 NEXT STEPS:');
        console.log('   1. Try binary search to find minimum books needed before Cats');
        console.log('   2. Test with exact same book sequence as original fetch');
        console.log('   3. Check if failure is non-deterministic (server-side randomness)');
    } else {
        console.log('   ❌ CATS BOOK FAILED!');
        console.log(`   Error: ${catsResult.error}`);
        console.log('');
        console.log('========================================');
        console.log('CONCLUSION: TIME IS THE ROOT CAUSE! ✅');
        console.log('========================================');
        console.log('');
        console.log('💡 CRITICAL FINDING:');
        console.log(`   → Cats book failed after ${Math.round(results.totalElapsed / 60000)}-minute session`);
        console.log('   → TIME (session duration) CONFIRMED as root cause!');
        console.log('   → Amazon API degrades after ~144 minutes');
        console.log('   → Error is NOT about book variety or sequence');
        console.log('');
        console.log('📌 PROOF:');
        console.log('   → Test 1 (Queen 2500x, 19 min): Success');
        console.log('   → Test 2 (2-book alternating, 19 min): Success');
        console.log('   → Test 3 (Full library, 37 min): Success');
        console.log(`   → Test 4 (Slow fetch, ${Math.round(results.totalElapsed / 60000)} min): Cats FAILED ✅`);
        console.log('');
        console.log('📋 RECOMMENDED SOLUTION:');
        console.log('   1. Implement session refresh in fetcher every 120 minutes');
        console.log('   2. Option A: Reload page and get fresh token');
        console.log('   3. Option B: Pause for 5 minutes to let session reset');
        console.log('   4. Display message: "Session refresh (120 min elapsed)..."');
        console.log('');
        console.log('✅ MYSTERY SOLVED!');
        console.log('   The error occurs because Amazon sessions degrade after ~144 minutes,');
        console.log('   regardless of which books are fetched. Books that appear late in the');
        console.log('   sequence (like Cats at position 2019) fail simply because they are');
        console.log('   fetched after the session has been active for too long.');
    }

    console.log('');
    console.log('========================================');

    // Save results
    window.timeBasedTestResults = {
        ...results,
        catsSuccess: catsResult.success,
        catsError: catsResult.error || null,
        catsDescriptionLength: catsResult.descriptionLength || 0
    };
    console.log('📦 Results saved to: window.timeBasedTestResults');
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
console.log('🔬 TIME-BASED CATS FAILURE TEST');
console.log('========================================');
console.log('');
console.log('This test determines if TIME (144-minute session) causes failures.');
console.log('');
console.log('TO RUN:');
console.log('1. Paste this entire script into console');
console.log('2. Press Enter');
console.log('3. Run: testTimeBasedCatsFailure();');
console.log('4. Select your amazon-library.json file in the picker');
console.log('5. Walk away - test runs for ~2.5 hours');
console.log('');
console.log('WHAT IT DOES:');
console.log('- Fetches library books slowly (4.5s delay each)');
console.log('- Stops at 144 minutes elapsed');
console.log('- Tries Cats book (B0085HN8N6)');
console.log('- If Cats fails → TIME is the root cause!');
console.log('- If Cats succeeds → Something else is the cause');
console.log('');
console.log('========================================');
