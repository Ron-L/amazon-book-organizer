# Data Integrity System Design

**Version:** 1.0 (2026-03-10)
**Status:** Proposed
**Context:** Ongoing data corruption incidents spanning Jan–Mar 2026

---

## 1. Background: Incident History

### 1.1 Incident Timeline

Data integrity issues have occurred repeatedly across development. Because no systematic detection existed, most were discovered accidentally — by the developer noticing something wrong with their own library.

#### Jan 13, 2026 — Save race condition on initial load (v4.15.6.i)
- **Symptom:** Filter/sort preferences were periodically reset to defaults
- **Cause:** The save-to-localStorage effect fired before the load-from-localStorage effect completed, writing empty state over persisted data
- **Fix:** Added `filtersLoadedRef` guard — skip save during the first 100ms of load
- **Data affected:** Sort/filter preferences (recoverable by re-applying)

#### Jan 20, 2026 — Orphan wishlist books wiped on import (v4.17.0 / v4.18.0.a)
- **Symptom:** Books the user had wishlisted but not yet purchased disappeared from the library entirely on each import
- **Cause:** `saveBooksToIndexedDB` cleared the entire IndexedDB store before writing the new import payload, which only contained owned books. Wishlist-only books were not in the fetcher payload and were therefore deleted every time.
- **Fix:** Implemented multi-step merge logic in `storage.js`: load existing books before clearing, identify orphan wishlist items not in new payload, combine and deduplicate before writing
- **Long-term consequence:** The 272 homeless books present in the library as of Mar 2026 are a direct result of this gap — wishlist books added before this fix (pre-v4.18.0.a) were never placed in a folder because no Inbox placement logic existed yet. They survived in IndexedDB via the new orphan-preservation logic but never gained folder membership.

#### Jan 31, 2026 — Orphaned wishlist data hole (v5.0.0-alpha.126)
- **Symptom:** After restoring a backup, future fetcher runs could not update wishlist-only books (descriptions, prices, etc. remained stale)
- **Cause:** Backup restore imported books into IndexedDB but did not regenerate the relay library payload. The fetcher, on its next run, re-fetched owned books only and uploaded a payload that did not include wishlist-only books. The merge logic preserved these wishlists in IndexedDB but could not enrich them without a corresponding relay payload.
- **Fix:** Backup restore now re-uploads the merged library to the relay via `putDeviceState()`, ensuring the fetcher payload reflects the full library on next run

#### Feb 8, 2026 — Undo/Redo race condition (v5.1.0-alpha.16)
- **Symptom:** After Undo, pressing Redo created the target folder but left books behind; a second Ctrl+Y was required
- **Cause:** Multiple `setFolders()` calls for sub-actions (CREATE_FOLDER + ADD_BOOKS_TO_FOLDER) were batched asynchronously by React, allowing an intermediate state where the folder existed but books had not yet been moved
- **Fix:** All sub-actions within a single undo/redo step are now computed into one final state and committed in a single `setFolders()` call

#### Feb 23, 2026 — Corrupted data causing white screen (v5.0.10)
- **Symptom:** App fails to mount — white screen / blank splash — with no recovery path
- **Cause:** Unknown; likely corrupted localStorage or IndexedDB data causing a React render error during startup
- **Fix:** Added 15-second fallback in `readerwrangler.html` — pure JS (no React dependency) replaces the splash screen with an emergency Reset App button that clears all storage and reloads

#### Feb 27, 2026 — Reset App left IndexedDB intact (v5.6.2)
- **Symptom:** "Reset App" did not fully clear the library — books persisted after reset
- **Cause:** `store.clear()` emptied the object store but left the IndexedDB database schema intact, and in some cases data was not fully flushed
- **Fix:** Changed to `indexedDB.deleteDatabase()` to fully destroy the database; now matches the emergency reset behavior in HTML

#### Mar 4, 2026 — Duplicate books discovered (v6.0.0-alpha.47)
- **Symptom:** User reported seeing multiple copies of books in their library
- **Cause:** Not fully root-caused; likely a combination of relay sync and backup restore writing the same ASIN under different internal IDs
- **Fix:** Added duplicate detection and resolution UI in Data Status dialog; user-initiated deduplication with choice of which copy to keep and automatic folder-membership merge

#### Mar 6–7, 2026 — Tags wiped, books duplicated in Inbox (unresolved trigger)
- **Symptom:** An unknown operation wiped tags from books and caused a mass duplication of books into the Inbox. The corrupted state was captured in `readerwrangler-backup-2026-03-06 14.20-CORRUPTED.json`.
- **Cause:** Not pinpointed. The structural analysis identified 25+ race condition hotspots that could produce exactly these symptoms:
  - Two separate IndexedDB transactions (clear → add) meant a concurrent read could see an empty store between them, causing React state to revert to the pre-write snapshot
  - 45+ fire-and-forget `saveBooksToIndexedDB` calls with no serialization meant concurrent writes could interleave (second clear wiping the first write)
  - `importFromRelay` read IndexedDB immediately after `loadLibrary` to find new books, racing with the in-flight write transaction
  - The 15-second device-state debounce push could overlap with any ongoing import
- **Fix (v6.3.0):** Three-layer protection:
  1. **Atomic writes:** Clear + add merged into a single IndexedDB transaction
  2. **Write mutex:** Promise-chain serialization ensures all `saveBooksToIndexedDB` calls queue behind each other
  3. **Operation guard:** `dataOpInProgressRef` blocks overlapping import/restore/delete/device-state operations

#### Mar 10, 2026 — 272 homeless books discovered (current)
- **Symptom:** 272 books in IndexedDB with `isDeleted=false` have no folder membership. They appear in "All Books" but not in any folder. All are wishlist-only books.
- **Cause:** Historical accumulation from two separate gaps:
  1. Books wishlisted before v4.18.0.a (orphan wishlist preservation) were subject to periodic wipe on import — they existed in IndexedDB intermittently but never in a folder because no Inbox placement logic existed yet
  2. When Inbox placement logic was added in v6.0.0-alpha.53, it was implemented as a `useEffect` collector (moved any book not in a folder to Inbox automatically). This collector was later **removed** because it interfered with legitimate operations. Books that never passed through `importFromRelay` during the window when the collector was active never got assigned.
- **Impact:** The books are present and browsable in "All Books" but cannot be reached by navigating the folder tree
- **Pending fix:** Auto-place in Inbox on load (see Section 3)

---

## 2. Root Causes (Cross-Cutting)

Looking across all incidents, four structural weaknesses appear repeatedly:

### 2.1 No write serialization
Multiple callers could invoke `saveBooksToIndexedDB` simultaneously. Each call: clear store → write books. Two interleaved calls = second clear destroys first write. Fixed in v6.3.0 with mutex + atomic transaction.

### 2.2 No operation-level locking
High-level operations (import, backup restore, permanent delete) had no awareness of each other. A user or background timer could trigger two simultaneously. Fixed in v6.3.0 with `dataOpInProgressRef`.

### 2.3 No invariant checking
The app has several structural invariants:
- Every non-deleted book must be in at least one folder
- Every `bookId` in a folder must correspond to an existing book
- No ASIN should appear more than once in the library

These invariants were never checked. Violations accumulated silently and were only discovered when the user noticed something wrong. By that point, the cause was unknown.

### 2.4 No crash/corruption telemetry
When something went wrong, no signal was sent anywhere. Development relied on the developer's own library to catch issues. Other users would have experienced the same bugs silently with no way to report them or for the developer to know.

---

## 3. Proposed: Data Integrity Checking System

### 3.1 Goals
- Detect invariant violations as early as possible, before they become user-visible
- Fix unambiguous violations automatically and silently (no user action required)
- Inform the user after fixing so they know what happened and what was affected
- Collect anonymous telemetry so multi-user incidents surface even if only one user notices
- Never block app startup or normal operation

### 3.2 Invariants to Check

| Check | Invariant | Auto-fixable? |
|-------|-----------|---------------|
| Homeless books | Every non-deleted book appears in at least one folder's `bookIds` | Yes — add to Inbox |
| Ghost folder references | Every `bookId` in every folder corresponds to a real, non-deleted book in IndexedDB | Yes — remove stale ref |
| Duplicate books | No ASIN appears more than once in IndexedDB (excluding deleted) | Partial — requires user choice |
| Orphan trash refs | No `bookId` for a `isDeleted=true` book appears in a non-Trash folder | Yes — remove stale ref |
| Duplicate refs in folder | Same `bookId` listed twice within one folder's `bookIds` array | Yes — deduplicate |
| Corrupted book objects | Book missing required fields: `id`, `asin`, `title` | No — quarantine |

### 3.3 When to Run

| Trigger | Checks to run |
|---------|--------------|
| App load (after IndexedDB + folder load) | All checks |
| After `importFromRelay` completes | All checks |
| After backup restore completes | All checks |
| After `permanentlyDeleteBooks` completes | Ghost refs, orphan trash refs |

Do NOT run during in-progress operations — always run in `finally` blocks or after awaiting completion.

### 3.4 How to Surface Results

**Auto-fixed violations:**
- Fix silently (no user-blocking dialog)
- Show a toast after load/import if anything was fixed: *"3 books placed in Inbox (library repair)"*
- Toast links to Data Status where the full list is shown with titles

**Non-auto-fixable violations (duplicates, corrupted objects):**
- Show count badge on Data Status menu item (the status ball already exists for relay health)
- User opens Data Status and sees an "Issues Found" section with details and resolution UI
- Do not force the user to resolve before continuing — they can use the app normally

**No violations:**
- No toast, no badge — silence is the normal state

### 3.5 Telemetry (goatcounter)

Fire a single event per app session if any violations are detected. Fire once per session only — not on every load.

Event names:
- `integrity-homeless` — homeless books found
- `integrity-ghost-ref` — ghost folder references found
- `integrity-duplicate` — duplicate ASINs found
- `integrity-orphan-trash-ref` — trash refs in active folders found
- `integrity-duplicate-ref` — duplicate bookIds within a folder found
- `integrity-corrupted-book` — book missing required fields found

Payload: `{ count: N, version: "6.3.0" }` — never book titles or ASINs (privacy).

### 3.6 Implementation Sketch

```javascript
// Run after data load. Returns { fixed: [], needsReview: [] }
const checkDataIntegrity = async (books, folders) => {
    const issues = { fixed: [], needsReview: [] };
    const bookMap = new Map(books.filter(b => !b.isDeleted).map(b => [b.id, b]));
    const referencedIds = new Set(folders.flatMap(f => f.bookIds || []));

    // 1. Homeless books → auto-fix: add to Inbox
    const homeless = [...bookMap.values()].filter(b => !referencedIds.has(b.id));
    if (homeless.length > 0) {
        // Prepend to Inbox bookIds
        issues.fixed.push({ type: 'homeless', books: homeless });
    }

    // 2. Ghost folder references → auto-fix: remove from folder
    for (const folder of folders) {
        const ghosts = (folder.bookIds || []).filter(id => !bookMap.has(id));
        if (ghosts.length > 0) {
            issues.fixed.push({ type: 'ghost-ref', folder, ids: ghosts });
        }
    }

    // 3. Duplicate refs within a folder → auto-fix: deduplicate
    for (const folder of folders) {
        const seen = new Set();
        const dupes = (folder.bookIds || []).filter(id => {
            if (seen.has(id)) return true;
            seen.add(id);
            return false;
        });
        if (dupes.length > 0) {
            issues.fixed.push({ type: 'duplicate-ref', folder, ids: dupes });
        }
    }

    // 4. Duplicate books (same ASIN, multiple IndexedDB entries) → needs user review
    const asinCounts = {};
    for (const book of bookMap.values()) {
        asinCounts[book.asin] = (asinCounts[book.asin] || 0) + 1;
    }
    const duplicateAsins = Object.entries(asinCounts).filter(([, c]) => c > 1).map(([asin]) => asin);
    if (duplicateAsins.length > 0) {
        issues.needsReview.push({ type: 'duplicate-asin', asins: duplicateAsins });
    }

    // 5. Corrupted books (missing required fields) → needs review
    const corrupted = books.filter(b => !b.id || !b.asin || !b.title);
    if (corrupted.length > 0) {
        issues.needsReview.push({ type: 'corrupted', books: corrupted });
    }

    return issues;
};
```

### 3.7 Data Status Display

Add an "Integrity" section to the Data Status dialog (currently shows: Relay status, Library size, Duplicates):

```
─────────────────────────────────────────────
Library Integrity                    ✅ Clean
─────────────────────────────────────────────
Last checked: Today at 11:49 AM

  ─ or, if issues exist ─

Library Integrity                    ⚠️ 3 issues
─────────────────────────────────────────────
Last checked: Today at 11:49 AM

  Auto-fixed on load:
  • 3 books placed in Inbox (were in no folder)
    – Storm Front
    – Fool Moon
    – Grave Peril

  Needs review:
  • 2 duplicate books  [Review →]
```

The book list for homeless/fixed issues uses the same cover+title card style as the existing Duplicate Review dialog.

---

## 4. Immediate Fix: 272 Homeless Books (v6.3.0)

Independent of the full integrity system, the 272 currently-homeless books should be fixed in the next release.

**Approach:** On load, after `loadBooksFromIndexedDB` + folder load, detect homeless books and prepend to Inbox automatically. Save updated folders. Show toast: *"N books found with no folder — placed in Inbox."*

This is a one-time repair for historical debt. Going forward, the integrity check system prevents recurrence.

---

## 5. What's NOT in Scope (This Version)

- **Cross-device integrity:** Each device checks its own local data only. Relay conflicts are a separate problem.
- **History/audit log:** What changed and when. Would require event sourcing — too heavy.
- **Automatic duplicate resolution:** Duplicates require user judgment (which title/metadata to keep, which folder assignments to merge). The existing resolution UI handles this.
- **Integrity checks in background workers:** Runs synchronously on load; no need for a worker given the data sizes involved.

---

## 6. Files Affected

| File | Change |
|------|--------|
| `readerwrangler.js` | Add `checkDataIntegrity()` call in app load flow and post-import/restore; add integrity results to Data Status render; add toast on auto-fix |
| `storage.js` or new `integrity.js` | Implement `checkDataIntegrity()` function |
| `readerwrangler.js` Data Status section | Add Integrity section to existing modal |

---

## 7. Decisions

1. **Where does `checkDataIntegrity` live?** Separate `integrity.js` module. Implementation is ~80–100 lines with fixes, localStorage save, and goatcounter — too large for `storage.js`.
2. **Toast or dialog for auto-fixes?** Toast (non-blocking, per project convention) linking to Data Status for the full book list.
3. **Result persistence:** Results are saved to localStorage and **replaced** on each completed check run. Behavior:
   - Check completes, issues found → stored results replaced with new findings
   - Check completes, no issues → stored results cleared (shown as "✅ Clean")
   - Check throws before completing → previous results kept unchanged (no data loss on transient errors)
   - Each import/load triggers a fresh check; results are not accumulated across runs
4. **Save to localStorage:** Yes — `integrity-results` key stores last check timestamp + findings so they survive reload.
