# Multi-Store Architecture Design Document

**Feature**: Multi-Store Support (Amazon, Barnes & Noble, Kobo, etc.)
**Status**: Future Enhancement
**Created**: 2025-11-24

---

## Goal

Support multiple ebook stores while maintaining clean separation between platform-specific and generic code.

---

## File Naming Convention: Store-First

### Import Scripts (platform-specific)

- `amazon-library-fetcher.js` - Imports Amazon library data
- `amazon-collections-fetcher.js` - Imports Amazon collections/read status
- `bn-library-fetcher.js` - Future: Barnes & Noble library import
- `kobo-library-fetcher.js` - Future: Kobo library import

### Data Files (store-specific)

- `amazon-library.json` - Amazon library data (books with `store: "Amazon"` field)
- `amazon-collections.json` - Amazon collections/read status data
- `amazon-manifest.json` - Amazon library metadata (total books, last updated)
- `bn-library.json` - Future: B&N library data (books with `store: "BarnesNoble"` field)
- `bn-manifest.json` - Future: B&N library metadata

### Organizer App (store-agnostic)

- `readerwrangler.html` - Main app shell
- `readerwrangler.js` - Generic organizer logic (works with any store)
- `readerwrangler.css` - Generic styles
- App merges all loaded library files using `store` field to identify source

---

## Bookmarklet Smart Detection

### Current Implementation (Amazon-only)

```javascript
const onLibraryPage = currentUrl.includes('amazon.com/yourbooks') ||
                      currentUrl.includes('amazon.com/kindle/library');
const onCollectionsPage = currentUrl.includes('amazon.com/hz/mycd/digital-console');
```

### Future Multi-Store Implementation

- Detect current store from URL (amazon.com, barnesandnoble.com, etc.)
- **On store library page**: Offer to import library OR navigate to collections page
- **On store collections page**: Offer to import collections OR navigate to library page
- **On non-store page**: Present menu of all supported stores to navigate to
- Each store loads its platform-specific import script

### Bookmarklet Dialog Behavior

**1. On amazon.com/yourbooks:**
- Primary: "📖 Import Your Amazon Books" → loads `amazon-library-fetcher.js`
- Secondary: "📚 Go to Amazon Collections Page" → navigates to collections

**2. On amazon.com/hz/mycd/digital-console:**
- Primary: "📚 Import Your Amazon Collections" → loads `amazon-collections-fetcher.js`
- Secondary: "📖 Go to Amazon Library Page" → navigates to library

**3. On barnesandnoble.com/nook/library (future):**
- Primary: "📖 Import Your B&N Books" → loads `bn-library-fetcher.js`
- Secondary: "📚 Go to B&N Collections Page" (if applicable)

**4. On random page:**
- "Choose your ebook store:"
- Button: "📖 Amazon Kindle" → navigates to amazon.com/yourbooks
- Button: "📖 Barnes & Noble" → navigates to bn.com/nook/library
- Button: "📖 Kobo" → navigates to kobo.com/library

---

## Data Structure

### Book Object (all stores)

```javascript
{
    id: "B00ABCD123",           // Store-specific ID
    asin: "B00ABCD123",         // Amazon-specific (present for Amazon books only)
    title: "Book Title",
    author: "Author Name",
    store: "Amazon",            // NEW FIELD - identifies source store
    coverUrl: "...",            // Store-specific CDN URL
    // ... other fields
}
```

### App Loading Behavior

1. User clicks "Load Library" → file picker opens
2. User can select multiple JSON files: `amazon-library.json`, `bn-library.json`, etc.
3. App loads all files, merges into single library using `store` field
4. Books can be filtered/searched by store if needed
5. Each book retains its store identity for proper cover URLs, links, etc.

---

## Migration Path

### Phase 1: Amazon Rename (v3.5.0) - Current Release
- Add `store: "Amazon"` field to all Amazon books ✅
- Use store-specific filenames (`amazon-library.json`, `amazon-collections.json`) ✅
- Keep bookmarklet Amazon-only (no multi-store detection yet)

### Phase 2: Multi-Store Foundation (future v3.6.0)
- Update bookmarklet with multi-store URL detection
- Add store selection menu for non-store pages
- Update organizer to handle multiple loaded libraries

### Phase 3: Additional Stores (future v3.7.0+)
- Implement `bn-library-fetcher.js` for Barnes & Noble
- Add B&N URL patterns to bookmarklet
- Test with multi-store library (Amazon + B&N books in same organizer)

### Phase 4: Store-Specific Features (future)
- Add store icons/badges in UI
- Filter by store
- Store-specific help text
- Handle store-specific data fields (collections might differ)

---

## Benefits of This Architecture

1. **Clean Separation**: Generic organizer code never knows about specific stores
2. **Easy Testing**: Can develop B&N import script without touching organizer
3. **Scalable**: Adding new stores = new import script + URL patterns
4. **User Flexibility**: Users can import/organize from multiple stores
5. **No Conflicts**: Store-specific filenames prevent overwrites
6. **Future-Proof**: `store` field enables per-store filtering/features later
