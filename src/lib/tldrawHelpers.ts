/**
 * tldraw Helper Utilities
 * Provides coordinate conversion and shape serialization for tldraw integration
 */

import { Editor } from "@tldraw/tldraw";
import { Timestamp } from "firebase/firestore";
import { Shape, TldrawShape, Point } from "../types";

/**
 * Converts screen coordinates to page coordinates
 * Used for cursor position tracking and translating mouse events to canvas space
 * 
 * @param editor - The tldraw editor instance
 * @param screenPoint - Point in screen coordinates (pixels from viewport top-left)
 * @returns Point in page coordinates (accounting for zoom and pan)
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
 * @returns Shape object ready for Firestore persistence
 */
export function serializeShape(tldrawShape: TldrawShape, userId: string): Omit<Shape, 'createdAt' | 'updatedAt'> {
  return {
    id: tldrawShape.id,
    type: tldrawShape.type,
    x: tldrawShape.x,
    y: tldrawShape.y,
    rotation: tldrawShape.rotation || 0,
    props: tldrawShape.props || {},
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
    rotation: firestoreShape.rotation || 0,
    props: firestoreShape.props || {},
  };
}

/**
 * Validates if a shape object has required properties for serialization
 * Used to filter out invalid or incomplete shapes before sync
 * 
 * @param shape - Shape object to validate
 * @returns true if shape has all required properties
 */
export function isValidShape(shape: Partial<TldrawShape>): shape is TldrawShape {
  return (
    typeof shape.id === 'string' &&
    typeof shape.type === 'string' &&
    typeof shape.x === 'number' &&
    typeof shape.y === 'number'
  );
}

/**
 * Extracts shape data from tldraw editor's store
 * Filters for valid shape records only
 * 
 * @param editor - The tldraw editor instance
 * @returns Array of all valid shapes in the editor
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

/**
 * Throttles a function to execute at most once per specified interval
 * Used for cursor updates (30Hz = every 33ms)
 * 
 * @param func - Function to throttle
 * @param limit - Minimum time between executions in milliseconds
 * @returns Throttled function
 */
export function throttle<T extends (...args: unknown[]) => unknown>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;
  let lastResult: ReturnType<T>;

  return function (this: unknown, ...args: Parameters<T>): void {
    if (!inThrottle) {
      inThrottle = true;
      lastResult = func.apply(this, args) as ReturnType<T>;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

/**
 * Debounces a function to execute only after it stops being called
 * Used for shape updates (300ms delay after last change)
 * 
 * @param func - Function to debounce
 * @param wait - Time to wait after last call in milliseconds
 * @returns Debounced function
 */
export function debounce<T extends (...args: unknown[]) => unknown>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;

  return function (this: unknown, ...args: Parameters<T>): void {
    if (timeout) {
      clearTimeout(timeout);
    }
    timeout = setTimeout(() => {
      func.apply(this, args);
      timeout = null;
    }, wait);
  };
}

