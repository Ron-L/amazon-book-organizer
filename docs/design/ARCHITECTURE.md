# ReaderWrangler Architecture

## Tech Stack

- **Frontend:** React 18 (via CDN), Tailwind CSS (via CDN), Babel (via CDN)
- **Storage:** JSON files for book data, IndexedDB for organization state (see Storage Architecture below)
- **File Format:** Single HTML file (no build process)

## Data Flow

- User loads library → Parse JSON (amazon-library.json) → Store in IndexedDB
- UI state (folders, organization) → localStorage
- Book data includes collections metadata (consolidated in amazon-library.json)

## Storage Architecture Rationale

### Why Two Storage Mechanisms?

ReaderWrangler uses **IndexedDB** for organization data and **JSON files** for book data. This isn't accidental complexity—each serves a distinct purpose.

### The Cross-Domain Problem

The bookmarklet runs on Amazon.com pages to access library data, while the App runs on readerwrangler.com. Each origin has its own isolated IndexedDB instance (browser security model). Data cannot be shared directly between them.

**Initial approach (abandoned):** Store everything in IndexedDB
**Problem:** Scripts on amazon.com couldn't share data with App on readerwrangler.com

### The Size Problem

Book data with descriptions and reviews can be massive for large libraries. IndexedDB has practical size limits that were exceeded during testing.

### Current Solution

| Data Type | Storage | Why |
|-----------|---------|-----|
| Book data (from imports) | JSON file | Cross-domain transfer, large size support |
| Organization (columns, positions, dividers) | IndexedDB | Seamless persistence, auto-save on every action |

### Why Not JSON-Only for Everything?

The File System Access API requires user interaction (file picker) to access files. File handles don't persist across page reloads.

**If org data were in JSON only:**
- User would need to pick the file on every app load
- Or keep the browser tab open forever

**With IndexedDB:**
- App loads → reads org data instantly → no user interaction needed
- Every drag/drop auto-saves immediately

### Backup/Restore: The Best of Both

- **IndexedDB**: Runtime persistence (automatic, seamless)
- **JSON Backup/Restore**: Explicit export/import for portability, backup, sharing

This hybrid approach provides "just works" UX for daily use while maintaining data portability.

## Version Management

Each code file has its own version constant for tracking changes during code/test cycles:
- **ORGANIZER_VERSION** in readerwrangler.js - Main organizer application
- **FETCHER_VERSION** in fetcher files - Data fetching utilities

Version letter suffix (a→b→c) increments with each code/test iteration, removed before release.

Project/release version is maintained in README.md badge (single source of truth for releases).

## Status Icons (Critical Pattern)

- Pre-load ALL 5 icons in DOM simultaneously
- Toggle visibility with CSS `display: none/inline-block`
- **NEVER change `src` attribute** (causes 30-60s browser lag)
- See CHANGELOG Technical Notes for failed approaches

### Icon Display Lag (Lessons Learned)
- Changing `src` attribute causes 30-60s lag
- Using `key` prop causes blank icon during mount/unmount
- Cache-busting on image src doesn't help
- Solution: Pre-load all icons, toggle CSS display property

## Cache-Busting

### Main Application (readerwrangler.html + readerwrangler.js)

**Production cache busting** (version-based):
- `APP_VERSION` defined in readerwrangler.html (line ~30)
- Dynamic script loading: `readerwrangler.js?v={APP_VERSION}`
- Updated on each release to force browsers to fetch new code
- Validation: readerwrangler.js checks cache-buster matches its APP_VERSION, warns if mismatched

**Developer workflow:**
- During alpha development: Cache-buster stays at current APP_VERSION
- Use **hard refresh** (Ctrl+Shift+R / Cmd+Shift+R) to see code changes
- At release: Update APP_VERSION in readerwrangler.html to new version
- Version validation prevents accidental mismatches

**Why not Date.now() for production?**
- Would bypass cache on every page load
- Measured: 13 seconds (cached) vs 17 seconds (uncached) load time
- Version-based cache busting only invalidates on actual releases

### Navigator Scripts (bookmarklet-nav-hub.js)

**Environment-based cache busting:**
```javascript
const IS_DEV_MODE = TARGET_ENV !== 'PROD';  // Line 46
const cacheBuster = IS_DEV_MODE ? '?v=' + Date.now() : '';  // Line 214
```

**Behavior:**
- LOCAL: `Date.now()` cache busting (rapid iteration)
- DEV: `Date.now()` cache busting (GitHub Pages testing)
- PROD: No cache busting (stable, cached for users)

## Terminology

- Use "load" not "sync" (user loads files, not syncing with service)
- "Library loaded" not "Last synced"
- "Load Updated Library" not "Sync Now"

## Three-Environment Testing

**Environments:**
| Environment | URL | Bookmarklet | Use Case |
|-------------|-----|-------------|----------|
| LOCAL | localhost:8000 | ⚠️ LOCAL (orange) | Rapid iteration, instant feedback |
| DEV | ron-l.github.io/readerwranglerdev | 🔧 DEV (blue) | Test GitHub Pages deployment |
| PROD | readerwrangler.com | 📚 ReaderWrangler (purple) | Production users |

**Bookmarklet Behavior:**
- LOCAL bookmarklet → loads from localhost:8000
- DEV bookmarklet → loads from readerwranglerdev repo
- PROD bookmarklet → loads from readerwrangler.com (or github.io fallback)

**Why three bookmarklets?**
Bookmarklets run on Amazon.com, not our servers. They can't detect if you're a developer. Solution: Install all three from localhost installer, then choose which environment to test.

**Testing workflow:**
1. Start local server: `python -m http.server 8000`
2. Visit localhost:8000/install-bookmarklet.html (shows all 3)
3. Drag bookmarklets to toolbar
4. On Amazon, click appropriate bookmarklet to test that environment
