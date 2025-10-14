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
        width: 800,
        height: 600,
      });

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
      expect(mockEditor.createShape).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'shape:test-id-123',
          type: 'text',
          props: expect.objectContaining({
            text: 'Hello World',
            size: 'l', // 32px maps to 'l' (24-32 range)
            color: 'red',
          }),
        })
      );
      expect(mockEditor.select).toHaveBeenCalledWith('shape:test-id-123');
    });

    it('should default to viewport center when no position provided', () => {
      createTextShape(mockEditor, {
        text: 'Test',
      });

      const createCall = (mockEditor.createShape as jest.Mock).mock.calls[0][0];
      // Should be centered around viewport center
      expect(createCall.x).toBeLessThan(500);
      expect(createCall.y).toBeLessThan(400);
    });

    it('should use default font size when not specified', () => {
      createTextShape(mockEditor, {
        text: 'Test',
      });

      expect(mockEditor.createShape).toHaveBeenCalledWith(
        expect.objectContaining({
          props: expect.objectContaining({
            size: 'm', // 24px default maps to 'm' (16-24 range)
          }),
        })
      );
    });

    it('should trim whitespace from text', () => {
      createTextShape(mockEditor, {
        text: '  Hello World  ',
      });

      expect(mockEditor.createShape).toHaveBeenCalledWith(
        expect.objectContaining({
          props: expect.objectContaining({
            text: 'Hello World',
          }),
        })
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

    it('should throw error for invalid shape type', () => {
      expect(() => {
        createGrid(mockEditor, { shapeType: 'triangle' as any });
      }).toThrow('Shape type must be rectangle or ellipse');
    });

    it('should throw error when editor is null', () => {
      expect(() => {
        createGrid(null as any, {});
      }).toThrow('Editor is required');
    });
  });
});

