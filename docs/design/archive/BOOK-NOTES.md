# Book Notes Design

**Feature**: Personal notes on individual books
**Status**: Planned
**Created**: 2026-01-07

---

## Overview

Allow users to add personal notes to any book in their library. Notes appear in the detail modal (double-click) and provide context like "Why did I buy this?" or "Who recommended it?".

---

## Use Cases

1. **Purchase context** - "Sarah recommended - said the first half is slow but payoff is worth it"
2. **Reading reminders** - "Start at chapter 3 for the good stuff"
3. **Status tracking** - "DNF at 40%", "Re-read annually"
4. **Purchase intent** - "Wait for sale", "Get physical copy too"

---

## Design Decisions

### No Badge on Book Cover
- Notes are personal context, not glanceable status
- All 4 corners already allocated (see BADGES.md)
- Note content only meaningful when reading full text

### No Search Integration
- Notes are personal reminders, not metadata for discovery
- Title/Author search is sufficient for finding books
- Avoids complexity of full-text search on user content

### Open-Ended Length
- No character limit (like reviews)
- Some notes are short ("Sarah recommended")
- Some notes are paragraphs of context

### Optional "Has Note" Filter
- Simple boolean filter: "Show books with notes"
- Useful for reviewing your own annotations
- Deferred to future enhancement if needed

---

## Visual Design

### Sticky Note Styling
Notes display as a sticky note, echoing the brand element from the landing page hero:
- Yellow/cream background gradient
- Red thumbtack pin at top
- Handwriting-style or standard font (TBD)
- Subtle drop shadow

### Modal Layout

**When no note exists:**
```
┌────────────────────────────────────────────────────────────┐
│  [Cover]   Title                                      [X]  │
│            Author                                          │
│            Rating / Collections / etc                      │
│                                                            │
│            [Add Note]  ← small button, not a link          │
│                                                            │
│  Description                                               │
│  ─────────────────────────────────────────────────────────│
│  Lorem ipsum dolor sit amet...                             │
│                                                            │
│  Top Reviews                                               │
│  ─────────────────────────────────────────────────────────│
│  Review content...                                         │
└────────────────────────────────────────────────────────────┘
```

**When note exists:**
```
┌────────────────────────────────────────────────────────────┐
│  [Cover]   Title                                      [X]  │
│            Author                                          │
│            Rating / Collections / etc                      │
│                                                            │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  [pin]                                                │  │
│  │  "Sarah recommended - said the first half is         │  │
│  │   slow but the payoff is worth it"                   │  │
│  │                                          [pencil]    │  │
│  └──────────────────────────────────────────────────────┘  │
│            ↑ Yellow sticky note styling                    │
│                                                            │
│  Description                                               │
│  ─────────────────────────────────────────────────────────│
│  Lorem ipsum...                                            │
└────────────────────────────────────────────────────────────┘
```

---

## Interaction Design

### Entry Points

**Option 1: Modal button**
- "Add Note" button in modal (when no note exists)
- Click → sticky note appears with cursor in text area

**Option 2: Right-click context menu**
- "Add Note" (when no note) / "Edit Note" (when note exists)
- Opens modal with focus on note field

**Both options supported** - user can use whichever is more convenient.

### Adding a Note
1. Double-click book → modal opens
2. Click "Add Note" button
3. Sticky note appears with cursor in text area
4. Type note
5. Click outside or press Escape → saves automatically

### Editing a Note
1. Double-click book → modal opens, shows sticky note
2. Click pencil icon OR double-click note text
3. Text becomes editable
4. Edit note
5. Click outside or press Escape → saves automatically

**Alternative via context menu:**
1. Right-click book → "Edit Note"
2. Modal opens with focus on note field (edit mode)

### Deleting a Note
- Clear all text and click away
- Empty note = no note (not stored)
- No explicit delete button needed

---

## Data Storage

### Book Object Extension
```javascript
{
  id: "B00ABC123",
  title: "Book Title",
  author: "Author Name",
  // ... existing fields ...
  userNote: "Sarah recommended - great ending"  // NEW
}
```

### Persistence
- Stored in IndexedDB with book record
- Included in JSON backup/export
- Preserved across library re-imports (merged by book ID)

---

## CSS Styling (Reference)

Based on index.html sticky note implementation:

```css
.book-note {
  background: linear-gradient(135deg, #fff9c4 0%, #fffde7 100%);
  color: #5d4037;
  padding: 20px 15px 15px 15px;
  border-radius: 2px;
  box-shadow:
    3px 3px 0px rgba(0,0,0,0.1),
    6px 6px 0px rgba(0,0,0,0.08),
    0 4px 8px rgba(0,0,0,0.15);
  position: relative;
}

/* Red thumbtack */
.book-note::before {
  content: '';
  position: absolute;
  top: -8px;
  left: 50%;
  transform: translateX(-50%);
  width: 16px;
  height: 16px;
  background: radial-gradient(circle, #dc143c 0%, #8b0000 100%);
  border-radius: 50%;
  box-shadow: 0 2px 4px rgba(0,0,0,0.3);
}
```

---

## Implementation Notes

### Undo/Redo
- **Decision: No undo/redo for notes** (v4.21.0.e)
- Notes are like form entries - commit on Save, edit again if needed
- Simpler UX, avoids complexity with modal open/closed states

### Right-Click Menu Update
Add to existing context menu:
- "📝 Add Note" (when `!book.userNote`)
- "✏️ Edit Note" (when `book.userNote`)

Position in menu: After "Copy Title(s)", before "Set Price Goal" (single selection only)

---

## Future Enhancements

1. **"Has Note" filter** - Boolean filter in filter panel
2. **Note timestamps** - Track when note was created/modified
3. **Rich text** - Bold, italic, bullet points (probably overkill)

---

## Related Files

- `readerwrangler.js` - Modal rendering, context menu
- `docs/design/BADGES.md` - Badge corner allocations
- `index.html` - Sticky note CSS reference (hero section)
