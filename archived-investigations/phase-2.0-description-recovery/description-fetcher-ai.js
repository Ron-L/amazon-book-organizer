// Description Fetcher (AI Summaries) Script v1 (THROWAWAY - for recovery only)
// Fetches AI-generated summaries for books missing traditional descriptions
//
// Instructions:
// 1. Go to https://www.amazon.com/yourbooks (must be logged in)
// 2. Open DevTools Console (F12 → Console tab)
// 3. Paste this ENTIRE script and press Enter
// 4. Select books-without-descriptions.json when prompted
// 5. Script will fetch ALL AI summaries (stops on first error)
// 6. Downloads recovered-ai-descriptions.json when complete
//
// Re-run: After pasting once, you can re-run with: fetchAISummaries()

async function fetchAISummaries() {
    const SCRIPT_VERSION = 'v1';

    console.log('========================================');
    console.log(`Description Fetcher (AI Summaries) ${SCRIPT_VERSION}`);
    console.log('Fetches AI-generated summaries from Amazon API');
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

    // Step 3: Fetch all AI summaries
    const totalBooks = allBooksWithoutDesc.length;
    const estimatedTime = Math.ceil((totalBooks * 2) / 60);
    console.log(`\n[3/4] Fetching AI summaries for ${totalBooks} books...`);
    console.log(`Estimated time: ~${estimatedTime} minutes\n`);
    console.log('⚠️  Will STOP on first error to avoid wasting time\n');

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
            // Use the same query structure as Amazon's UI
            const query = `query qvGetProductQuickView {
                getProduct(input: {asin: "${book.asin}"}) {
                    asin
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
                    operationName: 'qvGetProductQuickView'
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

            const product = data.data?.getProduct;

            if (!product) {
                console.error('   ❌ No product data in response');
                console.error(`   ⚠️  STOPPING on first error as requested`);
                failedBook = { book, reason: 'No product data', index: i + 1 };
                break;
            }

            // Extract AI summary
            let aiSummary = '';
            const recommendations = product.auxiliaryStoreRecommendations?.recommendations || [];

            for (const rec of recommendations) {
                if (rec.recommendationType === 'AI_SUMMARIES' && rec.sharedContent?.length > 0) {
                    aiSummary = rec.sharedContent[0].contentAbstract?.textAbstract || '';
                    break;
                }
            }

            if (aiSummary.length > 0) {
                console.log(`   ✅ SUCCESS: ${aiSummary.length} chars (AI summary)`);
                recoveredDescriptions.push({
                    asin: book.asin,
                    description: aiSummary
                });
                successCount++;
            } else {
                console.log(`   ⚠️  No AI summary available (not an error, Amazon may not have one)`);
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

    // Step 4: Save recovered AI summaries
    console.log(`\n[4/4] Saving recovered AI summaries...`);

    const outputData = {
        metadata: {
            scriptVersion: SCRIPT_VERSION,
            fetchDate: new Date().toISOString(),
            totalAttempted: successCount,
            totalRecovered: recoveredDescriptions.length,
            stopped: failedBook ? true : false,
            stoppedAt: failedBook ? failedBook.index : null,
            stoppedReason: failedBook ? failedBook.reason : null,
            sourceType: 'AI_SUMMARIES'
        },
        descriptions: recoveredDescriptions
    };

    const jsonData = JSON.stringify(outputData, null, 2);
    const blob = new Blob([jsonData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'recovered-ai-descriptions.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    console.log('✅ Saved recovered-ai-descriptions.json');

    console.log('\n========================================');
    console.log('✅ FETCH COMPLETE!');
    console.log('========================================');
    console.log(`📊 Results:`);
    console.log(`   ✅ Successfully fetched: ${successCount}/${totalBooks}`);
    console.log(`   📝 AI summaries recovered: ${recoveredDescriptions.length}`);

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
    console.log('   1. Locate recovered-ai-descriptions.json in your downloads');
    console.log('   2. Run description-merger.js to merge into amazon-library-merged.json');
    console.log('   3. Merger will combine with existing recovered-descriptions.json');
}

// Auto-run on first paste
fetchAISummaries();
