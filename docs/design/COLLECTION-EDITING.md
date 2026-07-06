# Design: Edit Kindle Collections from ReaderWrangler

**Status:** Backlog / Draft design (2026-07-06)
**Author:** Ron + Claude
**Related:** [[TAG-FROM-COLLECTIONS]], relay write redesign (TODO 4.5.8), tombstone delete

---

## 1. Motivation

Managing Kindle **collections** is miserable everywhere Amazon offers it — the Kindle
device, the Kindle app, and *Manage Your Content & Devices* (MYCD) are all clumsy for
bulk work. Ron already leans on one collection ("read") as his hand-curated "I finished
this" signal (more reliable than Kindle's auto-read, which trips at ~99% and misfires on
books with glossaries/back-matter). But moving many books in/out of a collection is slow
and error-prone on Amazon's own surfaces.

WR already **reads** collection membership (Collections Fetcher) and can **filter** by it
(including a first-class "Uncollected" option). The missing half is **writing** collection
changes back to Amazon. This doc designs that.

## 2. Goals / Non-Goals

**MVP goals**
- Add a book to an **existing** collection.
- Remove a book from an **existing** collection.
- Do it in **bulk** (a multi-select of books → one collection op).
- Apply changes safely against Amazon with a **confirm/preview** and per-item reporting.

**Non-goals (defer)**
- **Create / rename / delete** collections (needs additional MYCD API captures).
- Two-way live sync / conflict resolution beyond "re-fetch after apply."
- Editing collections for non-Kindle categories until their `category` values are captured.

## 3. Existing building blocks (why this is a small leap)

- **Bookmarklet + relay + Amazon API** is WR's established pattern (library fetcher,
  collections fetcher). A "collection editor" bookmarklet on the MYCD page is the same
  shape — same-origin `fetch` with `credentials: 'include'`, so **no auth/token handling
  in our code**; the browser attaches cookies automatically.
- **Collection IDs are already captured.** The Collections Fetcher stores each membership
  as `{id: collectionId, name: collectionName}` (`amazon-collections-fetcher.js:467-470`,
  `:777`). Aggregating `book.collections[]` across the library yields a complete
  **name → ID** map for every collection that has ≥1 member. (readerwrangler.js currently
  keys the collection filter only by `.name`, but the `.id` is right there in the data.)
- **Collections filter** already exists (`collectionFilter` / `selectedCollections`, with
  `UNCOLLECTED`) — the natural place to select the books to act on.

## 4. The Amazon API (captured)

**Endpoint:** `POST https://www.amazon.com/hz/mycd/ajax`
**Content-Type:** `application/x-www-form-urlencoded`
**Body:** `clientId=MYCD_WebService&csrfToken=<token>&data=<URL-encoded JSON>`

**Add** (`data`, before URL-encoding):
```json
{"param":{"AddContentToCollection":{"collectionList":[{"collectionId":"9eb0e097-3b13-4ac8-aaf8-253d562d4cf7"}],"contentList":[{"asin":"B00HVF7OL0"}],"categoryList":[{"category":"KindleEBook"}]}}}
```

**Remove** (`data`, before URL-encoding):
```json
{"param":{"RemoveContentsFromCollection":{"collectionList":[{"collectionId":"9eb0e097-3b13-4ac8-aaf8-253d562d4cf7"}],"contentList":[{"asin":"B00HVF7OL0"}],"categoryList":[{"category":"KindleEBook"}]}}}
```

**Notes / gotchas**
- ⚠️ **Operation names are asymmetric:** `AddContentToCollection` (singular *Content*) vs
  `RemoveContentsFromCollection` (plural *Contents*). Use the exact strings.
- `collectionList` / `contentList` are **arrays** — the API may accept multiple ASINs
  and/or collections per call (needs testing; if so, big batching win vs one call/book).
- `category` is `"KindleEBook"` for the captured e-book. Audiobooks / other formats use
  different category strings — **must be captured** before we support them. Each queued
  item carries its own category.
- **`csrfToken`** is page-scoped. The editor bookmarklet obtains it from the MYCD page
  context (scrape from the page/initial state, same technique the library fetcher uses for
  the reader API's token). Open question: exact location — see §9.

## 5. Architecture — the intent-queue pattern

This is the **same "delta journal → bookmarklet applies it" model** proposed for wishlist
adds in the relay write redesign. WR never talks to Amazon directly; it records *intent*,
and a bookmarklet on the right Amazon page executes it.

```
   WR (app)                         Relay (KV)                 MYCD Editor Bookmarklet
   --------                         ----------                 -----------------------
   user bulk-edits        writes    collection-edit    reads   fetch csrf from page
   collection  ───────────────────▶  queue key      ──────────▶ resolve name→ID (live)
   (optimistic local update)                                    POST each op to /hz/mycd/ajax
                          ◀───────  results/clear   ◀──────────  report success/failure
   prompt re-fetch / reconcile
```

**A. WR side (queue producer)**
- User selects books (existing multi-select) → "Add to collection ▸ X" / "Remove from
  collection ▸ X" (mirrors the Book List / folder menus).
- WR appends to a relay **`collection-pending`** queue (small, append-only — atomic KV put,
  no full-library RMW; see relay write redesign).
- WR **optimistically** updates local `book.collections[]` so the UI reflects the change
  immediately, marked provisional until confirmed.

**B. Editor bookmarklet side (queue consumer)** — on `…/hz/mycd/…`
- Read the `collection-pending` queue from the relay.
- Fetch a **fresh CSRF token** from the page.
- **Resolve `collectionName → collectionId` live** from the MYCD collection list (authoritative
  even if a collection was renamed on Kindle since the last fetch). Fall back to the WR-supplied
  ID if live lookup fails.
- POST each op (batched per collection/category where the array form allows), **throttled +
  retried** like the fetchers.
- Report per-item success/failure back to the relay; **clear only the applied items** (leave
  failures queued for retry — idempotent).

**C. Reconcile**
- After apply, WR's collection data is stale. Either keep the optimistic state and clear the
  "provisional" flag on success, or prompt a **Collections re-fetch** to confirm ground truth.

## 6. Data model — pending queue entry

```js
{
  op: 'add' | 'remove',
  asin: 'B00HVF7OL0',
  collectionName: 'read',      // resolved to ID at apply-time (live) — name is the durable key
  collectionId: '9eb0e097-…',  // hint from WR's captured data; bookmarklet may override
  category: 'KindleEBook',     // per-item; required by the API
  queuedAt: <ms>,
  status: 'pending' | 'applied' | 'failed',
  error?: '<message>'
}
```

Name is the **durable key** (survives ID drift); ID is a hint the bookmarklet can refresh.

## 7. Edge cases & risks

- **Undocumented mutation API.** Reading a broken API just fails; *writing* one can silently
  do the wrong thing to real Kindle org. This earns guardrails the read-only fetchers don't:
  preview/confirm, dry-run option, explicit per-item result log.
- **Rate limiting.** Many POSTs → throttle + backoff + retry (reuse fetcher's `fetchWithRetry`).
- **Category correctness.** Wrong `category` likely fails or no-ops. Ship Kindle e-books first;
  gate other formats behind captured category strings.
- **Partial failure.** Queue is idempotent — applied items cleared, failures retained for retry.
  Never mark an op done without a success response.
- **Optimistic-vs-reality drift.** If Amazon rejects an op WR already showed as done, reconcile
  on the next Collections re-fetch and surface a "N changes didn't stick" notice.
- **Destructive bulk.** "Remove 200 books from 'read'" must confirm with a count and be undoable
  in WR's own history (record an inverse op) even though Amazon has no undo.
- **Empty/new collections.** WR only knows IDs for collections with ≥1 member. Add-to a
  brand-new collection needs `CreateCollection` (out of MVP).
- **Ties to relay write redesign.** The queue should ride the same atomic/append-only relay
  mechanism — a torn write here corrupts the sync channel just like the wishlist case.

## 8. UX sketch

- **Entry points:** book multi-select context menu → "Add to collection ▸ / Remove from
  collection ▸" (parallels the Book List and folder submenus). A collection picker listing
  known collections (from aggregated `book.collections[]`).
- **Confirm/preview:** "Add 34 books to 'read'? They'll be applied next time you open Manage
  Your Content & Devices with the WR bookmarklet." (Async apply is honest — nothing hits
  Amazon until the bookmarklet runs.)
- **Status surfacing:** a small "N collection changes pending" indicator; the bookmarklet run
  reports "Applied 32, 2 failed (retry queued)."

## 9. Open questions

1. **CSRF token location** on the MYCD page — exact variable/element to scrape. (Capture the
   page source; the reader-API token-extraction code is a template.)
2. **Batch support** — does `contentList` accept multiple ASINs per call? (Test 2-ASIN add.)
   Big perf/rate-limit win if yes.
3. **Category strings** for audiobooks / comics / periodicals (capture add+remove for each).
4. **`CreateCollection` API** shape (for the later "create from WR" phase).
5. Does removing the **last** book from a collection delete the collection, or leave it empty?

## 10. Phasing

- **P1 (MVP):** add/remove Kindle e-books to/from existing collections; queue on relay;
  editor bookmarklet resolves IDs live, throttled apply, confirm + report; optimistic local
  update + reconcile-on-refetch. Depends on: relay atomic/append-only queue.
- **P2:** batching (multi-ASIN calls), other categories, retry UX polish.
- **P3:** create / rename / delete collections from WR.

## 11. Verdict

Feasible and architecturally consistent with WR's existing bookmarklet+relay model. The
once-scary part (ID↔name mapping) is already solved by captured data. Real work is the
guardrails and the apply/reconcile loop — appropriate for a **backlog** item, built on top
of the relay write redesign.
