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
 * Realtime sync pause state - used during snapshot restore
 */
let isRealtimePaused = false;
let updateQueue: Array<() => void> = [];

/**
 * Pause realtime sync updates
 * 
 * When paused, incoming updates are queued but not applied to the editor.
 * This is used during snapshot restoration to prevent sync conflicts.
 */
export function pauseRealtime(): void {
  isRealtimePaused = true;
  updateQueue = [];
  console.log("[RealtimeSync] Paused - updates will be queued");
}

/**
 * Resume realtime sync updates
 * 
 * Flushes any queued updates and resumes normal sync behavior.
 */
export function resumeRealtime(): void {
  isRealtimePaused = false;
  console.log("[RealtimeSync] Resumed - flushing", updateQueue.length, "queued updates");
  updateQueue.forEach((fn) => fn());
  updateQueue = [];
}

/**
 * Check if updates should be applied
 * 
 * @returns True if updates should be applied, false if paused
 */
export function shouldApplyUpdate(): boolean {
  return !isRealtimePaused;
}

/**
 * Queue an update to be applied when sync resumes
 * 
 * @param updateFn - Function to execute when sync resumes
 */
export function queueUpdate(updateFn: () => void): void {
  if (isRealtimePaused) {
    updateQueue.push(updateFn);
  } else {
    updateFn();
  }
}

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
 * Updates user presence in a specific room (room-scoped presence)
 * This is the new room-aware presence system that prevents cross-room visibility
 * 
 * @param roomId - Room ID where user is present
 * @param userId - Current user's UID
 * @param name - User's display name
 * @param color - User's color (hex format)
 * @returns Promise that resolves when presence is updated
 */
export async function updateRoomPresence(
  roomId: string,
  userId: string,
  name: string,
  color: string
): Promise<void> {
  if (!roomId || !userId) {
    return;
  }

  const roomPresenceRef = ref(realtimeDb, `rooms/${roomId}/presence/${userId}`);
  
  try {
    await withRetry(async (): Promise<void> => {
      // Set user as online in this specific room
      await update(roomPresenceRef, {
        name,
        color,
        online: true,
        lastSeen: serverTimestamp(),
      });

      // Configure auto-cleanup on disconnect
      const disconnectRef = onDisconnect(roomPresenceRef);
      await disconnectRef.update({
        online: false,
        lastSeen: serverTimestamp(),
      });

      // Remove cursor on disconnect
      const cursorRef = ref(realtimeDb, `rooms/${roomId}/presence/${userId}/cursor`);
      await onDisconnect(cursorRef).remove();
    });
    
    console.log(`[RealtimeSync] Room presence updated for user ${userId} in room ${roomId}`);
  } catch (error) {
    // Permission denied errors are expected when user signs out
    if (error instanceof Error && (error.message?.includes("PERMISSION_DENIED") || error.message?.includes("permission"))) {
      // Silently ignore - user is signing out or auth revoked
      return;
    }
    console.error("[RealtimeSync] Error updating room presence:", error);
  }
}

/**
 * Listens to all users' presence in a specific room
 * Only returns users who are online in this room
 * 
 * @param roomId - Room ID to monitor
 * @param callback - Called with map of userId -> UserPresence whenever data changes
 * @returns Unsubscribe function to stop listening
 */
export function listenToRoomUsers(
  roomId: string,
  callback: (users: Record<string, UserPresence>) => void
): () => void {
  if (!roomId) {
    return () => {};
  }

  const roomPresenceRef = ref(realtimeDb, `rooms/${roomId}/presence`);

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
    if (error.message?.includes("PERMISSION_DENIED") || error.message?.includes("permission")) {
      if (process.env.NODE_ENV === "development") {
        console.log("[RealtimeSync] Room users listener permission denied (expected during sign-out)");
      }
    } else {
      console.error("[RealtimeSync] Error listening to room users:", error);
    }
    callback({});
  };

  const unsubscribe = onValue(roomPresenceRef, handleSnapshot, handleError);

  return unsubscribe;
}

/**
 * Gets online users in a specific room (one-time read)
 * 
 * @param roomId - Room ID to query
 * @returns Promise resolving to map of userId -> UserPresence
 */
export async function getRoomOnlineUsers(
  roomId: string
): Promise<Record<string, UserPresence>> {
  if (!roomId) {
    return {};
  }

  const roomPresenceRef = ref(realtimeDb, `rooms/${roomId}/presence`);
  
  try {
    const snapshot = await get(roomPresenceRef);
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
        console.log("[RealtimeSync] Get room online users permission denied (expected during sign-out or before auth)");
      }
    } else {
      console.error("[RealtimeSync] Error getting room online users:", error);
    }
    return {};
  }
}

/**
 * Marks user as offline in a specific room
 * 
 * @param roomId - Room ID where user should be marked offline
 * @param userId - Current user's UID
 * @returns Promise that resolves when user is marked offline
 */
export async function markUserOfflineInRoom(
  roomId: string,
  userId: string
): Promise<void> {
  if (!roomId || !userId) {
    return;
  }

  const roomPresenceRef = ref(realtimeDb, `rooms/${roomId}/presence/${userId}`);
  const cursorRef = ref(realtimeDb, `rooms/${roomId}/presence/${userId}/cursor`);
  
  try {
    await update(roomPresenceRef, {
      online: false,
      lastSeen: serverTimestamp(),
    });

    await remove(cursorRef);
    
    console.log(`[RealtimeSync] User ${userId} marked offline in room ${roomId}`);
  } catch (error) {
    // Permission denied errors are expected when user signs out
    if (error instanceof Error && (error.message?.includes("PERMISSION_DENIED") || error.message?.includes("permission"))) {
      // Silently ignore - user is signing out or auth revoked
      return;
    }
    console.error("[RealtimeSync] Error marking user offline in room:", error);
  }
}

/**
 * Sets up room-scoped presence heartbeat
 * Updates lastSeen timestamp every 10 seconds to keep user marked as online in the room
 * 
 * @param roomId - Room ID where user is present
 * @param userId - Current user's UID
 * @returns Interval ID that can be cleared with clearInterval()
 */
export function setupRoomPresenceHeartbeat(
  roomId: string,
  userId: string
): NodeJS.Timeout {
  const heartbeatCallback = async (): Promise<void> => {
    if (!roomId || !userId) {
      return;
    }
    
    const roomPresenceRef = ref(realtimeDb, `rooms/${roomId}/presence/${userId}`);
    
    try {
      await update(roomPresenceRef, {
        lastSeen: serverTimestamp(),
      });
    } catch (error) {
      console.error("[RealtimeSync] Error updating room heartbeat:", error);
    }
  };

  const intervalId = setInterval(heartbeatCallback, HEARTBEAT_INTERVAL_MS);

  return intervalId;
}

/**
 * Updates cursor position in a specific room
 * Should be throttled to ~30Hz (every 33ms) to avoid excessive writes
 * 
 * @param roomId - Room ID where cursor should be updated
 * @param userId - Current user's UID
 * @param cursor - Cursor position in page coordinates
 * @returns Promise that resolves when update is complete
 */
export async function updateRoomCursorPosition(
  roomId: string,
  userId: string,
  cursor: { x: number; y: number }
): Promise<void> {
  if (!roomId || !userId) {
    return;
  }

  const cursorRef = ref(realtimeDb, `rooms/${roomId}/presence/${userId}/cursor`);
  
  try {
    await update(cursorRef, {
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
    console.error("[RealtimeSync] Error updating room cursor position:", error);
  }
}

/**
 * Kicks a user from a room by setting a temporary ban
 * Ban duration is 5 minutes to prevent immediate rejoining
 * Note: We can only write the ban record - the kicked user's client will detect it
 * and handle their own disconnect when they receive the ban notification
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
    // The kicked user's client will detect this and disconnect themselves
    const banRef = ref(realtimeDb, `rooms/${roomId}/bans/${targetUserId}`);
    await update(banRef, {
      bannedUntil,
      bannedBy: kickedBy,
      bannedAt: serverTimestamp(),
    });

    console.log(`[RealtimeSync] User ${targetUserId} banned from room ${roomId} by ${kickedBy}`);
  } catch (error) {
    console.error("[RealtimeSync] Error kicking user:", error);
    throw error;
  }
}

/**
 * Checks if a user is currently banned from a room (one-time check)
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

/**
 * Listens for ban notifications for the current user in a specific room
 * Calls callback when user gets banned
 * 
 * @param roomId - Room ID to monitor
 * @param userId - User ID to monitor
 * @param onBanned - Callback called when user is banned, receives bannedUntil timestamp
 * @returns Unsubscribe function to stop listening
 */
export function listenForRoomBan(
  roomId: string,
  userId: string,
  onBanned: (bannedUntil: number) => void
): () => void {
  if (!roomId || !userId) {
    return () => {};
  }

  const banRef = ref(realtimeDb, `rooms/${roomId}/bans/${userId}`);

  const handleSnapshot = (snapshot: DataSnapshot): void => {
    if (!snapshot.exists()) {
      return;
    }

    const banData = snapshot.val() as { bannedUntil: number; bannedBy: string };
    const bannedUntil = banData.bannedUntil;

    // Check if ban is still active
    if (bannedUntil && bannedUntil > Date.now()) {
      console.log(`[RealtimeSync] ⚠️ User ${userId} was banned from room ${roomId}`);
      onBanned(bannedUntil);
    }
  };

  const handleError = (error: Error): void => {
    // Permission errors expected if not authenticated
    if (!error.message?.includes("PERMISSION_DENIED")) {
      console.error("[RealtimeSync] Error listening for ban:", error);
    }
  };

  const unsubscribe = onValue(banRef, handleSnapshot, handleError);

  return unsubscribe;
}

/**
 * Updates the position of a shape during drag operation
 * Writes to lightweight Realtime DB path for 60Hz updates
 * 
 * @param roomId - Room ID
 * @param shapeId - Shape ID being dragged
 * @param position - Current drag position {x, y}
 * @param userId - User ID performing the drag
 * @returns Promise that resolves when update is complete
 */
export async function updateDragPosition(
  roomId: string,
  shapeId: string,
  position: { x: number; y: number },
  userId: string
): Promise<void> {
  if (!roomId || !shapeId || !userId) {
    return;
  }

  const dragRef = ref(realtimeDb, `rooms/${roomId}/dragging/${shapeId}`);

  try {
    await update(dragRef, {
      x: position.x,
      y: position.y,
      userId,
      lastUpdate: serverTimestamp(),
    });
  } catch (error) {
    // Permission denied errors are expected when user signs out
    if (error instanceof Error && (error.message?.includes("PERMISSION_DENIED") || error.message?.includes("permission"))) {
      return;
    }
    console.error("[RealtimeSync] Error updating drag position:", error);
  }
}

/**
 * Clears drag state when drag operation ends
 * 
 * @param roomId - Room ID
 * @param shapeId - Shape ID that was being dragged
 * @returns Promise that resolves when drag state is cleared
 */
export async function clearDragPosition(
  roomId: string,
  shapeId: string
): Promise<void> {
  if (!roomId || !shapeId) {
    return;
  }

  const dragRef = ref(realtimeDb, `rooms/${roomId}/dragging/${shapeId}`);

  try {
    await remove(dragRef);
  } catch (error) {
    // Permission denied errors are expected when user signs out
    if (error instanceof Error && (error.message?.includes("PERMISSION_DENIED") || error.message?.includes("permission"))) {
      return;
    }
    console.error("[RealtimeSync] Error clearing drag position:", error);
  }
}

/**
 * Listens to drag updates from other users in the room
 * Calls callback with array of current drag updates
 * 
 * @param roomId - Room ID to listen to
 * @param callback - Function called when drag updates change
 * @returns Unsubscribe function to stop listening
 */
export function listenToDragUpdates(
  roomId: string,
  callback: (updates: Array<{ shapeId: string; x: number; y: number; userId: string; lastUpdate: number }>) => void
): () => void {
  if (!roomId) {
    return () => {};
  }

  const draggingRef = ref(realtimeDb, `rooms/${roomId}/dragging`);

  const handleSnapshot = (snapshot: DataSnapshot): void => {
    const updates: Array<{ shapeId: string; x: number; y: number; userId: string; lastUpdate: number }> = [];

    if (snapshot.exists()) {
      snapshot.forEach((childSnapshot) => {
        const shapeId = childSnapshot.key;
        const data = childSnapshot.val() as { x: number; y: number; userId: string; lastUpdate: number };
        
        if (shapeId && data.x !== undefined && data.y !== undefined && data.userId) {
          updates.push({
            shapeId,
            x: data.x,
            y: data.y,
            userId: data.userId,
            lastUpdate: data.lastUpdate || Date.now(),
          });
        }
      });
    }

    callback(updates);
  };

  const handleError = (error: Error): void => {
    // Permission errors expected if not authenticated
    if (!error.message?.includes("PERMISSION_DENIED")) {
      console.error("[RealtimeSync] Error listening to drag updates:", error);
    }
  };

  const unsubscribe = onValue(draggingRef, handleSnapshot, handleError);

  return unsubscribe;
}

/**
 * Cleans up stale drag states (older than 5 seconds)
 * Should be called periodically to prevent memory leaks from disconnected users
 * 
 * @param roomId - Room ID to clean up
 * @returns Promise that resolves when cleanup is complete
 */
export async function cleanupStaleDragStates(roomId: string): Promise<void> {
  if (!roomId) {
    return;
  }

  const draggingRef = ref(realtimeDb, `rooms/${roomId}/dragging`);
  const STALE_THRESHOLD_MS = 5000; // 5 seconds

  try {
    const snapshot = await get(draggingRef);
    
    if (!snapshot.exists()) {
      return;
    }

    const now = Date.now();
    const deletePromises: Promise<void>[] = [];

    snapshot.forEach((childSnapshot) => {
      const data = childSnapshot.val() as { lastUpdate: number };
      const age = now - (data.lastUpdate || 0);

      if (age > STALE_THRESHOLD_MS) {
        const shapeId = childSnapshot.key;
        if (shapeId) {
          const staleRef = ref(realtimeDb, `rooms/${roomId}/dragging/${shapeId}`);
          deletePromises.push(remove(staleRef));
        }
      }
    });

    await Promise.all(deletePromises);
    
    if (deletePromises.length > 0) {
      console.log(`[RealtimeSync] Cleaned up ${deletePromises.length} stale drag states from room ${roomId}`);
    }
  } catch (error) {
    // Permission denied errors are expected when user signs out
    if (error instanceof Error && (error.message?.includes("PERMISSION_DENIED") || error.message?.includes("permission"))) {
      return;
    }
    console.error("[RealtimeSync] Error cleaning up stale drag states:", error);
  }
}

