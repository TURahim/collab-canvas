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
  query,
  where,
} from "firebase/firestore";
import { ref, set, remove } from "firebase/database";
import { firestore, realtimeDb } from "./firebase";
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
    const roomRef = doc(firestore, "rooms", roomId, "metadata", "info");
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
    const roomRef = doc(firestore, "rooms", roomId, "metadata", "info");
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

    const roomRef = doc(firestore, "rooms", roomId, "metadata", "info");
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

    const roomRef = doc(firestore, "rooms", roomId, "metadata", "info");
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

    // Delete from Firestore (metadata and shapes)
    const roomMetadataRef = doc(firestore, "rooms", roomId, "metadata", "info");
    await deleteDoc(roomMetadataRef);

    // Delete shapes collection
    const shapesRef = collection(firestore, "rooms", roomId, "shapes");
    const shapesSnapshot = await getDocs(shapesRef);
    const deletePromises = shapesSnapshot.docs.map((doc) => deleteDoc(doc.ref));
    await Promise.all(deletePromises);

    // Delete from RTDB (presence, cursors, access)
    const roomRtdbRef = ref(realtimeDb, `rooms/${roomId}`);
    await remove(roomRtdbRef);
  } catch (error) {
    console.error("[roomManagement] Error deleting room:", error);
    throw error;
  }
}
