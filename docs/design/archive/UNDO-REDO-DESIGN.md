# Undo/Redo Feature Design

**Status**: Design Complete - Ready for Implementation
**Created**: 2026-01-05
**Priority**: 1 (Core Organization Feature)

---

## Overview

Implement Ctrl+Z / Ctrl+Y undo/redo for ReaderWrangler's organizational actions.

### Critical Constraint
**Undo/redo must NOT trigger cover image refetches.** This would:
- Take several seconds (poor UX)
- Hammer Amazon servers (risk of detection/blocking)
- Be unnecessary since images are already loaded

---

## Research Findings

### Task 1: React Undo Patterns (Completed)

#### Key Insight
**If you preserve object references through structural sharing and use stable keys, React will reuse DOM elements and images won't re-fetch.**

#### Implementation Approaches Evaluated

| Approach | Memory Usage | Implementation Effort | Reference Preservation |
|----------|--------------|----------------------|----------------------|
| **Immer + Snapshots** | Higher | Low | Excellent (structural sharing) |
| **Immer Patches** | Low (stores diffs) | Medium | Excellent |
| **Command Pattern** | Low | High (each action type) | Manual |

#### Immer Structural Sharing
```javascript
import { produce } from 'immer';

const nextState = produce(baseState, draft => {
  // Move book from column 1 to column 2
  const book = draft.columns[0].books.shift();
  draft.columns[1].books.push(book);
});

// Unchanged objects keep same reference
console.log(baseState.columns[1].books[0] === nextState.columns[1].books[0]); // true
```

#### Immer Patches (Best of Both Worlds)
Memory-efficient like Command Pattern, but automatic:
```javascript
import { produceWithPatches, applyPatches } from 'immer';

const [nextState, patches, inversePatches] = produceWithPatches(state, recipe);
undoStack.push(inversePatches);  // Store only the diff, not whole state

function undo() {
  const patches = undoStack.pop();
  const [nextState, , inversePatches] = produceWithPatches(
    currentState,
    draft => applyPatches(draft, patches)
  );
  redoStack.push(inversePatches);
  return nextState;
}
```

#### Critical Techniques for Preventing Image Refetch

1. **Stable Keys** - Use `book.asin` as key, never array indices
2. **React.memo** on BookCard components - only re-renders if book reference changes
3. **State Normalization** - Store books separately from positions:
   ```javascript
   {
     books: { 'B001': {...}, 'B002': {...} },  // Book data (rarely changes)
     columns: { 'col1': { bookIds: ['B001'] } } // Only positions change
   }
   ```
4. **No deep cloning** - Keep original references from history (JSON.parse destroys them)

#### Common Gotchas
- Components defined inside other components (recreated every render)
- Creating new objects in render (defeats React.memo)
- Deep cloning on undo (destroys reference equality)
- Not limiting history size (memory issues)

#### Recommended Libraries

| Library | Use Case | Notes |
|---------|----------|-------|
| **Immer** | State immutability | Industry standard, structural sharing |
| **Immer Patches** | Memory-efficient undo | Built into Immer |

---

### Task 2: Current Image Loading Behavior (Completed)

#### Book Cover Rendering
Location: `readerwrangler.js` lines 3795-3799
```jsx
<img src={book.coverUrl}
     alt={book.title}
     className="w-full rounded shadow-lg"
     onLoad={(e) => checkIfBlankImage(e.target, book.id)}
     onError={(e) => e.target.src = 'placeholder...'} />
```

#### Keys Used
Location: `readerwrangler.js` line 3725
```jsx
<div key={book.id} className="relative book-item" data-book-id={book.id}>
```
**Finding:** Keys use `book.id` (stable unique identifier) - NOT array indices. ✅

#### React.memo Usage
**Finding:** NO React.memo usage found in the codebase.
- Components re-render on any state change
- However, image `src` doesn't change, so browser cache serves images

#### State Structure (Normalized) ✅
```javascript
// Line 179-180: Two separate state variables
const [books, setBooks] = useState([]);
const [columns, setColumns] = useState([{ id: 'unorganized', name: 'Unorganized', books: [] }]);
```

**Architecture:**
- `books` array: All book objects with `id`, `title`, `author`, `coverUrl`, `asin`, etc.
- `columns` array: Column metadata with `books` property storing **only book IDs** (not full objects)

Book lookup when rendering (line 2545):
```javascript
return books.find(b => b.id === item);
```

#### Image Sources
Two sources for cover URLs:
1. **Amazon library fetcher:** Default CDN: `https://images-na.ssl-images-amazon.com/images/P/${asin}.01.LZZZZZZZ.jpg`
2. **Enriched data:** High-res from API: `https://images-na.ssl-images-amazon.com/images/I/{physicalId}.{extension}`

Note: JSON imports (like backup restore) preserve existing `coverUrl` values.

All URLs are **static properties** - do NOT change during normal operations.

#### Lazy Loading
**Finding:** NO lazy loading implemented (no `loading="lazy"`, no Intersection Observer).

#### Blank Image Handling
Books with 1x1 placeholder images are tracked in `blankImageBooks` Set and display a styled fallback. This Set is persisted to localStorage.

---

### Task 2: Safety Analysis for Undo/Redo

**Critical Finding: Undo/redo operations WILL NOT trigger image refetches.**

Reasons:
| Factor | Current State | Impact |
|--------|---------------|--------|
| Image `src` attribute | Uses `book.coverUrl` (static) | Doesn't change during undo |
| Component key | `book.id` (stable) | DOM element preserved |
| State normalization | Books separate from columns | Only column positions change |
| Book object mutation | None during drag/drop | `coverUrl` never modified |
| Browser cache | Same URL = cache hit | No network request |

**Undo/redo only manipulates column positions (which book IDs are in which column), not book properties themselves.**

---

### Task 3: Prototype Test (Completed)

#### Test Performed
Dragged a book and monitored Network tab for image requests.

#### Result: IMAGE REFETCH OBSERVED ⚠️

```
fetch("https://images-na.ssl-images-amazon.com/images/I/71iJSdX+S0L.jpg", {
  "headers": { "cache-control": "no-cache", "pragma": "no-cache", ... }
})
```

#### Root Cause: Drag Ghost Creates Second `<img>` Element

During drag, **two `<img>` elements exist simultaneously** with the same URL:

1. **Grayed-out original** (opacity 0.3) - stays in column during drag
2. **Drag ghost under cursor** - created fresh when `setIsDragging(true)` fires

When React creates the drag ghost's `<img>` element (line 4033), the browser treats it as a **new image request**. The `cache-control: no-cache` header indicates the browser isn't using its cache.

#### Important Distinction

| Operation | Image Refetch? | Reason |
|-----------|----------------|--------|
| **Dragging** | YES ⚠️ | Creates new `<img>` element in drag ghost |
| **Undo/Redo** | NO ✅ | Only changes column state, no new elements |

**This is a pre-existing drag issue, NOT an undo/redo concern.**

The drag ghost image refetch is a separate optimization opportunity but doesn't block undo/redo implementation. Undo/redo will only call `setColumns()` to restore previous book positions - it won't create new `<img>` elements.

---

## Current State Analysis

### State Structure
```javascript
// Normalized architecture
const [books, setBooks] = useState([]);           // Master list of all books
const [columns, setColumns] = useState([...]);    // Columns with book ID arrays

// Column structure
{
  id: 'col-123',
  name: 'To Read',
  books: ['book-456', 'book-789']  // Just IDs, not objects
}
```

### Component Hierarchy
```
App
└── Column (for each column)
    └── BookCard (for each book.id in column.books)
        └── <img src={book.coverUrl} />
```

### Keys Used
- Columns: `key={column.id}`
- Books: `key={book.id}`
- Both are stable identifiers, not array indices ✅

---

## Implementation Decision

### Approach: Command Pattern

**Selected over Immer Patches because:**
1. Lower memory usage (~3x more compact - stores parameters, not diffs)
2. No new dependencies (keeps single-file architecture clean)
3. Explicit control over what's undoable
4. Natural fit with existing code (multi-select drag = one action)
5. Limited action types (~10) means manageable implementation

### History Management
- **Stack depth:** 50 actions (fixed limit)
- **Overflow behavior:** Drop oldest when limit reached (`shift()`)
- **Redo stack:** Cleared on any new action
- **Persistence:** Session-only (cleared on page refresh)

---

## Undoable Action Types

### Book Operations

| Action | Type Constant | Parameters to Store |
|--------|---------------|---------------------|
| Move book(s) between columns | `MOVE_BOOKS` | bookIds[], fromColId, toColId, fromIndices[], toIndex |
| Reorder book(s) within column | `REORDER_BOOKS` | bookIds[], colId, fromIndices[], toIndex |
| Hide/unhide book(s) | `TOGGLE_HIDE` | bookIds[], previousStates[] |

### Column Operations

| Action | Type Constant | Parameters to Store |
|--------|---------------|---------------------|
| Create column | `CREATE_COLUMN` | colId, name, insertIndex |
| Delete column | `DELETE_COLUMN` | colId, name, books[], insertIndex, mergeTargetColId |
| Rename column | `RENAME_COLUMN` | colId, oldName, newName |
| Reorder columns | `REORDER_COLUMNS` | colId, fromIndex, toIndex |

### Divider Operations

| Action | Type Constant | Parameters to Store |
|--------|---------------|---------------------|
| Create divider | `CREATE_DIVIDER` | colId, dividerId, label, insertIndex |
| Delete divider | `DELETE_DIVIDER` | colId, dividerId, label, originalIndex |
| Rename divider | `RENAME_DIVIDER` | colId, dividerId, oldLabel, newLabel |
| Move divider | `MOVE_DIVIDER` | colId, dividerId, fromIndex, toIndex |
| Auto-divide (series/rating) | `AUTO_DIVIDE` | colId, previousBooks[] (full snapshot) |

### NOT Undoable (by design)

| Operation | Reason |
|-----------|--------|
| Import library | Major state change - use backup/restore instead |
| Clear/reset library | Destructive - requires confirmation dialog |
| Filter changes | View-only, doesn't modify organizational state |
| Search | View-only |

---

## Data Structures

### Action Record
```javascript
{
  type: 'MOVE_BOOKS',           // Action type constant
  timestamp: 1704456000000,     // When action occurred
  // ... type-specific parameters
}
```

### Example: Move Books
```javascript
{
  type: 'MOVE_BOOKS',
  timestamp: Date.now(),
  bookIds: ['book-123', 'book-456'],
  fromColId: 'col-1',
  toColId: 'col-2',
  fromIndices: [3, 7],          // Original positions (for precise undo)
  toIndex: 0                    // Where they were inserted
}
```

### Example: Delete Column
```javascript
{
  type: 'DELETE_COLUMN',
  timestamp: Date.now(),
  colId: 'col-deleted',
  name: 'My Column',
  books: ['book-1', 'divider-1', 'book-2'],  // Full contents
  insertIndex: 2,               // Where column was in array
  mergeTargetColId: 'unorganized'  // Where books went
}
```

### Example: Auto-Divide
```javascript
{
  type: 'AUTO_DIVIDE',
  timestamp: Date.now(),
  colId: 'col-1',
  previousBooks: ['book-1', 'book-2', 'book-3']  // Snapshot before divide
}
```

---

## State Management

### New State Variables
```javascript
const [undoStack, setUndoStack] = useState([]);  // Array of action records
const [redoStack, setRedoStack] = useState([]);  // Array of action records
```

### Core Functions
```javascript
const MAX_UNDO = 50;

// Record an action for undo
function recordAction(action) {
  setUndoStack(prev => {
    const newStack = [...prev, { ...action, timestamp: Date.now() }];
    if (newStack.length > MAX_UNDO) newStack.shift();
    return newStack;
  });
  setRedoStack([]);  // Clear redo on new action
}

// Undo last action
function undo() {
  if (undoStack.length === 0) return;

  const action = undoStack[undoStack.length - 1];
  executeUndo(action);  // Type-specific undo logic

  setUndoStack(prev => prev.slice(0, -1));
  setRedoStack(prev => [...prev, action]);
}

// Redo last undone action
function redo() {
  if (redoStack.length === 0) return;

  const action = redoStack[redoStack.length - 1];
  executeRedo(action);  // Type-specific redo logic

  setRedoStack(prev => prev.slice(0, -1));
  setUndoStack(prev => [...prev, action]);
}
```

---

## Integration Points

### Keyboard Shortcuts
Add to existing keyboard handler:
```javascript
// Ctrl+Z = Undo, Ctrl+Y or Ctrl+Shift+Z = Redo
useEffect(() => {
  const handleKeyDown = (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
      e.preventDefault();
      undo();
    }
    if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
      e.preventDefault();
      redo();
    }
  };
  window.addEventListener('keydown', handleKeyDown);
  return () => window.removeEventListener('keydown', handleKeyDown);
}, [undoStack, redoStack]);
```

### Functions to Instrument

| Function | Action Type | Location |
|----------|-------------|----------|
| `handleMouseUp()` | MOVE_BOOKS, REORDER_BOOKS, MOVE_DIVIDER | Lines 2359-2516 |
| `addColumn()` | CREATE_COLUMN | Lines 1283-1289 |
| `confirmDeleteColumn()` | DELETE_COLUMN | Lines 1419-1431 |
| `finishEditingColumn()` | RENAME_COLUMN | Lines 1296-1304 |
| `insertDivider()` | CREATE_DIVIDER | Lines 1434-1468 |
| `deleteDivider()` | DELETE_DIVIDER | Lines 1504-1515 |
| `finishEditingDivider()` | RENAME_DIVIDER | Lines 1475-1502 |
| `autoDivideBySeries()` | AUTO_DIVIDE | Lines 1517-1588 |
| `autoDivideByRating()` | AUTO_DIVIDE | Lines 1590+ |
| Context menu hide handler | TOGGLE_HIDE | Lines 3972-3984 |
| Context menu move handler | MOVE_BOOKS | Lines 3907-3923 |

### Column Reorder Detection
Column reordering happens in `handleMouseUp()` when `draggedColumn` is set. Need to capture before/after indices.

---

## Risk Assessment

### Key Risk: useRef-based Drag Performance
The drag system uses refs (`dragGhostRef`, `dragPosRef`, `dropTargetRef`) to avoid re-renders during drag.

**Impact on Undo:** None. Recording happens in `handleMouseUp()` AFTER drag completes, when state is already being updated via `setColumns()`. The refs don't affect undo recording.

### Edge Cases

| Scenario | Handling |
|----------|----------|
| Undo with empty stack | No-op (check length first) |
| Redo after new action | Redo stack cleared |
| Rapid undo/redo | Each is separate action |
| Undo after column deleted | Recreate column at original index |
| Undo after page refresh | Stack is empty (session-only) |

---

## Implementation Order

1. **Phase 1: Core Infrastructure**
   - Add `undoStack` and `redoStack` state
   - Implement `recordAction()`, `undo()`, `redo()`
   - Add keyboard shortcuts
   - Add UI indicators (undo/redo buttons, disabled states)

2. **Phase 2: Book Operations**
   - Instrument `handleMouseUp()` for MOVE_BOOKS
   - Instrument `handleMouseUp()` for REORDER_BOOKS
   - Instrument hide/unhide for TOGGLE_HIDE
   - Instrument context menu move

3. **Phase 3: Column Operations**
   - Instrument `addColumn()` for CREATE_COLUMN
   - Instrument `confirmDeleteColumn()` for DELETE_COLUMN
   - Instrument `finishEditingColumn()` for RENAME_COLUMN
   - Instrument column reorder for REORDER_COLUMNS

4. **Phase 4: Divider Operations**
   - Instrument `insertDivider()` for CREATE_DIVIDER
   - Instrument `deleteDivider()` for DELETE_DIVIDER
   - Instrument `finishEditingDivider()` for RENAME_DIVIDER
   - Instrument divider drag for MOVE_DIVIDER
   - Instrument auto-divide functions for AUTO_DIVIDE

5. **Phase 5: Testing & Polish**
   - Test all action types
   - Test edge cases
   - Add undo/redo count to UI (optional)

---

## References

- [Redux: Implementing Undo History](https://redux.js.org/usage/implementing-undo-history)
- [Immer Documentation](https://immerjs.github.io/immer/)
- [React Reconciliation](https://react.dev/learn/preserving-and-resetting-state)
- [Immer Patches](https://immerjs.github.io/immer/patches)
