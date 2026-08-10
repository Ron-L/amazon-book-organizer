# Library cleanup — Ron's migration plan

_Personal library-organizing checklist (not app dev). Dismantle the `New To Read` folder tree into the
canonical pattern and check items off as you go. Started 2026-08-10._

## The rule (spans every row)
**Home in a Folder · "still to read" on the shared `New To Read` list · type via a Tag.**
- A book's **home** is its author folder (if you track that author) or **Various Authors** (one-offs).
- The **queue** is the single `New To Read` **Book List** (a shortcut you delete when finished).
- **Type** (Non-Fiction, Classics, …) is a **Tag** — filter the `New To Read` list by tag to get a per-type view. No per-type lists to maintain.
- **Exception:** a book by a **tracked author** goes to *that author's* folder + their **`<Author> - To Read`** list (the prolific-author pattern), not Various Authors + `New To Read`.

## Migration table (smallest first = easy wins)

| # | Source `New To Read/…` | Books | Dest home (Folder) | Book List | Tags | Notes |
|---|---|---|---|---|---|---|
| 1 | **Collections** | 2 | Author folder if tracked, else Various Authors | `New To Read` | `Collected Works` | Multi-book omnibuses (e.g. R.E. Howard). **Start here.** |
| 2 | **Classics** | 4 | Various Authors (or author's folder, e.g. Twain) | `New To Read` | `Classics` | Old classics; tiny. |
| 3 | **Time Travel** | 6 | Author / Various Authors | `New To Read` | `Time Travel` (+ `Humor SF` / `Magic SF` per book) | Split the sub-genres with **tags**, not extra lists. |
| 4 | **Anthologies** | 6 | Various Authors (multi-author) | `New To Read` | `Anthology` | |
| 5 | **Comics** | ? | **Comics** (own top-level folder) | `New To Read` | `Comics` | Distinct category / different reader → own home, don't dilute Various Authors. |
| 6 | **Non-Fiction** | 19 | **Non-Fiction** (existing top-level folder) | `New To Read` | `Non-Fiction` | Send unread to the same Non-Fiction home. |
| 7 | **Prime(able) To Read** | ? | Keep top-level (that *is* their home) | — *(Saved Search)* | — (`Prime`/`Borrowed` are ownership facts) | **No hand-kept list** — a Saved Search on ownership = Prime/Borrowed self-updates. Read/return the "calling" ones first to free borrow slots. ⚠️ *see the "duplicate on organize" bug — hold this row until fixed.* |
| 8 | **Old Free Stuff** | many | Keepers → author/Various Authors; rest → leave *or* Various Authors | `New To Read` (keepers only) | `Freebie` (on the low-value remainder) | Mine the keepers; tag the rest so it filters out. Judgment-heavy → late. |
| 9 | **Wishlist / Samples** | ? | **Leave as-is** (unowned) | — | — | **Curate:** keep the "really look good", drop the rest (re-addable from Amazon). Don't file unowned into the owned structure. |
| 10 | **New To Read** (top level, loose books) | ? | Author / Various Authors per the rule | `New To Read` | per type | Curate the books sitting directly in New To Read (not in a subfolder). |

## Decisions captured
- Freebie tag name: **`Freebie`** (short) instead of "Only Got Because It Was Free".
- Prime(able): a **Saved Search on ownership = Prime/Borrowed** (self-updating), not a manual list.
- Type slicing = **tags**, not per-type Book Lists.

## Blocking bug (do these rows after it's fixed)
- **Auto-Organize from All Books/Inbox of a book that already lives in a real folder creates a duplicate** — it adds the book to the author folder but removes it from `__inbox__` (the nominal source), not the folder it actually lives in, so it ends up in *both*. Hit on Blake Crouch & Grady Hendrix in `Prime(able)`. Logged in TODO; fix before the Prime(able) / any "organize a book that's already filed elsewhere" rows.
