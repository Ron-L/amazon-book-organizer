# Wishlist Price Display Feature Design

**Feature**: Price goals and deal highlighting for wishlist books
**Status**: Design Complete
**Created**: January 2026
**Updated**: January 2026

---

## Overview

Users can set price goals on wishlist books and quickly identify when books are at or below their target price. This enables a "series completion" workflow where users can systematically acquire missing books in a series at reasonable prices.

---

## User Stories

1. As a user, I want to set a target price on wishlist books so I know when they're worth buying
2. As a user, I want to see at a glance which wishlist books are currently at or below my target price
3. As a user, I want to quickly filter to only show books at my target price so I can decide what to buy
4. As a user, I want to easily navigate to Amazon to purchase a book

---

## Feature Components

### 1. Price Goal (Book Modal)

**Location**: Book detail modal, below existing fields

**UI**: Quick preset buttons + custom input

```
Current Price: $9.99

Buy at:
[$0.99] [$1.99] [$2.99] [$4.99] [Custom...]
                  ↑ selected (highlighted)
```

**Behavior**:
- Clicking a preset sets that as the target price
- Selected preset shows highlighted/selected state
- "Custom..." opens a small input field for arbitrary values
- Target is saved to book record in IndexedDB
- Display "✓ Goal: $2.99 or less" when target is set
- Small "×" to clear target

**Data Model Addition** (in amazon-library.json):
```javascript
// Price display fields (Phase 4 of Library Refresh)
book.targetPrice = 2.99;          // User's target price (null if not set)
book.currentPrice = 2.99;         // Current Kindle price from Amazon
book.listPrice = 17.99;           // Digital list price (for savings display)
book.priceAsOf = "2026-01-19T16:09:00Z";  // ISO timestamp of price

// Genre/tags fields (Phase 3 of Library Refresh)
book.genres = ["Historical", "Romance", "Classics", ...];  // Amazon genre tags
book.genresAsOf = "2026-01-19T16:08:00Z";  // ISO timestamp (genres are static, only read once)
```

**Notes:**
- Price fields read for ALL wishlist books every run (prices change frequently)
- Genre fields read only for NEW books (genres are static)
- See `.private/Amazon-API-Reference.md` for technical details

---

### 2. Price Tag Badge (Book Cover)

**Location**: Bottom-left corner of book cover (same position as ownership badges)

**Applies to**: Wishlist books only (owned books don't need price display)

**Shape**: Point-right tag with hole detail

```css
.price-tag {
  clip-path: polygon(
    0% 0%,
    85% 0%,
    100% 50%,
    85% 100%,
    0% 100%
  );
  padding: 3px 14px 3px 6px;
}

.price-tag::before {
  /* Hole detail */
  content: '';
  position: absolute;
  width: 5px;
  height: 5px;
  background: rgba(0,0,0,0.3);
  border-radius: 50%;
  top: 50%;
  right: 7px;
  transform: translateY(-50%);
}
```

**Colors**:
| State | Color | Tailwind Class | Meaning |
|-------|-------|----------------|---------|
| Above goal (price > target) | Gray | `bg-gray-500` | Informational, no action needed |
| At goal (price ≤ target) | Green | `bg-green-500` | At or below target price |
| No goal set | Gray | `bg-gray-500` | Shows current price, neutral |

**Badge Priority Logic**:
```javascript
// Bottom-left badge (existing ownership logic + new price tag)
let bottomLeftBadge = null;

if (!book.isOwned) {
  // Wishlist books show price tag
  const atGoal = book.targetPrice && book.currentPrice <= book.targetPrice;
  bottomLeftBadge = {
    type: 'price',
    price: book.currentPrice,
    atGoal: atGoal
  };
} else if (book.isOwned && book.ownershipType && book.ownershipType !== 'purchased') {
  // Owned non-purchased books show ownership badge
  bottomLeftBadge = { type: 'ownership', ownershipType: book.ownershipType };
}
```

**Note**: No conflict exists because:
- Wishlist books are not owned → no ownership badge
- Owned books are not on wishlist → no price tag

---

### 3. Deals Button & Filter

**Location**: First position in button row (before Import/Export/Reset)

**Label**: `Deals (n)` where n = count of books at or below target price

**Appearance**:
- Normal state: Standard button styling
- Active (filter on): Highlighted/depressed state
- Count updates after each library refresh

**Behavior**:
1. **Click**: Toggles "deals filter" on/off
2. **Filter active**:
   - Only wishlist books with `currentPrice <= targetPrice` are shown
   - Empty columns are hidden
   - Button shows highlighted state
   - Optional: Subtle banner "Showing n deals × Clear"
3. **Click again**: Toggles filter off, returns to previous view
4. **Filter does NOT reset**: User's normal filter settings are preserved underneath

**Implementation Notes**:
- Deals filter is a separate boolean state, not part of the filter dialog
- When deals filter is active, it overrides (but doesn't modify) existing filters
- Deactivating deals filter restores previous filter state exactly

---

### 4. Savings Display (Book Modal)

**Location**: Below current price in book detail modal (wishlist books only)

**Display Format**:
```
Current Price: $2.99
List Price: $17.99 (Save $15.00 - 83%)
```

**Behavior**:
- Only show savings line if `listPrice > currentPrice`
- Calculate savings amount and percentage from data
- Gray/muted styling for list price line

---

### 5. "See on Amazon" Button (Book Modal)

**Location**: Below "Group Series Books" button in book detail modal

**Applies to**: Wishlist books only (or make prominent for wishlist, subtle for owned)

**Appearance**:
| Book State | Button Style |
|------------|--------------|
| Owned | Right-click context menu only (existing) |
| Wishlist (above goal) | Normal button: "See on Amazon" |
| Wishlist (at goal) | Emphasized button: "See on Amazon — $1.99" (green styling) |

**Behavior**: Opens Amazon product page with Associate ID in new tab

---

## User Workflow

### Setting Up Price Goals

1. User adds book to wishlist (from Amazon product page via bookmarklet)
2. User double-clicks wishlist book to open modal
3. User clicks price preset (e.g., $2.99) to set goal
4. Modal shows "✓ Goal: $2.99 or less"
5. User closes modal

### Checking for Deals

1. User navigates to Amazon "Your Books" page
2. User clicks ReaderWrangler bookmarklet to refresh data
3. Refresh includes current prices for all wishlist books
4. Deals count updates in button: "Deals (3)"
5. User clicks "Deals (3)" button
6. View filters to show only books at goal in their columns
7. User sees 3 books with green price tags
8. User double-clicks a book, clicks "See on Amazon — $1.99"
9. Amazon opens, user purchases
10. Next refresh: book moves from wishlist to owned, disappears from deals

### Series Completion Workflow

1. User has Destroyer series column with mix of owned and wishlist books
2. User clicks "Deals (2)"
3. Two Destroyer books visible: #47 at $0.99, #89 at $1.99
4. User toggles off Deals filter to see column context
5. User sees #47 is in sequence (has #1-46), but #89 is way ahead
6. User decides to buy #47 now, wait on #89
7. User double-clicks #47, clicks "See on Amazon — $0.99", purchases

---

## Data Flow

### Price Data Source

Prices come from Amazon pages during user-initiated refresh.

### Storage

- All price data stored in user's local IndexedDB
- No server-side storage or polling
- Data freshness depends on how often user manually refreshes

### Price Staleness

Consider adding visual indicator if price data is old:
- Fresh (< 24 hours): Normal display
- Stale (> 7 days): Subtle indicator? (future enhancement)

---

## Edge Cases

| Scenario | Behavior |
|----------|----------|
| No goal set | Show gray price tag with current price |
| Price is $0.00 (free) | Show "FREE" instead of "$0.00" |
| Price unavailable | Don't show price tag (or show "—") |
| Goal set higher than current price | It's at goal (user wants it at any price ≤ goal) |
| Book purchased | Moves to owned, no longer shows price tag |
| Wishlist book with no price data yet | No price tag until first refresh with price |

---

## Future Enhancements

1. **Price history**: Store price at each refresh, show trend in modal
2. **Staleness indicator**: Visual cue when price data is old
3. **Bulk goal setting**: Set same goal for all books in a series/column
4. **Export deals**: Generate list of current deals for reference

---

## Related Documents

- `BADGES.md` — Badge system specifications including price tag badge
- `TODO.md` — Implementation tasks
- `WISHLIST-FEATURE.md` — Wishlist feature design

---

## Design Decisions Log

| Decision | Rationale |
|----------|-----------|
| Filter button vs report modal | Reuses existing patterns; keeps column context for series decisions |
| Gray + Green (not Blue + Green) | Gray recedes, making green deals pop more dramatically |
| Point-right tag shape | Feels like a hanging price tag; distinctive at small size |
| Presets + Custom | Most Kindle deals cluster at $0.99-$4.99; presets are faster |
| User-initiated refresh only | User controls when to check; no background activity |
