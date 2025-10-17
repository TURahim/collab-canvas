/**
 * Student-related type definitions for JellyBoard
 * Supports anonymous student sessions and classroom moderation
 */

import type { Cursor } from "./index";

/**
 * StudentPresence represents a student's presence in a room
 * Stored in Realtime DB at /rooms/{roomId}/students/{sessionId}
 */
export interface StudentPresence {
  sessionId: string; // Temporary session ID
  nickname: string; // Student's chosen nickname
  color: string; // Hex color for cursor/presence
  online: boolean; // Online status
  lastSeen: number; // Timestamp in milliseconds
  cursor: Cursor | null; // Current cursor position
  joinedAt: number; // When student joined
  expiresAt: number; // When session expires (joinedAt + 24h)
}

/**
 * StudentBan represents a temporary ban for a student
 * Stored in Realtime DB at /rooms/{roomId}/bans/{sessionId}
 */
export interface StudentBan {
  sessionId: string; // Session ID of banned student
  nickname: string; // Student's nickname (for display)
  bannedBy: string; // Teacher UID who issued the ban
  bannedAt: number; // Timestamp when ban was issued
  bannedUntil: number; // Timestamp when ban expires (5 minutes)
  reason?: string; // Optional reason for ban
}

/**
 * RoomSettings represents moderation settings for a room
 * Stored in Realtime DB at /rooms/{roomId}/settings
 */
export interface RoomSettings {
  frozen: boolean; // Whether canvas is frozen (students cannot edit)
  aiEnabled: boolean; // Whether AI assistant is enabled
  autoCleanup: boolean; // Whether to clear canvas on teacher logout
  lastModified: number; // Timestamp of last modification
  lastModifiedBy: string; // User ID who last modified settings
}

/**
 * ValidationResult for nickname and room code validation
 */
export interface ValidationResult {
  valid: boolean;
  error?: string;
}

