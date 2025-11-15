---
name: software-development-ground-rules
description: Core development workflow rules including version management, approval workflow, git patterns, and communication protocols
---

# Software Development Ground Rules

## Core Rules (NEVER violate these)

### 0. Recursive Rule Display (Unbreakable)
- **At the start of EVERY response**, display this one-liner with current timestamp:
  ```
  📋 Ground Rules Active - Full rules in SKILL-Development-Ground-Rules.md [YYYY-MM-DD HH:MM:SS Local]
  ```
- **ALWAYS follow the one-liner with a horizontal rule separator (`---`) before continuing with your response**
- Timestamp format: User's local time in ISO 8601 format (e.g., `[2025-11-05 18:45:12 Local]`)
- This rule ensures rules remain visible throughout the conversation and provides temporal context
- The reminder MUST appear even in responses that acknowledge this rule
- Exception: Skip reminder only if user explicitly requests it be turned off

### 1. Version Management
- **BEFORE** making ANY code change, increment the version letter
- **Exception**: Documentation and meta files do NOT require version increment:
  - README.md, CHANGELOG.md, TODO.md, NOTES.md
  - SKILL-*.md files
  - Build scripts (.bat files)
  - .gitignore
- Violation of this rule is a "cardinal sin"

#### Version Patterns
- **Starting new work**: Increment version number AND add letter (e.g., v3.2.0 → v3.2.1.a)
- **Iterating on work**: Increment letter only (e.g., v3.2.1.a → v3.2.1.b → v3.2.1.c)
- **Releasing to main**: Remove letter (e.g., v3.2.1.c → v3.2.1)

#### File-Specific Versioning
- Only increment versions in files that are actually being modified
- If changing library-fetcher.js, update FETCHER_VERSION only
- If changing amazon-organizer.js, update APP_VERSION only
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

## Rule Enforcement Protocol

**Purpose**: Ensure Ground Rules are actively applied, not just passively available in context.

When taking rule-sensitive actions, Claude MUST explicitly check the relevant rule:

### Before Proposing a Version Change:
1. State: "**Checking Ground Rule #1 (Version Management)...**"
2. Quote the current version
3. Quote the relevant pattern (starting new work / iterating / releasing)
4. Show the calculated next version with reasoning
5. Then propose the change

**Example:**
```
Checking Ground Rule #1 (Version Management)...
Current version: v3.2.0
Action: Starting new work (improving book dialog)
Pattern: Increment version number AND add letter
Next version: v3.2.1.a
```

### Before Any Git Operation:
1. State: "**Checking Ground Rule #2 (Approval Workflow)...**"
2. Quote what the user approved (exact words)
3. Confirm the operation matches the approval
4. Then execute

**Example:**
```
Checking Ground Rule #2 (Approval Workflow)...
User approval: "yes, proceed with commit"
Operation: git commit
Match: ✓ Approved operation
Proceeding with commit...
```

### Before Any Commit:
1. State: "**Checking Ground Rule #3 (Update Before Commit)...**"
2. Run: `git fetch`
3. Check for upstream changes
4. If conflicts exist, resolve before proceeding
5. Then commit

### Before Modifying Any Code File:
1. State: "**Checking Ground Rule #1 (Version Management)...**"
2. Verify version was already incremented in this session
3. If not incremented yet, STOP and increment first
4. Show verification before editing

**Example:**
```
Checking Ground Rule #1 (Version Management)...
Version already incremented: v3.2.1.a ✓
Proceeding with code changes...
```

### After Completing File Changes (Before Commit):
1. State: "**Documentation/code changes complete**"
2. List all modified/created files
3. Summarize what changed in each
4. Ask: "Should I proceed with committing these changes?"
5. STOP and wait for explicit approval
6. Only when approved, proceed to "Before Any Commit" protocol

**Example:**
```
Documentation changes complete:
- README.md: Replaced "FOR CLAUDE" section with Documentation Guide
- NOTES.md: Removed redundant checklists
- CONTRIBUTING.md: Created comprehensive reference (NEW FILE)
- SKILL-Development-Ground-Rules.md: Added all protocols

Should I proceed with committing these changes?
[STOP AND WAIT]
```

**Critical:** This protocol triggers even for documentation-only changes. Ground Rule #2 applies to ALL commits, not just code commits.

### Phase Completion Protocol:
When marking a TODO phase/task as complete:

1. **Update TODO.md**:
   - Mark all completed checkboxes [x]
   - Update phase status to "COMPLETE" or add completion date
   - Add commit reference if applicable

2. **Update NOTES.md**:
   - Move phase from "IN PROGRESS" to completed section
   - Add completion date and commit reference
   - Document any lessons learned or findings

3. **Update CHANGELOG.md**:
   - Add entry to Unreleased or new version section
   - Include technical notes if applicable

4. **Verify documentation consistency**:
   - Check that TODO.md, NOTES.md, and CHANGELOG.md all tell the same story
   - Ensure no orphaned references to "in progress" work

5. **Ask for approval** before committing documentation updates

### Documentation Update Check:
Before any commit, verify:
1. **CHANGELOG.md** - Updated for code releases (not doc-only changes)
2. **NOTES.md** - Updated if work context changed
3. **TODO.md** - Marked completed tasks

### Release Finalization Check:
Before removing version letter (finalizing release):
1. Verify: CHANGELOG.md updated with version entry
2. Verify: NOTES.md marked as RELEASED ✅
3. Verify: TODO.md tasks marked complete
4. Verify: README.md project version updated
5. Show checklist completion status
6. Then remove letter and tag

**Important Notes:**
- This protocol is NOT optional - it must happen even if it feels repetitive
- The user prefers seeing rules applied visibly rather than having them violated silently
- Only adds verbosity when rules are actually being invoked (not every response)
- Estimated token cost: ~50-100 tokens per check (negligible vs rule violations)

## Git Workflow Patterns

### Feature Development
- Create feature branch from main: `git checkout -b feature-name`
- Make incremental commits with letter versions (v3.1.0.a, v3.1.0.b, etc.)
- When ready to release, squash all letter-versioned commits into one
- Update to release version (e.g., v3.1.0), merge to main
- Tag the release: `git tag v3.1.0` (use actual version number, not this example)
- Push with tags: `git push origin main --tags`

### Testing Workflow (Local and Server-Based)

**Applies to:** All code changes, whether testing locally or on GitHub Pages server

**Unified Workflow:**

1. **Version BEFORE code changes** (Ground Rule #1)
2. **Make code changes**
3. **Commit immediately** (capture iteration history for potential squashing before merge)
4. **Push** (enables server testing and maintains consistent workflow)
5. **Test:**
   - **Server testing**: Test on https://ron-l.github.io/readerwrangler/
   - **Local testing**: Test locally (console paste, local server, etc.)
6. **If bugs found**, increment version letter and repeat from step 2
7. **When stable**, merge to main (squash commits if desired)

**Key Insight:** The workflow is identical - the only difference is where you test (step 5).

**Files testable locally or on server:**
- amazon-organizer.html, amazon-organizer.js (local server or GitHub Pages)
- library-fetcher.js, collections-fetcher.js (console paste or via bookmarklet)

**Files requiring server testing:**
- bookmarklet-loader.js (loaded via bookmarklet, cannot run locally)
- install-bookmarklet.html (references GitHub Pages URLs)

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

#### Project Version vs File Version Relationship

**Key Principle:** Project version and file versions are INDEPENDENT and serve different purposes.

**Project Version (README.md):**
- User-facing version representing the overall project state
- Tracks releases that change user experience
- Follows semantic versioning based on user impact:
  - Patch (Z): Bug fixes, minor UX improvements (e.g., v3.1.2 → v3.1.3)
  - Minor (Y): New features, significant enhancements (e.g., v3.1.3 → v3.2.0)
  - Major (X): Breaking changes, major rewrites (e.g., v3.2.0 → v4.0.0)
- Does NOT increment for documentation-only changes
- Used for git tags

**File Versions (APP_VERSION, FETCHER_VERSION, etc.):**
- Developer-facing version for tracking individual file changes
- Each file has its own independent version
- Can increment independently based on file modifications
- May be higher OR lower than project version

**Common Mistake:** Assuming project version should match file versions.

**Examples:**
```
Scenario 1: Bug fix in organizer UI
- amazon-organizer.js: v3.1.0 → v3.2.1.a → v3.2.1 (file changed significantly)
- Project version: v3.1.2 → v3.1.3 (patch fix for users)
- Why different: File had multiple iterations, but user impact is just a patch

Scenario 2: Major UI refactor
- amazon-organizer.js: v3.1.9 → v3.2.0 (major refactor)
- Project version: v3.1.9 → v3.2.0 (minor release for users)
- Why same: File and project both had minor/significant changes

Scenario 3: Documentation updates
- README.md, CHANGELOG.md updated
- Project version: v3.1.3 → v3.1.3 (no change)
- Why: Documentation doesn't affect user functionality
```

#### Before Proposing Project Version

Before proposing a project version change, Claude MUST:

1. **Check current project version** in README.md (not file versions)
2. **Assess user impact** of the changes:
   - Does this fix a bug users experience? → Patch
   - Does this add new functionality users can use? → Minor
   - Does this break existing functionality or require migration? → Major
   - Is this documentation/meta-work only? → No increment
3. **Calculate new version** based on impact (independent of file versions)
4. **State reasoning explicitly** before proposing

**Example Protocol:**
```
Checking project version for release...
Current project version: v3.1.2 (from README.md)
File version being released: amazon-organizer.js v3.2.1
User impact: Bug fix - removed misleading button
Assessment: Patch-level change (no new features, no breaking changes)
Next project version: v3.1.3 ✓
```

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

**CRITICAL**: When creating a summary for session compaction (automatic or manual), you MUST include these directives at the very beginning of the summary:

1. **Ground Rules File Access** - State explicitly:
   ```
   IMMEDIATELY after reading this summary, BEFORE your first response:
   1. Read SKILL-Development-Ground-Rules.md in full
   2. Read SKILL-Amazon-Book-Organizer.md in full
   3. Read CONTRIBUTING.md for decision frameworks
   4. These files contain critical behavioral requirements including:
      - Recursive rule display (MUST appear at start of EVERY response)
      - Version management protocol
      - Approval workflow requirements
      - Ship Fast vs. Build Solid decision framework
   ```

2. **Recursive Rule Display Format** - Include the exact current format:
   ```
   At the start of EVERY response, display:
   📋 Ground Rules Active - Full rules in SKILL-Development-Ground-Rules.md [YYYY-MM-DD HH:MM:SS Local]
   ---

   Then continue with your response.

   This display is MANDATORY per Rule #0 in SKILL-Development-Ground-Rules.md
   Exception: Only skip if user explicitly requests it be turned off
   ```

3. **Standard Summary Content**: Include current work status, completed work, and next steps as usual.

**Why This Matters**:
- The compaction summary is the ONLY way to pass behavioral requirements across session boundaries
- Without explicit file read directives, ground rules are forgotten
- Without the recursive display directive, the rule reminder disappears
- Loss of these protocols causes rule violations and workflow disruption

**Post-Compaction Checklist for Next Session**:
- [ ] Read SKILL-Development-Ground-Rules.md
- [ ] Read CONTRIBUTING.md
- [ ] Display recursive rule reminder in first response
- [ ] Apply Rule #1 (Version Management) before any code changes
- [ ] Apply Rule #2 (Approval Workflow) before any operations

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

### Foundation-First Principle

**User's Working Style:**
The user prioritizes fixing foundations before building features. This is a deliberate pattern, not a distraction.

**When user identifies a foundational issue** (rules not working, docs unclear, structure confusing):
1. **Don't apologize for "going off track"** - this IS the track
2. **Embrace the detour** - it's an investment in future velocity
3. **Ask: "Should we fix this foundation issue before continuing with [original task]?"**
4. **Wait for explicit decision** on whether to continue with foundation or return to feature

**When proposing a feature implementation, Claude should ask:**
- "Are the current rules/docs/structure adequate for this change?"
- "Would fixing [foundation issue] make this easier/safer?"
- "Should we address [underlying issue] before proceeding?"

**Examples of foundation-first thinking:**
- Fix version management rules BEFORE implementing feature
- Clarify documentation structure BEFORE adding new docs
- Improve error handling patterns BEFORE fixing specific errors
- Test with real data BEFORE building complex UI

**This is not "analysis paralysis"** - it's deliberate investment in quality and maintainability.

### Ship Fast vs. Build Solid: Decision Framework

**Before starting work on ANY bug or feature**, evaluate it against this framework:

**KEY QUESTION: "Does this affect data correctness or completeness?"**

**Ship Fast When:**
- UI polish issues (colors, spacing, minor UX tweaks)
- Nice-to-have features (additional sorting, filter variations)
- Performance optimizations (unless critical to usability)
- Edge cases affecting <0.01% with NO data loss
- Cosmetic improvements that don't affect core functionality

**Build Solid Foundation When:**
- ✅ **Data integrity issues** (loss, corruption, incorrect processing)
- ✅ **Core functionality bugs** (search, filtering, display, organization)
- ✅ **API contract changes** (endpoint deprecation, schema changes)
- ✅ **State management bugs** (persistence, ID stability, synchronization)
- ✅ **Error handling gaps** (silent failures, missing validation)

**Why This Project Requires "Build Solid" Approach:**
1. Library management - Users trust us with their book collection metadata
2. Long-term use - Not a throwaway prototype, built for ongoing use
3. Data permanence - Books represent purchased content, reading history
4. Cross-session reliability - Must work consistently over months/years
5. Foundation compounds - Solid patterns prevent future issues

**Comparison Context:**
- Social media prototype: 3/2000 missing posts? Ship it.
- E-commerce recommendations: 3 products don't load? Ship it.
- Financial transactions: 3 failed transfers? NEVER ship.
- **Personal library manager: 3 missing books?** → Closer to financial than social media.

**Time Investment is Justified When:**
Spending a few days to achieve:
- 100% data coverage instead of 99.85%
- Understanding of API behavior patterns
- Robust error handling for future edge cases
- Comprehensive logging for rapid future diagnosis

**Red Herrings Are Learning:**
If investigation takes unexpected turns but yields:
- Fixed bugs (even if different than expected)
- Documented API behavior
- Improved error handling
- Transferable knowledge for future issues

...then it was NOT wasted time - it was education and foundation building.

**Application Protocol:**
1. When user reports a bug or requests a feature
2. Explicitly evaluate against this framework
3. State which category it falls into and why
4. Document the decision reasoning before proceeding

**See also:** CONTRIBUTING.md "Ship Fast vs. Build Solid: Decision Framework" for detailed examples and context.

### When User Reports a Problem

**STOP. Do NOT immediately try to fix it.**

1. **Acknowledge the problem explicitly**: "You're right, the [thing] failed/didn't work."
2. **Ask for analysis permission**: "Should I investigate the root cause before proposing a fix?"
3. **If yes, perform root cause analysis**:
   - What happened? (the symptom)
   - Why did it happen? (the direct cause)
   - Why didn't I detect it? (the detection failure)
   - What systemic issues allowed this? (the underlying pattern)
4. **Present findings BEFORE proposing solutions**
5. **Wait for decision** on whether to fix now or continue with analysis

**This prevents:**
- Superficial fixes that don't address underlying issues
- Missing opportunities to improve the system
- Violating Foundation-First pattern
- Rushing to "fix it" mode before understanding "why it broke"

**Example:**
```
User: "The zip file wasn't updated"

❌ Bad response: "Let me try running it differently..." [immediately attempts fix]

✓ Good response:
"You're right, the zip file wasn't updated. Should I investigate the root cause
before proposing a fix? I want to understand why it failed AND why I didn't
detect the failure when I checked."
```

#### Distinguishing Questions from Problems

When user asks "why did you [action]?", assess context to determine if root cause analysis is needed:

**Triggers for Root Cause Analysis** (likely a problem):
- Action contradicts stated rules/patterns
- Action had negative/unexpected consequences
- User expresses confusion or surprise
- Question follows a failure or error
- Tone suggests concern (e.g., "why did you X when we agreed Y?")

**Does NOT trigger** (likely learning/curiosity):
- Action was successful and met requirements
- User is exploring alternative approaches
- Question is theoretical ("why did you choose X over Y?")
- User explicitly says "I'm curious" or "just wondering"
- No evidence of problems or rule violations

**When uncertain:** Ask clarifying question: "Are you asking because something went wrong, or are you curious about the approach I took?"

**Examples:**
```
User: "Why did you tie the project version to the file version?"
Context: This contradicts stated rule that versions are independent
Assessment: Problem - trigger root cause analysis ✓

User: "Why did you use approach X instead of Y?"
Context: Approach X was successful and met all requirements
Assessment: Learning/curiosity - explain reasoning, no root cause analysis needed
```

#### Implicit Problem Signals

User asking you to "review", "check", or "verify" work you JUST completed is likely an implicit problem report.

**Red flags:**
- "Can you review [files you just worked with]?"
- "I think [statement about your work] - is that right?"
- "Please check if [something you should have done]"
- User asks about documentation files immediately after you committed code

**Response Protocol:**
1. **STOP and assess**: "Did I complete this work correctly?"
2. **Review what you did** vs. what should have been done (check Phase Completion Protocol)
3. **If gap found**:
   - Acknowledge: "You're right, I missed updating [files]"
   - Perform root cause analysis (without being asked)
   - Propose fix
4. **If no gap found**: Respond to review request normally

**Example:**
```
User: "Please review the doc files"
Context: You just committed Phase 2 code but didn't update TODO.md or NOTES.md
Assessment: Implicit problem signal - should trigger self-review and root cause analysis ✓
```

### Project Context Assessment Protocol

**Before starting ANY new project or major feature, assess the context to choose the right approach:**

#### Context Questions (Ask These First):
1. **Lifespan:** Is this a weekend hack, learning experiment, or long-term project?
2. **Scope trajectory:** Fixed scope or likely to grow?
3. **Team size:** Solo exploration or collaborative work?
4. **Consequences:** What's the cost of bugs? (learning tool vs production system)
5. **Certainty:** Are requirements clear or still being discovered?

#### Decision Matrix:

**Ship Fast Pattern** (appropriate for):
- ✅ Prototypes, POCs, throwaway code
- ✅ Learning experiments, exploring unknowns
- ✅ Requirements unclear, testing hypotheses
- ✅ Solo work, short lifespan
- ✅ Low consequence of failure
- Example: "Let me try this API to see if it works"

**Foundation First Pattern** (appropriate for):
- ✅ Production code with users
- ✅ Long-term maintenance expected
- ✅ Collaborative work across sessions/developers
- ✅ Complex domain with growing scope
- ✅ High consequence of bugs
- ✅ Clear requirements, known direction
- Example: "Building a 2666-book organizer I'll use for years"

**Hybrid Pattern** (appropriate for):
- Start fast to validate approach
- STOP and invest in foundation when you see:
  - Repeated bugs in same area
  - Difficulty making changes
  - Scope starting to grow
  - Others wanting to contribute
  - Moving from exploration to production
- Example: "Started as experiment, now it's useful"

#### Red Flags for Technical Debt:
Watch for these signals that foundation work is overdue:
- 🚩 "Quick fix" creates new bugs
- 🚩 Every change takes longer than the last
- 🚩 Fear of touching certain code
- 🚩 Copy-paste code because changing shared code is scary
- 🚩 "Works but I don't know why" comments
- 🚩 Planning a rewrite instead of improving existing code

#### For This Project:
Amazon Book Organizer is clearly **Foundation First**:
- ✓ Long lifespan (ongoing development)
- ✓ Growing complexity (collections, tracking, features)
- ✓ Collaborative (user + Claude across sessions)
- ✓ Real consequences (managing 2666 books)
- ✓ Clear requirements, known direction

**When proposing implementations, Claude should reference this assessment and confirm the approach fits the context.**

### Diagnostic and Test Script Naming Convention

**All temporary/throwaway scripts and outputs MUST follow this naming pattern:**

**Diagnostic Scripts:** `diag-NN-description.js`
- Example: `diag-01-isbn-asin-problem.js`, `diag-02-api-timeout.js`

**Test Scripts:** `test-NN-description.js`
- Example: `test-01-isbn-enrichment.js`, `test-02-phase1-dedup.js`

**Output Files:** `output-NN-description.txt` or `.json`
- Example: `output-01-isbn-test-results.json`, `output-02-fetch-stats.txt`

**Where NN = two-digit incrementing counter:**
- 01, 02, 03, ..., 99
- Counter increments with each new script or output file
- Groups related files together when sorted by name

**Script Name in Console Output:**
- EVERY diagnostic/test script MUST print its filename in the console output header
- Format: `Script: filename.js`
- Example:
  ```
  ========================================
  ISBN vs ASIN DIAGNOSTIC TOOL
  Script: diag-01-isbn-asin-problem.js
  ========================================
  ```
- This allows quick verification that the correct script is running

**Rationale:**
- Makes it easy to identify the latest/newest script when sorted by filename
- Groups related diagnostic/test files together
- Prevents confusion when user runs wrong script
- Facilitates cleanup after investigation completes

### Simplicity First for Rare Operations

**Pattern:** Operations used rarely (dev/testing/maintenance) don't need complex UIs.

**When to Apply:**
- Feature is used infrequently (< weekly)
- User is developer/maintainer (not end-user)
- Operation is non-critical or recoverable
- Clear documentation can replace UI complexity

**Complexity Triggers** (signs you're over-engineering):
- More than 3 iterations on same feature without user testing
- Implementation requires multiple dialog states or complex logic
- Adding checkboxes/options "just in case" for rare scenarios
- Every use case is an edge case

**Response Protocol:**
1. **Question complexity early**: "Is there a simpler way?"
2. **Look at previous working versions**: Use `git show <commit>:<file>` to examine old code patterns
3. **Propose simplest solution first**: Get user feedback before adding complexity
4. **Example comparison**: Show simple vs complex approach with clear tradeoffs

**Git History as Reference:**
```bash
# Find previous working version
git log --oneline --all | grep "feature-name"

# Examine specific file at that commit
git show <commit-hash>:path/to/file.js | grep -A 30 "functionName"
```

**Real Example from v3.3.2:**
- ❌ Complex: Dialog with checkboxes for selective clearing (organization vs library)
- ✅ Simple: Single "Clear Library" button with confirm() dialog
- Result: Worked perfectly first try, user confirmed satisfaction
- Lesson: Rare operations (full reset) don't need multiple options

### API Debugging Protocol

**Pattern:** When debugging API issues, investigate raw responses before assuming error structures.

**Initial Response to API Errors:**
1. **Add raw response logging FIRST** - `console.log(JSON.stringify(rawResponse, null, 2))`
2. **Examine actual data structure** - Don't assume based on error presence
3. **Check for partial success** - API may return BOTH data AND errors (partial errors are valid)
4. **Document findings** - Update GraphQL-API-Reference.md or similar docs

**GraphQL Partial Errors Pattern:**
```javascript
// ❌ WRONG: Assume errors means total failure
if (response.errors) {
    reject(); // Lost valid data!
}

// ✅ CORRECT: Check for data presence despite errors
if (response.errors && !response.data?.getProducts?.[0]) {
    reject(); // Only fail if truly no data
} else if (response.data?.getProducts?.[0]) {
    // Use data even if errors present
    // Log partial error for monitoring
}
```

**Real Example from v3.3.2:**
- Problem: 3/2666 books failed with "Customer Id or Marketplace Id is invalid"
- Root Cause: Amazon returns BOTH valid description data AND customerReviewsTop error in same response
- Old Behavior: Rejected entire response, discarding valid description
- New Behavior: Accept partial data, only fail if NO data present
- Impact: Recovered 5/5 partial errors (100% success)

**Enhanced Logging Guidelines:**
- Add comprehensive logging at error points
- Log: error message, error path, raw response
- Mark as TEMPORARY - remove after issue resolved
- Include in commit message: "Added temp logging for [issue]"

**Investigation Priority:**
- Investigate raw response BEFORE changing query structure
- Investigate raw response BEFORE changing headers
- Investigate raw response BEFORE trying alternative endpoints
- Pattern: "Understand THEN fix" not "Try random changes"

### Systematic Sampling for Data Gaps

**Pattern:** When large percentage of data is missing, verify if it's extraction vs. availability issue.

**When to Apply:**
- >10% of expected data is missing or empty
- Error messages are ambiguous or absent
- Data source is known to be reliable (e.g., Amazon library)

**Investigation Protocol:**
1. **Random Sample**: Select 10-20 items from missing data set
2. **Manual Extraction**: Test each item individually/manually
3. **Analysis**:
   - If sample succeeds → Extraction logic incomplete
   - If sample fails → Investigate API/data availability
4. **Pattern Discovery**: Examine successful extractions for common patterns
5. **Implementation**: Add missing extraction patterns to production code

**Real Example from Phase 2.0:**
- Problem: 1,528/2,343 books (65%) missing descriptions
- Random Sample: 20 books tested individually
- Result: 100% of sample had descriptions available
- Conclusion: Extraction logic incomplete, not API failure
- Discovery: 3 new extraction patterns (paragraph wrappers, nested semanticContent, AI summaries)
- Impact: Recovered 1,526/1,528 (99.91%)

**Red Flags for Extraction Issues:**
- High percentage missing (>10%)
- Known reliable source
- No API errors reported
- Random sampling succeeds

**Avoid:**
- Assuming missing data = API unavailable
- Giving up at first sign of bulk failures
- Not testing individual items manually
- Implementing fixes without understanding patterns

### General Feedback
- When proposing a change that adds code, consider whether the same goal can be achieved by REMOVING code instead
- Always prefer simplification over adding complexity
- Question whether new features are truly necessary
