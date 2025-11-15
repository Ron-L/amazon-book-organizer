# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- **Landing Page (index.html)** - Professional landing page for custom domain (readerwrangler.com)
  - Hero section with tagline "Wrangle your reader chaos - Your books, your order"
  - Problem/solution narrative from README
  - Feature highlights (Library Management, Organization, Privacy)
  - Two CTAs: "Get Started" → install-bookmarklet.html, "Launch App" → readerwrangler.html
  - SEO meta tags and responsive design
  - Will auto-serve when users browse to readerwrangler.com

### Changed
- **Collections Fetcher Progress Message** (amazon-collections-fetcher.js v1.0.2.b)
  - Updated time estimate based on real-world data
  - Old: "~1 hour per 1000 books"
  - New: "~1½ minutes per 1000 books"
  - Based on actual fetch: 2287 books in 3:54 (102 seconds per 1000)
  - User-tested and confirmed accurate

### Improved
- **Dialog UX Improvements** - Added X buttons and localhost testing support
  - **Bookmarklet Loader** (v1.0.2.a)
    - Added X button to upper-right corner of intro dialog
    - Added localhost detection for development testing
    - Automatically loads from http://localhost:8000/ when testing locally
    - Falls back to GitHub Pages (production) when on Amazon
  - **Collections Fetcher** (v1.0.2.b)
    - Added X button to all dialog states (progress, complete, error)
    - Removed "🔄 Refresh page to cancel" from dialogs (kept in console output)
    - Consistent close affordance across all states
  - **Library Fetcher** (v3.3.3.a)
    - Added X button to all dialog states (progress, complete, error)
    - Removed "🔄 Refresh page to cancel" from dialogs (kept in console output)
    - Consistent close affordance across all states

## [3.5.0] - 2025-11-14

### Changed
- **Project Renamed to ReaderWrangler** - Rebranded from "Amazon Book Organizer" to "ReaderWrangler" to better reflect multi-platform vision and avoid trademark issues
  - Updated product name throughout UI, documentation, and code
  - **File Renames**:
    - `amazon-organizer.html` → `readerwrangler.html` (main app)
    - `amazon-organizer.js` → `readerwrangler.js` (generic organizer UI)
    - `amazon-organizer.css` → `readerwrangler.css` (generic styles)
    - `library-fetcher.js` → `amazon-library-fetcher.js` (Amazon-specific fetcher)
    - `collections-fetcher.js` → `amazon-collections-fetcher.js` (Amazon-specific fetcher)
    - `amazon-book-organizer.code-workspace` → `readerwrangler.code-workspace`
    - `SKILL-Amazon-Book-Organizer.md` → `SKILL-ReaderWrangler.md`
  - Updated all GitHub Pages URLs: `amazon-book-organizer` → `readerwrangler`
  - Generalized product descriptions: "Amazon library" → "ebook library"
  - Updated backup filename: `amazon-book-backup-*.json` → `readerwrangler-backup-*.json`
  - Updated React component name: `AmazonBookOrganizer` → `ReaderWrangler`
  - Kept Amazon-specific references where appropriate (data files, CDN URLs, Amazon trademark notices)
  - Updated versions:
    - Main app files: v3.5.0 (readerwrangler.html, readerwrangler.js, readerwrangler.css)
    - Distribution tools: v1.0.1 (bookmarklet-loader.js, install-bookmarklet.html)
    - Amazon fetchers: No version change (amazon-library-fetcher.js v3.3.2, amazon-collections-fetcher.js v1.0.0)

### Added
- **Store field** - Added `store: "Amazon"` field to all book records to prepare for future multi-platform support (Barnes & Noble, etc.)
  - Data structure enhancement for future integration of multiple ebook stores
  - Currently hardcoded to "Amazon" in all existing book processing

### Technical Notes
- Storage keys renamed to avoid conflicts: `amazon-book-organizer-state` → `readerwrangler-state`, `AmazonBookDB` → `ReaderWranglerDB`
- Historical references in CHANGELOG, NOTES, and TODO kept as-is per ground rules
- README already updated in previous session with generalized product messaging

### Distribution Tools

#### [bookmarklet-loader.js v1.0.0] - 2025-11-13
- Smart bookmarklet loader with intro dialog and page detection
- Detects current Amazon page (library, collections, or other)
- Offers appropriate actions based on page type
- Navigation to library or collections pages with reminder alerts
- Loads library-fetcher.js or collections-fetcher.js on demand
- Version display in dialog footer

#### [install-bookmarklet.html v1.0.0] - 2025-11-13
- Drag-and-drop bookmarklet installer page
- Installation instructions for Chrome/Edge/Firefox
- Links to Amazon library and collections pages
- Privacy note explaining browser-only processing
- Version display at bottom

## [3.4.0] - 2025-11-12

### Added
- **Multi-Select with Ctrl/Shift** - Standard file-manager style multi-select (amazon-organizer.js v3.4.0)
  - **Single-click**: Select book (replaces selection, shows blue outline + checkmark)
  - **Ctrl+Click**: Toggle selection (add/remove from multi-select)
  - **Shift+Click**: Range selection from last clicked book (within same column)
  - **Double-click**: Open book detail modal
  - **Visual feedback**: Blue outline, checkmark badge, selection count indicator
  - **Bulk drag-and-drop**: Drag any selected book to move all selected books together
  - **Stacked drag ghost**: Visual indication showing multiple books being dragged with count badge
  - **Right-click context menu**: Quick bulk move to other columns
  - **ESC key**: Clear selection
  - **Click empty space**: Clear selection
  - **Selection count indicator**: Fixed bottom-right showing "{N} books selected" with Clear button
  - **INTERACTION CHANGE**: Modal now opens on double-click instead of single-click for standard UX
  - **CSS**: Added `.book-clickable.selected` styles (amazon-organizer.css)

### Technical Notes
- Modified `handleMouseDown` to skip drag initiation when modifier keys pressed
- Fixed `selectBookRange` to correctly compare book IDs (was comparing objects)
- Range selection scoped to same column only (per design requirements)
- Selection state persists during filtering/searching
- Created checkpoint tag `checkpoint-pre-double-click` before implementing Option 3

## [3.3.2] - 2025-11-11

**Full post-mortem analysis:** [post-mortems/v3.3.2-2025-11-11.md](post-mortems/v3.3.2-2025-11-11.md)

### Fixed
- **Clear Library Feature** - Complete app reset now works correctly (amazon-organizer.js v3.3.2)
  - **REPLACED**: Complex "Clear Everything" dialog (with checkboxes) replaced with simple "Clear Library" button
  - **BASED ON**: Proven v3.2.1 clearEverything pattern (avoided reinventing, copied working code)
  - **BEHAVIOR**: Single button performs complete reset - unloads library, removes columns, clears organization, resets to pristine state
  - **UX**: Simple confirm() dialog with clear explanation of what will be cleared
  - **TESTED**: User confirmed "works exactly as expected!"
  - **LESSON**: When struggling with complex approach, look back at previous working versions

- **Partial GraphQL Errors** - Enrichment now handles partial errors correctly (library-fetcher.js v3.3.2)
  - **PROBLEM**: 3/2666 books failed during fetch with "Customer Id or Marketplace Id is invalid" error
  - **ROOT CAUSE**: Amazon's GraphQL API returns BOTH `data` (valid description) AND `errors` (customerReviewsTop failed) in same response
  - **OLD BEHAVIOR**: Rejected entire response if any errors present, discarding valid description data
  - **NEW BEHAVIOR**: Checks if product data exists despite errors, continues extraction if data present
  - **VALIDATION**: Overnight fetch successful - all 3 problem books now have descriptions
  - **IMPACT**: 5 books had partial errors during validation fetch, all recovered successfully
  - **STATISTICS**: Added comprehensive tracking for partial errors (position, title, ASIN, error details)
  - **LOGGING**: Enhanced error logging with raw response dumps for future debugging

### Improved
- **Load Library Instructions** - Better guidance for first-time users (amazon-organizer.js v3.3.2)
  - **CLARIFIED**: "If you haven't already" makes it clear fetcher script is optional when just resetting
  - **ADDED**: File location detail (Downloads folder) with instruction to move to project folder
  - **ADDED**: README reference for complete fetcher instructions
  - **TODO ADDED**: In-code comment about updating for GitHub Pages bookmarklet deployment

### Changed
- **Library Fetcher v3.3.2.b**: Statistics tracking for partial errors
  - **ADDED: Partial error tracking** - comprehensive statistics for books with partial errors
    - New stat: `stats.partialErrorBooks` array tracks all books that had partial errors
    - Each entry includes: position, title, ASIN, error message, and error path
    - Displayed in final summary before "DATA QUALITY NOTES" section
    - Shows complete list with full details for debugging and monitoring
  - **IMPROVED: Final summary reporting** - distinguishes partial errors from total failures
    - New section: "⚠️ PARTIAL ERRORS (Got data anyway)" shows all books that had errors but still got data
    - Helps user understand which books had issues during enrichment but were still successfully processed
    - Provides visibility into API behavior patterns (e.g., customerReviewsTop failures)

- **Library Fetcher v3.3.2.a**: Partial error handling for GraphQL responses
  - **FIXED: Enrichment failures** - now handles partial GraphQL errors correctly
    - GraphQL can return BOTH `data` AND `errors` in the same response (partial errors)
    - Previous behavior: Rejected entire response if any errors present, discarding valid description data
    - New behavior: Checks if product data exists despite errors, continues extraction if present
    - Only fails if errors present AND no data returned (total failure)
  - **IMPROVED: Error logging** - comprehensive debugging information
    - Logs error message, error path, and raw error details for partial errors
    - Dumps full raw response for all error paths (total failures, no data, HTTP errors)
    - Future issues can be diagnosed immediately from console logs
  - **IMPACT**: Fixes 3 books that were failing during full library fetch:
    - "99 Reasons to Hate Cats" (ASIN B0085HN8N6)
    - "Queen's Ransom" (ASIN 0684862670)
    - "To Ruin A Queen" (ASIN 0684862689)
  - These books return valid descriptions but have `customerReviewsTop` errors
  - Root cause: Amazon's API returns "Customer Id or Marketplace Id is invalid" for review field under certain cumulative load conditions
  - See NOTES.md Test 14 for detailed investigation findings

### Added
- **Schema v3.0.0 Support**: Organizer now handles new library JSON format with metadata
  - Validates incoming JSON structure (`{metadata, books}`)
  - Extracts and logs metadata information (schema version, total books, fetch date, etc.)
  - Displays books without descriptions count from metadata
  - No backward compatibility - requires library-fetcher.js v3.1.3+ to generate schema v3.0.0 files

### Changed
- **Library Fetcher v3.3.0**: Reliability, data quality, and comprehensive statistics
  - **NEW: Retry logic with exponential backoff** - automatically retries ALL API requests
    - Applied to Phase 0 validation (library + enrichment tests)
    - Applied to Pass 1 library page fetching
    - Applied to Pass 2 individual book enrichment
    - Retries up to 3 times with 5s, 10s, 20s delays between attempts
    - Prevents data loss from temporary network issues
    - Console shows `⏳ Retry X/3 after Ys...` during retry attempts
    - Only marks as failed after all retries exhausted
  - **NEW: Comprehensive statistics output** - detailed summary of fetch session
    - ⏱️ TIMING: phase-by-phase duration breakdown (Phase 0, Pass 1, Pass 2, Merge, Manifest)
    - 🔄 API RELIABILITY: retry histogram showing % of calls succeeding on first try vs. requiring retries
    - 📊 FETCH RESULTS: total fetched, non-books filtered, books kept
    - 📝 ENRICHMENT RESULTS: success rate with list of failed books after retries
    - ⚠️ DATA QUALITY NOTES: books without descriptions, authors, AI summaries used
    - 💾 FILES SAVED: confirmation of output files
    - Statistics shown even when no new books found (validation-only mode)
  - **NEW: Non-book item filter** - automatically excludes non-book items from library
    - Filters out: DVDs, Audio CDs, CD-ROMs, Maps, Shoes, Product Bundles, Misc.
    - Only includes: Kindle Edition, Paperback, Hardcover, Mass Market Paperback, Board book, Unknown Binding, Audible Audiobook, Library Binding
    - Console shows `⏭️  Skipping non-book: [title] ([binding])` when item filtered
    - Statistics show how many non-books filtered with examples
  - **FIXED: Early exit bug** - statistics now shown even when library is up-to-date
    - Previously: script exited immediately when no new books found, showing no statistics
    - Now: shows validation timing, API reliability, and library status even with no new books
  - **REMOVED: Backward compatibility code** - cleaned up temporary schema v2.0 → v3.0.0 migration code
    - Code was marked for removal after fresh fetch validates v3.0.0 schema
    - Removed lines 221-234 (schema v2.0 array format handling)
    - Simplified codebase now only supports schema v3.0.0+

- **Library Fetcher v3.2.0**: Comprehensive description extraction improvements (99.9% coverage)
  - **NEW: Recursive fragment extraction** - handles arbitrarily deep nesting (4+ levels)
  - **NEW: AI summaries fallback** - uses `auxiliaryStoreRecommendations` when traditional description missing
  - **IMPROVED: Description extraction** - added `extractTextFromFragments()` recursive function
  - Updated GraphQL queries in Phase 0 and Pass 2 to fetch AI summaries
  - Console shows `📝 Using AI summary (X chars)` when fallback is used
  - Expected description coverage: ~99.9% (only books genuinely lacking descriptions will be empty)
  - See DESCRIPTION-RECOVERY-SUMMARY.md for complete investigation details

- **Collections Fetcher v1.0.1.a**: Added named function wrapper for reusability
  - Script can now be re-run with `fetchAmazonCollections()` without re-pasting
  - Improved UX for users who need to refresh collections data

### Fixed
- **Description Recovery**: Recovered 1,526 out of 1,528 missing descriptions (99.91%)
  - Traditional descriptions: 1,517 recovered (paragraph wrappers, nested semanticContent)
  - AI summaries: 7 recovered (auxiliaryStoreRecommendations field)
  - Recursive extractions: 2 recovered (deep nested fragments)
  - Only 2 books genuinely lack descriptions on Amazon
- **API Error Resilience**: Fresh fetch with v3.2.0 had 5 API errors (0.21% error rate)
  - v3.3.0 retry logic should reduce this to near-zero failed requests
  - Improves from 99.79% success rate to expected 99.95%+ success rate

### Technical
- JavaScript version 3.3.0.a (organizer)
- Library Fetcher version 3.3.0
- Collections Fetcher version 1.0.1.a
- Schema version 3.0.0

## [3.2.1] - 2025-11-01

### Fixed
- **Book Dialog UX**: Replaced misleading "Fetch Description & Reviews" button with honest "Description not available" message
  - Changed from blue action button to yellow warning indicator
  - Updated message from "Description not loaded yet" to "Description not available"
  - Added explanation: may not be in Amazon's database or wasn't captured during fetch
  - Removed dead `fetchBookDescription()` function (28 lines)
  - Net: -34 lines, cleaner and more honest code

### Technical
- JavaScript version 3.2.1
- Rationale: Descriptions should be fetched by library-fetcher.js script, not in the UI
- The organizer is a viewer/organizer, not a data fetcher
- Honest messaging prevents user confusion and sets correct expectations

## [3.2.0] - 2025-10-19

### Changed
- **HTML Refactoring**: Split monolithic HTML file into modular structure
  - Extracted CSS to `amazon-organizer.css` (97 lines)
  - Extracted JavaScript to `amazon-organizer.js` (1,916 lines)
  - HTML reduced from 2,032 lines to 17 lines (99% reduction)
  - Improved maintainability and code organization
- **Version Management**: Enhanced version tracking and cache busting
  - Added HTML version comment for easy identification
  - Implemented query string cache busting (`?v=3.2.0`) for CSS/JS resources
  - Added version comments to CSS and JS files
  - Added footer version display (bottom-right corner) for easy verification
  - Version now displayed in: tab title, page header, and footer
- **Git Pre-Commit Hook**: Automated SKILL zip file rebuilding
  - Hook automatically detects SKILL-*.md changes on commit
  - Rebuilds corresponding .zip files using PowerShell
  - Eliminates manual rebuild steps and prevents forgetting

### Technical
- HTML shell version 3.2.0
- JavaScript version 3.2.0
- CSS version 3.2.0
- Feature branch: feature-html-refactor
- All functional behavior unchanged (refactoring only)

### Technical Notes

**HTML Refactoring Rationale**:
- Preparation for collections integration feature
- Large monolithic file becoming difficult to navigate and maintain
- Separation allows independent versioning of HTML structure, styles, and logic
- Query string versioning forces browser cache refresh when files change

**Version Display Strategy**:
- Tab title: Standard web app pattern (Amazon Book Organizer v3.2.0)
- Page header: Compact display with freshness indicator
- Footer: Small, unobtrusive corner display for quick dev verification
- HTML version comment: View source shows deployment version
- Query strings: Ensure browser loads correct CSS/JS versions

**Git Pre-Commit Hook Implementation**:
- Located at `.git/hooks/pre-commit` (repository-local, not tracked)
- Detects staged SKILL-*.md files via `git diff --cached`
- Executes PowerShell build commands for each changed file
- Provides friendly output during commit process
- Falls back to manual build scripts if hook not present (e.g., fresh clone)

**File Versions After Refactor**:
- HTML, CSS, JS all start at v3.2.0 (reflects history as part of HTML since v3.0.0+)
- Each can now evolve independently
- README.md project version remains source of truth for git tags

## [3.1.2] - 2025-10-18

### Changed
- **Improved Error Messages**: Console fetcher Phase 0 validation now provides actionable recovery steps
  - Authentication failures now include specific instructions (e.g., "Refresh the page and try again")
  - Session expiration guidance more clear and actionable
  - Each error condition includes next steps for user to resolve

### Technical
- Console fetcher version 3.1.2
- Feature branch: feature-improve-error-messages
- Changes only affect error message display, no functional changes to API logic

### Technical Notes

**Error Message Improvements**:
- User concern: What happens if auth tokens/cookies expire during fetching?
- Investigation: Tokens pulled dynamically each run, cookies sent via `credentials: 'include'`
- Current state: Phase 0 mentions session expiration but doesn't provide clear recovery steps
- Solution: Added actionable recovery instructions to each error scenario:
  - "Log in and try again"
  - "Refresh the page and try again"
  - "Report this issue"
  - "Check your connection"
- Result: Users now have clear next steps when authentication fails

## [3.1.1] - 2025-10-17

### Added
- **Column Rename Discoverability**: Pencil icon (✏️) now appears on hover over column names
  - Indicates that column names are editable
  - Fades in smoothly with 0.2s transition
  - Works alongside existing double-click rename feature
  - Addresses user confusion about how to rename columns

### Changed
- Enhanced column header UI with hover state for better editability indication

### Technical
- HTML interface version 3.1.1
- Feature branch: feature-column-rename-trigger
- Double-click rename functionality was already present but lacked discoverability

### Technical Notes

**Column Rename Feature**:
- Initial report: User believed column rename feature didn't exist
- Investigation: Feature was fully implemented via double-click with tooltip
- Root cause: Lack of visual affordance - users didn't discover the feature
- Solution: Added pencil icon that appears on hover to signal editability
- Implementation: Wrapped column name in container div, added pencil span with CSS opacity transition
- Result: Feature is now discoverable without changing the double-click interaction pattern

**Process Improvements**:
- Added Session Startup Checklist to NOTES.md to ensure ground rules are reviewed
- Documented ground rule violations (version management, approval workflow) as lessons learned
- Established pattern: documentation updates don't require version increment but still need approval

## [3.1.0] - 2025-10-17

### Added
- **Dynamic Title Management**: Browser title now automatically updates from APP_VERSION constant
  - Version only needs to be updated in one place (APP_VERSION at line 106)
  - No manual title tag updates required
- **Search Improvements**: Enhanced search bar UX
  - Added magnifying glass icon (🔍)
  - Improved placeholder: "Search by title or author..."
  - Better visual hierarchy with icon spacing
- **Add Column UX Redesign**: Simplified column creation workflow
  - Click "Add Column" button creates "New Column" immediately
  - Column name enters edit mode automatically with cursor ready
  - Follows Windows File Explorer convention (like creating new folder)
  - Removed confusing "type name + click +" pattern
- **Claude Skills Infrastructure**: Established AI assistant development workflow
  - Created SKILL-Development-Ground-Rules.md (global development practices)
  - Created SKILL-Amazon-Book-Organizer.md (project-specific context)
  - Build scripts (build-skill-*.bat) to generate Skills zip files
  - Documentation in README for Skills management
- **Session Continuity**: NOTES.md file for tracking tabled discussion items
  - Maintains context across Claude sessions
  - Tracks work in progress, tabled items, and open questions
  - Always committed with changes for backup

### Changed
- **Project Version Management**: README.md now source of truth for git tags
  - Individual code files can have their own internal versions
  - Git tags match README.md project version
  - Prevents version conflicts when updating different files
- **Documentation Updates**: Comprehensive README improvements
  - Added local HTTP server setup instructions (CORS requirement)
  - Documented Claude Skills workflow and enablement process
  - Added NOTES.md to key documents list
  - Clarified version management strategy

### Technical
- HTML interface version 3.1.0.c
- Feature branch: feature-ux-improvements
- Project version tracked in README.md

### Technical Notes

**Dynamic Title Management**:
- Initial concern: Version appeared in two places (title tag + APP_VERSION constant)
- Solution: Use JavaScript to set document.title dynamically from APP_VERSION
- Result: Single source of truth for version in code

**Add Column UX**:
- Old pattern: User types name in input field, then clicks + button
- Problem: Not intuitive, required two-step process
- New pattern: Click button → creates "New Column" → enters edit mode immediately
- Implementation: Leveraged existing setEditingColumn() functionality with setTimeout
- Removed unused newColumnName state variable

**Skills Build Process**:
- Batch files cannot be run directly by Claude due to permissions
- Solution: Claude runs PowerShell commands directly to execute build process
- Build scripts kept as documentation and for manual developer use
- Skills require YAML frontmatter (name and description in lowercase-with-hyphens)

## [3.1.0] - 2025-10-16

### Added
- **Phase 0 API Validation**: Console fetcher now tests both library and enrichment APIs before fetching
  - Validates library query (ccGetCustomerLibraryBooks) with minimal request
  - Validates enrichment query (enrichBook) with sample ASIN from user's library
  - Provides detailed diagnostic messages for common failure scenarios
  - Fails fast on library API issues, warns but continues on enrichment issues
  - Reports total book count and tested ASIN on successful validation
- **Custom Status Icons**: Replaced Unicode emojis with custom PNG icons
  - busy.png: Spinning hourglass for loading state
  - empty.png: Pulsing icon for no library loaded
  - fresh.png: Lettuce icon for fresh/synced library
  - stale.png: Carrot icon for stale/needs update
  - question-mark.png: Unknown status indicator

### Changed
- Improved file save location messaging: Changed "Downloads folder" to "browser's save location" for accuracy
- **Status Icon Rendering**: Pre-load all status icons and toggle visibility with CSS for instant updates
- **Empty State Text**: Changed "Empty (No Library Loaded)" to "Click here to load library"
- **Dialog Behavior**: Status dialog now closes immediately when file picker opens
- **Grammar Fix**: Singular/plural handling for "1 new book" vs "N new books"
- **Button Labels**: "Sync Now" → "Load Updated Library" for clarity
- **Terminology Consistency**: Replaced all "sync" references with "load" terminology throughout UI
  - "Last synced" → "Library loaded"
  - "New books to sync" → "New books to load"
  - "No data loaded" → "No library loaded"

### Fixed
- Status icon display lag: Icons now update instantly when status changes
- Dialog briefly staying open after file selection
- Manifest caching issue: Added cache-busting to manifest fetch to prevent stale data
- Stale status after "Clear Everything": Now properly clears manifest data for fresh detection

### Technical
- Console fetcher version 3.1.0
- HTML interface version 3.1.0
- All status icons pre-loaded in DOM with CSS display toggling for instant visual updates

## [3.0.0] - 2025-10-16

### Changed
- **BREAKING**: Renamed project from "Kindle Library Organizer" to "Amazon Book Organizer"
- Updated all branding and naming throughout application
- Renamed storage keys (amazon-book-* prefix)
- Renamed database (AmazonBookDB)
- Renamed file references (amazon-library.json, amazon-manifest.json)

### Technical
- HTML interface version 3.0.0
- Console fetcher version 3.0.0
- Using React, Tailwind CSS, and IndexedDB

## [2.5.0] - 2025-10-16

### Added
- Initial repository setup
- Git configuration and GitHub integration
- Project documentation (README, TODO, CHANGELOG)
- MIT License

### Technical
- HTML interface version 2.5.0
- Console fetcher version 2.0.0
- Using React, Tailwind CSS, and IndexedDB
