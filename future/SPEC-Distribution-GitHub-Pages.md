# Distribution Guide - Amazon Book Organizer

This document describes how to distribute and deploy the Amazon Book Organizer for easy use by others.

## Overview

The Amazon Book Organizer consists of two main components:
1. **Browser Console Scripts** (library-fetcher.js, collections-fetcher.js, diagnostic scripts)
   - Run on amazon.com to extract library data
   - Require access to Amazon's page context and CSRF token
2. **Organizer Web App** (amazon-organizer.html/js/css)
   - Pure static HTML/CSS/JS application
   - Runs entirely client-side (no server needed)
   - Loads JSON files from user's computer

## Distribution Strategy: GitHub Pages + Bookmarklets

### Why This Approach?

**For End Users:**
- ✅ No installation required
- ✅ No downloads needed (except JSON output)
- ✅ Works on any device with a browser
- ✅ Always get latest version
- ✅ One URL to share
- ✅ Free to use

**For You (Developer):**
- ✅ Single source of truth (GitHub repo)
- ✅ Version control for everything
- ✅ Easy updates (git push = instant deploy)
- ✅ Free hosting (GitHub Pages)
- ✅ HTTPS by default
- ✅ No server maintenance

**Privacy:**
- ✅ User data never leaves their browser
- ✅ Fetcher runs on Amazon's page (user's session)
- ✅ JSON saved to user's computer
- ✅ Organizer loads JSON from local file
- ✅ No data sent to any server

---

## Part 1: GitHub Pages Setup

### What to Host

Host the **organizer app** on GitHub Pages:
- `amazon-organizer.html`
- `amazon-organizer.js`
- `amazon-organizer.css`
- Any supporting files (icons, fonts, etc.)

**Optional:** Also host fetcher scripts for bookmarklet access:
- `library-fetcher.js`
- `collections-fetcher.js`
- `diag-01-isbn-enrichment.js` (testing/diagnostic scripts)

### Setup Process

**Option 1: Deploy from Main Branch** (simplest)

1. Go to GitHub repo: `Settings` → `Pages`
2. Source: `Deploy from a branch`
3. Branch: `main` → `/ (root)`
4. Click `Save`
5. Site will be live at: `https://yourusername.github.io/AmazonBookOrganizer/`

**Option 2: Deploy from /docs Folder** (keeps root clean)

1. Create `docs/` folder in repository root
2. Move organizer files to `docs/`:
   ```
   docs/
   ├── amazon-organizer.html
   ├── amazon-organizer.js
   ├── amazon-organizer.css
   └── (icons, fonts, etc.)
   ```
3. Settings → Pages → Deploy from `main` → `/docs`
4. Same URL: `https://yourusername.github.io/AmazonBookOrganizer/`

**Recommendation:** Use Option 1 (root deployment) - simpler, no file moves needed.

### File Considerations

**What to Deploy:**
- ✅ HTML/CSS/JS application files
- ✅ Fetcher scripts (for bookmarklet access)
- ✅ README.md (auto-displays on GitHub Pages)
- ✅ Icons, fonts, images

**What NOT to Deploy:**
- ❌ Your personal `amazon-library.json` file (contains your data!)
- ❌ Your personal `amazon-collections.json` file
- ❌ Test/diagnostic output files
- ❌ SKILL-*.md files (development only)
- ❌ NOTES.md, TODO.md (development only)

**Add to .gitignore:**
```
amazon-library.json
amazon-collections.json
output-*.txt
output-*.json
*.zip
```

---

## Part 2: Chrome Bookmarklet for Script Loading

### What is a Bookmarklet?

A bookmarklet is a bookmark that contains JavaScript code. When clicked, it executes the code on the current page. This eliminates manual copy/paste of fetcher scripts.

### Three Implementation Approaches

#### Approach 1: GitHub Pages + Bookmarklet (Recommended)

**How it works:**
- Fetcher scripts hosted on GitHub Pages (auto-updated with git push)
- Bookmarklet loads scripts from GitHub Pages URLs
- User clicks bookmark → scripts execute on Amazon page

**Pros:**
- ✅ One-click execution for users
- ✅ Automatic updates (bookmarklet URL stays same, scripts update)
- ✅ Version control
- ✅ Free hosting
- ✅ Works across devices (if bookmarks sync)

**Cons:**
- ⚠️ Requires public GitHub repo (or public GitHub Pages from private repo)
- ⚠️ Amazon CSP might block external scripts (but bookmarklets often bypass this)

**Bookmarklet Code:**
```javascript
javascript:(async()=>{
  const scripts=[
    'https://yourusername.github.io/AmazonBookOrganizer/library-fetcher.js',
    'https://yourusername.github.io/AmazonBookOrganizer/collections-fetcher.js'
  ];
  for(const url of scripts){
    try{
      const code=await fetch(url).then(r=>r.text());
      eval(code);
      console.log(`✅ Loaded: ${url.split('/').pop()}`);
    }catch(err){
      console.error(`❌ Failed to load: ${url}`,err);
    }
  }
})();
```

**Minified version (for bookmarklet):**
```javascript
javascript:(async()=>{const s=['https://yourusername.github.io/AmazonBookOrganizer/library-fetcher.js','https://yourusername.github.io/AmazonBookOrganizer/collections-fetcher.js'];for(const u of s){try{eval(await fetch(u).then(r=>r.text()));console.log('✅',u.split('/').pop())}catch(e){console.error('❌',u,e)}}})();
```

**User Installation:**
1. Show Chrome bookmarks bar (Ctrl+Shift+B or View → Always Show Bookmarks Bar)
2. Right-click bookmarks bar → "Add page..."
3. Name: `Amazon Library Fetch`
4. URL: [paste minified bookmarklet code]
5. Click "Save"

**User Workflow:**
1. Go to https://www.amazon.com/yourbooks
2. Click "Amazon Library Fetch" bookmark
3. Wait ~3 hours for library fetch
4. Save `amazon-library.json` file
5. Open https://yourusername.github.io/AmazonBookOrganizer/
6. Drag JSON file onto page
7. Organize!

---

#### Approach 2: GitHub Gist + Bookmarklet

**How it works:**
- Upload scripts to private GitHub Gist
- Bookmarklet loads scripts from Gist "Raw" URLs
- User clicks bookmark → scripts execute

**Pros:**
- ✅ Can use private Gist (scripts not in main repo)
- ✅ Version control (Gist supports revisions)
- ✅ Free hosting
- ✅ Separate from main project (good for testing)

**Cons:**
- ⚠️ Extra step (upload to Gist)
- ⚠️ Gist URL changes if you create new Gist (bookmarklet needs update)
- ⚠️ Less discoverable than main repo

**Setup:**
1. Go to https://gist.github.com/
2. Create new Gist (can be private)
3. Add files: `library-fetcher.js`, `collections-fetcher.js`
4. Click "Create secret gist" or "Create public gist"
5. Click "Raw" button on each file to get raw URL
6. Use raw URLs in bookmarklet

**Gist Raw URL format:**
```
https://gist.githubusercontent.com/username/gist-id/raw/commit-hash/library-fetcher.js
```

**Note:** Gist raw URLs include commit hash, so they don't auto-update. You'd need to update bookmarklet after each Gist update. **Not recommended for this reason.**

---

#### Approach 3: Local HTTP Server + Bookmarklet (Development Only)

**How it works:**
- Run local HTTP server (e.g., Python `http.server`)
- Bookmarklet loads scripts from localhost
- Good for testing before deployment

**Pros:**
- ✅ Great for development/testing
- ✅ No need to commit/push to test changes
- ✅ Fast iteration

**Cons:**
- ❌ Requires server running locally
- ❌ Only works on developer's machine
- ❌ Not suitable for distribution to users

**Setup:**
```bash
# In project directory
python -m http.server 8000

# Or use npm package
npx http-server -p 8000
```

**Bookmarklet:**
```javascript
javascript:(async()=>{
  const scripts=[
    'http://localhost:8000/library-fetcher.js',
    'http://localhost:8000/collections-fetcher.js'
  ];
  for(const url of scripts){
    eval(await fetch(url).then(r=>r.text()));
  }
})();
```

---

## Recommended Setup for Distribution

### 1. GitHub Pages (Organizer App + Fetcher Scripts)

**Deploy to:** `https://yourusername.github.io/AmazonBookOrganizer/`

**Structure:**
```
/ (root - deployed to GitHub Pages)
├── amazon-organizer.html  (main app)
├── amazon-organizer.js
├── amazon-organizer.css
├── library-fetcher.js     (for bookmarklet)
├── collections-fetcher.js (for bookmarklet)
├── README.md              (user documentation)
├── icons/
└── fonts/

/ (not deployed - stays in repo only)
├── NOTES.md               (development)
├── TODO.md                (development)
├── SKILL-*.md             (development)
├── build-*.bat            (development)
├── diag-*.js              (testing)
├── output-*.txt           (testing)
└── .gitignore
```

### 2. Bookmarklet

**Create two bookmarklets for users:**

**Library Fetcher Bookmarklet:**
```javascript
javascript:(async()=>{const u='https://yourusername.github.io/AmazonBookOrganizer/library-fetcher.js';try{eval(await fetch(u).then(r=>r.text()));console.log('✅ Library fetcher loaded')}catch(e){console.error('❌ Failed to load fetcher:',e)}})();
```

**Collections Fetcher Bookmarklet:**
```javascript
javascript:(async()=>{const u='https://yourusername.github.io/AmazonBookOrganizer/collections-fetcher.js';try{eval(await fetch(u).then(r=>r.text()));console.log('✅ Collections fetcher loaded')}catch(e){console.error('❌ Failed to load fetcher:',e)}})();
```

### 3. User Documentation (README.md)

Create comprehensive README with:
1. **Quick Start** (3-step process)
2. **Bookmarklet Installation** (with screenshots)
3. **Usage Instructions** (fetch → organize)
4. **FAQ** (common issues)
5. **Privacy Statement** (data stays local)

**Example README structure:**
```markdown
# Amazon Book Organizer

Organize your Amazon Kindle library into custom collections using a visual drag-and-drop interface.

## Quick Start

### 1. Install Bookmarklet (30 seconds)
[Instructions with screenshot]

### 2. Fetch Your Library (~3 hours)
[Instructions with screenshot]

### 3. Organize Your Books
[Link to app, instructions]

## Features
- Drag-and-drop organization
- Custom columns
- Search and filter
- Purchase date sorting
- Collections support

## Privacy
Your library data never leaves your browser. [More details]

## Support
[GitHub Issues link]
```

---

## Bookmarklet Best Practices

### Error Handling
Always include try/catch in bookmarklet:
```javascript
try {
  eval(await fetch(url).then(r=>r.text()));
} catch(e) {
  console.error('❌ Failed to load script:', e);
  alert('Failed to load fetcher. Check console for details.');
}
```

### User Feedback
Log to console so user knows what's happening:
```javascript
console.log('✅ Library fetcher loaded');
console.log('🚀 Starting fetch...');
```

### Testing
Before distributing, test bookmarklet:
1. On fresh browser profile (no extensions)
2. On different browser (Chrome, Edge, Firefox)
3. With Amazon CSP (might block external scripts)
4. After clearing cache (ensure scripts load)

### URL Length Limits
Chrome bookmark URLs limited to ~2000 characters. Minified bookmarklet should be well under this:
- Recommended: < 500 characters (plenty of room)
- Maximum: ~2000 characters

---

## Deployment Checklist

Before going live with GitHub Pages + Bookmarklet:

### Pre-Deployment
- [ ] Remove personal data files (amazon-library.json, amazon-collections.json)
- [ ] Update .gitignore for personal/test files
- [ ] Test organizer app works with sample data
- [ ] Test fetcher scripts work on amazon.com
- [ ] Update README.md with user instructions
- [ ] Add privacy statement
- [ ] Add LICENSE file (MIT recommended)

### GitHub Pages Setup
- [ ] Enable GitHub Pages in Settings
- [ ] Verify site is live and accessible
- [ ] Test all links work (HTML/CSS/JS load correctly)
- [ ] Test bookmarklet loads scripts from GitHub Pages
- [ ] Verify HTTPS (should be automatic)

### Bookmarklet Creation
- [ ] Create minified bookmarklet code
- [ ] Test bookmarklet in fresh browser
- [ ] Add bookmarklet code to README.md
- [ ] Create visual installation guide (screenshots)
- [ ] Test on different browsers

### Documentation
- [ ] Write Quick Start guide
- [ ] Add troubleshooting section
- [ ] Document privacy/security
- [ ] Create FAQ
- [ ] Add GitHub Issues link for support

### Testing
- [ ] Test complete workflow (fetch → organize)
- [ ] Test with someone who's never used it
- [ ] Test on different Amazon accounts
- [ ] Test on different browsers
- [ ] Test bookmarklet updates (push new version, verify bookmarklet loads it)

---

## Updating After Deployment

### To Update Fetcher Scripts
1. Edit `library-fetcher.js` in repo
2. Commit and push to main
3. GitHub Pages auto-updates (usually within 1 minute)
4. Users' bookmarklets automatically load new version
5. No user action required!

### To Update Organizer App
1. Edit `amazon-organizer.js` or `.css` in repo
2. Update version number in file header
3. Update cache-busting query string (e.g., `?v=3.4.0`)
4. Commit and push to main
5. Users need to refresh page to get new version

### To Update Bookmarklet Code
1. Edit bookmarklet in README.md
2. Commit and push
3. Users must **manually update** their bookmark (rare, avoid if possible)
4. Better: Keep bookmarklet URL stable, update scripts instead

---

## Advanced: Custom Domain

Want `bookorganizer.com` instead of `username.github.io/AmazonBookOrganizer/`?

### Setup
1. Buy domain (e.g., from Namecheap, Google Domains)
2. Add `CNAME` file to repo root with domain name:
   ```
   bookorganizer.com
   ```
3. Configure DNS (in domain registrar):
   ```
   Type: CNAME
   Host: @
   Value: yourusername.github.io
   ```
4. GitHub Settings → Pages → Custom domain: `bookorganizer.com`
5. Wait for DNS propagation (~1 hour to 24 hours)

**GitHub Pages will automatically provision SSL certificate (free).**

**New URLs:**
- Organizer: `https://bookorganizer.com/`
- Fetcher: `https://bookorganizer.com/library-fetcher.js`

---

## Summary: Distribution Workflow

**For You (Developer):**
1. Push to GitHub
2. GitHub Pages auto-deploys
3. Done!

**For Users:**
1. Install bookmarklet (one-time, 30 seconds)
2. Click bookmarklet on Amazon
3. Save JSON file
4. Open your GitHub Pages URL
5. Drag JSON file
6. Organize!

**Benefits:**
- Zero installation for users
- Always latest version
- Free hosting
- Professional URL
- Easy updates
- Privacy preserved (data stays local)

---

## Development Workflow Comparison

### Understanding Server Requirements

**Why do we need a server at all?**
- Chrome blocks `file://` protocol from making external API calls for security reasons
- Amazon's API requires scripts to be loaded via HTTP/HTTPS (not `file://`)
- Solution: Serve files via HTTP server (local or remote)

### Three Development Approaches

#### Approach 1: Current System (Local Files + Console Paste)

**How it works:**
- Edit files locally in VS Code
- Run Python HTTP server: `python -m http.server 8000`
- Load organizer at `http://localhost:8000/amazon-organizer.html`
- For fetcher: Manually copy/paste script into Amazon console

**Pros:**
- ✅ Simple, no git commits needed for testing
- ✅ Instant feedback (refresh browser)
- ✅ No deployment step

**Cons:**
- ❌ Manual copy/paste for fetcher scripts (tedious)
- ❌ Server must be running to test organizer app
- ❌ Can't share work-in-progress easily

**When to use:** Good for quick local development when you don't want to commit yet.

---

#### Approach 2: VS Code Live Server + DEV Bookmarklet (Recommended for Development)

**How it works:**
- Install "Live Server" extension in VS Code (one-time setup)
- Right-click `amazon-organizer.html` → "Open with Live Server"
- Serves files at `http://localhost:5500` (or similar port)
- Auto-refreshes browser when you save files
- Create DEV bookmarklet pointing to `http://localhost:5500/library-fetcher.js`

**Example DEV bookmarklet:**
```javascript
javascript:(async()=>{const u='http://localhost:5500/library-fetcher.js';try{eval(await fetch(u).then(r=>r.text()));console.log('✅ DEV fetcher loaded')}catch(e){console.error('❌',e)}})();
```

**Pros:**
- ✅ No manual copy/paste (one-click bookmarklet)
- ✅ Auto-refresh on file save (instant feedback)
- ✅ No git commits needed for testing
- ✅ Same workflow as production (bookmarklet-based)
- ✅ Easy to switch between local/production by changing bookmarklet

**Cons:**
- ⚠️ Requires VS Code with Live Server extension
- ⚠️ Server must be running (but it's one-click in VS Code)
- ⚠️ Need separate DEV and PROD bookmarklets

**When to use:** **BEST for active development.** Edit → Save → Browser auto-refreshes → Click bookmarklet to test.

**Note:** VS Code Live Server runs **locally on your machine**, not on GitHub. It watches your local files and auto-refreshes the browser when you save.

---

#### Approach 3: GitHub Pages + PROD Bookmarklet (Recommended for Distribution)

**How it works:**
- Push code to GitHub
- GitHub Pages serves files at `https://username.github.io/AmazonBookOrganizer/`
- Users install PROD bookmarklet pointing to GitHub Pages URLs
- Bookmarklet loads scripts from GitHub Pages (always latest committed version)

**Example PROD bookmarklet:**
```javascript
javascript:(async()=>{const u='https://yourusername.github.io/AmazonBookOrganizer/library-fetcher.js';try{eval(await fetch(u).then(r=>r.text()));console.log('✅ Library fetcher loaded')}catch(e){console.error('❌',e)}})();
```

**Pros:**
- ✅ Users need ZERO setup (no VS Code, no Python, nothing)
- ✅ Users get latest version automatically
- ✅ Professional URL to share
- ✅ Free hosting with HTTPS
- ✅ Works on any device

**Cons:**
- ⚠️ Requires git commit + push for every change
- ⚠️ 1-minute deploy delay after push
- ⚠️ Not suitable for rapid iteration during development

**When to use:** **BEST for sharing with users.** When code is stable and ready to distribute.

**Note:** GitHub Pages is a **static file hosting service**, not a code editor. You edit files locally (in VS Code), commit, push, and GitHub automatically deploys them. Users don't need any server - they just use the bookmarklet which loads scripts from GitHub Pages.

---

### Recommended Hybrid Workflow

**For development (you):**
1. Edit files locally in VS Code
2. Use "Live Server" extension (serves at `http://localhost:5500`)
3. Use DEV bookmarklet pointing to localhost
4. When ready: Commit + push to GitHub

**For distribution (users):**
1. Users install PROD bookmarklet (one-time, 30 seconds)
2. PROD bookmarklet loads scripts from GitHub Pages
3. Users need ZERO technical setup (no VS Code, no Python server, nothing)
4. When you push updates, users automatically get them (bookmarklet URLs don't change)

**Benefits of hybrid approach:**
- You get fast iteration with Live Server + DEV bookmarklet
- Users get zero-setup experience with GitHub Pages + PROD bookmarklet
- Clean separation between development and production
- Version control for everything

---

### FAQ: Server Confusion

**Q: Do users need VS Code?**
A: No. VS Code Live Server is for YOUR development only. Users just click bookmarklet.

**Q: Do users need Python server?**
A: No. GitHub Pages serves the files for users. Python server is for YOUR local testing only.

**Q: Does GitHub Pages = server?**
A: Yes. GitHub Pages is a static file server (like Python's `http.server` but hosted by GitHub). It serves HTML/CSS/JS files via HTTPS. Users' browsers fetch files from GitHub Pages when they click bookmarklet.

**Q: Can I edit code directly on GitHub?**
A: Technically yes (via GitHub web interface), but it's not practical. **Standard workflow:** Edit locally in VS Code → Commit → Push → GitHub Pages auto-deploys.

**Q: Does VS Code Live Server edit files on GitHub?**
A: No. VS Code Live Server serves your **local files** at `http://localhost:5500`. It's just a local development server with auto-refresh. You still need to commit/push to update GitHub Pages.

**Q: What's the difference between localhost and GitHub Pages?**
- **localhost (http://localhost:5500)**: Your local machine serves files. Only YOU can access. Great for development.
- **GitHub Pages (https://username.github.io)**: GitHub's servers serve files. Anyone can access. Great for distribution.

---

## Notes

- **Bookmarklet URL Character Limit:** Chrome ~2000 chars, Firefox ~65,536 chars, Safari ~80,000 chars. Keep it short!
- **GitHub Pages Build Time:** Usually < 1 minute after push
- **HTTPS:** Automatic with GitHub Pages
- **Custom Domain Cost:** ~$10-15/year (optional)
- **No Analytics:** GitHub Pages doesn't provide visitor stats (unless you add Google Analytics)
- **No Server-Side Code:** GitHub Pages is static only (perfect for this project!)
