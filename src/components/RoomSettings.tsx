/**
 * RoomSettings - Settings modal for room configuration
 * Allows owner to rename, toggle public/private, and delete room
 */

"use client";

import { useState, useEffect } from "react";
import {
  updateRoomMetadata,
  deleteRoom,
  getRoomMetadata,
  validateRoomName,
} from "../lib/roomManagement";
import type { RoomMetadata } from "../types/room";

export interface RoomSettingsProps {
  roomId: string;
  currentUserId: string;
  onClose: () => void;
  onRoomDeleted?: () => void;
  onRoomUpdated?: (name: string) => void;
}

export default function RoomSettings({
  roomId,
  currentUserId,
  onClose,
  onRoomDeleted,
  onRoomUpdated,
}: RoomSettingsProps): React.JSX.Element {
  const [roomMetadata, setRoomMetadata] = useState<RoomMetadata | null>(null);
  const [roomName, setRoomName] = useState("");
  const [isPublic, setIsPublic] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [nameError, setNameError] = useState<string | null>(null);

  // Load room metadata
  useEffect(() => {
    const loadRoomData = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const metadata = await getRoomMetadata(roomId);
        
        if (!metadata) {
          setError("Room not found");
          return;
        }

        setRoomMetadata(metadata);
        setRoomName(metadata.name);
        setIsPublic(metadata.isPublic);
      } catch (err) {
        console.error("[RoomSettings] Error loading room data:", err);
        setError("Failed to load room settings");
      } finally {
        setIsLoading(false);
      }
    };

    loadRoomData();
  }, [roomId]);

  // Check if current user is owner
  const isOwner = roomMetadata?.owner === currentUserId;

  // Handle close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !showDeleteConfirm) {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose, showDeleteConfirm]);

  // Handle room name change
  const handleNameChange = (value: string) => {
    setRoomName(value);
    
    // Validate in real-time
    if (value.trim()) {
      const validation = validateRoomName(value);
      setNameError(validation.valid ? null : validation.error || null);
    } else {
      setNameError(null);
    }
  };

  // Handle save changes
  const handleSave = async () => {
    try {
      setIsSaving(true);
      setError(null);

      // Validate room name
      const validation = validateRoomName(roomName);
      if (!validation.valid) {
        setNameError(validation.error || "Invalid room name");
        return;
      }

      await updateRoomMetadata(roomId, currentUserId, {
        name: roomName,
        isPublic,
      });

      // Notify parent of update
      if (onRoomUpdated) {
        onRoomUpdated(roomName);
      }

      onClose();
    } catch (err) {
      console.error("[RoomSettings] Error saving:", err);
      setError(err instanceof Error ? err.message : "Failed to save changes");
    } finally {
      setIsSaving(false);
    }
  };

  // Handle delete room
  const handleDelete = async () => {
    try {
      setIsDeleting(true);
      setError(null);

      await deleteRoom(roomId, currentUserId);

      // Notify parent of deletion
      if (onRoomDeleted) {
        onRoomDeleted();
      }
    } catch (err) {
      console.error("[RoomSettings] Error deleting room:", err);
      setError(err instanceof Error ? err.message : "Failed to delete room");
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  // Handle public/private toggle
  const handleTogglePublic = () => {
    setIsPublic(!isPublic);
  };

  if (isLoading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
        <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
          <div className="flex items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-blue-600"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!isOwner) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
        <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
          <h2 className="mb-4 text-xl font-bold text-gray-900">Access Denied</h2>
          <p className="mb-4 text-gray-600">Only the room owner can access settings.</p>
          <button
            onClick={onClose}
            className="w-full rounded-lg bg-gray-200 px-4 py-2 font-medium text-gray-700 hover:bg-gray-300"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  // Delete confirmation dialog
  if (showDeleteConfirm) {
    const canDelete = deleteConfirmText === roomMetadata?.name;

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
        <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
          <h2 className="mb-4 text-xl font-bold text-red-600">Delete Room?</h2>
          
          <div className="mb-4 rounded-lg bg-red-50 p-4">
            <p className="text-sm text-red-900">
              This will permanently delete "<strong>{roomMetadata?.name}</strong>" and all its contents.
              <br />
              <strong>This action cannot be undone.</strong>
            </p>
          </div>

          <div className="mb-4">
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Type room name to confirm
            </label>
            <input
              type="text"
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              placeholder={roomMetadata?.name}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
              autoFocus
            />
          </div>

          {error && (
            <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={() => {
                setShowDeleteConfirm(false);
                setDeleteConfirmText("");
                setError(null);
              }}
              className="flex-1 rounded-lg bg-gray-200 px-4 py-2 font-medium text-gray-700 hover:bg-gray-300"
              disabled={isDeleting}
            >
              Cancel
            </button>
            <button
              onClick={handleDelete}
              disabled={!canDelete || isDeleting}
              className="flex-1 rounded-lg bg-red-600 px-4 py-2 font-medium text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isDeleting ? "Deleting..." : "Delete Permanently"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Main settings modal
  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl md:max-w-lg">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900">Room Settings</h2>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
            aria-label="Close"
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {error && !showDeleteConfirm && (
          <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Room Name */}
        <div className="mb-6">
          <label className="mb-2 block text-sm font-medium text-gray-700">
            Room Name
          </label>
          <input
            type="text"
            value={roomName}
            onChange={(e) => handleNameChange(e.target.value)}
            className={`w-full rounded-lg border ${
              nameError ? "border-red-300" : "border-gray-300"
            } px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200`}
            placeholder="Enter room name"
          />
          {nameError && (
            <p className="mt-1 text-sm text-red-600">{nameError}</p>
          )}
        </div>

        {/* Public/Private Toggle */}
        <div className="mb-6">
          <label className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium text-gray-700">Public Room</div>
              <div className="text-xs text-gray-500">
                {isPublic
                  ? "Anyone with the link can join"
                  : "Only invited members can join"}
              </div>
            </div>
            <button
              onClick={handleTogglePublic}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                isPublic ? "bg-blue-600" : "bg-gray-300"
              }`}
              aria-label="Toggle public access"
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  isPublic ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
          </label>
        </div>

        {/* Action Buttons */}
        <div className="mb-6 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 rounded-lg bg-gray-200 px-4 py-2 font-medium text-gray-700 hover:bg-gray-300"
            disabled={isSaving}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving || !!nameError}
            className="flex-1 rounded-lg bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSaving ? "Saving..." : "Save Changes"}
          </button>
        </div>

        {/* Danger Zone */}
        <div className="border-t border-gray-200 pt-6">
          <h3 className="mb-3 text-sm font-semibold text-gray-700">Danger Zone</h3>
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="w-full rounded-lg border-2 border-red-300 bg-red-50 px-4 py-2 font-medium text-red-700 hover:bg-red-100"
            disabled={isSaving}
          >
            Delete Room
          </button>
          <p className="mt-2 text-xs text-gray-500">
            This will permanently delete the room and all its contents.
          </p>
        </div>
      </div>
    </div>
  );
}
