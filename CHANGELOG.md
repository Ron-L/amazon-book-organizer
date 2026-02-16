# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [5.5.9] - 2026-02-16

### Added
- **High Contrast themes** - Two new accessibility themes: High Contrast Light (pure white/black, stronger borders, deeper accents) and High Contrast Dark (pure black backgrounds, pure white text, maximum contrast). Toggle via Help menu > Theme.

## [5.5.8] - 2026-02-15

### Fixed
- **Cover grid zoom behavior** - Covers now scale correctly with browser zoom (Ctrl+Scroll). Previously covers shrank when zooming in because the grid used a fixed column count with `1fr` units. Now uses `auto-fill` with pixel-based minimum widths so covers scale with the page like all other elements. Slider now controls cover width in pixels (60-300px) instead of column count.

## [5.5.7] - 2026-02-15

### Added
- **Dark mode** - Full dark theme with auto-detection from OS preference. Toggle via View menu > Theme (Auto/Light/Dark). 25 semantic CSS variables with light and dark palettes. All 15 modals, context menus, filter dropdowns, list/grid views, and sidebar themed.
- **Broken cover image handling** - Degenerate cover images (< 10px, failed loads) now show a styled placeholder with book title instead of broken image icons. Applies to cover grid, list view, and book detail modal.

### Improved
- **Filter dropdown UX** - Opening any filter dropdown now closes all siblings. Fixed stale closure bug preventing click-outside-to-close for More panel sub-dropdowns. Added hover feedback to Collections and Series checkbox items.
- **WCAG AA contrast** - Fixed 2 contrast ratio failures in dark mode (accent buttons, secondary text on elevated surfaces)
- **Themed dialogs** - All native alert/confirm dialogs replaced with styled custom dialogs (eliminates "localhost says" prefix)

### Fixed
- **Tags dropdown hover** - Fixed white flash on mouse leave in Tags filter dropdown items and Manage Tags link
- **Shadow typo** - Fixed `rgba(0,0,1,0.1)` → `rgba(0,0,0,0.1)` in date dropdown shadow

## [5.5.6] - 2026-02-15

### Improved
- **Backup restore UX** - Skip "replace organization" warning when system is empty (after reset or first-time users)

## [5.5.5] - 2026-02-15

### Added
- **Landing page link** - Logo and app name in the menu bar now link back to the landing page

## [5.5.4] - 2026-02-14

### Fixed
- **Drag-to-folder stuck clicks** - Dragging a book to a sidebar folder no longer leaves the right pane unclickable (source row unmount prevented dragEnd cleanup)
- **Within-folder reorder broken** - Removed pointer-events:none optimization that blocked reorder drop targets

### Improved
- **Drag performance with large libraries** - Drag virtualization hides off-screen book rows during drag, with a sliding window (100-row buffer, shifts 50 at a time) that follows scrolling. Reduces browser DOM overhead from 10K elements to ~300
- **Render cap** - Show first 200 items instantly with "Show all" button for the rest. Resets on navigation changes (sort/filter/folder switch)
- **CSS containment** - Paint isolation between left and right panes eliminates sidebar highlight lag during drag
- **Auto-expand guard** - Disabled auto-expand of collapsed folders during drag when Show All is active with many items

## [5.5.3] - 2026-02-13

### Added
- **Welcome state** for empty library - centered panel in right pane with two clear paths:
  - "Getting Started Guide" button for new users (opens landing page)
  - "Load Library File" button for returning users (opens file picker directly)
  - Disappears automatically when library is imported

## [5.5.2] - 2026-02-13

### Added
- **Getting Started link** in Help menu - opens landing page (readerwrangler.com) in new tab for users who need onboarding context

## [5.5.1] - 2026-02-13

### Improved
- **Tooltip audit** - Comprehensive tooltip coverage across the app
  - Added tooltips to all 7 toolbar filter buttons (Status, Tags, Types, More, Amazon Rating, My Rating, Series)
  - Added "Close" tooltip to all 11 modal close buttons
  - Added tooltips to search clear button and Add tag button
  - Improved cover size slider tooltip ("Cover size: X columns")
  - Improved clear rating tooltip ("Clear my rating")

## [5.5.0] - 2026-02-13

### Added
- **Sort picker dropdown** - Click "Sort: Author ▲ ▾" to open a dropdown with all sortable columns
  - Works in both cover view and list view
  - Click a column to sort by it; click current sort to toggle direction
  - Shift+click to add secondary sort (hint shown in dropdown footer)
  - "Manual Order" grayed out when viewing All Books
  - Dropdown caret (▾) signals clickability
- **Bug fix**: "My Rating" sort now displays correctly (was showing raw key name "myRating")

## [5.4.9] - 2026-02-12

### Added
- **Search history dropdown** - Search field remembers recent searches (up to 15)
  - Type to filter history, arrow keys to navigate, Enter to select
  - Per-entry remove (×) and "Clear history" option
  - Persists across sessions via localStorage
  - Terms under 3 characters are not recorded

## [5.4.8] - 2026-02-12

### Added
- **Ownership toggle** - Change book ownership between Purchased and Wishlist
  - Book dialog: Click pencil icon to edit, dropdown replaces the Wishlist Item badge
  - Bulk edit: Right-click → Edit ▶ Ownership... with Purchased/Wishlist toggle buttons
  - Changes protected from Amazon re-import overwrite via `userEdited` flags
  - Full undo/redo support

## [5.4.7] - 2026-02-12

### Added
- **Book dialog edit mode** - Click pencil icon in book dialog header to edit Title, Author, Series, Position, and Notes inline
  - ESC cancels edit mode without closing dialog; Enter saves when no field is focused
  - Series field uses combobox with dropdown of existing series (prefix filtering)
  - Layered ESC dismissal: series dropdown → series input → cancel edit mode
  - Undo/redo support for all edits
  - Replaces the standalone Edit Series modal and standalone note editing
- **Bulk edit via context menu** - Right-click selected books → Edit ▶ Author... / Series... / Position...
  - Each opens a focused modal with a single field
  - Pre-populates if all selected books share the same value; "Mixed (N values)" placeholder if different
  - Series uses combobox with dropdown (matching book dialog pattern)
  - Undo/redo support as single action per bulk edit
  - Works in both table and cover views
- **User edit protection on import** - Per-field `userEdited` flags track which fields the user has manually edited
  - Amazon re-imports preserve user-edited Title, Author, Series, and Position
  - Backup export/import preserves the flags for future Amazon imports
  - Backup restore uses its own values as-is (true snapshot restore)

### Removed
- Edit Series modal (replaced by inline editing in book dialog)
- Standalone note editing (+Add Note button, note pencil icon)

## [5.4.5] - 2026-02-11

### Added
- **Group toggle in Book Explorer** - Simple on/off toggle inserts collapsible divider rows between groups of books
  - Group key always mirrors the current sort column (sort by Author → groups by author, sort by Series → groups by series, etc.)
  - Dividers appear at value transitions in sort order — change the sort and dividers update automatically
  - Works in both table view (full-width header rows) and cover view (full-width section dividers)
  - Click chevron on any group header to collapse/expand that group
  - Expand All (▾) and Collapse All (▸) buttons in toolbar when grouping is active
  - Dates bucketed by month/year, ratings shown as "N Stars", all other columns use raw values
  - Hidden when sort is Manual Order (incompatible). Switching to Manual Order auto-disables grouping.
  - Collapsed groups reset when sort column changes (group names become invalid)
  - Group state persisted to localStorage; collapsed groups are session-only
  - Tooltip on Group button shows what it will group by (e.g., "Group by Author")

## [5.4.4] - 2026-02-11

### Fixed
- **My Library not selectable** - My Library in the left pane was unclickable due to `pointer-events-none` on inner spans with no onClick on the container div
- **My Library now accepts folder drops** - Dragging a folder onto My Library in the sidebar reparents it to the top level (book drops intentionally excluded)

## [5.4.3] - 2026-02-11

### Added
- **Drag book to subfolder in right pane** - Books can now be dragged onto subfolders in both table and cover views, with visual highlight feedback, duplicate detection, and undo support
- **Ctrl+drag to copy** - Hold Ctrl while dropping on a subfolder to copy instead of move

### Fixed
- **Cover view folder selection persists** - Clicking a book in cover view now clears folder selection ring (was already working in table view)

## [5.4.2] - 2026-02-11

### Added
- **ESC closes all dialogs** - Every dialog now responds to the Escape key with layered dismissal (innermost dialog closes first)

### Fixed
- **ESC blocked by focused text inputs** - Edit Series, Bulk Price Goal, and Folder Properties inputs no longer swallow the Escape key

## [5.4.1] - 2026-02-11

### Fixed
- **Add Tag dropdown not closing on click-away** - Clicking anywhere in the book dialog outside the tag dropdown now closes it
- **Stale Add Tag dropdown** - Opening a new book dialog no longer shows a pre-opened tag dropdown from the previous dialog
- **Dead state reference** - Removed `setModalColumnId` calls left over from Column App removal

## [5.4.0] - 2026-02-11

### Removed
- **Column App (V4) backend code** - Removed ~3,100 lines of orphaned Column App code that was superseded by Book Explorer (V5) in v5.0.2
  - Column CRUD operations, divider system, column drag-drop, column context menus
  - Column-specific undo/redo actions (MOVE_BOOKS, COPY_BOOKS, REORDER_BOOKS, DELETE_COLUMN, REORDER_COLUMNS, DELETE_DIVIDER, REORDER_DIVIDER)
  - Column persistence (save/load/export/restore)
  - Collect Series dialog, column selection system, spatial indexing
  - All related state variables, refs, and helper functions

### Improved
- **Footer selection display** now uses Explorer selection (was showing Column App selection which was always empty)
- **Data Status dialog** shows folder count instead of column/divider count
- **clearSelection()** now clears Explorer book selection

## [5.3.1] - 2026-02-10

### Improved
- **Double-click to rename tags** - Double-click a tag name in Tag Management to enter rename mode (in addition to Rename button)

## [5.3.0] - 2026-02-10

### Added
- **Manage Tags in filter dropdown** - "Manage Tags..." link at the bottom of the Tags filter dropdown (separated by divider) opens the Tag Management dialog

## [5.2.0] - 2026-02-10

### Added
- **Editable Series** - Edit series name and position from book detail modal
  - Combobox with dropdown for existing series names
  - Numeric position field with validation
  - "Remove from Series" clears fields without auto-save

### Fixed
- **Global keyboard handler leak** - DEL key in modal input fields no longer triggers book deletion or folder removal
  - Added `anyModalOpenRef` guard to both `handleKeyDown` and `handleKeyboard` window listeners
  - Added `isInputFocused` guard for DEL/arrow keys when any input/textarea has focus
  - Added `e.stopPropagation()` to 8 input fields missing protection
- **Backdrop swipe-close** - Dragging from inside a modal and releasing on the backdrop no longer closes the dialog
  - All 17 modal backdrops now require both mousedown and click on the backdrop to close
- **DEL key on Edit Series chevron** no longer triggers folder deletion
- Removed 69 verbose undo/redo debug console.log statements

## [5.1.0] - 2026-02-09

### Added
- **Auto-Organize Wizard** - Automated folder organization by author and series
  - Magic wand icon (🪄) in Folders header triggers wizard
  - Analyzes books in Inbox, groups by author with configurable minimum books threshold (1-20)
  - Detects and counts series from book metadata (series name and position)
  - Creates hierarchical folder structure: Author → Series → Books
  - **Series subfolder options:**
    - Create subfolders for each series (2+ books)
    - Sort books by series position (with dateAdded fallback)
    - Create "Miscellaneous" subfolder for standalone books
  - **Preview mode** - Visualize folder structure before organizing
    - Shows full hierarchy: Author folders → Series subfolders → Book counts
    - Summary counts: total folders, subfolders, books to be moved
    - "Organize Now" executes organization from preview
  - **Results summary dialog** - Shows what was created after organization
    - Displays: folders created, folders merged, subfolders created, books moved
  - **Smart selection controls:**
    - Sort authors by book count (default) or alphabetically
    - 3-segment selection: All / Some / None
    - Individual author checkboxes with book count and series count
  - **Bundled undo** - Single Ctrl+Z undoes entire organization operation
  - **Edge case handling:**
    - Empty Inbox detection with helpful message
    - No authors meeting threshold guidance
    - Automatic folder merging when author folders already exist
    - Invalid series position fallback to date sorting
  - **Help dialog** - Workflow tips and best practices
  - Moves organized books out of Inbox automatically
  - Options persist in localStorage across sessions

### Technical
- Phase 1 (alpha.8-19): Basic wizard with flat author folders
- Phase 2 (alpha.20-27): Series detection and subfolder creation
- Phase 3 (alpha.28-30): Preview mode, results dialog, edge case validation
- New state variables: wizardModalOpen, wizardAuthors, wizardSelectedAuthors, wizardPreviewMode, wizardResultsData, wizardSourceBooksCount
- New functions: groupBooksBySeries, calculateWizardPreview, executeWizardOrganize
- Undo system support: WIZARD_ORGANIZE action type with nested sub-actions
- Series grouping algorithm: case-insensitive normalization, position-based sorting
- Collapsed/Expand All controls moved from wizard to My Library header (UX improvement)

## [5.0.10] - 2026-02-06

### Added
- Emergency reset page (reset.html) for recovery when main app won't load
- Standalone reset functionality accessible when corrupted state blocks app initialization
- Clears all localStorage keys and IndexedDB to restore app to fresh state
- Browser-native confirm() dialog prevents accidental resets
- Success message with auto-redirect to main app after 3 seconds
- Link to reset page added to index.html footer (unintrusive, gray text)
- Clear recovery instructions explaining backup vs library file restoration paths

### Technical
- New file: reset.html - Standalone page with Tailwind CSS styling
- New file: reset.js - Reset logic (clears 7 localStorage keys + ReaderWranglerDB)
- Clears: readerwrangler-state, readerwrangler-enriched-cache, readerwrangler-settings, readerwrangler-status, readerwrangler-filters, readerwrangler-explorer, readerwrangler-folders
- IndexedDB deletion with blocked state handling (resolves when other tabs close)
- Recovery text distinguishes between importing backup (everything) vs amazon-library.json (books only)

## [5.0.9] - 2026-02-06

### Changed
- Redesigned backup restore dialog from EULA-like text to action-oriented guidance
- Dialog now appears AFTER restore completes (not before) with clear next steps
- Visual checkmarks (✓) for required actions, X marks (✗) for what NOT to do
- Three action buttons: "Why replace?" (help), "Save File", "Cancel"
- Help popup explains backup contents and dangers of skipping regeneration
- Download only triggered when user explicitly clicks "Save File"
- Updated help text: "prior data" instead of "old data" (chronologically accurate)
- Corrected help text: removed incorrect "organization will disappear" claim
- Organization description now includes "order" and "price goals" (aligns with app tagline)

### Added
- Created docs/design/BACKUP-RESTORE-FLOW.md with comprehensive data flow documentation
- Three Mermaid diagrams showing normal flow, restore flow, and account contamination danger
- Detailed explanation of storage architecture (IndexedDB vs localStorage separation)
- Account switching edge case documentation with step-by-step contamination scenario
- Added "Understanding the Codebase" section to CONTRIBUTING.md linking to architecture docs

### Technical
- New function: showBackupRestoredDialog(bookCount) returns Promise<boolean>
- Organization stored separately from book data (survives even if library file skipped)
- Danger of skipping regeneration: next fetch imports wrong books (account mixing), not data loss

## [5.0.8] - 2026-02-06

### Fixed
- Fixed folder reordering error messages in All Books and My Library for better clarity
- Enabled Manual Order mode in My Library to allow folder reordering (was incorrectly disabled, preventing folder organization)
- Fixed Reset App error "setViewMode is not defined" (removed orphaned v4 code reference)

## [5.0.7] - 2026-02-05

### Fixed
- Fixed backup import error "setWishlistFilter is not defined"
- Removed 3 remaining setWishlistFilter() calls missed in v5.0.5 cleanup
- Affects: Reset All Data, Import Backup, and Clear Filters button

## [5.0.6] - 2026-02-05

### Fixed
- Restored hidden book visual styling (lost in v5.0.0 refactoring)
- Hidden books now display with 40% opacity + centered 🚫 emoji overlay
- Works in both List view (text-2xl emoji on thumbnail) and Cover view (text-8xl emoji on full cover)
- Dual-format compatibility checks both hiddenInstances (current) and book.isHidden (legacy)

## [5.0.5] - 2026-02-05

### Changed
- Removed unused wishlistFilter code (internal cleanup)
- Removed 23 references and ~24 lines of dead code
- No behavioral changes expected - wishlistFilter UI was removed in v5.0.0, state variable never set by users

## [5.0.4] - 2026-02-05

### Added
- Added Wishlist option to Source filter dropdown (appears first in list)

### Fixed
- Fixed missing filter for wishlist books (lost in v5.0.0 menu/toolbar redesign)
- Backward compatible filtering checks both onWishlist flag and ownershipType for legacy data
- Updated DATA-SCHEMA.md to document wishlist as valid ownershipType

## [5.0.3] - 2026-02-05

### Fixed
- Fixed column overlay bug where null column widths became "nullpx" in CSS
- Enhanced column width handling to be future-proof for new columns added in future versions
- Ensured consistent sanitization pattern across load, save, export, and restore operations

## [5.0.2] - 2026-02-05

### Fixed
- Fixed production app loading v4 Column App due to localStorage persistence
- Removed viewMode entirely - app now always renders Book Explorer mode
- Deleted all v4 Column App code (~470 lines removed)
- Cleaned up viewMode references from localStorage, backup/restore, and keyboard shortcuts

## [5.0.1] - 2026-02-05

### Fixed
- Fixed app defaulting to deprecated v4 Column App on startup
- Removed migration prompt that appeared when loading production instance
- App now always starts in v5 Explorer mode
- v4 Column App code still present but inactive (full removal planned for v5.1.0)

## [5.0.0] - 2026-02-05

### Major Release: Book Explorer

**v4 → v5 Paradigm Shift:** Horizontal Columns → Windows File Explorer

ReaderWrangler v5 replaces the flat horizontal column interface with a familiar two-pane Book Explorer: folder tree (left) + content view (right). Organize your library using the same patterns you use for files on your desktop.

#### Book Explorer Features

**Folder Management:**
- Create unlimited nested folder hierarchies (Category > Author > Series)
- Right-click context menus for folders (7 operations) and books (9 operations)
- Cut/Copy/Paste with keyboard shortcuts (Ctrl+X/C/V)
- Drag-drop books and folders to organize
- Special folders: "All Books" (library-wide view), "Inbox" (new imports)
- Undo/Redo support (Ctrl+Z/Y) for all operations
- Folder properties show book counts (direct + recursive)

**List View:**
- Sortable columns: Title, Author, Rating, Series, Series #, Date Added, Pages, and more
- Multi-column sorting: Shift+Click to add secondary/tertiary sort levels (e.g., Series ▲ → # ▲)
- Column chooser: Show/hide columns, drag to reorder
- Manual sort mode for custom book ordering within folders

**Cover View:**
- Grid layout with book covers
- Same selection and organization capabilities as list view
- Toggle between List/Cover views per folder or globally

**Migration:**
- Automatic migration from v4 Columns interface
- Columns become root-level folders
- Dividers become subfolders
- All organization and book data preserved

#### Menu Bar + Toolbar (Chrome Redesign)

After implementing Book Explorer, we redesigned the header chrome to better fit the new paradigm:

**Space-Efficient Interface:**
- Menu bar (32px): File/View/Help menus with About, Keyboard Shortcuts, and How To Use dialogs
- Compact toolbar (36px): Search + integrated filters
- **68px total chrome** (down from ~100px in v4) = **32% more screen space** for books
- Removed: Hero banner, old expandable filter panel

**Advanced Filtering:**
- **Tier 1 (Toolbar):** Read Status, Tags, Source (Purchased/KU/Prime/etc.)
- **Tier 2 (More Panel):** Collections, Amazon Rating, My Rating, Series, Date ranges
- Active filter status banner with "Clear All" button
- All filters persist across sessions

**Personal Rating System:**
- Rate books 0-5 stars based on your personal opinion (separate from Amazon ratings)
- Star picker in book details dialog (blue stars vs. yellow Amazon stars)
- "My Rating" column in list view (optional, hideable)
- Sort by personal rating
- Ratings preserved in backup/restore

**Tag Management:**
- Enhanced tag system with color coding
- Computed tag counts (always accurate)
- Tag Manager dialog for organizing tags

**View Controls:**
- List/Grid view toggle in toolbar
- "Show Hidden" and "Deals" toggles with visual badges
- View menu sync (toolbar ↔ menu bar)

#### Technical

- All user metadata preserved in backup/restore (tags, notes, price triggers, ratings)
- localStorage and IndexedDB persistence
- Full keyboard shortcut support maintained
- Data migration automatic and seamless

#### Upgrade Notes

Users upgrading from v4:
- Library automatically migrates on first load (Columns → Folders)
- All books, organization, and metadata preserved
- Backup recommended before upgrade (File → Export Backup)

---

For detailed implementation history, see:
- [BOOK-EXPLORER-SESSION-LOG.md](docs/design/BOOK-EXPLORER-SESSION-LOG.md) - Folder tree implementation
- [MENUBAR-TOOLBAR-IMPLEMENTATION.md](docs/design/MENUBAR-TOOLBAR-IMPLEMENTATION.md) - Chrome redesign

## [5.0.0-alpha.174.4] - 2026-02-03

### Added
- **Book Explorer (Phase 1 Complete)** - Windows File Explorer paradigm for organizing 2500+ books
  - Folder tree sidebar with unlimited nesting depth
  - Nested folder creation via drag-and-drop
  - List view with multi-level sortable columns (shift-click for secondary sort)
  - Drag-and-drop books and folders with visual feedback
  - Breadcrumb navigation with clickable folder links
  - Context menus for books and folders (right-click)
  - Folder tooltips show full path and book count
  - Migration from Column Organizer: columns → folders, dividers → subfolders
  - Manual sort mode preserves user-defined order
  - Inbox folder for new/unsorted books
  - All Books view for library-wide operations
  - Ctrl+A select all within current folder
  - Multi-book operations: hide, move, copy, delete
  - Session log: [BOOK-EXPLORER-SESSION-LOG.md](docs/design/BOOK-EXPLORER-SESSION-LOG.md)
  - Replaces: Column Organizer, Column Carousel, Desktop & Folders designs
  - **Impact**: Scalable organization for large libraries using familiar desktop paradigm

## [4.27.0] - 2026-01-25

### Added
- **Tags** - Add tags to books and dividers for cross-library thematic organization
  - File versions: readerwrangler.js v4.27.0
  - **Explicit tags**: Assigned directly to books, persist when moved
  - **Inherited tags**: Books under tagged dividers inherit those tags positionally
  - Tag filter in filter panel (OR logic - matches any selected tag)
  - Visual distinction: explicit tags (bold blue), inherited (faded gray)
  - Autocomplete with existing tags, Enter key selects top match
  - Right-click divider → Edit Tags, Add Tags to All Books
  - Manage Tags modal: rename, delete, orphan cleanup
  - Tags persist in IndexedDB and JSON export

## [4.26.1] - 2026-01-24

### Fixed
- **Mobile URL format detection** - Navigator bookmarklet now recognizes Amazon mobile web URLs
  - File versions: bookmarklet-nav-hub.js v1.4.1
  - Added support for `/gp/aw/d/` URL pattern (mobile web product pages)
  - "Add to Wishlist" now works on links from Amazon mobile site

## [4.26.0] - 2026-01-24

### Improved
- **Show Hidden always visible** - "Show Hidden" checkbox now visible even when filter panel is collapsed
  - File versions: readerwrangler.js v4.22.0
  - Shows "Showing: X of Y" count alongside checkbox in collapsed state
  - No longer need to expand filters just to toggle hidden book visibility

## [4.25.1] - 2026-01-24

### Fixed
- **Ctrl+C/A/X in inputs and modals** - Keyboard shortcuts now work properly in input fields and modals
  - File versions: readerwrangler.js v4.21.1
  - Ctrl+C copies selected text when text is selected (was copying books instead)
  - Ctrl+A/C/X work in input fields and textareas (note editor, price goal, etc.)
  - Ctrl+A disabled when modal open to prevent selecting entire page

## [4.25.0] - 2026-01-24

### Added
- **Book Notes** - Add personal notes to any book in your library
  - File versions: readerwrangler.js v4.21.0, readerwrangler.css (new styles)
  - Double-click book → click "Add Note" → type note → Save
  - Notes display as sticky notes with yellow background and thumbtack
  - Right-click single book → "Add Note" or "Edit Note"
  - Notes persist in IndexedDB and are included in JSON export

### Changed
- **Undo/Redo disabled when modal open** - Prevents confusing undo of invisible actions

## [4.24.3] - 2026-01-24

### Fixed
- **Wishlist duplicate detection** - Wishlist fetcher now checks if book already exists before adding
  - File versions: amazon-wishlist-fetcher.js v1.4.2
  - Previously added duplicates to JSON file (App Loader deduplicated on load, but file grew)
  - Now shows "already in your library" warning if ASIN already exists

## [4.24.2] - 2026-01-24

### Fixed
- **Fetcher save errors** - Fixed same user gesture error in 3 additional fetchers
  - File versions: amazon-wishlist-fetcher.js v1.4.1, series-page-fetcher.js v1.1.1, author-bibliography-fetcher.js v1.0.1
  - Same fix as v4.24.1 applied to wishlist, series page, and author bibliography fetchers

## [4.24.1] - 2026-01-24

### Fixed
- **Library Fetcher save error** - Fixed "User activation is required" error when saving after long fetch
  - File versions: amazon-library-fetcher.js v4.8.1
  - Chrome requires fresh user gesture for file writes; original gesture expires during fetch
  - Now shows "Save Library File" button after fetch completes to provide fresh gesture
  - Prevents data loss when user navigates away during fetch

## [4.24.0] - 2026-01-24

### Added
- **Bulk Set Price Goal** - Set price goals for multiple books at once via context menu
  - File versions: readerwrangler.js v4.20.0
  - Right-click selected books → "Set Price Goal" → choose preset ($0.99-$4.99), Custom, or Clear
  - Custom option opens modal for entering any price
  - Toast feedback confirms action: "Price goal set to $X.XX for N books"
  - Clear button in single-book modal now styled consistently with presets

## [4.19.1] - 2026-01-23

### Fixed
- **Divider selection** - Fixed selection of dividers and books under dividers
  - File versions: readerwrangler.js v4.19.1
  - Clicking a divider now properly selects the divider and all books under it (visual highlight + operations work)
  - Shift+click after selecting a divider now works for range selection
  - Shift+click range selection now includes dividers in the range
  - Ctrl+A now selects all items in column including dividers
  - Root cause: v4.16.0 changed to composite keys for book selection but `selectDividerGroup` was not updated

## [4.23.0] - 2026-01-23

### Added
- **Author Bibliography Import** - One-click import of all Kindle books by an author to wishlist
  - File versions: author-bibliography-fetcher.js v1.0.0, bookmarklet-nav-hub.js v1.4.0
  - Navigate to any Amazon author "All Books" page and click "Add Bibliography to Wishlist"
  - Auto-loads all books (clicks "Show More" until complete)
  - Extracts covers, prices, ratings from page DOM
  - Skips books you already own or have on wishlist
  - Data completeness summary shows cover/price/rating stats
  - **Tip**: Set page filters to "English" and "Kindle" before importing for best results
  - Filters out Amazon navigation/footer items that could be mistakenly captured

## [4.22.0] - 2026-01-23

### Fixed
- **Wishlist price parsing** - Price data now loads correctly from JSON files
  - File versions: readerwrangler.js v4.19.0, amazon-wishlist-fetcher.js v1.4.0, series-page-fetcher.js v1.1.0
  - Fixed: Loader crashed with "toFixed is not a function" when price was string like "$5.99"
  - Added `parsePrice()` helper to convert string prices to numbers during load
  - Wishlist fetchers now capture price and description from Amazon product pages
  - Series fetcher improved price extraction with `.ebook-price-value` selector
  - Data completeness summary shows which books are missing price data

## [4.21.0] - 2026-01-22

### Added
- **Series Page Bulk Import** - One-click import of entire book series to wishlist
  - File versions: series-page-fetcher.js v1.0.0, bookmarklet-nav-hub.js v1.3.0
  - Uses Amazon's seriesAsinList API to fetch all books (up to 200) in a single request
  - Automatically skips books you already own
  - Gap detection reports missing books in series numbering (e.g., "49 books missing: #101-149")
  - Navigator automatically loads series fetcher when on a series page

## [4.20.1] - 2026-01-22

### Fixed
- **Navigator duplicate modal bug** - Clicking bookmarklet multiple times no longer opens stacked modals
  - File version: bookmarklet-nav-hub.js v1.2.3
  - Added dialog ID check to prevent duplicate creation on slow machines

## [4.20.0] - 2026-01-21

### Fixed
- **Wishlist preservation bug** - Wishlist books now display immediately after library import
  - File versions: readerwrangler.js v4.18.0, fetchers v4.8.0/v2.1.2/v1.3.0
  - Fixed: Legacy `isWishlist` field not normalized during orphan detection
  - Fixed: UI state not updated with merged books (required page refresh)

### Changed
- **Schema v2.1** - Updated schema version for new data model
  - All fetchers now output schema v2.1
  - Loaders accept any `2.x` version (forward compatible)

## [4.19.0] - 2026-01-20

### Added
- **Wishlist Persistence** - Wishlist books are preserved when importing fresh library data
  - File versions: readerwrangler.js v4.18.0, amazon-library-fetcher.js v4.8.0, amazon-wishlist-fetcher.js v1.3.0
  - Import merges new library with existing wishlist items (no more data loss)
  - Wishlist books get enriched (descriptions, reviews) during library fetch
  - Export/backup includes all metadata: price goals, genres, price data

### Changed
- **Data model cleanup** - Unified ownership flags for cleaner code
  - `onWishlist` + `ownershipType` replace legacy `isOwned`/`isWishlist` fields
  - Legacy formats auto-converted on import (6-month deprecation: 2026-07-20)
  - Diagnostic `booksWithoutDescriptionsDetails` moved from JSON to console-only

## [4.18.0] - 2026-01-19

### Changed
- **Terminology update** - "Import" renamed to "Download" across all components
  - File versions: bookmarklet-nav-hub.js v1.2.2, amazon-library-fetcher.js v4.7.1, amazon-collections-fetcher.js v2.1.2, install-bookmarklet.html v1.0.7
  - Clearer language: users download data from Amazon, not import it
- **Installer page logo** - Added ReaderWrangler logo to install-bookmarklet.html header

## [4.17.0] - 2026-01-19

### Added
- **Wishlist Price Display** - Set price goals and find deals on wishlist books
  - File version: readerwrangler.js v4.17.0
  - Price tag badge on wishlist book covers (gray normally, green when at/below goal)
  - Set price goals with preset buttons ($0.99-$4.99) or custom amount
  - "Deals (n)" filter button shows only books at or below your target price
  - Current price and savings displayed in book detail modal
  - "View on Amazon" button turns green with price when book is at goal

### Changed
- **Icons updated to new lasso logo** - All favicons, social cards, and touch icons now use lasso-around-book design
  - og-image.png (1200x630 social card with text)
  - favicon.ico, apple-touch-icon.png, ReaderWrangler180.png, ReaderWrangler192.png
  - Deleted obsolete files: og-image.pptx, favicon-full-size.png, favicon.png, favicon.svg
- **Dev tasks script** - Renamed `update-timestamp.py` to `dev-tasks.py` with backup sync feature
  - File version: dev-tasks.py v1.1.0
  - Optional backup sync to cloud folder (Dropbox, Google Drive, etc.)
  - Directory sync feature for backing up folders (e.g., .private/)
  - Configure via `dev-tasks.cfg` (see `dev-tasks.cfg.example`)
  - Auto-cleans old backups in sync folder

## [4.16.1] - 2026-01-18

### Changed
- Documentation cleanup and reorganization

## [4.16.0] - 2026-01-17

### Added
- **Cut/Copy/Paste for books (Ctrl+X/C/V)** - Flexible book organization with clipboard operations (0-E)
  - File version: readerwrangler.js v4.16.0
  - Ctrl+X cuts selected books (50% opacity + dashed border visual)
  - Ctrl+C copies selected books (normal opacity + dashed border visual)
  - Ctrl+V pastes at selected position or top of column
  - Escape cancels clipboard operation
  - Works with multi-select (Ctrl+Click, Shift+Click, Ctrl+A)
  - Footer shows clipboard status: "2 books cut - click destination and Ctrl+V"
  - Toast notification appears above pasted books

- **Book copies** - Same book can appear in multiple columns
  - Ctrl+C creates copies (new instances with unique GUIDs)
  - Ctrl+Drag copies books instead of moving them
  - Book count shows unique books + copies: "2344 (+1 copy) books"
  - Per-instance hidden state (hide one copy without hiding others)
  - Last-copy protection warns before deleting the only visible copy

- **Delete key** - DEL key removes selected books with last-copy protection
  - Also available via right-click context menu

- **Enhanced context menu** - Submenus for Move/Copy operations
  - Move to → submenu lists all columns
  - Copy to → submenu lists all columns
  - Cut/Copy/Paste options with keyboard shortcuts shown
  - Delete option with last-copy protection

### Fixed
- Undo/Redo works correctly with GUID-based book entries
- Columns with only hidden books hide when "Show Hidden" is off
- Empty columns remain visible when filters are active

## [4.15.8] - 2026-01-13

### Changed
- **Mobile-friendly landing page** - Hero section now scrolls on mobile devices (0-H)
  - File version: index.html v1.2.3
  - Portrait: Hero no longer sticky, replaced Get Started with mobile sync instructions
  - Landscape: Logo and sticky note repositioned relative to center content
  - Comparison slider scales to full width on mobile
  - Updated Recent Features with v4.14.0 Cover Image Caching

## [4.15.7] - 2026-01-13

### Fixed
- **Backup filename uses local time** - Fix UTC date bug showing wrong date after 6pm
  - File version: readerwrangler.js v4.15.7
  - Filename now includes time: `readerwrangler-backup-2026-01-13 10.51.json`
  - Allows multiple backups per day without OS renaming

## [4.15.6] - 2026-01-13

### Changed
- **Simplified date range filter** - Compact preset dropdown replaces two date pickers (0-I)
  - File version: readerwrangler.js v4.15.6
  - Preset dropdown with options: All Dates, Last 30 Days, Last 90 Days, Last 12 Months, dynamic years (YYYY, YYYY-1, YYYY-2), Custom
  - "Custom" option expands inline date pickers for manual date range selection
  - Active Filters banner shows friendly preset names
  - Filter state persists across page refresh, migrates from old dateFrom/dateTo format

## [4.15.5] - 2026-01-12

### Changed
- **Compact inline filter bar** - Saves vertical space with reorganized filter layout (0-G)
  - File version: readerwrangler.js v4.15.5
  - Three-state toggle button: Filters → More Filters → Hide
  - Primary filters (Search, Status, Collection) display inline with toggle button
  - Advanced filters (Rating, Series, Wishlist, Type, Dates) shown on second row
  - HTML table layout for natural column alignment
  - Graceful proportional shrinking on narrower viewports

## [4.15.4] - 2026-01-12

### Changed
- **Search filter includes column/divider names** - Find columns and dividers by name (0-F)
  - File version: readerwrangler.js v4.15.4
  - Title/Author search now also matches column names and divider labels
  - Column appears if its name matches search term (even with no matching books)
  - Divider appears if its label matches search term (even with no books under it)
  - Column appears if any of its divider labels match search term

## [4.15.3] - 2026-01-12

### Changed
- **Hide empty columns/dividers when filtering** - Focused view of filtered results (0-D)
  - File version: readerwrangler.js v4.15.3
  - When any filter is active, columns with no matching books are hidden
  - Dividers with no matching books under them are hidden
  - All columns/dividers reappear when filters are cleared
  - Status bar "Showing X of Y" provides context for hidden content

## [4.15.2] - 2026-01-12

### Fixed
- **Column count excludes dividers** - Fix misleading count in column headers (0-C)
  - File version: readerwrangler.js v4.15.2
  - Column header count now shows only books, not dividers
  - Filtered count also excludes dividers
  - Matches status bar behavior which already excluded dividers

## [4.15.1] - 2026-01-12

### Fixed
- **Collections Fetcher save button** - Fix SecurityError on file save (0-B)
  - File version: amazon-collections-fetcher.js v2.1.0
  - Chrome requires fresh user gesture for `createWritable()` after long operations
  - Added save button before file write to provide fresh user gesture
  - Same fix previously applied to Library Fetcher in v4.6.0

- **Data Status shows correct state when Collections empty** - Fix misleading status (0-A)
  - File version: readerwrangler.js v4.15.1
  - Export backup no longer creates fake collections section when no collections data exists
  - Import correctly resets collections status when file has no collections
  - "Not loaded" text now displays in red for visibility
  - Fetched date shows orange (stale) or red (empty/obsolete) based on status

## [4.15.0] - 2026-01-11

### Changed
- **Responsive Filter Panel** - Redesigned filter panel for better space efficiency
  - File version: readerwrangler.js v4.15.0
  - Primary/Advanced filter split: Search, Read Status, Collection always visible
  - Advanced filters (Rating, Series, Wishlist, Ownership, Date) collapsed by default
  - "More Filters" toggle with active filter count indicator
  - Inline icons (left of fields) instead of labels above
  - Max-width constraints prevent field stretching on ultrawide monitors
  - ~50% vertical space savings when collapsed vs previous design

## [4.14.0] - 2026-01-11

### Added
- **Cover Image Caching** - Local browser cache for book cover images
  - File version: readerwrangler.js v4.13.0
  - Cache API stores covers locally for instant loading on subsequent visits
  - First load: ~82s to cache ~2,300 images (parallel fetching with 20 concurrent requests)
  - Subsequent loads: ~3.5s from cache vs ~4s from network (~65% faster for filter/refresh)
  - Background caching: non-blocking - UI renders immediately while images cache
  - Completes Phase 2 of Cover Image Caching (Phase 1 was fetcher changes in v4.6.0.a)

## [4.13.0] - 2026-01-10

### Added
- **Insert Column Before/After** - New options in column dropdown menu
  - File version: readerwrangler.js v4.12.0
  - Create new columns adjacent to any existing column
  - New column enters edit mode immediately for naming

### Removed
- **Floating Add Column button** - Replaced by Insert Column menu options
  - Better UX: new column appears where you need it, not at far right
- **Version badge from README** - Single source of truth now in app

## [4.12.1] - 2026-01-09

### Fixed
- **Column drag no longer selects text** - Added preventDefault() to column drag handler
  - File version: readerwrangler.js v4.11.1

## [4.11.0] - 2026-01-09

### Added
- **Always-visible horizontal scrollbar** for columns container
  - File versions: readerwrangler.js v4.10.0, readerwrangler.css v4.6.0, readerwrangler.html v4.6.0
  - Styled scrollbar using standard CSS properties (Chrome 121+, Firefox, Safari)
  - Scrollbar visible when columns exceed viewport width

## [4.10.1] - 2026-01-08

### Fixed
- **Clear All Filters** now clears ownership filter (was missing from v4.9.0)
  - File version: readerwrangler.js v4.9.1

## [4.10.0] - 2026-01-07

### Added
- **Unknown Ownership Type Telemetry** - Automatic discovery of new ownership types
  - File version: amazon-library-fetcher.js v4.5.0
  - Sends GoatCounter event for each unique unknown ownership type encountered
  - Helps identify new Amazon ownership types (Rentals, Loans, etc.) without manual bug reports
  - Only fires for truly unknown types - known types (purchased, sample, borrowed, prime, kindleUnlimited, koll, comixology) are not tracked

## [4.9.0] - 2026-01-07

### Added
- **Ownership Type Badges** - Visual badges on book covers for non-purchased books
  - File versions: amazon-library-fetcher.js v4.4.0, readerwrangler.js v4.9.0
  - Badge types: Sample (amber), Borrowed (teal), Prime/KU/KOLL/Comixology (purple)
  - Positioned in bottom-left corner of book covers
  - Only displayed for non-purchased books (purchased books show no badge)
  - See [docs/design/BADGES.md](docs/design/BADGES.md) for full specification

- **Ownership Type Filter** - Filter library by how books were acquired
  - New dropdown in filter panel with options: All, Purchased, Sample, Borrowed, Prime, Kindle Unlimited, KOLL, Comixology
  - Integrates with Active Filters banner and Clear All functionality
  - Filter state persists to localStorage

- **Fetcher Ownership Extraction** - Library fetcher now extracts ownership type from Amazon API
  - Extracts `relationshipSubType` field from Amazon's API response
  - Maps to internal types: purchased, sample, borrowed, prime, kindleUnlimited, koll, comixology, unknown
  - Shows ownership type summary at end of fetch with counts per type
  - Includes bug report template for unknown ownership types

### Changed
- **Filter Panel Reorganization** - Filters now grouped by mental model for better UX
  - Row 1 (Discovery): Search, Read Status, Rating - "What book am I looking for?"
  - Row 2 (Organization): Collection, Series, Wishlist - "How is it organized?"
  - Row 3 (Acquisition): Ownership - "How did I get it?"
  - Rating moved from row 2 to row 1 for logical grouping

### Design Documentation
- Updated [docs/design/BADGES.md](docs/design/BADGES.md) with ownership badge specification
- Created [docs/design/ORPHAN-DETECTION-RECYCLE-BIN.md](docs/design/ORPHAN-DETECTION-RECYCLE-BIN.md) design doc for future feature

## [4.8.0] - 2026-01-06

### Added
- **Undo/Redo Support** - Ctrl+Z to undo, Ctrl+Y or Ctrl+Shift+Z to redo
  - File versions: readerwrangler.js v4.8.0
  - Undoable actions: book moves, reordering, hide/unhide toggle, column delete/reorder, divider delete/reorder
  - 50-action undo history stack with full redo support
  - Uses Command Pattern with useRef to avoid React stale closure issues in keyboard handlers

### Changed
- **Show Hidden Default** - "Show Hidden" filter now defaults to enabled on Reset App and library load
  - Ensures users see all books after reset/load operations

## [4.7.0] - 2026-01-04

### Added
- **Publication Date Support** - Books now include publication dates for better organization
  - File versions: amazon-library-fetcher.js v4.3.0, readerwrangler.js v4.7.0
  - Extracted from Amazon's `overview.sectionGroups` API field
  - Displayed in book details modal alongside acquisition date
  - New "Sort by Published" option in column sort dropdown (oldest/newest)
  - "Sort by Date" renamed to "Sort by Acquired" for clarity
  - Backwards-compatible: warns if sorting by publication date with old data

### Changed
- **Fetcher Save UX Redesign** - Improved file save experience after long fetches
  - File versions: amazon-library-fetcher.js v4.3.0
  - "Save Library File" button appears after fetch (required for browser security)
  - Cancel button with tooltip allows discarding fetched data
  - Timing summary now prints before save dialog (visible even if cancelled)
  - Debug logging removed from production output

### Fixed
- Pass 3 (Merge) timing was showing incorrect/negative values
- Save dialog "X" button incorrectly showed "FILE SAVED" message

## [4.6.0] - 2026-01-04

### Added
- **Analytics Instrumentation** - Privacy-friendly usage tracking via GoatCounter events
  - File versions: readerwrangler.js v4.6.0, amazon-library-fetcher.js v4.1.0, amazon-wishlist-fetcher.js v1.2.0
  - Tracks 10 events: fetcher completions, file import/export, app reset, book drag, column/divider creation
  - GoatCounter deduplicates by session/day (1 count per user per day)
  - No personal data collected; enables data-driven feature prioritization

### Fixed
- Stale "Manifest updated" log message in library fetcher (manifest was removed in previous version)

## [4.5.0] - 2026-01-02

### Added
- **New Logo** - ReaderWrangler brand icon added to app header and landing page hero
  - File versions: readerwrangler.js v4.5.0, index.html v1.2.0, readerwrangler.html v4.5.0
  - Transparent icon file for flexible placement
  - Icon positioned on left of landing page hero, sticky note on right

### Changed
- **Blue Color Palette** - Replaced indigo/purple scheme with fresh blue theme
  - File versions: readerwrangler.js v4.5.0, readerwrangler.css v4.5.0, index.html v1.2.0
  - Updated CSS variables (--color-primary, --gradient-hero, etc.)
  - All Tailwind indigo-* classes replaced with blue-* equivalents
- **Favicon Updates** - New logo files for browser tabs and bookmarks
  - favicon.ico, ReaderWranglerWordless16.png, ReaderWranglerWordless32.png, ReaderWrangler180.png

## [4.4.0] - 2026-01-02

### Added
- **Amazon Affiliate Links** - All "Open in Amazon" links now include affiliate tracking
  - File versions: readerwrangler.js v4.4.0, index.html v1.1.0
  - Supports ReaderWrangler development at no cost to users
  - FTC/Amazon-compliant disclosures added to app footer, Help modal, and landing page
  - Tooltip on wishlist "View on Amazon" button indicates affiliate link

### Changed
- **"Group Series Books" button** - Renamed from "Collect Series Books" to avoid confusion with wishlist/purchase actions and Amazon Collections terminology

## [4.3.0] - 2026-01-02

### Changed
- **Style Guide Applied** - Consistent indigo/purple color scheme across app and landing page
  - File versions: readerwrangler.js v4.3.0, readerwrangler.css v3.9.0, index.html v1.1.0
  - Replaced blue-* Tailwind classes with indigo-* throughout app
  - CSS variables added for theming (--color-primary, --gradient-hero, etc.)
  - Landing page hero gradient matches app styling

### Added
- **Header UX Improvements**
  - Version number displayed in header next to title (muted styling)
  - Book count moved from header to filters row for better information hierarchy
  - Browser tab title simplified (removed version number)
  - Landing page tab title shortened for better visibility in narrow tabs

## [4.2.0] - 2026-01-01

### Changed
- **Title Bar UX Redesign** - Better visual grouping and intuitive layout
  - File version: readerwrangler.js v4.2.0
  - Data Status indicator moved next to Import/Export/Reset buttons
  - Add Column button now floats with columns (scrolls horizontally with them)
  - New branding: Libre Baskerville font for title, "Your books, your order" tagline
  - Added "A product of Alloid Labs™" attribution
  - Title tooltip shows "Wrangle your reader chaos"
- **License** - Updated from MIT to MIT License with Commons Clause
  - Free for personal use, source available for learning
  - No commercial forks or competing products
  - Updated LICENSE and README.md with new terms and trademark notice

### Added
- **Analytics** - Added GoatCounter privacy-focused analytics to index.html and readerwrangler.html
  - No cookies, no personal data, no cross-site tracking
  - Basic traffic statistics only (page views, referrers)
- **Security** - Added security.html and .well-known/security.txt for responsible disclosure

## [4.1.0] - 2025-12-30

### Added
- **Wishlist Feature** - Track books you want to purchase
  - File versions: amazon-wishlist-fetcher.js v1.1.0, bookmarklet-nav-hub.js v1.2.0, readerwrangler.js v4.1.0
  - **Wishlist Fetcher v1.1.0:**
    - Add books from Amazon product pages (single book) or series pages (batch)
    - DOM scraping for book metadata (ASIN, title, author, cover, rating, series)
    - Series mode: Click "Show All" to load full series, skips books you already own
    - Merges into existing `amazon-library.json` file
    - Progress UI with abort capability
  - **Navigator v1.2.0:**
    - Context-aware "Add to Wishlist" button (detects product vs series pages)
    - Dynamic button text: "Add Book" / "Add Series" / "Add Book/Series"
    - Tooltips on all Navigator buttons
  - **App v4.1.0:**
    - Wishlist books display with 40% opacity gray-out effect
    - "Wishlist Item" indicator in detail modal
    - App Loader handles `isOwned` field (owned books override wishlist on re-fetch)
    - Import/Export preserves wishlist fields (`isOwned`, `addedToWishlist`)

- **Hide Feature** - Soft-delete books you don't want to see
  - Right-click context menu: "Hide Book" / "Unhide Book"
  - "Show Hidden" checkbox next to result count (not affected by Clear Filters)
  - Hidden books display with 40% opacity + large 🚫 overlay
  - Persists `isHidden` to IndexedDB
  - Applies to both owned and wishlist books

- **Context Menu Enhancements** - New right-click options
  - "Open in Amazon" - Opens selected books' Amazon pages (confirm if >3, error if >10)
  - "Copy Title(s)" - Copies all selected book titles to clipboard

### Fixed
- **Context Menu Positioning** - Menu now flips up/left when near viewport edges
- **Book Count Display** - Fixed count to exclude dividers (was showing filtered > total)

### Design Documentation
- Created comprehensive [docs/design/WISHLIST-FEATURE.md](docs/design/WISHLIST-FEATURE.md) design specification
  - Documents all 6 implementation phases
  - Schema changes, Navigator changes, App Loader logic
  - DOM scraping selectors for Amazon product/series pages

## [4.0.1] - 2025-12-28

### Fixed
- **Ctrl+A now respects active filters** - Previously selected ALL books in column, now correctly selects only visible/filtered books
  - File version: readerwrangler.js v4.0.1
  - Used ref pattern to ensure Ctrl+A handler always uses current filter state
  - Also excludes dividers from selection (only selects actual books)
  - Consistent with Shift+Click range selection behavior

## [4.0.0] - 2025-12-25

### Changed
- **BREAKING: Schema v2.0 Unified File Format** - Single file replaces separate library + collections files
  - File versions: readerwrangler.js v4.0.0, amazon-library-fetcher.js v4.0.0, amazon-collections-fetcher.js v2.0.0
  - **Unified File Structure:**
    - Single `amazon-library.json` contains books, collections, and organization data
    - Format: `{ schemaVersion: "2.0", books: {...}, collections: {...}, organization: {...} }`
    - `amazon-collections.json` is now obsolete
  - **Library Fetcher v4.0.0:**
    - Outputs Schema v2.0 format with `books.items` array
    - Preserves existing collections section when updating
    - Delta reporting: Shows count of new books found
    - Skips save if library is already up-to-date (0 new books)
    - Rejects backup files (`isBackup === true`)
    - File System Access API for same-file overwrite (Chrome/Edge)
    - Fallback download for Firefox/Safari with warning
  - **Collections Fetcher v2.0.0:**
    - Reads/writes unified file format
    - Merges into existing file, preserves books + organization sections
    - Rejects backup files
    - File System Access API for same-file overwrite (Chrome/Edge)
  - **App v4.0.0:**
    - Reads Schema v2.0 format (`books.items`, `collections.items`)
    - Backup/library file distinction via `isBackup` flag
    - Export creates backup with `isBackup: true` and filename `readerwrangler-backup-{date}.json`
    - Import behavior: Backup = full replace with confirmation; Library = merge books, keep organization
    - New books automatically added to Unorganized column after library import
    - Buttons renamed: Backup→Export, Restore→Import
    - Tooltips added to Import, Export, Add Column buttons
  - **Bug Fixes:**
    - Data Status modal crash fixed (dividers stored as objects, not string IDs)
    - Orphaned books after library import now correctly added to Unorganized
  - **Design Document:** See [docs/design/SCHEMA-V2-UNIFIED-FILE.md](docs/design/SCHEMA-V2-UNIFIED-FILE.md)

## [3.14.0] - 2025-12-23

### Added
- **Dividers as Drop Targets** - Complete drag-drop system overhaul
  - File version: readerwrangler.js v3.14.0
  - **Core Features:**
    - Drop books/dividers onto dividers (inserts before or after based on cursor position)
    - Visual drop indicator shows exact insertion point during drag
    - Works for all drag scenarios: books, multi-selected books, dividers
    - Click empty grid area to clear selection (standard UX pattern)
  - **Performance Optimizations:**
    - Row-Based Grid Index: O(log R) binary search instead of O(N) per-element polling
    - Built once at drag start, uses scroll offset calculation (no rebuild during scroll)
    - Overlay Indicator: Single DOM element positioned via direct manipulation
    - Refs instead of React state: Eliminates 2338 component re-renders during drag
    - Result: Smooth drag performance even with 2000+ books
  - **Technical Implementation:**
    - `buildColumnIndex()`: Creates row-based index with Y-boundaries for binary search
    - `calculateDropPosition()`: O(log R) lookup using cached index + scroll delta
    - `updateIndicatorPosition()`: Direct DOM manipulation (no React re-render)
    - `updateGhostPosition()`: Ref-based ghost positioning (no state updates)
  - **Impact:**
    - Completes the divider drag-drop experience (v3.11.0 added dividers, now fully interactive)
    - Makes reorganizing large libraries practical (was laggy/unusable before)
    - Professional-grade drag performance comparable to native desktop apps

## [3.13.0] - 2025-12-22

### Added
- **Selectable Dividers** - Click divider to select/deselect all books in that section
  - File version: readerwrangler.js v3.13.0
  - Click divider once to select all books between it and the next divider
  - Click again to deselect (toggle behavior)
  - Ctrl+click to add section to existing selection
  - Enables moving entire series/sections as a unit (divider + all books move together)
  - Solves: Previously had to drag divider and books separately (laborious for large series)
  - Fix: Prevent double drop indicators when dragging selected groups

## [3.12.0] - 2025-12-22

### Added
- **Auto-Scroll During Drag** - Automatic scrolling when dragging near column edges
  - File version: readerwrangler.js v3.12.0
  - When dragging item near top/bottom of column, container auto-scrolls
  - Scroll speed proportional to cursor proximity to edge (faster near edge)
  - Critical for columns with many books (can now drag to any position in one operation)
  - 100px trigger zone, max 15px/frame scroll speed

## [3.11.0] - 2025-12-22

### Added
- **Series Dividers Within Columns** - Visual section headers to organize books within columns
  - File version: readerwrangler.js v3.11.0
  - **Core Features:**
    - Manual dividers: Insert custom dividers via column dropdown menu → "Insert Divider"
    - Rename: Double-click divider text for inline editing (Enter to save, ESC to cancel)
    - Delete: Hover divider → click ✕ button (no confirmation)
    - Reposition: Hover divider → drag via ⋮ handle to any position in column
    - Dividers mix freely with books in drag-and-drop (treated as items in book array)
  - **Auto-Generate Helpers:**
    - "Auto-Divide by Series" - Groups books by series name (alphabetically), adds divider per series, sorts books by position within each series
    - "Auto-Divide by Rating" - Groups books by rating tiers (5★, 4★, 3★, 2★, 1★, Unrated)
    - Books without series metadata grouped under "Miscellaneous" divider
    - After generation, dividers are normal manual dividers (rename/delete/reposition freely)
  - **Unified Column Menu:**
    - Replaced separate sort/delete buttons with single ⋮ dropdown menu
    - Menu structure: Sort Column (submenu) → Auto-Divide options → Insert Divider → Rename/Delete Column
    - ESC key closes menus (submenu first, then main menu)
    - Click outside menus closes them
  - **Data Structure:**
    - Dividers stored as objects in column.books array: `{ type: 'divider', id: 'divider-...', label: 'Series Name' }`
    - Mixed array contains both book IDs (strings) and divider objects
    - Dividers persist to IndexedDB with organizational state
    - Dividers always pass through filters (always visible)
  - **Visual Design:**
    - Horizontal bar with centered text: `═══ Series Name ═══`
    - Gray background (#f3f4f6) differentiates from book covers
    - Hover state reveals drag handle (⋮ left) and delete button (✕ right)
    - Inline editing with blue border focus state
  - **Use Cases:**
    - Series grouping: "Jerry Mitchell" (books 1-6), "First Team" (books 3-4), "Miscellaneous"
    - Reading status: "Read", "Currently Reading", "To Read"
    - Rating tiers: "5 Stars", "4 Stars", "3 Stars or Below"
    - Any custom categorization user wants
  - **Impact:**
    - Solves horizontal space problem: One "Author Name" column can contain multiple series with clear visual separation
    - Efficient screen space usage for large libraries (2000+ books)
    - Series readers can visually group books without creating many columns
    - Alternative to complex nested hierarchies (simpler implementation, same organizational power)

### Fixed
- **Series Sort Logic** - Books with series but no position now sort correctly
  - Previous bug: Required both `series` AND `seriesPosition` to be truthy, treating books with series but no position as "unsortable"
  - Fix: Only check for `series` field, books without position go last in their series group (999 fallback)
  - Example: "The Javan War" (series: "The Cruel Stars Trilogy", position: null) now sorts with its series instead of ending up in wrong group
  - Impact: All books with series metadata sort with their series, regardless of position data quality

## [3.10.1] - 2025-12-22

### Fixed
- **Series Position Sort Bug** - Multi-level sorting now groups books by series before sorting by position
  - File version: readerwrangler.js v3.10.1
  - Bug: v3.10.0 sorted ALL books by position number, ignoring series membership
  - Fix: Multi-level sort - group by series name (alphabetically), then sort by position within each series
  - Example: "Jack Ryan Jr. #12" and "Different Series #1" no longer sort together
  - Edge cases: Books without both series AND seriesPosition remain in original position (unsortable)
  - Impact: Series position sort now actually useful for organizing multi-series collections
  - Users can now use one author column (e.g., "Larry Bond") and sort by series to group all series together
  - Related: TODO.md Priority 1 Task 0 (COMPLETED)

## [3.10.0] - 2025-12-22

### Added
- **Column Sorting: Series Position** - Complete column sorting functionality
  - File version: readerwrangler.js v3.10.0
  - Added "Series (1→99)" and "Series (99→1)" sort options to column sort menu
  - Sort books within columns by: acquisitionDate, seriesPosition, rating, title, author
  - Books without seriesPosition default to position 999 (sorted last)
  - Permanent re-ordering: Sorted order persists to IndexedDB automatically
  - Multi-column independent sorting: Each column tracks its own book order
  - Manual adjustment after sorting: Drag-and-drop still works (not locked)
  - Completes organization workflow: Get books into columns, then order optimally within each
  - Related: TODO.md Priority 1 Task 1 (COMPLETED)

## [3.9.2] - 2025-12-22

### Added
- **Reset App Backup Reminder** - Custom confirmation modal now reminds users to backup before resetting
  - File version: readerwrangler.js v3.9.2
  - Replaced native `confirm()` dialog with custom modal to fix Chrome scrolling bug
  - Added backup reminder: "💡 Tip: Use the Backup button first to save your organization before resetting"
  - Custom modal displays all content without scrolling (fixes Chrome extension bug where confirm() scroll interfered with tab scrolling)
  - Backup reminder highlighted in yellow box for visibility
  - Modal styled consistently with other app modals (Data Status, Settings)
  - Prevents accidental data loss by guiding users to proper workflow
  - Related: TODO.md Priority 1 Task 0 (COMPLETED)

## [3.9.1] - 2025-12-21

### Fixed
- **Read Status Tooltip** - SE corner green checkmark now shows "Read" tooltip instead of collections information
  - File version: readerwrangler.js v3.9.1
  - Added `title="Read"` attribute to read status indicator (line 2951)
  - Fixes confusing UX where hovering on read status showed unrelated collections data
  - Parent container's collections tooltip was bleeding through to child element

## [3.9.0] - 2025-12-21

### Changed
- **Architecture: Simplified to Load-State-Only Status System** - Removed broken cross-domain manifest tracking
  - File versions: readerwrangler.js v3.9.0, amazon-library-fetcher.js v3.6.0, amazon-collections-fetcher.js v1.3.0
  - **Removed manifest tracking**: Deleted all IndexedDB manifest read/write code from fetchers and organizer app
  - **Removed ReaderWranglerManifests database**: Cross-domain isolation made manifest sharing impossible between amazon.com (fetcher) and readerwrangler.com (app)
  - **Simplified status bar**: Now shows only Load state based on loaded file timestamp (removed broken fetch state tracking)
  - **Honest messaging**: App displays age of loaded data and trusts user to know their Amazon activity
  - **Architectural simplification**: 25 theoretical states (5 Fetch × 5 Load) → 6 practical states (Load-only: Empty, Fresh Both, Fresh Library, Fresh Collections, Stale Both, Obsolete Both)
  - Impact: Status system now works correctly, shows accurate information, puts responsibility on user who knows their Amazon purchase history

- **Data Status Modal UX Redesign** - Complete redesign of Data Status modal for better consistency and usability
  - File version: readerwrangler.js v3.9.0
  - **Button positioning**: Moved all Load/Reload buttons to same line as status (right-aligned) for universal left-to-right scan pattern
  - **Visual anchoring**: Added emojis (📚 Library, 📁 Collections) throughout all modal states for consistent visual cues
  - **Contextual proximity**: Action buttons now appear exactly where the problem is shown
  - **Layout improvements**:
    - States 1-2: Two-column fetch instructions for dual destinations (Library and Collections)
    - States 3-4: Single-column fetch instructions (~60% width, centered) for visual balance when only one data type needs attention
    - States 5-6: Consistent two-column layout with urgency-appropriate messaging
  - **Simplified messaging**: Replaced Yes/No branching with direct "Don't have files yet? Fetch them from Amazon:" approach
  - **Pattern consistency**: All 6 states now follow same design principles (status line + inline button + fetch instructions)
  - **Wired to File Picker API**: All Load/Reload buttons trigger browser file picker for manual file selection
  - Impact: Faster user comprehension, reduced cognitive load, consistent experience across all modal states

### Fixed
- **Redundant Status Grid** - Removed duplicate status display at bottom of Data Status modal (v3.9.0.p)
  - Modal was showing status information twice (top section + redundant grid at bottom)
  - Removed 15-line Status Grid section that duplicated information already shown inline
  - Impact: Cleaner modal UI, reduced visual clutter

### Added
- **File Type Detection** - Enhanced file loading with automatic type detection and routing (v3.9.0.l)
  - Single file picker now intelligently detects Library vs Collections JSON structure
  - Routes to appropriate loader function based on detected `type` field
  - Clear error messages when wrong file type selected ("This appears to be a Collections file, but you clicked Load Library")
  - Leverages type field validation added in v3.8.0
  - Impact: Better error handling, clearer user feedback during file loading

- **Collections Auto-Loading** - Collections file now auto-loads after successful library load (v3.9.0.n)
  - After loading library file, automatically checks for collections data in localStorage
  - Auto-loads collections if available, updating status and merging collection metadata
  - Spinner displays during auto-load with clear messaging
  - Impact: Seamless user experience, one less manual step required

- **Reset App Tooltip Fix** - Corrected Reset App button tooltip to match design specification (v3.9.0.m)
  - Previous tooltip: "Clear all data and start fresh"
  - New tooltip: "Reset app to initial state (clears organization, keeps library/collections loaded)"
  - Impact: Accurate description of what Reset App actually does

### Design Documentation
- Created comprehensive [DATA-STATUS-MODAL-STATES.md](docs/design/DATA-STATUS-MODAL-STATES.md) design specification
  - Documents all 6 modal states with ASCII mockups
  - Defines button behavior, messaging tone, and layout patterns for each state
  - Includes file type routing logic and testing scenarios
  - Serves as single source of truth for Data Status modal implementation

## [3.8.0] - 2025-12-20

### Added
- **Advanced Filtering System** - Added comprehensive filtering for organizing large libraries (Priority 1, #1: Advanced Filtering + Collections Integration UI)
  - File version: readerwrangler.js v3.8.0
  - Filter by rating (minimum star rating)
  - Filter by acquisition date range (From/To date pickers)
  - Filter by series (dropdown with all series names + "NOT_IN_SERIES" option)
  - Filter by wishlist status (Wishlist/Owned toggle)
  - Active filter count badge on filter button
  - Pulse animation on filter button when filters active
  - Collapsible filter panel (remembers state)
  - Filter state persistence to localStorage
  - Filters reset on library load and Clear Library
  - Impact: Enables quick discovery of specific book subsets in 2,300+ book libraries

- **Collection Metadata in Book Modal** - Collection names now displayed in book detail modal
  - Shows comma-separated list of all collections containing the book
  - Leverages existing Amazon collections data fetched by collections-fetcher
  - Impact: Better visibility of Amazon collection membership

- **Type Field Validation** - Both fetchers now include type field for better file validation (Priority 1, #0: File Type Field Validation)
  - Library fetcher v3.6.0: Added `"type": "library"` to JSON output
  - Collections fetcher v1.3.0: Added `"type": "collections"` to JSON output
  - Clean break validation: Requires type field, throws error if missing (no backward compatibility)
  - Better error messages for wrong file type selection
  - Example errors: "Wrong file type - This is a collections file. Please select a library file."
  - Impact: Clearer validation, better user feedback when wrong file selected

### Fixed
- **Acquisition Date Filter Field Name** - Fixed filter checking wrong field name (v3.8.0.m)
  - Filter was checking `book.acquisitionDate` but IndexedDB stores as `book.acquired`
  - Changed filter logic to use correct field name
  - Impact: Date range filter now works correctly

- **Wishlist Filter Field Mapping** - Fixed isWishlist field being dropped during JSON load (v3.8.0.n)
  - Field was not included in book object mapping at line 1086-1107
  - Added `isWishlist: item.isWishlist || 0` to field mapping
  - Impact: Wishlist filter now works correctly with manual test data

- **Library Fetcher Progress UI** - Fixed dialog hanging when library is up-to-date (no new books scenario)
  - File version: amazon-library-fetcher.js v3.6.0
  - Previous behavior: Dialog remained open showing "Fetching Titles" indefinitely
  - Root cause: Early return without updating progress UI
  - Fix: Added progressUI.showComplete() call before return
  - Impact: Better UX when no updates needed

### Notes
- **Genre Filter Not Available** - Amazon API does not provide genre/category metadata, so genre filtering cannot be implemented
  - Investigated during v3.8.0 development
  - Amazon's GraphQL API returns: title, author, rating, series, binding, description, reviews
  - No category, genre, or subject classification data available
  - Alternative: Users can leverage Amazon Collections for categorization

## [3.7.4] - 2025-12-19

### Fixed
- **Library Fetcher Error Handling** - Invalid file selection now shows error dialog instead of hanging (Priority 0, Bug #1)
  - File version: amazon-library-fetcher.js v3.5.2
  - When user selects wrong JSON file (e.g., collections JSON instead of library JSON), error dialog now appears immediately
  - Previous behavior: Dialog hung with "Checking Library Data..." message indefinitely
  - Root cause: Validation failure used `return;` instead of `throw new Error()`, preventing catch block from executing
  - Fix: Changed line 731 to throw error, ensuring progressUI.showError() displays to user
  - Impact: Better UX when file selection errors occur

## [3.7.3] - 2025-12-18

### Changed
- **Version Constant Renamed** - Renamed APP_VERSION to ORGANIZER_VERSION for clarity
  - File version: readerwrangler.js v3.7.1
  - Distinguishes organizer version from fetcher versions
- **Documentation Streamline** - Eliminated LOG.md to follow open-source standard
  - Migrated unique development insights to CHANGELOG.md
  - Follows "Keep a Changelog" standard (single source of truth)
  - Reduces duplication and maintenance burden

### Investigation
- **Collections Filter False Bug** - Investigated report that collections dropdown showed old collection names after Clear Everything
  - **Report**: Collections dropdown still shows "Uncollected" and other names after Clear Everything
  - **Investigation**: Attempted to verify by testing Clear Everything, observed "Uncollected" collection persisting in dropdown
  - **Root Cause of Confusion**: "Uncollected" is a hardcoded pseudo-collection in the HTML (always present by design), not a leftover from previous collections
  - **Actual Finding**: Clear Everything correctly clears all dynamic collections. The "Uncollected" entry is intentional, representing books not in any Amazon collection
  - **Conclusion**: No bug exists. User error during testing - mistook hardcoded "Uncollected" entry for a bug
  - **Original Report Status**: Unknown if original bug report made same mistake, or if bug was fixed at another time
  - **Time Impact**: Investigation consumed development time chasing false positive

### Development Notes
- **Conversation Recovery Insight** (2025-12-11) - When moving projects to new paths, Claude Code conversation history is path-keyed and won't follow automatically
  - Recovery: Locate conversation file in `C:\Users\Ron\.claude\projects\{path-encoded-folder}\`, update paths, set `isSideChain: false`
  - Key insight: Compaction summary metadata beyond visible text shapes behavior - cumulative corrections matter
  - "Broken in" conversations with correction history behave differently than fresh starts with identical instructions
- **Recurring Version Confusion** (2025-12-19) - Claude Code repeatedly confuses file versions (ORGANIZER_VERSION constant in readerwrangler.js) with APP/project versions (README.md badge, git tags)
  - Pattern: When discussing version updates, Claude often references wrong version type (e.g., "APP version 3.7.0" when meaning "file version v3.7.0")
  - Impact: Causes confusion during release prep, requires repeated clarification
  - Example: During v3.7.3 release, Claude confused readerwrangler.js v3.7.0 with APP version v3.7.0 (which doesn't exist - APP was at v3.7.2)
  - Mitigation: Always clarify which version type is being discussed, use explicit prefixes ("file version" vs "APP version")

## [3.7.2] - 2025-12-13

### Added
- **Progress UI Dialog** - Visual progress overlay for both fetchers (Priority 1, #2: Enhanced Progress Feedback)
  - Library fetcher v3.5.1: Timer display, progress bar, phase indicators
  - Collections fetcher v1.2.1: Timer display, progress bar, phase indicators
  - Shows elapsed time, current phase, and book count progress
  - Auto-dismiss after 30 seconds on completion
  - See: [post-mortems/v3.7.2-2025-12-13.md](post-mortems/v3.7.2-2025-12-13.md)
- **Abort on X Close** - Closing progress dialog now stops the fetch
  - Polls abort flag at start of each fetch iteration
  - Logs warning to console when abort requested
  - Prevents surprise save dialogs after user dismisses UI

### Technical Notes
- Progress UI implemented as IIFE module within fetcher functions
- Abort uses simple flag polling (Option A) - low complexity, low risk
- No AbortController needed since fetch loops are synchronous between iterations
- **Note**: Pause/Resume and Recovery features moved to Phase 3 Retry Logic (Priority 5, item #3)

## [3.7.1] - 2025-12-11

### Changed
- **Collections Fetcher Speed Optimization** - Dramatic performance improvement (Priority 1, #1: Speed Up Enrichment)
  - Released: amazon-collections-fetcher.js v1.2.0
  - Batch size increased: 200 books per request (was 25)
  - Removed artificial delays: 0ms (was 2000ms)
  - Performance: ~25 seconds for 2,300 books (was ~3+ minutes)
  - Network RTT (~400ms) provides natural throttling
  - Combined with v3.7.0 library fetcher improvements: **Achieved ~7-8x total speedup**
  - See: [post-mortems/v3.7.1-2025-12-11.md](post-mortems/v3.7.1-2025-12-11.md)

### Technical Notes
- Batch size 200 confirmed safe via diag-01-collections-rate-limit.js testing
- Collections API uses REST endpoint, not GraphQL (different from library fetcher)
- Progress UI time estimate updated to reflect new speed

## [3.7.0] - 2025-12-11

### Changed
- **Library Fetcher Speed Optimization** - Dramatic performance improvement (Priority 1, #1: Speed Up Enrichment)
  - Released: amazon-library-fetcher.js v1.1.0
  - Removed artificial delays (0ms) - network RTT provides natural throttling
  - Batch enrichment: 30 ASINs per getProducts call (was 1 per call)
  - Performance: ~25 seconds for 2,300 books (was ~2 hours)
  - See: [post-mortems/v3.7.0-2025-12-11.md](post-mortems/v3.7.0-2025-12-11.md)

### Added
- **Error Categorization** - Partial API errors now tracked by category in stats
  - `amazonTimeout` - 504.1 / Backend Future timed out errors
  - `customerMarketplace` - Customer/Marketplace ID invalid errors
  - `other` - Unrecognized errors
  - Category breakdown shown in final stats output
- **Friendly Error Messages** - Amazon API errors now display human-readable messages
  - 504.1 timeout → "Amazon server timeout (504.1) - temporary issue, data still retrieved"
  - Customer/Marketplace ID → "Amazon internal error (Customer/Marketplace ID) - data still retrieved"

### Fixed
- **Timing Stats** - Fixed missing timestamps causing incorrect duration display
  - Added `mergeEnd` timestamp after library file save
  - Added `manifestStart`/`manifestEnd` timestamps around Step 6
- **Partial Error Logging** - Fixed crash when logging batch partial errors
  - Updated to match batch structure (`batch`, `errorMessage`, `productsReturned`, `productsRequested`)

### Technical Notes
- Batch size of 30 ASINs is Amazon's limit (discovered via diag-03-batch-enrichment.js testing)
- GraphQL syntax requires unquoted keys: `{asin: "X"}` not `{"asin": "X"}`
- 504.1 errors are Amazon-side timeouts, benign when data is still returned

## [3.6.1] - 2025-11-19

### Fixed
- **Token Percentage Calculation** - Added explicit calculation formula to prevent inversion errors (2025-11-24)
  - Problem: Token percentage was intermittently calculated incorrectly (showing 35% when actually 67% remaining)
  - Root cause: Ambiguous protocol wording allowed calculating tokens USED instead of tokens REMAINING
  - Fix: Added explicit calculation formula with example: `(tokens_remaining / total_tokens) × 100`
  - Added DO NOT warning against calculating wrong metric (total - remaining) / total
  - File: SKILL-Development-Ground-Rules.md lines 274-280
- **Session Compaction Protocol** - Restored critical protocol to ground rules (2025-11-24)
  - Root cause: Protocol was removed during ground rules reorganization on 2025-11-22
  - Impact: Post-compaction sessions failed to load ground rules, causing Rule #0 violations
  - Fix: Restored Session Compaction Protocol section to SKILL-Development-Ground-Rules.md
  - Updated references from SKILL-Amazon-Book-Organizer.md → SKILL-ReaderWrangler.md
  - Removed redundant Rule #0 format duplication (now single source of truth at top of file)
  - File: SKILL-Development-Ground-Rules.md lines 205-247

### Added
- **Token Monitoring and Compaction Management Protocol** - Automated compaction detection and tracking (2025-11-24)
  - Status line progress bar (5 blocks) shows token usage visually
  - Freshness indicator (🟢🟡🟠🔴) shows data staleness
  - Threshold-based actions: Green/Yellow/Orange/Red zones with specific protocols
  - Automatic compaction detection: Triggers when token % increases (e.g., 19% → 100%)
  - **Memory file mechanism**: `.claude-token-memory` persists previous token % across sessions
    - Enables reliable compaction detection without parsing text history
    - Single number file (e.g., "48") updated at end of each response
    - Added to `.gitignore` (state file, not tracked)
  - Approval workflow: "yes" / "yes to all" / "no" for logging to Compaction-log.md
  - VS Code snippet + keybinding (Ctrl+Alt+L) for manual logging fallback
  - Purpose: Track actual token usage to validate Claude Max cost vs Pro + API
  - File: SKILL-Development-Ground-Rules.md lines 247-383
- **Wishlist Integration TODO Items** - Planned features for wishlist tracking and series gap detection (2025-11-24)
  - Item #19 (Priority 3): Basic wishlist with bookmarklet extraction and gray-out UI
  - Item #36 (Priority 6): Series gap detection with automatic missing book discovery
  - Bookmarklet saves to amazon-library.json as new top-level `wishlist` array
  - App creates special "Wishlist" column with visual distinction
  - Series gap detection requires Amazon API investigation (may be blocked by inconsistent series metadata)
  - Files: TODO.md lines 193-209 (item #19) and lines 321-342 (item #36)
- **Dev/Prod Dual-Repo Workflow** - Three-environment testing infrastructure (2025-11-23)
  - LOCAL (localhost:8000), DEV (readerwranglerdev), PROD (readerwrangler.com)
  - Environment-aware bookmarklet installer shows appropriate bookmarklets per environment
  - Console.log version output added to installer pages for debugging cache issues
  - Documentation in CONTRIBUTING.md "Bookmarklet Development and Testing" section
- **GUID-Based Status Tracking** - Library fetcher now generates unique GUIDs for status bar tracking (amazon-library-fetcher.js v3.4.0.a)
  - GUID stored in JSON file `metadata.guid` and IndexedDB manifest
  - Enables matching loaded files to their fetch manifests
  - Schema version bumped to 3.1.0
- **IndexedDB Manifest Storage** - Fetcher writes manifest directly to IndexedDB (amazon-library-fetcher.js v3.4.0.a)
  - Replaces broken manifest file polling (didn't work on GitHub Pages)
  - Uses `ReaderWranglerManifests` database with `manifests` object store
  - Enables future 25-state status tracking
- **Status Persistence** - Library and Collections status now persisted to localStorage (readerwrangler.js v3.7.0.n)
  - Status survives page refresh
  - Uses `readerwrangler-status` localStorage key
- **State Matrix Design Document** - Added state-matrix.html with complete 25-state matrix specification
  - Documents all Fetch × Load state combinations
  - Includes dialog mockups and urgency icon logic
  - User-first design principle: urgency based on Load state only

### Fixed
- **Three-Environment Bookmarklet Navigation** - All bookmarklets were navigating to wrong destinations (2025-11-23)
  - Root cause: `bookmarklet-loader.js` had `TARGET_ENV = 'PROD'` hardcoded
  - Fix: Renamed to `bookmarklet-nav-hub.js`, bookmarklets now inject `window._READERWRANGLER_TARGET_ENV`
  - Added `isDevRepo` detection to `index.html` (was missing, causing DEV repo to show PROD bookmarklet)
  - Versions: index.html v1.0.5, install-bookmarklet.html v1.0.5, bookmarklet-nav-hub.js v1.1.3
- **Status Dialog Bug** - Fixed dialog showing "No Library Loaded" when library was actually loaded (readerwrangler.js v3.7.0.n)
  - Dialog now correctly reads from persisted libraryStatus/collectionsStatus
  - Status initializes properly from localStorage on page load

### Changed
- **Status Bar UI** - Removed version number from status bar header (readerwrangler.js v3.7.0.o)
  - Version was cluttering status area meant to show data freshness
  - "Data Status:" label now clearly refers to library data freshness, not app version
  - Version remains visible in footer (bottom-right corner)
  - Per design spec in state-matrix.html line 445

## [3.6.1] - 2025-11-19

### Added
- **Sticky Note Callout** - Landing page hero section now features handwritten sticky note (index.html v1.0.5)
  - Text: "It's Not Just Organization; It's Rediscovery!"
  - Hand-drawn smiley face (eyes and smile)
  - Yellow gradient background with red thumbtack pin
  - Rotated -5 degrees counterclockwise for authentic sticky note appearance
  - Positioned to upper-right of hero section
  - Uses Gloria Hallelujah Google Font for handwritten text
  - Hidden on mobile devices (≤768px width) to prevent overlap
  - Location: [index.html:88-149](index.html#L88-L149) (CSS), [index.html:499-517](index.html#L499-L517) (HTML)

## [3.6.0] - 2025-11-19

### Added
- **Visual Assets & Marketing Content** - Enhanced landing page and documentation with interactive demonstrations
  - **Interactive Before/After Slider**: Image comparison slider on index.html showing transformation from Amazon's chaotic list to organized columns
    - Uses img-comparison-slider web component from unpkg CDN
    - Custom purple divider and handle styling for improved visibility
    - Full-bleed 1800px container for maximum visual impact
    - Screenshot assets: before.png (808 KB), after.png (1.8 MB)
  - **10-Minute Walkthrough Video**: Self-hosted video demonstration of all features
    - HTML5 video player with custom poster image
    - Compressed from 846 MB to 39 MB for web delivery (H.264/AAC)
    - 1600px container for prominent display
    - Preview frame extracted at 9:11 timestamp using FFmpeg
    - Video assets: walk-through.mp4 (39 MB), walkthrough-preview.png (1.3 MB)
  - **README.md Enhancements**: Static versions of visual content for GitHub
    - Side-by-side before/after images (49% width each)
    - Clickable video preview linking to MP4
    - Placed strategically after "Why ReaderWrangler?" section
  - **Location**: index.html comparison section and video section, README.md visual sections
  - **Purpose**: Improved conversion and user engagement through visual storytelling

### Changed
- **TODO Documentation** - Added "Fill in missing sections in USER-GUIDE.md" task

## [3.5.4] - 2025-11-19

### Fixed
- **DEV Bookmarklet Localhost Mode** - DEV bookmarklet now consistently uses localhost for all operations
  - **Global Flag Pattern**: DEV bookmarklet sets `window._READERWRANGLER_DEV_MODE=true` before loading loader
  - **Force Localhost**: Loader checks flag and forces `baseUrl = 'http://localhost:8000/'` when true
  - **Consistent Navigation**: "Launch App" and all navigation now use localhost regardless of current domain
  - **Developer Experience**: Enables testing production bookmarklet behavior while using local files
  - **Console Diagnostics**: Both DEV and PROD bookmarklets log version and loading source
  - **Locations**: [install-bookmarklet.html:222,226](install-bookmarklet.html#L222), [bookmarklet-nav-hub.js:12](bookmarklet-nav-hub.js#L12)

### Removed
- **Dead Code Cleanup** - Removed non-functional `about:blank` detection from bookmarklet and loader
  - **Browser Limitation**: Browser security completely blocks JavaScript execution on `about:blank` pages
  - **No Detection Possible**: Code never executes to show error message
  - **Documented**: This is expected browser behavior, not a bug to fix
  - **Other Blocked Pages**: Similarly blocked on `chrome://` URLs and other restricted pages

## [3.5.3] - 2025-11-19

### Added
- **Title Navigation Link** - ReaderWrangler title in app header now links back to index.html
  - **Invisible Styling**: Link maintains original visual appearance (no color change, no underline)
  - **Implementation**: Uses inline React styles `color: 'inherit'` and `textDecoration: 'none'`
  - **User Experience**: Provides easy navigation from app back to landing page
  - **Location**: App header at [readerwrangler.js:1531-1533](readerwrangler.js#L1531-L1533)

## [3.5.2] - 2025-11-19

### Added
- **Ctrl+A Column-Scoped Selection** - Select all books in active column with Ctrl+A
  - **Active Column Tracking**: Click any book or column to set it as active
  - **Visual Indicator**: Active column displays dark gray beveled border
  - **Smart Behavior**: Ctrl+A selects all filtered books in active column only
  - **Auto-Initialize**: First column automatically becomes active on load
  - **Cross-Column Safety**: Prevents accidental selection across multiple columns

### Fixed
- **Shift+Click Range Selection** - Fixed broken shift-click range selection
  - **Root Cause**: `selectBookRange` was comparing book objects to book IDs using strict equality
  - **Symptoms**: Shift-click appeared to do nothing (no books selected)
  - **Fix**: Changed comparison from `b === startBookId` to `b.id === startBookId` (lines 1138-1139)
  - **Fix**: Added `.map(book => book.id)` to extract IDs from book objects (line 1145)
  - **Impact**: Shift-click range selection now works correctly for selecting contiguous books

- **Ctrl+A Active Column Tracking** - Fixed Ctrl+A selecting from wrong column
  - **Root Cause**: Clicking book didn't update `activeColumnId`, only clicking column container did
  - **Symptoms**: After selecting book in Column B, Ctrl+A still selected from Column A
  - **Fix**: Added `setActiveColumnId(column.id)` to book click handler (line 2207)
  - **Impact**: Ctrl+A now always selects from the column containing the last clicked book

### Changed
- **Ground Rules: Simplified Compaction Management Protocol** - Streamlined token monitoring and context compaction workflow
  - **EXPERIMENT**: Compared automatic summarizer output vs manual summary template (EXAMPLE-CONTEXT-COMPACTION-PREP.md)
  - **FINDINGS**: Auto-summarizer captures all technical details, errors, decisions, and context effectively without manual prep
  - **CHANGES TO SKILL-Development-Ground-Rules.md**:
    - 🟠 Orange Zone (22-25%): Simplified from verbose manual summary to brief git status check
    - 🔴 Red Zone (<22%): Streamlined emergency protocol
    - Removed reference to manual summary template (EXAMPLE-CONTEXT-COMPACTION-PREP.md)
    - Added "Why This Works" section documenting auto-summarizer effectiveness
  - **DELETED FILES**:
    - EXAMPLE-CONTEXT-COMPACTION-PREP.md (manual summary template no longer needed)
    - ExampleAutoSummary-DELETEME.md (experimental comparison capture)
  - **TOKEN SAVINGS**: ~2-3% per compaction cycle (no longer preparing verbose manual summaries)
  - **RATIONALE**: Ground rules header (lines 1-70) with explicit triggers and required checklist ensures post-compaction success more effectively than verbose manual summaries

- **Bookmarklet Evolution to Navigation Hub** - Transformed bookmarklet from simple script runner to multi-step navigation system
  - **CONCEPT CHANGE**: Bookmarklet now shows navigation menu instead of auto-running scripts
  - **USER FLOW**: Users click bookmarklet → menu appears → select action (navigate, fetch, launch app)
  - **NAVIGATION**: Menu guides users to correct Amazon pages before fetching data
  - **MULTI-STEP WORKFLOW**: Requires 4+ clicks (not "one-click" as originally advertised)
  - **INSTALLATION**: Bookmarklet now installable from both index.html and install-bookmarklet.html
  - **DEV MODE**: Added `DEV_MODE_VIEW_OF_PROD_BUTTONS` toggle for localhost testing
    - Allows testing production URLs while running locally on http://localhost:8000/
    - Set to `false` for production deployment
    - Located in index.html and install-bookmarklet.html
  - **FILES AFFECTED**: bookmarklet-loader.js, index.html, install-bookmarklet.html

### Fixed
- **"One-Click" False Advertising** - Removed inaccurate marketing claims throughout documentation
  - **PROBLEM**: Claimed "one-click extraction" but reality is multi-step workflow via navigation menu
  - **SOLUTION**: Replaced all "one-click" language with accurate descriptions:
    - "one-click extraction" → "easy extraction with bookmarklet"
    - "with one click" → "with a simple bookmarklet"
    - "One-click bookmarklet" → "Simple bookmarklet"
    - "Just one click" → "Simple and straightforward"
  - **IMPACT**: 15+ locations updated across index.html (8 locations), install-bookmarklet.html (3 locations), README.md (5+ locations)
  - **REASONING**: User expectations now match reality - no false advertising

- **Documentation Accuracy** - Aligned all documentation with actual bookmarklet behavior
  - **"How It Works" section rewritten**: Now explicitly mentions navigation menu and multi-step process
    - Step 1: "...when you click the bookmarklet, a navigation menu appears. Select 'Go to Library Fetcher Amazon Page'..."
    - Step 3: "...click the bookmarklet, navigate to the library fetcher page using the menu, then select 'Fetch Library Data'"
  - **Standardized language**: All instances now use "when you click the bookmarklet" (not "when you click it")
  - **Terminology fix**: Changed "One-Time Setup" → "Initial Setup" (more accurate since users repeat occasionally)
  - **Typo fix**: "canvase for your" → "canvas for you" (index.html:405)
  - **Cleanup**: Removed old commented code showing previous bookmarklet order

- **README.md Structure** - Complete restructure to match index.html exactly
  - **Added missing section title**: "Extract and Organize Your Online Amazon Kindle Library Easily"
  - **Reordered sections**: Quick Start → Why ReaderWrangler? → Key Features → How It Works → Current Support → What Makes ReaderWrangler Different?
  - **Fixed GIF placement**: Moved below 2nd paragraph (was covering text)
  - **Fixed Quick Start formatting**: Each step (A, B, C, D) now on separate line
  - **Converted sections to tables**: 2x2 grid format for feature sections (matches index.html)
  - **Added "How It Works" section**: 3-step workflow matching index.html exactly
  - **Word-for-word verification**: All matching content now identical between README.md and index.html
  - **Added FreeDNS credit**: Special thanks in Notice section

### Added
- **SEO Infrastructure** - Complete search engine optimization setup
  - **sitemap.xml** - XML sitemap for Google indexing
    - Lists all 4 main pages with priority and change frequency
    - Last modified dates for freshness signals
    - Standard sitemap protocol format
  - **robots.txt** - Crawler guidance file
    - Allows all bots to crawl all pages
    - Points to sitemap.xml location
    - Disallows temp/ and test/ directories
  - **Schema.org Structured Data** - JSON-LD metadata in index.html
    - SoftwareApplication schema type
    - Feature list for rich snippets
    - Version and URL information
  - **Optimized Meta Tags** - Enhanced SEO keywords
    - Added "scrape", "visually", "extract" to target search queries
    - Goal: Rank for "tool to scrape amazon kindle books and organize visually"
    - Updated descriptions across index.html and install-bookmarklet.html
    - Added OG meta tags for social media sharing (uses icons/og-image.png)

- **Launch Strategy Documentation** - Comprehensive launch preparation
  - **REDDIT-LAUNCH-POST.md** - Reddit launch guide for r/kindle (200k+ subscribers)
    - 3 post title options (problem-focused, feature-focused, question-based)
    - Complete post body with GIF placement
    - Expected Q&A section
    - Best posting times (Tue-Thu, 9-11 AM or 6-8 PM EST)
    - Follow-up strategy for r/ebooks, r/productivity, r/selfhosted
  - **PRODUCTHUNT-LAUNCH-CHECKLIST.md** - Complete ProductHunt launch guide
    - Pre-launch timeline (2-3 weeks preparation)
    - Asset requirements (images, GIF, copy)
    - Launch day timeline (start 12:01 AM PT)
    - Maker comment template
    - Social media post templates
    - Success metrics (100-200 upvotes = great launch)

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
    - Removed "🔄 Refresh page to cancel" from dialogs (kept in console output)
    - Consistent close affordance across all states
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
