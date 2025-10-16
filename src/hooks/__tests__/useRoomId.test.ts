/**
 * Tests for useRoomId hook
 */

import { renderHook } from "@testing-library/react";
import { useParams } from "next/navigation";
import { useRoomId } from "../useRoomId";

// Mock Next.js navigation
jest.mock("next/navigation", () => ({
  useParams: jest.fn(),
}));

const mockUseParams = useParams as jest.MockedFunction<typeof useParams>;

describe("useRoomId hook", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should return room ID from params", () => {
    mockUseParams.mockReturnValue({ roomId: "abc123" });

    const { result } = renderHook(() => useRoomId());

    expect(result.current).toBe("abc123");
  });

  it("should return null for invalid room ID", () => {
    mockUseParams.mockReturnValue({ roomId: "invalid room" });

    const { result } = renderHook(() => useRoomId());

    expect(result.current).toBeNull();
  });

  it("should return null when params are missing", () => {
    mockUseParams.mockReturnValue({});

    const { result } = renderHook(() => useRoomId());

    expect(result.current).toBeNull();
  });

  it("should return null when roomId is undefined", () => {
    mockUseParams.mockReturnValue({ roomId: undefined });

    const { result } = renderHook(() => useRoomId());

    expect(result.current).toBeNull();
  });

  it("should handle array params (edge case)", () => {
    mockUseParams.mockReturnValue({ roomId: ["abc123", "xyz789"] });

    const { result } = renderHook(() => useRoomId());

    expect(result.current).toBe("abc123");
  });

  it("should return null for invalid array params", () => {
    mockUseParams.mockReturnValue({ roomId: ["invalid room"] });

    const { result } = renderHook(() => useRoomId());

    expect(result.current).toBeNull();
  });

  it("should validate room ID format", () => {
    // Valid formats
    mockUseParams.mockReturnValue({ roomId: "room-123" });
    let { result } = renderHook(() => useRoomId());
    expect(result.current).toBe("room-123");

    mockUseParams.mockReturnValue({ roomId: "room_456" });
    result = renderHook(() => useRoomId()).result;
    expect(result.current).toBe("room_456");

    // Invalid formats
    mockUseParams.mockReturnValue({ roomId: "room/123" });
    result = renderHook(() => useRoomId()).result;
    expect(result.current).toBeNull();

    mockUseParams.mockReturnValue({ roomId: "room@123" });
    result = renderHook(() => useRoomId()).result;
    expect(result.current).toBeNull();
  });
});

