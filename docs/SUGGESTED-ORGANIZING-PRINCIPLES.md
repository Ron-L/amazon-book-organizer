# Suggested Organizing Principles

_The prescriptive companion to [design/WORKFLOW-PATTERNS.md](design/WORKFLOW-PATTERNS.md) (which holds the
patterns and trade-offs). This file is the **crib sheet**: one consistent way to file everything, applied
the same way every time. There's no single right way to use ReaderWrangler — these are principles that
compose well. Distilled 2026-09-04._

---

## The four primitives, one job each

| Primitive | Job | Grain |
|---|---|---|
| **Folder** | A book's **home** — where it *lives*. Stable: set once, rarely moved. | Custodial |
| **Book List** | A **hand-picked queue/overlay** — shortcuts you delete from as you go. Never moves the book. | Supplemental |
| **Tag** | A **slice across homes** (genre, kind, mood). | Cross-cutting |
| **Saved Search** | An **automatic lens** over live data (ownership, collections, filters). Maintains itself. | Dynamic |

**The golden rule:** folders hold *where a book belongs*; lists/tags hold *transient status*. Status changes
often; homes shouldn't. If something maintains itself as data (wishlist-ness, read-collection membership),
use a **Saved Search**, never a hand-fed copy of the same fact.

---

## Where things go

| Thing | Home | Status tracking |
|---|---|---|
| Owned book, prolific author | `Author / Series` folder (via Auto-Organize) | Unread → `<Author> - To Read` Book List |
| Owned one-off / few-book author | **Various Authors** | Unread → **New To Read** Book List; slice by kind with **tags** |
| Topic material (Non-Fiction, etc.) | Its **topic folder** — these are structure, keep them folders | — |
| **Wishlist book** | **Its future folder, now** — the ownership upgrade keeps folder/tags/price goal on purchase, so purchase day is zero work. Bonus: series folders show ownership gaps honestly. | Visibility = **Saved Search (Ownership: Wishlist)**. Curated priorities = a **Buy Next** Book List. **Never** a Wishlist folder or a hand-maintained full-wishlist list. |
| **Sample, probably buying** | Home it like a wishlist book — sample→purchase upgrades in place, same ASIN, no rework | Ownership badge says Sample until then |
| **Sample, genuine audition** | **Inbox** (it's a pending decision — the Inbox is *for* undecided things) or a **Samples to Try** Book List | Verdict: buy → home it; reject → next row ↓ |
| **Rejected sample** | Delete it **on Amazon** (Kindle + account). It does *not* vanish from RW — next fetch **orphan-flags** it. | Periodic **🔍 Orphan sweep** (below) |
| Finished book | **Stays put.** | **Delete it from its To Read list.** Also: Amazon **Read** collection drives the Read / Uncollected Saved Searches. |

---

## Standing habits

- **Finishing a book = one delete** (from its list). Nothing moves. Ever.
- **Periodic 🔍 Orphan sweep** — the Orphan filter does the remembering: open it occasionally, review, delete
  the dead samples/removals → Trash → **Empty Trash** (tombstones them so no fetch resurrects them).
- **Inbox = only the undecided.** New arrivals and auditioning samples. Everything else has a home.
- **Dissolving a queue-folder**: books need real homes *first* (a Book List is not a home — folderless books
  get swept back to the Inbox). Per batch: select → Add to Book List → then move to homes.

## Never do

- ❌ A **Wishlist folder** or hand-maintained wishlist list — the Ownership Saved Search is always complete, free.
- ❌ Encoding **read-status in folders** (moving books when finished) — that's the queue-as-folder trap:
  moves instead of deletes, homes that lie while books are queued, clutter when you forget.
- ❌ Duplicating any **self-maintaining fact** (ownership, collection membership) into manual structure.

## Naming conventions

- **"To Read"** = imperative, the queue (e.g. `Neal Stephenson - To Read`, `New To Read`).
- **"Read"** = past tense, the finished set (the Amazon collection + its Saved Search).
