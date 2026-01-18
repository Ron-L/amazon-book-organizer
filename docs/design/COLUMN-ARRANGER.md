# Column Arranger - Split Pane UI

## Overview

A resizable split pane that provides quick access to collapsed columns and enables bulk column management. Solves the problem of managing 20+ columns by allowing users to "park" inactive columns in a compact list while keeping the main workspace uncluttered.

**Location:** `docs/design/COLUMN-ARRANGER.md`

---

## Problem Statement

With large column counts (20+), users face two challenges:
1. **Visual clutter**: Too many columns overwhelm the workspace
2. **Reorganization friction**: Moving columns across large distances is tedious

The carousel addresses navigation; the arranger addresses **inventory management**—hiding what you don't need right now.

---

## User Stories

1. As a user with 30 columns, I want to hide rarely-used columns so my workspace only shows what I'm actively organizing.
2. As a user, I want to quickly expand a collapsed column when I need it without hunting through the workspace.
3. As a user reorganizing my library, I want a compact view where I can drag columns to reorder them in bulk.
4. As a user, I want to see at a glance how many columns are collapsed vs. active.

---

## Layout

```
┌─────────────────────────────────────────────────────────────────────┐
│  Toolbar                                                            │
├──────────────┬──────────────────────────────────────────────────────┤
│              │                                                      │
│   ARRANGER   │              MAIN WORKSPACE                          │
│   PANEL      │                                                      │
│              │   ┌─────────┐  ┌─────────┐  ┌─────────┐             │
│  ┌────────┐  │   │ Column  │  │ Column  │  │ Column  │   ...       │
│  │Collapsed│ ║   │   A     │  │   B     │  │   C     │             │
│  │  (12)   │  │   │         │  │         │  │         │             │
│  ├────────┤  │   │  📚📚   │  │  📚📚   │  │  📚📚   │             │
│  │ Col X  │  │   │  📚📚   │  │  📚📚   │  │  📚📚   │             │
│  │ Col Y  │  │   │         │  │         │  │         │             │
│  │ Col Z  │  │   └─────────┘  └─────────┘  └─────────┘             │
│  │  ...   │  │                                                      │
│  └────────┘  │                                                      │
│              │                                                      │
│  ┌────────┐  │                                                      │
│  │Carousel │  │                                                      │
│  │  (8)   │  │                                                      │
│  ├────────┤  │                                                      │
│  │ Col M  │  │                                                      │
│  │ Col N  │  │                                                      │
│  └────────┘  │                                                      │
│              ║                                                      │
└──────────────┴──────────────────────────────────────────────────────┘
                ↑
            Draggable
             Divider
```

---

## Component: Divider

### Appearance
- **Default:** Subtle 4-5px vertical line, slightly darker than background
- **Hover:** Highlighted (e.g., blue tint), cursor changes to `col-resize`
- **Dragging:** Highlighted with subtle shadow

### Behavior

| Action | Result |
|--------|--------|
| Drag left | Shrinks arranger, expands workspace |
| Drag fully left | Arranger hidden; divider becomes thin grab-handle (4-5px) flush with edge |
| Drag right | Expands arranger, shrinks workspace |
| Drag fully right | Full arranger view; workspace minimized (for bulk reorganization) |
| Double-click | Toggle between last open width and fully collapsed |

### Constraints
- **Minimum arranger width (when open):** 150px — enough to read column names
- **Maximum arranger width:** 50% of viewport — prevents accidentally hiding workspace
- **Fully collapsed:** 4-5px grab-handle visible at left edge

---

## Component: Arranger Panel

### Header
- Title: "Columns" (or icon + "Arranger")
- Optional: Total count badge showing all managed columns

### Section 1: Collapsed Columns

A vertical list of columns that have been collapsed (hidden from workspace).

**Row Display:**
```
┌─────────────────────────────────┐
│ ⠿  Science Fiction (24)        │
└─────────────────────────────────┘
  ↑         ↑            ↑
Grab    Column       Book count
handle   name         badge
```

**Interactions:**
| Action | Result |
|--------|--------|
| Click | Select row (highlight) |
| Ctrl+Click | Add to / remove from selection |
| Shift+Click | Range select |
| Ctrl+A | Select all in section |
| Double-click | Expand column and scroll to it in workspace |
| Drag row | Reorder within collapsed list |
| Drag to workspace | Expand column at drop position |
| Right-click | Context menu (see below) |

**Context Menu:**
- Expand
- Expand All (if multiple selected)
- Rename
- Delete
- Move to Carousel (if carousel enabled)

**Section Header:**
```
┌─────────────────────────────────┐
│ ▼ Collapsed (12)          [+]  │
├─────────────────────────────────┤
```
- Chevron toggles section collapse/expand
- `[+]` creates a new empty column directly into collapsed state
- Count badge updates dynamically

### Section 2: Carousel Columns (if carousel enabled)

Shows columns currently in the carousel. Mirrors Section 1 structure.

**Additional Behaviors:**
- If user collapses the carousel itself, it appears here as an expandable group:
  ```
  ▶ Carousel (collapsed)
      ├─ Col M
      ├─ Col N
      └─ Col O
  ```
- Expanding the carousel group restores carousel to workspace

**Section Header:**
```
┌─────────────────────────────────┐
│ ▼ Carousel (8)                 │
├─────────────────────────────────┤
```

### Section 3: Active Columns (optional/future)

Could show columns currently visible in workspace for completeness. Lower priority—workspace already shows these.

---

## Interactions: Drag & Drop

### From Arranger → Workspace
- Dragging a collapsed column into workspace expands it at drop position
- Visual feedback: Drop zone indicator appears between columns
- Column removed from arranger list

### From Workspace → Arranger
- Dragging an active column onto arranger panel collapses it
- Drop anywhere in panel → adds to Collapsed section
- Drop on Carousel section → adds to carousel
- Column removed from workspace view

### Within Arranger
- Drag to reorder within same section
- Drag between sections to change column state (Collapsed ↔ Carousel)

### Multi-Select Drag
- Select multiple columns, drag as group
- All selected columns move together
- Drop behavior same as single column (all expand, all collapse, etc.)

---

## Interactions: Keyboard

| Key | Action |
|-----|--------|
| `↑` / `↓` | Move selection within list |
| `Enter` | Expand selected column(s) |
| `Delete` | Delete selected column(s) (with confirmation) |
| `Ctrl+A` | Select all in focused section |
| `Escape` | Clear selection |
| `[` | Collapse arranger panel (toggle) |
| `]` | Expand arranger panel (toggle) |

---

## State Persistence (localStorage)

| State | Key (suggested) | Notes |
|-------|-----------------|-------|
| Divider position | `arranger.dividerX` | Pixels from left edge |
| Section collapse states | `arranger.sections` | `{ collapsed: true, carousel: false }` |
| Arranger scroll position | `arranger.scrollTop` | Restore after reload |

---

## Edge Cases

### Narrow Viewport / Mobile
- Below 768px: Arranger becomes an overlay drawer instead of split pane
- Drawer slides in from left, overlays workspace
- Close button or tap-outside to dismiss
- Divider behavior disabled; drawer has fixed width (80% of viewport)

### During Book Drag
- Divider locked (cannot resize while dragging a book)
- Prevents accidental resize mid-operation

### Empty States
- Collapsed section empty: Show "No collapsed columns" with hint text: "Drag columns here to hide them"
- Carousel section empty: Show "No carousel columns" (or hide section entirely if carousel disabled)

### All Columns Collapsed
- Workspace shows empty state: "All columns are collapsed. Expand some from the panel on the left."

---

## Visual Design

### Colors (Tailwind classes, adapt to theme)
- **Arranger background:** `bg-slate-100` (light) / `bg-slate-800` (dark) — subtle contrast with workspace
- **Divider default:** `bg-slate-300` / `bg-slate-600`
- **Divider hover:** `bg-blue-400`
- **Row hover:** `bg-slate-200` / `bg-slate-700`
- **Row selected:** `bg-blue-100` / `bg-blue-900` with `ring-2 ring-blue-400`
- **Section header:** `text-sm font-semibold text-slate-600 uppercase tracking-wide`

### Animations
- Divider drag: Smooth resize with `transition: none` during drag, `transition: width 150ms` on release
- Section collapse: `max-height` transition, 200ms ease-out
- Row reorder: Subtle lift shadow on dragged item

---

## Relationship to Carousel

| Scenario | Arranger Role | Carousel Role |
|----------|---------------|---------------|
| User has 30 columns, uses 8 daily | Collapse 22 rarely-used columns | Carousel holds 8 active columns |
| User reorganizing library | Expand arranger full-width, reorder in bulk | Carousel disabled/minimized during reorg |
| User browsing actively | Arranger collapsed (grab-handle only) | Carousel is primary navigation |
| User wants to archive a carousel column | Drag from carousel section → collapsed section | Column exits carousel |

**Key Insight:** Arranger is for **inventory management**; Carousel is for **navigation**. They complement each other.

---

## Implementation Phases

### Phase 1: Core Split Pane (MVP)
- Draggable divider with min/max constraints
- Double-click to toggle
- Collapsed columns section (list, count badge)
- Single-select, double-click to expand
- Basic state persistence (divider position)

### Phase 2: Full Interactions
- Multi-select (Ctrl+Click, Shift+Click, Ctrl+A)
- Drag-and-drop reorder within arranger
- Drag-and-drop between arranger ↔ workspace
- Right-click context menu
- Keyboard navigation

### Phase 3: Carousel Integration
- Carousel columns section
- Drag between Collapsed ↔ Carousel sections
- Collapse entire carousel into arranger

### Phase 4: Polish
- Mobile/narrow viewport drawer mode
- Animations and transitions
- Empty states
- Hover preview (tooltip with book covers)

---

## Open Questions

1. **Should active workspace columns also appear in arranger?** (For complete inventory view vs. keeping it focused on hidden items)
2. **Pin behavior:** If a column is pinned (from carousel), does it appear in arranger at all? Probably not—pinned columns are "promoted" out of management.
3. **Search within arranger?** Useful at 50+ columns. Add search input at top of panel?

---

## Related Documents

- `docs/design/COLUMN-CAROUSEL.md` - Carousel navigation feature
- `TODO.md` - Priority 1 task list
- `BADGES.md` - Book badge designs (owned, wishlist, series, etc.)
