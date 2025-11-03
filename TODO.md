# TODO

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

## Collections Integration - IN PROGRESS

- [x] Build collections fetcher script (collections-fetcher.js v1.0.0)
- [x] Test collections fetcher (successfully fetched 2,280 books in 3m 56s)
- [x] Generate amazon-collections.json with all collection data
- [x] HTML refactor complete (v3.2.0) - modular structure ready for integration
- [x] Merge v3.2.0 refactor to main
- [x] Pull refactored main into feature-collection-read-status-exploration
- [x] Load and merge collections data with library data in organizer
- [ ] Add visual indicators (badges/icons) for collections on book covers
- [ ] Add metadata display showing which collections each book belongs to
- [ ] Add filtering by collection name
- [ ] Add filtering by read status (READ/UNREAD/UNKNOWN)
- [ ] Implement "Uncollected" pseudo-collection (books with no collections)

## Bugs - High Priority

- [x] **Description fetching is broken** - FIXED in v3.1.2 - Description extraction now works correctly

## Collections & Read Status Feature - In Progress

**Status**: POC validated, ready for full fetcher development
**Branch**: `feature-collection-read-status-exploration`

- [x] Network traffic capture and API discovery
- [x] Technical specification document created
- [x] Build POC script (fetch 2 pages, validate data)
- [x] Build full collections-fetcher.js with pagination and rate limiting
- [x] Test collections fetcher with full library ✅ **COMPLETE - 2280/2280 books in 3m 56s**
- [ ] **REFACTOR: Split HTML into separate CSS/JS files BEFORE integration**
  - `amazon-organizer.html` - Minimal shell
  - `organizer.css` - All styles
  - `organizer.js` - Main React app
  - Reason: Clean separation before adding significant HTML changes for collection merge/filtering
- [ ] Integrate collections data into organizer (merge by ASIN)
- [ ] Add filtering UI for collections and read status
- [ ] Add visual indicators (badges) for read status and collections
- [ ] Release collections feature

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

## Fetcher Improvements - Phase 2.5 (Description Investigation)

**Goal**: Investigate why some books lack descriptions and explore alternative extraction methods

**Status**: NEXT - Creating investigation script

- [ ] **Create throwaway investigation script**:
  - Load library JSON to get ASINs of books without descriptions
  - Iteratively fetch those books using enrichBook API
  - Log full response structure to console
  - Identify where description data might be located in response
  - Document findings for potential extraction improvements

**Purpose**: Understand if descriptions exist elsewhere in API response or if books genuinely lack descriptions in Amazon's database

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

## Fetcher Improvements - Other

- [ ] Remove 30-second timeout from file selection
- [ ] Improve "WORKING DIRECTORY" messaging throughout
- [ ] Match opening/closing dialog terminology
- [ ] **BEFORE RELEASE v3.1.3**: Remove temporary schema v2.0 backward compatibility code from library-fetcher.js (search for "TODO: REMOVE BEFORE RELEASE")

## Development Process Improvements

- [ ] Consider adding "grep for TODO comments in code files" to release procedure in ground rules
  - Review all in-code TODOs before finalizing release
  - Ensures temporary code doesn't become permanent

## Features - Approved

- [ ] Column name filtering - Extend search to filter by column names (anticipating 100s of columns with 2336 books)
  - **Approach to try first**: Simple case - search filters title, author, AND column name simultaneously
  - **Fallback options if simple case is confusing**:
    - Option #2: Prefix syntax (e.g., `column:sci-fi`, `author:smith`) - no UI chrome, power user friendly
    - Option #4: Smart filtering - if search matches column name exactly, prioritize that column
- [ ] Add title & author text under book covers (~5-8K tokens)
- [ ] Multi-select with Ctrl/Shift clicking (~15-25K tokens)

## Features - Optional/Maybe

- [ ] Explore read.amazon.com/kindle-library - Collections info & reading progress
- [ ] Live reflow drag-and-drop animation (~12-18K tokens)
- [ ] 2D matrix layout (~50-80K tokens) - major refactor
- [ ] Groups/series containers (~35-55K tokens)
