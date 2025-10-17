# Session Notes

This file tracks tabled discussion items, work in progress context, and open questions to maintain continuity across Claude sessions.

## Tabled Items

### Column Name Filtering Feature
- **Date**: 2025-10-17
- **Context**: User has an idea about filtering that also involves filtering column names
- **Status**: Deferred for later discussion
- **Priority**: TBD

## Current Work in Progress

### v3.1.0 Feature Branch (feature-ux-improvements) - READY TO MERGE
- **Started**: 2025-10-17
- **Completed**: 2025-10-17
- **Changes Made**:
  - Dynamic title management (title auto-updates from APP_VERSION constant) - v3.1.0.b
  - Search bar improvements (magnifying glass icon, better placeholder) - v3.1.0.a
  - Add Column UX redesign (button creates "New Column" with cursor ready) - v3.1.0.c
  - README updates (server documentation, Skills documentation)
  - Created Claude Skills infrastructure (SKILL-*.md files, build scripts)
  - Created NOTES.md for session continuity
  - Established README.md as source of truth for git tags
- **Next Steps**:
  - Commit changes to feature branch
  - Merge to main with squashed commits
  - Update version to v3.1.0 (remove letter suffix)
  - Tag as v3.1.0
  - Push with tags

## Open Questions

None at this time.

---

## Notes About This File

- **Purpose**: Maintains context across Claude sessions, especially for "tabled" discussion items
- **Commit Policy**: Always commit NOTES.md with any other changes (for backup)
- **Version Control**: Tracked in git but does NOT trigger app version increments
- **Update Frequency**: Update whenever items are tabled or work context changes significantly
