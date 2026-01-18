# Cut/Copy/Paste Feature Design Document

**Feature**: Cut, Copy, Paste, and Delete for books with multi-placement support
**Status**: Priority 1 (TODO P1-0-E)
**Created**: 2025-11-24
**Updated**: 2026-01-13

---

## Overview

Enable standard clipboard operations (Cut/Copy/Paste) for books, plus Ctrl+Drag for copy and DEL key for delete. This allows books to appear in multiple columns simultaneously (e.g., an anthology in both "Sci-Fi" and "Fantasy" columns).

**Use Cases:**
- Long-distance moves without awkward dragging
- Filter → Cut → Unfilter → Paste workflow
- Anthologies/crossovers appearing in multiple series columns
- Duplicate placement at different positions in same column

---

## User Actions

### Keyboard Shortcuts

| Key | Action | Clipboard After |
|-----|--------|-----------------|
| **Ctrl+X** | Cut selected books | `{type: 'cut', bookIds: [...], sourcePositions: [...]}` |
| **Ctrl+C** | Copy selected books | `{type: 'copy', bookIds: [...]}` |
| **Ctrl+V** | Paste to active column (at top) | Cut: cleared / Copy: unchanged |
| **Escape** | Cancel operation, clear clipboard | Cleared |
| **DEL** | Delete selected books from current column(s) | Unchanged |

### Mouse Actions

| Action | Behavior |
|--------|----------|
| **Drag** | Move (existing behavior) |
| **Ctrl+Drag** | Copy to drop target (keeps original) |

### Context Menu

Existing "Move to >" submenu. Add parallel:
- **"Copy to >"** submenu with same column list

---

## Visual Feedback

### Book Appearance

| State | Opacity | Border | Badge |
|-------|---------|--------|-------|
| **Normal** | 100% | none | - |
| **Selected** | 100% | none | Blue ✓ (existing) |
| **Cut pending** | 50% | 2px dashed orange | - |
| **Copy pending** | 100% | 2px dashed blue | - |
| **Ctrl+Drag** | Ghost follows cursor | - | "+" indicator |

### Status Bar Messages

The existing selection status bar (bottom-right, shows "X book(s) selected") will be enhanced:

| State | Message |
|-------|---------|
| **Books selected** | "3 book(s) selected" + Clear button (existing) |
| **Cut pending** | "✂️ 3 books cut - Ctrl+V to paste, Esc to cancel" |
| **Copy pending** | "📋 3 books copied - Ctrl+V to paste, Esc to cancel" |
| **After cut+paste** | "Moved 3 books to [Column Name]" (auto-dismiss 3s) |
| **After copy+paste** | "Copied 3 books to [Column Name]" (auto-dismiss 3s) |
| **Paste with no target** | "Click a column first" (auto-dismiss 2s) |
| **Last copy warning** | Modal prompt (see Delete Behavior) |

---

## Clipboard State Management

### State Structure

```javascript
const [clipboard, setClipboard] = useState(null);
// null when empty, otherwise:
// {
//   type: 'cut' | 'copy',
//   bookIds: string[],           // Book IDs in clipboard
//   sourcePositions: [           // For cut only - needed for undo
//     { columnId: string, index: number, bookId: string }
//   ]
// }
```

### Clipboard Behavior

| Operation | Source Books | Clipboard After |
|-----------|--------------|-----------------|
| **Cut then Paste** | Removed from source | Cleared |
| **Cut then Escape** | Restored to normal | Cleared |
| **Copy then Paste** | Unchanged (dashed border remains) | Unchanged (can paste again) |
| **Copy then Escape** | Restored to normal | Cleared |
| **New Cut/Copy** | Previous clipboard replaced | New clipboard |

---

## Paste Behavior

### Target Determination

1. **Active column exists**: Paste at index 0 (top of column)
2. **No active column**: Do nothing, show "Click a column first"

Active column is set when user clicks any book in a column (existing `activeColumnId` state).

### Paste Position

- Books inserted at **top of column** (index 0)
- Order preserved: first book in clipboard = top position
- Subsequent pastes (copy mode) stack at top

### Multi-Select Paste

When multiple books are in clipboard:
- All books inserted at target
- Maintains selection order
- Single undo action reverts entire paste

---

## Delete Behavior

### DEL Key

1. Get all selected books
2. For each selected book, determine its column (from `lastClickedBook` context or selection source)
3. Remove book from that specific column only
4. If book exists in other columns, those placements remain

### Last Copy Warning

Before removing a book's **last** placement:

```
┌─────────────────────────────────────────────────────────┐
│  Remove from all columns?                               │
│                                                         │
│  "[Book Title]" will be removed from view.              │
│  Book data is preserved and will reappear on next       │
│  library import.                                        │
│                                                         │
│  [Cancel]                        [Remove]               │
└─────────────────────────────────────────────────────────┘
```

For multi-select with mixed last/non-last copies:
- Show warning listing all "last copy" books
- User can proceed (removes all) or cancel (removes none)

---

## Book Count Display

### Header Count

```
2,334 Books                    // No copies exist
2,334 Books (+3 copies)        // 3 additional placements exist
```

Calculation:
- **Unique books**: `books.length` (unchanged)
- **Copy count**: Total placements across all columns minus unique books

### Column Header Count

Shows actual count including copies. If same book appears twice in column, count = 2.

---

## Data Model

### Current Structure (unchanged)

```javascript
// books[] - flat array of book objects (one per unique book)
const [books, setBooks] = useState([]);

// columns[] - each column has books array of IDs/dividers
const [columns, setColumns] = useState([
  { id: 'unorganized', name: 'Unorganized', books: ['book-1', 'book-2', ...] },
  { id: 'col-123', name: 'Sci-Fi', books: ['book-1', 'book-3', {type: 'divider', ...}] }
]);
```

### Copy Implementation

Same book ID appears in multiple column.books arrays:
```javascript
// Book "book-1" in both Sci-Fi and Fantasy columns
columns[0].books = ['book-1', 'book-2'];  // Sci-Fi
columns[1].books = ['book-1', 'book-5'];  // Fantasy - same book-1!
```

**Benefits:**
- No schema migration needed
- No duplicate book data
- Simple to implement
- Works with existing drag/drop logic

---

## Undo/Redo Integration

All clipboard operations integrate with existing undo/redo system (v4.8.0).

### Recorded Actions

| Operation | Action Type | Undo Behavior |
|-----------|-------------|---------------|
| **Cut+Paste** | `'paste-cut'` | Returns books to original positions, removes from target |
| **Copy+Paste** | `'paste-copy'` | Removes books from target column |
| **Ctrl+Drag copy** | `'copy-drag'` | Removes book from target column |
| **DEL** | `'delete'` | Restores book to original position |

### Action Structure

```javascript
// Example: paste-cut action
{
  type: 'paste-cut',
  sourcePositions: [
    { columnId: 'col-1', index: 5, bookId: 'book-123' },
    { columnId: 'col-2', index: 0, bookId: 'book-456' }
  ],
  targetColumnId: 'col-3',
  targetStartIndex: 0,
  bookIds: ['book-123', 'book-456']
}
```

---

## Ctrl+Drag Implementation

### Behavior

1. User holds Ctrl and starts dragging book(s)
2. Visual: Ghost element + "+" badge on cursor
3. On drop: Copy books to target (original remains)
4. Works with multi-select (Ctrl+click then Ctrl+drag)

### Detection

```javascript
// In drag start handler
const isCopyDrag = e.ctrlKey || e.metaKey;
setDragMode(isCopyDrag ? 'copy' : 'move');
```

### Drop Handler

```javascript
if (dragMode === 'copy') {
  // Add book ID to target column (don't remove from source)
  // Record action for undo
} else {
  // Existing move behavior
}
```

---

## Edge Cases

| Scenario | Behavior |
|----------|----------|
| Cut from A, paste to A | Move to top of same column |
| Copy from A, paste to A | Creates second placement in same column |
| Cut books across filters | Works - books tracked by ID |
| Paste while filtered | Pastes to active column regardless of filter |
| Cut then close browser | Clipboard lost (session-only) |
| Copy book already in target | Allowed - creates duplicate placement |
| Delete only copy | Warning prompt, book returns on next import |
| Undo delete of last copy | Restores placement |

---

## Context Menu Updates

Current context menu structure (for reference):
```
- View Details
- Mark as Read/Unread
- Hide Book
- Move to > [columns submenu]
- Copy Titles
- Clear Selection
```

Add after "Move to >":
```
- Copy to > [columns submenu]    // NEW
```

Same column list as "Move to" submenu.

---

## Implementation Checklist

### Phase 1: Core Clipboard
- [ ] Add clipboard state
- [ ] Implement Ctrl+X (cut)
- [ ] Implement Ctrl+C (copy)
- [ ] Implement Ctrl+V (paste)
- [ ] Implement Escape (cancel)
- [ ] Visual feedback for cut/copy pending

### Phase 2: Status Bar
- [ ] Enhance status bar for clipboard messages
- [ ] Auto-dismiss success messages
- [ ] "Click a column first" feedback

### Phase 3: Delete
- [ ] Implement DEL key handler
- [ ] Last copy detection
- [ ] Warning modal for last copy
- [ ] Multi-select last copy handling

### Phase 4: Ctrl+Drag
- [ ] Detect Ctrl key during drag start
- [ ] "+" badge visual during Ctrl+drag
- [ ] Copy-on-drop logic
- [ ] Works with multi-select drag

### Phase 5: Context Menu
- [ ] Add "Copy to >" submenu
- [ ] Mirror "Move to" column list

### Phase 6: Book Count
- [ ] Calculate copy count
- [ ] Update header display
- [ ] Ensure column counts include copies

### Phase 7: Undo/Redo
- [ ] Record paste-cut actions
- [ ] Record paste-copy actions
- [ ] Record copy-drag actions
- [ ] Record delete actions
- [ ] Test undo/redo for all operations

### Phase 8: Testing
- [ ] Cut/paste within same column
- [ ] Cut/paste across columns
- [ ] Copy/paste multiple times
- [ ] Ctrl+drag single book
- [ ] Ctrl+drag multi-select
- [ ] Delete single placement
- [ ] Delete last copy (warning)
- [ ] Undo all operations
- [ ] Filter interactions

---

## Related

- **TODO**: P1-0-E Cut/Copy/Paste for books
- **Supersedes**: P3-T1 Book Copy Feature
- **Depends on**: Multi-select (implemented), Undo/Redo (v4.8.0)
