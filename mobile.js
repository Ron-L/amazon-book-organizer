// mobile.js — ReaderWrangler Mobile Viewer
// MOBILE_VERSION tracks mobile-specific iterations
const MOBILE_VERSION = '0.1.0-alpha.15';
console.log(`✅ Mobile viewer ${MOBILE_VERSION} | APP_VERSION: ${APP_VERSION}`);

const { useState, useEffect, useCallback, useMemo, useRef } = React;

const MOBILE_PREFS_KEY = 'readerwrangler-mobile-prefs';
const SHELF_LIMIT = 20;

// Inject mobile-only styles (hidden scrollbar for shelf containers, folder tile theme colors)
if (!document.getElementById('mobile-styles')) {
    const style = document.createElement('style');
    style.id = 'mobile-styles';
    style.textContent = [
        '.shelf-scroll::-webkit-scrollbar { display: none }',
        'body { overflow: auto !important; }',
        ':root { --folder-tile-bg: #fffbeb; --folder-tile-border: #fde68a; --cover-border: none; }',
        '[data-theme="dark"] { --folder-tile-bg: #422006; --folder-tile-border: #a16207; --cover-border: 1px solid rgba(255,255,255,0.1); }',
        '[data-theme="hc-light"] { --folder-tile-bg: #fffbeb; --folder-tile-border: #d97706; --cover-border: none; }',
        '[data-theme="hc-dark"] { --folder-tile-bg: #451a03; --folder-tile-border: #b45309; --cover-border: 1px solid rgba(255,255,255,0.15); }'
    ].join('\n');
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
        userEdited: item.userEdited || {},
        collections: item.collections || []
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
const IconBack = () => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="15 18 9 12 15 6" />
    </svg>
);
const IconFolderLarge = () => (
    <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
    </svg>
);

// --- Star rating system ---

const STAR_PATH = 'M12 2l3.09 6.26L22 9.27l-5 4.87L18.18 22 12 18.27 5.82 22 7 14.14 2 9.27l6.91-1.01L12 2z';

const StarDefs = () => (
    <svg width="0" height="0" style={{ position: 'absolute' }}>
        <defs>
            <clipPath id="m-star-clip-left"><rect x="0" y="0" width="12" height="24" /></clipPath>
            <clipPath id="m-star-clip-right"><rect x="12" y="0" width="12" height="24" /></clipPath>
        </defs>
    </svg>
);

const StarSVG = ({ type = 'full', size = 16, color = 'var(--star-color, #eab308)' }) => {
    const emptyColor = 'var(--border-strong, #cbd5e1)';
    if (type === 'half') {
        return (
            <svg width={size} height={size} viewBox="0 0 24 24" style={{ display: 'inline-block', verticalAlign: 'middle' }}>
                <path d={STAR_PATH} fill={color} clipPath="url(#m-star-clip-left)" />
                <path d={STAR_PATH} fill="none" stroke={emptyColor} strokeWidth="1.5" clipPath="url(#m-star-clip-right)" />
                <path d={STAR_PATH} fill="none" stroke={color} strokeWidth="0.5" clipPath="url(#m-star-clip-left)" />
            </svg>
        );
    }
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" style={{ display: 'inline-block', verticalAlign: 'middle' }}>
            <path d={STAR_PATH}
                fill={type === 'full' ? color : 'none'}
                stroke={type === 'full' ? color : emptyColor}
                strokeWidth={type === 'full' ? '0.5' : '1.5'}
            />
        </svg>
    );
};

const renderStars = (rating, { size = 16, color = 'var(--star-color, #eab308)' } = {}) => {
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;
    const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);
    return (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '1px' }}>
            {Array.from({ length: fullStars }, (_, i) => <StarSVG key={`f${i}`} type="full" size={size} color={color} />)}
            {hasHalfStar && <StarSVG key="h" type="half" size={size} color={color} />}
            {Array.from({ length: emptyStars }, (_, i) => <StarSVG key={`e${i}`} type="empty" size={size} color={color} />)}
        </span>
    );
};

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

function formatDate(dateStr) {
    if (!dateStr) return '';
    const d = parseBookDate(dateStr);
    if (d.getTime() === 0) return String(dateStr);
    return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

function buildBreadcrumb(folderId, folders) {
    const parts = [];
    let currentId = folderId;
    while (currentId) {
        const folder = folders.find(f => f.id === currentId);
        if (!folder) break;
        parts.unshift(folder.name);
        currentId = folder.parentId;
    }
    if (parts.length > 2) return '… > ' + parts.slice(-2).join(' > ');
    return parts.join(' > ') || 'Library';
}

// Collect all bookIds from a folder and all its descendant subfolders
function collectDescendantBookIds(folderId, folders) {
    const ids = [];
    const folder = folders.find(f => f.id === folderId);
    if (!folder) return ids;
    ids.push(...(folder.bookIds || []));
    const children = folders.filter(f => f.parentId === folderId);
    for (const child of children) {
        ids.push(...collectDescendantBookIds(child.id, folders));
    }
    return ids;
}

// --- Sub-components ---

function DetailRow({ label, children }) {
    return (
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', marginBottom: '10px', fontSize: '14px' }}>
            <span style={{ fontWeight: 600, color: 'var(--text-secondary, #475569)', minWidth: '80px', flexShrink: 0 }}>
                {label}:
            </span>
            <span style={{ color: 'var(--text-primary, #1e293b)', flex: 1 }}>
                {children}
            </span>
        </div>
    );
}

function ReviewCard({ review }) {
    const stars = review.stars || 0;
    const title = review.title || '';
    const text = review.text || '';
    const reviewer = review.reviewer || '';
    return (
        <div style={{ padding: '12px', borderRadius: '8px', marginBottom: '10px',
            backgroundColor: 'var(--bg-surface-alt, #f8fafc)',
            border: '1px solid var(--border-default, #e2e8f0)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                <span style={{ color: 'var(--star-color, #eab308)', fontSize: '13px' }}>
                    {'★'.repeat(Math.min(stars, 5))}{'☆'.repeat(Math.max(0, 5 - stars))}
                </span>
                {title && <span style={{ fontWeight: 600, fontSize: '13px', color: 'var(--text-primary)' }}>{title}</span>}
            </div>
            {reviewer && <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px' }}>by {reviewer}</p>}
            {text && <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>{text}</p>}
        </div>
    );
}

function FolderTile({ folder, onTap }) {
    const count = (folder.bookIds || []).length;
    return (
        <div onClick={onTap} style={{ width: '100%', touchAction: 'manipulation', cursor: 'pointer' }}>
            <div style={{
                aspectRatio: '2/3', borderRadius: '4px', overflow: 'hidden',
                backgroundColor: 'var(--folder-tile-bg, #fffbeb)',
                border: '2px solid var(--folder-tile-border, #fde68a)',
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center',
                padding: '8px', gap: '4px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.08)',
                containerType: 'inline-size'
            }}>
                <span style={{ fontSize: '50cqw', lineHeight: 1 }}>📁</span>
                <span style={{
                    fontSize: '12px', fontWeight: 600, textAlign: 'center',
                    color: 'var(--text-primary, #1e293b)',
                    display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
                    overflow: 'hidden', lineHeight: 1.3
                }}>
                    {folder.name}
                </span>
                <span style={{ fontSize: '11px', color: 'var(--text-muted, #94a3b8)' }}>({count})</span>
            </div>
        </div>
    );
}

// --- Header component ---

function Header({ currentNav, navStack, folders, books, onGoBack, onToggleDrawer, onToggleMenu }) {
    const isDashboard = currentNav.view === 'dashboard';

    // Determine center text
    let centerText = 'ReaderWrangler';
    if (currentNav.view === 'folder') {
        centerText = buildBreadcrumb(currentNav.folderId, folders);
    } else if (currentNav.view === 'detail') {
        const prev = navStack.length >= 2 ? navStack[navStack.length - 2] : null;
        if (prev && prev.view === 'folder') {
            const f = folders.find(fl => fl.id === prev.folderId);
            centerText = f ? f.name : 'Library';
        } else {
            centerText = 'Library';
        }
    }

    return (
        <div className="fixed top-0 left-0 right-0 flex items-center justify-between px-3 z-40"
            style={{
                height: '48px',
                background: 'var(--bg-surface, #ffffff)',
                borderBottom: '1px solid var(--border-default, #e2e8f0)',
                color: 'var(--text-primary, #1e293b)'
            }}>
            {isDashboard ? (
                <button onClick={onToggleDrawer} className="p-2 -ml-1" style={{ touchAction: 'manipulation' }}>
                    <IconHamburger />
                </button>
            ) : (
                <button onClick={onGoBack} className="p-2 -ml-1" style={{ touchAction: 'manipulation' }}>
                    <IconBack />
                </button>
            )}
            <span className="truncate" style={{
                fontFamily: isDashboard ? "'Libre Baskerville', Georgia, serif" : 'var(--font-body)',
                fontSize: isDashboard ? '16px' : '15px',
                fontWeight: isDashboard ? 700 : 600,
                flex: 1, textAlign: 'center', padding: '0 8px'
            }}>
                {centerText}
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

function CoverCard({ book, coverUrlMap, blankImageBooks, setBlankImageBooks, onTap, fillWidth }) {
    const isBlank = blankImageBooks.has(book.id);
    const imgSrc = coverUrlMap[book.coverUrl] || book.coverUrl;

    return (
        <div onClick={() => onTap && onTap(book.id)}
            style={{ width: fillWidth ? '100%' : '105px', flexShrink: 0, touchAction: 'manipulation', cursor: onTap ? 'pointer' : 'default' }}>
            <div style={{
                aspectRatio: '2/3',
                borderRadius: '4px',
                overflow: 'hidden',
                boxShadow: 'var(--shadow-card, 0 4px 6px -1px rgba(0,0,0,0.1))',
                border: 'var(--cover-border, none)'
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

function Shelf({ title, count, books, coverUrlMap, blankImageBooks, setBlankImageBooks, onTapTitle, onTapBook }) {
    if (books.length === 0) return null;

    return (
        <div style={{ marginBottom: '24px' }}>
            <div className="flex items-center justify-between"
                onClick={onTapTitle}
                style={{ padding: '0 16px', marginBottom: '8px', cursor: onTapTitle ? 'pointer' : 'default', touchAction: 'manipulation' }}>
                <span style={{
                    fontFamily: 'var(--font-heading)',
                    fontSize: '15px', fontWeight: 700,
                    color: 'var(--text-primary, #1e293b)'
                }}>
                    {title}
                    {onTapTitle && <span style={{ marginLeft: '6px', fontSize: '12px', color: 'var(--text-muted)' }}>›</span>}
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
                        onTap={onTapBook}
                    />
                ))}
            </div>
        </div>
    );
}

// --- Dashboard component ---

function Dashboard({ books, folders, showDealsOnly, showHidden, coverUrlMap, blankImageBooks, setBlankImageBooks, onTapBook, onTapFolderTitle }) {
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
            result.push({ title: 'Recently Added', count: filteredBooks.length, books: recentBooks, folderId: null });
        }

        // Folder shelves (one per top-level folder, preserving desktop manual order)
        const topLevelFolders = folders
            .filter(f => !f.parentId);

        for (const folder of topLevelFolders) {
            const allBookIds = collectDescendantBookIds(folder.id, folders);
            const folderBooks = allBookIds
                .filter(id => filteredBookIds.has(id))
                .map(id => bookMap[id])
                .filter(Boolean);

            if (folderBooks.length > 0) {
                result.push({ title: folder.name, count: folderBooks.length, books: folderBooks.slice(0, SHELF_LIMIT), folderId: folder.id });
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
                    onTapTitle={shelf.folderId ? () => onTapFolderTitle(shelf.folderId) : null}
                    onTapBook={onTapBook}
                />
            ))}
        </div>
    );
}

// --- FolderView component ---

function FolderView({ folderId, books, folders, showDealsOnly, showHidden,
                      coverUrlMap, blankImageBooks, setBlankImageBooks, onTapBook, onTapSubfolder }) {
    const folder = folders.find(f => f.id === folderId);

    const subfolders = useMemo(() => {
        return folders.filter(f => f.parentId === folderId).sort((a, b) => a.name.localeCompare(b.name));
    }, [folders, folderId]);

    const folderBooks = useMemo(() => {
        if (!folder) return [];
        const bookIds = new Set(folder.bookIds || []);
        return filterBooks(books, { showDealsOnly, showHidden }).filter(b => bookIds.has(b.id));
    }, [folder, books, showDealsOnly, showHidden]);

    if (!folder) {
        return <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>Folder not found</div>;
    }

    return (
        <div style={{ padding: '12px 16px 24px' }}>
            {subfolders.length > 0 && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, 105px)', gap: '16px 12px', justifyContent: 'center', marginBottom: '16px' }}>
                    {subfolders.map(sub => (
                        <FolderTile key={sub.id} folder={sub} onTap={() => onTapSubfolder(sub.id)} />
                    ))}
                </div>
            )}

            {folderBooks.length > 0 ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, 105px)', gap: '16px 12px', justifyContent: 'center' }}>
                    {folderBooks.map(book => (
                        <CoverCard
                            key={book.id} book={book}
                            coverUrlMap={coverUrlMap} blankImageBooks={blankImageBooks}
                            setBlankImageBooks={setBlankImageBooks}
                            onTap={onTapBook}
                        />
                    ))}
                </div>
            ) : (
                <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>
                    No books in this folder.
                </div>
            )}

            <div style={{
                padding: '10px 16px', fontSize: '13px', textAlign: 'center', marginTop: '16px',
                color: 'var(--text-secondary, #475569)',
                borderTop: '1px solid var(--border-default, #e2e8f0)'
            }}>
                {folderBooks.length} book{folderBooks.length !== 1 ? 's' : ''}
                {subfolders.length > 0 && ` · ${subfolders.length} subfolder${subfolders.length !== 1 ? 's' : ''}`}
            </div>
        </div>
    );
}

// --- BookDetailView component ---

function BookDetailView({ bookId, books, coverUrlMap, blankImageBooks, setBlankImageBooks, tagRegistry }) {
    const book = books.find(b => b.id === bookId);
    if (!book) {
        return <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>Book not found</div>;
    }

    const imgSrc = coverUrlMap[book.coverUrl] || book.coverUrl;
    const isBlank = blankImageBooks.has(book.id);

    return (
        <div style={{ padding: '16px 16px 32px' }}>
            <StarDefs />

            {/* Large cover */}
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '20px' }}>
                {isBlank || !book.coverUrl ? (
                    <div style={{
                        width: '180px', aspectRatio: '2/3', borderRadius: '6px',
                        backgroundColor: 'var(--bg-book-placeholder, #d4c5a9)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
                    }}>
                        <div style={{ textAlign: 'center', fontFamily: 'var(--font-heading)',
                            fontWeight: 700, fontSize: '14px', lineHeight: 1.3, color: 'var(--text-primary)' }}>
                            {book.title}
                        </div>
                    </div>
                ) : (
                    <img src={imgSrc} alt="" loading="lazy"
                        style={{ width: '180px', aspectRatio: '2/3', objectFit: 'cover',
                            borderRadius: '6px', boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}
                        onError={() => setBlankImageBooks(prev => new Set([...prev, book.id]))}
                        onLoad={(e) => checkIfBlankImage(e.target, book.id, setBlankImageBooks)}
                    />
                )}
            </div>

            {/* Title & Author */}
            <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '20px', fontWeight: 700,
                color: 'var(--text-primary)', textAlign: 'center', marginBottom: '4px', lineHeight: 1.3 }}>
                {book.title}
            </h2>
            <p style={{ fontSize: '16px', color: 'var(--text-secondary)', textAlign: 'center', marginBottom: '16px' }}>
                by {book.author}
            </p>

            {/* Wishlist badge */}
            {book.onWishlist && (
                <div style={{ textAlign: 'center', marginBottom: '12px' }}>
                    <span style={{ display: 'inline-block', padding: '4px 12px', borderRadius: '999px',
                        fontSize: '12px', fontWeight: 600,
                        backgroundColor: 'var(--bg-selected, #dbeafe)', color: 'var(--text-accent, #2563eb)' }}>
                        Wishlist Item
                    </span>
                </div>
            )}

            <div style={{ borderTop: '1px solid var(--border-default)', margin: '0 0 16px' }} />

            {/* Rating */}
            {book.rating > 0 && (
                <DetailRow label="Rating">
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                        {renderStars(book.rating)}
                        <span style={{ fontWeight: 700, fontSize: '14px' }}>{book.rating.toFixed(1)}</span>
                        {book.reviewCount && (
                            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>({book.reviewCount})</span>
                        )}
                    </span>
                </DetailRow>
            )}

            {/* My Rating */}
            {book.myRating > 0 && (
                <DetailRow label="My Rating">
                    {renderStars(book.myRating, { color: 'var(--border-focus, #3b82f6)' })}
                </DetailRow>
            )}

            {/* Series */}
            {book.series && (
                <DetailRow label="Series">
                    <span style={{ color: 'var(--text-series, #6366f1)' }}>
                        {book.seriesPosition ? `Book ${book.seriesPosition}: ${book.series}` : book.series}
                    </span>
                </DetailRow>
            )}

            {/* Format */}
            {book.binding && <DetailRow label="Format">{book.binding}</DetailRow>}

            {/* Acquired */}
            {book.acquired && <DetailRow label="Acquired">{formatDate(book.acquired)}</DetailRow>}

            {/* Tags */}
            {book.tags && book.tags.length > 0 && (
                <DetailRow label="Tags">
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                        {book.tags.map(tagId => (
                            <span key={tagId} style={{
                                padding: '2px 10px', borderRadius: '999px', fontSize: '12px', fontWeight: 600,
                                backgroundColor: 'var(--bg-selected, #dbeafe)', color: 'var(--text-accent, #1e40af)'
                            }}>
                                {tagRegistry[tagId]?.label || tagId}
                            </span>
                        ))}
                    </div>
                </DetailRow>
            )}

            {/* Collections */}
            {book.collections && book.collections.length > 0 && (
                <DetailRow label="Collections">{book.collections.map(c => c.name).join(', ')}</DetailRow>
            )}

            {/* Notes */}
            {book.userNote && (
                <div style={{ margin: '16px 0', padding: '12px', borderRadius: '8px',
                    backgroundColor: 'var(--bg-surface-alt, #f8fafc)',
                    border: '1px solid var(--border-default, #e2e8f0)' }}>
                    <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)',
                        display: 'block', marginBottom: '6px' }}>Notes</span>
                    <p style={{ fontSize: '14px', color: 'var(--text-primary)', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
                        {book.userNote}
                    </p>
                </div>
            )}

            {/* Price */}
            {(book.currentPrice != null || book.priceTrigger != null) && (
                <div style={{ borderTop: '1px solid var(--border-default)', paddingTop: '12px', marginTop: '12px' }}>
                    {book.currentPrice != null && (
                        <DetailRow label="Price">
                            <span style={{ fontWeight: 700,
                                color: (book.priceTrigger != null && book.currentPrice <= book.priceTrigger)
                                    ? 'var(--text-success, #16a34a)' : 'var(--text-primary)' }}>
                                ${book.currentPrice.toFixed(2)}
                            </span>
                            {book.listPrice && book.listPrice > book.currentPrice && (
                                <span style={{ fontSize: '12px', color: 'var(--text-muted)', marginLeft: '8px' }}>
                                    <span style={{ textDecoration: 'line-through' }}>${book.listPrice.toFixed(2)}</span>
                                </span>
                            )}
                        </DetailRow>
                    )}
                    {book.priceTrigger != null && (
                        <DetailRow label="Goal">
                            <span style={{ color: 'var(--text-success, #16a34a)' }}>
                                ${book.priceTrigger.toFixed(2)} or less
                            </span>
                        </DetailRow>
                    )}
                </div>
            )}

            {/* Description */}
            {book.description && (
                <div style={{ borderTop: '1px solid var(--border-default)', paddingTop: '16px', marginTop: '16px' }}>
                    <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '8px' }}>
                        Description
                    </h3>
                    <p style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                        {book.description}
                    </p>
                </div>
            )}

            {/* Top Reviews */}
            {book.topReviews && book.topReviews.length > 0 && (
                <div style={{ borderTop: '1px solid var(--border-default)', paddingTop: '16px', marginTop: '16px' }}>
                    <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '12px' }}>
                        Top Reviews
                    </h3>
                    {book.topReviews.slice(0, 3).map((review, idx) => (
                        <ReviewCard key={idx} review={review} />
                    ))}
                </div>
            )}
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
    const [navStack, setNavStack] = useState([{ view: 'dashboard', scrollY: 0 }]);
    const scrollRestoreRef = useRef(null);

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

    // Navigation
    const currentNav = navStack[navStack.length - 1];

    const navigateTo = useCallback((view, params = {}) => {
        const shelfScrolls = Array.from(document.querySelectorAll('.shelf-scroll')).map(el => el.scrollLeft);
        const scrollY = window.scrollY || document.documentElement.scrollTop || 0;
        setNavStack(prev => {
            const updated = [...prev];
            updated[updated.length - 1] = { ...updated[updated.length - 1], scrollY, shelfScrolls };
            return [...updated, { view, scrollY: 0, ...params }];
        });
        window.scrollTo(0, 0);
    }, []);

    const goBack = useCallback(() => {
        setNavStack(prev => {
            if (prev.length <= 1) return prev;
            const newStack = prev.slice(0, -1);
            const target = newStack[newStack.length - 1];
            scrollRestoreRef.current = {
                scrollY: target.scrollY || 0,
                shelfScrolls: target.shelfScrolls || []
            };
            return newStack;
        });
    }, []);

    // Browser back button support
    useEffect(() => {
        if (navStack.length > 1) {
            window.history.pushState({ depth: navStack.length }, '');
        }
    }, [navStack.length]);

    useEffect(() => {
        const handlePopState = () => {
            if (navStack.length > 1) goBack();
        };
        window.addEventListener('popstate', handlePopState);
        return () => window.removeEventListener('popstate', handlePopState);
    }, [navStack.length, goBack]);

    // Restore scroll position after view re-renders on goBack
    useEffect(() => {
        const restore = scrollRestoreRef.current;
        if (!restore) return;
        scrollRestoreRef.current = null;
        requestAnimationFrame(() => {
            window.scrollTo(0, restore.scrollY);
            const shelves = document.querySelectorAll('.shelf-scroll');
            restore.shelfScrolls.forEach((left, i) => {
                if (shelves[i]) shelves[i].scrollLeft = left;
            });
        });
    });

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
        if (folderId === '__all__') {
            setNavStack([{ view: 'dashboard', scrollY: 0 }]);
        } else {
            navigateTo('folder', { folderId });
        }
        closeOverlay();
    };

    if (loading) {
        return null;
    }

    const hasBooks = books.length > 0;

    return (
        <div className="min-h-screen" style={{ background: 'var(--bg-page, #ffffff)', color: 'var(--text-primary, #1e293b)' }}>
            {/* Header */}
            <Header
                currentNav={currentNav} navStack={navStack} folders={folders} books={books}
                onGoBack={goBack} onToggleDrawer={toggleDrawer} onToggleMenu={toggleMenu}
            />

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
                {!hasBooks ? (
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
                ) : currentNav.view === 'folder' ? (
                    <FolderView
                        folderId={currentNav.folderId}
                        books={books} folders={folders}
                        showDealsOnly={showDealsOnly} showHidden={showHidden}
                        coverUrlMap={coverUrlMap} blankImageBooks={blankImageBooks}
                        setBlankImageBooks={setBlankImageBooks}
                        onTapBook={(bookId) => navigateTo('detail', { bookId })}
                        onTapSubfolder={(folderId) => navigateTo('folder', { folderId })}
                    />
                ) : currentNav.view === 'detail' ? (
                    <BookDetailView
                        bookId={currentNav.bookId}
                        books={books}
                        coverUrlMap={coverUrlMap} blankImageBooks={blankImageBooks}
                        setBlankImageBooks={setBlankImageBooks}
                        tagRegistry={tagRegistry}
                    />
                ) : (
                    <Dashboard
                        books={books} folders={folders}
                        showDealsOnly={showDealsOnly} showHidden={showHidden}
                        coverUrlMap={coverUrlMap} blankImageBooks={blankImageBooks}
                        setBlankImageBooks={setBlankImageBooks}
                        onTapBook={(bookId) => navigateTo('detail', { bookId })}
                        onTapFolderTitle={(folderId) => navigateTo('folder', { folderId })}
                    />
                )}
            </div>
        </div>
    );
}

ReactDOM.render(<MobileApp />, document.getElementById('root'));
