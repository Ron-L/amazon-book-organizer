# Dual-Pane Split View

## Overview

Design options for viewing and organizing books across two folders simultaneously.

**Status:** Design Discussion - P7-T5 (Post-Launch Enhancement)

---

## Problem Statement

With drag-to-folder-tree, books land at the top of the destination folder. For precise positioning (e.g., inserting a book at position 5), the user must:
1. Drag book to folder tree (lands at top)
2. Navigate to destination folder
3. Drag book to final position

This is the "10% case" - most organizing works fine with drag-to-tree, but power users organizing large libraries benefit from seeing source and destination simultaneously.

---

## Solution Options

### Option A: Built-in Split Pane

Add a second content pane within the same React app.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  [Filter Bar]                                      [Search: ________] [?]   │
├──────────────────┬─────────────────────────────┬────────────────────────────┤
│ 📁 All Books     │  Folder A (Left Pane)       │  Folder B (Right Pane)     │
│ 📁 Inbox         │─────────────────────────────│────────────────────────────│
│ ▼ 📁 Sci-Fi      │  📖 Book 1                  │  📖 Book X                 │
│   ▼ 📁 Sanderson │  📖 Book 2  ←── drag ──────→│  📖 Book Y                 │
│     📁 Mistborn  │  📖 Book 3                  │  📖 Book Z                 │
└──────────────────┴─────────────────────────────┴────────────────────────────┘
```

**Implementation:**
- UI toggle button to enable/disable split mode
- Each pane tracks its own `selectedFolderId`
- Drag-and-drop works natively (same DOM, same React state)
- State is automatically synchronized (single source of truth)

**Complexity:** 8-12 hours

| Component | Effort |
|-----------|--------|
| UI: Split toggle, pane layout | 2-3 hours |
| State: Track folder per pane, active pane | 2-3 hours |
| Drag-and-drop: Already works (same DOM) | 0 hours |
| Layout: Responsive handling | 2 hours |
| Edge cases & testing | 2-4 hours |

**Pros:**
- Native drag-and-drop to precise position
- Single cohesive app experience
- No sync lag (same React state)
- Full control over UX

**Cons:**
- More implementation effort
- Fixed layout within browser window
- New UI to learn

---

### Option B: BroadcastChannel Sync (Two Browser Tabs)

Use browser's BroadcastChannel API to keep two tabs synchronized.

**Implementation:**
```javascript
// On state save
const bc = new BroadcastChannel('readerwrangler-sync');
bc.postMessage({ type: 'STATE_CHANGED' });

// On message receive
bc.onmessage = (event) => {
  if (event.data.type === 'STATE_CHANGED') {
    reloadStateFromStorage();
  }
};
```

**Complexity:** 4-6 hours

| Component | Effort |
|-----------|--------|
| BroadcastChannel setup | 1 hour |
| Broadcast on state change | 1 hour |
| Handle incoming messages | 1-2 hours |
| Testing | 1-2 hours |

**Pros:**
- Simpler implementation
- Leverages browser's native window management
- Each tab can have independent filters, view mode
- Works across monitors

**Cons:**
- **Drag-and-drop does NOT work across browser tabs** (browser limitation)
- Requires copy/paste workflow for cross-folder operations
- Sync lag (save → broadcast → receive → reload)
- Two separate instances to manage

---

## Comparison

| Capability | A: Built-in Split | B: BroadcastChannel |
|------------|-------------------|---------------------|
| Drag to precise position across folders | ✅ Yes | ❌ No (copy/paste only) |
| See two folders simultaneously | ✅ Yes | ✅ Yes |
| Copy/paste across folders | ✅ Yes | ✅ Yes |
| Independent window management | ❌ No | ✅ Yes (separate windows) |
| Sync latency | None | ~100ms |
| Implementation effort | 8-12 hours | 4-6 hours |

---

## Workflow Comparison

**Scenario:** Move book from Folder A to position 5 in Folder B

### Option A (Built-in Split Pane)
1. Enable split view
2. Left pane: Folder A, Right pane: Folder B
3. Drag book from left, drop at position 5 in right
4. Done (1 drag operation)

### Option B (Two Tabs with Sync)
1. Open two browser tabs
2. Tab 1: View Folder A
3. Tab 2: View Folder B, navigate to position 5
4. Tab 1: Copy book (Ctrl+C)
5. Tab 2: Paste (Ctrl+V) - pastes at selection point
6. Done (copy + paste + navigation)

---

## Recommendation

**If precise drag-to-position is important:** Option A (Built-in Split Pane)
- Worth the extra implementation effort
- Superior UX for power users

**If copy/paste is acceptable:** Option B (BroadcastChannel)
- Cheaper to implement
- Good stepping stone
- Could implement B first, A later

**Hybrid approach:**
- Implement B now (4-6 hours) as immediate improvement
- Implement A later as V2 feature (8-12 hours)

---

## Decision

**Pending** - User considering options.

---

## Related Documents

- [BOOK-EXPLORER.md](BOOK-EXPLORER.md) - Parent feature (Dual-Pane Split listed in Alternatives)
- [COLUMN-ARRANGER.md](COLUMN-ARRANGER.md) - Previous split-pane design (superseded)
