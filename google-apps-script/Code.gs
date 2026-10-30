/**
 * Kani Ceramics enquiry receiver.
 * Deploy this project as a Web App (execute as you; access: Anyone).
 * Configure Script Properties as described in GOOGLE_APPS_SCRIPT_SETUP.md.
 */
const SHEET_NAME = 'Enquiries';
const HEADERS = [
  'Submitted At', 'Customer Name', 'Mobile', 'Email',
  'Product Interest', 'Selected Tiles', 'Project / Room Type', 'Message',
  'Admin Email Sent', 'Customer Email Sent', 'WhatsApp Sent'
];

function setupEnquiriesSheet() {
  const props = PropertiesService.getScriptProperties();
  let spreadsheetId = props.getProperty('SPREADSHEET_ID');
  let spreadsheet;

  if (spreadsheetId) {
    spreadsheet = SpreadsheetApp.openById(spreadsheetId);
  } else {
    spreadsheet = SpreadsheetApp.create('Kani Ceramics - Website Enquiries');
    spreadsheetId = spreadsheet.getId();
    props.setProperty('SPREADSHEET_ID', spreadsheetId);
  }

  let sheet = spreadsheet.getSheetByName(SHEET_NAME);
  if (!sheet) sheet = spreadsheet.insertSheet(SHEET_NAME);
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(HEADERS);
    sheet.setFrozenRows(1);
  }
  Logger.log('Enquiry sheet: ' + spreadsheet.getUrl());
  return spreadsheet.getUrl();
}

function doPost(e) {
  try {
    const raw = e && e.postData && e.postData.contents ? e.postData.contents : '{}';
    const data = JSON.parse(raw);
    const props = PropertiesService.getScriptProperties();
    const expectedSecret = props.getProperty('SHARED_SECRET');

    if (!expectedSecret || !data.secret || data.secret !== expectedSecret) {
      return output_({ success: false, message: 'Request could not be authenticated.' });
    }

    // Secondary spam-trap check. Never store the hidden website field.
    if (clean_(data.website, 200)) {
      return output_({ success: true, stored: false, spam: true });
    }

    const enquiry = normalizeEnquiry_(data);
    const errors = validateEnquiry_(enquiry);
    if (errors.length) {
      return output_({ success: false, message: errors.join(' ') });
    }

    const spreadsheetId = props.getProperty('SPREADSHEET_ID');
    const adminEmail = clean_(props.getProperty('ADMIN_EMAIL'), 254);
    if (!spreadsheetId || !adminEmail) {
      return output_({ success: false, message: 'The enquiry sheet or admin email is not configured.' });
    }

    // Save first. Notifications are attempted independently so one failure
    // does not discard a customer's enquiry.
    let savedRow = 0;
    try {
      const spreadsheet = SpreadsheetApp.openById(spreadsheetId);
      let sheet = spreadsheet.getSheetByName(SHEET_NAME);
      if (!sheet) {
        sheet = spreadsheet.insertSheet(SHEET_NAME);
        sheet.appendRow(HEADERS);
        sheet.setFrozenRows(1);
      }
      const lock = LockService.getScriptLock();
      lock.waitLock(10000);
      try {
        sheet.appendRow([
          new Date(), sheetSafe_(enquiry.name), sheetSafe_(enquiry.mobile), sheetSafe_(enquiry.email),
          sheetSafe_(enquiry.productInterest), sheetSafe_(enquiry.tiles.join(', ')), sheetSafe_(enquiry.space),
          sheetSafe_(enquiry.message), '', '', ''
        ]);
        savedRow = sheet.getLastRow();
      } finally {
        lock.releaseLock();
      }
    } catch (saveError) {
      console.error('Could not save enquiry', saveError);
      return output_({ success: false, message: 'We could not save your enquiry. Please try again.' });
    }

    const adminBody = formatEnquiry_(enquiry, 'New Kani Ceramics website enquiry');
    let adminEmailSent = false;
    let customerEmailSent = false;
    let whatsappSent = false;
    let whatsappStatus = 'not_configured';

    try {
      MailApp.sendEmail({
        to: adminEmail,
        subject: 'New Website Enquiry - ' + enquiry.name,
        body: adminBody,
        name: 'Kani Ceramics Website',
        replyTo: enquiry.email
      });
      adminEmailSent = true;
    } catch (mailError) {
      console.error('Admin email failed', mailError);
    }

    try {
      const customerBody = [
        'Dear ' + enquiry.name + ',',
        '',
        'Thank you for visiting the Kani Ceramics website and submitting your enquiry.',
        'We have successfully received your message. Our staff will review your requirements and contact you shortly.',
        '',
        'Your enquiry summary:',
        formatEnquiry_(enquiry, 'Your enquiry'),
        '',
        'Thank you for your interest in Kani Ceramics.',
        'Kani Ceramics Team'
      ].join('\n');
      MailApp.sendEmail({
        to: enquiry.email,
        subject: 'Thank you for your enquiry - Kani Ceramics',
        body: customerBody,
        name: 'Kani Ceramics',
        replyTo: adminEmail
      });
      customerEmailSent = true;
    } catch (mailError) {
      console.error('Customer confirmation email failed', mailError);
    }

    const callmebotKey = clean_(props.getProperty('CALLMEBOT_API_KEY'), 200);
    const callmebotPhone = clean_(props.getProperty('CALLMEBOT_PHONE'), 30);
    if (callmebotKey && callmebotPhone) {
      try {
        const whatsappText = shortenWhatsAppText_(formatEnquiry_(enquiry, 'New website enquiry - Kani Ceramics'));
        const url = 'https://api.callmebot.com/whatsapp.php'
          + '?phone=' + encodeURIComponent(callmebotPhone)
          + '&text=' + encodeURIComponent(whatsappText)
          + '&apikey=' + encodeURIComponent(callmebotKey);
        const waResponse = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
        const waCode = waResponse.getResponseCode();
        whatsappStatus = 'http_' + waCode;
        whatsappSent = waCode >= 200 && waCode < 300;
        if (!whatsappSent) console.error('CallMeBot returned', waCode, waResponse.getContentText().slice(0, 300));
      } catch (waError) {
        whatsappStatus = 'request_failed';
        console.error('CallMeBot notification failed', waError);
      }
    }

    // Update the most recent row's delivery status for admin troubleshooting.
    try {
      const sheet = SpreadsheetApp.openById(spreadsheetId).getSheetByName(SHEET_NAME);
      if (savedRow > 1) sheet.getRange(savedRow, 9, 1, 3).setValues([[adminEmailSent, customerEmailSent, whatsappSent]]);
    } catch (statusError) {
      console.error('Could not update notification statuses', statusError);
    }

    return output_({
      success: true,
      stored: true,
      adminEmailSent: adminEmailSent,
      customerEmailSent: customerEmailSent,
      whatsappSent: whatsappSent,
      whatsappStatus: whatsappStatus
    });
  } catch (error) {
    console.error('Unexpected doPost error', error);
    return output_({ success: false, message: 'An unexpected server error occurred.' });
  }
}

function normalizeEnquiry_(data) {
  const tiles = Array.isArray(data.tiles)
    ? data.tiles.slice(0, 20).map(function (item) { return clean_(item, 120); }).filter(Boolean)
    : [];
  return {
    name: clean_(data.name, 120),
    mobile: clean_(data.mobile, 40),
    email: clean_(data.email, 254).toLowerCase(),
    productInterest: clean_(data.productInterest, 300),
    tiles: tiles,
    space: clean_(data.space, 80),
    message: clean_(data.message, 3000)
  };
}

function validateEnquiry_(data) {
  const errors = [];
  if (!data.name) errors.push('Name is required.');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) errors.push('A valid email is required.');
  if (!/^[+\d][\d\s()\-]{7,}$/.test(data.mobile)) errors.push('A valid mobile number is required.');
  return errors;
}

function formatEnquiry_(data, heading) {
  return [
    heading,
    '',
    'Customer: ' + data.name,
    'Mobile: ' + data.mobile,
    'Email: ' + data.email,
    'Product interest: ' + (data.productInterest || 'Not specified'),
    'Selected tiles: ' + (data.tiles.length ? data.tiles.join(', ') : 'None selected'),
    'Project / room type: ' + (data.space || 'Not specified'),
    'Message: ' + (data.message || 'No additional message')
  ].join('\n');
}

function clean_(value, maxLength) {
  if (typeof value !== 'string') value = value == null ? '' : String(value);
  return value.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '').trim().slice(0, maxLength);
}

// Prevent visitor text from being interpreted as a spreadsheet formula.
function sheetSafe_(value) {
  const text = clean_(value, 3000);
  return /^[=+\-@]/.test(text) ? "'" + text : text;
}

// Apps Script UrlFetch URLs have a 2 KB limit. Keep the encoded GET text well below it.
function shortenWhatsAppText_(text) {
  const suffix = '\n[Message shortened; see admin email or Google Sheet for full details]';
  if (encodeURIComponent(text).length <= 1250) return text;
  let output = text;
  while (output.length > 40 && encodeURIComponent(output + suffix).length > 1250) {
    output = output.slice(0, Math.floor(output.length * 0.8));
  }
  return output + suffix;
}

function output_(value) {
  return ContentService.createTextOutput(JSON.stringify(value))
    .setMimeType(ContentService.MimeType.JSON);
}
