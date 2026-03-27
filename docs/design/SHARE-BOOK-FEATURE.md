# Share Book Feature — Design Plan

## Overview

Let users share book recommendations with friends via link, email, or native share. Every shared link includes the Amazon affiliate tag, creating a revenue channel from organic word-of-mouth recommendations.

---

## Entry Points

### 1. Book Context Menu (right-click cover in Explorer)

Add a **"Share"** submenu after "Open in Amazon" (line ~14783), with sub-items:

| Item | Icon | Condition |
|------|------|-----------|
| Copy Amazon Link | 🔗 | Always |
| Email to a Friend | ✉️ | Always |
| Share… | 📤 | Only if `navigator.share` is available |

Works for **single or multiple selected books**. Adapts text and format based on count.

### 2. Book Detail Dialog (share icon in header)

Add a **share button** (📤) next to the edit (✏️) and close (×) buttons in the modal header (line ~9322). Clicking opens a small dropdown with the same three options. Always single-book context.

---

## Share Actions

### Copy Amazon Link

**Single book:**
```javascript
const url = getAmazonUrl(book.asin);
navigator.clipboard.writeText(url);
showToast('Link copied!', x, y);
```

**Multiple books:**
```javascript
const urls = selectedBooks
    .filter(b => b.asin)
    .map(b => getAmazonUrl(b.asin))
    .join('\n');
navigator.clipboard.writeText(urls);
showToast(`${count} Amazon links copied!`, x, y);
```

**No ASIN (single book):** Toast: "No Amazon link available for this book"
**No ASIN (multi, some have ASIN):** Copy the ones that have ASINs. Toast: "2 of 5 links copied (3 books have no Amazon link)"
**No ASIN (multi, none have ASIN):** Toast: "No Amazon links available for selected books"

### Email to a Friend

Uses `mailto:` — opens user's default mail client with pre-filled content. No backend needed.

**Single book:**

```javascript
const subject = encodeURIComponent(
    `You might like "${book.title}" by ${book.author}`
);

const ratingLine = book.rating ? `⭐ ${book.rating} on Amazon` : '';
const descSnippet = book.description
    ? book.description.substring(0, 150).trim() + '…'
    : '';
const amazonLine = book.asin ? `\nView on Amazon: ${getAmazonUrl(book.asin)}` : '';

const body = encodeURIComponent(
    [
        `I came across this book and thought you might enjoy it:\n`,
        `"${book.title}" by ${book.author}`,
        ratingLine,
        descSnippet ? `\n${descSnippet}` : '',
        amazonLine,
    ].filter(Boolean).join('\n')
);

window.location.href = `mailto:?subject=${subject}&body=${body}`;
```

**Example single-book email:**

> **Subject:** You might like "The Graveyard Book" by Neil Gaiman
>
> I came across this book and thought you might enjoy it:
>
> "The Graveyard Book" by Neil Gaiman
> ⭐ 4.6 on Amazon
>
> Nobody Owens, known as Bod, is a normal boy. He would be completely normal if he didn't live in a graveyard, being raised by ghosts…
>
> View on Amazon: https://www.amazon.com/dp/B001ODEQ7A?tag=rclewent-20

**Example single-book email (no ASIN):**

> **Subject:** You might like "My Unpublished Manuscript" by Jane Doe
>
> I came across this book and thought you might enjoy it:
>
> "My Unpublished Manuscript" by Jane Doe
>
> A fascinating exploration of...

No link, no gap, no explanation needed. The recommendation still works.

**Multiple books:**

```javascript
const subject = encodeURIComponent('Check out these book recommendations');

const bookLines = selectedBooks.map(book => {
    const rating = book.rating ? ` · ⭐ ${book.rating}` : '';
    const link = book.asin ? `\nView on Amazon: ${getAmazonUrl(book.asin)}` : '';
    return `"${book.title}" by ${book.author}${rating}${link}`;
}).join('\n\n');

const body = encodeURIComponent(
    `I came across these books and thought you might enjoy them:\n\n${bookLines}`
);

window.location.href = `mailto:?subject=${subject}&body=${body}`;
```

**Example multi-book email:**

> **Subject:** Check out these book recommendations
>
> I came across these books and thought you might enjoy them:
>
> "The Graveyard Book" by Neil Gaiman · ⭐ 4.6
> View on Amazon: https://www.amazon.com/dp/B001ODEQ7A?tag=rclewent-20
>
> "Beartown" by Fredrik Backman · ⭐ 4.5
> View on Amazon: https://www.amazon.com/dp/B01BGKTWWA?tag=rclewent-20
>
> "Red Tide" by Larry Niven · ⭐ 4.0
> View on Amazon: https://www.amazon.com/dp/B00ABC1234?tag=rclewent-20

**Multi-book format notes:**
- No description snippets (too long with multiple books — title/author/rating/link is enough per entry)
- Books without ASIN simply omit the "View on Amazon" line — no special handling needed
- `mailto:` URLs have a ~2000 character limit in some browsers. Cap at **20 books**; beyond that, toast: "Select up to 20 books to share"

**Notes:**
- `mailto:?` (no "to" address) — lets user fill in the recipient
- Plain text only (mailto limitation) — but effective for personal recommendations
- Affiliate disclosure not needed in personal emails (Amazon Associates policy applies to public content, not private messages)

### Web Share API (Progressive Enhancement)

**Single book:**
```javascript
if (navigator.share) {
    navigator.share({
        title: `${book.title} by ${book.author}`,
        text: book.rating
            ? `⭐ ${book.rating} on Amazon — ${book.description?.substring(0, 100) || book.title}`
            : book.description?.substring(0, 100) || book.title,
        url: book.asin ? getAmazonUrl(book.asin) : undefined
    });
}
```

**Multiple books:**
```javascript
if (navigator.share) {
    const titles = selectedBooks.map(b => b.title).join(', ');
    const firstWithAsin = selectedBooks.find(b => b.asin);
    navigator.share({
        title: 'Book recommendations',
        text: `Check out: ${titles}`,
        url: firstWithAsin ? getAmazonUrl(firstWithAsin.asin) : undefined
    });
}
```

**Behavior:**
- Opens native OS share sheet (email, Messages, WhatsApp, Slack, etc.)
- On **desktop Chrome**: shows share dialog with nearby devices + copy link
- On **mobile** (if app ever loads on phone browser): full native share sheet
- On **Firefox/Safari desktop**: `navigator.share` is undefined → menu item hidden
- No fallback needed — Copy Link and Email cover all cases
- Web Share API only supports one URL, so for multi-book, uses the first book with an ASIN

---

## Implementation Details

### Helper Function

Create a reusable helper so both entry points (context menu + dialog) use identical text:

```javascript
const getShareData = (booksOrBook) => {
    const bookArray = Array.isArray(booksOrBook) ? booksOrBook : [booksOrBook];
    const count = bookArray.length;
    const single = count === 1;
    const book = bookArray[0];

    if (single) {
        const url = book.asin ? getAmazonUrl(book.asin) : null;
        const ratingText = book.rating ? `⭐ ${book.rating} on Amazon` : '';
        const descSnippet = book.description
            ? book.description.substring(0, 150).trim() + '…'
            : '';

        return {
            count: 1,
            urls: url ? [url] : [],
            emailSubject: `You might like "${book.title}" by ${book.author}`,
            emailBody: [
                `I came across this book and thought you might enjoy it:\n`,
                `"${book.title}" by ${book.author}`,
                ratingText,
                descSnippet ? `\n${descSnippet}` : '',
                url ? `\nView on Amazon: ${url}` : '',
            ].filter(Boolean).join('\n'),
            webShareTitle: `${book.title} by ${book.author}`,
            webShareText: book.rating
                ? `⭐ ${book.rating} on Amazon — ${descSnippet || book.title}`
                : descSnippet || book.title,
            webShareUrl: url,
        };
    }

    // Multiple books
    const urls = bookArray.filter(b => b.asin).map(b => getAmazonUrl(b.asin));
    const bookLines = bookArray.map(b => {
        const rating = b.rating ? ` · ⭐ ${b.rating}` : '';
        const link = b.asin ? `\nView on Amazon: ${getAmazonUrl(b.asin)}` : '';
        return `"${b.title}" by ${b.author}${rating}${link}`;
    }).join('\n\n');

    return {
        count,
        urls,
        emailSubject: 'Check out these book recommendations',
        emailBody: `I came across these books and thought you might enjoy them:\n\n${bookLines}`,
        webShareTitle: 'Book recommendations',
        webShareText: `Check out: ${bookArray.map(b => b.title).join(', ')}`,
        webShareUrl: urls[0] || null,
    };
};
```

### Context Menu Integration

**Book context menu** (line ~14783, after "Open in Amazon"):

```
── separator ──
📤 Share                    ▶  (submenu)
    🔗 Copy Amazon Link          (or "Copy Amazon Links" if multi)
    ✉️ Email to a Friend
    📤 Share…                    (only if navigator.share)
── separator ──
📝 Copy Title
```

The Share submenu uses the same hover-to-expand pattern as Move to / Copy to submenus.

**Submenu positioning:** Follow existing pattern — `contextSubmenu` state with `submenuOnLeft` calculation (line ~14370).

**20-book cap:** If more than 20 books selected when clicking Email to a Friend, show toast "Select up to 20 books to share by email" and don't open mailto.

### Book Dialog Integration

**Modal header** (line ~9322, before close button):

```jsx
<button onClick={() => setShareDropdownOpen(!shareDropdownOpen)}
    className="text-gray-400 hover:text-gray-600 text-lg transition-colors"
    title="Share this book" aria-label="Share this book">
    📤
</button>
```

Dropdown appears below the button with the same three options. Uses a small local state (`shareDropdownOpen`) within the modal. Always single-book context.

### Toast Confirmations

| Action | Scenario | Toast |
|--------|----------|-------|
| Copy Amazon Link | Single, has ASIN | "Link copied!" |
| Copy Amazon Link | Single, no ASIN | "No Amazon link available for this book" |
| Copy Amazon Link | Multi, all have ASIN | "3 Amazon links copied!" |
| Copy Amazon Link | Multi, some have ASIN | "2 of 5 links copied (3 books have no Amazon link)" |
| Copy Amazon Link | Multi, none have ASIN | "No Amazon links available for selected books" |
| Email to a Friend | Any | (mail client opens — no toast needed) |
| Email to a Friend | >20 books | "Select up to 20 books to share by email" |
| Share… | Any | (OS handles — no toast needed) |

---

## Files Modified

| File | Changes |
|------|---------|
| `readerwrangler.js` | (1) Add `getShareData()` helper near `getAmazonUrl` usage; (2) Add Share submenu to Explorer book context menu; (3) Add share button + dropdown to book detail modal header; (4) Add `contextSubmenu` value for share (e.g., `'share'`) |

---

## UX Considerations

- **No ASIN handling**: Share always works. For "Copy Amazon Link," toast explains the limitation. For "Email to a Friend" and "Share…", the recommendation is sent without a link — title + author + rating is still a useful recommendation the recipient can search for.
- **Multi-book support**: Context menu adapts — subject line, body format, and labels ("Copy Amazon Link" → "Copy Amazon Links") change based on selection count.
- **Description in email**: Included for single book (150-char snippet). Omitted for multi-book to keep the email scannable.
- **20-book cap on email**: `mailto:` URLs have ~2000 char browser limits. Cap at 20 with toast explanation.
- **Affiliate link is transparent**: The link visibly contains `?tag=...`. Standard and expected. The "View on Amazon" button already uses the same affiliate link.
- **Web Share API single-URL limitation**: For multi-book, passes the first book's Amazon link as the URL. The text field lists all titles. This is a platform constraint, not a UX choice.

---

## What's NOT in Scope

- **Rich HTML email** — would require backend email service. mailto: plain text is effective and ships immediately.
- **Social media specific sharing** (Twitter/X card, Facebook Open Graph) — would need meta tags on a shared page. The Amazon product page handles this when the link is pasted.
- **Share analytics/tracking** — no way to track clicks on affiliate links from within the app. Amazon Associates dashboard provides this.
- **"Share my library" or "Share a folder"** — different feature, much more complex.

---

## Verification

1. Right-click a single book → Share → Copy Amazon Link → paste in notepad → verify affiliate tag present
2. Right-click a single book → Share → Email to a Friend → verify mail client opens with title in subject, description snippet, and affiliate link in body
3. Right-click a single book → Share → Share… (Chrome only) → verify native share sheet with correct title, text, URL
4. Select 3 books → Share → Copy Amazon Links → paste → verify 3 links, one per line
5. Select 3 books → Share → Email to a Friend → verify subject says "Check out these book recommendations", body lists all 3 with individual links
6. Open book dialog → click 📤 → verify same three options work (single-book format)
7. Test with book that has no description → verify email works with just title + author + link
8. Test with book that has no ASIN → Copy Link shows toast "No Amazon link available"; Email works without link line
9. Select mix of books (some with ASIN, some without) → Copy Links → verify partial copy with explanatory toast
10. Select 25 books → Email → verify toast "Select up to 20 books to share by email"
