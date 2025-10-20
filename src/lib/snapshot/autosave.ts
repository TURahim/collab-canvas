/**
 * Version History - Autosave Hook
 * 
 * Automatic snapshot creation with hash-based change detection
 */

import { useEffect, useRef } from "react";
import type { Editor } from "tldraw";
import { exportSnapshot, computeContentHash } from "./service";
import { uploadSnapshotToStorage, generateVersionId } from "./storage";
import { createVersionMetadata, pruneOldVersions } from "./firestore";
import { CURRENT_SCHEMA_VERSION } from "./types";

/**
 * Autosave hook - creates snapshots at intervals when content changes
 * 
 * @param editor - tldraw editor instance
 * @param roomId - Room ID
 * @param userId - User ID
 * @param enabled - Whether autosave is enabled
 * @param intervalMs - Interval in milliseconds (default: 30000 = 30 seconds)
 */
export function useAutosave(
  editor: Editor | null,
  roomId: string,
  userId: string,
  enabled: boolean = true,
  intervalMs: number = 30000
) {
  const lastContentHashRef = useRef<string | null>(null);
  const intervalIdRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!editor || !enabled || !roomId || !userId) {
      return;
    }

    // Function to check and save if needed
    const checkAndSave = async () => {
      try {
        // Export current snapshot
        const snapshot = await exportSnapshot(editor, roomId, userId);

        // Compute content hash
        const contentHash = await computeContentHash(snapshot);

        // Check if content has changed
        if (lastContentHashRef.current === null) {
          // First run - just store the hash
          lastContentHashRef.current = contentHash;
          console.log("[Autosave] Initial hash set:", contentHash.substring(0, 8));
          return;
        }

        if (contentHash === lastContentHashRef.current) {
          // No changes - skip save
          console.log("[Autosave] No changes detected, skipping save");
          return;
        }

        // Content has changed - create autosave
        console.log("[Autosave] Changes detected, creating snapshot...");

        const versionId = generateVersionId();
        const compressed = new TextEncoder().encode(JSON.stringify(snapshot));

        // Upload to Storage
        const storagePath = await uploadSnapshotToStorage(
          roomId,
          versionId,
          snapshot
        );

        // Compute checksum (simple for now)
        const checksum = contentHash.substring(0, 16);

        // Create metadata in Firestore
        await createVersionMetadata({
          id: versionId,
          roomId,
          createdAt: Date.now(),
          createdBy: userId,
          label: "Autosave",
          bytes: compressed.length,
          checksum,
          contentHash,
          schemaVersion: CURRENT_SCHEMA_VERSION,
          storagePath,
        });

        // Update last hash
        lastContentHashRef.current = contentHash;

        console.log("[Autosave] ✅ Snapshot created:", versionId);

        // Prune old versions
        await pruneOldVersions(roomId);
      } catch (error) {
        console.error("[Autosave] Error creating snapshot:", error);
      }
    };

    // Set up interval
    intervalIdRef.current = setInterval(checkAndSave, intervalMs);

    // Run once on mount after a delay
    const initialTimeout = setTimeout(checkAndSave, 5000);

    // Cleanup
    return () => {
      if (intervalIdRef.current) {
        clearInterval(intervalIdRef.current);
      }
      clearTimeout(initialTimeout);
    };
  }, [editor, roomId, userId, enabled, intervalMs]);
}

