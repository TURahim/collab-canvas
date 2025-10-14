/**
 * UserList Component
 * Displays all online users with their colors and presence status
 */

"use client";

import { usePresence } from "../hooks/usePresence";
import { useAuth } from "../hooks/useAuth";

/**
 * Props for UserList component
 */
interface UserListProps {
  currentUserId: string | null;
  currentUserName: string | null;
  currentUserColor: string;
}

/**
 * UserList - Sidebar displaying all online users
 * 
 * Features:
 * - Current user highlighted at top with "You" badge
 * - Other users listed below with online indicators
 * - User count badge in header
 * - Color indicators for each user
 * - Empty state when no other users online
 * 
 * @param props - Component props
 * @returns User list sidebar
 */
export default function UserList({
  currentUserId,
  currentUserName,
  currentUserColor,
}: UserListProps): React.JSX.Element | null {
  const { signOutUser } = useAuth();
  const { onlineUsers, currentUser, userCount, error } = usePresence({
    currentUserId,
    enabled: !!currentUserId,
  });

  if (error) {
    console.error("[UserList] Presence error:", error);
  }

  if (!currentUserId || !currentUserName) {
    return null;
  }

  const handleLogout = async (): Promise<void> => {
    try {
      await signOutUser();
    } catch (err) {
      console.error("[UserList] Logout failed:", err);
      // Error is already handled in useAuth, just log here
    }
  };

  return (
    <div className="fixed left-4 top-20 z-[100] w-64 pointer-events-auto">
      <div className="rounded-lg bg-white shadow-xl border border-gray-200">
        {/* Header */}
        <div className="border-b border-gray-200 bg-gray-50 px-4 py-3 rounded-t-lg">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-900">
              Online Users
            </h3>
            <span className="inline-flex items-center justify-center rounded-full bg-blue-500 px-2 py-1 text-xs font-bold text-white">
              {userCount}
            </span>
          </div>
        </div>

        {/* User List */}
        <div className="max-h-96 overflow-y-auto p-2">
          {/* Current User */}
          <div className="mb-2 rounded-lg bg-blue-50 border border-blue-200 p-3">
            <div className="flex items-center gap-3">
              {/* Color indicator */}
              <div
                className="h-8 w-8 flex-shrink-0 rounded-full border-2 border-white shadow-md"
                style={{ backgroundColor: currentUserColor }}
              />
              
              {/* User info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-gray-900 truncate">
                    {currentUserName}
                  </p>
                  <span className="inline-flex items-center rounded-full bg-blue-500 px-2 py-0.5 text-xs font-medium text-white">
                    You
                  </span>
                  <button
                    onClick={() => void handleLogout()}
                    className="ml-auto rounded-md border border-blue-200 px-2 py-0.5 text-[10px] font-semibold text-blue-700 hover:bg-blue-50 transition-colors"
                    aria-label="Logout"
                  >
                    Logout
                  </button>
                </div>
                <div className="flex items-center gap-1 mt-0.5">
                  <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                  <span className="text-xs text-gray-600">Online</span>
                </div>
              </div>
            </div>
          </div>

          {/* Other Users */}
          {onlineUsers.length > 0 ? (
            <div className="space-y-1">
              {onlineUsers.map((user) => (
                <div
                  key={user.name}
                  className="rounded-lg border border-gray-200 bg-white p-3 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    {/* Color indicator */}
                    <div
                      className="h-8 w-8 flex-shrink-0 rounded-full border-2 border-gray-200 shadow-sm"
                      style={{ backgroundColor: user.color }}
                    />
                    
                    {/* User info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {user.name}
                      </p>
                      <div className="flex items-center gap-1 mt-0.5">
                        <div className="h-2 w-2 rounded-full bg-green-500" />
                        <span className="text-xs text-gray-500">Online</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-8 text-center">
              <svg
                className="mx-auto h-12 w-12 text-gray-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
                />
              </svg>
              <p className="mt-2 text-sm text-gray-500">
                No other users online
              </p>
              <p className="mt-1 text-xs text-gray-400">
                Share the link to collaborate!
              </p>
            </div>
          )}
        </div>

        {/* Footer hint */}
        {onlineUsers.length > 0 && (
          <div className="border-t border-gray-200 bg-gray-50 px-4 py-2 rounded-b-lg">
            <p className="text-xs text-gray-500 text-center">
              {onlineUsers.length} other {onlineUsers.length === 1 ? "user" : "users"} online
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

