# tldraw License Request

This project requires a tldraw license for production deployment.

## How to Get a FREE License

tldraw offers **free licenses** for:
- Open-source projects
- Personal projects
- Educational projects
- Non-commercial use

### Steps to Request:

1. **Visit**: https://tldraw.dev/community
2. **Or Email**: hello@tldraw.dev
3. **Explain your use case**:

```
Subject: Free License Request for Open-Source Collaborative Canvas

Hi tldraw team,

I'm building CollabCanvas, an open-source real-time collaborative 
whiteboard application using Next.js, Firebase, and tldraw.

Project Details:
- GitHub: https://github.com/TURahim/collab-canvas
- Purpose: Educational/personal project for learning real-time collaboration
- License: MIT (open-source)
- Features: Multi-user canvas with real-time cursor sync and shape persistence

I would like to request a free community license for this project.

Thank you!
```

### Once You Get Your License:

1. **Add to `.env.local`**:
   ```bash
   NEXT_PUBLIC_TLDRAW_LICENSE_KEY=your_license_key_here
   ```

2. **Add to Vercel**:
   - Go to Project Settings → Environment Variables
   - Add: `NEXT_PUBLIC_TLDRAW_LICENSE_KEY` = `your_key`
   - Redeploy

### Alternative: Local Development

For local development without a license:
```bash
npm run dev
# Works fine locally without license
```

### Temporary Workaround

While waiting for a license response, you can:
1. Test locally (no license needed for localhost)
2. Deploy to preview URLs (may have relaxed checks)
3. Wait 1-2 business days for license response

---

**Note**: tldraw is very supportive of open-source projects and typically 
responds within 24-48 hours with free licenses!

