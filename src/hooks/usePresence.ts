/**
 * usePresence Hook
 * Manages user presence awareness - who's online and viewing the canvas
 */

import { useEffect, useState } from "react";

import type { UserPresence } from "../types";
import { getOnlineUsers, listenToUsers } from "../lib/realtimeSync";

/**
 * Options for usePresence hook
 */
interface UsePresenceOptions {
  currentUserId: string | null;
  roomId?: string;
  enabled?: boolean;
}

/**
 * Extended UserPresence with uid field
 */
interface UserPresenceWithId extends UserPresence {
  uid: string;
}

/**
 * Return type for usePresence hook
 */
interface UsePresenceReturn {
  onlineUsers: UserPresenceWithId[];
  currentUser: UserPresenceWithId | null;
  userCount: number;
  error: Error | null;
}

/**
 * Hook to track online users and their presence
 * - Listens to all users in the room
 * - Filters for online users only
 * - Separates current user from others
 * - Provides user count
 * - Includes uid field in returned user objects for kick functionality
 * 
 * @returns Object containing onlineUsers, currentUser, userCount, and error state
 */
export function usePresence({
  currentUserId,
  roomId,
  enabled = true,
}: UsePresenceOptions): UsePresenceReturn {
  const [usersMap, setUsersMap] = useState<Record<string, UserPresence>>({});
  const [error, setError] = useState<Error | null>(null);

  /**
   * Listen to users in real-time and maintain local state
   * If roomId is provided, only show users in that room (global presence otherwise)
   */
  useEffect(() => {
    if (!currentUserId || !enabled) {
      setUsersMap({});
      return;
    }

    // If no roomId, fall back to global presence (backward compatibility)
    if (!roomId) {
      let isMounted = true;

      const loadInitialUsers = async (): Promise<void> => {
        try {
          const users = await getOnlineUsers();
          if (isMounted) {
            setUsersMap(users);
          }
        } catch (err) {
          console.error("[usePresence] Error loading initial users:", err);
          if (isMounted) {
            setError(err instanceof Error ? err : new Error("Failed to load users"));
          }
        }
      };

      loadInitialUsers();

      const unsubscribe = listenToUsers((users) => {
        if (isMounted) {
          setUsersMap(users);
        }
      });

      return (): void => {
        isMounted = false;
        unsubscribe();
      };
    }

    // Room-scoped presence: just return current user for now
    // In the future, we'll implement proper room-scoped presence in RTDB
    console.log('[usePresence] Room-scoped mode - showing only current user for now');
    setUsersMap({});

    return () => {};
  }, [currentUserId, roomId, enabled]);

  // Convert map to array and add uid field
  const allUsers: UserPresenceWithId[] = Object.entries(usersMap).map(([userId, userData]) => ({
    ...userData,
    uid: userId,
  }));

  // Separate current user from others
  const currentUser = currentUserId
    ? allUsers.find((u) => u.uid === currentUserId) ?? null
    : null;

  const onlineUsers = allUsers.filter((u) => u.uid !== currentUserId);

  return {
    onlineUsers,
    currentUser,
    userCount: allUsers.length,
    error,
  };
}

