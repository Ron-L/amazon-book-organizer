// Debug: See raw response from getProduct query
// Run this in browser console on amazon.com/yourbooks
// Script: antidote-test-02a-debug-response.js

async function debugResponse() {
    console.log('========================================');
    console.log('DEBUG: Raw Response from getProduct');
    console.log('========================================');
    console.log('');

    const csrfMeta = document.querySelector('meta[name="anti-csrftoken-a2z"]');
    const csrfToken = csrfMeta.getAttribute('content');

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
  }
}`;

    const response = await fetch('https://www.amazon.com/kindle-reader-api', {
        method: 'POST',
        headers: {
            'accept': 'application/json, text/plain, */*',
            'content-type': 'application/json',
            'anti-csrftoken-a2z': csrfToken,
            'x-client-id': 'quickview'
        },
        credentials: 'include',
        body: JSON.stringify({
            query: amazonQuery,
            operationName: 'getProductDescription'
        })
    });

    const data = await response.json();

    console.log('FULL RESPONSE:');
    console.log(JSON.stringify(data, null, 2));
    console.log('');
    console.log('========================================');
    console.log('');
    console.log('Description sections:');
    console.log(data?.data?.getProduct?.description?.sections);
    console.log('');
    console.log('========================================');

    window.debugResponseData = data;
}

debugResponse();
