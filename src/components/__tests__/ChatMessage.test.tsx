/**
 * Tests for ChatMessage component
 */

import { render, screen } from '@testing-library/react';
import { ChatMessage } from '../ChatMessage';
import type { Message } from '@/types/ai';

describe('ChatMessage', () => {
  const baseMessage: Message = {
    id: '1',
    role: 'user',
    content: 'Test message',
    timestamp: Date.now(),
  };

  it('should render user messages correctly', () => {
    const message: Message = {
      ...baseMessage,
      role: 'user',
      content: 'Hello AI',
    };

    render(<ChatMessage message={message} />);

    expect(screen.getByText('Hello AI')).toBeInTheDocument();
    expect(screen.queryByText('🤖 AI Assistant')).not.toBeInTheDocument();
  });

  it('should render assistant messages correctly', () => {
    const message: Message = {
      ...baseMessage,
      role: 'assistant',
      content: 'Hello user',
    };

    render(<ChatMessage message={message} />);

    expect(screen.getByText('Hello user')).toBeInTheDocument();
    expect(screen.getByText('🤖 AI Assistant')).toBeInTheDocument();
  });

  it('should render error messages with styling', () => {
    const message: Message = {
      ...baseMessage,
      role: 'error',
      content: 'Something went wrong',
      error: true,
    };

    render(<ChatMessage message={message} />);

    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    expect(screen.getByText('⚠️ Error')).toBeInTheDocument();
  });

  it('should render system messages correctly', () => {
    const message: Message = {
      ...baseMessage,
      role: 'system',
      content: 'System notification',
    };

    render(<ChatMessage message={message} />);

    expect(screen.getByText('System notification')).toBeInTheDocument();
    expect(screen.getByText('System')).toBeInTheDocument();
  });

  it('should format timestamps correctly', () => {
    const timestamp = new Date('2024-10-14T15:30:00').getTime();
    const message: Message = {
      ...baseMessage,
      timestamp,
    };

    render(<ChatMessage message={message} />);

    expect(screen.getByText('15:30')).toBeInTheDocument();
  });

  it('should apply correct styling for user messages', () => {
    const message: Message = {
      ...baseMessage,
      role: 'user',
    };

    const { container } = render(<ChatMessage message={message} />);
    const messageContainer = container.firstChild as HTMLElement;

    expect(messageContainer).toHaveClass('flex', 'justify-end');
  });

  it('should apply correct styling for assistant messages', () => {
    const message: Message = {
      ...baseMessage,
      role: 'assistant',
    };

    const { container } = render(<ChatMessage message={message} />);
    const messageContainer = container.firstChild as HTMLElement;

    expect(messageContainer).toHaveClass('flex', 'justify-start');
  });

  it('should handle multiline content', () => {
    const message: Message = {
      ...baseMessage,
      content: 'Line 1\nLine 2\nLine 3',
    };

    render(<ChatMessage message={message} />);

    expect(screen.getByText(/Line 1/)).toBeInTheDocument();
    expect(screen.getByText(/Line 2/)).toBeInTheDocument();
    expect(screen.getByText(/Line 3/)).toBeInTheDocument();
  });
});

