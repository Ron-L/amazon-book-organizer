# Implementation Plan: v3.3.0 Comprehensive Statistics & Retry Logic

## Overview
Add retry logic to all API calls (Phase 0, Pass 1, Pass 2) and comprehensive final summary with timing, retry statistics, and data quality metrics.

## Changes Required

### 1. Global Stats Tracking (DONE ✅)
Already added `stats` object at line 60-85 with structure for:
- Timing (phase0Start/End, pass1Start/End, etc.)
- API calls (total, firstTry, retry1, retry2, retry3, failed)
- Data quality tracking (nonBooksFiltered, booksWithoutAuthors, aiSummariesUsed, apiErrorBooks)

### 2. Update `fetchWithRetry()` Function
**Location**: Lines 233-276

**Current**: Returns `{product}` or throws error

**Change**: Track retry attempts in global stats before returning

```javascript
const fetchWithRetry = async (fetchFn, context, maxRetries = MAX_RETRIES) => {
    let lastError = null;
    stats.apiCalls.total++;  // ADD THIS

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
            const result = await fetchFn();

            // Check for errors (existing logic)
            if (result.httpError) throw new Error(`HTTP ${result.httpStatus}`);
            if (result.apiError) throw new Error('API error');
            if (result.noData) throw new Error('No data returned');

            // SUCCESS - Track which attempt succeeded
            if (attempt === 0) {
                stats.apiCalls.firstTry++;  // ADD THIS
            } else if (attempt === 1) {
                stats.apiCalls.retry1++;    // ADD THIS
            } else if (attempt === 2) {
                stats.apiCalls.retry2++;    // ADD THIS
            } else if (attempt === 3) {
                stats.apiCalls.retry3++;    // ADD THIS
            }

            return result;

        } catch (error) {
            lastError = error;
            if (attempt === maxRetries) break;

            const delay = RETRY_DELAYS_MS[attempt];
            console.log(`   ⏳ Retry ${attempt + 1}/${maxRetries} after ${delay/1000}s...`);
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }

    // FAILED - Track failure
    stats.apiCalls.failed++;  // ADD THIS
    throw lastError;
};
```

### 3. Phase 0: Add Retry Logic & Timing
**Location**: Lines 348-647

**Start** (line 349): Already added `stats.timing.phase0Start = Date.now();` ✅

**Library Query Test** (lines 379-426):
Wrap the fetch in `fetchWithRetry()`:

```javascript
try {
    await fetchWithRetry(async () => {
        const testLibraryResponse = await fetch('https://www.amazon.com/kindle-reader-api', {
            method: 'POST',
            headers: {
                'accept': 'application/json, text/plain, */*',
                'content-type': 'application/json',
                'anti-csrftoken-a2z': csrfToken,
                'x-client-id': 'your-books'
            },
            credentials: 'include',
            body: JSON.stringify({
                query: testLibraryQuery,
                operationName: 'ccGetCustomerLibraryBooks'
            })
        });

        if (!testLibraryResponse.ok) {
            return { httpError: true, httpStatus: testLibraryResponse.status };
        }

        const testLibraryData = await testLibraryResponse.json();

        if (testLibraryData.errors) {
            return { apiError: true };
        }

        const testLibrary = testLibraryData?.data?.getCustomerLibrary?.books;

        if (!testLibrary || !testLibrary.edges) {
            return { noData: true };
        }

        // Success
        console.log(`   ✅ Library API working (found ${testLibrary.totalCount?.number || 0} books)`);
        return { success: true, data: testLibraryData };
    }, 'Phase 0 library test');

} catch (error) {
    // Existing error handling
}
```

**Enrichment Query Test** (lines 428-647):
Similarly wrap in `fetchWithRetry()` (same pattern)

**End** (line 647 after enrichment test):
```javascript
stats.timing.phase0End = Date.now();
console.log('✅ Phase 0 complete: All API endpoints and extraction logic validated\n');
```

### 4. Pass 1: Add Retry Logic & Timing
**Location**: Lines 730-967

**Start** (after line 732):
```javascript
stats.timing.pass1Start = Date.now();
```

**Page Fetch Loop** (lines 761-936):
Wrap the fetch in `fetchWithRetry()`:

```javascript
try {
    const result = await fetchWithRetry(async () => {
        const response = await fetch('https://www.amazon.com/kindle-reader-api', {
            method: 'POST',
            headers: {
                'accept': 'application/json, text/plain, */*',
                'content-type': 'application/json',
                'anti-csrftoken-a2z': csrfToken,
                'x-client-id': 'your-books'
            },
            credentials: 'include',
            body: JSON.stringify({
                query: query,
                operationName: 'ccGetCustomerLibraryBooks'
            })
        });

        if (!response.ok) {
            return { httpError: true, httpStatus: response.status };
        }

        const data = await response.json();

        if (data.errors) {
            return { apiError: true };
        }

        const library = data?.data?.getCustomerLibrary?.books;

        if (!library) {
            return { noData: true };
        }

        // Success
        return { library };
    }, `Pass 1 page ${pageNum}`);

    const library = result.library;

    // Rest of existing processing...

} catch (error) {
    console.error(`   ❌ Error on page ${pageNum}:`, error.message);
    break;
}
```

**Non-Book Filtering** (line 901-904):
Update to track stats:

```javascript
if (binding && !BOOK_BINDINGS.includes(binding)) {
    stats.nonBooksFiltered.push({ title, asin, binding });  // ADD THIS
    console.log(`   ⏭️  Skipping non-book: ${title} (${binding})`);
    continue;
}
```

**Track Authors** (after line 889):
```javascript
const authors = extractAuthors(product);
if (!authors || authors === 'Unknown Author') {
    stats.booksWithoutAuthors.push({ title, asin });  // ADD THIS
}
```

**End** (line 967 after loop):
```javascript
stats.timing.pass1End = Date.now();
console.log(`\n✅ Pass 1 complete: Found ${newBooks.length} new books\n`);
```

### 5. Pass 2: Track AI Summaries & API Errors
**Location**: Lines 968-1125

**Start** (line 970):
```javascript
stats.timing.pass2Start = Date.now();
```

**AI Summary Detection** (line 1079-1084):
```javascript
if (!description) {
    description = extractAISummary(product);
    if (description) {
        stats.aiSummariesUsed.push({ title: book.title, asin: book.asin });  // ADD THIS
        console.log(`   📝 Using AI summary (${description.length} chars)`);
    }
}
```

**API Error Tracking** (line 1115):
```javascript
} catch (error) {
    stats.apiErrorBooks.push({ title: book.title, asin: book.asin });  // ADD THIS
    console.log(`   ❌ Failed after ${MAX_RETRIES} retries: ${error.message}`);
    errorCount++;
}
```

**End** (line 1125):
```javascript
stats.timing.pass2End = Date.now();
console.log(`\n✅ Pass 2 complete: Enriched ${enrichedCount}/${newBooks.length} books`);
```

### 6. Merge & Manifest Timing
**Merge start** (line 1132):
```javascript
stats.timing.mergeStart = Date.now();
console.log('[5/6] Merging with existing data and saving library...');
```

**Merge end** (after save, line ~1161):
```javascript
stats.timing.mergeEnd = Date.now();
console.log('✅ Library saved: amazon-library.json');
```

**Manifest start** (line 1163):
```javascript
stats.timing.manifestStart = Date.now();
console.log('[6/6] Creating manifest file...');
```

**Manifest end** (line ~1190):
```javascript
stats.timing.manifestEnd = Date.now();
console.log('✅ Manifest saved: amazon-manifest.json');
```

### 7. Comprehensive Final Summary
**Location**: Replace lines 1192-1235 (current summary)

```javascript
// Helper function to format time
const formatTime = (ms) => {
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    if (hours > 0) {
        return `${hours}h ${minutes}m ${seconds}s`;
    } else if (minutes > 0) {
        return `${minutes}m ${seconds}s`;
    } else {
        return `${seconds}s`;
    }
};

// Calculate phase durations
const phase0Duration = stats.timing.phase0End - stats.timing.phase0Start;
const pass1Duration = stats.timing.pass1End - stats.timing.pass1Start;
const pass2Duration = stats.timing.pass2End - stats.timing.pass2Start;
const mergeDuration = stats.timing.mergeEnd - stats.timing.mergeStart;
const manifestDuration = stats.timing.manifestEnd - stats.timing.manifestStart;
const totalDuration = Date.now() - startTime;

console.log('\n');
console.log('========================================');
console.log('✅ LIBRARY FETCH COMPLETE!');
console.log('========================================');
console.log('');

console.log('⏱️  TIMING');
console.log(`   Phase 0 (Validation):        ${formatTime(phase0Duration)}`);
console.log(`   Pass 1 (Fetch titles):        ${formatTime(pass1Duration)}`);
console.log(`   Pass 2 (Enrich):              ${formatTime(pass2Duration)}`);
console.log(`   Pass 3 (Merge & save):        ${formatTime(mergeDuration)}`);
console.log(`   Pass 4 (Manifest):            ${formatTime(manifestDuration)}`);
console.log(`   ${'─'.repeat(37)}`);
console.log(`   Total time:                   ${formatTime(totalDuration)}`);
console.log('');

const totalFetched = newBooks.length + stats.nonBooksFiltered.length;
console.log('📊 FETCH RESULTS');
console.log(`   Total books fetched:          ${totalFetched}`);
if (stats.nonBooksFiltered.length > 0) {
    console.log(`   Non-books filtered:           ${stats.nonBooksFiltered.length}`);
    stats.nonBooksFiltered.slice(0, 3).forEach(item => {
        console.log(`      • ${item.title.substring(0, 50)} (${item.binding})`);
    });
    if (stats.nonBooksFiltered.length > 3) {
        console.log(`      • ... and ${stats.nonBooksFiltered.length - 3} more`);
    }
}
console.log(`   Books kept:                   ${newBooks.length}`);
console.log('');

console.log('🔄 API RELIABILITY');
console.log(`   Total API calls:              ${stats.apiCalls.total}`);
const firstTryPct = ((stats.apiCalls.firstTry / stats.apiCalls.total) * 100).toFixed(1);
console.log(`   Succeeded first try:          ${stats.apiCalls.firstTry} (${firstTryPct}%)`);
if (stats.apiCalls.retry1 > 0) {
    const retry1Pct = ((stats.apiCalls.retry1 / stats.apiCalls.total) * 100).toFixed(1);
    console.log(`   Needed 1 retry:               ${stats.apiCalls.retry1} (${retry1Pct}%)`);
}
if (stats.apiCalls.retry2 > 0) {
    const retry2Pct = ((stats.apiCalls.retry2 / stats.apiCalls.total) * 100).toFixed(1);
    console.log(`   Needed 2 retries:             ${stats.apiCalls.retry2} (${retry2Pct}%)`);
}
if (stats.apiCalls.retry3 > 0) {
    const retry3Pct = ((stats.apiCalls.retry3 / stats.apiCalls.total) * 100).toFixed(1);
    console.log(`   Needed 3 retries:             ${stats.apiCalls.retry3} (${retry3Pct}%)`);
}
if (stats.apiCalls.failed > 0) {
    const failedPct = ((stats.apiCalls.failed / stats.apiCalls.total) * 100).toFixed(1);
    console.log(`   Failed after 3 retries:       ${stats.apiCalls.failed} (${failedPct}%)`);
}
console.log('');

const successRate = ((enrichedCount / newBooks.length) * 100).toFixed(2);
console.log('📝 ENRICHMENT RESULTS');
console.log(`   Successfully enriched:        ${enrichedCount}/${newBooks.length} (${successRate}%)`);
if (stats.apiErrorBooks.length > 0) {
    console.log(`   Failed after retries:         ${stats.apiErrorBooks.length}`);
    stats.apiErrorBooks.slice(0, 3).forEach(item => {
        console.log(`      • ${item.title.substring(0, 50)}`);
    });
    if (stats.apiErrorBooks.length > 3) {
        console.log(`      • ... and ${stats.apiErrorBooks.length - 3} more`);
    }
}
console.log('');

console.log('⚠️  DATA QUALITY NOTES');
console.log(`   Books without descriptions:   ${booksWithoutDescriptions.length}`);
booksWithoutDescriptions.slice(0, 3).forEach(item => {
    console.log(`      • ${item.title} (ASIN: ${item.asin})`);
});
if (booksWithoutDescriptions.length > 3) {
    console.log(`      • ... and ${booksWithoutDescriptions.length - 3} more`);
}
console.log('');

if (stats.booksWithoutAuthors.length > 0) {
    console.log(`   Books without authors:        ${stats.booksWithoutAuthors.length}`);
    stats.booksWithoutAuthors.slice(0, 3).forEach(item => {
        console.log(`      • ${item.title.substring(0, 50)} (ASIN: ${item.asin})`);
    });
    if (stats.booksWithoutAuthors.length > 3) {
        console.log(`      • ... and ${stats.booksWithoutAuthors.length - 3} more`);
    }
    console.log('');
}

if (stats.aiSummariesUsed.length > 0) {
    console.log(`   AI summaries used:            ${stats.aiSummariesUsed.length}`);
    stats.aiSummariesUsed.slice(0, 3).forEach(item => {
        console.log(`      • ${item.title.substring(0, 50)} (ASIN: ${item.asin})`);
    });
    if (stats.aiSummariesUsed.length > 3) {
        console.log(`      • ... and ${stats.aiSummariesUsed.length - 3} more`);
    }
    console.log('');
}

console.log('💾 FILES SAVED');
console.log(`   ✅ amazon-library.json (${mergedBooks.length} books)`);
console.log(`   ✅ amazon-manifest.json`);
console.log('========================================');
console.log('');
console.log('👉 Next steps:');
console.log('   1. Find both files in your browser\'s save location');
console.log('   2. Place them in same folder as organizer HTML');
console.log('   3. Organizer will auto-detect manifest and show status');
console.log('   4. Click status indicator to sync if needed');
console.log('');
console.log('💡 Next time you run this script:');
console.log('   - Select amazon-library.json when prompted');
console.log('   - Only NEW books will be fetched & enriched');
console.log('   - Both files will be updated automatically');
console.log('   - Organizer will detect the update via manifest');
console.log('========================================');
```

## Summary of Changes

**Files Modified**: 1 (library-fetcher.js)

**Lines Changed**: ~400 lines touched

**New Features**:
1. ✅ Global stats tracking object
2. Retry logic for Phase 0 (library + enrichment tests)
3. Retry logic for Pass 1 (library page fetching)
4. Retry tracking in fetchWithRetry()
5. Non-book filtering stats
6. Books without authors tracking
7. AI summaries tracking
8. API error books tracking
9. Phase timing tracking (6 phases)
10. Comprehensive final summary with histograms

**Testing Strategy**:
1. Sanity check (~10 books) to verify:
   - Retry messages appear
   - Non-book filtering works
   - Timing is tracked
   - Stats are collected
2. Full fresh fetch to validate complete implementation

## Implementation Status
- [x] Stats object created
- [ ] fetchWithRetry() updated with stats tracking
- [ ] Phase 0 wrapped in retry + timing
- [ ] Pass 1 wrapped in retry + timing + stats
- [ ] Pass 2 stats tracking (AI summaries, errors, authors)
- [ ] Merge & manifest timing
- [ ] Comprehensive final summary
