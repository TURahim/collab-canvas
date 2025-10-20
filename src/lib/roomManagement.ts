/**
 * Room management functions
 * Handles CRUD operations and validation for room metadata
 */

import {
  collection,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  getDocs,
} from "firebase/firestore";
import { ref, set, remove } from "firebase/database";
import { db, realtimeDb } from "./firebase";
import type { RoomMetadata, RoomSettings, ValidationResult } from "../types/room";

/**
 * Maximum room name length
 */
export const MAX_ROOM_NAME_LENGTH = 100;

/**
 * Minimum room name length
 */
export const MIN_ROOM_NAME_LENGTH = 1;

/**
 * Validates a room name
 */
export function validateRoomName(name: string): ValidationResult {
  const trimmedName = name.trim();

  if (trimmedName.length < MIN_ROOM_NAME_LENGTH) {
    return { valid: false, error: "Room name cannot be empty" };
  }

  if (trimmedName.length > MAX_ROOM_NAME_LENGTH) {
    return {
      valid: false,
      error: `Room name too long (max ${MAX_ROOM_NAME_LENGTH} characters)`,
    };
  }

  // Allow alphanumeric, spaces, hyphens, underscores
  if (!/^[a-zA-Z0-9\s\-_]+$/.test(trimmedName)) {
    return {
      valid: false,
      error: "Room name can only contain letters, numbers, spaces, hyphens, and underscores",
    };
  }

  return { valid: true };
}

/**
 * Validates room update data
 */
export function validateRoomUpdate(
  roomId: string,
  userId: string,
  updates: Partial<RoomSettings>
): ValidationResult {
  if (!roomId || !userId) {
    return { valid: false, error: "Room ID and User ID are required" };
  }

  if (updates.name !== undefined) {
    const nameValidation = validateRoomName(updates.name);
    if (!nameValidation.valid) {
      return nameValidation;
    }
  }

  return { valid: true };
}

/**
 * Checks if a user can delete a room
 */
export async function canDeleteRoom(
  roomId: string,
  userId: string
): Promise<boolean> {
  try {
    const roomRef = doc(db, "rooms", roomId, "metadata", "info");
    const roomDoc = await getDoc(roomRef);

    if (!roomDoc.exists()) {
      return false;
    }

    const roomData = roomDoc.data() as RoomMetadata;
    return roomData.owner === userId;
  } catch (error) {
    console.error("[roomManagement] Error checking delete permission:", error);
    return false;
  }
}

/**
 * Gets room metadata from Firestore
 */
export async function getRoomMetadata(
  roomId: string
): Promise<RoomMetadata | null> {
  try {
    const roomRef = doc(db, "rooms", roomId, "metadata", "info");
    const roomDoc = await getDoc(roomRef);

    if (!roomDoc.exists()) {
      return null;
    }

    return roomDoc.data() as RoomMetadata;
  } catch (error) {
    console.error("[roomManagement] Error getting room metadata:", error);
    throw error;
  }
}

/**
 * Check if a user is a member of a room
 * 
 * @param roomId - Room ID to check
 * @param userId - User ID to check
 * @returns True if user is a member, false otherwise
 */
export async function isRoomMember(
  roomId: string,
  userId: string
): Promise<boolean> {
  try {
    const metadata = await getRoomMetadata(roomId);
    if (!metadata) return false;
    
    // Check if user is in members list
    return metadata.members?.[userId] !== undefined;
  } catch (error) {
    console.error("[roomManagement] Error checking room membership:", error);
    return false;
  }
}

/**
 * Creates a new room
 */
export async function createRoom(
  roomId: string,
  name: string,
  ownerId: string,
  isPublic: boolean = false
): Promise<void> {
  try {
    const validation = validateRoomName(name);
    if (!validation.valid) {
      throw new Error(validation.error);
    }

    const roomRef = doc(db, "rooms", roomId, "metadata", "info");
    const roomData: Omit<RoomMetadata, "createdAt" | "updatedAt"> = {
      id: roomId,
      name: name.trim(),
      owner: ownerId,
      isPublic,
      members: {
        [ownerId]: {
          userId: ownerId,
          role: "owner",
          joinedAt: Date.now(),
        },
      },
    };

    await setDoc(roomRef, {
      ...roomData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    // Mirror access control to RTDB
    const accessRef = ref(realtimeDb, `rooms/${roomId}/access`);
    await set(accessRef, {
      isPublic,
      owner: ownerId,
    });
  } catch (error) {
    console.error("[roomManagement] Error creating room:", error);
    throw error;
  }
}

/**
 * Updates room metadata
 */
export async function updateRoomMetadata(
  roomId: string,
  userId: string,
  updates: Partial<RoomSettings>
): Promise<void> {
  try {
    // Validate updates
    const validation = validateRoomUpdate(roomId, userId, updates);
    if (!validation.valid) {
      throw new Error(validation.error);
    }

    // Check if user is owner
    const canDelete = await canDeleteRoom(roomId, userId);
    if (!canDelete) {
      throw new Error("Only the room owner can update room settings");
    }

    const roomRef = doc(db, "rooms", roomId, "metadata", "info");
    const updateData: Record<string, unknown> = {
      updatedAt: serverTimestamp(),
    };

    if (updates.name !== undefined) {
      updateData.name = updates.name.trim();
    }

    if (updates.isPublic !== undefined) {
      updateData.isPublic = updates.isPublic;

      // Update RTDB access mirror
      const accessRef = ref(realtimeDb, `rooms/${roomId}/access/isPublic`);
      await set(accessRef, updates.isPublic);
    }

    await updateDoc(roomRef, updateData);
  } catch (error) {
    console.error("[roomManagement] Error updating room metadata:", error);
    throw error;
  }
}

/**
 * Deletes a room and all its data
 */
export async function deleteRoom(
  roomId: string,
  userId: string
): Promise<void> {
  try {
    // Check if user is owner
    const canDelete = await canDeleteRoom(roomId, userId);
    if (!canDelete) {
      throw new Error("Only the room owner can delete this room");
    }

    console.log(`[roomManagement] Deleting room ${roomId}...`);

    // Delete all subcollections first (Firestore doesn't auto-delete subcollections)
    const deletionPromises: Promise<void>[] = [];

    // Delete shapes collection
    const shapesRef = collection(db, "rooms", roomId, "shapes");
    const shapesSnapshot = await getDocs(shapesRef);
    shapesSnapshot.docs.forEach((docSnapshot) => {
      deletionPromises.push(deleteDoc(docSnapshot.ref));
    });
    console.log(`[roomManagement] Deleting ${shapesSnapshot.docs.length} shapes`);
    
    // Delete snapshot collection
    const snapshotRef = collection(db, "rooms", roomId, "snapshot");
    const snapshotSnapshot = await getDocs(snapshotRef);
    snapshotSnapshot.docs.forEach((docSnapshot) => {
      deletionPromises.push(deleteDoc(docSnapshot.ref));
    });
    console.log(`[roomManagement] Deleting ${snapshotSnapshot.docs.length} snapshots`);
    
    // Delete assets collection
    const assetsRef = collection(db, "rooms", roomId, "assets");
    const assetsSnapshot = await getDocs(assetsRef);
    assetsSnapshot.docs.forEach((docSnapshot) => {
      deletionPromises.push(deleteDoc(docSnapshot.ref));
    });
    console.log(`[roomManagement] Deleting ${assetsSnapshot.docs.length} assets`);
    
    // Execute all subcollection deletions in parallel
    await Promise.all(deletionPromises);
    console.log("[roomManagement] All subcollections deleted");

    // Delete metadata last (after subcollections are cleaned up)
    const roomMetadataRef = doc(db, "rooms", roomId, "metadata", "info");
    await deleteDoc(roomMetadataRef);
    console.log("[roomManagement] Metadata deleted");

    // Delete from RTDB (presence, cursors, bans, access)
    const roomRtdbRef = ref(realtimeDb, `rooms/${roomId}`);
    await remove(roomRtdbRef);
    console.log("[roomManagement] RTDB data deleted");

    console.log(`[roomManagement] Room ${roomId} deleted successfully`);
  } catch (error) {
    console.error("[roomManagement] Error deleting room:", error);
    throw error;
  }
}

/**
 * Gets or creates the default room
 * Used for backward compatibility when no specific room is provided
 */
export async function getOrCreateDefaultRoom(userId: string, displayName: string): Promise<string> {
  const defaultRoomId = "default";
  
  try {
    // Check if default room exists
    const existingRoom = await getRoomMetadata(defaultRoomId);
    
    if (existingRoom) {
      return defaultRoomId;
    }
    
    // Create default room if it doesn't exist
    // Sanitize display name to remove invalid characters (keep only alphanumeric, spaces, hyphens, underscores)
    const sanitizedName = displayName.replace(/[^a-zA-Z0-9\s\-_]/g, '');
    const roomName = `${sanitizedName} Room`;
    await createRoom(defaultRoomId, roomName, userId, true);
    return defaultRoomId;
  } catch (error) {
    console.error("[roomManagement] Error getting or creating default room:", error);
    throw error;
  }
}
