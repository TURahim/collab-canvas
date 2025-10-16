# ACTIVE CONTEXT - CollabCanvas

**Last Updated:** October 15, 2025  
**Session:** Memory Bank Initialization

---

## 🔄 Current Work Session

**Active Branch:** `mvp-submission`  
**Recent Changes:**
- Modified: `PROJECT_STATUS_COMPARISON.md`
- Modified: `src/lib/__tests__/canvasTools.test.ts`
- Untracked: `PROJECT_STATUS_COMPARISON_backup.md`

**No Pending Commits**

---

## 🗄️ Data Schema

### Firebase Realtime Database (Cursors & Presence)

```javascript
users/
  {userId}/
    name: string          // Display name
    color: string         // User color (hex)
    online: boolean       // Presence status
    lastSeen: timestamp   // Last activity
    cursor: {
      x: number          // Cursor X position
      y: number          // Cursor Y position
    }
```

**Security Rules:**
- Read: All authenticated users
- Write: Only owner ($uid === auth.uid)
- onDisconnect cleanup: Automatic

### Cloud Firestore (Shape Persistence)

```javascript
rooms/
  {roomId}/            // Default: "default"
    shapes/
      {shapeId}/
        id: string          // Shape ID (TLShapeId)
        type: string        // Shape type (geo, text, arrow, etc.)
        x: number          // X position
        y: number          // Y position
        rotation?: number  // Rotation (radians)
        props: {           // Shape-specific properties
          w?: number       // Width (geo shapes)
          h?: number       // Height (geo shapes)
          geo?: string     // Geo type (rectangle, ellipse, etc.)
          color?: string   // tldraw color
          text?: string    // Text content (text shapes)
          // ... other tldraw props
        }
        createdBy: string  // User ID
        updatedAt: timestamp
```

**Security Rules:**
- Read: All authenticated users
- Create/Update: Authenticated + field validation (id, type, createdBy required)
- Delete: All authenticated users (collaborative editing)

---

## 🌐 API Routes

### 1. `/api/ai/execute` (POST)

**Purpose:** Server-side OpenAI proxy for AI canvas commands

**Request Body:**
```typescript
{
  message: string;           // User command text
  canvasContext: {
    selectedShapes: number;  // Count of selected shapes
    totalShapes: number;     // Total shapes on canvas
    viewportBounds: {        // Visible viewport area
      x: number;
      y: number;
      width: number;
      height: number;
    }
  }
}
```

**Response:**
```typescript
{
  message: string;           // AI response message
  functionCall?: {           // Optional function to execute
    name: string;            // Function name (e.g., "createShape")
    arguments: Record<string, any>; // Function arguments
  }
}
```

**Error Responses:**
- 500: OpenAI API error or processing failure
- Returns: `{ error: string }`

**Environment Required:**
- `OPENAI_API_KEY` (server-side only, no NEXT_PUBLIC prefix)

**Rate Limiting:**
- Client-side: Disabled for development (ready to enable)
- Production: 10 commands/hour per user (localStorage-based)

### 2. `/api/ai/execute` (GET)

**Purpose:** Health check for AI service

**Response:**
```typescript
{
  status: "ok";
  hasApiKey: boolean;  // Whether OPENAI_API_KEY is configured
}
```

---

## 🎨 Canvas Tool Functions (10 Commands)

### Creation Commands
1. **createShape** - Basic shapes (rectangle, circle, triangle, hexagon, diamond)
2. **createTextShape** - Text layers with formatting

### Manipulation Commands
3. **moveShape** - Move shapes by delta X/Y
4. **transformShape** - Scale and rotate shapes

### Layout Commands
5. **arrangeShapes** - Arrange in horizontal/vertical/grid patterns
6. **createGrid** - Create NxM grid of shapes

### Complex UI Commands
7. **createLoginForm** - 8 shapes (background, title, 2 labels, 2 fields, button, button text)
8. **createCard** - 7 shapes (background, image placeholder, title, subtitle, body, button, button text)
9. **createNavigationBar** - 6+ shapes (background, logo, dynamic menu items)
10. **createCheckboxList** - 2+(count×2) shapes (container, title, checkboxes + labels)

**Common Parameters:**
- `editor: Editor` - tldraw editor instance (required)
- `color?: string` - tldraw color name (black, blue, red, grey, etc.)
- `x?: number, y?: number` - Position (defaults to viewport center)
- `width?: number, height?: number` - Dimensions

**Return Value:** `TLShapeId` or `TLShapeId[]`

---

## 🎭 tldraw API Surface (v4.0.3)

### Editor Instance Methods (Commonly Used)

```typescript
// Shape creation
editor.createShape(shape: TLShape): void
editor.createShapes(shapes: TLShape[]): void

// Shape updates
editor.updateShape(partial: TLShapePartial): void

// Shape queries
editor.getShape(id: TLShapeId): TLShape | undefined
editor.getCurrentPageShapes(): TLShape[]
editor.getSelectedShapes(): TLShape[]

// Selection
editor.select(...ids: TLShapeId[]): void
editor.setSelectedShapes(ids: TLShapeId[]): void

// Viewport
editor.getViewportPageBounds(): Box

// Store events
editor.store.listen(callback: (change) => void): () => void
```

### Shape Types

```typescript
// Geo shapes (basic shapes)
type: 'geo'
props: {
  geo: 'rectangle' | 'ellipse' | 'triangle' | 'hexagon' | 'diamond' | 'star' | ...
  w: number
  h: number
  color: TldrawColor
  fill: 'none' | 'semi' | 'solid' | 'pattern'
}

// Text shapes
type: 'text'
props: {
  richText: TLRichTextContent  // Use toRichText(string) helper
  w: number
  size: 's' | 'm' | 'l' | 'xl'
  color: TldrawColor
  autoSize: boolean
}
```

### tldraw Colors

Valid color values: `black`, `grey`, `light-violet`, `violet`, `blue`, `light-blue`, `yellow`, `orange`, `green`, `light-green`, `light-red`, `red`

**Color Mapping:**
- User says "purple" → `violet`
- User says "gray" → `grey`
- User says "circle" → geo type `ellipse`
- User says "square" → geo type `rectangle` (with equal w/h)

---

## 🔧 Tech Stack Versions

**Core Framework:**
- Next.js: 15.5.5
- React: 19.1.0
- TypeScript: 5.x
- Tailwind CSS: 4.x

**Canvas & AI:**
- tldraw: 4.0.3
- OpenAI SDK: 6.3.0
- nanoid: 5.1.6

**Backend:**
- Firebase: 12.4.0
- firebase-admin: 13.5.0

**Testing:**
- Jest: 29.7.0
- Testing Library React: 14.1.2

**Build Tools:**
- ESLint: 9.x
- PostCSS: 4.x

---

## ⚙️ Configuration Files

### Environment Variables (`.env.local`)

**Firebase (Public - Client SDK):**
```bash
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=...
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
NEXT_PUBLIC_FIREBASE_APP_ID=...
NEXT_PUBLIC_FIREBASE_DATABASE_URL=...
```

**OpenAI (Private - Server-side only):**
```bash
OPENAI_API_KEY=sk-...  # NO NEXT_PUBLIC prefix
```

**Optional:**
```bash
NEXT_PUBLIC_TLDRAW_LICENSE_KEY=...
```

### Security Rules Status

**Firestore (`firestore.rules`):**
- ✔ Deployed
- Read: `auth != null`
- Write: `auth != null` + field validation

**Realtime DB (`database.rules.json`):**
- ✔ Deployed
- Read: `auth != null`
- Write: `$uid === auth.uid` (per-user)

---

## 🔄 Real-time Sync Architecture

### Cursor Sync (Firebase Realtime DB)
- **Update Frequency:** 30Hz (throttled)
- **Latency:** < 50ms
- **Cleanup:** onDisconnect() + manual cleanup on unmount

### Shape Sync (Cloud Firestore)
- **Update Frequency:** 300ms debounced (batch writes)
- **Latency:** < 100ms
- **Conflict Resolution:** Last write wins
- **Sync Prevention:** `isSyncing` flag to prevent loops

### Presence Tracking
- **Heartbeat:** Every 30 seconds
- **Cleanup:** onDisconnect() + lastSeen timestamp
- **User List:** Real-time subscription to `/users` path

---

## 🚨 Rate Limits & Quotas

### OpenAI API
- **Current:** Development mode (no limit enforcement)
- **Production Target:** 10 commands/hour per user
- **Implementation:** Client-side localStorage tracking
- **Reset:** Every 60 minutes

### Firebase (Free Tier)
- **Realtime DB Concurrent Connections:** 100 (sufficient for MVP)
- **Firestore Reads:** 50K/day (exceeded: upgrade needed)
- **Firestore Writes:** 20K/day (sufficient for MVP)
- **Authentication:** Unlimited anonymous users

---

## 🧩 Key Dependencies & Patterns

### State Management
- React hooks (useState, useEffect, useRef)
- Custom hooks (useAuth, useCursors, useShapes, usePresence, useRateLimit)
- No external state library (Redux, Zustand, etc.)

### Error Handling
- ErrorBoundary component (catches React errors)
- ConnectionStatus component (offline detection)
- Retry logic with exponential backoff (withRetry utility)
- Silent error handling in Firebase listeners (expected errors)

### Performance Optimizations
- Throttle: Cursor updates (30Hz)
- Debounce: Shape updates (300ms)
- Shallow equality checks to prevent re-renders
- useCallback/useMemo where appropriate

---

## 📌 Critical Implementation Notes

### tldraw v4 Breaking Changes
- Shape creation: Use `createShapeId()` instead of `nanoid()` directly
- Text shapes: Must use `toRichText()` for text content
- Shape updates: Must include `type` field in updates
- Selection: Use `editor.select()` not `editor.setSelectedShapes()`

### Firebase Best Practices
- Always use `isSyncing` flag to prevent sync loops
- Clean up listeners on unmount (`return () => unsubscribe()`)
- Use `onDisconnect()` for presence cleanup
- Debounce Firestore writes to reduce quota usage

### OpenAI Function Calling
- Always validate editor exists before executing commands
- Parse arguments as `any` and cast to proper types
- Provide clear error messages in chat UI
- Return function call info in response, execute client-side

---

## 🐛 Known Issues & Workarounds

### Current Issues
- None critical - production ready

### Resolved Issues (for reference)
- ✅ Dark mode causing black canvas (disabled system dark mode)
- ✅ UI disappearing after 3s (fixed listener leak)
- ✅ Cursor tracking broken (switched to DOM events)
- ✅ Permission denied errors during logout (silent error handling)

---

## 📊 Monitoring & Observability

**Production Monitoring:**
- Vercel deployment logs
- Firebase console (usage, errors)
- Browser console (dev mode only)

**Key Metrics to Watch:**
- Firebase quota usage (reads/writes)
- OpenAI API costs
- Vercel bandwidth usage
- Error rates in production

---

**This context will be refreshed immediately if:**
- Schema changes (database structure)
- API routes added/modified
- Rate limits updated
- Environment variables changed

