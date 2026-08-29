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
- [ ] **Rename user-facing "Relay" → "Cloud Sync"** (Cloud Sync Setup / Import from Cloud; status section, tooltips, fetcher overlays, recovery steps) — kills the engineering term that leaked into the UI; "Cloud Relay" considered and rejected as jargon-plus-clunk (2026-08-28). Internal names (`RWRelay`, filenames, worker) unchanged. Pure copy-pass, ~20-40 strings + README/features/tutorials. **Fold into the USER-GUIDE rewrite** so the new names bake into the docs in one motion. Renames are free pre-launch and expensive forever after.
- [ ] Sizzle reel — update the script for Book Lists/Searches, then record + produce
- [ ] Add "Watch Tutorials" to the app Help menu
- [ ] Refresh the landing-page before/after screenshot (post-redesign "after")
- [ ] FAQ page — faq.html (Security/Privacy, Data/Backup, Troubleshooting, Library, General); link from Help, README, features/tutorials footers
- [ ] Custom GPT support assistant — build + link from Help menu → see docs/design/SUPPORT-GPT.md (spec)
- [ ] Disaster Recovery documentation (relay credential recovery paths; backups include creds)

**Safety / data-integrity guards**
- [ ] Demo-whitelist footgun guard (6f) — warn/confirm before uploading a library dramatically smaller than the relay's; make the active-whitelist banner unmissable; ensure no demo state can ship
- [ ] "Rebuild library from Amazon (full re-fetch)" affordance (6g) — clear the relay library without DevTools; pairs with the demo-whitelist guard
- [ ] Pin remaining CDN deps (6h) — React/ReactDOM to an exact 18.x; audit all HTML entry points (Tailwind's durable fix is the precompile step below)
- [ ] `integrity-homeless` investigation — real user event in v6.11.5; books in IndexedDB with no folder refs
- [ ] **Mid-sweep challenge detection** — classify challenge-shaped responses (HTML where JSON expected, validate-captcha redirect, robot-check 503) in the fetchers' retry path and halt with an honest message: "Amazon is asking for a human check. Open any Amazon page, complete it, then re-run — everything fetched so far is safe." (That last clause is TRUE post-7.0: a halted run is uncommitted and invisible.) Phase 0 already guards startup; this covers a challenge appearing mid-run, which today reads as generic API errors. Never observed yet — cheap pre-launch hardening. (External review item 7 kernel.)

**Launch economics**
- [ ] Flip to Workers Paid ($5/mo) at or shortly before public launch — analysis DONE (RELAY-ECONOMICS.md, 2026-08-28): post-7.5.0 levers, flat $5 covers ~250 Ron-like users; free tier is ~6-10 and SHARED. This is now just the act of upgrading the Cloudflare plan at the right moment.

## 🔧 7.0.0 follow-ups (relay)

- [ ] **Checkpoint the cold (first-time) fetch** — a ~3,000-book initial enrichment has no resume; die at book 2,800, start over. 7.0 makes it natural: send enrichment progress as mailbox letters in stages so a resumed run's skip-hint already knows what's done. Bites each user exactly once — low priority, pre-launch nice-to-have. (From the 2026-08-21 external sync review, item 1's salvageable kernel.)

- [ ] **Worker/client protocol-constant drift note** — `LETTER_TTL` (worker, seconds) and `LETTER_TTL_MS` (client) are mirrored by hand; same for the minted-id format. Fine at 2 constants with cross-reference comments; revisit a shared protocol-constants module if a third appears. (Worker is the same language — JS — different runtime; sharing is possible, low value today.)

## 💰 Price sweep scoping + staleness display (agreed 2026-08-21, from external sync review item 2)

- [ ] **Format watch (LOW priority)** — `formatWatch: 'kindle'` on print-edition placeholders; slow-lane detection of a Kindle edition appearing; on hit, OFFER (never auto) a swap to the new ASIN carrying folder/Book List/tags/price goal (cousin of the wishlist→owned upgrade). KEY VERIFY first: does the batch enrichment API expose sibling editions for a print ASIN, or does detection need per-book product-page fetches? LOW because the live cases are mostly covered: Amazon author-follow notifies on new-format releases (Heinlein), and for withdrawn-Kindle books already recorded as Kindle, the price REAPPEARING in the normal price sweep is itself the availability signal (The Destroyer's 18 withdrawn titles) — the only uncovered gap is print-placeholder→Kindle detection. (External review item 6.)
- [ ] **Optional "slow lane": occasional re-enrichment of buyable books** (ratings/review counts — frozen at first fetch today, which is fine for owned books but mildly stale for purchase decisions). Monthly-ish or every-Nth-fetch, reusing item-2's scoped list + batch calls. 7.0 letters make it interruption-safe: results go out as a run; tab closes, so be it — nothing torn, resumes next time. NOT the per-book adaptive-TTL machinery from the external review (a beautiful solution to a scale problem we don't have). Likely shared mechanism with the format watch above. (External review item 3 kernel.)

## 🔜 Next (6.12.x follow-ups)

- [ ] **Operations single-source-of-truth — remaining bits** — CORE shipped in **6.13.1**: folder delete (`deleteFolder`), book move/copy (all menu + drag → `moveItems`), folder reparent (menu/cut-paste/drag → `reparentFolder`), Book List create/delete, and forced undo/redo toasts (every action stamped with a label). Still un-consolidated (lower priority, less drift-prone): **tag** delete, **Search** delete, folder/Book-List **rename** (make undoable), the folder-copy **redo** TODO (js~6398, in `COPY_PASTE_FOLDER`), and optionally folding `moveItems`' folder-reparent into `reparentFolder`. → docs/design/OPERATIONS-REFACTOR.md. Feeds MODULE-SPLIT.
- [ ] **DEL deletes the folder(s) selected in the right-pane list / Folders overview** — today the DEL key only deletes the folder you're *inside* (`selectedFolderId`), not a right-pane row selection (`getSelectedFolderIds()`). Wire single-select via `deleteFolder`, multi-select via a batch confirm + one compound undo (best once the ops layer has a `deleteFolders(folders)` primitive — don't ship single-only, it's more confusing than neither). Surfaced during ops refactor #1.

**Auto-Organize ergonomics:**
- [ ] **Book List right-click menu — drop Move/Copy + block Book-List→folder drag (A)** — a Book List entry is a shortcut; Move/Copy of a shortcut INTO a folder is incoherent. When viewing a Book List, remove those two menu items (keep Add-to-Book-List, Remove-from-list, Edit, reorder); block plain AND Ctrl drag from a Book List onto a folder. (Ron, 2026-08-08 — the muddled Book-List→Inbox "move" that created the Inbox+folder+list triple-membership mess.)
- [ ] **Undo stack clears mid-session unexpectedly (D)** — twice (2026-08-07/08) the undo stack emptied with no user undo/redo, blocking recovery from a bad move. **NEEDS A REPRODUCIBLE SCENARIO** before chasing — capture the action that preceded it next time it happens.

**2026-08-10 library-cleanup findings (Ron):**
- [ ] **Auto-Organize preview should show Book List membership** too (alongside the folder neighborhood).
- [ ] **"Other books by this author" quick-view** — from a book/folder, see the author's other books without jumping to All Books + filter + back.
- [ ] **Right-click "Open" a book while multi-selecting** — opens the book detail WITHOUT clearing the selection; normal flow opens the whole selection as a shelf (nav). Lets you ID a book mid-scan and resume. (Name per UX.)
- [ ] **USER-GUIDE/GPT note: "can't filter by field X" → tell them the workaround** (e.g. List view → add that column → sort). More than one way to skin a cat.
- [ ] **Cross-section drag: Folders ↔ Book Lists** (DECIDED 2026-08-29) — honesty fixes (Added-not-Moved toast/undo from list views; kill fake drop affordances incl. the blanket left-pane preventDefault; undoable list reorder; toast over-count; Trash leak) + the two gestures: folder **ON** a list row = add its books; folder/books **BETWEEN** rows = create new list(s) there, named `<folder name> - To Read` for folders / engine-named for books (grabbed-noun principle, Beach-Reads example); right-click New gains current-folder-name fallback → docs/design/CROSS-SECTION-DRAG.md (spec)
- [ ] **Search everywhere — scope toggle + zero-result nudge** (Ron, 2026-08-29) — answers "is this book in my library?" WITHOUT losing your spot. Search box stays folder-scoped by default; while searching, show a scope toggle **This folder | Everywhere** (Finder/Explorer search-in-place convention). "Everywhere" shows all-library matches in the right pane as a temporary view (reuse the view-folder filter-stash plumbing); clearing the search returns to the folder + scroll position untouched. **Discoverability engine**: the empty-result state offers *"No matches in ‹folder› — Search everywhere?"* as a one-click link (Gmail/Amazon convention). Result rows pair with the existing "see where a book lives" popup — the answer arrives with locations.

- [ ] **Terminology copy pass** (6.12.1) — "shortcut" language in Book List toasts/menus; explain "Linked Copies" once in manual/GPT → see docs/design/TERMINOLOGY.md (spec)
- [ ] **Author/Series whitespace hygiene** — collapse runs of internal whitespace + trim on fetch/import/edit so "Jodi  Taylor" (double space) can't split from "Jodi Taylor" (silently creates a duplicate author + orphan series in Auto-Organize). Add a **one-time cleanup sweep** for existing data. (Ron hit this on Jodi Taylor / Time Police — 2 of 7 books mis-authored, series looked incomplete in the Auto-Organize preview.)
- [ ] **Fetcher `ee6d83c` re-apply** on v4.11.10 — `LIBRARY_EXCLUDE_TAGS` named-constant/doc + delisted-book (`product=null`) count+notice adapted to coexist with null-product recovery (count only when recovery also fails)
- [ ] **Returned / expired borrows — filter & hide** — Prime/KU/library loans that were returned still clutter the library. Fetcher flags borrow nodes with `activeBorrow === false`; app adds a **"Returned" ownership filter, hidden-by-default** (toggle to show), bulk move-to-folder for keepers. **NOT** via the ASIN exclusion list (would block re-borrows). → docs/design/RETURNED-BORROWS.md
- [ ] **Folder double-store (audit F1)** — folders live in both FOLDERS_KEY and the blob; consolidate to the single guarded source (needs a load reorder). Same class as the 6.12.0 Book-List data-loss.
- [ ] **Folder-ordering Phase 2/3** — Count sort (Date REJECTED 2026-08-29, derivable later if ever wanted) + "bake to Manual" + **pin-to-top** (Ron-approved 2026-08-29: pinned specials stay put while the rest live-sorts by Name — dissolves the recurring re-bake-and-rescue cycle during the 1000+-book Inbox backlog grind; see spec's Pinned folders section) → see docs/design/FOLDER-ORDERING.md (spec)
- [ ] **Book Lists management view** + generic orderable-left-pane-section ordering (Folders/Views/Book Lists uniform) → see docs/design/FOLDER-ORDERING.md (spec)
- [ ] Mobile nested collapsible sub-shelves (Dashboard) — deferred pending real-world use of per-shelf collapse
- [ ] Delete from All Books — soft-delete to Trash, removing from ALL folders + Book Lists at once (reuse membership snapshot; confirm dialog discloses count)
- [ ] Rectangle/Lasso selection in cover view (extends `explorerSelectedItems`)
- [ ] Fetcher follow-ups: ownership-**upgrade** live positive test; recovery-sweep Stage 2 (fold into orphan scan); un-trash on ownership upgrade (storage.js); fix the "772%" enriched ratio
- [ ] Book detail dialog tooltips (esp. Collections = read-only-from-Amazon)
- [ ] Wishlist fetcher — capture real binding on add (product-page `bindingInformation`), not only after enrichment
- [ ] **Format-blind duplicate/ownership check blocks wishlisting the Kindle edition of a print-owned book** (Ron, 2026-08-29, live case: series #13 owned as PB, can't wishlist the Kindle edition — "shows as a duplicate"). Two suspects, diagnosis pending Ron's answers: (a) series-page fetcher trusts Amazon's `hasOwnership` flag (series-page-fetcher.js:357), which may be format-blind on Amazon's side; (b) known-books byAsin check hit an RW record under the KINDLE ASIN wrongly marked owned (PB≠Kindle ASINs, so a collision implies bad data — suspect the v4.11.10 ownership-upgrade/sweep). Fix is format-aware dedup/ownership + possible data cleanup for the affected record(s).
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
