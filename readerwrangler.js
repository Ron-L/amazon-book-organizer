        // ARCHITECTURE: See docs/design/ARCHITECTURE.md for Version Management, Status Icons, Cache-Busting patterns
        const { useState, useEffect, useRef } = React;
        const APP_VERSION = "4.15.6";  // Release version shown to users
        const ORGANIZER_VERSION = "4.15.6";  // Build version for this file
        document.title = "ReaderWrangler";
        const STORAGE_KEY = "readerwrangler-state";
        const CACHE_KEY = "readerwrangler-enriched-cache";
        const SETTINGS_KEY = "readerwrangler-settings";
        const STATUS_KEY = "readerwrangler-status"; // v3.7.0.n - persist library/collections status
        const FILTERS_KEY = "readerwrangler-filters"; // v3.8.0.f - persist filter state
        const DB_NAME = "ReaderWranglerDB";
        const DB_VERSION = 1;
        const BOOKS_STORE = "books";
        // MANIFEST_CHECK_INTERVAL removed in v3.6.1 - replaced with IndexedDB manifests

        // Amazon Associates affiliate tag (v4.4.0)
        const AMAZON_AFFILIATE_TAG = 'rclewent-20';

        // Build Amazon URL with affiliate tag (v4.4.0)
        const getAmazonUrl = (asin) => `https://www.amazon.com/dp/${asin}?tag=${AMAZON_AFFILIATE_TAG}`;

        // IndexedDB Helper Functions
        const openDB = () => {
            return new Promise((resolve, reject) => {
                const request = indexedDB.open(DB_NAME, DB_VERSION);
                
                request.onerror = () => reject(request.error);
                request.onsuccess = () => resolve(request.result);
                
                request.onupgradeneeded = (event) => {
                    const db = event.target.result;
                    if (!db.objectStoreNames.contains(BOOKS_STORE)) {
                        db.createObjectStore(BOOKS_STORE, { keyPath: 'id' });
                    }
                };
            });
        };
        
        const saveBooksToIndexedDB = async (books) => {
            try {
                console.log(`🔄 Saving ${books.length} books to IndexedDB...`);

                // Deduplicate by ASIN (owned books take priority over wishlist)
                const booksByAsin = new Map();
                const duplicates = [];

                for (const book of books) {
                    const existing = booksByAsin.get(book.asin);
                    if (existing) {
                        duplicates.push(book.asin);
                        // Owned books (isWishlist falsy) take priority over wishlist
                        if (existing.isWishlist && !book.isWishlist) {
                            // New book is owned, replace wishlist entry
                            // Preserve addedToWishlist from the wishlist entry
                            booksByAsin.set(book.asin, {
                                ...book,
                                addedToWishlist: existing.addedToWishlist
                            });
                        } else if (!existing.isWishlist && book.isWishlist) {
                            // Existing is owned, new is wishlist - keep existing
                            // but preserve addedToWishlist if new book has it
                            if (book.addedToWishlist && !existing.addedToWishlist) {
                                booksByAsin.set(book.asin, {
                                    ...existing,
                                    addedToWishlist: book.addedToWishlist
                                });
                            }
                            // else keep existing as-is
                        }
                        // If both same ownership status, keep first occurrence (existing)
                    } else {
                        booksByAsin.set(book.asin, book);
                    }
                }

                const uniqueBooks = Array.from(booksByAsin.values());

                if (duplicates.length > 0) {
                    console.warn(`⚠️  Found ${duplicates.length} duplicate ASINs, owned books take priority`);
                    console.warn(`   Sample duplicates:`, duplicates.slice(0, 5));
                }

                const db = await openDB();

                // First transaction: Clear existing books
                await new Promise((resolve, reject) => {
                    const clearTxn = db.transaction([BOOKS_STORE], 'readwrite');
                    const clearStore = clearTxn.objectStore(BOOKS_STORE);
                    clearStore.clear();
                    clearTxn.oncomplete = () => {
                        console.log('✅ Cleared existing IndexedDB books');
                        resolve();
                    };
                    clearTxn.onerror = () => reject(clearTxn.error || new Error('Failed to clear IndexedDB'));
                });

                // Second transaction: Add all unique books
                return new Promise((resolve, reject) => {
                    const addTxn = db.transaction([BOOKS_STORE], 'readwrite');
                    const addStore = addTxn.objectStore(BOOKS_STORE);

                    // Add all unique books
                    for (const book of uniqueBooks) {
                        addStore.add(book);
                    }

                    addTxn.oncomplete = () => {
                        console.log('✅ Saved', uniqueBooks.length, 'unique books to IndexedDB');
                        resolve();
                    };
                    addTxn.onerror = () => {
                        const error = addTxn.error || new Error('IndexedDB transaction failed with no error details');
                        console.error('❌ IndexedDB save failed:', error);
                        reject(error);
                    };
                });
            } catch (error) {
                console.error('❌ IndexedDB save exception:', error);
                throw error || new Error('IndexedDB save failed');
            }
        };
        
        const loadBooksFromIndexedDB = async () => {
            const db = await openDB();
            const transaction = db.transaction([BOOKS_STORE], 'readonly');
            const store = transaction.objectStore(BOOKS_STORE);
            const request = store.getAll();
            
            return new Promise((resolve, reject) => {
                request.onsuccess = () => {
                    console.log('✅ Loaded', request.result.length, 'books from IndexedDB');
                    resolve(request.result);
                };
                request.onerror = () => reject(request.error);
            });
        };
        
        const clearIndexedDB = async () => {
            const db = await openDB();
            const transaction = db.transaction([BOOKS_STORE], 'readwrite');
            const store = transaction.objectStore(BOOKS_STORE);
            await store.clear();
            console.log('✅ Cleared IndexedDB');
        };


        // Calculate freshness status from fetchDate
        const calculateFreshness = (fetchDate) => {
            if (!fetchDate) return 'unknown';

            const now = new Date();
            const fetchTime = new Date(fetchDate);
            const daysSinceFetch = (now - fetchTime) / (1000 * 60 * 60 * 24);

            if (daysSinceFetch < 7) return 'fresh';
            if (daysSinceFetch <= 30) return 'stale';
            return 'obsolete';
        };

        // ===== Cover Image Caching (v4.13.0) =====
        const COVER_CACHE_NAME = 'rw-covers';

        // Build URL map from cached covers (synchronous lookup after async init)
        const buildCoverUrlMap = async (books) => {
            const startTime = performance.now();
            const urlMap = {};
            try {
                const cache = await caches.open(COVER_CACHE_NAME);
                for (const book of books) {
                    if (book.coverUrl) {
                        const cached = await cache.match(book.coverUrl);
                        if (cached) {
                            const blob = await cached.blob();
                            urlMap[book.coverUrl] = URL.createObjectURL(blob);
                        }
                    }
                }
                const elapsed = ((performance.now() - startTime) / 1000).toFixed(2);
                console.log(`📷 Cover cache: ${Object.keys(urlMap).length}/${books.length} covers loaded from cache in ${elapsed}s`);
            } catch (e) {
                console.error('Cover cache read failed:', e);
            }
            return urlMap;
        };

        // Populate cache in background (non-blocking) with parallel fetching
        const populateCoverCache = async (books) => {
            const CONCURRENCY = 20; // Number of parallel fetches
            const startTime = performance.now();
            try {
                const cache = await caches.open(COVER_CACHE_NAME);
                let cached = 0, fetched = 0, failed = 0;

                // First pass: identify uncached books
                const uncachedBooks = [];
                for (const book of books) {
                    if (!book.coverUrl) continue;
                    const existing = await cache.match(book.coverUrl);
                    if (existing) {
                        cached++;
                    } else {
                        uncachedBooks.push(book);
                    }
                }

                // Second pass: fetch uncached in parallel batches
                for (let i = 0; i < uncachedBooks.length; i += CONCURRENCY) {
                    const batch = uncachedBooks.slice(i, i + CONCURRENCY);
                    const results = await Promise.allSettled(
                        batch.map(async (book) => {
                            const response = await fetch(book.coverUrl);
                            if (response.ok) {
                                await cache.put(book.coverUrl, response);
                                return 'fetched';
                            }
                            return 'failed';
                        })
                    );
                    results.forEach(r => {
                        if (r.status === 'fulfilled' && r.value === 'fetched') fetched++;
                        else failed++;
                    });
                }

                const elapsed = ((performance.now() - startTime) / 1000).toFixed(2);
                console.log(`📷 Cover cache populated: ${cached} already cached, ${fetched} newly fetched, ${failed} failed in ${elapsed}s`);
            } catch (e) {
                console.error('Cover cache population failed:', e);
            }
        };

        // Format relative time for display
        const formatRelativeTime = (dateString) => {
            if (!dateString) return 'Unknown';

            const now = new Date();
            const date = new Date(dateString);
            const diffMs = now - date;
            const diffMins = Math.floor(diffMs / (1000 * 60));
            const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
            const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

            if (diffMins < 60) return `${diffMins}m ago`;
            if (diffHours < 24) return `${diffHours}h ago`;
            if (diffDays === 1) return 'Yesterday';
            if (diffDays < 7) return `${diffDays}d ago`;
            if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
            return `${diffDays}d ago`;
        };

        function ReaderWrangler() {
            const [books, setBooks] = useState([]);
            const [columns, setColumns] = useState([{ id: 'unorganized', name: 'Unorganized', books: [] }]);
            const [searchTerm, setSearchTerm] = useState('');
            const [draggedBook, setDraggedBook] = useState(null);
            const [draggedFromColumn, setDraggedFromColumn] = useState(null);
            const [draggedColumn, setDraggedColumn] = useState(null);
            const [columnDropTarget, setColumnDropTarget] = useState(null);
            const [modalBook, setModalBook] = useState(null);
            const [modalColumnId, setModalColumnId] = useState(null);
            const [dragStartPos, setDragStartPos] = useState({ x: 0, y: 0 });
            const [dragCurrentPos, setDragCurrentPos] = useState({ x: 0, y: 0 });
            const [isDragging, setIsDragging] = useState(false);
            const [isDraggingColumn, setIsDraggingColumn] = useState(false);
            // v3.14.0.w - dropTarget moved to ref (dropTargetRef) to avoid React re-renders
            const [dataSource, setDataSource] = useState('none');
            const [blankImageBooks, setBlankImageBooks] = useState(new Set());
            const [editingColumn, setEditingColumn] = useState(null);
            const [editingName, setEditingName] = useState('');
            const [sortMenuOpen, setSortMenuOpen] = useState(null);
            const [columnMenuOpen, setColumnMenuOpen] = useState(null); // v3.11.0 - Unified column dropdown menu
            const [editingDivider, setEditingDivider] = useState(null); // v3.11.0 - {columnId, dividerId}
            const [editingDividerLabel, setEditingDividerLabel] = useState(''); // v3.11.0
            const [insertDividerOpen, setInsertDividerOpen] = useState(null); // v3.11.0 - columnId for Insert Divider modal
            const [newDividerLabel, setNewDividerLabel] = useState(''); // v3.11.0
            const [hoveringDivider, setHoveringDivider] = useState(null); // v3.11.0 - {columnId, dividerId}
            const [helpOpen, setHelpOpen] = useState(false);
            const [settingsOpen, setSettingsOpen] = useState(false);
            const [deleteDialogOpen, setDeleteDialogOpen] = useState(null);
            const [deleteDestination, setDeleteDestination] = useState('');
            const [showAllReviews, setShowAllReviews] = useState(false);
            const [collectSeriesOpen, setCollectSeriesOpen] = useState(false);
            const [seriesBooks, setSeriesBooks] = useState({ current: [], other: [] });
            const [syncStatus, setSyncStatusInternal] = useState('loading'); // 'loading', 'fresh', 'stale', 'none', 'unknown'
            const [lastSyncTime, setLastSyncTime] = useState(null);
            // manifestData state removed in v3.7.0.m - replaced by libraryStatus/collectionsStatus
            const [statusModalOpen, setStatusModalOpen] = useState(false);
            const [resetConfirmOpen, setResetConfirmOpen] = useState(false);
            const [collectionsData, setCollectionsData] = useState(null); // Map of ASIN -> {readStatus, collections[]}
            const [collectionFilter, setCollectionFilter] = useState(''); // Filter by collection name or special values
            const [selectedBooks, setSelectedBooks] = useState(new Set()); // Multi-select state
            const [lastClickedBook, setLastClickedBook] = useState(null); // For shift+click range selection
            // v4.8.0 - Undo/Redo state
            const [undoStack, setUndoStack] = useState([]); // Array of action records
            const [redoStack, setRedoStack] = useState([]); // Array of action records
            const undoStackRef = useRef(undoStack); // Ref to avoid stale closure in keyboard handler
            const redoStackRef = useRef(redoStack);
            const [selectedDivider, setSelectedDivider] = useState(null); // v3.13.0 - Selected divider {columnId, dividerId}
            const [activeColumnId, setActiveColumnId] = useState(null); // Track which column has focus for Ctrl+A
            const [contextMenu, setContextMenu] = useState(null); // {x, y, bookId, columnId}
            const [readStatusFilter, setReadStatusFilter] = useState(''); // Filter by READ/UNREAD/UNKNOWN
            const [ratingFilter, setRatingFilter] = useState(''); // Filter by minimum rating (NEW v3.8.0)
            const [wishlistFilter, setWishlistFilter] = useState(''); // Filter by wishlist status: '' | 'owned' | 'wishlist' (NEW v3.8.0)
            const [ownershipFilter, setOwnershipFilter] = useState(''); // Filter by ownership type (NEW v4.9.0)
            const [seriesFilter, setSeriesFilter] = useState(''); // Filter by series name or "NOT_IN_SERIES" (NEW v3.8.0.k)
            const [dateFrom, setDateFrom] = useState(''); // Filter by acquisition date from (YYYY-MM-DD) (NEW v3.8.0.k)
            const [dateTo, setDateTo] = useState(''); // Filter by acquisition date to (YYYY-MM-DD) (NEW v3.8.0.k)
            const [datePreset, setDatePreset] = useState(''); // Date filter preset: '' | 'last30' | 'last90' | 'lastYear' | '2025' | '2024' | '2023' | 'custom' (NEW v4.15.6)
            const [filterPanelOpen, setFilterPanelOpen] = useState(false); // Collapsible filter panel state (NEW v3.8.0)
            const [showAdvancedFilters, setShowAdvancedFilters] = useState(false); // Show advanced filters section (NEW v4.14.0.a, v4.14.0.b - no persistence, resets when panel closes)
            const [showHidden, setShowHidden] = useState(false); // Show hidden books toggle (NEW v4.1.0.d)
            const [, forceUpdate] = useState({});
            const [coverUrlMap, setCoverUrlMap] = useState({}); // Cover image cache URL map (v4.13.0)

            // v3.11.0.d - Ref for column menu click-outside detection
            const columnMenuRef = useRef(null);

            // v3.14.0.h - Track previous dropTarget for debug logging
            const prevDropTargetRef = useRef(null);

            // v3.14.0.w - Use refs instead of state for dropTarget to avoid React re-renders
            const dropTargetRef = useRef(null);
            const indicatorRef = useRef(null);

            // v3.14.0.x - Use refs for ghost position to eliminate ALL React re-renders during drag
            const dragGhostRef = useRef(null);
            const dragPosRef = useRef({ x: 0, y: 0 });

            // v3.14.0.r - Row-based grid index for O(log R) drop position lookup
            // Structure: { columnId: { rowBoundaries: [y1, y2, ...], rows: [{type, startIndex, items, top, bottom}, ...], columnRect } }
            const columnIndexRef = useRef({});

            // v4.0.1 - Ref to hold current filteredBooks function for Ctrl+A handler
            const filteredBooksRef = useRef(null);

            // v3.12.0 - Auto-scroll during drag
            const [autoScrollInterval, setAutoScrollInterval] = useState(null);

            // Status bar state (v3.9.0 - Load-state-only, 4 states)
            const [libraryStatus, setLibraryStatus] = useState({
                loadStatus: 'empty',     // empty, fresh, stale, obsolete
                loadDate: null           // ISO date string from loaded JSON metadata.fetchDate
            });
            const [collectionsStatus, setCollectionsStatus] = useState({
                loadStatus: 'empty',
                loadDate: null
            });

            // Wrapper for setSyncStatus
            const setSyncStatus = (newStatus) => {
                setSyncStatusInternal(newStatus);
            };
            const [settings, setSettings] = useState({
                cacheExpirationDays: 30
            });
            const dragThreshold = 50;

            // v4.15.6: Track initial mount to prevent save effect from overwriting loaded values
            const filtersLoadedRef = useRef(false);

            // Load saved filters from localStorage on mount (v3.8.0.f, updated v3.8.0.k, v4.15.6)
            React.useEffect(() => {
                try {
                    const savedFilters = localStorage.getItem(FILTERS_KEY);
                    if (savedFilters) {
                        const filters = JSON.parse(savedFilters);
                        if (filters.searchTerm !== undefined) setSearchTerm(filters.searchTerm);
                        if (filters.readStatusFilter !== undefined) setReadStatusFilter(filters.readStatusFilter);
                        if (filters.collectionFilter !== undefined) setCollectionFilter(filters.collectionFilter);
                        if (filters.ratingFilter !== undefined) setRatingFilter(filters.ratingFilter);
                        if (filters.wishlistFilter !== undefined) setWishlistFilter(filters.wishlistFilter);
                        if (filters.ownershipFilter !== undefined) setOwnershipFilter(filters.ownershipFilter);
                        if (filters.seriesFilter !== undefined) setSeriesFilter(filters.seriesFilter);
                        if (filters.showHidden !== undefined) setShowHidden(filters.showHidden);

                        // v4.15.6: Load datePreset, with migration from old dateFrom/dateTo format
                        if (filters.datePreset) {
                            // New format: datePreset controls the filter
                            setDatePreset(filters.datePreset);
                            if (filters.datePreset === 'custom') {
                                // Custom preset: also restore the manual dates
                                if (filters.dateFrom) setDateFrom(filters.dateFrom);
                                if (filters.dateTo) setDateTo(filters.dateTo);
                            }
                            // For non-custom presets, the useEffect will compute dateFrom/dateTo
                        } else if (filters.dateFrom || filters.dateTo) {
                            // Migration: old format had dateFrom/dateTo but no datePreset
                            // Treat as custom date range
                            setDatePreset('custom');
                            if (filters.dateFrom) setDateFrom(filters.dateFrom);
                            if (filters.dateTo) setDateTo(filters.dateTo);
                        }
                    }
                } catch (e) {
                    console.error('Failed to load filters from localStorage:', e);
                }
                // v4.15.6: Mark filters as loaded after a small delay to let React batch state updates
                setTimeout(() => {
                    filtersLoadedRef.current = true;
                }, 100);
            }, []); // Empty dependency array = run once on mount

            // Save filters to localStorage whenever they change (v3.8.0.f, updated v3.8.0.k, v4.1.0.d, v4.15.6)
            React.useEffect(() => {
                // v4.15.6: Skip save during initial load to prevent overwriting
                if (!filtersLoadedRef.current) return;
                try {
                    const filters = {
                        searchTerm,
                        readStatusFilter,
                        collectionFilter,
                        ratingFilter,
                        wishlistFilter,
                        ownershipFilter,
                        seriesFilter,
                        datePreset,  // v4.15.6: Save preset instead of raw dates (except for custom)
                        dateFrom: datePreset === 'custom' ? dateFrom : '',  // Only save dates for custom preset
                        dateTo: datePreset === 'custom' ? dateTo : '',
                        showHidden
                    };
                    localStorage.setItem(FILTERS_KEY, JSON.stringify(filters));
                } catch (e) {
                    console.error('Failed to save filters to localStorage:', e);
                }
            }, [searchTerm, readStatusFilter, collectionFilter, ratingFilter, wishlistFilter, ownershipFilter, seriesFilter, datePreset, dateFrom, dateTo, showHidden]);

            // Compute dateFrom/dateTo from datePreset selection (v4.15.6)
            React.useEffect(() => {
                // Skip during initial load - the load effect will set dateFrom/dateTo directly
                if (!filtersLoadedRef.current) return;
                if (!datePreset || datePreset === 'custom') {
                    // 'custom' uses manual dateFrom/dateTo, don't override
                    // '' (All Dates) clears the date filter
                    if (datePreset === '') {
                        setDateFrom('');
                        setDateTo('');
                    }
                    return;
                }

                const today = new Date();
                const formatDate = (d) => d.toISOString().split('T')[0]; // YYYY-MM-DD

                let from = '';
                let to = formatDate(today);

                if (datePreset === 'last30') {
                    const d = new Date(today);
                    d.setDate(d.getDate() - 30);
                    from = formatDate(d);
                } else if (datePreset === 'last90') {
                    const d = new Date(today);
                    d.setDate(d.getDate() - 90);
                    from = formatDate(d);
                } else if (datePreset === 'lastYear') {
                    const d = new Date(today);
                    d.setFullYear(d.getFullYear() - 1);
                    from = formatDate(d);
                } else if (datePreset.startsWith('year')) {
                    // Year preset: yearYYYY format
                    const year = parseInt(datePreset.substring(4));
                    from = `${year}-01-01`;
                    to = `${year}-12-31`;
                }

                setDateFrom(from);
                setDateTo(to);
            }, [datePreset]);

            const formatAcquisitionDate = (timestamp) => {
                if (!timestamp) return '';
                const ts = typeof timestamp === 'string' ? parseInt(timestamp) : timestamp;
                const date = new Date(ts > 9999999999 ? ts : ts * 1000);
                if (isNaN(date.getTime())) return timestamp;
                return date.toLocaleDateString('en-US', { 
                    year: 'numeric', 
                    month: 'short', 
                    day: 'numeric' 
                });
            };

            const getRelativeTime = (timestamp) => {
                if (!timestamp) return '';
                const now = Date.now();
                const diff = now - timestamp;
                const minutes = Math.floor(diff / 60000);
                const hours = Math.floor(diff / 3600000);
                const days = Math.floor(diff / 86400000);
                
                if (minutes < 1) return 'just now';
                if (minutes < 60) return `${minutes}m ago`;
                if (hours < 24) return `${hours}h ago`;
                return `${days}d ago`;
            };

            // checkManifest function removed in v3.6.1 - replaced with IndexedDB manifests
            // Status is now computed from libraryStatus and collectionsStatus state

            // Initial load from IndexedDB
            useEffect(() => {
                const loadData = async () => {
                    try {
                        // Load settings
                        const savedSettings = localStorage.getItem(SETTINGS_KEY);
                        if (savedSettings) {
                            setSettings(JSON.parse(savedSettings));
                        }

                        // Restore libraryStatus and collectionsStatus from localStorage (v3.7.0.n)
                        const savedStatus = localStorage.getItem(STATUS_KEY);
                        if (savedStatus) {
                            const statusData = JSON.parse(savedStatus);
                            if (statusData.libraryStatus) {
                                setLibraryStatus(statusData.libraryStatus);
                                console.log('📦 Restored libraryStatus from localStorage:', statusData.libraryStatus.loadStatus);
                            }
                            if (statusData.collectionsStatus) {
                                setCollectionsStatus(statusData.collectionsStatus);
                                console.log('📦 Restored collectionsStatus from localStorage:', statusData.collectionsStatus.loadStatus);
                            }
                        }

                        // Load books from IndexedDB
                        let loadedBooks = await loadBooksFromIndexedDB();

                        // Merge collections data into loaded books
                        if (loadedBooks.length > 0) {
                            loadedBooks = await mergeCollectionsIntoBooks(loadedBooks);
                            setBooks(loadedBooks);
                            // Update IndexedDB with merged data
                            await saveBooksToIndexedDB(loadedBooks);

                            // v4.13.0: Initialize cover cache
                            // Build URL map from cache for immediate use
                            const urlMap = await buildCoverUrlMap(loadedBooks);
                            setCoverUrlMap(urlMap);
                            // Populate cache in background for uncached images
                            populateCoverCache(loadedBooks); // Don't await - runs in background
                        }

                        let effectiveLastSync = null;

                        if (loadedBooks.length > 0) {
                            
                            // Load organization from localStorage
                            const saved = localStorage.getItem(STORAGE_KEY);
                            if (saved) {
                                const state = JSON.parse(saved);
                                if (state.organization?.columns) {
                                    const restoredColumns = state.organization.columns.map(col => ({
                                        id: col.id,
                                        name: col.name,
                                        books: col.bookIds || col.books
                                    }));
                                    setColumns(restoredColumns);
                                    setBlankImageBooks(new Set(state.organization.blankImageBooks || []));
                                    setDataSource(state.organization.dataSource || 'enriched');
                                    effectiveLastSync = state.lastSyncTime || Date.now();
                                    setLastSyncTime(effectiveLastSync);
                                    console.log('✅ Restored organization from localStorage');
                                } else {
                                    // No organization saved, put all books in first column
                                    setColumns([{ id: 'unorganized', name: 'Unorganized', books: loadedBooks.map(b => b.id) }]);
                                    setDataSource('enriched');
                                    effectiveLastSync = Date.now();
                                    setLastSyncTime(effectiveLastSync);
                                }
                            } else {
                                // No saved state, put all books in first column
                                setColumns([{ id: 'unorganized', name: 'Unorganized', books: loadedBooks.map(b => b.id) }]);
                                setDataSource('enriched');
                                effectiveLastSync = Date.now();
                                setLastSyncTime(effectiveLastSync);
                            }
                        }


                        // Loading complete - set syncStatus to indicate we're done loading
                        // Actual status display now comes from libraryStatus/collectionsStatus
                        setSyncStatus('none');
                    } catch (error) {
                        console.error('Failed to load data:', error);
                        setSyncStatus('none');
                    }
                };
                
                loadData();
            }, []);

            // Auto-save organization
            useEffect(() => {
                if (books.length > 0 && columns.length > 0) {
                    try {
                        const state = {
                            organization: {
                                columns: columns.map(col => ({
                                    id: col.id,
                                    name: col.name,
                                    bookIds: col.books
                                })),
                                dataSource,
                                blankImageBooks: Array.from(blankImageBooks)
                            },
                            lastSyncTime: lastSyncTime || Date.now(),
                            savedAt: Date.now()
                        };
                        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
                    } catch (e) {
                        console.warn('Could not auto-save organization:', e);
                    }
                }
            }, [columns, blankImageBooks, dataSource, lastSyncTime]);

            useEffect(() => {
                localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
            }, [settings]);

            // Save libraryStatus and collectionsStatus to localStorage (v3.7.0.n)
            useEffect(() => {
                const statusData = { libraryStatus, collectionsStatus };
                localStorage.setItem(STATUS_KEY, JSON.stringify(statusData));
            }, [libraryStatus, collectionsStatus]);

            // Expose books to window for debugging
            useEffect(() => {
                window.books = books;
            }, [books]);

            // ESC key to clear selection, Ctrl+A to select all in active column
            useEffect(() => {
                const handleKeyDown = (e) => {
                    if (e.key === 'Escape') {
                        clearSelection();
                        setContextMenu(null);
                    }

                    // v4.8.0 - Ctrl+Z: Undo
                    if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
                        e.preventDefault();
                        undo();
                    }
                    // v4.8.0 - Ctrl+Y or Ctrl+Shift+Z: Redo
                    if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
                        e.preventDefault();
                        redo();
                    }

                    // Ctrl+A: Select all books in active column (v4.0.1 - use ref to get current filtered view)
                    if ((e.ctrlKey || e.metaKey) && e.key === 'a' && activeColumnId) {
                        e.preventDefault(); // Prevent browser's select-all
                        const column = columns.find(col => col.id === activeColumnId);
                        if (column && filteredBooksRef.current) {
                            const visibleBooks = filteredBooksRef.current(column.books);
                            // Filter out dividers - only select actual books
                            const bookIds = visibleBooks
                                .filter(item => item && !(typeof item === 'object' && item.type === 'divider'))
                                .map(book => book.id);
                            setSelectedBooks(new Set(bookIds));
                        }
                    }
                };

                window.addEventListener('keydown', handleKeyDown);
                return () => window.removeEventListener('keydown', handleKeyDown);
            }, [activeColumnId, columns]);

            // Initialize activeColumnId to first column when columns are loaded
            useEffect(() => {
                if (columns.length > 0 && !activeColumnId) {
                    setActiveColumnId(columns[0].id);
                }
            }, [columns, activeColumnId]);

            // Close context menu on click
            useEffect(() => {
                const handleClick = () => setContextMenu(null);
                if (contextMenu) {
                    window.addEventListener('click', handleClick);
                    return () => window.removeEventListener('click', handleClick);
                }
            }, [contextMenu]);

            // v3.11.0.d - Close column menu and sort submenu on ESC key
            useEffect(() => {
                const handleEsc = (e) => {
                    if (e.key === 'Escape') {
                        if (sortMenuOpen !== null) {
                            setSortMenuOpen(null);
                        } else if (columnMenuOpen !== null) {
                            setColumnMenuOpen(null);
                        }
                    }
                };
                window.addEventListener('keydown', handleEsc);
                return () => window.removeEventListener('keydown', handleEsc);
            }, [columnMenuOpen, sortMenuOpen]);

            // v3.11.0.d - Close column menu on click outside
            useEffect(() => {
                const handleClickOutside = (e) => {
                    if (columnMenuOpen !== null && columnMenuRef.current && !columnMenuRef.current.contains(e.target)) {
                        setColumnMenuOpen(null);
                        setSortMenuOpen(null);
                    }
                };
                if (columnMenuOpen !== null) {
                    document.addEventListener('mousedown', handleClickOutside);
                    return () => document.removeEventListener('mousedown', handleClickOutside);
                }
            }, [columnMenuOpen]);

            const saveSettings = (newSettings) => {
                setSettings(newSettings);
                setSettingsOpen(false);
            };

            const importLibrary = async () => {
                // Close the dialog immediately when file picker opens
                setStatusModalOpen(false);

                const input = document.createElement('input');
                input.type = 'file';
                input.accept = '.json';
                input.onchange = async (e) => {
                    const file = e.target.files[0];
                    if (file) {
                        try {
                            const text = await file.text();
                            const parsedData = JSON.parse(text);

                            // v4.0.0.b: Detect backup vs library file
                            let organizationFromFile = null;
                            if (parsedData.isBackup === true) {
                                // Backup file - prompt user before restoring
                                const confirmed = window.confirm(
                                    'Restore backup?\n\nThis will replace your current organization with the organization from the backup file.'
                                );
                                if (!confirmed) {
                                    console.log('📋 Backup restore cancelled by user');
                                    return;
                                }
                                // Extract organization from backup file
                                if (parsedData.organization) {
                                    organizationFromFile = parsedData.organization;
                                    console.log('📋 Restoring organization from backup file');
                                } else {
                                    console.log('⚠️ Backup file has no organization section - will start fresh');
                                }
                            } else {
                                // Library file - keep current organization, ignore any org in file
                                console.log('📋 Loading library file - keeping current organization');
                            }

                            const syncTime = Date.now();
                            setLastSyncTime(syncTime);

                            // Show loading status while waiting
                            setSyncStatus('loading');

                            let timeoutId;
                            let callbackFired = false;

                            // Setup timeout (60 seconds for large libraries)
                            timeoutId = setTimeout(() => {
                                if (!callbackFired) {
                                    console.error('⚠️ Status check timed out after 60 seconds');
                                    setSyncStatus('unknown');
                                    alert('Library loaded but status check timed out. Please refresh the page.');
                                }
                            }, 60000);

                            // Load data with callback (pass organization for backup restore)
                            await loadLibrary(text, () => {
                                callbackFired = true;
                                clearTimeout(timeoutId);
                                // checkManifest removed in v3.6.1 - status updated in loadLibrary
                            }, organizationFromFile);

                            new Image().src = 'https://readerwrangler.goatcounter.com/count?p=/event/file-imported';
                        } catch (error) {
                            console.error('Failed to sync:', error);
                            setSyncStatus('none'); // Clear loading spinner (v3.9.0.l)
                            if (error && error.message) {
                                console.error('Error details:', error.message, error.stack);
                                alert(`Failed to load library file: ${error.message}`);
                            } else {
                                console.error('Error details: Unknown error (null or no message)');
                                alert('Failed to load library file: Unknown error');
                            }
                        }
                    }
                };
                input.click();
            };

            const openCollectSeriesDialog = () => {
                if (!modalBook || !modalBook.series || !modalColumnId) return;
                
                const currentColumn = columns.find(c => c.id === modalColumnId);
                if (!currentColumn) return;
                
                const allSeriesBooks = books.filter(b => 
                    b.series && b.series === modalBook.series && b.id !== modalBook.id
                );
                
                const inCurrentColumn = allSeriesBooks.filter(b => 
                    currentColumn.books.includes(b.id)
                );
                
                const inOtherColumns = allSeriesBooks.filter(b => 
                    !currentColumn.books.includes(b.id)
                ).map(b => {
                    const col = columns.find(c => c.books.includes(b.id));
                    return { ...b, columnName: col?.name || 'Unknown' };
                });
                
                const sortByPosition = (a, b) => {
                    const posA = parseInt(a.seriesPosition) || 999;
                    const posB = parseInt(b.seriesPosition) || 999;
                    return posA - posB;
                };
                
                inCurrentColumn.sort(sortByPosition);
                inOtherColumns.sort(sortByPosition);
                
                setSeriesBooks({
                    current: inCurrentColumn,
                    other: inOtherColumns
                });
                
                setCollectSeriesOpen(true);
            };

            const collectSeriesBooks = (includeAllColumns) => {
                if (!modalBook || !modalColumnId) return;
                
                const targetColumn = columns.find(c => c.id === modalColumnId);
                if (!targetColumn) return;
                
                const booksToCollect = includeAllColumns 
                    ? [...seriesBooks.current, ...seriesBooks.other]
                    : seriesBooks.current;
                
                if (booksToCollect.length === 0) {
                    setCollectSeriesOpen(false);
                    return;
                }
                
                const allBooksInSeries = [modalBook, ...booksToCollect].sort((a, b) => {
                    const posA = parseInt(a.seriesPosition) || 999;
                    const posB = parseInt(b.seriesPosition) || 999;
                    return posA - posB;
                });
                
                const currentBookIndexInTarget = targetColumn.books.indexOf(modalBook.id);
                
                const newColumns = columns.map(col => {
                    if (col.id === modalColumnId) {
                        let newBooks = col.books.filter(id => 
                            !allBooksInSeries.find(b => b.id === id)
                        );
                        
                        const insertIndex = Math.min(currentBookIndexInTarget, newBooks.length);
                        newBooks.splice(insertIndex, 0, ...allBooksInSeries.map(b => b.id));
                        
                        return { ...col, books: newBooks };
                    } else if (includeAllColumns) {
                        return {
                            ...col,
                            books: col.books.filter(id => 
                                !allBooksInSeries.find(b => b.id === id)
                            )
                        };
                    }
                    return col;
                });
                
                setColumns(newColumns);
                setCollectSeriesOpen(false);
            };

            const renderStars = (rating) => {
                const fullStars = Math.floor(rating);
                const hasHalfStar = rating % 1 >= 0.5;
                const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);
                
                return (
                    <span className="text-yellow-500 text-2xl">
                        {'★'.repeat(fullStars)}
                        {hasHalfStar && '½'}
                        {'☆'.repeat(emptyStars)}
                    </span>
                );
            };

            // Schema v2.0: Export unified file with organization
            const exportLibrary = async () => {
                try {
                    const allBooks = await loadBooksFromIndexedDB();

                    // Convert app book format back to fetcher format for books.items
                    const bookItems = allBooks.map(book => ({
                        asin: book.asin,
                        isOwned: book.isWishlist ? false : true,
                        isHidden: book.isHidden || false,
                        addedToWishlist: book.addedToWishlist || '',
                        title: book.title,
                        authors: book.author,
                        coverUrl: book.coverUrl,
                        rating: book.rating,
                        reviewCount: book.ratingCount,
                        series: book.series,
                        seriesPosition: book.seriesPosition,
                        acquisitionDate: book.acquired,
                        description: book.description,
                        topReviews: book.topReviews,
                        binding: book.binding
                    }));

                    // Build collections.items from books that have collection data
                    const collectionItems = allBooks
                        .filter(book => book.collections || book.readStatus)
                        .map(book => ({
                            asin: book.asin,
                            readStatus: book.readStatus || 'UNKNOWN',
                            collections: book.collections || []
                        }));

                    // v4.0.0.b: Build v2.0 backup format with isBackup flag
                    // v4.15.1.b: Only include collections section if we have real collections data
                    const hasRealCollections = collectionsStatus.loadStatus !== 'empty' && collectionsStatus.loadDate;
                    const exportData = {
                        schemaVersion: "2.0",
                        isBackup: true,
                        books: {
                            fetchDate: libraryStatus.loadDate || new Date().toISOString(),
                            fetcherVersion: "app-export",
                            totalBooks: bookItems.length,
                            items: bookItems
                        },
                        organization: {
                            columns: columns.map(col => ({
                                id: col.id,
                                name: col.name,
                                items: col.books  // Array of book IDs and divider IDs
                            })),
                            columnOrder: columns.map(col => col.id),
                            blankImageBooks: Array.from(blankImageBooks),
                            exportDate: new Date().toISOString(),
                            appVersion: ORGANIZER_VERSION
                        }
                    };

                    // v4.15.1.b: Only add collections section if we have real data (fix 0-A bug)
                    if (hasRealCollections) {
                        exportData.collections = {
                            fetchDate: collectionsStatus.loadDate,
                            fetcherVersion: "app-export",
                            totalBooksScanned: collectionItems.length,
                            booksWithCollections: collectionItems.filter(b => b.collections.length > 0).length,
                            items: collectionItems
                        };
                    }

                    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    // v4.0.0.b: Backup filename with date
                    const dateStr = new Date().toISOString().split('T')[0];
                    a.download = `readerwrangler-backup-${dateStr}.json`;
                    a.click();
                    URL.revokeObjectURL(url);
                    console.log('✅ Backup exported (v2.0 format with organization)');
                    new Image().src = 'https://readerwrangler.goatcounter.com/count?p=/event/file-exported';
                } catch (error) {
                    console.error('Failed to export library:', error);
                    alert('Failed to export library');
                }
            };

            const clearLibrary = () => {
                setResetConfirmOpen(true);
            };

            const confirmReset = async () => {
                setResetConfirmOpen(false);
                try {
                    await clearIndexedDB();
                    localStorage.removeItem(STORAGE_KEY);
                    localStorage.removeItem(CACHE_KEY);
                    localStorage.removeItem(STATUS_KEY); // v3.7.0.n - clear saved status
                    localStorage.removeItem(FILTERS_KEY); // v3.8.0.h - clear saved filters

                    // Reset all filters (v3.8.0.h, updated v3.8.0.k, v4.1.0.d)
                    setSearchTerm('');
                    setReadStatusFilter('');
                    setCollectionFilter('');
                    setRatingFilter('');
                    setWishlistFilter('');
                    setSeriesFilter('');
                    setDateFrom('');
                    setDateTo('');
                    setShowHidden(true); // v4.8.0 - Default to showing all books on reset

                    setBooks([]);
                    setColumns([{ id: 'unorganized', name: 'Unorganized', books: [] }]);
                    setDataSource('none');
                    setBlankImageBooks(new Set());
                    setLastSyncTime(null);
                    setSyncStatus('none');
                    // Reset v3.9.0 status bar state (Load-state-only)
                    setLibraryStatus({
                        loadStatus: 'empty',
                        loadDate: null
                    });
                    setCollectionsStatus({
                        loadStatus: 'empty',
                        loadDate: null
                    });
                    console.log('✅ Cleared library - app reset to initial state');
                    new Image().src = 'https://readerwrangler.goatcounter.com/count?p=/event/app-reset';
                } catch (error) {
                    console.error('Failed to clear library:', error);
                    alert('Failed to clear library data');
                }
            };

            const handleFileUpload = async (e) => {
                const file = e.target.files[0];
                if (!file) return;
                
                const text = await file.text();
                
                if (file.name.endsWith('.json')) {
                    await loadLibrary(text);
                } else if (file.name.endsWith('.csv')) {
                    loadBooksFromCSV(text);
                }
                new Image().src = 'https://readerwrangler.goatcounter.com/count?p=/event/file-imported';
            };

            const loadBooksFromCSV = (csvContent) => {
                const lines = csvContent.split('\n');
                const parsedBooks = [];
                
                const startLine = lines[0].includes('ASIN') ? 1 : 0;
                
                for (let i = startLine; i < lines.length && parsedBooks.length < 100; i++) {
                    const line = lines[i].trim();
                    if (!line) continue;
                    
                    const parts = line.split(',');
                    let asin = parts[0]?.trim().replace(/[="']/g, '');
                    
                    if (asin && asin.length < 10 && /^[0-9]+$/.test(asin)) {
                        asin = asin.padStart(10, '0');
                    }
                    
                    if (asin && asin.length === 10) {
                        parsedBooks.push({
                            id: asin,  // Use ASIN as stable ID instead of sequential number
                            asin: asin,
                            title: parts[6] || 'Unknown',
                            author: parts[13] || 'Unknown',
                            acquired: parts[2] || '',
                            series: parts[12] || '',
                            coverUrl: `https://images-na.ssl-images-amazon.com/images/P/${asin}.01.LZZZZZZZ.jpg`,
                            hasEnrichedData: false
                        });
                    }
                }
                
                setBooks(parsedBooks);
                setColumns([{ id: 'unorganized', name: 'Unorganized', books: parsedBooks.map(b => b.id) }]);
                setDataSource('csv');
            };

            const mergeCollectionsIntoBooks = async (booksToMerge) => {
                // Only use collections data if user has loaded it via File Picker (v3.9.0)
                const collections = collectionsData;
                if (!collections) {
                    console.log('No collections data available to merge');
                    return booksToMerge;
                }

                // Merge collections into each book
                const mergedBooks = booksToMerge.map(book => {
                    const bookCollections = collections.get(book.asin) || { readStatus: 'UNKNOWN', collections: [] };
                    return {
                        ...book,
                        readStatus: bookCollections.readStatus,
                        collections: bookCollections.collections
                    };
                });

                // Log results
                const booksWithCollections = mergedBooks.filter(b => b.collections.length > 0).length;
                const readBooks = mergedBooks.filter(b => b.readStatus === 'READ').length;
                const unreadBooks = mergedBooks.filter(b => b.readStatus === 'UNREAD').length;
                console.log(`📚 Collections data merged:`);
                console.log(`   - ${booksWithCollections} books have collections`);
                console.log(`   - ${readBooks} READ, ${unreadBooks} UNREAD, ${mergedBooks.length - readBooks - unreadBooks} UNKNOWN`);

                // Show sample book with collections for verification
                const sampleBook = mergedBooks.find(b => b.collections.length > 0);
                if (sampleBook) {
                    console.log(`\n📖 Sample book with collections:`);
                    console.log(`   Title: ${sampleBook.title}`);
                    console.log(`   ASIN: ${sampleBook.asin}`);
                    console.log(`   Read Status: ${sampleBook.readStatus}`);
                    console.log(`   Collections: ${sampleBook.collections.map(c => c.name).join(', ')}`);
                }

                return mergedBooks;
            };

            const loadLibrary = async (content, onComplete = null, organizationFromFile = null) => {
                const parsedData = JSON.parse(content);

                // Check if user selected legacy collections file (v3.9.0.k)
                if (parsedData.type === 'collections') {
                    console.error('❌ Wrong file type selected');
                    console.error('   You selected an old Collections file');
                    console.error('   Please select amazon-library.json instead');
                    throw new Error('You selected an old Collections file. Please select amazon-library.json instead.');
                }

                let data;           // Array of book items
                let metadata;       // Books metadata (fetchDate, fetcherVersion, etc.)
                let collections;    // Collections map (ASIN -> {readStatus, collections})

                // Schema v2.0 - unified format with books.items and collections.items
                if (parsedData.schemaVersion === "2.0") {
                    if (!parsedData.books || !parsedData.books.items) {
                        console.error('❌ Invalid v2.0 library format');
                        console.error('   Expected: {schemaVersion: "2.0", books: {items: [...]}}');
                        console.error('   Received:', Object.keys(parsedData));
                        throw new Error('Invalid v2.0 library format - please re-fetch your library using the latest fetcher');
                    }

                    data = parsedData.books.items;
                    metadata = {
                        schemaVersion: parsedData.schemaVersion,
                        fetchDate: parsedData.books.fetchDate,
                        fetcherVersion: parsedData.books.fetcherVersion,
                        totalBooks: parsedData.books.totalBooks || data.length,
                        booksWithoutDescriptions: parsedData.books.booksWithoutDescriptions || 0
                    };

                    console.log(`📋 Loaded schema v2.0 unified file`);
                    console.log(`   Total books: ${metadata.totalBooks}`);
                    console.log(`   Books without descriptions: ${metadata.booksWithoutDescriptions}`);
                    console.log(`   Fetched: ${new Date(metadata.fetchDate).toLocaleString()}`);
                    console.log(`   Fetcher version: ${metadata.fetcherVersion}`);

                    // Extract embedded collections from v2.0 file
                    if (parsedData.collections && parsedData.collections.items) {
                        collections = new Map();
                        parsedData.collections.items.forEach(book => {
                            collections.set(book.asin, {
                                readStatus: book.readStatus,
                                collections: book.collections || []
                            });
                        });
                        console.log(`📚 Loaded embedded collections for ${collections.size} books`);
                        console.log(`   Collections fetched: ${new Date(parsedData.collections.fetchDate).toLocaleString()}`);

                        // Update collections status
                        const collectionsLoadStatus = parsedData.collections.fetchDate ? calculateFreshness(parsedData.collections.fetchDate) : 'unknown';
                        setCollectionsStatus({
                            loadStatus: collectionsLoadStatus,
                            loadDate: parsedData.collections.fetchDate || null
                        });
                        setCollectionsData(collections);
                    } else {
                        console.log('📚 No collections data in file (run Collections Fetcher to add)');
                        collections = null;
                        // Reset collections status when no collections in file (v4.15.1 - bug fix 0-A)
                        setCollectionsStatus({
                            loadStatus: 'empty',
                            loadDate: null
                        });
                    }
                }
                // Legacy v1.x format - object with metadata and books array
                else if (parsedData.metadata && parsedData.books) {
                    data = parsedData.books;
                    metadata = parsedData.metadata;

                    console.log(`📋 Loaded legacy schema ${metadata.schemaVersion}`);
                    console.log(`   Total books: ${metadata.totalBooks}`);
                    console.log(`   Books without descriptions: ${metadata.booksWithoutDescriptions}`);
                    console.log(`   Fetched: ${new Date(metadata.fetchDate).toLocaleString()}`);
                    console.log(`   Fetcher version: ${metadata.fetcherVersion}`);
                    console.log(`   ⚠️  Note: Re-run fetchers to upgrade to v2.0 format`);

                    // Legacy format - collections loaded separately (use existing collectionsData state)
                    collections = collectionsData || null;
                }
                else {
                    console.error('❌ Invalid library JSON format');
                    console.error('   Expected: v2.0 unified or legacy {metadata, books}');
                    console.error('   Received:', Object.keys(parsedData));
                    throw new Error('Invalid library JSON format - please re-fetch your library using the latest fetcher');
                }

                // Update library status from loaded JSON metadata
                const loadStatus = metadata.fetchDate ? calculateFreshness(metadata.fetchDate) : 'unknown';

                setLibraryStatus({
                    loadStatus,
                    loadDate: metadata.fetchDate || null
                });

                const extractDescription = (descData) => {
                    if (!descData?.sections?.[0]?.content) return '';
                    
                    const content = descData.sections[0].content;
                    
                    if (content.text) return content.text;
                    
                    if (content.fragments) {
                        const texts = [];
                        content.fragments.forEach(frag => {
                            if (frag.text) {
                                texts.push(frag.text);
                            } else if (frag.semanticContent?.content?.text) {
                                texts.push(frag.semanticContent.content.text);
                            } else if (frag.semanticContent?.content?.fragments) {
                                frag.semanticContent.content.fragments.forEach(subfrag => {
                                    if (subfrag.text) texts.push(subfrag.text);
                                    if (subfrag.semanticContent?.content?.text) {
                                        texts.push(subfrag.semanticContent.content.text);
                                    }
                                });
                            }
                        });
                        return texts.join(' ').trim();
                    }
                    
                    return '';
                };
                
                const processedBooks = data.map((item) => {
                    const isNewFormat = !item.amazonData;

                    // Get collections data for this book (if available)
                    const bookCollections = collections?.get(item.asin) || { readStatus: 'UNKNOWN', collections: [] };

                    if (isNewFormat) {
                        return {
                            id: item.asin,  // Use ASIN as stable ID instead of sequential number
                            asin: item.asin,
                            title: item.title || 'Unknown',
                            author: item.authors || 'Unknown',
                            acquired: item.acquisitionDate || '',
                            series: item.series || '',
                            seriesPosition: item.seriesPosition || '',
                            seriesTotal: '',
                            rating: item.rating || 0,
                            ratingCount: item.reviewCount || '',
                            description: item.description || '',
                            topReviews: item.topReviews || [],
                            binding: item.binding || 'Kindle eBook',
                            coverUrl: item.coverUrl,
                            publicationDate: item.publicationDate || '',
                            hasEnrichedData: true,
                            store: "Amazon",
                            // Wishlist: isOwned=false means wishlist, default to owned (isWishlist=0)
                            isWishlist: item.isOwned === false ? 1 : 0,
                            isHidden: item.isHidden || false,
                            addedToWishlist: item.addedToWishlist || '',
                            // Ownership type (v4.9.0)
                            ownershipType: item.ownershipType || 'purchased',
                            // Collections data
                            readStatus: bookCollections.readStatus,
                            collections: bookCollections.collections
                        };
                    } else {
                        const amazonData = item.amazonData?.data?.getProduct;
                        const imageData = amazonData?.images?.images?.[0]?.hiRes;
                        
                        let asin = item.asin;
                        if (asin && asin.length < 10 && /^[0-9]+$/.test(asin)) {
                            asin = asin.padStart(10, '0');
                        }
                        
                        let coverUrl = `https://images-na.ssl-images-amazon.com/images/P/${asin}.01.LZZZZZZZ.jpg`;
                        if (imageData?.physicalId) {
                            coverUrl = `https://images-na.ssl-images-amazon.com/images/I/${imageData.physicalId}.${imageData.extension}`;
                        }
                        
                        return {
                            id: asin,  // Use ASIN as stable ID instead of sequential number
                            asin: asin,
                            title: amazonData?.title?.displayString || item.title || 'Unknown',
                            author: amazonData?.byLine?.contributors?.[0]?.contributor?.author?.profile?.displayName || item.author || 'Unknown',
                            acquired: amazonData?.pastPurchase?.purchaseHistory?.lastOrderDate || item.acquired || '',
                            series: amazonData?.bookSeries?.singleBookView?.series?.title || '',
                            seriesPosition: amazonData?.bookSeries?.singleBookView?.series?.position || '',
                            seriesTotal: amazonData?.bookSeries?.singleBookView?.series?.numberOfBooks || '',
                            rating: amazonData?.customerReviewsSummary?.rating?.value || 0,
                            ratingCount: amazonData?.customerReviewsSummary?.count?.displayString || '',
                            description: extractDescription(amazonData?.description),
                            topReviews: amazonData?.customerReviewsTop?.reviews || [],
                            binding: amazonData?.bindingInformation?.binding?.displayString || 'Kindle eBook',
                            coverUrl: coverUrl,
                            publicationDate: '', // Legacy format doesn't have publication date
                            hasEnrichedData: true,
                            store: "Amazon",
                            // Wishlist: isOwned=false means wishlist, default to owned (isWishlist=0)
                            isWishlist: item.isOwned === false ? 1 : 0,
                            isHidden: item.isHidden || false,
                            addedToWishlist: item.addedToWishlist || '',
                            // Ownership type (v4.9.0)
                            ownershipType: item.ownershipType || 'purchased',
                            // Collections data
                            readStatus: bookCollections.readStatus,
                            collections: bookCollections.collections
                        };
                    }
                });

                // Sort books by acquisition date (newest first) to maintain original order
                try {
                    processedBooks.sort((a, b) => {
                        // Handle missing dates - put them at the end
                        if (!a.acquired && !b.acquired) return 0;
                        if (!a.acquired) return 1;
                        if (!b.acquired) return -1;

                        // Parse dates safely
                        const dateA = new Date(a.acquired);
                        const dateB = new Date(b.acquired);

                        // Handle invalid dates
                        const isValidA = !isNaN(dateA.getTime());
                        const isValidB = !isNaN(dateB.getTime());

                        if (!isValidA && !isValidB) return 0;
                        if (!isValidA) return 1;
                        if (!isValidB) return -1;

                        // Compare dates (descending - newest first)
                        return dateB - dateA;
                    });
                    console.log('✅ Books sorted by acquisition date (newest first)');
                } catch (error) {
                    console.error('❌ Sort failed:', error);
                    console.error('Error details:', error.message, error.stack);
                    // Continue without sorting if sort fails
                }

                // Log collections merge results
                if (collections) {
                    const booksWithCollections = processedBooks.filter(b => b.collections.length > 0).length;
                    const readBooks = processedBooks.filter(b => b.readStatus === 'READ').length;
                    const unreadBooks = processedBooks.filter(b => b.readStatus === 'UNREAD').length;
                    console.log(`📚 Collections data merged:`);
                    console.log(`   - ${booksWithCollections} books have collections`);
                    console.log(`   - ${readBooks} READ, ${unreadBooks} UNREAD, ${processedBooks.length - readBooks - unreadBooks} UNKNOWN`);

                    // Show sample book with collections for verification
                    const sampleBook = processedBooks.find(b => b.collections.length > 0);
                    if (sampleBook) {
                        console.log(`\n📖 Sample book with collections:`);
                        console.log(`   Title: ${sampleBook.title}`);
                        console.log(`   ASIN: ${sampleBook.asin}`);
                        console.log(`   Read Status: ${sampleBook.readStatus}`);
                        console.log(`   Collections: ${sampleBook.collections.map(c => c.name).join(', ')}`);
                    }
                }

                // Save to IndexedDB
                await saveBooksToIndexedDB(processedBooks);
                setBooks(processedBooks);

                // Reset all filters when loading new library (v3.8.0.g, updated v3.8.0.k)
                setSearchTerm('');
                setReadStatusFilter('');
                setCollectionFilter('');
                setRatingFilter('');
                setWishlistFilter('');
                setOwnershipFilter('');
                setSeriesFilter('');
                setDateFrom('');
                setDateTo('');
                setShowHidden(true); // v4.8.0 - Default to showing all books on load
                localStorage.setItem(FILTERS_KEY, JSON.stringify({
                    searchTerm: '',
                    readStatusFilter: '',
                    collectionFilter: '',
                    ratingFilter: '',
                    wishlistFilter: '',
                    ownershipFilter: '',
                    seriesFilter: '',
                    dateFrom: '',
                    dateTo: '',
                    showHidden: true // v4.8.0 - Default to showing all books
                }));
                console.log('🔍 Filters cleared for new library');

                // v4.0.0.b: Check organization source - backup file takes priority, then localStorage
                let orgToRestore = null;
                let orgSource = null;

                if (organizationFromFile) {
                    // Backup restore - use organization from file
                    orgToRestore = organizationFromFile;
                    orgSource = 'backup file';
                } else {
                    // Library file - try to restore from localStorage
                    try {
                        const saved = localStorage.getItem(STORAGE_KEY);
                        if (saved) {
                            const state = JSON.parse(saved);
                            if (state.organization?.columns) {
                                orgToRestore = state.organization;
                                orgSource = 'localStorage';
                            }
                        }
                    } catch (e) {
                        console.log('Note: Could not read localStorage organization');
                    }
                }

                if (orgToRestore?.columns) {
                    const restoredColumns = orgToRestore.columns.map(col => ({
                        id: col.id,
                        name: col.name,
                        books: col.bookIds || col.books || col.items || []  // v4.0.0.c: support items from backup export
                    }));

                    // v4.0.0.d: Find new books not in any column and add to Unorganized
                    const allColumnBookIds = new Set(restoredColumns.flatMap(col => col.books));
                    const allLibraryBookIds = processedBooks.map(b => b.id);
                    const orphanedBooks = allLibraryBookIds.filter(id => !allColumnBookIds.has(id));

                    if (orphanedBooks.length > 0) {
                        // Find or create Unorganized column
                        let unorganizedCol = restoredColumns.find(col => col.id === 'unorganized');
                        if (unorganizedCol) {
                            // Prepend new books to Unorganized (newest first)
                            unorganizedCol.books = [...orphanedBooks, ...unorganizedCol.books];
                        } else {
                            // Create Unorganized column with orphaned books
                            restoredColumns.unshift({ id: 'unorganized', name: 'Unorganized', books: orphanedBooks });
                        }
                        console.log(`📚 Added ${orphanedBooks.length} new book${orphanedBooks.length === 1 ? '' : 's'} to Unorganized`);
                    }

                    setColumns(restoredColumns);
                    setBlankImageBooks(new Set(orgToRestore.blankImageBooks || []));
                    console.log(`✅ Restored organization from ${orgSource}`);
                    setDataSource('enriched');
                    setLastSyncTime(Date.now());
                    setSyncStatus('fresh');
                    if (onComplete) setTimeout(() => onComplete(metadata.totalBooks), 0);
                    return;
                }

                // No organization found, start fresh
                setColumns([{ id: 'unorganized', name: 'Unorganized', books: processedBooks.map(b => b.id) }]);
                setDataSource('enriched');
                setLastSyncTime(Date.now());
                setSyncStatus('fresh');
                if (onComplete) setTimeout(() => onComplete(metadata.totalBooks), 0);
            };

            const addColumn = () => {
                const newId = `col-${Date.now()}`;
                setColumns([...columns, { id: newId, name: 'New Column', books: [] }]);
                // Set this column to edit mode immediately
                setTimeout(() => setEditingColumn(newId), 0);
                new Image().src = 'https://readerwrangler.goatcounter.com/count?p=/event/column-created';
            };

            // v4.12.0 - Insert column before or after a reference column
            const insertColumn = (referenceColumnId, position) => {
                const newId = `col-${Date.now()}`;
                const newColumn = { id: newId, name: 'New Column', books: [] };
                const refIndex = columns.findIndex(c => c.id === referenceColumnId);
                if (refIndex === -1) return;

                const insertIndex = position === 'before' ? refIndex : refIndex + 1;
                const newColumns = [...columns];
                newColumns.splice(insertIndex, 0, newColumn);
                setColumns(newColumns);

                // Set this column to edit mode immediately
                setTimeout(() => setEditingColumn(newId), 0);
                new Image().src = 'https://readerwrangler.goatcounter.com/count?p=/event/column-created';
            };

            const startEditingColumn = (columnId, currentName) => {
                setEditingColumn(columnId);
                setEditingName(currentName);
            };

            const finishEditingColumn = (columnId) => {
                if (editingName.trim()) {
                    setColumns(columns.map(col => 
                        col.id === columnId ? { ...col, name: editingName.trim() } : col
                    ));
                }
                setEditingColumn(null);
                setEditingName('');
            };

            const sortColumn = (columnId, sortType) => {
                // Check for publication date availability when sorting by published
                if (sortType === 'published-desc' || sortType === 'published-asc') {
                    const column = columns.find(c => c.id === columnId);
                    if (column) {
                        const columnBooks = column.books.map(id => books.find(b => b.id === id)).filter(Boolean);
                        const booksWithPubDate = columnBooks.filter(b => b.publicationDate);
                        if (booksWithPubDate.length === 0) {
                            alert('No publication dates found in this column.\n\nTo add publication dates:\n1. Re-run the Library Fetcher on Amazon\n2. Import the updated library file\n\nYour organization will be preserved - only metadata is updated.');
                            return;
                        }
                    }
                }

                setColumns(columns.map(col => {
                    if (col.id !== columnId) return col;

                    const sortedBookIds = [...col.books].sort((aId, bId) => {
                        const a = books.find(b => b.id === aId);
                        const b = books.find(b => b.id === bId);
                        if (!a || !b) return 0;
                        
                        switch(sortType) {
                            case 'title-asc':
                                return a.title.localeCompare(b.title);
                            case 'title-desc':
                                return b.title.localeCompare(a.title);
                            case 'author-asc':
                                return a.author.localeCompare(b.author);
                            case 'author-desc':
                                return b.author.localeCompare(a.author);
                            case 'rating-desc':
                                return (b.rating || 0) - (a.rating || 0);
                            case 'rating-asc':
                                return (a.rating || 0) - (b.rating || 0);
                            case 'acquired-desc':
                                return (b.acquired || '').localeCompare(a.acquired || '');
                            case 'acquired-asc':
                                return (a.acquired || '').localeCompare(b.acquired || '');
                            case 'published-desc':
                                // Books without publication date go to end
                                if (!a.publicationDate && !b.publicationDate) return 0;
                                if (!a.publicationDate) return 1;
                                if (!b.publicationDate) return -1;
                                return b.publicationDate.localeCompare(a.publicationDate);
                            case 'published-asc':
                                // Books without publication date go to end
                                if (!a.publicationDate && !b.publicationDate) return 0;
                                if (!a.publicationDate) return 1;
                                if (!b.publicationDate) return -1;
                                return a.publicationDate.localeCompare(b.publicationDate);
                            case 'series-pos-asc':
                                // v3.11.0.e - Books without series go to end, books with series but no position go last in their series
                                const aHasSeriesAsc = a.series;
                                const bHasSeriesAsc = b.series;

                                if (!aHasSeriesAsc && !bHasSeriesAsc) return 0; // Both have no series, keep original order
                                if (!aHasSeriesAsc) return 1; // a has no series, goes after b
                                if (!bHasSeriesAsc) return -1; // b has no series, goes after a

                                // Primary sort: group by series name (alphabetical)
                                const seriesCompareAsc = a.series.localeCompare(b.series);
                                if (seriesCompareAsc !== 0) return seriesCompareAsc;

                                // Secondary sort: position within same series (books without position go last)
                                return (parseInt(a.seriesPosition) || 999) - (parseInt(b.seriesPosition) || 999);
                            case 'series-pos-desc':
                                // v3.11.0.e - Books without series go to end, books with series but no position go last in their series
                                const aHasSeriesDesc = a.series;
                                const bHasSeriesDesc = b.series;

                                if (!aHasSeriesDesc && !bHasSeriesDesc) return 0; // Both have no series, keep original order
                                if (!aHasSeriesDesc) return 1; // a has no series, goes after b
                                if (!bHasSeriesDesc) return -1; // b has no series, goes after a

                                // Primary sort: group by series name (alphabetical)
                                const seriesCompareDesc = a.series.localeCompare(b.series);
                                if (seriesCompareDesc !== 0) return seriesCompareDesc;

                                // Secondary sort: position within same series (REVERSED, books without position go last)
                                return (parseInt(b.seriesPosition) || 999) - (parseInt(a.seriesPosition) || 999);
                            default:
                                return 0;
                        }
                    });
                    
                    return { ...col, books: sortedBookIds };
                }));
                setSortMenuOpen(null);
                setColumnMenuOpen(null); // v3.11.0 - Also close parent menu
            };

            const checkIfBlankImage = (img, bookId) => {
                if (img.naturalWidth === 1 && img.naturalHeight === 1) {
                    setBlankImageBooks(prev => new Set([...prev, bookId]));
                }
            };

            const openDeleteDialog = (columnId) => {
                const col = columns.find(c => c.id === columnId);

                if (col && col.books.length === 0) {
                    // v4.8.0 - Record action for undo (empty column)
                    const columnIndex = columns.findIndex(c => c.id === columnId);
                    recordAction({
                        type: 'DELETE_COLUMN',
                        columnId: col.id,
                        columnName: col.name,
                        columnIndex: columnIndex,
                        books: [],
                        destinationColId: null
                    });
                    setColumns(columns.filter(c => c.id !== columnId));
                    return;
                }

                const otherColumns = columns.filter(c => c.id !== columnId);
                if (otherColumns.length > 0) {
                    setDeleteDialogOpen(columnId);
                    setDeleteDestination(otherColumns[0].id);
                }
            };

            const confirmDeleteColumn = () => {
                const columnToDelete = columns.find(c => c.id === deleteDialogOpen);
                const destinationColumn = columns.find(c => c.id === deleteDestination);

                if (!columnToDelete || !destinationColumn) return;

                // v4.8.0 - Record action for undo (column with books)
                const columnIndex = columns.findIndex(c => c.id === deleteDialogOpen);
                recordAction({
                    type: 'DELETE_COLUMN',
                    columnId: columnToDelete.id,
                    columnName: columnToDelete.name,
                    columnIndex: columnIndex,
                    books: [...columnToDelete.books],
                    destinationColId: deleteDestination
                });

                setColumns(columns.filter(c => c.id !== deleteDialogOpen).map(c =>
                    c.id === deleteDestination ? { ...c, books: [...c.books, ...columnToDelete.books] } : c
                ));

                setDeleteDialogOpen(null);
                setDeleteDestination('');
            };

            // v3.11.0 - Divider Functions
            const insertDivider = (columnId) => {
                if (!newDividerLabel.trim()) return;

                const dividerId = `divider-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
                const divider = {
                    type: 'divider',
                    id: dividerId,
                    label: newDividerLabel.trim()
                };

                setColumns(columns.map(col => {
                    if (col.id !== columnId) return col;

                    // Find insertion position: before first selected book, or at top if no selection
                    let insertIndex = 0; // Default to top
                    if (selectedBooks.size > 0) {
                        // Find first selected book in this column
                        const firstSelectedIndex = col.books.findIndex(item =>
                            typeof item === 'string' && selectedBooks.has(item)
                        );
                        if (firstSelectedIndex !== -1) {
                            insertIndex = firstSelectedIndex;
                        }
                    }

                    const newBooks = [...col.books];
                    newBooks.splice(insertIndex, 0, divider);
                    return { ...col, books: newBooks };
                }));

                setInsertDividerOpen(null);
                setNewDividerLabel('');
                setColumnMenuOpen(null);
                new Image().src = 'https://readerwrangler.goatcounter.com/count?p=/event/divider-created';
            };

            const startEditingDivider = (columnId, dividerId, currentLabel) => {
                setEditingDivider({ columnId, dividerId });
                setEditingDividerLabel(currentLabel);
            };

            const finishEditingDivider = () => {
                if (!editingDivider) return;

                const { columnId, dividerId } = editingDivider;
                const newLabel = editingDividerLabel.trim();

                if (!newLabel) {
                    setEditingDivider(null);
                    setEditingDividerLabel('');
                    return;
                }

                setColumns(columns.map(col =>
                    col.id === columnId
                        ? {
                            ...col,
                            books: col.books.map(item =>
                                (typeof item === 'object' && item.type === 'divider' && item.id === dividerId)
                                    ? { ...item, label: newLabel }
                                    : item
                            )
                        }
                        : col
                ));

                setEditingDivider(null);
                setEditingDividerLabel('');
            };

            const deleteDivider = (columnId, dividerId) => {
                // v4.8.0 - Capture divider info for undo before deleting
                const col = columns.find(c => c.id === columnId);
                const dividerIndex = col.books.findIndex(item =>
                    typeof item === 'object' && item.type === 'divider' && item.id === dividerId
                );
                const dividerObj = col.books[dividerIndex];

                setColumns(columns.map(c =>
                    c.id === columnId
                        ? {
                            ...c,
                            books: c.books.filter(item =>
                                !(typeof item === 'object' && item.type === 'divider' && item.id === dividerId)
                            )
                        }
                        : c
                ));

                // v4.8.0 - Record action for undo
                if (dividerObj) {
                    recordAction({
                        type: 'DELETE_DIVIDER',
                        columnId: columnId,
                        divider: { ...dividerObj },
                        dividerIndex: dividerIndex
                    });
                }
            };

            const autoDivideBySeries = (columnId) => {
                const column = columns.find(c => c.id === columnId);
                if (!column) return;

                // Get actual book objects (not dividers)
                const bookItems = column.books.filter(item => typeof item === 'string');
                const bookObjects = bookItems.map(id => books.find(b => b.id === id)).filter(Boolean);

                if (bookObjects.length === 0) return;

                // Group books by series (books without series stay at end)
                const seriesGroups = {};
                const noSeriesBooks = [];

                bookObjects.forEach(book => {
                    if (book.series) {
                        if (!seriesGroups[book.series]) {
                            seriesGroups[book.series] = [];
                        }
                        seriesGroups[book.series].push(book.id);
                    } else {
                        noSeriesBooks.push(book.id);
                    }
                });

                // Sort series names alphabetically
                const sortedSeriesNames = Object.keys(seriesGroups).sort((a, b) => a.localeCompare(b));

                // v3.11.0.f - Sort books within each series by position
                sortedSeriesNames.forEach(seriesName => {
                    const bookIds = seriesGroups[seriesName];
                    const seriesBookObjects = bookIds.map(id => books.find(b => b.id === id)).filter(Boolean);

                    // Sort by seriesPosition (books without position go last)
                    seriesBookObjects.sort((a, b) => {
                        return (parseInt(a.seriesPosition) || 999) - (parseInt(b.seriesPosition) || 999);
                    });

                    // Update the group with sorted IDs
                    seriesGroups[seriesName] = seriesBookObjects.map(book => book.id);
                });

                // Build new books array with dividers
                const newBooks = [];
                sortedSeriesNames.forEach(seriesName => {
                    const dividerId = `divider-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
                    newBooks.push({
                        type: 'divider',
                        id: dividerId,
                        label: seriesName
                    });
                    newBooks.push(...seriesGroups[seriesName]);
                });

                // v3.11.0.e - Add "Miscellaneous" divider for books without series
                if (noSeriesBooks.length > 0) {
                    const dividerId = `divider-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
                    newBooks.push({
                        type: 'divider',
                        id: dividerId,
                        label: 'Miscellaneous'
                    });
                    newBooks.push(...noSeriesBooks);
                }

                setColumns(columns.map(col =>
                    col.id === columnId ? { ...col, books: newBooks } : col
                ));

                setColumnMenuOpen(null);
                new Image().src = 'https://readerwrangler.goatcounter.com/count?p=/event/auto-divide-by-series';
            };

            const autoDivideByRating = (columnId) => {
                const column = columns.find(c => c.id === columnId);
                if (!column) return;

                // Get actual book objects (not dividers)
                const bookItems = column.books.filter(item => typeof item === 'string');
                const bookObjects = bookItems.map(id => books.find(b => b.id === id)).filter(Boolean);

                if (bookObjects.length === 0) return;

                // Group books by rating tier
                const ratingTiers = {
                    '5 Stars': [],
                    '4 Stars': [],
                    '3 Stars': [],
                    '2 Stars': [],
                    '1 Star': [],
                    'No Rating': []
                };

                bookObjects.forEach(book => {
                    if (!book.rating || book.rating === 0) {
                        ratingTiers['No Rating'].push(book.id);
                    } else if (book.rating >= 4.5) {
                        ratingTiers['5 Stars'].push(book.id);
                    } else if (book.rating >= 3.5) {
                        ratingTiers['4 Stars'].push(book.id);
                    } else if (book.rating >= 2.5) {
                        ratingTiers['3 Stars'].push(book.id);
                    } else if (book.rating >= 1.5) {
                        ratingTiers['2 Stars'].push(book.id);
                    } else {
                        ratingTiers['1 Star'].push(book.id);
                    }
                });

                // Build new books array with dividers (only for non-empty tiers)
                const tierOrder = ['5 Stars', '4 Stars', '3 Stars', '2 Stars', '1 Star', 'No Rating'];
                const newBooks = [];

                tierOrder.forEach(tier => {
                    if (ratingTiers[tier].length > 0) {
                        const dividerId = `divider-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
                        newBooks.push({
                            type: 'divider',
                            id: dividerId,
                            label: tier
                        });
                        newBooks.push(...ratingTiers[tier]);
                    }
                });

                setColumns(columns.map(col =>
                    col.id === columnId ? { ...col, books: newBooks } : col
                ));

                setColumnMenuOpen(null);
            };

            const openBookModal = (book, columnId) => {
                try {
                    const cache = localStorage.getItem(CACHE_KEY);
                    if (cache) {
                        const cacheData = JSON.parse(cache);
                        if (cacheData[book.asin]) {
                            const cached = cacheData[book.asin];
                            book = {
                                ...book,
                                description: cached.description || book.description,
                                rating: cached.rating || book.rating,
                                ratingCount: cached.ratingCount || book.ratingCount,
                                topReviews: cached.topReviews || book.topReviews
                            };
                        }
                    }
                } catch (e) {
                    console.error('Cache read error:', e);
                }
                
                setModalBook(book);
                setModalColumnId(columnId);
                setShowAllReviews(false);
            };

            const closeBookModal = () => {
                setModalBook(null);
                setModalColumnId(null);
            };

            // Multi-select helper functions
            const toggleBookSelection = (bookId) => {
                setSelectedBooks(prev => {
                    const newSet = new Set(prev);
                    if (newSet.has(bookId)) {
                        newSet.delete(bookId);
                    } else {
                        newSet.add(bookId);
                    }
                    return newSet;
                });
            };

            const selectBookRange = (startBookId, endBookId, columnId) => {
                // Only select within the same column
                const column = columns.find(col => col.id === columnId);
                if (!column) return;

                const visibleBooks = filteredBooks(column.books);
                const startIdx = visibleBooks.findIndex(b => b.id === startBookId);
                const endIdx = visibleBooks.findIndex(b => b.id === endBookId);

                if (startIdx === -1 || endIdx === -1) return;

                const [min, max] = [Math.min(startIdx, endIdx), Math.max(startIdx, endIdx)];
                const rangeBooks = visibleBooks.slice(min, max + 1);
                const rangeIds = rangeBooks.map(book => book.id);

                setSelectedBooks(new Set(rangeIds));
            };

            const clearSelection = () => {
                setSelectedBooks(new Set());
                setLastClickedBook(null);
                setSelectedDivider(null); // v3.13.0 - Clear divider selection too
            };

            // v4.8.0 - Undo/Redo core functions
            const MAX_UNDO = 50;

            // Keep refs in sync with state (fixes stale closure in keyboard handler)
            useEffect(() => {
                undoStackRef.current = undoStack;
            }, [undoStack]);
            useEffect(() => {
                redoStackRef.current = redoStack;
            }, [redoStack]);

            const recordAction = (action) => {
                setUndoStack(prev => {
                    const newStack = [...prev, { ...action, timestamp: Date.now() }];
                    if (newStack.length > MAX_UNDO) newStack.shift();
                    return newStack;
                });
                setRedoStack([]); // Clear redo on new action
            };

            const executeUndo = (action) => {
                switch (action.type) {
                    case 'MOVE_BOOKS':
                        // Move books back to source column at original positions
                        console.log('[UNDO MOVE_BOOKS] Action:', JSON.stringify(action, null, 2));
                        setColumns(cols => {
                            console.log('[UNDO MOVE_BOOKS] Processing columns...');
                            return cols.map(col => {
                                if (col.id === action.toColId) {
                                    // Remove books from target column
                                    const beforeCount = col.books.length;
                                    const filtered = col.books.filter(id => !action.bookIds.includes(id));
                                    console.log(`[UNDO MOVE_BOOKS] Target col "${col.name}": ${beforeCount} -> ${filtered.length} books (removed ${beforeCount - filtered.length})`);
                                    return { ...col, books: filtered };
                                }
                                if (col.id === action.fromColId) {
                                    // Re-insert books at original positions
                                    const newBooks = [...col.books];
                                    console.log(`[UNDO MOVE_BOOKS] Source col "${col.name}" before insert: ${newBooks.length} books`);
                                    console.log(`[UNDO MOVE_BOOKS] Books to insert: ${action.bookIds.length}, at indices: ${action.fromIndices}`);
                                    // Sort by fromIndices ascending so insertions maintain correct positions
                                    const sortedPairs = action.bookIds
                                        .map((bookId, i) => ({ bookId, index: action.fromIndices[i] }))
                                        .sort((a, b) => a.index - b.index);
                                    console.log('[UNDO MOVE_BOOKS] Sorted pairs:', JSON.stringify(sortedPairs));
                                    sortedPairs.forEach(({ bookId, index }) => {
                                        console.log(`[UNDO MOVE_BOOKS] Splicing "${bookId}" at index ${index}, array length: ${newBooks.length}`);
                                        newBooks.splice(index, 0, bookId);
                                    });
                                    console.log(`[UNDO MOVE_BOOKS] Source col "${col.name}" after insert: ${newBooks.length} books`);
                                    return { ...col, books: newBooks };
                                }
                                return col;
                            });
                        });
                        break;
                    case 'REORDER_BOOKS':
                        // Move books back to original positions within same column
                        console.log('[UNDO REORDER_BOOKS] Action:', JSON.stringify(action, null, 2));
                        setColumns(cols => {
                            console.log('[UNDO REORDER_BOOKS] Processing columns...');
                            return cols.map(col => {
                                if (col.id === action.colId) {
                                    const newBooks = [...col.books];
                                    console.log(`[UNDO REORDER_BOOKS] Col "${col.name}" before: ${newBooks.length} books`);
                                    // First remove the books from their current positions
                                    action.bookIds.forEach(bookId => {
                                        const idx = newBooks.indexOf(bookId);
                                        if (idx !== -1) newBooks.splice(idx, 1);
                                    });
                                    console.log(`[UNDO REORDER_BOOKS] After removal: ${newBooks.length} books`);
                                    // Then insert them back at their original positions (sorted ascending)
                                    const sortedPairs = action.bookIds
                                        .map((bookId, i) => ({ bookId, index: action.fromIndices[i] }))
                                        .sort((a, b) => a.index - b.index);
                                    console.log('[UNDO REORDER_BOOKS] Sorted pairs:', JSON.stringify(sortedPairs));
                                    sortedPairs.forEach(({ bookId, index }) => {
                                        console.log(`[UNDO REORDER_BOOKS] Splicing "${bookId}" at index ${index}, array length: ${newBooks.length}`);
                                        newBooks.splice(index, 0, bookId);
                                    });
                                    console.log(`[UNDO REORDER_BOOKS] After insert: ${newBooks.length} books`);
                                    return { ...col, books: newBooks };
                                }
                                return col;
                            });
                        });
                        break;
                    case 'TOGGLE_HIDE':
                        // v4.8.0 - Restore each book's previous hidden state
                        console.log('[UNDO TOGGLE_HIDE] Action:', JSON.stringify(action, null, 2));
                        setBooks(prevBooks => {
                            const updatedBooks = prevBooks.map(book => {
                                if (action.bookIds.includes(book.id)) {
                                    const prevState = action.previousStates[book.id];
                                    console.log(`[UNDO TOGGLE_HIDE] Restoring "${book.title}" isHidden: ${book.isHidden} -> ${prevState}`);
                                    return { ...book, isHidden: prevState };
                                }
                                return book;
                            });
                            saveBooksToIndexedDB(updatedBooks);
                            return updatedBooks;
                        });
                        break;
                    case 'DELETE_COLUMN':
                        // v4.8.0 - Restore deleted column with its books
                        console.log('[UNDO DELETE_COLUMN] Action:', JSON.stringify(action, null, 2));
                        setColumns(cols => {
                            // Remove books from destination column (if any were moved)
                            let updatedCols = cols;
                            if (action.books.length > 0 && action.destinationColId) {
                                updatedCols = cols.map(col => {
                                    if (col.id === action.destinationColId) {
                                        return { ...col, books: col.books.filter(id => !action.books.includes(id)) };
                                    }
                                    return col;
                                });
                            }
                            // Re-insert the column at its original position
                            const restoredColumn = {
                                id: action.columnId,
                                name: action.columnName,
                                books: [...action.books]
                            };
                            const newCols = [...updatedCols];
                            newCols.splice(action.columnIndex, 0, restoredColumn);
                            console.log(`[UNDO DELETE_COLUMN] Restored column "${action.columnName}" at index ${action.columnIndex} with ${action.books.length} books`);
                            return newCols;
                        });
                        break;
                    case 'REORDER_COLUMNS':
                        // v4.8.0 - Move column back to original position
                        console.log('[UNDO REORDER_COLUMNS] Action:', JSON.stringify(action, null, 2));
                        setColumns(cols => {
                            const currentIndex = cols.findIndex(c => c.id === action.columnId);
                            if (currentIndex === -1) return cols;
                            const newCols = [...cols];
                            const [movedColumn] = newCols.splice(currentIndex, 1);
                            newCols.splice(action.fromIndex, 0, movedColumn);
                            console.log(`[UNDO REORDER_COLUMNS] Moved column from index ${currentIndex} back to ${action.fromIndex}`);
                            return newCols;
                        });
                        break;
                    case 'DELETE_DIVIDER':
                        // v4.8.0 - Restore deleted divider at original position
                        console.log('[UNDO DELETE_DIVIDER] Action:', JSON.stringify(action, null, 2));
                        setColumns(cols => cols.map(col => {
                            if (col.id === action.columnId) {
                                const newBooks = [...col.books];
                                newBooks.splice(action.dividerIndex, 0, { ...action.divider });
                                console.log(`[UNDO DELETE_DIVIDER] Restored divider "${action.divider.label}" at index ${action.dividerIndex}`);
                                return { ...col, books: newBooks };
                            }
                            return col;
                        }));
                        break;
                    case 'REORDER_DIVIDER':
                        // v4.8.0 - Move divider back to original position
                        console.log('[UNDO REORDER_DIVIDER] Action:', JSON.stringify(action, null, 2));
                        setColumns(cols => cols.map(col => {
                            if (col.id === action.colId) {
                                const newBooks = [...col.books];
                                // Find and remove divider from current position
                                const currentIdx = newBooks.findIndex(b =>
                                    typeof b === 'object' && b.type === 'divider' && b.id === action.dividerId
                                );
                                if (currentIdx === -1) return col;
                                const [divider] = newBooks.splice(currentIdx, 1);
                                // Insert at original position
                                newBooks.splice(action.fromIndex, 0, divider);
                                console.log(`[UNDO REORDER_DIVIDER] Moved divider "${action.dividerLabel}" from index ${currentIdx} back to ${action.fromIndex}`);
                                return { ...col, books: newBooks };
                            }
                            return col;
                        }));
                        break;
                    default:
                        console.warn('Unknown action type for undo:', action.type);
                }
            };

            const executeRedo = (action) => {
                switch (action.type) {
                    case 'MOVE_BOOKS':
                        // Move books to target column
                        setColumns(cols => cols.map(col => {
                            if (col.id === action.fromColId) {
                                return { ...col, books: col.books.filter(id => !action.bookIds.includes(id)) };
                            }
                            if (col.id === action.toColId) {
                                const newBooks = [...col.books];
                                newBooks.splice(action.toIndex, 0, ...action.bookIds);
                                return { ...col, books: newBooks };
                            }
                            return col;
                        }));
                        break;
                    case 'REORDER_BOOKS':
                        // Re-apply the reorder (move books to target position)
                        setColumns(cols => cols.map(col => {
                            if (col.id === action.colId) {
                                const newBooks = [...col.books];
                                // Remove books from current positions
                                action.bookIds.forEach(bookId => {
                                    const idx = newBooks.indexOf(bookId);
                                    if (idx !== -1) newBooks.splice(idx, 1);
                                });
                                // Calculate adjusted insert index (same logic as original reorder)
                                let adjustedIndex = action.toIndex;
                                action.fromIndices.forEach(origIdx => {
                                    if (origIdx < action.toIndex) adjustedIndex--;
                                });
                                // Insert at target position
                                newBooks.splice(adjustedIndex, 0, ...action.bookIds);
                                return { ...col, books: newBooks };
                            }
                            return col;
                        }));
                        break;
                    case 'TOGGLE_HIDE':
                        // v4.8.0 - Re-apply the hide/unhide action
                        console.log('[REDO TOGGLE_HIDE] Action:', JSON.stringify(action, null, 2));
                        setBooks(prevBooks => {
                            const updatedBooks = prevBooks.map(book => {
                                if (action.bookIds.includes(book.id)) {
                                    console.log(`[REDO TOGGLE_HIDE] Setting "${book.title}" isHidden: ${book.isHidden} -> ${action.newState}`);
                                    return { ...book, isHidden: action.newState };
                                }
                                return book;
                            });
                            saveBooksToIndexedDB(updatedBooks);
                            return updatedBooks;
                        });
                        break;
                    case 'DELETE_COLUMN':
                        // v4.8.0 - Re-delete the column
                        console.log('[REDO DELETE_COLUMN] Action:', JSON.stringify(action, null, 2));
                        setColumns(cols => {
                            // Move books to destination column (if any)
                            let updatedCols = cols;
                            if (action.books.length > 0 && action.destinationColId) {
                                updatedCols = cols.map(col => {
                                    if (col.id === action.destinationColId) {
                                        return { ...col, books: [...col.books, ...action.books] };
                                    }
                                    return col;
                                });
                            }
                            // Remove the column
                            console.log(`[REDO DELETE_COLUMN] Deleting column "${action.columnName}"`);
                            return updatedCols.filter(col => col.id !== action.columnId);
                        });
                        break;
                    case 'REORDER_COLUMNS':
                        // v4.8.0 - Move column back to target position
                        console.log('[REDO REORDER_COLUMNS] Action:', JSON.stringify(action, null, 2));
                        setColumns(cols => {
                            const currentIndex = cols.findIndex(c => c.id === action.columnId);
                            if (currentIndex === -1) return cols;
                            const newCols = [...cols];
                            const [movedColumn] = newCols.splice(currentIndex, 1);
                            newCols.splice(action.toIndex, 0, movedColumn);
                            console.log(`[REDO REORDER_COLUMNS] Moved column from index ${currentIndex} to ${action.toIndex}`);
                            return newCols;
                        });
                        break;
                    case 'DELETE_DIVIDER':
                        // v4.8.0 - Re-delete the divider
                        console.log('[REDO DELETE_DIVIDER] Action:', JSON.stringify(action, null, 2));
                        setColumns(cols => cols.map(col => {
                            if (col.id === action.columnId) {
                                console.log(`[REDO DELETE_DIVIDER] Deleting divider "${action.divider.label}"`);
                                return {
                                    ...col,
                                    books: col.books.filter(item =>
                                        !(typeof item === 'object' && item.type === 'divider' && item.id === action.divider.id)
                                    )
                                };
                            }
                            return col;
                        }));
                        break;
                    case 'REORDER_DIVIDER':
                        // v4.8.0 - Move divider to target position
                        console.log('[REDO REORDER_DIVIDER] Action:', JSON.stringify(action, null, 2));
                        setColumns(cols => cols.map(col => {
                            if (col.id === action.colId) {
                                const newBooks = [...col.books];
                                // Find and remove divider from current position
                                const currentIdx = newBooks.findIndex(b =>
                                    typeof b === 'object' && b.type === 'divider' && b.id === action.dividerId
                                );
                                if (currentIdx === -1) return col;
                                const [divider] = newBooks.splice(currentIdx, 1);
                                // Calculate adjusted target index (same logic as original reorder)
                                let adjustedIndex = action.toIndex;
                                if (action.fromIndex < action.toIndex) adjustedIndex--;
                                // Insert at target position
                                newBooks.splice(adjustedIndex, 0, divider);
                                console.log(`[REDO REORDER_DIVIDER] Moved divider "${action.dividerLabel}" from index ${currentIdx} to ${adjustedIndex}`);
                                return { ...col, books: newBooks };
                            }
                            return col;
                        }));
                        break;
                    default:
                        console.warn('Unknown action type for redo:', action.type);
                }
            };

            const undo = () => {
                // Use ref to get current stack (avoids stale closure from keyboard handler)
                const currentStack = undoStackRef.current;
                if (currentStack.length === 0) return;
                const action = currentStack[currentStack.length - 1];
                executeUndo(action);
                setUndoStack(prev => prev.slice(0, -1));
                setRedoStack(prev => [...prev, action]);
            };

            const redo = () => {
                // Use ref to get current stack (avoids stale closure from keyboard handler)
                const currentStack = redoStackRef.current;
                if (currentStack.length === 0) return;
                const action = currentStack[currentStack.length - 1];
                executeRedo(action);
                setRedoStack(prev => prev.slice(0, -1));
                setUndoStack(prev => [...prev, action]);
            };

            // v3.13.0 - Select divider and all books in its group
            const selectDividerGroup = (columnId, dividerId) => {
                const column = columns.find(col => col.id === columnId);
                if (!column) return;

                // Find divider index
                const dividerIndex = column.books.findIndex(item =>
                    typeof item === 'object' && item.type === 'divider' && item.id === dividerId
                );
                if (dividerIndex === -1) return;

                // Find all books from this divider until next divider (or end of column)
                const booksInGroup = [];
                for (let i = dividerIndex + 1; i < column.books.length; i++) {
                    const item = column.books[i];
                    // Stop at next divider
                    if (typeof item === 'object' && item.type === 'divider') break;
                    // Add book ID to group
                    if (typeof item === 'string') booksInGroup.push(item);
                }

                // Select the books in this group
                setSelectedBooks(new Set(booksInGroup));
                setSelectedDivider({ columnId, dividerId });
                setActiveColumnId(columnId);
            };

            const navigateBook = (direction) => {
                if (!modalBook || !modalColumnId) return;
                
                const column = columns.find(c => c.id === modalColumnId);
                if (!column) return;
                
                const visibleBooks = filteredBooks(column.books);
                const currentIndex = visibleBooks.findIndex(b => b.id === modalBook.id);
                if (currentIndex === -1) return;
                
                let newIndex = direction === 'prev' ? currentIndex - 1 : currentIndex + 1;
                
                if (newIndex < 0 || newIndex >= visibleBooks.length) return;
                
                const newBook = visibleBooks[newIndex];
                
                if (newBook) {
                    setModalBook(newBook);
                }
            };

            const getBookPosition = () => {
                if (!modalBook || !modalColumnId) return { current: 0, total: 0 };
                
                const column = columns.find(c => c.id === modalColumnId);
                if (!column) return { current: 0, total: 0 };
                
                const visibleBooks = filteredBooks(column.books);
                const currentIndex = visibleBooks.findIndex(b => b.id === modalBook.id);
                
                if (currentIndex === -1) return { current: 0, total: 0 };
                
                return {
                    current: currentIndex + 1,
                    total: visibleBooks.length,
                    hasPrev: currentIndex > 0,
                    hasNext: currentIndex < visibleBooks.length - 1
                };
            };

            const handleColumnDragStart = (e, columnId) => {
                e.stopPropagation();
                e.preventDefault();  // Prevent text selection during column drag
                setDragStartPos({ x: e.clientX, y: e.clientY });
                setDragCurrentPos({ x: e.clientX, y: e.clientY });
                setDraggedColumn(columnId);
                setIsDraggingColumn(false);
            };

            const calculateColumnDropPosition = (e) => {
                const columnsContainer = document.querySelector('.columns-container');
                if (!columnsContainer) return null;

                const columnElements = Array.from(columnsContainer.querySelectorAll('[data-column-id]'));
                const mouseX = e.clientX;

                for (let i = 0; i < columnElements.length; i++) {
                    const rect = columnElements[i].getBoundingClientRect();
                    const midpoint = rect.left + rect.width / 2;
                    
                    if (mouseX < midpoint) {
                        return i;
                    }
                }

                return columnElements.length;
            };

            const handleMouseDown = (e, book, columnId) => {
                // Don't start drag if using modifier keys for selection
                if (e.ctrlKey || e.metaKey || e.shiftKey) {
                    return;
                }

                e.preventDefault();

                // If clicking a book that's not in the selection, clear selection first
                if (selectedBooks.size > 0 && !selectedBooks.has(book.id)) {
                    clearSelection();
                }

                setDragStartPos({ x: e.clientX, y: e.clientY });
                // v3.14.0.x - Initialize position ref for ghost
                dragPosRef.current = { x: e.clientX, y: e.clientY };
                setDraggedBook(book);
                setDraggedFromColumn(columnId);
                setIsDragging(false);
                // v3.14.0.w - Use ref instead of state
                dropTargetRef.current = null;
            };

            // v3.11.0 - Handle divider dragging
            const handleDividerMouseDown = (e, divider, columnId) => {
                e.preventDefault();
                e.stopPropagation();

                setDragStartPos({ x: e.clientX, y: e.clientY });
                // v3.14.0.x - Initialize position ref for ghost
                dragPosRef.current = { x: e.clientX, y: e.clientY };
                setDraggedBook(divider); // Reuse draggedBook state for dividers
                setDraggedFromColumn(columnId);
                setIsDragging(false);
                // v3.14.0.w - Use ref instead of state
                dropTargetRef.current = null;
            };

            // v3.14.0.r - Build row-based index for a column (called at drag start only)
            // v3.14.0.u - Store scrollTop to calculate offset instead of rebuilding on scroll
            // Groups elements into rows based on Y position, enabling O(log R) lookup instead of O(N)
            const buildColumnIndex = (columnId) => {
                const column = columns.find(c => c.id === columnId);
                if (!column) return null;

                const columnElement = document.querySelector(`[data-column-id="${columnId}"] .book-grid`);
                if (!columnElement) return null;

                // v3.14.0.u - Get scrollable container and store its scrollTop
                const scrollContainer = columnElement.closest('.overflow-y-auto');
                const initialScrollTop = scrollContainer ? scrollContainer.scrollTop : 0;

                const columnRect = columnElement.getBoundingClientRect();

                // Get all book and divider elements with their positions
                const bookElements = Array.from(columnElement.querySelectorAll('.book-item'));
                const dividerElements = Array.from(columnElement.querySelectorAll('.divider-item'));

                // Build array of all elements with their rect and metadata
                const allItems = [];

                bookElements.forEach(el => {
                    const rect = el.getBoundingClientRect();
                    const bookId = el.dataset.bookId;
                    const actualIndex = column.books.indexOf(bookId);
                    if (actualIndex !== -1) {
                        allItems.push({
                            type: 'book',
                            id: bookId,
                            index: actualIndex,
                            rect,
                            top: rect.top,
                            bottom: rect.bottom,
                            left: rect.left,
                            right: rect.right,
                            centerY: rect.top + rect.height / 2
                        });
                    }
                });

                dividerElements.forEach(el => {
                    const rect = el.getBoundingClientRect();
                    const dividerId = el.dataset.dividerId;
                    const actualIndex = column.books.findIndex(item =>
                        typeof item === 'object' && item.type === 'divider' && item.id === dividerId
                    );
                    if (actualIndex !== -1) {
                        allItems.push({
                            type: 'divider',
                            id: dividerId,
                            index: actualIndex,
                            rect,
                            top: rect.top,
                            bottom: rect.bottom,
                            left: rect.left,
                            right: rect.right,
                            centerY: rect.top + rect.height / 2
                        });
                    }
                });

                // Sort by index to ensure correct order
                allItems.sort((a, b) => a.index - b.index);

                // Group into rows based on Y position (items with same top are in same row)
                const rows = [];
                let currentRow = null;
                const ROW_TOLERANCE = 5; // pixels - items within this Y distance are same row

                allItems.forEach(item => {
                    if (!currentRow || Math.abs(item.top - currentRow.top) > ROW_TOLERANCE) {
                        // Start a new row
                        currentRow = {
                            type: item.type === 'divider' ? 'divider' : 'books',
                            top: item.top,
                            bottom: item.bottom,
                            startIndex: item.index,
                            items: [item]
                        };
                        rows.push(currentRow);
                    } else {
                        // Add to current row
                        currentRow.items.push(item);
                        currentRow.bottom = Math.max(currentRow.bottom, item.bottom);
                        // If any item in row is divider, row type is divider
                        if (item.type === 'divider') {
                            currentRow.type = 'divider';
                        }
                    }
                });

                // Sort items within each row by X position (left to right)
                rows.forEach(row => {
                    row.items.sort((a, b) => a.left - b.left);
                });

                // Build row boundaries array for binary search
                const rowBoundaries = rows.map(row => row.top);

                const index = {
                    columnId,
                    columnRect,
                    rows,
                    rowBoundaries,
                    totalItems: column.books.length,
                    initialScrollTop,  // v3.14.0.u - for scroll offset calculation
                    scrollContainer    // v3.14.0.u - reference to get current scrollTop
                };

                columnIndexRef.current[columnId] = index;
                return index;
            };

            // v3.14.0.r - Build index for all visible columns
            const buildAllColumnIndexes = () => {
                columns.forEach(column => {
                    buildColumnIndex(column.id);
                });
            };

            // v3.14.0.r - Binary search to find row containing Y coordinate
            const findRowByY = (rows, rowBoundaries, mouseY) => {
                if (rows.length === 0) return null;

                // Binary search for the row containing mouseY
                let low = 0;
                let high = rows.length - 1;

                // If mouse is above first row, return first row
                if (mouseY < rowBoundaries[0]) {
                    return { row: rows[0], rowIndex: 0, position: 'above' };
                }

                // If mouse is below last row, return last row
                if (mouseY > rows[rows.length - 1].bottom) {
                    return { row: rows[rows.length - 1], rowIndex: rows.length - 1, position: 'below' };
                }

                while (low <= high) {
                    const mid = Math.floor((low + high) / 2);
                    const row = rows[mid];

                    if (mouseY >= row.top && mouseY <= row.bottom) {
                        // Found the row containing mouseY
                        return { row, rowIndex: mid, position: 'within' };
                    } else if (mouseY < row.top) {
                        high = mid - 1;
                    } else {
                        low = mid + 1;
                    }
                }

                // Mouse is in gap between rows - find closest row
                // low now points to the row after the gap
                if (low < rows.length && low > 0) {
                    const prevRow = rows[low - 1];
                    const nextRow = rows[low];
                    const distToPrev = mouseY - prevRow.bottom;
                    const distToNext = nextRow.top - mouseY;
                    if (distToPrev <= distToNext) {
                        return { row: prevRow, rowIndex: low - 1, position: 'below' };
                    } else {
                        return { row: nextRow, rowIndex: low, position: 'above' };
                    }
                }

                // Fallback
                return { row: rows[0], rowIndex: 0, position: 'within' };
            };

            const calculateDropPosition = (e, columnId) => {
                const column = columns.find(c => c.id === columnId);
                if (!column) return null;

                // v3.14.0.r - Use cached column index for O(log R) lookup
                let colIndex = columnIndexRef.current[columnId];

                // If no index exists (shouldn't happen, but fallback), build it now
                if (!colIndex) {
                    colIndex = buildColumnIndex(columnId);
                }

                if (!colIndex || colIndex.rows.length === 0) {
                    // Empty column
                    return { columnId, index: 0 };
                }

                const mouseX = e.clientX;
                let mouseY = e.clientY;

                // v3.14.0.u - Adjust mouseY for scroll offset
                // The index was built with positions relative to the viewport at initialScrollTop.
                // If the column has scrolled since then, we need to transform mouseY to match
                // the original coordinate space by adding the scroll delta.
                if (colIndex.scrollContainer && colIndex.initialScrollTop !== undefined) {
                    const currentScrollTop = colIndex.scrollContainer.scrollTop;
                    const scrollDelta = currentScrollTop - colIndex.initialScrollTop;
                    mouseY += scrollDelta; // Adjust mouse position to original coordinate space
                }

                // Binary search to find the row
                const result = findRowByY(colIndex.rows, colIndex.rowBoundaries, mouseY);
                if (!result) {
                    return { columnId, index: 0 };
                }

                const { row, position } = result;

                // Handle position above/below row
                if (position === 'above') {
                    // Insert before the first item in this row
                    return { columnId, index: row.startIndex };
                }
                if (position === 'below') {
                    // Insert after the last item in this row
                    const lastItem = row.items[row.items.length - 1];
                    return { columnId, index: lastItem.index + 1 };
                }

                // Position is 'within' the row - determine exact position
                if (row.type === 'divider') {
                    // Divider row: use top/bottom half
                    const dividerItem = row.items[0];
                    const centerY = dividerItem.centerY;
                    const isBelowCenter = mouseY > centerY;
                    return { columnId, index: isBelowCenter ? dividerItem.index + 1 : dividerItem.index };
                }

                // Books row: use X position to find which book, then top/bottom half
                // Find which book the mouse is over (or closest to)
                let targetItem = row.items[0];
                for (const item of row.items) {
                    if (mouseX >= item.left && mouseX <= item.right) {
                        targetItem = item;
                        break;
                    }
                    // If mouse is to the right of this item but left of next, use this item
                    if (mouseX > item.right) {
                        targetItem = item;
                    }
                }

                // Use quadrant logic for books: right-of OR below-center = insert after
                const centerX = targetItem.left + (targetItem.right - targetItem.left) / 2;
                const centerY = targetItem.centerY;
                const isRightOfBook = mouseX > centerX;
                const isBelowBook = mouseY > centerY;

                const insertAfter = isRightOfBook || (!isRightOfBook && isBelowBook);
                return { columnId, index: insertAfter ? targetItem.index + 1 : targetItem.index };
            };

            // v3.14.0.w - Update indicator position directly via DOM (no React re-render)
            const updateIndicatorPosition = () => {
                const target = dropTargetRef.current;
                const indicator = indicatorRef.current;

                if (!indicator) return;

                if (!target || !isDragging) {
                    indicator.style.display = 'none';
                    return;
                }

                const colIndex = columnIndexRef.current[target.columnId];
                if (!colIndex) {
                    indicator.style.display = 'none';
                    return;
                }

                const { rows, columnRect, totalItems } = colIndex;
                const targetIndex = target.index;

                // v3.14.0.u - Calculate scroll delta to transform stored coordinates back to viewport
                let scrollDelta = 0;
                if (colIndex.scrollContainer && colIndex.initialScrollTop !== undefined) {
                    const currentScrollTop = colIndex.scrollContainer.scrollTop;
                    scrollDelta = currentScrollTop - colIndex.initialScrollTop;
                }

                // Default to full column width for divider-style indicators
                let left = columnRect.left;
                let width = columnRect.width;
                let top = columnRect.top - scrollDelta; // Adjust for scroll

                // Empty column case
                if (rows.length === 0 || totalItems === 0) {
                    // Apply styles directly
                    indicator.style.display = 'block';
                    indicator.style.top = (columnRect.top - scrollDelta - 3) + 'px';
                    indicator.style.left = left + 'px';
                    indicator.style.width = width + 'px';
                    return;
                }

                // Find the row and item at/before the target index
                let targetRow = null;
                let targetItem = null;
                let insertBefore = true; // Are we inserting before or after this item?

                for (const row of rows) {
                    for (const item of row.items) {
                        if (item.index === targetIndex) {
                            // Insert before this item
                            targetRow = row;
                            targetItem = item;
                            insertBefore = true;
                            break;
                        } else if (item.index === targetIndex - 1) {
                            // Insert after this item
                            targetRow = row;
                            targetItem = item;
                            insertBefore = false;
                        }
                    }
                    if (targetItem && insertBefore) break; // Found exact match
                }

                // Start of column (index 0, before first item)
                if (targetIndex === 0 && rows.length > 0) {
                    const firstRow = rows[0];
                    top = firstRow.top - scrollDelta; // Adjust for scroll
                    if (firstRow.type === 'books' && firstRow.items.length > 0) {
                        // Use first book's width
                        const firstItem = firstRow.items[0];
                        left = firstItem.left;
                        width = firstItem.right - firstItem.left;
                    }
                    indicator.style.display = 'block';
                    indicator.style.top = (top - 3) + 'px';
                    indicator.style.left = left + 'px';
                    indicator.style.width = width + 'px';
                    return;
                }

                // End of column (after last item)
                if (targetIndex >= totalItems) {
                    const lastRow = rows[rows.length - 1];
                    top = lastRow.bottom - scrollDelta; // Adjust for scroll
                    if (lastRow.type === 'books' && lastRow.items.length > 0) {
                        const lastItem = lastRow.items[lastRow.items.length - 1];
                        left = lastItem.left;
                        width = lastItem.right - lastItem.left;
                    }
                    indicator.style.display = 'block';
                    indicator.style.top = (top - 3) + 'px';
                    indicator.style.left = left + 'px';
                    indicator.style.width = width + 'px';
                    return;
                }

                // Normal case: between items
                if (targetRow && targetItem) {
                    if (insertBefore) {
                        top = targetItem.top - scrollDelta; // Adjust for scroll
                    } else {
                        top = targetItem.bottom - scrollDelta; // Adjust for scroll
                    }

                    // For books, use the item's width; for dividers, use full width
                    if (targetRow.type === 'books') {
                        left = targetItem.left;
                        width = targetItem.right - targetItem.left;
                    }
                    indicator.style.display = 'block';
                    indicator.style.top = (top - 3) + 'px';
                    indicator.style.left = left + 'px';
                    indicator.style.width = width + 'px';
                    return;
                }

                // Fallback: position at column top
                indicator.style.display = 'block';
                indicator.style.top = (columnRect.top - scrollDelta - 3) + 'px';
                indicator.style.left = left + 'px';
                indicator.style.width = width + 'px';
            };

            // v3.14.0.x - Update ghost position via DOM (no React re-render)
            const updateGhostPosition = (x, y) => {
                dragPosRef.current = { x, y };
                const ghost = dragGhostRef.current;
                if (ghost) {
                    ghost.style.left = (x - 50) + 'px';
                    ghost.style.top = (y - 75) + 'px';
                }
            };

            const handleMouseMove = (e) => {
                if (draggedColumn) {
                    setDragCurrentPos({ x: e.clientX, y: e.clientY }); // Column drag still uses state (low volume)

                    const deltaX = e.clientX - dragStartPos.x;
                    const deltaY = e.clientY - dragStartPos.y;
                    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

                    if (distance > dragThreshold) {
                        if (!isDraggingColumn) {
                            setIsDraggingColumn(true);
                        }
                        const dropPos = calculateColumnDropPosition(e);
                        setColumnDropTarget(dropPos);
                    }
                    return;
                }

                if (!draggedBook) return;

                // v3.14.0.x - Update ghost position via DOM (no React re-render)
                updateGhostPosition(e.clientX, e.clientY);

                const deltaX = e.clientX - dragStartPos.x;
                const deltaY = e.clientY - dragStartPos.y;
                const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

                if (distance > dragThreshold) {
                    if (!isDragging) {
                        setIsDragging(true);
                        // v3.14.0.r - Build column indexes once at drag start for O(log R) lookup
                        buildAllColumnIndexes();
                    }

                    const target = e.target.closest('[data-column-id]');
                    if (target) {
                        const columnId = target.dataset.columnId;
                        // v3.14.0.g - Use cursor position for drop detection (matches ghost center)
                        const dropPos = calculateDropPosition(e, columnId);

                        // v3.14.0.w - Update ref instead of state to avoid React re-renders
                        dropTargetRef.current = dropPos;
                        updateIndicatorPosition();

                        // v3.14.0.h - Debug logging when drop target changes
                        const prevDropTarget = prevDropTargetRef.current;
                        const dropTargetChanged = !prevDropTarget ||
                            prevDropTarget.columnId !== dropPos.columnId ||
                            prevDropTarget.index !== dropPos.index;

                        if (dropTargetChanged) {
                            prevDropTargetRef.current = dropPos;
                        }

                        // v3.12.0.c - Auto-scroll when dragging near column edges
                        // Use dragged book position (center of ghost) instead of cursor position
                        // Scroll speed proportional to proximity (closer = faster)
                        const columnElement = target.querySelector('.overflow-y-auto');
                        if (columnElement) {
                            const rect = columnElement.getBoundingClientRect();
                            const edgeThreshold = 100; // pixels from top/bottom to trigger scroll
                            const minScrollSpeed = 2; // pixels per interval at threshold edge
                            const maxScrollSpeed = 20; // pixels per interval at column edge
                            const scrollInterval = 50; // milliseconds

                            // Calculate dragged book's center position (ghost is at dragPosRef.current.y - 75, with height ~150px)
                            // v3.14.0.x - Use ref instead of state
                            const draggedBookCenterY = dragPosRef.current.y;

                            const distanceFromTop = draggedBookCenterY - rect.top;
                            const distanceFromBottom = rect.bottom - draggedBookCenterY;

                            // Clear existing auto-scroll interval
                            if (autoScrollInterval) {
                                clearInterval(autoScrollInterval);
                                setAutoScrollInterval(null);
                            }

                            // Start scrolling up if book center near top edge
                            if (distanceFromTop < edgeThreshold && distanceFromTop > 0) {
                                // Calculate proportional speed: closer to edge = faster
                                // distanceFromTop: 0px (at edge) → 100px (threshold edge)
                                // speed: maxScrollSpeed (at edge) → minScrollSpeed (threshold edge)
                                const proximity = 1 - (distanceFromTop / edgeThreshold); // 1.0 at edge, 0.0 at threshold
                                const scrollSpeed = minScrollSpeed + (proximity * (maxScrollSpeed - minScrollSpeed));

                                const interval = setInterval(() => {
                                    columnElement.scrollTop = Math.max(0, columnElement.scrollTop - scrollSpeed);
                                    // v3.14.0.u - No longer rebuild index; scroll offset calculated dynamically
                                }, scrollInterval);
                                setAutoScrollInterval(interval);
                            }
                            // Start scrolling down if book center near bottom edge
                            else if (distanceFromBottom < edgeThreshold && distanceFromBottom > 0) {
                                // Calculate proportional speed: closer to edge = faster
                                const proximity = 1 - (distanceFromBottom / edgeThreshold);
                                const scrollSpeed = minScrollSpeed + (proximity * (maxScrollSpeed - minScrollSpeed));

                                const interval = setInterval(() => {
                                    columnElement.scrollTop = Math.min(
                                        columnElement.scrollHeight - columnElement.clientHeight,
                                        columnElement.scrollTop + scrollSpeed
                                    );
                                    // v3.14.0.u - No longer rebuild index; scroll offset calculated dynamically
                                }, scrollInterval);
                                setAutoScrollInterval(interval);
                            }
                        }
                    } else {
                        // v3.14.0.w - Clear ref and hide indicator
                        dropTargetRef.current = null;
                        updateIndicatorPosition();
                        // Clear auto-scroll if mouse leaves column
                        if (autoScrollInterval) {
                            clearInterval(autoScrollInterval);
                            setAutoScrollInterval(null);
                        }
                    }
                }
            };

            const handleMouseUp = (e) => {
                // v3.12.0 - Clear auto-scroll interval when drag ends
                if (autoScrollInterval) {
                    clearInterval(autoScrollInterval);
                    setAutoScrollInterval(null);
                }

                if (isDraggingColumn && draggedColumn && columnDropTarget !== null) {
                    const currentIndex = columns.findIndex(c => c.id === draggedColumn);
                    if (currentIndex !== -1 && currentIndex !== columnDropTarget) {
                        const newColumns = [...columns];
                        const [movedColumn] = newColumns.splice(currentIndex, 1);
                        const adjustedIndex = currentIndex < columnDropTarget ? columnDropTarget - 1 : columnDropTarget;
                        newColumns.splice(adjustedIndex, 0, movedColumn);
                        setColumns(newColumns);
                        // v4.8.0 - Record action for undo
                        recordAction({
                            type: 'REORDER_COLUMNS',
                            columnId: draggedColumn,
                            fromIndex: currentIndex,
                            toIndex: adjustedIndex
                        });
                    }

                    setDraggedColumn(null);
                    setIsDraggingColumn(false);
                    setColumnDropTarget(null);
                    return;
                }

                // v3.14.0.w - Read from ref instead of state
                const dropTarget = dropTargetRef.current;

                if (!isDragging || !draggedBook || !dropTarget) {
                    setDraggedBook(null);
                    setDraggedFromColumn(null);
                    setIsDragging(false);
                    dropTargetRef.current = null;
                    updateIndicatorPosition();
                    setDraggedColumn(null);
                    setIsDraggingColumn(false);
                    setColumnDropTarget(null);
                    return;
                }

                const sourceColumn = columns.find(c => c.id === draggedFromColumn);
                const targetColumn = columns.find(c => c.id === dropTarget.columnId);

                if (!sourceColumn || !targetColumn) {
                    console.error('Invalid source or target column');
                    setDraggedBook(null);
                    setDraggedFromColumn(null);
                    setIsDragging(false);
                    dropTargetRef.current = null;
                    updateIndicatorPosition();
                    clearSelection();
                    return;
                }

                // v3.13.0 - Handle dividers (can move with their book group if selected)
                const isDivider = typeof draggedBook === 'object' && draggedBook.type === 'divider';

                // Determine which items to move
                let itemsToMove;
                if (isDivider) {
                    // v3.13.0 - If divider is selected, move divider + all books in its group
                    if (selectedDivider && selectedDivider.dividerId === draggedBook.id) {
                        // Build array: [divider, ...bookIds]
                        itemsToMove = [draggedBook, ...Array.from(selectedBooks)];
                    } else {
                        // Divider not selected: move alone
                        itemsToMove = [draggedBook];
                    }
                } else {
                    // Regular book: move selection or just this book
                    itemsToMove = (selectedBooks.size > 0 && selectedBooks.has(draggedBook.id)
                        ? Array.from(selectedBooks) // Move all selected books
                        : [draggedBook.id]); // Move just the dragged book
                }

                if (draggedFromColumn === dropTarget.columnId) {
                    // Same column: reorder
                    // v4.8.0 - Capture original positions for undo (books only, not dividers)
                    const currentCol = columns.find(c => c.id === draggedFromColumn);
                    const bookIdsToMove = itemsToMove.filter(item => typeof item !== 'object' || item.type !== 'divider');
                    const fromIndicesReorder = bookIdsToMove.map(bookId => currentCol.books.indexOf(bookId));
                    // v4.8.0 - Capture divider's original index for undo
                    const dividerFromIndex = isDivider ? currentCol.books.findIndex(b =>
                        typeof b === 'object' && b.type === 'divider' && b.id === draggedBook.id
                    ) : -1;

                    setColumns(columns.map(col => {
                        if (col.id === draggedFromColumn) {
                            const newBooks = [...col.books];

                            // v3.13.0 - Filter items to move (handle divider objects and book IDs)
                            const itemsToMoveFiltered = itemsToMove.filter(item => {
                                if (typeof item === 'object' && item.type === 'divider') {
                                    // Divider: check if exists in column
                                    return newBooks.some(b => typeof b === 'object' && b.type === 'divider' && b.id === item.id);
                                } else {
                                    // Book ID: check if exists in column
                                    return newBooks.includes(item);
                                }
                            });

                            // Remove all items to move
                            itemsToMoveFiltered.forEach(item => {
                                if (typeof item === 'object' && item.type === 'divider') {
                                    const idx = newBooks.findIndex(b => typeof b === 'object' && b.type === 'divider' && b.id === item.id);
                                    if (idx !== -1) newBooks.splice(idx, 1);
                                } else {
                                    const idx = newBooks.indexOf(item);
                                    if (idx !== -1) newBooks.splice(idx, 1);
                                }
                            });

                            // Calculate adjusted insert index
                            let adjustedIndex = dropTarget.index;
                            itemsToMoveFiltered.forEach(item => {
                                let originalIndex;
                                if (typeof item === 'object' && item.type === 'divider') {
                                    originalIndex = col.books.findIndex(b => typeof b === 'object' && b.type === 'divider' && b.id === item.id);
                                } else {
                                    originalIndex = col.books.indexOf(item);
                                }
                                if (originalIndex !== -1 && originalIndex < dropTarget.index) {
                                    adjustedIndex--;
                                }
                            });

                            // Insert all items at the target position
                            newBooks.splice(adjustedIndex, 0, ...itemsToMoveFiltered);

                            return { ...col, books: newBooks };
                        }
                        return col;
                    }));

                    // v4.8.0 - Record REORDER_BOOKS action (only for books, not dividers)
                    if (bookIdsToMove.length > 0 && !isDivider) {
                        recordAction({
                            type: 'REORDER_BOOKS',
                            bookIds: [...bookIdsToMove],
                            colId: draggedFromColumn,
                            fromIndices: fromIndicesReorder,
                            toIndex: dropTarget.index
                        });
                    }
                    // v4.8.0 - Record REORDER_DIVIDER action
                    if (isDivider && dividerFromIndex !== -1) {
                        recordAction({
                            type: 'REORDER_DIVIDER',
                            dividerId: draggedBook.id,
                            dividerLabel: draggedBook.label,
                            colId: draggedFromColumn,
                            fromIndex: dividerFromIndex,
                            toIndex: dropTarget.index
                        });
                    }
                } else {
                    // Cross-column: move items (dividers can only move within same column)
                    if (isDivider) {
                        console.log('Dividers cannot be moved between columns');
                        setDraggedBook(null);
                        setDraggedFromColumn(null);
                        setIsDragging(false);
                        dropTargetRef.current = null;
                        updateIndicatorPosition();
                        return;
                    }

                    // v4.8.0 - Capture original positions for undo
                    const sourceCol = columns.find(c => c.id === draggedFromColumn);
                    const targetCol = columns.find(c => c.id === dropTarget.columnId);
                    const fromIndices = itemsToMove.map(bookId => sourceCol.books.indexOf(bookId));
                    const actualToIndex = Math.min(dropTarget.index, targetCol.books.length);

                    setColumns(columns.map(col => {
                        if (col.id === draggedFromColumn) {
                            // Remove books from source column
                            return { ...col, books: col.books.filter(id => !itemsToMove.includes(id)) };
                        }
                        if (col.id === dropTarget.columnId) {
                            // Add books to target column
                            const newBooks = [...col.books];
                            const insertIndex = Math.min(dropTarget.index, newBooks.length);
                            newBooks.splice(insertIndex, 0, ...itemsToMove);
                            return { ...col, books: newBooks };
                        }
                        return col;
                    }));

                    // v4.8.0 - Record action for undo
                    recordAction({
                        type: 'MOVE_BOOKS',
                        bookIds: [...itemsToMove],
                        fromColId: draggedFromColumn,
                        toColId: dropTarget.columnId,
                        fromIndices,
                        toIndex: actualToIndex
                    });
                }

                new Image().src = 'https://readerwrangler.goatcounter.com/count?p=/event/book-dragged';
                setDraggedBook(null);
                setDraggedFromColumn(null);
                setIsDragging(false);
                dropTargetRef.current = null;
                updateIndicatorPosition();
                clearSelection();
            };

            const getAllCollectionNames = () => {
                const collectionNames = new Set();
                books.forEach(book => {
                    if (book.collections && book.collections.length > 0) {
                        book.collections.forEach(c => collectionNames.add(c.name));
                    }
                });
                return Array.from(collectionNames).sort();
            };

            const getAllSeriesNames = () => {
                const seriesNames = new Set();
                books.forEach(book => {
                    if (book.series && book.series.trim() !== '') {
                        seriesNames.add(book.series);
                    }
                });
                return Array.from(seriesNames).sort();
            };

            const filteredBooks = (bookIds) => {
                // Check if any filter is active (needed inside function scope for divider hiding)
                const filtersActive = !!(searchTerm || readStatusFilter || collectionFilter ||
                    ratingFilter || wishlistFilter || ownershipFilter || seriesFilter || dateFrom || dateTo);

                const result = bookIds.map(item => {
                    // v3.11.0 - Handle dividers (pass through as-is)
                    if (typeof item === 'object' && item.type === 'divider') {
                        return item;
                    }
                    // Regular book ID - look up book object
                    return books.find(b => b.id === item);
                }).filter(book => {
                    // v3.11.0 - Dividers always pass through filters (will be post-processed below)
                    if (typeof book === 'object' && book.type === 'divider') return true;

                    if (!book) return false;

                    // Text search filter
                    const matchesSearch = !searchTerm ||
                        book.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        book.author.toLowerCase().includes(searchTerm.toLowerCase());

                    // Read status filter
                    const matchesReadStatus = !readStatusFilter || book.readStatus === readStatusFilter;

                    // Collection filter
                    let matchesCollection = true;
                    if (collectionFilter) {
                        if (collectionFilter === 'UNCOLLECTED') {
                            matchesCollection = !book.collections || book.collections.length === 0;
                        } else {
                            matchesCollection = book.collections &&
                                book.collections.some(c => c.name === collectionFilter);
                        }
                    }

                    // Rating filter (NEW v3.8.0)
                    const matchesRating = !ratingFilter || (book.rating >= parseFloat(ratingFilter));

                    // Wishlist filter (NEW v3.8.0)
                    const matchesWishlist = !wishlistFilter ||
                        (wishlistFilter === 'wishlist' && book.isWishlist) ||
                        (wishlistFilter === 'owned' && !book.isWishlist);

                    // Ownership type filter (NEW v4.9.0)
                    const matchesOwnership = !ownershipFilter ||
                        (book.ownershipType || 'purchased') === ownershipFilter;

                    // Hidden filter (NEW v4.1.0.d) - hide hidden books unless showHidden is checked
                    const matchesHidden = showHidden || !book.isHidden;

                    // Series filter (NEW v3.8.0.k)
                    let matchesSeries = true;
                    if (seriesFilter) {
                        if (seriesFilter === 'NOT_IN_SERIES') {
                            matchesSeries = !book.series || book.series.trim() === '';
                        } else {
                            matchesSeries = book.series && book.series === seriesFilter;
                        }
                    }

                    // Date range filter (NEW v3.8.0.k, fixed v3.8.0.l for epoch milliseconds and field name)
                    let matchesDateRange = true;
                    if (dateFrom || dateTo) {
                        if (book.acquired) {
                            // Convert epoch milliseconds to YYYY-MM-DD
                            const bookDate = new Date(parseInt(book.acquired)).toISOString().split('T')[0];
                            const fromDate = dateFrom || '0000-01-01'; // Default to earliest date if From is empty
                            const toDate = dateTo || new Date().toISOString().split('T')[0]; // Default to today if To is empty

                            if (bookDate < fromDate || bookDate > toDate) {
                                matchesDateRange = false;
                            }
                        } else {
                            matchesDateRange = false; // Exclude books without acquisition dates when filter is active
                        }
                    }

                    return matchesSearch && matchesReadStatus && matchesCollection && matchesRating && matchesWishlist && matchesOwnership && matchesHidden && matchesSeries && matchesDateRange;
                });

                // v4.15.3 - Post-process: hide dividers with no books under them when filters active
                if (!filtersActive) return result;

                // Walk backwards through array, tracking if we've seen a book since last divider
                // A divider is kept only if there's at least one book between it and the next divider (or end)
                // v4.15.4.a - Also keep divider if its label matches searchTerm
                let hasBookAfter = false;
                const keepDivider = new Set();
                for (let i = result.length - 1; i >= 0; i--) {
                    const item = result[i];
                    if (item && item.type === 'divider') {
                        if (hasBookAfter) {
                            keepDivider.add(item.id);
                        }
                        // v4.15.4.a - Keep divider if its label matches search term
                        if (searchTerm && item.label && item.label.toLowerCase().includes(searchTerm.toLowerCase())) {
                            keepDivider.add(item.id);
                        }
                        hasBookAfter = false; // Reset for next divider section
                    } else if (item) {
                        hasBookAfter = true;
                    }
                }

                return result.filter(item => {
                    if (item && item.type === 'divider') {
                        return keepDivider.has(item.id);
                    }
                    return true;
                });
            };

            // v4.0.1 - Keep filteredBooksRef updated for Ctrl+A handler
            filteredBooksRef.current = filteredBooks;

            // v4.16.0.a - Check if any filter is active (for hiding empty columns/dividers)
            const hasActiveFilters = !!(searchTerm || readStatusFilter || collectionFilter ||
                ratingFilter || wishlistFilter || ownershipFilter || seriesFilter || dateFrom || dateTo);

            // Calculate combined urgency from Library and Collections status
            // Urgency is based ONLY on Load status (what's in the app right now)
            const getUrgencyInfo = () => {
                const libLoad = libraryStatus.loadStatus;
                const colLoad = collectionsStatus.loadStatus;

                // Priority: empty/obsolete > stale > unknown > fresh
                const urgencyOrder = { empty: 4, obsolete: 3, stale: 2, unknown: 1, fresh: 0 };
                const worstStatus = urgencyOrder[libLoad] >= urgencyOrder[colLoad] ? libLoad : colLoad;

                const urgencyMap = {
                    empty: { icon: '🛑', text: 'Must act', color: 'text-red-600', tooltip: 'Please click to see required action(s)' },
                    obsolete: { icon: '🛑', text: 'Obsolete', color: 'text-red-600', tooltip: 'Please click to see required action(s)' },
                    stale: { icon: '⚠️', text: 'Stale', color: 'text-orange-600', tooltip: 'Please click to see suggested action(s)' },
                    unknown: { icon: '❓', text: 'Unknown', color: 'text-gray-500', tooltip: 'Please click to see available info' },
                    fresh: { icon: '✅', text: 'Fresh', color: 'text-green-700', tooltip: 'No actions required' }
                };

                return urgencyMap[worstStatus] || urgencyMap.unknown;
            };

            const renderStatusIndicator = () => {
                const urgency = getUrgencyInfo();
                const isLoading = syncStatus === 'loading';

                if (isLoading) {
                    return (
                        <span className="text-sm text-gray-500">
                            <span className="inline-block animate-spin mr-1">⏳</span>
                            Loading...
                        </span>
                    );
                }

                return (
                    <span
                        className={`text-sm ${urgency.color} status-indicator`}
                        onClick={() => setStatusModalOpen(true)}
                        title={urgency.tooltip}
                    >
                        <span className="mr-1">{urgency.icon}</span>
                        Data Status: {urgency.text}
                    </span>
                );
            };

            return (
                <div className="h-screen flex flex-col bg-gradient-to-br from-blue-50 to-blue-100 text-gray-900" 
                     onMouseMove={handleMouseMove} 
                     onMouseUp={handleMouseUp}>
                    <div className="bg-white border-b border-gray-300 p-4 shadow-sm">
                        <div className="flex justify-between items-start mb-4">
                            <div className="flex items-start gap-3">
                                <img src="icons/ReaderWranglerWordlessXparent.png" alt="" style={{ width: '84px', height: 'auto', marginTop: '2px' }} />
                                <div>
                                    <h1 className="app-title">
                                        <a href="index.html" style={{ color: 'inherit', textDecoration: 'none' }} title="Wrangle your reader chaos">
                                            ReaderWrangler™
                                        </a>
                                        <span style={{ fontFamily: "'Lato', sans-serif", fontWeight: 300, color: '#64748b', fontSize: '0.875rem', marginLeft: '0.75rem' }}>v{APP_VERSION}</span>
                                    </h1>
                                    <p className="attribution">A product of Alloid Labs™</p>
                                    <p className="tagline">Your books, your order</p>
                                </div>
                            </div>
                            <div className="flex gap-2 items-center">
                                {renderStatusIndicator()}
                                <span className="text-gray-300 mx-1">|</span>
                                <button onClick={importLibrary}
                                        className="px-3 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded-lg text-sm font-medium"
                                        title="Import library file - merges with existing books, preserving your organization. Also restores from backup files.">
                                    📥 Import
                                </button>
                                <button onClick={exportLibrary}
                                        className="px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium"
                                        disabled={books.length === 0}
                                        title="Save backup with your organization">
                                    💾 Export
                                </button>
                                <button onClick={clearLibrary}
                                        className="px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium"
                                        title="Click for details about what will be reset">
                                    🗑️ Reset App
                                </button>
                                <button 
                                    onClick={() => setSettingsOpen(!settingsOpen)}
                                    className="text-gray-600 hover:text-gray-700 text-2xl font-bold w-8 h-8 flex items-center justify-center rounded-full bg-gray-200 hover:bg-gray-300"
                                    title="Settings">
                                    ⚙️
                                </button>
                                <button 
                                    onClick={() => setHelpOpen(!helpOpen)}
                                    className="text-blue-700 hover:text-blue-800 text-2xl font-bold w-8 h-8 flex items-center justify-center rounded-full bg-blue-100 hover:bg-blue-200"
                                    title="Help & Instructions">
                                    ?
                                </button>
                            </div>
                        </div>

                        {/* Filter Panel (v4.15.5.e - Three-state toggle: Filters → More Filters → Hide) */}
                        <div className="flex flex-wrap gap-2 items-start mb-4">
                            {/* Three-State Filter Toggle Button - fixed width to prevent jumping */}
                            <button
                                onClick={() => {
                                    // v4.15.5.e - Three-state cycle: closed → primary → advanced → closed
                                    if (!filterPanelOpen) {
                                        setFilterPanelOpen(true);
                                        setShowAdvancedFilters(false);
                                    } else if (!showAdvancedFilters) {
                                        setShowAdvancedFilters(true);
                                    } else {
                                        setFilterPanelOpen(false);
                                        setShowAdvancedFilters(false);
                                    }
                                }}
                                className={`px-4 py-2 border rounded-lg flex items-center justify-start gap-2 min-w-[150px] ${
                                    (searchTerm || readStatusFilter || collectionFilter || ratingFilter || wishlistFilter || seriesFilter || dateFrom || dateTo)
                                    ? `border-blue-500 text-blue-700 font-semibold ${!filterPanelOpen ? 'filter-button-active' : ''}`
                                    : 'border-gray-300 text-gray-700'
                                }`}
                                title={!filterPanelOpen ? 'Show filters' : !showAdvancedFilters ? 'Show more filters' : 'Hide filters'}>
                                🔍 {!filterPanelOpen ? 'Filters' : !showAdvancedFilters ? 'More Filters' : 'Hide'}
                                {/* v4.15.6.g: Use datePreset for count instead of dateFrom/dateTo */}
                                {(searchTerm || readStatusFilter || collectionFilter || ratingFilter || wishlistFilter || seriesFilter || datePreset) &&
                                    ` (${[searchTerm, readStatusFilter, collectionFilter, ratingFilter, wishlistFilter, seriesFilter, datePreset].filter(Boolean).length})`}
                            </button>

                            {/* Book count - only when panel closed (v4.15.5.b) */}
                            {books.length > 0 && !filterPanelOpen && <span className="text-base text-gray-500 py-2">({books.length} books)</span>}

                            {/* FILTER TABLE - v4.15.5.j - HTML table with tuned column widths */}
                            {filterPanelOpen && (
                                <table className="border-collapse" style={{borderSpacing: '4px'}}>
                                    <colgroup>
                                        <col /> {/* Column 1: Search/Rating - auto width */}
                                        <col style={{width: '148px'}} /> {/* Column 2: Status/Series */}
                                        <col style={{width: '188px'}} /> {/* Column 3: Collection/Wishlist */}
                                        <col style={{width: '140px'}} /> {/* Column 4: Type */}
                                        <col /> {/* Column 5: Date From - auto */}
                                        <col /> {/* Column 6: Date To - auto */}
                                    </colgroup>
                                    <tbody>
                                        {/* ROW 1: Primary Filters */}
                                        <tr className="align-middle">
                                            {/* Search with icon - 50px left padding to align box with Rating below */}
                                            <td className="pr-2 py-1" style={{paddingLeft: '50px'}}>
                                                <div className="relative flex items-center">
                                                    <span className="absolute left-3 text-gray-400" title="Search for Title, Author, Column or Divider">🔍</span>
                                                    <input type="text"
                                                           placeholder="Title or author..."
                                                           value={searchTerm}
                                                           onChange={(e) => setSearchTerm(e.target.value)}
                                                           title="Search for Title, Author, Column or Divider"
                                                           aria-label="Search by title, author, column or divider"
                                                           className="w-full pl-10 pr-8 py-2 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm" />
                                                    {searchTerm && (
                                                        <button
                                                            onClick={() => setSearchTerm('')}
                                                            className="absolute right-2 text-gray-400 hover:text-gray-600 text-lg"
                                                            title="Clear search">
                                                            ×
                                                        </button>
                                                    )}
                                                </div>
                                            </td>

                                            {/* Read Status */}
                                            <td className="px-2 py-1">
                                                <div className="flex items-center gap-1">
                                                    <span title="Read Status">📖</span>
                                                    <select
                                                        value={readStatusFilter}
                                                        onChange={(e) => setReadStatusFilter(e.target.value)}
                                                        aria-label="Filter by read status"
                                                        className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm">
                                                        <option value="">All Status</option>
                                                        <option value="READ">✓ Read</option>
                                                        <option value="UNREAD">○ Unread</option>
                                                        <option value="UNKNOWN">? Unknown</option>
                                                    </select>
                                                </div>
                                            </td>

                                            {/* Collection */}
                                            <td className="px-2 py-1">
                                                <div className="flex items-center gap-1">
                                                    <span title="Collection">🗂️</span>
                                                    <select
                                                        value={collectionFilter}
                                                        onChange={(e) => setCollectionFilter(e.target.value)}
                                                        aria-label="Filter by collection"
                                                        className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm">
                                                        <option value="">All Collections</option>
                                                        <option value="UNCOLLECTED">📚 Uncollected</option>
                                                        {getAllCollectionNames().map(name => (
                                                            <option key={name} value={name}>{name}</option>
                                                        ))}
                                                    </select>
                                                </div>
                                            </td>

                                            {/* Empty cells for columns 4-6 in row 1 */}
                                            <td></td>
                                            <td></td>
                                            <td></td>
                                        </tr>

                                        {/* ROW 2: Advanced Filters (only shown when expanded) */}
                                        {showAdvancedFilters && (
                                            <tr className="align-middle">
                                                {/* Rating - left padding to match Search above */}
                                                <td className="pr-2 py-1 pl-6">
                                                    <div className="flex items-center gap-1">
                                                        <span title="Rating">⭐</span>
                                                        <select
                                                            value={ratingFilter}
                                                            onChange={(e) => setRatingFilter(e.target.value)}
                                                            aria-label="Filter by rating"
                                                            className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm">
                                                            <option value="">All Ratings</option>
                                                            <option value="5">5★</option>
                                                            <option value="4">4+★</option>
                                                            <option value="3">3+★</option>
                                                            <option value="2">2+★</option>
                                                            <option value="1">1+★</option>
                                                        </select>
                                                    </div>
                                                </td>

                                                {/* Series */}
                                                <td className="px-2 py-1">
                                                    <div className="flex items-center gap-1">
                                                        <span title="Series">📚</span>
                                                        <select
                                                            value={seriesFilter}
                                                            onChange={(e) => setSeriesFilter(e.target.value)}
                                                            aria-label="Filter by series"
                                                            className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm">
                                                            <option value="">All Series</option>
                                                            <option value="NOT_IN_SERIES">📖 Not in Series</option>
                                                            {getAllSeriesNames().map(name => (
                                                                <option key={name} value={name}>{name}</option>
                                                            ))}
                                                        </select>
                                                    </div>
                                                </td>

                                                {/* Wishlist */}
                                                <td className="px-2 py-1">
                                                    <div className="flex items-center gap-1">
                                                        <span title="Wishlist">❤️</span>
                                                        <select
                                                            value={wishlistFilter}
                                                            onChange={(e) => setWishlistFilter(e.target.value)}
                                                            aria-label="Filter by wishlist status"
                                                            className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm">
                                                            <option value="">All Books</option>
                                                            <option value="owned">Owned Only</option>
                                                            <option value="wishlist">Wishlist Only</option>
                                                        </select>
                                                    </div>
                                                </td>

                                                {/* Ownership Type */}
                                                <td className="px-2 py-1">
                                                    <div className="flex items-center gap-1">
                                                        <span title="Ownership">🏷️</span>
                                                        <select
                                                            value={ownershipFilter}
                                                            onChange={(e) => setOwnershipFilter(e.target.value)}
                                                            aria-label="Filter by ownership type"
                                                            className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm">
                                                            <option value="">All Types</option>
                                                            <option value="purchased">Purchased</option>
                                                            <option value="sample">Sample</option>
                                                            <option value="borrowed">Borrowed</option>
                                                            <option value="prime">Prime</option>
                                                            <option value="kindleUnlimited">Kindle Unlimited</option>
                                                            <option value="koll">KOLL</option>
                                                            <option value="comixology">Comixology</option>
                                                        </select>
                                                    </div>
                                                </td>

                                                {/* Date Preset with Clear button (v4.15.6.c) */}
                                                <td className="px-2 py-1" colSpan="2">
                                                    <div className="flex items-center gap-2">
                                                        <span title="Acquisition Date">📅</span>
                                                        <select
                                                            value={datePreset}
                                                            onChange={(e) => {
                                                                const newPreset = e.target.value;
                                                                // v4.15.6.g: Clear dates when switching to Custom (fresh start)
                                                                if (newPreset === 'custom') {
                                                                    setDateFrom('');
                                                                    setDateTo('');
                                                                }
                                                                setDatePreset(newPreset);
                                                            }}
                                                            aria-label="Filter by acquisition date"
                                                            style={{maxWidth: '150px'}}
                                                            className="px-3 py-2 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm">
                                                            <option value="">All Dates</option>
                                                            <option value="last30">Last 30 Days</option>
                                                            <option value="last90">Last 90 Days</option>
                                                            <option value="lastYear">Last 12 Months</option>
                                                            {/* Dynamic year options: current year and 2 previous years (v4.15.6.d) */}
                                                            {[0, 1, 2].map(offset => {
                                                                const year = new Date().getFullYear() - offset;
                                                                return <option key={year} value={`year${year}`}>{year}</option>;
                                                            })}
                                                            <option value="custom">Custom...</option>
                                                        </select>
                                                        {datePreset && (
                                                            <button
                                                                onClick={() => {
                                                                    setDatePreset('');
                                                                    setDateFrom('');
                                                                    setDateTo('');
                                                                }}
                                                                className="text-blue-700 hover:text-blue-900 font-semibold text-sm whitespace-nowrap"
                                                                title="Clear date filter">
                                                                Clear
                                                            </button>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        )}

                                        {/* ROW 3: Showing count, Show Hidden, and Custom date pickers (v4.15.6.c) */}
                                        <tr className="align-middle">
                                            {/* Showing - 50px left padding to align with boxes above */}
                                            <td className="pr-2 py-1" style={{paddingLeft: '50px'}}>
                                                <span className="text-sm text-gray-600">
                                                    Showing: {columns.reduce((sum, col) => sum + filteredBooks(col.books).filter(item => !(item && item.type === 'divider')).length, 0)} of {books.length} books
                                                </span>
                                            </td>
                                            <td className="px-2 py-1">
                                                <label className="flex items-center gap-2 cursor-pointer text-sm">
                                                    <input
                                                        type="checkbox"
                                                        checked={showHidden}
                                                        onChange={(e) => setShowHidden(e.target.checked)}
                                                        className="w-4 h-4 rounded border-gray-300 text-blue-700 focus:ring-blue-500"
                                                    />
                                                    <span className="text-gray-600">Show Hidden</span>
                                                </label>
                                            </td>
                                            {/* Custom date pickers - only when Custom preset selected (columns 3-6) */}
                                            {showAdvancedFilters && datePreset === 'custom' ? (
                                                <>
                                                    <td></td>
                                                    <td></td>
                                                    <td className="px-2 py-1">
                                                        <div className="flex items-center gap-1">
                                                            <span className="text-sm text-gray-500">From:</span>
                                                            <input
                                                                type="date"
                                                                value={dateFrom}
                                                                onChange={(e) => setDateFrom(e.target.value)}
                                                                aria-label="Acquisition date from"
                                                                className="px-2 py-2 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                                                            />
                                                        </div>
                                                    </td>
                                                    <td className="pl-2 py-1">
                                                        <div className="flex items-center gap-1">
                                                            <span className="text-sm text-gray-500">To:</span>
                                                            <input
                                                                type="date"
                                                                value={dateTo}
                                                                onChange={(e) => setDateTo(e.target.value)}
                                                                aria-label="Acquisition date to"
                                                                className="px-2 py-2 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                                                            />
                                                        </div>
                                                    </td>
                                                </>
                                            ) : (
                                                <>
                                                    <td></td>
                                                    <td></td>
                                                    <td></td>
                                                    <td></td>
                                                </>
                                            )}
                                        </tr>
                                    </tbody>
                                </table>
                            )}
                        </div>

                        {/* Active Filters Banner (v3.8.0.k - moved below Filter Panel, v4.15.6.m - use datePreset) */}
                        {(searchTerm || readStatusFilter || collectionFilter || ratingFilter || wishlistFilter || ownershipFilter || seriesFilter || datePreset) && (
                            <div className="bg-blue-100 border border-blue-300 rounded-lg px-4 py-2 mb-4 flex items-center justify-between">
                                <div className="flex items-center gap-2 flex-wrap text-sm">
                                    <span className="font-semibold">🔍 Active:</span>
                                    {searchTerm && <span>Search: "{searchTerm}"</span>}
                                    {searchTerm && (readStatusFilter || collectionFilter || ratingFilter || wishlistFilter || seriesFilter || datePreset) && <span>|</span>}
                                    {readStatusFilter && <span>Read: {readStatusFilter}</span>}
                                    {readStatusFilter && (collectionFilter || ratingFilter || wishlistFilter || seriesFilter || datePreset) && <span>|</span>}
                                    {collectionFilter && <span>Collection: {collectionFilter === 'UNCOLLECTED' ? 'Uncollected' : collectionFilter}</span>}
                                    {collectionFilter && (ratingFilter || wishlistFilter || seriesFilter || datePreset) && <span>|</span>}
                                    {ratingFilter && <span>Rating: {ratingFilter}+★</span>}
                                    {ratingFilter && (wishlistFilter || seriesFilter || datePreset) && <span>|</span>}
                                    {wishlistFilter && <span>Wishlist: {wishlistFilter === 'owned' ? 'Owned Only' : 'Wishlist Only'}</span>}
                                    {wishlistFilter && (ownershipFilter || seriesFilter || datePreset) && <span>|</span>}
                                    {ownershipFilter && <span>Ownership: {ownershipFilter === 'kindleUnlimited' ? 'Kindle Unlimited' : ownershipFilter.charAt(0).toUpperCase() + ownershipFilter.slice(1)}</span>}
                                    {ownershipFilter && (seriesFilter || datePreset) && <span>|</span>}
                                    {seriesFilter && <span>Series: {seriesFilter === 'NOT_IN_SERIES' ? 'Not in Series' : seriesFilter}</span>}
                                    {seriesFilter && datePreset && <span>|</span>}
                                    {datePreset && <span>Date: {
                                        datePreset === 'custom' ? `${dateFrom || '...'} to ${dateTo || '...'}` :
                                        datePreset === 'last30' ? 'Last 30 Days' :
                                        datePreset === 'last90' ? 'Last 90 Days' :
                                        datePreset === 'lastYear' ? 'Last 12 Months' :
                                        datePreset.startsWith('year') ? datePreset.substring(4) :
                                        datePreset
                                    }</span>}
                                </div>
                                <button
                                    onClick={() => {
                                        setSearchTerm('');
                                        setReadStatusFilter('');
                                        setCollectionFilter('');
                                        setRatingFilter('');
                                        setWishlistFilter('');
                                        setOwnershipFilter('');
                                        setSeriesFilter('');
                                        setDatePreset('');
                                        setDateFrom('');
                                        setDateTo('');
                                    }}
                                    className="text-blue-700 hover:text-blue-900 font-semibold text-sm whitespace-nowrap">
                                    Clear All ×
                                </button>
                            </div>
                        )}
                    </div>

                    {statusModalOpen && (() => {
                        // Schema v2.0: Simplified informational modal (no action buttons)
                        // Count dividers in columns - dividers are stored as objects {type: 'divider', id, label}
                        const dividerCount = columns.reduce((count, col) =>
                            count + col.books.filter(item => typeof item === 'object' && item.type === 'divider').length, 0);
                        const booksWithCollections = books.filter(b => b.collections && b.collections.length > 0).length;

                        return (
                        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => setStatusModalOpen(false)}>
                            <div className="bg-white rounded-lg shadow-2xl max-w-md w-full" onClick={(e) => e.stopPropagation()}>
                                {/* Header */}
                                <div className="flex justify-between items-start p-4 bg-gray-200 rounded-t-lg border-b border-gray-300">
                                    <h2 className="text-xl font-bold text-gray-900">Data Status</h2>
                                    <button onClick={() => setStatusModalOpen(false)} className="text-gray-500 hover:text-gray-700 text-2xl leading-none">×</button>
                                </div>

                                {/* Content - informational only */}
                                <div className="p-6 space-y-4">
                                    {/* Library info - v4.15.1.c: Red text for non-fresh status */}
                                    <div className="border-b border-gray-200 pb-3">
                                        <p className="text-sm text-gray-700">
                                            📚 <strong>Library:</strong> {books.length > 0
                                                ? `${books.length} books`
                                                : <span className="text-red-600 font-medium">Not loaded</span>}
                                        </p>
                                        {libraryStatus.loadDate && (
                                            <p className={`text-xs mt-1 ${libraryStatus.loadStatus === 'fresh' ? 'text-gray-500' : libraryStatus.loadStatus === 'stale' ? 'text-orange-500' : 'text-red-500'}`}>
                                                Fetched: {new Date(libraryStatus.loadDate).toLocaleString()}
                                            </p>
                                        )}
                                    </div>

                                    {/* Collections info - v4.15.1.c: Red text for non-fresh status */}
                                    <div className="border-b border-gray-200 pb-3">
                                        <p className="text-sm text-gray-700">
                                            📁 <strong>Collections:</strong> {booksWithCollections > 0
                                                ? `${booksWithCollections} books with collection data`
                                                : <span className="text-red-600 font-medium">Not loaded</span>}
                                        </p>
                                        {collectionsStatus.loadDate && (
                                            <p className={`text-xs mt-1 ${collectionsStatus.loadStatus === 'fresh' ? 'text-gray-500' : collectionsStatus.loadStatus === 'stale' ? 'text-orange-500' : 'text-red-500'}`}>
                                                Fetched: {new Date(collectionsStatus.loadDate).toLocaleString()}
                                            </p>
                                        )}
                                    </div>

                                    {/* Organization stats */}
                                    <div>
                                        <p className="text-sm text-gray-700">
                                            📊 <strong>Organization:</strong> {columns.length} column{columns.length !== 1 ? 's' : ''}, {dividerCount} divider{dividerCount !== 1 ? 's' : ''}
                                        </p>
                                    </div>

                                    {/* Help text */}
                                    {books.length === 0 && (
                                        <div className="bg-blue-50 border border-blue-200 rounded p-3 text-sm text-gray-700">
                                            <p>Use the <strong>Import</strong> button to load your library file.</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                        );
                    })()}

                    {resetConfirmOpen && (
                        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => setResetConfirmOpen(false)}>
                            <div className="bg-white rounded-lg shadow-2xl max-w-md w-full" onClick={(e) => e.stopPropagation()}>
                                <div className="flex justify-between items-start p-4 bg-gray-200 rounded-t-lg border-b border-gray-300">
                                    <h2 className="text-xl font-bold text-gray-900">Reset App Confirmation</h2>
                                    <button onClick={() => setResetConfirmOpen(false)} className="text-gray-500 hover:text-gray-700 text-2xl font-bold">×</button>
                                </div>
                                <div className="p-6 space-y-4">
                                    <p className="text-gray-800 font-semibold">This will completely reset the app to its initial unused state.</p>
                                    <div className="text-gray-700">
                                        <p className="font-semibold mb-2">This will:</p>
                                        <ul className="list-disc list-inside space-y-1 ml-2">
                                            <li>Unload library and collections</li>
                                            <li>Remove all columns and organization</li>
                                            <li>Reset all filters</li>
                                        </ul>
                                    </div>
                                    <div className="bg-blue-50 border border-blue-200 rounded p-3 text-sm text-gray-700">
                                        <p className="mb-2">Your library/collections files on disk will NOT be deleted. You can reload them anytime.</p>
                                    </div>
                                    <div className="bg-yellow-50 border border-yellow-300 rounded p-3 text-sm">
                                        <p className="font-semibold text-gray-800">💡 Tip: Use the Export button first to save your organization before resetting.</p>
                                    </div>
                                    <div className="flex gap-3 justify-end pt-2">
                                        <button
                                            onClick={() => setResetConfirmOpen(false)}
                                            className="px-4 py-2 bg-gray-300 hover:bg-gray-400 text-gray-800 rounded-lg font-medium">
                                            Cancel
                                        </button>
                                        <button
                                            onClick={confirmReset}
                                            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium">
                                            Reset App
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {insertDividerOpen && (
                        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => setInsertDividerOpen(null)}>
                            <div className="bg-white rounded-lg shadow-2xl max-w-md w-full" onClick={(e) => e.stopPropagation()}>
                                <div className="flex justify-between items-start p-4 bg-gray-200 rounded-t-lg border-b border-gray-300">
                                    <h2 className="text-xl font-bold text-gray-900">Insert Divider</h2>
                                    <button onClick={() => setInsertDividerOpen(null)} className="text-gray-500 hover:text-gray-700 text-2xl font-bold">×</button>
                                </div>
                                <div className="p-6 space-y-4">
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-2">Divider Label</label>
                                        <input
                                            type="text"
                                            value={newDividerLabel}
                                            onChange={(e) => setNewDividerLabel(e.target.value)}
                                            onKeyPress={(e) => { if (e.key === 'Enter') insertDivider(insertDividerOpen); }}
                                            placeholder="e.g., Jerry Mitchell, Read Books, 5 Stars"
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            autoFocus
                                        />
                                    </div>
                                    <div className="bg-blue-50 border border-blue-200 rounded p-3 text-sm text-gray-700">
                                        <p>The divider will appear at the bottom of the column. You can drag it to any position.</p>
                                    </div>
                                    <div className="flex gap-3 justify-end pt-2">
                                        <button
                                            onClick={() => setInsertDividerOpen(null)}
                                            className="px-4 py-2 bg-gray-300 hover:bg-gray-400 text-gray-800 rounded-lg font-medium">
                                            Cancel
                                        </button>
                                        <button
                                            onClick={() => insertDivider(insertDividerOpen)}
                                            className="px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded-lg font-medium"
                                            disabled={!newDividerLabel.trim()}>
                                            Insert
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {settingsOpen && (
                        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => setSettingsOpen(false)}>
                            <div className="bg-white rounded-lg shadow-2xl p-6 max-w-md w-full" onClick={(e) => e.stopPropagation()}>
                                <div className="flex justify-between items-start mb-4">
                                    <h2 className="text-xl font-bold text-gray-900">Settings</h2>
                                    <button onClick={() => setSettingsOpen(false)} className="text-gray-500 hover:text-gray-700 text-2xl">×</button>
                                </div>
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                                            Cache Expiration for Ratings/Reviews (days)
                                        </label>
                                        <p className="text-xs text-gray-600 mb-2">
                                            Descriptions are cached forever. Ratings and reviews expire after this many days to stay fresh.
                                        </p>
                                        <input 
                                            type="number"
                                            min="1"
                                            max="365"
                                            value={settings.cacheExpirationDays}
                                            onChange={(e) => setSettings({...settings, cacheExpirationDays: parseInt(e.target.value) || 30})}
                                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        />
                                        <p className="text-xs text-gray-500 mt-1">
                                            Current: {settings.cacheExpirationDays} days
                                        </p>
                                    </div>
                                </div>
                                <div className="flex gap-2 justify-end mt-6">
                                    <button 
                                        onClick={() => setSettingsOpen(false)}
                                        className="px-4 py-2 bg-gray-300 hover:bg-gray-400 text-gray-800 rounded-lg">
                                        Cancel
                                    </button>
                                    <button 
                                        onClick={() => saveSettings(settings)}
                                        className="px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded-lg">
                                        Save
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {helpOpen && (
                        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => setHelpOpen(false)}>
                            <div className="bg-white rounded-lg shadow-2xl p-6 max-w-2xl max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                                <div className="flex justify-between items-start mb-4">
                                    <h2 className="text-xl font-bold text-gray-900">How to Use</h2>
                                    <button onClick={() => setHelpOpen(false)} className="text-gray-500 hover:text-gray-700 text-2xl">×</button>
                                </div>
                                <div className="space-y-4 text-sm text-gray-700">
                                    <div>
                                        <h3 className="font-semibold text-gray-900 mb-1">📚 Getting Your Books</h3>
                                        <ul className="list-disc list-inside space-y-1 ml-2">
                                            <li><strong>Install Bookmarklet:</strong> Visit the installer page (see README) and drag the bookmarklet to your toolbar</li>
                                            <li><strong>Run Fetcher:</strong> Go to your online library page and click the bookmarklet</li>
                                            <li><strong>Auto-saves:</strong> Fetcher creates library JSON in your Downloads</li>
                                            <li><strong>First Load:</strong> Click status indicator to load library</li>
                                            <li><strong>Updates:</strong> Run fetcher again, then sync when you see Stale indicator</li>
                                        </ul>
                                    </div>
                                    <div>
                                        <h3 className="font-semibold text-gray-900 mb-1">Status Indicator</h3>
                                        <ul className="list-disc list-inside space-y-1 ml-2">
                                            <li><strong>Fresh:</strong> Your library is up to date</li>
                                            <li><strong>Stale:</strong> New books available - click to load updated library</li>
                                            <li><strong>Click here to load library:</strong> Click to load your first library</li>
                                        </ul>
                                    </div>
                                    <div>
                                        <h3 className="font-semibold text-gray-900 mb-1">📚 Organizing Books</h3>
                                        <ul className="list-disc list-inside space-y-1 ml-2">
                                            <li><strong>View Details:</strong> Click a book cover to see full details</li>
                                            <li><strong>Move/Reorder:</strong> Drag a book to move it to another column or reorder within same column</li>
                                            <li><strong>Navigate:</strong> Use ← → arrows in book details to browse prev/next books</li>
                                            <li><strong>Group Series:</strong> Click "📚 Group Series Books" in book details</li>
                                        </ul>
                                    </div>
                                    <div>
                                        <h3 className="font-semibold text-gray-900 mb-1">📋 Managing Columns</h3>
                                        <ul className="list-disc list-inside space-y-1 ml-2">
                                            <li><strong>Create:</strong> Type name in field and click ➕ (or press Enter)</li>
                                            <li><strong>Rename:</strong> Double-click any column name to edit</li>
                                            <li><strong>Reorder:</strong> Drag any column header left/right</li>
                                            <li><strong>Sort:</strong> Click ⬆ button to sort books</li>
                                            <li><strong>Delete:</strong> Click ⌫ and choose where to move the books</li>
                                        </ul>
                                    </div>
                                    <div>
                                        <h3 className="font-semibold text-gray-900 mb-1">💾 Data Management</h3>
                                        <ul className="list-disc list-inside space-y-1 ml-2">
                                            <li><strong>Auto-saves:</strong> Everything persists automatically in your browser</li>
                                            <li><strong>Export:</strong> Download complete backup for safekeeping</li>
                                            <li><strong>Import:</strong> Merges library file with existing books, preserving organization. Also restores backups.</li>
                                            <li><strong>Reset App:</strong> Complete app reset to initial state (files on disk not affected)</li>
                                        </ul>
                                    </div>
                                    <div>
                                        <h3 className="font-semibold text-gray-900 mb-1">💰 Affiliate Links</h3>
                                        <ul className="list-disc list-inside space-y-1 ml-2">
                                            <li><strong>Amazon links:</strong> All "Open in Amazon" links use affiliate tracking</li>
                                            <li><strong>Supports development:</strong> If you purchase anything within 24 hours, it helps fund ReaderWrangler</li>
                                            <li><strong>No cost to you:</strong> Same prices, just helps keep the app free</li>
                                        </ul>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {deleteDialogOpen && (
                        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                            <div className="bg-white rounded-lg shadow-2xl p-6 max-w-md" onClick={(e) => e.stopPropagation()}>
                                <h2 className="text-xl font-bold text-gray-900 mb-4">Delete Column</h2>
                                <p className="text-sm text-gray-700 mb-4">
                                    Where should the {columns.find(c => c.id === deleteDialogOpen)?.books.length || 0} books from 
                                    "<strong>{columns.find(c => c.id === deleteDialogOpen)?.name}</strong>" be moved?
                                </p>
                                <select 
                                    value={deleteDestination}
                                    onChange={(e) => setDeleteDestination(e.target.value)}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500">
                                    {columns.filter(c => c.id !== deleteDialogOpen).map(col => (
                                        <option key={col.id} value={col.id}>{col.name}</option>
                                    ))}
                                </select>
                                <div className="flex gap-2 justify-end">
                                    <button 
                                        onClick={() => { setDeleteDialogOpen(null); setDeleteDestination(''); }}
                                        className="px-4 py-2 bg-gray-300 hover:bg-gray-400 text-gray-800 rounded-lg">
                                        Cancel
                                    </button>
                                    <button 
                                        onClick={confirmDeleteColumn}
                                        className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg">
                                        Delete Column
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {collectSeriesOpen && (
                        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60]" onClick={() => setCollectSeriesOpen(false)}>
                            <div className="bg-white rounded-lg shadow-2xl p-6 max-w-2xl max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                                <h2 className="text-xl font-bold text-gray-900 mb-4">Group Series Books</h2>
                                
                                {modalBook && (
                                    <p className="text-sm text-gray-700 mb-4">
                                        Collecting books from: <strong style={{ color: '#621e31' }}>{modalBook.series}</strong>
                                    </p>
                                )}
                                
                                {seriesBooks.current.length > 0 && (
                                    <div className="mb-4">
                                        <h3 className="text-sm font-semibold text-gray-900 mb-2">
                                            Found in this column ({seriesBooks.current.length}):
                                        </h3>
                                        <ul className="space-y-1 ml-4">
                                            {seriesBooks.current.map(book => (
                                                <li key={book.id} className="text-sm text-gray-700">
                                                    • {book.seriesPosition ? `Book ${book.seriesPosition}: ` : ''}{book.title}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                                
                                {seriesBooks.other.length > 0 && (
                                    <div className="mb-6">
                                        <h3 className="text-sm font-semibold text-gray-900 mb-2">
                                            Found in other columns ({seriesBooks.other.length}):
                                        </h3>
                                        <ul className="space-y-1 ml-4">
                                            {seriesBooks.other.map(book => (
                                                <li key={book.id} className="text-sm text-gray-700">
                                                    • {book.seriesPosition ? `Book ${book.seriesPosition}: ` : ''}{book.title} 
                                                    <span className="text-gray-500 ml-2">({book.columnName})</span>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                                
                                {seriesBooks.current.length === 0 && seriesBooks.other.length === 0 && (
                                    <p className="text-sm text-gray-600 mb-6 italic">
                                        No other books from this series found in your library.
                                    </p>
                                )}
                                
                                <div className="flex gap-2 justify-end">
                                    <button 
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setCollectSeriesOpen(false);
                                        }}
                                        className="px-4 py-2 bg-gray-300 hover:bg-gray-400 text-gray-800 rounded-lg">
                                        Cancel
                                    </button>
                                    {seriesBooks.current.length > 0 && (
                                        <button 
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                collectSeriesBooks(false);
                                            }}
                                            className="px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded-lg">
                                            This Column Only
                                        </button>
                                    )}
                                    {seriesBooks.other.length > 0 && (
                                        <button 
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                collectSeriesBooks(true);
                                            }}
                                            className="px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded-lg">
                                            All Columns
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {modalBook && (
                        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={closeBookModal}>
                            <div className="bg-white rounded-lg shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                                <div className="sticky top-0 bg-white border-b border-gray-200 p-4 flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <button 
                                            onClick={() => navigateBook('prev')}
                                            disabled={!getBookPosition().hasPrev}
                                            className="p-2 hover:bg-gray-100 rounded disabled:opacity-30 disabled:cursor-not-allowed"
                                            title="Previous book">
                                            ← 
                                        </button>
                                        <span className="text-sm text-gray-600">
                                            Book {getBookPosition().current} of {getBookPosition().total}
                                        </span>
                                        <button 
                                            onClick={() => navigateBook('next')}
                                            disabled={!getBookPosition().hasNext}
                                            className="p-2 hover:bg-gray-100 rounded disabled:opacity-30 disabled:cursor-not-allowed"
                                            title="Next book">
                                            →
                                        </button>
                                    </div>
                                    <button onClick={closeBookModal} className="text-gray-500 hover:text-gray-700 text-2xl">×</button>
                                </div>
                                
                                <div className="p-6">
                                    <div className="flex gap-6 mb-6">
                                        {blankImageBooks.has(modalBook.id) ? (
                                            <div className="w-48 h-72 rounded shadow-lg overflow-hidden flex flex-col flex-shrink-0" 
                                                 style={{ backgroundColor: '#d4c5a9' }}>
                                                <div className="flex-1 flex items-center justify-center px-4">
                                                    <div className="text-center">
                                                        <div className="text-sm font-serif font-bold text-gray-800 leading-tight mb-3">
                                                            {modalBook.title}
                                                        </div>
                                                        <div className="text-xs text-gray-600 mt-3">KINDLE EDITION</div>
                                                    </div>
                                                </div>
                                            </div>
                                        ) : (
                                            <img src={coverUrlMap[modalBook.coverUrl] || modalBook.coverUrl}
                                                 alt={modalBook.title}
                                                 className="w-48 h-72 object-cover rounded shadow-lg flex-shrink-0"
                                                 onError={(e) => e.target.src = 'https://via.placeholder.com/192x288/4f46e5/fff?text=No+Cover'} />
                                        )}
                                        <div className="flex-1">
                                            <h2 className="text-3xl font-bold text-gray-900 mb-3">{modalBook.title}</h2>
                                            {modalBook.isWishlist && (
                                                <div className="mb-3 flex items-center gap-3">
                                                    <span className="inline-flex items-center bg-amber-100 text-amber-800 px-3 py-1 rounded-full text-sm font-medium">
                                                        ⭐ Wishlist Item
                                                    </span>
                                                    <button
                                                        onClick={() => window.open(getAmazonUrl(modalBook.asin), '_blank')}
                                                        className="px-3 py-1 bg-orange-500 hover:bg-orange-600 text-white rounded text-sm font-medium"
                                                        title="Opens Amazon with affiliate link">
                                                        View on Amazon →
                                                    </button>
                                                </div>
                                            )}
                                            <p className="text-xl text-gray-700 mb-4">by {modalBook.author}</p>
                                            
                                            {modalBook.rating > 0 && (
                                                <div className="flex items-center gap-3 mb-4">
                                                    {renderStars(modalBook.rating)}
                                                    <span className="text-xl font-bold text-gray-700">{modalBook.rating.toFixed(1)}</span>
                                                    {modalBook.ratingCount && (
                                                        <span className="text-sm text-gray-500">({modalBook.ratingCount} ratings)</span>
                                                    )}
                                                </div>
                                            )}
                                            
                                            {modalBook.series && (
                                                <div className="mb-3">
                                                    <p className="text-lg mb-2" style={{ color: '#621e31' }}>
                                                        {(modalBook.seriesPosition && modalBook.seriesTotal)
                                                            ? `Book ${modalBook.seriesPosition} of ${modalBook.seriesTotal}: ${modalBook.series}`
                                                            : modalBook.seriesPosition 
                                                                ? `Book ${modalBook.seriesPosition}: ${modalBook.series}`
                                                                : modalBook.series
                                                        }
                                                    </p>
                                                    <button
                                                        onClick={openCollectSeriesDialog}
                                                        className="px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded-lg text-sm font-medium flex items-center gap-2">
                                                        📚 Group Series Books
                                                    </button>
                                                </div>
                                            )}
                                            
                                            <div className="space-y-2 text-sm">
                                                {modalBook.binding && (
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-semibold text-gray-700">Format:</span>
                                                        <span className="text-gray-600">{modalBook.binding}</span>
                                                    </div>
                                                )}
                                                {modalBook.acquired && (
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-semibold text-gray-700">Acquired:</span>
                                                        <span className="text-gray-600">{formatAcquisitionDate(modalBook.acquired)}</span>
                                                    </div>
                                                )}
                                                {modalBook.publicationDate && (
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-semibold text-gray-700">Published:</span>
                                                        <span className="text-gray-600">{new Date(modalBook.publicationDate + 'T00:00:00').toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
                                                    </div>
                                                )}
                                                {modalBook.asin && (
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-semibold text-gray-700">ASIN:</span>
                                                        <span className="text-gray-600 font-mono text-xs">{modalBook.asin}</span>
                                                    </div>
                                                )}
                                                {/* Collections metadata (NEW v3.8.0.k) */}
                                                {modalBook.collections && modalBook.collections.length > 0 ? (
                                                    <div className="flex items-start gap-2">
                                                        <span className="font-semibold text-gray-700">Collections:</span>
                                                        <span className="text-gray-600 flex-1">
                                                            {modalBook.collections.map(c => c.name).join(', ')}
                                                        </span>
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-semibold text-gray-700">Collections:</span>
                                                        <span className="text-gray-400 italic">No collections</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {!modalBook.description && (
                                        <div className="mb-6 pb-6 border-b border-gray-200">
                                            <h3 className="text-lg font-semibold text-gray-900 mb-3">Description</h3>
                                            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                                                <p className="text-sm text-gray-700">
                                                    ⚠️ <strong>Description not available</strong>
                                                </p>
                                                <p className="text-xs text-gray-600 mt-2">
                                                    This book may not have a description in Amazon's database, or the description wasn't captured during the library fetch.
                                                </p>
                                            </div>
                                        </div>
                                    )}
                                    
                                    {modalBook.description && (
                                        <div className="mb-6 pb-6 border-b border-gray-200">
                                            <h3 className="text-lg font-semibold text-gray-900 mb-3">Description</h3>
                                            <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
                                                {modalBook.description}
                                            </p>
                                        </div>
                                    )}
                                    
                                    {modalBook.topReviews && modalBook.topReviews.length > 0 && (
                                        <div>
                                            <h3 className="text-lg font-semibold text-gray-900 mb-3">Top Reviews</h3>
                                            <div className="space-y-4">
                                                {modalBook.topReviews.slice(0, showAllReviews ? modalBook.topReviews.length : 3).map((review, idx) => {
                                                    const stars = review.stars || 0;
                                                    const title = review.title || '';
                                                    const text = review.text || review.contentAbstract?.textAbstract || '';
                                                    const reviewer = review.reviewer || review.contributor?.publicProfile?.publicProfile?.publicName?.displayString || '';
                                                    
                                                    return (
                                                        <div key={idx} className="bg-gray-50 rounded-lg p-4">
                                                            <div className="flex items-center gap-3 mb-2">
                                                                <span className="text-yellow-500 text-lg">{'★'.repeat(stars)}</span>
                                                                {title && (
                                                                    <span className="font-semibold text-gray-900">{title}</span>
                                                                )}
                                                            </div>
                                                            {reviewer && (
                                                                <p className="text-sm text-gray-600 mb-2">
                                                                    by {reviewer}
                                                                </p>
                                                            )}
                                                            {text && (
                                                                <p className="text-sm text-gray-700 leading-relaxed">
                                                                    {text}
                                                                </p>
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                            {!showAllReviews && modalBook.topReviews.length > 3 && (
                                                <button 
                                                    onClick={() => setShowAllReviews(true)}
                                                    className="mt-4 px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded-lg text-sm">
                                                    Show More Reviews ({modalBook.topReviews.length - 3} more)
                                                </button>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="flex-1 min-h-0 overflow-x-scroll overflow-y-hidden mb-6 columns-scroll-container" onClick={(e) => {
                        // Clear selection if clicking on empty space (not on books or columns)
                        if (e.target === e.currentTarget || e.target.classList.contains('columns-container')) {
                            clearSelection();
                        }
                    }}>
                        <div className="flex h-full p-4 gap-4 columns-container" style={{ minWidth: 'fit-content' }} onClick={(e) => {
                            // Clear selection if clicking between columns
                            if (e.target === e.currentTarget) {
                                clearSelection();
                            }
                        }}>
                            {columns.filter(column => {
                                // v4.15.3 - Hide empty columns when filters are active
                                if (!hasActiveFilters) return true;
                                // v4.15.4.a - Show column if its name matches search term
                                if (searchTerm && column.name.toLowerCase().includes(searchTerm.toLowerCase())) return true;
                                // v4.15.4.b - Show column if any divider label matches search term
                                if (searchTerm && column.books.some(item =>
                                    item && item.type === 'divider' && item.label &&
                                    item.label.toLowerCase().includes(searchTerm.toLowerCase())
                                )) return true;
                                // Otherwise, show column if it has visible books
                                return filteredBooks(column.books).some(item => !(item && item.type === 'divider'));
                            }).map((column, colIndex) => (
                                <div key={column.id}
                                     data-column-id={column.id}
                                     onClick={() => setActiveColumnId(column.id)}
                                     className={`flex-shrink-0 w-96 bg-white rounded-lg flex flex-col relative ${draggedColumn === column.id && isDraggingColumn ? 'column-dragging' : ''}`}
                                     style={activeColumnId === column.id ? {
                                         boxShadow: 'inset 0 2px 4px rgba(64, 64, 64, 0.4), inset 0 -2px 4px rgba(64, 64, 64, 0.4), inset 2px 0 4px rgba(64, 64, 64, 0.4), inset -2px 0 4px rgba(64, 64, 64, 0.4), 0 1px 3px rgba(0, 0, 0, 0.12)',
                                         border: '2px solid rgb(96, 96, 96)'
                                     } : { boxShadow: '0 1px 3px rgba(0, 0, 0, 0.12), 0 1px 2px rgba(0, 0, 0, 0.24)' }}>
                                    {isDraggingColumn && columnDropTarget === colIndex && draggedColumn !== column.id && (
                                        <div className="column-drop-indicator" style={{ left: '-8px' }} />
                                    )}
                                    <div className="p-4 border-b border-gray-200 flex items-center justify-between"
                                         onMouseDown={(e) => handleColumnDragStart(e, column.id)}
                                         style={{ cursor: 'grab' }}>
                                        <div className="flex items-center gap-2 flex-1">
                                            <span className="text-gray-400">⋮⋮</span>
                                            {editingColumn === column.id ? (
                                                <input
                                                    type="text"
                                                    value={editingName}
                                                    onChange={(e) => setEditingName(e.target.value)}
                                                    onBlur={() => finishEditingColumn(column.id)}
                                                    onKeyPress={(e) => e.key === 'Enter' && finishEditingColumn(column.id)}
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Escape') {
                                                            setEditingColumn(null);
                                                            setEditingName('');
                                                        }
                                                    }}
                                                    className="text-lg font-semibold text-gray-900 border-2 border-blue-500 rounded px-2 py-1"
                                                    autoFocus
                                                />
                                            ) : (
                                                <div className="flex items-center gap-1 editable-title-container">
                                                    <h2
                                                        className="text-lg font-semibold text-gray-900 editable-title"
                                                        onDoubleClick={() => startEditingColumn(column.id, column.name)}
                                                        title="Double-click to rename"
                                                    >
                                                        {column.name}
                                                    </h2>
                                                    <span className="pencil-icon text-gray-400 text-sm">✏️</span>
                                                </div>
                                            )}
                                            <span className="text-sm text-gray-500">({filteredBooks(column.books).filter(item => !(item && item.type === 'divider')).length})</span>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <div className="relative" ref={columnMenuOpen === column.id ? columnMenuRef : null}>
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); setColumnMenuOpen(columnMenuOpen === column.id ? null : column.id); }}
                                                    className="p-1 hover:bg-gray-100 rounded text-lg"
                                                    title="Column options">
                                                    ⋮
                                                </button>
                                                {columnMenuOpen === column.id && (
                                                    <div className="absolute right-0 top-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg z-50 w-56"
                                                         onClick={(e) => e.stopPropagation()}>
                                                        <div className="p-2">
                                                            {/* Sort submenu */}
                                                            <div className="relative">
                                                                <button
                                                                    onClick={(e) => { e.stopPropagation(); setSortMenuOpen(sortMenuOpen === column.id ? null : column.id); }}
                                                                    className="w-full text-left px-2 py-1 hover:bg-gray-100 rounded text-sm flex items-center justify-between">
                                                                    Sort Column
                                                                    <span>▸</span>
                                                                </button>
                                                                {sortMenuOpen === column.id && (
                                                                    <div className="absolute left-full top-0 ml-1 bg-white border border-gray-300 rounded-lg shadow-lg w-48 z-50">
                                                                        <div className="p-2">
                                                                            <button onClick={() => sortColumn(column.id, 'title-asc')} className="w-full text-left px-2 py-1 hover:bg-gray-100 rounded text-sm">Title (A→Z)</button>
                                                                            <button onClick={() => sortColumn(column.id, 'title-desc')} className="w-full text-left px-2 py-1 hover:bg-gray-100 rounded text-sm">Title (Z→A)</button>
                                                                            <button onClick={() => sortColumn(column.id, 'author-asc')} className="w-full text-left px-2 py-1 hover:bg-gray-100 rounded text-sm">Author (A→Z)</button>
                                                                            <button onClick={() => sortColumn(column.id, 'author-desc')} className="w-full text-left px-2 py-1 hover:bg-gray-100 rounded text-sm">Author (Z→A)</button>
                                                                            {dataSource === 'enriched' && (
                                                                                <>
                                                                                    <button onClick={() => sortColumn(column.id, 'rating-desc')} className="w-full text-left px-2 py-1 hover:bg-gray-100 rounded text-sm">Rating (High→Low)</button>
                                                                                    <button onClick={() => sortColumn(column.id, 'rating-asc')} className="w-full text-left px-2 py-1 hover:bg-gray-100 rounded text-sm">Rating (Low→High)</button>
                                                                                </>
                                                                            )}
                                                                            <button onClick={() => sortColumn(column.id, 'acquired-desc')} className="w-full text-left px-2 py-1 hover:bg-gray-100 rounded text-sm">Acquired (Newest)</button>
                                                                            <button onClick={() => sortColumn(column.id, 'acquired-asc')} className="w-full text-left px-2 py-1 hover:bg-gray-100 rounded text-sm">Acquired (Oldest)</button>
                                                                            <button onClick={() => sortColumn(column.id, 'published-desc')} className="w-full text-left px-2 py-1 hover:bg-gray-100 rounded text-sm">Published (Newest)</button>
                                                                            <button onClick={() => sortColumn(column.id, 'published-asc')} className="w-full text-left px-2 py-1 hover:bg-gray-100 rounded text-sm">Published (Oldest)</button>
                                                                            <button onClick={() => sortColumn(column.id, 'series-pos-asc')} className="w-full text-left px-2 py-1 hover:bg-gray-100 rounded text-sm">Series (1→99)</button>
                                                                            <button onClick={() => sortColumn(column.id, 'series-pos-desc')} className="w-full text-left px-2 py-1 hover:bg-gray-100 rounded text-sm">Series (99→1)</button>
                                                                        </div>
                                                                    </div>
                                                                )}
                                                            </div>

                                                            <div className="border-t border-gray-200 my-1"></div>

                                                            {/* Auto-divide options */}
                                                            <button onClick={() => autoDivideBySeries(column.id)} className="w-full text-left px-2 py-1 hover:bg-gray-100 rounded text-sm">Auto-Divide by Series</button>
                                                            {dataSource === 'enriched' && (
                                                                <button onClick={() => autoDivideByRating(column.id)} className="w-full text-left px-2 py-1 hover:bg-gray-100 rounded text-sm">Auto-Divide by Rating</button>
                                                            )}

                                                            <div className="border-t border-gray-200 my-1"></div>

                                                            {/* Insert Divider */}
                                                            <button onClick={() => { setInsertDividerOpen(column.id); setNewDividerLabel(''); }} className="w-full text-left px-2 py-1 hover:bg-gray-100 rounded text-sm">Insert Divider</button>

                                                            <div className="border-t border-gray-200 my-1"></div>

                                                            {/* v4.12.0 - Insert Column Before/After */}
                                                            <button onClick={() => { insertColumn(column.id, 'before'); setColumnMenuOpen(null); }} className="w-full text-left px-2 py-1 hover:bg-gray-100 rounded text-sm">Insert Column Before</button>
                                                            <button onClick={() => { insertColumn(column.id, 'after'); setColumnMenuOpen(null); }} className="w-full text-left px-2 py-1 hover:bg-gray-100 rounded text-sm">Insert Column After</button>

                                                            <div className="border-t border-gray-200 my-1"></div>

                                                            {/* Rename and Delete */}
                                                            <button onClick={() => { startEditingColumn(column.id, column.name); setColumnMenuOpen(null); }} className="w-full text-left px-2 py-1 hover:bg-gray-100 rounded text-sm">Rename Column</button>
                                                            {columns.length > 1 && (
                                                                <button onClick={() => { openDeleteDialog(column.id); setColumnMenuOpen(null); }} className="w-full text-left px-2 py-1 hover:bg-gray-100 rounded text-sm text-red-600">Delete Column</button>
                                                            )}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex-1 overflow-y-auto p-4" onClick={(e) => {
                                        // v3.14.0.y - Clear selection when clicking empty space in scrollable area
                                        if (e.target === e.currentTarget) {
                                            clearSelection();
                                        }
                                    }}>
                                        <div className="grid grid-cols-3 gap-3 relative book-grid" onClick={(e) => {
                                            // v3.14.0.y - Clear selection when clicking empty grid cells
                                            if (e.target === e.currentTarget) {
                                                clearSelection();
                                            }
                                        }}>
                                            {/* v3.14.0.v - Old start-of-column indicator removed; overlay handles it */}
                                            {filteredBooks(column.books).map((item) => {
                                                // v3.11.0 - Handle dividers
                                                if (typeof item === 'object' && item.type === 'divider') {
                                                    const isHovering = hoveringDivider && hoveringDivider.columnId === column.id && hoveringDivider.dividerId === item.id;
                                                    const isEditing = editingDivider && editingDivider.columnId === column.id && editingDivider.dividerId === item.id;
                                                    const isSelected = selectedDivider && selectedDivider.columnId === column.id && selectedDivider.dividerId === item.id; // v3.13.0

                                                    // v3.14.0.v - Old divider indicator code removed; overlay handles it

                                                    return (
                                                        <div key={item.id} className="col-span-3 relative">
                                                            <div className={`flex items-center gap-2 py-2 px-3 my-1 rounded cursor-pointer divider-item ${isSelected ? 'ring-2 ring-blue-500' : ''}`}
                                                                 data-divider-id={item.id}
                                                                 style={{ backgroundColor: isSelected ? '#dbeafe' : '#f3f4f6' }}
                                                                 onClick={(e) => {
                                                                     if (!isEditing) {
                                                                         e.stopPropagation();
                                                                         selectDividerGroup(column.id, item.id);
                                                                     }
                                                                 }}
                                                                 onMouseEnter={() => setHoveringDivider({ columnId: column.id, dividerId: item.id })}
                                                                 onMouseLeave={() => setHoveringDivider(null)}>
                                                                {isHovering && (
                                                                <span
                                                                    className="text-gray-400 cursor-grab text-lg"
                                                                    onMouseDown={(e) => handleDividerMouseDown(e, item, column.id)}
                                                                    style={{ cursor: 'grab' }}>
                                                                    ⋮
                                                                </span>
                                                            )}
                                                            <div className="flex-1 text-center">
                                                                {isEditing ? (
                                                                    <input
                                                                        type="text"
                                                                        value={editingDividerLabel}
                                                                        onChange={(e) => setEditingDividerLabel(e.target.value)}
                                                                        onBlur={finishEditingDivider}
                                                                        onKeyPress={(e) => {
                                                                            if (e.key === 'Enter') finishEditingDivider();
                                                                        }}
                                                                        onKeyDown={(e) => {
                                                                            if (e.key === 'Escape') {
                                                                                setEditingDivider(null);
                                                                                setEditingDividerLabel('');
                                                                            }
                                                                        }}
                                                                        className="text-sm font-semibold text-gray-700 border-2 border-blue-500 rounded px-2 py-1 text-center"
                                                                        autoFocus
                                                                        onClick={(e) => e.stopPropagation()}
                                                                    />
                                                                ) : (
                                                                    <span
                                                                        className="text-sm font-semibold text-gray-700 cursor-pointer select-none"
                                                                        onDoubleClick={() => startEditingDivider(column.id, item.id, item.label)}
                                                                        title="Double-click to rename">
                                                                        ═══ {item.label} ═══
                                                                    </span>
                                                                )}
                                                            </div>
                                                            {isHovering && (
                                                                <button
                                                                    onClick={() => deleteDivider(column.id, item.id)}
                                                                    className="text-gray-400 hover:text-red-600 font-bold text-lg"
                                                                    title="Delete divider">
                                                                    ✕
                                                                </button>
                                                            )}
                                                            </div>
                                                            {/* v3.14.0.v - Old divider bottom indicator removed; overlay handles it */}
                                                        </div>
                                                    );
                                                }

                                                // Regular book rendering
                                                const book = item;
                                                // v3.14.0.v - actualIndex removed; overlay handles indicators now

                                                return (
                                                    <div key={book.id} className="relative book-item" data-book-id={book.id}>
                                                        <div className={`book-clickable ${selectedBooks.has(book.id) ? 'selected' : ''} ${draggedBook?.id === book.id && isDragging ? 'dragging' : ''} ${book.isWishlist || book.isHidden ? 'opacity-40' : ''}`}
                                                             onMouseDown={(e) => handleMouseDown(e, book, column.id)}
                                                             onClick={(e) => {
                                                                 e.stopPropagation();

                                                                 if (isDragging) return;

                                                                 // Always set active column when clicking a book
                                                                 setActiveColumnId(column.id);

                                                                 if (e.ctrlKey || e.metaKey) {
                                                                     // Ctrl+Click: Toggle selection
                                                                     toggleBookSelection(book.id);
                                                                     setLastClickedBook({ id: book.id, columnId: column.id });
                                                                 } else if (e.shiftKey) {
                                                                     // Shift+Click: Range selection
                                                                     if (lastClickedBook && lastClickedBook.columnId === column.id) {
                                                                         // Range from last clicked book to this book (same column)
                                                                         selectBookRange(lastClickedBook.id, book.id, column.id);
                                                                     } else {
                                                                         // No anchor point or different column: treat as single click
                                                                         clearSelection();
                                                                         toggleBookSelection(book.id);
                                                                         setLastClickedBook({ id: book.id, columnId: column.id });
                                                                     }
                                                                 } else {
                                                                     // Single click: Select this book (replace selection)
                                                                     clearSelection();
                                                                     toggleBookSelection(book.id);
                                                                     setLastClickedBook({ id: book.id, columnId: column.id });
                                                                 }
                                                             }}
                                                             onDoubleClick={(e) => {
                                                                 e.stopPropagation();
                                                                 // Double-click: Open modal for all books
                                                                 openBookModal(book, column.id);
                                                             }}
                                                             onContextMenu={(e) => {
                                                                 e.preventDefault();
                                                                 // Right-click: If book not in selection, select it first
                                                                 if (!selectedBooks.has(book.id)) {
                                                                     clearSelection();
                                                                     toggleBookSelection(book.id);
                                                                 }
                                                                 // Show context menu
                                                                 setContextMenu({
                                                                     x: e.clientX,
                                                                     y: e.clientY,
                                                                     bookId: book.id,
                                                                     columnId: column.id
                                                                 });
                                                             }}
                                                             title={book.collections && book.collections.length > 0
                                                                ? `Collections:\n${book.collections.map(c => c.name).join('\n')}`
                                                                : '📭 No collections'}>
                                                            <div className="relative">
                                                                {blankImageBooks.has(book.id) ? (
                                                                    <div className="w-full aspect-[2/3] rounded shadow-lg overflow-hidden flex flex-col" 
                                                                         style={{ backgroundColor: '#d4c5a9' }}>
                                                                        <div className="flex-1 flex items-center justify-center px-4">
                                                                            <div className="text-center">
                                                                                <div className="text-xs font-serif font-bold text-gray-800 leading-tight mb-2">
                                                                                    {book.title.length > 40 ? book.title.substring(0, 40) + '...' : book.title}
                                                                                </div>
                                                                                <div className="text-xs text-gray-600 mt-2">KINDLE EDITION</div>
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                ) : (
                                                                    <img src={coverUrlMap[book.coverUrl] || book.coverUrl}
                                                                         alt={book.title}
                                                                         className="w-full rounded shadow-lg"
                                                                         onLoad={(e) => checkIfBlankImage(e.target, book.id)}
                                                                         onError={(e) => e.target.src = 'https://via.placeholder.com/128x192/4f46e5/fff?text=No+Cover'} />
                                                                )}
                                                                {/* Top-right: Rating badge */}
                                                                {book.rating > 0 && (
                                                                    <div className="absolute top-1 right-1 bg-black bg-opacity-75 rounded px-1.5 py-0.5 text-xs font-bold text-yellow-400">
                                                                        ★ {book.rating.toFixed(1)}
                                                                    </div>
                                                                )}
                                                                {/* Bottom-right: Read status checkmark */}
                                                                {book.readStatus === 'READ' && (
                                                                    <div className="absolute bottom-1 right-1 bg-green-600 rounded-full w-6 h-6 flex items-center justify-center" title="Read">
                                                                        <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                                                                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
                                                                        </svg>
                                                                    </div>
                                                                )}
                                                                {/* Bottom-left: Ownership badge (non-purchased only) */}
                                                                {book.ownershipType && book.ownershipType !== 'purchased' && (() => {
                                                                    const badgeConfig = {
                                                                        sample: { bg: 'bg-amber-500', text: 'SAMPLE' },
                                                                        borrowed: { bg: 'bg-teal-500', text: 'BORROWED' },
                                                                        prime: { bg: 'bg-purple-500', text: 'PRIME' },
                                                                        kindleUnlimited: { bg: 'bg-purple-500', text: 'KU' },
                                                                        koll: { bg: 'bg-purple-500', text: 'KOLL' },
                                                                        comixology: { bg: 'bg-purple-500', text: 'COMIX' },
                                                                        unknown: { bg: 'bg-gray-500', text: '?' }
                                                                    };
                                                                    const config = badgeConfig[book.ownershipType];
                                                                    return config ? (
                                                                        <div className={`absolute bottom-1 left-1 ${config.bg} bg-opacity-90 rounded px-1.5 py-0.5 text-xs font-bold text-white`}>
                                                                            {config.text}
                                                                        </div>
                                                                    ) : null;
                                                                })()}
                                                                {/* Top-left: Selection or Collections badge */}
                                                                {selectedBooks.has(book.id) ? (
                                                                    <div className="absolute top-1 left-1 bg-blue-700 rounded-full w-6 h-6 flex items-center justify-center z-10">
                                                                        <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                                                                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
                                                                        </svg>
                                                                    </div>
                                                                ) : book.collections && book.collections.length > 0 && (
                                                                    <div className="absolute top-1 left-1 bg-gray-700 bg-opacity-75 rounded px-1.5 py-0.5 text-xs font-bold text-white">
                                                                        📁 {book.collections.length}
                                                                    </div>
                                                                )}
                                                                {/* Hidden book overlay (v4.1.0.d, v4.1.0.e larger) - full cover red 🚫 */}
                                                                {book.isHidden && showHidden && (
                                                                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                                                        <span style={{ fontSize: '90px', filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.5))' }}>🚫</span>
                                                                    </div>
                                                                )}
                                                            </div>
                                                            <div className="mt-2 text-xs">
                                                                <div className="font-medium text-gray-800 leading-tight line-clamp-2" title={book.title}>
                                                                    {book.title}
                                                                </div>
                                                                <div className="text-gray-600 mt-1 leading-tight line-clamp-1" title={book.author}>
                                                                    {book.author}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                            {/* v3.14.0.v - Old fallback indicator removed; overlay handles all cases */}
                                        </div>
                                    </div>
                                    {isDraggingColumn && columnDropTarget === colIndex + 1 && draggedColumn !== column.id && (
                                        <div className="column-drop-indicator" style={{ right: '-8px' }} />
                                    )}
                                </div>
                            ))}
                            {/* v4.12.0.b - Floating Add Column button removed; use column dropdown menu instead */}
                        </div>
                    </div>

                    {selectedBooks.size > 0 && (
                        <div className="fixed bottom-20 right-4 bg-blue-700 text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-3 z-50">
                            <span className="font-medium">{selectedBooks.size} book{selectedBooks.size !== 1 ? 's' : ''} selected</span>
                            <button
                                onClick={clearSelection}
                                className="hover:bg-blue-800 px-3 py-1 rounded bg-blue-500 transition-colors">
                                Clear
                            </button>
                        </div>
                    )}

                    {contextMenu && (() => {
                        // v4.1.0.e - Calculate menu position to avoid going off-screen
                        // Estimate menu height: header(28) + columns(40 each) + separator(9) + 3 items(40 each) + separator(9) + hide(40) + padding(8) ≈ 300px max
                        const menuHeight = 300;
                        const menuWidth = 200;
                        const viewportHeight = window.innerHeight;
                        const viewportWidth = window.innerWidth;

                        // Flip up if menu would go below viewport
                        const top = contextMenu.y + menuHeight > viewportHeight
                            ? Math.max(10, contextMenu.y - menuHeight)
                            : contextMenu.y;
                        // Flip left if menu would go past right edge
                        const left = contextMenu.x + menuWidth > viewportWidth
                            ? Math.max(10, contextMenu.x - menuWidth)
                            : contextMenu.x;

                        return (
                        <div className="fixed bg-white border border-gray-300 rounded-lg shadow-xl z-[60] py-1 min-w-[180px]"
                             style={{
                                 left: `${left}px`,
                                 top: `${top}px`
                             }}
                             onClick={(e) => e.stopPropagation()}>
                            <div className="px-2 py-1 text-xs font-semibold text-gray-500 border-b border-gray-200">
                                {selectedBooks.size} book{selectedBooks.size !== 1 ? 's' : ''} selected
                            </div>
                            {columns.filter(col => col.id !== contextMenu.columnId).map(col => (
                                <button
                                    key={col.id}
                                    className="w-full text-left px-4 py-2 hover:bg-blue-50 text-sm text-gray-700 flex items-center gap-2"
                                    onClick={() => {
                                        // Move selected books to this column
                                        const booksToMove = Array.from(selectedBooks);
                                        // v4.8.0 - Capture original positions for undo
                                        const sourceCol = columns.find(c => c.id === contextMenu.columnId);
                                        const fromIndices = booksToMove.map(bookId => sourceCol.books.indexOf(bookId));
                                        const targetCol = columns.find(c => c.id === col.id);
                                        const toIndex = targetCol.books.length; // Adding at end

                                        setColumns(columns.map(column => {
                                            if (column.id === contextMenu.columnId) {
                                                // Remove from source column
                                                return { ...column, books: column.books.filter(id => !booksToMove.includes(id)) };
                                            }
                                            if (column.id === col.id) {
                                                // Add to target column at the end
                                                return { ...column, books: [...column.books, ...booksToMove] };
                                            }
                                            return column;
                                        }));
                                        // v4.8.0 - Record action for undo
                                        recordAction({
                                            type: 'MOVE_BOOKS',
                                            bookIds: booksToMove,
                                            fromColId: contextMenu.columnId,
                                            toColId: col.id,
                                            fromIndices: fromIndices,
                                            toIndex: toIndex
                                        });
                                        clearSelection();
                                        setContextMenu(null);
                                    }}>
                                    📁 Move to "{col.name}"
                                </button>
                            ))}
                            {/* Separator (v4.1.0.d) */}
                            <div className="border-t border-gray-200 my-1"></div>
                            {/* Open in Amazon (v4.1.0.d) */}
                            <button
                                className="w-full text-left px-4 py-2 hover:bg-blue-50 text-sm text-gray-700 flex items-center gap-2"
                                onClick={() => {
                                    const selectedBooksList = Array.from(selectedBooks).map(id => books.find(b => b.id === id)).filter(Boolean);
                                    const count = selectedBooksList.length;
                                    if (count > 10) {
                                        alert('Too many books selected. Please select 10 or fewer to open in Amazon.');
                                    } else if (count > 3) {
                                        if (window.confirm(`Open ${count} tabs in Amazon?`)) {
                                            selectedBooksList.forEach(book => {
                                                window.open(getAmazonUrl(book.asin), '_blank');
                                            });
                                        }
                                    } else {
                                        selectedBooksList.forEach(book => {
                                            window.open(getAmazonUrl(book.asin), '_blank');
                                        });
                                    }
                                    setContextMenu(null);
                                }}>
                                🔗 Open in Amazon
                            </button>
                            {/* Copy Title(s) (v4.1.0.d) */}
                            <button
                                className="w-full text-left px-4 py-2 hover:bg-blue-50 text-sm text-gray-700 flex items-center gap-2"
                                onClick={() => {
                                    const selectedBooksList = Array.from(selectedBooks).map(id => books.find(b => b.id === id)).filter(Boolean);
                                    const titles = selectedBooksList.map(book => book.title).join('\n');
                                    navigator.clipboard.writeText(titles);
                                    setContextMenu(null);
                                }}>
                                📋 Copy Title{selectedBooks.size !== 1 ? 's' : ''}
                            </button>
                            {/* Separator (v4.1.0.d) */}
                            <div className="border-t border-gray-200 my-1"></div>
                            {/* Hide/Unhide Book(s) (v4.1.0.d) */}
                            {(() => {
                                const selectedBooksList = Array.from(selectedBooks).map(id => books.find(b => b.id === id)).filter(Boolean);
                                const allHidden = selectedBooksList.every(book => book.isHidden);
                                return (
                                    <button
                                        className="w-full text-left px-4 py-2 hover:bg-blue-50 text-sm text-gray-700 flex items-center gap-2"
                                        onClick={async () => {
                                            const newHiddenState = !allHidden;
                                            // v4.8.0 - Capture previous states for undo
                                            const previousStates = {};
                                            selectedBooksList.forEach(book => {
                                                previousStates[book.id] = book.isHidden || false;
                                            });
                                            const updatedBooks = books.map(book => {
                                                if (selectedBooks.has(book.id)) {
                                                    return { ...book, isHidden: newHiddenState };
                                                }
                                                return book;
                                            });
                                            setBooks(updatedBooks);
                                            await saveBooksToIndexedDB(updatedBooks);
                                            // v4.8.0 - Record action for undo
                                            recordAction({
                                                type: 'TOGGLE_HIDE',
                                                bookIds: Array.from(selectedBooks),
                                                previousStates: previousStates,
                                                newState: newHiddenState
                                            });
                                            clearSelection();
                                            setContextMenu(null);
                                        }}>
                                        {allHidden ? '👁️' : '🚫'} {allHidden ? 'Unhide' : 'Hide'} Book{selectedBooks.size !== 1 ? 's' : ''}
                                    </button>
                                );
                            })()}
                        </div>
                        );
                    })()}

                    {/* v3.14.0.x - Ghost position controlled via ref in updateGhostPosition */}
                    {isDragging && draggedBook && (
                        <div className="drag-ghost"
                             ref={dragGhostRef}
                             style={{
                                 left: dragPosRef.current.x - 50,
                                 top: dragPosRef.current.y - 75,
                                 width: '100px'
                             }}>
                            {/* Show stacked effect if dragging multiple books */}
                            {selectedBooks.size > 1 && selectedBooks.has(draggedBook.id) && (
                                <>
                                    <div className="absolute" style={{ left: '8px', top: '8px', opacity: 0.4 }}>
                                        <div className="w-full aspect-[2/3] rounded drag-ghost-border bg-blue-100" style={{ width: '100px' }}></div>
                                    </div>
                                    <div className="absolute" style={{ left: '4px', top: '4px', opacity: 0.6 }}>
                                        <div className="w-full aspect-[2/3] rounded drag-ghost-border bg-blue-200" style={{ width: '100px' }}></div>
                                    </div>
                                </>
                            )}
                            {/* Main dragged book */}
                            <div className="relative">
                                {blankImageBooks.has(draggedBook.id) ? (
                                    <div className="w-full aspect-[2/3] rounded drag-ghost-border"
                                         style={{ backgroundColor: '#d4c5a9' }}>
                                        <div className="flex items-center justify-center h-full px-1">
                                            <div className="text-xs font-serif font-bold text-gray-800 text-center leading-tight">
                                                {draggedBook.title.length > 20 ? draggedBook.title.substring(0, 20) + '...' : draggedBook.title}
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <img src={coverUrlMap[draggedBook.coverUrl] || draggedBook.coverUrl}
                                         alt={draggedBook.title}
                                         className="w-full rounded drag-ghost-border" />
                                )}
                                {/* Count badge for multiple books */}
                                {selectedBooks.size > 1 && selectedBooks.has(draggedBook.id) && (
                                    <div className="absolute -top-2 -right-2 bg-red-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold border-2 border-white">
                                        {selectedBooks.size}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* v3.14.0.w - Overlay drop indicator using ref for direct DOM updates */}
                    <div
                        ref={indicatorRef}
                        className="drop-indicator-overlay"
                        style={{
                            display: 'none',
                            position: 'fixed',
                            height: '6px',
                            pointerEvents: 'none',
                            zIndex: 9998
                        }}
                    >
                        <div className="drop-indicator-line" style={{
                            position: 'absolute',
                            top: '2px',
                            left: 0,
                            right: 0,
                            height: '2px',
                            backgroundColor: '#3b82f6',
                            borderRadius: '1px'
                        }} />
                        <div className="drop-indicator-dot" style={{
                            position: 'absolute',
                            top: 0,
                            left: '-3px',
                            width: '6px',
                            height: '6px',
                            backgroundColor: '#3b82f6',
                            borderRadius: '50%'
                        }} />
                    </div>

                    {/* Affiliate Disclosure Footer (v4.4.0) */}
                    <div className="fixed bottom-0 left-0 right-0 bg-gray-100 border-t border-gray-200 py-1 px-4 text-center text-xs text-gray-500 z-40">
                        As an Amazon Associate, I earn from qualifying purchases. | <a href="https://github.com/Ron-L/ReaderWrangler/issues" target="_blank" rel="noopener noreferrer" className="hover:text-gray-700" title="Report issues or request features">Feedback</a> | <a href="security.html" className="hover:text-gray-700" title="Security & Privacy information">Security</a> | Build v{ORGANIZER_VERSION}
                    </div>
                </div>
            );
        }

        ReactDOM.render(<ReaderWrangler />, document.getElementById('root'));
