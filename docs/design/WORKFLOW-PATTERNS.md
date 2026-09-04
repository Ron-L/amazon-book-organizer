# Workflow Patterns — wrangling a reading backlog

_A running collection of **real ways people use RW's flexibility**, captured as they emerge. This is source
material for the eventual USER-GUIDE / support-GPT — framed as **"here are patterns and trade-offs,"** not
step-by-step how-to. There's rarely one right way; the point is to show the building blocks and let users
compose their own. Started 2026-08-06 from Ron's own backlog method._

---

## The foundation: two organizing primitives, two jobs

Everything below rests on RW's core split:

- **Folders = custodial.** A folder is a book's *home* — where it lives. Homes should be **stable**: set once, rarely moved. Browsing a folder should always tell the truth about what's in it.
- **Book Lists = supplemental.** A list is a *lens / overlay* — a hand-picked set of shortcuts. Adding or removing a book from a list never tags, moves, hides, or deletes the book. Lists are cheap to add to and cheap to clear.

The single most useful habit that falls out of this: **let folders hold *where a book belongs*, and let Book Lists (or tags) hold *transient status* like "still to read."** Status changes often; homes shouldn't.

---

## Pattern: a "to read" queue that doesn't disturb your shelves

Goal: track what you still have to read, *without* your folder structure going into flux every time you finish a book.

**Principle:** the book's folder home is decided once; "unread" lives on a **Book List** you *delete from* when done. Same shape whether the author has 40 books or 1 — which keeps it a single habit.

### Prolific authors → a per-author queue
When you own many books by an author:
1. Right-click a book → **Auto-Organize ▸ By Series** (or By Author) — it files **all** of that author's unfiled books into `Author / Series` folders (their permanent home). *(Auto-Organize acts on every unfiled book by that author, ignoring any Inbox filter you have active — so read and unread alike get filed.)*
2. In the preview, select just the **unread** covers and **right-click → Add to Book List → `<Author> - To Read`**.
3. Confirm → the books land in their series folders **and** stay on the `<Author> - To Read` list as shortcuts.
4. Finish one → **delete it from the list**. It stays filed where it belongs; the list shrinks to what's left.

The list is the queue; the folder is the home. (Ron runs many of these, e.g. *Dungeon Crawler Carl - To Read*, *Kirov Series To Read*, *Neal Stephenson - To Read*.)

### One-off / few-book authors → the same shape, one shared queue
Two viable approaches — the first keeps the model clean, the second trades that for visual browsing:

**(Recommended) Home now, queue on a list.**
- Move the book to its permanent home (typically a catch-all like **Various Authors**), and add it to a shared **New To Read** Book List.
- Finish it → just **delete it from the list**. Nothing moves; **Various Authors** always contains every one-off, read or not.
- Slice the queue by *kind* with **tags** (e.g. `Comics`, `Classics`, `Time Travel`) and filter the list.
- Why this one: it's the *same* list-as-queue habit as the prolific-author method (one mental model), post-read work is a single delete, and your folders never lie about what they hold.

**(Alternative) Queue as a folder tree.**
- Park the book under a **New To Read** folder (with subfolders by type: *Classics, Comics, Non-Fiction, Time Travel, Anthologies…*).
- Finish it → **move** it to its real home (e.g. Various Authors).
- Why you might: the subfolders let you *browse* the backlog by type in the tree (no filtering), which can help decide what to read next by mood.
- Costs: post-read is a *move* not a delete; while queued the book is *absent* from its real home (that folder is incomplete until you re-home it); and "forgot to move it" leaves clutter.

**Tags vs subfolders for slicing** is the real fork between the two: tags overlay type without touching homes (fits the recommended approach); subfolders make the folder tree carry both *home-ness* and *queue-state*, which is browsable but muddies the "folder = stable home" idea.

---

## Pattern: reading status via Amazon collections + Saved Searches

Ron drives "have I read this?" off an Amazon **Collection** plus **Saved Searches**:
- A Kindle collection named **Read** (past tense) holds finished books.
- **Saved Search "Read"** = in that collection; **Saved Search "Uncollected"** = *not* in it (i.e. the candidates still to deal with).
- Filtering the Inbox by **Uncollected** surfaces the not-yet-processed books to organize.

Naming convention worth adopting in docs: **"Read"** = past tense (finished); **"To Read"** = imperative/future (the queue). Keeps list names unambiguous.

Caveat the workflow tolerates: the Amazon collection isn't perfect — you might have read something that's still Uncollected. Because you *hand-pick* which books go on a `To Read` list (rather than auto-adding all Uncollected), you naturally skip the ones you've actually finished.

_(Historical note: tags were once considered for "next reads" — still perfectly viable for users who prefer tag-driven status over lists.)_

---

## Pattern: homing before owning — wishlist books & samples (2026-09-04)

- **Wishlist books get their *future* home immediately** (author/topic folder): the fetcher's
  wishlist→owned upgrade keeps folder/tags/price goal, so purchase day is zero work — and series folders
  honestly show ownership gaps. Wishlist *visibility* is a Saved Search (Ownership = Wishlist); never a
  folder or a hand-maintained list (it's self-maintaining data). A curated **Buy Next** list is the one
  legit hand-picked overlay.
- **Samples split by intent**: probably-buying → home like a wishlist book (sample→purchase upgrades in
  place, same ASIN); genuine audition → stays in the **Inbox** (a pending decision is what the Inbox is
  for) until the verdict.
- **Rejected samples**: delete on Amazon → RW orphan-flags it on the next fetch (RW never silently drops) →
  the periodic **🔍 Orphan filter sweep** finds them; delete → Empty Trash tombstones them for good. The
  flag does the remembering.

Distilled as prescriptive rules in [../SUGGESTED-ORGANIZING-PRINCIPLES.md](../SUGGESTED-ORGANIZING-PRINCIPLES.md).

## Meta
- **There's no single right way** — these are compositions of the same primitives (folders, Book Lists, tags, saved searches, Auto-Organize). The guide should present them as menus of trade-offs, not mandates.
- Add new patterns here as they surface, then distill for the USER-GUIDE near launch.
