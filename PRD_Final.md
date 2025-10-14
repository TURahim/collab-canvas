# CollabCanvas - AI Canvas Agent Implementation PRD

## Project Overview
Extend the existing CollabCanvas MVP with an AI-powered canvas agent that enables users to create and manipulate shapes through natural language commands. The AI agent uses GPT-4 with function calling to translate user intent into tldraw canvas operations.

**Foundation:** Built on top of completed MVP with real-time cursor sync, shape persistence, and multi-user collaboration.

**Goal:** Implement 8 distinct canvas manipulation commands across 4 categories (creation, manipulation, layout, complex) with < 2 second response time for single-step operations.

## Tech Stack Additions

**AI Integration:** OpenAI GPT-4 (gpt-4) with function calling  
**API Client:** OpenAI Node.js SDK (latest)  
**UI Component:** Floating chat widget (React + Tailwind)  
**Rate Limiting:** Client-side tracking in React state  
**Command History:** Session-based in React state (cleared on refresh)

### Why This Stack

**GPT-4 with Function Calling:**
- Reliable natural language understanding
- Built-in function schema support
- Handles complex multi-step commands
- Cost: ~$0.03 per request (30 tokens input + 200 tokens output)

**Floating Chat Widget:**
- Non-intrusive to canvas workspace
- Familiar chat interface pattern
- Easy toggle on/off
- Mobile-friendly design

**Session-Based History:**
- Simplest implementation (no database)
- Sufficient for user context within session
- Reduces scope and complexity
- Easy to upgrade later if needed

**Client-Side Rate Limiting:**
- 10 commands per hour per user
- Prevents API abuse
- Simple localStorage tracking
- Reset timer visible to user

## Core Architecture

```
┌────────────────────────────────────────────────────────┐
│ User Browser                                            │
├────────────────────────────────────────────────────────┤
│ Next.js App                                            │
│ ├─ FloatingChat Component (new)                       │
│ │  ├─ Message history (React state)                   │
│ │  ├─ Input & send button                             │
│ │  └─ Loading/error states                            │
│ ├─ AI Service Layer (new)                             │
│ │  ├─ OpenAI API client                               │
│ │  ├─ Function calling schema                         │
│ │  ├─ Rate limiter                                    │
│ │  └─ Tool execution engine                           │
│ ├─ Canvas Tool Functions (new)                        │
│ │  ├─ createShape()                                   │
│ │  ├─ manipulateShape()                               │
│ │  ├─ arrangeShapes()                                 │
│ │  └─ createLayout()                                  │
│ ├─ tldraw Component (existing)                        │
│ ├─ Firebase Realtime DB (existing - cursors)          │
│ └─ Cloud Firestore (existing - shapes)                │
└────────────┬───────────────────────────────────────────┘
             │
             ├──────────────┐
             │              │
             ▼              ▼
┌─────────────────────┐  ┌──────────────┐
│ OpenAI API          │  │ Firebase     │
│ - GPT-4             │  │ - Realtime   │
│ - Function Calling  │  │ - Firestore  │
└─────────────────────┘  └──────────────┘
```

### Data Flow

**AI Command Execution:**
1. User types command in chat widget → "Create a red rectangle in the center"
2. FloatingChat sends to OpenAI API with function schemas
3. GPT-4 returns function call: `createShape({ type: "rectangle", color: "red", position: "center" })`
4. Tool execution engine calls canvas tool function
5. Canvas tool uses tldraw editor API to create shape
6. Shape syncs to Firestore via existing MVP sync system
7. All users see new shape in real-time
8. AI response shows confirmation in chat

**Multi-User Coordination:**
- AI-generated shapes are treated identically to user-created shapes
- Sync happens through existing Firestore infrastructure
- No special attribution or handling needed
- Multiple users can use AI simultaneously (subject to individual rate limits)

## Core Features

### 1. AI Chat Widget (P0)

**UI Components:**
- Toggle button (bottom-right, floating)
- Chat panel (300px wide, slides in from right)
- Message history (scrollable, session-only)
- Input field with send button
- Loading indicator during API calls
- Error messages with retry option
- Rate limit display (X/10 commands remaining)

**Implementation:**
```typescript
interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  error?: boolean;
}

export function FloatingChat({ editor }: { editor: Editor | null }) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSend = async () => {
    if (!editor || !input.trim()) return;
    
    setMessages(prev => [...prev, {
      id: nanoid(),
      role: 'user',
      content: input,
      timestamp: new Date()
    }]);
    
    setIsLoading(true);
    try {
      const result = await executeAICommand(input, editor);
      setMessages(prev => [...prev, result]);
    } catch (error) {
      setMessages(prev => [...prev, {
        id: nanoid(),
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.',
        timestamp: new Date(),
        error: true
      }]);
    } finally {
      setIsLoading(false);
      setInput('');
    }
  };

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {!isOpen ? (
        <button onClick={() => setIsOpen(true)} className="...">
          AI Assistant
        </button>
      ) : (
        <div className="w-80 h-96 bg-white rounded-lg shadow-xl">
          {/* Message history */}
          {/* Input field */}
          {/* Rate limit display */}
        </div>
      )}
    </div>
  );
}
```

**Acceptance Criteria:**
- Chat widget toggles open/closed smoothly
- Message history displays user and AI messages
- Loading state shown during API calls
- Error messages displayed with retry option
- Rate limit counter updates correctly
- Session history cleared on page refresh

### 2. OpenAI Integration Layer (P0)

**Configuration:**
```typescript
// lib/openai.ts
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.NEXT_PUBLIC_OPENAI_API_KEY,
  dangerouslyAllowBrowser: true // For client-side usage
});

const CANVAS_TOOLS: OpenAI.Chat.ChatCompletionTool[] = [
  {
    type: 'function',
    function: {
      name: 'createShape',
      description: 'Create a new shape on the canvas',
      parameters: {
        type: 'object',
        properties: {
          shapeType: {
            type: 'string',
            enum: ['rectangle', 'ellipse', 'triangle', 'arrow', 'text'],
            description: 'Type of shape to create'
          },
          x: { type: 'number', description: 'X coordinate (or "center")' },
          y: { type: 'number', description: 'Y coordinate (or "center")' },
          width: { type: 'number', description: 'Width in pixels' },
          height: { type: 'number', description: 'Height in pixels' },
          color: { type: 'string', description: 'Fill color (hex or name)' },
          text: { type: 'string', description: 'Text content if shapeType is text' }
        },
        required: ['shapeType']
      }
    }
  },
  // ... other tool schemas
];
```

**Rate Limiting:**
```typescript
// hooks/useRateLimit.ts
interface RateLimitState {
  count: number;
  resetTime: number;
}

export function useRateLimit() {
  const [state, setState] = useState<RateLimitState>(() => {
    const stored = localStorage.getItem('ai_rate_limit');
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Date.now() < parsed.resetTime) {
        return parsed;
      }
    }
    return { count: 0, resetTime: Date.now() + 3600000 }; // 1 hour
  });

  const canExecute = state.count < 10;
  const remaining = 10 - state.count;

  const incrementCount = () => {
    const newState = {
      ...state,
      count: state.count + 1
    };
    setState(newState);
    localStorage.setItem('ai_rate_limit', JSON.stringify(newState));
  };

  return { canExecute, remaining, incrementCount };
}
```

**API Call Pattern:**
```typescript
export async function executeAICommand(
  userMessage: string,
  editor: Editor
): Promise<Message> {
  try {
    // Get current canvas state for context
    const canvasContext = getCanvasContext(editor);

    const response = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: `You are a canvas assistant. You help users create and manipulate shapes on a canvas. Current canvas state: ${canvasContext}`
        },
        { role: 'user', content: userMessage }
      ],
      tools: CANVAS_TOOLS,
      tool_choice: 'auto'
    });

    const message = response.choices[0].message;

    // If GPT-4 wants to call a tool
    if (message.tool_calls) {
      for (const toolCall of message.tool_calls) {
        const args = JSON.parse(toolCall.function.arguments);
        await executeToolFunction(toolCall.function.name, args, editor);
      }
      return {
        id: nanoid(),
        role: 'assistant',
        content: message.content || 'Done! I created the shapes you requested.',
        timestamp: new Date()
      };
    }

    return {
      id: nanoid(),
      role: 'assistant',
      content: message.content || 'I understand. What would you like me to create?',
      timestamp: new Date()
    };
  } catch (error) {
    console.error('[AI] Error executing command:', error);
    throw error;
  }
}
```

**Acceptance Criteria:**
- OpenAI API calls succeed with proper authentication
- Function calling schema correctly defined
- Rate limiting enforces 10 commands/hour
- Rate limit resets after 1 hour
- Error handling with retries (exponential backoff)
- API responses parsed correctly

### 3. Canvas Tool Functions (P0)

**8 Commands Across 4 Categories:**

#### Creation Commands (2)

**Command 1: Create Basic Shape**
```typescript
// lib/canvasTools.ts
interface CreateShapeArgs {
  shapeType: 'rectangle' | 'ellipse' | 'triangle' | 'arrow';
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  color?: string;
}

async function createShape(args: CreateShapeArgs, editor: Editor): Promise<void> {
  const { shapeType, color = '#4DABF7' } = args;
  
  // Default to center if no position specified
  const viewport = editor.getViewportPageBounds();
  const x = args.x ?? viewport.center.x;
  const y = args.y ?? viewport.center.y;
  const width = args.width ?? 200;
  const height = args.height ?? 150;

  const shapeId = nanoid();
  
  editor.createShape({
    id: shapeId,
    type: shapeType,
    x,
    y,
    props: {
      w: width,
      h: height,
      color,
    }
  });

  // Select the new shape
  editor.setSelectedShapes([shapeId]);
}
```

**Example prompts:**
- "Create a blue rectangle"
- "Add a red circle in the center"
- "Make a green triangle at x=100, y=200"

**Command 2: Create Shape with Text**
```typescript
interface CreateTextShapeArgs {
  text: string;
  x?: number;
  y?: number;
  fontSize?: number;
  color?: string;
}

async function createTextShape(args: CreateTextShapeArgs, editor: Editor): Promise<void> {
  const { text, color = '#000000', fontSize = 24 } = args;
  
  const viewport = editor.getViewportPageBounds();
  const x = args.x ?? viewport.center.x;
  const y = args.y ?? viewport.center.y;

  const shapeId = nanoid();
  
  editor.createShape({
    id: shapeId,
    type: 'text',
    x,
    y,
    props: {
      text,
      color,
      size: fontSize
    }
  });

  editor.setSelectedShapes([shapeId]);
}
```

**Example prompts:**
- "Add text that says 'Hello World'"
- "Create a title 'My Diagram' at the top"
- "Put a label 'Start' on the left side"

#### Manipulation Commands (2)

**Command 3: Move Shape to Position**
```typescript
interface MoveShapeArgs {
  target: 'selected' | 'all' | string; // shape ID
  x?: number | 'center' | 'left' | 'right';
  y?: number | 'top' | 'center' | 'bottom';
}

async function moveShape(args: MoveShapeArgs, editor: Editor): Promise<void> {
  const shapes = getTargetShapes(args.target, editor);
  if (shapes.length === 0) {
    throw new Error('No shapes selected or found');
  }

  const viewport = editor.getViewportPageBounds();
  
  for (const shape of shapes) {
    let newX = shape.x;
    let newY = shape.y;

    if (args.x !== undefined) {
      if (args.x === 'center') newX = viewport.center.x - shape.props.w / 2;
      else if (args.x === 'left') newX = viewport.x + 50;
      else if (args.x === 'right') newX = viewport.maxX - shape.props.w - 50;
      else newX = args.x;
    }

    if (args.y !== undefined) {
      if (args.y === 'center') newY = viewport.center.y - shape.props.h / 2;
      else if (args.y === 'top') newY = viewport.y + 50;
      else if (args.y === 'bottom') newY = viewport.maxY - shape.props.h - 50;
      else newY = args.y;
    }

    editor.updateShape({ ...shape, x: newX, y: newY });
  }
}
```

**Example prompts:**
- "Move selected shape to center"
- "Put it on the left side"
- "Move to x=500, y=300"

**Command 4: Resize and Rotate**
```typescript
interface TransformShapeArgs {
  target: 'selected' | string;
  width?: number;
  height?: number;
  rotation?: number;
  scale?: number;
}

async function transformShape(args: TransformShapeArgs, editor: Editor): Promise<void> {
  const shapes = getTargetShapes(args.target, editor);
  if (shapes.length === 0) {
    throw new Error('No shapes selected');
  }

  for (const shape of shapes) {
    const updates: any = { id: shape.id };

    if (args.width) updates.props = { ...shape.props, w: args.width };
    if (args.height) updates.props = { ...updates.props, h: args.height };
    if (args.rotation !== undefined) updates.rotation = args.rotation * (Math.PI / 180);
    if (args.scale) {
      updates.props = {
        ...updates.props,
        w: shape.props.w * args.scale,
        h: shape.props.h * args.scale
      };
    }

    editor.updateShape({ ...shape, ...updates });
  }
}
```

**Example prompts:**
- "Make it bigger" (scale: 1.5)
- "Rotate 45 degrees"
- "Resize to 300x200"

#### Layout Commands (2)

**Command 5: Arrange in Row/Column**
```typescript
interface ArrangeShapesArgs {
  direction: 'horizontal' | 'vertical';
  spacing?: number;
  alignment?: 'start' | 'center' | 'end';
}

async function arrangeShapes(args: ArrangeShapesArgs, editor: Editor): Promise<void> {
  const shapes = editor.getSelectedShapes();
  if (shapes.length < 2) {
    throw new Error('Select at least 2 shapes to arrange');
  }

  const spacing = args.spacing ?? 50;
  const sorted = [...shapes].sort((a, b) => {
    return args.direction === 'horizontal' ? a.x - b.x : a.y - b.y;
  });

  let currentPos = args.direction === 'horizontal' ? sorted[0].x : sorted[0].y;

  for (const shape of sorted) {
    if (args.direction === 'horizontal') {
      editor.updateShape({ ...shape, x: currentPos });
      currentPos += shape.props.w + spacing;
    } else {
      editor.updateShape({ ...shape, y: currentPos });
      currentPos += shape.props.h + spacing;
    }
  }
}
```

**Example prompts:**
- "Arrange selected shapes in a row"
- "Stack them vertically"
- "Put them in a horizontal line with 100px spacing"

**Command 6: Create Grid**
```typescript
interface CreateGridArgs {
  shapeType: 'rectangle' | 'ellipse';
  rows: number;
  columns: number;
  spacing?: number;
  color?: string;
}

async function createGrid(args: CreateGridArgs, editor: Editor): Promise<void> {
  const { rows, columns, spacing = 50, color = '#4DABF7', shapeType } = args;
  const shapeSize = 100;
  
  const viewport = editor.getViewportPageBounds();
  const totalWidth = columns * shapeSize + (columns - 1) * spacing;
  const totalHeight = rows * shapeSize + (rows - 1) * spacing;
  const startX = viewport.center.x - totalWidth / 2;
  const startY = viewport.center.y - totalHeight / 2;

  const shapeIds: string[] = [];

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < columns; col++) {
      const shapeId = nanoid();
      editor.createShape({
        id: shapeId,
        type: shapeType,
        x: startX + col * (shapeSize + spacing),
        y: startY + row * (shapeSize + spacing),
        props: {
          w: shapeSize,
          h: shapeSize,
          color
        }
      });
      shapeIds.push(shapeId);
    }
  }

  editor.setSelectedShapes(shapeIds);
}
```

**Example prompts:**
- "Create a 3x3 grid of squares"
- "Make a 2x4 grid of circles"
- "Create a grid with 4 rows and 5 columns"

#### Complex Commands (2)

**Command 7: Create Login Form**
```typescript
async function createLoginForm(editor: Editor): Promise<void> {
  const viewport = editor.getViewportPageBounds();
  const centerX = viewport.center.x;
  const centerY = viewport.center.y;

  // Background rectangle
  const bgId = nanoid();
  editor.createShape({
    id: bgId,
    type: 'rectangle',
    x: centerX - 150,
    y: centerY - 150,
    props: { w: 300, h: 300, color: 'light-blue' }
  });

  // Title text
  const titleId = nanoid();
  editor.createShape({
    id: titleId,
    type: 'text',
    x: centerX - 50,
    y: centerY - 120,
    props: { text: 'Login', size: 32 }
  });

  // Username field
  const usernameId = nanoid();
  editor.createShape({
    id: usernameId,
    type: 'rectangle',
    x: centerX - 125,
    y: centerY - 60,
    props: { w: 250, h: 40, color: 'white' }
  });

  // Password field
  const passwordId = nanoid();
  editor.createShape({
    id: passwordId,
    type: 'rectangle',
    x: centerX - 125,
    y: centerY,
    props: { w: 250, h: 40, color: 'white' }
  });

  // Submit button
  const buttonId = nanoid();
  editor.createShape({
    id: buttonId,
    type: 'rectangle',
    x: centerX - 75,
    y: centerY + 60,
    props: { w: 150, h: 40, color: 'blue' }
  });

  editor.setSelectedShapes([bgId, titleId, usernameId, passwordId, buttonId]);
}
```

**Example prompts:**
- "Create a login form"
- "Make a sign-in interface"
- "Build a login screen"

**Command 8: Create Card Layout**
```typescript
interface CreateCardArgs {
  title?: string;
  subtitle?: string;
  color?: string;
}

async function createCard(args: CreateCardArgs, editor: Editor): Promise<void> {
  const { title = 'Card Title', subtitle = 'Card subtitle', color = 'light-gray' } = args;
  const viewport = editor.getViewportPageBounds();
  const centerX = viewport.center.x;
  const centerY = viewport.center.y;

  // Card background
  const cardId = nanoid();
  editor.createShape({
    id: cardId,
    type: 'rectangle',
    x: centerX - 150,
    y: centerY - 100,
    props: { w: 300, h: 200, color }
  });

  // Title
  const titleId = nanoid();
  editor.createShape({
    id: titleId,
    type: 'text',
    x: centerX - 140,
    y: centerY - 80,
    props: { text: title, size: 24 }
  });

  // Subtitle
  const subtitleId = nanoid();
  editor.createShape({
    id: subtitleId,
    type: 'text',
    x: centerX - 140,
    y: centerY - 40,
    props: { text: subtitle, size: 16, color: 'gray' }
  });

  // Content placeholder
  const contentId = nanoid();
  editor.createShape({
    id: contentId,
    type: 'rectangle',
    x: centerX - 140,
    y: centerY,
    props: { w: 280, h: 80, color: 'white' }
  });

  editor.setSelectedShapes([cardId, titleId, subtitleId, contentId]);
}
```

**Example prompts:**
- "Create a card layout"
- "Make a profile card with title 'John Doe'"
- "Build a card component"

**Acceptance Criteria:**
- All 8 commands execute reliably
- Shapes created with correct properties
- Positioning accurate (center, relative, absolute)
- Complex commands create multiple shapes correctly
- All AI-generated shapes sync to other users
- Error handling for invalid inputs

### 4. Multi-User AI Coordination (P0)

**Behavior:**
- Each user has independent AI chat widget
- Rate limiting per user (10/hour each)
- AI-generated shapes sync via existing Firestore infrastructure
- No special attribution for AI shapes vs user shapes
- Multiple users can use AI simultaneously without conflicts

**Implementation:**
- AI shapes use same `createShape()` flow as manual creation
- Firestore sync triggers for all shape changes (AI or manual)
- No additional coordination logic needed
- Existing conflict resolution (last write wins) applies

**Acceptance Criteria:**
- Multiple users can use AI simultaneously
- AI shapes visible to all users in real-time
- No sync conflicts or duplicate shapes
- Rate limiting enforced per user independently

## Critical Implementation Patterns

### Pattern 1: Function Schema Definition
```typescript
const tools: OpenAI.Chat.ChatCompletionTool[] = [
  {
    type: 'function',
    function: {
      name: 'createShape',
      description: 'Create a shape on the canvas',
      parameters: {
        type: 'object',
        properties: {
          shapeType: { 
            type: 'string',
            enum: ['rectangle', 'ellipse', 'triangle'],
            description: 'The type of shape to create'
          },
          // ... other parameters
        },
        required: ['shapeType']
      }
    }
  }
];
```

### Pattern 2: Tool Execution Dispatch
```typescript
async function executeToolFunction(
  name: string,
  args: any,
  editor: Editor
): Promise<void> {
  switch (name) {
    case 'createShape':
      return createShape(args, editor);
    case 'createTextShape':
      return createTextShape(args, editor);
    case 'moveShape':
      return moveShape(args, editor);
    case 'transformShape':
      return transformShape(args, editor);
    case 'arrangeShapes':
      return arrangeShapes(args, editor);
    case 'createGrid':
      return createGrid(args, editor);
    case 'createLoginForm':
      return createLoginForm(editor);
    case 'createCard':
      return createCard(args, editor);
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}
```

### Pattern 3: Canvas Context Gathering
```typescript
function getCanvasContext(editor: Editor): string {
  const shapes = editor.getCurrentPageShapes();
  const selected = editor.getSelectedShapes();
  const viewport = editor.getViewportPageBounds();

  return JSON.stringify({
    shapeCount: shapes.length,
    selectedCount: selected.length,
    selectedTypes: selected.map(s => s.type),
    viewportCenter: { x: viewport.center.x, y: viewport.center.y }
  });
}
```

### Pattern 4: Error Handling with Retries
```typescript
async function callOpenAIWithRetry(
  params: any,
  maxRetries = 3
): Promise<any> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await openai.chat.completions.create(params);
    } catch (error: any) {
      if (attempt === maxRetries) throw error;
      
      // Exponential backoff
      const delay = Math.pow(2, attempt) * 1000;
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}
```

## Implementation Timeline (14-19 hours)

### Phase 1: OpenAI Setup & Chat UI (4-5 hours)
- Install OpenAI SDK and dependencies
- Create API configuration and environment setup
- Build FloatingChat component with basic UI
- Implement message state management
- Add rate limiting hook
- Test basic chat interface

### Phase 2: First 2 Commands (3-4 hours)
- Define function schemas for creation commands
- Implement `createShape` tool function
- Implement `createTextShape` tool function
- Connect OpenAI function calling to tool execution
- Add error handling and validation
- Write unit tests for both commands
- Test in browser with multiple prompts

### Phase 3: Commands 3-6 (3-4 hours)
- Implement `moveShape` tool function
- Implement `transformShape` tool function
- Implement `arrangeShapes` tool function
- Implement `createGrid` tool function
- Add helper functions for target selection
- Write unit tests for all commands
- Test layout operations

### Phase 4: Commands 7-8 + Polish (3-4 hours)
- Implement `createLoginForm` complex command
- Implement `createCard` complex command
- Refine AI system prompt for better results
- Polish chat UI styling
- Add loading states and animations
- Improve error messages
- Test multi-user AI usage
- Update documentation

### Phase 5: Testing & Deployment (1-2 hours)
- End-to-end testing of all 8 commands
- Multi-user testing with concurrent AI usage
- Performance testing (<2s single-step, <5s multi-step)
- Rate limiting verification
- Deploy to Vercel with new env vars
- Update README with AI features

## Project Structure

```
collabcanvas/
├── app/
│   ├── canvas/
│   │   └── page.tsx                    # Updated with AI widget
│   ├── components/
│   │   ├── FloatingChat.tsx            # NEW: AI chat interface
│   │   ├── ChatMessage.tsx             # NEW: Message component
│   │   ├── Canvas.tsx                  # Existing
│   │   ├── Cursors.tsx                 # Existing
│   │   └── UserList.tsx                # Existing
│   ├── lib/
│   │   ├── openai.ts                   # NEW: OpenAI client config
│   │   ├── canvasTools.ts              # NEW: All 8 tool functions
│   │   ├── aiService.ts                # NEW: AI command execution
│   │   ├── firebase.ts                 # Existing
│   │   ├── firestoreSync.ts            # Existing
│   │   └── realtimeSync.ts             # Existing
│   ├── hooks/
│   │   ├── useRateLimit.ts             # NEW: Rate limiting hook
│   │   ├── useAuth.ts                  # Existing
│   │   ├── useCursors.ts               # Existing
│   │   └── useShapes.ts                # Existing
│   └── types/
│       ├── ai.ts                       # NEW: AI types
│       └── index.ts                    # Existing
├── .env.local                          # Add NEXT_PUBLIC_OPENAI_API_KEY
└── package.json                        # Add openai, nanoid
```

## Environment Variables

**New Variables:**
```bash
NEXT_PUBLIC_OPENAI_API_KEY=sk-...
```

**Existing Variables:**
- NEXT_PUBLIC_FIREBASE_API_KEY
- NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
- NEXT_PUBLIC_FIREBASE_PROJECT_ID
- NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
- NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
- NEXT_PUBLIC_FIREBASE_APP_ID
- NEXT_PUBLIC_FIREBASE_DATABASE_URL

## Performance Optimization

### Response Time Targets
- **Single-step commands** (create, move, resize): < 2 seconds
- **Multi-step commands** (grid, form, card): < 5 seconds
- **OpenAI API latency:** ~800ms average
- **Canvas operation time:** < 100ms
- **Total (API + execution + sync):** < 2s for simple, < 5s for complex

### Cost Analysis
**OpenAI Costs (GPT-4):**
- Input: ~$0.03 per 1K tokens
- Output: ~$0.06 per 1K tokens
- Average request: ~100 input tokens + 200 output tokens
- Cost per request: ~$0.015
- 10 commands/user/hour × 5 users = 50 commands/hour = $0.75/hour
- Daily (assuming 8 hours active): ~$6/day
- Monthly: ~$180/month

**Budget Management:**
- Rate limit: 10 commands/user/hour
- Maximum 5 concurrent users: 50 commands/hour max
- Monthly cost cap: ~$200
- Far below typical OpenAI free tier ($5 credit)

### Quota Management
- Rate limiting enforced client-side
- LocalStorage tracks per-user usage
- Resets every 60 minutes
- Visual counter in chat widget
- Graceful denial when limit reached

## Testing Strategy

### Unit Tests (High Priority)

**1. Canvas Tool Functions**
```typescript
describe('createShape', () => {
  it('creates rectangle at specified position', () => {
    const mockEditor = createMockEditor();
    createShape({ shapeType: 'rectangle', x: 100, y: 200 }, mockEditor);
    expect(mockEditor.createShape).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'rectangle', x: 100, y: 200 })
    );
  });

  it('defaults to center when no position specified', () => {
    // Test default positioning
  });
});
```

**2. Rate Limiting**
```typescript
describe('useRateLimit', () => {
  it('allows up to 10 commands per hour', () => {
    const { result } = renderHook(() => useRateLimit());
    expect(result.current.remaining).toBe(10);
    
    // Execute 10 commands
    for (let i = 0; i < 10; i++) {
      result.current.incrementCount();
    }
    
    expect(result.current.canExecute).toBe(false);
  });

  it('resets after 1 hour', () => {
    // Test reset logic
  });
});
```

**3. Tool Execution Dispatch**
```typescript
describe('executeToolFunction', () => {
  it('dispatches to correct tool function', async () => {
    const mockEditor = createMockEditor();
    await executeToolFunction('createShape', { shapeType: 'rectangle' }, mockEditor);
    expect(mockEditor.createShape).toHaveBeenCalled();
  });

  it('throws error for unknown tool', async () => {
    await expect(
      executeToolFunction('unknownTool', {}, mockEditor)
    ).rejects.toThrow('Unknown tool');
  });
});
```

### Integration Tests (Critical Paths)

**1. OpenAI Function Calling**
```typescript
describe('OpenAI Integration', () => {
  it('calls OpenAI API with correct parameters', async () => {
    const result = await executeAICommand('Create a red rectangle', mockEditor);
    expect(openai.chat.completions.create).toHaveBeenCalledWith(
      expect.objectContaining({
        model: 'gpt-4',
        tools: expect.any(Array)
      })
    );
  });

  it('executes tool function based on GPT response', async () => {
    // Mock OpenAI to return specific tool call
    // Verify tool function executed
  });
});
```

**2. Multi-User AI Sync**
```typescript
describe('Multi-User AI', () => {
  it('AI-generated shapes sync to other users', async () => {
    // User 1 creates shape via AI
    // Verify User 2 sees the shape
  });
});
```

### Manual Testing Checklist

**Core Functionality:**
- [ ] Chat widget opens and closes smoothly
- [ ] All 8 commands execute correctly
- [ ] Shapes appear in correct positions
- [ ] Complex commands create multiple shapes
- [ ] Rate limiting enforces 10/hour limit
- [ ] Error messages display for invalid commands
- [ ] Loading states show during API calls
- [ ] Multi-user sees AI shapes in real-time

**Performance:**
- [ ] Single-step commands < 2 seconds
- [ ] Multi-step commands < 5 seconds
- [ ] No lag in canvas during AI operations
- [ ] Chat UI remains responsive during loading

**Edge Cases:**
- [ ] Rate limit reached (graceful message)
- [ ] OpenAI API error (retry logic works)
- [ ] Invalid command (helpful error message)
- [ ] Multiple users using AI simultaneously
- [ ] Network interruption during AI call
- [ ] Page refresh clears chat history

## Success Metrics

**Functional Completeness:**
- [ ] 8+ distinct commands working
- [ ] All 4 categories represented (creation, manipulation, layout, complex)
- [ ] Natural language understanding accurate
- [ ] Multi-user coordination working

**Performance:**
- [ ] < 2 second latency for single-step commands
- [ ] < 5 second latency for multi-step commands
- [ ] 5+ concurrent users can use AI
- [ ] Rate limiting enforced correctly

**User Experience:**
- [ ] Chat interface intuitive and responsive
- [ ] Error messages helpful and actionable
- [ ] Loading states clear
- [ ] AI responses conversational

**Integration:**
- [ ] AI shapes sync via existing Firestore
- [ ] No special handling needed for AI shapes
- [ ] Works seamlessly with existing MVP features

## Evaluation Criteria

**AI Integration Quality: 40%**
- OpenAI function calling implementation
- Tool function accuracy and reliability
- Command variety and complexity
- Natural language understanding

**User Experience: 25%**
- Chat interface design and usability
- Error handling and feedback
- Response time and performance
- Multi-user coordination

**Code Quality: 20%**
- Test coverage (unit + integration)
- Error handling and edge cases
- Code organization and patterns
- Documentation quality

**Innovation: 15%**
- Complex command creativity
- AI prompt engineering
- Performance optimization
- Feature polish

## Known Limitations

**Technical:**
- OpenAI API costs (~$180/month for moderate usage)
- Client-side rate limiting (can be bypassed, but acceptable for MVP)
- Session-only chat history (no persistence)
- GPT-4 may occasionally misinterpret commands
- No undo for AI operations (use tldraw's built-in undo)

**Features Not Included:**
- Chat history persistence across sessions
- AI shape attribution or special styling
- Voice input for commands
- AI suggestions based on canvas content
- Collaborative AI (multiple users working with AI together)
- Custom command training or learning

## Security Considerations

**API Key Protection:**
- Client-side OpenAI usage (acceptable for demo, not production)
- Consider server-side proxy for production deployment
- Environment variable for API key
- No API key committed to git

**Rate Limiting:**
- 10 commands/hour per user
- Prevents abuse and cost overruns
- LocalStorage-based (can be cleared, but acceptable)

**Input Validation:**
- Validate all AI command parameters
- Sanitize canvas tool function inputs
- Error handling for malformed OpenAI responses

## Future Enhancements (Post-MVP)

1. **Persistent Chat History:** Save to Firestore for cross-session continuity
2. **AI Suggestions:** Proactive layout and design recommendations
3. **Voice Commands:** Speech-to-text for hands-free canvas manipulation
4. **Collaborative AI:** Multiple users can contribute to same AI conversation
5. **Custom Commands:** User-defined templates and macros
6. **AI Shape Attribution:** Visual indicator for AI-generated shapes
7. **Server-Side Proxy:** Move OpenAI calls to Next.js API routes for security
8. **Advanced Commands:** Image generation, style transfer, auto-layout optimization

## Quick Start

### 1. Install Dependencies
```bash
cd collabcanvas
npm install openai nanoid
```

### 2. Configure OpenAI
1. Get API key from platform.openai.com
2. Add to `.env.local`:
   ```
   NEXT_PUBLIC_OPENAI_API_KEY=sk-...
   ```

### 3. Development
```bash
npm run dev
# Open http://localhost:3000
# Click "AI Assistant" button to open chat
```

### 4. Test Commands
Try these example prompts:
- "Create a blue rectangle in the center"
- "Add text that says 'Hello World'"
- "Move the selected shape to the left"
- "Arrange selected shapes in a row"
- "Create a 3x3 grid of circles"
- "Make a login form"

### 5. Deploy
```bash
vercel --prod
# Add NEXT_PUBLIC_OPENAI_API_KEY in Vercel dashboard
```

## Essential Resources

- [OpenAI Function Calling](https://platform.openai.com/docs/guides/function-calling)
- [OpenAI Node.js SDK](https://github.com/openai/openai-node)
- [tldraw Editor API](https://tldraw.dev/reference/editor/Editor)
- [tldraw Shape Creation](https://tldraw.dev/examples/shapes/creating-shapes)
- [React State Management](https://react.dev/learn/managing-state)

## Final Checklist

**Before You Start:**
- [ ] OpenAI account created
- [ ] API key obtained and added to .env.local
- [ ] OpenAI SDK installed
- [ ] Understand GPT-4 function calling basics
- [ ] Understand tldraw Editor API for shape creation
- [ ] MVP features working (auth, cursors, shapes, sync)

**Implementation Phases:**
- [ ] Phase 1: OpenAI setup + Chat UI (4-5 hours)
- [ ] Phase 2: First 2 commands (3-4 hours)
- [ ] Phase 3: Commands 3-6 (3-4 hours)
- [ ] Phase 4: Commands 7-8 + polish (3-4 hours)
- [ ] Phase 5: Testing & deployment (1-2 hours)

**Ready to build the AI Canvas Agent!** This implementation adds powerful AI capabilities to the existing MVP with clear structure and achievable timeline of 14-19 hours.

