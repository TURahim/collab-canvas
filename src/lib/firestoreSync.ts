/**
 * Firestore Shape Sync
 * Handles persistent shape storage and real-time synchronization
 * Supports both snapshot-based (full document) and incremental (individual shapes) sync
 */

import type { DocumentChange, QuerySnapshot, Timestamp } from "firebase/firestore";
import type { TLShape, TLStoreSnapshot } from "@tldraw/tldraw";
import { getSnapshot } from "@tldraw/tldraw";
import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  getDoc,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  where,
  orderBy,
  Timestamp as FirestoreTimestamp,
} from "firebase/firestore";

import { db } from "./firebase";
import { withRetry } from "./utils";

/**
 * Shape document structure in Firestore
 * Represents a tldraw shape persisted to the database
 */
export interface FirestoreShape {
  id: string;
  type: string;
  x: number;
  y: number;
  rotation: number;
  props: Record<string, unknown>;
  parentId?: string;
  index?: string;
  opacity?: number;
  createdBy: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

/**
 * Changes returned by the shapes listener
 */
export interface ShapeChanges {
  added: FirestoreShape[];
  modified: FirestoreShape[];
  removed: string[];
}

/**
 * Writes a shape to Firestore with retry logic
 * Should be debounced to 300ms in the caller to avoid excessive writes
 * 
 * @param roomId - Room identifier (e.g., "default" for MVP)
 * @param shape - tldraw shape to persist
 * @param userId - ID of user making the change
 * @returns Promise that resolves when write is complete
 * @throws Error if write fails after retries
 */
export async function writeShapeToFirestore(
  roomId: string,
  shape: TLShape,
  userId: string
): Promise<void> {
  try {
    // Validate roomId is not empty
    if (!roomId || roomId.trim() === '') {
      console.error('[FirestoreSync] ❌ CRITICAL: Empty roomId detected! Using fallback "default"');
      roomId = 'default';
    }
    
    console.log('[FirestoreSync] Writing shape to Firestore:', {
      shapeId: shape.id,
      type: shape.type,
      roomId,
      path: `rooms/${roomId}/shapes/${shape.id}`,
    });
    
    await withRetry(async (): Promise<void> => {
      const shapeRef = doc(db, `rooms/${roomId}/shapes`, shape.id);
      
      const firestoreShape: Omit<FirestoreShape, "createdAt" | "updatedAt"> = {
        id: shape.id,
        type: shape.type,
        x: shape.x,
        y: shape.y,
        rotation: shape.rotation,
        props: shape.props as Record<string, unknown>,
        parentId: shape.parentId,
        index: shape.index,
        opacity: shape.opacity,
        createdBy: userId,
      };

      await setDoc(
        shapeRef,
        {
          ...firestoreShape,
          updatedAt: serverTimestamp(),
          createdAt: serverTimestamp(), // Only set on first write due to merge
        },
        { merge: true }
      );
      
      console.log('[FirestoreSync] ✅ Shape written successfully:', shape.id);
    });
  } catch (error) {
    console.error("[FirestoreSync] ❌ Error writing shape:", error);
    throw error;
  }
}

/**
 * Deletes a shape from Firestore with retry logic
 * 
 * @param roomId - Room identifier
 * @param shapeId - ID of shape to delete
 * @returns Promise that resolves when deletion is complete
 * @throws Error if deletion fails after retries
 */
export async function deleteShapeFromFirestore(
  roomId: string,
  shapeId: string
): Promise<void> {
  try {
    // Validate roomId is not empty
    if (!roomId || roomId.trim() === '') {
      console.error('[FirestoreSync] ❌ CRITICAL: Empty roomId detected in deleteShapeFromFirestore! Using fallback "default"');
      roomId = 'default';
    }
    
    await withRetry(async (): Promise<void> => {
      // Step 1: Write tombstone record BEFORE deleting shape
      // This allows delta replay to know what was deleted even if snapshot is stale
      const tombstoneRef = doc(db, `rooms/${roomId}/deletes`, shapeId);
      await setDoc(tombstoneRef, {
        shapeId,
        deletedAt: serverTimestamp(),
      }, { merge: true });
      
      console.log('[FirestoreSync] 🪦 Tombstone written for shape:', shapeId);
      
      // Step 2: Delete the actual shape document
      const shapeRef = doc(db, `rooms/${roomId}/shapes`, shapeId);
      await deleteDoc(shapeRef);
      
      console.log('[FirestoreSync] 🗑️ Shape deleted from Firestore:', shapeId);
    });
  } catch (error) {
    console.error("[FirestoreSync] Error deleting shape:", error);
    throw error;
  }
}

/**
 * Listens to all shapes in a room in real-time
 * Calls callback with added, modified, and removed shapes on each change
 * 
 * @param roomId - Room identifier
 * @param callback - Called when shapes change with categorized changes
 * @returns Unsubscribe function to stop listening
 */
export function listenToShapes(
  roomId: string,
  callback: (changes: ShapeChanges) => void
): () => void {
  // Validate roomId is not empty
  if (!roomId || roomId.trim() === '') {
    console.error('[FirestoreSync] ❌ CRITICAL: Empty roomId detected in listenToShapes! Using fallback "default"');
    roomId = 'default';
  }
  
  console.log('[FirestoreSync] Listening to shapes at:', `rooms/${roomId}/shapes`);
  const shapesRef = collection(db, `rooms/${roomId}/shapes`);
  const shapesQuery = query(shapesRef);

  const handleSnapshot = (snapshot: QuerySnapshot): void => {
    const changes: ShapeChanges = {
      added: [],
      modified: [],
      removed: [],
    };

    snapshot.docChanges().forEach((change: DocumentChange) => {
      if (change.type === "added") {
        changes.added.push(change.doc.data() as FirestoreShape);
      } else if (change.type === "modified") {
        changes.modified.push(change.doc.data() as FirestoreShape);
      } else if (change.type === "removed") {
        changes.removed.push(change.doc.id);
      }
    });

    callback(changes);
  };

  const handleError = (error: Error): void => {
    // Permission denied errors are expected when user signs out
    // The listener is cleaned up immediately after, so we silently ignore these
    if (error.message?.includes("Missing or insufficient permissions") || error.message?.includes("permission")) {
      if (process.env.NODE_ENV === "development") {
        console.log("[FirestoreSync] Shape listener permission denied (expected during sign-out)");
      }
    } else {
      console.error("[FirestoreSync] Error listening to shapes:", error);
    }
  };

  const unsubscribe = onSnapshot(shapesQuery, handleSnapshot, handleError);

  return unsubscribe;
}

/**
 * Converts Firestore shape to tldraw shape format
 * Note: Uses type assertions as tldraw types are complex branded types
 * 
 * @param firestoreShape - Shape from Firestore
 * @returns Partial tldraw shape (will be validated by tldraw on creation)
 */
export function firestoreShapeToTldraw(
  firestoreShape: FirestoreShape
): Partial<TLShape> {
  return {
    id: firestoreShape.id as TLShape["id"],
    type: firestoreShape.type as TLShape["type"],
    x: firestoreShape.x,
    y: firestoreShape.y,
    rotation: firestoreShape.rotation,
    props: firestoreShape.props,
    parentId: firestoreShape.parentId as TLShape["parentId"],
    index: firestoreShape.index as TLShape["index"],
    opacity: firestoreShape.opacity,
  };
}

/**
 * Batch writes multiple shapes to Firestore
 * Used for initial sync or bulk operations
 * 
 * @param roomId - Room identifier
 * @param shapes - Array of shapes to write
 * @param userId - ID of user making the changes
 * @returns Promise that resolves when all writes complete
 * @throws Error if batch write fails
 * 
 * @remarks
 * Firebase has a limit of 500 operations per batch.
 * This implementation writes individually with Promise.all for simplicity.
 * For true batching, use Firestore writeBatch() API.
 */
export async function batchWriteShapes(
  roomId: string,
  shapes: TLShape[],
  userId: string
): Promise<void> {
  try {
    const writePromises = shapes.map((shape) =>
      writeShapeToFirestore(roomId, shape, userId)
    );
    
    await Promise.all(writePromises);
  } catch (error) {
    console.error("[FirestoreSync] Error batch writing shapes:", error);
    throw error;
  }
}

/**
 * Gets all shapes in a room (one-time read)
 * Used for initial load when editor mounts
 * 
 * @param roomId - Room identifier
 * @returns Promise resolving to array of all shapes in the room
 */
export async function getAllShapes(roomId: string): Promise<FirestoreShape[]> {
  try {
    // Validate roomId is not empty
    if (!roomId || roomId.trim() === '') {
      console.error('[FirestoreSync] ❌ CRITICAL: Empty roomId detected in getAllShapes! Using fallback "default"');
      roomId = 'default';
    }
    
    console.log('[FirestoreSync] Loading shapes from:', `rooms/${roomId}/shapes`);
    const shapesRef = collection(db, `rooms/${roomId}/shapes`);
    const shapesQuery = query(shapesRef);
    const snapshot = await getDocs(shapesQuery);

    return snapshot.docs.map((doc) => doc.data() as FirestoreShape);
  } catch (error) {
    console.error("[FirestoreSync] Error getting all shapes:", error);
    return [];
  }
}

/**
 * Save full tldraw document snapshot to Firestore
 * Includes all pages, shapes, and document state
 * 
 * @param roomId - Room identifier
 * @param snapshot - Full tldraw store snapshot
 * @param userId - ID of user saving snapshot
 * @returns Promise that resolves when save is complete
 */
export async function saveSnapshot(
  roomId: string,
  snapshot: TLStoreSnapshot,
  userId: string
): Promise<void> {
  try {
    // Validate roomId is not empty
    if (!roomId || roomId.trim() === '') {
      console.error('[FirestoreSync] ❌ CRITICAL: Empty roomId detected in saveSnapshot! Using fallback "default"');
      roomId = 'default';
    }
    
    const snapshotRef = doc(db, `rooms/${roomId}/snapshot`, "doc");
    
    await setDoc(snapshotRef, {
      snapshot: JSON.stringify(snapshot),
      savedBy: userId,
      savedAt: serverTimestamp(),
    });
    
    console.log("[FirestoreSync] Snapshot saved successfully to:", `rooms/${roomId}/snapshot/doc`);
  } catch (error) {
    console.error("[FirestoreSync] Error saving snapshot:", error);
    throw error;
  }
}

/**
 * Snapshot data with metadata for delta replay
 */
export interface SnapshotWithMeta {
  snapshot: TLStoreSnapshot;
  savedAt: number; // Timestamp in milliseconds
}

/**
 * Load full tldraw document snapshot from Firestore
 * Returns null if no snapshot exists
 * 
 * @param roomId - Room identifier
 * @returns Promise resolving to snapshot with metadata or null
 */
export async function loadSnapshot(roomId: string): Promise<SnapshotWithMeta | null> {
  try {
    // Validate roomId is not empty
    if (!roomId || roomId.trim() === '') {
      console.error('[FirestoreSync] ❌ CRITICAL: Empty roomId detected in loadSnapshot! Using fallback "default"');
      roomId = 'default';
    }
    
    console.log("[FirestoreSync] Loading snapshot from:", `rooms/${roomId}/snapshot/doc`);
    const snapshotRef = doc(db, `rooms/${roomId}/snapshot`, "doc");
    const snapshotDoc = await getDoc(snapshotRef);
    
    if (!snapshotDoc.exists()) {
      console.log("[FirestoreSync] No snapshot found for room");
      return null;
    }
    
    const data = snapshotDoc.data();
    const snapshot = JSON.parse(data.snapshot) as TLStoreSnapshot;
    const savedAt = data.savedAt?.toMillis?.() || Date.now();
    
    console.log("[FirestoreSync] Snapshot loaded successfully, savedAt:", new Date(savedAt).toISOString());
    return { snapshot, savedAt };
  } catch (error) {
    console.error("[FirestoreSync] Error loading snapshot:", error);
    return null;
  }
}

/**
 * Get shapes that were created/updated after a specific timestamp
 * Used for delta replay to fetch changes since last snapshot
 * 
 * @param roomId - Room identifier
 * @param sinceTimestamp - Timestamp in milliseconds
 * @returns Promise resolving to array of shapes modified after timestamp
 */
export async function getShapesSince(roomId: string, sinceTimestamp: number): Promise<FirestoreShape[]> {
  try {
    // Validate roomId
    if (!roomId || roomId.trim() === '') {
      console.error('[FirestoreSync] Empty roomId in getShapesSince');
      roomId = 'default';
    }
    
    const shapesRef = collection(db, `rooms/${roomId}/shapes`);
    const sinceDate = FirestoreTimestamp.fromMillis(sinceTimestamp);
    
    // Query for shapes updated after the snapshot
    const deltaQuery = query(
      shapesRef,
      where('updatedAt', '>', sinceDate),
      orderBy('updatedAt', 'asc')
    );
    
    const snapshot = await getDocs(deltaQuery);
    const shapes = snapshot.docs.map(doc => doc.data() as FirestoreShape);
    
    console.log(`[FirestoreSync] 📈 Found ${shapes.length} shapes updated since`, new Date(sinceTimestamp).toISOString());
    return shapes;
  } catch (error) {
    console.error("[FirestoreSync] Error getting shapes since timestamp:", error);
    return [];
  }
}

/**
 * Tombstone record for deleted shapes
 */
export interface TombstoneRecord {
  shapeId: string;
  deletedAt: Timestamp;
}

/**
 * Get tombstones (deletion records) after a specific timestamp
 * Used for delta replay to know what was deleted since last snapshot
 * 
 * @param roomId - Room identifier
 * @param sinceTimestamp - Timestamp in milliseconds
 * @returns Promise resolving to array of deletion records
 */
export async function getTombstonesSince(roomId: string, sinceTimestamp: number): Promise<TombstoneRecord[]> {
  try {
    // Validate roomId
    if (!roomId || roomId.trim() === '') {
      console.error('[FirestoreSync] Empty roomId in getTombstonesSince');
      roomId = 'default';
    }
    
    const deletesRef = collection(db, `rooms/${roomId}/deletes`);
    const sinceDate = FirestoreTimestamp.fromMillis(sinceTimestamp);
    
    // Query for deletions after the snapshot
    const deltaQuery = query(
      deletesRef,
      where('deletedAt', '>', sinceDate),
      orderBy('deletedAt', 'asc')
    );
    
    const snapshot = await getDocs(deltaQuery);
    const tombstones = snapshot.docs.map(doc => doc.data() as TombstoneRecord);
    
    console.log(`[FirestoreSync] 🪦 Found ${tombstones.length} deletions since`, new Date(sinceTimestamp).toISOString());
    return tombstones;
  } catch (error) {
    console.error("[FirestoreSync] Error getting tombstones since timestamp:", error);
    return [];
  }
}

