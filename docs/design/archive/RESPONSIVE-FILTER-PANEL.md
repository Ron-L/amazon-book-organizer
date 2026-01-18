# Responsive Filter Panel Design

**Status**: Design (Updated 2026-01-11)
**Created**: 2026-01-09
**Complexity**: LOW/LOW (3-5 hours)
**Problem**: Filter panel consumes ~200px of vertical space (nearly 20% of viewport on 1080p), reducing visible book area. On ultrawide monitors (5120x1440), fields stretch absurdly wide.

---

## Overview

Redesign the filter panel with:
1. **Primary + Advanced split** - Most-used filters always visible, rarely-used filters collapsed
2. **Inline labels** - Icons beside fields, not above
3. **Max-width constraints** - Prevent fields from stretching on wide screens
4. **Responsive grid** - Adapts from 1-6 columns based on viewport

---

## User Research Insight

Based on actual usage patterns:

**Primary Filters (used constantly):**
- **Search** - Title/author lookup while browsing
- **Read Status** - Workflow toggle (find next book to read)
- **Collection** - User's organizational structure

**Advanced Filters (occasional/workflow-specific):**
- **Series** - Rarely needed if using column+divider organization
- **Rating** - Occasional (find highly-rated unread books)
- **Wishlist** - Specific workflow (shopping mode)
- **Ownership** - Rare (find borrowed books to return)
- **Acquisition Date** - Rare (find "that book I got around Christmas")

---

## Current State

```
┌─────────────────────────────────────────────────────────────────────────┐
│ 🔍 Search                    📖 Read Status              ⭐ Rating      │  <- Labels row
│ [Title or author...    ]     [All Status         ▼]     [All Ratings ▼]│  <- Fields row
│ 📁 Collection                📚 Series                   ❤️ Wishlist    │  <- Labels row
│ [All Collections      ▼]     [All Series         ▼]     [All Books   ▼]│  <- Fields row
│ 🔑 Ownership                                                            │  <- Label row
│ [All Types            ▼]                                                │  <- Field row
│ 📅 Acquisition Date - From                 📅 Acquisition Date - To     │  <- Labels row
│ [mm/dd/yyyy                    📅]         [mm/dd/yyyy              📅] │  <- Fields row
│ Showing: 2349 of 2349 books  ☑️ Show Hidden                [Clear All] │  <- Status row
└─────────────────────────────────────────────────────────────────────────┘

Total: ~200px vertical height (8-9 rows of content)
```

### Problems

1. **Labels above fields** - Each label consumes its own row
2. **Fixed 3-column layout** - Doesn't utilize wide screens, wastes space on ultrawide
3. **No max-width** - Fields stretch to fill grid cells (looks absurd on 5120px monitors)
4. **All filters equal** - No hierarchy based on usage frequency
5. **Date pickers span full width** - Way wider than needed for `mm/dd/yyyy`
6. **Ownership alone on its row** - Wasted space

---

## Proposed Design

### Design Principles

1. **Primary filters always visible** - Search, Read Status, Collection
2. **Advanced filters collapsed by default** - Expand on demand
3. **Icons inline (left side)** - Not above, to save vertical space
4. **Max-width on all fields** - Prevent absurd stretching
5. **Light background tint** - Visually distinguish Advanced section

### Visual Layout: Collapsed (Default)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ 🔍[Title or author...] 📖[All Status▼] 📁[All Collections▼]  ▶ More Filters │
│ Showing: 2344 of 2344 books  ☑️ Show Hidden                    [Clear All]  │
└─────────────────────────────────────────────────────────────────────────────┘

Total: ~50px vertical height (1 row of fields + 1 status row)
```

### Visual Layout: Expanded

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ 🔍[Title or author...] 📖[All Status▼] 📁[All Collections▼]  ▼ More Filters │
├─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─[light bg tint]─ ─ ─┤
│ ⭐[All Ratings▼] 📚[All Series▼] ❤️[All Books▼] 🔑[All Types▼]               │
│ 📅[From    📅] 📅[To      📅]                                               │
├─────────────────────────────────────────────────────────────────────────────┤
│ Showing: 2344 of 2344 books  ☑️ Show Hidden                    [Clear All]  │
└─────────────────────────────────────────────────────────────────────────────┘

Total: ~100px vertical height when expanded
```

### Responsive Breakpoints

| Width | Primary Row | Advanced Row (if expanded) |
|-------|-------------|---------------------------|
| <600px (mobile) | 1 column, stacked | 1 column, stacked |
| 600-900px | 2-3 columns | 2-3 columns |
| 900-1400px | 3-4 columns | 4 columns |
| >1400px (wide/ultrawide) | 4+ columns, but max-width constrained | 4-6 columns |

---

## Key Changes

### 1. Primary + Advanced Split

**Primary Row (always visible):**
- Search (text input)
- Read Status (dropdown)
- Collection (dropdown)
- "More Filters" toggle button

**Advanced Section (collapsed by default):**
- Rating, Series, Wishlist, Ownership (dropdowns)
- Acquisition Date From/To (date pickers)
- Light background tint (e.g., `rgba(0,0,0,0.02)`) to distinguish

### 2. Inline Labels with Icons

Instead of:
```
📖 Read Status
[All Status ▼]
```

Use:
```
📖[All Status ▼]
```

- Icon on LEFT side of field (not above)
- Placeholder text shows default/current value
- Tooltip on hover shows full label name (accessibility)
- `aria-label` attribute for screen readers

### 3. Max-Width Constraints (Critical for Ultrawide)

```css
.filter-field {
    min-width: 150px;
    max-width: 220px;  /* Prevent absurd stretching */
}

.filter-field.search {
    min-width: 180px;
    max-width: 300px;  /* Search can be slightly wider */
}

.filter-field.date {
    min-width: 130px;
    max-width: 160px;  /* Date pickers don't need to be wide */
}
```

### 4. Responsive CSS Grid

```css
.filter-panel-primary {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    align-items: center;
}

.filter-panel-advanced {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    padding: 8px;
    background: rgba(0, 0, 0, 0.02);
    border-radius: 4px;
    margin-top: 8px;
}

/* Fields don't stretch - they stay at their natural/max width */
.filter-field {
    flex: 0 1 auto;
}
```

### 5. "More Filters" Toggle

- Shows count of active advanced filters: `▶ More Filters (2 active)`
- Expands/collapses Advanced section
- State persisted in localStorage

---

## Accessibility Considerations

| Element | Accessibility Feature |
|---------|----------------------|
| Icons as labels | `aria-label` on each field with full label text |
| Placeholders | Not relied upon for labeling (use `aria-label`) |
| Keyboard nav | Tab order: Primary fields → Toggle → Advanced fields |
| Screen readers | "Read Status filter, All Status selected" |
| Tooltips | Show full label on hover/focus |
| Toggle button | `aria-expanded` attribute |

---

## Space Savings

| Screen Width | Current | Collapsed | Expanded | Savings |
|--------------|---------|-----------|----------|---------|
| Any width | ~200px | ~50px | ~100px | **75% collapsed, 50% expanded** |

Primary benefit: Default state shows only what users need 90% of the time.

---

## Implementation Steps

### Phase 1: Restructure JSX (1-2 hours)
1. Split filters into Primary and Advanced groups
2. Add "More Filters" toggle button with state
3. Wrap Advanced section in collapsible container

### Phase 2: Inline Labels + Max-Width (1-2 hours)
1. Move icons inline (left of field)
2. Add max-width constraints to all fields
3. Remove separate label rows

### Phase 3: Styling + Polish (1 hour)
1. Add light background tint to Advanced section
2. Style toggle button
3. Add "(X active)" counter to toggle
4. Persist expanded/collapsed state in localStorage

### Phase 4: Testing (30 min)
1. Test at various viewport widths (mobile → ultrawide)
2. Test keyboard navigation
3. Test screen reader announcements

---

## Files to Modify

- `readerwrangler.js` - Filter panel JSX structure, toggle state
- `readerwrangler.css` - Flex layout, max-widths, Advanced section styling

---

## Open Questions (Resolved)

1. ~~**Icon-only vs Icon+Text**~~ → Icon inline with field, tooltip for full name
2. ~~**Collapse behavior**~~ → Primary always visible, Advanced collapsed by default
3. ~~**Filter chips for active filters**~~ → Future enhancement, show count in toggle for now

---

## Related Files

- `readerwrangler.js` - Lines ~800-950 (filter panel rendering)
- `readerwrangler.css` - Filter styling

---

## Mockup Reference

**Before (current):**
- 8 visual rows, ~200px height
- Labels above fields (wasteful)
- Fixed 3-column layout
- Fields stretch infinitely on wide screens

**After (proposed):**
- 2 visual rows collapsed (~50px), 4 rows expanded (~100px)
- Icons inline with fields
- Responsive flex layout with max-width constraints
- Primary/Advanced hierarchy based on actual usage
