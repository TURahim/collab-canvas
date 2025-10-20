/**
 * Tests for moveShapeTo function
 * Comprehensive test coverage for AI move commands
 */

import type { Editor, TLShapeId } from '@tldraw/tldraw';
import { moveShapeTo } from '../canvasTools';

// Mock nanoid (used by createShapeId internally)
jest.mock('nanoid', () => ({
  nanoid: () => 'test-id-123',
}));

// Helper to create mock shape IDs
const createTestShapeId = (id: string): TLShapeId => `shape:${id}` as TLShapeId;

// Mock editor factory
const createMockEditor = () => {
  const shapes = new Map();
  const currentPageId = 'page1';
  
  const mockEditor = {
    getCurrentPageId: jest.fn(() => currentPageId),
    getSelectedShapes: jest.fn(() => Array.from(shapes.values()).filter((s: any) => s.selected)),
    getCurrentPageShapes: jest.fn(() => Array.from(shapes.values())),
    getShape: jest.fn((id: TLShapeId) => shapes.get(id)),
    updateShape: jest.fn((partial: any) => {
      const shape = shapes.get(partial.id);
      if (shape) {
        Object.assign(shape, partial);
      }
    }),
    getViewportPageBounds: jest.fn(() => ({
      x: 0,
      y: 0,
      width: 1000,
      height: 800,
    })),
  };
  
  return { mockEditor: mockEditor as unknown as Editor, shapes };
};

describe('moveShapeTo', () => {
  describe('Keyword Resolution', () => {
    it('should move shape to center', () => {
      const { mockEditor, shapes } = createMockEditor();
      const shapeId = createTestShapeId('test1');
      
      shapes.set(shapeId, {
        id: shapeId,
        type: 'geo',
        x: 0,
        y: 0,
        parentId: 'page1',
        isLocked: false,
        selected: true,
        props: { w: 100, h: 100 },
      });
      
      const result = moveShapeTo(mockEditor, {
        target: 'selected',
        x: 'center',
        y: 'center',
      });
      
      expect(result.actuallyMoved).toBe(true);
      expect(result.count).toBe(1);
      expect(mockEditor.batch).toHaveBeenCalled();
      
      const shape = shapes.get(shapeId);
      // Center of viewport (1000x800) is (500, 400)
      // Shape center should be at (500, 400), so top-left at (450, 350)
      expect(shape.x).toBeCloseTo(450, 0);
      expect(shape.y).toBeCloseTo(350, 0);
    });
    
    it('should move shape to left', () => {
      const { mockEditor, shapes } = createMockEditor();
      const shapeId = createTestShapeId('test2');
      
      shapes.set(shapeId, {
        id: shapeId,
        type: 'geo',
        x: 500,
        y: 400,
        parentId: 'page1',
        isLocked: false,
        selected: true,
        props: { w: 100, h: 100 },
      });
      
      const result = moveShapeTo(mockEditor, {
        target: 'selected',
        x: 'left',
      });
      
      expect(result.actuallyMoved).toBe(true);
      const shape = shapes.get(shapeId);
      // Left keyword = viewport.x + 100 = 0 + 100 = 100
      // Shape center at 100, so top-left at 50
      expect(shape.x).toBeCloseTo(50, 0);
    });
    
    it('should move shape to right', () => {
      const { mockEditor, shapes } = createMockEditor();
      const shapeId = createTestShapeId('test3');
      
      shapes.set(shapeId, {
        id: shapeId,
        type: 'geo',
        x: 100,
        y: 400,
        parentId: 'page1',
        isLocked: false,
        selected: true,
        props: { w: 100, h: 100 },
      });
      
      const result = moveShapeTo(mockEditor, {
        target: 'selected',
        x: 'right',
      });
      
      expect(result.actuallyMoved).toBe(true);
      const shape = shapes.get(shapeId);
      // Right keyword = viewport.x + viewport.width - 100 = 900
      // Shape center at 900, so top-left at 850
      expect(shape.x).toBeCloseTo(850, 0);
    });
    
    it('should move shape to top', () => {
      const { mockEditor, shapes } = createMockEditor();
      const shapeId = createTestShapeId('test-shape');
      
      shapes.set(shapeId, {
        id: shapeId,
        type: 'geo',
        x: 500,
        y: 400,
        parentId: 'page1',
        isLocked: false,
        selected: true,
        props: { w: 100, h: 100 },
      });
      
      const result = moveShapeTo(mockEditor, {
        target: 'selected',
        y: 'top',
      });
      
      expect(result.actuallyMoved).toBe(true);
      const shape = shapes.get(shapeId);
      // Top keyword = viewport.y + 100 = 100
      // Shape center at 100, so top-left at 50
      expect(shape.y).toBeCloseTo(50, 0);
    });
    
    it('should move shape to bottom', () => {
      const { mockEditor, shapes } = createMockEditor();
      const shapeId = createTestShapeId('test-shape');
      
      shapes.set(shapeId, {
        id: shapeId,
        type: 'geo',
        x: 500,
        y: 100,
        parentId: 'page1',
        isLocked: false,
        selected: true,
        props: { w: 100, h: 100 },
      });
      
      const result = moveShapeTo(mockEditor, {
        target: 'selected',
        y: 'bottom',
      });
      
      expect(result.actuallyMoved).toBe(true);
      const shape = shapes.get(shapeId);
      // Bottom keyword = viewport.y + viewport.height - 100 = 700
      // Shape center at 700, so top-left at 650
      expect(shape.y).toBeCloseTo(650, 0);
    });
  });
  
  describe('Numeric Coordinates', () => {
    it('should move shape to numeric x,y coordinates', () => {
      const { mockEditor, shapes } = createMockEditor();
      const shapeId = createTestShapeId('test-shape');
      
      shapes.set(shapeId, {
        id: shapeId,
        type: 'geo',
        x: 0,
        y: 0,
        parentId: 'page1',
        isLocked: false,
        selected: true,
        props: { w: 100, h: 100 },
      });
      
      const result = moveShapeTo(mockEditor, {
        target: 'selected',
        x: 300,
        y: 200,
      });
      
      expect(result.actuallyMoved).toBe(true);
      const shape = shapes.get(shapeId);
      // Shape center at (300, 200), so top-left at (250, 150)
      expect(shape.x).toBeCloseTo(250, 0);
      expect(shape.y).toBeCloseTo(150, 0);
    });
    
    it('should move shape to partial coordinates (x only)', () => {
      const { mockEditor, shapes } = createMockEditor();
      const shapeId = createTestShapeId('test-shape');
      
      shapes.set(shapeId, {
        id: shapeId,
        type: 'geo',
        x: 100,
        y: 200,
        parentId: 'page1',
        isLocked: false,
        selected: true,
        props: { w: 100, h: 100 },
      });
      
      const result = moveShapeTo(mockEditor, {
        target: 'selected',
        x: 500,
      });
      
      expect(result.actuallyMoved).toBe(true);
      const shape = shapes.get(shapeId);
      expect(shape.x).toBeCloseTo(450, 0);
      expect(shape.y).toBe(200); // Y unchanged
    });
  });
  
  describe('Target Resolution', () => {
    it('should move selected shapes', () => {
      const { mockEditor, shapes } = createMockEditor();
      const shapeId1 = createTestShapeId('test-shape-1');
      const shapeId2 = createTestShapeId('test-shape-2');
      
      shapes.set(shapeId1, {
        id: shapeId1,
        type: 'geo',
        x: 0,
        y: 0,
        parentId: 'page1',
        isLocked: false,
        selected: true,
        props: { w: 100, h: 100 },
      });
      
      shapes.set(shapeId2, {
        id: shapeId2,
        type: 'geo',
        x: 200,
        y: 0,
        parentId: 'page1',
        isLocked: false,
        selected: true,
        props: { w: 100, h: 100 },
      });
      
      const result = moveShapeTo(mockEditor, {
        target: 'selected',
        x: 'center',
        y: 'center',
      });
      
      expect(result.count).toBe(2);
      expect(result.actuallyMoved).toBe(true);
    });
    
    it('should throw error when no shapes selected', () => {
      const { mockEditor } = createMockEditor();
      
      expect(() => {
        moveShapeTo(mockEditor, {
          target: 'selected',
          x: 'center',
        });
      }).toThrow('No shapes selected');
    });
    
    it('should move all shapes', () => {
      const { mockEditor, shapes } = createMockEditor();
      const shapeId1 = createTestShapeId('test-shape-1');
      const shapeId2 = createTestShapeId('test-shape-2');
      
      shapes.set(shapeId1, {
        id: shapeId1,
        type: 'geo',
        x: 0,
        y: 0,
        parentId: 'page1',
        isLocked: false,
        props: { w: 100, h: 100 },
      });
      
      shapes.set(shapeId2, {
        id: shapeId2,
        type: 'geo',
        x: 200,
        y: 0,
        parentId: 'page1',
        isLocked: false,
        props: { w: 100, h: 100 },
      });
      
      const result = moveShapeTo(mockEditor, {
        target: 'all',
        x: 'center',
      });
      
      expect(result.count).toBe(2);
      expect(result.actuallyMoved).toBe(true);
    });
  });
  
  describe('Shape Validation', () => {
    it('should skip locked shapes', () => {
      const { mockEditor, shapes } = createMockEditor();
      const shapeId1 = createTestShapeId('test-shape-1');
      const shapeId2 = createTestShapeId('test-shape-2');
      
      shapes.set(shapeId1, {
        id: shapeId1,
        type: 'geo',
        x: 0,
        y: 0,
        parentId: 'page1',
        isLocked: true,
        selected: true,
        props: { w: 100, h: 100 },
      });
      
      shapes.set(shapeId2, {
        id: shapeId2,
        type: 'geo',
        x: 200,
        y: 0,
        parentId: 'page1',
        isLocked: false,
        selected: true,
        props: { w: 100, h: 100 },
      });
      
      const result = moveShapeTo(mockEditor, {
        target: 'selected',
        x: 'center',
      });
      
      expect(result.count).toBe(1);
      expect(result.skipped.length).toBe(1);
      expect(result.skipped[0].reason).toBe('Shape is locked');
    });
    
    it('should skip shapes on different page', () => {
      const { mockEditor, shapes } = createMockEditor();
      const shapeId1 = createShapeId();
      
      shapes.set(shapeId1, {
        id: shapeId1,
        type: 'geo',
        x: 0,
        y: 0,
        parentId: 'page2', // Different page
        isLocked: false,
        selected: true,
        props: { w: 100, h: 100 },
      });
      
      expect(() => {
        moveShapeTo(mockEditor, {
          target: 'selected',
          x: 'center',
        });
      }).toThrow('No movable shapes found');
    });
  });
  
  describe('Union Bounds (Layout Preservation)', () => {
    it('should preserve relative layout when moving multiple shapes', () => {
      const { mockEditor, shapes } = createMockEditor();
      const shapeId1 = createTestShapeId('test-shape-1');
      const shapeId2 = createTestShapeId('test-shape-2');
      
      // Two shapes 100px apart horizontally
      shapes.set(shapeId1, {
        id: shapeId1,
        type: 'geo',
        x: 100,
        y: 100,
        parentId: 'page1',
        isLocked: false,
        selected: true,
        props: { w: 50, h: 50 },
      });
      
      shapes.set(shapeId2, {
        id: shapeId2,
        type: 'geo',
        x: 200,
        y: 100,
        parentId: 'page1',
        isLocked: false,
        selected: true,
        props: { w: 50, h: 50 },
      });
      
      // Record original distance
      const originalDistance = shapes.get(shapeId2).x - shapes.get(shapeId1).x;
      
      moveShapeTo(mockEditor, {
        target: 'selected',
        x: 'center',
        y: 'center',
      });
      
      // Check that distance is preserved
      const newDistance = shapes.get(shapeId2).x - shapes.get(shapeId1).x;
      expect(newDistance).toBeCloseTo(originalDistance, 5);
    });
  });
  
  describe('Edge Cases', () => {
    it('should return actuallyMoved=false when shape already at target', () => {
      const { mockEditor, shapes } = createMockEditor();
      const shapeId = createTestShapeId('test-shape');
      
      // Place shape exactly at center
      shapes.set(shapeId, {
        id: shapeId,
        type: 'geo',
        x: 450, // Center (500) - half width (50)
        y: 350, // Center (400) - half height (50)
        parentId: 'page1',
        isLocked: false,
        selected: true,
        props: { w: 100, h: 100 },
      });
      
      const result = moveShapeTo(mockEditor, {
        target: 'selected',
        x: 'center',
        y: 'center',
      });
      
      expect(result.actuallyMoved).toBe(false);
      expect(result.count).toBe(1);
    });
    
    it('should throw error when no position parameters provided', () => {
      const { mockEditor, shapes } = createMockEditor();
      const shapeId = createTestShapeId('test-shape');
      
      shapes.set(shapeId, {
        id: shapeId,
        type: 'geo',
        x: 0,
        y: 0,
        parentId: 'page1',
        isLocked: false,
        selected: true,
        props: { w: 100, h: 100 },
      });
      
      expect(() => {
        moveShapeTo(mockEditor, {
          target: 'selected',
        });
      }).toThrow('Must provide at least one of: x, y, deltaX, deltaY');
    });
  });
  
  describe('Backward Compatibility', () => {
    it('should support deltaX/deltaY for relative movement', () => {
      const { mockEditor, shapes } = createMockEditor();
      const shapeId = createTestShapeId('test-shape');
      
      shapes.set(shapeId, {
        id: shapeId,
        type: 'geo',
        x: 100,
        y: 100,
        parentId: 'page1',
        isLocked: false,
        selected: true,
        props: { w: 100, h: 100 },
      });
      
      const result = moveShapeTo(mockEditor, {
        target: 'selected',
        deltaX: 50,
        deltaY: 30,
      });
      
      expect(result.actuallyMoved).toBe(true);
      const shape = shapes.get(shapeId);
      expect(shape.x).toBe(150);
      expect(shape.y).toBe(130);
    });
    
    it('should prioritize deltaX/deltaY over x/y keywords', () => {
      const { mockEditor, shapes } = createMockEditor();
      const shapeId = createTestShapeId('test-shape');
      
      shapes.set(shapeId, {
        id: shapeId,
        type: 'geo',
        x: 100,
        y: 100,
        parentId: 'page1',
        isLocked: false,
        selected: true,
        props: { w: 100, h: 100 },
      });
      
      const result = moveShapeTo(mockEditor, {
        target: 'selected',
        deltaX: 50,
        x: 'center', // Should be ignored
      });
      
      expect(result.actuallyMoved).toBe(true);
      const shape = shapes.get(shapeId);
      expect(shape.x).toBe(150); // Moved by delta, not to center
    });
  });
  
  describe('Multiple Shape Updates', () => {
    it('should update multiple shapes successfully', () => {
      const { mockEditor, shapes } = createMockEditor();
      const shapeId1 = createTestShapeId('test-shape-1');
      const shapeId2 = createTestShapeId('test-shape-2');
      
      shapes.set(shapeId1, {
        id: shapeId1,
        type: 'geo',
        x: 0,
        y: 0,
        parentId: 'page1',
        isLocked: false,
        selected: true,
        props: { w: 100, h: 100 },
      });
      
      shapes.set(shapeId2, {
        id: shapeId2,
        type: 'geo',
        x: 200,
        y: 0,
        parentId: 'page1',
        isLocked: false,
        selected: true,
        props: { w: 100, h: 100 },
      });
      
      const result = moveShapeTo(mockEditor, {
        target: 'selected',
        x: 'center',
      });
      
      // Verify both shapes were moved
      expect(result.count).toBe(2);
      expect(result.actuallyMoved).toBe(true);
      expect(mockEditor.updateShape).toHaveBeenCalledTimes(2);
    });
  });
});

