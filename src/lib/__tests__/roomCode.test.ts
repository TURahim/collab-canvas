/**
 * Room Code Tests
 * Tests for 6-digit room code generation and validation
 */

// Mock Firebase before any imports
jest.mock("../firebase", () => ({
  db: {},
  realtimeDb: {},
  auth: {},
  storage: {},
}));

import { doc, getDoc, setDoc, getDocs, query, collection, where } from "firebase/firestore";
import {
  generateRoomCode,
  validateRoomCode,
  getRoomIdByCode,
  saveRoomCodeMapping,
  deleteRoomCodeMapping,
  getCodeByRoomId,
} from "../roomCode";

// Mock Firestore functions
jest.mock("firebase/firestore");

describe("Room Code Generation", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("generateRoomCode", () => {
    it("should generate a 6-digit numeric code", async () => {
      // Mock getDoc to return non-existent doc (no collision)
      (doc as jest.Mock).mockReturnValue({});
      (getDoc as jest.Mock).mockResolvedValue({ exists: () => false });

      const code = await generateRoomCode("teacher-123");

      expect(code).toMatch(/^\d{6}$/);
      expect(code.length).toBe(6);
      expect(parseInt(code, 10)).toBeGreaterThanOrEqual(100000);
      expect(parseInt(code, 10)).toBeLessThanOrEqual(999999);
    });

    it("should generate unique codes", async () => {
      (doc as jest.Mock).mockReturnValue({});
      (getDoc as jest.Mock).mockResolvedValue({ exists: () => false });

      const code1 = await generateRoomCode("teacher-1");
      const code2 = await generateRoomCode("teacher-2");

      // Different teachers should get different codes (statistically)
      // This might occasionally fail due to random collision, but very unlikely
      expect(code1).not.toBe(code2);
    });

    it("should retry on collision and eventually succeed", async () => {
      (doc as jest.Mock).mockReturnValue({});
      
      let callCount = 0;
      (getDoc as jest.Mock).mockImplementation(() => {
        callCount++;
        // First 2 calls return collision, 3rd call succeeds
        return Promise.resolve({ exists: () => callCount <= 2 });
      });

      const code = await generateRoomCode("teacher-123");

      expect(code).toMatch(/^\d{6}$/);
      expect(getDoc).toHaveBeenCalledTimes(3); // Retried twice
    });

    it("should throw error after max retry attempts", async () => {
      (doc as jest.Mock).mockReturnValue({});
      // Always return collision
      (getDoc as jest.Mock).mockResolvedValue({ exists: () => true });

      await expect(generateRoomCode("teacher-123")).rejects.toThrow(
        "Failed to generate unique room code after 5 attempts"
      );

      expect(getDoc).toHaveBeenCalledTimes(5);
    });
  });

  describe("validateRoomCode", () => {
    it("should accept valid 6-digit codes", () => {
      const result = validateRoomCode("482931");
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it("should accept codes with leading zeros", () => {
      const result = validateRoomCode("012345");
      expect(result.valid).toBe(true);
    });

    it("should reject non-numeric codes", () => {
      const result = validateRoomCode("abc123");
      expect(result.valid).toBe(false);
      expect(result.error).toBe("Room code must contain only numbers");
    });

    it("should reject codes with letters mixed in", () => {
      const result = validateRoomCode("48a931");
      expect(result.valid).toBe(false);
      expect(result.error).toBe("Room code must contain only numbers");
    });

    it("should reject codes shorter than 6 digits", () => {
      const result = validateRoomCode("12345");
      expect(result.valid).toBe(false);
      expect(result.error).toBe("Room code must be exactly 6 digits");
    });

    it("should reject codes longer than 6 digits", () => {
      const result = validateRoomCode("1234567");
      expect(result.valid).toBe(false);
      expect(result.error).toBe("Room code must be exactly 6 digits");
    });

    it("should reject empty codes", () => {
      const result = validateRoomCode("");
      expect(result.valid).toBe(false);
      expect(result.error).toBe("Room code cannot be empty");
    });

    it("should reject codes with spaces", () => {
      const result = validateRoomCode("123 456");
      expect(result.valid).toBe(false);
      // Length check happens first, "123 456" has length 7
      expect(result.error).toBe("Room code must be exactly 6 digits");
    });

    it("should reject codes with special characters", () => {
      const result = validateRoomCode("123-456");
      expect(result.valid).toBe(false);
      // Length check happens first, "123-456" has length 7
      expect(result.error).toBe("Room code must be exactly 6 digits");
    });

    it("should handle trimming whitespace", () => {
      const result = validateRoomCode("  482931  ");
      expect(result.valid).toBe(true);
    });
  });

  describe("getRoomIdByCode", () => {
    it("should return roomId for valid code", async () => {
      const mockDoc = {
        exists: () => true,
        data: () => ({ code: "482931", roomId: "room-abc-123", createdBy: "teacher-1" }),
      };

      (doc as jest.Mock).mockReturnValue({});
      (getDoc as jest.Mock).mockResolvedValue(mockDoc);

      const roomId = await getRoomIdByCode("482931");

      expect(roomId).toBe("room-abc-123");
      expect(getDoc).toHaveBeenCalled();
    });

    it("should return null for non-existent code", async () => {
      const mockDoc = {
        exists: () => false,
      };

      (doc as jest.Mock).mockReturnValue({});
      (getDoc as jest.Mock).mockResolvedValue(mockDoc);

      const roomId = await getRoomIdByCode("999999");

      expect(roomId).toBeNull();
    });

    it("should return null for invalid code format", async () => {
      const roomId = await getRoomIdByCode("abc123");

      expect(roomId).toBeNull();
      expect(getDoc).not.toHaveBeenCalled(); // Should fail validation before querying
    });

    it("should handle empty code", async () => {
      const roomId = await getRoomIdByCode("");

      expect(roomId).toBeNull();
      expect(getDoc).not.toHaveBeenCalled();
    });
  });

  describe("saveRoomCodeMapping", () => {
    it("should save code-to-roomId mapping to Firestore", async () => {
      const mockDocRef = {};
      (doc as jest.Mock).mockReturnValue(mockDocRef);
      (setDoc as jest.Mock).mockResolvedValue(undefined);

      await saveRoomCodeMapping("482931", "room-abc", "teacher-1");

      expect(doc).toHaveBeenCalledWith(expect.anything(), "roomCodes", "482931");
      expect(setDoc).toHaveBeenCalledWith(
        mockDocRef,
        expect.objectContaining({
          code: "482931",
          roomId: "room-abc",
          createdBy: "teacher-1",
        })
      );
    });

    it("should throw error for invalid code format", async () => {
      await expect(saveRoomCodeMapping("abc", "room-1", "teacher-1")).rejects.toThrow(
        "Invalid room code"
      );

      expect(setDoc).not.toHaveBeenCalled();
    });
  });

  describe("deleteRoomCodeMapping", () => {
    it("should mark code as deleted with timestamp", async () => {
      const mockDoc = {
        exists: () => true,
        data: () => ({ code: "482931", roomId: "room-abc" }),
      };

      (doc as jest.Mock).mockReturnValue({});
      (getDoc as jest.Mock).mockResolvedValue(mockDoc);
      (setDoc as jest.Mock).mockResolvedValue(undefined);

      await deleteRoomCodeMapping("482931");

      expect(setDoc).toHaveBeenCalled();
      expect(setDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          code: "482931",
          roomId: "room-abc",
        }),
        { merge: true }
      );
    });

    it("should handle non-existent code gracefully", async () => {
      const mockDoc = {
        exists: () => false,
      };

      (doc as jest.Mock).mockReturnValue({});
      (getDoc as jest.Mock).mockResolvedValue(mockDoc);

      await deleteRoomCodeMapping("999999");

      expect(setDoc).not.toHaveBeenCalled();
    });

    it("should handle empty code", async () => {
      await deleteRoomCodeMapping("");

      expect(getDoc).not.toHaveBeenCalled();
    });
  });

  describe("getCodeByRoomId", () => {
    it("should return code for valid roomId", async () => {
      const mockSnapshot = {
        empty: false,
        docs: [
          {
            data: () => ({ code: "482931", roomId: "room-abc", createdBy: "teacher-1" }),
          },
        ],
      };

      (collection as jest.Mock).mockReturnValue({});
      (query as jest.Mock).mockReturnValue({});
      (where as jest.Mock).mockReturnValue({});
      (getDocs as jest.Mock).mockResolvedValue(mockSnapshot);

      const code = await getCodeByRoomId("room-abc");

      expect(code).toBe("482931");
    });

    it("should return null for non-existent roomId", async () => {
      const mockSnapshot = {
        empty: true,
        docs: [],
      };

      (collection as jest.Mock).mockReturnValue({});
      (query as jest.Mock).mockReturnValue({});
      (where as jest.Mock).mockReturnValue({});
      (getDocs as jest.Mock).mockResolvedValue(mockSnapshot);

      const code = await getCodeByRoomId("room-xyz");

      expect(code).toBeNull();
    });

    it("should return null for deleted codes", async () => {
      const mockSnapshot = {
        empty: false,
        docs: [
          {
            data: () => ({ code: "482931", roomId: "room-abc", deletedAt: Date.now() }),
          },
        ],
      };

      (collection as jest.Mock).mockReturnValue({});
      (query as jest.Mock).mockReturnValue({});
      (where as jest.Mock).mockReturnValue({});
      (getDocs as jest.Mock).mockResolvedValue(mockSnapshot);

      const code = await getCodeByRoomId("room-abc");

      expect(code).toBeNull();
    });

    it("should handle empty roomId", async () => {
      const code = await getCodeByRoomId("");

      expect(code).toBeNull();
      expect(getDocs).not.toHaveBeenCalled();
    });
  });
});

