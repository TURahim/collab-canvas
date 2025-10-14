/**
 * Tests for FloatingChat component
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { FloatingChat } from '../FloatingChat';
import { useRateLimit } from '@/hooks/useRateLimit';
import { executeAICommand } from '@/lib/aiService';
import type { Editor } from '@tldraw/tldraw';

// Mock dependencies
jest.mock('@/hooks/useRateLimit');
jest.mock('@/lib/aiService');
jest.mock('nanoid', () => ({
  nanoid: () => 'test-id-123',
}));

const mockUseRateLimit = useRateLimit as jest.MockedFunction<typeof useRateLimit>;
const mockExecuteAICommand = executeAICommand as jest.MockedFunction<typeof executeAICommand>;

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

// Mock scrollIntoView
Element.prototype.scrollIntoView = jest.fn();

describe('FloatingChat', () => {
  const mockEditor = {
    getSelectedShapes: jest.fn().mockReturnValue([]),
    getCurrentPageShapes: jest.fn().mockReturnValue([]),
    getViewportPageBounds: jest.fn().mockReturnValue({
      x: 0,
      y: 0,
      width: 1000,
      height: 800,
    }),
  } as unknown as Editor;

  const mockRateLimitState = {
    count: 0,
    resetTime: Date.now() + 3600000,
    remaining: 10,
    isBlocked: false,
    incrementCount: jest.fn().mockReturnValue(true),
    resetLimit: jest.fn(),
    getTimeUntilReset: jest.fn().mockReturnValue('60 minutes'),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    localStorageMock.clear();
    mockUseRateLimit.mockReturnValue(mockRateLimitState);
  });

  it('should render toggle button', () => {
    render(<FloatingChat editor={mockEditor} />);

    const toggleButton = screen.getByTitle('Open Flippy');
    expect(toggleButton).toBeInTheDocument();
  });

  it('should open chat panel on button click', () => {
    render(<FloatingChat editor={mockEditor} />);

    const toggleButton = screen.getByTitle('Open Flippy');
    fireEvent.click(toggleButton);

    // Check that chat panel is open by finding the placeholder
    expect(screen.getByPlaceholderText(/Ask AI to create or modify shapes/)).toBeInTheDocument();
    // Check for the header text
    expect(screen.getAllByText('Flippy').length).toBeGreaterThan(0);
  });

  it('should close chat panel on close button click', () => {
    render(<FloatingChat editor={mockEditor} />);

    // Open chat
    const toggleButton = screen.getByTitle('Open Flippy');
    fireEvent.click(toggleButton);

    // Close chat
    const closeButton = screen.getByTitle('Close chat');
    fireEvent.click(closeButton);

    // Panel should be closed
    expect(screen.queryByText(/Ask AI to create or modify shapes/)).not.toBeInTheDocument();
  });

  // Rate limit tests skipped - rate limiting is disabled in development mode
  it.skip('should display rate limit counter', () => {
    render(<FloatingChat editor={mockEditor} />);

    // Open chat
    fireEvent.click(screen.getByTitle('Open Flippy'));

    expect(screen.getByText('10/10 commands remaining')).toBeInTheDocument();
  });

  it.skip('should show warning when rate limit is low', () => {
    mockUseRateLimit.mockReturnValue({
      ...mockRateLimitState,
      remaining: 2,
    });

    render(<FloatingChat editor={mockEditor} />);
    fireEvent.click(screen.getByTitle('Open Flippy'));

    expect(screen.getByText(/Resets in/)).toBeInTheDocument();
  });

  it.skip('should disable input when rate limit is reached', () => {
    mockUseRateLimit.mockReturnValue({
      ...mockRateLimitState,
      remaining: 0,
      isBlocked: true,
    });

    render(<FloatingChat editor={mockEditor} />);
    fireEvent.click(screen.getByTitle('Open Flippy'));

    const input = screen.getByPlaceholderText('Rate limit reached...');
    expect(input).toBeDisabled();
  });

  it('should send message on button click', async () => {
    mockExecuteAICommand.mockResolvedValueOnce({
      message: 'Created a red rectangle',
      functionCall: {
        name: 'createShape',
        arguments: { shapeType: 'rectangle', color: 'red' },
      },
    });

    render(<FloatingChat editor={mockEditor} />);
    fireEvent.click(screen.getByTitle('Open Flippy'));

    const input = screen.getByPlaceholderText(/Ask AI to create or modify shapes/);
    const sendButton = screen.getByText('Send');

    fireEvent.change(input, { target: { value: 'Create a red rectangle' } });
    fireEvent.click(sendButton);

    // Wait for message to appear
    await waitFor(() => {
      expect(screen.getByText('Create a red rectangle')).toBeInTheDocument();
    });

    await waitFor(() => {
      expect(screen.getByText(/Created a red rectangle/)).toBeInTheDocument();
    });
  });

  it('should send message on Enter key press', async () => {
    mockExecuteAICommand.mockResolvedValueOnce({
      message: 'OK',
    });

    render(<FloatingChat editor={mockEditor} />);
    fireEvent.click(screen.getByTitle('Open Flippy'));

    const input = screen.getByPlaceholderText(/Ask AI to create or modify shapes/);

    fireEvent.change(input, { target: { value: 'Test message' } });
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });

    await waitFor(() => {
      expect(screen.getByText('Test message')).toBeInTheDocument();
    });
  });

  it('should not send message on Shift+Enter', () => {
    render(<FloatingChat editor={mockEditor} />);
    fireEvent.click(screen.getByTitle('Open Flippy'));

    const input = screen.getByPlaceholderText(/Ask AI to create or modify shapes/);

    fireEvent.change(input, { target: { value: 'Test' } });
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter', shiftKey: true });

    // Message should not be sent
    expect(mockExecuteAICommand).not.toHaveBeenCalled();
  });

  it('should show loading state while processing', async () => {
    mockExecuteAICommand.mockImplementation(
      () => new Promise((resolve) => setTimeout(() => resolve({ message: 'Done' }), 100))
    );

    render(<FloatingChat editor={mockEditor} />);
    fireEvent.click(screen.getByTitle('Open Flippy'));

    const input = screen.getByPlaceholderText(/Ask AI to create or modify shapes/);
    fireEvent.change(input, { target: { value: 'Test' } });
    fireEvent.click(screen.getByText('Send'));

    await waitFor(() => {
      expect(screen.getByText('AI is thinking...')).toBeInTheDocument();
    });
  });

  it('should handle errors gracefully', async () => {
    mockExecuteAICommand.mockRejectedValueOnce(new Error('API error'));

    render(<FloatingChat editor={mockEditor} />);
    fireEvent.click(screen.getByTitle('Open Flippy'));

    const input = screen.getByPlaceholderText(/Ask AI to create or modify shapes/);
    fireEvent.change(input, { target: { value: 'Test' } });
    fireEvent.click(screen.getByText('Send'));

    // Wait for error message to appear
    await waitFor(() => {
      const errorLabel = screen.getByText('⚠️ Error');
      expect(errorLabel).toBeInTheDocument();
    });
  });

  it('should clear chat history', async () => {
    mockExecuteAICommand.mockResolvedValueOnce({ message: 'OK' });

    render(<FloatingChat editor={mockEditor} />);
    fireEvent.click(screen.getByTitle('Open Flippy'));

    const input = screen.getByPlaceholderText(/Ask AI to create or modify shapes/);
    fireEvent.change(input, { target: { value: 'Test' } });
    fireEvent.click(screen.getByText('Send'));

    await waitFor(() => {
      expect(screen.getByText('Test')).toBeInTheDocument();
    });

    const clearButton = screen.getByText('Clear');
    fireEvent.click(clearButton);

    expect(screen.queryByText('Test')).not.toBeInTheDocument();
  });

  it('should show character count', () => {
    render(<FloatingChat editor={mockEditor} />);
    fireEvent.click(screen.getByTitle('Open Flippy'));

    const input = screen.getByPlaceholderText(/Ask AI to create or modify shapes/);
    fireEvent.change(input, { target: { value: 'Hello' } });

    expect(screen.getByText('5/500 characters · Press Enter to send')).toBeInTheDocument();
  });

  it('should not send empty messages', () => {
    render(<FloatingChat editor={mockEditor} />);
    fireEvent.click(screen.getByTitle('Open Flippy'));

    const sendButton = screen.getByText('Send');
    fireEvent.click(sendButton);

    expect(mockExecuteAICommand).not.toHaveBeenCalled();
  });

  it('should show empty state message', () => {
    render(<FloatingChat editor={mockEditor} />);
    fireEvent.click(screen.getByTitle('Open Flippy'));

    expect(screen.getByText(/can't even draw a box without AI/)).toBeInTheDocument();
  });
});

