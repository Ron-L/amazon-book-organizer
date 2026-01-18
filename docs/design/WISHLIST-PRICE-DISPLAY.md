# Wishlist Price Display Feature Design

**Feature**: Price triggers and bargain detection for wishlist books
**Status**: Design Complete
**Created**: January 2026

---

## Overview

Users can set price triggers on wishlist books and quickly identify when books drop to their target price. This enables a "series completion" workflow where users can systematically acquire missing books in a series at reasonable prices.

---

## User Stories

1. As a user, I want to set a target price on wishlist books so I know when they're worth buying
2. As a user, I want to see at a glance which wishlist books are currently at or below my target price
3. As a user, I want to quickly filter to only show bargain books so I can decide what to buy
4. As a user, I want to easily navigate to Amazon to purchase a bargain book

---

## Feature Components

### 1. Price Trigger (Book Modal)

**Location**: Book detail modal, below existing fields

**UI**: Quick preset buttons + custom input

```
Current Price: $9.99

Alert me below:
[$0.99] [$1.99] [$2.99] [$4.99] [Custom...]
                  ↑ selected (highlighted)
```

**Behavior**:
- Clicking a preset sets that as the trigger price
- Selected preset shows highlighted/selected state
- "Custom..." opens a small input field for arbitrary values
- Trigger is saved to book record in IndexedDB
- Display "✓ Watching for $2.99 or less" when trigger is set
- Small "×" to clear trigger

**Data Model Addition**:
```javascript
book.priceTrigger = 2.99;      // User's target price (null if not set)
book.currentPrice = 9.99;      // Price at last fetch
book.priceLastChecked = Date;  // Timestamp of last price fetch
```

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
| No bargain (price > trigger) | Gray | `bg-gray-500` | Informational, no action needed |
| Bargain (price ≤ trigger) | Green | `bg-green-500` | Action! Buy now |
| No trigger set | Gray | `bg-gray-500` | Shows current price, neutral |

**Badge Priority Logic**:
```javascript
// Bottom-left badge (existing ownership logic + new price tag)
let bottomLeftBadge = null;

if (!book.isOwned) {
  // Wishlist books show price tag
  const isBargain = book.priceTrigger && book.currentPrice <= book.priceTrigger;
  bottomLeftBadge = {
    type: 'price',
    price: book.currentPrice,
    isBargain: isBargain
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

### 3. Bargains Button & Super Filter

**Location**: First position in button row (before Import/Export/Reset)

**Label**: `Bargains (n)` where n = count of books at or below trigger price

**Appearance**:
- Normal state: Standard button styling
- Active (filter on): Highlighted/depressed state
- Count updates after each library fetch

**Behavior**:
1. **Click**: Toggles "bargain super filter" on/off
2. **Filter active**:
   - Only wishlist books with `currentPrice <= priceTrigger` are shown
   - Empty columns are hidden
   - Button shows highlighted state
   - Optional: Subtle banner "Showing n bargains × Clear"
3. **Click again**: Toggles filter off, returns to previous view
4. **Filter does NOT reset**: User's normal filter settings are preserved underneath

**Implementation Notes**:
- Super filter is a separate boolean state, not part of the filter dialog
- When super filter is active, it overrides (but doesn't modify) existing filters
- Deactivating super filter restores previous filter state exactly

---

### 4. "See on Amazon" Button (Book Modal)

**Location**: Below "Group Series Books" button in book detail modal

**Applies to**: Wishlist books only (or make prominent for wishlist, subtle for owned)

**Appearance**:
| Book State | Button Style |
|------------|--------------|
| Owned | Right-click context menu only (existing) |
| Wishlist (no bargain) | Normal button: "See on Amazon" |
| Wishlist (bargain) | Emphasized button: "See on Amazon — $1.99" (green styling) |

**Behavior**: Opens Amazon product page with Associate ID in new tab

---

## User Workflow

### Setting Up Price Tracking

1. User adds book to wishlist (from Amazon product page via bookmarklet)
2. User double-clicks wishlist book to open modal
3. User clicks price preset (e.g., $2.99) to set trigger
4. Modal shows "✓ Watching for $2.99 or less"
5. User closes modal

### Checking for Bargains

1. User navigates to Amazon "Your Books" page
2. User clicks ReaderWrangler bookmarklet to fetch updates
3. Fetch includes current prices for all wishlist books
4. Bargains count updates in button: "Bargains (3)"
5. User clicks "Bargains (3)" button
6. View filters to show only bargain books in their columns
7. User sees 3 books with green price tags
8. User double-clicks a book, clicks "See on Amazon — $1.99"
9. Amazon opens, user purchases
10. Next fetch: book moves from wishlist to owned, disappears from bargains

### Series Completion Workflow

1. User has Destroyer series column with mix of owned and wishlist books
2. User clicks "Bargains (2)"
3. Two Destroyer books visible: #47 at $0.99, #89 at $1.99
4. User toggles off Bargains filter to see column context
5. User sees #47 is in sequence (has #1-46), but #89 is way ahead
6. User decides to buy #47 now, wait on #89
7. User double-clicks #47, clicks "See on Amazon — $0.99", purchases

---

## Data Flow

### Price Data Source

Prices come from Amazon internal APIs during user-initiated fetch:
- `qvGetMediaMatrixProductsQuickView` (planned)
- Or extracted from existing book detail responses

### Storage

- All price data stored in user's local IndexedDB
- No server-side storage or polling
- Data freshness depends on how often user manually fetches

### Price Staleness

Consider adding visual indicator if price data is old:
- Fresh (< 24 hours): Normal display
- Stale (> 7 days): Subtle indicator? (future enhancement)

---

## Edge Cases

| Scenario | Behavior |
|----------|----------|
| No trigger set | Show gray price tag with current price |
| Price is $0.00 (free) | Show "FREE" instead of "$0.00" |
| Price unavailable | Don't show price tag (or show "—") |
| Trigger set higher than current price | It's a bargain (user wants it at any price ≤ trigger) |
| Book purchased | Moves to owned, no longer shows price tag |
| Wishlist book with no price data yet | No price tag until first fetch with price |

---

## Future Enhancements

1. **Price history**: Store price at each fetch, show trend in modal
2. **Staleness indicator**: Visual cue when price data is old
3. **Bulk trigger setting**: Set same trigger for all books in a series/column
4. **Export bargains**: Generate list of current bargains for reference
5. **Near-miss indicator**: Yellow tag for prices within 20% of trigger (decided against for v1)

---

## Related Documents

- `BADGES.md` — Badge system specifications including price tag badge
- `TODO.md` — Implementation tasks
- `readerwrangler-amazon-terms-strategy.md` — Amazon Terms compliance analysis

---

## Design Decisions Log

| Decision | Rationale |
|----------|-----------|
| Super filter vs report modal | Reuses existing patterns; keeps column context for series decisions |
| Gray + Green (not Blue + Green) | Gray recedes, making green bargains pop more dramatically |
| Point-right tag shape | Feels like a hanging price tag; distinctive at small size |
| Presets + Custom | Most Kindle deals cluster at $0.99-$4.99; presets are faster |
| No automated alerts | Keeps us clearly outside "price tracker" definition in Amazon ToS |
| User-initiated fetch only | No server polling; user controls when to check prices |
