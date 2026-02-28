/**
 * ReaderWrangler Relay Crypto Module
 * AES-256-GCM encryption/decryption via Web Crypto API.
 * Used by both the bookmarklet (amazon.com) and the app (readerwrangler.com).
 *
 * Global: window.RWCrypto
 */

(function() {
  'use strict';

  const PBKDF2_ITERATIONS = 100000;
  const IV_LENGTH = 12; // AES-GCM standard

  /**
   * Derive an AES-256-GCM key from passphrase + channelId.
   * Salt = SHA-256(channelId).slice(0,16) — unique per user, no extra data to transmit.
   */
  async function deriveKey(passphrase, channelId) {
    const encoder = new TextEncoder();

    // Import passphrase as raw key material
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      encoder.encode(passphrase),
      'PBKDF2',
      false,
      ['deriveKey']
    );

    // Salt from channelId hash (deterministic, unique per user)
    const channelHash = await crypto.subtle.digest('SHA-256', encoder.encode(channelId));
    const salt = new Uint8Array(channelHash).slice(0, 16);

    return crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: salt,
        iterations: PBKDF2_ITERATIONS,
        hash: 'SHA-256'
      },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );
  }

  /**
   * Encrypt plaintext ArrayBuffer. Returns packed ArrayBuffer: [12-byte IV][ciphertext].
   */
  async function encryptPacked(key, plaintext) {
    const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));

    const ciphertext = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv: iv },
      key,
      plaintext
    );

    // Pack: [IV (12 bytes)][ciphertext]
    const packed = new Uint8Array(IV_LENGTH + ciphertext.byteLength);
    packed.set(iv, 0);
    packed.set(new Uint8Array(ciphertext), IV_LENGTH);

    return packed.buffer;
  }

  /**
   * Decrypt packed ArrayBuffer ([12-byte IV][ciphertext]). Returns plaintext ArrayBuffer.
   */
  async function decryptPacked(key, packed) {
    const data = new Uint8Array(packed);
    const iv = data.slice(0, IV_LENGTH);
    const ciphertext = data.slice(IV_LENGTH);

    return crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: iv },
      key,
      ciphertext
    );
  }

  // Expose as global
  window.RWCrypto = {
    deriveKey: deriveKey,
    encryptPacked: encryptPacked,
    decryptPacked: decryptPacked
  };

})();
