# Data Status Modal States - Design Specification

**Feature**: Load-State-Only Status System
**Status**: 🚧 In Development (v3.9.0)
**Created**: 2025-12-21
**Related**: [STATUS-BAR-REDESIGN.md](STATUS-BAR-REDESIGN.md)

---

## Overview

This document specifies the complete UX design for the Data Status modal dialog, including all state combinations, button placements, messaging, and interaction patterns.

---

## UX Design Principles

### 1. Contextual Proximity
**Action buttons appear next to the status they act on**, not at the bottom of the modal requiring mental mapping.

**Example:**
```
✅ GOOD:
Library: Loaded 3 days ago ✅
         [Reload Library Anyway]

❌ BAD:
Library: Loaded 3 days ago ✅
Collections: Not loaded 🛑
[... instructions ...]
[Reload Library]  ← User thinks: "Why reload Library when Collections is the problem?"
```

### 2. Spatial Separation for Branching Instructions
When instructions have two destinations (Library vs Collections), use **two-column layout** instead of embedding choices within steps.

**Rationale**: Reduces cognitive load - users don't have to parse "step 1 OR step 1" and remember their choice across multiple steps.

### 3. Symmetric State Handling
The pattern works **regardless of which file loaded first** (Library or Collections). Same structure for both scenarios.

### 4. Explicit Button Labels
Use specific labels ("Load Library", "Reload Collections Anyway") instead of generic ("Load", "Reload") to:
- Reinforce context when file picker opens
- Prevent accidental wrong-file selection
- Build user confidence

### 5. Messaging Reflects Data Criticality
- **Library = essential**: Urgent tone when missing ("Load your library to see your books!")
- **Collections = enhancement**: Reassuring tone when missing ("Collections are optional...")

---

## Modal State Specifications

### State 1: Empty (Neither Loaded)

**When**: `libraryStatus.loadStatus === 'empty' && collectionsStatus.loadStatus === 'empty'`

**Data Status indicator**: 🛑 Must Act

**Modal content:**
```
┌──────────────────────────────────────────────┐
│  Data Status                                 │
├──────────────────────────────────────────────┤
│                                              │
│  📚 Library: Not loaded 🛑    [Load Library] │
│                                              │
│  📁 Collections: Not loaded 🛑               │
│                            [Load Collections]│
│                                              │
│  ┌─────────────────────────────────────────┐│
│  │ Load your library to get started!       ││
│  └─────────────────────────────────────────┘│
│                                              │
│  ┌─────────────────────────────────────────┐│
│  │ Don't have files yet? Get them from     ││
│  │ Amazon:                                 ││
│  ├─────────────────────────────────────────┤│
│  │                                         ││
│  │  📚 Library          📁 Collections     ││
│  │  ──────────────      ─────────────────  ││
│  │  1. Go to Amazon    1. Go to Amazon    ││
│  │     Library            Collections      ││
│  │  2. Click           2. Click           ││
│  │     bookmarklet        bookmarklet     ││
│  │  3. Choose "Import  3. Choose "Import  ││
│  │     Library"           Collections"    ││
│  │  4. Return & click  4. Return & click  ││
│  │     Load button        Load button     ││
│  │     above              above           ││
│  │                                         ││
│  └─────────────────────────────────────────┘│
│                                              │
└──────────────────────────────────────────────┘
```

**Button behavior:**
- `Load Library` → Opens file picker → Routes to `loadEnrichedData()`
- `Load Collections` → Opens file picker → Routes to `loadCollectionsData()`

**Design notes:**
- **Buttons on same line as status** (right-aligned) - universal left-to-right scan pattern
- **Emojis for visual anchoring** - 📚 Library and 📁 Collections provide consistent visual cues
- **Contextual proximity** - action buttons appear exactly where the problem is shown
- **Faster for users with files** - no question to parse, buttons immediately visible
- **Two-column instructions** - Library and Collections side-by-side
- **Simple messaging** - "Don't have files yet?" instead of Yes/No branching
- **Pattern consistency** - State 1 now follows same layout as all other states

---

### State 2: Fresh Both (Library Fresh, Collections Fresh)

**When**: `libraryStatus.loadStatus === 'fresh' && collectionsStatus.loadStatus === 'fresh'`

**Data Status indicator**: ✅ Fresh

**Modal content:**
```
┌──────────────────────────────────────────────┐
│  Data Status                                 │
├──────────────────────────────────────────────┤
│                                              │
│  📚 Library: Loaded 3 days ago ✅            │
│                          [Reload Anyway]     │
│                                              │
│  📁 Collections: Loaded 3 days ago ✅        │
│                          [Reload Anyway]     │
│                                              │
│  ┌─────────────────────────────────────────┐│
│  │ If you've made Amazon purchases or      ││
│  │ collection changes since loading:       ││
│  │                                         ││
│  │  📚 Library          📁 Collections     ││
│  │  ──────────────      ─────────────────  ││
│  │  1. Go to Amazon    1. Go to Amazon    ││
│  │     Library            Collections      ││
│  │  2. Click           2. Click           ││
│  │     bookmarklet        bookmarklet     ││
│  │  3. Choose "Import  3. Choose "Import  ││
│  │     Library"           Collections"    ││
│  │  4. Return & click  4. Return & click  ││
│  │     Reload button      Reload button   ││
│  │     above              above           ││
│  │                                         ││
│  │ Otherwise, continue organizing!         ││
│  └─────────────────────────────────────────┘│
│                                              │
└──────────────────────────────────────────────┘
```

**Button behavior:**
- `Reload Anyway` (Library) → Opens file picker → Routes to `loadEnrichedData()`
- `Reload Anyway` (Collections) → Opens file picker → Routes to `loadCollectionsData()`

**Design notes:**
- **Buttons on same line as status** (right-aligned) - consistent with all states
- **Emojis for visual anchoring** - 📚 Library and 📁 Collections
- Two-column layout prevents "step 1 OR step 1" branching confusion
- Buttons use "Anyway" to signal override intent (data is fresh)
- Both buttons always visible (solves "Fresh but just imported new data" scenario)

---

### State 3: Fresh Library, Empty/Stale Collections

**When**: `libraryStatus.loadStatus === 'fresh' && collectionsStatus.loadStatus !== 'fresh'`

**Data Status indicator**: ⚠️ Must Act (if empty), ⚠️ Stale (if stale/obsolete)

**Modal content:**
```
┌──────────────────────────────────────────────┐
│  Data Status                                 │
├──────────────────────────────────────────────┤
│                                              │
│  📚 Library: Loaded 3 days ago ✅            │
│                          [Reload Anyway]     │
│                                              │
│  📁 Collections: Not loaded 🛑               │
│                            [Load Collections]│
│  (or: Collections: Loaded 25 days ago ⚠️)    │
│                                              │
│  ┌─────────────────────────────────────────┐│
│  │ Your library is up to date! Collections ││
│  │ are optional for organizing books by    ││
│  │ Amazon's categories.                    ││
│  └─────────────────────────────────────────┘│
│                                              │
│      ┌───────────────────────────────┐      │
│      │ Don't have your Collections   │      │
│      │ file yet? Get it from Amazon: │      │
│      ├───────────────────────────────┤      │
│      │                               │      │
│      │ 📁 Collections                │      │
│      │ ─────────────────────         │      │
│      │ 1. Go to Amazon Collections   │      │
│      │ 2. Click bookmarklet          │      │
│      │ 3. Choose "Import Collections"│      │
│      │ 4. Return & click Load button │      │
│      │    above                      │      │
│      │                               │      │
│      └───────────────────────────────┘      │
│                                              │
└──────────────────────────────────────────────┘
```

**Button behavior:**
- `Reload Anyway` (Library) → Opens file picker → Routes to `loadEnrichedData()`
- `Load Collections` → Opens file picker → Routes to `loadCollectionsData()`

**Design notes:**
- **Buttons on same line as status** (right-aligned) - consistent with all states
- **Emojis for visual anchoring** - 📚 Library and 📁 Collections
- **Single-column instructions** (~60% width, centered) - visual balance, pattern consistency
- **Simplified messaging** - "Don't have your Collections file yet?" instead of Yes/No branching
- Reassuring tone: "Collections are optional" (Library is essential, user is fine)
- Reload Library button still available (user might have just imported new Library)

---

### State 4: Fresh Collections, Empty/Stale Library

**When**: `collectionsStatus.loadStatus === 'fresh' && libraryStatus.loadStatus !== 'fresh'`

**Data Status indicator**: 🛑 Must Act (if empty), ⚠️ Stale (if stale/obsolete)

**Modal content:**
```
┌──────────────────────────────────────────────┐
│  Data Status                                 │
├──────────────────────────────────────────────┤
│                                              │
│  📚 Library: Not loaded 🛑    [Load Library] │
│  (or: Library: Loaded 25 days ago ⚠️)        │
│                                              │
│  📁 Collections: Loaded 3 days ago ✅        │
│                          [Reload Anyway]     │
│                                              │
│  ┌─────────────────────────────────────────┐│
│  │ Load your library to see your books!    ││
│  └─────────────────────────────────────────┘│
│                                              │
│      ┌───────────────────────────────┐      │
│      │ Don't have your Library file  │      │
│      │ yet? Get it from Amazon:      │      │
│      ├───────────────────────────────┤      │
│      │                               │      │
│      │ 📚 Library                    │      │
│      │ ──────────────────            │      │
│      │ 1. Go to Amazon Library       │      │
│      │ 2. Click bookmarklet          │      │
│      │ 3. Choose "Import Library"    │      │
│      │ 4. Return & click Load button │      │
│      │    above                      │      │
│      │                               │      │
│      └───────────────────────────────┘      │
│                                              │
└──────────────────────────────────────────────┘
```

**Button behavior:**
- `Load Library` → Opens file picker → Routes to `loadEnrichedData()`
- `Reload Anyway` (Collections) → Opens file picker → Routes to `loadCollectionsData()`

**Design notes:**
- **Symmetric to State 3** - same structure, swapped data types
- **Buttons on same line as status** (right-aligned) - consistent with all states
- **Emojis for visual anchoring** - 📚 Library and 📁 Collections
- **Single-column instructions** (~60% width, centered) - visual balance, pattern consistency
- **Simplified messaging** - "Don't have your Library file yet?" instead of Yes/No branching
- Urgent tone: "Load your library to see your books!" (Library is essential)
- Different messaging reflects different criticality (Library essential, Collections optional)

---

### State 5: Stale Library, Stale Collections

**When**: `libraryStatus.loadStatus === 'stale' && collectionsStatus.loadStatus === 'stale'`

**Data Status indicator**: ⚠️ Stale

**Modal content:**
```
┌──────────────────────────────────────────────┐
│  Data Status                                 │
├──────────────────────────────────────────────┤
│                                              │
│  📚 Library: Loaded 15 days ago ⚠️           │
│                          [Reload Anyway]     │
│                                              │
│  📁 Collections: Loaded 15 days ago ⚠️       │
│                          [Reload Anyway]     │
│                                              │
│  ┌─────────────────────────────────────────┐│
│  │ Your data is getting old. If you've     ││
│  │ made Amazon purchases or collection     ││
│  │ changes since loading:                  ││
│  │                                         ││
│  │  📚 Library          📁 Collections     ││
│  │  ──────────────      ─────────────────  ││
│  │  1. Go to Amazon    1. Go to Amazon    ││
│  │     Library            Collections      ││
│  │  2. Click           2. Click           ││
│  │     bookmarklet        bookmarklet     ││
│  │  3. Choose "Import  3. Choose "Import  ││
│  │     Library"           Collections"    ││
│  │  4. Return & click  4. Return & click  ││
│  │     Reload button      Reload button   ││
│  │     above              above           ││
│  │                                         ││
│  │ Otherwise, continue organizing!         ││
│  └─────────────────────────────────────────┘│
│                                              │
└──────────────────────────────────────────────┘
```

**Design notes:**
- **Buttons on same line as status** (right-aligned) - consistent with all states
- **Emojis for visual anchoring** - 📚 Library and 📁 Collections
- Same structure as Fresh Both, different messaging tone
- Two-column layout for dual destinations

---

### State 6: Obsolete Library, Obsolete Collections

**When**: `libraryStatus.loadStatus === 'obsolete' && collectionsStatus.loadStatus === 'obsolete'`

**Data Status indicator**: ⚠️ Obsolete

**Modal content:**
```
┌──────────────────────────────────────────────┐
│  Data Status                                 │
├──────────────────────────────────────────────┤
│                                              │
│  📚 Library: Loaded 45 days ago ⚠️           │
│                          [Reload Anyway]     │
│                                              │
│  📁 Collections: Loaded 45 days ago ⚠️       │
│                          [Reload Anyway]     │
│                                              │
│  ┌─────────────────────────────────────────┐│
│  │ Your data is quite old. If you've made  ││
│  │ Amazon purchases or collection changes  ││
│  │ since loading:                          ││
│  │                                         ││
│  │  📚 Library          📁 Collections     ││
│  │  ──────────────      ─────────────────  ││
│  │  1. Go to Amazon    1. Go to Amazon    ││
│  │     Library            Collections      ││
│  │  2. Click           2. Click           ││
│  │     bookmarklet        bookmarklet     ││
│  │  3. Choose "Import  3. Choose "Import  ││
│  │     Library"           Collections"    ││
│  │  4. Return & click  4. Return & click  ││
│  │     Reload button      Reload button   ││
│  │     above              above           ││
│  │                                         ││
│  │ Otherwise, continue organizing!         ││
│  └─────────────────────────────────────────┘│
│                                              │
└──────────────────────────────────────────────┘
```

**Design notes:**
- **Buttons on same line as status** (right-aligned) - consistent with all states
- **Emojis for visual anchoring** - 📚 Library and 📁 Collections
- Same structure as Fresh Both and Stale Both, different messaging tone
- More urgent messaging for very old data

---

## Reset App Button & Confirmation

### Reset App Button (Status Bar)

**Location**: Status bar, below Data Status indicator

**Appearance:**
```
┌─────────────────────────────────────────────┐
│ ReaderWrangler™                             │
│ ✨ With ratings & reviews • 2,322 books     │
│ Data Status: ✅                              │
│                                             │
│ [Reset App ⓘ]                               │
│  └─ Tooltip on hover: "Click for details    │
│     about what will be reset"               │
└─────────────────────────────────────────────┘
```

**Tooltip text**: "Click for details about what will be reset"

**Design notes:**
- ⓘ info icon signals "more information available"
- "Reset App" is clearer than "Clear Library" (which sounds like deleting files)

### Reset App Confirmation Dialog

**Triggered by**: Clicking "Reset App" button

**Dialog content:**
```
┌──────────────────────────────────────────────┐
│  ⚠️  Reset ReaderWrangler                    │
├──────────────────────────────────────────────┤
│                                              │
│  This will clear all loaded data from the    │
│  app, including:                             │
│                                              │
│  • Your library (books and metadata)         │
│  • Collections and read status               │
│  • All custom columns and organization       │
│                                              │
│  ✅ Your JSON files on disk will NOT be      │
│     deleted. You can reload them anytime.    │
│                                              │
│  Are you sure you want to reset the app?     │
│                                              │
│         [Cancel]    [Reset App]              │
└──────────────────────────────────────────────┘
```

**Design notes:**
- Bullet list shows exactly what gets cleared
- **Critical reassurance**: "Your JSON files on disk will NOT be deleted"
- Two-button choice: Cancel (safe default) vs Reset App (destructive action)

---

## File Type Routing Logic

**Status**: ✅ Implemented in v3.9.0.l

**Challenge**: Single file picker must handle both Library and Collections files with different JSON structures.

**Solution**: Detect file type and route to appropriate loader function.

### JSON Structure Detection

**Library JSON:**
```javascript
{
  metadata: {
    schemaVersion: "v3.0.0",
    importerVersion: "v3.7.0",
    importDate: "2025-12-20T10:30:00Z",
    ...
  },
  books: [...]
}
```

**Collections JSON:**
```javascript
{
  type: "collections",           // ← Detection key
  guid: "...",
  schemaVersion: "v1.0",
  importerVersion: "v1.4.0",
  importDate: "2025-12-20T10:30:00Z",
  books: [...]
}
```

### Routing Function Pseudocode

```javascript
const loadDataFile = async (fileText) => {
  const parsedData = JSON.parse(fileText);

  // Detect file type
  if (parsedData.type === 'collections') {
    // Route to Collections loader
    await loadCollectionsData(fileText, (bookCount) => {
      // Success callback
    });
  } else if (parsedData.metadata && parsedData.books) {
    // Route to Library loader
    await loadEnrichedData(fileText, (bookCount) => {
      // Success callback
    });
  } else {
    // Invalid file
    throw new Error('Invalid JSON format - not a valid Library or Collections file');
  }
};
```

**Error handling:**
- If wrong file type selected: Clear error message ("This appears to be a Collections file, but you clicked Load Library. Please try again.")
- If invalid JSON: Schema validation error message

---

## Implementation Checklist

- [x] Create file type detection (v3.9.0.l - loadEnrichedData, loadCollectionsFromFile)
- [ ] Move Load buttons to contextual position in Empty state (next to status lines)
- [ ] Implement two-column instructions layout in Empty state
- [ ] Test Empty state modal displays correctly
- [ ] Test all file loading scenarios (see Testing Scenarios below)

---

## Testing Scenarios

### File Loading Tests

1. **Empty → Load Library**: Should open file picker, load library, update status
2. **Empty → Load Collections**: Should open file picker, load collections, update status
3. **Fresh Library → Load Collections**: Should load collections without affecting library
4. **Fresh Collections → Load Library**: Should load library without affecting collections
5. **Fresh Both → Reload Library**: Should reload library even when Fresh
6. **Fresh Both → Reload Collections**: Should reload collections even when Fresh

### Error Handling Tests

1. **Load Library but pick Collections file**: Should show clear error, not load
2. **Load Collections but pick Library file**: Should show clear error, not load
3. **Load invalid JSON**: Should show schema validation error
4. **Load old schema version**: Should show upgrade prompt

### State Transition Tests

1. **Empty → Fresh**: Load files within 7 days
2. **Fresh → Stale**: Simulate 8+ day gap (modify loadDate in IndexedDB)
3. **Stale → Obsolete**: Simulate 31+ day gap
4. **Any state → Empty**: Reset App should clear all data

---

## Related Documents

- [STATUS-BAR-REDESIGN.md](STATUS-BAR-REDESIGN.md) - Overall Load-State-Only architecture
- [COLLECTIONS-UI.md](COLLECTIONS-UI.md) - Collections feature implementation

---

## Revision History

- **2025-12-21**: Initial specification based on UX consultation session
