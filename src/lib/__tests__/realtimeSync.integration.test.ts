/**
 * Integration Tests for Realtime Database Sync
 * Tests real-time cursor synchronization - CRITICAL for preventing sync bugs
 */

import {
  ref,
  get,
  remove,
  update,
  onValue,
} from "firebase/database";
import { realtimeDb } from "../firebase";
import {
  updateCursorPosition,
  updateUserPresence,
  markUserOffline,
  listenToUsers,
  listenToUserCursor,
  getOnlineUsers,
  setupPresenceHeartbeat,
} from "../realtimeSync";
import { UserPresence, Cursor } from "../../types";

// Test user data
const testUser1 = {
  userId: "test-user-1",
  name: "Alice",
  color: "#FF6B6B",
};

const testUser2 = {
  userId: "test-user-2",
  name: "Bob",
  color: "#4DABF7",
};

/**
 * Clean up test data from Realtime Database
 */
async function cleanupTestData() {
  const promises = [
    remove(ref(realtimeDb, `users/${testUser1.userId}`)),
    remove(ref(realtimeDb, `users/${testUser2.userId}`)),
  ];
  
  await Promise.all(promises);
}

describe("realtimeSync - Integration Tests", () => {
  // Clean up before and after all tests
  beforeAll(async () => {
    await cleanupTestData();
  });

  afterAll(async () => {
    await cleanupTestData();
  });

  // Clean up between tests
  afterEach(async () => {
    await cleanupTestData();
  });

  describe("updateCursorPosition", () => {
    it("writes cursor position to Realtime DB", async () => {
      const cursor = { x: 100, y: 200 };

      await updateCursorPosition(testUser1.userId, cursor);

      // Read back from database
      const cursorRef = ref(realtimeDb, `users/${testUser1.userId}/cursor`);
      const snapshot = await get(cursorRef);
      const data = snapshot.val();

      expect(data).toBeTruthy();
      expect(data.x).toBe(100);
      expect(data.y).toBe(200);
      expect(data.lastSeen).toBeTruthy();
    });

    it("updates cursor position when called multiple times", async () => {
      await updateCursorPosition(testUser1.userId, { x: 100, y: 200 });
      await updateCursorPosition(testUser1.userId, { x: 300, y: 400 });

      const cursorRef = ref(realtimeDb, `users/${testUser1.userId}/cursor`);
      const snapshot = await get(cursorRef);
      const data = snapshot.val();

      expect(data.x).toBe(300);
      expect(data.y).toBe(400);
    });

    it("handles negative coordinates", async () => {
      await updateCursorPosition(testUser1.userId, { x: -50, y: -100 });

      const cursorRef = ref(realtimeDb, `users/${testUser1.userId}/cursor`);
      const snapshot = await get(cursorRef);
      const data = snapshot.val();

      expect(data.x).toBe(-50);
      expect(data.y).toBe(-100);
    });

    it("handles decimal coordinates", async () => {
      await updateCursorPosition(testUser1.userId, { x: 123.456, y: 789.012 });

      const cursorRef = ref(realtimeDb, `users/${testUser1.userId}/cursor`);
      const snapshot = await get(cursorRef);
      const data = snapshot.val();

      expect(data.x).toBeCloseTo(123.456, 3);
      expect(data.y).toBeCloseTo(789.012, 3);
    });
  });

  describe("updateUserPresence", () => {
    it("writes user presence to Realtime DB", async () => {
      await updateUserPresence(
        testUser1.userId,
        testUser1.name,
        testUser1.color
      );

      const userRef = ref(realtimeDb, `users/${testUser1.userId}`);
      const snapshot = await get(userRef);
      const data = snapshot.val();

      expect(data).toBeTruthy();
      expect(data.name).toBe(testUser1.name);
      expect(data.color).toBe(testUser1.color);
      expect(data.online).toBe(true);
      expect(data.lastSeen).toBeTruthy();
    });

    it("marks user as online", async () => {
      await updateUserPresence(
        testUser1.userId,
        testUser1.name,
        testUser1.color
      );

      const userRef = ref(realtimeDb, `users/${testUser1.userId}`);
      const snapshot = await get(userRef);
      const data = snapshot.val();

      expect(data.online).toBe(true);
    });
  });

  describe("markUserOffline", () => {
    it("marks user as offline", async () => {
      // First set user online
      await updateUserPresence(
        testUser1.userId,
        testUser1.name,
        testUser1.color
      );

      // Then mark offline
      await markUserOffline(testUser1.userId);

      const userRef = ref(realtimeDb, `users/${testUser1.userId}`);
      const snapshot = await get(userRef);
      const data = snapshot.val();

      expect(data.online).toBe(false);
    });

    it("removes cursor on disconnect", async () => {
      // Set user online with cursor
      await updateUserPresence(
        testUser1.userId,
        testUser1.name,
        testUser1.color
      );
      await updateCursorPosition(testUser1.userId, { x: 100, y: 200 });

      // Mark offline
      await markUserOffline(testUser1.userId);

      // Check cursor is removed
      const cursorRef = ref(realtimeDb, `users/${testUser1.userId}/cursor`);
      const snapshot = await get(cursorRef);
      const data = snapshot.val();

      expect(data).toBeNull();
    });
  });

  describe("listenToUsers", () => {
    it("listens to real-time user updates", (done) => {
      let callCount = 0;

      const unsubscribe = listenToUsers((users) => {
        callCount++;

        if (callCount === 1) {
          // First call - no users
          expect(Object.keys(users).length).toBe(0);
          
          // Add a user
          updateUserPresence(
            testUser1.userId,
            testUser1.name,
            testUser1.color
          );
        } else if (callCount === 2) {
          // Second call - user appeared
          expect(Object.keys(users).length).toBe(1);
          expect(users[testUser1.userId]).toBeTruthy();
          expect(users[testUser1.userId].name).toBe(testUser1.name);
          expect(users[testUser1.userId].color).toBe(testUser1.color);
          expect(users[testUser1.userId].online).toBe(true);
          
          unsubscribe();
          done();
        }
      });
    }, 10000);

    it("filters out offline users", (done) => {
      let callCount = 0;

      const unsubscribe = listenToUsers((users) => {
        callCount++;

        if (callCount === 1) {
          // Add user online
          updateUserPresence(
            testUser1.userId,
            testUser1.name,
            testUser1.color
          );
        } else if (callCount === 2) {
          // User should be online
          expect(users[testUser1.userId]?.online).toBe(true);
          
          // Mark user offline
          markUserOffline(testUser1.userId);
        } else if (callCount === 3) {
          // User should be filtered out (offline)
          expect(users[testUser1.userId]).toBeUndefined();
          
          unsubscribe();
          done();
        }
      });
    }, 10000);

    it("handles concurrent updates from multiple users", (done) => {
      let callCount = 0;

      const unsubscribe = listenToUsers((users) => {
        callCount++;

        if (callCount === 1) {
          // Add two users simultaneously
          Promise.all([
            updateUserPresence(
              testUser1.userId,
              testUser1.name,
              testUser1.color
            ),
            updateUserPresence(
              testUser2.userId,
              testUser2.name,
              testUser2.color
            ),
          ]);
        } else if (callCount >= 2) {
          const userCount = Object.keys(users).length;
          
          // Eventually both users should appear
          if (userCount === 2) {
            expect(users[testUser1.userId]).toBeTruthy();
            expect(users[testUser2.userId]).toBeTruthy();
            
            unsubscribe();
            done();
          }
        }
      });
    }, 10000);
  });

  describe("listenToUserCursor", () => {
    it("listens to cursor position changes", (done) => {
      let callCount = 0;

      const unsubscribe = listenToUserCursor(testUser1.userId, (cursor) => {
        callCount++;

        if (callCount === 1) {
          // First call - no cursor
          expect(cursor).toBeNull();
          
          // Add cursor
          updateCursorPosition(testUser1.userId, { x: 100, y: 200 });
        } else if (callCount === 2) {
          // Second call - cursor appeared
          expect(cursor).toBeTruthy();
          expect(cursor!.x).toBe(100);
          expect(cursor!.y).toBe(200);
          
          unsubscribe();
          done();
        }
      });
    }, 10000);

    it("receives cursor updates in real-time", (done) => {
      let callCount = 0;

      const unsubscribe = listenToUserCursor(testUser1.userId, (cursor) => {
        callCount++;

        if (callCount === 1) {
          // Initial state
          updateCursorPosition(testUser1.userId, { x: 100, y: 200 });
        } else if (callCount === 2) {
          expect(cursor!.x).toBe(100);
          expect(cursor!.y).toBe(200);
          
          // Update cursor
          updateCursorPosition(testUser1.userId, { x: 300, y: 400 });
        } else if (callCount === 3) {
          // Verify update
          expect(cursor!.x).toBe(300);
          expect(cursor!.y).toBe(400);
          
          unsubscribe();
          done();
        }
      });
    }, 10000);
  });

  describe("getOnlineUsers", () => {
    it("returns empty object when no users online", async () => {
      const users = await getOnlineUsers();
      expect(users).toEqual({});
    });

    it("returns online users", async () => {
      await updateUserPresence(
        testUser1.userId,
        testUser1.name,
        testUser1.color
      );

      const users = await getOnlineUsers();
      
      expect(Object.keys(users).length).toBe(1);
      expect(users[testUser1.userId]).toBeTruthy();
      expect(users[testUser1.userId].name).toBe(testUser1.name);
      expect(users[testUser1.userId].online).toBe(true);
    });

    it("filters out offline users", async () => {
      await updateUserPresence(
        testUser1.userId,
        testUser1.name,
        testUser1.color
      );
      await markUserOffline(testUser1.userId);

      const users = await getOnlineUsers();
      
      expect(users[testUser1.userId]).toBeUndefined();
    });

    it("returns multiple online users", async () => {
      await Promise.all([
        updateUserPresence(
          testUser1.userId,
          testUser1.name,
          testUser1.color
        ),
        updateUserPresence(
          testUser2.userId,
          testUser2.name,
          testUser2.color
        ),
      ]);

      const users = await getOnlineUsers();
      
      expect(Object.keys(users).length).toBe(2);
      expect(users[testUser1.userId]).toBeTruthy();
      expect(users[testUser2.userId]).toBeTruthy();
    });
  });

  describe("presence detection", () => {
    it("marks users online/offline correctly", async () => {
      // User comes online
      await updateUserPresence(
        testUser1.userId,
        testUser1.name,
        testUser1.color
      );

      let users = await getOnlineUsers();
      expect(users[testUser1.userId]?.online).toBe(true);

      // User goes offline
      await markUserOffline(testUser1.userId);

      users = await getOnlineUsers();
      expect(users[testUser1.userId]).toBeUndefined();
    });

    it("includes cursor data with presence", async () => {
      await updateUserPresence(
        testUser1.userId,
        testUser1.name,
        testUser1.color
      );
      await updateCursorPosition(testUser1.userId, { x: 50, y: 75 });

      const users = await getOnlineUsers();
      
      expect(users[testUser1.userId].cursor).toBeTruthy();
      expect(users[testUser1.userId].cursor!.x).toBe(50);
      expect(users[testUser1.userId].cursor!.y).toBe(75);
    });
  });

  describe("setupPresenceHeartbeat", () => {
    it("returns an interval ID", () => {
      const interval = setupPresenceHeartbeat(testUser1.userId);
      
      expect(interval).toBeTruthy();
      expect(typeof interval).toBe("object");
      
      clearInterval(interval);
    });

    it("can be cleared", () => {
      const interval = setupPresenceHeartbeat(testUser1.userId);
      
      expect(() => clearInterval(interval)).not.toThrow();
    });
  });
});

