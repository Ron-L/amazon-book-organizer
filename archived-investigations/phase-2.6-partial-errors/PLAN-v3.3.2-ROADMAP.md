# Release v3.3.2 Roadmap

**Created**: 2025-11-09
**Status**: In Progress
**Current Phase**: Overnight Validation

---

## 🎯 Release Goals

1. **Fix 3/2666 enrichment failures** - Partial GraphQL error handling
2. **Improve Clear Everything dialog** - True state reset capability
3. **Validate with fresh library** - Test with newly purchased books
4. **Clean up diagnostic scripts** - Archive investigation artifacts
5. **Release solid foundation** - Complete, tested, documented

---

## 📅 Tonight: Overnight Validation

### Run Full Library Fetch
- Execute: `node library-fetcher.js` (v3.3.2.b)
- Duration: ~3 hours for 2666+ book library
- Monitor: Console output for partial error statistics

### Expected Results
- All 3 problem books (Cats, Queen's Ransom, To Ruin A Queen) have descriptions
- Partial error statistics show which books had errors but got data anyway
- Total failures: 0 (all books enriched successfully)

---

## 📅 Tomorrow: Implementation & Testing

### Step 1: Verify Overnight Results ✅

**Review console output:**
- [ ] Partial error statistics section present
- [ ] All 3 known books recovered (Cats, Queen's Ransom, To Ruin A Queen)
- [ ] Check if any other books had partial errors
- [ ] Verify total failure count = 0

**Check library JSON:**
- [ ] Total book count matches (2666+)
- [ ] Metadata section present with statistics
- [ ] All 3 problem books have descriptions in file

---

### Step 2: Implement Clear Everything Dialog 🔧

**Update amazon-organizer.js → v3.3.2.a**

**Dialog Specification (Option C from TODO.md):**
```
┌─────────────────────────────────────────┐
│ Clear Everything                        │
├─────────────────────────────────────────┤
│ What would you like to clear?           │
│                                         │
│ ☑ Clear organization                   │
│   (columns, book assignments)           │
│                                         │
│ ☐ Clear library                         │
│   (stop using and unload current        │
│   library and manifest)                  │
│                                         │
│ [Cancel]            [Apply Changes]     │
└─────────────────────────────────────────┘
```

**Behavior:**
- **Both checked**: App shows "Empty (No Library Loaded)", collections cleared, ready for fresh start
- **Only organization** (default): Clears columns/assignments but keeps library loaded (current behavior, safer)

**Important Notes:**
- We're NOT deleting amazon-library.json and amazon-manifest.json from disk
- We're telling the app to stop using them in memory
- User can still reload same files or delete manually from disk

**Ground Rule Check:**
- ✅ Before editing: Check current app version in amazon-organizer.js
- ✅ Increment to v3.3.2.a (new work, add letter)
- ✅ Update version comment at top of file
- ✅ Get approval before making changes

---

### Step 3: Test Clear Everything Dialog 🧪

**Test Cases:**
1. **Default (organization only)**
   - Open dialog, leave defaults (organization checked, library unchecked)
   - Click "Clear Selected"
   - Expected: Columns cleared, library still loaded, status unchanged

2. **Full reset (both checked)**
   - Open dialog, check both boxes
   - Click "Clear Selected"
   - Expected: "Empty (No Library Loaded)" status, collections cleared, pristine state

3. **Cancel**
   - Open dialog, change selections, click "Cancel"
   - Expected: No changes, dialog closes

4. **Edge cases**
   - Both unchecked → Disable "Clear Selected" button or show warning
   - Test with library loaded vs not loaded

---

### Step 4: Fresh Fetch & Validation 🔄

**Full Reset:**
- Use new Clear Everything dialog
- Check BOTH boxes (clear organization + unload library)
- Click "Clear Selected"
- Verify app shows "Empty (No Library Loaded)"

**Fresh Library Fetch:**
- Run: `node library-fetcher.js` (v3.3.2.b)
- This includes newly purchased books since last fetch
- Expected: 0 failures, all books enriched successfully
- Duration: ~3 hours (same as overnight)

**Load Fresh Library:**
- Click "Load Library" in organizer
- Select new amazon-library.json
- Load new amazon-manifest.json (for sync status)
- Verify all books appear

---

### Step 5: End-to-End Verification ✅

**Data Validation:**
- [ ] All 3 problem books have descriptions (view in book dialog)
- [ ] New books appear in organizer (compare count to library JSON)
- [ ] Book count matches metadata.totalBooks
- [ ] Sync status works (Fresh/Stale detection)

**Dialog Validation:**
- [ ] Clear Everything dialog works as expected
- [ ] Organization-only clear preserves library
- [ ] Full clear returns to pristine state
- [ ] Can reload same library after full clear

**State Management:**
- [ ] Collections filter cleared with organization reset
- [ ] Library/manifest properly unloaded with full clear
- [ ] App state consistent across clear operations

---

### Step 6: Release Preparation 📝

**Version Updates:**
- [ ] library-fetcher.js: v3.3.2.b → v3.3.2 (remove letter)
- [ ] amazon-organizer.js: v3.3.2.a → v3.3.2 (remove letter)
- [ ] README.md: Update project version if needed
- [ ] Verify version consistency across all files

**Documentation:**
- [ ] Update CHANGELOG.md with v3.3.2 entry:
  - Partial error handling for fetcher
  - Enhanced error logging
  - Clear Everything dialog improvements
  - Statistics tracking
- [ ] Update README.md if Clear Everything behavior changed
- [ ] Review TODO.md and mark completed items

**Git Workflow (Ground Rules):**
- [ ] Run `git fetch` before committing (Rule #3)
- [ ] Get approval before commit (Rule #2)
- [ ] Create commit with proper message format
- [ ] Tag release: `git tag v3.3.2`
- [ ] Get approval before push (Rule #2)
- [ ] Push with tags: `git push origin main --tags`

---

### Step 7: Post-Release Review 🎓

**Required per Ground Rules:**
- Conduct brief post-mortem with user
- Review: What mistakes were made?
- Review: What lessons learned?
- Review: What worked well?
- Update ground rules if patterns emerge
- Document lessons in CHANGELOG.md release notes

**Key Topics:**
- GraphQL partial error discovery process
- "Investigate raw response first" lesson
- Foundation-first decision (3/2666 failures justified investigation)
- Clear Everything dialog solving validation workflow

---

## 📦 Post-Release: Cleanup Phase

### Archive Diagnostic Scripts

**Move to recovery-scripts/ directory:**
- All `diag-*.js` files (13 scripts)
- All `antidote-test-*.js` files (7 scripts)
- All `check-*.js`, `analyze-*.js`, `diff-*.js`, `verify-*.js` files
- All `output-*.txt` instruction files
- Test result files (`test-*-console-results.txt`, `test-*-final-results.json`)

**Keep in root:**
- `library-fetcher.js`
- `amazon-organizer.js`
- `amazon-organizer.html`
- `collections-fetcher.js`

### Restructure NOTES.md

**Extract investigation to archive:**
- Create `NOTES-PHASE-2.6-INVESTIGATION.md`
- Move "Phase 2 Enrichment Failures Investigation" section
- Keep only active work and tabled items in NOTES.md
- Update references to point to archived file

**Benefits:**
- NOTES.md becomes manageable again
- Investigation details preserved for future reference
- Easier to find current work status

### Update Documentation

**Final verification:**
- [ ] CHANGELOG.md has complete v3.3.2 entry
- [ ] README.md file versions are current
- [ ] TODO.md reflects completed work
- [ ] CONTRIBUTING.md still accurate (no updates needed)
- [ ] NOTES.md restructured and current

---

## 🎯 Next Features (Post-Cleanup)

### Phase 2: Critical Features

**Collections filter bug**
- Issue: Collections dropdown still shows old collection names after Clear Everything
- Fix: Clear collections state as part of organization reset

**First-run Welcome dialog**
- Show welcome dialog on first run (or after Clear Everything)
- Explains what Amazon Book Organizer is
- Points to help icon ("?") for detailed usage
- Dismisses permanently until next clear

### Phase 3: GitHub Pages Deployment

**Goal**: Make Amazon Book Organizer easy for others to use
- Host organizer app on GitHub Pages (free, HTTPS, auto-deploy)
- Provide bookmarklet that loads fetcher scripts from GitHub Pages
- Users: One-click bookmark → fetch → organize
- Zero installation, always latest version, data stays local
- See [DISTRIBUTION.md](DISTRIBUTION.md) for complete guide

### Phase 4: UI Polish

**Tooltips for control buttons**
- Add helpful tooltips for Backup, Restore, Reset, Clear Everything
- Explains what each does

**Button colors**
- Improve visual hierarchy and clarity

### Phase 5: Feature Enhancements

**Column name filtering**
- Extend search to filter by column names (anticipating 100s of columns)
- Try simple case first: search filters title, author, AND column name
- Fallback: Prefix syntax or smart filtering

**Add title & author text under book covers**
- Improves readability, reduces need to hover
- Estimated ~5-8K tokens

**Multi-select with Ctrl/Shift clicking**
- Bulk operations on multiple books
- Estimated ~15-25K tokens

### Phase 6: Optional/Future

**Reading Progress tracking**
- Priority: Medium-Low, Difficulty: High
- Implementation guidance: [Amazon Organizer Reading Progress conversation](https://claude.ai/chat/6e6f23c8-b84e-4900-8c64-fecb6a6e0bd1)

**Explore read.amazon.com/kindle-library**
- Collections info & reading progress

**Live reflow drag-and-drop animation** (~12-18K tokens)

**2D matrix layout** (~50-80K tokens) - major refactor

**Groups/series containers** (~35-55K tokens)

---

## 📋 Release Checklist Summary

### Tonight
- [x] Run overnight fetch with library-fetcher.js v3.3.2.b

### Tomorrow
- [ ] Verify overnight results (Step 1)
- [ ] Implement Clear Everything dialog (Step 2)
- [ ] Test dialog functionality (Step 3)
- [ ] Fresh fetch & load (Step 4)
- [ ] End-to-end verification (Step 5)
- [ ] Release preparation (Step 6)
- [ ] Post-release review (Step 7)

### Post-Release
- [ ] Archive diagnostic scripts
- [ ] Restructure NOTES.md
- [ ] Update documentation
- [ ] Move to next features

---

## 🎓 Key Principles (Ground Rules)

**This release follows "Build Solid Foundation" approach:**
- Spent days investigating 3/2666 failures (0.15%)
- Library management requires 100% data coverage
- Foundation compounds - solid patterns prevent future issues
- See [CONTRIBUTING.md](CONTRIBUTING.md) "Ship Fast vs. Build Solid" framework

**Version Management (Rule #1):**
- Version BEFORE any code changes
- Exception: Documentation files (no version increment)
- Pattern: v3.3.2.a → v3.3.2.b → v3.3.2 (release)

**Approval Workflow (Rule #2):**
- STOP and ASK before any changes, commits, git operations
- Wait for explicit "yes", "go ahead", "proceed"
- When in doubt, do ONE operation and STOP

**Update Before Commit (Rule #3):**
- Always run `git fetch` before committing
- Check for conflicts and resolve before pushing

---

## 📞 Questions?

- See [TODO.md](TODO.md) for complete task breakdown
- See [NOTES.md](NOTES.md) for investigation details
- See [CHANGELOG.md](CHANGELOG.md) for version history
- See [CONTRIBUTING.md](CONTRIBUTING.md) for development workflow
- See [SKILL-Development-Ground-Rules.md](SKILL-Development-Ground-Rules.md) for detailed protocols
