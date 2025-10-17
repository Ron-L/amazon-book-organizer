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

## Fetcher Improvements - High Priority

- [ ] Remove 30-second timeout from file selection
- [ ] Improve "WORKING DIRECTORY" messaging throughout
- [ ] Match opening/closing dialog terminology

## Features - Approved

- [ ] Add title & author text under book covers (~5-8K tokens)
- [ ] Multi-select with Ctrl/Shift clicking (~15-25K tokens)

## Features - Optional/Maybe

- [ ] Explore read.amazon.com/kindle-library - Collections info & reading progress
- [ ] Live reflow drag-and-drop animation (~12-18K tokens)
- [ ] 2D matrix layout (~50-80K tokens) - major refactor
- [ ] Groups/series containers (~35-55K tokens)
