# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
