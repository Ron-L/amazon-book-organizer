# Feature Implementation Roadmap

**Created**: 2025-11-11
**Status**: Active Planning
**Current Phase**: Post v3.3.2 Release

---

## Priority Order (User-Defined)

1. Multi-Select with Ctrl/Shift Clicking
2. GitHub Pages Distribution
3. Collections Filter Bug Fix
4. Collections Integration - UI Features
5. Phase 3 Retry Logic (v3.4.0)
6. UX Quick Wins (Various)

---

## #1: Multi-Select with Ctrl/Shift Clicking

**Priority**: #1 (User Priority)
**Target Version**: v3.4.0
**Complexity**: 🟡 Medium
**Estimated Time**: 4-6 hours
**Token Cost**: ~35-50K tokens
**Impact**: HIGH - Major UX improvement, enables bulk operations

### What

Enable selecting multiple books at once with keyboard modifiers for bulk operations.

### Features

- **Ctrl+Click**: Toggle individual book selection (add/remove from selection set)
- **Shift+Click**: Select range from last clicked book to current book
- **Visual Feedback**: Selected books have distinct visual state (border, highlight, or checkmark)
- **Bulk Operations**: Assign multiple books to a column at once
- **Selection Persistence**: Selection state maintained during scrolling/filtering
- **Clear Selection**: Click empty space or ESC key to clear selection

### Technical Implementation

**State Management**:
```javascript
const [selectedBooks, setSelectedBooks] = useState(new Set());
const [lastClickedBook, setLastClickedBook] = useState(null);
```

**Event Handler Pattern**:
```javascript
const handleBookClick = (bookId, event) => {
    if (event.ctrlKey || event.metaKey) {
        // Toggle selection
        toggleBookSelection(bookId);
    } else if (event.shiftKey && lastClickedBook) {
        // Range selection
        selectBookRange(lastClickedBook, bookId);
    } else {
        // Single selection (clear others)
        setSingleSelection(bookId);
    }
    setLastClickedBook(bookId);
};
```

**Visual Feedback**:
```css
.book-card.selected {
    outline: 3px solid #2563eb;
    outline-offset: 2px;
    transform: scale(1.02);
}
```

### Breakdown

1. **Selection state management** (~1-2 hours)
   - Add `selectedBooks` Set to state
   - Add `lastClickedBook` for range selection
   - Helper functions: `toggleBookSelection()`, `selectBookRange()`, `clearSelection()`

2. **Ctrl+Click logic (toggle)** (~1 hour)
   - Detect Ctrl/Cmd key in click handler
   - Toggle book in/out of selection set
   - Update visual feedback

3. **Shift+Click logic (range)** (~1-2 hours)
   - Determine range between last clicked and current
   - Handle cases: forward range, backward range, no last clicked
   - Select all books in range

4. **Visual feedback styling** (~1 hour)
   - Selected state CSS (border, highlight, checkmark)
   - Hover state interaction with selected state
   - Accessibility: keyboard focus vs selection

5. **Bulk operations integration** (~1-2 hours)
   - Modify drag-and-drop to handle multiple books
   - Batch update state for multiple books
   - Success/error feedback for bulk operations

6. **Testing & edge cases** (~1 hour)
   - Empty selection → no books selected
   - Single book selected → works like current behavior
   - Multiple books → bulk operation works
   - Range selection edge cases (reversed range, same book)
   - Clear selection (ESC key, click empty space)

### User Experience Flow

**Basic Usage**:
1. Click book → Single selection (current behavior maintained)
2. Ctrl+Click another book → Add to selection (2 books selected)
3. Ctrl+Click selected book → Remove from selection (1 book remains)
4. Shift+Click distant book → Select range (all books between selected)
5. Drag any selected book → All selected books move to target column

**Clear Selection**:
- Click empty space in book grid
- Press ESC key
- Click single book without Ctrl/Shift (replaces selection)

### Success Criteria

- ✅ Ctrl+Click toggles individual book selection
- ✅ Shift+Click selects range of books
- ✅ Visual feedback clearly indicates selected books
- ✅ Drag-and-drop works with multiple selected books
- ✅ Selection clears appropriately (ESC, empty click)
- ✅ Keyboard navigation accessible (tab + space to select)

---

## #2: GitHub Pages Distribution

**Priority**: #2 (User Priority)
**Target Version**: Not versioned (deployment change)
**Complexity**: 🟡 Medium
**Estimated Time**: 3-6 hours
**Token Cost**: ~30-50K tokens
**Impact**: HIGH - Shareability, wider reach, zero-installation access

### What

Host Amazon Book Organizer on GitHub Pages with bookmarklet for one-click fetcher script loading.

### Complete Specification

See [future/SPEC-Distribution-GitHub-Pages.md](future/SPEC-Distribution-GitHub-Pages.md) for full guide.

### Features

- **GitHub Pages Hosting**: Organizer app accessible via HTTPS URL
- **Bookmarklet**: One-click loading of fetcher scripts from GitHub Pages
- **User Documentation**: Clear instructions for installation and use
- **CORS-Friendly**: No cross-origin issues
- **Auto-Deploy**: Git push automatically updates live site

### Implementation Steps

#### Phase 1: GitHub Pages Setup (30-60 minutes)

1. **Enable GitHub Pages**:
   - Go to repo Settings → Pages
   - Source: Deploy from branch `main` → `/ (root)`
   - Save

2. **Verify Deployment**:
   - Site live at: `https://Ron-L.github.io/amazon-book-organizer/`
   - Test organizer loads correctly
   - Test all features work (file loading, drag-and-drop, etc.)

3. **Update Links**:
   - Update README.md with live site URL
   - Add "Try it now" section with link

#### Phase 2: Bookmarklet Creation (2-3 hours)

**Bookmarklet Code Template**:
```javascript
javascript:(function(){
    const script = document.createElement('script');
    script.src = 'https://Ron-L.github.io/amazon-book-organizer/library-fetcher.js';
    script.onload = () => {
        console.log('✅ Amazon Book Organizer Fetcher loaded');
        // Auto-start if function exists
        if (typeof fetchAmazonLibrary === 'function') {
            fetchAmazonLibrary();
        }
    };
    script.onerror = () => {
        console.error('❌ Failed to load fetcher script');
        alert('Failed to load Amazon Book Organizer. Please check console for details.');
    };
    document.head.appendChild(script);
})();
```

**Tasks**:
1. Create bookmarklet HTML page with drag-to-bookmark-bar instructions
2. Test bookmarklet on amazon.com/yourbooks page
3. Verify script loads and executes correctly
4. Handle errors gracefully (network issues, CORS, etc.)

#### Phase 3: Documentation (1-2 hours)

1. **User Guide** (new file: `USAGE-GUIDE.md`):
   - How to install bookmarklet
   - How to use bookmarklet on Amazon
   - How to load library in organizer
   - Troubleshooting common issues

2. **README.md Updates**:
   - Add "Quick Start" section at top
   - Link to live demo
   - Link to usage guide
   - Update local development section

3. **Bookmarklet Page** (new file: `bookmarklet.html`):
   - Explanation of what bookmarklet does
   - Visual instructions with screenshots
   - Drag-to-bookmark-bar demo
   - Alternative methods (copy-paste into console)

#### Phase 4: Testing (1 hour)

**Cross-Browser Testing**:
- Chrome/Edge (Chromium)
- Firefox
- Safari (macOS)

**Cross-Device Testing**:
- Desktop (primary use case)
- Tablet (if practical)

**Test Scenarios**:
1. Install bookmarklet → Works
2. Click bookmarklet on Amazon → Fetcher loads
3. Run fetcher → Library downloads
4. Load library in organizer → Books display
5. Organize books → State persists

### Breakdown

- GitHub Pages setup: ~30-60 minutes
- Bookmarklet creation & testing: ~2-3 hours
- Documentation updates: ~1-2 hours
- Cross-device/browser testing: ~1 hour

### Success Criteria

- ✅ Organizer accessible at public GitHub Pages URL
- ✅ Bookmarklet installs in bookmark bar
- ✅ Bookmarklet loads fetcher script when clicked on Amazon
- ✅ Fetcher runs successfully and downloads library
- ✅ Organizer loads library file correctly
- ✅ All features work as expected
- ✅ Clear documentation for end users

### Deployment Checklist

Before going live:
- [ ] Remove personal amazon-library.json from repo (add to .gitignore)
- [ ] Remove personal amazon-collections.json from repo
- [ ] Remove personal amazon-manifest.json from repo
- [ ] Test with fresh clone (ensure no personal data included)
- [ ] Verify all links in README.md work
- [ ] Add favicon.ico (already exists: favicon.svg)
- [ ] Create LICENSE file (MIT - already exists)
- [ ] Add proper meta tags to HTML (description, keywords)

---

## #3: Collections Filter Bug Fix

**Priority**: #3 (High - clears technical debt)
**Target Version**: v3.3.3 (patch)
**Complexity**: 🟢 Low
**Estimated Time**: 30 minutes - 1 hour
**Token Cost**: ~5-8K tokens
**Impact**: Medium - Completes Clear Library feature

### What

Collections dropdown still shows old collection names after Clear Library is clicked.

### Root Cause

Clear Library function clears:
- ✅ Library data
- ✅ Columns
- ✅ Organization
- ❌ Collections filter state (MISSING)

### Fix

**Location**: `amazon-organizer.js` → `clearLibrary()` function

**Add**:
```javascript
// Clear collections filter state
setCollectionsFilter(null); // or setCollectionsFilter([]) depending on implementation
```

**Verify**: Check where collections filter state is stored and clear it completely.

### Testing

1. Load library with collections
2. Select a collection filter
3. Click Clear Library
4. Verify: Collections dropdown is empty/reset
5. Reload library
6. Verify: Collections dropdown repopulated with new data

### Success Criteria

- ✅ Collections dropdown clears when Clear Library is clicked
- ✅ No old collection names persist after clear
- ✅ Collections work correctly after reloading library

---

## #4: Collections Integration - UI Features

**Priority**: #4 (High - data ready, UI incomplete)
**Target Version**: v3.4.0
**Complexity**: 🟡 Medium
**Estimated Time**: 4-8 hours
**Token Cost**: ~40-60K tokens
**Impact**: HIGH - Completes major feature, makes collections data useful

### What

Add UI features for collections data that's already merged into library.

**Current Status**: Collections data successfully merged (1163 books have collections, 642 READ, 1700 UNKNOWN)

### Features

#### 1. Visual Badges on Book Covers (1-2 hours)

**Display**: Small badge/icon on book cover indicating collections membership

**Options**:
- Badge with collection count (e.g., "3 collections")
- Icon for read status (green checkmark for READ, gray for UNKNOWN)
- Hover tooltip showing collection names

**Implementation**:
```javascript
{book.collections && book.collections.length > 0 && (
    <div className="collection-badge">
        <span>{book.collections.length}</span>
    </div>
)}
```

#### 2. Book Dialog Metadata (1 hour)

**Display**: Section in book dialog showing all collections the book belongs to

**Layout**:
```
Collections:
  • Read
  • Science Fiction
  • Hugo Winners

Read Status: READ
```

#### 3. Filter by Collection Name (1-2 hours)

**UI**: Dropdown with all collection names (sorted alphabetically)

**Options**:
- "All Books" (default - no filter)
- "Uncollected" (books with no collections)
- [List of collection names]

**Behavior**: Filter book grid to show only books in selected collection

#### 4. Filter by Read Status (1-2 hours)

**UI**: Dropdown or button group

**Options**:
- "All" (default)
- "Read" (642 books)
- "Unread" (1 book)
- "Unknown" (1700 books)

**Behavior**: Filter book grid to show only books with selected read status

#### 5. "Uncollected" Pseudo-Collection (1 hour)

**What**: Virtual collection for books with `collections: []`

**Implementation**: Filter books where `book.collections.length === 0`

**UI**: Appears in collection name dropdown as "Uncollected"

### Breakdown

- Visual badges on covers: ~1-2 hours (CSS + conditional rendering)
- Book dialog metadata display: ~1 hour (read collections array, format)
- Collection name filter: ~1-2 hours (dropdown, filtering logic, state)
- Read status filter: ~1-2 hours (similar to collection filter)
- "Uncollected" pseudo-collection: ~1 hour (filter logic, UI integration)

### Success Criteria

- ✅ Book covers show visual indicator of collections membership
- ✅ Book dialog displays all collections the book belongs to
- ✅ Collection name filter works (filter by specific collection)
- ✅ Read status filter works (READ/UNREAD/UNKNOWN)
- ✅ "Uncollected" pseudo-collection shows books with no collections
- ✅ Filters work correctly with search and other filters
- ✅ Performance is acceptable with 2666+ books

---

## #5: Phase 3 Retry Logic (v3.4.0)

**Priority**: #5 (Lower - diminishing returns)
**Target Version**: v3.4.0
**Complexity**: 🔴 High
**Estimated Time**: 8-12 hours
**Token Cost**: ~60-90K tokens
**Impact**: Medium - Improves completeness from 98.7% → 99.8%

### What

Retry books with missing review data using same API configuration (Amazon backend issues are intermittent).

**Current Baseline**: 31/2344 books (1.3%) have `reviewCount > 0` but `topReviews.length === 0`

### Why NOT Use Alternative APIs

Test results (test-06) show:
- ✅ `getProducts` (plural) works
- ❌ `getProduct` (singular) broken
- ❌ `getProductByAsin` broken

Alternative methods fail even on books that work with `getProducts`.

**Conclusion**: Retry same API, not alternative APIs.

### Implementation Phases

#### Phase 1: Identify Missing Reviews (1 hour)

Scan library after Pass 2 for books matching:
```javascript
book.reviewCount > 0 && book.topReviews.length === 0
```

#### Phase 2: Retry Orchestration (3-4 hours)

**Timing**: Wait 5-10 minutes after initial fetch (allow Amazon backend state to change)

**Retry Strategy**:
- Same configuration: `getProducts + your-books`
- Up to 3 attempts per book
- Track attempts in metadata

**Implementation**:
```javascript
const retryMissingReviews = async (booksToRetry) => {
    for (const book of booksToRetry) {
        if (book.reviewFetchAttempts >= 3) continue; // Max retries reached

        await new Promise(resolve => setTimeout(resolve, 5000)); // 5s delay between books

        const result = await enrichBookWithReviews(book.asin);

        if (result.success) {
            book.topReviews = result.reviews;
            book.reviewFetchStatus = 'success';
        } else {
            book.reviewFetchAttempts++;
            book.reviewFetchStatus = book.reviewFetchAttempts >= 3 ? 'failed-permanent' : 'failed-retry';
        }

        book.lastReviewFetchAttempt = new Date().toISOString();
    }
};
```

#### Phase 3: Metadata Tracking (1-2 hours)

Add fields to book schema:
```javascript
{
    asin: "B00J9P2EMO",
    reviewCount: "1,674",
    topReviews: [],  // Empty despite reviewCount > 0
    reviewFetchAttempts: 2,  // Number of attempts made
    reviewFetchStatus: "failed-retry",  // "success" | "failed-retry" | "failed-permanent"
    lastReviewFetchAttempt: "2025-11-11T08:30:00Z"
}
```

#### Phase 4: Merge Logic (2-3 hours)

Update books in library with successful review data.

Handle cases:
- Book found, reviews retrieved → Merge reviews
- Book found, retry failed → Update attempt count
- Book not found → Skip (shouldn't happen)

#### Phase 5: Testing & Validation (2-3 hours)

Test scenarios:
- Fresh fetch with retry
- Refresh existing library with retry
- Max retries reached (3 attempts)
- Intermittent failures (retry succeeds)
- Permanent failures (all retries fail)

### Expected Outcomes

**Intermittent Failures** (~28 books):
- Random Amazon backend issues
- Should resolve on retry
- Expected recovery: 90%+ (25 books)

**Permanent Failures** (3 books):
- Cats (B0085HN8N6)
- Queen's Ransom (0684862670)
- To Ruin A Queen (0684862689)
- Amazon backend permanently broken for these ASINs
- Will continue to fail even after 3 retries

**Final Success Rate**: ~99.8% (2,341/2,344 books)

### Success Criteria

- ✅ Identifies books with missing reviews
- ✅ Retries using same API configuration
- ✅ Tracks retry attempts in metadata
- ✅ Merges successful reviews back into library
- ✅ Stops retrying after 3 attempts
- ✅ Reports final statistics (recovered vs permanent failures)

---

## #6: UX Quick Wins (Various)

**Priority**: #6 (Low - polish)
**Complexity**: 🟢 Low (each item)
**Estimated Time**: 1-3 hours each
**Token Cost**: ~8-15K tokens each
**Impact**: Low-Medium - Incremental UX improvements

### Options (Pick and Choose)

#### A. Tooltips for Control Buttons (1-2 hours)

Add helpful tooltips explaining what each button does:
- Backup: "Save current organization to file"
- Restore: "Load organization from file"
- Reset: "Remove all columns and organization"
- Clear Library: "Unload library and start fresh"

**Implementation**: Use `title` attribute or tooltip library

#### B. First-run Welcome Dialog (2-3 hours)

Show welcome dialog on first run (or after Clear Library):
- Explain what Amazon Book Organizer is
- Point to help icon ("?") for detailed usage
- Dismiss permanently (localStorage flag)

#### C. Button Colors / Visual Hierarchy (1 hour)

Improve button styling:
- Primary actions: Blue
- Destructive actions: Red (Clear Library, Reset)
- Secondary actions: Gray
- Consistent sizing and spacing

#### D. Column Name Filtering (3-4 hours)

Extend search to include column names:
- Search filters: title, author, AND column name
- Useful when you have 100+ columns

#### E. Add Title & Author Text Under Book Covers (2-3 hours)

Display text below book cover:
- Book title (truncated)
- Author name (truncated)
- Reduces need to hover for information

**Considerations**: Impact on layout, scrolling performance

---

## Summary Matrix

| Priority | Feature | Version | Complexity | Time | Impact | Status |
|----------|---------|---------|------------|------|--------|--------|
| #1 | Multi-Select | v3.4.0 | 🟡 Medium | 4-6h | HIGH | Planned |
| #2 | GitHub Pages | N/A | 🟡 Medium | 3-6h | HIGH | Planned |
| #3 | Collections Bug | v3.3.3 | 🟢 Low | 30m-1h | Medium | Planned |
| #4 | Collections UI | v3.4.0 | 🟡 Medium | 4-8h | HIGH | Planned |
| #5 | Retry Logic | v3.4.0 | 🔴 High | 8-12h | Medium | Planned |
| #6 | UX Quick Wins | Various | 🟢 Low | 1-3h ea | Low-Med | Backlog |

---

## Version Planning

### v3.3.3 (Patch Release)
- Collections Filter Bug Fix

### v3.4.0 (Minor Release)
- Multi-Select with Ctrl/Shift Clicking
- Collections Integration - UI Features
- Phase 3 Retry Logic (optional - consider deferring)

### Future (Unversioned)
- GitHub Pages Distribution (deployment change, not code version)
- UX Quick Wins (ongoing incremental improvements)

---

## Notes

- This roadmap reflects user priorities as of 2025-11-11
- Complexity and time estimates are approximate
- Features may be reprioritized based on implementation experience
- See [TODO.md](TODO.md) for active task tracking
- See [CHANGELOG.md](CHANGELOG.md) for completed work
