# TODO

## Prioritized Roadmap (By Priority & Complexity)

_Based on user requirements + Claude.ai independent review (CLAUDE-AI-REVIEW.md)_

---

### 🔥 Priority 0: Immediate

**1. Bulk Edit Fields (Author / Title / Series / Position)** - MEDIUM/MEDIUM (6-10 hours)
   - **Problem**: Amazon data has inconsistent author names (e.g., "C.J. Fielding" vs "CJ Fielding" vs "C.J.  Fielding" with extra spaces). No way to fix this in the app — discovered via Group feature showing fragmented author groups.
   - **Multi-select context menu approach**: Select 1+ books → right-click → "Edit Author..." / "Edit Series..." / "Edit Title..." / "Edit Position..."
   - Each opens a small modal/popover with a single text field:
     - All selected books have same value → pre-populate with it
     - Mixed values → empty field with placeholder "Mixed (N values)"
     - User types new value → applies to all selected books
   - One field at a time (not a multi-field form) — keeps it simple and focused
   - Works in both table and cover views (same context menu)
   - Changes persist to book data (same as existing series editing in book detail modal)
   - **Undo support**: Record as a single undoable action ("Edit Author for N books")
   - **Future**: Double-click cell in table view for inline single-book editing (bigger lift, separate feature)

---

### 🎯 Priority 1: Current Focus


**1. 📊 Group in Book Explorer** - MEDIUM/MEDIUM (6-10 hours) — IN PROGRESS (v5.4.5)
   - Simple on/off toggle button in toolbar (hidden when sort is Manual Order)
   - Group key always mirrors the current sort column — sort by Author → groups by author, sort by Series → groups by series, etc. Change sort → dividers update automatically.
   - Dividers inserted at value transitions in sort order (sequential scan, not alphabetical re-sort)
   - **Table view**: Full-width header `<tr>` rows with chevron, group name, book count. Click to collapse/expand.
   - **Cover view**: Full-width section dividers (`gridColumn: 1 / -1`) with same collapse behavior.
   - All books always shown (dividers are additive). Collapsed groups hide their books.
   - Collapse All / Expand All as inline text buttons next to the Group toggle.
   - Works with existing filters (groups with 0 matching books hidden).
   - `getGroupLabel()` handles all column types (dates bucketed by month/year, ratings as "N Stars", etc.)
   - Persisted as boolean `explorerGroupOn` in localStorage. Collapsed groups session-only.

**2. 🔀 Cover View Sort Picker** - LOW/LOW (2-3 hours)
   - Currently cover view shows "Sort: Author ▲ ×" but you can only reverse direction or clear — can't pick a different sort key without switching to list view.
   - Fix: Click "Sort: Author ▲" → dropdown with all sortable columns (Title, Author, Rating, Published, Date Added, Series, Position, Price, Custom Order).
   - Checkmark on current key, arrow shows direction. Click same key toggles direction. Click different key sorts by it.
   - Shift+click adds secondary sort (matches list view shift+click-on-column convention).
   - Display: `Sort: Author ▲, Position ▲ ×` for multi-key sorts.
   - All sort infrastructure already exists (`explorerSort` state handles multi-key). This is purely a UI control.

**3. It would be nice if Author or Title had a dropdown memory

**4. I think wishlist import overwrote my owned books?**
   - Destroyer shows no owned books now.

**5. 📱 Mobile Responsive Design** - MEDIUM/MEDIUM (8-12 hours)
   - Problem: Portrait mode shows only 1-2 book rows, left pane too wide, headers consume vertical space
   - Current state: App works on mobile but layout unusable (landscape shows 2 rows, portrait ~0 rows)
   - Solution TBD: May require UX paradigm shift (hamburger nav, tab switching, overlay panels) vs. basic responsive CSS
   - Needs brainstorming session to determine approach
   - Impact: Makes app usable on mobile devices

---

### ⚡ Priority 2: Core Enhancements

**1. 📖 Reading Progress Visualization** - MEDIUM/HIGH (6-10 hours)
   - Show reading progress percentage/position for each book in dialog and a column in explorer
   - Implementation guidance: [Amazon Organizer Reading Progress conversation](https://claude.ai/chat/6e6f23c8-b84e-4900-8c64-fecb6a6e0bd1)
   - Note: Collections data already merged (line 452 LOG.md), this adds progress visualization
   - Problem: Users can't see reading progress in organizer
   - Impact: Better tracking of currently-reading books; transforms app from "organizer" to "reading companion"

**2. 📚 Book Recommendations** - LOW/LOW (2-3 hours)
   - See [docs/design/BOOK-RECOMMENDATIONS.md](docs/design/BOOK-RECOMMENDATIONS.md) for full spec
   - Display "Similar Books" in book detail modal (collapsible, hidden by default)
   - Data already fetched in Phase 3 (tags API) but currently discarded
   - Store: `recommendations: [{asin, title, coverUrl}]` per book (~1KB/book)
   - Click opens Amazon product page; "Owned" badge if book is in library
   - Future: "You own these similar books you haven't read yet" cross-reference
   - Future: Highlight forgotten purchases based on high ratings
   - Problem: No discovery of related books from within the app
   - Impact: Book discovery without leaving ReaderWrangler

---

### ✨ Priority 3: Foundational UX

**1. Tooltips for Control Buttons** - LOW/LOW (1 hour)
   - Add tooltips to Backup, Restore, Reset, Clear buttons
   - Problem: Users unsure what buttons do
   - Impact: Discoverability, reduced confusion

**2. First-run Welcome Dialog** - LOW/LOW (2 hours)
   - Explain what ReaderWrangler is on first visit
   - Brief intro, link to documentation
   - Problem: New users don't know what the app does
   - Impact: Better onboarding

**3. Keyboard Shortcuts Help** - LOW/LOW (2 hours)
   - "?" icon or Ctrl+? to show shortcuts dialog
   - List: Undo/Redo, multi-select, navigation, etc.
   - Problem: Users don't know available shortcuts
   - Impact: Power user efficiency

**4. Button Consistency Audit** - LOW/LOW (2-4 hours)
   - Audit all button hover states across the app
   - Define 3 button styles: Primary/Secondary/Tertiary
   - Apply consistently everywhere (price goals, Add Tag, View on Amazon, Add Note, Edit Series, etc.)
   - Document button style patterns
   - Problem: Different buttons have different hover behaviors, users can't predict interaction
   - Impact: Consistent, predictable UI interactions

**5. Enhanced Getting Started UX** - See [docs/design/ENHANCED-GETTING-STARTED-UX.md](docs/design/ENHANCED-GETTING-STARTED-UX.md)
   - Status: Planned (post-rename enhancement)
   - Help menu links, enhanced empty library state

**6. Quality Attribute Validation** - LOW/LOW (2-3 hours)
   - See [docs/PROJECT-CONTEXT.md](docs/PROJECT-CONTEXT.md) for quality priorities
   - **Scenario A: Scalability Test** - Duplicate library to 9200 books (4x), verify sort/filter/drag performance <1 second
   - **Scenario C: Data Recovery** - Manually corrupt localStorage, verify graceful error handling + backup restore option
   - **Storage monitoring:** 2300 books = 150 MB / 557 GB quota (0.03%) - NOT a concern
   - Problem: Need confidence app handles edge cases for public release
   - Impact: Robustness validation before launch

**7. Basic Accessibility Improvements** - LOW/LOW (2-3 hours)
   - Semantic HTML audit (use `<button>` not `<div onclick>`)
   - ARIA labels for key interactions (context menus, drag operations)
   - Keyboard-only navigation validation (tab order, focus indicators)
   - Note: Full accessibility audit deferred (personal-use project)
   - Problem: Potential public users may need accessibility features
   - Impact: Broader user base support with minimal effort

**8. Browser Compatibility Documentation** - LOW/LOW (30 min)
   - Document Chrome-only requirement in README and app footer
   - Note: Firefox/Edge may work but untested
   - Optional: 30-min Firefox smoke test before public release
   - Problem: Users may try on unsupported browsers
   - Impact: Clear expectations, reduced support burden

---

### 📖 Priority 4: Documentation

**1. 📖 Quick Start Video & Written Guide** - HIGH/LOW (2-4 hours) - See [docs/design/VIDEO-PRODUCTION-PLAN.md](docs/design/VIDEO-PRODUCTION-PLAN.md)

**2. 📚 Comprehensive Documentation Hub** - HIGH/MEDIUM (8-12 hours)
   - Troubleshooting guide (What if scrape fails partway? How to recover?)
   - FAQ (Multiple Amazon accounts? Kindle Unlimited books? Mobile support?)
   - Keyboard shortcuts reference
   - Data management guide (backup, export, import, JSON format)
   - Technical details (How bookmarklet handles anti-scraping)
   - Problem: Users get stuck, have questions, can't find answers
   - Impact: Reduces support burden, improves user confidence

**3. 📱 Mobile Support Clarity** - HIGH/LOW (1 hour)
   - Document whether app works on mobile devices
   - Add to FAQ and main page
   - Problem: Major omission for users who browse libraries on phones/tablets
   - Impact: Sets correct expectations

**4. 📋 Changelog Visibility** - MEDIUM/LOW (30 minutes)
   - Link version display (e.g., "v3.6.0") to CHANGELOG.md
   - Problem: Users see version numbers but no context
   - Impact: Transparency about what changed

**5. Fill in Missing Sections in USER-GUIDE.md** - MEDIUM/LOW (2-3 hours)
   - Complete placeholder sections
   - Add screenshots/examples
   - Problem: Partial documentation confuses users
   - Impact: Complete feature documentation

---

### 🚀 Priority 5: Launch

**1. Launch**
   - COMMUNITY-SHARING-PLAN.md

---

### 🚀 Priority 6: Post-Launch Internal Improvements

**1. 🔄 Extend Gap-Fill to Include Reviews** - LOW/LOW (1 hour)
   - File: `amazon-library-fetcher.js`
   - Current gap-fill only targets books missing descriptions
   - Extend filter: `!description || (reviewCount > 0 && !topReviews?.length)`
   - When enrichBook returns data, update ALL fields (not just the missing one)
   - Same `enrichBook` API returns both description and reviews in one call
   - Problem: ~1.3% of books missing reviews despite having review count
   - Impact: Progressive data completeness improvement

**2. 🔄 Wishlist Deduplication** - LOW/LOW (2-3 hours)
   - See [docs/design/WISHLIST-DEDUP.md](docs/design/WISHLIST-DEDUP.md) for full spec
   - Prevent duplicate wishlist entries (dedupe on save by ASIN)
   - Toast notifications for user feedback (non-blocking, auto-dismiss)
   - Single add: "Added to wishlist" / "Already on wishlist" / "Already in library"
   - Series add: Summary toast "Added 15. Skipped: 3 owned, 2 on wishlist"
   - One-time cleanup utility in Data Status for existing duplicates
   - Problem: Easy to add same book multiple times; no feedback; bloats JSON
   - Impact: Cleaner data, user awareness without workflow interruption

**3. 🗑️ Orphan Detection & Recycle Bin** - MEDIUM/MEDIUM (9-13 hours)
   - Detect books no longer in Amazon library after re-import
   - Recycle Bin virtual column for soft-deleted books
   - See [docs/design/ORPHAN-DETECTION-RECYCLE-BIN.md](docs/design/ORPHAN-DETECTION-RECYCLE-BIN.md) for full spec
   - Problem: Orphaned books (samples replaced by purchase, returns, expired subscriptions) clutter library
   - Impact: Clean library management, safe deletion with restore capability

 ---

### 🚀 Priority 7: Post-Launch Enhancements

**1. 👨‍👩‍👧 Family Sharing Info** - LOW/LOW (2-4 hours)
   - See [docs/design/FAMILY-SHARING.md](docs/design/FAMILY-SHARING.md) for full spec
   - Fetch which books user has shared with family members
   - Display "Shared with: Name" in book detail modal
   - API tested: supports batch of 1000+ ASINs in single call (~200ms)
   - Implementation: Add to collections fetcher, display in organizer
   - Problem: No visibility into which books are shared with family
   - Impact: Better awareness of Family Library sharing status

**2. 📖 Series Management** - ✅ COMPLETE (v5.1.0)
   - See [docs/design/WIZARD-MODE.md](docs/design/WIZARD-MODE.md)
   - Implemented: Auto-organize by author/series, automatic series detection, series subfolders, series reading order
   - Future enhancement: Missing book detection ("You have Dresden Files #1-15 but missing #7")
   - Impact: Better management for series readers

**3. 🖼️ V2 Dual-Pane Split** - MEDIUM/MEDIUM (8-12 hours)
   - See [docs/design/DUAL-PANE-SPLIT.md](docs/design/DUAL-PANE-SPLIT.md) for full analysis
   - Two folder views side by side for power users
   - Option A: Built-in split pane (8-12 hours, native drag works)
   - Option B: BroadcastChannel sync for two browser tabs (4-6 hours, copy/paste only)
   - Problem: Precise cross-folder positioning requires navigation
   - Impact: 10% power-user case; 90% covered by drag-to-folder-tree

**4. Multi-Store Architecture** #Architecture - LOW/VERY HIGH (60-80 hours)
   - See [docs/design/MULTI-STORE-ARCHITECTURE.md](docs/design/MULTI-STORE-ARCHITECTURE.md) for full spec
   - Status: Future enhancement (Amazon first, other stores later)
   - Covers: File naming, bookmarklet detection, data structure, migration path
   - Problem: Only works with Amazon
   - Impact: Support for other ebook platforms

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

**2.  UI Error Handling** #FetcherImprovements
   -failures (especially in phase 0 - test API - should generate a report for a github issue with a link to github issues)

**3. Replace Inbox collector with intentional moves.**
   - The problem: The Inbox useEffect watches [books, folders, syncStatus] and sweeps any book not in any folder into Inbox. It acts as a garbage collector rather  than explicit logic. This masks bugs — e.g., in v5.2.0-alpha.13/14, a global keyboard handler accidentally removed a book from its folder, and the collector silently swept it into Inbox instead of the bug being obvious.

   - The agreed fix (TODO.md Priority 10, item 4): Replace with explicit Inbox placement in the import/load path only. When books are loaded from   amazon-library.json, explicitly place new books (not already in any folder) into Inbox at that point. All other book movements (drag-drop, DEL, wizard
  organize, remove from folder) are already explicit actions.

  - Effort: Rated LOW/LOW (1-2 hours) in TODO.md. Not substantial — but it's a separate task from the Column App removal. We agreed to leave it for later rather than mix it into this refactoring.

  - The behavior you just saw (DEL removes book from folder → Inbox collector sweeps it up) is "by design" in the current implementation, even though the design is acknowledged as flawed.


**4. 🔄 Replace Inbox useEffect Collector with Explicit Import Logic** - LOW/LOW (1-2 hours)
   - Current: Reactive useEffect watches `[books, folders, syncStatus]` and sweeps any unplaced books into Inbox
   - Problem: Acts as a garbage collector rather than explicit logic. All book moves between folders are explicit actions (drag-drop, wizard organize, remove from folder), but the initial import of new books is the only case that legitimately needs Inbox placement. The reactive approach caused a subtle bug (v5.2.0-alpha.13/14) where a global keyboard handler accidentally removed a book from its folder, and the collector silently swept it into Inbox — masking the real bug.
   - Fix: Replace with explicit Inbox placement in the import/load path only. When books are loaded from amazon-library.json, explicitly place new books (not already in any folder) into Inbox at that point.
   - Impact: Eliminates a class of silent data-movement bugs; makes all book placement explicit and traceable

**5. 🔧 Refactor readerwrangler.js into Modules** - LOW/MEDIUM (4-6 hours)
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




