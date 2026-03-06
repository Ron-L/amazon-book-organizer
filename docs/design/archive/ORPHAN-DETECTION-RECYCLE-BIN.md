# Orphan Detection & Recycle Bin Design

**Feature**: Detect books no longer in Amazon library, with soft-delete and restore capability
**Status**: Planned
**Created**: 2026-01-07
**Updated**: 2026-03-04 — Orphan detection approach superseded by [SMART-FETCH-DESIGN.md](SMART-FETCH-DESIGN.md) (fetcher-side background scan replaces loadId approach). Recycle Bin design below remains valid.

---

## Problem Statement

When a book is removed from Amazon (returned, sample replaced by purchase, subscription expired), the app retains the book in IndexedDB. Users have no way to:
1. Know which books are "orphaned" (no longer in Amazon library)
2. Remove orphaned books without losing all organization
3. Recover accidentally deleted books

**Use Cases:**
- Sample downloaded, then full book purchased (sample auto-removed by Amazon)
- Book returned after purchase
- KU/Prime/KOLL subscription expired
- Family Library sharing revoked
- Duplicate imports from edge cases

---

## Solution Overview

### 1. Load ID Tracking

Each JSON import increments a `loadId`. Books from the JSON get the current `loadId`. After import, books with old `loadId` (and not marked as "kept") are flagged as orphans.

```javascript
// In settings (persisted)
settings.lastLoadId = 42;

// During load
const currentLoadId = settings.lastLoadId + 1;
settings.lastLoadId = currentLoadId;

// Each book from JSON
book.loadId = currentLoadId;

// After load - find orphans
const orphans = books.filter(b =>
  b.loadId !== currentLoadId &&
  !b.isKeptOrphan &&
  !b.isDeleted
);
```

### 2. Orphan Dialog

After import completes, if orphans exist, show dialog:

```
┌─────────────────────────────────────────────────┐
│  📚 3 books no longer in your Amazon library    │
├─────────────────────────────────────────────────┤
│                                                 │
│  [Book Cover] Title 1                           │
│               by Author                         │
│               [ Keep ] [ Delete ] [ Ignore ]    │
│                                                 │
│  [Book Cover] Title 2                           │
│               by Author                         │
│               [ Keep ] [ Delete ] [ Ignore ]    │
│                                                 │
│  ─────────────────────────────────────────────  │
│  [ Keep All ] [ Delete All ] [ Ignore All ]     │
│                                     [ Close ]   │
└─────────────────────────────────────────────────┘
```

**Button Actions:**

| Button | Effect | Flag Set | Re-prompt? |
|--------|--------|----------|------------|
| **Keep** | Keep forever, user accepts orphan status | `isKeptOrphan: true` | Never |
| **Delete** | Move to Recycle Bin | `isDeleted: true` | N/A (deleted) |
| **Ignore** | Skip for now | (none) | Next load |

---

## Data Model

```javascript
book: {
  // Existing fields...

  // Orphan detection (v4.10+)
  loadId: 42,              // Set during JSON import
  isKeptOrphan: false,     // User chose "Keep" - permanent

  // Recycle Bin (v4.10+)
  isDeleted: false,        // Soft-deleted
  deletedFromColumnId: null, // For restore
  deletedAt: null          // Timestamp for sorting (newest first)
}
```

---

## Recycle Bin (Virtual Column)

### Appearance

- Appears when "Show Recycle Bin" filter is checked
- Positioned as rightmost column (after all user columns)
- Header: "🗑️ Recycle Bin (N)" where N = count
- Visual styling: Slightly grayed/muted to distinguish from regular columns
- Books sorted by `deletedAt` descending (most recent first)

### Filter Toggle

Add checkbox to filter bar:
```
☐ Show Hidden  ☐ Show Recycle Bin
```

### Book Actions in Recycle Bin

Right-click menu:
- **Restore** - Returns book to original column (or Unsorted if column deleted)
- **Delete Permanently** - Removes from IndexedDB entirely

Column header menu:
- **Empty Recycle Bin** - Permanently delete all (with confirmation)

### Restore Logic

```javascript
const restoreBook = (book) => {
  const targetColumn = columns.find(c => c.id === book.deletedFromColumnId);

  if (targetColumn) {
    // Restore to original column (append to end)
    addBookToColumn(book, targetColumn.id);
  } else {
    // Column gone - fall back to Unsorted
    addBookToColumn(book, unsortedColumnId);
  }

  // Clear deleted state
  book.isDeleted = false;
  book.deletedFromColumnId = null;
  book.deletedAt = null;
};
```

**Edge Cases:**
- Original column deleted → Restore to Unsorted
- Original column renamed → Still works (by ID)
- Major reorg happened → Book appears in original column, user can move

---

## UI Components

### 1. Orphan Detection Dialog

- Modal triggered after JSON import if orphans found
- Shows book cover thumbnails for recognition
- Bulk actions: Keep All, Delete All, Ignore All
- Individual actions per book

### 2. Recycle Bin Column

- Virtual column (not persisted in columns array)
- Only rendered when filter enabled
- Cannot drag books INTO recycle bin (delete via right-click only)
- CAN drag books OUT (equivalent to Restore)

### 3. Right-Click Menu Additions

For any book:
- **Delete** → Sets `isDeleted: true`, moves to Recycle Bin

For books in Recycle Bin:
- **Restore** → Clears `isDeleted`, returns to original column
- **Delete Permanently** → Removes from IndexedDB

### 4. Filter Bar Addition

New checkbox: "Show Recycle Bin"
- When checked, Recycle Bin column appears
- Deleted books visible in their normal locations too (with visual indicator?)

---

## Implementation Phases

### Phase 1: Recycle Bin Infrastructure
- Add `isDeleted`, `deletedFromColumnId`, `deletedAt` fields
- Add "Delete" to right-click menu
- Add "Show Recycle Bin" filter
- Implement Recycle Bin virtual column
- Implement Restore action

### Phase 2: Orphan Detection
- Add `loadId` tracking to import process
- Add `isKeptOrphan` field
- Implement orphan detection after import
- Create Orphan Dialog UI
- Implement Keep/Delete/Ignore actions

### Phase 3: Polish
- Empty Recycle Bin action
- Delete Permanently action
- Visual indicator for deleted books (when shown in normal columns)
- Confirmation dialogs for destructive actions

---

## Complexity Estimate

- **Phase 1**: 4-6 hours (Recycle Bin basics)
- **Phase 2**: 3-4 hours (Orphan detection)
- **Phase 3**: 2-3 hours (Polish)
- **Total**: 9-13 hours

---

## Future Considerations

1. **Auto-empty Recycle Bin**: After 30 days? User setting?
2. **Recycle Bin size limit**: Prevent unbounded growth
3. **Export Recycle Bin**: Include in backup? Exclude?
4. **Undo integration**: Delete could push to undo stack instead of recycle bin

---

## Related Files

- `readerwrangler.js` - Main app, column rendering, right-click menu
- `docs/design/BADGES.md` - Visual indicator patterns
- `TODO.md` - Feature tracking
