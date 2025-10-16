# Agent B: Export & Text Styling

## Your Responsibilities
- **PR #6**: Export to PNG/SVG
- **PR #8**: Enhanced Text Styling Panel

## Branch Assignment
- PR #6: `pr6-export-png`
- PR #8: `pr8-text-styling`

## Prerequisites (CONFIRMED COMPLETE)
✅ PR #1: Multi-room routing (`/rooms` and `/room/[roomId]`)
✅ PR #2: Room metadata in Firestore (`/rooms/{id}/metadata`)
✅ PR #3: Room-scoped presence and shapes
✅ PR #4: Multi-room synchronization and testing

**You can start work immediately - foundation is ready.**

## Workflow
1. Switch to assigned branch before starting work
2. Complete PR according to specifications
3. Run tests: `pnpm test` and `pnpm build`
4. Fill out PR submission form (see template below)
5. Submit to Merge Coordinator

## IMPORTANT: PR Ordering and Dependencies

### PR #6 (Export) - START WITH THIS ONE
- **Dependencies**: None (completely independent)
- **Timeline**: 2-3 hours
- **Can test independently**: YES
- **Start immediately**: YES
- **Priority**: HIGH - Agent A needs this for PR #7

### PR #8 (Text Styling) - DO THIS SECOND
- **Dependencies**: None (independent, but wait for PR #6 to merge first)
- **Timeline**: 3-4 hours
- **Can test independently**: YES
- **Start after**: PR #6 is submitted and merged

**WORKFLOW RECOMMENDATION**: Complete PR #6 ASAP (Agent A is waiting for it), then do PR #8 after PR #6 merges.

## PR Submission Template
When PR is complete, create a file: `.cursor/submissions/pr{N}-submission.md`

```markdown
# PR #{N} Submission

## Branch
pr{N}-branch-name

## Status
- [ ] Implementation Complete
- [ ] Tests Pass (pnpm test)
- [ ] Build Succeeds (pnpm build)
- [ ] No TypeScript Errors
- [ ] Lint Clean (pnpm lint)

## Files Changed
- src/components/...
- src/hooks/...
- src/lib/...
(list all files modified or created)

## Dependencies Added
- package-name@version (if any)
- None (if no new dependencies)

## Breaking Changes
- None / List any breaking changes with migration guide

## Testing Instructions
1. Step-by-step instructions on how to test this feature
2. Expected behavior for each test case
3. Edge cases that have been tested and covered
4. Any setup required before testing

## Integration Notes
- **Dependencies on other PRs**: None / "Requires PR #{N} to be merged first"
- **Potential conflicts with**: None / "May conflict with PR #{N} in file X"
- **Merge order preference**: No preference / "Should merge after PR #{N}"
- **Affects other features**: List any features this PR impacts

## Screenshots/Demo
(If UI changes, provide screenshots or video link)
- Screenshot 1: [description]
- Screenshot 2: [description]
- Demo video: [link]

## Questions for Review
- Any concerns or decisions that need input from coordinator
- Areas where you're uncertain about the implementation
- Alternative approaches considered and why current was chosen
```

## PR #6 Specific Requirements

### Export to PNG/SVG Feature

**Files to Create:**

1. **`src/components/ExportDialog.tsx`** - Export options modal (200-250 lines)
   ```typescript
   interface ExportDialogProps {
     isOpen: boolean;
     onClose: () => void;
     editor: Editor | null;
   }
   
   // Features to implement:
   // - Format selection: Radio buttons for PNG/SVG
   // - PNG options: Quality slider (0.1-1.0), Scale dropdown (1x, 2x, 3x)
   // - Background toggle: Transparent vs white background (PNG only)
   // - Selection vs All: Export selected shapes or entire canvas
   // - Filename input: Default "canvas-YYYY-MM-DD-HHmmss"
   // - Preview: Small thumbnail of what will be exported (optional)
   // - Download button: Disabled until format selected
   // - Loading state during export
   // - Error handling and display
   // - Keyboard support: Enter to download, Esc to close
   ```

2. **`src/lib/exportCanvas.ts`** - Export utilities
   ```typescript
   export interface ExportOptions {
     format: 'png' | 'svg';
     quality?: number;        // PNG only, 0.1-1.0, default 0.92
     scale?: number;          // PNG only, 1-3, default 1
     background?: boolean;    // Include background, default true
     selectedOnly?: boolean;  // Export selection only, default false
   }
   
   export async function exportToPNG(
     editor: Editor,
     options: ExportOptions
   ): Promise<Blob>
   
   export async function exportToSVG(
     editor: Editor,
     options: ExportOptions
   ): Promise<Blob>
   
   export function downloadFile(blob: Blob, filename: string): void
   
   export function generateFilename(format: 'png' | 'svg'): string
   
   export function validateExport(editor: Editor): { valid: boolean; error?: string }
   ```

**Files to Modify:**

1. **`src/components/CollabCanvas.tsx`**
   - Add export button to tldraw UI override area
   - Manage export dialog open/close state
   - Pass editor reference to ExportDialog
   
   **⚠️ CRITICAL - CollabCanvas.tsx Placement Strategy:**
   ```typescript
   // PR #6 adds Export button - Add to Tldraw's UI override
   // DO NOT modify the RoomHeader area (PR #5's territory)
   // Structure:
   // 1. RoomHeader (PR #5 adds this)
   // 2. Tldraw with UI override (YOU add export button here)
   // 3. ExportDialog as sibling to Tldraw (floating)
   
   <Tldraw
     components={{
       Toolbar: (props) => (
         <>
           <DefaultToolbar {...props} />
           <ExportButton onClick={openExportDialog} />
         </>
       )
     }}
   />
   <ExportDialog isOpen={showExport} onClose={closeExport} editor={editor} />
   ```
   
   **Document your changes**: In your submission, note EXACTLY which lines you modified to help merge coordinator.

**Implementation Details:**

### Export Functions Architecture
```typescript
export async function exportToPNG(
  editor: Editor,
  options: ExportOptions
): Promise<Blob> {
  // Get shapes to export
  const ids = options.selectedOnly 
    ? Array.from(editor.getSelectedShapeIds())
    : editor.getCurrentPageShapeIds();
  
  if (ids.length === 0) {
    throw new Error('No shapes to export');
  }
  
  // Use tldraw's export API
  const blob = await editor.exportToBlob({
    format: 'png',
    ids,
    scale: options.scale || 1,
    background: options.background ?? true,
    quality: options.quality || 0.92,
  });
  
  // Validate file size (limit to 50MB)
  if (blob.size > 50 * 1024 * 1024) {
    throw new Error('Export file too large (max 50MB). Try reducing scale or quality.');
  }
  
  return blob;
}
```

### Filename Generation
```typescript
export function generateFilename(format: 'png' | 'svg'): string {
  const now = new Date();
  const timestamp = now.toISOString().replace(/[:.]/g, '-').slice(0, -5);
  return `canvas-${timestamp}.${format}`;
  // Example: canvas-2024-10-16-143022.png
}
```

### File Size Limits and Validation
- **Maximum export size**: 50MB (hard limit)
- **Warn if > 10MB**: Show warning but allow download
- **Empty canvas**: Show error "No shapes to export"
- **Large canvas (500+ shapes)**: Show loading indicator
- **Export time estimate**: 
  - Small (< 50 shapes): < 1 second
  - Medium (50-200 shapes): 1-3 seconds
  - Large (200-500 shapes): 3-5 seconds
  - Very large (500+ shapes): 5-10 seconds

### Error Handling
```typescript
try {
  const blob = await exportToPNG(editor, options);
  downloadFile(blob, filename);
  showSuccessToast('Canvas exported successfully');
} catch (error) {
  if (error.message.includes('too large')) {
    showErrorToast('Export too large. Try reducing quality/scale.');
  } else if (error.message.includes('No shapes')) {
    showErrorToast('Nothing to export. Add shapes first.');
  } else {
    console.error('Export failed:', error);
    showErrorToast('Export failed. Please try again.');
  }
}
```

**Testing Checklist:**

**Basic Functionality:**
- [ ] Export PNG downloads valid image file
- [ ] Export SVG downloads valid vector file
- [ ] Exported content matches canvas visually
- [ ] Transparent background option works (PNG)
- [ ] White background option works (PNG)
- [ ] SVG can be opened in Figma/Illustrator/browser
- [ ] Filename is generated correctly with timestamp

**Edge Cases:**
- [ ] Empty canvas shows error "No shapes to export"
- [ ] Selected shapes only exports selection (not entire canvas)
- [ ] Export all works when nothing selected
- [ ] Works with complex canvas (100+ shapes, test performance)
- [ ] Very large canvas (500+ shapes) shows loading indicator
- [ ] Different canvas sizes export correctly
- [ ] Canvas with images exports correctly
- [ ] Canvas with text exports correctly (fonts preserved)

**File Size & Quality:**
- [ ] Quality slider affects PNG file size (test 0.5 vs 1.0)
- [ ] Scale affects PNG dimensions (1x = 100%, 2x = 200%, 3x = 300%)
- [ ] File size > 10MB shows warning
- [ ] File size > 50MB shows error and prevents download
- [ ] SVG file size is reasonable (< 5MB for 100 shapes)

**UI/UX:**
- [ ] Export button visible in toolbar
- [ ] Export button has tooltip "Export canvas (Ctrl+E)"
- [ ] Dialog opens smoothly
- [ ] All form controls are accessible (keyboard navigation)
- [ ] Enter key triggers download
- [ ] Esc key closes dialog
- [ ] Loading state shown during export (spinner + "Exporting...")
- [ ] Success toast shown after download
- [ ] Error toast shown on failure
- [ ] Dialog closes after successful export

**Mobile Testing:**
- [ ] Export button works on mobile (test at 375px width)
- [ ] Dialog is responsive (full-screen on mobile < 768px)
- [ ] All touch targets minimum 44px × 44px
- [ ] Test on Chrome DevTools device mode

**Integration:**
- [ ] Does not conflict with RoomHeader (PR #5's area)
- [ ] Export button positioned in tldraw toolbar (not floating)
- [ ] Works in both /rooms and /room/[id] pages
- [ ] Works for both room owner and guests

**No Dependencies:** This PR is fully independent and can be developed/merged in any order. However, Agent A needs this merged for their PR #7 keyboard shortcuts.

---

## PR #8 Specific Requirements

### Enhanced Text Styling Panel

**Files to Create:**

1. **`src/components/TextStylePanel.tsx`** - Floating text formatting controls (250-300 lines)
   ```typescript
   interface TextStylePanelProps {
     editor: Editor;
     selectedTextShape: TLTextShape | null;
     onClose: () => void;
   }
   
   // Features to implement:
   // - Font size buttons: S, M, L, XL (tldraw's size values: s, m, l, xl)
   // - Text alignment buttons: Left, Center, Right (with icons)
   // - Color picker: Use tldraw's color palette (black, grey, red, orange, yellow, green, blue, violet, etc.)
   // - Font weight toggle: Normal/Bold (if tldraw supports)
   // - Panel positioning: Float near selected text, but don't obscure it
   // - Apply changes immediately (no save button needed)
   // - Panel auto-hides when text deselected
   // - Smooth animations (fade in/out)
   // - Responsive design
   ```

2. **`src/hooks/useTextSelection.ts`** - Track selected text shapes (80-100 lines)
   ```typescript
   export interface TextSelectionState {
     hasTextSelected: boolean;
     textShape: TLTextShape | null;
     currentSize: 's' | 'm' | 'l' | 'xl';
     currentAlign: 'start' | 'middle' | 'end';
     currentColor: string;
   }
   
   export function useTextSelection(editor: Editor | null): TextSelectionState {
     // Returns currently selected text shape (if any)
     // Returns null if no text shape selected
     // Returns first text shape if multiple selected
     // Updates when selection changes
     // Listens to editor's selection change events
   }
   ```

**Files to Modify:**

1. **`src/components/CollabCanvas.tsx`**
   - Add TextStylePanel as floating component
   - Track text selection with useTextSelection hook
   - Show/hide panel based on selection
   - Pass editor reference to panel
   
   **⚠️ CRITICAL - CollabCanvas.tsx Placement Strategy:**
   ```typescript
   // PR #8 adds TextStylePanel - Add as FLOATING component
   // DO NOT modify RoomHeader (PR #5) or Toolbar (PR #6)
   // Structure:
   // 1. RoomHeader (PR #5 added this)
   // 2. Tldraw with toolbar (PR #6 added export button)
   // 3. TextStylePanel (YOU add as floating/absolute positioned)
   
   const textSelection = useTextSelection(editor);
   
   return (
     <div className="collab-canvas-container">
       <RoomHeader {...} />
       <Tldraw {...} />
       {textSelection.hasTextSelected && (
         <TextStylePanel 
           editor={editor}
           selectedTextShape={textSelection.textShape}
           onClose={handleClosePanel}
         />
       )}
     </div>
   );
   ```
   
   **Document your changes**: In your submission, note EXACTLY which lines you modified.

2. **`src/lib/canvasTools.ts`** - Add text formatting helpers (optional, if needed)
   ```typescript
   export function updateTextStyle(
     editor: Editor,
     shapeId: string,
     style: Partial<TLTextShape['props']>
   ): void
   ```

**Implementation Details:**

### Panel Positioning Algorithm
```typescript
// Position panel near text but avoid covering it
function calculatePanelPosition(
  textShape: TLTextShape,
  editor: Editor
): { top: number; left: number } {
  // Get text shape's screen coordinates
  const bounds = editor.getShapePageBounds(textShape.id);
  if (!bounds) return { top: 100, left: 100 }; // fallback
  
  const viewport = editor.getViewportPageBounds();
  const screenBounds = editor.pageToScreen(bounds);
  
  // Try to position panel ABOVE text (preferred)
  let top = screenBounds.y - PANEL_HEIGHT - 12; // 12px gap
  let left = screenBounds.x;
  
  // If panel would be off-screen top, position BELOW text
  if (top < 60) { // 60px to avoid RoomHeader
    top = screenBounds.y + screenBounds.height + 12;
  }
  
  // If panel would be off-screen right, align to right edge
  if (left + PANEL_WIDTH > viewport.width) {
    left = viewport.width - PANEL_WIDTH - 20;
  }
  
  // If panel would be off-screen left, align to left edge
  if (left < 20) {
    left = 20;
  }
  
  return { top, left };
}
```

**Positioning Specifications:**
- **Panel dimensions**: 320px wide × 64px tall (compact horizontal layout)
- **Gap from text**: 12px minimum
- **Priority**: Above text > Below text > Right of text
- **Constraints**: 
  - Never cover RoomHeader (keep 60px from top)
  - Stay 20px from viewport edges
  - Reposition if text moves (e.g., canvas pan/zoom)
- **Animation**: Fade in over 200ms, move smoothly when repositioning

### Text Style Controls
```typescript
// Font size buttons (horizontal layout)
const SIZES = [
  { value: 's', label: 'S', tooltip: 'Small' },
  { value: 'm', label: 'M', tooltip: 'Medium' },
  { value: 'l', label: 'L', tooltip: 'Large' },
  { value: 'xl', label: 'XL', tooltip: 'Extra Large' },
];

// Alignment buttons
const ALIGNMENTS = [
  { value: 'start', icon: <AlignLeftIcon />, tooltip: 'Align Left' },
  { value: 'middle', icon: <AlignCenterIcon />, tooltip: 'Align Center' },
  { value: 'end', icon: <AlignRightIcon />, tooltip: 'Align Right' },
];

// Colors (use tldraw's standard palette)
const COLORS = [
  'black', 'grey', 'light-violet', 'violet', 'blue', 
  'light-blue', 'yellow', 'orange', 'green', 'light-green', 'light-red', 'red'
];
```

### Real-time Updates
```typescript
const handleSizeChange = (size: 's' | 'm' | 'l' | 'xl') => {
  if (!editor || !selectedTextShape) return;
  
  editor.updateShape({
    id: selectedTextShape.id,
    type: 'text',
    props: {
      size: size,
    },
  });
  
  // Change syncs automatically via existing realtime system
  // No additional sync code needed
};
```

**Testing Checklist:**

**Basic Functionality:**
- [ ] Panel appears when text shape selected
- [ ] Panel hides when text deselected
- [ ] Panel hides when non-text shape selected (e.g., rectangle)
- [ ] Font size changes apply immediately (test S, M, L, XL)
- [ ] Text alignment changes apply immediately (test left, center, right)
- [ ] Color changes apply immediately (test multiple colors)
- [ ] Changes persist when selecting/deselecting
- [ ] Undo/redo works correctly after style changes

**Multi-Selection:**
- [ ] Multiple text shapes selected: Panel shows first shape's properties
- [ ] Changes apply to all selected text shapes
- [ ] Mixed selection (text + shapes): Panel only shows if text included

**Positioning:**
- [ ] Panel positioned above text (preferred)
- [ ] Panel positioned below text if not enough space above
- [ ] Panel stays on-screen (doesn't go off edges)
- [ ] Panel avoids covering RoomHeader (stays below 60px from top)
- [ ] Panel repositions when canvas panned
- [ ] Panel repositions when canvas zoomed
- [ ] Panel updates position when text moved/resized

**Real-time Sync:**
- [ ] Changes sync to other users in real-time
- [ ] Other user's style changes update panel if same text selected
- [ ] No conflicts when multiple users edit same text simultaneously
- [ ] Panel updates correctly when other user deletes selected text

**UI/UX:**
- [ ] Smooth fade-in animation (200ms)
- [ ] Smooth position updates (no jumping)
- [ ] Current size/align/color highlighted in panel
- [ ] Hover states on all buttons
- [ ] Tooltips on buttons (S=Small, M=Medium, etc.)
- [ ] Keyboard accessible (Tab navigation)
- [ ] Click outside panel doesn't close it (only deselecting text closes it)

**Mobile Testing:**
- [ ] Panel responsive on mobile (test at 375px width)
- [ ] Panel doesn't exceed screen width
- [ ] Touch targets minimum 44px × 44px
- [ ] Panel positioned intelligently on small screens
- [ ] Works in both portrait and landscape
- [ ] Test on Chrome DevTools device mode

**Edge Cases:**
- [ ] Empty text shape: Panel still appears
- [ ] Text shape off-screen: Panel stays on-screen
- [ ] Rapid selection changes: Panel doesn't flicker
- [ ] Canvas at edge of zoom limits: Panel still positioned correctly
- [ ] Text tool active (typing): Panel appears and doesn't interfere
- [ ] Select text, pan far away, select again: Panel repositions correctly

**Integration:**
- [ ] Doesn't conflict with RoomHeader (PR #5's area)
- [ ] Doesn't conflict with Export button (PR #6's area)
- [ ] Works with Settings modal open (PR #5)
- [ ] Works with Export dialog open (PR #6)
- [ ] Panel z-index correct (above canvas, below modals)

**Integration Notes:**
- This PR modifies `CollabCanvas.tsx` (adds floating panel)
- Panel is absolutely positioned, shouldn't conflict with PR #5 (header) or PR #6 (toolbar button)
- Ensure z-index layering is correct: Canvas < Panel < Header < Modals

---

## Current Task Tracking

### Active Work
- **Status**: Not Started / In Progress / Complete
- **Active Branch**: (current branch name)
- **Current PR**: #{N}
- **Started**: (timestamp)
- **Estimated Completion**: (your estimate)

### Next Steps
(Update this as you work)
1. First task to complete
2. Second task to complete
3. Testing phase
4. Create submission file

### Blockers
(List any issues preventing progress)
- None / Describe blocker and what's needed to unblock

### Questions/Decisions Needed
(List anything you need clarification on)
- Question 1
- Question 2

---

## Communication Guidelines

### When to Ask for Help
- Requirements are unclear or ambiguous
- Technical blocker you can't resolve after 30 minutes
- Discovered potential breaking change
- Found conflict with another PR
- Unsure about design/UX decision

### When to Submit
- All checkboxes in submission form are checked
- You've tested locally and everything works
- You've reviewed your own code for quality
- Build and tests pass with no warnings

### Status Updates
Update the "Current Task" section:
- When you start a new PR
- At end of each work session
- When switching between PRs
- When encountering blockers

---

## Code Quality Standards

### TypeScript
- All functions must have return type annotations
- No `any` types (use `unknown` if truly unknown)
- Interfaces over type aliases for objects
- Use strict mode settings

### React Components
- Functional components with hooks only
- Props interface defined above component
- Extract complex logic into custom hooks
- Use proper TypeScript for all props

### Testing
- Write unit tests for all utility functions
- Component tests for interactive UI
- Integration tests for complex workflows
- Test edge cases and error states

### Naming Conventions
- Components: PascalCase (ExportDialog)
- Files: camelCase or kebab-case (exportCanvas.ts)
- Functions: camelCase (exportToPNG)
- Constants: UPPER_SNAKE_CASE (MAX_FILE_SIZE)

### Comments
- JSDoc for public functions
- Inline comments for complex logic only
- No commented-out code in submission
- TODO comments must have context

---

## Troubleshooting Common Issues

### "Branch is behind main"
```bash
git checkout pr{N}-branch-name
git merge main
# Resolve any conflicts
pnpm install  # Update dependencies
pnpm test     # Ensure tests still pass
```

### "Tests failing after changes"
1. Read test failure messages carefully
2. Check if you broke existing functionality
3. Update tests if behavior intentionally changed
4. Add new tests for new functionality

### "Build errors"
1. Check TypeScript errors: `pnpm tsc --noEmit`
2. Check for missing imports
3. Verify all dependencies installed
4. Clear cache: `rm -rf .next && pnpm build`

### "Merge conflicts with main"
1. Don't panic - this is normal
2. Merge main into your branch
3. Resolve conflicts carefully
4. Test thoroughly after resolution
5. Document conflict resolution in submission

### "Can't find tldraw API documentation"
1. Check project's `memorybank.md` file
2. Look at existing canvas code for examples
3. Check tldraw official docs
4. Ask in "Questions for Review" section

---

## Examples of Good Submissions

### Example: Export Feature Submission

```markdown
# PR #6 Submission: Export to PNG/SVG

## Branch
pr6-export-png

## Status
- [x] Implementation Complete
- [x] Tests Pass (pnpm test)
- [x] Build Succeeds (pnpm build)
- [x] No TypeScript Errors
- [x] Lint Clean (pnpm lint)

## Files Changed
- src/components/ExportDialog.tsx (new, 145 lines)
- src/lib/exportCanvas.ts (new, 87 lines)
- src/components/CollabCanvas.tsx (modified, added export button in toolbar)
- src/types/export.ts (new, type definitions for export options)

## Dependencies Added
None - used tldraw's built-in export functionality

## Breaking Changes
None

## Testing Instructions
1. Open canvas with several shapes
2. Click "Export" button in toolbar
3. Select PNG format
4. Click "Download" → verify PNG downloads and matches canvas
5. Select SVG format
6. Click "Download" → verify SVG downloads and can be opened in Figma/Illustrator
7. Test with transparent background option
8. Test with empty canvas → should export blank image
9. Test with 100+ shapes → should export without performance issues

## Integration Notes
- **Dependencies**: None - fully independent feature
- **Potential conflicts**: Modified CollabCanvas.tsx toolbar (lines 89-92)
  - If PR #5 also modifies toolbar, may need to merge both button additions
- **Merge order**: No preference - can merge any time
- **Performance**: Large canvases (500+ shapes) take 2-3 seconds to export

## Screenshots
- export-dialog.png: Shows export modal with format options
- export-result.png: Sample exported PNG
- toolbar-button.png: Shows export button location

## Questions for Review
- Should we add a "loading" indicator for large exports?
- Should default filename include timestamp or just generic name?
- Do we want to save user's last export preferences (format, quality)?
```

---

## Remember

- **Stay focused**: Work on one PR at a time
- **Test thoroughly**: Don't skip testing to save time
- **Communicate clearly**: Use submission form template exactly
- **Ask questions**: Better to ask than assume
- **Quality over speed**: Better to submit one great PR than two rushed ones

You are Agent B. Your work is critical to the project's success. Take pride in delivering high-quality, well-tested features that delight users.

Good luck! 🚀