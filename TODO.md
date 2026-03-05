# TODO

## Prioritized Roadmap (By Priority & Complexity)

_Based on user requirements + Claude.ai independent review (CLAUDE-AI-REVIEW.md)_

---


### 🔒 Priority 3: Pre-Launch Gate

**1. Button Consistency Audit** - LOW/LOW (2-4 hours)
   - Audit all button hover states across the app
   - Define 3 button styles: Primary/Secondary/Tertiary
   - Apply consistently everywhere (price goals, Add Tag, View on Amazon, Add Note, Edit Series, etc.)
   - Document button style patterns
   - Problem: Different buttons have different hover behaviors, users can't predict interaction
   - Impact: Consistent, predictable UI interactions

**2. Basic Accessibility Improvements** - LOW/LOW (2-3 hours)
   - Semantic HTML audit (use `<button>` not `<div onclick>`)
   - ARIA labels for key interactions (context menus, drag operations)
   - Keyboard-only navigation validation (tab order, focus indicators)
   - Note: Full accessibility audit deferred (personal-use project)
   - Problem: Potential public users may need accessibility features
   - Impact: Broader user base support with minimal effort


**3. Quality Attribute Validation** - LOW/LOW (2-3 hours)
   - See [docs/PROJECT-CONTEXT.md](docs/PROJECT-CONTEXT.md) for quality priorities
   - ~~**Scenario A: Scalability Test** - Duplicate library to 9200 books (4x), verify sort/filter/drag performance <1 second~~ ✅ v5.5.4
   - **Scenario C: Data Recovery** - Manually corrupt localStorage, verify graceful error handling + backup restore option
   - **Storage monitoring:** 2300 books = 150 MB / 557 GB quota (0.03%) - NOT a concern
   - Problem: Need confidence app handles edge cases for public release
   - Impact: Robustness validation before launch


---

### 📖 Priority 4: Launch Documentation

**1. 📖 Quick Start Video & Written Guide** - HIGH/LOW (2-4 hours) - See [docs/design/VIDEO-PRODUCTION-PLAN.md](docs/design/VIDEO-PRODUCTION-PLAN.md)

**2. 📚 Comprehensive Documentation Hub** - HIGH/MEDIUM (8-12 hours)
   - Troubleshooting guide (What if scrape fails partway? How to recover?)
   - FAQ (Multiple Amazon accounts? Kindle Unlimited books? Mobile support?)
   - Keyboard shortcuts reference
   - Data management guide (backup, export, import, JSON format)
   - Technical details (How bookmarklet handles anti-scraping)
   - Problem: Users get stuck, have questions, can't find answers
   - Impact: Reduces support burden, improves user confidence

**3. User Guide: consolidate or make accessible from app** - MEDIUM/MEDIUM (4-6 hours)
   - USER-GUIDE.md exists on GitHub but is not accessible from the app
   - Help > How To Use references "User Guide documentation" that users can't reach
   - Decision needed: (a) add Help > User Guide as in-app HTML (2 sources of truth), or (b) delete USER-GUIDE.md and put all guidance in-app, or (c) serve USER-GUIDE.md as a linked page from the app
   - USER-GUIDE.md is significantly out of date — predates relay, mobile sync, tag virtual folders, and other v5.5/v6 features
   - Update FAQ answers that reference file picker workflow (now relay-based)
   - Document relay setup and mobile pairing
   - Problem: Documentation describes a different product than what users experience and is inaccessible from the app
   - Impact: Users can actually find and follow the guide

**5. Disaster Recovery Documentation** - LOW/LOW (1-2 hours)
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

**3. Pre-compile Babel JSX for Faster Load Times** - MEDIUM/LOW (1-2 hours)
   - Current: ~14s app load. Babel in-browser JSX compilation (~3-8s) and Tailwind JIT scan (~1-3s) account for most of it. React render + IndexedDB load is only ~1-3s.
   - Step 1 (Babel): `npm install --save-dev @babel/cli @babel/core @babel/preset-react`, add `build.bat` that runs `npx babel readerwrangler.js --presets=@babel/preset-react -o dist/readerwrangler.js`. Update HTML to load `dist/readerwrangler.js` as regular `<script>` instead of `type="text/babel"`. Remove Babel CDN.
   - Step 2 (optional, Tailwind): `npx tailwindcss -i input.css -o dist/styles.css --content "readerwrangler.js,readerwrangler.html"`. Swap Tailwind CDN `<script>` for `<link>` to generated CSS.
   - Prerequisite: Node.js (already installed for scripts/)
   - Note: User loads the page once per session, so this is a one-time cost per use. Medium reward/work ratio.
   - Problem: 14s initial load is noticeable, especially for first-time users
   - Impact: Estimated load time reduction to ~5-8s (Step 1) or ~3-5s (both steps)

---

### 🚀 Priority 7: Post-Launch Enhancements

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

**7. Series Manager**
   - see [docs/design/EDITABLE-SERIES.md](docs/design/EDITABLE-SERIES.md) for full spec

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
