# TODO

## Prioritized Roadmap (By Priority & Complexity)

_Based on user requirements + Claude.ai independent review (CLAUDE-AI-REVIEW.md)_

---


### 🔥 Priority 1: Immediate

**1. 🎬 Loading Splash Screen** - HIGH/LOW (1-2 hours)
   - Add a branded loading screen in `readerwrangler.html` with rotating messages while Babel/Tailwind/React load
   - Messages mix brand language and library humor: "Wrangling your library...", "Taming the chaos...", "Shelving your books...", "Organizing the stacks..."
   - Pure HTML/CSS in readerwrangler.html, zero build step
   - App hides splash when React mounts (e.g., `document.getElementById('splash').style.display = 'none'`)
   - Turns the ~14s wait into a branded experience instead of a blank page
   - Problem: Blank page during 14s load feels broken, especially for first-time users
   - Impact: Professional first impression; loading feels intentional, not slow

""Wrangling your library..."
"Shelving your books..."
"Taming the chaos..."
"Organizing the stacks..."
"Dusting your shelves..."


---

### 🔒 Priority 3: Pre-Launch Gate

~~**2. Basic Accessibility Improvements** - LOW/LOW (2-3 hours)~~ ✅ v6.1.0 — ARIA attributes on modals, context menus, filter dropdowns, icon-only buttons. Keyboard operability deferred to Priority 7.


**3. Quality Attribute Validation** - LOW/LOW (2-3 hours)
   - See [docs/PROJECT-CONTEXT.md](docs/PROJECT-CONTEXT.md) for quality priorities
   - ~~**Scenario A: Scalability Test** - Duplicate library to 9200 books (4x), verify sort/filter/drag performance <1 second~~ ✅ v5.5.4
   - **Scenario C: Data Recovery** - Manually corrupt localStorage, verify graceful error handling + backup restore option
   - **Storage monitoring:** 2300 books = 150 MB / 557 GB quota (0.03%) - NOT a concern
   - Problem: Need confidence app handles edge cases for public release
   - Impact: Robustness validation before launch


---

### 📖 Priority 4: Launch Documentation

**1. 📦 Demo Backup File** - HIGH/LOW (30 min)
   - Create a curated backup JSON with classic/public-domain books for new users to try the app instantly
   - Steps: Back up real library → delete down to classics → save demo backup → restore real backup
   - Include: varied authors, series with positions, tags, ratings, read statuses, a few notes, books in folders + Inbox
   - Strip: `"relay"` credentials block from the JSON before publishing
   - Host on GitHub repo or landing page with simple instructions: "Download → File > Restore Backup → Explore"
   - Problem: New users must run the full fetcher pipeline before they can evaluate the app
   - Impact: Dramatically lowers trial friction — try the app in 30 seconds

**2. 📖 Quick Start Video & Written Guide** - HIGH/LOW (2-4 hours) - See [docs/design/VIDEO-PRODUCTION-PLAN.md](docs/design/VIDEO-PRODUCTION-PLAN.md)

**3. 📚 Comprehensive Documentation Hub** - HIGH/MEDIUM (8-12 hours)
   - Troubleshooting guide (What if scrape fails partway? How to recover?)
   - FAQ (Multiple Amazon accounts? Kindle Unlimited books? Mobile support?)
   - Keyboard shortcuts reference
   - Data management guide (backup, export, import, JSON format)
   - Technical details (How bookmarklet handles anti-scraping)
   - Problem: Users get stuck, have questions, can't find answers
   - Impact: Reduces support burden, improves user confidence

**4. User Guide: consolidate or make accessible from app** - MEDIUM/MEDIUM (4-6 hours)
   - USER-GUIDE.md exists on GitHub but is not accessible from the app
   - Help > How To Use references "User Guide documentation" that users can't reach
   - Decision needed: (a) add Help > User Guide as in-app HTML (2 sources of truth), or (b) delete USER-GUIDE.md and put all guidance in-app, or (c) serve USER-GUIDE.md as a linked page from the app
   - USER-GUIDE.md is significantly out of date — predates relay, mobile sync, tag virtual folders, and other v5.5/v6 features
   - Update FAQ answers that reference file picker workflow (now relay-based)
   - Document relay setup and mobile pairing
   - Problem: Documentation describes a different product than what users experience and is inaccessible from the app
   - Impact: Users can actually find and follow the guide

**5. 📋 Disaster Recovery Documentation** - LOW/LOW (1-2 hours)
   - Prerequisites: Mobile sync (Milestone 2) complete
   - Fill in USER-GUIDE.md FAQ disaster recovery placeholders
   - Document: phone exposes relay credentials in settings (so user can recover them)
   - Document: desktop Relay Setup "enter existing credentials" path (restore access to backend state)
   - Document: backup files include relay credentials (File > Export)
   - Problem: Users have no guidance for recovering from data loss
   - Impact: Confidence that data is recoverable

---

### 🚀 Priority 5: Launch

**1. Launch**
   - COMMUNITY-SHARING-PLAN.md

---

### 🚀 Priority 6: Post-Launch Internal Improvements

**1. 🏷️ Deferred Desktop Polish** - LOW/LOW (2-3 hours)
   - Left pane keyboard navigation: Up/Down arrow, Left/Right collapse/expand, Home/End
   - ~~Desktop Mode escape hatch~~ ✅ v6.0.0-alpha.18 — Interstitial in readerwrangler.html shows "Return to Mobile Mode" / "Continue in Desktop Mode" before loading any app code. Uses sessionStorage to lock mode per tab session.
   - Directional shadow consistency with mobile cover view

**2. ☁️ Cloudflare Free Tier Monitoring** - LOW/LOW (1 hour)
   - Free tier limits: 100K requests/day, 1K KV writes/day, 1K KV deletes/day, 1GB KV storage
   - **KV writes (1,000/day) is the tightest limit** — each putDeviceState() or fetcher upload is a write
   - Cloudflare does NOT warn before limits are hit — requests just start failing (HTTP 1015)
   - Set up: Dashboard → Account → Notifications → Workers usage threshold alerts
   - Monitor: Workers & Pages → worker → Metrics; KV → namespace → Metrics
   - If approaching limits: $5/month paid plan gives 10M requests, 1M KV writes (essentially unlimited)
   - Problem: No visibility into relay usage; no warning before free tier exhaustion
   - Impact: Prevents surprise outages for users

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
