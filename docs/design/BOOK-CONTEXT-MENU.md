# Book context menu — structure & principles

_The right-click menu on a book (or a multi-selection) in the explorer. It grew organically over
many versions; **6.15.0** stepped back and reorganized it around explicit principles. This doc is the
durable home for the reasoning so the next change doesn't re-drift it._

---

## The organizing principle: group by *kind of action*, ordered by *increasing consequence*

Top to bottom, the menu reads as a **gradient of commitment** — look/place → change → destroy:

| Group | Items | What it does |
|---|---|---|
| **Placement** | Move to · Copy to · Add to Book List · **Auto-Organize** | Changes *where the book lives / is referenced* (folder membership). Auto-Organize is auto-placement — it belongs here. |
| **Clipboard** | Cut · Copy · Paste | The *book-object* clipboard (move books between folders). Distinct from "copy a field" below. |
| **Reference & copy** | Open in Amazon · Share · Copy Title(s) | **Non-mutating** — go out to / get info out of the book. Changes nothing. |
| — divider — | | **The non-mutating ↔ mutating line.** Everything below changes the entry. |
| **Edit the entry** | Edit · Tags · Price Goal · (Number-by-order, in Edit ▸) | **Mutating** — changes the book's metadata/state. |
| Hide | Hide / Unhide | Mutates visibility. |
| — divider — | | Buffer before the destructive action. |
| **Delete** | Delete / Restore | Destructive. **Isolated** at the bottom behind its own divider. |

**Rules that keep this stable:**
- **Delete stays isolated** at the bottom behind a divider — never adjacent to non-destructive items (mis-click buffer).
- **Non-mutating actions never sit next to Delete** — that's why Reference & copy is above the edit group, not below it.
- The **non-mutating↔mutating divider** is a real semantic marker, not decoration.

---

## Pick-list vs form: why Tags & Price Goal are top-level but Edit's fields aren't

The deciding axis is **not frequency — it's the interaction model:**

- **Pick-list actions** present a **finite, inline set of choices** right in the submenu (hover Tags ▸ → the tags; Price Goal ▸ → the preset prices → one click). The whole interaction completes *in the menu*. → **top-level**, because the menu can fully satisfy them.
- **Form actions** are **unbounded** (Author, Series, Position…) — the menu can't show "all possible authors," only launch a **typing modal**. → grouped behind **Edit**.

Corollary: **never fold Tags/Price into Edit.** It would (a) turn a one-hover pick into a two-hover pick, and (b) mix two interaction paradigms under one label — the exact muddiness this reorg removed.

**Prominence = frequency × scope-need, layered on top:**
- **Frequent** bounded picks → top-level (Tags, Price Goal).
- **Rare** field-sets (even bounded ones) → tucked in **Edit ▸** (see Ownership below).
- **Free-form** fields → Edit ▸ / the dialog.

---

## Edit: single book → dialog, multi-selection → bulk submenu

"Edit" must behave like users expect (*open the editor*), but the menu acts on a **selection**, and a modal can't bulk-set per-book-unique fields (Title/Note/Rating). So Edit is **selection-aware**:

- **1 book → `Edit…`** (no arrow) opens the **full detail dialog** in edit mode — comprehensive (Title, Author, Series, Position, **Note**, Ownership, Tags, Price, Rating). This is the only place Title/Note/Rating are menu-reachable, and it matches the "Edit opens the editor" expectation.
- **2+ books → `Edit ▸`** submenu of the fields that make sense to bulk-set: **Author · Series · Position · Number-by-current-order · Owned/Wishlist**. Number-by-order lives here (it's a bulk position edit, meaningless on one book).

_(The old menu had "Edit ▸" always show an arbitrary 4-field subset, "Add Note" as a redundant item, and Number-by-order jammed next to Delete. All resolved here.)_

### Editable fields × where you edit them
| Field | Detail dialog | Edit ▸ (multi) | Own top-level item |
|---|:---:|:---:|:---:|
| Title / Note / My Rating | ✓ | — | — (dialog only — per-book unique) |
| Author / Series / Position | ✓ | ✓ | — |
| Owned ⇄ Wishlist | ✓ | ✓ | — |
| Tags | ✓ | — | ✓ (pick-list) |
| Price Goal | ✓ | — | ✓ (pick-list) |

---

## Ownership model: Amazon's facts vs the one bit you own

> **2026-09-07: extended and partially superseded by docs/design/OWNERSHIP-MODEL.md** (onWishlist
> retirement, transition matrix, dialog edit-in-place redesign, lastAmazonOwnershipType). This
> section remains accurate on menu structure; for ownership semantics the new doc wins.

Ownership has **many types** — Owned (bought), Prime, Kindle Unlimited, KOLL, Sample, Borrowed, Comixology, Inside Amazon — plus **Wishlist**. Crucially:

- **The types are read-only Amazon facts.** The fetcher derives `ownershipType` from your library relationship. They're not preferences; you can't (and shouldn't) hand-set "this is Prime" — it'd fabricate a fact, and the next fetch would re-derive it anyway. So there's **no UI to set them**, only to view/filter them.
- **The one user-editable bit is `onWishlist` (Owned ⇄ Wishlist)** — "I have it" vs "I want it." This *is* durable: editing it stamps `userEdited.onWishlist`, and the import/fetch merge preserves the user's value over Amazon's (storage.js) — same protection as manual Hide. Real use cases: **manually-added / metadata-imported books** (no Amazon relationship, so ownership *must* be user-set) and fetcher misclassifications.

**Terminology (6.15.0):**
- The `purchased` type displays as **"Owned"** everywhere (column, filter, badge, dialog) — it contrasts with the *borrowed* types (Prime/KU/Sample) better than "Purchased." The data key `purchased` / `ownershipType` are unchanged; only labels moved.
- The **filter** stays named **"Ownership"** — it spans all types.
- The **edit control** is **"Owned / Wishlist…"**, not "Ownership" — it only toggles those two, so "Ownership" over-promised the full taxonomy.

---

## Submenu positioning: `FlipToFitPopup` (measured, not estimated)

All submenus position via the reusable **`FlipToFitPopup`** component: on open it **measures** the trigger + itself (`getBoundingClientRect`) in `useLayoutEffect` and flips **horizontally and vertically** to fit the viewport — no flicker, no cache. It replaced brittle per-item pixel-offset *estimates* that broke on any menu reorder (and mis-flipped near screen edges). The menu is also **one flat scope** (a nested IIFE that split it was removed), so items reorder freely.

`FlipToFitPopup` is generic — the folder context menu and other dropdowns can adopt it too (one line each) when touched.

---

## When you change this menu
1. Keep the **group order** (placement → clipboard → reference → | → edit → hide → | → delete) and the two dividers.
2. New action? Classify it: *placement / non-mutating reference / mutating edit / destructive* → it goes in that group.
3. Bounded-choice + frequent → top-level pick-list. Free-form or rare → behind Edit ▸.
4. Don't hand-set submenu positions — use `FlipToFitPopup`.
5. Don't reintroduce a nested scope; the whole menu shares `selectedBooksArray` / `count` hoisted at the top.
