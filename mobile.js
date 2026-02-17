// mobile.js — ReaderWrangler Mobile Viewer
// MOBILE_VERSION tracks mobile-specific iterations
const MOBILE_VERSION = '0.1.0-alpha.1';
console.log(`✅ Mobile viewer ${MOBILE_VERSION} | APP_VERSION: ${APP_VERSION}`);

const { useState, useEffect } = React;

function MobileApp() {
    const [books, setBooks] = useState([]);
    const [folders, setFolders] = useState([]);
    const [tagRegistry, setTagRegistry] = useState({});
    const [hiddenInstances, setHiddenInstances] = useState(new Set());
    const [coverUrlMap, setCoverUrlMap] = useState({});
    const [loading, setLoading] = useState(true);
    const [themePreference, setThemePreference] = useState(
        () => localStorage.getItem(THEME_KEY) || 'auto'
    );

    const applyTheme = (pref) => {
        setThemePreference(pref);
        localStorage.setItem(THEME_KEY, pref);
        let effective = pref;
        if (pref === 'auto') {
            effective = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
        }
        if (effective === 'light') {
            delete document.documentElement.dataset.theme;
        } else {
            document.documentElement.dataset.theme = effective;
        }
    };

    useEffect(() => {
        const loadData = async () => {
            try {
                // Load books from IndexedDB
                const loadedBooks = await loadBooksFromIndexedDB();
                setBooks(loadedBooks);

                // Load folders from localStorage
                const savedFolders = JSON.parse(localStorage.getItem(FOLDERS_KEY) || '[]');
                setFolders(savedFolders);

                // Load organization data (tagRegistry, hiddenInstances)
                const orgState = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
                const org = orgState.organization || {};
                setTagRegistry(org.tagRegistry || {});
                setHiddenInstances(new Set(org.hiddenInstances || []));

                // Build cover URL map from cache, then background-populate missing covers
                if (loadedBooks.length > 0) {
                    const urlMap = await buildCoverUrlMap(loadedBooks);
                    setCoverUrlMap(urlMap);
                    populateCoverCache(loadedBooks); // fire-and-forget
                }

                console.log(`✅ Mobile loaded: ${loadedBooks.length} books, ${savedFolders.length} folders`);
            } catch (err) {
                console.error('❌ Mobile data load failed:', err);
            } finally {
                setLoading(false);
            }
        };
        loadData();
    }, []);

    if (loading) {
        return null; // Splash screen (already in HTML) stays visible
    }

    const hasBooks = books.length > 0;

    return (
        <div className="min-h-screen" style={{ background: 'var(--bg-page, #ffffff)', color: 'var(--text-primary, #1e293b)' }}>
            {/* Placeholder — replaced by real UI in Phase 2+ */}
            <div className="flex flex-col items-center justify-center min-h-screen px-6 text-center">
                <img src="icons/logo-transparent.png" alt="" className="w-20 h-20 mb-4" />
                <h1 style={{ fontFamily: "'Libre Baskerville', Georgia, serif" }}
                    className="text-2xl font-bold mb-2">
                    ReaderWrangler&#8482;
                </h1>
                <p style={{ color: 'var(--text-muted, #64748b)' }} className="text-sm mb-6">
                    Mobile Viewer v{MOBILE_VERSION}
                </p>

                {hasBooks ? (
                    <div>
                        <p className="text-base mb-1">
                            {books.length.toLocaleString()} books · {folders.length} folders · {Object.keys(tagRegistry).length} tags
                        </p>
                        <p className="text-xs mt-3" style={{ color: 'var(--text-muted, #64748b)' }}>
                            Full mobile UI coming in Phase 2
                        </p>
                    </div>
                ) : (
                    <div>
                        <p className="text-lg mb-2">No books yet</p>
                        <p className="text-sm" style={{ color: 'var(--text-muted, #64748b)' }}>
                            Import a backup from the desktop app to get started.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}

ReactDOM.render(<MobileApp />, document.getElementById('root'));
