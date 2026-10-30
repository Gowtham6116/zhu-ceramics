# Enquiry integration status

The existing demo-only enquiry form has been changed to submit to `/api/enquiry`.

Included in this package:
- Cloudflare Pages Function: `functions/api/enquiry.js`
- Google Apps Script receiver: `google-apps-script/Code.gs`
- Setup instructions: `GOOGLE_APPS_SCRIPT_SETUP.md`
- Cloudflare chapter-route rewrites: `_redirects`

Not yet configured or live-tested because this package does not contain the owner's Google account authorization, Apps Script deployment URL, shared secret, or CallMeBot activation key. Follow the setup guide, then test with real accounts before publishing.
