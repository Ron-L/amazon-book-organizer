# Session Notes

⚠️ **START HERE - Session Startup Checklist** ⚠️

Before doing ANYTHING in this session, confirm:
- [ ] Skills are enabled: software-development-ground-rules & amazon-book-organizer-project
- [ ] You have READ the Core Rules in SKILL-Development-Ground-Rules.md (lines 8-29)
- [ ] You understand: Version BEFORE code changes, Approval BEFORE actions
- [ ] When user says "yes"/"go ahead"/"proceed" = approval. Discussion ≠ approval.

If you haven't done the above, STOP and read those SKILL files NOW.

---

⚠️ **RELEASE WORKFLOW - Follow this checklist when finalizing ANY version** ⚠️

Before running `git tag`:
- [ ] CHANGELOG.md updated with version entry and technical notes
- [ ] NOTES.md Current Work in Progress updated (change to RELEASED ✅)
- [ ] TODO.md tasks marked complete
- [ ] Version suffix removed (e.g., .a → final version)
- [ ] **STOP: Present this checklist to user for review and get explicit approval before proceeding**
- [ ] All changes committed to feature branch
- [ ] Merged to main
- [ ] THEN and ONLY THEN: git tag, git push --tags

---

This file tracks tabled discussion items, work in progress context, and open questions to maintain continuity across Claude sessions.

## Tabled Items

### Column Name Filtering Feature
- **Date**: 2025-10-17
- **Context**: User has an idea about filtering that also involves filtering column names
- **Status**: ✅ Moved to TODO.md with documented approaches (simple case, prefix syntax, smart filtering)
- **Priority**: Pending user decision on next task priority

## Current Work in Progress

### v3.1.2 - RELEASED ✅
- **Started**: 2025-10-18
- **Completed**: 2025-10-18
- **Released**: 2025-10-18
- **Branch**: feature-improve-error-messages (merged to main)
- **Changes Made**:
  - Improved console fetcher Phase 0 error messages with actionable recovery steps
  - Authentication/session expiration errors now tell users exactly what to do
  - No functional changes, only improved user guidance
- **Status**: Successfully merged to main, tagged as v3.1.2, and pushed to GitHub

### v3.1.1 - RELEASED ✅
- **Started**: 2025-10-17
- **Completed**: 2025-10-17
- **Released**: 2025-10-17
- **Branch**: feature-column-rename-trigger (merged to main)
- **Changes Made**:
  - Added pencil icon (✏️) that appears on hover over column names
  - Icon fades in smoothly to indicate editability
  - Double-click functionality already existed, this improves discoverability
- **Status**: Successfully merged to main, tagged as v3.1.1, and pushed to GitHub
- **Lesson Learned**: During this session, Claude violated BOTH Core Ground Rules:
  - Rule #1 (Version Management): Made code changes BEFORE incrementing version - must increment BEFORE any code edit
  - Rule #2 (Approval Workflow): Made multiple changes without waiting for explicit "yes"/"go ahead"/"proceed" approval
  - After being called out and re-reading BOTH SKILL files, behavior significantly improved
  - Root cause: Not thoroughly processing the SKILL files before starting work
  - **For future sessions**: The startup checklist at the top of this file is mandatory

### v3.1.0 - RELEASED ✅
- **Started**: 2025-10-17
- **Completed**: 2025-10-17
- **Released**: 2025-10-17
- **Branch**: feature-ux-improvements (merged to main)
- **Changes Made**:
  - Dynamic title management (title auto-updates from APP_VERSION constant)
  - Search bar improvements (magnifying glass icon, better placeholder)
  - Add Column UX redesign (button creates "New Column" with cursor ready)
  - README updates (server documentation, Skills documentation)
  - Created Claude Skills infrastructure (SKILL-*.md files, build scripts)
  - Created NOTES.md for session continuity
  - Established README.md as source of truth for git tags
- **Status**: Successfully merged to main, tagged as v3.1.0, and pushed to GitHub

## Open Questions

None at this time.

---

## Notes About This File

- **Purpose**: Maintains context across Claude sessions, especially for "tabled" discussion items
- **Commit Policy**: Always commit NOTES.md with any other changes (for backup)
- **Version Control**: Tracked in git but does NOT trigger app version increments
- **Update Frequency**: Update whenever items are tabled or work context changes significantly
