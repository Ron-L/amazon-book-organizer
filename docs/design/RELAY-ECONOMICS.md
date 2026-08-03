# Relay write economics (Cloudflare free-tier)

_Moved verbatim from TODO.md during the 6.12.0 TODO restructure (2026-08-03). **The debounce FIX shipped (alpha.58: 15s→60s + flush-on-leave).** The remaining task is to revisit the free-vs-paid launch plan with real numbers, before PUBLIC launch._

---

- Real data 2026-07-03: one ~2.5h organizing session = **495 / 1,000 KV writes** — and that daily cap is **SHARED across ALL users** (one Cloudflare account), not per-user. Storage ~**40 MB/user** → ~25 users fills the 1 GB free tier. (The earlier "50–100 free users" estimate was off ~20–50× for the onboarding-organizing burst.)
- **Root cause (fixed):** the device-state push (readerwrangler.js ~L3100) was debounced only **15s**, so active organizing (natural >15s pauses) fired `putDeviceState` ~3–4×/min → ~500 writes/session. Not per-action — per-pause.
- **Fix (shipped, alpha.58):** raised the debounce to 60s AND flush on **tab blur / visibilitychange / beforeunload** instead of periodic ticking — cuts writes ~15–50×. (Optional future: a manual "Sync now.")
- **Still TODO — revisit the free-vs-paid launch plan** with real numbers (Workers Paid ~$5/mo ≈ ~1M writes/month — *verify current limits*). Also consider trimming the device-state payload size if it carries full book data it doesn't need.
