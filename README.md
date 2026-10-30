# Kani Ceramics Portfolio

This package contains the existing static portfolio and an enquiry-submission integration.

## Project structure

- `public/` — website HTML, CSS, JavaScript, images and Cloudflare `_redirects` file.
- `functions/api/enquiry.js` — Cloudflare Pages Function for the same-origin enquiry endpoint.
- `google-apps-script/Code.gs` — Google Sheets, admin email, customer thank-you email, and optional CallMeBot processing.
- `GOOGLE_APPS_SCRIPT_SETUP.md` — complete setup and deployment instructions.
- `backup/original-delivered/` — preserved original website version; this folder is not published because Cloudflare's output directory is `public`.

## Preview locally

Requires Node.js 18 or newer:

```bash
npm start
```

Open `http://localhost:3000`.

The portfolio pages work locally. The enquiry submission endpoint returns a configuration error until these environment variables are set for the local server:

```text
GOOGLE_APPS_SCRIPT_URL=<Apps Script Web App URL ending in /exec>
APPS_SCRIPT_SHARED_SECRET=<same secret configured in Apps Script Script Properties>
```

PowerShell example for the current terminal session:

```powershell
$env:GOOGLE_APPS_SCRIPT_URL="https://script.google.com/macros/s/DEPLOYMENT_ID/exec"
$env:APPS_SCRIPT_SHARED_SECRET="YOUR_LONG_SHARED_SECRET"
npm start
```

## Cloudflare Pages settings

- Production branch: `main`
- Build command: `exit 0`
- Build output directory: `public`

Set `GOOGLE_APPS_SCRIPT_URL` as a Pages variable and `APPS_SCRIPT_SHARED_SECRET` as a Pages secret. See the setup guide for the Google deployment steps and testing checklist.

## Important

The ZIP is integration-ready, not connected to the owner's Google account yet. It contains no live Apps Script URL, shared secret, email credentials, or CallMeBot API key. Those must be configured privately before the live form can send notifications.
