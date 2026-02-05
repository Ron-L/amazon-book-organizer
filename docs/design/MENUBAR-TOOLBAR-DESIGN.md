# ReaderWrangler™ UI Redesign: Menu Bar + Toolbar

## Overview

Replace the current hero banner and collapsible filter bar with a compact two-row chrome inspired by native desktop applications (Windows File Explorer, VS Code, Lightroom). This reclaims valuable vertical space while improving discoverability and maintaining brand identity.

## Problem

The current UI dedicates ~100px (collapsed) to ~145px (filters expanded) of vertical space to the hero banner, action buttons, and filter controls. In Book Explorer mode — a tool-oriented interface for managing 2,500+ books — this is prime real estate better used for content. The banner with logo, tagline, and version number is a leftover from the original Column App layout where the visual identity served as a landing-page anchor. In the Explorer paradigm, users need controls, not branding.

## Proposed Layout

### Row 1 — Menu Bar (~32px)

```
[🎨] ReaderWrangler™  │  File ▾   View ▾   Help ▾                    ✅ Data Status: Fresh
```

**Left zone — Brand identity:**
- Small logo icon from `icons/ReaderWranglerWordless32.png` (~20px display height) + app name in bold
- Separated from menus by a subtle vertical divider
- Version number removed from persistent display (moved to Help → About)

**Center zone — Menus:**

| Menu | Contents |
|------|----------|
| **File** | Import Library…, Export Library…, ──, Reset App |
| **View** | List View ✓, Cover View, ──, Show Hidden ✓, Deals Only |
| **Help** | How To Use, Keyboard Shortcuts, ──, About ReaderWrangler™ |

**Right zone — Status indicator:**
- Data Status badge (Fresh / Stale / Busy / Empty) with color-coded pill
- Persistent and always visible, similar to "All changes saved" in Google Docs

### Row 2 — Toolbar (~36px)

```
🔍 [Title or author…]  │  📊 All Status ▾  🏷️ All Tags ▾  📖 All Types ▾  ▼ More  │  ☑ Hidden  ☐ Deals (1)  │  2,577 of 2,577  │  [≡][⊞]
```

**Left zone — Search/filter input:**
- Search box with 🔍 icon and placeholder "Title or author..." (140-180px)
- No explicit "Search" or "Filter" label needed — icon + placeholder communicate purpose
- Separated from filters by a vertical divider

**Center zone — Filters:**
- 3 primary filter dropdowns shown directly: Status, Tags, Type
- "More" button opens a floating overlay panel with additional filters: Collections, Rating, Series, Date Added
- Active filters get visual emphasis (blue background, blue border)
- Filter priority based on user workflow: Status (owned/wishlist toggle), Tags (reading queue), Types (Kindle filtering)

**Right zone — View controls:**
- Toggle checkboxes: Show Hidden, Deals Only (with count badge)
- Book count readout: "2,577 of 2,577"
- List/Covers view toggle (segmented button)
- Note: Sort is handled by clicking column headers (accessible sort options may be added in Priority 3 accessibility task)

## Design Decisions

### Why filters stay in the toolbar (not in a menu)

Filters represent *state*, not *actions*. Users need to:
1. See at a glance what's currently filtered
2. Adjust multiple filters in quick succession
3. Notice when filtering is active

Burying filters in a menu adds clicks, hides active state, and makes multi-filter adjustments tedious. The toolbar with overflow ("More" panel) balances visibility with space efficiency.

### Why Show Hidden and Deals Only move to the toolbar as toggles

These are binary view-state toggles that users check frequently. As compact toggle buttons in the toolbar (rather than full-width checkboxes), they're always one click away while consuming minimal space. They also appear in the View menu as redundant access points.

### Why the "More Filters" panel floats

The current filter bar expands *inline*, pushing all content down by ~45px. A floating overlay panel appears on top of content, so the layout never shifts. This eliminates the jarring content-push effect and keeps the chrome height constant at ~68px.

### Where the logo goes

The full illustrated logo moves to Help → About. This is standard practice for tool-oriented apps — the About dialog is where personality and branding live. The menu bar retains a small icon + text name for identity without the space cost.

**About dialog requirements:**
- Full lasso-and-book logo illustration
- "ReaderWrangler™" title
- "YOUR BOOKS, YOUR ORDER" tagline
- Version number (e.g., v5.0.0-alpha.174.4)
- Copyright: "© 2024-2026 AlloidLabs.com"
- Clickable link to AlloidLabs.com
- Brief description: "A Chrome extension for organizing your Amazon Kindle library"

## Space Comparison

| State | Current | Proposed | Savings |
|-------|---------|----------|---------|
| Filters collapsed | ~100px | ~68px | ~32px |
| Filters expanded | ~145px | ~68px (overlay) | ~77px |

The proposed layout is *constant height* — no expansion or collapse needed.

## Visual Hierarchy

```
┌─────────────────────────────────────────────────────────────────┐
│ [🎨] ReaderWrangler™ │ File  View  Help        ✅ Data: Fresh  │  ← Menu bar (32px)
├─────────────────────────────────────────────────────────────────┤
│ 🔍 [Title…] │ Status Tags Types More │ ☑ Hidden │ 2,577 [≡][⊞] │  ← Toolbar (36px)
├────────────┬────────────────────────────────────────────────────┤
│            │  My Library › John Scalzi (5 folders, 62 books)   │  ← Breadcrumb
│  Sidebar   │───────────────────────────────────────────────────│
│  (folders) │  📁 Old Man's War                                 │  ← Content
│            │  📁 The Far Reaches                               │
│            │  ─────────────────────────────────────────────────│
│            │  ☑ The Dispatcher    John Scalzi  ★★★★  $5.99    │
│            │  ☑ Monsters of Ohio  John Scalzi  —     $14.99   │
└────────────┴────────────────────────────────────────────────────┘
```

## Implementation Notes

- Menu bar uses a subtle gradient background (`#f8fafc` → `#f1f5f9`) to visually separate from the toolbar
- Menus support hover-to-switch (open one menu, hover to another to switch without clicking)
- Compact filter dropdowns use a consistent 26px height
- "More Filters" overlay uses a 3-column grid layout for the additional filter controls
- All interactive elements use the existing blue accent color (`#2563eb`) for active/selected states
- View toggle is a segmented button matching the current List/Covers pattern

### Help Menu Implementation

**How To Use** - Opens a placeholder dialog for Phase 1:
- Title: "How To Use ReaderWrangler"
- Message: "Comprehensive documentation is coming soon. For now, explore the menus to discover features!"
- Links to existing docs if available (USER-GUIDE.md when completed in Priority 4)

**Keyboard Shortcuts** - Opens a modal showing available shortcuts:
- Can be generated from code handlers during implementation
- Common shortcuts: Ctrl+Z/Y (undo/redo), Ctrl+A (select all), Ctrl+C/X (copy/cut), drag operations, etc.
- Implementation can reference existing keyboard event handlers in `readerwrangler.js`

**About ReaderWrangler™** - Opens About dialog (see "Where the logo goes" section above for requirements)

## Interactive Mockup

A working React mockup is available as `ReaderWrangler-MenuBar-Mockup.html` — open in any browser to interact with the menus, filters, and overflow panel.
