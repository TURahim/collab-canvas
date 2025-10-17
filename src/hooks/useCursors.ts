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
  listenToRoomUsers,
  markUserOfflineInRoom,
  setupRoomPresenceHeartbeat,
  updateRoomCursorPosition,
  updateRoomPresence,
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
  roomId?: string;  // NEW: Optional room ID for room-scoped presence
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
 * Hook to track and sync cursor positions across users
 * - Tracks local mouse movement and sends to Realtime DB (30Hz)
 * - Listens to other users' cursor positions
 * - Manages presence (online/offline status)
 * - Auto-cleanup on unmount
 * - Supports both global and room-scoped presence
 * 
 * @returns Object containing remoteCursors, isTracking status, and error state
 */
export function useCursors({
  editor,
  userId,
  userName,
  userColor,
  roomId,
  enabled = true,
}: UseCursorsOptions): UseCursorsReturn {
  const [remoteCursors, setRemoteCursors] = useState<Record<string, UserPresence>>({});
  const [isTracking, setIsTracking] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);
  
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const unsubscribeRef = useRef<(() => void) | null>(null);

  // Throttled cursor update function (30Hz = every 33ms)
  // Uses room-scoped cursor position if roomId is available (dual-write for backward compatibility)
  const throttledUpdateCursor = useRef(
    throttle(
      (uid: string, cursor: { x: number; y: number }, currentRoomId?: string): void => {
        if (currentRoomId) {
          // Room-scoped cursor update
          updateRoomCursorPosition(currentRoomId, uid, cursor).catch((err) => {
            console.error("[useCursors] Failed to update room cursor:", err);
          });
          // Dual-write to global for backward compatibility
          updateCursorPosition(uid, cursor).catch((err) => {
            console.error("[useCursors] Failed to update global cursor:", err);
          });
        } else {
          // Global cursor update (fallback)
          updateCursorPosition(uid, cursor).catch((err) => {
            console.error("[useCursors] Failed to update cursor:", err);
          });
        }
      },
      33
    )
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
      // In tldraw v4, we need to use DOM events on the container
      // instead of tldraw's internal event system (which changed in v4)
      const container = editor.getContainer();
      
      const handlePointerMove = (e: PointerEvent): void => {
        try {
          // Convert screen coordinates to page coordinates using tldraw's methods
          const point = editor.screenToPage({ x: e.clientX, y: e.clientY });
          throttledUpdateCursor(userId, { x: point.x, y: point.y }, roomId);
        } catch (err) {
          console.error("[useCursors] Error updating cursor:", err);
        }
      };

      // Listen to pointer move events on the tldraw container
      container.addEventListener('pointermove', handlePointerMove);
      setIsTracking(true);

      // Cleanup
      return (): void => {
        container.removeEventListener('pointermove', handlePointerMove);
        setIsTracking(false);
      };
    } catch (err) {
      console.error("[useCursors] Error setting up cursor tracking:", err);
      setError(err instanceof Error ? err : new Error("Failed to set up cursor tracking"));
      setIsTracking(false);
    }
  }, [editor, userId, userName, enabled, roomId, throttledUpdateCursor]);

  /**
   * Set up user presence and listen to other users' cursors
   * Implements performance optimization to prevent unnecessary re-renders
   * Uses room-scoped presence if roomId is provided (dual-write for backward compatibility)
   */
  useEffect(() => {
    if (!userId || !userName || !enabled) {
      return;
    }

    let isMounted = true;

    const setupPresence = async (): Promise<void> => {
      try {
        if (roomId) {
          // Room-scoped presence (new system)
          console.log(`[useCursors] Setting up room-scoped presence for room ${roomId}`);
          await updateRoomPresence(roomId, userId, userName, userColor);

          // Dual-write to global for backward compatibility
          await updateUserPresence(userId, userName, userColor);

          // Set up room-scoped heartbeat
          heartbeatIntervalRef.current = setupRoomPresenceHeartbeat(roomId, userId);

          // Listen to users in this room only
          if (isMounted) {
            unsubscribeRef.current = listenToRoomUsers(roomId, (users) => {
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
        } else {
          // Global presence (fallback)
          console.log('[useCursors] Setting up global presence (no roomId)');
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

      // Mark user as offline in the appropriate scope
      if (roomId) {
        markUserOfflineInRoom(roomId, userId).catch(console.error);
      }
      // Note: We don't call markUserOffline() for global presence because:
      // 1. Firebase onDisconnect() handlers already handle this automatically
      // 2. If user is logging out, signOutUser() already marks them offline
      // 3. Calling it here would cause permission errors after sign-out
      // The onDisconnect() handlers ensure the user is marked offline
    };
  }, [userId, userName, userColor, roomId, enabled]);

  return {
    remoteCursors,
    isTracking,
    error,
  };
}

