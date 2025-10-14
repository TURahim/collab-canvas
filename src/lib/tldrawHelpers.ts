/**
 * tldraw Helper Utilities
 * Provides coordinate conversion and shape validation for tldraw integration
 * 
 * Note: throttle and debounce are imported from utils.ts to avoid duplication
 */

import type { Editor } from "@tldraw/tldraw";
import type { Point, Shape, TldrawShape } from "../types";

/**
 * Converts screen coordinates to page coordinates
 * Used for cursor position tracking and translating mouse events to canvas space
 * 
 * @param editor - The tldraw editor instance
 * @param screenPoint - Point in screen coordinates (pixels from viewport top-left)
 * @returns Point in page coordinates (accounting for zoom and pan)
 * 
 * @example
 * const pagePoint = screenToPage(editor, { x: 100, y: 200 });
 */
export function screenToPage(editor: Editor, screenPoint: Point): Point {
  const pagePoint = editor.screenToPage(screenPoint);
  return {
    x: pagePoint.x,
    y: pagePoint.y,
  };
}

/**
 * Converts page coordinates to screen coordinates
 * Used for rendering cursors and overlays at correct viewport positions
 * 
 * @param editor - The tldraw editor instance
 * @param pagePoint - Point in page coordinates (canvas space)
 * @returns Point in screen coordinates (viewport pixels)
 * 
 * @example
 * const screenPoint = pageToScreen(editor, { x: 500, y: 300 });
 */
export function pageToScreen(editor: Editor, pagePoint: Point): Point {
  const screenPoint = editor.pageToScreen(pagePoint);
  return {
    x: screenPoint.x,
    y: screenPoint.y,
  };
}

/**
 * Serializes a tldraw shape to Firebase Firestore format
 * Extracts essential properties and adds metadata
 * 
 * @param tldrawShape - Shape from tldraw editor
 * @param userId - ID of user who created/modified the shape
 * @returns Shape object ready for Firestore persistence (without timestamps)
 */
export function serializeShape(
  tldrawShape: TldrawShape,
  userId: string
): Omit<Shape, "createdAt" | "updatedAt"> {
  return {
    id: tldrawShape.id,
    type: tldrawShape.type,
    x: tldrawShape.x,
    y: tldrawShape.y,
    rotation: tldrawShape.rotation ?? 0,
    props: tldrawShape.props ?? {},
    createdBy: userId,
  };
}

/**
 * Deserializes a Firestore shape to tldraw format
 * Converts from storage format to tldraw-compatible shape
 * 
 * @param firestoreShape - Shape document from Firestore
 * @returns Shape object compatible with tldraw editor
 */
export function deserializeShape(firestoreShape: Shape): TldrawShape {
  return {
    id: firestoreShape.id,
    type: firestoreShape.type,
    x: firestoreShape.x,
    y: firestoreShape.y,
    rotation: firestoreShape.rotation ?? 0,
    props: firestoreShape.props ?? {},
  };
}

/**
 * Type guard to validate if a shape object has required properties
 * Used to filter out invalid or incomplete shapes before sync
 * 
 * @param shape - Partial shape object to validate
 * @returns Type predicate indicating if shape is valid TldrawShape
 */
export function isValidShape(shape: Partial<TldrawShape>): shape is TldrawShape {
  return (
    typeof shape.id === "string" &&
    typeof shape.type === "string" &&
    typeof shape.x === "number" &&
    typeof shape.y === "number"
  );
}

/**
 * Extracts all valid shapes from tldraw editor's current page
 * Filters out invalid shapes and maps to TldrawShape format
 * 
 * @param editor - The tldraw editor instance
 * @returns Array of all valid shapes on the current page
 */
export function getEditorShapes(editor: Editor): TldrawShape[] {
  const shapes = editor.getCurrentPageShapes();
  return shapes
    .map((shape) => ({
      id: shape.id,
      type: shape.type,
      x: shape.x,
      y: shape.y,
      rotation: shape.rotation,
      props: shape.props as Record<string, unknown> | undefined,
    }))
    .filter(isValidShape);
}

// Re-export throttle and debounce from utils to maintain backward compatibility
// These were previously defined here but have been consolidated in utils.ts
export { debounce, throttle } from "./utils";

