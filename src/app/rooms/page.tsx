/**
 * Rooms Page - List and manage collaborative rooms
 */

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { collectionGroup, getDocs, query, where, limit, doc, getDoc } from "firebase/firestore";
import { db } from "../../lib/firebase";
import { useAuth } from "../../hooks/useAuth";
import { createRoom } from "../../lib/roomManagement";
import { generateRoomId, getRoomPath } from "../../lib/paths";
import type { RoomMetadata } from "../../types/room";
import AuthModal from "../../components/AuthModal";
import LoadingSpinner from "../../components/LoadingSpinner";

/**
 * RoomsPage - Room list and creation interface
 */
export default function RoomsPage(): React.JSX.Element {
  const router = useRouter();
  const { user, loading: authLoading, error: authError, setDisplayName } = useAuth();
  
  const [rooms, setRooms] = useState<RoomMetadata[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newRoomName, setNewRoomName] = useState("");
  const [creating, setCreating] = useState(false);

  /**
   * Load rooms user has access to
   */
  useEffect(() => {
    const loadRooms = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        // Query for rooms using collectionGroup (queries across all metadata subcollections)
        // Room structure: rooms/{roomId}/metadata/info
        
        // Get rooms owned by user
        const ownedQuery = query(
          collectionGroup(db, "metadata"),
          where("owner", "==", user.uid),
          limit(50)
        );
        
        // Get public rooms
        const publicQuery = query(
          collectionGroup(db, "metadata"),
          where("isPublic", "==", true),
          limit(20)
        );
        
        const [ownedSnapshot, publicSnapshot] = await Promise.all([
          getDocs(ownedQuery).catch((err) => {
            console.error("[RoomsPage] Error fetching owned rooms:", err);
            return { docs: [] };
          }),
          getDocs(publicQuery).catch((err) => {
            console.error("[RoomsPage] Error fetching public rooms:", err);
            return { docs: [] };
          }),
        ]);

        console.log("[RoomsPage] Query results:", {
          ownedCount: ownedSnapshot.docs.length,
          publicCount: publicSnapshot.docs.length,
        });

        // Combine and deduplicate
        const roomMap = new Map<string, RoomMetadata>();
        
        [...ownedSnapshot.docs, ...publicSnapshot.docs].forEach((doc) => {
          console.log("[RoomsPage] Processing doc:", {
            id: doc.id,
            path: doc.ref.path,
            data: doc.data(),
          });
          const metadata = doc.data() as RoomMetadata;
          const metadataId = metadata.id || doc.id;
          if (!roomMap.has(metadataId)) {
            roomMap.set(metadataId, { ...metadata, id: metadataId });
          }
        });

        const roomsList = Array.from(roomMap.values());
        console.log("[RoomsPage] Final rooms list:", roomsList);
        setRooms(roomsList);
      } catch (err) {
        console.error("[RoomsPage] Error loading rooms:", err);
        setError("Failed to load rooms");
      } finally {
        setLoading(false);
      }
    };

    void loadRooms();
  }, [user]);

  /**
   * Create a new room
   */
  const handleCreateRoom = async () => {
    if (!user || !newRoomName.trim()) return;

    try {
      setCreating(true);
      setError(null);

      const roomId = generateRoomId();
      await createRoom(roomId, newRoomName.trim(), user.uid, false);

      // Navigate to new room
      router.push(getRoomPath(roomId));
    } catch (err) {
      console.error("[RoomsPage] Error creating room:", err);
      setError(err instanceof Error ? err.message : "Failed to create room");
      setCreating(false);
    }
  };

  /**
   * Navigate to a room
   */
  const handleRoomClick = (roomId: string) => {
    router.push(getRoomPath(roomId));
  };

  // Show error state if Firebase is not configured
  if (authError && !user) {
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
          <p className="mb-4 text-center text-gray-600">{authError.message}</p>
        </div>
      </div>
    );
  }

  // Show loading state while checking auth
  if (authLoading && !user) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-gray-50">
        <LoadingSpinner />
      </div>
    );
  }

  // Show AuthModal if user doesn't have a display name
  if (user && !user.displayName) {
    return (
      <AuthModal
        onSubmit={setDisplayName}
        loading={authLoading}
        error={authError?.message}
      />
    );
  }

  // Main rooms page UI
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="border-b border-gray-200 bg-white shadow-sm">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Your Rooms</h1>
              <p className="mt-1 text-sm text-gray-500">
                Create and join collaborative canvas rooms
              </p>
            </div>
            <button
              onClick={() => setShowCreateModal(true)}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              <span className="flex items-center gap-2">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                New Room
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Error message */}
        {error && (
          <div className="mb-4 rounded-lg bg-red-50 p-4 text-sm text-red-800">
            {error}
          </div>
        )}

        {/* Loading state */}
        {loading ? (
          <div className="flex justify-center py-12">
            <LoadingSpinner />
          </div>
        ) : rooms.length === 0 ? (
          /* Empty state */
          <div className="rounded-lg border-2 border-dashed border-gray-300 p-12 text-center">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">No rooms yet</h3>
            <p className="mt-1 text-sm text-gray-500">
              Get started by creating a new collaborative room.
            </p>
            <div className="mt-6">
              <button
                onClick={() => setShowCreateModal(true)}
                className="inline-flex items-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
              >
                <svg className="mr-2 h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Create Room
              </button>
            </div>
          </div>
        ) : (
          /* Rooms grid */
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {rooms.map((room) => (
              <button
                key={room.id}
                onClick={() => handleRoomClick(room.id)}
                className="flex flex-col rounded-lg border border-gray-200 bg-white p-6 text-left shadow-sm transition-all hover:border-blue-500 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900">{room.name}</h3>
                    <p className="mt-1 text-sm text-gray-500">
                      {Object.keys(room.members || {}).length} member{Object.keys(room.members || {}).length !== 1 ? 's' : ''}
                    </p>
                  </div>
                  <div className="ml-2">
                    {room.isPublic ? (
                      <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">
                        Public
                      </span>
                    ) : (
                      <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-800">
                        Private
                      </span>
                    )}
                  </div>
                </div>
                <div className="mt-4 flex items-center text-xs text-gray-500">
                  {room.owner === user?.uid ? (
                    <span className="flex items-center">
                      <svg className="mr-1 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Owner
                    </span>
                  ) : (
                    <span>Member</span>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Create Room Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <h2 className="mb-4 text-xl font-bold text-gray-900">Create New Room</h2>
            
            <div className="mb-4">
              <label htmlFor="roomName" className="block text-sm font-medium text-gray-700">
                Room Name
              </label>
              <input
                id="roomName"
                type="text"
                value={newRoomName}
                onChange={(e) => setNewRoomName(e.target.value)}
                placeholder="My Awesome Room"
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                maxLength={100}
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter" && newRoomName.trim()) {
                    void handleCreateRoom();
                  } else if (e.key === "Escape") {
                    setShowCreateModal(false);
                  }
                }}
              />
              <p className="mt-1 text-xs text-gray-500">
                {newRoomName.length}/100 characters
              </p>
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setNewRoomName("");
                  setError(null);
                }}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                disabled={creating}
              >
                Cancel
              </button>
              <button
                onClick={() => void handleCreateRoom()}
                disabled={!newRoomName.trim() || creating}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {creating ? "Creating..." : "Create Room"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

