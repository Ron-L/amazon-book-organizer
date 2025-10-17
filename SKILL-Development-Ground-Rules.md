---
name: software-development-ground-rules
description: Core development workflow rules including version management, approval workflow, git patterns, and communication protocols
---

# Software Development Ground Rules

## Core Rules (NEVER violate these)

### 1. Version Management
- **BEFORE** making ANY code change, increment the version letter (e.g., v3.1.0.a → v3.1.0.b)
- Version is located in ONE place only: `APP_VERSION` constant in amazon-organizer.html (around line 106)
- The browser title dynamically displays this version via `document.title`
- **Exception**: Documentation and meta files do NOT require version increment:
  - README.md, CHANGELOG.md, TODO.md, NOTES.md
  - SKILL-*.md files
  - Build scripts (.bat files)
  - .gitignore
- Violation of this rule is a "cardinal sin"

### 2. Approval Workflow
- **STOP and ASK** before making any code changes, commits, reverts, or git operations
- Questions like "should we?", "thoughts?", "what do you think?", "your thoughts?", etc. are requests for **DISCUSSION**, NOT approval
- Wait for explicit "yes", "go ahead", "please proceed", or similar confirmation
- **NEVER** "get ahead of yourself" by implementing during discussion

### 3. Update Before Commit
- Always run git pull/fetch before committing to ensure local is current
- Check for conflicts and resolve before pushing

## Git Workflow Patterns

### Feature Development
- Create feature branch from main: `git checkout -b feature-name`
- Make incremental commits with letter versions (v3.1.0.a, v3.1.0.b, etc.)
- When ready to release, squash all letter-versioned commits into one
- Update to release version (e.g., v3.1.0), merge to main
- Tag the release: `git tag v3.1.0` (use actual version number, not this example)
- Push with tags: `git push origin main --tags`

### Commit Messages
- Use conventional commit format: `Type: Brief description`
- Types: Feat, Fix, Update, Refactor, Docs, Test, Chore, Rename
- Include version in subject line: `Fix: Resolve manifest caching issue v3.0.0.p`
- Add detailed body explaining WHY, not just what
- End with Claude attribution:
  ```
  🤖 Generated with [Claude Code](https://claude.com/claude-code)

  Co-Authored-By: Claude <noreply@anthropic.com>
  ```

### Tagging Releases
- **Project version** is tracked in README.md "Version" section (single source of truth)
- Git tags MUST match the README.md project version
- Tag format: `v3.1.0` (use actual current version, not this example)
- Tag message: Include brief summary of changes
- Tags mark released versions only (not letter versions)
- Individual code files may have their own internal versions (e.g., APP_VERSION in HTML)

## Documentation Standards

### CHANGELOG.md
- Update before finalizing any version
- Include Technical Notes section for:
  - Approaches that didn't work (blind alleys)
  - Why they failed
  - What finally worked
- This prevents revisiting failed approaches in future sessions

### TODO.md
- Mark completed tasks
- Add discovered tasks during implementation
- Include context about WHY tasks are needed

### NOTES.md
- Meta file for session state and tabled discussion items
- Tracked in git but does NOT trigger version increments
- **Always commit NOTES.md** with any other commits (for backup)
- Structure: Tabled Items, Current Work in Progress, Open Questions
- **Update NOTES.md when**:
  - User says "table that thought" or "hold that thought until..." (add to Tabled Items)
  - Finalizing a version (update Current Work in Progress)
  - Updating CHANGELOG.md (ensure work context is current)

### Claude Skills Management
- Source files: `SKILL-Development-Ground-Rules.md`, `SKILL-Amazon-Book-Organizer.md`
- **Required format**: SKILL-*.md files MUST start with YAML frontmatter:
  ```yaml
  ---
  name: skill-name-in-lowercase-with-hyphens
  description: Brief description of the skill
  ---
  ```
- **After ANY change to SKILL-*.md files**:
  - Claude will automatically run build scripts using PowerShell:
    - `build-skill-ground-rules.bat`
    - `build-skill-organizer.bat`
  - Developer must then upload new zips to Claude Skills interface (delete old, upload new)
- Only source `.md` files are tracked in git (zips are generated)

### Review Before Proposing
- **ALWAYS** review CHANGELOG Technical Notes before suggesting approaches
- This prevents proposing solutions that have already been exhausted

## Communication Protocol

### When to STOP and Ask
- User says: "should we", "thoughts?", "what do you think?", "your thoughts?", etc.
- Before implementing any code change
- Before any git operation (commit, revert, push, merge, etc.)
- Before creating or modifying files
- When uncertain about approach

### Push Back Policy
- User explicitly welcomes push back on suggestions
- Challenge ideas if you see potential issues
- Propose alternative approaches with reasoning
- Say "I disagree because..." when warranted

### General Feedback
- When proposing a change that adds code, consider whether the same goal can be achieved by REMOVING code instead
- Always prefer simplification over adding complexity
- Question whether new features are truly necessary
