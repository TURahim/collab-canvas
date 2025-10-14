/**
 * Tests for Canvas Tool Functions
 */

import { createShape, createTextShape, mapToTldrawColor, getViewportCenter } from '../canvasTools';
import type { Editor } from '@tldraw/tldraw';

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
});

