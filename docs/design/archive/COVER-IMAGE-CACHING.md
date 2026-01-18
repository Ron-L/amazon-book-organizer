# Cover Image Caching

## Overview

**Problem:** Book cover images are loaded from Amazon's CDN on every page load, filter change, and refresh. With ~2,200 books, this takes ~4 seconds and creates unnecessary network traffic.

**Goal:** Cache cover images locally using the browser's Cache API for faster rendering and offline capability.

**Status:** Investigation complete, implementation in progress on `feature-cover-caching` branch.

---

## Investigation: Image Sizes

### Background

Amazon provides two image URLs per book:
- `hiRes` - High resolution cover image
- `lowRes` - Lower resolution cover image

Before implementing caching, we needed to determine which image size to use.

### Results

| Resolution | Dimensions | Approx File Size |
|------------|------------|------------------|
| hiRes | 1594 x 2560 | ~150-200 KB |
| lowRes | 311 x 500 | ~30-50 KB |

### Decision

**Use lowRes for primary display.**

Rationale:
- Book covers display at ~120px width in columns
- lowRes at 311px is **2.5x larger** than needed (supports Retina displays)
- File size is ~4x smaller than hiRes
- Visually indistinguishable at display size

**Archive hiRes for future use** (zoom feature, print, etc.)

---

## Investigation: Cache API Feasibility

### Question

Can the browser's Cache API reliably store ~2,500 cover images (~100MB)?

### Test 1: Write Speed

```javascript
// Create synthetic 40KB blobs (simulating cover images)
const cache = await caches.open('cover-test');
for (let i = 0; i < 2500; i++) {
    await cache.put(`https://cached-covers.local/book-${i}.jpg`, new Response(blob));
}
```

**Result:** 2,500 images cached in **4.5 seconds** (1.80ms average per image)

### Test 2: Read Speed

```javascript
for (let i = 0; i < 2500; i++) {
    const response = await cache.match(`https://cached-covers.local/book-${i}.jpg`);
    await response.blob();
}
```

**Result:** 2,500 images read in **1.4 seconds** (0.56ms average per image)

### Storage Capacity

```
Used: 985.7 MB (including test data)
Quota: 557.7 GB
```

No storage concerns - browser allows hundreds of GB.

### Conclusion

**Cache API is viable.** Read performance (1.4s) is significantly faster than network fetch (~4s).

---

## Performance Summary

| Scenario | Current | With Cache | Improvement |
|----------|---------|------------|-------------|
| Initial page load | ~7s (3s app + 4s images) | ~4.4s (3s app + 1.4s cache) | **37% faster** |
| Filter/refresh | ~4s | ~1.4s | **65% faster** |
| Network requests | 2,200 per load | 0 (after cache populated) | **Offline capable** |

---

## Data Model Changes

### Import Output (amazon-library-fetcher.js v4.6.0)

**Before:**
```javascript
{
    coverUrl: "https://images-na.ssl-images-amazon.com/images/I/XXXXX.jpg"  // hiRes
}
```

**After:**
```javascript
{
    coverUrl: "https://images-na.ssl-images-amazon.com/images/I/XXXXX.jpg",      // lowRes (primary)
    coverUrlHiRes: "https://images-na.ssl-images-amazon.com/images/I/YYYYY.jpg"  // hiRes (archived)
}
```

### Backward Compatibility

- Existing JSON files without `coverUrlHiRes` continue to work
- App uses `coverUrl` for display (unchanged behavior)
- `coverUrlHiRes` available for future features

---

## Implementation Plan

### Phase 1: Import Changes (COMPLETE)

**Branch:** `feature-cover-caching`
**File:** `amazon-library-fetcher.js` (v4.6.0.a)

Changes:
1. Renamed `extractCoverUrl()` to `extractCoverUrls()`
2. Returns `{ coverUrl, coverUrlHiRes }` object
3. `coverUrl` prefers lowRes, falls back to hiRes, then Amazon placeholder
4. `coverUrlHiRes` stores hiRes URL (or null if unavailable)

### Phase 2: App-Side Caching (TODO)

**Approach:** Background cache population after import/load

#### Step 1: Cache Population (Background)

After books are loaded into state, populate cache in background:

```javascript
async function populateCoverCache(books) {
    const cache = await caches.open('rw-covers');
    const uncached = [];

    // Check which covers need caching
    for (const book of books) {
        const cached = await cache.match(book.coverUrl);
        if (!cached) uncached.push(book);
    }

    // Fetch and cache in background (non-blocking)
    for (const book of uncached) {
        try {
            const response = await fetch(book.coverUrl);
            await cache.put(book.coverUrl, response);
        } catch (e) {
            // Silently skip failed fetches
        }
    }
}
```

**Timing:** Run after initial render completes (don't block UI)

#### Step 2: Cache-First Retrieval

Modify image loading to check cache first:

```javascript
async function getCoverUrl(originalUrl) {
    const cache = await caches.open('rw-covers');
    const cached = await cache.match(originalUrl);

    if (cached) {
        // Return blob URL from cache
        const blob = await cached.blob();
        return URL.createObjectURL(blob);
    }

    // Fall back to network (and cache for next time)
    return originalUrl;
}
```

**Alternative:** Use Service Worker for transparent caching (more complex but cleaner)

#### Step 3: Cache Invalidation

- Cache covers by URL (URL includes image ID)
- New import with different cover = different URL = auto-invalidated
- No manual cache clearing needed
- Optional: Add "Clear Image Cache" button in settings

### Phase 3: Future Enhancements (DEFERRED)

1. **HiRes on demand** - Load `coverUrlHiRes` when user opens book detail modal
2. **Lazy loading** - Only cache visible covers, cache more as user scrolls
3. **Service Worker** - Transparent network interception for cleaner implementation

---

## Open Questions

1. **Cache name:** `rw-covers` or `readerwrangler-covers`?
2. **Progress indicator:** Show "Caching images..." during initial population?
3. **Memory management:** Should we revoke blob URLs after use, or let browser handle it?

---

## Related Files

- `amazon-library-fetcher.js` - Import script with dual URL handling
- `readerwrangler.js` - App with cache integration (Phase 2)
- `TODO.md` - P1 T1: Cover Image Caching
