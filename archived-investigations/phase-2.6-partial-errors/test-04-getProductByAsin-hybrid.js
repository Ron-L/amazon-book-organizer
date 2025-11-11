// test-04-getProductByAsin-hybrid.js
// Browser Console Test - Hybrid Approach
//
// Tests: getProductByAsin root field (from old test-isbn-enrichment.js)
//        on /kindle-reader-api endpoint (modern, working)
//
// INSTRUCTIONS:
// 1. Go to: https://www.amazon.com/yourbooks
// 2. Open Developer Tools (F12) → Console tab
// 3. Paste this ENTIRE script and press Enter
// 4. Review the output

// Test ASINs - Top 3 from analyze-review-data.js (highest review counts with missing topReviews)
const TEST_BOOKS = [
    { asin: 'B00J9P2EMO', title: 'Lethal Code (1674 reviews)' },
    { asin: 'B0085HN8N6', title: 'Cats (621 reviews)' },
    { asin: '0684862670', title: 'Queen\'s Ransom (83 reviews)' }
];

// Extract CSRF token from meta tag
const csrfMeta = document.querySelector('meta[name="anti-csrftoken-a2z"]');
const csrfToken = csrfMeta ? csrfMeta.getAttribute('content') : null;

console.log('='.repeat(80));
console.log('TEST 04 - getProductByAsin Hybrid Approach');
console.log('='.repeat(80));
console.log('');
console.log('Purpose: Test if getProductByAsin root field avoids customerReviewsTop errors');
console.log('Endpoint: /kindle-reader-api (modern)');
console.log('Root Field: getProductByAsin (from old endpoint)');
console.log('Expected: UNKNOWN (this is the experiment!)');
console.log('');
console.log(`CSRF Token: ${csrfToken ? 'Found ✅' : 'NOT FOUND ❌'}`);
console.log('');

// GraphQL query using getProductByAsin root field
// NOTE: Field structure is different from getProduct/getProducts
const query = `
  query getProductByAsinTest($asin: String!) {
    getProductByAsin(asin: $asin) {
      asin
      title
      authors
      productDescription {
        plaintext
        content {
          content
        }
      }
      customerReviews {
        totalReviewCount
        averageStarRating
        topReviews {
          text
          rating
          title
          author
        }
      }
    }
  }
`;

async function testBook(book, index) {
    console.log(`--- Test ${index + 1}: ${book.title} ---`);
    console.log(`ASIN: ${book.asin}`);
    console.log('');

    const startTime = Date.now();

    try {
        const headers = {
            'Content-Type': 'application/json',
            'x-client-id': 'quickview',
            'x-amz-portal-marketplace-id': 'ATVPDKIKX0DER'
        };

        // Add CSRF token if available
        if (csrfToken) {
            headers['anti-csrftoken-a2z'] = csrfToken;
        }

        const response = await fetch('https://www.amazon.com/kindle-reader-api', {
            method: 'POST',
            headers: headers,
            credentials: 'include',
            body: JSON.stringify({
                query: query,
                variables: { asin: book.asin }
            })
        });

        const duration = ((Date.now() - startTime) / 1000).toFixed(2);

        if (!response.ok) {
            console.log(`❌ HTTP Error: ${response.status}`);
            console.log('');
            return;
        }

        const result = await response.json();

        console.log('RAW RESPONSE:');
        console.log(JSON.stringify(result, null, 2));
        console.log('');

        // Check for errors
        const hasErrors = result.errors && result.errors.length > 0;
        const hasData = result.data?.getProductByAsin;

        console.log('ANALYSIS:');
        console.log(`  Duration: ${duration}s`);
        console.log(`  Has Errors: ${hasErrors ? 'YES ⚠️' : 'NO ✅'}`);
        console.log(`  Has Data: ${hasData ? 'YES ✅' : 'NO ❌'}`);

        if (hasErrors) {
            console.log('  Errors:');
            result.errors.forEach((err, idx) => {
                console.log(`    ${idx + 1}. ${err.message}`);
                console.log(`       Path: ${err.path?.join(' → ') || 'N/A'}`);
                console.log(`       Extensions: ${JSON.stringify(err.extensions || {})}`);
            });
        }

        if (hasData) {
            const product = result.data.getProductByAsin;
            const reviewCount = product.customerReviews?.totalReviewCount || 0;
            const rating = product.customerReviews?.averageStarRating || 'N/A';
            const topReviewsCount = product.customerReviews?.topReviews?.length || 0;
            const hasDescription = product.productDescription?.plaintext || product.productDescription?.content?.content;

            console.log('  Data:');
            console.log(`    Title: ${product.title || 'N/A'}`);
            console.log(`    Authors: ${product.authors?.join(', ') || 'N/A'}`);
            console.log(`    Description: ${hasDescription ? 'YES' : 'NO'}`);
            console.log(`    Review Count: ${reviewCount}`);
            console.log(`    Rating: ${rating}`);
            console.log(`    Top Reviews Retrieved: ${topReviewsCount}`);

            if (topReviewsCount > 0) {
                console.log(`    First Review Preview: ${product.customerReviews.topReviews[0].text?.substring(0, 100)}...`);
            }
        }

        console.log('');

        // Verdict
        if (hasErrors && hasData) {
            console.log('⚠️  PARTIAL ERROR - Got data despite errors');
        } else if (hasErrors && !hasData) {
            console.log('❌ TOTAL FAILURE - Errors with no data');
        } else if (!hasErrors && hasData) {
            console.log('✅ COMPLETE SUCCESS - No errors, got data');

            const topReviewsCount = result.data.getProductByAsin.customerReviews?.topReviews?.length || 0;
            if (topReviewsCount > 0) {
                console.log('🎉 BREAKTHROUGH - getProductByAsin returned review text!');
            }
        } else {
            console.log('❓ UNEXPECTED - No errors, no data');
        }

        console.log('');

    } catch (err) {
        console.error(`❌ FETCH FAILED: ${err.message}`);
        console.log('');
    }
}

async function runTests() {
    for (let i = 0; i < TEST_BOOKS.length; i++) {
        await testBook(TEST_BOOKS[i], i);

        // Delay between tests
        if (i < TEST_BOOKS.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 2000));
        }
    }

    console.log('='.repeat(80));
    console.log('TEST COMPLETE');
    console.log('='.repeat(80));
    console.log('');
    console.log('INTERPRETATION:');
    console.log('- If this worked: getProductByAsin is the solution!');
    console.log('- If this failed with same error: Root field doesn\'t matter');
    console.log('- If this failed differently: Document the new error pattern');
    console.log('');
    console.log('Next step: Run test-04-compare-all-root-fields.js for side-by-side comparison');
}

// Auto-run
runTests();
