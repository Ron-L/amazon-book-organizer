# Ownership Model — facts, user states, transitions, and editing

_Companion to FORMAT-POLICY.md (same spirit: settle it once, never relitigate). Consolidates the
ownership decisions ratified 2026-09-04 → 09-07 during the ownership-honesty batch (TODO.md).
Supersedes the "Ownership model" section of BOOK-CONTEXT-MENU.md where they differ._

## 1. The model: two kinds of state

Every book has one `ownershipType`. The values split into two kinds, and the split decides every
rule in this document:

| Kind | Values | Who sets it | Hand-editable? |
|---|---|---|---|
| **Amazon facts** | `purchased`*, `sample`, `borrowed`, `prime`, `kindleUnlimited`, `koll`, `comixology`, `insideAmazon`, `publicLibraryLending`, `audiblePlus`, `unknown` | Fetcher, from the library record's `relationshipSubType` (+ pastPurchase upgrade) | **No** — hand-setting "Prime" would fabricate a fact |
| **User states** | `wishlist` ("I want it"), and `purchased` *as an override* ("I have it, Amazon's record is wrong/stale/absent") | User | **Yes — the only two legal targets** |

\* `purchased` is both: normally an Amazon fact; as a manual edit it's the user override.

**Why only these two targets** (Ron, 2026-09-07): restoring any *other* state by hand would require
knowing which fact to restore — we'd be guessing. `wishlist` is special because it is **never an
Amazon fact at all**: RW has NO connection to Amazon account wishlists (bitten twice by assuming
otherwise — see feedback memory). The wishlist is RW-native, fed by the wishlist-add bookmarklet
scraping product/series pages. So Wishlist is always the user's to set, and Owned is the user's
override for stale/missing records (manually-added books, misclassifications, purchases Amazon
recorded stale — see §5 of BOOK-CONTEXT-MENU.md for the original use cases).

**Legal manual transitions: anything → Owned, anything → Wishlist. Nothing else.**
Owned → Wishlist stays legal (2026-09-07): it's the mistake escape hatch — ownership edits stamp
`userEdited`, which *blocks* fetch correction, so without this exit a mis-click would be permanent
once undo is gone — and it's the truthful state for mis-defaulted records and orphaned husks the
user still wants.

## 2. The retired flag (`onWishlist`) and the invariant

**Ratified 2026-09-04, implemented 7.8.0-alpha.1 (item 0):** `onWishlist` ⟺ `ownershipType ===
'wishlist'` never legitimately diverged — the flag was a pure trap. It is retired as a decision
source. The single accessor:

```js
isWishlisted(book)  // ⇒ ownershipType === 'wishlist'  (+ fallback for pre-ownershipType books)
```

defined once in uiHelpers.js (app + storage.js + mobile.js share the page) and copied into the
fetchers that decide (pasted scripts share no modules). Kept forever:
- **Inbound normalization** (normalizeBook + mobile's item mapping): a book arriving with only the
  legacy flag gets `ownershipType='wishlist'` stamped. Old backups/letters present the flag
  indefinitely.
- **Wire emissions still carry the flag**, now *derived* from the accessor (self-healing), because
  old pasted library fetchers guard their orphan scan with `!b.onWishlist` — bookmarklet skew must
  not orphan-flag wishlist books.
- `userEdited.onWishlist` keeps its key name (it's a protection-flag key, not the data field).

## 3. Transition matrix (fetch-driven; ratified 2026-09-04)

| Transition | Amazon evidence | Handling |
|---|---|---|
| Wishlist → Sample / Borrow / KU / Loan | new library record | **Item 6** (update events): set type from record, clear the flag-couple, KEEP the price goal. Today: invisible (dup-skip discards the record) |
| Wishlist / Sample → Owned | new Purchase record (+stale sample record remains) | Item 6 direct; pastPurchase upgrade as backstop. Clears flag, keeps goal (item 3: goals are never silently destroyed) |
| Owned → anything (fetch-driven) | only stale old records | **Never downgrade purchased** (newest-record-wins = record date vs stored acquisitionDate) |
| Temp → Temp | newer record wins | Item 6 |
| Borrow returned / permadelete | record disappears | Not this machinery: returned-borrows feature (scoped 6.13.2, unbuilt) / orphan scan |
| Any → Owned / Wishlist (manual) | user edit | §4 below; stamps `userEdited.onWishlist`, which protects BOTH fields through every merge |

Promotion **reporting** (items 1/2): counts keyed on ownershipType transitions, labeled by
destination ("3 wishlist → owned, 1 wishlist → sample"), titles in console — a flag-flip alone must
never be announced as "now owned."

## 4. Editing ownership in the book dialog (designed 2026-09-07, pre-implementation)

### The problem
The edit dialog grew two ownership surfaces: a labeled mid-dialog row **"Ownership: [badge]"**
(read-only, both modes) and, in edit mode only, an unlabeled amber pill at the top that is secretly
a two-option select. Sole-user field test: Ron — who built it — concluded "ownership is not
editable in the dialog." The disguised control also *displays a false state*: on a Sample book it
reads "Wishlist Item"/"Owned" while the book is neither. Format has the identical
teleport-to-top-plus-decoy disease. No other field gets this treatment (Title/Author/Series/
Position/Note all edit in place).

### The design (from-scratch test applied)
1. **Every field edits where it lives.** In edit mode the labeled rows swap display for control:
   the Format row becomes the free-text input with datalist suggestions; the Ownership row becomes
   the dropdown. The top-of-dialog duplicates are removed. View mode unchanged (badges stay badges).
2. **The ownership dropdown shows the truth and offers only the legal moves:**
   - Selected option = the actual current state: `Sample (from Amazon)`.
   - Other options = the two user states: `Owned` · `Wishlist` (current line omitted when the
     current state already is one of them).
   - Tooltip teaches the one sentence: *"Amazon reports what you hold. Set Owned if you actually
     bought it, or Wishlist if you only want it."*
3. **`lastAmazonOwnershipType` — visible, instant reversibility** (Ron, 2026-09-07). Rationale:
   the no-field alternative ("Reset" merely clears `userEdited` and truth returns on some later
   background import) is two invisible actions with nothing visibly happening — indistinguishable
   from a broken button. So:
   - **Snapshot on first manual override**: before the edit replaces `ownershipType`, the current
     value is stored — only if no snapshot exists yet and the current value isn't `wishlist`
     (a user state needs no restoring). Later manual flips never overwrite the snapshot.
   - **Dropdown gains `Reset to Amazon's value (Sample)`** — names what it restores, only shown
     when a snapshot exists. Picking it applies immediately and visibly: `ownershipType` ← snapshot,
     `userEdited.onWishlist` cleared, snapshot cleared.
   - Undoable via the normal edit-save undo path (previousValues carries the new field).
   - **Phase 2 (rides item 6)**: the fetcher refreshes the snapshot from each walked record for
     userEdited-protected books, upgrading Reset from moment-of-override snapshot to Amazon's
     *current* truth. Until then: snapshot semantics, and books overridden before this feature have
     no snapshot (no Reset offered) — acceptable.

### Field-carrier checklist (the orphanStatus lesson)
`lastAmazonOwnershipType` must be threaded through every carrier or it silently dies:
storage.js merge (both branches) · backup export items · import mapping allow-lists (both format
branches) · device-state payload. Each site gets a comment; the field joins the test-gate's
absence-assertion list (PRELAUNCH-TEST-GATE.md suite 1/2).

## 5. Related decisions (recorded elsewhere, cross-referenced)
- Goals on promotion are KEPT + receipt (+ optional one-click clear) — TODO batch item 3.
- `TEMP_OWNERSHIP` must include `publicLibraryLending`/`audiblePlus` — item 7.
- Bulk edit (multi-select `Edit ▸`) keeps its Owned/Wishlist toggle — bulk-settable subset by
  design (BOOK-CONTEXT-MENU.md); the dialog is the single-book superset.
