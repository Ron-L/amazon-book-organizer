# Relay delta-append for cheap incremental sync (OPTIONAL)

_Moved verbatim from TODO.md during the 6.12.0 TODO restructure (2026-08-03). Backlog, OPTIONAL. **MEDIUM / HIGH.** Builds on RELAY-WRITE-REDESIGN.md._

---

- Today any relay-library change (e.g. the add-to-wishlist bookmarklet) does a full client-side read-modify-write: download + decrypt the ENTIRE encrypted library, append, re-encrypt + upload. ~7s for a ~2,600-book library; cost ∝ library size per change.
- Server-side append is IMPOSSIBLE by design: the relay is end-to-end encrypted (`relay-crypto.js`); the Cloudflare worker only sees ciphertext and can't decrypt to append.
- Delta model (E2E-compatible): upload each change as its own small encrypted item; clients (app + mobile) read base + deltas and merge by ASIN (last-write-wins). Cost ∝ 1 book per change.
- Costs/complexity: relay worker must store/list multiple items per channel; merge logic in BOTH app and mobile; periodic compaction (fold deltas back into base = an occasional full upload) so deltas don't grow unbounded; the library fetcher must understand/compact deltas too.
- OPTIONAL: 7s is bearable today. Revisit when libraries get large, or alongside the precompile/perf work.
