# Relay Write Redesign — Atomic, Mailbox-Delivered, Deterministically Merged Sync

**Status:** Design v2, post external review. Review findings (2 critical, 4 high, 5 medium, plus trims) are incorporated; see the revision note at the end for the mapping.
**Date:** 2026-08-13 (v2)
**Scope:** The Cloudflare relay write path (the chunked library store and device-state store). Does **not** change local storage, the UI, or the Amazon scrapers themselves.

> **For a reviewing agent:** This document is self-contained. Sections 1–4 explain how ReaderWrangler works and the platform constraints so you can evaluate the design without reading the codebase. Sections 5–6 state the problems. Sections 7–14 are the proposed design. Claims are marked **[verified in code]**, **[platform fact]**, **[proposed]**, or **[assumption — verify]**.

---

## 1. What ReaderWrangler is

ReaderWrangler (RW) is a personal Kindle/Amazon library organizer and catalog. It has one developer/user today and is pre-launch. The philosophy is "polish before launch, no MVP shortcuts."

Three cooperating pieces:

- **The app** — a single-page React application (`readerwrangler.js`, ~18k lines, React 18 UMD + in-browser Babel). Its **source of truth is local**: books live in **IndexedDB**, organization lives in **localStorage + an IndexedDB blob**. The app is where the user organizes: folders, Book Lists, tags, saved searches, notes, ratings.
- **The fetchers** — three bookmarklets that run **on amazon.com** and scrape data the app can't reach directly:
  - `amazon-library-fetcher.js` — the owned-library fetch. Scrapes the "Your Books" pages, enriches with detail-page data (descriptions, reviews, prices), and produces the full owned-book set. Can run for many minutes to an hour on a large library.
  - `amazon-collections-fetcher.js` — scrapes Amazon "Collections" and read-status.
  - `amazon-wishlist-fetcher.js` — adds a **single** book (the current Amazon product page) to RW's wishlist.
- **The relay** — a Cloudflare Worker + KV namespace (`relay/relay-worker.js`) that moves **encrypted** data between the fetchers (on amazon.com) and the app (on readerwrangler.com), and holds a snapshot for the **mobile viewer**. The bookmarklet and app cannot talk directly (different origins, no shared storage), so the relay is the channel. All payloads are end-to-end encrypted; the worker sees only ciphertext.

**Key durability facts:**
- The fetchers regenerate only **owned** books from Amazon. **Wishlist items, samples, and all organization (folders, Book Lists, tags, notes) are NOT re-fetchable from Amazon.** [verified in code]
- **The relay is a post office, not a vault.** Durability rests on **local storage + explicit user backup files** (Save/Restore). The relay exists for (1) the fetcher→app handoff and (2) the mobile snapshot — it is *not* the designed backup/recovery system. (See `docs/design/DATA-DURABILITY.md`.) Corruption still matters enormously: a corrupt relay breaks the handoff, loses in-transit wishlist adds (whose only copy may briefly be the relay), and poisons imports.

---

## 2. The two relay stores

The relay holds **two distinct stores** per channel. This distinction is central to the design.

### 2a. The chunked "canonical library" store  [verified in code]

- **Written by (today):** the fetchers (download → merge → upload the full library) **and** the app (after a permanent-delete; on backup restore).
- **Read by:** the app on Import; the fetchers (to learn what's already fetched).
- **Endpoints:** `POST /upload/{ch}/chunk/{n}`, `POST /upload/{ch}/manifest`, `GET /download/{ch}/chunk/{n}`, `GET /status/{ch}`, `DELETE /cleanup/{ch}`.
- **Storage layout (today):** `relay:{ch}:chunk:{n}` (encrypted chunks, **fixed keys overwritten in place**) + `relay:{ch}:manifest` (chunk count + `sha256:` checksum over the encrypted payload). TTL **10 days**.
- **Contents [verified — `readerwrangler.js:2120-2163`]:** per-book records — Amazon-sourced fields (`title, authors, coverUrl, rating, series, prices, genres, description, topReviews, binding…`) plus RW-only per-book fields (`tags, note, myRating, onWishlist, ownershipType, isHidden, isDeleted, deletedAt…`) — and a `collections` block (per-book readStatus + Amazon collections). **It contains NO structural organization** (no folder tree, no Book Lists, no saved searches, no tag registry).

**Role and field policy [agreed with owner]:** the canonical is the **fetcher-facing working store**, not a backup. Within it:
- **Existence/status fields are load-bearing:** `onWishlist`, `ownershipType`, `isDeleted`/tombstones — these say *which books exist in RW and in what state*, and the whole mailbox design exists to protect them.
- **Display-only RW fields (`tags`, `note`, `myRating`) are vestigial best-effort.** They ride along because the records share one schema; merges copy them forward at ~zero cost; **nothing depends on their freshness**, and the app's import must never let them overwrite fresher local values. They are explicit candidates for a later schema slim-down (Section 4), kept now only because removal costs more than retention.

### 2b. The device-state store  [verified in code]

- **Written by:** the **app only**. **Read by:** the **mobile viewer**. One-way; there is no app-rebuild-from-device-state mechanism, and this design does not add one.
- **Endpoints:** `PUT /device-state/{ch}`, `GET /device-state/{ch}`.
- **Storage layout (today):** a **single key** `relay:{ch}:device-state`, single value. TTL **90 days**.
- **Contents [verified — `readerwrangler.js:4692-4793`]:** the same per-book items **plus** an `organization` block: `folders` (with `bookIds`), `bookLists` (with `bookIds`), `explorerSettings`, `tagRegistry`, `savedSearches`, `hiddenInstances`.

**Consequence:** structural organization lives **only in device-state and local** — never in the canonical. A canonical merge therefore cannot lose folders/Book Lists: they aren't there. This is what makes it safe for *any* client to run a canonical merge (Section 9).

---

## 3. Cloudflare KV platform constraints  [platform facts]

These shape every decision below.

- **Value size cap: 25 MB per key** (`MAX_CHUNK_SIZE` in the worker). Anything larger must span multiple keys.
- **Per-account daily limits (free tier)** — shared across **ALL users**, reset **00:00 UTC**:
  - KV **writes: 1,000 / day**
  - KV **deletes: 1,000 / day** (a separate pool, barely used today)
  - KV **`list` operations: 1,000 / day** — **[verified against current Cloudflare docs during external review]**. As scarce as writes, and operations over the cap **fail with errors**. This design's read paths consume lists, so lists are a **first-class constraint alongside writes** (Section 14).
  - KV **reads: 100,000 / day**; Worker **requests: 100,000 / day**
  - KV **storage: 1,024 MB** — also shared account-wide; see Section 14 for why storage may be the *earlier* cliff.
- One observed active user: **~130 writes/day** during heavy wishlist use. The worker's own comment pegs normal fetcher runs at ~10–20 writes.
- **Existing per-channel protection [verified in code]:** `ratelimit:{ch}`: **200 writes/hour** per channel (auto-block at 2,000/hr).
- **Consistency model:** KV is **eventually consistent** — readers can briefly see stale values, and there are **no cross-key ordering guarantees** (a reader may see key B's new value before key A's, regardless of write order). **Each single-key put is atomic** (whole old value or whole new value, never torn *within* a value). Tearing happens **across keys**.
- **No compare-and-swap, no transactions, no locks** on KV.
- **Durable Objects (DO)** are Cloudflare's strongly-consistent, single-threaded primitive — the only correct home for atomic counters and leases. The worker mediates all client access, so it can route coordination through a DO.
- **Paid tier:** raises the caps to ~**1M writes/month included** (then metered) — order-of-magnitude relief, per-*month* units. [Owner's stance: go paid if usage forces it, funded by commissions. Free-tier rationing (Section 13) is a launch-phase stopgap.]
- **Encryption:** payloads are encrypted client-side; SHA-256 checksums are computed over the **encrypted** bytes (`relay-client.js:154`). The relay/DO never sees plaintext.

---

## 4. Durability stance and field policy  [agreed with owner]

- **Recovery = local storage + explicit backup files.** The relay is never the designed recovery path.
- **Org changes do NOT flow to the canonical** (they aren't in it) and do not trigger relay writes. Org reaches mobile via **device-state**, on its own cadence — proposed: an explicit "Push to Mobile" action + an idle-timeout auto-push (5–60 min debounce) + a `visibilitychange`/tab-close safety push.
- **The app writes to the canonical only via mailbox letters, and only for existence-level events** (Section 9c): permanent-delete tombstones and backup-restore resets. No routine edit streaming.
- **Why `tags`/`note`/`myRating` ride in the canonical at all:** self-defense, historically — a fetcher that re-uploaded books *without* them would deliver back a tag-stripped library. Under this design fetchers no longer rewrite the canonical, so the round trip disappears; merges merely copy the fields forward from the prior generation at ~zero cost. **Acknowledged cleaner end-state (owner's Option B):** strip display-only RW fields from the canonical entirely and rely on the import rule "never remove/overwrite local RW fields" — a clean later schema diet, deliberately **not** coupled to this corruption fix (smaller diff, less to verify — e.g., must first confirm no fetcher consumes borderline fields like `targetPrice` **[assumption — verify]**).

---

## 5. Root problem

**Relay corruption is a torn multi-key write.** The canonical is multiple keys (chunks + manifest). Today's `upload()` overwrites the **fixed** chunk keys in place, then writes the manifest. Interrupt the writer mid-sequence (tab closed during an Add-to-Wishlist or a fetch) and the keys are left mutually inconsistent; the next `download()` fails its SHA-256 check ("Sync data check failed (checksum mismatch)"), and because the chunks were overwritten in place, **no intact prior copy exists to fall back to.** That is the failure the owner hit.

---

## 6. Problem scenarios (the cases the design must survive)

1. **Torn write** — writer interrupted mid multi-key write → inconsistent chunks/manifest → checksum failure, no fallback. *(The root problem.)*
2. **Concurrent writers / lost updates** — today fetchers **and** the app rewrite the canonical. Two writers (full fetch + wishlist add; two app tabs; a double full-fetch) can clobber or tear each other.
3. **Resurrection race** — the app permanently deletes a book and rewrites the canonical; a concurrent fetcher merge derived from the *prior* canonical wins; the deleted book returns to the canonical and, on next import, **to the user's library**. [App's delete path verified: `readerwrangler.js:2082-2112` purges the book and rewrites from the remainder — no tombstone survives.] Same shape, higher stakes: a **backup restore** that loses the race never happened, relay-wise.
4. **Out-of-order run completion** — run ids are assigned at run *start*, but runs finish out of order (an hour-long full fetch outlived by an instant wishlist add). Any bookkeeping keyed to "highest run absorbed" silently discards the late-finishing run. *(Found by external review — C1.)*
5. **Stale fetcher reference** — the library fetcher's incremental scan uses previously-fetched state to tell new-from-known **[verified — `amazon-library-fetcher.js:1358-1374, 1846`]**. If recent adds are invisible to it, it re-scrapes them.
6. **Blind window** — if the app reads deltas and clears them but defers the canonical rewrite, a delta exists in *neither* store; fetchers are blind to it.
7. **TTL as a loss mechanism** — (a) a canonical that is no longer rewritten frequently must not *expire*; (b) a mailbox letter whose only copy anywhere is the relay must not expire before it is absorbed, even if the user stays away for weeks. *(Sharpened by external review — H1/H2.)*
8. **device-state > 25 MB** — a single-key value carrying full book data + org will eventually exceed the cap for someone.
9. **Shared quotas at scale** — writes, lists, and storage are all per-account pools shared by every user.
10. **Pathological cold start** — an initial ~4,000-book fetch while the canonical is empty and everything is in flight at once.

---

## 7. Design overview

**One sentence:** *nobody* owns the canonical — every client (fetchers **and** the app) delivers its changes as **self-committing mailbox letters**, and the canonical is only ever produced by a **deterministic merge over relay state** that any client may run, committed with one crash-safe, concurrency-safe generational pattern shared by both stores.

Four pillars:

1. **Mailbox delivery, universally** (Section 9). Fetchers deliver scrapes as letters; the app delivers tombstones and restore-resets as letters. No client ever does read-modify-write against the canonical.
2. **One commit pattern for all multi-key stores** (Section 8): unique-generation chunks + manifest-written-last as the atomic commit + a pointer key + an **absorbed-run set** instead of deletes + keep-2 + newest-complete-wins. Applied to the canonical **and** the (newly chunked) device-state.
3. **Non-destructive reads + the clearing invariant** (Section 10): reading never consumes; a letter leaves the mailbox only by being absorbed into a committed canonical generation. A delta always lives in the mailbox *or* the canonical — never in neither.
4. **Simple, durable merge scheduling** (Section 11): merge-on-import in the app, an age-cap fallback in the fetchers, restore-as-reset. (The deferral/batching economics that *save* writes belong to `RELAY-DELTA.md`, not here.)

---

## 8. The unified commit pattern (canonical AND device-state)

A "generation" is one complete version of a store.

**Writing a generation:**
1. **Unique generation id** = `{workerTimestamp}:{deviceId}` — **not** a shared counter.
   *Why unique [load-bearing]:* two concurrent writers with different content but the same counter value would interleave writes to the **same** chunk keys → a torn generation. Unique ids ⇒ concurrent writers touch **disjoint** keys ⇒ neither can tear the other.
   *Why the worker stamps the timestamp [review M1]:* client clocks skew; a forward-skewed device would win "newest" indefinitely. Every write already flows through the worker, so the worker assigns timestamps server-side. `deviceId` is the deterministic tiebreak (lexical).
2. **Write the chunks** under `…:{gen}:chunk:{i}`. Each chunk carries `i of N` and a per-chunk `sha256:` (integrity localization only — **not** load-bearing; the manifest's whole-payload checksum is the authoritative check [review, over-eng. #4]).
3. **Write the manifest last** — `…:{gen}:manifest` = `{ gen, chunkCount N, sha256(whole payload), workerTimestamp, absorbedRuns (canonical only, Section 9d) }`. This single-key put **is the atomic commit**.
4. **Advance the pointer** — `…:pointer` = `{gen}`, a single-key put. Readers start here (cheap GET, no `list` — [review H4]). A pointer race between concurrent writers is benign: it can only point at an *older complete* generation; readers get slightly-stale-but-consistent data, self-healing on the next write.
5. **GC, don't accumulate:** the *next* writer deletes generations that are (a) not among the two newest complete, (b) not currently pointed to, and (c) older than a **grace age (~1 h)** — so a slow reader mid-assembly never loses its generation [review M2]. Explicit deletes are fine — the deletes pool (1,000/day) is barely touched [review nit].

**Reading a store:**
- GET the pointer → GET that manifest → GET chunks → verify (all N present, whole-payload checksum).
- On any failure (or missing pointer): fall back to `list` the manifests and take the **newest complete** generation. `list` is the fallback/GC path, not the hot path [review H4].
- **Completeness must be verified by GETting each chunk key** — never inferred from `list` — because KV has no cross-key ordering: a manifest can be visible before its chunks have propagated. An incomplete generation/run is **retried later, never cached as dead** [review M5].

**Crash safety:** interrupted before the manifest → incomplete generation, ignored, prior generation intact. Interrupted between manifest and pointer → complete generation exists; pointer still names the prior one (consistent); next write or list-fallback heals it. **No torn state is ever live.**

**Concurrency safety:** two simultaneous writers ⇒ disjoint complete generations ⇒ one wins the pointer; the loser is orphaned and GC'd. For merges, the loser's *inputs* are never lost, because inputs live in the mailbox and are removed only by absorption bookkeeping that travels **with the winning manifest** (Section 9d). Cost of a race: one wasted generation write. (The Phase-2 merge-lease removes the waste; correctness never depends on it.)

**TTLs [review H1]:** canonical generations get **no TTL** — lifecycle is managed by keep-2 + GC above. (Today's 10-day TTL was survivable only because every fetch rewrote the store; deferred merging would turn it into scheduled data loss for any user on vacation.) device-state generations keep a long TTL (90 d, as today) *in addition to* keep-2 GC.

---

## 9. The mailbox

### 9a. Letters and runs

- A **letter** is one KV value: `relay:{ch}:mail:{runId}:{seq}`, carrying **full book objects** (never ASIN-only — the app cannot re-fetch details from Amazon). `runId` = `{workerTimestamp}:{deviceId}:{rand}`.
- **Batching rule [review H3]:** letters are batched — up to ~**5 MB** of encrypted payload per letter, many books per letter. A 4,000-book cold start is **~a dozen letters**, not 4,000. (4,000 single-book letters would blow the daily write cap 4×, the hourly channel limit 20×, and the list budget — the batching rule is load-bearing, not a style preference.)
- **Runs are self-committing:** the producer writes its `seq` letters, then a **run-manifest** letter last: `{ runId, seqCount, sha256, workerTimestamp, fetchDate, kind }`. A run counts only when its manifest is present **and** every seq GETs successfully **and** the checksum verifies. A producer that dies mid-run leaves an incomplete run that everyone ignores.
- **Single-letter runs inline the manifest** [review H3]: a wishlist add is **one** self-committing letter (manifest fields + payload in one value) — complete by definition, half the write cost of the most frequent operation.
- **Stale incomplete runs:** a run still incomplete after a **staleness window (~24 h** — generous vs. hour-scale fetches) is abandoned: merges record it as void in `absorbedRuns` so it is never re-examined; its letters TTL out. Before the window, "incomplete" simply means "check again later" (propagation lag must not brand a run broken — [review M5]).
- **Letter TTL: ~90 days [review H2].** A letter can be the **only copy anywhere** of a wishlist add (bookmarklets hold no local state, and the user was told it succeeded). The TTL guarantee must therefore be "TTL ≫ any realistic absence window," **not** a multiple of the merge cadence — an accepted-then-evaporated write is worse than a rejected one. Letters are tiny; storage is the cheap quota. Absorbed bulk runs are explicitly GC'd early anyway (Section 14).

### 9b. Producers and letter kinds

| Producer | Letter kind | Payload | Shape |
|---|---|---|---|
| Library fetcher | `books` | scraped owned books (full objects) | multi-letter run |
| Collections fetcher | `collections` | per-book readStatus + collections | 1–few letters |
| Wishlist bookmarklet | `wishlist-add` | one full scraped book | single self-committing letter |
| **App** | `tombstone` | ASINs permanently deleted + `deletedAt` | single letter |
| **App** | `reset` | full replacement library (from backup restore) | multi-letter run, `kind: reset` |

Multiple producers never race in the mailbox: every letter key is unique to its producer. Parallel fetchers — even two simultaneous full fetches — are just two runs; both complete independently; the merge dedups by ASIN (newest `fetchDate` wins per book).

### 9c. The app as producer  [review C2 — load-bearing]

The app **never** rewrites the canonical directly. Its two existence-level mutations travel as letters:

- **Permanent delete → tombstone letter.** The merge converts the book's canonical record into a **compact tombstone** (`asin`, `tombstoneAt`) rather than deleting the record outright, and merges never re-add a tombstoned ASIN from letters whose `fetchDate` predates the tombstone. This kills the resurrection race (scenario 3) *by construction* — deletes are merge inputs, not competing rewrites. Whether a *later* fetch that re-finds the book on Amazon revives it is deletion-propagation **policy**, owned by `TOMBSTONE-DELETE.md` — but note that under this design in-band tombstoning is a **requirement**, not an optional companion: physical removal via direct rewrite is exactly the unsafe write we are eliminating.
- **Backup restore → reset run.** A run flagged `kind: reset` is a new baseline: the merge output = the reset run's content ⊕ complete runs with a **newer** workerTimestamp; the prior canonical and all older runs are recorded as absorbed/superseded. A restore can no longer "lose the race and never have happened" — it's an input every subsequent merge must honor.

Routine per-book edits (tags/note/myRating) do **not** produce letters — Section 4's field policy stands: those fields are best-effort in the canonical; local + backups + device-state carry them.

**Payoff:** every canonical generation is now a **deterministic function of relay state** (prior canonical + complete runs + tombstones/resets). Any two mergers with the same inputs produce equivalent output; the app has no privileged inputs. This is what makes "anyone may merge" true — and it replaced the v1 framing of "app-owned canonical with a fetcher exception," which was both weaker and wrong (the v1 doc's app-direct writes falsified its own no-lost-data claim — review C2).

### 9d. The canonical merge and the absorbed-run set  [review C1 — load-bearing]

```
new canonical = f( current canonical,
                   all COMPLETE runs not yet absorbed,
                   tombstones, resets )
  merge by ASIN: new asin → add; existing → update Amazon-sourced fields
  (newest fetchDate wins), copy forward RW per-book fields, honor tombstones,
  honor resets as baselines
```

**Absorption bookkeeping is a SET, not a scalar.** The canonical manifest carries **`absorbedRuns`: the set of runIds this generation has absorbed** (including voided-stale and reset-superseded runs). The merge rule is "absorb every complete run **not in the set**."

*Why not a high-water mark:* run ids are assigned at start but runs complete out of order. A scalar "absorbed through R" mark, advanced past a quick wishlist run, would permanently blind every future merge to a slower, earlier-started full fetch that completes later — silently discarding an entire fetch with no error, **no concurrency required** (scenario 4). Additionally, KV's lack of cross-key ordering means a merger can see a newer run's manifest before an older one's even when commits were ordered. Any scalar mark is unsound here; the set is the fix.

*Set hygiene:* runIds embed worker timestamps, so entries older than the letter TTL horizon (whose letters have provably expired) are pruned from the set — it stays small and bounded.

*Composition with concurrent merges:* the set travels **inside the manifest**, so absorption is atomic with the commit itself. A losing generation's set is discarded with it; whatever the loser absorbed that the winner didn't remains **not-in-the-winner's-set** → still visible → swept by the next merge. No delete-race, no loss.

### 9e. Reading, and the two "merges"

**Merge** = combine book records by ASIN. It happens in two places; keep them distinct:
- **local-merge** — the app reads canonical + complete runs and merges into **local IndexedDB** for the live view. A read: non-destructive, idempotent, free, repeatable. Import must never let canonical copies of RW per-book fields overwrite fresher local values [existing behavior — orphan-preservation; must be preserved].
- **canonical-merge** — Section 9d; writes a relay generation; the only operation that "consumes" letters (via `absorbedRuns`).

A **fetcher's read** is a third, read-only use: canonical + complete runs reconstructed **in memory** as its skip-hint (`existingBooks`) for the incremental scan. It writes nothing back. Missing a just-written letter (eventual consistency) costs a re-scrape of a few books, which the next merge dedups.

---

## 10. The clearing invariant

> **Invariant:** a letter is only ever "removed" (made ignorable) by the **committed canonical generation that absorbed it** — never by an import, and never by an explicit clear.

Import reads; only a committed merge's `absorbedRuns` set retires letters. Therefore **every delta lives in the mailbox until the instant it lives in the canonical — never in neither.** This closes the blind window (scenario 6) and the cold start (scenario 10): the ~dozen cold-start letters remain first-class mailbox citizens until a merge commits them, so any reader finds them in one store or the other, never in the gap. Residual duplicates (a letter written mid-scan of a running fetcher) are absorbed by ASIN dedup — a few books, rarely.

---

## 11. Merge scheduling  [simplified per review over-engineering #2–3]

Phase 1 needs exactly three rules:

| # | Rule | Who | Purpose |
|---|---|---|---|
| 1 | **Merge on import** — after a successful import, if complete unabsorbed runs exist, run a canonical-merge | app | Keeps the canonical current at the natural moment; costs no more writes than today's per-fetch rewrite |
| 2 | **Age-cap fallback (~3 d)** — if the oldest complete unabsorbed run exceeds the cap, merge now | fetchers (and app) | The durability backstop; guarantees consolidation even if the user **never opens the app**; overrides any quota conservation |
| 3 | **Restore** — a backup restore emits its reset run and immediately merges | app | The restore IS a canonical write; do it atomically via the same machinery |

- "Unabsorbed" is evaluated from the pointer-manifest's `absorbedRuns` + the mailbox listing the client already fetched for its own read — **no extra `list` calls** [review H4/nit].
- Volume thresholds, opportunistic-headroom triggers, and multi-tier budget tables are **dropped from this design**. They are deferral economics — they belong to `RELAY-DELTA.md` (accumulate letters, defer consolidation, save writes). Phase 1's merge-on-import writes no more than the status quo, so it needs no budget machinery.
- **Quota conservation is two states, not tiers** [review over-eng. #2]: **normal** (all three rules) and **conserve** (age-cap and restore only), switched by the worker's advice once the Phase-2 counter exists. Solo phase: always normal.
- App and fetcher merging simultaneously remains safe (Section 8) — one wasted write, no loss. The Phase-2 **merge-lease** (DO) single-flights merges to remove the waste; a failed lease degrades to safe-but-wasteful, never to unsafe.

**Timescale ordering:** merge cadence (per-import, sub-daily in active use) **≪** age cap (**~3 d**, hard) **≪** letter TTL (**~90 d** — sized to absence windows, not cadence).

---

## 12. Worker enforcement, the Durable Object, and fairness

**One Durable Object, two jobs** (Phase 2 — both need strong consistency KV can't provide):
1. **Global quota counters** — writes **and `list`s** (both 1,000/day pools), UTC-day, per-account and per-channel. Feeds the normal/conserve switch and the worker's server-side gate.
2. **Merge-lease** — short-lived, single-flights canonical merges.

(The v1 "full-fetch advisory" DO job is **cut** [review over-eng. #1] — parallel full fetches are already safe, the advisory only saved wasted scraping time, and it carried coordination infrastructure for a UX nicety. Revisit only if real users actually double-fetch.)

**Fairness / enforcement:**
- There is **no Cloudflare setting** for per-user fairness; it is code in the worker + DO. Enforcement **must be server-side**: the worker is the sole KV path and can reject/defer writes when a channel exceeds its share or the global pool nears exhaustion. Client-side conservation is a courtesy; a modified client can ignore it; the worker's gate is the real one. (The existing 200/hr channel limit + auto-block is the primitive form.)
- **Graceful degradation:** letter writes are tiny and prioritized; the deferrable operation is the merge. A deferred merge is *"consolidating later — your data is safe,"* not an error (letters are already durable for ~90 d).
- **The hard case:** a channel so far over that even a **letter** is rejected. App: the change is safe in IndexedDB → "couldn't sync now, will retry." Bookmarklet: holds no state → must tell the user plainly: *"sync limit reached — this add wasn't saved; try again later."* Reassurance only where the local copy genuinely exists.
- **Scale answer is economic:** the paid tier (~1M writes/**month** included) turns fairness from rationing into ordinary abuse-prevention. Free-tier fairness code is a stopgap; don't gold-plate it.

---

## 13. device-state chunking + journaling

device-state must be **planned for chunking** — do not assume 25 MB holds for every user forever.

- **Same Section 8 pattern**, verbatim: unique-gen chunks (`i of N` + checksums), manifest-last commit, pointer, keep-2 + grace GC, newest-complete-wins. The only differences from the canonical: writers are **app tabs only**, there is no mailbox/absorption bookkeeping, and generations keep a 90 d TTL.
- **The real second writer is two app tabs** both hitting the idle-timeout push. Unique gen ids already make that tear-proof. For *staleness* [review M4]: **serialize the payload from IndexedDB/localStorage at push time — never from in-memory state** — so a backgrounded tab pushes current data, and worker-stamped timestamps order the pushes.
- **Migration, reader-before-writer:** ship the **mobile viewer** that understands **both** formats first; then the app writer. Mobile tries pointer/new-format, falls back to the old single key; after the first successful new-format push the old key is deleted. No flag-day for an already-open mobile session.

---

## 14. Quota & storage arithmetic  [review M3/H4 — promoted to first-class]

**Writes (1,000/day shared):** Phase 1 is write-neutral vs. today (letters replace uploads; merge-on-import replaces per-fetch rewrite). Observed single-user peak ~130/day ⇒ single-digit *simultaneous heavy* users saturate the free tier — the launch constraint is real but Phase-1-orthogonal; relief is `RELAY-DELTA` deferral and/or paid tier.

**Lists (1,000/day shared, hard-fail):** every mailbox enumeration is ≥1 list (4,000 keys would be 4+ paginated calls — another reason the H3 batching rule is load-bearing). Design keeps lists off hot paths: pointer-GET discovery (no list), one list per fetcher run (skip-hint) and per app import (shared with trigger evaluation), mobile reads pointer only. Phase 2 meters lists in the DO alongside writes.

**Storage (1 GB shared):** the arithmetic that makes this the possible *earlier* cliff: a ~50 MB encrypted library × keep-2 generations (~100 MB) + up to 90 d of letters + 2 generations of device-state (~100 MB) ⇒ **~250+ MB per heavy user** — 3–4 such users saturate free-tier storage before write quota binds. Mitigations, in order: (a) **explicit early GC of absorbed bulk runs** (delete a full-fetch run's letters after absorption + grace — the 90 d TTL is for *unabsorbed* letters; deletes pool is idle); (b) keep-2 already bounds generations; (c) fold storage into the DO's Phase-2 accounting and the paid-tier decision.

---

## 15. Open questions / to verify

- **[verify]** measure a realistic large-library device-state payload size (is the 25 MB risk near-term or theoretical?).
- **[verify]** does any fetcher consume RW-only per-book fields from the canonical (e.g., `targetPrice` for price alerts)? Gates the Section 4 "Option B" schema diet (not this phase).
- **[decide]** exact numbers: age cap (3 d?), letter TTL (90 d?), staleness window (24 h?), grace age (1 h?), letter batch size (5 MB?).
- **[decide]** tombstone revival policy (fetch re-finds a permanently-deleted owned book) — owned by `TOMBSTONE-DELETE.md`; this design only requires that tombstones exist and are honored by merges.
- **[decide]** worker API shape: new endpoints for mail/pointer/generations vs. generalizing the existing chunk/manifest endpoints. (Implementation detail, but affects Phase 0 testing.)

---

## 16. Phasing

- **Phase 0 — infrastructure (owner's Cloudflare account).** No staging exists (`wrangler.toml`: one worker, one KV namespace, `preview_id == id`). Create a **dev worker + dev KV namespace** before touching worker code. Requires `wrangler` against the owner's account.
- **Phase 1 — durability core (solo-safe, no DO).** The unified commit pattern (unique gens, manifest-last, pointer, absorbed-run set, keep-2 + grace GC, no canonical TTL); mailbox letters with batching + inline single-letter runs; app tombstone/reset letters; fetcher skip-hint reads; the clearing invariant; merge-on-import + age-cap fallback + restore-merge. *Leaner than v1: no volume triggers, no budget tiers, no advisory.*
- **Phase 1b — device-state chunking + journal**, reader-before-writer migration.
- **Phase 2 — multi-user hardening (at/near launch).** The DO: write+list counters, normal/conserve switch, merge-lease; worker-side fairness gate; storage accounting; paid-tier decision.
- **Deferred — `RELAY-DELTA.md`.** Real *write-savings* come only from accumulating letters and deferring consolidation across many fetches. Immediate merging saves nothing (tiny letter + full rewrite ≈ today's rewrite) — which is precisely why Phase 1 can afford to merge-on-import and stay simple. This design enables that optimization; it does not require it.

---

## 17. Glossary

- **Canonical (library)** — the authoritative chunked book set on the relay (store 2a). Nobody owns it; merges produce it.
- **device-state** — the app's one-way mobile snapshot, incl. structural org (store 2b).
- **Letter** — one KV value in the mailbox: batched full book objects, a tombstone list, or part of a reset.
- **Run** — one producer execution's letters sharing a `runId`, committed by a run-manifest (inlined for single-letter runs).
- **Generation** — one complete committed version of a chunked store, unique id `{workerTimestamp}:{deviceId}`.
- **Manifest** — the last-written key of a generation/run; its presence = committed; carries count + checksum + timestamp (+ `absorbedRuns` for the canonical).
- **Pointer** — single key naming the current generation; GET-discovery without `list`.
- **absorbedRuns** — the **set** of runIds a canonical generation has absorbed/voided/superseded; travels in the manifest; replaces both deletes and any scalar watermark.
- **Tombstone** — compact merge-honored record of a permanent delete.
- **Reset run** — a backup restore delivered as a baseline-replacing run.
- **canonical-merge / local-merge** — writing a new relay generation vs. merging into the app's IndexedDB (a read).
- **Skip-hint** — a fetcher's in-memory canonical+mailbox reconstruction to avoid re-scraping.

## 18. Related documents

- `docs/design/DATA-DURABILITY.md` — what is Amazon-recoverable vs RW-only; the durability stance this design implements.
- `docs/design/TOMBSTONE-DELETE.md` — deletion-propagation policy. **Elevated by this design from companion to requirement** (Section 9c).
- `docs/design/RELAY-DELTA.md` — the deferred accumulate-and-defer write-savings optimization built on this.

---

*Revision note (v2, 2026-08-13): incorporates the external review (Claude Fable 5, adversarial pass). Adopted: **C1** — scalar watermark replaced by the `absorbedRuns` set (out-of-order run completion was silently discarding whole runs); **C2** — app-direct canonical writes eliminated; app is a mailbox producer (tombstone + reset letters), making every generation a deterministic function of relay state and dissolving "app-owned" into "nobody owns it"; **H1** — canonical generations lose their TTL (keep-2 + GC instead); **H2** — letter TTL 14 d → ~90 d, sized to absence windows not cadence; **H3** — explicit letter batching (~5 MB) + inlined single-letter run manifests; **H4** — `list` quota verified (1,000/day, hard-fail) and promoted to first-class; pointer-key discovery with list as fallback; **M1** — worker-stamped timestamps, deviceId tiebreak; **M2** — GC grace age; **M3** — storage arithmetic added (storage may cliff before writes); **M4** — device-state serialized from storage at push time; **M5** — completeness via per-key GETs, incomplete ≠ dead. Trimmed per review: full-fetch advisory cut; quota tiers → two states; volume/opportunistic triggers → merge-on-import (deferral economics moved to RELAY-DELTA); per-chunk hashes demoted to non-load-bearing. Owner decisions folded in: relay is a post office not a vault; org never flows to the canonical; no routine edit letters — display-only RW fields in the canonical are declared vestigial best-effort, with the owner's "Option B" schema diet recorded as the acknowledged cleaner end-state, deliberately decoupled. v1 (2026-08-13) and the 2026-08-03 stub are in git history.*
