# Returned / expired borrows — filter & hide

_Design/scope. Drafted 2026-08-06 from a fetch sample. Not yet built — for review._

## Problem
Prime Reading, Kindle Unlimited, and library loans that have been **returned** still come back in Amazon's library response and clutter the library with books the user no longer has. Ron wants them gone (delete); others may want to keep/organize them — so we need flexibility, with a sensible default.

## The signal (reliable)
A returned/expired borrow is unambiguous in the fetch payload:
- `__typename: "CustomerLibraryBorrowedSingleBookNode"` — it's a borrow, not a purchase, **and**
- **`activeBorrow: false`** — the borrow is no longer active (returned/expired).

An *active* borrow has `activeBorrow: true`. So the rule: **a borrow node with `activeBorrow === false` is a returned borrow.** This covers Prime + Kindle Unlimited + library loans in one check, regardless of `relationshipSubType`.

Sample (returned Prime book):
```
"relationshipType": "ITEM_OWNER",
"relationshipSubType": ["Prime"],
"__typename": "CustomerLibraryBorrowedSingleBookNode",
"activeBorrow": false,
"pastPurchase": { "purchaseHistory": null }
```

## Approach — flag in the fetcher, decide in the app
1. **Fetcher (small):** when a borrow node has `activeBorrow === false`, flag the book — e.g. `ownershipType: 'returned'` (or a `returned: true` flag alongside the borrow subtype). Do **not** hard-drop it in the fetcher — that removes the keep-them option. The flag enables everything downstream.
2. **App:** add **"Returned"** to the ownership filter so the user can filter *for* them (to delete/organize) or exclude them. **Hidden by default** in All Books (like hidden books), with a toggle to show. Bulk select → move-to-folder for keepers.

## The key decision / pitfall
On the next fetch, Amazon keeps returning these nodes. Therefore:
- ❌ **Do NOT** route their removal through the **ASIN exclusion list** (the purge mechanism). That list is for *owned* books the user removed, and it would **block a future re-borrow** (re-borrowing flips `activeBorrow` back to `true`, but the excluded ASIN would be skipped). Bad.
- ✅ **Treat "returned" as a filterable category, hidden by default.** The fetcher flags them; the app filters them out unless you toggle "show returned." Re-borrow just works (flag flips, book reappears).

**Hidden-by-default effectively IS "deleted" for the user's purpose** — never seen, clutter gone — *without* the exclusion-list risk and *without* an actual delete step. Users who want to keep them toggle-show and file them into a folder.

## Phases
- **Phase 1** — fetcher flags `activeBorrow === false` borrows. Self-contained; unlocks the rest.
- **Phase 2** — app: "Returned" ownership filter, hidden-by-default (toggle), bulk move-to-folder. No permanent-delete/exclusion path for these.
- **Existing ghosts** — once Phase 1 flags them, check whether the import's reconciliation drops now-flagged returned borrows, or provide a one-time bulk filter-and-remove.

## Decision (2026-08-06)
- Ron agreed: **hidden-by-default over actually delete** — gets the clutter gone, re-borrow-safe. ✓
