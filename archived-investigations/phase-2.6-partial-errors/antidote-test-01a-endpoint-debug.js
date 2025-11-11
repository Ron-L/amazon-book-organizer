// Antidote Test - Phase 1a: Debug endpoint access
// Purpose: Figure out why /digital-graphql/v1 is returning 404
// Run this in browser console on amazon.com/yourbooks AFTER PAGE REFRESH
// Script: antidote-test-01a-endpoint-debug.js

const TARGET_VICTIM = {
    asin: 'B0085HN8N6',
    title: '99 Reasons to Hate Cats: Cartoons for Cat Lovers'
};

async function debugEndpoints() {
    console.log('========================================');
    console.log('ENDPOINT DEBUG TEST');
    console.log('Script: antidote-test-01a-endpoint-debug.js');
    console.log('========================================');
    console.log('');
    console.log('Testing different endpoint variations...');
    console.log('');

    // Test variations
    const endpoints = [
        { name: 'Absolute path v1', url: 'https://www.amazon.com/digital-graphql/v1' },
        { name: 'Relative path v1', url: '/digital-graphql/v1' },
        { name: 'Absolute no version', url: 'https://www.amazon.com/digital-graphql' },
        { name: 'Relative no version', url: '/digital-graphql' },
        { name: 'kindle-dbs (alternative)', url: 'https://www.amazon.com/kindle-dbs/graphql' }
    ];

    const query = `
        query enrichBook($asin: String!) {
            getProductByAsin(asin: $asin) {
                asin
                title
            }
        }
    `;

    for (const endpoint of endpoints) {
        console.log(`Testing: ${endpoint.name}`);
        console.log(`   URL: ${endpoint.url}`);

        try {
            const response = await fetch(endpoint.url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify({
                    query,
                    variables: { asin: TARGET_VICTIM.asin }
                })
            });

            console.log(`   HTTP Status: ${response.status} ${response.statusText}`);

            if (response.ok) {
                const data = await response.json();
                if (data.errors) {
                    console.log(`   ❌ GraphQL Error: ${data.errors[0]?.message || 'Unknown'}`);
                } else if (data.data?.getProductByAsin) {
                    console.log(`   ✅ SUCCESS!`);
                    console.log(`      Title: ${data.data.getProductByAsin.title}`);
                } else {
                    console.log(`   ⚠️  No data returned`);
                }
            } else {
                console.log(`   ❌ HTTP Error`);
            }
        } catch (error) {
            console.log(`   ❌ Exception: ${error.message}`);
        }

        console.log('');
    }

    console.log('========================================');
    console.log('Current page info:');
    console.log(`   URL: ${window.location.href}`);
    console.log(`   Hostname: ${window.location.hostname}`);
    console.log(`   Pathname: ${window.location.pathname}`);
    console.log('========================================');
}

console.log('');
console.log('🔍 Starting endpoint debug test...');
console.log('');
debugEndpoints();
