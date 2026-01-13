# Deployment Guide

This guide covers how to deploy the **YouTube Search Library** and its associated demo page.

## 1. Publishing to npm

The library is configured as an ES module. To publish it to the npm registry:

1.  **Version Check**: Ensure the version in `package.json` is correct.
    ```json
    "version": "1.0.0"
    ```
2.  **Login**: Ensure you are logged into npm.
    ```bash
    npm login
    ```
3.  **Publish**:
    ```bash
    npm publish --access public
    ```

## 2. CDN Integration

Once published to npm, the library can be used directly in the browser via CDNs like **unpkg** or **jsDelivr**.

### unpkg
Include the library in your HTML using a script tag with `type="module"`:
```html
<script type="module">
  import YouTubeClient from 'https://unpkg.com/sisyphus-yt-search-lib@1.0.0/src/index.js';
  
  const client = new YouTubeClient({ proxyUrl: 'YOUR_PROXY_URL' });
  // ... use client
</script>
```

### jsDelivr
```html
<script type="module">
  import YouTubeClient from 'https://cdn.jsdelivr.net/npm/sisyphus-yt-search-lib@1.0.0/src/index.js';
  // ... use client
</script>
```

## 3. Hosting the Demo on GitHub Pages

The project includes an `index.html` file that showcases a premium search interface. You can host this demo using GitHub Pages:

1.  Push the code to your GitHub repository.
2.  Navigate to **Settings** > **Pages**.
3.  Under **Build and deployment**, select **Deploy from a branch**.
4.  Choose the `main` (or `master`) branch and the root directory `/`.
5.  Click **Save**.
6.  Your demo will be available at `https://<your-username>.github.io/yt-search-lib/`.

---

**Note**: When hosting on GitHub Pages, ensure you have configured a CORS proxy in your demo code, as GitHub Pages is served over HTTPS and will block insecure or cross-origin requests to YouTube's API.
