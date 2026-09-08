# Undo Model — the three levels, the dialog fence, and what is deliberately NOT undoable

_Settled 2026-09-07 (Ron + UX review, ratified after full exploration — do not relitigate).
Extends the 7.6.0 "undo tells the truth" doctrine (undo-integrity trilogy) and the 6.13.1
forced-toast rule (every undo/redo shows a labeled toast)._

## The three levels of editing, and where undo lives

| Level | State | Undo mechanism | Why |
|---|---|---|---|
| 1. Within a field | Keystrokes (invisible once typed over) | **Browser-native text undo** (per input; edit fields stopPropagation so Ctrl+Z stays native) | Undo exists to recover state you can't see or directly reach |
| 2. Within the dialog, across fields | Form state — **fully visible and directly editable** | **None by design.** The form IS the undo UI (click the field, fix it); **Cancel** is the transaction rollback | Convention (Word/Photoshop dialogs, settings pages, web forms): transactional forms get per-input undo + Cancel, never a chronological multi-field stack. A chronological stack here would violate the visibility razor — in a form people think *per-field*, not *in edit order*; Ctrl+Z reverting "whichever field I touched last" is a hidden-order mutation inside a visible surface. Apps with stepwise micro-undo (Lightroom, Figma) get it by having NO form session — every tweak commits instantly to the global stack. RW's dialog is a transaction; Cancel is its undo |
| 3. Global (post-Save) | Committed changes | **Global undo stack.** One Save = **one atomic step** (all fields changed that session revert together — matches the transactional frame: Save is one decision, so undoing it is one) | Per-field popping post-save would leave half-reverted state you can't inspect from cover view |

**Residual gap in level 2, and its correct future fix**: overwrite a field, make other wanted
changes, then regret the overwrite without remembering the original — Cancel is too nuclear.
The fix, IF the sting is ever felt in practice, is **per-field revert** (↺ beside any field
differing from its saved value; VS Code-settings precedent) — order-free, targeted, visible.
NOT a chronological stack. Filed as optional polish, deliberately unbuilt (7 fields; Cancel +
retype covers nearly everything).

## The dialog undo fence (7.8.0-alpha.4)

**Principle** (the session's recurring razor): *undo must never mutate state you didn't
knowingly target* — and behind a modal, pre-dialog actions are exactly that. Same disease as
the discarded invisible-Reset proposal. A toast is narration, not visibility.

- **On dialog open** (null → book, one chokepoint): record undo AND redo stack depths — the fence.
- **While the dialog is open (view mode)**: Ctrl+Z / Ctrl+Shift+Z / Ctrl+Y operate **only above
  the fence** — i.e., on actions taken during this book-viewing session. The open dialog updates
  live (EDIT_BOOK undo/redo already refresh modalBook).
- **◀ ▶ navigation resets the fence** (each book = a new session). A→B→A: A's earlier edits are
  unreachable in-dialog even though theoretically allowable — consistency beats cleverness.
  One rule: *the fence scopes undo to the current book-viewing session, period.*
- **Blocked key ≠ dead key**: below-fence Ctrl+Z shows an info toast — "Nothing to undo from
  this dialog — close it to undo earlier actions." (An affordance nobody can perceive isn't an
  affordance; a key that silently eats input reads as broken.)
- **Edit mode: global undo fully blocked** (Ctrl+Z belongs to text there; in-field native undo
  already works via stopPropagation).

## What survives dialog close: EVERYTHING (explored and settled 2026-09-07)

Discard-on-close was proposed (cover view can't show fields reverting) and **rejected**:
- It removes the safety net entirely from the app's primary edit path — the user who realizes
  the mistake after closing has no recourse.
- Post-close Ctrl+Z undoes exactly the action the user knows they just did — self-initiated
  recovery of a *known* action. The fence already solved the real danger (popping past a
  context boundary unknowingly).
- The visibility bar it applies is one bulk edits (equally cover-invisible, always undoable)
  have never met — applied consistently it dismantles the whole undo system.
- Convention is lopsided: document apps (Word/Photoshop/Figma) land dialog commits as one
  undoable step on the global stack; the famous discard-style example is Excel's stack-clearing
  dialogs — a widely-hated anti-pattern, not a convention.
- 7.6.0 doctrine: history dies when it would LIE (purged books, replaced libraries) — not when
  it's inconvenient to visualize.

## Toast naming (7.8.0-alpha.4): every undo/redo names its target

The visibility answer that actually fits: toasts carry the target, everywhere —
- Single-book actions: the book title ("Undone: edit to 'Bitter Gold Hearts'").
- Bulk actions: honest aggregate ("Undid price goal for 4 books").
- Folder/list actions: the folder/list name.
