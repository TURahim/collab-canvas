/**
 * CollabCanvas - Utility Functions
 * Color generation, user ID generation, and helper utilities
 */

/**
 * Generate a consistent color from a string (like a user ID)
 * Uses simple hash function to deterministically generate colors
 * @param str - Input string (typically user ID)
 * @returns Hex color string (e.g., "#FF6B6B")
 */
export function generateColorFromString(str: string): string {
  // Simple hash function
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
    hash = hash & hash; // Convert to 32-bit integer
  }

  // Convert to RGB
  const r = (hash & 0xff0000) >> 16;
  const g = (hash & 0x00ff00) >> 8;
  const b = hash & 0x0000ff;

  // Ensure colors are vibrant enough (not too dark/light)
  const adjustedR = Math.max(80, Math.min(220, r));
  const adjustedG = Math.max(80, Math.min(220, g));
  const adjustedB = Math.max(80, Math.min(220, b));

  return `#${adjustedR.toString(16).padStart(2, "0")}${adjustedG.toString(16).padStart(2, "0")}${adjustedB.toString(16).padStart(2, "0")}`;
}

/**
 * Generate a random user color from predefined palette
 * Alternative to generateColorFromString for more curated colors
 * @returns Hex color string
 */
export function generateRandomColor(): string {
  const colors = [
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
  ];

  return colors[Math.floor(Math.random() * colors.length)];
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
 * @param func - Function to debounce
 * @param wait - Wait time in milliseconds
 * @returns Debounced function
 */
export function debounce<T extends (...args: unknown[]) => unknown>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;
  
  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      timeout = null;
      func(...args);
    };
    
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

/**
 * Throttle function - limits execution to once per wait period
 * @param func - Function to throttle
 * @param wait - Wait time in milliseconds
 * @returns Throttled function
 */
export function throttle<T extends (...args: unknown[]) => unknown>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let canRun = true;
  
  return function executedFunction(...args: Parameters<T>) {
    if (canRun) {
      func(...args);
      canRun = false;
      setTimeout(() => {
        canRun = true;
      }, wait);
    }
  };
}

