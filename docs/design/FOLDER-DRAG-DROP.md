# Folder Drag & Drop - Full Implementation

## Overview

Two distinct drag operations for folders in the right pane:

| Operation | Target Zone | Visual | Action |
|-----------|-------------|--------|--------|
| **Reorder** | Edge (top/bottom 25%) | Insertion line | Change position among siblings |
| **Reparent** | Center (middle 50%) | Background highlight | Move folder INTO target |

---

## Mode/View Conceptual Model

Understanding **why** operations are allowed requires distinguishing between VIEWs and MODEs:

### Virtual Views (Read-Only)
**All Books** and **My Library** are virtual VIEWS, not containers:
- Always sorted (clicking column headers changes sort)
- Cannot enter "custom mode" — no manual reordering
- All Books: Shows all books across all folders (flat list)
- My Library: Shows organizational structure (folders only)

### User Folders (Two Modes)
User-created folders can operate in two modes:

| Mode | How to Enter | Column Header Click | Drag to Reorder | Visual Indicator |
|------|--------------|---------------------|-----------------|------------------|
| **Sorted View** | Click any column header | Changes sort direction | Disabled | ▲/▼ shown |
| **Custom Mode** | Click "Custom" or cancel sort | Reorders permanently | Enabled | No ▲/▼ |

**Mode persists** across List ↔ Cover view toggle.

### Implications for Folder Drag/Drop

| Context | Why Reorder Allowed? | Why Reparent Allowed? |
|---------|----------------------|-----------------------|
| All Books | ❌ Virtual view, no container | ❌ Can't modify virtual view |
| My Library | ❌ Virtual view of root folders | ✅ Can change folder's parent |
| User folder (sorted) | ❌ Sort defines order | ✅ Moving folder doesn't affect sort |
| User folder (custom) | ✅ User controls order | ✅ Full control |

**Key principle**: Dragging is always allowed (except Inbox/All Books). The DROP determines operation validity based on current mode.

---

## Detection Logic

For each folder element during dragOver, calculate mouse position relative to element:

```javascript
const rect = element.getBoundingClientRect();
const y = e.clientY - rect.top;
const height = rect.height;
const edgeZone = height * 0.25; // 25% top/bottom for reorder

if (y < edgeZone) {
    // Top edge → reorder BEFORE this folder
    setDragTarget({ type: 'reorder', index, position: 'before' });
} else if (y > height - edgeZone) {
    // Bottom edge → reorder AFTER this folder
    setDragTarget({ type: 'reorder', index, position: 'after' });
} else {
    // Center → reparent INTO this folder
    setDragTarget({ type: 'reparent', folderId: folder.id });
}
```

---

## Visual Feedback

### List View
| Zone | Visual |
|------|--------|
| Top edge | `borderTop: 3px solid #3b82f6` |
| Center | `backgroundColor: #dbeafe` (blue-100) |
| Bottom edge | `borderBottom: 3px solid #3b82f6` |

### Cover View
| Zone | Visual |
|------|--------|
| Top edge | `borderTop: 3px solid #3b82f6` on tile |
| Center | `ring-2 ring-blue-500 bg-blue-100` |
| Bottom edge | `borderBottom: 3px solid #3b82f6` on tile |

---

## State Variables

```javascript
// Replace single reorder target with unified drag target
const [explorerFolderDragTarget, setExplorerFolderDragTarget] = useState(null);
// Shape: null | { type: 'reorder', index, position: 'before'|'after' }
//             | { type: 'reparent', folderId }
```

---

## Where Operations Are Allowed

| Context | Draggable | Reorder | Reparent |
|---------|-----------|---------|----------|
| My Library | ✅ (except Inbox) | ❌ | ✅ |
| User folder (custom mode) | ✅ | ✅ | ✅ |
| User folder (sorted mode) | ✅ | ❌ | ✅ |
| All Books | ❌ | ❌ | ❌ |

**Key insight**: Dragging is always allowed (except Inbox/All Books). Where you DROP determines the operation.

---

## Functions Needed

### 1. `reparentFolder(folderId, newParentId)`
Move folder to become child of newParentId.

```javascript
const reparentFolder = (folderId, newParentId) => {
    // Prevent circular: can't move folder into itself or its descendants
    const isDescendant = (parentId, targetId) => {
        if (parentId === targetId) return true;
        const parent = folders.find(f => f.id === parentId);
        if (!parent?.parentId) return false;
        return isDescendant(parent.parentId, targetId);
    };

    if (folderId === newParentId || isDescendant(newParentId, folderId)) {
        showToast("Can't move folder into itself");
        return;
    }

    setFolders(prev => prev.map(folder => {
        if (folder.id === folderId) {
            return { ...folder, parentId: newParentId };
        }
        return folder;
    }));

    // TODO: Add undo support
    console.log(`📁 Moved folder ${folderId} into ${newParentId || 'root'}`);
};
```

### 2. Modified `onDragOver`
Detect zone and set appropriate target.

### 3. Modified `onDrop`
Call reorder or reparent based on target type.

---

## Implementation Phases

### Phase A: Enable folder dragging everywhere (except Inbox/All Books)
- Remove `canReorderFolders` restriction on draggability
- All folders become draggable regardless of sort mode or My Library

### Phase B: Add two-target detection
- Replace `explorerFolderReorderTarget` with `explorerFolderDragTarget`
- Add zone detection in `onDragOver`

### Phase C: Visual feedback for both targets
- Update styling to show insertion line OR highlight based on target type

### Phase D: Handle drop actions
- Create `reparentFolder` function
- In `onDrop`: check target type, call appropriate function
- Reorder only allowed in custom mode (show toast otherwise)
- Reparent always allowed

### Phase E: Left panel reordering
- Apply same logic to folder tree sidebar
- Drag between siblings = reorder
- Drag onto folder = reparent (already works via tree drop)

---

## Edge Cases

1. **Circular prevention**: Can't drop folder into its own descendant
2. **Inbox**: Never draggable (pinned)
3. **All Books**: No dragging (virtual folder)
4. **Root level**: Reparent to `null` parentId
5. **Sorted mode**: Reorder disabled, reparent allowed

---

## Files to Modify

- `readerwrangler.js`:
  - Add `explorerFolderDragTarget` state
  - Add `reparentFolder` function
  - Update folder row/tile drag handlers
  - Update left panel folder drag handlers

---

## Estimated Effort

| Phase | Effort |
|-------|--------|
| A: Enable dragging | 30 min |
| B: Two-target detection | 45 min |
| C: Visual feedback | 30 min |
| D: Drop actions | 45 min |
| E: Left panel | 30 min |
| **Total** | ~3 hours |

---

## Session Checklist (Accumulated Items)

### In Progress
- [ ] **Phase D: Add undo to reparentFolder** - Essential for testing

### Pending - Navigation
- [ ] **Breadcrumb navigation** - Show path: `My Library › Jim Butcher › Miscellaneous`
- [ ] **Auto-expand + highlight current folder in tree** - Keep tree synced with navigation
- [ ] **Drag to breadcrumb** - Move folder to ancestor by dropping on breadcrumb

### Pending - Drag/Drop
- [ ] **Phase E: Left panel folder reordering** - Drag in sidebar tree
- [ ] **Auto-expand collapsed folder on drag hover** - UX improvement

### Pending - Other
- [ ] **Backup restore: Include folders structure** - Currently only restores columns
- [ ] **Right-click "Move to..." context menu** - Alternative to drag/drop
- [ ] **Ctrl+A select all in right pane** - Select all books/folders

### Principle
> **Undo should be part of basic implementation** - Every new operation should include undo support
