# Metadata Import — Design Notes

**Status:** design only, not built. Future feature. Captures the discussion from 2026-06-16.

## Problem

Applying per-book metadata across many books is painful today. The motivating case: a user wants ~32 Heinlein novels ordered by **original publication date** (the Amazon/Kindle dates are release dates, not publication order). Setting series position via the book dialog means 32 dialogs × ~6 precise clicks each — the "aiming tedium" is the real pain. This recurs for many authors, and grows (Adult/Juvenile groupings, integrated views, missing books).

## What already shipped (v6.12.0) — the no-matching path

The **"Number in reading order"** wizard (folder/Book List right-click) covers the common case *without* any import: arrange books in Manual Order (drag), then number them 1, 2, 3… by that order, with an optional series name. It works directly on real library books, so there's **no title-matching** and no ambiguity. For "I've arranged these how I want, freeze it as numbers," this is the right tool and should stay even after import exists.

Import is the complement: when you have an external **ordered/structured list** and don't want to hand-arrange.

## The import feature — two tiers

**Tier 1 — paste an ordered list (lightest).**
- Paste titles, one per line, in the desired order.
- App numbers them by line (1, 2, 3…), matches each to a library book by title, sets **series position** (and optional series name applied to all).
- Fits sources that are already ordered lists (e.g., a Wikipedia bibliography).

**Tier 2 — CSV (general).**
- Columns: `Title` (or `ASIN`), optional `Author`, `Series`, `SeriesNum`, `Tags`, `MyRating`, `ReadStatus`, `Note`.
- Match → apply multiple fields at once.
- This is the same shape as **Goodreads / StoryGraph CSV exports**, so Tier 2 is effectively the engine for the "Third-Party Integrations (Goodreads sync)" roadmap item. Build the matcher generically.

## Matching

- **Key:** title (normalized — lowercase, strip subtitles / "A Novel" / punctuation), or exact **ASIN** if the CSV provides it.
- Wikipedia/Goodreads titles won't be byte-identical to Amazon-Kindle titles, so a **review step is required**: show matched / ambiguous / unmatched before applying. Never blind-apply.
- **Unmatched rows = the "missing books" report.** The app lists them so the user can copy, look them up on Amazon, and add via the wishlist bookmarklet. The app **cannot** auto-add to the wishlist (that must happen on the amazon.com domain) — so "surface the gap, user fills it" is the correct scope. Nicety: a "copy missing titles" button.

## Recommended metadata model (the Heinlein Adult/Juvenile case)

Don't encode Adult/Juvenile as the **series name** (a book has one series; you lose the integrated view). Instead:
- **series = "Heinlein"**, **series position = overall publication order**, **tags = "Adult" / "Juvenile."**

Then: integrated pub-order view = filter to series "Heinlein", sort by series; Juvenile-only = filter by tag "Juvenile". Tags are the cross-cutting filter; series position is the spine. (Aside: since the v6.12.0 series-sort fix, a blank series name falls back to position too — but a real name keeps it filterable.)

## What else users will want to import
Series + position, tags, my rating, read status (Goodreads "read" shelf), notes, want-to-read priority. All title/ASIN-matched. One generic matcher serves all of it.

## Build sketch (when prioritized)
1. Import dialog: paste-list (Tier 1) and CSV upload (Tier 2) modes.
2. Parse → normalize → match against library (title/ASIN) → **review table** (matched / ambiguous / unmatched).
3. Apply selected; record one undoable batch action (mirror SEQUENCE_SERIES / bulk-edit).
4. Show the unmatched/missing list with a copy button.
