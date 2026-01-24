# Desktop & Folders UI

## Overview

A virtual desktop paradigm for organizing books. Columns become "folders" that can be opened as resizable, movable windows. The desktop is a zoomable, scrollable virtual space where folder icons live when closed.

**Replaces:** COLUMN-ARRANGER.md and COLUMN-CAROUSEL.md (unified approach)

---

## Problem Statement

With 20+ columns, the current horizontal scroll becomes unwieldy:
1. **Visual clutter**: Too many columns overwhelm the workspace
2. **Navigation friction**: Finding and comparing distant columns is tedious
3. **No overview**: Can't see all columns at once

---

## Core Metaphor

The familiar OS desktop:
- **Desktop surface**: Virtual space larger than viewport, zoomable
- **Folder icons**: Closed columns shown as small icons with name + count
- **Folder windows**: Open columns shown as resizable, movable windows
- **Books**: Displayed inside windows, reflow to fill window width

---

## Hierarchy

```
Desktop (virtual, zoomable, scrollable)
  └── Folder icons (closed) or Folder windows (open)
        └── Collapsible dividers
              └── Books (reflow to window width)
```

**Two levels only.** No nested folders (considered and rejected due to spatial confusion).

---

## Desktop

### Virtual Space
- Larger than the browser viewport
- Scroll/pan to navigate when zoomed in
- All folder icons visible (no stacking)

### Zoom Controls
| Control | Action |
|---------|--------|
| Ctrl+scroll wheel | Zoom in/out |
| Zoom slider | Visual control in corner |
| "Fit All" button | Zoom to show entire desktop |
| Double-click folder at low zoom | Zoom to 100% and open folder |

### Zoom Levels (Conceptual)
| Zoom | Use Case | Appearance |
|------|----------|------------|
| 100% | Working | Full-size windows, readable books |
| 50% | Overview | Smaller windows, folder icons clear, books tiny |
| 25% | Arrangement | Entire desktop visible, windows as thumbnails |

### Folder Icon Layout
- **Snap-to-grid**: Icons align to invisible grid (neat, prevents chaos)
- **Draggable**: Rearrange by dragging
- **Auto-arrange**: Optional cleanup button

---

## Folder Icons (Closed State)

### Icon Style
Use a **stylized geometric folder shape** (not skeuomorphic, not a plain rectangle):
```
    ┌──┐
┌───┴──┴───┐
│          │  ← Folder body (colorizable)
│ Fantasy  │
│   (47)   │
└──────────┘
```

**Rationale:**
- Reinforces the desktop/folder metaphor strongly
- Universally recognized shape
- Natural area for color customization (folder body)
- Clearly signals "new paradigm" vs. current column headers
- Clean geometric style fits modern UI aesthetic

### Folder Coloring
Users can assign colors to folders for visual grouping and quick recognition.

**Color Palette:** 8-12 colors
- Slate (default)
- Red, Orange, Yellow, Green, Teal, Blue, Purple, Pink
- Optional: Brown, Gray

**Benefits:**
- Visual grouping at a glance ("blue = fiction, green = non-fiction")
- Quick recognition at low zoom when names become tiny
- Personal organization layer beyond naming
- Reduces cognitive load scanning many folders

**Implementation:**
- Set via: Right-click context menu → "Color" submenu
- Default: Slate/neutral gray
- Window title bar inherits folder color when open (consistency)
- Persisted to localStorage with other folder state

### Appearance
- Small, consistent size
- Folder name (truncated if long)
- Book count badge
- Hover: Show additional info (unread count, etc.)

### Interactions
| Action | Result |
|--------|--------|
| Double-click | Open folder window |
| Drag | Reposition on desktop |
| Drop book onto | Add book to top of folder |
| Right-click | Context menu (Rename, Delete, Color, etc.) |

---

## Folder Windows (Open State)

### Appearance
```
┌─ Fantasy (47) ──────────────────────── _ □ ✕ ─┐
│ ▼ Sanderson (12)                              │
│   📖 📖 📖 📖                                 │
│   📖 📖 📖 📖                                 │
│   📖 📖 📖 📖                                 │
│ ▶ Hobb (9)                    ← collapsed     │
│ ▼ Other (26)                                  │
│   📖 📖 📖 📖                                 │
│   ...                                         │
├───────────────────────────────────────────────┤
│ 47 books │ 3 dividers                         │
└───────────────────────────────────────────────┘
```

### Window Properties
- **Title bar**: Folder name, book count, window controls
- **Resizable**: Drag edges/corners to resize
- **Movable**: Drag title bar to reposition
- **Z-order**: Windows float above desktop icons (can overlap icons)
- **Footer**: Book count, divider count (optional)

### Window Behaviors
| Action | Result |
|--------|--------|
| Close (✕) | Collapse to icon at original position |
| Minimize (_) | Optional: collapse to icon |
| Resize | Books reflow to fill new width |
| Scroll | Vertical scroll for overflow content |

### Close Behavior
- Window collapses to the position where its icon was (or nearest free spot if occupied)
- If user moved the window, it still returns to icon's desktop position
- Maintains spatial memory: "Fantasy is in the top-left"

---

## Books Inside Windows

### Layout
- **Reflow**: Books fill window width (3-6 per row depending on window size)
- **Partial rows**: Allowed above dividers (divider starts new row)
- **Scroll**: Vertical scroll within window for overflow

### Book Interactions
Same as current column behavior:
- Click to select
- Ctrl+click for multi-select
- Shift+click for range select
- Drag to reorder within window
- Drag to another open window
- Drag to closed folder icon (adds to top)
- Double-click to open detail modal
- Right-click for context menu

---

## Dividers (Collapsible)

### Appearance
```
▼ Sanderson (12)     ← Expanded: shows books below
▶ Hobb (9)           ← Collapsed: hides books, shows count only
```

### Interactions
| Action | Result |
|--------|--------|
| Click chevron (▼/▶) | Toggle collapse/expand |
| Double-click text | Rename divider |
| Drag handle | Reorder divider within folder |

### Collapse Behavior
- Collapsed divider shows only header row with count
- Books under collapsed divider are hidden but still in folder
- Partial row above collapsed divider is allowed
- Expand restores books to view

---

## Drag & Drop

### Book to Open Window
- Standard drag into window
- Drop zone indicator shows insertion point
- Books reflow after drop

### Book to Closed Folder Icon
- Drag book over folder icon
- Icon highlights as drop target
- Drop adds book to **top** of folder
- Feedback: Brief highlight or toast

### Folder Icon Repositioning
- Drag icon to new desktop position
- Snaps to grid
- If target spot occupied, displaced icon moves to nearest free spot

### During Drag
- Zoom locked (prevent accidental zoom while dragging)
- Desktop scroll allowed (to reach off-screen areas)

---

## Filtering

### Behavior
- **Nothing hides**: Folder icons always visible on desktop
- **Counts update**: Folder shows filtered count (e.g., "Fantasy (12/47)")
- **Inside windows**: Non-matching books hide; matching books remain
- **Empty folders**: Show "0" count, remain visible

### Rationale
Folders are the user's organizational structure. Hiding them during filtering would disrupt spatial memory. Instead, show that a folder is "empty for this filter" via count.

---

## State Persistence

| State | Persisted? | Notes |
|-------|------------|-------|
| Folder positions on desktop | Yes | Restore on reload |
| Folder colors | Yes | Per-folder |
| Zoom level | Yes | Restore last zoom |
| Divider collapse states | Yes | Per-folder |
| Which windows are open | Optional | User preference: restore or start fresh |
| Window positions/sizes | Optional | If restoring open state |

---

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `Ctrl+scroll` | Zoom in/out |
| `Escape` | Close focused window |
| `Ctrl+A` | Select all in focused window |
| `Delete` | Delete selected books (with confirmation) |
| `F2` | Rename focused folder/divider |

---

## Visual Design

### Desktop
- Subtle grid pattern or solid background
- Distinct from window chrome

### Folder Icons
- Geometric folder shape with tab (see "Icon Style" above)
- User-customizable color (see "Folder Coloring" above)
- Name below/inside icon
- Count badge (pill shape)

### Windows
- Standard window chrome (title bar, borders)
- Title bar inherits folder color for visual consistency
- Slightly rounded corners
- Drop shadow for depth
- Semi-transparent when dragging (optional)

### Zoom Feedback
- Book covers scale proportionally at all zoom levels
- At low zoom, covers become tiny thumbnails (still recognizable)

---

## Migration from Columns

Existing column data maps directly:
- Each column → one folder
- Column order → initial folder arrangement (left-to-right, top-to-bottom grid)
- Dividers → preserved inside folders
- Book positions → preserved inside folders

First launch after migration:
- Auto-arrange folders in grid
- All folders start closed
- Zoom at 100%

---

## Edge Cases

### Narrow Viewport / Mobile
- Desktop becomes touch-scrollable
- Pinch-to-zoom
- Windows may need minimum size constraints
- Consider: single-window mode on very small screens

### Many Folders (50+)
- Grid arrangement scales
- Zoom out to see all
- Search/filter folders by name (future enhancement)

### Empty Desktop
- Show hint: "Import your library to get started"

### All Windows Open
- Desktop still scrollable/zoomable
- Windows can overlap each other
- User manages their own workspace

---

## Implementation Phases

### Phase 1: Core Desktop (MVP)
- Virtual desktop with zoom/pan
- Folder icons (closed state only)
- Double-click to open window
- Single window at a time (simplification)
- Basic book reflow in window

### Phase 2: Multi-Window
- Multiple windows open simultaneously
- Window resize/move
- Z-order management
- Close returns to icon position

### Phase 3: Collapsible Dividers
- Divider collapse/expand toggle
- Collapse state persistence
- Partial row handling

### Phase 4: Polish
- Zoom slider and "Fit All" button
- Drag book to closed folder
- Auto-arrange button
- Animations and transitions
- Mobile/touch support

---

## Alternatives Considered

### Split Pane (COLUMN-ARRANGER.md)
- Sidebar with collapsed columns + main workspace
- **Rejected**: Still fundamentally "columns" paradigm; desktop is more intuitive

### Carousel (COLUMN-CAROUSEL.md)
- Spinning carousel of columns
- **Rejected**: Novelty UI; desktop is more familiar

### Nested Folders
- Folders containing folders (like file system)
- **Rejected**: Spatial confusion ("where did this come from?"), cascading state issues

---

## Related Documents

- `COLUMN-ARRANGER.md` - Previous split-pane design (superseded)
- `COLUMN-CAROUSEL.md` - Previous carousel design (superseded)
- `BADGES.md` - Book badge designs (unchanged)
- `TODO.md` - Priority 1 task list
