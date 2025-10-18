# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
