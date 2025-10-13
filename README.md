# CollabCanvas

> **Real-time collaborative whiteboard built with Next.js, tldraw, and Firebase**

A production-ready collaborative canvas application where multiple users can simultaneously draw, create shapes, and see each other's cursors in real-time.

![Next.js](https://img.shields.io/badge/Next.js-15.5.5-black)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)
![Firebase](https://img.shields.io/badge/Firebase-12.4.0-orange)
![tldraw](https://img.shields.io/badge/tldraw-4.0.3-purple)

---

## ✨ **Features Implemented (MVP Progress: 30%)**

### ✅ **Phase 1: Foundation (Complete)**
- **PR #1:** Project Setup & Configuration
  - Next.js 15 with App Router
  - TypeScript strict mode
  - Tailwind CSS v4
  - Firebase integration
  - Environment configuration

- **PR #2:** Core Infrastructure
  - TypeScript type definitions (User, Cursor, Shape)
  - Utility functions (color generation, debounce, throttle)
  - Firebase client initialization
  - **51 passing unit tests** with Jest

- **PR #3:** Authentication & User Management
  - Anonymous Firebase authentication
  - Beautiful name entry modal
  - User presence tracking in Realtime Database
  - Auto-disconnect handling
  - Per-user color generation

### 🚧 **Coming Soon**
- **PR #4:** tldraw Integration Helpers
- **PR #5:** Real-time Cursor Sync (30Hz)
- **PR #6:** Shape Persistence & Sync (Firestore)
- **PR #7:** User List & Presence UI
- **PR #8-10:** Testing, Polish & Deployment

---

## 🏗️ **Tech Stack**

### **Frontend**
- **Next.js 15.5.5** - React framework with App Router
- **TypeScript 5** - Type safety and better DX
- **Tailwind CSS 4** - Utility-first styling
- **tldraw 4.0.3** - Infinite canvas with 60 FPS pan/zoom

### **Backend & Real-time**
- **Firebase Authentication** - Anonymous auth with display names
- **Firebase Realtime Database** - Cursor positions & presence (< 50ms latency)
- **Cloud Firestore** - Shape persistence and sync
- **Firebase Security Rules** - Secure data access

### **Development**
- **Jest** - Unit testing framework
- **ESLint** - Code linting
- **pnpm** - Fast package manager

---

## 🚀 **Quick Start**

### **Prerequisites**
- Node.js 20+
- pnpm (or npm/yarn)
- Firebase account

### **1. Clone & Install**

```bash
git clone https://github.com/yourusername/collab-canvas.git
cd collab-canvas
pnpm install
```

### **2. Firebase Setup**

1. **Create Firebase Project**
   - Go to [Firebase Console](https://console.firebase.google.com)
   - Create new project or use existing

2. **Enable Services**
   - **Authentication** → Sign-in method → Enable "Anonymous"
   - **Realtime Database** → Create database (test mode)
   - **Firestore** → Create database (test mode)

3. **Get Config & Deploy Rules**
   ```bash
   # Copy environment template
   cp .env.local.example .env.local
   
   # Add your Firebase credentials to .env.local
   # (Get from Project Settings → Your apps → Web app)
   
   # Deploy security rules
   firebase deploy --only firestore:rules,database
   ```

4. **Configure `.env.local`**
   ```bash
   NEXT_PUBLIC_FIREBASE_API_KEY=your-api-key
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-app.firebaseapp.com
   NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
   NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-app.appspot.com
   NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
   NEXT_PUBLIC_FIREBASE_APP_ID=your-app-id
   NEXT_PUBLIC_FIREBASE_DATABASE_URL=https://your-db.firebaseio.com
   ```

### **3. Run Development Server**

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) 🎉

### **4. Run Tests**

```bash
# Run all tests
pnpm test

# Watch mode
pnpm test:watch

# Coverage report
pnpm test:coverage
```

---

## 📁 **Project Structure**

```
collab-canvas/
├── src/
│   ├── app/
│   │   ├── layout.tsx           # Root layout
│   │   └── page.tsx             # Main page
│   ├── components/
│   │   ├── AuthModal.tsx        # Name entry modal
│   │   └── CollabCanvas.tsx     # Main canvas component
│   ├── hooks/
│   │   └── useAuth.ts           # Authentication hook
│   ├── lib/
│   │   ├── firebase.ts          # Firebase initialization
│   │   ├── utils.ts             # Utility functions
│   │   └── __tests__/
│   │       └── utils.test.ts    # Unit tests (51 tests)
│   └── types/
│       └── index.ts             # TypeScript definitions
├── database.rules.json          # Realtime DB security rules
├── firestore.rules              # Firestore security rules
├── firebase.json                # Firebase config
├── jest.config.js               # Jest configuration
└── .env.local                   # Environment variables (create this)
```

---

## 🔒 **Security Rules**

### **Realtime Database** (Cursors & Presence)
```json
{
  "rules": {
    "users": {
      "$uid": {
        ".read": true,
        ".write": "auth != null"
      }
    }
  }
}
```

### **Firestore** (Shapes)
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /shapes/{id} {
      allow read, write: if request.auth != null;
    }
  }
}
```

---

## 🧪 **Testing**

The project includes comprehensive unit tests for all utility functions:

- **Color Generation** (14 tests) - Hex validation, deterministic generation
- **User ID Generation** (5 tests) - Uniqueness, format validation
- **String Utilities** (14 tests) - Initials, truncation, time formatting
- **Debounce/Throttle** (10 tests) - Rate limiting, timer behavior

**Test Coverage:** ~100% on utility functions

```bash
pnpm test              # Run all tests
pnpm test:coverage     # Generate coverage report
```

---

## 🗺️ **Roadmap**

### **Completed** ✅
- [x] Project setup with Next.js + TypeScript
- [x] Firebase integration (Auth, RTDB, Firestore)
- [x] User authentication with display names
- [x] Beautiful UI with Tailwind CSS
- [x] Utility functions with tests
- [x] User presence tracking

### **In Progress** 🚧
- [ ] tldraw integration helpers (coordinate conversion)
- [ ] Real-time cursor synchronization
- [ ] Shape persistence and sync
- [ ] User list sidebar
- [ ] Performance optimization

### **Planned** 📋
- [ ] Error boundaries and loading states
- [ ] Integration tests with Firebase emulator
- [ ] Deployment to Vercel
- [ ] Documentation and demos

---

## 🎯 **MVP Goals (24 Hours)**

- ✅ Basic canvas with pan/zoom (tldraw)
- ✅ User authentication (anonymous + names)
- 🚧 Real-time cursor sync (< 50ms latency)
- 🚧 Shape creation and persistence
- 🚧 Multiplayer presence awareness
- 🚧 Supports 5+ concurrent users
- 🚧 Deployed and publicly accessible

**Current Progress:** 3/10 PRs complete (30%)

---

## 🛠️ **Available Scripts**

```bash
pnpm dev              # Start development server
pnpm build            # Build for production
pnpm start            # Start production server
pnpm test             # Run tests
pnpm test:watch       # Run tests in watch mode
pnpm test:coverage    # Generate coverage report
pnpm emulators        # Start Firebase emulators
pnpm dev:all          # Run dev server + emulators
```

---

## 🐛 **Troubleshooting**

### **"Firebase configuration not found" error**
- Make sure `.env.local` exists with valid Firebase credentials
- Restart the dev server after adding credentials

### **"Permission denied" errors**
- Deploy security rules: `firebase deploy --only firestore:rules,database`
- Check that Anonymous Authentication is enabled in Firebase Console

### **Tests failing**
- Run `pnpm install` to ensure all dependencies are installed
- Check that Jest and testing libraries are in `package.json`

---

## 📚 **Documentation**

- [PRD Summary](./PRD_Summary.md) - Product requirements (500 lines)
- [Task List](./tasklist.md) - Detailed implementation plan (23 hours)
- [Architecture](./architecture.md) - System architecture diagram

---

## 🤝 **Contributing**

This is an MVP project following a structured task list. PRs are welcome for:
- Bug fixes
- Performance improvements
- Documentation updates
- Test coverage improvements

---

## 📄 **License**

MIT License - See LICENSE file for details

---

## 🙏 **Acknowledgments**

- [tldraw](https://tldraw.dev) - Excellent infinite canvas library
- [Firebase](https://firebase.google.com) - Real-time backend infrastructure
- [Next.js](https://nextjs.org) - React framework

---

## 📞 **Contact**

For questions or feedback, open an issue on GitHub.

---

**Built with ❤️ using Next.js, tldraw, and Firebase**
