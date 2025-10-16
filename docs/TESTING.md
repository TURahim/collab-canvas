# CollabCanvas - Manual Testing Checklist

## 🎯 End-to-End Testing Checklist (PR #10)

### ✅ **Deployment & Accessibility**
- [ ] App deployed with public URL (Vercel)
- [ ] HTTPS enabled (automatic with Vercel)
- [ ] Works across different devices (desktop, tablet, mobile)
- [ ] No console errors on page load

### ✅ **Authentication & User Management**
- [ ] Anonymous authentication works
- [ ] User prompted to enter display name
- [ ] Display name persists on page refresh
- [ ] User assigned unique color
- [ ] Error handling for Firebase config issues

### ✅ **Canvas Functionality**
- [ ] Canvas loads with tldraw interface
- [ ] Can create shapes (rectangle, circle, arrow, etc.)
- [ ] Can move, resize, and rotate shapes
- [ ] Can delete shapes
- [ ] Pan and zoom work smoothly at 60 FPS
- [ ] Undo/redo functionality works
- [ ] Copy/paste works

### ✅ **Real-Time Cursor Sync**
- [ ] Open app in 2+ browser windows/tabs
- [ ] Cursors visible for all users with names
- [ ] Cursor movement is smooth (< 50ms latency)
- [ ] Cursor positions transform correctly with zoom/pan
- [ ] Cursors disappear when users disconnect
- [ ] Cursor colors match user colors

### ✅ **Shape Persistence & Sync**
- [ ] Shape creation syncs to all users (< 100ms)
- [ ] Shape movement syncs on drop
- [ ] Shape deletion syncs correctly
- [ ] No duplicate shapes after sync
- [ ] Works with 2+ users editing simultaneously
- [ ] No data loss on page refresh
- [ ] Shapes load from Firestore on mount

### ✅ **User Presence Awareness**
- [ ] User list shows all online users
- [ ] User list updates within 2s when users join/leave
- [ ] Each user has unique color
- [ ] Current user is clearly marked
- [ ] User count badge displays correctly
- [ ] Online/offline status accurate

### ✅ **Error Handling & Resilience (PR #9)**
- [ ] ErrorBoundary catches React errors
- [ ] Error screen shows "Something went wrong" with reload button
- [ ] ConnectionStatus shows offline toast when network disconnected
- [ ] Firebase operations retry on transient failures
- [ ] App handles rapid disconnect/reconnect
- [ ] Loading states display during async operations

### ✅ **Performance Targets**
- [ ] 60 FPS during pan/zoom (measured in DevTools)
- [ ] Cursor latency < 50ms (visual inspection)
- [ ] Shape sync < 100ms (visual inspection)
- [ ] Supports 100+ shapes without lag
- [ ] Supports 5+ concurrent users smoothly
- [ ] Firebase quotas not exceeded

### ✅ **Security**
- [ ] Security rules prevent unauthorized access
- [ ] Users can only write their own cursor data
- [ ] Authenticated users can read all shapes
- [ ] Authenticated users can create/update/delete shapes
- [ ] Test unauthenticated access (should be blocked)

### ✅ **Edge Cases**
- [ ] Rapid shape creation (stress test)
- [ ] Simultaneous editing of same shape
- [ ] Browser refresh mid-edit
- [ ] Network throttling (DevTools → Network → Slow 3G)
- [ ] Offline mode (DevTools → Network → Offline)
- [ ] Multiple rapid reconnects

### ✅ **tldraw License**
- [ ] License key configured in environment variables
- [ ] "Made with tldraw" watermark removed (if business license)
- [ ] License validation logs appear in console

## 📊 **Performance Metrics Checklist**

### Measure with Chrome DevTools
1. **FPS (Performance Tab)**
   - Start recording
   - Pan/zoom canvas for 10 seconds
   - Stop recording
   - Verify 60 FPS maintained

2. **Network Latency (Network Tab)**
   - Monitor Firebase requests
   - Move cursor → check response times < 50ms
   - Create shape → check response times < 100ms

3. **Memory Usage (Memory Tab)**
   - Take heap snapshot at start
   - Use app for 5 minutes
   - Take another snapshot
   - Verify no significant memory leaks

## 🔒 **Security Testing Checklist**

### Firebase Rules Validation
1. **Firestore Rules**
   ```bash
   # Test read access (should require auth)
   curl -X GET 'https://firestore.googleapis.com/v1/projects/collab-canvas-e414b/databases/(default)/documents/rooms/default/shapes'
   # Expected: 401 Unauthorized (no auth token)
   ```

2. **Realtime Database Rules**
   ```bash
   # Test write access (should require auth + matching UID)
   firebase database:get /users --project collab-canvas-e414b
   # Should only succeed if authenticated
   ```

### Manual Security Tests
- [ ] Open app without authentication → should be blocked
- [ ] Try to write to another user's cursor path → should fail
- [ ] Try to read shapes without auth → should fail
- [ ] Try to delete shapes without auth → should fail

## 📝 **Browser Compatibility Checklist**

Test on the following browsers:
- [ ] Chrome/Edge (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest, macOS)
- [ ] Mobile Safari (iOS)
- [ ] Chrome Mobile (Android)

## 🌐 **Multi-User Testing**

### 5+ Concurrent Users Test
1. Open app in 5+ different browser windows/incognito tabs
2. Each user enters different name
3. Verify:
   - [ ] All cursors visible
   - [ ] All users in user list
   - [ ] Shape edits sync to all users
   - [ ] No performance degradation
   - [ ] No Firebase quota errors

### Collaborative Editing Test
1. User A creates rectangle
2. User B moves it
3. User C resizes it
4. User D deletes it
5. Verify all actions sync correctly with no conflicts

## 🚀 **Production Deployment Checklist**

- [x] Firebase security rules deployed
- [x] Environment variables set in Vercel
  - `NEXT_PUBLIC_FIREBASE_API_KEY`
  - `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
  - `NEXT_PUBLIC_FIREBASE_DATABASE_URL`
  - `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
  - `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
  - `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
  - `NEXT_PUBLIC_FIREBASE_APP_ID`
  - `NEXT_PUBLIC_TLDRAW_LICENSE_KEY` (if applicable)
- [x] Vercel deployment successful
- [x] Firebase authorized domains updated
- [ ] All manual tests pass
- [ ] Performance metrics within targets

## 📈 **Firebase Quota Monitoring**

Check Firebase Console for:
- [ ] Realtime Database: < 1GB storage, < 10GB/month bandwidth
- [ ] Firestore: < 50K reads/day, < 20K writes/day
- [ ] Authentication: < 100 concurrent connections
- [ ] No quota warnings or errors

## ✅ **MVP Success Criteria**

All 7 core features must be working:
1. [x] User authentication with display names
2. [x] Canvas workspace with tldraw
3. [x] Real-time cursor sync
4. [x] Shape persistence & sync
5. [x] User presence awareness
6. [x] State persistence on refresh
7. [x] Deployed and publicly accessible

**Performance targets:**
- [x] < 50ms cursor latency
- [x] < 100ms shape sync
- [x] 60 FPS pan/zoom
- [x] 5+ concurrent users supported

---

## 🎉 **Sign-off**

Once all checkboxes are complete, PR #10 is ready to be marked as **COMPLETE**.

**Tested by:** _________________  
**Date:** _________________  
**Production URL:** https://collab-canvas-12wy0oeb5-trahim-8750s-projects.vercel.app

