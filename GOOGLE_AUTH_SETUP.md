# Google Authentication Setup Guide

This guide will walk you through enabling Google Sign-In for CollabCanvas using Firebase Authentication.

## What's Been Implemented

✅ **Code Changes Complete:**
- Added `signInWithGoogle()` and `signOutUser()` functions to `useAuth` hook
- Added Google Sign-In button to AuthModal with Google branding
- Added Logout buttons in both UserList (next to your name) and top-right corner
- Proper error handling and loading states
- User is automatically marked offline in database when signing out

## Firebase Console Configuration

To enable Google Sign-In, you need to configure it in your Firebase project:

### Step 1: Enable Google Authentication

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project (`collab-canvas` or whatever you named it)
3. In the left sidebar, click **"Authentication"**
4. Click the **"Sign-in method"** tab
5. Find **"Google"** in the list of providers
6. Click on it and toggle **"Enable"**
7. Set the **"Project support email"** (your email address)
8. Click **"Save"**

### Step 2: Configure Authorized Domains

Firebase automatically authorizes:
- `localhost` (for local development)
- Your Firebase hosting domain
- Your Vercel domain (if deployed)

If you need to add additional domains:
1. Stay in the **"Authentication"** section
2. Go to the **"Settings"** tab
3. Scroll to **"Authorized domains"**
4. Click **"Add domain"** and enter your domain

### Step 3: (Optional) Customize OAuth Consent Screen

For production apps, you may want to customize the OAuth consent screen:

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select the project associated with your Firebase app
3. Navigate to **"APIs & Services" → "OAuth consent screen"**
4. Fill in your app name, logo, privacy policy, etc.

## How It Works

### Sign-In Flow

1. User visits the app
2. If not authenticated, they see the AuthModal with two options:
   - **"Continue with Google"** - Opens Google Sign-In popup
   - **Manual name entry** - Anonymous auth with custom display name
3. After Google Sign-In:
   - User's Google display name and profile are used
   - User is marked as online in Realtime Database
   - User can immediately start collaborating

### Sign-Out Flow

1. User clicks "Logout" button (either in UserList or top-right)
2. User is marked as offline in the database
3. Firebase Auth session is cleared
4. User is redirected back to AuthModal

## Testing

### Local Development

1. Make sure your dev server is running: `npm run dev`
2. Open `http://localhost:3000`
3. Click **"Continue with Google"**
4. Select your Google account
5. You should be signed in and see the canvas

### What to Test

- ✅ Google Sign-In button appears on AuthModal
- ✅ Clicking it opens Google Sign-In popup
- ✅ After sign-in, user's Google name is displayed
- ✅ Logout button appears in UserList next to "You" badge
- ✅ Logout button appears in top-right corner
- ✅ Clicking Logout returns to AuthModal
- ✅ User can sign in again with Google or manually

## Security Considerations

### Current Setup

- ✅ Google Sign-In uses Firebase's secure OAuth flow
- ✅ No passwords are stored (Google handles authentication)
- ✅ User data is synced to Firebase Realtime Database
- ✅ Users are automatically marked offline on disconnect

### Recommended Next Steps (Future)

1. **Firestore Security Rules**: Add rules to restrict who can read/write shapes
2. **Database Rules**: Add rules for Realtime Database (users, cursors)
3. **Email Verification**: Optionally require email verification
4. **Multi-Provider Support**: Add GitHub, Microsoft, etc.

## Troubleshooting

### "Unauthorized domain" error

- Make sure you're testing on `localhost:3000` or an authorized domain
- Check Firebase Console → Authentication → Settings → Authorized domains

### Google Sign-In popup doesn't open

- Check browser console for errors
- Make sure pop-ups are not blocked
- Verify Firebase config in `.env.local` is correct

### User data not appearing after sign-in

- Check Firebase Console → Realtime Database to see if user data is being written
- Check browser console for database permission errors
- Verify Realtime Database rules allow writes

## Files Modified

- `src/hooks/useAuth.ts` - Added `signInWithGoogle()` and improved `signOutUser()`
- `src/components/AuthModal.tsx` - Added Google Sign-In button
- `src/components/UserList.tsx` - Added Logout button next to user name
- `src/components/CollabCanvas.tsx` - Updated logout handler with proper error handling

## Next Steps

1. **Enable Google Sign-In in Firebase Console** (see Step 1 above)
2. **Test locally** to verify it works
3. **Deploy to production** (Vercel domain will be auto-authorized)
4. **Add security rules** for production (see Security Considerations)

---

**Status:** ✅ Code complete, awaiting Firebase configuration
**Time to Configure:** ~2 minutes
**Complexity:** Low (just enable a toggle in Firebase)

