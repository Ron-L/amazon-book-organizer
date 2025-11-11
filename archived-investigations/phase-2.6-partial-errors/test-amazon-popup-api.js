// test-amazon-popup-api.js
// Test Amazon's qvGetProductQuickView API (used in amazon.com/yourbooks popup)
// Tests if this API can successfully retrieve review text for books with partial errors

// INSTRUCTIONS:
// 1. Go to: https://www.amazon.com/kindle-reader-api
// 2. Open browser Developer Tools (F12)
// 3. Go to Console tab
// 4. Paste this ENTIRE script and press Enter
// 5. Review the output below

// Test ASIN: Cats (known to have reviews but partial error in getProducts)
const TEST_ASIN = 'B0085HN8N6'; // Cats by James Herriot (621 reviews)

console.log('='.repeat(80));
console.log('TEST: Amazon Popup API (qvGetProductQuickView)');
console.log('='.repeat(80));
console.log(`Testing ASIN: ${TEST_ASIN}`);
console.log('');

// GraphQL query - exact structure from amazon.com/yourbooks Network tab
const query = `
  query qvGetProductQuickView($asin: ID!) {
    getProduct(asin: $asin) {
      asin
      title
      authors {
        name
      }
      customerReviewsSummary {
        count {
          displayString
        }
        rating {
          fullStarCount
          hasHalfStar
          value
        }
      }
      customerReviewsTop {
        reviews {
          contentAbstract {
            textAbstract
          }
          contributor {
            contributorRelationships {
              displaySpecializationKey
            }
            publicProfile {
              publicProfile {
                publicName {
                  displayString
                }
              }
              avatar {
                smallImage {
                  url
                }
              }
            }
          }
          links {
            viewOnAmazon {
              url
            }
          }
          originDescription
          title
          stars
        }
      }
      description
    }
  }
`;

const variables = {
  asin: TEST_ASIN
};

// Fetch using exact headers from amazon.com/yourbooks popup
fetch('https://www.amazon.com/kindle-reader-api', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-client-id': 'quickview',
    'x-amz-portal-marketplace-id': 'ATVPDKIKX0DER'
  },
  body: JSON.stringify({
    operationName: 'qvGetProductQuickView',
    query: query,
    variables: variables
  }),
  credentials: 'include'
})
.then(response => response.json())
.then(result => {
  console.log('--- RAW RESPONSE (Full JSON) ---');
  console.log(JSON.stringify(result, null, 2));
  console.log('');

  // Check for errors
  if (result.errors && result.errors.length > 0) {
    console.log('⚠️  ERRORS DETECTED:');
    result.errors.forEach((err, idx) => {
      console.log(`  Error ${idx + 1}:`, err.message);
      console.log('  Path:', err.path);
      console.log('  Extensions:', err.extensions);
    });
    console.log('');
  }

  // Extract data
  const product = result.data?.getProduct;

  if (!product) {
    console.log('❌ NO PRODUCT DATA RETURNED');
    return;
  }

  console.log('--- EXTRACTED DATA ---');
  console.log('Title:', product.title);
  console.log('Authors:', product.authors?.map(a => a.name).join(', ') || 'N/A');
  console.log('');

  // Review summary
  const summary = product.customerReviewsSummary;
  if (summary) {
    console.log('Review Summary:');
    console.log('  Count:', summary.count?.displayString || '0');
    console.log('  Rating:', summary.rating?.value || 'N/A');
    console.log('  Stars:', summary.rating?.fullStarCount || 0);
    console.log('  Half Star:', summary.rating?.hasHalfStar ? 'Yes' : 'No');
  } else {
    console.log('Review Summary: MISSING');
  }
  console.log('');

  // Top reviews
  const topReviews = product.customerReviewsTop?.reviews;
  if (topReviews && topReviews.length > 0) {
    console.log(`✅ TOP REVIEWS: Found ${topReviews.length} reviews`);
    console.log('');

    topReviews.forEach((review, idx) => {
      console.log(`--- Review ${idx + 1} ---`);
      console.log('Stars:', review.stars);
      console.log('Title:', review.title || 'N/A');
      console.log('Reviewer:', review.contributor?.publicProfile?.publicProfile?.publicName?.displayString || 'Anonymous');
      console.log('Text:', review.contentAbstract?.textAbstract || 'N/A');
      console.log('Origin:', review.originDescription || 'N/A');
      console.log('Link:', review.links?.viewOnAmazon?.url || 'N/A');
      console.log('');
    });
  } else {
    console.log('❌ TOP REVIEWS: EMPTY or MISSING');
    console.log('');
  }

  // Description
  console.log('Description:', product.description ? `${product.description.substring(0, 100)}...` : 'MISSING');
  console.log('');

  // Summary
  console.log('='.repeat(80));
  console.log('SUMMARY');
  console.log('='.repeat(80));
  console.log('API Method: qvGetProductQuickView (Amazon popup method)');
  console.log('Has Errors:', result.errors ? 'YES ⚠️' : 'NO ✅');
  console.log('Has Data:', product ? 'YES ✅' : 'NO ❌');
  console.log('Has Review Summary:', summary ? 'YES ✅' : 'NO ❌');
  console.log('Has Review Text:', topReviews && topReviews.length > 0 ? `YES ✅ (${topReviews.length} reviews)` : 'NO ❌');
  console.log('Has Description:', product.description ? 'YES ✅' : 'NO ❌');
  console.log('='.repeat(80));

  // Comparison note
  console.log('');
  console.log('COMPARISON TO LIBRARY-FETCHER:');
  console.log('- library-fetcher uses: getProducts (plural) with x-client-id: your-books');
  console.log('- This test uses: getProduct (singular) with x-client-id: quickview');
  console.log('- Operation name: qvGetProductQuickView (popup-specific)');
  console.log('');
  console.log('NEXT STEPS:');
  console.log('1. Compare error presence (partial errors vs zero errors)');
  console.log('2. Compare review text availability');
  console.log('3. If this works better, consider Phase 3 retry using this API');
  console.log('');
})
.catch(error => {
  console.error('❌ FETCH FAILED:', error);
});
