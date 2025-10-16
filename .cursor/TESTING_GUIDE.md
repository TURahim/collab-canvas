# Testing Guide: PRs #5 & #6

**Features to Test**:
- PR #5: Room Settings & Permissions UI
- PR #6: Export to PNG/SVG

---

## Quick Start

### 1. Start the Development Server

```bash
cd /Users/tahmeedrahim/Projects/collab-canvas
pnpm dev
```

The app will be available at: `http://localhost:3000`

### 2. Open in Browser

Open your browser and navigate to `http://localhost:3000`

---

## Testing PR #5: Room Settings & Permissions UI

### Prerequisites
Make sure you have Firebase configured in your `.env.local` file.

### Test 1: Room Header Displays

**Steps**:
1. Open the app at `http://localhost:3000`
2. If prompted, enter a display name
3. Look at the **top of the page**

**Expected Results**:
- ✅ You should see a room header bar at the top
- ✅ Shows room name (e.g., "Your Name's Room")
- ✅ Shows "1 user online" or user count
- ✅ Has a "Back" button (arrow icon)
- ✅ Has a "Share" button
- ✅ Has a "Settings" button (gear icon) - **only if you're the room owner**

### Test 2: Share Button Copies Link

**Steps**:
1. Click the **Share** button in the room header
2. Watch for feedback

**Expected Results**:
- ✅ A tooltip appears saying "Link copied!"
- ✅ The room URL is copied to your clipboard
- ✅ You can paste it in another tab/window

### Test 3: Room Settings Modal (Owner Only)

**Steps**:
1. Click the **Settings** button (gear icon) in the room header
2. The settings modal should open

**Expected Results**:
- ✅ Modal opens centered on screen
- ✅ Shows "Room Settings" title
- ✅ Has a room name input field with current name
- ✅ Has a "Public Room" toggle switch
- ✅ Has Cancel and Save buttons
- ✅ Has a red "Delete Room" button in "Danger Zone" section

### Test 4: Rename Room

**Steps**:
1. Open room settings (gear icon)
2. Change the room name in the text field
3. Click **Save Changes**

**Expected Results**:
- ✅ Modal closes
- ✅ Room name updates in the header
- ✅ No errors appear

### Test 5: Real-time Name Validation

**Steps**:
1. Open room settings
2. Try these inputs:
   - Empty name (clear the field)
   - Very long name (type 150+ characters)
   - Special characters: `@#$%`

**Expected Results**:
- ✅ Empty name: Shows error "Room name cannot be empty"
- ✅ Long name: Shows error "Room name too long (max 100 characters)"
- ✅ Special chars: Shows error about allowed characters
- ✅ Save button is disabled when errors exist
- ✅ Error messages appear in red below the input

### Test 6: Public/Private Toggle

**Steps**:
1. Open room settings
2. Click the "Public Room" toggle
3. Note the current state
4. Click **Save Changes**

**Expected Results**:
- ✅ Toggle switches between on/off states
- ✅ Shows descriptive text:
  - "Anyone with the link can join" (when public)
  - "Only invited members can join" (when private)
- ✅ Settings save successfully

### Test 7: Delete Room Confirmation

**Steps**:
1. Open room settings
2. Scroll to "Danger Zone"
3. Click **Delete Room** button
4. A confirmation dialog appears

**Expected Results**:
- ✅ Confirmation dialog opens
- ✅ Shows warning: "This will permanently delete... This action cannot be undone"
- ✅ Requires you to type the exact room name
- ✅ Delete button is disabled until you type the correct name
- ✅ Has Cancel and Delete buttons

### Test 8: Cancel Delete

**Steps**:
1. Open delete confirmation
2. Click **Cancel**

**Expected Results**:
- ✅ Returns to settings modal
- ✅ Room is NOT deleted

### Test 9: Complete Room Delete

**Steps**:
1. Open room settings → Delete Room
2. Type the exact room name in the confirmation field
3. Click **Delete Permanently**

**Expected Results**:
- ✅ Modal shows "Deleting..." state
- ✅ Room is deleted
- ✅ You're redirected to home page (`/`)
- ✅ Room no longer exists

### Test 10: Keyboard Shortcuts

**Steps**:
1. Open room settings
2. Press **Escape** key

**Expected Results**:
- ✅ Settings modal closes
- ✅ Returns to canvas

### Test 11: Non-Owner Access

**Steps**:
1. Open your room in an **incognito/private browser window**
2. Enter a different display name
3. Look at the room header

**Expected Results**:
- ✅ Room header appears
- ✅ Room name is visible
- ✅ Share button is visible
- ✅ Settings button is **NOT visible** (you're not the owner)

---

## Testing PR #6: Export to PNG/SVG

### Test 1: Export Button Appears

**Steps**:
1. Open the app at `http://localhost:3000`
2. Look at the **bottom-right corner** of the screen

**Expected Results**:
- ✅ Blue "Export" button is visible
- ✅ Has a download icon
- ✅ Tooltip shows "Export canvas (Ctrl+E)" on hover
- ✅ Button is above other UI elements (not hidden)

### Test 2: Export Dialog Opens

**Steps**:
1. Click the **Export** button in bottom-right
2. Export dialog should open

**Expected Results**:
- ✅ Modal opens centered on screen
- ✅ Shows "Export Canvas" title
- ✅ Has format selection: PNG and SVG buttons
- ✅ PNG is selected by default
- ✅ Shows quality slider (for PNG)
- ✅ Shows scale dropdown (for PNG)
- ✅ Has "Include background" checkbox
- ✅ Has "Export selected shapes only" checkbox
- ✅ Has filename input field with auto-generated name
- ✅ Has Cancel and Download buttons

### Test 3: Add Shapes First

**Steps**:
1. **Draw some shapes on the canvas**:
   - Click and drag to create rectangles
   - Use the toolbar to create circles, arrows, text
   - Add at least 5-10 different shapes
2. Now test the export

**Why**: The export requires shapes on the canvas!

### Test 4: PNG Export with Default Settings

**Steps**:
1. Draw several shapes on the canvas
2. Click Export button
3. Leave PNG selected
4. Click **Download**

**Expected Results**:
- ✅ Button shows "Exporting..." with spinner
- ✅ File downloads after a moment
- ✅ Dialog closes
- ✅ Check Downloads folder: file named like `canvas-2024-10-16-143022.png`
- ✅ Open the PNG: it shows your canvas content

### Test 5: PNG Quality Adjustment

**Steps**:
1. Open export dialog
2. Move the quality slider:
   - All the way left (10%)
   - Middle (50%)
   - All the way right (100%)
3. Note the percentage display

**Expected Results**:
- ✅ Quality percentage updates as you move slider
- ✅ Shows "10%" to "100%"
- ✅ Labels say "Smaller file" ↔ "Higher quality"

### Test 6: PNG Scale Options

**Steps**:
1. Open export dialog
2. Click the Scale dropdown
3. Try each option:
   - 1x (100%)
   - 2x (200%)
   - 3x (300%)
4. Export at 3x scale

**Expected Results**:
- ✅ All three options are available
- ✅ File exports successfully
- ✅ 3x export creates a larger image (check file size)
- ✅ Higher resolution when opened

### Test 7: SVG Export

**Steps**:
1. Open export dialog
2. Click **SVG** format button
3. Notice PNG options disappear
4. Click **Download**

**Expected Results**:
- ✅ PNG quality slider disappears
- ✅ PNG scale dropdown disappears
- ✅ File downloads with `.svg` extension
- ✅ Open SVG in browser or Figma/Illustrator: shows your canvas
- ✅ SVG is vector (can zoom infinitely without pixelation)

### Test 8: Transparent Background (PNG)

**Steps**:
1. Select PNG format
2. **Uncheck** "Include background"
3. Export and download
4. Open the PNG in an image editor or browser

**Expected Results**:
- ✅ PNG has transparent background (checkered pattern in viewers)
- ✅ Shapes are visible
- ✅ No white background

### Test 9: Export Selected Shapes Only

**Steps**:
1. Draw 5+ shapes on canvas
2. **Select only 2 shapes** (click and drag to select, or hold Shift and click)
3. Open export dialog
4. **Check** "Export selected shapes only"
5. Click Download

**Expected Results**:
- ✅ Only the 2 selected shapes are in the exported file
- ✅ Other shapes are not included
- ✅ File is smaller than full export

### Test 10: Empty Canvas Error

**Steps**:
1. Clear all shapes from canvas (select all, delete)
2. Click Export button
3. Click Download with empty canvas

**Expected Results**:
- ✅ Red error message appears: "Canvas is empty. Add shapes before exporting."
- ✅ Download doesn't start
- ✅ User is prompted to add shapes

### Test 11: Selection Error

**Steps**:
1. Draw several shapes
2. **Don't select anything** (click empty area to deselect)
3. Open export dialog
4. Check "Export selected shapes only"
5. Click Download

**Expected Results**:
- ✅ Error message: "No shapes selected. Select shapes or choose 'Export All'."
- ✅ Download doesn't start

### Test 12: Filename Customization

**Steps**:
1. Open export dialog
2. Note the auto-generated filename (e.g., `canvas-2024-10-16-143022.png`)
3. Change it to something else: `my-awesome-drawing.png`
4. Click Download

**Expected Results**:
- ✅ File downloads with your custom filename
- ✅ Can't download with empty filename (button disabled)

### Test 13: Large File Warning

**Steps**:
1. Draw 50+ complex shapes (lots of text, arrows, etc.)
2. Export as PNG at 3x scale, 100% quality
3. Click Download

**Expected Results**:
- ✅ If file >10MB: Yellow warning appears
- ✅ Warning says "Large file size (XX.X MB). Download may take longer."
- ✅ Download still proceeds
- ✅ If file would exceed 50MB: Error prevents download

### Test 14: Keyboard Shortcuts

**Steps**:
1. Open export dialog
2. Press **Escape** key

**Expected Results**:
- ✅ Export dialog closes
- ✅ Returns to canvas

### Test 15: Format Switch

**Steps**:
1. Open export dialog
2. Select PNG, adjust quality to 50%
3. Switch to SVG
4. Switch back to PNG

**Expected Results**:
- ✅ When switching to SVG: quality slider disappears
- ✅ When switching back to PNG: quality slider reappears
- ✅ Settings may reset to defaults

---

## Testing Integration: Both Features Together

### Test 1: Both UI Elements Visible

**Steps**:
1. Open the app
2. Look at the screen layout

**Expected Results**:
- ✅ Room header at top
- ✅ Export button at bottom-right
- ✅ No visual overlap
- ✅ Both are clearly visible
- ✅ Canvas area is not obstructed

### Test 2: Both Modals Work

**Steps**:
1. Open room settings modal (gear icon)
2. Close it (Cancel or Esc)
3. Open export dialog (Export button)
4. Close it (Cancel or Esc)
5. Open both in sequence multiple times

**Expected Results**:
- ✅ Both modals open and close smoothly
- ✅ No interference between them
- ✅ Escape key works for both
- ✅ No z-index issues (modals always on top)

### Test 3: Export Room-Specific Content

**Steps**:
1. Note your room name in the header
2. Draw shapes specific to this room
3. Export to PNG
4. Create a new room or switch rooms
5. Draw different shapes
6. Export again

**Expected Results**:
- ✅ Each export contains only that room's shapes
- ✅ Exports are room-specific
- ✅ Filenames can distinguish rooms

---

## Mobile/Responsive Testing

### Test 1: Mobile Viewport (375px)

**Steps**:
1. Open Chrome DevTools (F12)
2. Click device toolbar icon (Ctrl+Shift+M)
3. Select "iPhone SE" or set width to 375px
4. Test all features

**Expected Results**:
- ✅ Room header fits on mobile
- ✅ Export button is accessible (not cut off)
- ✅ Both modals are full-screen on mobile
- ✅ All buttons are touch-friendly (44px minimum)
- ✅ Text is readable
- ✅ No horizontal scrolling

### Test 2: Tablet (768px)

**Steps**:
1. Set viewport to 768px (iPad)
2. Test all features

**Expected Results**:
- ✅ Layout adjusts appropriately
- ✅ Everything remains usable
- ✅ Modals are centered and sized well

---

## Browser Testing

Test in multiple browsers if possible:
- ✅ Chrome/Chromium
- ✅ Firefox
- ✅ Safari (macOS)
- ✅ Edge

All features should work consistently.

---

## Common Issues & Troubleshooting

### Issue: "Canvas is empty" error
**Solution**: Draw some shapes before exporting!

### Issue: Settings button doesn't appear
**Solution**: You might not be the room owner. Try creating a new room or testing in a fresh session.

### Issue: Export button not visible
**Solution**: 
- Check bottom-right corner
- Make sure window is wide enough
- Try zooming out

### Issue: Download doesn't work
**Solution**:
- Check browser's download permissions
- Check if pop-ups are blocked
- Try a different browser

### Issue: Room header doesn't appear
**Solution**:
- Check that Firebase is configured
- Check browser console for errors
- Make sure you entered a display name

---

## Quick Test Checklist

Use this checklist for a quick smoke test:

### PR #5 (Room Settings)
- [ ] Room header displays
- [ ] Settings button appears (owner only)
- [ ] Can open settings modal
- [ ] Can rename room
- [ ] Can toggle public/private
- [ ] Can share link
- [ ] Esc closes modal

### PR #6 (Export)
- [ ] Export button displays
- [ ] Can open export dialog
- [ ] Can export PNG
- [ ] Can export SVG
- [ ] Quality slider works
- [ ] Scale options work
- [ ] Transparent background works
- [ ] Esc closes dialog

### Integration
- [ ] Both features visible simultaneously
- [ ] No visual conflicts
- [ ] Both modals work independently
- [ ] Mobile responsive

---

## Ready to Test!

**Start here**:
```bash
# Make sure you're on main branch
git status

# Start the dev server
pnpm dev
```

Then open `http://localhost:3000` and follow the test cases above!

**Have fun testing! 🎨**


