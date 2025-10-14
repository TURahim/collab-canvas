# CollabCanvas - AI Canvas Agent Implementation Task List

## PROJECT STATUS: AI FEATURE IMPLEMENTATION (0%)

**Current Phase:** Planning Complete - Ready to Start Development  
**Foundation:** MVP 100% Complete (Real-time collaboration, cursor sync, shape persistence, authentication)  
**Goal:** Add AI Canvas Agent with 8 commands across 4 categories  
**Timeline:** 14-19 hours across 7 PRs  
**Target Branch:** `dev` → merge to `main` when complete

---

## 🎯 AI IMPLEMENTATION ROADMAP

### PR #11: AI Infrastructure & OpenAI Setup
**Status:** ⏳ NOT STARTED  
**Estimated Time:** 3-4 hours  
**Branch:** `feature/ai-infrastructure`  
**Dependencies:** None (builds on completed MVP)

#### Tasks
- [ ] Install OpenAI SDK and dependencies
  ```bash
  npm install openai nanoid
  npm install -D @types/node
  ```
- [ ] Add OpenAI API key to `.env.local`
  ```
  NEXT_PUBLIC_OPENAI_API_KEY=sk-...
  ```
- [ ] Create OpenAI client configuration (`src/lib/openai.ts`)
  - Initialize OpenAI client
  - Configure model (gpt-4)
  - Set up error handling
- [ ] Define function calling schemas for all 8 commands
  - `createShape` schema
  - `createTextShape` schema
  - `moveShape` schema
  - `transformShape` schema
  - `arrangeShapes` schema
  - `createGrid` schema
  - `createLoginForm` schema
  - `createCard` schema
- [ ] Create rate limiting hook (`src/hooks/useRateLimit.ts`)
  - LocalStorage-based tracking
  - 10 commands per hour per user
  - Reset timer logic
  - Remaining count calculation
- [ ] Create AI service layer (`src/lib/aiService.ts`)
  - `executeAICommand` function
  - OpenAI API call with function calling
  - Retry logic with exponential backoff
  - Error handling and parsing
- [ ] Create AI types (`src/types/ai.ts`)
  - Message interface
  - Tool function types
  - Rate limit state types

#### Testing
- [ ] Unit test: Rate limiting hook
  - Allows 10 commands
  - Blocks 11th command
  - Resets after 1 hour
  - Persists to localStorage
- [ ] Unit test: OpenAI client configuration
  - Initializes with API key
  - Throws error if no API key
- [ ] Integration test: Basic OpenAI API call
  - Successful response
  - Error handling
  - Retry logic

#### Acceptance Criteria
- [ ] OpenAI SDK installed and configured
- [ ] Function schemas defined for all 8 commands
- [ ] Rate limiting enforces 10/hour limit
- [ ] Error handling with retries implemented
- [ ] All tests passing (minimum 6 tests)
- [ ] No API key committed to repository

**Merge to:** `dev`

---

### PR #12: AI Chat Widget UI
**Status:** ⏳ NOT STARTED  
**Estimated Time:** 3-4 hours  
**Branch:** `feature/ai-chat-widget`  
**Dependencies:** PR #11 (AI infrastructure)

#### Tasks
- [ ] Create FloatingChat component (`src/components/FloatingChat.tsx`)
  - Toggle button (bottom-right, fixed position)
  - Chat panel (300px wide, slide-in animation)
  - Message history display
  - Scroll to bottom on new message
  - Auto-scroll behavior
- [ ] Create ChatMessage component (`src/components/ChatMessage.tsx`)
  - User message styling
  - Assistant message styling
  - System message styling
  - Error message styling
  - Timestamp display
- [ ] Implement message state management
  - React state for messages array
  - Message interface (id, role, content, timestamp, error)
  - Add message function
  - Clear history function
- [ ] Create input section
  - Text input field
  - Send button
  - Enter key to send
  - Disabled during loading
  - Character limit (500 chars)
- [ ] Add loading states
  - Spinner during API call
  - Disabled input during loading
  - "AI is thinking..." indicator
- [ ] Add error states
  - Error message display
  - Retry button
  - Clear error on new message
- [ ] Display rate limit counter
  - "X/10 commands remaining"
  - Warning at 2 remaining
  - Block at 0 remaining
  - Show reset timer
- [ ] Style with Tailwind CSS
  - Smooth slide-in/out animation
  - Rounded corners and shadows
  - Responsive design
  - Accessible color contrast
  - Mobile-friendly (collapsible)
- [ ] Integrate with CollabCanvas component
  - Pass editor instance to FloatingChat
  - Add AI widget to canvas page
  - Z-index management

#### Testing
- [ ] Unit test: FloatingChat component
  - Renders toggle button
  - Opens on click
  - Closes on click
  - Displays messages
  - Clears on unmount
- [ ] Unit test: ChatMessage component
  - Renders user messages correctly
  - Renders assistant messages correctly
  - Renders error messages with styling
- [ ] Unit test: Message state management
  - Adds messages to state
  - Maintains message order
  - Handles empty state
- [ ] Integration test: FloatingChat with rate limiter
  - Displays remaining count
  - Disables input when limit reached
  - Shows reset timer

#### Acceptance Criteria
- [ ] Chat widget toggles open/closed smoothly
- [ ] Messages display with correct styling
- [ ] Input field sends messages on Enter or button click
- [ ] Loading states show during API calls
- [ ] Error states display with retry option
- [ ] Rate limit counter updates correctly
- [ ] Mobile responsive design
- [ ] All tests passing (minimum 8 tests)
- [ ] Accessible (keyboard navigation, screen reader friendly)

**Merge to:** `dev`

---

### PR #13: Canvas Tool Functions - Creation Commands
**Status:** ⏳ NOT STARTED  
**Estimated Time:** 2-3 hours  
**Branch:** `feature/ai-creation-commands`  
**Dependencies:** PR #12 (Chat widget)

#### Tasks
- [ ] Create canvas tools module (`src/lib/canvasTools.ts`)
  - Export all tool functions
  - Shared types and interfaces
  - Helper functions
- [ ] Implement `createShape` function
  - Parameters: shapeType, x, y, width, height, color
  - Default to viewport center if no position
  - Default sizes for each shape type
  - Color validation and default
  - Use tldraw editor.createShape()
  - Select created shape
- [ ] Implement `createTextShape` function
  - Parameters: text, x, y, fontSize, color
  - Default to viewport center if no position
  - Default font size: 24px
  - Text validation (max length)
  - Use tldraw text shape
  - Select created shape
- [ ] Add helper function: `getViewportCenter`
  - Get current viewport bounds
  - Calculate center point
  - Return { x, y }
- [ ] Add helper function: `colorNameToHex`
  - Convert color names to hex codes
  - Support: red, blue, green, yellow, etc.
  - Default to provided color if not a name
- [ ] Integrate with AI service
  - Connect createShape to function calling
  - Connect createTextShape to function calling
  - Parse and validate arguments
  - Execute tool functions
- [ ] Add validation and error handling
  - Validate shape type
  - Validate numeric parameters
  - Handle editor null/undefined
  - Throw descriptive errors

#### Testing
- [ ] Unit test: createShape function
  - Creates rectangle at specified position
  - Creates ellipse with correct size
  - Defaults to center when no position
  - Applies correct color
  - Selects created shape
  - Throws error for invalid shape type
- [ ] Unit test: createTextShape function
  - Creates text shape with content
  - Applies correct font size
  - Defaults to center position
  - Validates text length
  - Selects created shape
- [ ] Unit test: Helper functions
  - getViewportCenter returns correct center
  - colorNameToHex converts common colors
- [ ] Integration test: AI command to createShape
  - User message: "Create a red rectangle"
  - OpenAI returns createShape function call
  - Shape appears on canvas
  - Other users see the shape

#### Acceptance Criteria
- [ ] createShape creates all supported shape types
- [ ] createTextShape creates text with correct properties
- [ ] Default positioning works (center)
- [ ] Color names converted to hex codes
- [ ] Shapes sync to other users via existing Firestore
- [ ] All tests passing (minimum 10 tests)
- [ ] Error handling for invalid inputs

**Example Commands:**
- "Create a blue rectangle"
- "Add a red circle in the center"
- "Make a green triangle at x=100, y=200"
- "Add text that says 'Hello World'"
- "Create a title 'My Diagram'"

**Merge to:** `dev`

---

### PR #14: Canvas Tool Functions - Manipulation Commands
**Status:** ⏳ NOT STARTED  
**Estimated Time:** 2-3 hours  
**Branch:** `feature/ai-manipulation-commands`  
**Dependencies:** PR #13 (Creation commands)

#### Tasks
- [ ] Implement `moveShape` function
  - Parameters: target, x, y
  - Support target: "selected", "all", or shape ID
  - Support x/y: number, "center", "left", "right", "top", "bottom"
  - Get target shapes helper
  - Calculate new position based on keywords
  - Use editor.updateShape()
  - Handle no selection error
- [ ] Implement `transformShape` function
  - Parameters: target, width, height, rotation, scale
  - Support target: "selected" or shape ID
  - Apply width/height changes
  - Apply rotation (convert degrees to radians)
  - Apply scale (multiply width/height)
  - Use editor.updateShape()
  - Handle no selection error
- [ ] Add helper function: `getTargetShapes`
  - Parse target parameter
  - Return shape array based on:
    - "selected" → editor.getSelectedShapes()
    - "all" → editor.getCurrentPageShapes()
    - string ID → find shape by ID
  - Throw error if no shapes found
- [ ] Add helper function: `calculatePosition`
  - Parse position keywords
  - Calculate based on viewport bounds
  - Support: center, left, right, top, bottom
  - Return numeric coordinates
- [ ] Integrate with AI service
  - Connect moveShape to function calling
  - Connect transformShape to function calling
  - Parse and validate arguments
  - Execute tool functions
- [ ] Add validation and error handling
  - Validate target parameter
  - Validate numeric values
  - Handle no shapes selected
  - Throw descriptive errors

#### Testing
- [ ] Unit test: moveShape function
  - Moves selected shape to coordinates
  - Moves to "center" keyword
  - Moves to "left" keyword
  - Moves multiple shapes
  - Throws error when no selection
- [ ] Unit test: transformShape function
  - Resizes shape (width/height)
  - Rotates shape (degrees to radians)
  - Scales shape (multiplier)
  - Combines multiple transformations
  - Throws error when no selection
- [ ] Unit test: Helper functions
  - getTargetShapes returns correct shapes
  - getTargetShapes throws error when not found
  - calculatePosition converts keywords to coords
- [ ] Integration test: AI command to moveShape
  - User message: "Move selected shape to center"
  - Shape moves to viewport center
  - Change syncs to other users

#### Acceptance Criteria
- [ ] moveShape moves shapes to coordinates or keywords
- [ ] transformShape resizes, rotates, and scales
- [ ] Position keywords work correctly
- [ ] Target selection ("selected", "all", ID) works
- [ ] Changes sync to other users
- [ ] All tests passing (minimum 10 tests)
- [ ] Error handling for invalid inputs

**Example Commands:**
- "Move selected shape to center"
- "Put it on the left side"
- "Move to x=500, y=300"
- "Make it bigger" (scale: 1.5)
- "Rotate 45 degrees"
- "Resize to 300x200"

**Merge to:** `dev`

---

### PR #15: Canvas Tool Functions - Layout Commands
**Status:** ⏳ NOT STARTED  
**Estimated Time:** 2-3 hours  
**Branch:** `feature/ai-layout-commands`  
**Dependencies:** PR #14 (Manipulation commands)

#### Tasks
- [ ] Implement `arrangeShapes` function
  - Parameters: direction, spacing, alignment
  - direction: "horizontal" or "vertical"
  - spacing: gap between shapes (default: 50px)
  - alignment: "start", "center", "end"
  - Get selected shapes
  - Sort shapes by position
  - Calculate new positions with spacing
  - Apply alignment offset
  - Use editor.updateShape() for each
  - Require at least 2 shapes
- [ ] Implement `createGrid` function
  - Parameters: shapeType, rows, columns, spacing, color
  - Calculate grid dimensions
  - Calculate starting position (centered in viewport)
  - Loop through rows and columns
  - Create shape at each grid position
  - Apply spacing between shapes
  - Select all created shapes
  - Support rectangle and ellipse types
- [ ] Add helper function: `calculateGridLayout`
  - Input: rows, columns, shapeSize, spacing
  - Output: array of { x, y } positions
  - Center grid in viewport
  - Calculate total width/height
- [ ] Add helper function: `sortShapesByPosition`
  - Sort by x for horizontal
  - Sort by y for vertical
  - Return sorted array
- [ ] Integrate with AI service
  - Connect arrangeShapes to function calling
  - Connect createGrid to function calling
  - Parse and validate arguments
  - Execute tool functions
- [ ] Add validation and error handling
  - Validate direction parameter
  - Validate row/column counts (1-20)
  - Require at least 2 shapes for arrange
  - Throw descriptive errors

#### Testing
- [ ] Unit test: arrangeShapes function
  - Arranges shapes horizontally with spacing
  - Arranges shapes vertically with spacing
  - Applies correct alignment
  - Requires at least 2 shapes
  - Throws error with < 2 shapes
- [ ] Unit test: createGrid function
  - Creates correct number of shapes (rows × cols)
  - Positions shapes in grid pattern
  - Applies correct spacing
  - Centers grid in viewport
  - Supports rectangle and ellipse
  - Selects all created shapes
- [ ] Unit test: Helper functions
  - calculateGridLayout returns correct positions
  - sortShapesByPosition sorts correctly
- [ ] Integration test: AI command to arrangeShapes
  - User message: "Arrange selected shapes in a row"
  - Shapes align horizontally with spacing
  - Changes sync to other users
- [ ] Integration test: AI command to createGrid
  - User message: "Create a 3x3 grid of circles"
  - 9 circles appear in grid pattern
  - All users see the grid

#### Acceptance Criteria
- [ ] arrangeShapes aligns shapes horizontally or vertically
- [ ] createGrid creates NxM grid of shapes
- [ ] Spacing parameter works correctly
- [ ] Grid is centered in viewport
- [ ] All created shapes sync to other users
- [ ] All tests passing (minimum 10 tests)
- [ ] Error handling for invalid inputs

**Example Commands:**
- "Arrange selected shapes in a row"
- "Stack them vertically"
- "Put them in a horizontal line with 100px spacing"
- "Create a 3x3 grid of squares"
- "Make a 2x4 grid of circles"
- "Create a grid with 4 rows and 5 columns"

**Merge to:** `dev`

---

### PR #16: Canvas Tool Functions - Complex Commands
**Status:** ⏳ NOT STARTED  
**Estimated Time:** 2-3 hours  
**Branch:** `feature/ai-complex-commands`  
**Dependencies:** PR #15 (Layout commands)

#### Tasks
- [ ] Implement `createLoginForm` function
  - No parameters (pre-defined layout)
  - Create 5 shapes:
    1. Background rectangle (300x300, light-blue)
    2. Title text ("Login", size: 32)
    3. Username input (250x40, white)
    4. Password input (250x40, white)
    5. Submit button (150x40, blue)
  - Position all shapes relative to viewport center
  - Use consistent spacing (20px between elements)
  - Select all created shapes
  - Return array of created shape IDs
- [ ] Implement `createCard` function
  - Parameters: title, subtitle, color
  - Create 4 shapes:
    1. Card background (300x200, color param)
    2. Title text (size: 24)
    3. Subtitle text (size: 16, gray)
    4. Content placeholder (280x80, white)
  - Position all shapes relative to viewport center
  - Use consistent padding (20px)
  - Default values: title="Card Title", subtitle="Card subtitle"
  - Select all created shapes
  - Return array of created shape IDs
- [ ] Add helper function: `createMultiShapeLayout`
  - Generic function for complex layouts
  - Takes array of shape definitions
  - Creates all shapes in single transaction
  - Returns created shape IDs
  - Reusable for future complex commands
- [ ] Add helper function: `positionRelativeToCenter`
  - Takes base center point and offset
  - Calculates absolute position
  - Useful for multi-shape layouts
- [ ] Integrate with AI service
  - Connect createLoginForm to function calling
  - Connect createCard to function calling
  - Parse and validate arguments
  - Execute tool functions
- [ ] Add validation and error handling
  - Validate string parameters
  - Validate color parameter
  - Handle editor null/undefined
  - Throw descriptive errors

#### Testing
- [ ] Unit test: createLoginForm function
  - Creates exactly 5 shapes
  - All shapes positioned correctly
  - Background, title, inputs, button present
  - All shapes selected after creation
  - Centers in viewport
- [ ] Unit test: createCard function
  - Creates exactly 4 shapes
  - Card background has correct color
  - Title and subtitle have correct text
  - Content placeholder positioned correctly
  - All shapes selected after creation
  - Default values applied when params missing
- [ ] Unit test: Helper functions
  - createMultiShapeLayout creates all shapes
  - positionRelativeToCenter calculates correctly
- [ ] Integration test: AI command to createLoginForm
  - User message: "Create a login form"
  - 5 shapes appear in login layout
  - All users see the form
- [ ] Integration test: AI command to createCard
  - User message: "Make a card with title 'Profile'"
  - Card layout appears with custom title
  - All users see the card

#### Acceptance Criteria
- [ ] createLoginForm creates full login interface
- [ ] createCard creates card layout with parameters
- [ ] Multi-shape layouts maintain relative positioning
- [ ] All shapes center in viewport
- [ ] Complex commands complete in < 5 seconds
- [ ] All created shapes sync to other users
- [ ] All tests passing (minimum 10 tests)
- [ ] Error handling for invalid inputs

**Example Commands:**
- "Create a login form"
- "Make a sign-in interface"
- "Build a login screen"
- "Create a card layout"
- "Make a profile card with title 'John Doe'"
- "Build a card component"

**Merge to:** `dev`

---

### PR #17: Testing, Polish & Documentation
**Status:** ⏳ NOT STARTED  
**Estimated Time:** 2-3 hours  
**Branch:** `feature/ai-final-polish`  
**Dependencies:** PR #16 (Complex commands)

#### Tasks
- [ ] End-to-end testing
  - Test all 8 commands from chat interface
  - Verify each command creates correct shapes
  - Test with various natural language inputs
  - Test edge cases (no selection, invalid inputs)
  - Test error scenarios (API failure, network loss)
- [ ] Multi-user testing
  - Test concurrent AI usage (2+ users)
  - Verify shapes sync correctly
  - Test rate limiting per user independently
  - Verify no conflicts or race conditions
- [ ] Performance optimization
  - Measure response times for each command
  - Single-step commands < 2 seconds
  - Multi-step commands < 5 seconds
  - Optimize OpenAI prompt for accuracy
  - Reduce unnecessary API calls
- [ ] Rate limit testing
  - Execute 10 commands
  - Verify 11th command blocked
  - Verify reset after 1 hour
  - Test localStorage persistence
  - Test cross-tab behavior
- [ ] Error scenario testing
  - OpenAI API down (retry logic)
  - Network interruption (error message)
  - Invalid API key (helpful error)
  - Rate limit reached (clear message)
  - No shapes selected (descriptive error)
- [ ] UI/UX improvements
  - Smooth animations (slide-in/out)
  - Loading spinner styling
  - Error message colors (red)
  - Success feedback (green)
  - Copy/paste in chat input
  - Keyboard shortcuts (Escape to close)
- [ ] AI system prompt refinement
  - Improve natural language understanding
  - Add examples for each command
  - Clarify ambiguous instructions
  - Test with varied phrasings
- [ ] Update README.md
  - Add "AI Canvas Agent" section
  - Document all 8 commands with examples
  - Add OpenAI API key setup instructions
  - Update feature list
  - Add usage guide
  - Include screenshots/GIFs
- [ ] Update architecture.md
  - Add AI layer to architecture diagram
  - Document OpenAI integration flow
  - Update data flow diagrams
  - Add AI-specific patterns
- [ ] Create AI_COMMANDS.md
  - List all 8 commands
  - Example prompts for each
  - Parameters and options
  - Expected behavior
  - Troubleshooting guide
- [ ] Update .env.local.example
  - Add NEXT_PUBLIC_OPENAI_API_KEY placeholder
  - Document where to get API key
  - Note about costs
- [ ] Final code review
  - Check for commented-out code
  - Remove console.logs
  - Ensure consistent formatting
  - Verify all TypeScript types
  - Check for unused imports

#### Testing Summary
- [ ] Run full test suite
  - All unit tests passing
  - All integration tests passing
  - New test count: 50+ tests (added ~40 for AI)
  - Total test count: 160+ tests (122 MVP + 40 AI)
- [ ] Manual testing checklist
  - All 8 commands tested
  - Multi-user testing complete
  - Performance targets met
  - Rate limiting verified
  - Error handling validated
  - Mobile responsiveness checked

#### Acceptance Criteria
- [ ] All 8 AI commands working reliably
- [ ] Response times meet targets (<2s single, <5s complex)
- [ ] Multi-user AI coordination working
- [ ] Rate limiting enforced correctly
- [ ] Error handling graceful and informative
- [ ] Documentation complete and accurate
- [ ] All tests passing (160+ total)
- [ ] Code clean and production-ready
- [ ] Ready for deployment

**Merge to:** `dev`, then merge `dev` to `main`

---

## 📊 TESTING SUMMARY

### Test Coverage by Module

**AI Infrastructure (PR #11):** 6+ tests
- Rate limiting hook: 3 tests
- OpenAI client: 2 tests
- API integration: 1 test

**Chat Widget (PR #12):** 8+ tests
- FloatingChat component: 4 tests
- ChatMessage component: 2 tests
- Message state: 2 tests

**Creation Commands (PR #13):** 10+ tests
- createShape function: 6 tests
- createTextShape function: 4 tests

**Manipulation Commands (PR #14):** 10+ tests
- moveShape function: 5 tests
- transformShape function: 5 tests

**Layout Commands (PR #15):** 10+ tests
- arrangeShapes function: 5 tests
- createGrid function: 5 tests

**Complex Commands (PR #16):** 10+ tests
- createLoginForm function: 5 tests
- createCard function: 5 tests

**Total New Tests:** ~54 tests  
**Combined with MVP:** 122 (MVP) + 54 (AI) = **176 total passing tests**

### Test Types Breakdown
- Unit tests: ~45 tests (individual functions)
- Integration tests: ~9 tests (AI + canvas + sync)
- End-to-end: Manual testing (all scenarios)

---

## 📈 TIMELINE SUMMARY

### Development Phases

**Phase 1: Infrastructure (PR #11-12)** — 6-8 hours
- OpenAI setup and configuration
- Chat widget UI and state management
- Rate limiting and error handling

**Phase 2: Basic Commands (PR #13-14)** — 4-6 hours
- Creation commands (create shape, create text)
- Manipulation commands (move, transform)
- Integration with tldraw editor

**Phase 3: Advanced Commands (PR #15-16)** — 4-6 hours
- Layout commands (arrange, grid)
- Complex commands (login form, card)
- Multi-shape coordination

**Phase 4: Polish & Testing (PR #17)** — 2-3 hours
- End-to-end testing
- Performance optimization
- Documentation updates
- Final code review

**Total Estimated Time:** 16-23 hours  
**Target Timeline:** 2-3 weeks (assuming part-time work)

### Milestones
- [ ] Milestone 1: OpenAI integration working (PR #11)
- [ ] Milestone 2: Chat UI functional (PR #12)
- [ ] Milestone 3: First command working end-to-end (PR #13)
- [ ] Milestone 4: All 8 commands implemented (PR #16)
- [ ] Milestone 5: Testing complete, ready for deployment (PR #17)

---

## 🎯 PROJECT COMPLETION CHECKLIST

### Core Requirements
- [ ] 8+ distinct AI commands implemented
- [ ] 4 command categories covered (creation, manipulation, layout, complex)
- [ ] Natural language interface working
- [ ] < 2 second latency for single-step commands
- [ ] < 5 second latency for multi-step commands
- [ ] All users see AI-generated shapes in real-time
- [ ] Multi-user AI coordination working
- [ ] Rate limiting enforced (10 commands/hour/user)

### Integration Requirements
- [ ] AI shapes sync via existing Firestore
- [ ] No special handling needed for AI shapes
- [ ] Works seamlessly with cursor tracking
- [ ] Works seamlessly with presence awareness
- [ ] Compatible with all existing MVP features

### Quality Requirements
- [ ] 160+ total tests passing
- [ ] Test coverage > 80% for AI code
- [ ] No TypeScript errors
- [ ] No console warnings
- [ ] Clean code (no commented-out code, no unused imports)
- [ ] Comprehensive documentation

### Deployment Requirements
- [ ] Environment variables documented
- [ ] .env.local.example updated
- [ ] Vercel deployment successful
- [ ] NEXT_PUBLIC_OPENAI_API_KEY configured
- [ ] Multi-user testing on production URL

---

## 🚀 FUTURE ENHANCEMENTS (Post-AI MVP)

### Phase 2 AI Features (Optional)
1. **Persistent Chat History** (2-3 hours)
   - Save to Firestore
   - Load on session start
   - Clear history option

2. **AI Suggestions** (4-5 hours)
   - Analyze canvas content
   - Suggest improvements
   - Proactive layout recommendations

3. **Voice Commands** (3-4 hours)
   - Speech-to-text integration
   - Voice button in chat
   - Hands-free operation

4. **Custom Commands** (3-4 hours)
   - User-defined templates
   - Save command macros
   - Share templates with team

5. **Server-Side Proxy** (2-3 hours)
   - Move OpenAI calls to API routes
   - Secure API key on server
   - Better error handling

6. **AI Shape Attribution** (1-2 hours)
   - Visual indicator for AI shapes
   - "Created by AI" badge
   - Filter by creation method

### Advanced AI Features (Future)
- Multi-modal AI (image understanding, vision)
- Collaborative AI (shared conversation)
- AI-powered auto-layout optimization
- Style transfer and theme application
- Diagram generation from description
- Code-to-diagram conversion

---

## 📝 NOTES & CONVENTIONS

### Git Workflow
- Work in feature branches
- PR titles: "AI: [Feature Name]"
- Commit messages: Descriptive and concise
- Merge strategy: Squash and merge to `dev`
- Final merge: `dev` → `main` after all PRs complete

### Code Conventions
- TypeScript strict mode enabled
- ESLint and Prettier configured
- Function naming: camelCase
- Component naming: PascalCase
- File naming: camelCase for utilities, PascalCase for components
- Exports: Named exports preferred
- Error handling: Always throw descriptive Error objects

### Testing Conventions
- Test file naming: `[filename].test.ts(x)`
- Test descriptions: Clear and specific
- Mock naming: `mock[FunctionName]`
- Arrange-Act-Assert pattern
- One assertion per test (when possible)

### Documentation
- JSDoc comments for all public functions
- README.md kept up-to-date
- Inline comments for complex logic
- Type annotations for all function parameters

---

## 📞 SUPPORT & RESOURCES

### Documentation
- PRD_Final.md (this implementation plan)
- README.md (project overview and setup)
- architecture.md (system design)
- TESTING.md (test strategy)
- AI_COMMANDS.md (command reference - to be created)

### External Resources
- [OpenAI Function Calling Docs](https://platform.openai.com/docs/guides/function-calling)
- [OpenAI Node.js SDK](https://github.com/openai/openai-node)
- [tldraw Editor API](https://tldraw.dev/reference/editor/Editor)
- [tldraw Shape Creation Examples](https://tldraw.dev/examples/shapes/creating-shapes)

### Key Decisions & Rationale
1. **GPT-4 over GPT-3.5:** Better function calling accuracy, worth the cost
2. **Client-side API calls:** Simpler for MVP, can proxy later
3. **Session-only history:** Simplest implementation, sufficient for demo
4. **10 commands/hour rate limit:** Balances cost and usability
5. **8 commands instead of 6:** Provides better variety and showcase

---

## ✅ READY TO START DEVELOPMENT

**Status:** Planning complete, ready to begin PR #11  
**Next Step:** Create branch `feature/ai-infrastructure` and start OpenAI setup  
**Estimated Completion:** 2-3 weeks with part-time work  
**Final Deliverable:** Fully functional AI Canvas Agent with 8 commands, comprehensive testing, and production deployment

---

**Last Updated:** October 14, 2025  
**Document Version:** 1.0  
**Project Phase:** AI Implementation - Not Started

