/**
 * RoomHeader - Header bar for collaborative canvas
 * Displays room name, settings button (owner only), share button, and exit button
 */

"use client";

import { useState } from "react";

export interface RoomHeaderProps {
  roomId: string;
  roomName: string;
  isOwner: boolean;
  userCount?: number;
  onSettingsClick: () => void;
  onExportClick: () => void;
  onExitClick: () => void;
}

export default function RoomHeader({
  roomId,
  roomName,
  isOwner,
  userCount = 0,
  onSettingsClick,
  onExportClick,
  onExitClick,
}: RoomHeaderProps): React.JSX.Element {
  const [showCopySuccess, setShowCopySuccess] = useState(false);

  // Handle share button click
  const handleShare = async () => {
    try {
      const roomUrl = `${window.location.origin}/room/${roomId}`;
      await navigator.clipboard.writeText(roomUrl);
      
      setShowCopySuccess(true);
      setTimeout(() => setShowCopySuccess(false), 2000);
    } catch (err) {
      console.error("[RoomHeader] Failed to copy link:", err);
    }
  };

  return (
    <div className="relative z-30 flex h-14 items-center justify-between border-b border-gray-200 bg-white px-4 shadow-sm md:h-16 md:px-6">
      {/* Left side - Back button and room name */}
      <div className="flex items-center gap-3">
        <button
          onClick={onExitClick}
          className="rounded-lg p-2 text-gray-600 hover:bg-gray-100 hover:text-gray-900"
          aria-label="Exit room"
          title="Back to rooms"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
        </button>
        
        <div className="flex flex-col">
          <h1 className="text-base font-semibold text-gray-900 md:text-lg">
            {roomName}
          </h1>
          {userCount > 0 && (
            <span className="text-xs text-gray-500">
              {userCount} {userCount === 1 ? "user" : "users"} online
            </span>
          )}
        </div>
      </div>

      {/* Right side - Actions */}
      <div className="flex items-center gap-2">
        {/* Share button */}
        <div className="relative">
          <button
            onClick={handleShare}
            className="rounded-lg bg-blue-50 px-3 py-2 text-sm font-medium text-blue-700 hover:bg-blue-100 md:px-4"
            aria-label="Share room"
            title="Copy room link"
          >
            <span className="flex items-center gap-2">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
              </svg>
              <span className="hidden sm:inline">Share</span>
            </span>
          </button>
          
          {/* Copy success tooltip */}
          {showCopySuccess && (
            <div className="absolute right-0 top-full mt-2 whitespace-nowrap rounded-lg bg-gray-900 px-3 py-2 text-xs text-white shadow-lg">
              Link copied!
              <div className="absolute right-4 top-0 -mt-1 h-2 w-2 rotate-45 bg-gray-900"></div>
            </div>
          )}
        </div>

        {/* Export button */}
        <button
          onClick={onExportClick}
          className="rounded-lg bg-green-50 px-3 py-2 text-sm font-medium text-green-700 hover:bg-green-100 md:px-4"
          aria-label="Export canvas"
          title="Export canvas (Ctrl+E)"
        >
          <span className="flex items-center gap-2">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            <span className="hidden sm:inline">Export</span>
          </span>
        </button>

        {/* Settings button (owner only) */}
        {isOwner && (
          <button
            onClick={onSettingsClick}
            className="rounded-lg p-2 text-gray-600 hover:bg-gray-100 hover:text-gray-900"
            aria-label="Room settings"
            title="Room settings"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}
