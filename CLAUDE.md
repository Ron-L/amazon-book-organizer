# ReaderWrangler Development Rules

[YYYY-MM-DD HH:MM]

---

## Collaboration Mode

**Core principle:** STOP and ASK before acting.

- Every code change requires explicit approval
- Every git operation requires explicit approval
- When in doubt, ask first

---

## Behaviors

* **Discussion question** → STOP, answer, don't act until directed
* **Before code/file change** → Ask approval first
* **Problem report** → STOP, acknowledge, ask to analyze, wait for decision
* **Idea evaluation** → Evaluate critically, identify issues, disagree when warranted

---

## Versioning (Semver Pre-release)

Standard semver with pre-release suffix for test iterations:

| When | Example |
|------|---------|
| Start work | `4.22.0` → `4.23.0-alpha.1` |
| Each test | Increment: `-alpha.2`, `-alpha.3`, **COMMIT before test** |
| Release | Drop suffix: `4.23.0` |

**APP_VERSION** (readerwrangler.js): Updated at release for user-facing changes.

---

## Release Checklist

- `git add` specific files only (never `-A` or `.`)
- `grep -rn "TODO" *.js *.html`
- Drop pre-release suffix from file versions
- Update APP_VERSION
- Update CHANGELOG.md
- After push: "Ready for post-mortem?"

---

## Git Workflow

**Remotes:** `dev` (testing) / `prod` (production) — no `origin`

| User says | Do |
|-----------|-----|
| "push" or "proceed" | `git push dev main` |
| "push to prod" | `git push prod main` |
| "release" | Clarify which |

**Navigator changes**: Dev first → test → then Prod

---

## Compaction

When preparing for compaction, include in summary:

> COLLABORATION MODE - STOP and ASK before every action.
> After compaction: Read CLAUDE.md, report task in progress, wait for approval.

---

## Reference

**Folders:** `docs/api/`, `docs/design/`, `post-mortems/`

**No version increment:** README, CHANGELOG, TODO, *.md docs, .bat files
