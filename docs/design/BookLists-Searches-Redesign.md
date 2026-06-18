# ReaderWrangler — Book Lists / Searches / Folders Redesign

**Design document.** Specifies a redesign of how saved sets of books work in ReaderWrangler. This is the agreed target, **not** an instruction to start coding. Nothing has been implemented. When build begins: confirm with the user, follow the project's normal version workflow, and **push to `dev` first** for testing on the dev GitHub Pages site before any prod release.

Baseline at time of writing: desktop bundle `readerwrangler.js`, `APP_VERSION = "6.11.9"`.

> **Status:** This started as a hand-off of a design discussion (claude.ai → Claude Code) and has since been refined into a design doc. The user-facing wording captured here (§6) is raw material for future help text and tooltips, not final copy.

---

## 1. How the problem came to be

Two separate sources of confusion collided.

**a) The create-affordance was undiscoverable.** Creating a saved view was done only by dragging a small grab handle — one on the filter bar ("Drag to Views in sidebar to save this filter as a view"), one per-row in Tag Manager ("Drag to Views in sidebar to save as a view"). There was no `+` button on the Views section header (the chevron there is only collapse/expand). The user, returning after ~2 months away and not being the original author of the code, could not find how to create a view and assumed a `+` should exist like the one on Folders.

**b) "View" silently meant two different things, and neither matched the user's mental model.** In the original code a view was a **live saved filter** — it stored `{ id, name, filters, position }` and never stored a book list. Membership was recomputed every render via `bookMatchesFilters(book, view.filters)`. Folders, by contrast, store an explicit `bookIds` array. Consequences that surprised the user:

- A "tag view" was really the live query `{ tags: [tagId] }`. Tagging another book later made it appear in the view; untagging removed it. It was not a frozen snapshot.
- Dragging a book from a folder *into* a tag view did **not** add it to the view as a list member — it applied the tag (the drop routed to a tag operation). The user observed exactly this: a toast said the book was added to *the tag*, and opening the book showed it had been tagged.
- "Remove from view" on a tag view worked by **stripping the tag** from the book, so it also left everywhere else that tag was used.
- You could not create an empty view and drag arbitrary books into it. The only ways to create a view made a *new* one seeded from a filter or tag; you could not drag into an existing one to add members (only reorder).

The user's actual goal — a short, hand-picked "Next to Read / Re-read Time Travel" list of 5–6 specific titles — is a **manually curated set**, which the original object could not represent. That mismatch is the root cause.

This was bottom-up design: the old "view = filter/tag" model made sense while building specific features, but seen fresh from the top down — "I should be able to make a hand-picked list" — it was missing the concept the user actually wanted.

---

## 2. The core reframe

The single word "View" was conflating concepts that are genuinely different. The redesign gives each behavior exactly one clearly-named home in the sidebar, plus the search bar:

- **All Books** — the one built-in dynamic aggregate. Lists every unique non-deleted book, updates itself, read-only. A standalone item at the top of the sidebar.
- **Searches** — saved filter presets. Opening a Search **restores its saved filter state in place** (the filter bar shows exactly those chips), applied to wherever you currently are — identical to typing those filters by hand. It's "live" in that the filters re-evaluate against current data, but it does **not** navigate you anywhere or force a library-wide scope. See [the scope decision below](#searches-restore-filter-state-in-place-decided-2026-06-18).
- **Book Lists** — hand-picked, curated sets, like music playlists. Explicit membership; stable; changes only when the user adds or removes a specific book.
- **Folders** — unchanged: hierarchical, custodial, drive Auto-Organize.

Because every section is named for exactly what it is, the user no longer needs a memorized rule to tell live from static — **the category name carries the meaning.** A thing under *Searches* is obviously live; a thing under *Book Lists* is obviously a fixed list.

> **Note — a principle from the original discussion was retired.** An earlier draft leaned on the rule *"if you made it, it's a fixed list; if the app made it, it might be live."* That rule no longer holds, because the user now makes Searches and those are live. It was only ever a crutch needed while live queries hid in the search bar; with an explicitly-named *Searches* group, the crutch is unnecessary and has been dropped.

### Searches restore filter state in place (decided 2026-06-18)

**A Search is a saved filter *preset*, not a smart-folder destination.** Opening a Search
sets the filter bar to its saved chips and applies them **to your current folder** — exactly
as if you had typed those filters by hand. It does not navigate you to a library-wide view.

**Why (the governing principle is least astonishment):** how you *arrive* at a filter state
must not change its meaning. Setting "Rating 4+" by hand and recalling a saved "Rating 4+"
Search must yield the **same** result. In ReaderWrangler, filters are already an overlay on
the current folder, so a saved filter must compose the same way; anything else makes recalled
filters behave differently from typed ones — the exact confusion this redesign exists to remove.

**Why not the Smart-Folder pattern** (Finder/Lightroom/Outlook, where a saved search is a
library-wide *place* you navigate into): that model fits apps with no "folder you're already
in" to compose with. RW has real folders and overlay filters, so importing smart-folder
semantics would reintroduce the recalled-≠-typed inconsistency. Rejected.

**Consequences:**
- Clicking a Search restores the global filter state and **leaves you in your current folder**;
  the Active Filters banner lights up identically to a hand-typed set.
- Result scope follows *where you are*: in **All Books** a Search spans the library; inside a
  folder it's that folder filtered. Same Search, context-dependent results — and that's correct,
  because it's just filters.
- This **removes** the virtual "view-folder" navigation the earlier phases used — simplifying
  the design (that machinery was already slated for Phase 7 cleanup).
- Earlier doc language ("re-runs against the current library") is superseded by this section.

A Book List is structurally almost identical to a Folder (both are `bookIds` sets). The difference is **intent**, not mechanism: a Folder is an exclusive bucket in a hierarchy (genre/author/series) and participates in Auto-Organize; a Book List is a flat, cross-cutting, supplemental list that does not.

**On the name "Book Lists":** ReaderWrangler already has a first-class concept called **Collections** — the read-only Kindle Collections imported from Amazon (referenced in the existing filter tooltip and the *File › Tag from Collections* command). Reusing "Collections" for the new curated-list concept — which has the *opposite* editability semantics — would recreate exactly the kind of confusion this redesign exists to eliminate. So the new concept is **Book Lists**. (Amazon "Collections" keep their name; we don't override Amazon terms.) "Book Lists" is broad enough to survive non-reading uses, book-native, and collision-free; the playlist analogy that teaches its reference/non-destructive semantics lives in the tooltip rather than in the name.

---

## 3. Final architecture — sidebar structure

```
All Books      standalone item — dynamic, read-only, the whole library
Searches       group — saved live queries
Book Lists     group — curated static sets
Folders        group — hierarchical, custodial, Auto-Organize
Inbox / Trash  as today
```

- **All Books** is a standalone top item, not a one-item group — it's the default view, so it gets first position and one click with no group-header ceremony.
- **Searches** holds saved/pinned live queries. (See §5 for the relationship to the ephemeral search-bar history dropdown.)
- **Book Lists** is flat (no nesting), each a stored `bookIds` set, excluded from Auto-Organize.
- **Folders** are unchanged.

**Custodial vs supplemental** is the load-bearing distinction:

- **Custodial** = Inbox / Folders. These account for a book's existence. A book is always in Inbox or at least one Folder (plus the virtual All Books). Deleting the last custodial copy trashes the book.
- **Supplemental** = Book Lists. They reference a book that exists elsewhere. Removing a book from a Book List never affects the book's existence and never trashes it. **Book Lists must never become a custodial location** — no code path may leave a book in a Book List while removing it from all Folders.
- **Searches** hold no membership at all — they are queries, not containers — so the custodial question doesn't arise for them.

---

## 4. Decision log (what we chose and why)

| # | Decision | Rationale |
|---|----------|-----------|
| 1 | New curated concept is **Book Lists**, not "Collections". | "Collections" already means the read-only Amazon Kindle Collections; reusing it with opposite (editable) semantics would recreate the confusion this redesign fixes. |
| 2 | Three honest sidebar categories — **Searches** (live), **Book Lists** (static), **Folders** (custodial) — plus **All Books** standalone. | Replaces the fuzzy, overloaded "View." Each name states exactly what the thing is; no memorized live-vs-static rule needed. |
| 3 | User-created **Book Lists are always static**; live queries live as **Searches**. | Removes the conflation that made "view" mean two contradictory things. The category a thing lives in tells you whether it's live. |
| 4 | Live queries are **saved Searches in their own sidebar group**, not disguised static-looking rows. | Saved live searches belong in the sidebar (cf. Finder Smart Folders, Photos Smart Albums, iTunes Smart Playlists, Outlook Search Folders) — but in a section clearly labeled as searches, so liveness is self-evident. |
| 5 | **No auto-naming** of Book Lists or Searches. Naming is optional. | Auto-naming (e.g. naming a view "TimeTravel" after a tag) is what trained the false expectation that the set tracks the tag. Optional naming breaks that implied link; forcing a name is a real burden (a good name is often the hardest part). |
| 6 | **One general icon** for Book Lists; All Books and Searches keep distinct icons. | Once a Book List is just a static set, the seed source (tag vs filter) is irrelevant history; the icon shouldn't describe *how it was made*. |
| 7 | Dragging a book into a Book List adds to its `bookIds` only — **never applies a tag**. | The original tag-application-on-drop was the single most surprising bug-like behavior; Book Lists must be pure membership. |
| 8 | Right-click "Remove" on a Book List removes from that list only — **never untags, never trashes**. | Supplemental semantics; the user controls one list at a time. |
| 9 | A single visible **"Save these results…"** control captures the current search/filter results as either a **Search** (live) or a **Book List** (snapshot), or adds them to an existing Book List; duplicates discarded. | Replaces the hidden grab handles (the original discoverability bug) with one visible control that teaches the static-vs-live choice at the moment of decision. Subsumes the old "seed from filter" and "add current results" actions. |
| 10 | **Searches may carry an optional name.** Named searches show the name; unnamed show their (truncated) filter chips. Hovering always reveals the full chips, which remain authoritative. | Friendly labels for complex live queries without recreating the "label says one thing, terms do another" lie — the chips are always one hover away and are the source of truth. |
| 11 | **Save/pin via a visible control**, not a hidden affordance. Recents live in the search-bar dropdown (ephemeral); saving graduates one into the Searches sidebar group (persistent). | The whole problem started with a hidden drag handle; every create/save path must be visible. Clean split: the bar holds what's recent, the sidebar holds what you kept. |
| 12 | **Search history** captures the *committed* filter combination (debounced text term), dedupes by the existing canonical filter key, moves-to-top on repeat. | Avoids thrashing the recent list on every keystroke; reuses the dedup key already used for view duplicate detection. |
| 13 | **Deletion warning** appears only on the last *custodial* copy. When shown, it discloses Book List fallout. Non-last-copy deletes are silent. | A non-last-copy delete doesn't change the book's existence, so there's nothing about Book Lists to warn about. |
| 14 | **Trash/Undo snapshot the full placement set** (all Folders + all Book Lists) before delete; restore rebuilds every membership; the toast names both folders and lists. | A Book List membership is book state like tags/ratings/notes; Trash must not silently eat curation. Restore and Ctrl+Z share the same recorded placement set so they can't diverge. |
| 15 | **No migration.** User base is N=1; no Book Lists worth preserving exist in backups. | Existing auto-named tag/filter views can simply be dropped on upgrade. |

---

## 5. Behavior specification (authoritative)

### All Books
- Dynamic, read-only; shows every non-deleted unique book. Cannot move/delete books out of it. Honors the active filter bar for display counts (already does).
- Standalone item at the top of the sidebar; no group header.

### Searches section
- Holds **saved** live queries. Each, when opened, re-runs its filter against the current library — this is the "always-current shelf" mechanism.
- **Display:** a named search shows its name; an unnamed search shows a **compact/truncated** rendering of its filter chips (e.g. `"niven" · Read · Wishlist…`). Hovering reveals the full chips. The chips are always the source of truth; the name is an optional convenience caption and is never required.
- **Saving:** searches are saved from the search bar / the "Save these results…" control (see Book Lists below). Recent-but-unsaved searches appear only in the **search-bar dropdown** (ephemeral, evictable). Saving one moves it into this sidebar group (persistent).
- **Ordering:** searches support custom (manual) ordering within the group.
- Read-only to drops: dragging a book onto a Search does nothing (a Search has no membership to add to).

### Search bar — recents
- The active search renders as labeled chips, e.g. `Search: "niven" | Read: READ | Ownership: Wishlist` (existing display).
- The **history dropdown** shows recent committed search combinations (most-recent-N).
  - A combination enters history when **committed**, not on every keystroke: debounce the text term, canonicalize, dedupe by the existing filter key, move-to-top on repeat.
  - Recent items can be evicted as new ones arrive. Saving one (to the Searches group) is how it persists.

### Book Lists section
- **Create empty:** `+` on the Book Lists header creates a new **empty** Book List. The user names it inline, like a new Folder. No auto-generated name.
- **Create / add from results:** with a search or filter active, a visible **"Save these results…"** control offers:
  - **Save as a Book List** — new list whose members are a **snapshot** of the current matches.
  - **Add to an existing Book List** — pours the current matches into a chosen list. Duplicates discarded.
  - (and **Save as a Search** — see Searches; the same control is the single home for "keep this set," live or frozen.)
- **Add individual books:** drag book(s) — visible book rows — from a Folder (or anywhere) into a Book List → adds to that list's `bookIds` only. **No tag is applied. No toast about tagging.**
- **Remove:** select book(s) in a Book List, right-click → Remove → removes from this list only. **No tag changed. Book never trashed**, even if this is the only list it's in (it still lives in Inbox/Folders).
- **Ordering:** Book Lists support custom (manual) ordering of their members, like folders.
- **Membership is frozen:** changing a tag, or a filter, later never changes a Book List's contents.
- **Auto-Organize ignores Book Lists entirely.**
- **No nesting. One general Book List icon.**

> There is no hidden grab handle anywhere. The filter-bar grab handle and the Tag Manager per-row handle are both removed. The tag use case ("capture a tag's members as a list") is served by the general path: filter by the tag → "Save these results as a Book List."

### Folders
- Unchanged. Hierarchical, custodial, Auto-Organize participants, existing last-copy delete behavior.
- Note: a book may legitimately be in more than one Folder (e.g. an anthology filed under multiple author/series folders). This is existing behavior and matters for restore (below).

### Deletion warnings (custodial deletes)
- **Last custodial copy AND on one or more Book Lists:** warn and disclose, e.g. "This is the last copy in your folders. Deleting it will move it to Trash and also remove it from the book lists X, Y, Z."
- **Last custodial copy, not on any Book List:** existing last-copy warning, unchanged.
- **Not the last custodial copy:** no warning at all (the book still exists elsewhere), regardless of Book List membership.

### Trash / Undo
- On delete, **snapshot the book's full placement set first**: every Folder it was in **and** every Book List it was on. Stash this on the trashed-book / undo record (do not rely on the folder list after removal — current code strips `bookIds` from folders on delete).
- **Restore (from Trash) and Undo (Ctrl+Z) both rebuild the entire placement set** — all folders and all book lists — from that same recorded snapshot, so the two paths cannot diverge.
- The restore/undo **toast names both**: e.g. "Restored *Foundation* to Asimov, Anthologies and the book list Re-read next."

### Migration
- None. On upgrade, existing auto-named dynamic tag/filter views may simply be removed. No need to convert them (N=1). A one-line first-launch note that "saved views are now Book Lists and Searches" is optional courtesy, not required.

---

## 6. Ready-to-use help / tooltip copy (raw material, not final)

Short hover tooltip on the **All Books** / sidebar:

> All Books, Searches, Book Lists and Folders all show the same books in different ways — never extra copies. Deleting from a search or list never deletes a book.

Explainer dialog (reachable from an ⓘ icon on a section and/or the Help menu; optionally shown once on first `+` click with a "Got it / don't show again"):

> **All Books** lists every unique book in your library and updates itself; you can't move books out of it.
>
> **Searches** are saved filter presets. Set up a filter (e.g. "everything unread" or "on sale right now") and save it — clicking it later puts those same filters back exactly as if you'd typed them, applied to wherever you are. You can give it a name. Great for filter combinations you reach for often.
>
> **Book Lists** are sets you build by hand — like a "read next" shelf, or music playlists. Click **+** to make an empty list and name it, then drag books into it from any folder. A book can be on as many lists as you like, and a list never changes on its own. Removing a book from a list only affects that list — it doesn't untag, move, or delete the book. You can also capture a set of results at once: run a search and choose **Save these results → as a Book List**. That's a one-time snapshot, not a live link.
>
> **Folders** organize your library into a hierarchy (genre, author, series) and feed Auto-Organize. A book lives in folders; searches and lists just point at it.

Tooltip on the **"Save these results…"** control:

> Keep this set of books. *Save as a Search* to save these filters and re-apply them anytime, or *Save as a Book List* to freeze these exact books into a hand-editable list.

Tooltip on a **saved Search** row:

> A saved filter — click to re-apply these filters to your current view.

Tooltip on a **Book List** row / the `+`:

> A hand-picked list of books, like a playlist. A book can be on many lists; removing it here never deletes the book.

---

## 7. Implementation notes & gotchas for build time

- **Book Lists reuse the Folder machinery** (`bookIds`, drag-in, remove, custom order, delete-cleanup) but with three deltas: flat (no nesting), excluded from Auto-Organize, and excluded from custodial/last-copy accounting.
- **Do not route Book List drops through tag operations.** The original view-drop path applied a tag; Book List drops must mutate `bookIds` only.
- **Custodial invariant is load-bearing:** never create a path that removes a book from all Folders while leaving it on a Book List. Book Lists are not custodial.
- **Snapshot-before-delete:** the existing delete path removes `bookIds` from every folder. Capture the full placement set (folders + book lists) *before* that and persist it on the trashed/undo record, or restore comes back incomplete.
- **Searches hold no `bookIds`** — they store filter criteria (+ optional name + position), like the old views did. The membership is always derived. This is the *only* place derived membership survives, and it's now honestly labeled.
- **Search-history dedup** should reuse the canonical filter key already used for view duplicate detection (`JSON.stringify(filters, Object.keys(filters).sort())` style), so committed combinations dedupe consistently. Recents (search-bar dropdown) and saved Searches (sidebar) are the same shape; "saving" is just promoting one to persistent.
- **Search name is a caption, not a field that replaces chips.** Keep the rendered chips as the source of truth; store the name separately and render it as a prefix/label only. Unnamed searches render truncated chips with full chips on hover.
- **Discoverability is the whole point of this exercise:** every create/save path is a visible control (`+`, "Save these results…", visible book-row dragging). No hidden grab handles remain anywhere.
- **As-is reference points in `readerwrangler.js` (v6.11.9), for orientation only — verify before relying on line numbers:** `createSavedView` / `autoNameView` (~1040–1090); live filter application for views in the explorer filter (~1259–1262); view book-list returns all books then filters (~1106–1110); tag-view drop routes to `reorderBooksInTagView` (~13710); "remove from tag view" strips the tag (~16789–16806); Tag Manager per-row drag handle sets `application/x-filter-view` (~14738) — **to be removed**; filter-bar drag handle (~8194) — **to be removed**; Views header + drop zone (~11229–11290) — **to be reworked into All Books + Searches + Book Lists**.

---

## 8. Explicitly deferred / out of scope

- The old auto-named tag/filter views are removed, not migrated (N=1).
- Hybrid lists (filter seed + manual include/exclude overrides) were considered and rejected as too hard to keep coherent and explain. If you want frozen, make a Book List; if you want live, make a Search.
- No data migration is being written.

---

## 9. Workflow reminder (for when build begins)

Follow the project's ground rules: discuss/confirm before implementing, increment the version before changes, and **push to `dev` first** (`git push dev main`), test on the dev GitHub Pages site, and only release to prod on explicit approval. Update `CHANGELOG.md` (with a Technical Notes entry capturing the custodial-vs-supplemental distinction and the snapshot-before-delete requirement) and `TODO.md` as appropriate.
