# Badge System Design

**Feature**: Visual indicators for book metadata
**Status**: Implemented
**Created**: 2025-12-19
**Updated**: 2026-06-18 (v6.12.0 — ownership now also surfaced in the table column + book dialog)

---

## Overview

Book covers display up to 4 badges showing key metadata at a glance:
- **Top-left**: Collections, Wishlist, or Selection status (mutually exclusive)
- **Top-right**: Rating
- **Bottom-left**: Price tag (wishlist) or Ownership badge (mutually exclusive)
- **Bottom-right**: Read status checkmark

**v6.12.0**: Ownership/acquisition type (Sample, Borrowed, Prime, KU, …) is no
longer cover-only. It also appears as a sortable/groupable **Ownership column**
in table view and an **Ownership row** in the book dialog. See
[Ownership indicators beyond covers](#ownership-indicators-beyond-covers).

---

## Badge Specifications

### 1. Top-Left Corner (Mutually Exclusive)

**Priority order** (highest priority shown):
1. **Selection Checkmark** (when book is selected)
   - Blue circle with white checkmark
   - `className`: `absolute top-1 left-1 bg-blue-600 rounded-full w-6 h-6 flex items-center justify-center z-10`
   - Icon: SVG checkmark (white)

2. **Wishlist Badge** (when `book.onWishlist === true`)
   - Small badge with open-heart + plus icon
   - Background: Semi-transparent pink
   - `className`: `absolute top-1 left-1 bg-pink-600 bg-opacity-85 rounded px-1.5 py-0.5 text-xs font-bold text-white`
   - Text: `♡+` (open heart + plus sign)
   - Wishlist covers are also grayed out (`opacity-40` on the cover image) — implemented.
   - Note: `isWishlist` is the legacy field; the live field is `onWishlist` (see `normalizeBook`).

3. **Collections Count** (when `book.collections.length > 0`)
   - Folder icon with count
   - `className`: `absolute top-1 left-1 bg-gray-700 bg-opacity-75 rounded px-1.5 py-0.5 text-xs font-bold text-white`
   - Text: `📁 ${count}` (e.g., "📁 3")

### 2. Top-Right Corner

**Rating Badge** (when `book.rating > 0`)
- Black background with yellow star and rating
- `className`: `absolute top-1 right-1 bg-black bg-opacity-75 rounded px-1.5 py-0.5 text-xs font-bold text-yellow-400`
- Text: `★ ${rating.toFixed(1)}` (e.g., "★ 4.5")
- **Status**: Already implemented

### 3. Bottom-Left Corner

**Price tag vs Ownership badge (mutually exclusive):**
- If the book is **on the wishlist and has a current price**, the bottom-left shows a
  **price tag** (green when at/under goal, gray otherwise) instead of the ownership badge.
- Otherwise the **ownership badge** shows. A plain Sample (not on the wishlist) therefore
  always shows its SAMPLE badge regardless of price.

**Ownership Badge** (when `book.ownershipType !== 'purchased'`)
- Shows ownership status for non-purchased books
- Position mirrors Amazon's sample badge placement

**Sample Badge** (when `ownershipType === 'sample'`)
- Orange/amber background
- `className`: `absolute bottom-1 left-1 bg-amber-500 bg-opacity-90 rounded px-1.5 py-0.5 text-xs font-bold text-white`
- Text: `SAMPLE`

**Borrowed Badge** (when `ownershipType === 'borrowed'`)
- Blue/teal background
- `className`: `absolute bottom-1 left-1 bg-teal-500 bg-opacity-90 rounded px-1.5 py-0.5 text-xs font-bold text-white`
- Text: `BORROWED`

**Subscription Badges** (Prime, KU, KOLL, Comixology, Amazon Insider)
- Purple background (indicates subscription/temporary access)
- `className`: `absolute bottom-1 left-1 bg-purple-500 bg-opacity-90 rounded px-1.5 py-0.5 text-xs font-bold text-white`
- Text varies by type:
  - `ownershipType === 'prime'` → `PRIME`
  - `ownershipType === 'kindleUnlimited'` → `KU`
  - `ownershipType === 'koll'` → `KOLL`
  - `ownershipType === 'comixology'` → `COMIX`
  - `ownershipType === 'insideAmazon'` → `INSIDER` (Amazon Insider program — speculative; first observed via GoatCounter telemetry)

### 4. Bottom-Right Corner

**Read Status Checkmark** (when `book.readStatus === 'READ'`)
- Green circle with white checkmark
- `className`: `absolute bottom-1 right-1 bg-green-600 rounded-full w-6 h-6 flex items-center justify-center`
- Icon: SVG checkmark (white)
- **Replaces**: Previous diagonal "READ" ribbon

---

## Visual Layout

```
┌─────────────────┐
│ 📁3       ⭐4.5 │  ← Top-left (Collections/Wishlist/Selection) | Top-right (Rating)
│                 │
│   Book Cover    │
│                 │
│ SAMPLE       ✓  │  ← Bottom-left (Ownership) | Bottom-right (Read checkmark)
└─────────────────┘
```

---

## Badge States by Book Type

| Book Type | Top-Left | Top-Right | Bottom-Left | Bottom-Right |
|-----------|----------|-----------|-------------|--------------|
| Purchased, unread, no collections | (none) | Rating (if >0) | (none) | (none) |
| Purchased, read, no collections | (none) | Rating (if >0) | (none) | ✓ green |
| Purchased, in collections | 📁 3 | Rating (if >0) | (none) | ✓ (if read) |
| Sample | (none) | Rating (if >0) | SAMPLE (orange) | (none) |
| Borrowed (Family) | (none) | Rating (if >0) | BORROWED (teal) | ✓ (if read) |
| Prime Reading | (none) | Rating (if >0) | PRIME (purple) | ✓ (if read) |
| Kindle Unlimited | (none) | Rating (if >0) | KU (purple) | ✓ (if read) |
| KOLL | (none) | Rating (if >0) | KOLL (purple) | ✓ (if read) |
| Comixology | (none) | Rating (if >0) | COMIX (purple) | ✓ (if read) |
| Amazon Insider | (none) | Rating (if >0) | INSIDER (purple) | ✓ (if read) |
| Wishlist | ♡+ | Rating (if >0) | Price tag (if priced) | (none) |
| Selected (any type) | ✓ blue | Rating (if >0) | (ownership) | ✓ green (if read) |

---

## Ownership indicators beyond covers

**Added v6.12.0.** Ownership/acquisition type is surfaced in three places, driven by a
single source of truth so labels and colors stay consistent:

```javascript
// Module scope, near COLUMN_CONFIG
const OWNERSHIP_META = {
    purchased:       { label: 'Purchased',        badge: null },          // no badge (common case)
    sample:          { label: 'Sample',           badge: 'bg-amber-500' },
    wishlist:        { label: 'Wishlist',         badge: 'bg-pink-600' },
    borrowed:        { label: 'Borrowed',         badge: 'bg-teal-500' },
    prime:           { label: 'Prime',            badge: 'bg-purple-500' },
    kindleUnlimited: { label: 'Kindle Unlimited', badge: 'bg-purple-500' },
    koll:            { label: 'KOLL',             badge: 'bg-purple-500' },
    comixology:      { label: 'Comixology',       badge: 'bg-purple-500' },
    insideAmazon:    { label: 'Insider',          badge: 'bg-purple-500' },
    unknown:         { label: 'Unknown',          badge: 'bg-gray-500' }
};
const getOwnershipType  = (book) => /* onWishlist → 'wishlist', else book.ownershipType || 'purchased' */;
const getOwnershipLabel = (book) => OWNERSHIP_META[getOwnershipType(book)].label;
```

| Surface | Treatment |
|---------|-----------|
| **Cover view** | Short badge in bottom-left (SAMPLE / KU / COMIX …) — see §3. Tiny tile keeps the short text rather than the full `label`. |
| **Table column** ("Ownership") | Sortable + groupable. Hidden by default. Purchased shown muted gray; other types in normal weight. Uses the full `label`. |
| **Book dialog** | "Ownership" row: colored badge (`OWNERSHIP_META[type].badge`) for non-purchased, muted "Purchased" otherwise. |

Notes:
- The table column registers in `COLUMN_CONFIG`, `visibleColumns`, `columnWidths`,
  `columnOrder`, the column-chooser menu, and "Show All". On load, a saved `columnOrder`
  is reconciled against `COLUMN_CONFIG` so columns added later (like this one) are appended
  rather than silently dropped.
- Cover view keeps its own inline short labels (KU/COMIX) because the tile badge is too
  small for the full names; the colors match `OWNERSHIP_META`.

---

## Implementation Notes

### Top-Left Priority Logic

```javascript
// Determine top-left badge
let topLeftBadge = null;

if (selectedBooks.has(book.id)) {
    topLeftBadge = 'selection'; // Blue checkmark
} else if (book.onWishlist) {
    topLeftBadge = 'wishlist'; // ♡+
} else if (book.collections && book.collections.length > 0) {
    topLeftBadge = 'collections'; // 📁 count
}
```

### Wishlist Icon Options

- **Chosen**: ❤+ (heart + plus sign, Option B)
- **Alternatives considered**:
  - A. ❤️🛒 (heart + cart) - too busy
  - C. ❤️✓ (heart + check) - confusing with "read"
  - D. 🛒 (just cart) - doesn't convey "wanted" feeling

### Read Status Badge

**Previous implementation**: Diagonal ribbon in SE corner with "READ" text
- CSS class: `.read-ribbon`
- Position: `bottom: 0; right: 0`

**New implementation**: Circular checkmark badge in SE corner
- Cleaner, less intrusive
- Consistent with selection checkmark style
- Easier to spot at a glance

---

## Future Enhancements

1. **Wishlist Gray-out Effect**: Full book cover opacity reduction when `isWishlist === true`
2. **Series Badge**: Potential badge for series position (e.g., "📚 2/5")
3. **New/Recent Badge**: For books acquired in last N days
4. **Custom Tags**: User-defined color-coded tags

---

## Related Files

- `readerwrangler.js`:
  - Cover badge rendering — in the cover-tile JSX (search `Cover badges`)
  - `OWNERSHIP_META`, `getOwnershipType`, `getOwnershipLabel` — module scope, just after `COLUMN_CONFIG`
  - Ownership table column — `COLUMN_CONFIG.ownership`, the cell `switch` (`case 'ownership'`), sort comparator, `getGroupLabel`
  - Ownership dialog row — book modal metadata section (search `Ownership:`)
- `uiHelpers.js` - `normalizeBook` (owns the `onWishlist`/`ownershipType` normalization)
- `docs/reference/DATA-SCHEMA.md` - `ownershipType` field values
