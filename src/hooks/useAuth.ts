/**
 * CollabCanvas - useAuth Hook
 * Manages Firebase anonymous authentication and user presence in Realtime Database
 */

import { useEffect, useState } from "react";
import { 
  signInAnonymously, 
  onAuthStateChanged, 
  updateProfile,
  User as FirebaseUser 
} from "firebase/auth";
import { ref, set, onDisconnect, serverTimestamp } from "firebase/database";
import { auth, realtimeDb } from "../lib/firebase";
import { generateColorFromString } from "../lib/utils";
import { User, AuthState } from "../types";

/**
 * Custom hook for authentication and user management
 * @returns AuthState object with user, loading, and error states
 */
export function useAuth(): AuthState & {
  setDisplayName: (name: string) => Promise<void>;
} {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    // Check if Firebase is configured
    if (!auth || !auth.app) {
      setError(new Error("Firebase is not configured. Please add your Firebase credentials to .env.local"));
      setLoading(false);
      return;
    }

    // Listen to auth state changes
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
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
          // No user signed in, trigger anonymous sign-in
          await signInAnonymously(auth);
        }
      } catch (err) {
        console.error("Auth error:", err);
        
        // Provide helpful error messages
        if (err instanceof Error) {
          if (err.message.includes("configuration-not-found")) {
            setError(new Error("Firebase configuration not found. Please check your .env.local file has valid Firebase credentials."));
          } else if (err.message.includes("auth/invalid-api-key")) {
            setError(new Error("Invalid Firebase API key. Please check your NEXT_PUBLIC_FIREBASE_API_KEY in .env.local"));
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

    return () => unsubscribe();
  }, []);

  /**
   * Set display name for the current user
   * @param name - Display name to set
   */
  const setDisplayName = async (name: string): Promise<void> => {
    if (!auth.currentUser) {
      throw new Error("No authenticated user");
    }

    if (!name || name.trim().length === 0) {
      throw new Error("Display name cannot be empty");
    }

    try {
      setLoading(true);
      setError(null);

      // Update Firebase Auth profile
      await updateProfile(auth.currentUser, {
        displayName: name.trim(),
      });

      // Create updated user object
      const userData: User = {
        uid: auth.currentUser.uid,
        displayName: name.trim(),
        color: generateColorFromString(auth.currentUser.uid),
        online: true,
        lastSeen: Date.now(),
      };

      // Write to Realtime Database
      await writeUserToDatabase(userData);

      // Update local state
      setUser(userData);
    } catch (err) {
      console.error("Error setting display name:", err);
      setError(err instanceof Error ? err : new Error("Failed to set display name"));
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { user, loading, error, setDisplayName };
}

/**
 * Write user data to Realtime Database and set up presence
 * @param userData - User data to write
 */
async function writeUserToDatabase(userData: User): Promise<void> {
  try {
    console.log("Writing user to database:", userData.uid);
    const userRef = ref(realtimeDb, `users/${userData.uid}`);

    // Write user data
    await set(userRef, {
      name: userData.displayName,
      color: userData.color,
      online: true,
      lastSeen: serverTimestamp(),
      cursor: null,
    });

    console.log("User data written successfully");

    // Set up presence: mark user as offline when disconnected
    const disconnectRef = ref(realtimeDb, `users/${userData.uid}/online`);
    await onDisconnect(disconnectRef).set(false);

    // Also update lastSeen on disconnect
    const lastSeenRef = ref(realtimeDb, `users/${userData.uid}/lastSeen`);
    await onDisconnect(lastSeenRef).set(serverTimestamp());

    console.log("Presence handlers set up successfully");
  } catch (error) {
    console.error("Error writing to database:", error);
    console.error("Error details:", {
      code: (error as any)?.code,
      message: (error as any)?.message,
      uid: userData.uid,
    });
    throw error;
  }
}

