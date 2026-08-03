# Improve load time — precompile build step

_Moved verbatim from TODO.md during the 6.12.0 TODO restructure (2026-08-03). Backlog. **MEDIUM / LOW-MEDIUM (2-4 hours).**
**Option B (splash screen) already shipped** — the remaining task is Option A (precompile)._

---

- Current: ~14s app load. Babel in-browser JSX compilation (~3-8s) and Tailwind JIT scan (~1-3s) account for most of it. React render + IndexedDB load is only ~1-3s.
- Console warnings (dev-only, users don't see): Tailwind CDN "not for production", Babel "precompile your scripts", Babel "deoptimised styling" (skips formatting for files >500KB — cosmetic, no functional impact)

**Option A: Pre-compile (eliminates warnings, fastest load)** — the remaining work
- Step 1 (Babel): `npx babel readerwrangler.js --presets=@babel/preset-react -o dist/readerwrangler.js`. Load `dist/readerwrangler.js` as regular `<script>` instead of `type="text/babel"`. Remove Babel CDN.
- Step 2 (Tailwind): `npx tailwindcss -i input.css -o dist/styles.css --content "readerwrangler.js,readerwrangler.html"`. Swap Tailwind CDN for `<link>` to generated CSS.
- Prerequisite: Node.js (already installed for scripts/)
- **Trade-off: Introduces a build step.** Every JS/CSS edit requires re-running the build before deploy. Options: local `build.bat` (manual, risk of forgetting), GitHub Actions (auto on push, adds CI complexity), or pre-commit hook (auto on commit, slows commits).
- **Trade-off: Transparency.** Source files are no longer what's served. Pre-compiled output is readable (not minified) but shows `React.createElement()` instead of JSX. Mitigate with "View Source on GitHub" link.
- Estimated load time: ~5-8s (Step 1 only) or ~3-5s (both steps)
- **Durable fix for the CDN-pin problem too** (6h): removes the in-browser Babel AND the Tailwind Play CDN entirely.

**Option B: Splash screen with personality — ✅ SHIPPED**
- Themed loading screen in `readerwrangler.html` with rotating messages while Babel/Tailwind/React load. Pure HTML/CSS, zero build step; turns the wait into a branded experience. (Can combine with Option A.)

Note: User loads the page once per session, so this is a one-time cost per use.
