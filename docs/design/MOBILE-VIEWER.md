# Mobile Viewer Design

## Overview

A purpose-built mobile UI for ReaderWrangler, scoped as a **read-only viewer** — not a responsive redesign of the desktop app. The desktop app's interaction model (drag-drop, multi-select, context menus, resizable panes) is fundamentally mouse-driven. Mobile needs its own component tree with touch-native interactions.

**Scope**: Browse, search, sort, and view a book library on phone-sized screens.
**Non-scope**: Editing, folder management, import/export, bulk operations, column customization.

---

## Design Principles

1. **Viewer, not organizer** — The primary mobile use case is "show me my next reads" or "do I already own this book?" Heavy organization stays on desktop.
2. **Separate file, shared data** — New `mobile.js` file with its own component tree. Reuses `storage.js`, `uiHelpers.js`, and the same IndexedDB data. No changes to `readerwrangler.js`.
3. **Cover-first** — Books are identified visually by covers, not by text rows. Inspired by Kindle/Libby library screens, not file managers. The existing desktop cover view (line ~10405) already renders cover + truncated title — the same visual pattern, just with different interaction handlers.
4. **Touch-native interactions** — Tap, long-press, swipe. No hover states, no drag-drop, no keyboard shortcuts.
5. **Read-only for v1** — No data writes in the initial version. All curation happens on desktop.

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
|  [=] ReaderWrangler        [Search] [?]  |
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
- **Remaining shelves**: One per top-level folder, showing first 3-4 books with horizontal scroll for more. Tap shelf title to open full folder grid view.
- Netflix/Spotify-style horizontal shelves give an at-a-glance library summary.

### Folder View — Cover Grid

Reached by tapping a shelf title on the dashboard, or navigating via the folder drawer.

```
+------------------------------------------+
|  [<] Sci-Fi > Hard SF      [Search] [?]  |
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
| **Tap [=]** | Open folder drawer |

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

### Secondary (v1 if easy, else v2)

6. **"Sort by rating"** — As a user, I want to sort a folder by rating to find my highest-rated unread books.
7. **"Filter by tag"** — As a user, I want to filter by tag to see all my "hard-sf" books across folders.
8. **"Wishlist check"** — As a user, I want to see which books are on my wishlist vs owned so I know what to buy.

### Future (v2+)

9. **"Mark read"** — As a user, I want to mark a book as read from my phone (not critical — won't read that many before I'm back at desktop).
10. **"Configure shelves"** — As a user, I want to configure which tags appear as shelves on my mobile home screen.
11. **"Quick notes"** — As a user, I want to add a quick note to a book after finishing it.
12. **"Reading stats"** — As a user, I want to see my reading stats (books read this month/year).

---

## What's Included vs Excluded

### Included (v1)
- Dashboard home screen with configurable tag-based shelves + folder shelves
- Cover grid folder view (3-wide portrait, 5-wide landscape)
- Folder drawer navigation (hamburger menu)
- Book detail view (read-only, all metadata)
- Sort picker (all existing sort fields)
- Search with instant filter
- Filter by tag, collection, read status
- Breadcrumb navigation
- "Desktop mode" toggle

### Excluded (stay desktop-only)
- All data writes (editing, marking read, tagging)
- Drag-drop reordering
- Multi-select bulk operations
- Folder create/rename/delete/reorder
- Column customization (list view)
- Import/export
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

## Technical Notes

- **Detection**: `window.matchMedia('(max-width: 767px)')` in `readerwrangler.html`. Secondary signal: `'ontouchstart' in window`. "Desktop mode" toggle persists in `localStorage`.
- **State management**: Same React 18 + hooks pattern as desktop. Reads from same IndexedDB via `storage.js`.
- **CSS**: Tailwind CDN (same as desktop). Mobile-first utility classes.
- **File size target**: mobile.js < 2K lines.
- **No new dependencies**: React 18, Tailwind CDN, same stack.
- **Scroll preservation**: When returning from detail view to grid, restore `scrollTop` from state.
- **Cover minimum size**: 60x90px absolute minimum. Target ~105x158px on a 375px-wide phone (3-wide grid).
- **Sorting/filtering**: Duplicate logic from desktop initially. Extract to shared module later as a separate refactor.
