# Saved Filter Views — Design Plan

## Overview

Generalize the concept of "Views" from pinned-tag-only to any saved filter combination. A View is a named, saved set of filters that appears in the sidebar under Views. Tag Views become a special case of this — a view with a single tag filter.

**Motivation:** The current "pin tag as view" mechanism is nearly invisible (a dim folder icon in Tag Manager). Users who discover tags via Tag from Collections or the filter bar have no intuitive way to promote a filtered view to a sidebar shortcut. This feature makes Views a first-class, general-purpose concept.

---

## The Problem

- Pinning a tag as a View requires: View > Manage Tags > click an ambiguous folder icon
- The developer (sole user) couldn't find this feature after 2 weeks away
- No way to save multi-tag, multi-filter combinations as reusable views
- Tag Views are a special case hard-coded with their own data structure (`pinnedTagFolders`)

---

## Current State

### Data Model

```javascript
pinnedTagFolders: [
    { tagId: "mystery", position: 1 },
    { tagId: "sci-fi", position: 3 }
]
```

### Sidebar

```
VIEWS
  📚 All Books (118)
  🏷️ Mystery (12)        ← pinned tag view
  🏷️ Sci-Fi (8)          ← pinned tag view
FOLDERS
  📥 Inbox (0/0)
  📁 Classics & Literature (6/10)
  ...
```

### Active Filters (all independent state variables)

| Filter | State Variable | Type |
|--------|---------------|------|
| Search | `searchTerm` | string |
| Read Status | `readStatusFilter` | string: "READ" / "UNREAD" / "" |
| Tags | `tagFilter` | string[] (tag IDs, OR logic) |
| Collections | `selectedCollections` | string[] (OR logic) |
| Ownership | `ownershipFilter` | string |
| Series | `selectedSeries` | string[] (OR logic) |
| Amazon Rating | `minAmazonRating` | string (min rating) |
| My Rating | `minMyRating` | string |
| Date | `datePreset` + `dateFrom` + `dateTo` | string |
| Deals | `dealsFilterActive` | boolean |

---

## Proposed State

### Data Model

Replace `pinnedTagFolders` with `savedViews`:

```javascript
savedViews: [
    {
        id: "view_abc123",          // unique ID
        name: "Mystery",            // user-editable display name
        filters: {
            tags: ["mystery"]       // single-tag view (migrated from pinnedTagFolders)
        },
        position: 1                 // sort order in sidebar
    },
    {
        id: "view_def456",
        name: "Unread Sci-Fi",
        filters: {
            tags: ["sci-fi"],
            readStatus: "UNREAD"
        },
        position: 3
    },
    {
        id: "view_ghi789",
        name: "Recent Purchases",
        filters: {
            ownership: "purchased",
            datePreset: "last90"
        },
        position: 5
    }
]
```

### Filter Object Schema

```javascript
{
    // All fields optional. Omitted = no filter on that dimension.
    tags: ["mystery", "fantasy"],         // OR logic: book has ANY of these tags
    readStatus: "READ",                   // exact match
    collections: ["Favorites", "To Read"],// OR logic
    ownership: "purchased",               // exact match
    series: ["The Sandman"],              // OR logic (or "NOT_IN_SERIES")
    minAmazonRating: "4",                 // minimum
    minMyRating: "3",                     // minimum (or "unrated")
    datePreset: "last90",                 // or "custom" with dateFrom/dateTo
    dateFrom: "2025-01-01",              // only when datePreset === "custom"
    dateTo: "2025-12-31",               // only when datePreset === "custom"
    search: "Gaiman",                     // search term
    deals: true                           // deals filter
}
```

This maps 1:1 to the existing filter state variables. When a saved view is selected, its filters are applied to the display. When the user modifies filters while viewing a saved view, the view can optionally be updated (or the modifications are temporary until navigation away).

### Sidebar ID Convention

Saved views use `__view_<id>__` as their folder ID. This replaces `__tag_<tagId>__`.

### Migration

On load, if `pinnedTagFolders` exists and `savedViews` does not:

```javascript
const savedViews = pinnedTagFolders.map(p => ({
    id: `migrated_tag_${p.tagId}`,
    name: tagRegistry[p.tagId]?.label || p.tagId,
    filters: { tags: [p.tagId] },
    position: p.position
}));
```

After migration, `pinnedTagFolders` is removed from stored state.

---

## Creating Views

Both creation methods use **drag-to-sidebar** for consistency. The user drags from a source (filter bar or Tag Manager) and drops onto the Views section in the sidebar, choosing the exact position.

### Method 1: From the Active Filters Banner (Primary)

When filters are active, a drag handle (⠿) appears on the Active Filters banner:

```
🔍 Active: Tags: Mystery | Read: UNREAD    [⠿]  [Clear All ×]
```

**Drag interaction:**
1. User grabs the ⠿ handle
2. Sidebar Views section highlights as a drop zone
3. Drop indicators show position (between existing views)
4. On drop: creates a saved view with the current active filters
5. Auto-named (see naming rules below)
6. Inline rename activates immediately so user can customize the name

### Method 2: From Tag Manager (Convenience)

Tag Manager rows get a drag handle for dragging to Views:

**Current row:**
```
☐  📁  Mystery          12   ✏️  🗑️
```

**Proposed row — drag handle replaces folder icon:**
```
☐  ⠿  Mystery          12   ✏️  🗑️
```

**Drag interaction:**
1. User grabs the ⠿ handle (single tag) or selects multiple tags then grabs any handle
2. Tag Manager modal **hides** (moves out of the way — closed temporarily)
3. Sidebar Views section is now visible with drop zone highlighted
4. User drops at desired position
5. View created with `{filters: {tags: [selectedTagIds]}}`
6. Tag Manager **reopens** at same scroll position and selection state
7. Toast confirms: "Mystery added to Views"
8. User can immediately drag another tag — no manual reopen needed

**Multi-select drag:** Select 2+ tags → drag → creates ONE view with all selected tags (OR logic). Auto-named from tag labels joined with comma.

**Already-a-view indicator:** Tags that are already saved views show a 📌 icon next to the drag handle. This is display-only (not clickable) — just shows "this tag is already in Views."

### Method 3: From Tag from Collections Wizard (Post-Apply)

After Apply creates tags, the results toast includes a nudge:
"Created X tags. Drag them to Views in Tag Manager to see them in the sidebar."

### Auto-naming Rules

- Single tag: use tag label → "Mystery"
- Multiple tags: join labels → "Mystery, Fantasy"
- Single non-tag filter: describe it → "Unread Books"
- Mixed: first tag or filter + count → "Mystery + 1 more filter"
- Fallback: "New View"
- User can always rename via inline edit on drop, or right-click → Rename later

---

## Selecting a View

When a saved view is clicked in the sidebar:

1. Set `selectedFolderId` to the view's ID (`__view_<id>__`)
2. Apply all filters from `view.filters` to the corresponding state variables
3. Clear any filters NOT in the view (so the display exactly matches the saved view)
4. Right pane shows the filtered book list (same as All Books + filters)

### Behavior while viewing a saved view

- User can modify filters freely (add/remove filters). The display updates live.
- Modified filters are **temporary** — navigating to a folder or another view reverts to the saved state.
- A subtle indicator could show "modified" state, with an option to update the view. (Nice-to-have, not required for v1.)

---

## Managing Views

### Right-click context menu on a View in sidebar

| Item | Action |
|------|--------|
| Rename | Inline edit (same as folder rename) |
| Delete | Remove from savedViews |
| Edit Filters... | (Future: open a filter editor dialog) |

### Reorder

Views are reorderable via drag-and-drop in the sidebar (same pattern as current tag views — already implemented).

### Cascading Deletes

When a referenced entity is deleted:
- **Tag deleted**: Remove the tag ID from `filters.tags` in all saved views. If `filters` becomes empty (all criteria removed), delete the view.
- **Same logic for collections, series, etc.** if those entities can be deleted.
- Check on app load and after any tag/collection deletion.

---

## Sidebar Rendering

```
VIEWS
  📚 All Books (118)
  🏷️ Mystery (12)             ← saved view: {tags: ["mystery"]}
  🔍 Unread Sci-Fi (3)        ← saved view: {tags: ["sci-fi"], readStatus: "UNREAD"}
  🔍 Recent Purchases (7)     ← saved view: {ownership: "purchased", datePreset: "last90"}
FOLDERS
  📥 Inbox (0/0)
  ...
```

**Icon logic:**
- Views with only tag filters: 🏷️ (tag icon) — preserves current visual language
- Views with non-tag filters (or mixed): 🔍 (search/filter icon)
- All Books: 📚 (unchanged)

**Tooltip on hover:** Shows the filter summary. "Tags: Mystery" or "Tags: Sci-Fi | Read Status: Unread"

---

## Files Modified

| File | Changes |
|------|---------|
| `readerwrangler.js` | (1) Replace `pinnedTagFolders` with `savedViews` state + migration; (2) Update sidebar rendering; (3) Add drag handle to Active Filters banner; (4) Update Tag Manager with drag handle + modal hide/reopen on drag; (5) Update view selection to apply filters; (6) Update save/restore to use savedViews; (7) Update cascading deletes; (8) Update all `__tag_*__` references to `__view_*__`; (9) Update device-state for mobile |

---

## What's NOT in Scope (v1)

- **Filter editor dialog** for modifying a view's saved filters after creation
- **"Modified view" indicator** — user can just re-save
- **Deals filter in views** — rarely used, can add later
- **Search term in views** — semantically different (search is transient), could confuse. Omit for now.

---

## Implementation Steps

### Step 1: Replace infrastructure, preserve behavior

Convert all `pinnedTagFolders` / `__tag_*__` references to `savedViews` / `__view_*__`. Migrate on load. All existing tag view functionality works identically through the new data structure. Tag Manager gets drag handle with modal hide/reopen behavior. **Test point:** existing tag views still work identically.

### Step 2: Add filter bar drag handle

Add drag handle (⠿) to Active Filters banner. Drop creates `savedViews` entry with current filter state. Auto-names. Inline rename on drop. Uses same sidebar drop zone from Step 1.

---

## Verification

1. **Migration**: Load app with existing pinnedTagFolders → verify they appear as saved views with correct names and positions
2. **Single-tag view from Tag Manager**: Drag tag to Views section → view appears at drop position → click it → books filtered by that tag
3. **Multi-tag view from Tag Manager**: Select 2 tags → drag → single view with both tags appears → shows union of both tags' books
4. **Tag Manager modal hide/reopen**: Drag from Tag Manager → modal hides → drop on Views → modal reopens at same position → drag another → repeat
5. **Save from filter bar**: Apply Tags: Mystery + Read: UNREAD → drag ⠿ to Views → view appears → named "Mystery" or similar
6. **Complex filter view**: Apply Tags + Rating + Series → drag to Views → verify all filters restored when view clicked
7. **Rename**: Right-click view → Rename → verify new name persists. Also: inline rename activates on drop.
8. **Delete view**: Right-click → Delete → view removed from sidebar
9. **Reorder**: Drag view above/below another → verify position persists
10. **Tag deletion cascade**: Delete a tag that's in a saved view's filters → verify tag removed from view filters → if filters empty, view deleted
11. **Backward compatibility**: App loads with no savedViews and no pinnedTagFolders → Views section shows only All Books
12. **Book counts**: View shows correct count matching the filter criteria
13. **Navigation**: Click view → filters applied → click a folder → filters cleared → click view again → filters re-applied
14. **Already-a-view indicator**: Tag Manager shows 📌 next to tags that are already in a saved view
