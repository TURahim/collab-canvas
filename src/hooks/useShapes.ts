/**
 * useShapes Hook
 * Manages real-time shape synchronization between tldraw and Firestore
 */

import { useEffect, useRef, useCallback, useState } from "react";
import { Editor, TLShape, TLStoreEventInfo } from "@tldraw/tldraw";
import {
  writeShapeToFirestore,
  deleteShapeFromFirestore,
  listenToShapes,
  firestoreShapeToTldraw,
  getAllShapes,
} from "../lib/firestoreSync";
import { debounce } from "../lib/tldrawHelpers";

interface UseShapesOptions {
  editor: Editor | null;
  userId: string | null;
  roomId?: string;
  enabled?: boolean;
}

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
 */
export function useShapes({
  editor,
  userId,
  roomId = "default",
  enabled = true,
}: UseShapesOptions): UseShapesReturn {
  const isSyncingRef = useRef(false);
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
        console.error("Error writing shape:", err);
        setError(err as Error);
      }
    }, 300)
  ).current;

  /**
   * Handle shape changes from tldraw editor
   * Only syncs user-initiated changes to prevent loops
   */
  const handleEditorChanges = useCallback(
    (event: TLStoreEventInfo) => {
      if (!editor || !userId || !enabled || isSyncingRef.current) {
        return;
      }

      // Only process user-initiated changes
      if (event.source !== "user") {
        return;
      }

      // Process added records
      Object.values(event.changes.added).forEach((record) => {
        if (record.typeName === "shape") {
          const shape = record as TLShape;
          pendingShapesRef.current.set(shape.id, shape);
          debouncedWriteShape(shape, userId, roomId);
        }
      });

      // Process updated records
      Object.values(event.changes.updated).forEach((update) => {
        const [from, to] = update;
        if (to.typeName === "shape") {
          const shape = to as TLShape;
          pendingShapesRef.current.set(shape.id, shape);
          debouncedWriteShape(shape, userId, roomId);
        }
      });

      // Process removed records
      Object.values(event.changes.removed).forEach((record) => {
        if (record.typeName === "shape") {
          const shapeId = record.id;
          pendingShapesRef.current.delete(shapeId);
          // Delete immediately (no debounce for deletions)
          deleteShapeFromFirestore(roomId, shapeId).catch((err) => {
            console.error("Error deleting shape:", err);
            setError(err as Error);
          });
        }
      });
    },
    [editor, userId, roomId, enabled, debouncedWriteShape]
  );

  /**
   * Load initial shapes from Firestore on mount
   */
  useEffect(() => {
    if (!editor || !userId || !enabled) {
      return;
    }

    let mounted = true;

    const loadInitialShapes = async () => {
      try {
        isSyncingRef.current = true;
        const shapes = await getAllShapes(roomId);

        if (!mounted) return;

        // Apply shapes to editor
        editor.store.mergeRemoteChanges(() => {
          shapes.forEach((firestoreShape) => {
            const tldrawShape = firestoreShapeToTldraw(firestoreShape);
            try {
              editor.createShape(tldrawShape as any);
            } catch (err) {
              // Shape might already exist or be invalid
              console.warn("Could not create shape:", err);
            }
          });
        });

        isSyncingRef.current = false;
      } catch (err) {
        console.error("Error loading initial shapes:", err);
        if (mounted) {
          setError(err as Error);
        }
        isSyncingRef.current = false;
      }
    };

    loadInitialShapes();

    return () => {
      mounted = false;
    };
  }, [editor, userId, roomId, enabled]);

  /**
   * Listen to tldraw editor changes
   */
  useEffect(() => {
    if (!editor || !userId || !enabled) {
      return;
    }

    const unsubscribe = editor.store.listen(handleEditorChanges, {
      source: "user",
      scope: "document",
    });

    return () => {
      unsubscribe();
    };
  }, [editor, userId, enabled, handleEditorChanges]);

  /**
   * Listen to Firestore shape changes
   */
  useEffect(() => {
    if (!editor || !userId || !enabled) {
      return;
    }

    let mounted = true;

    unsubscribeRef.current = listenToShapes(roomId, ({ added, modified, removed }) => {
      if (!mounted || !editor) return;

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
            const existing = editor.getShape(firestoreShape.id as any);
            if (existing) {
              editor.updateShape(tldrawShape as any);
            } else {
              editor.createShape(tldrawShape as any);
            }
          } catch (err) {
            console.warn("Could not add shape:", err);
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
            editor.updateShape(tldrawShape as any);
          } catch (err) {
            console.warn("Could not update shape:", err);
          }
        });

        // Handle removed shapes
        removed.forEach((shapeId) => {
          try {
            editor.deleteShape(shapeId as any);
          } catch (err) {
            console.warn("Could not delete shape:", err);
          }
        });
      });

      isSyncingRef.current = false;
    });

    return () => {
      mounted = false;
      if (unsubscribeRef.current) {
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

