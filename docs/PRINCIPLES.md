# PRINCIPLES — the distilled laws of this project

_Every principle below was paid for. Sources: all 107 release post-mortems (2025-11-11 → 2026-09-04),
distilled 2026-09-04 so the archive never needs re-reading. The archive remains the depth; this is the law._

**The meta-principle that governs this file** (proven by the archive itself): *documenting a lesson does not
prevent its recurrence — only a mechanism does.* Version confusion was documented five times in the v3 era
and recurred ~11 more times anyway; one PM even records the lesson being read and **inverted** (a
"Mistakes Made" entry internalized as the correct pattern). So every Law below names its **enforcement**:
the rule, checklist item, memory file, or code pattern that makes it mechanical. A principle without an
enforcement is a wish.

---

## THE LAWS

### 1. STOP and ASK — discussion is not approval; wait for the answer
The single most-repeated collaboration failure (10+ recurrences, including "You went off the reservation"
and three violations in one release). Questions asked without waiting are monologue. After any confusion or
correction: state the conclusion, then WAIT — the 10-second pause prevents the 10-minute fix.
**Enforcement**: CLAUDE.md Collaboration Mode; `feedback_wait_for_answer` memory; "discussion mode" protocol
with explicit enter/exit.

### 2. Verify, don't infer — read the code, capture the request, run the probe
The most-recurrent technical failure (12+ PMs): asserting from a hazy model instead of reading. A hazy
mental model is the *signal* to re-read, not license to guess. Page-vs-API claims require a captured
request. Sub-agent output is intermediate, not settled. The costliest case: an entire durability argument
built on confusing RW-Wishlist with the Amazon wishlist — corrected twice before "go read the code."
**Enforcement**: `feedback_verify_dont_assume` memory; cheap read-only probes as the default first move.

### 3. Instrument → prove the theory → fix → prove the fix (Ron's doctrine)
Fix-then-test just *moves* the problem; testing only the old symptom lets it go. Prove where the time/bug
actually is before touching code, and let the same instrumentation certify the fix. Twin failure mode:
**confidence before evidence** — never present a theory as a verdict; present it with the probe that would
falsify it. (v5.5.4 spent ~10 alphas optimizing React renders; the diagnostic showed 2 renders in a
44-second drag — it was browser paint.)
**Enforcement**: `feedback_debugging` Rule 1b; two-rounds-of-theory stop rule.

### 4. After 3 iterations, question the abstraction
Proposed 2025-11-11; ignored through 26 alphas (v3.14.0 drag-drop) and 9 alphas (v6.11.2 — where one
question, "why aren't these just items?", replaced all nine). If each fix adds a special case instead of
removing one, the design is wrong: stop, list the edge cases, ask "are these actually different things?",
propose Plan Mode. 15 minutes of design beats 3 hours of patches, every measured time.
**Enforcement**: `feedback_debugging` Rule 2.

### 5. Enumerate ALL instances of a class — including copies, setters, and siblings
Fixing only the reported instance is the default failure ("Claude doesn't naturally do this" — v3, 2025;
still true in v7 until made mechanical). The class includes: sibling fetchers (the same user-gesture bug
fixed in 5 files across 4 releases), all registrations of a listener (a second keydown handler hid for 16
alphas), every modal close path, every render path, `foo` AND `setFoo`, and **inline duplicates of a
structure you extend** (the alpha.13 crash lived in a copy of `enterEditMode`).
**Enforcement**: `feedback_investigate_completely` memory; grep-the-class before declaring done.

### 6. Commit before every test; one concern per alpha; build markers on every surface
What keeps 25-alpha runs bisectable and revertible, and what makes "which build am I running?" answerable
(invisible changes + no build marker = guaranteed mystery). Alphas are tested locally or on dev — never
against prod (APP_VERSION doesn't bump during alphas, so prod serves stale JS no matter how hard you reload).
**Enforcement**: CLAUDE.md versioning workflow; `feedback_alpha_testing` memory.

### 7. Version discipline: file version ≠ app version; bump the number, then suffix
The most-repeated single mistake in project history (documented 5×, recurred ~11× more before becoming
mechanical). Feature = minor, fix = patch; bump first, then `-alpha.N`; drop the suffix at release without
re-incrementing; every runtime change gets a bump ("we HOPE it acts the same but can never be sure");
cache-busters (`storage.js?v=`, CSS) update in the same commit as the file (one sat at 5.0.0 while the app
shipped 5.4.7 — a full investigation chased code the browser never loaded).
**Enforcement**: CLAUDE.md versioning table + release checklist.

### 8. Real data, real scale, real hands — one minute of real use beats a day of review
Single-item testing validates the implementation; multi-item real data validates the design (five series
sorts looked perfect until Larry Bond). Ron's first minute with a feature has caught something in nearly
every release; ship rough for feel-testing rather than polishing a private model. Corollaries: test where
the *behavior* lives (touch tooltips on a phone, Ctrl+Drag on Windows, ask-where-to-save on AND off), and
know the **dev-machine blind spots** — paths whose correct local behavior is "never runs" are untested by
construction; say so before shipping.
**Enforcement**: the alpha cadence itself; test instructions with precise expected values — magnitude AND
shape (`feedback_debugging` Rule 4).

### 9. Guarded persistence — every irreplaceable datum gets a load-gated writer
An unguarded save-effect stamps defaults over saved data on mount; a restore gated on the wrong condition
falls back to a stale second store. This class ate 24 Book Lists (cold-boot race), scrambled folder order
for weeks (field-stripping cache write), and hid behind an audit note that said "it's a trap… OK for now"
— **a trap rated OK-for-now is a latent incident.** The cures: single guarded source of truth, writers
gated on load-complete, guest guards on read-mostly instances, atomic generational commits for multi-key
writes, and loud (never silent) save failures.
**Enforcement**: F1 consolidation shipped; the pattern is now the codebase's standing shape.

### 10. Any field that enters export travels everywhere — "app-side-only" data isn't
Backups carry it, restores push it to the relay, imports bring it home again. A migration that clears a
value **must** pair with an inbound filter while any source of truth still carries it, or the value
resurrects on every import (the 'Kindle eBook' token did exactly this, silently zeroing a backfill).
**Enforcement**: FORMAT-POLICY.md; the migration+filter pair as the standard shape.

### 11. Design-doc-first for anything architectural — then check yourself against it
The single most consistent predictor of smooth execution across all eras (11+ PMs; the four cleanest
releases in the archive were plan-mode-with-line-numbers). Writing the doc *before* code exposed real holes
in already-agreed designs, twice. For risky designs: epistemic tags (`[verified in code]` / `[assumption]`)
plus an adversarial cold review — 7.0.0's review found two correctness-critical flaws on paper. Record
**rejected** options with reasons (re-litigation cost thereafter: zero — see MULTI-INSTANCE, FORMAT-POLICY).
**Enforcement**: the design-doc culture in docs/design/; never-relitigate docs for settled facts.

### 12. Mechanical honesty — every display, ritual, and receipt needs a mechanism that can actually know
"Saved" must mean saved (picker before toast), "newer" must mean a different generation (not a timestamp
race), a commit message must describe what's in the commit (one claimed 8 edits and contained none), and
timestamps come from the tool, never extrapolation — a fabricated header drifted 4½ hours and corrupted an
analysis. When a compliance ritual gets easy to fake, that's the moment it's about to matter.
**Enforcement**: `feedback_mechanical_honesty` memory; the heredoc ban (three-for-three earned a ban, not a
caution); receipts-and-honesty as a feature genre.

### 13. Post-compaction (or post-gap) state is fragments plus assumptions — re-read, never remember
The "Runaway Robot" law: after compaction, rules must be re-read with the Read tool (a claimed reading was
once caught with a line-count quiz), permissions do not carry over, and design details do not survive
summarization (a dialog was once built entirely wrong from a summary — "You did not get the plan": ask for
the design again instead).
**Enforcement**: CLAUDE.md compaction protocol; persistent files (CLAUDE.md, design docs, memory) as the
only state that survives.

### 14. Look backward before inventing forward; investigate before estimating
"What did we do before?" precedes "what should we do next?" — the archive's oldest law. `git show` is a
design tool; the feature estimated at 4-6 hours took 15 minutes because 5 of its 8 capabilities already
existed. Simplicity wins; don't over-engineer rare operations; "leave it as-is" is a valid design decision.
**Enforcement**: habit + this file. (The unfixed cousin: optimistic scope framing — "minor" keeps becoming
"major." Budget accordingly.)

### 15. Chase every alarming number until it has a name
Deferred mysteries return as unreproducible field issues at ten times the price (Ron's doctrine). The
13-orphans day is the proof: three convincing wrong answers survived until every number was named —
wishlist, sample-pair, husk, echo, token — "and once everything had a name, there was nothing left to
fear." Beware the **numerology trap**: unrelated sets of similar size masquerade as each other; name all of
them in one table. Never bare "not worth chasing" — chase it or log it with the evidence for a scheduled chase.
**Enforcement**: `feedback_debugging` Rule 1c; telemetry tripwires instead of speculation (the
`newOwnershipType` instrument paid off twice with zero user friction).

---

## SECOND TIER — by theme (the best of the rest)

**Debugging**
- Log the raw response before theorizing; GraphQL returns data AND errors together — only fail when there's
  truly no data. Scary vendor errors are often benign.
- Trust an unexpected test result over the mental model, immediately ("no console output" once broke the
  wrong model — the refactored handlers were dead fallbacks; `feedback_verify_live_handler`).
- Compare working vs non-working sibling paths; trace data across every transformation boundary (field-name
  mismatches fail silently — `acquisitionDate` vs `acquired` once blanked a whole filter).
- Some "bugs" are expectations (cockpit error); verify intended behavior before declaring a defect.

**Architecture**
- Extract logic into a pure, node-tested engine before wiring UI — but remember engine tests validate LOGIC,
  not INTEGRATION (8/8 green while undo was broken).
- References not copies for multi-membership; signals in the data (`userEdited`) beat out-of-band params;
  single source of truth for config (parallel label maps rot); sentinels beat booleans for "unset vs cleared."
- Every `{entityId: value}` map needs a paired cleanup on entity delete.
- React: never read a ref inside a state updater (the deferred-updater trap — cost two releases); hooks
  above conditionals (Babel can't catch #310); refs + direct DOM for 60fps work; global key handlers need
  escape hatches (input focus, modal open) — and there may be TWO of them.

**Release engineering**
- Divergence pre-flight (`git log branch..main`) before drafting merge steps — prod accumulates hotfixes;
  `--ff-only` fails loudly; **never force-push**.
- Small independent branches; a git worktree when a second branch must not disturb the serving tree.
- `git add` specific files only (the `-A` rule was earned three times); `git status` before the release commit.
- Big-bang refactors leak features for weeks (v5.0.0: 175 alphas, then 8 hotfixes in 48 hours) — the
  **feature-parity checklist** it needed was recommended four times and never built; build one next time.

**UX & copy**
- UX-hat analysis before implementing — consistently better outcomes across ~10 PMs; the user's workflow
  beats the assistant's consistency instinct; the user is often the better designer (3-state toggle, HTML
  tables, sliding windows all theirs).
- Convert symptom-lists into invariants with the user; invariant specs implement in one pass.
- Symbols make promises the clicks must keep; visual feedback IS the feature; error copy states the
  constraint, the why, and the alternative; behavior over category ("you can't move books out of here — use
  folders"); name the actor; positive framing; an ellipsis promises a dialog.
- Handle gracefully, don't forbid (flexible tool = escape hatches, not guards). Match platform mental
  models (Trash, File Explorer). Labels on environments — indistinguishable instances invite
  cross-environment mistakes.

**Platform facts worth their scars** (details live in the referenced docs)
- Amazon API: `getProducts` max 30 ASINs; only the plural endpoint works; partial errors are normal; the
  full library-API map (records vs titles, NOT-hash filters, pagination exonerated, 2801=2801) lives in
  **FORMAT-POLICY.md**; author-string parsing is a settled NO.
- Cloudflare KV: per-value atomicity only; ~60s list lag; ~1 write/sec/key; quotas are account-wide;
  permanent keys compound (the 678 MB lesson) — sweep orphans.
- Browser: drag events lie about modifier keys on Windows; `title` doesn't render on touch; `aria-label`
  overrides visible text; user gestures expire during long async work (`showSaveFilePicker` first);
  localStorage beats useState defaults; IndexedDB is domain-isolated; null in persisted state becomes
  `"nullpx"`.

---

## THE GRAVEYARD — good ideas the archive proposed and nobody adopted (until now)

| Proposal | Proposed | Fate |
|---|---|---|
| PATTERNS.md / pattern library | v3.3.2 (2025-11-11) | **This file**, ten months later |
| Complexity budget (>3 iterations → review) | v3.3.2 (2025-11-11) | `feedback_debugging` Rule 2 (2026-08-30) |
| Feature-parity checklist for big refactors | v5.0.x (4 recommendations) | Still unbuilt — required for the next big-bang |
| Field-mapping reference doc | v3.8.0 (2025-12-20) | Unbuilt; the class of bug recurred |
| Automated test suite | v4.16.0, v5.0.0 | Deliberately deferred → **pre-launch test gate** (data paths only) |

The pattern in the graveyard is the meta-principle again: proposals became real only when they became
mechanisms (a file that loads, a rule that fires, a checklist line). When adding to this document, add the
enforcement or expect the graveyard.

---

*Maintenance: when a post-mortem earns a new principle, add it here with its enforcement, same day. The
release checklist's "post-mortem → memory" step is where this file gets its updates.*
