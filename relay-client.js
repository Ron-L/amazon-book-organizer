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

  let _channelId = null;
  let _passphrase = null;
  let _cryptoKey = null; // Cached after first derivation

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

    // Step 1: Compress
    notify('compressing', 'Compressing library data...');
    const compressed = await window.RWCompress.compress(jsonString);
    const compressedBytes = compressed.byteLength;

    // Step 2: Encrypt
    notify('encrypting', 'Encrypting...');
    const key = await getKey();
    const encrypted = await window.RWCrypto.encryptPacked(key, compressed);

    // Step 3: Chunk and upload
    const encryptedArray = new Uint8Array(encrypted);
    const chunkCount = Math.ceil(encryptedArray.length / CHUNK_SIZE);

    for (let i = 0; i < chunkCount; i++) {
      const start = i * CHUNK_SIZE;
      const end = Math.min(start + CHUNK_SIZE, encryptedArray.length);
      const chunk = encryptedArray.slice(start, end);

      notify('uploading', `Uploading chunk ${i + 1} of ${chunkCount}...`);

      const response = await fetch(`${WORKER_URL}/upload/${_channelId}/chunk/${i}`, {
        method: 'POST',
        body: chunk.buffer
      });

      if (!response.ok) {
        const err = await response.text();
        throw new Error(`Chunk ${i} upload failed: ${err}`);
      }
    }

    // Step 4: Compute checksum of encrypted data
    const hashBuffer = await crypto.subtle.digest('SHA-256', encrypted);
    const hashArray = new Uint8Array(hashBuffer);
    const checksum = 'sha256:' + Array.from(hashArray).map(b => b.toString(16).padStart(2, '0')).join('');

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

    const manifestResponse = await fetch(`${WORKER_URL}/upload/${_channelId}/manifest`, {
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

    const response = await fetch(`${WORKER_URL}/status/${_channelId}`);
    if (response.status === 404) return null;
    if (!response.ok) throw new Error('Status check failed');

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
    const manifestResponse = await fetch(`${WORKER_URL}/status/${_channelId}`);
    if (manifestResponse.status === 404) throw new Error('No data available on relay');
    if (!manifestResponse.ok) throw new Error('Failed to get manifest');

    const manifest = await manifestResponse.json();

    // Step 2: Download chunks
    const chunks = [];
    for (let i = 0; i < manifest.chunkCount; i++) {
      notify('downloading', `Downloading chunk ${i + 1} of ${manifest.chunkCount}...`);

      const chunkResponse = await fetch(`${WORKER_URL}/download/${_channelId}/chunk/${i}`);
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
      const hashBuffer = await crypto.subtle.digest('SHA-256', encrypted.buffer);
      const hashArray = new Uint8Array(hashBuffer);
      const computed = 'sha256:' + Array.from(hashArray).map(b => b.toString(16).padStart(2, '0')).join('');

      if (computed !== manifest.checksum) {
        throw new Error('Checksum mismatch — data may be corrupted');
      }
    }

    // Step 5: Decrypt
    notify('decrypting', 'Decrypting...');
    const key = await getKey();
    const compressed = await window.RWCrypto.decryptPacked(key, encrypted.buffer);

    // Step 6: Decompress
    notify('decompressing', 'Decompressing...');
    const jsonString = await window.RWCompress.decompress(compressed);

    notify('complete', `Downloaded ${manifest.bookCount || '?'} books`);
    return jsonString;
  }

  /**
   * Delete ephemeral data (manifest + chunks) from relay after successful import.
   */
  async function cleanup() {
    if (!isConfigured()) return;

    const response = await fetch(`${WORKER_URL}/cleanup/${_channelId}`, {
      method: 'DELETE'
    });

    if (!response.ok) {
      console.warn('Relay cleanup failed:', await response.text());
    }
  }

  /**
   * Get the exclusion list from relay (used by fetcher before import).
   * @returns {object|null} Decrypted exclusion list or null if none exists
   */
  async function getExclusions() {
    if (!isConfigured()) return null;

    const response = await fetch(`${WORKER_URL}/exclusions/${_channelId}`);
    if (response.status === 404) return null;
    if (!response.ok) throw new Error('Failed to get exclusions');

    const encrypted = await response.arrayBuffer();
    const key = await getKey();
    const decrypted = await window.RWCrypto.decryptPacked(key, encrypted);
    const json = new TextDecoder().decode(decrypted);
    return JSON.parse(json);
  }

  /**
   * Update the exclusion list on relay (used by app after purge from Trash).
   * @param {object} exclusions - The exclusion list object
   */
  async function putExclusions(exclusions) {
    if (!isConfigured()) throw new Error('Relay not configured');

    const json = JSON.stringify(exclusions);
    const key = await getKey();
    const encrypted = await window.RWCrypto.encryptPacked(key, new TextEncoder().encode(json));

    const response = await fetch(`${WORKER_URL}/exclusions/${_channelId}`, {
      method: 'PUT',
      body: encrypted
    });

    if (!response.ok) throw new Error('Failed to update exclusions');
  }

  /**
   * Get device state from relay (used by mobile on open).
   * @returns {string|null} Decrypted JSON string or null if none exists
   */
  async function getDeviceState() {
    if (!isConfigured()) return null;

    const response = await fetch(`${WORKER_URL}/device-state/${_channelId}`);
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

    const response = await fetch(`${WORKER_URL}/device-state/${_channelId}`, {
      method: 'PUT',
      body: encrypted
    });

    if (!response.ok) throw new Error('Failed to update device state');
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
    getExclusions: getExclusions,
    putExclusions: putExclusions,
    getDeviceState: getDeviceState,
    putDeviceState: putDeviceState
  };

})();
