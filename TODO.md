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
- [ ] USER-GUIDE.md + GPT manual — rewrite around the new mental model (All Books / Searches / Book Lists / Folders; custodial vs supplemental; "when to use which"), **including the Book List ↔ Folder workflow pattern** (structure lives in Folders; to-read queues live in Book Lists) and "get books out of Inbox → use a folder, not a Book List"
- [ ] Sizzle reel — update the script for Book Lists/Searches, then record + produce
- [ ] Delete 3 obsolete design docs (ENHANCED-GETTING-STARTED-UX, VIDEO-PRODUCTION-PLAN, BOOK-EXPLORER-VIDEO-SCENARIOS)
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

**Auto-Organize ergonomics (HIGH — real friction while actively organizing):** _(decision: wizard default stays **All** — first-run value; the right-click flow below is the incremental-case fix, so don't flip the default unless it proves insufficient)_
- [ ] Right-click a book → **Auto-Organize by Author / by Series** (book-anchored, bottom-up; cover-preview confirm; reuses the wizard engine; subsumes "create an Author/Series folder as a move target") → see docs/design/AUTO-ORGANIZE-RIGHTCLICK.md (spec)
- [ ] Auto-Organize wizard: add a **filter/search field** to the author list (scrolling to find a name is painful)

- [ ] **Terminology copy pass** (6.12.1) — "shortcut" language in Book List toasts/menus; explain "Linked Copies" once in manual/GPT → see docs/design/TERMINOLOGY.md (spec)
- [ ] **Fetcher `ee6d83c` re-apply** on v4.11.10 — `LIBRARY_EXCLUDE_TAGS` named-constant/doc + delisted-book (`product=null`) count+notice adapted to coexist with null-product recovery (count only when recovery also fails)
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
- [ ] Folder "Move to Top / Move to Bottom" context items (D)
- [ ] Fix drag-subfolder→root drop-position (**confirmed still broken 2026-08-03**, annoying) — dropping a subfolder at root lands it alphabetical-ish near the bottom instead of at the drop target; shares a root cause with new-folder alphabetical insert + Move-to stale position
- [ ] Book Lists: **"Arrange by series #"** — in Manual mode, bake the series-number order into the list's manual order (persistent, then hand-tweak). The Book-List analog of folder sort-then-bake; a one-time rearrange, not a live sort mode. (Distinct from the existing "Number by current order," which sets each book's *position value*, not the list's order.)
- [ ] Left-pane **jump-to-top** chevron (complement to the shipped jump-to-bottom "F"); place both as chevrons at the two ends of the scrollbar

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
