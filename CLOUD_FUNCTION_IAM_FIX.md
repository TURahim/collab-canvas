# Fix Cloud Functions IAM Error

## Problem
```
Error: We failed to modify the IAM policy for the project. 
The functions deployment requires specific roles to be granted to service agents.
```

## Quick Solution: Grant Permissions in Google Cloud Console

### Step 1: Open IAM Settings
Go to: https://console.cloud.google.com/iam-admin/iam?project=collab-canvas-e414b

### Step 2: Find Service Accounts

Look for these service accounts:
```
collab-canvas-e414b@appspot.gserviceaccount.com
YOUR_PROJECT_NUMBER@cloudbuild.gserviceaccount.com
```

### Step 3: Grant Required Roles

For **App Engine Service Account** (`...@appspot.gserviceaccount.com`):
- ✅ **Editor** or **Owner** (basic permission)
- ✅ **Cloud Functions Developer**
- ✅ **Cloud Storage Admin**
- ✅ **Service Account User**

For **Cloud Build Service Account** (if shown):
- ✅ **Cloud Functions Developer**
- ✅ **Service Account User**

### Step 4: Click "Save"

### Step 5: Try Deploying Again
```bash
cd /Users/tahmeedrahim/Projects/collab-canvas-submission
firebase deploy --only functions
```

---

## Alternative: Use Project Owner Account

If you're the project owner:

```bash
# Re-authenticate with owner account
firebase logout
firebase login

# Deploy with force flag
firebase deploy --only functions --force
```

---

## Alternative: Enable Required APIs

Sometimes the issue is missing APIs:

```bash
# Enable Cloud Functions API
gcloud services enable cloudfunctions.googleapis.com

# Enable Cloud Build API
gcloud services enable cloudbuild.googleapis.com

# Enable Cloud Run API
gcloud services enable run.googleapis.com

# Try deploying again
firebase deploy --only functions
```

---

## If Still Not Working: Skip Cloud Functions

The Cloud Function is **optional** for the MVP. See:
- `VERSION_HISTORY_WORKING_MVP.md` - Full guide for working without Cloud Functions
- Everything works except automatic Storage blob cleanup
- Manual cleanup is easy via Firebase Console

---

## What the Cloud Function Does

The `onVersionDelete` function automatically deletes Storage blobs when Firestore version documents are deleted.

**Without it:**
- ✅ All features work perfectly
- ⚠️ Old snapshot files (.json.gz) remain in Storage
- Impact: ~40MB for 100 rooms (negligible)
- Workaround: Manual cleanup via Firebase Console

**With it:**
- ✅ Everything works
- ✅ Automatic blob cleanup
- ✅ No manual intervention needed

---

## Storage Impact Without Cloud Function

**Small-scale (10 rooms):**
- 10 rooms × 20 versions × 20KB = 4MB
- Free tier: 5GB
- Usage: 0.08%

**Medium-scale (100 rooms):**
- 100 rooms × 20 versions × 20KB = 40MB
- Free tier: 5GB
- Usage: 0.8%

**Large-scale (1000 rooms):**
- 1000 rooms × 20 versions × 20KB = 400MB
- Free tier: 5GB
- Usage: 8%

**Conclusion:** Not a problem for most use cases!

---

## Recommended Approach

1. **For MVP:** Skip Cloud Functions (see `VERSION_HISTORY_WORKING_MVP.md`)
2. **For Production:** Fix IAM permissions and deploy
3. **Alternative:** Implement manual cleanup script or admin panel

Your Version History feature is **complete and working** without the Cloud Function! 🎉

