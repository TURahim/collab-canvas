/**
 * Version History Modal
 * 
 * UI for managing canvas snapshots - create, list, restore, and delete versions
 */

"use client";

import { useState, useEffect } from "react";
import type { Editor } from "tldraw";
import { exportSnapshot, computeContentHash } from "../lib/snapshot/service";
import { uploadSnapshotToStorage, generateVersionId } from "../lib/snapshot/storage";
import {
  listVersions,
  createVersionMetadata,
  deleteVersion,
  pruneOldVersions,
} from "../lib/snapshot/firestore";
import { downloadSnapshotFromStorage } from "../lib/snapshot/storage";
import { importSnapshot } from "../lib/snapshot/service";
import { pauseRealtime, resumeRealtime } from "../lib/realtimeSync";
import type { VersionMetadata } from "../lib/snapshot/types";
import { CURRENT_SCHEMA_VERSION } from "../lib/snapshot/types";
import Toast from "./Toast";
import ConfirmDialog from "./ConfirmDialog";

export interface VersionHistoryModalProps {
  roomId: string;
  editor: Editor | null;
  userId: string;
  isOwner: boolean;
  onClose: () => void;
}

export default function VersionHistoryModal({
  roomId,
  editor,
  userId,
  isOwner,
  onClose,
}: VersionHistoryModalProps): React.JSX.Element {
  const [versions, setVersions] = useState<VersionMetadata[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [showSaveInput, setShowSaveInput] = useState(false);
  const [saveLabel, setSaveLabel] = useState("");
  const [selectedVersion, setSelectedVersion] = useState<string | null>(null);
  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error" | "info" | "warning";
  } | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{
    title: string;
    message: string;
    confirmText: string;
    confirmStyle: "danger" | "primary";
    onConfirm: () => void;
  } | null>(null);

  // Load versions
  useEffect(() => {
    loadVersions();
  }, [roomId]);

  const loadVersions = async () => {
    try {
      setLoading(true);
      const versionList = await listVersions(roomId);
      setVersions(versionList);
    } catch (error) {
      console.error("[VersionHistory] Error loading versions:", error);
      
      // Check if it's a permission error
      if (error instanceof Error && error.message?.includes("permission")) {
        setToast({
          message: "You don't have permission to view version history for this room. Only room owners can access versions.",
          type: "error",
        });
      } else {
        setToast({
          message: "Failed to load version history. Please try again.",
          type: "error",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  // Create manual snapshot
  const handleSaveVersion = async () => {
    if (!editor || !userId) return;

    // Check permissions
    if (!isOwner) {
      setToast({
        message: "Only the room owner can save versions.",
        type: "error",
      });
      return;
    }

    try {
      setSaving(true);

      // Export snapshot
      const snapshot = await exportSnapshot(editor, roomId, userId);

      // Compute content hash
      const contentHash = await computeContentHash(snapshot);

      // Generate version ID
      const versionId = generateVersionId();

      // Upload to Storage
      const storagePath = await uploadSnapshotToStorage(roomId, versionId, snapshot);

      // Compute checksum
      const checksum = contentHash.substring(0, 16);

      // Get byte size
      const jsonStr = JSON.stringify(snapshot);
      const bytes = new TextEncoder().encode(jsonStr).length;

      // Create metadata
      await createVersionMetadata({
        id: versionId,
        roomId,
        createdAt: Date.now(),
        createdBy: userId,
        label: saveLabel || "Manual Snapshot",
        bytes,
        checksum,
        contentHash,
        schemaVersion: CURRENT_SCHEMA_VERSION,
        storagePath,
      });

      // Prune old versions
      await pruneOldVersions(roomId);

      // Reload versions
      await loadVersions();

      // Reset form
      setSaveLabel("");
      setShowSaveInput(false);

      console.log("[VersionHistory] ✅ Snapshot saved:", versionId);
      
      // Show success toast
      setToast({
        message: `✓ Snapshot "${saveLabel || "Manual Snapshot"}" saved successfully!`,
        type: "success",
      });
    } catch (error) {
      console.error("[VersionHistory] Error saving snapshot:", error);
      
      // Provide helpful error messages
      if (error instanceof Error && error.message?.includes("permission")) {
        setToast({
          message: "Permission denied. Only the room owner can save versions.",
          type: "error",
        });
      } else if (error instanceof Error && error.message?.includes("network")) {
        setToast({
          message: "Network error. Check your connection and try again.",
          type: "error",
        });
      } else {
        setToast({
          message: "Failed to save snapshot. Please try again.",
          type: "error",
        });
      }
    } finally {
      setSaving(false);
    }
  };

  // Restore version
  const handleRestoreVersion = async (version: VersionMetadata) => {
    if (!editor || !userId) return;

    // Check permissions
    if (!isOwner) {
      setToast({
        message: "Only the room owner can restore versions.",
        type: "error",
      });
      return;
    }

    // Show confirmation dialog
    setConfirmDialog({
      title: "Restore Version",
      message: `Restore to "${version.label || "Unnamed"}"?\n\nA pre-restore snapshot will be created automatically so you can undo this action.`,
      confirmText: "Restore",
      confirmStyle: "primary",
      onConfirm: () => executeRestore(version),
    });
  };

  // Execute restore after confirmation
  const executeRestore = async (version: VersionMetadata) => {
    setConfirmDialog(null);

    if (!editor) {
      setToast({
        message: "Editor not ready. Please try again.",
        type: "error",
      });
      return;
    }

    // TypeScript: editor is guaranteed non-null after this point
    const currentEditor = editor;

    try {
      setRestoring(true);

      // 1. Create pre-restore snapshot
      console.log("[VersionHistory] Creating pre-restore snapshot...");
      const preRestoreSnapshot = await exportSnapshot(currentEditor, roomId, userId);
      const preRestoreHash = await computeContentHash(preRestoreSnapshot);
      const preRestoreId = generateVersionId();
      const preRestorePath = await uploadSnapshotToStorage(
        roomId,
        preRestoreId,
        preRestoreSnapshot
      );
      const preRestoreBytes = new TextEncoder().encode(
        JSON.stringify(preRestoreSnapshot)
      ).length;

      await createVersionMetadata({
        id: preRestoreId,
        roomId,
        createdAt: Date.now(),
        createdBy: userId,
        label: "Pre-restore (auto)",
        bytes: preRestoreBytes,
        checksum: preRestoreHash.substring(0, 16),
        contentHash: preRestoreHash,
        schemaVersion: CURRENT_SCHEMA_VERSION,
        storagePath: preRestorePath,
      });

      // 2. Pause realtime sync
      pauseRealtime();

      // 3. Download and import snapshot
      console.log("[VersionHistory] Downloading snapshot...");
      const snapshotData = await downloadSnapshotFromStorage(version.storagePath);

      console.log("[VersionHistory] Importing snapshot...");
      await importSnapshot(currentEditor, snapshotData);

      // 4. Resume realtime sync
      resumeRealtime();

      // Show success toast
      setToast({
        message: `✓ Restored to "${version.label || "Unnamed"}". Undo is available in tldraw history.`,
        type: "success",
      });

      // Reload versions
      await loadVersions();

      console.log("[VersionHistory] ✅ Restore complete");
    } catch (error) {
      console.error("[VersionHistory] Error restoring snapshot:", error);
      
      // Provide helpful error messages
      if (error instanceof Error && error.message?.includes("permission")) {
        setToast({
          message: "Permission denied. Only the room owner can restore versions.",
          type: "error",
        });
      } else if (error instanceof Error && error.message?.includes("not found")) {
        setToast({
          message: "Snapshot file not found. It may have been deleted.",
          type: "error",
        });
      } else if (error instanceof Error && error.message?.includes("network")) {
        setToast({
          message: "Network error. Check your connection and try again.",
          type: "error",
        });
      } else {
        setToast({
          message: "Failed to restore snapshot. Please try again.",
          type: "error",
        });
      }

      // Make sure to resume sync even on error
      resumeRealtime();
    } finally {
      setRestoring(false);
    }
  };

  // Delete version
  const handleDeleteVersion = async (version: VersionMetadata) => {
    // Show confirmation dialog
    setConfirmDialog({
      title: "Delete Snapshot",
      message: `Delete snapshot "${version.label || "Unnamed"}"?\n\nThis action cannot be undone.`,
      confirmText: "Delete",
      confirmStyle: "danger",
      onConfirm: () => executeDelete(version),
    });
  };

  // Execute delete after confirmation
  const executeDelete = async (version: VersionMetadata) => {
    setConfirmDialog(null);

    try {
      await deleteVersion(roomId, version.id);
      await loadVersions();
      console.log("[VersionHistory] ✅ Version deleted:", version.id);
      
      setToast({
        message: `✓ Snapshot "${version.label || "Unnamed"}" deleted successfully.`,
        type: "success",
      });
    } catch (error) {
      console.error("[VersionHistory] Error deleting version:", error);
      
      // Provide helpful error messages
      if (error instanceof Error && error.message?.includes("permission")) {
        setToast({
          message: "Permission denied. Only the creator or room owner can delete versions.",
          type: "error",
        });
      } else if (error instanceof Error && error.message?.includes("network")) {
        setToast({
          message: "Network error. Check your connection and try again.",
          type: "error",
        });
      } else {
        setToast({
          message: "Failed to delete snapshot. Please try again.",
          type: "error",
        });
      }
    }
  };

  // Format bytes
  const formatBytes = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // Format timestamp
  const formatTimestamp = (timestamp: number): string => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString();
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50">
      <div className="relative max-h-[80vh] w-full max-w-2xl overflow-hidden rounded-lg bg-white shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <h2 className="text-xl font-semibold text-gray-900">Version History</h2>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700"
            aria-label="Close"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Save version section */}
        <div className="border-b border-gray-200 px-6 py-4">
          {!isOwner && (
            <div className="mb-3 rounded-lg bg-yellow-50 border border-yellow-200 px-4 py-2 text-sm text-yellow-800">
              <span className="flex items-center gap-2">
                <svg className="h-4 w-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <span>You are not the room owner. Only the owner can save or restore versions.</span>
              </span>
            </div>
          )}
          {!showSaveInput ? (
            <button
              onClick={() => setShowSaveInput(true)}
              disabled={saving || !editor || !isOwner}
              title={!isOwner ? "Only the room owner can save versions" : "Save a snapshot of the current canvas"}
              className="w-full rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              <span className="flex items-center justify-center gap-2">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 4v16m8-8H4"
                  />
                </svg>
                {isOwner ? "Save Version" : "Save Version (Owner Only)"}
              </span>
            </button>
          ) : (
            <div className="flex gap-2">
              <input
                type="text"
                value={saveLabel}
                onChange={(e) => setSaveLabel(e.target.value)}
                placeholder="Version label (optional)"
                className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                onKeyPress={(e) => e.key === "Enter" && handleSaveVersion()}
              />
              <button
                onClick={handleSaveVersion}
                disabled={saving}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? "Saving..." : "Save"}
              </button>
              <button
                onClick={() => {
                  setShowSaveInput(false);
                  setSaveLabel("");
                }}
                className="rounded-lg bg-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-300"
              >
                Cancel
              </button>
            </div>
          )}
        </div>

        {/* Versions list */}
        <div className="max-h-96 overflow-y-auto px-6 py-4">
          {loading ? (
            <div className="flex items-center justify-center py-8 text-gray-500">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-gray-300 border-t-blue-600"></div>
              <span className="ml-2">Loading versions...</span>
            </div>
          ) : versions.length === 0 ? (
            <div className="py-8 text-center text-gray-500">
              <p>No versions yet</p>
              <p className="mt-1 text-sm">Create your first snapshot above</p>
            </div>
          ) : (
            <div className="space-y-2">
              {versions.map((version) => (
                <div
                  key={version.id}
                  className={`rounded-lg border p-4 transition-colors ${
                    selectedVersion === version.id
                      ? "border-blue-500 bg-blue-50"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium text-gray-900">
                          {version.label || "Unnamed Snapshot"}
                        </h3>
                        {version.label === "Autosave" && (
                          <span className="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
                            Auto
                          </span>
                        )}
                      </div>
                      <div className="mt-1 flex items-center gap-3 text-sm text-gray-500">
                        <span>{formatTimestamp(version.createdAt)}</span>
                        <span>•</span>
                        <span>{formatBytes(version.bytes)}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleRestoreVersion(version)}
                        disabled={restoring || !isOwner}
                        title={!isOwner ? "Only the room owner can restore versions" : "Restore this version"}
                        className="rounded-lg bg-green-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                      >
                        {restoring ? "Restoring..." : "Restore"}
                      </button>

                      {(isOwner || version.createdBy === userId) && (
                        <button
                          onClick={() => handleDeleteVersion(version)}
                          className="rounded-lg bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700"
                          title="Delete this version permanently"
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 px-6 py-3">
          <div className="flex items-start gap-2 text-xs text-gray-500">
            <svg className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <p>Last 20 versions are kept. Older versions are automatically pruned.</p>
              {!isOwner && (
                <p className="mt-1 text-yellow-700">
                  ⚠️ Only the room owner can save or restore versions.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Toast Notification */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      {/* Confirmation Dialog */}
      {confirmDialog && (
        <ConfirmDialog
          title={confirmDialog.title}
          message={confirmDialog.message}
          confirmText={confirmDialog.confirmText}
          confirmStyle={confirmDialog.confirmStyle}
          onConfirm={confirmDialog.onConfirm}
          onCancel={() => setConfirmDialog(null)}
        />
      )}
    </div>
  );
}

