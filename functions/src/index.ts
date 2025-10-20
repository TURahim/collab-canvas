/**
 * Cloud Functions for CollabCanvas
 * 
 * Includes cleanup functions for version history
 */

import {onDocumentDeleted} from "firebase-functions/v2/firestore";
import {initializeApp} from "firebase-admin/app";
import {getStorage} from "firebase-admin/storage";

// Initialize Firebase Admin
initializeApp();

/**
 * Cloud Function: Delete version snapshot blob when Firestore doc is deleted
 * 
 * Triggered when a version metadata document is deleted from Firestore.
 * Automatically deletes the corresponding compressed snapshot file from Storage.
 */
export const onVersionDelete = onDocumentDeleted(
  "rooms/{roomId}/versions/{versionId}",
  async (event) => {
    const { roomId, versionId } = event.params;
    const data = event.data?.data();

    if (!data?.storagePath) {
      console.log(
        `[onVersionDelete] No storagePath found for version ${versionId} in room ${roomId}`
      );
      return;
    }

    try {
      const bucket = getStorage().bucket();
      const file = bucket.file(data.storagePath);

      // Check if file exists before deleting
      const [exists] = await file.exists();

      if (exists) {
        await file.delete();
        console.log(
          `[onVersionDelete] ✅ Deleted version blob: ${data.storagePath}`
        );
      } else {
        console.log(
          `[onVersionDelete] ⚠️ Blob not found (may have been deleted manually): ${data.storagePath}`
        );
      }
    } catch (error) {
      console.error(
        `[onVersionDelete] ❌ Failed to delete version blob:`,
        data.storagePath,
        error
      );
      // Don't throw - we don't want to fail the Firestore delete
    }
  }
);

