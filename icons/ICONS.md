# Icons Reference

## Active Icons

| Filename | Size | Style | Used In |
|----------|------|-------|---------|
| `favicon.ico` | 32x32 | Wordless, blue bg | All HTML pages — browser tab |
| `favicon-16.png` | 16x16 | Wordless, blue bg | All HTML pages — small favicon |
| `favicon-32.png` | 32x32 | Wordless, blue bg | All HTML pages — large favicon |
| `apple-touch-icon.png` | 180x180 | Wordless, blue bg | iOS "Add to Home Screen" |
| `icon-192.png` | 192x192 | Wordless, blue bg | PWA manifest — Android home screen |
| `icon-512.png` | 512x512 | Wordless, blue bg | PWA manifest — Android splash/install |
| `logo-transparent.png` | 500x500 | Wordless, transparent | In-app splash screen, landing page hero, install page header |
| `logo-transparent-32.png` | 32x32 | Wordless, transparent | Landing page nav bar logo |
| `og-image.png` | 1200x630 | Landscape w/ tagline, blue bg | OG/Twitter social sharing cards |

## Deleted Icons (recoverable from git history)

Removed in the icon cleanup commit during mobile viewer work (v5.6.x). Use `git log --all --full-history -- icons/<filename>` to find the last commit containing any of these.

| Former Filename | Size | Style | Why Removed |
|-----------------|------|-------|-------------|
| `ReaderWrangler.png` | 500x500 | With tagline, blue bg | Source art; tagline unreadable at icon sizes |
| `ReaderWranglerXparent.png` | 500x500 | With tagline, transparent | Source art; tagline unreadable at icon sizes |
| `ReaderWrangler180.png` | 180x180 | Wordless, blue bg | Duplicate of `apple-touch-icon.png` |
| `ReaderWranglerWordless.png` | 500x500 | Wordless, blue bg | Superseded by `icon-512.png` (512x512) |
| `Canva AI - Canva.url` | — | Browser shortcut | Not a deployable asset |
| `The ultimate favicon generator - Favic-o-Matic.url` | — | Browser shortcut | Not a deployable asset |

## Renamed Icons (old name → new name)

| Old Name | New Name |
|----------|----------|
| `ReaderWranglerWordless16.png` | `favicon-16.png` |
| `ReaderWranglerWordless32.png` | `favicon-32.png` |
| `ReaderWrangler192.png` | `icon-192.png` |
| `ReaderWranglerWordlessXparent.png` | `logo-transparent.png` |
| `ReaderWranglerWordlessXparent32.png` | `logo-transparent-32.png` |

## Design Notes

- **Blue background** (`#A8C8E0`-ish): Used for all home screen / tab / social icons. This is the brand color, distinct from the app's dark UI theme.
- **Transparent**: Used for in-app display where the icon sits on themed backgrounds (splash screen, hero section).
- **Wordless**: All icons except `og-image.png` omit the tagline — text is unreadable below ~300px.
- **Source art**: Created in Canva. Source designs may still be accessible via the Canva account.
