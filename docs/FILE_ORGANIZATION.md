# File Organization Guide

**Last Updated:** October 17, 2025

This document explains the organization of files and folders in the CollabCanvas project.

---

## 📁 Root Directory

The root directory contains **only essential configuration files**:

### Configuration Files
- `package.json`, `pnpm-lock.yaml` - Package management
- `tsconfig.json` - TypeScript configuration
- `next.config.ts` - Next.js configuration
- `eslint.config.mjs` - Linting rules
- `jest.config.js`, `jest.setup.js` - Test configuration
- `postcss.config.mjs` - PostCSS configuration
- `vercel.json` - Vercel deployment configuration

### Firebase Configuration
- `firebase.json` - Firebase project configuration
- `database.rules.json` - Realtime Database security rules
- `firestore.rules` - Firestore security rules
- `firestore.indexes.json` - Firestore composite indexes
- `storage.rules` - Firebase Storage security rules
- `.firebaserc` - Firebase project aliases
- `cors.json` - CORS configuration for Firebase Storage

### Essential Files
- `README.md` - Main project documentation
- `.env.local.example` - Environment variable template
- `.gitignore` - Git ignore rules
- `.nvmrc` - Node version specification

---

## 📂 Directory Structure

### `/src` - Source Code
Application source code organized by type:

```
src/
├── app/              # Next.js App Router pages
│   ├── api/         # API routes (AI execution)
│   ├── room/        # Individual room pages
│   ├── rooms/       # Room list page
│   ├── layout.tsx   # Root layout
│   └── page.tsx     # Home page (redirects to /rooms)
├── components/       # React components
│   ├── __tests__/   # Component tests
│   └── *.tsx        # Component files
├── hooks/            # Custom React hooks
│   ├── __tests__/   # Hook tests
│   └── *.ts         # Hook files
├── lib/              # Core business logic
│   ├── __tests__/   # Unit tests
│   └── *.ts         # Library files
└── types/            # TypeScript type definitions
    └── *.ts         # Type files
```

### `/docs` - Documentation
All project documentation organized by category:

```
docs/
├── README.md                  # Documentation index
├── TESTING.md                 # Testing guide
├── architecture.md            # System architecture
├── FILE_ORGANIZATION.md       # This file
├── prd/                       # Product Requirements
│   ├── PRD_Final.md
│   └── PRD_Summary.md
├── project-management/        # Project Management
│   ├── PROJECT_STATUS_COMPARISON.md
│   ├── projectoverview.md
│   ├── memorybank.md
│   └── multi-agent-work.md
├── setup-guides/              # Setup Instructions
│   ├── CORS_FIX_INSTRUCTIONS.md
│   └── GOOGLE_AUTH_SETUP.md
├── dev-logs/                  # Development Logs
│   ├── COLOR_VALIDATION_FIX_SUMMARY.md
│   ├── DEEP_DIVE_DIAGNOSIS.md
│   ├── FINAL_PERMISSION_FIX.md
│   ├── LOGOUT_IMPROVEMENTS_SUMMARY.md
│   ├── PERMISSION_DENIED_FIX.md
│   ├── PR14_MANIPULATION_COMMANDS_SUMMARY.md
│   ├── PR15_IMPROVEMENTS_SUMMARY.md
│   ├── PR15_LAYOUT_COMMANDS_SUMMARY.md
│   ├── PR16_COMPLEX_COMMANDS_SUMMARY.md
│   └── SHAPE_PERSISTENCE_DIAGNOSTIC.md
└── archive/                   # Historical Documents
    ├── PR1_MULTI_ROOM_ROUTING_SUMMARY.md
    ├── PROJECT_STATUS_COMPARISON_backup.md
    ├── tasklist.md
    └── tasklistfinal.md
```

### `/.cursor` - Development Tools
Cursor AI agent instructions and documentation:

```
.cursor/
├── agent-a-instructions.md           # Agent A guide
├── agent-b-instructions.md           # Agent B guide
├── merge-coordinator-instructions.md # Merge coordination
├── status.md                         # Current status
├── TESTING_GUIDE.md                  # Testing guide
├── PR7_STATUS.md                     # Recent work status
├── PR7_FINAL_STATUS.md              # Final status
├── implementation-docs/              # Implementation Documentation
│   ├── IMPLEMENTATION_SUMMARY.md
│   ├── ROOM_SCOPED_PRESENCE_IMPLEMENTATION.md
│   └── DELETE_ROOM_FIX.md
└── submissions/                      # PR Submissions
    ├── pr1-submission.md
    ├── pr5-submission.md
    ├── pr5-review.md
    ├── pr5-final-review.md
    ├── pr6-submission.md
    ├── pr6-review.md
    ├── pr7-review.md
    ├── pr7-re-review.md
    ├── pr7-final-review.md
    ├── integration-report.md
    └── README.md
```

### `/memory` - Memory Bank
AI context preservation system:

```
memory/
├── PROJECT_BRIEF.md     # Project overview
├── ACTIVE_CONTEXT.md    # Current work context
├── TASKS.md             # Task tracking
├── PROGRESS.md          # Progress log
└── FRONTEND_MAP.md      # Frontend structure
```

### `/public` - Static Assets
Publicly accessible static files:

```
public/
├── JellyBoardBanner.png  # App logo
├── file.svg              # Icons
├── globe.svg
├── next.svg
├── vercel.svg
└── window.svg
```

---

## 🎯 Organization Principles

### 1. **Separation of Concerns**
- Source code in `/src`
- Documentation in `/docs`
- Configuration in root
- Static assets in `/public`

### 2. **Logical Grouping**
- Related files grouped by function
- Clear subdirectories for categories
- Consistent naming conventions

### 3. **Easy Navigation**
- Flat structure where possible
- Clear directory names
- README files in each major directory

### 4. **Historical Preservation**
- Archive old/superseded files
- Keep history accessible
- Don't delete valuable context

---

## 📝 File Naming Conventions

### Documentation Files
- `UPPER_CASE_WITH_UNDERSCORES.md` - Major documentation
- `PascalCase.md` - Component/feature specific
- `lowercase-with-dashes.md` - Configuration files

### Source Code
- `PascalCase.tsx` - React components
- `camelCase.ts` - Utilities, hooks, libraries
- `kebab-case.test.ts` - Test files

### Configuration
- Standard names per tool (`package.json`, `tsconfig.json`, etc.)
- Firebase files: `*.rules`, `*.indexes.json`

---

## 🔄 Maintenance

### When Adding New Files

**Documentation:**
- PRD/specs → `/docs/prd/`
- Setup guides → `/docs/setup-guides/`
- Dev logs → `/docs/dev-logs/`
- Old docs → `/docs/archive/`

**Source Code:**
- Components → `/src/components/`
- Hooks → `/src/hooks/`
- Utils → `/src/lib/`
- Types → `/src/types/`
- Tests → `__tests__/` in same directory

**Configuration:**
- Root level only if essential
- Consider if it can go in an existing config file

---

## 🚫 What NOT to Keep in Root

❌ **Don't add to root:**
- Documentation files (use `/docs/`)
- Implementation notes (use `/.cursor/`)
- Temporary files
- Build artifacts
- IDE-specific files (add to `.gitignore`)

✅ **Only in root:**
- Essential configuration files
- Package management files
- README.md (main documentation)
- Environment examples

---

## 🔍 Quick Reference

**Need to find...**
- Setup instructions? → `/docs/setup-guides/`
- Architecture docs? → `/docs/architecture.md`
- Test guide? → `/docs/TESTING.md` or `/.cursor/TESTING_GUIDE.md`
- Project status? → `/docs/project-management/`
- Implementation details? → `/.cursor/implementation-docs/`
- Historical docs? → `/docs/archive/`

---

**Organized:** October 17, 2025  
**Structure:** Clean, maintainable, scalable

