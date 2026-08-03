# Relay credential mismatch — safe restore

_Moved verbatim from TODO.md during the 6.12.0 TODO restructure (2026-08-03). Backlog. Refined 2026-06-15. **MEDIUM / LOW (2-3 hours).**_

---

**Problem:** a backup includes relay credentials (channelId + passphrase). Restore silently OVERWRITES the app's current creds. If the app was paired to a different channel than the backup, the installed bookmarklet no longer matches the app → fetches go to one channel, app reads another (books appear to vanish). Real scare 2026-06-15 (compounded by the demo whitelist).

**Why creds are in the backup (keep them):** device migration — restoring on a new computer/browser adopts the channel so the EXISTING bookmarklet keeps working without re-pairing. This is the legitimate use case, so don't remove creds from backups.

**Why cross-detection can't work:** app and bookmarklet are different origins (can't read each other's localStorage), and relay channels are isolated (a mismatched pair can't see each other through the relay). The ONLY reliable detection point is the restore operation, where the app momentarily holds both current creds and the backup's creds.

**Fix — compare on restore:**
- App has no creds (fresh / migration) → adopt backup's silently (bookmarklet already matches)
- Backup creds == current → adopt silently (no-op)
- Backup creds ≠ current → **PROMPT: Keep current** (default, recommended — matches your installed bookmarklet) vs **Use backup's**

**"Use backup's" branch:** adopt the backup's creds AND render the matching bookmarklet inline (reuse the Relay Setup generator). Wording: *"Delete the existing bookmark and then drag this bookmarklet to your bar."* — delete FIRST (avoids two-bookmarklet confusion); say "existing" not "old" (a restore can go newer→older, making "old" ambiguous). The existing bookmarklet can be right-clicked → delete while the dialog is open (confirmed 2026-06-15).

**Note:** channel ID only decides which relay bucket app+bookmarklet share — not the book set. Keeping current creds never costs books; a re-fetch tops up recent books on the current channel.

**Future:** bookmarklet could ping `/status/{channelId}` before fetching and warn on 403/404 (separate revoked-channel case, not mismatch).
