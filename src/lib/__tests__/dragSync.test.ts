/**
 * Drag Sync Tests
 * Tests for real-time drag position synchronization
 */

// Mock Firebase before any imports
jest.mock("../firebase", () => ({
  realtimeDb: {},
  db: {},
  auth: {},
  storage: {},
}));

import { ref, update, remove, onValue, get } from "firebase/database";
import {
  updateDragPosition,
  clearDragPosition,
  listenToDragUpdates,
  cleanupStaleDragStates,
} from "../realtimeSync";

// Mock Firebase Realtime Database
jest.mock("firebase/database", () => ({
  ref: jest.fn(),
  update: jest.fn(),
  remove: jest.fn(),
  onValue: jest.fn(),
  get: jest.fn(),
  serverTimestamp: jest.fn(() => Date.now()),
}));

describe("Real-Time Drag Sync", () => {
  const mockRoomId = "test-room";
  const mockShapeId = "shape-123";
  const mockUserId = "user-456";
  const mockPosition = { x: 100, y: 200 };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("updateDragPosition", () => {
    it("should write drag position to correct Realtime DB path", async () => {
      const mockRef = {};
      (ref as jest.Mock).mockReturnValue(mockRef);
      (update as jest.Mock).mockResolvedValue(undefined);

      await updateDragPosition(mockRoomId, mockShapeId, mockPosition, mockUserId);

      expect(ref).toHaveBeenCalledWith(
        expect.anything(),
        `rooms/${mockRoomId}/dragging/${mockShapeId}`
      );

      expect(update).toHaveBeenCalledWith(mockRef, {
        x: mockPosition.x,
        y: mockPosition.y,
        userId: mockUserId,
        lastUpdate: expect.any(Number),
      });
    });

    it("should handle permission denied errors silently", async () => {
      const mockRef = {};
      (ref as jest.Mock).mockReturnValue(mockRef);
      const permissionError = new Error("PERMISSION_DENIED");
      (update as jest.Mock).mockRejectedValue(permissionError);

      // Should not throw
      await expect(
        updateDragPosition(mockRoomId, mockShapeId, mockPosition, mockUserId)
      ).resolves.not.toThrow();
    });

    it("should skip update if roomId, shapeId, or userId is missing", async () => {
      await updateDragPosition("", mockShapeId, mockPosition, mockUserId);
      await updateDragPosition(mockRoomId, "", mockPosition, mockUserId);
      await updateDragPosition(mockRoomId, mockShapeId, mockPosition, "");

      expect(update).not.toHaveBeenCalled();
    });
  });

  describe("clearDragPosition", () => {
    it("should remove drag state from Realtime DB", async () => {
      const mockRef = {};
      (ref as jest.Mock).mockReturnValue(mockRef);
      (remove as jest.Mock).mockResolvedValue(undefined);

      await clearDragPosition(mockRoomId, mockShapeId);

      expect(ref).toHaveBeenCalledWith(
        expect.anything(),
        `rooms/${mockRoomId}/dragging/${mockShapeId}`
      );
      expect(remove).toHaveBeenCalledWith(mockRef);
    });

    it("should handle permission denied errors silently", async () => {
      const mockRef = {};
      (ref as jest.Mock).mockReturnValue(mockRef);
      const permissionError = new Error("PERMISSION_DENIED");
      (remove as jest.Mock).mockRejectedValue(permissionError);

      // Should not throw
      await expect(clearDragPosition(mockRoomId, mockShapeId)).resolves.not.toThrow();
    });

    it("should skip clear if roomId or shapeId is missing", async () => {
      await clearDragPosition("", mockShapeId);
      await clearDragPosition(mockRoomId, "");

      expect(remove).not.toHaveBeenCalled();
    });
  });

  describe("listenToDragUpdates", () => {
    it("should listen to correct Realtime DB path and parse updates", () => {
      const mockRef = {};
      (ref as jest.Mock).mockReturnValue(mockRef);

      const mockCallback = jest.fn();
      const mockUnsubscribe = jest.fn();
      (onValue as jest.Mock).mockReturnValue(mockUnsubscribe);

      const unsubscribe = listenToDragUpdates(mockRoomId, mockCallback);

      expect(ref).toHaveBeenCalledWith(
        expect.anything(),
        `rooms/${mockRoomId}/dragging`
      );

      expect(onValue).toHaveBeenCalledWith(
        mockRef,
        expect.any(Function),
        expect.any(Function)
      );

      expect(unsubscribe).toBe(mockUnsubscribe);
    });

    it("should parse snapshot data and call callback with updates", () => {
      const mockRef = {};
      (ref as jest.Mock).mockReturnValue(mockRef);

      const mockCallback = jest.fn();
      let snapshotHandler: (snapshot: any) => void;

      (onValue as jest.Mock).mockImplementation((_ref, handler) => {
        snapshotHandler = handler;
        return jest.fn();
      });

      listenToDragUpdates(mockRoomId, mockCallback);

      // Simulate snapshot with drag data
      const mockSnapshot = {
        exists: () => true,
        forEach: (callback: (child: any) => void) => {
          callback({
            key: "shape-1",
            val: () => ({ x: 10, y: 20, userId: "user-1", lastUpdate: Date.now() }),
          });
          callback({
            key: "shape-2",
            val: () => ({ x: 30, y: 40, userId: "user-2", lastUpdate: Date.now() }),
          });
        },
      };

      snapshotHandler!(mockSnapshot);

      expect(mockCallback).toHaveBeenCalledWith([
        {
          shapeId: "shape-1",
          x: 10,
          y: 20,
          userId: "user-1",
          lastUpdate: expect.any(Number),
        },
        {
          shapeId: "shape-2",
          x: 30,
          y: 40,
          userId: "user-2",
          lastUpdate: expect.any(Number),
        },
      ]);
    });

    it("should return empty array if snapshot doesn't exist", () => {
      const mockRef = {};
      (ref as jest.Mock).mockReturnValue(mockRef);

      const mockCallback = jest.fn();
      let snapshotHandler: (snapshot: any) => void;

      (onValue as jest.Mock).mockImplementation((_ref, handler) => {
        snapshotHandler = handler;
        return jest.fn();
      });

      listenToDragUpdates(mockRoomId, mockCallback);

      const mockSnapshot = {
        exists: () => false,
      };

      snapshotHandler!(mockSnapshot);

      expect(mockCallback).toHaveBeenCalledWith([]);
    });

    it("should return noop if roomId is missing", () => {
      const mockCallback = jest.fn();
      const unsubscribe = listenToDragUpdates("", mockCallback);

      expect(typeof unsubscribe).toBe("function");
      expect(ref).not.toHaveBeenCalled();
    });
  });

  describe("cleanupStaleDragStates", () => {
    it("should remove drag states older than 5 seconds", async () => {
      const mockRef = {};
      (ref as jest.Mock).mockReturnValue(mockRef);

      const now = Date.now();
      const staleTimestamp = now - 6000; // 6 seconds ago (stale)
      const freshTimestamp = now - 2000; // 2 seconds ago (fresh)

      const mockSnapshot = {
        exists: () => true,
        forEach: (callback: (child: any) => void) => {
          callback({
            key: "stale-shape",
            val: () => ({ lastUpdate: staleTimestamp }),
          });
          callback({
            key: "fresh-shape",
            val: () => ({ lastUpdate: freshTimestamp }),
          });
        },
      };

      (get as jest.Mock).mockResolvedValue(mockSnapshot);
      (remove as jest.Mock).mockResolvedValue(undefined);

      await cleanupStaleDragStates(mockRoomId);

      // Should only remove stale shape
      expect(remove).toHaveBeenCalledTimes(1);
      expect(ref).toHaveBeenCalledWith(
        expect.anything(),
        `rooms/${mockRoomId}/dragging/stale-shape`
      );
    });

    it("should handle empty snapshot gracefully", async () => {
      const mockRef = {};
      (ref as jest.Mock).mockReturnValue(mockRef);

      const mockSnapshot = {
        exists: () => false,
      };

      (get as jest.Mock).mockResolvedValue(mockSnapshot);

      await cleanupStaleDragStates(mockRoomId);

      expect(remove).not.toHaveBeenCalled();
    });

    it("should handle permission denied errors silently", async () => {
      const mockRef = {};
      (ref as jest.Mock).mockReturnValue(mockRef);
      const permissionError = new Error("PERMISSION_DENIED");
      (get as jest.Mock).mockRejectedValue(permissionError);

      // Should not throw
      await expect(cleanupStaleDragStates(mockRoomId)).resolves.not.toThrow();
    });

    it("should skip cleanup if roomId is missing", async () => {
      await cleanupStaleDragStates("");

      expect(get).not.toHaveBeenCalled();
    });
  });
});

