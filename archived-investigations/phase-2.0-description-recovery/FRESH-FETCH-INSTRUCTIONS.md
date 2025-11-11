# Fresh Fetch Test Instructions

## Purpose
Test the updated library-fetcher.js v3.2.0 with improved description extraction (recursive fragments + AI summaries fallback).

## Prerequisites
- Current amazon-library.json is backed up in recovery-scripts/ directory
- library-fetcher.js v3.2.0 is ready in project root
- You are logged into Amazon

---

## Step-by-Step Instructions

### 1. Prepare Browser
1. Open Chrome/Edge
2. Go to https://www.amazon.com/yourbooks
3. Make sure you're logged in (see your books grid)
4. Open DevTools (F12)
5. Go to Console tab
6. **Clear console** (right-click → Clear console)

### 2. Run Fresh Fetch
1. Open `library-fetcher.js` in your editor
2. Copy the ENTIRE file (Ctrl+A, Ctrl+C)
3. Paste into browser console
4. Press Enter

### 3. Answer Prompt

**Only Prompt: "Load existing library?"**
- A file picker dialog will appear
- **Action**: Click **Cancel** (we want a completely fresh fetch)
- **Why**: Testing from scratch ensures all extraction methods work
- After clicking Cancel, the script runs automatically with no more prompts!

### 4. Watch Automatic Progress

The script runs through these phases automatically:

**[Phase 0] Validation** (~30 seconds)
- Tests API endpoints with 1 book
- **Watch for**: "✅ Phase 0 complete: All API endpoints and extraction logic validated"

**[3/6] Pass 1 - Fetch book list** (~5-10 minutes)
- Fetches basic info (title, author, cover) for all books
- **Watch for**: "✅ Pass 1 complete: Found X new books"

**[4/6] Pass 2 - Enrich with descriptions** (~60-70 minutes)
- **This is the important part!**
- Progress bars showing X/Y books
- Description lengths: "✅ 456 chars, 3 reviews"
- **NEW**: Look for "📝 Using AI summary (X chars)" messages
- Any books showing "⚠️ No description available"

**[5/6] Create manifest** (~1 minute)

**[6/6] Save file** (automatic download)

**Total Expected Time:**
- ~1.5 hours for 2,343 books
- Make sure your computer doesn't sleep!

### 5. Wait for Completion

**When finished, you'll see:**
```
========================================
✅ LIBRARY FETCH COMPLETE!
========================================
📊 Summary:
   Total books: 2343
   Books without descriptions: X
   ...
```

**The file `amazon-library.json` will download automatically**

### 6. Move Downloaded File
1. Find `amazon-library.json` in your Downloads folder
2. Move it to the project directory
3. **Rename current amazon-library.json first** (or it's already in recovery-scripts/)

---

## Verification Steps

### Check 1: Basic Stats
```bash
node -e "const fs = require('fs'); const data = JSON.parse(fs.readFileSync('amazon-library.json', 'utf-8')); console.log('Total books:', data.metadata.totalBooks); console.log('Without descriptions:', data.metadata.booksWithoutDescriptions); console.log('Expected: ~2 (only genuinely unavailable)');"
```

**Expected output:**
```
Total books: 2343
Without descriptions: 2
Expected: ~2 (only genuinely unavailable)
```

### Check 2: Verify Specific Books

These books required special extraction methods during the recovery investigation. Verifying them confirms all extraction patterns work in the production fetcher.

**Test "The Shield" (previously needed recursive extraction):**
```bash
node -e "const fs = require('fs'); const data = JSON.parse(fs.readFileSync('amazon-library.json', 'utf-8')); const book = data.books.find(b => b.asin === 'B00KMJN9AM'); if (!book) { console.log('ERROR: Book not found'); } else { console.log('Title:', book.title); console.log('Has description:', book.description.length > 0); console.log('Description length:', book.description.length, 'chars'); console.log('Description preview:', book.description.substring(0, 100) + '...'); }"
```

**Expected:**
- Title: The Shield: a novel
- Description length: ~1500+ chars
- Preview starting with: "The Shield is a riveting story..."

**Test "The Pen and the Sword" (previously needed AI summary):**
```bash
node -e "const fs = require('fs'); const data = JSON.parse(fs.readFileSync('amazon-library.json', 'utf-8')); const book = data.books.find(b => b.asin === 'B01IW2PEV2'); if (!book) { console.log('ERROR: Book not found'); } else { console.log('Title:', book.title); console.log('Has description:', book.description.length > 0); console.log('Description length:', book.description.length, 'chars'); console.log('Description preview:', book.description.substring(0, 100) + '...'); }"
```

**Expected:**
- Title: The Pen and the Sword
- Description length: ~300+ chars
- Preview starting with: "Through a freak accident, a modern chemist is transported to planet Anyar..."

**Test "The Classic Sci-Fi Collection" (traditional description with paragraph wrapper):**
```bash
node -e "const fs = require('fs'); const data = JSON.parse(fs.readFileSync('amazon-library.json', 'utf-8')); const book = data.books.find(b => b.asin === 'B07CF2QQPP'); if (!book) { console.log('ERROR: Book not found'); } else { console.log('Title:', book.title); console.log('Has description:', book.description.length > 0); console.log('Description length:', book.description.length, 'chars'); console.log('Description preview:', book.description.substring(0, 100) + '...'); }"
```

**Expected:**
- Title: The Classic Sci-Fi Collection
- Description length: ~50+ chars
- Preview: "20 Classic Sci-Fi Novels and Short Stories!!! 'nuff said!"

### Check 3: Compare to Previous Library

**Quick count comparison:**
```bash
node -e "const fs = require('fs'); const new_data = JSON.parse(fs.readFileSync('amazon-library.json', 'utf-8')); console.log('New missing:', new_data.metadata.booksWithoutDescriptions); console.log('Expected: 2');"
```

---

## Success Criteria

✅ **Pass if:**
1. Fetch completes without errors
2. Books without descriptions ≤ 2
3. "The Shield" has description (recursive extraction worked)
4. "The Pen and the Sword" has description (AI summary worked)
5. Total books = 2,343

❌ **Fail if:**
1. Books without descriptions > 10
2. Fetch crashes or stops
3. Previously recovered books are missing descriptions again

---

## If Test Fails

1. **Don't panic** - your data is backed up
2. Check console for error messages
3. Look for patterns in which books failed
4. Save the console output
5. Restore from recovery-scripts/ directory

---

## If Test Succeeds

1. ✅ Verify all checks above pass
2. ✅ Load amazon-library.json in organizer
3. ✅ Spot-check a few books manually
4. ✅ **Delete entire recovery-scripts/ directory**

---

## Notes

- **DO NOT close browser tab** during the fetch (will interrupt)
- **DO NOT let computer sleep** (fetch takes ~1.3 hours)
- **DO keep DevTools console open** (to see progress)
- The fresh fetch will be SLOWER than recovery scripts (fetches more data per book)
- Consider running overnight or during work hours when you can check periodically
