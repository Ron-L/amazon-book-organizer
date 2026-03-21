# Relay Security Plan — Credential Revocation + Abuse Protection

**Created**: 2026-03-20
**Status**: Design (not yet implemented)

---

## Problem Statement

Two security gaps in the relay architecture:

1. **Credential exposure** — A user accidentally publishes their `channelId` + `passphrase`. An attacker with both can access the relay data, derive the AES-256 key, and decrypt everything. The user has no way to revoke credentials or wipe their data.

2. **Cost abuse** — An attacker (using leaked or self-generated credentials) floods the relay with writes to drive up Cloudflare usage costs. The Worker currently has no rate limiting or abuse detection.

---

## Architecture Context

| Component | Role |
|-----------|------|
| `channelId` | UUID used as the KV key prefix and PBKDF2 salt. The Worker uses it as an address — it's in the URL path. |
| `passphrase` | Secret key material for PBKDF2 → AES-256-GCM key derivation. **Never sent to or stored by the Worker.** Used only by endpoints (fetcher, app, mobile) for client-side encryption/decryption. |
| Relay Worker | Stores/retrieves opaque encrypted blobs keyed by `channelId`. Cannot read the data. |
| CORS | Origin-restricted to allowed domains — prevents browser-based abuse but not `curl`/scripts. |

---

## Phase 1: Self-Service Revocation + In-Worker Rate Limiting

**Trigger**: Implement now (free Cloudflare tier)

### 1A. Credential Revocation

#### Worker Changes (`relay-worker.js`)

**New endpoint**: `POST /revoke/{channelId}`

```
Request body: { "proof": "<SHA-256(passphrase + channelId) as hex>" }
```

Flow:
1. App computes `SHA-256(passphrase + channelId)` client-side using Web Crypto API
2. App sends `POST /revoke/{channelId}` with the hash as proof of ownership
3. Worker receives the hash — cannot reverse it, only verifies ownership
4. Worker stores the hash in KV: `relay:{channelId}:revocation-proof` (no TTL — permanent)
5. Worker deletes all data keys:
   - `relay:{channelId}:manifest`
   - `relay:{channelId}:chunk:0` through `chunk:N` (enumerate via manifest or try 0-99)
   - `relay:{channelId}:device-state`
6. Worker adds channelId to blocklist: `blocklist:{channelId}` = `{ revokedAt, proof }` (no TTL)
7. Returns `200 { ok: true, message: "Channel revoked and data deleted" }`

**Blocklist check** — add to every handler, before any KV read/write:

```javascript
async function isBlocked(env, channelId) {
    const entry = await env.RELAY_KV.get(`blocklist:${channelId}`);
    return !!entry;
}
```

If blocked, return `403 { error: "Channel revoked" }`.

**Cost note**: The blocklist check is one KV read per request. On the free tier (100K reads/day), this is fine. If abuse volume is high enough to exceed that, Phase 2's edge-level blocking is needed.

#### App Changes (`readerwrangler.js`)

**New button in Relay Setup Step 1** (when keys exist):
- Label: "Revoke & Delete"
- Tooltip: "Permanently deletes all relay data and blocks these credentials from future use"
- Confirmation dialog: "This will permanently delete all data on the relay and block these credentials. You'll need to generate new keys. Continue?"
- On confirm:
  1. Compute `SHA-256(passphrase + channelId)` via Web Crypto
  2. `POST /revoke/{channelId}` with proof
  3. Clear local credentials from localStorage
  4. Close Relay Setup dialog
  5. Show toast: "Relay credentials revoked. Generate new keys to continue syncing."

#### Client Changes (`relay-client.js`)

**New function**: `RWRelay.revokeChannel()`
- Computes proof hash from current `_passphrase` + `_channelId`
- Sends POST to `/revoke/{channelId}`
- Clears `_channelId`, `_passphrase`, `_cryptoKey`
- Removes `RELAY_STORAGE_KEY` from localStorage

### 1B. In-Worker Rate Limiting

Per-channelId write throttling using a lightweight KV counter.

#### Worker Changes

**New KV key**: `ratelimit:{channelId}` = `{ count, windowStart }`

```javascript
async function checkRateLimit(env, channelId) {
    const key = `ratelimit:${channelId}`;
    const now = Date.now();
    const WINDOW_MS = 3600000; // 1 hour
    const MAX_WRITES = 200;    // per hour (normal usage: ~10-20)

    const raw = await env.RELAY_KV.get(key);
    let data = raw ? JSON.parse(raw) : { count: 0, windowStart: now };

    // Reset window if expired
    if (now - data.windowStart > WINDOW_MS) {
        data = { count: 0, windowStart: now };
    }

    data.count++;

    if (data.count > MAX_WRITES) {
        // Auto-blocklist on extreme abuse (10x normal limit)
        if (data.count > MAX_WRITES * 10) {
            await env.RELAY_KV.put(`blocklist:${channelId}`,
                JSON.stringify({ revokedAt: new Date().toISOString(), reason: 'rate-limit-auto' }));
            // Fire email alert via Cloudflare MailChannels
            await sendAlert(env, 'Channel auto-blocked',
                `Channel ${channelId} exceeded ${MAX_WRITES * 10} writes/hour and was auto-blocked.`);
        }
        return false; // Rate limited
    }

    await env.RELAY_KV.put(key, JSON.stringify(data), { expirationTtl: 7200 }); // 2hr TTL
    return true; // Allowed
}
```

**Apply to write endpoints only** (reads are cheap):
- `handleUploadChunk`
- `handleUploadManifest`
- `handlePutDeviceState`

If rate limited, return `429 { error: "Rate limit exceeded. Try again later." }`

#### Cost Analysis (Phase 1)

| Operation | KV reads/request | KV writes/request |
|-----------|-----------------|-------------------|
| Blocklist check | +1 read | 0 |
| Rate limit check | +1 read | +1 write (counter update) |
| **Total overhead per write request** | +2 reads | +1 write |
| **Total overhead per read request** | +1 read | 0 |

Free tier limits: 100K reads/day, 1K writes/day. With a few users doing normal activity (~50 requests/day each), this is well within limits. If abuse pushes toward limits, Phase 2 handles it at the edge.

### 1C. Notification (Cloudflare Email Routing)

Email alerts via Cloudflare's own Email Routing service — no external vendors, no new apps. The Worker calls Cloudflare's Email Workers API (a `fetch()` to the MailChannels integration) to send email to your inbox.

#### Cloudflare Setup

1. **Enable Email Routing** on your domain in Cloudflare Dashboard → Email → Email Routing
2. **Create a destination address** — your personal email (Cloudflare sends a verification link)
3. **Create a route** — e.g., `alerts@readerwrangler.com` → your personal email
4. **Add environment variables** to the Worker:
   - `ALERT_FROM_EMAIL` = `alerts@readerwrangler.com`
   - `ALERT_TO_EMAIL` = your personal email

#### Worker Changes

```javascript
async function sendAlert(env, subject, message) {
    if (!env.ALERT_TO_EMAIL) return;
    try {
        // Cloudflare Workers can send email via the MailChannels integration
        // (free, built into Workers — no API key needed)
        await fetch('https://api.mailchannels.net/tx/v1/send', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                personalizations: [{ to: [{ email: env.ALERT_TO_EMAIL }] }],
                from: { email: env.ALERT_FROM_EMAIL, name: 'ReaderWrangler Relay' },
                subject: `🚨 ${subject}`,
                content: [{ type: 'text/plain', value: message }]
            })
        });
    } catch { /* best-effort — don't let alert failure break the request */ }
}
```

**Note**: MailChannels integration with Cloudflare Workers is free and requires no API key — Cloudflare authorizes the Worker automatically via your domain's DNS (a TXT record). If MailChannels discontinues the free integration, the fallback is Cloudflare's native Email Workers binding (same setup, slightly different API).

**Triggered on**:
- Auto-blocklist (rate limit exceeded 10x) — subject: "Channel auto-blocked"
- Manual revocation (user revoked their channel) — subject: "Channel revoked"

**Setup**: `wrangler secret put ALERT_TO_EMAIL` and `wrangler secret put ALERT_FROM_EMAIL`. Add the MailChannels DNS TXT record per Cloudflare docs.

---

## Phase 2: Edge-Level Protection (Paid Cloudflare)

**Trigger**: Upgrade to Workers Paid ($5/month) when user base or abuse risk warrants it

### 2A. Cloudflare Rate Limiting Rules (Edge)

Rate limiting at the edge blocks requests **before** the Worker executes — no Worker invocation cost.

**Dashboard → Security → WAF → Rate Limiting Rules:**

| Rule | Match | Threshold | Action |
|------|-------|-----------|--------|
| Per-IP burst | All `/upload/*` and `/device-state/*` POST requests | 100 requests/10 seconds per IP | Block for 1 hour |
| Per-IP sustained | All POST requests | 1000 requests/hour per IP | Block for 24 hours |
| Global safety | All requests | 50,000 requests/hour total | Challenge (CAPTCHA) |

These are evaluated at the Cloudflare edge before hitting the Worker. Blocked requests don't count toward Worker invocation limits.

### 2B. Cloudflare Notifications

**Dashboard → Notifications → Create:**

| Notification | Trigger | Channel |
|-------------|---------|---------|
| Usage spike | Worker requests exceed 80% of daily limit | Email |
| Error rate | Worker error rate > 5% over 5 minutes | Email |
| Rate limit hits | Rate limiting rule triggered > 50 times/hour | Email + webhook |

### 2C. Cron-Based Abuse Scan

**Cloudflare Cron Trigger** (Workers Paid feature) — runs daily:

```javascript
// In wrangler.toml:
// [triggers]
// crons = ["0 6 * * *"]  # Daily at 6 AM UTC

export default {
    async scheduled(event, env) {
        // List all ratelimit:* keys, flag any with high counts
        // List all blocklist:* keys, report count
        // Send daily summary via webhook
        await sendAlert(env, `Daily report: ${blockedCount} blocked channels, ${activeLimits} rate-limited`);
    }
};
```

### 2D. Per-Channel Write Budget (Enhanced)

Replace the in-memory counter (Phase 1) with Cloudflare Durable Objects for accurate distributed counting. Durable Objects provide strongly consistent per-channelId state without the KV eventual-consistency gap that a sophisticated attacker could exploit.

**Only needed if**: multiple Workers are deployed or KV counter consistency becomes an issue. For single-Worker deployment, Phase 1 KV counter is sufficient.

---

## Phase Summary

| Phase | Tier | Cost | Protects Against |
|-------|------|------|-----------------|
| 1A: Revocation | Free | $0 | Leaked credentials — user self-serves data wipe + blocklist |
| 1B: Rate limiting | Free | $0 | Write flooding from a single channelId |
| 1C: Email alerts (Cloudflare) | Free | $0 | You get notified when something happens |
| 2A: Edge rate limiting | Paid | $5/mo | High-volume abuse before Worker executes (no invocation cost) |
| 2B: Notifications | Paid | $5/mo | Usage monitoring via email |
| 2C: Cron scan | Paid | $5/mo | Daily abuse summary |
| 2D: Durable Objects | Paid | $5/mo+ | Distributed counter accuracy (likely overkill) |

---

## What This Does NOT Protect Against

- **Determined attacker generating fresh credentials from rotating IPs**: They can keep creating new channelIds. Edge rate limiting per IP (Phase 2A) is the best mitigation. At extreme scale, Cloudflare's bot management (Enterprise tier) or requiring account registration would be needed — neither warranted at current scale.
- **Cloudflare KV storage exhaustion**: An attacker flooding many channelIds could fill KV storage. The 10-day TTL on library data and the per-channelId rate limit (Phase 1B) bound this. KV free tier allows 1 GB storage.
- **Reading existing data with leaked credentials**: Between leak discovery and revocation, data is readable. The 90-day device-state TTL is the maximum exposure window. Revocation (Phase 1A) closes this immediately upon discovery.

---

## Implementation Order

1. **Phase 1C first** — email alerts via Cloudflare MailChannels (smallest change, immediate visibility)
2. **Phase 1B** — rate limiting (protect against cost abuse)
3. **Phase 1A** — revocation endpoint + app UI (user-facing feature, needs more testing)
4. **Phase 2** — when upgrading to paid plan

---

## Cloudflare Configuration Instructions

### Prerequisites

- Cloudflare account with `readerwrangler.com` domain
- `wrangler` CLI installed (already in `relay/node_modules/.bin/`)
- Authenticated: `npx wrangler login` (if not already)

### Phase 1C: Email Alerts Setup

#### Step 1: Enable Email Routing on your domain

1. Cloudflare Dashboard → select `readerwrangler.com` domain
2. Left sidebar → **Email** → **Email Routing**
3. Click **Get started** if not already enabled
4. Follow the wizard — Cloudflare will add the required MX and TXT DNS records automatically

#### Step 2: Add destination email

1. Email Routing → **Destination addresses** tab
2. Click **Add destination address**
3. Enter your personal email address
4. Cloudflare sends a verification link — click it to confirm

#### Step 3: Create a routing rule

1. Email Routing → **Routing rules** tab
2. Click **Create address**
3. Custom address: `alerts` (creates `alerts@readerwrangler.com`)
4. Destination: select your verified personal email
5. Save

#### Step 4: Add DNS TXT record for MailChannels

MailChannels requires a DNS TXT record to authorize your domain to send email via their API from Cloudflare Workers.

1. Cloudflare Dashboard → **DNS** → **Records**
2. Add a TXT record:
   - **Name**: `_mailchannels`
   - **Content**: `v=mc1 cfid=readerwrangler-relay.workers.dev`
   - **TTL**: Auto
3. Save

The `cfid` value must match your Worker's subdomain (`readerwrangler-relay` from `wrangler.toml` name).

#### Step 5: Add Worker environment variables

```bash
cd relay
npx wrangler secret put ALERT_FROM_EMAIL
# Enter: alerts@readerwrangler.com

npx wrangler secret put ALERT_TO_EMAIL
# Enter: your personal email address
```

These are stored as encrypted secrets in Cloudflare — not in `wrangler.toml`, not in source code.

#### Step 6: Deploy the updated Worker

```bash
cd relay
npx wrangler deploy
```

### Phase 1B: Rate Limiting Setup

No Cloudflare configuration needed — rate limiting runs entirely in the Worker code using the existing KV namespace. Just deploy the updated Worker.

### Phase 1A: Revocation Setup

No Cloudflare configuration needed — the `/revoke/{channelId}` endpoint and `blocklist:` KV keys use the existing KV namespace. Just deploy the updated Worker.

---

## Testing Instructions

### Prerequisite: Your test channelId

Get your channelId from the app: File → Relay Setup → Step 1 shows the channel ID when keys are configured. Or from `localStorage`:

```javascript
JSON.parse(localStorage.getItem('readerwrangler-relay')).channelId
```

Substitute your channelId for `{CHANNEL_ID}` below.

Worker URL: `https://readerwrangler-relay.readerwrangler.workers.dev`

### Test 1C: Email Alerts

**Test with a temporary test endpoint** — add a `/test-alert` route to the Worker before deploying (remove after testing):

```javascript
// Temporary — add to route() function, remove after testing
match = path.match(/^\/test-alert$/);
if (match && request.method === 'POST') {
    await sendAlert(env, 'Test Alert', 'This is a test alert from the ReaderWrangler relay worker.');
    return jsonResponse({ ok: true, message: 'Alert sent' });
}
```

Then:

```bash
# Deploy with test route
cd relay && npx wrangler deploy

# Trigger test alert
curl -X POST https://readerwrangler-relay.readerwrangler.workers.dev/test-alert

# Expected: {"ok":true,"message":"Alert sent"}
# Check your email inbox (and spam folder) for the alert
# Subject: "🚨 Test Alert"
# From: ReaderWrangler Relay <alerts@readerwrangler.com>
```

**After confirming email arrives**: Remove the `/test-alert` route and redeploy.

**Troubleshooting**:
- No email? Check Cloudflare Dashboard → Workers → your worker → Logs (Real-time) for errors
- MailChannels 403? The `_mailchannels` DNS TXT record is missing or `cfid` doesn't match
- In spam? Add `alerts@readerwrangler.com` to your email contacts

### Test 1B: Rate Limiting

**Test 1B-a: Normal traffic (should pass)**

```bash
# Single write — should succeed
curl -X PUT \
  https://readerwrangler-relay.readerwrangler.workers.dev/device-state/{CHANNEL_ID} \
  -H "Content-Type: application/octet-stream" \
  -d "test-data"

# Expected: {"ok":true}
```

**Test 1B-b: Burst traffic (should throttle)**

```bash
# Send 250 rapid writes (exceeds MAX_WRITES=200/hour)
for i in $(seq 1 250); do
  curl -s -o /dev/null -w "%{http_code} " \
    -X PUT \
    https://readerwrangler-relay.readerwrangler.workers.dev/device-state/{CHANNEL_ID} \
    -H "Content-Type: application/octet-stream" \
    -d "test-data-$i"
done
echo ""

# Expected: first ~200 return 200, remaining return 429
```

**Test 1B-c: Auto-blocklist (10x threshold = 2000 writes)**

Not recommended to test in production — would require 2000 requests. Instead, temporarily lower `MAX_WRITES` to 5 in the code for testing:

```javascript
const MAX_WRITES = 5; // TEMP: lowered from 200 for testing
```

Then send 60 requests (10x of 5 = 50 triggers auto-block):

```bash
for i in $(seq 1 60); do
  curl -s -o /dev/null -w "%{http_code} " \
    -X PUT \
    https://readerwrangler-relay.readerwrangler.workers.dev/device-state/{CHANNEL_ID} \
    -H "Content-Type: application/octet-stream" \
    -d "test-data-$i"
done
echo ""

# Expected: first 5 return 200, next return 429, email alert sent
# Verify: check email for "Channel auto-blocked" alert
```

**After testing**: Restore `MAX_WRITES` to 200 and redeploy. Clean up the test blocklist entry:

```bash
# Remove test blocklist entry from KV
cd relay
npx wrangler kv:key delete --namespace-id=4a445b412fb34860a896cfc145a67b9b "blocklist:{CHANNEL_ID}"

# Remove test rate limit entry
npx wrangler kv:key delete --namespace-id=4a445b412fb34860a896cfc145a67b9b "ratelimit:{CHANNEL_ID}"
```

### Test 1A: Revocation

**Test 1A-a: Revoke via app UI**

1. Open ReaderWrangler with valid relay credentials
2. File → Relay Setup → Step 1
3. Click "Revoke & Delete"
4. Confirmation dialog appears — click Confirm
5. **Verify**:
   - Toast: "Relay credentials revoked..."
   - Relay Setup now shows no keys (Step 1 shows generate/enter/load options)
   - Check email for "Channel revoked" alert

**Test 1A-b: Verify blocklist works**

```bash
# Try to read device state with the revoked channelId
curl https://readerwrangler-relay.readerwrangler.workers.dev/device-state/{REVOKED_CHANNEL_ID}

# Expected: 403 {"error":"Channel revoked"}
```

```bash
# Try to write to the revoked channelId
curl -X PUT \
  https://readerwrangler-relay.readerwrangler.workers.dev/device-state/{REVOKED_CHANNEL_ID} \
  -H "Content-Type: application/octet-stream" \
  -d "test"

# Expected: 403 {"error":"Channel revoked"}
```

**Test 1A-c: Verify data was deleted**

```bash
# Check all data paths
curl https://readerwrangler-relay.readerwrangler.workers.dev/status/{REVOKED_CHANNEL_ID}
# Expected: 403 (blocked, not 404)

curl https://readerwrangler-relay.readerwrangler.workers.dev/device-state/{REVOKED_CHANNEL_ID}
# Expected: 403 (blocked, not 404)
```

**Test 1A-d: Generate new credentials and verify they work**

1. In the app, generate new credentials (Relay Setup → Step 1 → Generate)
2. New channelId is created
3. Run fetcher → import → verify data flows through relay normally
4. The old revoked channelId remains blocked; new one works fine

### Test: Existing App Functionality Still Works

After deploying all Phase 1 changes, verify no regression in normal operations:

- [ ] Fetcher: run library fetch → upload completes → import from relay succeeds
- [ ] Device state: edit something in app → wait 15s → check mobile reflects change
- [ ] Mobile: load mobile view → library appears
- [ ] Test Connection: Relay Setup → Test Connection → shows green OK
- [ ] Backup restore: File → Restore Backup → works normally

### Monitoring After Deploy

Check the Cloudflare dashboard for the first few days:

1. **Workers → Overview** — invocation count should stay in normal range (~50-80/day for your solo usage)
2. **Workers → your worker → Logs** — no unexpected errors
3. **KV → Browse** — no unexpected `blocklist:` or `ratelimit:` keys appearing
