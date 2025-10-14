/**
 * Firebase Realtime Database Sync
 * Handles real-time cursor positions and user presence
 */

import type { DataSnapshot } from "firebase/database";
import {
  get,
  onDisconnect,
  onValue,
  ref,
  remove,
  serverTimestamp,
  update,
} from "firebase/database";

import type { Cursor, UserPresence } from "../types";
import { realtimeDb } from "./firebase";
import { withRetry } from "./utils";

/**
 * Default values for user data
 */
const DEFAULT_USER_NAME = "Anonymous";
const DEFAULT_USER_COLOR = "#999999";
const HEARTBEAT_INTERVAL_MS = 10000; // 10 seconds

/**
 * Raw user data structure from Firebase Realtime Database
 */
interface RawUserData {
  name?: string;
  color?: string;
  cursor?: Cursor;
  online?: boolean;
  lastSeen?: number;
}

/**
 * Helper function to transform raw Firebase user data to UserPresence type
 * Applies default values for missing fields
 */
function transformUserData(userId: string, rawData: RawUserData): UserPresence {
  return {
    name: rawData.name || DEFAULT_USER_NAME,
    color: rawData.color || DEFAULT_USER_COLOR,
    cursor: rawData.cursor || null,
    online: rawData.online ?? false,
    lastSeen: rawData.lastSeen || Date.now(),
  };
}

/**
 * Updates the current user's cursor position in Realtime Database
 * Should be throttled to ~30Hz (every 33ms) to avoid excessive writes
 * 
 * @param userId - Current user's UID
 * @param cursor - Cursor position in page coordinates
 * @returns Promise that resolves when update is complete
 */
export async function updateCursorPosition(
  userId: string,
  cursor: { x: number; y: number }
): Promise<void> {
  if (!userId) {
    return;
  }

  const userCursorRef = ref(realtimeDb, `users/${userId}/cursor`);
  
  try {
    await update(userCursorRef, {
      x: cursor.x,
      y: cursor.y,
      lastSeen: serverTimestamp(),
    });
  } catch (error) {
    console.error("[RealtimeSync] Error updating cursor position:", error);
  }
}

/**
 * Updates the current user's presence information (name, color, online status)
 * Called once when user joins and sets up auto-cleanup on disconnect
 * 
 * @param userId - Current user's UID
 * @param name - User's display name
 * @param color - User's color (hex format)
 * @returns Promise that resolves when presence is updated
 */
export async function updateUserPresence(
  userId: string,
  name: string,
  color: string
): Promise<void> {
  if (!userId) {
    return;
  }

  const userRef = ref(realtimeDb, `users/${userId}`);
  
  try {
    await withRetry(async (): Promise<void> => {
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
    });
  } catch (error) {
    console.error("[RealtimeSync] Error updating user presence:", error);
  }
}

/**
 * Marks user as offline (called on manual disconnect)
 * 
 * @param userId - Current user's UID
 * @returns Promise that resolves when user is marked offline
 */
export async function markUserOffline(userId: string): Promise<void> {
  if (!userId) {
    return;
  }

  const userRef = ref(realtimeDb, `users/${userId}`);
  const cursorRef = ref(realtimeDb, `users/${userId}/cursor`);
  
  try {
    await update(userRef, {
      online: false,
      lastSeen: serverTimestamp(),
    });

    await remove(cursorRef);
  } catch (error) {
    console.error("[RealtimeSync] Error marking user offline:", error);
  }
}

/**
 * Listens to all users' presence and cursor data in real-time
 * Filters out offline users and transforms data to UserPresence format
 * 
 * @param callback - Called with map of userId -> UserPresence whenever data changes
 * @returns Unsubscribe function to stop listening
 */
export function listenToUsers(
  callback: (users: Record<string, UserPresence>) => void
): () => void {
  const usersRef = ref(realtimeDb, "users");

  const handleSnapshot = (snapshot: DataSnapshot): void => {
    const data = snapshot.val() as Record<string, RawUserData> | null;
    
    if (!data) {
      callback({});
      return;
    }

    // Filter and transform user data - only include online users
    const onlineUsers: Record<string, UserPresence> = {};
    
    Object.entries(data).forEach(([userId, rawUserData]) => {
      if (rawUserData.online) {
        onlineUsers[userId] = transformUserData(userId, rawUserData);
      }
    });

    callback(onlineUsers);
  };

  const handleError = (error: Error): void => {
    console.error("[RealtimeSync] Error listening to users:", error);
    callback({});
  };

  const unsubscribe = onValue(usersRef, handleSnapshot, handleError);

  return unsubscribe;
}

/**
 * Listens to a specific user's cursor position in real-time
 * Useful for testing or following a specific user
 * 
 * @param userId - User ID to listen to
 * @param callback - Called with cursor position whenever it changes
 * @returns Unsubscribe function to stop listening
 */
export function listenToUserCursor(
  userId: string,
  callback: (cursor: Cursor | null) => void
): () => void {
  const cursorRef = ref(realtimeDb, `users/${userId}/cursor`);

  const handleSnapshot = (snapshot: DataSnapshot): void => {
    const cursor = snapshot.val() as Cursor | null;
    callback(cursor);
  };

  const handleError = (error: Error): void => {
    console.error("[RealtimeSync] Error listening to cursor:", error);
    callback(null);
  };

  const unsubscribe = onValue(cursorRef, handleSnapshot, handleError);

  return unsubscribe;
}

/**
 * Gets the current snapshot of all online users (one-time read)
 * Useful for initial state or one-time queries
 * 
 * @returns Promise resolving to map of userId -> UserPresence
 */
export async function getOnlineUsers(): Promise<Record<string, UserPresence>> {
  const usersRef = ref(realtimeDb, "users");
  
  try {
    const snapshot = await get(usersRef);
    const data = snapshot.val() as Record<string, RawUserData> | null;
    
    if (!data) {
      return {};
    }

    // Filter and transform user data - only include online users
    const onlineUsers: Record<string, UserPresence> = {};
    
    Object.entries(data).forEach(([userId, rawUserData]) => {
      if (rawUserData.online) {
        onlineUsers[userId] = transformUserData(userId, rawUserData);
      }
    });

    return onlineUsers;
  } catch (error) {
    console.error("[RealtimeSync] Error getting online users:", error);
    return {};
  }
}

/**
 * Sets up presence heartbeat to maintain online status
 * Updates lastSeen timestamp every 10 seconds to keep user marked as online
 * 
 * @param userId - Current user's UID
 * @returns Interval ID that can be cleared with clearInterval()
 */
export function setupPresenceHeartbeat(userId: string): NodeJS.Timeout {
  const heartbeatCallback = async (): Promise<void> => {
    if (!userId) {
      return;
    }
    
    const userRef = ref(realtimeDb, `users/${userId}`);
    
    try {
      await update(userRef, {
        lastSeen: serverTimestamp(),
      });
    } catch (error) {
      console.error("[RealtimeSync] Error updating heartbeat:", error);
    }
  };

  const intervalId = setInterval(heartbeatCallback, HEARTBEAT_INTERVAL_MS);

  return intervalId;
}

