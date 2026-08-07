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

## Guard — never de-organize (file *in*, never pull *out*)
Extending scope from "Inbox" to "current folder" exposes a footgun: stand *inside an author's own tree* and pick **By Author**, and the flat target (the author root) is an **ancestor** of your current folder — so the books move *up*, flattening your series structure. That's the opposite of the tool's job, and a benign-sounding label ("By Author") makes it easy to click through the preview.

**Decision: guard it — silent-skip, not warn-and-proceed.** There's no legitimate "use Auto-Organize to dis-organize" case, so a warning just keeps the footgun one click away. Deliberately flattening an author (removing series subfolders) is **out of scope** — a separate, explicit action if ever wanted.

**Rule (purely structural — no folder "types" needed).** For each candidate, compare its computed **destination** folder to its **source** (current) folder:
- destination **== source** → skip (no-op — already exactly there),
- destination is an **ancestor** of source → skip (moving *up*/out = de-organize),
- destination is a **descendant** of source → allow (moving *deeper*, e.g. By Series root → series subfolder, is a real improvement),
- destination is a **different subtree** → allow (correcting a mis-file / graduating from a catch-all).

In one line: **Auto-Organize only moves a book *deeper into* or *across into* its proper author/series home — never up or out of an existing one.** (This generalizes the source-vs-destination collision from "same folder" to "same-or-ancestor.")

**Behavior:** guarded books drop from the candidate set. If *all* are skipped → toast *"Nothing to organize — already filed under their author."* If *some* → organize the rest; the preview shows only the actionable books.

| Standing in | Choose | Destination | Result |
|---|---|---|---|
| Mark Twain / Tom Sawyer | By Author | Mark Twain (ancestor of source) | **skip** — no flatten |
| Mark Twain / Tom Sawyer | By Series (series = Tom Sawyer) | same folder | **skip** — no-op |
| Mark Twain (root) | By Series (series = Tom Sawyer) | Mark Twain / Tom Sawyer (descendant) | **move** — deepen ✓ |
| Collections / Wishlist / Various Authors | By Author/Series | Mark Twain[/series] (different subtree) | **move** — graduate ✓ |

## Bonus this unlocks
The wishlist workflow becomes a right-click: inside *New To Read / Wishlist*, right-click a gap-filler → Auto-Organize By Series → it moves that author's Wishlist-folder books into their series folders → on purchase they **upgrade in place** (same-ASIN ownership upgrade). No new feature needed.

## Implementation plan (incremental, alpha per step, browser-test each)
_Step-3 read done — the move-out machinery already exists, so the plan is mostly plumbing plus the guard._
1. **`currentFolderSourceBooks(selectedFolderId)`** — new gatherer replacing `inboxSourceBooks()` in the Auto-Organize path:
   - real folder → `books` whose membership includes `selectedFolderId`;
   - `__inbox__` / `__all__` → unfiled (today's `inboxSourceBooks` logic);
   - a Book List id → `[]` (belt-and-suspenders; the menu is also hidden — step 6).
2. **Point `buildAuthorGroupsFromSelection`** ([:6931](../../readerwrangler.js#L6931)) and the **By-Series menu-gate `selectionAuthorsHaveSeries`** ([:6944](../../readerwrangler.js#L6944)) at the scoped set.
3. **Source move-out — parameterize the existing removal.** `computeOrganizePlan` already emits `REMOVE_BOOKS_FROM_FOLDER`, hardcoded to `__inbox__` ([organizeEngine.js:153-157](../../organizeEngine.js#L153-L157)); undo/redo already restore it **generically by `folderId`** ([readerwrangler.js:6079](../../readerwrangler.js#L6079)). Add `opts.sourceFolderId` (default `__inbox__`) and remove from *that* folder — undo restores it for free, and "remove from current folder only" falls out (single id). Inbox/All Books has no `__inbox__` folder holding ids → harmless no-op (the book just becomes filed). **Verify `allBookIdsToOrganize` covers the series + misc + author-root paths, not just the flat one**, so By Series removes from the source too.
4. **Guard — skip de-organize** (see *Guard* above). In `computeOrganizePlan`, skip any book whose target folder is the **same as or an ancestor of** its source folder (parentId-chain walk); drop it from candidates. All-skipped → *"already filed under their author"* toast.
5. **Dialog title** — thread the current folder's display name into `openAutoOrgPreview` / the preview label: *"Auto-Organize '<Folder>' — By Author / Series"*.
6. **Hide the menu item in Book List views** (and any non-folder, non-Inbox/All-Books view where scope is undefined).
7. **Regression check** — Inbox & All Books unchanged (scope = unfiled); folder invocation moves + undoes as one clean step; the guard blocks the flatten footgun; the "Nothing to organize" copy reads sensibly per scope.

## Resolved / to verify during build
- **Move-out** — confirmed feasible and small: parameterize the hardcoded `__inbox__` removal; undo is already generic. (Was the feared "meaty bit.")
- **Guard** — resolved: silent-skip via the same-or-ancestor rule (above), no warn-and-proceed.
- **Verify while coding:** (a) `allBookIdsToOrganize` completeness (step 3); (b) whether Auto-Organize currently appears in Book List context menus (if not, step 6 is a no-op guard); (c) a parentId-chain ancestor test is available for the guard (step 4).
