"use client";

import { Tldraw, Editor } from "@tldraw/tldraw";
import "@tldraw/tldraw/tldraw.css";
import { useAuth } from "../hooks/useAuth";
import { useCursors } from "../hooks/useCursors";
import { useShapes } from "../hooks/useShapes";
import AuthModal from "./AuthModal";
import Cursors from "./Cursors";
import UserList from "./UserList";
import { useCallback, useState, useEffect } from "react";

export default function CollabCanvas() {
  const { user, loading, error, setDisplayName } = useAuth();
  const [editor, setEditor] = useState<Editor | null>(null);

  /**
   * Editor mount handler - called when tldraw editor is initialized
   */
  const handleEditorMount = useCallback((editor: Editor) => {
    setEditor(editor);
    
    // Log editor info for debugging
    console.log("tldraw Editor mounted:", {
      currentPage: editor.getCurrentPage()?.id,
      shapeCount: editor.getCurrentPageShapes().length,
    });
  }, []);

  // Set up real-time cursor tracking
  const { remoteCursors, isTracking, error: cursorError } = useCursors({
    editor,
    userId: user?.uid || null,
    userName: user?.displayName || null,
    userColor: user?.color || "#999999",
    enabled: !!user && !!user.displayName,
  });

  // Set up real-time shape synchronization
  const { isSyncing, error: shapeError } = useShapes({
    editor,
    userId: user?.uid || null,
    roomId: "default",
    enabled: !!user && !!user.displayName,
  });

  // Log errors only (moved to useEffect to prevent re-render spam)
  useEffect(() => {
    if (cursorError) {
      console.error("Cursor tracking error:", cursorError);
    }
  }, [cursorError]);

  useEffect(() => {
    if (shapeError) {
      console.error("Shape sync error:", shapeError);
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
      <Tldraw onMount={handleEditorMount} />
      <Cursors editor={editor} remoteCursors={remoteCursors} />
      <UserList
        currentUserId={user?.uid || null}
        currentUserName={user?.displayName || null}
        currentUserColor={user?.color || "#999999"}
      />
      
      {/* Status indicators */}
      <div className="fixed bottom-4 left-4 z-10 flex flex-col gap-2 pointer-events-none">
        {isTracking && (
          <div className="rounded-lg bg-green-500 px-3 py-2 text-xs font-medium text-white shadow-lg">
            🟢 Cursor tracking active
          </div>
        )}
        {isSyncing && (
          <div className="rounded-lg bg-blue-500 px-3 py-2 text-xs font-medium text-white shadow-lg">
            🔄 Syncing shapes...
          </div>
        )}
      </div>
    </div>
  );
}

