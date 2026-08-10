// organizeEngine.js — v6.17.0
// Pure, testable core of Auto-Organize, extracted from readerwrangler.js's executeWizardOrganize so the
// wizard AND the (upcoming) right-click Auto-Organize share ONE engine. No React, no globals: inputs →
// deterministic output. Loaded as a classic <script> (functions become global, like uiHelpers.js) and
// require()-able in Node for unit tests (see test/organizeEngine.test.js).

// Group an author's books into series buckets (position-sorted) vs standalone. Pure.
function groupBooksBySeries(books) {
    const seriesMap = new Map(); // normalized series name → {originalName, books[]}
    const standaloneBooks = [];

    books.forEach(book => {
        if (book.series && book.series.trim()) {
            const normalizedSeries = book.series.trim().toLowerCase();
            if (!seriesMap.has(normalizedSeries)) {
                seriesMap.set(normalizedSeries, { originalName: book.series.trim(), books: [] });
            }
            seriesMap.get(normalizedSeries).books.push(book);
        } else {
            standaloneBooks.push(book);
        }
    });

    // Sort books within each series by position (dateAdded tiebreaker/fallback).
    seriesMap.forEach((seriesData) => {
        seriesData.books.sort((a, b) => {
            const posA = a.seriesPosition;
            const posB = b.seriesPosition;
            if (posA !== null && posA !== undefined && posB !== null && posB !== undefined) {
                if (posA !== posB) return posA - posB;
            }
            const dateA = a.dateAdded || '';
            const dateB = b.dateAdded || '';
            return dateA.localeCompare(dateB);
        });
    });

    return { seriesGroups: seriesMap, standaloneBooks };
}

// Default (non-deterministic) folder-id generator. Tests inject a deterministic one.
function defaultOrganizeIdGen(prefix) {
    return prefix + '-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
}

// Compute the folder mutations for organizing a set of author groups into an Author/Series hierarchy.
// PURE — never mutates `existingFolders`; returns a fresh folders array + undo subActions + summary.
//   authorGroups:    [{ displayName, books: [...] }]  (books already scoped to what should be filed)
//   existingFolders: current folders (incl. the '__inbox__' folder)
//   opts:            { createSeriesFolders=true, sortByPosition=true, createMiscellaneous=false, sourceFolderId='__inbox__' }
//   opts.sourceFolderId: the folder the books came from — organized books are removed from it (the
//                        "move out of current folder" step). Defaults to '__inbox__' (prior behavior).
//                        The sentinel '__all__' means CONSOLIDATE (all-source): the books were gathered
//                        from everywhere, so each organized book is removed from EVERY real custodial
//                        folder it lived in except its new destination — collapsing a scattered author.
//   idGen:           (prefix) => id   (inject for determinism in tests)
function computeOrganizePlan(authorGroups, existingFolders, opts, idGen) {
    opts = opts || {};
    const createSeriesFolders = opts.createSeriesFolders !== false; // default true
    const sortByPosition      = opts.sortByPosition !== false;      // default true
    const createMiscellaneous = opts.createMiscellaneous === true;  // default false
    // Minimum books of a series before it earns its own subfolder. Wizard default 2 (avoid singleton-series
    // clutter in bulk runs); right-click "By Series" passes 1 (explicit intent → always make the folder).
    const seriesFolderMinBooks = opts.seriesFolderMinBooks != null ? opts.seriesFolderMinBooks : 2;
    idGen = idGen || defaultOrganizeIdGen;

    // Copy-on-write: never mutate the caller's folder objects.
    const folders = existingFolders.map(f => ({ ...f, bookIds: [...(f.bookIds || [])] }));
    const findFolder = (name, parentId) => folders.find(f => f.name === name && f.parentId === parentId);

    // v6.14.0 - Source scope + de-organize guard. `sourceFolderId` is the folder the books came from
    // (default the Inbox, preserving prior callers). A destination that IS the source folder or an
    // ANCESTOR of it would move books up/out of an existing home (de-organize) — `wouldDeOrganize`
    // skips those adds. New folders can't be ancestors of the source, so this only ever blocks adds
    // into an already-existing same-or-ancestor folder; an Inbox/unfiled source (no folder chain) is
    // never a de-organize, so the guard is a no-op there.
    const sourceFolderId = opts.sourceFolderId || '__inbox__';
    const folderById = new Map(folders.map(f => [f.id, f]));
    const wouldDeOrganize = (destFolderId) => {
        let cur = sourceFolderId, guard = 0;
        while (cur && guard++ < 100) {
            if (cur === destFolderId) return true;
            const f = folderById.get(cur);
            cur = f ? f.parentId : null;
        }
        return false;
    };

    const subActions = [];
    const createdFolders = [];
    const mergedFolders = [];
    let totalBooksOrganized = 0;
    const allBookIdsToOrganize = [];
    const destOf = new Map(); // consolidate mode: organized book id → the destination folder it was filed into

    authorGroups.forEach(author => {
        // Consolidate (all-source): the target author's OWN folder subtree is excluded from the source — a
        // book already living anywhere under this author's folder stays exactly where it is. We only pull in
        // OUTSIDERS (scattered elsewhere / unfiled). So By Author fills the author root WITHOUT emptying
        // existing series subfolders, and By Series fills series folders without reshuffling what's home.
        let booksToFile = author.books;
        if (sourceFolderId === '__all__') {
            const authorFolder = findFolder(author.displayName, null);
            if (authorFolder) {
                const subtree = new Set([authorFolder.id]);
                let grew = true;
                while (grew) {
                    grew = false;
                    folders.forEach(f => { if (f.parentId && subtree.has(f.parentId) && !subtree.has(f.id)) { subtree.add(f.id); grew = true; } });
                }
                const insideIds = new Set();
                folders.forEach(f => { if (subtree.has(f.id)) (f.bookIds || []).forEach(id => insideIds.add(id)); });
                booksToFile = author.books.filter(b => !insideIds.has(b.id));
            }
        }
        const { seriesGroups, standaloneBooks } = groupBooksBySeries(booksToFile);
        const folderName = author.displayName;

        let targetFolder = findFolder(folderName, null);
        if (!targetFolder) {
            targetFolder = { id: idGen('folder-author'), name: folderName, bookIds: [], parentId: null, collapsed: false };
            folders.push(targetFolder);
            createdFolders.push(folderName);
            subActions.push({ type: 'CREATE_FOLDER', folderId: targetFolder.id, parentId: null, folder: { ...targetFolder } });
        } else {
            mergedFolders.push(folderName);
        }

        if (createSeriesFolders) {
            const booksToAuthorRoot = [];

            seriesGroups.forEach((seriesData) => {
                const seriesFolderName = seriesData.originalName;
                const existingSeriesFolder = findFolder(seriesFolderName, targetFolder.id);
                // v6.16.0 - An existing series folder ALWAYS receives its books. The threshold only gates whether to
                // CREATE a new folder — so we never split a series that already has a home (existing 9 + new 3 must
                // land together in the folder, not scatter 3 to the author root just because 3 < threshold).
                if (existingSeriesFolder || seriesData.books.length >= seriesFolderMinBooks) {
                    let seriesFolder = existingSeriesFolder;
                    if (!seriesFolder) {
                        seriesFolder = { id: idGen('folder-series'), name: seriesFolderName, bookIds: [], parentId: targetFolder.id, collapsed: false };
                        folders.push(seriesFolder);
                        subActions.push({ type: 'CREATE_FOLDER', folderId: seriesFolder.id, parentId: targetFolder.id, folder: { ...seriesFolder } });
                    }
                    const ordered = sortByPosition
                        ? seriesData.books
                        : seriesData.books.slice().sort((a, b) => (a.dateAdded || '').localeCompare(b.dateAdded || ''));
                    const seriesBookIds = ordered.map(b => b.id).filter(id => !seriesFolder.bookIds.includes(id));
                    if (seriesBookIds.length > 0 && !wouldDeOrganize(seriesFolder.id)) {
                        seriesFolder.bookIds = [...seriesFolder.bookIds, ...seriesBookIds];
                        totalBooksOrganized += seriesBookIds.length;
                        allBookIdsToOrganize.push(...seriesBookIds);
                        seriesBookIds.forEach(id => destOf.set(id, seriesFolder.id));
                        subActions.push({ type: 'ADD_BOOKS_TO_FOLDER', folderId: seriesFolder.id, bookIds: seriesBookIds });
                    }
                } else {
                    booksToAuthorRoot.push(...seriesData.books);
                }
            });

            if (createMiscellaneous && standaloneBooks.length > 0) {
                const miscFolderName = 'Miscellaneous';
                let miscFolder = findFolder(miscFolderName, targetFolder.id);
                if (!miscFolder) {
                    miscFolder = { id: idGen('folder-misc'), name: miscFolderName, bookIds: [], parentId: targetFolder.id, collapsed: false };
                    folders.push(miscFolder);
                    subActions.push({ type: 'CREATE_FOLDER', folderId: miscFolder.id, parentId: targetFolder.id, folder: { ...miscFolder } });
                }
                const miscBookIds = standaloneBooks.slice()
                    .sort((a, b) => (a.dateAdded || '').localeCompare(b.dateAdded || ''))
                    .map(b => b.id).filter(id => !miscFolder.bookIds.includes(id));
                if (miscBookIds.length > 0 && !wouldDeOrganize(miscFolder.id)) {
                    miscFolder.bookIds = [...miscFolder.bookIds, ...miscBookIds];
                    totalBooksOrganized += miscBookIds.length;
                    allBookIdsToOrganize.push(...miscBookIds);
                    miscBookIds.forEach(id => destOf.set(id, miscFolder.id));
                    subActions.push({ type: 'ADD_BOOKS_TO_FOLDER', folderId: miscFolder.id, bookIds: miscBookIds });
                }
            } else {
                booksToAuthorRoot.push(...standaloneBooks);
            }

            const rootBookIds = booksToAuthorRoot.map(b => b.id).filter(id => !targetFolder.bookIds.includes(id));
            if (rootBookIds.length > 0 && !wouldDeOrganize(targetFolder.id)) {
                targetFolder.bookIds = [...targetFolder.bookIds, ...rootBookIds];
                totalBooksOrganized += rootBookIds.length;
                allBookIdsToOrganize.push(...rootBookIds);
                rootBookIds.forEach(id => destOf.set(id, targetFolder.id));
                subActions.push({ type: 'ADD_BOOKS_TO_FOLDER', folderId: targetFolder.id, bookIds: rootBookIds });
            }
        } else {
            const bookIdsToAdd = booksToFile.map(b => b.id).filter(id => !targetFolder.bookIds.includes(id));
            if (bookIdsToAdd.length > 0 && !wouldDeOrganize(targetFolder.id)) {
                targetFolder.bookIds = [...targetFolder.bookIds, ...bookIdsToAdd];
                totalBooksOrganized += bookIdsToAdd.length;
                allBookIdsToOrganize.push(...bookIdsToAdd);
                bookIdsToAdd.forEach(id => destOf.set(id, targetFolder.id));
                subActions.push({ type: 'ADD_BOOKS_TO_FOLDER', folderId: targetFolder.id, bookIds: bookIdsToAdd });
            }
        }
    });

    if (allBookIdsToOrganize.length > 0) {
        const bookIdsSet = new Set(allBookIdsToOrganize);
        if (sourceFolderId === '__all__') {
            // Consolidate (all-source): the books were gathered from EVERYWHERE. Remove each organized book
            // from its source folders EXCEPT the destination it was just filed into — collapsing a scattered
            // author into one home. `opts.consolidateRemovals` ({ bookId: [folderId,...] }) is the user's
            // per-membership pick: when present, a book is pulled ONLY from the folders they selected (so a
            // deliberate membership can be kept); when absent, it's pulled from all its folders (select-all).
            // Virtual containers (the All Books view, Trash, Book Lists) are never touched; the Inbox IS real.
            const removals = opts.consolidateRemovals || null;
            const VIRTUAL = new Set(['__all__', '__library__', '__views__', '__booklists__', '__trash__', '__search__']);
            folders.forEach(f => {
                if (VIRTUAL.has(f.id)) return;
                const toRemove = (f.bookIds || []).filter(id => {
                    if (!bookIdsSet.has(id) || destOf.get(id) === f.id) return false;
                    if (!removals) return true; // no pick → pull from every source (select-all default)
                    const picked = removals[id];
                    return Array.isArray(picked) && picked.includes(f.id);
                });
                if (toRemove.length > 0) {
                    const removeSet = new Set(toRemove);
                    f.bookIds = f.bookIds.filter(id => !removeSet.has(id));
                    subActions.push({ type: 'REMOVE_BOOKS_FROM_FOLDER', folderId: f.id, bookIds: toRemove });
                }
            });
        } else {
            // Move out of the single source folder (default the Inbox). Only that folder's membership is
            // touched — a book's other folder/list memberships are left intact.
            const sourceFolder = folders.find(f => f.id === sourceFolderId);
            if (sourceFolder) {
                sourceFolder.bookIds = sourceFolder.bookIds.filter(id => !bookIdsSet.has(id));
                subActions.push({ type: 'REMOVE_BOOKS_FROM_FOLDER', folderId: sourceFolderId, bookIds: allBookIdsToOrganize });
            }
        }
    }

    return { newFolders: folders, subActions, createdFolders, mergedFolders, totalBooksOrganized, allBookIdsToOrganize };
}

// Node export for unit tests (no-op in the browser classic-script context).
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { groupBooksBySeries, computeOrganizePlan, defaultOrganizeIdGen };
}
