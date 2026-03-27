# Tag from Collections — Design Plan

## Overview

One-click wizard to convert Kindle Collections into ReaderWrangler tags. Collections are read-only Amazon data; tags are user-owned and editable. This bridges the gap — giving users their existing organization as a starting point they can build on.

**Menu item**: File → "Tag from Collections…"

---

## The Problem

- Collections import from Kindle is read-only — users can see them but can't build on them
- Manually recreating Collections as tags and reassigning books is tedious
- On re-import (new book purchases), users need to tag only the new books without losing prior tag curation
- When a user removes a book from a Kindle Collection, there's no way to know whether the corresponding RW tag was wizard-assigned or user-assigned

---

## Wizard UI

### Layout

```
┌─────────────────────────────────────────────────────────┐
│  Tag from Collections                              [×]  │
│─────────────────────────────────────────────────────────│
│  [Select All] [Select None]    ☐ New books only         │
│─────────────────────────────────────────────────────────│
│  Collections              │  Books in "Mystery"         │
│                           │                             │
│  ☑ Mystery (12)           │  ☑ The Graveyard Book       │
│  ☑ Science Fiction (8)    │  ☑ Dracula                  │
│  ☐ Favorites (5)          │  ✓ Already tagged (dimmed)  │
│  ☑ To Read (15)           │  ☑ New Book Title           │
│                           │                             │
│  ── Removed from Kindle ──│                             │
│  ☑ ⚠️ Thriller (2)        │  (shows removed books when  │
│                           │   a "removed" item clicked) │
│─────────────────────────────────────────────────────────│
│  Will create 3 tags, tag 28 books,        [Apply][Cancel]│
│  remove "Thriller" tag from 2 books                     │
└─────────────────────────────────────────────────────────┘
```

### Left Column: Collections List

- Checkbox + Collection name + book count
- All checked by default on first run
- Collections that already have a matching tag name: show with "(tag exists)" label — checking adds only untagged books
- Click a collection to show its books in the right pane
- **"Removed from Kindle" section** below collections, separated by a divider:
  - Shows collection-tag names where books have the tag in `collectionTags` but the collection is no longer in `book.collections`
  - Checked = will remove the tag from those books
  - Unchecked = keep the tag (promotes from wizard-assigned to user-owned)

### Top Bar

- **Select All / Select None** buttons for collections (does NOT affect removal section)
- **"New books only" toggle** (default: ON after first use, OFF on first use)
  - When ON: right pane only shows books where `collectionTagSeen !== true`
  - When OFF: shows all books in the collection

### Right Column: Book Preview

- Shows books for the selected collection (or removal group)
- Each book has a checkbox (checked = will be tagged; or for removals, checked = will be untagged)
- Books already tagged with this tag: shown with ✓ checkmark, dimmed, not re-tagged
- Books with `collectionTagSeen === true` (when "New only" is on): hidden

### Footer

- Summary: "Will create X new tags, tag Y books, remove Z tags from W books"
- [Apply] [Cancel] buttons

---

## Data Model

### Book field: `collectionTagSeen`

```javascript
book.collectionTagSeen = true; // Set when book appears in wizard
```

- **Internal flag only** — not displayed in UI, not user-editable
- Set to `true` for every book *shown* in the wizard when Apply is clicked, regardless of whether the book was checked or unchecked
- Rationale: the user *saw* the book and made a decision. It shouldn't reappear as "new" next time.
- Persisted in IndexedDB with the book object

### Book field: `collectionTags`

```javascript
book.collectionTags = ["mystery", "science-fiction"]; // Tag IDs assigned by wizard
```

- **Internal tracking field** — not displayed in UI, not user-editable
- Tracks which tag IDs on this book were assigned by the Tag from Collections wizard (vs. manually by the user)
- Used to detect removals: if a tag ID is in `collectionTags` but the corresponding collection is no longer in `book.collections`, the book was removed from that Kindle Collection
- On removal confirmation: tag removed from both `tags` and `collectionTags`
- On removal decline (unchecked): tag removed from `collectionTags` only — promotes to user-owned
- Persisted in IndexedDB with the book object

### Backward compatibility

- Existing books without `collectionTags` are treated as `[]` (no wizard history)
- First-time wizard run on an existing library: all assignments are new, all get tracked in `collectionTags`
- Pre-existing hand-made tags matching a collection name: books already tagged show as "already tagged" (dimmed ✓), their `collectionTags` stays empty — the wizard didn't assign them
- If collection later removed on Kindle: only wizard-assigned books (in `collectionTags`) show in "Removed from Kindle" section; hand-tagged books are untouched

### Where Collections data lives

`book.collections` = array of `{name: string}` objects from Kindle import (read-only, overwritten on each re-import by `mergeCollectionsIntoBooks`)

---

## Behavior

### First Run
- "New books only" defaults to **OFF** (user hasn't run this before, everything is new)
- All collections checked, all books checked
- "Removed from Kindle" section empty (no `collectionTags` history yet)
- User clicks Apply → tags created, books tagged, tag IDs added to `collectionTags`, all shown books flagged as `collectionTagSeen = true`

### Subsequent Runs (after new import)
- "New books only" defaults to **ON**
- Only books with `collectionTagSeen !== true` appear in right pane
- Newly imported books from new Kindle purchases show up here
- "Removed from Kindle" section may show books whose Kindle Collections no longer match their `collectionTags`
- User checks the ones they want, clicks Apply

### Removal Flow
- Wizard computes removals: for each book, find tag IDs in `collectionTags` where the corresponding collection name is no longer in `book.collections`
- Group by tag name for display in left pane
- Checked (default) = confirm removal: tag removed from `book.tags` AND `book.collectionTags`
- Unchecked = keep tag: tag removed from `book.collectionTags` only (promoted to user-owned, won't appear in removals again)

### Duplicate Tag Handling
- If a tag with the same name as a Collection already exists: add untagged books to it (merge), don't create duplicate
- Skip books already assigned to that tag

### Edge Cases
- Collection with 0 new books (all already tagged): show in left column with "(0 new)" — user can still uncheck
- Book in multiple collections: gets multiple tags (one per collection) — correct behavior
- Empty collections (0 books): hide from list
- Book without `collectionTags` field: treated as `[]` — no migration needed
- All books removed from a collection-derived tag: tag stays in `tagRegistry` (user may want it)

---

## Implementation

### Menu Item

Add to File menu after "Auto-Organize…":

```
✨ Auto-Organize…
🏷️ Tag from Collections…     ← NEW
─────────────────
📡 Relay Setup…
```

### State

```javascript
const [tagFromCollectionsOpen, setTagFromCollectionsOpen] = useState(false);
const [tfcSelectedCollection, setTfcSelectedCollection] = useState(null);
const [tfcCheckedCollections, setTfcCheckedCollections] = useState(new Set());
const [tfcUncheckedBooks, setTfcUncheckedBooks] = useState({}); // {collectionName: Set of unchecked bookIds}
const [tfcNewBooksOnly, setTfcNewBooksOnly] = useState(false);
// Removal tracking:
const [tfcCheckedRemovals, setTfcCheckedRemovals] = useState(new Set()); // removal group keys checked for removal
const [tfcUncheckedRemovalBooks, setTfcUncheckedRemovalBooks] = useState({}); // {tagLabel: Set of bookIds to keep}
```

### Getting Collections Data

`book.collections` = array of `{name}` objects from Kindle import.

### Tag Creation

Use existing tag infrastructure:
- `tagRegistry` for tag definitions
- `book.tags` array for assignments
- `book.collectionTags` array for wizard-assignment tracking
- Generate tag IDs from collection names (slugified: lowercase, spaces → hyphens)

---

## Files Modified

| File | Changes |
|------|---------|
| `readerwrangler.js` | (1) Add menu item; (2) Add wizard modal with two-pane UI; (3) Add `collectionTagSeen` flag handling; (4) Add `collectionTags` tracking; (5) Tag creation + assignment logic; (6) "Removed from Kindle" detection + removal logic |

---

## Verification

1. First run: all collections shown, all books checked → Apply → tags created, books tagged, `collectionTags` populated
2. Re-import new books → run wizard → "New books only" ON → only new books appear
3. Uncheck a book → Apply → book flagged as seen but NOT tagged → doesn't reappear next run
4. Collection with existing matching tag → books merged into existing tag, no duplicate
5. Book in 2 collections → gets 2 tags, both in `collectionTags`
6. Select None → Apply → all books flagged as seen, no tags created → next run shows nothing new
7. Remove book from Kindle Collection → re-import → run wizard → "Removed from Kindle" shows that book with tag checked for removal
8. Confirm removal → tag removed from `tags` and `collectionTags`
9. Decline removal (uncheck) → tag stays in `tags`, removed from `collectionTags` (promoted to user-owned)
10. Pre-existing hand-tagged books matching a collection name → not affected by removal flow
