"use client";

import type { Editor } from "@tldraw/tldraw";
import { Tldraw } from "@tldraw/tldraw";
import "@tldraw/tldraw/tldraw.css";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { useAuth } from "../hooks/useAuth";
import { useCursors } from "../hooks/useCursors";
import { useShapes } from "../hooks/useShapes";
import { getRoomMetadata } from "../lib/roomManagement";
import { getRoomsPath } from "../lib/paths";
import { checkRoomBan, listenForRoomBan, markUserOffline } from "../lib/realtimeSync";
import type { RoomMetadata } from "../types/room";
import AuthModal from "./AuthModal";
import Cursors from "./Cursors";
import UserList from "./UserList";
import { FloatingChat } from "./FloatingChat";
import RoomHeader from "./RoomHeader";
import RoomSettings from "./RoomSettings";
import ExportDialog from "./ExportDialog";

/**
 * CollabCanvas - Main collaborative whiteboard component
 * 
 * Features:
 * - Firebase authentication with display name collection
 * - Real-time cursor tracking across users
 * - Real-time shape synchronization via Firestore
 * - Tldraw integration with license key support
 * - Error state handling for Firebase configuration
 * - Loading states during authentication
 * - Room-based collaboration with settings UI
 * 
 * @param roomId - Optional room ID for multi-room support (defaults to "default")
 * @returns Collaborative canvas interface
 */
interface CollabCanvasProps {
  roomId?: string;
}

export default function CollabCanvas({ roomId: propRoomId }: CollabCanvasProps = {}): React.JSX.Element {
  const router = useRouter();
  const { user, loading, error, setDisplayName } = useAuth();
  const [editor, setEditor] = useState<Editor | null>(null);
  const [roomId, setRoomId] = useState<string>(propRoomId || '');
  const [roomMetadata, setRoomMetadata] = useState<RoomMetadata | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showExportDialog, setShowExportDialog] = useState<boolean>(false);

  /**
   * Debug: Check if Tldraw component is remounting and verify license key
   */
  useEffect(() => {
    console.log('[CollabCanvas] Component mounted');
    const licenseKey = process.env.NEXT_PUBLIC_TLDRAW_LICENSE_KEY;
    if (licenseKey) {
      const masked = `${licenseKey.slice(0, 2)}***${licenseKey.slice(-4)}`;
      console.log('[CollabCanvas] License key detected:', {
        present: true,
        length: licenseKey.length,
        masked,
      });
    } else {
      console.warn('[CollabCanvas] License key missing. Set NEXT_PUBLIC_TLDRAW_LICENSE_KEY in env.');
    }
    return (): void => {
      console.log('[CollabCanvas] Component unmounted');
    };
  }, []);

  /**
   * Initialize room - load metadata and check for bans
   */
  useEffect(() => {
    const initializeRoom = async (): Promise<void> => {
      if (!user || !user.displayName) return;
      
      if (!propRoomId) {
        console.warn('[CollabCanvas] No roomId provided');
        return;
      }

      try {
        setRoomId(propRoomId);

        // Check if user is banned from this room
        const bannedUntil = await checkRoomBan(propRoomId, user.uid);
        if (bannedUntil) {
          const remainingTime = Math.ceil((bannedUntil - Date.now()) / 1000 / 60);
          alert(`You were removed from this room by the owner. You can rejoin in ${remainingTime} minute(s).`);
          router.push(getRoomsPath());
          return;
        }

        const metadata = await getRoomMetadata(propRoomId);
        setRoomMetadata(metadata);

        console.log('[CollabCanvas] Room initialized:', {
          roomId: propRoomId,
          roomName: metadata?.name,
          isOwner: metadata?.owner === user.uid,
        });
      } catch (err) {
        console.error('[CollabCanvas] Error initializing room:', err);
      }
    };

    void initializeRoom();
  }, [user, propRoomId, router]);

  /**
   * Listen for ban notifications - if this user gets kicked, clean up and redirect
   */
  useEffect(() => {
    if (!user || !roomId) {
      return;
    }

    const unsubscribe = listenForRoomBan(roomId, user.uid, async (bannedUntil) => {
      const remainingTime = Math.ceil((bannedUntil - Date.now()) / 1000 / 60);
      
      // Clean up own presence and cursor before redirecting
      await markUserOffline(user.uid);
      
      alert(`You were removed from this room by the owner. You cannot rejoin for ${remainingTime} minute(s).`);
      router.push(getRoomsPath());
    });

    return () => {
      unsubscribe();
    };
  }, [user, roomId, router]);

  /**
   * Editor mount handler - called when tldraw editor is initialized
   */
  const handleEditorMount = useCallback((editor: Editor): void => {
    setEditor(editor);
    
    // Log editor info for debugging
    console.log("[CollabCanvas] tldraw Editor mounted:", {
      currentPage: editor.getCurrentPage()?.id,
      shapeCount: editor.getCurrentPageShapes().length,
    });
  }, []);

  // Set up real-time cursor tracking
  const { remoteCursors, error: cursorError } = useCursors({
    editor,
    userId: user?.uid ?? null,
    userName: user?.displayName ?? null,
    userColor: user?.color ?? "#999999",
    enabled: !!user && !!user.displayName,
  });

  // Set up real-time shape synchronization
  const { isSyncing, error: shapeError } = useShapes({
    editor,
    userId: user?.uid ?? null,
    roomId,
    enabled: !!user && !!user.displayName && !!roomId,
  });

  // Log errors (moved to useEffect to prevent re-render spam)
  useEffect(() => {
    if (cursorError) {
      console.error("[CollabCanvas] Cursor tracking error:", cursorError);
    }
  }, [cursorError]);

  useEffect(() => {
    if (shapeError) {
      console.error("[CollabCanvas] Shape sync error:", shapeError);
    }
  }, [shapeError]);

  // Show error state if Firebase is not configured
  if (error && !user) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-gray-50">
        <div className="max-w-md rounded-2xl bg-white p-8 shadow-xl">
          <div className="mb-4 flex justify-center">
            <div className="rounded-full bg-red-100 p-3">
              <svg className="h-8 w-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
          </div>
          <h2 className="mb-2 text-center text-xl font-bold text-gray-900">Firebase Configuration Error</h2>
          <p className="mb-4 text-center text-gray-600">{error.message}</p>
          <div className="rounded-lg bg-blue-50 p-4 text-sm text-blue-900">
            <p className="font-semibold mb-2">To fix this:</p>
            <ol className="list-decimal list-inside space-y-1">
              <li>Create a Firebase project at console.firebase.google.com</li>
              <li>Enable Anonymous Authentication</li>
              <li>Create Realtime Database and Firestore</li>
              <li>Copy your config to <code className="bg-blue-100 px-1 rounded">.env.local</code></li>
              <li>Restart the dev server</li>
            </ol>
          </div>
        </div>
      </div>
    );
  }

  // Show loading state while checking auth
  if (loading && !user) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="mb-4 inline-block h-12 w-12 animate-spin rounded-full border-4 border-gray-300 border-t-blue-600"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Show AuthModal if user doesn't have a display name
  if (user && !user.displayName) {
    return (
      <AuthModal
        onSubmit={setDisplayName}
        loading={loading}
        error={error?.message}
      />
    );
  }

  // User is authenticated and has a display name - show canvas
  return (
    <div className="fixed inset-0">
      {/* Room Header - Added by PR #5 */}
      {roomMetadata && (
        <RoomHeader
          roomId={roomId}
          roomName={roomMetadata.name}
          isOwner={roomMetadata.owner === user?.uid}
          userCount={Object.keys(roomMetadata.members || {}).length}
          onSettingsClick={() => setShowSettings(true)}
          onExportClick={() => setShowExportDialog(true)}
          onExitClick={() => router.push(getRoomsPath())}
        />
      )}

      {/* Room Settings Modal - Added by PR #5 */}
      {showSettings && user && roomMetadata && (
        <RoomSettings
          roomId={roomId}
          currentUserId={user.uid}
          onClose={() => setShowSettings(false)}
          onRoomDeleted={() => router.push(getRoomsPath())}
          onRoomUpdated={(name) => {
            setRoomMetadata({ ...roomMetadata, name });
          }}
        />
      )}

      {/* Canvas container with top padding for header */}
      <div className={roomMetadata ? "fixed inset-0 pt-14 md:pt-16" : "fixed inset-0"}>
        <Tldraw onMount={handleEditorMount} licenseKey={process.env.NEXT_PUBLIC_TLDRAW_LICENSE_KEY} />
        <Cursors editor={editor} remoteCursors={remoteCursors} />
        <UserList
          currentUserId={user?.uid ?? null}
          currentUserName={user?.displayName ?? null}
          currentUserColor={user?.color ?? "#999999"}
          roomId={roomId}
          roomMetadata={roomMetadata}
        />
        
        {/* Status indicators */}
        {isSyncing && (
          <div className="fixed bottom-4 left-4 z-10 pointer-events-none">
            <div className="rounded-lg bg-blue-500 px-3 py-2 text-xs font-medium text-white shadow-lg">
              🔄 Syncing shapes...
            </div>
          </div>
        )}
        
        {/* AI Chat Widget */}
        <FloatingChat editor={editor} />
      </div>

      {/* Export Dialog - Added by PR #6 */}
      <ExportDialog
        isOpen={showExportDialog}
        onClose={() => setShowExportDialog(false)}
        editor={editor}
      />
    </div>
  );
}

