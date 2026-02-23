# Tag Virtual Folders — Design Document

## Status: APPROVED for implementation (Option 4, desktop-configured, mobile read-only)

## Concept

Any tag can be "promoted" to a **virtual folder** (aka "tag view"). It appears alongside real folders in navigation — left pane on desktop, drawer + dashboard shelves on mobile. Shows all books with that tag regardless of which real folder they're in.

**Key insight**: Folders answer "where did I put this?" Tag views answer "what did I mark this as?" Both are valid browsing strategies.

**Fundamental distinction**: Tag views are **views**, not **containers**. A book in a tag view isn't "in" it — it's *visible through* it because of a tag. This distinction drives all interaction design decisions below.

---

## Use Cases

1. **Next Reads** — Tag books "Next" on desktop across genres. Tag view shows them all in one browsable view on both platforms.
2. **Book Club** — Tag this month's book club picks. Tag view = quick reference.
3. **Vacation TBR** — Curated vacation reading list as its own shelf.
4. **Lending** — Books you've lent out, quick reference shelf.
5. **Series in Progress** — Books in series you're actively reading.
6. **Saved filter shortcut** — Power-user workflow: Apply complex filters on desktop (e.g., "unread + >$10 + last 90 days"), tag the result set (e.g., "Expensive Unread"), tag view makes it persistent and browsable on both platforms. The tag becomes a saved view of any filter combination.

---

## Configuration

- **Desktop only** — Promote/demote tags via tag management UI (checkbox or right-click "Pin as view")
- **Mobile**: Read-only. Tag views appear automatically based on desktop configuration carried in backup.
- **Storage**: `pinnedTagFolders: [{ tagId, position }]` in settings. Persists in backup, imports to mobile.
- **Ordering on desktop**: Drag tag views among real folders in left pane. Position persisted.
- **No mobile configuration or reordering** — consistent with mobile = reference, desktop = organize principle.

---

## Visual Distinction

Tag views must be visually distinguishable from real folders **at all times, at all scales**.

### Left Pane (Desktop)
- **Tag icon** instead of folder icon (a price-tag / luggage-tag shape with eyelet hole). Distinct from 📁 at any size.
- Different icon color from folder icons (e.g., a muted accent color vs. folder's amber/yellow).
- No background color change in left pane (alternating stripes at varying heights would be ugly).

### Right Pane / Content Area (Desktop)
- **Subtle background tint** when viewing a tag view vs. a real folder. Not dramatically different — just enough that you notice the shift when switching between them.
- Light theme: e.g., very faint blue-gray tint vs. the standard white/neutral.
- Dark theme: e.g., very faint blue-dark tint vs. the standard dark surface.
- This signals "you're in a view, not a folder" without being jarring.

### Mobile Dashboard
- **Same subtle background tint** as desktop right pane, applied to tag view shelves on dashboard.
- **Tag icon** next to shelf title (instead of grid icon used for real folders).

### Mobile Drawer
- **Tag icon** next to tag view entries (instead of folder icon for real folders).

---

## Drag & Drop Rules (Desktop)

### UX Principles Applied
- **Least surprise**: Actions produce the result the user expects
- **Consistency**: Same gesture = same behavior when context is the same
- **Affordance**: Tag views don't accept drops that would be ambiguous

### Complete Rules

| Source | Destination | Drag | Ctrl+Drag |
|--------|-------------|------|-----------|
| **Real folder → Real folder** | Move book | Copy book | *(existing behavior, unchanged)* |
| **Real folder → Tag view** | Add tag to book. Book stays in real folder. | Same (add tag) | Tag views always "add tag" — no copy concept |
| **Tag view → Real folder** | **DISALLOWED** | **DISALLOWED** | Ambiguous semantics — see rationale below |
| **Tag view → Tag view** | Remove source tag, add dest tag (move between views) | Keep source tag, add dest tag (appear in both) | |
| **Tag view → All Books** | **DISALLOWED** | **DISALLOWED** | Only one valid destination is weird/non-discoverable |
| **Real folder → All Books** | *(existing behavior)* | *(existing behavior)* | |

### Rationale: Disallow Drag FROM Tag View TO Real Folder

Tag views are views, not containers. Dragging from a view to a folder raises unanswerable questions:
- If book already exists in destination folder → should it make another copy? (unexpected)
- If book doesn't exist in destination → should it make a copy? (then whether a copy is created depends on hidden state)
- Should it also remove the tag? (inconsistent with "move" semantics elsewhere)

Every option leads to confusion. **Disallowing the gesture entirely** avoids all ambiguity.

### Removing a Tag (Un-tagging a Book)

Since drag-out-of-tag-view is disallowed, tag removal uses an **explicit remove control**:
- **Delete/remove button on book cover** within tag view (small X or trash icon overlay)
- Removes the tag from the book. Book disappears from the tag view. Book remains in its real folder(s).
- Analogous to "remove from playlist" in Spotify/Apple Music — familiar pattern.
- Also available via right-click context menu: "Remove from [tag name]"

---

## Book Count Semantics

- **Real folder count**: Books assigned to that folder (existing behavior).
- **Tag view count**: Books with that tag (cross-folder). These are NOT added to "All Books" total — books are counted once in their real folder, not again for each tag view they appear in.
- **No subfolders** within tag views. Tag views are flat lists, sorted by the active sort order.
- **No manual ordering** within tag views. Follows the current sort (Date Added, Title, Author, Rating).

---

## Implementation Scope

### Desktop (readerwrangler.js) — Future work
1. Settings/tag management UI: checkbox "Pin as view" per tag
2. Left pane: render tag views with tag icon, draggable for positioning among real folders
3. Right pane: render tag view contents (all books with that tag), subtle background tint
4. Drag-to-tag-view: add tag on drop, toast notification
5. Remove-from-tag-view: X button on cover, context menu option
6. Drag between tag views: move/copy tag semantics
7. Export: include `pinnedTagFolders` in backup settings
8. Visual: tag icon SVG, background tint CSS variables for light/dark themes

### Mobile (mobile.js) — Phase 6C
1. Read `pinnedTagFolders` from imported backup settings
2. Render tag views in drawer (with tag icon, positioned per desktop ordering)
3. Render tag views as dashboard shelves (with tag icon, subtle background tint)
4. FolderView handles tag view IDs (filter books by tag, similar to `__recent__` virtual folder)
5. Navigate into tag view → grid of books with that tag
6. Tag icon SVG component
7. No configuration, no reordering, no remove — read-only display

---

## Open Questions

1. ~~What icon for tag views?~~ **Decided**: Tag/label icon with eyelet hole — distinct from folder at all sizes.
2. Exact background tint colors for light and dark themes — decide during implementation.
3. Desktop tag management UI placement — checkbox in existing tag editor? New "Pin" action? Decide during desktop implementation.
4. Item user has been carrying in head but can't recall — desktop change needed to support a mobile change. Placeholder until recalled.
