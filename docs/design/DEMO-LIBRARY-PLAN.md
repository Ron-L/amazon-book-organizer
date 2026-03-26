# Demo Library Plan

**Created:** 2026-03-10
**Status:** Active
**Purpose:** Design plan for the ReaderWrangler demo library asset and its use in tutorials and new-user onboarding.

---

## Overview

The demo library serves two distinct but related purposes:

1. **New user playground** — A pre-built library new users can load without connecting their Amazon account. Lets them experience ReaderWrangler's full feature set immediately, risk-free.
2. **Tutorial foundation** — The starting state for all tutorial videos. Videos show the fetch → import → organize journey using this exact book set.

Both purposes share one asset: a curated 119-book backup file representing a believable, diverse personal Kindle library.

---

## The Demo Library Asset

### Content

119 books across 7 genre categories, selected to demonstrate breadth and maximize feature coverage:

| Category | Authors | Count | Demo Purpose |
|----------|---------|-------|--------------|
| Thrillers | Lee Child, Tom Clancy, Daniel Suarez, Ian Fleming | ~50 | Long series, Jack Ryan sub-series nesting |
| Literary Fiction | Fredrik Backman, Margaret Atwood, Mario Puzo, Pearl S. Buck | ~15 | Standalone books, international authors |
| Urban Fantasy | Neil Gaiman, Mary Janice Davidson, Laurell K. Hamilton, Jim Butcher | ~35 | Long series, anthology copies feature |
| Science Fiction | Robert A. Heinlein, Jodi Taylor, Larry Niven, Jerry Pournelle | ~45 | No-series books (Heinlein), collaboration copies (Niven/Pournelle) |
| Classics | Twain, Verne, Wells, London, Dickens, Brontë, Stoker, Baum, Alcott | ~15 | Consistent Amazon Classics cover style, recognizable titles |
| Non-Fiction | Norman, Nosrat, López-Alt, McMahon, Whitley | ~7 | Genre diversity; American Founding Docs subfolder opportunity |
| Technical | O'Reilly HTML5, Dane Cameron Software Eng., 1-2 others | ~3 | Professional/technical reader signal |

**Special demo value books:**
- **Jim Butcher anthologies** — contain Dresden Files stories → demonstrates the *copies* feature (same book legitimately in Dresden Files folder AND Anthologies folder)
- **Niven/Pournelle collaborations** (Lucifer's Hammer, Footfall, Mote in God's Eye) → demonstrates copies across author folders
- **Heinlein (38 books, no series)** → demonstrates Auto-Organize handling books without series metadata
- **Physical books** (2-3) → demonstrates ownership type badges and filtering
- **American Founding Documents** (Federalist Papers, Constitution, Bill of Rights) → demonstrates nested sub-folder organization
- **Andy West** (1 book) — friend of developer, subtle personal touch

### Cleanup Requirements

**Strip from backup file:**
- Folder assignments → all books land in Inbox (users experience the organization journey from scratch)
- Orphan detection flags (`orphanStatus`, `orphanCheckedDate`, `orphanScanComplete`)
- Data integrity metadata (`checkedAt`, `autoFixed`, `needsReview`)
- Relay/device sync metadata (timestamps, device IDs, sync state)
- Personal tags (Next, TimeTravel, etc. — these are the developer's tags, not the demo user's)
- Trash bin contents (empty)

**Keep in backup file:**
- All book metadata: titles, authors, covers, ratings, descriptions, reviews
- Series information (critical for Auto-Organize demo)
- Read/unread status (realistic — mirrors what a real user's library looks like)
- Collections membership (realistic — users organize on Kindle too, even though RW can't organize by collection)
- Ownership type: Kindle, physical, borrowed, Prime/KU badges

### Storage & Distribution

- **Filename:** `readerwrangler-demo-library.json`
- **Location:** Repo root (checked in, public)
- **Link from:** `index.html` — "Try it with a sample library" option alongside "Connect your Amazon library"
- **In-app:** File menu → Restore Backup → user selects `readerwrangler-demo-library.json`
- **Future:** Consider "Load Demo Library" one-click button in the Welcome screen

---

## The Demo Whitelist (Fetcher Filter)

### Purpose

Tutorial videos show the live fetch → relay import flow. Without a filter, the fetch pulls the developer's full 2600-book library, which:
- Exposes personal reading history
- Takes too long for a tutorial
- Produces uncontrolled results that don't match the scripted demo

### Source File

- **Filename:** `demo-whitelist.json`
- **Location:** Repo root (checked in — ASINs match the public demo library file)
- **Format:** `{ "description": "...", "count": 119, "asins": ["B00XYZ123", ...] }`
- **Generated from:** `readerwrangler-demo-library.json` via Node one-liner (see Phase 1 below)

### Delivery to Fetchers (localStorage)

Fetchers run on `amazon.com` and cannot access local files or the repo. The whitelist is loaded into `amazon.com` localStorage using a console script, where both fetchers can read it via same-origin access.

**localStorage keys (on amazon.com):**

| Key | Value | Purpose |
|-----|-------|---------|
| `readerwrangler-demo-whitelist` | JSON array of ASINs (`["B00XYZ123", ...]`) | The ASIN filter list |
| `readerwrangler-demo-whitelist-enabled` | `"true"` or absent | Toggle — remove key to disable without deleting the list |

**Console script:** `.private/load-demo-whitelist.js` — file picker loads `demo-whitelist.json`, writes both keys to localStorage. Run from DevTools console on any `amazon.com` page. Same script works on both `/yourbooks` and `/hz/mycd/digital-console/contentlist/` pages.

**To disable:** Open DevTools on amazon.com → Application → Local Storage → delete `readerwrangler-demo-whitelist-enabled`.

### Fetcher Behavior

- At startup, fetcher checks `localStorage.getItem('readerwrangler-demo-whitelist-enabled')`
- If `'true'`: load ASIN list from `readerwrangler-demo-whitelist`, build a `Set` for O(1) lookup
- If absent or not `'true'`: normal mode — no filtering, no change to existing behavior
- **Library fetcher:** filters at Phase 1 before `newBooks.push()` — skipped books never enter Phases 2-4. Also filters `existingBooks` loaded from relay (prevents non-demo books from persisting across runs).
- **Collections fetcher:** filters `processedBooks` and `existingBooks.items` before output/upload
- Whitelist does NOT affect: orphan scan (runs normally on whatever books are in the library)
- Whitelist check is silent — no UI change, console log only (`🔒 Demo whitelist active: N ASINs`)

---

## Target Folder Structure

The organized state shown at the end of tutorials (after Auto-Organize + manual refinement):

```
📁 Folders
  └── 📥 Inbox (stragglers)
  └── 📁 Thrillers
      └── 📁 Lee Child
          └── 📁 Jack Reacher
      └── 📁 Tom Clancy
          └── 📁 Jack Ryan
          └── 📁 Op-Center
          └── 📁 Other Clancy
      └── 📁 Daniel Suarez
  └── 📁 Literary Fiction
      └── 📁 Fredrik Backman
      └── 📁 Other Literary
  └── 📁 Urban Fantasy
      └── 📁 Jim Butcher
          └── 📁 Dresden Files
          └── 📁 Anthologies        ← copies of Dresden-adjacent anthologies
      └── 📁 Neil Gaiman
      └── 📁 Mary Janice Davidson
      └── 📁 Laurell K. Hamilton
  └── 📁 Science Fiction
      └── 📁 Larry Niven
      └── 📁 Jerry Pournelle
      └── 📁 Niven & Pournelle     ← copies of collaborations
      └── 📁 Robert A. Heinlein
      └── 📁 Jodi Taylor
  └── 📁 Classics
  └── 📁 Non-Fiction
      └── 📁 American Founding Documents   ← nested subfolder demo
      └── 📁 Cooking
      └── 📁 Other Non-Fiction
  └── 📁 Technical
  └── 🗑️ Trash
```

**Tag Views (pinned):**
- `Next` — books tagged as next to read (applied during tutorial)
- `TimeTravel` — Jodi Taylor + H.G. Wells + Connecticut Yankee (applied during tutorial)

---

## Feature Demonstration Map

Which features each part of the demo showcases:

| Feature | Where demonstrated |
|---------|-------------------|
| Relay setup + bookmarklet install | Tutorial 1: Getting Started |
| Fetch with whitelist filter | Tutorial 2: Importing |
| Relay import → Inbox landing | Tutorial 2: Importing |
| Auto-Organize (Author→Series) | Tutorial 3: Organizing |
| Manual folder creation + drag | Tutorial 3: Organizing |
| Nested sub-folders | Tutorial 3: Non-Fiction → Founding Docs |
| Copies (Niven/Pournelle, Butcher anthologies) | Tutorial 3: Organizing |
| Tag views | Tutorial 4: Tags & Views |
| Filter panel (by series, ownership, etc.) | Tutorial 4: Tags & Views |
| Covers vs list view | Tutorial 2 or 3 |
| Book detail modal (double-click) | Tutorial 2 |
| Read status / ownership badges | Tutorial 2 |
| Physical book badges | Tutorial 2 |
| Undo/redo | Tutorial 3 |
| Folder descriptions (tooltips) | Tutorial 3 |
| Mobile pairing + QR scan | Tutorial 5: Mobile |
| Orphan detection | Tutorial 6: Maintenance |
| Trash + restore | Tutorial 6: Maintenance |
| Backup / Restore | Tutorial 6: Maintenance |

---

## Video/Tutorial Sequence

### Tutorial 1: Getting Started (3-4 min)
- New Chrome profile, no personalization
- Open index.html → Get Started
- Welcome screen walkthrough
- Relay setup + bookmarklet install
- **Ends:** App open, relay configured, bookmarklet installed, library empty

### Tutorial 2: Importing Your Library (4-5 min)
- Navigate to Amazon Library page via bookmarklet
- Fetch runs (whitelist active — only pulls 119 demo books)
- Relay upload completes
- Switch to app → Import from Relay
- Books land in Inbox
- Quick covers view tour: badges, ratings, descriptions
- **Ends:** 119 books in Inbox

### Tutorial 3: Organizing (8-10 min)
- Run Auto-Organize → review result
- Manual refinements: merge folders, rename, create Classics folder
- Drag books with active filter (demonstrates Show All)
- Create Niven/Pournelle copies
- Create Butcher anthology copies
- Create Non-Fiction → Founding Documents subfolder
- Add folder descriptions
- **Ends:** Full folder structure as per Target above

### Tutorial 4: Tags & Views (4-5 min)
- Tag a few books "Next"
- Pin "Next" as a tag view
- Create "TimeTravel" tag, pin it
- Use filter panel: filter by series, by ownership type
- Show All Books view vs folder view
- **Ends:** Views section populated, filters demonstrated

### Tutorial 5: Mobile (3-4 min)
- Open app on phone
- QR scan pairing
- Browse curated library on mobile
- **Ends:** Library visible on phone

### Tutorial 6: Maintenance (3-4 min)
- Save backup
- Delete a book → Trash → restore
- Orphan detection explanation
- **Ends:** Library healthy, backed up

---

## Implementation Tasks

### Phase 1: Demo File ✅ (shipped v6.8.1)
- [x] Export backup from current Curated List folder in app
- [x] Write cleanup script: strip folder assignments, orphans, integrity metadata, relay metadata, personal tags, trash
- [x] Verify cleaned file: all 119 books in Inbox, metadata intact
- [x] Check `readerwrangler-demo-library.json` into repo root (with `.gitignore` negation)
- [x] Add demo library link + amber callout to index.html and README.md
- [x] ~~Add `demo-whitelist.json` to `.gitignore`~~ — checked into repo instead (ASINs match public demo library)

### Phase 2: Whitelist Filter ✅
- [x] Generate `demo-whitelist.json` (119 ASINs extracted from demo library backup)
- [x] Check `demo-whitelist.json` into repo root (ASINs match public demo library, no reason to hide)
- [x] Create `.private/load-demo-whitelist.js` console script (file picker → amazon.com localStorage)
- [x] Add whitelist filter to `amazon-library-fetcher.js` (Phase 1 + existingBooks)
- [x] Add whitelist filter to `amazon-collections-fetcher.js` (processedBooks + existingBooks)
- [x] Test: load whitelist via console script on amazon.com, run library fetcher → verify only 119 books
- [x] Test: run collections fetcher with whitelist → verify filtered output

### Phase 3: Training Videos, Site Restructure & Docs

**Scope:** Delete obsolete docs, restructure the website for user onboarding (landing page + sub-pages + app Help menu), produce 9 videos (sizzle reel + 8 tutorials), create a unified video production guide.

**Design decisions (2026-03-23):**
- `index.html` becomes a slim landing page (hook → convert). Detail content moves to sub-pages.
- `README.md` diverges from `index.html` — serves GitHub repo browsers, stays self-contained.
- `tutorials.html` (NEW) — single hub for all video content, linked from landing page footer and app Help menu.
- `features.html` (NEW) — feature deep-dive, version history, competitive positioning. Absorbs content removed from index.html.
- App Help menu adds "Watch Tutorials" link to tutorials.html. "How To Use" quickstart dialog stays (low maintenance, useful as quick reminder).

---

#### 3A: Delete Obsolete Docs
- [ ] Delete `docs/design/ENHANCED-GETTING-STARTED-UX.md` — v3.5.1 fossil, describes file-picker onboarding that no longer exists
- [ ] Delete `docs/design/VIDEO-PRODUCTION-PLAN.md` — replaced by VIDEO-PRODUCTION-GUIDE.md
- [ ] Delete `docs/design/BOOK-EXPLORER-VIDEO-SCENARIOS.md` — absorbed into VIDEO-PRODUCTION-GUIDE.md

#### 3B: Create VIDEO-PRODUCTION-GUIDE.md
- [ ] Create `docs/design/VIDEO-PRODUCTION-GUIDE.md` — single source of truth for all video production
  - Production tools: OBS (screen recording), CapCut Desktop (editing), Google Cloud TTS (narration)
  - Music: Uppbeat free tier or Pixabay, 120-140 BPM, beat-synced cuts
  - Voice selection: Journey-D vs Journey-F (TBD after testing)
  - Demo library integration: all videos use `readerwrangler-demo-library.json` as starting state
  - File organization: scripts/, audio/, videos/
  - Per-video sections with: script, screen direction, scene prep, timing notes
- [ ] **Video 0: Sizzle Reel (20-30 sec)** — shot list, transition notes, music brief, text overlays, no voiceover
  - Rapid cuts (1-3 sec each, 12-15 shots), zoom in/out transitions (0.25s)
  - Structure: pain (Amazon chaos) → solution (organized RW) → features (rapid montage) → brand close
- [ ] **Video 1: Quick Start (3 min)** — update existing script for demo library workflow
  - Integrate demo library as alternate path ("try instantly" vs "connect Amazon")
  - Update screen direction for v6.8+ Relay Setup (accordion, Test Connection)
- [ ] **Video 2: Setting Up the Relay (1-2 min)** — full script needed
  - Relay Setup accordion UI, Generate Credentials, Test Connection, bookmarklet drag, verified key states
- [ ] **Video 3: Fetching Your Library (2-3 min)** — full script needed
  - 5 fetcher phases, incremental behavior, orphan scan, multi-state dialog
  - Scene prep: whitelist-filtered fetch of 119 demo books
- [ ] **Video 4: Organizing with Folders (3-4 min)** — full script needed
  - Inbox → Auto-Organize → manual refinement → nested folders → copies → trash
  - Absorbs scenarios from BOOK-EXPLORER-VIDEO-SCENARIOS.md: folder creation, drag-drop, Ctrl+Drag copies, subfolder nesting, folder properties, delete/trash/restore, purchased book warning
- [ ] **Video 5: Views & Filters (2-3 min)** — full script needed
  - Views vs Folders, All Books, tag views, pin/unpin, filter panel, ownership badges, search, multi-column sort
  - Absorbs scenarios: Views navigation, cover badges, filter panel, multi-column sort
- [ ] **Video 6: Wishlist & Discovery (2-3 min)** — full script needed
  - Wishlist bookmarklet on product/series/author pages, price goals, deals filter
- [ ] **Video 7: Mobile Sync (1-2 min)** — full script needed
  - QR code in Relay Setup Step 3, phone scan, mobile PWA, browse organized library
- [ ] **Video 8: Power Features (2-3 min)** — full script needed
  - Undo/redo, keyboard shortcuts, Save/Restore Backup, Auto-Organize wizard, Data Status, Hide/Unhide
  - Absorbs scenarios: keyboard shortcuts workflow, clipboard operations, menu bar

#### 3C: Restructure index.html (Landing Page) ✅
- [x] Slim hero: logo, tagline, single CTA ("Get Started — it's free"), demo library secondary link
- [x] Sizzle reel embed (or hero screenshot placeholder until video exists)
- [x] 3 value prop cards: "Unbury your next great read" / "Amazon won't organize" / "Your data stays yours"
- [x] How It Works: 3 steps with icons (Import → Organize → Browse Anywhere); rewritten for accuracy
- [x] ~~CTA repeat + "Or try the demo library first"~~ — removed by design (redundant, covered by hero + demo section)
- [x] Trust strip: free, open source, encrypted, no account — single line with icons
- [x] Footer: links to tutorials.html, features.html, security.html, GitHub, Report an Issue, legal
- [x] **Remove from index.html:** Key Features grid, "What Makes RW Different", Recent Features, Coming Soon, obsolete video/walkthrough section
- [x] **Fix or replace:** "See the Difference" before/after — img-comparison-slider in place (screenshot update is 3H)
- [x] Trust strip tooltips: detailed hover text on all 6 items + cursor:help
- [x] Nav bar Launch button tooltip: "The app walks you through setup — relay, bookmarklet, and first import"
- [x] Demo Library buttons: stacked Step 1 / Step 2 layout with tooltips (replaces side-by-side)
- [x] Dead CSS cleanup: removed .cta-repeat, .demo-steps-grid, .demo-step-action across all 4 themes + mobile breakpoint
- [x] Empty library welcome screen (readerwrangler.js): updated bookmarklet flow to match actual button labels, added Launch App step, "(securely sends to relay)" moved to tooltips
- [x] How It Works CTA: "Launch ReaderWrangler →" with tooltip after step 3

#### 3D: Create tutorials.html ✅
- [x] Page header + nav back to main site (brand links to index.html, Tutorials active state)
- [x] Sizzle reel placeholder at top (TODO comment for YouTube embed swap)
- [x] Video 1 (Quick Start) featured layout with written summary
- [x] Videos 2-8 as cards: thumbnail, title, duration, 1-line description in responsive grid
- [x] Written Quick Reference: 3-step How It Works + demo library Step 1/Step 2 buttons
- [x] Footer (matches index.html, minus self-link)
- [x] 4 theme variants: light, dark, hc-light, hc-dark
- [x] Mobile responsive (single column at 768px, nav hidden)
- [x] GoatCounter analytics

#### 3E: Create features.html ✅
- [x] Page header + nav back to main site (brand links to index.html, Home replaces self-link)
- [x] Key Features grid (5 cards, moved from index.html)
- [x] "What Makes ReaderWrangler Different?" (5 differentiator cards, moved from index.html)
- [x] Recent Features — curated "best of" list (9 items, version numbers removed, reworded for new users)
- [x] Current Support / browser compatibility
- [x] Coming Soon (5 items: reading progress, recommendations, series manager, accessibility, faster loading)
- [x] Footer (matches index.html, minus self-link)
- [x] 4 theme variants: light, dark, hc-light, hc-dark
- [x] Mobile responsive + GoatCounter analytics

#### 3F: Update App Help Menu ✅
- [x] Add "Help & Tutorials" menu item → opens tutorials.html in new tab (between How To Use and Keyboard Shortcuts)
- [x] Keys→Credentials rename across all user-facing text in readerwrangler.js and bookmarklet-nav-hub.js
- [x] Security wording: "here in the ReaderWrangler app", corruption risk + "could not" reassurances, "wipe relay" clarity

#### 3G: Update README.md ✅
- [x] Replace 14 versioned Recent Features with 10 curated items matching features.html
- [x] Replace stale walkthrough video embed with link to tutorials.html
- [x] Update Coming Soon from 2 to 5 items matching features.html
- [x] Add SYNC comments in README.md and features.html + CLAUDE.md Release Checklist reminder

#### 3H: Capture Updated Screenshots (1920x1080, matching video resolution) ✅
- [x] Before screenshot: Inbox at smallest cover size, 119 books — wall of chaos
- [x] After screenshot: organized folders with genre + author structure, Fredrik Backman selected
- [x] Replace `images/before.png`, `images/after.png`
- [x] Fix img-comparison-slider: add image scaling, widen container to 1400px, remove obsolete overlay
- [x] Update `images/bookmarklet-install.gif` — re-recorded, added ORGANIZER_VERSION cache-buster

#### 3I: Record & Produce Videos
- [ ] Set up OBS for screen recording (resolution, frame rate, capture area)
- [ ] Test TTS voices: Journey-D and Journey-F with Video 1 script → select voice
- [ ] Record sizzle reel screen captures → edit in CapCut with music
- [ ] New `images/walkthrough-preview.png` (thumbnail from sizzle reel or Video 1)
- [ ] Record + produce Video 1 (Quick Start)
- [ ] Record + produce Videos 2-8
- [ ] Upload to YouTube (for searchability) and embed on tutorials.html
- [ ] Select and license music track from Uppbeat or Pixabay

#### 3J: Final Integration
- [ ] Update DEMO-LIBRARY-PLAN.md — mark Phase 3 complete
- [ ] Verify all cross-links: index.html ↔ tutorials.html ↔ features.html ↔ app Help menu
- [ ] Commit, push to prod

---

### Phase 4: In-App Integration (future)
- [ ] "Load Demo Library" one-click button on Welcome screen
- [ ] Separate demo relay slot from personal relay (prevents demo traffic mixing with real library)
