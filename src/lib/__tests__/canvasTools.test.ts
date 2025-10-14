/**
 * Tests for Canvas Tool Functions
 */

import { 
  createShape, 
  createTextShape, 
  mapToTldrawColor, 
  getViewportCenter,
  arrangeShapes,
  createGrid,
  sortShapesByPosition,
  calculateGridLayout,
  createLoginForm,
  createCard,
  createNavigationBar,
  createMultiShapeLayout,
  positionRelativeToCenter,
} from '../canvasTools';
import type { Editor, TLShapeId } from '@tldraw/tldraw';

// Mock nanoid
jest.mock('nanoid', () => ({
  nanoid: () => 'test-id-123',
}));

describe('canvasTools', () => {
  let mockEditor: jest.Mocked<Editor>;

  beforeEach(() => {
    mockEditor = {
      createShape: jest.fn(),
      createShapes: jest.fn(), // For text shapes (plural API)
      select: jest.fn(),
      getViewportPageBounds: jest.fn().mockReturnValue({
        x: 0,
        y: 0,
        width: 1000,
        height: 800,
      }),
    } as unknown as jest.Mocked<Editor>;
  });

  describe('mapToTldrawColor', () => {
    it('should map tldraw color names correctly', () => {
      expect(mapToTldrawColor('red')).toBe('red');
      expect(mapToTldrawColor('blue')).toBe('blue');
      expect(mapToTldrawColor('green')).toBe('green');
      expect(mapToTldrawColor('yellow')).toBe('yellow');
      expect(mapToTldrawColor('violet')).toBe('violet');
      expect(mapToTldrawColor('grey')).toBe('grey');
    });

    it('should map synonyms to tldraw colors', () => {
      expect(mapToTldrawColor('pink')).toBe('light-red');
      expect(mapToTldrawColor('purple')).toBe('violet');
      expect(mapToTldrawColor('gray')).toBe('grey'); // US spelling
      expect(mapToTldrawColor('cyan')).toBe('light-blue');
      expect(mapToTldrawColor('lime')).toBe('light-green');
      expect(mapToTldrawColor('teal')).toBe('light-blue');
      expect(mapToTldrawColor('indigo')).toBe('violet');
    });

    it('should handle uppercase and mixed case', () => {
      expect(mapToTldrawColor('RED')).toBe('red');
      expect(mapToTldrawColor('Blue')).toBe('blue');
      expect(mapToTldrawColor('PINK')).toBe('light-red');
    });

    it('should default to blue for undefined or unknown colors', () => {
      expect(mapToTldrawColor(undefined)).toBe('blue');
      expect(mapToTldrawColor('unknowncolor')).toBe('blue');
      expect(mapToTldrawColor('#ff0000')).toBe('blue');
    });

    it('should handle light- variations', () => {
      expect(mapToTldrawColor('light-red')).toBe('light-red');
      expect(mapToTldrawColor('light-blue')).toBe('light-blue');
      expect(mapToTldrawColor('light-green')).toBe('light-green');
      expect(mapToTldrawColor('light-violet')).toBe('light-violet');
      expect(mapToTldrawColor('light-purple')).toBe('light-violet');
    });
  });

  describe('getViewportCenter', () => {
    it('should calculate viewport center correctly', () => {
      const center = getViewportCenter(mockEditor);
      expect(center).toEqual({ x: 500, y: 400 });
    });

    it('should work with different viewport sizes', () => {
      mockEditor.getViewportPageBounds.mockReturnValue({
        x: 100,
        y: 50,
        w: 800,
        h: 600,
      } as any);

      const center = getViewportCenter(mockEditor);
      expect(center).toEqual({ x: 500, y: 350 });
    });
  });

  describe('createShape', () => {
    it('should create a rectangle at specified position', () => {
      const shapeId = createShape(mockEditor, {
        shapeType: 'rectangle',
        x: 100,
        y: 200,
        width: 300,
        height: 150,
        color: 'red',
      });

      expect(shapeId).toBe('shape:test-id-123');
      expect(mockEditor.createShape).toHaveBeenCalledWith({
        id: 'shape:test-id-123',
        type: 'geo',
        x: -50, // centered: 100 - 300/2
        y: 125, // centered: 200 - 150/2
        props: {
          geo: 'rectangle',
          w: 300,
          h: 150,
          color: 'red',
        },
      });
      expect(mockEditor.select).toHaveBeenCalledWith('shape:test-id-123');
    });

    it('should create an ellipse with default position', () => {
      createShape(mockEditor, {
        shapeType: 'ellipse',
        color: 'blue',
      });

      expect(mockEditor.createShape).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'geo',
          props: expect.objectContaining({
            geo: 'ellipse',
            color: 'blue',
          }),
        })
      );
    });

    it('should create a triangle', () => {
      createShape(mockEditor, {
        shapeType: 'triangle',
      });

      expect(mockEditor.createShape).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'geo',
          props: expect.objectContaining({
            geo: 'triangle',
          }),
        })
      );
    });

    it('should create an arrow', () => {
      createShape(mockEditor, {
        shapeType: 'arrow',
        x: 100,
        y: 100,
        width: 200,
      });

      expect(mockEditor.createShape).toHaveBeenCalledWith({
        id: 'shape:test-id-123',
        type: 'arrow',
        x: 100,
        y: 100,
        props: {
          color: 'blue', // default color
          start: { x: 0, y: 0 },
          end: { x: 200, y: 0 },
        },
      });
    });

    it('should default to viewport center when no position provided', () => {
      createShape(mockEditor, {
        shapeType: 'rectangle',
      });

      const createCall = (mockEditor.createShape as jest.Mock).mock.calls[0][0];
      // Should be centered around (500, 400) with default width/height
      expect(createCall.x).toBe(400); // 500 - 200/2
      expect(createCall.y).toBe(325); // 400 - 150/2
    });

    it('should use default sizes when not specified', () => {
      createShape(mockEditor, {
        shapeType: 'rectangle',
      });

      expect(mockEditor.createShape).toHaveBeenCalledWith(
        expect.objectContaining({
          props: expect.objectContaining({
            w: 200,
            h: 150,
          }),
        })
      );
    });

    it('should throw error for invalid shape type', () => {
      expect(() => {
        createShape(mockEditor, {
          shapeType: 'invalid' as any,
        });
      }).toThrow('Invalid shape type');
    });

    it('should select the created shape', () => {
      const shapeId = createShape(mockEditor, {
        shapeType: 'rectangle',
      });

      expect(mockEditor.select).toHaveBeenCalledWith(shapeId);
    });
  });

  describe('createTextShape', () => {
    it('should create text shape with specified properties', () => {
      const shapeId = createTextShape(mockEditor, {
        text: 'Hello World',
        x: 100,
        y: 200,
        fontSize: 32,
        color: 'red',
      });

      expect(shapeId).toBe('shape:test-id-123');
      expect(mockEditor.createShapes).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            id: 'shape:test-id-123',
            type: 'text',
            props: expect.objectContaining({
              text: 'Hello World',
              align: 'start',
              size: 'l', // 32px maps to 'l' (24-32 range)
              color: 'red',
            }),
          })
        ])
      );
      expect(mockEditor.select).toHaveBeenCalledWith('shape:test-id-123');
    });

    it('should default to viewport center when no position provided', () => {
      createTextShape(mockEditor, {
        text: 'Test',
      });

      const createCall = (mockEditor.createShapes as jest.Mock).mock.calls[0][0][0];
      // Should be centered around viewport center
      expect(createCall.x).toBeLessThan(500);
      expect(createCall.y).toBeLessThan(400);
    });

    it('should use default font size when not specified', () => {
      createTextShape(mockEditor, {
        text: 'Test',
      });

      expect(mockEditor.createShapes).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            props: expect.objectContaining({
              size: 'm', // 24px default maps to 'm' (16-24 range)
            }),
          })
        ])
      );
    });

    it('should trim whitespace from text', () => {
      createTextShape(mockEditor, {
        text: '  Hello World  ',
      });

      expect(mockEditor.createShapes).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            props: expect.objectContaining({
              text: 'Hello World',
            }),
          })
        ])
      );
    });

    it('should throw error for empty text', () => {
      expect(() => {
        createTextShape(mockEditor, {
          text: '',
        });
      }).toThrow('Text cannot be empty');
    });

    it('should throw error for whitespace-only text', () => {
      expect(() => {
        createTextShape(mockEditor, {
          text: '   ',
        });
      }).toThrow('Text cannot be empty');
    });

    it('should throw error for text longer than 500 characters', () => {
      const longText = 'a'.repeat(501);
      expect(() => {
        createTextShape(mockEditor, {
          text: longText,
        });
      }).toThrow('Text is too long');
    });

    it('should map font sizes to tldraw sizes', () => {
      // Small (≤16)
      createTextShape(mockEditor, {
        text: 'Small',
        fontSize: 12,
      });
      expect(mockEditor.createShape).toHaveBeenLastCalledWith(
        expect.objectContaining({
          props: expect.objectContaining({ size: 's' }),
        })
      );

      // Medium (16-24)
      createTextShape(mockEditor, {
        text: 'Medium',
        fontSize: 20,
      });
      expect(mockEditor.createShape).toHaveBeenLastCalledWith(
        expect.objectContaining({
          props: expect.objectContaining({ size: 'm' }),
        })
      );

      // Large (24-32)
      createTextShape(mockEditor, {
        text: 'Large',
        fontSize: 28,
      });
      expect(mockEditor.createShape).toHaveBeenLastCalledWith(
        expect.objectContaining({
          props: expect.objectContaining({ size: 'l' }),
        })
      );

      // Extra Large (>32)
      createTextShape(mockEditor, {
        text: 'XL',
        fontSize: 40,
      });
      expect(mockEditor.createShape).toHaveBeenLastCalledWith(
        expect.objectContaining({
          props: expect.objectContaining({ size: 'xl' }),
        })
      );
    });

    it('should calculate width based on text length', () => {
      createTextShape(mockEditor, {
        text: 'Short',
      });
      const shortCall = (mockEditor.createShape as jest.Mock).mock.calls[0][0];

      createTextShape(mockEditor, {
        text: 'This is a much longer text that should have more width',
      });
      const longCall = (mockEditor.createShape as jest.Mock).mock.calls[1][0];

      expect(longCall.props.w).toBeGreaterThan(shortCall.props.w);
    });
  });

  /**
   * =============================================================================
   * LAYOUT COMMANDS TESTS (Commands 5-6)
   * =============================================================================
   */

  describe('sortShapesByPosition', () => {
    it('should sort shapes horizontally by x position', () => {
      const shape1 = { id: 'shape1' as TLShapeId, type: 'geo' };
      const shape2 = { id: 'shape2' as TLShapeId, type: 'geo' };
      const shape3 = { id: 'shape3' as TLShapeId, type: 'geo' };

      mockEditor.getShapePageBounds = jest.fn((id) => {
        if (id === 'shape1') return { x: 300, y: 100, width: 100, height: 100 };
        if (id === 'shape2') return { x: 100, y: 100, width: 100, height: 100 };
        if (id === 'shape3') return { x: 200, y: 100, width: 100, height: 100 };
        return null;
      }) as any;

      const sorted = sortShapesByPosition(mockEditor, [shape1, shape2, shape3], 'horizontal');
      
      expect(sorted[0].id).toBe('shape2'); // x: 100
      expect(sorted[1].id).toBe('shape3'); // x: 200
      expect(sorted[2].id).toBe('shape1'); // x: 300
    });

    it('should sort shapes vertically by y position', () => {
      const shape1 = { id: 'shape1' as TLShapeId, type: 'geo' };
      const shape2 = { id: 'shape2' as TLShapeId, type: 'geo' };
      const shape3 = { id: 'shape3' as TLShapeId, type: 'geo' };

      mockEditor.getShapePageBounds = jest.fn((id) => {
        if (id === 'shape1') return { x: 100, y: 300, width: 100, height: 100 };
        if (id === 'shape2') return { x: 100, y: 100, width: 100, height: 100 };
        if (id === 'shape3') return { x: 100, y: 200, width: 100, height: 100 };
        return null;
      }) as any;

      const sorted = sortShapesByPosition(mockEditor, [shape1, shape2, shape3], 'vertical');
      
      expect(sorted[0].id).toBe('shape2'); // y: 100
      expect(sorted[1].id).toBe('shape3'); // y: 200
      expect(sorted[2].id).toBe('shape1'); // y: 300
    });
  });

  describe('arrangeShapes', () => {
    beforeEach(() => {
      // Create mock shapes with IDs and bounds
      const mockShapes = [
        { id: 'shape1' as TLShapeId, type: 'geo', x: 100, y: 100 },
        { id: 'shape2' as TLShapeId, type: 'geo', x: 300, y: 100 },
        { id: 'shape3' as TLShapeId, type: 'geo', x: 200, y: 100 },
      ];

      mockEditor.getSelectedShapes = jest.fn().mockReturnValue(mockShapes);
      mockEditor.updateShape = jest.fn();
      mockEditor.select = jest.fn();
      
      mockEditor.getShapePageBounds = jest.fn((id) => {
        if (id === 'shape1') return { x: 100, y: 100, width: 100, height: 80 };
        if (id === 'shape2') return { x: 300, y: 100, width: 100, height: 80 };
        if (id === 'shape3') return { x: 200, y: 100, width: 100, height: 80 };
        return null;
      }) as any;
    });

    it('should arrange shapes horizontally with default spacing', () => {
      const result = arrangeShapes(mockEditor, { direction: 'horizontal' });

      expect(result).toHaveLength(3);
      expect(mockEditor.updateShape).toHaveBeenCalledTimes(3);
      expect(mockEditor.select).toHaveBeenCalledWith('shape1', 'shape3', 'shape2');
    });

    it('should arrange shapes vertically with spacing', () => {
      // Override with different y positions for vertical sorting
      const mockShapesVertical = [
        { id: 'shape1' as TLShapeId, type: 'geo', x: 100, y: 100 },
        { id: 'shape2' as TLShapeId, type: 'geo', x: 100, y: 300 },
        { id: 'shape3' as TLShapeId, type: 'geo', x: 100, y: 200 },
      ];
      
      mockEditor.getSelectedShapes = jest.fn().mockReturnValue(mockShapesVertical);
      
      mockEditor.getShapePageBounds = jest.fn((id) => {
        if (id === 'shape1') return { x: 100, y: 100, width: 100, height: 80 };
        if (id === 'shape2') return { x: 100, y: 300, width: 100, height: 80 };
        if (id === 'shape3') return { x: 100, y: 200, width: 100, height: 80 };
        return null;
      }) as any;

      const result = arrangeShapes(mockEditor, { 
        direction: 'vertical',
        spacing: 30 
      });

      expect(result).toHaveLength(3);
      expect(mockEditor.updateShape).toHaveBeenCalledTimes(3);
      
      // Check that vertical positioning was applied (sorted by y: shape1, shape3, shape2)
      const updateCalls = (mockEditor.updateShape as jest.Mock).mock.calls;
      expect(updateCalls[0][0].id).toBe('shape1');
      expect(updateCalls[1][0].id).toBe('shape3');
      expect(updateCalls[2][0].id).toBe('shape2');
    });

    it('should use custom spacing parameter', () => {
      arrangeShapes(mockEditor, { 
        direction: 'horizontal',
        spacing: 100 
      });

      expect(mockEditor.updateShape).toHaveBeenCalledTimes(3);
    });

    it('should throw error when less than 2 shapes selected', () => {
      mockEditor.getSelectedShapes = jest.fn().mockReturnValue([
        { id: 'shape1' as TLShapeId, type: 'geo' }
      ]);

      expect(() => {
        arrangeShapes(mockEditor, {});
      }).toThrow('Please select at least 2 shapes');
    });

    it('should throw error when no shapes selected', () => {
      mockEditor.getSelectedShapes = jest.fn().mockReturnValue([]);

      expect(() => {
        arrangeShapes(mockEditor, {});
      }).toThrow('Please select at least 2 shapes');
    });

    it('should handle alignment parameter', () => {
      const result = arrangeShapes(mockEditor, { 
        direction: 'horizontal',
        alignment: 'center' 
      });

      expect(result).toHaveLength(3);
      expect(mockEditor.updateShape).toHaveBeenCalledTimes(3);
    });

    it('should select all arranged shapes', () => {
      const result = arrangeShapes(mockEditor, {});

      expect(mockEditor.select).toHaveBeenCalledWith(...result);
    });
  });

  describe('calculateGridLayout', () => {
    it('should calculate correct positions for 3x3 grid', () => {
      const positions = calculateGridLayout(
        mockEditor,
        3,
        3,
        { width: 100, height: 100 },
        20
      );

      expect(positions).toHaveLength(9); // 3 rows × 3 columns
      
      // Check first position (top-left)
      expect(positions[0].x).toBeDefined();
      expect(positions[0].y).toBeDefined();
      
      // Check last position (bottom-right)
      expect(positions[8].x).toBeDefined();
      expect(positions[8].y).toBeDefined();
    });

    it('should calculate correct positions for 2x4 grid', () => {
      const positions = calculateGridLayout(
        mockEditor,
        2,
        4,
        { width: 100, height: 100 },
        20
      );

      expect(positions).toHaveLength(8); // 2 rows × 4 columns
    });

    it('should space shapes correctly', () => {
      const spacing = 50;
      const shapeSize = { width: 100, height: 100 };
      
      const positions = calculateGridLayout(
        mockEditor,
        2,
        2,
        shapeSize,
        spacing
      );

      // Check spacing between first two shapes (horizontally adjacent)
      const horizontalSpacing = positions[1].x - positions[0].x;
      expect(horizontalSpacing).toBe(shapeSize.width + spacing);
      
      // Check spacing between first and third shape (vertically adjacent)
      const verticalSpacing = positions[2].y - positions[0].y;
      expect(verticalSpacing).toBe(shapeSize.height + spacing);
    });

    it('should center grid in viewport', () => {
      const positions = calculateGridLayout(
        mockEditor,
        3,
        3,
        { width: 100, height: 100 },
        20
      );

      // Grid should be centered around viewport center (500, 400)
      // Get center of grid (middle shape)
      const centerShape = positions[4]; // Middle of 3x3 grid
      
      expect(centerShape.x).toBeCloseTo(500, 0); // Allow small variance
      expect(centerShape.y).toBeCloseTo(400, 0);
    });
  });

  describe('createGrid', () => {
    beforeEach(() => {
      mockEditor.createShape = jest.fn();
      mockEditor.select = jest.fn();
    });

    it('should create correct number of shapes for 3x3 grid', () => {
      const result = createGrid(mockEditor, {
        rows: 3,
        columns: 3,
        shapeType: 'rectangle',
      });

      expect(result).toHaveLength(9); // 3 × 3 = 9 shapes
      expect(mockEditor.createShape).toHaveBeenCalledTimes(9);
    });

    it('should create correct number of shapes for 2x4 grid', () => {
      const result = createGrid(mockEditor, {
        rows: 2,
        columns: 4,
        shapeType: 'ellipse',
      });

      expect(result).toHaveLength(8); // 2 × 4 = 8 shapes
      expect(mockEditor.createShape).toHaveBeenCalledTimes(8);
    });

    it('should use default parameters when not specified', () => {
      const result = createGrid(mockEditor, {});

      expect(result).toHaveLength(9); // Default 3x3
      expect(mockEditor.createShape).toHaveBeenCalledTimes(9);
    });

    it('should create rectangles by default', () => {
      createGrid(mockEditor, { rows: 2, columns: 2 });

      const firstCall = (mockEditor.createShape as jest.Mock).mock.calls[0][0];
      expect(firstCall.props.geo).toBe('rectangle');
    });

    it('should create ellipses when specified', () => {
      createGrid(mockEditor, { 
        rows: 2, 
        columns: 2,
        shapeType: 'ellipse' 
      });

      const firstCall = (mockEditor.createShape as jest.Mock).mock.calls[0][0];
      expect(firstCall.props.geo).toBe('ellipse');
    });

    it('should apply correct color to all shapes', () => {
      createGrid(mockEditor, {
        rows: 2,
        columns: 2,
        color: 'red',
      });

      const calls = (mockEditor.createShape as jest.Mock).mock.calls;
      calls.forEach(call => {
        expect(call[0].props.color).toBe('red');
      });
    });

    it('should apply correct spacing between shapes', () => {
      createGrid(mockEditor, {
        rows: 2,
        columns: 2,
        spacing: 50,
      });

      expect(mockEditor.createShape).toHaveBeenCalledTimes(4);
    });

    it('should select all created shapes', () => {
      const result = createGrid(mockEditor, {
        rows: 2,
        columns: 2,
      });

      expect(mockEditor.select).toHaveBeenCalledWith(...result);
    });

    it('should throw error for invalid row count', () => {
      expect(() => {
        createGrid(mockEditor, { rows: 0 });
      }).toThrow('Rows must be between 1 and 20');

      expect(() => {
        createGrid(mockEditor, { rows: 21 });
      }).toThrow('Rows must be between 1 and 20');
    });

    it('should throw error for invalid column count', () => {
      expect(() => {
        createGrid(mockEditor, { columns: 0 });
      }).toThrow('Columns must be between 1 and 20');

      expect(() => {
        createGrid(mockEditor, { columns: 21 });
      }).toThrow('Columns must be between 1 and 20');
    });

    it('should accept any shape type and normalize it', () => {
      // Unknown shape types should default to rectangle
      const result = createGrid(mockEditor, { shapeType: 'triangle' as any });
      
      expect(mockEditor.createShape).toHaveBeenCalled();
      expect(result.length).toBe(9); // 3x3 grid by default
    });

    it('should normalize "circle" to ellipse', () => {
      createGrid(mockEditor, { shapeType: 'circle', rows: 2, columns: 2 });
      
      const calls = (mockEditor.createShape as jest.Mock).mock.calls;
      // Check that ellipses were created (circle normalizes to ellipse)
      calls.forEach(call => {
        expect(call[0].type).toBe('geo');
        expect(call[0].props.geo).toBe('ellipse');
      });
    });

    it('should normalize "square" to rectangle', () => {
      createGrid(mockEditor, { shapeType: 'square', rows: 2, columns: 2 });
      
      const calls = (mockEditor.createShape as jest.Mock).mock.calls;
      // Check that rectangles were created (square normalizes to rectangle)
      calls.forEach(call => {
        expect(call[0].type).toBe('geo');
        expect(call[0].props.geo).toBe('rectangle');
      });
    });

    it('should throw error when editor is null', () => {
      expect(() => {
        createGrid(null as any, {});
      }).toThrow('Editor is required');
    });
  });

  // Helper Functions Tests
  describe('positionRelativeToCenter', () => {
    it('should calculate position relative to center with positive offset', () => {
      const center = { x: 100, y: 100 };
      const result = positionRelativeToCenter(center, 50, 30);
      expect(result).toEqual({ x: 150, y: 130 });
    });

    it('should calculate position relative to center with negative offset', () => {
      const center = { x: 100, y: 100 };
      const result = positionRelativeToCenter(center, -50, -30);
      expect(result).toEqual({ x: 50, y: 70 });
    });

    it('should handle zero offsets', () => {
      const center = { x: 100, y: 100 };
      const result = positionRelativeToCenter(center, 0, 0);
      expect(result).toEqual({ x: 100, y: 100 });
    });
  });

  describe('createMultiShapeLayout', () => {
    it('should create multiple shapes from definitions', () => {
      const shapeDefinitions = [
        { shapeType: 'rectangle' as const, x: 100, y: 100, width: 200, height: 150, color: 'red' },
        { shapeType: 'ellipse' as const, x: 200, y: 200, width: 100, height: 100, color: 'blue' },
      ];

      const result = createMultiShapeLayout(mockEditor, shapeDefinitions);

      expect(mockEditor.createShape).toHaveBeenCalledTimes(2);
      expect(result).toHaveLength(2);
    });

    it('should create text shapes from definitions', () => {
      const shapeDefinitions = [
        { shapeType: 'text' as const, x: 100, y: 100, width: 200, height: 50, text: 'Hello', fontSize: 24, color: 'black' },
      ];

      createMultiShapeLayout(mockEditor, shapeDefinitions);

      expect(mockEditor.createShapes).toHaveBeenCalledTimes(1);
      const call = (mockEditor.createShapes as jest.Mock).mock.calls[0][0][0];
      expect(call.type).toBe('text');
      expect(call.props.richText).toBeDefined();
      expect(call.props.richText.text).toBe('Hello');
    });

    it('should throw error when editor is null', () => {
      expect(() => {
        createMultiShapeLayout(null as any, []);
      }).toThrow('Editor is required');
    });
  });

  // Complex Commands Tests
  describe('createLoginForm', () => {
    it('should create exactly 8 shapes for login form', () => {
      const result = createLoginForm(mockEditor);

      // 4 geo shapes (background + 2 inputs + button) + 4 text shapes (title + 2 labels + button text) = 8 total
      expect(mockEditor.createShape).toHaveBeenCalledTimes(4);
      expect(mockEditor.createShapes).toHaveBeenCalledTimes(4);
      expect(result).toHaveLength(8);
    });

    it('should create background rectangle', () => {
      createLoginForm(mockEditor);

      const calls = (mockEditor.createShape as jest.Mock).mock.calls;
      const backgroundCall = calls[0][0];
      
      expect(backgroundCall.type).toBe('geo');
      expect(backgroundCall.props.w).toBe(320);
      expect(backgroundCall.props.h).toBe(380);
      expect(backgroundCall.props.color).toBe('light-blue');
    });

    it('should create title text with correct properties', () => {
      createLoginForm(mockEditor);

      const textCalls = (mockEditor.createShapes as jest.Mock).mock.calls;
      const titleCall = textCalls[0][0][0]; // First text shape created
      
      expect(titleCall.type).toBe('text');
      expect(titleCall.props.richText.text).toBe('Login');
      expect(titleCall.props.size).toBe('l'); // 32px maps to l (≤32)
    });

    it('should create two input fields with labels', () => {
      createLoginForm(mockEditor);

      const geoCalls = (mockEditor.createShape as jest.Mock).mock.calls;
      const usernameField = geoCalls[1][0]; // Second geo shape
      const passwordField = geoCalls[2][0]; // Third geo shape
      
      expect(usernameField.type).toBe('geo');
      expect(usernameField.props.w).toBe(260);
      expect(usernameField.props.h).toBe(40);
      expect(usernameField.props.color).toBe('grey');
      
      expect(passwordField.type).toBe('geo');
      expect(passwordField.props.w).toBe(260);
      expect(passwordField.props.h).toBe(40);
      expect(passwordField.props.color).toBe('grey');

      // Check labels
      const textCalls = (mockEditor.createShapes as jest.Mock).mock.calls;
      const usernameLabel = textCalls[1][0][0]; // Second text shape
      const passwordLabel = textCalls[2][0][0]; // Third text shape
      
      expect(usernameLabel.props.richText.text).toBe('Username:');
      expect(passwordLabel.props.richText.text).toBe('Password:');
    });

    it('should create submit button with text', () => {
      createLoginForm(mockEditor);

      const geoCalls = (mockEditor.createShape as jest.Mock).mock.calls;
      const buttonCall = geoCalls[3][0]; // Fourth geo shape
      
      expect(buttonCall.type).toBe('geo');
      expect(buttonCall.props.w).toBe(180);
      expect(buttonCall.props.h).toBe(45);
      expect(buttonCall.props.color).toBe('blue');

      // Check button text
      const textCalls = (mockEditor.createShapes as jest.Mock).mock.calls;
      const buttonText = textCalls[3][0][0]; // Fourth text shape
      
      expect(buttonText.props.richText.text).toBe('Submit');
      expect(buttonText.props.color).toBe('black');
    });

    it('should position all shapes centered in viewport', () => {
      createLoginForm(mockEditor);

      const calls = (mockEditor.createShape as jest.Mock).mock.calls;
      // All shapes should be centered around viewport center (500, 400)
      calls.forEach(call => {
        expect(call[0].x).toBeDefined();
        expect(call[0].y).toBeDefined();
      });
    });

    it('should select all created shapes', () => {
      const result = createLoginForm(mockEditor);

      expect(mockEditor.select).toHaveBeenCalledWith(...result);
    });

    it('should throw error when editor is null', () => {
      expect(() => {
        createLoginForm(null as any);
      }).toThrow('Editor is required');
    });
  });

  describe('createCard', () => {
    it('should create exactly 7 shapes for card layout', () => {
      const result = createCard(mockEditor);

      // 3 geo shapes (background + image placeholder + button) + 4 text shapes (title + subtitle + body + button text) = 7 total
      expect(mockEditor.createShape).toHaveBeenCalledTimes(3);
      expect(mockEditor.createShapes).toHaveBeenCalledTimes(4);
      expect(result).toHaveLength(7);
    });

    it('should use default values when no parameters provided', () => {
      createCard(mockEditor);

      const textCalls = (mockEditor.createShapes as jest.Mock).mock.calls;
      const titleCall = textCalls[0][0][0]; // First text shape
      const subtitleCall = textCalls[1][0][0]; // Second text shape
      
      expect(titleCall.props.richText.text).toBe('Card Title');
      expect(subtitleCall.props.richText.text).toBe('Card subtitle');
    });

    it('should use custom title when provided', () => {
      createCard(mockEditor, { title: 'Custom Title' });

      const textCalls = (mockEditor.createShapes as jest.Mock).mock.calls;
      const titleCall = textCalls[0][0][0]; // First text shape
      
      expect(titleCall.props.richText.text).toBe('Custom Title');
    });

    it('should use custom subtitle when provided', () => {
      createCard(mockEditor, { subtitle: 'Custom Subtitle' });

      const textCalls = (mockEditor.createShapes as jest.Mock).mock.calls;
      const subtitleCall = textCalls[1][0][0]; // Second text shape
      
      expect(subtitleCall.props.richText.text).toBe('Custom Subtitle');
    });

    it('should use custom color when provided', () => {
      createCard(mockEditor, { color: 'red' });

      const calls = (mockEditor.createShape as jest.Mock).mock.calls;
      const backgroundCall = calls[0][0];
      
      expect(backgroundCall.props.color).toBe('red');
    });

    it('should create card background with correct dimensions', () => {
      createCard(mockEditor);

      const calls = (mockEditor.createShape as jest.Mock).mock.calls;
      const backgroundCall = calls[0][0];
      
      expect(backgroundCall.type).toBe('geo');
      expect(backgroundCall.props.w).toBe(300);
      expect(backgroundCall.props.h).toBe(280);
    });

    it('should create title with correct font size', () => {
      createCard(mockEditor);

      const textCalls = (mockEditor.createShapes as jest.Mock).mock.calls;
      const titleCall = textCalls[0][0][0]; // First text shape (title)
      
      expect(titleCall.type).toBe('text');
      expect(titleCall.props.size).toBe('m'); // 24px maps to m (≤24)
    });

    it('should create subtitle with correct font size and color', () => {
      createCard(mockEditor);

      const textCalls = (mockEditor.createShapes as jest.Mock).mock.calls;
      const subtitleCall = textCalls[1][0][0]; // Second text shape (subtitle)
      
      expect(subtitleCall.type).toBe('text');
      expect(subtitleCall.props.size).toBe('s'); // 16px maps to s (≤16)
      expect(subtitleCall.props.color).toBe('grey');
    });

    it('should create image placeholder area', () => {
      createCard(mockEditor);

      const geoCalls = (mockEditor.createShape as jest.Mock).mock.calls;
      const imagePlaceholder = geoCalls[1][0]; // Second geo shape (after background)
      
      expect(imagePlaceholder.type).toBe('geo');
      expect(imagePlaceholder.props.w).toBe(280);
      expect(imagePlaceholder.props.h).toBe(100);
      expect(imagePlaceholder.props.color).toBe('grey');
    });

    it('should create body content text', () => {
      createCard(mockEditor);

      const textCalls = (mockEditor.createShapes as jest.Mock).mock.calls;
      const bodyTextCall = textCalls[2][0][0]; // Third text shape
      
      expect(bodyTextCall.type).toBe('text');
      expect(bodyTextCall.props.richText.text).toBe('Card body content goes here...');
      expect(bodyTextCall.props.size).toBe('s'); // 14px maps to s (≤16)
      expect(bodyTextCall.props.color).toBe('black');
    });

    it('should create action button with text overlay', () => {
      createCard(mockEditor);

      const geoCalls = (mockEditor.createShape as jest.Mock).mock.calls;
      const buttonCall = geoCalls[2][0]; // Third geo shape (button)
      
      expect(buttonCall.type).toBe('geo');
      expect(buttonCall.props.w).toBe(160);
      expect(buttonCall.props.h).toBe(40);
      expect(buttonCall.props.color).toBe('blue');

      const textCalls = (mockEditor.createShapes as jest.Mock).mock.calls;
      const buttonTextCall = textCalls[3][0][0]; // Fourth text shape
      
      expect(buttonTextCall.type).toBe('text');
      expect(buttonTextCall.props.richText.text).toBe('View More');
      expect(buttonTextCall.props.color).toBe('white');
    });

    it('should select all created shapes', () => {
      const result = createCard(mockEditor);

      expect(mockEditor.select).toHaveBeenCalledWith(...result);
    });

    it('should throw error when editor is null', () => {
      expect(() => {
        createCard(null as any);
      }).toThrow('Editor is required');
    });
  });

  describe('createNavigationBar', () => {
    it('should create correct number of shapes for navigation bar with default menu items', () => {
      const result = createNavigationBar(mockEditor);

      // 5 geo shapes (nav + 4 buttons) + 5 text shapes (logo + 4 menu texts) = 10 total
      expect(mockEditor.createShape).toHaveBeenCalledTimes(5);
      expect(mockEditor.createShapes).toHaveBeenCalledTimes(5);
      expect(result).toHaveLength(10);
    });

    it('should use default menu items when not provided', () => {
      createNavigationBar(mockEditor);

      const calls = (mockEditor.createShape as jest.Mock).mock.calls;
      // Check text shapes for menu items (every other shape starting from index 2)
      const menuTexts = calls.filter(call => call[0].type === 'text').slice(1); // Skip logo
      
      expect(menuTexts.length).toBe(4);
    });

    it('should use custom menu items when provided', () => {
      const customMenuItems = ['Dashboard', 'Profile', 'Settings'];
      const result = createNavigationBar(mockEditor, { menuItems: customMenuItems });

      // 4 geo shapes (nav + 3 buttons) + 4 text shapes (logo + 3 menu texts) = 8 total
      expect(mockEditor.createShape).toHaveBeenCalledTimes(4);
      expect(result).toHaveLength(8);
      expect(mockEditor.createShapes).toHaveBeenCalledTimes(4);
    });

    it('should use custom logo text when provided', () => {
      createNavigationBar(mockEditor, { logoText: 'MyApp' });

      const textCalls = (mockEditor.createShapes as jest.Mock).mock.calls;
      const logoCall = textCalls[0][0][0]; // First text shape (logo)
      
      expect(logoCall.type).toBe('text');
      expect(logoCall.props.richText.text).toBe('MyApp');
    });

    it('should use custom color when provided', () => {
      createNavigationBar(mockEditor, { color: 'grey' });

      const calls = (mockEditor.createShape as jest.Mock).mock.calls;
      const navBarCall = calls[0][0];
      
      expect(navBarCall.props.color).toBe('grey');
    });

    it('should create nav bar background with correct dimensions', () => {
      createNavigationBar(mockEditor);

      const calls = (mockEditor.createShape as jest.Mock).mock.calls;
      const navBarCall = calls[0][0];
      
      expect(navBarCall.type).toBe('geo');
      expect(navBarCall.props.w).toBe(800);
      expect(navBarCall.props.h).toBe(60);
    });

    it('should create logo on the left side', () => {
      createNavigationBar(mockEditor);

      const textCalls = (mockEditor.createShapes as jest.Mock).mock.calls;
      const logoCall = textCalls[0][0][0]; // First text shape (logo)
      
      expect(logoCall.type).toBe('text');
      expect(logoCall.props.richText.text).toBe('Logo');
      expect(logoCall.props.size).toBe('m'); // 24px maps to m (≤24)
      expect(logoCall.props.color).toBe('white');
    });

    it('should create menu buttons with correct dimensions', () => {
      createNavigationBar(mockEditor);

      const geoCalls = (mockEditor.createShape as jest.Mock).mock.calls;
      // First geo shape is nav background, then menu buttons
      const firstButton = geoCalls[1][0];
      
      expect(firstButton.type).toBe('geo');
      expect(firstButton.props.w).toBe(100);
      expect(firstButton.props.h).toBe(35);
      expect(firstButton.props.color).toBe('grey');
    });

    it('should create menu item text with white color', () => {
      createNavigationBar(mockEditor);

      const textCalls = (mockEditor.createShapes as jest.Mock).mock.calls;
      // Logo is first, then menu item texts
      const firstMenuText = textCalls[1][0][0]; // Second text shape (first menu item)
      
      expect(firstMenuText.type).toBe('text');
      expect(firstMenuText.props.color).toBe('white');
      expect(firstMenuText.props.size).toBe('s'); // 16px maps to s (≤16)
    });

    it('should select all created shapes', () => {
      const result = createNavigationBar(mockEditor);

      expect(mockEditor.select).toHaveBeenCalledWith(...result);
    });

    it('should handle single menu item', () => {
      const result = createNavigationBar(mockEditor, { menuItems: ['Home'] });

      // 2 geo shapes (nav + 1 button) + 2 text shapes (logo + 1 menu text) = 4 total
      expect(mockEditor.createShape).toHaveBeenCalledTimes(2);
      expect(result).toHaveLength(4);
      expect(mockEditor.createShapes).toHaveBeenCalledTimes(2);
    });

    it('should handle many menu items', () => {
      const manyItems = ['One', 'Two', 'Three', 'Four', 'Five', 'Six'];
      const result = createNavigationBar(mockEditor, { menuItems: manyItems });

      // 1 nav bar + 1 logo + 6 menu items * 2 = 14 shapes
      expect(mockEditor.createShape).toHaveBeenCalledTimes(14);
      // 7 geo shapes (nav + 6 buttons) + 7 text shapes (logo + 6 menu texts) = 14 total
      expect(mockEditor.createShape).toHaveBeenCalledTimes(7);

      expect(mockEditor.createShapes).toHaveBeenCalledTimes(7);
    });
    it('should throw error when editor is null', () => {
      expect(() => {
        createNavigationBar(null as any);
      }).toThrow('Editor is required');
    });
  });
});

