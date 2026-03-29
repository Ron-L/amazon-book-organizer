// Demo Whitelist — Cleanup saved Amazon "Your Books" HTML
//
// Prep step (run once):
// 1. Navigate to amazon.com/hz/mycd/digital-console/contentlist/booksPurchased
// 2. Scroll through ALL pages so every book loads into the DOM
// 3. Chrome → File → Save As → "Webpage, Complete" → save as amazon-yourbooks-raw.html
// 4. Open the saved HTML file locally in Chrome (file:///...)
// 5. Open DevTools Console (F12 → Console)
// 6. Paste this entire script and press Enter
// 7. It will strip non-whitelist books and download a cleaned HTML file
//
// The cleaned file is what the recording script injects into the live page.
//
// This uses the DISPLAY whitelist (80 ASINs): 68 individual books + 12 series
// parentAsins. Series appear as collection-view elements on Amazon's page.

(() => {
    'use strict';

    // --- Display whitelist: 80 ASINs (individual books + series parentAsins) ---
    // These match the data-csa-c-item-id attributes on Amazon's Your Books page.
    // Individual books use book-view elements, series use collection-view elements.
    const WHITELIST = new Set([
        // 68 individual books
        "B000FC1192","B000FC130E","B000FC2OAM","B0011UJM48","B001QEAQQC",
        "B001QEAQQW","B001QIGZTA","B001TLZEUK","B0022Q8CSC","B002H8OS06",
        "B002IPG40A","B003GY0KNY","B003J5UIMI","B003X27LFE","B004478DOU",
        "B004FGMURG","B004TPCQWC","B004TPCR4O","B004TPP976","B004XJIWAE",
        "B004YMYR2C","B005EAWPFY","B005ISQ7JM","B005X8V1OI","B0073XV2W2",
        "B007MSK4HM","B0091W3BJA","B009NFHF0Q","B00AAJR16M","B00BN2JI0W",
        "B00C74OY7M","B00DMCPOBI","B00DTT8MZE","B00GAMTRI8","B00GEEB730",
        "B00KDMLXMO","B00KPV9PIW","B00MYPO0ZA","B00Q102M5Y","B00XRP2T68",
        "B01513ZIL6","B01767Z16M","B017RNBRRW","B01EKJ4PQ6","B01J2SU2YO",
        "B071GTPBB1","B072C7QKRY","B072F1WKW1","B072L78PHK","B073QM98F5",
        "B073QR86XF","B073QRYR6G","B073QS9M8M","B073W9TT71","B074W6K2RN",
        "B074W95Z2Y","B0752ZLG34","B0756ZS2DT","B075RLXL3T","B078SNNV86",
        "B078YW4FQT","B07MD6JBNM","B082J5KYG6","B0864ZGLY7","B09L79BFT7",
        "B0D5JLH3RJ","B0D9DSCFCC","B0DVMSR5BS",
        // 12 series parentAsins
        "B000OZ0NXA",  // Reacher
        "B001F784EG",  // Inferno
        "B001PSEPLG",  // Jack Ryan
        "B001QWFY6G",  // Tom Clancy's Military Reference
        "B003P8Q5IK",  // Dream Park
        "B003QP4NPE",  // Daemon
        "B004YW4L5K",  // American Gods
        "B00APARD0K",  // Janissaries
        "B01KG5GQDS",  // Beartown
        "B075HYJF6X",  // Jack Ryan Jr.
        "B07FLX8V84",  // Delta-v
        "B082YFL9TJ"   // Heorot
    ]);

    console.log(`Display whitelist: ${WHITELIST.size} ASINs (68 individual + 12 series)`);

    // --- Step 1: Remove all <script> tags (prevent Amazon JS from re-executing) ---
    const scripts = document.querySelectorAll('script');
    scripts.forEach(s => s.remove());
    console.log(`Removed ${scripts.length} script tags`);

    // --- Step 2: Remove non-whitelist books and collections ---
    // Individual books: matched by data-csa-c-item-id
    // Series collections: matched by the asin: value inside data-csa-c-content-id
    //   (data-csa-c-item-id on collections is a separate collection ASIN, not a book ASIN)
    const bookViews = document.querySelectorAll('[data-testid="book-view"][data-csa-c-item-id]');
    const collectionViews = document.querySelectorAll('[data-testid="collection-view"][data-csa-c-item-id]');

    let keptBooks = 0;
    let keptCollections = 0;
    let removed = 0;
    const keptAsins = new Set();

    // Process individual books — match on data-csa-c-item-id
    for (const el of bookViews) {
        const asin = el.getAttribute('data-csa-c-item-id');
        if (asin && WHITELIST.has(asin)) {
            keptBooks++;
            keptAsins.add(asin);
        } else {
            el.remove();
            removed++;
        }
    }

    // Process collections — match on asin: value in data-csa-c-content-id
    for (const el of collectionViews) {
        const contentId = el.getAttribute('data-csa-c-content-id') || '';
        const asinMatch = contentId.match(/asin:(\w+)/);
        const asin = asinMatch ? asinMatch[1] : null;
        if (asin && WHITELIST.has(asin)) {
            keptCollections++;
            keptAsins.add(asin);
        } else {
            el.remove();
            removed++;
        }
    }

    console.log(`Kept: ${keptBooks} books + ${keptCollections} series = ${keptBooks + keptCollections} items`);
    console.log(`Removed: ${removed} non-whitelist items`);
    console.log(`Whitelist coverage: ${keptAsins.size} of ${WHITELIST.size} found`);

    if (keptAsins.size < WHITELIST.size) {
        const missing = [...WHITELIST].filter(a => !keptAsins.has(a));
        console.log(`Missing ASINs (${missing.length}):`, missing);
    }

    // --- Step 3: Remove Amazon's "Load more" button ---
    const loadMore = document.querySelector('#load-more-button-wrapper');
    if (loadMore) loadMore.remove();

    // --- Step 4: Remove potential personal info elements ---
    const accountElements = document.querySelectorAll(
        '[data-testid="customer-name"], ' +
        '[data-testid="account-switcher"], ' +
        '.nav-line-1-container, ' +
        '#nav-link-accountList'
    );
    accountElements.forEach(el => {
        if (el.textContent.includes('@')) {
            el.textContent = 'Demo User';
        }
    });

    // --- Step 5: Remove noscript tags and hidden iframes (tracking) ---
    document.querySelectorAll('noscript, iframe[style*="display:none"], iframe[style*="display: none"]')
        .forEach(el => el.remove());

    // --- Step 6: Download cleaned HTML ---
    const cleanedHTML = '<!DOCTYPE html>\n' + document.documentElement.outerHTML;
    const blob = new Blob([cleanedHTML], { type: 'text/html' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = 'amazon-yourbooks-demo.html';
    a.click();

    URL.revokeObjectURL(url);

    console.log(`\nDone! Downloaded "amazon-yourbooks-demo.html" (${(cleanedHTML.length / 1024).toFixed(0)} KB)`);
    console.log('Review the file locally before using it for recording.');
})();
