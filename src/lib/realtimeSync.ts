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
    // Permission denied errors are expected when user signs out
    if (error instanceof Error && (error.message?.includes("PERMISSION_DENIED") || error.message?.includes("permission"))) {
      // Silently ignore - user is signing out or auth revoked
      return;
    }
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
    // Permission denied errors are expected when user signs out
    if (error instanceof Error && (error.message?.includes("PERMISSION_DENIED") || error.message?.includes("permission"))) {
      // Silently ignore - user is signing out or auth revoked
      return;
    }
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
    // Permission denied errors are expected when user signs out
    if (error instanceof Error && (error.message?.includes("PERMISSION_DENIED") || error.message?.includes("permission"))) {
      // Silently ignore - user is signing out or auth revoked
      return;
    }
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
    // Permission denied errors are expected when user signs out
    // The listener is cleaned up immediately after, so we silently ignore these
    if (error.message?.includes("PERMISSION_DENIED") || error.message?.includes("permission")) {
      if (process.env.NODE_ENV === "development") {
        console.log("[RealtimeSync] User listener permission denied (expected during sign-out)");
      }
    } else {
      console.error("[RealtimeSync] Error listening to users:", error);
    }
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
    // Permission denied errors are expected when user signs out or auth isn't ready
    if (error instanceof Error && (error.message?.includes("PERMISSION_DENIED") || error.message?.includes("permission"))) {
      if (process.env.NODE_ENV === "development") {
        console.log("[RealtimeSync] Get online users permission denied (expected during sign-out or before auth)");
      }
    } else {
      console.error("[RealtimeSync] Error getting online users:", error);
    }
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

/**
 * Kicks a user from a room by removing their presence and setting a temporary ban
 * Ban duration is 5 minutes to prevent immediate rejoining
 * 
 * @param roomId - Room ID from which to kick the user
 * @param targetUserId - User ID to kick
 * @param kickedBy - User ID who initiated the kick (for logging)
 * @returns Promise that resolves when kick is complete
 */
export async function kickUserFromRoom(
  roomId: string,
  targetUserId: string,
  kickedBy: string
): Promise<void> {
  if (!roomId || !targetUserId || !kickedBy) {
    throw new Error("Room ID, target user ID, and kicked by user ID are required");
  }

  try {
    const BAN_DURATION_MS = 5 * 60 * 1000; // 5 minutes
    const bannedUntil = Date.now() + BAN_DURATION_MS;

    // Write ban record to RTDB
    const banRef = ref(realtimeDb, `rooms/${roomId}/bans/${targetUserId}`);
    await update(banRef, {
      bannedUntil,
      bannedBy: kickedBy,
      bannedAt: serverTimestamp(),
    });

    // Force user offline by marking them offline in global presence
    const userRef = ref(realtimeDb, `users/${targetUserId}`);
    await update(userRef, {
      online: false,
      lastSeen: serverTimestamp(),
    });

    // Remove cursor
    const cursorRef = ref(realtimeDb, `users/${targetUserId}/cursor`);
    await remove(cursorRef);

    console.log(`[RealtimeSync] User ${targetUserId} kicked from room ${roomId} by ${kickedBy}`);
  } catch (error) {
    console.error("[RealtimeSync] Error kicking user:", error);
    throw error;
  }
}

/**
 * Checks if a user is currently banned from a room
 * 
 * @param roomId - Room ID to check
 * @param userId - User ID to check
 * @returns Promise resolving to ban expiration timestamp, or null if not banned
 */
export async function checkRoomBan(
  roomId: string,
  userId: string
): Promise<number | null> {
  if (!roomId || !userId) {
    return null;
  }

  try {
    const banRef = ref(realtimeDb, `rooms/${roomId}/bans/${userId}`);
    const snapshot = await get(banRef);

    if (!snapshot.exists()) {
      return null;
    }

    const banData = snapshot.val() as { bannedUntil: number };
    const bannedUntil = banData.bannedUntil;

    // Check if ban has expired
    if (bannedUntil && bannedUntil > Date.now()) {
      return bannedUntil;
    }

    // Ban has expired, remove it
    await remove(banRef);
    return null;
  } catch (error) {
    console.error("[RealtimeSync] Error checking room ban:", error);
    return null;
  }
}

