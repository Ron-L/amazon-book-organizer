# Relay write economics (Cloudflare KV)

_Moved verbatim from TODO.md during the 6.12.0 TODO restructure (2026-08-03). **The debounce FIX shipped (alpha.58: 15s→60s + flush-on-leave).** Superseded below by the 2026-08 capacity analysis + the 7.5.0 write-diet levers._

---

## Capacity analysis (2026-08-28, verified against current Cloudflare pricing; levers shipped 7.5.0)

Trigger: Cloudflare usage-alert emails at 25% then 50% of the daily free-tier write quota, two days
running, with ONE active user (Ron). All numbers verified by web search against Cloudflare's
published pricing at analysis time.

**Platform facts**
- Free tier, per-ACCOUNT (shared by every RW user), resets 00:00 UTC daily: **1,000 writes,
  1,000 lists** (lists share the writes' scarcity — a poll is a list), 1,000 deletes,
  100k reads, 1 GB storage.
- **Workers Paid, $5/mo flat**: 1M combined writes+deletes+lists/month + 10M reads included,
  then metered — ~$5 per additional 1M writes, ~$0.50 per additional 1M reads, ~$0.50/GB-mo
  storage. There is no higher tier — beyond the included million it's just usage billing.

**Observed load (pre-7.5.0)**: a Ron-like user ≈ **6–10k combined ops/month** (pushes ×
journal chunks + manifests + pointer, mailbox letters, rate-limit counter writes, 10-min
poll = ~144 lists/day). Hence: free tier ≈ **3–5 active users**; Paid's included 1M ≈
**~100 users**; each additional ~100 users ≈ +$10–11/mo.

**The three levers (ALL SHIPPED in 7.5.0, 2026-08-29)**
1. **Sampled rate-limit counter** (worker) — the `ratelimit:{ch}` counter write was ~HALF of all
   KV writes (one per authenticated write). Now sampled 1-in-5 counting by 5; enforcement still
   evaluates every request against the persisted approximate count. ~-45% total writes.
2. **Journal-only device-state push** (relay-client) — the 7.2/7.3 transition double-write of the
   legacy single key retired; saves one full-payload write (~17 MB at Ron's size) per push.
3. **Visibility/focus-aware poll** (app) — flat 10-min timer (~144 lists/day/tab, hidden or not)
   → instant check on tab/window focus regain (90s dedupe), 20-min heartbeat focused, hourly
   visible-unfocused, NOTHING hidden. ~10–30 lists/day, and the banner is *faster* at the moment
   that matters (returning from a fetch tab).

**Post-levers capacity ≈ 2× — ~250 Ron-like users on the flat $5/mo**; free tier stretches to
roughly 6–10 while pre-launch. Storage stays the other ceiling: ~17 MB canonical + journal +
letters per user → the 1 GB free storage caps around ~25 users regardless of write diet
(Paid storage is ~$0.50/GB-mo — negligible).

**Launch posture**: go Workers Paid at (or shortly before) public launch; $5/mo covers the first
couple hundred active users. Next structural step if growth demands it is Phase 2 (Durable
Object per channel — moves counters and coordination out of KV entirely).

---

- Real data 2026-07-03: one ~2.5h organizing session = **495 / 1,000 KV writes** — and that daily cap is **SHARED across ALL users** (one Cloudflare account), not per-user. Storage ~**40 MB/user** → ~25 users fills the 1 GB free tier. (The earlier "50–100 free users" estimate was off ~20–50× for the onboarding-organizing burst.)
- **Root cause (fixed):** the device-state push (readerwrangler.js ~L3100) was debounced only **15s**, so active organizing (natural >15s pauses) fired `putDeviceState` ~3–4×/min → ~500 writes/session. Not per-action — per-pause.
- **Fix (shipped, alpha.58):** raised the debounce to 60s AND flush on **tab blur / visibilitychange / beforeunload** instead of periodic ticking — cuts writes ~15–50×. (Optional future: a manual "Sync now.")
- ~~Still TODO — revisit the free-vs-paid launch plan with real numbers~~ **DONE — see the 2026-08-28 capacity analysis above** (limits verified, levers shipped 7.5.0). Payload trimming folded into the RELAY-DELTA idea (design-only).

---

## Idea log — size-scaled per-channel quotas (Ron, 2026-08-17)

Post-7.0 (mailbox/generational sync), when Phase 2 fairness gets built: instead of one flat
per-channel allowance, **scale size-based limits (mailbox bytes, storage share) to the user's
library size**. Feasible even with end-to-end encryption — the worker can't read content but it
CAN meter **byte counts** per channel. Time-based limits (TTLs, rate windows) stay flat.

**Cold-start special case:** a brand-new user has library size 0, but their initial full fetch
is their largest-ever write — so size-0 channels get the MAX allowance; after the first merge,
calibrate the channel's limits from the observed canonical size.
