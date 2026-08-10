# TODO

> **This file is FUTURE work only.** Check items `- [x]` as you finish them; **delete all checked
> items at each release** (the release checklist does the CHANGELOG sweep first). The past lives in
> **CHANGELOG.md**, design rationale in **docs/design/**, retrospectives in **post-mortems/**.
>
> When you promote/descope an item, **move** it — never leave a stub. When you agree a bug/task
> mid-session, file a one-line `- [ ]` before moving on.

---

## 🚦 Pre-Launch (must-do before public launch)

**Docs & onboarding**
- [ ] USER-GUIDE.md + GPT manual — rewrite around the new mental model (All Books / Searches / Book Lists / Folders; custodial vs supplemental; "when to use which"), **including the Book List ↔ Folder workflow pattern** (structure lives in Folders; to-read queues live in Book Lists) and "get books out of Inbox → use a folder, not a Book List". Draw the backlog-wrangling examples from **docs/design/WORKFLOW-PATTERNS.md** (running collection of real usage patterns)
- [ ] Sizzle reel — update the script for Book Lists/Searches, then record + produce
- [ ] Add "Watch Tutorials" to the app Help menu
- [ ] Refresh the landing-page before/after screenshot (post-redesign "after")
- [ ] FAQ page — faq.html (Security/Privacy, Data/Backup, Troubleshooting, Library, General); link from Help, README, features/tutorials footers
- [ ] Custom GPT support assistant — build + link from Help menu → see docs/design/SUPPORT-GPT.md (spec)
- [ ] Disaster Recovery documentation (relay credential recovery paths; backups include creds)

**Safety / data-integrity guards**
- [ ] Restore safeguard — never silently drop Book Lists/Searches on restore; per-category keep/discard/cancel, additive-preserve → see docs/design/RESTORE-SAFEGUARD.md (spec)
- [ ] Demo-whitelist footgun guard (6f) — warn/confirm before uploading a library dramatically smaller than the relay's; make the active-whitelist banner unmissable; ensure no demo state can ship
- [ ] "Rebuild library from Amazon (full re-fetch)" affordance (6g) — clear the relay library without DevTools; pairs with the demo-whitelist guard
- [ ] Pin remaining CDN deps (6h) — React/ReactDOM to an exact 18.x; audit all HTML entry points (Tailwind's durable fix is the precompile step below)
- [ ] `integrity-homeless` investigation — real user event in v6.11.5; books in IndexedDB with no folder refs

**Launch economics**
- [ ] Revisit free-vs-paid launch plan with real relay-write numbers (Cloudflare cap is shared across all users) → see docs/design/RELAY-ECONOMICS.md (spec/data)

## 🔜 Next (6.12.x follow-ups)

- [ ] **Operations single-source-of-truth — remaining bits** — CORE shipped in **6.13.1**: folder delete (`deleteFolder`), book move/copy (all menu + drag → `moveItems`), folder reparent (menu/cut-paste/drag → `reparentFolder`), Book List create/delete, and forced undo/redo toasts (every action stamped with a label). Still un-consolidated (lower priority, less drift-prone): **tag** delete, **Search** delete, folder/Book-List **rename** (make undoable), the folder-copy **redo** TODO (js~6398, in `COPY_PASTE_FOLDER`), and optionally folding `moveItems`' folder-reparent into `reparentFolder`. → docs/design/OPERATIONS-REFACTOR.md. Feeds MODULE-SPLIT.
- [ ] **DEL deletes the folder(s) selected in the right-pane list / Folders overview** — today the DEL key only deletes the folder you're *inside* (`selectedFolderId`), not a right-pane row selection (`getSelectedFolderIds()`). Wire single-select via `deleteFolder`, multi-select via a batch confirm + one compound undo (best once the ops layer has a `deleteFolders(folders)` primitive — don't ship single-only, it's more confusing than neither). Surfaced during ops refactor #1.

**Auto-Organize ergonomics:**
- [ ] **Book List right-click menu — drop Move/Copy + block Book-List→folder drag (A)** — a Book List entry is a shortcut; Move/Copy of a shortcut INTO a folder is incoherent. When viewing a Book List, remove those two menu items (keep Add-to-Book-List, Remove-from-list, Edit, reorder); block plain AND Ctrl drag from a Book List onto a folder. (Ron, 2026-08-08 — the muddled Book-List→Inbox "move" that created the Inbox+folder+list triple-membership mess.)
- [ ] **Undo stack clears mid-session unexpectedly (D)** — twice (2026-08-07/08) the undo stack emptied with no user undo/redo, blocking recovery from a bad move. **NEEDS A REPRODUCIBLE SCENARIO** before chasing — capture the action that preceded it next time it happens.

**2026-08-10 library-cleanup findings (Ron):**
- [ ] **BUG: right-click Tags → new-tag input closes on the 2nd keystroke** (acts like Escape) — can't create a tag from the menu; had to use Tag Manager.
- [ ] **BUG: adding a folder selection to a Book List CLEARS the selection** — it should persist so you can keep scanning/adding.
- [ ] **Select already-here (destination-context) covers in the Auto-Organize preview** — so an already-filed book can be added to a Book List (it won't move — already home — but a list is a supplemental shortcut). Small size + a selection ring = "included in the list, staying put." (Philip K. Dick: 1 already filed + 4 incoming → wants all 5 on `Philip K. Dick - To Read`.)
- [ ] **Auto-Organize preview should show Book List membership** too (alongside the folder neighborhood).
- [ ] **"Other books by this author" quick-view** — from a book/folder, see the author's other books without jumping to All Books + filter + back.
- [ ] **Order tags** — drag-reorder in Manage Tags; that order drives the right-click Tags submenu (alphabetical-only today).
- [ ] **Select All in the Tags filter/menu** (complement to Clear All) — e.g. select-all then clear one tag.
- [ ] **Right-click "Open" a book while multi-selecting** — opens the book detail WITHOUT clearing the selection; normal flow opens the whole selection as a shelf (nav). Lets you ID a book mid-scan and resume. (Name per UX.)
- [ ] **USER-GUIDE/GPT note: "can't filter by field X" → tell them the workaround** (e.g. List view → add that column → sort). More than one way to skin a cat.

- [ ] **Terminology copy pass** (6.12.1) — "shortcut" language in Book List toasts/menus; explain "Linked Copies" once in manual/GPT → see docs/design/TERMINOLOGY.md (spec)
- [ ] **Author/Series whitespace hygiene** — collapse runs of internal whitespace + trim on fetch/import/edit so "Jodi  Taylor" (double space) can't split from "Jodi Taylor" (silently creates a duplicate author + orphan series in Auto-Organize). Add a **one-time cleanup sweep** for existing data. (Ron hit this on Jodi Taylor / Time Police — 2 of 7 books mis-authored, series looked incomplete in the Auto-Organize preview.)
- [ ] **Fetcher `ee6d83c` re-apply** on v4.11.10 — `LIBRARY_EXCLUDE_TAGS` named-constant/doc + delisted-book (`product=null`) count+notice adapted to coexist with null-product recovery (count only when recovery also fails)
- [ ] **Returned / expired borrows — filter & hide** — Prime/KU/library loans that were returned still clutter the library. Fetcher flags borrow nodes with `activeBorrow === false`; app adds a **"Returned" ownership filter, hidden-by-default** (toggle to show), bulk move-to-folder for keepers. **NOT** via the ASIN exclusion list (would block re-borrows). → docs/design/RETURNED-BORROWS.md
- [ ] **Folder double-store (audit F1)** — folders live in both FOLDERS_KEY and the blob; consolidate to the single guarded source (needs a load reorder). Same class as the 6.12.0 Book-List data-loss.
- [ ] **Folder-ordering Phase 2/3** — Count/Date sorts + "bake to Manual" → see docs/design/FOLDER-ORDERING.md (spec)
- [ ] **Book Lists management view** + generic orderable-left-pane-section ordering (Folders/Views/Book Lists uniform) → see docs/design/FOLDER-ORDERING.md (spec)
- [ ] Mobile nested collapsible sub-shelves (Dashboard) — deferred pending real-world use of per-shelf collapse
- [ ] Delete from All Books — soft-delete to Trash, removing from ALL folders + Book Lists at once (reuse membership snapshot; confirm dialog discloses count)
- [ ] Rectangle/Lasso selection in cover view (extends `explorerSelectedItems`)
- [ ] Fetcher follow-ups: ownership-**upgrade** live positive test; recovery-sweep Stage 2 (fold into orphan scan); un-trash on ownership upgrade (storage.js); fix the "772%" enriched ratio
- [ ] Book detail dialog tooltips (esp. Collections = read-only-from-Amazon)
- [ ] Wishlist fetcher — capture real binding on add (product-page `bindingInformation`), not only after enrichment
- [ ] Metadata import (paste-list / CSV) + matching → see docs/design/Metadata-Import.md

- [ ] Comma-separated series-position multi-edit ("2, 4" mapped to selected books in display order) — **needed for David Drake / Raj Whitehall** (ownership gaps that "renumber by current order" can't handle)
- [ ] **Omnibus / multi-volume series position (B)** — a single book that IS volumes 1–3 wants a range/multi position (`1-3` or `1,2,3`) on ONE record. Distinct from the comma-separated multi-edit above (which spreads a sequence across MANY books). Needs a data-model decision: `seriesPosition` is a single value today ("1-3" would sort as 1, display as text). Consider a `seriesPositionEnd` or a positions array + sort/display/number-by-order handling. (Ron, 2026-08-09.)
- [ ] Folder "Move to Top / Move to Bottom" context items (D)
- [ ] Fix drag-subfolder→root drop-position (**confirmed still broken 2026-08-03**, annoying) — dropping a subfolder at root lands it alphabetical-ish near the bottom instead of at the drop target; shares a root cause with new-folder alphabetical insert + Move-to stale position
- [ ] Book Lists: **"Arrange by series #"** — in Manual mode, bake the series-number order into the list's manual order (persistent, then hand-tweak). The Book-List analog of folder sort-then-bake; a one-time rearrange, not a live sort mode. (Distinct from the existing "Number by current order," which sets each book's *position value*, not the list's order.)
- [ ] **Left-pane jump-to-top/bottom placement** — both chevrons now ship, but they sit at the **bottom-left**, not at the two **scrollbar ends** as originally intended (Ron expected top-at-top / bottom-at-bottom). Scroll affordances conventionally live by the scrollbar (right). Reconsider: move the pair to the right near the scrollbar (spatial mapping), or adopt the single context-aware "back to top" that appears on scroll-down. **Per-section jump** (Searches / Book Lists / Folders): skip — the collapsible sections already handle that navigation.

## 🗄️ Backlog (post-launch)

**Relay / data robustness**
- [ ] Relay write redesign (atomic commit-pointer + app-owned key + wishlist-delta) → see docs/design/RELAY-WRITE-REDESIGN.md (spec)
- [ ] Tombstone delete (durable purge + smart resurrect) → see docs/design/TOMBSTONE-DELETE.md (spec)
- [ ] Edit Kindle collections from WR → see docs/design/COLLECTION-EDITING.md
- [ ] Relay delta-append for cheap incremental sync (OPTIONAL) → see docs/design/RELAY-DELTA.md (spec)
- [ ] Relay Disconnect / Reset credentials in Relay Setup
- [ ] Relay credential mismatch — safe restore (prompt on cred mismatch) → see docs/design/RELAY-CRED-MISMATCH.md (spec)

**Features**
- [ ] Keyboard accessibility completion (focus trapping, `:focus-visible`, context-menu keys)
- [ ] Reading progress visualization (dialog + column)
- [ ] Book recommendations → see docs/design/BOOK-RECOMMENDATIONS.md
- [ ] Family sharing info (shared-with in book dialog)
- [ ] Auto-Organize: aggregate co-authored books under each author → see docs/design/AUTO-ORGANIZE-COAUTHORS.md (spec)
- [ ] V2 dual-pane split → see docs/design/archive/DUAL-PANE-SPLIT.md
- [ ] Multi-store architecture → see docs/reference/MULTI-STORE-ARCHITECTURE.md
- [ ] Multi-user support (low priority; Backup/Restore workaround exists) → see docs/design/archive/MULTI-USER-DESIGN.md
- [ ] Smart Collections (rule-based)
- [ ] Wishlist series gap detection
- [ ] Collections filtering enhancements (read status / collection name / uncollected)
- [ ] Reading stats dashboard
- [ ] Enhanced export options (CSV, print-friendly list)
- [ ] Third-party integrations (Goodreads / StoryGraph)
- [ ] Live reflow drag-and-drop animation

**Tech / performance**
- [ ] Precompile build step (Babel + Tailwind → static) — removes in-browser Babel/Tailwind; the durable load-time + CDN-pin fix → see docs/design/PRECOMPILE.md (spec)
- [ ] Refactor readerwrangler.js into modules (re-assess — uiHelpers/storage/integrity already split) → see docs/design/MODULE-SPLIT.md (spec)
- [ ] Phase 3 UI error handling (missing-description banners)
- [ ] Tooltip audit — Tag from Collections wizard (6e)
- [ ] console.log audit (~70 statements — keep/gate/remove)
- [ ] v4 → v5 feature-parity audit
- [ ] Deferred desktop polish (left-pane keyboard nav; directional shadow consistency)

## 🧊 Icebox (no timeline)
- [ ] Safari browser testing (desktop + iOS; IndexedDB / PWA / CSS risk)
