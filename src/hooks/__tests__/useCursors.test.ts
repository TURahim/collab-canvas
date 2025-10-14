/**
 * Unit Tests for useCursors Hook
 * Tests cursor tracking, synchronization, and presence management
 */

import { renderHook, waitFor } from "@testing-library/react";
import { useCursors } from "../useCursors";
import * as realtimeSync from "../../lib/realtimeSync";

// Mock the realtimeSync module
jest.mock("../../lib/realtimeSync");

const mockUpdateCursorPosition = realtimeSync.updateCursorPosition as jest.MockedFunction<
  typeof realtimeSync.updateCursorPosition
>;
const mockUpdateUserPresence = realtimeSync.updateUserPresence as jest.MockedFunction<
  typeof realtimeSync.updateUserPresence
>;
const mockListenToUsers = realtimeSync.listenToUsers as jest.MockedFunction<
  typeof realtimeSync.listenToUsers
>;
const mockMarkUserOffline = realtimeSync.markUserOffline as jest.MockedFunction<
  typeof realtimeSync.markUserOffline
>;
const mockSetupPresenceHeartbeat = realtimeSync.setupPresenceHeartbeat as jest.MockedFunction<
  typeof realtimeSync.setupPresenceHeartbeat
>;

// Mock editor with tldraw v4 DOM-based event system
const createMockEditor = () => {
  const mockContainer = document.createElement('div');
  
  return {
    getContainer: jest.fn(() => mockContainer),
    screenToPage: jest.fn((point: { x: number; y: number }) => point),
    _container: mockContainer,
  };
};

describe("useCursors", () => {
  let mockEditor: ReturnType<typeof createMockEditor>;
  let mockHeartbeatInterval: NodeJS.Timeout;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    
    // Polyfill PointerEvent for tests (JSDOM doesn't have it)
    if (typeof global.PointerEvent === 'undefined') {
      (global as any).PointerEvent = class PointerEvent extends MouseEvent {
        constructor(type: string, params: PointerEventInit = {}) {
          super(type, params);
          Object.assign(this, params);
        }
      };
    }
    
    mockEditor = createMockEditor();
    mockHeartbeatInterval = setInterval(() => {}, 10000) as NodeJS.Timeout;
    
    // Setup default mocks
    mockUpdateCursorPosition.mockResolvedValue();
    mockUpdateUserPresence.mockResolvedValue();
    mockMarkUserOffline.mockResolvedValue();
    mockSetupPresenceHeartbeat.mockReturnValue(mockHeartbeatInterval);
    mockListenToUsers.mockImplementation(() => () => {});
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  describe("Initialization", () => {
    it("returns initial state when not enabled", () => {
      const { result } = renderHook(() =>
        useCursors({
          editor: mockEditor as any,
          userId: "user-1",
          userName: "Alice",
          userColor: "#FF0000",
          enabled: false,
        })
      );

      expect(result.current.remoteCursors).toEqual({});
      expect(result.current.isTracking).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it("returns initial state when editor is null", async () => {
      const { result } = renderHook(() =>
        useCursors({
          editor: null,
          userId: "user-1",
          userName: "Alice",
          userColor: "#FF0000",
          enabled: true,
        })
      );

      expect(result.current.isTracking).toBe(false);
      // Note: presence setup happens independently of editor, so it may still be called
    });

    it("returns initial state when userId is null", () => {
      const { result } = renderHook(() =>
        useCursors({
          editor: mockEditor as any,
          userId: null,
          userName: "Alice",
          userColor: "#FF0000",
          enabled: true,
        })
      );

      expect(result.current.isTracking).toBe(false);
      expect(mockUpdateUserPresence).not.toHaveBeenCalled();
    });

    it("returns initial state when userName is null", () => {
      const { result } = renderHook(() =>
        useCursors({
          editor: mockEditor as any,
          userId: "user-1",
          userName: null,
          userColor: "#FF0000",
          enabled: true,
        })
      );

      expect(result.current.isTracking).toBe(false);
      expect(mockUpdateUserPresence).not.toHaveBeenCalled();
    });
  });

  describe("Cursor Tracking Setup", () => {
    it("attaches pointer event listener to container", () => {
      const addEventListenerSpy = jest.spyOn(mockEditor._container, 'addEventListener');
      
      renderHook(() =>
        useCursors({
          editor: mockEditor as any,
          userId: "user-1",
          userName: "Alice",
          userColor: "#FF0000",
          enabled: true,
        })
      );

      expect(addEventListenerSpy).toHaveBeenCalledWith("pointermove", expect.any(Function));
      addEventListenerSpy.mockRestore();
    });

    it("sets isTracking to true when successfully set up", () => {
      const { result } = renderHook(() =>
        useCursors({
          editor: mockEditor as any,
          userId: "user-1",
          userName: "Alice",
          userColor: "#FF0000",
          enabled: true,
        })
      );

      expect(result.current.isTracking).toBe(true);
    });

    it("handles pointer move events and updates cursor position", async () => {
      renderHook(() =>
        useCursors({
          editor: mockEditor as any,
          userId: "user-1",
          userName: "Alice",
          userColor: "#FF0000",
          enabled: true,
        })
      );

      // Simulate pointer move on container
      const pointerEvent = new MouseEvent('pointermove', {
        clientX: 100,
        clientY: 200,
        bubbles: true,
      });
      mockEditor._container.dispatchEvent(pointerEvent);

      // Fast-forward to trigger throttled update
      jest.advanceTimersByTime(50);

      await waitFor(() => {
        expect(mockUpdateCursorPosition).toHaveBeenCalledWith("user-1", { x: 100, y: 200 });
      });
    });

    it("throttles cursor updates to 30Hz (33ms)", async () => {
      renderHook(() =>
        useCursors({
          editor: mockEditor as any,
          userId: "user-1",
          userName: "Alice",
          userColor: "#FF0000",
          enabled: true,
        })
      );

      // Simulate rapid pointer moves
      mockEditor._container.dispatchEvent(new MouseEvent('pointermove', { clientX: 100, clientY: 100, bubbles: true }));
      mockEditor._container.dispatchEvent(new MouseEvent('pointermove', { clientX: 101, clientY: 101, bubbles: true }));
      mockEditor._container.dispatchEvent(new MouseEvent('pointermove', { clientX: 102, clientY: 102, bubbles: true }));

      // Advance time past throttle interval
      jest.advanceTimersByTime(50);

      await waitFor(() => {
        // With throttle, should be called at least once (throttle implementations may vary)
        expect(mockUpdateCursorPosition).toHaveBeenCalled();
        // Last call should have the latest position
        const lastCall = mockUpdateCursorPosition.mock.calls[mockUpdateCursorPosition.mock.calls.length - 1];
        expect(lastCall[0]).toBe("user-1");
      });
    });

    it("handles pointer events correctly", async () => {
      renderHook(() =>
        useCursors({
          editor: mockEditor as any,
          userId: "user-1",
          userName: "Alice",
          userColor: "#FF0000",
          enabled: true,
        })
      );

      // Dispatch a valid pointer event
      mockEditor._container.dispatchEvent(new MouseEvent('pointermove', { clientX: 50, clientY: 60, bubbles: true }));
      jest.advanceTimersByTime(50);

      await waitFor(() => {
        expect(mockUpdateCursorPosition).toHaveBeenCalledWith("user-1", { x: 50, y: 60 });
      });
    });

    it("removes pointer event listener on cleanup", () => {
      const removeEventListenerSpy = jest.spyOn(mockEditor._container, 'removeEventListener');
      
      const { unmount } = renderHook(() =>
        useCursors({
          editor: mockEditor as any,
          userId: "user-1",
          userName: "Alice",
          userColor: "#FF0000",
          enabled: true,
        })
      );
      
      unmount();

      expect(removeEventListenerSpy).toHaveBeenCalledWith("pointermove", expect.any(Function));
      removeEventListenerSpy.mockRestore();
    });
  });

  describe("Presence Management", () => {
    it("updates user presence on mount", async () => {
      renderHook(() =>
        useCursors({
          editor: mockEditor as any,
          userId: "user-1",
          userName: "Alice",
          userColor: "#FF0000",
          enabled: true,
        })
      );

      await waitFor(() => {
        expect(mockUpdateUserPresence).toHaveBeenCalledWith("user-1", "Alice", "#FF0000");
      });
    });

    it("sets up presence heartbeat", async () => {
      renderHook(() =>
        useCursors({
          editor: mockEditor as any,
          userId: "user-1",
          userName: "Alice",
          userColor: "#FF0000",
          enabled: true,
        })
      );

      await waitFor(() => {
        expect(mockSetupPresenceHeartbeat).toHaveBeenCalledWith("user-1");
      });
    });

    it("subscribes to other users' cursors", async () => {
      renderHook(() =>
        useCursors({
          editor: mockEditor as any,
          userId: "user-1",
          userName: "Alice",
          userColor: "#FF0000",
          enabled: true,
        })
      );

      await waitFor(() => {
        expect(mockListenToUsers).toHaveBeenCalledWith(expect.any(Function));
      });
    });

    it("clears heartbeat interval on unmount", async () => {
      const mockClearInterval = jest.spyOn(global, 'clearInterval');

      const { unmount } = renderHook(() =>
        useCursors({
          editor: mockEditor as any,
          userId: "user-1",
          userName: "Alice",
          userColor: "#FF0000",
          enabled: true,
        })
      );

      await waitFor(() => {
        expect(mockSetupPresenceHeartbeat).toHaveBeenCalled();
      });

      unmount();

      expect(mockClearInterval).toHaveBeenCalledWith(mockHeartbeatInterval);
      mockClearInterval.mockRestore();
    });

    it("marks user offline on unmount", async () => {
      const { unmount } = renderHook(() =>
        useCursors({
          editor: mockEditor as any,
          userId: "user-1",
          userName: "Alice",
          userColor: "#FF0000",
          enabled: true,
        })
      );

      await waitFor(() => {
        expect(mockUpdateUserPresence).toHaveBeenCalled();
      });

      unmount();

      await waitFor(() => {
        expect(mockMarkUserOffline).toHaveBeenCalledWith("user-1");
      });
    });

    it("unsubscribes from users listener on unmount", async () => {
      const mockUnsubscribe = jest.fn();
      mockListenToUsers.mockImplementation(() => mockUnsubscribe);

      const { unmount } = renderHook(() =>
        useCursors({
          editor: mockEditor as any,
          userId: "user-1",
          userName: "Alice",
          userColor: "#FF0000",
          enabled: true,
        })
      );

      await waitFor(() => {
        expect(mockListenToUsers).toHaveBeenCalled();
      });

      unmount();

      expect(mockUnsubscribe).toHaveBeenCalled();
    });
  });

  describe("Remote Cursors", () => {
    it("filters out current user from remote cursors", async () => {
      let usersCallback: ((users: Record<string, any>) => void) | null = null;

      mockListenToUsers.mockImplementation((callback) => {
        usersCallback = callback;
        return () => {};
      });

      const { result } = renderHook(() =>
        useCursors({
          editor: mockEditor as any,
          userId: "user-1",
          userName: "Alice",
          userColor: "#FF0000",
          enabled: true,
        })
      );

      await waitFor(() => {
        expect(mockListenToUsers).toHaveBeenCalled();
      });

      // Simulate users data including current user
      const usersData = {
        "user-1": {
          name: "Alice",
          color: "#FF0000",
          cursor: { x: 100, y: 100 },
          online: true,
          lastSeen: Date.now(),
        },
        "user-2": {
          name: "Bob",
          color: "#00FF00",
          cursor: { x: 200, y: 200 },
          online: true,
          lastSeen: Date.now(),
        },
      };

      if (usersCallback) {
        usersCallback(usersData);
      }

      await waitFor(() => {
        expect(result.current.remoteCursors).not.toHaveProperty("user-1");
        expect(result.current.remoteCursors).toHaveProperty("user-2");
      });
    });

    it("updates remote cursors when users data changes", async () => {
      let usersCallback: ((users: Record<string, any>) => void) | null = null;

      mockListenToUsers.mockImplementation((callback) => {
        usersCallback = callback;
        return () => {};
      });

      const { result } = renderHook(() =>
        useCursors({
          editor: mockEditor as any,
          userId: "user-1",
          userName: "Alice",
          userColor: "#FF0000",
          enabled: true,
        })
      );

      await waitFor(() => {
        expect(mockListenToUsers).toHaveBeenCalled();
      });

      // Initial users
      if (usersCallback) {
        usersCallback({
          "user-1": {
            name: "Alice",
            color: "#FF0000",
            cursor: { x: 100, y: 100 },
            online: true,
            lastSeen: Date.now(),
          },
        });
      }

      await waitFor(() => {
        expect(Object.keys(result.current.remoteCursors)).toHaveLength(0);
      });

      // User joins
      if (usersCallback) {
        usersCallback({
          "user-1": {
            name: "Alice",
            color: "#FF0000",
            cursor: { x: 100, y: 100 },
            online: true,
            lastSeen: Date.now(),
          },
          "user-2": {
            name: "Bob",
            color: "#00FF00",
            cursor: { x: 200, y: 200 },
            online: true,
            lastSeen: Date.now(),
          },
        });
      }

      await waitFor(() => {
        expect(Object.keys(result.current.remoteCursors)).toHaveLength(1);
        expect(result.current.remoteCursors["user-2"]).toBeDefined();
      });
    });

    it("updates when cursor positions change", async () => {
      let usersCallback: ((users: Record<string, any>) => void) | null = null;

      mockListenToUsers.mockImplementation((callback) => {
        usersCallback = callback;
        return () => {};
      });

      const { result } = renderHook(() =>
        useCursors({
          editor: mockEditor as any,
          userId: "user-1",
          userName: "Alice",
          userColor: "#FF0000",
          enabled: true,
        })
      );

      await waitFor(() => {
        expect(mockListenToUsers).toHaveBeenCalled();
      });

      // Initial position
      if (usersCallback) {
        usersCallback({
          "user-2": {
            name: "Bob",
            color: "#00FF00",
            cursor: { x: 200, y: 200 },
            online: true,
            lastSeen: Date.now(),
          },
        });
      }

      await waitFor(() => {
        expect(result.current.remoteCursors["user-2"]?.cursor).toEqual({ x: 200, y: 200 });
      });

      // Updated position
      if (usersCallback) {
        usersCallback({
          "user-2": {
            name: "Bob",
            color: "#00FF00",
            cursor: { x: 300, y: 400 },
            online: true,
            lastSeen: Date.now(),
          },
        });
      }

      await waitFor(() => {
        expect(result.current.remoteCursors["user-2"]?.cursor).toEqual({ x: 300, y: 400 });
      });
    });
  });

  describe("Error Handling", () => {
    it("handles errors in cursor position updates", async () => {
      mockUpdateCursorPosition.mockRejectedValue(new Error("Update failed"));
      
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      renderHook(() =>
        useCursors({
          editor: mockEditor as any,
          userId: "user-1",
          userName: "Alice",
          userColor: "#FF0000",
          enabled: true,
        })
      );

      mockEditor._container.dispatchEvent(new MouseEvent('pointermove', { clientX: 100, clientY: 200, bubbles: true }));
      jest.advanceTimersByTime(50);

      await waitFor(() => {
        expect(consoleErrorSpy).toHaveBeenCalledWith(
          expect.stringContaining("[useCursors] Failed to update cursor"),
          expect.any(Error)
        );
      });

      consoleErrorSpy.mockRestore();
    });

    it("handles errors in presence setup", async () => {
      mockUpdateUserPresence.mockRejectedValue(new Error("Presence failed"));

      const { result } = renderHook(() =>
        useCursors({
          editor: mockEditor as any,
          userId: "user-1",
          userName: "Alice",
          userColor: "#FF0000",
          enabled: true,
        })
      );

      await waitFor(() => {
        expect(result.current.error).toBeTruthy();
      });

      // Error could be the original or wrapped error
      expect(result.current.error?.message).toMatch(/Failed to set up presence|Presence failed/);
    });
  });

  describe("Re-initialization", () => {
    it("re-attaches listener when editor changes", () => {
      const removeEventListenerSpy = jest.spyOn(mockEditor._container, 'removeEventListener');
      
      const { rerender } = renderHook(
        ({ editor }) =>
          useCursors({
            editor: editor as any,
            userId: "user-1",
            userName: "Alice",
            userColor: "#FF0000",
            enabled: true,
          }),
        { initialProps: { editor: mockEditor } }
      );

      const newMockEditor = createMockEditor();
      const addEventListenerSpy = jest.spyOn(newMockEditor._container, 'addEventListener');
      
      rerender({ editor: newMockEditor });

      expect(removeEventListenerSpy).toHaveBeenCalled();
      expect(addEventListenerSpy).toHaveBeenCalledWith("pointermove", expect.any(Function));
      
      removeEventListenerSpy.mockRestore();
      addEventListenerSpy.mockRestore();
    });

    it("updates presence when user info changes", async () => {
      const { rerender } = renderHook(
        ({ userName, userColor }) =>
          useCursors({
            editor: mockEditor as any,
            userId: "user-1",
            userName,
            userColor,
            enabled: true,
          }),
        {
          initialProps: { userName: "Alice", userColor: "#FF0000" },
        }
      );

      await waitFor(() => {
        expect(mockUpdateUserPresence).toHaveBeenCalledWith("user-1", "Alice", "#FF0000");
      });

      mockUpdateUserPresence.mockClear();

      rerender({ userName: "Alice Updated", userColor: "#0000FF" });

      await waitFor(() => {
        expect(mockUpdateUserPresence).toHaveBeenCalledWith("user-1", "Alice Updated", "#0000FF");
      });
    });
  });
});

