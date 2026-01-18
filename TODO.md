# TODO

## Prioritized Roadmap (By Priority & Complexity)

_Based on user requirements + Claude.ai independent review (CLAUDE-AI-REVIEW.md)_

---

### 🎯 Priority 1: Top Personal Priorities

**0-H Cleanup**
   - Remove PRODUCTHUNT-LAUNCH-CHECKLIST.md
   - Follow recommendations in TERMINOLOGY-CLEANUP-ACTION-PLAN.md
   - Review readerwrangler-amazon-terms-strategy.md

   - update README/index.html Recent Changes with Copies
   - update Coming Soon with Column Organizer
   - compare TODO with docs/design and id any docs not referenced.
      - move to archive or reference them

**0-G. Social media icons use old logo**

**0-F. Confirm**
   - Can extract price
   - can extract book category (SF, etc)
   - see .private/Price and Tags.txt.  Also contains "More like this"

**1. Column Organizer - Split Pane UI**
   - see docs/design/COLUMN-ARRANGER.md

**2. 📝 Book Notes** - LOW/LOW (2-3 hours)
   - Personal notes on individual books ("Why did I buy this?", "Who recommended it?")
   - See [docs/design/BOOK-NOTES.md](docs/design/BOOK-NOTES.md) for full spec
   - Sticky note styling in detail modal (matches landing page brand element)
   - Entry points: "Add Note" button in modal, right-click context menu
   - Auto-save on blur/escape, no explicit save button
   - Problem: Book descriptions don't always capture why you bought or want to read a book
   - Impact: Personal context preserved with each book

**3. 🏷️ Tags** - MEDIUM/MEDIUM (8-12 hours)
   - Tags for books (explicit) and divs (positional inheritance)
   - See [docs/design/TAGS.md](docs/design/TAGS.md) for full spec
   - Books inherit div tags while under that div; lost when moved out
   - Tag filter with autocomplete; hide empty columns/divs when filtering
   - Display: explicit tags (bold) first, inherited (faded) second, alphabetical
   - Problem: Can't find thematically related books (Time Travel, Military SF) across 100+ columns
   - Impact: Cross-library thematic organization, reduced scrolling through empty columns

**4. 🎠 Column Carousel** - MEDIUM/MEDIUM (8-12 hours)
   - Infinite horizontal carousel for columns (excludes pinned columns)
   - See [docs/design/COLUMN-CAROUSEL.md](docs/design/COLUMN-CAROUSEL.md) for full spec
   - Click-to-pin columns to left side; pinned columns exit carousel
   - Momentum-based spinning with mouse wheel, edge hover zones, keyboard arrows
   - 3D perspective: edge columns at 85% scale/opacity, center at 100%
   - Mobile: swipe to spin, carousel locks during book drag
   - Problem: 7+ columns becomes unwieldy with linear horizontal scroll
   - Impact: Scalable navigation for large column counts (20+)
   - filtering would apply to carousel

**5. 📚 Series Page Bulk Import** - MEDIUM/MEDIUM (6-10 hours)
   - See [docs/design/SERIES-PAGE-BULK-IMPORT.md](docs/design/SERIES-PAGE-BULK-IMPORT.md) for full spec
   - Bulk import all books from an Amazon series page as wishlist entries
   - Destroyer series Reference URL: https://www.amazon.com/dp/B0D775V4W9?binding=kindle_edition
   - API: `/kindle-dbs/productPage/ajax/seriesAsinList?asin=X&pageNumber=1&pageSize=200`
   - Single request with pageSize=200 returns all available books
   - Creates wishlist entries (isOwned: false) for books not already owned
   - **Known limitation:** Amazon data gaps (e.g., 155-book series missing books 101-149 from Kindle catalog)
   - Related to P1 T6 Wishlist Price Tracking for full workflow
   - Problem: Adding 100+ books from a series requires visiting each product page individually
   - Impact: One-click bulk wishlist population for entire series

**6. 💰 Wishlist Price Tracking** - MEDIUM/MEDIUM (6-10 hours)
   - Fetch current prices for wishlist books from Amazon product pages
   - Target price field in wishlist book data
   - Filter in APP: show wishlist books with current price ≤ target price
   - Implementation options:
     - Add to Library Fetcher (scrape prices during existing fetch)
     - Separate bookmarklet option with dedicated price lookup script
   - Replaces manual eReaderIQ workflow for price monitoring
   - Problem: Jumping between ReaderWrangler and eReaderIQ for price tracking
   - Impact: Streamlined wishlist-to-purchase workflow

**7. Launch**
   - COMMUNITY-SHARING-PLAN.md
---

### ✨ Priority 2: High Priority Features

**1. 👨‍👩‍👧 Family Sharing Info** - LOW/LOW (2-4 hours)
   - See [docs/design/FAMILY-SHARING.md](docs/design/FAMILY-SHARING.md) for full spec
   - Fetch which books user has shared with family members
   - Display "Shared with: Name" in book detail modal
   - API tested: supports batch of 1000+ ASINs in single call (~200ms)
   - Implementation: Add to collections fetcher, display in organizer
   - Problem: No visibility into which books are shared with family
   - Impact: Better awareness of Family Library sharing status

**2. 📖 Reading Progress Visualization** - MEDIUM/HIGH (6-10 hours)
   - Show reading progress percentage/position for each book
   - Implementation guidance: [Amazon Organizer Reading Progress conversation](https://claude.ai/chat/6e6f23c8-b84e-4900-8c64-fecb6a6e0bd1)
   - Note: Collections data already merged (line 452 LOG.md), this adds progress visualization
   - Problem: Users can't see reading progress in organizer
   - Impact: Better tracking of currently-reading books

**3. 🗑️ Orphan Detection & Recycle Bin** - MEDIUM/MEDIUM (9-13 hours)
   - Detect books no longer in Amazon library after re-import
   - Recycle Bin virtual column for soft-deleted books
   - See [docs/design/ORPHAN-DETECTION-RECYCLE-BIN.md](docs/design/ORPHAN-DETECTION-RECYCLE-BIN.md) for full spec
   - Problem: Orphaned books (samples replaced by purchase, returns, expired subscriptions) clutter library
   - Impact: Clean library management, safe deletion with restore capability

**4. 🔄 Phase 3 Retry Logic + Recovery + Pause/Resume** - MEDIUM/HIGH (12-16 hours, optional)
   - See [docs/design/PHASE-3-RETRY-LOGIC.md](docs/design/PHASE-3-RETRY-LOGIC.md) for full spec
   - Retry logic for failed enrichments (~1.3% failure rate)
   - Pause/Resume capability with global flag + button UI
   - Recovery: Save extraction state to localStorage, resume from interruption
   - State persistence: Track progress, allow resumption after browser close/refresh
   - **Enriches wishlist items**: Wishlist Fetcher only has access to basic fields (title,
     author, cover, rating, series) from product pages; Pass 3 adds descriptions and reviews
     when user runs Library Fetcher
   - Problem: Random enrichment failures, long extractions without pause, lost progress on interruption
   - Impact: Data quality improvement (99.8%+ expected), better UX for long extractions, prevents data loss
   - Note: This consolidates former P2 "Extraction Error Recovery" feature

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

   - **Key risks to preserve:**
     - Drag performance uses refs to avoid re-renders - must preserve
     - `loadLibrary()` handles multiple JSON formats - complex parsing
     - 8 filters must stay coordinated
     - State sync between books array and column.books IDs
   - **Alternative: Thorough split (12 files)** with components + custom hooks - cleaner but 2-3 days work
   - Problem: Large monolithic file hard to navigate and maintain
   - Impact: Better code organization, easier future maintenance, testability
   - **Implementation order:**
     1. Extract `uiHelpers.js` (no dependencies)
     2. Extract `storage.js` (only localStorage/IndexedDB)
     3. Extract `dataProcessing.js` (uses above)
     4. Extract `dragDrop.js` (uses uiHelpers)
     5. Update main component imports
   - **Context Menu IIFE** - The context menu positioning (v4.1.0.e) uses an IIFE in JSX to calculate viewport bounds before rendering. Consider extracting to a custom hook or component for cleaner code.

**6. Multi-Store Architecture** #Architecture - LOW/VERY HIGH (60-80 hours)
   - See [docs/design/MULTI-STORE-ARCHITECTURE.md](docs/design/MULTI-STORE-ARCHITECTURE.md) for full spec
   - Status: Future enhancement (Amazon first, other stores later)
   - Covers: File naming, bookmarklet detection, data structure, migration path
   - Problem: Only works with Amazon
   - Impact: Support for other ebook platforms

---

### 📚 Priority 3: Nice-to-Have Features

**1. 📖 Enhanced Series Management** - MEDIUM/MEDIUM (6-10 hours)
   - Expand current "Group Series Books" button
   - Automatic series detection
   - Series reading order visualization
   - Missing book detection ("You have books 1, 2, and 4 of this series")
   - Problem: Series books scattered across library
   - Impact: Better management for series readers

**2. 🏷️ Color-Coding/Tagging System** - MEDIUM/MEDIUM (8-10 hours)
   - Visual distinction beyond columns
   - Tag-based organization
   - Problem: Columns alone may not capture all organizational needs
   - Impact: More flexible organization

**3. 🤖 Smart Collections (Rule-Based)** #Optional - LOW/HIGH (12-16 hours)
   - "All unread books rated 4.5+"
   - Requires complex rule engine
   - Problem: Manual organization is tedious
   - Impact: Automation for power users

**4. 🎯 Wishlist Integration - Series Gap Detection** #Optional - MEDIUM/VERY HIGH (20-30 hours)
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
   - **Investigation tasks:**
     - Research Amazon API for series metadata (GraphQL? Product Advertising API?)
     - Test series detection accuracy across sample of 50+ series books
     - Determine if series page scraping is feasible fallback
     - Measure API rate limits for series metadata queries
   - **Subtasks:**
     - Series detection algorithm (pattern matching on titles, author clustering)
     - Series gap identification logic
     - Amazon API integration for missing book metadata
     - Wishlist auto-population workflow
     - Series column UI for gap visualization

**5. ✨ UX Quick Wins** - MEDIUM/LOW (1-3 hours each)
   - Tooltips for control buttons (Backup, Restore, Reset, Clear)
   - First-run Welcome dialog explaining what ReaderWrangler is
   - **Keyboard shortcuts help** - "?" icon or Ctrl+? to show shortcuts dialog (Undo/Redo, multi-select, etc.)
   - Column name filtering (search by column name)
   - Make status dialog draggable/movable (modal → draggable)
   - **Drag Divider by Title Area** - Click-drag on divider title text (not just ⋮ handle) to reposition. Must not conflict with double-click to rename.
   - **More Auto-Divide Helpers** - Auto-Divide by Author, by Acquisition Date (Year groups), by Page Count (Short/Medium/Long). All use same divider infrastructure.

---

### 📖 Priority 4: Polish & Documentation (Before Public Launch)

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

**6. Enhanced Getting Started UX** #Architecture - See [docs/design/ENHANCED-GETTING-STARTED-UX.md](docs/design/ENHANCED-GETTING-STARTED-UX.md)
   - Status: Planned (post-rename enhancement)
   - Help menu links, enhanced empty library state

---

### 📊 Priority 5: Analytics & Export (MEDIUM Priority, LOW-MEDIUM Complexity)

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

### 🔧 Priority 6: Technical Improvements (MEDIUM-LOW Priority, MEDIUM-HIGH Complexity)

**1. Phase 3: UI Error Handling** #FetcherImprovements - MEDIUM/LOW (2-3 hours)
   - Warning banners for missing descriptions
   - "View Missing Descriptions" feature
   - Problem: Users unaware of missing enrichment data
   - Impact: Transparency about data quality

---

### 🌐 Priority 7: Integrations & Advanced Features (LOW Priority, HIGH-VERY HIGH Complexity)

**1. 🔗 Third-Party Integrations** - LOW/HIGH (20-30 hours)
   - Goodreads sync (import ratings, mark as read)
   - StoryGraph integration
   - Export recommendations to Amazon wishlist
   - Problem: Complex API work, authentication, rate limits
   - Impact: Niche feature for users of these services

**2. 🧠 Smart Recommendations** - LOW/HIGH (30-40 hours)
   - "You own these similar books you haven't read yet"
   - "Others who loved [this book] also read [these books] from your library"
   - Highlight forgotten purchases based on high ratings
   - Problem: Requires recommendation engine, ML/AI complexity
   - Impact: Book discovery from existing library

**3. Live reflow drag-and-drop animation** #Optional - LOW/MEDIUM (4-6 hours)
   - Smooth visual feedback during drag operations
   - Problem: Current drag-and-drop feels abrupt
   - Impact: Polish and visual appeal

**4. Multi-User Support** #Architecture - LOW/VERY HIGH (40-60 hours)
   - See [docs/design/MULTI-USER-DESIGN.md](docs/design/MULTI-USER-DESIGN.md) for full spec
   - Status: Low priority - workaround sufficient for most users
   - Covers: AccountId identification, storage architecture, mismatch handling
   - Problem: Multiple Amazon accounts on same device
   - Impact: Household/family sharing
   - **Workaround Available**: See [USER-GUIDE.md FAQ](USER-GUIDE.md#faq) "Can I maintain separate organizational states?" for Backup/Restore method to swap between different organizational states (demo vs. actual collection, testing vs. production, etc.)
