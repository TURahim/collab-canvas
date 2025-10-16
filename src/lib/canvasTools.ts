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

import { type Editor, type TLShapeId, toRichText, createShapeId } from '@tldraw/tldraw';

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
  } else if (pattern === 'vertical') {
    const totalHeight = shapes.reduce((sum, shape: any) => {
      const height = shape.type === 'geo' ? shape.props.h : 50;
      return sum + height + spacing;
    }, -spacing);

    let currentY = center.y - totalHeight / 2;

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
  } else if (pattern === 'grid') {
    const cols = Math.ceil(Math.sqrt(shapes.length));
    const rows = Math.ceil(shapes.length / cols);
    const cellWidth = 220;
    const cellHeight = 170;
    const totalWidth = cols * cellWidth;
    const totalHeight = rows * cellHeight;

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

// ==========================================
// SHAPE MANAGEMENT FUNCTIONS (NEW - PR #7)
// ==========================================

/**
 * Delete shapes from the canvas
 * 
 * @param editor - tldraw editor instance
 * @param shapeIds - Array of shape IDs to delete (optional, defaults to selected shapes)
 * @returns void
 */
export interface DeleteShapesParams {
  shapeIds?: TLShapeId[];
}

export function deleteShapes(
  editor: Editor,
  params: DeleteShapesParams = {}
): void {
  if (!editor) {
    throw new Error('Editor is required');
  }

  const { shapeIds } = params;
  
  // If shapeIds provided, delete those specific shapes
  if (shapeIds && shapeIds.length > 0) {
    console.log(`[deleteShapes] Deleting ${shapeIds.length} specific shapes`);
    editor.deleteShapes(shapeIds);
    return;
  }
  
  // Otherwise, delete selected shapes
  const selectedShapes = editor.getSelectedShapes();
  if (selectedShapes.length === 0) {
    throw new Error('No shapes selected to delete');
  }
  
  console.log(`[deleteShapes] Deleting ${selectedShapes.length} selected shapes`);
  const selectedIds = selectedShapes.map(shape => shape.id);
  editor.deleteShapes(selectedIds);
}

/**
 * Clear the entire canvas (delete all shapes on current page)
 * 
 * @param editor - tldraw editor instance
 * @returns Number of shapes deleted
 */
export function clearCanvas(editor: Editor): number {
  if (!editor) {
    throw new Error('Editor is required');
  }

  const allShapes = editor.getCurrentPageShapes();
  const shapeCount = allShapes.length;
  
  if (shapeCount === 0) {
    console.log('[clearCanvas] Canvas is already empty');
    return 0;
  }

  console.log(`[clearCanvas] Deleting all ${shapeCount} shapes from canvas`);
  const allShapeIds = allShapes.map(shape => shape.id);
  editor.deleteShapes(allShapeIds);
  
  return shapeCount;
}

/**
 * Change the color of existing shapes
 * 
 * @param editor - tldraw editor instance
 * @param shapeIds - Array of shape IDs to recolor (optional, defaults to selected shapes)
 * @param color - New color for the shapes
 * @returns void
 */
export interface ChangeShapeColorParams {
  shapeIds?: TLShapeId[];
  color: string;
}

export function changeShapeColor(
  editor: Editor,
  params: ChangeShapeColorParams
): void {
  if (!editor) {
    throw new Error('Editor is required');
  }

  const { shapeIds, color } = params;
  
  if (!color) {
    throw new Error('Color is required');
  }

  const tldrawColor = mapToTldrawColor(color);
  
  // Determine which shapes to update
  let targetShapes: TLShapeId[];
  if (shapeIds && shapeIds.length > 0) {
    targetShapes = shapeIds;
  } else {
    const selected = editor.getSelectedShapes();
    if (selected.length === 0) {
      throw new Error('No shapes selected to recolor');
    }
    targetShapes = selected.map(shape => shape.id);
  }

  console.log(`[changeShapeColor] Changing color of ${targetShapes.length} shapes to ${tldrawColor}`);

  // Update each shape's color
  targetShapes.forEach(shapeId => {
    const shape = editor.getShape(shapeId);
    if (!shape) return;

    // Update color based on shape type
    if (shape.type === 'geo' || shape.type === 'text') {
      editor.updateShape({
        id: shapeId,
        type: shape.type,
        props: {
          ...(shape.props as Record<string, unknown>),
          color: tldrawColor,
        },
      });
    }
  });
}

/**
 * Create a sticky note (post-it style note)
 * 
 * @param editor - tldraw editor instance
 * @param text - Note text content
 * @param color - Note background color (default: 'yellow')
 * @returns Created shape ID
 */
export interface CreateStickyNoteParams {
  text?: string;
  color?: string;
}

export function createStickyNote(
  editor: Editor,
  params: CreateStickyNoteParams = {}
): TLShapeId {
  if (!editor) {
    throw new Error('Editor is required');
  }

  const {
    text = 'Sticky note',
    color = 'yellow',
  } = params;

  console.log(`[createStickyNote] Creating sticky note with text: "${text}"`);

  const center = getViewportCenter(editor);
  const noteWidth = 200;
  const noteHeight = 200;
  
  // Create background rectangle
  const bgId = createShapeId();
  editor.createShape({
    id: bgId,
    type: 'geo',
    x: center.x - noteWidth / 2,
    y: center.y - noteHeight / 2,
    props: {
      geo: 'rectangle',
      w: noteWidth,
      h: noteHeight,
      color: mapToTldrawColor(color),
      fill: 'solid',
    },
  });

  // Create text overlay
  const textId = createShapeId();
  editor.createShapes([{
    id: textId,
    type: 'text',
    x: center.x - (noteWidth - 20) / 2,
    y: center.y - (noteHeight - 20) / 2,
    props: {
      richText: toRichText(text),
      w: noteWidth - 20,
      size: 'm',
      color: 'black',
      autoSize: false,
    },
  }]);

  // Select both shapes
  editor.select(bgId, textId);
  
  return bgId;
}

// ==========================================
// UI COMPONENT FUNCTIONS (NEW - PR #7)
// ==========================================

/**
 * Create a button component
 * 
 * @param editor - tldraw editor instance
 * @param text - Button text (default: 'Button')
 * @param color - Button color (default: 'blue')
 * @param size - Button size: 'small', 'medium', 'large' (default: 'medium')
 * @returns Array of created shape IDs [background, text]
 */
export interface CreateButtonParams {
  text?: string;
  color?: string;
  size?: 'small' | 'medium' | 'large';
}

export function createButton(
  editor: Editor,
  params: CreateButtonParams = {}
): TLShapeId[] {
  if (!editor) {
    throw new Error('Editor is required');
  }

  const {
    text = 'Button',
    color = 'blue',
    size = 'medium',
  } = params;

  console.log(`[createButton] Creating ${size} button with text: "${text}"`);

  const center = getViewportCenter(editor);
  
  // Size mappings
  const sizes = {
    small: { width: 100, height: 32, fontSize: 14 },
    medium: { width: 150, height: 40, fontSize: 16 },
    large: { width: 200, height: 50, fontSize: 18 },
  };
  
  const dimensions = sizes[size];

  const shapes: ShapeDefinition[] = [
    // Button background
    {
      shapeType: 'rectangle',
      x: center.x,
      y: center.y,
      width: dimensions.width,
      height: dimensions.height,
      color: mapToTldrawColor(color),
    },
    // Button text
    {
      shapeType: 'text',
      x: center.x,
      y: center.y,
      width: dimensions.width - 20,
      height: dimensions.height - 8,
      text,
      fontSize: dimensions.fontSize,
      color: 'white',
    },
  ];

  const createdShapeIds = createMultiShapeLayout(editor, shapes);
  
  if (createdShapeIds.length > 0) {
    editor.select(...createdShapeIds);
  }

  console.log(`[createButton] Created button with ${createdShapeIds.length} shapes`);
  return createdShapeIds;
}

/**
 * Create a modal dialog component
 * 
 * @param editor - tldraw editor instance
 * @param title - Modal title (default: 'Modal Title')
 * @param bodyText - Modal body text (default: 'Modal content goes here...')
 * @returns Array of created shape IDs
 */
export interface CreateModalParams {
  title?: string;
  bodyText?: string;
}

export function createModal(
  editor: Editor,
  params: CreateModalParams = {}
): TLShapeId[] {
  if (!editor) {
    throw new Error('Editor is required');
  }

  const {
    title = 'Modal Title',
    bodyText = 'Modal content goes here...',
  } = params;

  console.log(`[createModal] Creating modal with title: "${title}"`);

  const center = getViewportCenter(editor);
  
  const modalWidth = 400;
  const modalHeight = 300;

  const shapes: ShapeDefinition[] = [
    // Overlay background (semi-transparent dark)
    {
      shapeType: 'rectangle',
      x: center.x,
      y: center.y,
      width: 600,
      height: 400,
      color: 'grey',
    },
    // Modal container
    {
      shapeType: 'rectangle',
      x: center.x,
      y: center.y,
      width: modalWidth,
      height: modalHeight,
      color: 'light-blue',
    },
    // Title bar background
    {
      shapeType: 'rectangle',
      x: center.x,
      y: center.y - modalHeight / 2 + 30,
      width: modalWidth,
      height: 60,
      color: 'blue',
    },
    // Title text
    {
      shapeType: 'text',
      x: center.x,
      y: center.y - modalHeight / 2 + 30,
      width: modalWidth - 40,
      height: 40,
      text: title,
      fontSize: 20,
      color: 'white',
    },
    // Body text
    {
      shapeType: 'text',
      x: center.x,
      y: center.y,
      width: modalWidth - 40,
      height: 100,
      text: bodyText,
      fontSize: 16,
      color: 'black',
    },
    // OK button background
    {
      shapeType: 'rectangle',
      x: center.x - 60,
      y: center.y + modalHeight / 2 - 50,
      width: 100,
      height: 40,
      color: 'blue',
    },
    // OK button text
    {
      shapeType: 'text',
      x: center.x - 60,
      y: center.y + modalHeight / 2 - 50,
      width: 80,
      height: 28,
      text: 'OK',
      fontSize: 16,
      color: 'white',
    },
    // Cancel button background
    {
      shapeType: 'rectangle',
      x: center.x + 60,
      y: center.y + modalHeight / 2 - 50,
      width: 100,
      height: 40,
      color: 'grey',
    },
    // Cancel button text
    {
      shapeType: 'text',
      x: center.x + 60,
      y: center.y + modalHeight / 2 - 50,
      width: 80,
      height: 28,
      text: 'Cancel',
      fontSize: 16,
      color: 'black',
    },
  ];

  const createdShapeIds = createMultiShapeLayout(editor, shapes);
  
  if (createdShapeIds.length > 0) {
    editor.select(...createdShapeIds);
  }

  console.log(`[createModal] Created modal with ${createdShapeIds.length} shapes`);
  return createdShapeIds;
}

/**
 * Create a data table
 * 
 * @param editor - tldraw editor instance
 * @param rows - Number of data rows (default: 3)
 * @param cols - Number of columns (default: 3)
 * @param headers - Array of header labels (optional)
 * @returns Array of created shape IDs
 */
export interface CreateTableParams {
  rows?: number;
  cols?: number;
  headers?: string[];
}

export function createTable(
  editor: Editor,
  params: CreateTableParams = {}
): TLShapeId[] {
  if (!editor) {
    throw new Error('Editor is required');
  }

  const {
    rows = 3,
    cols = 3,
    headers,
  } = params;

  console.log(`[createTable] Creating table with ${rows} rows and ${cols} columns`);

  const center = getViewportCenter(editor);
  const cellWidth = 120;
  const cellHeight = 40;
  const headerHeight = 50;
  
  const tableWidth = cols * cellWidth;
  const tableHeight = headerHeight + rows * cellHeight;

  const shapes: ShapeDefinition[] = [];

  // Create header cells
  for (let col = 0; col < cols; col++) {
    const x = center.x - tableWidth / 2 + col * cellWidth + cellWidth / 2;
    const y = center.y - tableHeight / 2 + headerHeight / 2;
    
    // Header cell background
    shapes.push({
      shapeType: 'rectangle',
      x,
      y,
      width: cellWidth,
      height: headerHeight,
      color: 'blue',
    });
    
    // Header text
    const headerText = headers && headers[col] ? headers[col] : `Header ${col + 1}`;
    shapes.push({
      shapeType: 'text',
      x,
      y,
      width: cellWidth - 10,
      height: headerHeight - 10,
      text: headerText,
      fontSize: 16,
      color: 'white',
    });
  }

  // Create data cells
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const x = center.x - tableWidth / 2 + col * cellWidth + cellWidth / 2;
      const y = center.y - tableHeight / 2 + headerHeight + row * cellHeight + cellHeight / 2;
      
      // Data cell background
      shapes.push({
        shapeType: 'rectangle',
        x,
        y,
        width: cellWidth,
        height: cellHeight,
        color: 'grey',
      });
      
      // Data cell text
      shapes.push({
        shapeType: 'text',
        x,
        y,
        width: cellWidth - 10,
        height: cellHeight - 10,
        text: `R${row + 1}C${col + 1}`,
        fontSize: 14,
        color: 'black',
      });
    }
  }

  const createdShapeIds = createMultiShapeLayout(editor, shapes);
  
  if (createdShapeIds.length > 0) {
    editor.select(...createdShapeIds);
  }

  console.log(`[createTable] Created table with ${createdShapeIds.length} shapes`);
  return createdShapeIds;
}

/**
 * Create a flowchart diagram
 * 
 * @param editor - tldraw editor instance
 * @param steps - Array of step labels (default: ['Start', 'Process', 'Decision', 'End'])
 * @returns Array of created shape IDs
 */
export interface CreateFlowchartParams {
  steps?: string[];
}

export function createFlowchart(
  editor: Editor,
  params: CreateFlowchartParams = {}
): TLShapeId[] {
  if (!editor) {
    throw new Error('Editor is required');
  }

  const {
    steps = ['Start', 'Process', 'Decision', 'End'],
  } = params;

  console.log(`[createFlowchart] Creating flowchart with ${steps.length} steps`);

  const center = getViewportCenter(editor);
  const boxWidth = 180;
  const boxHeight = 80;
  const verticalSpacing = 120;
  
  const totalHeight = (steps.length - 1) * verticalSpacing;

  const shapes: ShapeDefinition[] = [];

  steps.forEach((step, index) => {
    const y = center.y - totalHeight / 2 + index * verticalSpacing;
    
    // Determine shape type based on step name or position
    let shapeColor: TldrawColor = 'blue';
    if (step.toLowerCase().includes('start') || index === 0) {
      shapeColor = 'green';
    } else if (step.toLowerCase().includes('end') || index === steps.length - 1) {
      shapeColor = 'red';
    } else if (step.toLowerCase().includes('decision')) {
      shapeColor = 'yellow';
    }
    
    // Step box
    shapes.push({
      shapeType: 'rectangle',
      x: center.x,
      y,
      width: boxWidth,
      height: boxHeight,
      color: shapeColor,
    });
    
    // Step text
    shapes.push({
      shapeType: 'text',
      x: center.x,
      y,
      width: boxWidth - 20,
      height: boxHeight - 20,
      text: step,
      fontSize: 16,
      color: 'black',
    });
  });

  const createdShapeIds = createMultiShapeLayout(editor, shapes);
  
  if (createdShapeIds.length > 0) {
    editor.select(...createdShapeIds);
  }

  console.log(`[createFlowchart] Created flowchart with ${createdShapeIds.length} shapes`);
  return createdShapeIds;
}

// ==========================================
// SELECTION & QUERY FUNCTIONS (NEW - PR #7)
// ==========================================

/**
 * Select all shapes of a specific type
 * 
 * @param editor - tldraw editor instance
 * @param shapeType - Type of shapes to select ('rectangle', 'ellipse', 'text', etc.)
 * @returns Array of selected shape IDs
 */
export interface SelectShapesByTypeParams {
  shapeType: string;
}

export function selectShapesByType(
  editor: Editor,
  params: SelectShapesByTypeParams
): TLShapeId[] {
  if (!editor) {
    throw new Error('Editor is required');
  }

  const { shapeType } = params;
  
  if (!shapeType) {
    throw new Error('Shape type is required');
  }

  const allShapes = editor.getCurrentPageShapes();
  const matchingShapes = allShapes.filter(shape => {
    if (shape.type === 'geo') {
      // For geo shapes, check the geo property
      const geoType = (shape.props as { geo?: string }).geo;
      return geoType === mapToTldrawGeoType(shapeType);
    }
    return shape.type === shapeType;
  });

  const matchingIds = matchingShapes.map(shape => shape.id);
  
  console.log(`[selectShapesByType] Selected ${matchingIds.length} shapes of type ${shapeType}`);
  
  if (matchingIds.length > 0) {
    editor.select(...matchingIds);
  }
  
  return matchingIds;
}

/**
 * Find and select text shapes containing specific text
 * 
 * @param editor - tldraw editor instance
 * @param searchText - Text to search for
 * @returns Array of matching shape IDs
 */
export interface FindShapesByTextParams {
  searchText: string;
}

export function findShapesByText(
  editor: Editor,
  params: FindShapesByTextParams
): TLShapeId[] {
  if (!editor) {
    throw new Error('Editor is required');
  }

  const { searchText } = params;
  
  if (!searchText) {
    throw new Error('Search text is required');
  }

  const allShapes = editor.getCurrentPageShapes();
  const matchingShapes = allShapes.filter(shape => {
    if (shape.type === 'text') {
      const textProps = shape.props as { richText?: { text: string } };
      const text = textProps.richText?.text || '';
      return text.toLowerCase().includes(searchText.toLowerCase());
    }
    // Also check geo shapes with text
    if (shape.type === 'geo') {
      const geoProps = shape.props as { text?: string };
      const text = geoProps.text || '';
      return text.toLowerCase().includes(searchText.toLowerCase());
    }
    return false;
  });

  const matchingIds = matchingShapes.map(shape => shape.id);
  
  console.log(`[findShapesByText] Found ${matchingIds.length} shapes containing "${searchText}"`);
  
  if (matchingIds.length > 0) {
    editor.select(...matchingIds);
  }
  
  return matchingIds;
}

/**
 * Duplicate shapes with offset
 * 
 * @param editor - tldraw editor instance
 * @param shapeIds - Array of shape IDs to duplicate (optional, defaults to selected shapes)
 * @param offsetX - Horizontal offset for duplicates (default: 50)
 * @param offsetY - Vertical offset for duplicates (default: 50)
 * @returns Array of new shape IDs
 */
export interface DuplicateShapesParams {
  shapeIds?: TLShapeId[];
  offsetX?: number;
  offsetY?: number;
}

export function duplicateShapes(
  editor: Editor,
  params: DuplicateShapesParams = {}
): TLShapeId[] {
  if (!editor) {
    throw new Error('Editor is required');
  }

  const { shapeIds, offsetX = 50, offsetY = 50 } = params;
  
  // Determine which shapes to duplicate
  let targetShapes: typeof editor.getCurrentPageShapes extends () => infer R ? R : never;
  if (shapeIds && shapeIds.length > 0) {
    targetShapes = shapeIds.map(id => editor.getShape(id)).filter(Boolean) as typeof targetShapes;
  } else {
    targetShapes = editor.getSelectedShapes();
  }

  if (targetShapes.length === 0) {
    throw new Error('No shapes selected to duplicate');
  }

  console.log(`[duplicateShapes] Duplicating ${targetShapes.length} shapes with offset (${offsetX}, ${offsetY})`);

  // Use tldraw's duplicate API and then move the duplicates
  editor.duplicateShapes(targetShapes.map(s => s.id));
  
  // Get the newly created shapes (they will be selected after duplication)
  const newShapes = editor.getSelectedShapes();
  const newShapeIds = newShapes.map(s => s.id);
  
  // Apply offset to duplicated shapes
  newShapes.forEach(shape => {
    editor.updateShape({
      id: shape.id,
      type: shape.type,
      x: shape.x + offsetX,
      y: shape.y + offsetY,
    });
  });

  return newShapeIds;
}

// ==========================================
// ALIGNMENT & DISTRIBUTION FUNCTIONS (NEW - PR #7)
// ==========================================

/**
 * Align shapes relative to each other
 * 
 * @param editor - tldraw editor instance
 * @param shapeIds - Array of shape IDs to align (optional, defaults to selected shapes)
 * @param alignment - Alignment type: 'left', 'center', 'right', 'top', 'middle', 'bottom'
 * @returns void
 */
export interface AlignShapesParams {
  shapeIds?: TLShapeId[];
  alignment: 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom';
}

export function alignShapes(
  editor: Editor,
  params: AlignShapesParams
): void {
  if (!editor) {
    throw new Error('Editor is required');
  }

  const { shapeIds, alignment } = params;
  
  if (!alignment) {
    throw new Error('Alignment type is required');
  }

  // Determine which shapes to align
  let targetShapes: typeof editor.getCurrentPageShapes extends () => infer R ? R : never;
  if (shapeIds && shapeIds.length > 0) {
    targetShapes = shapeIds.map(id => editor.getShape(id)).filter(Boolean) as typeof targetShapes;
  } else {
    targetShapes = editor.getSelectedShapes();
  }

  if (targetShapes.length < 2) {
    throw new Error('Need at least 2 shapes to align');
  }

  console.log(`[alignShapes] Aligning ${targetShapes.length} shapes to ${alignment}`);

  // Calculate bounds
  const bounds = targetShapes.map(shape => ({
    id: shape.id,
    x: shape.x,
    y: shape.y,
    w: (shape.props as { w?: number }).w || 100,
    h: (shape.props as { h?: number }).h || 100,
  }));

  // Calculate alignment reference
  let alignValue: number;
  
  switch (alignment) {
    case 'left':
      alignValue = Math.min(...bounds.map(b => b.x));
      bounds.forEach((b, i) => {
        editor.updateShape({
          id: b.id,
          type: targetShapes[i].type,
          x: alignValue,
        });
      });
      break;
      
    case 'center':
      alignValue = bounds.reduce((sum, b) => sum + b.x + b.w / 2, 0) / bounds.length;
      bounds.forEach((b, i) => {
        editor.updateShape({
          id: b.id,
          type: targetShapes[i].type,
          x: alignValue - b.w / 2,
        });
      });
      break;
      
    case 'right':
      alignValue = Math.max(...bounds.map(b => b.x + b.w));
      bounds.forEach((b, i) => {
        editor.updateShape({
          id: b.id,
          type: targetShapes[i].type,
          x: alignValue - b.w,
        });
      });
      break;
      
    case 'top':
      alignValue = Math.min(...bounds.map(b => b.y));
      bounds.forEach((b, i) => {
        editor.updateShape({
          id: b.id,
          type: targetShapes[i].type,
          y: alignValue,
        });
      });
      break;
      
    case 'middle':
      alignValue = bounds.reduce((sum, b) => sum + b.y + b.h / 2, 0) / bounds.length;
      bounds.forEach((b, i) => {
        editor.updateShape({
          id: b.id,
          type: targetShapes[i].type,
          y: alignValue - b.h / 2,
        });
      });
      break;
      
    case 'bottom':
      alignValue = Math.max(...bounds.map(b => b.y + b.h));
      bounds.forEach((b, i) => {
        editor.updateShape({
          id: b.id,
          type: targetShapes[i].type,
          y: alignValue - b.h,
        });
      });
      break;
  }
}

/**
 * Distribute shapes evenly
 * 
 * @param editor - tldraw editor instance
 * @param shapeIds - Array of shape IDs to distribute (optional, defaults to selected shapes)
 * @param direction - Distribution direction: 'horizontal' or 'vertical'
 * @returns void
 */
export interface DistributeShapesParams {
  shapeIds?: TLShapeId[];
  direction: 'horizontal' | 'vertical';
}

export function distributeShapes(
  editor: Editor,
  params: DistributeShapesParams
): void {
  if (!editor) {
    throw new Error('Editor is required');
  }

  const { shapeIds, direction } = params;
  
  if (!direction) {
    throw new Error('Direction is required');
  }

  // Determine which shapes to distribute
  let targetShapes: typeof editor.getCurrentPageShapes extends () => infer R ? R : never;
  if (shapeIds && shapeIds.length > 0) {
    targetShapes = shapeIds.map(id => editor.getShape(id)).filter(Boolean) as typeof targetShapes;
  } else {
    targetShapes = editor.getSelectedShapes();
  }

  if (targetShapes.length < 3) {
    throw new Error('Need at least 3 shapes to distribute');
  }

  console.log(`[distributeShapes] Distributing ${targetShapes.length} shapes ${direction}ly`);

  // Get bounds
  const bounds = targetShapes.map(shape => ({
    id: shape.id,
    shape,
    x: shape.x,
    y: shape.y,
    w: (shape.props as { w?: number }).w || 100,
    h: (shape.props as { h?: number }).h || 100,
  }));

  if (direction === 'horizontal') {
    // Sort by x position
    bounds.sort((a, b) => a.x - b.x);
    
    const leftMost = bounds[0].x;
    const rightMost = bounds[bounds.length - 1].x + bounds[bounds.length - 1].w;
    const totalGap = rightMost - leftMost - bounds.reduce((sum, b) => sum + b.w, 0);
    const gap = totalGap / (bounds.length - 1);
    
    let currentX = leftMost;
    bounds.forEach((b, i) => {
      if (i > 0) { // Skip first (it's already positioned)
        currentX += gap;
      }
      if (i > 0 && i < bounds.length - 1) { // Don't move first or last
        editor.updateShape({
          id: b.id,
          type: b.shape.type,
          x: currentX,
        });
      }
      currentX += b.w;
    });
  } else {
    // Sort by y position
    bounds.sort((a, b) => a.y - b.y);
    
    const topMost = bounds[0].y;
    const bottomMost = bounds[bounds.length - 1].y + bounds[bounds.length - 1].h;
    const totalGap = bottomMost - topMost - bounds.reduce((sum, b) => sum + b.h, 0);
    const gap = totalGap / (bounds.length - 1);
    
    let currentY = topMost;
    bounds.forEach((b, i) => {
      if (i > 0) { // Skip first (it's already positioned)
        currentY += gap;
      }
      if (i > 0 && i < bounds.length - 1) { // Don't move first or last
        editor.updateShape({
          id: b.id,
          type: b.shape.type,
          y: currentY,
        });
      }
      currentY += b.h;
    });
  }
}

// ==========================================
// DIAGRAM & WIREFRAME FUNCTIONS (NEW - PR #7)
// ==========================================

/**
 * Create a complete page wireframe
 * 
 * @param editor - tldraw editor instance
 * @param pageTitle - Title for the page (default: 'Page Title')
 * @returns Array of created shape IDs
 */
export interface CreateWireframeParams {
  pageTitle?: string;
}

export function createWireframe(
  editor: Editor,
  params: CreateWireframeParams = {}
): TLShapeId[] {
  if (!editor) {
    throw new Error('Editor is required');
  }

  const {
    pageTitle = 'Page Title',
  } = params;

  console.log(`[createWireframe] Creating page wireframe with title: "${pageTitle}"`);

  const center = getViewportCenter(editor);
  
  const pageWidth = 900;
  const pageHeight = 700;
  const headerHeight = 80;
  const sidebarWidth = 200;
  const footerHeight = 60;

  const shapes: ShapeDefinition[] = [
    // Page container
    {
      shapeType: 'rectangle',
      x: center.x,
      y: center.y,
      width: pageWidth,
      height: pageHeight,
      color: 'grey',
    },
    // Header
    {
      shapeType: 'rectangle',
      x: center.x,
      y: center.y - pageHeight / 2 + headerHeight / 2,
      width: pageWidth,
      height: headerHeight,
      color: 'blue',
    },
    // Header text
    {
      shapeType: 'text',
      x: center.x,
      y: center.y - pageHeight / 2 + headerHeight / 2,
      width: 400,
      height: 50,
      text: pageTitle,
      fontSize: 24,
      color: 'white',
    },
    // Sidebar
    {
      shapeType: 'rectangle',
      x: center.x - pageWidth / 2 + sidebarWidth / 2,
      y: center.y + headerHeight / 2 - footerHeight / 2,
      width: sidebarWidth,
      height: pageHeight - headerHeight - footerHeight,
      color: 'light-blue',
    },
    // Sidebar label
    {
      shapeType: 'text',
      x: center.x - pageWidth / 2 + sidebarWidth / 2,
      y: center.y - pageHeight / 2 + headerHeight + 40,
      width: sidebarWidth - 20,
      height: 30,
      text: 'Navigation',
      fontSize: 16,
      color: 'black',
    },
    // Main content area
    {
      shapeType: 'rectangle',
      x: center.x + sidebarWidth / 2,
      y: center.y + headerHeight / 2 - footerHeight / 2,
      width: pageWidth - sidebarWidth,
      height: pageHeight - headerHeight - footerHeight,
      color: 'light-green',
    },
    // Content label
    {
      shapeType: 'text',
      x: center.x + sidebarWidth / 2,
      y: center.y - pageHeight / 2 + headerHeight + 40,
      width: 300,
      height: 30,
      text: 'Main Content Area',
      fontSize: 18,
      color: 'black',
    },
    // Footer
    {
      shapeType: 'rectangle',
      x: center.x,
      y: center.y + pageHeight / 2 - footerHeight / 2,
      width: pageWidth,
      height: footerHeight,
      color: 'violet',
    },
    // Footer text
    {
      shapeType: 'text',
      x: center.x,
      y: center.y + pageHeight / 2 - footerHeight / 2,
      width: 400,
      height: 40,
      text: 'Footer - © 2024',
      fontSize: 14,
      color: 'white',
    },
  ];

  const createdShapeIds = createMultiShapeLayout(editor, shapes);
  
  if (createdShapeIds.length > 0) {
    editor.select(...createdShapeIds);
  }

  console.log(`[createWireframe] Created wireframe with ${createdShapeIds.length} shapes`);
  return createdShapeIds;
}
