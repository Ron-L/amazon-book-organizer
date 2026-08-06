# Auto-Organize scope — organize the *current folder*, not just the Inbox

_Design + plan. Drafted 2026-08-06. For review before build._

## Problem
Right-click Auto-Organize gathers candidates from `inboxSourceBooks()` — **books that are in no folder** (the Inbox / unfiled set) — regardless of where you invoked it ([readerwrangler.js:6922](../../readerwrangler.js#L6922), used by `buildAuthorGroupsFromSelection` at [:6931](../../readerwrangler.js#L6931)).

So when you right-click a book **inside a non-Inbox folder** (e.g. *New To Read / Collections* or *…/ Wishlist*):
- If the author happens to also have **Inbox** books, the preview shows *those* (not the ones you're looking at) — confusing.
- If the author has none in the Inbox (a one-off already filed here), you get **"Nothing to organize — those authors have no unfiled books."**

This surfaced trying to file **wishlist series gap-fillers** into series folders: they live in the *Wishlist* folder, so they're "filed," so Auto-Organize skips them. (It's not a wishlist issue — any already-filed book behaves the same.)

## Decision — scope to the folder you're standing in
Today's "Inbox-only" is just "current-folder-only where the current folder is the Inbox." Generalize it: **Auto-Organize acts on the books in the current folder, by the selected book's author(s).**

| Invoked from | Acts on |
|---|---|
| **A real folder** | that folder's books by the author → **move** to Author/Series home |
| **Inbox** | unfiled books (unchanged — today's behavior) |
| **All Books** | unfiled only (safe default; never sweeps across folders) |
| **A Book List** | **not offered** (category mismatch — see below) |
| **A Search** | rides the *underlying* folder / All-Books it filters (a Search is a lens, not a location; still ignores the active filter, as today) |

**Dialog title** gains the scope, e.g. *"Auto-Organize 'Collections' — By Series"*, *"Auto-Organize 'Inbox' — By Author"*. Makes the candidate pool self-evident.

## Why Book Lists are deliberately out of scope
What makes current-folder scoping *safe* is a tight invariant: **one source home → one destination home.** Folders satisfy it (a folder *is* a custodial home; the scope is a single source). A Book List breaks it on both ends:
- **The source isn't a home** — a list is a supplemental overlay; the book doesn't *live* there, so "move it out of the list" is meaningless (organizing wouldn't strip list membership).
- **The real sources are scattered** — the list's books live across many folders, so organizing "the list" reaches through the overlay and yanks each book out of wherever it actually lives = the unbounded cross-folder author-sweep this whole change exists to eliminate.

So auto-organizing a list quietly does the dangerous thing while looking safe. Excluding lists is a **feature**: supplemental queues stay immune to custodial restructuring.

> **Principle: Auto-Organize acts on custodial structure (folders). Book Lists are supplemental and deliberately outside its reach.** (Contrast the read-only "See where a book lives" popup, which *is* offered on lists — viewing works everywhere; *mutating* custodial homes belongs to folders only.)

## Confirmed semantics
- **Move-out is intended.** From the Inbox the book is *filed* (added to its new series folder, no source to remove). From a **real folder**, organizing **moves** it: remove from the current folder, add the Author/Series folder. Invoking from Collections *takes those books out of Collections* — that's the graduation. The preview's per-book selection is the keep-it-here escape hatch.
- **Multi-membership books affect only the current folder.** If a candidate is in the current folder *and* others, organizing removes it from **this** folder and adds the series folder, leaving its **other** memberships intact. (Consolidating to just the series folder would silently drop other filings — the exact behavior we're removing.)

## Bonus this unlocks
The wishlist workflow becomes a right-click: inside *New To Read / Wishlist*, right-click a gap-filler → Auto-Organize By Series → it moves that author's Wishlist-folder books into their series folders → on purchase they **upgrade in place** (same-ASIN ownership upgrade). No new feature needed.

## Implementation plan (incremental, alpha per step, browser-test each)
1. **`currentFolderSourceBooks(selectedFolderId)`** — new gatherer replacing `inboxSourceBooks()` in the Auto-Organize path:
   - real folder → `books` whose membership includes `selectedFolderId`;
   - `__inbox__` / `__all__` → unfiled (today's `inboxSourceBooks` logic);
   - a Book List id → `[]` (belt-and-suspenders; the menu is also hidden — step 5).
2. **Point `buildAuthorGroupsFromSelection`** ([:6931](../../readerwrangler.js#L6931)) and the **By-Series menu-gate `selectionAuthorsHaveSeries`** ([:6944](../../readerwrangler.js#L6944)) at the scoped set.
3. **Move-out in the apply path** — the meaty bit. `computeOrganizePlan` / `applyOrganizePlan` (organizeEngine.js) assume an Inbox source (no removal). Add: when the source is a real folder, the plan **removes each organized book from that folder** as it adds the Author/Series folder — and touches *only* that source folder's membership. Verify undo restores the source membership.
4. **Dialog title** — thread the current folder's display name into `openAutoOrgPreview` / the preview label: *"Auto-Organize '<Folder>' — By Author / Series"*.
5. **Hide the menu item in Book List views** (and any non-folder, non-Inbox/All-Books view where scope is undefined).
6. **Regression check** — Inbox and All Books behave exactly as before (scope = unfiled); folder invocation moves correctly; undo is one clean step; the returned "Nothing to organize" copy still reads sensibly per scope.

## Open / to verify during build
- Exact shape of `applyOrganizePlan`'s move vs add (step 3) — the only non-trivial code; confirm the source-removal is scoped and undoable before wiring the rest.
- Whether Auto-Organize currently even appears in Book List context menus (if not, step 5 is a no-op guard).
