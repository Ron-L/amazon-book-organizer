# Book Explorer Video Scenarios

**Version:** v6.5.0
**Last Updated:** 2026-03-10
**Status:** Active documentation for ReaderWrangler training videos

---

## Overview

ReaderWrangler uses a Windows File Explorer paradigm: folder tree sidebar + detail/preview pane. Books are imported via an encrypted relay — no file downloads. This document outlines training scenarios for video production, organized by feature area.

**Key Paradigm:**
- **Folder tree (left):** Hierarchy of Views, Folders (inbox, personal folders), Trash
- **Content pane (right):** List or Covers view of selected folder/view
- **Relay:** Encrypted channel — fetcher pushes to relay, app pulls from relay

---

## Relay Import Flow (v6.0.0)

**Relay model:** Fetcher bookmarklet runs on Amazon pages, uploads data to relay. App pulls from relay via Import from Relay. No JSON files. No manual file transfer.

### Scenario 1: First Import (Empty Library)

**Goal:** Show the complete zero-to-library flow

**Steps:**
1. Open ReaderWrangler (empty state — no books, no relay configured)
2. File menu → Relay Setup
3. Click "Generate Credentials" → credentials auto-fill
4. Drag the bookmarklet that appears onto browser bookmarks bar
5. Close Relay Setup dialog
6. Navigate to Amazon library page (amazon.com/hz/mycd/digital-console/contentlist/booksPurchased)
7. Click ReaderWrangler bookmarklet in bookmarks bar
8. Progress dialog appears — Phase 1: titles/metadata counting up
9. Phase 2: descriptions enriching
10. Phase 3: genre tags
11. Phase 4: prices
12. "Upload complete" — dialog closes or shows summary
13. Back in ReaderWrangler: File → Import from Relay
14. Progress dialog: "Checking relay… 247 new books found"
15. Books appear in Inbox (delta count shown)

**Expected Result:**
- Credentials generated and saved — never need to re-generate unless relay is reset
- Bookmarklet installed once in browser bookmarks bar
- All books arrive in Inbox, none in folders yet
- Delta count shows exactly how many were new

**Visual Highlights:**
- Relay Setup dialog showing generated credentials
- Bookmarklet drag animation (slow motion)
- Phase progress counters climbing
- Inbox badge count updating

**Tips:**
- The relay is encrypted end-to-end — credentials are baked into the bookmarklet
- Setup is one-time; subsequent imports only need Steps 6–15

---

### Scenario 2: Incremental Import

**Goal:** Demonstrate that re-fetching is efficient — only new books are transferred

**Setup:** Library already has 400 books; 5 new books purchased since last fetch

**Steps:**
1. Navigate to Amazon library page
2. Click ReaderWrangler bookmarklet
3. Phase 1 starts but stops quickly (hits overlap with existing books)
4. Phase 2 and 3 enrich only the 5 new books
5. "Upload complete"
6. File → Import from Relay
7. Dialog shows: "5 new books"
8. 5 books appear in Inbox

**Expected Result:**
- Full re-scan not needed — fetcher stops at overlap
- Only new books uploaded to relay
- Delta count makes it clear exactly what's new
- Existing library untouched

**Tips:**
- Run the fetcher as often as you want — it's always fast after the first time
- Phase 3 (tags) caps at 10 per run — needs multiple runs for a large library

---

## Trash Bin (v6.0.0)

**Two-stage delete:** Soft delete → Trash (recoverable) → Empty Trash (permanent). Books in Trash still exist until explicitly removed.

### Scenario 1: Soft Delete

**Goal:** Delete books with confidence — they're always recoverable

**Steps:**
1. Select a book (click) or multi-select (Ctrl+Click)
2. Press **Delete** key OR right-click → "Delete"
3. Confirmation dialog: "Move 1 book to Trash?"
4. Click "Delete" → Book moves to Trash
5. Trash bin in sidebar shows count badge
6. Press Ctrl+Z immediately → Book restored to its original folder
7. Repeat — delete again, this time don't undo

**Expected Result:**
- Book gone from folder, appears in Trash
- Trash badge count updates
- Undo works immediately after soft delete

**Tips:**
- Deleting from a folder where the book has only one copy → moves to Trash
- Deleting from a folder where the book is in other folders too → removes from this folder only (not sent to Trash)
- "Delete from All Books" is disabled — All Books is a view, not a folder

---

### Scenario 2: Recovering from Trash

**Goal:** Show that Trash is a safety net, not a final action

**Steps:**
1. Click Trash in sidebar → right pane shows deleted books
2. Find the book you want to recover
3. Drag it from Trash to any folder in the sidebar
4. Book is restored to that folder
5. Trash count badge decrements

**Expected Result:**
- Trash works like any other folder for browsing
- Drag from Trash = undelete + place in target folder
- Book removed from Trash automatically on drop

**Tips:**
- Can drag to Inbox if unsure where to put it
- All book data (ratings, notes, tags) preserved through Trash

---

### Scenario 3: Empty Trash (Permanent Removal)

**Goal:** Permanently remove books you're sure you don't want

**Steps:**
1. Right-click Trash in sidebar
2. Click "Empty Trash"
3. Confirmation: "Permanently remove X books? This cannot be undone."
4. Click "Remove Permanently"
5. Trash badge disappears, books gone from library

**Expected Result:**
- Clear warning that this is permanent
- Books removed from relay on next sync
- Cannot be undone (no undo for permanent delete)

**Safety Features:**
- Two-click minimum (right-click + confirm)
- Explicit "cannot be undone" language in dialog
- Cancel always available

---

## Views and Tags (v6.4.0)

**Views section:** Contains All Books + any pinned tag views. Tag views show books through a lens — books aren't stored in views, they're just filtered. One book can appear in many views.

### Scenario 1: Views Section Navigation

**Goal:** Understand the difference between Views and Folders

**Steps:**
1. Point out sidebar: **Views** section at top, **Folders** section below
2. Click the Views label → right pane shows card grid of all views
3. Hover over Views label → tooltip: "Different ways to see the same books — not separate copies"
4. Click "All Books" in Views → right pane shows every book in library
5. Try dragging a book out of All Books → disabled (read-only view)
6. Click ▼ chevron next to Views → section collapses
7. Click ▶ → expands again

**Expected Result:**
- Views label navigates to card grid
- All Books is read-only — tooltip explains why
- Chevron toggle persists across navigation

**Tips:**
- Moving a book "out of" All Books makes no sense — it's not a container
- Tooltip on All Books: "Every book in your library, organized or not. You can't move books out of here — use folders to arrange them."

---

### Scenario 2: Tag Views

**Goal:** Use tag virtual folders to find books by genre

**Steps:**
1. Click a tag view (e.g., "Fantasy") in the Views section
2. Right pane shows all books tagged Fantasy — from any folder
3. Show the same book appears under Fantasy AND in "Brandon Sanderson" folder
4. Edit: right-click "Fantasy" tag view → Properties
5. Add a description: "Epic fantasy, high fantasy, magical worlds"
6. Hover over Fantasy in sidebar → tooltip shows description

**Expected Result:**
- Tag view shows books from multiple folders simultaneously
- Book count in view label
- Description tooltip on hover
- Same books accessible from multiple places — not duplicated

**Tips:**
- Tag views are created automatically from Amazon genre tags
- Add your own description via Properties to remind yourself what's in each view
- Pinned views persist until unpinned

---

## Covers View (v5.0.0)

**List view vs. Covers view:** The toggle in the toolbar switches between a column-based list (more data) and a grid of cover images (more visual).

### Scenario 1: Switching Views

**Goal:** Show when to use List vs. Covers

**Steps:**
1. In list view, click the **⊞** (grid) icon in the toolbar view controls
2. Right pane switches to cover art grid
3. Ownership badges visible on covers (KU, Prime, Sample, Borrowed)
4. Price tags visible on covers (for wishlist books)
5. Click **≡** (list) icon → back to list view
6. Show same toggle available in View menu
7. View menu syncs with toolbar (checkmarks update)

**Expected Result:**
- Instant switch between modes
- Badges and price tags visible in covers view
- State persists on folder navigation

**Tips:**
- Covers view ideal for browsing by feel (visual library)
- List view ideal for sorting, filtering, and reading metadata
- Both views honor all active filters

---

### Scenario 2: Ownership Badges on Covers

**Goal:** Understand at a glance what you own vs. borrow

**Steps:**
1. Switch to Covers view
2. Point out badges in corner of covers:
   - **KU** = Kindle Unlimited (subscription)
   - **Prime** = included with Prime
   - **Sample** = only sample downloaded
   - **Borrowed** = library borrow
3. Open filter panel → Ownership Type dropdown
4. Select "Kindle Unlimited" → shows only KU books
5. Select "Sample" → shows only samples (books you haven't bought)
6. Clear filter

**Expected Result:**
- Badges present on covers for known ownership types
- Filter by ownership type works in both list and covers view

**Tips:**
- Use Sample filter to find books you want to actually buy
- Use Orphan filter ("Removed from Amazon") to find books no longer available

---

## Left Panel Context Menu (v5.0.0)

### Scenario 1: Basic Folder Operations

**Goal:** Navigate and manage folders using context menu

**Steps:**
1. Right-click any folder in left panel tree
2. Visual context menu appears with operations
3. Click "Open" to navigate into folder (same as click)
4. Right-click folder → "Rename" → Edit name inline
5. Right-click folder → "Create Subfolder" → New child appears in rename mode
6. Type new name, press Enter to save

**Expected Result:**
- Menu appears at cursor position (viewport-aware, never off-screen)
- Operations execute immediately
- Menu auto-closes after action

**Tips:**
- **F2 is faster than right-click → Rename**
- Esc cancels rename and reverts to original name
- Context menu shows keyboard shortcuts on right side

**Visual Highlights:**
- Icons on left, shortcuts on right (e.g., "Rename F2")
- Red text for destructive actions (Delete Folder)
- Menu dividers separate operation groups

---

### Scenario 2: Move To Submenu

**Goal:** Reorganize folder hierarchy using Move to submenu

**Steps:**
1. Right-click folder "Science Fiction"
2. Click "Move to >" → Submenu opens showing folder tree
3. Tree shows indented hierarchy with current parent checkmarked
4. Click target folder "Fiction" to move
5. Folder moves immediately, tree updates

**Expected Result:**
- Submenu shows full folder tree (excluding circular references)
- Current parent has checkmark icon
- Descendants of source folder are grayed out
- Undo available (Ctrl+Z)

**Edge Cases:**
- **Circular reference:** Try to move folder into own subfolder → Disabled, tooltip "Can't move folder into itself"
- **Special folders:** All Books, Inbox don't appear in submenu

---

### Scenario 3: Clipboard Operations (Cut/Copy/Paste)

**Goal:** Efficiently duplicate or reorganize folder structures

**Steps:**
1. Right-click folder → "Copy" (or Ctrl+C)
2. Navigate to target folder
3. Right-click target → "Paste" (or Ctrl+V)
4. Folder copy appears as "Brandon Sanderson (Copy)" with all contents

**Alternative — Cut (Move):**
1. Right-click folder → "Cut" (or Ctrl+X)
2. Folder shows 50% opacity (visual feedback)
3. Right-click target → "Paste"
4. Folder moves, opacity restored

**Expected Result:**
- Copy creates deep copy (folder + all subfolders + all books) with new IDs
- Cut shows visual feedback (50% opacity), moves on paste
- Undo available for both

**Keyboard Shortcuts:**
- **Ctrl+X:** Cut | **Ctrl+C:** Copy | **Ctrl+V:** Paste | **Esc:** Cancel cut

---

### Scenario 4: Delete Folder with Confirmation

**Goal:** Remove folders with clear understanding of impact

**Steps:**
1. Right-click folder → "Delete Folder" (red text)
2. Confirmation: "Delete folder 'Test'?"
3. Click "Delete" → Folder removed
4. Press Ctrl+Z to undo

**Folder with Books:**
- Confirmation shows: "Delete folder 'Dresden Files' and move 15 books to parent?"
- Books always preserved (moved to parent)

**Keyboard Shortcut:** **Delete key** — same as right-click → Delete Folder

**Safety Features:**
- Must confirm every deletion
- Special folders cannot be deleted
- Books never lost — always moved to parent

---

### Scenario 5: Folder Properties Dialog

**Goal:** View folder metadata, rename, and add a description

**Steps:**
1. Right-click folder → "Folder Properties"
2. Dialog shows:
   - Name (editable text field)
   - Description (textarea — shown as tooltip on hover)
   - Books: 15 (12 owned, 3 wishlist)
   - Subfolders: 2
3. Add description: "All Sanderson books by publication order"
4. Click "Save"
5. Hover over folder in sidebar → tooltip shows description

**Expected Result:**
- Description saves to folder object
- Tooltip appears on hover if description is non-empty
- System folders (All Books, Inbox, Trash) don't show description field

**Tips:**
- Drag dialog by title bar to reposition
- Description is optional — leave empty for no tooltip

---

### Scenario 6: Keyboard Shortcuts Workflow

**Goal:** Power user efficiency with keyboard-only operations

**Workflow:**
1. Click folder to select
2. Press **F2** → Inline rename
3. Type new name, press Enter
4. Press **Ctrl+X** → Cut folder (50% opacity)
5. Click target folder
6. Press **Ctrl+V** → Paste
7. Press **Ctrl+Z** → Undo
8. Press **Delete** → Confirmation appears
9. Press Esc → Cancel

**All Keyboard Shortcuts:**

| Key | Action |
|-----|--------|
| F2 | Rename folder |
| Ctrl+X | Cut folder |
| Ctrl+C | Copy folder |
| Ctrl+V | Paste folder |
| Delete | Delete folder (with confirmation) |
| Esc | Cancel rename / clear clipboard / close menu |
| Ctrl+Z | Undo |
| Ctrl+Y | Redo |

---

### Scenario 7: Edge Cases and Polish

**Context Menu Positioning:**
- Right-click near bottom → menu appears above cursor
- Right-click near right edge → menu appears to left
- Never goes off-screen (10px margin)

**Special Folders Protection:**
- Right-click "All Books" → Rename, Delete, Cut are disabled
- Tooltip: "System folder cannot be modified"

**Circular Reference Prevention:**
- Move to submenu grays out source folder and all descendants
- Tooltip: "Can't move folder into itself"

---

## Multi-Column Sorting (v5.0.0)

### Scenario 1: Basic Multi-Column Sorting

**Goal:** Sort books by multiple columns (e.g., Series → # for reading order)

**Steps:**
1. Click "Series" column header → primary sort
2. Hold **Shift** and click "#" → secondary sort added
3. Status bar: **Series ▲ → # ▲**
4. Shift+Click "#" again → toggles direction: **Series ▲ → # ▼**

**Visual Indicators:**
- Primary: normal arrow (▲ or ▼)
- Secondary: smaller gray arrow with ₂ subscript
- Tertiary: smaller gray arrow with ₃ subscript
- Status bar shows full chain: "Series ▲ → # ▲ → Title ▲"

**Tips:**
- Hover any sortable header → tooltip: "Click to sort • Shift+Click for secondary column sort"
- Normal click always resets to single-column sort
- Maximum 3 sort levels (adding 4th replaces 3rd)

---

### Scenario 2: Practical Use Cases

**Series reading order:** Sort by **Series ▲ → # ▲** — all books in each series in order
**Price hunting:** Sort by **Delta ▼ → Price ▲** — biggest savings first, then cheapest within
**Recent favorites:** Sort by **Date Added ▼ → My Rating ▼** — newest, best-rated first

---

### Scenario 3: Manual Mode Behavior

**Goal:** Understand interaction between multi-sort and manual order

**Steps:**
1. Enter manual reorder mode → drag books → Save Order
2. Status shows: **Manual Order ▲**
3. Try Shift+Click a column → ignored (exits to single-column sort)
4. Manual order is folder-specific; other folders unaffected

**Expected Result:**
- Manual mode is absolute — no secondary sorts possible
- Clicking any column exits manual mode

---

## Menu Bar + Toolbar (v5.0.0)

### Scenario 1: Menu Bar Navigation

**Steps:**
1. **File menu** → Import from Relay, Save Backup, Restore Backup, Relay Setup, Reset App
2. **View menu** → List/Cover toggle, Show Hidden, Deals
3. **Help menu** → About, Keyboard Shortcuts
4. Hover-to-switch: open File, hover to View — switches without click

---

### Scenario 2: Toolbar Tier 1 Filters

**Steps:**
1. Type in search box → real-time filter by title/author
2. **Read Status** dropdown → "Read" → shows read books only
3. **Tags** dropdown → multi-select → books match ANY selected tag
4. **Source** dropdown → "Kindle Unlimited" → shows KU only
5. Active filters show **blue** styling, count updates: "245 of 2,543 books"

---

### Scenario 3: More Panel (Tier 2 Filters)

**Steps:**
1. Click **More ▼** → floating panel opens
2. Collections, Amazon Rating, My Rating, Series, Date filters
3. **Date Added:** Preset "Last 30 days" → recently imported books
4. Click outside → panel closes

**Special Values:**
- UNCOLLECTED = books not in any collection
- NOT_IN_SERIES = standalone books
- Unrated = books with no personal rating

---

### Scenario 4: Personal Rating System

**Steps:**
1. Double-click book → detail dialog
2. Amazon Rating (yellow stars) vs. My Rating (blue stars) — visually distinct
3. Click 4th blue star → My Rating set to 4
4. Close dialog → list view shows **My Rating** column
5. Click My Rating column header → sort by personal ratings

**Visual Highlights:**
- Amazon = yellow (#fbbf24), My Rating = blue (#3b82f6)
- Clear button appears when rating > 0
- Unrated books always sort last (asc or desc)

---

### Scenario 5: Filter Status Banner

**Goal:** Understand active filters at a glance

**Steps:**
1. Apply multiple filters: search + Status + Tags + My Rating
2. Blue banner appears above book list showing all active filters
3. Book count shows filtered/total: "12 of 2,543"
4. Click **Clear All ×** → all filters clear, banner disappears

---

### Scenario 6: View Controls

**Steps:**
1. Click **⊞ / ≡** toggle → switch List ↔ Covers
2. **Show Hidden** → hidden books appear at 40% opacity
3. **Deals** checkbox → shows books currently below price goal (green theme, badge count)
4. View menu syncs with toolbar controls (bi-directional)

---

## Training Video Structure

### Video 1: Quick Start (3 min)
- Relay setup → fetch → import → first folder
- **Target:** Brand new users

### Video 2: Setting Up the Relay (1-2 min)
- Relay Setup dialog, credential generation, bookmarklet install
- **Target:** New users who skipped Quick Start

### Video 3: Fetching Your Library (2-3 min)
- All 5 fetcher phases, incremental behavior, orphan detection
- **Target:** Users who want to understand what the fetcher does

### Video 4: Organizing with Folders (3-4 min)
- Inbox workflow, folder creation, drag-drop, hierarchy, trash bin
- **Target:** Users who imported books and need to organize

### Video 5: Finding Books — Views & Filters (2-3 min)
- Views section, tag views, filter panel, ownership badges
- **Target:** Users with large libraries

### Video 6: Wishlist & Discovery (2-3 min)
- Add from product/series/author pages, price goals, deals
- **Target:** Users who want to track books before buying

### Video 7: Mobile Sync (1-2 min)
- QR pairing, mobile app, device state sync
- **Target:** Users who read on phone

### Video 8: Power Features (2-3 min)
- Undo/redo, keyboard shortcuts, backup/restore, auto-organize
- **Target:** Advanced users

---

## Video Production Tips

### Visual Highlights to Emphasize
1. **Context menu appearance:** Show right-click trigger, menu animation
2. **Keyboard shortcuts:** On-screen display (e.g., "Ctrl+X" overlay) when pressed
3. **Visual feedback:** 50% opacity on cut folders, badges on covers
4. **Progress dialogs:** Phase counters climbing, phase names appearing
5. **Inbox badge:** Count updating after import

### Common Mistakes to Avoid in Demos
- Don't use All Books/Inbox/Trash for destructive operations (protected)
- Don't forget to show confirmations (users need to know they exist)
- Don't skip Undo demonstrations (critical safety feature)
- Don't show personal Amazon data — use dummy account or canned payload

### Voiceover Script Guidelines
- Explain WHY each feature exists (user benefit)
- Mention keyboard shortcuts explicitly ("or press F2")
- Warn about destructive operations before showing them
- Emphasize undo availability

### Scene Prep Checklist
- [ ] Folder tree with 10-15 folders (realistic hierarchy)
- [ ] Mix of empty folders and folders with books
- [ ] At least one folder with subfolders (for delete demo)
- [ ] Clipboard cleared (Esc key)
- [ ] No active dialogs or modals
- [ ] Clean browser console (no error spam)
- [ ] Demo data only — no personal books visible

---

## Future Scenarios

### Filtered Folder View
- Auto-hide empty folders when filter active
- Auto-expand folders with matches
- X/Y counts in tree (e.g., "Fiction (5/23)")

---

## Notes for Post-Production

### Text Overlays to Add
- Keyboard shortcut indicators (e.g., "F2" when pressed)
- Feature names on first appearance (e.g., "Context Menu" label)
- Phase names during fetcher progress

### Pacing
- Show context menu appearance: 0.5 sec
- User reads menu items: 2-3 sec
- Operation execution: 0.5 sec
- Result verification: 1-2 sec
- Transition to next demo: 0.5 sec

---

**Last Updated:** 2026-03-10 (v6.5.0)
**Next Update:** When filtered folder view implemented
