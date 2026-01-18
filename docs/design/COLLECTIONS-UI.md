# Collections UI Design Document

**Feature**: Collections Integration - UI Features
**Status**: ✅ Complete (v3.8.0)
**Created**: 2025-11-24
**Updated**: 2025-12-21

---

## Goal

Display Amazon collection membership and read status in the organizer UI.

---

## Implementation (Complete)

**Data Merge (Complete):**
- Collections import successfully retrieves collection data
- Data merged into organizer on load
- Console shows: "📚 Collections data merged: 1163 books have collections"
- Read status tracked: 642 READ, 1 UNREAD, 1700 UNKNOWN

**Completed UI Features:**
- ✅ **Visual indicators (badges/icons)** - Collection badges displayed on book covers (updated v3.8.0)
- ✅ **Metadata display** - Collection names shown in book detail modal (comma-separated list)
- ✅ **Wishlist filtering** - Filter by wishlist status (Wishlist/Owned toggle) via Advanced Filtering System (v3.8.0)

---

## Future Enhancements (Not Part of Collections Feature)

These features are related to read status tracking, not collections integration:

1. **Filtering by read status** - Filter by READ/UNREAD/UNKNOWN (separate feature, not part of collections)
2. **Filtering by collection name** - Dropdown to filter by specific collection (lower priority enhancement)
3. **"Uncollected" pseudo-collection** - Filter for books with no collections (lower priority enhancement)

---

## Design Decisions

### Data Architecture

- **Two separate JSON files**: `amazon-library.json` + `amazon-collections.json`
- **Collections JSON includes ALL books** (even with no collections) for "Uncollected" support
- **Output format**: `{asin, title, readStatus, collections: [{id, name}]}`
- **"Uncollected" = computed pseudo-collection** (books with `collections: []`)

### Edge Cases

| Scenario | Behavior |
|----------|----------|
| Books in collections but not library | Show dialog after full scan |
| Books in library but not collections | Normal, no collections/readStatus |
| Missing collections.json | App works, no collection features |
| Schema mismatch | Handle gracefully |

---

## Implementation Notes

- Collections data is merged into book objects at load time
- No changes to library JSON structure required
- UI components will read from merged book objects
