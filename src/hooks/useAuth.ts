/**
 * CollabCanvas - useAuth Hook
 * Manages Firebase anonymous authentication and user presence in Realtime Database
 */

import type { User as FirebaseUser } from "firebase/auth";
import { onAuthStateChanged, signInAnonymously, updateProfile, GoogleAuthProvider, signInWithPopup, signOut } from "firebase/auth";
import { onDisconnect, ref, serverTimestamp, set } from "firebase/database";
import { useEffect, useState } from "react";

import type { AuthState, User } from "../types";
import { auth, realtimeDb } from "../lib/firebase";
import { generateColorFromString } from "../lib/utils";

/**
 * Return type for useAuth hook
 */
interface UseAuthReturn extends AuthState {
  setDisplayName: (name: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOutUser: () => Promise<void>;
}

/**
 * Custom hook for authentication and user management
 * Handles anonymous Firebase authentication and syncs user presence to Realtime Database
 * 
 * @returns Object containing user state, loading state, error state, and setDisplayName function
 */
export function useAuth(): UseAuthReturn {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    // Check if Firebase is configured
    if (!auth || !auth.app) {
      setError(new Error("Firebase is not configured. Please add your Firebase credentials to .env.local"));
      setLoading(false);
      return;
    }

    // Listen to auth state changes
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser: FirebaseUser | null) => {
      try {
        if (firebaseUser) {
          // User is signed in
          const userData: User = {
            uid: firebaseUser.uid,
            displayName: firebaseUser.displayName,
            color: generateColorFromString(firebaseUser.uid),
            online: true,
            lastSeen: Date.now(),
          };

          setUser(userData);

          // If user has a display name, write to Realtime Database
          if (firebaseUser.displayName) {
            await writeUserToDatabase(userData);
          }
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
      } catch (err) {
        console.error("[useAuth] Authentication error:", err);
        
        // Provide helpful error messages based on error type
        if (err instanceof Error) {
          if (err.message.includes("configuration-not-found")) {
            setError(
              new Error(
                "Firebase configuration not found. Please check your .env.local file has valid Firebase credentials."
              )
            );
          } else if (err.message.includes("auth/invalid-api-key")) {
            setError(
              new Error(
                "Invalid Firebase API key. Please check your NEXT_PUBLIC_FIREBASE_API_KEY in .env.local"
              )
            );
          } else {
            setError(err);
          }
        } else {
          setError(new Error("Authentication failed"));
        }
      } finally {
        setLoading(false);
      }
    });

    return (): void => {
      unsubscribe();
    };
  }, []);

  /**
   * Sets display name for the current authenticated user
   * Updates both Firebase Auth profile and Realtime Database
   * 
   * @param name - Display name to set (will be trimmed)
   * @throws Error if no authenticated user or name is empty
   */
  const setDisplayName = async (name: string): Promise<void> => {
    if (!auth.currentUser) {
      throw new Error("No authenticated user");
    }

    const trimmedName = name.trim();
    if (trimmedName.length === 0) {
      throw new Error("Display name cannot be empty");
    }

    try {
      setLoading(true);
      setError(null);

      // Update Firebase Auth profile
      await updateProfile(auth.currentUser, {
        displayName: trimmedName,
      });

      // Create updated user object
      const userData: User = {
        uid: auth.currentUser.uid,
        displayName: trimmedName,
        color: generateColorFromString(auth.currentUser.uid),
        online: true,
        lastSeen: Date.now(),
      };

      // Write to Realtime Database
      await writeUserToDatabase(userData);

      // Update local state
      setUser(userData);
    } catch (err) {
      console.error("[useAuth] Error setting display name:", err);
      const error = err instanceof Error ? err : new Error("Failed to set display name");
      setError(error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const signInWithGoogle = async (): Promise<void> => {
    try {
      setLoading(true);
      setError(null);
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (err) {
      const error = err instanceof Error ? err : new Error("Google sign-in failed");
      setError(error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const signOutUser = async (): Promise<void> => {
    if (!auth.currentUser) {
      console.warn("[useAuth] No user to sign out");
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      const userId = auth.currentUser.uid;
      
      // Mark user as offline in database before signing out
      // Note: We update specific fields rather than overwriting the entire user object
      // This must happen BEFORE signOut() while the user is still authenticated
      try {
        const onlineRef = ref(realtimeDb, `users/${userId}/online`);
        const lastSeenRef = ref(realtimeDb, `users/${userId}/lastSeen`);
        
        await set(onlineRef, false);
        await set(lastSeenRef, serverTimestamp());
        console.log("[useAuth] User marked as offline in database");
      } catch (dbErr) {
        // Silently continue - onDisconnect() handlers will clean up if this fails
        // This can happen if user is already disconnected or has no internet
        if (process.env.NODE_ENV === "development") {
          console.warn("[useAuth] Could not update database on logout (continuing anyway):", dbErr);
        }
      }
      
      // Sign out from Firebase Auth
      await signOut(auth);
      console.log("[useAuth] User signed out successfully");
      
      // Clear local state (this will also be done by onAuthStateChanged)
      setUser(null);
    } catch (err) {
      console.error("[useAuth] Sign out error:", err);
      const error = err instanceof Error ? err : new Error("Sign out failed");
      setError(error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  return { user, loading, error, setDisplayName, signInWithGoogle, signOutUser };
}

/**
 * Writes user data to Realtime Database and sets up presence handlers
 * Configures automatic offline status on disconnect
 * 
 * @param userData - User data to write to database
 * @throws Error if database write fails
 */
async function writeUserToDatabase(userData: User): Promise<void> {
  try {
    const userRef = ref(realtimeDb, `users/${userData.uid}`);

    // Write user data to database
    await set(userRef, {
      name: userData.displayName,
      color: userData.color,
      online: true,
      lastSeen: serverTimestamp(),
      cursor: null,
    });

    // Set up presence: mark user as offline when disconnected
    const onlineRef = ref(realtimeDb, `users/${userData.uid}/online`);
    await onDisconnect(onlineRef).set(false);

    // Update lastSeen timestamp on disconnect
    const lastSeenRef = ref(realtimeDb, `users/${userData.uid}/lastSeen`);
    await onDisconnect(lastSeenRef).set(serverTimestamp());
  } catch (error) {
    console.error("[useAuth] Error writing user to database:", error);
    
    // Log additional context for debugging
    if (error instanceof Error) {
      console.error("[useAuth] Database write failed:", {
        message: error.message,
        uid: userData.uid,
      });
    }
    
    throw error;
  }
}

