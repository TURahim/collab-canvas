/**
 * Unit Tests for tldraw Helper Utilities
 * Tests coordinate conversion and shape serialization - CRITICAL for preventing bugs
 */

import { Editor } from "@tldraw/tldraw";
import { Timestamp } from "firebase/firestore";
import {
  screenToPage,
  pageToScreen,
  serializeShape,
  deserializeShape,
  isValidShape,
  getEditorShapes,
  throttle,
  debounce,
} from "../tldrawHelpers";
import { Shape, TldrawShape } from "../../types";

// Mock Editor class for testing
class MockEditor {
  private zoom = 1;
  private cameraX = 0;
  private cameraY = 0;

  constructor(zoom = 1, cameraX = 0, cameraY = 0) {
    this.zoom = zoom;
    this.cameraX = cameraX;
    this.cameraY = cameraY;
  }

  screenToPage(point: { x: number; y: number }) {
    return {
      x: point.x / this.zoom + this.cameraX,
      y: point.y / this.zoom + this.cameraY,
    };
  }

  pageToScreen(point: { x: number; y: number }) {
    return {
      x: (point.x - this.cameraX) * this.zoom,
      y: (point.y - this.cameraY) * this.zoom,
    };
  }

  getCurrentPageShapes() {
    return [];
  }
}

describe("tldrawHelpers - Coordinate Conversion", () => {
  describe("screenToPage", () => {
    it("converts screen coordinates to page coordinates at 1x zoom", () => {
      const editor = new MockEditor(1, 0, 0) as unknown as Editor;
      const result = screenToPage(editor, { x: 100, y: 200 });
      
      expect(result).toEqual({ x: 100, y: 200 });
    });

    it("converts screen coordinates with 2x zoom", () => {
      const editor = new MockEditor(2, 0, 0) as unknown as Editor;
      const result = screenToPage(editor, { x: 200, y: 400 });
      
      // At 2x zoom, screen coords are doubled, so page coords are halved
      expect(result).toEqual({ x: 100, y: 200 });
    });

    it("converts screen coordinates with 0.5x zoom", () => {
      const editor = new MockEditor(0.5, 0, 0) as unknown as Editor;
      const result = screenToPage(editor, { x: 100, y: 200 });
      
      // At 0.5x zoom, screen coords are halved, so page coords are doubled
      expect(result).toEqual({ x: 200, y: 400 });
    });

    it("handles camera offset correctly", () => {
      const editor = new MockEditor(1, 50, 100) as unknown as Editor;
      const result = screenToPage(editor, { x: 100, y: 200 });
      
      // Camera offset shifts the page coordinates
      expect(result).toEqual({ x: 150, y: 300 });
    });

    it("handles zoom and camera offset together", () => {
      const editor = new MockEditor(2, 50, 100) as unknown as Editor;
      const result = screenToPage(editor, { x: 200, y: 400 });
      
      // Apply zoom first, then add camera offset
      expect(result).toEqual({ x: 150, y: 300 });
    });
  });

  describe("pageToScreen", () => {
    it("converts page coordinates to screen coordinates at 1x zoom", () => {
      const editor = new MockEditor(1, 0, 0) as unknown as Editor;
      const result = pageToScreen(editor, { x: 100, y: 200 });
      
      expect(result).toEqual({ x: 100, y: 200 });
    });

    it("converts page coordinates with 2x zoom", () => {
      const editor = new MockEditor(2, 0, 0) as unknown as Editor;
      const result = pageToScreen(editor, { x: 100, y: 200 });
      
      // At 2x zoom, page coords are doubled to screen coords
      expect(result).toEqual({ x: 200, y: 400 });
    });

    it("converts page coordinates with 0.5x zoom", () => {
      const editor = new MockEditor(0.5, 0, 0) as unknown as Editor;
      const result = pageToScreen(editor, { x: 200, y: 400 });
      
      // At 0.5x zoom, page coords are halved to screen coords
      expect(result).toEqual({ x: 100, y: 200 });
    });

    it("handles camera offset correctly", () => {
      const editor = new MockEditor(1, 50, 100) as unknown as Editor;
      const result = pageToScreen(editor, { x: 150, y: 300 });
      
      // Subtract camera offset first, then apply zoom
      expect(result).toEqual({ x: 100, y: 200 });
    });

    it("round-trip conversion maintains accuracy", () => {
      const editor = new MockEditor(2, 50, 100) as unknown as Editor;
      const original = { x: 123.456, y: 789.012 };
      
      const screen = pageToScreen(editor, original);
      const back = screenToPage(editor, screen);
      
      expect(back.x).toBeCloseTo(original.x, 5);
      expect(back.y).toBeCloseTo(original.y, 5);
    });
  });
});

describe("tldrawHelpers - Shape Serialization", () => {
  const mockTldrawShape: TldrawShape = {
    id: "shape-123",
    type: "rectangle",
    x: 100,
    y: 200,
    rotation: 45,
    props: {
      w: 150,
      h: 100,
      fill: "#4DABF7",
    },
  };

  const mockFirestoreShape: Shape = {
    id: "shape-123",
    type: "rectangle",
    x: 100,
    y: 200,
    rotation: 45,
    props: {
      w: 150,
      h: 100,
      fill: "#4DABF7",
    },
    createdBy: "user-abc",
    createdAt: Timestamp.fromDate(new Date("2024-01-01")),
    updatedAt: Timestamp.fromDate(new Date("2024-01-02")),
  };

  describe("serializeShape", () => {
    it("serializes tldraw shape to Firestore format", () => {
      const result = serializeShape(mockTldrawShape, "user-abc");
      
      expect(result).toEqual({
        id: "shape-123",
        type: "rectangle",
        x: 100,
        y: 200,
        rotation: 45,
        props: {
          w: 150,
          h: 100,
          fill: "#4DABF7",
        },
        createdBy: "user-abc",
      });
    });

    it("handles missing optional properties", () => {
      const minimalShape: TldrawShape = {
        id: "shape-456",
        type: "ellipse",
        x: 50,
        y: 75,
      };
      
      const result = serializeShape(minimalShape, "user-xyz");
      
      expect(result).toEqual({
        id: "shape-456",
        type: "ellipse",
        x: 50,
        y: 75,
        rotation: 0,
        props: {},
        createdBy: "user-xyz",
      });
    });

    it("preserves all shape properties", () => {
      const complexShape: TldrawShape = {
        id: "shape-789",
        type: "arrow",
        x: 10,
        y: 20,
        rotation: 90,
        props: {
          start: { x: 0, y: 0 },
          end: { x: 100, y: 100 },
          color: "red",
          thickness: 3,
        },
      };
      
      const result = serializeShape(complexShape, "user-123");
      
      expect(result.props).toEqual(complexShape.props);
    });
  });

  describe("deserializeShape", () => {
    it("deserializes Firestore shape to tldraw format", () => {
      const result = deserializeShape(mockFirestoreShape);
      
      expect(result).toEqual({
        id: "shape-123",
        type: "rectangle",
        x: 100,
        y: 200,
        rotation: 45,
        props: {
          w: 150,
          h: 100,
          fill: "#4DABF7",
        },
      });
    });

    it("handles missing optional properties", () => {
      const minimalFirestoreShape: Shape = {
        id: "shape-456",
        type: "ellipse",
        x: 50,
        y: 75,
        createdBy: "user-xyz",
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      };
      
      const result = deserializeShape(minimalFirestoreShape);
      
      expect(result).toEqual({
        id: "shape-456",
        type: "ellipse",
        x: 50,
        y: 75,
        rotation: 0,
        props: {},
      });
    });

    it("preserves shape identity through round-trip", () => {
      const serialized = serializeShape(mockTldrawShape, "user-abc");
      const fullShape: Shape = {
        ...serialized,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      };
      const deserialized = deserializeShape(fullShape);
      
      expect(deserialized.id).toBe(mockTldrawShape.id);
      expect(deserialized.type).toBe(mockTldrawShape.type);
      expect(deserialized.x).toBe(mockTldrawShape.x);
      expect(deserialized.y).toBe(mockTldrawShape.y);
      expect(deserialized.rotation).toBe(mockTldrawShape.rotation);
      expect(deserialized.props).toEqual(mockTldrawShape.props);
    });
  });

  describe("isValidShape", () => {
    it("returns true for valid shape", () => {
      const validShape = {
        id: "shape-123",
        type: "rectangle",
        x: 100,
        y: 200,
      };
      
      expect(isValidShape(validShape)).toBe(true);
    });

    it("returns false for shape missing id", () => {
      const invalidShape = {
        type: "rectangle",
        x: 100,
        y: 200,
      };
      
      expect(isValidShape(invalidShape)).toBe(false);
    });

    it("returns false for shape missing type", () => {
      const invalidShape = {
        id: "shape-123",
        x: 100,
        y: 200,
      };
      
      expect(isValidShape(invalidShape)).toBe(false);
    });

    it("returns false for shape missing x coordinate", () => {
      const invalidShape = {
        id: "shape-123",
        type: "rectangle",
        y: 200,
      };
      
      expect(isValidShape(invalidShape)).toBe(false);
    });

    it("returns false for shape missing y coordinate", () => {
      const invalidShape = {
        id: "shape-123",
        type: "rectangle",
        x: 100,
      };
      
      expect(isValidShape(invalidShape)).toBe(false);
    });

    it("returns false for shape with invalid coordinate types", () => {
      const invalidShape = {
        id: "shape-123",
        type: "rectangle",
        x: "100" as unknown as number,
        y: 200,
      };
      
      expect(isValidShape(invalidShape)).toBe(false);
    });
  });

  describe("getEditorShapes", () => {
    it("extracts shapes from editor", () => {
      const mockEditor = {
        getCurrentPageShapes: () => [
          { id: "shape-1", type: "rectangle", x: 10, y: 20, rotation: 0, props: {} },
          { id: "shape-2", type: "ellipse", x: 30, y: 40, rotation: 45, props: {} },
        ],
      } as unknown as Editor;
      
      const result = getEditorShapes(mockEditor);
      
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        id: "shape-1",
        type: "rectangle",
        x: 10,
        y: 20,
        rotation: 0,
        props: {},
      });
    });

    it("returns empty array when no shapes exist", () => {
      const mockEditor = {
        getCurrentPageShapes: () => [],
      } as unknown as Editor;
      
      const result = getEditorShapes(mockEditor);
      
      expect(result).toEqual([]);
    });
  });
});

describe("tldrawHelpers - Throttle and Debounce", () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  describe("throttle", () => {
    it("executes immediately on first call", () => {
      const mockFn = jest.fn();
      const throttled = throttle(mockFn, 100);
      
      throttled();
      
      expect(mockFn).toHaveBeenCalledTimes(1);
    });

    it("limits execution to once per interval", () => {
      const mockFn = jest.fn();
      const throttled = throttle(mockFn, 100);
      
      throttled();
      throttled();
      throttled();
      
      expect(mockFn).toHaveBeenCalledTimes(1);
    });

    it("allows execution after interval passes", () => {
      const mockFn = jest.fn();
      const throttled = throttle(mockFn, 100);
      
      throttled();
      expect(mockFn).toHaveBeenCalledTimes(1);
      
      jest.advanceTimersByTime(100);
      
      throttled();
      expect(mockFn).toHaveBeenCalledTimes(2);
    });

    it("respects 33ms limit for cursor updates (30Hz)", () => {
      const mockFn = jest.fn();
      const throttled = throttle(mockFn, 33);
      
      // Simulate 60 rapid calls (like 60Hz mouse events)
      for (let i = 0; i < 60; i++) {
        throttled();
        jest.advanceTimersByTime(16); // ~16ms per frame at 60fps
      }
      
      // With 16ms between calls and 33ms throttle, we get calls at:
      // 0ms, 48ms, 96ms, 144ms... ≈ every 48ms = 20 calls in 960ms
      expect(mockFn).toHaveBeenCalledTimes(20);
      
      // Verify throttling works - should get ~30Hz when called at 33ms intervals
      const mockFn2 = jest.fn();
      const throttled2 = throttle(mockFn2, 33);
      
      for (let i = 0; i < 30; i++) {
        throttled2();
        jest.advanceTimersByTime(33);
      }
      
      // Each call waits 33ms, so all should execute
      expect(mockFn2).toHaveBeenCalledTimes(30);
    });

    it("passes arguments correctly", () => {
      const mockFn = jest.fn();
      const throttled = throttle(mockFn, 100);
      
      throttled("arg1", 42);
      
      expect(mockFn).toHaveBeenCalledWith("arg1", 42);
    });
  });

  describe("debounce", () => {
    it("delays execution until calls stop", () => {
      const mockFn = jest.fn();
      const debounced = debounce(mockFn, 300);
      
      debounced();
      expect(mockFn).not.toHaveBeenCalled();
      
      jest.advanceTimersByTime(300);
      expect(mockFn).toHaveBeenCalledTimes(1);
    });

    it("resets timer on subsequent calls", () => {
      const mockFn = jest.fn();
      const debounced = debounce(mockFn, 300);
      
      debounced();
      jest.advanceTimersByTime(200);
      
      debounced();
      jest.advanceTimersByTime(200);
      
      // Still shouldn't execute because we called it again before 300ms
      expect(mockFn).not.toHaveBeenCalled();
      
      jest.advanceTimersByTime(100);
      expect(mockFn).toHaveBeenCalledTimes(1);
    });

    it("executes only once after multiple rapid calls", () => {
      const mockFn = jest.fn();
      const debounced = debounce(mockFn, 300);
      
      debounced();
      debounced();
      debounced();
      debounced();
      
      jest.advanceTimersByTime(300);
      
      expect(mockFn).toHaveBeenCalledTimes(1);
    });

    it("captures the final call's arguments", () => {
      const mockFn = jest.fn();
      const debounced = debounce(mockFn, 300);
      
      debounced("first");
      debounced("second");
      debounced("final");
      
      jest.advanceTimersByTime(300);
      
      expect(mockFn).toHaveBeenCalledWith("final");
      expect(mockFn).toHaveBeenCalledTimes(1);
    });

    it("respects 300ms delay for shape updates", () => {
      const mockFn = jest.fn();
      const debounced = debounce(mockFn, 300);
      
      // Simulate rapid shape movements
      for (let i = 0; i < 10; i++) {
        debounced({ x: i * 10, y: i * 10 });
        jest.advanceTimersByTime(50);
      }
      
      // Should not execute yet
      expect(mockFn).not.toHaveBeenCalled();
      
      // Wait for debounce to complete
      jest.advanceTimersByTime(300);
      
      // Should execute once with final state
      expect(mockFn).toHaveBeenCalledTimes(1);
      expect(mockFn).toHaveBeenCalledWith({ x: 90, y: 90 });
    });
  });
});

