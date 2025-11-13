// Amazon Book Organizer Bookmarklet Loader v1.1.0
// Smart bookmarklet with intro dialog and navigation

(function() {
    'use strict';

    const LOADER_VERSION = 'v1.1.0';

    const currentUrl = window.location.href;
    const baseUrl = 'https://ron-l.github.io/amazon-book-organizer/';

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

    // Build dialog content based on current page
    let dialogContent = `
        <div style="font-size: 48px; margin-bottom: 15px;">📚</div>
        <div style="font-size: 20px; font-weight: bold; color: #333; margin-bottom: 15px;">
            Amazon Book Organizer
        </div>
        <div style="font-size: 14px; color: #666; margin-bottom: 20px; line-height: 1.6;">
            Fetch and organize your Amazon book library with a drag-and-drop interface.
        </div>
    `;

    if (onLibraryPage) {
        // On library page - offer to run library fetcher or navigate to collections
        dialogContent += `
            <div style="background: #e8f5e9; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
                <div style="font-weight: bold; color: #2e7d32; margin-bottom: 5px;">📖 Library Page Detected</div>
                <div style="font-size: 13px; color: #555;">You're on your Amazon library page</div>
            </div>
            <div style="text-align: left; background: #f8f9fa; padding: 15px; border-radius: 8px; margin-bottom: 20px; font-size: 13px; line-height: 1.6;">
                <strong>Library Fetcher</strong> will:
                <ul style="margin: 10px 0 0 20px; text-align: left;">
                    <li>Fetch all your books with titles, authors, covers</li>
                    <li>Enrich with descriptions, ratings, reviews</li>
                    <li>Download as JSON file to organize</li>
                </ul>
            </div>
            <button id="runLibrary" style="${primaryButtonStyle} width: 100%; margin-bottom: 10px;">
                📖 Fetch Your Book List
            </button>
            <button id="goCollections" style="${secondaryButtonStyle} width: 100%;">
                📚 Go to Collections Page to Fetch Collections
            </button>
        `;
    } else if (onCollectionsPage) {
        // On collections page - offer to run collections fetcher or navigate to library
        dialogContent += `
            <div style="background: #e8f5e9; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
                <div style="font-weight: bold; color: #2e7d32; margin-bottom: 5px;">📚 Collections Page Detected</div>
                <div style="font-size: 13px; color: #555;">You're on your Kindle collections page</div>
            </div>
            <div style="text-align: left; background: #f8f9fa; padding: 15px; border-radius: 8px; margin-bottom: 20px; font-size: 13px; line-height: 1.6;">
                <strong>Collections Fetcher</strong> will:
                <ul style="margin: 10px 0 0 20px; text-align: left;">
                    <li>Fetch your collection memberships</li>
                    <li>Extract read status for each book</li>
                    <li>Download as JSON file to merge with library</li>
                </ul>
            </div>
            <button id="goLibrary" style="${secondaryButtonStyle} width: 100%; margin-bottom: 10px;">
                📖 Go to Library Page to Fetch Book List
            </button>
            <button id="runCollections" style="${primaryButtonStyle} width: 100%;">
                📚 Fetch Your Book Collections
            </button>
        `;
    } else {
        // On other page - offer navigation to both
        dialogContent += `
            <div style="background: #fff3cd; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
                <div style="font-weight: bold; color: #856404; margin-bottom: 5px;">⚠️ Wrong Page</div>
                <div style="font-size: 13px; color: #555;">This tool works on Amazon library pages</div>
            </div>
            <div style="text-align: left; background: #f8f9fa; padding: 15px; border-radius: 8px; margin-bottom: 20px; font-size: 13px;">
                Choose which data to fetch:
            </div>
            <button id="goLibrary" style="${primaryButtonStyle} width: 100%; margin-bottom: 10px;">
                📖 Go to Library Page to Fetch Book List
            </button>
            <button id="goCollections" style="${primaryButtonStyle} width: 100%; margin-bottom: 15px;">
                📚 Go to Collections Page to Fetch Collections
            </button>
            <button id="cancel" style="${secondaryButtonStyle} width: 100%;">
                Cancel
            </button>
        `;
    }

    dialog.innerHTML = dialogContent;
    document.body.appendChild(dialog);

    // Helper function to load script
    function loadScript(scriptName, description) {
        dialog.remove();
        console.log(`📚 Amazon Book Organizer: Loading ${description}...`);
        const script = document.createElement('script');
        script.src = baseUrl + scriptName;
        script.onerror = function() {
            alert(`❌ Failed to load ${description}. Please check your internet connection.`);
        };
        document.body.appendChild(script);
    }

    // Event handlers
    const runLibraryBtn = dialog.querySelector('#runLibrary');
    if (runLibraryBtn) {
        runLibraryBtn.onclick = () => loadScript('library-fetcher.js', 'library fetcher');
    }

    const runCollectionsBtn = dialog.querySelector('#runCollections');
    if (runCollectionsBtn) {
        runCollectionsBtn.onclick = () => loadScript('collections-fetcher.js', 'collections fetcher');
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

    const cancelBtn = dialog.querySelector('#cancel');
    if (cancelBtn) {
        cancelBtn.onclick = () => dialog.remove();
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
