# Wishlist Deduplication & User Feedback

## Problem Statement

Users can easily add a book multiple times to their wishlist:
- Uncertain if they already added it, so they add again "just in case"
- Series adds may include books already owned or on wishlist
- Each duplicate carries full metadata (reviews, description) bloating the JSON

Currently no feedback tells users about duplicates or already-owned books.

## Goals

1. **Prevent duplicate wishlist entries** - Dedupe on save
2. **Inform users without blocking** - Non-intrusive feedback during add
3. **Handle series adds gracefully** - Summary feedback, not per-book interruptions
4. **One-time cleanup** - Remove existing duplicates from JSON files

## Design

### Deduplication Logic (in amazon-wishlist-fetcher.js)

Before saving to localStorage, check existing books by ASIN:

```javascript
// Pseudocode
const existingAsins = new Set(existingBooks.map(b => b.asin));
const newBooks = scrapedBooks.filter(b => !existingAsins.has(b.asin));
const skippedOwned = scrapedBooks.filter(b => existingAsins.has(b.asin) && isOwned(existingBooks, b.asin));
const skippedWishlist = scrapedBooks.filter(b => existingAsins.has(b.asin) && isWishlist(existingBooks, b.asin));
```

### User Feedback: Toast Notifications

Use non-blocking toast notifications (auto-dismiss after 3 seconds) rather than alert dialogs.

#### Single Book Add

| Scenario | Toast Message |
|----------|---------------|
| New book added | `Added to wishlist` |
| Already on wishlist | `Already on wishlist` |
| Already owned | `Already in library` |

#### Series Add

Single summary toast after all books processed:

```
Added 15 to wishlist
Skipped: 3 owned, 2 on wishlist
```

If all books already exist:
```
All 20 books already in library/wishlist
```

### Toast UI Specification

```css
/* Toast positioning and styling */
position: fixed;
bottom: 20px;
right: 20px;
background: #333;
color: white;
padding: 12px 20px;
border-radius: 8px;
box-shadow: 0 4px 12px rgba(0,0,0,0.3);
z-index: 10001; /* Above navigator dialog */
font-size: 14px;
max-width: 300px;
animation: slideIn 0.3s ease, fadeOut 0.3s ease 2.7s;
```

Auto-dismiss after 3 seconds. No close button needed (keeps it minimal).

### One-Time JSON Cleanup

For existing users with duplicates, provide a cleanup utility:

**Option A: In Organizer**
- Add "Clean Duplicates" button in Data Status or Settings
- Shows count of duplicates found, removes them on confirmation

**Option B: Manual Script**
- Document a one-liner for console to dedupe existing JSON
- User runs it once, re-exports

**Recommendation:** Option A - built into organizer for discoverability.

## Implementation Phases

### Phase 1: Dedup on Save (amazon-wishlist-fetcher.js)
- Add dedup logic before localStorage save
- Track skip counts for feedback
- ~30 min

### Phase 2: Toast Notifications (amazon-wishlist-fetcher.js)
- Create toast UI function
- Show appropriate message based on add results
- ~1 hour

### Phase 3: Cleanup Utility (readerwrangler.js)
- Add duplicate detection in Data Status
- Show "X duplicates found" with cleanup button
- ~1-2 hours

## Files Affected

- `amazon-wishlist-fetcher.js` - Dedup logic, toast UI
- `readerwrangler.js` - Cleanup utility in Data Status modal

## Edge Cases

1. **Same ASIN, different ownership** - Book owned AND on wishlist separately
   - Should not happen with new data model (`onWishlist` is a flag, not separate entry)
   - Legacy data may have this; cleanup should merge into single entry

2. **Series with mixed ownership** - Some owned, some wishlist, some new
   - Handle gracefully with summary toast

3. **Rapid repeated clicks** - User clicks "Add to Wishlist" multiple times
   - Dedup prevents duplicates; toast shows "Already on wishlist" on repeat

## Success Metrics

- Zero duplicate ASINs in wishlist after feature ships
- Users receive clear feedback without workflow interruption
- Series adds remain fast (no per-book confirmation dialogs)
