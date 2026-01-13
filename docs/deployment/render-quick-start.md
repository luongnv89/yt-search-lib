# Render Deployment - Quick Start (5 Minutes)

This is a condensed version for quick deployment. See [RENDER_DEPLOYMENT.md](./RENDER_DEPLOYMENT.md) for detailed instructions.

## Prerequisites

- GitHub account
- Render account (free at [render.com](https://render.com))
- Code pushed to GitHub

## Quick Deploy Steps

### Step 1: Link GitHub (One-Time Setup)

1. Go to [render.com](https://render.com)
2. Sign in with GitHub
3. Click **"Dashboard"**
4. Click **"New +"** → **"Web Service"**
5. Click **"Connect account"** and authorize GitHub
6. Select your `yt-search-lib` repository
7. Click **"Connect"**

### Step 2: Configure Service

| Setting | Value |
|---------|-------|
| Name | `youtube-proxy` |
| Environment | `Node` |
| Build Command | `npm install` |
| Start Command | `node proxy-server.js` |
| Plan | `Free` |

### Step 3: Add Environment Variable

Click **"Advanced"** and add:

| Key | Value |
|-----|-------|
| PORT | 10000 |

### Step 4: Click Create

Click **"Create Web Service"**

Render will deploy automatically. You should see:

```
CORS Proxy Server running on http://0.0.0.0:10000
Use proxy URL: https://youtube-proxy.onrender.com/proxy?url=
```

### Step 5: Get Your URL

Your proxy URL is: **`https://youtube-proxy.onrender.com/proxy?url=`**

(Replace `youtube-proxy` with your actual service name)

## Use the Proxy

```javascript
import { YouTubeClient } from 'yt-search-lib';

const client = new YouTubeClient({
  proxyUrl: 'https://youtube-proxy.onrender.com/proxy?url='
});

const results = await client.search('lofi hip hop');
console.log(results);
```

## Test It

```bash
curl -X POST "https://youtube-proxy.onrender.com/proxy?url=https%3A%2F%2Fwww.youtube.com" \
  -H "Content-Type: application/json" \
  -d '{}'
```

## Auto-Deploy (Optional)

Every time you push to GitHub:

```bash
git add .
git commit -m "Update proxy"
git push origin main
```

The proxy automatically redeploys! ✨

## Troubleshooting

| Problem | Solution |
|---------|----------|
| Service won't start | Check **Logs** tab for errors |
| Port error | Make sure PORT=10000 is set in environment |
| Connection timeout | Restart service in dashboard |
| No results from YouTube | Wait 10 min (rate limit) and try again |

## Next Steps

- Read [RENDER_DEPLOYMENT.md](./RENDER_DEPLOYMENT.md) for detailed info
- Set up a custom domain for production
- Monitor logs regularly
- Upgrade to paid plan if needed for production

---

**That's it!** Your proxy is now live on the internet. 🚀
