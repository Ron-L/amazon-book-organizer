/**
 * ReaderWrangler Relay Worker
 * Cloudflare Worker that relays encrypted library data between
 * the bookmarklet (amazon.com) and the app (readerwrangler.com).
 *
 * KV Namespace binding: RELAY_KV
 *
 * Key layout:
 *   relay:{channelId}:manifest         → upload manifest (TTL: 10 days)
 *   relay:{channelId}:chunk:{n}        → encrypted library chunk (TTL: 10 days)
 *   relay:{channelId}:device-state     → encrypted device state (TTL: 90 days)
 *   relay:{channelId}:revocation-proof → SHA-256 proof hash (permanent)
 *   ratelimit:{channelId}              → write counter per hour (TTL: 2 hours)
 *   blocklist:{channelId}              → permanently blocked channel (no TTL)
 *   test-alert-counter                 → test alert sequence number
 */

const LIBRARY_TTL = 864000;    // 10 days in seconds (fetcher→app relay data)
const PERSISTENT_TTL = 7776000; // 90 days in seconds (device-state sync)
const MAX_CHUNK_SIZE = 25 * 1024 * 1024; // 25 MB (KV value limit)
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const RATE_LIMIT_WINDOW_MS = 3600000; // 1 hour
const RATE_LIMIT_MAX_WRITES = 200;    // per channelId per hour (normal: ~10-20)
const RATE_LIMIT_AUTO_BLOCK = 2000;   // 10x limit → permanent blocklist

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

  // POST /revoke/{channelId}
  match = path.match(/^\/revoke\/([^/]+)$/);
  if (match && request.method === 'POST') {
    return handleRevoke(request, env, match[1]);
  }

  // POST /test-alert?key={TEST_ALERT_KEY} — send a test email alert
  match = path.match(/^\/test-alert$/);
  if (match && request.method === 'POST') {
    const testUrl = new URL(request.url);
    if (!env.TEST_ALERT_KEY || testUrl.searchParams.get('key') !== env.TEST_ALERT_KEY) {
      return jsonResponse({ error: 'Unauthorized' }, 401);
    }
    const countKey = 'test-alert-counter';
    const prev = parseInt(await env.RELAY_KV.get(countKey) || '0');
    const count = prev + 1;
    await env.RELAY_KV.put(countKey, String(count));
    await sendAlert(env, `Test Alert #${count}`, `Test alert #${count} from the ReaderWrangler relay worker.\nSent: ${new Date().toISOString()}`);
    return jsonResponse({ ok: true, message: `Alert #${count} sent` });
  }

  return new Response('Not Found', { status: 404 });
}

// --- Handlers ---

async function handleUploadChunk(request, env, channelId, chunkNum) {
  if (!validateChannelId(channelId)) return badRequest('Invalid channel ID');
  if (await isBlocked(env, channelId)) return jsonResponse({ error: 'Channel revoked' }, 403);
  if (!await checkRateLimit(env, channelId)) return jsonResponse({ error: 'Rate limit exceeded. Try again later.' }, 429);
  const body = await request.arrayBuffer();
  if (body.byteLength > MAX_CHUNK_SIZE) return badRequest('Chunk too large');

  await env.RELAY_KV.put(
    `relay:${channelId}:chunk:${chunkNum}`,
    body,
    { expirationTtl: LIBRARY_TTL }
  );

  return jsonResponse({ ok: true, chunk: chunkNum, bytes: body.byteLength });
}

async function handleUploadManifest(request, env, channelId) {
  if (!validateChannelId(channelId)) return badRequest('Invalid channel ID');
  if (await isBlocked(env, channelId)) return jsonResponse({ error: 'Channel revoked' }, 403);
  if (!await checkRateLimit(env, channelId)) return jsonResponse({ error: 'Rate limit exceeded. Try again later.' }, 429);
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
    { expirationTtl: LIBRARY_TTL }
  );

  return jsonResponse({ ok: true });
}

async function handleStatus(env, channelId) {
  if (!validateChannelId(channelId)) return badRequest('Invalid channel ID');
  if (await isBlocked(env, channelId)) return jsonResponse({ error: 'Channel revoked' }, 403);

  const manifest = await env.RELAY_KV.get(`relay:${channelId}:manifest`);
  if (!manifest) return new Response('No data available', { status: 404 });

  return new Response(manifest, {
    headers: { 'Content-Type': 'application/json' }
  });
}

async function handleDownloadChunk(env, channelId, chunkNum) {
  if (!validateChannelId(channelId)) return badRequest('Invalid channel ID');
  if (await isBlocked(env, channelId)) return jsonResponse({ error: 'Channel revoked' }, 403);

  const chunk = await env.RELAY_KV.get(`relay:${channelId}:chunk:${chunkNum}`, 'arrayBuffer');
  if (!chunk) return new Response('Chunk not found', { status: 404 });

  return new Response(chunk, {
    headers: { 'Content-Type': 'application/octet-stream' }
  });
}

async function handleCleanup(env, channelId) {
  if (!validateChannelId(channelId)) return badRequest('Invalid channel ID');
  if (await isBlocked(env, channelId)) return jsonResponse({ error: 'Channel revoked' }, 403);

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

async function handlePutDeviceState(request, env, channelId) {
  if (!validateChannelId(channelId)) return badRequest('Invalid channel ID');
  if (await isBlocked(env, channelId)) return jsonResponse({ error: 'Channel revoked' }, 403);
  if (!await checkRateLimit(env, channelId)) return jsonResponse({ error: 'Rate limit exceeded. Try again later.' }, 429);
  const body = await request.arrayBuffer();
  if (body.byteLength > MAX_CHUNK_SIZE) return badRequest('Device state too large');

  await env.RELAY_KV.put(`relay:${channelId}:device-state`, body,
    { expirationTtl: PERSISTENT_TTL }
  );
  return jsonResponse({ ok: true });
}

async function handleGetDeviceState(env, channelId) {
  if (!validateChannelId(channelId)) return badRequest('Invalid channel ID');
  if (await isBlocked(env, channelId)) return jsonResponse({ error: 'Channel revoked' }, 403);

  const data = await env.RELAY_KV.get(`relay:${channelId}:device-state`, 'arrayBuffer');
  if (!data) return new Response('No device state', { status: 404 });

  return new Response(data, {
    headers: { 'Content-Type': 'application/octet-stream' }
  });
}

// --- Revocation & Blocklist ---

async function isBlocked(env, channelId) {
  const entry = await env.RELAY_KV.get(`blocklist:${channelId}`);
  return !!entry;
}

async function handleRevoke(request, env, channelId) {
  if (!validateChannelId(channelId)) return badRequest('Invalid channel ID');

  // Parse and validate proof
  let proof;
  try {
    const body = await request.json();
    proof = body.proof;
  } catch {
    return badRequest('Invalid JSON body');
  }
  if (!proof || typeof proof !== 'string' || !/^[0-9a-f]{64}$/i.test(proof)) {
    return badRequest('Invalid proof hash');
  }

  // Store revocation proof (permanent — allows future audit)
  await env.RELAY_KV.put(`relay:${channelId}:revocation-proof`, proof);

  // Delete all data for this channel
  const deletes = [
    env.RELAY_KV.delete(`relay:${channelId}:manifest`),
    env.RELAY_KV.delete(`relay:${channelId}:device-state`)
  ];
  // Delete chunks 0-99 (best effort — covers any realistic chunk count)
  for (let i = 0; i < 100; i++) {
    deletes.push(env.RELAY_KV.delete(`relay:${channelId}:chunk:${i}`));
  }
  await Promise.all(deletes);

  // Add to blocklist
  await env.RELAY_KV.put(`blocklist:${channelId}`,
    JSON.stringify({ revokedAt: new Date().toISOString(), reason: 'user-revoked' }));

  // Send alert
  await sendAlert(env, 'Channel revoked',
    `Channel ${channelId} was revoked by user.\nTime: ${new Date().toISOString()}`);

  return jsonResponse({ ok: true, message: 'Channel revoked and data deleted' });
}

// --- Rate Limiting ---

async function checkRateLimit(env, channelId) {
  const key = `ratelimit:${channelId}`;
  const now = Date.now();

  const raw = await env.RELAY_KV.get(key);
  let data = raw ? JSON.parse(raw) : { count: 0, windowStart: now };

  // Reset window if expired
  if (now - data.windowStart > RATE_LIMIT_WINDOW_MS) {
    data = { count: 0, windowStart: now };
  }

  data.count++;

  if (data.count > RATE_LIMIT_MAX_WRITES) {
    // Auto-blocklist on extreme abuse (10x normal limit)
    if (data.count >= RATE_LIMIT_AUTO_BLOCK) {
      await env.RELAY_KV.put(`blocklist:${channelId}`,
        JSON.stringify({ revokedAt: new Date().toISOString(), reason: 'rate-limit-auto' }));
      await sendAlert(env, 'Channel auto-blocked',
        `Channel ${channelId} exceeded ${RATE_LIMIT_AUTO_BLOCK} writes/hour and was auto-blocked.\nTime: ${new Date().toISOString()}`);
    }
    return false; // Rate limited
  }

  await env.RELAY_KV.put(key, JSON.stringify(data), { expirationTtl: 7200 }); // 2hr TTL
  return true; // Allowed
}

// --- Email Alerts ---

async function sendAlert(env, subject, message) {
    if (!env.ALERT_TO_EMAIL || !env.RESEND_API_KEY) return;
    try {
        await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${env.RESEND_API_KEY}`
            },
            body: JSON.stringify({
                from: 'ReaderWrangler Relay <alerts@readerwrangler.com>',
                to: [env.ALERT_TO_EMAIL],
                subject: `🚨 ${subject}`,
                text: message
            })
        });
    } catch { /* best-effort — don't let alert failure break the request */ }
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
