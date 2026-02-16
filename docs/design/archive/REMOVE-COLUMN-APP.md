# Remove Column App Vestiges

## Overview

The Column App (V4) was the original horizontal-column layout for organizing books. It was replaced by Book Explorer (V5) — a Windows Explorer-style two-pane layout with folder tree + book list. The Column App UI rendering was removed in v5.0.2, and the migration dialog was removed in v5.1.0. However, the **backend code** for columns and dividers remains — approximately 59 `setColumns` calls, 8 divider state variables, and hundreds of lines of orphaned logic.

**Goal**: Remove all Column App vestiges while preserving the Book Explorer functionality.

**V4 archive**: The original Column App is preserved in the `V4/` subfolder for reference.

---

## Architecture Summary

The Column App and Book Explorer operate on **completely separate state trees**:

| Aspect | Column App (remove) | Book Explorer (keep) |
|--------|---------------------|----------------------|
| **State** | `columns` / `setColumns` | `folders` / `setFolders` |
| **Data model** | Array of columns, each with `books[]` (books + dividers) | Array of folders with `bookIds[]`, `parentId`, `childFolderIds` |
| **Drag-drop** | `handleMouseDown/handleMouseUp` window listeners + `buildColumnIndex()` spatial indexing | Inline React `onDragStart/onDrop` with `application/x-readerwrangler` dataTransfer |
| **Undo/redo** | 7 action types using `setColumns()` | 16 action types using `setFolders()` |
| **Persistence** | Saved in `STORAGE_KEY` → `organization.columns` | Saved in BOTH `STORAGE_KEY` → `organization.folders` AND `FOLDERS_KEY` |

**Key finding**: There is NO cross-contamination. Column actions never touch `folders`. Folder actions never touch `columns`. Removal is safe if done systematically.

---

## What To Remove

### Phase 1: Collect Series (self-contained, ~180 lines)

Confirmed Column App only. No dependencies on Book Explorer.

| Item | Line(s) | Description |
|------|---------|-------------|
| `collectSeriesOpen` state | 291 | Boolean state |
| `seriesBooks` state | 292 | `{ current: [], other: [] }` |
| `openCollectSeriesDialog()` | 2902-2939 | Populates modal with series books from columns |
| `collectSeriesBooks()` | 2941-2997 | Moves/copies series books between columns |
| Collect Series modal JSX | 9281-9361 | Full modal with backdrop |
| "Group Series Books" button | 9642-9646 | Trigger button in Edit Series section |
| `collectSeriesOpen` in `anyModalOpenRef` | 4408-4409 | Remove from useEffect dependency list |

### Phase 2: Divider Code (~400+ lines)

Dividers are Column App-only objects (`type: 'divider'`) stored within `columns[].books[]`.

**State variables (8):**

| Variable | Line | Description |
|----------|------|-------------|
| `editingDivider` | 247 | `{columnId, dividerId}` |
| `editingDividerLabel` | 248 | Text input value |
| `insertDividerOpen` | 249 | Controls Insert Divider modal |
| `newDividerLabel` | 250 | New divider text input |
| `hoveringDivider` | 251 | Hover state |
| `dividerContextMenu` | 287 | Right-click menu state |
| `dividerTagEditorOpen` | 288 | Tag editor modal state |

**Functions (4):**

| Function | Line | Description |
|----------|------|-------------|
| `insertDivider()` | ~4030 | Creates divider in column |
| `startEditingDivider()` | ~4074 | Enables inline edit |
| `editDividerLabel()` | ~4076 | Saves edited label |
| `deleteDivider()` | ~4108 | Removes divider from column |

**Modals (2):**

| Modal | Line | Description |
|-------|------|-------------|
| Insert Divider | ~9017 | Text input + Insert button |
| Divider Tag Editor | ~13194 | Full tag management for dividers |

**Type checks (32+):**
- `type === 'divider'` scattered across filtering, drag-drop, selection, context menus, undo/redo, tag operations
- `getTagsFromDivider()` helper (~481-487) — tag inheritance from divider above book

**Also remove from `anyModalOpenRef`:**
- `insertDividerOpen`
- `dividerTagEditorOpen`

### Phase 3: Column CRUD & Sorting (~200 lines)

| Function | Line | Description |
|----------|------|-------------|
| Add new column | ~3842 | Creates empty column |
| Insert column before/after | ~3858 | Splice at position |
| Rename column | ~3872 | Updates column name |
| Sort books in column | ~3894 | Sort by title/rating/published/date |
| Delete empty column | ~3993 | Filter out by id |
| Delete column + merge | ~4021 | Move books to destination |
| Move books to column | ~4040 | Inline drag handler |
| Auto-divide by series | ~4203, ~4263 | Creates dividers automatically |

### Phase 4: Undo/Redo Column Actions (~200 lines)

The undo/redo system is a **unified switch statement**. Remove only the Column App cases:

**Undo cases (lines 4422-4615):**

| Action Type | Lines | Description |
|-------------|-------|-------------|
| `MOVE_BOOKS` | 4422-4473 | Restore books to source column |
| `COPY_BOOKS` | 4474-4495 | Remove copied entries from target |
| `REORDER_BOOKS` | 4496-4537 | Restore original order |
| `DELETE_COLUMN` | 4552-4575 | Restore deleted column |
| `REORDER_COLUMNS` | 4576-4586 | Move column back |
| `DELETE_DIVIDER` | 4587-4597 | Restore divider |
| `REORDER_DIVIDER` | 4598-4615 | Move divider back |

**Redo cases (lines 4885-5036):**

| Action Type | Lines | Description |
|-------------|-------|-------------|
| `MOVE_BOOKS` | 4885-4923 | Re-apply move |
| `COPY_BOOKS` | 4924-4934 | Re-add copied entries |
| `REORDER_BOOKS` | 4935-4960 | Re-apply reorder |
| `DELETE_COLUMN` | 4974-4990 | Re-delete column |
| `REORDER_COLUMNS` | 4991-5001 | Move column to target |
| `DELETE_DIVIDER` | 5002-5015 | Re-delete divider |
| `REORDER_DIVIDER` | 5016-5036 | Move divider to target |

**Keep**: `recordAction()`, `executeUndo()`, `executeRedo()` core functions, `TOGGLE_HIDE`, and all `*_FOLDER` action types.

### Phase 5: Drag-Drop Column System (~800 lines)

Entirely separate from Book Explorer drag-drop. Column App uses window-level mouse listeners; Book Explorer uses React drag events.

| Function/Feature | Line(s) | Description |
|-----------------|---------|-------------|
| `calculateColumnDropPosition()` | ~5406 | Horizontal column reordering |
| `handleMouseDown()` | ~5425 | Book drag initiation in columns |
| `handleDividerMouseDown()` | ~5461 | Divider dragging |
| `buildColumnIndex()` | ~5478 | Spatial indexing for O(log R) book lookup |
| `calculateDropPosition()` | ~5648 | Fine-grained position within columns |
| Auto-scroll logic | ~5997-6031 | Column edge detection |
| `handleMouseUp()` | ~6047 | Drop completion with move/copy/reorder |
| `filterBooksByColumn()` | ~6476-6603 | Filters books within column (dividers pass through) |

**Related drag state variables** (search for these):
- `draggedBook`, `draggedFromColumn`, `draggedBookIndex`
- `draggedColumn`, `columnDropTarget`, `isDraggingColumn`
- `dropTargetRef`, `columnIndexRef`
- `isCopyDragRef`

### Phase 6: Context Menu & Clipboard for Columns (~300 lines)

| Feature | Line(s) | Description |
|---------|---------|-------------|
| Move books to column (context menu) | ~12462 | `setColumns` call |
| Copy books to column (context menu) | ~12523 | `setColumns` call |
| Paste cut to column | ~12620 | Complex reindexing |
| Paste copy to column | ~12687 | Insert at target |
| Divider context menu | ~13114-13196 | Edit tags, delete divider |
| Divider tag operations | ~13218-13355 | Add/remove/create tags on dividers |

### Phase 7: Persistence Cleanup

**Auto-save (lines 1450-1477):**
- Remove `columns` from the saved `organization` object
- Remove `columns` from useEffect dependency array
- Keep `folders` save path (both `STORAGE_KEY` and `FOLDERS_KEY`)

**Initial load (lines 1273-1424):**
- Remove `columns` restoration from `STORAGE_KEY` (line ~1401)
- Remove `columns` initialization paths (lines ~1412, ~1419)
- Keep `folders` load from `FOLDERS_KEY` and `STORAGE_KEY`

**Backup export (lines 3014-3146):**
- Remove `organization.columns` and `organization.columnOrder` from export
- Keep `organization.folders` and `organization.explorerSettings`
- Bump `schemaVersion` (currently "2.3")

**Backup restore (lines 3690-3838):**
- Remove `columns` restoration (lines ~3715-3740)
- Remove orphaned-books-to-Unorganized-column logic
- Keep `folders` restoration (lines ~3744-3792)

**Data reset (lines 3152-3161):**
- `STORAGE_KEY` removal already covers both — no change needed
- `columns` state initialization can be removed

### Phase 8: State Declaration & Cleanup

| Item | Line | Action |
|------|------|--------|
| `columns` / `setColumns` useState | 227 | Remove |
| `activeColumnId` / `setActiveColumnId` | Search | Remove if Column App only |
| `modalColumnId` | Search | Remove if Column App only |
| All column-related state variables | Various | Remove |
| `columnHasBook()` helper | Search | Remove |
| `findBookIndexInColumn()` helper | Search | Remove |
| `getBookIdFromEntry()` helper | Search | May be shared — verify |
| `generateInstanceId()` helper | Search | May be shared — verify |
| Tombstone comments (`// v5.0.2 - Removed...`) | Various | Remove |
| Selection logic for columns | ~5321-5353 | Remove column multi-select |
| Delete selected items (column path) | ~13076 | Remove column branch |

---

## Shared Helpers — Verify Before Removing

These may be used by both Column App and Book Explorer:

| Helper | Usage | Action |
|--------|-------|--------|
| `getBookIdFromEntry()` | Handles legacy string IDs vs `{instanceId, bookId}` format | Check if folders use same format |
| `generateInstanceId()` | Creates unique instance IDs | Check if folders use instances |
| `columnHasBook()` | Searches column's books array | Likely Column App only |
| `findBookIndexInColumn()` | Finds book position in column | Likely Column App only |
| `filteredBooks()` | Filters and sorts books — skips dividers | Check if Book Explorer calls this |
| `getTagsFromDivider()` | Tag inheritance from dividers | Column App only |

---

## Estimated Scope

| Phase | Est. Lines Removed | Risk |
|-------|-------------------|------|
| 1. Collect Series | ~180 | Low — self-contained |
| 2. Dividers | ~400 | Low-Medium — scattered type checks |
| 3. Column CRUD | ~200 | Low — standalone functions |
| 4. Undo/Redo | ~200 | Medium — inside unified handler |
| 5. Drag-Drop | ~800 | Medium — large connected system |
| 6. Context Menu/Clipboard | ~300 | Medium — interleaved with folder code |
| 7. Persistence | ~100 | Medium — must not break folder save/load |
| 8. State & Cleanup | ~200 | Medium — need to verify shared helpers |
| **Total** | **~2,400** | |

---

## Testing Strategy

After each phase:
1. Hard refresh, verify version in footer
2. Basic smoke test: open app, select folder, view books
3. Drag-drop books between folders
4. Undo/redo after drag
5. Backup export → reset → backup restore
6. Open book detail modal, edit series, tags
7. Tag Management dialog
8. Auto-Organize wizard

---

## Implementation Notes

- Work in phases, commit and test after each
- Use alpha versioning per CLAUDE.md
- Feature branch: `feature/remove-column-app`
- After all phases: verify no remaining `setColumns` or `columns` references (except tombstone cleanup)
- Final pass: remove tombstone comments referencing Column App removal
