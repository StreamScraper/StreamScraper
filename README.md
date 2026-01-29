# Cloud Stream Scraper

A configurable Stremio addon that runs entirely in the cloud using Vercel Serverless Functions.

## Features
*   **Web Configuration:** Set your preferred file size, resolution, and seed count via a clean UI.
*   **Serverless:** No server management required. Runs on-demand.
*   **Debrid Support:** Optional Real-Debrid integration for high-speed streaming.
*   **Smart Filtering:** Automatically removes torrents that don't match your criteria.

---

## 🚀 Deployment Guide (Vercel)

The easiest way to host this is using **Vercel** with a **GitHub** repository.

### Step 1: Create a GitHub Repository
1.  Go to [GitHub.com](https://github.com) and sign in.
2.  Click the **+** icon in the top right and select **New repository**.
3.  Name it (e.g., `my-stream-scraper`) and click **Create repository**.
4.  Upload the files from this project to your new repository.

### Step 2: Deploy to Vercel
1.  Go to [Vercel.com](https://vercel.com) and sign up/log in.
2.  Click **Add New...** > **Project**.
3.  Select the GitHub repository you just created.
4.  **Configure Project:**
    *   **Framework Preset:** Vercel should automatically detect `Vite`.
    *   **Root Directory:** Leave as `./`.
    *   **Build Command:** `npm run build`.
    *   **Output Directory:** `dist`.
    *   **Environment Variables:** None needed.
5.  Click **Deploy**.

### Step 3: Use Your Addon
1.  Once deployed, Vercel will give you a domain (e.g., `https://my-stream-scraper.vercel.app`).
2.  Open that link in your browser.
3.  Fill in your preferences (Seeds, Resolution) and optional Real-Debrid key.
4.  Click **"Install to Stremio"**.

---

## ❓ Troubleshooting

### "Using default config (URL config invalid or empty)"
You might see this message in your browser console when you visit the homepage. **This is normal.**
*   The app checks the URL to see if you are trying to edit an existing configuration.
*   If you are on the homepage (e.g., `.../`), no config exists, so it loads the defaults and logs this message.

### "Failed to parse config"
If you manually edit the URL or copy a broken link, the app will fail to load the settings and revert to the default values to prevent crashing.

### Real-Debrid Key
The Real-Debrid key is **never stored on a server**. It is encoded directly into the `stremio://` installation link. This means only you and your Stremio app have access to it.

---

## 🛠 Development

To run locally:
```bash
npm install
npm run dev
```
Note: The backend scraping logic (`/api/index.js`) requires the Vercel environment (`vercel dev`) to run locally, or you can mock it. Ideally, test the UI locally and deploy to Vercel to test the scraper.
