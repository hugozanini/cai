# Cai - Calendar Intelligence

Cai is an enterprise-focused, privacy-first alternative to cloud-based calendar managers like Reclaim.ai. Built entirely as a Google Chrome Extension, Cai brings intelligent calendar automation—auto-scheduling Focus Time, Lunches, and Coffee Breaks—directly into your browser. 

**All scheduling algorithms and data analytics run locally on your machine.** No calendar data is synced to external third-party servers.

## Features (V0)
- **Local-First Architecture:** Utlizes Chrome Manifest V3 Background Service Workers to process calendar events entirely client-side.
- **Auto-Scheduling:** Intelligently analyzes your schedule for the next 14 days and automatically books Focus Time, Lunches, and Coffee Breaks based on your available gaps.
- **Meeting Analytics:** Automatically categorizes your calendar events to provide real-time insights into time spent in 1-on-1s, recurring meetings, and protected focus blocks.
- **Premium Interface:** A glassmorphism-styled Sidebar Panel featuring an onboarding Wizard and a settings Planner.

## Tech Stack
- React
- Vite
- Vanilla CSS
- Chrome Extension API (`chrome.identity`, `chrome.storage`, `chrome.alarms`, `chrome.sidePanel`)
- Google Calendar API

## Local Development
Since Cai requires a connected Google Cloud Project Client ID for OAuth, follow these steps to build and run the extension locally.

### 1. Build the Extension
```bash
npm install
npm run build
```

### 2. Load into Chrome
1. Go to `chrome://extensions/`
2. Enable **Developer mode** in the top right corner.
3. Click **Load unpacked** and select the `/dist` folder that was created in the previous step.
4. Copy the generated Extension ID.

### 3. Setup Google Cloud OAuth
1. Create a project in [Google Cloud Console](https://console.cloud.google.com/).
2. Enable the **Google Calendar API**.
3. Go to **OAuth consent screen**. Create an Internal/External app and add the scopes `calendar.events` and `calendar.readonly`. 
   > *Note: If External and in "Testing", ensure you add your email address to the Test Users list.*
4. Go to **Credentials**, create a new **OAuth client ID** of type **Chrome app**.
5. Paste your Extension ID from Step 2.
6. Copy the generated Client ID.

### 4. Configure Extension
Open `public/manifest.json` and replace the placeholder with your generated Client ID:
```json
  "oauth2": {
    "client_id": "YOUR_CLIENT_ID.apps.googleusercontent.com",
    "scopes": [
      ...
    ]
  }
```

### 5. Rebuild and Run
```bash
npm run build
```
1. Click the Reload icon on the extension page in Chrome.
2. Click the Cai extension icon to open the Side Panel. 
3. Complete the setup Wizard to authorize your calendar and initiate the local scheduler!
