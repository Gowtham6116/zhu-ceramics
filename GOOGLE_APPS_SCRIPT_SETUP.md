# Kani Ceramics enquiry integration setup

This package connects the existing portfolio form to Google Sheets, Gmail notifications, and an optional CallMeBot WhatsApp alert. It does not require Google Forms, n8n, Zapier, or a separate server.

## How submissions move

1. The customer submits the existing form on the website.
2. The browser sends the form to the same-origin Cloudflare Pages endpoint `/api/enquiry`.
3. The Pages Function forwards the enquiry privately to the Google Apps Script Web App.
4. Apps Script stores the enquiry in Google Sheets, sends one email to the admin, sends one thank-you email to the customer, and optionally calls CallMeBot to notify the admin.

CallMeBot is only a notification destination. It does not read or extract form fields itself; Apps Script processes the fields and builds the WhatsApp text.

## A. Create the Google Sheet and Apps Script

1. Sign in to the Google account that should own the enquiry sheet and send emails.
2. Open <https://script.google.com/> and create a new project named `Kani Ceramics Enquiry Handler`.
3. Replace the editor contents with `google-apps-script/Code.gs` from this ZIP.
4. Save the project. From the function selector, choose `setupEnquiriesSheet` and click **Run** once. Approve the Google permissions.
5. Open the execution log. The function logs the Google Sheet URL. The Sheet ID is also stored in Script Properties automatically.

## B. Set Apps Script properties

In Apps Script, open **Project Settings** → **Script Properties** and add:

| Property | Value |
|---|---|
| `ADMIN_EMAIL` | `kaniceramicscbe@gmail.com` (or the actual admin inbox) |
| `SHARED_SECRET` | Create a long random secret, at least 32 characters |
| `CALLMEBOT_PHONE` | Admin's CallMeBot-activated WhatsApp number, country code included |
| `CALLMEBOT_API_KEY` | API key received from CallMeBot |

`CALLMEBOT_PHONE` and `CALLMEBOT_API_KEY` are optional. Leave both unset to test Sheets and email first. The CallMeBot key must never be placed in website JavaScript or GitHub.

**CallMeBot warning:** CallMeBot's own free API page says it is for personal use only, and its FAQ says its key can send messages only to the phone number associated with that key. Kani Ceramics is a business website, so do not enable this free WhatsApp integration for production unless CallMeBot confirms that the intended business use is allowed. See <https://www.callmebot.com/faq/> and <https://www.callmebot.com/blog/free-api-whatsapp-messages/>.

## C. Deploy Apps Script as a Web App

1. Click **Deploy** → **New deployment**.
2. Select type **Web app**.
3. Set **Execute as** to your account.
4. Set **Who has access** to **Anyone**. The script checks the shared secret before processing any submission.
5. Deploy, authorize if prompted, and copy the Web App URL ending in `/exec`.

Do not share the Web App URL together with the shared secret publicly.

## D. Configure Cloudflare Pages

Open your Pages project → **Settings** → **Variables and Secrets** (or the Functions environment variables section) and add these variables for Production (and Preview if you will test preview deployments):

| Variable | Value |
|---|---|
| `GOOGLE_APPS_SCRIPT_URL` | The Apps Script Web App `/exec` URL |
| `APPS_SCRIPT_SHARED_SECRET` | The exact same secret as Apps Script `SHARED_SECRET` |

The secret is added by the Pages Function and is never sent to the visitor's browser. Redeploy after adding variables.

## E. Cloudflare Pages build settings

For this plain HTML/CSS/JS project:

- Production branch: `main`
- Build command: `exit 0`
- Build output directory: `public`

The `functions/` folder at the project root is the Cloudflare Pages Function source. The `public/_redirects` file routes the existing chapter URLs back to `index.html`. The original backup and setup documents stay outside the published `public` directory. For local preview, run `npm start`; set `GOOGLE_APPS_SCRIPT_URL` and `APPS_SCRIPT_SHARED_SECRET` in the terminal environment to enable the local enquiry proxy.

## F. Test before sharing the website

1. First leave CallMeBot properties empty and submit a test enquiry using an email address you can check.
2. Confirm a new row appears in the `Enquiries` Google Sheet.
3. Confirm the admin email arrives at `ADMIN_EMAIL`.
4. Confirm the customer thank-you email arrives at the submitted email address.
5. Check the final three status columns in the Sheet.
6. Only after all email and sheet tests pass, configure CallMeBot if its terms permit this use; submit another test and verify the admin WhatsApp notification.

## Quota note

Google Apps Script currently documents 100 email recipients per day for consumer accounts and 1,500 for Google Workspace accounts. Each enquiry sends two recipients (admin + customer), so a consumer Gmail account has a theoretical ceiling of about 50 complete enquiries per day if no other Apps Script email sends use that quota. Google may change quotas. Source: <https://developers.google.com/apps-script/guides/services/quotas>.

## Important operational notes

- The website is not connected until the Apps Script deployment URL and matching shared secret are configured in Cloudflare.
- The admin email, customer email, and CallMeBot request are attempted independently after the Sheet row is saved. A WhatsApp failure will not discard the enquiry.
- A row in Google Sheets is the durable enquiry record. Check the last three columns for notification status.
- Do not commit API keys, Apps Script secrets, or CallMeBot keys to GitHub.
