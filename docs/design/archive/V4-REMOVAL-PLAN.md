# v4 Column App Removal Plan

**Created:** 2026-02-05
**Version:** v5.1.0
**Status:** In Progress

---

## Context

v4 Column App is deprecated as of v5.0.0 release. v5 Book Explorer (File Explorer paradigm) is objectively superior and solves all v4 scalability/UX issues. User is sole user pre-launch, making this the optimal time to remove v4 code entirely.

**Preservation:** v4 code preserved at https://readerwrangler.com/v4/readerwrangler.html as historical reference.

---

## Objectives

1. Remove all v4 Column App code from main app
2. Remove migration prompt and detection logic
3. Ensure app always starts in v5 Explorer mode
4. Update documentation to reflect v5-only status
5. Archive removed code for reference

---

## Step-by-Step Plan

### ✅ Step 0: Create Plan Document
- [x] Create V4-REMOVAL-PLAN.md in docs/design/
- [x] Review with user

### ✅ Step 1: Audit v4 Code Locations - COMPLETE

**Goal:** Identify all v4-related code before removal

**Tasks:**
- [x] Search for "columnMode" state variable (not found - uses "viewMode")
- [x] Search for "explorerMode" checks (not found - uses viewMode === 'explorer')
- [x] Find migration prompt code (v4 data detection) - lines 1317-1342, 7849-7888
- [x] Locate v4 rendering functions (columns, dividers) - lines 8934-9401
- [x] Find v4 drag-and-drop handlers - throughout v4 rendering block
- [x] Identify v4 localStorage keys - "readerwrangler-state"
- [x] Document findings in audit report section below

**Questions Answered:**
1. **How does app decide v4 vs v5 on load?** Line 232: `viewMode` defaults to 'columns'
2. **Where is migration prompt triggered?** Lines 1317-1342: useEffect detects columns with content but empty folders
3. **What localStorage keys distinguish v4 from v5?** Same key stores both: `state.organization.columns` (v4) and `state.organization.folders` (v5)

**Deliverable:** ✅ Audit report complete (see below)

---

### ✅ Step 2: Remove Migration Prompt - COMPLETE

**Goal:** Stop prompting for v4→v5 migration

**Tasks:**
- [x] Remove migration detection logic (lines 1229-1254)
- [x] Remove migration confirmation dialog (lines 7736-7775)
- [x] Remove one-time migration code (lines 828-916)
- [x] Remove showMigrationDialog state variable (line 258)
- [x] Change viewMode default to 'explorer' (line 232)
- [x] Test: Fresh load doesn't show migration prompt

**Decision:** Option A selected - Ignore v4 data silently (v4 subdirectory remains accessible at readerwrangler.com/v4/)

---

### Step 3: Archive v4 Code

**Goal:** Preserve removed code for reference

**Tasks:**
- [ ] Create `archive/v4/` directory
- [ ] Extract migration code → `archive/v4/migration-code.js`
- [ ] Extract v4 app code → `archive/v4/column-app-code.js`
- [ ] Add README in archive explaining contents

---

### Step 4: Remove v4 Code from readerwrangler.js

**Goal:** Delete all v4 Column App implementation

**Tasks:**
- [ ] Remove column rendering functions
- [ ] Remove divider logic
- [ ] Remove v4 drag-and-drop handlers
- [ ] Remove v4 storage/load functions
- [ ] Remove mode toggle UI
- [ ] Remove conditional logic: `if (mode === 'column')`
- [ ] Remove v4 localStorage save/load

**Test After Removal:**
- [ ] App starts without errors
- [ ] No console warnings about missing functions
- [ ] grep for "column" references (should be zero in app logic)

---

### Step 5: Simplify App Initialization

**Goal:** Always initialize in v5 Explorer mode

**Tasks:**
- [ ] Remove mode detection on load
- [ ] Remove "Choose Mode" UI (if exists)
- [ ] Set default mode to Explorer (hardcode)
- [ ] Remove unused localStorage keys

---

### Step 6: Update Documentation

**Goal:** Remove v4 references from all docs

**Files to Update:**
- [ ] CHANGELOG.md - Add v5.1.0 entry: "Removed deprecated v4 Column App"
- [ ] TODO.md - Remove "Remove Column App" from Priority 0
- [ ] USER-GUIDE.md - Remove v4 references (if any)
- [ ] README.md - Update with v5-only messaging (if needed)

---

### Step 7: Testing

**Goal:** Verify app works correctly after v4 removal

**Test Cases:**
- [ ] Fresh install (no localStorage) → v5 Explorer mode loads
- [ ] Existing v5 data → loads correctly
- [ ] Existing v4 data (if present) → graceful handling
- [ ] No migration prompts appear
- [ ] No console errors
- [ ] All v5 features work (folders, drag-drop, filters, menu bar, toolbar)
- [ ] Backup/Restore still works
- [ ] Import/Export still works

---

### Step 8: Version & Commit

**Version:** `5.1.0` (minor bump - removed deprecated feature)

**Commit Message:**
```
v5.1.0 - Remove deprecated v4 Column App code

Remove v4 Column App implementation and migration logic:
- Deleted column rendering, dividers, v4 drag-drop handlers
- Removed migration prompt and detection logic
- App now always starts in v5 Explorer mode
- Archived v4 code in archive/v4/ for historical reference

v4 still accessible at https://readerwrangler.com/v4/ for reference

Breaking change: v4 Column mode no longer available in main app

Files changed: readerwrangler.js, CHANGELOG.md, TODO.md

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>
```

**Git Workflow:**
- [ ] Create feature branch: `git checkout -b feature/remove-v4-column-app`
- [ ] Commit with message above
- [ ] Test locally
- [ ] Merge to main
- [ ] Push to prod

---

### Step 9: Final Verification

**Goal:** Confirm v4 removal is complete

**Checks:**
- [ ] grep -rn "columnMode" readerwrangler.js → zero results
- [ ] grep -rn "v4" readerwrangler.js → zero results (except comments)
- [ ] App loads on production server → v5 Explorer mode
- [ ] No migration prompts on production
- [ ] v4 subdirectory still accessible

---

## Audit Report

**Status:** ✅ Complete (2026-02-05)

### v4 Code Locations

#### 1. State Variables (readerwrangler.js)
- **Line 113:** `const [columns, setColumns] = useState([{ id: 'unorganized', name: 'Unorganized', books: [] }]);`
  - v4 Column App data structure
  - Still being loaded and saved
- **Line 232:** `const [viewMode, setViewMode] = useState('columns'); // 'columns' | 'explorer'`
  - **ROOT CAUSE:** Defaults to 'columns' → loads v4 on startup
  - Controls conditional rendering (lines 8934 & 9403)
- **Line 258:** `const [showMigrationDialog, setShowMigrationDialog] = useState(false);`
  - Migration prompt state

#### 2. Migration Logic
- **Lines 828-916:** `migrateColumnsToFolders()` function
  - Converts columns → folders, dividers → subfolders
  - Called when user clicks "Import to Explorer" button
- **Lines 1317-1342:** Auto-detect migration opportunity (useEffect)
  - Triggers when columns have content but folders are empty
  - Sets `showMigrationDialog` to true
  - **This is what causes production migration prompt**
- **Lines 7849-7888:** Migration dialog JSX
  - Modal UI with "Not Now" / "Import to Explorer" buttons
  - Shows column count and migration details

#### 3. Data Load/Save
- **Lines 1270-1301:** Load columns from localStorage
  - Key: `STORAGE_KEY` = "readerwrangler-state" (defined in uiHelpers.js:6)
  - Restores `columns` array from `state.organization.columns`
  - Also loads folders (v5) from same object
- **Lines 1357-1380:** Save organization (auto-save useEffect)
  - Saves both columns (v4) AND folders (v5) to same localStorage object
  - Triggers on any change to columns or folders

#### 4. Conditional Rendering
- **Line 8934:** `{viewMode === 'columns' && (`
  - Renders entire v4 Column App UI (lines 8934-9401)
  - Horizontal scrolling column layout
- **Line 9403:** `{viewMode === 'explorer' && (`
  - Renders v5 Book Explorer UI (lines 9403+)
  - File Explorer paradigm with folder tree

#### 5. Undo/Redo Actions (v4 Column Operations)
- **Lines 3651, 3678:** Create DELETE_COLUMN action
- **Lines 4233-4268:** Undo DELETE_COLUMN (restore deleted column)
- **Lines 4638-4657:** Redo DELETE_COLUMN
- **Line 5731:** Create REORDER_COLUMNS action
- **Lines 4259-4268:** Undo REORDER_COLUMNS
- **Lines 4657-4666:** Redo REORDER_COLUMNS
- **Note:** These actions reference v4 columns, NOT v5 list view columns

#### 6. Helper Functions
- **Line 883:** `getBookIdFromEntry(entry)` - extracts bookId from column entry (handles legacy format)
- **Referenced but not defined in main file:** likely in archived v4 code

#### 7. localStorage Keys
- **Primary Key:** `readerwrangler-state` (STORAGE_KEY, uiHelpers.js:6)
  - Stores: `{ organization: { columns, folders, dataSource, blankImageBooks, hiddenInstances, tagRegistry }, lastSyncTime, savedAt }`
- **Secondary Key:** `readerwrangler-explorer` (EXPLORER_KEY, uiHelpers.js:11)
  - Stores: v5 Explorer view settings (separate from columns)

### Key Findings

**Critical Issue:** Line 232 defaults `viewMode` to 'columns', causing v4 to load first on production.

**Migration Flow:**
1. User visits app → `viewMode` defaults to 'columns' (line 232)
2. Data loads → columns populated from localStorage (lines 1270-1301)
3. Migration detector runs (lines 1317-1342)
4. If columns have content + folders empty → show migration dialog
5. User sees v4 Column App with migration prompt

**To Remove:**
1. Change `viewMode` default to 'explorer' (line 232)
2. Remove migration detection (lines 1317-1342)
3. Remove migration function (lines 828-916)
4. Remove migration dialog JSX (lines 7849-7888)
5. Remove v4 conditional rendering block (lines 8934-9401)
6. Remove columns load/save logic (lines 1273-1279, 1361-1365)
7. Remove v4 undo actions (DELETE_COLUMN, REORDER_COLUMNS)
8. Remove columns state variable (line 113)
9. Remove viewMode state variable (line 232) - or hardcode to 'explorer'

**Data Preservation:**
- Columns data currently saved in localStorage alongside folders
- After removal, columns key can remain (ignored) or be deleted during reset

### Estimated Scope

**Code to Remove:** ~3,000-4,000 lines (estimated)
- v4 rendering: ~470 lines (8934-9401)
- Migration: ~150 lines (828-916, 1317-1342, 7849-7888)
- Undo actions: ~200 lines
- Helper functions: ~100 lines
- v4 column operations throughout: ~2,000-3,000 lines (drag-drop, menus, etc.)

**Code to Archive:** Same ~3,000-4,000 lines → `archive/v4/`

**Complexity:** MEDIUM-HIGH
- v4 code is interleaved with v5 code (same file)
- Undo/redo system references v4 actions
- localStorage contains both v4 and v5 data
- Need careful testing after removal

---

## Risk Assessment

**Low Risk:**
- You're the only user
- v5 is live and working
- v4 subdirectory provides escape hatch

**Potential Issues:**
- If v4 data structure differs significantly, may need graceful degradation
- Migration code removal might leave orphaned v4 data in IndexedDB

**Mitigation:**
- Test with fresh IndexedDB instance
- Test with existing v4 data (if backup available)
- Console warning if v4 data detected: "v4 Column App deprecated. Visit https://readerwrangler.com/v4/ to access legacy data."

---

## Progress Checklist

**Current Step:** Step 2 ✅ Complete
**Next Step:** Step 3 (Archive v4 Code)

- [x] Step 0: Create plan document
- [x] Step 1: Audit v4 code locations ✅ COMPLETE
- [x] Step 2: Remove migration prompt ✅ COMPLETE
- [ ] Step 3: Archive v4 code
- [ ] Step 4: Remove v4 code from readerwrangler.js
- [ ] Step 5: Simplify app initialization
- [ ] Step 6: Update documentation
- [ ] Step 7: Testing
- [ ] Step 8: Version & commit
- [ ] Step 9: Final verification

**Total Steps:** 10 (including Step 0)
**Completed:** 3
**Remaining:** 7

---

## Notes

_Use this section to track decisions, issues, or observations during implementation_

**2026-02-05 14:00:** Plan created. User confirmed v4 has zero value going forward. Discovery: Production server defaults to v4 and shows migration prompt - this is critical to fix.

**2026-02-05 16:15:** Step 1 audit complete. Root cause identified: Line 232 defaults `viewMode` to 'columns'. Found ~3,000-4,000 lines of v4 code to remove. v4 code is interleaved with v5 in same file (readerwrangler.js). Both v4 and v5 data structures stored in same localStorage object. Complexity: MEDIUM-HIGH due to interleaving and undo/redo dependencies.

**2026-02-05 16:35:** Step 2 complete. Removed all migration code: changed viewMode default to 'explorer' (line 232), removed showMigrationDialog state (line 258), removed migrateColumnsToFolders function (89 lines), removed migration detection useEffect (26 lines), removed migration dialog JSX (40 lines). Total: ~155 lines removed. App now defaults to Explorer mode, no migration prompt will appear.

---

## Related Documents

- [BOOK-EXPLORER.md](BOOK-EXPLORER.md) - v5 File Explorer design
- [CHANGELOG.md](../../CHANGELOG.md) - Version history
- [TODO.md](../../TODO.md) - Roadmap
- [v5.0.0 Post-Mortem](../../post-mortems/v5.0.0-2026-02-05.md) - v5 release retrospective
