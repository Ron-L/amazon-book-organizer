// storage.js - IndexedDB and Cache API operations
// Extracted from readerwrangler.js for reuse by Book Explorer
// v5.0.0-alpha.169.7
// Depends on: uiHelpers.js (normalizeBook)

// ===== IndexedDB Constants =====
const DB_NAME = "ReaderWranglerDB";
const DB_VERSION = 1;
const BOOKS_STORE = "books";

// ===== Cover Cache Constants =====
const COVER_CACHE_NAME = 'rw-covers';

// ===== IndexedDB Helper Functions =====
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

// v4.18.0.a - Merge logic: preserve orphan wishlist items on import
// Uses onWishlist field (normalized from legacy isWishlist/isOwned)
// v5.0.0-alpha.173.1 - Add preserveUserData param to control merge behavior
const saveBooksToIndexedDB = async (books, preserveUserData = false) => {
    try {
        console.log(`🔄 Saving ${books.length} books to IndexedDB... (preserveUserData: ${preserveUserData})`);

        const db = await openDB();

        let existingByAsin = new Map();
        let allBooks = books;

        // Only merge with existing data during imports, not React saves
        if (preserveUserData) {
            // Step 1: Load existing books BEFORE clearing (to preserve orphan wishlists)
            const existingBooks = await new Promise((resolve, reject) => {
                const readTxn = db.transaction([BOOKS_STORE], 'readonly');
                const readStore = readTxn.objectStore(BOOKS_STORE);
                const request = readStore.getAll();
                request.onsuccess = () => resolve(request.result || []);
                request.onerror = () => reject(request.error);
            });

            // Build map of existing books by ASIN (normalize to handle legacy isWishlist field)
            for (const book of existingBooks) {
                existingByAsin.set(book.asin, normalizeBook(book));
            }

            // Build set of ASINs in the new import
            const newAsins = new Set(books.map(b => b.asin));

            // Step 2: Find orphan wishlist items (in existing but not in new import)
            const orphanWishlists = [];
            for (const [asin, existingBook] of existingByAsin) {
                if (!newAsins.has(asin) && existingBook.onWishlist) {
                    orphanWishlists.push(existingBook);
                }
            }

            if (orphanWishlists.length > 0) {
                console.log(`📋 Preserving ${orphanWishlists.length} orphan wishlist items`);
            }

            // Step 3: Combine new books with orphan wishlists
            allBooks = [...books, ...orphanWishlists];
        }

        // Step 4: Deduplicate by ASIN (owned books take priority, preserve user metadata)
        const booksByAsin = new Map();
        const duplicates = [];
        const wishlistToOwned = [];

        for (const book of allBooks) {
            const existing = booksByAsin.get(book.asin);
            if (existing) {
                duplicates.push(book.asin);
                // Owned books (onWishlist falsy) take priority over wishlist
                if (existing.onWishlist && !book.onWishlist) {
                    // New book is owned, replace wishlist entry
                    // Preserve user metadata from wishlist entry (column assignment preserved via localStorage)
                    wishlistToOwned.push(book.asin);
                    // v5.4.7 - Respect userEdited flags from existing wishlist entry
                    const ueWish = existing.userEdited || {};
                    booksByAsin.set(book.asin, {
                        ...book,
                        title: ueWish.title ? existing.title : book.title,
                        author: ueWish.author ? existing.author : book.author,
                        series: ueWish.series ? existing.series : book.series,
                        seriesPosition: ueWish.seriesPosition ? existing.seriesPosition : book.seriesPosition,
                        addedToWishlist: existing.addedToWishlist,
                        // v5.0.0-alpha.163 - PRESERVE price goal when book transitions to owned
                        priceTrigger: existing.priceTrigger ?? book.priceTrigger,
                        targetPrice: existing.targetPrice ?? book.targetPrice,
                        myRating: existing.myRating ?? book.myRating,  // v5.0.0-alpha.175.31 - Personal rating
                        userEdited: ueWish  // Preserve the flags
                    });
                } else if (!existing.onWishlist && book.onWishlist) {
                    // Existing is owned, new is wishlist - keep existing
                    // v5.0.0-alpha.163 - Preserve addedToWishlist and price goals from wishlist
                    booksByAsin.set(book.asin, {
                        ...existing,
                        addedToWishlist: book.addedToWishlist ?? existing.addedToWishlist,
                        priceTrigger: book.priceTrigger ?? existing.priceTrigger,
                        targetPrice: book.targetPrice ?? existing.targetPrice,
                        myRating: book.myRating ?? existing.myRating  // v5.0.0-alpha.175.31 - Personal rating
                    });
                }
                // If both same ownership status, keep first occurrence (existing)
            } else {
                // Check if this ASIN existed before in IndexedDB (only during imports)
                const previousBook = preserveUserData ? existingByAsin.get(book.asin) : null;
                if (previousBook) {
                    // Track wishlist → owned transitions
                    if (previousBook.onWishlist && !book.onWishlist) {
                        wishlistToOwned.push(book.asin);
                    }
                    // v5.0.0-alpha.169.7 - Prefer incoming values, fall back to IndexedDB if null
                    // v5.0.0-alpha.173.1 - Only during imports (preserveUserData = true)
                    // v5.0.0-alpha.175.7 - Preserve tags, notes, hidden status
                    // v5.4.7 - Respect userEdited flags: keep user-edited fields from previous book
                    const ue = previousBook.userEdited || {};
                    if (Object.keys(ue).length > 0) {
                        console.log(`🛡️ Preserving user-edited fields for "${previousBook.title}":`, Object.keys(ue).join(', '));
                        if (ue.author) console.log(`   previousBook.author="${previousBook.author}" vs import.author="${book.author}"`);
                    }
                    const mergedBook = {
                        ...book,
                        title: ue.title ? previousBook.title : book.title,
                        author: ue.author ? previousBook.author : book.author,
                        series: ue.series ? previousBook.series : book.series,
                        seriesPosition: ue.seriesPosition ? previousBook.seriesPosition : book.seriesPosition,
                        addedToWishlist: book.addedToWishlist ?? previousBook.addedToWishlist,
                        priceTrigger: book.priceTrigger ?? previousBook.priceTrigger,
                        targetPrice: book.targetPrice ?? previousBook.targetPrice,
                        tags: book.tags ?? previousBook.tags,
                        note: book.note ?? previousBook.note,
                        hidden: book.hidden ?? previousBook.hidden,
                        myRating: book.myRating ?? previousBook.myRating,  // v5.0.0-alpha.175.31 - Personal rating
                        userEdited: ue  // Preserve the flags themselves
                    };
                    if (ue.author) console.log(`   ✅ merged.author="${mergedBook.author}"`);
                    booksByAsin.set(book.asin, mergedBook);
                } else {
                    // React saves: just save as-is, no merge
                    booksByAsin.set(book.asin, book);
                }
            }
        }

        const uniqueBooks = Array.from(booksByAsin.values());

        if (duplicates.length > 0) {
            console.warn(`⚠️  Found ${duplicates.length} duplicate ASINs, owned books take priority`);
            console.warn(`   Sample duplicates:`, duplicates.slice(0, 5));
        }

        if (wishlistToOwned.length > 0) {
            console.log(`🎉 ${wishlistToOwned.length} wishlist items now owned (price goals preserved)`);
        }

        // Step 5: Clear and save
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

        // Step 6: Add all unique books
        return new Promise((resolve, reject) => {
            const addTxn = db.transaction([BOOKS_STORE], 'readwrite');
            const addStore = addTxn.objectStore(BOOKS_STORE);

            // Add all unique books
            for (const book of uniqueBooks) {
                addStore.add(book);
            }

            addTxn.oncomplete = () => {
                console.log('✅ Saved', uniqueBooks.length, 'unique books to IndexedDB');
                resolve(uniqueBooks);  // Return merged books for UI state
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

// v4.18.0.a - Apply normalizeBook to handle legacy isWishlist/isOwned fields
const loadBooksFromIndexedDB = async () => {
    const db = await openDB();
    const transaction = db.transaction([BOOKS_STORE], 'readonly');
    const store = transaction.objectStore(BOOKS_STORE);
    const request = store.getAll();

    return new Promise((resolve, reject) => {
        request.onsuccess = () => {
            // Normalize all books to handle any legacy field formats
            const books = (request.result || []).map(normalizeBook);
            console.log('✅ Loaded', books.length, 'books from IndexedDB');
            resolve(books);
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

// ===== Cover Image Caching (v4.13.0) =====

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
