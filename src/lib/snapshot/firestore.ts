/**
 * Version History - Firestore Operations
 * 
 * CRUD operations for version metadata in Firestore
 */

import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  deleteDoc,
  query,
  where,
  orderBy,
  limit as firestoreLimit,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../firebase";
import type { VersionMetadata } from "./types";
import { MAX_VERSIONS_PER_ROOM } from "./types";

/**
 * Create version metadata document in Firestore
 * 
 * @param metadata - Version metadata to store
 */
export async function createVersionMetadata(
  metadata: VersionMetadata
): Promise<void> {
  const docRef = doc(
    db,
    `rooms/${metadata.roomId}/versions/${metadata.id}`
  );

  await setDoc(docRef, {
    ...metadata,
    createdAt: serverTimestamp(),
  });
}

/**
 * Get a single version metadata
 * 
 * @param roomId - Room ID
 * @param versionId - Version ID
 * @returns Version metadata or null
 */
export async function getVersionMetadata(
  roomId: string,
  versionId: string
): Promise<VersionMetadata | null> {
  const docRef = doc(db, `rooms/${roomId}/versions/${versionId}`);
  const docSnap = await getDoc(docRef);

  if (!docSnap.exists()) {
    return null;
  }

  return docSnap.data() as VersionMetadata;
}

/**
 * List versions for a room (most recent first)
 * 
 * @param roomId - Room ID
 * @param limit - Maximum number of versions to return
 * @returns Array of version metadata
 */
export async function listVersions(
  roomId: string,
  limit: number = MAX_VERSIONS_PER_ROOM
): Promise<VersionMetadata[]> {
  const versionsRef = collection(db, `rooms/${roomId}/versions`);
  const q = query(
    versionsRef,
    orderBy("createdAt", "desc"),
    firestoreLimit(limit)
  );

  const snapshot = await getDocs(q);
  const versions: VersionMetadata[] = [];

  snapshot.forEach((doc) => {
    versions.push(doc.data() as VersionMetadata);
  });

  return versions;
}

/**
 * Delete a version metadata document
 * 
 * This will trigger the Cloud Function to delete the Storage blob
 * 
 * @param roomId - Room ID
 * @param versionId - Version ID
 */
export async function deleteVersion(
  roomId: string,
  versionId: string
): Promise<void> {
  const docRef = doc(db, `rooms/${roomId}/versions/${versionId}`);
  await deleteDoc(docRef);
}

/**
 * Prune old versions, keeping only the most recent N
 * 
 * @param roomId - Room ID
 * @param keepLast - Number of versions to keep (default: MAX_VERSIONS_PER_ROOM)
 */
export async function pruneOldVersions(
  roomId: string,
  keepLast: number = MAX_VERSIONS_PER_ROOM
): Promise<void> {
  // Get all versions
  const versions = await listVersions(roomId, 1000); // Get all

  // If we have more than keepLast, delete the oldest ones
  if (versions.length > keepLast) {
    const toDelete = versions.slice(keepLast);

    // Delete each old version (this triggers Cloud Function for blob cleanup)
    await Promise.all(
      toDelete.map((version) => deleteVersion(roomId, version.id))
    );

    console.log(
      `[Snapshot] Pruned ${toDelete.length} old versions from room ${roomId}`
    );
  }
}

/**
 * Count versions for a room
 * 
 * @param roomId - Room ID
 * @returns Number of versions
 */
export async function countVersions(roomId: string): Promise<number> {
  const versionsRef = collection(db, `rooms/${roomId}/versions`);
  const snapshot = await getDocs(versionsRef);
  return snapshot.size;
}

