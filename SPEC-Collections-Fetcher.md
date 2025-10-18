# Technical Specification: Collections & Read Status Fetcher

**Date**: 2025-10-18
**Status**: Draft - Awaiting Review
**Purpose**: Extract collection membership and read status data from Amazon's content management API

---

## Overview

This specification defines a new console-based fetcher script to extract collection membership and read status data for books in the user's Amazon library. This data will be merged with existing library data to enable filtering and visual indicators based on collections (especially "Read" status).

---

## API Endpoint

### Base Information
- **URL**: `https://www.amazon.com/hz/mycd/ajax`
- **Method**: POST
- **Content-Type**: `application/x-www-form-urlencoded`
- **Page Context**: Must be run on `https://www.amazon.com/hz/mycd/digital-console/contentlist/booksAll/dateDsc/`

### Request Structure

**Body Parameters** (URL-encoded):
```
clientId=MYCD_WebService
csrfToken={EXTRACTED_FROM_PAGE}
activity=GetContentOwnershipData
activityInput={JSON_PAYLOAD}
```

**Activity Input JSON Structure**:
```json
{
  "contentType": "Ebook",
  "contentCategoryReference": "booksAll",
  "itemStatusList": ["Active", "Expired"],
  "excludeExpiredItemsFor": [
    "KOLL", "Purchase", "Pottermore", "FreeTrial",
    "DeviceRegistration", "KindleUnlimited", "Sample",
    "Prime", "ComicsUnlimited", "Comixology"
  ],
  "originTypes": [
    "Purchase", "PublicLibraryLending", "PersonalLending",
    "Sample", "ComicsUnlimited", "KOLL", "RFFLending",
    "Pottermore", "Prime", "Rental", "DeviceRegistration",
    "FreeTrial", "KindleUnlimited", "Comixology"
  ],
  "showSharedContent": true,
  "fetchCriteria": {
    "sortOrder": "DESCENDING",
    "sortIndex": "DATE",
    "startIndex": 0,
    "batchSize": 25,
    "totalContentCount": -1
  },
  "surfaceType": "Tablet"
}
```

### Response Structure

**Top-level fields**:
```json
{
  "GetContentOwnershipData": {
    "success": false,  // Note: Appears to be false even on success
    "hasMoreItems": false,
    "numberOfItems": 2280,
    "items": [ /* array of book objects */ ]
  }
}
```

**Per-book object** (relevant fields):
```json
{
  "asin": "B0DQJ643QT",
  "title": "The Shattering Peace: Old Man's War Book 7",
  "authors": "John Scalzi",
  "productImage": "https://m.media-amazon.com/images/I/51AtygED7KL.jpg",

  "readStatus": "READ",  // Values: "READ", "UNREAD", "UNKNOWN"

  "collectionList": [
    {
      "collectionId": "c8df0e26-2ab0-496b-943f-35aab3a626e7",
      "collectionName": "Read"
    }
  ],
  "collectionIds": ["c8df0e26-2ab0-496b-943f-35aab3a626e7"],
  "collectionCount": 1,

  "acquiredDate": "October 2, 2025",
  "acquiredTime": 1759461111317,
  "actions": [
    "DELIVER_OR_REMOVE_FROM_DEVICE",
    "DELETE_TITLE",
    "MARK_AS_UNREAD",  // or "MARK_AS_READ"
    "CLEAR_FURTHEST_PAGE_READ",
    "READ_NOW",
    "ADD_OR_REMOVE_FROM_COLLECTION",
    "BUY_AUDIO_BOOK",
    "GIFT_NOW",
    "MANAGE_FAMILY_LIBRARY"
  ]
}
```

---

## Authentication

### CSRF Token Extraction
- Token must be extracted from the page before making requests
- Look for token in page source or existing JavaScript variables
- Same pattern as current `console-fetcher.js` (uses `anti-csrftoken-a2z` cookie)

### Session Cookies
- Uses standard Amazon session cookies
- Requires user to be logged in to Amazon
- Cookie header is automatically included via `credentials: 'include'`

---

## Pagination

### Parameters
- **batchSize**: 25 books per request (matches observed behavior)
- **startIndex**: Increments by batchSize (0, 25, 50, 75, ...)
- **Termination**: `hasMoreItems: false` indicates last page
- **Total Count**: `numberOfItems` field provides total library size

### Example Pagination Flow
```
Request 1: startIndex=0,  batchSize=25 → Returns items 0-24
Request 2: startIndex=25, batchSize=25 → Returns items 25-49
Request 3: startIndex=50, batchSize=25 → Returns items 50-74
...
Final Request: hasMoreItems=false
```

---

## Rate Limiting

### Recommended Strategy
- **Delay between requests**: 2-3 seconds (same as current fetcher)
- **Progressive backoff**: If errors occur, increase delay
- **User feedback**: Show progress (e.g., "Fetching page 5/92...")

---

## Output Format

### File: `amazon-collections.json`

**Schema Version**: 1.0

```json
{
  "schemaVersion": "1.0",
  "generatedAt": 1760826385687,
  "totalBooks": 2280,
  "books": [
    {
      "asin": "B0DQJ643QT",
      "readStatus": "READ",
      "collections": [
        {
          "id": "c8df0e26-2ab0-496b-943f-35aab3a626e7",
          "name": "Read"
        }
      ]
    }
  ]
}
```

### Minimal Output (Optimized)
Only extract essential fields:
- `asin` - To match with existing library
- `readStatus` - READ/UNREAD/UNKNOWN
- `collections` - Array of {id, name} objects

**Optional fields** (may be useful later):
- `title`, `authors` - For debugging/validation
- `acquiredTime` - For future incremental fetching

---

## Integration Plan

### Phase 1: Proof of Concept (POC)
**Goal**: Validate API works and data is extractable

1. Create minimal console script
2. Fetch exactly 2 pages (50 books)
3. Extract and log to console:
   - ASINs
   - Read status
   - Collection data
4. Verify CSRF token extraction works
5. Verify pagination works

**Success Criteria**:
- Script runs without authentication errors
- Returns expected fields
- Pagination increments correctly

### Phase 2: Full Fetcher Script
**Goal**: Create production-ready fetcher

1. Extract CSRF token from page
2. Implement pagination loop with rate limiting
3. Progress reporting (e.g., "Fetching page X of Y...")
4. Error handling (session expiration, network errors)
5. Generate `amazon-collections.json` file
6. Download file to user's browser

**Success Criteria**:
- Fetches all 2000+ books successfully
- Respects rate limits
- Clear error messages on failure
- Produces valid JSON output

### Phase 3: Integration with Organizer
**Goal**: Merge collection data with existing library

1. Load `amazon-collections.json` in organizer
2. Match books by ASIN
3. Add collection/read status to book metadata
4. Enable filtering by collection name
5. Add visual indicators (badges) for "Read" status

**Success Criteria**:
- Collection data appears in organizer
- Filtering works
- Visual indicators display correctly

---

## Error Handling

### Expected Errors

1. **Authentication/Session Expiration**
   - Message: "You are not logged in or session expired"
   - Recovery: "Refresh the page and try again"

2. **CSRF Token Missing**
   - Message: "Could not extract CSRF token from page"
   - Recovery: "Ensure you're on the correct Amazon page"

3. **Network/API Errors**
   - Message: "API request failed: [error details]"
   - Recovery: "Check your connection and try again"

4. **Rate Limiting (if detected)**
   - Message: "Request throttled by Amazon"
   - Recovery: "Waiting [X] seconds before retry..."

---

## Open Questions

1. **Incremental Fetching**: Can we use `sortIndex: "MODIFIED_DATE"` to only fetch recently changed books?
   - Investigation needed: Does collection membership change update this timestamp?
   - If yes: Implement incremental fetch strategy
   - If no: Always fetch full library

2. **Alternative Endpoint**: Is there a lighter-weight endpoint that only returns collection data?
   - Current endpoint returns full book metadata
   - May be wasteful if we only need ASIN + collections

3. **Collection List API**: Should we also fetch the list of all collections?
   - Endpoint identified: `GetCollections`
   - Returns: collection names, IDs, sizes, modification dates
   - Use case: Pre-populate collection filter dropdown in organizer

---

## Next Steps

1. ✅ Review this specification
2. ⏳ Build POC script (2-page fetch, console output)
3. ⏳ Test POC on live Amazon page
4. ⏳ If successful, build full fetcher script
5. ⏳ Test with full library (~2000 books)
6. ⏳ Integrate with organizer

---

## References

- Network traffic capture: `Collections Traffic Capture.txt`
- Existing fetcher pattern: `console-fetcher.js`
- Session notes: `NOTES.md` (lines 43-106)
