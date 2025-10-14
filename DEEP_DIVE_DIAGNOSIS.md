# Deep Dive: UserList & Shape Persistence Issues

## Problems Reported

1. **UserList panel disappeared** - Online users sidebar not showing
2. **Drawings not persisting** - Shapes disappear after page refresh

## Root Cause Analysis

### Issue #1: No Anonymous Authentication

**What Happened:**
When I implemented Google Sign-In, I removed the automatic `signInAnonymously()` call from the auth state listener to avoid conflicts. However, I forgot to add it back for users who manually enter their name.

**Impact:**
- Users who click "Continue" with manual name entry were NOT authenticated
- Without authentication (`request.auth != null`), Firestore rules block all reads/writes
- Without authentication, Realtime Database rules block all reads/writes
- Result: No shapes load, no shapes save, no user presence data

**Code Location:**
```typescript
// src/hooks/useAuth.ts
onAuthStateChanged(auth, async (firebaseUser: FirebaseUser | null) => {
  if (firebaseUser) {
    // ... handle signed-in user
  } else {
    // MISSING: signInAnonymously() call!
    setUser(null);
    setError(null);
  }
});
```

### Issue #2: Cascading Effects

Once authentication was broken, everything else failed:

1. **useShapes Hook:**
   - `getAllShapes()` fails (Firestore permission denied)
   - `writeShapeToFirestore()` fails (Firestore permission denied)
   - Console shows: `[useShapes] Error loading initial shapes`

2. **usePresence Hook:**
   - `getOnlineUsers()` fails (Realtime DB permission denied)
   - `listenToUsers()` gets no data
   - `userCount` returns 0
   - UserList doesn't render (no `currentUserId`)

3. **UserList Component:**
   - Receives `currentUserId: null` (no auth)
   - Early returns `null` (line 48-50)
   - Panel never renders

## The Fix

### 1. Restored Anonymous Sign-In

**File:** `src/hooks/useAuth.ts`

```typescript
import { signInAnonymously } from "firebase/auth";

// In onAuthStateChanged listener:
} else {
  // User is signed out - sign in anonymously
  console.log("[useAuth] No user, signing in anonymously");
  try {
    const result = await signInAnonymously(auth);
    console.log("[useAuth] Anonymous sign-in successful:", result.user.uid);
    // onAuthStateChanged will be called again with the new user
  } catch (signInErr) {
    console.error("[useAuth] Anonymous sign-in failed:", signInErr);
    setError(signInErr instanceof Error ? signInErr : new Error("Failed to sign in"));
  }
}
```

### 2. How It Works Now

**Authentication Flow:**

1. **Page Load:**
   - `onAuthStateChanged` fires with `null` user
   - Auto-signs in anonymously
   - `onAuthStateChanged` fires again with anonymous user
   - User sees AuthModal

2. **Manual Name Entry:**
   - User enters name, clicks "Continue"
   - `setDisplayName()` updates Firebase Auth profile
   - User data written to Realtime Database
   - Canvas loads with full functionality

3. **Google Sign-In:**
   - User clicks "Continue with Google"
   - Google popup opens
   - `signInWithGoogle()` completes
   - Google profile data is used
   - Canvas loads with full functionality

### 3. Security Model

Both auth methods work because:

**Firestore Rules:**
```javascript
allow read, write: if request.auth != null;
```
✅ Anonymous auth satisfies `request.auth != null`  
✅ Google auth satisfies `request.auth != null`

**Realtime Database Rules:**
```json
{
  "rules": {
    "users": {
      ".read": "auth != null",
      "$uid": {
        ".write": "$uid === auth.uid"
      }
    }
  }
}
```
✅ Anonymous users have `auth.uid`  
✅ Google users have `auth.uid`

## Testing Checklist

After the fix, verify:

### Authentication
- [ ] Page loads and shows AuthModal
- [ ] Console shows: `[useAuth] No user, signing in anonymously`
- [ ] Console shows: `[useAuth] Anonymous sign-in successful: [uid]`

### Manual Name Entry
- [ ] Enter name and click "Continue"
- [ ] Canvas appears
- [ ] UserList panel visible on left
- [ ] Your name shows with "You" badge
- [ ] User count badge shows "1"

### Shape Persistence
- [ ] Draw a shape
- [ ] Console shows: `[useShapes] Loading initial shapes from Firestore...`
- [ ] Refresh the page
- [ ] Shape is still visible
- [ ] Console shows: `[useShapes] Loaded X shapes from Firestore`
- [ ] Console shows: `[useShapes] Restored shape: { id: ..., type: ... }`

### Google Sign-In
- [ ] Click "Continue with Google"
- [ ] Google popup opens
- [ ] Select account
- [ ] Canvas appears with Google display name
- [ ] UserList shows your Google name

### Logout
- [ ] Click "Logout" button (UserList or top-right)
- [ ] Console shows: `[useAuth] User marked as offline in database`
- [ ] Console shows: `[useAuth] User signed out successfully`
- [ ] AuthModal appears
- [ ] Console shows: `[useAuth] No user, signing in anonymously` (auto-sign-in for next session)

## Why This Happened

**Context:**
When implementing the logout fix and Google Sign-In, I made these changes:
1. Removed automatic `signInAnonymously()` to avoid conflicts with Google auth
2. Added explicit sign-out handling
3. Added state cleanup on sign-out

**The Bug:**
I correctly prevented auto-sign-in when users manually sign out, but I didn't restore it for the initial page load case. This meant:
- Logout → Sign out → User state cleared → No auto-sign-in → Stuck unauthenticated
- Fresh page load → No user → No auto-sign-in → Stuck unauthenticated

**The Fix:**
Restore auto-sign-in for the `null` user case, which happens:
- On initial page load
- After signing out

This doesn't conflict with Google Sign-In because Google auth happens explicitly via button click, not via the auth state listener.

## Files Modified

1. `src/hooks/useAuth.ts`
   - Re-added `signInAnonymously` import
   - Restored automatic anonymous sign-in in auth state listener
   - Added error handling for sign-in failures

2. `src/components/UserList.tsx`
   - Removed debug logs (cleanup)

3. `database.rules.json`
   - Already fixed in previous commit (field-level permissions)

## Deployment

```bash
# Code changes only, no Firebase rules changes needed
git add .
git commit -m "fix: restore anonymous authentication for manual name entry"
git push origin dev
```

## Prevention

To prevent this in the future:

1. **Always test both authentication paths:**
   - Manual name entry (anonymous auth)
   - Google Sign-In (OAuth)

2. **Check console logs during testing:**
   - Look for authentication success messages
   - Watch for permission denied errors
   - Verify hooks are loading data

3. **Test the full user journey:**
   - Fresh page load → Sign in → Use app → Sign out → Sign in again

## Status

✅ **Root cause identified**: Missing anonymous sign-in  
✅ **Fix applied**: Restored auto-sign-in in auth listener  
✅ **No rules changes needed**: Existing rules already correct  
✅ **Ready for testing**: Restart browser and test full flow  

---

**Date:** October 14, 2025  
**Issue Severity:** Critical (blocked all functionality)  
**Time to Diagnose:** ~15 minutes  
**Time to Fix:** ~2 minutes  
**Complexity:** Low (one-line fix with imports)

