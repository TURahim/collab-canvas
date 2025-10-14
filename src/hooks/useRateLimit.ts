/**
 * Rate Limiting Hook
 * 
 * Enforces a limit of 10 AI commands per hour per user
 * Uses localStorage for persistence across sessions
 */

import { useState, useEffect, useCallback } from 'react';
import type { RateLimitState } from '@/types/ai';

/**
 * Rate limit configuration
 */
const RATE_LIMIT_CONFIG = {
  maxCommands: 10,
  windowMs: 60 * 60 * 1000, // 1 hour in milliseconds
  storageKey: 'ai_rate_limit',
};

/**
 * Rate limit data stored in localStorage
 */
interface RateLimitData {
  count: number;
  resetTime: number;
}

/**
 * Get rate limit data from localStorage
 */
function getRateLimitData(): RateLimitData {
  if (typeof window === 'undefined') {
    return {
      count: 0,
      resetTime: Date.now() + RATE_LIMIT_CONFIG.windowMs,
    };
  }

  try {
    const stored = localStorage.getItem(RATE_LIMIT_CONFIG.storageKey);
    if (!stored) {
      return {
        count: 0,
        resetTime: Date.now() + RATE_LIMIT_CONFIG.windowMs,
      };
    }

    const data: RateLimitData = JSON.parse(stored);
    
    // Check if the window has expired
    if (Date.now() >= data.resetTime) {
      return {
        count: 0,
        resetTime: Date.now() + RATE_LIMIT_CONFIG.windowMs,
      };
    }

    return data;
  } catch (error) {
    console.error('Error reading rate limit data:', error);
    return {
      count: 0,
      resetTime: Date.now() + RATE_LIMIT_CONFIG.windowMs,
    };
  }
}

/**
 * Save rate limit data to localStorage
 */
function saveRateLimitData(data: RateLimitData): void {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    localStorage.setItem(RATE_LIMIT_CONFIG.storageKey, JSON.stringify(data));
  } catch (error) {
    console.error('Error saving rate limit data:', error);
  }
}

/**
 * Calculate rate limit state from data
 */
function calculateState(data: RateLimitData): RateLimitState {
  const remaining = Math.max(0, RATE_LIMIT_CONFIG.maxCommands - data.count);
  const isBlocked = data.count >= RATE_LIMIT_CONFIG.maxCommands;

  return {
    count: data.count,
    resetTime: data.resetTime,
    remaining,
    isBlocked,
  };
}

/**
 * Hook for managing AI command rate limiting
 * 
 * Enforces a limit of 10 commands per hour per user.
 * Persists state to localStorage and automatically resets after 1 hour.
 * 
 * @returns Rate limit state and increment function
 */
export function useRateLimit() {
  const [state, setState] = useState<RateLimitState>(() => {
    const data = getRateLimitData();
    return calculateState(data);
  });

  /**
   * Check and update rate limit on mount and periodically
   */
  useEffect(() => {
    // Update state from storage
    const updateState = () => {
      const data = getRateLimitData();
      setState(calculateState(data));
    };

    // Check immediately
    updateState();

    // Set up interval to check for reset
    const interval = setInterval(updateState, 1000); // Check every second

    // Listen for storage changes (cross-tab synchronization)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === RATE_LIMIT_CONFIG.storageKey) {
        updateState();
      }
    };

    window.addEventListener('storage', handleStorageChange);

    return () => {
      clearInterval(interval);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  /**
   * Increment the command count
   * 
   * @returns true if increment was successful, false if rate limit reached
   */
  const incrementCount = useCallback((): boolean => {
    const data = getRateLimitData();

    // Check if rate limit is reached
    if (data.count >= RATE_LIMIT_CONFIG.maxCommands) {
      return false;
    }

    // Increment count
    const newData: RateLimitData = {
      count: data.count + 1,
      resetTime: data.resetTime,
    };

    saveRateLimitData(newData);
    setState(calculateState(newData));

    return true;
  }, []);

  /**
   * Reset the rate limit (for testing purposes)
   */
  const resetLimit = useCallback((): void => {
    const newData: RateLimitData = {
      count: 0,
      resetTime: Date.now() + RATE_LIMIT_CONFIG.windowMs,
    };

    saveRateLimitData(newData);
    setState(calculateState(newData));
  }, []);

  /**
   * Get time until reset in human-readable format
   */
  const getTimeUntilReset = useCallback((): string => {
    const now = Date.now();
    const diff = state.resetTime - now;

    if (diff <= 0) {
      return '0 minutes';
    }

    const minutes = Math.ceil(diff / (60 * 1000));
    
    if (minutes < 60) {
      return `${minutes} minute${minutes === 1 ? '' : 's'}`;
    }

    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;

    if (remainingMinutes === 0) {
      return `${hours} hour${hours === 1 ? '' : 's'}`;
    }

    return `${hours}h ${remainingMinutes}m`;
  }, [state.resetTime]);

  return {
    ...state,
    incrementCount,
    resetLimit,
    getTimeUntilReset,
  };
}

