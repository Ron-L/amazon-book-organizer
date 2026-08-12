# Data Durability & the Wishlist Decision

_Why some ReaderWrangler data is recoverable from Amazon and some isn't, why we keep wishlist items despite
the latter, and what a user does when the synced copy fails its integrity check. Decided 2026-08-12._

## The two data classes

| Class | Examples | Source of truth | If the relay blob corrupts |
|---|---|---|---|
| **Amazon-recoverable** | Owned books, **samples** | Your Amazon **Kindle library** | Re-fetch from Amazon rebuilds them — bulletproof |
| **RW-only (no Amazon backstop)** | **Organization** (folders, Book Lists, tags, price goals, reading status) **and wishlist items** | Only the relay + local IndexedDB | Recoverable **only** from local IndexedDB or a **backup** |

The relay is a **cache / sync layer, not a source of truth**. A corrupt relay blob loses nothing permanent for
the Amazon-recoverable class (re-fetch). For the RW-only class, the local copy + backups are the recovery path —
which is why **backups and a hardened relay write matter most for organization and wishlist.**

## What an RW wishlist item actually is

It is a **purely RW-native record**, created two ways, both local:
- The **wishlist bookmarklet** (`amazon-wishlist-fetcher.js`, `addToWishlist()`) scrapes an Amazon **product/series
  page** and builds a book with `onWishlist: true, ownershipType: 'wishlist'`.
- The **edit dialog's** ownership toggle ("Mark as Owned or on Wishlist").

Crucially it is **not** on your Amazon account's wishlist and **not** in your Kindle library — so **nothing on
Amazon can rebuild it.** On a routine library re-fetch it's preserved as an "orphan" (kept from local), so normal
fetches never drop it; but a **total loss (relay + local both gone) is unrecoverable without a backup.**

## Keep or eliminate wishlist? → **KEEP** (2026-08-12)

We seriously considered replacing wishlist with **samples** (which are Amazon-durable). Decided to **keep** it.

**What wishlist uniquely provides (samples can't):**
- **No device clutter** — track a "want" without downloading a sample onto your Kindles.
- **Pre-orders** — a sample can't represent a book that isn't out yet.
- **Sample-less Kindle books** — some titles offer no sample at all.
- **Non-Kindle formats (HB/PB)** — the fetcher captures Paperback/Hardcover/etc. This opens a real
  **"physical-collection curator"** persona: RW as a better-organized, Amazon-sourced **catalog** of books you own
  or want *on paper*, not only on Kindle. (The old barcode-scanner-into-a-DB idea, done properly.)

**Why the fragility objection doesn't justify removal:**
Your **organization** (folders — hundreds of them — Book Lists, tags) is **equally** RW-only and **equally**
corruptible, and you obviously can't eliminate folders. So the corruption risk **must** be solved at the relay
layer — the **atomic commit-pointer redesign** (see TODO) — regardless of wishlist. Once that lands, **wishlist is
no more fragile than your folders.** Killing wishlist to dodge corruption would treat a symptom while the same
disease still threatens organization. The "extra attack surface" (each add is a relay write) is real but marginal
next to the far more frequent organization writes, and atomic writes neutralize all of them.

**Decision:** keep wishlist, and instead —
1. **Harden the relay write** (atomic commit-pointer) — mandatory for organization anyway.
2. **Give the RW-only classes a safety net** — auto-backup and/or a one-click export, since they're the only data
   Amazon can't rebuild.
3. **Surface a clear recovery procedure** when an integrity/checksum error occurs (below).

## Scope note

This nudges RW from "Kindle-library organizer" toward "Amazon-sourced book **catalog & organizer**" — Kindle-first,
but able to track physical and wished-for books. Wishlist / non-Kindle records are what serve that persona.

## Corruption recovery (user procedure)

A "**Sync data check failed** (checksum mismatch)" means the **synced (relay) copy** failed its integrity check —
almost always because a **browser tab was closed while a sync was still finishing** (e.g. mid wishlist-add). It can
surface from **any** fetcher (wishlist / library / collections) or during **Import from Relay** — the relay
device-state is one checksummed blob, so a mismatch means rebuilding the **whole** synced copy. **Local data on the
ReaderWrangler device is intact.**

Keep your **ReaderWrangler tab open** (it's slow to reload). Do all of these, in order:

1. **Save a backup** — in your ReaderWrangler tab: **File → Save Backup…**
2. **Download your library** — in a **new browser tab**, click your **ReaderWrangler bookmarklet → "Go to Amazon
   Library Page"**, then the bookmarklet again → **"Download Library."**
3. **Download your collections** — in that tab (or a second new one), click the bookmarklet → **"Go to Amazon
   Collections Page"**, then → **"Download Collections."** (Separate step — Amazon blocks fetching both from one
   page, and the library download doesn't include collections.)
4. **Import** — back in your ReaderWrangler tab, the **File** menu turns red **"Update available"** → **File →
   Import from Relay.**

**Implementation.** The recovery text is a single source of truth: `RECOVERY_STEPS` in `relay-client.js`, exposed as
`window.RW_RECOVERY_STEPS` and carried on the thrown checksum error (`err.isCorruption = true`). The app catches it
on Import from Relay and shows a dialog with a **Copy** button; a fetcher's error overlay shows the same text.
_(Follow-up: a polished, formatted overlay + Copy button inside the bookmarklet fetchers — needs a dev push to test.)_

## Related
- Root-cause fix: relay write redesign / **atomic commit-pointer** (TODO, "Relay / data robustness").
- The recovery message is shown by the **wishlist bookmarklet on the Amazon page**, where the error surfaces.
- Integrity status is visible any time in **File → Data Status** (Integrity: Clean / …).
