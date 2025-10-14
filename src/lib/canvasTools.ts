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
    shapeType: 'rectangle' | 'ellipse' | 'triangle' | 'arrow';
    x?: number;
    y?: number;
    width?: number;
    height?: number;
    color?: string;
  }
): TLShapeId {
  const { shapeType, x, y, width, height, color } = params;

  // Validate shape type
  const validTypes = ['rectangle', 'ellipse', 'triangle', 'arrow'];
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
    // Geo shapes (rectangle, ellipse, triangle)
    let geoType: 'rectangle' | 'ellipse' | 'triangle' = 'rectangle';
    if (shapeType === 'ellipse') geoType = 'ellipse';
    if (shapeType === 'triangle') geoType = 'triangle';

    editor.createShape({
      id: shapeId,
      type: 'geo',
      x: posX - shapeWidth / 2,
      y: posY - shapeHeight / 2,
      props: {
        geo: geoType,
        w: shapeWidth,
        h: shapeHeight,
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

