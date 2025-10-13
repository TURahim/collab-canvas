# CollabCanvas - Project Requirements Document (Summary)

## Project Overview
Build a real-time collaborative canvas application where multiple users can simultaneously create, move, and manipulate shapes while seeing each other's cursors and actions in real-time.

**Hard Gate:** Must pass all MVP requirements to continue to full project

## Tech Stack

**Frontend:** Next.js 14+ (App Router) + TypeScript  
**Canvas:** tldraw SDK (infinite canvas with built-in features)  
**Real-Time Sync:** Firebase Realtime Database (for cursors & live updates)  
**Persistence:** Cloud Firestore (for canvas state)  
**Auth:** Firebase Authentication (anonymous + display name)  
**Deployment:** Vercel

### Why This Stack

**tldraw provides:**
- Infinite canvas with 60 FPS pan/zoom
- All shape types and interactions built-in
- Professional UI/UX out of the box
- Saves ~12 hours of canvas development

**Firebase Realtime Database:**
- <50ms latency (perfect for cursors)
- Built-in presence detection
- WebSocket connections managed automatically
- Free tier: 1GB storage, 10GB/month bandwidth, 100 connections

**Cloud Firestore:**
- Structured persistence for canvas state
- Better querying than Realtime DB
- Automatic offline support
- Free tier: 50K reads, 20K writes per day

**Hybrid Approach:** Realtime DB for ephemeral data (cursors), Firestore for persistent data (shapes)

## Core Architecture

```
┌────────────────────────────────────────────────────────┐
│ User Browser                                            │
├────────────────────────────────────────────────────────┤
│ Next.js App                                            │
│ ├─ tldraw Component (canvas rendering)                │
│ ├─ Firebase Realtime DB (cursors, live updates)       │
│ │  └─ users/{userId}/cursor                           │
│ ├─ Cloud Firestore (persistent shapes)                │
│ │  └─ shapes/{shapeId}                                │
│ └─ Firebase Auth (user identity)                      │
└────────────┬───────────────────────────────────────────┘
             │
             ▼
┌─────────────────────┐
│ Firebase Cloud      │
│ - Realtime DB       │
│ - Firestore         │
│ - Auth              │
└─────────────────────┘
```

### Data Flow

**Cursors (High Frequency, Ephemeral):**
1. User moves mouse → Update Realtime DB at 30Hz
2. Listen to other users' cursor positions
3. Render cursors on canvas
4. Data deleted when user disconnects

**Shapes (Low Frequency, Persistent):**
1. User creates/moves shape in tldraw
2. On change complete → Write to Firestore
3. Listen to Firestore updates
4. Apply to local tldraw instance
5. Data persists forever

## MVP Core Features

### 1. User Identity & Authentication (P0)
- Firebase Anonymous Authentication
- User enters display name on first visit
- Auth state persists across sessions
- Each user has unique color for cursors

**Acceptance Criteria:**
- User enters name before accessing canvas
- Name visible in cursor labels
- Identity persists on page refresh

### 2. Canvas Workspace - tldraw (P0)
```typescript
import { Tldraw } from 'tldraw';
import 'tldraw/tldraw.css';

export default function Canvas() {
  const handleMount = (editor: Editor) => {
    setupFirebaseSync(editor);
  };
  return (
    <div style={{ position: 'fixed', inset: 0 }}>
      <Tldraw onMount={handleMount} />
    </div>
  );
}
```

**What tldraw provides:** Pan/zoom, shape creation, transform tools, selection, undo/redo, copy/paste

**Acceptance Criteria:**
- Canvas loads and is responsive
- User can create and manipulate shapes
- Pan and zoom work smoothly at 60 FPS

### 3. Real-Time Cursor Sync (P0)

**Database Structure:**
```json
{
  "users": {
    "user-abc": {
      "name": "Alice",
      "color": "#FF6B6B",
      "cursor": { "x": 100, "y": 200 },
      "online": true,
      "lastSeen": 1234567890
    }
  }
}
```

**Implementation Pattern:**
```typescript
// Update cursor position (throttled to 30Hz)
const updateCursor = throttle((x: number, y: number) => {
  const userRef = ref(db, `users/${userId}/cursor`);
  update(userRef, { x, y, lastSeen: serverTimestamp() });
}, 33);

// Track pointer movement
const handlePointerMove = (e: PointerEvent) => {
  const pagePoint = editor.screenToPage({ x: e.clientX, y: e.clientY });
  updateCursor(pagePoint.x, pagePoint.y);
};

// Setup presence (auto-cleanup on disconnect)
onDisconnect(userStatusRef).remove();
```

**Acceptance Criteria:**
- All users see each other's cursors with names
- Cursor movement smooth (<50ms latency)
- Cursors disappear when users disconnect
- Cursor position transforms correctly with zoom/pan

### 4. Shape Persistence & Sync (P0)

**Database Structure:**
```typescript
// Collection: shapes/{shapeId}
{
  id: "shape-123",
  type: "rectangle",
  x: 100, y: 200,
  width: 150, height: 100,
  rotation: 0,
  fill: "#4DABF7",
  createdBy: "user-abc",
  createdAt: Timestamp,
  updatedAt: Timestamp
}
```

**Sync Strategy:**

*tldraw → Firestore:*
```typescript
editor.store.listen((entry) => {
  if (entry.source !== 'user') return;
  debouncedSyncToFirestore(entry);
}, { scope: 'document' });
```

*Firestore → tldraw:*
```typescript
onSnapshot(shapesRef, (snapshot) => {
  snapshot.docChanges().forEach((change) => {
    editor.store.mergeRemoteChanges(() => {
      const tldrawShape = deserializeToTldrawShape(change.doc.data());
      editor.updateShape(tldrawShape);
    });
  });
});
```

**Conflict Resolution:** Last write wins (Firestore handles automatically via updatedAt timestamp)

**Acceptance Criteria:**
- Shape creation/movement syncs <100ms
- No duplicate shapes after sync
- Works with 2+ users editing simultaneously
- No data loss on refresh

### 5. Presence Awareness (P0)
- User list shows all online users with colors
- List updates within 2s when users join/leave
- Current user clearly marked
- Auto-cleanup on disconnect via `onDisconnect()`

### 6. State Persistence (P0)
- Firestore automatically persists all data
- Canvas state loads on page load
- No manual save/load needed
- No duplicate shapes on reconnect

### 7. Deployment (P0)
```bash
npm i -g vercel
vercel --prod
```

**Environment Variables Required:**
- NEXT_PUBLIC_FIREBASE_API_KEY
- NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
- NEXT_PUBLIC_FIREBASE_PROJECT_ID
- NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
- NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
- NEXT_PUBLIC_FIREBASE_APP_ID
- NEXT_PUBLIC_FIREBASE_DATABASE_URL

**Acceptance Criteria:**
- App deployed with public URL
- HTTPS enabled (automatic)
- Supports 5+ concurrent users

## Critical Implementation Patterns

### Pattern 1: Coordinate Conversion
```typescript
// Screen → Page (for sending cursor position)
const pagePoint = editor.screenToPage({ x: e.clientX, y: e.clientY });

// Page → Screen (for rendering cursors)
const screenPoint = editor.pageToScreen({ x: cursor.x, y: cursor.y });
```

### Pattern 2: Preventing Sync Loops
```typescript
let isSyncing = false;

// Only sync user actions
editor.store.listen((entry) => {
  if (isSyncing) return;
  if (entry.source !== 'user') return;
  syncToFirebase(entry);
});

// Mark when applying remote changes
onSnapshot(shapesRef, (snapshot) => {
  isSyncing = true;
  applyToTldraw(snapshot);
  isSyncing = false;
});
```

### Pattern 3: Throttling Strategy
```typescript
// Cursors: 30Hz (every 33ms)
const updateCursor = throttle(sendCursorUpdate, 33);

// Shapes: Debounced 300ms after change stops
const syncShape = debounce(sendShapeUpdate, 300);

// Presence: Update every 10 seconds (heartbeat)
const updatePresence = setInterval(sendHeartbeat, 10000);
```

## Implementation Timeline (10-12 Hours)

**Phase 1: Setup & Auth (Hours 0-2)**
- Create Next.js project with TypeScript
- Install dependencies: tldraw, firebase, lodash
- Create Firebase project and enable services
- Build auth flow (name entry modal)

**Phase 2: Cursor Sync (Hours 2-5)**
- Set up Realtime Database structure
- Track mouse movement on canvas
- Convert coordinates (screen ↔ page)
- Update cursor position in Realtime DB (30Hz)
- Render cursor indicators with names
- Add presence detection and auto-cleanup

**Phase 3: Shape Sync (Hours 5-9)**
- Set up Firestore collection structure
- Serialize/deserialize tldraw shapes
- Listen to tldraw shape changes
- Debounce updates (300ms)
- Apply remote changes without sync loop
- Handle shape deletion

**Phase 4: Presence UI & Polish (Hours 9-11)**
- Build user list component
- Add loading states and error handling
- Improve cursor styling
- Test with 5+ concurrent users

**Phase 5: Testing & Deployment (Hours 11-12)**
- Manual testing of all acceptance criteria
- Measure latency (cursors <50ms, shapes <100ms)
- Deploy to Vercel
- Test with multiple users on deployed version

## Project Structure

```
collabcanvas/
├── app/
│   ├── canvas/
│   │   └── page.tsx              # Main canvas page
│   ├── components/
│   │   ├── Canvas.tsx            # tldraw wrapper
│   │   ├── Cursors.tsx           # Multiplayer cursors
│   │   ├── UserList.tsx          # Presence sidebar
│   │   └── AuthModal.tsx         # Name entry modal
│   ├── lib/
│   │   ├── firebase.ts           # Firebase config
│   │   ├── firebaseSync.ts       # Shape sync logic
│   │   ├── realtimeSync.ts       # Cursor sync logic
│   │   └── tldrawHelpers.ts     # Serialization helpers
│   ├── hooks/
│   │   ├── useAuth.ts            # Firebase auth
│   │   ├── useCursors.ts         # Cursor tracking
│   │   ├── useShapes.ts          # Shape sync
│   │   └── usePresence.ts        # User presence
│   └── types/
│       └── index.ts              # TypeScript types
├── .env.local                    # Firebase config
└── package.json

Note: Uses single default room 'default' - no room management needed for MVP
```

## Firebase Security Rules

**Realtime Database:**
```json
{
  "rules": {
    "users": {
      "$userId": {
        ".read": true,
        ".write": "$userId === auth.uid"
      }
    }
  }
}
```

**Firestore:**
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /shapes/{shapeId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null;
    }
  }
}
```

Note: Simplified for single room 'default' - all authenticated users share the same canvas.

## Performance Optimization

**Quota Management:**
- Realtime Database: 1GB storage, 10GB/month bandwidth, 100 connections
- Firestore: 50K reads/day, 20K writes/day

**Budget Analysis:**
- 5 users × 30 cursor updates/sec = 150 updates/sec (~7.5 KB/sec)
- 1 hour session = 27 MB bandwidth ✓ Well under limits
- 5 users creating/moving shapes for 1 hour = ~500 writes ✓ Well under 20K limit

## Testing Strategy

**Unit Tests (High Value):**
1. Coordinate Conversion - Prevents cursor misalignment
2. Shape Serialization - Prevents data corruption
3. Throttle/Debounce Logic - Validates quota management

**Integration Tests (Critical Paths):**
1. Firebase Realtime DB Integration - Cursor sync end-to-end
2. Firestore Shape Sync - Persistence validation

**Test Setup:** Use Firebase Emulator for local testing

## Manual Testing Checklist

**Core Functionality:**
- Auth flow works
- Canvas loads with tldraw interface
- Shapes can be created, moved, resized, rotated
- Cursors sync smoothly with names
- Shape sync reliable (<100ms)
- User list updates correctly
- Refresh preserves state

**Performance:**
- 60 FPS during pan/zoom
- Cursor latency <50ms
- Shape sync <100ms
- Supports 100+ shapes without lag
- 5+ concurrent users work smoothly

**Edge Cases:**
- Rapid disconnect/reconnect
- Simultaneous editing of same shape
- Browser refresh mid-edit
- Network throttling

## Known Limitations

**Technical:**
- tldraw watermark (free tier)
- Firebase free tier quotas (acceptable for MVP)
- No operational transforms (last write wins)
- Limited to 100 simultaneous connections

**Features Not Included:**
- Rich text formatting, image uploads, export to files
- Version history (beyond undo/redo)
- Comments/annotations, permissions/roles
- Mobile optimization
- AI agent (post-MVP)

## Success Metrics

**MVP Pass Criteria:**
- All 7 core features working
- Real-time sync reliable
- Performance targets met (<50ms cursors, <100ms shapes, 60 FPS)
- 5+ concurrent users supported
- Deployed and accessible

**Evaluation Focus:**
- Integration Quality: 35% (tldraw ↔ Firebase)
- Sync Reliability: 30% (No data loss, smooth updates)
- Performance: 20% (Latency targets, 60 FPS)
- User Experience: 10% (Polish, error handling)
- Documentation: 5% (Clear README, architecture)

## Quick Start

### 1. Create Next.js Project
```bash
npx create-next-app@latest collabcanvas --typescript --tailwind --app
cd collabcanvas
npm install tldraw firebase lodash
npm install -D @types/lodash
```

### 2. Create Firebase Project
1. Go to console.firebase.google.com
2. Create new project
3. Enable Anonymous Authentication
4. Create Realtime Database (start in test mode)
5. Create Firestore (start in test mode)
6. Copy config to .env.local

### 3. Configure Environment
Create `.env.local` with Firebase credentials (see Deployment section)

### 4. Start Development
```bash
npm run dev
# Open http://localhost:3000
```

### 5. Deploy to Vercel
```bash
npm i -g vercel
vercel
# Follow prompts, add environment variables
```

## Essential Resources

- [Firebase Realtime Database](https://firebase.google.com/docs/database)
- [Cloud Firestore](https://firebase.google.com/docs/firestore)
- [Firebase Authentication](https://firebase.google.com/docs/auth)
- [tldraw Quick Start](https://tldraw.dev)
- [Next.js App Router](https://nextjs.org/docs)

## Final Checklist

**Before You Start:**
- [ ] Firebase project created
- [ ] All Firebase services enabled (Auth, Realtime DB, Firestore)
- [ ] Environment variables set
- [ ] Next.js project initialized
- [ ] Dependencies installed
- [ ] Understand tldraw Editor API basics
- [ ] Clear on sync strategy (Realtime for cursors, Firestore for shapes)

**Ready to build!** This stack provides a 10-12 hour timeline with production-quality collaboration and impressive results.

