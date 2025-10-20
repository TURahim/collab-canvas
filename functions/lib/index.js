"use strict";
/**
 * Cloud Functions for CollabCanvas
 *
 * Includes cleanup functions for version history
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.onVersionDelete = void 0;
const firestore_1 = require("firebase-functions/v2/firestore");
const admin = __importStar(require("firebase-admin"));
// Initialize Firebase Admin
admin.initializeApp();
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
        const bucket = admin.storage().bucket();
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