/**
 * AI Canvas Agent Types
 * Defines interfaces for AI-powered canvas manipulation
 */

/**
 * Message roles in the AI chat
 */
export type MessageRole = 'user' | 'assistant' | 'system' | 'error';

/**
 * Chat message interface
 */
export interface Message {
  id: string;
  role: MessageRole;
  content: string;
  timestamp: number;
  error?: boolean;
}

/**
 * Rate limit state
 */
export interface RateLimitState {
  count: number;
  resetTime: number;
  remaining: number;
  isBlocked: boolean;
}

/**
 * Tool function parameter definition for OpenAI function calling
 */
export interface ToolParameter {
  type: string;
  description: string;
  enum?: string[];
  items?: {
    type: string;
  };
}

/**
 * Tool function definition for OpenAI function calling
 */
export interface ToolFunction {
  name: string;
  description: string;
  parameters: {
    type: 'object';
    properties: Record<string, ToolParameter>;
    required: string[];
  };
}

/**
 * OpenAI tool definition
 */
export interface Tool {
  type: 'function';
  function: ToolFunction;
}

/**
 * Execution step for agentic planning
 */
export interface ExecutionStep {
  id: string;
  description: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  result?: unknown;
  error?: string;
}

/**
 * Execution plan for complex commands
 */
export interface ExecutionPlan {
  steps: ExecutionStep[];
  totalSteps: number;
  currentStep: number;
  status: 'planning' | 'executing' | 'completed' | 'failed';
}

/**
 * Verification result for command execution
 */
export interface VerificationResult {
  success: boolean;
  expectedShapeCount?: number;
  actualShapeCount?: number;
  expectedShapeTypes?: string[];
  actualShapeTypes?: string[];
  message: string;
  remediation?: 'retry' | 'cleanup' | 'adjust' | 'none';
}

/**
 * AI command execution request
 */
export interface AICommandRequest {
  message: string;
  canvasContext: {
    selectedShapes: number;
    totalShapes: number;
    viewportBounds: {
      x: number;
      y: number;
      width: number;
      height: number;
    };
  };
}

/**
 * AI command execution response
 */
export interface AICommandResponse {
  message: string;
  functionCall?: {
    name: string;
    arguments: Record<string, unknown>;
  };
  error?: string;
  verification?: VerificationResult;
}

/**
 * Shape creation parameters
 */
export interface CreateShapeParams {
  shapeType: 'rectangle' | 'ellipse' | 'triangle' | 'arrow';
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  color?: string;
}

/**
 * Text shape creation parameters
 */
export interface CreateTextShapeParams {
  text: string;
  x?: number;
  y?: number;
  fontSize?: number;
  color?: string;
}

/**
 * Move shape parameters
 */
export interface MoveShapeParams {
  target: 'selected' | 'all' | string;
  x?: number | 'center' | 'left' | 'right';
  y?: number | 'center' | 'top' | 'bottom';
}

/**
 * Transform shape parameters
 */
export interface TransformShapeParams {
  target: 'selected' | string;
  width?: number;
  height?: number;
  rotation?: number;
  scale?: number;
}

/**
 * Arrange shapes parameters
 */
export interface ArrangeShapesParams {
  direction: 'horizontal' | 'vertical';
  spacing?: number;
  alignment?: 'start' | 'center' | 'end';
}

/**
 * Create grid parameters
 */
export interface CreateGridParams {
  shapeType: 'rectangle' | 'ellipse';
  rows: number;
  columns: number;
  spacing?: number;
  color?: string;
}

/**
 * Create login form parameters
 * (No parameters needed - pre-defined layout)
 */
export type CreateLoginFormParams = Record<string, never>;

/**
 * Create card parameters
 */
export interface CreateCardParams {
  title?: string;
  subtitle?: string;
  color?: string;
}

/**
 * Create navigation bar parameters
 */
export interface CreateNavigationBarParams {
  menuItems?: string[];
  logoText?: string;
  color?: string;
}

