# ReaderWrangler: Cross-Domain Conduit — Problem Statement

## Status

ReaderWrangler is feature complete and ready for documentation, final testing, and release.

One unresolved UX problem remains worth addressing before or shortly after launch: **the app cannot permanently delete books.**

---

## The Root Cause

The current architecture uses a JSON library file as a one-way conduit from the fetcher (running on `amazon.com`) to the app (running on `readerwrangler.com`). The file is a snapshot of Amazon's library state — it knows nothing about operations performed inside the app.

This means the app cannot delete a book in any meaningful sense. If a book is removed from the app's data, it returns on the next import because the fetcher will include it again. The fetcher has no awareness of app state, and browser security (Same-Origin Policy) makes direct cross-domain storage sharing impossible.

The current workaround — marking books "hidden" rather than deleting them — is a technical constraint dressed up as a feature. It works, but it requires users to understand why it exists, which violates basic UX principles. A user who deletes a book should not need to know anything about cross-domain architecture.

---

## The Specific Pain Point

The problem is most acute with wishlist books. A common workflow:

1. User notices an incomplete series and adds all books to wishlist from the series page
2. Some of those books are already in the library (owned)
3. The import creates duplicates — owned books now appear in both the library and wishlist views
4. User wants to delete the duplicates from wishlist

There is currently no clean way to do this. Hiding them works mechanically but is unintuitive and clutters the hidden items list.

---

## Reframing the Conduit

The file has always been thought of as a *fetch record* — a snapshot of what Amazon returned. That framing is the problem.

A better mental model: **the conduit should carry app state back to the fetcher**, not just fetch results forward to the app. Specifically, the app needs a way to tell the fetcher "don't import this ASIN" — a persistent exclusion list that survives across sessions and fetch runs.

This does not require full two-way sync. It requires only that the conduit carry one small additional piece of data: **a list of ASINs the user has deleted in the app.** The fetcher filters these out on import. This is effectively a minimal transaction journal scoped to the one operation that matters across the domain boundary.

---

## The File Picker Friction Problem

Separately from the delete problem, the current file-based conduit requires the user to manually save the library file from the fetcher and open it in the app via a file picker dialog. This is the biggest friction point in the user experience — it turns what should feel like a sync into a manual file management task.

Both problems (delete and friction) share the same root cause, and both are resolved by the same architectural change.

---

## On Privacy

The file-based approach is sometimes framed as the "private" option because data never leaves the user's device. On examination this argument does not hold up. The library data already travels over the internet — from Amazon's servers to the user's browser — on every fetch. Amazon has full visibility into the user's library, purchase history, and browsing behavior. The marginal privacy concern of an encrypted 24-hour relay is effectively zero in that context.

The Cloudflare relay encrypts data client-side before it ever leaves the browser. The relay only ever sees ciphertext. Data is automatically deleted after import. The privacy story is sound, and it should be disclosed clearly but not apologetically.

---

## Solution: Cloudflare Workers + KV

A lightweight Cloudflare Worker serves as the cross-domain relay. The fetcher POSTs encrypted library data to the worker; the app GETs and decrypts it. The worker is ephemeral by design for library transfers — data auto-expires after 24 hours and is deleted by the app after successful import. A persistent KV key carries the deleted-ASIN exclusion list from the app back to the fetcher with no expiration.

A user-unique passphrase, generated at bookmarklet install time and baked into the bookmarklet code, encrypts all data client-side. The worker never sees plaintext.

This is the sole transfer path. The file picker is removed from the routine import flow entirely.

---

## File Export: Backup and Restore

The ability to export the library as a file and re-import it is retained as a distinct utility — not a transfer mechanism. Its legitimate uses are:

- **Restore points** — snapshot the library before destructive dev testing or bulk operations
- **Archival backups** — periodic exports stored in Dropbox or locally for disaster recovery

These are explicit, intentional actions available in Settings. They are not part of the routine import workflow.

The Dropbox-to-phone sharing workflow that previously relied on file export is replaced by the mobile device sync feature described in the design document.

---

## Trash Bin

A system Trash Bin is the intended UX for deletes. When a user deletes a book, it moves to the Trash Bin rather than being immediately purged. The user can browse the Trash Bin, restore individual books, manually empty it, or configure auto-purge after a set period (e.g. 30 days).

This is distinct from — and should not be confused with — a workaround of creating a user folder named "Trash Bin" and populating it with hidden books. That approach requires the user to understand the underlying architecture and perform manual steps that should be automatic. It is a documentation workaround, not a feature.

The Trash Bin as a system feature is fully compatible with the exclusion list design: a book's ASIN is only added to the exclusion list (and thus permanently filtered from future imports) when it is purged from the Trash Bin, not when it is first deleted. While a book sits in the Trash Bin it remains recoverable, and the fetcher will still import it if it appears in a fetch. Only on purge — manual or automatic — does the ASIN move to the exclusion list and become permanently filtered.
