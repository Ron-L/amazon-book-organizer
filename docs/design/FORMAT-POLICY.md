# Format Policy — and the Amazon Library API Facts Behind It

**Ratified**: 2026-09-04 (Ron + Claude), after the 2026-09-03 live investigation.
**Shipped in**: fetcher v5.3.0 + app 7.7.0-alpha.12/13.
**Purpose of this doc**: we spent a full day establishing these facts empirically, twice
walked past plausible-but-wrong explanations, and do not want to relitigate any of it.
If you are about to reintroduce a format filter, a count comparison, or an "orphan"
theory — read this first.

---

## The Policy (four rules)

1. **Capture everything the library API lists. Never judge format.**
   No allow-lists, no deny-lists, anywhere, ever. Amazon's format vocabulary is an
   unbounded folksonomy — a real children's book in Ron's library ("Sneakers, the
   Seaside Cat", bought with a plush toy) is formatted **"Shoes"**. Any list of "real
   book formats" silently drops real content the day Amazon invents a label
   ("Spiral-bound" cookbooks are books), and non-book physical purchases (maps, a DVD)
   legitimately appear in the listing anyway. Users control visibility with folders,
   filters, and edits — Ron's "Ignore - Not Kindle" folder was the right UX all along.

2. **Record the binding VERBATIM — or nothing.**
   An odd label is information; a nulled or defaulted one is a lie. The old app-side
   default `'Kindle eBook'` (never a real Amazon value) was worn by 262 of Ron's books
   including physical maps; it is gone (7.7.0-alpha.12) and a fleet migration clears it
   from existing databases (**kept indefinitely** — field users update on their own
   schedule; see the dated comment in `loadData`).

3. **Precedence chain, top wins: user edit → fetched verbatim → blank.**
   - Format is user-editable (single dialog + bulk Edit, 7.7.0-alpha.13), guarded by
     `userEdited.binding`: an edited Format wins over every fetch, forever
     (per-field merge in storage.js).
   - Blanks self-heal: the orphan scan already carries every book's binding, so it
     backfills blank Formats with Amazon's verbatim value at zero request cost
     (fetcher v5.3.0), shipped via the existing follow-up run.
   - An incoming **blank** never erases a known value (merge rule).

4. **Existence-verification is BINDING-BLIND. Presence is presence.**
   The orphan scan's verification set must include every ASIN the walk returns,
   regardless of format. See the false-orphan post-mortem below.

## The False-Orphan Post-Mortem (why rule 4 exists)

For months, 13 present books (5 maps, a DVD double-feature, gift children's books, the
Shoes book) were flagged "no longer in your Amazon library" on every scan. The cause was
a copy of the capture-side format filter inside the verification loop: the scan **saw**
the maps on every walk and refused to record their presence (binding "Map" not in
`BOOK_BINDINGS`), then judged RW's copies (wearing the fake "Kindle eBook" default —
"books"!) against the gutted set. The trigger was Amazon's own format cleanup: when
"Kindle eBook"-era items were reclassified (Map / Shoes / CD), they left the allow-list
and the flags began. Capture hygiene and existence-verification are different jobs;
sharing a filter between them was the whole bug.

Eliminated on the way to this diagnosis (do not re-suspect without new evidence):
Amazon deletions (zero), filter-hiding of the maps (present in the filtered walk),
and cursor-pagination loss (see below).

## Amazon Library API facts (established live, 2026-09-03)

Endpoint: `POST amazon.com/kindle-reader-api`, GraphQL `getCustomerLibrary.books`,
same API the /yourbooks page uses (verified by captured page requests).

- **`totalCount` counts acquisition RECORDS, not titles.** Ron's library: 2816 records
  = **2801 unique ASINs + 15 duplicate records**. Each dupe is a *sample-then-purchase
  pair* — Amazon keeps both records; the fetcher keeps the newer (purchase) and skips
  the older with the `🔁 Duplicate ASIN` line. Never compare `totalCount` to anything;
  use it only as a progress estimate.
- **The stock `NOT (222711ade… OR 858f501de…)` selectionCriteria filter is Amazon's
  own** (present in the page's requests; in our query since reverse-engineering).
  Probed live: `858f501de…` tags exactly 13 **product-null husks** (dead records — no
  title, no binding, unfetchable; likely deleted-sample corpses); `222711ade…` tagged
  nothing. **Keep these filters**: they hide only garbage. They do NOT hide any real
  book (the maps pass through them).
- **Cursor pagination is SOUND.** The `after` cursor is base64 JSON
  `{"o":offset,"sav":[acquisitionTimestampMs,asin]}`. Full walks at page size 30 and 50
  returned byte-identical complete sets (2801 unique each, zero missing either way).
  101 tied-timestamp clusters covering 279 books (multi-item orders) exist and are
  harmless. The "listing flicker" folklore from fetcher development should not be
  attributed to pagination without fresh evidence.
- **The exact-match invariant**: with the right units — unique owned-title ASINs, same
  filtered universe, wishlist excluded from RW's side — Ron's library matches Amazon
  **exactly (2801 = 2801)**. Any future "discrepancy" that can't name its unit
  (records vs titles vs titles+wishlist) is bookkeeping confusion, not data loss.

## Consequences elsewhere

- The count-triggered 🩹 recovery sweep compared titles+wishlist (3138) to records
  (2816) — structurally never equal; its retirement + the set-exact redesign and the
  two-directional "Removed-books check" report are specced in TODO.md.
- `stats.formatsSeen` replaced `nonBooksFiltered` in the fetch summary: observability
  without judgment.
- App-side format surfaces (Format column/sort, edit dialog datalist) treat the value
  as free text drawn from the library's own vocabulary.
