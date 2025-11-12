// Bookmarklet POC v1.0.0.b
// Tests external script loading from bookmarklet on Amazon page
// Goal: Verify we can load scripts from GitHub Pages and access Amazon page context

(async function() {
    'use strict';

    console.log('🧪 Bookmarklet POC v1.0.0.b - Starting...');
    console.log('📍 Current URL:', window.location.href);
    console.log('📄 Page title:', document.title);

    // Test 1: Can we access the page DOM?
    console.log('\n✅ Test 1: DOM Access');
    const bodyText = document.body ? 'Body element found' : 'No body element';
    console.log('  ', bodyText);

    // Test 2: Can we access page-specific elements?
    console.log('\n✅ Test 2: Amazon-Specific Elements');
    const yourBooksHeader = document.querySelector('h1');
    if (yourBooksHeader) {
        console.log('   Found h1:', yourBooksHeader.textContent);
    } else {
        console.log('   No h1 found');
    }

    // Test 3: Can we access Amazon's CSRF token? (Critical for API calls)
    // Using proven method from library-fetcher.js lines 429-436
    console.log('\n✅ Test 3: CSRF Token Access');
    const csrfMeta = document.querySelector('meta[name="anti-csrftoken-a2z"]');
    let csrfToken = null;
    if (csrfMeta) {
        csrfToken = csrfMeta.getAttribute('content');
        console.log('   CSRF token found:', csrfToken.substring(0, 20) + '...');
    } else {
        console.log('   ⚠️ CSRF token not found (may need to be on amazon.com/yourbooks)');
    }

    // Test 4: Can we make a simple fetch request?
    console.log('\n✅ Test 4: Network Request Test');
    try {
        const response = await fetch(window.location.href, {
            method: 'HEAD',
            credentials: 'include'
        });
        console.log('   Network request status:', response.status);
        console.log('   Network request OK:', response.ok);
    } catch (error) {
        console.log('   ⚠️ Network request failed:', error.message);
    }

    // Test 5: Show success summary
    console.log('\n🎉 Bookmarklet POC v1.0.0.b - Complete!');
    console.log('📊 Summary:');
    console.log('   ✅ Script loaded successfully from bookmarklet');
    console.log('   ✅ DOM access working');
    console.log('   ✅ Console logging working');
    console.log('   ' + (csrfToken ? '✅' : '⚠️') + ' CSRF token ' + (csrfToken ? 'found' : 'not found'));

    // Visual feedback on page
    const banner = document.createElement('div');
    banner.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        padding: 20px;
        border-radius: 10px;
        box-shadow: 0 10px 25px rgba(0,0,0,0.3);
        z-index: 10000;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        max-width: 300px;
    `;
    banner.innerHTML = `
        <div style="font-size: 16px; font-weight: bold; margin-bottom: 10px;">
            🧪 Bookmarklet POC Success!
        </div>
        <div style="font-size: 13px; opacity: 0.9;">
            v1.0.0.b loaded successfully<br>
            Check console for details
        </div>
        <button style="
            margin-top: 15px;
            background: rgba(255,255,255,0.2);
            border: 1px solid rgba(255,255,255,0.3);
            color: white;
            padding: 8px 15px;
            border-radius: 5px;
            cursor: pointer;
            font-size: 12px;
            width: 100%;
        " onclick="this.parentElement.remove()">
            Dismiss
        </button>
    `;
    document.body.appendChild(banner);

    // Auto-dismiss after 10 seconds
    setTimeout(() => {
        if (banner.parentElement) {
            banner.style.transition = 'opacity 0.5s';
            banner.style.opacity = '0';
            setTimeout(() => banner.remove(), 500);
        }
    }, 10000);

})();
