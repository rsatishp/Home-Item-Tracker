# Implementation Plan - Home Item Tracker

## High-Level Goal
Build a private, permanent, and user-friendly utility to help track where items are located around the home. The system should allow you to record information about an item's location using natural language (e.g., "I put my passport in the blue folder in the study") and retrieve that information later with simple queries (e.g., "Where is my passport?").

## Why This Approach?
To ensure your data remains completely private, portable, and accessible forever without ongoing costs, this utility is designed as a self-contained, browser-based app. It stores your information directly in a human-readable JSON file in your personal Google Drive. Because it runs entirely within your device's browser, there is no backend server—meaning no subscription fees, no App Store limitations, and complete ownership of your data.

## Technical Architecture
- **Host:** GitHub Pages (a free, static web hosting service).
- **Distribution:** "Added to Home Screen" on iPhone (PWA) and "Added to Dock" on Mac, allowing it to function and feel like a native app.
- **Storage:** Direct integration with Google Drive (using `gapi`). Your data lives in a portable `home_items_sync.json` file in your drive.
- **AI Intelligence:** The Gemini API (accessed directly from your browser) processes your natural language input to keep your data organized and searchable.

## Implementation Details
- **Language:** TypeScript (for type-safe data structures).
- **Framework:** Next.js (Static HTML Export mode).
- **AI Integration:** The user provides their own Gemini API key in the app settings, which is stored locally in their browser (`localStorage`), ensuring it is never sent to GitHub.
- **Data Structure:** 
  ```typescript
  interface Item {
    id: string;
    name: string;
    location: string;
    tags: string[];
    originalText: string;
    updatedAt: string;
  }
  ```

## Implementation Steps

### Phase 1: Project & PWA Setup
1. Initialize Next.js with TypeScript and Tailwind.
2. Configure `next.config.js` for static output (`output: 'export'`).
3. Set up the `manifest.json` and service worker to enable "Add to Home Screen" functionality.

### Phase 2: Google Drive & Auth Service
1. Initialize the `gapi` client in the browser.
2. Implement sign-in and file-fetching logic in `lib/drive-service.ts`.

### Phase 3: Gemini AI Service
1. Implement the AI logic in `lib/gemini-service.ts`.
2. Create prompts for structured data extraction and contextual querying.

### Phase 4: UI & Sync Logic
1. Create a "Home" dashboard with a text input for entries and a search bar.
2. Implement auto-sync logic that triggers after Gemini successfully parses a new entry.

### Phase 5: Deployment to GitHub Pages
1. Push code to a GitHub repository.
2. Set up a GitHub Action to automatically build and deploy the static files to the `gh-pages` branch.

## Verification & Testing
- **End-to-End Sync:** Record an item on a Mac and verify the JSON file on Google Drive updates, then see it reflected on the iPhone.
- **Privacy Audit:** Verify that no item data or API keys are sent to GitHub servers.
- **Offline Entry:** Test adding an item while offline and verifying it syncs once back online.
