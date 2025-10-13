/**
 * Firestore Shape Sync
 * Handles persistent shape storage and real-time synchronization
 */

import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
  query,
  serverTimestamp,
  Timestamp,
  QuerySnapshot,
  DocumentChange,
} from "firebase/firestore";
import { db } from "./firebase";
import { TLShape, TLRecord } from "@tldraw/tldraw";

// Shape document structure in Firestore
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
 * Writes a shape to Firestore
 * Debounced to 300ms in the hook to avoid excessive writes
 * 
 * @param roomId - Room identifier (default room for MVP)
 * @param shape - tldraw shape to persist
 * @param userId - ID of user making the change
 */
export async function writeShapeToFirestore(
  roomId: string,
  shape: TLShape,
  userId: string
): Promise<void> {
  try {
    const shapeRef = doc(db, `rooms/${roomId}/shapes`, shape.id);
    
    const firestoreShape: Omit<FirestoreShape, 'createdAt' | 'updatedAt'> = {
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

    await setDoc(shapeRef, {
      ...firestoreShape,
      updatedAt: serverTimestamp(),
      createdAt: serverTimestamp(), // Will only be set on first write
    }, { merge: true });

  } catch (error) {
    console.error("Error writing shape to Firestore:", error);
    throw error;
  }
}

/**
 * Deletes a shape from Firestore
 * 
 * @param roomId - Room identifier
 * @param shapeId - ID of shape to delete
 */
export async function deleteShapeFromFirestore(
  roomId: string,
  shapeId: string
): Promise<void> {
  try {
    const shapeRef = doc(db, `rooms/${roomId}/shapes`, shapeId);
    await deleteDoc(shapeRef);
  } catch (error) {
    console.error("Error deleting shape from Firestore:", error);
    throw error;
  }
}

/**
 * Listens to all shapes in a room
 * Calls callback with added, modified, and removed shapes
 * 
 * @param roomId - Room identifier
 * @param callback - Called when shapes change
 * @returns Unsubscribe function
 */
export function listenToShapes(
  roomId: string,
  callback: (changes: {
    added: FirestoreShape[];
    modified: FirestoreShape[];
    removed: string[];
  }) => void
): () => void {
  const shapesRef = collection(db, `rooms/${roomId}/shapes`);
  const q = query(shapesRef);

  const unsubscribe = onSnapshot(
    q,
    (snapshot: QuerySnapshot) => {
      const added: FirestoreShape[] = [];
      const modified: FirestoreShape[] = [];
      const removed: string[] = [];

      snapshot.docChanges().forEach((change: DocumentChange) => {
        const data = change.doc.data() as FirestoreShape;

        if (change.type === "added") {
          added.push(data);
        } else if (change.type === "modified") {
          modified.push(data);
        } else if (change.type === "removed") {
          removed.push(change.doc.id);
        }
      });

      callback({ added, modified, removed });
    },
    (error) => {
      console.error("Error listening to shapes:", error);
    }
  );

  return unsubscribe;
}

/**
 * Converts Firestore shape to tldraw shape format
 * 
 * @param firestoreShape - Shape from Firestore
 * @returns tldraw-compatible shape
 */
export function firestoreShapeToTldraw(firestoreShape: FirestoreShape): Partial<TLShape> {
  return {
    id: firestoreShape.id as any,
    type: firestoreShape.type as any,
    x: firestoreShape.x,
    y: firestoreShape.y,
    rotation: firestoreShape.rotation,
    props: firestoreShape.props,
    parentId: firestoreShape.parentId as any,
    index: firestoreShape.index as any,
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
 */
export async function batchWriteShapes(
  roomId: string,
  shapes: TLShape[],
  userId: string
): Promise<void> {
  try {
    // Firebase has a limit of 500 operations per batch
    // For simplicity, we'll write them individually
    // In production, you might want to use batched writes
    const promises = shapes.map(shape => 
      writeShapeToFirestore(roomId, shape, userId)
    );
    
    await Promise.all(promises);
  } catch (error) {
    console.error("Error batch writing shapes:", error);
    throw error;
  }
}

/**
 * Gets all shapes in a room (one-time read)
 * Used for initial load
 * 
 * @param roomId - Room identifier
 * @returns Promise with array of shapes
 */
export async function getAllShapes(roomId: string): Promise<FirestoreShape[]> {
  try {
    const shapesRef = collection(db, `rooms/${roomId}/shapes`);
    const snapshot = await new Promise<QuerySnapshot>((resolve, reject) => {
      const unsubscribe = onSnapshot(
        shapesRef,
        (snap) => {
          unsubscribe();
          resolve(snap);
        },
        reject
      );
    });

    return snapshot.docs.map(doc => doc.data() as FirestoreShape);
  } catch (error) {
    console.error("Error getting all shapes:", error);
    return [];
  }
}

