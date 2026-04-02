# TODO

## Prioritized Roadmap (By Priority & Complexity)

_Based on user requirements + Claude.ai independent review (CLAUDE-AI-REVIEW.md)_

---

### 📖 Priority 4: Launch Documentation & Onboarding

See [docs/design/DEMO-LIBRARY-PLAN.md](docs/design/DEMO-LIBRARY-PLAN.md) for full checklist.

**1. ✅ Demo Backup File** (shipped v6.8.1)
   - 119-book curated demo library for instant trial without Amazon account

**2. ✅ Whitelist Filter** (shipped v6.8.1)
   - Fetcher filter for controlled demo recordings

**3. 🎬 Training Videos, Site Restructure & Docs** - HIGH/HIGH (40-60 hours) — **IN PROGRESS**
   - Delete 3 obsolete design docs (ENHANCED-GETTING-STARTED-UX, VIDEO-PRODUCTION-PLAN, BOOK-EXPLORER-VIDEO-SCENARIOS)
   - Create VIDEO-PRODUCTION-GUIDE.md — sizzle reel + 8 tutorial video scripts, scene prep, production setup
   - Restructure index.html → slim landing page (hook → convert)
   - Create tutorials.html — video tutorial hub (sizzle reel + 8 videos embedded)
   - Create features.html — feature deep-dive, version history, competitive positioning
   - Add "Watch Tutorials" to app Help menu
   - Capture updated before/after screenshots
   - Record and produce 9 videos (OBS + CapCut + Google TTS)
   - README.md diverges from index.html (GitHub audience only)

**4. 📋 FAQ Page** - LOW/LOW (2-3 hours)
   - Create faq.html — answers to common questions
   - Link from: Help menu, README, features.html footer, tutorials.html footer
   - Sections: Security/Privacy, Data/Backup, Troubleshooting, Library, General
   - Include: relay revocation, encryption explanation, moving to new computer, bookmarklet troubleshooting (including blank-tab limitation), stale data, physical books, multi-browser, pricing

**5. 📋 Disaster Recovery Documentation** - LOW/LOW (1-2 hours)
   - Document relay credential recovery paths
   - Document backup files include relay credentials
   - Problem: Users have no guidance for recovering from data loss
   - Impact: Confidence that data is recoverable

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

**2. 🏷️ Deferred Desktop Polish** - LOW/LOW (2-3 hours)
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
