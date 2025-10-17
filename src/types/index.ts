/**
 * CollabCanvas - TypeScript Type Definitions
 * Defines core types for User, Cursor, and Shape entities
 */

import type { Timestamp } from "firebase/firestore";

/**
 * User represents an authenticated user in the system
 */
export interface User {
  uid: string;
  displayName: string | null;
  color: string; // Hex color for cursor/presence indicator
  online: boolean;
  lastSeen: number; // Timestamp in milliseconds
}

/**
 * Cursor represents a user's cursor position on the canvas
 */
export interface Cursor {
  x: number; // Page coordinate X
  y: number; // Page coordinate Y
  lastSeen: number; // Timestamp in milliseconds
}

/**
 * UserPresence combines user info with cursor position
 * Used for real-time cursor tracking in Realtime Database
 */
export interface UserPresence {
  name: string;
  color: string;
  cursor: Cursor | null;
  online: boolean;
  lastSeen: number;
}

/**
 * Shape represents a tldraw shape stored in Firestore
 * This is the serialized format for persistence
 */
export interface Shape {
  id: string;
  type: string; // "rectangle" | "ellipse" | "arrow" | "text" | etc
  x: number;
  y: number;
  rotation?: number;
  props?: Record<string, unknown>; // tldraw shape properties
  createdBy: string; // User UID
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

/**
 * TldrawShape represents the shape format used by tldraw internally
 * This is what we convert to/from when syncing with Firebase
 */
export interface TldrawShape {
  id: string;
  type: string;
  x: number;
  y: number;
  rotation?: number;
  props?: Record<string, unknown>;
  [key: string]: unknown; // tldraw may have additional properties
}

/**
 * Point represents a 2D coordinate
 */
export interface Point {
  x: number;
  y: number;
}

/**
 * AuthState represents the current authentication state
 */
export interface AuthState {
  user: User | null;
  loading: boolean;
  error: Error | null;
}

/**
 * DragUpdate represents real-time drag state for a shape
 * Used to sync drag operations at 60Hz for smooth collaboration
 */
export interface DragUpdate {
  shapeId: string;
  x: number;
  y: number;
  userId: string;
  lastUpdate: number; // Timestamp in milliseconds
}

