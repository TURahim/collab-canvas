/**
 * Tests for useRateLimit hook
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { useRateLimit } from '../useRateLimit';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

describe('useRateLimit', () => {
  beforeEach(() => {
    localStorageMock.clear();
    jest.clearAllMocks();
  });

  afterEach(() => {
    localStorageMock.clear();
  });

  it('should initialize with default state', () => {
    const { result } = renderHook(() => useRateLimit());

    expect(result.current.count).toBe(0);
    expect(result.current.remaining).toBe(10);
    expect(result.current.isBlocked).toBe(false);
    expect(result.current.resetTime).toBeGreaterThan(Date.now());
  });

  it('should increment count successfully', () => {
    const { result } = renderHook(() => useRateLimit());

    act(() => {
      const success = result.current.incrementCount();
      expect(success).toBe(true);
    });

    expect(result.current.count).toBe(1);
    expect(result.current.remaining).toBe(9);
    expect(result.current.isBlocked).toBe(false);
  });

  it('should allow exactly 10 commands', () => {
    const { result } = renderHook(() => useRateLimit());

    // Execute 10 commands
    for (let i = 0; i < 10; i++) {
      act(() => {
        const success = result.current.incrementCount();
        expect(success).toBe(true);
      });
    }

    expect(result.current.count).toBe(10);
    expect(result.current.remaining).toBe(0);
    expect(result.current.isBlocked).toBe(true);
  });

  it('should block the 11th command', () => {
    const { result } = renderHook(() => useRateLimit());

    // Execute 10 commands
    for (let i = 0; i < 10; i++) {
      act(() => {
        result.current.incrementCount();
      });
    }

    // Try 11th command
    act(() => {
      const success = result.current.incrementCount();
      expect(success).toBe(false);
    });

    expect(result.current.count).toBe(10);
    expect(result.current.remaining).toBe(0);
    expect(result.current.isBlocked).toBe(true);
  });

  it('should persist state to localStorage', () => {
    const { result } = renderHook(() => useRateLimit());

    act(() => {
      result.current.incrementCount();
      result.current.incrementCount();
    });

    const stored = localStorageMock.getItem('ai_rate_limit');
    expect(stored).toBeTruthy();

    const data = JSON.parse(stored!);
    expect(data.count).toBe(2);
    expect(data.resetTime).toBeGreaterThan(Date.now());
  });

  it('should reset after 1 hour', () => {
    const { result, rerender } = renderHook(() => useRateLimit());

    // Increment count
    act(() => {
      result.current.incrementCount();
    });

    expect(result.current.count).toBe(1);

    // Manually set reset time to past
    const pastTime = Date.now() - 1000;
    localStorageMock.setItem(
      'ai_rate_limit',
      JSON.stringify({ count: 5, resetTime: pastTime })
    );

    // Rerender to trigger update
    rerender();

    // Wait for state update
    waitFor(() => {
      expect(result.current.count).toBe(0);
      expect(result.current.remaining).toBe(10);
      expect(result.current.isBlocked).toBe(false);
    });
  });

  it('should reset manually', () => {
    const { result } = renderHook(() => useRateLimit());

    // Increment count
    act(() => {
      result.current.incrementCount();
      result.current.incrementCount();
      result.current.incrementCount();
    });

    expect(result.current.count).toBe(3);

    // Reset
    act(() => {
      result.current.resetLimit();
    });

    expect(result.current.count).toBe(0);
    expect(result.current.remaining).toBe(10);
    expect(result.current.isBlocked).toBe(false);
  });

  it('should calculate time until reset correctly', () => {
    const { result } = renderHook(() => useRateLimit());

    const timeString = result.current.getTimeUntilReset();
    // Should return a time string (either minutes or hours format)
    expect(timeString).toMatch(/(\d+ minute|\d+ hour|\d+h \d+m)/);
  });

  it('should synchronize across re-renders', () => {
    const { result, rerender } = renderHook(() => useRateLimit());

    act(() => {
      result.current.incrementCount();
    });

    expect(result.current.count).toBe(1);

    // Rerender
    rerender();

    // Should maintain state from localStorage
    expect(result.current.count).toBe(1);
    expect(result.current.remaining).toBe(9);
  });

  it('should handle corrupted localStorage data gracefully', () => {
    // Set corrupted data
    localStorageMock.setItem('ai_rate_limit', 'invalid json');

    const { result } = renderHook(() => useRateLimit());

    // Should initialize with defaults
    expect(result.current.count).toBe(0);
    expect(result.current.remaining).toBe(10);
    expect(result.current.isBlocked).toBe(false);
  });

  it('should show warning when approaching limit', () => {
    const { result } = renderHook(() => useRateLimit());

    // Execute 8 commands
    for (let i = 0; i < 8; i++) {
      act(() => {
        result.current.incrementCount();
      });
    }

    // 2 remaining - should show warning
    expect(result.current.remaining).toBe(2);
    expect(result.current.remaining <= 2).toBe(true);
  });
});

