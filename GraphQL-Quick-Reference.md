# Amazon GraphQL API Quick Reference

**Purpose**: Concise reference for Amazon's GraphQL API structure and working configuration.

**Last Updated**: 2025-11-11 (v3.3.2)

---

## GraphQL Request Structure (Correct Hierarchy)

Here's what a GraphQL request actually looks like:

```
Level 0: HTTP Method (always POST for GraphQL)
Level 1: GraphQL Query Type (query vs mutation)
Level 2: Operation Name (optional label for the query)
Level 3: Root Field (the actual API function being called)
Level 4: Field Selection (what data fields you want back)
```

### Concrete Example from Amazon's Popup

```graphql
query qvGetProductQuickView($asin: ID!) {       ← Level 2: Operation name (just a label)
  getProduct(asin: $asin) {                     ← Level 3: Root field (THE ACTUAL API)
    asin                                         ← Level 4: Field selection
    title                                        ← Level 4: Field selection
    customerReviewsTop {                         ← Level 4: Field selection (nested)
      reviews {
        contentAbstract {
          textAbstract
        }
      }
    }
  }
}
```

### The Key Insight

- `qvGetProductQuickView` is just a **NAME/LABEL** - like naming a function call for debugging
- `getProduct` is the **ACTUAL API** being called
- Think of it like: `const result = getProduct({asin: "B001234"})`

---

## Working Configuration (Production)

### Endpoint
```
POST https://www.amazon.com/kindle-reader-api
```

### Headers
```javascript
{
    'accept': 'application/json, text/plain, */*',
    'content-type': 'application/json',
    'anti-csrftoken-a2z': csrfToken,  // From <meta name="anti-csrftoken-a2z">
    'x-client-id': 'your-books'
}
```

### Request Body
```javascript
{
    query: `query enrichBook {
        getProducts(input: [{asin: "${book.asin}"}]) {
            asin
            description {
                sections(filter: {types: PRODUCT_DESCRIPTION}) {
                    content
                }
            }
            auxiliaryStoreRecommendations(
                recommendationTypes: ["AI_SUMMARIES"]
            ) {
                recommendations {
                    recommendationType
                    sharedContent {
                        contentAbstract {
                            textAbstract
                        }
                    }
                }
            }
            customerReviewsSummary {
                count {
                    displayString
                }
                rating {
                    value
                }
            }
            customerReviewsTop {
                reviews {
                    contentAbstract {
                        textAbstract
                    }
                    contributor {
                        publicProfile {
                            publicProfile {
                                publicName {
                                    displayString
                                }
                            }
                        }
                    }
                    title
                    stars
                }
            }
        }
    }`,
    operationName: 'enrichBook'
}
```

---

## Response Structure

### Successful Response
```javascript
{
    data: {
        getProducts: [
            {
                asin: "B003J5UJD6",
                description: { /* ... */ },
                auxiliaryStoreRecommendations: { /* ... */ },
                customerReviewsSummary: {
                    count: { displayString: "238" },
                    rating: { value: 4.5 }
                },
                customerReviewsTop: {
                    reviews: [
                        {
                            contentAbstract: { textAbstract: "..." },
                            contributor: { /* ... */ },
                            title: "Great book!",
                            stars: 5
                        }
                        // ... more reviews
                    ]
                }
            }
        ]
    }
}
```

### Partial Error Response
```javascript
{
    data: {
        getProducts: [
            {
                asin: "B0085HN8N6",
                description: { /* Valid data! */ },
                customerReviewsTop: null  // This field failed
            }
        ]
    },
    errors: [
        {
            message: "Customer Id or Marketplace Id is invalid",
            path: ["getProducts", 0, "customerReviewsTop"]
        }
    ]
}
```

**Important**: The presence of `errors` array doesn't mean the entire response failed. Check for data presence.

---

## Error Handling Pattern

```javascript
// ❌ WRONG: Assume errors means total failure
if (response.errors) {
    reject(); // Lost valid data!
}

// ✅ CORRECT: Check for data presence despite errors
if (response.errors && !response.data?.getProducts?.[0]) {
    reject(); // Only fail if truly no data
} else if (response.data?.getProducts?.[0]) {
    // Use data even if errors present
    // Log partial error for monitoring
}
```

---

## What Works / What Doesn't

| Root Field | Status | Notes |
|------------|--------|-------|
| **getProducts** (plural) | ✅ Works | Use this one (current production) |
| getProduct (singular) | ❌ Broken | Fails even for known-working books |
| getProductByAsin | ❌ Broken | Deprecated/broken endpoint |

**Client ID Impact**: `x-client-id` header (`your-books` vs `quickview`) has **NO impact** on success rate. Root field choice is the critical factor.

---

## Common Mistakes to Avoid

### ❌ Inventing Query Structures
```javascript
// WRONG - causes validation errors
getProducts(asins: ["B003J5UJD6"])
```

```javascript
// CORRECT - copied from working code
getProducts(input: [{asin: "B003J5UJD6"}])
```

**Rule**: Always copy query structure from library-fetcher.js, never invent new structures.

### ❌ Adding Extra Headers
```javascript
// WRONG
{
    'Content-Type': 'application/json',  // Wrong case
    'x-amz-portal-marketplace-id': 'ATVPDKIKX0DER',  // Extra header
    'anti-csrftoken-a2z': csrfToken
}
```

```javascript
// CORRECT
{
    'accept': 'application/json, text/plain, */*',
    'content-type': 'application/json',  // Correct case
    'anti-csrftoken-a2z': csrfToken,
    'x-client-id': 'your-books'
}
```

**Rule**: Copy headers EXACTLY from library-fetcher.js, including case sensitivity.

---

## Success Metrics (Baseline)

- **Overall Success Rate**: 98.7% (2,309/2,344 books)
- **Partial Errors**: ~1.3% (35/2,344 books)
- **Total Failures**: <0.1% (after retry logic)

---

## Related Documentation

- **Implementation**: [library-fetcher.js](library-fetcher.js) (lines 1167-1223)
- **Post-Mortem**: [post-mortems/v3.3.2-2025-11-11.md](post-mortems/v3.3.2-2025-11-11.md)
- **Full Investigation**: [archived-investigations/phase-2.6-partial-errors/GraphQL-API-Reference.md](archived-investigations/phase-2.6-partial-errors/GraphQL-API-Reference.md)
- **Ground Rules**: [SKILL-Development-Ground-Rules.md](SKILL-Development-Ground-Rules.md) (API Debugging Protocol)

---

## Visual Reference

```
┌─────────────────────────────────────────────────────────┐
│                    HTTP POST Request                    │
│                  (Level 0: Method)                      │
└────────────────────────┬────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────┐
│              query enrichBook { ... }                   │
│           (Level 1: Query Type + Level 2: Name)         │
└────────────────────────┬────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────┐
│         getProducts(input: [{asin: "..."}])            │
│         (Level 3: Root Field - THE ACTUAL API)          │
└────────────────────────┬────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────┐
│    asin, description, customerReviewsTop, etc.         │
│         (Level 4: Field Selection - What You Want)      │
└─────────────────────────────────────────────────────────┘
```

---

**Note**: This is a living document. Update when API behavior changes or new patterns are discovered.
