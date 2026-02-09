# Wizard Mode - Auto-Organize by Author/Series

## Overview

A wizard-style feature that automatically creates folder structures based on author and series metadata. Reduces manual organization work by identifying prolific authors and grouping their books by series.

---

## Problem Statement

Users with large libraries (1000+ books) face tedious manual work:
1. Identify authors with many books
2. Create author folder
3. Identify series within that author's catalog
4. Create series subfolders
5. Move books into correct subfolders in series order
6. Handle non-series books (standalone novels, anthologies)

This process takes hours for a large library.

---

## Solution

An automated wizard that:
1. Analyzes books in Inbox (or selected source folder)
2. Identifies authors with N+ books (configurable threshold)
3. Detects series from book metadata
4. Creates folder hierarchy: Author > Series > Books
5. Preserves series order where available
6. Groups non-series books in "Miscellaneous" subfolder

---

## UI Design

### Trigger Location

**Primary:** Wand icon (🪄) in Folders header, next to Expand/Collapse All toggle

**Secondary:** Right-click on Inbox → "Auto-Organize..."

### Icon Choice

🪄 (wand) - Clear, professional, universally understood as "magic/automation"

Alternative considered: 🧙 (wizard hat) - Fun but potentially too cartoonish

### Modal Dialog

```
┌─────────────────────────────────────────────────────────────┐
│  🪄 Auto-Organize by Author                            [×]  │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Source: [Inbox ▼]          Minimum books: [5 ▼]            │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  Authors found with 5+ books:                               │
│                                                             │
│  ☑ Jim Butcher         43 books   6 series detected        │
│  ☑ John Scalzi         73 books   5 series detected        │
│  ☑ Warren Murphy      176 books   4 series detected        │
│  ☑ Brandon Sanderson   28 books   3 series detected        │
│  ☐ Tom Clancy          35 books   3 series detected        │
│  ☐ Stephen King        22 books   2 series detected        │
│  ...                                                        │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  Options:                                                   │
│  ☑ Create subfolders for each series                        │
│  ☑ Sort books by series position                            │
│  ☑ Create "Miscellaneous" for non-series books              │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  [Select All]  [Select None]     [Preview]  [Organize]      │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Preview Mode

Clicking "Preview" shows what will be created without making changes:

```
┌─────────────────────────────────────────────────────────────┐
│  🪄 Preview - Folders to Create                        [×]  │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  📁 Jim Butcher (43 books)                                  │
│     📁 Dresden Files (17 books)                             │
│     📁 Codex Alera (6 books)                                │
│     📁 Cinder Spires (2 books)                              │
│     📁 Miscellaneous (18 books)                             │
│                                                             │
│  📁 John Scalzi (73 books)                                  │
│     📁 Old Man's War (6 books)                              │
│     📁 Lock In (3 books)                                    │
│     📁 The Interdependency (3 books)                        │
│     📁 Miscellaneous (61 books)                             │
│                                                             │
│  ...                                                        │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│  Will create: 12 author folders, 47 series subfolders       │
│  Will move: 523 books from Inbox                            │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│                              [Back]  [Organize Now]         │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Data Sources

### Author Detection
- Primary: `book.author` field
- Normalize: "Jim Butcher" vs "Butcher, Jim" → same author
- Handle multiple authors: Use primary (first listed) author

### Series Detection
- Primary: `book.series` field (from Amazon metadata)
- Contains: Series name and position (e.g., "Dresden Files #15")
- Fallback: Title pattern matching ("Book Title (Series Name Book 3)")

### Series Position
- Primary: `book.seriesPosition` or extracted from series string
- Fallback: Acquisition date order
- Manual override: User can reorder after creation

---

## Algorithm

```
1. Get books from source folder (Inbox)
2. Group books by normalized author name
3. Filter authors with >= threshold books
4. For each selected author:
   a. Create author folder
   b. Group author's books by series
   c. For each series with 2+ books:
      - Create series subfolder
      - Add books sorted by series position
   d. If "Miscellaneous" option enabled:
      - Create Miscellaneous subfolder
      - Add non-series books sorted by date
   e. Else:
      - Add non-series books to author folder root
5. Remove organized books from source folder
```

---

## Configuration Options

| Option | Default | Description |
|--------|---------|-------------|
| Source folder | Inbox | Where to look for unorganized books |
| Minimum books | 5 | Author threshold for inclusion |
| Create series subfolders | ✓ | Group by series vs flat author folder |
| Sort by series position | ✓ | Order books within series |
| Create Miscellaneous | ✓ | Subfolder for non-series books |

---

## Edge Cases

### Same-name authors
- "John Smith" the sci-fi author vs "John Smith" the romance author
- Solution: Group by author, let user review/split in Preview

### Co-authored books
- "Good Omens" by Terry Pratchett and Neil Gaiman
- Solution: Use primary author; book appears in one folder only

### Anthologies
- Multiple short stories, different series
- Solution: Goes to Miscellaneous (no series detected)

### Already organized
- User re-runs wizard after partial organization
- Solution: Only process books in source folder; skip books already in user folders

### Series spanning authors
- Shared universe books (e.g., Wild Cards anthology series)
- Solution: Each book goes to its listed author; user can manually reorganize

---

## Implementation Phases

### Phase 1: Basic Wizard ✅ COMPLETE (v5.1.0-alpha.19)

**Deliverable:** Wizard creates flat author folders from Inbox

**Completed features:**
- ✅ Author detection and grouping (case-insensitive)
- ✅ Simple modal with author list and checkboxes
- ✅ Slider control for minimum books threshold (1-20)
- ✅ Segmented controls for sort (# Books / A-Z) and selection (All / Some / None)
- ✅ Create flat author folders (no series subfolders)
- ✅ Remove organized books from Inbox
- ✅ Bundled undo/redo (single Ctrl+Z undoes entire operation)
- ✅ Help dialog with workflow tips
- ✅ Orphaned bookId cleanup
- ✅ Collapse/Expand controls moved to My Library header

**Alpha versions:** v5.1.0-alpha.8 through alpha.19

---

### Phase 2: Series Detection (Subfolders & Organization)

**Deliverable:** Wizard creates series subfolders with sorted books
**Alpha checkpoint:** v5.1.0-alpha.20+

#### 2.1 - Options: Add series subfolder options to modal
- ☐ Add checkbox: "Create subfolders for each series" (default: checked)
- ☐ Add checkbox: "Sort books by series position" (default: checked)
- ☐ Add checkbox: "Create 'Miscellaneous' for non-series books" (default: checked)
- ☐ Options state management (useState hooks)
- ☐ Test: Options toggle correctly, persist during session

#### 2.2 - UI: Update author list to show series count
- ☐ Parse series metadata for each author's books
- ☐ Count unique series per author
- ☐ Update display format: "Jim Butcher - 43 books - 6 series detected"
- ☐ Test: Series counts appear, match reality

#### 2.3 - Algorithm: Parse series metadata
- ☐ Extract series name from `book.series` field
- ☐ Extract series position from `book.seriesPosition` field (integer or decimal)
- ☐ Handle missing series data (treat as standalone book)
- ☐ Handle malformed data gracefully (log warnings, don't crash)
- ☐ Group books by normalized series name (case-insensitive)
- ☐ Test: Console log series grouping for test author

#### 2.4 - Algorithm: Create series subfolders
- ☐ For each series with 2+ books: create subfolder under author folder
- ☐ Add books to series folder, sorted by position (if option enabled)
- ☐ If sort option disabled: use acquisition date order
- ☐ Handle books with same position (use acquisition date as tiebreaker)
- ☐ Update sub-actions for undo (CREATE_FOLDER for series subfolders)
- ☐ Test: Series folders created with correct books in correct order

#### 2.5 - Algorithm: Handle non-series books
- ☐ If "Miscellaneous" option enabled: create Miscellaneous subfolder
- ☐ Add non-series books to Miscellaneous (sorted by acquisition date)
- ☐ If "Miscellaneous" option disabled: add non-series books to author folder root
- ☐ Test: Non-series books go to correct location based on option

---

### Phase 3: Preview & Polish

**Deliverable:** Production-ready wizard with preview mode

#### 3.1 - UI: Preview mode dialog
- ☐ Add "Preview" button to main wizard dialog (next to "Organize")
- ☐ Create preview modal with folder tree visualization
- ☐ Show hierarchy: Author > Series > Book count
- ☐ Summary counts: folders, subfolders, books moved
- ☐ "Back" button returns to main wizard
- ☐ "Organize Now" button executes organization
- ☐ Test: Preview shows accurate folder tree structure

#### 3.2 - UX: Progress indicator
- ☐ Detect large operations (threshold: 100+ books)
- ☐ Show progress dialog during organization
- ☐ Update progress: "Creating folders... (3 of 12)"
- ☐ Update progress: "Moving books... (127 of 523)"
- ☐ Auto-dismiss on completion
- ☐ Test: Progress updates smoothly, completes at 100%

#### 3.3 - UX: Results summary
- ☐ Show summary dialog after completion
- ☐ Display: "Created X folders, Y subfolders, moved Z books"
- ☐ Close button dismisses dialog
- ☐ Test: Summary counts accurate, dialog dismissible

#### 3.4 - Edge cases: Validation & error handling
- ☐ Handle empty source folder gracefully (show message, disable Organize)
- ☐ Handle no authors meeting threshold (show message)
- ☐ Handle duplicate folder names (shouldn't happen, but safeguard)
- ☐ Handle invalid series positions (log warning, use date fallback)
- ☐ Test: Edge cases handled without crashes

---

## Future Enhancements

- **Incremental mode**: "New books detected for Jim Butcher. Add to existing folder?"
- **Series gap detection**: "You have Dresden Files #1-15 but missing #7"
- **Smart suggestions**: "These 5 books look like a series. Create subfolder?"
- **Author aliases**: "Jim Butcher" and "J. Butcher" → same author

---

## Related Documents

- [BOOK-EXPLORER.md](BOOK-EXPLORER.md) - Parent feature
- [TAGS.md](TAGS.md) - Complementary organization feature
- [TODO.md](../../TODO.md) - Priority 1: Book Explorer

---

## Status

**Current:** Phase 1 Complete (v5.1.0-alpha.19) ✅

**Next:** Phase 2 - Series Detection

**Progress:**
- Phase 1: ✅ Complete (v5.1.0-alpha.8 through alpha.19)
- Phase 2: ⏸️ Not Started
- Phase 3: ⏸️ Not Started

**Estimated Effort:**
- Phase 2: Medium (6-8 hours)
- Phase 3: Small (2-4 hours)
