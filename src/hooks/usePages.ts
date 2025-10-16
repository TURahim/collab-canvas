/**
 * usePages Hook
 * Manages real-time page synchronization between tldraw and Firestore
 * Ensures multiple pages (tabs) persist across browser refreshes
 */

import type { Editor, TLPageId } from "@tldraw/tldraw";
import { useEffect, useRef, useState } from "react";
import {
  writePageToFirestore,
  deletePageFromFirestore,
  getAllPages,
  listenToPages,
  type TldrawPageData,
} from "../lib/pageSync";

interface UsePagesOptions {
  editor: Editor | null;
  userId: string | null;
  roomId: string;
  enabled?: boolean;
}

interface UsePagesReturn {
  isSyncing: boolean;
  error: Error | null;
}

/**
 * Hook to sync tldraw pages with Firestore
 * - Loads all pages on mount
 * - Listens to page creation/deletion/rename
 * - Syncs page changes to Firestore
 * - Prevents sync loops
 */
export function usePages({
  editor,
  userId,
  roomId,
  enabled = true,
}: UsePagesOptions): UsePagesReturn {
  const isSyncingRef = useRef<boolean>(false);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);
  const lastSyncedPagesRef = useRef<Set<string>>(new Set());

  /**
   * Load initial pages from Firestore on mount
   */
  useEffect(() => {
    if (!editor || !userId || !enabled) {
      return;
    }

    let isMounted = true;

    const loadInitialPages = async (): Promise<void> => {
      try {
        console.log('[usePages] Loading pages from Firestore...');
        isSyncingRef.current = true;
        setIsSyncing(true);

        const pages = await getAllPages(roomId);
        console.log(`[usePages] Loaded ${pages.length} pages from Firestore`);

        if (!isMounted || pages.length === 0) {
          isSyncingRef.current = false;
          setIsSyncing(false);
          return;
        }

        // Restore pages to editor
        editor.store.mergeRemoteChanges(() => {
          pages.forEach((firestorePage) => {
            try {
              const existingPage = editor.getPage(firestorePage.id as TLPageId);
              if (existingPage) {
                // Update existing page name
                editor.renamePage(firestorePage.id as TLPageId, firestorePage.name);
              } else {
                // Create new page
                editor.createPage({
                  id: firestorePage.id as TLPageId,
                  name: firestorePage.name,
                  index: firestorePage.index,
                });
              }
              lastSyncedPagesRef.current.add(firestorePage.id);
            } catch (err) {
              console.warn("[usePages] Could not restore page:", err);
            }
          });
        });

        console.log('[usePages] Pages loaded successfully');
        isSyncingRef.current = false;
        setIsSyncing(false);
      } catch (err) {
        console.error("[usePages] Error loading pages:", err);
        if (isMounted) {
          setError(err instanceof Error ? err : new Error("Failed to load pages"));
        }
        isSyncingRef.current = false;
        setIsSyncing(false);
      }
    };

    void loadInitialPages();

    return (): void => {
      isMounted = false;
    };
  }, [editor, userId, roomId, enabled]);

  /**
   * Listen to editor page changes and sync to Firestore
   */
  useEffect(() => {
    if (!editor || !userId || !enabled) {
      return;
    }

    const handleStoreChange = (event: any) => {
      // Skip if we're currently syncing from Firestore
      if (isSyncingRef.current) {
        return;
      }

      // Check if this is a page-related change
      const changes = event.changes;
      if (!changes || !changes.added || !changes.updated || !changes.removed) {
        return;
      }

      // Handle page additions and updates
      [...Object.values(changes.added), ...Object.values(changes.updated)].forEach((record: any) => {
        if (record.typeName === 'page') {
          const pageData: TldrawPageData = {
            id: record.id,
            name: record.name,
            index: record.index,
          };
          
          console.log('[usePages] Page changed, syncing to Firestore:', pageData);
          void writePageToFirestore(roomId, pageData, userId).catch((err) => {
            console.error('[usePages] Error syncing page:', err);
          });
          
          lastSyncedPagesRef.current.add(record.id);
        }
      });

      // Handle page deletions
      Object.values(changes.removed).forEach((record: any) => {
        if (record.typeName === 'page' && lastSyncedPagesRef.current.has(record.id)) {
          console.log('[usePages] Page deleted, removing from Firestore:', record.id);
          void deletePageFromFirestore(roomId, record.id).catch((err) => {
            console.error('[usePages] Error deleting page:', err);
          });
          
          lastSyncedPagesRef.current.delete(record.id);
        }
      });
    };

    // Listen to store changes
    const cleanup = editor.store.listen(handleStoreChange, {
      source: 'user',
      scope: 'document',
    });

    return (): void => {
      cleanup();
    };
  }, [editor, userId, roomId, enabled]);

  /**
   * Listen to remote page changes from Firestore
   */
  useEffect(() => {
    if (!editor || !userId || !enabled) {
      return;
    }

    const unsubscribe = listenToPages(roomId, (pages) => {
      if (isSyncingRef.current) {
        return; // Skip if currently syncing
      }

      console.log('[usePages] Received remote page changes:', pages.length);
      
      isSyncingRef.current = true;
      editor.store.mergeRemoteChanges(() => {
        pages.forEach((firestorePage) => {
          try {
            const existingPage = editor.getPage(firestorePage.id as TLPageId);
            if (existingPage && existingPage.name !== firestorePage.name) {
              // Update page name if changed
              editor.renamePage(firestorePage.id as TLPageId, firestorePage.name);
            } else if (!existingPage) {
              // Create page if it doesn't exist
              editor.createPage({
                id: firestorePage.id as TLPageId,
                name: firestorePage.name,
                index: firestorePage.index,
              });
            }
            lastSyncedPagesRef.current.add(firestorePage.id);
          } catch (err) {
            console.warn("[usePages] Could not apply remote page change:", err);
          }
        });
      });
      isSyncingRef.current = false;
    });

    return (): void => {
      unsubscribe();
    };
  }, [editor, userId, roomId, enabled]);

  return { isSyncing, error };
}

