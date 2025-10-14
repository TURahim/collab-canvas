/**
 * Tests for Manipulation Tool Functions (PR #14)
 */

import { 
  moveShape, 
  transformShape, 
  getTargetShapes, 
  calculatePosition 
} from '../canvasTools';
import type { Editor, TLShapeId } from '@tldraw/tldraw';

// Mock nanoid
jest.mock('nanoid', () => ({
  nanoid: () => 'test-id-123',
}));

describe('Manipulation Tools', () => {
  let mockEditor: jest.Mocked<Editor>;
  let mockShapes: any[];

  beforeEach(() => {
    // Create mock shapes
    mockShapes = [
      {
        id: 'shape:1' as TLShapeId,
        type: 'geo',
        x: 100,
        y: 100,
        props: { geo: 'rectangle', w: 200, h: 150, color: 'blue' },
      },
      {
        id: 'shape:2' as TLShapeId,
        type: 'geo',
        x: 300,
        y: 200,
        props: { geo: 'ellipse', w: 150, h: 150, color: 'red' },
      },
    ];

    mockEditor = {
      getSelectedShapes: jest.fn().mockReturnValue([mockShapes[0]]),
      getCurrentPageShapes: jest.fn().mockReturnValue(mockShapes),
      getShape: jest.fn((id: TLShapeId) => mockShapes.find(s => s.id === id)),
      getViewportPageBounds: jest.fn().mockReturnValue({
        x: 0,
        y: 0,
        width: 1000,
        height: 800,
      }),
      getShapePageBounds: jest.fn((id: TLShapeId) => {
        const shape = mockShapes.find(s => s.id === id);
        if (!shape) return null;
        return {
          x: shape.x,
          y: shape.y,
          width: shape.props.w,
          height: shape.props.h,
        };
      }),
      updateShape: jest.fn(),
      select: jest.fn(),
    } as unknown as jest.Mocked<Editor>;
  });

  describe('getTargetShapes', () => {
    it('should return selected shapes when target is "selected"', () => {
      const shapes = getTargetShapes(mockEditor, 'selected');
      
      expect(shapes).toEqual([mockShapes[0]]);
      expect(mockEditor.getSelectedShapes).toHaveBeenCalled();
    });

    it('should return all shapes when target is "all"', () => {
      const shapes = getTargetShapes(mockEditor, 'all');
      
      expect(shapes).toEqual(mockShapes);
      expect(mockEditor.getCurrentPageShapes).toHaveBeenCalled();
    });

    it('should return specific shape when target is a shape ID', () => {
      const shapes = getTargetShapes(mockEditor, 'shape:2');
      
      expect(shapes).toEqual([mockShapes[1]]);
      expect(mockEditor.getShape).toHaveBeenCalledWith('shape:2');
    });

    it('should throw error when no shapes are selected', () => {
      mockEditor.getSelectedShapes.mockReturnValue([]);
      
      expect(() => {
        getTargetShapes(mockEditor, 'selected');
      }).toThrow('No shapes selected');
    });

    it('should throw error when shape ID is not found', () => {
      mockEditor.getShape.mockReturnValue(null);
      
      expect(() => {
        getTargetShapes(mockEditor, 'shape:999');
      }).toThrow('Shape with ID "shape:999" not found');
    });

    it('should throw error when editor is null', () => {
      expect(() => {
        getTargetShapes(null as any, 'selected');
      }).toThrow('Editor is required');
    });
  });

  describe('calculatePosition', () => {
    it('should return numeric coordinates when both x and y are numbers', () => {
      const pos = calculatePosition(mockEditor, 500, 400);
      
      expect(pos).toEqual({ x: 500, y: 400 });
    });

    it('should calculate center position when keywords are "center"', () => {
      const pos = calculatePosition(mockEditor, 'center', 'center');
      
      expect(pos).toEqual({ x: 500, y: 400 }); // center of 1000x800 viewport
    });

    it('should calculate left position', () => {
      const pos = calculatePosition(mockEditor, 'left', 'center');
      
      expect(pos).toEqual({ x: 100, y: 400 }); // 100px from left edge
    });

    it('should calculate right position', () => {
      const pos = calculatePosition(mockEditor, 'right', 'center');
      
      expect(pos).toEqual({ x: 900, y: 400 }); // 100px from right edge
    });

    it('should calculate top position', () => {
      const pos = calculatePosition(mockEditor, 'center', 'top');
      
      expect(pos).toEqual({ x: 500, y: 100 }); // 100px from top edge
    });

    it('should calculate bottom position', () => {
      const pos = calculatePosition(mockEditor, 'center', 'bottom');
      
      expect(pos).toEqual({ x: 500, y: 700 }); // 100px from bottom edge
    });

    it('should default to center when x/y are undefined', () => {
      const pos = calculatePosition(mockEditor, undefined, undefined);
      
      expect(pos).toEqual({ x: 500, y: 400 });
    });

    it('should mix numeric and keyword positions', () => {
      const pos = calculatePosition(mockEditor, 250, 'top');
      
      expect(pos).toEqual({ x: 250, y: 100 });
    });
  });

  describe('moveShape', () => {
    it('should move selected shape to numeric coordinates', () => {
      const movedIds = moveShape(mockEditor, {
        target: 'selected',
        x: 500,
        y: 300,
      });

      expect(movedIds).toEqual(['shape:1']);
      expect(mockEditor.updateShape).toHaveBeenCalledWith({
        id: 'shape:1',
        type: 'geo',
        x: 400, // 500 - 200/2 (center shape at target)
        y: 225, // 300 - 150/2
      });
      expect(mockEditor.select).toHaveBeenCalledWith('shape:1');
    });

    it('should move shape to "center" keyword', () => {
      moveShape(mockEditor, {
        target: 'selected',
        x: 'center',
        y: 'center',
      });

      expect(mockEditor.updateShape).toHaveBeenCalledWith({
        id: 'shape:1',
        type: 'geo',
        x: 400, // 500 - 200/2
        y: 325, // 400 - 150/2
      });
    });

    it('should move shape to "left" position', () => {
      moveShape(mockEditor, {
        target: 'selected',
        x: 'left',
        y: 'center',
      });

      expect(mockEditor.updateShape).toHaveBeenCalledWith({
        id: 'shape:1',
        type: 'geo',
        x: 0, // 100 - 200/2
        y: 325,
      });
    });

    it('should move multiple shapes when target is "all"', () => {
      const movedIds = moveShape(mockEditor, {
        target: 'all',
        x: 'center',
        y: 'top',
      });

      expect(movedIds.length).toBe(2);
      expect(mockEditor.updateShape).toHaveBeenCalledTimes(2);
      expect(mockEditor.select).toHaveBeenCalledWith('shape:1', 'shape:2');
    });

    it('should move specific shape by ID', () => {
      const movedIds = moveShape(mockEditor, {
        target: 'shape:2',
        x: 600,
        y: 400,
      });

      expect(movedIds).toEqual(['shape:2']);
      expect(mockEditor.updateShape).toHaveBeenCalledWith({
        id: 'shape:2',
        type: 'geo',
        x: 525, // 600 - 150/2
        y: 325, // 400 - 150/2
      });
    });

    it('should throw error when editor is null', () => {
      expect(() => {
        moveShape(null as any, { target: 'selected', x: 100, y: 100 });
      }).toThrow('Editor is required');
    });

    it('should throw error when no shapes are selected', () => {
      mockEditor.getSelectedShapes.mockReturnValue([]);
      
      expect(() => {
        moveShape(mockEditor, { target: 'selected', x: 100, y: 100 });
      }).toThrow('No shapes selected');
    });

    it('should use defaults when x/y are not provided', () => {
      moveShape(mockEditor, {
        target: 'selected',
      });

      // Should default to center
      expect(mockEditor.updateShape).toHaveBeenCalledWith({
        id: 'shape:1',
        type: 'geo',
        x: 400, // center - shape width/2
        y: 325, // center - shape height/2
      });
    });
  });

  describe('transformShape', () => {
    it('should resize shape with width and height', () => {
      const transformedIds = transformShape(mockEditor, {
        target: 'selected',
        width: 300,
        height: 250,
      });

      expect(transformedIds).toEqual(['shape:1']);
      expect(mockEditor.updateShape).toHaveBeenCalledWith({
        id: 'shape:1',
        type: 'geo',
        props: {
          geo: 'rectangle',
          w: 300,
          h: 250,
          color: 'blue',
        },
      });
      expect(mockEditor.select).toHaveBeenCalledWith('shape:1');
    });

    it('should rotate shape by degrees', () => {
      transformShape(mockEditor, {
        target: 'selected',
        rotation: 45,
      });

      const radians = (45 * Math.PI) / 180;
      expect(mockEditor.updateShape).toHaveBeenCalledWith({
        id: 'shape:1',
        type: 'geo',
        rotation: radians,
      });
    });

    it('should scale shape by multiplier', () => {
      transformShape(mockEditor, {
        target: 'selected',
        scale: 1.5,
      });

      expect(mockEditor.updateShape).toHaveBeenCalledWith({
        id: 'shape:1',
        type: 'geo',
        props: {
          geo: 'rectangle',
          w: 300, // 200 * 1.5
          h: 225, // 150 * 1.5
          color: 'blue',
        },
      });
    });

    it('should rotate 90 degrees', () => {
      transformShape(mockEditor, {
        target: 'selected',
        rotation: 90,
      });

      const radians = (90 * Math.PI) / 180;
      expect(mockEditor.updateShape).toHaveBeenCalledWith(
        expect.objectContaining({
          rotation: radians,
        })
      );
    });

    it('should rotate 180 degrees', () => {
      transformShape(mockEditor, {
        target: 'selected',
        rotation: 180,
      });

      const radians = Math.PI;
      expect(mockEditor.updateShape).toHaveBeenCalledWith(
        expect.objectContaining({
          rotation: radians,
        })
      );
    });

    it('should combine multiple transformations', () => {
      transformShape(mockEditor, {
        target: 'selected',
        width: 400,
        height: 300,
        rotation: 45,
      });

      const radians = (45 * Math.PI) / 180;
      expect(mockEditor.updateShape).toHaveBeenCalledWith({
        id: 'shape:1',
        type: 'geo',
        props: {
          geo: 'rectangle',
          w: 400,
          h: 300,
          color: 'blue',
        },
        rotation: radians,
      });
    });

    it('should transform specific shape by ID', () => {
      const transformedIds = transformShape(mockEditor, {
        target: 'shape:2',
        scale: 2,
      });

      expect(transformedIds).toEqual(['shape:2']);
      expect(mockEditor.updateShape).toHaveBeenCalledWith({
        id: 'shape:2',
        type: 'geo',
        props: {
          geo: 'ellipse',
          w: 300, // 150 * 2
          h: 300, // 150 * 2
          color: 'red',
        },
      });
    });

    it('should only resize width when height is not provided', () => {
      transformShape(mockEditor, {
        target: 'selected',
        width: 350,
      });

      expect(mockEditor.updateShape).toHaveBeenCalledWith({
        id: 'shape:1',
        type: 'geo',
        props: {
          geo: 'rectangle',
          w: 350,
          h: 150, // unchanged
          color: 'blue',
        },
      });
    });

    it('should only resize height when width is not provided', () => {
      transformShape(mockEditor, {
        target: 'selected',
        height: 200,
      });

      expect(mockEditor.updateShape).toHaveBeenCalledWith({
        id: 'shape:1',
        type: 'geo',
        props: {
          geo: 'rectangle',
          w: 200, // unchanged
          h: 200,
          color: 'blue',
        },
      });
    });

    it('should throw error when editor is null', () => {
      expect(() => {
        transformShape(null as any, { target: 'selected', width: 100 });
      }).toThrow('Editor is required');
    });

    it('should throw error when no shapes are selected', () => {
      mockEditor.getSelectedShapes.mockReturnValue([]);
      
      expect(() => {
        transformShape(mockEditor, { target: 'selected', width: 100 });
      }).toThrow('No shapes selected');
    });

    it('should scale down with multiplier less than 1', () => {
      transformShape(mockEditor, {
        target: 'selected',
        scale: 0.5,
      });

      expect(mockEditor.updateShape).toHaveBeenCalledWith({
        id: 'shape:1',
        type: 'geo',
        props: {
          geo: 'rectangle',
          w: 100, // 200 * 0.5
          h: 75,  // 150 * 0.5
          color: 'blue',
        },
      });
    });
  });
});


