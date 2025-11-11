// Description Fetcher Script v1 (THROWAWAY - for recovery only)
// Fetches descriptions for all books missing them
//
// Instructions:
// 1. Go to https://www.amazon.com/yourbooks (must be logged in)
// 2. Open DevTools Console (F12 → Console tab)
// 3. Paste this ENTIRE script and press Enter
// 4. Select books-without-descriptions.json when prompted
// 5. Script will fetch ALL descriptions (stops on first error)
// 6. Downloads recovered-descriptions.json when complete
//
// Re-run: After pasting once, you can re-run with: fetchMissingDescriptions()

async function fetchMissingDescriptions() {
    const SCRIPT_VERSION = 'v1';

    console.log('========================================');
    console.log(`Description Fetcher Script ${SCRIPT_VERSION}`);
    console.log('Fetches all missing descriptions from Amazon API');
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
        console.log('\n✅ No books to fetch!');
        return;
    }

    // Step 2: Get CSRF token
    console.log(`\n[2/4] Getting CSRF token from page...`);

    const csrfMeta = document.querySelector('meta[name="anti-csrftoken-a2z"]');
    if (!csrfMeta) {
        console.error('❌ CSRF token not found. Make sure you are logged in and on https://www.amazon.com/yourbooks');
        return;
    }

    const csrfToken = csrfMeta.getAttribute('content');
    console.log(`✅ Got CSRF token: ${csrfToken.substring(0, 10)}...`);

    // Step 3: Fetch all descriptions
    const totalBooks = allBooksWithoutDesc.length;
    const estimatedTime = Math.ceil((totalBooks * 2) / 60);
    console.log(`\n[3/4] Fetching descriptions for ${totalBooks} books...`);
    console.log(`Estimated time: ~${estimatedTime} minutes\n`);
    console.log('⚠️  Will STOP on first error to avoid wasting time\n');

    const extractDescription = (product) => {
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
                // Handle paragraph wrapper
                const para = descContent.paragraph;
                if (para.text) {
                    description = para.text;
                } else if (para.fragments) {
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
                // Handle direct fragments
                const textParts = [];
                descContent.fragments.forEach(frag => {
                    if (frag.text) {
                        textParts.push(frag.text);
                    } else if (frag.paragraph) {
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

    const recoveredDescriptions = [];
    let successCount = 0;
    let failedBook = null;
    const startTime = Date.now();

    for (let i = 0; i < totalBooks; i++) {
        const book = allBooksWithoutDesc[i];
        const percent = Math.round((i / totalBooks) * 100);
        const elapsed = Math.round((Date.now() - startTime) / 1000);
        const rate = i > 0 ? elapsed / i : 2;
        const remaining = Math.ceil((totalBooks - i) * rate / 60);

        console.log(`[${i + 1}/${totalBooks}] ${percent}% (${remaining}m remaining) - ${book.title.substring(0, 40)}...`);

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
                console.error(`   ⚠️  STOPPING on first error as requested`);
                failedBook = { book, reason: `HTTP ${response.status}`, index: i + 1 };
                break;
            }

            const data = await response.json();

            if (data.errors) {
                console.error('   ❌ GraphQL errors:', data.errors[0].message);
                console.error(`   ⚠️  STOPPING on first error as requested`);
                failedBook = { book, reason: 'GraphQL error', index: i + 1 };
                break;
            }

            const product = data.data?.getProducts?.[0];

            if (!product) {
                console.error('   ❌ No product data in response');
                console.error(`   ⚠️  STOPPING on first error as requested`);
                failedBook = { book, reason: 'No product data', index: i + 1 };
                break;
            }

            const extractedDesc = extractDescription(product);

            if (extractedDesc.length > 0) {
                console.log(`   ✅ SUCCESS: ${extractedDesc.length} chars`);
                recoveredDescriptions.push({
                    asin: book.asin,
                    description: extractedDesc
                });
                successCount++;
            } else {
                console.log(`   ⚠️  No description available (not an error, Amazon may not have one)`);
                // Not counting as error - some books genuinely don't have descriptions
                successCount++;
            }

            // Wait 2 seconds between requests
            if (i < totalBooks - 1) {
                await new Promise(resolve => setTimeout(resolve, 2000));
            }

        } catch (error) {
            console.error('   ❌ Error:', error.message);
            console.error(`   ⚠️  STOPPING on first error as requested`);
            failedBook = { book, reason: error.message, index: i + 1 };
            break;
        }
    }

    // Step 4: Save recovered descriptions
    console.log(`\n[4/4] Saving recovered descriptions...`);

    const outputData = {
        metadata: {
            scriptVersion: SCRIPT_VERSION,
            fetchDate: new Date().toISOString(),
            totalAttempted: successCount,
            totalRecovered: recoveredDescriptions.length,
            stopped: failedBook ? true : false,
            stoppedAt: failedBook ? failedBook.index : null,
            stoppedReason: failedBook ? failedBook.reason : null
        },
        descriptions: recoveredDescriptions
    };

    const jsonData = JSON.stringify(outputData, null, 2);
    const blob = new Blob([jsonData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'recovered-descriptions.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    console.log('✅ Saved recovered-descriptions.json');

    console.log('\n========================================');
    console.log('✅ FETCH COMPLETE!');
    console.log('========================================');
    console.log(`📊 Results:`);
    console.log(`   ✅ Successfully fetched: ${successCount}/${totalBooks}`);
    console.log(`   📝 Descriptions recovered: ${recoveredDescriptions.length}`);

    if (failedBook) {
        console.log(`\n❌ Stopped at book ${failedBook.index}/${totalBooks}:`);
        console.log(`   Title: ${failedBook.book.title}`);
        console.log(`   ASIN: ${failedBook.book.asin}`);
        console.log(`   Reason: ${failedBook.reason}`);
        console.log(`\n💡 You can re-run this script after investigating the error.`);
    } else {
        console.log(`\n✅ All books processed successfully!`);
    }

    const totalTime = Math.round((Date.now() - startTime) / 1000);
    const minutes = Math.floor(totalTime / 60);
    const seconds = totalTime % 60;
    console.log(`\n⏱️  Total time: ${minutes}m ${seconds}s`);

    console.log('\n👉 Next steps:');
    console.log('   1. Locate recovered-descriptions.json in your downloads');
    console.log('   2. Run description-merger.js to merge into amazon-library.json');
    console.log('   3. Merger will create a NEW library file (safe, non-destructive)');
}

// Auto-run on first paste
fetchMissingDescriptions();
