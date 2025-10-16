# Memory Bank - Niche Tool Reference

This document contains critical technical knowledge about specific libraries and tools used in this project, especially for edge cases and non-obvious API patterns.

---

## 🎨 tldraw (v4.0.3)

### Text Shape Creation (CRITICAL)

**Problem:** Text shapes have a non-obvious API that's different from geometric shapes.

**Key Facts:**
1. **Rich Text Format Required:**
   - tldraw v4 uses **TipTap JSON format** for text content (not plain strings)
   - You MUST use the `toRichText()` utility function to convert strings
   - Directly setting `text: "string"` will fail with validation errors

2. **Correct Import Path:**
   ```typescript
   import { toRichText } from '@tldraw/tldraw';
   ```
   ⚠️ **IMPORTANT:** Import from `@tldraw/tldraw` (main package), NOT from `@tldraw/tlschema` or `@tldraw/utils`!
   
   **Why:** While `toRichText` is technically defined in `@tldraw/tlschema`, it's re-exported by `@tldraw/tldraw`. Importing directly from `@tldraw/tlschema` causes webpack bundling issues where `toRichText` becomes undefined at runtime, even though TypeScript compilation succeeds.
   
   **Error if wrong:**
   - `'toRichText' is not exported from '@tldraw/utils'` → Wrong package
   - `(0, _tldraw_tlschema__WEBPACK_IMPORTED_MODULE_0__.toRichText) is not a function` → Imported from `@tldraw/tlschema` instead of `@tldraw/tldraw` (webpack/ESM issue)

3. **Correct Text Shape Creation:**
   ```typescript
   // ✅ CORRECT
   editor.createShapes([{
     type: 'text',
     x: 100,
     y: 100,
     props: {
       richText: toRichText('Hello World'),  // Must use toRichText()
       w: 200,              // Width (required)
       // NO 'h' property!  // Text shapes don't accept height!
       size: 'm',           // Font size: 's', 'm', 'l', 'xl'
       color: 'black',
       autoSize: true,      // Auto-size to fit content
     }
   }]);

   // ❌ WRONG - Will fail validation
   props: {
     text: 'Hello World'  // ERROR: "Unexpected property"
   }

   // ❌ WRONG - Will fail validation
   props: {
     richText: { text: 'Hello World', type: 'text', styles: [] }  // ERROR: "Expected array"
   }

   // ❌ WRONG - Text shapes don't have height!
   props: {
     richText: toRichText('Hello'),
     w: 200,
     h: 50  // ERROR: "At shape(type = text).props.h: Unexpected property"
   }
   ```

4. **Text Shape Props (Complete List):**
   Valid properties for text shapes:
   - `richText: TLRichText` - Content (use `toRichText()`)
   - `w: number` - Width (required, constrains text wrapping)
   - ⚠️ **NO `h` (height)** - Text shapes auto-size vertically based on content!
   - `size: 's' | 'm' | 'l' | 'xl'` - Font size
   - `color: TLDefaultColorStyle` - Text color
   - `font: TLDefaultFontStyle` - Font family
   - `textAlign: TLDefaultTextAlignStyle` - Text alignment
   - `scale: number` - Scale factor
   - `autoSize: boolean` - Auto-size to content

5. **Height Management in Text Shapes:**
   **Critical:** Text shapes manage their own height automatically based on content and styling.
   
   - **Why no `h` property?** Text shapes in tldraw dynamically calculate height based on:
     - Content length (from `richText`)
     - Width constraint (`w` property causes text wrapping)
     - Font size (`size` property)
     - Line breaks and formatting in rich text
   
   - **If you need explicit height control:**
     - Use a `geo` shape (rectangle) with explicit `w` and `h`
     - Overlay/layer a text shape on top if needed
     - Or create text inside a container shape
   
   - **This is different from geo shapes:**
     ```typescript
     // Geo shapes (rectangles, etc.) - have both w and h
     editor.createShape({
       type: 'geo',
       props: { geo: 'rectangle', w: 200, h: 100 }
     });
     
     // Text shapes - only w, height is automatic
     editor.createShapes([{
       type: 'text',
       props: { richText: toRichText('text'), w: 200 }
       // Height calculated automatically!
     }]);
     ```

6. **Why This Matters:**
   - Enables rich text formatting (bold, italic, links, etc.)
   - TipTap integration allows for extensibility
   - Text flows naturally and wraps based on width
   - Breaking change from tldraw v2 → v3.10+ → v4
   - Height is dynamic, not static like geo shapes

7. **Error Messages to Watch For:**
   - `At shape(type = text).props.text: Unexpected property` → Need to use `richText` instead
   - `At shape(type = text).props.richText.content: Expected an array, got undefined` → Need to use `toRichText()` function
   - `At shape(type = text).props.h: Unexpected property` → Text shapes don't accept height! Remove `h` property
   - `Attempted import error: 'toRichText' is not exported from '@tldraw/utils'` → Wrong import path, use `@tldraw/tldraw`
   - `(0, _tldraw_tlschema__WEBPACK_IMPORTED_MODULE_0__.toRichText) is not a function` → Wrong import path, use `@tldraw/tldraw` not `@tldraw/tlschema`

---

### Geo Shape Types

**Problem:** tldraw has specific names for geo shapes that don't always match user expectations.

**Valid Geo Shape Types:**
`"cloud"`, `"rectangle"`, `"ellipse"`, `"triangle"`, `"diamond"`, `"pentagon"`, `"hexagon"`, `"octagon"`, `"star"`, `"rhombus"`, `"rhombus-2"`, `"oval"`, `"trapezoid"`, `"arrow-right"`, `"arrow-left"`, `"arrow-up"`, `"arrow-down"`, `"x-box"`, `"check-box"`, `"heart"`

**Common Aliases (mapped in our code):**
- `"circle"` → `"ellipse"` ⚠️ **Critical:** tldraw uses `"ellipse"` for circles!
- `"square"` → `"rectangle"` (square is rectangle with equal width/height)

**Implementation:**
- Use `mapToTldrawGeoType()` helper (in `canvasTools.ts`) to convert user-friendly names
- Applied in `createShape()` and `createGrid()` functions

**Error if wrong:**
- `At shape(type = geo).props.geo: Expected "cloud" or "rectangle" or "ellipse"... got circle` → Use `"ellipse"` instead of `"circle"`

---

### Color System

**Problem:** tldraw only accepts 13 specific color names (not hex codes or arbitrary names).

**Valid Colors:**
- **Standard:** `black`, `grey`, `white`, `red`, `blue`, `green`, `yellow`, `orange`, `violet`
- **Light variants:** `light-red`, `light-blue`, `light-green`, `light-violet`

**Common Synonyms (mapped in our code):**
- `pink` → `light-red`
- `purple` → `violet`
- `cyan` / `teal` → `light-blue`
- `lime` → `light-green`
- `gray` → `grey`

**Implementation:**
- Use `mapToTldrawColor()` helper (in `canvasTools.ts`) to convert user-friendly names
- Defaults to `blue` for unknown colors

---

### Shape Creation Return Types & ID Management

**Problem:** `editor.createShape()` and `editor.createShapes()` return `this` (Editor instance) for method chaining, NOT shape IDs.

**Solution - Generate IDs First:**
```typescript
import { createShapeId } from '@tldraw/tldraw';

// ✅ CORRECT - Generate ID first, pass it explicitly (works for ALL shapes)
const shapeId = createShapeId();
editor.createShape({
  id: shapeId,  // Pass the ID explicitly
  type: 'geo',
  props: { geo: 'rectangle', w: 100, h: 50 }
});
// Now you have the ID to return/use!

// ✅ CORRECT - Same pattern for text shapes
const textId = createShapeId();
editor.createShapes([{
  id: textId,
  type: 'text',
  props: { richText: toRichText('Hello') }
}]);

// ❌ WRONG - Type assertion hack (doesn't actually work!)
const shapeId = (editor.createShape({...}) as unknown) as TLShapeId;
// This compiles but shapeId is actually the Editor instance, not an ID!
// Will cause: "Cannot read properties of undefined (reading 'id')"

// ❌ WRONG - Trying to get IDs from return value
const shapeIds = editor.createShapes([{...}]);  // Returns Editor, not IDs!
createdIds.push(...shapeIds);  // ERROR: shapeIds is not iterable!
```

**Why:**
- tldraw API supports method chaining: `editor.createShape().select().zoom()`
- Both methods return `this` (Editor) to enable chaining
- For `createShapes()`, you MUST generate IDs beforehand using `createShapeId()`
- Pass IDs explicitly in the shape definition with `id: shapeId`
- This way you have the IDs available to return or use

**Errors if wrong:**
- `Spread syntax requires ...iterable[Symbol.iterator] to be a function` → Tried to spread Editor instance thinking it was an array of IDs
- `Cannot read properties of undefined (reading 'id')` → Used type assertion hack `as unknown as TLShapeId` which compiles but doesn't work at runtime (Editor instance doesn't have shape ID properties)

---

### Multiple Library Instance Warning

**Observed Issue:**
```
[tldraw] You have multiple instances of some tldraw libraries active. 
This can lead to bugs and unexpected behavior.
```

**Cause:**
- Bundler importing same library multiple times (ESM + CJS)
- Common with Next.js and tldraw integration

**Current Status:**
- Warning present but not blocking functionality
- May need webpack/Next.js config adjustments if issues arise

---

### Testing with tldraw

**Jest Configuration:**
```javascript
// jest.config.js
transformIgnorePatterns: [
  'node_modules/(?!(nanoid|jittered-fractional-indexing|fractional-indexing|@tldraw|signia|@tldraw/utils|@tldraw/editor)/)',
]
```

**Why:**
- tldraw dependencies use ESM modules
- Jest needs to transform them (normally skips node_modules)
- Must explicitly include tldraw packages in transform list

---

## 📚 Additional Tool Notes

*(Space reserved for future niche tool discoveries)*

---

## 🔄 Update Log

- **2025-10-14 (Update 6):** Fixed geo shape type mapping - tldraw uses `"ellipse"` not `"circle"`! Added `mapToTldrawGeoType()` helper to handle common aliases (circle→ellipse, square→rectangle). Applied in `createShape()` and `createGrid()`. Added complete list of valid geo shape types.
- **2025-10-14 (Update 5):** Fixed type assertion hack - `as unknown as TLShapeId` compiles but doesn't work at runtime. The Editor instance returned doesn't have ID properties. ALL shape creation (geo AND text) must use `createShapeId()` pattern. Fixed in `createMultiShapeLayout`, `createShape`, and `createGrid`.
- **2025-10-14 (Update 4):** Fixed shape ID retrieval issue - `editor.createShapes()` returns Editor (for chaining), not IDs. Must use `createShapeId()` to generate IDs first and pass them explicitly in shape definitions.
- **2025-10-14 (Update 3):** Fixed text shape height property issue - text shapes DON'T accept `h` property (auto-size vertically based on content). Added comprehensive explanation of text vs geo shape differences and height management.
- **2025-10-14 (Update 2):** Fixed critical `toRichText` import issue - must import from `@tldraw/tldraw` main package, not `@tldraw/tlschema` (causes webpack runtime error even though TypeScript compiles)
- **2025-10-14 (Initial):** Created memorybank with tldraw text shape creation, color system, return types, and Jest config notes

