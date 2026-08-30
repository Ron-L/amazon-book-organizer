# Multi-instance model: storage universes, writers, and guests

_Status: DECIDED 2026-08-30 (the folder-order-scramble forensics session). The guest guard +
field-preserving cache ship in 7.6.0-alpha.6; the read-only second tab and split view are
designed-here, built-later. This doc is the "Ron, Ron, Ron" reference for every future
"two copies of RW touched the same data" question._

---

## 1. The universe model

Browser storage (localStorage AND IndexedDB) is isolated **per browser × per profile × per site
address**. Every cell in that grid is a separate universe: localhost-in-Chrome,
readerwrangler.com-in-Chrome, localhost-in-Firefox, the installed PWA (which snapshots its install
address) — none can touch another. ALL same-universe residents share everything, instantly,
last-writer-wins, with no notification to other tabs.

Residents of one universe and what they write:

| Resident | Writes | Notes |
|---|---|---|
| Desktop app | FOLDERS_KEY, org blob (STORAGE_KEY), EXPLORER_KEY, IndexedDB books, device-state → relay | The owner |
| Mobile app | The SAME folder/org keys + IndexedDB books (its offline cache) | **Reads the relay, never writes it.** Renders FROM its cache, not from the payload |
| Relay | nothing local | Post office, not a resident |

Mobile shares desktop's keys deliberately: on a phone it's the only resident, the cache makes
boot instant + offline work, and the Desktop Mode switch finds a library waiting.

## 2. The 2026-08-30 post-mortem (three-layer bug, all layers confirmed live)

1. **Fragile base**: Ron's root folder order existed only as IMPLICIT ARRAY ORDER — no `sortIndex`
   on any root folder (backups carried order as array position). Any array rewrite scrambled the
   display to raw creation order ("Jim Butcher first").
2. **The thief**: mobile's `restoreOrganization` cached the relay payload through an **allow-list
   field map that stripped `sortIndex`** (same bug class as restore bug #3), and wrote it over the
   desktop keys **stamped `savedAt: Date.now()`** — relay-lagged, field-stripped data masquerading
   as fresh local truth. Every mobile load on localhost re-scrambled (explains the 2026-08-15
   ghost, the "fresh code" correlation — new alpha → test mobile — and the bake dying in 20 min).
3. **Exonerated**: localStorage quota (217 KB total), the integrity checker (spreads preserve
   fields), the wire (the push serializes folders with a deny-list spread — sortIndex travels).

**Vaccine** (applied live): one Move-to-Top gesture renumbers ALL roots via the canonical reorder —
order becomes explicit `sortIndex`, array rewrites stop mattering. **Any scramble after alpha.6
means something actively rewrote explicit indices — run the forensic snippet immediately.**

## 3. The guest guard (7.6.0-alpha.6)

**Rule: a resident may only overwrite the shared cache with data NEWER than the cache.**

- The desktop push **source-stamps** `organization.savedAt` with the org blob's own `savedAt` —
  the timestamp OF THE STATE SERIALIZED, not the send time. (A wall-clock send stamp would be
  newer than the blob it was built from and the guard would misfire — hole found by Ron.)
- Mobile caches the payload (org keys AND IndexedDB books — both writes gated together) only when
  `payload.organization.savedAt > localBlob.savedAt`, and **re-stamps its cache write with the
  payload's source stamp**, never `Date.now()` — one clock lineage (the desktop's), monotone
  comparisons forever. (Second hole found in self-check: a wall-clock mobile stamp would exceed
  every later payload stamp and freeze the phone's cache.)
- Mobile's field map becomes a deny-list spread (`{ ...f, bookIds: filtered }`): `sortIndex`,
  `isInbox`, `description`, future `pinned` survive automatically.

Consequences by universe:
- **Phone** (mobile-only resident): cache carries the last payload's stamp; every newer push wins;
  behavior unchanged.
- **Dev machine** (desktop + mobile emulation share localhost): desktop blob is stamped at local
  edit time, always ≥ any payload's source stamp → mobile **never writes** → and since mobile
  renders from cache, dev-mobile displays the (fresher) local data. Both properties desirable.
- **Transition**: unstamped payloads (pushed pre-alpha.6) are treated as stamp 0 → never overwrite
  an existing blob; a truly EMPTY universe (new phone pairing, nothing to protect) accepts even an
  unstamped payload so first-pairing against an old payload still works.

**Rejected: separate cache keys for mobile.** Would isolate equally well but breaks phone Desktop
Mode (desktop code would find no library) — the guard achieves the same protection with no
feature loss. Held in reserve if the guard ever leaks.

## 4. Two desktops, same universe: the read-only second tab (designed, not built)

localStorage is last-writer-wins; a second desktop tab holds its ENTIRE organization in memory,
and one innocent edit writes the whole stale world over everything done since it loaded. Design
(ratified 2026-08-30):

- **Leader election via the Web Locks API**: first tab acquires the writer lock; later tabs open
  **read-only** (badge/border, mutation tools disabled; view changes allowed — presentation is
  per-tab app config, not data — but a viewer's view tweaks stay IN MEMORY, never written to the
  shared settings key). Lock releases automatically on tab close OR crash — no heartbeat, no
  dying-gasp problem (Ron's design, upgraded from his timestamp scheme).
- **Promotion is explicit and reloads first**: writer gone → viewer offers "Take over editing?" →
  **reload from stores, then acquire lock, then enable writes**. Never silent, never on stale
  state (a snapshot quietly becoming writer would commit the exact clobber this doc exists to
  prevent). A read-only tab is never auto-promoted.
- **Live by default, freezable anytime**: viewer follows the leader via a storage/BroadcastChannel
  listener; its banner carries a ❄ Freeze/Resume toggle ("Following live" ↔ "Frozen at 6:04 PM").
  Rejected: asking frozen-vs-live at open — the user can't know yet, and the reference moment
  usually isn't the open moment; a toggle pins the snapshot exactly when it becomes meaningful.
- **Cross-tab drag stays forbidden**: "move between two folders side-by-side" needs the drop tab
  to write — that's a second writer in disguise. The real answer is an in-app **dual-pane/split
  view** (own TODO item). A live viewer is for watching, not dropping.

## 5. Relay semantics for multiple desktops (for the record)

Credentials = channel ID (shared mailbox address) + passphrase (encryption key). Two desktops on
one channel **cannot corrupt each other's library sync** (7.0: self-committing letters,
deterministic merge, atomic generations — RELAY-FLOWS scenario 6b) and both receive every fetcher
letter. BUT organization never travels desktop→desktop (it rides only the one-way mobile
snapshot), so their organizations drift apart forever and the phone mirrors whichever pushed
last. Verdict: not dangerous, just incoherent — give a second real desktop (e.g. the Firefox
experiment) its **own channel** unless collecting the same fetcher data twice is the goal.

## 6. Loose ends tracked elsewhere

- **F1 consolidation** (folders → blob-only + load reorder) — TODO, unchanged by today: the
  double-store made diagnosis harder even though it wasn't the thief.
- **Mobile's IndexedDB books write**: now gated by the guest guard, but the field-shape mapping
  (`mapBackupBook` vs desktop book records) still deserves an audit — TODO.
- **`rw_folders`** (41 KB): orphan localStorage key no code reads or writes. Archaeology; inspect
  before deleting.
