# Tags Design

**Status**: Design
**Created**: 2026-01-10
**Complexity**: MEDIUM/MEDIUM (8-12 hours)
**Problem**: Users need to find thematically related books (Time Travel, Military SF, Civilization Building) across 100+ columns without scrolling through empty space.

---

## Overview

Add tagging support for books and divs, enabling cross-library thematic organization. Books can have explicit tags and inherit tags from their containing div. When filtering by tag, empty columns/divs are hidden.

---

## Core Concepts

### Two Types of Tags

| Type | Applied To | Behavior | Persistence |
|------|------------|----------|-------------|
| **Explicit** | Books | Permanent, follows book when moved | Stored in book data |
| **Inherited** | Books under a div | Positional, lost when book moves out | Calculated at filter-time |

### Div Inheritance Scope

Books inherit tags ONLY from the div they're directly under, until the next div:

```
Column: Larry Bond
├── [Div: Military SF] ← tag: "military-sf"
│   ├── Book A         ← inherits "military-sf"
│   ├── Book B         ← inherits "military-sf"
│   └── Book C         ← inherits "military-sf"
├── [Div: Thrillers]   ← tag: "thriller"
│   ├── Book D         ← inherits "thriller" (NOT "military-sf")
│   └── Book E         ← inherits "thriller"
└── Book F             ← no inherited tags (not under any div)
```

**Rationale:** Dragging a div within a column should not affect inheritance of other divs' books.

### Tag Registry

Central registry for autocomplete and management:

```javascript
// Stored in localStorage/collections
tagRegistry: {
  "time-travel": { label: "Time Travel", count: 47 },
  "military-sf": { label: "Military SF", count: 23 },
  "civilization-building": { label: "Civilization Building", count: 12 },
  // ...
}
```

- `count` = number of books with explicit tag (inherited not counted)
- Used for autocomplete suggestions
- Orphaned tags (count: 0) can be cleaned up

---

## Data Model

### Book

```javascript
{
  asin: "B00123",
  title: "The Forever War",
  tags: ["military-sf", "classic"],  // Explicit tags only
  // ... other fields
}
```

### Div

```javascript
{
  id: "div-123",
  type: "divider",
  title: "Military SF",
  tags: ["military-sf"],  // Div's tags (books under it inherit)
}
```

### Column (unchanged)

Columns do NOT have tags - they contain divs and books, but don't contribute to inheritance.

---

## Filter Behavior

### Tag Filter Algorithm

```javascript
function filterByTag(selectedTags, columns, books) {
  const matchingBookIds = new Set();

  // 1. Find books with explicit matching tags
  for (const book of books) {
    if (book.tags?.some(t => selectedTags.includes(t))) {
      matchingBookIds.add(book.asin);
    }
  }

  // 2. Find books under divs with matching tags
  for (const column of columns) {
    let currentDivTags = [];

    for (const item of column.books) {  // books array contains book IDs and dividers
      if (item.type === 'divider') {
        currentDivTags = item.tags || [];
      } else {
        // It's a book ID
        if (currentDivTags.some(t => selectedTags.includes(t))) {
          matchingBookIds.add(item);
        }
      }
    }
  }

  return matchingBookIds;
}
```

### Hide Empty Columns/Divs

When tag filter is active:

| Element | Has Matching Books? | Behavior |
|---------|---------------------|----------|
| Column | Yes | Show with only matching books visible |
| Column | No | **Hide entirely** |
| Div | Has matching books under it | Show with only matching books |
| Div | No matching books under it | **Hide** |

**Status indicator:** "Showing 47 of 2349 books across 12 columns"

---

## User Interface

### Adding Tags to Books

**In Book Detail Modal:**
```
┌─────────────────────────────────────────────────────┐
│ Tags: [Military SF ×] [Time Travel ×] [+ Add tag]  │
│       ─────────────────────────────────────────     │
│       Bold = explicit     Faded = inherited         │
└─────────────────────────────────────────────────────┘
```

- Click "+ Add tag" or type in field
- Autocomplete from existing tags
- Enter or comma to confirm
- Click × to remove (explicit only; inherited shows no ×)

**Multi-select Context Menu:**
- Select multiple books → Right-click → "Add Tag to Selected"
- Bulk tagging operation

**Single Book Right-Click Menu:**
```
┌────────────────────────┐
│ Add/Edit Tags      →   │──┌─────────────────────────┐
│ ...                    │  │ ☑️ Time Travel          │
└────────────────────────┘  │ ☐ Military SF           │
                            │ ☐ Civilization          │
                            │ ───────────────────     │
                            │ ➕ Create New Tag...    │
                            └─────────────────────────┘
```

- Shows existing tags as checkboxes (checked = book has tag)
- "Create New Tag..." opens inline text input
- Quick way to tag without opening detail modal

### Adding Tags to Divs

**Right-click Context Menu:**
```
┌────────────────────────┐
│ Rename Div             │
│ Delete Div             │
│ ───────────────────    │
│ Add/Edit Tags          │  ← Opens tag editor
│ Add Tag to All Books   │  ← Applies explicit tag to each book under div
└────────────────────────┘
```

**"Add Tag to All Books"** - Converts positional inheritance to explicit tags on each book. Useful when:
- You want books to keep the tag even if moved
- You're about to reorganize and want to preserve the tagging

### Tag Filter UI

New filter in filter panel:

```
🏷️ [Tags: All ▼]
```

Dropdown with multi-select:
```
┌─────────────────────────┐
│ ☑️ Time Travel (47)     │
│ ☐ Military SF (23)      │
│ ☐ Civilization (12)     │
│ ☐ Detective (8)         │
│ ───────────────────     │
│ [Clear All]             │
└─────────────────────────┘
```

- Checkboxes for multi-select
- Count shows explicit + inherited books
- OR logic: show books with ANY selected tag

### Tag Display on Books

**In Detail Modal - Tag Section:**

Display order:
1. Explicit tags first, alphabetically, **bold**
2. Inherited tags second, alphabetically, *faded/normal weight*

```
Tags: [Military SF] [Time Travel] [classic] [thriller]
       ───────────────────────────  ─────────────────
       Bold (explicit)               Faded (inherited)
```

**On Book Card (optional future enhancement):**
- Small tag pills below book cover
- Or tag icon indicator if book has tags

---

## Tag Management

### Tag List View (Phase 3)

Accessible from Settings or dedicated button:

```
┌─────────────────────────────────────────────────────┐
│ Manage Tags                                    [×]  │
├─────────────────────────────────────────────────────┤
│ Tag                    Books    Actions             │
│ ─────────────────────────────────────────────────   │
│ Time Travel            47       [Rename] [Delete]   │
│ Military SF            23       [Rename] [Delete]   │
│ Civilization Building  12       [Rename] [Delete]   │
│ classic                5        [Rename] [Delete]   │
│ ─────────────────────────────────────────────────   │
│ Orphaned tags (0 books):                            │
│ old-tag                0        [Delete]            │
└─────────────────────────────────────────────────────┘
```

**Operations:**
- **Rename**: Updates tag everywhere (books + divs)
- **Delete**: Removes tag from all books/divs
- **Merge** (future): Combine two tags into one

---

## Implementation Phases

### Phase 1: Basic Book Tags (4-5 hours)
1. Add `tags` array to book data model
2. Tag input in book detail modal with autocomplete
3. Tag filter dropdown in filter panel
4. Hide empty columns when tag filter active
5. Tag registry for autocomplete

### Phase 2: Div Tags + Inheritance (3-4 hours)
1. Add `tags` array to div data model
2. Right-click div → Add/Edit Tags
3. Inheritance calculation in filter logic
4. Visual distinction (bold vs faded) in display
5. Right-click div → Add Tag to All Books

### Phase 3: Tag Management (2-3 hours)
1. Tag management modal
2. Rename tag across all books/divs
3. Delete tag
4. Orphan tag cleanup

**Total: MEDIUM/MEDIUM (8-12 hours)**

---

## Edge Cases

### Book Under No Div
Books at top of column (before first div) or after all divs have no inherited tags.

### Empty Div
Div with tags but no books under it - hidden when tag filter is active.

### Duplicate Tags
If book has explicit "time-travel" AND is under div tagged "time-travel":
- Only shows once in display
- Explicit version takes precedence (shown as bold)

### Tag Case Sensitivity
Tags are case-insensitive for matching, but preserve display case from first creation.
- "Military SF" created first → always displays as "Military SF"
- User types "military sf" → matches existing, uses existing display form

### Unorganized Column
Unorganized column has no divs, so books there can only have explicit tags.

---

## Persistence

### Stored in Collections JSON
```javascript
{
  columns: [...],
  books: [
    { asin: "B001", tags: ["time-travel", "favorite"], ... },
    ...
  ],
  tagRegistry: {
    "time-travel": { label: "Time Travel", count: 47 },
    ...
  }
}
```

### Migration
Existing collections without tags: `tags` array defaults to `[]`, tagRegistry defaults to `{}`.

---

## Accessibility

- Tag filter keyboard accessible (arrow keys, Enter to select)
- Tag pills in modal: Tab to focus, Enter/Delete to remove
- Screen reader: "Tags: Military SF (explicit), Time Travel (inherited from div)"

---

## Future Enhancements

1. **Tag colors**: User-assigned colors for visual grouping
2. **Tag on book card**: Small indicators on book covers
3. **Smart tags**: Auto-generated from book metadata (e.g., series name)
4. **Tag hierarchy**: Parent/child tags (e.g., "SF" parent of "Military SF")
5. **AND/OR filter logic**: Currently OR only; add AND option

---

## Files to Modify

- `readerwrangler.js` - Tag state, filter logic, UI components
- `readerwrangler.css` - Tag pill styling, filter dropdown

---

## Related Features

- **Book Notes** (P1 #3): Tags are structured; notes are freeform. Both add user metadata.
- **Responsive Filter Panel** (P1 #2): Tag filter will be added to the filter panel.
