# Schema v2.x: Unified File Format

**Date:** 2025-12-24
**Updated:** 2026-03-04 (v6.0.0 relay-only, v2.3 schema with backup relay credentials)
**Status:** Implemented

## Summary

Unified data format for ReaderWrangler library data. Originally replaced the two-file system (`amazon-library.json` + `amazon-collections.json`). Now used as the schema for relay transfers (fetcher → Cloudflare KV → app), device-state (desktop → mobile), and backup files. Also includes wishlist support with ownership tracking.

## Schema Versioning

| Version | Changes | Compatibility |
|---------|---------|---------------|
| v2.0 | Initial unified format with `isOwned` field | Loader accepts, normalizes to v2.1 fields |
| v2.1 | New data model: `onWishlist`, `ownershipType` | — |
| v2.3 | Backup files include `relay` credentials and `isBackup` flag | Current version |

**Version check:** Loaders accept any `schemaVersion` starting with `"2."`. Breaking changes would require v3.x.

---

## Motivation

The original two-file system required users to manage separate library and collections files. The unified format consolidated these into a single schema, which is now used across all data paths: relay transfers, device-state sync, and backup files.

---

## Design Decisions

### Key Decisions Table

| Question | Decision | Rationale |
|----------|----------|-----------|
| File structure | Merge library + collections into single schema | Simpler data flow, prevents mismatch |
| Data transfer | Relay-only (Cloudflare KV) | No file picker needed; cross-domain encryption |
| Wishlist storage | In `books.items` with `onWishlist` flag | Same array, visual distinction only |
| Duplicate handling | ASIN-merge (update existing, preserve location) | Wishlist→Owned transition is seamless |
| Default folder for wishlist | Inbox | No special folder needed |
| Fetcher order | Order independent - all are additive | No "Library must be first" constraint |

---

## Schema v2.x Structure

```json
{
  "schemaVersion": "2.3",
  "books": {
    "fetchDate": "2025-12-24T10:30:00Z",
    "fetcherVersion": "1.2.0",
    "items": [
      {
        "asin": "B08XYZ1234",
        "onWishlist": false,
        "ownershipType": "owned",
        "title": "Example Book",
        "authors": "Author Name",
        "acquiredDate": "2024-06-15",
        "coverUrl": "https://...",
        "rating": 4.5,
        "pageCount": 320,
        "description": "..."
      },
      {
        "asin": "B09ABC5678",
        "onWishlist": true,
        "ownershipType": "wishlist",
        "title": "Wishlist Book",
        "authors": "Another Author",
        "addedToWishlist": "2025-12-24",
        "coverUrl": "https://...",
        "rating": 4.8,
        "targetPrice": 2.99
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
    "folders": [
      {
        "id": "folder-1",
        "name": "To Read",
        "items": ["B08XYZ1234", "B09ABC5678"],
        "children": []
      }
    ],
    "tagRegistry": {}
  }
}
```

### Section Breakdown

| Section | Purpose | Metadata |
|---------|---------|----------|
| `books` | All book items (owned + wishlist) | `fetchDate`, `fetcherVersion` |
| `collections` | Amazon's collection assignments | `fetchDate`, `fetcherVersion` |
| `organization` | User's folder tree and tag registry | None (user-managed) |

### Book Item Fields

#### Current Data Model (v4.19.0+)

| Field | Type | Description |
|-------|------|-------------|
| `asin` | string | Required - Amazon identifier |
| `onWishlist` | boolean | `true` if on wishlist (can be combined with owned) |
| `ownershipType` | enum | `'owned'` \| `'sample'` \| `'ku'` \| `'wishlist'` |
| `title` | string | Book title |
| `authors` | string | Author name(s) |
| `coverUrl` | string | Cover image URL |
| `rating` | number | Amazon rating |
| `acquiredDate` | string | When acquired (owned books) |
| `addedToWishlist` | string | When added to wishlist |
| `pageCount` | number | Page count |
| `description` | string | Book description |
| `targetPrice` | number | User's price goal |
| `currentPrice` | number | Current Amazon price |
| `listPrice` | number | List price |
| `priceAsOf` | string | When price was fetched |

#### Legacy Data Model (deprecated - remove after 2026-07-20)

| Field | Type | Description |
|-------|------|-------------|
| `isOwned` | boolean | `true` = owned, `false` = wishlist only |
| `isWishlist` | boolean | `true` if on wishlist |

**Migration:** The `normalizeBook()` function in readerwrangler.js converts legacy fields:
- `isOwned: true` → `ownershipType: 'owned'`
- `isOwned: false` → `ownershipType: 'wishlist'`
- `isWishlist: true` → `onWishlist: true`

Legacy fields are supported for backward compatibility until 2026-07-20.

---

## Fetcher Behavior

### Five Fetchers

1. **Library Fetcher** — Imports owned books from Amazon library page (incremental: stops at overlap with existing data)
2. **Collections Fetcher** — Imports Amazon collection assignments (full scan every run)
3. **Wishlist Fetcher** — Adds current product page book to library as wishlist item
4. **Series Page Fetcher** — Adds unowned books from a series page
5. **Author Bibliography Fetcher** — Adds Kindle books from an author page

All fetchers use relay-only data flow: download existing library from relay → merge new data → upload back to relay.

### Order Independence

Any fetcher can run first. All fetchers are **additive**:

```
User has: Empty relay
Runs: Wishlist Fetcher → adds 1 wishlist book
Runs: Library Fetcher → adds 100 owned books
Runs: Collections Fetcher → adds collection mappings
Result: 101 books with collections
```

### ASIN-Based Merge Logic

When adding a book:

```
if (books.items.find(b => b.asin === newBook.asin)) {
  // Book exists - update fields but preserve location
  // If wishlist book becomes owned: update ownershipType, add acquiredDate
} else {
  // New book - add to items array
}
```

### Wishlist → Owned Transition

When user purchases a wishlist book and re-imports library:

1. Library Fetcher finds book with matching ASIN
2. Updates `ownershipType: 'wishlist'` → `ownershipType: 'owned'`
3. `onWishlist` remains `true` (user can clear if desired)
4. Adds `acquiredDate` field
5. Book **stays in current folder** (doesn't move to Inbox)
6. Visual effect: "ungrays" in place

---

## App Behavior

### Storage Model

- **IndexedDB** — Auto-saves book data (invisible to user)
- **localStorage** — Organization state (folders, tags, explorer settings, relay credentials)
- **Cloudflare KV** — Relay transfer (fetcher → app), device-state (desktop → mobile)
- **Backup file** — User-triggered Save/Restore for portability and disaster recovery

Work is never lost — IndexedDB + localStorage auto-save. Relay keeps mobile in sync.

### File Menu

| Menu Item | Action |
|-----------|--------|
| 📊 Data Status | Shows books count, fetchDate, collections count |
| 📂 Restore Backup… | File picker → load backup JSON |
| 💾 Save Backup… | Download backup JSON (books + organization + relay credentials) |
| 📡 Import from Relay | Download latest library data from Cloudflare KV |
| 🔧 Relay Setup… | Configure relay credentials, generate bookmarklet |
| ⚠️ Reset App | Confirmation dialog → clear all local data |

### Wishlist Display

- Wishlist books (`ownershipType: 'wishlist'`) appear in Inbox initially
- User can drag to any folder
- Visual distinction:
  - Gray-out effect on cover/title
  - "Wishlist" badge overlay
  - Click opens Amazon purchase page (instead of detail modal)

---

## File Naming

| Scenario | Filename |
|----------|----------|
| Fetcher output | Uploaded to relay (no file saved) |
| App backup | `readerwrangler-backup-{date}.json` |

---

## Data Types: Library vs Backup

Two distinct data shapes use the same v2.x schema:

| Type | Created by | Delivery | Contains | Purpose |
|------|------------|----------|----------|---------|
| Library | Fetcher | Relay (encrypted KV) | books, collections | Transport fetched data into app |
| Backup | App (Save Backup) | JSON file download | books, collections, organization, relay credentials, `isBackup: true` | Save/restore app state |

### Detection Logic

- `isBackup: true` at root level → Backup file
- No `isBackup` field (or `false`) → Library data

### App Behavior

| Data Type | Behavior |
|-----------|----------|
| Backup (`isBackup: true`) | Prompt: "Restore backup? This will replace your current organization." → Full replace → sync to relay |
| Library (from relay) | Merge books into existing library, keep current organization → sync to relay (device-state) |

---

## Implementation History

- **Phase 1** ✅ Fetchers output v2.0 format
- **Phase 2** ✅ App reads/writes v2.0 format
- **Phase 3** ✅ Wishlist feature (v4.19.0) — onWishlist/ownershipType, visual styling, ASIN-merge
- **Phase 4** ✅ Relay-only data flow (v6.0.0) — all fetchers use encrypted relay, file picker removed
- **Phase 5** ✅ v2.3 schema — backup files include relay credentials, device-state for mobile sync

---

## Design Decisions (Resolved)

| Question | Resolution |
|----------|------------|
| Separate wishlist array vs. flag in items? | Flag in items (`onWishlist: true`) |
| Special wishlist folder? | No, goes to Inbox like all new books |
| Order of fetcher execution? | Order independent — all additive |
| Data transfer mechanism? | Relay-only (encrypted Cloudflare KV) — no file picker |

---

## Related Documents

- [MULTI-USER-DESIGN.md](MULTI-USER-DESIGN.md) - Future multi-user support
- [MULTI-STORE-ARCHITECTURE.md](MULTI-STORE-ARCHITECTURE.md) - Future non-Amazon support
