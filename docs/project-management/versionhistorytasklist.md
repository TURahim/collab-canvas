# Version History with Restore - Implementation Plan

## Design Overview (1 page)

### 1. Snapshot Data Model
```typescript
interface SnapshotData {
  schemaVersion: number;
  metadata: {
    appVersion: string;
    timestamp: number;
    createdBy: string;
  };
  pages: Record<string, TLPage>;
  pageOrder: string[];
  shapes: TLShape[];
  bindings: TLBinding[];
  assets: AssetManifest[];
  camera: {
    pageId: string;
    x: number;
    y: number;
    z: number;
  };
}

interface AssetManifest {
  id: string;
  url: string;
  hash?: string;
  mime: string;
  bytes: number;
  createdAt: number;
}
```

### 2. Content Hash Strategy
- Compute deterministic SHA-256 hash over `{pages, pageOrder, shapes, bindings, assets[].id}` (ignore timestamps/user IDs)
- Store contentHash in Firestore doc
- Autosave only triggers if hash differs from last snapshot
- Rate limit: max 1 autosave per 30 seconds

### 3. Listener Gating
- Add `isRealtimePaused` flag to realtimeSync.ts
- `pauseRealtime()`: sets flag, new updates queued but not applied
- `resumeRealtime()`: clears flag, flushes queue
- All listener callbacks check flag before applying updates

### 4. Asset Upload Refactor
- Compute SHA-256 hash during upload
- Upload to `/assets/{hash}/{fileName}` (immutable, content-addressable)
- Firestore asset doc includes both hash and URL
- Snapshot manifest records all asset metadata
- On restore: use recorded URLs (no re-upload), show placeholder if 404

### 5. Retention & Cleanup
- Keep last 20 versions per room
- Cloud Function `onVersionDelete`: delete Storage blob when Firestore doc deleted
- On 21st snapshot: delete oldest Firestore doc → triggers function → blob deleted
- Don't delete assets referenced by recent snapshots (check last 20 manifests)

## Implementation Plan

### Phase 1: Core Types & Utilities (src/lib/snapshot/)

**CREATE: src/lib/snapshot/types.ts**
```typescript
export interface SnapshotData { ... }
export interface AssetManifest { ... }
export interface VersionMetadata {
  id: string;
  roomId: string;
  createdAt: number;
  createdBy: string;
  label?: string;
  bytes: number;
  checksum: string;
  contentHash: string;
  schemaVersion: number;
  storagePath: string;
}
```

**CREATE: src/lib/snapshot/service.ts**
Functions:
- `exportSnapshot(editor: Editor, roomId: string): Promise<SnapshotData>`
  - Extract pages, shapes, bindings from editor.store
  - Get camera state
  - Collect asset manifest from Firestore /rooms/{roomId}/assets
  - Return full snapshot object
  
- `importSnapshot(editor: Editor, data: SnapshotData): Promise<void>`
  - Inside editor.run() transaction:
    - Clear existing pages/shapes
    - Import pages in order
    - Import shapes (grouped by page)
    - Import bindings
    - Restore camera position
  - Check asset URLs, show placeholder if missing

- `computeContentHash(data: SnapshotData): string`
  - Create deterministic object: {pages, pageOrder, shapes: shapes.map(s => s.id), bindings, assetIds: assets.map(a => a.id)}
  - JSON.stringify with sorted keys
  - SHA-256 hash

- `compressSnapshot(data: SnapshotData): Uint8Array`
  - JSON.stringify → pako.gzip()

- `decompressSnapshot(bytes: Uint8Array): SnapshotData`
  - pako.ungzip() → JSON.parse()

**CREATE: src/lib/snapshot/storage.ts**
Functions:
- `uploadSnapshotToStorage(roomId: string, versionId: string, data: SnapshotData): Promise<string>`
  - Compress snapshot
  - Upload to Storage `/rooms/{roomId}/versions/${versionId}.json.gz`
  - Return storagePath

- `downloadSnapshotFromStorage(storagePath: string): Promise<SnapshotData>`
  - Download from Storage
  - Decompress and return

**CREATE: src/lib/snapshot/firestore.ts**
Functions:
- `createVersionMetadata(metadata: VersionMetadata): Promise<void>`
  - Write to /rooms/{roomId}/versions/{versionId}
  
- `listVersions(roomId: string, limit: number): Promise<VersionMetadata[]>`
  - Query versions, order by createdAt desc

- `deleteVersion(roomId: string, versionId: string): Promise<void>`
  - Delete Firestore doc (triggers Cloud Function for blob)

- `pruneOldVersions(roomId: string, keepLast: number): Promise<void>`
  - Get versions, delete oldest beyond keepLast

**CREATE: src/lib/snapshot/autosave.ts**
Hook:
- `useAutosave(editor, roomId, userId, intervalMs = 30000)`
  - Track lastContentHash in ref
  - On interval: exportSnapshot → computeContentHash
  - If hash differs: createVersion(label: "Autosave")
  - Update lastContentHash

### Phase 2: Realtime Sync Modifications

**MODIFY: src/lib/realtimeSync.ts**
Add module-level state:
```typescript
let isRealtimePaused = false;
let updateQueue: Array<() => void> = [];

export function pauseRealtime() {
  isRealtimePaused = true;
  updateQueue = [];
}

export function resumeRealtime() {
  isRealtimePaused = false;
  updateQueue.forEach(fn => fn());
  updateQueue = [];
}

function shouldApplyUpdate(): boolean {
  return !isRealtimePaused;
}
```

Update all listener callbacks to check `shouldApplyUpdate()` before applying changes.

**MODIFY: src/hooks/useShapes.ts**
Import pauseRealtime/resumeRealtime, use in restore flow.

### Phase 3: Asset Management Refactor

**MODIFY: src/lib/assetManagement.ts**
Add:
- `computeAssetHash(file: File): Promise<string>`
  - Read file as ArrayBuffer
  - Compute SHA-256
  - Return hex string

Update `uploadAssetToStorage`:
- Compute hash
- Upload to `/assets/{hash}/{fileName}` (immutable path)
- Write Firestore with hash field

Add:
- `getAssetManifest(roomId: string): Promise<AssetManifest[]>`
  - Query all assets in /rooms/{roomId}/assets
  - Return manifest array

- `checkAssetExists(url: string): Promise<boolean>`
  - Fetch HEAD request, return true if 200

### Phase 4: Version UI

**CREATE: src/components/VersionHistoryModal.tsx**
- List versions (timestamp, author, label, size)
- "Save Version" button (with optional label input)
- "Restore" button per version (with confirmation)
- Delete button (owner/creator only)
- Show loading states

Props:
- `roomId: string`
- `editor: Editor | null`
- `userId: string`
- `isOwner: boolean`
- `onClose: () => void`

**MODIFY: src/components/RoomHeader.tsx**
Add "Version" button next to Export/Share:
```typescript
<button onClick={onVersionClick} ...>
  <ClockIcon />
  <span>Version</span>
</button>
```

Add `onVersionClick: () => void` to props.

**MODIFY: src/components/CollabCanvas.tsx**
- Add state: `showVersionModal`
- Pass `onVersionClick` to RoomHeader
- Render VersionHistoryModal when open
- Implement restore flow with pre-restore snapshot

### Phase 5: Security Rules

**MODIFY: firestore.rules**
Add:
```javascript
match /rooms/{roomId}/versions/{versionId} {
  // Read: authenticated room members (check via metadata/info.members)
  allow read: if request.auth != null
    && isRoomMember(roomId, request.auth.uid);
  
  // Create: authenticated members
  allow create: if request.auth != null
    && isRoomMember(roomId, request.auth.uid)
    && request.resource.data.createdBy == request.auth.uid;
  
  // Delete: only creator or room owner
  allow delete: if request.auth != null
    && (resource.data.createdBy == request.auth.uid
        || isRoomOwner(roomId, request.auth.uid));
}

// Helper functions
function isRoomMember(roomId, userId) {
  return get(/databases/$(database)/documents/rooms/$(roomId)/metadata/info).data.members[userId] != null;
}

function isRoomOwner(roomId, userId) {
  return get(/databases/$(database)/documents/rooms/$(roomId)/metadata/info).data.owner == userId;
}
```

**MODIFY: storage.rules**
Add:
```javascript
// Version snapshots
match /rooms/{roomId}/versions/{versionFile} {
  allow read: if request.auth != null;
  allow write: if request.auth != null;
  allow delete: if request.auth != null;
}

// Content-addressable assets
match /assets/{hash}/{fileName} {
  allow read: if request.auth != null;
  allow write: if request.auth != null
    && request.resource.size < 10 * 1024 * 1024
    && request.resource.contentType.matches('image/(png|jpeg|jpg|gif|webp)');
}
```

### Phase 6: Cloud Function

**CREATE: functions/src/onVersionDelete.ts**
```typescript
import * as functions from "firebase-functions";
import { initializeApp } from "firebase-admin/app";
import { getStorage } from "firebase-admin/storage";

initializeApp();

export const onVersionDelete = functions.firestore
  .document("rooms/{roomId}/versions/{versionId}")
  .onDelete(async (snap, context) => {
    const { roomId, versionId } = context.params;
    const data = snap.data();
    
    if (!data?.storagePath) return;
    
    try {
      const bucket = getStorage().bucket();
      await bucket.file(data.storagePath).delete();
      console.log(`Deleted version blob: ${data.storagePath}`);
    } catch (error) {
      console.error("Failed to delete version blob:", error);
    }
  });
```

**MODIFY: functions/package.json**
Add dependencies: firebase-functions, firebase-admin

**CREATE: functions/tsconfig.json** (if not exists)

### Phase 7: Dependencies

**MODIFY: package.json**
Add:
- `pako` (gzip compression)
- `@types/pako`

### Phase 8: Documentation

**MODIFY: README.md**
Add section "Version History":
- How snapshots work (manual + autosave)
- Content hash change detection
- Restore flow (pre-restore snapshot, undo available)
- Retention policy (last 20)
- Asset manifest approach
- Security: room members only
- Limitations: assets must not be deleted manually

**CREATE: docs/VERSION_HISTORY.md**
Detailed technical documentation:
- Schema definitions
- Hash computation algorithm
- Listener pause mechanism
- Asset resolution strategy
- Cloud Function cleanup flow
- Testing procedures

## Acceptance Criteria Testing Script

```
MANUAL TEST SCRIPT:

1. CREATE MANUAL SNAPSHOT
   - Draw 5 shapes on canvas
   - Click "Version" → "Save Version"
   - Enter label "Before changes"
   - Verify appears in list with author, timestamp, size

2. AUTOSAVE TEST
   - Wait 30 seconds (no change) → no new snapshot
   - Move a shape → wait 35s → verify new autosave appears
   - Move same shape back → wait 35s → no new snapshot (hash unchanged)

3. RESTORE TEST
   - Make major changes (delete shapes, add new ones)
   - Click restore on "Before changes"
   - Verify:
     * All 5 original shapes restored
     * New "Pre-restore" autosave created
     * Toast: "Restored to Before changes. Undo available"
     * Other users see your changes (realtime not broken)
     * Single undo entry in tldraw history

4. SECURITY TEST
   - Open room in incognito (different user, non-member)
   - Verify: cannot read/write versions (403)
   - As member (not creator): can read, create, but cannot delete others' versions
   - As creator/owner: can delete own versions

5. RETENTION TEST
   - Create 21 snapshots rapidly
   - Verify: only last 20 exist
   - Check Firebase Storage: oldest blob deleted

6. ASSET TEST
   - Upload image
   - Create snapshot
   - Restore snapshot
   - Verify: image renders correctly (manifest URL used)
   - Delete asset in Storage manually → restore again
   - Verify: placeholder shown + toast "missing asset"

7. CLOUD FUNCTION TEST
   - Create snapshot (note versionId)
   - Delete Firestore doc manually
   - Verify: Storage blob auto-deleted within 10s
```

## Implementation Order

1. Create types and core snapshot service functions
2. Modify realtimeSync with pause/resume
3. Refactor asset management (hash-based paths)
4. Build UI (modal + header button)
5. Update security rules
6. Deploy Cloud Function
7. Add autosave hook
8. Integration testing
9. Documentation

## Estimated Effort
- Phase 1-3: 6-8 hours (core logic)
- Phase 4: 3-4 hours (UI)
- Phase 5-6: 2-3 hours (security + function)
- Phase 7-8: 1-2 hours (deps + docs)
- Testing: 2-3 hours

**Total: 14-20 hours**

---

## Implementation Checklist

- [ ] **Phase 1: Core Types & Utilities**
  - [ ] Create src/lib/snapshot/types.ts
  - [ ] Create src/lib/snapshot/service.ts (exportSnapshot, importSnapshot, computeContentHash, compress/decompress)
  - [ ] Create src/lib/snapshot/storage.ts (upload/download)
  - [ ] Create src/lib/snapshot/firestore.ts (CRUD operations, pruning)
  - [ ] Create src/lib/snapshot/autosave.ts (useAutosave hook)

- [ ] **Phase 2: Realtime Sync Modifications**
  - [ ] Add pauseRealtime/resumeRealtime to realtimeSync.ts
  - [ ] Update all listener callbacks to check pause flag
  - [ ] Modify useShapes.ts to use pause/resume

- [ ] **Phase 3: Asset Management Refactor**
  - [ ] Add computeAssetHash function
  - [ ] Update uploadAssetToStorage to use hash-based paths
  - [ ] Add getAssetManifest function
  - [ ] Add checkAssetExists function

- [ ] **Phase 4: Version UI**
  - [ ] Create VersionHistoryModal.tsx component
  - [ ] Add Version button to RoomHeader.tsx
  - [ ] Update CollabCanvas.tsx with modal state and restore flow

- [ ] **Phase 5: Security Rules**
  - [ ] Update firestore.rules for versions collection
  - [ ] Update storage.rules for version snapshots and content-addressable assets
  - [ ] Add helper functions for membership checks

- [ ] **Phase 6: Cloud Function**
  - [ ] Create functions/src/onVersionDelete.ts
  - [ ] Update functions/package.json with dependencies
  - [ ] Deploy Cloud Function

- [ ] **Phase 7: Dependencies**
  - [ ] Add pako to package.json
  - [ ] Add @types/pako to package.json
  - [ ] Run pnpm install

- [ ] **Phase 8: Documentation**
  - [ ] Update README.md with Version History section
  - [ ] Create docs/VERSION_HISTORY.md with technical details

- [ ] **Testing**
  - [ ] Execute manual test script
  - [ ] Verify all acceptance criteria met

