# Agent A: Room UI & Keyboard Shortcuts

## Your Responsibilities
- **PR #5**: Room Settings & Permissions UI
- **PR #7**: Keyboard Shortcuts

## Branch Assignment
- PR #5: `pr5-room-ui`
- PR #7: `pr7-keyboard-shortcuts`

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

### PR #5 (Room UI) - START WITH THIS ONE
- **Dependencies**: None (all prerequisites complete)
- **Timeline**: 3-4 hours
- **Can test independently**: YES
- **Start immediately**: YES

### PR #7 (Keyboard Shortcuts) - DO THIS SECOND
- **Dependencies**: Requires PR #6 (Agent B's export feature) to be merged first
- **Timeline**: 2-3 hours  
- **Why wait**: Ctrl+E shortcut triggers export dialog from PR #6
- **Workaround for testing**: You can implement and test Esc, Ctrl+/, and ? shortcuts independently
- **Start after**: Agent B submits PR #6 and it's merged

**WORKFLOW RECOMMENDATION**: Complete PR #5 fully, then wait for Agent B to finish PR #6 before starting PR #7. This avoids cross-agent dependencies.

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

---

## PR #5 Specific Requirements

### Room Settings & Permissions UI

**Files to Create:**

1. **`src/components/RoomSettings.tsx`** - Settings modal/panel
   ```typescript
   interface RoomSettingsProps {
     roomId: string;
     onClose: () => void;
   }
   
   // Features to implement:
   // - Rename room (text input + save button)
   // - Toggle public/private (switch component)
   // - Delete room (button with confirmation dialog)
   // - Member management UI (read-only list for now)
   // - Save/Cancel buttons
   // - Loading states during operations
   // - Error handling and display
   ```

2. **`src/components/RoomHeader.tsx`** - Canvas header bar
   ```typescript
   interface RoomHeaderProps {
     roomId: string;
     roomName: string;
     isOwner: boolean;
   }
   
   // Features to implement:
   // - Display room name prominently
   // - Settings button (only visible to owner)
   // - Share button (copy link to clipboard)
   // - Back/Exit button (navigate to /rooms)
   // - User count indicator
   // - Responsive design (mobile/desktop)
   ```

**Files to Modify:**

1. **`src/components/CollabCanvas.tsx`**
   - Add RoomHeader component at the top of canvas
   - Position it so it doesn't interfere with tldraw toolbar
   - Pass necessary props (roomId, roomName, ownership status)
   - Handle settings modal open/close state
   
   **⚠️ CRITICAL - CollabCanvas.tsx Placement Strategy:**
   ```typescript
   // PR #5 adds RoomHeader - Place at line ~50-60, BEFORE Tldraw component
   // Structure should be:
   // 1. RoomHeader (your PR) - at top
   // 2. Tldraw component (existing)
   // 3. Export button will be added by PR #6 in Tldraw UI override
   // 4. Text panel will be added by PR #8 as floating component
   
   // Add this AFTER the main container div opens:
   <div className="collab-canvas-container">
     <RoomHeader roomId={roomId} roomName={roomName} isOwner={isOwner} />
     <Tldraw
       // ... existing props
     />
   </div>
   ```
   
   **Document your changes**: In your submission, note EXACTLY which lines you modified in CollabCanvas.tsx to help merge coordinator avoid conflicts with PR #6 and PR #8.

2. **`src/lib/roomManagement.ts`**
   - Add validation for room name updates (1-100 chars, no special chars)
   - Add validation for delete operations (must be owner)
   - Add error handling for all operations
   ```typescript
   export async function validateRoomUpdate(
     roomId: string,
     userId: string,
     updates: Partial<RoomMetadata>
   ): Promise<ValidationResult>
   
   export async function canDeleteRoom(
     roomId: string,
     userId: string
   ): Promise<boolean>
   ```

**Implementation Guidelines:**

### RoomSettings Component Architecture
```typescript
// State management
const [roomName, setRoomName] = useState(initialName);
const [isPublic, setIsPublic] = useState(initialPublic);
const [isLoading, setIsLoading] = useState(false);
const [error, setError] = useState(null);
const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

// Key functions to implement
const handleRename = async () => {
  // Validate name
  // Call updateRoomMetadata
  // Handle success/error
  // Show feedback to user
};

const handleTogglePublic = async () => {
  // Update isPublic flag
  // Update Firestore
  // Sync to RTDB access mirror
};

const handleDelete = async () => {
  // Show confirmation dialog
  // Delete room and all subcollections
  // Redirect to /rooms
};
```

### RoomHeader Design Requirements
- **Position**: Fixed at top of canvas, z-index above tldraw
- **Height**: 48-56px on desktop, 40-48px on mobile
- **Layout**: 
  - Left: Back button + Room name
  - Right: User count + Share button + Settings (owner only)
- **Responsive**: Stack on mobile if needed
- **Styling**: Match CollabCanvas theme, subtle background

### Permission Checks
```typescript
// Always verify ownership before showing settings
const isOwner = useCallback(() => {
  return room.owner === currentUserId || 
         room.members[currentUserId]?.role === 'owner';
}, [room, currentUserId]);

// Settings button visibility
{isOwner() && (
  
    
  
)}
```

### Delete Confirmation Dialog
```typescript
// Must show clear warning
const DeleteConfirmation = () => (
  
    Delete Room?
    
      
        This will permanently delete "{roomName}" and all its contents.
        This action cannot be undone.
      
      <TextField
        label="Type room name to confirm"
        value={confirmText}
        onChange={(e) => setConfirmText(e.target.value)}
      />
    
    
      Cancel
      <Button 
        color="error" 
        disabled={confirmText !== roomName}
        onClick={handleDelete}
      >
        Delete Permanently
      
    
  
);
```

**Testing Checklist:**
- [ ] Settings button only visible to room owner
- [ ] Non-owners cannot access settings (even via URL manipulation)
- [ ] Rename room updates everywhere (header, list, metadata)
- [ ] Rename validation works (empty, too long, special chars)
- [ ] Toggle public/private updates access immediately
- [ ] Delete confirmation requires typing room name
- [ ] Delete removes all data (metadata, shapes, RTDB presence)
- [ ] Delete redirects to /rooms page
- [ ] Share button copies correct URL to clipboard
- [ ] Back button navigates to /rooms
- [ ] All operations show loading states
- [ ] All operations handle errors gracefully
- [ ] Mobile responsive layout works (test at 375px, 768px, 1920px)
- [ ] Settings modal closes on Escape key

**Mobile Testing Requirements:**
- Test on these viewport sizes:
  - Mobile: 375px × 667px (iPhone SE)
  - Tablet: 768px × 1024px (iPad)
  - Desktop: 1920px × 1080px
- Header should be max 48px height on mobile, 56px on desktop
- Settings modal should be full-screen on mobile (< 768px)
- All touch targets minimum 44px × 44px
- Test in Chrome DevTools device mode

**Multi-User Permission Testing:**
To test permission features, you need multiple users:
1. Open room in normal browser (User A - owner)
2. Open same room in incognito window (User B - non-owner)
3. Test that User B cannot see/access settings
4. Use Firebase Auth to sign in as different users if needed
5. Check Firestore console to verify owner field in room metadata

**Integration Notes:**
- **CRITICAL DEPENDENCY**: ✅ PR #1-3 are COMPLETE (routing, room metadata, room-scoped presence)
- **Potential conflicts**: 
  - ⚠️ HIGH PROBABILITY: PR #6 may also modify CollabCanvas.tsx toolbar area
  - ⚠️ MEDIUM PROBABILITY: PR #8 may add floating UI that overlaps with header
  - ✅ NO CONFLICT: PR #7 will use your settings modal (you're building it first)
- **Merge order**: Should merge FIRST (other PRs depend on this)
- **Database impact**: Will modify Firestore metadata and RTDB access mirrors

**CollabCanvas.tsx Conflict Prevention:**
- You're adding RoomHeader at TOP of canvas container
- PR #6 will add export button in Tldraw's UI override (different location)
- PR #8 will add floating text panel (different location)
- Document your exact line numbers in submission to help merge coordinator

**Edge Cases to Handle:**
1. User deletes room while others are in it → Others see "Room deleted" message
2. Owner leaves while non-owners present → Implement ownership transfer later
3. Settings modal open when another user deletes room → Close modal, show error
4. Rename while another user is renaming → Last write wins (document this)
5. Network error during delete → Don't redirect, show error, allow retry

---

## PR #7 Specific Requirements

### Keyboard Shortcuts System

**Files to Create:**

1. **`src/hooks/useKeyboardShortcuts.ts`** - Shortcut handler hook
   ```typescript
   export interface KeyboardShortcut {
     key: string;
     ctrl?: boolean;
     shift?: boolean;
     alt?: boolean;
     action: () => void;
     description: string;
     category: 'canvas' | 'room' | 'general';
   }
   
   export function useKeyboardShortcuts(
     shortcuts: KeyboardShortcut[],
     enabled: boolean = true
   ): void
   
   // Core shortcuts to implement:
   // - Ctrl+E: Open export dialog
   // - Ctrl+/: Show help overlay
   // - Esc: Close modals/dialogs
   // - ?: Show keyboard shortcuts help
   // - Ctrl+K: Quick command palette (future)
   ```

2. **`src/components/KeyboardShortcutsHelp.tsx`** - Help overlay
   ```typescript
   interface KeyboardShortcutsHelpProps {
     isOpen: boolean;
     onClose: () => void;
   }
   
   // Features to implement:
   // - Grid layout of shortcuts by category
   // - OS-specific display (Cmd vs Ctrl)
   // - Search/filter shortcuts
   // - Keyboard navigation (Tab, Enter, Esc)
   // - Animated entrance/exit
   // - Accessible (ARIA labels, focus management)
   ```

**Files to Modify:**

1. **`src/components/CollabCanvas.tsx`**
   - Integrate useKeyboardShortcuts hook
   - Define all canvas-level shortcuts
   - Pass shortcut triggers to child components
   - Manage help overlay open/close state

2. **`src/components/RoomSettings.tsx`** (if PR #5 merged)
   - Add Esc key handler to close settings
   - Prevent shortcuts when typing in text fields

**Implementation Guidelines:**

### Shortcut Hook Architecture
```typescript
export function useKeyboardShortcuts(
  shortcuts: KeyboardShortcut[],
  enabled: boolean = true
) {
  useEffect(() => {
    if (!enabled) return;
    
    const handleKeyDown = (event: KeyboardEvent) => {
      // Ignore if typing in input/textarea
      const target = event.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.contentEditable === 'true'
      ) {
        return;
      }
      
      // Match shortcut
      const matchedShortcut = shortcuts.find(shortcut => {
        const keyMatches = event.key.toLowerCase() === shortcut.key.toLowerCase();
        const ctrlMatches = shortcut.ctrl ? (event.ctrlKey || event.metaKey) : true;
        const shiftMatches = shortcut.shift ? event.shiftKey : !event.shiftKey;
        const altMatches = shortcut.alt ? event.altKey : !event.altKey;
        
        return keyMatches && ctrlMatches && shiftMatches && altMatches;
      });
      
      if (matchedShortcut) {
        event.preventDefault();
        matchedShortcut.action();
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [shortcuts, enabled]);
}
```

### Shortcut Definitions
```typescript
const canvasShortcuts: KeyboardShortcut[] = [
  {
    key: 'e',
    ctrl: true,
    action: () => openExportDialog(),
    description: 'Export canvas',
    category: 'canvas'
  },
  {
    key: '/',
    ctrl: true,
    action: () => openHelpOverlay(),
    description: 'Show keyboard shortcuts',
    category: 'general'
  },
  {
    key: '?',
    shift: true,
    action: () => openHelpOverlay(),
    description: 'Show keyboard shortcuts',
    category: 'general'
  },
  {
    key: 'Escape',
    action: () => closeAllModals(),
    description: 'Close dialogs',
    category: 'general'
  },
  // Add more shortcuts as needed
];
```

### Help Overlay Design
```typescript
const KeyboardShortcutsHelp = ({ isOpen, onClose }: Props) => {
  const [searchTerm, setSearchTerm] = useState('');
  
  // Detect OS for display
  const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
  const modKey = isMac ? '⌘' : 'Ctrl';
  
  // Group shortcuts by category
  const groupedShortcuts = useMemo(() => {
    const filtered = allShortcuts.filter(s => 
      s.description.toLowerCase().includes(searchTerm.toLowerCase())
    );
    
    return {
      canvas: filtered.filter(s => s.category === 'canvas'),
      room: filtered.filter(s => s.category === 'room'),
      general: filtered.filter(s => s.category === 'general')
    };
  }, [searchTerm]);
  
  return (
    
      
        Keyboard Shortcuts
        ×
      
      
      
        <TextField
          placeholder="Search shortcuts..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          autoFocus
        />
        
        {Object.entries(groupedShortcuts).map(([category, shortcuts]) => (
          
            {category}
            {shortcuts.map(shortcut => (
              
                
                  {shortcut.ctrl && {modKey}}
                  {shortcut.shift && ⇧}
                  {shortcut.alt && Alt}
                  {shortcut.key.toUpperCase()}
                
                
                  {shortcut.description}
                
              
            ))}
          
        ))}
      
    
  );
};
```

### Preventing Conflicts with Text Editing
```typescript
// In useKeyboardShortcuts hook
const shouldIgnoreShortcut = (event: KeyboardEvent): boolean => {
  const target = event.target as HTMLElement;
  
  // Ignore in form elements
  if (
    target.tagName === 'INPUT' ||
    target.tagName === 'TEXTAREA' ||
    target.contentEditable === 'true'
  ) {
    return true;
  }
  
  // Ignore when tldraw text tool is active
  const editor = editorRef.current;
  if (editor && editor.getCurrentToolId() === 'text') {
    return true;
  }
  
  return false;
};
```

**Testing Checklist:**

**IMPORTANT**: Since this PR depends on PR #6, you have two testing approaches:

**Option A - Test Without PR #6 (Recommended for initial development):**
- [ ] Ctrl+/ opens help overlay
- [ ] ? key (Shift+/) opens help overlay
- [ ] Esc closes help overlay
- [ ] Esc closes settings modal (from your PR #5)
- [ ] Shortcuts don't fire when typing in text input
- [ ] Shortcuts don't fire when using tldraw text tool
- [ ] Cmd key works on Mac (in addition to Ctrl)
- [ ] Help overlay shows correct modifier key for OS
- [ ] Search filter in help overlay works
- [ ] Keyboard navigation in help overlay works (Tab, Enter)
- [ ] Help overlay is accessible (screen reader compatible)
- [ ] Multiple modals close in correct order (Esc)
- [ ] Shortcuts work across all pages (/rooms, /room/[id])
- [ ] No console errors or warnings

**Option B - Full Testing After PR #6 Merges:**
- [ ] Ctrl+E opens export dialog (requires PR #6 merged)
- [ ] All Option A tests still pass
- [ ] Export shortcut is listed in help overlay

**Testing Strategy**: Implement all shortcuts, but in submission note that Ctrl+E can only be fully tested after PR #6 merges. Create a stub/placeholder for the export dialog reference if PR #6 isn't merged yet:
```typescript
const handleExportShortcut = () => {
  // Will open export dialog when PR #6 is merged
  console.log('Export shortcut triggered (PR #6 required)');
  // TODO: Replace with actual export dialog when available
};
```

**Integration Notes:**
- **Dependencies**: 
  - ✅ PR #5 (your own work) - settings modal Esc handler
  - ⚠️ CRITICAL: Needs PR #6 (Agent B) for export dialog Ctrl+E handler - **WAIT FOR THIS**
- **Potential conflicts**: 
  - ✅ LOW RISK: PR #5 RoomSettings modal has Esc handler you control
  - Modal close priority: Last opened closes first (stack-based)
- **Merge order**: Should merge AFTER PR #5 and PR #6 (targets their features)
- **Extension points**: Design for easy addition of new shortcuts later

**IMPORTANT WORKFLOW NOTE**: 
Do NOT start this PR until:
1. You've completed and submitted PR #5
2. Agent B has submitted PR #6
3. Merge coordinator has merged PR #6 to main
4. You've pulled latest main into pr7-keyboard-shortcuts branch

This ensures you can properly test Ctrl+E shortcut. If you start too early, you'll have to create a stub and retest later.

**Advanced Features (Optional Enhancement):**
```typescript
// Command palette (future PR)
// Ctrl+K opens searchable command list
const commandPalette = {
  'Export as PNG': () => exportToPNG(),
  'Export as SVG': () => exportToSVG(),
  'Room Settings': () => openSettings(),
  'Create New Room': () => router.push('/rooms/new'),
  'Toggle Dark Mode': () => toggleTheme(),
};
```

**Accessibility Considerations:**
- All shortcuts must have visual indicators
- Help overlay must be keyboard navigable
- Focus management when opening/closing overlays
- Screen reader announcements for shortcut actions
- Don't override browser/OS shortcuts (Ctrl+T, Ctrl+W, etc.)

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
- Permission/security concern

### When to Submit
- All checkboxes in submission form are checked
- You've tested locally and everything works
- You've reviewed your own code for quality
- Build and tests pass with no warnings
- You've tested integration with dependent PRs (if applicable)

### Status Updates
Update the "Current Task" section:
- When you start a new PR
- At end of each work session
- When switching between PRs
- When encountering blockers
- When completing major milestones

---

## Code Quality Standards

### TypeScript
- All functions must have return type annotations
- No `any` types (use `unknown` if truly unknown)
- Interfaces over type aliases for objects
- Use strict mode settings
- Proper null checking (no ! operator unless absolutely necessary)

### React Components
- Functional components with hooks only
- Props interface defined above component
- Extract complex logic into custom hooks
- Proper dependency arrays for useEffect/useCallback
- Memoization only when proven necessary (useMemo/React.memo)

### State Management
- Use useState for simple local state
- Use useReducer for complex state logic
- Avoid prop drilling (use context if needed)
- Keep state as close to usage as possible

### Event Handlers
- Always use useCallback for handlers passed as props
- Prevent default/stop propagation only when necessary
- Clear, descriptive handler names (handleClick, onSubmit, etc.)

### Testing
- Write unit tests for all utility functions
- Component tests for interactive UI
- Integration tests for complex workflows
- Test edge cases and error states
- Mock external dependencies (Firestore, RTDB)

### Error Handling
```typescript
// Always wrap async operations
try {
  await updateRoomMetadata(roomId, updates);
  showSuccessToast('Room updated');
} catch (error) {
  console.error('Failed to update room:', error);
  showErrorToast('Failed to update room. Please try again.');
}

// Validate user input
const validateRoomName = (name: string): ValidationResult => {
  if (!name.trim()) {
    return { valid: false, error: 'Room name cannot be empty' };
  }
  if (name.length > 100) {
    return { valid: false, error: 'Room name too long (max 100 characters)' };
  }
  if (!/^[a-zA-Z0-9\s-_]+$/.test(name)) {
    return { valid: false, error: 'Room name contains invalid characters' };
  }
  return { valid: true };
};
```

### Naming Conventions
- Components: PascalCase (RoomSettings, RoomHeader)
- Files: Match component name (RoomSettings.tsx)
- Hooks: camelCase with 'use' prefix (useKeyboardShortcuts)
- Functions: camelCase (handleRename, validateRoom)
- Constants: UPPER_SNAKE_CASE (MAX_ROOM_NAME_LENGTH)
- Interfaces: PascalCase with descriptive names (RoomSettingsProps)

### Comments & Documentation
```typescript
/**
 * Updates room metadata with validation and error handling.
 * 
 * @param roomId - The ID of the room to update
 * @param updates - Partial metadata to update
 * @returns Promise that resolves when update completes
 * @throws {PermissionError} If user is not room owner
 * @throws {ValidationError} If updates fail validation
 */
export async function updateRoomMetadata(
  roomId: string,
  updates: Partial
): Promise
```

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
5. Run tests in isolation: `pnpm test RoomSettings`

### "Build errors"
```bash
# Check TypeScript errors
pnpm tsc --noEmit

# Check for missing imports
# Check for circular dependencies
# Verify all dependencies installed

# Clear cache and rebuild
rm -rf .next
rm -rf node_modules/.cache
pnpm build
```

### "Merge conflicts with main"
```bash
# Don't panic - conflicts are normal
git checkout pr{N}-branch-name
git merge main

# Resolve conflicts in your editor
# Look for <<<<<<< HEAD markers

# After resolving all conflicts
git add .
git commit -m "Resolve merge conflicts with main"

# Test thoroughly
pnpm test
pnpm build

# Document resolution in submission
```

### "Permission denied errors"
1. Check Firestore rules are deployed
2. Verify user is authenticated
3. Check isOwner() logic
4. Test with different user roles
5. Check console for specific error messages

### "Room metadata not syncing"
1. Check Firestore write was successful
2. Verify RTDB access mirror was updated
3. Check for network errors in console
4. Verify listeners are attached correctly
5. Test with Firebase Emulator locally

### "Settings modal won't close"
```typescript
// Ensure modal has proper close handlers
<Dialog 
  open={isOpen} 
  onClose={onClose}  // Close on backdrop click
  onKeyDown={(e) => {
    if (e.key === 'Escape') onClose();  // Close on Esc
  }}
>
```

### "Keyboard shortcuts not working"
1. Check if shortcut is registered in shortcuts array
2. Verify hook is being called with enabled=true
3. Check browser console for event listener errors
4. Test if event.preventDefault() is being called
5. Verify no input/textarea has focus
6. Check for conflicting tldraw shortcuts

---

## Examples of Good Submissions

### Example 1: Room Settings UI

```markdown
# PR #5 Submission: Room Settings & Permissions UI

## Branch
pr5-room-ui

## Status
- [x] Implementation Complete
- [x] Tests Pass (pnpm test)
- [x] Build Succeeds (pnpm build)
- [x] No TypeScript Errors
- [x] Lint Clean (pnpm lint)

## Files Changed
- src/components/RoomSettings.tsx (new, 287 lines)
- src/components/RoomHeader.tsx (new, 156 lines)
- src/components/DeleteConfirmDialog.tsx (new, 89 lines)
- src/components/CollabCanvas.tsx (modified, added header, +45 lines)
- src/lib/roomManagement.ts (modified, added validation, +67 lines)
- src/hooks/useRoomOwnership.ts (new, 34 lines)
- src/types/room.ts (modified, added RoomSettings types)
- src/styles/RoomHeader.module.css (new, responsive styles)

## Dependencies Added
None - used existing UI library components

## Breaking Changes
None - purely additive feature

## Testing Instructions

### Basic Functionality
1. Create a new room (you'll be the owner)
2. Verify RoomHeader appears at top of canvas
3. Verify settings icon is visible (you're owner)
4. Click settings → modal opens

### Rename Room
1. In settings, change room name to "Test Room 123"
2. Click "Save Changes"
3. Verify header updates immediately
4. Navigate to /rooms → verify name updated in list
5. Refresh page → verify name persisted

### Rename Validation
1. Try empty name → should show error
2. Try name with 150 chars → should show error "max 100 chars"
3. Try name with special chars (@#$%) → should show error
4. Try valid name → should succeed

### Toggle Public/Private
1. Toggle room to public
2. Open in incognito window → should be able to join
3. Toggle to private
4. Incognito window → should see "access denied"

### Delete Room
1. Click "Delete Room" button
2. Verify confirmation dialog appears
3. Try clicking "Delete" without typing name → button disabled
4. Type incorrect name → button still disabled
5. Type correct room name → button enables
6. Click "Delete" → redirects to /rooms
7. Try accessing old room URL → shows "Room not found"

### Permission Checks
1. Have another user join your room
2. Other user should NOT see settings icon
3. Other user navigating to settings directly → should see error
4. Have them try room rename via console → should fail

### Mobile Responsive
1. Test on mobile viewport (375px)
2. Header should stack elements vertically
3. Settings modal should be full-screen
4. All buttons should be touch-friendly (44px min)

### Edge Cases
1. Delete room while another user is in it → they see "Room deleted"
2. Rename to existing room name → should allow (no global uniqueness)
3. Network error during save → shows error, allows retry
4. Close modal without saving → changes discarded

## Integration Notes
- **Dependencies**: Requires PR #1-3 (routing, metadata, presence) MERGED
- **Potential conflicts**: 
  - CollabCanvas.tsx line 89-95: Added header component
  - If PR #6 also modifies toolbar, may need coordinate button placement
- **Merge order**: MUST merge before PR #7 (keyboard shortcuts need settings modal)
- **Database impact**: 
  - Updates Firestore /rooms/{roomId}/metadata on save
  - Updates RTDB /rooms/{roomId}/access on public/private toggle
  - Cascade deletes shapes, presence on room delete

## Screenshots
- room-header-desktop.png: Header on desktop (1920px)
- room-header-mobile.png: Header on mobile (375px)
- settings-modal.png: Settings modal open
- delete-confirm.png: Delete confirmation dialog
- permissions-check.png: Non-owner view (no settings button)

## Performance Notes
- Header adds ~15KB to bundle (acceptable)
- Settings modal lazy-loaded (not in initial bundle)
- Delete operation takes 1-2s for rooms with 500+ shapes
- No performance impact on canvas rendering

## Questions for Review
1. Should we add "transfer ownership" now or in future PR?
   - Current: Owner cannot leave room (must delete or transfer)
   - Proposal: Add transfer in PR #9
   
2. Delete confirmation: Is typing room name too strict?
   - Alternative: Simple "Are you sure?" with checkbox
   - Current approach prevents accidental deletes
   
3. Should settings be modal or side panel?
   - Current: Modal (better for mobile)
   - Alternative: Right-side drawer (more modern)
```

### Example 2: Keyboard Shortcuts

```markdown
# PR #7 Submission: Keyboard Shortcuts

## Branch
pr7-keyboard-shortcuts

## Status
- [x] Implementation Complete
- [x] Tests Pass (pnpm test)
- [x] Build Succeeds (pnpm build)
- [x] No TypeScript Errors
- [x] Lint Clean (pnpm lint)

## Files Changed
- src/hooks/useKeyboardShortcuts.ts (new, 145 lines)
- src/components/KeyboardShortcutsHelp.tsx (new, 234 lines)
- src/components/CollabCanvas.tsx (modified, integrated shortcuts, +38 lines)
- src/components/RoomSettings.tsx (modified, added Esc handler, +12 lines)
- src/utils/keyboardUtils.ts (new, OS detection, key formatting, 67 lines)
- src/styles/KeyboardShortcuts.module.css (new, help overlay styles)

## Dependencies Added
None

## Breaking Changes
None - purely additive feature

## Testing Instructions

### Basic Shortcuts
1. Open canvas with shapes
2. Press Ctrl+E → export dialog opens (requires PR #6)
3. Press Ctrl+/ → help overlay opens
4. Press ? (Shift+/) → help overlay opens
5. Press Esc → help overlay closes

### Modal Close Priority
1. Open settings modal (click settings button)
2. Open help overlay (press Ctrl+/)
3. Press Esc → help closes first
4. Press Esc again → settings closes
5. Verify correct close order

### Text Input Protection
1. Open settings modal
2. Click in room name input field
3. Press Ctrl+E → should NOT open export (typing in input)
4. Type "test room" normally
5. Click outside input
6. Press Ctrl+E → NOW opens export

### tldraw Text Tool Protection
1. Select text tool in tldraw
2. Click canvas to create text shape
3. Start typing
4. Press Ctrl+E → should NOT open export (editing text)
5. Click outside text shape
6. Press Ctrl+E → NOW opens export

### Help Overlay Features
1. Press Ctrl+/ to open help
2. Verify OS-specific keys shown (Cmd on Mac, Ctrl on Windows)
3. Type "export" in search box
4. Verify only export-related shortcuts shown
5. Clear search → all shortcuts visible
6. Press Tab → focus moves through shortcuts
7. Press Esc → overlay closes

### Cross-Platform
1. Test on Windows → shows "Ctrl"
2. Test on Mac → shows "⌘"
3. Test on Linux → shows "Ctrl"
4. Verify Cmd key works on Mac (in addition to Ctrl)

### Accessibility
1. Open help overlay
2. Tab through all elements → visible focus indicators
3. Press Enter on close button → closes overlay
4. Test with screen reader → all shortcuts announced

## Integration Notes
- **Dependencies**: 
  - PR #5 (Room Settings) for settings modal Esc handler
  - PR #6 (Export) for Ctrl+E export shortcut