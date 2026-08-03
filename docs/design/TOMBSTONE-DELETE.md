# Tombstone delete (durable purge + smart resurrect)

_Moved verbatim from TODO.md during the 6.12.0 TODO restructure (2026-08-03). Backlog. **V:H / E:M.**_

---

"Empty Trash" writes a **lean tombstone `{asin, emptiedAt}`** (not the full record) that suppresses the book everywhere. On import, resurrect only if the incoming **purchase/add date > emptiedAt** — use `pastPurchase.lastOrderDate` / `addedToWishlist`, NOT the stale node `relationshipCreationDate`. Add a **"Purged" management view** (restore / forget). Fixes empty-trash→re-appear at the root.

Needs careful test cases: delete→refetch stays gone; delete→rebuy resurrects; wishlist re-add resurrects.

**Today's partial state:** a book left *in* Trash (not emptied) already stays hidden across re-fetches (the `isDeleted` OR-merge in `storage.js`). The gap this closes is **emptied** Trash → an owned book can reappear on the next fetch. (Interim workaround: leave unwanted books in Trash without emptying, or park them in an "Ignore" folder.)
