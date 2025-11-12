        // Amazon Book Organizer JS v3.4.0.a
        const { useState, useEffect, useRef } = React;
        const APP_VERSION = "v3.4.0.a";
        document.title = `Amazon Book Organizer ${APP_VERSION}`;
        const STORAGE_KEY = "amazon-book-organizer-state";
        const CACHE_KEY = "amazon-book-enriched-cache";
        const SETTINGS_KEY = "amazon-book-organizer-settings";
        const DB_NAME = "AmazonBookDB";
        const DB_VERSION = 1;
        const BOOKS_STORE = "books";
        const MANIFEST_CHECK_INTERVAL = 60000; // 60 seconds
        
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

                // Deduplicate by ASIN (keep last occurrence)
                const seenAsins = new Set();
                const duplicates = [];
                const uniqueBooks = [];

                for (let i = books.length - 1; i >= 0; i--) {
                    const book = books[i];
                    if (seenAsins.has(book.asin)) {
                        duplicates.push(book.asin);
                    } else {
                        seenAsins.add(book.asin);
                        uniqueBooks.unshift(book);
                    }
                }

                if (duplicates.length > 0) {
                    console.warn(`⚠️  Found ${duplicates.length} duplicate ASINs, keeping unique books only`);
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
        
        function AmazonBookOrganizer() {
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
            const [dropTarget, setDropTarget] = useState(null);
            const [dataSource, setDataSource] = useState('none');
            const [blankImageBooks, setBlankImageBooks] = useState(new Set());
            const [editingColumn, setEditingColumn] = useState(null);
            const [editingName, setEditingName] = useState('');
            const [sortMenuOpen, setSortMenuOpen] = useState(null);
            const [helpOpen, setHelpOpen] = useState(false);
            const [settingsOpen, setSettingsOpen] = useState(false);
            const [deleteDialogOpen, setDeleteDialogOpen] = useState(null);
            const [deleteDestination, setDeleteDestination] = useState('');
            const [showAllReviews, setShowAllReviews] = useState(false);
            const [collectSeriesOpen, setCollectSeriesOpen] = useState(false);
            const [seriesBooks, setSeriesBooks] = useState({ current: [], other: [] });
            const [syncStatus, setSyncStatusInternal] = useState('loading'); // 'loading', 'fresh', 'stale', 'none', 'unknown'
            const [lastSyncTime, setLastSyncTime] = useState(null);
            const [manifestData, setManifestData] = useState(null);
            const [statusModalOpen, setStatusModalOpen] = useState(false);
            const [collectionsData, setCollectionsData] = useState(null); // Map of ASIN -> {readStatus, collections[]}
            const [collectionFilter, setCollectionFilter] = useState(''); // Filter by collection name or special values
            const [selectedBooks, setSelectedBooks] = useState(new Set()); // Multi-select state
            const [lastClickedBook, setLastClickedBook] = useState(null); // For shift+click range selection
            const [contextMenu, setContextMenu] = useState(null); // {x, y, bookId, columnId}
            const [readStatusFilter, setReadStatusFilter] = useState(''); // Filter by READ/UNREAD/UNKNOWN
            const [, forceUpdate] = useState({});

            // Wrapper for setSyncStatus
            const setSyncStatus = (newStatus) => {
                setSyncStatusInternal(newStatus);
            };
            const [settings, setSettings] = useState({
                cacheExpirationDays: 30
            });
            const dragThreshold = 50;
            const manifestCheckTimer = useRef(null);

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

            const checkManifest = async (booksCount = null, lastSync = null) => {
                // Use parameters if provided (initial load), otherwise use state (periodic checks)
                const effectiveBooksCount = booksCount !== null ? booksCount : books.length;
                const effectiveLastSync = lastSync !== null ? lastSync : lastSyncTime;
                
                try {
                    // Try to read manifest file from same directory with cache-busting
                    const response = await fetch(`amazon-manifest.json?t=${Date.now()}`);
                    if (response.ok) {
                        const manifest = await response.json();
                        setManifestData(manifest);
                        
                        // Compare with last sync time
                        if (effectiveLastSync) {
                            const manifestTime = new Date(manifest.lastFetched).getTime();

                            // Check if manifest has more books than we have loaded
                            if (manifest.totalBooks > effectiveBooksCount) {
                                setSyncStatus('stale');
                            } else if (manifestTime > effectiveLastSync) {
                                setSyncStatus('stale');
                            } else {
                                // Check if data is older than expiration days
                                const daysSinceSync = (Date.now() - effectiveLastSync) / (1000 * 60 * 60 * 24);
                                if (daysSinceSync > settings.cacheExpirationDays) {
                                    setSyncStatus('stale');
                                } else {
                                    setSyncStatus('fresh');
                                    if (lastSync !== null) setLastSyncTime(lastSync);
                                }
                            }
                        } else {
                            // No previous sync
                            setSyncStatus('stale');
                        }
                    } else {
                        // No manifest file found - check if we have books loaded
                        if (effectiveBooksCount > 0 && effectiveLastSync) {
                            // We have books, check if they're stale based on age
                            const daysSinceSync = (Date.now() - effectiveLastSync) / (1000 * 60 * 60 * 24);
                            if (daysSinceSync > settings.cacheExpirationDays) {
                                setSyncStatus('stale');
                            } else {
                                setSyncStatus('fresh');
                            }
                        } else {
                            // No books and no manifest
                            setSyncStatus('none');
                        }
                    }
                } catch (error) {
                    // Can't read manifest (expected for file:// protocol or no file)
                    // Only set to 'none' if we don't have books loaded
                    if (effectiveBooksCount > 0 && effectiveLastSync) {
                        // We have books, check if they're stale based on age
                        const daysSinceSync = (Date.now() - effectiveLastSync) / (1000 * 60 * 60 * 24);
                        if (daysSinceSync > settings.cacheExpirationDays) {
                            setSyncStatus('stale');
                        } else {
                            setSyncStatus('fresh');
                        }
                    } else {
                        // No books loaded at all
                        setSyncStatus('none');
                    }
                }
            };

            // Initial load from IndexedDB
            useEffect(() => {
                const loadData = async () => {
                    try {
                        // Load settings
                        const savedSettings = localStorage.getItem(SETTINGS_KEY);
                        if (savedSettings) {
                            setSettings(JSON.parse(savedSettings));
                        }

                        // Load books from IndexedDB
                        let loadedBooks = await loadBooksFromIndexedDB();

                        // Merge collections data into loaded books
                        if (loadedBooks.length > 0) {
                            loadedBooks = await mergeCollectionsIntoBooks(loadedBooks);
                            setBooks(loadedBooks);
                            // Update IndexedDB with merged data
                            await saveBooksToIndexedDB(loadedBooks);
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

                        // Check manifest after loading - delay slightly to ensure React state has updated
                        setTimeout(() => {
                            checkManifest(loadedBooks.length, effectiveLastSync);
                        }, 100);
                    } catch (error) {
                        console.error('Failed to load data:', error);
                        setSyncStatus('none');
                    }
                };
                
                loadData();
            }, []);

            // Periodic manifest checking
            useEffect(() => {
                if (syncStatus !== 'loading') {
                    manifestCheckTimer.current = setInterval(() => {
                        checkManifest();
                    }, MANIFEST_CHECK_INTERVAL);

                    return () => {
                        if (manifestCheckTimer.current) {
                            clearInterval(manifestCheckTimer.current);
                        }
                    };
                }
            }, [syncStatus]);


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

            // Expose books to window for debugging
            useEffect(() => {
                window.books = books;
            }, [books]);

            // ESC key to clear selection
            useEffect(() => {
                const handleKeyDown = (e) => {
                    if (e.key === 'Escape') {
                        clearSelection();
                        setContextMenu(null);
                    }
                };

                window.addEventListener('keydown', handleKeyDown);
                return () => window.removeEventListener('keydown', handleKeyDown);
            }, []);

            // Close context menu on click
            useEffect(() => {
                const handleClick = () => setContextMenu(null);
                if (contextMenu) {
                    window.addEventListener('click', handleClick);
                    return () => window.removeEventListener('click', handleClick);
                }
            }, [contextMenu]);

            const saveSettings = (newSettings) => {
                setSettings(newSettings);
                setSettingsOpen(false);
            };

            const syncNow = async () => {
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

                            // Load data with callback
                            await loadEnrichedData(text, (bookCount) => {
                                callbackFired = true;
                                clearTimeout(timeoutId);
                                // Check manifest now that books are loaded
                                checkManifest(bookCount, syncTime);
                            });

                        } catch (error) {
                            console.error('Failed to sync:', error);
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

            const exportBackup = async () => {
                try {
                    const allBooks = await loadBooksFromIndexedDB();
                    const state = {
                        books: allBooks,
                        columns,
                        dataSource,
                        blankImageBooks: Array.from(blankImageBooks),
                        lastSyncTime: lastSyncTime || Date.now(),
                        backupDate: new Date().toISOString(),
                        version: APP_VERSION
                    };
                    const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `amazon-book-backup-${new Date().toISOString().split('T')[0]}.json`;
                    a.click();
                    URL.revokeObjectURL(url);
                    console.log('✅ Backup created');
                } catch (error) {
                    console.error('Failed to create backup:', error);
                    alert('Failed to create backup');
                }
            };

            const importRestore = async (e) => {
                const file = e.target.files[0];
                if (!file) return;
                
                try {
                    const text = await file.text();
                    const state = JSON.parse(text);
                    
                    if (state.books && state.columns) {
                        // Save books to IndexedDB
                        await saveBooksToIndexedDB(state.books);
                        setBooks(state.books);
                        
                        // Restore organization
                        setColumns(state.columns);
                        setDataSource(state.dataSource || 'enriched');
                        setBlankImageBooks(new Set(state.blankImageBooks || []));
                        setLastSyncTime(state.lastSyncTime || Date.now());
                        
                        console.log('✅ Restored from backup');
                        alert('✅ Successfully restored from backup!');
                    } else {
                        alert('Invalid backup file');
                    }
                } catch (e) {
                    console.error('Failed to restore:', e);
                    alert('Failed to restore from backup');
                }
            };

            const clearLibrary = async () => {
                if (!confirm('This will completely reset the app to its initial unused state.\n\n' +
                             'This will:\n' +
                             '• Unload the current library from the app\n' +
                             '• Remove all custom columns\n' +
                             '• Clear all book organization\n' +
                             '• Reset to empty "Unorganized" column\n\n' +
                             'You will need to load a library file to continue.\n\n' +
                             'Continue?')) {
                    return;
                }

                try {
                    await clearIndexedDB();
                    localStorage.removeItem(STORAGE_KEY);
                    localStorage.removeItem(CACHE_KEY);
                    setBooks([]);
                    setColumns([{ id: 'unorganized', name: 'Unorganized', books: [] }]);
                    setDataSource('none');
                    setBlankImageBooks(new Set());
                    setLastSyncTime(null);
                    setManifestData(null);
                    setSyncStatus('none');
                    console.log('✅ Cleared library - app reset to initial state');
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
                    await loadEnrichedData(text);
                } else if (file.name.endsWith('.csv')) {
                    loadBooksFromCSV(text);
                }
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

            const loadCollectionsData = async () => {
                try {
                    // Try to fetch collections data from same directory with cache-busting
                    const response = await fetch(`amazon-collections.json?t=${Date.now()}`);
                    if (!response.ok) {
                        console.log('No collections data file found (this is optional)');
                        return null;
                    }

                    const collectionsJson = await response.json();

                    // Validate schema version
                    if (collectionsJson.schemaVersion !== '1.0') {
                        console.warn('Collections data schema version mismatch, skipping');
                        return null;
                    }

                    // Create a Map indexed by ASIN for O(1) lookup
                    const collectionsMap = new Map();

                    collectionsJson.books.forEach(book => {
                        collectionsMap.set(book.asin, {
                            readStatus: book.readStatus,
                            collections: book.collections || []
                        });
                    });

                    console.log(`✅ Loaded collections data for ${collectionsMap.size} books`);
                    console.log(`   - ${collectionsJson.booksWithCollections} books have collections`);
                    console.log(`   - Fetcher version: ${collectionsJson.fetcherVersion}`);

                    setCollectionsData(collectionsMap);
                    return collectionsMap;
                } catch (error) {
                    console.log('Could not load collections data (this is optional):', error.message);
                    return null;
                }
            };

            const mergeCollectionsIntoBooks = async (booksToMerge) => {
                // Load collections data if not already loaded
                const collections = collectionsData || await loadCollectionsData();
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

            const loadEnrichedData = async (content, onComplete = null) => {
                const parsedData = JSON.parse(content);

                // Schema v3.0.0 - object with metadata and books array
                if (!parsedData.metadata || !parsedData.books) {
                    console.error('❌ Invalid library JSON format');
                    console.error('   Expected schema v3.0.0: {metadata, books}');
                    console.error('   Received:', Object.keys(parsedData));
                    throw new Error('Invalid library JSON format - please re-fetch your library using the latest fetcher');
                }

                const data = parsedData.books;
                const metadata = parsedData.metadata;

                console.log(`📋 Loaded schema ${metadata.schemaVersion}`);
                console.log(`   Total books: ${metadata.totalBooks}`);
                console.log(`   Books without descriptions: ${metadata.booksWithoutDescriptions}`);
                console.log(`   Fetched: ${new Date(metadata.fetchDate).toLocaleString()}`);
                console.log(`   Fetcher version: ${metadata.fetcherVersion}`);

                // Load collections data (optional, non-blocking)
                const collections = await loadCollectionsData();

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
                            hasEnrichedData: true,
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
                            hasEnrichedData: true,
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
                
                // Check if we have saved organization to restore
                try {
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
                            console.log('✅ Restored saved organization');
                            setDataSource('enriched');
                            setLastSyncTime(Date.now());
                            setSyncStatus('fresh');
                            if (onComplete) setTimeout(() => onComplete(metadata.totalBooks), 0);
                            return;
                        }
                    }
                } catch (e) {
                    console.log('Note: Could not restore organization, starting fresh');
                }
                
                // No saved organization, start fresh
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
                            default:
                                return 0;
                        }
                    });
                    
                    return { ...col, books: sortedBookIds };
                }));
                setSortMenuOpen(null);
            };

            const checkIfBlankImage = (img, bookId) => {
                if (img.naturalWidth === 1 && img.naturalHeight === 1) {
                    setBlankImageBooks(prev => new Set([...prev, bookId]));
                }
            };

            const openDeleteDialog = (columnId) => {
                const col = columns.find(c => c.id === columnId);
                
                if (col && col.books.length === 0) {
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
                
                setColumns(columns.filter(c => c.id !== deleteDialogOpen).map(c => 
                    c.id === deleteDestination ? { ...c, books: [...c.books, ...columnToDelete.books] } : c
                ));
                
                setDeleteDialogOpen(null);
                setDeleteDestination('');
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

                const visibleBooks = column.books;
                const startIdx = visibleBooks.findIndex(b => b.id === startBookId);
                const endIdx = visibleBooks.findIndex(b => b.id === endBookId);

                if (startIdx === -1 || endIdx === -1) return;

                const [min, max] = [Math.min(startIdx, endIdx), Math.max(startIdx, endIdx)];
                const rangeIds = visibleBooks.slice(min, max + 1).map(b => b.id);

                setSelectedBooks(new Set(rangeIds));
            };

            const clearSelection = () => {
                setSelectedBooks(new Set());
                setLastClickedBook(null);
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
                setDragCurrentPos({ x: e.clientX, y: e.clientY });
                setDraggedBook(book);
                setDraggedFromColumn(columnId);
                setIsDragging(false);
                setDropTarget(null);
            };

            const calculateDropPosition = (e, columnId) => {
                const column = columns.find(c => c.id === columnId);
                if (!column) return null;

                const columnElement = document.querySelector(`[data-column-id="${columnId}"] .book-grid`);
                if (!columnElement) return null;

                const bookElements = Array.from(columnElement.querySelectorAll('.book-item'));
                
                if (bookElements.length === 0) {
                    return { columnId, index: 0 };
                }

                const mouseX = e.clientX;
                const mouseY = e.clientY;
                let closestIndex = 0;
                let closestDistance = Infinity;

                bookElements.forEach((el, idx) => {
                    const rect = el.getBoundingClientRect();
                    const centerX = rect.left + rect.width / 2;
                    const centerY = rect.top + rect.height / 2;
                    
                    const distance = Math.sqrt(
                        Math.pow(mouseX - centerX, 2) + 
                        Math.pow(mouseY - centerY, 2)
                    );

                    if (distance < closestDistance) {
                        closestDistance = distance;
                        closestIndex = idx;
                    }
                });

                const closestRect = bookElements[closestIndex].getBoundingClientRect();
                const closestCenterX = closestRect.left + closestRect.width / 2;
                const closestCenterY = closestRect.top + closestRect.height / 2;
                
                const closestBookId = bookElements[closestIndex].dataset.bookId;
                const actualIndexInColumn = column.books.indexOf(closestBookId);
                
                if (actualIndexInColumn === -1) {
                    return { columnId, index: column.books.length };
                }
                
                const isRightOfBook = mouseX > closestCenterX;
                const isBelowBook = mouseY > closestCenterY;
                
                const insertAfter = isRightOfBook || (!isRightOfBook && isBelowBook);
                const insertIndex = insertAfter ? actualIndexInColumn + 1 : actualIndexInColumn;
                
                return { columnId, index: insertIndex };
            };

            const handleMouseMove = (e) => {
                if (draggedColumn) {
                    setDragCurrentPos({ x: e.clientX, y: e.clientY });
                    
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
                
                setDragCurrentPos({ x: e.clientX, y: e.clientY });
                
                const deltaX = e.clientX - dragStartPos.x;
                const deltaY = e.clientY - dragStartPos.y;
                const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
                
                if (distance > dragThreshold) {
                    if (!isDragging) {
                        setIsDragging(true);
                    }

                    const target = e.target.closest('[data-column-id]');
                    if (target) {
                        const columnId = target.dataset.columnId;
                        const dropPos = calculateDropPosition(e, columnId);
                        setDropTarget(dropPos);
                    } else {
                        setDropTarget(null);
                    }
                }
            };

            const handleMouseUp = (e) => {
                if (isDraggingColumn && draggedColumn && columnDropTarget !== null) {
                    const currentIndex = columns.findIndex(c => c.id === draggedColumn);
                    if (currentIndex !== -1 && currentIndex !== columnDropTarget) {
                        const newColumns = [...columns];
                        const [movedColumn] = newColumns.splice(currentIndex, 1);
                        const adjustedIndex = currentIndex < columnDropTarget ? columnDropTarget - 1 : columnDropTarget;
                        newColumns.splice(adjustedIndex, 0, movedColumn);
                        setColumns(newColumns);
                    }
                    
                    setDraggedColumn(null);
                    setIsDraggingColumn(false);
                    setColumnDropTarget(null);
                    return;
                }

                if (!isDragging || !draggedBook || !dropTarget) {
                    setDraggedBook(null);
                    setDraggedFromColumn(null);
                    setIsDragging(false);
                    setDropTarget(null);
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
                    setDropTarget(null);
                    clearSelection();
                    return;
                }

                // Determine which books to move
                const booksToMove = selectedBooks.size > 0 && selectedBooks.has(draggedBook.id)
                    ? Array.from(selectedBooks) // Move all selected books
                    : [draggedBook.id]; // Move just the dragged book

                if (draggedFromColumn === dropTarget.columnId) {
                    // Same column: reorder
                    setColumns(columns.map(col => {
                        if (col.id === draggedFromColumn) {
                            const newBooks = [...col.books];

                            // Remove all books to move
                            const booksToMoveFiltered = booksToMove.filter(id => newBooks.includes(id));
                            booksToMoveFiltered.forEach(id => {
                                const idx = newBooks.indexOf(id);
                                if (idx !== -1) newBooks.splice(idx, 1);
                            });

                            // Calculate adjusted insert index
                            let adjustedIndex = dropTarget.index;
                            booksToMoveFiltered.forEach(id => {
                                const originalIndex = col.books.indexOf(id);
                                if (originalIndex !== -1 && originalIndex < dropTarget.index) {
                                    adjustedIndex--;
                                }
                            });

                            // Insert all books at the target position
                            newBooks.splice(adjustedIndex, 0, ...booksToMoveFiltered);

                            return { ...col, books: newBooks };
                        }
                        return col;
                    }));
                } else {
                    // Cross-column: move books
                    setColumns(columns.map(col => {
                        if (col.id === draggedFromColumn) {
                            // Remove books from source column
                            return { ...col, books: col.books.filter(id => !booksToMove.includes(id)) };
                        }
                        if (col.id === dropTarget.columnId) {
                            // Add books to target column
                            const newBooks = [...col.books];
                            const insertIndex = Math.min(dropTarget.index, newBooks.length);
                            newBooks.splice(insertIndex, 0, ...booksToMove);
                            return { ...col, books: newBooks };
                        }
                        return col;
                    }));
                }

                setDraggedBook(null);
                setDraggedFromColumn(null);
                setIsDragging(false);
                setDropTarget(null);
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

            const filteredBooks = (bookIds) => {
                return bookIds.map(id => books.find(b => b.id === id)).filter(book => {
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

                    return matchesSearch && matchesReadStatus && matchesCollection;
                });
            };

            const renderStatusIndicator = () => {
                const newBooksCount = manifestData?.totalBooks - books.length;
                const bookWord = newBooksCount === 1 ? 'book' : 'books';

                // Pre-load ALL icons and show/hide with CSS - no src changes, instant display
                const iconStyle = (isVisible) => ({
                    width: '16px',
                    height: '16px',
                    marginRight: '4px',
                    verticalAlign: 'middle',
                    display: isVisible ? 'inline-block' : 'none'
                });

                const statusText = {
                    loading: 'Loading...',
                    none: 'Click here to load library',
                    fresh: `Fresh ${lastSyncTime ? `(${getRelativeTime(lastSyncTime)})` : ''}`,
                    stale: `Stale ${newBooksCount > 0 ? `(${newBooksCount} new ${bookWord})` : ''}`,
                    unknown: 'Unknown status - Please refresh'
                };

                const textClass = {
                    loading: 'text-gray-500',
                    none: 'text-gray-500',
                    fresh: 'text-green-700',
                    stale: 'text-orange-600',
                    unknown: 'text-red-600'
                };

                const isClickable = syncStatus !== 'loading';

                return (
                    <span
                        className={`text-sm ${textClass[syncStatus]} ${isClickable ? 'status-indicator' : ''}`}
                        onClick={isClickable ? () => setStatusModalOpen(true) : undefined}
                    >
                        <img src="images/busy.png" alt="Loading" style={iconStyle(syncStatus === 'loading')} className={syncStatus === 'loading' ? 'icon-spin' : ''} />
                        <img src="images/empty.png" alt="No library" style={iconStyle(syncStatus === 'none')} className={syncStatus === 'none' ? 'icon-pulse' : ''} />
                        <img src="images/fresh.png" alt="Fresh" style={iconStyle(syncStatus === 'fresh')} />
                        <img src="images/stale.png" alt="Stale" style={iconStyle(syncStatus === 'stale')} />
                        <img src="images/question-mark.png" alt="Unknown" style={iconStyle(syncStatus === 'unknown')} />
                        {statusText[syncStatus]}
                    </span>
                );
            };

            return (
                <div className="h-screen flex flex-col bg-gradient-to-br from-blue-50 to-indigo-100 text-gray-900" 
                     onMouseMove={handleMouseMove} 
                     onMouseUp={handleMouseUp}>
                    <div className="bg-white border-b border-gray-300 p-4 shadow-sm">
                        <div className="flex justify-between items-start mb-4">
                            <div className="flex items-center gap-3">
                                <div>
                                    <h1 className="text-2xl font-bold text-gray-900">
                                        Amazon Book Organizer
                                        {books.length > 0 && <span className="text-lg text-gray-500 ml-2">({books.length} books)</span>}
                                    </h1>
                                    <p className="text-sm text-gray-600 mt-1">
                                        {dataSource === 'enriched' ? '✨ With ratings & reviews' :
                                         dataSource === 'csv' ? '📄 Basic CSV data' :
                                         '📂 No library loaded'} • {APP_VERSION} • {renderStatusIndicator()}
                                    </p>
                                </div>
                            </div>
                            <div className="flex gap-2 items-center">
                                <button onClick={exportBackup} 
                                        className="px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium"
                                        disabled={books.length === 0}>
                                    💾 Backup
                                </button>
                                <label className="px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg cursor-pointer text-sm font-medium">
                                    📥 Restore
                                    <input type="file" accept=".json" onChange={importRestore} className="hidden" />
                                </label>
                                <button onClick={clearLibrary}
                                        className="px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium">
                                    🗑️ Clear Library
                                </button>
                                <button 
                                    onClick={() => setSettingsOpen(!settingsOpen)}
                                    className="text-gray-600 hover:text-gray-700 text-2xl font-bold w-8 h-8 flex items-center justify-center rounded-full bg-gray-200 hover:bg-gray-300"
                                    title="Settings">
                                    ⚙️
                                </button>
                                <button 
                                    onClick={() => setHelpOpen(!helpOpen)}
                                    className="text-blue-600 hover:text-blue-700 text-2xl font-bold w-8 h-8 flex items-center justify-center rounded-full bg-blue-100 hover:bg-blue-200"
                                    title="Help & Instructions">
                                    ?
                                </button>
                            </div>
                        </div>
                        
                        <div className="flex gap-4 items-center">
                            <div className="flex-1 relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                                    🔍
                                </span>
                                <input type="text"
                                       placeholder="Search by title or author..."
                                       value={searchTerm}
                                       onChange={(e) => setSearchTerm(e.target.value)}
                                       className="w-full pl-10 pr-10 py-2 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                                {searchTerm && (
                                    <button
                                        onClick={() => setSearchTerm('')}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xl"
                                        title="Clear search">
                                        ×
                                    </button>
                                )}
                            </div>

                            <select
                                value={readStatusFilter}
                                onChange={(e) => setReadStatusFilter(e.target.value)}
                                className="px-3 py-2 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                                title="Filter by read status">
                                <option value="">All Status</option>
                                <option value="READ">✓ Read</option>
                                <option value="UNREAD">○ Unread</option>
                                <option value="UNKNOWN">? Unknown</option>
                            </select>

                            <select
                                value={collectionFilter}
                                onChange={(e) => setCollectionFilter(e.target.value)}
                                className="px-3 py-2 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                                title="Filter by collection">
                                <option value="">🗂️ All Collections</option>
                                <option value="UNCOLLECTED">📚 Uncollected</option>
                                {getAllCollectionNames().map(name => (
                                    <option key={name} value={name}>{name}</option>
                                ))}
                            </select>

                            <button onClick={addColumn}
                                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2">
                                ➕ Add Column
                            </button>
                        </div>
                    </div>

                    {statusModalOpen && (
                        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => setStatusModalOpen(false)}>
                            <div className="bg-white rounded-lg shadow-2xl p-6 max-w-md w-full" onClick={(e) => e.stopPropagation()}>
                                <div className="flex justify-between items-start mb-4">
                                    <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                                        {syncStatus === 'fresh' && <><img src="images/fresh.png" alt="" className="status-icon" /> Fresh Data</>}
                                        {syncStatus === 'stale' && <><img src="images/stale.png" alt="" className="status-icon" /> Stale Data</>}
                                        {syncStatus === 'none' && <><img src="images/empty.png" alt="" className="status-icon" /> No Library Loaded</>}
                                        {syncStatus === 'unknown' && <><img src="images/question-mark.png" alt="" className="status-icon" /> Unknown Status</>}
                                    </h2>
                                    <button onClick={() => setStatusModalOpen(false)} className="text-gray-500 hover:text-gray-700 text-2xl">×</button>
                                </div>
                                
                                {syncStatus === 'fresh' && (
                                    <div className="space-y-3">
                                        <p className="text-sm text-gray-700">
                                            ✅ <strong>You're using the latest data!</strong>
                                        </p>
                                        <div className="text-sm text-gray-600">
                                            <p><strong>Books:</strong> {books.length}</p>
                                            <p><strong>Library loaded:</strong> {lastSyncTime && new Date(lastSyncTime).toLocaleString()}</p>
                                        </div>
                                        <div className="bg-blue-50 border border-blue-200 rounded p-3 text-sm text-gray-700">
                                            <p><strong>To add new books:</strong></p>
                                            <p className="mt-1">Run the fetcher console script on amazon.com/yourbooks, then click the Stale indicator to load the updated library.</p>
                                        </div>
                                    </div>
                                )}
                                
                                {syncStatus === 'stale' && (
                                    <div className="space-y-3">
                                        <p className="text-sm text-gray-700">
                                            📚 <strong>New data available from fetcher!</strong>
                                        </p>
                                        {manifestData && (
                                            <div className="text-sm text-gray-600">
                                                <p><strong>Manifest shows:</strong></p>
                                                <p>• Total books in file: {manifestData.totalBooks}</p>
                                                <p>• Your current books: {books.length}</p>
                                                <p>• New books to load: {manifestData.totalBooks - books.length}</p>
                                                <p className="mt-2"><strong>Last fetcher run:</strong> {new Date(manifestData.lastFetched).toLocaleString()}</p>
                                            </div>
                                        )}
                                        <button
                                            onClick={syncNow}
                                            className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg">
                                            Load Updated Library
                                        </button>
                                    </div>
                                )}
                                
                                {syncStatus === 'none' && (
                                    <div className="space-y-3">
                                        <p className="text-sm text-gray-700">
                                            No library data loaded yet.
                                        </p>
                                        <div className="bg-blue-50 border border-blue-200 rounded p-3 text-sm text-gray-700">
                                            <p><strong>To get started:</strong></p>
                                            <ol className="list-decimal ml-4 mt-2 space-y-1">
                                                <li>If you haven't already, run the fetcher console script on amazon.com/yourbooks (see README) to generate the library JSON file. Move the file from Downloads to your project folder.</li>
                                                <li>Click "Load Library" below to upload the file.</li>
                                            </ol>
                                            {/* TODO: Once GitHub Pages deployment is implemented, update this instruction to explain
                                                the bookmarklet approach instead of manual console script + file management. */}
                                        </div>
                                        <button 
                                            onClick={syncNow}
                                            className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg">
                                            Load Library
                                        </button>
                                    </div>
                                )}

                                {syncStatus === 'unknown' && (
                                    <div className="space-y-3">
                                        <p className="text-sm text-gray-700">
                                            ⚠️ <strong>Status check timed out.</strong>
                                        </p>
                                        <div className="bg-red-50 border border-red-200 rounded p-3 text-sm text-gray-700">
                                            <p>The library was loaded but the status verification didn't complete in time.</p>
                                            <p className="mt-2"><strong>Please refresh the page to continue.</strong></p>
                                        </div>
                                        <button
                                            onClick={() => window.location.reload()}
                                            className="w-full px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg">
                                            Refresh Page
                                        </button>
                                    </div>
                                )}
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
                                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg">
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
                                            <li><strong>Run Fetcher:</strong> Go to amazon.com/yourbooks and run the Console Fetcher script</li>
                                            <li><strong>Auto-saves:</strong> Fetcher creates amazon-library.json in your Downloads</li>
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
                                            <li><strong>Collect Series:</strong> Click "📚 Collect Series Books" in book details</li>
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
                                            <li><strong>Backup:</strong> Download complete backup for safekeeping</li>
                                            <li><strong>Restore:</strong> Restore from a backup file</li>
                                            <li><strong>Clear Library:</strong> Complete app reset to initial state</li>
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
                                <h2 className="text-xl font-bold text-gray-900 mb-4">Collect Series Books</h2>
                                
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
                                            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg">
                                            This Column Only
                                        </button>
                                    )}
                                    {seriesBooks.other.length > 0 && (
                                        <button 
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                collectSeriesBooks(true);
                                            }}
                                            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg">
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
                                            <img src={modalBook.coverUrl} 
                                                 alt={modalBook.title}
                                                 className="w-48 h-72 object-cover rounded shadow-lg flex-shrink-0"
                                                 onError={(e) => e.target.src = 'https://via.placeholder.com/192x288/4f46e5/fff?text=No+Cover'} />
                                        )}
                                        <div className="flex-1">
                                            <h2 className="text-3xl font-bold text-gray-900 mb-3">{modalBook.title}</h2>
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
                                                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium flex items-center gap-2">
                                                        📚 Collect Series Books
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
                                                {modalBook.asin && (
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-semibold text-gray-700">ASIN:</span>
                                                        <span className="text-gray-600 font-mono text-xs">{modalBook.asin}</span>
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
                                                    className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm">
                                                    Show More Reviews ({modalBook.topReviews.length - 3} more)
                                                </button>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="flex-1 overflow-x-auto overflow-y-hidden" onClick={(e) => {
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
                            {columns.map((column, colIndex) => (
                                <div key={column.id} 
                                     data-column-id={column.id}
                                     className={`flex-shrink-0 w-96 bg-white rounded-lg shadow-md flex flex-col relative ${isDragging && dropTarget?.columnId === column.id ? 'drop-target' : ''} ${draggedColumn === column.id && isDraggingColumn ? 'column-dragging' : ''}`}>
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
                                            <span className="text-sm text-gray-500">({filteredBooks(column.books).length})</span>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <div className="relative">
                                                <button 
                                                    onClick={(e) => { e.stopPropagation(); setSortMenuOpen(sortMenuOpen === column.id ? null : column.id); }}
                                                    className="p-1 hover:bg-gray-100 rounded text-lg"
                                                    title="Sort books">
                                                    ⬆
                                                </button>
                                                {sortMenuOpen === column.id && (
                                                    <div className="absolute right-0 top-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg z-50 w-48"
                                                         onClick={(e) => e.stopPropagation()}>
                                                        <div className="p-2">
                                                            <div className="text-xs font-semibold text-gray-600 mb-2 px-2">Sort by:</div>
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
                                                            <button onClick={() => sortColumn(column.id, 'acquired-desc')} className="w-full text-left px-2 py-1 hover:bg-gray-100 rounded text-sm">Date (Newest)</button>
                                                            <button onClick={() => sortColumn(column.id, 'acquired-asc')} className="w-full text-left px-2 py-1 hover:bg-gray-100 rounded text-sm">Date (Oldest)</button>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                            {columns.length > 1 && (
                                                <button onClick={(e) => { e.stopPropagation(); openDeleteDialog(column.id); }} 
                                                        className="p-1 hover:bg-gray-100 rounded text-xl"
                                                        title="Delete column">
                                                    ⌫
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex-1 overflow-y-auto p-4">
                                        <div className="grid grid-cols-3 gap-3 relative book-grid">
                                            {filteredBooks(column.books).map((book) => {
                                                const actualIndex = column.books.indexOf(book.id);
                                                return (
                                                    <div key={book.id} className="relative book-item" data-book-id={book.id}>
                                                        {isDragging && dropTarget?.columnId === column.id && dropTarget?.index === actualIndex && draggedBook?.id !== book.id && (
                                                            <div className="drop-indicator" style={{ top: '-6px' }} />
                                                        )}
                                                        <div className={`book-clickable ${selectedBooks.has(book.id) ? 'selected' : ''} ${draggedBook?.id === book.id && isDragging ? 'dragging' : ''}`}
                                                             onMouseDown={(e) => handleMouseDown(e, book, column.id)}
                                                             onClick={(e) => {
                                                                 e.stopPropagation();

                                                                 if (isDragging) return;

                                                                 if (e.ctrlKey || e.metaKey) {
                                                                     // Ctrl+Click: Toggle selection
                                                                     toggleBookSelection(book.id);
                                                                     setLastClickedBook({ id: book.id, columnId: column.id });
                                                                 } else if (e.shiftKey && lastClickedBook && lastClickedBook.columnId === column.id) {
                                                                     // Shift+Click: Range selection (only within same column)
                                                                     selectBookRange(lastClickedBook.id, book.id, column.id);
                                                                 } else {
                                                                     // Normal click: Clear selection and open modal
                                                                     clearSelection();
                                                                     openBookModal(book, column.id);
                                                                 }
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
                                                                    <img src={book.coverUrl} 
                                                                         alt={book.title} 
                                                                         className="w-full rounded shadow-lg"
                                                                         onLoad={(e) => checkIfBlankImage(e.target, book.id)}
                                                                         onError={(e) => e.target.src = 'https://via.placeholder.com/128x192/4f46e5/fff?text=No+Cover'} />
                                                                )}
                                                                {book.rating > 0 && (
                                                                    <div className="absolute top-1 right-1 bg-black bg-opacity-75 rounded px-1.5 py-0.5 text-xs font-bold text-yellow-400">
                                                                        ★ {book.rating.toFixed(1)}
                                                                    </div>
                                                                )}
                                                                {book.readStatus === 'READ' && (
                                                                    <div className="read-ribbon">
                                                                        READ
                                                                    </div>
                                                                )}
                                                                {selectedBooks.has(book.id) && (
                                                                    <div className="absolute top-1 left-1 bg-blue-600 rounded-full w-6 h-6 flex items-center justify-center z-10">
                                                                        <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                                                                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
                                                                        </svg>
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
                                            {isDragging && dropTarget?.columnId === column.id && dropTarget?.index >= column.books.length && (
                                                <div className="drop-indicator" style={{ bottom: '-6px' }} />
                                            )}
                                        </div>
                                    </div>
                                    {isDraggingColumn && columnDropTarget === colIndex + 1 && draggedColumn !== column.id && (
                                        <div className="column-drop-indicator" style={{ right: '-8px' }} />
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>

                    {selectedBooks.size > 0 && (
                        <div className="fixed bottom-20 right-4 bg-blue-600 text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-3 z-50">
                            <span className="font-medium">{selectedBooks.size} book{selectedBooks.size !== 1 ? 's' : ''} selected</span>
                            <button
                                onClick={clearSelection}
                                className="hover:bg-blue-700 px-3 py-1 rounded bg-blue-500 transition-colors">
                                Clear
                            </button>
                        </div>
                    )}

                    {contextMenu && (
                        <div className="fixed bg-white border border-gray-300 rounded-lg shadow-xl z-[60] py-1 min-w-[180px]"
                             style={{
                                 left: `${contextMenu.x}px`,
                                 top: `${contextMenu.y}px`
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
                                        clearSelection();
                                        setContextMenu(null);
                                    }}>
                                    📁 Move to "{col.name}"
                                </button>
                            ))}
                        </div>
                    )}

                    <div className="fixed bottom-2 right-2 text-xs text-gray-400">
                        v{APP_VERSION}
                    </div>

                    {isDragging && draggedBook && (
                        <div className="drag-ghost"
                             style={{
                                 left: dragCurrentPos.x - 50,
                                 top: dragCurrentPos.y - 75,
                                 width: '100px'
                             }}>
                            {/* Show stacked effect if dragging multiple books */}
                            {selectedBooks.size > 1 && selectedBooks.has(draggedBook.id) && (
                                <>
                                    <div className="absolute" style={{ left: '8px', top: '8px', opacity: 0.4 }}>
                                        <div className="w-full aspect-[2/3] rounded shadow-2xl border-2 border-blue-500 bg-blue-100" style={{ width: '100px' }}></div>
                                    </div>
                                    <div className="absolute" style={{ left: '4px', top: '4px', opacity: 0.6 }}>
                                        <div className="w-full aspect-[2/3] rounded shadow-2xl border-2 border-blue-500 bg-blue-200" style={{ width: '100px' }}></div>
                                    </div>
                                </>
                            )}
                            {/* Main dragged book */}
                            <div className="relative">
                                {blankImageBooks.has(draggedBook.id) ? (
                                    <div className="w-full aspect-[2/3] rounded shadow-2xl border-2 border-blue-500"
                                         style={{ backgroundColor: '#d4c5a9' }}>
                                        <div className="flex items-center justify-center h-full px-1">
                                            <div className="text-xs font-serif font-bold text-gray-800 text-center leading-tight">
                                                {draggedBook.title.length > 20 ? draggedBook.title.substring(0, 20) + '...' : draggedBook.title}
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <img src={draggedBook.coverUrl}
                                         alt={draggedBook.title}
                                         className="w-full rounded shadow-2xl border-2 border-blue-500" />
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
                </div>
            );
        }

        ReactDOM.render(<AmazonBookOrganizer />, document.getElementById('root'));
