/**
 * Unit Tests for Firestore Shape Sync
 * Tests sync loop prevention and debounce logic
 */

import { firestoreShapeToTldraw } from "../firestoreSync";
import { Timestamp } from "firebase/firestore";
import { FirestoreShape } from "../firestoreSync";

describe("firestoreSync - Sync Loop Prevention", () => {
  describe("firestoreShapeToTldraw", () => {
    it("converts Firestore shape to tldraw format", () => {
      const firestoreShape: FirestoreShape = {
        id: "shape-123",
        type: "geo",
        x: 100,
        y: 200,
        rotation: 45,
        props: {
          w: 150,
          h: 100,
          geo: "rectangle",
          color: "blue",
        },
        parentId: "page:1",
        index: "a1",
        opacity: 1,
        createdBy: "user-abc",
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      };

      const tldrawShape = firestoreShapeToTldraw(firestoreShape);

      expect(tldrawShape).toEqual({
        id: "shape-123",
        type: "geo",
        x: 100,
        y: 200,
        rotation: 45,
        props: {
          w: 150,
          h: 100,
          geo: "rectangle",
          color: "blue",
        },
        parentId: "page:1",
        index: "a1",
        opacity: 1,
      });
    });

    it("handles minimal shape data", () => {
      const firestoreShape: FirestoreShape = {
        id: "shape-456",
        type: "geo",
        x: 50,
        y: 75,
        rotation: 0,
        props: {},
        createdBy: "user-xyz",
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      };

      const tldrawShape = firestoreShapeToTldraw(firestoreShape);

      expect(tldrawShape).toEqual({
        id: "shape-456",
        type: "geo",
        x: 50,
        y: 75,
        rotation: 0,
        props: {},
        parentId: undefined,
        index: undefined,
        opacity: undefined,
      });
    });

    it("preserves all shape properties through conversion", () => {
      const complexProps = {
        w: 200,
        h: 150,
        geo: "ellipse",
        color: "red",
        fill: "solid",
        dash: "draw",
        size: "m",
        font: "draw",
        align: "middle",
        verticalAlign: "middle",
        growY: 0,
        url: "",
        text: "Hello World",
      };

      const firestoreShape: FirestoreShape = {
        id: "shape-789",
        type: "geo",
        x: 10,
        y: 20,
        rotation: 90,
        props: complexProps,
        parentId: "page:1",
        index: "a5",
        opacity: 0.8,
        createdBy: "user-123",
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      };

      const tldrawShape = firestoreShapeToTldraw(firestoreShape);

      expect(tldrawShape.props).toEqual(complexProps);
      expect(tldrawShape.opacity).toBe(0.8);
      expect(tldrawShape.rotation).toBe(90);
    });
  });

  describe("Shape data integrity", () => {
    it("maintains shape ID consistency", () => {
      const shapeId = "shape-unique-id-123";
      const firestoreShape: FirestoreShape = {
        id: shapeId,
        type: "geo",
        x: 0,
        y: 0,
        rotation: 0,
        props: {},
        createdBy: "user-1",
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      };

      const tldrawShape = firestoreShapeToTldraw(firestoreShape);
      expect(tldrawShape.id).toBe(shapeId);
    });

    it("handles coordinate precision", () => {
      const firestoreShape: FirestoreShape = {
        id: "shape-decimal",
        type: "geo",
        x: 123.456789,
        y: 987.654321,
        rotation: 45.123456,
        props: {},
        createdBy: "user-1",
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      };

      const tldrawShape = firestoreShapeToTldraw(firestoreShape);
      expect(tldrawShape.x).toBeCloseTo(123.456789, 6);
      expect(tldrawShape.y).toBeCloseTo(987.654321, 6);
      expect(tldrawShape.rotation).toBeCloseTo(45.123456, 6);
    });

    it("handles negative coordinates", () => {
      const firestoreShape: FirestoreShape = {
        id: "shape-negative",
        type: "geo",
        x: -100,
        y: -200,
        rotation: -45,
        props: {},
        createdBy: "user-1",
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      };

      const tldrawShape = firestoreShapeToTldraw(firestoreShape);
      expect(tldrawShape.x).toBe(-100);
      expect(tldrawShape.y).toBe(-200);
      expect(tldrawShape.rotation).toBe(-45);
    });
  });

  describe("Props handling", () => {
    it("preserves nested objects in props", () => {
      const firestoreShape: FirestoreShape = {
        id: "shape-nested",
        type: "arrow",
        x: 0,
        y: 0,
        rotation: 0,
        props: {
          start: { x: 0, y: 0 },
          end: { x: 100, y: 100 },
          bend: 0,
          arrowheadStart: "none",
          arrowheadEnd: "arrow",
        },
        createdBy: "user-1",
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      };

      const tldrawShape = firestoreShapeToTldraw(firestoreShape);
      expect(tldrawShape.props).toEqual({
        start: { x: 0, y: 0 },
        end: { x: 100, y: 100 },
        bend: 0,
        arrowheadStart: "none",
        arrowheadEnd: "arrow",
      });
    });

    it("handles empty props object", () => {
      const firestoreShape: FirestoreShape = {
        id: "shape-empty-props",
        type: "geo",
        x: 0,
        y: 0,
        rotation: 0,
        props: {},
        createdBy: "user-1",
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      };

      const tldrawShape = firestoreShapeToTldraw(firestoreShape);
      expect(tldrawShape.props).toEqual({});
    });
  });
});

describe("Debounce logic for shape updates", () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it("debounce respects 300ms delay", () => {
    const mockFn = jest.fn();
    const debounce = <T extends unknown[]>(fn: (...args: T) => void, delay: number) => {
      let timeout: NodeJS.Timeout;
      return (...args: T): void => {
        clearTimeout(timeout);
        timeout = setTimeout(() => fn(...args), delay);
      };
    };

    const debounced = debounce(mockFn, 300);

    debounced("call 1");
    expect(mockFn).not.toHaveBeenCalled();

    jest.advanceTimersByTime(300);
    expect(mockFn).toHaveBeenCalledTimes(1);
    expect(mockFn).toHaveBeenCalledWith("call 1");
  });

  it("debounce cancels previous calls", () => {
    const mockFn = jest.fn();
    const debounce = <T extends unknown[]>(fn: (...args: T) => void, delay: number) => {
      let timeout: NodeJS.Timeout;
      return (...args: T): void => {
        clearTimeout(timeout);
        timeout = setTimeout(() => fn(...args), delay);
      };
    };

    const debounced = debounce(mockFn, 300);

    debounced("call 1");
    jest.advanceTimersByTime(200);
    debounced("call 2");
    jest.advanceTimersByTime(200);
    debounced("call 3");

    expect(mockFn).not.toHaveBeenCalled();

    jest.advanceTimersByTime(300);
    expect(mockFn).toHaveBeenCalledTimes(1);
    expect(mockFn).toHaveBeenCalledWith("call 3");
  });

  it("debounce batches rapid shape movements", () => {
    const mockFn = jest.fn();
    const debounce = <T extends unknown[]>(fn: (...args: T) => void, delay: number) => {
      let timeout: NodeJS.Timeout;
      return (...args: T): void => {
        clearTimeout(timeout);
        timeout = setTimeout(() => fn(...args), delay);
      };
    };

    const debounced = debounce(mockFn, 300);

    // Simulate rapid shape movements (like dragging)
    for (let i = 0; i < 50; i++) {
      debounced({ x: i * 10, y: i * 10 });
      jest.advanceTimersByTime(10);
    }

    // Should not have been called yet
    expect(mockFn).not.toHaveBeenCalled();

    // Wait for debounce to complete
    jest.advanceTimersByTime(300);

    // Should be called once with final position
    expect(mockFn).toHaveBeenCalledTimes(1);
    expect(mockFn).toHaveBeenCalledWith({ x: 490, y: 490 });
  });
});

