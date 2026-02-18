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

Ordered by dependency. Each phase builds on the previous. Check off items as completed.

### Phase 1: Foundation (est. 2-3 hours)

- [ ] **Viewport detection in readerwrangler.html** — Add `matchMedia('(max-width: 767px)')` check. If mobile, load `mobile.js` instead of `readerwrangler.js`. Check `localStorage.desktopMode` override first.
- [ ] **Create `mobile.js` skeleton** — React 18 root, single `MobileApp` component, import `storage.js` and `uiHelpers.js`. Verify it renders a "Hello Mobile" placeholder on a phone-width viewport.
- [ ] **Data loading** — Call `storage.js` to load books, folders, folder assignments, tags, wishlist, settings from IndexedDB. Store in React state. Handle the empty case (no data → show empty state).
- [ ] **Theme support** — Read theme preference from localStorage. Apply CSS variables (same `[data-theme]` approach as desktop). Default to system preference if no saved theme.
- [ ] **App version display** — Read APP_VERSION from query param (same as desktop).
- [ ] **PWA manifest** — Create `manifest.json` (name, icons, standalone display, theme color). Create 192x192 and 512x512 app icons. Add `<link rel="manifest">` to `readerwrangler.html`. Enables "Add to Home Screen" on Android/iOS.

### Phase 2: Empty State & Import (est. 1-2 hours)

- [ ] **Empty state screen** — When no books in IndexedDB, show welcome message with 3-step instructions and Import Backup button (see mockup). No shelves, no footer bar.
- [ ] **Import Backup handler** — File picker (`<input type="file" accept=".json">`), read JSON, validate it's a backup file, write to IndexedDB via `storage.js`. On success, reload state and transition to dashboard.
- [ ] **Import error handling** — Invalid file format → toast/alert. Partial data → reject entirely (same as desktop restore behavior).

### Phase 3: Header & Overlays (est. 2-3 hours)

- [ ] **Header bar component** — Fixed top. Left: `[=]` hamburger. Center: title or breadcrumb. Right: `[Search]` icon, `[⋮]` three-dot icon. On folder view: `[<]` back replaces `[=]`.
- [ ] **Overlay manager** — State: `activeOverlay: null | 'drawer' | 'menu'`. Only one open at a time. Tapping one while other is open → swap. Backdrop click → close.
- [ ] **Folder drawer** — Slides in from left, 250px wide, backdrop dimming. Renders folder tree from state. Tap folder → set current folder, close drawer. Book counts in parentheses. Indentation for hierarchy.
- [ ] **App menu** — Slides in from right, backdrop dimming. Items: Import Backup, separator, View toggle, Theme, Deals Only, Show Hidden, Desktop Mode, separator, Help & About. Toggles update in-place; other items close menu on tap.
- [ ] **Menu toggle persistence** — Save view mode, theme, deals-only, show-hidden to localStorage. Read on load.

### Phase 4: Dashboard Home (est. 2-3 hours)

- [ ] **Recently Added shelf** — Horizontal scrollable row. Books sorted by `dateAdded` descending. Show first N books (enough to peek past screen edge). Cover + title + author.
- [ ] **Folder shelves** — One row per top-level folder. Folder name as shelf title with count. Horizontal scroll. Tap title → navigate to folder grid view.
- [ ] **Tag-based shelves** — Read `mobileShelfTags` from settings. For each tag, create a shelf showing all books with that tag. Hidden if no tags configured or no matching books.
- [ ] **Cover card component** — Reusable. Cover image (105x158px target, 2:3 aspect), title truncated 1 line, author truncated 1 line. Tap → book detail view. Placeholder for missing covers.
- [ ] **Shelf component** — Reusable. Label row (name + count), horizontal scroll container of cover cards. Tap label → navigate to full folder view.

### Phase 5: Folder View — Cover Grid (est. 2 hours)

- [ ] **Cover grid layout** — 3-wide portrait, 5-wide landscape. CSS grid with responsive columns. Subfolder tiles rendered before books (folder icon + name).
- [ ] **Footer bar** — Sticky bottom. Sort button (opens sort picker), Filter button (opens filter sheet), book count display.
- [ ] **Sort picker bottom sheet** — Slides up from bottom. Radio select for sort field + direction toggle. Fields: Name, Author, Rating, My Rating, Date Added, Series, Manual Order. Dismiss on selection or swipe down.
- [ ] **Filter bottom sheet** — Tag filter, collection filter, read status filter. Apply immediately. Dismiss on tap outside or swipe down.
- [ ] **Breadcrumb navigation** — Show folder path in header (e.g., "Sci-Fi > Hard SF"). Tap segment to navigate up. Back button `[<]` returns to parent or dashboard.
- [ ] **Scroll position preservation** — Save `scrollTop` when navigating to detail view. Restore when returning.

### Phase 6: Book Detail View (est. 1-2 hours)

- [ ] **Detail view layout** — Full-screen view. Large cover (centered), title, author, rating (SVG stars), my rating, series, tags (as chips), collections, notes, status (Owned/Wishlist), price + goal.
- [ ] **Back navigation** — `[<] Back` returns to previous view at saved scroll position.
- [ ] **Conditional fields** — Only show fields that have data (no empty "Notes:" labels).

### Phase 7: Search (est. 1-2 hours)

- [ ] **Search screen** — Full-width search input replaces header content. `[<]` to exit search, `[Clear]` to reset.
- [ ] **List layout results** — Small cover left + title/author/rating/folder right. Searches across title, author, series, tags, notes. Instant filter as you type.
- [ ] **Tap result** — Opens book detail view. Back returns to search results (preserving query and scroll).

### Phase 8: List View Alternative (est. 1 hour)

- [ ] **List view toggle** — When View is set to "List" in app menu, folder views render as a list (small cover + text) instead of cover grid. Same sort/filter/footer bar.
- [ ] **List row component** — Small cover (60x90), title, author, rating. Same tap → detail view behavior.

### Phase 9: Landing Page Responsive (est. 1-2 hours)

- [ ] **index.html responsive CSS** — Media query for `max-width: 767px`. Before/after images stack vertically. Video scales to viewport. Single-column layout on narrow screens.
- [ ] **Bookmarklet mobile note** — Add note in bookmarklet section for mobile visitors: "Bookmarklet installation requires a desktop browser."
- [ ] **General mobile readability** — Check font sizes, tap targets, padding on small screens.

### Phase 10: Documentation & Polish (est. 1 hour)

- [ ] **Update FAQ** — Add mobile support entry: what works, what's desktop-only, how to import.
- [ ] **Update README.md / index.html** — Document mobile viewer in features section.
- [ ] **Test on actual phone** — Load on real phone (iPhone/Android). Verify import, navigation, search, sort, theme switching. Check both portrait and landscape.
- [ ] **Splash/loading screen** — Mobile may need its own loading indicator while IndexedDB data loads.

### Post-Implementation

- [ ] **Release version bump** — Update ORGANIZER_VERSION, APP_VERSION, CHANGELOG, CSS cache-buster per release checklist.
- [ ] **Push to dev for testing** — Since mobile detection runs from the hosted URL, need to push to dev remote to test on actual phone.
- [ ] **Post-mortem** — Review what worked, what didn't, update design doc with lessons learned.

---

## Phase 5 Bug Tracking

Issues found during Phase 5 user testing (commit `d307436`). Working through one at a time.

### Issue #1: Scrolling & scroll position preservation
- [x] **1A** Book detail view can't scroll down (root cause: `body { overflow: hidden }` in CSS) — fixed alpha.7
- [x] **1B** Dashboard can't scroll vertically (same root cause as 1A) — fixed alpha.7
- [x] **1C** Horizontal shelf scroll position not preserved on back — fixed alpha.7
- [x] **1D** Vertical scroll position not preserved on back (root cause: reading `window.scrollY` inside React setState updater) — fixed alpha.9, cleaned alpha.10
- [x] **1E** Dashboard shelves in alphabetical order — should match desktop custom folder order — fixed alpha.11 (Inbox still at bottom, known/separate)
- [x] **1F** Only 5 of 12 folders visible — folders with 0 top-level books are hidden (all books in subfolders) — fixed alpha.12
- [x] **1G** Shelves only show books directly in folder, not books in subfolders (root cause of 1F) — fixed alpha.12

### Issue #2: Folder grid covers too large / dark mode spacing
- [ ] **2A** Covers take up most of screen in folder view, should be more like dashboard size
- [ ] **2B** In dark mode, hard to distinguish where one cover ends and another starts — needs more spacing

### Issue #3: Folder tiles vs cover width mismatch
- [ ] **3A** Folder tiles are 1/3 screen width but book covers are full width in folder view — jarring visual mismatch

### Issue #5: Drawer structure
- [ ] **5A** "All Books" should be at top of drawer, currently at end / unreachable
- [ ] **5B** "My Library" pseudo-node missing — author folders should be indented under it
- [ ] **5C** Inbox at bottom of list instead of at top under My Library

### Issue #7: Scroll positions not preserved (general)
- [x] **7A** Covered by fixes 1C and 1D — verified working in alpha.10

### Issue #8: John Scalzi folder missing dots menu
- [ ] **8A** Long breadcrumb text pushes header icons off screen (suspected: `flex` layout without `flexShrink: 0`)

### ~~Issue #9: Drawer folder ordering~~
- [x] **9A** Drawer folder ordering is correct — matches desktop manual order. Not a bug.
- [x] **9B** Not a bug — see 9A.

### Future Enhancement: Series label bars in dashboard shelves
- Within each author's shelf row, show a thin non-scrolling label bar under each series' covers
- Label bar shows series name, stays visible as covers scroll above it
- "Show All" card at end of shelf navigates to full folder view
- Non-series books appear first, then each series group in desktop manual order
- Decided during 1F/1G discussion — deferred to after v1 bug fixes

### Status
- **Current alpha**: 0.1.0-alpha.12 (commit `b980e2c`)
- **Next up**: 2A/2B (folder grid covers too large, dark mode spacing)
