// Demo Whitelist — Recording Filter for Amazon "Your Books" page
//
// For video recording. Replaces the live Amazon page content with
// the pre-cleaned demo library HTML. URL bar still shows amazon.com.
//
// Prerequisite: Run demo-whitelist-cleanup-html.js on a saved copy of your
// Amazon "Your Books" page first to create "amazon-yourbooks-demo.html".
//
// Usage:
// 1. Navigate to amazon.com/hz/mycd/digital-console/contentlist/booksPurchased
// 2. Wait for the page to fully load (header, sidebar visible)
// 3. Open DevTools Console (F12 → Console)
// 4. Paste this entire script and press Enter
// 5. A file picker appears — select "amazon-yourbooks-demo.html"
// 6. Page content is replaced with the demo library
//
// To reset: reload the page (F5).

(() => {
    'use strict';

    // Create file picker
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.html,.htm';
    input.style.display = 'none';
    document.body.appendChild(input);

    input.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) {
            console.log('No file selected.');
            return;
        }

        console.log(`Loading: ${file.name} (${(file.size / 1024).toFixed(0)} KB)...`);

        const html = await file.text();

        // Parse the cleaned HTML to extract body content
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');

        // --- Strategy: Replace body content, keep live page's <head> ---
        // Amazon's CSS is already loaded from their CDN on the live page.
        // The cleaned file has no scripts, so no Amazon JS re-executes.

        // Fix URLs: Chrome "Save As" rewrites CDN URLs to local relative paths
        // like "Your Books_files/81dZcqRrrxL._SY300_.jpg". Rewrite them back to
        // absolute Amazon CDN URLs so images load on the live page.
        const imgs = doc.querySelectorAll('img[src]');
        let fixedUrls = 0;
        for (const img of imgs) {
            const src = img.getAttribute('src');
            if (src && src.includes('Your Books_files/')) {
                const filename = src.replace('Your Books_files/', '');
                img.setAttribute('src', 'https://m.media-amazon.com/images/I/' + filename);
                fixedUrls++;
            }
        }
        // Also fix CSS background images and other src/href attributes
        const allWithSrc = doc.querySelectorAll('[src], [href]');
        for (const el of allWithSrc) {
            for (const attr of ['src', 'href']) {
                const val = el.getAttribute(attr);
                if (val && val.includes('Your Books_files/')) {
                    el.setAttribute(attr, val.replace('Your Books_files/', 'https://m.media-amazon.com/images/I/'));
                    fixedUrls++;
                }
            }
        }
        console.log(`Fixed ${fixedUrls} local URLs → Amazon CDN`);

        const newBody = doc.body;

        // Kill Amazon's observers and timers by replacing the body entirely.
        // This disconnects all event listeners Amazon attached.
        const oldBody = document.body;
        const freshBody = document.createElement('body');

        // Copy attributes from cleaned HTML's body
        for (const attr of newBody.attributes) {
            freshBody.setAttribute(attr.name, attr.value);
        }

        // Copy the inner content
        freshBody.innerHTML = newBody.innerHTML;

        // Swap bodies
        oldBody.replaceWith(freshBody);

        // Inject any inline styles from the cleaned file's <head>
        // that might not exist in the live page
        const cleanedStyles = doc.querySelectorAll('head style');
        for (const style of cleanedStyles) {
            document.head.appendChild(style.cloneNode(true));
        }

        // Anonymize personal info
        const profileName = freshBody.querySelector('[data-testid="profileName"]');
        if (profileName) profileName.textContent = 'Your Books';
        const customerSince = freshBody.querySelector('#profile-customer-info-value');
        if (customerSince) customerSince.textContent = '';
        const deliverTo = freshBody.querySelector('#glow-ingress-line1');
        if (deliverTo) deliverTo.textContent = 'Deliver to You';
        const deliverLoc = freshBody.querySelector('#glow-ingress-line2');
        if (deliverLoc) deliverLoc.textContent = 'Your town';
        const helloName = freshBody.querySelector('#nav-link-accountList-nav-line-1');
        if (helloName) helloName.textContent = 'Hello, sign in';

        // Clean up
        input.remove();

        // Count what we injected
        const bookCount = freshBody.querySelectorAll(
            '[data-testid="book-view"][data-csa-c-item-id]'
        ).length;

        console.log(`Done! Replaced page with ${bookCount} demo library books.`);
        console.log('URL bar shows amazon.com — ready to record!');
    });

    // Trigger file picker
    input.click();
})();
