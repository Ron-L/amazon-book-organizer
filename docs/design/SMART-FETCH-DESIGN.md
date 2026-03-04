# Smart Fetch: Review Gap-Fill & Orphan Detection

**Date:** 2026-03-04
**Status:** Approved design
**Supersedes:** Orphan detection section of ORPHAN-DETECTION-RECYCLE-BIN.md (loadId approach replaced by fetcher-side background scan)

---

## Summary

Extends the library fetcher with two capabilities:

1. **Review gap-fill** — Enrich existing books that are missing reviews (same API call as description gap-fill, zero extra network requests)
2. **Orphan detection** — Background full-library scan after the normal fetch completes, identifying books no longer in the user's Amazon account

Both features use the existing relay as the data conduit. No new relay endpoints or data channels needed.

---

## Motivation

### Review Gap-Fill

The enrichment API (`getProducts`) already returns both descriptions and reviews. Today the fetcher gap-fills missing descriptions but ignores missing reviews. Books that failed enrichment on a prior run have `topReviews: []` permanently. Extending the filter to include missing reviews costs zero extra API calls.

### Orphan Detection

Books leave Amazon accounts for many reasons: returns, KU/Prime expiry, family sharing revocation, sample cleanup. The app retains these books in IndexedDB with no indication they're gone from Amazon. Users have no way to identify or clean up orphaned books.

The relay-based architecture enables a new approach: the fetcher runs a background scan on the Amazon page (which has API access) and flags orphans directly in the library data, then re-uploads to relay. The app picks them up on next Import from Relay.

---

## Design

### 1. Review Gap-Fill

**Change:** Extend the Phase 2 enrichment filter in `amazon-library-fetcher.js`.

```javascript
// Today (description gap-fill only):
const booksNeedingEnrichment = existingBooks.filter(b => !b.description);

// New (description + reviews):
const booksNeedingEnrichment = existingBooks.filter(b =>
    !b.description || !b.topReviews || b.topReviews.length === 0
);
```

Same `getProducts` API call. Same batch size (30 ASINs). No new network requests — reviews are already in the response, just not being used for gap-fill today.

### 2. Orphan Detection

#### Fetcher-Side Background Scan

After the normal fetch completes (Step 7: merge + upload), the fetcher continues running a full-library scan in the background:

1. Paginate through the entire Amazon library API (same `ccGetCustomerLibraryBooks` query used in Phase 1)
2. Build a Set of all ASINs currently in the Amazon account
3. Compare against the library that was just uploaded to relay
4. Any book in the library but NOT in Amazon = orphan candidate
5. Mark orphans with status fields (see Data Model below)
6. Re-upload the updated library to relay

#### Which Books Get Flagged

**All ownership types** are checked for orphan status. The `ownershipType` field gives users context for why a book disappeared:

| Ownership Type | Orphan Reason | Expected? |
|---------------|---------------|-----------|
| `owned` (Purchase) | Return, publisher revocation | Unexpected — user should review |
| `ku` (Kindle Unlimited) | Subscription expired, title removed from KU | Expected rotation |
| `prime` (Prime Reading) | Rotated off Prime list | Expected rotation |
| `sample` | Replaced by purchase, expired | Usually expected |
| `sharing` (Family Library) | Sharing revoked | Depends on situation |

The app displays orphans with their ownership type so users can make informed decisions.

#### Scan Scope

The background scan only needs ASINs — it doesn't need to re-enrich books. A minimal Phase 1-style paginated query collecting just ASINs is sufficient. The same `selectionCriteria` and `BOOK_BINDINGS` filter used in the normal fetch apply here.

#### Partial Results on Failure

If the scan fails partway through (API error, network issue, tab closed):

- Upload whatever data we have with `orphanScanComplete: false` and `orphanScanProgress: '42/77'`
- Books checked so far get `orphanStatus: 'verified'` or `'orphan'`
- Books not yet checked remain `orphanStatus: null`
- The app can show "Partial orphan scan (42 of ~77 pages)" so the user knows the data is incomplete
- Next fetch run will re-scan from scratch (orphan status is transient per scan)

#### Exclusion List Integration

Books on the exclusion list (future Trash Bin feature) should be excluded from orphan detection. They're intentionally removed — flagging them as orphans would be confusing.

```javascript
const exclusions = await RWRelay.getExclusions(); // may be empty/null today
const excludedAsins = new Set(exclusions || []);

// During orphan comparison:
const orphans = existingBooks.filter(b =>
    !amazonAsins.has(b.asin) &&
    !excludedAsins.has(b.asin) &&
    !b.onWishlist  // Wishlist-only books aren't in Amazon library scan
);
```

### 3. Unified Progress Dialog

The fetcher's progress dialog is a single persistent dialog throughout the entire operation. No separate dialogs — one dialog, three states.

#### State 1: Library Fetch In Progress

```
┌─────────────────────────────────────────────┐
│  ReaderWrangler                             │
│                                             │
│  Fetching library...                        │
│  ████████████░░░░░░  Page 12 of ~77        │
│                                             │
└─────────────────────────────────────────────┘
```

No OK button. User waits or switches tabs.

#### State 2: Fetch Done, Orphan Scan Running

```
┌─────────────────────────────────────────────┐
│  ReaderWrangler                             │
│                                             │
│  ✅ Library updated: 2371 books (5 new)     │
│                                             │
│  Scanning for orphans...                    │
│  ████████░░░░░░░░░░  Page 42 of ~77        │
│                                             │
│  Leave this tab open to complete the scan.  │
└─────────────────────────────────────────────┘
```

No OK button. Library result shown at top, orphan scan progress below.

#### State 3a: Done — Orphans Found

```
┌─────────────────────────────────────────────┐
│  ReaderWrangler                             │
│                                             │
│  ✅ Library updated: 2371 books (5 new)     │
│                                             │
│  ✅ Orphan scan: 3 books no longer in your  │
│  Amazon library (1 Prime, 2 Purchased).     │
│  Import from Relay in the app to review.    │
│                                             │
│                                       [OK]  │
└─────────────────────────────────────────────┘
```

#### State 3b: Done — No Orphans

```
┌─────────────────────────────────────────────┐
│  ReaderWrangler                             │
│                                             │
│  ✅ Library updated: 2371 books (5 new)     │
│                                             │
│  ✅ All books verified — no orphans.        │
│                                             │
│                                       [OK]  │
└─────────────────────────────────────────────┘
```

#### State 3c: Orphan Scan Failed/Partial

```
┌─────────────────────────────────────────────┐
│  ReaderWrangler                             │
│                                             │
│  ✅ Library updated: 2371 books (5 new)     │
│                                             │
│  ⚠️ Orphan scan incomplete (42 of ~77      │
│  pages). Partial results uploaded.          │
│  Import from Relay to review what was       │
│  found so far.                              │
│                                             │
│                                       [OK]  │
└─────────────────────────────────────────────┘
```

OK button only appears when everything is done (success, failure, or no orphans).

---

## Data Model

### Book Fields (added to schema)

```javascript
{
    // Existing fields...

    // Orphan detection (new)
    orphanStatus: 'verified' | 'orphan' | null,  // null = not yet scanned
    orphanCheckedDate: '2026-03-04T...',          // when this book was last checked
}
```

### Library Metadata (added to books section)

```javascript
{
    schemaVersion: "2.1",
    books: {
        fetchDate: "...",
        fetcherVersion: "...",
        totalBooks: 2371,
        orphanScanComplete: true,        // false if scan was interrupted
        orphanScanProgress: '77/77',     // pages scanned / estimated total
        orphanScanDate: '2026-03-04T...', // when scan ran
        orphanCount: 3,                  // summary count for quick display
        items: [...]
    }
}
```

### App-Side Display

After Import from Relay, the app can:

- Filter by `orphanStatus === 'orphan'` (new filter option or virtual folder)
- Show orphan badge/indicator on affected books
- Display ownership type context ("This Prime Reading book is no longer available")
- User decides: delete (move to Trash when implemented), keep, move to folder, tag, etc.

---

## Fetch Lifecycle (Updated)

```
Step 0: Download existing library from relay + exclusion list
Step 1: CSRF token
Step 2: API validation
Step 3: Phase 1 — Fetch new books (paginated, stop at overlap)
Step 4: Phase 2 — Enrich new books + gap-fill (descriptions + reviews)
Step 5: Phase 3 — Tags/genres (missing, capped 10/run)
Step 6: Phase 4 — Prices (all books)
Step 7: Merge + upload to relay
         → Dialog: "✅ Library updated: 2371 books (5 new)"
Step 8: Phase 5 — Background orphan scan (full library scan)
         → Dialog: "Scanning for orphans... Page X of ~Y"
Step 9: Flag orphans + re-upload to relay
         → Dialog: final state (orphans found / none / partial)
```

---

## Implementation Plan

### Phase 1: Review Gap-Fill (~30 min)

- Extend Phase 2 enrichment filter to include missing reviews
- No new API calls, no schema changes
- Test: run fetcher on library with books missing reviews, verify they get filled

### Phase 2: Orphan Detection (~4-6 hours)

1. **Fetcher changes** (`amazon-library-fetcher.js`):
   - Add Step 8: background full-scan after upload
   - Build ASIN set from scan results
   - Compare against existing library, flag orphans
   - Re-upload with orphan flags
   - Handle partial failure gracefully

2. **Progress dialog changes** (`amazon-library-fetcher.js`):
   - Extend existing progress UI to show State 2 (fetch done + scan running)
   - Add progress bar for orphan scan pages
   - Final state shows orphan count or "no orphans"

3. **App-side display** (`readerwrangler.js`):
   - Add orphan filter option (or badge in book list)
   - Recognize `orphanStatus` field from imported data
   - Display ownership type context for orphaned books

### Phase 3: Exclusion List Wiring (~1 hour, after Trash Bin)

- Fetcher calls `getExclusions()` in Step 0
- Excluded ASINs skipped during fetch and orphan scan
- Depends on Trash Bin feature to populate the exclusion list

---

## What This Design Does NOT Cover

These remain separate work items:

| Item | Location | Notes |
|------|----------|-------|
| Wishlist-add toast feedback | `amazon-wishlist-fetcher.js` | "Already on wishlist" / "Already in library" — see WISHLIST-DEDUP.md |
| Wishlist dedup Layers 2 & 3 | `readerwrangler.js` (app) | Per-folder right-click, Tools menu global cleanup — see WISHLIST-DEDUP.md |
| Trash Bin | `readerwrangler.js` (app) | Two-stage delete lifecycle, exclusion list push — see ORPHAN-DETECTION-RECYCLE-BIN.md (Recycle Bin sections still valid) |

---

## Related Documents

- [ORPHAN-DETECTION-RECYCLE-BIN.md](ORPHAN-DETECTION-RECYCLE-BIN.md) — Recycle Bin design (still valid). Orphan detection section superseded by this document.
- [WISHLIST-DEDUP.md](WISHLIST-DEDUP.md) — Wishlist dedup and toast feedback (separate work)
- [DELETE-BOOKS-DESIGN.md](DELETE-BOOKS-DESIGN.md) — Delete books problem statement and design
- [ARCHITECTURE.md](ARCHITECTURE.md) — Overall architecture and relay design
- [SCHEMA-V2-UNIFIED-FILE.md](SCHEMA-V2-UNIFIED-FILE.md) — Schema v2.x format
