/**
 * Asset-related type definitions
 * Defines types for persistent image assets stored in Firebase Storage
 */

import type { Timestamp } from "firebase/firestore";

/**
 * Asset record stored in Firestore
 * References the actual file in Firebase Storage
 */
export interface AssetRecord {
  id: string;
  type: "image";
  src: string; // Firebase Storage download URL
  mimeType: string; // 'image/png', 'image/jpeg', 'image/gif', 'image/webp'
  size: number; // File size in bytes
  uploadedBy: string; // User ID who uploaded
  roomId: string; // Room where asset was uploaded
  createdAt: Timestamp;
}

/**
 * Supported raster image MIME types
 */
export const SUPPORTED_IMAGE_TYPES = [
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/gif",
  "image/webp",
] as const;

/**
 * Maximum asset file size (10MB)
 */
export const MAX_ASSET_SIZE = 10 * 1024 * 1024;

/**
 * Type guard to check if a MIME type is a supported image
 */
export function isSupportedImageType(mimeType: string): boolean {
  return SUPPORTED_IMAGE_TYPES.includes(mimeType as typeof SUPPORTED_IMAGE_TYPES[number]);
}

