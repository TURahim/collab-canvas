/**
 * CollabCanvas - Utility Functions Unit Tests
 * Tests for color generation, user ID, debounce, throttle, and helper utilities
 */

import {
  generateColorFromString,
  generateRandomColor,
  generateUserId,
  isValidHexColor,
  getInitials,
  truncate,
  formatRelativeTime,
  debounce,
  throttle,
} from '../utils';

describe('Color Generation', () => {
  describe('generateColorFromString', () => {
    it('should generate a valid hex color format', () => {
      const color = generateColorFromString('test-user-123');
      expect(color).toMatch(/^#[0-9A-F]{6}$/i);
    });

    it('should generate different colors for different inputs', () => {
      const color1 = generateColorFromString('user-1');
      const color2 = generateColorFromString('user-2');
      expect(color1).not.toBe(color2);
    });

    it('should generate the same color for the same input (deterministic)', () => {
      const color1 = generateColorFromString('same-user');
      const color2 = generateColorFromString('same-user');
      expect(color1).toBe(color2);
    });

    it('should generate colors that are not too dark or too light', () => {
      const color = generateColorFromString('user-test');
      // Extract RGB values
      const r = parseInt(color.substring(1, 3), 16);
      const g = parseInt(color.substring(3, 5), 16);
      const b = parseInt(color.substring(5, 7), 16);
      
      // Check each channel is between 80 and 220 (vibrant range)
      expect(r).toBeGreaterThanOrEqual(80);
      expect(r).toBeLessThanOrEqual(220);
      expect(g).toBeGreaterThanOrEqual(80);
      expect(g).toBeLessThanOrEqual(220);
      expect(b).toBeGreaterThanOrEqual(80);
      expect(b).toBeLessThanOrEqual(220);
    });

    it('should handle empty string input', () => {
      const color = generateColorFromString('');
      expect(color).toMatch(/^#[0-9A-F]{6}$/i);
    });
  });

  describe('generateRandomColor', () => {
    it('should generate a valid hex color', () => {
      const color = generateRandomColor();
      expect(color).toMatch(/^#[0-9A-F]{6}$/i);
    });

    it('should generate colors from the predefined palette', () => {
      const validColors = [
        '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8',
        '#F7DC6F', '#BB8FCE', '#85C1E2', '#F8B739', '#52B788',
      ];
      
      const color = generateRandomColor();
      expect(validColors).toContain(color);
    });

    it('should potentially generate different colors on multiple calls', () => {
      const colors = new Set();
      for (let i = 0; i < 20; i++) {
        colors.add(generateRandomColor());
      }
      // With 20 calls, we should get at least 2 different colors
      expect(colors.size).toBeGreaterThan(1);
    });
  });
});

describe('User ID Generation', () => {
  describe('generateUserId', () => {
    it('should generate a unique ID', () => {
      const id1 = generateUserId();
      const id2 = generateUserId();
      expect(id1).not.toBe(id2);
    });

    it('should have correct format (user_timestamp_random)', () => {
      const id = generateUserId();
      expect(id).toMatch(/^user_[a-z0-9]+_[a-z0-9]+$/);
    });

    it('should start with "user_" prefix', () => {
      const id = generateUserId();
      expect(id).toMatch(/^user_/);
    });

    it('should generate IDs with reasonable length', () => {
      const id = generateUserId();
      expect(id.length).toBeGreaterThan(10);
      expect(id.length).toBeLessThan(50);
    });

    it('should generate unique IDs on multiple calls', () => {
      const ids = new Set();
      for (let i = 0; i < 100; i++) {
        ids.add(generateUserId());
      }
      expect(ids.size).toBe(100); // All should be unique
    });
  });
});

describe('Validation Functions', () => {
  describe('isValidHexColor', () => {
    it('should validate correct hex colors', () => {
      expect(isValidHexColor('#FF6B6B')).toBe(true);
      expect(isValidHexColor('#000000')).toBe(true);
      expect(isValidHexColor('#FFFFFF')).toBe(true);
      expect(isValidHexColor('#abc123')).toBe(true);
    });

    it('should reject invalid hex colors', () => {
      expect(isValidHexColor('#FF6B6')).toBe(false); // Too short
      expect(isValidHexColor('#FF6B6B6')).toBe(false); // Too long
      expect(isValidHexColor('FF6B6B')).toBe(false); // Missing #
      expect(isValidHexColor('#GGGGGG')).toBe(false); // Invalid characters
      expect(isValidHexColor('')).toBe(false);
      expect(isValidHexColor('not-a-color')).toBe(false);
    });

    it('should be case insensitive', () => {
      expect(isValidHexColor('#ff6b6b')).toBe(true);
      expect(isValidHexColor('#FF6B6B')).toBe(true);
      expect(isValidHexColor('#Ff6B6b')).toBe(true);
    });
  });
});

describe('String Utility Functions', () => {
  describe('getInitials', () => {
    it('should get initials from single word name', () => {
      expect(getInitials('John')).toBe('JO');
      expect(getInitials('Alice')).toBe('AL');
    });

    it('should get initials from two word name', () => {
      expect(getInitials('John Doe')).toBe('JD');
      expect(getInitials('Alice Smith')).toBe('AS');
    });

    it('should get first and last initials from multi-word name', () => {
      expect(getInitials('John Michael Doe')).toBe('JD');
      expect(getInitials('Mary Jane Watson')).toBe('MW');
    });

    it('should handle empty or invalid names', () => {
      expect(getInitials('')).toBe('?');
      expect(getInitials('   ')).toBe('?');
    });

    it('should handle names with extra spaces', () => {
      expect(getInitials('  John   Doe  ')).toBe('JD');
    });

    it('should convert to uppercase', () => {
      expect(getInitials('john doe')).toBe('JD');
      expect(getInitials('alice smith')).toBe('AS');
    });
  });

  describe('truncate', () => {
    it('should not truncate short strings', () => {
      expect(truncate('Hello', 10)).toBe('Hello');
      expect(truncate('Test', 10)).toBe('Test');
    });

    it('should truncate long strings with ellipsis', () => {
      expect(truncate('This is a very long string', 10)).toBe('This is...');
      expect(truncate('Hello World', 8)).toBe('Hello...');
    });

    it('should handle exact length', () => {
      expect(truncate('Hello', 5)).toBe('Hello');
    });

    it('should handle edge cases', () => {
      expect(truncate('', 10)).toBe('');
      expect(truncate('Hi', 3)).toBe('Hi');
      expect(truncate('Test', 3)).toBe('Tes'); // maxLength <= 3, return substring without ellipsis
      expect(truncate('Test', 2)).toBe('Te');
      expect(truncate('Test', 1)).toBe('T');
    });
  });

  describe('formatRelativeTime', () => {
    it('should return "just now" for recent timestamps', () => {
      const now = Date.now();
      expect(formatRelativeTime(now)).toBe('just now');
      expect(formatRelativeTime(now - 30000)).toBe('just now'); // 30 seconds ago
    });

    it('should format minutes correctly', () => {
      const now = Date.now();
      expect(formatRelativeTime(now - 2 * 60 * 1000)).toBe('2m ago');
      expect(formatRelativeTime(now - 30 * 60 * 1000)).toBe('30m ago');
    });

    it('should format hours correctly', () => {
      const now = Date.now();
      expect(formatRelativeTime(now - 2 * 60 * 60 * 1000)).toBe('2h ago');
      expect(formatRelativeTime(now - 12 * 60 * 60 * 1000)).toBe('12h ago');
    });

    it('should format days correctly', () => {
      const now = Date.now();
      expect(formatRelativeTime(now - 2 * 24 * 60 * 60 * 1000)).toBe('2d ago');
      expect(formatRelativeTime(now - 7 * 24 * 60 * 60 * 1000)).toBe('7d ago');
    });
  });
});

describe('Debounce Function', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should delay execution until after wait time', () => {
    const func = jest.fn();
    const debouncedFunc = debounce(func, 300);

    debouncedFunc();
    expect(func).not.toHaveBeenCalled();

    jest.advanceTimersByTime(299);
    expect(func).not.toHaveBeenCalled();

    jest.advanceTimersByTime(1);
    expect(func).toHaveBeenCalledTimes(1);
  });

  it('should reset timer on subsequent calls', () => {
    const func = jest.fn();
    const debouncedFunc = debounce(func, 300);

    debouncedFunc();
    jest.advanceTimersByTime(200);
    
    debouncedFunc(); // Reset timer
    jest.advanceTimersByTime(200);
    expect(func).not.toHaveBeenCalled();

    jest.advanceTimersByTime(100);
    expect(func).toHaveBeenCalledTimes(1);
  });

  it('should only execute once for multiple rapid calls', () => {
    const func = jest.fn();
    const debouncedFunc = debounce(func, 300);

    debouncedFunc();
    debouncedFunc();
    debouncedFunc();
    debouncedFunc();

    jest.advanceTimersByTime(300);
    expect(func).toHaveBeenCalledTimes(1);
  });

  it('should pass arguments correctly', () => {
    const func = jest.fn();
    const debouncedFunc = debounce(func, 300);

    debouncedFunc('arg1', 'arg2');
    jest.advanceTimersByTime(300);

    expect(func).toHaveBeenCalledWith('arg1', 'arg2');
  });

  it('should use the last set of arguments', () => {
    const func = jest.fn();
    const debouncedFunc = debounce(func, 300);

    debouncedFunc('first');
    jest.advanceTimersByTime(100);
    debouncedFunc('second');
    jest.advanceTimersByTime(300);

    expect(func).toHaveBeenCalledWith('second');
    expect(func).toHaveBeenCalledTimes(1);
  });
});

describe('Throttle Function', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should execute immediately on first call', () => {
    const func = jest.fn();
    const throttledFunc = throttle(func, 100);

    throttledFunc();
    expect(func).toHaveBeenCalledTimes(1);
  });

  it('should limit execution to once per wait period', () => {
    const func = jest.fn();
    const throttledFunc = throttle(func, 100);

    throttledFunc(); // Call 1 - executes
    expect(func).toHaveBeenCalledTimes(1);

    throttledFunc(); // Call 2 - ignored (within 100ms)
    expect(func).toHaveBeenCalledTimes(1);

    jest.advanceTimersByTime(100);
    
    throttledFunc(); // Call 3 - executes (after 100ms)
    expect(func).toHaveBeenCalledTimes(2);
  });

  it('should ignore multiple calls within throttle period', () => {
    const func = jest.fn();
    const throttledFunc = throttle(func, 100);

    throttledFunc();
    throttledFunc();
    throttledFunc();
    throttledFunc();

    expect(func).toHaveBeenCalledTimes(1);

    jest.advanceTimersByTime(100);
    throttledFunc();

    expect(func).toHaveBeenCalledTimes(2);
  });

  it('should pass arguments correctly', () => {
    const func = jest.fn();
    const throttledFunc = throttle(func, 100);

    throttledFunc('arg1', 'arg2');
    expect(func).toHaveBeenCalledWith('arg1', 'arg2');
  });

  it('should respect throttle rate with time-based calls', () => {
    const func = jest.fn();
    const throttledFunc = throttle(func, 100);

    // First call executes immediately
    throttledFunc();
    expect(func).toHaveBeenCalledTimes(1);

    // Calls within 100ms are ignored
    jest.advanceTimersByTime(50);
    throttledFunc();
    expect(func).toHaveBeenCalledTimes(1);

    // After 100ms, next call executes
    jest.advanceTimersByTime(50);
    throttledFunc();
    expect(func).toHaveBeenCalledTimes(2);

    // Another 100ms later
    jest.advanceTimersByTime(100);
    throttledFunc();
    expect(func).toHaveBeenCalledTimes(3);
  });
});

