graph TB
    subgraph "Client Browser"
        USER[User Interface]
        
        subgraph "Next.js App Router"
            LANDING[Landing Page<br/>app/page.tsx]
            CANVAS_PAGE[Canvas Page<br/>app/canvas/page.tsx]
        end
        
        subgraph "React Components"
            AUTH_MODAL[AuthModal<br/>Name Entry]
            CANVAS_COMP[Canvas Component<br/>tldraw Wrapper]
            CURSORS[Cursors Component<br/>Remote Cursors]
            USER_LIST[UserList Component<br/>Online Users]
            ERROR_BOUND[ErrorBoundary<br/>Error Handling]
        end
        
        subgraph "Custom React Hooks"
            USE_AUTH[useAuth<br/>Auth State]
            USE_CURSORS[useCursors<br/>Cursor Tracking]
            USE_SHAPES[useShapes<br/>Shape Sync]
            USE_PRESENCE[usePresence<br/>User Presence]
        end
        
        subgraph "tldraw SDK"
            TLDRAW_EDITOR[Editor Instance<br/>Canvas Rendering]
            TLDRAW_STORE[Store API<br/>Shape Events]
            TLDRAW_UTILS[Coordinate Utils<br/>screenToPage]
        end
        
        subgraph "Core Libraries"
            FIREBASE_LIB[firebase.ts<br/>SDK Init]
            REALTIME_SYNC[realtimeSync.ts<br/>Cursor Sync Logic]
            FIRESTORE_SYNC[firebaseSync.ts<br/>Shape Sync Logic]
            TLDRAW_HELPERS[tldrawHelpers.ts<br/>Serialization]
            UTILS[utils.ts<br/>Color Generation]
        end
        
        subgraph "TypeScript Types"
            TYPES[types/index.ts<br/>User, Cursor, Shape]
        end
    end
    
    subgraph "Firebase Cloud Platform"
        subgraph "Firebase Authentication"
            AUTH[Anonymous Auth<br/>User Identity]
        end
        
        subgraph "Realtime Database"
            RTDB_STRUCTURE["users/userId"]
            CURSOR_DATA["cursor: x, y<br/>name, color, online"]
            PRESENCE["Presence Detection<br/>onDisconnect"]
        end
        
        subgraph "Cloud Firestore"
            FS_STRUCTURE["shapes/shapeId"]
            SHAPE_DATA["id, type, x, y, width, height<br/>createdBy, updatedAt"]
        end
        
        SECURITY_RULES[Security Rules<br/>Read/Write Permissions]
    end
    
    subgraph "Deployment & Hosting"
        VERCEL[Vercel Edge Network<br/>Next.js Hosting]
        GITHUB[GitHub Repository<br/>Version Control]
        ENV_VARS[Environment Variables<br/>Firebase Config]
    end
    
    subgraph "Testing Infrastructure"
        JEST[Jest Test Runner]
        FIREBASE_EMU[Firebase Emulator<br/>Local Testing]
        UNIT_TESTS[Unit Tests<br/>Serialization, Utils]
        INTEGRATION_TESTS[Integration Tests<br/>Firebase, Sync Logic]
    end
    
    %% User Interactions
    USER --> LANDING
    USER --> CANVAS_PAGE
    
    %% Page to Component Flow
    LANDING --> AUTH_MODAL
    CANVAS_PAGE --> CANVAS_COMP
    CANVAS_PAGE --> ERROR_BOUND
    
    %% Component Dependencies
    CANVAS_COMP --> TLDRAW_EDITOR
    CANVAS_COMP --> CURSORS
    CANVAS_COMP --> USER_LIST
    ERROR_BOUND --> CANVAS_COMP
    
    %% Component to Hook Flow
    AUTH_MODAL --> USE_AUTH
    CANVAS_COMP --> USE_CURSORS
    CANVAS_COMP --> USE_SHAPES
    USER_LIST --> USE_PRESENCE
    
    %% Hook to Library Flow
    USE_AUTH --> FIREBASE_LIB
    USE_CURSORS --> REALTIME_SYNC
    USE_SHAPES --> FIRESTORE_SYNC
    USE_PRESENCE --> REALTIME_SYNC
    
    %% tldraw Integration
    CANVAS_COMP --> TLDRAW_EDITOR
    TLDRAW_EDITOR --> TLDRAW_STORE
    TLDRAW_EDITOR --> TLDRAW_UTILS
    USE_CURSORS --> TLDRAW_UTILS
    USE_SHAPES --> TLDRAW_STORE
    
    %% Library Dependencies
    REALTIME_SYNC --> FIREBASE_LIB
    FIRESTORE_SYNC --> FIREBASE_LIB
    REALTIME_SYNC --> TLDRAW_HELPERS
    FIRESTORE_SYNC --> TLDRAW_HELPERS
    TLDRAW_HELPERS --> TYPES
    UTILS --> TYPES
    USE_AUTH --> UTILS
    
    %% Firebase Connections
    FIREBASE_LIB --> AUTH
    FIREBASE_LIB --> RTDB_STRUCTURE
    FIREBASE_LIB --> FS_STRUCTURE
    
    %% Realtime Database Structure
    RTDB_STRUCTURE --> CURSOR_DATA
    RTDB_STRUCTURE --> PRESENCE
    
    %% Firestore Structure
    FS_STRUCTURE --> SHAPE_DATA
    
    %% Security
    AUTH --> SECURITY_RULES
    RTDB_STRUCTURE --> SECURITY_RULES
    FS_STRUCTURE --> SECURITY_RULES
    
    %% Deployment Flow
    GITHUB --> VERCEL
    VERCEL --> CANVAS_PAGE
    ENV_VARS --> FIREBASE_LIB
    
    %% Testing Flow
    UNIT_TESTS --> JEST
    INTEGRATION_TESTS --> JEST
    INTEGRATION_TESTS --> FIREBASE_EMU
    FIREBASE_EMU --> RTDB_STRUCTURE
    FIREBASE_EMU --> FS_STRUCTURE
    UNIT_TESTS -.->|validates| TLDRAW_HELPERS
    UNIT_TESTS -.->|validates| UTILS
    INTEGRATION_TESTS -.->|validates| REALTIME_SYNC
    INTEGRATION_TESTS -.->|validates| FIRESTORE_SYNC
    
    %% Styling
    classDef userLayer fill:#E3F2FD,stroke:#2196F3,stroke-width:2px
    classDef componentLayer fill:#C8E6C9,stroke:#4CAF50,stroke-width:2px
    classDef hookLayer fill:#FFF9C4,stroke:#FBC02D,stroke-width:2px
    classDef libraryLayer fill:#FFE0B2,stroke:#FF9800,stroke-width:2px
    classDef firebaseLayer fill:#F3E5F5,stroke:#9C27B0,stroke-width:2px
    classDef tldrawLayer fill:#B2EBF2,stroke:#00BCD4,stroke-width:2px
    classDef deployLayer fill:#E1BEE7,stroke:#9C27B0,stroke-width:2px
    classDef testLayer fill:#FFCCBC,stroke:#FF5722,stroke-width:2px
    
    class USER,LANDING,CANVAS_PAGE userLayer
    class AUTH_MODAL,CANVAS_COMP,CURSORS,USER_LIST,ERROR_BOUND componentLayer
    class USE_AUTH,USE_CURSORS,USE_SHAPES,USE_PRESENCE hookLayer
    class FIREBASE_LIB,REALTIME_SYNC,FIRESTORE_SYNC,TLDRAW_HELPERS,UTILS libraryLayer
    class AUTH,RTDB_STRUCTURE,FS_STRUCTURE,CURSOR_DATA,SHAPE_DATA,PRESENCE,SECURITY_RULES firebaseLayer
    class TLDRAW_EDITOR,TLDRAW_STORE,TLDRAW_UTILS tldrawLayer
    class VERCEL,GITHUB,ENV_VARS deployLayer
    class JEST,FIREBASE_EMU,UNIT_TESTS,INTEGRATION_TESTS testLayer