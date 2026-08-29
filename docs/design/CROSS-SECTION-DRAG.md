# Cross-section drag: Folders ↔ Book Lists (spec)

_Status: **DECIDED 2026-08-29, not built.** Separate work package from folder-ordering Phase 2/3
(same recon session, different branch/scope). Findings verified in code 2026-08-29._

> "A foolish consistency is the hobgoblin of little minds." — the design principle below was
> challenged head-on and ratified with conviction; see **The naming rule** before re-litigating.

---

## Current behavior (audited 2026-08-29)

What works (keep):
- **Book(s) → Book List row** (left pane): adds to the list, book stays put, dedup, honest toast.
- **Book(s) list → list**: moves between lists; Ctrl/Cmd copies.

What's broken (fix):
- **Book from a Book List view → folder**: behaves as a *copy* (book keeps its custodial home AND
  stays on the list — `moveItems`' source-removal matches no folder for `__booklist_…` sources)
  but the toast says "Moved" and undo records a move. **Reporting lies; behavior is correct.**
- **Folder → Book List row**: left pane silently no-ops with an accepting cursor; right pane shows
  a real copy highlight then silently discards the folder on drop.
- **Book List row dragged anywhere outside its section**: no-op wearing costumes — folder rows show
  reparent rings/insert lines, book rows can fire bogus sort toasts. Root cause: blanket
  `preventDefault` on the left-pane container (readerwrangler.js:12776) + unconditional ones on
  right-pane rows make **everything look droppable everywhere**.
- **Book List reorder is not undoable** (`reorderBookLists` has no `recordAction`) — same defect
  family as the sidebar folder-reorder undo-shape mismatch found the same day.
- Nits: list→list move toast over-reports when some books were already present; drags from Trash
  add (invisible) deleted books to lists.

## Decisions (ratified by Ron 2026-08-29)

**Principle: folders are custodial, lists are supplemental — cross-section drags are additive, and
the UI never fakes an affordance.**

1. **Book → list / list → list: keep as-is**; fix the over-count toast and the Trash leak.
2. **Book from list view → folder: keep additive** (removing a custodial home from a list view
   would be guesswork — which home?). Make it honest: toast "Added to X", undo records a copy.
   Filing (a true move) is done from a folder view where the source is unambiguous.
3. **Book List dragged outside its section: reject visibly** — no accept cursor, no rings, no
   toasts. Kill the blanket/unconditional `preventDefault`s. Make list reorder undoable.
4. **Folder → existing Book List row = ADD** that folder's books (subfolders included, dedup free).
   Ring highlight on the row.
5. **Folder → BETWEEN Book List rows = CREATE a new list there** (insertion caret = visible
   affordance; position chosen in the same gesture — Ron's improvement over a drop-on-header
   target). The section header area also creates (lands at top).
6. **Books dragged between rows also create** — the whole surface is one sentence: *drop ON a list
   to add; drop BETWEEN lists to create there — from whatever you're holding.*
7. **Multi-folder drag**: onto a row → union add. Between rows → **one new list per folder**, each
   named after its folder. Batch-create skips rename-in-place (names already meaningful);
   single-folder create opens with the name preselected (one-keystroke fix).

## The naming rule — "the name describes what you grabbed"

- **Drag a folder** → new list is **`<folder name> - To Read`, period.** The engine is NOT
  consulted. The folder is the noun in the user's sentence and its name is their own curated label.
- **Right-click a selection of books** → engine as today (common author → common series), plus a
  NEW fallback: **the current folder's name** when the engine finds nothing (selection can't span
  folders, so "the folder I'm standing in" is always well-defined). Blank only in non-folder views
  (All Books / search / list).

**Why the two gestures differ on purpose** (challenged head-on by Ron, ratified): they are not the
same operation from different entry points — they have different *inputs*, and the name describes
the input. Run the unified rule and watch it fail: drag a folder named **"Beach Reads 2026"** (six
books, four by one author) and an engine-named result — *"Jodi Taylor - To Read"* — overrules the
user's own label with a coincidence. Mirror case: select just the four Taylor books inside that
folder and right-click → New; there *"Jodi Taylor - To Read"* is exactly right, because authorship
is *why those four were picked*. Each rule is optimal in its context; unifying makes one context
strictly worse. Users never A/B their own gestures — they judge each result against intent in the
moment, and both rules pass. Both are suggestions in a preselected rename field: worst case of any
wrong guess is one keystroke.

## Build notes (from the audit)

- Book List rows exist only in the left pane; context menu (readerwrangler.js:17584) and
  auto-organize preview (11127) are the other add paths.
- Book List row drop handler: readerwrangler.js:13120/13135 (accepts x-rw-booklist + x-rw-items).
- Folder dragstart types differ by pane: left = x-folder-reorder only (13480); right = also
  x-rw-items carrying folderIds (14909/15640) — that's how folders sneak into the list handler
  and get silently filtered (13143).
- `reorderBookLists`: readerwrangler.js:2410. Suggestion engine for list names: the Add to Book
  List → New path (~17584 region).
