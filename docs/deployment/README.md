# Deployment & Hosting Guide

This guide covers all aspects of deploying the YouTube Search Library proxy server and using it in production.

## 🎯 Quick Decision Tree

**Where do you want to run the proxy?**

| Option | Best For | Setup Time | Cost | Pros | Cons |
|--------|----------|-----------|------|------|------|
| **Local Development** | Testing, development | 5 min | $0 | Easy setup, no config | Only works locally |
| **Render (Free)** | Demo, small projects | 5 min | $0/mo | Simple, fast deploy | Cold starts, rate limits |
| **Render (Paid)** | Production, reliability | 5 min | $7+/mo | Reliable, fast | Monthly cost |
| **Custom Server** | Full control | 30 min | Varies | Maximum flexibility | More setup required |

## 🚀 Deployment Options

### 1. Local Development

Run the proxy locally on your machine for development and testing.

- **Time**: 5 minutes
- **Cost**: Free
- **Guide**: [Local Proxy Setup](./local-proxy.md)
- **Best for**: Development, testing, learning

**Quick start:**
```bash
npm run proxy:start
# Proxy runs at: http://127.0.0.1:3000/proxy?url=
```

---

### 2. Render Cloud (Free Tier)

Deploy to Render's free tier for a publicly accessible proxy.

- **Time**: 5 minutes
- **Cost**: Free ($0/month)
- **Limitations**: Cold starts after 15 min inactivity, 100GB bandwidth/month
- **Guide**: [Render Quick Start](./render-quick-start.md) (5 min)
- **Full Guide**: [Render Deployment](./render-deployment.md) (detailed)
- **Best for**: Demos, testing in production, small projects

**Perfect for:**
- Side projects
- Demos and prototypes
- Learning deployments
- Testing with real URLs

---

### 3. Render Cloud (Paid Tier)

Deploy to Render's paid tier for production reliability.

- **Time**: 5 minutes
- **Cost**: Starting at $7/month
- **No cold starts**: Always running
- **Guide**: [Render Deployment](./render-deployment.md)
- **Best for**: Production applications, reliable uptime

**Includes:**
- No cold starts
- 3GB RAM, more CPU
- Priority support
- Good for production

---

### 4. Custom Proxy Server

Deploy your own proxy server with full control.

- **Time**: 30 minutes
- **Cost**: Depends on hosting
- **Flexibility**: Maximum
- **Guide**: [Custom Proxy](./custom-proxy.md)
- **Best for**: Advanced deployments, specific requirements

**Options:**
- Node.js/Express on any VPS
- Docker containers
- Cloudflare Workers
- AWS Lambda
- Your own server

---

## 📋 Next Steps

1. **Choose your deployment** - Pick from options above
2. **Follow the guide** - Each option has a dedicated guide
3. **Test the proxy** - Verify it's working
4. **Monitor production** - See [Monitoring Guide](./monitoring.md)
5. **Implement security** - See [Security Guide](./security.md)

---

## 🔗 Deployment Guides

### Getting Started
- **[Local Proxy Setup](./local-proxy.md)** - Run proxy on your machine
- **[Render Quick Start](./render-quick-start.md)** - 5-minute Render deployment

### Production Deployment
- **[Render Deployment](./render-deployment.md)** - Complete Render guide with options
- **[Custom Proxy](./custom-proxy.md)** - Build your own proxy server
- **[Monitoring](./monitoring.md)** - Monitor and maintain production
- **[Security](./security.md)** - Security best practices

### Troubleshooting
See **[Troubleshooting Guide](../troubleshooting/README.md)** for common issues:
- CORS errors
- Connection problems
- Performance issues
- YouTube blocking

---

## 🆚 Deployment Comparison

### Performance
| Aspect | Local | Render Free | Render Paid | Custom |
|--------|-------|------------|------------|--------|
| **Response Time** | <100ms | 500ms-2s* | <500ms | Varies |
| **Availability** | 100% (while running) | 99% | 99.9% | Varies |
| **Cold Starts** | No | Yes (15 min) | No | No |
| **Bandwidth** | Unlimited | 100GB/mo | Unlimited | Varies |

*Render free tier may have cold starts

### Costs
| Option | Hourly | Monthly | Notes |
|--------|--------|---------|-------|
| **Local** | $0 | $0 | Computer cost only |
| **Render Free** | $0 | $0 | Limited features |
| **Render Starter** | $0.3 | $7 | Recommended for prod |
| **Render Pro** | $0.5 | $12 | High volume |
| **Custom VPS** | $0.07-0.5 | $5-15 | Varies by provider |

---

## 📝 Configuration By Deployment

### Local Development
```javascript
const client = new YouTubeClient({
  proxyUrl: 'http://127.0.0.1:3000/proxy?url='
});
```

### Render Deployment
```javascript
const client = new YouTubeClient({
  proxyUrl: 'https://youtube-proxy.onrender.com/proxy?url='
});
```

### Environment-Based (Recommended)
```javascript
const proxyUrl = process.env.YOUTUBE_PROXY_URL ||
  'http://127.0.0.1:3000/proxy?url=';

const client = new YouTubeClient({ proxyUrl });
```

**Set environment variables:**
```bash
# .env.local (development)
YOUTUBE_PROXY_URL=http://127.0.0.1:3000/proxy?url=

# .env.production
YOUTUBE_PROXY_URL=https://youtube-proxy.onrender.com/proxy?url=
```

---

## 🆘 Common Issues

**"Connection refused"**
→ Make sure proxy is running locally or deployed to cloud
→ Check proxy URL is correct

**"Timeout waiting for response"**
→ Render free tier may have cold starts
→ Upgrade to Starter plan for no cold starts

**"YouTube returning error page"**
→ YouTube may be rate limiting
→ Wait 10-30 minutes and retry
→ See [YouTube Blocking](../troubleshooting/youtube-blocking.md)

**"SSL certificate errors"**
→ Use HTTPS URLs on Render
→ Verify certificate is valid

For more help, see [Troubleshooting Guide](../troubleshooting/README.md)

---

## 📚 Related Resources

- **[Local Proxy Setup](./local-proxy.md)** - Development environment
- **[Render Quick Start](./render-quick-start.md)** - 5-minute deployment
- **[Render Deployment](./render-deployment.md)** - Complete Render guide
- **[Monitoring](./monitoring.md)** - Production monitoring
- **[Security](./security.md)** - Security best practices
- **[Troubleshooting](../troubleshooting/README.md)** - Fix common problems

---

**← [Back to Documentation](../README.md)**

Last Updated: January 2024 | [Report Issue](https://github.com/luongnv89/yt-search-lib/issues)
