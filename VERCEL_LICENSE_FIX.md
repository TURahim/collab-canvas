# 🔧 Fix tldraw License Key in Vercel

## Problem Found
Your Vercel environment variable has **extra quotes and a newline character**:
```
"tldraw-2026-01-22/WyJnRTctRldYMiIsWyIqIl0sMTYsIjIwMjYtMDEtMjIiXQ.3WZpiHVMy04vujF6pgKIqf3GFIJW7yB/5EXhxsmFpTj6GPAupxgaKtv051nRySNtgAEZTO9CYAxEKa3vDsP/yg\n"
```

This makes the license key invalid!

## Quick Fix Steps

### Option 1: Fix in Vercel Dashboard (Recommended)
1. Go to: https://vercel.com/trahim-8750s-projects/collab-canvas/settings/environment-variables
2. Find `NEXT_PUBLIC_TLDRAW_LICENSE_KEY`
3. Click the "⋯" menu → **Edit**
4. **Replace the entire value** with this (no quotes, no newline):
   ```
   tldraw-2026-01-22/WyJnRTctRldYMiIsWyIqIl0sMTYsIjIwMjYtMDEtMjIiXQ.3WZpiHVMy04vujF6pgKIqf3GFIJW7yB/5EXhxsmFpTj6GPAupxgaKtv051nRySNtgAEZTO9CYAxEKa3vDsP/yg
   ```
5. Make sure it's enabled for: **Production**, **Preview**, **Development**
6. Click **Save**

### Option 2: Fix via CLI
```bash
# 1. Remove the old variable
vercel env rm NEXT_PUBLIC_TLDRAW_LICENSE_KEY

# 2. Add it back correctly
vercel env add NEXT_PUBLIC_TLDRAW_LICENSE_KEY
# When prompted, paste: tldraw-2026-01-22/WyJnRTctRldYMiIsWyIqIl0sMTYsIjIwMjYtMDEtMjIiXQ.3WZpiHVMy04vujF6pgKIqf3GFIJW7yB/5EXhxsmFpTj6GPAupxgaKtv051nRySNtgAEZTO9CYAxEKa3vDsP/yg
# Select: Production, Preview, Development (all environments)
```

## After Fixing
1. Redeploy: `vercel --prod --yes`
2. The license key should work correctly! ✅

---

**Note**: When adding environment variables in Vercel's dashboard, make sure NOT to include:
- ❌ Quotes around the value
- ❌ Extra spaces or newlines
- ✅ Just paste the raw license key value

