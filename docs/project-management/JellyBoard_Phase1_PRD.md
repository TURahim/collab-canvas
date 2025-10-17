# JellyBoard Phase 1 - Product Requirements Document

**Version:** 1.0  
**Date:** October 17, 2025  
**Status:** Planning  
**Project Type:** Evolution of CollabCanvas MVP

---

## 1. Project Overview

### Context
JellyBoard is the evolution of CollabCanvas into a classroom-safe, real-time collaborative whiteboard designed specifically for K-8 education (students ages 7-13). With Google Jamboard sunsetting in 2024, JellyBoard fills the gap with a COPPA/FERPA-compliant solution built for teachers and loved by kids.

### Target Audience
- **Primary:** K-8 classroom teachers
- **Secondary:** Students ages 7-13
- **Environment:** In-person and remote classrooms, Chromebooks, iPads, touch devices

### Phase 1 Scope
Transform the existing CollabCanvas codebase to support:
1. **Teacher-controlled rooms** with unique 6-digit codes
2. **Anonymous student access** (no accounts or emails required)
3. **Teacher moderation tools** (freeze, clear, kick)
4. **Teacher-only AI access** (Flippy assistant restricted)
5. **COPPA/FERPA compliance** (no student PII storage)
6. **Session management** (auto-cleanup, timeouts)

### What's NOT in Phase 1
- Student-facing AI features
- Advanced analytics dashboard
- Third-party LMS integrations
- Video/voice chat
- Mobile native apps

### Timeline Estimate
**4-6 weeks** for full implementation, testing, and deployment

### Success Criteria
- Teachers can create and share rooms in < 30 seconds
- Students can join anonymously in < 15 seconds
- 100% COPPA/FERPA compliance verified
- All 26 unit + integration tests passing
- Zero student PII leaks in Firebase audit

---

## 2. User Roles & Access Model

### Teacher Role (Authenticated)
**Authentication:** Firebase Auth (Google Sign-In or Anonymous with email)

**Capabilities:**
- Create rooms with unique 6-digit codes
- Full room ownership and moderation
- Access to AI assistant (Flippy)
- View all students in room
- Kick/ban students (5-minute timeout)
- Freeze canvas (disable student editing)
- Clear all shapes
- Toggle AI on/off for room
- Export canvas to PNG/SVG
- Room settings (rename, delete, public/private)

**Data Storage:**
- User profile in Firebase Auth
- Room ownership in Firestore
- Persistent presence in Realtime DB

### Student Role (Anonymous)
**Authentication:** Temporary session token (no Firebase Auth)

**Capabilities:**
- Join room via 6-digit code
- Choose nickname (validated, no PII)
- Draw shapes, text, arrows
- See other users' cursors
- Collaborate in real-time
- Basic canvas tools (pan, zoom, select)

**Restrictions:**
- No AI access (FloatingChat hidden)
- No room settings access
- No export functionality
- No moderation controls
- Session expires after 24 hours

**Data Storage:**
- Session token only (localStorage, temporary)
- Nickname in Realtime DB with 24h TTL
- No Firebase Auth UID
- No persistent identifiers

---

## 3. Core Features (Implementation-Focused)

### Feature 1: Room Code System

**Current State:** CollabCanvas uses random alphanumeric room IDs (e.g., `mgt3oppl-qvumldmw`)

**New Behavior:**
- Teachers generate 6-digit numeric codes (e.g., `482931`)
- Codes are unique, validated on creation
- Students join via `/join/[code]` route
- Collision detection with retry logic

**Implementation:**

**New File: `src/lib/roomCode.ts`**
```typescript
/**
 * Generate unique 6-digit numeric room code
 * Checks Firestore for collisions
 */
export async function generateRoomCode(): Promise<string>

/**
 * Validate room code format and existence
 */
export function validateRoomCode(code: string): ValidationResult

/**
 * Get room ID from room code
 */
export async function getRoomIdByCode(code: string): Promise<string | null>
```

**Modified Files:**
- `src/lib/paths.ts` - Add `getJoinPath(code: string)` helper
- `src/lib/roomManagement.ts` - Add `roomCode` field to metadata
- `src/types/room.ts` - Add `roomCode: string` to RoomMetadata interface

**UI Changes:**
- Room creation modal displays generated code prominently
- "Share Code" button replaces "Share Link" in RoomHeader
- New route: `/join` page with code entry form

**Testing:**
```typescript
// src/lib/__tests__/roomCode.test.ts
describe('roomCode', () => {
  test('generates 6-digit numeric code')
  test('validates code format')
  test('detects collisions and retries')
  test('rejects invalid formats (letters, 5-digit, 7-digit)')
})
```

---

### Feature 2: Anonymous Student Access

**Current State:** All users authenticate via Firebase Anonymous Auth

**New Behavior:**
- Students choose "Join as Student" on landing page
- Enter room code + nickname (no email/password)
- Temporary session token generated client-side
- No Firebase Auth UID created
- Session persists in localStorage until logout or 24h timeout

**Implementation:**

**New File: `src/hooks/useStudentAuth.ts`**
```typescript
interface StudentSession {
  sessionId: string;      // nanoid()
  nickname: string;
  roomCode: string;
  joinedAt: number;
  expiresAt: number;      // joinedAt + 24h
  color: string;
}

/**
 * Hook for student anonymous authentication
 */
export function useStudentAuth(): {
  session: StudentSession | null;
  joinAsStudent: (roomCode: string, nickname: string) => Promise<void>;
  leaveRoom: () => Promise<void>;
  isExpired: boolean;
}
```

**New File: `src/components/StudentJoinFlow.tsx`**
- Room code input (6-digit numeric)
- Nickname input (validated, max 20 chars)
- "Join Classroom" button
- Error states for invalid code/nickname

**Modified Files:**
- `src/hooks/useAuth.ts` - Add `isTeacher()` check, dual auth paths
- `src/components/AuthModal.tsx` - Add "Join as Student" vs "Join as Teacher" toggle
- `src/types/index.ts` - Add StudentSession type
- `src/lib/firebase.ts` - Add client-side session token generation

**Database Schema:**
```
// Realtime DB
rooms/{roomId}/students/{sessionId}/
  nickname: string
  color: string
  joinedAt: number
  lastSeen: number
  cursor: { x, y, lastSeen }
  .ttl: 86400000  // 24 hours in ms
```

**Testing:**
```typescript
// src/hooks/__tests__/useStudentAuth.test.ts
describe('useStudentAuth', () => {
  test('generates session token on join')
  test('stores session in localStorage')
  test('validates nickname (no profanity)')
  test('rejects invalid room codes')
  test('expires session after 24h')
  test('cleans up on leave')
})
```

---

### Feature 3: Teacher Moderation Tools

**Current State:** Teachers can only kick users (5-min ban)

**New Behavior:**
- **Freeze Canvas:** Disables all student editing (read-only mode)
- **Clear Canvas:** Removes all shapes (confirmation required)
- **Timeout Student:** Kicks student with 5-min ban (existing)
- **View Student List:** See all active students with join times

**Implementation:**

**New File: `src/components/ModerationPanel.tsx`**
```typescript
interface ModerationPanelProps {
  roomId: string;
  isOpen: boolean;
  onClose: () => void;
  students: StudentPresence[];
  isFrozen: boolean;
  onToggleFreeze: () => void;
  onClearCanvas: () => void;
  onKickStudent: (sessionId: string) => void;
}
```

**New Functions in `src/lib/realtimeSync.ts`:**
```typescript
/**
 * Freeze canvas for all students
 */
export async function freezeCanvas(roomId: string, frozen: boolean): Promise<void>

/**
 * Listen to canvas freeze state
 */
export function listenToFreezeState(roomId: string, callback: (frozen: boolean) => void)

/**
 * Clear all shapes for a room (teacher only)
 */
export async function clearAllShapes(roomId: string): Promise<void>
```

**Modified Files:**
- `src/components/RoomHeader.tsx` - Add "Moderation" button (teacher only)
- `src/components/CollabCanvas.tsx` - Disable editing when frozen (student view)
- `src/hooks/useShapes.ts` - Check freeze state before syncing student edits

**Database Schema:**
```
// Realtime DB
rooms/{roomId}/settings/
  frozen: boolean
  lastFrozenBy: string (teacherId)
  lastFrozenAt: number
```

**UI States:**
- **Frozen (Student View):** Banner at top: "🔒 Canvas locked by teacher"
- **Frozen (Teacher View):** "Unfreeze Canvas" button in moderation panel
- **Clear Confirmation:** Modal with "Type CLEAR to confirm" input

**Testing:**
```typescript
// src/lib/__tests__/moderation.test.ts
describe('moderation', () => {
  test('freeze prevents student edits')
  test('freeze allows teacher edits')
  test('clear removes all shapes')
  test('kick bans student for 5 minutes')
  test('student sees frozen banner')
})
```

---

### Feature 4: Nickname Filtering

**Current State:** No content moderation

**New Behavior:**
- Profanity filter applied to student nicknames
- Configurable word list (teacher can add custom words)
- Auto-rejection with helpful error message
- Optional: Filter AI prompts (teacher-only feature)

**Implementation:**

**New File: `src/lib/contentModeration.ts`**
```typescript
/**
 * Check if text contains inappropriate words
 */
export function containsProfanity(text: string): boolean

/**
 * Get sanitized version of text (replaces bad words with ***)
 */
export function sanitizeText(text: string): string

/**
 * Validate nickname (length, profanity, special chars)
 */
export function validateNickname(nickname: string): ValidationResult

/**
 * Load custom word list for room (teacher-configured)
 */
export async function getCustomWordList(roomId: string): Promise<string[]>
```

**Dependencies:**
- Use existing library: `bad-words` npm package (14KB, MIT license)
- Supports multiple languages
- Customizable word list per room

**Modified Files:**
- `src/components/StudentJoinFlow.tsx` - Validate nickname before join
- `src/types/room.ts` - Add `customWordList?: string[]` to RoomMetadata

**Error Messages:**
- "This nickname is not allowed. Please choose a different one."
- "Nicknames must be 2-20 characters long."
- "Nicknames can only contain letters, numbers, and spaces."

**Testing:**
```typescript
// src/lib/__tests__/contentModeration.test.ts
describe('contentModeration', () => {
  test('detects profanity in nicknames')
  test('allows clean nicknames')
  test('respects custom word list')
  test('validates nickname length')
  test('sanitizes text output')
})
```

---

### Feature 5: AI Access Control

**Current State:** All authenticated users can access FloatingChat (Flippy)

**New Behavior:**
- FloatingChat visible only to teachers
- Students don't see AI toggle button
- Teacher can disable AI for entire room
- AI commands execute only for teacher actions

**Implementation:**

**Modified Files:**

**`src/components/FloatingChat.tsx`**
```typescript
interface FloatingChatProps {
  editor: Editor | null;
  userRole: 'teacher' | 'student';  // NEW
  roomSettings?: { aiEnabled: boolean };  // NEW
}

// Add role check
if (userRole !== 'teacher' || !roomSettings?.aiEnabled) {
  return null;  // Don't render for students
}
```

**`src/components/CollabCanvas.tsx`**
```typescript
// Pass user role to FloatingChat
<FloatingChat 
  editor={editor} 
  userRole={user?.role ?? 'student'}
  roomSettings={roomMetadata}
/>
```

**`src/components/RoomSettings.tsx`**
```typescript
// Add AI toggle in room settings modal
<label>
  <input 
    type="checkbox" 
    checked={aiEnabled}
    onChange={handleToggleAI}
  />
  Enable AI Assistant (Flippy)
</label>
```

**Modified Database Schema:**
```typescript
// src/types/room.ts
interface RoomMetadata {
  // ... existing fields
  aiEnabled: boolean;  // NEW - default true for backward compat
}
```

**Testing:**
```typescript
// src/components/__tests__/FloatingChat.test.ts
describe('FloatingChat AI Access', () => {
  test('renders for teachers when aiEnabled=true')
  test('hidden for students')
  test('hidden for teachers when aiEnabled=false')
  test('room settings toggle updates aiEnabled')
})
```

---

### Feature 6: Session Management

**Current State:** Users stay online indefinitely until manual logout

**New Behavior:**
- **Student Sessions:** Auto-expire after 24 hours
- **Inactivity Timeout:** 4 hours of no activity (configurable)
- **Teacher Preference:** "Clear canvas on logout" option
- **Auto-cleanup:** Firebase TTL for student data

**Implementation:**

**New Functions in `src/hooks/usePresence.ts`:**
```typescript
/**
 * Monitor session expiry and timeout
 */
export function useSessionTimeout(
  userRole: 'teacher' | 'student',
  sessionStart: number,
  onTimeout: () => void
): void

/**
 * Track user activity (mouse, keyboard)
 */
export function useActivityTracking(): {
  lastActivity: number;
  resetActivity: () => void;
}
```

**New File: `src/lib/sessionManagement.ts`**
```typescript
/**
 * Check if student session is expired (24h)
 */
export function isSessionExpired(joinedAt: number): boolean

/**
 * Check if user is inactive (4h default)
 */
export function isInactive(lastActivity: number, timeoutMs: number): boolean

/**
 * Clean up expired student sessions
 */
export async function cleanupExpiredSessions(roomId: string): Promise<void>
```

**Firebase Realtime DB TTL Configuration:**
```json
// database.rules.json
"students": {
  "$sessionId": {
    ".write": "...",
    ".expires": "data.child('expiresAt').val()"
  }
}
```

**UI Notifications:**
- **30 min before timeout:** Toast notification "Your session will expire in 30 minutes"
- **On timeout:** Redirect to `/join` with message "Your session has expired. Please rejoin."

**Testing:**
```typescript
// src/lib/__tests__/sessionManagement.test.ts
describe('sessionManagement', () => {
  test('detects expired sessions (24h)')
  test('detects inactive users (4h)')
  test('sends warning at 30min before timeout')
  test('redirects on timeout')
  test('cleans up student data after expiry')
})
```

---

## 4. Compliance Requirements

### COPPA (Children's Online Privacy Protection Act)

**Requirements for Under-13 Users:**
1. No personal information collection without parental consent
2. No email addresses or names stored
3. No persistent tracking or cookies
4. No behavioral advertising
5. Data deletion within reasonable timeframe

**JellyBoard Implementation:**
- ✅ Students use nicknames only (no real names)
- ✅ No email collection for students
- ✅ No Firebase Auth UID for students (anonymous session tokens)
- ✅ No analytics tracking for student actions
- ✅ No third-party cookies or trackers
- ✅ 24-hour automatic data deletion
- ✅ No ads or marketing

### FERPA (Family Educational Rights and Privacy Act)

**Requirements for Educational Records:**
1. Educational records must be protected
2. Parents have right to access records
3. Schools must have written permission to release records
4. Records must be destroyed when no longer needed

**JellyBoard Implementation:**
- ✅ No educational records stored (drawings are ephemeral)
- ✅ No personally identifiable information linked to students
- ✅ Teacher owns all room data (can export/delete)
- ✅ Automatic cleanup after 24 hours
- ✅ No third-party data sharing

### Implementation

**New File: `src/lib/compliance.ts`**
```typescript
/**
 * Check if user data is COPPA compliant
 */
export function isComplianceViolation(userData: any): {
  compliant: boolean;
  violations: string[];
}

/**
 * Audit Firebase for student PII leaks
 */
export async function auditStudentData(roomId: string): Promise<{
  hasEmailAddresses: boolean;
  hasNames: boolean;
  hasPersistentIds: boolean;
  violations: string[];
}>

/**
 * Enforce TTL on student data
 */
export async function enforceDataRetention(roomId: string): Promise<void>

/**
 * Generate compliance report for district
 */
export async function generateComplianceReport(): Promise<ComplianceReport>
```

**Modified Firebase Rules:**

**`database.rules.json`**
```json
{
  "rules": {
    "rooms": {
      "$roomId": {
        "students": {
          "$sessionId": {
            ".read": "auth != null",
            ".write": "$sessionId === $sessionId",
            ".validate": "!newData.hasChild('email') && !newData.hasChild('uid')",
            "nickname": {
              ".validate": "newData.isString() && newData.val().length >= 2 && newData.val().length <= 20"
            },
            "expiresAt": {
              ".validate": "newData.isNumber() && newData.val() <= now + 86400000"
            }
          }
        }
      }
    }
  }
}
```

**`firestore.rules`**
```javascript
// Prevent student PII in Firestore
match /rooms/{roomId}/students/{sessionId} {
  allow write: if !request.resource.data.keys().hasAny(['email', 'uid', 'name', 'phoneNumber']);
}
```

**Privacy Policy Updates:**
- Add "Student Privacy" section
- Link to COPPA/FERPA compliance documentation
- Provide contact for data deletion requests
- Include district-friendly privacy language

**Testing:**
```typescript
// src/lib/__tests__/compliance.test.ts
describe('COPPA Compliance', () => {
  test('no email addresses stored for students')
  test('no Firebase Auth UID for students')
  test('no persistent identifiers beyond session')
  test('data deleted after 24h')
  test('audit detects PII violations')
})

// src/__tests__/integration/compliance.test.ts
describe('FERPA Compliance', () => {
  test('teacher can export all room data')
  test('teacher can delete room and all data')
  test('student data not visible to other rooms')
  test('no analytics tracking for students')
})
```

---

## 5. Technical Architecture Changes

### Current Architecture (CollabCanvas)
```
User (Browser)
  ↓ Firebase Auth (Anonymous/Google)
  ↓
Next.js App
  ↓
CollabCanvas Component
  ↓
├─ useAuth() → Firebase Auth UID
├─ useCursors() → Realtime DB /users/{uid}
├─ useShapes() → Firestore /rooms/{roomId}/shapes
└─ FloatingChat → OpenAI API (all users)
```

### New Architecture (JellyBoard Phase 1)
```
User (Browser)
  ↓
Landing Page: "Join as Teacher" vs "Join as Student"
  ↓
  ├─ TEACHER PATH                    ├─ STUDENT PATH
  │   ↓ Firebase Auth                │   ↓ No Firebase Auth
  │   ↓ Google Sign-In               │   ↓ Room Code + Nickname
  │   ↓                               │   ↓ Generate Session Token
  │   ↓                               │   ↓ Store in localStorage
  │                                   │
  ├─ Create/Join Room                ├─ Join Room by Code
  │   ↓                               │   ↓
  └─────────────┬─────────────────────┘
                ↓
         CollabCanvas Component
                ↓
    ├─ useAuth() → { role: 'teacher' | 'student' }
    ├─ useCursors() → Role-based paths
    │   ├─ Teacher: /rooms/{roomId}/presence/{uid}
    │   └─ Student: /rooms/{roomId}/students/{sessionId}
    ├─ useShapes() → Check freeze state for students
    ├─ FloatingChat → if (role === 'teacher' && aiEnabled)
    └─ ModerationPanel → if (role === 'teacher')
```

### Database Schema Changes

**Realtime DB:**
```
rooms/
  {roomId}/
    presence/              # Teachers only
      {uid}/
        name: string
        color: string
        online: boolean
        lastSeen: number
        cursor: { x, y, lastSeen }
    
    students/              # NEW - Students only
      {sessionId}/
        nickname: string
        color: string
        joinedAt: number
        lastSeen: number
        expiresAt: number  # joinedAt + 24h
        cursor: { x, y, lastSeen }
    
    settings/              # NEW - Room configuration
      frozen: boolean      # Canvas freeze state
      aiEnabled: boolean   # AI toggle
      lastModified: number
    
    bans/                  # Existing - kick/timeout
      {sessionId}/
        bannedUntil: number
        bannedBy: string
```

**Firestore:**
```
rooms/
  {roomId}/
    metadata/
      info/
        id: string
        name: string
        owner: string (teacherId)
        roomCode: string             # NEW - 6-digit code
        aiEnabled: boolean            # NEW - AI toggle
        autoCleanup: boolean          # NEW - clear on close
        customWordList: string[]      # NEW - profanity filter
        isPublic: boolean
        members: { ... }
        createdAt: timestamp
        updatedAt: timestamp
    
    shapes/                           # Unchanged
      {shapeId}/
        ... existing fields ...
    
    snapshot/                         # Unchanged
      document/
        ... existing fields ...
```

**Type Definitions:**

**`src/types/index.ts`**
```typescript
// Add role to User type
export interface User {
  uid: string;
  displayName: string | null;
  color: string;
  online: boolean;
  lastSeen: number;
  role: 'teacher' | 'student';  // NEW
}

// Add StudentSession type
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

**`src/types/room.ts`**
```typescript
export interface RoomMetadata {
  id: string;
  name: string;
  owner: string;
  roomCode: string;            // NEW
  aiEnabled: boolean;          // NEW
  autoCleanup: boolean;        // NEW
  customWordList?: string[];   // NEW
  isPublic: boolean;
  members: Record<string, RoomMember>;
  createdAt: number;
  updatedAt: number;
}

export interface RoomSettings {
  frozen: boolean;             // NEW
  aiEnabled: boolean;          // NEW
  lastModified: number;
}
```

---

## 6. Acceptance Criteria

### AC-1: Teacher Room Creation
**Given** a teacher is authenticated  
**When** they create a new room  
**Then:**
- A unique 6-digit room code is generated (e.g., `482931`)
- Room code is displayed prominently in modal
- "Share Code" button copies code to clipboard
- Room code is stored in Firestore `metadata.roomCode`
- Teacher can access room at `/room/{roomId}` or students at `/join/{code}`

**Validation:**
- Room code is exactly 6 digits
- No collision with existing codes
- Code persists across sessions

---

### AC-2: Student Anonymous Join
**Given** a student has a room code  
**When** they click "Join as Student" and enter code + nickname  
**Then:**
- No Firebase Auth UID is created
- Temporary session token generated and stored in localStorage
- Student data written to `/rooms/{roomId}/students/{sessionId}`
- Student can immediately draw on canvas
- Student sees other users' cursors
- Student nickname is validated (length, profanity)

**Validation:**
- Nickname rejected if contains profanity
- Nickname rejected if < 2 or > 20 characters
- Session token expires after 24 hours
- No email or real name collected

---

### AC-3: Teacher Moderation
**Given** a teacher is in their room with students  
**When** they open the moderation panel  
**Then:**
- List of all active students displayed
- "Freeze Canvas" button toggles freeze state
- "Clear Canvas" button prompts confirmation
- Click on student shows "Kick" option

**When** teacher freezes canvas:
- Students see banner: "🔒 Canvas locked by teacher"
- Students cannot create/edit/delete shapes
- Students can still pan and zoom
- Teacher can still edit shapes

**When** teacher clears canvas:
- Confirmation modal appears: "Type CLEAR to confirm"
- All shapes deleted from Firestore
- Action logged in console (dev mode)

**When** teacher kicks student:
- Student immediately disconnected
- 5-minute ban applied
- Student redirected to `/join` with message
- Student data cleaned up from Realtime DB

---

### AC-4: AI Restriction
**Given** a teacher is in a room  
**When** they view the canvas  
**Then:**
- FloatingChat (Flippy) button visible in bottom-right
- Teacher can open chat and send AI commands
- AI commands execute and create shapes visible to all users

**Given** a student is in the same room  
**When** they view the canvas  
**Then:**
- FloatingChat button is not visible
- No AI commands can be triggered
- Student sees shapes created by teacher's AI commands

**Given** a teacher disables AI in room settings  
**When** they view the canvas  
**Then:**
- FloatingChat button is hidden (even for teacher)
- AI commands cannot be triggered
- Setting persists across sessions

---

### AC-5: Session Cleanup
**Given** a student joined 24 hours ago  
**When** TTL expires  
**Then:**
- Student data removed from `/rooms/{roomId}/students/{sessionId}`
- Student presence removed from UI
- Student cursor disappears from canvas

**Given** a student has been inactive for 4 hours  
**When** inactivity timeout triggers  
**Then:**
- Toast notification appears: "You've been logged out due to inactivity"
- Student redirected to `/join` page
- Session cleared from localStorage

**Given** a teacher enables "Clear canvas on logout"  
**When** teacher logs out  
**Then:**
- All shapes deleted from Firestore
- Students see empty canvas
- Confirmation shown before logout

---

### AC-6: Compliance
**Given** the app is running in production  
**When** compliance audit is performed  
**Then:**
- No student email addresses in Firestore
- No student email addresses in Realtime DB
- No Firebase Auth UIDs for students
- No persistent identifiers beyond sessionId (which expires)
- No analytics events for student actions
- Privacy policy includes COPPA/FERPA language

**Automated Checks:**
```typescript
// Compliance audit script
const audit = await auditStudentData(roomId);
expect(audit.hasEmailAddresses).toBe(false);
expect(audit.hasNames).toBe(false);
expect(audit.hasPersistentIds).toBe(false);
expect(audit.violations).toHaveLength(0);
```

---

## 7. Testing Strategy

### Unit Tests (New - 18 tests)

#### `src/lib/__tests__/roomCode.test.ts` (6 tests)
```typescript
describe('generateRoomCode', () => {
  test('generates 6-digit numeric code')
  test('generates unique codes (no collisions)')
  test('retries on collision')
})

describe('validateRoomCode', () => {
  test('accepts valid 6-digit codes')
  test('rejects non-numeric codes')
  test('rejects codes < 6 or > 6 digits')
})
```

#### `src/lib/__tests__/contentModeration.test.ts` (5 tests)
```typescript
describe('validateNickname', () => {
  test('accepts clean nicknames')
  test('rejects profanity')
  test('rejects empty nicknames')
  test('rejects nicknames > 20 chars')
  test('respects custom word list')
})
```

#### `src/lib/__tests__/compliance.test.ts` (4 tests)
```typescript
describe('isComplianceViolation', () => {
  test('detects email in student data')
  test('detects Firebase UID in student data')
  test('accepts compliant student session')
  test('generates violations list')
})
```

#### `src/hooks/__tests__/useStudentAuth.test.ts` (3 tests)
```typescript
describe('useStudentAuth', () => {
  test('generates session token on join')
  test('stores session in localStorage')
  test('expires session after 24h')
})
```

### Integration Tests (New - 8 tests)

#### `src/__tests__/integration/teacherStudent.test.ts` (5 tests)
```typescript
describe('Teacher-Student Collaboration', () => {
  test('teacher creates room → student joins → both draw shapes')
  test('teacher freezes canvas → student cannot edit')
  test('teacher kicks student → student banned for 5 min')
  test('teacher uses AI → student sees created shapes')
  test('student session expires → data cleaned up')
})
```

#### `src/__tests__/integration/compliance.test.ts` (3 tests)
```typescript
describe('COPPA/FERPA Compliance', () => {
  test('no student PII in Firestore after join')
  test('no student PII in Realtime DB after join')
  test('student data removed after 24h TTL')
})
```

### Existing Tests to Update

#### `src/hooks/__tests__/useAuth.test.ts`
- Add tests for `role` field
- Add tests for dual auth paths (teacher vs student)

#### `src/components/__tests__/FloatingChat.test.ts`
- Add test: renders for teachers only
- Add test: hidden when aiEnabled=false

#### `src/lib/__tests__/roomManagement.test.ts`
- Add tests for `roomCode` field
- Add tests for room code collision handling

### Manual E2E Test Scenarios

#### Scenario 1: Teacher Creates Room
1. Navigate to `/rooms`
2. Click "New Room"
3. Enter room name "Math Class"
4. Click "Create Room"
5. **Verify:** 6-digit code displayed (e.g., `482931`)
6. Click "Share Code" button
7. **Verify:** Code copied to clipboard
8. Open room at `/room/{roomId}`
9. **Verify:** Room name shown in header
10. **Verify:** FloatingChat visible (teacher role)

#### Scenario 2: Student Joins Anonymously
1. Open new incognito tab
2. Navigate to `/join`
3. Enter room code `482931`
4. Enter nickname "Alex"
5. Click "Join Classroom"
6. **Verify:** Redirected to canvas
7. **Verify:** Can draw shapes immediately
8. **Verify:** FloatingChat NOT visible (student role)
9. **Verify:** Teacher sees "Alex" in user list

#### Scenario 3: Teacher Moderates Students
1. As teacher, click "Moderation" button
2. **Verify:** List shows "Alex" as active student
3. Click "Freeze Canvas"
4. **Verify:** Student tab shows "🔒 Canvas locked by teacher"
5. **Verify:** Student cannot create new shapes
6. Click "Unfreeze Canvas"
7. **Verify:** Student can draw again
8. Click "Clear Canvas" → Type "CLEAR" → Confirm
9. **Verify:** All shapes removed for teacher and student
10. Click "Kick" next to Alex
11. **Verify:** Student tab redirected to `/join` with message

#### Scenario 4: Compliance Verification
1. Open Firebase Console → Realtime DB
2. Navigate to `/rooms/{roomId}/students`
3. **Verify:** No `email` or `uid` fields
4. **Verify:** Only `nickname`, `sessionId`, `color`, timestamps
5. Open Firestore → `rooms/{roomId}`
6. **Verify:** No student PII in any documents
7. Wait 24 hours
8. Check Realtime DB again
9. **Verify:** Student data automatically deleted

---

## 8. Migration Path

### Step 1: Add Role System (Week 1)
**Goal:** Extend auth without breaking existing functionality

**Tasks:**
- Add `role: 'teacher' | 'student'` field to User type
- Update `useAuth.ts` to support dual paths
- Add `isTeacher()` helper function
- Default all existing users to `role: 'teacher'`
- No UI changes yet

**Testing:** All existing tests still pass

---

### Step 2: Implement Room Codes (Week 1-2)
**Goal:** Add code generation and validation

**Tasks:**
- Create `src/lib/roomCode.ts`
- Add `roomCode` field to RoomMetadata
- Generate codes for existing rooms (migration script)
- Update room creation flow to display code
- Add `/join/[code]` route (renders same as `/room/[roomId]`)

**Testing:** 
- Unit tests for room code generation
- Integration test: create room → verify code → join by code

**Backward Compatibility:** Old `/room/[roomId]` URLs still work

---

### Step 3: Add Student Anonymous Path (Week 2-3)
**Goal:** Enable student login without Firebase Auth

**Tasks:**
- Create `useStudentAuth.ts` hook
- Create `StudentJoinFlow.tsx` component
- Update landing page with "Teacher" vs "Student" toggle
- Implement session token generation
- Add student data path in Realtime DB

**Testing:**
- Unit tests for session lifecycle
- Integration test: student joins → draws → expires

**Note:** Teachers continue using existing Google/Anonymous auth

---

### Step 4: Add Moderation Tools (Week 3)
**Goal:** Teacher controls for classroom management

**Tasks:**
- Create `ModerationPanel.tsx` component
- Implement freeze canvas logic
- Implement clear canvas with confirmation
- Add moderation button to RoomHeader
- Update database schema with `/settings/frozen`

**Testing:**
- Integration test: freeze prevents student edits
- Manual E2E: freeze, clear, kick workflows

---

### Step 5: Restrict AI Access (Week 3)
**Goal:** Hide FloatingChat from students

**Tasks:**
- Add role check to FloatingChat render
- Add `aiEnabled` toggle to room settings
- Update CollabCanvas to pass role prop
- Hide AI button for students

**Testing:**
- Unit test: FloatingChat renders based on role
- Integration test: student cannot access AI

---

### Step 6: Deploy Compliance Rules (Week 4)
**Goal:** Enforce COPPA/FERPA at database level

**Tasks:**
- Update `database.rules.json` with TTL and validation
- Update `firestore.rules` to prevent student PII
- Deploy rules to production
- Run compliance audit script
- Update privacy policy

**Testing:**
- Automated audit: verify no PII leaks
- Manual audit: Firebase Console inspection after 24h

---

### Step 7: Update Branding (Week 4)
**Goal:** Transform UI from CollabCanvas to JellyBoard

**Tasks:**
- Replace logo with JellyBoard design
- Update color scheme (kid-friendly palette)
- Update "CollabCanvas" text to "JellyBoard" in UI
- Update meta tags (title, description, OG image)
- Keep "collab-canvas" in code/repo name

**Note:** This is cosmetic only, no functional changes

---

### Step 8: Production Deployment (Week 5-6)
**Goal:** Launch JellyBoard Phase 1

**Tasks:**
- Deploy to production (Vercel)
- Monitor Firebase usage (increased writes due to students)
- Set up error tracking (Sentry or similar)
- Create teacher onboarding guide
- Soft launch with 5-10 beta teachers
- Gather feedback and iterate

---

## 9. Success Metrics

### Technical Metrics
- ✅ All 26 unit + integration tests passing
- ✅ No PII leaks detected in Firebase audit
- ✅ Session TTL working (24h automated cleanup verified)
- ✅ Build completes without errors
- ✅ Lighthouse Performance score > 85

### Functional Metrics
- ✅ Teacher can create room in < 30 seconds
- ✅ Student can join anonymously in < 15 seconds
- ✅ Moderation actions execute in < 2 seconds
- ✅ AI restriction: 0% of student access attempts succeed
- ✅ Canvas freeze prevents 100% of student edits

### Compliance Metrics
- ✅ 100% COPPA compliance (no under-13 PII collected)
- ✅ 100% FERPA compliance (no educational records persisted)
- ✅ Privacy policy updated and approved by legal
- ✅ Automated compliance audit passes
- ✅ Manual Firebase inspection shows zero violations

### User Experience Metrics (Post-Launch)
- Target: 90% of teachers successfully share room code on first try
- Target: 95% of students join successfully without errors
- Target: < 5% of students attempt to access AI (indicates good UX hiding)
- Target: Zero compliance complaints from districts

---

## 10. File Creation & Modification Checklist

### New Files to Create (9 files)

**Core Logic:**
- ✅ `src/lib/roomCode.ts` - Room code generation and validation
- ✅ `src/lib/contentModeration.ts` - Profanity filtering
- ✅ `src/lib/compliance.ts` - COPPA/FERPA utilities and auditing
- ✅ `src/lib/sessionManagement.ts` - Timeout and TTL logic

**Hooks:**
- ✅ `src/hooks/useStudentAuth.ts` - Anonymous student authentication

**Components:**
- ✅ `src/components/StudentJoinFlow.tsx` - Student nickname + code entry
- ✅ `src/components/ModerationPanel.tsx` - Teacher moderation controls

**Types:**
- ✅ `src/types/student.ts` - StudentSession and related types

**Tests:**
- ✅ `src/lib/__tests__/roomCode.test.ts` - (6 tests)
- ✅ `src/lib/__tests__/contentModeration.test.ts` - (5 tests)
- ✅ `src/lib/__tests__/compliance.test.ts` - (4 tests)
- ✅ `src/lib/__tests__/sessionManagement.test.ts` - (3 tests)
- ✅ `src/hooks/__tests__/useStudentAuth.test.ts` - (3 tests)
- ✅ `src/__tests__/integration/teacherStudent.test.ts` - (5 tests)
- ✅ `src/__tests__/integration/compliance.test.ts` - (3 tests)

**Routes:**
- ✅ `src/app/join/page.tsx` - Student join landing page
- ✅ `src/app/join/[code]/page.tsx` - Direct join by code

### Existing Files to Modify (12 files)

**Types:**
- ✅ `src/types/room.ts` - Add roomCode, aiEnabled, autoCleanup fields
- ✅ `src/types/index.ts` - Add role field to User, add StudentSession type

**Hooks:**
- ✅ `src/hooks/useAuth.ts` - Dual auth paths (teacher vs student)
- ✅ `src/hooks/usePresence.ts` - Session timeout monitoring
- ✅ `src/hooks/useShapes.ts` - Check freeze state before student edits

**Components:**
- ✅ `src/components/AuthModal.tsx` - Add "Teacher" vs "Student" toggle
- ✅ `src/components/CollabCanvas.tsx` - Role-based rendering, freeze state
- ✅ `src/components/FloatingChat.tsx` - Add role check, hide for students
- ✅ `src/components/RoomHeader.tsx` - Add "Moderation" button (teacher only)
- ✅ `src/components/RoomSettings.tsx` - Add AI enabled toggle

**Core Logic:**
- ✅ `src/lib/roomManagement.ts` - Room code field, validation
- ✅ `src/lib/paths.ts` - Add getJoinPath(code) helper
- ✅ `src/lib/realtimeSync.ts` - Freeze canvas, student presence paths

**Firebase Rules:**
- ✅ `database.rules.json` - TTL rules, student validation, freeze state
- ✅ `firestore.rules` - Prevent student PII writes

**Config:**
- ✅ `package.json` - Add `bad-words` dependency

### Total Changes Summary
- **New files:** 17 (9 source + 8 test)
- **Modified files:** 12 source + 3 config
- **New code:** ~2,500 lines
- **Modified code:** ~1,800 lines
- **Tests:** 26 new (18 unit + 8 integration)

---

## 11. Dependencies & Package Updates

### New Dependencies
```json
{
  "dependencies": {
    "bad-words": "^3.0.4"
  }
}
```

**bad-words** (MIT License, 14KB)
- Profanity filter for 30+ languages
- Customizable word lists
- Used in nickname validation and optional AI prompt filtering

### No Other New Dependencies Required
JellyBoard Phase 1 builds entirely on existing CollabCanvas stack:
- ✅ Next.js 15.5.5
- ✅ React 19.1.0
- ✅ Firebase 12.4.0 (Auth, Realtime DB, Firestore)
- ✅ tldraw 4.0.3
- ✅ OpenAI 6.3.0 (teacher-only AI)
- ✅ Tailwind CSS 4

---

## 12. Open Questions & Decisions

### Question 1: Profanity Filter Scope
**Options:**
- a) Use `bad-words` npm library (recommended)
- b) Build custom word list
- c) No filter (rely on teacher moderation)

**Recommendation:** Option A - battle-tested library with multi-language support

---

### Question 2: Room Code Format
**Options:**
- a) 6-digit numeric (e.g., `482931`) - easier to read aloud
- b) 6-character alphanumeric (e.g., `X7K9M2`) - more unique combinations

**Recommendation:** Option A - easier for K-8 students to enter on devices

---

### Question 3: Session Timeout Duration
**Options:**
- a) Fixed 4-hour timeout
- b) Configurable per teacher (2h, 4h, 8h options)
- c) No timeout (relies on 24h TTL only)

**Recommendation:** Option A - simpler for Phase 1, can enhance later

---

### Question 4: Branding Strategy
**Options:**
- a) Full rebrand: "JellyBoard" everywhere (repo, code, UI)
- b) Hybrid: "collab-canvas" in code, "JellyBoard" in UI only
- c) Keep "CollabCanvas" as tech name, add "Education Edition" suffix

**Recommendation:** Option B - minimize code changes, clear user-facing brand

---

## 13. Risk Assessment & Mitigation

### Risk 1: Firebase Quota Exceeded (High Impact, Medium Probability)
**Problem:** More student users = 3-5x increase in Realtime DB writes

**Mitigation:**
- Monitor Firebase usage dashboard daily during beta
- Set up billing alerts at 80% of free tier
- Optimize cursor throttling (30Hz → 20Hz for students)
- Consider upgrading to Blaze plan before public launch

---

### Risk 2: Student Bypasses Profanity Filter (Medium Impact, Low Probability)
**Problem:** Students find creative misspellings to bypass filter

**Mitigation:**
- Implement fuzzy matching (e.g., "h3ll0" detected as "hello")
- Add teacher reporting tool to flag nicknames
- Allow teacher to rename/kick students with inappropriate names
- Regular updates to word list based on reports

---

### Risk 3: Session TTL Doesn't Trigger (Low Impact, Low Probability)
**Problem:** Firebase TTL fails, student data persists beyond 24h

**Mitigation:**
- Add backup cleanup cron job (runs daily)
- Implement client-side TTL check on page load
- Manual audit script for compliance team
- Set up monitoring alerts for stale student data

---

### Risk 4: Teachers Confused by Dual Auth Flow (Medium Impact, Medium Probability)
**Problem:** Teachers accidentally join as students

**Mitigation:**
- Clear visual distinction on landing page
- Default to "Teacher" option
- Show warning if teacher-like email detected in student flow
- Comprehensive onboarding guide with screenshots

---

### Risk 5: Drag Operations Not Visible in Real-Time (High Impact, High Probability)
**Problem:** When users drag shapes, other users only see the shape appear at the final position, not during the drag operation. This creates a poor collaborative experience where students/teachers can't see what others are actively manipulating.

**Root Cause:**
- Current shape sync uses 300ms debouncing
- Shape updates only fire on `pointerup` (end of drag)
- No intermediate position updates during drag operations

**User Impact:**
- Feels laggy and disconnected
- Reduces classroom engagement
- Students can't follow along with teacher demonstrations
- Multiple users dragging causes confusion (shapes "teleport")

**Mitigation:**
- **SHORT TERM (Critical for Phase 1):** Implement real-time drag sync with < 100ms latency
  - Add separate "drag in progress" state to Realtime DB
  - Update position at 60Hz (16ms intervals) during drag
  - Use throttling instead of debouncing for drag events
  - Sync final position to Firestore on drag end
- **Performance Optimization:**
  - Only sync XY position during drag (not full shape data)
  - Use lightweight Realtime DB path: `/rooms/{roomId}/dragging/{shapeId}`
  - Clear dragging state immediately on pointerup
- **Testing:** Verify < 100ms drag latency with 10+ concurrent users

**Priority:** Critical - Must be resolved before Phase 1 launch

**Related PR:** Should be implemented as part of PR #3 (Student Auth) or as standalone PR #2.5 (Real-Time Drag Sync)

---

## 14. Known Limitations & Required Improvements

### Current Limitation: Shape Drag Visibility
**Status:** ⚠️ BLOCKING ISSUE for Phase 1

**Current Behavior:**
- When User A drags a shape, User B only sees the shape appear at the end position
- No intermediate position updates during the drag operation
- Creates "teleporting" effect that breaks immersion

**Required Behavior:**
- User B should see the shape moving smoothly as User A drags it
- Latency target: < 100ms for position updates
- Smooth visual experience with 60Hz update rate

**Technical Solution:**

**New Database Path (Realtime DB):**
```
rooms/{roomId}/dragging/
  {shapeId}/
    x: number          // Current drag position X
    y: number          // Current drag position Y
    userId: string     // Who's dragging
    lastUpdate: number // Timestamp (for cleanup)
```

**Modified Files:**
- `src/hooks/useShapes.ts` - Add drag event listeners
- `src/lib/realtimeSync.ts` - Add `updateDragPosition()` function
- `src/components/CollabCanvas.tsx` - Listen to drag state and render

**Implementation Approach:**
```typescript
// In useShapes.ts
editor.on('drag', throttle((event) => {
  if (event.shapeId && userRole) {
    updateDragPosition(roomId, event.shapeId, {
      x: event.x,
      y: event.y,
      userId: user.uid
    });
  }
}, 16)); // 60Hz = 16ms

editor.on('pointerup', (event) => {
  // Clear drag state
  clearDragPosition(roomId, event.shapeId);
  // Sync final position to Firestore (existing logic)
  writeShapeToFirestore(roomId, shape, userId);
});

// Listen for remote drag updates
listenToDragUpdates(roomId, (dragData) => {
  if (dragData.userId !== user.uid) {
    // Update local shape position smoothly
    editor.updateShape({
      id: dragData.shapeId,
      x: dragData.x,
      y: dragData.y
    });
  }
});
```

**Testing:**
- Unit test: Drag event fires updateDragPosition()
- Unit test: Throttle respects 16ms interval (60Hz)
- Integration test: User A drags, User B sees updates < 100ms
- Load test: 10 users dragging simultaneously

**Acceptance Criteria:**
- ✅ Dragged shapes visible in real-time to all users
- ✅ Position updates at 60Hz (16ms intervals)
- ✅ End-to-end latency < 100ms
- ✅ No performance degradation with 10+ concurrent users
- ✅ Smooth visual experience (no jittering)
- ✅ Final position persists to Firestore on drag end

**Priority:** P0 - Critical blocker for Phase 1 launch

---

## 15. Post-Launch Roadmap (Phase 2+)

**Not in Phase 1, but planned:**

### Phase 2: Student-Facing AI (Controlled)
- AI prompts filtered for safety
- Teacher approval required for AI commands
- Age-appropriate prompt templates
- AI usage logs for teacher review

### Phase 3: LMS Integrations
- Google Classroom integration (roster sync)
- Canvas LMS integration
- Schoology integration
- Single sign-on (SSO) for districts

### Phase 4: Advanced Moderation
- Auto-detect drawing of inappropriate content
- Chat functionality with teacher approval
- Student collaboration permissions (viewer vs editor)
- Breakout rooms within main room

### Phase 5: Analytics Dashboard
- Teacher insights (participation, time spent)
- Aggregated class progress
- Export reports for admin
- No individual student tracking (FERPA compliant)

---

## 16. Summary

JellyBoard Phase 1 transforms CollabCanvas into a classroom-safe, COPPA/FERPA-compliant collaborative whiteboard by:

1. **Adding teacher-controlled rooms** with shareable 6-digit codes
2. **Enabling anonymous student access** without email or accounts
3. **Restricting AI to teachers** for safety and compliance
4. **Implementing moderation tools** for classroom management
5. **Enforcing data retention policies** with automatic cleanup
6. **Validating nicknames** to prevent inappropriate content

**Timeline:** 4-6 weeks  
**New Code:** ~2,500 lines  
**Tests:** 26 unit + integration tests  
**Compliance:** 100% COPPA/FERPA verified  

**Next Steps:**
1. Review PRD with stakeholders
2. Answer open questions (profanity filter, room code format)
3. Begin implementation with Step 1 (Role System)
4. Set up beta program with 5-10 teachers
5. Monitor compliance and iterate

---

**Document Status:** Ready for Implementation  
**Last Updated:** October 17, 2025  
**Author:** CollabCanvas → JellyBoard Transition Team

