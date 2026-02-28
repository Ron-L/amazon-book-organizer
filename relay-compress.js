/**
 * ReaderWrangler Relay Compression Module
 * Gzip compress/decompress via browser-native CompressionStream API.
 * Used by both the bookmarklet (amazon.com) and the app (readerwrangler.com).
 *
 * Global: window.RWCompress
 */

(function() {
  'use strict';

  /**
   * Compress a string to gzipped ArrayBuffer.
   */
  async function compress(text) {
    const encoder = new TextEncoder();
    const blob = new Blob([encoder.encode(text)]);
    const stream = blob.stream().pipeThrough(new CompressionStream('gzip'));
    const response = new Response(stream);
    return response.arrayBuffer();
  }

  /**
   * Decompress a gzipped ArrayBuffer to string.
   */
  async function decompress(compressed) {
    const blob = new Blob([compressed]);
    const stream = blob.stream().pipeThrough(new DecompressionStream('gzip'));
    const response = new Response(stream);
    return response.text();
  }

  // Expose as global
  window.RWCompress = {
    compress: compress,
    decompress: decompress
  };

})();
