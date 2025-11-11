// Antidote Test - Phase 2: Amazon's Own Method
// Purpose: Use the EXACT query structure Amazon uses (getProduct, not getProducts)
// Discovery: Amazon gets descriptions successfully, only reviews fail
// Test: Can we get descriptions by mimicking Amazon's query WITHOUT requesting reviews?
// Run this in browser console on amazon.com/yourbooks AFTER PAGE REFRESH
// Script: antidote-test-02-amazon-method.js

const TARGET_VICTIM = {
    asin: 'B0085HN8N6',
    title: '99 Reasons to Hate Cats: Cartoons for Cat Lovers'
};

const PHASE_INFO = {
    phase: 2,
    name: "Amazon's Own Method",
    hypothesis: 'Using getProduct (singular) and skipping reviews will succeed',
    method: 'Copy Amazon\'s query structure, request description but NOT reviews',
    expectedOutcome: 'Description succeeds, no review errors'
};

async function antidoteTest02() {
    console.log('========================================');
    console.log('ANTIDOTE TEST - PHASE 2');
    console.log('Script: antidote-test-02-amazon-method.js');
    console.log('========================================');
    console.log('');
    console.log('PHASE INFO:');
    console.log(`   Phase: ${PHASE_INFO.phase}`);
    console.log(`   Name: ${PHASE_INFO.name}`);
    console.log(`   Hypothesis: ${PHASE_INFO.hypothesis}`);
    console.log(`   Method: ${PHASE_INFO.method}`);
    console.log(`   Expected: ${PHASE_INFO.expectedOutcome}`);
    console.log('');
    console.log('KEY DISCOVERY:');
    console.log('   Amazon\'s own page GETS the description successfully!');
    console.log('   Only customerReviewsTop fails with "Customer Id" error');
    console.log('   We will use Amazon\'s query but skip the reviews section');
    console.log('');

    // Get CSRF token
    console.log('[1/2] Getting CSRF token...');
    const csrfMeta = document.querySelector('meta[name="anti-csrftoken-a2z"]');

    if (!csrfMeta) {
        console.error('❌ CSRF token not found');
        console.error('   Make sure you\'re on amazon.com/yourbooks');
        return;
    }

    const csrfToken = csrfMeta.getAttribute('content');
    console.log(`   ✅ Token obtained: ${csrfToken.substring(0, 10)}...`);
    console.log('');

    // Amazon's query structure - simplified to just what we need
    const amazonQuery = `query getProductDescription {
  getProduct(input: {asin: "B0085HN8N6"}) {
    asin
    title {
      displayString
    }
    description {
      sections(filter: {types: PRODUCT_DESCRIPTION}) {
        type
        content
      }
    }
    byLine {
      contributors {
        contributor {
          author {
            profile {
              displayName
            }
          }
        }
      }
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
  }
}`;

    console.log('[2/2] Testing Amazon\'s method...');
    console.log('');
    console.log('Using getProduct (singular) query');
    console.log('Requesting: title, description, authors, review summary');
    console.log('NOT requesting: customerReviewsTop (the failing section)');
    console.log('');

    const startTime = Date.now();

    try {
        const response = await fetch('https://www.amazon.com/kindle-reader-api', {
            method: 'POST',
            headers: {
                'accept': 'application/json, text/plain, */*',
                'content-type': 'application/json',
                'anti-csrftoken-a2z': csrfToken,
                'x-client-id': 'quickview'  // Using Amazon's client ID
            },
            credentials: 'include',
            body: JSON.stringify({
                query: amazonQuery,
                operationName: 'getProductDescription'
            })
        });

        const duration = ((Date.now() - startTime) / 1000).toFixed(2);
        console.log(`Response received in ${duration}s`);
        console.log(`HTTP Status: ${response.status} ${response.statusText}`);
        console.log('');

        if (!response.ok) {
            console.log('❌ HTTP ERROR');
            console.log(`   Status: ${response.status}`);
            console.log('');
            console.log('CONCLUSION: HTTP request failed');
            return;
        }

        const data = await response.json();

        // Check for errors
        if (data.errors && data.errors.length > 0) {
            console.log('⚠️  GRAPHQL ERRORS PRESENT:');
            data.errors.forEach((err, idx) => {
                console.log(`   Error ${idx + 1}:`);
                console.log(`      Message: ${err.message}`);
                console.log(`      Path: ${err.path?.join(' → ') || 'N/A'}`);
            });
            console.log('');
        }

        // Check for data
        const product = data?.data?.getProduct;

        if (!product) {
            console.log('❌ NO PRODUCT DATA');
            console.log('');
            console.log('CONCLUSION: Query returned no data');
            return;
        }

        console.log('✅ PRODUCT DATA RECEIVED');
        console.log('');

        // Extract fields
        const title = product.title?.displayString || '';

        // Description can be string OR object with .text property
        const descSection = product.description?.sections?.[0]?.content;
        let description = '';
        if (typeof descSection === 'string') {
            description = descSection;
        } else if (descSection?.text) {
            description = descSection.text;
        }

        const authors = product.byLine?.contributors?.map(c =>
            c.contributor?.author?.profile?.displayName
        ).filter(Boolean).join(', ') || '';
        const reviewCount = product.customerReviewsSummary?.count?.displayString || '0';
        const rating = product.customerReviewsSummary?.rating?.value || 0;

        console.log('📋 EXTRACTED DATA:');
        console.log(`   Title: ${title}`);
        console.log(`   Authors: ${authors || 'N/A'}`);
        console.log(`   Description: ${description.length} characters`);
        console.log(`   Review Count: ${reviewCount}`);
        console.log(`   Rating: ${rating} stars`);
        console.log('');

        // Success determination
        const hasDescription = description.length > 0;
        const hasErrors = data.errors && data.errors.length > 0;

        console.log('========================================');
        console.log('📊 PHASE 2 RESULTS');
        console.log('========================================');
        console.log('');
        console.log(`   Description retrieved: ${hasDescription ? '✅ YES' : '❌ NO'}`);
        console.log(`   GraphQL errors: ${hasErrors ? '⚠️  YES' : '✅ NO'}`);
        console.log(`   Duration: ${duration}s`);
        console.log('');

        console.log('========================================');
        console.log('📋 ANALYSIS');
        console.log('========================================');
        console.log('');

        if (hasDescription && !hasErrors) {
            console.log('🎉 PERFECT SUCCESS!');
            console.log('');
            console.log('✅ FINDINGS:');
            console.log('   - Using getProduct (singular) works!');
            console.log('   - Description retrieved successfully');
            console.log('   - No errors when we skip customerReviewsTop');
            console.log('');
            console.log('💡 ROOT CAUSE IDENTIFIED:');
            console.log('   The problem is NOT with Cats itself');
            console.log('   The problem is with customerReviewsTop endpoint');
            console.log('   for certain books (Cats, 2 Queens)');
            console.log('');
            console.log('💡 SOLUTION:');
            console.log('   1. Use getProduct instead of getProducts');
            console.log('   2. Request description WITHOUT customerReviewsTop');
            console.log('   3. Get review summary from customerReviewsSummary instead');
            console.log('   4. Accept we won\'t get individual review text');
            console.log('');
            console.log('🎯 NEXT STEPS:');
            console.log('   1. Update library-fetcher.js to use this query');
            console.log('   2. Test on all 3 problem books');
            console.log('   3. Run full library fetch');
        } else if (hasDescription && hasErrors) {
            console.log('⚠️  PARTIAL SUCCESS');
            console.log('');
            console.log('   Description: ✅ Retrieved');
            console.log('   Errors: ⚠️  Present but data still returned');
            console.log('');
            console.log('💡 FINDING:');
            console.log('   We got the description despite errors');
            console.log('   Errors are for specific fields we can skip');
            console.log('');
        } else {
            console.log('❌ FAILED');
            console.log('');
            console.log('   Description: ❌ Not retrieved');
            console.log('');
            console.log('💡 FINDING:');
            console.log('   Using Amazon\'s method did not solve the problem');
            console.log('   Need to investigate further');
        }

        console.log('');
        console.log('========================================');

        // Save results
        const results = {
            phase: 2,
            phaseInfo: PHASE_INFO,
            victim: TARGET_VICTIM,
            success: hasDescription,
            hasErrors,
            data: {
                title,
                authors,
                descriptionLength: description.length,
                description: description.substring(0, 200) + '...',
                reviewCount,
                rating
            },
            durationSec: parseFloat(duration),
            errors: data.errors || []
        };

        window.antidoteTest02Results = results;
        console.log('📦 Results saved to: window.antidoteTest02Results');

    } catch (error) {
        const duration = ((Date.now() - startTime) / 1000).toFixed(2);
        console.log(`❌ EXCEPTION after ${duration}s`);
        console.log(`   Error: ${error.message}`);
        console.log('');
        console.log('CONCLUSION: Request threw an exception');

        window.antidoteTest02Results = {
            phase: 2,
            phaseInfo: PHASE_INFO,
            success: false,
            error: error.message,
            durationSec: parseFloat(duration)
        };
    }
}

// Instructions
console.log('');
console.log('========================================');
console.log('🔬 ANTIDOTE TEST - PHASE 2 (AMAZON METHOD)');
console.log('========================================');
console.log('');
console.log('Purpose: Mimic Amazon\'s exact query structure');
console.log('');
console.log('Key insight from network inspection:');
console.log('   Amazon GETS descriptions successfully for Cats!');
console.log('   Only the reviews section fails.');
console.log('');
console.log('Strategy:');
console.log('   Use getProduct (not getProducts)');
console.log('   Request description but NOT customerReviewsTop');
console.log('   Use x-client-id: quickview (Amazon\'s own)');
console.log('');
console.log('PREREQUISITES:');
console.log('✅ On amazon.com/yourbooks');
console.log('');
console.log('READY TO RUN!');
console.log('   Script loaded successfully.');
console.log('   Starting test automatically...');
console.log('');
console.log('ESTIMATED DURATION: ~1 second');
console.log('');
console.log('========================================');
console.log('');

// Auto-invoke the test
antidoteTest02();
