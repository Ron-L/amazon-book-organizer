# ReaderWrangler Security Model

**Created**: 2026-03-21
**Last Updated**: 2026-03-23

---

## Overview

ReaderWrangler is a client-side web application with no server-side accounts, no user authentication, and no telemetry. All user data lives in the browser. The only network component is an encrypted relay (Cloudflare Worker + KV) used to transfer data between the fetcher bookmarklet, the desktop app, and the mobile viewer.

This document covers: what data exists, where it lives, how it's protected, and what the threat model looks like.

---

## 1. Data Residency — What Stays in the Browser

### Data that never leaves the device

| Data | Storage | Notes |
|------|---------|-------|
| Book library (titles, metadata, covers, descriptions, reviews) | IndexedDB (`readerwrangler-books`) | Can be thousands of books, too large for localStorage |
| Folder structure, book-to-folder assignments | localStorage (`readerwrangler-folders`) | Organization state |
| Tags, tag registry, pinned tag folders | localStorage | User-created taxonomy |
| Filter state, search history, theme preference | localStorage | UI preferences |
| Column widths, sort settings, explorer state | localStorage | Layout preferences |
| Integrity check results | localStorage (`readerwrangler-integrity`) | Auto-repair audit log |

This data is only transmitted via the **encrypted relay** (see Section 2), where it is AES-256-GCM encrypted before leaving the browser — the relay server stores and returns opaque blobs it cannot read. The app loads static files from GitHub Pages and runs entirely in the browser, with the relay as the sole network dependency for data transfer.

**Analytics**: ReaderWrangler uses [GoatCounter](https://www.goatcounter.com/) for privacy-focused, cookie-free usage telemetry. See Section 7 for details on what GoatCounter collects.

### Data at rest is unencrypted in the browser

IndexedDB and localStorage are **not encrypted at rest** by the browser. Any process or person with access to the browser profile can read the data. This includes:

- Other browser extensions with sufficient permissions
- Anyone with physical access to the computer
- Malware running in the user's session
- Browser sync features (if enabled, localStorage may sync to other devices via the browser vendor's servers)

**This is standard for all web applications.** ReaderWrangler does not add encryption at rest because: (a) the data is not particularly sensitive (book titles, not financial data), (b) encrypting localStorage would require a password on every app load, degrading UX for minimal security gain, and (c) the browser's own security model (same-origin policy, sandboxing) provides the baseline protection.

---

## 2. Encryption Architecture — Data in Transit

### What gets encrypted

All data that passes through the Cloudflare relay is encrypted **client-side** before transmission:

| Data | Encrypted | Algorithm | Written by | Read by |
|------|-----------|-----------|------------|---------|
| Library chunks (books + metadata) | Yes | AES-256-GCM | Fetcher bookmarklet | Desktop app |
| Device state (full library snapshot) | Yes | AES-256-GCM | Desktop app | Mobile viewer |
| Exclusion list (deleted ASINs) | Yes | AES-256-GCM | Desktop app | Fetcher bookmarklet |
| Upload manifest (bookCount, timestamp) | **No** | Plaintext JSON | Fetcher bookmarklet | Desktop app |

The manifest is intentionally unencrypted so the app can display "X new books available" in the status bar without deriving the decryption key. It contains only metadata (book count, timestamp, byte sizes) — no book titles, no personal data.

### How encryption works

```
Passphrase + ChannelId
        ↓
PBKDF2 (SHA-256, 100,000 iterations)
    Salt = SHA-256(channelId).slice(0, 16)
        ↓
AES-256-GCM key (256-bit)
        ↓
Encrypt with random 12-byte IV per operation
        ↓
Packed format: [12-byte IV][ciphertext]
```

- **Symmetric encryption**: Both sides (fetcher and app) derive the same key from the same passphrase + channelId. There is no asymmetric (public/private) key pair.
- **PBKDF2 with 100K iterations**: Makes brute-forcing the passphrase computationally expensive even if an attacker obtains the ciphertext.
- **Random IV per encryption**: Ensures identical plaintext produces different ciphertext each time.
- **GCM mode**: Provides both confidentiality and integrity — tampering with the ciphertext is detectable.

### What the relay can see

The Cloudflare Worker (relay) handles only opaque encrypted blobs:

- **Cannot** read book titles, authors, or any library content
- **Cannot** see the passphrase (never transmitted to the Worker)
- **Cannot** derive the encryption key (would need the passphrase)
- **Cannot** distinguish one user's data from another beyond the channelId

The Worker's only job is: store opaque bytes at a key, return opaque bytes for a key, enforce TTL expiration, rate-limit writes, and enforce channel blocklists.

---

## 3. Relay Trust Model

### channelId and passphrase roles

| Credential | Role | Who knows it | Stored where |
|------------|------|-------------|--------------|
| `channelId` | **Address + salt** — Used in the URL path to identify the user's data slot in KV. Also used as PBKDF2 salt for key derivation. | Worker (in URL), fetcher, app, mobile | localStorage, backup file, bookmarklet code |
| `passphrase` | **Secret key material** — Fed into PBKDF2 to derive the AES-256 encryption key. | Fetcher, app, mobile only. **Never sent to the Worker.** | localStorage, backup file, bookmarklet code |

### Access model

The relay has no authentication beyond knowing the channelId (a UUID). Anyone who knows a valid channelId can:

- **Read** encrypted blobs (useless without the passphrase to derive the decryption key)
- **Write** new blobs (could overwrite the user's data — a denial-of-service, not a data theft)
- **Delete** blobs via the cleanup endpoint

CORS restricts browser-based access to allowed origins (`amazon.com`, `readerwrangler.com`, `localhost`). However, CORS is a **browser-only restriction** — scripts using `curl`, `fetch` from a server, or any non-browser HTTP client bypass CORS entirely.

### Why the channelId alone isn't enough

Even with the channelId, an attacker cannot read the data meaningfully because:

1. The data is AES-256-GCM encrypted
2. Decryption requires the passphrase, which is never sent to or stored by the Worker — the passphrase is only stored on the user's devices
3. The encryption algorithm and code are public (open source), but the passphrase is the secret

**Both `channelId` AND `passphrase` are needed for a full compromise.**

---

## 4. Credential Lifecycle

### Generation

Credentials are generated in the browser by the app's Relay Setup modal:

- `channelId`: `crypto.randomUUID()` — a random UUIDv4
- `passphrase`: A random string generated via `crypto.getRandomValues()`

No server is involved in credential generation. The randomness comes from the browser's cryptographic random number generator.

### Storage locations

Credentials exist in these places:

| Location | Format | Notes |
|----------|--------|-------|
| `localStorage` (`readerwrangler-relay`) | `{ channelId, passphrase }` JSON | Primary storage. Cleared on credential revocation or app reset. |
| Bookmarklet code | Baked in as string literals (`window._RW_RELAY_CHANNEL`, `window._RW_RELAY_PASSPHRASE`) | Lives in the browser's bookmarks bar. Updated when credentials change. |
| Backup file (`.json`) | `relay: { channelId, passphrase }` field in organizational backup | **Plaintext in the JSON file.** Treat backup files as sensitive. |

### Credential exposure scenarios

| Scenario | Risk | Mitigation |
|----------|------|------------|
| Backup file shared publicly | Full compromise — attacker can read and write relay data | Treat backup files like passwords. Don't share or commit them. |
| Bookmarklet code inspected | Full compromise — credentials are visible in the bookmarklet URL | Bookmarklet is user-local (bookmarks bar). Don't share bookmarklet code. |
| Browser profile accessed | Full compromise — localStorage is unencrypted | Standard browser security applies (OS-level access control). |
| channelId leaked alone | Attacker can write/overwrite relay data (DoS) but **cannot decrypt** existing data | Rate limiting + revocation (see RELAY-SECURITY-PLAN.md) |
| Source code inspected | No risk — source contains no credentials. Algorithm is public; security rests on the passphrase. | By design. |

### Revocation (v6.9.0)

Self-service credential revocation is available in the app:

- User clicks "Revoke keys & delete data" in Relay Setup → Danger Zone
- App computes `SHA-256(passphrase + channelId)` as proof of ownership (the relay never sees the passphrase itself)
- Worker verifies the proof, deletes all data (manifest, chunks, device state), and permanently blocklists the channelId
- All subsequent requests using the revoked channelId receive HTTP 403
- User generates new credentials to continue syncing

**After revocation**, the user must:

- Re-install the bookmarklet (new credentials are baked in)
- Re-pair the mobile viewer (scan new QR code)
- Run a full library fetch (the next fetch starts from scratch since there is no relay data to delta against)

---

## 5. Backup File Security

The organizational backup file (`readerwrangler-backup-*.json`) contains:

- Complete book library (titles, authors, descriptions, reviews, ratings, prices, tags)
- Folder structure and book assignments
- Relay credentials (`channelId` + `passphrase`) in plaintext

**The backup file should be treated as sensitive.** It is the only file a user saves locally that contains relay credentials.

### Recommendations for users

- Store backup files in a dedicated folder (e.g., `Desktop/ReaderWrangler/`)
- Do not upload backup files to cloud storage without understanding the implications
- Do not share backup files publicly
- If a backup file is accidentally exposed, revoke credentials immediately (Relay Setup → Revoke & Delete) and generate new ones

### What the backup does NOT contain

- Browser session data
- Cloudflare account credentials
- Any data from other websites or browser extensions

---

## 6. Bookmarklet Security

The bookmarklet template (generated by the app) contains:

```javascript
javascript:(function(){
    window._READERWRANGLER_TARGET_ENV='prod';
    window._RW_RELAY_CHANNEL='<channelId>';
    window._RW_RELAY_PASSPHRASE='<passphrase>';
    var s=document.createElement('script');
    s.src='https://readerwrangler.com/bookmarklet-nav-hub.js?cb=...';
    // ... error handling ...
    document.body.appendChild(s);
})();
```

**Credentials are embedded as string literals.** They are only visible if someone actively inspects the bookmarklet code (right-click → Edit in the bookmarks bar). Simply seeing the bookmarklet in the toolbar or watching it run does **not** expose credentials — the name "ReaderWrangler" is all that's visible.

The fetcher script reads these globals, derives the encryption key, encrypts the data, and uploads to the relay. The globals are overwritten when the page navigates away.

**Risk**: If the bookmarklet code is shared (e.g., right-click → Edit → copy, or a screenshot of the edit dialog), the credentials are exposed. The bookmarklet is not obfuscated — credentials are plaintext in the code.

---

## 7. Third-Party Dependencies

| Dependency | What it sees | Trust level |
|------------|-------------|-------------|
| **GitHub Pages** (readerwrangler.com) | Serves static files (HTML, JS, CSS). No server-side code. Cannot see user data. Users can also run the app locally (see Section 10). | High — static hosting only |
| **Cloudflare Workers** (relay) | Stores and retrieves encrypted blobs. Cannot decrypt. Sees channelId in URL. | High — code is ours, runs on Cloudflare's infrastructure |
| **Cloudflare KV** | Stores encrypted blobs with TTL. Cannot decrypt. | High — managed by Cloudflare |
| **Amazon.com** | The bookmarklet runs on amazon.com to fetch library data. Amazon sees normal page requests. | N/A — Amazon is the data source |
| **GoatCounter** (goatcounter.com) | Privacy-focused usage analytics. See details below. | High — no cookies, no personal data, open source |
| **Browser vendor** (Chrome, Firefox, etc.) | Full access to all in-browser data. Standard trust assumption for all web apps. | Implicit trust |

### GoatCounter Analytics

ReaderWrangler uses [GoatCounter](https://www.goatcounter.com/) for privacy-focused usage telemetry. GoatCounter does **not** use cookies, does **not** collect personal data, and does **not** do cross-site tracking.

**Page view tracking** (standard GoatCounter script on `index.html` and `readerwrangler.html`):
- Page URL (which page was loaded)
- Referrer (where the user came from)
- Browser/OS (from User-Agent)
- Screen size
- Country (from IP, not stored)

**Custom events** (fired via `new Image().src` pixel) help us understand how the app is used so we can improve it:

| Event | When fired | What it tells us |
|-------|-----------|-----------------|
| `/event/library-fetcher-completed` | Fetcher finishes successfully | How often users complete a library fetch |
| `/event/newOwnershipType=<type>` | Fetcher encounters an unknown book ownership type | Helps discover new Amazon ownership categories to support |
| `/event/file-imported` | User imports from relay or restores a backup | How often users import data |
| `/event/file-exported` | User saves a backup | How often users back up |
| `/event/app-reset` | User resets the app | How often users start fresh |
| `/event/integrity-<type>` | Integrity check auto-fixes or flags an issue | How often data integrity issues occur and what types |

**What GoatCounter does NOT see:**
- Book titles, authors, or any library content
- Relay credentials
- Folder names or organization structure
- Any data from IndexedDB or localStorage
- User identity (no accounts, no cookies, no fingerprinting)

---

## 8. Relay Operational Security (v6.9.0)

The relay Worker includes server-side protections against abuse and monitoring for security events.

### Rate Limiting

Write operations (upload chunks, upload manifest, update device state) are rate-limited per channelId:

- **Limit**: 200 write operations per hour per channel
- **Window**: Sliding 1-hour window using KV counters with TTL
- **Enforcement**: HTTP 429 response when limit exceeded
- **Auto-blocklist**: A channel exceeding 2,000 writes in a window is permanently blocklisted (same effect as revocation)
- **Read operations**: Not rate-limited (reads are cheap and don't modify state)

### Blocklist

Revoked and abuse-flagged channels are permanently blocked:

- KV key: `blocklist:{channelId}` with no TTL
- Checked on all 7 relay handlers (upload, download, status, device-state read/write, cleanup, revoke)
- Returns HTTP 403 for all operations on blocked channels
- Entries include timestamp and reason (`user-revoked` or `rate-limit-exceeded`)

### Email Alerts

Security-relevant events trigger email alerts to the site operator via [Resend](https://resend.com/):

| Event | Alert sent |
|-------|-----------|
| Channel revoked by user | Yes |
| Channel auto-blocklisted (rate limit abuse) | Yes |
| Rate limit exceeded (per-event) | No (would be noisy) |

Alerts are sent to `contact@readerwrangler.com` and include the channelId and timestamp. They do **not** include any user data, passphrase material, or encrypted content.

**Configuration**: Resend API key and alert recipient are stored as Cloudflare Worker secrets (`RESEND_API_KEY`, `ALERT_TO_EMAIL`). Alert failures are logged but do not block the primary operation — a failed alert does not prevent a revocation from completing.

### Error Reporting Approach

ReaderWrangler uses two complementary channels for error visibility:

| Channel | Scope | Examples |
|---------|-------|---------|
| **Resend email alerts** | Relay security events | Revocation, auto-blocklist |
| **GoatCounter events** | App-level usage patterns | Import/export frequency, integrity check results |

There is no application-level error reporting service (e.g., Sentry). Errors in the browser app are visible only in the user's browser console. This is a deliberate trade-off: no error telemetry means no risk of accidentally capturing user data in error payloads, but it also means the operator has limited visibility into client-side failures.

### Recommended Additions (Future)

- **Cloudflare Dashboard Notifications**: Configure Cloudflare's built-in alerts for Worker error rate spikes, KV storage limits, and billing thresholds. These complement Resend alerts with infrastructure-level monitoring.
- **Phase 2**: Edge-level protections (Cloudflare WAF rules, IP-based rate limiting) for defense-in-depth beyond the application-level checks.

---

## 9. Threat Summary

| Threat | Impact | Likelihood | Mitigation | Status |
|--------|--------|------------|------------|--------|
| Backup file accidentally shared | Full data + credential exposure | Low | User education; `.gitignore` excludes backups | Active |
| Bookmarklet code shared | Credential exposure | Low | User education | Active |
| Browser profile access (physical/malware) | Full data exposure | Medium | OS-level security; browser sandboxing | Inherent to web apps |
| channelId leaked (without passphrase) | DoS — attacker can overwrite relay data | Low | Rate limiting (200 writes/hr), revocation, blocklist | Active (v6.9.0) |
| Both credentials leaked | Full relay data compromise | Very low | Self-service revocation, data wipe, email alerts | Active (v6.9.0) |
| Relay Worker compromise (Cloudflare breach) | Attacker sees encrypted blobs | Very low | Data is AES-256-GCM encrypted; useless without passphrase | By design |
| Cost abuse (flooding relay with writes) | Increased Cloudflare bill (site operator only — no cost to users) | Low | Rate limiting (200 writes/hr, auto-blocklist at 2000), email alerts | Active (v6.9.0) |
| MITM on relay traffic | Cannot decrypt — HTTPS + AES-256-GCM | Very low | TLS (Cloudflare) + client-side encryption | Active |
| Brute-force passphrase from ciphertext | Decrypt relay data | Negligible | PBKDF2 100K iterations; passphrase is high-entropy random | By design |

---

## 10. Non-Issues

These are things that might look like security concerns but are not:

### "The source code is public"

The encryption algorithm, key derivation parameters, and relay protocol are all visible in the source code. This is intentional and correct — **security through obscurity is not security**. The system's security rests on the passphrase being secret, not on the algorithm being hidden. This follows Kerckhoffs's principle.

### "There are no user accounts"

There is no authentication system because there is no server-side state. Each user's data is isolated by their channelId and protected by their passphrase. The lack of accounts means: no password database to breach, no session tokens to steal, no account takeover attacks. This is a security advantage, not a gap.

### "Data is stored in the browser"

All web applications store data in the browser. IndexedDB and localStorage are protected by the browser's same-origin policy — only code running on `readerwrangler.com` can access ReaderWrangler's data. This is the standard security model for all web apps including banking, email, and social media.

### "The relay could be compromised"

Even if an attacker gains full access to the Cloudflare Worker and KV namespace, they see only encrypted blobs. Without the passphrase (which is never sent to or stored by the relay), the data is computationally infeasible to decrypt. The relay is a dumb pipe by design.

### "The data isn't very sensitive"

Book titles and reading preferences are not financial or medical data. However, a user's library can reveal personal interests, political views, religious beliefs, or other private information. The encryption and no-account architecture respect this — we protect the data as if it matters, because to the user, it does.

**What is never at risk, regardless of any scenario above:**

- **Your Amazon account credentials** — ReaderWrangler never accesses, stores, or transmits your Amazon username or password. The bookmarklet reads publicly visible book data from pages you're already logged into.
- **Your payment information** — No financial data of any kind is involved.
- **Your identity** — There are no accounts, no email addresses, no personal identifiers anywhere in the system.

### "You have to trust GitHub Pages"

You don't. ReaderWrangler is open source under the [MIT License with Commons Clause](../../LICENSE). You can download the entire repository (Code → Download ZIP on GitHub) and run the app locally by opening `readerwrangler.html` in your browser. No installation, no server, no command line required.

**What runs locally:** The entire app — organizing, searching, filtering, tagging, backup/restore. All your data stays in your browser's local storage exactly as it does on readerwrangler.com.

**What still uses our infrastructure:** The relay (bookmarklet↔app sync and mobile pairing) communicates through a Cloudflare Worker. Self-hosted users still use this relay for data transfer. To run a fully independent setup, you can deploy your own Cloudflare Worker using the source in the `relay/` directory (free tier is sufficient). The encryption works identically regardless of which relay you use.

---

## Related Documents

- [RELAY-SECURITY-PLAN.md](../design/RELAY-SECURITY-PLAN.md) — Phased implementation plan for credential revocation, rate limiting, and abuse protection
- [DATA-SCHEMA.md](DATA-SCHEMA.md) — Complete data schema including relay credential format, KV key layout, and backup export structure
