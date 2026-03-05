# ReaderWrangler User Guide

*Wrangle your reader chaos — Your books, your order.*

You have hundreds (maybe thousands) of Kindle books, and great reads are buried in the pile. ReaderWrangler imports your Amazon library and gives you a visual book explorer to organize, rediscover forgotten favorites, and never lose track of what to read next.

This guide covers everything from first setup to power-user workflows.

---

## Table of Contents

1. [Getting Started](#getting-started)
2. [Mobile Setup](#mobile-setup)
3. [Organizing Your Library](#organizing-your-library)
4. [Finding Books](#finding-books)
5. [Managing Your Data](#managing-your-data)
6. [Keyboard Shortcuts](#keyboard-shortcuts)
7. [Power User Tips](#power-user-tips)
8. [Troubleshooting](#troubleshooting)
9. [FAQ](#faq)

---

## Getting Started

### Step 1: Set Up the Relay

The relay is a secure, encrypted connection between Amazon and ReaderWrangler. It lets you import your library with one click.

1. Open ReaderWrangler on your desktop browser
2. Go to **File > Relay Setup**
3. Follow the prompts to generate your encryption keys and bookmarklet
4. Drag the bookmarklet to your browser's bookmarks bar

Your credentials are unique to you. All data is encrypted end-to-end — nobody (including the relay server) can read your library data.

### Step 2: Import Your Library

1. Click your **Library Download** bookmarklet — it navigates to the right Amazon page automatically
2. Wait for the fetcher to finish (roughly 1-2 minutes per 1000 books)
3. Back in ReaderWrangler, go to **File > Import from Relay**
4. Your books appear in the Inbox, ready to organize

### Step 3: Import Collections (Optional)

To get your Amazon reading status (Read/Unread) and collections:

1. Click your **Collections Download** bookmarklet (navigates to the right page automatically)
2. Import from Relay in ReaderWrangler

### Step 4: Import Your Wishlist (Optional)

The wishlist bookmarklet works from any Amazon book product page, series page, or author page:

1. Navigate to a book, series, or author page on Amazon
2. Click your **Wishlist Download** bookmarklet
3. Import from Relay in ReaderWrangler
4. Wishlist books appear with a heart badge on their covers

---

## Mobile Setup

ReaderWrangler has a dedicated mobile viewer for browsing your library on your phone.

### Pairing with Desktop

1. On your **phone**, open ReaderWrangler (readerwrangler.com)
2. The pairing screen appears with a camera viewfinder
3. On your **desktop**, go to **File > Relay Setup** — a QR code is displayed
4. Point your phone's camera at the QR code
5. Your phone and desktop are now paired. Your phone will automatically stay in sync with any changes you make on desktop.

**Alternative**: You can also pair by entering your Channel ID and Passphrase manually, or by importing a credentials file.

### What You Can Do on Mobile

- Browse your library with dashboard shelves showing each folder
- Navigate folders and subfolders
- View pinned tag collections
- Search across titles, authors, series, tags, and notes
- Sort by Manual Order, Date Added, Title, Author, or Rating
- Switch between cover grid and list views
- Tap any book for full details (description, reviews, ratings, price)
- View on Amazon directly from book detail
- Toggle between Light, Dark, and Auto themes
- Filter to Deals Only (books at or below your price goal)

Mobile is a **read-only viewer** — organize on desktop, browse anywhere.

### Keeping Mobile in Sync

Your desktop pushes updates to the relay automatically. On mobile, pull down or reopen the app to get the latest. If you reorganize on desktop, your mobile view updates next time it syncs.

### Credentials

Don't worry too much about credentials. If you ever lose them, you can generate a new set from **File > Relay Setup** on desktop — you'll just need to reinstall the bookmarklet and re-pair your phone.

---

## Organizing Your Library

### The Book Explorer

ReaderWrangler's Book Explorer works like a file explorer (think Windows File Explorer, macOS Finder, or any file manager) — except instead of files, you're organizing books. The left pane shows your folder tree; the right pane shows the books inside the selected folder.

Anything you'd do with files in a file explorer, you can do with books here: create folders, nest them, drag and drop, cut/copy/paste, rename, delete. Plus you get book-specific features like cover grid view, ratings, reviews, and metadata.

### Moving Books

- **Drag and drop**: Drag books onto any folder in the left pane
- **Cut/Copy/Paste**: Ctrl+X or Ctrl+C, navigate to target folder, Ctrl+V
- **Context menu**: Right-click > **Move to** or **Copy to** and pick a folder

A book can live in multiple folders at once. **Copy to** places a book in an additional folder without removing it from the current one. **Move to** relocates it.

### The Inbox

New books from Import from Relay land in the **Inbox**. Think of it as your sorting tray — organize books into folders from here.

### Auto-Organize Wizard

For large libraries, the wizard can create folders automatically:

1. Click the wand icon (🪄) in the folder tree header
2. The wizard analyzes books in your Inbox and groups them by author
3. Configure the minimum books threshold (how many books an author needs to get a folder)
4. Optionally create series subfolders within author folders
5. Preview the folder structure before committing
6. Click **Organize Now** — one Ctrl+Z undoes the entire operation

### Tags

Tags are flexible labels you define and apply to any book:

- Right-click a book > **Tags** to add or remove tags
- Drag a book onto a pinned tag view in the left pane to tag it
- **Pin a tag** to make it appear as a virtual folder in the left pane
- Tag views support manual ordering, just like regular folders
- Manage all tags from the Tags filter dropdown > **Manage Tags**

### Deleting Books

Delete a book (DEL key or right-click > Delete) and it moves to the Trash Bin at the bottom of the folder tree. Restore it anytime by right-clicking > **Restore**, or dragging it back to a folder. Ctrl+Z also works immediately after deleting.

To permanently remove books, right-click in the Trash > **Empty Trash** or **Delete Permanently** on individual books. Permanent deletes are synced to the relay so the books won't return on next import.

### Editing Book Details

Double-click any book (or click its row in list view) to open the book detail dialog:

- Click the **pencil icon** in the header to edit Title, Author, Series, Position, and Notes inline
- Changes are protected from being overwritten by future Amazon imports
- **Bulk edit**: Select multiple books, right-click > Edit > Author, Series, Position, or Ownership

### Hiding Books

Right-click a book > **Hide Books** to hide it from normal views. Hidden books only appear when you enable **Show Hidden** in the toolbar. Useful for books you don't want to see but don't want to delete.

---

## Finding Books

### Search

The search box at the top filters books by title and author:
- Results update as you type
- Search history is saved (up to 15 recent searches)
- Use arrow keys to navigate history, Enter to select
- Works across all views (All Books, folders, tag views)

### Filters

The toolbar provides layered filters that can be combined:

| Filter | Options |
|--------|---------|
| **Read Status** | Read, Unread, Unknown |
| **Ownership** | Purchased, Wishlist, Sample, Borrowed, Prime, Kindle Unlimited, KOLL, Comixology, Orphan (removed from Amazon) |
| **Tags** | Any combination of your tags |
| **Amazon Rating** | 1+ through 5+ stars |
| **My Rating** | 1+ through 5+ stars, or Unrated |
| **Collections** | Filter by Amazon collection name, or "Not in collection" |
| **Series** | Filter by series name, or "Not in series" |
| **Date Added** | Last 30/90 days, last 12 months, this year, last year, or custom date range |
| **Deals Only** | Books where current price is at or below your price goal |
| **Show Hidden** | Include hidden books in results |

### Sorting

Click the sort indicator in the toolbar to open the sort picker:
- Sort by any column: Title, Author, Date Added, Rating, My Rating, Series, Price, Page Count, and more
- Click to sort, click again to reverse direction
- **Shift+click** to add a secondary sort
- **Manual Order** preserves the order you've set by dragging books within a folder

### Grouping

Toggle the Group button in the toolbar to insert collapsible dividers between groups of books. Groups follow the current sort column — sort by Author and you get author groups, sort by Series and you get series groups. Click any group header to collapse/expand it.

### Cover Badges

In cover grid view, books display visual indicators:
- **Top-right**: Amazon rating (gold star)
- **Bottom-right**: Read status (green checkmark)
- **Top-left**: Collections count, wishlist heart
- **Bottom-left**: Price tag (green when at goal price)
- **Ownership badges**: SAMPLE, BORROWED, KU, etc.

---

## Managing Your Data

### Import from Relay

**File > Import from Relay** pulls the latest library data from the relay. A progress dialog shows the import status and how many new books were added. Your existing organization (folders, tags, positions) is preserved — only book metadata gets updated.

**How often to import**: Whenever you buy new books, or periodically to refresh prices, ratings, and reviews.

### Save and Restore Backups

- **File > Save Backup**: Downloads a complete snapshot of your library and organization as a file. Includes books, folders, tags, settings, and relay credentials.
- **File > Restore Backup**: Loads a previously saved backup, replacing your current data.

Keep backups in cloud storage (Google Drive, Dropbox, OneDrive) for safekeeping. Backups include your relay credentials, so they double as disaster recovery.

### Data Status

**File > Data Status** shows a health summary of your library:
- Total books, books with collections, books with descriptions
- Duplicate detection with cleanup option
- Relay connection status
- Last import date

### Relay Setup

**File > Relay Setup** lets you:
- View your current relay credentials (Channel ID and Passphrase)
- Generate new credentials (if setting up for the first time)
- Enter existing credentials (if restoring access on a new device)
- View and install bookmarklets for each fetcher

### Reset App

**File > Reset App** clears all data and returns to a fresh state. This is irreversible — save a backup first if you want to keep anything. If you have relay credentials, you can restore your library by setting up the relay again and importing.

---

## Keyboard Shortcuts

### Selection & Clipboard

| Shortcut | Action |
|----------|--------|
| **Click** | Select a single book |
| **Ctrl+Click** | Toggle selection (add/remove) |
| **Shift+Click** | Select range of books |
| **Ctrl+A** | Select all visible books |
| **Ctrl+X** | Cut selected books |
| **Ctrl+C** | Copy selected books |
| **Ctrl+V** | Paste books into current folder |
| **Esc** | Clear selection and clipboard |

### Actions

| Shortcut | Action |
|----------|--------|
| **Del** | Delete selected books (move to Trash) |
| **Del** (in Trash) | Permanently delete selected books |
| **Del** (in tag view) | Remove tag from selected books |
| **F2** | Rename current or selected folder |
| **Ctrl+Z** | Undo |
| **Ctrl+Y** | Redo |
| **Ctrl+Shift+Z** | Redo (alternative) |

### Navigation

| Shortcut | Action |
|----------|--------|
| **Alt+Left** | Navigate back |
| **Alt+Right** | Navigate forward |
| **Esc** | Close dialog, context menu, or toast |
| **Arrow keys** | Navigate between books in detail dialog |

---

## Power User Tips

### Themes

Go to **View > Theme** (desktop) or the hamburger menu (mobile) to switch between:
- **Auto (System)** — matches your OS preference
- **Light**
- **Dark**
- **High Contrast Light**
- **High Contrast Dark**

### Wishlist Price Goals

Right-click a wishlist book > **Set Price Goal** to set a target price. When the book's price drops to your goal, it appears in the **Deals Only** filter. Preset options: $0.99 through $4.99, or set a custom amount.

### Series & Author Bulk Import

Use the **Series Download** or **Author Bibliography** bookmarklets on Amazon to import an entire series or author's catalog to your wishlist in one click.

### Folder Organization Strategies

**Status-Based**:
- "Currently Reading", "Next Up", "Read", "Want to Read Eventually"

**Author/Series**:
- Use Auto-Organize Wizard to create author folders with series subfolders automatically

**Genre + Priority**:
- Top-level genre folders, with "Priority" subfolders for books you want to read next

**Tip**: A book can be in multiple folders (Copy to). Put a book in both "Sci-Fi" and "Next Up" without removing it from either.

### Drag and Drop Tips

- Drag books onto folders in the left pane to move them
- Hold **Ctrl** while dropping to **copy** instead of move
- Drag books onto subfolders shown in the right pane (list or cover view)
- Drag a folder onto another folder to nest it
- Drag a folder onto "My Library" to move it to the top level
- Drag from Trash to any folder to restore a deleted book there

### Collapse All

Click the **▲** button next to "My Library" to collapse all folders at once. The button appears when any folder is expanded and disappears when all are collapsed.

---

## Troubleshooting

### Fetcher Issues

**Bookmarklet not working on Amazon**
- Make sure you're on [amazon.com/yourbooks](https://www.amazon.com/yourbooks) (not the mobile site)
- You must be logged into Amazon
- Try refreshing the Amazon page and clicking the bookmarklet again
- Check the browser console (F12) for error messages

**Fetcher says "Backup data found on relay instead of library data"**
- This means the relay contains a backup snapshot instead of fetcher data
- Run the library fetcher again to push fresh library data to the relay
- Then import from relay in the app

**Import shows 0 new books**
- The fetcher is incremental — it stops when it reaches books you already have
- This is normal if you haven't bought new books since last import
- Enrichment (descriptions, reviews, prices) still runs even when no new books are found

### App Issues

**Organization not persisting between sessions**
- Don't use private/incognito mode — data doesn't persist there
- Check that your browser allows site data storage
- Use **File > Save Backup** periodically as an external safety net

**Can't find a book I know I own**
- Check if filters are active (clear all filters first)
- Search by title or author
- The book may be in Trash — check the Trash Bin at the bottom of the folder tree
- If you just imported, the book is in the Inbox

**App won't load or shows a blank screen**
- Go to `readerwrangler.com/reset.html` to clear all data and start fresh
- If you have a backup, restore it after resetting
- If you have relay credentials, set up the relay again and import

### Browser Compatibility

**Recommended**: Chrome, Edge, or any Chromium-based browser. Firefox is also fully supported.

**Safari**: Desktop and iOS Safari are untested. If you encounter issues, please report them.

**Private/Incognito mode**: Data won't persist between sessions. Use normal browsing mode.

---

## FAQ

### General

**Q: Is my data private?**
A: Your library data is encrypted end-to-end when passing through the relay. The relay server cannot read your data — only your browser (with your unique encryption keys) can decrypt it. Your organization is stored locally in your browser.

**Q: Do I need to install anything?**
A: No installation required. ReaderWrangler runs entirely in your browser. The bookmarklets are just browser bookmarks — no extensions or software to install.

**Q: Does ReaderWrangler work offline?**
A: The organizer works offline once your library is loaded. Importing from Amazon and syncing with the relay require an internet connection.

### Library Updates

**Q: How do I get new purchases into ReaderWrangler?**
A: Go to Amazon, run the library bookmarklet, then **File > Import from Relay** in the app. The import is incremental — it only fetches new books, so it's fast.

**Q: Will re-importing mess up my organization?**
A: No. Your organization (folders, book positions, tags) is stored separately. Importing updates book metadata (ratings, reviews, covers, prices) without touching your organization. Books are matched by their Amazon ID (ASIN).

**Q: What happens to books Amazon removes from my library?**
A: The orphan scan (Phase 5 of the library fetcher) detects books that no longer appear in your Amazon library. They're flagged as "Orphan" and you can filter for them using the Ownership dropdown. You can then delete them or keep them.

### Organization

**Q: Can a book be in multiple folders?**
A: Yes. Use **Copy to** (right-click or Ctrl+C / Ctrl+V) to place a book in additional folders. The book appears in all of them. **Move to** (or Ctrl+X / Ctrl+V) relocates it.

**Q: What happens if I delete a folder?**
A: The folder is removed and its books move to the parent folder. Books are never lost when deleting folders.

**Q: Can I undo a mistake?**
A: Yes. **Ctrl+Z** undoes your last action (delete, move, rename, organize, etc.). **Ctrl+Y** redoes it. Undo history is unlimited within a session.

### Multi-Device

**Q: Can I use ReaderWrangler on my phone?**
A: Yes. Open ReaderWrangler on your phone and pair with your desktop via QR code. The mobile viewer lets you browse your organized library, search, sort, and view book details. Organizing is desktop-only.

**Q: Can I use ReaderWrangler on multiple computers?**
A: Yes. On your second computer, go to **File > Relay Setup** and enter your existing credentials (Channel ID and Passphrase). Then **File > Import from Relay** to pull your library. To sync organization between computers, use **File > Save Backup** on one and **File > Restore Backup** on the other.

**Q: Can I maintain separate organizational states?**
A: Yes. Use **File > Save Backup** to save your current state, then **File > Reset App** to start fresh. Create a different organization. Switch between them by restoring different backup files. Name them descriptively (e.g., `my-actual-library.json`, `demo-state.json`).

### New Devices & Recovery

**Q: I got a new phone. How do I set it up?**
A: Just repeat the pairing process — open ReaderWrangler on your new phone and scan the QR code from your desktop's **File > Relay Setup**.

**Q: I got a new desktop. How do I set it up?**
A: If you have a backup file, restore it on the new computer (**File > Restore Backup**). You'll need to generate new relay credentials (**File > Relay Setup**), reinstall the bookmarklet, and re-pair your phone.

If you don't have a backup but have your relay credentials, enter them in **File > Relay Setup** and **File > Import from Relay** to get your books back (organization will need to be rebuilt).

**Q: What if I lose my relay credentials?**
A: Just generate a new set from **File > Relay Setup**. You'll need to reinstall the bookmarklet and re-pair your phone, but your local library and organization are unaffected.

**Q: What if I accidentally reset the app?**
A: If you have a backup file, restore it. Otherwise, set up the relay again and re-import from Amazon — your books are still on Amazon, so you'll get them back. Your organization would need to be rebuilt unless you have a backup.

---

## Getting Help

- Check the [README](README.md) for an overview
- See [CHANGELOG.md](CHANGELOG.md) for version history
- [Open an issue on GitHub](https://github.com/Ron-L/ReaderWrangler/issues) for bugs or feature requests

---

**Version**: Guide updated 2026-03-05 for v6.0.0
