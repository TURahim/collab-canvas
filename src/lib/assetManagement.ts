/**
 * Asset Management
 * Handles uploading and persisting image assets to Firebase Storage and Firestore
 */

import type { UploadMetadata } from "firebase/storage";
import {
  ref as storageRef,
  uploadBytes,
  getDownloadURL,
  deleteObject,
} from "firebase/storage";
import {
  doc,
  setDoc,
  getDoc,
  deleteDoc,
  collection,
  query,
  where,
  getDocs,
  serverTimestamp,
  onSnapshot,
} from "firebase/firestore";

import { db, storage } from "./firebase";
import type { AssetRecord } from "../types/asset";
import { isSupportedImageType, MAX_ASSET_SIZE } from "../types/asset";

/**
 * Uploads an image asset to Firebase Storage
 * 
 * @param file - File object to upload
 * @param roomId - Room ID where asset is being uploaded
 * @param assetId - Unique asset ID (from tldraw)
 * @param userId - User ID who is uploading
 * @returns Promise resolving to the download URL
 * @throws Error if upload fails or file type/size is invalid
 */
export async function uploadAssetToStorage(
  file: File,
  roomId: string,
  assetId: string,
  userId: string
): Promise<string> {
  // Validate file type
  if (!isSupportedImageType(file.type)) {
    throw new Error(
      `Unsupported file type: ${file.type}. Only PNG, JPEG, GIF, and WebP images are supported.`
    );
  }

  // Validate file size
  if (file.size > MAX_ASSET_SIZE) {
    const sizeMB = (file.size / 1024 / 1024).toFixed(2);
    const maxMB = (MAX_ASSET_SIZE / 1024 / 1024).toFixed(0);
    throw new Error(`File too large: ${sizeMB}MB. Maximum size is ${maxMB}MB.`);
  }

  try {
    // Get file extension
    const ext = file.name.split(".").pop() || "png";
    const fileName = `${assetId}.${ext}`;

    // Create storage reference
    const fileRef = storageRef(storage, `rooms/${roomId}/assets/${fileName}`);

    // Set upload metadata
    const metadata: UploadMetadata = {
      contentType: file.type,
      customMetadata: {
        uploadedBy: userId,
        roomId,
        assetId,
      },
    };

    // Upload file
    console.log("[AssetManagement] Uploading asset to Storage:", {
      assetId,
      fileName,
      size: file.size,
      type: file.type,
    });

    const snapshot = await uploadBytes(fileRef, file, metadata);
    const downloadURL = await getDownloadURL(snapshot.ref);

    console.log("[AssetManagement] ✅ Asset uploaded successfully:", assetId);
    return downloadURL;
  } catch (error) {
    console.error("[AssetManagement] ❌ Error uploading asset:", error);
    throw error;
  }
}

/**
 * Saves asset metadata to Firestore
 * 
 * @param roomId - Room ID where asset belongs
 * @param assetId - Unique asset ID
 * @param assetData - Asset metadata (without createdAt, will be added)
 * @returns Promise that resolves when save is complete
 */
export async function saveAssetRecord(
  roomId: string,
  assetId: string,
  assetData: Omit<AssetRecord, "createdAt">
): Promise<void> {
  try {
    const assetRef = doc(db, `rooms/${roomId}/assets`, assetId);
    
    await setDoc(assetRef, {
      ...assetData,
      createdAt: serverTimestamp(),
    });

    console.log("[AssetManagement] ✅ Asset record saved to Firestore:", assetId);
  } catch (error) {
    console.error("[AssetManagement] ❌ Error saving asset record:", error);
    throw error;
  }
}

/**
 * Gets asset metadata from Firestore
 * 
 * @param roomId - Room ID where asset belongs
 * @param assetId - Asset ID to retrieve
 * @returns Promise resolving to asset record or null if not found
 */
export async function getAssetRecord(
  roomId: string,
  assetId: string
): Promise<AssetRecord | null> {
  try {
    const assetRef = doc(db, `rooms/${roomId}/assets`, assetId);
    const assetDoc = await getDoc(assetRef);

    if (!assetDoc.exists()) {
      return null;
    }

    return assetDoc.data() as AssetRecord;
  } catch (error) {
    console.error("[AssetManagement] Error getting asset record:", error);
    return null;
  }
}

/**
 * Gets all assets in a room (one-time read)
 * 
 * @param roomId - Room ID
 * @returns Promise resolving to array of asset records
 */
export async function getAllAssets(roomId: string): Promise<AssetRecord[]> {
  try {
    const assetsRef = collection(db, `rooms/${roomId}/assets`);
    const snapshot = await getDocs(assetsRef);

    return snapshot.docs.map((doc) => doc.data() as AssetRecord);
  } catch (error) {
    console.error("[AssetManagement] Error getting all assets:", error);
    return [];
  }
}

/**
 * Listens to assets in a room in real-time
 * 
 * @param roomId - Room ID to listen to
 * @param callback - Called with array of assets whenever they change
 * @returns Unsubscribe function to stop listening
 */
export function listenToAssets(
  roomId: string,
  callback: (assets: AssetRecord[]) => void
): () => void {
  const assetsRef = collection(db, `rooms/${roomId}/assets`);
  const assetsQuery = query(assetsRef);

  const unsubscribe = onSnapshot(
    assetsQuery,
    (snapshot) => {
      const assets = snapshot.docs.map((doc) => doc.data() as AssetRecord);
      callback(assets);
    },
    (error) => {
      console.error("[AssetManagement] Error listening to assets:", error);
      callback([]);
    }
  );

  return unsubscribe;
}

/**
 * Deletes an asset from both Storage and Firestore
 * 
 * @param roomId - Room ID where asset belongs
 * @param assetId - Asset ID to delete
 * @param fileName - File name in Storage (e.g., "assetId.png")
 * @returns Promise that resolves when deletion is complete
 */
export async function deleteAsset(
  roomId: string,
  assetId: string,
  fileName: string
): Promise<void> {
  try {
    // Delete from Storage
    const fileRef = storageRef(storage, `rooms/${roomId}/assets/${fileName}`);
    await deleteObject(fileRef);

    // Delete from Firestore
    const assetRef = doc(db, `rooms/${roomId}/assets`, assetId);
    await deleteDoc(assetRef);

    console.log("[AssetManagement] ✅ Asset deleted:", assetId);
  } catch (error) {
    console.error("[AssetManagement] Error deleting asset:", error);
    throw error;
  }
}

/**
 * Processes a tldraw asset upload
 * Handles the full flow: upload to Storage + save record to Firestore
 * 
 * @param file - File to upload
 * @param assetId - tldraw asset ID
 * @param roomId - Room ID
 * @param userId - User ID uploading
 * @returns Promise resolving to complete AssetRecord with download URL
 */
export async function processAssetUpload(
  file: File,
  assetId: string,
  roomId: string,
  userId: string
): Promise<AssetRecord> {
  try {
    // Upload to Storage and get URL
    const downloadURL = await uploadAssetToStorage(file, roomId, assetId, userId);

    // Create asset record
    const assetRecord: Omit<AssetRecord, "createdAt"> = {
      id: assetId,
      type: "image",
      src: downloadURL,
      mimeType: file.type,
      size: file.size,
      uploadedBy: userId,
      roomId,
    };

    // Save to Firestore
    await saveAssetRecord(roomId, assetId, assetRecord);

    // Return complete record (createdAt will be set by server)
    return {
      ...assetRecord,
      createdAt: { seconds: Date.now() / 1000, nanoseconds: 0 } as any,
    };
  } catch (error) {
    console.error("[AssetManagement] Error processing asset upload:", error);
    throw error;
  }
}

