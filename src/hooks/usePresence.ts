/**
 * usePresence Hook
 * Manages user presence awareness - who's online and viewing the canvas
 */

import { useState, useEffect } from "react";
import { listenToUsers, getOnlineUsers } from "../lib/realtimeSync";
import { UserPresence } from "../types";

interface UsePresenceOptions {
  currentUserId: string | null;
  enabled?: boolean;
}

interface UsePresenceReturn {
  onlineUsers: UserPresence[];
  currentUser: UserPresence | null;
  userCount: number;
  error: Error | null;
}

/**
 * Hook to track online users and their presence
 * - Listens to all users in the room
 * - Filters for online users only
 * - Separates current user from others
 * - Provides user count
 */
export function usePresence({
  currentUserId,
  enabled = true,
}: UsePresenceOptions): UsePresenceReturn {
  const [usersMap, setUsersMap] = useState<Record<string, UserPresence>>({});
  const [error, setError] = useState<Error | null>(null);

  /**
   * Listen to users in real-time
   */
  useEffect(() => {
    if (!currentUserId || !enabled) {
      setUsersMap({});
      return;
    }

    let mounted = true;

    // Load initial users
    const loadInitialUsers = async () => {
      try {
        const users = await getOnlineUsers();
        if (mounted) {
          setUsersMap(users);
        }
      } catch (err) {
        console.error("Error loading initial users:", err);
        if (mounted) {
          setError(err as Error);
        }
      }
    };

    loadInitialUsers();

    // Listen to real-time updates
    const unsubscribe = listenToUsers((users) => {
      if (mounted) {
        setUsersMap(users);
      }
    });

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, [currentUserId, enabled]);

  // Convert map to array and separate current user
  const allUsers = Object.entries(usersMap).map(([userId, userData]) => ({
    ...userData,
    uid: userId,
  })) as (UserPresence & { uid: string })[];

  const currentUser = currentUserId
    ? (allUsers.find(u => u.uid === currentUserId) || null)
    : null;

  const onlineUsers = allUsers.filter(u => u.uid !== currentUserId);

  return {
    onlineUsers,
    currentUser,
    userCount: allUsers.length,
    error,
  };
}

