/**
 * useShapes Hook
 * Manages real-time shape synchronization between tldraw and Firestore
 */

import type { Editor, TLShape, TLShapeId, TLStoreEventInfo } from "@tldraw/tldraw";
import { getSnapshot, loadSnapshot as tldrawLoadSnapshot } from "@tldraw/tldraw";
import { useEffect, useRef, useState } from "react";

import {
  deleteShapeFromFirestore,
  firestoreShapeToTldraw,
  getAllShapes,
  listenToShapes,
  writeShapeToFirestore,
  loadSnapshot,
  saveSnapshot,
  getShapesSince,
  getTombstonesSince,
} from "../lib/firestoreSync";
import { debounce, throttle, distance } from "../lib/utils";
import { processAssetUpload, getAllAssets, getAssetRecord, retryPendingUploads } from "../lib/assetManagement";
import { updateDragPosition, clearDragPosition, listenToDragUpdates } from "../lib/realtimeSync";
import { savePendingAsset, removePendingAsset } from "../lib/indexedDB";
import { RemoteDragSmoother } from "../lib/dragSmoothing";

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
  const processingAssetsRef = useRef<Set<string>>(new Set());

  /**
   * Per-shape throttled write functions
   * Using throttle instead of debounce to ensure updates persist during drag
   * 120ms throttle = ~8 writes per second max (good balance)
   */
  const throttleTimersRef = useRef<Map<string, number>>(new Map());
  const snapshotTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  const writeShapeThrottled = useRef((shape: TLShape, uid: string, room: string) => {
    const now = Date.now();
    const lastWrite = throttleTimersRef.current.get(shape.id) || 0;
    const timeSinceLastWrite = now - lastWrite;
    
    // Throttle: only write if 120ms has passed since last write for this shape
    if (timeSinceLastWrite >= 120) {
      console.log('[useShapes] ⏰ THROTTLE ALLOWING WRITE - Writing shape to Firestore:', {
        id: shape.id,
        type: shape.type,
        props: shape.type === 'geo' ? {
          w: (shape.props as any).w,
          h: (shape.props as any).h,
        } : 'non-geo',
        timeSinceLastWrite: `${timeSinceLastWrite}ms`,
      });
      
      throttleTimersRef.current.set(shape.id, now);
      
      writeShapeToFirestore(room, shape, uid).catch((err) => {
        console.error("[useShapes] ❌ Error writing shape:", err);
        setError(err instanceof Error ? err : new Error("Failed to write shape"));
      });
    } else {
      console.log('[useShapes] ⏱️ Throttle blocking write (too soon):', {
        id: shape.id,
        waitMore: `${120 - timeSinceLastWrite}ms`,
      });
    }
  }).current;

  /**
   * Save full snapshot (debounced) to persist pages and document state
   * This runs less frequently than shape updates (every 5 seconds)
   */
  const saveSnapshotDebounced = useRef((ed: Editor, uid: string, room: string) => {
    if (snapshotTimerRef.current) {
      clearTimeout(snapshotTimerRef.current);
    }
    
    snapshotTimerRef.current = setTimeout(async () => {
      try {
        // Use getSnapshot() function to get document state
        const { document } = getSnapshot(ed.store);
        await saveSnapshot(room, { document, session: {} } as any, uid);
        console.log('[useShapes] Snapshot saved (includes pages)');
      } catch (err) {
        console.error("[useShapes] Error saving snapshot:", err);
      }
    }, 5000); // 5 second debounce for full snapshots
  }).current;

  /**
   * Save full snapshot immediately (no debounce)
   * Used for critical operations like shape deletion to ensure state is persisted
   */
  const saveSnapshotImmediate = useRef(async (ed: Editor, uid: string, room: string) => {
    // Cancel any pending debounced save
    if (snapshotTimerRef.current) {
      clearTimeout(snapshotTimerRef.current);
      snapshotTimerRef.current = null;
    }
    
    try {
      // Use getSnapshot() function to get document state
      const { document } = getSnapshot(ed.store);
      
      // Log what shapes are in the snapshot
      const shapes = Object.values((document as any).store || {}).filter((r: any) => r.typeName === 'shape');
      console.log('[useShapes] 📸 SAVING SNAPSHOT IMMEDIATELY:', {
        totalShapes: shapes.length,
        shapeDetails: shapes.map((s: any) => ({
          id: s.id,
          type: s.type,
          props: s.type === 'geo' ? { w: s.props?.w, h: s.props?.h } : 'non-geo',
        })),
        timestamp: new Date().toISOString(),
      });
      
      await saveSnapshot(room, { document, session: {} } as any, uid);
      console.log('[useShapes] ✅ Snapshot saved immediately (critical operation)');
    } catch (err) {
      console.error("[useShapes] ❌ Error saving snapshot immediately:", err);
    }
  }).current;

  /**
   * Helper function to handle asset uploads with IndexedDB retry queue
   * Detects blob URLs and uploads them to Firebase Storage
   * Saves to IndexedDB before upload for retry on refresh
   */
  const handleAssetUpload = async (assetId: string, assetSrc: string): Promise<void> => {
    if (!userId || !editor) return;

    // Skip if already processing this asset
    if (processingAssetsRef.current.has(assetId)) {
      return;
    }

    // Only process blob URLs and data URLs (newly uploaded assets)
    const isBlobUrl = assetSrc.startsWith('blob:');
    const isDataUrl = assetSrc.startsWith('data:');
    
    if (!isBlobUrl && !isDataUrl) {
      console.log('[useShapes] Skipping asset (not blob or data URL):', { assetId, src: assetSrc.substring(0, 50) });
      return;
    }

    // Skip if it's already a Firebase Storage URL (already persisted)
    if (assetSrc.includes('firebasestorage.googleapis.com')) {
      console.log('[useShapes] Skipping asset (already persisted):', assetId);
      return;
    }

    try {
      processingAssetsRef.current.add(assetId);
      console.log('[useShapes] 🚀 Processing asset upload:', { assetId, type: isBlobUrl ? 'blob' : 'data' });

      let blob: Blob;
      
      if (isBlobUrl) {
        // Fetch blob from blob URL
        const response = await fetch(assetSrc);
        blob = await response.blob();
      } else {
        // Convert data URL to blob
        const response = await fetch(assetSrc);
        blob = await response.blob();
      }

      // Get file extension from mime type
      const mimeType = blob.type || 'image/png';
      const ext = mimeType.split('/')[1] || 'png';
      
      // Convert to File
      const file = new File([blob], `${assetId}.${ext}`, { type: mimeType });
      
      console.log('[useShapes] 💾 Saving to IndexedDB retry queue before upload...');
      
      // STEP 1: Save blob to IndexedDB BEFORE upload (for retry on refresh)
      await savePendingAsset(assetId, blob, {
        roomId,
        mimeType,
        size: file.size,
        retryCount: 0,
      });
      
      console.log('[useShapes] 📤 Uploading to Firebase Storage:', { 
        assetId, 
        size: `${(file.size / 1024).toFixed(2)}KB`,
        mimeType 
      });

      // STEP 2: Upload to Storage and save record (pending → ready)
      const assetRecord = await processAssetUpload(file, assetId, roomId, userId, assetSrc);

      console.log('[useShapes] ✅ Upload complete, updating tldraw asset with permanent URL');

      // STEP 3: Update asset in tldraw with permanent URL
      editor.store.mergeRemoteChanges(() => {
        const asset = editor.getAsset(assetId as any);
        if (asset && asset.type === 'image') {
          editor.updateAssets([{
            ...asset,
            props: {
              ...asset.props,
              src: assetRecord.src,
            },
          }]);
        }
      });

      // STEP 4: Remove from IndexedDB queue (upload successful)
      await removePendingAsset(assetId);
      console.log('[useShapes] 🎉 Asset fully uploaded and removed from retry queue:', assetId);
    } catch (err) {
      console.error('[useShapes] ❌ Error handling asset upload:', err);
      // Blob remains in IndexedDB for retry on next mount
      setError(err instanceof Error ? err : new Error("Failed to upload asset"));
    } finally {
      processingAssetsRef.current.delete(assetId);
    }
  };

  /**
   * Retry pending uploads from IndexedDB on mount
   * This handles uploads that were interrupted by refresh/close
   */
  useEffect(() => {
    if (!editor || !userId || !roomId || !enabled) {
      return;
    }

    // Retry pending uploads
    retryPendingUploads(roomId, userId, (assetId, downloadURL) => {
      // Callback when asset becomes ready - update tldraw
      if (!editor) return;
      
      editor.store.mergeRemoteChanges(() => {
        const asset = editor.getAsset(assetId as any);
        if (asset && asset.type === 'image') {
          editor.updateAssets([{
            ...asset,
            props: {
              ...asset.props,
              src: downloadURL,
            },
          }]);
          console.log('[useShapes] 🔄 Retry complete - asset updated in tldraw:', assetId);
        }
      });
    }).catch(err => {
      console.error('[useShapes] Error retrying pending uploads:', err);
    });
  }, [editor, userId, roomId, enabled]);

  /**
   * Load initial shapes and assets from Firestore on mount
   */
  useEffect(() => {
    if (!editor || !userId || !enabled) {
      return;
    }

    let isMounted = true;

    const loadInitialShapes = async (): Promise<void> => {
      try {
        console.log('[useShapes] Loading initial data from Firestore...', {
          roomId,
          path: `rooms/${roomId}/shapes`,
        });
        isSyncingRef.current = true;
        setIsSyncing(true);
        
        // Load assets first
        const assets = await getAllAssets(roomId);
        console.log(`[useShapes] Loaded ${assets.length} assets from Firestore (pending + ready)`);

        // Separate pending and ready assets
        const readyAssets = assets.filter(a => a.status === 'ready');
        const pendingAssets = assets.filter(a => a.status === 'pending');
        
        if (pendingAssets.length > 0) {
          console.log(`[useShapes] ⏳ Found ${pendingAssets.length} pending assets (uploads in progress or failed)`);
        }

        // Create a map of asset IDs to permanent URLs (only ready assets)
        const assetUrlMap = new Map(readyAssets.map(a => [a.id, a.src]));

        // Try to load full snapshot first (includes pages + shapes)
        const snapshotWithMeta = await loadSnapshot(roomId);
        
        if (snapshotWithMeta && isMounted) {
          const { snapshot, savedAt } = snapshotWithMeta;
          
          console.log('[useShapes] 📂 LOADING SNAPSHOT FROM FIRESTORE');
          console.log('[useShapes] ⏰ Snapshot was saved at:', new Date(savedAt).toISOString());
          
          // Log what shapes are in the snapshot before loading
          const snapshotData = snapshot as any;
          const snapshotShapes = Object.values(snapshotData.document?.store || {}).filter((r: any) => r.typeName === 'shape');
          console.log('[useShapes] 📊 Snapshot contains:', {
            totalShapes: snapshotShapes.length,
            shapeDetails: snapshotShapes.map((s: any) => ({
              id: s.id,
              type: s.type,
              props: s.type === 'geo' ? { 
                w: s.props?.w, 
                h: s.props?.h,
                geo: s.props?.geo 
              } : 'non-geo',
            })),
            timestamp: new Date().toISOString(),
          });
          
          // Update asset URLs in snapshot before loading
          if (snapshotData.document?.store) {
            Object.values(snapshotData.document.store).forEach((record: any) => {
              if (record.typeName === 'asset' && record.type === 'image') {
                const permanentUrl = assetUrlMap.get(record.id);
                if (permanentUrl) {
                  record.props.src = permanentUrl;
                }
              }
            });
          }

          // Load full snapshot which includes pages and shapes
          tldrawLoadSnapshot(editor.store, snapshot);
          console.log('[useShapes] ✅ Snapshot restored successfully');

          // DELTA REPLAY: Apply changes that happened after snapshot was saved
          console.log('[useShapes] 🔄 Starting delta replay...');
          
          // Fetch shapes created/updated since snapshot
          const deltaShapes = await getShapesSince(roomId, savedAt);
          
          // Fetch deletions since snapshot
          const tombstones = await getTombstonesSince(roomId, savedAt);
          
          if (deltaShapes.length > 0 || tombstones.length > 0) {
            console.log('[useShapes] 📈 Applying deltas:', {
              updatedShapes: deltaShapes.length,
              deletedShapes: tombstones.length,
            });
            
            editor.store.mergeRemoteChanges(() => {
              // Apply updated/created shapes
              deltaShapes.forEach((firestoreShape) => {
                const tldrawShape = firestoreShapeToTldraw(firestoreShape);
                try {
                  const existing = editor.getShape(firestoreShape.id as TLShapeId);
                  if (existing) {
                    editor.updateShape(tldrawShape as TLShape);
                    console.log('[useShapes] 📝 Delta: Updated shape:', firestoreShape.id);
                  } else {
                    editor.createShape(tldrawShape as TLShape);
                    console.log('[useShapes] 🆕 Delta: Created shape:', firestoreShape.id);
                  }
                } catch (err) {
                  if (process.env.NODE_ENV === "development") {
                    console.warn("[useShapes] Could not apply delta shape:", err);
                  }
                }
              });
              
              // Apply deletions
              tombstones.forEach((tombstone) => {
                try {
                  editor.deleteShape(tombstone.shapeId as TLShapeId);
                  console.log('[useShapes] 🗑️ Delta: Deleted shape:', tombstone.shapeId);
                } catch (err) {
                  if (process.env.NODE_ENV === "development") {
                    console.warn("[useShapes] Could not delete shape from tombstone:", err);
                  }
                }
              });
            });
            
            console.log('[useShapes] ✅ Delta replay complete');
          } else {
            console.log('[useShapes] ✅ No deltas to apply - snapshot is up to date');
          }
        } else {
          // Fallback: load individual shapes (backward compatibility)
          console.log('[useShapes] No snapshot found, loading individual shapes');
          const shapes = await getAllShapes(roomId);
          console.log(`[useShapes] Loaded ${shapes.length} shapes from Firestore`);

          if (!isMounted) {
            isSyncingRef.current = false;
            setIsSyncing(false);
            return;
          }

          // Apply shapes AND assets to editor using mergeRemoteChanges
          editor.store.mergeRemoteChanges(() => {
            // First, restore assets to the editor (only ready assets)
            if (readyAssets.length > 0) {
              console.log('[useShapes] Restoring ready assets to editor:', readyAssets.length);
              
              const tldrawAssets = readyAssets.map((assetRecord) => ({
                id: assetRecord.id as any,
                type: 'image' as const,
                typeName: 'asset' as const,
                props: {
                  src: assetRecord.src,
                  w: 0,
                  h: 0,
                  mimeType: assetRecord.mimeType,
                  name: `asset-${assetRecord.id}`,
                  isAnimated: false,
                },
                meta: {},
              }));
              
              editor.createAssets(tldrawAssets);
              console.log('[useShapes] ✅ Ready assets restored to editor');
            }
            
            // Note: Pending assets are not loaded into editor yet
            // They will be added when retry completes and status changes to 'ready'

            // Then restore shapes
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
        }

        console.log('[useShapes] Initial data load complete');
        isSyncingRef.current = false;
        setIsSyncing(false);
      } catch (err) {
        console.error("[useShapes] Error loading initial data:", err);
        if (isMounted) {
          setError(err instanceof Error ? err : new Error("Failed to load data"));
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

      // Check for page changes (add, update, remove)
      let hasPageChanges = false;
      [...Object.values(event.changes.added), ...Object.values(event.changes.updated).map(([, to]) => to), ...Object.values(event.changes.removed)].forEach((record) => {
        if (record.typeName === "page") {
          hasPageChanges = true;
        }
      });

      // If pages changed, save full snapshot (includes pages + shapes)
      if (hasPageChanges) {
        console.log('[useShapes] Page change detected, saving snapshot');
        saveSnapshotDebounced(editor, userId, roomId);
      }

      // Process added and updated assets
      const processAsset = (assetId: string, label: string) => {
        // Get the full asset from the editor's asset store
        const fullAsset = editor.getAsset(assetId as any);
        
        if (fullAsset && fullAsset.type === 'image') {
          const assetSrc = (fullAsset.props as any)?.src || (fullAsset as any).src;
          
          console.log(`[useShapes] ${label} image asset:`, {
            id: assetId,
            src: assetSrc,
            props: fullAsset.props,
          });
          
          if (assetSrc && assetSrc !== '') {
            console.log('[useShapes] ✅ Image asset with valid src:', {
              id: assetId,
              src: assetSrc,
            });
            // Handle asset upload asynchronously (don't block)
            void handleAssetUpload(assetId, assetSrc);
          } else {
            console.log('[useShapes] ⏳ Asset src not ready yet (will catch on update):', assetId);
          }
        }
      };

      // Process added assets
      Object.values(event.changes.added).forEach((record) => {
        if (record.typeName === "asset") {
          const assetId = record.id;
          processAsset(assetId, 'Added');
        }
      });

      // Process updated assets (catches when tldraw sets the blob URL)
      Object.values(event.changes.updated).forEach((update) => {
        const [from, to] = update;
        if (to.typeName === "asset" && to.type === 'image') {
          const assetId = to.id;
          // Only process if src changed from empty to populated
          const fromSrc = (from as any).props?.src || '';
          const toSrc = (to as any).props?.src || '';
          
          if (toSrc && toSrc !== '' && fromSrc !== toSrc) {
            console.log('[useShapes] Asset src updated:', { id: assetId, from: fromSrc, to: toSrc });
            processAsset(assetId, 'Updated');
          }
        }
      });

      // Process added shapes
      let hasShapeCreation = false;
      Object.values(event.changes.added).forEach((record) => {
        if (record.typeName === "shape") {
          const shape = record as TLShape;
          
          // Log shape details to debug
          console.log('[useShapes] 🆕 NEW SHAPE ADDED:', {
            id: shape.id,
            type: shape.type,
            source: event.source,
            x: shape.x,
            y: shape.y,
            props: shape.type === 'geo' ? {
              w: (shape.props as any).w,
              h: (shape.props as any).h,
              geo: (shape.props as any).geo,
            } : 'non-geo',
            timestamp: new Date().toISOString(),
          });
          
          pendingShapesRef.current.set(shape.id, shape);
          hasShapeCreation = true;
          
          // Write immediately on creation (no debounce) to ensure persistence
          // This prevents shapes from disappearing if user refreshes quickly
          writeShapeToFirestore(roomId, shape, userId).catch((err) => {
            console.error("[useShapes] Error writing new shape:", err);
            setError(err instanceof Error ? err : new Error("Failed to write shape"));
          });
        }
      });

      // NOTE: Removed immediate snapshot save on creation
      // Snapshots are now only saved on idle states (pointerup, visibility change)
      // to avoid capturing "tiny dot" before drag completes

      // Process updated shapes
      Object.values(event.changes.updated).forEach((update) => {
        const [from, to] = update;
        if (to.typeName === "shape") {
          const shape = to as TLShape;
          
          // Log shape update details to debug
          console.log('[useShapes] 🔄 SHAPE UPDATED (debounced 300ms):', {
            id: shape.id,
            type: shape.type,
            source: event.source,
            props: shape.type === 'geo' ? {
              w: (shape.props as any).w,
              h: (shape.props as any).h,
              geo: (shape.props as any).geo,
            } : 'non-geo',
            changed: {
              from: (from as any).type === 'geo' ? {
                w: ((from as any).props as any)?.w,
                h: ((from as any).props as any)?.h,
              } : 'non-geo',
              to: shape.type === 'geo' ? {
                w: (shape.props as any).w,
                h: (shape.props as any).h,
              } : 'non-geo',
            },
            timestamp: new Date().toISOString(),
          });
          
          pendingShapesRef.current.set(shape.id, shape);
          writeShapeThrottled(shape, userId, roomId);
        }
      });

      // Process removed shapes
      let hasShapeDeletion = false;
      Object.values(event.changes.removed).forEach((record) => {
        if (record.typeName === "shape") {
          const shapeId = record.id as string;
          pendingShapesRef.current.delete(shapeId);
          hasShapeDeletion = true;
          // Delete immediately (no debounce for deletions)
          deleteShapeFromFirestore(roomId, shapeId).catch((err) => {
            console.error("[useShapes] Error deleting shape:", err);
            setError(err instanceof Error ? err : new Error("Failed to delete shape"));
          });
        }
      });

      // If shapes were deleted, save snapshot immediately to persist deletion
      // This ensures deleted shapes don't reappear on page refresh
      if (hasShapeDeletion) {
        console.log('[useShapes] Shape deletion detected, saving snapshot immediately');
        void saveSnapshotImmediate(editor, userId, roomId);
      }
    };

    const unsubscribe = editor.store.listen(handleStoreChange, {
      scope: "document",
      // Note: Removed source filter to capture both "user" and programmatic (AI) changes
      // We filter out "remote" changes in the handler instead
    });

    return (): void => {
      unsubscribe();
      // Clear throttle tracking on unmount
      throttleTimersRef.current.clear();
      if (snapshotTimerRef.current) {
        clearTimeout(snapshotTimerRef.current);
      }
    };
  }, [editor, userId, roomId, enabled, writeShapeThrottled, saveSnapshotDebounced, saveSnapshotImmediate]);

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

  /**
   * Real-time drag sync - Updates shape positions at 60Hz during drag
   * This provides smooth collaborative drag experience with < 100ms latency
   */
  useEffect(() => {
    if (!editor || !userId || !roomId || !enabled) {
      return;
    }

    let draggedShapeId: TLShapeId | null = null;
    let isDragging = false;

    // Throttled drag update (60Hz = 16ms) - Only send position, not full shape data
    const throttledDragUpdate = throttle((shapeId: TLShapeId, x: number, y: number) => {
      void updateDragPosition(roomId, shapeId, { x, y }, userId);
    }, 16);

    // Listen to pointer events for drag detection
    const handlePointerMove = (): void => {
      if (!editor) {
        return;
      }

      try {
        const selectedShapes = editor.getSelectedShapes();
        const instanceState = editor.getInstanceState();

        // Check if we're in a drag operation
        if (selectedShapes.length === 1 && instanceState.isCoarsePointer === false) {
          const shape = selectedShapes[0];
          
          // Detect if drag started
          if (!isDragging && draggedShapeId !== shape.id) {
            isDragging = true;
            draggedShapeId = shape.id;
          }

          // Send throttled updates during drag
          if (isDragging && draggedShapeId === shape.id) {
            throttledDragUpdate(shape.id, shape.x, shape.y);
          }
        }
      } catch (err) {
        // Silently handle errors during drag detection
        if (process.env.NODE_ENV === "development") {
          console.warn("[useShapes] Drag detection error:", err);
        }
      }
    };

    const handlePointerUp = async (): Promise<void> => {
      if (draggedShapeId) {
        await clearDragPosition(roomId, draggedShapeId);
        draggedShapeId = null;
        isDragging = false;
      }
    };

    // Add listeners
    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);

    // Check if smooth remote drag is enabled
    const smoothDragEnabled = process.env.NEXT_PUBLIC_SMOOTH_REMOTE_DRAG === 'true';
    
    // Initialize drag smoother if enabled
    const dragSmoother = smoothDragEnabled ? new RemoteDragSmoother((shapeId, x, y) => {
      // Apply position callback - updates tldraw editor
      try {
        const shape = editor?.getShape(shapeId as TLShapeId);
        if (shape && editor) {
          isSyncingRef.current = true;
          editor.updateShape({
            id: shapeId as TLShapeId,
            type: shape.type,
            x,
            y,
          });
          isSyncingRef.current = false;
        }
      } catch (err) {
        if (process.env.NODE_ENV === "development") {
          console.warn("[useShapes] Error in smoother apply:", err);
        }
      }
    }) : null;

    // Listen to remote drag updates from other users
    const unsubscribeDrag = listenToDragUpdates(roomId, (updates) => {
      if (!editor) return;

      updates.forEach((update) => {
        // Ignore our own drag updates (echo suppression)
        if (update.userId === userId) {
          return;
        }

        try {
          if (smoothDragEnabled && dragSmoother) {
            // Use smoother for interpolated, jitter-free movement
            dragSmoother.applyUpdate(update.shapeId, { x: update.x, y: update.y });
          } else {
            // Direct apply (original behavior - immediate but can be jerky)
            const shape = editor.getShape(update.shapeId as TLShapeId);
            if (shape) {
              isSyncingRef.current = true;
              editor.updateShape({
                id: update.shapeId as TLShapeId,
                type: shape.type,
                x: update.x,
                y: update.y,
              });
              isSyncingRef.current = false;
            }
          }
        } catch (err) {
          if (process.env.NODE_ENV === "development") {
            console.warn("[useShapes] Could not apply remote drag update:", err);
          }
        }
      });
    });

    // Cleanup
    return (): void => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      unsubscribeDrag();
      
      // Clear any ongoing drag state
      if (draggedShapeId) {
        void clearDragPosition(roomId, draggedShapeId);
      }
      
      // Stop and cleanup drag smoother if enabled
      if (dragSmoother) {
        dragSmoother.stop();
        dragSmoother.clear();
      }
    };
  }, [editor, userId, roomId, enabled]);

  /**
   * Snapshot saves on idle states (pointerup, visibility change)
   * This ensures snapshots capture final shape state, not intermediate "tiny dot" state
   */
  useEffect(() => {
    if (!editor || !userId || !roomId || !enabled) {
      return;
    }

    // Track if we've made changes since last snapshot
    let hasUnsavedChanges = false;
    const markDirty = () => { hasUnsavedChanges = true; };

    // Listen for any store changes to mark as dirty
    const unsubscribeStore = editor.store.listen(() => {
      markDirty();
    }, { scope: 'document' });

    // Save snapshot on pointerup (after drag completes)
    const handlePointerUp = () => {
      if (hasUnsavedChanges) {
        console.log('[useShapes] 📸 Pointerup detected - saving snapshot with final shape state');
        void saveSnapshotImmediate(editor, userId, roomId);
        hasUnsavedChanges = false;
      }
    };

    // Save snapshot when tab becomes hidden (user switching tabs, closing window)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden' && hasUnsavedChanges) {
        console.log('[useShapes] 📸 Tab hidden - saving snapshot before user leaves');
        void saveSnapshotImmediate(editor, userId, roomId);
        hasUnsavedChanges = false;
      }
    };

    // Save snapshot before page unload
    const handleBeforeUnload = () => {
      if (hasUnsavedChanges) {
        console.log('[useShapes] 📸 Page unloading - saving snapshot');
        // Note: This is synchronous, snapshot save is async, but we try our best
        void saveSnapshotImmediate(editor, userId, roomId);
      }
    };

    window.addEventListener('pointerup', handlePointerUp);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      unsubscribeStore();
      window.removeEventListener('pointerup', handlePointerUp);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [editor, userId, roomId, enabled, saveSnapshotImmediate]);

  return {
    isSyncing,
    error,
  };
}
