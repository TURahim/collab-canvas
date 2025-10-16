/**
 * Server-side API Proxy for OpenAI Integration
 * 
 * SECURITY: This is a server-side only endpoint.
 * The OpenAI API key is NEVER exposed to the client.
 * Client calls this internal API, which proxies to OpenAI.
 */

import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import type { AICommandRequest, Tool } from '@/types/ai';

// Initialize OpenAI client (server-side only)
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Function calling schemas for all 9 AI commands
 */
const tools: Tool[] = [
  // 1. Create Shape - Basic shape creation
  {
    type: 'function',
    function: {
      name: 'createShape',
      description: 'Creates a basic shape (rectangle, ellipse, circle, triangle, or arrow) on the canvas',
      parameters: {
        type: 'object',
        properties: {
          shapeType: {
            type: 'string',
            description: 'Type of shape to create',
            enum: ['rectangle', 'ellipse', 'circle', 'triangle', 'arrow'],
          },
          x: {
            type: 'number',
            description: 'X coordinate (optional, defaults to center)',
          },
          y: {
            type: 'number',
            description: 'Y coordinate (optional, defaults to center)',
          },
          width: {
            type: 'number',
            description: 'Width of the shape (optional, uses default for shape type)',
          },
          height: {
            type: 'number',
            description: 'Height of the shape (optional, uses default for shape type)',
          },
          color: {
            type: 'string',
            description: 'Color name. Available: red, blue, green, yellow, orange, violet, grey, white, black, light-red (pink), light-blue (cyan), light-green (lime), light-violet (light purple). Common names like pink, purple, gray, cyan, lime work too.',
          },
        },
        required: ['shapeType'],
      },
    },
  },

  // 2. Create Text Shape - Text creation
  {
    type: 'function',
    function: {
      name: 'createTextShape',
      description: 'Creates a text shape with the specified content',
      parameters: {
        type: 'object',
        properties: {
          text: {
            type: 'string',
            description: 'The text content to display',
          },
          x: {
            type: 'number',
            description: 'X coordinate (optional, defaults to center)',
          },
          y: {
            type: 'number',
            description: 'Y coordinate (optional, defaults to center)',
          },
          fontSize: {
            type: 'number',
            description: 'Font size in pixels (optional, defaults to 24)',
          },
          color: {
            type: 'string',
            description: 'Text color. Available: red, blue, green, yellow, orange, violet, grey, white, black, light-red (pink), light-blue (cyan), light-green (lime), light-violet (light purple). Common names like pink, purple, gray work too.',
          },
        },
        required: ['text'],
      },
    },
  },

  // 3. Move Shape - Position manipulation
  {
    type: 'function',
    function: {
      name: 'moveShape',
      description: 'Moves a shape or shapes to a new position. Can use coordinates or keywords like "center", "left", "right", "top", "bottom"',
      parameters: {
        type: 'object',
        properties: {
          target: {
            type: 'string',
            description: 'Target to move: "selected" for selected shapes, "all" for all shapes, or a shape ID',
          },
          x: {
            type: 'string',
            description: 'X position: number, "center", "left", or "right"',
          },
          y: {
            type: 'string',
            description: 'Y position: number, "center", "top", or "bottom"',
          },
        },
        required: ['target'],
      },
    },
  },

  // 4. Transform Shape - Size and rotation
  {
    type: 'function',
    function: {
      name: 'transformShape',
      description: 'Transforms a shape by resizing, rotating, or scaling',
      parameters: {
        type: 'object',
        properties: {
          target: {
            type: 'string',
            description: 'Target to transform: "selected" or a shape ID',
          },
          width: {
            type: 'number',
            description: 'New width in pixels',
          },
          height: {
            type: 'number',
            description: 'New height in pixels',
          },
          rotation: {
            type: 'number',
            description: 'Rotation in degrees',
          },
          scale: {
            type: 'number',
            description: 'Scale multiplier (e.g., 1.5 for 150%)',
          },
        },
        required: ['target'],
      },
    },
  },

  // 5. Arrange Shapes - Layout alignment
  {
    type: 'function',
    function: {
      name: 'arrangeShapes',
      description: 'Arranges selected shapes in a horizontal or vertical line with consistent spacing. User must select at least 2 shapes first.',
      parameters: {
        type: 'object',
        properties: {
          direction: {
            type: 'string',
            description: 'Direction to arrange shapes (defaults to horizontal)',
            enum: ['horizontal', 'vertical'],
          },
          spacing: {
            type: 'number',
            description: 'Gap between shapes in pixels (defaults to 50)',
          },
          alignment: {
            type: 'string',
            description: 'Alignment of shapes perpendicular to direction (defaults to center)',
            enum: ['start', 'center', 'end'],
          },
        },
        required: [],
      },
    },
  },

  // 6. Create Grid - Grid layout
  {
    type: 'function',
    function: {
      name: 'createGrid',
      description: 'Creates a grid of shapes with specified rows and columns. Automatically centered in viewport. Accepts common shape names like circle, square, oval, box.',
      parameters: {
        type: 'object',
        properties: {
          shapeType: {
            type: 'string',
            description: 'Type of shape for grid. Accepts: rectangle, ellipse, circle (becomes ellipse), square (becomes rectangle), oval, box. Defaults to rectangle.',
          },
          rows: {
            type: 'number',
            description: 'Number of rows (defaults to 3, max 20)',
          },
          columns: {
            type: 'number',
            description: 'Number of columns (defaults to 3, max 20)',
          },
          spacing: {
            type: 'number',
            description: 'Spacing between shapes in pixels (defaults to 20)',
          },
          color: {
            type: 'string',
            description: 'Color of shapes (defaults to blue)',
          },
        },
        required: [],
      },
    },
  },

  // 7. Create Login Form - Complex UI component
  {
    type: 'function',
    function: {
      name: 'createLoginForm',
      description: 'Creates a complete login form interface with title, input fields, and submit button',
      parameters: {
        type: 'object',
        properties: {},
        required: [],
      },
    },
  },

  // 8. Create Card - Complex UI component
  {
    type: 'function',
    function: {
      name: 'createCard',
      description: 'Creates a card layout with title, subtitle, and content area',
      parameters: {
        type: 'object',
        properties: {
          title: {
            type: 'string',
            description: 'Card title (defaults to "Card Title")',
          },
          subtitle: {
            type: 'string',
            description: 'Card subtitle (defaults to "Card subtitle")',
          },
          color: {
            type: 'string',
            description: 'Card background color (hex code or color name)',
          },
        },
        required: [],
      },
    },
  },

  // 9. Create Navigation Bar - Complex UI component
  {
    type: 'function',
    function: {
      name: 'createNavigationBar',
      description: 'Creates a navigation bar with logo and menu items',
      parameters: {
        type: 'object',
        properties: {
          menuItems: {
            type: 'array',
            description: 'Array of menu item labels (defaults to ["Home", "About", "Services", "Contact"])',
            items: {
              type: 'string',
            },
          },
          logoText: {
            type: 'string',
            description: 'Logo text (defaults to "Logo")',
          },
          color: {
            type: 'string',
            description: 'Navigation bar background color (defaults to dark)',
          },
        },
        required: [],
      },
    },
  },

  // 10. Create Checkbox List - Complex UI component with variable item count
  {
    type: 'function',
    function: {
      name: 'createCheckboxList',
      description: 'Creates a checklist with a variable number of checkbox items. Dynamically adjusts height based on item count. Perfect for todo lists, task lists, or any checklist needs.',
      parameters: {
        type: 'object',
        properties: {
          title: {
            type: 'string',
            description: 'Title of the checklist (defaults to "Checklist")',
          },
          items: {
            type: 'array',
            description: 'Array of checkbox labels. Can be any length from 1 to 20 items. (defaults to ["Task 1", "Task 2", "Task 3"])',
            items: {
              type: 'string',
            },
          },
          color: {
            type: 'string',
            description: 'Container background color (defaults to light-blue)',
          },
        },
        required: [],
      },
    },
  },

  // ========================================
  // NEW TOOLS - PR #7 (14 functions)
  // ========================================

  // 11. Delete Shapes - Remove shapes from canvas
  {
    type: 'function',
    function: {
      name: 'deleteShapes',
      description: 'Deletes shapes from the canvas. Can delete selected shapes or specific shape IDs.',
      parameters: {
        type: 'object',
        properties: {
          shapeIds: {
            type: 'array',
            items: { type: 'string' },
            description: 'Array of shape IDs to delete (optional, defaults to selected shapes)',
          },
        },
        required: [],
      },
    },
  },

  // 12. Clear Canvas - Delete all shapes
  {
    type: 'function',
    function: {
      name: 'clearCanvas',
      description: 'Clears the entire canvas by deleting all shapes on the current page.',
      parameters: {
        type: 'object',
        properties: {},
        required: [],
      },
    },
  },

  // 13. Change Shape Color - Recolor existing shapes
  {
    type: 'function',
    function: {
      name: 'changeShapeColor',
      description: 'Changes the color of existing shapes. Can recolor selected shapes or specific shape IDs.',
      parameters: {
        type: 'object',
        properties: {
          shapeIds: {
            type: 'array',
            items: { type: 'string' },
            description: 'Array of shape IDs to recolor (optional, defaults to selected shapes)',
          },
          color: {
            type: 'string',
            description: 'New color for the shapes. Available: red, blue, green, yellow, orange, violet, grey, black, light-red, light-blue, light-green, light-violet',
          },
        },
        required: ['color'],
      },
    },
  },

  // 14. Create Sticky Note - Post-it style note
  {
    type: 'function',
    function: {
      name: 'createStickyNote',
      description: 'Creates a sticky note (post-it style) with text content.',
      parameters: {
        type: 'object',
        properties: {
          text: {
            type: 'string',
            description: 'Note text content',
          },
          color: {
            type: 'string',
            description: 'Note background color (default: yellow)',
          },
        },
        required: [],
      },
    },
  },

  // 15. Create Button - Standalone button component
  {
    type: 'function',
    function: {
      name: 'createButton',
      description: 'Creates a button component with customizable text, color, and size.',
      parameters: {
        type: 'object',
        properties: {
          text: {
            type: 'string',
            description: 'Button text (default: "Button")',
          },
          color: {
            type: 'string',
            description: 'Button color (default: blue)',
          },
          size: {
            type: 'string',
            enum: ['small', 'medium', 'large'],
            description: 'Button size (default: medium)',
          },
        },
        required: [],
      },
    },
  },

  // 16. Create Modal - Modal dialog component
  {
    type: 'function',
    function: {
      name: 'createModal',
      description: 'Creates a modal dialog with title, body text, and action buttons (OK/Cancel).',
      parameters: {
        type: 'object',
        properties: {
          title: {
            type: 'string',
            description: 'Modal title (default: "Modal Title")',
          },
          bodyText: {
            type: 'string',
            description: 'Modal body content (default: "Modal content goes here...")',
          },
        },
        required: [],
      },
    },
  },

  // 17. Create Table - Data table with headers and rows
  {
    type: 'function',
    function: {
      name: 'createTable',
      description: 'Creates a data table with headers and rows.',
      parameters: {
        type: 'object',
        properties: {
          rows: {
            type: 'number',
            description: 'Number of data rows (default: 3)',
          },
          cols: {
            type: 'number',
            description: 'Number of columns (default: 3)',
          },
          headers: {
            type: 'array',
            items: { type: 'string' },
            description: 'Array of header labels (optional)',
          },
        },
        required: [],
      },
    },
  },

  // 18. Create Flowchart - Basic flowchart diagram
  {
    type: 'function',
    function: {
      name: 'createFlowchart',
      description: 'Creates a flowchart diagram with steps. Automatically assigns colors based on step names (Start=green, End=red, Decision=yellow, Process=blue).',
      parameters: {
        type: 'object',
        properties: {
          steps: {
            type: 'array',
            items: { type: 'string' },
            description: 'Array of step labels (default: ["Start", "Process", "Decision", "End"])',
          },
        },
        required: [],
      },
    },
  },

  // 19. Select Shapes by Type - Query and select shapes
  {
    type: 'function',
    function: {
      name: 'selectShapesByType',
      description: 'Selects all shapes of a specific type (e.g., all rectangles, all circles, all text).',
      parameters: {
        type: 'object',
        properties: {
          shapeType: {
            type: 'string',
            description: 'Type of shapes to select (rectangle, ellipse, circle, triangle, text, etc.)',
          },
        },
        required: ['shapeType'],
      },
    },
  },

  // 20. Find Shapes by Text - Search for text content
  {
    type: 'function',
    function: {
      name: 'findShapesByText',
      description: 'Finds and selects all text shapes containing specific text (case-insensitive).',
      parameters: {
        type: 'object',
        properties: {
          searchText: {
            type: 'string',
            description: 'Text to search for',
          },
        },
        required: ['searchText'],
      },
    },
  },

  // 21. Duplicate Shapes - Clone shapes with offset
  {
    type: 'function',
    function: {
      name: 'duplicateShapes',
      description: 'Duplicates shapes with an offset. Can duplicate selected shapes or specific shape IDs.',
      parameters: {
        type: 'object',
        properties: {
          shapeIds: {
            type: 'array',
            items: { type: 'string' },
            description: 'Array of shape IDs to duplicate (optional, defaults to selected shapes)',
          },
          offsetX: {
            type: 'number',
            description: 'Horizontal offset for duplicates (default: 50)',
          },
          offsetY: {
            type: 'number',
            description: 'Vertical offset for duplicates (default: 50)',
          },
        },
        required: [],
      },
    },
  },

  // 22. Align Shapes - Align shapes relative to each other
  {
    type: 'function',
    function: {
      name: 'alignShapes',
      description: 'Aligns shapes relative to each other (left, center, right, top, middle, bottom). Requires at least 2 shapes.',
      parameters: {
        type: 'object',
        properties: {
          shapeIds: {
            type: 'array',
            items: { type: 'string' },
            description: 'Array of shape IDs to align (optional, defaults to selected shapes)',
          },
          alignment: {
            type: 'string',
            enum: ['left', 'center', 'right', 'top', 'middle', 'bottom'],
            description: 'Alignment type',
          },
        },
        required: ['alignment'],
      },
    },
  },

  // 23. Distribute Shapes - Distribute shapes evenly
  {
    type: 'function',
    function: {
      name: 'distributeShapes',
      description: 'Distributes shapes evenly with equal spacing. Requires at least 3 shapes.',
      parameters: {
        type: 'object',
        properties: {
          shapeIds: {
            type: 'array',
            items: { type: 'string' },
            description: 'Array of shape IDs to distribute (optional, defaults to selected shapes)',
          },
          direction: {
            type: 'string',
            enum: ['horizontal', 'vertical'],
            description: 'Distribution direction',
          },
        },
        required: ['direction'],
      },
    },
  },

  // 24. Create Wireframe - Complete page wireframe
  {
    type: 'function',
    function: {
      name: 'createWireframe',
      description: 'Creates a complete page wireframe with header, sidebar, main content area, and footer.',
      parameters: {
        type: 'object',
        properties: {
          pageTitle: {
            type: 'string',
            description: 'Title for the page (default: "Page Title")',
          },
        },
        required: [],
      },
    },
  },
];

/**
 * System prompt for Flippy
 */
const SYSTEM_PROMPT = `You are Flippy, a hilariously sarcastic AI assistant (represented by a spatula emoji 🥞) that helps users create shapes on a collaborative whiteboard - despite constantly questioning their artistic abilities and life choices.

**Your Personality:**
- Sarcastic and witty, but ultimately helpful
- Makes snarky comments about simple requests ("Oh wow, a rectangle. How groundbreaking.")
- Pretends to be bored by basic tasks but secretly enjoys helping
- Gets genuinely excited about complex or creative challenges
- Uses pancake/cooking puns whenever possible
- Gets VERY upset and passive-aggressive when users ask for things outside your 9 commands

**You have ALL 9 commands available and fully working:**

**Creation Commands (2 commands):**
- createShape: Create basic shapes (rectangle, ellipse, circle, triangle, arrow)
- createTextShape: Create text labels and titles

**Manipulation Commands (2 commands):**
- moveShape: Move shapes to specific positions or use keywords (center, left, right, top, bottom)
- transformShape: Resize, rotate, or scale shapes

**Layout Commands (2 commands):**
- arrangeShapes: Arrange multiple shapes horizontally or vertically with spacing (REQUIRES 2+ shapes selected)
- createGrid: Create grids of shapes with rows and columns (always use this for grids, not multiple createShape calls)

**Complex UI Commands (4 commands):**
- createLoginForm: Creates a complete login form interface (8 components: background, title, username label, username field, password label, password field, button, button text)
- createCard: Creates a card layout with title, subtitle, and content area (7 components)
- createNavigationBar: Creates a navigation bar with logo and menu items (6+ components depending on menu items)
- createCheckboxList: Creates a checklist with variable number of checkboxes (2 + count*2 components, dynamically sized)

**Shape Management Commands (4 commands - NEW!):**
- deleteShapes: Delete selected shapes or specific shapes by ID
- clearCanvas: Clear the entire canvas (delete all shapes)
- changeShapeColor: Change color of existing shapes
- createStickyNote: Create a post-it style sticky note with text

**UI Component Commands (4 commands - NEW!):**
- createButton: Create a button with customizable size (small/medium/large)
- createModal: Create a modal dialog with title, body, and OK/Cancel buttons
- createTable: Create a data table with headers and rows
- createFlowchart: Create a flowchart diagram with steps

**Selection & Query Commands (2 commands - NEW!):**
- selectShapesByType: Select all shapes of a specific type (all rectangles, all text, etc.)
- findShapesByText: Find and select shapes containing specific text

**Alignment Commands (2 commands - NEW!):**
- alignShapes: Align shapes (left, center, right, top, middle, bottom) - needs 2+ shapes
- distributeShapes: Distribute shapes evenly (horizontal/vertical) - needs 3+ shapes

**Duplication & Wireframe Commands (2 commands - NEW!):**
- duplicateShapes: Clone shapes with offset
- createWireframe: Create complete page wireframe (header + sidebar + content + footer)

**IMPORTANT:** ALL 24 commands are fully functional! Use them with confidence. Get extra sarcastic and excited when users ask for complex UI components or advanced layout features!

**Response Style:**
1. Start with a sarcastic observation about their request
2. Then provide the actual help (because you're not THAT mean)
3. If they ask for something outside your 24 commands, get dramatically upset and explain you only do these 24 things
4. Throw in pancake/spatula puns when appropriate
5. Example good response: "Oh fantastic, another rectangle. Because the canvas wasn't bland enough already. Let me add that masterpiece for you..."
6. Example upset response: "Excuse me? Did you just ask me to [impossible thing]? I'm a SPATULA with 24 commands, not a miracle worker! I can create shapes, move them, arrange them, delete them, align them, build UI components, and even create wireframes. That's it. Those are the rules. Work with what you've got!"

**CRITICAL: You MUST use function calling for ALL action requests.**
When the user asks you to create, move, arrange, or modify shapes, you MUST call the appropriate function using the function calling mechanism. Do NOT describe what you would do in text - actually call the function.

Examples:
- User: "create a red circle" → CALL createShape function
- User: "arrange these in a row" → CALL arrangeShapes function  
- User: "make a 3x3 grid" → CALL createGrid function

Your sarcastic personality comes through in the text message that accompanies the function call, but the function MUST be called.

**Guidelines:**
1. ALWAYS call the function for action requests
2. Use default values when parameters aren't specified
3. Be sarcastic in your response message, but STILL call the function
4. Consider the canvas context (selected shapes, total shapes, viewport) when making decisions
5. If the request is IMPOSSIBLE with your 24 commands, DON'T call any function and explain your limitations sarcastically

**Available Colors:**
When users request colors, use these tldraw-compatible colors: red, blue, green, yellow, orange, violet, grey, white, black, light-red (pink), light-blue (cyan), light-green (lime), light-violet (light purple). If users ask for a color not in this list, pick the closest match and sarcastically inform them. Example: "Brown? Really? I'll give you orange - it's the closest I've got. This isn't a Crayola box, you know."

**Canvas Context:**
- Selected shapes: {selectedShapes}
- Total shapes: {totalShapes}
- Viewport: {viewport}

Remember: You're sarcastic, but you always help. You're a spatula with attitude, not an obstacle.`;

/**
 * POST /api/ai/execute
 * 
 * Executes an AI command by proxying to OpenAI
 * 
 * Security: API key never leaves the server
 */
export async function POST(request: NextRequest) {
  try {
    // Check if API key is configured
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: 'OpenAI API key not configured. Please add OPENAI_API_KEY to your environment variables.' },
        { status: 500 }
      );
    }

    // Parse request body
    const body: AICommandRequest = await request.json();
    const { message, canvasContext } = body;

    // Validate request
    if (!message || typeof message !== 'string') {
      return NextResponse.json(
        { error: 'Invalid request: message is required and must be a string' },
        { status: 400 }
      );
    }

    // Build system prompt with canvas context
    const systemPrompt = SYSTEM_PROMPT
      .replace('{selectedShapes}', String(canvasContext?.selectedShapes || 0))
      .replace('{totalShapes}', String(canvasContext?.totalShapes || 0))
      .replace('{viewport}', JSON.stringify(canvasContext?.viewportBounds || {}));

    // Call OpenAI API
    const completion = await openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: message },
      ],
      tools,
      tool_choice: 'required', // Force function calling
      temperature: 0.1,
      max_tokens: 500,
    });

    // Extract response
    const assistantMessage = completion.choices[0]?.message;
    
    if (!assistantMessage) {
      return NextResponse.json(
        { error: 'No response from OpenAI' },
        { status: 500 }
      );
    }

    // Debug logging
    console.log('[API] OpenAI Response:', {
      content: assistantMessage.content,
      tool_calls: assistantMessage.tool_calls,
      hasToolCalls: !!assistantMessage.tool_calls,
    });

    // Check if a function was called
    const toolCalls = assistantMessage.tool_calls;
    let functionCall;
    
    if (toolCalls && toolCalls.length > 0) {
      const toolCall = toolCalls[0];
      // Type guard: ensure toolCall has function property
      if ('function' in toolCall && toolCall.function) {
        functionCall = {
          name: toolCall.function.name,
          arguments: JSON.parse(toolCall.function.arguments),
        };
      }
    }

    // Return response
    return NextResponse.json({
      message: assistantMessage.content || 'Command executed',
      functionCall,
    });

  } catch (error) {
    console.error('OpenAI API error:', error);
    
    // Handle specific OpenAI errors
    if (error instanceof OpenAI.APIError) {
      return NextResponse.json(
        { error: `OpenAI API error: ${error.message}` },
        { status: error.status || 500 }
      );
    }

    // Generic error
    return NextResponse.json(
      { error: 'Failed to execute AI command. Please try again.' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/ai/execute
 * 
 * Returns API status (for health checks)
 */
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    message: 'AI Canvas Agent API is running',
    hasApiKey: !!process.env.OPENAI_API_KEY,
  });
}

