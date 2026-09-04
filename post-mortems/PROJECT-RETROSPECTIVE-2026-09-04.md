# Project Retrospective — overall to date (2026-09-04)

_Not a release post-mortem: a whole-project methods review at Ron's request, sourced from all 107 release
post-mortems, 172 CHANGELOG releases, 1,793 commits (2025-10-16 → 2026-09-04), the memory files, and TODO.
Frame: this is a retirement project, not an MVP — Ron's usage first; launch when his use cases are covered._

---

## Scale

~28,400 lines (app 19.5k, mobile, five fetchers, relay client + worker, storage) · 35 design docs ·
172 releases · 107 post-mortems · 11 months · one user whose library provably matches Amazon to the book.

## Velocity, by phase (commits/month)

| Phase | Months | Commits | Character |
|---|---|---|---|
| Foundation (v2-v3) | Oct-Dec '25 | 46 → 198 | 6-day releases, 14-letter iterations, lessons learned expensively |
| The sprint (v4-v5) | Jan-Feb '26 | 228 → **422** | Seven releases in one day (Jan 24); also the whack-a-mole era |
| Maturation (v6.0-6.11) | Mar | 277 | Steadier, bigger features |
| **The trough** | Apr-May | 24 → **3** | Near-silence — and not a failure: retirement-project rhythm |
| Deep work | Jun-Jul | 92, 75 | Six release-less weeks while 7.0.0's sync redesign gestated |
| Modern era | Aug-Sep | 228, ~18.5/day | 20 releases in 34 days; highest daily rate in project history |

**Verdict**: current velocity is the project's best ever *and* a different kind — January's was
churn-velocity (v4.15: six same-day patches; v5.0: ten in two days); August-September's is
compounding-velocity (the hardest work — sync rebuild, write economics, a full API investigation — with the
fewest same-day regressions). Sustainability and peak velocity co-occurring is rare; both are present.

## The single biggest finding: lessons only recently became load-bearing

The v3.3.2 post-mortem (**2025-11-11**) already proposed a complexity budget ("more than 3 iterations →
review approach"), a pattern library, and a PM template. v3.14.0 then spent 26 alphas on whack-a-mole in
December; v6.11.2 spent 9 alphas in April before the reframing question the November rule would have forced
at alpha 3. **Lesson-to-operationalization latency ≈ 9 months** while lessons lived in files nobody re-read.
Since the persistent memory system began carrying lessons into every session (late Aug '26): zero relearned
lessons, and new ones are named and filed the same hour they're earned.

Mechanism note (Ron asked): the memory system is session infrastructure that became available late August —
its index loads into every session, and its standing instruction is to record corrections and lessons as
they happen. Guaranteeing the habit going forward is now part of the release checklist (post-mortem → memory
update), so it survives any session, model, or context reset.

## What demonstrably works — keep all of it

1. **Version discipline** — alpha-per-test, commit-before-test, build markers on every surface.
2. **Ron as a same-hour test loop** — the "one minute of real use" rule catches something nearly every
   release; only works because tester = user = owner.
3. **Ron's falsification instinct** — the 13-orphans investigation survived three convincing wrong answers;
   the scrambler and freshness-race hunts ended the same way. Paired with the live-probe methodology
   (cheap read-only experiments before theories), this is a solved problem class.
4. **Design-doc-first for architecture** — 7.0.0 shipped spec → harness → live pass → prod with no sync
   corruption since; twice, writing the doc exposed holes in an already-agreed design.
5. **Themed one-day batches** (receipts; formats) — coherent releases whose CHANGELOG writes itself.
6. **Instrument, don't speculate** — `newOwnershipType` telemetry paid off twice with zero user friction.
7. **"Discussion mode"** — Ron's invention; explicit enter/exit makes authorization unambiguous. Now a
   standing protocol.
8. **Never-relitigate documents** (MULTI-INSTANCE, FORMAT-POLICY) — hard-won facts recorded the same day.

## What needs improvement

**Claude's recurring faults (from the record):**
- **Confidence before evidence** — theories framed as verdicts before their tests ran (twice in one day
  during the orphan investigation). Ron's doctrine, now adopted as standing method: **instrument → prove the
  theory → fix → prove the fix with the same instrumentation.** Fix-then-test just moves the problem.
- **Duplicated code paths** — enumerate-all-instances was applied to call sites but not *copies* (the
  alpha.13 crash lived in an inline duplicate of `enterEditMode`). A dedicated dupe-hunt is queued (health pass).
- **"Not worth chasing"** — Ron's standing position: deferring anomalies is how unreproducible field issues
  are born, and they cost far more later. Anomalies get chased (or explicitly logged with evidence), not waved off.

**Structural:**
- **readerwrangler.js at 19.5k lines**, growing ~1k/month in active periods. Verdict for this project:
  keep deferring the module split until it hurts *Ron* (load time — the precompile step addresses that),
  not the tooling. A deferral, not a solution — reassess if the growth rate holds.
- **Test coverage is Ron-shaped** — automated tests exist only where forced (organize engine 16, relay
  harness 59); everything else is Ron's hands, which is *correct* for my-usage-first. The gap matters only
  at launch: the bug classes actually hit (allow-list strips, mount-stamp defaults, echo pushes, merge
  asymmetries) are mechanical data-path bugs that characterization tests catch and strangers won't report —
  they'll churn silently. **Decision: a pre-launch test gate** — the storage/merge/sync data paths must be
  test-locked before strangers' libraries ride on them; UI never needs it. Gate spec to be written now
  (while the bug classes are fresh), executed when launch approaches.
- **Public "Coming Soon" drifts from real TODO priorities** — now a release-checklist item: re-align at
  every release.

**The frame:** my-usage-first is empirically honored (the formats/orphans/organizing week was 100%
Ron-usage-driven; pre-launch work is properly quarantined). Named risk: squirrel-gravity — pain points,
mysteries, fresh ideas. Ron's position: acknowledged, affordable in a retirement project, *and* mysteries
specifically are usually worth the chase (see above); the queue discipline ("one by one in the order
listed") is the antidote when a pull-back is genuinely warranted.

## Agreed follow-ups (in order)

1. **PRINCIPLES.md** — distill the 107 post-mortems' recurring principles (with their war stories) into one
   curated document; retire the need to re-read the archive. (The pattern library v3.3.2 asked for.)
2. **Pre-launch test-gate spec** — one page: which data-layer behaviors must be characterization-tested
   before launch. Written now for freshness; executed later.
3. **Codebase health pass** — dupe hunt, console.log audit, dead-code sweep. Purely subtractive session.

## Bottom line

The methods work — not despite the ceremony (timestamps, alphas, PMs, approval gates, discussion mode) but
because of it: the ceremony is cheap and every mystery it prevents was expensive. The machine improved most
when lessons started traveling with the sessions instead of resting in the archive. Improvement direction:
more of that — distill, encode, and let the past do some of the work.
