# TODO

**See [PLAN-Feature-Roadmap.md](PLAN-Feature-Roadmap.md) for detailed implementation plans and prioritization.**

---

## Current Priorities (User-Defined)

1. 🌐 **GitHub Pages Distribution** - 3-6 hours (IN PROGRESS)
2. 🐛 **Collections Filter Bug Fix** (v3.3.3) - 30m-1h
3. 📚 **Collections Integration - UI Features** (v3.4.1) - 4-8 hours
4. 🔄 **Phase 3 Retry Logic** (v3.4.1) - 8-12 hours (optional)
5. ✨ **UX Quick Wins** (various) - 1-3 hours each

**Detailed specifications**: See [PLAN-Feature-Roadmap.md](PLAN-Feature-Roadmap.md)

---

## Completed
- [x] Initialize git repository
- [x] Setup GitHub remote
- [x] Create project documentation
- [x] Repository setup and organization
- [x] Project renamed from Kindle Library Organizer to Amazon Book Organizer
- [x] Phase 0 API Testing - Validate BOTH library and enrichment queries before fetching (fail fast with diagnostics)
- [x] Improved file save location messaging (browser's save location vs Downloads folder)
- [x] Rename "Empty (No Library Loaded)" text → "Click here to load library"
- [x] Custom status icons - Replace Unicode with PNG images (busy, empty, fresh, stale, question-mark)
- [x] Fix status icon display lag - Pre-load all icons and toggle with CSS
- [x] Grammar fix - Singular/plural for "1 new book" vs "N new books"
- [x] Dialog behavior fix - Close immediately when file picker opens
- [x] Fix manifest caching issue - Add cache-busting to fetch
- [x] Fix stale status after "Clear Everything" - Clear manifestData
- [x] Improve button labels - "Sync Now" → "Load Updated Library"
- [x] Terminology consistency - Replace "sync" with "load" throughout UI
- [x] Dynamic title management - Browser title updates from APP_VERSION constant
- [x] Search bar improvements - Add magnifying glass icon and better placeholder
- [x] Add Column UX redesign - Button creates "New Column" with cursor ready to rename
- [x] Claude Skills infrastructure - Created SKILL-*.md files and build scripts
- [x] Session continuity - Created NOTES.md for tabled items and work context
- [x] Project version management - README.md as source of truth for git tags
- [x] Documentation updates - README with server setup, Skills workflow, NOTES.md
- [x] Improve column rename discoverability - Added hover pencil icon (feature was working via double-click but not obvious to users)
- [x] Improve library fetcher error messages - Added actionable recovery steps for auth failures
- [x] HTML refactoring - Split monolithic HTML into separate CSS/JS files (v3.2.0)
- [x] Version management enhancements - Query string cache busting, footer display, version comments
- [x] Git pre-commit hook - Automatic SKILL zip rebuilding on commit
- [x] Collections fetcher - Built collections-fetcher.js to extract collection membership and read status (v1.0.0)
- [x] Multi-select with Ctrl/Shift clicking - Standard file-manager style multi-select (v3.4.0, released 2025-11-12)

## Stable ASIN-Based IDs - IN PROGRESS

**Goal**: Fix book organization persistence by using stable ASIN-based IDs instead of sequential book-N IDs

**Status**: Testing stable ID implementation with purchase date sorting

**Problem**: Books were using sequential IDs (`book-0`, `book-1`, etc.) that changed when library was reloaded in different order, causing:
- Books with mismatched IDs not appearing in organizer UI
- Organization data becoming out of sync with library
- Missing books at end of library (5 books hidden after reload)

**Solution**:
- Use ASIN as stable book ID (IDs persist across reloads regardless of order)
- Sort books by acquisition date (newest first) to maintain familiar display order
- Clear IndexedDB and localStorage to start fresh with new ID system

**Changes Made**:
- [x] Changed ID generation from `book-${i}` to `item.asin` in organizer
- [x] Added purchase date sorting (newest first) to restore original ordering
- [x] Removed complex migration logic (opted for clean start instead)
- [x] Updated version to v3.3.0.c for testing
- [ ] Test that all 2343 books load correctly
- [ ] Test that organization persists across reloads
- [ ] Verify purchase date ordering is correct

## Collections Integration - DATA MERGED ✅, UI INCOMPLETE

**Status**: Collections data successfully merged into organizer, UI features pending

**Completed**:
- [x] Build collections fetcher script (collections-fetcher.js v1.0.0)
- [x] Test collections fetcher (successfully fetched 2,280 books in 3m 56s)
- [x] Generate amazon-collections.json with all collection data
- [x] HTML refactor complete (v3.2.0) - modular structure ready for integration
- [x] Merge v3.2.0 refactor to main
- [x] Pull refactored main into feature-collection-read-status-exploration
- [x] Load and merge collections data with library data in organizer
  - Console shows: "📚 Collections data merged: 1163 books have collections"
  - Read status tracked: 642 READ, 1 UNREAD, 1700 UNKNOWN

**TODO - UI Features**:
- [ ] Add visual indicators (badges/icons) for collections on book covers
- [ ] Add metadata display showing which collections each book belongs to
- [ ] Add filtering by collection name
- [ ] Add filtering by read status (READ/UNREAD/UNKNOWN)
- [ ] Implement "Uncollected" pseudo-collection (books with no collections)

**Design Decisions:**
- **Two separate JSON files**: `amazon-library.json` + `amazon-collections.json`
- **Collections JSON includes ALL books** (even with no collections) for "Uncollected" support
- **Output format**: `{asin, title, readStatus, collections: [{id, name}]}`
- **"Uncollected" = computed pseudo-collection** (books with `collections: []`)
- **Edge cases**:
  - Books in collections but not library → Show dialog after full scan
  - Books in library but not collections → Normal, no collections/readStatus
  - Missing collections.json → App works, no collection features
  - Schema mismatch → Handle gracefully

## Bugs - High Priority

- [x] **Description fetching is broken** - FIXED in v3.1.2 - Description extraction now works correctly
- [x] **Missing books in organizer UI** - FIXED in v3.3.0.c - Switched to stable ASIN-based IDs
- [ ] **Collections filter not cleared by "Clear Everything"** - Collections dropdown still shows old collection names after Clear Everything is clicked (deferred to future release)
- [x] **"Clear Library" feature** - FIXED in v3.3.2.m - Simplified from complex dialog to single button
  - Replaced "Reset Organization" and "Clear Everything" dialog with single "Clear Library" button
  - Based on proven v3.2.1 clearEverything pattern
  - Complete reset: unloads library, removes columns, clears organization, resets to pristine state
  - Simple confirm() dialog explains what will be cleared
  - User tested and confirmed: "works exactly as expected!"

## Fetcher Improvements - Phase 2 (Description Tracking & Reporting) ✅ COMPLETE

**Goal**: Add comprehensive tracking and reporting for books without descriptions

**Status**: Completed and committed (commit e058725)

### Schema v3.0.0 Changes ✅
- [x] **Add metadata section to amazon-library.json**:
  - `metadata.fetchDate`, `metadata.totalBooks`, `metadata.booksWithoutDescriptions`
  - `metadata.schemaVersion = "3.0.0"`
  - `booksWithoutDescriptions` array: `[{asin, title, authors}]`

### Library Fetcher Enhancements ✅
- [x] **Track missing descriptions during Pass 2**:
  - Build `booksWithoutDescriptions` array for books where `extractDescription()` returns empty
  - Add metadata section to output JSON
  - Include schema version in metadata

- [x] **Add end-of-run summary to console**:
  - Show total books, books with complete data, books missing descriptions
  - List all books without descriptions (ASIN, title, author)

### Organizer Support ✅
- [x] **Handle new JSON schema v3.0.0**:
  - Validates `{metadata, books}` structure
  - Extracts and logs metadata information
  - Throws helpful error for invalid schemas

### Collections Fetcher ✅
- [x] Added named function wrapper for reusability (`fetchAmazonCollections()`)

## Fetcher Improvements - Phase 2.5 (Description Investigation) ✅ COMPLETE

**Goal**: Investigate why some books lack descriptions and explore alternative extraction methods

**Status**: ✅ COMPLETED - 99.91% description recovery achieved

- [x] **Investigation and recovery**:
  - Created 6 throwaway investigation/recovery scripts
  - Discovered 3 new extraction patterns (paragraph wrappers, AI summaries, recursive fragments)
  - Recovered 1,526 out of 1,528 missing descriptions
  - Updated library-fetcher.js v3.2.0 with all discovered patterns
  - Documented complete investigation in DESCRIPTION-RECOVERY-SUMMARY.md

**Results**:
- Traditional descriptions: 1,517 recovered
- AI summaries: 7 recovered
- Recursive extractions: 2 recovered
- Only 2 books genuinely lack descriptions on Amazon (verified manually)

**Throwaway Files** (moved to recovery-scripts/ directory - can be deleted after fresh fetch succeeds):
- All description-*.js scripts
- All recovered-*.json data files
- books-without-descriptions*.json files
- Library backup copies

## Fetcher Improvements - Phase 2.6 (Partial Error Investigation) ✅ COMPLETE

**Goal**: Fix 3/2666 enrichment failures caused by partial GraphQL errors

**Status**: ✅ COMPLETED - Solution validated in overnight fetch (v3.3.2.b)

**Problem**: 3 books failed during full library fetch with "Customer Id or Marketplace Id is invalid" error
- Cats (position 2037, ASIN B0085HN8N6)
- Queen's Ransom (position 2321, ASIN 0684862670)
- To Ruin A Queen (position 2322, ASIN 0684862689)

**Root Cause Discovered**: GraphQL partial errors
- Amazon returns BOTH `data` (with valid description) AND `errors` (customerReviewsTop failed)
- Our code rejected entire response if `data.errors` existed
- Lost valid description data by treating partial errors as total failures

**Solution Implemented** (v3.3.2.b):
- [x] Partial error handling - check for data despite errors
- [x] Enhanced error logging with raw response dumps
- [x] Statistics tracking for partial errors (position, title, ASIN, error message, error path)
- [x] Final summary section showing all partial errors

**Validation Results**:
- [x] Run overnight full library fetch validation (~3 hours) - SUCCESSFUL
- [x] Verify all 3 books now have descriptions - CONFIRMED
- [x] Review partial error statistics - 5 books had partial errors, all recovered
- [ ] Update CHANGELOG.md with v3.3.2 release - IN PROGRESS
- [ ] Archive diagnostic scripts (post-release cleanup)

**See also**: NOTES.md "Phase 2 Enrichment Failures Investigation" for complete investigation timeline

## Cleanup After Phase 2.6 Investigation

**Goal**: Archive diagnostic scripts and restructure NOTES.md after validation completes

**Prerequisites**:
- ✅ Overnight fetch validation successful
- ✅ Confirmed 3 books recovered
- ✅ No new partial errors discovered

**Tasks**:
- [ ] **Archive diagnostic scripts to recovery-scripts/**:
  - Move all `diag-*.js` files (13 scripts)
  - Move all `antidote-test-*.js` files (7 scripts)
  - Move all `check-*.js`, `analyze-*.js`, `diff-*.js`, `verify-*.js` files
  - Move all `output-*.txt` instruction files
  - Move all test result files (`test-*-console-results.txt`, `test-*-final-results.json`)
  - Keep `library-fetcher.js`, `amazon-organizer.js`, `amazon-organizer.html` in root

- [ ] **Restructure NOTES.md**:
  - Extract "Phase 2 Enrichment Failures Investigation" section to separate file: `NOTES-PHASE-2.6-INVESTIGATION.md`
  - Keep only active work and tabled items in NOTES.md
  - Archive completed investigation details
  - Update references to point to archived file

- [ ] **Update documentation**:
  - Verify CHANGELOG.md has v3.3.2 entry
  - Verify README.md file versions are current
  - Review CONTRIBUTING.md for any needed updates

## Release v3.3.2 ✅ COMPLETE

**Released**: 2025-11-11
**Tag**: [v3.3.2](https://github.com/Ron-L/amazon-book-organizer/releases/tag/v3.3.2)

**Completed**:
- ✅ Overnight fetch validation successful (all 3 problem books recovered)
- ✅ Clear Library feature implemented and tested (v3.3.2.m → v3.3.2)
- ✅ Load Library instruction text improved (v3.3.2.n → v3.3.2)
- ✅ Version Management: library-fetcher.js v3.3.2, amazon-organizer.js v3.3.2
- ✅ Documentation: CHANGELOG.md updated with complete v3.3.2 entry
- ✅ Git Workflow: Committed, tagged v3.3.2, pushed with tags
- ✅ Post-Release Review: Comprehensive post-mortem completed
  - Created [post-mortems/v3.3.2-2025-11-11.md](post-mortems/v3.3.2-2025-11-11.md)
  - Extracted 3 actionable patterns to Ground Rules
  - Documented what worked well, mistakes made, lessons learned
- ✅ Post-Release Cleanup: 77 investigation files archived
  - Created `/future` directory for specification documents (2 files)
  - Organized `archived-investigations/phase-2.0-description-recovery/` (17 files)
  - Organized `archived-investigations/phase-2.6-partial-errors/` (60 files)
  - Root directory: 100% cleanup of investigation artifacts
- ✅ GraphQL Quick Reference: Created concise 1-page reference document

**Key Achievements**:
- Fixed partial GraphQL error handling (recovered 5/5 books with partial errors)
- Simplified Clear Library feature (based on v3.2.1 working pattern)
- Improved load library instructions for first-time users
- 100% data coverage achieved (all 2666+ books enriched successfully)

**Lessons Learned**: See [post-mortems/v3.3.2-2025-11-11.md](post-mortems/v3.3.2-2025-11-11.md)

**Note**: This release followed the "Build Solid Foundation" approach - spent 6 days investigating 3/2666 failures (0.15%) because library management requires 100% data coverage (see CONTRIBUTING.md "Ship Fast vs. Build Solid" framework)

## Fetcher Improvements - Phase 3 (UI Error Handling)

**Goal**: Improve error messaging in organizer for missing descriptions

### Organizer Updates
- [x] **Handle new JSON schema v3.0.0** - COMPLETED in Phase 2
  - Load and parse `metadata` and `booksWithoutDescriptions`
  - No backward compatibility (requires fetcher v3.1.3+)

- [x] **Improve book dialog error messaging** - COMPLETED in v3.2.1
  - ~~If empty + in `booksWithoutDescriptions`: "⚠️ Description not available from Amazon"~~
  - ~~If empty + NOT in array: "❌ Error: Description should exist but wasn't found"~~
  - ~~Remove "📥 Fetch Description & Reviews" manual fetch button~~
  - **Simple implementation:** Removed misleading button, added honest "Description not available" message
  - **Note:** Schema-aware messaging (booksWithoutDescriptions) deferred to Phase 3

- [ ] **Add warning banner on library load**:
  - Dismissible banner if books missing descriptions
  - Store dismissed state in localStorage

- [ ] **Add "View Books Missing Descriptions" feature**:
  - Button/menu to view list anytime
  - Table with title, author, ASIN
  - Link to book dialog

## Fetcher Improvements - Phase 4 (Reliability & Data Quality) ✅ COMPLETE

**Goal**: Improve fetch reliability, filter out non-book items, and add comprehensive statistics

**Status**: ✅ COMPLETED - library-fetcher.js v3.3.0

- [x] **Retry logic with exponential backoff**:
  - Applied to Phase 0 validation (library + enrichment tests)
  - Applied to Pass 1 library page fetching
  - Applied to Pass 2 individual book enrichment (already had retry logic)
  - Retries up to 3 times with 5s, 10s, 20s delays between attempts
  - Prevents data loss from temporary network issues (fixes 5 API errors seen in v3.2.0 fresh fetch)
  - Console shows `⏳ Retry X/3 after Ys...` during retry attempts
  - Only marks as failed after all retries exhausted
  - Expected improvement: 99.79% → 99.95%+ success rate

- [x] **Comprehensive statistics output**:
  - ⏱️ TIMING: phase-by-phase duration breakdown (Phase 0, Pass 1, Pass 2, Merge, Manifest)
  - 🔄 API RELIABILITY: retry histogram showing % of calls succeeding on first try vs. requiring retries
  - 📊 FETCH RESULTS: total fetched, non-books filtered, books kept
  - 📝 ENRICHMENT RESULTS: success rate with list of failed books after retries
  - ⚠️ DATA QUALITY NOTES: books without descriptions, authors, AI summaries used
  - 💾 FILES SAVED: confirmation of output files
  - Statistics shown even when no new books found (validation-only mode)

- [x] **Non-book item filter**:
  - Automatically excludes non-book items during Pass 1 (DVDs, Audio CDs, CD-ROMs, Maps, Shoes, Product Bundles, Misc.)
  - Only includes: Kindle Edition, Paperback, Hardcover, Mass Market Paperback, Board book, Unknown Binding, Audible Audiobook, Library Binding
  - Console shows `⏭️  Skipping non-book: [title] ([binding])` when item filtered
  - Statistics show how many non-books filtered with examples
  - Removes 12 non-book items from future fetches

- [x] **Early exit bug fix**:
  - Fixed bug where statistics were not shown when library is up-to-date
  - Now shows validation timing, API reliability, and library status even with no new books

- [x] **Backward compatibility code cleanup**:
  - Removed temporary schema v2.0 → v3.0.0 migration code (lines 221-234)
  - Codebase now only supports schema v3.0.0+
  - Simplified and cleaner implementation

## Fetcher Improvements - Other

- [x] **Add timing information to fetcher output**: ✅ COMPLETED in v3.3.0
  - Track start time for each phase (Phase 0, Pass 1, Pass 2, Merge, Manifest)
  - Comprehensive timing breakdown in final statistics output
  - Shows phase-by-phase duration with formatted times (e.g., "1h 23m 45s")
  - Helps users understand performance and estimate future fetches

- [ ] **Distribution: GitHub Pages + Bookmarklets**
  - **Goal**: Make Amazon Book Organizer easy for others to use
  - **Documentation**: See [DISTRIBUTION.md](DISTRIBUTION.md) for complete guide
  - **Summary**:
    - Host organizer app on GitHub Pages (free, HTTPS, auto-deploy)
    - Provide bookmarklet that loads fetcher scripts from GitHub Pages
    - Users: One-click bookmark → fetch → organize
    - Zero installation, always latest version, data stays local
  - **Approaches Documented**:
    1. GitHub Pages + Bookmarklet (recommended for end users)
    2. GitHub Gist + Bookmarklet (alternative)
    3. Local HTTP Server (development only)
  - **See DISTRIBUTION.md for**:
    - GitHub Pages setup instructions
    - Bookmarklet code templates
    - User workflow documentation
    - Deployment checklist
    - Custom domain setup (optional)

- [ ] Remove 30-second timeout from file selection
- [ ] Improve "WORKING DIRECTORY" messaging throughout
- [ ] Match opening/closing dialog terminology

## Development Process Improvements

- [ ] Consider adding "grep for TODO comments in code files" to release procedure in ground rules
  - Review all in-code TODOs before finalizing release
  - Ensures temporary code doesn't become permanent

## Features - Approved

- [ ] **Phase 3 Retry Logic** (v3.4.0) - Progressive data completeness improvement
  - **Goal**: Retry books with missing review data using same API configuration (Amazon backend issues are random/intermittent)
  - **When**: After Phase 2 enrichment completes (fresh fetch) OR when user refreshes existing library
  - **How**:
    1. Scan library for books with `reviewCount > 0` but `topReviews.length === 0`
    2. Retry using SAME configuration (`getProducts + your-books`):
       - Wait 5-10 minutes after initial fetch (allow Amazon backend state to change)
       - Retry same ASIN up to 3 times total
       - Track retry statistics in book metadata (`reviewFetchAttempts`, `reviewFetchStatus`, `lastReviewFetchAttempt`)
    3. Merge successful review data back into library
    4. Update metadata with retry statistics
  - **Why NOT Use Alternative APIs**:
    - Test results (test-06) show ONLY `getProducts` works
    - `getProduct` (singular) and `getProductByAsin` are broken/deprecated
    - Alternative methods fail even on books that work with `getProducts`
    - See [GraphQL-API-Reference.md](GraphQL-API-Reference.md) for complete test results
  - **Benefits**:
    - Fresh fetch: Immediate retry (servers might succeed on 2nd attempt due to randomness)
    - Refresh: Progressive improvement over time (Amazon's server state changes)
    - User expectation: Loading library file should update missing data if possible
  - **Statistics**:
    - Current analysis: 31/2344 books (1.3%) missing topReviews
    - 3 books consistently fail (Cats + 2 Queens) - Amazon backend permanently broken
    - ~28 books fail intermittently - should resolve on retry
    - Expected final success rate: ~99.8% (2,341/2,344 books)
  - **Note**: Only 2 books with 500+ reviews missing data (0.1%) - not correlated with review count

- [ ] **Tooltips for control buttons** - Add helpful tooltips for Backup, Restore, Reset, Clear Everything buttons explaining what each does
- [ ] **First-run Welcome dialog** - Show welcome dialog on first run (or after Clear Everything) that:
  - Explains what Amazon Book Organizer is and why it exists
  - Points to the help icon ("?") for detailed usage instructions
  - Dismisses permanently (or until next clear)
  - Should run only once per fresh start
- [ ] Column name filtering - Extend search to filter by column names (anticipating 100s of columns with 2336 books)
  - **Approach to try first**: Simple case - search filters title, author, AND column name simultaneously
  - **Fallback options if simple case is confusing**:
    - Option #2: Prefix syntax (e.g., `column:sci-fi`, `author:smith`) - no UI chrome, power user friendly
    - Option #4: Smart filtering - if search matches column name exactly, prioritize that column
- [ ] Add title & author text under book covers (~5-8K tokens)
- [ ] Multi-select with Ctrl/Shift clicking (~15-25K tokens)

## Features - Optional/Maybe

- [ ] Explore read.amazon.com/kindle-library - Collections info & reading progress
- [ ] **Reading Progress tracking for each book** (Medium-Low priority, High difficulty)
  - Show reading progress percentage/position for each book
  - Implementation guidance: [Amazon Organizer Reading Progress conversation](https://claude.ai/chat/6e6f23c8-b84e-4900-8c64-fecb6a6e0bd1)
- [ ] Live reflow drag-and-drop animation (~12-18K tokens)
- [ ] 2D matrix layout (~50-80K tokens) - major refactor
- [ ] Groups/series containers (~35-55K tokens)
