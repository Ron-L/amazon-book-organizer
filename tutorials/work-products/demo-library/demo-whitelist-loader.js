// Load Demo Whitelist into amazon.com localStorage
//
// Usage:
// 1. Open any amazon.com page in Chrome/Edge (e.g., amazon.com/yourbooks)
// 2. Open DevTools Console (F12 → Console)
// 3. Paste this entire script and press Enter
// 4. Select demo-whitelist.json when the file picker opens
//
// To disable: delete the key "readerwrangler-demo-whitelist-enabled" from
// Application → Local Storage → amazon.com in DevTools
//
// To re-enable: run this script again, or manually set:
//   localStorage.setItem('readerwrangler-demo-whitelist-enabled', 'true')

(async () => {
    // File picker
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';

    const file = await new Promise(resolve => {
        input.addEventListener('change', () => resolve(input.files[0]));
        input.click();
    });

    if (!file) {
        console.log('❌ No file selected');
        return;
    }

    const text = await file.text();
    const data = JSON.parse(text);

    if (!data.asins || !Array.isArray(data.asins)) {
        console.error('❌ Invalid whitelist file — expected { asins: [...] }');
        return;
    }

    // Write ASIN list and enable flag
    localStorage.setItem('readerwrangler-demo-whitelist', JSON.stringify(data.asins));
    localStorage.setItem('readerwrangler-demo-whitelist-enabled', 'true');

    console.log(`✅ Demo whitelist loaded: ${data.asins.length} ASINs`);
    console.log('   Key: readerwrangler-demo-whitelist');
    console.log('   Flag: readerwrangler-demo-whitelist-enabled = "true"');
    console.log('');
    console.log('To disable: localStorage.removeItem("readerwrangler-demo-whitelist-enabled")');
})();
