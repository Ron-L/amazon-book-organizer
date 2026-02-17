// mobile.js — ReaderWrangler Mobile Viewer
// MOBILE_VERSION tracks mobile-specific iterations
const MOBILE_VERSION = '0.1.0-alpha.2';
console.log(`✅ Mobile viewer ${MOBILE_VERSION} | APP_VERSION: ${APP_VERSION}`);

const { useState, useEffect } = React;

// --- Backup import helpers ---

function mapBackupBook(item) {
    return {
        id: item.asin,
        asin: item.asin,
        title: item.title || '',
        author: item.authors || '',
        coverUrl: item.coverUrl || '',
        rating: item.rating || 0,
        reviewCount: item.reviewCount || '',
        series: item.series || '',
        seriesPosition: item.seriesPosition || '',
        acquired: item.acquisitionDate || '',
        dateAdded: item.dateAdded || item.acquisitionDate || '',
        description: item.description || '',
        binding: item.binding || '',
        currentPrice: item.currentPrice,
        listPrice: item.listPrice,
        priceAsOf: item.priceAsOf || '',
        targetPrice: item.targetPrice,
        priceTrigger: item.priceTrigger,
        genres: item.genres || [],
        genresAsOf: item.genresAsOf || '',
        tags: item.tags || [],
        userNote: item.note || '',
        myRating: item.myRating || 0,
        onWishlist: item.onWishlist || false,
        ownershipType: item.ownershipType || 'purchased',
        isHidden: item.isHidden || false,
        addedToWishlist: item.addedToWishlist || '',
        topReviews: item.topReviews || [],
        userEdited: item.userEdited || {}
    };
}

function restoreOrganization(org, bookIds) {
    if (!org) return;

    // Restore folders with orphan cleanup
    let folders = org.folders || [];
    const validIds = new Set(bookIds);

    // Ensure __inbox__ exists
    if (!folders.some(f => f.id === '__inbox__')) {
        folders.push({ id: '__inbox__', name: 'Inbox', bookIds: [], parentId: null });
    }

    // Clean orphaned bookIds
    folders = folders.map(f => ({
        id: f.id,
        name: f.name,
        bookIds: (f.bookIds || []).filter(id => validIds.has(id)),
        parentId: f.parentId,
        collapsed: f.collapsed,
        childFolderIds: f.childFolderIds
    }));

    localStorage.setItem(FOLDERS_KEY, JSON.stringify(folders));

    // Restore full organization state
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
        organization: {
            folders: folders,
            tagRegistry: org.tagRegistry || {},
            hiddenInstances: org.hiddenInstances || [],
            blankImageBooks: org.blankImageBooks || [],
            dataSource: 'enriched'
        },
        lastSyncTime: Date.now(),
        savedAt: Date.now()
    }));

    return folders;
}

// --- Main app ---

function MobileApp() {
    const [books, setBooks] = useState([]);
    const [folders, setFolders] = useState([]);
    const [tagRegistry, setTagRegistry] = useState({});
    const [hiddenInstances, setHiddenInstances] = useState(new Set());
    const [coverUrlMap, setCoverUrlMap] = useState({});
    const [loading, setLoading] = useState(true);
    const [importing, setImporting] = useState(false);
    const [error, setError] = useState(null);
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

    const loadAllData = async () => {
        const loadedBooks = await loadBooksFromIndexedDB();
        setBooks(loadedBooks);

        const savedFolders = JSON.parse(localStorage.getItem(FOLDERS_KEY) || '[]');
        setFolders(savedFolders);

        const orgState = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
        const org = orgState.organization || {};
        setTagRegistry(org.tagRegistry || {});
        setHiddenInstances(new Set(org.hiddenInstances || []));

        if (loadedBooks.length > 0) {
            const urlMap = await buildCoverUrlMap(loadedBooks);
            setCoverUrlMap(urlMap);
            populateCoverCache(loadedBooks);
        }

        console.log(`✅ Mobile loaded: ${loadedBooks.length} books, ${savedFolders.length} folders`);
        return loadedBooks;
    };

    useEffect(() => {
        loadAllData()
            .catch(err => console.error('❌ Mobile data load failed:', err))
            .finally(() => setLoading(false));
    }, []);

    const handleImport = () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.onchange = async (e) => {
            const file = e.target.files[0];
            if (!file) return;

            setError(null);
            setImporting(true);

            try {
                const text = await file.text();
                let data;
                try {
                    data = JSON.parse(text);
                } catch {
                    throw new Error('File is not valid JSON.');
                }

                if (data.isBackup !== true || !data.books?.items?.length) {
                    throw new Error('Not a valid ReaderWrangler backup file.');
                }

                // Map backup fields to internal names
                const mappedBooks = data.books.items.map(mapBackupBook);

                // Write to IndexedDB (full replace, no merge)
                await saveBooksToIndexedDB(mappedBooks, false);

                // Restore organization to localStorage
                const restoredFolders = restoreOrganization(data.organization, mappedBooks.map(b => b.id));

                // Reload everything from storage
                await loadAllData();

                console.log(`✅ Import complete: ${mappedBooks.length} books`);
            } catch (err) {
                console.error('❌ Import failed:', err);
                setError(err.message || 'Import failed.');
            } finally {
                setImporting(false);
            }
        };
        input.click();
    };

    if (loading) {
        return null; // Splash screen (already in HTML) stays visible
    }

    const hasBooks = books.length > 0;

    return (
        <div className="min-h-screen" style={{ background: 'var(--bg-page, #ffffff)', color: 'var(--text-primary, #1e293b)' }}>
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
                            Full mobile UI coming in Phase 3
                        </p>
                    </div>
                ) : (
                    <div className="max-w-sm">
                        <p className="text-lg font-semibold mb-2">
                            Welcome to ReaderWrangler Mobile
                        </p>
                        <p className="text-sm mb-5" style={{ color: 'var(--text-muted, #64748b)' }}>
                            This is the mobile companion to the desktop organizer.
                        </p>

                        <div className="text-sm text-left mb-6 space-y-2">
                            <p><span className="font-semibold">1.</span> Export a backup from desktop<br />
                                <span className="text-xs" style={{ color: 'var(--text-muted, #64748b)' }}>(File &gt; Export Backup)</span>
                            </p>
                            <p><span className="font-semibold">2.</span> Transfer the file to your phone<br />
                                <span className="text-xs" style={{ color: 'var(--text-muted, #64748b)' }}>(email, cloud drive, AirDrop)</span>
                            </p>
                            <p><span className="font-semibold">3.</span> Tap Import below</p>
                        </div>

                        <button
                            onClick={handleImport}
                            disabled={importing}
                            className="w-full py-3 px-4 rounded-lg text-white font-semibold text-base"
                            style={{
                                background: importing ? 'var(--text-muted, #94a3b8)' : 'var(--bg-accent, #3b82f6)',
                                opacity: importing ? 0.7 : 1
                            }}
                        >
                            {importing ? 'Importing...' : 'Import Backup'}
                        </button>

                        {error && (
                            <p className="mt-3 text-sm" style={{ color: '#ef4444' }}>
                                {error}
                            </p>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

ReactDOM.render(<MobileApp />, document.getElementById('root'));
