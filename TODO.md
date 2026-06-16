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

   **6f. Demo-whitelist footgun guard** - MEDIUM/LOW (~1-2 hours) — added 2026-06-15
   - The demo whitelist (`readerwrangler-demo-whitelist-enabled` on amazon.com localStorage) is DESTRUCTIVE: it filters existing books down to the whitelist AND re-uploads only those to the relay, silently shrinking the real library. Cost a real scare (2624 → 119) when leftover demo state stayed enabled.
   - Guard: fetcher should warn loudly / require confirmation before uploading a library dramatically smaller than what's on the relay (e.g., "About to replace 2624 books on relay with 119 — continue?")
   - Make the active-whitelist banner unmissable (currently just a console line `🔒 Demo whitelist active`)
   - Pre-launch: ensure no demo-whitelist state can ship; document the off-switch prominently (DEMO-LIBRARY-PLAN.md:100)

   **6g. User-facing "Force full re-fetch" / clear relay library** - MEDIUM/LOW (~2 hours) — added 2026-06-15
   - Incremental fetch is anchored to the relay's existing library and stops at first overlap; if the relay holds a partial/wrong set, there is NO user-facing way to force a complete re-fetch (currently requires `window.RWRelay.cleanup()` in DevTools).
   - Add an app/Relay-Setup affordance: "Rebuild library from Amazon (full re-fetch)" that clears the relay library so the next fetch pulls ALL books.
   - Pairs with 6f — together they prevent and recover from the shrink-to-demo trap.
   - Related: Priority 6 "Relay Disconnect / Reset" (credentials reset is a separate gap).

   **6h. Pin ALL CDN dependencies to exact versions** - LOW/LOW (~1 hour) — added 2026-06-16
   - Caused a PROD OUTAGE 2026-06-16: `@babel/standalone` was unpinned; unpkg's latest flipped to Babel 8.0.0, whose react preset defaults to the automatic JSX runtime (emits `import {jsx} ...`) → "Cannot use import statement outside a module" → app wouldn't load. Hotfixed in 6.11.10 by pinning Babel to `@7.29.7`.
   - Remaining unpinned/floating CDN deps in readerwrangler.html:
     - React / ReactDOM: `@18` (floats within 18.x — pin to an exact 18.x)
     - Tailwind: `https://cdn.tailwindcss.com` (evergreen Play CDN, currently v3; can't be version-pinned the normal way — Tailwind explicitly says Play CDN is dev-only). Real fix = precompile CSS (see Priority 6 "Improve Load Time Experience").
     - qrcodejs: already pinned `@1.0.0` ✓
   - **The durable fix is the precompile build step** (Priority 6) — it removes the in-browser Babel AND Tailwind CDN entirely. Pinning is the interim safety net.
   - Audit other HTML entry points too (index.html, reset.html, etc.) for unpinned CDN tags.

   See post-mortems/ for the full thread on each. Automated test suite (also a recurring recommendation) is parked in Priority 6 — too large for pre-launch.

---

### 🚀 Priority 5: Launch

**1. Launch**
   - COMMUNITY-SHARING-PLAN.md

---

### 🚀 Priority 6: Post-Launch Internal Improvements

**1. 🔔 Relay Credential Mismatch — safe restore** - MEDIUM/LOW (2-3 hours) — refined 2026-06-15
   - **Problem:** a backup includes relay credentials (channelId + passphrase). Restore silently OVERWRITES the app's current creds. If the app was paired to a different channel than the backup, the installed bookmarklet no longer matches the app → fetches go to one channel, app reads another (books appear to vanish). Real scare 2026-06-15 (compounded by the demo whitelist).
   - **Why creds are in the backup (keep them):** device migration — restoring on a new computer/browser adopts the channel so the EXISTING bookmarklet keeps working without re-pairing. This is the legitimate use case, so don't remove creds from backups.
   - **Why cross-detection can't work:** app and bookmarklet are different origins (can't read each other's localStorage), and relay channels are isolated (a mismatched pair can't see each other through the relay). The ONLY reliable detection point is the restore operation, where the app momentarily holds both current creds and the backup's creds.
   - **Fix — compare on restore:**
     - App has no creds (fresh / migration) → adopt backup's silently (bookmarklet already matches)
     - Backup creds == current → adopt silently (no-op)
     - Backup creds ≠ current → **PROMPT: Keep current** (default, recommended — matches your installed bookmarklet) vs **Use backup's**
   - **"Use backup's" branch:** adopt the backup's creds AND render the matching bookmarklet inline (reuse the Relay Setup generator). Wording: *"Delete the existing bookmark and then drag this bookmarklet to your bar."* — delete FIRST (avoids two-bookmarklet confusion); say "existing" not "old" (a restore can go newer→older, making "old" ambiguous). The existing bookmarklet can be right-clicked → delete while the dialog is open (confirmed 2026-06-15).
   - **Note:** channel ID only decides which relay bucket app+bookmarklet share — not the book set. Keeping current creds never costs books; a re-fetch tops up recent books on the current channel.
   - Future: bookmarklet could ping `/status/{channelId}` before fetching and warn on 403/404 (separate revoked-channel case, not mismatch).

**2. 🔌 Relay Disconnect / Reset** - LOW/LOW (1 hour)
   - Relay Setup has no way to intentionally disconnect or reset credentials
   - Add a "Disconnect Relay" or "Reset Credentials" option in the Relay Setup dialog
   - Use case: re-pair after a passphrase exposure, switch relay channels, or intentionally go offline
   - On confirm: clear `relay.channelId` and `relay.passphrase` from localStorage and app state
   - Normal users never need this, but the gap is real (currently requires DevTools to clear)

**3. 📂 Right-Click Menu for Folders in Right Pane** - LOW/LOW (2-3 hours)
   - Right-clicking a folder in the right pane has no context menu (books do)
   - Should match left-pane folder context menu (Rename, Delete, New Subfolder, etc.)
   - Mixed selection (books + folders): show intersection of applicable operations (Windows Explorer pattern)
     - Common ops (Move to, Copy to, Delete, Cut, Copy) — apply to all
     - Book-only ops (Tags, Share, Note) — hidden or apply only to books in selection
     - Folder-only ops (Rename) — only if single folder, no books selected

**4. 🖱️ Rectangle/Lasso Selection** - LOW/MEDIUM (3-4 hours)
   - Click and drag in cover view to draw a selection rectangle around books/folders
   - Standard desktop behavior (Windows Explorer, macOS Finder)
   - Extends existing unified selection model (explorerSelectedItems)

**4. 🏷️ Deferred Desktop Polish** - LOW/LOW (2-3 hours)
   - Left pane keyboard navigation: Up/Down arrow, Left/Right collapse/expand, Home/End
   - ~~Desktop Mode escape hatch~~ ✅ v6.0.0-alpha.18 — Interstitial in readerwrangler.html shows "Return to Mobile Mode" / "Continue in Desktop Mode" before loading any app code. Uses sessionStorage to lock mode per tab session.
   - Directional shadow consistency with mobile cover view

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

**7. 📚 Series Manager** - MEDIUM/MEDIUM (6-8 hours)
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
