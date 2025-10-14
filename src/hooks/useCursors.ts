/**
 * useCursors Hook
 * Manages real-time cursor tracking and synchronization
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { Editor } from "@tldraw/tldraw";
import { UserPresence } from "../types";
import {
  updateCursorPosition,
  updateUserPresence,
  listenToUsers,
  markUserOffline,
  setupPresenceHeartbeat,
} from "../lib/realtimeSync";
import { screenToPage } from "../lib/tldrawHelpers";
import { throttle } from "../lib/tldrawHelpers";

interface UseCursorsOptions {
  editor: Editor | null;
  userId: string | null;
  userName: string | null;
  userColor: string;
  enabled?: boolean;
}

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
 */
export function useCursors({
  editor,
  userId,
  userName,
  userColor,
  enabled = true,
}: UseCursorsOptions): UseCursorsReturn {
  const [remoteCursors, setRemoteCursors] = useState<Record<string, UserPresence>>({});
  const [isTracking, setIsTracking] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const unsubscribeRef = useRef<(() => void) | null>(null);

  // Throttled cursor update function (30Hz = every 33ms)
  const throttledUpdateCursor = useRef(
    throttle((...args: unknown[]) => {
      const [userId, cursor] = args as [string, { x: number; y: number }];
      updateCursorPosition(userId, cursor).catch((err) => {
        console.error("Failed to update cursor:", err);
      });
    }, 33)
  ).current as (userId: string, cursor: { x: number; y: number }) => void;


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
      const handlePointer = (info: any) => {
        if (!info.point) return;
        
        try {
          // The point is already in page coordinates from tldraw
          throttledUpdateCursor(userId, info.point);
        } catch (err) {
          console.error("Error updating cursor:", err);
        }
      };

      // Listen to pointer move via tldraw's event system
      editor.on("pointer-move" as any, handlePointer);
      setIsTracking(true);

      // Cleanup
      return () => {
        editor.off("pointer-move" as any, handlePointer);
        setIsTracking(false);
      };
    } catch (err) {
      console.error("Error setting up cursor tracking:", err);
      setError(err as Error);
      setIsTracking(false);
    }
  }, [editor, userId, userName, enabled, throttledUpdateCursor]);

  /**
   * Set up user presence and listen to other users
   */
  useEffect(() => {
    if (!userId || !userName || !enabled) {
      return;
    }

    let mounted = true;

    const setupPresence = async () => {
      try {
        // Update user presence in Realtime DB
        await updateUserPresence(userId, userName, userColor);

        // Set up heartbeat to maintain presence
        heartbeatIntervalRef.current = setupPresenceHeartbeat(userId);

        // Listen to all users' cursors
        if (mounted) {
          unsubscribeRef.current = listenToUsers((users) => {
            if (!mounted) return;
            
            // Filter out current user
            const { [userId]: _currentUser, ...others } = users;
            setRemoteCursors(others);
          });
        }
      } catch (err) {
        console.error("Error setting up presence:", err);
        if (mounted) {
          setError(err as Error);
        }
      }
    };

    setupPresence();

    // Cleanup on unmount
    return () => {
      mounted = false;

      // Clear heartbeat
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
        heartbeatIntervalRef.current = null;
      }

      // Unsubscribe from listeners
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }

      // Mark user as offline
      if (userId) {
        markUserOffline(userId).catch((err) => {
          console.error("Error marking user offline:", err);
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

