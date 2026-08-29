/**
 * ReaderWrangler Relay Worker
 * Cloudflare Worker that relays encrypted library data between
 * the bookmarklet (amazon.com) and the app (readerwrangler.com).
 *
 * KV Namespace binding: RELAY_KV
 *
 * Key layout (legacy, single-generation — being replaced by the redesign below):
 *   relay:{channelId}:manifest         → upload manifest (TTL: 10 days)
 *   relay:{channelId}:chunk:{n}        → encrypted library chunk (TTL: 10 days)
 *   relay:{channelId}:device-state     → encrypted device state (TTL: 90 days)
 *
 * Key layout (relay write redesign Phase 1 — see docs/design/RELAY-WRITE-REDESIGN.md):
 *   relay:{channelId}:mail:{runId}:{seq}      → mailbox letter, encrypted (TTL: 90 days)
 *   relay:{channelId}:mail:{runId}:manifest   → run manifest JSON; presence = run committed (TTL: 90 days)
 *                                               (single-letter runs inline manifest+payload at seq 0, no separate manifest)
 *   relay:{channelId}:gen:{gen}:chunk:{i}     → generation chunk, encrypted (NO TTL — GC'd by keep-2)
 *   relay:{channelId}:gen:{gen}:manifest      → generation manifest JSON incl. absorbedRuns (NO TTL)
 *   relay:{channelId}:pointer                 → JSON { gen } naming the current generation (NO TTL)
 *   relay:{channelId}:dstate:{gen}:chunk:{i}  → device-state journal chunk (TTL: 90 days) — Phase 1b
 *   relay:{channelId}:dstate:{gen}:manifest   → device-state generation manifest (TTL: 90 days)
 *   relay:{channelId}:dstate-pointer          → JSON { gen } naming the live device-state (TTL: 90 days)
 *   runId/gen format: {workerTimestampMs}-{deviceId}-{rand4hex} — minted server-side so
 *   timestamps can't be skewed by client clocks; '-' internal separator, ':' reserved for key layout.
 *
 * Shared:
 *   relay:{channelId}:revocation-proof → SHA-256 proof hash (permanent)
 *   ratelimit:{channelId}              → write counter per hour (TTL: 2 hours)
 *   blocklist:{channelId}              → permanently blocked channel (no TTL)
 *   lifecycle:{channelId}:used         → ISO timestamp of first successful manifest upload (permanent, lifecycle telemetry)
 *   test-alert-counter                 → test alert sequence number
 *   usage-alert:{YYYY-MM-DD}           → threshold alerts already sent today (TTL: 2 days)
 */

const LIBRARY_TTL = 864000;    // 10 days in seconds (legacy fetcher→app relay data)
const PERSISTENT_TTL = 7776000; // 90 days in seconds (device-state sync)
const LETTER_TTL = 7776000;    // 90 days in seconds (mailbox letters — sized to absence windows, not merge cadence)
const MAX_CHUNK_SIZE = 25 * 1024 * 1024; // 25 MB (KV value limit)
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
// Server-minted ids: {timestampMs}-{deviceId}-{rand4hex}. Device id is client-chosen but sanitized.
const MINTED_ID_REGEX = /^\d{13}-[A-Za-z0-9_]{1,32}-[0-9a-f]{4}$/;
const DEVICE_ID_REGEX = /^[A-Za-z0-9_]{1,32}$/;
const LIST_PAGE_CAP = 10; // safety cap on KV list pagination loops (10 × 1000 keys)

// Phase 1b: generational stores share ONE implementation — the canonical library and the
// device-state journal differ only in key segment, pointer key, and TTL policy.
//   canonical: no TTL (lifecycle = keep-2 + GC; a rarely-rewritten library must never expire)
//   dstate:    90d TTL, refreshed by every push (mobile snapshot; old single-key behavior kept)
const GEN_STORES = {
  canonical: { seg: 'gen',    ptr: 'pointer',        ttl: null },
  dstate:    { seg: 'dstate', ptr: 'dstate-pointer', ttl: PERSISTENT_TTL }
};
const RATE_LIMIT_WINDOW_MS = 3600000; // 1 hour
const RATE_LIMIT_MAX_WRITES = 200;    // per channelId per hour (normal: ~10-20)
const RATE_LIMIT_AUTO_BLOCK = 2000;   // 10x limit → permanent blocklist
const RATE_LIMIT_SAMPLE = 5;          // v7.5.0 - persist the counter 1-in-N (counting by N):
                                      // the counter write was ~HALF of ALL KV writes (one per
                                      // authenticated request). The counter has always been
                                      // best-effort/approximate; sampling changes no semantics,
                                      // only granularity (200/hr limit ± ~5).

// Cloudflare free tier daily limits
const CF_LIMITS = {
  requests:   { limit: 100000, label: 'Worker requests' },
  kvReads:    { limit: 100000, label: 'KV reads' },
  kvWrites:   { limit: 1000,   label: 'KV writes' },
  kvDeletes:  { limit: 1000,   label: 'KV deletes' },
  kvStorageMB:{ limit: 1024,   label: 'KV storage' },
};
const THRESHOLDS = [25, 50, 75, 90];

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
  },

  async scheduled(event, env, ctx) {
    const cron = event.cron;
    try {
      if (cron === '55 23 * * *') {
        await sendDailySummary(env);
      } else {
        await checkUsageThresholds(env);
      }
    } catch (err) {
      await sendAlert(env, 'Cron error', `Cron "${cron}" failed: ${err.message}\nTime: ${new Date().toISOString()}`);
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

  // --- Relay write redesign Phase 1: mailbox ---

  // POST /mail/{channelId}/run — mint a runId (no KV write)
  match = path.match(/^\/mail\/([^/]+)\/run$/);
  if (match && request.method === 'POST') {
    return handleMintId(request, env, match[1], 'run');
  }

  // POST /mail/{channelId}/letter — single self-committing letter (inline manifest)
  match = path.match(/^\/mail\/([^/]+)\/letter$/);
  if (match && request.method === 'POST') {
    return handleSingleLetter(request, env, match[1]);
  }

  // POST /mail/{channelId}/{runId}/letter/{seq}
  match = path.match(/^\/mail\/([^/]+)\/([^/]+)\/letter\/(\d+)$/);
  if (match && request.method === 'POST') {
    return handlePutLetter(request, env, match[1], match[2], parseInt(match[3]));
  }

  // POST /mail/{channelId}/{runId}/manifest — commits the run (written last)
  match = path.match(/^\/mail\/([^/]+)\/([^/]+)\/manifest$/);
  if (match && request.method === 'POST') {
    return handlePutRunManifest(request, env, match[1], match[2]);
  }

  // GET /mail/{channelId}/list — enumerate mailbox keys (1 KV list op per page)
  match = path.match(/^\/mail\/([^/]+)\/list$/);
  if (match && request.method === 'GET') {
    return handleMailList(env, match[1]);
  }

  // GET /mail/{channelId}/{runId}/letter/{seq}
  match = path.match(/^\/mail\/([^/]+)\/([^/]+)\/letter\/(\d+)$/);
  if (match && request.method === 'GET') {
    return handleGetLetter(env, match[1], match[2], parseInt(match[3]));
  }

  // GET /mail/{channelId}/{runId}/manifest
  match = path.match(/^\/mail\/([^/]+)\/([^/]+)\/manifest$/);
  if (match && request.method === 'GET') {
    return handleGetRunManifest(env, match[1], match[2]);
  }

  // DELETE /mail/{channelId}/{runId} — early GC of an absorbed bulk run
  match = path.match(/^\/mail\/([^/]+)\/([^/]+)$/);
  if (match && request.method === 'DELETE') {
    return handleDeleteRun(env, match[1], match[2]);
  }

  // --- Relay write redesign Phase 1: generations + pointer ---

  // Generational stores: /gen + /pointer = canonical library; /dstate + /dstate-pointer =
  // device-state journal (Phase 1b). Same handlers, different GEN_STORES config.
  for (const [route, store] of [['gen', GEN_STORES.canonical], ['dstate', GEN_STORES.dstate]]) {
    // POST /{route}/{channelId}/begin — mint a generation id (no KV write)
    match = path.match(new RegExp(`^/${route}/([^/]+)/begin$`));
    if (match && request.method === 'POST') {
      return handleMintId(request, env, match[1], 'gen');
    }

    // POST /{route}/{channelId}/{gen}/chunk/{i}
    match = path.match(new RegExp(`^/${route}/([^/]+)/([^/]+)/chunk/([0-9]+)$`));
    if (match && request.method === 'POST') {
      return handlePutGenChunk(request, env, store, match[1], match[2], parseInt(match[3]));
    }

    // POST /{route}/{channelId}/{gen}/manifest — the atomic commit (written last)
    match = path.match(new RegExp(`^/${route}/([^/]+)/([^/]+)/manifest$`));
    if (match && request.method === 'POST') {
      return handlePutGenManifest(request, env, store, match[1], match[2]);
    }

    // GET /{route}/{channelId}/list — enumerate generation manifests (fallback discovery/GC)
    match = path.match(new RegExp(`^/${route}/([^/]+)/list$`));
    if (match && request.method === 'GET') {
      return handleGenList(env, store, match[1]);
    }

    // GET /{route}/{channelId}/{gen}/chunk/{i}
    match = path.match(new RegExp(`^/${route}/([^/]+)/([^/]+)/chunk/([0-9]+)$`));
    if (match && request.method === 'GET') {
      return handleGetGenChunk(env, store, match[1], match[2], parseInt(match[3]));
    }

    // GET /{route}/{channelId}/{gen}/manifest
    match = path.match(new RegExp(`^/${route}/([^/]+)/([^/]+)/manifest$`));
    if (match && request.method === 'GET') {
      return handleGetGenManifest(env, store, match[1], match[2]);
    }

    // DELETE /{route}/{channelId}/{gen} — GC (refuses the currently-pointed generation)
    match = path.match(new RegExp(`^/${route}/([^/]+)/([^/]+)$`));
    if (match && request.method === 'DELETE') {
      return handleDeleteGen(env, store, match[1], match[2]);
    }
  }

  // PUT|GET /pointer/{channelId} and /dstate-pointer/{channelId} — the atomic flips
  for (const [route, store] of [['pointer', GEN_STORES.canonical], ['dstate-pointer', GEN_STORES.dstate]]) {
    match = path.match(new RegExp(`^/${route}/([^/]+)$`));
    if (match && request.method === 'PUT') {
      return handlePutPointer(request, env, store, match[1]);
    }
    if (match && request.method === 'GET') {
      return handleGetPointer(env, store, match[1]);
    }
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

  // Lifecycle telemetry: first successful manifest upload per channel
  const usedKey = `lifecycle:${channelId}:used`;
  if (!await env.RELAY_KV.get(usedKey)) {
    await env.RELAY_KV.put(usedKey, new Date().toISOString());
    await fireGoatCounter(env, 'relay-channel-used');
  }

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

// --- Relay write redesign Phase 1: mailbox + generations + pointer ---
// See docs/design/RELAY-WRITE-REDESIGN.md. Invariants enforced here:
//   - runId/gen ids are MINTED SERVER-SIDE (worker timestamp — client clocks can't skew "newest").
//   - The worker never interprets payloads (ciphertext in, ciphertext out); manifests are
//     structural JSON the worker validates for parseability only.
//   - DELETE /gen refuses the currently-pointed generation (GC guard).

function mintId(deviceId) {
  const rand = Array.from(crypto.getRandomValues(new Uint8Array(2)))
    .map(b => b.toString(16).padStart(2, '0')).join('');
  return `${Date.now()}-${deviceId}-${rand}`;
}

// POST /mail/{ch}/run and POST /gen/{ch}/begin — mint an id; costs no KV operations.
async function handleMintId(request, env, channelId, kind) {
  if (!validateChannelId(channelId)) return badRequest('Invalid channel ID');
  if (await isBlocked(env, channelId)) return jsonResponse({ error: 'Channel revoked' }, 403);
  const deviceId = new URL(request.url).searchParams.get('device') || 'unknown';
  if (!DEVICE_ID_REGEX.test(deviceId)) return badRequest('Invalid device id');
  const id = mintId(deviceId);
  return jsonResponse(kind === 'run' ? { runId: id, timestamp: Date.now() }
                                     : { gen: id, timestamp: Date.now() });
}

// POST /mail/{ch}/letter — single-letter run: manifest fields + payload in ONE value,
// one atomic put, complete by definition (halves the cost of the most frequent op: wishlist add).
async function handleSingleLetter(request, env, channelId) {
  if (!validateChannelId(channelId)) return badRequest('Invalid channel ID');
  if (await isBlocked(env, channelId)) return jsonResponse({ error: 'Channel revoked' }, 403);
  if (!await checkRateLimit(env, channelId)) return jsonResponse({ error: 'Rate limit exceeded. Try again later.' }, 429);
  const deviceId = new URL(request.url).searchParams.get('device') || 'unknown';
  if (!DEVICE_ID_REGEX.test(deviceId)) return badRequest('Invalid device id');

  const body = await request.text();
  if (body.length > MAX_CHUNK_SIZE) return badRequest('Letter too large');
  try { JSON.parse(body); } catch { return badRequest('Single letter must be valid JSON (manifest fields + payload)'); }

  const runId = mintId(deviceId);
  await env.RELAY_KV.put(`relay:${channelId}:mail:${runId}:0`, body, { expirationTtl: LETTER_TTL });
  return jsonResponse({ ok: true, runId, inline: true });
}

async function handlePutLetter(request, env, channelId, runId, seq) {
  if (!validateChannelId(channelId)) return badRequest('Invalid channel ID');
  if (!MINTED_ID_REGEX.test(runId)) return badRequest('Invalid run id');
  if (await isBlocked(env, channelId)) return jsonResponse({ error: 'Channel revoked' }, 403);
  if (!await checkRateLimit(env, channelId)) return jsonResponse({ error: 'Rate limit exceeded. Try again later.' }, 429);

  const body = await request.arrayBuffer();
  if (body.byteLength > MAX_CHUNK_SIZE) return badRequest('Letter too large');

  await env.RELAY_KV.put(`relay:${channelId}:mail:${runId}:${seq}`, body, { expirationTtl: LETTER_TTL });
  return jsonResponse({ ok: true, runId, seq, bytes: body.byteLength });
}

// The run manifest is written LAST by the producer; its presence commits the run.
async function handlePutRunManifest(request, env, channelId, runId) {
  if (!validateChannelId(channelId)) return badRequest('Invalid channel ID');
  if (!MINTED_ID_REGEX.test(runId)) return badRequest('Invalid run id');
  if (await isBlocked(env, channelId)) return jsonResponse({ error: 'Channel revoked' }, 403);
  if (!await checkRateLimit(env, channelId)) return jsonResponse({ error: 'Rate limit exceeded. Try again later.' }, 429);

  const manifest = await request.text();
  try { JSON.parse(manifest); } catch { return badRequest('Manifest must be valid JSON'); }

  await env.RELAY_KV.put(`relay:${channelId}:mail:${runId}:manifest`, manifest, { expirationTtl: LETTER_TTL });
  return jsonResponse({ ok: true, runId });
}

// GET /mail/{ch}/list — key names only (grouping/completeness is the client's job;
// completeness must be verified by GETs, not trusted from a list — see design M5).
async function handleMailList(env, channelId) {
  if (!validateChannelId(channelId)) return badRequest('Invalid channel ID');
  if (await isBlocked(env, channelId)) return jsonResponse({ error: 'Channel revoked' }, 403);

  const prefix = `relay:${channelId}:mail:`;
  const keys = [];
  let cursor;
  for (let page = 0; page < LIST_PAGE_CAP; page++) {
    const res = await env.RELAY_KV.list({ prefix, cursor });
    for (const k of res.keys) keys.push(k.name.slice(prefix.length)); // "{runId}:{seq}" or "{runId}:manifest"
    if (res.list_complete) break;
    cursor = res.cursor;
  }
  return jsonResponse({ ok: true, keys });
}

async function handleGetLetter(env, channelId, runId, seq) {
  if (!validateChannelId(channelId)) return badRequest('Invalid channel ID');
  if (!MINTED_ID_REGEX.test(runId)) return badRequest('Invalid run id');
  if (await isBlocked(env, channelId)) return jsonResponse({ error: 'Channel revoked' }, 403);

  const data = await env.RELAY_KV.get(`relay:${channelId}:mail:${runId}:${seq}`, 'arrayBuffer');
  if (!data) return new Response('Letter not found', { status: 404 });
  return new Response(data, { headers: { 'Content-Type': 'application/octet-stream' } });
}

async function handleGetRunManifest(env, channelId, runId) {
  if (!validateChannelId(channelId)) return badRequest('Invalid channel ID');
  if (!MINTED_ID_REGEX.test(runId)) return badRequest('Invalid run id');
  if (await isBlocked(env, channelId)) return jsonResponse({ error: 'Channel revoked' }, 403);

  const manifest = await env.RELAY_KV.get(`relay:${channelId}:mail:${runId}:manifest`);
  if (!manifest) return new Response('Run manifest not found', { status: 404 });
  return new Response(manifest, { headers: { 'Content-Type': 'application/json' } });
}

// DELETE /mail/{ch}/{runId} — early storage reclamation for ABSORBED bulk runs (a full-fetch
// run holds real MBs for up to 90 days otherwise). Unabsorbed runs must never be deleted;
// the client enforces that (only calls this for runs in a committed generation's absorbedRuns).
async function handleDeleteRun(env, channelId, runId) {
  if (!validateChannelId(channelId)) return badRequest('Invalid channel ID');
  if (!MINTED_ID_REGEX.test(runId)) return badRequest('Invalid run id');
  if (await isBlocked(env, channelId)) return jsonResponse({ error: 'Channel revoked' }, 403);

  const prefix = `relay:${channelId}:mail:${runId}:`;
  const res = await env.RELAY_KV.list({ prefix });
  await Promise.all(res.keys.map(k => env.RELAY_KV.delete(k.name)));
  return jsonResponse({ ok: true, deleted: res.keys.length });
}

async function handlePutGenChunk(request, env, store, channelId, gen, chunkNum) {
  if (!validateChannelId(channelId)) return badRequest('Invalid channel ID');
  if (!MINTED_ID_REGEX.test(gen)) return badRequest('Invalid generation id');
  if (await isBlocked(env, channelId)) return jsonResponse({ error: 'Channel revoked' }, 403);
  if (!await checkRateLimit(env, channelId)) return jsonResponse({ error: 'Rate limit exceeded. Try again later.' }, 429);

  const body = await request.arrayBuffer();
  if (body.byteLength > MAX_CHUNK_SIZE) return badRequest('Chunk too large');

  // TTL per store: canonical = none (lifecycle is keep-2 + GC — a rarely-rewritten library
  // must never expire, design H1); device-state = 90d, refreshed by every push.
  await env.RELAY_KV.put(`relay:${channelId}:${store.seg}:${gen}:chunk:${chunkNum}`, body,
    store.ttl ? { expirationTtl: store.ttl } : undefined);
  return jsonResponse({ ok: true, gen, chunk: chunkNum, bytes: body.byteLength });
}

// The generation manifest is the ATOMIC COMMIT: written last, single-key put.
async function handlePutGenManifest(request, env, store, channelId, gen) {
  if (!validateChannelId(channelId)) return badRequest('Invalid channel ID');
  if (!MINTED_ID_REGEX.test(gen)) return badRequest('Invalid generation id');
  if (await isBlocked(env, channelId)) return jsonResponse({ error: 'Channel revoked' }, 403);
  if (!await checkRateLimit(env, channelId)) return jsonResponse({ error: 'Rate limit exceeded. Try again later.' }, 429);

  const manifest = await request.text();
  try { JSON.parse(manifest); } catch { return badRequest('Manifest must be valid JSON'); }

  await env.RELAY_KV.put(`relay:${channelId}:${store.seg}:${gen}:manifest`, manifest,
    store.ttl ? { expirationTtl: store.ttl } : undefined);

  // Lifecycle telemetry: first successful commit per channel (mirrors legacy manifest upload)
  const usedKey = `lifecycle:${channelId}:used`;
  if (!await env.RELAY_KV.get(usedKey)) {
    await env.RELAY_KV.put(usedKey, new Date().toISOString());
    await fireGoatCounter(env, 'relay-channel-used');
  }

  return jsonResponse({ ok: true, gen });
}

async function handleGenList(env, store, channelId) {
  if (!validateChannelId(channelId)) return badRequest('Invalid channel ID');
  if (await isBlocked(env, channelId)) return jsonResponse({ error: 'Channel revoked' }, 403);

  const prefix = `relay:${channelId}:${store.seg}:`;
  const gens = [];
  let cursor;
  for (let page = 0; page < LIST_PAGE_CAP; page++) {
    const res = await env.RELAY_KV.list({ prefix, cursor });
    for (const k of res.keys) {
      const rest = k.name.slice(prefix.length); // "{gen}:manifest" or "{gen}:chunk:{i}"
      if (rest.endsWith(':manifest')) gens.push(rest.slice(0, -':manifest'.length));
    }
    if (res.list_complete) break;
    cursor = res.cursor;
  }
  return jsonResponse({ ok: true, gens });
}

async function handleGetGenChunk(env, store, channelId, gen, chunkNum) {
  if (!validateChannelId(channelId)) return badRequest('Invalid channel ID');
  if (!MINTED_ID_REGEX.test(gen)) return badRequest('Invalid generation id');
  if (await isBlocked(env, channelId)) return jsonResponse({ error: 'Channel revoked' }, 403);

  const chunk = await env.RELAY_KV.get(`relay:${channelId}:${store.seg}:${gen}:chunk:${chunkNum}`, 'arrayBuffer');
  if (!chunk) return new Response('Chunk not found', { status: 404 });
  return new Response(chunk, { headers: { 'Content-Type': 'application/octet-stream' } });
}

async function handleGetGenManifest(env, store, channelId, gen) {
  if (!validateChannelId(channelId)) return badRequest('Invalid channel ID');
  if (!MINTED_ID_REGEX.test(gen)) return badRequest('Invalid generation id');
  if (await isBlocked(env, channelId)) return jsonResponse({ error: 'Channel revoked' }, 403);

  const manifest = await env.RELAY_KV.get(`relay:${channelId}:${store.seg}:${gen}:manifest`);
  if (!manifest) return new Response('Generation manifest not found', { status: 404 });
  return new Response(manifest, { headers: { 'Content-Type': 'application/json' } });
}

// DELETE /gen/{ch}/{gen} — GC. The one server-side guard: never delete the generation the
// pointer currently names (a client bug must not be able to torch the live canonical).
// Keep-2 and the 1h grace age are client discipline.
async function handleDeleteGen(env, store, channelId, gen) {
  if (!validateChannelId(channelId)) return badRequest('Invalid channel ID');
  if (!MINTED_ID_REGEX.test(gen)) return badRequest('Invalid generation id');
  if (await isBlocked(env, channelId)) return jsonResponse({ error: 'Channel revoked' }, 403);

  const pointerStr = await env.RELAY_KV.get(`relay:${channelId}:${store.ptr}`);
  if (pointerStr) {
    try {
      if (JSON.parse(pointerStr).gen === gen) {
        return jsonResponse({ error: 'Refusing to delete the currently-pointed generation' }, 409);
      }
    } catch { /* unparseable pointer — fall through, deletion allowed */ }
  }

  const manifestKey = `relay:${channelId}:${store.seg}:${gen}:manifest`;
  const manifestStr = await env.RELAY_KV.get(manifestKey);
  const deletes = [env.RELAY_KV.delete(manifestKey)];
  let chunkCount = 1;
  if (manifestStr) {
    try { chunkCount = JSON.parse(manifestStr).chunkCount || 1; } catch { /* best effort */ }
  }
  for (let i = 0; i < chunkCount; i++) {
    deletes.push(env.RELAY_KV.delete(`relay:${channelId}:${store.seg}:${gen}:chunk:${i}`));
  }
  await Promise.all(deletes);
  return jsonResponse({ ok: true, gen, deleted: deletes.length });
}

// PUT /pointer/{ch} — the pointer flip. Single-key put = atomic; a race between two
// writers is benign (worst case: points at an older COMPLETE generation; self-heals).
async function handlePutPointer(request, env, store, channelId) {
  if (!validateChannelId(channelId)) return badRequest('Invalid channel ID');
  if (await isBlocked(env, channelId)) return jsonResponse({ error: 'Channel revoked' }, 403);
  if (!await checkRateLimit(env, channelId)) return jsonResponse({ error: 'Rate limit exceeded. Try again later.' }, 429);

  let gen;
  try { gen = (await request.json()).gen; } catch { return badRequest('Invalid JSON body'); }
  if (!gen || !MINTED_ID_REGEX.test(gen)) return badRequest('Invalid generation id');

  // Guard: only ever point at a generation whose manifest exists (commit-before-flip).
  const manifest = await env.RELAY_KV.get(`relay:${channelId}:${store.seg}:${gen}:manifest`);
  if (!manifest) return jsonResponse({ error: 'Generation not committed (no manifest)' }, 409);

  await env.RELAY_KV.put(`relay:${channelId}:${store.ptr}`, JSON.stringify({ gen, flippedAt: Date.now() }),
    store.ttl ? { expirationTtl: store.ttl } : undefined);
  return jsonResponse({ ok: true, gen });
}

async function handleGetPointer(env, store, channelId) {
  if (!validateChannelId(channelId)) return badRequest('Invalid channel ID');
  if (await isBlocked(env, channelId)) return jsonResponse({ error: 'Channel revoked' }, 403);

  const pointer = await env.RELAY_KV.get(`relay:${channelId}:${store.ptr}`);
  if (!pointer) return new Response('No pointer', { status: 404 });
  return new Response(pointer, { headers: { 'Content-Type': 'application/json' } });
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

  // Delete all data for this channel (read manifest first for precise chunk count)
  const manifestStr = await env.RELAY_KV.get(`relay:${channelId}:manifest`);
  const deletes = [
    env.RELAY_KV.delete(`relay:${channelId}:manifest`),
    env.RELAY_KV.delete(`relay:${channelId}:device-state`)
  ];
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

  // New-format keys (mailbox letters, generations, pointer) — enumerate by prefix and wipe.
  // Revocation's promise is "all data deleted"; it must cover the redesign layout too.
  for (const prefix of [`relay:${channelId}:mail:`, `relay:${channelId}:gen:`, `relay:${channelId}:dstate:`]) {
    let cursor;
    for (let page = 0; page < LIST_PAGE_CAP; page++) {
      const res = await env.RELAY_KV.list({ prefix, cursor });
      await Promise.all(res.keys.map(k => env.RELAY_KV.delete(k.name)));
      if (res.list_complete) break;
      cursor = res.cursor;
    }
  }
  await env.RELAY_KV.delete(`relay:${channelId}:pointer`);
  await env.RELAY_KV.delete(`relay:${channelId}:dstate-pointer`);

  // Add to blocklist
  await env.RELAY_KV.put(`blocklist:${channelId}`,
    JSON.stringify({ revokedAt: new Date().toISOString(), reason: 'user-revoked' }));

  // Lifecycle telemetry (user-initiated revocations are normal events, not security alerts)
  await fireGoatCounter(env, 'relay-channel-revoked');

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

  // v7.5.0 - SAMPLED counting: 1-in-SAMPLE requests bump the persisted count by SAMPLE
  // (expected value identical), dividing the counter's KV write cost by SAMPLE — it was
  // ~half of ALL KV writes (one per authenticated request). ENFORCEMENT runs on EVERY
  // request against the persisted approximate count; only the write-back is sampled.
  // The counter was always best-effort/approximate; this changes granularity, not semantics.
  const sampledThisRequest = Math.random() < 1 / RATE_LIMIT_SAMPLE;
  if (sampledThisRequest) data.count += RATE_LIMIT_SAMPLE;

  if (data.count > RATE_LIMIT_MAX_WRITES) {
    // Auto-blocklist on extreme abuse (10x normal limit)
    if (data.count >= RATE_LIMIT_AUTO_BLOCK) {
      await env.RELAY_KV.put(`blocklist:${channelId}`,
        JSON.stringify({ revokedAt: new Date().toISOString(), reason: 'rate-limit-auto' }));
      await sendAlert(env, 'Channel auto-blocked',
        `Channel ${channelId} exceeded ${RATE_LIMIT_AUTO_BLOCK} writes/hour and was auto-blocked.\nTime: ${new Date().toISOString()}`);
      await fireGoatCounter(env, 'relay-channel-blocked');
    }
    return false; // Rate limited
  }

  // Best-effort counter persist, only on sampled requests. (Still guarded: KV allows ~1
  // write/sec PER KEY; losing an increment must never fail the caller's actual write —
  // found by the Phase 1 harness when counter 429s were 500ing real writes.)
  if (sampledThisRequest) {
    try {
      await env.RELAY_KV.put(key, JSON.stringify(data), { expirationTtl: 7200 }); // 2hr TTL
    } catch { /* count update skipped — approximate counting is fine */ }
  }
  return true; // Allowed
}

// --- Telemetry ---

async function fireGoatCounter(env, eventName) {
    try {
        await fetch(`https://readerwrangler.goatcounter.com/count?p=/event/${eventName}`, {
            method: 'GET',
            headers: { 'User-Agent': 'ReaderWrangler-Relay/1.0' }
        });
    } catch { /* best-effort — telemetry failure must not affect the request */ }
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

// --- Usage Monitoring (Cron) ---

async function queryCloudflareGraphQL(env, query, variables) {
  const resp = await fetch('https://api.cloudflare.com/client/v4/graphql', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${env.CF_API_TOKEN}`
    },
    body: JSON.stringify({ query, variables })
  });
  if (!resp.ok) throw new Error(`GraphQL HTTP ${resp.status}`);
  const json = await resp.json();
  if (json.errors && json.errors.length) throw new Error(json.errors[0].message);
  return json.data;
}

async function fetchUsage(env) {
  const now = new Date();
  const todayStr = now.toISOString().slice(0, 10);
  const accountId = env.CF_ACCOUNT_ID;

  // Worker requests
  const reqData = await queryCloudflareGraphQL(env, `
    query ($accountTag: string!, $date: string!) {
      viewer {
        accounts(filter: { accountTag: $accountTag }) {
          workersInvocationsAdaptive(filter: { date: $date }, limit: 1) {
            sum { requests }
          }
        }
      }
    }
  `, { accountTag: accountId, date: todayStr });

  const reqRows = reqData.viewer.accounts[0]?.workersInvocationsAdaptive || [];
  const requests = reqRows.length ? reqRows[0].sum.requests : 0;

  // KV operations
  const kvData = await queryCloudflareGraphQL(env, `
    query ($accountTag: string!, $date: string!) {
      viewer {
        accounts(filter: { accountTag: $accountTag }) {
          kvOperationsAdaptiveGroups(filter: { date: $date }, limit: 10) {
            dimensions { actionType }
            sum { requests }
          }
        }
      }
    }
  `, { accountTag: accountId, date: todayStr });

  const kvOps = kvData.viewer.accounts[0]?.kvOperationsAdaptiveGroups || [];
  let kvReads = 0, kvWrites = 0, kvDeletes = 0;
  for (const row of kvOps) {
    const action = row.dimensions.actionType;
    const count = row.sum.requests;
    if (action === 'read') kvReads = count;
    else if (action === 'write') kvWrites = count;
    else if (action === 'delete') kvDeletes = count;
  }

  // KV storage
  const storageData = await queryCloudflareGraphQL(env, `
    query ($accountTag: string!, $date: string!) {
      viewer {
        accounts(filter: { accountTag: $accountTag }) {
          kvStorageAdaptiveGroups(filter: { date: $date }, limit: 1) {
            max { byteCount }
          }
        }
      }
    }
  `, { accountTag: accountId, date: todayStr });

  const storageRows = storageData.viewer.accounts[0]?.kvStorageAdaptiveGroups || [];
  const storageBytes = storageRows.length ? storageRows[0].max.byteCount : 0;
  const kvStorageMB = Math.round(storageBytes / (1024 * 1024) * 10) / 10;

  return { requests, kvReads, kvWrites, kvDeletes, kvStorageMB };
}

async function checkUsageThresholds(env) {
  if (!env.CF_API_TOKEN || !env.CF_ACCOUNT_ID) return;

  const usage = await fetchUsage(env);
  const todayStr = new Date().toISOString().slice(0, 10);
  const stateKey = `usage-alert:${todayStr}`;

  const raw = await env.RELAY_KV.get(stateKey);
  const alerted = raw ? JSON.parse(raw) : {};

  let alertsSent = false;
  for (const [key, { limit, label }] of Object.entries(CF_LIMITS)) {
    const current = usage[key];
    const pct = (current / limit) * 100;

    for (const threshold of THRESHOLDS) {
      const alertKey = `${key}:${threshold}`;
      if (pct >= threshold && !alerted[alertKey]) {
        const unitSuffix = key === 'kvStorageMB' ? ' MB' : '';
        await sendAlert(env, `Usage threshold: ${label} at ${threshold}%`,
          `${label} has reached ${threshold}% of the daily free tier limit.\n` +
          `Current: ${current.toLocaleString()}${unitSuffix} / ${limit.toLocaleString()}${unitSuffix}\n` +
          `Time: ${new Date().toISOString()}`
        );
        alerted[alertKey] = true;
        alertsSent = true;
      }
    }
  }

  if (alertsSent) {
    await env.RELAY_KV.put(stateKey, JSON.stringify(alerted), { expirationTtl: 172800 }); // 2 day TTL
  }
}

async function sendDailySummary(env) {
  if (!env.CF_API_TOKEN || !env.CF_ACCOUNT_ID) return;

  const usage = await fetchUsage(env);
  const todayStr = new Date().toISOString().slice(0, 10);

  const lines = [];
  for (const [key, { limit, label }] of Object.entries(CF_LIMITS)) {
    const current = usage[key];
    const pct = ((current / limit) * 100).toFixed(1);
    const unitSuffix = key === 'kvStorageMB' ? ' MB' : '';
    const currentStr = current.toLocaleString() + unitSuffix;
    const limitStr = limit.toLocaleString() + unitSuffix;
    lines.push(`${label.padEnd(16)} ${currentStr.padStart(10)} / ${limitStr.padStart(10)}  (${pct}%)`);
  }

  const body = `ReaderWrangler Relay - Daily Usage Summary\nDate: ${todayStr}\n\n${lines.join('\n')}`;
  await sendAlert(env, `Daily usage summary - ${todayStr}`, body);
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
