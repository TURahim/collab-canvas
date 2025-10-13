CollabCanvas - Development Task List
Project Setup & Infrastructure
PR #1: Initial Project Setup & Configuration
Branch: setup/initial-config
Description: Set up the Next.js project with all necessary dependencies and Firebase configuration.
Files to Create:
.env.local
next.config.js
tsconfig.json
tailwind.config.js
.gitignore
README.md
Files to Edit:
package.json
Tasks:
Create Next.js project with TypeScript and Tailwind CSS
Install core dependencies (tldraw, firebase, lodash)
Install dev dependencies (@types/lodash)
Create Firebase project in Firebase Console
Enable Anonymous Authentication in Firebase
Create Realtime Database (test mode)
Create Firestore Database (test mode)
Copy Firebase config to .env.local
Configure Firebase security rules (basic test mode)
Set up .gitignore to exclude .env.local
Initialize Git repository
Create initial README with project description
Test: Verify npm run dev starts successfully
PR #2: Core Firebase Integration & Types
Branch: feature/firebase-setup
Description: Set up Firebase initialization, authentication utilities, and TypeScript types.
Files to Create:
app/lib/firebase.ts
app/types/index.ts
app/lib/utils.ts
app/lib/
tests
__
__
/utils.test.ts ⭐ NEW
Tasks:
Create Firebase initialization module
Set up Firebase Auth instance
Set up Realtime Database instance
Set up Firestore instance
Define TypeScript types for User, Cursor, Shape, Room
Create color generation utility
Create user ID generation utility
Write unit tests for color generation ⭐
Test: Generates valid hex color
Test: Generates different colors for different inputs
Test: Color format is correct (#RRGGBB)
Write unit tests for utility functions ⭐
Test: User ID generation creates unique IDs
Test: Utility functions handle edge cases
Test: Verify Firebase connects without errors
Authentication & User Management
PR #3: Anonymous Authentication & User Entry
Branch: feature/auth-modal
Description: Implement anonymous authentication with display name entry.
Files to Create:
app/components/AuthModal.tsx
app/hooks/useAuth.ts
app/page.tsx (landing page)
app/hooks/
tests
__
__
/useAuth.test.ts ⭐ NEW
Files to Edit:
app/layout.tsx
Tasks:
Create AuthModal component with name input
Implement Firebase anonymous sign-in
Update user profile with display name
Create useAuth hook for auth state management
Store user data in Realtime Database on auth
Generate unique color for each user
Implement auth persistence across sessions
Create landing page with auth flow
Add loading states during authentication
Write integration tests for authentication flow ⭐
Test: signInAnonymously is called correctly
Test: User profile is updated with display name
Test: User data is written to Realtime DB
Test: Auth state persists across hook remounts
Test: Generated color is stored with user
Test: User can enter name and authenticate
Test: Auth persists on page refresh
Canvas & tldraw Integration
PR #4: Basic tldraw Canvas Setup
Branch: feature/canvas-basic
Description: Implement the basic tldraw canvas with Firebase integration hooks.
Files to Create:
app/canvas/page.tsx
app/components/Canvas.tsx
app/lib/tldrawHelpers.ts
app/lib/
tests
__
__
/tldrawHelpers.test.ts ⭐ NEW
Tasks:
Create canvas page (single default room)
Implement basic tldraw component
Set up tldraw editor instance
Implement coordinate conversion utilities (screen ↔ page)
Create shape serialization utilities
Create shape deserialization utilities
Set up editor mount handler
Write unit tests for coordinate conversion ⭐ CRITICAL
Test: screenToPage converts coordinates correctly
Test: pageToScreen converts coordinates correctly
Test: Handles zoom level correctly (2x, 0.5x)
Test: Handles camera offset correctly
Test: Round-trip conversion maintains accuracy
Write unit tests for shape serialization ⭐ CRITICAL
Test: Serializes tldraw shape to Firebase format
Test: Deserializes Firebase shape to tldraw format
Test: Handles missing optional properties
Test: Preserves shape identity through round-trip
Test: Correctly handles different shape types
Test: Canvas loads and renders
Test: Can create shapes (rectangles)
Test: Pan and zoom work smoothly
Test: Coordinate conversion is accurate
Real-Time Cursor Sync
PR #5: Cursor Tracking & Sync
Branch: feature/cursor-sync
Description: Implement real-time cursor position tracking and synchronization.
Files to Create:
app/lib/realtimeSync.ts
app/hooks/useCursors.ts
app/components/Cursors.tsx
app/lib/
tests
__
__
/throttle.test.ts ⭐ NEW
app/lib/
tests
__
__
/realtimeSync.integration.test.ts ⭐ NEW
Files to Edit:
app/components/Canvas.tsx
Tasks:
Set up Realtime Database structure for cursors
Implement cursor position tracking on pointer move
Throttle cursor updates to 30Hz
Convert screen coordinates to page coordinates
Write cursor position to Realtime DB
Listen to other users' cursor positions
Create Cursors component to render remote cursors
Implement cursor label with username
Add cursor color matching user color
Set up presence detection (online/offline)
Configure auto-cleanup on disconnect
Write unit tests for throttle logic ⭐
Test: Throttle limits calls to specified rate
Test: First call executes immediately
Test: Subsequent calls within window are ignored
Test: Cursor updates respect 30Hz limit (~33ms)
Test: 60 rapid calls result in ~30 executions
Write integration tests for Realtime DB ⭐ CRITICAL
Test: Writes cursor position to Realtime DB
Test: Reads cursor position from Realtime DB
Test: Listens to real-time cursor updates
Test: Removes cursor on disconnect
Test: Handles concurrent updates from multiple users
Test: Presence detection marks users online/offline
Test: Cursors visible for all users
Test: Cursor movement is smooth (<50ms latency)
Test: Cursors disappear on disconnect
Test: Cursor positions transform correctly with zoom/pan
Shape Persistence & Sync
PR #6: Shape Synchronization (Firestore)
Branch: feature/shape-sync
Description: Implement shape persistence and real-time synchronization via Firestore.
Files to Create:
app/lib/firebaseSync.ts
app/hooks/useShapes.ts
app/lib/
tests
__
__
/firebaseSync.test.ts ⭐ NEW
app/lib/
tests
__
__
/firestoreSync.integration.test.ts ⭐ NEW
Files to Edit:
app/components/Canvas.tsx
app/lib/tldrawHelpers.ts
Tasks:
Set up Firestore collection structure for shapes
Listen to tldraw shape changes (editor.store.listen)
Filter for user-initiated changes only
Debounce shape updates (300ms)
Serialize tldraw shapes to Firestore format
Write shape data to Firestore
Listen to Firestore shape updates
Deserialize Firestore shapes to tldraw format
Apply remote changes using mergeRemoteChanges
Implement sync loop prevention with isSyncing flag
Handle shape deletion
Load all existing shapes on canvas mount
Implement conflict resolution (last write wins)
Write unit tests for sync loop prevention ⭐
Test: isSyncing flag prevents echo updates
Test: User actions are synced
Test: Remote updates don't trigger re-sync
Test: Flag resets after remote update applied
Write unit tests for debounce logic ⭐
Test: Debounce delays execution until calls stop
Test: 300ms delay is respected
Test: Multiple rapid calls result in single execution
Test: Final state is captured correctly
Write integration tests for Firestore sync ⭐ CRITICAL
Test: Writes shape document to Firestore
Test: Reads shape document from Firestore
Test: Listens to real-time shape changes
Test: Handles shape deletion
Test: Loads all shapes for room on mount
Test: Prevents sync loops with isSyncing flag
Test: Handles concurrent shape updates
Test: Shape creation syncs to all users (<100ms)
Test: Shape movement syncs on drop
Test: Shape deletion syncs correctly
Test: No duplicate shapes after sync
Test: Works with 2+ users editing simultaneously
Test: No data loss on refresh
User Presence & UI
PR #7: User List & Presence Awareness
Branch: feature/user-presence
Description: Display online users with presence indicators.
Files to Create:
app/components/UserList.tsx
app/hooks/usePresence.ts
app/hooks/
tests
__
__
Files to Edit:
/usePresence.test.ts ⭐ NEW
app/canvas/page.tsx
app/lib/realtimeSync.ts
Tasks:
Create UserList component
Listen to users in Realtime Database
Filter for online users only
Display user names with color indicators
Mark current user clearly
Update user online status on join
Set up heartbeat to maintain presence
Mark user offline on disconnect
Style user list with Tailwind CSS
Add user count indicator
Write unit tests for presence hook ⭐
Test: Filters online users correctly
Test: Returns empty array when no users online
Test: Updates when user join/leave events occur
Test: Current user is identified correctly
Test: User colors are included in data
Test: User list shows all online users
Test: List updates within 2s when users join/leave
Test: Each user has unique color
Test: Current user is clearly marked
Testing Infrastructure
PR #8: Test Infrastructure Setup
Branch: feature/testing-infrastructure
Description: Set up Jest configuration and test utilities (tests already written in previous PRs).
Files to Create:
jest.config.js
jest.setup.js
app/lib/
tests
__
__
/testUtils.ts
Files to Edit:
package.json
Tasks:
Install Jest and testing dependencies
jest
@testing-library/react
@testing-library/jest-dom
@types/jest
jest-environment-jsdom
firebase-admin (for emulator tests)
Configure Jest for Next.js
Create jest.config.js with proper module mapping
Create jest.setup.js for test environment
Create test utilities for Firebase emulator
initializeTestDatabase()
initializeTestFirestore()
cleanupTestDatabase()
cleanupTestFirestore()
Mock editor utilities
Set up Firebase emulator configuration
Add test scripts to package.json
"test": "jest"
"test:watch": "jest --watch"
"test:coverage": "jest --coverage"
"test:integration": "jest --testPathPattern=integration"
Run all existing unit tests ⭐
app/lib/tests/utils.test.ts
app/lib/tests/tldrawHelpers.test.ts
app/lib/tests/throttle.test.ts
app/lib/tests/firebaseSync.test.ts
Run all existing integration tests ⭐
app/lib/tests/realtimeSync.integration.test.ts
app/lib/tests/firestoreSync.integration.test.ts
Test: All unit tests pass
Test: All integration tests pass
Test: Coverage report generates successfully
Performance & Polish
PR #9: Performance Optimization & Error Handling
Branch: feature/performance-polish
Description: Optimize performance and add error handling throughout the app.
Files to Edit:
app/components/Canvas.tsx
app/lib/firebaseSync.ts
app/lib/realtimeSync.ts
app/components/AuthModal.tsx
Files to Create:
app/components/ErrorBoundary.tsx
app/components/LoadingSpinner.tsx
app/lib/
tests
__
__
/errorHandling.test.ts ⭐ NEW
Tasks:
Add error boundaries to main components
Implement loading states for async operations
Add error handling for Firebase operations
Implement retry logic for failed operations
Add visual feedback for sync states
Optimize cursor update throttling
Optimize shape sync debouncing
Add connection status indicator
Implement graceful degradation for offline mode
Add performance monitoring
Write unit tests for error handling ⭐
Test: Error boundary catches component errors
Test: Retry logic attempts reconnection
Test: Failed Firebase operations are caught
Test: Error messages display correctly
Test: Graceful degradation works offline
Test: Handles rapid disconnect/reconnect
Test: Handles multiple rapid shape creation
Test: Network throttling works correctly
Test: 60 FPS during pan/zoom
Test: Firebase quotas not exceeded
Deployment & Documentation
PR #10: Deployment & Production Configuration
Branch: feature/deployment
Description: Configure production Firebase rules and deploy to Vercel.
Files to Create:
firestore.rules
database.rules.json
vercel.json
ARCHITECTURE.md
Files to Edit:
README.md
Tasks:
Write production-ready Firestore security rules
Authenticated users can read/write shapes
Validate shape data structure
Write production-ready Realtime Database rules
Authenticated users can read all user data
Users can only write their own cursor data
Deploy security rules to Firebase
Create comprehensive README
Project description
Tech stack overview
Setup instructions
Environment variables
Running locally
Running tests
Deployment instructions
Document architecture and data flow
System architecture diagram
Data flow diagrams (cursors vs shapes)
Firebase database structure
Key technical decisions
Document environment setup
Create setup instructions
Install Vercel CLI
Configure Vercel project
Add environment variables to Vercel
Deploy to Vercel
Perform end-to-end manual testing ⭐
Test: App deployed with public URL
Test: HTTPS enabled
Test: Works across devices
Test: Supports 5+ concurrent users
Test: All 7 core features work in production
Test: Performance targets met (<50ms cursors, <100ms shapes)
Test: Security rules prevent unauthorized access
Verify Firebase quotas are within limits
Final Project Structure
collabcanvas/
├── app/
│ ├── canvas/
│ │ └── page.tsx # Main canvas page
│ ├── components/
│ │ ├── AuthModal.tsx # Authentication modal
│ │ ├── Canvas.tsx # tldraw wrapper
│ │ ├── Cursors.tsx # Remote cursor rendering
│ │ ├── UserList.tsx # Online users list
│ │ ├── ErrorBoundary.tsx # Error handling
│ │ └── LoadingSpinner.tsx # Loading states
│ ├── lib/
│ │ ├── firebase.ts # Firebase config
│ │ ├── firebaseSync.ts # Shape sync logic
│ │ ├── realtimeSync.ts # Cursor sync logic
│ │ ├── tldrawHelpers.ts # Serialization utils
│ │ ├── utils.ts # Helper functions
│ │ └── __tests__/ # Test files
│ │ ├── tldrawHelpers.test.ts
│ │ ├── firebaseSync.test.ts
│ │ ├── throttle.test.ts
│ │ ├── realtimeSync.integration.test.ts
│ │ ├── firestoreSync.integration.test.ts
│ │ ├── roomIsolation.integration.test.ts
│ │ └── testUtils.ts
│ ├── hooks/
│ │ ├── useAuth.ts │ │ ├── useCursors.ts │ │ ├── useShapes.ts │ │ ├── usePresence.ts # Authentication hook
# Cursor tracking hook
# Shape sync hook
# User presence hook
│ │ └── __tests__/
│ │ ├── useAuth.test.ts
│ │ └── usePresence.test.ts
│ ├── types/
│ │ └── index.ts # TypeScript types
│ ├── layout.tsx # Root layout
│ └── page.tsx # Landing page
├── public/ # Static assets
├── .env.local # Environment variables (not committed)
├── .gitignore
├── database.rules.json # Realtime DB rules
├── firestore.rules # Firestore rules
├── jest.config.js # Jest configuration
├── jest.setup.js # Jest setup
├── next.config.js # Next.js config
├── package.json
├── tailwind.config.js
├── tsconfig.json
├── vercel.json # Vercel config
├── README.md # Project documentation
└── ARCHITECTURE.md # Architecture docs
Estimated Timeline
PR #1: Setup & Firebase (2 hours)
PR #2: Firebase + Unit Tests (2 hours)
PR #3: Auth + Integration Tests (2 hours)
PR #4: Canvas + Unit Tests (2 hours)
PR #5: Cursors + Unit + Integration Tests (3.5 hours)
PR #6: Shapes + Unit + Integration Tests (4 hours)
PR #7: Presence + Unit Tests (2 hours)
PR #8: Test Infrastructure (1.5 hours)
PR #9: Performance + Unit Tests (2 hours)
PR #10: Deployment + Manual E2E (2 hours)
Total: 23 hours (includes all testing and buffer)
Testing Summary
Critical Tests (Must Pass):
1. ✅ Coordinate conversion (PR #4) - Prevents cursor misalignment
2. ✅ Shape serialization (PR #4) - Prevents data corruption
3. ✅ Realtime DB integration (PR #5) - Validates cursor sync
4. ✅ Firestore sync integration (PR #6) - Validates shape persistence
5. ✅ Sync loop prevention (PR #6) - Prevents infinite loops
Test Commands:
bash
# Run all tests
npm test
# Run tests for specific file
npm test -- tldrawHelpers
# Run tests in watch mode
npm test:watch
# Run only integration tests
npm run test:integration
# Run with coverage report
npm run test:coverage
Pre-Development Checklist
Read through entire PRD
Understand Firebase Realtime DB vs Firestore use cases
Review tldraw documentation and Editor API
Set up development environment
Create Firebase project
Prepare Git repository
Ready to start with PR #1! 🚀