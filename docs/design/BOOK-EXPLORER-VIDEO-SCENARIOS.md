# Book Explorer Video Scenarios

**Version:** v5.0.0-alpha.169.12
**Last Updated:** 2026-02-02
**Status:** Active documentation for Book Explorer training videos

---

## Overview

Book Explorer introduces a Windows File Explorer paradigm to ReaderWrangler: folder tree sidebar + detail/preview pane. This document outlines training scenarios for video production, organized by feature area.

**Key Paradigm Shift:**
- **Old (Columns):** Horizontal columns with drag-drop
- **New (Book Explorer):** Folder tree (left) + content pane (right), nested hierarchy, File Explorer UX patterns

---

## Left Panel Context Menu (v5.0.0-alpha.133-145)

**Implementation:** 16.5 hours, 7 operations, 5 keyboard shortcuts
**Completed:** 2026-01-31

### Scenario 1: Basic Folder Operations

**Goal:** Navigate and manage folders using context menu

**Steps:**
1. Right-click any folder in left panel tree
2. Visual context menu appears with 7 operations
3. Click "Open" to navigate into folder (same as double-click)
4. Right-click folder → "Rename" → Edit name inline
5. Right-click folder → "Create Subfolder" → New child appears in rename mode
6. Type new name, press Enter to save

**Expected Result:**
- Menu appears at cursor position (viewport-aware, never off-screen)
- Operations execute immediately
- Menu auto-closes after action
- Visual feedback for each operation

**Tips:**
- **F2 is faster than right-click → Rename** (show keyboard shortcut in menu)
- Esc cancels rename and reverts to original name
- Context menu shows keyboard shortcuts on right side

**Visual Highlights:**
- Menu styling: White background, border, shadow, hover states
- Icons on left, shortcuts on right (e.g., "Rename F2")
- Red text for destructive actions (Delete Folder)
- Menu dividers separate operation groups

---

### Scenario 2: Move To Submenu

**Goal:** Reorganize folder hierarchy using Move to submenu

**Steps:**
1. Right-click folder "Science Fiction" in left panel
2. Click "Move to >" → Submenu opens showing folder tree
3. Tree shows indented hierarchy with current parent checkmarked
4. Click target folder "Fiction" to move
5. Folder moves immediately, tree updates

**Expected Result:**
- Submenu shows full folder tree (excluding circular references)
- Current parent has checkmark icon
- Descendants of source folder are grayed out (can't create loop)
- Undo available (Ctrl+Z)

**Edge Cases to Demonstrate:**
- **Circular reference prevention:** Try to move folder into its own subfolder → Disabled in submenu
- **Tooltip:** Hover over disabled folder shows "Can't move folder into itself"
- **Special folders:** All Books, Inbox, My Library don't appear in submenu (system folders)

**Tips:**
- Indentation shows depth (16px per level)
- Checkmark shows where folder currently lives
- Undo works for move operations (Ctrl+Z to undo, Ctrl+Y to redo)

---

### Scenario 3: Clipboard Operations (Cut/Copy/Paste)

**Goal:** Efficiently duplicate or reorganize folder structures

**Steps:**
1. Right-click folder "Brandon Sanderson"
2. Click "Copy" (or press Ctrl+C)
3. Navigate to target folder "Favorite Authors"
4. Right-click target folder → "Paste" (or press Ctrl+V)
5. Folder copy appears as "Brandon Sanderson (Copy)" with all contents

**Alternative: Cut (Move):**
1. Right-click folder → "Cut" (or Ctrl+X)
2. Folder shows 50% opacity (visual feedback)
3. Right-click target → "Paste" (or Ctrl+V)
4. Folder moves (not copied), opacity restored

**Expected Result:**
- **Copy:** Creates deep copy (folder + all subfolders + all books) with new IDs
- **Cut:** Shows visual feedback (50% opacity), moves on paste
- **Paste:** Disabled if clipboard empty (grayed out with tooltip)
- Undo available for both operations

**Edge Cases:**
- **Circular reference:** Cut folder, try to paste into own subfolder → Disabled
- **Cancel cut:** Press Esc → Clears clipboard, restores opacity
- **Clipboard persists:** Navigate to different folder, paste still works

**Keyboard Shortcuts:**
- **Ctrl+X:** Cut (visual: 50% opacity)
- **Ctrl+C:** Copy
- **Ctrl+V:** Paste
- **Esc:** Cancel cut (clear clipboard)

**Tips:**
- Copy creates full duplicate of entire folder tree
- Cut provides visual feedback (dimmed folder)
- Clipboard persists across folder navigation
- Esc clears clipboard and restores cut folder appearance

---

### Scenario 4: Delete Folder with Confirmation

**Goal:** Remove folders with clear understanding of impact

**Steps:**
1. Right-click empty folder "Test"
2. Click "Delete Folder" (red text)
3. Confirmation dialog: "Delete folder 'Test'?"
4. Click "Delete" → Folder removed
5. Press Ctrl+Z to undo deletion

**Folder with Books:**
1. Right-click folder "Dresden Files" (contains 15 books)
2. Click "Delete Folder"
3. Confirmation: "Delete folder 'Dresden Files' and move 15 books to parent?"
4. Click "Delete" → Folder removed, books move up one level

**Folder with Subfolders:**
1. Right-click folder "Fiction" (has 3 subfolders)
2. Click "Delete Folder"
3. Confirmation: "Delete folder 'Fiction' and all 3 subfolders?"
4. Shows total book count: "23 books will be moved to parent"

**Expected Result:**
- Clear confirmation dialogs explaining impact
- Books always preserved (moved to parent)
- Subfolders handled recursively
- Undo restores entire structure (single operation)

**Edge Cases:**
- **Special folders:** All Books, Inbox, My Library → Delete disabled, menu item grayed out
- **Orphan books:** Books in deleted folder move to immediate parent
- **Deep hierarchy:** Deleting parent with many descendants shows total count

**Keyboard Shortcut:**
- **Delete key:** Same as right-click → Delete Folder (with safety checks)

**Safety Features:**
- Must confirm every deletion
- Special folders cannot be deleted
- Skips operation when typing in input fields
- Skips when dialogs are open

---

### Scenario 5: Folder Properties Dialog

**Goal:** View folder metadata and edit folder name

**Steps:**
1. Right-click folder "Dresden Files"
2. Click "Folder Properties"
3. Dialog opens showing metadata:
   - Name: "Dresden Files" (editable text field)
   - Books: 15 (12 owned, 3 wishlist)
   - Subfolders: 2
   - Total books (recursive): 23
4. Edit name → Click "Save" → Changes persist
5. Click "Cancel" → Discards changes

**Expected Result:**
- Dialog is draggable by title bar (cursor shows grab/grabbing)
- Viewport-aware positioning (doesn't go off-screen)
- Book counts accurate (uses correct data model: folders have `bookIds`)
- Recursive count includes all descendants

**Visual Features:**
- **Draggable title bar:** Shows cursor feedback (grab cursor)
- **Mouse drag:** Click title, drag to reposition dialog
- **Viewport boundaries:** Dialog stays within 10px margin from all edges

**Tips:**
- Drag dialog by title bar to see content underneath
- Book counts update immediately when editing folder contents
- Recursive count includes all nested subfolders

**Data Shown:**
- Name (editable)
- Books: X (Y owned, Z wishlist)
- Subfolders: N
- Total books (recursive): M

**Not Shown (Intentionally):**
- Created/modified dates (not tracked, not meaningful to users)

---

### Scenario 6: Keyboard Shortcuts Workflow

**Goal:** Power user efficiency with keyboard-only operations

**Setup:** User has folder tree open, wants to reorganize

**Workflow:**
1. Click folder to select
2. Press **F2** → Inline rename (no menu needed)
3. Type new name, press Enter
4. Press **Ctrl+X** → Cut folder (shows 50% opacity)
5. Click target folder
6. Press **Ctrl+V** → Paste (folder moves)
7. Press **Ctrl+Z** → Undo move
8. Press **Delete** → Confirmation dialog appears
9. Press Esc → Cancel deletion

**Expected Result:**
- All operations work without opening context menu
- Visual feedback for each action
- Keyboard focus managed correctly
- Safety checks still apply (confirmations, special folders)

**All Keyboard Shortcuts:**
- **F2:** Rename folder (inline edit)
- **Ctrl+X:** Cut folder (50% opacity visual)
- **Ctrl+C:** Copy folder
- **Ctrl+V:** Paste folder
- **Delete:** Delete folder (with confirmation)
- **Esc:** Cancel rename / Clear clipboard / Close menu
- **Ctrl+Z:** Undo
- **Ctrl+Y:** Redo

**Safety Checks:**
- Shortcuts disabled when typing in input fields
- Shortcuts disabled when dialogs are open
- Special folders immune to Cut/Delete
- Circular reference prevention in Paste

**Tips:**
- Show keyboard shortcuts in context menu (right side)
- Demonstrate F2 as faster alternative to right-click → Rename
- Emphasize Esc as universal cancel

---

### Scenario 7: Edge Cases and Polish

**Goal:** Demonstrate robustness and UX polish

#### Context Menu Positioning
1. Right-click folder near bottom of screen
2. Menu appears ABOVE cursor (flips to stay in viewport)
3. Right-click near right edge
4. Menu appears to LEFT of cursor
5. Menu never goes off-screen (10px margin)

#### Special Folders Protection
1. Right-click "All Books" folder
2. Notice: Rename, Delete, Cut are DISABLED (grayed out)
3. Tooltip: "System folder cannot be modified"
4. Properties shows "(System folder)" label

#### Circular Reference Prevention
1. Right-click "Fiction" folder
2. Click "Move to >"
3. Notice: "Fiction" and all its subfolders are grayed out
4. Tooltip: "Can't move folder into itself"
5. Only valid targets are selectable

#### Empty Clipboard
1. Ensure clipboard is empty (press Esc if needed)
2. Right-click any folder
3. Notice: "Paste" is grayed out
4. Tooltip: "Nothing to paste"

#### Confirmation Dialogs
1. Delete folder with books → Shows count, explains behavior
2. Delete folder with subfolders → Shows subfolder count + total books
3. Each confirmation clearly states what will happen
4. Cancel button always available

**Expected Result:**
- No crashes, no off-screen menus, no data loss
- Clear feedback for every disabled action
- Confirmations prevent accidental deletions
- Special folders fully protected

---

## Multi-Column Sorting (v5.0.0-alpha.174-174.4)

**Implementation:** 4 alphas, Shift+Click interaction, visual priority indicators
**Completed:** 2026-02-03

### Scenario 1: Basic Multi-Column Sorting

**Goal:** Sort books by multiple columns (e.g., Series → # for reading order)

**Steps:**
1. Open folder containing multiple series (e.g., "Fantasy" with Stormlight + Mistborn)
2. Click "Series" column header → Books sort by series alphabetically
3. Notice primary sort indicator: **Series ▲**
4. Hold **Shift** and click "#" column header
5. Status updates to: **Series ▲ → #▲**
6. Books now sorted by Series first, then by # within each series
7. Shift+Click "#" again to toggle secondary direction
8. Status updates to: **Series ▲ → #▼**

**Expected Result:**
- Normal click sets primary sort (clears any secondaries)
- Shift+Click adds secondary sort (max 3 levels)
- Status bar shows all active sorts with arrows (▲ ▼)
- Books reorder immediately on each interaction
- Visual indicators in headers show priority (▲₂ ▼₃)

**Tips:**
- Hover over any sortable header to see tooltip: "Click to sort • Shift+Click for secondary column sort"
- Primary sort arrow is normal size, secondary/tertiary are smaller and gray
- Normal click always resets to single-column sort
- Maximum 3 sort levels (adding 4th replaces 3rd)

**Visual Highlights:**
- **Primary indicator:** Normal-size arrow (▲ or ▼)
- **Secondary indicator:** Smaller gray arrow with subscript (▲₂ or ▼₂)
- **Tertiary indicator:** Smaller gray arrow with subscript (▲₃ or ▼₃)
- **Status bar:** Shows full sort chain (e.g., "Series ▲ → #▲ → Title▲")
- **Tooltip:** Appears on header hover, explains shift-click functionality

---

### Scenario 2: Multi-Column Sort Priority

**Goal:** Demonstrate how sort priority determines order

**Steps:**
1. Start with folder sorted by **Date Added ▼** (newest first)
2. Shift+Click "Rating" → Status: **Date Added ▼ → Rating▲**
3. Notice: Books with same date added are now sub-sorted by rating
4. Click "Author" (no shift) → Status resets to: **Author ▲**
5. All secondary sorts cleared, only Author remains
6. Shift+Click "Title" → Status: **Author ▲ → Title▲**
7. Shift+Click "Rating" → Status: **Author ▲ → Title▲ → Rating▲**
8. Now at max (3 levels)
9. Shift+Click "Series" → Status: **Author ▲ → Title▲ → Series▲**
10. Previous 3rd level (Rating) replaced by Series

**Expected Result:**
- Each sort level only matters when previous levels tie
- Primary sort is always most significant
- Normal click always clears secondaries
- Can't exceed 3 levels (oldest is replaced)
- Shift+Click existing column toggles its direction

**Edge Cases to Demonstrate:**
- **All same value in primary:** Secondary sort becomes visible (e.g., all same series → # determines order)
- **Toggle existing level:** Shift+Click secondary column reverses its direction without changing priority
- **Max levels reached:** Adding 4th replaces 3rd, shows tooltip feedback

**Tips:**
- Think of it as "sort by X, then by Y within X, then by Z within Y"
- Use for series reading order: **Series ▲ → #▲**
- Use for price hunting: **Delta ▼ → Price▲** (biggest savings first, then cheapest)
- Status bar shows exact sort chain at all times

---

### Scenario 3: Manual Mode Behavior

**Goal:** Understand how multi-column sort interacts with manual ordering

**Steps:**
1. Create custom manual order in a folder
2. Click "Reorder Books" button → Enter manual mode
3. Drag books to desired positions
4. Click "Save Order" → Status shows: **Manual Order ▲**
5. Try to Shift+Click any column header
6. Notice: Shift+Click is ignored (behaves like normal click)
7. Clicking any column exits manual mode to that column sort
8. If you click "Series" → Status: **Series ▲** (no manual order anymore)

**Expected Result:**
- **Manual mode is absolute:** No secondary sorts possible (every book has unique position)
- Shift+Click in manual mode is ignored (exits to single-column sort)
- Status never shows "Manual Order ▲ → X▲" (illogical UX)
- Manual order is folder-specific, other folders unaffected

**Edge Cases:**
- **Shift+Click while in manual mode:** Exits to single-column sort on that column
- **Switch to sorted view:** Manual order preserved, can return via "Reorder Books"
- **X button in manual mode:** Only appears on primary sort (clears manual, returns to default)

**Tips:**
- Manual order ignores all column-based sorting
- Shift-click functionality only active in column-sorted views
- Manual order persists per folder until you sort by a column

---

### Scenario 4: Visual Indicator Details

**Goal:** Understand all visual feedback for multi-column sorting

**Visual Elements:**

1. **Column Headers:**
   - Sortable columns show tooltip on hover
   - Active primary sort: Normal arrow (▲ or ▼)
   - Active secondary sort: Smaller gray arrow with ₂ subscript
   - Active tertiary sort: Smaller gray arrow with ₃ subscript
   - Unsorted columns: No arrow

2. **Status Bar:**
   - Single sort: "Series ▲"
   - Multi-sort: "Series ▲ → #▲" (arrow notation, separated by →)
   - Manual: "Manual Order ▲"

3. **Tooltip:**
   - Text: "Click to sort • Shift+Click for secondary column sort"
   - Appears on all sortable headers
   - Does not appear on "Cover" or "Amazon" (non-sortable)

4. **Hover States:**
   - Headers show hover effect (lighter background)
   - Cursor changes to pointer
   - Resize handle visible on right edge

**Expected Result:**
- Immediate visual feedback for all actions
- Priority always clear from subscripts
- Status bar explains current sort at a glance
- Tooltip provides discoverability for shift-click

**Tips:**
- Subscripts (₂ ₃) indicate priority, not number of clicks
- Gray color distinguishes secondary from primary
- Status bar is source of truth for current sort

---

## Menu Bar + Toolbar (v5.0.0-alpha.175.1-175.49)

**Implementation:** Space-efficient chrome redesign replacing hero banner and old filter bar
**Completed:** 2026-02-05

### Scenario 1: Menu Bar Navigation

**Goal:** Introduce new menu bar and its features

**Steps:**
1. Point out new menu bar at top (32px, replaces old hero banner)
2. Click **File** menu → Show Import Library, Export Library, Reset App
3. Click **View** menu → Show List View / Cover View toggle, Show Hidden, Deals checkboxes
4. Click **Help** menu → Show About, Keyboard Shortcuts, How To Use
5. Click **About ReaderWrangler™** → Dialog shows logo, version, tagline, copyright
6. Click **Keyboard Shortcuts** → Dialog shows comprehensive shortcut reference
7. Close dialogs with X or Esc key

**Expected Result:**
- Menu bar always visible (32px chrome)
- Menus open on click, switch on hover (familiar desktop pattern)
- Dialogs draggable, ESC closes them
- About dialog shows current version (5.0.0)

**Visual Highlights:**
- Hover-to-switch menu behavior (open File, hover to View switches without click)
- Checkmarks next to active View menu items (List View ✓)
- Disabled items grayed out (Export when no books)

**Tips:**
- Menu bar replaces old hero banner (space savings)
- All help content now in Help menu (no separate ? button)
- View menu syncs with toolbar controls

---

### Scenario 2: Toolbar Tier 1 Filters

**Goal:** Use search and primary filters in compact toolbar

**Steps:**
1. Point out toolbar below menu bar (36px, integrated search + filters)
2. Type in search box → Books filter in real-time by title/author
3. Click **X** in search box → Clears search
4. Click **Read Status** dropdown → Select "Read" → List filters to read books only
5. Click **Tags** dropdown → Multi-select tags with checkboxes → Books match ANY selected tag
6. Click **Source** dropdown → Select "Kindle Unlimited" → Shows only KU books
7. Notice active filters show **blue background/border** (visual feedback)
8. Book count updates: "245 of 2,543 books"

**Expected Result:**
- Search and filters work together (AND logic between filters)
- Active filters show blue styling
- Book count shows filtered/total
- Filters persist on page reload
- Dropdowns close when clicking outside

**Visual Highlights:**
- Blue active state (#dbeafe background, #93c5fd border)
- Badge counts: "Tags (3)" when multiple selected
- Book count updates in real-time

**Tips:**
- Tier 1 filters are most commonly used (Status, Tags, Source)
- All filters persist across sessions
- Active filters clearly marked with color

---

### Scenario 3: More Panel (Tier 2 Filters)

**Goal:** Access advanced filters via More panel

**Steps:**
1. Click **More ▼** button in toolbar → Floating panel opens
2. Panel shows 3-column grid with 6 filters
3. **Collections:** Select "Sci-Fi Series" and "UNCOLLECTED" → Books in those collections
4. **Amazon Rating:** Select "4+ Stars" → Shows books rated 4+ by Amazon reviewers
5. **My Rating:** Select "5 Stars" → Shows books YOU rated 5 stars
6. **Series:** Select "Mistborn" and "NOT_IN_SERIES" → Books in that series + standalones
7. **Date Added:** Select preset "Last 30 days" → Books added recently
8. Alternative: Select "Custom range..." → Pick start/end dates manually
9. Click outside panel → Panel closes (or click More ▲ again)

**Expected Result:**
- Panel floats above content (no layout shift)
- 3-column grid: Collections, Amazon Rating, My Rating (row 1), Series, Date (spans 2 columns, row 2)
- Active filters show blue background
- Click outside closes panel
- All More panel filters persist with Tier 1

**Edge Cases:**
- **UNCOLLECTED:** Shows books not in any collection
- **NOT_IN_SERIES:** Shows standalone books
- **Unrated (My Rating):** Shows books you haven't rated yet
- **Custom date range:** Can set only start date (open-ended) or only end date

**Visual Highlights:**
- Floating panel with shadow (z-index above content)
- Active filters maintain blue theme
- Date preset dropdown with common ranges (Last 30/90 days, This year, etc.)

**Tips:**
- Tier 2 filters for advanced organization needs
- Collections, Series, Date less frequently used than Tier 1
- Custom date range for precise filtering

---

### Scenario 4: Personal Rating System

**Goal:** Rate books based on personal opinion, separate from Amazon ratings

**Steps:**
1. Double-click any book → Book details dialog opens
2. Find **Amazon Rating** section: Yellow stars + "4.2 ★★★★☆" (crowd rating)
3. Find **My Rating** section below: Blue stars "☆☆☆☆☆" (your rating)
4. Click 4th star → Rating set to 4 stars (★★★★☆ in blue)
5. Click **Clear** button → Rating removed (back to ☆☆☆☆☆)
6. Set rating to 5 stars → Close dialog
7. In list view, show **My Rating** column (if hidden: right-click header → Show Columns)
8. Book shows "★★★★★" in blue in My Rating column
9. Click **My Rating** column header → Books sort by your ratings (5-star books at top)
10. Click again → Reverse sort (1-star books at top, unrated at end)

**Expected Result:**
- Amazon rating (yellow) and My Rating (blue) visually distinct
- Star picker in book dialog clickable and interactive
- My Rating column in list view (optional, can be hidden)
- Sortable by My Rating
- Unrated books (0) always sort last (ascending or descending)
- Ratings persist in backup/restore

**Visual Highlights:**
- **Color coding:** Amazon = yellow/amber (#fbbf24), My Rating = blue (#3b82f6)
- **Clear button:** Only appears when rating > 0
- **Hover feedback:** Stars highlight on hover
- **Column display:** Unrated shows "—", rated shows blue stars

**Tips:**
- Personal ratings separate from crowd ratings (Amazon)
- Use My Rating for "would I recommend?" vs. Amazon's "how popular?"
- Sort by My Rating to find your favorites quickly
- Filter by My Rating in More panel (e.g., show only 5-star books)

---

### Scenario 5: Filter Status Banner

**Goal:** Understand active filters at a glance and clear them

**Steps:**
1. Apply multiple filters: Search "sanderson", Status "Unread", Tags "epic-fantasy", My Rating "4+ Stars"
2. Notice **blue banner** appears above book list: "🔍 Active: Search: sanderson • Status: Unread • Tags: epic-fantasy (1) • My Rating: 4+★"
3. Banner shows all active filters in one line
4. Book count shows filtered results: "12 of 2,543 books"
5. Click **Clear All ×** button at end of banner
6. All filters clear, banner disappears, full library shown again

**Expected Result:**
- Banner only appears when filters active
- Shows ALL active filters (Tier 1 + Tier 2 + search)
- Clear All resets everything in one click
- Banner positioned between toolbar and book list (clear visual context)

**Visual Highlights:**
- Blue background (#dbeafe) matches active filter theme
- Filters separated by bullets (•)
- Clear All button on right with ×
- 12px gap between last filter and button (proximity principle)

**Tips:**
- Banner provides "filter status at a glance"
- No need to remember what filters are active
- Clear All faster than clearing each filter individually
- Banner auto-hides when no filters active (clean UI)

---

### Scenario 6: View Controls Integration

**Goal:** Toggle views and special filters from toolbar

**Steps:**
1. Click **List / Grid** toggle in toolbar → Switches between list view (≡) and cover grid view (⊞)
2. Click **Show Hidden** checkbox → Hidden books appear with 40% opacity
3. Click **Deals** checkbox → Shows only books with active price alerts (price < trigger)
4. Notice Deals badge: "Deals (23)" shows count
5. Notice Deals uses **green theme** (not blue): #dcfce7 background, #86efac border
6. Open **View** menu → Notice List View, Show Hidden, Deals all have checkmarks
7. Click View menu item → Toolbar control updates (bi-directional sync)

**Expected Result:**
- List/Grid toggle works in both toolbar and View menu
- Show Hidden syncs between toolbar checkbox and View menu
- Deals syncs between toolbar checkbox and View menu
- Deals uses green theme (special pricing filter)
- Badge shows current deal count

**Visual Highlights:**
- Segmented button for List/Grid (≡ | ⊞)
- Checkbox-style buttons for Show Hidden and Deals
- Green active state for Deals (not blue)
- Badge count on Deals button

**Tips:**
- View controls for quick access to common toggles
- Green theme for Deals emphasizes "money-saving" context
- All view state persists across sessions
- View menu provides alternative access (keyboard: Alt+V)

---

## Training Video Structure Recommendations (Updated)

### Video 1: "Book Explorer - Context Menu Basics" (2-3 min)
- Introduce right-click paradigm
- Show basic operations: Open, Rename, Create Subfolder, Delete
- Emphasize keyboard shortcuts (F2, Delete)
- **Target:** New users unfamiliar with File Explorer patterns

### Video 2: "Book Explorer - Moving & Organizing" (2-3 min)
- Move to submenu walkthrough
- Clipboard operations (Cut/Copy/Paste with Ctrl+X/C/V)
- Circular reference prevention demonstration
- **Target:** Users reorganizing existing libraries

### Video 3: "Book Explorer - Power User Tips" (2 min)
- All keyboard shortcuts in action
- Folder Properties for auditing
- Edge cases: Special folders, confirmations, undo
- **Target:** Advanced users wanting efficiency

### Video 4: "Book Explorer - Multi-Column Sorting" (2-3 min)
- Shift+Click to add secondary/tertiary sorts
- Visual indicators (subscripts, gray styling)
- Practical use cases: Series reading order (Series → #), Price hunting (Delta → Price)
- Manual mode behavior (shift-click ignored)
- Status bar shows full sort chain
- **Target:** Users with large collections needing advanced organization

### Video 5: "Book Explorer - Menu Bar & Toolbar" (3-4 min) **NEW**
- Menu bar navigation (File/View/Help)
- Toolbar Tier 1 filters (Search, Status, Tags, Source)
- More panel Tier 2 filters (Collections, Ratings, Series, Date)
- Personal Rating system (star picker, column, sorting)
- Filter status banner with Clear All
- View controls (List/Grid, Show Hidden, Deals)
- **Target:** All users - essential interface overview

---

### Video 1: "Book Explorer - Context Menu Basics" (2-3 min)
- Introduce right-click paradigm
- Show basic operations: Open, Rename, Create Subfolder, Delete
- Emphasize keyboard shortcuts (F2, Delete)
- **Target:** New users unfamiliar with File Explorer patterns

### Video 2: "Book Explorer - Moving & Organizing" (2-3 min)
- Move to submenu walkthrough
- Clipboard operations (Cut/Copy/Paste with Ctrl+X/C/V)
- Circular reference prevention demonstration
- **Target:** Users reorganizing existing libraries

### Video 3: "Book Explorer - Power User Tips" (2 min)
- All keyboard shortcuts in action
- Folder Properties for auditing
- Edge cases: Special folders, confirmations, undo
- **Target:** Advanced users wanting efficiency

### Video 4: "Book Explorer - Multi-Column Sorting" (2-3 min)
- Shift+Click to add secondary/tertiary sorts
- Visual indicators (subscripts, gray styling)
- Practical use cases: Series reading order (Series → #), Price hunting (Delta → Price)
- Manual mode behavior (shift-click ignored)
- Status bar shows full sort chain
- **Target:** Users with large collections needing advanced organization

---

## Video Production Tips

### Visual Highlights to Emphasize
1. **Context menu appearance:** Show right-click trigger, menu animation
2. **Keyboard shortcuts:** On-screen display (e.g., "Ctrl+X" overlay) when pressed
3. **Visual feedback:** 50% opacity on cut folders, checkmarks in submenu
4. **Viewport awareness:** Demonstrate menu flipping near screen edges
5. **Draggable dialog:** Show cursor change, drag motion

### Common Mistakes to Avoid in Demos
- Don't use All Books/Inbox/My Library for destructive operations (they're protected)
- Don't forget to show confirmations (users need to know they exist)
- Don't skip Undo demonstrations (critical safety feature)
- Don't assume users know File Explorer patterns (show basics)

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
- [ ] Clear browser console (no error spam)

---

## Future Scenarios (Not Yet Implemented)

### Right Panel Context Menu
- Bulk operations: Open Books in Amazon, Copy Titles, Set Price Goal
- Mixed selection: Folders + books context menu
- Filter integration: Operations respect current filters

### Filtered Folder View
- Auto-hide empty folders when filter active
- Auto-expand folders with matches
- X/Y counts in tree (e.g., "Fiction (5/23)")

### Series Columns
- Series metadata in list view
- Fractional position numbers (e.g., 3.5 for novellas)

---

## Notes for Post-Production

### Text Overlays to Add
- Keyboard shortcut indicators (e.g., "F2" when pressed)
- Feature names on first appearance (e.g., "Context Menu" label)
- Confirmation dialog text (zoom in for readability)

### Audio Cues
- Subtle click sound for menu item selection
- Success chime for completed operations
- Error sound for disabled operations (if shown)

### Pacing
- Show context menu appearance: 0.5 sec
- User reads menu items: 2-3 sec
- Operation execution: 0.5 sec
- Result verification: 1-2 sec
- Transition to next demo: 0.5 sec

---

**Last Updated:** 2026-01-31 (alpha.145)
**Next Update:** When right panel context menu implemented
