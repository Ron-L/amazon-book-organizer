# ReaderWrangler Video Production Plan

## Content Update Tracker

**Last Updated**: 2026-03-10

Before producing/updating videos, review this list of changes since the plan was written:

### Images Out of Date (v4.5.0+ styling changes)
- [ ] `images/bookmarklet-install.gif` - Shows old styling, now blue gradient with new logo
- [ ] `images/before.png` / `images/after.png` - "See the Difference" screenshots show old header design
- [ ] `images/walkthrough-preview.png` - Video thumbnail shows old styling

### Major Paradigm Changes (all videos need updating or replacement)

**v5.0.0 — Book Explorer (columns → folder tree + right pane)**
- Old "columns" UI is gone; all scripts referencing "New Column", column drag-drop are obsolete
- New UX: folder tree sidebar (left) + list/cover pane (right), File Explorer patterns
- Right-click context menus replace drag-to-reorder for folder management
- See [BOOK-EXPLORER-VIDEO-SCENARIOS.md](BOOK-EXPLORER-VIDEO-SCENARIOS.md) for full scenario library

**v6.0.0 — Relay-Only Data Flow (no more JSON file downloads)**
- Fetcher no longer downloads JSON files — all data goes through encrypted relay
- Import is now File → Import from Relay (not file picker)
- Bookmarklet installer moved into app: File → Relay Setup → drag bookmarklet from dialog
- Trash bin added: soft delete → recover → empty trash
- Mobile PWA: QR code pairing, device state sync

**v6.3.0 — Data Integrity**
- Integrity checks run automatically; users see corrections in status

**v6.4.0 — Views / Folders Sidebar Split**
- Left panel split into Views section (tag virtual folders) and Folders section
- Clicking Views label → card grid of tag views
- Views section collapse/expand with chevron

**v6.5.0 — Folder/Tag Descriptions + Tooltips**
- Right-click folder or tag view → Properties → Description field → tooltip on hover
- System entries (All Books, Inbox, Trash, Views, Folders) have built-in tooltips

### Previously Listed Gaps (still unscripted)
- [ ] Wishlist — add books from Amazon product/series/author pages
- [ ] Ownership Badges — visual KU/Prime/Sample/Borrowed badges on covers
- [ ] Ownership Filter — filter by type in filter panel
- [ ] Cut/Copy/Paste books — Ctrl+X/C/V, Ctrl+Drag to copy
- [ ] Delete key — DEL removes selected books with last-copy protection
- [ ] Right-click context menu — Move to/Copy to submenus, Open in Amazon, Copy Titles
- [ ] Wishlist Price Display — price tags on covers, price goals, Deals filter
- [ ] Series Page Bulk Import — whole series with gap detection
- [ ] Author Bibliography Import — all Kindle books by author
- [ ] Bulk Set Price Goal — right-click → Set Price Goal presets or custom
- [ ] Book description view — double-click detail modal

---

## Text-to-Speech Service Selection

### Selected Service: Google Cloud Text-to-Speech

**Reasons for Selection:**
1. **Free tier covers production needs**: 1M characters/month = 5+ hours of narration
2. **Professional quality**: Neural2 and Journey voices are indistinguishable from human
3. **Voice consistency**: Same voice guaranteed across all videos forever
4. **Journey voices**: Specifically designed for long-form tutorial narration
5. **Service stability**: Google isn't going anywhere
6. **Scalability**: Very affordable if we exceed free tier ($16 per 1M additional characters)

**Recommended Voices:**
- `en-US-Journey-D` (male, warm, conversational)
- `en-US-Journey-F` (female, friendly, clear)

**Demo/Testing:**
- Try voices at: https://cloud.google.com/text-to-speech#demo
- Production access: Create free Google Cloud account

**Selected Voice**: [TBD after testing]

---

## Video Series Plan

### Target Audience Needs
- **Problem**: Users bounce if forced to watch long walkthroughs
- **Solution**: Multiple short, focused tutorials (2-3 minutes each)
- **Budget**: ~1 hour total narration in first month (well within 5+ hour free tier)

### Planned Videos

#### 1. Quick Start (3 minutes)
**Goal**: Zero to organized library — relay setup, first fetch, first import, first folder

#### 2. Setting Up the Relay (1-2 minutes)
**Goal**: Detailed one-time setup walkthrough — Relay Setup dialog, bookmarklet install

#### 3. Fetching Your Library (2-3 minutes)
**Goal**: Fetcher phases explained — titles, descriptions, tags, prices, orphan scan

#### 4. Organizing with Folders (3-4 minutes)
**Goal**: Inbox workflow, folder creation, drag-drop, nested folders, folder properties

#### 5. Finding Books: Views & Filters (2-3 minutes)
**Goal**: Views section, tag virtual folders, filter panel, ownership badges, search

#### 6. Wishlist & Discovery (2-3 minutes)
**Goal**: Add from product/series/author pages, price goals, deals filter

#### 7. Mobile Sync (1-2 minutes)
**Goal**: QR pairing, phone app, reading on mobile

#### 8. Power Features (2-3 minutes)
**Goal**: Undo/redo, keyboard shortcuts, backup/restore, trash bin

---

## Video Production Workflow

### Per-Video Structure

Each video needs:
1. **Script** - Formatted for TTS (conversational, proper pauses)
2. **Screen Direction** - Exact actions to perform on screen
3. **Scene Prep** - Required state before recording
4. **Timing Notes** - Sync narration with screen actions

### Script Formatting for TTS

**Best Practices:**
- Use periods for natural pauses (not commas only)
- Add `...` for longer dramatic pauses
- Use contractions ("you'll" not "you will")
- Break long sentences into shorter ones
- Speed: 0.9x for instructional content (slower = clearer)

---

## Video 1: Quick Start (HIGH PRIORITY)

### Target Length
3 minutes

### Audience
Brand new users who need to get started fast

### Goal
Zero to organized library: relay setup → fetch from Amazon → import → first folder

### Scene Prep

**Before Recording:**
- Fresh ReaderWrangler state (no relay configured, no books)
- Amazon account logged in (or use canned relay payload for safer demo)
- Chrome with bookmarks bar visible
- Clean browser profile (no personal bookmarklets)

**Demo Library State:**
- If using canned payload: pre-recorded relay payload of 12–20 curated books
- If live fetch: separate dummy Amazon account (not personal library)

### Script (TTS-Optimized)

**[SCENE 1: The Problem — 0:00-0:20]**

Have hundreds of Kindle books... but can never find what to read next?

Amazon shows your entire library. But it won't let you organize it.

ReaderWrangler fixes that.

In the next three minutes... you'll connect directly to your Amazon library... import your books... and start organizing them your way.

---

**[SCENE 2: One-Time Setup — 0:20-0:50]**

First... a one-time setup. Open the File menu... and click Relay Setup.

Click "Generate Credentials" to create your private relay.

This is an encrypted channel between Amazon and your app. No one else can see your data.

Now drag the bookmarklet that appears... onto your browser's bookmarks bar.

That's it. Setup done. You'll never need to do this again.

---

**[SCENE 3: Fetch Your Library — 0:50-1:35]**

Now go to your Amazon library page... and click the ReaderWrangler bookmarklet.

A progress panel opens and starts fetching your library.

First it collects your book titles, covers, and metadata.

Then it fills in descriptions and reviews.

Then it adds genre tags automatically from Amazon's own categories.

Finally it checks current prices.

For a large library... this takes a few minutes. Go grab a coffee.

When it's done... your books are waiting in the relay, ready to import.

---

**[SCENE 4: Import to App — 1:35-2:00]**

Back in ReaderWrangler... open the File menu... and click "Import from Relay."

Your books arrive. The app tells you exactly how many are new.

They land in your Inbox... ready to organize.

---

**[SCENE 5: Organize — 2:00-2:45]**

The Inbox is your staging area. Everything new arrives here.

Right-click in the Folders panel... and choose "New Folder." Name it "Next to Read."

Now drag books in.

Create another folder... "Finished Reading."

Drag more books over.

Want to find all your fantasy books at once? Click Views in the sidebar.

ReaderWrangler automatically tagged your books from Amazon metadata. Fantasy, thriller, science fiction... it's all there.

---

**[SCENE 6: Wrap Up — 2:45-3:00]**

That's it.

Your books. Your order. Finally.

Everything fetched directly from Amazon... organized however you want... running entirely in your browser.

Start wrangling your reading chaos today.

---

### Screen Direction

**[SCENE 1: 0:00-0:20]**
- Show Amazon "Your Books" page — flat unorganized grid of many books
- Text overlay: "2,500 books. 0 ways to organize them."
- Transition to clean ReaderWrangler app (empty state)

**[SCENE 2: 0:20-0:50]**
- Click File menu (highlight)
- Click "Relay Setup"
- Relay Setup dialog opens — zoom in
- Click "Generate Credentials" (highlight button with circle)
- Credentials appear, bookmarklet button appears
- **Slow motion**: Drag bookmarklet button to browser bookmarks bar
- Show bookmarklet appearing in bar (highlight)
- Close dialog

**[SCENE 3: 0:50-1:35]**
- Navigate to Amazon library page (amazon.com/hz/mycd/digital-console/contentlist/booksPurchased)
- Click bookmarklet in toolbar
- Progress dialog appears (zoom in)
- Show Phase 1 count climbing: "Fetching titles… 123/500"
- Show Phase 2: "Enriching descriptions…"
- Show Phase 3: "Fetching tags…"
- Show Phase 4: "Checking prices…"
- Time-lapse to completion
- "Upload complete" message in dialog

**[SCENE 4: 1:35-2:00]**
- Switch to ReaderWrangler tab
- File → Import from Relay (highlight)
- Progress dialog: "Checking relay… 12 new books found"
- Books animate into Inbox
- Inbox shows count badge (12)

**[SCENE 5: 2:00-2:45]**
- Inbox selected, books visible in right pane
- Right-click in Folders sidebar → New Folder
- Type "Next to Read" → Enter
- Drag 3-4 books from right pane into folder
- Repeat for "Finished Reading"
- Click Views section label in sidebar
- Card grid shows tag views: Fantasy, Thriller, Science Fiction...
- Click "Fantasy" tag view → right pane shows all fantasy books

**[SCENE 6: 2:45-3:00]**
- Zoom out to show organized sidebar and full book pane
- Fade to ReaderWrangler logo
- End card: "ReaderWrangler.com — Start organizing today"

### Timing Notes

| Timestamp | Narration Cue | Visual Action |
|-----------|---------------|---------------|
| 0:20 | "Open the File menu" | File menu opens |
| 0:30 | "Generate Credentials" | Click button |
| 0:42 | "drag the bookmarklet" | Begin slow-motion drag |
| 0:50 | "Now go to your Amazon library" | Navigate to Amazon |
| 0:55 | "click the ReaderWrangler bookmarklet" | Click bookmarklet |
| 1:05 | "First it collects titles" | Phase 1 counter climbing |
| 1:30 | "When it's done" | Upload complete message |
| 1:35 | "Back in ReaderWrangler" | Switch tabs |
| 1:40 | "Import from Relay" | Click menu item |
| 1:52 | "They land in your Inbox" | Books appear, Inbox badge |
| 2:00 | "New Folder" | Right-click menu |
| 2:20 | "Click Views in the sidebar" | Click Views label |

### Production Notes

**Voice Selection Test:**
- Record this script with both Journey-D and Journey-F
- Pick voice that sounds warm and encouraging, not overly energetic
- Document choice below once decided

**Selected Voice**: [TBD after testing]

**Animation Highlights Needed:**
- Circle/arrow to highlight Relay Setup menu item
- Highlight on bookmarklet appearing in bookmarks bar
- Progress counter animation (numbers climbing)
- Inbox badge appearing with count

**Potential Issues:**
- Fetcher phase timing varies by library size (use time-lapse liberally)
- Relay credentials dialog appearance (record with clean state)

---

## Video 2: Setting Up the Relay

### Target Length
1-2 minutes

### Goal
Detailed one-time setup: Relay Setup dialog, credential generation, bookmarklet install, testing the connection

### Scene Prep
- Fresh ReaderWrangler install (no relay configured)
- Chrome with bookmarks bar visible

### Script
[TO BE WRITTEN — cover: File → Relay Setup, Generate Credentials, drag bookmarklet, test with Amazon page]

### Screen Direction
[TO BE DEFINED]

---

## Video 3: Fetching Your Library

### Target Length
2-3 minutes

### Goal
All five fetcher phases explained — what each does, how long it takes, incremental fetch behavior, orphan detection

### Key Topics
- Phase 1: Titles/metadata (incremental — stops at overlap on re-run)
- Phase 2: Descriptions + reviews (new books + gap-fill)
- Phase 3: Genre tags (incremental, 10/run cap)
- Phase 4: Prices (all books every run)
- Phase 5: Background orphan scan (flags books removed from Amazon)
- Multi-state dialog: fetch progress → fetch done + scan → final result
- Re-running the fetcher: only new books fetched (delta count)

### Scene Prep
TBD

### Script
[TO BE WRITTEN]

### Screen Direction
[TO BE DEFINED]

---

## Video 4: Organizing with Folders

### Target Length
3-4 minutes

### Goal
Inbox workflow, creating folders, drag-drop, nested hierarchy, folder properties, trash bin

### Key Topics
- Inbox as staging area (books always land here on import)
- Create folders (right-click sidebar, toolbar button)
- Drag books from Inbox to folders
- Create subfolders (nested hierarchy)
- Hardlink model: same book can be in multiple folders
- Cut/Copy/Paste folders and books
- Trash bin: soft delete → recover → empty
- Folder Properties: rename, description, book count

### Scene Prep
TBD

### Script
[TO BE WRITTEN]

### Screen Direction
[TO BE DEFINED]

---

## Video 5: Finding Books — Views & Filters

### Target Length
2-3 minutes

### Goal
Views section navigation, tag virtual folders, filter panel, ownership badges, All Books

### Key Topics
- All Books: full library view (read-only, can't organize from here)
- Views section: tag virtual folders as a different lens on the same books
- Pinning a tag view
- Filter panel: read status, tags, ownership type
- Ownership badges on covers: KU, Prime, Sample, Borrowed
- Orphan filter: "Removed from Amazon"
- Multi-column sorting: Shift+Click for secondary sort

### Scene Prep
TBD

### Script
[TO BE WRITTEN]

### Screen Direction
[TO BE DEFINED]

---

## Video 6: Wishlist & Discovery

### Target Length
2-3 minutes

### Goal
Track books you want to buy — add from product pages, series pages, author pages; price goals and deals

### Key Topics
- Wishlist bookmarklet on Amazon product page
- Series page bulk import (with gap detection)
- Author bibliography import (all Kindle books by author)
- Price tags on covers
- Price goals: set target price, get notified in Deals filter
- Deals filter (green theme) — shows books currently below goal

### Scene Prep
TBD

### Script
[TO BE WRITTEN]

### Screen Direction
[TO BE DEFINED]

---

## Video 7: Mobile Sync

### Target Length
1-2 minutes

### Goal
Show QR pairing, mobile PWA experience, device state sync

### Key Topics
- Show QR code in app (from sync options)
- Scan with phone camera → mobile app opens in phone browser
- Library appears on phone
- Browse and search on mobile
- Reading status syncs back to desktop

### Scene Prep
TBD

### Script
[TO BE WRITTEN]

### Screen Direction
[TO BE DEFINED]

---

## Video 8: Power Features

### Target Length
2-3 minutes

### Goal
Undo/redo, keyboard shortcuts, backup/restore, auto-organize

### Key Topics
- Undo/Redo: Ctrl+Z/Y, extensive history
- Keyboard shortcuts reference (Help → Keyboard Shortcuts)
- Save Backup / Restore Backup (File menu)
- Auto-Organize: rule-based folder assignment
- Data Status indicator

### Scene Prep
TBD

### Script
[TO BE WRITTEN]

### Screen Direction
[TO BE DEFINED]

---

## Production Notes

### Voice Selection
- Test both Journey-D and Journey-F with first script
- Pick one voice and use consistently across ALL videos
- Record voice preference here once decided: [TBD]

### Character Count Tracking
- Video 1: ~1,850 characters ✅ SCRIPT COMPLETE (v3 — relay era rewrite)
- Video 2: [TBD]
- Video 3: [TBD]
- Video 4: [TBD]
- Video 5: [TBD]
- Video 6: [TBD]
- Video 7: [TBD]
- Video 8: [TBD]
- **Total**: ~1,850 / 1,000,000 free tier limit (0.2% used)

### File Organization
- Scripts: `/video-scripts/`
- Narration audio: `/video-audio/`
- Final videos: `/videos/`

---

## Prerequisites

### Screenshot Capture — PENDING

Before recording videos, capture AFTER screenshot showing organized library:

**Setup:**
- Organize library into folder structure with 4-5 folders:
  - "Next to Read"
  - "Time Travel"
  - "Thrillers"
  - "Favorites ⭐"
  - "Currently Reading"
- Demonstrates the solution: order and control

**Capture:**
- Show ReaderWrangler with populated folder tree and book list
- Save to images/ folder

**Usage:**
- Use in video thumbnails
- Use in landing page hero section
- Use in README.md documentation

---

## Next Steps

1. **Complete screenshot capture** (before video recording)
2. Test Video 1 script with Journey-D and Journey-F voices
3. Select voice and document decision
4. Record Video 1
5. Draft scripts for Videos 2–4 (setup, fetch, organize — core user journey)
6. Iterate on remaining videos based on learnings
