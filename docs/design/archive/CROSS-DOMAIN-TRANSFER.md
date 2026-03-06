# Cross-Domain Data Transfer Design

## Problem Statement

ReaderWrangler's bookmarklet fetchers run on `amazon.com` and produce a `amazon-library.json` file (~42MB for 2,300 books). The app runs on `readerwrangler.com`. The browser's same-origin policy prevents direct data sharing between these domains.

The current solution uses the filesystem as a shared medium: the bookmarklet writes a file to disk, then the user opens that file in the app. This works but requires multiple file picker interactions per session.

### Current User Interaction Count

| Scenario | File Picker Touches | Notes |
|----------|-------------------|-------|
| First fetch ever | 2 | Save (bookmarklet) + Open (app) |
| Re-fetch (update library) | 2 | Select existing file (bookmarklet) + Open (app) |
| Collections fetch | 2 | Select file + Save + Open in app |
| Import in app | 1 | Open file each time |
| Backup/Restore | 1-2 | Save or open backup file |

Each fetcher run requires the user to interact with the file picker at least twice (once on amazon.com to save, once on readerwrangler.com to load). With multiple fetcher types (library, collections, wishlist, bibliography, series), a complete data refresh means 5+ file picker round-trips.

### Why the File Picker Feels Heavy

1. **Bookmarklet side**: After a multi-minute fetch, the original user gesture has expired. A "Save Library File" button provides a fresh gesture for `createWritable()`. The user must click this button every time.
2. **App side**: Each import requires opening a file picker, navigating to Downloads, and selecting `amazon-library.json`.
3. **Handle expiration**: File System Access API handles are stored in memory only. They expire when the tab closes, so the next session starts fresh.
4. **No cross-domain handle sharing**: FSAA handles are origin-scoped. A handle obtained on `amazon.com` cannot be transferred to `readerwrangler.com`.

---

## Current Architecture

### Bookmarklet Save Mechanism (Three-Path)

All five fetchers share identical save logic:

```
Path A: File System Access API + existing handle
  → fileHandle.createWritable() → write JSON → close
  (Requires fresh user gesture via "Save Library File" button)

Path B: File System Access API + new file
  → showSaveFilePicker() → createWritable() → write → close
  (Used on first run when no handle exists)

Path C: Blob download fallback (Firefox/Safari)
  → new Blob() → URL.createObjectURL() → <a>.click()
  (Traditional download, may append "(1)" to filename)
```

### App Import Mechanism

The app uses a standard `<input type="file">` to let the user select `amazon-library.json`. The file is read with `FileReader`, parsed, and merged into IndexedDB.

### Fetcher Scripts

| Script | Purpose | Lines |
|--------|---------|-------|
| `amazon-library-fetcher.js` | Core library (4-phase) | 2,407 |
| `amazon-collections-fetcher.js` | Collections + read status | 970 |
| `amazon-wishlist-fetcher.js` | Single book wishlist add | 883 |
| `author-bibliography-fetcher.js` | Bulk author import | 1,127 |
| `series-page-fetcher.js` | Series import with gap detection | 845 |
| `bookmarklet-nav-hub.js` | Router/coordinator | 310 |

All write to the same `amazon-library.json` (schema v2.1). Each manages its own file handle independently — no cross-fetcher handle coordination.

---

## Approach 1: File Picker (Current — Status Quo)

### How It Works
Bookmarklet writes file to disk via FSAA or Blob download. User manually opens file in the app via `<input type="file">`.

### Pros
- **Zero infrastructure**: No servers, accounts, or third-party dependencies
- **Complete privacy**: Data never leaves the user's device
- **Works offline**: No network dependency beyond initial page load
- **No maintenance**: Nothing to deploy, monitor, or pay for
- **Universal**: Works on any browser (FSAA or Blob fallback)

### Cons
- **High friction**: 2+ file picker interactions per fetch cycle
- **Handle expiration**: FSAA handles live in memory only; lost on tab close
- **No automation**: Every import is manual
- **Error-prone**: Users may select wrong file, or browser appends "(1)" to filename
- **Cross-domain wall**: Cannot share file handles between origins

### Friction Score: HIGH (2+ file picker dialogs per cycle)

---

## Approach 2: App-Side FSAA Enhancement

### How It Works
Store a persistent file handle in the app's IndexedDB. On subsequent imports, skip the file picker entirely — read directly from the stored handle (with permission re-prompt on new session).

### Changes Required
- **App only** — no bookmarklet changes
- Store `FileSystemFileHandle` in IndexedDB after first import
- On "Import Library", check for stored handle first
- If handle exists: `handle.requestPermission()` → `handle.getFile()` → read
- If permission denied or handle stale: fall back to file picker

### Limitation
This only helps the **app side** (readerwrangler.com). The bookmarklet side (amazon.com) still requires a file picker interaction to save. It reduces total touches from 2 to 1 per cycle — meaningful but doesn't eliminate the cross-domain problem.

### Pros
- **No infrastructure**: Still fully local
- **Simple implementation**: ~30 lines of code in app
- **Privacy preserved**: Data stays on device
- **Incremental**: Can combine with any other approach

### Cons
- **Only halves the problem**: Bookmarklet save still requires file picker
- **Permission re-prompt**: Browser asks "Allow readerwrangler.com to read this file?" on new sessions
- **Chrome/Edge only**: FSAA not available in Firefox/Safari
- **Handle can go stale**: If user moves/deletes the file, handle breaks

### Friction Score: MEDIUM (1 file picker on bookmarklet side + 1 permission prompt on app side)

---

## Approach 3: Popup postMessage

### How It Works
The bookmarklet opens a popup window to `readerwrangler.com/relay-receiver.html`. After fetching data, it sends the JSON via `window.postMessage()` to the popup. The popup writes it directly to the app's IndexedDB.

### Sequence
```
1. Bookmarklet opens: window.open('https://readerwrangler.com/relay-receiver.html')
2. Popup loads, sends "ready" message back
3. Bookmarklet fetches data on amazon.com
4. Bookmarklet calls: popup.postMessage(jsonData, 'https://readerwrangler.com')
5. Popup receives data, writes to IndexedDB
6. Popup shows "Import complete" and closes
```

### Pros
- **Zero infrastructure**: No servers or accounts
- **Complete privacy**: Data transfers directly between tabs in the same browser
- **No file picker**: Eliminates file system entirely
- **Works immediately**: No setup, no channel IDs, no passphrases
- **Same-session guarantee**: Data arrives in real-time

### Cons
- **Popup blockers**: Many users have popup blockers enabled; bookmarklet-opened popups may be blocked
- **Popup must stay open**: If user closes the popup during the 3-10 minute fetch, data is lost
- **Browser memory**: Transferring 42MB via postMessage creates a copy in memory (84MB peak)
- **One popup per fetcher**: Each fetcher run needs its own popup session
- **Tab management**: User has an extra tab/window to manage during fetch
- **No deferred import**: Data must be consumed immediately — can't fetch now, import later
- **Structured clone overhead**: `postMessage` uses structured clone algorithm; 42MB takes 1-3 seconds to serialize

### Variant: Chunked postMessage
Send data in 5MB chunks to reduce peak memory. Adds complexity but solves the memory spike.

### Friction Score: LOW (one popup open per fetch cycle, no file picker)

---

## Approach 4: Cloudflare Worker Relay

### How It Works
A Cloudflare Worker (~80 lines) acts as a transfer buffer. The bookmarklet POSTs compressed (and optionally encrypted) data to the Worker. The app GETs it from the Worker. Both sides talk to the Worker's domain via standard HTTP — cross-origin isolation is eliminated.

### Architecture
```
amazon.com (bookmarklet)          Cloudflare Worker           readerwrangler.com
       |                     (readerwrangler-relay.workers.dev)        |
       |                                                              |
       |--- POST /upload/chunk/0 -------->|                           |
       |--- POST /upload/manifest ------->|                           |
       |                                  |                           |
       |                                  |<--- GET /status ----------|
       |                                  |<--- GET /download/0 ------|
       |                                  |<--- DELETE /cleanup ------|
```

### Data Pipeline
```
Source: JSON (42MB) → gzip compress (~14MB) → optional AES-256-GCM encrypt → chunk at 20MB → upload
Sink:   download chunks → reassemble → verify SHA-256 → decrypt → decompress → JSON (42MB)
```

### Compression Reality Check
| Format | 42MB library | Notes |
|--------|-------------|-------|
| zip | ~14MB | User-measured actual value |
| 7-Zip (LZMA2) | ~10MB | User-measured actual value |
| Browser gzip (CompressionStream) | ~14MB | gzip ≈ zip compression ratio |

The claude.ai design doc estimated 5-8MB — this was too optimistic. **14MB is the realistic browser gzip figure.** Still well under the 25MB KV value limit for a single chunk at current library size.

### Chunking Threshold
| Library Size | Raw | Compressed (gzip) | Chunks Needed |
|-------------|-----|-------------------|---------------|
| 2,500 books | 42MB | ~14MB | 1 |
| 5,000 books | ~84MB | ~28MB | 2 |
| 7,500 books | ~126MB | ~42MB | 3 |

Chunking is needed at ~3,700+ books (when compressed size exceeds 20MB chunk limit). The implementation should support chunking from day one since it's trivial and future-proofs the design.

### One-Time Setup
1. User enables "Relay Transfer" in app Settings
2. App generates UUID channel ID, stores in localStorage
3. User copies channel ID to bookmarklet config (paste once)
4. Optional: set shared encryption passphrase on both sides

### Daily Use (After Setup)
**Bookmarklet side**: Fetcher completes → auto-uploads to relay (no file picker, no button click needed beyond existing "Save" button which could become "Upload")

**App side**: On page load, app checks relay for new data → banner: "New data available (2,347 books) [Import] [Dismiss]" → user clicks Import → done. Zero file pickers.

### Security Layers
1. **Channel ID** (UUID): 122 bits of entropy — unguessable without sharing
2. **Client-side encryption** (optional): AES-256-GCM with PBKDF2 key derivation; Worker only sees ciphertext
3. **Auto-expiration**: KV entries TTL = 24 hours; data self-destructs
4. **CORS lockdown**: Worker only accepts requests from `amazon.com` and `readerwrangler.com`
5. **Explicit cleanup**: App DELETEs data from relay after successful download

### Cost Analysis (Cloudflare Free Tier)
| Tier Limits | Free |
|------------|------|
| KV reads/day | 100,000 |
| KV writes/day | 1,000 |
| Worker requests/day | 100,000 |

| Users | Usage Pattern | KV Reads/Day | KV Writes/Day | Within Free Tier? |
|-------|--------------|-------------|---------------|-------------------|
| 10 | Weekly imports | ~20 | ~4 | Yes |
| 100 | Weekly imports | ~200 | ~40 | Yes |
| 1,000 | Weekly imports | ~2,000 | ~400 | Yes |
| 1,000 | Daily + polling | ~290,000 | ~2,000 | No |

Realistic assessment: **Free tier is sufficient** for any plausible user base. Only aggressive polling at 1,000+ daily users would exceed limits.

### Implementation Scope

**New code:**
- `relay-worker.js` (~80 lines) — Cloudflare Worker
- `wrangler.toml` — Worker config
- Source module (~100 lines) — compress/encrypt/chunk/upload in bookmarklet
- Sink module (~100 lines) — download/verify/decrypt/decompress in app
- Settings UI additions — channel ID, passphrase, transfer mode toggle

**Modified code:**
- All 5 fetcher save functions — add relay upload path alongside existing file save
- App import flow — add relay check on load, "Check for updates" button
- Settings panel — new "Data Transfer" section

### Pros
- **Zero-touch daily use**: After one-time setup, no file pickers ever
- **Decoupled timing**: Fetch now, import later (within 24 hours)
- **Works across devices**: Could theoretically fetch on one machine, import on another
- **Compression**: 42MB → 14MB reduces transfer time and bandwidth
- **Optional encryption**: Data can transit encrypted; Worker never sees plaintext
- **Free**: Cloudflare free tier covers realistic usage
- **Graceful fallback**: File picker remains available if relay is down

### Cons
- **Infrastructure dependency**: Requires Cloudflare account + Worker deployment
- **Data leaves device**: Even encrypted, data transits through third-party servers
- **Setup friction**: One-time channel ID copy between app and bookmarklet
- **Maintenance**: Worker needs monitoring; Cloudflare may change free tier terms
- **Encryption passphrase UX**: If required, adds friction; if optional, data transits in cleartext (behind UUID + CORS, but readable by Cloudflare)
- **Latency**: Upload + download adds network round-trips vs. instant local file
- **Complexity**: ~380 lines of new code across multiple files; new failure modes (network errors, Worker downtime, KV eventual consistency)

### Friction Score: VERY LOW (zero-touch after one-time setup)

---

## Approach 5: Hybrid — Relay + File Picker Choice

### How It Works
Offer both approaches as a user-configurable setting. Default to File Picker (privacy-first). Users who want less friction can opt into Relay Transfer.

### Settings UI
```
Data Transfer Method:
  ○ File Picker (default) — all data stays on your device
  ● Relay Transfer — automatic transfer via encrypted relay

[Channel ID: a1b2c3d4-...]  [Copy]
[Encryption Passphrase: ••••••]
```

### Bookmarklet Behavior
When relay is configured:
- After fetch completes, show: "Upload to relay? [Upload] [Save to file instead]"
- Or: auto-upload with a "Saved to relay" confirmation (less friction, less control)

When relay is not configured:
- Current file picker behavior (unchanged)

### App Behavior
When relay is configured:
- Check relay on page load
- Show banner if new data available
- "Import from file" still available as manual fallback

### Pros
- **User choice**: Privacy-conscious users keep file picker; convenience-oriented users get relay
- **No breaking changes**: Current users are unaffected
- **Graceful degradation**: Relay down → file picker still works
- **Progressive adoption**: Ship file picker improvements first, add relay later

### Cons
- **Two code paths to maintain**: Both file picker and relay logic need testing and bug fixes
- **Documentation complexity**: Need to explain both options clearly
- **Decision burden**: User must choose (though defaulting to file picker minimizes this)

---

## Comparison Matrix

| Criterion | File Picker (Current) | FSAA Enhancement | Popup postMessage | Cloudflare Relay | Hybrid |
|-----------|----------------------|-----------------|-------------------|-----------------|--------|
| **Daily friction** | HIGH (2+ dialogs) | MEDIUM (1 dialog + 1 prompt) | LOW (1 popup) | VERY LOW (zero-touch) | User's choice |
| **Privacy** | EXCELLENT | EXCELLENT | EXCELLENT | GOOD (data transits server) | User's choice |
| **Infrastructure** | None | None | None | Cloudflare account + Worker | Cloudflare account + Worker |
| **Setup effort** | None | None | None | Moderate (one-time) | Moderate (one-time for relay users) |
| **Implementation effort** | Done | Small (~30 LOC) | Medium (~200 LOC) | Large (~380 LOC + Worker) | Large (~400+ LOC) |
| **Maintenance** | None | None | None | Worker monitoring | Worker monitoring |
| **Offline support** | Yes | Yes | Yes | No (needs network) | File picker fallback |
| **Browser support** | All (with fallback) | Chrome/Edge only | All (popup blockers risk) | All | All |
| **Deferred import** | Yes (file on disk) | Yes (file on disk) | No (real-time only) | Yes (24-hour window) | Yes |
| **Cross-device** | No | No | No | Yes | Yes (relay mode) |
| **Failure modes** | File not found | Handle stale | Popup blocked/closed | Network, Worker down, KV | Both sets |

---

## Recommendation

### Short Term: Approach 2 (FSAA Enhancement)

**Do this first.** It's ~30 lines of code, zero infrastructure, and cuts the app-side friction in half. Every import after the first skips the file picker entirely (just a permission re-prompt on new sessions).

This is a quick win that improves the experience regardless of whether the relay is ever built.

### Medium Term: Approach 5 (Hybrid) — if launch validates demand

**Build the relay only after launch proves users want it.** The relay is the best UX solution, but it introduces infrastructure, maintenance, and complexity that may not be justified for a personal-use tool with a small user base.

Wait for signal:
- If users complain about file picker friction → build the relay
- If the app stays under ~50 active users → FSAA enhancement is sufficient
- If the app grows to 100+ users → relay pays for itself in reduced support burden

### What NOT to Build

**Popup postMessage**: It solves the cross-domain problem but introduces its own friction (popup blockers, tab management, real-time-only transfer). It's not clearly better than the file picker for most users, and the relay is strictly superior if infrastructure is acceptable.

### Implementation Priority

| Phase | Approach | Effort | Trigger |
|-------|----------|--------|---------|
| 1 | FSAA Enhancement (app-side stored handle) | Small | Now — easy win |
| 2 | Cloudflare Relay (opt-in, with file picker default) | Large | Post-launch, if user feedback warrants |
| 3 | Auto-import on relay (zero-touch) | Small | After relay proves stable |

### Privacy-First Default

Whichever approach is implemented, **File Picker should remain the default**. Users who want relay convenience can opt in. The privacy statement should clearly explain what each mode does:

```
File Picker (default): All data stays on your device. No servers involved.

Relay Transfer (opt-in): Data is compressed, encrypted with your passphrase,
and briefly held on a Cloudflare relay for transfer. Data auto-deletes after
24 hours or immediately after download. The relay never sees unencrypted data.
```

---

## Open Questions

1. **Should encryption be required or optional for relay?** Required = safer but adds passphrase management. Optional = simpler but data transits in cleartext (still behind UUID + CORS).

2. **Auto-import vs. manual import on relay?** Auto-import is zero-touch but removes the user's conscious decision to update. A banner with [Import] button is the safer UX.

3. **Should the bookmarklet auto-upload or ask?** Auto-upload after fetch is smoother. But if the user is debugging or testing, they may not want data pushed to relay. A setting ("Always upload to relay after fetch") with per-run override seems right.

4. **Relay fallback behavior**: If relay is down, should the bookmarklet silently fall back to file save, or show an error? Silent fallback is smoother; error is more transparent.

5. **Channel ID rotation**: Should users be able to rotate their channel ID? Useful if they suspect it's been compromised. Simple to implement (generate new UUID, update both sides).

---

## Appendix: Relay Worker Reference Implementation

See `C:\Users\Ron\Downloads\relay-transfer-design.md` for the full claude.ai-generated relay Worker code, source/sink modules, and deployment steps. Key corrections to that document:

- **Compression ratio**: Document estimates 5-8MB for 42MB library. Actual measurement: **14MB (gzip/zip), 10MB (7-Zip)**. Browser `CompressionStream` uses gzip, so **14MB is the realistic figure**.
- **Chunking need**: Document says chunking unlikely at current scale. Confirmed — 14MB < 20MB chunk size. But chunking will be needed at ~3,700+ books.
- **bookCount field in manifest**: Document uses `JSON.parse(jsonString).length`. The library JSON structure is `{ books: [...], metadata: {...} }`, not a bare array. Should be `JSON.parse(jsonString).books?.length || 0`.
