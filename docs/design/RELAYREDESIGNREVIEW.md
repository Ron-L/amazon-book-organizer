# External Review — Relay Write Redesign (2026-08-13)

**Reviewer:** Claude Fable 5 (external, adversarial pass as requested)
**Input:** `RELAYWRITEREDESIGN.md` only, plus verification of Cloudflare KV platform limits against current docs. I did not have the codebase; `[verified in code]` claims are taken at face value, and I focused fire on the `[proposed]` sections as the doc requested.

**Overall verdict up front:** the core architecture is right. The diagnosis (torn multi-key write with in-place overwrites and no fallback) is correct, and the prescription — unique-generation keys, manifest-written-last as the atomic commit, keep-2, newest-complete-wins — is the standard, correct construction for atomic multi-key publication on an eventually-consistent store with no CAS. Unique gen ids over shared counters is correctly identified as load-bearing. The mailbox model and the clearing invariant are genuinely elegant. But there are two findings I would call **correctness-critical** — one breaks the watermark under realistic timing, one falsifies the "no lost committed data" claim for a whole class of writers — plus several tightness gaps and some machinery I'd cut. Details below, ranked.

---

## CRITICAL findings

### C1. The scalar watermark loses whole runs when runs complete out of order

Section 8/9b: watermark = "this generation includes inputs **through run R**"; readers "ignore inputs **≤ watermark**"; merges advance it to "the **highest runId absorbed**."

That semantic is only sound if runs commit in runId order. They don't. RunIds are assigned at run **start** (letters are keyed `mail:{runId}:{seq}` from the first letter), but runs become mergeable at run-manifest time — and the doc itself celebrates long-running parallel runs ("even two full fetches — just create two runIds; both complete independently").

Concrete failure:

1. Full-library fetch starts → runId 100. Detail-page enrichment of a large library runs for many minutes (the doc says fetches can be hour-scale operations).
2. Mid-fetch, the user hits the wishlist bookmarklet → runId 105, single letter, completes instantly.
3. The app (or any writer) canonical-merges. Complete runs above watermark: {105}. It absorbs 105 and sets **watermark = 105**.
4. Run 100 completes. 100 ≤ 105 → **every reader ignores it forever**. The letters sit invisible until TTL, then are silently deleted. An entire library fetch — potentially including RW-only-recoverable enrichment the user expects to be relayed — is discarded with no error anywhere.

Note this needs no concurrency at all in step 3 — a perfectly serial, well-behaved merge does it. And "advance watermark only past contiguous complete runs" doesn't fix it either, because a genuinely crashed run would then block the watermark forever, and KV's eventual consistency means a merger can see run 105's manifest before run 100's even when 100 committed first (no cross-key ordering guarantees). **Any scalar high-water mark is unsound here.**

**Fix:** make absorption explicit, not ordinal. The canonical manifest carries the **set of absorbed runIds** (or absorbed runs since the letter-TTL horizon — bounded and small, since old entries can be dropped once their letters have provably expired). The merge rule becomes "absorb every complete run not in the absorbed set." This also composes cleanly with concurrent merges: the losing generation's absorbed-set is simply discarded, and its extra runs remain un-absorbed — exactly the property Section 8 wants. Add a staleness rule for incomplete runs (ignore/GC runs incomplete for > X) so crashed runs don't accumulate.

### C2. "No corruption, no lost committed data" is false for app-direct canonical writes — and the doc has three of them

Section 8's concurrency argument (two concurrent writers → disjoint generations → newest wins → "the other is orphaned and GC'd — no lost committed data") holds **only when the losing generation's inputs are reconstructible from relay state** (old canonical + mailbox). That's true for fetcher merges. It is *not* true for the writers listed in Section 2a: the app after a **permanent-delete**, and the app on **backup restore** — and implicitly a third, the app's ongoing edits to per-book `tags`/`note`/`myRating`, which live in the canonical but have **no specified path into it** other than riding along when the app happens to merge.

Concrete failures:

- **Resurrection race.** App permanently deletes book X and rewrites the canonical (gen A, ts=T). A fetcher, mid-merge from the *prior* canonical, commits gen B at ts=T+ε. B wins by timestamp; A is orphaned and GC'd. X is back in the relay canonical. Worse: the next app **local-merge** imports canonical+mailbox into IndexedDB — X walks back into the user's library. The delete is undone end-to-end, silently. (If `TOMBSTONE-DELETE.md` makes permanent-deletes in-band tombstones that merges preserve, say so *in this doc* — under this design, physical removal via direct rewrite is unsafe, so tombstoning becomes a **requirement** of this design, not a separate concern.)
- **Restore race.** Same shape, higher stakes: the restore generation loses to a concurrent fetcher merge derived from the pre-restore canonical, so the restore never happened as far as the relay is concerned.
- **Determinism contradiction.** Section 9b's safety argument leans on "same canonical + same complete-run set → same output." But if the app's merges fold in **local** tags/notes (and if they don't, how do tag edits ever reach the relay copy — one of only two durable copies of RW-only data?), then app merges and fetcher merges given identical relay inputs produce different outputs, and the "two mergers produce equivalent generations" claim quietly stops covering the app-vs-fetcher case. The doc never states what a merge's inputs *are* for the app. This needs to be pinned down; as written, the two central claims (determinism, no-lost-data) are in tension.

**Fix — and it's a simplification, not an addition:** make the app **just another mailbox producer**. App-originated mutations (tag/note edits batched per session, delete tombstones, wishlist toggles) are written as letters; a backup restore is a special full-replacement run (a "reset" letter type the merge treats as new baseline, superseding lower runs). Then *every* canonical generation is a deterministic function of relay state, *every* committed input survives a lost generation race by construction, and the slightly awkward "app-owned canonical, but fetchers may merge" framing dissolves into something cleaner: **nobody owns the canonical; merges are deterministic functions of the mailbox, and anyone may run one.** One write path instead of three.

---

## HIGH findings

### H1. TTL policy for the canonical itself is unspecified — and deferred merging makes the current 10-day TTL a live data-loss mechanism

Today the canonical's 10-day TTL is continuously refreshed because every fetch rewrites it. The whole point of this design is to **stop** rewriting it frequently. KV TTL is fixed at put-time; it cannot be refreshed without a write. So: user takes a two-week break (no fetches → no runs → no merge triggers fire, since every trigger requires pending runs), and the canonical generations silently expire. Next fetcher run finds an empty canonical → full cold re-scrape (Problem 7, self-inflicted), and the relay copy of per-book tags/notes — RW-only data, one of two durable copies — is gone from the relay. The doc specifies letter TTL (~14d) and device-state TTL (90d) but never states the new canonical generation TTL. Recommend: **no TTL on canonical generations** (GC via keep-2 + explicit cleanup by the next writer), or at minimum ≥ 90d.

### H2. The letter TTL creates silent permanent loss for bookmarklet-only usage — and "4.5× margin" doesn't cover it

"TTL ~14 d, ~4.5× margin so no valid letter can expire un-merged" conflates *cadence* with *guarantee*. The age-cap trigger only runs when a client runs. Scenario: user wishlist-adds a book (bookmarklet writes the letter — the **only** copy anywhere, since bookmarklets hold no local state and the app hasn't imported it), then doesn't open the app or run a fetcher for three weeks. The letter TTL-expires. That is silent, permanent loss of RW-only data — the exact failure class Section 1 says the design exists to prevent. Section 12's "hard case" covers a *rejected* letter write; this is an *accepted* write that evaporates, which is worse because the user was told it succeeded. Letters are tiny and storage is the cheapest quota; there's no reason for 14d. Recommend **60–90d letter TTL** and framing the margin as "TTL ≫ realistic absence window," not a multiple of the age cap.

### H3. Letter granularity is ambiguous, and one reading blows three quotas at once

Section 10 says "the **4,000 initial letters** sit in the mailbox." If that's literal (one letter per book): 4,000 writes = 4× the account's **daily** write cap, 20× the existing 200/hr per-channel rate limit, and a mailbox whose `list` costs 4+ paginated calls (1,000 keys/page) *per fetcher skip-hint read and per app import* — against a list quota of 1,000/day (see H4). Section 9a's "only the full-library fetch needs to chunk" suggests the intended reading is chunk-sized multi-book letters, but nothing states a batching rule. This must be explicit: e.g. letters are batched up to ~N MB, a 4,000-book cold start is ~a dozen letters. Also specify whether single-letter runs (wishlist) still pay a second write for a run-manifest — inlining the manifest into a single self-committing letter halves the cost of the most frequent operation.

### H4. `list` is as scarce as writes — and this design converts every read path into a list consumer

Verified against Cloudflare's current docs: free tier is **1,000 list operations/day**, same as writes, reset 00:00 UTC, and operations over the cap **fail with errors** (Cloudflare KV free-tier announcement + Workers pricing docs). The doc's Section 3 flags this as `[assumption — verify]` — consider it verified, and promote it from a footnote to a first-class constraint alongside writes, because the new design's *reads* (fetcher skip-hint, app import, mobile viewer generation discovery, trigger evaluation) each involve ≥1 list, and reads will outnumber writes. Related tightness gap: Section 8 step 4 says "advance the **pointer**/watermark" but Section 8's read path says "**list** the manifests" — pointer-key discovery and list discovery are different designs and the doc never picks one. Recommend: **pointer key + list only as fallback/GC**. The pointer is a single-key put (atomic); concurrent writers racing on it can only point it at an older *complete* generation (benign — a reader gets slightly stale consistent data, self-heals on next write), and GC discipline must be "never delete a generation that is one of the two newest **or currently pointed to**."

---

## MEDIUM findings

### M1. Timestamp "newest wins" trusts client clocks

Gen ids are `{deviceId}:{timestamp}` and readers pick newest-by-timestamp. A device with a clock skewed forward (VMs and phones do this) commits a generation that beats every honest later write until real time catches up — readers serve stale data indefinitely and honest generations get orphaned. Cheap, complete fix: **the worker stamps all timestamps server-side** (every write already flows through it), with deviceId as tiebreak. Same for run-manifest `fetchDate` if it drives newest-wins field merging.

### M2. Keep-2 doesn't strictly protect an in-flight reader

"Keeping 2 guarantees a complete one always exists" — exists, yes; but the generation a slow reader chose can still be GC'd mid-assembly if two writes complete during its read. Low probability, but the fix is one sentence: only GC generations older than the two newest **and** older than some grace age (e.g., 1 hour).

### M3. Storage growth is unanalyzed, and storage is shared account-wide

Keep-2 means ~2× the canonical payload per user, plus orphaned generations awaiting GC/TTL, plus 60–90 days of letters (per H2), plus 2 generations of device-state — against **1 GB shared across all users**, the same shared-pool problem as writes. A ~50 MB encrypted library ≈ 150+ MB per active user → single-digit users saturate free-tier storage before write quota ever binds. The Section 12 DO meters writes; storage may be the earlier cliff. Add the arithmetic, and fold storage into the gating/paid-tier discussion.

### M4. Two-tab device-state race: tearing is fixed, staleness isn't

Unique gens stop tabs corrupting each other, but newest-timestamp-wins means a backgrounded tab pushing a snapshot serialized from stale in-memory state can beat a fresher push. Cheap rule: serialize device-state from IndexedDB/localStorage **at push time**, never from in-memory copies, and (with M1) let the worker's timestamps order the pushes.

### M5. Run completeness checks must tolerate manifest-before-letters visibility

KV has no cross-key ordering: a merger can see a run-manifest while one of its seq letters hasn't propagated to that edge yet. The design handles this correctly (incomplete → skip), but state explicitly that completeness verification GETs each seq key rather than trusting `list`, and that "incomplete" runs get retried later rather than marked dead — otherwise an implementer will cache "run 100 is broken" and recreate C1 by another route.

---

## Over-engineering assessment

The doc is honest about phasing, and the Phase 1 / Phase 2 split is right. Within that, I'd cut or defer:

1. **The full-fetch advisory (DO job #2).** A bookmarklet round-trip to a Durable Object to *advise* against a double full-fetch, which the merge already dedups safely, and which costs only wasted scraping time. This is a UX nicety carrying coordination infrastructure. Cut it; revisit if real users actually double-fetch.
2. **The three-tier quota table (60/90%).** For one user, two states suffice: *normal* and *age-cap-only*. Tiered gating is Phase-2-speculative policy for a fairness regime the doc itself says "largely evaporates" on the paid tier. Keep the concept, delete the tuning.
3. **Trigger #3 (opportunistic) is marginal.** While single-user and under budget, "merge on app open/import when complete runs are pending" is simpler, nearly equivalent, and — per the doc's own Section 15 admission that immediate folding costs no more writes than today — free. The full deferral machinery (volume thresholds, budget headroom checks) belongs with `RELAY-DELTA`, which is where the write savings actually live. Phase 1 gets smaller and easier to verify: generational commit + mailbox + merge-on-import + fetcher age-cap fallback.
4. **Triple-redundant integrity.** Per-chunk sha256 + `i of N` headers + whole-payload sha256 + manifest chunk count. The manifest's `{N, whole-payload sha}` alone detects every corruption the others detect (chunk presence = key exists; assembly checksum catches everything else). Per-chunk hashes only localize which chunk broke — keep if nearly free, but they're not load-bearing and shouldn't be presented as such.
5. **Adopting C2's fix deletes a concept.** "App-owned canonical with fetcher-merge exception" becomes "deterministic merges over a mailbox, any client may run one" — less machinery to explain *and* stronger guarantees. The best kind of cut.

What is **not** over-engineered, for the record: unique gen ids, manifest-last commit, keep-2, watermark-not-delete (once C1's set fix lands), the clearing invariant, and device-state chunking-by-the-same-pattern. Those all pay rent.

## Small nits

- "Net: **zero deletes**" (Section 8) vs. "older ones are cleaned up **by whoever writes next**" (same section) — pick one; keep-2 GC either costs deletes or relies on TTL, and after H1 you likely *want* explicit GC deletes for the canonical (deletes are a separate 1,000/day pool you barely use).
- Gen-id timestamp ties across devices: define the tiebreak (deviceId lexical) so "newest complete" is deterministic for all readers.
- Section 11 calls trigger evaluation "cheap: one manifest read + one mailbox list" — after H4, a list per trigger check per client visit is not cheap; evaluate triggers from data fetched anyway (pointer + manifest).
- The paid-tier framing ("effectively millions" of writes) is per-*month* included quota (~1M writes/mo included, then metered), not per-day — right conclusion, sloppy units; worth correcting since quota math is load-bearing elsewhere.
- Phase 0 (dev worker + namespace before touching production) is exactly right; do it first.

## Answers to Section 14's open questions, per this review

- device-state 25 MB risk: still verify size empirically, but the chunked pattern is worth shipping regardless since the machinery is shared (Section 13's own argument).
- `list` quota: **verified, 1,000/day free tier, hard-fails over cap** — meter lists in the DO alongside writes, and reduce list dependence via the pointer key (H4).
- Concrete numbers: age cap 3d is fine; letter TTL should be 60–90d, not 14d (H2); canonical generation TTL none/≥90d (H1); volume threshold becomes mostly moot if trigger #3 collapses into merge-on-import (over-eng. #3).
- Letter GC: TTL-only is fine for letters; explicit GC is for old *generations* (nit #1).

## Bottom line

Fix C1 (absorbed-run **set**, not scalar watermark) and C2 (route *all* mutations — app's included — through the mailbox; tombstone deletes; restore as a reset-run) before anyone writes code, because both are cheap now and expensive after. Pin down H1–H4 (canonical TTL, letter TTL, letter batching, pointer-vs-list) in the doc — they're one-paragraph decisions each. Then trim Phase 1 per the over-engineering notes and this is a design I'd be comfortable shipping: the commit pattern at its heart is correct and well-argued, and the doc's epistemic labeling made it a pleasure to attack.
