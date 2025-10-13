/**
 * Unit Tests for usePresence Hook
 * Tests presence management and user filtering
 */

import { renderHook, waitFor } from "@testing-library/react";
import { usePresence } from "../usePresence";
import * as realtimeSync from "../../lib/realtimeSync";

// Mock the realtimeSync module
jest.mock("../../lib/realtimeSync");

const mockListenToUsers = realtimeSync.listenToUsers as jest.MockedFunction<
  typeof realtimeSync.listenToUsers
>;
const mockGetOnlineUsers = realtimeSync.getOnlineUsers as jest.MockedFunction<
  typeof realtimeSync.getOnlineUsers
>;

describe("usePresence", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns empty state when not enabled", () => {
    const { result } = renderHook(() =>
      usePresence({
        currentUserId: "user-1",
        enabled: false,
      })
    );

    expect(result.current.onlineUsers).toEqual([]);
    expect(result.current.currentUser).toBeNull();
    expect(result.current.userCount).toBe(0);
    expect(result.current.error).toBeNull();
  });

  it("returns empty state when currentUserId is null", () => {
    const { result } = renderHook(() =>
      usePresence({
        currentUserId: null,
        enabled: true,
      })
    );

    expect(result.current.onlineUsers).toEqual([]);
    expect(result.current.currentUser).toBeNull();
    expect(result.current.userCount).toBe(0);
  });

  it("loads initial users on mount", async () => {
    const mockUsers = {
      "user-1": {
        name: "Alice",
        color: "#FF0000",
        cursor: null,
        online: true,
        lastSeen: Date.now(),
      },
      "user-2": {
        name: "Bob",
        color: "#00FF00",
        cursor: null,
        online: true,
        lastSeen: Date.now(),
      },
    };

    mockGetOnlineUsers.mockResolvedValue(mockUsers);
    mockListenToUsers.mockImplementation(() => () => {});

    const { result } = renderHook(() =>
      usePresence({
        currentUserId: "user-1",
        enabled: true,
      })
    );

    await waitFor(() => {
      expect(result.current.userCount).toBe(2);
    });

    expect(result.current.currentUser).toBeTruthy();
    expect(result.current.currentUser?.name).toBe("Alice");
    expect(result.current.onlineUsers).toHaveLength(1);
    expect(result.current.onlineUsers[0].name).toBe("Bob");
  });

  it("filters current user from online users list", async () => {
    const mockUsers = {
      "user-1": {
        name: "Alice",
        color: "#FF0000",
        cursor: null,
        online: true,
        lastSeen: Date.now(),
      },
      "user-2": {
        name: "Bob",
        color: "#00FF00",
        cursor: null,
        online: true,
        lastSeen: Date.now(),
      },
      "user-3": {
        name: "Charlie",
        color: "#0000FF",
        cursor: null,
        online: true,
        lastSeen: Date.now(),
      },
    };

    mockGetOnlineUsers.mockResolvedValue(mockUsers);
    mockListenToUsers.mockImplementation(() => () => {});

    const { result } = renderHook(() =>
      usePresence({
        currentUserId: "user-2",
        enabled: true,
      })
    );

    await waitFor(() => {
      expect(result.current.userCount).toBe(3);
    });

    expect(result.current.currentUser?.name).toBe("Bob");
    expect(result.current.onlineUsers).toHaveLength(2);
    expect(result.current.onlineUsers.find(u => u.name === "Bob")).toBeUndefined();
    expect(result.current.onlineUsers.find(u => u.name === "Alice")).toBeTruthy();
    expect(result.current.onlineUsers.find(u => u.name === "Charlie")).toBeTruthy();
  });

  it("updates when users join", async () => {
    let usersCallback: ((users: Record<string, any>) => void) | null = null;

    mockGetOnlineUsers.mockResolvedValue({});
    mockListenToUsers.mockImplementation((callback) => {
      usersCallback = callback;
      return () => {};
    });

    const { result } = renderHook(() =>
      usePresence({
        currentUserId: "user-1",
        enabled: true,
      })
    );

    // Wait for initial load
    await waitFor(() => {
      expect(mockListenToUsers).toHaveBeenCalled();
    });

    // Simulate user joining
    const newUsers = {
      "user-1": {
        name: "Alice",
        color: "#FF0000",
        cursor: null,
        online: true,
        lastSeen: Date.now(),
      },
      "user-2": {
        name: "Bob",
        color: "#00FF00",
        cursor: null,
        online: true,
        lastSeen: Date.now(),
      },
    };

    if (usersCallback) {
      usersCallback(newUsers);
    }

    await waitFor(() => {
      expect(result.current.userCount).toBe(2);
    });

    expect(result.current.onlineUsers).toHaveLength(1);
    expect(result.current.onlineUsers[0].name).toBe("Bob");
  });

  it("updates when users leave", async () => {
    let usersCallback: ((users: Record<string, any>) => void) | null = null;

    const initialUsers = {
      "user-1": {
        name: "Alice",
        color: "#FF0000",
        cursor: null,
        online: true,
        lastSeen: Date.now(),
      },
      "user-2": {
        name: "Bob",
        color: "#00FF00",
        cursor: null,
        online: true,
        lastSeen: Date.now(),
      },
    };

    mockGetOnlineUsers.mockResolvedValue(initialUsers);
    mockListenToUsers.mockImplementation((callback) => {
      usersCallback = callback;
      return () => {};
    });

    const { result } = renderHook(() =>
      usePresence({
        currentUserId: "user-1",
        enabled: true,
      })
    );

    await waitFor(() => {
      expect(result.current.userCount).toBe(2);
    });

    // Simulate user leaving
    const updatedUsers = {
      "user-1": {
        name: "Alice",
        color: "#FF0000",
        cursor: null,
        online: true,
        lastSeen: Date.now(),
      },
    };

    if (usersCallback) {
      usersCallback(updatedUsers);
    }

    await waitFor(() => {
      expect(result.current.userCount).toBe(1);
    });

    expect(result.current.onlineUsers).toHaveLength(0);
  });

  it("handles errors gracefully", async () => {
    const mockError = new Error("Failed to load users");
    mockGetOnlineUsers.mockRejectedValue(mockError);
    mockListenToUsers.mockImplementation(() => () => {});

    const { result } = renderHook(() =>
      usePresence({
        currentUserId: "user-1",
        enabled: true,
      })
    );

    await waitFor(() => {
      expect(result.current.error).toBeTruthy();
    });

    expect(result.current.error?.message).toBe("Failed to load users");
  });

  it("cleans up listeners on unmount", async () => {
    const mockUnsubscribe = jest.fn();
    mockGetOnlineUsers.mockResolvedValue({});
    mockListenToUsers.mockImplementation(() => mockUnsubscribe);

    const { unmount } = renderHook(() =>
      usePresence({
        currentUserId: "user-1",
        enabled: true,
      })
    );

    await waitFor(() => {
      expect(mockListenToUsers).toHaveBeenCalled();
    });

    unmount();

    expect(mockUnsubscribe).toHaveBeenCalled();
  });

  it("counts all users correctly", async () => {
    const mockUsers = {
      "user-1": {
        name: "Alice",
        color: "#FF0000",
        cursor: null,
        online: true,
        lastSeen: Date.now(),
      },
      "user-2": {
        name: "Bob",
        color: "#00FF00",
        cursor: null,
        online: true,
        lastSeen: Date.now(),
      },
      "user-3": {
        name: "Charlie",
        color: "#0000FF",
        cursor: null,
        online: true,
        lastSeen: Date.now(),
      },
      "user-4": {
        name: "David",
        color: "#FFFF00",
        cursor: null,
        online: true,
        lastSeen: Date.now(),
      },
    };

    mockGetOnlineUsers.mockResolvedValue(mockUsers);
    mockListenToUsers.mockImplementation(() => () => {});

    const { result } = renderHook(() =>
      usePresence({
        currentUserId: "user-1",
        enabled: true,
      })
    );

    await waitFor(() => {
      expect(result.current.userCount).toBe(4);
    });

    expect(result.current.onlineUsers).toHaveLength(3);
    expect(result.current.currentUser).toBeTruthy();
  });
});

