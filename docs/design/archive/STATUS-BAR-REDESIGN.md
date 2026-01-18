# Status Bar Redesign - Design Document

**Feature**: Status Bar Redesign
**Current Version**: v3.9.0+ (Load-State-Only)
**Status**: Active (Simplified)
**Created**: 2025-11-21
**Updated**: 2025-12-21

## Goal

Show simple, honest data freshness status based on when the user last loaded their library data.

---

## The 4 Load States

| State | Age | Icon | Tooltip | Message |
|-------|-----|------|---------|---------|
| **Empty** | N/A | 🛑 | Must act | "Load your library to get started. Click to select your amazon-library.json file." |
| **Fresh** | < 7 days | ✅ | All good | "Library loaded 3 days ago. If you've made Amazon purchases/changes since then, re-import and reload." |
| **Stale** | 7-30 days | ⚠️ | Should act | "Library loaded 15 days ago. If you've made Amazon purchases/changes, re-import and reload." |
| **Obsolete** | > 30 days | 🛑 | Must act | "Library loaded 60 days ago. Re-import and reload to get current data." |

---

## Status Bar Display

**What user sees:**
```
ReaderWrangler™
✨ With ratings & reviews • 2,322 books
Data Status: ✅
```

**Click behavior:** Opens modal with detailed freshness info and action buttons.

**Empty state (never loaded):**
```
Library: Not loaded 🛑
Collections: Not loaded 🛑

Load your library to get started:
1. [Import Library] - Opens amazon.com/yourbooks
2. [Import Collections] - Opens amazon.com/hz/mycd/myx
3. [Load Library] [Load Collections] - Pick files to load into app
```

**All other states (Fresh/Stale/Obsolete):**
```
Library: Loaded 3 days ago ✅
Collections: Loaded 5 days ago ✅

If you've made Amazon purchases or collection changes since loading this data:
1. [Import Library] - Opens amazon.com/yourbooks
2. [Import Collections] - Opens amazon.com/hz/mycd/myx
3. [Reload Library] [Reload Collections] - Pick files to load into app

Otherwise, continue organizing!
```

---

## Combined Status Logic

**Worst-case wins across Library + Collections:**
- If both are Fresh → ✅
- If either is Stale → ⚠️
- If either is Empty or Obsolete → 🛑

---

## Why This Approach

**Key insight:** Only the user knows if they've made Amazon purchases requiring a re-import.

**What we don't track:**
- When the import script last ran
- Whether a newer file exists on disk

**Why not:**
- Import script runs on different domain (can't share data via IndexedDB)
- Browser can't poll files on disk (security)
- Even if we knew import ran, doesn't mean Amazon data changed

**Honest messaging:** We show age of loaded data and trust the user to know their own Amazon activity.

**Why reload buttons are always visible:**
- Solves the "Fresh but just imported new data" scenario:
  1. User has Fresh library (loaded 2 days ago) ✅
  2. User buys new book on Amazon today
  3. User imports new library → saves to disk
  4. User opens app → sees ✅ Fresh status
  5. **User clicks status → modal has [Reload Library] button → picks fresher file**
- No way to detect file freshness without user interaction (File Picker API security)
- Always giving user control to reload is simpler than trying to detect staleness

---

## Data Storage

**JSON file metadata (user's disk):**
```javascript
{
  metadata: {
    fetchDate: "2025-12-21T10:00:00Z",  // When imported from Amazon
    totalBooks: 2322,
    schemaVersion: "3.0.0"
  },
  books: [...]
}
```

**IndexedDB (browser storage):**
```javascript
// Loaded data with timestamp
{
  loadedAt: "2025-12-21T10:00:00Z",  // From JSON metadata.fetchDate
  totalBooks: 2322,
  books: [...]
}
```

---

## Backward Compatibility

**Legacy JSON files (no fetchDate):**
- Show as "Unknown" age
- Suggest re-importing to enable status tracking
- App still works normally

---

# Appendix: Manifest System Evolution (2025-11-21 to 2025-12-21)

This appendix documents the complete evolution of the data freshness tracking system, from the original problem through three architectural attempts to the final Load-state-only simplification.

---

## The Original Problem (v3.6.0 and earlier)

**User pain point:** "I don't know if my loaded library data is current with Amazon"

**What we wanted to solve:**
1. **Import state**: How fresh is the file on my disk?
2. **Load state**: How fresh is the data in the app?
3. **Gap detection**: "You loaded 30-day-old data but have a 1-day-old file on disk - reload it!"

**The vision:** 25-state matrix (5 Import states × 5 Load states) showing complete freshness picture

---

## Attempt 1: JSON File Polling (v3.6.0) - FAILED

**Design:** Fetcher writes `amazon-manifest.json` to disk, app polls it every 60 seconds

**Implementation:**
```javascript
// App polled manifest every 60 seconds
fetch(`amazon-manifest.json?t=${Date.now()}`)
```

**Fatal flaw discovered (2025-11-21):**
1. Relative URL fetch resolves relative to where app is served
2. For GitHub Pages: resolves to `https://ron-l.github.io/readerwrangler/amazon-manifest.json`
3. Users can't write files to GitHub - manifest would need to be in repo
4. Result: Fetch always fails (404), silently falls back to age-based staleness
5. **Localhost testing masked this** - manifest was in served directory

**Outcome:** Broken for all GitHub Pages users since launch (never worked in production)

**Why it can't work:**
- Browser security prevents accessing local files via file:// protocol
- Can't poll files on user's disk from web app
- No persistent file handle after initial file picker read

---

## Attempt 2: IndexedDB Manifests (v3.6.1 - v3.8.0) - FAILED

**Design:** Fetcher writes manifest directly to IndexedDB, app reads it

**Implementation:**
```javascript
// Fetcher (runs on amazon.com)
const db = await openDB('ReaderWranglerManifests')
await db.put('manifests', {
  guid: crypto.randomUUID(),
  type: 'library',
  fetchDate: new Date().toISOString(),
  totalBooks: 2322
})

// App (runs on readerwrangler.com or localhost)
const db = await openDB('ReaderWranglerManifests')
const manifests = await db.getAll('manifests')  // Returns: []
```

**The GUID system:**
- Fetcher generates GUID, stores in JSON `metadata.guid` AND IndexedDB manifest
- On load, app matches JSON's GUID to DB manifest
- Match → use DB manifest for Import state
- No match → graceful degradation to Load-state-only

**The 25-state matrix:**
- 5 Import states: Unknown, Empty, Fresh, Stale, Obsolete
- 5 Load states: Unknown, Empty, Fresh, Stale, Obsolete
- Combined: 25 possible combinations
- See [state-matrix.html](../../state-matrix.html) at v3.8.0 for full table

**Fatal flaw discovered (2025-12-20 during v3.8.0 development):**
1. **Fetcher runs on `amazon.com`** domain
2. **App runs on `readerwrangler.com`** (or `localhost`) domain
3. **Browser reality:** IndexedDB is domain-isolated by browser security
4. **Result:** Fetcher writes to amazon.com's IndexedDB, app reads from readerwrangler.com's IndexedDB → **always 0 manifests**

**Impact:** Manifest system **NEVER WORKED** for any user (both localhost and production)

**Why it was missed:**
- **Design failure:** Didn't consider domain boundaries during architecture phase
- **Test failure:** Localhost testing masked issue when both fetcher and app ran on localhost domain
- **Historical context:** Repeated same mistake TWICE (file polling v3.6.0, IndexedDB v3.6.1+)

**Discovery:** Found during v3.8.0 development (unrelated to filtering feature) when debugging "📦 Read 0 manifest(s) from IndexedDB" message

**Documentation at time:**
- See STATUS-BAR-REDESIGN.md at v3.8.0 for full 25-state design
- See state-matrix.html at v3.8.0 for complete state table
- See TODO.md Priority 5 #4 for CRITICAL CONTEXT warning

---

## Attempt 3: Signaling Backend (2025-12-20) - REJECTED

**Design:** Lightweight backend that both fetcher and app can talk to via HTTP

**How it would work:**
1. User gets unique channel ID (UUID) stored in localStorage
2. Fetcher (on amazon.com): After saving file, POST version/timestamp to `https://signal-api.workers.dev/update/{channelId}`
3. App (on readerwrangler.com): Poll `https://signal-api.workers.dev/check/{channelId}` every 5 minutes
4. Backend: Simple Cloudflare Worker or Deno Deploy (~20 lines of code)

**Technical solution:**
- Works around cross-domain isolation (both sides talk to third domain via HTTP)
- Free hosting on Cloudflare Workers or Deno Deploy
- No sensitive data transmitted (only timestamps)
- Graceful degradation if backend is down

**Complete design:** See [docs/design/archive/cross-origin-signaling.md](archive/cross-origin-signaling.md)

**Why it was rejected (2025-12-20):**

*The fatal argument:* "Even with knowledge of import file freshness, you are still out of sync! You don't know that the user just purchased the entire Hardy Boys collection except by running the import. So looking at the import date guarantees nothing."

**Timeline example:**
1. Day 1: User runs import → saves library.json → backend records "fresh data available"
2. Day 2-30: User buys 47 Hardy Boys books on Amazon
3. Day 30: App checks backend → says "you have fresh data from Day 1!"
4. **Reality:** That "fresh" data is 30 days stale relative to Amazon's current state

**What the backend actually tells you:**
- What we claimed: "You have the latest data available"
- What it actually says: "You ran the import X days ago"
- **These are completely different things**

**The real workflow:**
1. Did I buy/return/organize books on Amazon recently?
2. If yes → run import → load file
3. If no → current data is fine

**Critical insight:** The signaling backend doesn't help with step 1 at all. Only the user knows the answer to "Have I made Amazon changes?"

**Complexity vs benefit:**
- Added dependency: Backend service (even if simple and free)
- Single point of failure: If down, system degrades anyway
- No real value: Just tracks user action user already knows about
- **Conclusion:** Load-state-only is simpler AND more honest

---

## Final Decision: Load-State-Only (v3.9.0+) - CURRENT

**Date:** 2025-12-21
**Documented in:** TODO.md Priority 5 #4

**The simplification:**
- From: 25 states (5 Import × 5 Load)
- To: 4 states (Load only)
- Reduction: 84% simpler

**What gets removed:**
- All IndexedDB manifest read/write code
- All Import state tracking logic
- The 25-state decision tree
- Cross-domain synchronization attempts
- GUID matching system

**What users get:**
- Honest status: "Loaded X days ago"
- Simple message: "If you've made Amazon changes, re-import"
- Responsibility where it belongs: User knows their own Amazon activity

**Estimated effort:**
- Fixing broken manifest system: 40-60 hours
- Simplifying to Load-only: 8-12 hours
- **Savings:** 32-48 hours + ongoing maintenance burden

---

## Lessons Learned

### 1. Browser Security Shapes Architecture

**Can't do:**
- Poll files on user's disk (file picker requires user action)
- Share IndexedDB across domains (browser security isolation)
- Auto-reload files (no persistent file handle)

**These aren't bugs - they're fundamental browser security features**

### 2. Localhost Testing Masks Production Failures

**What worked locally:**
- manifest.json polling (served from same directory)
- IndexedDB manifests (fetcher and app both on localhost)

**What failed in production:**
- manifest.json polling (GitHub Pages users can't write to repo)
- IndexedDB manifests (amazon.com ≠ readerwrangler.com)

**Prevention:** Test with actual production URLs before assuming it works

### 3. Only User Knows Their Data Freshness

**What system CAN know:** When files were created/loaded
**What system CAN'T know:** Whether Amazon data has changed since then
**Who knows:** User (they know if they bought books)

**Honest design:** Show what we know, trust user to make decision

### 4. Simple Is Better Than Complex-But-Broken

**Complex approach:** 25-state matrix with cross-domain synchronization
**Simple approach:** 4-state age display with honest messaging

**Result:** Simple approach is:
- Actually works (no cross-domain issues)
- More honest (doesn't pretend to know unknowable things)
- Easier to maintain (less code, fewer edge cases)
- Faster to implement (8-12 hours vs 40-60 hours)

---

## References

**Historical documents (as of v3.8.0):**
- STATUS-BAR-REDESIGN.md - Full 25-state design documentation
- state-matrix.html - Complete 25-state decision table
- TODO.md Priority 5 #4 - CRITICAL CONTEXT warning about cross-domain failure

**Rejected alternatives:**
- [docs/design/archive/cross-origin-signaling.md](archive/cross-origin-signaling.md) - Signaling backend design (comprehensive, but rejected)

**Post-mortem:**
- [post-mortems/v3.8.0-2025-12-20.md](../../post-mortems/v3.8.0-2025-12-20.md) - Discovery of manifest system failure

**Current implementation:**
- TODO.md Priority 5 #4 - Load-State-Only simplification plan
- This document - Current 4-state design
