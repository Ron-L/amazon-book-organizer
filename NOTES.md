# Session Notes

This file tracks tabled discussion items, work in progress context, and open questions to maintain continuity across Claude sessions.

**Purpose:** Session state tracking only. For development rules and workflows, see SKILL-Development-Ground-Rules.md.

## Tabled Items

### Column Name Filtering Feature
- **Date**: 2025-10-17
- **Context**: User has an idea about filtering that also involves filtering column names
- **Status**: ✅ Moved to TODO.md with documented approaches (simple case, prefix syntax, smart filtering)
- **Priority**: Pending user decision on next task priority

## Current Work in Progress

### Collections & Read Status Integration - IN PROGRESS
- **Started**: 2025-10-19
- **Branch**: feature-collection-read-status-exploration
- **Status**: HTML refactor v3.2.0 merged to main, ready for integration
- **Next Steps**:
  1. ✅ HTML refactor complete (v3.2.0 released)
  2. ✅ Pulled refactored main into collections branch
  3. Integrate collections data into organizer
  4. Add visual indicators (badges) and filtering

**Background:**
- User marks finished books as "Read" in Amazon collections
- Collections fetcher complete: `collections-fetcher.js` v1.0.0
- Generated `amazon-collections.json` (505 KB) with 2,280 books
- Amazon FIONA API: `https://www.amazon.com/hz/mycd/digital-console/ajax`

**Integration Plan:**
1. Load and merge collections data with library data (merge by ASIN)
2. Visual indicators on book covers (badge/icon for collections)
3. Metadata display for each book (show which collections)
4. Filterable attribute (filter by collection/read status)
5. "Uncollected" pseudo-collection (books with `collections: []`)

**Collections Stats:**
- Total books: 2,280 (fetched in 3m 56s)
- Books with collections: 1,399 (61%)
- Books without collections: 881 (39%)
- Read status: 722 READ, 1 UNREAD, 1,557 UNKNOWN

### v3.2.1 - Book Dialog UX Fix - RELEASED ✅
- **Started**: 2025-11-01
- **Completed**: 2025-11-01
- **Released**: 2025-11-01
- **Branch**: main (no feature branch - simple fix)
- **Changes Made**:
  - Removed misleading "Fetch Description & Reviews" button from book dialog
  - Replaced with honest "Description not available" warning message
  - Removed dead `fetchBookDescription()` function (28 lines)
  - Net: -34 lines, cleaner and more honest code
- **Status**: Successfully released as project v3.1.3

### v3.2.0 - HTML Refactor - RELEASED ✅
- **Started**: 2025-10-19
- **Completed**: 2025-10-19
- **Released**: 2025-10-19
- **Branch**: feature-html-refactor (merged to main)
- **Changes Made**:
  - Split monolithic HTML (2,032 lines) into modular structure:
    - amazon-organizer.css (97 lines)
    - amazon-organizer.js (1,916 lines)
    - amazon-organizer.html (17 lines)
  - Enhanced version management:
    - Query string cache busting (?v=3.2.0)
    - Footer version display (bottom-right corner)
    - Version comments in all files
  - Implemented git pre-commit hook for automatic SKILL zip rebuilding
  - Updated README.md and CHANGELOG.md
- **Status**: Successfully merged to main, tagged as v3.2.0, and pushed to GitHub

### v3.1.2 - RELEASED ✅
- **Started**: 2025-10-18
- **Completed**: 2025-10-18
- **Released**: 2025-10-18
- **Branch**: feature-improve-error-messages (merged to main)
- **Changes Made**:
  - Improved console fetcher Phase 0 error messages with actionable recovery steps
  - Authentication/session expiration errors now tell users exactly what to do
  - No functional changes, only improved user guidance
- **Status**: Successfully merged to main, tagged as v3.1.2, and pushed to GitHub

### v3.1.1 - RELEASED ✅
- **Started**: 2025-10-17
- **Completed**: 2025-10-17
- **Released**: 2025-10-17
- **Branch**: feature-column-rename-trigger (merged to main)
- **Changes Made**:
  - Added pencil icon (✏️) that appears on hover over column names
  - Icon fades in smoothly to indicate editability
  - Double-click functionality already existed, this improves discoverability
- **Status**: Successfully merged to main, tagged as v3.1.1, and pushed to GitHub
- **Lesson Learned**: During this session, Claude violated BOTH Core Ground Rules:
  - Rule #1 (Version Management): Made code changes BEFORE incrementing version - must increment BEFORE any code edit
  - Rule #2 (Approval Workflow): Made multiple changes without waiting for explicit "yes"/"go ahead"/"proceed" approval
  - After being called out and re-reading BOTH SKILL files, behavior significantly improved
  - Root cause: Not thoroughly processing the SKILL files before starting work
  - **For future sessions**: The startup checklist at the top of this file is mandatory

### v3.1.0 - RELEASED ✅
- **Started**: 2025-10-17
- **Completed**: 2025-10-17
- **Released**: 2025-10-17
- **Branch**: feature-ux-improvements (merged to main)
- **Changes Made**:
  - Dynamic title management (title auto-updates from APP_VERSION constant)
  - Search bar improvements (magnifying glass icon, better placeholder)
  - Add Column UX redesign (button creates "New Column" with cursor ready)
  - README updates (server documentation, Skills documentation)
  - Created Claude Skills infrastructure (SKILL-*.md files, build scripts)
  - Created NOTES.md for session continuity
  - Established README.md as source of truth for git tags
- **Status**: Successfully merged to main, tagged as v3.1.0, and pushed to GitHub

## Open Questions

None at this time.

---

## Notes About This File

- **Purpose**: Maintains context across Claude sessions, especially for "tabled" discussion items
- **Commit Policy**: Always commit NOTES.md with any other changes (for backup)
- **Version Control**: Tracked in git but does NOT trigger app version increments
- **Update Frequency**: Update whenever items are tabled or work context changes significantly
