/**
 * Room Page - Individual collaborative canvas room
 */

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useRoomId } from "../../../hooks/useRoomId";
import { getRoomMetadata } from "../../../lib/roomManagement";
import { getRoomsPath } from "../../../lib/paths";
import type { RoomMetadata } from "../../../types/room";
import CollabCanvas from "../../../components/CollabCanvas";
import LoadingSpinner from "../../../components/LoadingSpinner";

/**
 * RoomPage - Display a specific collaborative room
 */
export default function RoomPage(): React.JSX.Element {
  const router = useRouter();
  const roomId = useRoomId();
  const [roomMetadata, setRoomMetadata] = useState<RoomMetadata | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /**
   * Load room metadata
   */
  useEffect(() => {
    const loadRoom = async () => {
      if (!roomId) {
        setError("Invalid room ID");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        const metadata = await getRoomMetadata(roomId);
        
        if (!metadata) {
          setError("Room not found");
          setLoading(false);
          return;
        }

        setRoomMetadata(metadata);
        setLoading(false);
      } catch (err) {
        console.error("[RoomPage] Error loading room:", err);
        setError("Failed to load room");
        setLoading(false);
      }
    };

    void loadRoom();
  }, [roomId]);

  // Handle invalid room ID
  if (!roomId) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-gray-50">
        <div className="max-w-md rounded-lg bg-white p-8 shadow-lg text-center">
          <div className="mb-4 inline-flex rounded-full bg-red-100 p-3">
            <svg className="h-8 w-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="mb-2 text-xl font-bold text-gray-900">Invalid Room</h2>
          <p className="mb-6 text-gray-600">
            This room URL is not valid.
          </p>
          <button
            onClick={() => router.push(getRoomsPath())}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            Go to Rooms
          </button>
        </div>
      </div>
    );
  }

  // Show loading state
  if (loading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-gray-50">
        <LoadingSpinner />
      </div>
    );
  }

  // Show error state
  if (error || !roomMetadata) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-gray-50">
        <div className="max-w-md rounded-lg bg-white p-8 shadow-lg text-center">
          <div className="mb-4 inline-flex rounded-full bg-yellow-100 p-3">
            <svg className="h-8 w-8 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="mb-2 text-xl font-bold text-gray-900">
            {error === "Room not found" ? "Room Not Found" : "Error Loading Room"}
          </h2>
          <p className="mb-6 text-gray-600">
            {error === "Room not found"
              ? "This room does not exist or you don't have access to it."
              : error || "Something went wrong while loading the room."}
          </p>
          <button
            onClick={() => router.push(getRoomsPath())}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            Go to Rooms
          </button>
        </div>
      </div>
    );
  }

  // Render the collaborative canvas
  return (
    <main className="h-screen">
      <CollabCanvas roomId={roomId} />
    </main>
  );
}

