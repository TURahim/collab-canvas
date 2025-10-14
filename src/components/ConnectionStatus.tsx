/**
 * ConnectionStatus Component
 * Displays a toast notification when the user goes offline
 */

"use client";

import { useEffect, useState } from "react";

/**
 * ConnectionStatus - Monitors network connection and displays offline warning
 * 
 * Features:
 * - Listens to online/offline events
 * - Shows warning toast when offline
 * - Automatically hides when back online
 * - Non-intrusive positioning
 * 
 * @returns Connection status toast
 */
export default function ConnectionStatus(): React.JSX.Element {
  const [isOnline, setIsOnline] = useState<boolean>(true);

  useEffect(() => {
    // Update online status based on navigator
    const updateOnlineStatus = (): void => {
      setIsOnline(navigator.onLine);
    };

    // Set initial state
    updateOnlineStatus();

    // Listen for connection changes
    window.addEventListener("online", updateOnlineStatus);
    window.addEventListener("offline", updateOnlineStatus);

    return (): void => {
      window.removeEventListener("online", updateOnlineStatus);
      window.removeEventListener("offline", updateOnlineStatus);
    };
  }, []);

  return (
    <div className="fixed bottom-4 right-4 z-50 pointer-events-none">
      {!isOnline && (
        <div className="rounded-lg bg-yellow-500 px-3 py-2 text-xs font-medium text-white shadow-lg">
          ⚠️ Offline - changes will sync when back online
        </div>
      )}
    </div>
  );
}


