# FRONTEND MAP - CollabCanvas

**Last Updated:** October 15, 2025  
**Purpose:** Component hierarchy, data flow, and UI structure

---

## 🗺️ Component Tree

```
App Layout (app/layout.tsx)
├─ ErrorBoundary
│  └─ {children}
│
├─ Home Page (app/page.tsx) → Redirects to /rooms
│
├─ Rooms Page (app/rooms/page.tsx) ⭐ NEW
│  ├─ AuthModal (conditional)
│  ├─ LoadingSpinner (while loading rooms)
│  ├─ Room Grid (list of rooms)
│  └─ Create Room Modal (conditional)
│
└─ Room Page (app/room/[roomId]/page.tsx) ⭐ NEW
   └─ CollabCanvas (with roomId prop)
      ├─ AuthModal (conditional)
      ├─ RoomHeader (top bar) ⭐ PR #5
      │  ├─ Back button → /rooms
      │  ├─ Room name
      │  ├─ User count
      │  ├─ Share button
      │  └─ Settings button (owner only)
      ├─ RoomSettings Modal (conditional) ⭐ PR #5
      ├─ tldraw Editor
      ├─ Cursors (overlays)
      ├─ UserList (sidebar)
      ├─ FloatingChat (bottom-right)
      ├─ ExportDialog (conditional) ⭐ PR #6
      ├─ ConnectionStatus (conditional)
      └─ LoadingSpinner (conditional)
```

---

## 📄 Pages (Next.js App Router)

### 1. **Home Page** (`app/page.tsx`) ⭐ UPDATED
**Route:** `/`  
**Purpose:** Entry point that redirects to room list

**Behavior:**
- Immediately redirects to `/rooms`
- Shows loading spinner during redirect

### 2. **Rooms Page** (`app/rooms/page.tsx`) ⭐ NEW - PR #1
**Route:** `/rooms`  
**Purpose:** Room list and creation interface

**Features:**
- Displays grid of accessible rooms (owned + public)
- Create new room modal
- Empty state with CTA
- Room cards show: name, member count, public/private badge, owner badge

**State:**
- `rooms: RoomMetadata[]` - List of rooms from Firestore
- `loading: boolean` - Loading state
- `showCreateModal: boolean` - Create room modal visibility
- `newRoomName: string` - Room name input

**Queries:**
- Collection group query on "metadata" for owned rooms
- Collection group query on "metadata" for public rooms
- Combines and deduplicates results

### 3. **Room Page** (`app/room/[roomId]/page.tsx`) ⭐ NEW - PR #1
**Route:** `/room/[roomId]`  
**Purpose:** Display specific collaborative room

**Features:**
- Validates room ID from URL
- Loads room metadata
- Renders CollabCanvas with room ID
- Error states: Invalid ID, Not Found, Load Failed

**State:**
- `roomId: string | null` - From URL params (via useRoomId)
- `roomMetadata: RoomMetadata | null` - Room info
- `loading: boolean` - Loading state
- `error: string | null` - Error message

---

## 📦 Core Components

### 1. **CollabCanvas.tsx** (Main Container) ⭐ UPDATED - PR #1

**Purpose:** Root component that orchestrates all canvas features

**Props:** ⭐ UPDATED
- `roomId?: string` - Room ID from URL (now REQUIRED for proper multi-room support)

**State:**
- `editor: Editor | null` - tldraw editor instance
- `user: User | null` - Current authenticated user
- `roomId: string` - Current room ID (from props)
- `roomMetadata: RoomMetadata | null` - Room information
- `showSettings: boolean` - Settings modal visibility (PR #5)
- `showExportDialog: boolean` - Export dialog visibility (PR #6)

**Hooks Used:**
- `useAuth()` - Authentication state and user info
- `useCursors(editor, user)` - Real-time cursor tracking
- `useShapes(editor, user, roomId)` - Shape persistence (room-scoped)
- `usePresence(user)` - User presence awareness

**Child Components:**
- AuthModal (if not authenticated)
- Tldraw component (main canvas)
- Cursors component (multiplayer cursors)
- UserList component (online users sidebar)
- FloatingChat component (AI assistant)
- ConnectionStatus (offline indicator)
- LoadingSpinner (during auth)

**Data Flow:**
```
CollabCanvas
├─> useAuth() → user
├─> user → useCursors() → cursor positions
├─> user → useShapes() → shape data
├─> user → usePresence() → online users
└─> editor → FloatingChat (AI commands)
```

**File Location:** `src/components/CollabCanvas.tsx`  
**Size:** ~300 lines

---

### 2. **AuthModal.tsx** (Authentication UI)

**Purpose:** User authentication and name entry

**State:**
- `name: string` - User-entered display name
- `error: string` - Validation errors
- `isLoading: boolean` - Sign-in progress
- `showGoogleSignIn: boolean` - Google Sign-In UI toggle

**Features:**
- Anonymous authentication with display name
- Google Sign-In integration (OAuth flow)
- Name validation (2-30 characters, alphanumeric + spaces)
- Beautiful gradient UI
- Error handling and retry

**Data Flow:**
```
AuthModal
├─> User enters name
├─> Validates input
├─> Calls useAuth.signIn(name)
└─> Closes on successful auth
```

**File Location:** `src/components/AuthModal.tsx`  
**Size:** ~250 lines

---

### 3. **Cursors.tsx** (Multiplayer Cursors)

**Purpose:** Render remote user cursors with names

**Props:**
- `cursors: Record<string, CursorState>` - All user cursors

**Features:**
- Renders SVG cursor for each user
- Shows user name and color
- Smooth cursor movement
- Excludes current user's cursor

**Styling:**
- Position: Absolute overlay on canvas
- Z-index: Above canvas, below UI controls
- Pointer-events: None (click-through)

**Data Flow:**
```
useCursors() → cursors → Cursors component → SVG elements
```

**File Location:** `src/components/Cursors.tsx`  
**Size:** ~150 lines

---

### 4. **UserList.tsx** (Online Users Sidebar)

**Purpose:** Display list of online users with presence indicators

**State:**
- `users: User[]` - List of online users
- `currentUser: User | null` - Current authenticated user

**Features:**
- Real-time user list updates
- Online/offline status indicators (green/grey dot)
- User count badge
- Color-coded user avatars
- Current user highlighted with "You" badge
- Logout button (top of list)
- Auto-scrolling user list

**Styling:**
- Position: Fixed top-right
- Width: 200px
- Height: Auto (max 400px)
- Background: White with shadow
- Z-index: Below tldraw UI menu

**Data Flow:**
```
usePresence() → users → UserList → User cards
```

**File Location:** `src/components/UserList.tsx`  
**Size:** ~200 lines

---

### 5. **FloatingChat.tsx** (AI Assistant)

**Purpose:** Chat interface for AI canvas manipulation

**State:**
- `isOpen: boolean` - Chat panel visibility
- `messages: Message[]` - Chat history (session-only)
- `input: string` - User input text
- `isLoading: boolean` - AI processing state

**Hooks Used:**
- `useRateLimit()` - Command rate limiting (disabled for dev)

**Features:**
- Toggle button (bottom-right, 🥞 icon)
- Chat panel (400px wide, slides in from right)
- Message history (scrollable)
- Input field with send button
- Loading indicator (animated dots)
- Error messages with retry
- Rate limit counter (disabled for dev)
- "Try Flippy!" tooltip when closed
- Clear history button
- Escape key to close

**Message Types:**
- `user` - User commands (blue background, right-aligned)
- `assistant` - AI responses (grey background, left-aligned)
- `system` - Success/error messages (green/red, centered)
- `error` - Error messages (red background, left-aligned)

**Data Flow:**
```
FloatingChat
├─> User types command
├─> Sends to /api/ai/execute
├─> Receives AI response
├─> Executes canvas tool function
└─> Shows success message
```

**AI Command Execution Flow:**
```
1. handleSend() → validate input
2. executeAICommand() → fetch /api/ai/execute
3. Receive response with functionCall
4. Execute switch statement for tool function
5. Tool function modifies editor (creates/moves shapes)
6. Shape sync propagates to all users via Firestore
7. Display success message in chat
```

**File Location:** `src/components/FloatingChat.tsx`  
**Size:** ~560 lines

---

### 6. **ChatMessage.tsx** (Message Display)

**Purpose:** Render individual chat messages

**Props:**
- `message: Message` - Message object to display

**Features:**
- Different styling per role (user, assistant, system, error)
- Timestamp display
- Markdown support (optional)
- Copy button for code blocks (optional)

**File Location:** `src/components/ChatMessage.tsx`  
**Size:** ~94 lines

---

### 7. **ConnectionStatus.tsx** (Offline Indicator)

**Purpose:** Show offline/reconnecting status

**State:**
- `isOnline: boolean` - Network connectivity status

**Features:**
- Only visible when offline
- Animated red banner at top
- "Reconnecting..." message
- Auto-dismisses when online

**File Location:** `src/components/ConnectionStatus.tsx`  
**Size:** ~80 lines

---

### 8. **LoadingSpinner.tsx** (Loading Indicator)

**Purpose:** Reusable loading spinner

**Props:**
- `size?: 'sm' | 'md' | 'lg'` - Spinner size
- `text?: string` - Optional loading text

**Features:**
- Animated spinning circle
- Customizable size
- Optional text label

**File Location:** `src/components/LoadingSpinner.tsx`  
**Size:** ~50 lines

---

### 9. **ErrorBoundary.tsx** (Error Handler)

**Purpose:** Catch and display React errors

**State:**
- `hasError: boolean` - Error occurred
- `error: Error | null` - Error details

**Features:**
- Catches all React component errors
- Displays user-friendly error message
- Reload button to recover
- Logs error to console (dev mode)

**File Location:** `src/components/ErrorBoundary.tsx`  
**Size:** ~120 lines

---

## 🎣 Custom Hooks

### 1. **useAuth.ts**

**Purpose:** Manage user authentication

**Returns:**
```typescript
{
  user: User | null;
  isLoading: boolean;
  error: string | null;
  signIn: (name: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
}
```

**Features:**
- Firebase Anonymous Auth
- Firebase Google Sign-In (OAuth)
- User profile creation in Realtime DB
- Auto-reconnect on page load
- Error handling and retry

**Dependencies:**
- Firebase Auth
- Firebase Realtime DB

**File Location:** `src/hooks/useAuth.ts`  
**Size:** ~250 lines

---

### 2. **useCursors.ts**

**Purpose:** Real-time cursor tracking

**Parameters:**
- `editor: Editor | null` - tldraw editor
- `user: User | null` - Current user

**Returns:**
```typescript
{
  cursors: Record<string, CursorState>;
}
```

**Features:**
- Listens to mouse/pointer events
- Throttles cursor updates (30Hz)
- Syncs to Firebase Realtime DB
- Subscribes to other users' cursors
- Auto-cleanup on unmount

**Update Frequency:** 30Hz (~33ms between updates)

**Dependencies:**
- Firebase Realtime DB
- tldrawHelpers (coordinate conversion)

**File Location:** `src/hooks/useCursors.ts`  
**Size:** ~200 lines

---

### 3. **useShapes.ts**

**Purpose:** Shape persistence and real-time sync

**Parameters:**
- `editor: Editor | null` - tldraw editor
- `user: User | null` - Current user

**Returns:**
- Void (side effects only)

**Features:**
- Listens to editor shape changes
- Debounces shape updates (300ms)
- Syncs to Cloud Firestore
- Subscribes to shape changes from other users
- Prevents sync loops with `isSyncing` flag
- Tracks pending shapes to avoid conflicts

**Update Frequency:** 300ms debounced batches

**Dependencies:**
- Cloud Firestore
- tldrawHelpers (serialization)

**File Location:** `src/hooks/useShapes.ts`  
**Size:** ~300 lines

---

### 4. **usePresence.ts**

**Purpose:** User presence tracking

**Parameters:**
- `user: User | null` - Current user

**Returns:**
```typescript
{
  users: User[];
  onlineCount: number;
}
```

**Features:**
- Subscribes to `/users` in Realtime DB
- Filters users by `online: true`
- Sorts by name
- Excludes current user from list
- Real-time updates when users join/leave

**Dependencies:**
- Firebase Realtime DB

**File Location:** `src/hooks/usePresence.ts`  
**Size:** ~150 lines

---

### 5. **useRateLimit.ts**

**Purpose:** Client-side rate limiting for AI commands

**Returns:**
```typescript
{
  remaining: number;          // Commands remaining
  isBlocked: boolean;         // Over limit
  incrementCount: () => boolean;  // Use a command
  resetCount: () => void;     // Manual reset
  getTimeUntilReset: () => string; // Time string
}
```

**Features:**
- LocalStorage-based tracking
- 10 commands per hour limit
- Auto-reset after 1 hour
- Formatted time until reset

**Status:** **Disabled for development** (see FloatingChat.tsx lines 121-129)

**File Location:** `src/hooks/useRateLimit.ts`  
**Size:** ~76 lines

---

## 🎨 UI Layout

### Desktop Layout (> 768px)

```
┌─────────────────────────────────────────────────────────┐
│ ErrorBoundary (full screen)                             │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ ConnectionStatus (conditional, top banner)          │ │
│ ├─────────────────────────────────────────────────────┤ │
│ │                                                     │ │
│ │                tldraw Canvas                        │ │
│ │                                                     │ │
│ │                                                     │ │
│ │   [Cursors overlay]                                │ │
│ │                                                     │ │
│ │                                                     │ │
│ │                                                     │ │
│ │                                    ┌──────────────┐ │ │
│ │                                    │ UserList     │ │ │
│ │                                    │ [Logout]     │ │ │
│ │                                    │ • User 1     │ │ │
│ │                                    │ • User 2     │ │ │
│ │                                    │ • You        │ │ │
│ │                                    └──────────────┘ │ │
│ │                                                     │ │
│ │                            ┌──────────────────────┐ │ │
│ │                            │ FloatingChat         │ │ │
│ │                            │ [Flippy 🥞]          │ │ │
│ │                            │                      │ │ │
│ │                            │ [Messages]           │ │ │
│ │                            │                      │ │ │
│ │                            │ [Input] [Send]       │ │ │
│ │                            └──────────────────────┘ │ │
│ │                                  or                 │ │
│ │                                  [🥞] (toggle)      │ │
│ └─────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

### Z-Index Stack (Bottom to Top)

```
1. tldraw Canvas (z-index: 0)
2. Cursors overlay (z-index: 10, pointer-events: none)
3. UserList (z-index: 40)
4. FloatingChat (z-index: 50)
5. AuthModal (z-index: 9999, full screen overlay)
6. ErrorBoundary (z-index: 10000, full screen)
```

---

## 🔄 Data Flow Patterns

### 1. **Authentication Flow**

```
User visits page
└─> useAuth() checks localStorage
    ├─> Has token?
    │   ├─> Yes: Auto sign-in
    │   └─> No: Show AuthModal
    └─> User enters name or clicks Google Sign-In
        ├─> Anonymous: Firebase signInAnonymously()
        └─> Google: Firebase signInWithPopup(GoogleAuthProvider)
            └─> Create user profile in Realtime DB
                └─> Set presence (online: true)
                    └─> Set onDisconnect handler
                        └─> AuthModal closes
                            └─> Canvas appears
```

### 2. **Cursor Sync Flow**

```
User moves mouse
└─> useCursors() listens to DOM pointer events
    └─> Throttle (30Hz)
        └─> Convert screen coords to page coords
            └─> Update Firebase Realtime DB (/users/{uid}/cursor)
                └─> Other users subscribe to /users
                    └─> Receive cursor update
                        └─> Update cursors state
                            └─> Cursors component re-renders
                                └─> Remote cursor moves on screen
```

### 3. **Shape Sync Flow**

```
User creates/moves shape
└─> tldraw editor fires store change event
    └─> useShapes() listens to editor.store
        └─> Debounce (300ms)
            └─> Serialize shape data
                └─> Update Cloud Firestore (/rooms/default/shapes/{shapeId})
                    └─> Other users subscribe to /rooms/default/shapes
                        └─> Receive shape update
                            └─> Check if isSyncing (prevent loop)
                                └─> Update editor with new shape
                                    └─> tldraw re-renders canvas
                                        └─> Shape appears for all users
```

### 4. **AI Command Flow**

```
User types AI command
└─> FloatingChat.handleSend()
    └─> Validate input (length, rate limit)
        └─> Add user message to chat
            └─> executeAICommand() → fetch /api/ai/execute
                └─> Server calls OpenAI GPT-4 with function schemas
                    └─> GPT-4 returns function call (e.g., "createShape")
                        └─> Server returns response with functionCall
                            └─> Client receives response
                                └─> Switch on function name
                                    └─> Execute canvas tool (e.g., createShape)
                                        └─> Tool creates shape via editor.createShape()
                                            └─> Shape syncs to Firestore (via useShapes)
                                                └─> All users see new shape
                                                    └─> Display success message in chat
```

### 5. **Presence Tracking Flow**

```
User signs in
└─> useAuth() sets /users/{uid}/online = true
    └─> Sets onDisconnect() handler → online = false
        └─> usePresence() subscribes to /users
            └─> Filters users with online: true
                └─> Updates users state
                    └─> UserList component re-renders
                        └─> Shows updated user list
                            └─> User goes offline (closes tab)
                                └─> onDisconnect() fires → online = false
                                    └─> usePresence() receives update
                                        └─> User removed from list
```

---

## 🎨 Styling Approach

### Tailwind CSS 4

**Utility-First Classes:**
- Spacing: `px-4`, `py-2`, `gap-2`, `space-y-4`
- Colors: `bg-blue-500`, `text-white`, `border-gray-200`
- Layout: `flex`, `grid`, `fixed`, `absolute`, `relative`
- Responsive: `md:`, `lg:`, `xl:` prefixes
- Animations: `animate-pulse`, `animate-bounce`, `animate-slide-up`

**Custom Animations:**
```css
@keyframes slide-up {
  from { transform: translateY(20px); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}
```

**Global Styles:**
- `globals.css` contains base styles and tldraw overrides
- Dark mode disabled to prevent black canvas
- Custom scrollbar styling for chat

---

## 📱 Responsive Design

**Current Status:** Desktop-optimized, mobile not yet implemented

**Planned Mobile Adjustments:**
- FloatingChat: Full-screen overlay on mobile
- UserList: Collapsible drawer on mobile
- Canvas: Touch gesture support
- UI: Larger touch targets (44px minimum)

---

## ♿ Accessibility

**Implemented:**
- Semantic HTML (`<button>`, `<input>`, `<label>`)
- Focus states with `focus:ring-2` utility classes
- ARIA labels on icon buttons
- Keyboard navigation (Enter to send, Escape to close)
- Alt text on images/icons

**TODO:**
- Screen reader testing
- ARIA live regions for real-time updates
- Keyboard shortcuts for canvas operations

---

## 🧪 Component Testing

**Test Coverage:**
- ChatMessage: 100% (rendering, styling)
- FloatingChat: 90% (interactions, state management)
- Cursors: 85% (rendering, updates)
- UserList: 80% (presence updates)

**Testing Strategy:**
- Jest + React Testing Library
- Mock Firebase with jest.mock()
- Mock tldraw editor with createMockEditor()
- Snapshot tests for UI components
- Integration tests for data flow

---

## 🔧 Development Tools

**Browser DevTools:**
- React DevTools (component tree, props, state)
- Profiler (performance monitoring)
- Network tab (Firebase/OpenAI API calls)
- Console (debug logs, errors)

**VS Code Extensions:**
- Tailwind CSS IntelliSense
- ESLint
- Prettier
- TypeScript

**Hot Reload:**
- Next.js Fast Refresh (instant updates)
- tldraw editor preserves state on reload

---

**Frontend Status:** Production-ready with 9 components, 5 custom hooks, and AI-powered canvas manipulation ✅

