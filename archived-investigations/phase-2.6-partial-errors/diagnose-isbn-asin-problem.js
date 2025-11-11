// Diagnostic script to investigate ISBN vs ASIN problem
// Run this in browser console after loading amazon-library.json

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
    console.log('========================================');
    console.log('');

    // Step 1: Analyze all ASINs in library
    console.log('[1/3] Analyzing all ASINs in library...');
    console.log('');

    const fs = require('fs');
    let library;

    try {
        const data = JSON.parse(fs.readFileSync('amazon-library.json', 'utf8'));
        library = data.books || data; // Handle both schema v3.0.0 and older
    } catch (err) {
        console.error('❌ Could not load amazon-library.json');
        console.error('   Make sure file is in current directory');
        return;
    }

    console.log(`   Total books in library: ${library.length}`);
    console.log('');

    // Analyze ASIN patterns
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

        // Show first 10
        const showCount = Math.min(10, numericASINs.length);
        for (let i = 0; i < showCount; i++) {
            const item = numericASINs[i];
            console.log(`   ${i + 1}. ${item.asin} - ${item.title.substring(0, 60)}`);
            console.log(`      Binding: ${item.binding}, Index: ${item.index}`);
        }

        if (numericASINs.length > 10) {
            console.log(`   ... and ${numericASINs.length - 10} more`);
        }
        console.log('');
    }

    // Step 2: Test enrichment API with both ISBNs and real ASINs
    console.log('[2/3] Testing enrichment API with ISBNs vs real ASINs...');
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
            error: result.error
        });

        if (result.success) {
            console.log(`   ✅ SUCCESS - Description: ${result.descriptionLength} chars`);
        } else {
            console.log(`   ❌ FAILED - ${result.error}`);
        }
        console.log('');

        // Small delay between tests
        await new Promise(resolve => setTimeout(resolve, 1000));
    }

    // Step 3: Summary and recommendations
    console.log('[3/3] Summary and Recommendations');
    console.log('');
    console.log('========================================');
    console.log('RESULTS SUMMARY');
    console.log('========================================');
    console.log('');

    console.log('📊 API Test Results:');
    results.forEach(r => {
        const status = r.success ? '✅' : '❌';
        console.log(`   ${status} ${r.name}: ${r.asin}`);
        if (r.success) {
            console.log(`      Got description: ${r.descriptionLength} chars`);
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
        console.log('   1. Add ISBN-to-ASIN conversion fallback in fetcher');
        console.log('   2. Track numeric ASINs as "known ISBN issues"');
        console.log('   3. Try to find alternate ASIN in Phase 1 raw data');
        console.log('   4. Mark these books in metadata (similar to "no description")');
    } else {
        console.log('   ⚠️  Results inconclusive - needs further investigation');
    }
    console.log('');

    console.log('📈 IMPACT ASSESSMENT:');
    console.log(`   Total numeric ASINs in library: ${numericASINs.length}`);
    console.log(`   Percentage of library:          ${(numericASINs.length / library.length * 100).toFixed(2)}%`);
    if (numericASINs.length === results.filter(r => !r.success && r.type.includes('ISBN')).length) {
        console.log(`   Likely all ${numericASINs.length} will fail enrichment API`);
    }
    console.log('');

    console.log('========================================');
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
            descriptionLength: description.length
        };

    } catch (err) {
        return { success: false, error: err.message };
    }
}

// Run the diagnostic
diagnoseISBNProblem();
