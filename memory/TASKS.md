# TASKS - CollabCanvas

**Last Updated:** October 17, 2025  
**Current Sprint:** Room-Scoped Presence Complete ✅

---

## 🎯 Active Tasks

### None Currently ✅

All critical infrastructure tasks completed! Room-scoped presence system successfully implemented with all bug fixes deployed!

---

## ✅ Recently Completed (October 17, 2025)

### ✓ Room-Scoped Presence System
**Completed:** October 17, 2025  
**Status:** ✅ Implemented, tested, and deployed

**Problem Solved:**
- Critical privacy/UX bug: Users in different rooms could see each other
- Global presence system showed ALL users across ALL rooms

**Solution Implemented:**
- Migrated from `/users` to `/rooms/{roomId}/presence/{userId}`
- Dual-write strategy for backward compatibility
- Each room has isolated presence tree
- Users only see others in the same room

**New Functions Added:**
- `updateRoomPresence()` - Room-specific presence updates
- `listenToRoomUsers()` - Listen to users in specific room
- `getRoomOnlineUsers()` - One-time read of room users
- `markUserOfflineInRoom()` - Room-specific cleanup
- `setupRoomPresenceHeartbeat()` - Room-scoped heartbeat
- `updateRoomCursorPosition()` - Room-scoped cursor updates

**Files Modified:**
- `src/lib/realtimeSync.ts` (+265 lines, 6 new functions)
- `src/hooks/useCursors.ts` (~150 lines modified, dual-write logic)
- `src/hooks/usePresence.ts` (~80 lines modified, room listeners)
- `src/components/CollabCanvas.tsx` (1 line added, roomId prop)
- `database.rules.json` (validation rules for room presence)
- `src/lib/roomManagement.ts` (improved delete with assets cleanup)

**Bug Fixes Included:**
1. ✅ Ban listener permission errors - Added read permission for bans/$uid
2. ✅ Cursor update validation errors - Changed from require-all-fields to per-field validation
3. ✅ Firebase Storage CORS errors - Configured CORS via gsutil
4. ✅ Delete room permission errors - Added write permission at room level
5. ✅ Assets not cleaned up on delete - Added assets collection cleanup

**Total Changes:**
- ~300 lines added
- ~200 lines modified
- 5 files updated
- 3 bug fixes deployed
- Database rules deployed
- Storage CORS configured

---

### ✓ Multi-Feature Enhancement Sprint (5 PRs)
**Completed:** October 17, 2025  
**Status:** ✅ All features implemented and tested

**PR #2: Online Users Card Repositioning**
- Moved card from `top-20` to `top-32`
- Fixed toolbar overlap issue
- **File Modified:** `src/components/UserList.tsx`

**PR #3: JellyBoard Logo on Rooms List**
- Replaced "Your Rooms" heading with logo
- Added Next.js Image optimization
- Made logo clickable
- **File Modified:** `src/app/rooms/page.tsx`

**PR #5: README Keyboard Shortcuts Documentation**
- Added comprehensive ⌨️ Keyboard Shortcuts section
- Documented 40+ tldraw native shortcuts
- Organized by category
- **File Modified:** `README.md`

**PR #1: Owner Kick Control**
- Added "X" button next to non-owner users (owner only)
- Implemented 5-minute ban system
- Ban check on room entry
- Auto-redirect kicked users to /rooms
- **Files Modified:** 5 files (UserList, CollabCanvas, realtimeSync, usePresence, database.rules.json)

**PR #4: Persistent Image Assets**
- Complete Firebase Storage integration
- Uploads images to `/rooms/{roomId}/assets/`
- Asset metadata in Firestore
- Images persist after refresh/logout
- Supports PNG, JPEG, GIF, WebP
- 10MB size limit
- **Files Created:** 3 files (asset.ts, assetManagement.ts, storage.rules)
- **Files Modified:** 6 files (firebase.ts, useShapes.ts, firestore.rules, firebase.json, etc.)

**Bonus Improvements:**
- Removed "Redirecting to rooms..." and "Loading room..." text
- Fixed Next.js config deprecation warnings
- Fixed Storage rules CORS syntax errors
- Added comprehensive debugging for asset detection

**Total Impact:**
- 4 files created
- 15 files modified
- ~1,000+ lines of code
- All features working and tested
- No linting errors

---

## ✅ Recently Completed (October 16, 2024)

### ✓ PR #1: Multi-Room Routing (CRITICAL FIX)
**Completed:** October 16, 2024  
**Status:** ✅ Implemented and working

**Context:** PR #1 was marked "complete" in planning docs but was never actually implemented. This was the missing foundation.

**Features Implemented:**
- Room list page at `/rooms` with grid layout
- Individual room pages at `/room/[roomId]`
- Home page redirect to `/rooms`
- Room creation modal with validation
- Clean, shareable URLs for each room
- Room ID generation and validation system
- Path utilities library
- Empty state with call-to-action

**Files Added:**
- `src/lib/paths.ts` (room ID validation & path utilities)
- `src/hooks/useRoomId.ts` (extract room ID from URL)
- `src/app/rooms/page.tsx` (room list & creation, 332 lines)
- `src/app/room/[roomId]/page.tsx` (individual room, 134 lines)
- `src/lib/__tests__/paths.test.ts` (15 passing tests)
- `src/hooks/__tests__/useRoomId.test.ts` (6 passing tests)

**Files Modified:**
- `src/app/page.tsx` (redirect to /rooms)
- `src/components/CollabCanvas.tsx` (use roomId from props)

**Firestore Changes:**
- Added collection group rules for `/{path=**}/metadata/{doc}`
- Deployed composite indexes for owner and isPublic queries
- Indexes built in ~3 minutes

**Tests:** 21/21 new tests passing  
**Integration:** Perfect integration with PRs #2, #3, #5, #6

---

### ✓ PR #5: Room Settings & Permissions UI
**Completed:** October 16, 2024  
**Agent:** Agent A  
**Status:** ✅ Merged to main

**Features Implemented:**
- Room header component with name, user count, share button
- Settings modal (owner-only) with rename, public/private toggle, delete
- Delete confirmation requiring exact room name
- Share button with clipboard copy
- Keyboard support (Esc to close)
- Mobile responsive design

**Files Added:**
- `src/components/RoomHeader.tsx`
- `src/components/RoomSettings.tsx`
- `src/lib/roomManagement.ts`
- `src/types/room.ts`

**Integration:** Clean merge, no conflicts initially. Fixed import/export issues in second iteration.

---

### ✓ PR #6: Export to PNG/SVG
**Completed:** October 16, 2024  
**Agent:** Agent B  
**Status:** ✅ Merged to main

**Features Implemented:**
- Export dialog with PNG/SVG format selection
- PNG quality slider (10%-100%)
- PNG scale dropdown (1x, 2x, 3x)
- Background toggle (transparent/included)
- Selection-only export mode
- File size validation (50MB limit, 10MB warning)
- Filename generation with timestamps
- Keyboard support (Esc to close)

**Files Added:**
- `src/components/ExportDialog.tsx`
- `src/lib/exportCanvas.ts`

**Integration:** One merge conflict in CollabCanvas.tsx - resolved cleanly by combining all imports and state.

---

### ✓ Integration Testing & Merge
**Completed:** October 16, 2024  
**Status:** ✅ Successful

**Actions:**
- Created `integration-test` branch
- Merged PR #5 (clean)
- Merged PR #6 (resolved conflict in CollabCanvas.tsx)
- Ran build tests (✅ passed)
- Ran unit tests (✅ passed - 1 pre-existing failure unrelated)
- Merged to main
- Created comprehensive integration report

---

### ✓ Firebase Rules Update
**Completed:** October 16, 2024  
**Status:** ✅ Deployed

**Changes:**
- Updated `database.rules.json` for room-scoped presence/cursors
- Updated `firestore.rules` for room metadata (owner-only write)
- Deployed both rule sets to Firebase
- Fixed permission denied errors

**Files Modified:**
- `database.rules.json`
- `firestore.rules`

---

### ✓ Bug Fixes
**Completed:** October 16, 2024

**Fixed Issues:**
1. Room name validation error - sanitized special characters in default room names
2. Firebase permission denied errors - updated and deployed security rules
3. CollabCanvas merge conflict - combined PR #5 and PR #6 changes

**Files Modified:**
- `src/lib/roomManagement.ts` (sanitized display name)

---

## 📋 Backlog (Optional/Future)

### ✓ Enhancement: Keyboard Shortcuts
**Completed:** October 17, 2025  
**Status:** ✅ Documented in README

**What Was Done:**
- Added comprehensive keyboard shortcuts section to README
- Documented all tldraw native shortcuts (already existed)
- No code changes needed - tldraw includes all shortcuts by default

---

### Enhancement: PR #8 - Text Styling Panel (Agent B)

**Priority:** Low  
**Estimated Time:** 3-4 hours

**Description:** Floating panel for text formatting

**Features:**
- Font size controls (S, M, L, XL)
- Text alignment (left, center, right)
- Color picker
- Smart positioning near selected text
- Responsive design

**Dependencies:**
- None (independent)

---

### Enhancement: Multi-Room Routing (Future)

**Priority:** Low  
**Estimated Time:** 6-8 hours

**Description:** Implement `/rooms` and `/room/[roomId]` routing

**Tasks:**
- [ ] Create room list page (`/rooms`)
- [ ] Create room detail page (`/room/[roomId]`)
- [ ] Add room creation flow
- [ ] Update URL routing
- [ ] Update all hooks for room-scoped data

**Note:** Foundation in place from PR #5, but routing not yet connected

---

### ✓ Enhancement: Image Asset Persistence
**Completed:** October 17, 2025  
**Status:** ✅ Fully implemented and working

**What Was Done:**
- [x] Set up Firebase Storage bucket
- [x] Add image upload handler (handles blob and data URLs)
- [x] Store asset metadata in Firestore
- [x] Restore images from Storage URLs on load
- [x] Add storage security rules
- [x] 10MB file size limit validation
- [x] Support for PNG, JPEG, GIF, WebP

**Files Created:**
- `src/types/asset.ts`
- `src/lib/assetManagement.ts`
- `storage.rules`

---

### Enhancement: Mobile Optimization

**Priority:** Low  
**Estimated Time:** 8-10 hours

**Description:** Optimize UI and interactions for mobile devices

**Tasks:**
- [ ] Responsive UI adjustments
- [ ] Touch gesture support
- [ ] Mobile-friendly dialogs (full-screen on mobile)
- [ ] Touch targets 44px minimum
- [ ] Mobile browser testing

**Status:** PR #5 and #6 already include mobile-responsive design

---

### Enhancement: User Permissions & Roles

**Priority:** Low  
**Estimated Time:** 10-12 hours

**Description:** Add admin/editor/viewer roles to rooms

**Tasks:**
- [ ] Design permission model
- [ ] Update Firestore security rules
- [ ] Add role management UI
- [ ] Implement role-based shape editing
- [ ] Update presence indicators with roles

**Status:** Basic owner-only permissions already implemented in PR #5

---

## 🚫 Blocked Tasks

None currently.

---

## 📅 Timeline

**October 16, 2024:**
- [x] PR #5: Room Settings UI (Agent A)
- [x] PR #6: Export Functionality (Agent B)
- [x] Integration testing
- [x] Merge to main
- [x] Firebase rules deployment
- [x] Bug fixes (validation, permissions)
- [x] Memory bank updates

**Next Optional Sprint:**
- [ ] PR #7: Keyboard Shortcuts (Agent A)
- [ ] PR #8: Text Styling Panel (Agent B)
- [ ] Further enhancements as needed

---

## 💡 Notes

- ✅ Multi-agent workflow successfully implemented
- ✅ Integration testing caught one merge conflict - resolved quickly
- ✅ Both features work seamlessly together
- ✅ Firebase rules properly configured
- ✅ All bugs fixed promptly
- Bundle size increase: Only +3KB (0.4%) - excellent!
- Ready for manual testing and production use
- `.cursor/TESTING_GUIDE.md` available with comprehensive test cases

**Ready for:** Manual testing, staging deployment, or proceeding with PR #7 & #8

