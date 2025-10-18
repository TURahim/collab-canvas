# Shape Creation Persistence - Diagnostic Logging

**Date:** October 18, 2025  
**Issue:** Only initial dot being saved, not full drawn shape  
**Status:** 🔍 DIAGNOSING  
**Approach:** Comprehensive console logging to trace exact flow

---

## 🐛 **Problem Description**

User reports that when drawing a shape (e.g., rectangle), only the **initial dot** is being saved, not the final drawn shape. On refresh, the shape appears as a tiny dot instead of the full rectangle.

**Current Behavior:**
1. User clicks and starts drawing → Initial point created ✅
2. User drags to make shape bigger → Shape grows on screen ✅
3. User releases mouse → Shape appears complete on screen ✅
4. User refreshes page → **Only the initial dot reappears** ❌

---

## 🔍 **Hypothesis: The Race Condition**

### Suspected Issue

When you draw a shape in tldraw, the sequence is:

```
T+0ms:   mousedown → SHAPE CREATED (w: 0, h: 0) - tiny dot
         └─ Triggers: event.changes.added
            └─ Saves immediately to Firestore ✅
            └─ Saves snapshot immediately 📸
            
T+50ms:  mousemove → SHAPE UPDATED (w: 50, h: 50)
         └─ Triggers: event.changes.updated
            └─ Starts 300ms debounce timer ⏱️
            
T+100ms: mousemove → SHAPE UPDATED (w: 100, h: 80)
         └─ Triggers: event.changes.updated
            └─ Resets 300ms debounce timer ⏱️
            
T+150ms: mousemove → SHAPE UPDATED (w: 150, h: 120)
         └─ Triggers: event.changes.updated
            └─ Resets 300ms debounce timer ⏱️
            
T+200ms: mouseup → SHAPE FINALIZED (w: 200, h: 150)
         └─ Triggers: event.changes.updated
            └─ Resets 300ms debounce timer ⏱️
            
T+500ms: ⏰ Debounce timer fires
         └─ Writes final shape to Firestore ✅
```

**The Problem:**
If user refreshes at T+250ms (after drawing but before 300ms debounce completes):
- ❌ Snapshot has the initial tiny shape (w: 0, h: 0)
- ❌ Final shape updates haven't been written yet
- ❌ On reload: only the initial dot appears

---

## 🔬 **Diagnostic Approach**

### Comprehensive Logging Added

Added emoji-tagged console logs at every critical point to trace the exact sequence:

#### 1. **Shape Creation** (lines 448-460)
```typescript
console.log('[useShapes] 🆕 NEW SHAPE ADDED:', {
  id: shape.id,
  type: shape.type,
  source: event.source,
  x: shape.x,
  y: shape.y,
  props: shape.type === 'geo' ? {
    w: (shape.props as any).w,  // ← Check initial width/height
    h: (shape.props as any).h,
    geo: (shape.props as any).geo,
  } : 'non-geo',
  timestamp: new Date().toISOString(),
});
```

**What to look for:**
- Initial shape dimensions (w, h) - should be very small or 0
- Timestamp - note when shape is first created

#### 2. **Shape Updates** (lines 488-508)
```typescript
console.log('[useShapes] 🔄 SHAPE UPDATED (debounced 300ms):', {
  id: shape.id,
  type: shape.type,
  source: event.source,
  props: shape.type === 'geo' ? {
    w: (shape.props as any).w,  // ← Watch width/height grow
    h: (shape.props as any).h,
  } : 'non-geo',
  changed: {
    from: { w: ..., h: ... },  // ← Previous size
    to: { w: ..., h: ... },    // ← New size
  },
  timestamp: new Date().toISOString(),
});
```

**What to look for:**
- Multiple update events as you drag
- Width/height increasing with each update
- Timestamp - shows how quickly updates occur

#### 3. **Debounce Timer** (lines 76, 81-93)
```typescript
// When timer is reset (shape still being edited)
console.log('[useShapes] ⏱️ Debounce timer reset for shape:', shape.id);

// When timer fires (300ms after last update)
console.log('[useShapes] ⏰ DEBOUNCE TIMER FIRED - Writing shape to Firestore:', {
  id: shape.id,
  type: shape.type,
  props: shape.type === 'geo' ? {
    w: (shape.props as any).w,  // ← Final dimensions being saved
    h: (shape.props as any).h,
  } : 'non-geo',
});
```

**What to look for:**
- Multiple timer resets while dragging
- Timer firing 300ms after you finish drawing
- Final dimensions in the write

#### 4. **Snapshot Save** (lines 141-149)
```typescript
console.log('[useShapes] 📸 SAVING SNAPSHOT IMMEDIATELY:', {
  totalShapes: shapes.length,
  shapeDetails: shapes.map((s: any) => ({
    id: s.id,
    type: s.type,
    props: s.type === 'geo' ? { 
      w: s.props?.w,  // ← Check dimensions in snapshot
      h: s.props?.h 
    } : 'non-geo',
  })),
  timestamp: new Date().toISOString(),
});
```

**What to look for:**
- When snapshot is saved (immediately after creation?)
- Dimensions of shapes in the snapshot
- Is it capturing the initial dot or the final shape?

#### 5. **Snapshot Load** (lines 277-289)
```typescript
console.log('[useShapes] 📊 Snapshot contains:', {
  totalShapes: snapshotShapes.length,
  shapeDetails: snapshotShapes.map((s: any) => ({
    id: s.id,
    type: s.type,
    props: s.type === 'geo' ? { 
      w: s.props?.w,  // ← What dimensions are being loaded?
      h: s.props?.h,
      geo: s.props?.geo 
    } : 'non-geo',
  })),
  timestamp: new Date().toISOString(),
});
```

**What to look for:**
- Dimensions of shapes loaded from snapshot
- Do they match the initial dot or the final drawn shape?

---

## 🧪 **Testing Instructions**

### How to Use the Diagnostic Logs

1. **Open browser console** (F12 / Developer Tools)

2. **Filter console to show only useShapes logs:**
   ```
   Filter: [useShapes]
   ```

3. **Draw a shape slowly:**
   - Click and hold
   - Drag slowly to make a rectangle
   - Release after 2-3 seconds
   - **DON'T REFRESH YET**

4. **Observe the log sequence:**
   ```
   🆕 NEW SHAPE ADDED: { w: 0, h: 0 }
   📸 SAVING SNAPSHOT IMMEDIATELY: [{ w: 0, h: 0 }]  ← PROBLEM?
   🔄 SHAPE UPDATED: { from: {w:0, h:0}, to: {w:50, h:50} }
   ⏱️ Debounce timer reset
   🔄 SHAPE UPDATED: { from: {w:50, h:50}, to: {w:100, h:80} }
   ⏱️ Debounce timer reset
   🔄 SHAPE UPDATED: { from: {w:100, h:80}, to: {w:150, h:120} }
   ⏱️ Debounce timer reset
   🔄 SHAPE UPDATED: { from: {w:150, h:120}, to: {w:200, h:150} }
   ⏱️ Debounce timer reset
   [wait 300ms]
   ⏰ DEBOUNCE TIMER FIRED: { w: 200, h: 150 }
   ✅ Shape written successfully
   ```

5. **Refresh the page**

6. **Check what was loaded:**
   ```
   📂 LOADING SNAPSHOT FROM FIRESTORE
   📊 Snapshot contains: [{ w: ??, h: ?? }]  ← What values?
   ```

---

## 📊 **Expected vs Actual Behavior**

### Scenario 1: Snapshot Captured Too Early

**If snapshot shows `w: 0, h: 0`:**
```
❌ PROBLEM CONFIRMED: Snapshot is saved immediately on creation,
   capturing only the initial dot before drag updates complete
```

**Solution:**
- Remove immediate snapshot save on creation
- OR wait for shape to be "complete" before saving snapshot
- OR rely on individual shape writes instead of snapshot

### Scenario 2: Debounce Timer Not Firing

**If you don't see `⏰ DEBOUNCE TIMER FIRED` before refresh:**
```
❌ PROBLEM: You refreshed before 300ms debounce completed,
   so final shape dimensions were never written to Firestore
```

**Solution:**
- Reduce debounce time for updates (from 300ms to 100ms?)
- OR write updates immediately like we do for creation
- OR ensure snapshot waits for pending writes

### Scenario 3: Both Issues Combined

**If snapshot has `w: 0` AND debounce didn't fire:**
```
❌ DOUBLE PROBLEM:
   1. Snapshot captured initial dot immediately
   2. Updates never written due to early refresh
   
Result: Only the initial dot persists
```

**Solution:** Address both issues

---

## 🔧 **Potential Solutions**

### Option 1: Remove Immediate Snapshot on Creation ✅ RECOMMENDED
```typescript
// REMOVE THIS:
if (hasShapeCreation) {
  void saveSnapshotImmediate(editor, userId, roomId);
}
```

**Pros:**
- Let shape finish being drawn
- Snapshot will capture final state naturally
- Debounced updates will complete

**Cons:**
- Slightly longer wait for persistence (300ms)

### Option 2: Reduce Debounce Time
```typescript
const timer = setTimeout(async () => {
  // ...
}, 100); // ← Reduce from 300ms to 100ms
```

**Pros:**
- Faster persistence
- Still batches updates

**Cons:**
- More Firestore writes
- May still miss very quick refreshes

### Option 3: Write Updates Immediately (Like Creation)
```typescript
// In updated shapes handler:
writeShapeToFirestore(roomId, shape, userId); // No debounce
```

**Pros:**
- Every update persists immediately
- No chance of data loss

**Cons:**
- MANY more Firestore writes
- Could hit quota limits quickly
- Performance impact

### Option 4: Wait for "Complete" State
```typescript
// Only save snapshot when shape is no longer being edited
// Detect: no updates for 500ms = shape is complete
```

**Pros:**
- Captures final state reliably
- Fewer unnecessary snapshots

**Cons:**
- Complex logic
- Hard to detect "complete" state

---

## 🎯 **Next Steps**

1. **Run the app with logging enabled**
2. **Draw a shape and observe the console logs**
3. **Identify which scenario matches the logs**
4. **Implement the appropriate solution**
5. **Test again to verify fix**

---

## 📝 **Logging Legend**

| Emoji | Meaning | What to Check |
|-------|---------|---------------|
| 🆕 | New shape added | Initial dimensions (should be tiny) |
| 🔄 | Shape updated | Dimensions growing with each update |
| ⏱️ | Debounce timer reset | Timer keeps resetting while dragging |
| ⏰ | Debounce timer fired | Final write happening (after 300ms) |
| 📸 | Snapshot being saved | What dimensions are captured? |
| ✅ | Success | Operation completed |
| ❌ | Error | Something failed |
| 📂 | Loading snapshot | What's being loaded on refresh? |
| 📊 | Snapshot contents | Dimensions of shapes in snapshot |

---

## 🚨 **Critical Questions to Answer**

1. **What dimensions are in the snapshot?**
   - Look for `📸 SAVING SNAPSHOT IMMEDIATELY`
   - Check the `w` and `h` values
   - Are they 0/tiny or the final size?

2. **When does the snapshot get saved?**
   - Immediately after `🆕 NEW SHAPE ADDED`?
   - Or after updates complete?

3. **Does the debounce timer fire before refresh?**
   - Look for `⏰ DEBOUNCE TIMER FIRED`
   - If missing, refresh happened too quickly

4. **What gets loaded on refresh?**
   - Look for `📊 Snapshot contains`
   - Compare dimensions to what you drew

---

**Next Action:** Test with the diagnostic logs and report findings! 🔍

