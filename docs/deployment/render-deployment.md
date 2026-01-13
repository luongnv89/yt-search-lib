# Deploying CORS Proxy Server on Render

This guide walks you through deploying the CORS proxy server to [Render](https://render.com), a modern cloud platform for hosting applications.

## Why Render?

- **Easy Setup**: Web UI for deployment
- **Free Tier**: Available for testing and development
- **Auto-Deploy**: Deploy from GitHub automatically
- **Environment Variables**: Simple configuration management
- **SSL/HTTPS**: Free SSL certificates included
- **24/7 Uptime**: Reliable hosting for production use

## Prerequisites

Before you start, you'll need:

1. **GitHub Account** - Push code to a GitHub repository
2. **Render Account** - Sign up at [render.com](https://render.com)
3. **YouTube Search Repository** - Your fork/copy of the yt-search-lib repository

## Step 1: Prepare Your Repository

### 1.1 Ensure proxy-server.js is in the root

The proxy-server.js file should be in the root directory of your repository:

```
yt-search-lib/
├── proxy-server.js          ← This file
├── package.json
├── src/
├── .gitignore
└── ...
```

### 1.2 Verify package.json has correct scripts

Check that your `package.json` includes:

```json
{
  "scripts": {
    "proxy:start": "node proxy-server.js",
    ...
  }
}
```

### 1.3 Create a Render configuration file

Create a `render.yaml` file in the root of your repository:

```yaml
services:
  - type: web
    name: youtube-proxy
    env: node
    plan: free
    buildCommand: npm install
    startCommand: node proxy-server.js
    envVars:
      - key: PORT
        value: 10000
```

Save this in the root directory:
```
yt-search-lib/
├── render.yaml              ← Add this file
├── proxy-server.js
├── package.json
└── ...
```

### 1.4 Push to GitHub

Make sure your code is pushed to a GitHub repository:

```bash
git add proxy-server.js render.yaml
git commit -m "feat: add CORS proxy server with Render deployment config"
git push origin main
```

## Step 2: Create a Web Service on Render

### 2.1 Go to Render Dashboard

1. Log in to [dashboard.render.com](https://dashboard.render.com)
2. Click the **"New +"** button
3. Select **"Web Service"**

### 2.2 Connect Your GitHub Repository

1. Select **"Build and deploy from a Git repository"**
2. Click **"Connect account"** if you haven't authorized Render with GitHub
3. Search for your `yt-search-lib` repository
4. Select it and click **"Connect"**

### 2.3 Configure the Web Service

Fill in the deployment settings:

| Field | Value |
|-------|-------|
| **Name** | `youtube-proxy` |
| **Environment** | `Node` |
| **Build Command** | `npm install` |
| **Start Command** | `node proxy-server.js` |
| **Plan** | Free (or higher for production) |

### 2.4 Set Environment Variables

Click **"Advanced"** and add environment variables:

| Key | Value |
|-----|-------|
| `PORT` | `10000` |
| `NODE_ENV` | `production` |

**Note**: Render assigns port 10000 by default on the free tier. The proxy will automatically use the PORT environment variable.

### 2.5 Deploy

Click **"Create Web Service"** and Render will:
1. Clone your repository
2. Install dependencies
3. Start the proxy server
4. Provide you with a public URL

## Step 3: Get Your Proxy URL

After deployment, you'll see your service dashboard with:

- **Service URL**: Something like `https://youtube-proxy.onrender.com`
- **Status**: "Live" when ready

Your proxy URL is:
```
https://youtube-proxy.onrender.com/proxy?url=
```

## Step 4: Use the Proxy in Your Code

### Local Development

```javascript
import { YouTubeClient } from 'yt-search-lib';

// Use local proxy for development
const proxyUrl = process.env.YOUTUBE_PROXY_URL || 'http://127.0.0.1:3000/proxy?url=';

const client = new YouTubeClient({
  proxyUrl: proxyUrl
});

const results = await client.search('lofi hip hop');
console.log(results);
```

### Production with Render

```javascript
import { YouTubeClient } from 'yt-search-lib';

// Use Render proxy in production
const proxyUrl = 'https://youtube-proxy.onrender.com/proxy?url=';

const client = new YouTubeClient({
  proxyUrl: proxyUrl
});

const results = await client.search('lofi hip hop');
console.log(results);
```

### Environment Variable Setup

Create a `.env` file for local development:

```bash
# .env (local development)
YOUTUBE_PROXY_URL=http://127.0.0.1:3000/proxy?url=
```

In production (Render), set the environment variable in the Render dashboard:

```
YOUTUBE_PROXY_URL=https://youtube-proxy.onrender.com/proxy?url=
```

Then use it in your code:

```javascript
const proxyUrl = process.env.YOUTUBE_PROXY_URL || 'http://127.0.0.1:3000/proxy?url=';
const client = new YouTubeClient({ proxyUrl });
```

## Step 5: Monitor Your Deployment

### View Logs

1. Go to your service page on Render
2. Click **"Logs"** to see real-time logs
3. Check for errors or issues

### Common Startup Messages

**Success:**
```
CORS Proxy Server running on http://0.0.0.0:10000
Use proxy URL: https://youtube-proxy.onrender.com/proxy?url=
```

**Error: Port Already in Use**
```
Error: listen EADDRINUSE: address already in use :::3000
```
Solution: Make sure you're setting PORT=10000 in environment variables.

### Health Checks

Render performs health checks. If your service keeps restarting:

1. Check the logs for errors
2. Verify PORT environment variable is set to 10000
3. Ensure proxy-server.js is executable and error-free

## Step 6: Test Your Deployed Proxy

### Using curl

```bash
curl -X POST "https://youtube-proxy.onrender.com/proxy?url=https%3A%2F%2Fwww.youtube.com" \
  -H "Content-Type: application/json" \
  -d '{}'
```

### Using Node.js

```javascript
const response = await fetch('https://youtube-proxy.onrender.com/proxy?url=https://www.youtube.com', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: '{}'
});
console.log(response.status); // Should be 200
```

### Using the YouTube Search Library

```javascript
import { YouTubeClient } from 'yt-search-lib';

const client = new YouTubeClient({
  proxyUrl: 'https://youtube-proxy.onrender.com/proxy?url='
});

const results = await client.search('lofi hip hop', { limit: 3 });
console.log(results[0].title); // Should output a video title
```

## Troubleshooting Render Deployment

### Service Won't Start

**Problem**: Service shows "Build failed" or "Deploy failed"

**Solutions**:
1. Check the **Logs** tab for error messages
2. Verify `proxy-server.js` is in the root directory
3. Ensure `package.json` exists and has no syntax errors
4. Try updating the buildCommand to `npm ci` instead of `npm install`

### Connection Timeout

**Problem**: Getting "Connection timeout" errors

**Reasons**:
- YouTube is blocking the IP
- Proxy URL incorrect
- Service crashed

**Solutions**:
1. Check logs: `Logs` tab on Render dashboard
2. Verify the full proxy URL is correct
3. Restart the service: Click the three dots menu > "Restart service"

### Port Issues

**Problem**: "Address already in use" error

**Cause**: PORT environment variable not set correctly

**Fix**:
1. Go to service settings
2. Click **"Environment"**
3. Set `PORT` to `10000`
4. Restart the service

### YouTube Blocking Requests

**Problem**: Proxy returns "Error" or empty responses

**Causes**:
- YouTube detecting automated requests
- IP rate-limited
- YouTube changed their API

**Solutions**:
1. Wait 10-15 minutes and try again
2. Use a VPN or different service
3. Check if YouTube's HTML structure changed
4. Contact YouTube for API access

## Advanced Configuration

### Auto-Deploy from GitHub

Render automatically deploys when you push to main:

1. The proxy updates automatically
2. No manual redeploy needed
3. Downtime is minimal (usually 30-60 seconds)

To prevent auto-deploy:
1. Go to your service settings
2. Find "Auto-Deploy" toggle
3. Turn it off

### Custom Domain

To use a custom domain instead of `onrender.com`:

1. Click **"Settings"** on your service page
2. Scroll to **"Custom Domain"**
3. Add your domain and follow DNS instructions

Example: `https://youtube-proxy.yourdomain.com`

### Scaling (Paid Plans)

On paid plans, you can:
- Increase instance size for better performance
- Enable auto-scaling for high traffic
- Use multiple instances for redundancy

### Environment Variables for Security

To add authentication to your proxy (recommended for production):

1. In service settings, add environment variables:
   ```
   PROXY_API_KEY=your-secret-key-here
   ```

2. Update `proxy-server.js` to check for the API key

### Backup and Recovery

Render automatically:
- Keeps deployment history
- Allows quick rollbacks to previous versions
- Stores logs for 30 days

To rollback:
1. Go to **"Deployments"** tab
2. Find the previous deployment
3. Click **"Redeploy"**

## Cost Considerations

### Free Tier (Perfect for Development)

- 1 free instance running 24/7
- 750 hours/month (enough for continuous uptime)
- 100GB outbound bandwidth/month
- Cold starts after 15 minutes of inactivity
- Suitable for testing

### Starter Plan ($7/month)

- No cold starts
- 3GB RAM, more CPU power
- Priority support
- Good for small production use

### Pro Plan ($12/month+)

- More resources
- Multiple instances
- Auto-scaling available
- Better for high-traffic applications

**Recommendation**: Start with free tier for development, upgrade to Starter for production use.

## Monitoring and Maintenance

### Set Up Alerts

Unfortunately, Render's free tier doesn't have built-in alerts, but you can:

1. Use third-party monitoring (Uptimerobot.com - free tier available)
2. Check logs daily manually
3. Monitor from your application

### Regular Maintenance

- Check logs weekly for errors
- Update proxy-server.js if YouTube API changes
- Monitor bandwidth usage on paid plans
- Review and test periodically

## Next Steps

1. **Deploy**: Follow the steps above to deploy on Render
2. **Test**: Use the test commands in Step 6
3. **Integrate**: Update your YouTube Search Library client to use the proxy URL
4. **Monitor**: Check logs and performance regularly
5. **Scale**: Upgrade plan if needed based on traffic

## Support Resources

- **Render Docs**: https://render.com/docs
- **Render Community**: https://render.com/community
- **GitHub Issues**: Report deployment issues on the yt-search-lib repository

## Example Repository Structure

For reference, your repository should look like this:

```
yt-search-lib/
├── render.yaml                    # Render configuration
├── proxy-server.js                # Proxy server code
├── integration-with-proxy.test.js # Tests
├── RENDER_DEPLOYMENT.md           # This file
├── PROXY_SETUP.md                 # Local setup guide
├── package.json                   # Dependencies
├── src/
│   ├── index.js
│   ├── lib/
│   │   ├── cache.js
│   │   ├── constants.js
│   │   ├── parser.js
│   │   └── transport.js
│   └── types.js
├── .gitignore
├── README.md
└── LICENSE
```

## Summary

You now have:

1. ✅ A deployed CORS proxy on Render
2. ✅ A public URL for the proxy
3. ✅ Automatic deployment from GitHub
4. ✅ Environment variables configured
5. ✅ Real-time logs for monitoring

Your YouTube Search Library can now make requests to YouTube from any browser or environment using the Render proxy URL!
