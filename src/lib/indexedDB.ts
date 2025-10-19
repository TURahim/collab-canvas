/**
 * IndexedDB wrapper for storing pending asset uploads
 * Allows blobs to persist across page refresh for retry
 */

const DB_NAME = 'collab-canvas';
const DB_VERSION = 1;
const STORE_NAME = 'pending-assets';

/**
 * Pending asset blob stored in IndexedDB
 */
export interface PendingAssetBlob {
  assetId: string;
  roomId: string;
  blob: Blob;
  mimeType: string;
  size: number;
  retryCount: number;
  timestamp: number;
}

/**
 * Opens the IndexedDB database
 * Creates the pending-assets object store if it doesn't exist
 * 
 * @returns Promise resolving to IDBDatabase
 */
async function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB not supported'));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      reject(new Error('Failed to open IndexedDB'));
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      
      // Create object store if it doesn't exist
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'assetId' });
        console.log('[IndexedDB] Created pending-assets object store');
      }
    };
  });
}

/**
 * Saves a pending asset upload to IndexedDB
 * 
 * @param assetId - Asset ID
 * @param blob - Blob data to store
 * @param metadata - Asset metadata (roomId, mimeType, etc.)
 * @returns Promise that resolves when save is complete
 */
export async function savePendingAsset(
  assetId: string,
  blob: Blob,
  metadata: {
    roomId: string;
    mimeType: string;
    size: number;
    retryCount?: number;
  }
): Promise<void> {
  try {
    const db = await openDB();
    
    const pendingAsset: PendingAssetBlob = {
      assetId,
      blob,
      roomId: metadata.roomId,
      mimeType: metadata.mimeType,
      size: metadata.size,
      retryCount: metadata.retryCount || 0,
      timestamp: Date.now(),
    };

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.put(pendingAsset);

      request.onsuccess = () => {
        if (process.env.NODE_ENV === 'development') {
          console.log('[IndexedDB] Saved pending asset:', assetId);
        }
        resolve();
      };

      request.onerror = () => {
        reject(new Error('Failed to save pending asset to IndexedDB'));
      };
    });
  } catch (error) {
    console.error('[IndexedDB] Error saving pending asset:', error);
    // Gracefully fail if IndexedDB not available
    return;
  }
}

/**
 * Gets all pending assets from IndexedDB
 * 
 * @returns Promise resolving to array of pending assets
 */
export async function getPendingAssets(): Promise<PendingAssetBlob[]> {
  try {
    const db = await openDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.getAll();

      request.onsuccess = () => {
        const assets = request.result as PendingAssetBlob[];
        if (process.env.NODE_ENV === 'development') {
          console.log('[IndexedDB] Retrieved pending assets:', assets.length);
        }
        resolve(assets);
      };

      request.onerror = () => {
        reject(new Error('Failed to get pending assets from IndexedDB'));
      };
    });
  } catch (error) {
    console.error('[IndexedDB] Error getting pending assets:', error);
    // Return empty array if IndexedDB not available
    return [];
  }
}

/**
 * Removes a pending asset from IndexedDB (after successful upload)
 * 
 * @param assetId - Asset ID to remove
 * @returns Promise that resolves when removal is complete
 */
export async function removePendingAsset(assetId: string): Promise<void> {
  try {
    const db = await openDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.delete(assetId);

      request.onsuccess = () => {
        if (process.env.NODE_ENV === 'development') {
          console.log('[IndexedDB] Removed pending asset:', assetId);
        }
        resolve();
      };

      request.onerror = () => {
        reject(new Error('Failed to remove pending asset from IndexedDB'));
      };
    });
  } catch (error) {
    console.error('[IndexedDB] Error removing pending asset:', error);
    // Gracefully fail
    return;
  }
}

/**
 * Clears all pending assets from IndexedDB
 * Useful for cleanup or debugging
 * 
 * @returns Promise that resolves when clear is complete
 */
export async function clearPendingAssets(): Promise<void> {
  try {
    const db = await openDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.clear();

      request.onsuccess = () => {
        console.log('[IndexedDB] Cleared all pending assets');
        resolve();
      };

      request.onerror = () => {
        reject(new Error('Failed to clear pending assets from IndexedDB'));
      };
    });
  } catch (error) {
    console.error('[IndexedDB] Error clearing pending assets:', error);
    return;
  }
}

/**
 * Increments retry count for a pending asset
 * 
 * @param assetId - Asset ID
 * @returns Promise that resolves when update is complete
 */
export async function incrementRetryCount(assetId: string): Promise<void> {
  try {
    const db = await openDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const getRequest = store.get(assetId);

      getRequest.onsuccess = () => {
        const asset = getRequest.result as PendingAssetBlob | undefined;
        if (asset) {
          asset.retryCount += 1;
          const putRequest = store.put(asset);
          
          putRequest.onsuccess = () => resolve();
          putRequest.onerror = () => reject(new Error('Failed to increment retry count'));
        } else {
          resolve(); // Asset not found, nothing to increment
        }
      };

      getRequest.onerror = () => {
        reject(new Error('Failed to get asset for retry count update'));
      };
    });
  } catch (error) {
    console.error('[IndexedDB] Error incrementing retry count:', error);
    return;
  }
}

