/**
 * ExportDialog - Canvas export modal with PNG/SVG options
 */

"use client";

import type { Editor } from "@tldraw/tldraw";
import type { FormEvent } from "react";
import { useEffect, useState } from "react";
import {
  checkFileSize,
  downloadFile,
  exportToPNG,
  exportToSVG,
  generateFilename,
  validateExport,
  type ExportOptions,
} from "../lib/exportCanvas";

interface ExportDialogProps {
  isOpen: boolean;
  onClose: () => void;
  editor: Editor | null;
}

/**
 * ExportDialog - Modal for exporting canvas to PNG or SVG
 * 
 * Features:
 * - Format selection (PNG/SVG)
 * - PNG options: quality slider, scale dropdown
 * - Background toggle (transparent vs white)
 * - Selection vs All export
 * - Filename input with timestamp default
 * - File size validation and warnings
 * - Loading state during export
 * - Keyboard support (Enter to download, Esc to close)
 */
export default function ExportDialog({
  isOpen,
  onClose,
  editor,
}: ExportDialogProps): React.JSX.Element | null {
  const [format, setFormat] = useState<'png' | 'svg'>('png');
  const [quality, setQuality] = useState<number>(0.92);
  const [scale, setScale] = useState<number>(1);
  const [background, setBackground] = useState<boolean>(true);
  const [selectedOnly, setSelectedOnly] = useState<boolean>(false);
  const [filename, setFilename] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);

  // Generate default filename when dialog opens or format changes
  useEffect(() => {
    if (isOpen) {
      setFilename(generateFilename(format));
      setError(null);
      setWarning(null);
    }
  }, [isOpen, format]);

  // Keyboard handler for Esc key
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return (): void => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  const handleExport = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    setError(null);
    setWarning(null);

    // Validate export
    const validation = validateExport(editor, selectedOnly);
    if (!validation.valid) {
      setError(validation.error || 'Cannot export');
      return;
    }

    if (!editor) {
      setError('Editor not initialized');
      return;
    }

    setLoading(true);

    try {
      const options: ExportOptions = {
        format,
        quality: format === 'png' ? quality : undefined,
        scale: format === 'png' ? scale : undefined,
        background,
        selectedOnly,
      };

      // Export based on format
      const blob = format === 'png' 
        ? await exportToPNG(editor, options)
        : await exportToSVG(editor, options);

      // Check file size
      const sizeCheck = checkFileSize(blob.size);
      if (sizeCheck.shouldWarn) {
        setWarning(sizeCheck.message || '');
      }

      // Download file
      downloadFile(blob, filename);

      // Show success and close dialog
      setTimeout(() => {
        onClose();
        setLoading(false);
      }, 500);

    } catch (err) {
      setLoading(false);
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Export failed. Please try again.');
      }
      console.error('[ExportDialog] Export failed:', err);
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="max-w-md w-full mx-4 rounded-2xl bg-white p-8 shadow-xl">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Export Canvas</h2>
          <p className="text-sm text-gray-600 mt-1">
            Download your canvas as an image or vector file
          </p>
        </div>

        <form onSubmit={handleExport}>
          {/* Format Selection */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Format
            </label>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setFormat('png')}
                className={`flex-1 py-3 px-4 rounded-lg font-medium transition-colors ${
                  format === 'png'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                PNG
              </button>
              <button
                type="button"
                onClick={() => setFormat('svg')}
                className={`flex-1 py-3 px-4 rounded-lg font-medium transition-colors ${
                  format === 'svg'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                SVG
              </button>
            </div>
          </div>

          {/* PNG Options */}
          {format === 'png' && (
            <>
              {/* Quality Slider */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Quality: {Math.round(quality * 100)}%
                </label>
                <input
                  type="range"
                  min="0.1"
                  max="1.0"
                  step="0.1"
                  value={quality}
                  onChange={(e) => setQuality(parseFloat(e.target.value))}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>Smaller file</span>
                  <span>Higher quality</span>
                </div>
              </div>

              {/* Scale Dropdown */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Scale
                </label>
                <select
                  value={scale}
                  onChange={(e) => setScale(parseInt(e.target.value, 10))}
                  className="w-full py-2 px-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value={1}>1x (100%)</option>
                  <option value={2}>2x (200%)</option>
                  <option value={3}>3x (300%)</option>
                </select>
              </div>
            </>
          )}

          {/* Background Toggle */}
          <div className="mb-6">
            <label className="flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={background}
                onChange={(e) => setBackground(e.target.checked)}
                className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
              />
              <span className="ml-3 text-sm font-medium text-gray-700">
                Include background
                {format === 'png' && !background && (
                  <span className="ml-2 text-gray-500">(transparent)</span>
                )}
              </span>
            </label>
          </div>

          {/* Selection Toggle */}
          <div className="mb-6">
            <label className="flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={selectedOnly}
                onChange={(e) => setSelectedOnly(e.target.checked)}
                className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
              />
              <span className="ml-3 text-sm font-medium text-gray-700">
                Export selected shapes only
              </span>
            </label>
          </div>

          {/* Filename Input */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Filename
            </label>
            <input
              type="text"
              value={filename}
              onChange={(e) => setFilename(e.target.value)}
              className="w-full py-2 px-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder={`canvas-${new Date().toISOString().slice(0, 10)}.${format}`}
              disabled={loading}
            />
          </div>

          {/* Error Display */}
          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          {/* Warning Display */}
          {warning && (
            <div className="mb-4 p-3 rounded-lg bg-yellow-50 border border-yellow-200">
              <p className="text-sm text-yellow-800">{warning}</p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="flex-1 py-3 px-4 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !filename.trim()}
              className="flex-1 py-3 px-4 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                  Exporting...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Download
                </>
              )}
            </button>
          </div>
        </form>

        {/* Keyboard Hint */}
        <p className="text-xs text-gray-500 text-center mt-4">
          Press <kbd className="px-2 py-1 bg-gray-100 border border-gray-300 rounded text-xs">Esc</kbd> to close
        </p>
      </div>
    </div>
  );
}
