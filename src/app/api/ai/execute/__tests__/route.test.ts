/**
 * Tests for AI Execute API Route
 */

import { POST, GET } from '../route';
import OpenAI from 'openai';

// Mock OpenAI
jest.mock('openai');

// Mock Next.js server components
jest.mock('next/server', () => ({
  NextRequest: class NextRequest {
    constructor(public url: string, public init: any) {}
    async json() {
      return JSON.parse(this.init.body);
    }
  },
  NextResponse: {
    json: (data: any, init?: any) => ({
      json: async () => data,
      status: init?.status || 200,
    }),
  },
}));

const MockedOpenAI = OpenAI as jest.MockedClass<typeof OpenAI>;

// Helper to create a mock NextRequest
function createMockRequest(url: string, body: any) {
  return {
    url,
    method: 'POST',
    json: async () => body,
  } as any;
}

describe('/api/ai/execute', () => {
  let mockCreate: jest.Mock;
  
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock OpenAI chat completions
    mockCreate = jest.fn();
    MockedOpenAI.prototype.chat = {
      completions: {
        create: mockCreate,
      },
    } as any;
  });

  describe('GET', () => {
    it('should return API status', async () => {
      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.status).toBe('ok');
      expect(data.message).toContain('AI Canvas Agent API');
    });

    it('should indicate if API key is present', async () => {
      const originalApiKey = process.env.OPENAI_API_KEY;
      
      // Test with API key
      process.env.OPENAI_API_KEY = 'test-key';
      let response = await GET();
      let data = await response.json();
      expect(data.hasApiKey).toBe(true);

      // Test without API key
      delete process.env.OPENAI_API_KEY;
      response = await GET();
      data = await response.json();
      expect(data.hasApiKey).toBe(false);

      // Restore
      process.env.OPENAI_API_KEY = originalApiKey;
    });
  });

  describe('POST', () => {
    const validRequest = {
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

    it('should return error if API key is not configured', async () => {
      const originalApiKey = process.env.OPENAI_API_KEY;
      delete process.env.OPENAI_API_KEY;

      const request = createMockRequest('http://localhost:3000/api/ai/execute', validRequest);

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toContain('API key not configured');

      // Restore
      process.env.OPENAI_API_KEY = originalApiKey;
    });

    it('should return error for invalid request body', async () => {
      process.env.OPENAI_API_KEY = 'test-key';

      const request = createMockRequest('http://localhost:3000/api/ai/execute', { invalid: 'data' });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('message is required');
    });

    it('should successfully process a command with function call', async () => {
      process.env.OPENAI_API_KEY = 'test-key';

      const mockCompletion = {
        choices: [
          {
            message: {
              role: 'assistant',
              content: 'Creating a red rectangle',
              tool_calls: [
                {
                  id: 'call_123',
                  type: 'function',
                  function: {
                    name: 'createShape',
                    arguments: JSON.stringify({
                      shapeType: 'rectangle',
                      color: 'red',
                    }),
                  },
                },
              ],
            },
          },
        ],
      };

      mockCreate.mockResolvedValueOnce(mockCompletion);

      const request = createMockRequest('http://localhost:3000/api/ai/execute', validRequest);

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.functionCall).toEqual({
        name: 'createShape',
        arguments: {
          shapeType: 'rectangle',
          color: 'red',
        },
      });
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'gpt-4-turbo-preview',
          messages: expect.arrayContaining([
            expect.objectContaining({ role: 'system' }),
            expect.objectContaining({ role: 'user', content: 'Create a red rectangle' }),
          ]),
          tools: expect.any(Array),
          tool_choice: 'required', // Force function calling
        })
      );
    });

    it('should handle OpenAI API errors', async () => {
      process.env.OPENAI_API_KEY = 'test-key';

      const apiError = new OpenAI.APIError(
        503,
        {
          error: {
            message: 'Service unavailable',
            type: 'api_error',
            code: 'service_unavailable',
          },
        },
        'Service unavailable',
        undefined
      );

      mockCreate.mockRejectedValueOnce(apiError);

      const request = createMockRequest('http://localhost:3000/api/ai/execute', validRequest);

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(503);
      expect(data.error).toContain('OpenAI API error');
    });

    it('should handle generic errors', async () => {
      process.env.OPENAI_API_KEY = 'test-key';

      mockCreate.mockRejectedValueOnce(new Error('Unexpected error'));

      const request = createMockRequest('http://localhost:3000/api/ai/execute', validRequest);

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toContain('Failed to execute AI command');
    });

    it('should include canvas context in system prompt', async () => {
      process.env.OPENAI_API_KEY = 'test-key';

      const mockCompletion = {
        choices: [
          {
            message: {
              role: 'assistant',
              content: 'OK',
              tool_calls: null,
            },
          },
        ],
      };

      mockCreate.mockResolvedValueOnce(mockCompletion);

      const request = createMockRequest('http://localhost:3000/api/ai/execute', validRequest);

      await POST(request);

      // Check that the system prompt includes canvas context
      const callArgs = mockCreate.mock.calls[0][0];
      const systemMessage = callArgs.messages[0].content;
      
      expect(systemMessage).toContain('0'); // selectedShapes
      expect(systemMessage).toContain('5'); // totalShapes
    });

    it('should pass all 9 function schemas to OpenAI', async () => {
      process.env.OPENAI_API_KEY = 'test-key';

      const mockCompletion = {
        choices: [
          {
            message: {
              role: 'assistant',
              content: 'OK',
              tool_calls: null,
            },
          },
        ],
      };

      mockCreate.mockResolvedValueOnce(mockCompletion);

      const request = createMockRequest('http://localhost:3000/api/ai/execute', validRequest);

      await POST(request);

      const callArgs = mockCreate.mock.calls[0][0];
      expect(callArgs.tools).toHaveLength(9);
      
      // Verify all 9 command names
      const functionNames = callArgs.tools.map((tool: any) => tool.function.name);
      expect(functionNames).toEqual([
        'createShape',
        'createTextShape',
        'moveShape',
        'transformShape',
        'arrangeShapes',
        'createGrid',
        'createLoginForm',
        'createCard',
        'createNavigationBar',
      ]);
    });
  });
});

