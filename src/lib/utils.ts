/**
 * CollabCanvas - Utility Functions
 * Color generation, user ID generation, and helper utilities
 */

const MIN_COLOR_VALUE = 80;
const MAX_COLOR_VALUE = 220;

/**
 * Generate a consistent color from a string (like a user ID)
 * Uses simple hash function to deterministically generate colors
 * 
 * @param str - Input string (typically user ID)
 * @returns Hex color string in format "#RRGGBB"
 * 
 * @example
 * generateColorFromString("user123") // "#A5D6E3"
 */
export function generateColorFromString(str: string): string {
  // Simple hash function to generate consistent numeric value
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
    hash = hash & hash; // Convert to 32-bit integer
  }

  // Extract RGB components from hash
  const r = (hash & 0xff0000) >> 16;
  const g = (hash & 0x00ff00) >> 8;
  const b = hash & 0x0000ff;

  // Ensure colors are vibrant enough (not too dark or too light)
  const adjustedR = Math.max(MIN_COLOR_VALUE, Math.min(MAX_COLOR_VALUE, r));
  const adjustedG = Math.max(MIN_COLOR_VALUE, Math.min(MAX_COLOR_VALUE, g));
  const adjustedB = Math.max(MIN_COLOR_VALUE, Math.min(MAX_COLOR_VALUE, b));

  // Convert to hex and pad with zeros
  const hexR = adjustedR.toString(16).padStart(2, "0");
  const hexG = adjustedG.toString(16).padStart(2, "0");
  const hexB = adjustedB.toString(16).padStart(2, "0");

  return `#${hexR}${hexG}${hexB}`;
}

/**
 * Curated color palette for user avatars and cursors
 * All colors are tested for visibility and contrast
 */
const USER_COLOR_PALETTE = [
  "#FF6B6B", // Red
  "#4ECDC4", // Teal
  "#45B7D1", // Blue
  "#FFA07A", // Orange
  "#98D8C8", // Mint
  "#F7DC6F", // Yellow
  "#BB8FCE", // Purple
  "#85C1E2", // Sky Blue
  "#F8B739", // Gold
  "#52B788", // Green
] as const;

/**
 * Generate a random user color from predefined palette
 * Alternative to generateColorFromString for more curated colors
 * 
 * @returns Hex color string from curated palette
 */
export function generateRandomColor(): string {
  const randomIndex = Math.floor(Math.random() * USER_COLOR_PALETTE.length);
  return USER_COLOR_PALETTE[randomIndex];
}

/**
 * Generate a unique user ID
 * Uses timestamp + random string for uniqueness
 * @returns Unique ID string
 */
export function generateUserId(): string {
  const timestamp = Date.now().toString(36);
  const randomStr = Math.random().toString(36).substring(2, 9);
  return `user_${timestamp}_${randomStr}`;
}

/**
 * Validate if a string is a valid hex color
 * @param color - Color string to validate
 * @returns True if valid hex color
 */
export function isValidHexColor(color: string): boolean {
  return /^#[0-9A-F]{6}$/i.test(color);
}

/**
 * Get initials from a display name
 * @param name - Display name
 * @returns Initials (max 2 characters)
 */
export function getInitials(name: string): string {
  if (!name || !name.trim()) return "?";
  
  const parts = name.trim().split(/\s+/).filter(part => part.length > 0);
  
  if (parts.length === 0) return "?";
  
  if (parts.length === 1) {
    return parts[0].substring(0, 2).toUpperCase();
  }
  
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/**
 * Truncate string to max length with ellipsis
 * @param str - String to truncate
 * @param maxLength - Maximum length
 * @returns Truncated string
 */
export function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  if (maxLength <= 3) return str.substring(0, maxLength);
  return str.substring(0, maxLength - 3) + "...";
}

/**
 * Format timestamp to relative time (e.g., "2 minutes ago")
 * @param timestamp - Timestamp in milliseconds
 * @returns Relative time string
 */
export function formatRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  
  if (seconds < 60) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
}

/**
 * Debounce function - delays execution until after wait time has elapsed
 * Useful for shape sync (only sync after user stops making changes)
 * 
 * @param func - Function to debounce
 * @param wait - Wait time in milliseconds
 * @returns Debounced function that delays execution
 * 
 * @example
 * const debouncedSave = debounce(saveToFirebase, 300);
 * // Multiple rapid calls will only execute once after 300ms of inactivity
 */
export function debounce<A extends unknown[]>(
  func: (...args: A) => void,
  wait: number
): (...args: A) => void {
  let timeoutId: NodeJS.Timeout | null = null;
  
  return function debouncedFunction(...args: A): void {
    // Clear any existing timeout
    if (timeoutId !== null) {
      clearTimeout(timeoutId);
    }
    
    // Set new timeout
    timeoutId = setTimeout(() => {
      timeoutId = null;
      func(...args);
    }, wait);
  };
}

/**
 * Throttle function - limits execution to once per wait period
 * Useful for cursor updates (limit to 30Hz = 33ms)
 * 
 * @param func - Function to throttle
 * @param wait - Wait time in milliseconds between executions
 * @returns Throttled function that limits execution rate
 * 
 * @example
 * const throttledUpdate = throttle(updateCursor, 33);
 * // Will execute at most once every 33ms (30Hz)
 */
export function throttle<A extends unknown[]>(
  func: (...args: A) => void,
  wait: number
): (...args: A) => void {
  let isThrottled = false;
  
  return function throttledFunction(...args: A): void {
    if (!isThrottled) {
      func(...args);
      isThrottled = true;
      
      setTimeout(() => {
        isThrottled = false;
      }, wait);
    }
  };
}

/**
 * Retry helper with exponential backoff for transient failures
 * Used to improve reliability of Firebase operations
 * 
 * @param fn - Async function to execute with retry logic
 * @param retries - Maximum number of retry attempts (default: 3)
 * @param baseDelayMs - Initial delay in milliseconds (default: 250ms)
 * @returns Promise that resolves with function result or rejects after all retries
 * @throws Error from last attempt if all retries fail
 * 
 * @example
 * await withRetry(() => writeToFirestore(data), 3, 250);
 * // Retries: 250ms, 500ms, 1000ms delays
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  retries = 3,
  baseDelayMs = 250
): Promise<T> {
  let attemptNumber = 0;
  let lastError: unknown;
  
  while (attemptNumber <= retries) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      
      // If we've exhausted all retries, throw the error
      if (attemptNumber === retries) {
        break;
      }
      
      // Calculate exponential backoff delay: baseDelay * 2^attempt
      const delayMs = baseDelayMs * Math.pow(2, attemptNumber);
      await new Promise((resolve) => setTimeout(resolve, delayMs));
      
      attemptNumber += 1;
    }
  }
  
  // Throw the last error, ensuring it's an Error instance
  throw lastError instanceof Error 
    ? lastError 
    : new Error("Operation failed after retries");
}

