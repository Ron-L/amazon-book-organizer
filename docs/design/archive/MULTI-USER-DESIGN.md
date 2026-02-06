# Multi-User (Multi-Account) Design Document

> **⚠️ ARCHIVED:** This feature is not needed. ReaderWrangler provides a simpler workaround: Export/Import backup files to switch between accounts. See [USER-GUIDE.md FAQ](../../USER-GUIDE.md#faq) "Can I maintain separate organizational states?" for the Backup/Restore method to swap between different organizational states (different accounts, demo vs. actual collection, testing vs. production, etc.).

**Feature**: Multi-User Support
**Status**: Archived - Workaround sufficient (Export/Import backups)
**Created**: 2025-11-21

---

## Problem Statement

What happens when multiple Amazon accounts use ReaderWrangler on the same browser/device?
- Couples sharing a computer
- User with personal + work Amazon accounts
- Testing with multiple accounts

---

## Design Decisions Made

### 1. Identifier: Amazon AccountId (NOT a GUID)

Use Amazon's native accountId as the library identifier.

**Benefits:**
- User-recognizable (they see their own account name)
- Naturally unique per Amazon account
- No need to generate/manage separate GUIDs
- Collections uses same accountId as Library (tied to same Amazon account)

### 2. Where to Find AccountId

**Final Design:**
- `primaryEmailAddress` → Internal unique key (guaranteed unique per account)
- `customerName` → Display to user (friendly, what they expect)
- Store both in manifest, keyed by email

**DOM Fallback (if needed):**
- Yourbooks page: Banner says "Ron Lewis's Books"
- Collections page: "Ron" appears in 2 places

### 3. Storage Architecture

- Fetcher writes manifest directly to IndexedDB (not separate JSON file first)
- JSON file is primary storage for book data (reviews make it too large for IndexedDB)
- Each library identified by accountId in IndexedDB
- Collections uses same accountId as Library

### 4. No "Compare" Feature Needed

- Users don't need to compare libraries across accounts
- Each account's library is independent

### 5. Clear Behavior

- Clear should clear current library only (by accountId)
- Not a global "clear all accounts" operation

### 6. Backup/Restore

- Handles the "experimenting with arrangements" use case
- User can backup their organization, try changes, restore if unhappy
- Per-account backup/restore (identified by accountId)

### 7. AccountId Mismatch Handling (Future)

What if user loads a JSON file from a different account?

**Options:**
- Warn user and ask to confirm
- Automatically segregate by accountId
- Reject mismatched files

Decision deferred to implementation time.

---

## Current Implementation (Single-User)

For the initial "Ship Fast" release:
- Assume single account per browser
- No accountId tracking yet
- Library and Collections assumed to be from same account
- No mismatch detection

---

## Future Implementation (Multi-User)

When implementing multi-user support:

1. Get accountId from Amazon page during import
2. Store accountId in manifest (IndexedDB)
3. Include accountId in JSON file metadata
4. Detect mismatched files on load
5. Per-account organization data in IndexedDB
6. Account switcher UI in status bar
