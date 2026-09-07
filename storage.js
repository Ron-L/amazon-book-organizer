// storage.js - IndexedDB and Cache API operations
// Extracted from readerwrangler.js for reuse by Book Explorer
// v6.3.0 - Added write mutex and atomic transactions
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

// v6.3.0 - Write serialization mutex: queues concurrent saveBooksToIndexedDB calls
// so each completes before the next starts (prevents interleaving clear+add)
let _dbWriteQueue = Promise.resolve();

// v4.18.0.a - Merge logic: preserve orphan wishlist items on import
// v7.8.0 (item 0) - Wishlist decisions use isWishlisted() (uiHelpers.js, loads first) —
// ownershipType is the only decision source; onWishlist is copied through as wire baggage only.
// v5.0.0-alpha.173.1 - Add preserveUserData param to control merge behavior
const saveBooksToIndexedDB = async (books, preserveUserData = false) => {
    // Acquire write lock: queue behind any in-flight write
    let releaseLock;
    const myTurn = new Promise(r => { releaseLock = r; });
    const waitForPrev = _dbWriteQueue;
    _dbWriteQueue = myTurn;
    await waitForPrev;

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
                if (!newAsins.has(asin) && isWishlisted(existingBook)) {
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
                // Owned books (not wishlisted) take priority over wishlist
                if (isWishlisted(existing) && !isWishlisted(book)) {
                    // New book is owned, replace wishlist entry
                    // Preserve user metadata from wishlist entry (column assignment preserved via localStorage)
                    wishlistToOwned.push(book.asin);
                    // v6.12.0 - Per-field userEdited merge (see the previousBook branch below for rationale).
                    // `existing` is the earlier same-ASIN entry, which already carries merged local flags.
                    const ueWish = existing.userEdited || {};
                    // v5.4.8 - If user manually set ownership, preserve their choice
                    const preserveOwnership = ueWish.onWishlist;
                    booksByAsin.set(book.asin, {
                        ...book,
                        title: ueWish.title ? existing.title : book.title,
                        author: ueWish.author ? existing.author : book.author,
                        series: ueWish.series ? existing.series : book.series,
                        seriesPosition: ueWish.seriesPosition ? existing.seriesPosition : book.seriesPosition,
                        onWishlist: preserveOwnership ? existing.onWishlist : book.onWishlist,
                        ownershipType: preserveOwnership ? existing.ownershipType : book.ownershipType,
                        addedToWishlist: existing.addedToWishlist,
                        // v5.0.0-alpha.163 - PRESERVE price goal when book transitions to owned
                        priceTrigger: existing.priceTrigger ?? book.priceTrigger,
                        targetPrice: existing.targetPrice ?? book.targetPrice,
                        myRating: existing.myRating ?? book.myRating,  // v5.0.0-alpha.175.31 - Personal rating
                        userEdited: { ...(book.userEdited || {}), ...ueWish }  // v6.12.0 - union flags
                    });
                } else if (!isWishlisted(existing) && isWishlisted(book)) {
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
                    if (isWishlisted(previousBook) && !isWishlisted(book)) {
                        wishlistToOwned.push(book.asin);
                    }
                    // v5.0.0-alpha.169.7 - Prefer incoming values, fall back to IndexedDB if null
                    // v5.0.0-alpha.173.1 - Only during imports (preserveUserData = true)
                    // v5.0.0-alpha.175.7 - Preserve tags, notes, hidden status
                    // v6.12.0 - Per-field userEdited merge (replaces the old "incoming has userEdited ⇒ it's a
                    // backup, apply its values wholesale" heuristic). Genuine backup restores never reach this
                    // branch — they call saveBooksToIndexedDB with preserveUserData=false and save as-is. So
                    // incoming data here is ALWAYS relay/Amazon, which the app itself may have re-uploaded WITH
                    // userEdited (e.g. after permanent delete). Treating that as a backup let stale relay values
                    // clobber local edits — a cleared series reappearing on import (bug #4).
                    // Rule per field: if the LOCAL copy edited it, keep local; otherwise take the incoming value
                    // (which already carries another device's edit, if any). Union the flags so an edit-marker
                    // propagates across devices in both directions. Same-field two-device conflict → local wins.
                    const ue = previousBook.userEdited || {};
                    if (Object.keys(ue).length > 0) {
                        console.log(`🛡️ Preserving user-edited fields for "${previousBook.title}":`, Object.keys(ue).join(', '));
                    }
                    booksByAsin.set(book.asin, {
                        ...book,
                        title: ue.title ? previousBook.title : book.title,
                        author: ue.author ? previousBook.author : book.author,
                        series: ue.series ? previousBook.series : book.series,
                        seriesPosition: ue.seriesPosition ? previousBook.seriesPosition : book.seriesPosition,
                        onWishlist: ue.onWishlist ? previousBook.onWishlist : book.onWishlist,  // v5.4.8 - Ownership toggle
                        ownershipType: ue.onWishlist ? previousBook.ownershipType : book.ownershipType,  // v5.4.8
                        addedToWishlist: book.addedToWishlist ?? previousBook.addedToWishlist,
                        priceTrigger: book.priceTrigger ?? previousBook.priceTrigger,
                        targetPrice: book.targetPrice ?? previousBook.targetPrice,
                        tags: book.tags ?? previousBook.tags,
                        note: book.note ?? previousBook.note,
                        isHidden: ue.isHidden ? previousBook.isHidden : book.isHidden,  // v6.12.0 - F4: was a phantom `hidden` field (real field is isHidden). isHidden is user-owned → defer to local edit, else take incoming.
                        // v7.7.0-alpha.12 (2026-09-04, FORMAT POLICY) - Format is user-editable: an edited
                        // binding wins over every fetch, forever; otherwise take the incoming verbatim value,
                        // but never let an incoming BLANK erase a known binding (a lean run without
                        // bindingInformation must not undo the scan's backfill).
                        binding: ue.binding ? previousBook.binding : (book.binding ?? previousBook.binding),
                        myRating: book.myRating ?? previousBook.myRating,  // v5.0.0-alpha.175.31 - Personal rating
                        userEdited: { ...(book.userEdited || {}), ...ue },  // v6.12.0 - union: inherit other-device flags, keep local
                        // v6.0.0-alpha.48 - Preserve Trash state (user-initiated, survives relay imports)
                        // v6.12.0 - OR-merge soft-delete (backups don't reach this branch; relay imports preserve it)
                        isDeleted: previousBook.isDeleted || book.isDeleted || false,
                        deletedAt: previousBook.deletedAt || book.deletedAt || null,
                        deletedFromFolderIds: previousBook.deletedFromFolderIds || book.deletedFromFolderIds || null
                    });
                } else {
                    // React saves: just save as-is, no merge
                    booksByAsin.set(book.asin, book);
                }
            }
        }

        const uniqueBooks = Array.from(booksByAsin.values());
        // v6.17.1 - Surface the ownership-upgrade count (wishlist/sample → owned this import) so the import
        // summary can report it separately — upgrades don't change the total, so "N new" alone hid them.
        uniqueBooks.wishlistToOwnedCount = wishlistToOwned.length;
        // v7.1.0 - Of those upgrades, how many still carry a price goal (deliberately preserved since v5):
        // the import summary nudges the user to clear goals on books they've now bought.
        uniqueBooks.wishlistToOwnedGoalCount = wishlistToOwned.filter(asin => {
            const b = booksByAsin.get(asin);
            return b && (b.targetPrice != null || b.priceTrigger != null);
        }).length;

        if (duplicates.length > 0) {
            console.warn(`⚠️  Found ${duplicates.length} duplicate ASINs, owned books take priority`);
            console.warn(`   Sample duplicates:`, duplicates.slice(0, 5));
        }

        if (wishlistToOwned.length > 0) {
            console.log(`🎉 ${wishlistToOwned.length} wishlist items now owned (price goals preserved)`);
        }

        // v6.3.0 - Atomic clear+add in single transaction (prevents race where
        // a concurrent read sees empty store between separate clear and add txns)
        return new Promise((resolve, reject) => {
            const txn = db.transaction([BOOKS_STORE], 'readwrite');
            const store = txn.objectStore(BOOKS_STORE);
            store.clear();
            for (const book of uniqueBooks) {
                store.add(book);
            }
            txn.oncomplete = () => {
                console.log('✅ Saved', uniqueBooks.length, 'unique books to IndexedDB');
                resolve(uniqueBooks);
            };
            txn.onerror = () => {
                const error = txn.error || new Error('IndexedDB transaction failed');
                console.error('❌ IndexedDB save failed:', error);
                reject(error);
            };
        });
    } catch (error) {
        console.error('❌ IndexedDB save exception:', error);
        throw error || new Error('IndexedDB save failed');
    } finally {
        releaseLock();
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

const clearIndexedDB = () => {
    return new Promise((resolve, reject) => {
        const request = indexedDB.deleteDatabase(DB_NAME);
        request.onsuccess = () => { console.log('✅ Deleted IndexedDB:', DB_NAME); resolve(); };
        request.onerror = () => { console.error('❌ Failed to delete IndexedDB:', DB_NAME, request.error); reject(request.error); };
        request.onblocked = () => { console.warn('⚠️ IndexedDB delete blocked — close other tabs'); resolve(); };
    });
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
