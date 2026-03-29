# Demo Library — Amazon "Your Books" Page Prep

Tools and files for preparing a filtered Amazon "Your Books" page for tutorial video recording. Shows only the 80-book demo library (68 individual books + 12 series stacks) instead of a full personal library.

## Files

| File | Purpose |
|------|---------|
| `demo-whitelist.json` | List of 119 ASINs in the demo library (individual book ASINs) |
| `demo-whitelist-loader.js` | Loads whitelist into amazon.com localStorage (used by the fetcher extension) |
| `demo-whitelist-cleanup-html.js` | Strips non-whitelist books from a saved Amazon page (prep step) |
| `demo-whitelist-yourbooks-filter.js` | Injects cleaned HTML into the live Amazon page (recording step) |
| `yourbooks-raw.html` | Full saved Amazon "Your Books" page (source file, ~2000+ books) |
| `yourbooks-raw_files/` | Companion folder for the saved page (images, CSS, scripts) |
| `amazon-yourbooks-demo.html` | Cleaned output — only the 80 demo items (ready for recording) |

## Workflow

### One-Time Prep

These steps only need to be done once (or repeated if the demo library changes).

**Step 1 — Load whitelist into Amazon localStorage (for fetcher)**

1. Open any `amazon.com` page in Chrome/Edge
2. Open DevTools Console (F12 → Console)
3. Paste the contents of `demo-whitelist-loader.js` and press Enter
4. Select `demo-whitelist.json` when the file picker opens
5. Console shows: "Demo whitelist loaded: 119 ASINs"

This tells the ReaderWrangler fetcher extension to only fetch these books.

**Step 2 — Save the full Amazon "Your Books" page**

1. Navigate to `amazon.com/hz/mycd/digital-console/contentlist/booksPurchased`
2. Set filter to "Kindle Edition" (so only Kindle books appear)
3. Scroll through ALL pages — click "Load more titles" repeatedly until every book loads
4. Chrome → File → Save As → "Webpage, Complete"
5. Save as `yourbooks-raw.html` (this creates the HTML file and a companion `_files` folder)

This saved page is the input for the cleanup script. Saving takes a minute or two due to the large page size.

**Step 3 — Clean the saved page**

1. Open `yourbooks-raw.html` in Chrome (local file — `file:///...`)
2. Open DevTools Console (F12 → Console)
3. Paste the contents of `demo-whitelist-cleanup-html.js` and press Enter
4. Console shows: "Kept: 68 books + 12 series = 80 items"
5. The cleaned file auto-downloads as `amazon-yourbooks-demo.html` (check your Downloads folder)
6. Move it to this directory

The cleanup script:
- Removes all non-whitelist book and collection elements
- Matches individual books by `data-csa-c-item-id`
- Matches series stacks by parsing the `asin:` value in `data-csa-c-content-id`
- Removes `<script>` tags, tracking iframes, and "Load more" button
- Scrubs personal info (email addresses → "Demo User")

### Recording Day

Two options for showing `amazon.com` in the URL bar:

**Option A — Quick (recommended)**

1. Open `amazon-yourbooks-demo.html` locally in Chrome
2. Click in the address bar and type `amazon.com/yourbooks` (do NOT press Enter)
3. The address bar shows `amazon.com` while the local demo page is displayed
4. Record

**Option B — Script injection**

1. Navigate to `amazon.com/hz/mycd/digital-console/contentlist/booksPurchased`
2. Wait for the page to fully load
3. Open DevTools Console (F12 → Console)
4. Paste the contents of `demo-whitelist-yourbooks-filter.js` and press Enter
5. Select `amazon-yourbooks-demo.html` when the file picker opens
6. Page content is replaced with the demo library — URL bar still shows `amazon.com`
7. Record

To reset: reload the page (F5).

## Notes

- The display whitelist has 80 entries (vs. 119 in demo-whitelist.json) because series books are collapsed into their parent ASIN, and 7 physical format books (hardback/paperback) were removed
- The 12 series stacks appear with the stacked-book visual and a count badge (e.g., "3", "7")
- Book cover images load from Amazon's CDN — the recording script rewrites local file paths back to absolute CDN URLs
- Some console 400 errors for sidebar SVG logos are expected and don't affect the visible page
