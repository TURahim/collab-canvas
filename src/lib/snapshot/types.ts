/**
 * Version History - Type Definitions
 * 
 * Defines the structure for snapshots, asset manifests, and version metadata
 */

import type { TLShape, TLPage, TLBinding } from "@tldraw/tldraw";

/**
 * Asset manifest entry - records all metadata for an asset at snapshot time
 */
export interface AssetManifest {
  id: string;
  url: string;
  hash?: string;
  mime: string;
  bytes: number;
  createdAt: number;
}

/**
 * Camera state - tracks viewport position and active page
 */
export interface CameraState {
  pageId: string;
  x: number;
  y: number;
  z: number;
}

/**
 * Complete snapshot data - full room state at a point in time
 */
export interface SnapshotData {
  schemaVersion: number;
  metadata: {
    appVersion: string;
    timestamp: number;
    createdBy: string;
  };
  pages: Record<string, TLPage>;
  pageOrder: string[];
  shapes: TLShape[];
  bindings: TLBinding[];
  assets: AssetManifest[];
  camera: CameraState;
}

/**
 * Version metadata - stored in Firestore to track snapshot info
 */
export interface VersionMetadata {
  id: string;
  roomId: string;
  createdAt: number;
  createdBy: string;
  label?: string;
  bytes: number;
  checksum: string;
  contentHash: string;
  schemaVersion: number;
  storagePath: string;
}

/**
 * Current schema version
 */
export const CURRENT_SCHEMA_VERSION = 1;

/**
 * App version (from package.json or hardcoded)
 */
export const APP_VERSION = "1.1.0";

/**
 * Maximum versions to keep per room
 */
export const MAX_VERSIONS_PER_ROOM = 20;

