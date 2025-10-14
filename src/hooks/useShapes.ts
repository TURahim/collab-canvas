/**
 * useShapes Hook
 * Manages real-time shape synchronization between tldraw and Firestore
 */

import type { Editor, TLShape, TLShapeId, TLStoreEventInfo } from "@tldraw/tldraw";
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
 * - Listens to local shape changes (user AND programmatic/AI) and syncs to Firestore (debounced 300ms)
 * - Listens to remote shape changes and applies to local editor
 * - Prevents sync loops by filtering out "remote" source and using isSyncing flag
 * - Handles shape creation, updates, and deletion
 * - AI-generated shapes are persisted since they have source !== "remote"
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
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);
  const unsubscribeRef = useRef<(() => void) | null>(null);
  const pendingShapesRef = useRef<Map<string, TLShape>>(new Map());

  /**
   * Per-shape debounced write functions
   * Each shape has its own debounce timer to prevent cancellation
   */
  const debounceTimersRef = useRef<Map<string, NodeJS.Timeout>>(new Map());
  
  const writeShapeDebounced = useRef((shape: TLShape, uid: string, room: string) => {
    // Clear existing timer for THIS specific shape
    const existingTimer = debounceTimersRef.current.get(shape.id);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }
    
    // Set new timer for THIS shape only
    const timer = setTimeout(async () => {
      try {
        await writeShapeToFirestore(room, shape, uid);
        debounceTimersRef.current.delete(shape.id);
      } catch (err) {
        console.error("[useShapes] Error writing shape:", err);
        setError(err instanceof Error ? err : new Error("Failed to write shape"));
      }
    }, 300);
    
    debounceTimersRef.current.set(shape.id, timer);
  }).current;

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
        console.log('[useShapes] Loading initial shapes from Firestore...');
        isSyncingRef.current = true;
        setIsSyncing(true);
        const shapes = await getAllShapes(roomId);
        
        console.log(`[useShapes] Loaded ${shapes.length} shapes from Firestore`);

        if (!isMounted) {
          isSyncingRef.current = false;
          setIsSyncing(false);
          return;
        }

        // Apply shapes to editor using mergeRemoteChanges to avoid triggering listeners
        editor.store.mergeRemoteChanges(() => {
          shapes.forEach((firestoreShape) => {
            const tldrawShape = firestoreShapeToTldraw(firestoreShape);
            try {
              editor.createShape(tldrawShape as TLShape);
              console.log('[useShapes] Restored shape:', {
                id: firestoreShape.id,
                type: firestoreShape.type,
              });
            } catch (err) {
              // Shape might already exist or be invalid
              if (process.env.NODE_ENV === "development") {
                console.warn("[useShapes] Could not create shape:", err);
              }
            }
          });
        });

        console.log('[useShapes] Initial shape load complete');
        isSyncingRef.current = false;
        setIsSyncing(false);
      } catch (err) {
        console.error("[useShapes] Error loading initial shapes:", err);
        if (isMounted) {
          setError(err instanceof Error ? err : new Error("Failed to load shapes"));
        }
        isSyncingRef.current = false;
        setIsSyncing(false);
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

      // Process user-initiated changes and programmatic changes (AI-generated shapes)
      // Skip only "remote" changes (from other users via Firestore sync)
      if (event.source === "remote") {
        return;
      }

      // Log event source for debugging
      const addedCount = Object.keys(event.changes.added).length;
      const updatedCount = Object.keys(event.changes.updated).length;
      const removedCount = Object.keys(event.changes.removed).length;
      
      if (addedCount > 0 || updatedCount > 0 || removedCount > 0) {
        console.log('[useShapes] Store change detected:', {
          source: event.source,
          added: addedCount,
          updated: updatedCount,
          removed: removedCount,
        });
      }

      // Process added shapes
      Object.values(event.changes.added).forEach((record) => {
        if (record.typeName === "shape") {
          const shape = record as TLShape;
          console.log('[useShapes] Saving new shape to Firestore:', {
            id: shape.id,
            type: shape.type,
            source: event.source,
          });
          pendingShapesRef.current.set(shape.id, shape);
          writeShapeDebounced(shape, userId, roomId);
        }
      });

      // Process updated shapes
      Object.values(event.changes.updated).forEach((update) => {
        const [, to] = update;
        if (to.typeName === "shape") {
          const shape = to as TLShape;
          pendingShapesRef.current.set(shape.id, shape);
          writeShapeDebounced(shape, userId, roomId);
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
      scope: "document",
      // Note: Removed source filter to capture both "user" and programmatic (AI) changes
      // We filter out "remote" changes in the handler instead
    });

    return (): void => {
      unsubscribe();
      // Clear all pending timers on unmount
      debounceTimersRef.current.forEach(timer => clearTimeout(timer));
      debounceTimersRef.current.clear();
    };
  }, [editor, userId, roomId, enabled, writeShapeDebounced]);

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
      setIsSyncing(true);

      editor.store.mergeRemoteChanges(() => {
        // Handle added shapes
        added.forEach((firestoreShape) => {
          // Skip if this is our own pending change
          if (pendingShapesRef.current.has(firestoreShape.id)) {
            pendingShapesRef.current.delete(firestoreShape.id);
            return;
          }

          const tldrawShape = firestoreShapeToTldraw(firestoreShape);
          try {
            // Check if shape already exists
            const existing = editor.getShape(firestoreShape.id as TLShapeId);
            if (existing) {
              editor.updateShape(tldrawShape as TLShape);
            } else {
              editor.createShape(tldrawShape as TLShape);
            }
          } catch (err) {
            if (process.env.NODE_ENV === "development") {
              console.warn("[useShapes] Could not add shape:", err);
            }
          }
        });

        // Handle modified shapes
        modified.forEach((firestoreShape) => {
          // Skip if this is our own pending change
          if (pendingShapesRef.current.has(firestoreShape.id)) {
            pendingShapesRef.current.delete(firestoreShape.id);
            return;
          }

          const tldrawShape = firestoreShapeToTldraw(firestoreShape);
          try {
            editor.updateShape(tldrawShape as TLShape);
          } catch (err) {
            if (process.env.NODE_ENV === "development") {
              console.warn("[useShapes] Could not update shape:", err);
            }
          }
        });

        // Handle removed shapes
        removed.forEach((shapeId) => {
          try {
            editor.deleteShape(shapeId as TLShapeId);
          } catch (err) {
            if (process.env.NODE_ENV === "development") {
              console.warn("[useShapes] Could not delete shape:", err);
            }
          }
        });
      });

      isSyncingRef.current = false;
      setIsSyncing(false);
    });

    return (): void => {
      isMounted = false;
      unsubscribeRef.current?.();
      unsubscribeRef.current = null;
    };
  }, [editor, userId, roomId, enabled]);

  return {
    isSyncing,
    error,
  };
}
