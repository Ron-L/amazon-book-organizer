# Tag from Collections — Design Plan

## Overview

One-click wizard to convert Kindle Collections into ReaderWrangler tags. Collections are read-only Amazon data; tags are user-owned and editable. This bridges the gap — giving users their existing organization as a starting point they can build on.

**Menu item**: File → "Tag from Collections…"

---

## The Problem

- Collections import from Kindle is read-only — users can see them but can't build on them
- Manually recreating Collections as tags and reassigning books is tedious
- On re-import (new book purchases), users need to tag only the new books without losing prior tag curation

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
│  ☐ Favorites (5)          │  ☑ The Hound of the...      │
│  ☑ To Read (15)           │  ✓ Already tagged (dimmed)  │
│                           │  ☑ New Book Title           │
│                           │                             │
│─────────────────────────────────────────────────────────│
│  Will create 3 tags and tag 28 books    [Apply] [Cancel]│
└─────────────────────────────────────────────────────────┘
```

### Left Column: Collections List

- Checkbox + Collection name + book count
- All checked by default on first run
- Collections that already have a matching tag name: show with "(tag exists)" label — checking adds only untagged books
- Click a collection to show its books in the right pane

### Top Bar

- **Select All / Select None** buttons for collections
- **"New books only" toggle** (default: ON after first use, OFF on first use)
  - When ON: right pane only shows books where `collectionTagSeen !== true`
  - When OFF: shows all books in the collection

### Right Column: Book Preview

- Shows books for the selected collection
- Each book has a checkbox (checked = will be tagged)
- Books already tagged with this tag: shown with ✓ checkmark, dimmed, not re-tagged
- Books with `collectionTagSeen === true` (when "New only" is on): hidden

### Footer

- Summary: "Will create X new tags and tag Y books"
- [Apply] [Cancel] buttons

---

## Data Model

### Book flag: `collectionTagSeen`

```javascript
book.collectionTagSeen = true; // Set when book appears in wizard
```

- **Internal flag only** — not displayed in UI, not user-editable
- Set to `true` for every book *shown* in the wizard when Apply is clicked, regardless of whether the book was checked or unchecked
- Rationale: the user *saw* the book and made a decision. It shouldn't reappear as "new" next time.
- Persisted in IndexedDB with the book object

### Where Collections data lives

Books already have collection data from Kindle import. Need to verify the field name.

---

## Behavior

### First Run
- "New books only" defaults to **OFF** (user hasn't run this before, everything is new)
- All collections checked, all books checked
- User clicks Apply → tags created, books tagged, all shown books flagged as `collectionTagSeen = true`

### Subsequent Runs (after new import)
- "New books only" defaults to **ON**
- Only books with `collectionTagSeen !== true` appear in right pane
- Newly imported books from new Kindle purchases show up here
- User checks the ones they want, clicks Apply

### Duplicate Tag Handling
- If a tag with the same name as a Collection already exists: add untagged books to it (merge), don't create duplicate
- Skip books already assigned to that tag

### Edge Cases
- Collection with 0 new books (all already tagged): show in left column with "(0 new)" — user can still uncheck
- Book in multiple collections: gets multiple tags (one per collection) — correct behavior
- Empty collections (0 books): hide from list

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
```

### Getting Collections Data

Need to find how collections are stored on book objects. Likely `book.collections` or similar array from the Kindle import.

### Tag Creation

Use existing tag infrastructure:
- `tagRegistry` for tag definitions
- `book.tags` array for assignments
- Generate tag IDs from collection names (slugified)

---

## Files Modified

| File | Changes |
|------|---------|
| `readerwrangler.js` | (1) Add menu item; (2) Add wizard modal; (3) Add `collectionTagSeen` flag handling; (4) Tag creation + assignment logic |

---

## Verification

1. First run: all collections shown, all books checked → Apply → tags created, books tagged
2. Re-import new books → run wizard → "New books only" ON → only new books appear
3. Uncheck a book → Apply → book flagged as seen but NOT tagged → doesn't reappear next run
4. Collection with existing matching tag → books merged into existing tag, no duplicate
5. Book in 2 collections → gets 2 tags
6. Select None → Apply → all books flagged as seen, no tags created → next run shows nothing new
