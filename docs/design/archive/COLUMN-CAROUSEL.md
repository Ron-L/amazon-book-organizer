# Column Carousel Design

> **⚠️ ARCHIVED:** This design is no longer applicable. ReaderWrangler v5.0.0 (February 2025) replaced the horizontal column interface with a Book Explorer (folder tree + content view). The column-based UI this feature was designed for no longer exists.

**Status**: Design (Archived)
**Created**: 2026-01-09
**Problem**: With 7+ columns and 2000+ books to organize, horizontal scrolling becomes unwieldy. Users need a way to efficiently navigate and access many columns.

---

## Overview

Replace the current linear horizontal column layout with an infinite carousel that wraps around, allowing users to spin through columns continuously. Columns can be "pinned" to exit the carousel and remain stationary on the left side.

---

## Core Concepts

### 1. Infinite Horizontal Carousel

- Columns arranged in a continuous loop (no start/end)
- Spinning left wraps rightmost column to left; spinning right wraps leftmost to right
- Momentum-based physics: fast drag = fast spin that decelerates over time
- All visible columns remain fully functional (drag-drop works on all, not just center)

### 2. Pinned Zone vs Carousel Zone

```
┌─────────────────────────────────────────────────────────────────┐
│ [📌Unorg] [📌Reading]  │     [Fantasy] [Sci-Fi] [History]     │
│     (pinned zone)      │          (carousel zone)              │
│                        │      ◄── spins continuously ──►       │
└─────────────────────────────────────────────────────────────────┘
```

- **Pinned zone**: Left side, static columns that don't spin
- **Carousel zone**: Right side, columns that rotate infinitely
- Any column can be pinned/unpinned via click on pin icon in header

### 3. 3D Visual Perspective (Hybrid Approach)

Edge columns in carousel have subtle visual treatment to create depth:
- **Scale**: 85-90% size at edges
- **Opacity**: 85-90% opacity at edges
- **NO blur**: Text must remain readable for glancing at titles/counts
- Center column(s) at full size/opacity

---

## User Interactions

### Desktop - Spinning the Carousel

| Action | Result |
|--------|--------|
| Mouse wheel over carousel | Spin with momentum based on scroll speed |
| Hover left edge of carousel | Shows left arrow; click/hold to spin left |
| Hover right edge of carousel | Shows right arrow; click/hold to spin right |
| Drag carousel background | Spin (not on a column, just the gap/background) |
| Press `Escape` | Immediately stops spinning |
| Click anywhere | Immediately stops spinning |

### Desktop - Pinning Columns

| Action | Result |
|--------|--------|
| Click pin icon (📌) on column header | Toggle pinned state |
| Pinned column | Slides left out of carousel into pinned zone |
| Unpinned column | Returns to carousel |
| Drag column header in pinned zone | Reorder within pinned zone |
| Drag column header in carousel | Reorder within carousel |

### Mobile/Touch

| Action | Result |
|--------|--------|
| Swipe horizontally on carousel | Spin with momentum |
| Tap column on edge | Spins that column to center |
| Long-press column header | Column options menu (rename, delete, pin/unpin) |
| Drag book | Carousel LOCKED - does not spin while dragging |

**Critical**: Carousel must lock during book drag operations. Moving the world while placing an object is disorienting.

### Keyboard/Accessibility

| Action | Control |
|--------|---------|
| Rotate carousel left | `←` arrow key (when no element focused) |
| Rotate carousel right | `→` arrow key |
| Jump to column 1-9 | `Ctrl+1` through `Ctrl+9` |
| Stop spinning | `Escape` |
| Screen reader announcement | "Column carousel, [X] columns, currently showing [Column Name]" |

---

## Momentum Physics

```javascript
const MOMENTUM_CONFIG = {
    deceleration: 0.95,      // multiplier per frame (smooth slowdown)
    minVelocity: 0.5,        // px/frame - below this, snap to stop
    maxVelocity: 50,         // cap initial velocity (prevent slot machine effect)
    frameRate: 60            // target FPS for requestAnimationFrame
};
```

**Behavior**:
1. On drag end, capture current velocity
2. Each frame: `velocity *= deceleration`
3. When `velocity < minVelocity`: stop completely
4. `Escape` or click: immediately set `velocity = 0`

---

## Visual Layout Details

### Edge Hover Zones

```
┌──────────────────────────────────────────────────────────┐
│ ◄ │                    carousel                      │ ► │
│   │  [Col1]  [Col2]  [*Col3*]  [Col4]  [Col5]       │   │
│   │   85%     92%     100%      92%     85%         │   │
└──────────────────────────────────────────────────────────┘
     ↑                                                  ↑
  left hover zone                              right hover zone
  (shows ◄ on hover)                          (shows ► on hover)
```

### Scale/Opacity Gradient

| Position | Scale | Opacity |
|----------|-------|---------|
| Center | 100% | 100% |
| 1 position from center | 92% | 92% |
| 2 positions from center | 85% | 85% |
| Edge (about to wrap) | 80% | 80% |

---

## State Management

### New State Variables

```javascript
// Carousel rotation
const [carouselOffset, setCarouselOffset] = useState(0);  // rotation position
const [carouselVelocity, setCarouselVelocity] = useState(0);  // current spin speed
const [isSpinning, setIsSpinning] = useState(false);  // momentum animation active

// Pinned columns
const [pinnedColumnIds, setPinnedColumnIds] = useState(['unorganized']);  // default: Unorganized pinned

// Drag lock
const [carouselLocked, setCarouselLocked] = useState(false);  // true while dragging book
```

### Derived Values

```javascript
// Columns in carousel (excluding pinned)
const carouselColumns = columns.filter(c => !pinnedColumnIds.includes(c.id));

// Columns in pinned zone
const pinnedColumns = columns.filter(c => pinnedColumnIds.includes(c.id));

// Visible carousel columns (based on offset and viewport)
const visibleCarouselColumns = getVisibleColumns(carouselColumns, carouselOffset, viewportWidth);
```

---

## Implementation Phases

### Phase 1: Basic Carousel (MVP)
- Infinite horizontal scroll with wrap-around
- Mouse wheel to spin
- No momentum yet (direct 1:1 scroll)
- No pinning yet (all columns in carousel)

### Phase 2: Momentum + Controls
- Add momentum physics
- Add edge hover zones with arrows
- Add Escape to stop
- Add keyboard arrow controls

### Phase 3: Pinned Zone
- Add pin icon to column headers
- Implement pinned zone on left
- Drag to reorder in each zone
- Unorganized pinned by default

### Phase 4: Visual Polish
- 3D perspective (scale/opacity gradient)
- Smooth transitions for pin/unpin
- Mobile touch support
- Accessibility announcements

---

## Open Questions

1. **Column width in carousel**: Should columns be fixed width or flexible? Fixed may work better for smooth spinning.

2. **Pinned zone max width**: Should there be a limit to how many columns can be pinned? Or let pinned zone grow until carousel is too small?

3. **Empty carousel**: What happens if user pins ALL columns? Show "No columns in carousel" message? Auto-unpin one?

4. **Persistence**: Should pinned state be saved to localStorage/collections? (Probably yes)

---

## Related Files

- `readerwrangler.js` - Main column rendering logic
- `readerwrangler.css` - Column styling

---

## References

- Netflix-style edge navigation for hover zones
- iOS picker wheel for momentum physics inspiration
- Trello for drag-drop column patterns
