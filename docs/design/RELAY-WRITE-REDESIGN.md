# Relay write redesign (atomic write + app-owned key + wishlist-delta)

_Moved verbatim from TODO.md during the 6.12.0 TODO restructure (2026-08-03). Backlog. **V:H / E:M.**_

---

Unifies atomic-write + app-owned-key + wishlist-delta — build once, coherently.

**Root problem:** relay corruption is a torn **multi-key** write (chunks + manifest left inconsistent when a write is interrupted — e.g. window closed mid Add-to-Wishlist; CRC then fails on read).

Three composing layers:

1. **Wishlist adds → append-only delta, not full-library RMW.** The bookmarklet writes a tiny `wishlist-pending` key (`[{asin,title,addedAt}]`): a single **atomic** KV put (no torn chunks), cheap (1 write vs a full multi-chunk rewrite), and it never touches the library key (kills the bookmarklet-vs-app clobber race). The **app folds the delta into the library on Import**, then clears it.
2. **App's library write → copy-on-write commit pointer.** New chunks under **versioned keys**, flip the **manifest LAST** as the single atomic commit (a single KV put IS atomic). Interrupted-before-commit → last-good generation fully intact; **keep the prior generation for auto-rollback** if a write verifies bad. This makes the remaining heavy write (now only in the app) crash-safe if WR is closed mid-fold.
3. **Lossless ordering:** fold → write library (atomic commit) → verify → **only then clear the delta.** If WR closes mid-fold, the delta survives and **re-applies next import** (idempotent) — no lost adds, library untouched. Net: **no corruption window at any layer.**

Also: on a CRC read failure, surface *"relay corrupt — run Download Library to rebuild"* instead of a raw error. Debounce on the bookmarklet (localStorage queue, flush on click/`pagehide`) is a cheap, now-safe add-on once writes are tiny/atomic.

**Why app-owned data forces this:** the fetcher regenerates only OWNED books — it does **not** re-fetch wishlists (Ron's 273 survived only via local copy + orphan-preservation in `storage.js`); folders, Book Lists, tags, notes, read-status are likewise the relay's sole durable copy besides local, so they especially warrant the versioned/atomic treatment.

(Tombstone delete — see TOMBSTONE-DELETE.md — is a separate concern. Relay delta-append — see RELAY-DELTA.md — is the incremental-sync optimization that builds on this.)
