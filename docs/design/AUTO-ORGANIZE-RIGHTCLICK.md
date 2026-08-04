# Auto-Organize from a right-click (book-anchored, bottom-up)

_Design/scope for the HIGH-priority "Next" item. Draft 2026-08-04 — for review before implementation._

---

## Why

Today the only way to auto-organize is the **wizard** (top-down): open it, filter authors by count, select, run. Ron's real workflow is **bottom-up**: browsing the Inbox, he recognizes a book whose author/series he wants filed, and wants to act *on that book*, seeing the actual books (not just counts). This adds that path.

**It complements, not replaces, the wizard** — same engine, different entry point. And it **subsumes** the old "hand-create an Author/Series folder as a move target" need.

## Entry point & menu

Right-click a book (in **Inbox** or **All Books**) — or a **multi-selection** of books — → **Auto-Organize ▸ By Author / By Series**. The menu is **identical regardless of how many books are selected**; it operates **per book**, filing each under its own author (or series) — exactly as if you'd right-clicked each one in turn and chosen the same option.

- **By Author** — each selected book files into its author's `Author/Series/…` hierarchy.
- **By Series** — each selected book files into just its own series (`Author/Series/…`, the narrower slice). Hidden/disabled when no selected book has a series.

Both produce the same `Author/Series/Books` shape the wizard builds; By Series just limits each book to its series. **Co-authored books** (one book, multiple authors) follow whatever grouping the wizard engine uses — full-author-string today, per-author once `filedAuthors` lands (below). **No special menu for them** — true multi-author organizing is the wizard's job.

## Scope — which books get pulled in

**Inbox / unfiled books only.** A book already filed somewhere stays put — it's there for a reason (e.g. a story by author X inside an anthology in author Y's universe). This is the **custodial model**: a folder is a book's *chosen home*, and Auto-Organize only files books that have *no home yet* (Inbox); it never disturbs deliberate placements. (To see where a filed book already lives, use its "In" popup from All Books.)

The clicked book *identifies* the target — it doesn't limit the action to itself: **By Author** pulls **all of that author's unfiled books** (that's the point — spot one, file them all); **By Series** pulls all of that series' unfiled books. For a multi-selection, it's the union across the selected books' authors/series.

## The confirm/preview dialog — the core value

A modal that shows **exactly what will happen** before committing:

- **The books, as covers**, grouped hierarchically: `Author → Series → covers` (for By Author) or `Series → covers` (for By Series). This is the gap the wizard has — you *see* the books, not a count.
- **The target structure** it will create/use (e.g. "→ `Sanderson / Stormlight Archive`, `Sanderson / Mistborn`, `Sanderson / (standalone)`").
- **Count** ("Move 14 books into 3 folders").
- **Clickable covers → the book detail dialog** (nested modal that returns to the preview on Escape — opening it commits nothing; see cover-click decision in the TODO/earlier discussion).
- **Confirm / Cancel.**

The layout is **fully hierarchical** — `Author → Series → covers` — not a flat grid. (Polish-before-launch retirement project, not an MVP — do it properly.)

## Reuse the wizard's organize engine (key principle)

The right-click must **call the same organize logic the wizard uses** — grouping, folder create/reuse, move, Inbox-removal, undo — just **pre-scoped to one author/series** and fronted by the preview. Do **not** fork a parallel organize path. Benefits: consistency, less code, and automatic inheritance of future improvements (esp. `filedAuthors`).

Integration points (per AUTO-ORGANIZE-COAUTHORS.md): wizard grouping (~L3168-3202) and the organize → move-to-folder + Inbox-removal path.

## Co-author handling

**Author strings are treated whole — we do NOT parse "Niven, Pournelle" into separate authors.** Reliable splitting is an AI-ish problem, and the user resolves author-name variations by hand. So "By Author" files a co-authored book under its full-string author folder, exactly like today's wizard. If a future "file under each author" capability (see AUTO-ORGANIZE-COAUTHORS.md) is ever pursued, this inherits it automatically via the shared engine — but nothing here assumes it.

## Placement — free

New `Author`/`Series` folders insert per the folder list's **active sort mode** (see FOLDER-ORDERING.md decisions). This feature carries **no placement options** — no "At Top/Bottom/Sorted" sub-levels. That's why the menu stays just By Author / By Series.

## Undo

One undo entry reverses the whole operation (reuse the wizard's organize undo — a `MOVE_ITEMS`-style action capturing folder creation + moves + Inbox removal).

## Edge cases
- **Folder already exists** → reuse/merge, never duplicate.
- **Author has 1 book** → still works (creates the folder with one book); no special warning.
- **Book has no series** → "By Series" hidden; "By Author" still filed at the author level.
- **Book has no author** → "By Author" disabled.
- **Nothing eligible** (all of the author's books already filed) → dialog says "Nothing to organize — all of {author}'s books are already filed."

## Preview interactions — reuse the explorer's cover component (2026-08-04)

Build the preview's covers by **reusing the existing explorer / All-Books cover component**, not a bespoke grid. Then the preview inherits — for free and fully consistent with the rest of the app — **multi-select** (Ctrl/Shift-click), **right-click → Add to Book List**, **click → book detail**, and **hover → the "In" popup**.

**Caveat:** how much comes free depends on how cleanly that cover extracts. Assess at build time (it also serves the module-split goal). If extraction is messy, **stop and reassess** rather than forcing it.

**Motivating workflow (the New To Read queue):** while auto-organizing a series, select the *unread* covers in the preview and right-click → **New To Read** (a Book List = deletable shortcuts). Confirm the organize → the books file into their **series folder** *and* stay on **New To Read**. Finish one → delete it off the list; the book stays put. Custodial home (folder) + supplemental queue (list). This is why the preview needs select + Add-to-Book-List — and why the companion feature, the **"In" popup everywhere** (TODO/Next, high), matters: you need to *see* both memberships at a glance.

## Decisions (2026-08-04)
1. **Scope:** Inbox/unfiled only — already-filed books stay put (custodial; e.g. a story deliberately parked in another author's universe). ✓
2. **Preview:** full **hierarchical** Author→Series→covers, clickable covers → detail. No flat MVP. ✓
3. **Sequencing:** ship now on the **current author-grouping** (organizer groups by the full author string today); it **inherits `filedAuthors`** automatically when that lands, because it reuses the wizard engine — no rework, and no need to build filedAuthors first. ✓
4. **Selection:** menu is identical for 1 or many books and operates **per book** (= running the single-book action on each). Co-authored single books follow the engine's grouping — no special menu; multi-author organizing is the wizard's job. ✓
