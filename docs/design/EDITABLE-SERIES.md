# Editable Series and Series Position

## Overview

Allow users to edit series metadata (name and position) for individual books, and manage series library-wide through a dedicated Series Manager. Includes removal of redundant "Group Series Books" button.

---

## Problem Statement

**Current limitations:**
1. **No editing capability** - Users cannot correct Amazon's inconsistent series naming
2. **Cannot add series** - Books without series metadata cannot be added to series
3. **No position editing** - Cannot fix incorrect series positions
4. **Duplicate series names** - "The Destroyer" vs "Destroyer" vs "Destroyer Series" creates fragmentation
5. **Redundant UI** - "Group Series Books" button overlaps with Auto-Organize Wizard

**User scenarios:**
- Amazon lists series as "Destroyer" but user prefers "The Destroyer"
- Book is missing series metadata entirely
- Series position is wrong (e.g., book #7 marked as #1)
- User has 3 versions of same series name scattered across library
- User gets new book in series → wants to organize it → has two tools (wizard vs button) and doesn't know which to use

---

## "Group Series Books" Button - Removal Analysis

### Why It Exists (Historical Context)

**Designed for column-based app** (pre-folder era):

```
OLD MODEL (v4.x - Column App):
Column 1: [Random books including Destroyer #1, #5]
Column 2: [Random books including Destroyer #12]
Column 3: [Random books including Destroyer #7, #8]

User clicks "Group Series Books" → Collects all Destroyer books in current column
```

**Button functionality:**
- Finds all books in same series across all columns
- Shows which are in current column vs other columns
- Collects them in current column, sorted by series position
- Options: "This Column Only" or "All Columns"

### Why It's Now Redundant

**NEW MODEL (v5.1.0 - Folder App with Auto-Organize Wizard):**

```
📁 Warren Murphy
  📁 The Destroyer (176 books already grouped!)
  📁 Miscellaneous
```

**Overlap analysis:**

| Feature | Group Series Books Button | Auto-Organize Wizard |
|---------|--------------------------|---------------------|
| **Trigger** | Book detail dialog | File menu |
| **Scope** | Single series | Multiple authors/series |
| **Action** | Collect + sort series books | Create author/series folders |
| **Incremental** | ✓ One book at a time | ✓ Re-run on Inbox anytime |
| **Power** | Limited (one series) | Comprehensive (bulk) |
| **Context** | Column app vestige | Folder-native design |

**User confusion scenario:**

```
User gets 3 new Destroyer books in Inbox
  ↓
Option A: Open one book → Click "Group Series Books"
          Repeat 3 times? Only moves that one series?

Option B: File → Auto-Organize → Select Warren Murphy
          All 3 books organized at once ✓
```

**Wizard is objectively better:**
- Handles multiple series simultaneously
- User controls selection (threshold, checkboxes)
- Creates proper folder structure
- Supports incremental organization (re-run on Inbox)
- Preview mode shows what will happen

### Decision: Remove Button

**Rationale:**
1. **Redundant functionality** - Wizard does everything button does, plus more
2. **Confusing overlap** - Two tools with same goal, different entry points
3. **Vestige of old architecture** - Designed for columns, not folders
4. **Simpler mental model** - One tool for organization (wizard), one for editing (new feature)

**What users use instead:**
- **Bulk organization:** Auto-Organize Wizard (File menu)
- **Incremental organization:** Re-run wizard on new books in Inbox
- **Individual book adjustment:** Manual drag-drop
- **Series editing:** Edit Series button (this feature)

---

## Solution

### Feature Components

1. **Edit Series button** - In book detail dialog (next to series display)
2. **Edit Series dialog** - Modal for editing series name and position
3. **Series Manager** - Library-wide series management (View menu)
4. **Remove "Group Series Books" button** - Eliminate redundant functionality

---

## UX Design

### 1. Edit Series Button in Book Detail Dialog

**For books WITH series:**

```jsx
{modalBook.series && (
    <div className="mb-3">
        <div className="flex items-center gap-2">
            <p className="text-lg" style={{ color: '#621e31' }}>
                Book {modalBook.seriesPosition}: {modalBook.series}
            </p>
            <button
                onClick={openEditSeriesDialog}
                className="text-gray-500 hover:text-blue-600"
                title="Edit series information">
                ✏️
            </button>
        </div>
    </div>
)}
```

**For books WITHOUT series:**

```jsx
{!modalBook.series && (
    <div className="mb-3">
        <div className="flex items-center gap-2">
            <p className="text-sm text-gray-500 italic">
                Not part of a series
            </p>
            <button
                onClick={openEditSeriesDialog}
                className="text-gray-500 hover:text-blue-600 text-sm"
                title="Add to series">
                ✏️ Add to series
            </button>
        </div>
    </div>
)}
```

**CTA differentiation:**
- Books with series: ✏️ icon only (edit existing)
- Books without series: ✏️ + "Add to series" text (add new)

---

### 2. Edit Series Dialog

**Modal design:**

```
┌─────────────────────────────────────────┐
│  ✏️ Edit Series Information        [×]  │
├─────────────────────────────────────────┤
│                                         │
│  Series Name:                           │
│  [The Destroyer                      ▼] │  ← Combobox (dropdown + free text)
│                                         │
│  Position/Number:                       │
│  [141                                ]  │
│                                         │
│  Note: Position can be decimal (e.g.,   │
│  "1.5" for books between #1 and #2)     │
│                                         │
│  ────────────────────────────────────   │
│                                         │
│  [ Remove from Series ]  [Cancel] [Save]│
│                                         │
└─────────────────────────────────────────┘
```

**Series Name - Combobox Pattern:**

```jsx
Series Name:
[The Destroyer ▼]  // Combobox (dropdown + free text)
  ↓ Click shows:
  ┌─────────────────────────┐
  │ The Destroyer      (176)│ ← books in this series
  │ Dresden Files       (17)│
  │ Codex Alera          (6)│
  │ Old Man's War        (6)│
  │ ─────────────────────── │
  │ + Add new series...     │
  └─────────────────────────┘

  Or just start typing: "Vorkosigan Saga"
```

**Why combobox (not pure free text):**
1. **Prevents duplicates** - User sees existing series names
2. **Shows what's available** - Discover series in library
3. **Allows corrections** - Fix Amazon's inconsistent naming
4. **Supports new entries** - Can type new series name
5. **Consistency enforcement** - Encourages using existing names

**Position validation:**
- Allow integers: `1`, `2`, `142`
- Allow decimals: `1.5`, `2.3` (for books between positions)
- Non-numeric → warning, fallback to blank

**Remove from Series:**
- Clears `book.series` and `book.seriesPosition`
- Single undo action
- Confirmation: "Remove this book from series?"

---

### 3. Series Manager (View Menu)

**Modeled on Tag Manager pattern:**

```
┌─────────────────────────────────────────────────────┐
│  📚 Manage Series                              [×]  │
├─────────────────────────────────────────────────────┤
│  Series                           Books    Actions  │
├─────────────────────────────────────────────────────┤
│  The Destroyer                      176    Rename   │
│                                            Merge     │
│                                                      │
│  Destroyer                            3    Rename   │
│                                            Merge     │
│                                                      │
│  Dresden Files                       17    Rename   │
│                                            Merge     │
│                                                      │
│  Codex Alera                          6    Rename   │
│                                            Merge     │
│                                                      │
├─────────────────────────────────────────────────────┤
│  Orphaned series (0 books)                          │
├─────────────────────────────────────────────────────┤
│  (none)                                             │
│                                                      │
│  [Delete all orphaned series]                       │
└─────────────────────────────────────────────────────┘
```

**Features (matching Tag Manager):**
1. **List with counts** - Shows all series + how many books
2. **Rename action** - Fix Amazon's inconsistent naming
3. **Merge action** - Combine duplicates ("Destroyer" → "The Destroyer")
4. **Orphaned section** - Series with 0 books (after edits/deletions)
5. **Bulk cleanup** - Delete all orphaned at once
6. **Sort order** - Alphabetical by default

**Rename Dialog:**

```
┌─────────────────────────────────────────┐
│  Rename Series                     [×]  │
├─────────────────────────────────────────┤
│  Current name: Destroyer                │
│                                         │
│  New name:                              │
│  [The Destroyer                      ]  │
│                                         │
│  This will update 3 books.              │
│                                         │
│  [Cancel]              [Rename Series]  │
└─────────────────────────────────────────┘
```

**Merge Dialog:**

```
┌─────────────────────────────────────────┐
│  Merge Series                      [×]  │
├─────────────────────────────────────────┤
│  Merge: Destroyer (3 books)            │
│   Into: [The Destroyer ▼]              │
│                                         │
│  Dropdown shows:                        │
│    • The Destroyer (176 books)          │
│    • Dresden Files (17 books)           │
│    • (other series...)                  │
│                                         │
│  This will update 3 books.              │
│                                         │
│  [Cancel]              [Merge Series]   │
└─────────────────────────────────────────┘
```

**Orphaned series:**
- Series that had books but now have 0 (after merges, removals, edits)
- User can delete individually or bulk delete
- Prevents clutter in series dropdown

---

## Implementation Phases

### Phase 1: Edit Series Button & Dialog

**Deliverable:** Users can edit series name/position from book detail dialog

#### 1.1 - UI: Add Edit Series button to book detail dialog ☐
- ☐ Add ✏️ button next to series display (for books WITH series)
- ☐ Add "✏️ Add to series" button (for books WITHOUT series)
- ☐ Different CTAs for different contexts (edit vs add)
- ☐ Hover states and tooltips
- ☐ Test: Button appears, click opens dialog

#### 1.2 - UI: Create Edit Series dialog modal ☐
- ☐ Modal overlay with z-index above book detail dialog (z-[70])
- ☐ Series Name field with combobox (dropdown + free text input)
- ☐ Position field with validation (integers + decimals)
- ☐ "Remove from Series" button (if book has series)
- ☐ Cancel and Save buttons
- ☐ Test: Dialog opens, fields populated, dismisses on cancel

#### 1.3 - Logic: Combobox functionality ☐
- ☐ Fetch all unique series names from books array
- ☐ Sort alphabetically
- ☐ Show book counts for each series
- ☐ Dropdown opens on click
- ☐ Filter dropdown as user types
- ☐ Allow typing new series name (not in list)
- ☐ Test: Dropdown populates, filtering works, new names allowed

#### 1.4 - Logic: Save series edits ☐
- ☐ Update book object: `book.series`, `book.seriesPosition`
- ☐ Validate position (number or blank)
- ☐ Update IndexedDB (books table)
- ☐ Refresh book detail modal with new values
- ☐ Close edit dialog
- ☐ Single undo action (bundled)
- ☐ Test: Edits save, persist, undo works

#### 1.5 - Logic: Remove from series ☐
- ☐ Confirmation dialog: "Remove this book from series?"
- ☐ Clear `book.series` and `book.seriesPosition`
- ☐ Update IndexedDB
- ☐ Refresh book detail modal
- ☐ Single undo action
- ☐ Test: Removal works, undo restores series info

#### 1.6 - State Management ☐
- ☐ `const [editSeriesOpen, setEditSeriesOpen] = useState(false)`
- ☐ `const [editSeriesName, setEditSeriesName] = useState('')`
- ☐ `const [editSeriesPosition, setEditSeriesPosition] = useState('')`
- ☐ Populate on dialog open from `modalBook`
- ☐ Clear on dialog close
- ☐ Test: State updates correctly, persists during editing

**Alpha checkpoint:** v5.2.0-alpha.1 through alpha.N

---

### Phase 2: Series Manager

**Deliverable:** Library-wide series management interface

#### 2.1 - UI: Add "Manage Series" to View menu ☐
- ☐ Menu item: "📚 Manage Series"
- ☐ Position: Below "Manage Tags" (consistent pattern)
- ☐ Keyboard shortcut (optional): Ctrl+Shift+M
- ☐ Test: Menu item appears, click opens Series Manager

#### 2.2 - UI: Series Manager dialog ☐
- ☐ Modal dialog matching Tag Manager layout
- ☐ Table with columns: Series | Books | Actions
- ☐ Sort alphabetically by series name
- ☐ Show book counts
- ☐ Rename and Merge buttons per series
- ☐ Orphaned series section at bottom
- ☐ "Delete all orphaned series" button
- ☐ Test: Dialog displays, all series shown with counts

#### 2.3 - Logic: Series list generation ☐
- ☐ Extract all unique series from books array
- ☐ Count books per series: `seriesBookCounts[seriesName] = count`
- ☐ Identify orphaned series (0 books) from previous edits
- ☐ Sort by series name (alphabetical)
- ☐ Update on data changes (after edits)
- ☐ Test: List accurate, counts correct, updates dynamically

#### 2.4 - Feature: Rename series ☐
- ☐ Click "Rename" → opens Rename dialog
- ☐ Show current name, input for new name
- ☐ Show affected book count
- ☐ Update all books in series with new name
- ☐ Update IndexedDB in batch
- ☐ Single undo action (bundled)
- ☐ Test: Rename works, all books updated, undo restores

#### 2.5 - Feature: Merge series ☐
- ☐ Click "Merge" → opens Merge dialog
- ☐ Dropdown shows all OTHER series (not self)
- ☐ Show book counts for source and target
- ☐ Update all books from source series to target series
- ☐ Source series becomes orphaned (0 books)
- ☐ Update IndexedDB in batch
- ☐ Single undo action (bundled)
- ☐ Test: Merge works, books transferred, orphan created, undo works

#### 2.6 - Feature: Delete orphaned series ☐
- ☐ Individual delete button per orphaned series
- ☐ "Delete all orphaned series" bulk action
- ☐ Confirmation: "Delete X orphaned series?"
- ☐ Remove from series metadata tracking
- ☐ No books affected (0 books in orphaned series)
- ☐ Test: Delete works, bulk delete works, no impact on books

#### 2.7 - State Management ☐
- ☐ `const [seriesManagerOpen, setSeriesManagerOpen] = useState(false)`
- ☐ `const [seriesList, setSeriesList] = useState([])`
- ☐ `const [orphanedSeries, setOrphanedSeries] = useState([])`
- ☐ Track orphaned series in localStorage
- ☐ Update lists after any series edit operation
- ☐ Test: State accurate, persists, updates correctly

**Alpha checkpoint:** v5.2.0-alpha.N+1 through alpha.M

---

### Phase 3: Remove "Group Series Books" Button

**Deliverable:** Clean up redundant UI element

#### 3.1 - Code Removal ☐
- ☐ Remove "Group Series Books" button from book detail dialog (~line 9461-9476)
- ☐ Remove `openCollectSeriesDialog` function (~line 2809-2846)
- ☐ Remove `collectSeriesBooks` function (~line 2848-2904)
- ☐ Remove `collectSeriesOpen` state variable
- ☐ Remove `seriesBooks` state variable (current/other)
- ☐ Remove "Group Series Books" dialog markup (~line 9234-9314)
- ☐ Test: Button gone, no console errors, modal removed

#### 3.2 - Documentation Updates ☐
- ☐ Update USER-GUIDE.md (remove references to button)
- ☐ Update help dialogs (if button mentioned)
- ☐ Update CHANGELOG.md (note removal + rationale)
- ☐ Add migration note: "Use Auto-Organize Wizard instead"
- ☐ Test: No stale references in docs

#### 3.3 - Testing: Verify alternative workflows ☐
- ☐ Test: Auto-Organize Wizard handles incremental organization
- ☐ Test: Re-running wizard on Inbox works as expected
- ☐ Test: Manual drag-drop still works for one-off adjustments
- ☐ Test: New Edit Series button provides needed functionality
- ☐ User testing: Confirm no workflow gaps

**Alpha checkpoint:** v5.2.0-alpha.M+1 through alpha.P

---

### Phase 4: Polish & Release

**Deliverable:** Production-ready feature

#### 4.1 - Edge Cases & Validation ☐
- ☐ Handle series name with special characters
- ☐ Handle very long series names (truncate in UI)
- ☐ Handle position conflicts (multiple books with same position)
- ☐ Handle invalid position input (non-numeric)
- ☐ Handle empty series name (validation)
- ☐ Test: Edge cases handled gracefully

#### 4.2 - UX Polish ☐
- ☐ Loading states during batch operations
- ☐ Success feedback ("3 books updated")
- ☐ Error handling with user-friendly messages
- ☐ Keyboard shortcuts (Enter to save, Esc to cancel)
- ☐ Focus management in dialogs
- ☐ Test: Smooth user experience, no confusion

#### 4.3 - Performance ☐
- ☐ Batch IndexedDB updates for multiple books
- ☐ Optimize series list generation (memoize?)
- ☐ Test with large libraries (2000+ books)
- ☐ Ensure <1 second for operations
- ☐ Test: No lag, operations feel instant

#### 4.4 - Documentation ☐
- ☐ Update USER-GUIDE.md with Edit Series section
- ☐ Update USER-GUIDE.md with Series Manager section
- ☐ Add screenshots/examples
- ☐ Update CHANGELOG.md with comprehensive feature list
- ☐ Update TODO.md (remove completed task)
- ☐ Test: Documentation complete and accurate

**Release checkpoint:** v5.2.0

---

## Data Model

### Book Object Updates

```javascript
book = {
    id: "ASIN123",
    title: "Mindblower",
    author: "Warren Murphy",
    series: "The Destroyer",        // ← User-editable
    seriesPosition: "142",           // ← User-editable (string to support decimals)
    seriesTotal: "152",              // (read-only from Amazon)
    // ... other fields
}
```

**Persistence:**
- IndexedDB: `books` object store
- Update individual book: `put()` operation
- Batch updates (rename/merge): Transaction with multiple `put()` operations

**Validation:**
- Series name: Any string (including empty for removal)
- Series position: Numeric (integer or decimal) or empty
- No cascading updates needed (series stored per book, not normalized)

---

## Technical Implementation Notes

### Combobox Component

**React pattern (native HTML datalist):**

```jsx
<input
    list="series-list"
    value={editSeriesName}
    onChange={(e) => setEditSeriesName(e.target.value)}
    placeholder="Type or select series..."
/>
<datalist id="series-list">
    {uniqueSeries.map(series => (
        <option key={series.name} value={series.name}>
            {series.name} ({series.count} books)
        </option>
    ))}
</datalist>
```

**Alternative: Custom React select (more control):**
- Could use library like react-select for richer UI
- Native datalist sufficient for v1 (simpler, no dependencies)

### Batch Updates

**IndexedDB transaction pattern:**

```javascript
const updateSeriesName = async (oldName, newName) => {
    const db = await openDB();
    const tx = db.transaction('books', 'readwrite');
    const store = tx.objectStore('books');

    const booksToUpdate = books.filter(b => b.series === oldName);

    for (const book of booksToUpdate) {
        book.series = newName;
        await store.put(book);
    }

    await tx.done;
};
```

### Undo/Redo Integration

**Single undo action for batch operations:**

```javascript
recordAction({
    type: 'RENAME_SERIES',
    description: `Renamed "${oldName}" to "${newName}" (${count} books)`,
    oldName,
    newName,
    affectedBookIds: booksToUpdate.map(b => b.id)
});
```

**Undo handler:**

```javascript
case 'RENAME_SERIES':
    // Reverse the rename for all affected books
    updateSeriesName(action.newName, action.oldName);
    break;
```

---

## Related Features

- **Auto-Organize Wizard** - Replaces "Group Series Books" button functionality
- **Tag Manager** - UI pattern model for Series Manager
- **Book Detail Modal** - Location of Edit Series button
- **Undo/Redo System** - Integration for all edit operations

---

## Future Enhancements

- **Series gap detection** - "You have Dresden Files #1-15 but missing #7"
- **Auto-suggest series** - ML to suggest series for books missing metadata
- **Bulk edit** - Edit multiple books' series at once
- **Series aliases** - "Destroyer" → "The Destroyer" (automatic mapping)
- **Import series data** - From Goodreads, LibraryThing, etc.

---

## Status

**Current:** Design complete, implementation pending

**Next:** Phase 1 - Edit Series Button & Dialog

**Estimated Effort:**
- Phase 1: Small (3-4 hours)
- Phase 2: Medium (4-6 hours)
- Phase 3: Small (1-2 hours)
- Phase 4: Small (2-3 hours)
- **Total:** 10-15 hours

**Target Release:** v5.2.0
