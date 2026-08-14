# Relay Ops Runbook

How to deploy, test, and — if ever needed — recreate the ReaderWrangler relay from scratch.
Verified against the live account 2026-08-14.

**Config vs data:** everything below recreates *infrastructure only*. The KV **contents**
(library chunks, device-state) are not in any config — a rebuilt relay starts empty, and the
data returns via the next fetch / app upload. That is by design (relay = post office, not
vault; see `docs/design/DATA-DURABILITY.md`).

---

## What exists

| Piece | Prod | Dev |
|---|---|---|
| Worker | `readerwrangler-relay` | `readerwrangler-relay-dev` |
| URL | `readerwrangler-relay.readerwrangler.workers.dev` | `readerwrangler-relay-dev.readerwrangler.workers.dev` |
| KV namespace | `RELAY_KV` → id `4a445b41…` | `dev-RELAY_KV` → id `58116108…` |
| Crons | usage alerts (every 30 min) + daily summary (23:55 UTC) | none (alerts would double-send) |
| Secrets | 4 (see below) | none (alert/cron paths only; dev doesn't run them) |

Account: `lewis.ron.c@gmail.com`, account id `fd7a55c0…` (also in `wrangler.toml` as `CF_ACCOUNT_ID`).
All of this except namespace creation and secrets is declared in [`wrangler.toml`](wrangler.toml).

## Everyday commands

```sh
cd relay
npx wrangler deploy              # deploy PROD worker
npx wrangler deploy --env dev    # deploy DEV worker (isolated KV; safe to break)
npx wrangler tail --env dev      # live logs from the dev worker
npx wrangler secret list         # what secrets prod holds (names only)
```

Smoke test after any deploy (404 "No data available" = healthy empty channel):

```sh
curl https://readerwrangler-relay-dev.readerwrangler.workers.dev/status/00000000-0000-4000-8000-000000000000
```

## Recreate from scratch

1. **Auth** — `npx wrangler login` (browser OAuth; confirm with `npx wrangler whoami`).
2. **KV namespaces** — `wrangler.toml` *references* namespace ids but does not create them:
   ```sh
   npx wrangler kv namespace create RELAY_KV              # prod
   npx wrangler kv namespace create RELAY_KV --env dev    # dev
   ```
   Paste each printed id into the matching `id`/`preview_id` in `wrangler.toml`.
3. **Secrets (prod worker only)** — `npx wrangler secret put <NAME>` for each:

   | Secret | What it is |
   |---|---|
   | `RESEND_API_KEY` | Resend.com API key — sends alert emails |
   | `ALERT_TO_EMAIL` | where usage alerts go |
   | `CF_API_TOKEN` | Cloudflare API token (read analytics) — the usage-threshold cron queries account usage with it |
   | `TEST_ALERT_KEY` | shared secret guarding the `/test-alert` endpoint |

   Full alert-pipeline setup (Resend account, DNS) is in `docs/design/RELAY-SECURITY-PLAN.md`.
4. **Deploy** — `npx wrangler deploy`, then `npx wrangler deploy --env dev`.
5. **Smoke test** — the curl above, against both workers.
6. **Point the clients** — the relay URL is configured in `relay-client.js` (used by the app
   and all fetchers). Only changes if the worker names change.

## Rules of thumb

- **Worker code changes: dev first** (`--env dev`), exercise them, then plain `deploy` to prod.
- Prod and dev run the **same `relay-worker.js`** — they differ only in name, KV namespace, crons, secrets.
- Never point a test client at the prod worker; the dev worker exists precisely so that's never necessary.
