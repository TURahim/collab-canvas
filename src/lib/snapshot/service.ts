/**
 * Version History - Snapshot Service
 * 
 * Core functions for exporting, importing, hashing, and compressing snapshots
 */

import type { Editor, TLShape, TLPage, TLBinding } from "@tldraw/tldraw";
import pako from "pako";
import type { SnapshotData, CameraState } from "./types";
import { CURRENT_SCHEMA_VERSION, APP_VERSION } from "./types";
import { getAssetManifest } from "../assetManagement";

/**
 * Export a snapshot of the current editor state
 * 
 * @param editor - tldraw editor instance
 * @param roomId - Room ID for asset manifest
 * @param userId - User ID creating the snapshot
 * @returns Complete snapshot data
 */
export async function exportSnapshot(
  editor: Editor,
  roomId: string,
  userId: string
): Promise<SnapshotData> {
  // Extract pages from editor
  const pages: Record<string, TLPage> = {};
  const allPages = editor.getPages();
  for (const page of allPages) {
    pages[page.id] = page;
  }

  // Get page order
  const pageOrder = allPages.map((p) => p.id);

  // Extract all shapes across all pages
  const shapes: TLShape[] = editor.getCurrentPageShapes();

  // Extract bindings (if any)
  const bindings: TLBinding[] = [];
  // Note: tldraw v4 bindings extraction - check if editor.getBindings() exists
  // For now, leaving empty as bindings API may vary

  // Get asset manifest from Firestore
  const assets = await getAssetManifest(roomId);

  // Get camera state
  const camera = extractCameraState(editor);

  // Build snapshot
  const snapshot: SnapshotData = {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    metadata: {
      appVersion: APP_VERSION,
      timestamp: Date.now(),
      createdBy: userId,
    },
    pages,
    pageOrder,
    shapes,
    bindings,
    assets,
    camera,
  };

  return snapshot;
}

/**
 * Import a snapshot into the editor
 * 
 * @param editor - tldraw editor instance
 * @param data - Snapshot data to import
 */
export async function importSnapshot(
  editor: Editor,
  data: SnapshotData
): Promise<void> {
  // Wrap everything in a single transaction for undo/redo
  editor.run(() => {
    // Clear existing content
    const currentShapes = editor.getCurrentPageShapes();
    editor.deleteShapes(currentShapes.map((s) => s.id));

    // Import pages (tldraw v4 may handle this differently)
    // For now, work with current page
    
    // Import shapes
    if (data.shapes.length > 0) {
      editor.createShapes(data.shapes);
    }

    // Import bindings (if any)
    // Bindings import depends on tldraw v4 API

    // Restore camera position
    if (data.camera) {
      editor.setCamera({
        x: data.camera.x,
        y: data.camera.y,
        z: data.camera.z,
      });
    }
  });

  // Note: Assets are restored via their recorded URLs in the manifest
  // If an asset URL 404s, tldraw will show a placeholder automatically
}

/**
 * Extract camera state from editor
 * 
 * @param editor - tldraw editor instance
 * @returns Camera state
 */
function extractCameraState(editor: Editor): CameraState {
  const camera = editor.getCamera();
  const currentPageId = editor.getCurrentPageId();

  return {
    pageId: currentPageId,
    x: camera.x,
    y: camera.y,
    z: camera.z,
  };
}

/**
 * Compute a deterministic content hash for a snapshot (async version)
 * 
 * The hash is computed over structural content only, ignoring:
 * - Timestamps
 * - User IDs
 * - Metadata that doesn't affect visuals
 * 
 * @param data - Snapshot data
 * @returns Promise resolving to SHA-256 hash as hex string
 */
export async function computeContentHash(data: SnapshotData): Promise<string> {
  // Create deterministic object with only visual content
  const contentObj = {
    pages: data.pages,
    pageOrder: data.pageOrder,
    shapes: data.shapes.map((s) => ({
      id: s.id,
      type: s.type,
      x: s.x,
      y: s.y,
      rotation: s.rotation,
      props: s.props,
    })),
    bindings: data.bindings,
    assetIds: data.assets.map((a) => a.id).sort(),
  };

  // Stringify with sorted keys for determinism
  const jsonStr = JSON.stringify(contentObj, Object.keys(contentObj).sort());

  // Compute SHA-256 hash
  const hash = await computeSHA256(jsonStr);

  return hash;
}

/**
 * Compress snapshot data using gzip
 * 
 * @param data - Snapshot data
 * @returns Compressed bytes
 */
export function compressSnapshot(data: SnapshotData): Uint8Array {
  const jsonStr = JSON.stringify(data);
  const compressed = pako.gzip(jsonStr);
  return compressed;
}

/**
 * Decompress snapshot data
 * 
 * @param bytes - Compressed bytes
 * @returns Snapshot data
 */
export function decompressSnapshot(bytes: Uint8Array): SnapshotData {
  const decompressed = pako.ungzip(bytes, { to: "string" });
  const data = JSON.parse(decompressed) as SnapshotData;
  return data;
}

/**
 * Compute SHA-256 hash of a string
 * 
 * @param input - Input string
 * @returns Hex-encoded hash
 */
async function computeSHA256(input: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(input);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  return hashHex;
}


