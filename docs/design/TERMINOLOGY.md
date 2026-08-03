# Terminology — "shortcuts" (Book Lists) + "Linked Copies" (Folders)

_Moved verbatim from TODO.md during the 6.12.0 TODO restructure (2026-08-03). FINAL decision 2026-07-07. The copy pass ships in 6.12.1._

---

Book List items = **"shortcuts"** (deletable pointers; the book stays). Folder items = **"Linked Copies"** — explain ONCE in the manual, then just **"Copies"** (edits propagate across all, co-equal, no primary). Rejected "shortcut for folders" (implies a primary + soft-links) and "Magic Copies" (gimmicky); "Linked" chosen over "Synchronized" (no sync-*process* connotation).

**Scope (Ron confirmed): the folder "Copy"/"Copy to" UI is already correct — leave it.**

The actual work:
1. introduce **"shortcut"** language in **Book List toasts + menus** (e.g. delete-from-list → "remove shortcut", add → "add shortcut");
2. explain **"Linked Copies"** once in the manual/GPT.

**Anchor model for the manual:** *All Books is where the book truly lives; Folders hold Linked Copies of it; Book Lists hold shortcuts to it. Delete a copy → out of that folder; delete a shortcut → off that list; the book survives in All Books until trashed.*

Do in a focused copy pass (6.12.1 / Phase 9).

---

## Companion doc note — Book List ↔ Folder workflow pattern (for user guide / support GPT)

Ron's real usage: author/series *structure* lives in **Folders** (with hierarchy, e.g. `New To Read/Old Free Stuff` for dubious early-Kindle freebies); reading-order / "to-read" *queues* live in **Book Lists** (`<Series> — To Read`; delete the shortcut as each is finished). Two equivalent flows: (a) file in a folder now + put a shortcut on a "New To Read" list up-front, or (b) keep in a staging folder and move to `Various Authors` once read. Folders give sub-category hierarchy that Book Lists can't. Teach this as the canonical organizing pattern. (Also: "get books out of Inbox → use a folder, not a Book List.")
