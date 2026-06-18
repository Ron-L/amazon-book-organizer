# Book Lists / Searches — Implementation Plan

**Companion to** [BookLists-Searches-Redesign.md](BookLists-Searches-Redesign.md) (the spec). This is the *how and in what order*. Build only after the spec is confirmed; **dev-first**, alpha-per-phase, manual testing (no automated suite — it's parked).

> **Line numbers below are as-of investigation against `readerwrangler.js` / `mobile.js` at v6.11.9. Verify before relying — the file changes.**

---

## 1. Current state (grounded facts)

What exists today, confirmed by code investigation:

**Saved "views"** — `savedViews` React state, shape `{ id, name, filters, position, bookOrder?, description? }` (~L562, created ~L1057-1075). Persisted in localStorage (`STORAGE_KEY`), backed up under `organization.savedViews` (~L4291), included in the mobile relay payload (~L4176).
- A **tag view** is a saved view where `v.id === tagId`; it carries a `bookOrder` array for manual ordering. Regular filter views have no `bookOrder`.

**Folders** — `{ id, name, bookIds[], parentId, collapsed, childFolderIds }`, persisted via localStorage `FOLDERS_KEY`, backed up under `organization.folders`.

**Delete / Trash / Undo** — *two separate mechanisms, both already capture folder membership:*
- **Soft delete** (~L1507-1618) builds `folderMembership = { bookId: [folderId,…] }`, removes the book from every folder's `bookIds`, and stamps the book with `isDeleted`, `deletedAt`, `deletedFromFolderIds`.
- **Trash** persists via those on-book fields (survives reload, syncs to mobile).
- **Ctrl+Z undo** uses an in-memory action stack; the `SOFT_DELETE_BOOKS` action stores the full `folderMembership` map. Restore (~L5632-5662) re-adds the book to each folder.
- ⚠️ **These are two code paths that must stay in sync** — the redesign's "restore rebuilds the full placement set" requires updating *both*.

**Backup** — `schemaVersion: "2.3"`, top-level `books` / `organization` / `collections?` / `relay?`. `organization` holds `folders, explorerSettings, tagRegistry, savedViews, hiddenInstances, blankImageBooks, appVersion`. On restore, unknown fields are silently dropped.

**Tag-view drop / remove** — drop routes to `reorderBooksInTagView` (~L1954-1979, called ~L13710) which mutates `savedViews[n].bookOrder`. DEL in a tag view (~L3432-3456) **strips the tag** from the book.

**Mobile (`mobile.js`)** — *does NOT use `savedViews`.* Its drawer shows Dashboard, All Books, Inbox, **pinned tag views**, and the folder tree. Pinned tags come from a separate `pinnedTagFolders` array (`{ tagId, position }`), received via `org.pinnedTagFolders` in `restoreOrganization()` (~L67-101). The relay payload includes `savedViews`, but **mobile ignores them.**

---

## 2. Target data model (the diff)

| Concept | Today | Target |
|---------|-------|--------|
| **Searches** | `savedViews` (live filters) | **Reuse it** — rename `savedViews` → `savedSearches` for clarity. Shape `{ id, name?, filters, position }`. Drop `bookOrder` (that was tag-view membership ordering; Searches are live, no stored membership). `name` becomes optional. |
| **Book Lists** | — (new) | New `bookLists` state, shape `{ id, name, bookIds[], position }` — folders minus hierarchy. New localStorage key `BOOKLISTS_KEY`; backup field `organization.bookLists`. |
| **Tag views** | `savedViews` where `id===tagId`, `bookOrder` | **Removed.** The "filter by a tag" use case is just a Search with `filters:{tags:[tagId]}`. |
| **Trash/undo** | captures `folderMembership` / `deletedFromFolderIds` | **Extend** to also capture book-list membership: add `bookListMembership` to the undo action and `deletedFromBookListIds` to the book. |
| **Backup schema** | `"2.3"` | Bump to `"2.4"`: add `organization.bookLists`; `savedViews` → `savedSearches`. Restore of ≤2.3 **drops** legacy `savedViews`/tag-views (no migration, N=1) and initializes empty `bookLists`. |

---

## 3. Decisions (resolved 2026-06-15)

1. **Mobile scope.**
   - **Book Lists on mobile? → YES.** They're curated reading lists — exactly the "pick my next read on the couch" use case. They carry `bookIds`, so syncing/displaying them is structurally like folders (read-only). Low complexity. Built in Phase 8.
   - **Searches on mobile? → DEFERRED.** Mobile is a read-only viewer that today doesn't execute saved filters at all; running live searches there is real new work. Ship mobile Book Lists now; revisit Searches later (or never).
   - **Mobile's `pinnedTagFolders`? → LEAVE AS-IS.** Don't expand scope this redesign. (A pinned tag is conceptually a live filter `{tags:[tagId]}` = a Search; folding it into the Searches model is deferred along with mobile Searches.)

2. **Rename `savedViews` → `savedSearches` internally? → YES.** Clarity for future maintenance, accepting the cost of touching every call site. Done as its own clean step in Phase 1.

3. **Legacy backup handling? → DROP legacy views on restore** (per spec decision #15), initialize empty `bookLists`. The few existing tag/filter views are not migrated — acceptable at N=1.

---

## 4. Phased build plan (one alpha per phase, each independently testable)

**Phase 1 — Data model & persistence (no user-visible behavior yet).**
- Add `bookLists` state + `BOOKLISTS_KEY` persistence (mirror folder load/save).
- Rename `savedViews` → `savedSearches`; drop `bookOrder`.
- Bump backup schema to `2.4`; serialize `bookLists`; restore drops legacy `savedViews`/tag-views, inits empty `bookLists`.
- Extend delete/trash/undo plumbing to capture + restore `bookListMembership` / `deletedFromBookListIds` (wire it even before list UI exists).
- **Test:** backup→restore round-trip preserves everything; restoring an old 2.3 backup doesn't crash and silently drops old views.

**Phase 2 — Sidebar restructure (render only).**
- All Books standalone top item; **Searches** group (renders `savedSearches`); **Book Lists** group (renders lists, read-only for now); Folders unchanged. Remove the old "Views" section + its drop zone (~L11229-11290).
- **Search click semantics (revised 2026-06-18, see Redesign doc):** clicking a Search **restores its saved filter state in place** (sets the filter bar to its chips, stays in the current folder) — it does NOT navigate to a library-wide virtual view. Result = current folder + filters, identical to typing the filters by hand. This removes the `isViewFolder` virtual-view navigation (already slated for Phase 7 cleanup); update the click handler when wiring Phase 4/5.
- **Test:** existing saved filters now appear under Searches and run on click; layout correct in light/dark.

**Phase 3 — Book Lists CRUD + membership.**
- `+` on Book Lists header → empty named list (inline rename like folders); rename; delete.
- Drag visible book rows into a list → mutate `bookIds` only (**no tag, no tag toast**).
- Right-click Remove → from this list only (**never untag, never trash**).
- Manual ordering within a list.
- **Test:** create/add/remove/reorder/delete; explicitly verify remove-from-list never trashes or untags, even when it's the book's only list.

**Phase 4 — "Save these results…" control.**
- Visible control in the Active Filters banner (~L8388, replacing the discoverability of the hidden drag handle ~L8427): **Save as a Search** (saves the current filter state; re-applies in place when opened) / **Save as a Book List** (snapshot of the **currently displayed** matches — folder + filters) / **Add to an existing Book List**. Dedup on add.
- Button shows the live match count; the two Book List actions disable at 0 matches; **Save as a Search** stays enabled (saving an empty-result filter is valid).
- Drag handle stays until Phase 7.
- **Test:** all three paths; duplicates discarded; snapshot is frozen (later tag/filter changes don't alter it); saved Search re-applies filters in the current folder (recalled == typed).

**Phase 5 — Searches behavior polish.**
- Recents in the search-bar dropdown (ephemeral; commit on debounced text, dedup by the canonical filter key already used for view dedup); saving graduates one to the Searches sidebar group (persistent).
- Optional naming; named shows name, unnamed shows truncated chips, full chips on hover.
- **Test:** recents don't thrash on keystrokes; saved searches persist; naming optional.

**Phase 6 — Delete / Trash / Undo full integration + warnings.**
- Last-custodial-copy delete warns and discloses Book List fallout; non-last-copy is silent; restore (Trash) and undo (Ctrl+Z) both rebuild folders **and** book lists from the captured set; toast names both.
- **Test matrix:** last-copy-on-lists / last-copy-not-on-lists / not-last-copy; Trash-restore vs Ctrl+Z both rebuild identically.

**Phase 7 — Remove old paths & cleanup.**
- Delete: filter-bar grab handle (~L8194), Tag Manager row handle (~L14738), `reorderBooksInTagView` (~L1954), tag-view drop (~L13710), DEL-strips-tag (~L3432), `isViewFolder` / `getViewTagId` / `autoNameView` and other now-orphaned helpers.
- Grep for orphaned references after removal.
- **Test:** nothing references removed code; app clean.

**Phase 8 — Mobile (Book Lists only; Searches deferred per §3.1).**
- Include `bookLists` in the relay payload (~L4090-4193) and accept it in `restoreOrganization()` (mobile.js ~L67-101); add a read-only Book Lists drawer section.
- Searches: **not** built on mobile this round. `pinnedTagFolders` left unchanged.
- **Test:** desktop→mobile sync shows Book Lists; tapping browses members; mobile read-only intact; pinned tags still work.

**Phase 9 — Docs / help / tooltips / CHANGELOG alignment.**
- features.html, README.md (+ index.html mirror), USER-GUIDE.md, in-app help/tooltips, CHANGELOG (with the custodial-vs-supplemental + snapshot-before-delete technical note), and the sizzle-reel script.

---

## 5. Risk areas

- **Dual delete/restore paths** — Trash (on-book fields) and Ctrl+Z (action stack) must *both* learn book-list membership, or restore diverges. This is spec decision #14's whole point; it's the highest-risk refactor.
- **`savedViews`→`savedSearches` rename** — touches many call sites; do it as its own clean step (Phase 1) and grep aggressively, or alias temporarily.
- **Backup compatibility** — old 2.3 backups carry tag-views; restore must not choke. Decide drop-vs-migrate up front (§3.3).
- **Mobile divergence** — `pinnedTagFolders` is a separate concept from `savedViews`; don't accidentally couple them during the rename.
- **No automated tests** — every phase relies on the manual checklist above. Don't skip the delete-matrix in Phase 6.

---

## 6. Rough sizing

Desktop core (Phases 1-7): the bulk of the work, many alphas — this is a multi-session feature, not a one-sitting change. Mobile (Phase 8) and docs (Phase 9) are smaller but real. Phase 1 and Phase 6 are the trickiest; Phases 2-5 are mostly additive UI.

---

## 7. Suggested first move

Resolve the §3 open decisions (especially mobile scope), then start Phase 1 on a `feature/book-lists` branch, dev-first. Phase 1 is invisible to the user but de-risks everything downstream (data model + the delete/restore plumbing), so it's the right foundation to test thoroughly before any UI lands.
