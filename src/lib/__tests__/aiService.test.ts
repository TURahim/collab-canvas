/**
 * Tests for AI Service
 */

import { executeAICommand, checkAPIHealth, parseAIError } from '../aiService';
import type { AICommandRequest } from '@/types/ai';

// Mock fetch
global.fetch = jest.fn();

describe('aiService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockClear();
  });

  describe('executeAICommand', () => {
    const mockRequest: AICommandRequest = {
      message: 'Create a red rectangle',
      canvasContext: {
        selectedShapes: 0,
        totalShapes: 5,
        viewportBounds: {
          x: 0,
          y: 0,
          width: 1000,
          height: 800,
        },
      },
    };

    it('should successfully execute a command', async () => {
      const mockResponse = {
        message: 'Created a red rectangle',
        functionCall: {
          name: 'createShape',
          arguments: {
            shapeType: 'rectangle',
            color: 'red',
          },
        },
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await executeAICommand(mockRequest);

      expect(result).toEqual(mockResponse);
      expect(global.fetch).toHaveBeenCalledWith('/api/ai/execute', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(mockRequest),
      });
    });

    it('should handle error responses', async () => {
      // Mock all retry attempts to fail with the same error
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 500,
        json: async () => ({ error: 'Internal server error' }),
      });

      await expect(executeAICommand(mockRequest)).rejects.toThrow(
        'AI command failed after 4 attempts'
      );
    }, 15000);

    it('should retry on failure', async () => {
      // First two attempts fail, third succeeds
      (global.fetch as jest.Mock)
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            message: 'Success after retry',
            functionCall: null,
          }),
        });

      const result = await executeAICommand(mockRequest);

      expect(result.message).toBe('Success after retry');
      expect(global.fetch).toHaveBeenCalledTimes(3);
    }, 15000); // Increase timeout for retries

    it('should fail after max retries', async () => {
      (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

      await expect(executeAICommand(mockRequest)).rejects.toThrow(
        'AI command failed after 4 attempts'
      );

      // Should try 4 times (initial + 3 retries)
      expect(global.fetch).toHaveBeenCalledTimes(4);
    }, 15000); // Increase timeout for retries

    it('should handle missing API key error', async () => {
      // Mock all retry attempts
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 500,
        json: async () => ({
          error: 'OpenAI API key not configured',
        }),
      });

      await expect(executeAICommand(mockRequest)).rejects.toThrow(
        'AI command failed after 4 attempts'
      );
    }, 15000);

    it('should handle rate limit errors', async () => {
      // Mock all retry attempts
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 429,
        json: async () => ({
          error: 'Rate limit exceeded',
        }),
      });

      await expect(executeAICommand(mockRequest)).rejects.toThrow(
        'AI command failed after 4 attempts'
      );
    }, 15000);
  });

  describe('checkAPIHealth', () => {
    it('should return true when API is healthy', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          status: 'ok',
          hasApiKey: true,
        }),
      });

      const isHealthy = await checkAPIHealth();

      expect(isHealthy).toBe(true);
      expect(global.fetch).toHaveBeenCalledWith('/api/ai/execute', {
        method: 'GET',
      });
    });

    it('should return false when API key is missing', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          status: 'ok',
          hasApiKey: false,
        }),
      });

      const isHealthy = await checkAPIHealth();

      expect(isHealthy).toBe(false);
    });

    it('should return false on fetch error', async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce(
        new Error('Network error')
      );

      const isHealthy = await checkAPIHealth();

      expect(isHealthy).toBe(false);
    });
  });

  describe('parseAIError', () => {
    it('should parse API key error', () => {
      const error = new Error('OpenAI API key not configured');
      const message = parseAIError(error);

      expect(message).toContain('AI service is not configured');
    });

    it('should parse rate limit error', () => {
      const error = new Error('Rate limit exceeded');
      const message = parseAIError(error);

      expect(message).toContain('command limit');
    });

    it('should parse network error', () => {
      const error = new Error('Failed to fetch');
      const message = parseAIError(error);

      expect(message).toContain('Network error');
    });

    it('should parse timeout error', () => {
      const error = new Error('Request timeout');
      const message = parseAIError(error);

      expect(message).toContain('timed out');
    });

    it('should handle unknown errors', () => {
      const error = new Error('Something unexpected happened');
      const message = parseAIError(error);

      expect(message).toBe('Something unexpected happened');
    });

    it('should handle non-Error objects', () => {
      const error = 'String error';
      const message = parseAIError(error);

      expect(message).toContain('unexpected error');
    });
  });
});

