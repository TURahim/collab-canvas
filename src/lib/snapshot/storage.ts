/**
 * Version History - Storage Operations
 * 
 * Upload and download compressed snapshots to/from Firebase Storage
 */

import { ref as storageRef, uploadBytes, getBytes } from "firebase/storage";
import { storage } from "../firebase";
import type { SnapshotData } from "./types";
import { compressSnapshot, decompressSnapshot } from "./service";

/**
 * Upload a snapshot to Firebase Storage
 * 
 * @param roomId - Room ID
 * @param versionId - Unique version ID
 * @param data - Snapshot data to upload
 * @returns Storage path
 */
export async function uploadSnapshotToStorage(
  roomId: string,
  versionId: string,
  data: SnapshotData
): Promise<string> {
  // Compress snapshot
  const compressed = compressSnapshot(data);

  // Create storage reference
  const storagePath = `rooms/${roomId}/versions/${versionId}.json.gz`;
  const fileRef = storageRef(storage, storagePath);

  // Upload compressed data
  await uploadBytes(fileRef, compressed, {
    contentType: "application/gzip",
    customMetadata: {
      roomId,
      versionId,
      schemaVersion: data.schemaVersion.toString(),
      createdBy: data.metadata.createdBy,
      timestamp: data.metadata.timestamp.toString(),
    },
  });

  return storagePath;
}

/**
 * Download a snapshot from Firebase Storage
 * 
 * @param storagePath - Full storage path
 * @returns Decompressed snapshot data
 */
export async function downloadSnapshotFromStorage(
  storagePath: string
): Promise<SnapshotData> {
  // Create storage reference
  const fileRef = storageRef(storage, storagePath);

  // Download compressed data
  const bytes = await getBytes(fileRef);

  // Decompress and return
  const data = decompressSnapshot(new Uint8Array(bytes));

  return data;
}

/**
 * Generate a unique version ID
 * 
 * @returns Version ID (timestamp + random suffix)
 */
export function generateVersionId(): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 10);
  return `${timestamp}-${random}`;
}

