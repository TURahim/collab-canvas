/**
 * ExportDialog Component
 * 
 * Modal dialog for exporting canvas to PNG or SVG
 * Features:
 * - Format selection (PNG/SVG)
 * - Quality and scale controls for PNG
 * - Background toggle
 * - Selected shapes vs entire canvas
 * - File size validation
 * - Keyboard shortcuts (Enter to export, Esc to close)
 */

"use client";

import type { Editor } from "@tldraw/tldraw";
import { useEffect, useState, useCallback } from "react";
import {
  exportToPNG,
  exportToSVG,
  downloadFile,
  generateFilename,
  validateExport,
  getWarningThreshold,
  type ExportOptions,
} from "../lib/exportCanvas";

interface ExportDialogProps {
  /** Whether dialog is open */
  isOpen: boolean;
  /** Close handler */
  onClose: () => void;
  /** tldraw editor instance */
  editor: Editor | null;
}

/**
 * ExportDialog component
 */
export default function ExportDialog({
  isOpen,
  onClose,
  editor,
}: ExportDialogProps): React.JSX.Element | null {
  const [format, setFormat] = useState<"png" | "svg">("png");
  const [quality, setQuality] = useState<number>(0.92);
  const [scale, setScale] = useState<number>(1);
  const [background, setBackground] = useState<boolean>(true);
  const [selectedOnly, setSelectedOnly] = useState<boolean>(false);
  const [filename, setFilename] = useState<string>("");
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSelection, setHasSelection] = useState<boolean>(false);

  // Update filename when format changes
  useEffect(() => {
    setFilename(generateFilename(format));
  }, [format]);

  // Check if there are selected shapes
  useEffect(() => {
    if (!editor || !isOpen) return;
    
    const updateSelection = (): void => {
      const selectedIds = editor.getSelectedShapeIds();
      const count = Array.from(selectedIds).length;
      setHasSelection(count > 0);
    };
    
    updateSelection();
    
    // Listen for selection changes
    const unsubscribe = editor.store.listen(() => {
      updateSelection();
    }, { scope: "document" });
    
    return () => {
      unsubscribe();
    };
  }, [editor, isOpen]);

  // Reset state when dialog opens
  useEffect(() => {
    if (isOpen) {
      setError(null);
      setIsExporting(false);
      setFormat("png");
      setQuality(0.92);
      setScale(1);
      setBackground(true);
      setSelectedOnly(false);
      setFilename(generateFilename("png"));
    }
  }, [isOpen]);

  /**
   * Handle export button click
   */
  const handleExport = useCallback(async (): Promise<void> => {
    if (!editor || isExporting) return;

    // Validate export
    const validation = validateExport(editor);
    if (!validation.valid) {
      setError(validation.error || "Cannot export");
      return;
    }

    // Check if selectedOnly is enabled but no shapes selected
    if (selectedOnly && !hasSelection) {
      setError("No shapes selected. Select shapes or export entire canvas.");
      return;
    }

    setIsExporting(true);
    setError(null);

    try {
      const options: ExportOptions = {
        format,
        quality: format === "png" ? quality : undefined,
        scale: format === "png" ? scale : undefined,
        background,
        selectedOnly,
      };

      let blob: Blob;
      if (format === "png") {
        blob = await exportToPNG(editor, options);
      } else {
        blob = await exportToSVG(editor, options);
      }

      // Check if file is large
      const warnThreshold = getWarningThreshold();
      if (blob.size > warnThreshold) {
        console.warn(
          `Export file is large: ${(blob.size / (1024 * 1024)).toFixed(1)} MB`
        );
      }

      // Download file
      downloadFile(blob, filename);

      // Show success message
      console.log(`Export successful: ${filename}`);

      // Close dialog after successful export
      setTimeout(() => {
        onClose();
      }, 300);
    } catch (err) {
      console.error("[ExportDialog] Export failed:", err);
      
      if (err instanceof Error) {
        if (err.message.includes("too large")) {
          setError("Export file too large. Try reducing quality or scale.");
        } else if (err.message.includes("No shapes")) {
          setError("Nothing to export. Add shapes to the canvas first.");
        } else {
          setError(`Export failed: ${err.message}`);
        }
      } else {
        setError("Export failed. Please try again.");
      }
    } finally {
      setIsExporting(false);
    }
  }, [editor, format, quality, scale, background, selectedOnly, filename, hasSelection, isExporting, onClose]);

  // Handle keyboard shortcuts
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent): void => {
      if (e.key === "Escape") {
        onClose();
      } else if (e.key === "Enter" && !isExporting) {
        void handleExport();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, isExporting, onClose, handleExport]);

  // Don't render if dialog is closed
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900">Export Canvas</h2>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
            aria-label="Close dialog"
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Error message */}
        {error && (
          <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-800">
            <div className="flex items-start">
              <svg className="mr-2 h-5 w-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              <span>{error}</span>
            </div>
          </div>
        )}

        {/* Format selection */}
        <div className="mb-6">
          <label className="mb-2 block text-sm font-medium text-gray-700">
            Format
          </label>
          <div className="flex gap-3">
            <button
              onClick={() => setFormat("png")}
              className={`flex-1 rounded-lg border-2 px-4 py-3 text-sm font-medium transition-colors ${
                format === "png"
                  ? "border-blue-500 bg-blue-50 text-blue-700"
                  : "border-gray-200 bg-white text-gray-700 hover:border-gray-300"
              }`}
            >
              PNG
            </button>
            <button
              onClick={() => setFormat("svg")}
              className={`flex-1 rounded-lg border-2 px-4 py-3 text-sm font-medium transition-colors ${
                format === "svg"
                  ? "border-blue-500 bg-blue-50 text-blue-700"
                  : "border-gray-200 bg-white text-gray-700 hover:border-gray-300"
              }`}
            >
              SVG
            </button>
          </div>
        </div>

        {/* PNG options */}
        {format === "png" && (
          <>
            {/* Quality slider */}
            <div className="mb-4">
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Quality: {Math.round(quality * 100)}%
              </label>
              <input
                type="range"
                min="0.1"
                max="1"
                step="0.05"
                value={quality}
                onChange={(e) => setQuality(parseFloat(e.target.value))}
                className="w-full accent-blue-500"
              />
              <div className="mt-1 flex justify-between text-xs text-gray-500">
                <span>Lower quality (smaller file)</span>
                <span>Higher quality (larger file)</span>
              </div>
            </div>

            {/* Scale selection */}
            <div className="mb-4">
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Scale
              </label>
              <div className="flex gap-2">
                {[1, 2, 3].map((s) => (
                  <button
                    key={s}
                    onClick={() => setScale(s)}
                    className={`flex-1 rounded-lg border-2 px-4 py-2 text-sm font-medium transition-colors ${
                      scale === s
                        ? "border-blue-500 bg-blue-50 text-blue-700"
                        : "border-gray-200 bg-white text-gray-700 hover:border-gray-300"
                    }`}
                  >
                    {s}x
                  </button>
                ))}
              </div>
            </div>
          </>
        )}

        {/* Background toggle */}
        <div className="mb-4">
          <label className="flex cursor-pointer items-center justify-between">
            <span className="text-sm font-medium text-gray-700">
              Include background
            </span>
            <button
              onClick={() => setBackground(!background)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                background ? "bg-blue-500" : "bg-gray-300"
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  background ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
          </label>
          <p className="mt-1 text-xs text-gray-500">
            {background ? "White background" : "Transparent background"}
            {format === "svg" && " (SVG always includes background)"}
          </p>
        </div>

        {/* Selected only toggle */}
        <div className="mb-6">
          <label className="flex cursor-pointer items-center justify-between">
            <span className="text-sm font-medium text-gray-700">
              Export selected shapes only
            </span>
            <button
              onClick={() => setSelectedOnly(!selectedOnly)}
              disabled={!hasSelection}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                selectedOnly ? "bg-blue-500" : "bg-gray-300"
              } ${!hasSelection ? "cursor-not-allowed opacity-50" : ""}`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  selectedOnly ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
          </label>
          <p className="mt-1 text-xs text-gray-500">
            {hasSelection
              ? `${editor ? Array.from(editor.getSelectedShapeIds()).length : 0} shape(s) selected`
              : "No shapes selected"}
          </p>
        </div>

        {/* Filename input */}
        <div className="mb-6">
          <label className="mb-2 block text-sm font-medium text-gray-700">
            Filename
          </label>
          <input
            type="text"
            value={filename}
            onChange={(e) => setFilename(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
            placeholder={`canvas-${new Date().toISOString().slice(0, 10)}.${format}`}
          />
        </div>

        {/* Action buttons */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
            disabled={isExporting}
          >
            Cancel
          </button>
          <button
            onClick={handleExport}
            disabled={isExporting || !editor}
            className="flex-1 rounded-lg bg-blue-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isExporting ? (
              <span className="flex items-center justify-center">
                <svg className="mr-2 h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Exporting...
              </span>
            ) : (
              "Download"
            )}
          </button>
        </div>

        {/* Keyboard shortcuts hint */}
        <div className="mt-4 text-center text-xs text-gray-500">
          Press <kbd className="rounded bg-gray-100 px-1.5 py-0.5 font-mono">Enter</kbd> to export or{" "}
          <kbd className="rounded bg-gray-100 px-1.5 py-0.5 font-mono">Esc</kbd> to close
        </div>
      </div>
    </div>
  );
}
