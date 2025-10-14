/**
 * Cursors Component
 * Renders remote users' cursors with labels on the canvas
 */

"use client";

import type { Editor } from "@tldraw/tldraw";
import { useEffect, useState } from "react";

import type { UserPresence } from "../types";
import { pageToScreen } from "../lib/tldrawHelpers";

/**
 * Props for Cursors component
 */
interface CursorsProps {
  editor: Editor | null;
  remoteCursors: Record<string, UserPresence>;
}

/**
 * Screen position and metadata for a remote cursor
 */
interface CursorPosition {
  x: number;
  y: number;
  name: string;
  color: string;
}

/**
 * Cursors - Renders remote users' cursors as positioned overlays
 * 
 * Features:
 * - Converts page coordinates to screen coordinates
 * - Updates positions when camera moves (pan/zoom)
 * - Updates positions on window resize
 * - Smooth transitions with CSS transforms
 * 
 * @param props - Component props
 * @returns Overlay with remote cursors
 */
export default function Cursors({ editor, remoteCursors }: CursorsProps): React.JSX.Element | null {
  const [cursorPositions, setCursorPositions] = useState<Record<string, CursorPosition>>({});

  /**
   * Update cursor screen positions based on page coordinates and camera
   * Runs when editor, remoteCursors change, or window resizes
   */
  useEffect(() => {
    if (!editor) {
      setCursorPositions({});
      return;
    }

    const updatePositions = (): void => {
      const positions: Record<string, CursorPosition> = {};

      Object.entries(remoteCursors).forEach(([userId, user]) => {
        if (!user.cursor) {
          return;
        }

        try {
          // Convert page coordinates to screen coordinates
          const screenPos = pageToScreen(editor, {
            x: user.cursor.x,
            y: user.cursor.y,
          });

          positions[userId] = {
            x: screenPos.x,
            y: screenPos.y,
            name: user.name,
            color: user.color,
          };
        } catch (err) {
          console.error("[Cursors] Error converting cursor position:", err);
        }
      });

      setCursorPositions(positions);
    };

    // Initial update
    updatePositions();

    // Update when remote cursors change (handled by dependency array)
    // No need for continuous listeners - only update when data actually changes
    
    // Also update on window resize
    window.addEventListener("resize", updatePositions);

    return (): void => {
      window.removeEventListener("resize", updatePositions);
    };
  }, [editor, remoteCursors]);

  if (!editor || Object.keys(cursorPositions).length === 0) {
    return null;
  }

  return (
    <div className="pointer-events-none fixed inset-0 z-[100]">
      {Object.entries(cursorPositions).map(([userId, cursor]) => (
        <div
          key={userId}
          className="absolute transition-transform duration-100 ease-out"
          style={{
            transform: `translate(${cursor.x}px, ${cursor.y}px)`,
            willChange: "transform",
          }}
        >
          {/* Cursor pointer */}
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            style={{
              filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.3))",
            }}
          >
            <path
              d="M5.65376 12.3673L13.0087 5.4132C13.4395 5.00142 14.1326 5.35966 14.0762 5.93779L13.4698 11.8319C13.4479 12.0459 13.5336 12.258 13.6955 12.3945L18.1606 16.2493C18.5587 16.5925 18.3916 17.2482 17.8784 17.3645L11.1925 18.7992C10.9756 18.8458 10.7991 19.0005 10.7295 19.2089L8.39485 26.0824C8.19486 26.6443 7.46977 26.715 7.17469 26.199L0.881887 15.073C0.566044 14.5227 0.940816 13.832 1.58169 13.832H4.80705C5.0295 13.832 5.23976 13.7363 5.38445 13.5688L5.65376 12.3673Z"
              fill={cursor.color}
              stroke="white"
              strokeWidth="1.5"
            />
          </svg>

          {/* User name label */}
          <div
            className="ml-5 mt-1 whitespace-nowrap rounded px-2 py-1 text-xs font-medium text-white shadow-lg"
            style={{
              backgroundColor: cursor.color,
              userSelect: "none",
            }}
          >
            {cursor.name}
          </div>
        </div>
      ))}
    </div>
  );
}

