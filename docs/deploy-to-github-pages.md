# Deploying Home Tracker to GitHub Pages

Follow these steps once to get the app live at a public URL your whole family can bookmark.

---

## Step 1 — Push this project to GitHub

1. Go to [github.com](https://github.com) and create a new **empty** repository (no README, no .gitignore).
2. In your Replit project, open the **Git** panel (the branch icon in the left sidebar).
3. Connect the Replit repo to your new GitHub repo and push the `main` branch.

> If you've already connected Replit to GitHub, just push to `main` and skip to Step 2.

---

## Step 2 — Enable GitHub Pages

1. Open your GitHub repository and go to **Settings → Pages**.
2. Under **Source**, choose **Deploy from a branch**.
3. Set the branch to **`gh-pages`** and the folder to **`/ (root)`**.
4. Click **Save**.

> The `gh-pages` branch is created automatically the first time the GitHub Actions workflow runs (after your first push to `main`).

---

## Step 3 — Trigger the first deployment

Push any change to the `main` branch (or open **Actions → Deploy Home Tracker to GitHub Pages → Run workflow** to trigger it manually).

The workflow will:
- Install dependencies
- Build the app with the correct base path for your repo
- Push the built files to the `gh-pages` branch
- Make the app available at `https://<your-username>.github.io/<your-repo-name>/`

You can watch the progress under the **Actions** tab in your GitHub repo. A green checkmark means it's live.

---

## Step 4 — Share the link with your family

Your app URL is:

```
https://<your-github-username>.github.io/<your-repo-name>/
```

Replace `<your-github-username>` and `<your-repo-name>` with your actual values.

---

## Installing on phones ("Add to Home Screen")

The app is a Progressive Web App (PWA), so family members can install it like a native app:

**iOS Safari**
1. Open the app URL in Safari.
2. Tap the Share button (box with arrow pointing up).
3. Tap **Add to Home Screen** → **Add**.

**Android Chrome**
1. Open the app URL in Chrome.
2. Tap the three-dot menu → **Add to Home screen** → **Add**.

**Chrome on desktop**
1. Open the app URL.
2. Click the install icon (computer with down arrow) in the address bar → **Install**.

---

## Every future update

Just push to `main` — the GitHub Actions workflow runs automatically and the live site updates within a minute or two.

---

## Using a root Pages repo (optional)

If your GitHub repo is named exactly `<your-username>.github.io` (a root Pages repo), the app lives at `https://<your-username>.github.io/` — no subfolder. In that case the base path should be `/` instead of `/<repo-name>/`.

To deploy with base path `/`:
1. Go to **Actions → Deploy Home Tracker to GitHub Pages → Run workflow**.
2. In the **Base path** field enter `/`.
3. Click **Run workflow**.

All future pushes to `main` from this repo will auto-detect the correct path, so you only need to do this override once for the initial deploy.
