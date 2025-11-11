// Description Diagnostic Script v1 (THROWAWAY - for debugging only)
// Fetches and displays FULL API response for books missing descriptions
//
// Instructions:
// 1. Go to https://www.amazon.com/yourbooks (must be logged in)
// 2. Open DevTools Console (F12 → Console tab)
// 3. Paste this ENTIRE script and press Enter
// 4. Select books-without-descriptions.json when prompted
// 5. Script will fetch first 5 books and dump FULL responses
//
// Re-run: After pasting once, you can re-run with: diagnoseMissingDescriptions()

async function diagnoseMissingDescriptions() {
    const SCRIPT_VERSION = 'v1';
    const BOOKS_TO_CHECK = 5; // Only check first 5 to avoid spam

    console.log('========================================');
    console.log(`Description Diagnostic Script ${SCRIPT_VERSION}`);
    console.log('Displays FULL API responses for debugging');
    console.log('========================================\n');

    // Step 1: Load books-without-descriptions.json
    console.log('[1/3] Loading books-without-descriptions.json...');
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
        console.log('\n✅ No books to check!');
        return;
    }

    const booksToCheck = allBooksWithoutDesc.slice(0, Math.min(BOOKS_TO_CHECK, allBooksWithoutDesc.length));
    console.log(`   Will check first ${booksToCheck.length} books\n`);

    // Step 2: Get CSRF token
    console.log('[2/3] Getting CSRF token from page...');

    const csrfMeta = document.querySelector('meta[name="anti-csrftoken-a2z"]');
    if (!csrfMeta) {
        console.error('❌ CSRF token not found. Make sure you are logged in and on https://www.amazon.com/yourbooks');
        return;
    }

    const csrfToken = csrfMeta.getAttribute('content');
    console.log(`✅ Got CSRF token: ${csrfToken.substring(0, 10)}...\n`);

    // Step 3: Fetch and display full responses
    console.log(`[3/3] Fetching and displaying FULL API responses...\n`);

    for (let i = 0; i < booksToCheck.length; i++) {
        const book = booksToCheck[i];

        console.log('========================================');
        console.log(`BOOK ${i + 1}/${booksToCheck.length}`);
        console.log('========================================');
        console.log(`Title: ${book.title}`);
        console.log(`ASIN: ${book.asin}`);
        console.log(`Authors: ${book.authors}\n`);

        try {
            const query = `query enrichBook {
                getProducts(input: [{asin: "${book.asin}"}]) {
                    asin
                    title
                    authors
                    description {
                        sections {
                            content
                            type
                        }
                    }
                    productDetails
                    editorialReviews
                    synopsis
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
                console.error(`❌ HTTP ${response.status}: ${response.statusText}\n`);
                continue;
            }

            const data = await response.json();

            if (data.errors) {
                console.error('❌ GraphQL errors:', data.errors);
                console.log('\n');
                continue;
            }

            const product = data.data?.getProducts?.[0];

            if (!product) {
                console.error('❌ No product data in response\n');
                continue;
            }

            console.log('📦 FULL PRODUCT RESPONSE:');
            console.log('==========================================');
            console.log(JSON.stringify(product, null, 2));
            console.log('==========================================\n');

            console.log('🔍 DESCRIPTION SECTION DETAIL:');
            console.log('==========================================');
            if (product.description?.sections) {
                product.description.sections.forEach((section, idx) => {
                    console.log(`\nSection ${idx}:`);
                    console.log(`  Type: ${section.type}`);
                    console.log(`  Content structure: ${typeof section.content}`);
                    if (typeof section.content === 'object') {
                        console.log(`  Content keys: ${Object.keys(section.content || {}).join(', ')}`);
                    }
                    console.log(`  Full content:`);
                    console.log(JSON.stringify(section.content, null, 4));
                });
            } else {
                console.log('No description.sections found');
            }
            console.log('==========================================\n');

            console.log('📝 OTHER POTENTIAL DESCRIPTION FIELDS:');
            console.log('==========================================');
            console.log('productDetails:', product.productDetails);
            console.log('editorialReviews:', product.editorialReviews);
            console.log('synopsis:', product.synopsis);
            console.log('==========================================\n');

            // Wait 2 seconds between requests
            if (i < booksToCheck.length - 1) {
                await new Promise(resolve => setTimeout(resolve, 2000));
            }

        } catch (error) {
            console.error('❌ Error:', error.message);
            console.log('\n');
        }
    }

    console.log('========================================');
    console.log('✅ DIAGNOSTIC COMPLETE!');
    console.log('========================================');
    console.log(`\nChecked ${booksToCheck.length} books`);
    console.log('\n💡 Review the output above to find where descriptions might be hiding.');
    console.log('   Look for:');
    console.log('   - Unfamiliar field names in the product response');
    console.log('   - Different section types besides "DESCRIPTION"');
    console.log('   - Nested objects with text content');
    console.log('   - editorialReviews, synopsis, or productDetails fields');
}

// Auto-run on first paste
diagnoseMissingDescriptions();
