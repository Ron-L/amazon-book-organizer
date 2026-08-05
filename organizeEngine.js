// organizeEngine.js — v6.13.0
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
//   opts:            { createSeriesFolders=true, sortByPosition=true, createMiscellaneous=false }
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

    const subActions = [];
    const createdFolders = [];
    const mergedFolders = [];
    let totalBooksOrganized = 0;
    const allBookIdsToOrganize = [];

    authorGroups.forEach(author => {
        const { seriesGroups, standaloneBooks } = groupBooksBySeries(author.books);
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
                if (seriesData.books.length >= seriesFolderMinBooks) {
                    const seriesFolderName = seriesData.originalName;
                    let seriesFolder = findFolder(seriesFolderName, targetFolder.id);
                    if (!seriesFolder) {
                        seriesFolder = { id: idGen('folder-series'), name: seriesFolderName, bookIds: [], parentId: targetFolder.id, collapsed: false };
                        folders.push(seriesFolder);
                        subActions.push({ type: 'CREATE_FOLDER', folderId: seriesFolder.id, parentId: targetFolder.id, folder: { ...seriesFolder } });
                    }
                    const ordered = sortByPosition
                        ? seriesData.books
                        : seriesData.books.slice().sort((a, b) => (a.dateAdded || '').localeCompare(b.dateAdded || ''));
                    const seriesBookIds = ordered.map(b => b.id).filter(id => !seriesFolder.bookIds.includes(id));
                    if (seriesBookIds.length > 0) {
                        seriesFolder.bookIds = [...seriesFolder.bookIds, ...seriesBookIds];
                        totalBooksOrganized += seriesBookIds.length;
                        allBookIdsToOrganize.push(...seriesBookIds);
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
                if (miscBookIds.length > 0) {
                    miscFolder.bookIds = [...miscFolder.bookIds, ...miscBookIds];
                    totalBooksOrganized += miscBookIds.length;
                    allBookIdsToOrganize.push(...miscBookIds);
                    subActions.push({ type: 'ADD_BOOKS_TO_FOLDER', folderId: miscFolder.id, bookIds: miscBookIds });
                }
            } else {
                booksToAuthorRoot.push(...standaloneBooks);
            }

            const rootBookIds = booksToAuthorRoot.map(b => b.id).filter(id => !targetFolder.bookIds.includes(id));
            if (rootBookIds.length > 0) {
                targetFolder.bookIds = [...targetFolder.bookIds, ...rootBookIds];
                totalBooksOrganized += rootBookIds.length;
                allBookIdsToOrganize.push(...rootBookIds);
                subActions.push({ type: 'ADD_BOOKS_TO_FOLDER', folderId: targetFolder.id, bookIds: rootBookIds });
            }
        } else {
            const bookIdsToAdd = author.books.map(b => b.id).filter(id => !targetFolder.bookIds.includes(id));
            if (bookIdsToAdd.length > 0) {
                targetFolder.bookIds = [...targetFolder.bookIds, ...bookIdsToAdd];
                totalBooksOrganized += bookIdsToAdd.length;
                allBookIdsToOrganize.push(...bookIdsToAdd);
                subActions.push({ type: 'ADD_BOOKS_TO_FOLDER', folderId: targetFolder.id, bookIds: bookIdsToAdd });
            }
        }
    });

    if (allBookIdsToOrganize.length > 0) {
        const inboxFolder = folders.find(f => f.id === '__inbox__');
        if (inboxFolder) {
            const bookIdsSet = new Set(allBookIdsToOrganize);
            inboxFolder.bookIds = inboxFolder.bookIds.filter(id => !bookIdsSet.has(id));
            subActions.push({ type: 'REMOVE_BOOKS_FROM_FOLDER', folderId: '__inbox__', bookIds: allBookIdsToOrganize });
        }
    }

    return { newFolders: folders, subActions, createdFolders, mergedFolders, totalBooksOrganized, allBookIdsToOrganize };
}

// Node export for unit tests (no-op in the browser classic-script context).
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { groupBooksBySeries, computeOrganizePlan, defaultOrganizeIdGen };
}
