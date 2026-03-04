/**
 * ReaderWrangler Relay Worker
 * Cloudflare Worker that relays encrypted library data between
 * the bookmarklet (amazon.com) and the app (readerwrangler.com).
 *
 * KV Namespace binding: RELAY_KV
 *
 * Key layout:
 *   relay:{channelId}:manifest       → upload manifest (TTL: 24h)
 *   relay:{channelId}:chunk:{n}      → encrypted library chunk (TTL: 24h)
 *   relay:{channelId}:exclusions     → encrypted exclusion list (TTL: 90 days)
 *   relay:{channelId}:device-state   → encrypted device state (TTL: 90 days)
 */

const EPHEMERAL_TTL = 86400;   // 24 hours in seconds
const PERSISTENT_TTL = 7776000; // 90 days in seconds
const MAX_CHUNK_SIZE = 25 * 1024 * 1024; // 25 MB (KV value limit)
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default {
  async fetch(request, env) {
    // CORS preflight
    if (request.method === 'OPTIONS') {
      return corsResponse(request, env, new Response(null, { status: 204 }));
    }

    // CORS origin check
    const origin = request.headers.get('Origin');
    if (origin && !isAllowedOrigin(origin, env)) {
      return new Response('Forbidden', { status: 403 });
    }

    const url = new URL(request.url);
    const path = url.pathname;

    try {
      const response = await route(request, path, env);
      return corsResponse(request, env, response);
    } catch (err) {
      return corsResponse(request, env,
        new Response(JSON.stringify({ error: err.message }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        })
      );
    }
  }
};

async function route(request, path, env) {
  // POST /upload/{channelId}/chunk/{n}
  let match = path.match(/^\/upload\/([^/]+)\/chunk\/(\d+)$/);
  if (match && request.method === 'POST') {
    return handleUploadChunk(request, env, match[1], parseInt(match[2]));
  }

  // POST /upload/{channelId}/manifest
  match = path.match(/^\/upload\/([^/]+)\/manifest$/);
  if (match && request.method === 'POST') {
    return handleUploadManifest(request, env, match[1]);
  }

  // GET /status/{channelId}
  match = path.match(/^\/status\/([^/]+)$/);
  if (match && request.method === 'GET') {
    return handleStatus(env, match[1]);
  }

  // GET /download/{channelId}/chunk/{n}
  match = path.match(/^\/download\/([^/]+)\/chunk\/(\d+)$/);
  if (match && request.method === 'GET') {
    return handleDownloadChunk(env, match[1], parseInt(match[2]));
  }

  // DELETE /cleanup/{channelId}
  match = path.match(/^\/cleanup\/([^/]+)$/);
  if (match && request.method === 'DELETE') {
    return handleCleanup(env, match[1]);
  }

  // PUT /exclusions/{channelId}
  match = path.match(/^\/exclusions\/([^/]+)$/);
  if (match && request.method === 'PUT') {
    return handlePutExclusions(request, env, match[1]);
  }

  // GET /exclusions/{channelId}
  match = path.match(/^\/exclusions\/([^/]+)$/);
  if (match && request.method === 'GET') {
    return handleGetExclusions(env, match[1]);
  }

  // PUT /device-state/{channelId}
  match = path.match(/^\/device-state\/([^/]+)$/);
  if (match && request.method === 'PUT') {
    return handlePutDeviceState(request, env, match[1]);
  }

  // GET /device-state/{channelId}
  match = path.match(/^\/device-state\/([^/]+)$/);
  if (match && request.method === 'GET') {
    return handleGetDeviceState(env, match[1]);
  }

  return new Response('Not Found', { status: 404 });
}

// --- Handlers ---

async function handleUploadChunk(request, env, channelId, chunkNum) {
  if (!validateChannelId(channelId)) return badRequest('Invalid channel ID');
  const body = await request.arrayBuffer();
  if (body.byteLength > MAX_CHUNK_SIZE) return badRequest('Chunk too large');

  await env.RELAY_KV.put(
    `relay:${channelId}:chunk:${chunkNum}`,
    body,
    { expirationTtl: EPHEMERAL_TTL }
  );

  return jsonResponse({ ok: true, chunk: chunkNum, bytes: body.byteLength });
}

async function handleUploadManifest(request, env, channelId) {
  if (!validateChannelId(channelId)) return badRequest('Invalid channel ID');
  const manifest = await request.text();

  // Validate it's parseable JSON
  try {
    JSON.parse(manifest);
  } catch {
    return badRequest('Manifest must be valid JSON');
  }

  await env.RELAY_KV.put(
    `relay:${channelId}:manifest`,
    manifest,
    { expirationTtl: EPHEMERAL_TTL }
  );

  return jsonResponse({ ok: true });
}

async function handleStatus(env, channelId) {
  if (!validateChannelId(channelId)) return badRequest('Invalid channel ID');

  const manifest = await env.RELAY_KV.get(`relay:${channelId}:manifest`);
  if (!manifest) return new Response('No data available', { status: 404 });

  return new Response(manifest, {
    headers: { 'Content-Type': 'application/json' }
  });
}

async function handleDownloadChunk(env, channelId, chunkNum) {
  if (!validateChannelId(channelId)) return badRequest('Invalid channel ID');

  const chunk = await env.RELAY_KV.get(`relay:${channelId}:chunk:${chunkNum}`, 'arrayBuffer');
  if (!chunk) return new Response('Chunk not found', { status: 404 });

  return new Response(chunk, {
    headers: { 'Content-Type': 'application/octet-stream' }
  });
}

async function handleCleanup(env, channelId) {
  if (!validateChannelId(channelId)) return badRequest('Invalid channel ID');

  // Get manifest to find chunk count
  const manifestStr = await env.RELAY_KV.get(`relay:${channelId}:manifest`);
  const deletes = [env.RELAY_KV.delete(`relay:${channelId}:manifest`)];

  if (manifestStr) {
    try {
      const manifest = JSON.parse(manifestStr);
      for (let i = 0; i < (manifest.chunkCount || 1); i++) {
        deletes.push(env.RELAY_KV.delete(`relay:${channelId}:chunk:${i}`));
      }
    } catch {
      // If manifest isn't parseable, delete chunk:0 as best effort
      deletes.push(env.RELAY_KV.delete(`relay:${channelId}:chunk:0`));
    }
  }

  await Promise.all(deletes);
  return jsonResponse({ ok: true });
}

async function handlePutExclusions(request, env, channelId) {
  if (!validateChannelId(channelId)) return badRequest('Invalid channel ID');
  const body = await request.arrayBuffer();
  if (body.byteLength > MAX_CHUNK_SIZE) return badRequest('Exclusion list too large');

  await env.RELAY_KV.put(`relay:${channelId}:exclusions`, body,
    { expirationTtl: PERSISTENT_TTL }
  );
  return jsonResponse({ ok: true });
}

async function handleGetExclusions(env, channelId) {
  if (!validateChannelId(channelId)) return badRequest('Invalid channel ID');

  const data = await env.RELAY_KV.get(`relay:${channelId}:exclusions`, 'arrayBuffer');
  if (!data) return new Response('No exclusions', { status: 404 });

  return new Response(data, {
    headers: { 'Content-Type': 'application/octet-stream' }
  });
}

async function handlePutDeviceState(request, env, channelId) {
  if (!validateChannelId(channelId)) return badRequest('Invalid channel ID');
  const body = await request.arrayBuffer();
  if (body.byteLength > MAX_CHUNK_SIZE) return badRequest('Device state too large');

  await env.RELAY_KV.put(`relay:${channelId}:device-state`, body,
    { expirationTtl: PERSISTENT_TTL }
  );
  return jsonResponse({ ok: true });
}

async function handleGetDeviceState(env, channelId) {
  if (!validateChannelId(channelId)) return badRequest('Invalid channel ID');

  const data = await env.RELAY_KV.get(`relay:${channelId}:device-state`, 'arrayBuffer');
  if (!data) return new Response('No device state', { status: 404 });

  return new Response(data, {
    headers: { 'Content-Type': 'application/octet-stream' }
  });
}

// --- Helpers ---

function validateChannelId(id) {
  return UUID_REGEX.test(id);
}

function isAllowedOrigin(origin, env) {
  const allowed = (env.ALLOWED_ORIGINS || '').split(',').map(s => s.trim());
  return allowed.includes(origin);
}

function corsResponse(request, env, response) {
  const origin = request.headers.get('Origin');
  if (!origin) return response;

  const headers = new Headers(response.headers);
  if (isAllowedOrigin(origin, env)) {
    headers.set('Access-Control-Allow-Origin', origin);
  }
  headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  headers.set('Access-Control-Allow-Headers', 'Content-Type');
  headers.set('Access-Control-Max-Age', '86400');

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers
  });
}

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' }
  });
}

function badRequest(message) {
  return jsonResponse({ error: message }, 400);
}
