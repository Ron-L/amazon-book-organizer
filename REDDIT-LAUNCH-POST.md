# Reddit Launch Post for r/kindle

## Post Title Options

**Option 1 (Problem-focused):**
> I built a free tool to organize your massive Kindle library - because Amazon won't let you

**Option 2 (Solution-focused):**
> [Tool] ReaderWrangler - Finally organize your Kindle library the way YOU want

**Option 3 (Direct):**
> Free tool to scrape and organize your Amazon Kindle library visually

**Recommended: Option 1** - It leads with the pain point most r/kindle users feel.

---

## Post Body

```
Hi r/kindle! 👋

Like many of you, my Kindle library grew to over 2,000 books, and I completely lost track of what I own. That book I was excited to read last year? Buried. That series I wanted to binge? Scattered and out of order.

Amazon shows you beautiful thumbnails of all your books online, but there's a huge problem: **you can't organize them**. No custom sorting. No "Next to Read" pile. No "Favorites" shelf. Nothing.

So I built **ReaderWrangler** - a free web app that lets you organize your Kindle library however you want.

### What it does:

1. **Extracts your complete library from Amazon** (one-click bookmarklet)
   - Scrapes covers, ratings, reviews, descriptions
   - No manual CSV exports or local files needed
   - Works directly from Amazon's website

2. **Lets you organize visually**
   - Create custom columns: "Next to Read", "Time Travel Books", "Beach Reads", whatever!
   - Drag and drop books between groups
   - Search and multi-select to organize series
   - Double-click any book to see full details

3. **100% private**
   - Runs entirely in your browser
   - Your data never leaves your computer
   - No accounts, no servers, no tracking

### Quick demo:

[GIF showing drag-and-drop organization]

### Try it:

https://readerwrangler.com

It's completely free and open source. Built it because I needed it myself, figured others might too.

**Technical note:** The bookmarklet scrapes your library directly from Amazon's website when you click it. Initial extraction takes a few minutes depending on library size, but you only do it once. After that, you can re-fetch occasionally to add new books.

Happy to answer questions!

---

**Edit:** Wow, didn't expect this response! Quick answers to common questions:

- **Does it work on [country]?** Should work on any Amazon domain (.com, .co.uk, .de, etc.)
- **Is it safe?** Yes - it's just reading data Amazon already shows you. Code is open source on GitHub.
- **Can I export my organization?** Yes, to JSON for backup.
```

---

## Posting Tips

**When to post:**
- **Best days:** Tuesday, Wednesday, Thursday
- **Best times (EST):** 9-11 AM or 6-8 PM (when US users are active)
- **Avoid:** Weekends, Monday mornings, Friday afternoons

**Before posting:**
1. Have the GIF/demo ready and uploaded to Reddit directly (not external links)
2. Be active in r/kindle beforehand (comment on a few posts so you're not a stranger)
3. Monitor the post for the first 2-3 hours to respond quickly to questions
4. Be humble and helpful - focus on solving their problem, not promoting yourself

**After posting:**
1. Respond to EVERY comment in the first hour
2. Upvote people who engage
3. Edit the main post to answer common questions (reduces repeat questions)
4. If it gets traction, cross-post to r/ebooks (wait 24 hours)

---

## Expected Questions & Answers

**Q: "Why do I need this when Amazon has Collections?"**
A: Collections only work on Kindle devices, not on Amazon's website. Plus, you can't visually organize them or see all your books at once with covers. ReaderWrangler gives you a visual dashboard.

**Q: "Is this against Amazon's TOS?"**
A: It's just reading data Amazon already publicly displays to you. No hacking, no API abuse - just automated browsing of your own library.

**Q: "Can I organize books I haven't purchased yet / wishlist items?"**
A: Currently only purchased Kindle books. Wishlist support could be added in the future!

**Q: "Does it work with Kobo/Nook/etc?"**
A: Currently Kindle-only, but the concept could work for other platforms if there's demand.

**Q: "What happens if I buy new books?"**
A: Re-run the extraction and it merges new books while preserving your existing organization.

**Q: "Do I need to keep my data somewhere?"**
A: It's saved in your browser's IndexedDB (persistent). You can also export to JSON for backup.

---

## Follow-up Posts (If First Post Goes Well)

**1 week later - r/ebooks:**
Same post, adjusted for general ebook audience (not just Kindle)

**2 weeks later - r/productivity:**
Focus on "organizing reading backlog" angle

**1 month later - r/selfhosted:**
Focus on privacy/self-hosted/no-tracking angle

---

## Image Assets Needed

1. **Demo GIF** (required):
   - Show dragging books between columns
   - Max 15 seconds
   - Under 50MB for Reddit upload
   - Record at 720p or 1080p

2. **Before/After screenshot** (optional but powerful):
   - Before: "2322 books in Unorganized"
   - After: Organized into columns
   - Side-by-side comparison

3. **Feature highlights** (optional):
   - Screenshot of book detail view
   - Screenshot of search/filter
