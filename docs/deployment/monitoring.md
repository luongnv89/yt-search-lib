# Deployment Checklist - YouTube Search Library Proxy

Use this checklist to ensure everything is set up correctly before and after deployment.

## Pre-Deployment Checklist

### Prerequisites
- [ ] GitHub account created
- [ ] Render account created (https://render.com)
- [ ] Repository code pushed to GitHub
- [ ] Have access to the YouTube Search repository

### Repository Files
- [ ] `proxy-server.js` is in the root directory
- [ ] `package.json` exists in the root directory
- [ ] `render.yaml` exists in the root directory
- [ ] `.env.example` exists in the root directory
- [ ] `src/` directory contains library code
- [ ] All files are committed and pushed to GitHub

### Configuration
- [ ] `render.yaml` has correct service configuration:
  - [ ] `type: web`
  - [ ] `env: node`
  - [ ] `buildCommand: npm install`
  - [ ] `startCommand: node proxy-server.js`
  - [ ] Environment variables set (PORT=10000, NODE_ENV=production)
- [ ] `.env.example` has all required variables documented

### Local Testing (Optional but Recommended)
- [ ] Run `npm run proxy:start` locally and verify it starts
- [ ] Run `npm run test:integration:proxy` and verify tests pass
- [ ] Test proxy URL locally with curl

## Deployment Steps

### Step 1: GitHub Authorization
- [ ] Go to https://render.com
- [ ] Sign in with GitHub account
- [ ] Click "Dashboard"
- [ ] Authorize Render to access your GitHub repositories

### Step 2: Create Web Service
- [ ] Click "New +" button
- [ ] Select "Web Service"
- [ ] Select "Build and deploy from a Git repository"
- [ ] Find and select `yt-search-lib` repository
- [ ] Click "Connect"

### Step 3: Configure Service
- [ ] Name: `youtube-proxy`
- [ ] Environment: `Node`
- [ ] Build Command: `npm install`
- [ ] Start Command: `node proxy-server.js`
- [ ] Plan: `Free` (or Starter for production)
- [ ] Click "Advanced" to add environment variables

### Step 4: Environment Variables
Add the following environment variables:
- [ ] `PORT` = `10000`
- [ ] `NODE_ENV` = `production`
- [ ] (Optional) `DEBUG` = `false`

### Step 5: Deploy
- [ ] Review all settings are correct
- [ ] Click "Create Web Service"
- [ ] Wait for deployment to complete

## Post-Deployment Checklist

### Verify Deployment
- [ ] Service status shows "Live"
- [ ] No error messages in logs
- [ ] Service URL is visible in dashboard

### Test Proxy Functionality
- [ ] Copy the service URL (e.g., `https://youtube-proxy.onrender.com`)
- [ ] Test with curl:
  ```bash
  curl -X POST "https://youtube-proxy.onrender.com/proxy?url=https%3A%2F%2Fwww.youtube.com" \
    -H "Content-Type: application/json" \
    -d '{}'
  ```
- [ ] Verify response status is 200 or 403 (not 500)
- [ ] (Optional) Test with YouTube Search Library

### Check Logs
- [ ] Go to service page on Render
- [ ] Click "Logs" tab
- [ ] Look for startup message:
  ```
  CORS Proxy Server running on http://0.0.0.0:10000
  ```
- [ ] No error messages after startup

### Update Configuration
- [ ] Update `.env` file with production proxy URL:
  ```
  YOUTUBE_PROXY_URL=https://youtube-proxy.onrender.com/proxy?url=
  ```
- [ ] (If using) Update environment variables in production app
- [ ] Test YouTube Search Library with production proxy

### Initial Testing
- [ ] Test basic search functionality
- [ ] Test different content types (videos, channels, playlists)
- [ ] Test with caching enabled
- [ ] Check response times and performance

## Daily/Weekly Maintenance

### Check Logs (Daily)
- [ ] Review error logs if any
- [ ] Look for unusual patterns
- [ ] Check for repeated errors

### Monitor Performance (Weekly)
- [ ] Check metrics in Render dashboard
- [ ] Review CPU usage
- [ ] Check memory usage
- [ ] Verify uptime

### Test Functionality (Weekly)
- [ ] Run basic search tests
- [ ] Verify results are returned correctly
- [ ] Check response times

## Monthly Maintenance

### Review and Update
- [ ] Check if YouTube API structure changed
- [ ] Update proxy-server.js if needed
- [ ] Review security logs
- [ ] Check for new Render features

### Optimization
- [ ] Analyze traffic patterns
- [ ] Check for bottlenecks
- [ ] Consider upgrading plan if needed
- [ ] Review costs

## Troubleshooting Checklist

If something goes wrong, follow this checklist:

### Service Won't Start
- [ ] Check logs for error messages
- [ ] Verify PORT environment variable is set to 10000
- [ ] Verify NODE_ENV is set to production
- [ ] Check proxy-server.js for syntax errors
- [ ] Verify package.json exists and is valid

### Cannot Connect to Proxy
- [ ] Verify service status is "Live"
- [ ] Check service URL is correct
- [ ] Wait 2-3 minutes if just deployed (cold start)
- [ ] Verify firewall/network allows outgoing HTTPS
- [ ] Check if Render is having issues (status.render.com)

### YouTube Returns No Results
- [ ] Wait 10-15 minutes (rate limiting)
- [ ] Test from different network if possible
- [ ] Check if YouTube status is OK (status.youtube.com)
- [ ] Verify proxy is returning data (check logs)

### Performance Issues
- [ ] Check Render metrics (CPU, memory)
- [ ] Consider upgrading plan
- [ ] Check if YouTube servers are slow
- [ ] Review logs for timeout errors

## Deployment Success Criteria

Your deployment is successful when:

✅ Service shows "Live" status in Render dashboard
✅ Logs show proxy server started without errors
✅ Curl test returns 200/403/success response
✅ YouTube Search Library returns results
✅ No critical errors in logs
✅ Response times are reasonable (<2 seconds)
✅ Service responds to multiple requests

## Common Issues Quick Reference

| Issue | Solution | Guide |
|-------|----------|-------|
| Service won't build | Check logs, verify files exist | RENDER_TROUBLESHOOTING |
| Port error | Set PORT=10000 in env vars | RENDER_TROUBLESHOOTING |
| Cannot connect | Wait for cold start, check firewall | RENDER_TROUBLESHOOTING |
| No YouTube results | Wait for rate limit, check YouTube | RENDER_TROUBLESHOOTING |
| Slow responses | Upgrade plan, check metrics | RENDER_TROUBLESHOOTING |

## Support Resources

- **Render Documentation**: https://render.com/docs
- **Render Status**: https://status.render.com
- **YouTube Status**: https://status.youtube.com
- **GitHub Issues**: Report bugs on the repository

## Notes

Use this space for deployment-specific notes:

```
Deployment Date: _______________
Service Name: _______________
Service URL: _______________
Notes: _______________________________________________
```

---

Once you've completed all items, you should have a working proxy deployment on Render!

For detailed instructions, refer to:
- **Quick deployment**: RENDER_QUICK_START.md
- **Complete guide**: RENDER_DEPLOYMENT.md
- **Troubleshooting**: RENDER_TROUBLESHOOTING.md
