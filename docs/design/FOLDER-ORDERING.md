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
