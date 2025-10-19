---
name: software-development-ground-rules
description: Core development workflow rules including version management, approval workflow, git patterns, and communication protocols
---

# Software Development Ground Rules

## Core Rules (NEVER violate these)

### 0. Recursive Rule Display (Unbreakable)
- **At the start of EVERY response**, display this reminder:
  ```
  📋 CORE RULES - Read full details in SKILL files (Development-Ground-Rules.md & Amazon-Book-Organizer.md):
  #1: Version BEFORE code changes
  #2: STOP and ASK before commits/git ops - wait for explicit "yes"/"go ahead"/"proceed"
  #3: Update before commit (git fetch)
  ⚠️ Also: CHANGELOG before finalizing, use correct build scripts for Skills
  ```
- This rule ensures all other rules stay visible throughout the conversation
- The reminder MUST appear even in responses that acknowledge this rule
- Exception: Skip reminder only if user explicitly requests it be turned off

### 1. Version Management
- **BEFORE** making ANY code change, increment the version letter (e.g., v3.1.0.a → v3.1.0.b)
- **Exception**: Documentation and meta files do NOT require version increment:
  - README.md, CHANGELOG.md, TODO.md, NOTES.md
  - SKILL-*.md files
  - Build scripts (.bat files)
  - .gitignore
- Violation of this rule is a "cardinal sin"

#### File-Specific Versioning
- Only increment versions in files that are actually being modified
- If changing console-fetcher.js, update FETCHER_VERSION only
- If changing amazon-organizer.html, update APP_VERSION only
- Project version in README.md increments independently (see Project Versioning below)

### 2. Approval Workflow
- **STOP and ASK** before making any code changes, commits, reverts, or git operations
- Questions like "should we?", "thoughts?", "what do you think?", "your thoughts?", etc. are requests for **DISCUSSION**, NOT approval
- Wait for explicit "yes", "go ahead", "please proceed", or similar confirmation
- **NEVER** "get ahead of yourself" by implementing during discussion

#### Approval Language Interpretation
- "Proceed with edits" = Make file edits ONLY, then STOP
- "Proceed with commit" = Commit ONLY, then STOP
- "Proceed with push" = Push ONLY, then STOP
- "Proceed with X and Y" = Do both X and Y, then STOP
- "Proceed" alone = Clarify what to proceed with
- When in doubt, do ONE operation and STOP

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

### Documentation-Only Changes
- Documentation files (README, CHANGELOG, TODO, NOTES, SKILL-*.md, .gitignore) can be modified directly on main branch
- No feature branch required
- No version increment or tagging
- Commit directly to main with descriptive message
- Still requires approval before commit/push (Ground Rule #2)

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

### Project Versioning
- Project version tracked in README.md "Version" section (format: "Project Version: vX.Y.Z")
- Project version increments ONLY for releases that include code/executable changes (HTML, JS, etc.)
- **Documentation-only changes** (README, CHANGELOG, TODO, NOTES, SKILL-*.md) do NOT increment project version, do NOT create tags, and can be committed directly to main branch (see Git Workflow Patterns > Documentation-Only Changes)
- When project version increments, it's based on the nature of the release:
  - Major (X): Breaking changes or major feature sets
  - Minor (Y): New features or significant improvements
  - Patch (Z): Bug fixes, minor improvements
- Project version is independent of individual file versions
- Git tags MUST match project version
- Always use "v" prefix for consistency and findability
- Tags mark released versions only (not letter versions)

### Tagging Releases
- Tag format: `v3.1.0` (use actual current version, not this example)
- Tag message: Include brief summary of changes
- Only tag when project version increments (code releases, not documentation-only)

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
- **Automatic .zip rebuilding via git pre-commit hook**:
  - A git pre-commit hook (`.git/hooks/pre-commit`) automatically detects when SKILL-*.md files are committed
  - The hook rebuilds the corresponding .zip files automatically using PowerShell
  - Build process: Copy SKILL-*.md to SKILL.md → Zip as SKILL.md → Delete temp file
  - IMPORTANT: The file inside the zip MUST be named `SKILL.md` (not the original filename)
  - The .zip file is generated but NOT committed (it's in .gitignore)
  - You'll see output during commit: "🔨 Pre-commit hook: Rebuilding SKILL zip files..."
  - **No manual action required** - just commit the .md file changes normally
- **Manual build scripts** (backup method if hook fails):
  - `build-skill-ground-rules.bat` creates `SKILL-Development-Ground-Rules.zip`
  - `build-skill-organizer.bat` creates `SKILL-Amazon-Book-Organizer.zip`
  - These can be run manually if the git hook is not working
- **Uploading to Claude Skills interface**:
  - Drag and drop the .zip file onto the Skills page
  - If skill name already exists, it will prompt to replace it
  - No need to manually delete the old skill first
- Only source `.md` files are tracked in git (zips are generated locally, not committed)
- **Note**: The git hook is repository-local (`.git/hooks/` is not tracked by git). If cloning to a new location, the hook will need to be recreated

### Review Before Proposing
- **ALWAYS** review CHANGELOG Technical Notes before suggesting approaches
- This prevents proposing solutions that have already been exhausted

### Post-Release Review
- After EVERY code release (when project version increments), conduct a brief post-mortem with user
- Review: What mistakes were made? What lessons learned? What worked well?
- Update ground rules if patterns emerge
- Document lessons in NOTES.md under the release entry
- This does not apply to documentation-only changes

### Session Compaction Protocol
- When creating a summary for session compaction (either automatic or manual), you MUST include in the summary:

1. **Recursive Rule Display Requirement** - Explicitly state at the beginning:
   ```
   IMPORTANT: Display Core Ground Rules at the start of EVERY response.

   📋 CORE RULES FORMAT:
   **🔴 CORE GROUND RULES (Always Visible)**

   **Rule #1: Version Management**
   - Version FIRST, code changes SECOND
   - NEVER modify code without incrementing version first
   - Only update versions in files actually being modified

   **Rule #2: Approval Workflow**
   - Present changes → Get explicit approval → Execute
   - "Proceed with edits" = Make file edits ONLY, then STOP
   - "Proceed with commit" = Commit ONLY, then STOP
   - When in doubt, do ONE operation and STOP
   ```

2. **Why This Matters**: Without this explicit instruction in the compaction summary, the post-compaction session will lose the recursive display behavior and rules will be forgotten.

3. **Standard Summary Content**: Include current work status, completed work, and next steps as usual.

**Note**: This protocol is critical for maintaining ground rule compliance across session boundaries. The compaction summary is the ONLY way to pass behavioral requirements to the next Claude session.

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
