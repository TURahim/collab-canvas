/**
 * Room Code Management
 * Generates and validates 6-digit room codes for easy student access
 */

import { doc, getDoc, setDoc, query, collection, where, getDocs, serverTimestamp } from "firebase/firestore";
import { db } from "./firebase";

/**
 * Validation result type
 */
interface ValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Room code mapping stored in Firestore
 */
interface RoomCodeMapping {
  code: string;
  roomId: string;
  createdBy: string;
  createdAt: any; // Firestore timestamp
}

/**
 * Maximum retry attempts for code generation
 */
const MAX_RETRY_ATTEMPTS = 5;

/**
 * Generate a unique 6-digit numeric room code
 * Checks Firestore for collisions and retries if needed
 * 
 * @param teacherId - Teacher's user ID creating the room
 * @returns Promise resolving to unique 6-digit code
 * @throws Error if unable to generate unique code after max retries
 * 
 * @example
 * const code = await generateRoomCode("teacher-123");
 * // Returns: "482931"
 */
export async function generateRoomCode(teacherId: string): Promise<string> {
  let attempts = 0;

  while (attempts < MAX_RETRY_ATTEMPTS) {
    // Generate random 6-digit code
    const code = Math.floor(100000 + Math.random() * 900000).toString();

    // Check if code already exists
    const exists = await checkRoomCodeExists(code);

    if (!exists) {
      return code;
    }

    attempts++;
    console.log(`[RoomCode] Code ${code} collision detected, retrying... (attempt ${attempts}/${MAX_RETRY_ATTEMPTS})`);
  }

  throw new Error(`Failed to generate unique room code after ${MAX_RETRY_ATTEMPTS} attempts`);
}

/**
 * Check if a room code already exists in Firestore
 * 
 * @param code - Room code to check
 * @returns Promise resolving to true if code exists
 */
async function checkRoomCodeExists(code: string): Promise<boolean> {
  try {
    const codeDocRef = doc(db, "roomCodes", code);
    const codeDoc = await getDoc(codeDocRef);
    return codeDoc.exists();
  } catch (error) {
    console.error("[RoomCode] Error checking code existence:", error);
    return false;
  }
}

/**
 * Validate room code format
 * Must be exactly 6 digits, numeric only
 * 
 * @param code - Room code to validate
 * @returns Validation result with error message if invalid
 * 
 * @example
 * validateRoomCode("482931") // { valid: true }
 * validateRoomCode("abc123") // { valid: false, error: "..." }
 */
export function validateRoomCode(code: string): ValidationResult {
  if (!code || code.trim().length === 0) {
    return { valid: false, error: "Room code cannot be empty" };
  }

  const trimmedCode = code.trim();

  // Must be exactly 6 characters
  if (trimmedCode.length !== 6) {
    return { valid: false, error: "Room code must be exactly 6 digits" };
  }

  // Must be numeric only
  if (!/^\d{6}$/.test(trimmedCode)) {
    return { valid: false, error: "Room code must contain only numbers" };
  }

  return { valid: true };
}

/**
 * Get room ID from room code
 * Looks up the code in the roomCodes collection
 * 
 * @param code - 6-digit room code
 * @returns Promise resolving to room ID or null if not found
 * 
 * @example
 * const roomId = await getRoomIdByCode("482931");
 * // Returns: "abc-xyz-123" or null
 */
export async function getRoomIdByCode(code: string): Promise<string | null> {
  // Validate format first
  const validation = validateRoomCode(code);
  if (!validation.valid) {
    return null;
  }

  try {
    const codeDocRef = doc(db, "roomCodes", code);
    const codeDoc = await getDoc(codeDocRef);

    if (!codeDoc.exists()) {
      return null;
    }

    const data = codeDoc.data() as RoomCodeMapping;
    return data.roomId || null;
  } catch (error) {
    console.error("[RoomCode] Error getting room ID by code:", error);
    return null;
  }
}

/**
 * Save room code mapping to Firestore
 * Creates document in roomCodes collection
 * 
 * @param code - 6-digit room code
 * @param roomId - Associated room ID
 * @param teacherId - Teacher who created the room
 * @returns Promise that resolves when mapping is saved
 * 
 * @example
 * await saveRoomCodeMapping("482931", "room-abc-123", "teacher-456");
 */
export async function saveRoomCodeMapping(
  code: string,
  roomId: string,
  teacherId: string
): Promise<void> {
  const validation = validateRoomCode(code);
  if (!validation.valid) {
    throw new Error(`Invalid room code: ${validation.error}`);
  }

  try {
    const codeDocRef = doc(db, "roomCodes", code);
    
    const mapping: RoomCodeMapping = {
      code,
      roomId,
      createdBy: teacherId,
      createdAt: serverTimestamp(),
    };

    await setDoc(codeDocRef, mapping);
    console.log(`[RoomCode] Saved code mapping: ${code} → ${roomId}`);
  } catch (error) {
    console.error("[RoomCode] Error saving room code mapping:", error);
    throw error;
  }
}

/**
 * Delete room code mapping when room is deleted
 * 
 * @param code - Room code to delete
 * @returns Promise that resolves when mapping is deleted
 */
export async function deleteRoomCodeMapping(code: string): Promise<void> {
  if (!code) {
    return;
  }

  try {
    const codeDocRef = doc(db, "roomCodes", code);
    const codeDoc = await getDoc(codeDocRef);
    
    if (codeDoc.exists()) {
      await setDoc(codeDocRef, { ...codeDoc.data(), deletedAt: serverTimestamp() }, { merge: true });
      console.log(`[RoomCode] Marked code as deleted: ${code}`);
    }
  } catch (error) {
    console.error("[RoomCode] Error deleting room code mapping:", error);
  }
}

/**
 * Get room code from room ID
 * Searches roomCodes collection for matching roomId
 * 
 * @param roomId - Room ID to find code for
 * @returns Promise resolving to room code or null if not found
 */
export async function getCodeByRoomId(roomId: string): Promise<string | null> {
  if (!roomId) {
    return null;
  }

  try {
    const codesRef = collection(db, "roomCodes");
    const q = query(codesRef, where("roomId", "==", roomId));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      return null;
    }

    // Return first matching code
    const firstDoc = querySnapshot.docs[0];
    const data = firstDoc.data() as RoomCodeMapping;
    
    // Check if code was deleted
    if ('deletedAt' in data) {
      return null;
    }
    
    return data.code || null;
  } catch (error) {
    console.error("[RoomCode] Error getting code by room ID:", error);
    return null;
  }
}

