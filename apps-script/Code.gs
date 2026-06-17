// ============================================================
// AR LEAD COLLECTOR v1.3
// Successor to: AR Email Waitlist Collector
// Purpose: Capture quote requests + waitlist signups across all
//          Another Realm ventures. Unified pipeline:
//          form → Sheet → welcome email → Andrew notification
//
// Schema: 13-column lead lifecycle (Timestamp through Internal Notes)
// Sheet: "Another Realm — Leads" (auto-created in Lead Tracking folder)
// Trigger: Time-driven safety net every 5 minutes (createPollingTrigger)
//
// v1.3 changes from v1.2:
//   - Unsubscribe link in welcome email footer (HMAC-signed, tamper-proof)
//   - Soft delete: status='unsubscribed', row preserved for audit trail
//   - Auto re-subscribe: refilling form on an unsubscribed record
//     reactivates it (status='new'), resends welcome, notifies Andrew with
//     [Re-subscribed] flag. Original signup history preserved in Internal Notes.
//   - New endpoint: doGet ?action=unsubscribe&email=&venture=&t=
//   - Andrew notified on every unsubscribe (subject prefixed [Unsubscribe])
//   - Script Property UNSUBSCRIBE_SECRET auto-generated on first use
//
// v1.2 changes from v1.1:
//   - Groundworks hook: "Andrew got your request" → "We got your request"
//   - Signature header consolidated: venture name + "Info" on one bold line
//   - Mobile wrap fix: nowrap on signature header; break-all on email row
//
// v1.1 changes from v1.0:
//   - Welcome email now sends FROM per-venture info@ address
//   - Signature is brand-only (no Andrew name in automated emails)
//   - Per-venture phone numbers in signature
//   - Per-venture copyright line at bottom (no ARAI on DBA emails)
//   - Groundworks body1/body2 reflect Andrew's in-flight edits
//   - Groundworks tagline locked: "Cut It ◆ Spread It ◆ Haul It"
//   - Footer line locked: "Thank you for contacting us at [website]"
// ============================================================

// ── CONFIGURATION ────────────────────────────────────────────

var SPREADSHEET_NAME = 'Another Realm — Leads';
var LEAD_TRACKING_FOLDER_ID = '10qt8r1fCIInl1VJOSX6yx2e_T3En7wqb';
var REPLY_TO = 'andrew@anotherrealmai.com';
var NOTIFY_EMAIL = 'andrew@anotherrealmai.com';

// 13-column canonical schema. Order is fixed — appendRow writes in this order.
var HEADERS = [
  'Timestamp',           // 1 — auto
  'Source Type',         // 2 — web-quote | web-contact | footer-capture | phone-call | text | walk-in | referral | magnet | social
  'Name',                // 3
  'Phone',               // 4
  'Email',               // 5
  'Service Wanted',      // 6 — free text
  'Location',            // 7 — address or zip
  'Notes',               // 8 — customer-provided
  'Preferred Contact',   // 9 — Phone | Text | Email
  'Status',              // 10 — new | emailed | contacted | quoted | won | lost | archived | unsubscribed
  'Follow-up Date',      // 11
  'Assigned To',         // 12 — Andrew (default) | operator name
  'Internal Notes'       // 13 — private commentary
];

// Phone routing per venture (per locked decisions May 20, 2026):
//   ARAI Business line: (786) 746-7206 — default for 9 ARAI ventures w/o own line
//   Productions: (323) 701-0795 — dedicated line
//   Groundworks: (380) 261-2194 — dedicated line
//   Logistics (CBUS): (380) 261-2194 — placeholder until dedicated line


// ── EMAIL CONFIG — all 12 ventures ──────────────────────────

var EMAIL_CONFIG = {
  'Another Realm AI International': {
    subject: "Welcome to Another Realm — You're Early to Something Big",
    from: 'info@anotherrealmai.com',
    brand_name: 'Another Realm AI International',
    phone: '(786) 746-7206',
    accent: '#39FF14',
    website: 'anotherrealmai.com',
    hook: "You just joined something I've been building since January 9, 2026 — and we're just getting started.",
    body1: "Another Realm AI International is the parent company behind a full portfolio of AI-powered ventures launching out of Columbus, Ohio. Education, consulting, technology, logistics, production, and more — all under one roof, all AI-native from the foundation up.",
    body2: "I built this company on the belief that AI is the greatest wealth-creation opportunity of our lifetime — and that the people closest to it earliest will win the most. You're now in that group.",
    cta: "You'll be among the first to know when we go live. Stay close."
  },
  'Another Realm Gateway': {
    subject: "Welcome to Another Realm Gateway — AI Is About to Change Your Income",
    from: 'info@anotherrealmgateway.com',
    brand_name: 'Another Realm Gateway',
    phone: '(786) 746-7206',
    accent: '#FF6B00',
    website: 'anotherrealmgateway.com',
    hook: "You just took the first step toward learning the skill that's going to separate earners from everyone else.",
    body1: "Another Realm Gateway is our AI education platform — built for real people who want to actually use AI to make more money, work smarter, and stop getting left behind. Not theory. Not hype. Practical, hands-on training from someone who built a company on AI from scratch.",
    body2: "Courses are coming. The waitlist you're on right now is how you get early access and first-mover pricing before we open to the public.",
    cta: "The people who learn AI first will earn the most. You just put yourself in that group."
  },
  'Another Realm Consulting': {
    subject: "Welcome to Another Realm Consulting — AI Strategy for Businesses and Bold New Beginnings",
    from: 'info@anotherrealmconsulting.com',
    brand_name: 'Another Realm Consulting',
    phone: '(786) 746-7206',
    accent: '#4169E1',
    website: 'anotherrealmconsulting.com',
    hook: "Whether you're running a business or building one from scratch — we're the team in your corner.",
    body1: "Another Realm Consulting works with two kinds of clients. First, existing business owners who want to identify exactly where AI can cut costs, save time, and create competitive advantages their competitors haven't figured out yet. We do the strategy, the implementation, and the training — real results without having to become a tech expert.",
    body2: "Second, aspiring entrepreneurs who have the dream but need the roadmap. If you want to build a business from the ground up, we help you design the foundation, choose the right structure, build your systems, and launch with AI baked in from day one — not bolted on later. You don't have to figure it out alone.",
    cta: "We're building our client roster now. When we launch, you'll be first to know what we offer and how to get started."
  },
  'Another Realm Systems': {
    subject: "Welcome to Another Realm Systems — Custom AI Built to Scale Your Business",
    from: 'info@anotherrealmsystems.com',
    brand_name: 'Another Realm Systems',
    phone: '(786) 746-7206',
    accent: '#00CCFF',
    website: 'anotherrealmsystems.com',
    hook: "Off-the-shelf software wasn't built for your business. We build what was.",
    body1: "Another Realm Systems designs and deploys custom AI-powered technology solutions — automations, integrations, dashboards, and intelligent workflows built specifically around how your operation runs. No bloated software. No unnecessary features. Just clean, powerful systems that make your business run smarter.",
    body2: "We're in build mode right now. When we launch, we'll be taking on a select number of clients to start.",
    cta: "You're on the list. We'll reach out when we're ready to talk."
  },
  'Another Realm Productions': {
    subject: "Welcome to Another Realm Productions — Where AI Meets Human Artistry",
    from: 'info@anotherrealmproductions.com',
    brand_name: 'Another Realm Productions',
    phone: '(323) 701-0795',
    accent: '#D4AF37',
    website: 'anotherrealmproductions.com',
    hook: "Music and content creation just changed forever. We're building at the intersection of AI and human creativity.",
    body1: "Another Realm Productions is an AI-native music and media studio based in Columbus, Ohio. We produce original music, music videos, and creative content across genres — and we offer custom song services for people who want a one-of-a-kind track made specifically for them.",
    body2: "Your Vision ◆ Our Pipeline ◆ World-Class. That's the promise. Custom packages, professional quality, AI-powered production.",
    cta: "We're launching soon. When we do, you'll be first through the door."
  },
  'Another Realm Ventures': {
    subject: "Welcome to Another Realm Ventures — The AI Investment Arm",
    from: 'info@anotherrealmventures.com',
    brand_name: 'Another Realm Ventures',
    phone: '(786) 746-7206',
    accent: '#B8B8B8',
    website: 'anotherrealmventures.com',
    hook: "The biggest returns in the next decade will come from people who identified AI-native businesses early.",
    body1: "Another Realm Ventures is our investment and portfolio development arm — focused on identifying, funding, and scaling AI-native businesses that most investors haven't found yet. We look at what others overlook and we move when the signal is clear.",
    body2: "If you're a founder, an investor, or someone looking for opportunities in the AI space, you're in the right place.",
    cta: "We'll be sharing more about what we look for and how we operate when we launch. Stay close."
  },
  'Another Realm Logistics': {
    subject: "Welcome to Another Realm Logistics — Columbus's Most Reliable Haul",
    from: 'info@anotherrealmlogistics.com',
    brand_name: 'Another Realm Logistics',
    phone: '(380) 261-2194',
    accent: '#FF6B00',
    website: 'anotherrealmlogistics.com',
    hook: "Load Up. Roll Out. Safe Delivery. That's not just a tagline — that's the standard.",
    body1: "Another Realm Logistics is a Columbus-based transportation and logistics company operating under DOT #4355121 and MC #1703396. We handle intrastate and interstate hauls with a focus on reliability, communication, and getting it there right.",
    body2: "AI-powered dispatch, route optimization, and real-time tracking are built into how we operate — and that's the Another Realm difference.",
    cta: "We're taking inquiries now. Reach out when you're ready to book a haul."
  },
  'Another Realm Groundworks': {
    subject: "Got your request — Andrew will be in touch shortly",
    from: 'info@anotherrealmgroundworks.com',
    brand_name: 'Another Realm Groundworks',
    phone: '(380) 261-2194',
    accent: '#4CBB17',
    website: 'anotherrealmgroundworks.com',
    hook: "Thanks for reaching out to Another Realm Groundworks. We got your request and will follow up shortly with a free estimate.",
    body1: "We handle the work most homeowners and property managers need done but don't have the time, equipment, or back for. Mulch, soil, gravel, and topsoil delivery and spreading. Debris and junk hauling. Construction site cleanup. Brush clearing and storm cleanup. Gutter cleaning. Move-in and move-out property cleanup. High-quality work every visit, no exceptions.",
    body2: "Cut It ◆ Spread It ◆ Haul It. Owner-operated property services serving Columbus and surrounding suburbs. Free estimates by phone, text, or email.",
    cta: "Andrew will be in touch shortly to discuss your project. Need us sooner? Text or call (380) 261-2194, or reply to this email."
  },
  'Another Realm Installation': {
    subject: "Welcome to Another Realm Installation — Precision Install. Built to Last. Flawless Finish.",
    from: 'info@anotherrealminstallation.com',
    brand_name: 'Another Realm Installation',
    phone: '(786) 746-7206',
    accent: '#39FF14',
    website: 'anotherrealminstallation.com',
    hook: "Bad installation ruins good equipment. We don't let that happen.",
    body1: "Another Realm Installation handles TV mounting, smart home setup, home hardware, and precision installs for residential and commercial clients in Columbus. We treat every job like it's going in our own home — because our reputation goes on the wall with every mount.",
    body2: "No guessing. No shortcuts. Precise measurements, clean cable management, and a finish that looks like it belongs there.",
    cta: "We're booking our first clients soon. You'll hear from us when we open the schedule."
  },
  'Another Realm Compliance': {
    subject: "Welcome to Another Realm Compliance — Stay Current. Stay Compliant. Stay Operating.",
    from: 'info@anotherrealmcompliance.com',
    brand_name: 'Another Realm Compliance',
    phone: '(786) 746-7206',
    accent: '#FF2400',
    website: 'anotherrealmcompliance.com',
    hook: "One missed deadline can shut you down. We make sure that never happens.",
    body1: "Another Realm Compliance specializes in regulatory compliance management for businesses in heavily regulated industries — starting with underground storage tank (UST) compliance. Testing schedules, documentation, renewals, and regulatory correspondence — we track it all so you don't have to.",
    body2: "Compliance isn't optional. But managing it doesn't have to consume your time. That's what we're here for.",
    cta: "We're building our client list now. When we launch, you'll be first to hear about our services and pricing."
  },
  'Another Realm Analytics': {
    subject: "Welcome to Another Realm Analytics — Data That Drives Decisions",
    from: 'info@anotherrealmai.com',
    brand_name: 'Another Realm Analytics',
    phone: '(786) 746-7206',
    accent: '#FF2400',
    website: 'anotherrealmai.com',
    hook: "Most businesses are sitting on data they've never actually used. We change that.",
    body1: "Another Realm Analytics turns raw business data into clear, actionable intelligence. Dashboards, reports, trend analysis, and AI-powered insights — built specifically around the decisions you need to make.",
    body2: "We're in development now. When we launch, clients on this list get first access.",
    cta: "Stay tuned. We'll be in touch when we're ready."
  },
  'Another Realm Intelligence': {
    subject: "Welcome to Another Realm Intelligence — AI Strategy at the Executive Level",
    from: 'info@anotherrealmai.com',
    brand_name: 'Another Realm Intelligence',
    phone: '(786) 746-7206',
    accent: '#8B5CF6',
    website: 'anotherrealmai.com',
    hook: "AI strategy isn't just for tech companies anymore. It's for any business that wants to win.",
    body1: "Another Realm Intelligence provides executive-level AI advisory services — helping business leaders understand where AI creates leverage in their specific industry, how to build an AI roadmap, and how to implement without disrupting what's already working.",
    body2: "This isn't consulting for beginners. It's strategic intelligence for leaders who are serious about staying ahead.",
    cta: "We're selective about who we work with. You're on the list — we'll reach out when we're ready to talk."
  }
};


// ── EMAIL TEMPLATE BUILDER ──────────────────────────────────

function buildEmail(config, unsubUrl) {
  return '<!DOCTYPE html>'
+ '<html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>'
+ '<body style="margin:0;padding:0;background-color:#0A0A0A;font-family:\'Helvetica Neue\',Arial,sans-serif;">'
+ '<table width="100%" cellpadding="0" cellspacing="0" style="background-color:#0A0A0A;">'
+ '<tr><td align="center" style="padding:40px 20px;">'
+ '<table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background-color:#0F0F0F;border:1px solid #1a1a1a;border-radius:4px;">'

// Header
+ '<tr><td style="padding:32px 40px 24px;border-bottom:1px solid #1a1a1a;">'
+ '<p style="margin:0;font-size:11px;letter-spacing:4px;text-transform:uppercase;color:' + config.accent + ';font-weight:600;">ANOTHER REALM</p>'
+ '<p style="margin:4px 0 0;font-size:20px;letter-spacing:6px;text-transform:uppercase;color:#D4AF37;font-weight:700;">' + config.brand_name.replace('Another Realm ', '').toUpperCase() + '</p>'
+ '</td></tr>'

// Body
+ '<tr><td style="padding:36px 40px;">'
+ '<p style="margin:0 0 20px;font-size:18px;line-height:1.5;color:#FAFAFA;font-weight:600;">' + config.hook + '</p>'
+ '<p style="margin:0 0 16px;font-size:15px;line-height:1.7;color:#B8B8B8;">' + config.body1 + '</p>'
+ '<p style="margin:0 0 16px;font-size:15px;line-height:1.7;color:#B8B8B8;">' + config.body2 + '</p>'
+ '<p style="margin:0 0 32px;font-size:15px;line-height:1.7;color:#B8B8B8;">' + config.cta + '</p>'

// Divider
+ '<table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">'
+ '<tr><td style="height:1px;background:linear-gradient(90deg,transparent,#D4AF37,transparent);"></td></tr></table>'

// Brand signature — dark-mode adapted, matches Gmail signature design DNA
+ '<table cellpadding="0" cellspacing="0" border="0" style="font-family:Arial,sans-serif;font-size:13px;color:#B8B8B8;line-height:1.5;">'
+   '<tr>'
+     '<td style="border-left:3px solid #D4AF37;padding-left:14px;">'
+       '<table cellpadding="0" cellspacing="0" border="0">'
+         '<tr><td style="font-size:14px;font-weight:bold;color:#FAFAFA;padding-bottom:6px;letter-spacing:0.5px;white-space:nowrap;">' + config.brand_name + ' Info</td></tr>'
+         '<tr><td style="font-size:12px;color:#B8B8B8;padding-bottom:2px;"><span style="color:#D4AF37;font-size:13px;">&#9742;</span>&nbsp;&nbsp;' + config.phone + '</td></tr>'
+         '<tr><td style="font-size:12px;padding-bottom:2px;word-break:break-all;"><span style="color:#4A90D9;font-size:13px;">&#9993;</span>&nbsp;&nbsp;<a href="mailto:' + config.from + '" style="color:#4A90D9;text-decoration:none;">' + config.from + '</a></td></tr>'
+         '<tr><td style="font-size:12px;padding-bottom:0;"><span style="color:#4CBB17;font-size:13px;">&#127760;</span>&nbsp;&nbsp;<a href="https://' + config.website + '" style="color:#4A90D9;text-decoration:none;">' + config.website + '</a></td></tr>'
+       '</table>'
+     '</td>'
+   '</tr>'
+ '</table>'

+ '</td></tr>'

// Footer
+ '<tr><td style="padding:20px 40px;border-top:1px solid #1a1a1a;">'
+ '<p style="margin:0;font-size:11px;color:#333;text-align:center;letter-spacing:1px;">© 2026 ' + config.brand_name.toUpperCase() + ' | ' + config.website + '</p>'
+ '<p style="margin:8px 0 0;font-size:11px;color:#333;text-align:center;">Thank you for contacting us at ' + config.website + '</p>'
+ (unsubUrl ? '<p style="margin:10px 0 0;font-size:11px;color:#333;text-align:center;">Not interested? <a href="' + unsubUrl + '" style="color:#555;text-decoration:underline;">Unsubscribe</a></p>' : '')
+ '</td></tr>'

+ '</table></td></tr></table></body></html>';
}


// ── SHEET HELPERS ────────────────────────────────────────────

function getOrCreateSpreadsheet() {
  var files = DriveApp.getFilesByName(SPREADSHEET_NAME);
  if (files.hasNext()) {
    return SpreadsheetApp.open(files.next());
  }
  var ss = SpreadsheetApp.create(SPREADSHEET_NAME);
  DriveApp.getFileById(ss.getId()).moveTo(DriveApp.getFolderById(LEAD_TRACKING_FOLDER_ID));
  // Remove the default "Sheet1" tab that Sheets adds on creation
  var defaultSheet = ss.getSheetByName('Sheet1');
  if (defaultSheet && ss.getSheets().length > 1) {
    ss.deleteSheet(defaultSheet);
  }
  return ss;
}

function getOrCreateSheet(ss, tabName) {
  var sheet = ss.getSheetByName(tabName);
  if (!sheet) {
    sheet = ss.insertSheet(tabName);
    sheet.appendRow(HEADERS);
    sheet.getRange(1, 1, 1, HEADERS.length).setFontWeight('bold');
    sheet.setFrozenRows(1);
    // Reasonable column widths for readability
    sheet.setColumnWidth(1, 140);  // Timestamp
    sheet.setColumnWidth(2, 110);  // Source Type
    sheet.setColumnWidth(3, 140);  // Name
    sheet.setColumnWidth(4, 130);  // Phone
    sheet.setColumnWidth(5, 220);  // Email
    sheet.setColumnWidth(6, 200);  // Service Wanted
    sheet.setColumnWidth(7, 160);  // Location
    sheet.setColumnWidth(8, 280);  // Notes
    sheet.setColumnWidth(9, 130);  // Preferred Contact
    sheet.setColumnWidth(10, 100); // Status
    sheet.setColumnWidth(11, 120); // Follow-up Date
    sheet.setColumnWidth(12, 110); // Assigned To
    sheet.setColumnWidth(13, 220); // Internal Notes
  }
  return sheet;
}

// Normalize phone for dedupe: digits only
function normPhone(p) {
  return (p || '').toString().replace(/\D/g, '');
}

// Normalize email for dedupe: lowercase trimmed
function normEmail(e) {
  return (e || '').toString().trim().toLowerCase();
}

// Check duplicate by phone OR email in this venture tab
function isDuplicate(sheet, phone, email) {
  return findExistingLead(sheet, phone, email) !== null;
}

// Find an existing lead by phone OR email; returns row info or null.
// Used by addLead for re-subscribe detection and by handleUnsubscribe.
function findExistingLead(sheet, phone, email) {
  var data = sheet.getDataRange().getValues();
  if (data.length < 2) return null;
  var np = normPhone(phone);
  var ne = normEmail(email);
  for (var i = 1; i < data.length; i++) {
    var rowPhone = normPhone(data[i][3]); // col 4
    var rowEmail = normEmail(data[i][4]); // col 5
    var match = (np && rowPhone && np === rowPhone) ||
                (ne && rowEmail && ne === rowEmail);
    if (match) {
      return {
        row: i + 1,            // 1-indexed sheet row
        name: data[i][2],
        phone: data[i][3],
        email: data[i][4],
        status: data[i][9],    // col 10
        internalNotes: data[i][12] // col 13
      };
    }
  }
  return null;
}


// ── UNSUBSCRIBE TOKEN (HMAC) ─────────────────────────────────

// Auto-generated on first use, persisted in Script Properties.
// Rotating this invalidates all previously-sent unsubscribe links.
function getUnsubscribeSecret() {
  var props = PropertiesService.getScriptProperties();
  var secret = props.getProperty('UNSUBSCRIBE_SECRET');
  if (!secret) {
    secret = Utilities.getUuid() + Utilities.getUuid();
    props.setProperty('UNSUBSCRIBE_SECRET', secret);
    Logger.log('Generated new UNSUBSCRIBE_SECRET in Script Properties.');
  }
  return secret;
}

function makeUnsubscribeToken(email, venture) {
  var payload = normEmail(email) + '|' + venture;
  var bytes = Utilities.computeHmacSha256Signature(payload, getUnsubscribeSecret());
  return Utilities.base64EncodeWebSafe(bytes).replace(/=+$/, '');
}

function verifyUnsubscribeToken(email, venture, token) {
  return token && makeUnsubscribeToken(email, venture) === token;
}

function makeUnsubscribeUrl(email, venture) {
  var base = ScriptApp.getService().getUrl();
  if (!base) return '';
  return base + '?action=unsubscribe'
    + '&email=' + encodeURIComponent(normEmail(email))
    + '&venture=' + encodeURIComponent(venture)
    + '&t=' + makeUnsubscribeToken(email, venture);
}


// ── CORE: ADD LEAD ──────────────────────────────────────────

function addLead(data) {
  var venture       = (data.venture || 'General').trim();
  var sourceType    = (data.source_type || data.sourceType || data.source || 'web-capture').trim();
  var name          = (data.name || '').trim();
  var phone         = (data.phone || '').trim();
  var email         = normEmail(data.email);
  var serviceWanted = (data.service || data.service_wanted || '').trim();
  var location      = (data.location || data.zip || '').trim();
  var notes         = (data.notes || data.message || '').trim();
  var preferred     = (data.preferred_contact || data.preferredContact || '').trim();

  // Must have at least one contact channel
  if (!email && !phone) {
    return {status: 'error', message: 'Email or phone required'};
  }
  if (email && (email.indexOf('@') < 1 || email.indexOf('.') < 0)) {
    return {status: 'error', message: 'Invalid email format'};
  }

  var ss = getOrCreateSpreadsheet();
  var sheet = getOrCreateSheet(ss, venture);

  // Check for existing record — handles re-subscribe + dedupe in one pass
  var existing = findExistingLead(sheet, phone, email);
  if (existing) {
    if (existing.status === 'unsubscribed') {
      return reactivateLead(sheet, existing, venture, sourceType, email, phone);
    }
    return {status: 'success', note: 'already_registered'};
  }

  sheet.appendRow([
    new Date(),    // 1 Timestamp
    sourceType,    // 2 Source Type
    name,          // 3 Name
    phone,         // 4 Phone
    email,         // 5 Email
    serviceWanted, // 6 Service Wanted
    location,      // 7 Location
    notes,         // 8 Notes
    preferred,     // 9 Preferred Contact
    'new',         // 10 Status
    '',            // 11 Follow-up Date
    'Andrew',      // 12 Assigned To
    ''             // 13 Internal Notes
  ]);

  // Send welcome email (only if email provided)
  if (email) {
    sendWelcomeEmail(email, venture);
  }

  // Notify Andrew (always — even phone-only leads)
  sendNotification({
    venture: venture,
    sourceType: sourceType,
    name: name,
    phone: phone,
    email: email,
    serviceWanted: serviceWanted,
    location: location,
    notes: notes,
    preferred: preferred
  });

  // Mark Status as 'emailed' if welcome email went out, otherwise leave as 'new'
  if (email) {
    var lastRow = sheet.getLastRow();
    sheet.getRange(lastRow, 10).setValue('emailed');
  }

  return {status: 'success'};
}

// Flip an unsubscribed lead back to 'new', append history note, re-send welcome,
// notify Andrew with [Re-subscribed] flag. Preserves original signup timestamp.
function reactivateLead(sheet, existing, venture, sourceType, email, phone) {
  var ts = new Date().toLocaleString('en-US', {timeZone: 'America/New_York'});
  var prevNotes = (existing.internalNotes || '').toString();
  var newNotes = prevNotes + (prevNotes ? ' | ' : '') + 're-subscribed ' + ts;

  sheet.getRange(existing.row, 10).setValue('new');
  sheet.getRange(existing.row, 13).setValue(newNotes);

  var recipientEmail = email || (existing.email || '').toString().trim();
  if (recipientEmail) {
    sendWelcomeEmail(recipientEmail, venture);
    sheet.getRange(existing.row, 10).setValue('emailed');
  }

  sendNotification({
    venture: venture,
    sourceType: '[Re-subscribed] ' + sourceType,
    name: existing.name,
    phone: phone || existing.phone,
    email: recipientEmail,
    serviceWanted: '',
    location: '',
    notes: 'Lead re-subscribed by refilling the form.',
    preferred: ''
  });

  return {status: 'success', note: 're-subscribed'};
}


// ── WELCOME EMAIL ────────────────────────────────────────────

function sendWelcomeEmail(email, venture) {
  var config = EMAIL_CONFIG[venture];
  if (!config) {
    Logger.log('No email config found for venture: ' + venture);
    return;
  }
  try {
    var unsubUrl = makeUnsubscribeUrl(email, venture);
    GmailApp.sendEmail(
      email,
      config.subject,
      'Please view this email in an HTML-compatible client.',
      {
        name: config.brand_name,
        htmlBody: buildEmail(config, unsubUrl),
        replyTo: REPLY_TO,
        from: config.from
      }
    );
    Logger.log('Welcome email sent to ' + email + ' (' + venture + ')');
  } catch(e) {
    Logger.log('Failed to send welcome email to ' + email + ': ' + e.message);
  }
}


// ── ANDREW NOTIFICATION ──────────────────────────────────────

function sendNotification(data) {
  var isResub = (data.sourceType || '').indexOf('[Re-subscribed]') === 0;
  var subject = (isResub ? '🔁 RE-SUBSCRIBED — ' : '🟢 NEW LEAD — ') + data.venture;

  var lines = [(isResub ? 'Lead re-subscribed to ' : 'New lead from ') + data.venture];
  lines.push('');
  lines.push('Source: ' + (data.sourceType || 'unknown'));
  if (data.name)          lines.push('Name: ' + data.name);
  if (data.phone)         lines.push('Phone: ' + data.phone);
  if (data.email)         lines.push('Email: ' + data.email);
  if (data.serviceWanted) lines.push('Service: ' + data.serviceWanted);
  if (data.location)      lines.push('Location: ' + data.location);
  if (data.notes)         lines.push('Notes: ' + data.notes);
  if (data.preferred)     lines.push('Preferred contact: ' + data.preferred);
  lines.push('');
  lines.push('Time: ' + new Date().toLocaleString('en-US', {timeZone: 'America/New_York'}));

  // Provide direct Sheet link (Drive will resolve by name)
  var sheetUrl = 'https://drive.google.com/drive/folders/' + LEAD_TRACKING_FOLDER_ID;
  lines.push('');
  lines.push('Lead Tracking folder: ' + sheetUrl);

  var body = lines.join('\n');

  try {
    GmailApp.sendEmail(NOTIFY_EMAIL, subject, body, {name: 'Another Realm Leads'});
    Logger.log('Notification sent to ' + NOTIFY_EMAIL);
  } catch(e) {
    Logger.log('Failed to send notification: ' + e.message);
  }
}

function sendUnsubscribeNotification(venture, existing, ts) {
  var subject = '🔕 UNSUBSCRIBED — ' + venture;
  var lines = ['Lead unsubscribed from ' + venture];
  lines.push('');
  if (existing.name)  lines.push('Name: ' + existing.name);
  if (existing.email) lines.push('Email: ' + existing.email);
  if (existing.phone) lines.push('Phone: ' + existing.phone);
  lines.push('');
  lines.push('Time: ' + ts);
  lines.push('');
  lines.push('Row remains in sheet with status=unsubscribed.');
  lines.push('They can re-subscribe by filling the form again.');

  try {
    GmailApp.sendEmail(NOTIFY_EMAIL, subject, lines.join('\n'), {name: 'Another Realm Leads'});
  } catch(e) {
    Logger.log('Failed to send unsubscribe notification: ' + e.message);
  }
}


// ── POLLING SAFETY NET ──────────────────────────────────────

// Catches anything where the welcome email failed to send in-line.
// Runs every 5 minutes via createPollingTrigger().
function processNewSignups() {
  var ss = getOrCreateSpreadsheet();
  var sheets = ss.getSheets();
  var totalSent = 0;

  sheets.forEach(function(sheet) {
    var lastRow = sheet.getLastRow();
    if (lastRow < 2) return;

    var data = sheet.getDataRange().getValues();
    var headers = data[0];
    var emailCol  = headers.indexOf('Email');
    var statusCol = headers.indexOf('Status');

    if (emailCol === -1 || statusCol === -1) return;

    var ventureName = sheet.getName();

    for (var i = 1; i < data.length; i++) {
      var row = data[i];
      if (row[statusCol] === 'new' && row[emailCol]) {
        var recipientEmail = row[emailCol].toString().trim();
        if (!recipientEmail) continue;

        sendWelcomeEmail(recipientEmail, ventureName);
        sheet.getRange(i + 1, statusCol + 1).setValue('emailed');
        Logger.log('Safety net sent to ' + recipientEmail + ' (' + ventureName + ')');
        totalSent++;
        Utilities.sleep(1000);
      }
    }
  });

  Logger.log('processNewSignups complete — ' + totalSent + ' emails sent');
}


// ── WEB ENDPOINTS ────────────────────────────────────────────

function doPost(e) {
  var respond = function(obj) {
    return ContentService
      .createTextOutput(JSON.stringify(obj))
      .setMimeType(ContentService.MimeType.JSON);
  };

  try {
    var data = {};
    if (e.postData && e.postData.contents) {
      try {
        data = JSON.parse(e.postData.contents);
      } catch(_) {
        data = e.parameter || {};
      }
    } else if (e.parameter) {
      data = e.parameter;
    }
    return respond(addLead(data));
  } catch(err) {
    return respond({status: 'error', message: err.toString()});
  }
}

function doGet(e) {
  // Unsubscribe action takes precedence
  if (e && e.parameter && e.parameter.action === 'unsubscribe') {
    return handleUnsubscribe(e.parameter);
  }
  // Allow simple GET-based submissions for testing
  if (e && e.parameter && (e.parameter.email || e.parameter.phone)) {
    return ContentService
      .createTextOutput(JSON.stringify(addLead(e.parameter)))
      .setMimeType(ContentService.MimeType.JSON);
  }
  return ContentService
    .createTextOutput(JSON.stringify({
      status: 'alive',
      service: 'AR Lead Collector v1.3',
      schema_columns: 13
    }))
    .setMimeType(ContentService.MimeType.JSON);
}


// ── UNSUBSCRIBE HANDLER ──────────────────────────────────────

function handleUnsubscribe(params) {
  var email = normEmail(params.email);
  var venture = (params.venture || '').trim();
  var token = (params.t || '').trim();

  if (!email || !venture || !token) {
    return renderUnsubscribePage('This unsubscribe link is missing information.', false);
  }
  if (!verifyUnsubscribeToken(email, venture, token)) {
    return renderUnsubscribePage('This unsubscribe link is invalid or has been tampered with. If you need help, reply to any of our emails.', false);
  }

  try {
    var ss = getOrCreateSpreadsheet();
    var sheet = ss.getSheetByName(venture);
    if (!sheet) {
      return renderUnsubscribePage('We could not find a record for that venture.', false);
    }
    var existing = findExistingLead(sheet, '', email);
    if (!existing) {
      return renderUnsubscribePage('You are not on the ' + venture + ' list.', true);
    }
    if (existing.status === 'unsubscribed') {
      return renderUnsubscribePage('You are already unsubscribed from ' + venture + '.', true);
    }

    var ts = new Date().toLocaleString('en-US', {timeZone: 'America/New_York'});
    var prevNotes = (existing.internalNotes || '').toString();
    var newNotes = prevNotes + (prevNotes ? ' | ' : '') + 'unsubscribed ' + ts;

    sheet.getRange(existing.row, 10).setValue('unsubscribed');
    sheet.getRange(existing.row, 13).setValue(newNotes);

    sendUnsubscribeNotification(venture, existing, ts);

    return renderUnsubscribePage('You have been unsubscribed from ' + venture + '. We will not send you any more emails.', true);
  } catch(err) {
    Logger.log('Unsubscribe error: ' + err.toString());
    return renderUnsubscribePage('Something went wrong on our end. Please email ' + REPLY_TO + ' and we will remove you manually.', false);
  }
}

function renderUnsubscribePage(message, success) {
  var statusColor = success ? '#4CBB17' : '#FF2400';
  var statusLabel = success ? 'UNSUBSCRIBED' : 'NOTICE';
  var html = '<!DOCTYPE html><html><head><meta charset="UTF-8">'
    + '<meta name="viewport" content="width=device-width, initial-scale=1.0">'
    + '<title>Unsubscribe — Another Realm</title>'
    + '</head><body style="margin:0;padding:0;background:#0A0A0A;font-family:\'Helvetica Neue\',Helvetica,Arial,sans-serif;color:#FAFAFA;">'
    + '<div style="max-width:600px;margin:80px auto;padding:40px 32px;background:#0F0F0F;border:1px solid #1a1a1a;border-radius:4px;text-align:center;">'
    + '<p style="margin:0 0 8px;font-size:11px;letter-spacing:4px;text-transform:uppercase;color:#D4AF37;font-weight:600;">ANOTHER REALM</p>'
    + '<p style="margin:0 0 32px;font-size:14px;letter-spacing:3px;text-transform:uppercase;color:' + statusColor + ';font-weight:700;">' + statusLabel + '</p>'
    + '<p style="margin:0;font-size:16px;line-height:1.6;color:#B8B8B8;">' + message + '</p>'
    + '<p style="margin:32px 0 0;font-size:12px;color:#555;line-height:1.5;">Changed your mind? You can re-subscribe anytime by filling out the form again on our website.</p>'
    + '</div></body></html>';
  return HtmlService.createHtmlOutput(html)
    .setTitle('Unsubscribe — Another Realm')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}


// ── SETUP / MAINTENANCE ─────────────────────────────────────

// Run ONCE to pre-create all 12 venture tabs in the new Sheet
function setupAllVentureTabs() {
  var ss = getOrCreateSpreadsheet();
  var ventures = Object.keys(EMAIL_CONFIG);
  ventures.forEach(function(v) { getOrCreateSheet(ss, v); });
  Logger.log('All venture tabs created in: ' + SPREADSHEET_NAME);
  Logger.log('Sheet ID: ' + ss.getId());
  Logger.log('URL: ' + ss.getUrl());
}

// Run ONCE to set the polling safety net trigger
function createPollingTrigger() {
  ScriptApp.getProjectTriggers().forEach(function(t) {
    if (t.getHandlerFunction() === 'processNewSignups') ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger('processNewSignups')
    .timeBased()
    .everyMinutes(5)
    .create();
  Logger.log('Polling trigger created — runs every 5 minutes.');
}


// ── TEST FUNCTIONS ──────────────────────────────────────────

function testGroundworksLead() {
  var result = addLead({
    venture: 'Another Realm Groundworks',
    source_type: 'web-quote',
    name: 'Test Customer',
    phone: '614-555-1234',
    email: 'andrew@anotherrealmai.com',
    service: 'Mulch spreading test',
    location: '43215',
    notes: 'This is a test submission to verify the v1.3 lead collector.',
    preferred_contact: 'Text'
  });
  Logger.log(JSON.stringify(result));
}

function testManualPhoneCallLead() {
  var result = addLead({
    venture: 'Another Realm Groundworks',
    source_type: 'phone-call',
    name: 'Manual Test Caller',
    phone: '614-555-9999',
    service: 'Called Tuesday about gutter cleaning',
    location: '43017',
    notes: 'Test of phone-only manual entry (no email).',
    preferred_contact: 'Phone'
  });
  Logger.log(JSON.stringify(result));
}

function testWelcomeEmail() {
  sendWelcomeEmail('andrew@anotherrealmai.com', 'Another Realm Groundworks');
}

function testNotification() {
  sendNotification({
    venture: 'Another Realm Groundworks',
    sourceType: 'web-quote',
    name: 'Test Customer',
    phone: '614-555-0000',
    email: 'test@example.com',
    serviceWanted: 'Gutter cleaning',
    location: '43215',
    notes: 'Test notification only.',
    preferred: 'Text'
  });
}

// Prints the unsubscribe URL for the given email + venture.
// Use this to manually test the unsubscribe flow without sending a real email.
function testUnsubscribeUrl() {
  var url = makeUnsubscribeUrl('andrew@anotherrealmai.com', 'Another Realm Groundworks');
  Logger.log(url);
}
