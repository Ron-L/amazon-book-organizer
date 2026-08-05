# Operations — Single Source of Truth (audit + refactor plan)

_Audit 2026-08-04. Deliverable of the "audit-first" phase agreed after 6.13.0. This inventories every
mutating operation, its call sites, and the drift between duplicate handlers, then proposes one function
per operation with thin call-site adapters. **No refactor code yet** — this is the spec to extract against._

---

## Why

Duplicate handlers for the same user action **drift**. The motivating case (6.13.0 post-mortem): folder
delete has **three** code paths with different confirm text, inconsistent toasts, and **two** undo payload
shapes. That's not a one-off — the taxonomy below shows several operations implemented 2–3 times.

## Principle

**One function per operation owns: confirm text + mutation + undo record + toast.** Call sites (context
menus in both panes, keyboard, drag-drop, buttons) become thin adapters that gather the target and pass
**invocation context** — cursor `(x,y)` for drag toasts, a drop `index`, etc. The context differs; the core
does not. `WIZARD_ORGANIZE` via the 6.13.0 `applyOrganizePlan` is already a small model of this pattern.

---

## Operation taxonomy (from the undo/redo reducers, js ~5645–6092 undo / ~6145–6572 redo)

### Books ↔ folders — **duplication hot-spot**
| Semantic op | Undo type(s) | Call sites | Note |
|---|---|---|---|
| Move books → folder | **MOVE_BOOKS_FOLDER** (drag) + **MOVE_BOOKS_TO_FOLDER** (menu) | drag: 12378, 12766, 13207, 14144, 14894 · menu: 16518, 16634 | ⚠️ **two types, one op** |
| Copy books → folder | **COPY_BOOKS_FOLDER** (drag) + **COPY_BOOKS_TO_FOLDER** (menu) | drag: 12375, 12757, 14140, 14890 · menu: 16553, 16633 | ⚠️ **two types, one op** |
| Remove books from folder | REMOVE_BOOKS_FOLDER | (reducer 5759) | |
| Reorder books in folder | REORDER_BOOKS_FOLDER | 2229 | |
| Paste books | PASTE_BOOKS_CUT (3794) / PASTE_BOOKS_COPY (3819) | clipboard | clipboard variants of move/copy |
| Unified drag (books + folders) | MOVE_ITEMS | 2474 | overlaps move-books + move-folder |

### Folders — **duplication hot-spot**
| Semantic op | Undo type(s) | Call sites | Note |
|---|---|---|---|
| Create folder | CREATE_FOLDER | 2089, 12252 | 2 invocation sites |
| **Delete folder** | **DELETE_FOLDER** (singular, **no undo**) + **DELETE_FOLDERS** | keyboard: 4122 · right-pane ×: 12988 · left-pane menu: 16308 | ⚠️ **3 paths, 2 undo types, 2 payload shapes** (`orphanedBooks`/`orphanDestination` vs `movedBooks`), inconsistent confirm + toast |
| Reorder folder | REORDER_FOLDER | 2362, 12668 | |
| Reparent / move folder | REPARENT_FOLDER (2414), MOVE_FOLDER (15900), CUT_PASTE_FOLDER (4010), COPY_PASTE_FOLDER (4051), MOVE_ITEMS | | ⚠️ **~5 folder-move variants** — needs a consolidation sub-study |
| Rename folder | _(no undo type found — likely inline edit; verify)_ | | |

### Book Lists
| Semantic op | Undo type | Call sites | Note |
|---|---|---|---|
| Add books | BOOKLIST_ADD | `addBooksToBookList` (1143); inline 12117 | shared helper exists ✅ |
| Remove books | BOOKLIST_REMOVE | 3849 | |
| Create | BOOKLIST_CREATE | 6999, 8598, 12027 | ⚠️ **3+ sites** — `handleAddToNewBookList` pattern; 6.13.0 added a 4th (`addPreviewSelToNewBookList`) |
| Delete | BOOKLIST_DELETE | 12156 | |
| Reorder books | REORDER_BOOKS_BOOKLIST | 2253 | |

### Searches
| Delete search | _(no undo type; confirm at 11993, 16433)_ | | likely not undoable — verify + toast? |

### Books (data)
EDIT_BOOK (5476), BULK_EDIT_BOOKS (5545), TOGGLE_HIDE (1867), SOFT_DELETE_BOOKS (1856), RESTORE_BOOKS
(1930), permanent delete (confirm 1952 / toast 1972 — undo? verify), SEQUENCE_SERIES (2291), TAG_BOOKS_DRAG (6042).

### Wizard
WIZARD_ORGANIZE (6900) — shared via `applyOrganizePlan` since 6.13.0. ✅ **Reference model** for the target pattern.

---

## Confirm + toast coverage (what's inconsistent)

| Path | Confirm | Toast | Undo |
|---|---|---|---|
| Folder delete — right-pane × (12960/13020) | terse "Delete folder X?" | ✅ "Deleted X — N books moved to {dest}" | ✅ |
| Folder delete — left-pane menu (16284/16339) | terse | ❌ `console.log` only | ✅ |
| Folder delete — keyboard (4091) | "…move to **parent folder**" (imprecise: top-level → Inbox) | ❌ | ❌ |
| Book List delete (12155/15684) | ✅ | ❓ verify | ✅ (BOOKLIST_DELETE) |
| Search delete (11993/16433) | ✅ | ❓ verify | ❓ |
| Move/copy → folder (menu vs drag) | n/a | ❓ menu-path toast? drag toasts at cursor | ✅ (but two types) |

_(❓ = confirm during per-op extraction — not yet read line-by-line.)_

---

## Highest-value consolidations (ranked)

1. **deleteFolder(folder, {toastAt})** — collapse 3 paths → 1; one undo payload; destination-aware confirm ("its N books return to {Inbox/parent}") + a toast on every path. *This is the motivating bug fix.* Low blast radius.
2. **moveBooksToFolder / copyBooksToFolder(bookIds, fromId, toId, {atIndex, toastAt})** — collapse the two-type duplication (drag + menu). High value; **higher** blast radius (drag-drop) → test carefully.
3. **createBookList(name, bookIds) / deleteBookList(bl)** — 3–4 create sites → 1.
4. **Folder move family** — study REPARENT / MOVE / REORDER / CUT_PASTE / MOVE_ITEMS; likely 1–2 real ops behind 5 types. Biggest unknown → do last, after a design sub-pass.

## Target shape

An operations layer (functions today; extract to `operations.js` later — feeds MODULE-SPLIT):
```
moveBooksToFolder(bookIds, fromFolderId, toFolderId, { atIndex, toastAt })
copyBooksToFolder(bookIds, toFolderId, { atIndex, toastAt })
deleteFolder(folder, { toastAt })
createBookList(name, bookIds) / deleteBookList(bl)
addBooksToBookList(id, ids)   // already exists (1143) — the template
```
Each owns confirm + mutation + undo + toast; **one undo type per op**; call sites pass only target + context.

## Extraction order (incremental — one op per commit, re-test undo/redo by hand each time)

1. `deleteFolder` (motivating case, well-understood)
2. `moveBooksToFolder` + `copyBooksToFolder`
3. `createBookList` + `deleteBookList`
4. Folder-move family (after a sub-study)

## Risks / notes

- **Move/copy/delete are drag-drop hot paths** — regressions hide there. No big-bang; per-op commits; **manual undo/redo test each** (6.13.0 lesson: pure/unit tests don't catch React wiring).
- **Undo-stack migration**: the undo stack is in-memory (MAX_UNDO cap, not persisted across reloads — **verify**), so unifying undo payload shapes needs no data migration.
- Fold in the pre-existing **folder-copy redo TODO** (js ~6389, "store copied folder data for proper redo") when touching COPY_PASTE_FOLDER.
- Keep the confirm/toast **wording** user-friendly (no jargon) and consistent across ops as part of the single source of truth.
