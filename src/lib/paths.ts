/**
 * Path utilities and validation for multi-room routing
 */

/**
 * Valid room ID pattern: alphanumeric, hyphens, underscores, 1-64 chars
 */
const ROOM_ID_PATTERN = /^[a-zA-Z0-9_-]{1,64}$/;

/**
 * Validates a room ID
 */
export function isValidRoomId(roomId: string): boolean {
  return ROOM_ID_PATTERN.test(roomId);
}

/**
 * Generates a unique room ID
 */
export function generateRoomId(): string {
  // Use timestamp + random string for uniqueness
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 10);
  return `${timestamp}-${random}`;
}

/**
 * Gets the room list path
 */
export function getRoomsPath(): string {
  return "/rooms";
}

/**
 * Gets the path for a specific room
 */
export function getRoomPath(roomId: string): string {
  if (!isValidRoomId(roomId)) {
    throw new Error(`Invalid room ID: ${roomId}`);
  }
  return `/room/${roomId}`;
}

/**
 * Gets the home path
 */
export function getHomePath(): string {
  return "/";
}

/**
 * Extracts room ID from a room path
 * Returns null if path doesn't match room pattern
 */
export function extractRoomIdFromPath(path: string): string | null {
  const match = path.match(/^\/room\/([a-zA-Z0-9_-]+)/);
  return match ? match[1] : null;
}

/**
 * Normalizes a room name for use as an ID
 * Converts to lowercase, replaces spaces with hyphens, removes invalid chars
 */
export function normalizeRoomName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9_-]/g, "")
    .substring(0, 64);
}

