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

- **Filename:** `demo-library.json`
- **Location:** Repo root (checked in, public)
- **Link from:** `index.html` — "Try it with a sample library" option alongside "Connect your Amazon library"
- **In-app:** File menu → Restore Backup → user selects `demo-library.json`
- **Future:** Consider "Load Demo Library" one-click button in the Welcome screen

---

## The Demo Whitelist (Fetcher Filter)

### Purpose

Tutorial videos show the live fetch → relay import flow. Without a filter, the fetch pulls the developer's full 2600-book library, which:
- Exposes personal reading history
- Takes too long for a tutorial
- Produces uncontrolled results that don't match the scripted demo

### Format

Simple JSON array of ASINs — minimal, fast to check, easy to generate:

```json
{
  "description": "ReaderWrangler demo library whitelist — fetcher filter for tutorial videos",
  "asins": [
    "B00XYZ123",
    "B00ABC456",
    ...
  ]
}
```

### Filename & Location

- **Filename:** `demo-whitelist.json`
- **Location:** Local only — NOT in repo (contains ASINs tied to developer's account)
- **Add to `.gitignore`:** `demo-whitelist.json`

### Generation

Extract ASINs from `demo-library.json` using a one-time script:

```javascript
const backup = JSON.parse(fs.readFileSync('demo-library.json'));
const asins = backup.books.map(b => b.asin);
fs.writeFileSync('demo-whitelist.json', JSON.stringify({ description: '...', asins }, null, 2));
```

### Fetcher Behavior

- Fetcher checks for `demo-whitelist.json` at startup
- If present: filter mode — only upload books whose ASIN is in the whitelist
- If absent: normal mode — no change to existing behavior
- Whitelist applies to: Library fetcher Phase 1-4 results and relay upload
- Whitelist does NOT affect: orphan scan (skip or run normally)
- Whitelist check is silent — no UI change, no indication to viewer that filtering is happening

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

### Phase 1: Demo File (do first)
- [ ] Export backup from current Currated List folder in app
- [ ] Write cleanup script: strip folder assignments, orphans, integrity metadata, relay metadata, personal tags, trash
- [ ] Verify cleaned file: all 119 books in Inbox, metadata intact
- [ ] Check `demo-library.json` into repo root
- [ ] Add "Load Demo Library" option to index.html (link to file with instructions)
- [ ] Add `demo-whitelist.json` to `.gitignore`

### Phase 2: Whitelist Generator
- [ ] Write one-time ASIN extraction script → `demo-whitelist.json`
- [ ] Add whitelist support to library fetcher (check at startup, filter uploads)
- [ ] Test: fetch with whitelist active → verify only 119 books upload

### Phase 3: Training Docs
- [ ] Update `VIDEO-PRODUCTION-PLAN.md` — full rewrite of Content Update Tracker + video scripts to reflect current app (v6.5.0) and demo library workflow
- [ ] Update `BOOK-EXPLORER-VIDEO-SCENARIOS.md` — add relay import, Views/Folders split, tag views, mobile pairing, copies scenarios
- [ ] Update `ENHANCED-GETTING-STARTED-UX.md` — align with current Welcome screen + Relay Setup flow

### Phase 4: In-App Integration (future)
- [ ] "Load Demo Library" one-click button on Welcome screen
- [ ] Separate demo relay slot from personal relay (prevents demo traffic mixing with real library)
