# ReaderWrangler Data Schema

**Purpose:** Document all field mappings across transformation boundaries to prevent field-name-mismatch bugs.

**Last Updated:** 2026-03-04 (v6.0.0-alpha.43)

---

## Overview

Data flows through multiple transformations in ReaderWrangler:

```
Primary:  Amazon Data → Compress → Encrypt → Cloudflare KV → Decrypt → Decompress → Memory → IndexedDB
Backup:   Memory → Backup Export (JSON file) → Restore → Memory
Mobile:   Desktop Import → putDeviceState() → Cloudflare KV → Mobile App
```

Field names change at certain boundaries. This document maps those transformations to ensure data integrity.

---

## Book Object Schema

### Internal Representation (Memory)

**Location:** `books` array in React state
**Storage:** `localStorage` (STORAGE_KEY)

```javascript
{
  // Amazon-imported fields (overwritten on import)
  asin: "B00ABCDEFG",
  title: "Book Title",
  author: "Author Name",
  rating: 4.5,                    // Amazon rating (crowd-sourced)
  dateAdded: "2024-01-15",
  price: "$9.99",
  imageUrl: "https://...",
  productUrl: "https://...",
  series: "Series Name",
  seriesNum: "1",
  collections: ["Collection 1", "Collection 2"],
  owned: "Yes",                   // "Yes" or "No" (wishlist) - from Amazon fetcher
  ownershipType: "purchased",     // wishlist|purchased|sample|borrowed|prime|kindleUnlimited|koll|comixology|insideAmazon
  onWishlist: false,              // Boolean flag (true for wishlist books) - v5.0.4: Source filter checks both ownershipType and onWishlist
  purchaseDate: "2024-01-15",

  // User metadata (preserved across imports)
  userNote: "My personal note",   // ⚠️ Internal: userNote, Export: note
  tags: ["tag1", "tag2"],         // User-created tags
  priceTrigger: 4.99,             // Price alert threshold
  myRating: 3,                    // Personal rating (0-5, 0 = unrated) [v5.0.0-alpha.175.31]
  readStatus: "read",             // "read" | "unread" | "unknown"
  hidden: false,                  // User hidden state
  isDeal: false,                  // Computed: price < priceTrigger

  // User edit tracking (v5.4.7)
  userEdited: {                   // Per-field flags set when user edits via dialog or bulk edit
    title: true,                  // Only present if user edited this field
    author: true,
    series: true,
    seriesPosition: true
  },                              // undefined if no fields edited

  // Internal-only fields (not exported)
  id: "unique-id",                // Internal unique identifier
  normalizedTitle: "book title",  // Lowercase for sorting
  priceNum: 9.99                  // Numeric price for sorting
}
```

---

## Field Name Mappings

### ⚠️ CRITICAL: User Metadata Field Names

These fields have **different names** in different contexts:

| Field | Memory (books[]) | localStorage | Export (backup) | Import (restore) |
|-------|-----------------|--------------|-----------------|------------------|
| **User Note** | `userNote` | `userNote` | `note` | `note` → `userNote` |
| **Tags** | `tags` | `tags` | `tags` | `tags` |
| **Price Alert** | `priceTrigger` | `priceTrigger` | `priceTrigger` | `priceTrigger` |
| **My Rating** | `myRating` | `myRating` | `myRating` | `myRating` |
| **User Edited** | `userEdited` | `userEdited` | `userEdited` | `userEdited` |

**Why the inconsistency?**
- **Internal:** `userNote` distinguishes from potential Amazon `note` field
- **Export:** `note` is more user-friendly in JSON backup files
- **Import:** Adapter maps `note` → `userNote` during restore

---

## Transformation Boundaries

### 1. Memory → localStorage (Auto-save)

**Location:** `readerwrangler.js` ~line 1281
**Frequency:** On every state change (debounced)
**Mapping:** 1:1 (no transformation)

```javascript
const state = {
  organization: {
    folders,          // v5.0.0 - Book Explorer folders
    dataSource,
    blankImageBooks: Array.from(blankImageBooks),
    hiddenInstances: Array.from(hiddenInstances),
    tagRegistry       // v4.27.0 - Tag registry
  },
  lastSyncTime,
  savedAt: Date.now()
};
localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
```

**Note:** Books array is NOT stored in localStorage (too large). Only organization state. The `columns` field was removed in v5.4.0 (Column App replaced by Book Explorer).

---

### 2. Memory → IndexedDB (Book Storage)

**Location:** `storage.js` - `saveBooksToIndexedDB()`
**Mapping:** 1:1 (no transformation)

```javascript
await tx.objectStore('books').put({
  id: 'books',
  data: books,
  timestamp: Date.now()
});
```

---

### 3. Memory → Save Backup

**Location:** `readerwrangler.js` ~line 2633 (exportBackup)
**Mapping:** Field name changes for user metadata

```javascript
const bookItems = books.map(book => ({
  asin: book.asin,
  title: book.title,
  author: book.author,
  // ... other Amazon fields ...

  // ⚠️ User metadata - Field name transformation
  tags: book.tags,                    // ✓ Same name
  note: book.userNote,                // ⚠️ userNote → note
  priceTrigger: book.priceTrigger,    // ✓ Same name
  myRating: book.myRating,            // ✓ Same name [v5.0.0-alpha.175.31]
  userEdited: book.userEdited         // ✓ Same name [v5.4.7] - undefined if no edits
}));
```

**Exported Structure:**
```json
{
  "version": "5.0.0",
  "exportDate": "2024-01-15T10:30:00Z",
  "library": {
    "bookItems": [ /* books with note field */ ],
    "organization": {
      "columns": [ /* ... */ ],
      "folders": [ /* ... */ ],
      "tagRegistry": { /* tag definitions */ }
    }
  }
}
```

---

### 4. Restore Backup → Memory

**Location:** `readerwrangler.js` ~line 3027 (importBackup)
**Mapping:** Reverse transformation (note → userNote)

```javascript
const importedBooks = backupData.library.bookItems.map(item => ({
  ...item,
  id: item.asin || generateId(),

  // ⚠️ User metadata - Field name transformation
  tags: item.tags,                    // ✓ Same name
  userNote: item.note,                // ⚠️ note → userNote
  priceTrigger: item.priceTrigger,    // ✓ Same name
  myRating: item.myRating || 0,       // ✓ Same name, default to 0 [v5.0.0-alpha.175.31]
  userEdited: item.userEdited         // ✓ Same name [v5.4.7] - restored from backup
}));
```

---

### 5. Amazon Library Import → Memory

**Location:** `readerwrangler.js` - `importLibrary()`
**Mapping:** Amazon JSON → Internal format

**User metadata preservation** (storage.js merge logic):
```javascript
const previousBook = existingByAsin.get(book.asin);

// v5.4.7 - Distinguish Amazon import vs backup restore
const isBackupData = !!book.userEdited;
const ue = isBackupData ? {} : (previousBook.userEdited || {});

const mergedBook = {
  ...book,  // Amazon data (overwrites)

  // v5.4.7 - User-edited fields: preserved from IndexedDB during Amazon imports
  title: ue.title ? previousBook.title : book.title,
  author: ue.author ? previousBook.author : book.author,
  series: ue.series ? previousBook.series : book.series,
  seriesPosition: ue.seriesPosition ? previousBook.seriesPosition : book.seriesPosition,

  // User metadata: always preserved from existing book
  tags: book.tags ?? previousBook.tags,
  note: book.note ?? previousBook.note,
  priceTrigger: book.priceTrigger ?? previousBook.priceTrigger,
  myRating: book.myRating ?? previousBook.myRating,
  hidden: book.hidden ?? previousBook.hidden,

  // Preserve flags: backup restores its own, Amazon preserves existing
  userEdited: isBackupData ? book.userEdited : ue
};
```

**Import type detection:**
- `book.userEdited` present → **backup restore** → use backup values as-is, restore its flags
- `book.userEdited` absent → **Amazon import** → check `previousBook.userEdited`, preserve flagged fields

---

## Tag Registry Schema

**Location:** React state `tagRegistry`
**Storage:** localStorage, backup export/import

```javascript
{
  "tagId": {
    name: "Tag Name",
    color: "#3b82f6",  // Optional: tag color
    // count is COMPUTED on-the-fly via getTagCount(tagId)
    // NEVER store count (becomes stale)
  }
}
```

**Important:** Tag counts are **computed**, not stored:
```javascript
const getTagCount = (tagId) => {
  return books.filter(book => book.tags?.includes(tagId)).length;
};
```

---

## localStorage Keys

All persisted UI settings and organization state. Defined in `uiHelpers.js`.

| Key | Value Type | Description |
|-----|-----------|-------------|
| `readerwrangler-state` | JSON object | Organization state: folders, blankImageBooks, hiddenInstances, tagRegistry, dataSource, lastSyncTime |
| `readerwrangler-settings` | JSON object | App settings (legacy, minimal usage) |
| `readerwrangler-explorer` | JSON object | Explorer view settings: selectedFolderId, explorerView, explorerSort, explorerCoverCols (px width), leftPaneWidth, folderSortSettings, visibleColumns, columnWidths, columnOrder, explorerGroupOn |
| `readerwrangler-folders` | JSON object | Folder tree structure (v5.0.0) |
| `readerwrangler-filters` | JSON object | Active filter state |
| `readerwrangler-wizard` | JSON object | Wizard settings (v5.1.0) |
| `readerwrangler-search-history` | JSON array | Recent search terms (v5.4.9) |
| `readerwrangler-theme` | string | Theme preference: `auto` \| `light` \| `dark` \| `hc-light` \| `hc-dark` (v5.5.7). Read by flash-prevention script in HTML before app loads. |
| `readerwrangler-relay` | JSON object | Relay credentials: `{ channelId, passphrase }` (v6.0.0). Included in backup exports. |
| `readerwrangler-enriched-cache` | JSON object | Enrichment cache |
| `readerwrangler-status` | JSON object | Library status metadata |

**Note:** Books are stored in **IndexedDB** (too large for localStorage). Organization state references book IDs.

**Theme storage:** Only the theme name is persisted, not individual CSS variable values. The name maps to a CSS `[data-theme="..."]` block that defines all variables. This keeps the storage simple and avoids stale variable values if palettes are tuned in future versions.

---

## Column Configuration Schema

**Location:** `readerwrangler.js` ~line 6 (COLUMN_CONFIG)
**Note:** Static configuration, not user data

```javascript
const COLUMN_CONFIG = {
  title: { label: 'Name', sortKey: 'title', defaultDir: 'asc', cssVar: '--col-title', alwaysVisible: true },
  author: { label: 'Author', sortKey: 'author', defaultDir: 'asc', cssVar: '--col-author' },
  rating: { label: 'Rating', sortKey: 'rating', defaultDir: 'asc', cssVar: '--col-rating' },  // Amazon rating
  myRating: { label: 'My Rating', sortKey: 'myRating', defaultDir: 'desc', cssVar: '--col-myRating' },  // Personal rating
  // ... other columns ...
};
```

---

## Data Flow Diagrams

### Complete Import Cycle (Relay)

```
Bookmarklet fetches from Amazon
  ↓
Compress + encrypt → upload chunks + manifest to Cloudflare KV (TTL: 24h)
  ↓
App: File → Import from Relay (or banner notification)
  ↓
Download chunks → decrypt → decompress → JSON
  ↓
Merge with IndexedDB (preserveUserData=true):
  - Always preserve: userNote, tags, priceTrigger, myRating, hidden
  - Check userEdited flags: preserve title/author/series/seriesPosition if flagged
  ↓
Update books[] state (in memory)
  ↓
Save to IndexedDB + auto-save organization to localStorage
  ↓
putDeviceState() → encrypt + compress → upload to KV (TTL: 90 days)
  (makes library available to mobile)
```

### Complete Backup/Restore Cycle

```
User: File → Save Backup
  ↓
Read books[] from memory
  ↓
Transform: userNote → note, include userEdited flags
  ↓
Create backup JSON (includes relay credentials if configured)
  ↓
Download backup.json

─────────────────────────

User: File → Restore Backup
  ↓
Read backup.json (has userEdited field on edited books)
  ↓
Transform: note → userNote, restore userEdited
  ↓
Merge: backup has userEdited → use backup values as-is (no previousBook override)
  ↓
Restore books[] state (with userEdited flags for future Amazon imports)
  ↓
Restore tagRegistry state
  ↓
Save to IndexedDB + auto-save organization to localStorage
  ↓
If relay configured: putDeviceState() → sync to relay
```

---

## Common Pitfalls

### ❌ Pitfall 1: Field Name Mismatch

**Problem:**
```javascript
// Export
note: book.note  // ❌ WRONG - book.note doesn't exist

// Import
note: item.note  // ❌ WRONG - creates book.note instead of book.userNote
```

**Solution:**
```javascript
// Export
note: book.userNote  // ✓ Correct

// Import
userNote: item.note  // ✓ Correct
```

---

### ❌ Pitfall 2: Missing User Metadata in Export

**Problem:**
```javascript
const bookItems = books.map(book => ({
  asin: book.asin,
  title: book.title
  // ❌ Missing: tags, note, priceTrigger, myRating
}));
```

**Solution:**
Always export ALL user metadata:
```javascript
const bookItems = books.map(book => ({
  // Amazon data
  asin: book.asin,
  title: book.title,
  // ...

  // User metadata (REQUIRED)
  tags: book.tags,
  note: book.userNote,
  priceTrigger: book.priceTrigger,
  myRating: book.myRating
}));
```

---

### ❌ Pitfall 3: Storing Computed Values

**Problem:**
```javascript
tagRegistry: {
  "tag-id": {
    name: "Tag Name",
    count: 5  // ❌ WRONG - becomes stale
  }
}
```

**Solution:**
Compute counts on-the-fly:
```javascript
const getTagCount = (tagId) => {
  return books.filter(book => book.tags?.includes(tagId)).length;
};
```

---

### ❌ Pitfall 4: Missing tagRegistry in Backup

**Problem:**
```javascript
const backupData = {
  library: {
    bookItems: [...],
    organization: {
      columns: [...],
      folders: [...]
      // ❌ Missing: tagRegistry
    }
  }
};
```

**Solution:**
Always include tagRegistry:
```javascript
organization: {
  columns,
  folders,
  tagRegistry  // ✓ Required for tag definitions
}
```

---

## Relay Data Schemas (v6.0.0)

### KV Storage Summary

| KV Key | Content | Encrypted | TTL | Written By | Read By |
|--------|---------|-----------|-----|------------|---------|
| `relay:{cid}:manifest` | Upload metadata (timestamp, chunk count) | No | 24 hours | Fetcher | App (checkStatus) |
| `relay:{cid}:chunk:{n}` | Fetched library data (chunked) | Yes (AES-256-GCM) | 24 hours | Fetcher | App (download/import) |
| `relay:{cid}:exclusions` | Exclusion list (deleted ASINs) | Yes (AES-256-GCM) | 90 days | App | Fetcher |
| `relay:{cid}:device-state` | Full library + organization snapshot | Yes (AES-256-GCM) | 90 days | App | Mobile |

**TTL behavior:** TTL resets on every write. Active users never expire. Abandoned channels auto-clean after 90 days.

### Relay Credentials (localStorage)

**Key:** `readerwrangler-relay`

```json
{
  "channelId": "a1b2c3d4-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
  "passphrase": "ABCDEFghijklmnopQRSTuvwxyz012345"
}
```

Generated by the app's Relay Setup modal. Baked into bookmarklet code as string literals. Included in backup exports.

### Relay Manifest (Cloudflare KV)

**KV key:** `relay:{channelId}:manifest` (TTL: 24h)
**Format:** Plaintext JSON (not encrypted — app reads bookCount/timestamp for banner UI)

```json
{
  "channelId": "a1b2c3d4-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
  "chunkCount": 1,
  "totalBytes": 43827200,
  "compressedBytes": 6291456,
  "encryptedBytes": 6291480,
  "timestamp": "2026-02-27T12:00:00Z",
  "checksum": "sha256:abc123...",
  "encrypted": true,
  "bookCount": 2347
}
```

### Relay Chunks (Cloudflare KV)

**KV key:** `relay:{channelId}:chunk:{n}` (TTL: 24h)
**Format:** Binary (encrypted + compressed)

Data pipeline: JSON string → gzip compress → AES-256-GCM encrypt → chunk at 20 MB → upload

Reverse pipeline: download chunks → reassemble → verify SHA-256 checksum → decrypt → decompress → JSON string

### Encryption Details

- **Key derivation:** PBKDF2 with SHA-256, 100,000 iterations
- **Salt:** `SHA-256(channelId).slice(0, 16)` — deterministic, unique per user
- **Cipher:** AES-256-GCM with random 12-byte IV
- **Packed format:** `[12-byte IV][ciphertext]` (IV prepended to ciphertext)

### Exclusion List (Cloudflare KV, Phase 3)

**KV key:** `relay:{channelId}:exclusions` (TTL: 90 days, resets on write)
**Format:** Encrypted JSON

```json
{
  "deletedAsins": ["B001ABC123", "B002DEF456"],
  "deletedAt": {
    "B001ABC123": "2026-02-20T14:30:00Z",
    "B002DEF456": "2026-02-18T09:15:00Z"
  }
}
```

### Device State (Cloudflare KV, Phase 2)

**KV key:** `relay:{channelId}:device-state` (TTL: 90 days, resets on write)
**Format:** Encrypted + compressed (same pipeline as library chunks)

Contains the full library snapshot pushed by desktop after each successful import, consumed by mobile on app open.

### Backup Export with Relay Credentials

When relay is configured, backup exports include a `relay` field at the top level:

```json
{
  "schemaVersion": "2.3",
  "isBackup": true,
  "books": { ... },
  "organization": { ... },
  "relay": {
    "channelId": "a1b2c3d4-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
    "passphrase": "ABCDEFghijklmnopQRSTuvwxyz012345"
  }
}
```

On backup import, relay credentials are restored to localStorage and the user is reminded to reinstall the bookmarklet.

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 6.0.0-alpha.43 | 2026-03-04 | Added KV storage summary table with TTLs; device-state and exclusions changed from persistent to 90-day TTL; updated data flow diagrams for relay-only (removed file picker fallback); renamed Import/Export to Save/Restore Backup; added putDeviceState to import and restore flows |
| 6.0.0 | 2026-02-28 | Added relay data schemas (credentials, manifest, chunks, encryption, exclusion list, device state); added relay key to localStorage keys table; backup export includes relay credentials |
| 5.5.8 | 2026-02-16 | Added localStorage keys documentation; theme preference key; removed outdated columns references (v5.4.0); added explorerCoverCols migration note (px width) |
| 5.4.7 | 2026-02-12 | Added userEdited field for per-field edit tracking; Amazon imports respect flags; backup export/import preserves flags |
| 5.0.4 | 2026-02-05 | Added 'wishlist' to ownershipType enum; documented onWishlist field; Source filter checks both fields for backward compatibility |
| 5.0.0-alpha.175.31 | 2026-02-04 | Added myRating field (Phase 4.5) |
| 5.0.0-alpha.175.20 | 2026-02-04 | Fixed note/userNote field name mismatch |
| 5.0.0-alpha.175.17 | 2026-02-04 | Added tagRegistry to backup/restore |
| 4.27.0 | 2025-XX-XX | Added tags and tagRegistry |
| 4.22.0 | 2025-XX-XX | Added priceTrigger field |

---

## Testing Checklist

When adding new user metadata fields, verify:

- [ ] Field added to book object in memory
- [ ] Field included in backup export (check field name mapping!)
- [ ] Field restored from backup import (check reverse mapping!)
- [ ] Field preserved during Amazon library import
- [ ] Field included in auto-save to localStorage
- [ ] Field included in IndexedDB storage
- [ ] Export → Reset → Import cycle preserves field
- [ ] If field is user-editable: set `userEdited` flag on save, check flag in merge
- [ ] Amazon import respects `userEdited` flags (preserves user edits)
- [ ] Backup import restores values as-is (ignores existing `userEdited` flags)
- [ ] Column config added (if sortable/displayable)
- [ ] Filter logic added (if filterable)

---

## References

- **Implementation Checklist:** [MENUBAR-TOOLBAR-IMPLEMENTATION.md](MENUBAR-TOOLBAR-IMPLEMENTATION.md)
- **Session Log:** [BOOK-EXPLORER-SESSION-LOG.md](BOOK-EXPLORER-SESSION-LOG.md)
- **Main Code:** `readerwrangler.js`
- **Storage Module:** `storage.js`
