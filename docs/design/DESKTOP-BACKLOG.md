# Desktop Backlog

Items requiring changes to `readerwrangler.js` (desktop app). Collected during mobile development.

---

## 1. Tag Virtual Folders (Tag Views)

**Design doc**: `docs/design/TAG-VIRTUAL-FOLDERS.md`

Desktop is the control plane for tag views. All configuration, drag interactions, and un-tagging happen here.

### Implementation Checklist

- [x] **1A. Data model** — Add `pinnedTagFolders: [{tagId, position}]` to settings state, persist to localStorage, include in backup export/import *(v5.5.15-alpha.8, ef8c6d7)*
- [x] **1B. Tag icon** — Inline SVG components: `TagIconSVG` (eyelet tag shape) + `FolderIconSVG` (folder shape for unpinned state)
- [x] **1C. "Pin as view" UI** — Pin toggle in Tag Manager modal + modal UX redesign: SVG icons, compact rows, full-bleed headers, orphan checkboxes *(v5.5.15-alpha.20, d62ce2b)*
- [x] **1D. Left pane rendering** — Render pinned tag views among real folders using position, with tag icon and distinct styling + browser back/forward support + auto-scroll left pane *(v5.5.15-alpha.23, 12e1f6c)*
- [x] **1E. Left pane drag reorder** — Unified interleaved display with folders (Option B), float position system, drag reorder + context menu (Open, Rename, Unpin, Delete Tag, Properties) *(v5.5.15-alpha.27, d9b59b4)*
- [x] **1F. Right pane content** — Tag view book filtering + breadcrumb already working since alpha.21; background tint deferred to 1K
- [x] **1G. Drag: real folder → tag view** — Drop adds tag to book, toast "Tagged as [name]". `bookOrder` added to data model. Undo/redo support. *(v5.5.15-alpha.34, 305b83f)*
- [x] **1G.2 Manual reorder within tag view** — Drag books within tag view to reorder. Persisted in `bookOrder` array on each pinned tag entry. *(v5.5.15-alpha.32, c4abed3)*
- [x] **1H. Drag: tag view → tag view** — Move (remove source tag, add dest tag) / Ctrl+drag = copy (keep source, add dest). Undo/redo support. *(v5.5.15-alpha.34, 305b83f)*
- [x] **1I. Drag: tag view → real folder** — DISALLOWED (no-drop cursor, toast on drop). *(v5.5.15-alpha.35, 59c43ac)*
- [x] **1J. Remove from tag view** — Right-click "Remove from [tag name]" + Delete key. Undo support. *(v5.5.15-alpha.36, 5af26e0)*
- [ ] **1K. CSS variables** — Background tint for tag view content area (light + dark + HC-dark themes)
- [ ] **1L. Mobile read-only support** — Import `pinnedTagFolders` from backup, render in drawer + dashboard shelves (Phase 8B, mobile.js)

---

## ~~2. Desktop Mode Escape Hatch~~ DONE

Implemented via emergency reset fallback in `readerwrangler.html` (v5.5.11). 15-second timeout detects failed mount and offers reset UI. PWA users who can't reach `reset.html` are covered.
