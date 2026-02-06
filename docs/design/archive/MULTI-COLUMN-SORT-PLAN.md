# Multi-Column Sorting Implementation Plan

**Goal:** Enable Shift+Click to add secondary/tertiary sorts with visual indicators

**Use Case:** Folder contains multiple series → Sort by "Series" (primary), then "#" (secondary) within each series

---

## Current Implementation Analysis

### State Structure (line 211)
```javascript
const [explorerSort, setExplorerSort] = useState({ column: 'dateAdded', direction: 'desc' });
```
- Single sort with `{ column, direction }`
- Per-folder persistence via `folderSortSettings` (line 212)

### Header Click Handler (lines 9565-9570)
```javascript
onClick={() => setExplorerSort(prev => ({
    column: config.sortKey,
    direction: prev.column === config.sortKey
        ? (prev.direction === config.defaultDir ? ... : ...)
        : config.defaultDir
}))}
```
- Toggles direction on same column click
- Resets to default direction on new column click
- **No shift-click detection**

### Sort Logic (lines 9900-9954)
```javascript
sortedBooks.sort((a, b) => {
    if (explorerSort.column === 'custom') { ... }
    if (explorerSort.column === 'title') { ... }
    // ... etc for each column
    return dir * comparison;
});
```
- Single-level sort comparison
- Returns after first non-zero comparison

### Visual Indicators (lines 9580-9591)
```javascript
{config.label} {isSorted && (
    <>{explorerSort.direction === 'asc' ? '▲' : '▼'}</>
)}
```
- Shows ▲/▼ for sorted column
- No priority indicator

---

## Proposed Changes

### 1. State Structure Change

**New State:**
```javascript
const [explorerSort, setExplorerSort] = useState([
    { column: 'dateAdded', direction: 'desc' }
]);
```

**Array of sorts:**
- `explorerSort[0]` = primary sort
- `explorerSort[1]` = secondary sort (if exists)
- `explorerSort[2]` = tertiary sort (if exists)
- Max 3 levels (prevent clutter)

**Migration:**
- Load effect must handle legacy single-object format
- Convert `{ column, direction }` → `[{ column, direction }]`
- Save effect writes array format going forward

---

### 2. Header Click Handler

**Normal Click (no shift):**
- Clear all secondary sorts
- Toggle primary sort direction if same column
- Set new primary if different column

**Shift+Click:**
- Keep existing sorts
- If column already in list: toggle its direction
- If column not in list: add as next priority
- If at max (3 levels): replace last priority
- If shift-clicking primary: just toggle direction (don't demote)

**Implementation:**
```javascript
onClick={(e) => {
    if (!config.sortKey) return;

    e.stopPropagation();
    const isShiftClick = e.shiftKey;

    setExplorerSort(prev => {
        if (!isShiftClick) {
            // Normal click: single-column sort
            const isPrimary = prev[0]?.column === config.sortKey;
            return [{
                column: config.sortKey,
                direction: isPrimary
                    ? (prev[0].direction === config.defaultDir ? ... : ...)
                    : config.defaultDir
            }];
        } else {
            // Shift-click: add/toggle secondary sort
            const existingIndex = prev.findIndex(s => s.column === config.sortKey);

            if (existingIndex >= 0) {
                // Column already in sort list - toggle direction
                const updated = [...prev];
                updated[existingIndex] = {
                    ...updated[existingIndex],
                    direction: updated[existingIndex].direction === 'asc' ? 'desc' : 'asc'
                };
                return updated;
            } else {
                // Add as next priority (max 3 levels)
                if (prev.length >= 3) {
                    return [...prev.slice(0, 2), { column: config.sortKey, direction: config.defaultDir }];
                } else {
                    return [...prev, { column: config.sortKey, direction: config.defaultDir }];
                }
            }
        }
    });
}}
```

---

### 3. Visual Indicators

**Header Label:**
```javascript
const sortIndex = explorerSort.findIndex(s => s.column === config.sortKey);
const isSorted = sortIndex >= 0;

{config.label} {isSorted && (
    <>
        {explorerSort[sortIndex].direction === 'asc' ? '▲' : '▼'}
        {sortIndex > 0 && <sub>{sortIndex + 1}</sub>}
    </>
)}
```

**Subscript Numbers:**
- Primary (index 0): `▲` or `▼` (no number)
- Secondary (index 1): `▲₂` or `▼₂`
- Tertiary (index 2): `▲₃` or `▼₃`

**Alternative Unicode Subscripts:**
- ₁₂₃ - may not render well in all fonts
- Use `<sub>2</sub>` for better compatibility

---

### 4. Sort Logic

**Multi-level comparison:**
```javascript
sortedBooks.sort((a, b) => {
    // Special case: custom sort (manual order)
    if (explorerSort[0]?.column === 'custom') {
        return getFolderBookIds(selectedFolderId).indexOf(a.id) -
               getFolderBookIds(selectedFolderId).indexOf(b.id);
    }

    // Apply each sort level in priority order
    for (const sort of explorerSort) {
        const dir = sort.direction === 'asc' ? 1 : -1;
        let comparison = 0;

        if (sort.column === 'title') {
            comparison = (a.title || '').localeCompare(b.title || '');
        } else if (sort.column === 'author') {
            comparison = (a.author || '').localeCompare(b.author || '');
        } else if (sort.column === 'series') {
            comparison = (a.series || '').localeCompare(b.series || '');
        } else if (sort.column === 'seriesNum') {
            const numA = parseFloat(a.seriesPosition) || 0;
            const numB = parseFloat(b.seriesPosition) || 0;
            comparison = numA - numB;
        } else if (sort.column === 'rating') {
            comparison = (a.rating || 0) - (b.rating || 0);
        } else if (sort.column === 'dateAdded') {
            const dateA = parseBookDate(a.acquired || a.addedToWishlist);
            const dateB = parseBookDate(b.acquired || b.addedToWishlist);
            comparison = dateA - dateB;
        } else if (sort.column === 'price') {
            comparison = (a.currentPrice ?? Infinity) - (b.currentPrice ?? Infinity);
        } else if (sort.column === 'priceGoal') {
            comparison = (a.priceTrigger ?? Infinity) - (b.priceTrigger ?? Infinity);
        } else if (sort.column === 'delta') {
            const deltaA = (a.priceTrigger != null && a.currentPrice != null)
                ? (a.priceTrigger - a.currentPrice) : -Infinity;
            const deltaB = (b.priceTrigger != null && b.currentPrice != null)
                ? (b.priceTrigger - b.currentPrice) : -Infinity;
            comparison = deltaA - deltaB;
        }

        // If this level produces a non-zero result, use it
        if (comparison !== 0) {
            return dir * comparison;
        }
        // Otherwise continue to next sort level
    }

    return 0; // All levels equal
});
```

---

### 5. Column Menu Enhancement

**Add "Clear Secondary Sorts" option:**
```javascript
{explorerSort.length > 1 && (
    <>
        <div className="border-t border-gray-200 my-1"></div>
        <button
            onClick={() => setExplorerSort([explorerSort[0]])}
            className="w-full text-left px-4 py-2 hover:bg-blue-50 text-sm text-gray-700"
        >
            Clear Secondary Sorts
        </button>
    </>
)}
```

**Discoverability hint:**
```javascript
<div className="px-4 py-2 text-xs text-gray-500 italic border-t">
    Tip: Shift+Click headers for multi-column sort
</div>
```

---

### 6. Persistence

**Save Format:**
```javascript
// localStorage EXPLORER_KEY
{
    explorerSort: [
        { column: 'series', direction: 'asc' },
        { column: 'seriesNum', direction: 'asc' }
    ],
    ...
}
```

**Per-Folder Format:**
```javascript
// folderSortSettings
{
    'folder-123': [
        { column: 'title', direction: 'asc' }
    ],
    'folder-456': [
        { column: 'series', direction: 'asc' },
        { column: 'seriesNum', direction: 'asc' }
    ]
}
```

**Migration in Load Effect:**
```javascript
if (explorerData.explorerSort) {
    // Handle legacy single-object format
    const sort = Array.isArray(explorerData.explorerSort)
        ? explorerData.explorerSort
        : [explorerData.explorerSort];
    setExplorerSort(sort);
}
```

---

### 7. Sort Indicator Display

**Current indicator (line 9338-9350):**
```javascript
{explorerSort.column === 'custom' ? 'Manual Order' :
 explorerSort.column === 'title' ? 'Name' : ...}
```

**New multi-sort indicator:**
```javascript
const sortLabels = explorerSort.map((s, i) => {
    const label = s.column === 'custom' ? 'Manual Order' :
                  s.column === 'title' ? 'Name' :
                  s.column === 'author' ? 'Author' :
                  s.column === 'series' ? 'Series' :
                  s.column === 'seriesNum' ? '#' :
                  s.column === 'rating' ? 'Rating' :
                  s.column === 'dateAdded' ? 'Date Added' :
                  s.column === 'price' ? 'Price' :
                  s.column === 'priceGoal' ? 'Goal' :
                  s.column === 'delta' ? 'Under' :
                  s.column;
    const arrow = s.direction === 'asc' ? '▲' : '▼';
    return i === 0 ? `${label} ${arrow}` : `${label}${arrow}`;
});

{sortLabels.join(' → ')}
```

**Examples:**
- Single: `Series ▲`
- Multi: `Series ▲ → #▲`
- Triple: `Series ▲ → #▲ → Title▲`

---

## Implementation Steps

1. **Update state structure** (alpha.174)
   - Change `explorerSort` to array
   - Add migration logic in load effect
   - Test: Verify existing sorts still work

2. **Add shift-click detection** (alpha.174.1)
   - Modify header onClick handler
   - Add logic to build sort array
   - Test: Shift-click adds secondary sort

3. **Update visual indicators** (alpha.174.2)
   - Add subscript numbers (₂ ₃)
   - Update sort indicator display
   - Test: Visual feedback shows priority

4. **Implement multi-level sort logic** (alpha.174.3)
   - Refactor sort comparison to loop through levels
   - Test: Sort by Series → # works correctly

5. **Add column menu options** (alpha.174.4)
   - "Clear Secondary Sorts" button
   - Discoverability hint
   - Test: Can clear secondary sorts

6. **Update persistence** (alpha.174.5)
   - Save/load array format
   - Update per-folder settings
   - Test: Multi-sort persists across refresh

---

## Edge Cases

1. **Custom sort with secondaries**:
   - If primary is 'custom', ignore all secondary sorts (manual order is absolute)
   - Or allow secondaries but only within manual order ties (rare)
   - **Decision:** Ignore secondaries for simplicity

2. **Max 3 levels**:
   - Prevent going beyond tertiary
   - Replace last level when adding 4th
   - Show warning tooltip?

3. **Clearing primary**:
   - What if user shift-clicks to remove only secondary?
   - Need "X" button per level?
   - **Decision:** Use column menu "Clear Secondary Sorts" instead

4. **All Books view**:
   - No 'custom' sort available
   - Multi-sort works normally

5. **Folder navigation**:
   - Preserve multi-sort when switching folders
   - Or use per-folder saved sort?
   - **Decision:** Use per-folder saved sort (existing behavior)

---

## Testing Checklist

- [ ] Normal click clears secondaries and sets primary
- [ ] Shift-click adds secondary sort (max 3)
- [ ] Shift-click existing column toggles direction
- [ ] Visual indicators show priority (₁₂₃)
- [ ] Sort logic applies all levels correctly
- [ ] Sort indicator displays all levels (Series ▲ → #▲)
- [ ] Column menu "Clear Secondary Sorts" works
- [ ] Persistence saves/loads array format
- [ ] Migration handles legacy single-object format
- [ ] Per-folder settings work with multi-sort
- [ ] Custom sort ignores secondaries

---

## Code Locations

| Component | Lines | Changes |
|-----------|-------|---------|
| State declaration | ~211 | Change to array |
| Load effect | ~1127-1133 | Add migration logic |
| Save effect | ~1384-1400 | Handle array format |
| Header onClick | ~9565-9570 | Add shift detection |
| Visual indicators | ~9580-9591 | Add subscripts |
| Sort logic | ~9900-9954 | Loop through levels |
| Sort indicator | ~9338-9350 | Display all levels |

---

## Performance Considerations

- Multi-level sort is still O(n log n) with more comparisons
- Each level adds one comparison per sort operation
- Worst case: 3 comparisons per book pair
- For 1000 books: ~30k comparisons (negligible)
- No performance concerns expected

---

## UI/UX Notes

**Discoverability:**
- Shift-click is hidden functionality
- Add tooltip on hover: "Click to sort • Shift+Click for multi-level"
- Add hint in column menu
- Consider brief tutorial/tooltip on first use?

**Visual Clarity:**
- Subscripts (₂₃) may be hard to read
- Alternative: Use colored badges (🔵¹ 🟢² 🟡³)?
- Keep simple: ▲₂ ▼₃

**Error Prevention:**
- Accidental shift-clicks might confuse users
- "Clear Secondary Sorts" provides escape hatch
- Normal click always resets to single-column

---

## Future Enhancements

- **Drag to reorder sort priorities**: Drag header badges to change priority
- **Sort builder UI**: Modal with visual sort criteria list
- **Save named sort presets**: "Series Reading Order", "Recent Purchases", etc.
- **Column menu quick presets**: Common multi-sorts like "Series + #"
