# Drag & Drop System Design

## Glossary

| Term | Definition |
|------|------------|
| **Drag Source** | The item(s) being dragged - can be a single book, multiple selected books, or a divider |
| **Drop Target** | The position where the drag source will be inserted when released |
| **Drop Indicator** | Visual line showing where the drop target is (the insertion point) |
| **Drag Ghost** | Semi-transparent copy of the dragged item that follows the cursor |
| **Column** | A vertical container holding books and dividers (like a Trello list) |
| **Book Grid** | The 3-column CSS grid layout within each column that arranges books |
| **Divider** | Full-width separator with a label, used to group books within a column |
| **Grid Cell** | One of the 3 positions in a row of the book grid |
| **Empty Cell** | A grid cell with no book (occurs when row has 1-2 books) |
| **Insertion Point** | The index in the column's item array where dropped items will be inserted |
| **Hit Detection** | Algorithm that determines which drop target the cursor is over |

## Requirements

### Draggable Items

| Item Type | Single | Multiple | Notes |
|-----------|--------|----------|-------|
| Book | Yes | Yes | Multi-select via Ctrl+Click or Shift+Click |
| Divider | Yes | No | Dividers cannot be multi-selected (currently) |
| Mixed (books + dividers) | - | No | Not supported (currently) |

### Valid Drop Targets

| Position | Books | Dividers | Notes |
|----------|-------|----------|-------|
| Before any book | Yes | Yes | Insert at book's index |
| After any book | Yes | Yes | Insert at book's index + 1 |
| Before any divider | Yes | Yes | Insert at divider's index |
| After any divider | Yes | Yes | Insert at divider's index + 1 |
| Start of column | Yes | Yes | Insert at index 0 |
| End of column | Yes | Yes | Insert at array length |
| Empty column | Yes | Yes | Insert at index 0 |
| Empty grid cell | Yes | Yes | Maps to nearest logical position |
| Between contiguous dividers | Yes | Yes | Insert between the two dividers |

### Visual Feedback

| Feedback | Description |
|----------|-------------|
| Drag Ghost | Semi-transparent image follows cursor during drag |
| Drop Indicator | Horizontal line at insertion point |
| Indicator Width | Book-width for book targets, full-column-width for divider targets |
| Indicator Color | Blue (default), Red (divider drag - debug), Green (book drag - debug) |
| Indicator Dot | Small circle on left end of indicator line |
| Indicator Movement | Discrete jumps between valid positions (not continuous) |
| Source Dimming | Dragged item appears faded/transparent at original position |

### Scroll Behavior

| Behavior | Description |
|----------|-------------|
| Auto-scroll Zone | Near top/bottom edges of scrollable column area |
| Scroll Speed | Proportional to how close cursor is to edge |
| Position Update | Drop target recalculates as content scrolls |
| Cross-column | Horizontal scroll not currently implemented |

### Constraints & Edge Cases

| Constraint | Description |
|------------|-------------|
| No self-drop | Cannot drop item onto itself (no-op) |
| No mid-selection drop | Cannot drop into middle of multi-selected group |
| Divider width | Dividers always span all 3 grid columns |
| Mixed heights | Dividers and books have different heights |
| Filtered view | Search filter may hide some items; drag still works on visible items |

## Current Implementation Issues

### Performance
- Hit detection queries ALL elements on every mouse move
- With 2000+ books, this causes noticeable lag
- `getBoundingClientRect()` called for every element

### Missing Indicators
- Empty grid cells show no indicator (drop works, no visual)
- Depends on having an element at the drop index to render indicator

### Asymmetric Horizontal Behavior
- Dragging left: indicator shifts when book fully enters target column
- Dragging right: indicator shifts when right edge passes target
- Caused by using cursor position while ghost is centered on cursor

## Problem Statement

**Goal:** Drag object(s) (books and/or dividers) within a column or across columns. While dragging, if the Drag Ghost is over a valid Drop Target, show a Drop Indicator at the corresponding Insertion Point.

**Constraint:** Minimize edge cases and avoid polling all objects (2338+ books + N dividers) on every cursor movement.

### Drop Target Cases

| Case | Description | Indicator Position |
|------|-------------|-------------------|
| Empty column | Column has no items | Top of column (index 0) |
| Start of column | Before first item | Above first item |
| End of column | After last item | Below last item |
| Before a book | Cursor in top half of book | Above that book |
| After a book | Cursor in bottom half of book | Below that book (= above next item) |
| Before a divider | Cursor in top half of divider | Above that divider |
| After a divider | Cursor in bottom half of divider | Below that divider |
| Between contiguous dividers | Two dividers with no book between | Between the dividers |
| Empty grid cell | Partial row (1-2 books) | Maps to nearest logical insertion point |
| Over dragged item | Cursor over the item being dragged | No indicator (invalid) |
| Over selected items | Cursor over multi-selected group | No indicator (invalid) |

### Key Observations

1. **All drop targets are BETWEEN items** - We insert before index N, never "onto" an item
2. **Insertion points are linear** - Despite 3-column grid, the underlying array is linear (0, 1, 2, 3...)
3. **Y-position is primary** - Horizontal position within grid row doesn't change insertion semantics
4. **Dividers break grid pattern** - They span full width and have different height than books

### The Core Question

How do we efficiently determine which insertion point (0 to N) the cursor is closest to, without measuring every element on every mouse move?

## Proposed Redesign

### Approach: Row-Based Grid Index

**Core Idea:** Instead of querying every element on each mouse move, build an index of row boundaries once at drag start, then binary search to find the target row.

#### Data Structure

```javascript
// Built once at drag start (per column)
columnIndex = {
  rowBoundaries: [0, 150, 190, 340, 380, 530, ...],  // Y positions
  rows: [
    {type: 'books', startIndex: 0, items: [book0, book1, book2]},
    {type: 'divider', startIndex: 3, item: divider0},
    {type: 'books', startIndex: 4, items: [book3, book4]},
    ...
  ]
}
```

#### Lookup Algorithm

```
1. Binary search rowBoundaries for cursorY → O(log R)
2. Get row contents → O(1)
3. If row is books: use cursorX to pick column position → O(1)
4. If row is divider: use cursorY top/bottom half → O(1)
5. Return insertion index
```

**Complexity:** O(log R) where R = number of rows ≈ N/3

#### Rebuild Triggers
- Drag start (initial build)
- Scroll events (Y positions shift relative to viewport)

#### Advantages
- Eliminates per-element getBoundingClientRect on mouse move
- Naturally handles dividers with different heights
- Rows are intuitive units matching visual layout
- Empty grid cells handled by row lookup + X position math

---

## Problem Space 2: Drop Indicator Rendering

**Question:** How do we show the indicator at the correct position, including for empty grid cells and between contiguous dividers?

### Root Cause Analysis (v3.14.0 bugs)

| Version | Problem | Root Cause |
|---------|---------|------------|
| .p | Missing start-of-column indicator | No element at index 0 to host indicator |
| .q | Missing indicators (empty cells, contiguous dividers) | No element at target index |
| .m | No indicator when dragging dividers | Conditional rendering too restrictive |
| .n | Double indicators | Multiple elements claiming same insertion point |
| .o | Book drag showing divider indicators | Indicator type logic wrong |

### ~~Solution: Sentinels + Placeholders~~ (SUPERSEDED)

~~**Principle:** Every valid insertion point has an element to host its indicator.~~

*This approach was superseded by the Overlay Indicator solution below, which solves all the same problems more elegantly while also eliminating React re-render performance issues.*

---

### Solution: Overlay Indicator (v3.14.0.s+)

**Key Insight:** The original approach had each of 2338 book components check "am I the drop target?" on every `dropTarget` state change. This caused massive React re-renders even though only 1-2 components actually needed to update.

**New Principle:** Render ONE indicator component positioned absolutely, using coordinates from the Row Index.

```
OLD: Each book renders its own indicator (2338 re-renders per mouse move)
┌─────────────────────────────────┐
│ Book1 (checks: am I target?)    │ ← re-renders
│ Book2 (checks: am I target?)    │ ← re-renders
│ Book3 (checks: am I target?)    │ ← re-renders
│ ...2335 more books checking...  │ ← ALL re-render
└─────────────────────────────────┘

NEW: ONE overlay component renders the indicator (1 re-render per mouse move)
┌─────────────────────────────────┐
│ Book1 (no drag knowledge)       │ ← never re-renders during drag
│ Book2 (no drag knowledge)       │ ← never re-renders
│ Book3 (no drag knowledge)       │ ← never re-renders
│                                 │
│ <DropIndicatorOverlay />        │ ← ONLY this re-renders
│   position: absolute            │
│   top/left from Row Index       │
└─────────────────────────────────┘
```

#### Why This Works

The Row Index (from Phase 1) already contains all the position data we need:
- `row.top`, `row.bottom` - Y coordinates for the indicator
- `item.left`, `item.right` - X coordinates for indicator width
- `columnRect` - Column boundaries for full-width indicators

We can calculate the exact pixel position for the indicator WITHOUT needing DOM elements at that position.

#### Cases Solved by Overlay

| Case | How Overlay Handles It |
|------|------------------------|
| Empty grid cell | Calculate position from row bounds + grid math |
| Start of column | Position at `columnRect.top` |
| End of column | Position at last row's `bottom` |
| Between dividers | Position at divider's `bottom` |
| Empty column | Position at `columnRect.top` |

#### Benefits Over Sentinels/Placeholders

1. **No extra DOM elements** - No invisible placeholders or sentinels
2. **One re-render** - Only the overlay updates, not 2338 books
3. **Simpler code** - Remove all indicator logic from book/divider components
4. **Naturally handles all edge cases** - Position is calculated, not dependent on hosting element

---

## Summary: Two Proposals

### Proposal 1: Row-Based Grid Index (Hit Detection) ✅ IMPLEMENTED

**Problem solved:** O(N) polling on every mouse move

**Solution:** Build index of row boundaries at drag start, binary search on mouse move

**Complexity:** O(N) build once → O(log R) per mouse move

**Status:** Implemented in v3.14.0.r

### Proposal 2: Overlay Indicator (Rendering + Performance)

**Problems solved:**
- Missing indicators (empty cells, column boundaries)
- Complex conditional logic in book components
- 2338 React re-renders per `dropTarget` change

**Solution:**
- ONE absolutely-positioned indicator component
- Uses Row Index coordinates to position itself
- Books/dividers have NO indicator logic

**Benefits:**
- Single re-render per mouse move (vs 2338)
- No DOM elements needed at drop positions
- Eliminates all indicator edge cases
- Dramatically simpler book/divider components

---

## Implementation Plan (Revised)

### Phase 1: Row-Based Grid Index ✅ COMPLETE
- Build index at drag start
- Binary search for drop position
- Rebuild on scroll

### Phase 2: Overlay Indicator
- Create `<DropIndicatorOverlay />` component
- Calculate position from Row Index + dropTarget
- Handle all drop position cases (books, dividers, empty cells, column edges)
- Position indicator with `position: fixed` using viewport coordinates

### Phase 3: Remove Old Indicator Code
- Remove indicator rendering from book components
- Remove indicator rendering from divider components
- Remove indicator-related conditionals
- Clean up unused CSS classes

### Phase 4: Cleanup
- Remove timing/debug code from v3.14.0.s
- Remove debug colors (green/red → blue)
- Final testing of all drop scenarios

