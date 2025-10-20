# Canvas Tools Refactor - Actionable PR List

**Last Updated:** October 19, 2025  
**Status:** Planning Complete - Ready for Implementation  
**Total Estimated Effort:** 28 hours across 10 PRs

---

## 🔴 Phase 1: Critical Bug Fixes (P0 - Must Do)

### PR #1: Wrap Multi-Updates in `editor.run()`
**Priority:** 🔴 P0 (URGENT - Blocks proper undo/redo)  
**Effort:** 2 hours  
**Branch:** `fix/editor-run-transactions`

**Problem:** All multi-shape operations create N undo entries instead of 1.

**Files to Modify:**
- `src/lib/canvasTools.ts`

**Changes:**
1. Line 594-610: Wrap `moveShapeTo()` shape updates in `editor.run()`
2. Line 654-662: Wrap `moveShapesByDelta()` shape updates in `editor.run()`
3. Line 774-783: Wrap `arrangeShapes()` horizontal updates in `editor.run()`
4. Line 792-801: Wrap `arrangeShapes()` vertical updates in `editor.run()`
5. Line 810-822: Wrap `arrangeShapes()` grid updates in `editor.run()`

**Example Change:**
```typescript
// Before
valid.forEach((shape) => {
  editor.updateShape({ ... });
});

// After
editor.run(() => {
  valid.forEach((shape) => {
    editor.updateShape({ ... });
  });
});
```

**Acceptance Criteria:**
- ✅ Moving 3 shapes creates 1 undo entry, not 3
- ✅ Arranging 5 shapes creates 1 undo entry, not 5
- ✅ Single undo restores all shapes to original positions
- ✅ No linter errors
- ✅ All existing tests pass

**Testing Commands:**
```bash
npm run lint
npm test -- src/lib/__tests__/canvasTools.test.ts
npm test -- src/lib/__tests__/moveShapeTo.test.ts
```

---

### PR #2: Fix `getUnionBounds()` for Rotated Shapes
**Priority:** 🔴 P0 (URGENT - Breaks rotated shapes)  
**Effort:** 1.5 hours  
**Branch:** `fix/union-bounds-rotation`  
**Dependencies:** None

**Problem:** Uses `shape.props.w/h` which ignores rotation, groups, and transforms.

**Files to Modify:**
- `src/lib/canvasTools.ts` (lines 164-212)

**Changes:**
1. Add `editor: Editor` parameter to `getUnionBounds()`
2. Change `shapes: any[]` to `shapes: TLShape[]`
3. Replace manual width/height calculation with `editor.getShapePageBounds(shape.id)`
4. Update function signature and all callers

**Implementation:**
```typescript
// New signature
function getUnionBounds(editor: Editor, shapes: TLShape[]): {
  x: number; y: number; width: number; height: number;
  centerX: number; centerY: number;
}

// Inside loop
shapes.forEach((shape) => {
  const bounds = editor.getShapePageBounds(shape.id);
  if (!bounds) return;
  
  minX = Math.min(minX, bounds.minX);
  minY = Math.min(minY, bounds.minY);
  maxX = Math.max(maxX, bounds.maxX);
  maxY = Math.max(maxY, bounds.maxY);
});
```

**Callers to Update:**
- Line 572: `moveShapeTo()` - Pass `editor` as first param

**Acceptance Criteria:**
- ✅ Rotated rectangle (45°) moves correctly to center
- ✅ Multiple rotated shapes preserve relative layout
- ✅ Union bounds calculation matches visual bounding box
- ✅ No linter errors
- ✅ Type safety: no `any[]` types

**Testing Commands:**
```bash
npm run lint
npm test -- src/lib/__tests__/moveShapeTo.test.ts
# Manual: Create shape, rotate 45°, select, say "move to center"
```

---

### PR #3: Move Selection Inside Transactions
**Priority:** 🟡 P1  
**Effort:** 1 hour  
**Branch:** `fix/selection-transactions`  
**Dependencies:** PR #1

**Problem:** Selection changes happen outside transactions.

**Files to Modify:**
- `src/lib/canvasTools.ts`

**Locations to Fix:**
- Lines 360-378: `createShape()` text branch
- Lines 380-396: `createShape()` geo branch
- Lines 437-455: `createTextShape()`
- Lines 876-895: `createGrid()`
- Lines 1025-1035: `createLoginForm()`
- Lines 1154-1163: `createCard()`
- Lines 1254-1263: `createNavigationBar()`
- Lines 1376-1385: `createCheckboxList()`

**Pattern:**
```typescript
// Before
const shapeId = createShapeId();
editor.createShape({ ... });
editor.select(shapeId);

// After
const shapeId = createShapeId();
editor.run(() => {
  editor.createShape({ ... });
  editor.select(shapeId);
});
```

**Acceptance Criteria:**
- ✅ Creating shape, then undo → shape deleted AND deselected
- ✅ Creating login form, then undo → all 8 shapes deleted AND deselected
- ✅ No linter errors
- ✅ All creation functions work as before

**Testing Commands:**
```bash
npm run lint
npm test -- src/lib/__tests__/canvasTools.test.ts
# Manual: Create shape, undo, verify selection cleared
```

---

## 🟡 Phase 2: Native API Adoption (P1 - Should Do)

### PR #4: Use Bulk `createShapes()` in Multi-Shape Layouts
**Priority:** 🟡 P1  
**Effort:** 2 hours  
**Branch:** `refactor/bulk-create-shapes`  
**Dependencies:** PR #3

**Problem:** `createMultiShapeLayout()` loops calling mixed APIs.

**Files to Modify:**
- `src/lib/canvasTools.ts` (lines 256-311)

**Changes:**
1. Refactor `createMultiShapeLayout()` to accumulate all shape definitions
2. Call `editor.createShapes([...])` once at end
3. Simplify logic, remove loop

**Implementation:**
```typescript
function createMultiShapeLayout(
  editor: Editor,
  shapes: ShapeDefinition[]
): TLShapeId[] {
  const tlShapes = shapes.map(def => {
    const shapeId = createShapeId();
    
    if (def.shapeType === 'rectangle') {
      return {
        id: shapeId,
        type: 'geo' as const,
        x: def.x - def.width / 2,
        y: def.y - def.height / 2,
        props: {
          geo: 'rectangle',
          w: def.width,
          h: def.height,
          color: (def.color as TldrawColor) || 'black',
          fill: 'solid' as const,
        },
      };
    } else { // text
      return {
        id: shapeId,
        type: 'text' as const,
        x: def.x - def.width / 2,
        y: def.y - def.height / 2,
        props: {
          richText: toRichText(def.text || ''),
          w: def.width,
          size: mapFontSize(def.fontSize || 16),
          color: (def.color as TldrawColor) || 'black',
          autoSize: false,
        },
      };
    }
  });
  
  editor.createShapes(tlShapes);
  return tlShapes.map(s => s.id);
}
```

**Acceptance Criteria:**
- ✅ Login form creates 8 shapes correctly
- ✅ Card creates 7 shapes correctly
- ✅ Navigation bar creates N shapes correctly
- ✅ Checkbox list creates 2+N*2 shapes correctly
- ✅ Visual output identical to before
- ✅ No linter errors

**Testing Commands:**
```bash
npm run lint
npm test -- src/lib/__tests__/canvasTools.test.ts
# Manual: Create login form, card, nav bar, checkbox list
```

---

### PR #5: Research & Implement Native Alignment APIs
**Priority:** 🟡 P1  
**Effort:** 4 hours  
**Branch:** `refactor/native-align-distribute`  
**Dependencies:** PR #1

**Problem:** Custom manual positioning logic in `arrangeShapes()`.

**Files to Modify:**
- `src/lib/canvasTools.ts` (lines 733-824)

**Research Tasks:**
1. ✅ Check TLDraw v4 docs for `editor.alignShapes()`
2. ✅ Check TLDraw v4 docs for `editor.distributeShapes()`
3. ✅ Test if custom spacing is supported

**Two Paths:**

**Path A: If Native APIs Exist with Spacing Support**
```typescript
export function arrangeShapes(
  editor: Editor,
  params: ArrangeShapesParams
): void {
  const { shapeIds, pattern, spacing = 20 } = params;
  
  editor.run(() => {
    if (pattern === 'horizontal') {
      editor.alignShapes(shapeIds, 'middle');
      editor.distributeShapes(shapeIds, 'horizontal', { spacing });
    } else if (pattern === 'vertical') {
      editor.alignShapes(shapeIds, 'center');
      editor.distributeShapes(shapeIds, 'vertical', { spacing });
    } else if (pattern === 'grid') {
      // Keep custom grid logic wrapped in editor.run()
    }
  });
}
```

**Path B: If Native APIs Don't Support Spacing**
Keep existing logic but ensure all branches wrapped in `editor.run()`.

**Acceptance Criteria:**
- ✅ Horizontal arrangement matches existing output
- ✅ Vertical arrangement matches existing output
- ✅ Grid arrangement works correctly
- ✅ Custom spacing parameter honored
- ✅ All wrapped in `editor.run()`
- ✅ No linter errors

**Testing Commands:**
```bash
npm run lint
npm test -- src/lib/__tests__/canvasTools.test.ts
# Manual: Arrange 5 shapes horizontally/vertically/grid
```

---

### PR #6: Investigate `nudgeShapes()` for Delta Movement
**Priority:** 🟢 P2  
**Effort:** 1 hour  
**Branch:** `refactor/nudge-shapes`  
**Dependencies:** PR #1

**Problem:** `moveShapesByDelta()` manually updates x/y.

**Files to Modify:**
- `src/lib/canvasTools.ts` (lines 629-670)

**Research:**
1. ✅ Check if `editor.nudgeShapes(ids, { x, y })` exists in v4

**Implementation (if exists):**
```typescript
function moveShapesByDelta(
  editor: Editor,
  params: { target: any; deltaX: number; deltaY: number }
): { ... } {
  // ... validation logic ...
  
  const validIds = valid.map(s => s.id);
  
  editor.run(() => {
    editor.nudgeShapes(validIds, { x: params.deltaX, y: params.deltaY });
  });
  
  return { ... };
}
```

**Fallback:** Keep manual updates with `editor.run()`.

**Acceptance Criteria:**
- ✅ Delta movement works identically
- ✅ Wrapped in `editor.run()`
- ✅ No linter errors

**Testing Commands:**
```bash
npm test -- src/lib/__tests__/moveShapeTo.test.ts
```

---

## 🟢 Phase 3: Code Quality (P2 - Nice to Have)

### PR #7: Extract `resolveTarget()` Helper & Add Logger
**Priority:** 🟡 P1  
**Effort:** 2 hours  
**Branch:** `refactor/extract-helpers`  
**Dependencies:** PR #2

**Problem:** Duplicate target resolution logic + console.log() everywhere.

**Files to Modify:**
- `src/lib/canvasTools.ts`

**Changes:**

**Part 1: Extract Helper**
```typescript
/**
 * Resolve target specification to array of shapes
 */
function resolveTarget(
  editor: Editor,
  target: 'selected' | 'all' | TLShapeId | TLShapeId[]
): TLShape[] {
  if (target === 'selected') {
    return editor.getSelectedShapes();
  } else if (target === 'all') {
    return editor.getCurrentPageShapes();
  } else if (Array.isArray(target)) {
    return target.map(id => editor.getShape(id)).filter(Boolean) as TLShape[];
  } else {
    const shape = editor.getShape(target as TLShapeId);
    return shape ? [shape] : [];
  }
}
```

**Usage:** Replace lines 543-557 and 634-644.

**Part 2: Logger Abstraction**
```typescript
// At top of file
const logger = {
  debug: (msg: string, ...args: any[]) => {
    if (process.env.NODE_ENV === 'development') {
      console.log(`[canvasTools] ${msg}`, ...args);
    }
  },
  info: (msg: string, ...args: any[]) => console.info(`[canvasTools] ${msg}`, ...args),
  error: (msg: string, ...args: any[]) => console.error(`[canvasTools] ${msg}`, ...args),
};
```

**Replace `console.log()` at lines:**
358, 435, 486, 611, 698, 757, 861, 937, 1074, 1201, 1306

**Acceptance Criteria:**
- ✅ No code duplication in target resolution
- ✅ Logs appear in dev, silent in prod build
- ✅ No linter errors

**Testing Commands:**
```bash
npm run lint
npm run build
# Check production build has no console.log
```

---

### PR #8: Fix Type Safety Gaps
**Priority:** 🟢 P2  
**Effort:** 2 hours  
**Branch:** `refactor/type-safety`  
**Dependencies:** PR #2

**Problem:** Multiple `any` types, missing type imports.

**Files to Modify:**
- `src/lib/canvasTools.ts`

**Changes:**
1. Import proper types from tldraw
2. Fix function signatures
3. Fix local variables

**Implementation:**
```typescript
// Add imports
import type { TLShape, TLShapePartial } from '@tldraw/tldraw';

// Fix getUnionBounds (done in PR #2)
function getUnionBounds(editor: Editor, shapes: TLShape[]): { ... }

// Fix validateMovableShapes
function validateMovableShapes(editor: Editor, shapes: TLShape[]): {
  valid: TLShape[];
  invalid: Array<{ shape: TLShape | null; reason: string }>;
}

// Fix transformShape
const updates: TLShapePartial = {
  id: shapeId,
  type: shape.type,
};

if (shape.type === 'geo' && (scaleX !== undefined || scaleY !== undefined)) {
  const currentProps = shape.props as { w: number; h: number };
  updates.props = {
    w: scaleX !== undefined ? currentProps.w * scaleX : currentProps.w,
    h: scaleY !== undefined ? currentProps.h * scaleY : currentProps.h,
  };
}
```

**Locations:**
- Line 171: `shapes: any[]` → `shapes: TLShape[]`
- Line 222: `shapes: any[]` → `shapes: TLShape[]`
- Line 705: `updates: any` → `TLShapePartial`
- Line 712: Remove `as any`
- Line 764, 774, 792, 810: `shape: any` → proper typing in loops

**Acceptance Criteria:**
- ✅ No `any` types remain
- ✅ No type casting with `as any`
- ✅ All functions properly typed
- ✅ No linter errors
- ✅ TypeScript strict mode passes

**Testing Commands:**
```bash
npm run lint
npx tsc --noEmit
```

---

### PR #9: Update Comments & Add JSDoc
**Priority:** 🟢 P2  
**Effort:** 1 hour  
**Branch:** `docs/improve-jsdoc`  
**Dependencies:** None

**Problem:** Misleading comments, missing error documentation.

**Files to Modify:**
- `src/lib/canvasTools.ts`

**Changes:**

**1. Fix Misleading Comment (line 504)**
```typescript
// Before
* Uses editor.batch() for single undo/redo entry

// After
* Uses editor.run() to group updates into single transaction
```

**2. Add JSDoc `@throws` Tags**

Example for `moveShapeTo()`:
```typescript
/**
 * Move shapes to absolute position (supports keywords)
 * 
 * @param editor - tldraw editor instance
 * @param params - Move parameters with keyword support
 * @returns Result with count, moved IDs, skipped shapes, and whether movement occurred
 * @throws {Error} If editor is not provided
 * @throws {Error} If no shapes are selected (when target='selected')
 * @throws {Error} If no movable shapes found (all locked/invalid)
 * @throws {Error} If neither x, y, deltaX, nor deltaY provided
 */
export function moveShapeTo(...): ... { }
```

**Apply to:**
- `createShape()`
- `createTextShape()`
- `moveShape()`
- `moveShapeTo()`
- `transformShape()`
- `arrangeShapes()`
- `createGrid()`

**Acceptance Criteria:**
- ✅ All exported functions have complete JSDoc
- ✅ All `@throws` conditions documented
- ✅ No misleading comments
- ✅ VSCode IntelliSense shows error conditions

**Testing Commands:**
```bash
npm run lint
# Manual: Hover over functions in VSCode
```

---

## 🔵 Phase 4: Optional (P3 - Future)

### PR #10: Deprecate `moveShape()` & Add Selection Control
**Priority:** 🟢 P3  
**Effort:** 2 hours  
**Branch:** `refactor/api-improvements`  
**Dependencies:** All Phase 1-3 PRs

**Problem:** `moveShape()` superseded, no selection control.

**Files to Modify:**
- `src/lib/canvasTools.ts`

**Part 1: Deprecate `moveShape()`**
```typescript
/**
 * @deprecated Use moveShapeTo() instead for better flexibility
 */
export function moveShape(
  editor: Editor,
  params: MoveShapeParams
): void {
  if (process.env.NODE_ENV === 'development') {
    console.warn('moveShape() is deprecated. Use moveShapeTo() instead.');
  }
  
  moveShapeTo(editor, {
    target: params.shapeId,
    deltaX: params.deltaX,
    deltaY: params.deltaY,
  });
}
```

**Part 2: Add Selection Control**
```typescript
export interface CreateShapeParams {
  // ... existing params
  autoSelect?: boolean; // Default: true
}

export function createShape(editor: Editor, params: CreateShapeParams): TLShapeId {
  const { autoSelect = true, ...rest } = params;
  
  const shapeId = createShapeId();
  editor.run(() => {
    editor.createShape({ ... });
    if (autoSelect) {
      editor.select(shapeId);
    }
  });
  
  return shapeId;
}
```

**Apply to:** All creation functions.

**Acceptance Criteria:**
- ✅ `moveShape()` shows deprecation warning in dev
- ✅ `moveShape()` forwards to `moveShapeTo()`
- ✅ `autoSelect: false` skips selection
- ✅ `autoSelect: true` (default) selects as before
- ✅ No linter errors

**Testing Commands:**
```bash
npm run lint
# Manual: Call moveShape, see warning
# Manual: Create shape with autoSelect: false
```

---

## 📊 Implementation Timeline

### Week 1: Critical Fixes (P0)
- **Day 1-2:** PR #1 (editor.run())
- **Day 2-3:** PR #2 (union bounds)
- **Day 3:** PR #3 (selection transactions)
- **Day 4:** Testing & bug fixes

### Week 2: Native APIs (P1)
- **Day 1:** PR #4 (bulk createShapes)
- **Day 2-3:** PR #5 (align/distribute research & implementation)
- **Day 3:** PR #6 (nudgeShapes research)
- **Day 4:** Testing & integration

### Week 3: Code Quality (P2)
- **Day 1:** PR #7 (helpers & logger)
- **Day 2:** PR #8 (type safety)
- **Day 3:** PR #9 (docs)
- **Day 4:** Final testing

### Week 4: Optional (P3) - If Time Permits
- **Day 1:** PR #10 (deprecations & selection control)
- **Day 2-4:** Module split (not planned in detail yet)

---

## 🎯 Success Metrics

### After Phase 1 (Must Have)
- ✅ 0 undo/redo bugs
- ✅ Rotated shapes move correctly
- ✅ Single undo entry for multi-shape ops
- ✅ All tests pass

### After Phase 2 (Should Have)
- ✅ Bulk APIs used everywhere possible
- ✅ Code simplified by 20%+
- ✅ All tests pass

### After Phase 3 (Nice to Have)
- ✅ 0 `any` types
- ✅ 0 console.log in production
- ✅ 100% JSDoc coverage on public API
- ✅ All tests pass

---

## 📝 PR Template

Use this template for all PRs:

```markdown
## Summary
[Brief description of what this PR fixes/improves]

## Problem
[Describe the issue being solved]

## Solution
[Explain the approach taken]

## Changes
- [ ] File 1: [description]
- [ ] File 2: [description]

## Testing
- [ ] Manual testing completed
- [ ] Unit tests pass
- [ ] Linter passes
- [ ] TypeScript compiles

## Screenshots/GIFs
[If UI changes, show before/after]

## Related Issues
Fixes #[issue number]

## Checklist
- [ ] Code follows project style
- [ ] Tests added/updated
- [ ] Documentation updated
- [ ] No breaking changes (or documented)
- [ ] Ready for review
```

---

## 🚀 Getting Started

1. **Create feature branch:**
   ```bash
   git checkout -b fix/editor-run-transactions
   ```

2. **Make changes following PR plan**

3. **Test thoroughly:**
   ```bash
   npm run lint
   npm test
   npm run build
   ```

4. **Commit with conventional commits:**
   ```bash
   git commit -m "fix: wrap multi-shape updates in editor.run() for single undo entry"
   ```

5. **Push and create PR:**
   ```bash
   git push origin fix/editor-run-transactions
   ```

---

**Total PRs:** 10  
**Estimated Time:** 28 hours  
**Timeline:** 3-4 weeks  
**Priority PRs:** #1, #2, #3 (Must complete first)

**Status:** 📋 Ready for Implementation

