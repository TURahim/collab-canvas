/**
 * Hook to extract and validate room ID from Next.js URL parameters
 */

"use client";

import { useParams } from "next/navigation";
import { isValidRoomId } from "../lib/paths";

/**
 * Extract room ID from URL parameters
 * Returns the room ID if valid, null otherwise
 * 
 * Usage in /room/[roomId] route:
 * const roomId = useRoomId();
 * if (!roomId) return <ErrorPage />;
 * 
 * @returns Room ID string or null if invalid/missing
 */
export function useRoomId(): string | null {
  const params = useParams();
  
  // Extract roomId from params
  const roomId = params?.roomId;
  
  // Validate room ID
  if (typeof roomId === "string" && isValidRoomId(roomId)) {
    return roomId;
  }
  
  // Handle array case (shouldn't happen with [roomId] but be defensive)
  if (Array.isArray(roomId) && roomId.length > 0 && isValidRoomId(roomId[0])) {
    return roomId[0];
  }
  
  return null;
}

