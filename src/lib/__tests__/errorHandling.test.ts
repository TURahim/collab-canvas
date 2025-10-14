/**
 * Error Handling Tests
 * Smoke tests for retry logic and error resilience
 */

import { withRetry } from "../utils";

describe("Error Handling", () => {
  describe("withRetry", () => {
    it("should succeed on first attempt if no error", async () => {
      const mockFn = jest.fn().mockResolvedValue("success");
      const result = await withRetry(mockFn);
      expect(result).toBe("success");
      expect(mockFn).toHaveBeenCalledTimes(1);
    });

    it("should retry on failure and eventually succeed", async () => {
      const mockFn = jest
        .fn()
        .mockRejectedValueOnce(new Error("Fail 1"))
        .mockRejectedValueOnce(new Error("Fail 2"))
        .mockResolvedValue("success");

      const result = await withRetry(mockFn, 3, 10);
      expect(result).toBe("success");
      expect(mockFn).toHaveBeenCalledTimes(3);
    });

    it("should throw after max retries exceeded", async () => {
      const mockFn = jest.fn().mockRejectedValue(new Error("Persistent failure"));

      await expect(withRetry(mockFn, 2, 10)).rejects.toThrow("Persistent failure");
      expect(mockFn).toHaveBeenCalledTimes(3); // initial + 2 retries
    });

    it("should apply exponential backoff delays", async () => {
      const mockFn = jest
        .fn()
        .mockRejectedValueOnce(new Error("Fail 1"))
        .mockRejectedValueOnce(new Error("Fail 2"))
        .mockResolvedValue("success");

      const startTime = Date.now();
      await withRetry(mockFn, 2, 50);
      const elapsed = Date.now() - startTime;

      // Should have delays: 50ms, 100ms = ~150ms total minimum
      expect(elapsed).toBeGreaterThanOrEqual(100);
    });

    it("should handle non-Error rejections", async () => {
      const mockFn = jest.fn().mockRejectedValue("string error");

      await expect(withRetry(mockFn, 1, 10)).rejects.toThrow("Operation failed after retries");
    });
  });
});

