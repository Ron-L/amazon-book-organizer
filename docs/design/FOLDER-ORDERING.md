# Folder-ordering model (+ generic orderable left-pane sections)

_Moved verbatim from TODO.md during the 6.12.0 TODO restructure (2026-08-03). **Phase 1 shipped in 6.12.0**
(folderListSort + FOLDERS-header sort control + right-pane Folders view mirror + Move/Copy tree mirror,
alphas 71–83). Phase 2/3 and the Book Lists management view remain — see TODO.md "Next."_

---

## 🎯 DECIDED — Folder-ordering model (2026-07-07)

Unify folder order as "**one list, one order**" shared by the left pane, the right-pane Folders view, and the Move/Copy tree. **Full-mirror**: the sidebar reflects whatever sort the folder list is in (Manual, Name, Size/count, Date…), NOT the current view's `explorerSort` (today the sidebar order bleeds from whatever view you're in — an existing inconsistency this fixes).

Requirements:
- (a) add a **sort control on the left-pane `FOLDERS` header** exposing the **full** set of folder sorts, so no order is right-pane-only and the right-pane view is undiscoverable-without-loss;
- (b) **drag-reorder only in Manual**, else a toast (same rule as dragging books in a sorted view);
- (c) **Manual order preserved** across sort excursions (data model already stores it — `sortIndex` on root folders, `childFolderIds` on parents), enabling "**sort by name → bake to Manual**";
- (d) **Move/Copy tree mirrors** the same order (proper #6 fix — supersedes the partial alpha.63 change, which used raw `folders` order and is a no-op in Manual mode);
- (e) **fix the Folders tooltip** (currently claims unconditionally you can reorder).

This is **the** folder-ordering piece — folds in **#5** (alphabetize + bake), **#6** (Move/Copy order), and **D** (Move to Top/Bottom + stale-position + drag-to-root bugs). Build as one coherent effort, not piecemeal.

## 🔗 Generalize to all left-pane sections (DECIDED 2026-07-07)

Folders is currently the odd case only in that its order bleeds from `explorerSort`; but the *management-view + ordering* pattern should be **uniform across Folders, Views (`__views__`), and Book Lists (`__booklists__`)**. Today Folders & Views have navigable right-pane management views; **Book Lists is just a sidebar section header with no view**. So:

1. build the ordering as a generic "**orderable left-pane section**" (one list, one order, header sort control, drag-in-Manual-only) and apply it to all three;
2. **add a Book Lists management view** (right pane shows all Book Lists as rows — name, count — reorderable/sortable), reached by clicking "Book Lists", mirroring Folders/Views;
3. the Book Lists sort mirrors to that view **and** the "Add to Book List" submenu order.

Book Lists are flat (no nesting) so they're simpler; Views already reorders by `position` (mostly done). **Main new build = the Book Lists management view.** Solve ordering once, apply everywhere.

---

## Decisions — placement, pins, direction (2026-08-04)

Refinements agreed while organizing a growing library:

- **List mode governs ALL placement.** The section's active sort mode (Manual / Name / Count / Date) determines where *anything* lands — new folders, Auto-Organize, Move, Copy, Add-to-Book-List. **Actions never carry ordering options** (no "At Top / At Bottom / In Sorted Order" per-action submenus; no held-key modifier). Set the mode once; placement is automatic. This also *is* the fix for the "new folder inserts alphabetical-ish near the bottom" bug — that bug exists precisely because insertion doesn't yet honor the active sort (Phase 2).
- **Pins-to-top.** A folder can be **pinned**; pinned folders float to the **top** in their own small manual zone, and the sort flows beneath them. This reconciles "alphabetical for findability" with "Various Authors / Ignore / New To Read on top." **v1: pins go to the top only** — no arbitrary-position pins (the semantics of a pin scattered mid-list are murky and unneeded). Small library → Manual (popularity order); large library → Name + a few pins.
  - **Re-affirmed 2026-08-29 (Ron: "AHHHHH. YES!!!!") — and promoted to the primary answer** for the Inbox-backlog grind: with 1000+ books still to organize, every Auto-Organize pass births new author folders, so any bake-to-Manual order rots immediately — the alternative workflow (re-sort → re-bake → find the ~7 special folders → Move-to-Top each, a couple hundred times) is exactly the treadmill pins dissolve. Target steady state: **pin the specials once, run the section in Name mode forever**; new author folders file themselves. Bake-to-Manual stays as the general tool, not the daily driver.
- **AMENDED again 2026-09-01 (alpha.17)**: the pickers' trigger controls follow a unified
  **[key ▾][arrow]** pattern — the key label + caret opens the key menu, the separate full-size
  arrow flips direction. The **⇅ glyph is RETIRED**: it reads as "reverse", so making it the menu
  trigger (alpha.16) inverted the iconography — actions must match what the symbols look like
  they do (Ron caught it in one session of use).
- **AMENDED 2026-09-01 (wave D testing, Ron)**: direction lives in the right-panel columns **and in
  re-selecting the active key in either picker** (click "Name" while on Name → flips A→Z/Z→A) —
  the columns-only rule left direction unreachable from the left pane, violating requirement (a)'s
  spirit. Also ratified: **Count's selection default is most-first** (recorded exception to
  ascending-first — nobody wants emptiest-first); **Bake does NOT auto-switch to Manual** (the
  baked manual order IS the displayed order, so staying put changes nothing on screen — the
  auto-switch was a hidden second effect that bought only confusion); **pin-zone drags work in
  sorted modes in BOTH panes** (the right pane's older Manual-only gate was an inconsistency, not
  a design); context-menu **Create Subfolder grouped with Open/Rename** (the "this folder itself"
  group — enter it, name it, add inside it).
- **Keys uniform across surfaces; direction lives in the right-panel columns.** Every sort *key* (Name, Count, Date) must be available on **both** the left FOLDERS-header picker and the right-panel view — no key is right-pane-only (requirement (a)). The *affordance* differs by surface and that's fine (progressive disclosure): the right panel is a spreadsheet (click a column header to cycle, incl. Z→A); the left is a compact tree with a picker that is **ascending-first per key**, showing the current direction via the ⇅ indicator. Direction is toggled from the right-panel columns and mirrors everywhere.
- **No descending controls; no multi-select-to-sort.** Descending already exists (right-panel column cycle + full-mirror); don't add it as a separate control/action. Sorting is a *list mode*, not a per-selection operation — no "select folders → sort just those." (Left-column multi-select may be worth adding later for Move/Delete-several — a separate feature.)
- **Reaching the far end** is served by **jump-to-top / jump-to-bottom** chevrons at the two ends of the scrollbar (jump-to-bottom shipped as "F", alpha.57; jump-to-top is a TODO), not by flipping to descending.

These sharpen the **Auto-Organize right-click** design: placement is *free* (inherited from the list mode), so its menu stays just **By Author / By Series** — no ordering sub-levels.

## Decision — the deliberate ordering asymmetry (ratified 2026-08-31, wave C testing)

Two separate ordering systems, asymmetric ON PURPOSE:
- **The folder TREE has ONE global order** (`folderListSort`) mirrored everywhere it appears —
  the 2026-07-07 "one list, one order" decision. The tree is one structure viewed from many
  windows; fragments that disagree make you doubt your memory.
- **Each folder's BOOK contents have their own remembered sort** (`folderSortSettings`, default
  Manual) — the **Finder convention**, kept because different folders have conflicting natural
  orders (author folder → series order; Wishlist → price/delta; All Books → Date Added; Book List
  → manual queue) and one global book sort would make every one a compromise.
- **The predictability property that makes Finder's version work and Windows' fail**: a folder's
  order changes ONLY when the user changes it, standing in that folder. Windows' sin is the
  invisible auto-classifier (content-sniffed templates), not per-folder memory — RW has NO
  classifier; every folder is born Manual.
- The pickers differ in size because the DATA differs: folders have one sortable attribute today
  (Name; Count in Phase 2/3), books have a dozen. Not a philosophy difference.
- **Focus-jump on create kept for now** (create → navigate into it, rename armed): serves the
  common case, self-explanatory once noticed; revisit only if it grates during the Inbox grind.

## Decisions — Phase 2/3 build kickoff (2026-08-29)

- **Date sort key: REJECTED.** Nobody needs it: Manual-with-new-at-top *is* recency order, and if a
  folder-date sort is ever truly wanted it can be **derived retroactively** from `max(book.dateAdded)`
  of the contents — so there's no "stamp `createdAt` now or lose the history" pressure either. No
  stamping, no key. Phase 2/3 key set: **Manual / Name / Count**.
- **Manual-mode insertion point = TOP (below the pinned zone).** New folders visible without
  scrolling; doubles as free recency ordering. (The current sink-to-bottom behavior is the placement
  bug, not a design.)
- **Mobile mirrors the app's order, pins included.** Mobile has no reorder affordance, so the app is
  the ordering surface and mobile is a faithful mirror. Known live gap: mobile.js reads
  `childFolderIds` but ignores root `sortIndex` — root order on mobile already diverges from the app.
  Implementation RULING (2026-08-31, built in 7.6.0-alpha.13): **mobile applies the same rules** —
  sortIndex/pinned already ride the push (deny-list spread); `folderListSort` added to the payload's
  explorerSettings; mobile mirrors the comparator + pins-first partition in one helper feeding the
  drawer tree, Dashboard shelves, and FolderView subfolders. Rejected: baking display order into
  the pushed array (flattened per-sibling order is ambiguous; a mode flip still wouldn't update
  without a re-push — no advantage, more magic).
- **New arrivals land at TOP of the stored manual order** (below pins), regardless of the active
  display mode — months of Name-mode organizing must not rot the Manual order; flipping back to
  Manual shows recency, not a bottom clump. A drag to an explicit position always wins.
- **Batch arrivals** (one Auto-Organize pass minting several folders): land at top **as a block,
  alphabetized within the block** — strict newest-first would stack in reverse creation order,
  which reads as random.
- **Pin UX ratified (2026-08-30)**: pin/unpin via the right-click menu ("Pin to top" / "Unpin") —
  pinning is rare and deliberate, and *menus change state*; a **📌 indicator on pinned rows** that is
  itself clickable to unpin (VS Code tab-pin convention — the indicator doubles as the undo
  affordance). No always-visible toggle next to +/✕ (clutter on every row for an almost-never
  action). ALSO ratified: Move to Top/Bottom stay OUT of the Move to submenu (Move to = reparenting,
  destinations only; Top/Bottom = reordering — "Move to → Bottom" would read as a container), and
  the submenu's "Root" entry gets set apart as a *place*, not a folder: italic, separator below it,
  renamed **"Top level"** (kills the Root-vs-Move-to-Top near-synonym confusion + the no-jargon rule).
- **Pinning keeps the folders' relative MANUAL order — it does not append to the zone's bottom**
  (ratified after live testing 2026-08-31). Ron expected Chrome-style append; observed behavior
  (pin #1, #2, #7, #4 in random order → zone shows #1, #2, #4, #7) was judged "not wrong, probably
  good, a trifle surprising — very discoverable." Practical consequence: arrange first, then pin in
  any order — the arrangement is preserved. Pin/Unpin is multi-select aware (clicked folder's
  direction applies to the whole selection).
- **The pin boundary is a wall for drags, in BOTH directions** (Chrome pinned-tabs / Slack
  convention): dragging an unpinned folder into the pinned zone snaps it to just below the zone
  (caret only ever shown at the boundary); dragging a pinned folder below the boundary snaps it
  back to the bottom of the zone. Within the zone, drag reorders pins freely (a small manual list
  in every sort mode). **Pinning is a state, position is a consequence — drags move position,
  menus change state** (right-click Pin / Unpin only).
