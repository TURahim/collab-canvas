/**
 * useShapes Hook
 * Manages real-time shape synchronization between tldraw and Firestore
 */

import type { Editor, TLShape, TLStoreEventInfo } from "@tldraw/tldraw";
import { useEffect, useRef, useState } from "react";

import {
  deleteShapeFromFirestore,
  firestoreShapeToTldraw,
  getAllShapes,
  listenToShapes,
  writeShapeToFirestore,
} from "../lib/firestoreSync";
import { debounce } from "../lib/utils";

/**
 * Options for useShapes hook
 */
interface UseShapesOptions {
  editor: Editor | null;
  userId: string | null;
  roomId?: string;
  enabled?: boolean;
}

/**
 * Return type for useShapes hook
 */
interface UseShapesReturn {
  isSyncing: boolean;
  error: Error | null;
}

/**
 * Hook to sync tldraw shapes with Firestore
 * - Listens to local shape changes and syncs to Firestore (debounced 300ms)
 * - Listens to remote shape changes and applies to local editor
 * - Prevents sync loops with isSyncing flag
 * - Handles shape creation, updates, and deletion
 * 
 * @returns Object containing isSyncing status and error state
 */
export function useShapes({
  editor,
  userId,
  roomId = "default",
  enabled = true,
}: UseShapesOptions): UseShapesReturn {
  const isSyncingRef = useRef<boolean>(false);
  const [error, setError] = useState<Error | null>(null);
  const unsubscribeRef = useRef<(() => void) | null>(null);
  const pendingShapesRef = useRef<Map<string, TLShape>>(new Map());

  /**
   * Debounced function to write shape to Firestore
   * 300ms delay after last change to batch rapid updates
   */
  const debouncedWriteShape = useRef(
    debounce(async (shape: TLShape, uid: string, room: string) => {
      try {
        await writeShapeToFirestore(room, shape, uid);
      } catch (err) {
        console.error("[useShapes] Error writing shape:", err);
        setError(err instanceof Error ? err : new Error("Failed to write shape"));
      }
    }, 300)
  ).current;

  /**
   * Load initial shapes from Firestore on mount
   */
  useEffect(() => {
    if (!editor || !userId || !enabled) {
      return;
    }

    let isMounted = true;

    const loadInitialShapes = async (): Promise<void> => {
      try {
        isSyncingRef.current = true;
        const shapes = await getAllShapes(roomId);

        if (!isMounted) {
          return;
        }

        // Apply shapes to editor using mergeRemoteChanges to avoid triggering listeners
        editor.store.mergeRemoteChanges(() => {
          shapes.forEach((firestoreShape) => {
            const tldrawShape = firestoreShapeToTldraw(firestoreShape);
            try {
              editor.createShape(tldrawShape as TLShape);
            } catch (err) {
              // Shape might already exist or be invalid
              console.warn("[useShapes] Could not create shape:", err);
            }
          });
        });

        isSyncingRef.current = false;
      } catch (err) {
        console.error("[useShapes] Error loading initial shapes:", err);
        if (isMounted) {
          setError(err instanceof Error ? err : new Error("Failed to load shapes"));
        }
        isSyncingRef.current = false;
      }
    };

    loadInitialShapes();

    return (): void => {
      isMounted = false;
    };
  }, [editor, userId, roomId, enabled]);

  /**
   * Listen to tldraw editor changes and sync to Firestore
   * Handler is inline to ensure fresh closure over refs and dependencies
   */
  useEffect(() => {
    if (!editor || !userId || !enabled) {
      return;
    }

    const handleStoreChange = (event: TLStoreEventInfo): void => {
      if (isSyncingRef.current) {
        return;
      }

      // Only process user-initiated changes
      if (event.source !== "user") {
        return;
      }

      // Process added shapes
      Object.values(event.changes.added).forEach((record) => {
        if (record.typeName === "shape") {
          const shape = record as TLShape;
          pendingShapesRef.current.set(shape.id, shape);
          debouncedWriteShape(shape, userId, roomId);
        }
      });

      // Process updated shapes
      Object.values(event.changes.updated).forEach((update) => {
        const [, to] = update;
        if (to.typeName === "shape") {
          const shape = to as TLShape;
          pendingShapesRef.current.set(shape.id, shape);
          debouncedWriteShape(shape, userId, roomId);
        }
      });

      // Process removed shapes
      Object.values(event.changes.removed).forEach((record) => {
        if (record.typeName === "shape") {
          const shapeId = record.id as string;
          pendingShapesRef.current.delete(shapeId);
          // Delete immediately (no debounce for deletions)
          deleteShapeFromFirestore(roomId, shapeId).catch((err) => {
            console.error("[useShapes] Error deleting shape:", err);
            setError(err instanceof Error ? err : new Error("Failed to delete shape"));
          });
        }
      });
    };

    const unsubscribe = editor.store.listen(handleStoreChange, {
      source: "user",
      scope: "document",
    });

    return (): void => {
      unsubscribe();
    };
  }, [editor, userId, roomId, enabled, debouncedWriteShape]);

  /**
   * Listen to Firestore shape changes and apply to editor
   * Skips pending shapes to avoid overwriting local changes
   */
  useEffect(() => {
    if (!editor || !userId || !enabled) {
      return;
    }

    let isMounted = true;

    unsubscribeRef.current = listenToShapes(roomId, ({ added, modified, removed }) => {
      if (!isMounted || !editor) {
        return;
      }

      // Apply remote changes to editor
      isSyncingRef.current = true;

      editor.store.mergeRemoteChanges(() => {
        // Handle added shapes
        added.forEach((firestoreShape) => {
          // Skip if this is our own pending change
          if (pendingShapesRef.current.has(firestoreShape.id)) {
            return;
          }

          const tldrawShape = firestoreShapeToTldraw(firestoreShape);
          try {
            // Check if shape already exists
            const existing = editor.getShape(firestoreShape.id);
            if (existing) {
              editor.updateShape(tldrawShape as TLShape);
            } else {
              editor.createShape(tldrawShape as TLShape);
            }
          } catch (err) {
            console.warn("[useShapes] Could not add shape:", err);
          }
        });

        // Handle modified shapes
        modified.forEach((firestoreShape) => {
          // Skip if this is our own pending change
          if (pendingShapesRef.current.has(firestoreShape.id)) {
            return;
          }

          const tldrawShape = firestoreShapeToTldraw(firestoreShape);
          try {
            editor.updateShape(tldrawShape);
          } catch (err) {
            console.warn("[useShapes] Could not update shape:", err);
          }
        });

        // Handle removed shapes
        removed.forEach((shapeId) => {
          try {
            editor.deleteShape(shapeId);
          } catch (err) {
            console.warn("[useShapes] Could not delete shape:", err);
          }
        });
      });

      isSyncingRef.current = false;
    });

    return (): void => {
      isMounted = false;
      if (unsubscribeRef.current !== null) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
    };
  }, [editor, userId, roomId, enabled]);

  return {
    isSyncing: isSyncingRef.current,
    error,
  };
}

