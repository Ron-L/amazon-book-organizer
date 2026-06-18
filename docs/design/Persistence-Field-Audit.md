# Persistence Field Audit

**Status:** Audit / pre-design (Tier-2 input)
**Created:** 2026-06-18 (v6.12.0)
**Motivation:** Bugs #3 (folder `sortIndex` silently dropped on import) and #4
(`userEdited` edits reverting on relay import) were the same root cause: field
knowledge is scattered across many hand-maintained sites that drift out of sync.
This document inventories every persisted field × handling site × current
behavior, so we can decide whether/how to build a single field-policy registry
(Tier-2) and do it from facts, not guesses.

Tier-1 (done, alpha.29): folder + book-list serialization flipped from
allow-list to deny-list (spread-and-strip), killing the "forgot to add the new
field" class for those structural objects.

---

## 1. The handling gauntlet

A persisted field may have to be handled correctly in **all** of these places.
The bug class is: a field is added, but one of these sites isn't updated.

| # | Site | File / anchor | Direction |
|---|------|---------------|-----------|
| S1 | Live auto-save (organization) | readerwrangler.js `useEffect` ~L2900, `STORAGE_KEY` | state → localStorage |
| S2 | Live folder save | readerwrangler.js ~L3151, `FOLDERS_KEY` | state → localStorage |
| S3 | Live book-list save | readerwrangler.js effect, `BOOKLISTS_KEY` | state → localStorage |
| S4 | Book write/merge | storage.js `saveBooksToIndexedDB` ~L38 | state/import → IndexedDB |
| S5 | Backup export | readerwrangler.js `exportData` builder ~L4283 | state → file |
| S6 | Device-state payload | readerwrangler.js `buildDeviceStatePayload` ~L4234 | state → relay device-state |
| S7 | Relay library re-upload | readerwrangler.js ~L1803 (permanent delete) | state → relay library |
| S8 | Library/backup load (parse) | readerwrangler.js `loadLibrary` ~L4746 (new) / ~L4808 (legacy) | file/relay → state |
| S9 | Organization restore | readerwrangler.js `loadLibrary` ~L4989 | file/relay-localStorage → state |

**Forward book serializers (internal → external) that must agree:** S5, S6, S7.
**Inverse book parser (external → internal):** S8.
**Book merge policy:** S4.

---

## 2. Book fields

Books use an internal field shape that differs from the serialized ("fetcher")
shape. The rename map is duplicated in S5/S6/S7 (forward) and S8 (inverse).

### 2a. Internal ↔ serialized name map (the renames)

| Internal | Serialized | Notes |
|----------|-----------|-------|
| `author` | `authors` | |
| `ratingCount` | `reviewCount` | |
| `acquired` | `acquisitionDate` | |
| `userNote` | `note` | |
| everything else | same name | |

### 2b. Merge policy on import (S4, `preserveUserData=true`, previousBook branch)

Strategies:
- **take-incoming** — `...book`; Amazon/relay value always wins.
- **defer-local-if-edited** — `ue.X ? previousBook.X : book.X`; local wins only if `userEdited.X`.
- **prefer-incoming??local** — `book.X ?? previousBook.X`; incoming unless null/undefined.
- **or-merge** — `previousBook.X || book.X || default`; sticky once true.
- **union** — merge of both maps (userEdited only).

| Field | Authority | Merge strategy | User-protectable? | Notes |
|-------|-----------|----------------|-------------------|-------|
| `id` / `asin` | identity | take-incoming (stable key) | — | dedupe key |
| `title` | amazon | defer-local-if-edited | ✅ edit dialog | |
| `author` | amazon | defer-local-if-edited | ✅ | |
| `series` | amazon | defer-local-if-edited | ✅ | bug #4 was here |
| `seriesPosition` | amazon | defer-local-if-edited | ✅ | also set by "Number by current order" (alpha.26) |
| `onWishlist` | amazon/user | defer-local-if-edited (via `ue.onWishlist`) | ✅ ownership toggle | |
| `ownershipType` | amazon/user | follows `ue.onWishlist` | ✅ | |
| `addedToWishlist` | user | prefer-incoming??local | — | |
| `priceTrigger` | user | prefer-incoming??local | — | price goal |
| `targetPrice` | user | prefer-incoming??local | — | |
| `tags` | user | prefer-incoming??local | — | |
| `note`/`userNote` | user | prefer-incoming??local | — | |
| `myRating` | user | prefer-incoming??local | — | |
| `userEdited` | system | **union** | — | the protection map itself |
| `isDeleted` | user | or-merge | — | trash; sticky |
| `deletedAt` | user | or-merge | — | |
| `deletedFromFolderIds` | user | or-merge | — | |
| `description` | amazon | take-incoming | ❌ | not protectable |
| `coverUrl` | amazon | take-incoming | ❌ | |
| `rating` | amazon | take-incoming | ❌ | |
| `ratingCount` | amazon | take-incoming | ❌ | |
| `binding` | amazon | take-incoming | ❌ | wishlist default handled at parse (alpha pre-work) |
| `genres` | amazon | take-incoming | ❌ | |
| `currentPrice`/`listPrice` | amazon | take-incoming | ❌ | |
| `publicationDate` | amazon | take-incoming | ❌ | |
| `topReviews` | amazon | take-incoming | ❌ | |
| `readStatus` / `collections` | amazon (collections fetch) | take-incoming | ❌ | from collections map |
| `isHidden` | user | defer-local-if-edited | ✅ hide/un-hide | fixed in F4 (alpha.30); was phantom `hidden` |

---

## 3. Folder fields (Tier-1 deny-listed — alpha.29)

Stored folder objects carry only persistent fields; counts are computed
(`getFolderTotalCount`), drag state lives in separate React state.

| Field | Purpose | Notes |
|-------|---------|-------|
| `id` | identity | `__inbox__` is special-cased by id |
| `name` | label | |
| `bookIds` | custodial membership | normalized to `[]` |
| `parentId` | tree | `null` = root |
| `childFolderIds` | nested order | drop caused nested-order loss class |
| `sortIndex` | root order | **drop = bug #3** |
| `collapsed` | UI persistence | |
| `isInbox` | flag | redundant with id, but now preserved |

---

## 4. Book List fields (Tier-1 deny-listed — alpha.29)

| Field | Purpose |
|-------|---------|
| `id` | identity (`bl-<ts>`) |
| `name` | label |
| `bookIds` | curated, ordered membership |
| `position` | sidebar ordering among folders/searches |

---

## 5. Organization-level fields

| Field | Live store | In backup (S5)? | In STORAGE_KEY (S1)? | Restore (S9) behavior |
|-------|-----------|-----------------|----------------------|-----------------------|
| `folders` | FOLDERS_KEY **and** STORAGE_KEY | ✅ | ✅ (double-stored) | restore-if-present; relay import reads STORAGE_KEY copy |
| `bookLists` | BOOKLISTS_KEY only | ✅ | ❌ (not in STORAGE_KEY) | restore-if-present |
| `savedSearches` | STORAGE_KEY | ✅ | ✅ | restore-if-present (+ position offset) |
| `tagRegistry` | STORAGE_KEY | ✅ | ✅ | restore-if-present |
| `blankImageBooks` | STORAGE_KEY | ✅ | ✅ | restore-if-present |
| `hiddenInstances` | STORAGE_KEY | ? | ✅ | — verify |
| `dataSource` | STORAGE_KEY | ? | ✅ | — verify |
| `explorerSettings` | STORAGE_KEY | ✅ | ✅ | restore-if-present |

---

## 6. Findings (actionable)

- **F1 — Folders are double-stored** (FOLDERS_KEY + STORAGE_KEY.organization).
  Relay import restores from the STORAGE_KEY copy; normal load reads FOLDERS_KEY.
  This split is exactly what made #3 subtle (one copy kept `sortIndex`, one
  dropped it). Candidate: single source of truth.
- **F2 — bookLists is NOT in STORAGE_KEY.organization** (only its own key + the
  backup). If a future relay-import path ever rebuilds from STORAGE_KEY org,
  book lists would be invisible to it. Today it's saved by its own effect, so OK,
  but the asymmetry with folders is a trap.
- **F3 — The book rename map is triplicated** (S5/S6/S7 forward, S8 inverse).
  Four hand-kept copies of the same internal↔external mapping. Prime Tier-2 target.
- **F4 — `hidden` vs `isHidden` mismatch in the merge.** ✅ **RESOLVED (alpha.30).**
  storage.js S4 read a phantom `book.hidden`; the real field is `isHidden`, which
  was carried only via `...book` (take-incoming), so a fresh Amazon fetcher import
  (reports `isHidden:false`) silently un-hid hidden books. Fixed by making
  `isHidden` a user-owned protectable field (Option 2): the 5 write sites set
  `userEdited.isHidden`; merge is now `ue.isHidden ? previousBook.isHidden : book.isHidden`.
  A sibling bug — the "show hidden" filter at ~L7827 testing the same phantom
  `book.hidden` — was fixed in the same pass.
- **F5 — Only 6 fields are user-protectable** (title, author, series,
  seriesPosition, onWishlist, isHidden) because the edit dialog / hide actions set
  `userEdited` only for those. Any future "edit this Amazon field" UI must also set
  the flag, or it silently reverts (the #4 pattern).

---

## 7. Toward Tier-2 (field-policy registry)

A single declarative table per object type, e.g.:

```js
const BOOK_FIELDS = {
  title:        { ext: 'title',           authority: 'amazon', merge: 'defer-local-if-edited', persist: ['relay','backup'] },
  author:       { ext: 'authors',         authority: 'amazon', merge: 'defer-local-if-edited', persist: ['relay','backup'] },
  ratingCount:  { ext: 'reviewCount',     authority: 'amazon', merge: 'take-incoming',          persist: ['relay','backup'] },
  isDeleted:    { ext: 'isDeleted',       authority: 'user',   merge: 'or-merge',               persist: ['relay','backup'] },
  // ...
};
```

The forward serializers (S5/S6/S7), the inverse parser (S8), and the merge (S4)
are then **generated** from this one table — collapsing F3 to a single source
and making F1/F2/F4/F5 visible as explicit policy rather than buried code.

**Safety net before doing it:** a round-trip test — `serialize → parse → merge`
against a fixed book/folder fixture, asserting field-by-field equality and
correct merge outcomes (edited field kept, Amazon field updated, trash sticky).
A wrong policy then fails loudly instead of silently corrupting data.

**Sequencing:** defer the registry until after the Book Lists redesign ships,
so we're not refactoring the most data-critical code while adding new fields.
F4 (the `hidden`/`isHidden` mismatch) is independent and can be fixed sooner.
