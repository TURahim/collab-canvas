"use strict";
/**
 * Cloud Functions for CollabCanvas
 *
 * Includes cleanup functions for version history
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.onVersionDelete = void 0;
const firestore_1 = require("firebase-functions/v2/firestore");
const app_1 = require("firebase-admin/app");
const storage_1 = require("firebase-admin/storage");
// Initialize Firebase Admin
(0, app_1.initializeApp)();
/**
 * Cloud Function: Delete version snapshot blob when Firestore doc is deleted
 *
 * Triggered when a version metadata document is deleted from Firestore.
 * Automatically deletes the corresponding compressed snapshot file from Storage.
 */
exports.onVersionDelete = (0, firestore_1.onDocumentDeleted)("rooms/{roomId}/versions/{versionId}", async (event) => {
    var _a;
    const { roomId, versionId } = event.params;
    const data = (_a = event.data) === null || _a === void 0 ? void 0 : _a.data();
    if (!(data === null || data === void 0 ? void 0 : data.storagePath)) {
        console.log(`[onVersionDelete] No storagePath found for version ${versionId} in room ${roomId}`);
        return;
    }
    try {
        const bucket = (0, storage_1.getStorage)().bucket();
        const file = bucket.file(data.storagePath);
        // Check if file exists before deleting
        const [exists] = await file.exists();
        if (exists) {
            await file.delete();
            console.log(`[onVersionDelete] ✅ Deleted version blob: ${data.storagePath}`);
        }
        else {
            console.log(`[onVersionDelete] ⚠️ Blob not found (may have been deleted manually): ${data.storagePath}`);
        }
    }
    catch (error) {
        console.error(`[onVersionDelete] ❌ Failed to delete version blob:`, data.storagePath, error);
        // Don't throw - we don't want to fail the Firestore delete
    }
});
//# sourceMappingURL=index.js.map