/**
 * FloatingChat Component
 * 
 * AI chat interface for canvas manipulation
 * Integrates with OpenAI API via server-side proxy
 */

'use client';

import React, { useState, useRef, useEffect } from 'react';
import { nanoid } from 'nanoid';
import type { Editor } from '@tldraw/tldraw';
import type { Message } from '@/types/ai';
import { ChatMessage } from './ChatMessage';
import { useRateLimit } from '@/hooks/useRateLimit';
import { executeAICommand, parseAIError } from '@/lib/aiService';
import { createShape, createTextShape, moveShape, transformShape } from '@/lib/canvasTools';

interface FloatingChatProps {
  editor: Editor | null;
}

/**
 * FloatingChat component
 */
export function FloatingChat({ editor }: FloatingChatProps) {
  // State
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Rate limiting
  const rateLimit = useRateLimit();

  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  /**
   * Scroll to bottom of messages
   */
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  /**
   * Auto-scroll when messages change
   */
  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  /**
   * Focus input when chat opens
   */
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  /**
   * Add a message to the chat
   */
  const addMessage = (role: Message['role'], content: string, error = false) => {
    const message: Message = {
      id: nanoid(),
      role,
      content,
      timestamp: Date.now(),
      error,
    };
    setMessages((prev) => [...prev, message]);
  };

  /**
   * Get canvas context for AI
   */
  const getCanvasContext = () => {
    if (!editor) {
      return {
        selectedShapes: 0,
        totalShapes: 0,
        viewportBounds: { x: 0, y: 0, width: 1000, height: 800 },
      };
    }

    const selectedShapes = editor.getSelectedShapes();
    const allShapes = editor.getCurrentPageShapes();
    const viewport = editor.getViewportPageBounds();

    return {
      selectedShapes: selectedShapes.length,
      totalShapes: allShapes.length,
      viewportBounds: {
        x: viewport.x,
        y: viewport.y,
        width: viewport.width,
        height: viewport.height,
      },
    };
  };

  /**
   * Handle sending a message
   */
  const handleSend = async () => {
    const message = input.trim();
    
    // Validate input
    if (!message) return;
    if (message.length > 500) {
      addMessage('error', 'Message is too long. Please keep it under 500 characters.', true);
      return;
    }

    // Check rate limit
    if (rateLimit.isBlocked) {
      addMessage(
        'error',
        `Rate limit reached. You can send ${rateLimit.remaining} more commands. Resets in ${rateLimit.getTimeUntilReset()}.`,
        true
      );
      return;
    }

    // Check if editor is available
    if (!editor) {
      addMessage('error', 'Canvas editor is not ready. Please try again.', true);
      return;
    }

    // Clear input
    setInput('');

    // Add user message
    addMessage('user', message);

    // Set loading state
    setIsLoading(true);

    try {
      // Increment rate limit counter
      const rateLimitSuccess = rateLimit.incrementCount();
      if (!rateLimitSuccess) {
        throw new Error('Rate limit exceeded');
      }

      // Get canvas context
      const canvasContext = getCanvasContext();

      // Call AI API
      const response = await executeAICommand({
        message,
        canvasContext,
      });

      // Add assistant response
      addMessage('assistant', response.message);

      // Execute function call if present
      if (response.functionCall) {
        try {
          const { name, arguments: args } = response.functionCall;
          
          // Execute the appropriate canvas tool function
          switch (name) {
            case 'createShape':
              createShape(editor, {
                shapeType: (args as any).shapeType as 'rectangle' | 'ellipse' | 'triangle' | 'arrow',
                x: (args as any).x as number | undefined,
                y: (args as any).y as number | undefined,
                width: (args as any).width as number | undefined,
                height: (args as any).height as number | undefined,
                color: (args as any).color as string | undefined,
              });
              addMessage('system', `✅ Created ${(args as any).shapeType}${(args as any).color ? ` (${(args as any).color})` : ''}`);
              break;
              
            case 'createTextShape':
              createTextShape(editor, {
                text: (args as any).text as string,
                x: (args as any).x as number | undefined,
                y: (args as any).y as number | undefined,
                fontSize: (args as any).fontSize as number | undefined,
                color: (args as any).color as string | undefined,
              });
              addMessage('system', `✅ Created text: "${(args as any).text}"`);
              break;
              
            case 'moveShape':
              {
                const movedIds = moveShape(editor, {
                  target: (args as any).target as string | undefined,
                  x: (args as any).x as number | string | undefined,
                  y: (args as any).y as number | string | undefined,
                });
                const count = movedIds.length;
                const targetDesc = (args as any).target || 'selected';
                const posDesc = `${(args as any).x || 'center'}, ${(args as any).y || 'center'}`;
                addMessage('system', `✅ Moved ${count} shape${count > 1 ? 's' : ''} (${targetDesc}) to ${posDesc}`);
              }
              break;
              
            case 'transformShape':
              {
                const transformedIds = transformShape(editor, {
                  target: (args as any).target as string | undefined,
                  width: (args as any).width as number | undefined,
                  height: (args as any).height as number | undefined,
                  rotation: (args as any).rotation as number | undefined,
                  scale: (args as any).scale as number | undefined,
                });
                const count = transformedIds.length;
                const changes = [];
                if ((args as any).width || (args as any).height) {
                  changes.push(`size: ${(args as any).width || '?'}x${(args as any).height || '?'}`);
                }
                if ((args as any).rotation) {
                  changes.push(`rotation: ${(args as any).rotation}°`);
                }
                if ((args as any).scale) {
                  changes.push(`scale: ${(args as any).scale}x`);
                }
                addMessage('system', `✅ Transformed ${count} shape${count > 1 ? 's' : ''}: ${changes.join(', ')}`);
              }
              break;
              
            default:
              // For commands not yet implemented (PR #15-16)
              addMessage(
                'system',
                `⏳ Command "${name}" recognized but not yet implemented. Coming in next phase!`
              );
          }
        } catch (toolError) {
          console.error('Tool execution error:', toolError);
          addMessage('error', `Failed to execute command: ${toolError instanceof Error ? toolError.message : 'Unknown error'}`, true);
        }
      }

    } catch (error) {
      console.error('AI command error:', error);
      const errorMessage = parseAIError(error);
      addMessage('error', errorMessage, true);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Handle Enter key press
   */
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  /**
   * Clear chat history
   */
  const clearHistory = () => {
    setMessages([]);
  };

  /**
   * Toggle chat open/closed
   */
  const toggleChat = () => {
    setIsOpen(!isOpen);
  };

  /**
   * Handle Escape key to close
   */
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };

    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen]);

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {/* Chat Panel */}
      {isOpen && (
        <div className="mb-4 w-[400px] h-[300px] bg-white rounded-2xl shadow-2xl flex flex-col border border-gray-200 animate-slide-up">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-gradient-to-r from-blue-500 to-blue-600">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
              <h3 className="font-semibold text-white">Flippy</h3>
            </div>
            <div className="flex items-center gap-2">
              {messages.length > 0 && (
                <button
                  onClick={clearHistory}
                  className="text-white/80 hover:text-white text-xs px-2 py-1 rounded hover:bg-white/10 transition-colors"
                  title="Clear history"
                >
                  Clear
                </button>
              )}
              <button
                onClick={toggleChat}
                className="text-white hover:text-white/80 transition-colors"
                title="Close chat"
              >
                ✕
              </button>
            </div>
          </div>

          {/* Rate Limit Counter */}
          <div className={`px-4 py-2 text-xs border-b ${
            rateLimit.remaining <= 2 ? 'bg-orange-50 text-orange-800 border-orange-200' : 'bg-gray-50 text-gray-600 border-gray-200'
          }`}>
            <div className="flex items-center justify-between">
              <span>
                {rateLimit.remaining}/{10} commands remaining
              </span>
              {rateLimit.remaining <= 2 && (
                <span className="font-semibold">
                  ⚠️ Resets in {rateLimit.getTimeUntilReset()}
                </span>
              )}
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full text-center text-gray-500">
                <div className="text-4xl mb-4">🥞</div>
                <p className="text-sm font-medium mb-2">Flippy</p>
                <p className="text-xs max-w-[280px]">
                  It looks like you can&apos;t even draw a box with AI. Would you like help?
                </p>
                <div className="mt-4 text-xs text-gray-400">
                  <p className="mb-1">Try saying:</p>
                  <p>&quot;Create a red rectangle&quot;</p>
                  <p>&quot;Make a 3x3 grid of circles&quot;</p>
                </div>
              </div>
            )}
            
            {messages.map((message) => (
              <ChatMessage key={message.id} message={message} />
            ))}

            {/* Loading indicator */}
            {isLoading && (
              <div className="flex justify-start mb-3">
                <div className="bg-gray-100 rounded-lg px-4 py-3 rounded-bl-none">
                  <div className="flex items-center gap-2 text-gray-600">
                    <div className="flex gap-1">
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                    </div>
                    <span className="text-xs">AI is thinking...</span>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input Section */}
          <div className="border-t border-gray-200 p-4 bg-gray-50">
            <div className="flex gap-2">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={rateLimit.isBlocked ? 'Rate limit reached...' : 'Ask AI to create or modify shapes...'}
                disabled={isLoading || rateLimit.isBlocked}
                maxLength={500}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed text-sm"
              />
              <button
                onClick={handleSend}
                disabled={isLoading || !input.trim() || rateLimit.isBlocked}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors font-medium text-sm"
              >
                {isLoading ? '...' : 'Send'}
              </button>
            </div>
            <div className="text-xs text-gray-500 mt-2">
              {input.length}/500 characters · Press Enter to send
            </div>
          </div>
        </div>
      )}

      {/* Toggle Button */}
      <button
        onClick={toggleChat}
        className={`w-14 h-14 rounded-full shadow-lg flex items-center justify-center text-white text-2xl transition-all hover:scale-110 ${
          isOpen ? 'bg-gray-500 hover:bg-gray-600' : 'bg-blue-500 hover:bg-blue-600'
        }`}
        title={isOpen ? 'Close Flippy' : 'Open Flippy'}
      >
        {isOpen ? '✕' : '🥞'}
      </button>
    </div>
  );
}

