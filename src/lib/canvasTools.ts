/**
 * Canvas Tools - Shape creation and manipulation utilities for tldraw
 * 
 * This module provides high-level functions for creating and manipulating shapes
 * on the collaborative canvas. It includes:
 * 
 * - Basic shape creation (rectangles, text, circles, arrows, etc.)
 * - Shape manipulation (moving, transforming)
 * - Layout utilities (arranging, grid creation)
 * - Complex UI components (login forms, cards, navigation bars, checkbox lists)
 * 
 * All functions follow a consistent pattern:
 * 1. Accept editor instance and optional parameters
 * 2. Calculate viewport center for positioning
 * 3. Create shapes using tldraw API
 * 4. Return array of created shape IDs
 * 5. Select created shapes automatically
 */

import { type Editor, type TLShapeId, type TLShape, toRichText, createShapeId } from '@tldraw/tldraw';

/**
 * Shape definition interface for batch creation
 * Used internally to define multiple shapes before creating them
 */
interface ShapeDefinition {
  shapeType: 'rectangle' | 'text';
  x: number;
  y: number;
  width: number;
  height: number;
  text?: string;
  fontSize?: number;
  color?: string;
}

/**
 * Valid tldraw color values
 * These are the color names supported by tldraw's shape props
 */
type TldrawColor = 
  | 'black' 
  | 'grey' 
  | 'light-violet' 
  | 'violet' 
  | 'blue' 
  | 'light-blue' 
  | 'yellow' 
  | 'orange' 
  | 'green' 
  | 'light-green' 
  | 'light-red' 
  | 'red';

/**
 * Maps user-friendly color names to tldraw color values
 * Provides backwards compatibility and easier color selection
 * 
 * @param color - User-provided color string
 * @returns Valid tldraw color value
 */
function mapToTldrawColor(color: string): TldrawColor {
  const colorMap: Record<string, TldrawColor> = {
  'black': 'black',
  'grey': 'grey',
    'gray': 'grey',
    'light-violet': 'light-violet',
    'violet': 'violet',
    'purple': 'violet',
  'blue': 'blue',
  'light-blue': 'light-blue',
  'yellow': 'yellow',
  'orange': 'orange',
    'green': 'green',
    'light-green': 'light-green',
    'light-red': 'light-red',
    'red': 'red',
  };

  const normalizedColor = color.toLowerCase();
  return colorMap[normalizedColor] || 'black';
}

/**
 * Maps font size (in pixels) to tldraw text size values
 * Tldraw uses named sizes: s, m, l, xl
 * 
 * @param fontSize - Font size in pixels
 * @returns Tldraw text size value
 */
function mapFontSize(fontSize: number): 's' | 'm' | 'l' | 'xl' {
  if (fontSize <= 16) return 's';
  if (fontSize <= 24) return 'm';
  if (fontSize <= 32) return 'l';
  return 'xl';
}

/**
 * Maps user-friendly shape type names to tldraw geo shape types
 * Handles common aliases like "circle" -> "ellipse"
 * 
 * @param shapeType - User-friendly shape type name
 * @returns Tldraw geo shape type
 */
function mapToTldrawGeoType(shapeType: string): string {
  const mapping: Record<string, string> = {
    'circle': 'ellipse',  // tldraw uses 'ellipse' for circles
    'square': 'rectangle', // square is just a rectangle with equal sides
  };
  
  return mapping[shapeType.toLowerCase()] || shapeType;
}

/**
 * Gets the center point of the current viewport
 * Used to position shapes in the middle of the user's view
 * 
 * @param editor - tldraw editor instance
 * @returns Object with x and y coordinates of viewport center
 */
function getViewportCenter(editor: Editor): { x: number; y: number } {
  const viewport = editor.getViewportPageBounds();
  return {
    x: viewport.x + viewport.width / 2,
    y: viewport.y + viewport.height / 2,
  };
}

/**
 * Resolve position keyword to absolute page coordinate
 * Captures viewport once to avoid race conditions during pan/zoom
 * 
 * @param editor - tldraw editor instance
 * @param keyword - Position keyword or number
 * @param axis - 'x' or 'y'
 * @returns Absolute page coordinate
 */
function resolvePositionKeyword(
  editor: Editor,
  keyword: string | number,
  axis: 'x' | 'y'
): number {
  if (typeof keyword === 'number') return keyword;
  
  const viewport = editor.getViewportPageBounds();
  
  if (axis === 'x') {
    switch (keyword.toLowerCase()) {
      case 'center': return viewport.x + viewport.width / 2;
      case 'left': return viewport.x + 100;
      case 'right': return viewport.x + viewport.width - 100;
      default: return viewport.x + viewport.width / 2;
    }
  } else {
    switch (keyword.toLowerCase()) {
      case 'center': return viewport.y + viewport.height / 2;
      case 'top': return viewport.y + 100;
      case 'bottom': return viewport.y + viewport.height - 100;
      default: return viewport.y + viewport.height / 2;
    }
  }
}

/**
 * Calculate union bounds of multiple shapes
 * Returns bounding box that encompasses all shapes (preserves layout)
 * Uses editor.getShapePageBounds() to properly handle rotation, groups, and transforms
 * 
 * @param editor - tldraw editor instance
 * @param shapes - Array of tldraw shapes
 * @returns Union bounds with center point
 */
function getUnionBounds(editor: Editor, shapes: TLShape[]): { 
  x: number; 
  y: number; 
  width: number; 
  height: number;
  centerX: number;
  centerY: number;
} {
  if (shapes.length === 0) {
    throw new Error('Cannot compute bounds of empty shape array');
  }
  
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  
  shapes.forEach((shape) => {
    // Use editor.getShapePageBounds() for accurate bounds (handles rotation, groups, transforms)
    const bounds = editor.getShapePageBounds(shape.id);
    if (!bounds) return; // Skip if bounds cannot be determined
    
    minX = Math.min(minX, bounds.minX);
    minY = Math.min(minY, bounds.minY);
    maxX = Math.max(maxX, bounds.maxX);
    maxY = Math.max(maxY, bounds.maxY);
  });
  
  const width = maxX - minX;
  const height = maxY - minY;
  
  return {
    x: minX,
    y: minY,
    width,
    height,
    centerX: minX + width / 2,
    centerY: minY + height / 2,
  };
}

/**
 * Validate shapes can be moved
 * Returns valid and invalid shapes with reasons
 * 
 * @param editor - tldraw editor instance
 * @param shapes - Array of shapes to validate
 * @returns Object with valid and invalid shape arrays
 */
function validateMovableShapes(editor: Editor, shapes: any[]): {
  valid: any[];
  invalid: Array<{ shape: any; reason: string }>;
} {
  const valid: any[] = [];
  const invalid: Array<{ shape: any; reason: string }> = [];
  
  const currentPage = editor.getCurrentPageId();
  
  shapes.forEach((shape) => {
    // Check if shape exists
    if (!shape) {
      invalid.push({ shape, reason: 'Shape does not exist' });
      return;
    }
    
    // Check if on current page
    if (shape.parentId !== currentPage) {
      invalid.push({ shape, reason: 'Shape is on a different page' });
      return;
    }
    
    // Check if locked
    if (shape.isLocked) {
      invalid.push({ shape, reason: 'Shape is locked' });
      return;
    }
    
    valid.push(shape);
  });
  
  return { valid, invalid };
}

/**
 * Creates multiple shapes from an array of shape definitions
 * Handles both rectangles and text shapes
 * 
 * @param editor - tldraw editor instance
 * @param shapes - Array of shape definitions to create
 * @returns Array of created shape IDs
 */
function createMultiShapeLayout(
  editor: Editor,
  shapes: ShapeDefinition[]
): TLShapeId[] {
  const createdIds: TLShapeId[] = [];

  for (const shape of shapes) {
    if (shape.shapeType === 'rectangle') {
      // Create geo (rectangle) shape
      const shapeId = createShapeId();
      editor.createShape({
        id: shapeId,
        type: 'geo',
        x: shape.x - shape.width / 2,
        y: shape.y - shape.height / 2,
        props: {
          geo: 'rectangle',
          w: shape.width,
          h: shape.height,
          color: shape.color as TldrawColor || 'black',
          fill: 'solid',
        },
      });
      createdIds.push(shapeId);
    } else if (shape.shapeType === 'text') {
      // Create text shape
      const shapeId = createShapeId();
      editor.createShapes([
        {
          id: shapeId,
          type: 'text',
          x: shape.x - shape.width / 2,
          y: shape.y - shape.height / 2,
          props: {
            richText: toRichText(shape.text || ''),
            w: shape.width,
            size: mapFontSize(shape.fontSize || 16),
            color: shape.color as TldrawColor || 'black',
            autoSize: false,
          },
        },
      ]);
      createdIds.push(shapeId);
    }
  }

  return createdIds;
}

// ==========================================
// BASIC SHAPE CREATION FUNCTIONS
// ==========================================

/**
 * Create a basic shape on the canvas
 * 
 * @param editor - tldraw editor instance
 * @param type - Shape type ('rectangle', 'circle', 'triangle', 'hexagon', 'diamond', 'text')
 * @param x - X coordinate (default: viewport center)
 * @param y - Y coordinate (default: viewport center)
 * @param width - Shape width (default: 200)
 * @param height - Shape height (default: 150)
 * @param color - Shape color (default: 'black')
 * @returns Created shape ID
 */
export interface CreateShapeParams {
  type: 'rectangle' | 'circle' | 'triangle' | 'hexagon' | 'diamond' | 'text';
    x?: number;
    y?: number;
    width?: number;
    height?: number;
    color?: string;
  text?: string;
}

export function createShape(
  editor: Editor,
  params: CreateShapeParams
): TLShapeId {
  if (!editor) {
    throw new Error('Editor is required');
  }

  const center = getViewportCenter(editor);
  const {
    type,
    x = center.x,
    y = center.y,
    width = 200,
    height = 150,
    color = 'black',
    text = '',
  } = params;

  console.log(`[createShape] Creating ${type} at (${x}, ${y})`);

  if (type === 'text') {
    const shapeId = createShapeId();
    editor.createShapes([
      {
      id: shapeId,
        type: 'text',
        x: x - width / 2,
        y: y - height / 2,
      props: {
          richText: toRichText(text),
          w: width,
          size: 'm',
          color: mapToTldrawColor(color),
          autoSize: false,
        },
      },
    ]);
    editor.select(shapeId);
    return shapeId;
  } else {
    const shapeId = createShapeId();
    editor.createShape({
      id: shapeId,
      type: 'geo',
      x: x - width / 2,
      y: y - height / 2,
      props: {
        geo: mapToTldrawGeoType(type),
        w: width,
        h: height,
        color: mapToTldrawColor(color),
        fill: 'solid',
      },
    });
  editor.select(shapeId);
  return shapeId;
  }
}

/**
 * Create a text shape on the canvas
 * 
 * @param editor - tldraw editor instance
 * @param text - Text content
 * @param x - X coordinate (default: viewport center)
 * @param y - Y coordinate (default: viewport center)
 * @param fontSize - Font size (default: 16)
 * @param color - Text color (default: 'black')
 * @returns Created shape ID
 */
export interface CreateTextShapeParams {
    text: string;
    x?: number;
    y?: number;
    fontSize?: number;
    color?: string;
  }

export function createTextShape(
  editor: Editor,
  params: CreateTextShapeParams
): TLShapeId {
  if (!editor) {
    throw new Error('Editor is required');
  }

  const center = getViewportCenter(editor);
  const {
    text,
    x = center.x,
    y = center.y,
    fontSize = 16,
    color = 'black',
  } = params;

  console.log(`[createTextShape] Creating text: "${text}" at (${x}, ${y})`);

  const shapeId = createShapeId();
  editor.createShapes([
    {
    id: shapeId,
    type: 'text',
      x: x - 100,
      y: y - 25,
    props: {
        richText: toRichText(text),
        w: 200,
        size: mapFontSize(fontSize),
        color: mapToTldrawColor(color),
        autoSize: true,
      },
    },
  ]);

  editor.select(shapeId);
  return shapeId;
}

// ==========================================
// SHAPE MANIPULATION FUNCTIONS
// ==========================================

/**
 * Move a shape to a new position
 * 
 * @param editor - tldraw editor instance
 * @param shapeId - ID of shape to move
 * @param deltaX - Horizontal movement distance
 * @param deltaY - Vertical movement distance
 */
export interface MoveShapeParams {
  shapeId: TLShapeId;
  deltaX: number;
  deltaY: number;
}

export function moveShape(
  editor: Editor,
  params: MoveShapeParams
): void {
  if (!editor) {
    throw new Error('Editor is required');
  }

  const { shapeId, deltaX, deltaY } = params;

  console.log(`[moveShape] Moving shape ${shapeId} by (${deltaX}, ${deltaY})`);

  const shape = editor.getShape(shapeId);
  if (!shape) {
    throw new Error(`Shape with ID ${shapeId} not found`);
  }

      editor.updateShape({
    id: shapeId,
        type: shape.type,
    x: shape.x + deltaX,
    y: shape.y + deltaY,
  });
}

/**
 * Move shapes to absolute position (supports keywords)
 * Preserves relative layout by moving union bounds, not individual shapes
 * Uses editor.run() to group updates into single transaction
 * 
 * @param editor - tldraw editor instance
 * @param params - Move parameters with keyword support
 * @returns Result with count, moved IDs, skipped shapes, and whether movement actually occurred
 */
export interface MoveShapeToParams {
  target: 'selected' | 'all' | TLShapeId | TLShapeId[];
  x?: string | number; // 'center' | 'left' | 'right' | number
  y?: string | number; // 'center' | 'top' | 'bottom' | number
  deltaX?: number; // Backward compat: relative movement
  deltaY?: number; // Backward compat: relative movement
}

export function moveShapeTo(
  editor: Editor,
  params: MoveShapeToParams
): { 
  count: number; 
  moved: TLShapeId[];
  skipped: Array<{ id: TLShapeId | undefined; reason: string }>;
  actuallyMoved: boolean;
} {
  if (!editor) {
    throw new Error('Editor is required');
  }

  const { target, x, y, deltaX, deltaY } = params;
  
  // Backward compatibility: if deltaX/deltaY provided, use relative movement
  if (deltaX !== undefined || deltaY !== undefined) {
    return moveShapesByDelta(editor, { target, deltaX: deltaX || 0, deltaY: deltaY || 0 });
  }
  
  // Must provide at least x or y
  if (x === undefined && y === undefined) {
    throw new Error('Must provide at least one of: x, y, deltaX, deltaY');
  }
  
  // Resolve target shapes
  let shapes: any[];
  if (target === 'selected') {
    shapes = editor.getSelectedShapes();
    if (shapes.length === 0) {
      throw new Error('No shapes selected. Please select at least one shape first.');
    }
  } else if (target === 'all') {
    shapes = editor.getCurrentPageShapes();
  } else if (Array.isArray(target)) {
    shapes = target.map(id => editor.getShape(id)).filter(Boolean);
  } else {
    const shape = editor.getShape(target as TLShapeId);
    shapes = shape ? [shape] : [];
  }

  // Validate movable shapes
  const { valid, invalid } = validateMovableShapes(editor, shapes);
  
  if (valid.length === 0) {
    const reasons = invalid.map(i => i.reason).join(', ');
    throw new Error(`No movable shapes found. Reasons: ${reasons}`);
  }

  // Capture viewport once (avoid race conditions)
  const targetX = x !== undefined ? resolvePositionKeyword(editor, x, 'x') : null;
  const targetY = y !== undefined ? resolvePositionKeyword(editor, y, 'y') : null;

  // Get union bounds of all shapes (to preserve layout)
  const unionBounds = getUnionBounds(editor, valid);
  
  // Calculate delta to move union center to target
  const deltaToCenter = {
    x: targetX !== null ? targetX - unionBounds.centerX : 0,
    y: targetY !== null ? targetY - unionBounds.centerY : 0,
  };
  
  // Check if delta is significant (avoid no-op from rounding)
  const MIN_MOVEMENT = 0.5; // pixels
  const willActuallyMove = Math.abs(deltaToCenter.x) >= MIN_MOVEMENT || 
                           Math.abs(deltaToCenter.y) >= MIN_MOVEMENT;
  
  if (!willActuallyMove) {
    return {
      count: valid.length,
      moved: valid.map(s => s.id),
      skipped: invalid.map(i => ({ id: i.shape?.id, reason: i.reason })),
      actuallyMoved: false,
    };
  }

  // Perform movement (wrapped in editor.run() for single undo entry)
  const movedIds: TLShapeId[] = [];
  
  editor.run(() => {
    valid.forEach((shape) => {
      const newX = targetX !== null ? shape.x + deltaToCenter.x : shape.x;
      const newY = targetY !== null ? shape.y + deltaToCenter.y : shape.y;
      
      editor.updateShape({
        id: shape.id,
        type: shape.type,
        x: newX,
        y: newY,
      });
      
      movedIds.push(shape.id);
    });
  });

  console.log(`[moveShapeTo] Moved ${movedIds.length} shapes by delta (${deltaToCenter.x.toFixed(1)}, ${deltaToCenter.y.toFixed(1)})`);
  
  return {
    count: movedIds.length,
    moved: movedIds,
    skipped: invalid.map(i => ({ id: i.shape?.id, reason: i.reason })),
    actuallyMoved: true,
  };
}

/**
 * Backward compatibility: move by relative delta
 * Internal helper function for moveShapeTo
 * 
 * @param editor - tldraw editor instance
 * @param params - Target and delta parameters
 * @returns Result with count, moved IDs, skipped shapes, and whether movement actually occurred
 */
function moveShapesByDelta(
  editor: Editor,
  params: { target: any; deltaX: number; deltaY: number }
): { count: number; moved: TLShapeId[]; skipped: Array<{ id: TLShapeId | undefined; reason: string }>; actuallyMoved: boolean } {
  // Reuse validation logic
  let shapes: any[];
  if (params.target === 'selected') {
    shapes = editor.getSelectedShapes();
  } else if (params.target === 'all') {
    shapes = editor.getCurrentPageShapes();
  } else if (Array.isArray(params.target)) {
    shapes = params.target.map(id => editor.getShape(id)).filter(Boolean);
  } else {
    const shape = editor.getShape(params.target);
    shapes = shape ? [shape] : [];
  }
  
  const { valid, invalid } = validateMovableShapes(editor, shapes);
  
  if (valid.length === 0) {
    throw new Error('No movable shapes found');
  }
  
  const movedIds: TLShapeId[] = [];
  
  editor.run(() => {
    valid.forEach((shape) => {
      editor.updateShape({
        id: shape.id,
        type: shape.type,
        x: shape.x + params.deltaX,
        y: shape.y + params.deltaY,
      });
      movedIds.push(shape.id);
    });
  });
  
  return {
    count: movedIds.length,
    moved: movedIds,
    skipped: invalid.map(i => ({ id: i.shape?.id, reason: i.reason })),
    actuallyMoved: Math.abs(params.deltaX) > 0.5 || Math.abs(params.deltaY) > 0.5,
  };
}

/**
 * Transform a shape (resize, rotate)
 * 
 * @param editor - tldraw editor instance
 * @param shapeId - ID of shape to transform
 * @param scaleX - Horizontal scale factor (optional)
 * @param scaleY - Vertical scale factor (optional)
 * @param rotation - Rotation angle in degrees (optional)
 */
export interface TransformShapeParams {
  shapeId: TLShapeId;
  scaleX?: number;
  scaleY?: number;
  rotation?: number;
}

export function transformShape(
  editor: Editor,
  params: TransformShapeParams
): void {
  if (!editor) {
    throw new Error('Editor is required');
  }

  const { shapeId, scaleX, scaleY, rotation } = params;

  console.log(`[transformShape] Transforming shape ${shapeId}`);

  const shape = editor.getShape(shapeId);
  if (!shape) {
    throw new Error(`Shape with ID ${shapeId} not found`);
  }

    const updates: any = {
    id: shapeId,
      type: shape.type,
    };

  // Handle scaling for geo shapes
  if (shape.type === 'geo' && (scaleX !== undefined || scaleY !== undefined)) {
    const currentProps = shape.props as any;
        updates.props = {
      ...currentProps,
      w: scaleX !== undefined ? currentProps.w * scaleX : currentProps.w,
      h: scaleY !== undefined ? currentProps.h * scaleY : currentProps.h,
    };
  }

  // Handle rotation
    if (rotation !== undefined) {
      const radians = (rotation * Math.PI) / 180;
      updates.rotation = radians;
    }

    editor.updateShape(updates);
}

// ==========================================
// LAYOUT FUNCTIONS
// ==========================================

/**
 * Arrange shapes in a specified layout pattern
 * 
 * @param editor - tldraw editor instance
 * @param shapeIds - Array of shape IDs to arrange
 * @param pattern - Layout pattern ('horizontal', 'vertical', 'grid')
 * @param spacing - Space between shapes (default: 20)
 */
export interface ArrangeShapesParams {
  shapeIds: TLShapeId[];
  pattern: 'horizontal' | 'vertical' | 'grid';
  spacing?: number;
}

export function arrangeShapes(
  editor: Editor,
  params: ArrangeShapesParams
): void {
  if (!editor) {
    throw new Error('Editor is required');
  }

  const { shapeIds, pattern, spacing = 20 } = params;

  console.log(`[arrangeShapes] Arranging ${shapeIds.length} shapes in ${pattern} pattern`);

  if (shapeIds.length === 0) {
    throw new Error('No shape IDs provided');
  }

  const center = getViewportCenter(editor);
  const shapes = shapeIds.map(id => editor.getShape(id)).filter(Boolean);

  if (pattern === 'horizontal') {
    const totalWidth = shapes.reduce((sum, shape: any) => {
      const width = shape.type === 'geo' ? shape.props.w : 200;
      return sum + width + spacing;
    }, -spacing);

    let currentX = center.x - totalWidth / 2;

    editor.run(() => {
      shapes.forEach((shape: any) => {
        const width = shape.type === 'geo' ? shape.props.w : 200;
        editor.updateShape({
          id: shape.id,
          type: shape.type,
          x: currentX,
          y: center.y - (shape.type === 'geo' ? shape.props.h / 2 : 25),
        });
        currentX += width + spacing;
      });
    });
  } else if (pattern === 'vertical') {
    const totalHeight = shapes.reduce((sum, shape: any) => {
      const height = shape.type === 'geo' ? shape.props.h : 50;
      return sum + height + spacing;
    }, -spacing);

    let currentY = center.y - totalHeight / 2;

    editor.run(() => {
      shapes.forEach((shape: any) => {
        const height = shape.type === 'geo' ? shape.props.h : 50;
      editor.updateShape({
        id: shape.id,
        type: shape.type,
          x: center.x - (shape.type === 'geo' ? shape.props.w / 2 : 100),
          y: currentY,
        });
        currentY += height + spacing;
      });
    });
  } else if (pattern === 'grid') {
    const cols = Math.ceil(Math.sqrt(shapes.length));
    const rows = Math.ceil(shapes.length / cols);
    const cellWidth = 220;
    const cellHeight = 170;
    const totalWidth = cols * cellWidth;
    const totalHeight = rows * cellHeight;

    editor.run(() => {
      shapes.forEach((shape: any, index) => {
        const col = index % cols;
        const row = Math.floor(index / cols);
        const x = center.x - totalWidth / 2 + col * cellWidth + cellWidth / 2;
        const y = center.y - totalHeight / 2 + row * cellHeight + cellHeight / 2;

        editor.updateShape({
          id: shape.id,
          type: shape.type,
          x: x - (shape.type === 'geo' ? shape.props.w / 2 : 100),
          y: y - (shape.type === 'geo' ? shape.props.h / 2 : 25),
        });
      });
    });
  }
}

/**
 * Create a grid of shapes
 * 
 * @param editor - tldraw editor instance
 * @param rows - Number of rows
 * @param cols - Number of columns
 * @param shapeType - Type of shapes to create (default: 'rectangle')
 * @param spacing - Space between shapes (default: 20)
 * @param color - Shape color (default: 'black')
 * @returns Array of created shape IDs
 */
export interface CreateGridParams {
  rows: number;
  cols: number;
  shapeType?: 'rectangle' | 'circle' | 'triangle';
  spacing?: number;
  color?: string;
}

export function createGrid(
  editor: Editor,
  params: CreateGridParams
): TLShapeId[] {
  if (!editor) {
    throw new Error('Editor is required');
  }

  const {
    rows,
    cols,
    shapeType = 'rectangle',
    spacing = 20,
    color = 'black',
  } = params;

  console.log(`[createGrid] Creating ${rows}x${cols} grid of ${shapeType}s`);

  const center = getViewportCenter(editor);
  const cellWidth = 100;
  const cellHeight = 100;
  const totalWidth = cols * (cellWidth + spacing) - spacing;
  const totalHeight = rows * (cellHeight + spacing) - spacing;

  const shapeIds: TLShapeId[] = [];

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const x = center.x - totalWidth / 2 + col * (cellWidth + spacing);
      const y = center.y - totalHeight / 2 + row * (cellHeight + spacing);

      const shapeId = createShapeId();
      editor.createShape({
        id: shapeId,
        type: 'geo',
        x,
        y,
        props: {
          geo: mapToTldrawGeoType(shapeType),
          w: cellWidth,
          h: cellHeight,
          color: mapToTldrawColor(color),
          fill: 'solid',
        },
      });
      shapeIds.push(shapeId);
    }
  }

  editor.select(...shapeIds);
  return shapeIds;
}

// ==========================================
// COMPLEX UI COMPONENT FUNCTIONS
// ==========================================

/**
 * Create a login form
 * 
 * Creates 8 shapes:
 * 1. Form container (400x300, light-blue)
 * 2. Title text ("Login", 24px, centered)
 * 3. Username label ("Username", 16px)
 * 4. Username input field (300x40, white)
 * 5. Password label ("Password", 16px)
 * 6. Password input field (300x40, white)
 * 7. Login button (200x40, blue)
 * 8. Button text ("Login", 16px, white)
 * 
 * @param editor - tldraw editor instance
 * @param params - Login form parameters
 * @returns Array of created shape IDs
 */
export interface CreateLoginFormParams {
  title?: string;        // Form title (default: "Login")
  color?: string;       // Form background color (default: "light-blue")
}

export function createLoginForm(
  editor: Editor,
  params: CreateLoginFormParams = {}
): TLShapeId[] {
  if (!editor) {
    throw new Error('Editor is required');
  }

  const {
    title = 'Login',
    color = 'light-blue',
  } = params;

  console.log('[createLoginForm] Creating login form with 8 shapes');

  const center = getViewportCenter(editor);
  
  // Define the 8 shapes for the login form
  const shapes: ShapeDefinition[] = [
    // 1. Form container (400x300, customizable color)
    {
      shapeType: 'rectangle',
      x: center.x,
      y: center.y,
      width: 400,
      height: 300,
      color: mapToTldrawColor(color),
    },
    // 2. Title text ("Login", 24px, centered at top)
    {
      shapeType: 'text',
      x: center.x,
      y: center.y - 110,
      width: 300,
      height: 35,
      text: title,
      fontSize: 24,
      color: 'black',
    },
    // 3. Username label ("Username", 16px)
    {
      shapeType: 'text',
      x: center.x,
      y: center.y - 60,
      width: 300,
      height: 25,
      text: 'Username',
      fontSize: 16,
      color: 'black',
    },
    // 4. Username input field (300x40, white)
    {
      shapeType: 'rectangle',
      x: center.x,
      y: center.y - 30,
      width: 300,
      height: 40,
      color: 'grey',
    },
    // 5. Password label ("Password", 16px)
    {
      shapeType: 'text',
      x: center.x,
      y: center.y + 20,
      width: 300,
      height: 25,
      text: 'Password',
      fontSize: 16,
      color: 'black',
    },
    // 6. Password input field (300x40, white)
    {
      shapeType: 'rectangle',
      x: center.x,
      y: center.y + 50,
      width: 300,
      height: 40,
      color: 'grey',
    },
    // 7. Login button (200x40, blue)
    {
      shapeType: 'rectangle',
      x: center.x,
      y: center.y + 105,
      width: 200,
      height: 40,
      color: 'blue',
    },
    // 8. Button text ("Login", 16px, white)
    {
      shapeType: 'text',
      x: center.x,
      y: center.y + 105,
      width: 180,
      height: 28,
      text: 'Login',
      fontSize: 16,
      color: 'white',
    },
  ];

  // Create all shapes
  const createdShapeIds = createMultiShapeLayout(editor, shapes);

  console.log(`[createLoginForm] Created ${createdShapeIds.length} shapes`);

  // Select all created shapes
  if (createdShapeIds.length > 0) {
    editor.select(...createdShapeIds);
  }

  return createdShapeIds;
}

/**
 * Create a card component
 * 
 * Creates 7 shapes:
 * 1. Card background (300x280, customizable color)
 * 2. Image/icon placeholder (280x100, grey)
 * 3. Title text (size: 24, black, bold)
 * 4. Subtitle text (size: 16, grey)
 * 5. Body content text (size: 14, black)
 * 6. Action button (160x40, blue)
 * 7. Action button text ("View More", size: 16, white)
 * 
 * @param editor - tldraw editor instance
 * @param params - Card parameters
 * @returns Array of created shape IDs
 */
export interface CreateCardParams {
  title?: string;       // Card title (default: "Card Title")
  subtitle?: string;    // Card subtitle (default: "Card subtitle")
  color?: string;       // Card background color (default: "light-blue")
}

export function createCard(
  editor: Editor,
  params: CreateCardParams = {}
): TLShapeId[] {
  if (!editor) {
    throw new Error('Editor is required');
  }

  const {
    title = 'Card Title',
    subtitle = 'Card subtitle',
    color = 'light-blue',
  } = params;

  console.log('[createCard] Creating card with 7 shapes');

  const center = getViewportCenter(editor);
  
  // Define the 7 shapes for the card (matching createLoginForm's depth)
  const shapes: ShapeDefinition[] = [
    // 1. Card background (300x280, customizable color)
    {
      shapeType: 'rectangle',
      x: center.x,
      y: center.y,
      width: 300,
      height: 280,
      color: mapToTldrawColor(color),
    },
    // 2. Image/icon placeholder area (280x100, grey)
    {
      shapeType: 'rectangle',
      x: center.x,
      y: center.y - 90,
      width: 280,
      height: 100,
      color: 'grey',
    },
    // 3. Title text (size: 24, black, bold)
    {
      shapeType: 'text',
      x: center.x,
      y: center.y + 5,
      width: 280,
      height: 35,
      text: title,
      fontSize: 24,
      color: 'black',
    },
    // 4. Subtitle/description text (size: 16, grey)
    {
      shapeType: 'text',
      x: center.x,
      y: center.y + 40,
      width: 280,
      height: 28,
      text: subtitle,
      fontSize: 16,
      color: 'grey',
    },
    // 5. Body content text (size: 14, black)
    {
      shapeType: 'text',
      x: center.x,
      y: center.y + 70,
      width: 280,
      height: 25,
      text: 'Card body content goes here...',
      fontSize: 14,
      color: 'black',
    },
    // 6. Action button (160x40, blue)
    {
      shapeType: 'rectangle',
      x: center.x,
      y: center.y + 110,
      width: 160,
      height: 40,
      color: 'blue',
    },
    // 7. Action button text ("View More", size: 16, white)
    {
      shapeType: 'text',
      x: center.x,
      y: center.y + 110,
      width: 140,
      height: 28,
      text: 'View More',
      fontSize: 16,
      color: 'white',
    },
  ];

  // Create all shapes
  const createdShapeIds = createMultiShapeLayout(editor, shapes);

  console.log(`[createCard] Created ${createdShapeIds.length} shapes`);

  // Select all created shapes
  if (createdShapeIds.length > 0) {
    editor.select(...createdShapeIds);
  }

  return createdShapeIds;
}

/**
 * Create a professional navigation bar
 * 
 * Creates 6 shapes:
 * 1. Nav bar background (900x70, modern gradient-like appearance)
 * 2. Logo text (left side, bold and prominent)
 * 3. Home menu item text (right-aligned)
 * 4. About menu item text (right-aligned)
 * 5. Services menu item text (right-aligned)
 * 6. Contact menu item text (right-aligned)
 * 
 * @param editor - tldraw editor instance
 * @param params - Navigation bar parameters
 * @returns Array of created shape IDs
 */
export interface CreateNavigationBarParams {
  menuItems?: string[]; // Array of menu item labels (default: ['Home', 'About', 'Services', 'Contact'])
  logoText?: string; // Logo text (default: "JellyBoard")
  color?: string; // Nav bar background color (default: "blue")
}

export function createNavigationBar(
  editor: Editor,
  params: CreateNavigationBarParams = {}
): TLShapeId[] {
  if (!editor) {
    throw new Error('Editor is required');
  }

  const {
    menuItems = ['Home', 'About', 'Services', 'Contact'],
    logoText = 'JellyBoard',
    color = 'blue',
  } = params;

  console.log('[createNavigationBar] Creating professional navigation bar with menu items:', menuItems);

  const center = getViewportCenter(editor);
  
  // Professional navigation bar dimensions
  const navWidth = 900;
  const navHeight = 70;
  const logoLeftMargin = 60;
  const menuRightMargin = 60;
  const menuItemSpacing = 50;

  const shapes: ShapeDefinition[] = [];

  // 1. Nav bar background (900x70, modern blue)
  shapes.push({
    shapeType: 'rectangle',
    x: center.x,
    y: center.y,
    width: navWidth,
    height: navHeight,
    color: mapToTldrawColor(color),
  });

  // 2. Logo text (left side, bold and prominent)
  shapes.push({
    shapeType: 'text',
    x: center.x - navWidth / 2 + logoLeftMargin + 10,
    y: center.y,
    width: 200,
    height: 40,
    text: logoText,
    fontSize: 28,
    color: 'black',
  });

  // 3-6. Create menu items (text only, no buttons for cleaner look)
  menuItems.forEach((item, index) => {
    const menuItemX = center.x + navWidth / 2 - menuRightMargin - (menuItems.length - 1 - index) * (120 + menuItemSpacing);
    
    // Menu item text (clean, no background)
    shapes.push({
      shapeType: 'text',
      x: menuItemX,
      y: center.y,
      width: 120,
      height: 30,
      text: item,
      fontSize: 18,
      color: 'black',
    });
  });

  // Create all shapes
  const createdShapeIds = createMultiShapeLayout(editor, shapes);

  console.log(`[createNavigationBar] Created ${createdShapeIds.length} shapes (nav bar + logo + ${menuItems.length} menu items)`);

  // Select all created shapes
  if (createdShapeIds.length > 0) {
    editor.select(...createdShapeIds);
  }

  return createdShapeIds;
}

/**
 * Create a checkbox list with variable item count
 * 
 * Creates 2 + (count * 2) shapes:
 * 1. Container background (300x[dynamic], customizable color)
 * 2. Title text ("Checklist", 20px, bold)
 * 3-N. Checkbox squares (20x20, grey) - one per item
 * 3-N. Checkbox label texts (beside each box) - one per item
 * 
 * Example: 3 items = 8 shapes total (1 container + 1 title + 3 boxes + 3 labels)
 * Example: 7 items = 16 shapes total (1 container + 1 title + 7 boxes + 7 labels)
 * 
 * @param editor - tldraw editor instance
 * @param params - Checkbox list parameters
 * @returns Array of created shape IDs
 */
export interface CreateCheckboxListParams {
  title?: string;           // Title text (default: "Checklist")
  items?: string[];         // Array of checkbox labels (default: ['Task 1', 'Task 2', 'Task 3'])
  color?: string;           // Container background color (default: 'light-blue')
  checkboxSize?: number;    // Size of checkbox squares (default: 20)
  spacing?: number;         // Vertical spacing between items (default: 12)
}

export function createCheckboxList(
  editor: Editor,
  params: CreateCheckboxListParams = {}
): TLShapeId[] {
  if (!editor) {
    throw new Error('Editor is required');
  }

  const {
    title = 'Checklist',
    items = ['Task 1', 'Task 2', 'Task 3'],
    color = 'light-blue',
    checkboxSize = 20,
    spacing = 12,
  } = params;

  console.log(`[createCheckboxList] Creating checkbox list with ${items.length} items`);

  const center = getViewportCenter(editor);
  
  // Calculate dynamic dimensions based on item count
  const containerWidth = 300;
  const containerPadding = 20;
  const checkboxLabelGap = 10;
  const titleHeight = 30;
  const titleBottomMargin = 10;
  const itemHeight = checkboxSize + spacing;
  const totalItemsHeight = items.length * itemHeight;
  const containerHeight = containerPadding * 2 + titleHeight + titleBottomMargin + totalItemsHeight;

  const shapes: ShapeDefinition[] = [];

  // 1. Container background
  shapes.push({
    shapeType: 'rectangle',
    x: center.x,
    y: center.y,
    width: containerWidth,
    height: containerHeight,
    color: mapToTldrawColor(color),
  });
  
  // 2. Title text
  shapes.push({
    shapeType: 'text',
    x: center.x,
    y: center.y - containerHeight / 2 + containerPadding + titleHeight / 2,
    width: containerWidth - containerPadding * 2,
    height: titleHeight,
    text: title,
    fontSize: 20,
    color: 'black',
  });

  // 3-N. Checkboxes and labels (dynamically generated based on items.length)
  const firstItemY = center.y - containerHeight / 2 + containerPadding + titleHeight + titleBottomMargin;
  
  items.forEach((item, index) => {
    const itemY = firstItemY + (index * itemHeight);
    const checkboxX = center.x - containerWidth / 2 + containerPadding;
    const labelX = checkboxX + checkboxSize + checkboxLabelGap;
    
    // Checkbox square
    shapes.push({
      shapeType: 'rectangle',
      x: checkboxX + checkboxSize / 2,
      y: itemY + checkboxSize / 2,
      width: checkboxSize,
      height: checkboxSize,
      color: 'grey',
    });

    // Checkbox label text
    shapes.push({
      shapeType: 'text',
      x: labelX + (containerWidth - containerPadding * 2 - checkboxSize - checkboxLabelGap) / 2,
      y: itemY + checkboxSize / 2,
      width: containerWidth - containerPadding * 2 - checkboxSize - checkboxLabelGap,
      height: checkboxSize,
      text: item,
      fontSize: 16,
      color: 'black',
    });
  });

  // Create all shapes
  const createdShapeIds = createMultiShapeLayout(editor, shapes);

  console.log(`[createCheckboxList] Created ${createdShapeIds.length} shapes (1 container + 1 title + ${items.length * 2} checkboxes/labels)`);

  // Select all created shapes
  if (createdShapeIds.length > 0) {
    editor.select(...createdShapeIds);
  }

  return createdShapeIds;
}
