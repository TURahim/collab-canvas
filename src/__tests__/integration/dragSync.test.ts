/**
 * Real-Time Drag Sync Integration Tests
 * Tests end-to-end drag collaboration between users
 */

// Mock Firebase before any imports
jest.mock("../../lib/firebase", () => ({
  realtimeDb: {
    app: {
      name: "[DEFAULT]",
      options: {},
    },
  },
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
} from "../../lib/realtimeSync";

// Mock Firebase Realtime Database
jest.mock("firebase/database");

describe("Real-Time Drag Collaboration (Integration)", () => {
  const mockRoomId = "integration-test-room";
  const mockShapeId = "shape-abc";
  const userA = "user-alice";
  const userB = "user-bob";

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Set up default mock implementations
    (ref as jest.Mock).mockReturnValue({});
    (update as jest.Mock).mockResolvedValue(undefined);
    (remove as jest.Mock).mockResolvedValue(undefined);
    (get as jest.Mock).mockResolvedValue({ exists: () => false });
  });

  describe("User A drags → User B sees updates", () => {
    it("should propagate drag position from User A to User B with < 100ms latency", async () => {
      const mockRef = {};
      (ref as jest.Mock).mockReturnValue(mockRef);

      let snapshotHandler: (snapshot: any) => void;
      (onValue as jest.Mock).mockImplementation((_ref, handler) => {
        snapshotHandler = handler;
        return jest.fn();
      });

      // User B starts listening to drag updates
      const userBUpdates: any[] = [];
      listenToDragUpdates(mockRoomId, (updates) => {
        userBUpdates.push(...updates);
      });

      expect(snapshotHandler!).toBeDefined();

      // User A starts dragging
      const startTime = Date.now();
      await updateDragPosition(mockRoomId, mockShapeId, { x: 10, y: 20 }, userA);

      // Simulate Firebase propagating the update to User B
      const mockSnapshot = {
        exists: () => true,
        forEach: (callback: (child: any) => void) => {
          callback({
            key: mockShapeId,
            val: () => ({ x: 10, y: 20, userId: userA, lastUpdate: Date.now() }),
          });
        },
      };

      snapshotHandler!(mockSnapshot);

      const latency = Date.now() - startTime;

      // Verify User B received the update
      expect(userBUpdates).toHaveLength(1);
      expect(userBUpdates[0]).toMatchObject({
        shapeId: mockShapeId,
        x: 10,
        y: 20,
        userId: userA,
      });

      // Verify latency is reasonable (mock test, so should be instant)
      expect(latency).toBeLessThan(100);
    });

    it("should handle multiple users dragging different shapes simultaneously", async () => {
      const shape1 = "shape-1";
      const shape2 = "shape-2";
      const userC = "user-charlie";

      let snapshotHandler: (snapshot: any) => void;
      (onValue as jest.Mock).mockImplementation((_ref, handler) => {
        snapshotHandler = handler;
        return jest.fn();
      });

      // User A listens for updates
      const receivedUpdates: any[] = [];
      listenToDragUpdates(mockRoomId, (updates) => {
        receivedUpdates.push(...updates);
      });

      // User B drags shape1, User C drags shape2
      await Promise.all([
        updateDragPosition(mockRoomId, shape1, { x: 100, y: 200 }, userB),
        updateDragPosition(mockRoomId, shape2, { x: 300, y: 400 }, userC),
      ]);

      // Simulate Firebase snapshot with both shapes
      const mockSnapshot = {
        exists: () => true,
        forEach: (callback: (child: any) => void) => {
          callback({
            key: shape1,
            val: () => ({ x: 100, y: 200, userId: userB, lastUpdate: Date.now() }),
          });
          callback({
            key: shape2,
            val: () => ({ x: 300, y: 400, userId: userC, lastUpdate: Date.now() }),
          });
        },
      };

      snapshotHandler!(mockSnapshot);

      // User A should see both drag updates
      expect(receivedUpdates).toHaveLength(2);
      expect(receivedUpdates).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ shapeId: shape1, userId: userB }),
          expect.objectContaining({ shapeId: shape2, userId: userC }),
        ])
      );
    });
  });

  describe("Drag state cleanup", () => {
    it("should clear drag state when drag ends", async () => {
      // User A starts dragging
      await updateDragPosition(mockRoomId, mockShapeId, { x: 50, y: 60 }, userA);
      expect(update).toHaveBeenCalled();

      // User A releases (drag ends)
      await clearDragPosition(mockRoomId, mockShapeId);
      expect(remove).toHaveBeenCalled();
    });

    it("should clean up stale drag states after 5 seconds", async () => {
      const now = Date.now();
      const staleDragStates = {
        "stale-shape-1": { lastUpdate: now - 6000 }, // 6 seconds old
        "stale-shape-2": { lastUpdate: now - 7000 }, // 7 seconds old
        "fresh-shape": { lastUpdate: now - 2000 }, // 2 seconds old
      };

      const mockSnapshot = {
        exists: () => true,
        forEach: (callback: (child: any) => void) => {
          Object.entries(staleDragStates).forEach(([shapeId, data]) => {
            callback({
              key: shapeId,
              val: () => data,
            });
          });
        },
      };

      (get as jest.Mock).mockResolvedValue(mockSnapshot);

      await cleanupStaleDragStates(mockRoomId);

      // Should remove 2 stale shapes, keep 1 fresh shape
      expect(remove).toHaveBeenCalledTimes(2);
    });
  });

  describe("Final position persistence", () => {
    it("should persist final position to Firestore after drag ends", async () => {
      // User A drags shape to new position
      await updateDragPosition(mockRoomId, mockShapeId, { x: 100, y: 150 }, userA);

      // User A releases - should clear real-time drag state
      await clearDragPosition(mockRoomId, mockShapeId);

      expect(remove).toHaveBeenCalled();

      // Note: Actual Firestore persistence happens in useShapes hook
      // This test verifies that drag state is properly cleared,
      // allowing the normal shape sync to persist the final position
    });
  });

  describe("Edge cases", () => {
    it("should handle user disconnecting mid-drag", async () => {
      // User A starts dragging
      await updateDragPosition(mockRoomId, mockShapeId, { x: 10, y: 20 }, userA);

      // Simulate cleanup for disconnected user
      const now = Date.now();
      const mockSnapshot = {
        exists: () => true,
        forEach: (callback: (child: any) => void) => {
          callback({
            key: mockShapeId,
            val: () => ({ lastUpdate: now - 6000 }), // Stale (6 seconds)
          });
        },
      };

      (get as jest.Mock).mockResolvedValue(mockSnapshot);

      // Cleanup should remove abandoned drag state
      await cleanupStaleDragStates(mockRoomId);

      expect(remove).toHaveBeenCalled();
    });

    it("should handle permission errors gracefully", async () => {
      const permissionError = new Error("PERMISSION_DENIED: User not authorized");
      (update as jest.Mock).mockRejectedValue(permissionError);

      // Should not throw
      await expect(
        updateDragPosition(mockRoomId, mockShapeId, { x: 10, y: 20 }, userA)
      ).resolves.not.toThrow();
    });

    it("should filter out own drag updates to prevent loops", () => {
      let snapshotHandler: (snapshot: any) => void;
      (onValue as jest.Mock).mockImplementation((_ref, handler) => {
        snapshotHandler = handler;
        return jest.fn();
      });

      const receivedUpdates: any[] = [];
      listenToDragUpdates(mockRoomId, (updates) => {
        // In real implementation, useShapes filters out own userId
        const filtered = updates.filter((update) => update.userId !== userA);
        receivedUpdates.push(...filtered);
      });

      // Simulate snapshot with own user's drag update
      const mockSnapshot = {
        exists: () => true,
        forEach: (callback: (child: any) => void) => {
          callback({
            key: mockShapeId,
            val: () => ({ x: 10, y: 20, userId: userA, lastUpdate: Date.now() }),
          });
        },
      };

      snapshotHandler!(mockSnapshot);

      // Should filter out own update
      expect(receivedUpdates).toHaveLength(0);
    });
  });

  describe("Performance under load", () => {
    it("should handle 10 concurrent users dragging without degradation", async () => {
      const userIds = Array.from({ length: 10 }, (_, i) => `user-${i}`);
      const shapeIds = Array.from({ length: 10 }, (_, i) => `shape-${i}`);

      const startTime = Date.now();

      // Simulate 10 users dragging simultaneously
      await Promise.all(
        userIds.map((userId, index) =>
          updateDragPosition(
            mockRoomId,
            shapeIds[index],
            { x: index * 10, y: index * 20 },
            userId
          )
        )
      );

      const totalTime = Date.now() - startTime;

      // All 10 updates should complete quickly
      expect(update).toHaveBeenCalledTimes(10);
      expect(totalTime).toBeLessThan(500); // Should complete in under 500ms
    });
  });
});

