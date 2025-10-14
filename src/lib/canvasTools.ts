/**
 * Canvas Tool Functions
 * 
 * Executes AI commands by manipulating the tldraw canvas
 * These are the actual functions that create, move, and transform shapes
 */

import type { Editor, TLShapeId } from '@tldraw/tldraw';
import { nanoid } from 'nanoid';

/**
 * tldraw color type - only 13 valid colors
 */
type TLDefaultColorStyle = 'black' | 'grey' | 'light-violet' | 'violet' | 
  'blue' | 'light-blue' | 'yellow' | 'orange' | 'green' | 'light-green' | 
  'light-red' | 'red' | 'white';

/**
 * Map user-friendly color names to tldraw's 13 valid colors
 */
const TLDRAW_COLOR_MAP: Record<string, TLDefaultColorStyle> = {
  // Direct mappings - tldraw's 13 colors
  'black': 'black',
  'white': 'white',
  'grey': 'grey',
  'gray': 'grey', // US spelling
  
  // Reds
  'red': 'red',
  'light-red': 'light-red',
  'lightred': 'light-red',
  'pink': 'light-red', // pink → light-red
  'maroon': 'red',
  
  // Blues
  'blue': 'blue',
  'light-blue': 'light-blue',
  'lightblue': 'light-blue',
  'cyan': 'light-blue', // cyan → light-blue
  'teal': 'light-blue', // teal → light-blue
  'navy': 'blue',
  
  // Greens
  'green': 'green',
  'light-green': 'light-green',
  'lightgreen': 'light-green',
  'lime': 'light-green', // lime → light-green
  
  // Purples/Violets
  'violet': 'violet',
  'purple': 'violet', // purple → violet
  'light-violet': 'light-violet',
  'lightviolet': 'light-violet',
  'light-purple': 'light-violet',
  'lightpurple': 'light-violet',
  'indigo': 'violet',
  
  // Yellows/Oranges
  'yellow': 'yellow',
  'gold': 'yellow',
  'tan': 'yellow',
  'orange': 'orange',
  'brown': 'orange', // brown → orange (closest match)
};

/**
 * Default sizes for different shape types
 */
const DEFAULT_SIZES: Record<string, { width: number; height: number }> = {
  rectangle: { width: 200, height: 150 },
  ellipse: { width: 200, height: 200 },
  circle: { width: 200, height: 200 }, // Circle is an ellipse with equal dimensions
  triangle: { width: 200, height: 200 },
  arrow: { width: 200, height: 0 },
  text: { width: 200, height: 50 },
};

/**
 * Map color names to tldraw's valid color values
 * 
 * @param color - User-provided color name
 * @returns Valid tldraw color, defaults to 'blue' for visibility
 */
export function mapToTldrawColor(color: string | undefined): TLDefaultColorStyle {
  if (!color) return 'blue'; // Default to blue (more visible than black)
  
  const lowerColor = color.toLowerCase().trim();
  return TLDRAW_COLOR_MAP[lowerColor] || 'blue'; // Default to blue for unknown colors
}

/**
 * Get the center point of the current viewport
 */
export function getViewportCenter(editor: Editor): { x: number; y: number } {
  const viewport = editor.getViewportPageBounds();
  return {
    x: viewport.x + viewport.width / 2,
    y: viewport.y + viewport.height / 2,
  };
}

/**
 * Create a basic shape on the canvas
 * 
 * @param editor - The tldraw editor instance
 * @param params - Shape parameters
 * @returns The ID of the created shape
 */
export function createShape(
  editor: Editor,
  params: {
    shapeType: 'rectangle' | 'ellipse' | 'circle' | 'triangle' | 'arrow';
    x?: number;
    y?: number;
    width?: number;
    height?: number;
    color?: string;
  }
): TLShapeId {
  const { shapeType, x, y, width, height, color } = params;

  // Validate shape type
  const validTypes = ['rectangle', 'ellipse', 'circle', 'triangle', 'arrow'];
  if (!validTypes.includes(shapeType)) {
    throw new Error(`Invalid shape type: ${shapeType}. Must be one of: ${validTypes.join(', ')}`);
  }

  // Get position (default to center if not provided)
  const center = getViewportCenter(editor);
  const posX = x ?? center.x;
  const posY = y ?? center.y;

  // Get size (use defaults if not provided)
  const defaultSize = DEFAULT_SIZES[shapeType];
  const shapeWidth = width ?? defaultSize.width;
  const shapeHeight = height ?? defaultSize.height;

  // Map color to tldraw's valid colors
  const tlColor = mapToTldrawColor(color);

  // Generate unique ID
  const shapeId = `shape:${nanoid()}` as TLShapeId;

  // Create the shape based on type
  if (shapeType === 'arrow') {
    // Arrows are handled differently in tldraw
    editor.createShape({
      id: shapeId,
      type: 'arrow',
      x: posX,
      y: posY,
      props: {
        color: tlColor,
        start: { x: 0, y: 0 },
        end: { x: shapeWidth, y: 0 },
      },
    });
  } else {
    // Geo shapes (rectangle, ellipse, circle, triangle)
    let geoType: 'rectangle' | 'ellipse' | 'triangle' = 'rectangle';
    if (shapeType === 'ellipse' || shapeType === 'circle') geoType = 'ellipse';
    if (shapeType === 'triangle') geoType = 'triangle';

    // For circles, ensure width equals height
    let finalWidth = shapeWidth;
    let finalHeight = shapeHeight;
    if (shapeType === 'circle') {
      // Use the larger of width/height, or width if both are provided
      const size = Math.max(shapeWidth, shapeHeight);
      finalWidth = size;
      finalHeight = size;
    }

    editor.createShape({
      id: shapeId,
      type: 'geo',
      x: posX - finalWidth / 2,
      y: posY - finalHeight / 2,
      props: {
        geo: geoType,
        w: finalWidth,
        h: finalHeight,
        color: tlColor,
      },
    });
  }

  // Select the created shape
  editor.select(shapeId);

  return shapeId;
}

/**
 * Create a text shape on the canvas
 * 
 * @param editor - The tldraw editor instance
 * @param params - Text shape parameters
 * @returns The ID of the created shape
 */
export function createTextShape(
  editor: Editor,
  params: {
    text: string;
    x?: number;
    y?: number;
    fontSize?: number;
    color?: string;
  }
): TLShapeId {
  const { text, x, y, fontSize, color } = params;

  // Validate text
  if (!text || text.trim().length === 0) {
    throw new Error('Text cannot be empty');
  }

  // Validate text length (max 500 characters)
  if (text.length > 500) {
    throw new Error('Text is too long (max 500 characters)');
  }

  // Get position (default to center if not provided)
  const center = getViewportCenter(editor);
  const posX = x ?? center.x;
  const posY = y ?? center.y;

  // Default font size
  const textFontSize = fontSize ?? 24;

  // Map color to tldraw's valid colors
  const tlColor = mapToTldrawColor(color);

  // Generate unique ID
  const shapeId = `shape:${nanoid()}` as TLShapeId;

  // Calculate approximate width based on text length
  const estimatedWidth = Math.max(200, text.length * (textFontSize * 0.6));

  // Map font size to tldraw size (s, m, l, xl)
  let tlSize: 's' | 'm' | 'l' | 'xl' = 'm';
  if (textFontSize <= 16) {
    tlSize = 's';
  } else if (textFontSize <= 24) {
    tlSize = 'm';
  } else if (textFontSize <= 32) {
    tlSize = 'l';
  } else {
    tlSize = 'xl';
  }

  // Create the text shape
  editor.createShape({
    id: shapeId,
    type: 'text',
    x: posX - estimatedWidth / 2,
    y: posY - textFontSize / 2,
    props: {
      text: text.trim(),
      size: tlSize,
      color: tlColor,
      w: estimatedWidth,
    },
  });

  // Select the created shape
  editor.select(shapeId);

  return shapeId;
}

/**
 * =============================================================================
 * MANIPULATION COMMANDS (Commands 3-4)
 * =============================================================================
 */

/**
 * Get target shapes based on target parameter
 * 
 * @param editor - tldraw editor instance
 * @param target - "selected", "all", or shape ID
 * @returns Array of shapes
 */
export function getTargetShapes(
  editor: Editor,
  target: string
): Array<any> {
  if (!editor) {
    throw new Error('Editor is required');
  }

  let shapes: Array<any> = [];

  if (target === 'selected') {
    shapes = editor.getSelectedShapes();
    if (shapes.length === 0) {
      throw new Error('No shapes selected. Please select a shape first.');
    }
  } else if (target === 'all') {
    shapes = editor.getCurrentPageShapes();
    if (shapes.length === 0) {
      throw new Error('No shapes on canvas');
    }
  } else {
    // Assume it's a shape ID
    const shape = editor.getShape(target as TLShapeId);
    if (!shape) {
      throw new Error(`Shape with ID "${target}" not found`);
    }
    shapes = [shape];
  }

  return shapes;
}

/**
 * Calculate position based on keywords or numeric values
 * 
 * @param editor - tldraw editor instance
 * @param x - X coordinate or keyword (center, left, right)
 * @param y - Y coordinate or keyword (center, top, bottom)
 * @returns Numeric coordinates { x, y }
 */
export function calculatePosition(
  editor: Editor,
  x: number | string | undefined,
  y: number | string | undefined
): { x: number; y: number } {
  const viewport = editor.getViewportPageBounds();
  const centerX = viewport.x + viewport.width / 2;
  const centerY = viewport.y + viewport.height / 2;

  let posX: number;
  let posY: number;

  // Handle X coordinate
  if (typeof x === 'number') {
    posX = x;
  } else if (x === 'center') {
    posX = centerX;
  } else if (x === 'left') {
    posX = viewport.x + 100; // 100px from left edge
  } else if (x === 'right') {
    posX = viewport.x + viewport.width - 100; // 100px from right edge
  } else {
    posX = centerX; // Default to center
  }

  // Handle Y coordinate
  if (typeof y === 'number') {
    posY = y;
  } else if (y === 'center') {
    posY = centerY;
  } else if (y === 'top') {
    posY = viewport.y + 100; // 100px from top edge
  } else if (y === 'bottom') {
    posY = viewport.y + viewport.height - 100; // 100px from bottom edge
  } else {
    posY = centerY; // Default to center
  }

  return { x: posX, y: posY };
}

/**
 * Move shape(s) to a new position
 * 
 * @param editor - tldraw editor instance
 * @param params - Move parameters
 * @returns Array of moved shape IDs
 */
export interface MoveShapeParams {
  target?: string; // "selected", "all", or shape ID
  x?: number | string; // X coordinate or keyword (center, left, right)
  y?: number | string; // Y coordinate or keyword (center, top, bottom)
}

export function moveShape(
  editor: Editor,
  params: MoveShapeParams
): TLShapeId[] {
  if (!editor) {
    throw new Error('Editor is required');
  }

  const { target = 'selected', x, y } = params;

  // Get target shapes
  const shapes = getTargetShapes(editor, target);

  // Calculate target position
  const position = calculatePosition(editor, x, y);

  // Move each shape
  const movedShapeIds: TLShapeId[] = [];
  
  shapes.forEach((shape) => {
    // Get shape's current bounds to maintain relative position
    const bounds = editor.getShapePageBounds(shape.id);
    
    if (bounds) {
      // Calculate offset to move shape so its center aligns with target position
      const shapeWidth = bounds.width;
      const shapeHeight = bounds.height;
      
      // Update shape position
      editor.updateShape({
        id: shape.id,
        type: shape.type,
        x: position.x - shapeWidth / 2,
        y: position.y - shapeHeight / 2,
      });
      
      movedShapeIds.push(shape.id);
    }
  });

  // Select the moved shapes
  if (movedShapeIds.length > 0) {
    editor.select(...movedShapeIds);
  }

  return movedShapeIds;
}

/**
 * Transform shape(s) - resize, rotate, or scale
 * 
 * @param editor - tldraw editor instance
 * @param params - Transform parameters
 * @returns Array of transformed shape IDs
 */
export interface TransformShapeParams {
  target?: string; // "selected" or shape ID
  width?: number; // New width
  height?: number; // New height
  rotation?: number; // Rotation in degrees
  scale?: number; // Scale multiplier
}

export function transformShape(
  editor: Editor,
  params: TransformShapeParams
): TLShapeId[] {
  if (!editor) {
    throw new Error('Editor is required');
  }

  const { target = 'selected', width, height, rotation, scale } = params;

  // Get target shapes (only selected or specific ID, not "all")
  const shapes = getTargetShapes(editor, target);

  // Transform each shape
  const transformedShapeIds: TLShapeId[] = [];

  shapes.forEach((shape) => {
    const updates: any = {
      id: shape.id,
      type: shape.type,
    };

    // Apply width/height changes
    if (width !== undefined || height !== undefined) {
      // For geo shapes, use props.w and props.h
      if (shape.type === 'geo') {
        updates.props = {
          ...shape.props,
          w: width ?? shape.props.w,
          h: height ?? shape.props.h,
        };
      }
    }

    // Apply scale (multiplies current dimensions)
    if (scale !== undefined && scale > 0) {
      if (shape.type === 'geo') {
        const currentWidth = shape.props.w;
        const currentHeight = shape.props.h;
        updates.props = {
          ...shape.props,
          w: currentWidth * scale,
          h: currentHeight * scale,
        };
      }
    }

    // Apply rotation (convert degrees to radians)
    if (rotation !== undefined) {
      const radians = (rotation * Math.PI) / 180;
      updates.rotation = radians;
    }

    editor.updateShape(updates);
    transformedShapeIds.push(shape.id);
  });

  // Select the transformed shapes
  if (transformedShapeIds.length > 0) {
    editor.select(...transformedShapeIds);
  }

  return transformedShapeIds;
}

/**
 * =============================================================================
 * LAYOUT COMMANDS (Commands 5-6)
 * =============================================================================
 */

/**
 * Sort shapes by position (horizontal or vertical)
 * 
 * @param shapes - Array of shapes to sort
 * @param direction - "horizontal" or "vertical"
 * @returns Sorted array of shapes
 */
export function sortShapesByPosition(
  editor: Editor,
  shapes: Array<any>,
  direction: 'horizontal' | 'vertical'
): Array<any> {
  return [...shapes].sort((a, b) => {
    const boundsA = editor.getShapePageBounds(a.id);
    const boundsB = editor.getShapePageBounds(b.id);
    
    if (!boundsA || !boundsB) return 0;
    
    if (direction === 'horizontal') {
      return boundsA.x - boundsB.x;
    } else {
      return boundsA.y - boundsB.y;
    }
  });
}

/**
 * Arrange selected shapes in a line (horizontal or vertical)
 * 
 * @param editor - tldraw editor instance
 * @param params - Arrange parameters
 * @returns Array of arranged shape IDs
 */
export interface ArrangeShapesParams {
  direction?: 'horizontal' | 'vertical'; // Direction to arrange (default: horizontal)
  spacing?: number; // Gap between shapes (default: 50px)
  alignment?: 'start' | 'center' | 'end'; // Alignment perpendicular to direction (default: center)
}

export function arrangeShapes(
  editor: Editor,
  params: ArrangeShapesParams = {}
): TLShapeId[] {
  if (!editor) {
    throw new Error('Editor is required');
  }

  const { direction = 'horizontal', spacing = 50, alignment = 'center' } = params;

  // Get selected shapes
  const shapes = editor.getSelectedShapes();
  
  if (shapes.length < 2) {
    throw new Error('Please select at least 2 shapes to arrange');
  }

  // Sort shapes by position
  const sortedShapes = sortShapesByPosition(editor, shapes, direction);

  // Get the first shape's bounds as reference for alignment
  const firstBounds = editor.getShapePageBounds(sortedShapes[0].id);
  if (!firstBounds) {
    throw new Error('Could not get bounds for first shape');
  }

  // Calculate reference position for alignment
  const referenceY = firstBounds.y + firstBounds.height / 2; // Center Y of first shape
  const referenceX = firstBounds.x + firstBounds.width / 2; // Center X of first shape

  // Calculate new positions
  let currentPosition = 0;
  const arrangedShapeIds: TLShapeId[] = [];

  sortedShapes.forEach((shape, index) => {
    const bounds = editor.getShapePageBounds(shape.id);
    if (!bounds) return;

    let newX = shape.x;
    let newY = shape.y;

    if (direction === 'horizontal') {
      // Arrange horizontally
      if (index === 0) {
        // Keep first shape position as anchor
        currentPosition = bounds.x;
      } else {
        newX = currentPosition;
      }
      
      // Apply alignment on Y axis (align all shapes vertically)
      if (alignment === 'start') {
        // Align tops
        newY = firstBounds.y;
      } else if (alignment === 'center') {
        // Align centers
        newY = referenceY - bounds.height / 2;
      } else if (alignment === 'end') {
        // Align bottoms
        newY = firstBounds.y + firstBounds.height - bounds.height;
      }

      currentPosition += bounds.width + spacing;
    } else {
      // Arrange vertically
      if (index === 0) {
        // Keep first shape position as anchor
        currentPosition = bounds.y;
      } else {
        newY = currentPosition;
      }
      
      // Apply alignment on X axis (align all shapes horizontally)
      if (alignment === 'start') {
        // Align lefts
        newX = firstBounds.x;
      } else if (alignment === 'center') {
        // Align centers
        newX = referenceX - bounds.width / 2;
      } else if (alignment === 'end') {
        // Align rights
        newX = firstBounds.x + firstBounds.width - bounds.width;
      }

      currentPosition += bounds.height + spacing;
    }

    // Update shape position
    editor.updateShape({
      id: shape.id,
      type: shape.type,
      x: newX,
      y: newY,
    });

    arrangedShapeIds.push(shape.id);
  });

  // Select all arranged shapes
  if (arrangedShapeIds.length > 0) {
    editor.select(...arrangedShapeIds);
  }

  return arrangedShapeIds;
}

/**
 * Calculate grid layout positions
 * 
 * @param editor - tldraw editor instance
 * @param rows - Number of rows
 * @param columns - Number of columns
 * @param shapeSize - Size of each shape { width, height }
 * @param spacing - Gap between shapes
 * @returns Array of positions [{ x, y }]
 */
export function calculateGridLayout(
  editor: Editor,
  rows: number,
  columns: number,
  shapeSize: { width: number; height: number },
  spacing: number
): Array<{ x: number; y: number }> {
  const positions: Array<{ x: number; y: number }> = [];

  // Calculate total grid dimensions
  const totalWidth = columns * shapeSize.width + (columns - 1) * spacing;
  const totalHeight = rows * shapeSize.height + (rows - 1) * spacing;

  // Get viewport center to position grid
  const center = getViewportCenter(editor);
  
  // Starting position (top-left of grid, centered in viewport)
  const startX = center.x - totalWidth / 2;
  const startY = center.y - totalHeight / 2;

  // Generate positions for each cell
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < columns; col++) {
      positions.push({
        x: startX + col * (shapeSize.width + spacing) + shapeSize.width / 2,
        y: startY + row * (shapeSize.height + spacing) + shapeSize.height / 2,
      });
    }
  }

  return positions;
}

/**
 * Create a grid of shapes
 * 
 * @param editor - tldraw editor instance
 * @param params - Grid parameters
 * @returns Array of created shape IDs
 */
export interface CreateGridParams {
  shapeType?: 'rectangle' | 'ellipse'; // Type of shape to create (default: rectangle)
  rows?: number; // Number of rows (default: 3)
  columns?: number; // Number of columns (default: 3)
  spacing?: number; // Gap between shapes (default: 20px)
  color?: string; // Color of shapes (default: blue)
}

export function createGrid(
  editor: Editor,
  params: CreateGridParams = {}
): TLShapeId[] {
  if (!editor) {
    throw new Error('Editor is required');
  }

  const {
    shapeType = 'rectangle',
    rows = 3,
    columns = 3,
    spacing = 20,
    color = 'blue',
  } = params;

  // Validate parameters
  if (rows < 1 || rows > 20) {
    throw new Error('Rows must be between 1 and 20');
  }
  if (columns < 1 || columns > 20) {
    throw new Error('Columns must be between 1 and 20');
  }
  if (shapeType !== 'rectangle' && shapeType !== 'ellipse') {
    throw new Error('Shape type must be rectangle or ellipse');
  }

  // Get default size for shape type
  const shapeSize = DEFAULT_SIZES[shapeType];

  // Calculate grid positions
  const positions = calculateGridLayout(editor, rows, columns, shapeSize, spacing);

  // Create shapes at each position
  const createdShapeIds: TLShapeId[] = [];

  console.log(`[createGrid] Creating ${rows}x${columns} grid (${positions.length} shapes)`);
  
  positions.forEach((position, index) => {
    console.log(`[createGrid] Creating shape ${index + 1}/${positions.length} at`, position);
    const shapeId = createShape(editor, {
      shapeType,
      x: position.x,
      y: position.y,
      width: shapeSize.width,
      height: shapeSize.height,
      color,
    });
    createdShapeIds.push(shapeId);
    console.log(`[createGrid] Created shape ${index + 1}: ${shapeId}`);
  });

  console.log(`[createGrid] Total shapes created: ${createdShapeIds.length}`);

  // Select all created shapes
  if (createdShapeIds.length > 0) {
    editor.select(...createdShapeIds);
  }

  return createdShapeIds;
}

