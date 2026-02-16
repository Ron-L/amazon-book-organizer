# Dark Mode Design Document

**Status**: Complete (v5.5.7) — HC themes and landing page deferred
**Priority**: P6 (Post-Launch Internal Improvement)
**Estimated Effort**: Phase 0: 3.5-5.5 hours | Phase 1: 10.5-16.5 hours | Total: 14-22 hours
**Prerequisite**: None (Phase 0 is independently valuable)

---

## Motivation

- ~80% of users prefer having a dark mode option; ~65% actively use it on apps that offer it
- 22% of Chrome web users have `prefers-color-scheme: dark` set
- Users who organize their library in the evening (common use case) benefit from reduced eye strain
- Dark mode is table-stakes for modern web apps — its absence signals an unpolished product

## Architecture Decision

### Tailwind `dark:` class variants (chosen)

The app uses Tailwind via CDN Play, which supports JIT-compiled `dark:` variants at runtime. The approach:

1. Configure `tailwind.config = { darkMode: 'class' }` in readerwrangler.html
2. Toggle `.dark` class on `<html>` element
3. Add `dark:` prefixed classes alongside existing light-mode classes
4. Persist user preference to localStorage; auto-detect `prefers-color-scheme` on first visit

Example:
```html
<!-- Before -->
<div className="bg-white text-gray-900">

<!-- After -->
<div className="bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100">
```

### Why not CSS custom properties?

CSS variables (`var(--bg-primary)`) would work but require defining a parallel token system and replacing every color reference. Tailwind's `dark:` variants are more idiomatic, co-locate light/dark on the same element, and require no extra infrastructure. They also self-document: you can see both themes by reading one line.

### Inline style constraint

The codebase has ~193 inline `style={}` usages, of which ~35 contain hardcoded hex colors. These bypass Tailwind and cannot use `dark:` variants. Phase 0 converts these to Tailwind classes first.

---

## Color Palette

Light mode uses Tailwind's Slate scale (`slate-50` through `slate-900`) with Blue accents (`blue-500`/`blue-600`). Dark mode inverts this:

| Role | Light | Dark |
|------|-------|------|
| Page background | `bg-white` / `bg-slate-50` | `dark:bg-gray-900` / `dark:bg-gray-950` |
| Surface (cards, modals, sidebar) | `bg-white` | `dark:bg-gray-800` |
| Surface elevated (dropdowns, tooltips) | `bg-white` | `dark:bg-gray-750` or `dark:bg-gray-700` |
| Primary text | `text-slate-900` | `dark:text-gray-100` |
| Secondary text | `text-slate-600` | `dark:text-gray-400` |
| Muted text | `text-slate-400` | `dark:text-gray-500` |
| Borders | `border-slate-200` | `dark:border-gray-700` |
| Primary accent | `bg-blue-500` / `text-blue-600` | `dark:bg-blue-500` / `dark:text-blue-400` |
| Hover background | `hover:bg-slate-100` | `dark:hover:bg-gray-700` |
| Selected/active | `bg-blue-50` / `bg-blue-100` | `dark:bg-blue-900/30` |
| Input fields | `bg-white border-slate-300` | `dark:bg-gray-800 dark:border-gray-600` |
| Scrollbar (if styled) | Light track/thumb | Dark track/thumb |

**Note**: These are starting points. Final tuning happens in Phase 1g after all surfaces are wired up — flip the toggle and adjust until both modes look right.

---

## Scope Inventory

### Surfaces to theme

**App (readerwrangler.js)**:
- Menu bar (gradient background, text, borders, hover states)
- Sidebar folder tree (background, folder items, selection highlight, drag highlight)
- Filter panel (background, dropdown buttons, active filters)
- Status bar (background, text, icons)
- Search bar (input, history dropdown)
- List view (table headers, row backgrounds, alternating rows, hover, selected)
- Cover grid view (card backgrounds, shadows, badges, hover)
- Group dividers
- Book detail modal (background, text, tabs, review cards, star ratings)
- 14 other modals/dialogs (see list below)
- Context menus (~4: book, folder, tag, general)
- Filter dropdowns (~5: status, rating, series, date, collections)
- Tag pills and tag management
- Tooltip styling
- Drag indicators and drop highlights
- Toast notifications

**Landing page (index.html)**:
- Hero section (gradient, callout card)
- Nav bar (background, blur, text)
- Body sections (backgrounds, feature cards, shadows)
- Privacy highlight (gradient)
- Footer
- Media overlay

### Dialog inventory (15 backdrops)

1. Status/Data Status modal
2. Reset App confirmation
3. About dialog
4. Keyboard Shortcuts dialog
5. How To / Getting Started dialog
6. Organize Wizard modal
7. Wizard Help sub-dialog
8. Wizard Preview sub-dialog
9. Wizard Results sub-dialog
10. Bulk Price Goal modal
11. Bulk Edit modal
12. Generic confirmation dialog
13. Book Detail modal
14. Tag Management modal
15. Folder Properties dialog

---

## Implementation Plan

### Phase 0: Inline Style Refactoring (3.5-5.5 hours)

Prerequisite cleanup. Independently valuable — cleaner code, consistent styling, enables dark mode.

**0a. Audit inline styles (30 min)**
- Grep all `style={{` with hardcoded hex colors (~35 occurrences)
- Categorize: static (always the same color) vs dynamic (conditional on state)
- Map hex values to Tailwind equivalents (e.g., `#475569` = `text-slate-600`)

**0b. Convert static inline colors (2-3 hours)**
- Replace static `style={{ color: '#475569' }}` with `className="text-slate-600"`
- Replace static `style={{ background: '#f8fafc' }}` with `className="bg-slate-50"`
- Replace static `style={{ borderColor: '#e2e8f0' }}` with `className="border-slate-200"`
- Keep non-color inline styles (widths, margins, dynamic positioning) as-is

**0c. Convert dynamic conditional colors (1-2 hours)**
- Replace `style={{ background: isActive ? '#dbeafe' : '#fff' }}` with conditional classNames
- Pattern: `` className={`${isActive ? 'bg-blue-100' : 'bg-white'}`} ``
- These become trivially dark-mode-able: `` className={`${isActive ? 'bg-blue-100 dark:bg-blue-900/30' : 'bg-white dark:bg-gray-800'}`} ``

### Phase 1: Dark Mode Implementation (10.5-16.5 hours)

**1a. Infrastructure (30 min)**
- Add to readerwrangler.html:
  ```html
  <script>
    tailwind.config = { darkMode: 'class' };
    // Auto-detect on first visit, then respect stored preference
    if (localStorage.getItem('theme') === 'dark' ||
        (!localStorage.getItem('theme') && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      document.documentElement.classList.add('dark');
    }
  </script>
  ```
- Add toggle button in Help menu or menu bar (sun/moon icon)
- Toggle handler: flip `.dark` on `<html>`, save to localStorage

**1b. Landing page (1-2 hours)**
- index.html has self-contained `<style>` block — add CSS for `.dark` class
- Hero gradient: light blue → dark slate
- Feature cards: white → gray-800
- Footer: already dark, may just need border adjustment
- Nav bar: white/blur → dark/blur
- Media overlays: adjust opacity

**1c. App chrome (2-3 hours)**
- Menu bar: gradient → dark gradient, text colors, hover states
- Sidebar: background, folder tree items, selected/drag highlights, scrollbar
- Filter panel: background, active filter badges
- Status bar: background, text
- Search bar input + history dropdown

**1d. Main content views (2-3 hours)**
- List view: table header, row backgrounds, alternating stripes, hover, selected, group dividers
- Cover grid: card backgrounds, shadows, badge overlays
- "Show all" button, render cap message
- Empty state messages

**1e. Modals/dialogs (3-4 hours)**
- All 15 modals: dialog background (`bg-white` → `dark:bg-gray-800`), text, borders, inputs, buttons
- Book detail modal is the most complex (tabs, reviews, star ratings, cover shadow)
- Wizard modals (3 sub-dialogs)
- Most modals share similar structure — batch the simple ones

**1f. Context menus & dropdowns (1-2 hours)**
- Right-click context menus (book, folder, tag)
- Filter dropdowns (status, rating, series, date, collections, amazon rating, my rating)
- Tag combobox dropdown

**1g. Testing & polish (1-2 hours)**
- Color contrast audit (WCAG AA: 4.5:1 for text, 3:1 for large text)
- Tune both palettes side-by-side — flip toggle, adjust until happy
- Edge cases: tooltips, toasts, drag ghost elements, selection rectangles
- Verify cover images look good against dark backgrounds (may need subtle border/shadow)
- Test both list and grid views, all filter states, all modals

---

## Incremental Delivery

Each phase/step is independently shippable:

1. **Phase 0 alone** — cleaner code, no user-visible change
2. **Phase 0 + 1a + 1c** — dark mode works for the main app chrome (menu bar, sidebar, filter panel). Content area still light. Usable for testing the palette.
3. **+ 1d** — full main content themed
4. **+ 1e + 1f** — all modals and menus themed
5. **+ 1b** — landing page themed
6. **+ 1g** — polish pass

---

## UX Design Decisions

### Toggle location
- **Recommended**: Help menu → "Dark Mode" toggle (keeps menu bar clean)
- **Alternative**: Sun/moon icon in the menu bar itself (more discoverable but adds visual clutter)

### Default behavior
- First visit: auto-detect from `prefers-color-scheme` system setting
- After that: respect user's explicit toggle, stored in localStorage
- Light mode is the default if no system preference is detected

### Transition
- `transition: background-color 0.2s, color 0.2s` on body/html for smooth toggle
- No animation on initial page load (apply class before render)

---

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Cover images look washed out on dark backgrounds | Add subtle border or shadow around covers in dark mode |
| Hardcoded colors missed during Phase 0 audit | Grep verification pass + visual testing in dark mode reveals any misses |
| Tailwind CDN JIT doesn't generate unused `dark:` classes | CDN JIT scans at runtime — it will find them. Verified this works. |
| User confusion about toggle location | Auto-detect system preference covers most users; toggle is for overrides |

---

## Out of Scope

- Separate dark mode color schemes (e.g., AMOLED black) — single dark palette is sufficient
- Per-component theming — global toggle only
- Dark mode for the bookmarklet navigator popup — separate codebase, minimal surface
- readerwrangler.css — verify if any styles there need dark variants (likely minimal)

---

## Related

- [TODO.md](../../TODO.md) — P6-T7 Dark Mode Support
- Landing page v2.0.0 — hero redesign provides clean starting point for dark theme
