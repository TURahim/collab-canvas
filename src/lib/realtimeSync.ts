/**
 * Firebase Realtime Database Sync
 * Handles real-time cursor positions and user presence
 */

import {
  ref,
  onValue,
  update,
  onDisconnect,
  serverTimestamp,
  DatabaseReference,
  get,
  remove,
} from "firebase/database";
import { realtimeDb } from "./firebase";
import { UserPresence, Cursor } from "../types";

/**
 * Updates the current user's cursor position in Realtime Database
 * Should be throttled to ~30Hz (every 33ms) to avoid excessive writes
 * 
 * @param userId - Current user's UID
 * @param cursor - Cursor position in page coordinates
 */
export async function updateCursorPosition(
  userId: string,
  cursor: { x: number; y: number }
): Promise<void> {
  if (!userId) return;

  const userCursorRef = ref(realtimeDb, `users/${userId}/cursor`);
  
  try {
    await update(userCursorRef, {
      x: cursor.x,
      y: cursor.y,
      lastSeen: serverTimestamp(),
    });
  } catch (error) {
    console.error("Error updating cursor position:", error);
  }
}

/**
 * Updates the current user's presence information (name, color, online status)
 * Called once when user joins and sets up auto-cleanup on disconnect
 * 
 * @param userId - Current user's UID
 * @param name - User's display name
 * @param color - User's color (hex)
 */
export async function updateUserPresence(
  userId: string,
  name: string,
  color: string
): Promise<void> {
  if (!userId) return;

  const userRef = ref(realtimeDb, `users/${userId}`);
  
  try {
    // Set user as online with current info
    await update(userRef, {
      name,
      color,
      online: true,
      lastSeen: serverTimestamp(),
    });

    // Configure auto-cleanup on disconnect
    const disconnectRef = onDisconnect(userRef);
    await disconnectRef.update({
      online: false,
      lastSeen: serverTimestamp(),
    });

    // Remove cursor on disconnect
    const cursorRef = ref(realtimeDb, `users/${userId}/cursor`);
    await onDisconnect(cursorRef).remove();
  } catch (error) {
    console.error("Error updating user presence:", error);
  }
}

/**
 * Marks user as offline (called on manual disconnect)
 * 
 * @param userId - Current user's UID
 */
export async function markUserOffline(userId: string): Promise<void> {
  if (!userId) return;

  const userRef = ref(realtimeDb, `users/${userId}`);
  
  try {
    await update(userRef, {
      online: false,
      lastSeen: serverTimestamp(),
    });

    // Remove cursor
    const cursorRef = ref(realtimeDb, `users/${userId}/cursor`);
    await remove(cursorRef);
  } catch (error) {
    console.error("Error marking user offline:", error);
  }
}

/**
 * Listens to all users' presence and cursor data
 * Filters out offline users and users without cursors
 * 
 * @param callback - Called with map of userId -> UserPresence whenever data changes
 * @returns Unsubscribe function to stop listening
 */
export function listenToUsers(
  callback: (users: Record<string, UserPresence>) => void
): () => void {
  const usersRef = ref(realtimeDb, "users");

  const unsubscribe = onValue(
    usersRef,
    (snapshot) => {
      const data = snapshot.val();
      
      if (!data) {
        callback({});
        return;
      }

      // Filter and transform user data
      const users: Record<string, UserPresence> = {};
      
      Object.entries(data).forEach(([userId, userData]: [string, any]) => {
        // Only include online users
        if (userData.online) {
          users[userId] = {
            name: userData.name || "Anonymous",
            color: userData.color || "#999999",
            cursor: userData.cursor || null,
            online: userData.online,
            lastSeen: userData.lastSeen || Date.now(),
          };
        }
      });

      callback(users);
    },
    (error) => {
      console.error("Error listening to users:", error);
      callback({});
    }
  );

  return unsubscribe;
}

/**
 * Listens to a specific user's cursor position
 * Useful for testing or following a specific user
 * 
 * @param userId - User ID to listen to
 * @param callback - Called with cursor position whenever it changes
 * @returns Unsubscribe function
 */
export function listenToUserCursor(
  userId: string,
  callback: (cursor: Cursor | null) => void
): () => void {
  const cursorRef = ref(realtimeDb, `users/${userId}/cursor`);

  const unsubscribe = onValue(
    cursorRef,
    (snapshot) => {
      const data = snapshot.val();
      callback(data || null);
    },
    (error) => {
      console.error("Error listening to cursor:", error);
      callback(null);
    }
  );

  return unsubscribe;
}

/**
 * Gets the current snapshot of all online users
 * Useful for initial state or one-time queries
 * 
 * @returns Promise with map of userId -> UserPresence
 */
export async function getOnlineUsers(): Promise<Record<string, UserPresence>> {
  const usersRef = ref(realtimeDb, "users");
  
  try {
    const snapshot = await get(usersRef);
    const data = snapshot.val();
    
    if (!data) {
      return {};
    }

    const users: Record<string, UserPresence> = {};
    
    Object.entries(data).forEach(([userId, userData]: [string, any]) => {
      if (userData.online) {
        users[userId] = {
          name: userData.name || "Anonymous",
          color: userData.color || "#999999",
          cursor: userData.cursor || null,
          online: userData.online,
          lastSeen: userData.lastSeen || Date.now(),
        };
      }
    });

    return users;
  } catch (error) {
    console.error("Error getting online users:", error);
    return {};
  }
}

/**
 * Sets up presence heartbeat to maintain online status
 * Should be called every 10 seconds to keep user marked as online
 * 
 * @param userId - Current user's UID
 * @returns Interval ID that can be cleared
 */
export function setupPresenceHeartbeat(userId: string): NodeJS.Timeout {
  const interval = setInterval(async () => {
    if (!userId) return;
    
    const userRef = ref(realtimeDb, `users/${userId}`);
    
    try {
      await update(userRef, {
        lastSeen: serverTimestamp(),
      });
    } catch (error) {
      console.error("Error updating heartbeat:", error);
    }
  }, 10000); // 10 seconds

  return interval;
}

