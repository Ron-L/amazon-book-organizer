# Mobile Viewer Design

## Overview

A purpose-built mobile UI for ReaderWrangler, scoped as a **read-only viewer** — not a responsive redesign of the desktop app. The desktop app's interaction model (drag-drop, multi-select, context menus, resizable panes) is fundamentally mouse-driven. Mobile needs its own component tree with touch-native interactions.

**Scope**: Browse, search, sort, and view a book library on phone-sized screens.
**Non-scope**: Editing, folder management, export, bulk operations, column customization.

---

## Design Principles

1. **Viewer, not organizer** — The primary mobile use case is "show me my next reads" or "do I already own this book?" Heavy organization stays on desktop.
2. **Separate file, shared data** — New `mobile.js` file with its own component tree. Reuses `storage.js`, `uiHelpers.js`, and the same IndexedDB data. No changes to `readerwrangler.js`.
3. **Cover-first** — Books are identified visually by covers, not by text rows. Inspired by Kindle/Libby library screens, not file managers. The existing desktop cover view (line ~10405) already renders cover + truncated title — the same visual pattern, just with different interaction handlers.
4. **Touch-native interactions** — Tap, long-press, swipe. No hover states, no drag-drop, no keyboard shortcuts.
5. **Read-only for v1** — No book data editing in the initial version. All curation happens on desktop. Mobile does write user preferences (theme, view mode, sort, filters) to localStorage and Import Backup to IndexedDB.

---

## Architecture

```
readerwrangler.html
  |
  |-- detect viewport width
  |     |
  |     |-- >= 768px  --> readerwrangler.js  (unchanged)
  |     |-- < 768px   --> mobile.js          (new)
  |
  |-- storage.js     (shared, unchanged)
  |-- uiHelpers.js   (shared, unchanged)
```

Detection via `window.matchMedia('(max-width: 767px)')` in `readerwrangler.html`. Provide a "Desktop mode" toggle that persists in localStorage for users who want to force the full UI on a tablet or large phone.

Sorting/filtering logic currently inline in `readerwrangler.js` (~lines 10204-10266) would be duplicated initially in mobile.js. Future refactor could extract to a shared `bookHelpers.js`, but that's not a prerequisite for v1.

**File size target**: mobile.js should be <2K lines. Desktop is 12K+ because of drag-drop, modals, column management, and editing — none of which mobile needs.

**No new dependencies**: React 18, Tailwind CDN, same stack.

---

## Pixel Budget Analysis

### Vertical (phone portrait, 667-844px typical)

| Element | Height |
|---------|--------|
| Header bar | 48px |
| Footer bar (sort/filter/count) | 44px |
| **Available for content** | **575-750px** |
| 3 rows of covers (90px cover + 36px text) | 378px |
| Remaining breathing room | 197-372px |

Three rows of covers with titles fit comfortably. Room for a shelf label row above each section in dashboard mode.

### Horizontal (phone portrait, 375-414px typical)

| Element | Width |
|---------|-------|
| Full screen | 375-414px |
| 3 covers at ~105px + 2 gaps (12px) + padding (18px) | ~357px |
| Folder drawer (overlay) | ~250px |

3 covers at 105px wide fits a 375px screen. At the 60x90 absolute minimum, you could fit 4-5 per row, but 3 at ~105px gives readable titles and comfortable tap targets.

**Landscape** (~667px wide): 5 covers at ~113px + gaps. Readable.

### Folder Drawer Width

"Larry Bond's First Team (11)" needs ~220px with padding. A 250px drawer width handles long folder names comfortably. Drawer overlays content (not side-by-side).

---

## Screen Mockups

### Home Screen — Dashboard with Shelves

```
+------------------------------------------+
|  [=] ReaderWrangler       [Search] [⋮]  |
+------------------------------------------+
|                                          |
|  Next Reads                         (3)  |
|  +------+ +------+ +------+             |
|  |      | |      | |      |             |
|  |cover | |cover | |cover |             |
|  |      | |      | |      |             |
|  +------+ +------+ +------+             |
|  Title..  Title..  Title..               |
|  Author   Author   Author               |
|                                          |
|  Recently Added                     (5)  |
|  +------+ +------+ +------+ +----+      |
|  |      | |      | |      | |    | -->  |
|  |cover | |cover | |cover | |cov |      |
|  |      | |      | |      | |    |      |
|  +------+ +------+ +------+ +----+      |
|  Title..  Title..  Title..               |
|  Author   Author   Author               |
|                                          |
|  Sci-Fi                            (42)  |
|  +------+ +------+ +------+ +----+      |
|  |      | |      | |      | |    | -->  |
|  |cover | |cover | |cover | |cov |      |
|  |      | |      | |      | |    |      |
|  +------+ +------+ +------+ +----+      |
|  Title..  Title..  Title..               |
|  Author   Author   Author               |
|                                          |
+------------------------------------------+
```

- **Top shelf**: "Next Reads" — populated from a user-configured tag (see Configurable Shelves below). Shows all books with that tag. If no tag configured or no books tagged, shelf is hidden.
- **Second shelf**: "Recently Added" — sorted by dateAdded descending, top N books.
- **Remaining shelves**: One per top-level folder (in desktop manual order), showing books aggregated from the folder and all its subfolders (up to SHELF_LIMIT=20). Non-series books first, then each series in desktop manual order. Tap shelf title to open full folder grid view.
- **Series label bars** (future enhancement): Within each folder shelf, a thin non-scrolling label bar appears under each series' books showing the series name. This gives "which series am I looking at?" context without per-book badges. Covers scroll horizontally above the label. "Show All" card at end navigates to folder view. See Phase 5 Bug Tracking for design discussion.
- Netflix/Spotify-style horizontal shelves give an at-a-glance library summary.

### Empty State (First Run / No Data)

Shown when IndexedDB has no books — either first visit on a new device, or after a reset.

```
+------------------------------------------+
|  [=] ReaderWrangler               [⋮]   |
+------------------------------------------+
|                                          |
|                                          |
|              +----------+                |
|              |          |                |
|              |   books  |                |
|              |   icon   |                |
|              +----------+                |
|                                          |
|    Welcome to ReaderWrangler Mobile      |
|                                          |
|    This is the mobile companion to       |
|    the desktop organizer.                |
|                                          |
|    To browse your library here:          |
|    1. Export a backup from desktop        |
|       (File > Export Backup)             |
|    2. Transfer the file to your phone    |
|       (email, cloud drive, AirDrop)      |
|    3. Tap Import below                   |
|                                          |
|    +----------------------------------+  |
|    |         Import Backup            |  |
|    +----------------------------------+  |
|                                          |
+------------------------------------------+
```

- Single centered call-to-action with clear 3-step instructions
- Folder drawer is accessible but shows empty tree
- After successful import, transitions immediately to dashboard
- Import is also always available via the app menu `[⋮]` for subsequent re-syncs

### Folder View — Cover Grid

Reached by tapping a shelf title on the dashboard, or navigating via the folder drawer.

```
+------------------------------------------+
|  [<] Sci-Fi > Hard SF     [Search] [⋮]  |
+------------------------------------------+
|                                          |
|  +--------+  +--------+  +--------+     |
|  |        |  |        |  |        |     |
|  | cover  |  | cover  |  | cover  |     |
|  |        |  |        |  |        |     |
|  +--------+  +--------+  +--------+     |
|  Title...    Title...    Title...        |
|  Author      Author      Author         |
|                                          |
|  +--------+  +--------+  +--------+     |
|  |        |  |        |  |        |     |
|  | cover  |  | cover  |  | cover  |     |
|  |        |  |        |  |        |     |
|  +--------+  +--------+  +--------+     |
|  Title...    Title...    Title...        |
|  Author      Author      Author         |
|                                          |
|  +--------+  +--------+  +--------+     |
|  |        |  |        |  |        |     |
|  | cover  |  | cover  |  | cover  |     |
|  |        |  |        |  |        |     |
|  +--------+  +--------+  +--------+     |
|  Title...    Title...    Title...        |
|  Author      Author      Author         |
|                                          |
+------------------------------------------+
|  Sort: Name ^  |  Filter  |  42 books    |
+------------------------------------------+
```

- **Header**: Back button [<] returns to dashboard. Breadcrumb shows folder path. Search and help icons.
- **Grid**: 3-wide cover grid (~9 books visible per screen). Cover aspect ratio 2:3. Title truncated 1 line, author truncated 1 line.
- **Footer bar**: Sort picker, filter toggle, book count. Sticky at bottom.
- **Subfolders**: Shown as folder tiles before books (same pattern as desktop cover view, line ~10191), tap to navigate deeper.
- **Scroll position**: Preserved when returning from book detail view.

### Folder Drawer (hamburger menu)

```
+---------------------------+
|  [X]  Folders             |
+---------------------------+
|                           |
|  > My Library             |
|    > Inbox          (3)   |
|    > Sci-Fi        (42)   |
|      > Hard SF     (18)   |
|      > Space Opera (24)   |
|    > Fantasy       (31)   |
|    > Non-Fiction   (15)   |
|  > All Books      (128)   |
|                           |
+---------------------------+
```

- Slides in from left as overlay (not push), with backdrop dimming
- Tap folder to navigate, drawer auto-closes
- Book counts shown in parentheses
- Indentation shows hierarchy
- Read-only: no drag-drop, rename, create, or delete
- **Mutual exclusion**: Only one overlay open at a time. If the app menu is open and user taps `[=]`, the app menu closes and the folder drawer opens (and vice versa).

### App Menu (three-dot menu)

Accessed via `[⋮]` icon in the header. Contains actions and settings — distinct from the folder drawer which is purely navigation.

```
+------------------------------------------+
|                        +---------------+ |
|                        |  [X]  Menu    | |
|                        +---------------+ |
|                        |               | |
|                        | Import Backup | |
|                        | ───────────── | |
|                        | View: Cover   | |
|                        | Theme: Dark   | |
|                        | Deals Only    | |
|                        | Show Hidden   | |
|                        | Desktop Mode  | |
|                        | ───────────── | |
|                        | Help & About  | |
|                        |               | |
|                        +---------------+ |
+------------------------------------------+
```

- Slides in from right as overlay, with backdrop dimming
- Tap item to act, menu auto-closes (except toggles which update in-place)
- **Import Backup**: Opens file picker for backup JSON. On success, replaces all data and transitions to dashboard. Same format and behavior as desktop restore.
- **View**: Toggles between Cover Grid and List view
- **Theme**: Cycles through available themes (Light, Dark, High Contrast variants)
- **Deals Only**: Toggle — shows only books with price at or below goal
- **Show Hidden**: Toggle — reveals books hidden on desktop
- **Desktop Mode**: Forces full desktop UI on this device (persists in localStorage)
- **Help & About**: Version info, link to user guide

### Book Detail View (tap a book)

```
+------------------------------------------+
|  [<] Back         Sci-Fi > Hard SF       |
+------------------------------------------+
|                                          |
|         +----------------+               |
|         |                |               |
|         |                |               |
|         |     cover      |               |
|         |    (large)     |               |
|         |                |               |
|         |                |               |
|         +----------------+               |
|                                          |
|  The Three-Body Problem                  |
|  by Liu Cixin                            |
|                                          |
|  Rating: *****                           |
|  My Rating: ****                         |
|  Series: Remembrance of Earth's Past #1  |
|                                          |
|  Tags: [hard-sf] [first-contact]         |
|                                          |
|  Collections: Hugo Winners               |
|                                          |
|  Notes:                                  |
|  "Fascinating exploration of the Fermi   |
|   paradox through Cultural Revolution    |
|   era China..."                          |
|                                          |
|  Status: Owned | Wishlist                |
|  Price: $9.99 (Goal: $4.99)             |
|                                          |
+------------------------------------------+
```

- Read-only metadata display — all fields the desktop book dialog shows
- Back button returns to grid/dashboard at same scroll position
- No edit capabilities in v1

### Search (expanded)

```
+------------------------------------------+
|  [<]  [______search text______]  [Clear] |
+------------------------------------------+
|                                          |
|  +--------+  Title of Book 1            |
|  | cover  |  Author Name                |
|  | (small)|  ***** | Sci-Fi             |
|  +--------+                              |
|  ----------------------------------      |
|  +--------+  Title of Book 2            |
|  | cover  |  Author Name                |
|  | (small)|  **** | Fantasy              |
|  +--------+                              |
|  ----------------------------------      |
|  +--------+  Title of Book 3            |
|  | cover  |  Author Name                |
|  | (small)|  *** | Non-Fiction           |
|  +--------+                              |
|                                          |
+------------------------------------------+
```

- Search results switch to **list layout** (small cover left + multi-line text right) for information density — when searching, users need to distinguish books by metadata, not just covers.
- Searches across title, author, series, tags, notes.
- Instant filter as you type (same as desktop behavior).
- **Key use case**: "I'm on vacation (no desktop) and want to check if this Kindle sale book is one I already own." Faster and more reliable than checking the Kindle app, which has known gaps in Amazon's database.

### Sort Picker (bottom sheet)

```
+------------------------------------------+
|                                          |
|          --- drag handle ---             |
|                                          |
|  Sort by:                                |
|                                          |
|  ( ) Name           [A-Z] [Z-A]         |
|  (*) Author         [A-Z] [Z-A]         |
|  ( ) Rating         [Hi]  [Lo]          |
|  ( ) My Rating      [Hi]  [Lo]          |
|  ( ) Date Added     [New] [Old]          |
|  ( ) Series         [A-Z] [Z-A]         |
|  ( ) Manual Order                        |
|                                          |
+------------------------------------------+
```

- Bottom sheet slides up (standard mobile pattern)
- Radio select for sort field, toggle for direction
- Dismisses on selection or swipe down

---

## Configurable Shelves (Tag-Based)

Rather than a hardcoded "Next Reads" feature, the user configures which tag(s) appear as shelves on the mobile dashboard. This is set on desktop in settings and stored in the shared IndexedDB data.

**How it works:**
- On desktop, user goes to Settings and picks one or more tags to "pin" as mobile shelves
- Stored as `mobileShelfTags: ["next-read", "book-club"]` in settings
- Mobile dashboard reads this setting and creates a horizontal shelf for each tag
- Each shelf shows all books with that tag, sorted by the shelf's configured sort (or manual order within the tag)
- If no tags are configured, the dashboard skips straight to "Recently Added" and folder shelves

**Why option C (configurable) over A (new field) or B (reserved tag):**
- No schema changes needed — tags already exist
- Flexible: "Next Read", "Beach Trip", "Book Club March", whatever the user wants
- Multiple shelves possible — each pinned tag becomes its own shelf
- No magic strings — user chooses explicitly

---

## Touch Interactions

| Gesture | Action |
|---------|--------|
| **Tap book** (grid) | Open detail view |
| **Tap book** (search results) | Open detail view |
| **Tap shelf title** (dashboard) | Open folder in full grid view |
| **Tap folder** (drawer) | Navigate to folder, close drawer |
| **Horizontal swipe** (shelf) | Scroll shelf to see more books |
| **Tap sort** (footer) | Open sort bottom sheet |
| **Tap filter** (footer) | Open filter bottom sheet |
| **Tap [<]** | Back to previous screen |
| **Tap [=]** | Open folder drawer (closes app menu if open) |
| **Tap [⋮]** | Open app menu (closes folder drawer if open) |
| **Tap backdrop** | Close whichever overlay is open |

### Future (v2+)
| Gesture | Action |
|---------|--------|
| **Long-press book** | Action sheet (mark read/unread, view in folder) |
| **Swipe book left** | Quick action: mark read/unread |
| **Pull down** | Refresh from storage |

---

## User Stories

### Core (v1)

1. **"Do I own this?"** — As a user on vacation without my desktop, I want to search my library from my phone to check if a Kindle sale book is one I already own. The Kindle app is unreliable for this due to gaps in Amazon's database.
2. **"What should I read next?"** — As a user, I want to see my "Next Reads" shelf (from my configured tag) so I can pick what to read tonight.
3. **"What's new?"** — As a user, I want to see recently added books so I know what's new in my library.
4. **"Browse a folder"** — As a user, I want to browse a specific folder (e.g., "Sci-Fi") to see what's in it, with covers large enough to recognize books visually.
5. **"Book details"** — As a user, I want to tap a book and see its full details — cover, author, series, rating, notes, tags.
6. **"Get my library on my phone"** — As a user, I want to import a backup from my desktop so I can browse my library on my phone. I export from desktop, transfer the file (email/cloud/AirDrop), and import on mobile.
7. **"Re-sync after organizing"** — As a user, I want to re-import an updated backup after organizing on desktop so my mobile view stays current.

### Secondary (v1 if easy, else v2)

8. **"Sort by rating"** — As a user, I want to sort a folder by rating to find my highest-rated unread books.
9. **"Filter by tag"** — As a user, I want to filter by tag to see all my "hard-sf" books across folders.
10. **"Wishlist check"** — As a user, I want to see which books are on my wishlist vs owned so I know what to buy.

### Future (v2+)

11. **"Mark read"** — As a user, I want to mark a book as read from my phone (not critical — won't read that many before I'm back at desktop).
12. **"Configure shelves"** — As a user, I want to configure which tags appear as shelves on my mobile home screen.
13. **"Quick notes"** — As a user, I want to add a quick note to a book after finishing it.
14. **"Reading stats"** — As a user, I want to see my reading stats (books read this month/year).

---

## What's Included vs Excluded

### Included (v1)
- Empty state with import instructions (first-run experience)
- Import Backup (restore from desktop backup JSON)
- App menu `[⋮]` with Import, View toggle, Theme, Deals Only, Show Hidden, Desktop Mode, Help
- Dashboard home screen with configurable tag-based shelves + folder shelves
- Cover grid folder view (3-wide portrait, 5-wide landscape)
- Folder drawer navigation (hamburger menu)
- Book detail view (read-only, all metadata)
- Sort picker (all existing sort fields)
- Search with instant filter
- Filter by tag, collection, read status
- Breadcrumb navigation

### Excluded (stay desktop-only)
- All data editing (book metadata, marking read, tagging, notes)
- Drag-drop reordering
- Multi-select bulk operations
- Folder create/rename/delete/reorder
- Column customization (list view)
- Export (no new data to export — mobile is read-only)
- Settings/preferences management (except mobile shelf config on desktop)
- Bookmarklet/scraper operations

### Future (v2+)
- Mark read/unread (first write capability)
- Long-press action sheets
- Swipe quick actions
- Book editing (limited: notes, my rating)
- Offline caching (service worker)
- Configurable shelf management on mobile itself

---

## Data Transfer & Import

### The Problem

Mobile is typically a different device than desktop. The phone's browser has its own IndexedDB — empty by default. Users need a way to get their library data onto their phone.

### Solution: Backup Import

Reuse the existing backup/restore mechanism. Desktop already exports a complete backup JSON containing books, folders, folder assignments, tags, settings, and wishlist. Mobile imports this same file.

**Workflow:**
1. **Desktop**: File > Export Backup → saves `readerwrangler-backup-YYYY-MM-DD.json`
2. **Transfer**: User sends file to phone (email attachment, Google Drive, iCloud, AirDrop, etc.)
3. **Mobile**: Tap "Import Backup" (empty state button or app menu `[⋮]`) → file picker → select JSON
4. **Result**: Data loads into IndexedDB, mobile transitions to dashboard

**Re-sync workflow:**
Same 3 steps. Import replaces all existing data (same as desktop restore). Desktop is always the source of truth.

### Design Decisions

- **Backup only, not library file** — The raw amazon-library.json is nearly the same size (~42 MB) but lacks organizational state (folders, tags, settings). No reason to support it.
- **Full replace on import** — No merge logic. Desktop is source of truth. Simpler and avoids conflict resolution.
- **No book data edits in v1** — Mobile writes user preferences (theme, view mode, sort, filters) to localStorage and Import Backup to IndexedDB, but never edits individual book data.

---

## Landing Page (index.html) on Mobile

The landing page is a separate marketing/info page — not the app. It should be viewable on any device since users may discover ReaderWrangler on their phone.

**Responsive adjustments:**
- "See the Difference" before/after images: stack vertically instead of side-by-side
- Video: scales to viewport width (`max-width: 100%`)
- General layout: single-column stacking on narrow screens

**Bookmarklet section:**
Add a note for mobile visitors: "Bookmarklet installation requires a desktop browser. Set up ReaderWrangler on your desktop, then use the mobile viewer to browse your library on the go."

**Note:** The viewport detection (`< 768px → mobile.js`) only applies to `readerwrangler.html` (the app). `index.html` is a standard responsive page — no JS routing needed.

---

## PWA: Add to Home Screen

Adding a web app manifest lets Android (and iOS) users add ReaderWrangler to their home screen as an app-like shortcut — no browser chrome, own icon, standalone window.

**Required files:**
- `manifest.json` — App metadata (name, icons, theme color, display mode)
- App icons — 192x192 and 512x512 PNG (minimum for Android)
- `<link rel="manifest" href="manifest.json">` in `readerwrangler.html`

**Example `manifest.json`:**
```json
{
  "name": "ReaderWrangler Mobile",
  "short_name": "ReaderWrangler",
  "start_url": "/readerwrangler.html",
  "display": "standalone",
  "background_color": "#1a1a2e",
  "theme_color": "#1a1a2e",
  "icons": [
    { "src": "icons/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "icons/icon-512.png", "sizes": "512x512", "type": "image/png" }
  ]
}
```

**What this gives us:**
- Android: "Add to Home Screen" creates an app icon, launches in standalone mode (no URL bar, no tabs)
- iOS: Similar via Safari "Add to Home Screen" (reads manifest or falls back to `<meta>` tags)
- Desktop Chrome: Optional "Install app" prompt (nice-to-have, not a goal)

**What we skip for v1:**
- Service worker (offline caching) — not needed yet, data is in IndexedDB
- Push notifications — not relevant
- Install prompt interception — let the browser handle it natively

**Effort:** ~30 minutes. Create manifest, export two icon sizes, add link tag.

---

## Technical Notes

- **Detection**: `window.matchMedia('(max-width: 767px)')` in `readerwrangler.html`. Secondary signal: `'ontouchstart' in window`. "Desktop mode" toggle persists in `localStorage`.
- **State management**: Same React 18 + hooks pattern as desktop. Reads from same IndexedDB via `storage.js`.
- **CSS**: Tailwind CDN (same as desktop). Mobile-first utility classes.
- **File size target**: mobile.js < 2K lines.
- **No new dependencies**: React 18, Tailwind CDN, same stack.
- **Scroll preservation**: When returning from detail view to grid, restore `scrollTop` from state.
- **Cover minimum size**: 60x90px absolute minimum. Target ~105x158px on a 375px-wide phone (3-wide grid).
- **Sorting/filtering**: Duplicate logic from desktop initially. Extract to shared module later as a separate refactor.

---

## Implementation Checklist

Ordered by dependency. Each phase builds on the previous.

### Phase 1: Foundation — COMPLETE

#### Implementation
- [x] Viewport detection in readerwrangler.html
- [x] Create `mobile.js` skeleton (React 18, MobileApp component)
- [x] Data loading from IndexedDB via `storage.js`
- [x] Theme support (data-theme CSS variables)
- [x] App version display
- [x] PWA manifest (manifest.json, app icons)

#### Verification — All OK

---

### Phase 2: Empty State & Import — COMPLETE

#### Implementation
- [x] Empty state screen (welcome + 3-step instructions + Import button)
- [x] Import Backup handler (file picker, JSON validation, IndexedDB write)
- [x] Import error handling

#### Verification — All OK

---

### Phase 3: Header & Overlays — COMPLETE

#### Implementation
- [x] Header bar component (hamburger, title/breadcrumb, search, dots menu)
- [x] Overlay manager (mutual exclusion, backdrop)
- [x] Folder drawer (slides from left, folder tree, tap to navigate)
- [x] App menu (slides from right, toggles, import, desktop mode)
- [x] Menu toggle persistence (localStorage)

#### Verification — All OK

---

### Phase 4: Dashboard Home — COMPLETE

#### Implementation
- [x] Recently Added shelf
- [x] Folder shelves (one per top-level folder, desktop manual order, aggregating subfolder books)
- [ ] Tag-based shelves (deferred — requires desktop settings UI first)
- [x] Cover card component (105px, 2:3 aspect, placeholder for missing covers)
- [x] Shelf component (label + count, horizontal scroll)

#### Verification — All OK

---

### Phase 5: Navigation, Folder View & Book Detail — IN PROGRESS (bug fixes)

*Note: Original design split this across Phases 5 and 6. Implemented together.*

#### Implementation
- [x] Navigation stack (navStack with view/folderId/bookId/scrollY)
- [x] Cover grid layout (folder view, 105px fixed columns, subfolder tiles before books)
- [x] Breadcrumb navigation (folder path in header, back button)
- [x] Scroll position preservation (vertical + horizontal shelf scroll)
- [x] Book detail view (cover, title, author, stars, series, tags, collections, notes, price, reviews)
- [x] Back navigation (stack-based, browser back button support)
- [x] Conditional fields (only show fields with data)
- [ ] Footer bar (sort/filter/count) — deferred to Phase 6
- [ ] Sort picker bottom sheet — deferred to Phase 6
- [ ] Filter bottom sheet — deferred to Phase 6
- [x] **P5-V2-E** Shelf title chevron needs to be more visible (especially dark mode) — fixed alpha.34-37 (replaced › with 2x2 grid SVG icon, 14px filled, --text-secondary)

#### Verification

**V1. Dashboard → book detail** — Tap book → detail view → back to dashboard
- [x] OK (after fixes) — alpha.7 through alpha.10

  Issues found:
  - [x] **P5-V1-A** Book detail view can't scroll down — fixed alpha.7 (`body { overflow: auto !important }`)
  - [x] **P5-V1-B** Dashboard can't scroll vertically — fixed alpha.7 (same root cause)
  - [x] **P5-V1-C** Horizontal shelf scroll position not preserved on back — fixed alpha.7
  - [x] **P5-V1-D** Vertical scroll position not preserved on back — fixed alpha.9/10 (read scrollY outside setState)
  - [x] **P5-V1-E** Dashboard shelves in alphabetical order — fixed alpha.11 (removed .sort())
  - [x] **P5-V1-F** Only 5 of 12 folders visible (0 top-level books = hidden) — fixed alpha.12
  - [x] **P5-V1-G** Shelves only show direct books, not subfolder books — fixed alpha.12 (collectDescendantBookIds)

**V2. Dashboard → folder** — Tap shelf title → folder grid → back to dashboard
- [ ] Issues remain

  Issues found:
  - [x] **P5-V2-A** Covers too large in folder view — fixed alpha.13 (105px fixed columns)
  - [x] **P5-V2-B** Dark mode: hard to distinguish cover boundaries — fixed alpha.21 (directional shadow 4px 4px 8px 2px rgba(128,128,128,0.5) on covers + folder tiles, subtle border in dark mode)
  - [x] **P5-V2-C** Dashboard shelf books are flat/unstructured (no series context) — fixed alpha.22-29. Series label bars (warm amber, floating, scroll-tracking), sections (standalone + series), Show All/Less expand-in-place, Collapse All chevron in header, expanded state persisted to localStorage. See design section below.
  - [x] **P5-V2-D** Navigation stack lost on page refresh — fixed alpha.30-33. navStack persisted to `readerwrangler-mobile-nav` localStorage key (scroll positions stripped). Validated against loaded data on mount; stale IDs fall back to dashboard. Hash-based browser back (`#nav-2`, `#nav-3`) replaces pushState/popstate for reliability across environments.

**V3. Folder → subfolder** — Subfolder tiles above books, tap to navigate deeper
- [ ] Issues remain

  Issues found:
  - [x] **P5-V3-A** Folder tiles vs cover width mismatch — fixed alpha.14-21 (amber/canary bg, 📁 emoji at 50cqw, 1px amber border, matching directional shadow)

**V4. Folder → book detail** — Tap book in folder grid → detail → back to folder
- [x] OK

**V5. Drawer → folder** — Hamburger → tap folder → drawer closes, folder opens
- [ ] Issues remain

  Issues found:
  - [x] **P5-V5-A/B/C** Drawer restructured alpha.40-48. Drawer: Dashboard (clickable header) → All Books (📚, grid view) → Inbox (📥, grid view) → user folders. Dashboard shelf order matches. "Recently Added" renamed to "All Books" (all books sorted by date). FolderView handles __recent__ as virtual folder. Hamburger visible in all views (folder, detail) alongside back arrow. Breadcrumb replaced with current folder name only (fixes P5-V8-A overflow). View/List toggle disabled. Custom draggable scrollbar with tap-to-jump on expanded shelves.

**V6. Browser back button** — Works same as back arrow
- [x] OK

**V7. Deep navigation** — Dashboard → folder → subfolder → detail → back × 3
- [x] OK (after fixes) — covered by P5-V1-C and P5-V1-D

**V8. Filters in folder view** — Toggle Deals Only / Show Hidden
- [ ] Not fully tested (John Scalzi dots menu issue blocked testing)

  Issues found:
  - [x] **P5-V8-A** Long breadcrumb pushes header dots menu off screen — fixed alpha.46-48. Breadcrumb replaced with current folder name only. Hamburger always visible in all views; no more full-path breadcrumb to overflow.

**V9. Empty folder** — Folder with 0 books shows message
- [x] OK

**V10. Dark mode** — All new components render correctly
- [x] OK (general) — specific cover spacing issue tracked under P5-V2-B

**V11. Star ratings** — Half stars display correctly
- [x] OK

**V12. Tags** — Display as blue chips with correct labels
- [x] OK

---

### Phase 6: Sort, Filter & Search (not started)

- [ ] Footer bar (sort/filter/count) in folder view
- [ ] Sort picker bottom sheet
- [ ] Filter bottom sheet
- [ ] Search screen
- [ ] Search list layout results
- [ ] Tap search result → detail → back preserving query

### Phase 7: List View Alternative (not started)

- [ ] List view toggle in app menu
- [ ] List row component (small cover + text)

### Phase 8: Landing Page Responsive (not started)

- [ ] index.html responsive CSS
- [ ] Bookmarklet mobile note
- [ ] General mobile readability

### Phase 9: Documentation & Polish (not started)

- [ ] Update FAQ
- [ ] Update README.md / index.html
- [ ] Test on actual phone
- [ ] Splash/loading screen

### Post-Implementation

- [ ] Release version bump
- [ ] Push to dev for testing
- [ ] Post-mortem
- [ ] Consider matching directional shadow style on desktop cover view (readerwrangler.js) for cross-platform consistency

---

## P5-V2-C Design: Series Label Bars in Dashboard Shelves

### Problem

Dashboard shelves currently flatten all books from an author (top-level folder) into one undifferentiated horizontal row using `collectDescendantBookIds()`. An author with 3 standalone books and 2 series of 5 books each shows 13 covers with no indication of which series they belong to. This was introduced by the P5-V1-F/G fix (subfolder aggregation) and makes the dashboard unusable for authors with multiple series.

### Decision History

- Identified during P5-V1-F/G discussion as a UX problem created by the aggregation fix
- Promoted from "nice to have" to necessary for usable dashboard
- Multiple approaches evaluated (per-book badges, multi-row per author, floating labels)
- **Final decision: floating series label bars** — unanimously agreed as best UX
- Subfolder grid view: keep current 3-column wrapping grid (different purpose — full inventory vs. glanceable preview)

### UX Rationale

| Rank | Approach | Verdict |
|------|----------|---------|
| 1 | **Floating label bars** (chosen) | Best density, best context, best mental model match |
| 2 | Multiple rows per author with static labels | Fragments the author, too much vertical space |
| 3 | Per-book series badges | Clutters covers, redundant info on every book |
| 4 | Flat row no context (current) | Unusable with 3+ series per author |

### Visual Design

Each author shelf is **one horizontal scroll row**. Within that row:

1. **Standalone books** first (books directly in the author folder, not in any subfolder) — no label bar
2. For each series (subfolder), in desktop manual order (`childFolderIds`):
   - **Series folder tile** (📁 with series name) as a visual separator
   - **Series books** in folder order
3. **"Show All" card** at end if SHELF_LIMIT reached

**The floating series label bar:**
- A thin strip (~22px) positioned **below** the series' covers/titles
- Shows series name (left) and book count (right)
- **Does NOT scroll** with the content — it is viewport-width and floats
- Spans from the leftmost visible series book to the rightmost visible series book
- As user scrolls horizontally, the label bar slides and stretches/shrinks dynamically
- Two label bars can be visible simultaneously when two series are partially on screen
- Tapping a label bar navigates to that subfolder

**Scroll behavior example (3 books visible at a time):**

```
View 1:  Book1   [SeriesA]  BookA1
                  ___shelf-A___

View 2:  [SeriesA]  BookA1   BookA2
         _________shelf-A_________

View 3:  BookA1   BookA2   BookA3
         ______shelf-A____________

View 4:  BookA3   BookA4   BookA5
         ______shelf-A____________

View 5:  BookA4   BookA5   [SeriesB]
         _shelf-A_         _shelf-B_

View 6:  BookA5   [SeriesB]  BookB1
                  ________shelf-B___
```

Where `[SeriesA]` = folder tile, `BookA1` = cover card, `_shelf-A_` = floating label bar.

### Data Structure

Current shelf structure:
```js
{ title: 'John Scalzi', count: 25, books: [...flat array...], folderId: 'abc' }
```

New shelf structure:
```js
{
  title: 'John Scalzi',
  count: 25,
  folderId: 'abc',
  sections: [
    { type: 'standalone', books: [book1, book2] },
    { type: 'series', folder: { id, name, bookIds }, books: [bookA1, bookA2, ...] },
    { type: 'series', folder: { id, name, bookIds }, books: [bookB1, bookB2, ...] },
  ]
}
```

- `SHELF_LIMIT` applies to total books per author (standalone + all series combined)
- Standalone books fill first, then series in `childFolderIds` order until limit
- Series with 0 remaining books after cap don't render
- Authors with no subfolders (all books direct): single standalone section, no label bars — looks identical to current behavior
- `Recently Added` shelf: unchanged (no series grouping)

### Implementation Approach

**Files modified:** `mobile.js` only

**Components affected:**

1. **`Dashboard.shelves` useMemo** (~lines 672-701) — restructure from flat book array to sections array. Walk each top-level folder's direct books + child folders instead of using `collectDescendantBookIds`.

2. **`Shelf` component** (~lines 610-653) — render sections sequentially in one scroll container. Each series section: folder tile + books. Assign `data-section-index` attributes to elements for position tracking.

3. **New: `SeriesLabelBar` component** — absolutely positioned overlay below covers. Receives scroll container ref + section element refs. Computes visible range on scroll.

4. **Scroll tracking** — `onScroll` handler on shelf-scroll container with `requestAnimationFrame` throttle. For each series section, use `getBoundingClientRect()` on first/last visible book to compute label bar left/width.

**Estimated size:** ~100-150 new/modified lines in mobile.js.

### What Does NOT Change

- Subfolder grid view (3-column wrapping grid) — different purpose, already works well
- Book detail view
- Navigation stack
- Recently Added shelf
- Folder drawer

---

## Status

- **Current alpha**: 0.1.0-alpha.29 (commit `b16213b`)
- **Current work**: Phase 5 bug fixes
- **Next up**: P5-V2-D (persist navStack), P5-V5-A/B/C (drawer structure), P5-V8-A (breadcrumb overflow)
