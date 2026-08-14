/**
 * ReaderWrangler Relay Client
 * Upload/download orchestration for the Cloudflare relay.
 * Used by both the bookmarklet (amazon.com) and the app (readerwrangler.com).
 *
 * Dependencies: window.RWCrypto, window.RWCompress
 * Global: window.RWRelay
 */

(function() {
  'use strict';

  const WORKER_URL = 'https://readerwrangler-relay.readerwrangler.workers.dev';
  const CHUNK_SIZE = 20 * 1024 * 1024; // 20 MB per chunk (under 25 MB KV limit)
  const RELAY_STORAGE_KEY = 'readerwrangler-relay';

  // v6.17.1 - Recovery steps surfaced when the synced (relay) copy fails its integrity check (almost always a
  // browser tab closed mid-sync). SINGLE SOURCE OF TRUTH: the checksum error carries this text (so a fetcher's
  // error overlay shows it), and the app reads window.RW_RECOVERY_STEPS to render a dialog with a Copy button.
  const RECOVERY_NUMBERED =
    '1. SAVE A BACKUP — in your ReaderWrangler tab: File → Save Backup…\n' +
    '2. DOWNLOAD LIBRARY — in a NEW browser tab, click your ReaderWrangler bookmarklet →\n' +
    '   “Go to Amazon Library Page”, then the bookmarklet again → “Download Library”.\n' +
    '3. DOWNLOAD COLLECTIONS — in that tab (or a second new one), click the bookmarklet →\n' +
    '   “Go to Amazon Collections Page”, then → “Download Collections”.\n' +
    '   (Separate step; the library download doesn’t include collections.)\n' +
    '4. IMPORT — back in your ReaderWrangler tab, the File menu turns red (“Update available”)\n' +
    '   → File → Import from Relay.';
  const RECOVERY_STEPS =
    'Your library is safe on the ReaderWrangler device — this only affects the synced (cloud) copy.\n' +
    'Keep your ReaderWrangler tab open (it’s slow to reload). Do ALL of these, in order:\n\n' + RECOVERY_NUMBERED;
  if (typeof window !== 'undefined') {
    window.RW_RECOVERY_STEPS = RECOVERY_STEPS;       // full text — fetcher overlay + the Copy button
    window.RW_RECOVERY_NUMBERED = RECOVERY_NUMBERED; // just the steps — app dialog block (reassurance shown above it)
  }

  let _channelId = null;
  let _passphrase = null;
  let _cryptoKey = null; // Cached after first derivation

  // Worker URL override for dev/testing (set window._RW_RELAY_WORKER_URL before load/use).
  function workerUrl() {
    return (typeof window !== 'undefined' && window._RW_RELAY_WORKER_URL) || WORKER_URL;
  }

  // --- Shared packing pipeline (legacy + Phase 1 paths) ---

  async function checksumOf(bufferOrView) {
    const buf = bufferOrView instanceof ArrayBuffer ? bufferOrView : bufferOrView.buffer;
    const hashArray = new Uint8Array(await crypto.subtle.digest('SHA-256', buf));
    return 'sha256:' + Array.from(hashArray).map(b => b.toString(16).padStart(2, '0')).join('');
  }

  /** compress → encrypt; returns Uint8Array of encrypted bytes */
  async function pack(jsonString, notify) {
    (notify || (() => {}))('compressing', 'Compressing data...');
    const compressed = await window.RWCompress.compress(jsonString);
    (notify || (() => {}))('encrypting', 'Encrypting...');
    const key = await getKey();
    const encrypted = await window.RWCrypto.encryptPacked(key, compressed);
    return { bytes: new Uint8Array(encrypted), compressedBytes: compressed.byteLength };
  }

  /** decrypt → decompress; takes ArrayBuffer/Uint8Array of encrypted bytes, returns string */
  async function unpack(encrypted, notify) {
    (notify || (() => {}))('decrypting', 'Decrypting...');
    const key = await getKey();
    const buf = encrypted instanceof ArrayBuffer ? encrypted : encrypted.buffer;
    const compressed = await window.RWCrypto.decryptPacked(key, buf);
    (notify || (() => {}))('decompressing', 'Decompressing...');
    return window.RWCompress.decompress(compressed);
  }

  /**
   * Initialize from bookmarklet globals (amazon.com context).
   * Bookmarklet sets window._RW_RELAY_CHANNEL and window._RW_RELAY_PASSPHRASE.
   */
  function initFromGlobals() {
    _channelId = window._RW_RELAY_CHANNEL || null;
    _passphrase = window._RW_RELAY_PASSPHRASE || null;
    _cryptoKey = null;
  }

  /**
   * Initialize from localStorage (app context).
   * Reads channelId and passphrase from the relay storage key.
   */
  function initFromStorage() {
    try {
      const stored = JSON.parse(localStorage.getItem(RELAY_STORAGE_KEY));
      if (stored) {
        _channelId = stored.channelId || null;
        _passphrase = stored.passphrase || null;
      }
    } catch {
      _channelId = null;
      _passphrase = null;
    }
    _cryptoKey = null;
  }

  /**
   * Check if relay credentials are configured.
   */
  function isConfigured() {
    return !!_channelId && !!_passphrase;
  }

  /**
   * Get the current channel ID (for UI display).
   */
  function getChannelId() {
    return _channelId;
  }

  /**
   * Get or derive the crypto key (cached after first call).
   */
  async function getKey() {
    if (!_cryptoKey) {
      if (!_channelId || !_passphrase) throw new Error('Relay not configured');
      _cryptoKey = await window.RWCrypto.deriveKey(_passphrase, _channelId);
    }
    return _cryptoKey;
  }

  /**
   * Upload library JSON to relay.
   * Compresses, encrypts, chunks, and uploads to the Worker.
   * @param {string} jsonString - The library JSON string to upload
   * @param {function} onProgress - Optional callback: (phase, detail) => void
   * @returns {object} The manifest object
   */
  async function upload(jsonString, onProgress) {
    if (!isConfigured()) throw new Error('Relay not configured');
    const notify = onProgress || (() => {});

    // Count books for manifest
    let bookCount = 0;
    try {
      const parsed = JSON.parse(jsonString);
      // Handle both array format and object-with-bookItems format
      if (Array.isArray(parsed)) {
        bookCount = parsed.length;
      } else if (parsed.bookItems) {
        bookCount = parsed.bookItems.length;
      } else if (parsed.library && parsed.library.bookItems) {
        bookCount = parsed.library.bookItems.length;
      }
    } catch { /* ignore parse errors for count */ }

    const totalBytes = new TextEncoder().encode(jsonString).length;

    // Steps 1-2: Compress + encrypt (shared pipeline)
    const packed = await pack(jsonString, notify);
    const compressedBytes = packed.compressedBytes;

    // Step 3: Chunk and upload
    const encryptedArray = packed.bytes;
    const chunkCount = Math.ceil(encryptedArray.length / CHUNK_SIZE);

    for (let i = 0; i < chunkCount; i++) {
      const start = i * CHUNK_SIZE;
      const end = Math.min(start + CHUNK_SIZE, encryptedArray.length);
      const chunk = encryptedArray.slice(start, end);

      notify('uploading', `Uploading chunk ${i + 1} of ${chunkCount}...`);

      const response = await fetch(`${workerUrl()}/upload/${_channelId}/chunk/${i}`, {
        method: 'POST',
        body: chunk.buffer
      });

      if (!response.ok) {
        const err = await response.text();
        throw new Error(`Chunk ${i} upload failed: ${err}`);
      }
    }

    // Step 4: Compute checksum of encrypted data
    const checksum = await checksumOf(encryptedArray);

    // Step 5: Upload manifest (plaintext — app reads without decrypting)
    const manifest = {
      channelId: _channelId,
      chunkCount: chunkCount,
      totalBytes: totalBytes,
      compressedBytes: compressedBytes,
      encryptedBytes: encryptedArray.length,
      timestamp: new Date().toISOString(),
      checksum: checksum,
      encrypted: true,
      bookCount: bookCount
    };

    notify('finalizing', 'Uploading manifest...');

    const manifestResponse = await fetch(`${workerUrl()}/upload/${_channelId}/manifest`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(manifest)
    });

    if (!manifestResponse.ok) {
      throw new Error('Manifest upload failed: ' + await manifestResponse.text());
    }

    notify('complete', `Uploaded ${bookCount} books`);
    return manifest;
  }

  /**
   * Check if library data is available on the relay.
   * @returns {object|null} The manifest if data is available, null otherwise
   */
  async function checkStatus() {
    if (!isConfigured()) return null;

    const response = await fetch(`${workerUrl()}/status/${_channelId}`);
    if (response.status === 404) return null;
    if (!response.ok) {
      const err = new Error(response.status === 403 ? 'Channel revoked' : 'Status check failed');
      err.status = response.status;
      throw err;
    }

    return response.json();
  }

  /**
   * Download library JSON from relay.
   * Downloads chunks, reassembles, decrypts, and decompresses.
   * @param {function} onProgress - Optional callback: (phase, detail) => void
   * @returns {string} The library JSON string
   */
  async function download(onProgress) {
    if (!isConfigured()) throw new Error('Relay not configured');
    const notify = onProgress || (() => {});

    // Step 1: Get manifest
    notify('checking', 'Checking relay...');
    const manifestResponse = await fetch(`${workerUrl()}/status/${_channelId}`);
    if (manifestResponse.status === 404) throw new Error('No data available on relay');
    if (!manifestResponse.ok) throw new Error('Failed to get manifest');

    const manifest = await manifestResponse.json();

    // Step 2: Download chunks
    const chunks = [];
    for (let i = 0; i < manifest.chunkCount; i++) {
      notify('downloading', `Downloading chunk ${i + 1} of ${manifest.chunkCount}...`);

      const chunkResponse = await fetch(`${workerUrl()}/download/${_channelId}/chunk/${i}`);
      if (!chunkResponse.ok) throw new Error(`Chunk ${i} download failed`);

      chunks.push(await chunkResponse.arrayBuffer());
    }

    // Step 3: Reassemble
    const totalLength = chunks.reduce((sum, c) => sum + c.byteLength, 0);
    const encrypted = new Uint8Array(totalLength);
    let offset = 0;
    for (const chunk of chunks) {
      encrypted.set(new Uint8Array(chunk), offset);
      offset += chunk.byteLength;
    }

    // Step 4: Verify checksum
    if (manifest.checksum) {
      notify('verifying', 'Verifying integrity...');
      const computed = await checksumOf(encrypted);

      if (computed !== manifest.checksum) {
        // v6.17.1 - Carry the recovery steps on the error so any display (fetcher overlay, app) shows what to do;
        // isCorruption lets the app catch it specifically and render the dialog + Copy button.
        const err = new Error('Sync data check failed (checksum mismatch) — the synced copy may be corrupted.\n\n' + RECOVERY_STEPS);
        err.isCorruption = true;
        throw err;
      }
    }

    // Steps 5-6: Decrypt + decompress (shared pipeline)
    const jsonString = await unpack(encrypted, notify);

    notify('complete', `Downloaded ${manifest.bookCount || '?'} books`);
    return jsonString;
  }

  /**
   * Delete ephemeral data (manifest + chunks) from relay after successful import.
   */
  async function cleanup() {
    if (!isConfigured()) return;

    const response = await fetch(`${workerUrl()}/cleanup/${_channelId}`, {
      method: 'DELETE'
    });

    if (!response.ok) {
      console.warn('Relay cleanup failed:', await response.text());
    }
  }

  /**
   * Get device state from relay (used by mobile on open).
   * @returns {string|null} Decrypted JSON string or null if none exists
   */
  async function getDeviceState() {
    if (!isConfigured()) return null;

    const response = await fetch(`${workerUrl()}/device-state/${_channelId}`);
    if (response.status === 404) return null;
    if (!response.ok) throw new Error('Failed to get device state');

    const encrypted = await response.arrayBuffer();
    const key = await getKey();
    const compressed = await window.RWCrypto.decryptPacked(key, encrypted);
    return window.RWCompress.decompress(compressed);
  }

  /**
   * Update device state on relay (used by app after successful import).
   * @param {string} jsonString - Full library state as JSON string
   */
  async function putDeviceState(jsonString) {
    if (!isConfigured()) throw new Error('Relay not configured');

    const compressed = await window.RWCompress.compress(jsonString);
    const key = await getKey();
    const encrypted = await window.RWCrypto.encryptPacked(key, compressed);

    const response = await fetch(`${workerUrl()}/device-state/${_channelId}`, {
      method: 'PUT',
      body: encrypted
    });

    if (!response.ok) {
      const err = new Error(response.status === 403 ? 'Channel revoked' : 'Failed to update device state');
      err.status = response.status;
      throw err;
    }
  }

  /**
   * Revoke the current channel — permanently deletes all relay data and blocklists the channelId.
   * Computes SHA-256(passphrase + channelId) as proof of ownership.
   * Clears local credentials after successful revocation.
   */
  async function revokeChannel() {
    if (!isConfigured()) throw new Error('Relay not configured');

    // Compute proof: SHA-256(passphrase + channelId)
    const proofData = new TextEncoder().encode(_passphrase + _channelId);
    const hashBuffer = await crypto.subtle.digest('SHA-256', proofData);
    const proof = Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');

    const response = await fetch(`${workerUrl()}/revoke/${_channelId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ proof })
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Revocation failed: ${err}`);
    }

    // Clear local state
    _channelId = null;
    _passphrase = null;
    _cryptoKey = null;
    localStorage.removeItem(RELAY_STORAGE_KEY);
  }

  // === Relay write redesign Phase 1: mailbox + generations + pointer ===
  // See docs/design/RELAY-WRITE-REDESIGN.md. Client-side halves of the invariants:
  //   - a run/generation is COMPLETE only if its manifest exists AND every part GETs AND
  //     the whole-payload checksum verifies (never trust a list — KV has no cross-key ordering)
  //   - the generation manifest carries absorbedRuns (a SET, never a scalar watermark)
  //   - readers take the pointer; on any failure fall back to newest complete generation,
  //     then to the legacy single-generation format
  //   - GC keeps the 2 newest complete generations, never the pointed one, 1h grace

  const LETTER_SIZE = 5 * 1024 * 1024;      // 5 MB per letter (batching rule — design H3)
  const INLINE_LETTER_MAX = 1 * 1024 * 1024; // encrypted payloads under this go as ONE self-committing letter
  const KEEP_GENS = 2;
  const GC_GRACE_MS = 60 * 60 * 1000;        // never GC a generation younger than 1h (design M2)
  const DEVICE_KEY = 'readerwrangler-relay-device';

  /** Stable per-browser device id (persisted where storage exists; ephemeral otherwise). */
  function deviceId() {
    let id = null;
    try { id = localStorage.getItem(DEVICE_KEY); } catch { /* no storage (rare) */ }
    if (!id) {
      id = 'd' + Array.from(crypto.getRandomValues(new Uint8Array(4)))
        .map(b => b.toString(16).padStart(2, '0')).join('');
      try { localStorage.setItem(DEVICE_KEY, id); } catch { /* ephemeral is fine */ }
    }
    return id;
  }

  function idTimestamp(mintedId) {
    return parseInt(String(mintedId).split('-')[0], 10) || 0;
  }

  function bytesToB64(bytes) {
    let bin = '';
    for (let i = 0; i < bytes.length; i += 0x8000) {
      bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
    }
    return btoa(bin);
  }

  function b64ToBytes(b64) {
    const bin = atob(b64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return bytes;
  }

  async function relayFetch(path, options) {
    const response = await fetch(`${workerUrl()}${path}`, options);
    if (!response.ok) {
      const err = new Error(`Relay ${options && options.method || 'GET'} ${path} failed: HTTP ${response.status} ${await response.text()}`);
      err.status = response.status;
      throw err;
    }
    return response;
  }

  /**
   * Write one run to the mailbox: pack the payload, split into ≤5MB letters, commit with a
   * run-manifest written LAST. Small payloads collapse to ONE self-committing inline letter.
   * @param {string} jsonString - the run's content (full book objects — never ASIN-only)
   * @param {string} kind - 'books' | 'collections' | 'wishlist-add' | 'tombstone' | 'reset'
   * @returns {object} { runId, seqCount, inline }
   */
  async function writeRun(jsonString, kind, onProgress, opts) {
    if (!isConfigured()) throw new Error('Relay not configured');
    const notify = onProgress || (() => {});
    const letterSize = (opts && opts.letterSize) || LETTER_SIZE;
    const inlineMax = (opts && opts.inlineMax != null) ? opts.inlineMax : INLINE_LETTER_MAX;
    const fetchDate = new Date().toISOString();

    const packed = await pack(jsonString, notify);
    const checksum = await checksumOf(packed.bytes);

    // Small payload → single self-committing letter (one atomic write, complete by definition)
    if (packed.bytes.length <= inlineMax) {
      notify('uploading', 'Sending...');
      const body = JSON.stringify({
        inline: true, kind, seqCount: 1, checksum, fetchDate,
        encryptedBytes: packed.bytes.length,
        payload: bytesToB64(packed.bytes)
      });
      const res = await relayFetch(`/mail/${_channelId}/letter?device=${deviceId()}`, { method: 'POST', body });
      const json = await res.json();
      notify('complete', 'Sent');
      return { runId: json.runId, seqCount: 1, inline: true };
    }

    // Multi-letter run: mint id, letters, manifest LAST (the commit)
    const mint = await relayFetch(`/mail/${_channelId}/run?device=${deviceId()}`, { method: 'POST' });
    const runId = (await mint.json()).runId;

    const seqCount = Math.ceil(packed.bytes.length / letterSize);
    for (let i = 0; i < seqCount; i++) {
      notify('uploading', `Sending part ${i + 1} of ${seqCount}...`);
      const part = packed.bytes.slice(i * letterSize, Math.min((i + 1) * letterSize, packed.bytes.length));
      await relayFetch(`/mail/${_channelId}/${runId}/letter/${i}`, { method: 'POST', body: part.buffer });
    }

    notify('finalizing', 'Committing...');
    await relayFetch(`/mail/${_channelId}/${runId}/manifest`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ runId, kind, seqCount, checksum, fetchDate, encryptedBytes: packed.bytes.length })
    });

    notify('complete', 'Sent');
    return { runId, seqCount, inline: false };
  }

  /**
   * Read the whole mailbox. Returns complete runs (decrypted) + ids of incomplete ones.
   * Completeness is proven by GETting every part — a run seen incomplete is "retry later",
   * NEVER "broken" (its producer may still be writing, or KV is still propagating).
   * @returns {object} { runs: [{runId, kind, fetchDate, timestamp, jsonString}], incomplete: [runId] }
   */
  async function readMailbox(onProgress) {
    if (!isConfigured()) throw new Error('Relay not configured');
    const notify = onProgress || (() => {});

    notify('checking', 'Checking mailbox...');
    const listRes = await relayFetch(`/mail/${_channelId}/list`);
    const keys = (await listRes.json()).keys; // "{runId}:{seq}" or "{runId}:manifest"

    const byRun = new Map();
    for (const k of keys) {
      const sep = k.lastIndexOf(':');
      const runId = k.slice(0, sep), part = k.slice(sep + 1);
      if (!byRun.has(runId)) byRun.set(runId, { seqs: new Set(), hasManifest: false });
      if (part === 'manifest') byRun.get(runId).hasManifest = true;
      else byRun.get(runId).seqs.add(parseInt(part, 10));
    }

    const runs = [], incomplete = [];
    for (const [runId, info] of byRun) {
      try {
        if (info.hasManifest) {
          // Multi-letter run: manifest → parts → verify → unpack
          const manifest = await (await relayFetch(`/mail/${_channelId}/${runId}/manifest`)).json();
          const parts = [];
          for (let i = 0; i < manifest.seqCount; i++) {
            const r = await fetch(`${workerUrl()}/mail/${_channelId}/${runId}/letter/${i}`);
            if (!r.ok) throw new Error('part missing');
            parts.push(new Uint8Array(await r.arrayBuffer()));
          }
          const total = parts.reduce((s, p) => s + p.length, 0);
          const bytes = new Uint8Array(total);
          let off = 0;
          for (const p of parts) { bytes.set(p, off); off += p.length; }
          if (manifest.checksum && await checksumOf(bytes) !== manifest.checksum) throw new Error('checksum mismatch');
          runs.push({ runId, kind: manifest.kind, fetchDate: manifest.fetchDate,
                      timestamp: idTimestamp(runId), jsonString: await unpack(bytes) });
        } else if (info.seqs.has(0) && info.seqs.size === 1) {
          // Possible inline single letter (self-committing; stored as JSON at seq 0)
          const r = await fetch(`${workerUrl()}/mail/${_channelId}/${runId}/letter/0`);
          if (!r.ok) throw new Error('letter missing');
          const letter = JSON.parse(await r.text());
          if (!letter.inline) throw new Error('not inline'); // letters of an uncommitted multi-run
          const bytes = b64ToBytes(letter.payload);
          if (letter.checksum && await checksumOf(bytes) !== letter.checksum) throw new Error('checksum mismatch');
          runs.push({ runId, kind: letter.kind, fetchDate: letter.fetchDate,
                      timestamp: idTimestamp(runId), jsonString: await unpack(bytes) });
        } else {
          throw new Error('no manifest'); // letters exist but run not committed
        }
      } catch {
        incomplete.push(runId); // retry on a later read — never mark dead
      }
    }

    runs.sort((a, b) => a.timestamp - b.timestamp); // oldest first (merge in arrival order)
    notify('complete', `${runs.length} run${runs.length !== 1 ? 's' : ''} in mailbox`);
    return { runs, incomplete };
  }

  /** Filter mailbox runs down to those NOT absorbed by the given generation manifest. */
  function unabsorbedRuns(runs, genManifest) {
    const absorbed = new Set((genManifest && genManifest.absorbedRuns) || []);
    return runs.filter(r => !absorbed.has(r.runId));
  }

  /**
   * Read the current canonical library.
   * Pointer → verify → fall back to newest complete generation → fall back to legacy format.
   * @returns {object|null} { jsonString, gen, manifest, source } — source: 'pointer'|'fallback'|'legacy';
   *   null when the channel has no canonical at all (cold start).
   */
  async function readCanonical(onProgress) {
    if (!isConfigured()) throw new Error('Relay not configured');
    const notify = onProgress || (() => {});

    const tryGen = async (gen) => {
      const manifest = await (await relayFetch(`/gen/${_channelId}/${gen}/manifest`)).json();
      const parts = [];
      for (let i = 0; i < manifest.chunkCount; i++) {
        notify('downloading', `Downloading part ${i + 1} of ${manifest.chunkCount}...`);
        const r = await fetch(`${workerUrl()}/gen/${_channelId}/${gen}/chunk/${i}`);
        if (!r.ok) throw new Error(`chunk ${i} missing`);
        parts.push(new Uint8Array(await r.arrayBuffer()));
      }
      const total = parts.reduce((s, p) => s + p.length, 0);
      const bytes = new Uint8Array(total);
      let off = 0;
      for (const p of parts) { bytes.set(p, off); off += p.length; }
      notify('verifying', 'Verifying integrity...');
      if (manifest.checksum && await checksumOf(bytes) !== manifest.checksum) throw new Error('checksum mismatch');
      return { jsonString: await unpack(bytes, notify), gen, manifest };
    };

    // 1. Pointer (the hot path — no list op)
    notify('checking', 'Checking relay...');
    let pointedGen = null;
    try {
      const p = await fetch(`${workerUrl()}/pointer/${_channelId}`);
      if (p.ok) pointedGen = (await p.json()).gen;
    } catch { /* fall through */ }
    if (pointedGen) {
      try { return { ...await tryGen(pointedGen), source: 'pointer' }; }
      catch { /* corrupt/missing — self-heal via fallback */ }
    }

    // 2. Newest complete generation (list fallback)
    try {
      const gens = (await (await relayFetch(`/gen/${_channelId}/list`)).json()).gens
        .sort((a, b) => idTimestamp(b) - idTimestamp(a));
      for (const gen of gens) {
        if (gen === pointedGen) continue; // already failed above
        try { return { ...await tryGen(gen), source: 'fallback' }; }
        catch { /* try next-newest */ }
      }
    } catch { /* fall through to legacy */ }

    // 3. Legacy single-generation format (pre-redesign uploads)
    try {
      const jsonString = await download(notify);
      return { jsonString, gen: null, manifest: null, source: 'legacy' };
    } catch { /* nothing readable */ }

    return null; // cold start — no canonical anywhere
  }

  /**
   * Commit a new canonical generation: chunks → manifest (absorbedRuns inside, the atomic
   * commit) → pointer flip → GC of old generations. Interrupt anywhere = prior gen intact.
   * @param {string} jsonString - the complete new canonical content
   * @param {string[]} absorbedRuns - runIds this generation absorbs (SET semantics)
   * @returns {object} the generation manifest
   */
  async function commitGeneration(jsonString, absorbedRuns, onProgress, opts) {
    if (!isConfigured()) throw new Error('Relay not configured');
    const notify = onProgress || (() => {});

    const mint = await relayFetch(`/gen/${_channelId}/begin?device=${deviceId()}`, { method: 'POST' });
    const gen = (await mint.json()).gen;

    const packed = await pack(jsonString, notify);
    const chunkCount = Math.ceil(packed.bytes.length / CHUNK_SIZE);
    for (let i = 0; i < chunkCount; i++) {
      notify('uploading', `Uploading part ${i + 1} of ${chunkCount}...`);
      const part = packed.bytes.slice(i * CHUNK_SIZE, Math.min((i + 1) * CHUNK_SIZE, packed.bytes.length));
      await relayFetch(`/gen/${_channelId}/${gen}/chunk/${i}`, { method: 'POST', body: part.buffer });
    }

    let bookCount = 0;
    try {
      const parsed = JSON.parse(jsonString);
      bookCount = (parsed.books && parsed.books.items && parsed.books.items.length) || 0;
    } catch { /* count is cosmetic */ }

    const manifest = {
      gen, chunkCount,
      checksum: await checksumOf(packed.bytes),
      absorbedRuns: absorbedRuns || [],
      totalBytes: new TextEncoder().encode(jsonString).length,
      encryptedBytes: packed.bytes.length,
      bookCount,
      timestamp: new Date().toISOString()
    };

    notify('finalizing', 'Committing...');
    await relayFetch(`/gen/${_channelId}/${gen}/manifest`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(manifest)
    });

    await relayFetch(`/pointer/${_channelId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ gen })
    });

    // GC: keep the KEEP_GENS newest, never the pointed one (server also guards), 1h grace.
    // Best-effort — a failed GC just means the next writer sweeps more.
    try {
      const graceMs = (opts && opts.gcGraceMs != null) ? opts.gcGraceMs : GC_GRACE_MS;
      // Union the just-committed gen into the candidate set: KV list may not show it yet
      // (eventual consistency), and it must count as one of the keep-2 or a sweep right
      // after commit keeps 2 listed gens PLUS this one.
      const listed = (await (await relayFetch(`/gen/${_channelId}/list`)).json()).gens;
      const gens = Array.from(new Set([gen, ...listed]))
        .sort((a, b) => idTimestamp(b) - idTimestamp(a));
      for (const old of gens.slice(KEEP_GENS)) {
        if (old === gen) continue;
        if (Date.now() - idTimestamp(old) < graceMs) continue;
        try { await relayFetch(`/gen/${_channelId}/${old}`, { method: 'DELETE' }); } catch { /* pointed or racing */ }
      }
    } catch { /* GC is best-effort */ }

    notify('complete', 'Committed');
    return manifest;
  }

  /**
   * Early storage reclamation for an ABSORBED bulk run (a full-fetch run holds real MBs for
   * up to 90 days otherwise). Caller responsibility: only for runs inside a COMMITTED
   * generation's absorbedRuns — unabsorbed letters are sacred (the clearing invariant).
   */
  async function deleteRun(runId) {
    if (!isConfigured()) throw new Error('Relay not configured');
    await relayFetch(`/mail/${_channelId}/${runId}`, { method: 'DELETE' });
  }

  // Auto-detect context and initialize
  if (window._RW_RELAY_CHANNEL) {
    initFromGlobals();
  }

  // Expose as global
  window.RWRelay = {
    initFromGlobals: initFromGlobals,
    initFromStorage: initFromStorage,
    isConfigured: isConfigured,
    getChannelId: getChannelId,
    upload: upload,
    checkStatus: checkStatus,
    download: download,
    cleanup: cleanup,
    getDeviceState: getDeviceState,
    putDeviceState: putDeviceState,
    revokeChannel: revokeChannel,
    // Relay write redesign Phase 1 (docs/design/RELAY-WRITE-REDESIGN.md)
    writeRun: writeRun,
    readMailbox: readMailbox,
    unabsorbedRuns: unabsorbedRuns,
    readCanonical: readCanonical,
    commitGeneration: commitGeneration,
    deleteRun: deleteRun,
    deviceId: deviceId
  };

})();
