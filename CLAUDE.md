# ReaderWrangler Development Rules

[YYYY-MM-DD HH:MM]

---

## Collaboration Mode

**Core principle:** STOP and ASK before acting.

- Every code change requires explicit approval
- Every git operation requires explicit approval, except alpha commits during development.
- When in doubt, ask first even if the compaction summary says "continue without asking further questions".

---

## Behaviors

* **Response start** →  display `📋 [YYYY-MM-DD HH:MM:SS Local]` + separator (use `powershell -Command "Get-Date -Format 'yyyy-MM-dd HH:mm:ss'"` via Bash)
* **Discussion question** → STOP, answer, don't act until directed
* **Before code/file change** → Ask approval first
* **Problem report** → STOP, acknowledge, ask to analyze, wait for decision
* **Idea evaluation** → Evaluate critically, identify issues, disagree when warranted
* **Code change approved ("proceed")** → Make change, increment ORGANIZER_VERSION, commit, report ready for testing (follows Versioning workflow)

---

## Code Quality — Opportunistic Refactoring

When working in a section of code for any reason (feature, fix, or investigation):

- If you see inline logic that should be a function, extract it
- If you see duplicate code, consolidate it
- If you see raw state access that should be an accessor, add one
- If you see tightly coupled state pairs, group them

Do this in the same commit as the work that brought you there. Don't ask permission for small extractions (under ~20 lines). Do ask before larger restructuring.

The goal: leave every file cleaner than you found it. Don't plan refactoring projects — refactor while you work.

---

## Preferences

* User-facing copy: no technical jargon ("IndexedDB", "JSON", "localStorage")
* Backup terminology: "Save/Restore" not "Import/Export"
* "Toast" = small floating text near status bar, not overlay dialog
* UX analysis before implementing — evaluate the design, don't just code it
* Don't go down rabbit holes — stop after 1 investigation step and check in
* Don't use AskUserQuestion multi-choice format — use normal conversation
* Discussion ≠ approval to act — "proceed" applies only to the specific item discussed

---

## Versioning (Semver Pre-release)

Standard semver with pre-release suffix for test iterations:

| When | Example |
|------|---------|
| Start work | `4.22.0` → `4.23.0-alpha.1` |
| Each test | Increment: `-alpha.2`, `-alpha.3`, **COMMIT before test** |
| Release | Drop suffix: `4.23.0` |

**APP_VERSION** (readerwrangler.html): Updated at release for user-facing changes. Defined ONCE in HTML, passed to JS via query param. JS reads and uses it (no duplication).

**ORGANIZER_VERSION** (readerwrangler.js): Update in the same commit as each alpha iteration.

**CSS cache-buster** (readerwrangler.html): `readerwrangler.css?v=X.Y.Z` must match ORGANIZER_VERSION on every commit that modifies readerwrangler.css. Update in the same commit as the CSS change.

---

## Release Checklist

- `git add` specific files only (never `-A` or `.`)
- `grep -rn "TODO" *.js *.html`
- Drop pre-release suffix from file versions
- Update APP_VERSION
- Update `softwareVersion` in index.html Schema.org structured data to match
- Update CHANGELOG.md, README.md (and its mirror index.html) sections Recent Features and Coming Soon!
- Sync "Recent Features" and "Coming Soon" lists between README.md and features.html
- TODO.md: delete all checked `- [x]` items (now recorded in CHANGELOG) — TODO is future-only
- After push: "Ready for post-mortem?"

---

## Git Workflow

**Remotes:** `dev` (testing) / `prod` (production) — no `origin`

**Feature branches:** For customer-facing work (not doc-only changes):
1. `git checkout -b feature/descriptive-name` from main
2. Develop with alpha versions, commit before each test
3. Test locally (most changes don't require push)
4. When complete: merge to main, push to prod

**When to push to dev:**
- Navigator link changes (require extension loaded from URL to test)
- Ready to share feature branch for external testing

**Do NOT push to dev** for routine local testing. Test locally first.

Branch naming: `feature/tags`, `fix/filter-bug`, `refactor/modules`

| User says | Do |
|-----------|-----|
| "push" or "proceed" | Ask: navigator changes or ready to share? |
| "push to prod" | Merge to main first, then `git push prod main` |
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
