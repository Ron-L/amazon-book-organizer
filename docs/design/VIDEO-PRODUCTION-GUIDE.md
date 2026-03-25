# ReaderWrangler Video Production Guide

**Created:** 2026-03-24
**App Version:** v6.9.0
**Status:** Active — single source of truth for all video production

---

## Overview

Nine videos total: one sizzle reel (hook) + eight tutorials (teach). All videos use the 119-book demo library as their starting state for controlled, reproducible recordings.

| # | Video | Length | Audience | Script Status |
|---|-------|--------|----------|---------------|
| 0 | Sizzle Reel | 20-30 sec | Everyone (landing page, social) | Shot list ready |
| 1 | Quick Start | 3 min | Brand new users | Script complete (needs demo library update) |
| 2 | Setting Up the Relay | 1-2 min | New users who skipped Quick Start | Script ready |
| 3 | Fetching Your Library | 2-3 min | Users who want to understand the fetcher | Script ready |
| 4 | Organizing with Folders | 3-4 min | Users who imported and need to organize | Script ready |
| 5 | Views & Filters | 3-4 min | Users with large libraries | Script ready |
| 6 | Wishlist & Discovery | 2-3 min | Users who want to track books before buying | Script ready |
| 7 | Mobile Sync | 1-2 min | Users who read on phone | Script ready |
| 8 | Power Features | 2-3 min | Advanced users | Script ready |

**Where videos are published:**
- `tutorials.html` — embedded on the tutorial hub page
- YouTube — for searchability and sharing
- App Help menu → "Watch Tutorials" links to tutorials.html

---

## Production Setup

### Tools

| Tool | Purpose | Cost |
|------|---------|------|
| **OBS Studio** | Screen recording | Free |
| **CapCut Desktop** | Video editing (rapid cuts, zoom transitions, beat sync, text overlays) | Free |
| **Google Cloud TTS** | Narration (Neural2/Journey voices) | Free tier: 1M chars/month |

### Screen Recording Settings (OBS)

- Resolution: 1920x1080 (or match monitor)
- Frame rate: 60fps (allows smooth slow-motion in post)
- Format: MKV (remux to MP4 after recording — prevents corruption on crash)
- Capture: Window capture (ReaderWrangler browser tab) or Display capture for cross-app scenes
- Mouse: Show cursor, no click highlights (add in post with CapCut if needed)

### Voice Selection

**Google Cloud TTS Journey voices** — designed for long-form tutorial narration:
- `en-US-Journey-D` (male, warm, conversational)
- `en-US-Journey-F` (female, friendly, clear)

**Test both with Video 1 script.** Pick the voice that sounds warm and encouraging, not overly energetic. Use consistently across ALL videos.

**Selected Voice:** [TBD after testing]

**Demo/Testing:** https://cloud.google.com/text-to-speech#demo

**TTS Script Formatting:**
- Use periods for natural pauses (not commas only)
- Add `...` for longer dramatic pauses
- Use contractions ("you'll" not "you will")
- Break long sentences into shorter ones
- Speed: 0.9x for instructional content (slower = clearer)

### Music

For sizzle reel only (tutorials use voiceover, not music).

| Source | Cost | Notes |
|--------|------|-------|
| **Uppbeat** | Free tier (credit required) | Curated for creators, easy BPM filtering |
| **Pixabay Music** | Free, no attribution | Large library |

**Sizzle reel music specs:** 120-140 BPM, modern/electronic, builds energy. CapCut has beat markers that auto-snap cuts to the beat.

**Selected Track:** [TBD]

### Character Count Tracking (TTS Free Tier)

| Video | ~Characters |
|-------|-------------|
| 0 (Sizzle) | 0 (no voiceover) |
| 1 (Quick Start) | ~1,850 |
| 2 (Relay Setup) | ~900 |
| 3 (Fetching) | ~1,400 |
| 4 (Organizing) | ~2,200 |
| 5 (Views & Filters) | ~2,400 |
| 6 (Wishlist) | ~1,400 |
| 7 (Mobile) | ~800 |
| 8 (Power Features) | ~1,500 |
| **Total** | **~12,450 / 1,000,000** (1.2%) |

### File Organization

```
video-production/
├── scripts/          TTS-ready text files per video
├── audio/            Generated narration audio files
├── recordings/       Raw OBS screen recordings
├── edits/            CapCut project files
└── final/            Finished MP4s for upload
```

---

## Demo Library Integration

**All videos use `readerwrangler-demo-library.json` as starting state.**

### Standard Scene Prep

1. Reset app (File → Reset App) or use a fresh browser profile
2. File → Restore Backup → select `readerwrangler-demo-library.json`
3. 119 books appear in Inbox
4. For "organized" scenes: pre-organize into target folder structure (see DEMO-LIBRARY-PLAN.md)

### Target Folder Structure (post-organize)

```
📁 Folders
  └── 📥 Inbox (stragglers)
  └── 📁 Thrillers
      └── 📁 Lee Child / Jack Reacher
      └── 📁 Tom Clancy / Jack Ryan, Op-Center, Other
      └── 📁 Daniel Suarez
  └── 📁 Literary Fiction
      └── 📁 Fredrik Backman
      └── 📁 Other Literary
  └── 📁 Urban Fantasy
      └── 📁 Jim Butcher / Dresden Files, Anthologies
      └── 📁 Neil Gaiman
      └── 📁 Mary Janice Davidson
      └── 📁 Laurell K. Hamilton
  └── 📁 Science Fiction
      └── 📁 Larry Niven
      └── 📁 Jerry Pournelle
      └── 📁 Niven & Pournelle (copies)
      └── 📁 Robert A. Heinlein
      └── 📁 Jodi Taylor
  └── 📁 Classics
  └── 📁 Non-Fiction
      └── 📁 American Founding Documents
      └── 📁 Cooking
      └── 📁 Other Non-Fiction
  └── 📁 Technical
  └── 🗑️ Trash
```

### Demo Whitelist (for live fetch recordings)

Videos that show live fetching use the whitelist filter so only demo books are fetched:
1. Load whitelist: run `.private/load-demo-whitelist.js` in DevTools on amazon.com
2. Fetcher will only process the 119 demo ASINs
3. Console shows: `🔒 Demo whitelist active: 119 ASINs`

---

## Video 0: Sizzle Reel

### Target Length
20-30 seconds

### Style
Rapid cuts (1-3 sec each), zoom in/out transitions (0.25s), no voiceover, music only. 12-15 shots total. Text overlays for key moments. Beat-synced cuts.

### Shot List

| # | Duration | Shot | Text Overlay | Purpose |
|---|----------|------|-------------|---------|
| 1 | 1.5s | Amazon library page — flat grid, hundreds of tiny covers, no organization | — | The pain |
| 2 | 0.5s | Hard cut to black | "Enough." | Emotional beat |
| 3 | 1.5s | ReaderWrangler — organized folder tree with books flowing into view | — | The solution |
| 4 | 1s | Cover view — grid of covers with rating stars, badges | — | Visual wow |
| 5 | 1s | Zoom: click tag view → books filter instantly | — | Speed |
| 6 | 1s | Drag 3 books into a folder — satisfying drop animation | — | Tactile feel |
| 7 | 1s | Auto-Organize dialog → folder tree populates with author/series hierarchy | — | Magic moment |
| 8 | 1s | Quick zoom through: search filtering → results narrowing in real-time | — | Discovery |
| 9 | 1s | Mobile phone showing same organized library | — | Cross-device |
| 10 | 1s | Book detail modal — large cover, description, Amazon + personal ratings | — | Polish |
| 11 | 0.5s | Zoom out: full organized library with sidebar + cover grid | — | Hero shot |
| 12 | 2s | Logo on dark background | "Your books. Your order. Finally." + readerwrangler.com | Brand close |

**Total:** ~12.5 seconds of content + ~12 seconds of transitions = ~25 seconds

### Scene Prep
- Pre-organized demo library in target folder structure
- Several tag views pinned (Fantasy, Thriller, Science Fiction)
- A few books tagged "Next"
- Cover view active for visual impact
- Browser at 100% zoom, clean profile (no personal bookmarks)
- Amazon library page open in separate tab (for shot 1)

### Editing Notes
- Transitions: CapCut zoom in/out presets, 0.2-0.3s each
- Music: select 120-140 BPM track, enable beat markers in CapCut
- Snap cuts to beat hits for maximum impact
- Color grade: slightly boost contrast and saturation for covers
- Text: clean sans-serif, white on dark, fade in/out (not slide)

---

## Video 1: Quick Start

### Target Length
3 minutes

### Audience
Brand new users who need to get started fast

### Scene Prep
- Fresh ReaderWrangler state (File → Reset App or fresh browser profile)
- Amazon account logged in
- Chrome with bookmarks bar visible
- Demo whitelist loaded on amazon.com (for controlled fetch)

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

**[ALT: Demo Library Quick Path — insert after Scene 1 if showing both paths]**

Don't want to connect your Amazon account yet? No problem.

Download the Demo Library from the landing page... then use File... Restore Backup... to load it.

A hundred classic books appear in your Inbox... ready to organize right now. You can connect your real library later.

---

### Screen Direction

**[SCENE 1: 0:00-0:20]**
- Show Amazon "Your Books" page — flat unorganized grid of many covers
- Text overlay: "2,500 books. 0 ways to organize them."
- Transition to clean ReaderWrangler app (empty state)

**[SCENE 2: 0:20-0:50]**
- Click File menu (highlight)
- Click "Relay Setup"
- Relay Setup dialog opens — accordion style, Step 1 expanded
- Click "Generate Credentials" (highlight button)
- Credentials appear, green checkmark, bookmarklet button appears in Step 2
- Open Step 2 (accordion expands)
- **Slow motion**: Drag bookmarklet onto browser bookmarks bar
- Show bookmarklet appearing in bar (highlight)
- Close dialog

**[SCENE 3: 0:50-1:35]**
- Navigate to Amazon library page
- Click bookmarklet in toolbar
- Progress dialog appears (zoom in)
- Show Phase 1 counter: "Fetching titles… 45/119"
- Show Phase 2: "Enriching descriptions…"
- Show Phase 3: "Fetching tags…"
- Show Phase 4: "Checking prices…"
- Time-lapse to completion
- "Upload complete" message
- Note: with whitelist, this runs fast (~2 min for 119 books)

**[SCENE 4: 1:35-2:00]**
- Switch to ReaderWrangler tab
- File → Import from Relay (highlight)
- Progress dialog: "Checking relay… 119 new books found"
- Books appear in Inbox
- Inbox badge count shows 119

**[SCENE 5: 2:00-2:45]**
- Inbox selected, books visible in right pane (list view)
- Right-click Folders label → New Folder
- Type "Next to Read" → Enter
- Drag 3-4 books from right pane into folder
- Create "Finished Reading" folder
- Drag more books
- Click Views section label in sidebar
- Card grid shows tag views: Fantasy, Thriller, Science Fiction...
- Click "Fantasy" tag view → right pane shows all fantasy books

**[SCENE 6: 2:45-3:00]**
- Zoom out to show organized sidebar and full cover pane
- Fade to ReaderWrangler logo
- End card: "readerwrangler.com"

### Timing Notes

| Timestamp | Narration Cue | Visual Action |
|-----------|---------------|---------------|
| 0:20 | "Open the File menu" | File menu opens |
| 0:25 | "Relay Setup" | Click Relay Setup |
| 0:30 | "Generate Credentials" | Click button, accordion step |
| 0:42 | "drag the bookmarklet" | Begin slow-motion drag |
| 0:50 | "Now go to your Amazon library" | Navigate to Amazon |
| 0:55 | "click the ReaderWrangler bookmarklet" | Click bookmarklet |
| 1:05 | "First it collects titles" | Phase 1 counter climbing |
| 1:30 | "When it's done" | Upload complete message |
| 1:35 | "Back in ReaderWrangler" | Switch tabs |
| 1:40 | "Import from Relay" | Click menu item |
| 1:52 | "They land in your Inbox" | Books appear, Inbox badge |
| 2:00 | "Right-click... New Folder" | Right-click menu |
| 2:20 | "Click Views" | Click Views label |

### Animation Highlights
- Circle/arrow on Relay Setup menu item
- Highlight on bookmarklet appearing in bookmarks bar
- Progress counter animation (numbers climbing)
- Inbox badge appearing with count

---

## Video 2: Setting Up the Relay

### Target Length
1-2 minutes

### Audience
New users who need detailed setup guidance, or users re-pairing after a reset

### Scene Prep
- Fresh ReaderWrangler state (no relay configured)
- Chrome with bookmarks bar visible
- Clean browser profile

### Script (TTS-Optimized)

**[SCENE 1: Why the Relay — 0:00-0:15]**

Before you can import your Kindle library... you need to set up the relay. This is a one-time step.

The relay is an encrypted channel. It transfers your book data securely between Amazon and your app. No one else can see it.

---

**[SCENE 2: Generate Credentials — 0:15-0:35]**

Open the File menu... and click Relay Setup.

The dialog shows three steps. Click the first one... Encryption Keys.

Click "Generate Credentials." Two keys appear instantly... and a green checkmark confirms they're verified.

These keys are unique to you. They encrypt everything that passes through the relay.

---

**[SCENE 3: Install Bookmarklet — 0:35-0:55]**

Now open Step 2... Install Bookmarklet.

You'll see a button labeled "ReaderWrangler." Drag it onto your browser's bookmarks bar.

That's your import tool. One click on any Amazon page starts the fetch.

---

**[SCENE 4: Test Connection — 0:55-1:10]**

Want to make sure it's working? Click "Test Connection" in Step 1.

A green "Connected" message appears. Your relay is live and ready.

---

**[SCENE 5: You're Done — 1:10-1:20]**

That's it. Click Done to close.

Your credentials are saved automatically. The bookmarklet stays in your bookmarks bar. You're ready to import your library.

---

### Screen Direction

**[SCENE 1: 0:00-0:15]**
- Show ReaderWrangler app, empty state
- Brief text overlay: "One-time setup"

**[SCENE 2: 0:15-0:35]**
- File → Relay Setup
- Dialog opens with three accordion steps
- Click Step 1 header — accordion expands
- Click "Generate Credentials"
- Keys appear in fields, green checkmark icon, animated left accent stripe pulses
- Zoom in on the verified state

**[SCENE 3: 0:35-0:55]**
- Click Step 2 header — accordion expands (Step 1 collapses)
- Show bookmarklet button with label "ReaderWrangler"
- **Slow motion**: Drag bookmarklet to bookmarks bar
- Bookmarklet appears in bar — highlight

**[SCENE 4: 0:55-1:10]**
- Click Step 1 again to expand
- Click "Test Connection" button
- Green "Connected" sub-label appears below button
- Zoom in on the green result

**[SCENE 5: 1:10-1:20]**
- Click "Done" button
- Dialog closes
- App shows empty Inbox — ready for import

---

## Video 3: Fetching Your Library

### Target Length
2-3 minutes

### Audience
Users who want to understand what the fetcher does and how incremental updates work

### Scene Prep
- Relay configured, bookmarklet installed
- Demo whitelist loaded on amazon.com
- Amazon account logged in
- For incremental demo: first run completed, then add a few books to show delta

### Script (TTS-Optimized)

**[SCENE 1: Starting the Fetch — 0:00-0:20]**

With your relay set up and bookmarklet installed... go to your Amazon library page.

Click the ReaderWrangler bookmarklet in your bookmarks bar.

A progress panel appears... and the fetch begins automatically.

---

**[SCENE 2: The Five Phases — 0:20-1:20]**

The fetcher runs five phases. Each one adds a different layer of information.

Phase 1 collects your book titles... authors... covers... and basic metadata. You'll see a counter climbing as each page is processed.

Phase 2 fills in descriptions and customer reviews. If any were missed on a previous run... it catches them now.

Phase 3 adds genre tags. Amazon categorizes every book... and ReaderWrangler imports those tags. It processes up to ten new books per run... so for a large library... this builds up over a few fetches.

Phase 4 checks current prices for all your books. This runs every time... so your price data stays fresh.

Phase 5 is a background scan. It compares your library against Amazon... and flags any books that have been removed. Maybe a Prime Reading title rotated out... or a Kindle Unlimited book expired.

---

**[SCENE 3: Upload and Import — 1:20-1:45]**

When all phases complete... your library is uploaded to the relay.

Switch back to ReaderWrangler... open the File menu... and click Import from Relay.

A progress dialog shows how many new books were found. They land in your Inbox... ready to organize.

---

**[SCENE 4: Incremental Updates — 1:45-2:15]**

The next time you run the fetcher... it's much faster.

Phase 1 stops as soon as it hits books it already knows about. Only new purchases get processed.

Descriptions and tags only run for new books and any gaps from before.

Prices still check everything... but that's quick.

The result? A library that stays current with one click. Run it weekly... or whenever you buy new books.

---

**[SCENE 5: The Scan Results — 2:15-2:30]**

After the fetch... the dialog shows a summary. How many books were fetched... how many are new... and whether any orphans were detected.

You'll see "Import from Relay" right there in the dialog. One click to bring everything into the app.

---

### Screen Direction

**[SCENE 1: 0:00-0:20]**
- Navigate to amazon.com/hz/mycd/digital-console/contentlist/booksPurchased
- Click bookmarklet
- Progress panel appears at top of Amazon page

**[SCENE 2: 0:20-1:20]**
- Phase 1: counter climbing "Fetching titles… 23/119" — zoom in on counter
- Phase 2: "Enriching descriptions…" with progress
- Phase 3: "Fetching tags… 10/10" — note the cap
- Phase 4: "Checking prices…"
- Phase 5: "Scanning for orphans…" — background, counter shows pages
- Show info banner: "Incremental scan — 119 existing books"

**[SCENE 3: 1:20-1:45]**
- "Upload complete" message in dialog
- Switch to ReaderWrangler tab
- File → Import from Relay
- Progress dialog → "119 new books found"
- Inbox fills with books

**[SCENE 4: 1:45-2:15]**
- (Pre-recorded second run with a few new books added)
- Phase 1 stops early: "Found overlap at page 1"
- Much faster completion
- Import shows: "3 new books"

**[SCENE 5: 2:15-2:30]**
- Show multi-state dialog: summary with book count, orphan count
- "Import from Relay" CTA button in dialog
- Click it — done

---

## Video 4: Organizing with Folders

### Target Length
3-4 minutes

### Audience
Users who imported books and need to organize them

### Scene Prep
- Demo library loaded, all 119 books in Inbox
- No folders created yet (fresh import state)

### Script (TTS-Optimized)

**[SCENE 1: The Inbox — 0:00-0:15]**

All your imported books land in the Inbox. Think of it as your staging area.

Right now you have 119 books waiting to be organized. Let's fix that.

---

**[SCENE 2: Auto-Organize — 0:15-0:50]**

ReaderWrangler can do the heavy lifting. Open the File menu... and click Auto-Organize.

The wizard scans your Inbox... and groups books by author and series. Use the slider to set a minimum... like three books per author.

Click Preview to see what it'll create. Author folders... with series subfolders inside them.

Happy with it? Click Apply. Watch the folder tree fill up.

Don't like what happened? Press Control-Z. The entire operation undoes in one step.

---

**[SCENE 3: Manual Refinement — 0:50-1:30]**

Auto-Organize gives you a great starting point. Now make it yours.

Right-click the Folders label... and choose New Folder. Call it "Thrillers."

Now drag an author folder into it. Lee Child... into Thrillers. Tom Clancy... into Thrillers.

You can also create subfolders. Right-click a folder... Create Subfolder. Name it "Jack Ryan."

Drag the Jack Ryan series books in.

---

**[SCENE 4: Copies — 1:30-2:00]**

Some books belong in more than one place. Larry Niven and Jerry Pournelle wrote books together.

Hold Control and drag a collaboration from Niven's folder into Pournelle's folder. The book now appears in both places.

A toast message confirms: "Same book, two folders. Your ratings, notes, and edits apply to both."

This works great for anthologies too. Jim Butcher's anthologies contain Dresden Files stories... so they belong in both the Anthologies folder and the Dresden Files folder.

---

**[SCENE 5: Folder Properties — 2:00-2:20]**

Right-click any folder... and choose Properties.

You can rename it... and add a description. The description appears as a tooltip when you hover.

Try "All Sanderson books by publication order." Now when you hover over that folder... you see the note.

---

**[SCENE 6: Deleting and the Trash Bin — 2:20-2:55]**

See a book you don't want? Select it and press Delete.

It moves to the Trash Bin at the bottom of the sidebar. Not gone... just set aside. All its data... ratings, notes, tags... stays intact.

One thing to know. If a book lives in multiple folders... deleting it from one folder just removes it from that folder. The book only goes to Trash when you remove its last folder reference.

Changed your mind? Drag it from Trash back into any folder. It's restored... with all its data.

Purchased books show a warning first: they'll reappear on your next fetch. You can choose "Hide Instead" to keep them out of sight without deleting.

When you're sure... right-click Trash and choose Empty Trash. That's permanent.

---

**[SCENE 7: Wrap Up — 2:50-3:05]**

From a flat pile of 119 books... to a structured library in minutes.

Remember... Control-Z undoes anything. Experiment freely.

---

### Screen Direction

**[SCENE 1: 0:00-0:15]**
- Show Inbox selected, 119 books in right pane (list view)
- Scroll through a few — show covers, authors, series info

**[SCENE 2: 0:15-0:50]**
- File → Auto-Organize
- Wizard dialog opens, source: Inbox
- Adjust slider to 3 books minimum
- Click Preview — show preview of proposed folders
- Click Apply — folder tree populates (zoom on tree expanding)
- Briefly show Ctrl+Z undo — tree collapses back
- Redo with Ctrl+Y — tree restores

**[SCENE 3: 0:50-1:30]**
- Right-click Folders label → New Folder → "Thrillers"
- Drag "Lee Child" folder into Thrillers
- Drag "Tom Clancy" folder into Thrillers
- Right-click Tom Clancy → Create Subfolder → "Jack Ryan"
- Drag Jack Ryan books into the subfolder

**[SCENE 4: 1:30-2:00]**
- Navigate to Larry Niven folder — show "Lucifer's Hammer"
- Ctrl+Drag "Lucifer's Hammer" to Jerry Pournelle folder
- Toast appears: "Copied to 'Jerry Pournelle'..."
- Navigate to Pournelle folder — show book appears there too
- Repeat concept with Butcher anthology → Dresden Files folder

**[SCENE 5: 2:00-2:20]**
- Right-click folder → Properties
- Type a description
- Click Save
- Hover over folder — tooltip appears

**[SCENE 6: 2:20-2:50]**
- Select a book → press Delete
- Confirmation dialog → Delete
- Trash badge appears with count
- Click Trash → show deleted book
- Drag book from Trash to Inbox — restored
- Select a purchased book → Delete → warning dialog with "Hide Instead" option
- Right-click Trash → Empty Trash → permanent confirmation

**[SCENE 7: 2:50-3:05]**
- Zoom out to show full organized sidebar
- Fade to logo

---

## Video 5: Views & Filters

### Target Length
3-4 minutes

### Audience
Users with large libraries who want to find books quickly

### Scene Prep
- Demo library organized into target folder structure
- Several tag views already visible in Views section
- Cover view available for badge demo

### Script (TTS-Optimized)

**[SCENE 1: Views vs Folders — 0:00-0:25]**

ReaderWrangler has two ways to see your books. Folders... and Views.

Folders are your personal organization. You put books where you want them.

Views are automatic. They show your books through a different lens... like genre tags from Amazon. A book can appear in many views without being duplicated.

Hover over Views in the sidebar... the tooltip says it: "Different ways to see the same books — not separate copies."

---

**[SCENE 2: All Books — 0:25-0:40]**

Click "All Books" in the Views section. Every book in your library appears here... from every folder.

You can search, filter, and sort... but you can't drag books out. All Books is a view... not a container.

---

**[SCENE 3: Tag Views — 0:40-1:10]**

Below All Books... you'll see tag views. Fantasy. Thriller. Science Fiction.

These come from Amazon's own genre categories... imported automatically.

Click Fantasy... and every book tagged Fantasy appears. Even if they're in different folders.

Want to create your own? Tag a few books as "Next to Read." Then pin that tag in the Views section. Now you have a virtual folder of everything you want to read next... across all your folders.

Pinned views stay until you unpin them. They're always there when you come back.

---

**[SCENE 4: Cover View and Badges — 1:10-1:45]**

Switch to cover view using the grid icon in the toolbar.

Your library becomes a visual wall of book covers. Great for browsing when you're in the mood to pick something by its cover. List view is better when you need to compare details across many books.

Each cover tells you something at a glance.

Gold star in the corner? That's the Amazon rating. Green checkmark? You've read it. A price tag? That's a wishlist book with a tracked price.

You'll also see ownership badges. K-U for Kindle Unlimited. Prime. Sample. Borrowed. These help you filter by what you actually own versus what you're borrowing.

Both views honor all your active filters... so everything you see updates together.

---

**[SCENE 5: The Filter Panel — 1:45-2:20]**

The toolbar has powerful filters. Type in the search box to find any book by title or author.

Use the dropdown filters for read status... tags... and ownership type. The ownership filter includes "Removed from Amazon"... for books that have left your library... like expired Kindle Unlimited or Prime Reading titles.

Click "More" for advanced filters. Filter by Amazon rating... your personal rating... series... date added... or collections. You'll find special values like "Unrated"... "Not in Series"... and "Last 30 days" for recent additions.

Active filters show a count: "12 of 119 books." Click "Clear All" to reset.

Want to see books you've hidden? Toggle "Show Hidden" from the View menu. Hidden books appear at reduced opacity so you can tell them apart.

---

**[SCENE 6: Multi-Column Sorting and Personal Ratings — 2:20-2:55]**

Click any column header to sort. Click "Series" to group by series.

Now hold Shift and click the number column. Books sort by series first... then by number within each series. Perfect reading order. You can stack up to three sort levels this way. A normal click resets back to single-column sorting.

The status bar shows your sort chain: Series ascending... then number ascending. Column headers show small subscript indicators for secondary and tertiary sorts.

Try other combos. Sort by price descending... then shift-click rating ascending... to find cheap, highly-rated books. Or date added descending... then your personal rating descending... to see your recent favorites first.

Speaking of ratings... double-click any book to open the detail view. You'll see Amazon's yellow stars... and below them... your personal blue stars. Click to set your own rating. This is your rating... separate from Amazon's. Use the personal rating filter to find your five-star favorites across your entire library.

One more trick. You can drag books up and down within a folder to set a manual order. Manual ordering overrides column sorting for that folder... so you can keep your "Next to Read" list in exactly the order you want.

---

### Screen Direction

**[SCENE 1: 0:00-0:25]**
- Show sidebar with Views section (top) and Folders section (below)
- Hover over Views label — tooltip appears
- Point out the visual split

**[SCENE 2: 0:25-0:40]**
- Click All Books
- Right pane shows all 119 books
- Try dragging a book — show it's disabled
- Hover over All Books — tooltip: "Every book in your library..."

**[SCENE 3: 0:40-1:10]**
- Click ▼ chevron to expand Views section
- Click "Fantasy" tag view — right pane filters
- Show same book appearing in Fantasy view AND in a folder
- Tag a book: right-click → Tags → add "Next"
- Pin "Next" tag → appears in Views section

**[SCENE 4: 1:10-1:40]**
- Click grid icon (⊞) in toolbar → covers view
- Zoom in on a few covers showing badges:
  - Gold star (rating)
  - Green checkmark (read)
  - "KU" badge (Kindle Unlimited)
  - Price tag (wishlist)

**[SCENE 5: 1:45-2:20]**
- Type in search box → results narrow in real-time
- Use Read Status dropdown → "Read"
- Use Tags dropdown → select "Fantasy"
- Use Ownership dropdown → show "Removed from Amazon" option
- Click "More" → show expanded filter panel
- Show special values: "Unrated", "Not in Series", "Last 30 days"
- Blue banner: "12 of 119 books"
- Click "Clear All ×"
- View menu → "Show Hidden" → hidden books appear at reduced opacity
- Toggle off again

**[SCENE 6: 2:20-2:55]**
- Click "Series" column header → sorts
- Shift+Click "#" column → secondary sort added
- Status bar shows "Series ▲ → # ▲"
- Zoom in on column headers — show subscript indicators (①, ②)
- Normal click on "Title" — resets to single-column sort
- Shift+Click chain: Price ▼ → Rating ▲ (cheap + highly rated)
- Double-click a book → detail modal opens
- Zoom in on Amazon yellow stars vs. personal blue stars
- Click to set a 4-star personal rating
- Close detail modal
- Drag a book up/down within folder list — manual reorder
- Status bar shows "Manual order"

---

## Video 6: Wishlist & Discovery

### Target Length
2-3 minutes

### Audience
Users who want to track books before buying

### Scene Prep
- Demo library organized
- Amazon product page, series page, and author page open in tabs
- Wishlist bookmarklet installed (from nav hub)

### Script (TTS-Optimized)

**[SCENE 1: What's the Wishlist? — 0:00-0:15]**

Found a book you want to buy? Add it to your ReaderWrangler wishlist.

You can add books one at a time from any Amazon page... or grab an entire series or author bibliography at once.

---

**[SCENE 2: Adding from a Product Page — 0:15-0:40]**

On any Amazon book page... click the ReaderWrangler bookmarklet.

The nav hub appears. Click "Add to Wishlist."

The book's details are captured... cover, title, author, price... and uploaded to your relay.

Back in the app... Import from Relay. The wishlist book appears with a heart badge on its cover.

---

**[SCENE 3: Series Page Import — 0:40-1:10]**

Want an entire series? Navigate to the series page on Amazon.

Click the bookmarklet... then "Import Series."

ReaderWrangler scans the series page... captures every book... and shows which ones you already own.

Books you don't own get added to your wishlist. Books you do own are skipped.

---

**[SCENE 4: Author Bibliography — 1:10-1:35]**

Same idea for authors. Go to an author's Amazon page.

Click the bookmarklet... then "Author Bibliography."

Every Kindle book by that author is captured. Ones you own are skipped... the rest go to your wishlist.

---

**[SCENE 5: Price Goals and Deals — 1:35-2:10]**

Here's where it gets powerful. Right-click a wishlist book... and set a price goal.

Choose a preset... like "50% off"... or enter a custom target.

Now check the Deals filter in the toolbar. It lights up green when any wishlist book drops below your goal price.

Click it... and you see only the deals. Price tags on covers show the current price... and how much you're saving.

Run the fetcher periodically to keep prices fresh. ReaderWrangler checks every book's price on every run.

---

### Screen Direction

**[SCENE 1: 0:00-0:15]**
- Show app with organized library
- Brief text: "Track books before you buy"

**[SCENE 2: 0:15-0:40]**
- Switch to Amazon product page for a specific book
- Click bookmarklet → nav hub appears
- Click "Add to Wishlist"
- Progress → upload complete
- Switch to app → File → Import from Relay
- Show wishlist book with heart badge in Inbox

**[SCENE 3: 0:40-1:10]**
- Navigate to Amazon series page
- Click bookmarklet → "Import Series"
- Dialog shows books being scanned
- "3 added to wishlist, 5 already owned (skipped)"
- Import to app → wishlist books appear

**[SCENE 4: 1:10-1:35]**
- Navigate to Amazon author page
- Click bookmarklet → "Author Bibliography"
- Similar flow: scan, skip owned, add rest
- Import to app

**[SCENE 5: 1:35-2:10]**
- Right-click wishlist book → Set Price Goal → "50% off"
- Price tag badge appears on cover
- Click Deals toggle in toolbar → green theme activates
- Show filtered view: only books below goal price
- Zoom in on cover showing price tag with savings amount

---

## Video 7: Mobile Sync

### Target Length
1-2 minutes

### Audience
Users who want to browse their library on their phone

### Scene Prep
- Demo library organized on desktop
- Phone available for recording (or phone simulator)
- Relay configured on desktop

### Script (TTS-Optimized)

**[SCENE 1: Pairing — 0:00-0:30]**

Your organized library isn't stuck on your desktop. Let's put it on your phone.

Open File... Relay Setup... and go to Step 3... Mobile Pairing.

A QR code appears. Open your phone's camera... and scan it.

Your phone browser opens ReaderWrangler... and your library is already there. Folders, tags, everything.

---

**[SCENE 2: Browsing on Mobile — 0:30-1:00]**

The mobile app shows your library as a dashboard. Shelves for recent books... your folders... your tag views.

Tap a folder to browse. Tap a book to see its full details... cover, description, ratings, and reviews.

Search and sort work just like desktop. Tap the search icon... type an author name... and find what you're looking for.

---

**[SCENE 3: Add to Home Screen — 1:00-1:15]**

For an app-like experience... add ReaderWrangler to your home screen.

On your phone browser... tap the share button... then "Add to Home Screen."

Now it launches like a native app. Full screen. No browser bars.

---

**[SCENE 4: Wrap Up — 1:15-1:25]**

Organize on desktop. Browse on mobile. Your library... everywhere.

---

### Screen Direction

**[SCENE 1: 0:00-0:30]**
- Desktop: File → Relay Setup → Step 3 (Mobile Pairing)
- QR code visible
- Phone camera: aim at QR code
- Phone browser opens readerwrangler.com → library loads
- Split screen: desktop on left, phone on right

**[SCENE 2: 0:30-1:00]**
- Phone screen: mobile dashboard with shelves
- Tap "Thrillers" folder → books appear
- Tap a book → detail modal with cover, description, ratings
- Tap search → type "Heinlein" → results filter
- Scroll through cover grid

**[SCENE 3: 1:00-1:15]**
- Phone: browser menu → "Add to Home Screen"
- Home screen shows ReaderWrangler icon
- Tap icon → app opens full screen

**[SCENE 4: 1:15-1:25]**
- Split screen: organized desktop + phone showing same library
- Fade to logo

---

## Video 8: Power Features

### Target Length
2-3 minutes

### Audience
Users who want to work faster and protect their data

### Scene Prep
- Demo library organized into target folder structure
- A few actions to undo ready (pre-do a move and a delete)

### Script (TTS-Optimized)

**[SCENE 1: Undo and Redo — 0:00-0:30]**

ReaderWrangler tracks everything you do. Moved a book to the wrong folder? Press Control-Z. It's back.

Deleted a folder by accident? Control-Z. Restored... with all its books.

By the way... when you delete a folder... the books don't disappear. They move up to the parent folder. Nothing is ever lost.

Changed your mind about the undo? Control-Y to redo.

You can undo multiple steps in a row. Experiment freely... you can always go back.

---

**[SCENE 2: Keyboard Shortcuts — 0:30-1:00]**

Power users love keyboard shortcuts. Here are the essentials.

F2 renames the selected folder. Just type and press Enter.

Control-X cuts a folder. Notice the folder becomes transparent... showing it's on the clipboard. Control-V pastes it into the selected folder.

Control-C copies a folder with all its books.

Delete removes the selected folder... with a confirmation.

Press Escape to cancel any operation... close a menu... or clear the clipboard.

All shortcuts are listed in Help... Keyboard Shortcuts.

---

**[SCENE 3: Backup and Restore — 1:00-1:30]**

Your organization is precious. Let's protect it.

Open the File menu... and click Save Backup.

This saves everything. Your books... your folders... your tags... your sort orders... even your relay encryption keys. One file.

To restore... File... Restore Backup... and pick the file. Everything comes back exactly as it was.

Keep a backup after any major reorganization. If anything ever goes wrong... you can recover in seconds.

---

**[SCENE 4: Auto-Organize Deep Dive — 1:30-2:00]**

Auto-Organize is your best friend for a large Inbox.

It groups books by author. Authors with series get subfolders automatically. The slider controls the minimum... set it to one to organize everything... or five to only create folders for authors with five or more books.

Preview shows exactly what will happen before you commit. And the entire operation... no matter how many folders it creates... undoes in a single Control-Z.

---

**[SCENE 5: Data Status — 2:00-2:20]**

The colored dot next to the File menu is your Data Status indicator.

Green means everything is healthy. Click it for details.

The status dialog shows your book count... folder count... tag count... and whether integrity checks found anything.

If the dot turns yellow or red... click it to see what needs attention.

---

### Screen Direction

**[SCENE 1: 0:00-0:30]**
- Drag a book to wrong folder — show it landing
- Press Ctrl+Z — book returns to original folder
- Delete a folder with books — confirmation → delete
- Ctrl+Z — folder restored with books
- Ctrl+Y — redo the delete
- Ctrl+Z again — restored again

**[SCENE 2: 0:30-1:00]**
- Click folder → press F2 → type new name → Enter
- Ctrl+X on a folder — folder goes 50% opacity
- Click target folder → Ctrl+V — folder moves, opacity restored
- Show Ctrl+C → Ctrl+V — folder copy appears as "Name (Copy)"
- Help → Keyboard Shortcuts — show the full list dialog

**[SCENE 3: 1:00-1:30]**
- File → Save Backup → file save dialog
- Show the file in explorer (readerwrangler-backup-*.json)
- File → Restore Backup → pick the file
- Library restores — show folders, books, tags all intact

**[SCENE 4: 1:30-2:00]**
- File → Auto-Organize
- Show slider at different values (1, 3, 5)
- Click Preview — show the proposed hierarchy
- Click Apply — tree fills up
- Ctrl+Z — everything undone
- Ctrl+Y — restored

**[SCENE 5: 2:00-2:20]**
- Point to status dot (green) next to File menu
- Click it — Data Status dialog opens
- Show book count, folder count, integrity check results
- Close dialog

---

## Production Tips

### Visual Highlights to Emphasize
1. **Context menu appearance:** Show right-click trigger, menu positioning
2. **Keyboard shortcuts:** On-screen key overlay (e.g., "Ctrl+Z") when pressed
3. **Visual feedback:** 50% opacity on cut folders, badges on covers, drag cursor changes
4. **Progress dialogs:** Phase counters climbing, phase names appearing
5. **Inbox badge:** Count updating after import
6. **Toast messages:** Copy confirmation, tag confirmation

### Common Mistakes to Avoid in Demos
- Don't show personal Amazon data — use demo library + whitelist
- Don't skip confirmations (users need to know they exist)
- Don't forget to show undo after destructive operations
- Don't use All Books for move/delete demos (it's read-only)
- Don't rush transitions — let the viewer see the result before moving on

### Voiceover Script Guidelines
- Explain WHY each feature exists (user benefit, not technical detail)
- Mention keyboard shortcuts explicitly ("or press F2")
- Use "you" language ("your books", "your folders")
- Warn about destructive operations before showing them
- Emphasize undo availability

### Post-Production

**Text Overlays:**
- Keyboard shortcut indicators (e.g., "Ctrl+Z" when pressed)
- Feature names on first appearance (e.g., "Tag Views" label)
- Phase names during fetcher progress
- Step numbers for multi-step processes

**Pacing:**
- Menu/dialog appearance: 0.5 sec
- User reads menu items: 2-3 sec
- Operation execution: 0.5 sec
- Result verification: 1-2 sec
- Transition to next scene: 0.5 sec

### Scene Prep Checklist (Generic)
- [ ] Demo library loaded (Inbox or organized, per video)
- [ ] Clean browser profile (no personal bookmarks visible)
- [ ] Browser at 100% zoom
- [ ] No active dialogs or modals
- [ ] Clipboard cleared (Esc key)
- [ ] Console clean (no error spam)
- [ ] OBS recording confirmed (check red dot)
- [ ] Correct browser tab in focus

---

## Next Steps

1. Test TTS voices with Video 1 script — select voice
2. Select music track for sizzle reel
3. Set up OBS recording environment
4. Record sizzle reel screen captures
5. Record Video 1 (Quick Start)
6. Iterate on remaining videos based on learnings
