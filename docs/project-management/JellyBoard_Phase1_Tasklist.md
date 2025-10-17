# JellyBoard Phase 1 - Implementation Tasklist

**Project:** CollabCanvas → JellyBoard Transformation  
**Timeline:** 4-6 weeks  
**Total PRs:** 11 (includes 1 critical bug fix)  
**Test Coverage Target:** 30+ new tests (22 unit + 8 integration)

---

## Overview

This tasklist breaks down JellyBoard Phase 1 into 10 discrete, testable Pull Requests. Each PR is designed to be independently reviewable and mergeable without breaking existing CollabCanvas functionality.

### PR Dependencies

```
PR #0 (Real-Time Drag Sync) ⚠️ CRITICAL BUG FIX
  ↓
PR #1 (Role System)
  ↓
PR #2 (Room Codes) ──→ PR #3 (Student Auth) ──→ PR #9 (Student Join UI)
  ↓                            ↓
PR #4 (Profanity Filter) ──────┘
  ↓
PR #5 (Moderation Tools)
  ↓
PR #6 (AI Access Control)
  ↓
PR #7 (Session Management)
  ↓
PR #8 (Compliance)
  ↓
PR #10 (Integration Testing & Polish)
```

---

## PR #0: Real-Time Drag Sync (CRITICAL)

**Branch:** `bugfix/realtime-drag-sync`  
**Estimated Time:** 2-3 days  
**Dependencies:** None  
**Priority:** P0 - Critical blocker for Phase 1  
**Goal:** Fix drag operations to be visible in real-time with < 100ms latency

### Problem Statement

**Current Behavior (BROKEN):**
- When User A drags a shape, User B only sees the shape appear at the end position
- No intermediate position updates during the drag operation
- Creates "teleporting" effect that breaks immersion and classroom engagement
- Students can't follow along with teacher demonstrations

**Root Cause:**
- Shape sync uses 300ms debouncing (too slow for drag)
- Updates only fire on `pointerup` event (end of drag)
- No real-time position tracking during drag operation

**Required Behavior:**
- User B should see the shape moving smoothly as User A drags it
- Latency target: < 100ms for position updates
- Update rate: 60Hz (16ms intervals) during drag
- Final position persists to Firestore on drag end

### Tasks

#### 0.1 Add Drag Sync Functions to Realtime Sync
- [ ] **File:** `src/lib/realtimeSync.ts`
  ```typescript
  /**
   * Update shape position during drag operation
   * Writes to lightweight Realtime DB path for speed
   */
  export async function updateDragPosition(
    roomId: string,
    shapeId: string,
    position: { x: number; y: number },
    userId: string
  ): Promise<void>
  
  /**
   * Clear drag state when drag ends
   */
  export async function clearDragPosition(
    roomId: string,
    shapeId: string
  ): Promise<void>
  
  /**
   * Listen to drag updates from other users
   */
  export function listenToDragUpdates(
    roomId: string,
    callback: (updates: DragUpdate[]) => void
  ): () => void
  
  /**
   * Clean up stale drag states (older than 5 seconds)
   */
  export async function cleanupStaleDragStates(roomId: string): Promise<void>
  ```

#### 0.2 Update Shapes Hook with Drag Listeners
- [ ] **File:** `src/hooks/useShapes.ts`
  - Add tldraw drag event listener
  - Throttle drag updates to 60Hz (16ms)
  - Call `updateDragPosition()` during drag
  - Call `clearDragPosition()` on drag end
  - Listen to remote drag updates
  - Apply remote drag positions to local editor

- [ ] **Implementation:**
  ```typescript
  // Add to useShapes hook
  useEffect(() => {
    if (!editor || !userId || !roomId || !enabled) return;
    
    // Track which shape is being dragged
    let draggedShapeId: TLShapeId | null = null;
    
    // Throttled drag update (60Hz = 16ms)
    const throttledDragUpdate = throttle((shapeId: TLShapeId, x: number, y: number) => {
      void updateDragPosition(roomId, shapeId, { x, y }, userId);
    }, 16);
    
    // Listen to pointer events for drag detection
    const handlePointerMove = (e: PointerEvent) => {
      if (editor.getIsMenuOpen()) return;
      
      const selectedShapes = editor.getSelectedShapes();
      if (selectedShapes.length === 1 && editor.getInstanceState().isDragging) {
        const shape = selectedShapes[0];
        draggedShapeId = shape.id;
        throttledDragUpdate(shape.id, shape.x, shape.y);
      }
    };
    
    const handlePointerUp = async () => {
      if (draggedShapeId) {
        await clearDragPosition(roomId, draggedShapeId);
        draggedShapeId = null;
      }
    };
    
    // Add listeners
    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    
    // Listen to remote drag updates
    const unsubscribeDrag = listenToDragUpdates(roomId, (updates) => {
      updates.forEach(update => {
        if (update.userId !== userId) {
          // Update shape position locally (don't sync back)
          isSyncingRef.current = true;
          editor.updateShape({
            id: update.shapeId as TLShapeId,
            type: editor.getShape(update.shapeId as TLShapeId)?.type,
            x: update.x,
            y: update.y,
          });
          isSyncingRef.current = false;
        }
      });
    });
    
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      unsubscribeDrag();
    };
  }, [editor, userId, roomId, enabled]);
  ```

#### 0.3 Update Database Schema
- [ ] **File:** `database.rules.json`
  ```json
  "dragging": {
    ".read": "auth != null",
    "$shapeId": {
      ".write": "auth != null",
      "x": { ".validate": "newData.isNumber()" },
      "y": { ".validate": "newData.isNumber()" },
      "userId": { ".validate": "newData.isString()" },
      "lastUpdate": { ".validate": "newData.isNumber()" }
    }
  }
  ```

#### 0.4 Add Drag State Type
- [ ] **File:** `src/types/index.ts`
  ```typescript
  export interface DragUpdate {
    shapeId: string;
    x: number;
    y: number;
    userId: string;
    lastUpdate: number;
  }
  ```

### Unit Tests

- [ ] **New File:** `src/lib/__tests__/dragSync.test.ts`
  ```typescript
  describe('Real-Time Drag Sync', () => {
    test('updateDragPosition writes to correct path')
    test('clearDragPosition removes drag state')
    test('listenToDragUpdates receives remote updates')
    test('throttle respects 16ms interval (60Hz)')
    test('cleanupStaleDragStates removes old entries')
  })
  ```

- [ ] **Update:** `src/hooks/__tests__/useShapes.test.ts`
  ```typescript
  describe('Drag Integration', () => {
    test('drag event triggers updateDragPosition')
    test('pointerup triggers clearDragPosition')
    test('remote drag updates local shape')
    test('own drag updates ignored from remote listener')
  })
  ```

### Integration Tests

- [ ] **New File:** `src/__tests__/integration/dragSync.test.ts`
  ```typescript
  describe('Real-Time Drag Collaboration', () => {
    test('User A drags → User B sees updates < 100ms')
    test('multiple users dragging different shapes')
    test('drag state cleared on pointerup')
    test('final position persists to Firestore')
    test('10 concurrent users dragging (load test)')
  })
  ```

### Performance Testing

- [ ] Manual test with 2 browsers
  - User A drags shape in circles
  - User B observes smooth movement
  - Measure latency with console timestamps

- [ ] Load test with 10+ concurrent users
  - Use Firestore emulator
  - Simulate 10 users dragging simultaneously
  - Verify no performance degradation
  - Monitor Firebase write quota

### Acceptance Criteria

- ✅ Dragged shapes visible in real-time to all users
- ✅ Position updates at 60Hz (16ms intervals)
- ✅ End-to-end latency < 100ms (verified with 2-user test)
- ✅ No performance degradation with 10+ concurrent users
- ✅ Smooth visual experience (no jittering or lag)
- ✅ Final position persists to Firestore on drag end
- ✅ No sync loops or conflicts
- ✅ Stale drag states cleaned up automatically
- ✅ 10 unit tests passing
- ✅ 5 integration tests passing

### Known Edge Cases

**Edge Case 1: User disconnects mid-drag**
- Solution: 5-second TTL cleanup on stale drag states
- Cleanup function runs every 10 seconds

**Edge Case 2: Multiple users drag same shape**
- Solution: Last write wins (standard behavior)
- Consider adding "lock" indicator in Phase 2

**Edge Case 3: Drag across page boundaries**
- Solution: Works automatically (tldraw handles coordinate system)

### Rollback Plan

If this PR causes issues:
1. Feature flag: `ENABLE_REALTIME_DRAG_SYNC` in env
2. Disable by default, enable per-room in settings
3. Fallback to original 300ms debounce if disabled

---

## PR #1: Role System & Type Definitions

**Branch:** `feature/role-system`  
**Estimated Time:** 2-3 days  
**Dependencies:** None  
**Goal:** Add foundation for teacher/student roles without breaking existing auth

### Tasks

#### 1.1 Update Type Definitions
- [ ] **File:** `src/types/index.ts`
  - Add `role: 'teacher' | 'student'` field to `User` interface
  - Add `StudentSession` interface:
    ```typescript
    export interface StudentSession {
      sessionId: string;
      nickname: string;
      roomCode: string;
      roomId: string;
      color: string;
      joinedAt: number;
      expiresAt: number;
      lastActivity: number;
    }
    ```

- [ ] **File:** `src/types/room.ts`
  - Add `roomCode: string` field to `RoomMetadata`
  - Add `aiEnabled: boolean` field to `RoomMetadata`
  - Add `autoCleanup?: boolean` field to `RoomMetadata`
  - Add `customWordList?: string[]` field to `RoomMetadata`

- [ ] **New File:** `src/types/student.ts`
  - Create `StudentPresence` interface
  - Create `StudentBan` interface
  - Create `RoomSettings` interface (frozen, aiEnabled)

#### 1.2 Add Role Helper Functions
- [ ] **File:** `src/lib/utils.ts`
  - Add `isTeacher(user: User | null): boolean`
  - Add `isStudent(session: StudentSession | null): boolean`
  - Add `getRoleFromUser(user: User | StudentSession | null): 'teacher' | 'student' | null`

#### 1.3 Update Existing Auth Hook
- [ ] **File:** `src/hooks/useAuth.ts`
  - Add `role: 'teacher'` to existing User objects (default all to teacher)
  - Ensure backward compatibility with existing Firebase Auth
  - Update return type to include role

### Unit Tests

- [ ] **File:** `src/lib/__tests__/utils.test.ts`
  ```typescript
  describe('Role Helpers', () => {
    test('isTeacher returns true for teacher role')
    test('isTeacher returns false for student role')
    test('isStudent returns true for student session')
    test('getRoleFromUser handles null inputs')
  })
  ```

### Acceptance Criteria
- ✅ All existing tests pass
- ✅ 4 new unit tests passing
- ✅ TypeScript compilation successful
- ✅ No breaking changes to existing auth flow
- ✅ All current users default to `role: 'teacher'`

---

## PR #2: Room Code System

**Branch:** `feature/room-codes`  
**Estimated Time:** 3-4 days  
**Dependencies:** PR #1  
**Goal:** Add 6-digit room code generation and validation

### Tasks

#### 2.1 Create Room Code Library
- [ ] **New File:** `src/lib/roomCode.ts`
  ```typescript
  // Generate unique 6-digit numeric code
  export async function generateRoomCode(): Promise<string>
  
  // Validate code format (6 digits, numeric only)
  export function validateRoomCode(code: string): ValidationResult
  
  // Check if code exists and get room ID
  export async function getRoomIdByCode(code: string): Promise<string | null>
  
  // Save code mapping to Firestore
  export async function saveRoomCodeMapping(code: string, roomId: string): Promise<void>
  ```

#### 2.2 Update Room Management
- [ ] **File:** `src/lib/roomManagement.ts`
  - Modify `createRoom()` to generate and save room code
  - Add room code to metadata on creation
  - Add collision detection with retry logic (max 3 attempts)

- [ ] **File:** `src/lib/paths.ts`
  - Add `getJoinPath(code: string): string` helper
  - Add route: `/join/[code]` support

#### 2.3 Update Room Creation UI
- [ ] **File:** `src/app/rooms/page.tsx`
  - Display generated room code prominently in success modal
  - Add "Share Code" button (copies to clipboard)
  - Show code in large, readable font

- [ ] **File:** `src/components/RoomHeader.tsx`
  - Replace "Share Link" with "Share Code" button
  - Show room code in header (optional, behind dropdown)

#### 2.4 Create Room Code Index
- [ ] **New Firestore Collection:** `roomCodes/{code}`
  ```javascript
  {
    code: "482931",
    roomId: "abc-xyz-123",
    createdAt: timestamp,
    createdBy: teacherId
  }
  ```

### Unit Tests

- [ ] **New File:** `src/lib/__tests__/roomCode.test.ts`
  ```typescript
  describe('generateRoomCode', () => {
    test('generates 6-digit numeric code')
    test('generates unique codes')
    test('retries on collision')
  })
  
  describe('validateRoomCode', () => {
    test('accepts valid 6-digit codes')
    test('rejects non-numeric codes')
    test('rejects codes with length != 6')
    test('rejects codes with spaces or special chars')
  })
  
  describe('getRoomIdByCode', () => {
    test('returns roomId for valid code')
    test('returns null for invalid code')
  })
  ```

### Integration Tests

- [ ] **File:** `src/lib/__tests__/roomManagement.test.ts` (update existing)
  ```typescript
  describe('Room Creation with Codes', () => {
    test('creates room with unique code')
    test('code mapping saved to Firestore')
    test('can retrieve room by code')
  })
  ```

### Acceptance Criteria
- ✅ 9 unit tests passing
- ✅ Room creation generates 6-digit code
- ✅ Code is unique (collision detection works)
- ✅ "Share Code" button copies to clipboard
- ✅ Code visible in room creation success modal
- ✅ Existing rooms continue to work (backward compatible)

---

## PR #3: Anonymous Student Authentication

**Branch:** `feature/student-auth`  
**Estimated Time:** 4-5 days  
**Dependencies:** PR #1, PR #2  
**Goal:** Enable students to join without Firebase Auth

### Tasks

#### 3.1 Create Student Auth Hook
- [ ] **New File:** `src/hooks/useStudentAuth.ts`
  ```typescript
  export function useStudentAuth(): {
    session: StudentSession | null;
    joinAsStudent: (roomCode: string, nickname: string) => Promise<void>;
    leaveRoom: () => Promise<void>;
    isExpired: boolean;
    error: string | null;
  }
  ```
  - Generate client-side session token (nanoid)
  - Store session in localStorage
  - Calculate expiry (joinedAt + 24h)
  - Write to Realtime DB: `/rooms/{roomId}/students/{sessionId}`

#### 3.2 Update Realtime Sync for Students
- [ ] **File:** `src/lib/realtimeSync.ts`
  - Add `updateStudentPresence(roomId, sessionId, nickname, color)` function
  - Add `updateStudentCursor(roomId, sessionId, cursor)` function
  - Add `markStudentOffline(roomId, sessionId)` function
  - Add `listenToStudents(roomId, callback)` function

#### 3.3 Update Cursors Hook for Dual Paths
- [ ] **File:** `src/hooks/useCursors.ts`
  - Check user role (teacher vs student)
  - Write to appropriate path:
    - Teacher: `/rooms/{roomId}/presence/{uid}/cursor`
    - Student: `/rooms/{roomId}/students/{sessionId}/cursor`
  - Listen to both paths for remote cursors

#### 3.4 Update Presence Hook for Students
- [ ] **File:** `src/hooks/usePresence.ts`
  - Add `useStudentPresence(roomId, session)` function
  - Listen to `/rooms/{roomId}/students` for student list
  - Combine teacher + student lists in UI

#### 3.5 Update Database Rules
- [ ] **File:** `database.rules.json`
  ```json
  "students": {
    ".read": "auth != null",
    "$sessionId": {
      ".write": "true",  // Allow anonymous writes
      ".validate": "!newData.hasChild('email') && !newData.hasChild('uid')",
      "nickname": { ".validate": "newData.isString()" },
      "expiresAt": { ".validate": "newData.isNumber()" }
    }
  }
  ```

### Unit Tests

- [ ] **New File:** `src/hooks/__tests__/useStudentAuth.test.ts`
  ```typescript
  describe('useStudentAuth', () => {
    test('generates session token on join')
    test('stores session in localStorage')
    test('calculates correct expiry (24h)')
    test('writes to correct Realtime DB path')
    test('cleans up on leave')
    test('detects expired sessions')
  })
  ```

### Integration Tests

- [ ] **File:** `src/__tests__/integration/studentAuth.test.ts` (new)
  ```typescript
  describe('Student Anonymous Join', () => {
    test('student joins with code and nickname')
    test('student data written to /rooms/{roomId}/students')
    test('no Firebase Auth UID created')
    test('session persists in localStorage')
  })
  ```

### Acceptance Criteria
- ✅ 6 unit tests passing
- ✅ 4 integration tests passing
- ✅ Student can join without Firebase Auth
- ✅ Session stored in localStorage
- ✅ Student presence written to Realtime DB
- ✅ No Firebase Auth UID for students
- ✅ Teachers and students can see each other's cursors

---

## PR #4: Nickname Filtering & Content Moderation

**Branch:** `feature/profanity-filter`  
**Estimated Time:** 2-3 days  
**Dependencies:** PR #3  
**Goal:** Validate student nicknames for inappropriate content

### Tasks

#### 4.1 Install Profanity Filter Library
- [ ] **File:** `package.json`
  ```json
  {
    "dependencies": {
      "bad-words": "^3.0.4"
    }
  }
  ```

#### 4.2 Create Content Moderation Library
- [ ] **New File:** `src/lib/contentModeration.ts`
  ```typescript
  export function containsProfanity(text: string): boolean
  export function sanitizeText(text: string): string
  export function validateNickname(nickname: string): ValidationResult
  export async function getCustomWordList(roomId: string): Promise<string[]>
  export function addCustomWord(roomId: string, word: string): Promise<void>
  ```
  - Use `bad-words` npm package
  - Add custom word list support per room
  - Validate nickname: 2-20 chars, alphanumeric + spaces only

#### 4.3 Integrate into Student Join Flow
- [ ] **File:** `src/hooks/useStudentAuth.ts`
  - Validate nickname before creating session
  - Return helpful error messages:
    - "This nickname is not allowed. Please choose a different one."
    - "Nicknames must be 2-20 characters long."

### Unit Tests

- [ ] **New File:** `src/lib/__tests__/contentModeration.test.ts`
  ```typescript
  describe('validateNickname', () => {
    test('accepts clean nicknames')
    test('rejects profanity')
    test('rejects empty nicknames')
    test('rejects nicknames < 2 chars')
    test('rejects nicknames > 20 chars')
    test('rejects special characters')
    test('allows spaces and hyphens')
  })
  
  describe('Custom Word Lists', () => {
    test('loads custom words for room')
    test('respects teacher-added words')
  })
  ```

### Acceptance Criteria
- ✅ 8 unit tests passing
- ✅ Profanity filter rejects inappropriate nicknames
- ✅ Helpful error messages shown to students
- ✅ Length validation (2-20 chars)
- ✅ Character validation (alphanumeric + spaces only)
- ✅ Teachers can add custom blocked words (future enhancement ready)

---

## PR #5: Teacher Moderation Tools

**Branch:** `feature/moderation-tools`  
**Estimated Time:** 4-5 days  
**Dependencies:** PR #3  
**Goal:** Add freeze, clear, and enhanced kick controls

### Tasks

#### 5.1 Add Freeze Canvas Logic
- [ ] **File:** `src/lib/realtimeSync.ts`
  ```typescript
  export async function freezeCanvas(roomId: string, frozen: boolean): Promise<void>
  export function listenToFreezeState(roomId: string, callback: (frozen: boolean) => void)
  ```
  - Write to `/rooms/{roomId}/settings/frozen`
  - Listen for freeze state changes

#### 5.2 Add Clear Canvas Function
- [ ] **File:** `src/lib/firestoreSync.ts`
  ```typescript
  export async function clearAllShapes(roomId: string): Promise<void>
  ```
  - Delete all documents in `/rooms/{roomId}/shapes`
  - Require teacher role verification

#### 5.3 Create Moderation Panel Component
- [ ] **New File:** `src/components/ModerationPanel.tsx`
  - Display list of active students
  - "Freeze Canvas" toggle button
  - "Clear Canvas" button (with confirmation)
  - Kick button next to each student
  - Student join times and activity status

#### 5.4 Update Room Header
- [ ] **File:** `src/components/RoomHeader.tsx`
  - Add "Moderation" button (teacher only)
  - Opens ModerationPanel modal
  - Show student count badge

#### 5.5 Update Canvas Component
- [ ] **File:** `src/components/CollabCanvas.tsx`
  - Listen to freeze state
  - Disable shape editing for students when frozen
  - Show banner: "🔒 Canvas locked by teacher"
  - Allow teacher editing even when frozen

#### 5.6 Update Shapes Hook
- [ ] **File:** `src/hooks/useShapes.ts`
  - Check freeze state before syncing student edits
  - Allow teacher edits regardless of freeze state

#### 5.7 Update Database Schema
- [ ] **File:** `database.rules.json`
  ```json
  "settings": {
    ".read": "auth != null",
    ".write": "auth != null",  // Teacher verification in app logic
    "frozen": { ".validate": "newData.isBoolean()" }
  }
  ```

### Unit Tests

- [ ] **New File:** `src/lib/__tests__/moderation.test.ts`
  ```typescript
  describe('Freeze Canvas', () => {
    test('sets freeze state in Realtime DB')
    test('freeze state propagates to listeners')
    test('teacher can edit when frozen')
    test('student cannot edit when frozen')
  })
  
  describe('Clear Canvas', () => {
    test('deletes all shapes from Firestore')
    test('requires teacher role')
  })
  ```

### Integration Tests

- [ ] **Update:** `src/__tests__/integration/teacherStudent.test.ts`
  ```typescript
  describe('Moderation', () => {
    test('teacher freezes → student edits blocked')
    test('teacher clears → all shapes removed')
    test('teacher kicks → student banned 5min')
  })
  ```

### Acceptance Criteria
- ✅ 4 unit tests passing
- ✅ 3 integration tests passing
- ✅ Freeze prevents student edits
- ✅ Teacher can edit when frozen
- ✅ Clear removes all shapes
- ✅ Confirmation modal prevents accidental clear
- ✅ Student sees "Canvas locked" banner

---

## PR #6: AI Access Control

**Branch:** `feature/ai-restriction`  
**Estimated Time:** 2 days  
**Dependencies:** PR #1  
**Goal:** Restrict FloatingChat to teachers only

### Tasks

#### 6.1 Update FloatingChat Component
- [ ] **File:** `src/components/FloatingChat.tsx`
  - Add `userRole: 'teacher' | 'student'` prop
  - Add `roomSettings?: RoomMetadata` prop
  - Return `null` if `userRole !== 'teacher'`
  - Return `null` if `roomSettings?.aiEnabled === false`

#### 6.2 Update CollabCanvas Component
- [ ] **File:** `src/components/CollabCanvas.tsx`
  - Pass user role to FloatingChat
  - Pass roomMetadata to FloatingChat
  - Add role check before rendering FloatingChat

#### 6.3 Add AI Toggle to Room Settings
- [ ] **File:** `src/components/RoomSettings.tsx`
  - Add "Enable AI Assistant" checkbox
  - Update `aiEnabled` field in Firestore metadata
  - Default to `true` for backward compatibility

### Unit Tests

- [ ] **Update:** `src/components/__tests__/FloatingChat.test.ts`
  ```typescript
  describe('AI Access Control', () => {
    test('renders for teacher when aiEnabled=true')
    test('hidden for teacher when aiEnabled=false')
    test('hidden for students')
    test('toggle in room settings updates aiEnabled')
  })
  ```

### Acceptance Criteria
- ✅ 4 unit tests passing
- ✅ FloatingChat visible only to teachers
- ✅ AI toggle works in room settings
- ✅ Students cannot see or access AI
- ✅ Existing rooms default to AI enabled

---

## PR #7: Session Management & TTL

**Branch:** `feature/session-management`  
**Estimated Time:** 3-4 days  
**Dependencies:** PR #3  
**Goal:** Auto-expire student sessions and handle timeouts

### Tasks

#### 7.1 Create Session Management Library
- [ ] **New File:** `src/lib/sessionManagement.ts`
  ```typescript
  export function isSessionExpired(joinedAt: number): boolean
  export function isInactive(lastActivity: number, timeoutMs: number): boolean
  export async function cleanupExpiredSessions(roomId: string): Promise<void>
  export function getTimeUntilExpiry(expiresAt: number): string
  ```

#### 7.2 Add Activity Tracking Hook
- [ ] **File:** `src/hooks/usePresence.ts`
  - Add `useActivityTracking()` hook
  - Track mouse movement, keyboard input
  - Update `lastActivity` timestamp in Realtime DB
  - Throttle updates (30 seconds)

#### 7.3 Add Session Timeout Hook
- [ ] **File:** `src/hooks/useStudentAuth.ts`
  - Add `useSessionTimeout()` hook
  - Check expiry on mount and every 5 minutes
  - Show toast warning at 30 minutes before timeout
  - Redirect to `/join` on timeout

#### 7.4 Implement Firebase TTL
- [ ] **File:** `database.rules.json`
  ```json
  "students": {
    "$sessionId": {
      ".expires": "data.child('expiresAt').val()"
    }
  }
  ```
  - Note: Firebase Realtime DB doesn't support native TTL
  - Alternative: Cloud Function to clean up expired sessions
  - For Phase 1: Client-side cleanup on join + manual script

#### 7.5 Add Auto-Clear on Logout Option
- [ ] **File:** `src/components/RoomSettings.tsx`
  - Add "Clear canvas when I leave" checkbox
  - Save preference to room metadata
  - Implement in logout handler

### Unit Tests

- [ ] **New File:** `src/lib/__tests__/sessionManagement.test.ts`
  ```typescript
  describe('Session Expiry', () => {
    test('detects expired sessions (24h)')
    test('detects sessions expiring soon (30min)')
    test('calculates time until expiry')
  })
  
  describe('Activity Tracking', () => {
    test('updates lastActivity on mouse move')
    test('detects inactive users (4h)')
  })
  ```

### Acceptance Criteria
- ✅ 5 unit tests passing
- ✅ Sessions expire after 24 hours
- ✅ Warning shown 30 min before timeout
- ✅ Redirect to `/join` on timeout
- ✅ Activity tracking updates lastActivity
- ✅ Auto-clear on logout works (if enabled)

---

## PR #8: Compliance Enforcement & Auditing

**Branch:** `feature/compliance`  
**Estimated Time:** 3 days  
**Dependencies:** PR #3, PR #7  
**Goal:** Ensure COPPA/FERPA compliance at all levels

### Tasks

#### 8.1 Create Compliance Library
- [ ] **New File:** `src/lib/compliance.ts`
  ```typescript
  export function isComplianceViolation(userData: any): {
    compliant: boolean;
    violations: string[];
  }
  
  export async function auditStudentData(roomId: string): Promise<{
    hasEmailAddresses: boolean;
    hasNames: boolean;
    hasPersistentIds: boolean;
    violations: string[];
  }>
  
  export async function enforceDataRetention(roomId: string): Promise<void>
  
  export async function generateComplianceReport(): Promise<ComplianceReport>
  ```

#### 8.2 Update Firestore Rules
- [ ] **File:** `firestore.rules`
  ```javascript
  match /rooms/{roomId}/students/{sessionId} {
    allow write: if !request.resource.data.keys().hasAny([
      'email', 'uid', 'name', 'phoneNumber', 'address'
    ]);
  }
  ```

#### 8.3 Update Realtime DB Rules
- [ ] **File:** `database.rules.json`
  ```json
  "students": {
    "$sessionId": {
      ".validate": "!newData.hasChild('email') && !newData.hasChild('uid')"
    }
  }
  ```

#### 8.4 Create Audit Script
- [ ] **New File:** `scripts/audit-compliance.ts`
  - Scan all rooms for student PII
  - Check for email addresses
  - Check for persistent identifiers
  - Generate report

### Unit Tests

- [ ] **New File:** `src/lib/__tests__/compliance.test.ts`
  ```typescript
  describe('COPPA Compliance', () => {
    test('detects email in student data')
    test('detects Firebase UID in student data')
    test('detects persistent identifiers')
    test('accepts compliant student session')
  })
  
  describe('Compliance Audit', () => {
    test('audit finds violations')
    test('audit passes for clean data')
    test('generates compliance report')
  })
  ```

### Integration Tests

- [ ] **New File:** `src/__tests__/integration/compliance.test.ts`
  ```typescript
  describe('COPPA/FERPA Compliance', () => {
    test('no student email in Firestore after join')
    test('no student UID in Realtime DB after join')
    test('student data structure is compliant')
    test('audit script detects test violations')
  })
  ```

### Acceptance Criteria
- ✅ 8 unit tests passing
- ✅ 4 integration tests passing
- ✅ Firebase rules prevent PII writes
- ✅ Audit script runs successfully
- ✅ Zero violations in production data
- ✅ Compliance report generated

---

## PR #9: Student Join Flow UI

**Branch:** `feature/student-join-ui`  
**Estimated Time:** 3-4 days  
**Dependencies:** PR #2, PR #3, PR #4  
**Goal:** Create polished student join experience

### Tasks

#### 9.1 Create Landing Page Route
- [ ] **New File:** `src/app/join/page.tsx`
  - Two prominent buttons: "Join as Teacher" / "Join as Student"
  - JellyBoard logo and branding
  - Kid-friendly design (bright colors, playful fonts)

#### 9.2 Create Student Join Component
- [ ] **New File:** `src/components/StudentJoinFlow.tsx`
  ```typescript
  export default function StudentJoinFlow({
    onJoinSuccess: (session: StudentSession) => void;
    onError: (error: string) => void;
  })
  ```
  - Room code input (6-digit, large numbers)
  - Nickname input (validated)
  - "Join Classroom" button
  - Error states (invalid code, inappropriate nickname)
  - Loading state

#### 9.3 Create Join-by-Code Route
- [ ] **New File:** `src/app/join/[code]/page.tsx`
  - Pre-fill room code if provided in URL
  - Only prompt for nickname
  - Redirect to canvas on success

#### 9.4 Update Landing Page
- [ ] **File:** `src/app/page.tsx`
  - Redirect to `/join` instead of `/rooms`
  - Or show choice: "Are you a teacher or student?"

#### 9.5 Update AuthModal for Teachers
- [ ] **File:** `src/components/AuthModal.tsx`
  - Add "Join as Student" link at bottom
  - Keep existing Google/Anonymous teacher flow

### UI/UX Tests (Manual)

- [ ] Room code input auto-formats (adds spaces every 3 digits)
- [ ] Enter key submits form
- [ ] Error messages are friendly and helpful
- [ ] Loading spinners shown during validation
- [ ] Success animation on join
- [ ] Mobile responsive (tested on iPad/Chromebook)

### Acceptance Criteria
- ✅ Student can join in < 15 seconds
- ✅ Room code input is intuitive (large, clear)
- ✅ Error messages are kid-friendly
- ✅ Mobile responsive design
- ✅ Smooth animations and transitions
- ✅ Accessible (keyboard navigation, screen readers)

---

## PR #10: Integration Testing & Final Polish

**Branch:** `feature/integration-tests`  
**Estimated Time:** 3-4 days  
**Dependencies:** All previous PRs  
**Goal:** Comprehensive end-to-end testing and bug fixes

### Tasks

#### 10.1 Create Full Integration Test Suite
- [ ] **New File:** `src/__tests__/integration/teacherStudent.test.ts`
  ```typescript
  describe('Full Teacher-Student Workflow', () => {
    test('teacher creates room → gets code')
    test('student joins with code + nickname')
    test('both users see each other')
    test('both can draw shapes')
    test('shapes sync in real-time')
    test('teacher uses AI → student sees shapes')
    test('teacher freezes → student blocked')
    test('teacher clears → all shapes removed')
    test('teacher kicks → student banned')
    test('student rejoins after 5min')
    test('session expires after 24h')
  })
  ```

#### 10.2 Manual E2E Test Scenarios
- [ ] **Scenario 1:** Teacher creates room
  - Create room
  - Verify code displayed
  - Copy code to clipboard
  - Share code with "student" (incognito tab)

- [ ] **Scenario 2:** Student joins anonymously
  - Open incognito tab
  - Navigate to `/join`
  - Enter code
  - Enter nickname "Alex"
  - Verify canvas loads
  - Verify no AI button visible

- [ ] **Scenario 3:** Collaboration
  - Teacher draws rectangle
  - Student draws circle
  - Both shapes visible to both users
  - Cursors visible in real-time

- [ ] **Scenario 4:** Moderation
  - Teacher opens moderation panel
  - Verify "Alex" listed as active
  - Freeze canvas
  - Verify student sees "Canvas locked"
  - Try to draw as student (should fail)
  - Unfreeze
  - Clear all shapes
  - Verify confirmation modal
  - Kick Alex
  - Verify Alex redirected with message

- [ ] **Scenario 5:** Compliance verification
  - Open Firebase Console
  - Check Realtime DB `/rooms/{roomId}/students`
  - Verify no `email` or `uid` fields
  - Check Firestore
  - Verify no student PII
  - Wait 24 hours
  - Verify student data deleted

#### 10.3 Bug Fixes & Polish
- [ ] Fix any bugs discovered during testing
- [ ] Optimize performance (cursor throttling, shape debouncing)
- [ ] Add loading states where missing
- [ ] Improve error messages
- [ ] Add analytics events (teacher-only)
- [ ] Update documentation

#### 10.4 Update Memory Bank
- [ ] Update `memory/ACTIVE_CONTEXT.md` with new schemas
- [ ] Update `memory/PROJECT_BRIEF.md` with JellyBoard status
- [ ] Update `memory/TASKS.md` to reflect completion
- [ ] Update `README.md` with JellyBoard features

### Acceptance Criteria
- ✅ All 11 integration tests passing
- ✅ All 5 manual E2E scenarios completed
- ✅ Zero critical bugs
- ✅ Performance targets met (< 50ms cursor, < 100ms shapes)
- ✅ All documentation updated
- ✅ Ready for beta launch

---

## Testing Summary

### Unit Tests (22 new)
- ✅ PR #0: 10 tests (drag sync) ⭐ CRITICAL
- ✅ PR #1: 4 tests (role helpers)
- ✅ PR #2: 9 tests (room codes)
- ✅ PR #3: 6 tests (student auth)
- ✅ PR #4: 8 tests (profanity filter)
- ✅ PR #5: 4 tests (moderation)
- ✅ PR #6: 4 tests (AI access)
- ✅ PR #7: 5 tests (session management)
- ✅ PR #8: 8 tests (compliance)
- **Total: 58 unit tests**

### Integration Tests (13 new)
- ✅ PR #0: 5 tests (drag collaboration) ⭐ CRITICAL
- ✅ PR #3: 4 tests (student auth flow)
- ✅ PR #5: 3 tests (moderation)
- ✅ PR #8: 4 tests (compliance verification)
- ✅ PR #10: 11 tests (full workflow)
- **Total: 27 integration tests**

### Manual E2E Tests
- ✅ PR #0: 2 manual tests (drag latency, load test) ⭐ CRITICAL
- ✅ PR #10: 5 comprehensive scenarios
- **Total: 7 E2E workflows**

---

## Timeline

### Week 1
- **Days 1-2:** PR #0 (Real-Time Drag Sync) ⭐ CRITICAL
- **Days 3-4:** PR #1 (Role System)
- **Day 5:** PR #2 (Room Codes) - Start

### Week 2
- **Days 1-2:** PR #2 (Room Codes) - Complete
- **Days 3-5:** PR #3 (Student Auth)

### Week 3
- **Day 1:** PR #4 (Profanity Filter)
- **Days 2-4:** PR #5 (Moderation Tools)
- **Day 5:** PR #6 (AI Access Control)

### Week 4
- **Days 1-3:** PR #7 (Session Management)
- **Days 4-5:** PR #8 (Compliance)

### Week 5
- **Days 1-3:** PR #9 (Student Join UI)
- **Days 4-5:** PR #10 (Integration Testing)

### Week 6 (Buffer)
- Bug fixes
- Documentation
- Beta testing with 5-10 teachers
- Iterate based on feedback

---

## Success Criteria (All PRs)

### Technical
- ✅ All 85 tests passing (58 unit + 27 integration)
- ✅ Real-time drag latency < 100ms verified
- ✅ Zero TypeScript errors
- ✅ Zero linting errors
- ✅ Build succeeds without warnings
- ✅ No breaking changes to existing CollabCanvas features

### Functional
- ✅ Dragged shapes visible in real-time (60Hz updates) ⭐ CRITICAL
- ✅ Teacher can create room with code in < 30 seconds
- ✅ Student can join anonymously in < 15 seconds
- ✅ Moderation actions execute in < 2 seconds
- ✅ AI only accessible to teachers
- ✅ Sessions expire after 24 hours
- ✅ Freeze prevents 100% of student edits

### Compliance
- ✅ Zero student PII in Firebase (verified via audit)
- ✅ 100% COPPA compliant
- ✅ 100% FERPA compliant
- ✅ Firebase rules enforce compliance at database level

### User Experience
- ✅ Mobile responsive (iPad, Chromebook tested)
- ✅ Accessible (keyboard nav, screen readers)
- ✅ Kid-friendly UI (JellyBoard branding)
- ✅ Error messages are helpful and friendly
- ✅ Loading states on all async operations

---

## Post-Implementation Checklist

- [ ] Deploy to staging environment
- [ ] Run compliance audit
- [ ] Invite 5-10 beta teachers
- [ ] Create teacher onboarding guide
- [ ] Create video tutorial (3-5 min)
- [ ] Update privacy policy
- [ ] Legal review (COPPA/FERPA)
- [ ] Performance testing (50+ students)
- [ ] Load testing (10+ rooms concurrent)
- [ ] Deploy to production
- [ ] Monitor Firebase quotas
- [ ] Gather feedback
- [ ] Iterate for Phase 2

---

**Document Status:** Ready for Implementation  
**Last Updated:** October 17, 2025  
**Total PRs:** 10  
**Estimated Timeline:** 4-6 weeks  
**Test Coverage:** 70 new tests (48 unit + 22 integration)

