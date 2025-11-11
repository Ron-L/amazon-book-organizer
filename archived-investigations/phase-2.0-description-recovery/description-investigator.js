// Description Investigation Script v9 (THROWAWAY - for debugging only)
// Tests improved extraction on random sample of books without descriptions
//
// Instructions:
// 1. Go to https://www.amazon.com/yourbooks (must be logged in)
// 2. Open DevTools Console (F12 → Console tab)
// 3. Paste this ENTIRE script and press Enter
// 4. Select books-without-descriptions.json when prompted
// 5. Script will randomly sample 20 books and test improved extraction
//
// Re-run: After pasting once, you can re-run with: investigateDescriptions()

async function investigateDescriptions() {
    const SCRIPT_VERSION = 'v9';
    const SAMPLE_SIZE = 20; // Number of random books to test

    console.log('========================================');
    console.log(`Description Investigation Script ${SCRIPT_VERSION}`);
    console.log('Random sample testing of improved extraction');
    console.log('========================================\n');

    // Step 1: Load books-without-descriptions.json
    console.log('[1/4] Loading books-without-descriptions.json...');
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = '.json';

    const file = await new Promise((resolve) => {
        fileInput.onchange = (e) => resolve(e.target.files[0]);
        fileInput.click();
    });

    if (!file) {
        console.error('❌ No file selected');
        return;
    }

    const fileText = await file.text();
    const allBooksWithoutDesc = JSON.parse(fileText);

    // Validate format
    if (!Array.isArray(allBooksWithoutDesc)) {
        console.error('❌ Invalid JSON format');
        console.error('   Expected: Array of {asin, title, authors}');
        return;
    }

    console.log(`✅ Loaded ${allBooksWithoutDesc.length} books without descriptions`);

    if (allBooksWithoutDesc.length === 0) {
        console.log('\n✅ No books to investigate!');
        return;
    }

    // Step 2: Randomly sample books
    console.log(`\n[2/4] Randomly selecting ${SAMPLE_SIZE} books from ${allBooksWithoutDesc.length} total...`);

    // Fisher-Yates shuffle to get random sample
    const shuffled = [...allBooksWithoutDesc];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    const booksToTest = shuffled.slice(0, Math.min(SAMPLE_SIZE, allBooksWithoutDesc.length));

    console.log(`✅ Selected ${booksToTest.length} books for testing\n`);
    booksToTest.forEach((book, index) => {
        console.log(`   ${index + 1}. ${book.title.substring(0, 60)}... (${book.asin})`);
    });

    // Step 3: Get CSRF token
    console.log(`\n[3/4] Getting CSRF token from page...`);

    const csrfMeta = document.querySelector('meta[name="anti-csrftoken-a2z"]');
    if (!csrfMeta) {
        console.error('❌ CSRF token not found. Make sure you are logged in and on https://www.amazon.com/yourbooks');
        return;
    }

    const csrfToken = csrfMeta.getAttribute('content');
    console.log(`✅ Got CSRF token: ${csrfToken.substring(0, 10)}...`);

    // Step 4: Test extraction on sampled books
    console.log(`\n[4/4] Testing improved extraction on ${booksToTest.length} books...\n`);
    console.log('Estimated time: ~' + Math.ceil(booksToTest.length * 2 / 60) + ' minutes\n');

    const extractDescriptionTest = (product) => {
        let description = '';
        const descSection = product.description?.sections?.[0];
        const descContent = descSection?.content;

        if (descContent) {
            // Try different possible structures
            if (typeof descContent === 'string') {
                description = descContent;
            } else if (descContent.text) {
                description = descContent.text;
            } else if (descContent.paragraph) {
                // NEW: Handle paragraph wrapper
                const para = descContent.paragraph;
                if (para.text) {
                    description = para.text;
                } else if (para.fragments) {
                    // Extract from paragraph fragments
                    const textParts = [];
                    para.fragments.forEach(frag => {
                        if (frag.text) {
                            textParts.push(frag.text);
                        } else if (frag.semanticContent?.content?.text) {
                            textParts.push(frag.semanticContent.content.text);
                        } else if (frag.semanticContent?.content?.fragments) {
                            frag.semanticContent.content.fragments.forEach(subfrag => {
                                if (subfrag.text) textParts.push(subfrag.text);
                                if (subfrag.semanticContent?.content?.text) {
                                    textParts.push(subfrag.semanticContent.content.text);
                                }
                            });
                        }
                    });
                    description = textParts.join('').trim();
                }
            } else if (descContent.fragments) {
                // Original: direct fragments
                const textParts = [];
                descContent.fragments.forEach(frag => {
                    if (frag.text) {
                        textParts.push(frag.text);
                    } else if (frag.paragraph) {
                        // NEW: Handle paragraph in fragments
                        if (frag.paragraph.text) {
                            textParts.push(frag.paragraph.text);
                        } else if (frag.paragraph.fragments) {
                            frag.paragraph.fragments.forEach(subfrag => {
                                if (subfrag.text) textParts.push(subfrag.text);
                                if (subfrag.semanticContent?.content?.text) {
                                    textParts.push(subfrag.semanticContent.content.text);
                                } else if (subfrag.semanticContent?.content?.fragments) {
                                    subfrag.semanticContent.content.fragments.forEach(subsubfrag => {
                                        if (subsubfrag.text) textParts.push(subsubfrag.text);
                                        if (subsubfrag.semanticContent?.content?.text) {
                                            textParts.push(subsubfrag.semanticContent.content.text);
                                        }
                                    });
                                }
                            });
                        } else if (frag.paragraph.semanticContent?.content?.text) {
                            textParts.push(frag.paragraph.semanticContent.content.text);
                        }
                    } else if (frag.semanticContent?.content?.text) {
                        textParts.push(frag.semanticContent.content.text);
                    } else if (frag.semanticContent?.content?.fragments) {
                        frag.semanticContent.content.fragments.forEach(subfrag => {
                            if (subfrag.text) textParts.push(subfrag.text);
                            if (subfrag.semanticContent?.content?.text) {
                                textParts.push(subfrag.semanticContent.content.text);
                            }
                        });
                    }
                });
                description = textParts.join('').trim();
            }
        }

        return description;
    };

    let successCount = 0;
    let failCount = 0;
    const failedBooks = [];

    for (let i = 0; i < booksToTest.length; i++) {
        const book = booksToTest[i];
        const percent = Math.round((i / booksToTest.length) * 100);

        console.log(`[${i + 1}/${booksToTest.length}] ${book.title.substring(0, 50)}...`);

        try {
            const query = `query enrichBook {
                getProducts(input: [{asin: "${book.asin}"}]) {
                    asin
                    description {
                        sections {
                            content
                            type
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
                    query: query,
                    operationName: 'enrichBook'
                })
            });

            if (!response.ok) {
                console.error(`   ❌ HTTP ${response.status}: ${response.statusText}`);
                failCount++;
                failedBooks.push({ book, reason: `HTTP ${response.status}` });
                continue;
            }

            const data = await response.json();

            if (data.errors) {
                console.error('   ❌ GraphQL errors:', data.errors[0].message);
                failCount++;
                failedBooks.push({ book, reason: 'GraphQL error' });
                continue;
            }

            const product = data.data?.getProducts?.[0];

            if (!product) {
                console.error('   ❌ No product data in response');
                failCount++;
                failedBooks.push({ book, reason: 'No product data' });
                continue;
            }

            const extractedDesc = extractDescriptionTest(product);

            if (extractedDesc.length > 0) {
                console.log(`   ✅ SUCCESS: Extracted ${extractedDesc.length} characters`);
                console.log(`      Preview: ${extractedDesc.substring(0, 80)}...`);
                successCount++;
            } else {
                console.log(`   ❌ FAILED: No description could be extracted`);
                console.log(`      Structure: ${JSON.stringify(product.description?.sections?.[0]).substring(0, 100)}...`);
                failCount++;
                failedBooks.push({ book, reason: 'No description in API response' });
            }

            // Wait 2 seconds between requests
            if (i < booksToTest.length - 1) {
                await new Promise(resolve => setTimeout(resolve, 2000));
            }

        } catch (error) {
            console.error('   ❌ Error:', error.message);
            failCount++;
            failedBooks.push({ book, reason: error.message });
        }
    }

    console.log('\n========================================');
    console.log('✅ TESTING COMPLETE!');
    console.log('========================================');
    console.log(`📊 Results:`);
    console.log(`   ✅ Successfully extracted: ${successCount}/${booksToTest.length} (${Math.round(successCount/booksToTest.length*100)}%)`);
    console.log(`   ❌ Failed: ${failCount}/${booksToTest.length} (${Math.round(failCount/booksToTest.length*100)}%)`);

    if (failedBooks.length > 0) {
        console.log('\n❌ Failed books:');
        failedBooks.forEach((fail, idx) => {
            console.log(`   ${idx + 1}. ${fail.book.title.substring(0, 50)}... - ${fail.reason}`);
        });
    }

    console.log('\n📈 Extrapolated to full library:');
    const estimatedSuccess = Math.round(allBooksWithoutDesc.length * successCount / booksToTest.length);
    console.log(`   Estimated recoverable descriptions: ${estimatedSuccess} out of ${allBooksWithoutDesc.length}`);
    console.log(`   Estimated remaining without descriptions: ${allBooksWithoutDesc.length - estimatedSuccess}`);

    console.log('\n💡 Next steps:');
    if (successCount > booksToTest.length * 0.8) {
        console.log('   ✅ Extraction is working well! Ready to apply to library-fetcher.js');
    } else if (successCount > 0) {
        console.log('   ⚠️  Extraction is partially working. Review failed books above.');
        console.log('      May need additional extraction patterns.');
    } else {
        console.log('   ❌ Extraction is not working. Need to investigate further.');
    }
}

// Auto-run on first paste
investigateDescriptions();
