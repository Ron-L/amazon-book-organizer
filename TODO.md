# TODO

## Prioritized Roadmap (By Priority & Complexity)

_Based on user requirements + Claude.ai independent review (CLAUDE-AI-REVIEW.md)_

---

### 📖 Priority 4: Launch Documentation & Onboarding

See [docs/design/DEMO-LIBRARY-PLAN.md](docs/design/DEMO-LIBRARY-PLAN.md) for full checklist.

**1. 📚 Book Lists / Searches / Folders Redesign** - HIGH/HIGH — design complete 2026-06-15
   - Full spec: [docs/design/BookLists-Searches-Redesign.md](docs/design/BookLists-Searches-Redesign.md)
   - Replaces the overloaded "Views" concept with three honest sidebar categories: All Books (standalone), Searches (saved live queries), Book Lists (curated static), Folders (unchanged)
   - "Collections" stays reserved for Amazon Kindle Collections; the new curated concept is "Book Lists"
   - Hidden grab handles removed → one visible "Save these results…" control (save as Search, save as Book List, or add to existing)
   - Load-bearing: custodial-vs-supplemental invariant; snapshot-before-delete so Trash/Undo rebuild the full placement set
   - **Pre-launch blocker** — invalidates Tutorial 1 (Scene 6 Tags & Views); user cannot re-record
   - On implementation, align: features.html, README.md (+ index.html mirror), USER-GUIDE.md, sizzle reel + tutorial scripts (docs/design/VIDEO-PRODUCTION-GUIDE.md), in-app help/tooltips, CHANGELOG
   - Build dev-first per workflow
   - Note: landing-page before/after screenshot refresh is tracked separately as a post-launch item (Priority 6)

**2. 🎬 Training Videos, Site Restructure & Docs** - HIGH/HIGH (40-60 hours) — **IN PROGRESS**
   - ⚠️ DECISION (2026-06-15): Tutorial 1 will NOT be re-recorded. Instructional weight moves to the Custom GPT (item 4), which now replaces Tutorials 1–8. Only the sizzle reel remains as video — after its script is updated for Book Lists/Searches.
   - Delete 3 obsolete design docs (ENHANCED-GETTING-STARTED-UX, VIDEO-PRODUCTION-PLAN, BOOK-EXPLORER-VIDEO-SCENARIOS)
   - Create VIDEO-PRODUCTION-GUIDE.md — sizzle reel + 8 tutorial video scripts, scene prep, production setup
   - Restructure index.html → slim landing page (hook → convert)
   - Create tutorials.html — video tutorial hub (sizzle reel + 8 videos embedded)
   - Create features.html — feature deep-dive, version history, competitive positioning
   - Add "Watch Tutorials" to app Help menu
   - Capture updated before/after screenshots
   - Record and produce sizzle reel only (Tutorials 1–8 → Custom GPT, item 4); update sizzle script for Book Lists/Searches first
   - README.md diverges from index.html (GitHub audience only)

**3. 📋 FAQ Page** - LOW/LOW (2-3 hours)
   - Create faq.html — answers to common questions
   - Link from: Help menu, README, features.html footer, tutorials.html footer
   - Sections: Security/Privacy, Data/Backup, Troubleshooting, Library, General
   - Include: relay revocation, encryption explanation, moving to new computer, bookmarklet troubleshooting (including blank-tab limitation), stale data, physical books, multi-browser, pricing

**4. AI-Powered User Support via Custom GPT — Create a shareable Custom GPT as an interactive help resource, replacing tutorial videos 2–8
   - Pre-load with ReaderWrangler documentation (README, user guide, etc.) as knowledge files
   - Set system instructions to scope it as a ReaderWrangler support assistant
   - Add link to Help menu in the app so users land directly in a ready-to-go ChatGPT session
   - Works with free tier ChatGPT accounts — no setup required from users
   - Evaluate Claude Projects equivalent if/when shareable project links become available

   **Build notes + manual set (2026-07-03 discussion):**
   - **Cost model:** a Custom GPT hosted on ChatGPT bills *you* ~$0/user — users chat on their own ChatGPT quota; your only cost is a ~$20/mo authoring seat (to create/edit, not per user). Alternative = embed a chat widget via the AI API with our own key → we pay per use, but support Q&A is cheap (~$0.001–0.02/question; ~$0.02–0.40 to onboard a new user; pennies/mo steady). Verify current pricing + free-tier terms at build time — they shift.
   - **Framing (honest):** the model is rented and identical whether we host it or a user DIYs (pastes our docs into any chatbot). Our value is convenience / scoping / freshness / consistency — NOT a differentiator. The **real asset is the docs**; they serve humans, the assistant, and DIY users equally. Write the manual for humans first; the GPT is a cheap hat bolted on later.
   - **Knowledge-file format:** retrieval (RAG) works on chunks, so favor **self-contained, well-headed sections** and **question-shaped FAQ entries** (best match for user questions). Plain language, define terms, include the alternate phrasings users actually type.
   - **Manual set** (mostly repurposed Phase 9 docs): (1) Getting Started / first-run; (2) Fetching — bookmarklet + relay, *highest support volume*; (3) organizing mental model — Folders / Book Lists / Searches / Collections, "when to use which" (the USER-GUIDE lead); (4) how-to recipes (FAQ-shaped); (5) Backup & Restore; (6) Sync & devices; (7) Troubleshooting; (8) Privacy & Security. **New high-leverage additions:** (9) **Glossary**; (10) **"What ReaderWrangler is NOT / current limits"** — the single best hallucination-killer (explicit not-yet-features list). Plus **system instructions** (persona/scope: cite the docs, admit uncertainty, never invent features).

**5. 📋 Disaster Recovery Documentation** - LOW/LOW (1-2 hours)
   - Document relay credential recovery paths
   - Document backup files include relay credentials
   - Problem: Users have no guidance for recovering from data loss
   - Impact: Confidence that data is recoverable

**6. 🔧 Pre-Launch Follow-Ups from PM Synthesis (2026-06-07)** - MIXED (sized below)
   - Items flagged across multiple post-mortems but never addressed during normal release work. Audit found "Recommendations for Future" tends to recur unaddressed unless given a dedicated session.

   **6a. `integrity-homeless` investigation** - MEDIUM/MEDIUM (2-4 hours)
   - Real user fired `integrity-homeless` GoatCounter event in v6.11.5 (carried forward in v6.11.6 PM)
   - DATA-INTEGRITY.md: homeless = books in IndexedDB no folder references; should NOT happen on a fresh import
   - Three candidate causes per v6.11.5 PM: (a) import bug writing to IndexedDB without updating Inbox bookIds, (b) race between integrity check and import completion, (c) user action between fetch and import
   - Impact: Bug affecting at least one real user; affects launch confidence

   **6b. v4 → v5 feature parity audit** - MEDIUM/MEDIUM (3-5 hours)
   - Flagged in v5.0.6, v5.0.7, v5.0.8 PMs — never executed; 4-time recommendation that didn't happen during normal release work
   - 6 v5.0.x patch releases were cleanup bugs from v5.0.0's BookExplorer rewrite; suggests more may still be hiding
   - Method: walk v4 features, verify each exists in v6 with parity (or document why intentionally dropped)
   - Impact: Find missing features before users do

   **6c. `console.log` audit** - LOW/LOW (1-2 hours)
   - ~70 statements remain (per v6.10.0 PM)
   - Decide which to keep (real diagnostics), gate behind a `DEBUG` flag, or remove
   - Impact: Cleaner DevTools console for users who open it

   **6d. ✅ Tooltip inventory & audit** — shipped v6.11.9 (2026-06-08)
   - Systematic audit of 155 interactive UI elements
   - 19 new tooltips added (7 mobile + 12 desktop)
   - aria-label added to mobile icon buttons for touch accessibility (title doesn't render on touch in modern Chrome)
   - Did NOT audit Tag from Collections wizard — see 6e below

   **6e. Tooltip audit — Tag from Collections wizard** - LOW/LOW (~1 hour) — added 2026-06-08
   - Inventory agent (v6.11.9 audit) deferred this area as a separate pass
   - Walk the entire Tag from Collections wizard (all steps): collection list, checkboxes, "New books only" filter, "Removed from Kindle" handling, action buttons
   - Add `title` + `aria-label` per established voice (concise, no jargon, what + why)
   - Impact: Discoverability of the collections-to-tags workflow — currently a hidden gem

   See post-mortems/ for the full thread on each. Automated test suite (also a recurring recommendation) is parked in Priority 6 — too large for pre-launch.

---

### 🗂️ Priority 4.5: Pre-Release Organization Polish (Series & Book Lists)

_Agreed 2026-07-02 while organizing the live library. A coherent batch of series/book-list ergonomics + context-menu completeness to finish before launch. **Locked scope** — do this, then Phase 9._

**1. 🖱️ Context-menu completeness** — bundle these two (same code area):
   - ✅ **"Add to Book List →" context-menu target** (books) — DONE (alpha.53–54). Supplemental/**copy** semantics, NOT move. Submenu = existing lists + "New Book List…" + "Remove from this list" when viewing a list. (alpha.54 also fixed Book List create/delete undo across all sites, and cleaned the dead 0-book guard.)
   - **Right-click folder context menu in the right pane** (promoted from Priority 6.3). Match the left-pane folder menu (Rename, Delete, New Subfolder…); mixed book+folder selection shows the intersection of ops.

**2. 🔢 Series numbering ergonomics**
   - **Reorder a Book List by series position** — a one-shot reorder command, NOT a persistent sort (which would defeat manual ordering). Sets the sequence once; user hand-tweaks after.
   - **Comma-separated series-position multi-edit** — the multi-select "edit series position" dialog accepts explicit values ("2, 4") mapped to the selected books in **display order**. Handles ownership gaps that "renumber by current order" can't (own 2 & 4, not 3 → want 2 and 4, not 2 and 3). Show the target order; reject a count mismatch.

**3. 📚 Close out Series Manager (was Priority 7.7) via the multi-select toolkit**
   - The needed actions already exist as multi-select ops: move-together (group), edit series name (rename/merge), + the two numbering tools above. No dedicated "Manage Series" dialog.
   - Discovery substitute for the dropped overview table: **sort by series** surfaces fragmentation (e.g. `Destroyer`/`The Destroyer`).

**4. 🖱️ Rectangle/Lasso selection** (promoted from Priority 6.4) — click-drag a selection rectangle in cover view; extends the existing unified selection model (`explorerSelectedItems`).

**5. 🛟 Restore safeguard (data-loss prevention)** — agreed after Book Lists vanished on 2026-07-02.
   - Restore defaults to EXACT state. But if a restore would **delete** Book Lists or Searches that currently exist, stop and ask — never silent (extends "no silent drops" to org data).
   - Offer **per-category** (Book Lists / Searches): keep / discard / cancel. Additive-preserve, not field-merge — backup items restore as-is; your *extra* lists carry over.
   - If merging and the backup has different books, append them to the **end of the manual sort order** (predictable).

**6. 🧪 Post-B testing follow-ups (2026-07-03):**
   **▶ CURRENT ORDER (2026-07-04):** ✅ done: 0 dedup (alpha.55), A (alpha.56), G+F (alpha.57).
   NEXT: (a) **TEST alpha.57** (G+F) → (b) **item 7 debounce** → (c) **4 = B** → (d) **5 = E** → (e) **6 = D**.
   0. 🧹 **Dedup folder `bookIds` (Inbox double-add)** — transient duplicate seen: same book id rendered twice in a filtered Inbox after a double relay-import (select-one-checks-both; cleared on reload). Root: one add path (import→Inbox merge) skipped the dedup that move/paste already do; folder membership IS a set. Fix at source (dedup the import→Inbox add) **plus** a load-time normalization guaranteeing every folder's `bookIds` is unique. Not masking — enforcing an existing invariant (this class bit before: the removed Inbox collector, ~L3271).
   1. **A — hover popup also shows Book Lists** a book is on (currently shows only its folders).
   2. **G — drag-reorder Book Lists** (they carry `position`; drag just isn't wired like folders).
   3. **F — jump to end of the left panel** (a "scroll to bottom" affordance; list is long — Inbox top ↔ newest folder bottom).
   4. **B — stronger "a filter is active" signal** — counts already flip N→N/N; make the `N/N` stand out (light canary/amber background), noticeable without an error-red alarm.
   5. **E — "New Folder…" in Move/Copy** (parallels "New Book List"), via inline **"＋ New folder here…"** entries in the Move/Copy folder tree (root = new top-level, per-node = new subfolder) for discoverable nesting; optional `A/B` slash shortcut in the name prompt.
   6. **D — folder "Move to Top / Move to Bottom"** context items, AND fix the bug where **"Move to: <folder>" then dragging back to top level restores a stale prior position** (only Move-to leaves the memory; direct drag works).
   - (C — "get books out of Inbox → use a folder, not a Book List" — is manual/GPT content, captured on the Custom GPT item, not code.)

**7. 💸 Relay write economics (Cloudflare free-tier) — before PUBLIC launch:**
   - Real data 2026-07-03: one ~2.5h organizing session = **495 / 1,000 KV writes** — and that daily cap is **SHARED across ALL users** (one Cloudflare account), not per-user. Storage ~**40 MB/user** → ~25 users fills the 1 GB free tier. (My earlier "50–100 free users" was off ~20–50× for the onboarding-organizing burst.)
   - **Root cause:** the device-state push (readerwrangler.js ~L3100) is debounced only **15s**, so active organizing (natural >15s pauses) fires `putDeviceState` ~3–4×/min → ~500 writes/session. Not per-action — per-pause.
   - **Fix:** raise the debounce (e.g., 60s) AND flush on **tab blur / visibilitychange / beforeunload** instead of periodic ticking — cuts writes ~15–50×. Optional manual "Sync now." (Watch the tradeoff: longer debounce = staler cross-device sync + more to lose on crash; the flush-on-blur/close covers most of it, and the beforeunload warning already exists.)
   - **Then** revisit the free-vs-paid launch plan with real numbers (Workers Paid ~$5/mo ≈ ~1M writes/month — *verify current limits*). Also consider trimming the device-state payload size if it carries full book data it doesn't need.

---

### 🚀 Priority 5: Launch

**1. Launch**
   - COMMUNITY-SHARING-PLAN.md

---

### 🚀 Priority 6: Post-Launch Internal Improvements

**1. 🔔 Credential Mismatch Detection** - LOW/LOW (1-2 hours)
   - Restoring a backup with different relay credentials leaves the bookmarklet out of sync (it still has the old channelId/passphrase in amazon.com localStorage)
   - The app and bookmarklet can't communicate cross-domain to detect this
   - **Fix**: After backup restore, compare relay credentials before/after. If changed, show toast: "Your relay credentials changed. Reinstall the bookmarklet from File → Relay Setup."
   - The app knows credentials changed; it can't fix the bookmarklet but can tell the user
   - Future: bookmarklet could ping `/status/{channelId}` before fetching and warn on 403/404

**2. 🔌 Relay Disconnect / Reset** - LOW/LOW (1 hour)
   - Relay Setup has no way to intentionally disconnect or reset credentials
   - Add a "Disconnect Relay" or "Reset Credentials" option in the Relay Setup dialog
   - Use case: re-pair after a passphrase exposure, switch relay channels, or intentionally go offline
   - On confirm: clear `relay.channelId` and `relay.passphrase` from localStorage and app state
   - Normal users never need this, but the gap is real (currently requires DevTools to clear)

**3. 📂 Right-Click Menu for Folders in Right Pane** - LOW/LOW (2-3 hours)  → **PROMOTED to Priority 4.5** (bundled with the "Add to Book List" context-menu work)
   - Right-clicking a folder in the right pane has no context menu (books do)
   - Should match left-pane folder context menu (Rename, Delete, New Subfolder, etc.)
   - Mixed selection (books + folders): show intersection of applicable operations (Windows Explorer pattern)
     - Common ops (Move to, Copy to, Delete, Cut, Copy) — apply to all
     - Book-only ops (Tags, Share, Note) — hidden or apply only to books in selection
     - Folder-only ops (Rename) — only if single folder, no books selected

**4. 🖱️ Rectangle/Lasso Selection** - LOW/MEDIUM (3-4 hours)  → **PROMOTED to Priority 4.5**
   - Click and drag in cover view to draw a selection rectangle around books/folders
   - Standard desktop behavior (Windows Explorer, macOS Finder)
   - Extends existing unified selection model (explorerSelectedItems)

**4. 🏷️ Deferred Desktop Polish** - LOW/LOW (2-3 hours)
   - Left pane keyboard navigation: Up/Down arrow, Left/Right collapse/expand, Home/End
   - ~~Desktop Mode escape hatch~~ ✅ v6.0.0-alpha.18 — Interstitial in readerwrangler.html shows "Return to Mobile Mode" / "Continue in Desktop Mode" before loading any app code. Uses sessionStorage to lock mode per tab session.
   - Directional shadow consistency with mobile cover view

**4b. ✅ Deferred Mobile Polish** — DONE in Phase 8b (verified 2026-07-02 against mobile.js)
   - ~~Subfolder shown twice on Dashboard folder shelves~~ ✅ series no longer render a redundant folder tile — the tile and floating label bar were unified ([mobile.js](mobile.js#L1191) ~L1191).
   - ~~Scroll slider on overflowing non-expanded shelves~~ ✅ slider now shows whenever a row overflows, not only when expanded ([mobile.js](mobile.js#L1125) ~L1125), and lives in its own zone below the row so it no longer collides with the amber series-label bar ([mobile.js](mobile.js#L1306) ~L1306).

**3. Improve Load Time Experience** - MEDIUM/LOW-MEDIUM (2-4 hours)
   - Current: ~14s app load. Babel in-browser JSX compilation (~3-8s) and Tailwind JIT scan (~1-3s) account for most of it. React render + IndexedDB load is only ~1-3s.
   - Console warnings (dev-only, users don't see): Tailwind CDN "not for production", Babel "precompile your scripts", Babel "deoptimised styling" (skips formatting for files >500KB — cosmetic, no functional impact)
   - **Option A: Pre-compile (eliminates warnings, fastest load)**
     - Step 1 (Babel): `npx babel readerwrangler.js --presets=@babel/preset-react -o dist/readerwrangler.js`. Load `dist/readerwrangler.js` as regular `<script>` instead of `type="text/babel"`. Remove Babel CDN.
     - Step 2 (Tailwind): `npx tailwindcss -i input.css -o dist/styles.css --content "readerwrangler.js,readerwrangler.html"`. Swap Tailwind CDN for `<link>` to generated CSS.
     - Prerequisite: Node.js (already installed for scripts/)
     - **Trade-off: Introduces a build step.** Every JS/CSS edit requires re-running the build before deploy. Options: local `build.bat` (manual, risk of forgetting), GitHub Actions (auto on push, adds CI complexity), or pre-commit hook (auto on commit, slows commits).
     - **Trade-off: Transparency.** Source files are no longer what's served. Pre-compiled output is readable (not minified) but shows `React.createElement()` instead of JSX. Mitigate with "View Source on GitHub" link.
     - Estimated load time: ~5-8s (Step 1 only) or ~3-5s (both steps)
   - **Option B: Splash screen with personality (no build step, same load time)**
     - Add a themed loading screen in `readerwrangler.html` with rotating messages while Babel/Tailwind/React load
     - Examples: "Shelving your library...", "Alphabetizing the chaos...", "Dusting off the spines..."
     - Pure HTML/CSS, zero build step, hides when app mounts
     - Turns the 14s wait into a branded experience instead of a blank page
     - Can be combined with Option A for even better UX
   - Note: User loads the page once per session, so this is a one-time cost per use
   - Problem: 14s initial load is noticeable, especially for first-time users
   - Impact: Option A reduces load time; Option B makes the wait enjoyable; both improve first impression

**5. 🖼️ Refresh Landing-Page Before/After Screenshot** - LOW/LOW (~30 min) — added 2026-06-15
   - The landing-page before/after slider shows the old left-panel style (pre Book Lists/Searches redesign)
   - Its point (folder organization vs. Amazon's wall of covers) still lands, so this is cosmetic only — no rush
   - Recapture the "after" screenshot once the Book Lists/Searches redesign has shipped
   - Files: index.html before/after slider images

---

### 🚀 Priority 7: Post-Launch Enhancements

**1. ♿ Keyboard Accessibility Completion** - MEDIUM/MEDIUM (8-12 hours)
   - Builds on v6.1.0 ARIA foundation (screen readers can identify elements)
   - Focus trapping in modals (Tab cycles within modal, not behind it)
   - `:focus-visible` styling (visible focus rings for keyboard users)
   - Keyboard navigation in context menus (Arrow Up/Down, Enter to activate, Escape to close)
   - Submenu keyboard activation (Arrow Right to open, Arrow Left to close)
   - Consider converting `role="menuitem"` divs to `<button>` for native keyboard support
   - Drag-and-drop ARIA descriptions deferred (complex, keyboard users can use context menu Move/Copy)
   - Problem: Screen readers can identify UI elements but keyboard-only users can't operate them
   - Impact: Full keyboard/screen-reader operability for visually impaired bibliophiles

**2. 📖 Reading Progress Visualization** - MEDIUM/HIGH (6-10 hours)
   - Show reading progress percentage/position for each book in dialog and a column in explorer
   - Implementation guidance: [Amazon Organizer Reading Progress conversation](https://claude.ai/chat/6e6f23c8-b84e-4900-8c64-fecb6a6e0bd1)
   - Note: Collections data already merged (line 452 LOG.md), this adds progress visualization
   - Problem: Users can't see reading progress in organizer
   - Impact: Better tracking of currently-reading books; transforms app from "organizer" to "reading companion"

**3. 📚 Book Recommendations** - LOW/LOW (2-3 hours)
   - See [docs/design/BOOK-RECOMMENDATIONS.md](docs/design/BOOK-RECOMMENDATIONS.md) for full spec
   - Display "Similar Books" in book detail modal (collapsible, hidden by default)
   - Data already fetched in Phase 3 (tags API) but currently discarded
   - Store: `recommendations: [{asin, title, coverUrl}]` per book (~1KB/book)
   - Click opens Amazon product page; "Owned" badge if book is in library
   - Future: "You own these similar books you haven't read yet" cross-reference
   - Future: Highlight forgotten purchases based on high ratings
   - Problem: No discovery of related books from within the app
   - Impact: Book discovery without leaving ReaderWrangler

**4. 👨‍👩‍👧 Family Sharing Info** - LOW/LOW (2-4 hours)
   - See [docs/design/FAMILY-SHARING.md](docs/design/FAMILY-SHARING.md) for full spec
   - Fetch which books user has shared with family members
   - Display "Shared with: Name" in book detail modal
   - API tested: supports batch of 1000+ ASINs in single call (~200ms)
   - Implementation: Add to collections fetcher, display in organizer
   - Problem: No visibility into which books are shared with family
   - Impact: Better awareness of Family Library sharing status

**5. 🖼️ V2 Dual-Pane Split** - MEDIUM/MEDIUM (8-12 hours)
   - See [docs/design/DUAL-PANE-SPLIT.md](docs/design/DUAL-PANE-SPLIT.md) for full analysis
   - Two folder views side by side for power users
   - Option A: Built-in split pane (8-12 hours, native drag works)
   - Option B: BroadcastChannel sync for two browser tabs (4-6 hours, copy/paste only)
   - Problem: Precise cross-folder positioning requires navigation
   - Impact: 10% power-user case; 90% covered by drag-to-folder-tree

**6. Multi-Store Architecture** #Architecture - LOW/VERY HIGH (60-80 hours)
   - See [docs/design/MULTI-STORE-ARCHITECTURE.md](docs/design/MULTI-STORE-ARCHITECTURE.md) for full spec
   - Status: Future enhancement (Amazon first, other stores later)
   - Covers: File naming, bookmarklet detection, data structure, migration path
   - Problem: Only works with Amazon
   - Impact: Support for other ebook platforms

**7. 📚 Series Manager** - MEDIUM/MEDIUM (6-8 hours)  → **DESCOPED 2026-07-02: closing via the multi-select toolkit in Priority 4.5** (move-together + edit series name + reorder/renumber-by-position + comma-separated position). No dedicated dialog; sort-by-series is the discovery substitute.
   - See [docs/design/EDITABLE-SERIES.md](docs/design/EDITABLE-SERIES.md) for full spec
   - Phase 1 (edit series/position in book modal) ✅ shipped v5.4.6
   - Phase 3 (remove "Group Series Books" button) ✅ removed in Explorer redesign
   - **Remaining: Phase 2 — Series Manager dialog**
     - "Manage Series" menu item (like Manage Tags)
     - Table view: series name, book count, rename/merge actions
     - Bulk rename across all books in a series
     - Merge duplicate series ("Destroyer" + "The Destroyer" → one)
     - Delete orphaned series entries
   - Problem: Inconsistent series names from Amazon create fragmentation
   - Impact: Clean series organization, especially for large libraries

**8. 👥 Auto-Organize: aggregate co-authored books under each author** - MEDIUM/MEDIUM-HIGH — design 2026-06-22
   - Problem: Auto-Organize by Author groups by the FULL author string (`normalizeAuthor` = trim+lowercase of `book.author`, ~L3144), so a collaboration ("Larry Niven, Jerry Pournelle") is a separate group from solo "Larry Niven". An author who mostly co-writes (e.g. Niven) never reaches the threshold even with 20+ books, because the count is split across collaboration strings. Real hit: 22 "niven" books, 0 authors shown at 17+.
   - Goal: a co-authored book counts toward — and files under — EACH of its authors, working correctly with the incremental-threshold workflow (lowering the slider over multiple passes).
   - **Chosen design — track filed authors per book (NOT a raw counter):**
     - `authorsOf(book)` = distinct authors parsed from `book.author` (split on `,` `&` `and` `;`); solo → 1.
     - New persisted book field `filedAuthors: string[]` — normalized authors this book has been auto-filed under (empty initially).
     - Wizard count for author X = Inbox books where `X ∈ authorsOf(book)` AND `X ∉ filedAuthors`.
     - Organize author X: add book to X's folder, add X to `filedAuthors`; if `filedAuthors ⊇ authorsOf(book)` → remove from Inbox.
   - **Why filedAuthors, not a decrement counter:** a raw count double-spends on re-runs. After organizing Niven, the Niven&X collabs stay in Inbox (still owe X); a lower-threshold pass shows Niven again (those collabs) and re-filing would decrement them to 0 and drop them from Inbox before X ever got them. Tracking the SET of filed authors is idempotent (skip authors already filed) and yields the count for free — and needs no folder-name semantics (it's author state on the book, which the book already carries).
   - **Decisions captured (2026-06-22 design session):**
     1. Manual move out of Inbox = "I've filed this" → remove from Inbox fully (today's behavior). Don't keep multi-author books in Inbox after a manual move — that's the more confusing outcome. `filedAuthors` stays a pure auto-organize concern.
     2. An author that never meets the threshold leaves its collabs lingering in Inbox (filed under the other author, still owing this one). Needs an escape hatch: deleting/moving from Inbox, or a "clear from Inbox, keep current folders" action, marks it done.
     3. Stale `filedAuthors` (user later deletes an author folder or pulls the book out of it) is accepted — reconciliation is over-engineering.
   - **Cheaper alternative** if the above is too much: group by FIRST/primary author only (Niven-led collabs → Niven; Pournelle-led → Pournelle). One folder per book, normal Inbox removal, zero new state. Cost: a "Pournelle, Niven" book lands under Pournelle, so not every "Niven book" ends up together.
   - Touch points: wizard grouping (~L3168-3202), the organize → move-to-folder + Inbox-removal path, a new persisted book field (storage merge + backup/restore serialization).
   - Impact: "all my Niven books together" works even for prolific collaborators; auto-organize stops silently undercounting co-authors.

---

### 📚 Priority 8: Nice-to-Have Features

**1. 🤖 Smart Collections (Rule-Based)** #Optional - LOW/HIGH (12-16 hours)
   - "All unread books rated 4.5+"
   - Requires complex rule engine
   - Problem: Manual organization is tedious
   - Impact: Automation for power users

**2. 🎯 Wishlist Integration - Series Gap Detection** #Optional - MEDIUM/VERY HIGH (20-30 hours)
   - Automatic series detection for owned books (requires series metadata)
   - Identify missing books in series (e.g., own books 1, 2, 4 but not 3)
   - Fetch metadata for missing books via Amazon API or series page scraping
   - Auto-populate wishlist with series gaps
   - Series column UI: Show gaps visually (grayed placeholder covers?)
   - **Blockers**:
     - Requires Speed Up Enrichment (completed v3.7.1) to avoid API throttling
     - Amazon's inconsistent series tagging may limit effectiveness
   - Problem: Series readers often have incomplete sets, no easy way to identify gaps
   - Impact: Automatic discovery of missing series books, targeted purchasing

**3. 📚 Collections Filtering Enhancements** - LOW/LOW (1-2 hours each)
   - **Filter by read status** - Filter by READ/UNREAD/UNKNOWN
   - **Filter by collection name** - Dropdown to filter by specific Amazon collection
   - **"Uncollected" pseudo-collection** - Filter for books with no collections

---

### 📊 Priority 9: Analytics & Export

**1. 📈 Reading Stats Dashboard** - MEDIUM/MEDIUM (8-12 hours)
   - Books acquired by month/year
   - ~~Genre distribution pie chart~~ ❌ (NOT AVAILABLE: Amazon API doesn't provide genre/category metadata)
   - Average rating of collection
   - "Time to read" estimates based on page counts
   - Problem: No insights into library composition
   - Impact: Interesting for users, helps rediscover forgotten books

**2. 💾 Enhanced Export Options** - MEDIUM/LOW (2-4 hours)
   - Export organization to CSV (already has JSON)
   - Print-friendly reading list
   - Privacy-respecting share feature
   - Problem: Limited backup/sharing options
   - Impact: Portability and sharing

---

### 🔧 Priority 10: Technical Improvements

**1. Phase 3: UI Error Handling** #FetcherImprovements - MEDIUM/LOW (2-3 hours)
   - Warning banners for missing descriptions
   - "View Missing Descriptions" feature
   - Problem: Users unaware of missing enrichment data
   - Impact: Transparency about data quality

**2. 🔧 Refactor readerwrangler.js into Modules** - LOW/MEDIUM (4-6 hours)
   - Current state: 3,862-line monolithic file with 50+ state variables, 80+ functions
   - **Recommended: Minimal Split (4 modules)**

   | Module | ~Lines | Contents |
   |--------|--------|----------|
   | `storage.js` | 150 | IndexedDB, localStorage operations |
   | `dataProcessing.js` | 400 | Import, merge, filter logic |
   | `dragDrop.js` | 500 | Drag handlers, binary search optimization |
   | `uiHelpers.js` | 200 | Formatters, display helpers, constants |
   | `readerwrangler.js` | 1,500 | State, hooks, orchestration, JSX |

   - Problem: Large monolithic file hard to navigate and maintain
   - Impact: Better code organization, easier future maintenance, testability

---

### 🌐 Priority 11: Integrations & Advanced Features

**1. 🔗 Third-Party Integrations** - LOW/HIGH (20-30 hours)
   - Goodreads sync (import ratings, mark as read)
   - StoryGraph integration
   - Export recommendations to Amazon wishlist
   - Problem: Complex API work, authentication, rate limits
   - Impact: Niche feature for users of these services

**2. Live reflow drag-and-drop animation** #Optional - LOW/MEDIUM (4-6 hours)
   - Smooth visual feedback during drag operations
   - Problem: Current drag-and-drop feels abrupt
   - Impact: Polish and visual appeal

**3. Multi-User Support** #Architecture - LOW/VERY HIGH (40-60 hours)
   - Not really needed with Export and Import
   - See [docs/design/MULTI-USER-DESIGN.md](docs/design/MULTI-USER-DESIGN.md) for full spec
   - Status: Low priority - workaround sufficient for most users
   - Covers: AccountId identification, storage architecture, mismatch handling
   - Problem: Multiple Amazon accounts on same device
   - Impact: Household/family sharing
   - **Workaround Available**: See [USER-GUIDE.md FAQ](USER-GUIDE.md#faq) "Can I maintain separate organizational states?" for Backup/Restore method to swap between different organizational states (demo vs. actual collection, testing vs. production, etc.)

---

### 🧊 Icebox (No Timeline)

**1. Safari Browser Testing**
   - Desktop Safari + iOS Safari untested (no access to macOS/iOS devices)
   - Requires volunteer with Safari or access to a Mac
   - Key risk areas: IndexedDB behavior, PWA manifest handling, CSS rendering differences
   - If issues found, may need Safari-specific fixes or a "Safari unsupported" notice
