---
name: readerwrangler-project
description: Project-specific context including architecture patterns, common pitfalls, file locations, and pending tasks for ReaderWrangler - a single-page React application for organizing ebook collections
---

# ReaderWrangler Project

## Project Context

**What it is:** Single-page React application for organizing ebook collections using drag-and-drop columns (like Trello). Users can load their ebook library from a JSON export (currently supports Amazon Kindle) and organize books into custom categories.

**Current Version:** v3.5.0.a (in development)

**Files:**
- `readerwrangler.html` - Main SPA (React + Tailwind CSS + IndexedDB)
- `CHANGELOG.md` - Detailed version history with Technical Notes
- `TODO.md` - Pending tasks and improvements
- `images/` - Status icons (busy.png, empty.png, fresh.png, stale.png, question-mark.png)
- `amazon-manifest.json` - Metadata file (totalBooks count) for stale detection
- User's library JSON file (not in git) - Contains full book data

## Tech Stack

- **Frontend:** React 18 (via CDN), Tailwind CSS (via CDN), Babel (via CDN)
- **Storage:** IndexedDB for book data, localStorage for UI state/settings
- **File Format:** Single HTML file (no build process)
- **Status Monitoring:** Polls manifest file every 60s to detect new books

## Key Architecture Patterns

### 1. Version Management
- Version defined in ONE place: `APP_VERSION` constant (line ~3)
- Browser title set dynamically: `document.title = \`ReaderWrangler ${APP_VERSION}\``
- No need to update title tag manually

### 2. Data Flow
- User loads library → Parse JSON → Store in IndexedDB
- UI state (columns, book positions) → localStorage
- Manifest polling → Compare totalBooks vs loaded books → Update status

### 3. Status Icons
- Pre-load ALL 5 icons in DOM simultaneously
- Toggle visibility with CSS `display: none/inline-block`
- NEVER change `src` attribute (causes 30-60s browser loading lag)
- See CHANGELOG Technical Notes for failed approaches

### 4. Terminology
- Use "load" not "sync" (user loads files, not syncing with service)
- "Library loaded" not "Last synced"
- "Load Updated Library" not "Sync Now"

## Common Pitfalls (See CHANGELOG Technical Notes)

### 1. Icon Display Lag
- ❌ Changing `src` attribute causes 30-60s lag
- ❌ Using `key` prop causes blank icon during mount/unmount
- ❌ Cache-busting on image src doesn't help
- ✅ Pre-load all icons, toggle CSS display property

### 2. Manifest Caching
- ❌ Browser caches manifest.json aggressively
- ✅ Use cache-busting query param: `amazon-manifest.json?t=${Date.now()}`
- ✅ Clear `manifestData` state in `clearEverything()`

### 3. Ground Rule Violations
- ❌ Implementing during discussion ("should we?" is NOT approval)
- ❌ Forgetting to increment version letter before changes
- ❌ Making git operations without asking first

## File Locations

- Version constant: `amazon-organizer.js` line ~3
- Status icon rendering: `amazon-organizer.js` line ~1258-1302
- Manifest fetch with cache-busting: `amazon-organizer.js` line ~254
- Clear everything function: `amazon-organizer.js` line ~683

## Pending Tasks (from TODO.md)

1. Search improvements (partially done in v3.1.0.a, uncommitted)
2. Add Column UX redesign (follows Windows File Explorer pattern)
