// Browser-compatible diagnostic script to investigate ISBN vs ASIN problem
// Run this in browser console on Amazon website (for API access)
// You'll need to manually load your library JSON first

// Test cases from user's library
const TEST_CASES = [
    {
        name: "Book 1 - ISBN from library",
        asin: "0684862670",
        type: "ISBN (from library API)"
    },
    {
        name: "Book 1 - Real ASIN from web",
        asin: "B000FC0T6S",
        type: "ASIN (from web page)"
    },
    {
        name: "Book 2 - ISBN from library",
        asin: "0684862689",
        type: "ISBN (from library API)"
    },
    {
        name: "Book 2 - Real ASIN from web",
        asin: "B0033DDIU0",
        type: "ASIN (from web page)"
    }
];

async function diagnoseISBNProblem() {
    console.log('========================================');
    console.log('ISBN vs ASIN DIAGNOSTIC TOOL');
    console.log('Script: diagnose-isbn-asin-browser.js');
    console.log('========================================');
    console.log('');

    // Step 1: Load library data
    console.log('[1/3] Loading library data...');
    console.log('');
    console.log('⚠️  PLEASE PROVIDE LIBRARY DATA');
    console.log('   Paste your amazon-library.json as a global variable:');
    console.log('   window.libraryData = <paste JSON here>');
    console.log('');
    console.log('   OR use file picker:');

    let library;

    // Try to load from window.libraryData if user already set it
    if (window.libraryData) {
        const data = window.libraryData;
        library = data.books || data;
        console.log('   ✅ Using window.libraryData');
    } else {
        // Use file picker
        console.log('   📂 Opening file picker...');

        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.accept = '.json';

        const file = await new Promise((resolve) => {
            fileInput.onchange = (e) => resolve(e.target.files[0]);
            fileInput.oncancel = () => resolve(null);
            fileInput.click();
        });

        if (!file) {
            console.error('❌ No file selected. Aborting.');
            return;
        }

        const text = await file.text();
        const data = JSON.parse(text);
        library = data.books || data;
        console.log('   ✅ Library loaded from file');
    }

    console.log(`   Total books in library: ${library.length}`);
    console.log('');

    // Step 2: Analyze ASIN patterns
    console.log('[2/3] Analyzing ASIN patterns...');
    console.log('');

    const numericASINs = [];
    const alphanumericASINs = [];
    const invalidASINs = [];

    library.forEach((book, index) => {
        const asin = book.asin;

        if (!asin) {
            invalidASINs.push({ index, title: book.title, reason: 'Missing ASIN' });
            return;
        }

        // Check if purely numeric (ISBN-10 format)
        if (/^\d{10}$/.test(asin)) {
            numericASINs.push({
                asin,
                title: book.title,
                binding: book.binding || 'Unknown',
                index
            });
        } else if (/^[A-Z0-9]{10}$/.test(asin)) {
            // Standard ASIN format (alphanumeric, 10 chars)
            alphanumericASINs.push(asin);
        } else {
            // Unusual format
            invalidASINs.push({
                asin,
                title: book.title,
                index,
                reason: 'Unusual format'
            });
        }
    });

    console.log('📊 ASIN ANALYSIS RESULTS:');
    console.log('   ─────────────────────────────────────');
    console.log(`   Alphanumeric ASINs:       ${alphanumericASINs.length} (${(alphanumericASINs.length / library.length * 100).toFixed(2)}%)`);
    console.log(`   Numeric ASINs (ISBNs):    ${numericASINs.length} (${(numericASINs.length / library.length * 100).toFixed(2)}%)`);
    if (invalidASINs.length > 0) {
        console.log(`   Invalid/Unusual ASINs:    ${invalidASINs.length}`);
    }
    console.log('');

    if (numericASINs.length > 0) {
        console.log('⚠️  NUMERIC ASINs FOUND (likely ISBNs):');
        console.log(`   Found ${numericASINs.length} books with numeric ASINs`);
        console.log('');

        // Show first 20
        const showCount = Math.min(20, numericASINs.length);
        for (let i = 0; i < showCount; i++) {
            const item = numericASINs[i];
            console.log(`   ${i + 1}. ${item.asin} - ${item.title.substring(0, 60)}`);
            console.log(`      Binding: ${item.binding}, Library index: ${item.index}`);
        }

        if (numericASINs.length > 20) {
            console.log(`   ... and ${numericASINs.length - 20} more`);
        }
        console.log('');

        // Store for later reference
        window.numericASINs = numericASINs;
        console.log('💾 Saved to window.numericASINs for inspection');
        console.log('');
    }

    // Step 3: Test enrichment API with both ISBNs and real ASINs
    console.log('[3/3] Testing enrichment API with ISBNs vs real ASINs...');
    console.log('');

    const results = [];

    for (const testCase of TEST_CASES) {
        console.log(`Testing: ${testCase.name}`);
        console.log(`   ASIN: ${testCase.asin} (${testCase.type})`);

        const result = await testEnrichmentAPI(testCase.asin);
        results.push({
            ...testCase,
            success: result.success,
            descriptionLength: result.descriptionLength,
            error: result.error,
            title: result.title
        });

        if (result.success) {
            console.log(`   ✅ SUCCESS`);
            console.log(`      Title: ${result.title}`);
            console.log(`      Description: ${result.descriptionLength} chars`);
        } else {
            console.log(`   ❌ FAILED - ${result.error}`);
        }
        console.log('');

        // Small delay between tests
        await new Promise(resolve => setTimeout(resolve, 1500));
    }

    // Step 4: Summary and recommendations
    console.log('========================================');
    console.log('RESULTS SUMMARY');
    console.log('========================================');
    console.log('');

    console.log('📊 API Test Results:');
    results.forEach(r => {
        const status = r.success ? '✅' : '❌';
        console.log(`   ${status} ${r.name}: ${r.asin}`);
        if (r.success) {
            console.log(`      Title: ${r.title}`);
            console.log(`      Description: ${r.descriptionLength} chars`);
        } else {
            console.log(`      Error: ${r.error}`);
        }
    });
    console.log('');

    // Analysis
    const isbnsFailed = results.filter(r => r.type.includes('ISBN') && !r.success).length;
    const asinsSucceeded = results.filter(r => r.type.includes('ASIN') && r.success).length;

    console.log('💡 CONCLUSIONS:');
    if (isbnsFailed > 0 && asinsSucceeded > 0) {
        console.log('   ✅ Theory CONFIRMED: ISBNs fail enrichment API, real ASINs work');
        console.log('');
        console.log('📋 RECOMMENDED SOLUTIONS:');
        console.log('   1. Detect numeric ASINs (ISBNs) during enrichment');
        console.log('   2. Use ISBN-to-ASIN conversion API or service');
        console.log('   3. Mark these books in metadata as "ISBN conversion needed"');
        console.log('   4. Track in statistics output (like "no description" books)');
        console.log('');
        console.log('🔍 FURTHER INVESTIGATION NEEDED:');
        console.log('   1. Check Phase 1 raw data for alternate ASIN field');
        console.log('   2. Research Amazon Product Advertising API for ISBN lookup');
        console.log('   3. Consider isbndb.com or other ISBN services');
    } else {
        console.log('   ⚠️  Results inconclusive - needs further investigation');
    }
    console.log('');

    console.log('📈 IMPACT ASSESSMENT:');
    console.log(`   Total numeric ASINs in library: ${numericASINs.length}`);
    console.log(`   Percentage of library:          ${(numericASINs.length / library.length * 100).toFixed(2)}%`);
    console.log(`   Expected enrichment failures:   ${numericASINs.length} books`);
    if (numericASINs.length === 3) {
        console.log('   ✅ Only 3 books affected - matches your timeout failures!');
    }
    console.log('');

    console.log('========================================');
    console.log('📦 DATA SAVED TO WINDOW VARIABLES:');
    console.log('   window.numericASINs - List of all numeric ASINs found');
    console.log('   window.testResults - API test results');
    console.log('========================================');

    window.testResults = results;
}

// Helper function to test enrichment API
async function testEnrichmentAPI(asin) {
    const query = `
        query enrichBook($asin: String!) {
            getProductByAsin(asin: $asin) {
                asin
                title
                authors
                binding
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
            return { success: false, error: `HTTP ${response.status}` };
        }

        const data = await response.json();

        if (data.errors) {
            return { success: false, error: data.errors[0]?.message || 'GraphQL error' };
        }

        if (!data.data?.getProductByAsin) {
            return { success: false, error: 'No product data returned' };
        }

        // Extract description
        const product = data.data.getProductByAsin;
        let description = '';

        if (product.productDescription?.plaintext) {
            description = product.productDescription.plaintext;
        } else if (product.productDescription?.content?.content) {
            description = product.productDescription.content.content;
        }

        return {
            success: true,
            title: product.title || 'Unknown',
            descriptionLength: description.length
        };

    } catch (err) {
        return { success: false, error: err.message };
    }
}

// Auto-run
console.log('🚀 Starting ISBN vs ASIN diagnostic...');
console.log('');
diagnoseISBNProblem();
