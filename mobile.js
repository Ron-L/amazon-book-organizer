// mobile.js — ReaderWrangler Mobile Viewer
// MOBILE_VERSION tracks mobile-specific iterations
const MOBILE_VERSION = '0.1.0-alpha.5';
console.log(`✅ Mobile viewer ${MOBILE_VERSION} | APP_VERSION: ${APP_VERSION}`);

const { useState, useEffect, useCallback, useMemo } = React;

const MOBILE_PREFS_KEY = 'readerwrangler-mobile-prefs';
const SHELF_LIMIT = 20;

// Inject mobile-only styles (hidden scrollbar for shelf containers)
if (!document.getElementById('mobile-styles')) {
    const style = document.createElement('style');
    style.id = 'mobile-styles';
    style.textContent = '.shelf-scroll::-webkit-scrollbar { display: none }';
    document.head.appendChild(style);
}

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

    let folders = org.folders || [];
    const validIds = new Set(bookIds);

    if (!folders.some(f => f.id === '__inbox__')) {
        folders.push({ id: '__inbox__', name: 'Inbox', bookIds: [], parentId: null });
    }

    folders = folders.map(f => ({
        id: f.id,
        name: f.name,
        bookIds: (f.bookIds || []).filter(id => validIds.has(id)),
        parentId: f.parentId,
        collapsed: f.collapsed,
        childFolderIds: f.childFolderIds
    }));

    localStorage.setItem(FOLDERS_KEY, JSON.stringify(folders));
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

// --- SVG Icons (inline, no external deps) ---

const IconHamburger = () => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" />
    </svg>
);
const IconSearch = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
);
const IconDots = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
        <circle cx="12" cy="5" r="2" /><circle cx="12" cy="12" r="2" /><circle cx="12" cy="19" r="2" />
    </svg>
);
const IconClose = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
    </svg>
);
const IconFolder = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
    </svg>
);
const IconCheck = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="20 6 9 17 4 12" />
    </svg>
);

// --- Helper functions ---

function parseBookDate(dateStr) {
    if (!dateStr) return new Date(0);
    const ts = typeof dateStr === 'string' ? parseInt(dateStr) : dateStr;
    if (!isNaN(ts) && ts > 1000000000) {
        return new Date(ts > 9999999999 ? ts : ts * 1000);
    }
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? new Date(0) : d;
}

function filterBooks(books, { showDealsOnly, showHidden }) {
    return books.filter(book => {
        if (!showHidden && book.isHidden) return false;
        if (showDealsOnly) {
            if (book.priceTrigger == null || book.currentPrice == null) return false;
            if (book.currentPrice > book.priceTrigger) return false;
        }
        return true;
    });
}

function checkIfBlankImage(img, bookId, setBlankImageBooks) {
    if (img.naturalWidth < 10 || img.naturalHeight < 10) {
        setBlankImageBooks(prev => new Set([...prev, bookId]));
    }
}

// --- Header component ---

function Header({ onToggleDrawer, onToggleMenu }) {
    return (
        <div className="fixed top-0 left-0 right-0 flex items-center justify-between px-3 z-40"
            style={{
                height: '48px',
                background: 'var(--bg-surface, #ffffff)',
                borderBottom: '1px solid var(--border-default, #e2e8f0)',
                color: 'var(--text-primary, #1e293b)'
            }}>
            <button onClick={onToggleDrawer} className="p-2 -ml-1" style={{ touchAction: 'manipulation' }}>
                <IconHamburger />
            </button>
            <span style={{ fontFamily: "'Libre Baskerville', Georgia, serif", fontSize: '16px', fontWeight: 700 }}>
                ReaderWrangler
            </span>
            <div className="flex items-center gap-1">
                <button className="p-2 opacity-40" disabled style={{ touchAction: 'manipulation' }}>
                    <IconSearch />
                </button>
                <button onClick={onToggleMenu} className="p-2 -mr-1" style={{ touchAction: 'manipulation' }}>
                    <IconDots />
                </button>
            </div>
        </div>
    );
}

// --- Backdrop ---

function Backdrop({ onClick }) {
    return (
        <div onClick={onClick} className="fixed inset-0 z-40"
            style={{ background: 'rgba(0,0,0,0.4)' }} />
    );
}

// --- Folder Drawer ---

function FolderDrawer({ folders, books, onSelectFolder, onClose }) {
    // Build tree: top-level folders (parentId === null) with children
    const topLevel = folders.filter(f => !f.parentId);
    const childrenOf = (parentId) => folders.filter(f => f.parentId === parentId);

    const renderFolder = (folder, depth = 0) => {
        const count = (folder.bookIds || []).length;
        const children = childrenOf(folder.id);
        return (
            <div key={folder.id}>
                <button
                    onClick={() => onSelectFolder(folder.id)}
                    className="w-full text-left py-2 px-3 flex items-center gap-2 text-sm"
                    style={{
                        paddingLeft: `${12 + depth * 16}px`,
                        color: 'var(--text-primary, #1e293b)',
                        touchAction: 'manipulation'
                    }}
                >
                    <IconFolder />
                    <span className="flex-1 truncate">{folder.name}</span>
                    <span className="text-xs" style={{ color: 'var(--text-muted, #64748b)' }}>({count})</span>
                </button>
                {children.map(child => renderFolder(child, depth + 1))}
            </div>
        );
    };

    return (
        <div className="fixed top-0 left-0 h-full z-50 flex flex-col overflow-y-auto"
            style={{
                width: '250px',
                background: 'var(--bg-surface, #ffffff)',
                borderRight: '1px solid var(--border-default, #e2e8f0)',
                color: 'var(--text-primary, #1e293b)'
            }}>
            {/* Drawer header — entire row tappable to close */}
            <div onClick={onClose} className="flex items-center justify-between px-3 flex-shrink-0"
                style={{ height: '48px', borderBottom: '1px solid var(--border-default, #e2e8f0)', cursor: 'pointer', touchAction: 'manipulation' }}>
                <span className="font-semibold text-sm">Folders</span>
                <span className="p-2"><IconClose /></span>
            </div>

            {/* All Books virtual folder */}
            <button
                onClick={() => onSelectFolder('__all__')}
                className="w-full text-left py-2 px-3 flex items-center gap-2 text-sm"
                style={{
                    paddingLeft: '12px',
                    color: 'var(--text-primary, #1e293b)',
                    borderBottom: '1px solid var(--border-default, #e2e8f0)',
                    touchAction: 'manipulation'
                }}
            >
                <IconFolder />
                <span className="flex-1">All Books</span>
                <span className="text-xs" style={{ color: 'var(--text-muted, #64748b)' }}>({books.length})</span>
            </button>

            {/* Folder tree */}
            <div className="py-1">
                {topLevel.length > 0 ? (
                    topLevel.map(f => renderFolder(f))
                ) : (
                    <p className="px-3 py-4 text-xs" style={{ color: 'var(--text-muted, #64748b)' }}>
                        No folders yet. Import a backup to see your folder tree.
                    </p>
                )}
            </div>
        </div>
    );
}

// --- App Menu ---

function AppMenu({ themePreference, viewMode, showDealsOnly, showHidden, onApplyTheme, onToggleViewMode, onToggleDeals, onToggleHidden, onDesktopMode, onImport, onClose }) {
    const themeLabels = { auto: 'Auto', light: 'Light', dark: 'Dark' };
    const nextTheme = { auto: 'light', light: 'dark', dark: 'auto' };

    return (
        <div className="fixed top-0 right-0 h-full z-50 flex flex-col overflow-y-auto"
            style={{
                width: '250px',
                background: 'var(--bg-surface, #ffffff)',
                borderLeft: '1px solid var(--border-default, #e2e8f0)',
                color: 'var(--text-primary, #1e293b)'
            }}>
            {/* Menu header — entire row tappable to close */}
            <div onClick={onClose} className="flex items-center justify-between px-3 flex-shrink-0"
                style={{ height: '48px', borderBottom: '1px solid var(--border-default, #e2e8f0)', cursor: 'pointer', touchAction: 'manipulation' }}>
                <span className="font-semibold text-sm">Menu</span>
                <span className="p-2"><IconClose /></span>
            </div>

            <div className="py-1">
                {/* Import Backup */}
                <button onClick={() => { onClose(); onImport(); }}
                    className="w-full text-left py-3 px-4 text-sm"
                    style={{ touchAction: 'manipulation' }}>
                    Import Backup
                </button>

                {/* Separator */}
                <div style={{ borderTop: '1px solid var(--border-default, #e2e8f0)', margin: '4px 12px' }} />

                {/* View toggle */}
                <button onClick={onToggleViewMode}
                    className="w-full text-left py-3 px-4 text-sm flex items-center justify-between"
                    style={{ touchAction: 'manipulation' }}>
                    <span>View</span>
                    <span className="text-xs" style={{ color: 'var(--text-muted, #64748b)' }}>
                        {viewMode === 'covers' ? 'Covers' : 'List'}
                    </span>
                </button>

                {/* Theme */}
                <button onClick={() => onApplyTheme(nextTheme[themePreference] || 'auto')}
                    className="w-full text-left py-3 px-4 text-sm flex items-center justify-between"
                    style={{ touchAction: 'manipulation' }}>
                    <span>Theme</span>
                    <span className="text-xs" style={{ color: 'var(--text-muted, #64748b)' }}>
                        {themeLabels[themePreference] || 'Auto'}
                    </span>
                </button>

                {/* Deals Only */}
                <button onClick={onToggleDeals}
                    className="w-full text-left py-3 px-4 text-sm flex items-center justify-between"
                    style={{ touchAction: 'manipulation' }}>
                    <span>Deals Only</span>
                    {showDealsOnly && <IconCheck />}
                </button>

                {/* Show Hidden */}
                <button onClick={onToggleHidden}
                    className="w-full text-left py-3 px-4 text-sm flex items-center justify-between"
                    style={{ touchAction: 'manipulation' }}>
                    <span>Show Hidden</span>
                    {showHidden && <IconCheck />}
                </button>

                {/* Desktop Mode */}
                <button onClick={onDesktopMode}
                    className="w-full text-left py-3 px-4 text-sm"
                    style={{ touchAction: 'manipulation' }}>
                    Desktop Mode
                </button>

                {/* Separator */}
                <div style={{ borderTop: '1px solid var(--border-default, #e2e8f0)', margin: '4px 12px' }} />

                {/* Help & About */}
                <div className="py-3 px-4 text-xs" style={{ color: 'var(--text-muted, #64748b)' }}>
                    <p className="font-semibold mb-1" style={{ color: 'var(--text-primary, #1e293b)' }}>Help &amp; About</p>
                    <p>App v{APP_VERSION}</p>
                    <p>Mobile v{MOBILE_VERSION}</p>
                </div>
            </div>
        </div>
    );
}

// --- CoverCard component ---

function CoverCard({ book, coverUrlMap, blankImageBooks, setBlankImageBooks }) {
    const isBlank = blankImageBooks.has(book.id);
    const imgSrc = coverUrlMap[book.coverUrl] || book.coverUrl;

    return (
        <div style={{ width: '105px', flexShrink: 0, touchAction: 'manipulation' }}>
            <div style={{
                aspectRatio: '2/3',
                borderRadius: '4px',
                overflow: 'hidden',
                boxShadow: 'var(--shadow-card, 0 4px 6px -1px rgba(0,0,0,0.1))'
            }}>
                {isBlank || !book.coverUrl ? (
                    <div style={{
                        width: '100%', height: '100%',
                        backgroundColor: 'var(--bg-book-placeholder, #d4c5a9)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        padding: '8px'
                    }}>
                        <div style={{
                            textAlign: 'center',
                            fontFamily: 'var(--font-heading)',
                            fontWeight: 700,
                            fontSize: '0.6em',
                            lineHeight: 1.2,
                            color: 'var(--text-primary, #1e293b)',
                            overflow: 'hidden',
                            display: '-webkit-box',
                            WebkitLineClamp: 4,
                            WebkitBoxOrient: 'vertical'
                        }}>
                            {book.title}
                        </div>
                    </div>
                ) : (
                    <img
                        src={imgSrc}
                        alt=""
                        loading="lazy"
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        onError={() => setBlankImageBooks(prev => new Set([...prev, book.id]))}
                        onLoad={(e) => checkIfBlankImage(e.target, book.id, setBlankImageBooks)}
                    />
                )}
            </div>
            <div className="truncate" style={{
                marginTop: '4px', fontSize: '12px', fontWeight: 600,
                lineHeight: 1.3, color: 'var(--text-primary, #1e293b)'
            }}>
                {book.title}
            </div>
            <div className="truncate" style={{
                fontSize: '11px', lineHeight: 1.3,
                color: 'var(--text-secondary, #475569)'
            }}>
                {book.author}
            </div>
        </div>
    );
}

// --- Shelf component ---

function Shelf({ title, count, books, coverUrlMap, blankImageBooks, setBlankImageBooks }) {
    if (books.length === 0) return null;

    return (
        <div style={{ marginBottom: '24px' }}>
            <div className="flex items-center justify-between" style={{ padding: '0 16px', marginBottom: '8px' }}>
                <span style={{
                    fontFamily: 'var(--font-heading)',
                    fontSize: '15px', fontWeight: 700,
                    color: 'var(--text-primary, #1e293b)'
                }}>
                    {title}
                </span>
                <span style={{ fontSize: '13px', color: 'var(--text-muted, #94a3b8)' }}>
                    ({count})
                </span>
            </div>
            <div className="shelf-scroll" style={{
                display: 'flex', gap: '12px',
                overflowX: 'auto',
                paddingLeft: '16px', paddingRight: '16px', paddingBottom: '4px',
                WebkitOverflowScrolling: 'touch',
                scrollbarWidth: 'none',
                msOverflowStyle: 'none'
            }}>
                {books.map(book => (
                    <CoverCard
                        key={book.id}
                        book={book}
                        coverUrlMap={coverUrlMap}
                        blankImageBooks={blankImageBooks}
                        setBlankImageBooks={setBlankImageBooks}
                    />
                ))}
            </div>
        </div>
    );
}

// --- Dashboard component ---

function Dashboard({ books, folders, showDealsOnly, showHidden, coverUrlMap, blankImageBooks, setBlankImageBooks }) {
    const filteredBooks = useMemo(() => {
        return filterBooks(books, { showDealsOnly, showHidden });
    }, [books, showDealsOnly, showHidden]);

    const bookMap = useMemo(() => {
        const map = {};
        for (const book of filteredBooks) map[book.id] = book;
        return map;
    }, [filteredBooks]);

    const filteredBookIds = useMemo(() => {
        return new Set(filteredBooks.map(b => b.id));
    }, [filteredBooks]);

    const shelves = useMemo(() => {
        const result = [];

        // Recently Added shelf
        const recentBooks = [...filteredBooks]
            .sort((a, b) => parseBookDate(b.acquired || b.dateAdded) - parseBookDate(a.acquired || a.dateAdded))
            .slice(0, SHELF_LIMIT);

        if (recentBooks.length > 0) {
            result.push({ title: 'Recently Added', count: filteredBooks.length, books: recentBooks });
        }

        // Folder shelves (one per top-level folder, alphabetical)
        const topLevelFolders = folders
            .filter(f => !f.parentId)
            .sort((a, b) => a.name.localeCompare(b.name));

        for (const folder of topLevelFolders) {
            const folderBooks = (folder.bookIds || [])
                .filter(id => filteredBookIds.has(id))
                .map(id => bookMap[id])
                .filter(Boolean);

            if (folderBooks.length > 0) {
                result.push({ title: folder.name, count: folderBooks.length, books: folderBooks.slice(0, SHELF_LIMIT) });
            }
        }

        return result;
    }, [filteredBooks, filteredBookIds, bookMap, folders]);

    if (shelves.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center px-6 text-center"
                 style={{ minHeight: 'calc(100vh - 48px)' }}>
                <p className="text-sm" style={{ color: 'var(--text-muted, #94a3b8)' }}>
                    No books match the current filters.
                </p>
            </div>
        );
    }

    return (
        <div style={{ paddingTop: '12px', paddingBottom: '24px' }}>
            {shelves.map((shelf, i) => (
                <Shelf
                    key={shelf.title + '-' + i}
                    title={shelf.title}
                    count={shelf.count}
                    books={shelf.books}
                    coverUrlMap={coverUrlMap}
                    blankImageBooks={blankImageBooks}
                    setBlankImageBooks={setBlankImageBooks}
                />
            ))}
        </div>
    );
}

// --- Main app ---

function MobileApp() {
    const [books, setBooks] = useState([]);
    const [folders, setFolders] = useState([]);
    const [tagRegistry, setTagRegistry] = useState({});
    const [hiddenInstances, setHiddenInstances] = useState(new Set());
    const [coverUrlMap, setCoverUrlMap] = useState({});
    const [blankImageBooks, setBlankImageBooks] = useState(new Set());
    const [loading, setLoading] = useState(true);
    const [importing, setImporting] = useState(false);
    const [error, setError] = useState(null);
    const [activeOverlay, setActiveOverlay] = useState(null);
    const [selectedFolderId, setSelectedFolderId] = useState(null);

    // Persisted preferences
    const savedPrefs = JSON.parse(localStorage.getItem(MOBILE_PREFS_KEY) || '{}');
    const [themePreference, setThemePreference] = useState(
        () => localStorage.getItem(THEME_KEY) || 'auto'
    );
    const [viewMode, setViewMode] = useState(savedPrefs.viewMode || 'covers');
    const [showDealsOnly, setShowDealsOnly] = useState(savedPrefs.showDealsOnly || false);
    const [showHidden, setShowHidden] = useState(savedPrefs.showHidden || false);

    const savePrefs = (updates) => {
        const current = JSON.parse(localStorage.getItem(MOBILE_PREFS_KEY) || '{}');
        localStorage.setItem(MOBILE_PREFS_KEY, JSON.stringify({ ...current, ...updates }));
    };

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
        setBlankImageBooks(new Set(org.blankImageBooks || []));

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

                const mappedBooks = data.books.items.map(mapBackupBook);
                await saveBooksToIndexedDB(mappedBooks, false);
                restoreOrganization(data.organization, mappedBooks.map(b => b.id));
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

    // Overlay handlers
    const toggleDrawer = () => setActiveOverlay(prev => prev === 'drawer' ? null : 'drawer');
    const toggleMenu = () => setActiveOverlay(prev => prev === 'menu' ? null : 'menu');
    const closeOverlay = () => setActiveOverlay(null);

    // Menu action handlers
    const handleToggleViewMode = () => {
        const next = viewMode === 'covers' ? 'list' : 'covers';
        setViewMode(next);
        savePrefs({ viewMode: next });
    };
    const handleToggleDeals = () => {
        const next = !showDealsOnly;
        setShowDealsOnly(next);
        savePrefs({ showDealsOnly: next });
    };
    const handleToggleHidden = () => {
        const next = !showHidden;
        setShowHidden(next);
        savePrefs({ showHidden: next });
    };
    const handleDesktopMode = () => {
        localStorage.setItem('readerwrangler-desktopMode', 'true');
        location.reload();
    };
    const handleSelectFolder = (folderId) => {
        setSelectedFolderId(folderId);
        closeOverlay();
    };

    if (loading) {
        return null;
    }

    const hasBooks = books.length > 0;

    return (
        <div className="min-h-screen" style={{ background: 'var(--bg-page, #ffffff)', color: 'var(--text-primary, #1e293b)' }}>
            {/* Header */}
            <Header onToggleDrawer={toggleDrawer} onToggleMenu={toggleMenu} />

            {/* Backdrop */}
            {activeOverlay && <Backdrop onClick={closeOverlay} />}

            {/* Folder Drawer */}
            {activeOverlay === 'drawer' && (
                <FolderDrawer
                    folders={folders}
                    books={books}
                    onSelectFolder={handleSelectFolder}
                    onClose={closeOverlay}
                />
            )}

            {/* App Menu */}
            {activeOverlay === 'menu' && (
                <AppMenu
                    themePreference={themePreference}
                    viewMode={viewMode}
                    showDealsOnly={showDealsOnly}
                    showHidden={showHidden}
                    onApplyTheme={applyTheme}
                    onToggleViewMode={handleToggleViewMode}
                    onToggleDeals={handleToggleDeals}
                    onToggleHidden={handleToggleHidden}
                    onDesktopMode={handleDesktopMode}
                    onImport={handleImport}
                    onClose={closeOverlay}
                />
            )}

            {/* Content area (below fixed header) */}
            <div style={{ paddingTop: '48px' }}>
                {hasBooks ? (
                    <Dashboard
                        books={books}
                        folders={folders}
                        showDealsOnly={showDealsOnly}
                        showHidden={showHidden}
                        coverUrlMap={coverUrlMap}
                        blankImageBooks={blankImageBooks}
                        setBlankImageBooks={setBlankImageBooks}
                    />
                ) : (
                    <div className="flex flex-col items-center justify-center px-6 text-center" style={{ minHeight: 'calc(100vh - 48px)' }}>
                        <img src="icons/logo-transparent.png" alt="" className="w-20 h-20 mb-4" />
                        <p className="text-lg font-semibold mb-2">
                            Welcome to ReaderWrangler Mobile
                        </p>
                        <p className="text-sm mb-5" style={{ color: 'var(--text-muted, #64748b)' }}>
                            This is the mobile companion to the desktop organizer.
                        </p>

                        <div className="text-sm text-left mb-6 space-y-2 max-w-sm">
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
                            className="w-full max-w-sm py-3 px-4 rounded-lg text-white font-semibold text-base"
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
