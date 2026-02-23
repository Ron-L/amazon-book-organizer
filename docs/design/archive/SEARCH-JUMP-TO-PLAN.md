# Search (Jump-To) Implementation Plan

**Goal:** Add Ctrl+F search to jump to/highlight books or folders by name (distinct from filter)

**Use Case:** User has 2300 books displayed, wants to quickly find "Stormlight Archive" book 3 without filtering everything else out

---

## Current State Analysis

### Existing Filter System
- **Filter:** Reduces view to show only matching items (hides non-matches)
- **Location:** Filter panel at top of right pane
- **State:** Multiple filter states (ownership, rating, tags, date, deals, text search)
- **Behavior:** Persistent, affects view until cleared

### Gap
- No way to **jump to** a specific item without hiding everything else
- No keyboard-driven navigation to specific books
- No "find next" capability

---

## Design Decisions

### Search vs Filter

| Feature | Filter (Existing) | Search (New) |
|---------|-------------------|--------------|
| Purpose | Show subset of items | Navigate to specific item |
| Effect | Hides non-matches | Highlights match, keeps all visible |
| Persistence | Remains active until cleared | Temporary, clears on Esc |
| Use case | "Show me all unread books" | "Where is Stormlight Archive #3?" |
| Interaction | Works with search | Searches within filtered results |

**Key:** Search works **within** current filter. If filter shows 100 books, search jumps through those 100.

---

## UI Design

### Search Bar Appearance

**Location:** Top of right panel, below folder breadcrumb, above book list

**Layout:**
```
┌─────────────────────────────────────────────────┐
│ Inbox > Science Fiction                         │  ← Breadcrumb
├─────────────────────────────────────────────────┤
│ 🔍 Search... [X]           2 of 5 matches   ▲ ▼│  ← NEW: Search bar
├─────────────────────────────────────────────────┤
│ ☐ [Cover] Title        Author      Series       │  ← Book list
│ ☐ [Cover] Title        Author      Series       │
```

**Components:**
- 🔍 Search icon (left)
- Text input field
- Clear button [X] (visible when text entered)
- Match counter: "2 of 5 matches" (visible when matches found)
- Previous/Next buttons: ▲ ▼ (visible when matches > 1)

**Visibility:**
- Hidden by default
- Appears on Ctrl+F or / keypress
- Disappears on Esc or loses focus (with delay)

---

## Behavior Specification

### Opening Search
- **Trigger:** Ctrl+F or / key
- **Effect:**
  - Search bar slides in (smooth animation)
  - Input field auto-focused
  - Previous search text preserved (until cleared or page refresh)
- **Safety:** Skip if user is typing in another input field

### Searching
- **Scope:** Search within current view (respects active filters)
- **Targets:**
  - Books: Title only (most common use case)
  - Folders: Folder name (if mixed folder view)
- **Matching:** Case-insensitive, substring match
- **Real-time:** Search as you type (no need to press Enter)
- **Debounce:** 150ms delay to avoid lag on fast typing

### Navigation
- **First match:** Auto-highlight and scroll into view on first character typed
- **Next match:** Enter or Down arrow or ▼ button
- **Previous match:** Shift+Enter or Up arrow or ▲ button
- **Wrap-around:** After last match, next goes to first (and vice versa)
- **No matches:** Show "No matches" message, disable navigation buttons

### Visual Feedback
- **Current match:** Highlighted with blue border + light blue background
- **Other matches:** Subtle yellow background (or just count, TBD)
- **Scroll:** Auto-scroll matched item into view (smooth scroll)

### Closing Search
- **Trigger:** Esc key
- **Effect:**
  - Search bar slides out
  - Highlights cleared
  - Search text preserved (can reopen with same search)
- **Alternative:** Click X button to clear text but keep search open

---

## State Management

### New State Variables

```javascript
// Line ~261 (after draggingColumn, dropTarget)
const [searchOpen, setSearchOpen] = useState(false); // Search bar visible
const [searchQuery, setSearchQuery] = useState(''); // Current search text
const [searchMatches, setSearchMatches] = useState([]); // Array of matching book/folder IDs
const [currentMatchIndex, setCurrentMatchIndex] = useState(0); // Index in searchMatches array
```

### Match Calculation

```javascript
// Calculate matches whenever searchQuery or visible items change
useEffect(() => {
    if (!searchQuery.trim()) {
        setSearchMatches([]);
        setCurrentMatchIndex(0);
        return;
    }

    const query = searchQuery.toLowerCase();
    const matches = [];

    // Search books in current view
    sortedFilteredBooks.forEach(book => {
        if (book.title.toLowerCase().includes(query)) {
            matches.push({ type: 'book', id: book.id });
        }
    });

    // Search folders in current view (if mixed folder)
    // TODO: Add folder search if needed

    setSearchMatches(matches);
    setCurrentMatchIndex(matches.length > 0 ? 0 : -1);
}, [searchQuery, sortedFilteredBooks]);
```

---

## Keyboard Shortcuts

| Key | Action | Notes |
|-----|--------|-------|
| **Ctrl+F** | Open search | Standard "Find" shortcut |
| **/** | Open search | Alternative (Gmail-style) |
| **Esc** | Close search | Clear highlights, hide bar |
| **Enter** | Next match | Navigate forward |
| **Shift+Enter** | Previous match | Navigate backward |
| **↓** | Next match | When search input focused |
| **↑** | Previous match | When search input focused |
| **Ctrl+G** | Next match | Standard "Find Next" (optional) |
| **Ctrl+Shift+G** | Previous match | Standard "Find Previous" (optional) |

### Keyboard Handler

```javascript
// Add to existing useEffect with keyboard listeners (~line 1600+)
useEffect(() => {
    const handleKeyDown = (e) => {
        // Skip if typing in input field (except search input)
        if (e.target.tagName === 'INPUT' && !e.target.classList.contains('search-input')) return;
        if (e.target.tagName === 'TEXTAREA') return;

        // Open search
        if ((e.ctrlKey && e.key === 'f') || e.key === '/') {
            e.preventDefault();
            setSearchOpen(true);
            // Focus search input after render
            setTimeout(() => document.querySelector('.search-input')?.focus(), 0);
        }

        // Close search
        if (e.key === 'Escape' && searchOpen) {
            setSearchOpen(false);
        }

        // Navigate matches (when search input focused)
        if (searchOpen && searchMatches.length > 0) {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                navigateToNextMatch();
            }
            if (e.key === 'Enter' && e.shiftKey) {
                e.preventDefault();
                navigateToPreviousMatch();
            }
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                navigateToNextMatch();
            }
            if (e.key === 'ArrowUp') {
                e.preventDefault();
                navigateToPreviousMatch();
            }
        }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
}, [searchOpen, searchMatches, currentMatchIndex]);
```

---

## Navigation Functions

```javascript
const navigateToNextMatch = () => {
    if (searchMatches.length === 0) return;
    const nextIndex = (currentMatchIndex + 1) % searchMatches.length;
    setCurrentMatchIndex(nextIndex);
    scrollToMatch(searchMatches[nextIndex]);
};

const navigateToPreviousMatch = () => {
    if (searchMatches.length === 0) return;
    const prevIndex = currentMatchIndex === 0 ? searchMatches.length - 1 : currentMatchIndex - 1;
    setCurrentMatchIndex(prevIndex);
    scrollToMatch(searchMatches[prevIndex]);
};

const scrollToMatch = (match) => {
    const element = document.querySelector(`[data-book-id="${match.id}"]`);
    if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        // Add highlight class
        element.classList.add('search-highlight-current');
        // Remove highlight from previous match
        document.querySelectorAll('.search-highlight-current').forEach(el => {
            if (el !== element) el.classList.remove('search-highlight-current');
        });
    }
};
```

---

## UI Components

### Search Bar Component

```javascript
{searchOpen && (
    <div className="search-bar flex items-center gap-2 px-4 py-2 bg-gray-50 border-b border-gray-200">
        {/* Search icon */}
        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>

        {/* Input field */}
        <input
            type="text"
            className="search-input flex-1 px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Search books..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            autoFocus
        />

        {/* Clear button */}
        {searchQuery && (
            <button
                onClick={() => setSearchQuery('')}
                className="text-gray-400 hover:text-gray-600"
                title="Clear search"
            >
                ✕
            </button>
        )}

        {/* Match counter */}
        {searchMatches.length > 0 && (
            <span className="text-sm text-gray-600">
                {currentMatchIndex + 1} of {searchMatches.length}
            </span>
        )}

        {searchQuery && searchMatches.length === 0 && (
            <span className="text-sm text-gray-400">No matches</span>
        )}

        {/* Navigation buttons */}
        {searchMatches.length > 1 && (
            <div className="flex gap-1">
                <button
                    onClick={navigateToPreviousMatch}
                    className="p-1 text-gray-600 hover:bg-gray-200 rounded"
                    title="Previous match (Shift+Enter)"
                >
                    ▲
                </button>
                <button
                    onClick={navigateToNextMatch}
                    className="p-1 text-gray-600 hover:bg-gray-200 rounded"
                    title="Next match (Enter)"
                >
                    ▼
                </button>
            </div>
        )}
    </div>
)}
```

### Highlight Styles

```css
/* Add to existing CSS or inline styles */
.search-highlight-current {
    outline: 2px solid #3B82F6; /* Blue border */
    outline-offset: -2px;
    background-color: rgba(59, 130, 246, 0.1); /* Light blue background */
    border-radius: 4px;
}

.search-bar {
    animation: slideDown 0.2s ease-out;
}

@keyframes slideDown {
    from {
        opacity: 0;
        transform: translateY(-10px);
    }
    to {
        opacity: 1;
        transform: translateY(0);
    }
}
```

---

## Integration with Existing Features

### Filter System
- **Search works within filtered results:** If user filters to "Unread books", search only searches those unread books
- **Filter counts:** Search doesn't affect filter counts
- **Clear filter:** Doesn't close search (search remains active)

### Selection System
- **No conflict:** Search highlight is visual only, doesn't trigger selection
- **Clicking matched item:** Selects it normally (search highlight remains)

### Sort System
- **Independent:** Search finds items regardless of sort order
- **Navigation:** Next/previous follows display order (sorted order)

### Folder Navigation
- **Single folder:** Search only within current folder's books
- **Mixed folder:** Could search folder names too (optional enhancement)

---

## Implementation Phases

### Phase 1: Basic Search UI (alpha.175)
- Add search state variables
- Add search bar component (without navigation)
- Add Ctrl+F keyboard shortcut to open/close
- Add search input with clear button
- Test: Search bar appears/disappears correctly

### Phase 2: Match Calculation (alpha.175.1)
- Add match calculation effect
- Display match counter
- Test: Match count updates as you type

### Phase 3: Navigation Logic (alpha.175.2)
- Add navigation functions (next/previous)
- Add keyboard shortcuts (Enter, Shift+Enter, arrows)
- Add navigation buttons (▲ ▼)
- Auto-scroll to first match on search
- Test: Can navigate through matches with keyboard/buttons

### Phase 4: Visual Highlighting (alpha.175.3)
- Add highlight styles
- Apply highlight class to current match
- Add smooth scroll animation
- Test: Current match clearly visible and scrolls into view

### Phase 5: Polish (alpha.175.4)
- Debounce search input (150ms)
- Preserve search text on close/reopen
- Handle edge cases (no matches, single match, wrap-around)
- Test: Smooth UX, no lag on typing

---

## Edge Cases

1. **No matches:** Show "No matches", disable navigation buttons
2. **Single match:** Hide navigation buttons (no need to navigate)
3. **Search cleared:** Clear highlights, hide counter
4. **Filter changes while searching:** Recalculate matches, update counter
5. **Folder navigation while search open:** Close search (or recalculate for new folder)
6. **Rapid typing:** Debounce to avoid lag
7. **Esc during Esc handlers:** Don't conflict with other Esc handlers (rename, context menu)

---

## Testing Checklist

- [ ] Ctrl+F opens search bar, focuses input
- [ ] / key also opens search bar (alternative)
- [ ] Esc closes search bar, clears highlights
- [ ] Typing updates match counter in real-time
- [ ] Enter navigates to next match
- [ ] Shift+Enter navigates to previous match
- [ ] ▲ ▼ buttons navigate matches
- [ ] Current match scrolls into view smoothly
- [ ] Current match has blue highlight
- [ ] Wrap-around works (last → first, first → last)
- [ ] No matches shows "No matches" message
- [ ] Clear button (X) clears search text
- [ ] Search text preserved on close/reopen
- [ ] Search respects active filters
- [ ] Keyboard shortcuts skip when typing in other inputs
- [ ] Works with 2300 books (no lag)

---

## Performance Considerations

- **Match calculation:** O(n) where n = visible books (~2300 max)
- **Substring match:** `String.includes()` is fast enough
- **Debounce:** 150ms prevents excessive recalculation on fast typing
- **Scroll:** `scrollIntoView` with smooth animation
- **No performance concerns expected** (searching 2300 titles is trivial)

---

## Future Enhancements (Post-Launch)

- **Search folders:** Include folder names in search (if mixed view)
- **Search other fields:** Author, series, tags (advanced search)
- **Regex support:** Power users might want pattern matching
- **Fuzzy search:** Tolerate typos (e.g., "Stormligt" finds "Stormlight")
- **Search history:** Dropdown of recent searches
- **Highlight all matches:** Yellow background on all matches, blue on current

---

## Code Locations

| Component | Approximate Line | Changes |
|-----------|------------------|---------|
| State declaration | ~261 | Add 4 new state variables |
| Keyboard handler | ~1600+ | Add Ctrl+F, Enter, Esc handlers |
| Match calculation | New effect | Calculate searchMatches array |
| Navigation functions | New | navigateToNextMatch, navigateToPreviousMatch |
| Search bar UI | ~9200 (above book list) | New component |
| Highlight styles | CSS or inline | .search-highlight-current class |

---

## Version

- Target version: `5.0.0-alpha.175` (basic search)
- Expected phases: 4-5 alphas
- Estimated time: 4-6 hours total

---

## References

- Similar features: VS Code search, Chrome DevTools search, Windows Explorer type-to-search
- Keyboard shortcuts: Standard Ctrl+F (find), Ctrl+G (find next)

---

## Archive Note

**Status:** Abandoned (partial implementation, Phases 1-2 only)
**Branch:** `feature/search-jump-to` (deleted)
**Last commit:** `1ea8ca2` — Search (jump-to) partial implementation - alpha.175-175.2

**Rationale for abandonment:** Phase 1-2 were completed (search bar with Ctrl+F shortcut, match counting, debounced search query at 150ms, searches books + folders respecting filters). Development was stopped before the navigation/highlighting phases. Decision: Low value without highlighting — browser Ctrl+F is sufficient for the basic need. Preserved here for potential future dropdown navigator implementation.

**Other work on the same branch** (multi-column sort, column reordering, shift-click sort) was merged to main as part of the v5.0.0 release.
