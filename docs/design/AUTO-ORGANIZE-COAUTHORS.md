# Auto-Organize: aggregate co-authored books under each author

_Moved verbatim from TODO.md during the 6.12.0 TODO restructure (2026-08-03). Backlog. Design 2026-06-22. **MEDIUM / MEDIUM-HIGH.**_

---

**Problem:** Auto-Organize by Author groups by the FULL author string (`normalizeAuthor` = trim+lowercase of `book.author`, ~L3144), so a collaboration ("Larry Niven, Jerry Pournelle") is a separate group from solo "Larry Niven". An author who mostly co-writes (e.g. Niven) never reaches the threshold even with 20+ books, because the count is split across collaboration strings. Real hit: 22 "niven" books, 0 authors shown at 17+.

**Goal:** a co-authored book counts toward — and files under — EACH of its authors, working correctly with the incremental-threshold workflow (lowering the slider over multiple passes).

**Chosen design — track filed authors per book (NOT a raw counter):**
- `authorsOf(book)` = distinct authors parsed from `book.author` (split on `,` `&` `and` `;`); solo → 1.
- New persisted book field `filedAuthors: string[]` — normalized authors this book has been auto-filed under (empty initially).
- Wizard count for author X = Inbox books where `X ∈ authorsOf(book)` AND `X ∉ filedAuthors`.
- Organize author X: add book to X's folder, add X to `filedAuthors`; if `filedAuthors ⊇ authorsOf(book)` → remove from Inbox.

**Why filedAuthors, not a decrement counter:** a raw count double-spends on re-runs. After organizing Niven, the Niven&X collabs stay in Inbox (still owe X); a lower-threshold pass shows Niven again (those collabs) and re-filing would decrement them to 0 and drop them from Inbox before X ever got them. Tracking the SET of filed authors is idempotent (skip authors already filed) and yields the count for free — and needs no folder-name semantics (it's author state on the book, which the book already carries).

**Decisions captured (2026-06-22 design session):**
1. Manual move out of Inbox = "I've filed this" → remove from Inbox fully (today's behavior). Don't keep multi-author books in Inbox after a manual move — that's the more confusing outcome. `filedAuthors` stays a pure auto-organize concern.
2. An author that never meets the threshold leaves its collabs lingering in Inbox (filed under the other author, still owing this one). Needs an escape hatch: deleting/moving from Inbox, or a "clear from Inbox, keep current folders" action, marks it done.
3. Stale `filedAuthors` (user later deletes an author folder or pulls the book out of it) is accepted — reconciliation is over-engineering.

**Cheaper alternative** if the above is too much: group by FIRST/primary author only (Niven-led collabs → Niven; Pournelle-led → Pournelle). One folder per book, normal Inbox removal, zero new state. Cost: a "Pournelle, Niven" book lands under Pournelle, so not every "Niven book" ends up together.

**Touch points:** wizard grouping (~L3168-3202), the organize → move-to-folder + Inbox-removal path, a new persisted book field (storage merge + backup/restore serialization).

**Impact:** "all my Niven books together" works even for prolific collaborators; auto-organize stops silently undercounting co-authors.
