# Auto-Organize Unified — one view, selection is the scope

_Designed 2026-09-08 (Ron + UX review, aligned before any code). Supersedes the mode split of
AUTO-ORGANIZE-SCOPE.md (its safety principle survives as the DEFAULT, see §4); builds on
AUTO-ORGANIZE-RIGHTCLICK.md and the 6.16/6.17 preview. Priority: jumped ahead of the
ownership-honesty batch items 1-9/11 — live daily pain during Ron's queue-folder dissolution,
and the soak doubles as the test rig._

## 1. The problem (origin story, worth keeping)

The dialog had two modes — This folder ↔ Everywhere — switched by a six-pixel toggle. Three weeks
after co-designing it, its own designer, mid-dissolution, stared at a This-folder preview that
DISPLAYED the Inbox books it could act on and concluded the capability didn't exist ("it won't
offer to auto-organize those in Inbox... by design"), then invented the Everywhere mode from
scratch as a feature request. The third invisible-control finding in one week (disguised ownership
pill, dead-feeling Ctrl+Z, now this). Additionally the two modes render the same books in
different order and emphasis; This-folder's origin-trays group by where books happen to sit
(noise) instead of where they're going (the point); and This-folder cannot sanely render
multi-folder membership.

## 2. The unified model

**Scope is a property of the SELECTION, not a mode.** One view, one working set:

- **Layout = the Everywhere layout** (destination-grouped: author → series groups → covers),
  which both parties judged clearer. Origin never regroups anything.
- **Everything by the target authors is visible**: current-folder books, strays from other
  folders/Inbox, and already-home books. Nothing actable is hidden — the discoverability fix is
  structural, not a better toggle.
- **Initial check-state = the current folder's books** — exactly today's safe default, so the
  dialog opens meaning what it always meant. Ctrl+A (plus a visible **Select all** button — the
  button teaches that expansion exists) checks everything; group checkboxes select their trays;
  Shift+click ranges follow VISUAL order.
- **The one selection drives BOTH actions** (extends the 6.16.0 principle): right-click → Add to
  Book List acts on it, and the footer button organizes it.
- The This-folder/Everywhere toggle is deleted. The Consolidate title/verb is retired (§6).
- Entry points unchanged (right-click a folder / All Books); from All Books the "current folder"
  contribution to defaults is simply empty.

## 3. Three-level checkbox hierarchy (Ron's design)

Same semantics at every level — a checkbox checks everything beneath it:

| Level | Control | Checks |
|---|---|---|
| Series/group | group checkbox | all its books |
| Book | cover check | all its removable sources (per §4 defaults) |
| Source | the origin popup | individual folder memberships |

- **Origin caption**: under each stray cover, one small gray line in the existing caption style —
  `⌂ Inbox`, or `⌂ Inbox +2` for multi-source. Current-folder books carry no caption. The caption
  anchors the popup and, after an override, shows the NET effect in words: `removes from Inbox ·
  stays in Non-Fiction`. **Words, not glyphs** (a ✂ was field-misread as "%<" during design).
- **Origin popup**: hover/click the caption → the book's folders, each with a checkbox (checked =
  remove when organizing). Reuses the 6.13.2 cursor-corner/hover-intent popup machinery — proven,
  no new hover behavior.

## 4. Removal defaults (the de-organize guard, generalized)

Checking a book means: **ensure home membership + remove from the CURRENT folder and the Inbox.
Every other membership is KEPT by default** — the popup is the override.

Why: the current folder is definitionally the mess being cleaned; the Inbox is never a home
(organizing-principles doctrine); every other folder is a potential deliberate dual-home
(Non-Fiction + author folder), and silently stripping those is the de-organize disaster class
AUTO-ORGANIZE-SCOPE existed to prevent — its principle survives here as the default rather than a
hard scope boundary. The rule self-corrects across dissolution passes: membership in another
queue-folder survives today and gets cleaned when the user runs AO from THAT folder. From All
Books: Inbox-only removal + gather. If a kept membership is wrong, one popup click cuts it.

## 5. Already-home books

Shown **small + grayed** with their group ("already here"), **selectable** — so Book-List ops can
include them — and a **no-op on commit**. This subsumes the old three-state trays and answers
"what's already in the target?" in place.

## 6. Button honesty

The button counts **actual movers, never the selection**: `Organize 4 books`, with the footer
caption reconciling: "6 selected — 4 will move, 2 already home." The verb is **Organize**
everywhere; "Consolidate N books" dies with the mode that named it.

## 7. Edge cases (settled)

- Series-A book sitting in series-B's folder, or loose in the author root when it belongs in a
  series subfolder: simply *not home* → normal full-size mover. No special case.
- Multi-copy rendering: books are single entities with N memberships — one cover, one caption,
  popup for the rest. (This-folder mode would have multiplied covers; unified view can't.)
- The 6.17.0 per-(folder,book) copy-pick machinery becomes the popup's state model.

## 8. Engine + migration notes

- `organizeEngine` gains per-book removal sets (folderIds to remove from) in place of the
  mode-driven `sourceFolderId`/`consolidateRemovals` split; existing subtree-exclusion and
  wouldDeOrganize guards unchanged.
- 7.7.1's grouped Already-filed layout is absorbed into §5's already-home rendering.
- Batch item 12 (This-folder multi-select repair) is MOOT — that view is deleted. The
  visual-order range-select fix lands here instead (§2).
- Undo: stays ONE `WIZARD_ORGANIZE` compound (positional restore incl. removed memberships),
  label per UNDO-MODEL naming ("Organized 6 books for Wesley Chu").

## 9. Test plan sketch (at build time, precise values per Rule 4)

Wesley Chu fixture (Ron's live case): Wishlist folder = 1 book, Inbox strays = 5, expect: dialog
opens with 1 checked / 5 visible-unchecked with `⌂ Inbox` captions; Select all → button reads
`Organize 6 books`; commit → all six under their series homes, Inbox memberships gone, Wishlist
folder emptied of them; one Ctrl+Z restores every membership.
