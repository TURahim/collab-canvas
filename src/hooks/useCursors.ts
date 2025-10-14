/**
 * useCursors Hook
 * Manages real-time cursor tracking and synchronization
 */

import type { Editor } from "@tldraw/tldraw";
import { useEffect, useRef, useState } from "react";

import type { UserPresence } from "../types";
import {
  listenToUsers,
  markUserOffline,
  setupPresenceHeartbeat,
  updateCursorPosition,
  updateUserPresence,
} from "../lib/realtimeSync";
import { throttle } from "../lib/utils";

/**
 * Options for useCursors hook
 */
interface UseCursorsOptions {
  editor: Editor | null;
  userId: string | null;
  userName: string | null;
  userColor: string;
  enabled?: boolean;
}

/**
 * Return type for useCursors hook
 */
interface UseCursorsReturn {
  remoteCursors: Record<string, UserPresence>;
  isTracking: boolean;
  error: Error | null;
}

/**
 * tldraw pointer event info structure
 */
interface PointerEventInfo {
  point?: { x: number; y: number };
}

/**
 * Hook to track and sync cursor positions across users
 * - Tracks local mouse movement and sends to Realtime DB (30Hz)
 * - Listens to other users' cursor positions
 * - Manages presence (online/offline status)
 * - Auto-cleanup on unmount
 * 
 * @returns Object containing remoteCursors, isTracking status, and error state
 */
export function useCursors({
  editor,
  userId,
  userName,
  userColor,
  enabled = true,
}: UseCursorsOptions): UseCursorsReturn {
  const [remoteCursors, setRemoteCursors] = useState<Record<string, UserPresence>>({});
  const [isTracking, setIsTracking] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);
  
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const unsubscribeRef = useRef<(() => void) | null>(null);

  // Throttled cursor update function (30Hz = every 33ms)
  const throttledUpdateCursor = useRef(
    throttle((uid: string, cursor: { x: number; y: number }) => {
      updateCursorPosition(uid, cursor).catch((err) => {
        console.error("[useCursors] Failed to update cursor:", err);
      });
    }, 33)
  ).current;


  /**
   * Set up cursor tracking using tldraw's pointer event system
   * This doesn't interfere with tldraw's native UI
   */
  useEffect(() => {
    if (!editor || !userId || !userName || !enabled) {
      setIsTracking(false);
      return;
    }

    try {
      // Use tldraw's pointer event listener instead of DOM events
      // This integrates properly with tldraw's event system
      const handlePointerMove = (info: PointerEventInfo): void => {
        if (!info.point) {
          return;
        }
        
        try {
          // The point is already in page coordinates from tldraw
          throttledUpdateCursor(userId, info.point);
        } catch (err) {
          console.error("[useCursors] Error updating cursor:", err);
        }
      };

      // Listen to pointer move via tldraw's event system
      // Note: tldraw's event system types are complex, so we use type assertion
      editor.on("pointer-move" as "pointer-move", handlePointerMove);
      setIsTracking(true);

      // Cleanup
      return (): void => {
        editor.off("pointer-move" as "pointer-move", handlePointerMove);
        setIsTracking(false);
      };
    } catch (err) {
      console.error("[useCursors] Error setting up cursor tracking:", err);
      setError(err instanceof Error ? err : new Error("Failed to set up cursor tracking"));
      setIsTracking(false);
    }
  }, [editor, userId, userName, enabled, throttledUpdateCursor]);

  /**
   * Set up user presence and listen to other users' cursors
   * Implements performance optimization to prevent unnecessary re-renders
   */
  useEffect(() => {
    if (!userId || !userName || !enabled) {
      return;
    }

    let isMounted = true;

    const setupPresence = async (): Promise<void> => {
      try {
        // Update user presence in Realtime DB
        await updateUserPresence(userId, userName, userColor);

        // Set up heartbeat to maintain presence
        heartbeatIntervalRef.current = setupPresenceHeartbeat(userId);

        // Listen to all users' cursors
        if (isMounted) {
          unsubscribeRef.current = listenToUsers((users) => {
            if (!isMounted) {
              return;
            }
            
            // Filter out current user
            const { [userId]: _currentUser, ...remoteCursorsMap } = users;
            
            // Only update if cursors actually changed (prevent unnecessary re-renders)
            setRemoteCursors((prevCursors) => {
              const prevKeys = Object.keys(prevCursors).sort().join(",");
              const newKeys = Object.keys(remoteCursorsMap).sort().join(",");
              
              // Quick check: if user list changed, update
              if (prevKeys !== newKeys) {
                return remoteCursorsMap;
              }
              
              // Deep check: if cursor positions or user data changed, update
              for (const [uid, user] of Object.entries(remoteCursorsMap)) {
                const prevUser = prevCursors[uid];
                if (
                  !prevUser ||
                  prevUser.cursor?.x !== user.cursor?.x ||
                  prevUser.cursor?.y !== user.cursor?.y ||
                  prevUser.name !== user.name ||
                  prevUser.color !== user.color
                ) {
                  return remoteCursorsMap;
                }
              }
              
              // No changes, keep previous reference to avoid re-render
              return prevCursors;
            });
          });
        }
      } catch (err) {
        console.error("[useCursors] Error setting up presence:", err);
        if (isMounted) {
          setError(err instanceof Error ? err : new Error("Failed to set up presence"));
        }
      }
    };

    setupPresence();

    // Cleanup on unmount
    return (): void => {
      isMounted = false;

      // Clear heartbeat interval
      if (heartbeatIntervalRef.current !== null) {
        clearInterval(heartbeatIntervalRef.current);
        heartbeatIntervalRef.current = null;
      }

      // Unsubscribe from Realtime Database listeners
      if (unsubscribeRef.current !== null) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }

      // Mark user as offline on disconnect
      if (userId) {
        markUserOffline(userId).catch((err) => {
          console.error("[useCursors] Error marking user offline:", err);
        });
      }
    };
  }, [userId, userName, userColor, enabled]);

  return {
    remoteCursors,
    isTracking,
    error,
  };
}

