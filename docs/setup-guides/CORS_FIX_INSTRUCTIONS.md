# Firebase Storage CORS Configuration Fix

## Problem
Images uploaded to Firebase Storage cannot be loaded in the browser due to CORS (Cross-Origin Resource Sharing) restrictions.

**Error:** "Access to image at '...' from origin 'http://localhost:3000' has been blocked by CORS policy"

---

## Solution: Configure CORS for Firebase Storage

### Option 1: Using Google Cloud Console (Easiest - No Installation Required)

1. **Open Google Cloud Console**
   - Go to: https://console.cloud.google.com/storage/browser
   - Make sure project `collab-canvas-e414b` is selected (top-left dropdown)

2. **Find Your Storage Bucket**
   - Look for bucket named: `collab-canvas-e414b.appspot.com`
   - Click on the bucket name

3. **Set CORS Configuration**
   - Click on the **"Permissions"** tab at the top
   - Scroll down to **"CORS configuration"** section
   - Click **"Edit CORS configuration"**
   
4. **Paste This Configuration**
   ```json
   [
     {
       "origin": ["http://localhost:3000", "https://*.vercel.app", "https://collab-canvas-e414b.web.app"],
       "method": ["GET", "HEAD", "PUT", "POST", "DELETE"],
       "maxAgeSeconds": 3600,
       "responseHeader": ["Content-Type", "Access-Control-Allow-Origin"]
     }
   ]
   ```

5. **Save Changes**
   - Click **"Save"**
   - Wait ~30 seconds for changes to propagate

6. **Test**
   - Refresh your browser
   - Try uploading an image again
   - Should work without CORS errors!

---

### Option 2: Using gsutil Command (Requires Google Cloud SDK)

If you have Google Cloud SDK installed:

```bash
# Deploy CORS configuration
gsutil cors set cors.json gs://collab-canvas-e414b.appspot.com

# Verify it was set
gsutil cors get gs://collab-canvas-e414b.appspot.com
```

**To install Google Cloud SDK:**
- Mac: `brew install google-cloud-sdk`
- Windows/Linux: https://cloud.google.com/sdk/docs/install

---

### Option 3: Alternative - Use Firebase Public URLs

If CORS continues to be problematic, we can modify the asset management to use Firebase Storage's public URL format, which has better CORS support.

---

## Verification

After applying the fix:

1. Clear browser cache (Cmd+Shift+R or Ctrl+Shift+F5)
2. Open browser console (F12)
3. Upload an image to the canvas
4. Check console - should see no CORS errors
5. Refresh page - image should persist and load correctly

---

## Why This Happens

Firebase Storage, by default, doesn't allow cross-origin requests. This is a security measure. Since we're loading images from `firebasestorage.googleapis.com` into our app at `localhost:3000` (different origins), we need to explicitly allow this via CORS configuration.

---

## Production Note

The CORS configuration I provided includes:
- `http://localhost:3000` - for local development
- `https://*.vercel.app` - for Vercel preview/production deployments
- `https://collab-canvas-e414b.web.app` - for Firebase Hosting (if used)

This ensures images work in all environments.

