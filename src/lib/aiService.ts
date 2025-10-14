/**
 * Client-side AI Service
 * 
 * Handles communication with the server-side AI API proxy.
 * NEVER calls OpenAI directly - always goes through /api/ai/execute
 */

import type { AICommandRequest, AICommandResponse } from '@/types/ai';

/**
 * Configuration for retry logic
 */
const RETRY_CONFIG = {
  maxRetries: 3,
  initialDelay: 1000, // 1 second
  maxDelay: 5000, // 5 seconds
  backoffMultiplier: 2,
};

/**
 * Exponential backoff delay
 */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Execute an AI command by calling the internal API
 * 
 * @param request - The command request with message and canvas context
 * @returns The AI response with message and optional function call
 * @throws Error if the request fails after retries
 */
export async function executeAICommand(
  request: AICommandRequest
): Promise<AICommandResponse> {
  let lastError: Error | null = null;
  let retryDelay = RETRY_CONFIG.initialDelay;

  // Retry logic with exponential backoff
  for (let attempt = 0; attempt <= RETRY_CONFIG.maxRetries; attempt++) {
    try {
      // Call internal API (not OpenAI directly)
      const response = await fetch('/api/ai/execute', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      // Parse response
      const data = await response.json();

      // Check for error response
      if (!response.ok) {
        throw new Error(data.error || `HTTP error ${response.status}`);
      }

      // Return successful response
      return {
        message: data.message || 'Command executed successfully',
        functionCall: data.functionCall,
      };

    } catch (error) {
      lastError = error instanceof Error ? error : new Error('Unknown error');
      
      // Don't retry on the last attempt
      if (attempt < RETRY_CONFIG.maxRetries) {
        console.warn(
          `AI command attempt ${attempt + 1} failed, retrying in ${retryDelay}ms:`,
          lastError.message
        );
        
        // Wait before retrying
        await delay(retryDelay);
        
        // Increase delay for next retry (exponential backoff)
        retryDelay = Math.min(
          retryDelay * RETRY_CONFIG.backoffMultiplier,
          RETRY_CONFIG.maxDelay
        );
      }
    }
  }

  // All retries failed
  throw new Error(
    `AI command failed after ${RETRY_CONFIG.maxRetries + 1} attempts: ${lastError?.message || 'Unknown error'}`
  );
}

/**
 * Check if the AI API is available
 * 
 * @returns Promise that resolves to true if API is available
 */
export async function checkAPIHealth(): Promise<boolean> {
  try {
    const response = await fetch('/api/ai/execute', {
      method: 'GET',
    });
    
    const data = await response.json();
    return data.status === 'ok' && data.hasApiKey;
  } catch (error) {
    console.error('AI API health check failed:', error);
    return false;
  }
}

/**
 * Parse error messages from API responses
 * 
 * @param error - The error object
 * @returns User-friendly error message
 */
export function parseAIError(error: unknown): string {
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    
    // OpenAI API key not configured
    if (message.includes('api key not configured')) {
      return 'AI service is not configured. Please contact support.';
    }
    
    // Rate limit errors
    if (message.includes('rate limit')) {
      return 'You have reached your command limit. Please wait before trying again.';
    }
    
    // Network errors
    if (message.includes('fetch') || message.includes('network')) {
      return 'Network error. Please check your connection and try again.';
    }
    
    // Timeout errors
    if (message.includes('timeout')) {
      return 'Request timed out. Please try again.';
    }
    
    // Return the original message if no specific match
    return error.message;
  }
  
  return 'An unexpected error occurred. Please try again.';
}

