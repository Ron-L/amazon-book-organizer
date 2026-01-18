# Schema v2.0: Unified File Format

**Date:** 2025-12-24
**Status:** Design Complete, Implementation Pending

## Summary

Replace the current two-file system (`amazon-library.json` + `amazon-collections.json`) with a single unified file. Also adds wishlist support with books distinguished by an `isOwned` flag.

---

## Motivation

### Current Pain Points

1. **Two files to manage** - Users must load library JSON, then separately load collections JSON
2. **Easy to mismatch** - Loading wrong collections file against a library
3. **UX burden** - "Which file do I pick?" confusion
4. **Orphaned data** - Fresh library import doesn't carry forward wishlist items

### Why Merge Now?

- N=1 user currently (developer only)
- Breaking changes are cheap now, expensive later
- Wishlist feature requires schema changes anyway - good time to consolidate

---

## Design Decisions

### Key Decisions Table

| Question | Decision | Rationale |
|----------|----------|-----------|
| File structure | Merge library + collections into single file | Simpler UX, prevents mismatch |
| Wishlist storage | In `books.items` with `isOwned: false` | Same array, visual distinction only |
| Field naming | `isOwned` (boolean) | Follows `is*` naming convention |
| Fetcher naming | "Wish Fetcher" | Consistent with Library/Collections Fetcher |
| Duplicate handling | ASIN-merge (update existing, preserve location) | Wishlist→Owned transition is seamless |
| Default column for wishlist | Unorganized column | No special column needed |
| Fresh import behavior | In-app option with warning dialog | Don't offload to file system navigation |
| Fetcher order | Order independent - all are additive | No "Library must be first" constraint |

---

## Schema v2.0 Structure

```json
{
  "schemaVersion": "2.0",
  "books": {
    "fetchDate": "2025-12-24T10:30:00Z",
    "fetcherVersion": "1.2.0",
    "items": [
      {
        "asin": "B08XYZ1234",
        "isOwned": true,
        "title": "Example Book",
        "author": "Author Name",
        "acquiredDate": "2024-06-15",
        "coverUrl": "https://...",
        "rating": 4.5,
        "pageCount": 320,
        "description": "..."
      },
      {
        "asin": "B09ABC5678",
        "isOwned": false,
        "title": "Wishlist Book",
        "author": "Another Author",
        "addedToWishlist": "2025-12-24",
        "coverUrl": "https://...",
        "rating": 4.8
      }
    ]
  },
  "collections": {
    "fetchDate": "2025-12-24T10:35:00Z",
    "fetcherVersion": "1.0.0",
    "items": {
      "B08XYZ1234": ["Currently Reading", "Sci-Fi"],
      "B09ABC5678": []
    }
  },
  "organization": {
    "columns": [
      {
        "id": "col-1",
        "name": "To Read",
        "items": ["B08XYZ1234", "div-1", "B09ABC5678"]
      }
    ],
    "columnOrder": ["col-1", "col-2"]
  }
}
```

### Section Breakdown

| Section | Purpose | Metadata |
|---------|---------|----------|
| `books` | All book items (owned + wishlist) | `fetchDate`, `fetcherVersion` |
| `collections` | Amazon's collection assignments | `fetchDate`, `fetcherVersion` |
| `organization` | User's column layout and order | None (user-managed) |

### Book Item Fields

| Field | Type | Owned Books | Wishlist Books |
|-------|------|-------------|----------------|
| `asin` | string | ✅ Required | ✅ Required |
| `isOwned` | boolean | `true` | `false` |
| `title` | string | ✅ | ✅ |
| `author` | string | ✅ | ✅ |
| `coverUrl` | string | ✅ | ✅ |
| `rating` | number | ✅ | ✅ |
| `acquiredDate` | string | ✅ | ❌ |
| `addedToWishlist` | string | ❌ | ✅ |
| `pageCount` | number | ✅ | Optional |
| `description` | string | ✅ | Optional |

---

## Fetcher Behavior

### Three Fetchers

1. **Library Fetcher** - Imports owned books from Amazon library page
2. **Collections Fetcher** - Imports Amazon collection assignments
3. **Wish Fetcher** - Imports from current book page (single book) or wishlist page

### Order Independence

Any fetcher can run first. All fetchers are **additive**:

```
User has: Empty file
Runs: Wish Fetcher → adds 1 wishlist book
Runs: Library Fetcher → adds 100 owned books
Runs: Collections Fetcher → adds collection mappings
Result: 101 books with collections
```

```
User has: 100 owned books
Runs: Wish Fetcher on a book they already own
Result: No change (duplicate detected by ASIN, silent no-op)
```

### ASIN-Based Merge Logic

When adding a book:

```
if (books.items.find(b => b.asin === newBook.asin)) {
  // Book exists - update fields but preserve location
  // If wishlist book becomes owned: set isOwned = true, add acquiredDate
} else {
  // New book - add to items array
}
```

### Wishlist → Owned Transition

When user purchases a wishlist book and re-imports library:

1. Library Fetcher finds book with matching ASIN
2. Updates `isOwned: false` → `isOwned: true`
3. Adds `acquiredDate` field
4. Book **stays in current column** (doesn't move to Unorganized)
5. Visual effect: "ungrays" in place

---

## App Behavior

### Storage Model

- **IndexedDB** - Auto-saves working state (invisible to user)
- **File Export** - User-triggered download of unified file

Work is never lost - IndexedDB auto-saves. Export/Import are for moving data in/out.

### UI Changes

**Button bar:** `[📥 Import] [💾 Export] [🗑️ Reset App]`

| Button | Action | Tooltip |
|--------|--------|---------|
| Import | File picker → load unified file | "Load library file" |
| Export | Download unified file (with organization) | "Download library with organization" |
| Reset App | Confirmation dialog → clear IndexedDB | (existing behavior) |

**Data Status dialog:** Purely informational (no action buttons)
- Shows books count + fetchDate
- Shows collections count + fetchDate
- Shows organization stats (columns, dividers)

### File Loading (Import)

1. User clicks "Import" button
2. File picker opens
3. App reads file, checks `schemaVersion`
4. If v2.0: Load directly into IndexedDB
5. Freshness dates display in Data Status (old file shows old dates)

### Wishlist Display

- Wishlist books (`isOwned: false`) appear in Unorganized column initially
- User can drag to any column
- Visual distinction:
  - Gray-out effect on cover/title
  - "Wishlist" badge overlay
  - Click opens Amazon purchase page (instead of detail modal)

---

## Migration Path

**Note:** With N=1 user, v1.x migration is not implemented. User will re-run fetchers to generate v2.0 files.

---

## File Naming

| Scenario | Filename |
|----------|----------|
| Fetcher output | `amazon-library.json` |
| App export | `readerwrangler-backup-{date}.json` |

Note: `amazon-collections.json` becomes obsolete. Collections data is now embedded in the unified file.

---

## File Types: Library vs Backup

Two distinct file types serve different purposes:

| File | Created by | Filename | Contains | Purpose |
|------|------------|----------|----------|---------|
| Library | Fetcher | `amazon-library.json` | books, collections | Transport data into app |
| Backup | App Export | `readerwrangler-backup-{date}.json` | books, collections, organization, `isBackup: true` | Save/restore app state |

### Detection Logic

- `isBackup: true` at root level → Backup file
- No `isBackup` field (or `false`) → Library file

### Fetcher Behavior

Fetchers **reject** backup files:
- Check for `isBackup === true` before processing
- Display error: "This is a backup file. Please select amazon-library.json instead."
- Rationale: Fetchers should update library data, not overwrite backup state

### App Import Behavior

| File Type | Behavior |
|-----------|----------|
| Backup (`isBackup: true`) | Prompt: "Restore backup? This will replace your current organization." → Full replace |
| Library (no `isBackup`) | Merge books into existing library, keep current organization, ignore any `organization` in file |

---

## Implementation Phases

### Phase 1: Fetchers (v2.0 output)
- [ ] Update Library Fetcher → output v2.0 format
- [ ] Update Collections Fetcher → merge into existing unified file

### Phase 2: App (v2.0 support)
- [ ] Update app to read v2.0 format (`books.items`, `collections.items`)
- [ ] Update app to export v2.0 format (with `organization` section)
- [ ] Update Data Status to read from `books.fetchDate`, `collections.fetchDate`
- [ ] Rename buttons: Backup→Export, Restore→Import
- [ ] Remove Load buttons from Data Status dialog

### Phase 3: Wishlist Feature (T1, separate work)
- [ ] Create Wish Fetcher bookmarklet
- [ ] Add `isOwned` field handling
- [ ] Add wishlist visual styling (gray-out, badge)
- [ ] Add Amazon purchase link behavior
- [ ] Implement ASIN-merge logic for wishlist→owned transitions

---

## Open Questions (Resolved)

| Question | Resolution |
|----------|------------|
| Separate wishlist array vs. flag in items? | Flag in items (`isOwned: false`) |
| Special wishlist column? | No, use Unorganized column |
| What happens to wishlist on fresh import? | Lost (with warning), user's choice |
| Order of fetcher execution? | Order independent |
| User navigation to file system? | Never required - all in-app |

---

## Related Documents

- [MULTI-USER-DESIGN.md](MULTI-USER-DESIGN.md) - Future multi-user support
- [MULTI-STORE-ARCHITECTURE.md](MULTI-STORE-ARCHITECTURE.md) - Future non-Amazon support
