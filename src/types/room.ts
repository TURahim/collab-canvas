/**
 * Room-related type definitions
 */

import type { Timestamp } from "firebase/firestore";

/**
 * Room member role
 */
export type RoomRole = "owner" | "editor" | "viewer";

/**
 * Room member information
 */
export interface RoomMember {
  userId: string;
  role: RoomRole;
  joinedAt: number;
}

/**
 * Room metadata stored in Firestore
 */
export interface RoomMetadata {
  id: string;
  name: string;
  owner: string; // User UID
  isPublic: boolean;
  members: Record<string, RoomMember>; // userId -> RoomMember
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

/**
 * Room settings that can be updated
 */
export interface RoomSettings {
  name: string;
  isPublic: boolean;
}

/**
 * Validation result
 */
export interface ValidationResult {
  valid: boolean;
  error?: string;
}
