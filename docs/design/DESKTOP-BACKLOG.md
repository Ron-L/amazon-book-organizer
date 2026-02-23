# Desktop Backlog

Items requiring changes to `readerwrangler.js` (desktop app). Collected during mobile development.

---

## 1. Tag Virtual Folders (Tag Views)

**Design doc**: `docs/design/TAG-VIRTUAL-FOLDERS.md`

Desktop is the control plane for tag views. All configuration, drag interactions, and un-tagging happen here.

### Tasks
1. Tag management UI: "Pin as view" checkbox or right-click action per tag
2. Left pane: render tag views with tag icon (not folder icon), draggable for positioning
3. Right pane: render tag view contents (all books with tag), subtle background tint
4. Drag from real folder → tag view: add tag on drop, toast "Tagged as [name]"
5. Drag from tag view → tag view: move (remove source tag, add dest tag) / Ctrl+drag = copy (add dest tag, keep source tag)
6. Drag from tag view → real folder: DISALLOWED (views are not containers)
7. Remove-from-tag-view: X button on cover overlay + right-click "Remove from [tag name]"
8. Export: include `pinnedTagFolders` in backup settings
9. Tag icon SVG, background tint CSS variables for light/dark themes

---

## 2. Desktop Mode Escape Hatch

When desktop app detects mobile viewport + `desktopMode` localStorage flag, show a "Return to Mobile" button in upper-left corner. Lets users who accidentally toggled desktop mode get back.

---

## ~~3. Unknown Item~~ RESOLVED

Was the Desktop Mode escape hatch — same as item #2 above. No additional desktop change needed.

---

## 4. Directional Shadow Consistency

Consider matching the directional shadow style used on mobile cover view for desktop cover view. Cross-platform visual consistency.
