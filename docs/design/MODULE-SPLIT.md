# Refactor readerwrangler.js into modules

_Moved verbatim from TODO.md during the 6.12.0 TODO restructure (2026-08-03). Backlog. **LOW / MEDIUM (4-6 hours).**
Re-assess before starting: `uiHelpers.js`, `storage.js`, and `integrity.js` are already split out since this was written._

---

- Current state: 3,862-line monolithic file with 50+ state variables, 80+ functions
- **Recommended: Minimal Split (4 modules)**

| Module | ~Lines | Contents |
|--------|--------|----------|
| `storage.js` | 150 | IndexedDB, localStorage operations |
| `dataProcessing.js` | 400 | Import, merge, filter logic |
| `dragDrop.js` | 500 | Drag handlers, binary search optimization |
| `uiHelpers.js` | 200 | Formatters, display helpers, constants |
| `readerwrangler.js` | 1,500 | State, hooks, orchestration, JSX |

- Problem: Large monolithic file hard to navigate and maintain
- Impact: Better code organization, easier future maintenance, testability
