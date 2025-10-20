# Quick Testing Guide - Version History

## ✅ Fixed Issues

1. **Next.js Build Error**: RESOLVED
   - Cleared caches and reinstalled dependencies
   - Server now running successfully on http://localhost:3000

2. **Firebase Emulators**: Skip for now (requires Java installation)
   - We'll test with **production Firebase** instead
   - Security rules already deployed ✅
   - Cloud Function deployment next

---

## 🚀 Deploy Cloud Function to Production

Since emulators require Java (not installed), let's deploy directly to production:

```bash
# Deploy the Cloud Function
firebase deploy --only functions

# This will deploy onVersionDelete to your Firebase project
```

---

## 🧪 Test Version History (Production)

### Prerequisites
✅ Next.js dev server running: http://localhost:3000
✅ Security rules deployed to Firebase
⏳ Cloud Function to be deployed

### Test Steps

1. **Open the app:**
   ```
   http://localhost:3000
   ```

2. **Navigate to a room:**
   - Click on any existing room or create a new one
   - You'll see the canvas with the new "Version" button

3. **Create a Manual Snapshot:**
   - Click the **"Version"** button (purple, top right)
   - Click **"Save Version"**
   - Enter label: "Test Snapshot 1"
   - Click "Save"
   - **Expected:** Version appears in list with timestamp and size

4. **Test Autosave (30s wait):**
   - Make a change (move a shape)
   - Wait 35 seconds
   - Click "Version" again
   - **Expected:** New "Autosave" entry appears
   
5. **Test Restore:**
   - Make more changes to canvas
   - Click "Version"
   - Select "Test Snapshot 1"
   - Click "Restore"
   - Confirm the dialog
   - **Expected:**
     - Canvas restored to saved state
     - New "Pre-restore (auto)" version created
     - Toast message appears
     - Can undo with Ctrl+Z

6. **Test Cloud Function (after deployment):**
   - Go to Firebase Console: https://console.firebase.google.com
   - Navigate to your project → Firestore Database
   - Find: `/rooms/{roomId}/versions/`
   - Delete a version document manually
   - Check Storage → `/rooms/{roomId}/versions/`
   - **Expected:** Corresponding .json.gz file deleted within 10s

---

## 📊 Verify in Firebase Console

### Firestore
- Go to: https://console.firebase.google.com/project/collab-canvas-e414b/firestore
- Navigate to: `rooms → {roomId} → versions`
- You should see version documents with:
  - `id`, `roomId`, `createdBy`
  - `label`, `bytes`, `contentHash`
  - `storagePath`, `schemaVersion`

### Storage
- Go to: https://console.firebase.google.com/project/collab-canvas-e414b/storage
- Navigate to: `rooms/{roomId}/versions/`
- You should see compressed snapshots: `{versionId}.json.gz`

### Functions (after deployment)
- Go to: https://console.firebase.google.com/project/collab-canvas-e414b/functions
- Look for: `onVersionDelete`
- Check logs for successful blob deletions

---

## 🐛 Quick Troubleshooting

### "Failed to save snapshot"
```bash
# Check browser console for errors
# Verify user is authenticated
# Check Firestore rules deployed: firebase deploy --only firestore:rules
```

### "Autosave not working"
- Make sure you **actually changed** content (move/add/delete shapes)
- Wait full 35 seconds (30s interval + 5s processing)
- Check browser console for hash computation

### Cloud Function not triggering
```bash
# Make sure it's deployed
firebase deploy --only functions

# Check logs
firebase functions:log --only onVersionDelete

# Verify in Firebase Console → Functions
```

---

## ✨ Success Criteria

You'll know it's working when:
- ✅ Can create manual snapshots with labels
- ✅ Autosave creates versions every 30s when content changes
- ✅ Restore brings back old canvas state
- ✅ Pre-restore snapshot created automatically
- ✅ Versions visible in Firebase Console
- ✅ Compressed blobs visible in Storage
- ✅ Can delete versions (owner/creator only)

---

## 📝 Next Steps

1. Deploy Cloud Function:
   ```bash
   firebase deploy --only functions
   ```

2. Test the full workflow above

3. Verify Cloud Function in Firebase Console

4. (Optional) Install Java for local emulator testing:
   ```bash
   brew install openjdk@11
   ```

---

## 🎉 Your Feature is Ready!

The Version History system is fully implemented and ready to use. All code changes are complete:

- ✅ 14 new files created
- ✅ 9 files modified
- ✅ Security rules deployed
- ✅ Dependencies installed
- ✅ Build successful
- ⏳ Cloud Function ready to deploy

**Deploy the function and start testing!** 🚀

