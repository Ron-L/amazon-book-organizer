// ReaderWrangler Bookmarklet Loader v1.1.1.a
// Universal navigator and data fetcher

(function() {
    'use strict';

    const LOADER_VERSION = 'v1.1.1.a';

    const currentUrl = window.location.href;

    // ISSUE #2 FIX: Check if DEV mode was explicitly requested via global flag
    const FORCE_LOCALHOST = window._READERWRANGLER_DEV_MODE || false;

    // Environment detection
    // Production = readerwrangler.com (users get optimal caching)
    // Dev = localhost OR github.io OR FORCE_LOCALHOST flag (developers get fresh code)
    const isLocalhost = window.location.hostname === 'localhost' ||
                       window.location.hostname === '127.0.0.1';
    const IS_PRODUCTION = !FORCE_LOCALHOST && window.location.hostname === 'readerwrangler.com';
    const IS_DEV = !IS_PRODUCTION;

    const baseUrl = FORCE_LOCALHOST || isLocalhost
        ? 'http://localhost:8000/'
        : IS_PRODUCTION
            ? 'https://readerwrangler.com/'
            : 'https://ron-l.github.io/readerwrangler/';

    // Debug logging
    console.log(`📚 ReaderWrangler Loader ${LOADER_VERSION}`);
    console.log(`   Hostname: ${window.location.hostname}`);
    console.log(`   FORCE_LOCALHOST: ${FORCE_LOCALHOST}`);
    console.log(`   isLocalhost: ${isLocalhost}`);
    console.log(`   IS_PRODUCTION: ${IS_PRODUCTION}`);
    console.log(`   IS_DEV: ${IS_DEV}`);
    console.log(`   baseUrl: ${baseUrl}`);

    // Detect current page type
    const onLibraryPage = currentUrl.includes('amazon.com/yourbooks') ||
                          currentUrl.includes('amazon.com/kindle/library');
    const onCollectionsPage = currentUrl.includes('amazon.com/hz/mycd/digital-console');

    // Create intro dialog
    const dialog = document.createElement('div');
    dialog.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: white;
        border-radius: 12px;
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
        padding: 30px;
        padding-top: 40px;
        z-index: 10000;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        max-width: 550px;
        text-align: center;
    `;

    const buttonStyle = `
        border: none;
        padding: 12px 24px;
        border-radius: 8px;
        font-size: 14px;
        font-weight: bold;
        cursor: pointer;
        margin: 5px;
        transition: all 0.2s;
    `;

    const primaryButtonStyle = buttonStyle + `
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
    `;

    const secondaryButtonStyle = buttonStyle + `
        background: #f8f9fa;
        color: #333;
        border: 1px solid #ddd;
    `;

    // Build universal navigator dialog
    let dialogContent = `
        <button style="
            position: absolute;
            top: 10px;
            right: 10px;
            background: none;
            border: none;
            font-size: 24px;
            color: #999;
            cursor: pointer;
            padding: 5px 10px;
            line-height: 1;
            transition: color 0.2s;
        " onmouseover="this.style.color='#333'" onmouseout="this.style.color='#999'" onclick="this.parentElement.remove()">✕</button>
        <div style="font-size: 48px; margin-bottom: 15px;">📚</div>
        <div style="font-size: 20px; font-weight: bold; color: #333; margin-bottom: 25px;">
            ReaderWrangler
        </div>
    `;

    // Add context-specific fetcher buttons
    if (onLibraryPage) {
        dialogContent += `
            <button id="runLibrary" style="${primaryButtonStyle} width: 100%; margin-bottom: 10px;">
                📖 Fetch Library Data
            </button>
        `;
    } else {
        dialogContent += `
            <button id="goLibrary" style="${primaryButtonStyle} width: 100%; margin-bottom: 10px;">
                📖 Go to Library Fetcher Amazon Page
            </button>
        `;
    }

    if (onCollectionsPage) {
        dialogContent += `
            <button id="runCollections" style="${primaryButtonStyle} width: 100%; margin-bottom: 10px;">
                📚 Fetch Collections Data
            </button>
        `;
    } else {
        dialogContent += `
            <button id="goCollections" style="${primaryButtonStyle} width: 100%; margin-bottom: 10px;">
                📚 Go to Collections Fetcher Amazon Page
            </button>
        `;
    }

    // Add universal navigation buttons
    dialogContent += `
        <button id="launchApp" style="${primaryButtonStyle} width: 100%; margin-bottom: 10px;">
            🎯 Launch App
        </button>
        <button id="launchIntro" style="${primaryButtonStyle} width: 100%;">
            ℹ️ Launch Intro for Help
        </button>
    `;

    dialog.innerHTML = dialogContent;
    document.body.appendChild(dialog);

    // Helper function to load script
    function loadScript(scriptName, description) {
        dialog.remove();
        console.log(`📚 ReaderWrangler: Loading ${description}...`);
        const script = document.createElement('script');

        // Cache-busting in dev environments for fresh code
        const cacheBuster = IS_DEV ? '?v=' + Date.now() : '';
        script.src = baseUrl + scriptName + cacheBuster;

        console.log(`   Loading from: ${script.src}`);
        console.log(`   Cache-busting enabled: ${IS_DEV}`);

        script.onerror = function() {
            alert(`❌ Failed to load ${description}. Please check your internet connection.`);
        };
        document.body.appendChild(script);
    }

    // Event handlers
    const runLibraryBtn = dialog.querySelector('#runLibrary');
    if (runLibraryBtn) {
        runLibraryBtn.onclick = () => loadScript('amazon-library-fetcher.js', 'library fetcher');
    }

    const runCollectionsBtn = dialog.querySelector('#runCollections');
    if (runCollectionsBtn) {
        runCollectionsBtn.onclick = () => loadScript('amazon-collections-fetcher.js', 'collections fetcher');
    }

    const goLibraryBtn = dialog.querySelector('#goLibrary');
    if (goLibraryBtn) {
        goLibraryBtn.onclick = () => {
            dialog.remove();
            // Show reminder before navigation
            setTimeout(() => {
                alert('📚 Navigating to your library page...\n\nOnce the page loads, click the bookmarklet in your toolbar to fetch your books.');
            }, 100);
            setTimeout(() => {
                window.location.href = 'https://www.amazon.com/yourbooks';
            }, 200);
        };
    }

    const goCollectionsBtn = dialog.querySelector('#goCollections');
    if (goCollectionsBtn) {
        goCollectionsBtn.onclick = () => {
            dialog.remove();
            // Show reminder before navigation
            setTimeout(() => {
                alert('📚 Navigating to collections page...\n\nOnce the page loads, click the bookmarklet in your toolbar to fetch your collections.');
            }, 100);
            setTimeout(() => {
                window.location.href = 'https://www.amazon.com/hz/mycd/digital-console/contentlist/booksAll/dateDsc/';
            }, 200);
        };
    }

    const launchAppBtn = dialog.querySelector('#launchApp');
    if (launchAppBtn) {
        launchAppBtn.onclick = () => {
            dialog.remove();
            window.location.href = baseUrl + 'readerwrangler.html';
        };
    }

    const launchIntroBtn = dialog.querySelector('#launchIntro');
    if (launchIntroBtn) {
        launchIntroBtn.onclick = () => {
            dialog.remove();
            window.location.href = baseUrl + 'index.html';
        };
    }

    // Add version footer to dialog
    const versionFooter = document.createElement('div');
    versionFooter.style.cssText = 'text-align: center; margin-top: 20px; color: #999; font-size: 11px;';
    versionFooter.textContent = LOADER_VERSION;
    dialog.appendChild(versionFooter);

    // Hover effects
    dialog.querySelectorAll('button').forEach(btn => {
        btn.addEventListener('mouseenter', function() {
            this.style.transform = 'translateY(-2px)';
            this.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
        });
        btn.addEventListener('mouseleave', function() {
            this.style.transform = 'translateY(0)';
            this.style.boxShadow = 'none';
        });
    });

})();
