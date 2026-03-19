# ReaderWrangler Demo Plan

## Demo Scenarios

### Empty State Demo
Show the app from scratch — no books, first import. Uses a long whitelist to control which books come in.

### Non-Empty State Demo
App already has a curated library. Show fetch bringing in a small number of new books. Uses a short whitelist.

---

## Filtering Approach Options

### Option A: Whitelist File (middle ground)
A local `demo-filter.json` file in the project root. If present → filter mode. If absent → normal operation. No code changes needed for real use.

```json
{
  "empty_state": ["B08XYZ...", "B07ABC..."],
  "has_books": ["B08XYZ..."]
}
```

- Fetcher checks for file at startup
- Filters which ASINs get relayed/imported
- **Caveat:** fetcher still touches real Amazon library pages to discover ASINs before filtering

### Option B: Canned JSON Payload (safest — recommended for live demos)
Pre-recorded relay upload of a curated 20-book library. "Import" pulls that payload. No fetcher needed live.

- Completely controlled
- Zero personal data exposure
- Works without internet
- Fully scripted, repeatable

### Option C: Separate Amazon Account (most authentic)
A dummy Amazon account with only demo books purchased/wishlisted. Run the real fetcher against it.

- Clean — no filtering needed
- Fully authentic demo of the fetch flow
- One-time setup cost

---

## Sensitive Areas

| Area | Risk | Mitigation |
|------|------|------------|
| Real reading history | Visible in fetcher page traversal even with whitelist | Use canned JSON or dummy account |
| Amazon account info | Name, Prime status, address hints in page markup | New browser profile |
| Relay credentials | Demo traffic mixing with personal library | Use a separate relay slot for demos |
| Pricing data (Phase 4) | Could expose purchase patterns | Disable Phase 4 in demo, or use dummy account |

---

## Browser Setup
- Use a fresh Chrome profile with no personal bookmarklets or personalization
- Install only the demo fetcher bookmarklet in that profile
- Consider a separate relay slot so demo data doesn't mix with personal library

---

## Recommendation
**Live demo:** Use canned JSON payload for the import step — maximum control, zero exposure.
**If showing the fetcher live:** Use a separate dummy Amazon account, not a whitelist.
**Whitelist file:** Good middle-ground option if canned JSON isn't feasible and dummy account isn't set up yet.

---

## Feature Inventory for Demos

Features worth demonstrating, grouped by demo story arc:

### Arc 1: The Problem / First Import
- Amazon library is a flat, unsortable mess (screenshot or live)
- Install bookmarklet (show Relay Setup → install flow)
- Run fetcher — show progress dialog phases (titles → descriptions → tags → prices)
- Import from Relay — show delta count ("12 new books")
- Books land in Inbox

### Arc 2: Core Organization
- Drag books from Inbox into folders
- Create nested folders
- Drag-to-reorder folders in sidebar
- Cut/Copy/Paste books between folders (Ctrl+X/C/V)
- Undo/Redo (Ctrl+Z/Y)
- Hardlink model: same book in multiple folders (copy, not duplicate)
- Trash bin: soft delete → recover → empty trash

### Arc 3: Book Explorer
- List view vs. Covers view toggle
- Column sorting (single and multi-column Shift+click)
- Sort by Published date, Title, Author, Rating
- Column picker / column arranger
- Double-click book → detail modal (description, full metadata)
- Right-click context menu: Open in Amazon, Copy Title(s), Move To, Copy To

### Arc 4: Finding Books
- All Books view — full library at a glance
- Views section — tag virtual folders as a different lens
- Filter panel: ownership type, tags, personal rating
- Ownership badges on covers (KU, Prime, Sample, Borrowed)
- Orphan filter ("Removed from Amazon")

### Arc 5: Wishlist & Discovery
- Wishlist: add from Amazon product page, series page, author bibliography page
- Wishlist price display — price tags on covers, price goals, Deals filter
- Series page bulk import — whole series with gap detection
- Author bibliography import — all Kindle books by an author

### Arc 6: Organization Power Features
- Auto-Organize (rule-based folder assignment)
- Tags — automatic genre/category tags from Amazon metadata
- Pinned tag views in Views section
- Folder descriptions (tooltip on hover)
- Folder Properties: rename, description, book/subfolder count

### Arc 7: Sync & Mobile
- Mobile PWA — scan QR code from desktop app
- Device state sync — open app on phone, library appears
- Backup / Restore (Save Backup / Restore Backup)

---

## Gaps in Existing Video/Training Plans

### VIDEO-PRODUCTION-PLAN.md
Last updated: 2026-02-02. **Missing entirely:**

| Feature | Version |
|---------|---------|
| Views / Folders sidebar split | v6.4.0 |
| Views section collapse/expand | v6.4.0 |
| Folder/Tag descriptions + tooltips | v6.5.0 |
| System sidebar tooltips | v6.5.0 |

**Already listed as gaps in the plan (still unaddressed):**
Wishlist, Hide books, Context menu, Ownership Badges/Filter, Cut/Copy/Paste, Wishlist Price Display, Series Page Import, Author Bibliography Import, Undo/Redo, Sort by Published — all still need scripting.

Video 1 (Quick Start) script exists but is pre-Book Explorer (pre-v5.0.0) — needs full rewrite.
Videos 2–6 are skeleton outlines only.

### BOOK-EXPLORER-VIDEO-SCENARIOS.md
Covers v5.0.0 context menu, multi-column sort, menu bar/toolbar. **Missing:**

| Feature | Version |
|---------|---------|
| Tag virtual folders / Views section | v5.x–v6.4.0 |
| Relay import flow + delta count | v6.0.0 |
| Trash bin / soft delete / recover | v6.0.0 |
| Mobile QR pairing + sync | v6.0.0 |
| Folder descriptions | v6.5.0 |
| Bookmarklet installer (in-app Relay Setup) | v6.0.0 |
| Covers view (list vs. covers toggle) | v5.0.0 |

### Priority for Updating
1. Rewrite Video 1 Quick Start script (Book Explorer era)
2. Add relay import + trash scenarios to BOOK-EXPLORER-VIDEO-SCENARIOS.md
3. Add Views/Folders split scenario
4. Add mobile pairing scenario
5. Add wishlist arc scenarios
