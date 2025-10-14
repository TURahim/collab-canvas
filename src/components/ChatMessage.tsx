/**
 * ChatMessage Component
 * 
 * Displays individual messages in the AI chat interface
 * Supports user, assistant, system, and error message types
 */

import React from 'react';
import type { Message } from '@/types/ai';

interface ChatMessageProps {
  message: Message;
}

/**
 * Format timestamp to readable time
 */
function formatTime(timestamp: number): string {
  const date = new Date(timestamp);
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  return `${hours}:${minutes}`;
}

/**
 * ChatMessage component
 */
export function ChatMessage({ message }: ChatMessageProps) {
  const { role, content, timestamp, error } = message;

  // Determine styling based on role
  const isUser = role === 'user';
  const isError = role === 'error' || error;
  const isSystem = role === 'system';

  // Base container styles
  const containerClasses = `flex ${isUser ? 'justify-end' : 'justify-start'} mb-3`;

  // Message bubble styles
  const bubbleClasses = `
    max-w-[80%] rounded-lg px-4 py-2 shadow-sm
    ${isUser
      ? 'bg-blue-500 text-white rounded-br-none'
      : isError
      ? 'bg-red-50 text-red-900 border border-red-200 rounded-bl-none'
      : isSystem
      ? 'bg-gray-100 text-gray-700 rounded-bl-none'
      : 'bg-gray-100 text-gray-900 rounded-bl-none'
    }
  `.trim();

  // Time styling
  const timeClasses = `text-xs mt-1 ${
    isUser ? 'text-white/70' : 'text-gray-500'
  }`;

  return (
    <div className={containerClasses}>
      <div className="flex flex-col">
        {/* Message bubble */}
        <div className={bubbleClasses}>
          {/* Role label for non-user messages */}
          {!isUser && (
            <div className="text-xs font-semibold mb-1 opacity-70">
              {isError ? '⚠️ Error' : isSystem ? 'System' : '🥞 Flippy'}
            </div>
          )}
          
          {/* Message content */}
          <div className="text-sm whitespace-pre-wrap break-words">
            {content}
          </div>
          
          {/* Timestamp */}
          <div className={timeClasses}>
            {formatTime(timestamp)}
          </div>
        </div>
      </div>
    </div>
  );
}

