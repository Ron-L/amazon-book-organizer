// Amazon Book Organizer Bookmarklet Loader v1.0.0
// Smart bookmarklet that detects page and loads appropriate fetcher

(function() {
    'use strict';

    const currentUrl = window.location.href;
    const baseUrl = 'https://ron-l.github.io/amazon-book-organizer/';

    // Detect which page we're on and load appropriate script
    if (currentUrl.includes('amazon.com/hz/mycd/myx') ||
        currentUrl.includes('amazon.com/yourbooks') ||
        currentUrl.includes('amazon.com/kindle/library')) {

        console.log('📚 Amazon Book Organizer: Loading library fetcher...');
        const script = document.createElement('script');
        script.src = baseUrl + 'library-fetcher.js';
        script.onerror = function() {
            alert('❌ Failed to load library fetcher. Please check your internet connection.');
        };
        document.body.appendChild(script);

    } else if (currentUrl.includes('read.amazon.com/kindle-library')) {

        console.log('📚 Amazon Book Organizer: Loading collections fetcher...');
        const script = document.createElement('script');
        script.src = baseUrl + 'collections-fetcher.js';
        script.onerror = function() {
            alert('❌ Failed to load collections fetcher. Please check your internet connection.');
        };
        document.body.appendChild(script);

    } else {
        // Show friendly error with instructions
        const banner = document.createElement('div');
        banner.style.cssText = `
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
            max-width: 500px;
            text-align: center;
        `;

        banner.innerHTML = `
            <div style="font-size: 48px; margin-bottom: 15px;">📚</div>
            <div style="font-size: 20px; font-weight: bold; color: #333; margin-bottom: 15px;">
                Amazon Book Organizer
            </div>
            <div style="font-size: 14px; color: #666; margin-bottom: 20px; line-height: 1.6;">
                This bookmarklet works on Amazon library pages. Please navigate to one of these pages first:
            </div>
            <div style="text-align: left; background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
                <div style="font-weight: bold; color: #667eea; margin-bottom: 10px;">📖 For Your Library:</div>
                <div style="font-size: 13px; margin-bottom: 5px;">
                    • <a href="https://www.amazon.com/hz/mycd/myx" target="_blank" style="color: #667eea;">amazon.com/hz/mycd/myx</a>
                </div>
                <div style="font-size: 13px; margin-bottom: 15px;">
                    • <a href="https://www.amazon.com/yourbooks" target="_blank" style="color: #667eea;">amazon.com/yourbooks</a>
                </div>
                <div style="font-weight: bold; color: #667eea; margin-bottom: 10px;">📚 For Collections:</div>
                <div style="font-size: 13px;">
                    • <a href="https://read.amazon.com/kindle-library" target="_blank" style="color: #667eea;">read.amazon.com/kindle-library</a>
                </div>
            </div>
            <button style="
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                border: none;
                padding: 12px 24px;
                border-radius: 8px;
                font-size: 14px;
                font-weight: bold;
                cursor: pointer;
                width: 100%;
            " onclick="this.parentElement.remove()">
                Got it!
            </button>
        `;

        document.body.appendChild(banner);

        // Auto-dismiss after 30 seconds
        setTimeout(() => {
            if (banner.parentElement) {
                banner.style.transition = 'opacity 0.5s';
                banner.style.opacity = '0';
                setTimeout(() => banner.remove(), 500);
            }
        }, 30000);
    }
})();
