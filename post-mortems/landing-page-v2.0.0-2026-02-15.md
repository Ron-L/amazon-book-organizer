# Landing Page v2.0.0 Post-Mortem: Hero Redesign & Content Refresh

**Date**: 2026-02-15
**Duration**: ~2 hours (single session)
**Release Components**:
- index.html LANDING_VERSION v2.0.0
- CLAUDE.md release checklist update

---

## What Was Done

### Hero Redesign
- Replaced bright blue gradient hero + sticky note with refined light blue tint + professional callout card
- **Triptych layout**: Logo floated left, title/buttons center, callout card floated right — balanced composition
- **Scroll-to-shrink**: Non-sticky hero with thin frosted nav bar that slides in when hero scrolls out of view
- **Centered nav bar buttons**: Match hero button centering for smooth visual transition on scroll
- Responsive breakpoints: <1200px hides flanking elements, mobile/landscape hides callout + nav bar
- Removed Gloria Hallelujah font (sticky note gone), added Libre Baskerville italic for callout

### Content Refresh (12 Changes)
Updated all body text from Column App (v4) references to Book Explorer (v5):
1. "The solution" — columns/Trello → folders/file manager
2. "Your Books, Your Order" — folders + tags + music analogy (Artist/Album/Song) + All Books view
3. "Then the magic happens" — folders + Auto-Organize + tags
4. Comparison slider caption — removed "organized columns"
5. Key Features "Organization" — folders + tags bullets
6. "How It Works" Step 2 — load instruction fix + Auto-Organize
7. "How It Works" Step 3 — two-step fetch/import flow + folders/tags/sort order
8. Recent Features — replaced v4.x list with v5.x highlights (Scalability, Book Explorer, Tags, Notes & Series)
9. Coming Soon — removed shipped/column items, added roadmap items (reading progress, recommendations, family sharing, mobile viewer)
10. Schema.org softwareVersion — 4.16.0 → 5.5.4
11. Google Fonts — removed unused Gloria Hallelujah, added Libre Baskerville italic
12. LANDING_VERSION — v1.2.4 → v2.0.0

### Other
- Added obsolete overlays on comparison slider and walkthrough video (screenshots/video still show Column App UI)
- Added `softwareVersion` to CLAUDE.md release checklist to prevent future drift

---

## What Worked Well

### 1. **User-driven design iteration**
- User identified the visual disconnect between app and landing page
- User chose Direction C (Refined Blue) from 3 prototypes
- User drove key refinements: triptych balance (logo left/callout right), centered nav buttons, scroll-to-shrink
- Each suggestion improved the design measurably

### 2. **One-by-one text review**
- Presenting each content change as before/after with rationale let the user shape the messaging
- User caught important nuances: tags > folders for thematic grouping, Auto-Organize as a selling point, two-step fetch/import flow, "Load Library File" button name
- This prevented a bulk rewrite that might have missed the product voice

### 3. **Clean separation of concerns**
- Committed hero redesign separately from content refresh
- Made it easy to revert one without the other if needed

---

## Mistakes Made

### 1. **Schema.org softwareVersion had drifted since v4.16.0**
- Nobody noticed it was 10+ versions behind
- **Fix**: Added to CLAUDE.md release checklist as a permanent reminder

### 2. **Content still referenced Column App after 2 major versions**
- The v5.0 → v5.4 rewrite removed the Column App but the landing page was never updated
- **Lesson**: Landing page content should be part of the release checklist for major architectural changes

---

## Lessons Learned

### 1. **Triptych layout for hero sections**
- Logo left + content center + callout right creates visual balance on wide screens
- Absolute positioning from center (`left: 50%; margin-left: ±Npx`) keeps it centered regardless of viewport width
- Responsive fallback: hide flanking elements on <1200px, go inline on mobile

### 2. **Scroll-to-shrink is better than sticky hero**
- A sticky hero wastes 40% of an ultrawide display
- Non-sticky hero + thin fixed nav bar on scroll gives full content area while keeping navigation accessible
- `getBoundingClientRect().bottom < 0` is a clean trigger for showing the nav bar

### 3. **One-by-one review > bulk rewrite for marketing copy**
- The user knows the product voice and user journey better than the developer
- Presenting changes individually lets the user add context (Auto-Organize, All Books view, fetch-then-import) that wouldn't emerge from a bulk rewrite

---

## Files Changed

**Application**:
- index.html — Complete hero redesign + content refresh (LANDING_VERSION v2.0.0)

**Configuration**:
- CLAUDE.md — Added softwareVersion to release checklist

**Deleted**:
- index1.html — Direction A prototype
- index2.html — Direction B prototype
- index3.html — Direction C prototype (promoted to index.html)

---

## Open Items

- **Comparison slider screenshots** still show Column App UI — need new screenshots with Book Explorer
- **Walkthrough video** still shows Column App UI — need new video with Book Explorer
- Both have "earlier version / coming soon" overlays as interim solution
