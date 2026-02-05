# Phase 4.5: Personal Rating Feature - Implementation Plan

**Version:** v5.0.0-alpha.175.31
**Created:** 2026-02-05
**Status:** Ready for implementation

---

## Overview

Add personal rating system (0-5 stars) separate from Amazon ratings. Users can rate books based on personal opinion, sort/filter by personal rating, and preserve ratings across imports.

**Key principle:** User-curated ratings are distinct from crowd-sourced Amazon ratings.

---

## Pre-Implementation

- [ ] Read [DATA-SCHEMA.md](DATA-SCHEMA.md) - Review field mapping patterns
- [ ] Review Phase 4 backup/restore implementation (v175.17-175.28)
- [ ] Understand existing rating column code (Amazon rating)

---

## Step 1: Data Model (v175.31)

### 1.1 Add myRating field to book object

**File:** `readerwrangler.js`

- [ ] Find where books are created/initialized (search for `normalizeBook` or book object creation)
- [ ] Add `myRating: 0` to default book object
- [ ] Document: 0 = unrated, 1-5 = rated

**Code location:** Likely in `normalizeBook()` function or book import logic

**Expected code:**
```javascript
const normalizedBook = {
  // ... existing fields ...
  myRating: book.myRating || 0,  // 0 = unrated, 1-5 = rated
};
```

### 1.2 Add myRating to COLUMN_CONFIG

**File:** `readerwrangler.js` ~line 6-18 (COLUMN_CONFIG)

- [ ] Add new column config after `rating`:
```javascript
myRating: {
  label: 'My Rating',
  sortKey: 'myRating',
  defaultDir: 'desc',  // Highest rated first
  cssVar: '--col-myRating'
}
```

**Testing:**
- [ ] Verify column config doesn't break existing columns

---

## Step 2: Backup Export (v175.31)

### 2.1 Include myRating in backup export

**File:** `readerwrangler.js` ~line 2633 (exportBackup function)

- [ ] Find: `const bookItems = books.map(book => ({`
- [ ] Add `myRating: book.myRating` alongside `note`, `tags`, `priceTrigger`

**Expected code:**
```javascript
const bookItems = books.map(book => ({
  asin: book.asin,
  title: book.title,
  // ... other fields ...

  // User metadata
  tags: book.tags,
  note: book.userNote,           // ⚠️ Field name mapping
  priceTrigger: book.priceTrigger,
  myRating: book.myRating         // ✓ New field
}));
```

**Reference:** DATA-SCHEMA.md "Memory → Backup Export" section

**Testing:**
- [ ] Export backup
- [ ] Open backup JSON in text editor
- [ ] Verify `myRating` field present in bookItems

---

## Step 3: Backup Import (v175.31)

### 3.1 Restore myRating from backup import

**File:** `readerwrangler.js` ~line 3027 (importBackup function)

- [ ] Find: `const importedBooks = backupData.library.bookItems.map(item => ({`
- [ ] Add `myRating: item.myRating || 0` alongside `userNote`, `tags`, `priceTrigger`

**Expected code:**
```javascript
const importedBooks = backupData.library.bookItems.map(item => ({
  ...item,
  id: item.asin || generateId(),

  // User metadata - field name mappings
  tags: item.tags,
  userNote: item.note,                // ⚠️ note → userNote
  priceTrigger: item.priceTrigger,
  myRating: item.myRating || 0        // ✓ New field, default to 0
}));
```

**Reference:** DATA-SCHEMA.md "Backup Import → Memory" section

**Testing:**
- [ ] Create backup with myRating values
- [ ] Reset app
- [ ] Import backup
- [ ] Verify myRating values restored correctly
- [ ] Verify unrated books default to 0

---

## Step 4: Amazon Import Preservation (v175.31)

### 4.1 Preserve myRating during Amazon library import

**File:** `readerwrangler.js` - `importLibrary()` function

- [ ] Find where existing books are merged with new Amazon data
- [ ] Ensure `myRating` is preserved (likely already handled by existing merge logic)

**Expected pattern:**
```javascript
const mergedBook = {
  ...newBook,  // Amazon data (overwrites)

  // Preserve user metadata from existing book
  userNote: existingBook?.userNote,
  tags: existingBook?.tags || [],
  priceTrigger: existingBook?.priceTrigger,
  myRating: existingBook?.myRating || 0,  // ✓ Preserve personal rating
};
```

**Testing:**
- [ ] Set myRating on a book
- [ ] Import new Amazon library data
- [ ] Verify myRating preserved (not overwritten)

---

## Step 5: Book Dialog - Star Picker UI (v175.31)

### 5.1 Find book dialog rendering

**File:** `readerwrangler.js` - Search for "book dialog" or modal rendering

- [ ] Locate book details dialog/modal
- [ ] Find where Amazon rating is displayed
- [ ] Add "My Rating" section below Amazon rating

### 5.2 Create star picker component

**Location:** Inline in book dialog rendering

**Expected UI:**
```
Amazon Rating: ★★★★☆ 4.2 (crowd rating)
────────────────────────────────────────
My Rating:     [☆☆☆☆☆]  (click to rate)
               ↑ hover/click to set rating
```

**Implementation:**
- [ ] Create 5 clickable star elements
- [ ] Visual states:
  - Unrated (0): All stars empty (☆☆☆☆☆)
  - Rated (1-5): Filled stars (★) + empty stars (☆)
  - Hover: Show preview of rating
- [ ] Color differentiation:
  - Amazon rating: Yellow/amber (#fbbf24)
  - My Rating: Blue (#3b82f6) or keep same color with clear label
- [ ] Click handler: `setBooks(prev => prev.map(b => b.id === book.id ? { ...b, myRating: rating } : b))`

**Code sketch:**
```jsx
{/* My Rating */}
<div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid #e2e8f0' }}>
  <div style={{ fontSize: '13px', color: '#64748b', marginBottom: '4px' }}>
    My Rating:
  </div>
  <div style={{ display: 'flex', gap: '4px' }}>
    {[1, 2, 3, 4, 5].map(rating => (
      <span
        key={rating}
        onClick={() => {
          setBooks(prev => prev.map(b =>
            b.id === book.id ? { ...b, myRating: rating } : b
          ));
        }}
        style={{
          fontSize: '20px',
          cursor: 'pointer',
          color: rating <= (book.myRating || 0) ? '#3b82f6' : '#cbd5e1',
          transition: 'color 0.1s'
        }}
        onMouseEnter={(e) => e.target.style.color = '#3b82f6'}
        onMouseLeave={(e) => e.target.style.color = rating <= (book.myRating || 0) ? '#3b82f6' : '#cbd5e1'}
      >
        {rating <= (book.myRating || 0) ? '★' : '☆'}
      </span>
    ))}
    {book.myRating > 0 && (
      <button
        onClick={() => {
          setBooks(prev => prev.map(b =>
            b.id === book.id ? { ...b, myRating: 0 } : b
          ));
        }}
        style={{
          marginLeft: '8px',
          fontSize: '11px',
          color: '#94a3b8',
          background: 'none',
          border: 'none',
          cursor: 'pointer'
        }}
      >
        Clear
      </button>
    )}
  </div>
</div>
```

**Testing:**
- [ ] Click stars to set rating (1-5)
- [ ] Verify visual feedback (filled vs empty stars)
- [ ] Click "Clear" to remove rating (set to 0)
- [ ] Verify rating persists when closing and reopening dialog

---

## Step 6: List View Column (v175.31)

### 6.1 Add My Rating column rendering

**File:** `readerwrangler.js` - Find where columns are rendered in list view

- [ ] Locate column rendering logic (search for `rating` column)
- [ ] Add `myRating` column case

**Expected code:**
```javascript
{col.id === 'myRating' && (
  <td key={col.id} style={{ /* ... */ }}>
    {book.myRating > 0 ? (
      <span style={{ color: '#3b82f6', fontSize: '14px' }}>
        {'★'.repeat(book.myRating)}{'☆'.repeat(5 - book.myRating)}
      </span>
    ) : (
      <span style={{ color: '#cbd5e1', fontSize: '13px' }}>—</span>
    )}
  </td>
)}
```

**Visual design:**
- If rated (1-5): Show blue stars (★★★☆☆)
- If unrated (0): Show "—" in gray

### 6.2 Make column hideable

**File:** Check existing column visibility logic

- [ ] Verify myRating column follows existing show/hide pattern
- [ ] Likely automatic if COLUMN_CONFIG is set up correctly

**Testing:**
- [ ] Show My Rating column in list view
- [ ] Verify stars display correctly (1-5 stars)
- [ ] Verify unrated books show "—"
- [ ] Verify column can be hidden/shown via column settings

---

## Step 7: Sort by My Rating (v175.31)

### 7.1 Add sort option to dropdown

**File:** `readerwrangler.js` - Find sort options dropdown

- [ ] Locate sort dropdown rendering
- [ ] Add "My Rating" option

**Expected code:**
```javascript
<option value="myRating">My Rating</option>
```

### 7.2 Implement sort logic

**File:** Sort function in list view

- [ ] Verify sort key 'myRating' works with existing sort logic
- [ ] Handle unrated books (0) sorting:
  - Ascending: Unrated books (0) at end
  - Descending: Unrated books (0) at end

**Sort logic:**
```javascript
if (sortBy === 'myRating') {
  sorted.sort((a, b) => {
    const aRating = a.myRating || 0;
    const bRating = b.myRating || 0;

    // Unrated (0) always at end
    if (aRating === 0 && bRating > 0) return 1;
    if (bRating === 0 && aRating > 0) return -1;

    // Normal numeric sort
    return sortDir === 'asc'
      ? aRating - bRating
      : bRating - aRating;
  });
}
```

**Testing:**
- [ ] Sort by My Rating ascending
- [ ] Sort by My Rating descending
- [ ] Verify unrated books (0) sort to end in both directions
- [ ] Verify 5-star books at top when descending

---

## Step 8: CSS Variables (v175.31)

### 8.1 Add CSS variable for My Rating column width

**File:** `readerwrangler.js` - Find CSS variables (style tag or CSS section)

- [ ] Add `--col-myRating` variable
- [ ] Set default width (e.g., 100px)

**Expected code:**
```css
:root {
  --col-title: 300px;
  --col-author: 200px;
  --col-rating: 100px;
  --col-myRating: 100px;  /* New column */
  /* ... other columns ... */
}
```

**Testing:**
- [ ] Verify column displays at correct width
- [ ] Verify column is resizable (if resize feature exists)

---

## Step 9: Version Increment (v175.31)

### 9.1 Update version number

**File:** `readerwrangler.js` ~line 4

- [ ] Update: `const ORGANIZER_VERSION = "5.0.0-alpha.175.31";`

**Testing:**
- [ ] Verify version displayed correctly in About dialog

---

## Testing Checklist

### Unit Tests (per step)
- [ ] Data model: myRating defaults to 0
- [ ] Backup export: myRating in JSON
- [ ] Backup import: myRating restored
- [ ] Amazon import: myRating preserved
- [ ] Star picker: Set/clear rating works
- [ ] List column: Stars display correctly
- [ ] Sort: Ascending/descending works
- [ ] CSS: Column width correct

### Integration Tests
- [ ] **Full cycle:** Set rating → Reload page → Rating persists
- [ ] **Backup cycle:** Set rating → Export → Reset → Import → Rating restored
- [ ] **Amazon import:** Set rating → Import Amazon data → Rating preserved
- [ ] **Sort + Filter:** Sort by My Rating + filter by Tags → Works together
- [ ] **Visual distinction:** Amazon rating vs My Rating clearly differentiated
- [ ] **Unrated handling:** Books with myRating=0 display as "—" and sort correctly

### Edge Cases
- [ ] Unrated book (0) displays correctly in list view
- [ ] Rating book that has no Amazon rating
- [ ] Clearing rating (set to 0) works
- [ ] Old backup files (without myRating) import correctly (default to 0)
- [ ] Very large library (2500+ books) - rating performance acceptable

### Regression Tests
- [ ] Amazon rating column still works
- [ ] Existing sort options still work
- [ ] Existing filters still work
- [ ] Column show/hide still works
- [ ] Book dialog other fields still work

---

## Commit Strategy

### Option A: Single commit (Recommended if < 2 hours work)
```
v5.0.0-alpha.175.31 - Phase 4.5: Personal rating feature

Add myRating field (0-5) for personal book ratings:
- Star picker in book dialog (blue stars, clickable)
- "My Rating" column in list view (optional, hideable)
- Sort by My Rating (unrated books sort to end)
- Backup export/import preserves myRating
- Amazon import preserves myRating
- Visual distinction from Amazon rating

Data model:
- myRating: 0 = unrated, 1-5 = rated
- Field name consistent across all boundaries (no mapping needed)
- Follows existing user metadata pattern (like tags, priceTrigger)

Testing: Full backup/restore cycle, sort, filter, Amazon import preservation

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>
```

### Option B: Multiple commits (If testing between steps)
1. v175.31.a - Data model + backup/restore
2. v175.31.b - Book dialog star picker
3. v175.31.c - List view column + sort

---

## Post-Implementation

- [ ] Update [MENUBAR-TOOLBAR-IMPLEMENTATION.md](MENUBAR-TOOLBAR-IMPLEMENTATION.md) - Mark Phase 4.5 complete
- [ ] Update [DATA-SCHEMA.md](DATA-SCHEMA.md) - Verify myRating documentation accurate
- [ ] User testing: Get feedback on star picker UX
- [ ] Document any issues in session log

---

## Reference Documents

- **Field Mappings:** [DATA-SCHEMA.md](DATA-SCHEMA.md)
- **Implementation Checklist:** [MENUBAR-TOOLBAR-IMPLEMENTATION.md](MENUBAR-TOOLBAR-IMPLEMENTATION.md)
- **Session Log:** [BOOK-EXPLORER-SESSION-LOG.md](BOOK-EXPLORER-SESSION-LOG.md)

---

## Notes

- **Why myRating not My Rating?** Consistent with camelCase naming (userNote, priceTrigger, tagRegistry)
- **Why 0 for unrated?** Simplifies sorting logic and JSON representation (no null handling)
- **Why blue stars?** Visual differentiation from Amazon's yellow/amber rating
- **Why no half-stars?** Keep it simple (1-5 integer rating), matches common UX pattern

---

## Estimated Time

**Total:** 2-3 hours

- Data model + backup/restore: 30 min
- Book dialog star picker: 45 min
- List view column: 30 min
- Sort logic: 20 min
- Testing: 45 min
