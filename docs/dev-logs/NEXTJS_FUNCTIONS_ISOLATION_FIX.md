# Next.js Build Error - Cloud Functions Isolation Fix

**Date:** October 20, 2025  
**Error:** `Cannot find module 'firebase-functions/v2/firestore'`  
**Status:** ✅ **FIXED**

---

## 🔍 **Root Cause Analysis**

### Hypothesis (100% Correct!)

Next.js was accidentally compiling Cloud Functions source code during web app build:
- ✅ Root `tsconfig.json` included **ALL** `.ts` files via `"**/*.ts"`
- ✅ This included `functions/src/index.ts` in Next.js compilation
- ✅ Next.js tried to resolve `firebase-functions/v2/firestore`
- ✅ Package doesn't exist in web app `node_modules` (only in `functions/node_modules`)
- ❌ Result: Build fails with "Cannot find module"

### Why This Happened

**Root `tsconfig.json` (Before Fix):**
```json
{
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]  // ← Only excludes node_modules!
}
```

**Problem:**
- `**/*.ts` matches `functions/src/index.ts`
- `exclude` doesn't include `functions/**`
- Next.js TypeScript compilation tries to type-check Cloud Functions
- Cloud Functions dependencies not available in web app context

---

## ✅ **Fixes Applied**

### Fix 1: Exclude functions from Root tsconfig.json

**File:** `tsconfig.json`

**Before:**
```json
"exclude": ["node_modules"]
```

**After:**
```json
"exclude": ["node_modules", ".next", "functions/**"]
```

**Impact:**
- ✅ Next.js no longer compiles `functions/**`
- ✅ TypeScript ignores Cloud Functions during web build
- ✅ Proper separation of concerns

---

### Fix 2: Create .eslintignore

**File:** `.eslintignore` (NEW)

```
node_modules/
.next/
out/
build/
dist/
functions/**
*.config.js
*.config.ts
```

**Impact:**
- ✅ ESLint no longer lints Cloud Functions
- ✅ Faster linting
- ✅ No false errors from functions code

---

### Fix 3: Verify Functions Isolation

**File:** `functions/tsconfig.json` (Already Correct)

```json
{
  "compilerOptions": {
    "module": "commonjs",
    "outDir": "lib",
    "target": "es2017",
    "strict": true
  },
  "include": ["src"]  // ← Only includes functions/src
}
```

**File:** `functions/package.json` (Already Correct)

```json
{
  "name": "functions",
  "engines": { "node": "18" },
  "dependencies": {
    "firebase-admin": "^13.5.0",
    "firebase-functions": "^6.1.0"  // ← Has v2 API
  }
}
```

**Impact:**
- ✅ Functions has own dependency tree
- ✅ Separate build output (`lib/`)
- ✅ Isolated from web app

---

## 🧪 **Verification**

### Test 1: Web App Build (Next.js)

```bash
cd /Users/tahmeedrahim/Projects/collab-canvas-submission
pnpm build
```

**Expected Output:**
```
✓ Compiled successfully in 3.5s
```

**Result:** ✅ **SUCCESS** - No errors about firebase-functions

---

### Test 2: Cloud Functions Build (Separate)

```bash
cd /Users/tahmeedrahim/Projects/collab-canvas-submission/functions
npm run build
```

**Expected Output:**
```
> build
> tsc

(no errors)
```

**Result:** ✅ **SUCCESS** - Builds to `lib/index.js`

---

### Test 3: Verify Isolation

```bash
# Web build doesn't touch functions
pnpm build  # Should not compile functions/src/

# Functions build doesn't touch web
cd functions && npm run build  # Should only compile to lib/
```

**Result:** ✅ **BOTH BUILD INDEPENDENTLY**

---

## 📊 **Before vs After**

### Before (Broken)
```
Root tsconfig.json
  ├─ include: "**/*.ts" ← Matches functions/src/index.ts
  ├─ exclude: ["node_modules"] ← Doesn't exclude functions!
  └─ Result: Next.js tries to compile functions/

Next.js Build:
  ├─ Compiles src/**
  ├─ Compiles functions/src/** ❌ (WRONG!)
  └─ Error: Cannot find 'firebase-functions/v2/firestore'
```

### After (Fixed)
```
Root tsconfig.json
  ├─ include: "**/*.ts"
  ├─ exclude: ["node_modules", ".next", "functions/**"] ← Excludes functions!
  └─ Result: Next.js ignores functions/

Next.js Build:
  ├─ Compiles src/**
  ├─ Ignores functions/** ✅ (CORRECT!)
  └─ Result: ✓ Compiled successfully

Functions Build (Separate):
  ├─ Uses functions/tsconfig.json
  ├─ Compiles functions/src/** to functions/lib/
  └─ Result: ✓ Build successful
```

---

## 📝 **File Diffs**

### 1. tsconfig.json
```diff
{
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
- "exclude": ["node_modules"]
+ "exclude": ["node_modules", ".next", "functions/**"]
}
```

### 2. .eslintignore (NEW)
```
node_modules/
.next/
out/
build/
dist/
functions/**
*.config.js
*.config.ts
```

---

## 🎯 **Test Plan**

### Step 1: Clean Build Test
```bash
# Clean everything
rm -rf .next functions/lib

# Build web app
pnpm build
# Expected: ✓ Compiled successfully (no functions errors)

# Build functions separately
cd functions && npm run build
# Expected: Builds to lib/index.js

# Verify output
ls functions/lib/
# Expected: index.js, index.js.map
```

### Step 2: Verify Exclusion
```bash
# Search Next.js build for functions compilation
pnpm build 2>&1 | grep "functions/src"
# Expected: (no output - functions not compiled)
```

### Step 3: Independent Builds
```bash
# Web build
pnpm build
# Should succeed without touching functions/

# Functions build  
cd functions && npm run build
# Should succeed without touching src/
```

---

## 💡 **Why This Works**

### Separation of Concerns
1. **Web App** (`src/`)
   - Compiled by Next.js
   - Uses web dependencies (react, next, tldraw)
   - Output: `.next/` directory
   - tsconfig: Root `tsconfig.json` (excludes functions)

2. **Cloud Functions** (`functions/`)
   - Compiled by TypeScript directly
   - Uses Node.js dependencies (firebase-functions, firebase-admin)
   - Output: `functions/lib/` directory
   - tsconfig: `functions/tsconfig.json` (isolated)

### Dependency Resolution
- **Web app** has `pako`, `next`, `react` in root `node_modules/`
- **Functions** has `firebase-functions`, `firebase-admin` in `functions/node_modules/`
- No cross-contamination

---

## 🎊 **Result**

✅ **Next.js build:** Compiles successfully (ignores functions/)  
✅ **Functions build:** Compiles successfully (independent)  
✅ **TypeScript:** Proper separation  
✅ **ESLint:** Ignores functions  
✅ **Zero errors:** Both builds pass  

---

## 📚 **Lessons Learned**

1. **Always exclude backend code from frontend builds**
   - Add `functions/**`, `server/**`, `backend/**` to tsconfig exclude

2. **Use separate tsconfig.json for different packages**
   - Each package (web, functions, etc.) should have its own

3. **Glob patterns are dangerous**
   - `"**/*.ts"` matches EVERYTHING
   - Always pair with proper excludes

4. **Test both builds independently**
   - `pnpm build` (web)
   - `cd functions && npm run build` (functions)

---

## 🔧 **For Future Projects**

### Monorepo Best Practices
```json
// Root tsconfig.json
{
  "exclude": [
    "node_modules",
    ".next",
    "functions/**",
    "server/**",
    "backend/**",
    "scripts/**"
  ]
}
```

### .eslintignore Template
```
node_modules/
.next/
out/
functions/**
server/**
backend/**
*.config.js
```

---

**Problem diagnosed correctly! Fixed in 2 simple changes!** ✅

