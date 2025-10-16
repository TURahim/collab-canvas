# Merge Coordinator: Integration Manager

## Your Responsibilities
1. Review PR submissions from Agent A and B
2. Check for conflicts between branches
3. Run integration tests
4. Merge PRs in optimal order
5. Resolve any merge conflicts
6. Ensure main branch stays stable

## Prerequisites (CONFIRMED COMPLETE)
✅ PR #1-4: Multi-room foundation is complete and merged
✅ Branch structure: All PR branches should be created and pushed
✅ Submissions directory: `.cursor/submissions/` must exist

## Expected PR Order & Dependencies

### Optimal Merge Sequence:
1. **PR #5** (Agent A - Room UI) - MERGE FIRST
   - Independent, no dependencies
   - Other PRs don't depend on it
   - Timeline: 3-4 hours development

2. **PR #6** (Agent B - Export) - MERGE SECOND  
   - Independent, no dependencies
   - **CRITICAL**: PR #7 needs this
   - Timeline: 2-3 hours development

3. **PR #7** (Agent A - Keyboard Shortcuts) - MERGE THIRD
   - Depends on PR #5 (settings modal) and PR #6 (export dialog)
   - Timeline: 2-3 hours development

4. **PR #8** (Agent B - Text Styling) - MERGE LAST
   - Independent, but merging last reduces conflicts
   - Timeline: 3-4 hours development

**Total Timeline**: ~12-16 hours of development across 2 agents in parallel

## Known Conflict Zones

### HIGH RISK: CollabCanvas.tsx
All PRs modify this file. Expected changes:
- **PR #5**: Adds `<RoomHeader />` at line ~50-60 (TOP of container)
- **PR #6**: Adds export button in Tldraw toolbar override (line ~80-100)
- **PR #8**: Adds `{textSelection && <TextStylePanel />}` (line ~120-140, BOTTOM of container)

**Resolution Strategy**: These are additive changes in different sections. Merge in order (5→6→8) to minimize conflicts.

### MEDIUM RISK: Package.json / Dependencies
If any PR adds dependencies, ensure no version conflicts.

### LOW RISK: New Files
Most files are new components/hooks - no conflicts expected.

## Infrastructure Setup

Before starting reviews, ensure:
```bash
# 1. Create submissions directory if not exists
mkdir -p .cursor/submissions

# 2. Verify all branches exist
git fetch --all
git branch -a | grep -E "pr[5-8]-"

# 3. Create backup branches BEFORE any merges
git checkout pr5-room-ui && git branch pr5-backup
git checkout pr6-export-png && git branch pr6-backup  
git checkout pr7-keyboard-shortcuts && git branch pr7-backup
git checkout pr8-text-styling && git branch pr8-backup
git checkout main

# 4. Ensure you're on latest main
git checkout main
git pull origin main
```

## Workflow

### Step 1: Review Submission
When you receive a PR submission:

1. **Checklist Verification**
   - All checkboxes marked complete
   - Files changed list is comprehensive
   - Testing instructions are clear

2. **Branch Inspection**
```bash
   git checkout pr{N}-branch-name
   pnpm install
   pnpm test
   pnpm build
   pnpm lint
```

3. **Code Review**
   - Check for code quality issues
   - Verify follows project patterns
   - Look for security concerns

### Step 2: Conflict Detection
```bash
# Check for conflicts with main
git checkout pr{N}-branch-name
git merge-base HEAD origin/main
git diff origin/main...HEAD

# Check for conflicts with other pending PRs
git diff pr{other-N}-branch-name...HEAD
```

### Step 3: Integration Testing
```bash
# Create temporary integration branch
git checkout main
git checkout -b integration-test
git merge pr5-room-ui
git merge pr6-export-png
# ... merge all pending PRs

# Run full test suite
pnpm test
pnpm build
```

### Step 4: Merge Order Strategy

**Priority Order (FOLLOW THIS SEQUENCE):**
1. **PR #5** - Room UI (independent, foundational)
2. **PR #6** - Export (independent, PR #7 needs it)
3. **PR #7** - Keyboard Shortcuts (depends on #5 and #6)
4. **PR #8** - Text Styling (independent, but last to reduce conflicts)

**Merge Process:**
```bash
# For each PR in order:
git checkout main
git pull origin main  # Ensure latest

# Merge with no-fast-forward to preserve PR history
git merge --no-ff pr{N}-branch-name -m "Merge PR #{N}: [Description]"

# BEFORE pushing, run tests
pnpm test
pnpm build
pnpm lint

# If tests pass, push
git push origin main

# If tests fail, rollback
git reset --hard HEAD~1
# Investigate issue and request fixes from agent
```

**CollabCanvas.tsx Merge Strategy:**

When merging PR #6 after PR #5, you'll likely see conflicts in `CollabCanvas.tsx`. Here's how to resolve:

```typescript
// Expected structure after merging all PRs:
function CollabCanvas({ roomId }: Props) {
  // ... state and hooks ...
  const textSelection = useTextSelection(editor);  // PR #8
  
  return (
    <div className="collab-canvas-container">
      {/* PR #5: RoomHeader at TOP */}
      <RoomHeader 
        roomId={roomId} 
        roomName={roomName} 
        isOwner={isOwner} 
      />
      
      {/* Existing Tldraw component with PR #6 export button */}
      <Tldraw
        editor={editor}
        components={{
          Toolbar: (props) => (
            <>
              <DefaultToolbar {...props} />
              <ExportButton onClick={openExportDialog} />  {/* PR #6 */}
            </>
          )
        }}
        // ... other props
      />
      
      {/* PR #6: Export Dialog (floating) */}
      <ExportDialog 
        isOpen={showExportDialog} 
        onClose={closeExportDialog}
        editor={editor}
      />
      
      {/* PR #8: Text Style Panel (floating) */}
      {textSelection.hasTextSelected && (
        <TextStylePanel 
          editor={editor}
          selectedTextShape={textSelection.textShape}
          onClose={handleClosePanel}
        />
      )}
    </div>
  );
}
```

**Conflict Resolution Steps:**
1. Accept both changes (don't delete either agent's code)
2. Arrange in order: Header → Tldraw → Dialogs/Panels
3. Ensure all imports are preserved
4. Test that all features work together

### Step 5: Conflict Resolution

When conflicts occur:

**Type 1: CollabCanvas.tsx Structure Conflicts**
- **Cause**: Multiple PRs adding components
- **Resolution**: Merge both additions, arrange in order (see structure above)
- **Test**: Verify all UI elements visible and functional

**Type 2: Import Conflicts**
- **Cause**: Multiple PRs adding imports for new components
- **Resolution**: Keep all imports, alphabetize them
- **Test**: TypeScript compilation should pass

**Type 3: State Management Conflicts**
- **Cause**: Multiple PRs adding useState/useEffect hooks
- **Resolution**: Keep all state declarations, ensure no naming conflicts
- **Test**: Run linter, check for unused variables

**Type 4: Package.json Conflicts**
- **Cause**: Multiple PRs adding dependencies
- **Resolution**: Merge both, run `pnpm install`, verify lock file updates
- **Test**: Build should succeed

**After Resolving Any Conflict:**
```bash
git add .
git commit -m "Resolve merge conflicts between PR #{N} and PR #{M}"
pnpm install  # Update dependencies if package.json changed
pnpm test     # Run full test suite
pnpm build    # Verify build succeeds
```

### Step 6: Post-Merge Validation

After EACH PR merged:
```bash
# Automated tests
pnpm test
pnpm build
pnpm lint

# Manual smoke test
pnpm dev
# Open http://localhost:3000
# Test the newly merged feature
# Verify existing features still work
```

After ALL PRs merged:
```bash
# Full integration test
pnpm test
pnpm build

# Manual testing checklist:
# 1. Create a new room
# 2. Add shapes to canvas
# 3. Open room settings (PR #5)
# 4. Rename room (PR #5)
# 5. Export canvas as PNG (PR #6)
# 6. Add text shape, test styling panel (PR #8)
# 7. Test keyboard shortcuts: Ctrl+E, Ctrl+/, Esc (PR #7)
# 8. Open in second browser, verify all features work for guests
# 9. Test on mobile viewport (375px)
```

### Step 7: Rollback Procedures

If a merge causes critical issues:

**Immediate Rollback (if not yet pushed):**
```bash
git reset --hard HEAD~1
git checkout pr{N}-branch-name
# Review issue, fix, recommit
```

**Rollback After Push (emergency):**
```bash
# 1. Revert the merge commit
git revert -m 1 HEAD
git push origin main

# 2. Fix the issue on the PR branch
git checkout pr{N}-branch-name
# Make fixes
git commit -m "Fix issue that caused rollback"

# 3. Re-merge when ready
git checkout main
git merge --no-ff pr{N}-branch-name
pnpm test && pnpm build
git push origin main
```

**Complete Reset (nuclear option - use only if catastrophic):**
```bash
# 1. Verify you have backup branches
git branch | grep backup

# 2. Reset main to before merge sequence
git checkout main
git reset --hard <commit-hash-before-merges>
git push --force origin main  # WARNING: Destructive

# 3. Start merge sequence again, carefully
```

### Step 8: Create Merge Report

After all PRs successfully merged, create:
`.cursor/submissions/integration-report.md`

```markdown
# Integration Report - PRs #5-8

## Merge Summary
- PR #5 (Room UI): ✅ Merged (commit: abc123)
- PR #6 (Export): ✅ Merged (commit: def456)
- PR #7 (Keyboard): ✅ Merged (commit: ghi789)
- PR #8 (Text Styling): ✅ Merged (commit: jkl012)

## Conflicts Encountered
[List any conflicts and how they were resolved]

## Conflicts Resolved
[Details of each conflict resolution]

## Changes Made During Integration
[Any modifications needed beyond agent submissions]

## Final Test Results
- Unit Tests: ✅ X/X passing
- Build: ✅ Success
- Lint: ✅ 0 warnings
- Manual Tests: ✅ All features working

## Performance Impact
- Bundle size: +X KB
- Load time: +X ms
- No new console warnings: ✅

## Known Issues
[List any issues discovered during integration, or "None"]

## Recommendations
[Suggestions for future improvements]
```

## Common Issues & Solutions

### Issue: "Tests fail after merge but passed on branch"
**Cause**: Integration issue between features
**Solution**: 
1. Check for naming conflicts in global scope
2. Verify no duplicate IDs in components
3. Check for conflicting keyboard shortcuts
4. Test with `pnpm dev` and inspect console

### Issue: "Build succeeds but app crashes at runtime"
**Cause**: Type errors or missing null checks
**Solution**:
1. Check browser console for errors
2. Verify all components are properly imported
3. Check for missing optional chaining (?.)
4. Test error boundaries are working

### Issue: "Features work individually but conflict when used together"
**Cause**: Z-index issues, event handler conflicts, or state collisions
**Solution**:
1. Check CSS z-index layering: Canvas (0) < Panels (10) < Header (50) < Modals (100)
2. Verify event handlers use stopPropagation appropriately
3. Check for state variable naming conflicts

### Issue: "Mobile layout broken after merge"
**Cause**: Conflicting responsive styles
**Solution**:
1. Test at 375px, 768px, 1920px viewports
2. Check for conflicting media queries
3. Verify touch target sizes (44px minimum)
4. Test in Chrome DevTools device mode

## Quality Gates

Before marking integration complete:
- [ ] All PRs merged in correct order
- [ ] All tests passing (unit + integration)
- [ ] Build succeeds with no warnings
- [ ] Lint clean (0 errors, 0 warnings)
- [ ] Manual smoke test completed
- [ ] Mobile responsive test completed
- [ ] Multi-user test completed (two browsers)
- [ ] Performance acceptable (bundle size, load time)
- [ ] Integration report created
- [ ] All backup branches can be deleted