# Version History - Local Testing Guide

**Status:** ✅ Deployed  
**Date:** October 20, 2025

---

## Deployment Status

### ✅ Completed
- [x] Cloud Functions configured in `firebase.json`
- [x] Functions built successfully (TypeScript → JavaScript)
- [x] Security rules deployed to Firebase
  - Firestore rules: ✅ Deployed
  - Storage rules: ✅ Deployed
- [x] Functions emulator running on port 5001

### 🔧 Configuration

**firebase.json:**
```json
{
  "functions": [
    {
      "source": "functions",
      "codebase": "default"
    }
  ],
  "emulators": {
    "functions": {
      "port": 5001
    }
  }
}
```

**Cloud Function:** `onVersionDelete`
- Trigger: Firestore document delete
- Path: `/rooms/{roomId}/versions/{versionId}`
- Action: Deletes corresponding Storage blob
- API: firebase-functions v2 (modern)

---

## Local Testing

### 1. Start Development Environment

```bash
# Terminal 1: Start Firebase emulators
firebase emulators:start

# Terminal 2: Start Next.js dev server
pnpm dev
```

### 2. Access the App

- **Web App:** http://localhost:3000
- **Firebase Emulator UI:** http://localhost:4000
- **Functions Emulator:** http://localhost:5001

### 3. Manual Test Checklist

#### Test 1: Create Manual Snapshot ✓
1. Open a room: http://localhost:3000/room/test-room
2. Draw 5 shapes on canvas
3. Click "Version" button (top right, purple button)
4. Click "Save Version"
5. Enter label: "Test Snapshot 1"
6. Click "Save"

**Expected:**
- Version appears in list
- Shows timestamp, author, size
- Status: "Manual Snapshot" or custom label

#### Test 2: Autosave Triggering ✓
1. Wait 30 seconds with no changes → No new snapshot
2. Move a shape
3. Wait 35 seconds → New autosave appears
4. Move shape back to original position
5. Wait 35 seconds → No duplicate (hash unchanged)

**Expected:**
- Autosave only triggers when content changes
- Label shows "Autosave"
- No duplicates when hash is same

#### Test 3: Restore Flow ✓
1. Make major changes (delete shapes, add new)
2. Click "Version" → select "Test Snapshot 1"
3. Click "Restore"
4. Confirm restore dialog

**Expected:**
- New "Pre-restore (auto)" version created
- Canvas restored to snapshot state
- Toast: "Restored to Test Snapshot 1. Undo available."
- Can undo with Ctrl+Z (single entry)

#### Test 4: Cloud Function Cleanup ✓
1. Open Firebase Emulator UI: http://localhost:4000
2. Navigate to Firestore → rooms → {roomId} → versions
3. Delete a version document manually
4. Check Storage tab → verify blob deleted within 5-10s

**Expected:**
- Storage blob auto-deleted
- Check Functions logs for: "✅ Deleted version blob"

#### Test 5: Retention (20 versions) ✓
1. Create 21 manual snapshots rapidly
2. Check version list

**Expected:**
- Only last 20 versions shown
- Oldest version auto-deleted
- Cloud Function logs show blob cleanup

#### Test 6: Asset Persistence ✓
1. Upload an image to canvas (drag & drop)
2. Create snapshot: "With Image"
3. Delete the image from canvas
4. Restore "With Image" snapshot

**Expected:**
- Image renders correctly
- Uses recorded URL from manifest
- No re-upload needed

#### Test 7: Security Rules ✓
1. Open room in incognito mode (different user)
2. Try to access versions

**Expected:**
- Non-members: 403 Forbidden
- Members: Can read and create versions
- Only creator/owner: Can delete versions

---

## Firebase Emulator Logs

### Check Cloud Function Execution

**View Logs:**
```bash
# In terminal where emulators are running
# Look for:
[onVersionDelete] ✅ Deleted version blob: rooms/xxx/versions/yyy.json.gz
```

**Emulator UI:**
1. Open http://localhost:4000
2. Navigate to "Functions" tab
3. See real-time function invocations
4. Check request/response logs

---

## Debugging

### Functions Not Triggering?

**Check:**
1. Emulators running: `firebase emulators:start`
2. Functions built: `cd functions && npm run build`
3. Functions emulator port: http://localhost:5001
4. Check Emulator UI logs

**Rebuild Functions:**
```bash
cd functions
npm run build
cd ..
# Restart emulators
```

### Security Rules Issues?

**Verify Deployment:**
```bash
firebase deploy --only firestore:rules,storage
```

**Check Rules:**
- Firestore: `firestore.rules` (line 97-126)
- Storage: `storage.rules` (line 19-42)

### Snapshot Not Saving?

**Check Browser Console:**
- Network errors?
- Firestore write errors?
- Storage upload errors?

**Verify:**
- User authenticated
- Room exists
- User is room member

---

## Production Deployment

### Deploy Cloud Functions

```bash
# Build functions
cd functions
npm run build
cd ..

# Deploy to production
firebase deploy --only functions

# Deploy everything
firebase deploy
```

### Monitor Production

**Firebase Console:**
- https://console.firebase.google.com/project/collab-canvas-e414b
- Navigate to: Functions → onVersionDelete
- Check logs, invocations, errors

**Verify:**
- Function deployed successfully
- No errors in logs
- Storage blobs deleted when versions removed

---

## Performance Benchmarks

Run these tests to verify performance:

### Snapshot Creation
```javascript
console.time('exportSnapshot');
const snapshot = await exportSnapshot(editor, roomId, userId);
console.timeEnd('exportSnapshot'); // Expected: 50-200ms
```

### Compression
```javascript
console.time('compress');
const compressed = compressSnapshot(snapshot);
console.timeEnd('compress'); // Expected: 10-50ms
```

### Restore
```javascript
console.time('restore');
await importSnapshot(editor, snapshot);
console.timeEnd('restore'); // Expected: 100-300ms
```

---

## Troubleshooting

### "Failed to save snapshot"
- ✓ Check Firestore rules deployed
- ✓ Verify user authenticated
- ✓ Check Storage rules
- ✓ Verify network connectivity

### "Pre-restore snapshot not created"
- ✓ Check exportSnapshot() succeeds
- ✓ Verify createVersionMetadata() succeeds
- ✓ Check browser console for errors

### "Blob not deleted"
- ✓ Verify Cloud Function deployed
- ✓ Check function logs in Firebase Console
- ✓ Verify Storage permissions
- ✓ Check storagePath in Firestore doc

### Autosave not working
- ✓ Wait full 35 seconds (30s interval + processing)
- ✓ Verify content actually changed
- ✓ Check content hash computation
- ✓ Look for errors in console

---

## Success Criteria

All tests passing means:
- ✅ Manual snapshots create successfully
- ✅ Autosave triggers on content changes
- ✅ Restore works with pre-restore backup
- ✅ Cloud Function deletes blobs
- ✅ Retention prunes at 21st version
- ✅ Assets persist via manifest
- ✅ Security rules enforce permissions

**Feature is production-ready! 🎉**

---

## Next Steps

1. ✅ Complete local testing checklist
2. ✅ Verify Cloud Function in emulator
3. ✅ Test end-to-end flow
4. 🚀 Deploy to production
5. 📊 Monitor Firebase Console
6. 📝 Update user documentation

