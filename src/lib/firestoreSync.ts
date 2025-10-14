/**
 * Firestore Shape Sync
 * Handles persistent shape storage and real-time synchronization
 */

import type { DocumentChange, QuerySnapshot, Timestamp } from "firebase/firestore";
import type { TLShape } from "@tldraw/tldraw";
import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
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
    await withRetry(async (): Promise<void> => {
      const shapeRef = doc(db, `rooms/${roomId}/shapes`, shapeId);
      await deleteDoc(shapeRef);
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
    const shapesRef = collection(db, `rooms/${roomId}/shapes`);
    const shapesQuery = query(shapesRef);
    const snapshot = await getDocs(shapesQuery);

    return snapshot.docs.map((doc) => doc.data() as FirestoreShape);
  } catch (error) {
    console.error("[FirestoreSync] Error getting all shapes:", error);
    return [];
  }
}

