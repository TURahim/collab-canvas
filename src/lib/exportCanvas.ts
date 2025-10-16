/**
 * Canvas Export Utilities
 * Provides PNG and SVG export functionality for tldraw canvas
 */

import type { Editor } from "@tldraw/tldraw";

export interface ExportOptions {
  format: 'png' | 'svg';
  quality?: number;        // PNG only, 0.1-1.0, default 0.92
  scale?: number;          // PNG only, 1-3, default 1
  background?: boolean;    // Include background, default true
  selectedOnly?: boolean;  // Export selection only, default false
}

/**
 * Maximum file size for exports (50MB)
 */
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB in bytes

/**
 * Warning threshold for large files (10MB)
 */
const WARN_FILE_SIZE = 10 * 1024 * 1024; // 10MB in bytes

/**
 * Export canvas to PNG format
 * 
 * @param editor - tldraw editor instance
 * @param options - Export configuration options
 * @returns Promise resolving to PNG blob
 * @throws Error if no shapes to export or file too large
 */
export async function exportToPNG(
  editor: Editor,
  options: ExportOptions
): Promise<Blob> {
  // Get shapes to export
  const selectedIds = editor.getSelectedShapeIds();
  const ids = options.selectedOnly 
    ? Array.from(selectedIds)
    : editor.getCurrentPageShapes().map(s => s.id);
  
  if (ids.length === 0) {
    throw new Error('No shapes to export');
  }
  
  // Use tldraw's export API
  const result = await editor.toImage(ids, {
    scale: options.scale || 1,
    background: options.background ?? true,
    quality: options.quality || 0.92,
  });
  
  if (!result || !result.blob) {
    throw new Error('Failed to export image');
  }
  
  // Validate file size (limit to 50MB)
  if (result.blob.size > MAX_FILE_SIZE) {
    throw new Error('Export file too large (max 50MB). Try reducing scale or quality.');
  }
  
  return result.blob;
}

/**
 * Export canvas to SVG format
 * 
 * @param editor - tldraw editor instance
 * @param options - Export configuration options
 * @returns Promise resolving to SVG blob
 * @throws Error if no shapes to export
 */
export async function exportToSVG(
  editor: Editor,
  options: ExportOptions
): Promise<Blob> {
  // Get shapes to export
  const selectedIds = editor.getSelectedShapeIds();
  const ids = options.selectedOnly 
    ? Array.from(selectedIds)
    : editor.getCurrentPageShapes().map(s => s.id);
  
  if (ids.length === 0) {
    throw new Error('No shapes to export');
  }
  
  // Use tldraw's export API
  const result = await editor.getSvgString(ids, {
    background: options.background ?? true,
  });
  
  if (!result || !result.svg) {
    throw new Error('Failed to export SVG');
  }
  
  // Convert SVG string to blob
  const blob = new Blob([result.svg], { type: 'image/svg+xml' });
  
  // Validate file size (limit to 50MB)
  if (blob.size > MAX_FILE_SIZE) {
    throw new Error('Export file too large (max 50MB).');
  }
  
  return blob;
}

/**
 * Download a blob as a file
 * 
 * @param blob - File blob to download
 * @param filename - Name for downloaded file
 */
export function downloadFile(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Generate a filename with timestamp
 * 
 * @param format - File format (png or svg)
 * @returns Filename string like "canvas-2024-10-16-143022.png"
 */
export function generateFilename(format: 'png' | 'svg'): string {
  const now = new Date();
  const timestamp = now.toISOString().replace(/[:.]/g, '-').slice(0, -5);
  return `canvas-${timestamp}.${format}`;
}

/**
 * Validate if export is possible
 * 
 * @param editor - tldraw editor instance
 * @param selectedOnly - Whether to check selection or all shapes
 * @returns Validation result with error message if invalid
 */
export function validateExport(
  editor: Editor | null,
  selectedOnly: boolean
): { valid: boolean; error?: string } {
  if (!editor) {
    return { valid: false, error: 'Editor not initialized' };
  }

  const selectedIds = editor.getSelectedShapeIds();
  const ids = selectedOnly 
    ? Array.from(selectedIds)
    : editor.getCurrentPageShapes().map(s => s.id);
  
  if (ids.length === 0) {
    return { 
      valid: false, 
      error: selectedOnly 
        ? 'No shapes selected. Select shapes or choose "Export All".' 
        : 'Canvas is empty. Add shapes before exporting.' 
    };
  }

  return { valid: true };
}

/**
 * Check if file size is large and should show warning
 * 
 * @param size - File size in bytes
 * @returns Object with warning flag and message
 */
export function checkFileSize(size: number): { shouldWarn: boolean; message?: string } {
  if (size > WARN_FILE_SIZE) {
    const sizeMB = (size / 1024 / 1024).toFixed(1);
    return { 
      shouldWarn: true, 
      message: `Large file size (${sizeMB}MB). Download may take longer.` 
    };
  }
  return { shouldWarn: false };
}
