# ReaderWrangler Project Context

**Last Updated:** 2026-02-03
**Purpose:** Documents project origins, constraints, and quality priorities to inform design decisions

---

## Project Origin & Goals

### Primary Goal: Personal Retirement Project
ReaderWrangler started as a **personal retirement project** to solve the creator's own need for better Amazon Kindle library organization. The tool is designed first and foremost for personal use with a real-world library of ~2300 books.

### Secondary Goal: Public Sharing
Over time, the project evolved to be **powerful and unique enough to share publicly**. If released, it would:
- Fill a gap in existing Amazon library management tools
- Potentially generate modest revenue via Amazon Associate links
- Help other power readers organize large collections

**Key Implication:** Design decisions prioritize robustness and personal utility over broad market appeal. Public sharing is a bonus, not the primary driver.

---

## Target Users

### Primary User
- **The creator** - Active daily use with 2300+ book library
- Desktop-focused workflow (Chrome browser)
- Power user comfortable with technical tools
- Values organization, customization, and control

### Secondary Users (Future)
- Kindle power readers with 500+ book libraries
- Desktop users (laptop/desktop computers)
- Chrome or Chromium-based browsers (Edge, Brave)
- Comfortable with browser-based tools and bookmarklets

### Explicitly Out of Scope
- Mobile/tablet users (read-only viewing at best)
- Non-English languages (English-only UI/content)
- Non-Amazon ebook stores (Amazon-first, others deferred)
- Casual readers with small libraries (<100 books)

---

## Technical Environment & Constraints

### Browser Requirements
- **Primary:** Chrome (tested, optimized)
- **Secondary:** Firefox, Edge (may work, untested)
- **Minimum version:** Modern browsers with ES6+, IndexedDB, localStorage support

### Platform
- **Desktop-focused:** Large screens, mouse/keyboard interactions
- **Mobile/Responsive:** Intentionally limited - read-only viewing acceptable
- Touch interactions not prioritized (drag-drop designed for mouse)

### Storage Architecture
- **IndexedDB:** Primary book data storage (~150 MB for 2300 books)
- **localStorage:** UI state, settings, folder organization
- **JSON Files:** Book data exported to `/books/` directory (descriptions, reviews moved due to IndexedDB size limits)
- **Current Usage:** 150.72 MB / 557.74 GB quota (0.03%) - storage is NOT a concern

### Data Sources
- Amazon Kindle library (via bookmarklet scraper)
- User-controlled fetchers for enrichment data
- No external APIs (all data stays in browser)

---

## Quality Priorities

Based on Quality Attribute Workshop (2026-02-03), ranked by importance:

### 1. **Data Integrity/Safety** (Critical)
- Books never lost (moved to parent on folder delete)
- Undo/redo for all destructive operations
- Confirmation dialogs with clear impact statements
- Circular reference prevention in folder operations
- Special folder protection (All Books, Inbox, My Library)
- Backup/restore functionality

**Why:** Personal library represents years of purchases and organization work - data loss is unacceptable.

### 2. **Usability/Learnability** (High)
- File Explorer paradigm (familiar mental model)
- Context menus with visible keyboard shortcuts
- Tooltips for hidden features (e.g., shift-click)
- Rich visual feedback (opacity, indicators, subscripts)
- Consistent interaction patterns

**Why:** Daily-use tool must be intuitive and efficient.

### 3. **Performance** (High)
- Immediate UI feedback (<100ms for interactions)
- Efficient drag-drop operations
- Sort/filter operations <1 second on 2300 books
- Config optimization (avoid unnecessary re-renders)

**Why:** Large library (2300+ books) must remain responsive.

### 4. **Flexibility/Customization** (Medium)
- Multi-column sorting (up to 3 levels)
- Custom manual ordering per folder
- Column visibility/width/order control
- Unlimited nested folders
- Per-folder vs global persistence (strategic choice)

**Why:** Different organizational strategies for different use cases.

### 5. **Maintainability/Documentation** (Medium)
- Alpha version tracking with testing
- Comprehensive session logs
- Design documentation
- Clear git commit history

**Why:** Solo developer needs to understand decisions months later.

### Intentional Non-Priorities

**Accessibility:**
- Not a focus (personal use, creator has no accessibility needs)
- Low-hanging fruit acceptable (semantic HTML, ARIA labels where easy)
- Full WCAG compliance deferred

**Internationalization:**
- English-only UI and content
- No plans for localization

**Security:**
- Local-only data (never leaves browser)
- User-controlled fetchers (no untrusted input)
- Basic XSS prevention in book titles/descriptions (good practice)

**Testability:**
- Manual testing sufficient at current scale
- Automated tests: nice to have, not required

**Browser Compatibility:**
- Chrome-only testing
- Firefox/Edge: may work, but unsupported

**Mobile/Responsive:**
- Desktop-first design
- Mobile = read-only viewing at best

---

## Current Scale & Metrics

### Library Size
- **Books:** ~2300 (personal library)
- **Storage:** 150.72 MB
- **Quota:** 557.74 GB
- **Usage:** 0.03% (storage NOT a concern)

### Performance Benchmarks
- Sort operations: <500ms on 2300 books
- Filter operations: <300ms on 2300 books
- Drag-drop: Immediate feedback, no lag
- Folder tree navigation: Instant

### Theoretical Limits
- **Books to fill quota:** ~8.5 million (67 KB per book average)
- **Practical limit:** Performance degradation likely around 50,000-100,000 books (not tested)

### Folder Organization
- **Expected depth:** 3 levels (Genre → Author → Series)
- **Maximum depth:** Unlimited (no technical restriction)
- **Practical folders:** <100 for most users

---

## Design Philosophy

### 1. **Robustness Over Features**
Better to do 10 things perfectly than 50 things poorly. Every feature must work reliably with 2300+ books.

### 2. **Familiarity Over Innovation**
Use established UI patterns (File Explorer, context menus, shift-click modifiers). Users already know how these work.

### 3. **Explicit Over Implicit**
Confirmation dialogs, clear impact statements, visible feedback. Never surprise the user with destructive actions.

### 4. **Personal Use First**
If it works for the creator's 2300-book library, it's ready. Public users are a bonus, not the goal.

### 5. **Desktop-Native Interactions**
Embrace mouse, keyboard, large screens. Don't compromise desktop UX for mobile compatibility.

---

## Quality Attribute Scenarios

### Scenario A: Scalability (Planned Test)
**Scenario:** User with 9200 books (4x current library size) sorts by 3 columns, filters by rating, drags folder with 500 books, reorders columns.
**Expected:** All operations complete in <1 second.
**Status:** Not yet tested (planned before public release).

### Scenario B: Storage Quota (Validated)
**Scenario:** Monitor storage usage for 2300-book library.
**Result:** 150.72 MB / 557.74 GB (0.03%) - storage is NOT a concern.
**Status:** ✅ Validated 2026-02-03 - no action needed.

### Scenario C: Data Recovery (Planned Test)
**Scenario:** Manually corrupt localStorage, reload app.
**Expected:** App detects corruption, shows error message, offers restore from backup or fresh start.
**Status:** Not yet tested (planned before public release).

---

## Future Considerations

### If Going Public
- Quick Firefox smoke test (30 minutes)
- Document Chrome requirement prominently
- Add browser compatibility warning for unsupported browsers
- Mobile limitation documentation ("Desktop-focused, mobile = read-only")

### Post-Launch Enhancements
- Reading progress tracking (Priority 2 in TODO.md)
- Book recommendations (Priority 2 in TODO.md)
- Wizard mode for new users (Priority 1 in TODO.md)
- See [TODO.md](TODO.md) for full roadmap

### Deferred Indefinitely
- Full accessibility audit
- Internationalization (i18n)
- Multi-store support (non-Amazon platforms)
- Mobile-optimized UI
- Automated test suite

---

## Version History

- **2026-02-03:** Initial document created during Quality Attribute Workshop
- Document reflects state at **v5.0.0-alpha.174.4** (Book Explorer multi-column sorting complete)

---

## References

- [TODO.md](../TODO.md) - Prioritized roadmap
- [FOLDER-DRAG-DROP.md](design/FOLDER-DRAG-DROP.md) - Book Explorer feature checklist
- [VIDEO-PRODUCTION-PLAN.md](design/VIDEO-PRODUCTION-PLAN.md) - Training video planning
- Quality Attribute Workshop discussion: 2026-02-03 session
