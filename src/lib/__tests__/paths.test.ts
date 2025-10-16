/**
 * Tests for path utilities
 */

import {
  isValidRoomId,
  generateRoomId,
  getRoomsPath,
  getRoomPath,
  getHomePath,
  extractRoomIdFromPath,
  normalizeRoomName,
} from "../paths";

describe("paths utilities", () => {
  describe("isValidRoomId", () => {
    it("should accept valid room IDs", () => {
      expect(isValidRoomId("abc123")).toBe(true);
      expect(isValidRoomId("room-123")).toBe(true);
      expect(isValidRoomId("room_123")).toBe(true);
      expect(isValidRoomId("ABC-123_xyz")).toBe(true);
    });

    it("should reject invalid room IDs", () => {
      expect(isValidRoomId("")).toBe(false);
      expect(isValidRoomId("room/123")).toBe(false);
      expect(isValidRoomId("room 123")).toBe(false);
      expect(isValidRoomId("room@123")).toBe(false);
      expect(isValidRoomId("a".repeat(65))).toBe(false); // too long
    });
  });

  describe("generateRoomId", () => {
    it("should generate valid room IDs", () => {
      const roomId = generateRoomId();
      expect(isValidRoomId(roomId)).toBe(true);
    });

    it("should generate unique room IDs", () => {
      const id1 = generateRoomId();
      const id2 = generateRoomId();
      expect(id1).not.toBe(id2);
    });

    it("should generate IDs with timestamp and random components", () => {
      const roomId = generateRoomId();
      expect(roomId).toMatch(/^[a-z0-9]+-[a-z0-9]+$/);
    });
  });

  describe("getRoomsPath", () => {
    it("should return /rooms path", () => {
      expect(getRoomsPath()).toBe("/rooms");
    });
  });

  describe("getRoomPath", () => {
    it("should return correct room path", () => {
      expect(getRoomPath("abc123")).toBe("/room/abc123");
      expect(getRoomPath("my-room")).toBe("/room/my-room");
    });

    it("should throw error for invalid room ID", () => {
      expect(() => getRoomPath("invalid room")).toThrow("Invalid room ID");
      expect(() => getRoomPath("room/123")).toThrow("Invalid room ID");
    });
  });

  describe("getHomePath", () => {
    it("should return / path", () => {
      expect(getHomePath()).toBe("/");
    });
  });

  describe("extractRoomIdFromPath", () => {
    it("should extract room ID from valid paths", () => {
      expect(extractRoomIdFromPath("/room/abc123")).toBe("abc123");
      expect(extractRoomIdFromPath("/room/my-room")).toBe("my-room");
      expect(extractRoomIdFromPath("/room/room_123/extra")).toBe("room_123");
    });

    it("should return null for invalid paths", () => {
      expect(extractRoomIdFromPath("/rooms")).toBeNull();
      expect(extractRoomIdFromPath("/")).toBeNull();
      expect(extractRoomIdFromPath("/room/")).toBeNull();
      expect(extractRoomIdFromPath("/other/abc123")).toBeNull();
    });
  });

  describe("normalizeRoomName", () => {
    it("should normalize room names", () => {
      expect(normalizeRoomName("My Room")).toBe("my-room");
      expect(normalizeRoomName("  Room Name  ")).toBe("room-name");
      expect(normalizeRoomName("Room@Name!")).toBe("roomname");
      expect(normalizeRoomName("Room_Name-123")).toBe("room_name-123");
    });

    it("should handle edge cases", () => {
      expect(normalizeRoomName("")).toBe("");
      expect(normalizeRoomName("   ")).toBe("");
      expect(normalizeRoomName("a".repeat(100))).toBe("a".repeat(64));
    });

    it("should remove invalid characters", () => {
      expect(normalizeRoomName("Room@#$%Name")).toBe("roomname");
      expect(normalizeRoomName("Room & Co.")).toBe("room--co");
    });
  });
});

