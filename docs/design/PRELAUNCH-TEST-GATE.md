# Pre-Launch Test Gate — what must be test-locked before strangers' libraries ride on this

_Spec'd 2026-09-04 (while the bug classes were fresh); **executed when launch approaches, not now**.
Rationale from the project retrospective: Ron is a superb test suite for UX and a poor one for silent data
corruption — he diagnoses; strangers churn quietly. Every serious bug class this project has actually hit
lives in the data paths, and every one is the kind a characterization test catches mechanically._

## The rule

**UI never gets automated tests. The data layer must be test-locked before public launch.** The gate is
green when the suites below exist, pass, and run with one command (node, no browser), alongside the two
suites that already exist (organizeEngine: 16, relay harness: 59).

## Suites to build

### 1. Merge & edit-protection (storage.js) — the highest-value suite
The per-field merge in `saveBooksToIndexedDB(preserveUserData=true)` is where user data survives or dies.
Characterize, for every protected field (title, author, series, seriesPosition, onWishlist/ownershipType,
isHidden, binding, tags, note, myRating, priceTrigger/targetPrice, isDeleted/deletedAt/deletedFromFolderIds):
- local edit (userEdited flag) beats incoming value — forever
- incoming value wins when no local edit; incoming **blank never erases** a known binding
- userEdited flags UNION across devices; same-field conflict → local wins
- soft-delete OR-merges (a deleted book stays deleted through an import)
- wishlist→owned transition detected and reported
- **absence assertions** (Law: tests that assert absence): fields NOT in the allow-list still pass through
  or are deliberately dropped — pin the list so the next added field is a conscious decision
  (the orphanStatus strip hid for four months because nothing pinned the mapping)

### 2. Import mapping (the processedBooks allow-lists, both format branches)
- every carried field survives a round-trip (fetcher item → mapped book), pinned by snapshot — a new field
  added to the fetcher without a mapping entry FAILS a test instead of vanishing silently
- invented-token filters hold ('Kindle eBook' dies at the door) — migrations' inbound-filter pairs
- legacy-format branch parity for shared fields

### 3. Tombstones & deletion durability
- permanent delete → tombstone letter content correct
- a tombstoned ASIN does not resurrect through compose/import
- Empty-Trash prerequisite semantics; undo purge-by-mention (no undo entry references a purged book)

### 4. Load-path guards & migrations
- org (blob) restore is unconditional; loaders never write during load (the gated-writer pattern):
  simulate cold boot with empty books — folders/lists/searches survive; no default-stamping
- every migration is idempotent and paired with its inbound filter (run twice = run once)
- guest-guard logic (pure part): stale payload skipped, fresh payload accepted, stamp lineage preserved

### 5. Relay client semantics (extends the existing 59-test harness)
- already strong; add: boot-baseline/echo suppression characterization (a load-shaped setState wave must not
  mark device-state pending), keep-2 GC + orphan sweep edge cases if not already pinned

## Explicitly OUT of scope — permanently
React components, layout, dialogs, drag-drop, menus, copy, themes, fetcher-vs-live-Amazon behavior
(unautomatable; Phase-0 canaries + telemetry are the instruments there). Fetcher *parsing* of captured
fixture responses is optional stretch, not gate.

## Mechanics
- Plain node test files beside the existing two suites; extract pure logic where needed (the merge function
  is nearly pure already; the import mapping needs a small extraction — do it at gate time, not before).
- Estimated effort at gate time: 2-4 sessions. Not started before the pre-launch block opens.
- **Gate trigger**: add "test gate green" to the Pre-Launch section of TODO.md (done) — it blocks launch,
  nothing else.

## Why this scope and no more
Retirement-project economics: tests are insurance, and insurance is priced by who bears the loss. While the
only user is the author, the author's hands + alpha discipline + the harness are cheaper and better. The
moment strangers arrive, silent data-path failures stop being diagnosable incidents and become invisible
churn — that's the only risk worth pre-paying for.
