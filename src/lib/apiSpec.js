// The planned REST API of the real Hope system (same conventions as the SJCMPC
// backend). One API serves the website, the staff portal and the mobile app.
// Used by: the API page of the simulator (/flows#api), the phone simulator's
// request log, and the documentation generator (docs/generator).

export const API_BASE = 'https://api.hope.example/api/v1';

export const PORTALS = {
  public: { prefix: '/public', who: 'No sign-in (guests). Read-only, rate limited.' },
  customer: { prefix: '/customer', who: 'Buyers, tenants and owners (customers table). Bearer token from customer sign-in.' },
  admin: { prefix: '/admin', who: 'Super Admin, Owner, Admin, Manager, Finance, Content Editor, Agent (staff table). Bearer token after password + authenticator code. Every route checks a permission.' },
};

export const HEADERS = [
  ['Authorization', 'Bearer <token> (not for /public)'],
  ['Accept', 'application/json'],
  ['X-Client-Platform', 'web | android | ios'],
  ['X-App-Version', 'e.g. 1.0.0 (the app sends it on every request; older than the minimum → APP_UPDATE_REQUIRED)'],
  ['X-Device-Id', 'Stable device ID generated on first launch and kept in secure storage. Required for PIN / biometric sign-in.'],
  ['X-Device-Name', 'e.g. "Ana\'s iPhone 15" (shown in Signed-in devices)'],
  ['X-Request-Id', 'Optional UUID; echoed back and stored on the audit row'],
  ['Accept-Language', 'en (Filipino planned)'],
];

export const ERROR_CODES = [
  ['VALIDATION_FAILED', 422, 'One or more fields are invalid. See `errors` (field → messages).'],
  ['UNAUTHENTICATED', 401, 'Missing / expired token. Sign in again (or use PIN / biometrics).'],
  ['ACCOUNT_REQUIRED', 401, 'A guest tried to interact (inquire, save, book, reserve). Show the sign-in / create-account sheet.'],
  ['FORBIDDEN', 403, 'Signed in but the role lacks the permission, or the record is outside the user\'s scope (team / own).'],
  ['NOT_FOUND', 404, 'Record does not exist or was deleted.'],
  ['AUTH_INVALID_CREDENTIALS', 401, 'Wrong email / mobile or password. `details.attempts_left` when enabled.'],
  ['AUTH_LOCKED', 423, 'Temporarily locked after failed attempts. `details.minutes_left`.'],
  ['AUTH_FLAGGED', 423, 'Hard lock after repeated lockouts; only a higher rank can unlock.'],
  ['MFA_REQUIRED', 200, 'Staff password accepted; send the authenticator code with `challenge_token`.'],
  ['MFA_INVALID', 401, 'Wrong authenticator / recovery code (counts toward lockout).'],
  ['OTP_INVALID', 422, 'Wrong one-time code.'],
  ['OTP_EXPIRED', 422, 'Code expired; request a new one after `details.resend_in` seconds.'],
  ['DEVICE_SIGN_IN_OFF', 401, 'PIN / biometric sign-in is off, expired (password needed again) or revoked. Ask for the password.'],
  ['PIN_INVALID', 401, 'Wrong PIN. After the limit the device key is revoked (`details.revoked: true`).'],
  ['LISTING_NOT_AVAILABLE', 409, 'Listing is reserved, sold, rented or taken down.'],
  ['PAYMENT_FAILED', 402, 'Online payment failed or was cancelled.'],
  ['RATE_LIMITED', 429, 'Too many requests. Retry after `Retry-After` seconds.'],
  ['APP_UPDATE_REQUIRED', 426, 'App version below Settings → System → minimum version. Show the store link.'],
  ['MAINTENANCE', 503, 'Maintenance mode. Show `message`.'],
];

export const PUSH_TYPES = [
  ['inquiry.reply', 'Customer', 'Agent replied to an inquiry', '{ inquiry_id }', 'Inquiry thread'],
  ['viewing.confirmed', 'Customer', 'Viewing confirmed / moved', '{ viewing_id }', 'Viewings'],
  ['viewing.reminder', 'Customer', 'Day-before reminder', '{ viewing_id }', 'Viewings'],
  ['payment.received', 'Customer', 'Payment received, receipt ready', '{ deal_id, receipt_id }', 'Receipt'],
  ['deal.updated', 'Customer', 'Deal status / document checklist changed', '{ deal_id }', 'Deal tracker'],
  ['listing.price_drop', 'Customer', 'A saved listing changed price', '{ listing_slug }', 'Listing'],
  ['lead.new', 'Agent', 'New inquiry on own listing', '{ inquiry_id }', 'Lead thread'],
  ['lead.assigned', 'Agent', 'Lead assigned by a Manager', '{ inquiry_id }', 'Lead thread'],
  ['listing.approved', 'Agent', 'Listing approved and live', '{ listing_id }', 'My listing'],
  ['listing.changes', 'Agent', 'Changes requested / rejected', '{ listing_id }', 'My listing (edit)'],
  ['approval.pending', 'Manager', 'Team listing waiting for review', '{ listing_id }', 'Approvals'],
  ['commission.paid', 'Agent / Manager', 'Commission paid', '{ commission_id }', 'My commissions'],
  ['statement.issued', 'Owner / Finance', 'NuevaTech statement issued', '{ statement_id }', 'Billing'],
  ['security.new_device', 'Everyone', 'Sign-in from a new device', '{ device_name }', 'Signed-in devices'],
];

const ok = (data, meta) => ({ success: true, message: 'OK', data, ...(meta ? { meta } : {}) });

export const API = [
  {
    group: 'App start & public content', portal: 'public', items: [
      { id: 'app.config', method: 'GET', path: '/public/app-config', auth: 'none', mobile: true, summary: 'First call on launch: maintenance, minimum app version, branding, categories, sign-in options (PIN length, biometrics allowed).',
        response: ok({ maintenance: { on: false, message: null }, app: { min_version: '1.0.0', latest_version: '1.0.0', store_android: '…', store_ios: '…' }, brand: { name: 'Hope', tagline: 'Account Specialist', slogan: 'Making your dreams turn into reality.', primary: '#161616', accent: '#D4A72C', logo_url: 'https://hope.example/brand/hope-mark.png' }, sign_in: { pin: true, biometric: true, pin_length: 6, password_every_days: 30 }, categories: [{ key: 'condo', label: 'Condominium', group: 'property' }], sharing: { guest_can_view: true, guest_sees_contact: false } }) },
      { id: 'cms.home', method: 'GET', path: '/public/cms/home', auth: 'none', mobile: true, summary: 'Home screen content: hero text, featured listings, why-us items, testimonials, announcements.' },
      { id: 'cms.page', method: 'GET', path: '/public/cms/pages/{slug}', auth: 'none', mobile: true, summary: 'About, Terms, Privacy notice.' },
      { id: 'cms.faqs', method: 'GET', path: '/public/faqs', auth: 'none', mobile: true, summary: 'Frequently asked questions.' },
      { id: 'agents.list', method: 'GET', path: '/public/agents', auth: 'none', mobile: true, summary: 'Agents directory with photo, team, number of active listings.' },
      { id: 'agents.show', method: 'GET', path: '/public/agents/{id}', auth: 'none', mobile: true, summary: 'Agent profile and active listings. Phone number only for signed-in customers (setting).' },
      { id: 'health', method: 'GET', path: '/public/health', auth: 'none', summary: 'Uptime monitor.' },
    ],
  },
  {
    group: 'Listings (browse & share)', portal: 'public', items: [
      { id: 'listings.search', method: 'GET', path: '/public/listings', auth: 'none', mobile: true, summary: 'Search published listings. Query: q, purpose (sale|rent), category, group, city, min_price, max_price, bedrooms, sort (newest|price_asc|price_desc|popular), page, per_page.',
        response: ok([{ id: 'l12', code: 'HP-2026-0012', slug: '2br-corner-unit-in-ortigas-center-21', title: '2BR Corner Unit in Ortigas Center', purpose: 'sale', category: 'condo', price: 9300000, price_unit: 'total', city: 'Pasig', cover_url: '…', status: 'published', is_favourite: false, badges: ['featured'] }], { page: 1, per_page: 20, total: 31 }) },
      { id: 'listings.show', method: 'GET', path: '/public/listings/{slug}', auth: 'optional', mobile: true, summary: 'Listing detail. Guests get `contact: null` and `address` limited to city / barangay (Listing rules → sharing). With a customer token: agent phone, exact address, is_favourite, my_inquiry_id.',
        response: ok({ id: 'l12', code: 'HP-2026-0012', title: '…', description: '…', price: 9300000, price_unit: 'total', negotiable: true, specs: { bedrooms: 2, bathrooms: 2, floorArea: 68 }, features: ['Balcony', 'Gym'], photos: ['…'], location: { city: 'Pasig', barangay: 'San Antonio', address: null }, agent: { id: 'u_ag2', name: 'Andrea Lim', photo_url: null, phone: null }, share_url: 'https://hope.example/l/2br-corner-unit…?ch=link', guest_view: true }) },
      { id: 'listings.share', method: 'POST', path: '/public/listings/{id}/share', auth: 'none', mobile: true, summary: 'Count a share. Body: { channel: link|facebook|messenger|viber|qr }. Returns the tracked share URL (adds ?ch=…) to pass to the native share sheet.',
        body: { channel: 'facebook' }, response: ok({ url: 'https://hope.example/l/2br-corner-unit-in-ortigas-center-21?ch=facebook' }) },
      { id: 'share.resolve', method: 'GET', path: '/public/share/resolve?url=…', auth: 'none', mobile: true, summary: 'Deep link: the app opens https://hope.example/l/{slug} (App Links / Universal Links) and resolves it to a listing. Unknown / removed → NOT_FOUND.' },
    ],
  },
  {
    group: 'Customer sign-in & account', portal: 'customer', items: [
      { id: 'c.register', method: 'POST', path: '/customer/auth/register', auth: 'none', mobile: true, summary: 'Create an account. Sends a one-time code by SMS / email (Security → One-time codes).',
        body: { name: 'Ana Cruz', email: 'ana@example.com', mobile: '09171234567', password: '••••••••', accept_privacy: true }, response: ok({ challenge_token: 'otp_…', channel: 'sms', expires_in: 300, resend_in: 60 }) },
      { id: 'c.verify', method: 'POST', path: '/customer/auth/verify-otp', auth: 'none', mobile: true, summary: 'Confirm the one-time code; returns the token.', body: { challenge_token: 'otp_…', code: '246810' }, response: ok({ token: 'eyJ…', expires_in: 2592000, customer: { id: 'c1', name: 'Ana Cruz' } }) },
      { id: 'c.resend', method: 'POST', path: '/customer/auth/resend-otp', auth: 'none', mobile: true, summary: 'New code (after resend_in seconds).' },
      { id: 'c.login', method: 'POST', path: '/customer/auth/login', auth: 'none', mobile: true, summary: 'Sign in with email or mobile + password. Lockout rules apply.', body: { login: 'customer@demo.test', password: '••••••••' }, response: ok({ token: 'eyJ…', expires_in: 2592000, customer: { id: 'c1', name: 'Ana Cruz', email: 'customer@demo.test' }, device_sign_in: { pin: false, biometric: false } }) },
      { id: 'c.device.enable', method: 'POST', path: '/customer/auth/device/enable', auth: 'customer', mobile: true, summary: 'Turn on PIN or biometric sign-in on this phone (requires X-Device-Id and the password). Returns `device_secret` ONCE: store it AES-256-GCM encrypted in Keystore / Keychain (biometric: key unlocks only after the fingerprint / face check). The server keeps only an HMAC of it.',
        body: { method: 'pin', password: '••••••••', pin: '135790' }, response: ok({ device_secret: 'k8Jd…64 chars', credential: { id: 'dc_1', method: 'pin', device_name: 'Ana\'s iPhone', expires_at: '2026-12-08T10:00:00Z' } }) },
      { id: 'c.device.login', method: 'POST', path: '/customer/auth/device/login', auth: 'device', mobile: true, summary: 'Sign in with the stored device key (+ PIN). Same device only. Wrong PINs count toward the account lockout; after N wrong PINs the key is revoked.',
        body: { method: 'pin', device_secret: 'k8Jd…', pin: '135790' }, response: ok({ token: 'eyJ…', expires_in: 2592000 }) },
      { id: 'c.device.disable', method: 'DELETE', path: '/customer/auth/device/{method}', auth: 'customer', mobile: true, summary: 'Turn off PIN or biometric sign-in on this device.' },
      { id: 'c.devices', method: 'GET', path: '/customer/auth/devices', auth: 'customer', mobile: true, summary: 'Signed-in devices; DELETE /customer/auth/devices/{id} signs one out.' },
      { id: 'c.forgot', method: 'POST', path: '/customer/auth/forgot-password', auth: 'none', mobile: true, summary: 'Send a reset code; then POST /customer/auth/reset-password { challenge_token, code, password }. Revokes all PIN / biometric keys.' },
      { id: 'c.logout', method: 'POST', path: '/customer/auth/logout', auth: 'customer', mobile: true, summary: 'Revoke the token (keeps PIN / biometric for next time).' },
      { id: 'c.me', method: 'GET', path: '/customer/me', auth: 'customer', mobile: true, summary: 'Profile, counters (favourites, open inquiries, upcoming viewings, active deals). PATCH /customer/me updates name / mobile / photo.' },
      { id: 'c.password', method: 'POST', path: '/customer/me/password', auth: 'customer', mobile: true, summary: 'Change password (current + new). Turns off PIN / biometrics on other devices.' },
      { id: 'c.push', method: 'POST', path: '/customer/push-token', auth: 'customer', mobile: true, summary: 'Register the FCM token: { token, platform }.' },
      { id: 'c.privacy', method: 'POST', path: '/customer/privacy/requests', auth: 'customer', mobile: true, summary: 'Data Privacy Act: request a copy, correction or deletion of personal data.' },
    ],
  },
  {
    group: 'Customer: favourites, inquiries, viewings', portal: 'customer', items: [
      { id: 'c.fav.list', method: 'GET', path: '/customer/favourites', auth: 'customer', mobile: true, summary: 'Saved listings.' },
      { id: 'c.fav.add', method: 'POST', path: '/customer/favourites/{listingId}', auth: 'customer', mobile: true, summary: 'Save (DELETE to remove). Guests get ACCOUNT_REQUIRED.' },
      { id: 'c.inq.list', method: 'GET', path: '/customer/inquiries', auth: 'customer', mobile: true, summary: 'My inquiries with last message and stage.' },
      { id: 'c.inq.create', method: 'POST', path: '/customer/inquiries', auth: 'customer', mobile: true, summary: 'Ask the agent about a listing. `source` = how the customer arrived (mobile, facebook, messenger, viber, qr, web) – taken from the ?ch= of a share link.',
        body: { listing_id: 'l12', message: 'Is this still available?', source: 'facebook' }, response: ok({ id: 'q91', stage: 'new', agent: { name: 'Andrea Lim' }, messages: [{ from: 'customer', text: 'Is this still available?', at: '…' }] }) },
      { id: 'c.inq.show', method: 'GET', path: '/customer/inquiries/{id}', auth: 'customer', mobile: true, summary: 'Thread with the agent.' },
      { id: 'c.inq.msg', method: 'POST', path: '/customer/inquiries/{id}/messages', auth: 'customer', mobile: true, summary: 'Send a message: { text }.' },
      { id: 'c.view.list', method: 'GET', path: '/customer/viewings', auth: 'customer', mobile: true, summary: 'Upcoming and past viewings.' },
      { id: 'c.view.create', method: 'POST', path: '/customer/viewings', auth: 'customer', mobile: true, summary: 'Request a viewing: { listing_id, at, note }. The agent confirms or proposes another time.', body: { listing_id: 'l12', at: '2026-11-14T10:00:00+08:00', note: 'Family of 4' } },
      { id: 'c.view.cancel', method: 'POST', path: '/customer/viewings/{id}/cancel', auth: 'customer', mobile: true, summary: 'Cancel a viewing.' },
      { id: 'c.sub.create', method: 'POST', path: '/customer/submissions', auth: 'customer', mobile: true, summary: '"Sell / lease with Hope": submit own property or vehicle (multipart with photos). A Manager assigns an agent.' },
      { id: 'c.sub.list', method: 'GET', path: '/customer/submissions', auth: 'customer', mobile: true, summary: 'My submissions and their status.' },
      { id: 'c.notif', method: 'GET', path: '/customer/notifications', auth: 'customer', mobile: true, summary: 'Inbox. POST /customer/notifications/read { ids } marks as read.' },
    ],
  },
  {
    group: 'Customer: deals, payments & receipts', portal: 'customer', items: [
      { id: 'c.deals', method: 'GET', path: '/customer/deals', auth: 'customer', mobile: true, summary: 'My reservations / purchases / leases with status and document checklist.' },
      { id: 'c.deal', method: 'GET', path: '/customer/deals/{id}', auth: 'customer', mobile: true, summary: 'Deal tracker: status steps, amounts paid, balance, receipts.' },
      { id: 'c.pay', method: 'POST', path: '/customer/deals/{id}/pay', auth: 'customer', mobile: true, summary: 'Pay online (needs PayMongo): { kind: reservation|down_payment|deposit|advance, amount }. Returns checkout_url; open it in an in-app browser. The webhook issues the receipt.',
        body: { kind: 'reservation', amount: 20000 }, response: ok({ checkout_url: 'https://checkout.paymongo.com/…', payment_intent: 'pi_…' }) },
      { id: 'c.receipts', method: 'GET', path: '/customer/receipts', auth: 'customer', mobile: true, summary: 'All my receipts. GET /customer/receipts/{id}/pdf downloads the printable receipt.' },
      { id: 'webhook', method: 'POST', path: '/public/payments/webhooks/paymongo', auth: 'signature', summary: 'PayMongo webhook (signature checked with the webhook secret). Records the payment, issues the receipt, notifies the customer and agent.' },
    ],
  },
  {
    group: 'Staff sign-in (web portal and agent app)', portal: 'admin', items: [
      { id: 's.login', method: 'POST', path: '/admin/auth/login', auth: 'none', mobile: true, summary: 'Email + password. Returns a challenge for the authenticator code (or a token on a trusted device).',
        body: { email: 'agent@hope.test', password: '••••••••', trusted_device_token: null }, response: ok({ mfa_required: true, challenge_token: 'mfa_…', expires_in: 300 }) },
      { id: 's.mfa', method: 'POST', path: '/admin/auth/mfa/verify', auth: 'challenge', mobile: true, summary: '6-digit authenticator (TOTP) or recovery code. `remember_device` returns a trusted_device_token (Security → remember device days).',
        body: { challenge_token: 'mfa_…', code: '123456', remember_device: true }, response: ok({ token: 'eyJ…', trusted_device_token: 'td_…', staff: { id: 'u_ag1', name: 'Miguel Reyes', role: 'agent', permissions: ['listings.create', '…'] } }) },
      { id: 's.mfa.setup', method: 'POST', path: '/admin/auth/mfa/setup', auth: 'challenge', summary: 'First sign-in: returns the secret, otpauth URL and QR. Confirm with POST /admin/auth/mfa/confirm { code } → recovery codes (shown once).' },
      { id: 's.device', method: 'POST', path: '/admin/auth/device/enable', auth: 'staff', mobile: true, summary: 'Agent app: PIN / biometrics (Security → staff app). Same as the customer flow; the authenticator code is still asked after the password expiry.' },
      { id: 's.me', method: 'GET', path: '/admin/me', auth: 'staff', mobile: true, summary: 'Profile, role, permissions, team, unread notifications.' },
      { id: 's.logout', method: 'POST', path: '/admin/auth/logout', auth: 'staff', mobile: true, summary: 'Sign out.' },
    ],
  },
  {
    group: 'Staff: dashboard & analytics', portal: 'admin', items: [
      { id: 's.dash', method: 'GET', path: '/admin/dashboard', auth: 'staff', perm: 'dashboard.view', mobile: true, summary: 'Cards for the role: agent (my leads, viewings today, commissions), manager (team, approvals), owner (company KPIs, NuevaTech balance), super admin (platform).' },
      { id: 's.analytics', method: 'GET', path: '/admin/analytics', auth: 'staff', perm: 'analytics.view | analytics.team', summary: 'Sales volume, commission, funnel, lead sources and sales by source (share of deals through the system), agents, categories, cities, traffic. Query: from, to, team, agent, category, purpose. /admin/analytics/export → Excel / CSV.' },
    ],
  },
  {
    group: 'Staff: listings & approvals', portal: 'admin', items: [
      { id: 's.l.list', method: 'GET', path: '/admin/listings', auth: 'staff', perm: 'listings.create', mobile: true, summary: 'Listings in the user\'s scope (own / team / all). Filters: status, category, purpose, agent, q, trashed.' },
      { id: 's.l.create', method: 'POST', path: '/admin/listings', auth: 'staff', perm: 'listings.create', mobile: true, summary: 'Create a draft. `submit: true` sends it for approval right away.',
        body: { title: '2BR Corner Unit in Ortigas Center', purpose: 'sale', category: 'condo', price: 9300000, price_unit: 'total', city: 'Pasig', barangay: 'San Antonio', address: '…', specs: { bedrooms: 2, bathrooms: 2, floorArea: 68 }, features: ['Balcony'], description: '…', owner_name: '…', owner_phone: '…', submit: true }, response: ok({ id: 'l77', code: 'HP-2026-0077', status: 'pending' }) },
      { id: 's.l.show', method: 'GET', path: '/admin/listings/{id}', auth: 'staff', mobile: true, summary: 'Full record incl. owner, authority document, review notes, share counts.' },
      { id: 's.l.update', method: 'PATCH', path: '/admin/listings/{id}', auth: 'staff', perm: 'listings.create (own) | listings.edit_any', mobile: true, summary: 'Edit. Every changed field is written to the audit log (before → after). Editing price / title / photos of a live listing sends it back for approval (setting).' },
      { id: 's.l.photos', method: 'POST', path: '/admin/listings/{id}/photos', auth: 'staff', mobile: true, summary: 'Upload photos (multipart, max per Listing rules). DELETE /admin/listings/{id}/photos/{photoId}; PATCH …/photos/order.' },
      { id: 's.l.docs', method: 'POST', path: '/admin/listings/{id}/documents', auth: 'staff', mobile: true, summary: 'Upload the owner\'s Authority to Sell / Lease, title / OR-CR copies (private files).' },
      { id: 's.l.submit', method: 'POST', path: '/admin/listings/{id}/submit', auth: 'staff', mobile: true, summary: 'Send for approval (draft / changes requested → pending).' },
      { id: 's.approvals', method: 'GET', path: '/admin/approvals', auth: 'staff', perm: 'listings.approve', mobile: true, summary: 'Pending listings the user may review (Managers: own team; never own listings).' },
      { id: 's.l.approve', method: 'POST', path: '/admin/listings/{id}/approve', auth: 'staff', perm: 'listings.approve', mobile: true, summary: 'Publish. Body: { note }.' },
      { id: 's.l.changes', method: 'POST', path: '/admin/listings/{id}/request-changes', auth: 'staff', perm: 'listings.approve', mobile: true, summary: 'Return to the agent: { reason } (required).' },
      { id: 's.l.reject', method: 'POST', path: '/admin/listings/{id}/reject', auth: 'staff', perm: 'listings.approve', mobile: true, summary: 'Reject: { reason } (required).' },
      { id: 's.l.status', method: 'POST', path: '/admin/listings/{id}/status', auth: 'staff', summary: '{ status: archived | published | expired, reason }.' },
      { id: 's.l.feature', method: 'POST', path: '/admin/listings/{id}/feature', auth: 'staff', perm: 'listings.feature', summary: 'Toggle featured on the homepage.' },
      { id: 's.l.reassign', method: 'POST', path: '/admin/listings/{id}/reassign', auth: 'staff', perm: 'listings.reassign', summary: '{ agent_id }.' },
      { id: 's.l.delete', method: 'DELETE', path: '/admin/listings/{id}', auth: 'staff', perm: 'listings.delete', summary: 'Move to Trash: { reason } (required, audit-logged, Owner alerted). POST /admin/listings/{id}/restore brings it back.' },
      { id: 's.l.history', method: 'GET', path: '/admin/listings/{id}/history', auth: 'staff', mobile: true, summary: 'Audit timeline of the listing: who created, edited (field by field), approved, shared, deleted.' },
      { id: 's.sub', method: 'GET', path: '/admin/submissions', auth: 'staff', perm: 'submissions.manage', summary: 'Owner submissions. POST …/{id}/assign { agent_id }, …/{id}/decline { reason }, …/{id}/convert → draft listing.' },
    ],
  },
  {
    group: 'Staff: leads & viewings', portal: 'admin', items: [
      { id: 's.leads', method: 'GET', path: '/admin/leads', auth: 'staff', mobile: true, summary: 'Inquiries in scope, by stage (new → contacted → viewing → negotiating → reserved → won / lost). Overdue = no reply within the response time.' },
      { id: 's.lead', method: 'GET', path: '/admin/leads/{id}', auth: 'staff', mobile: true, summary: 'Thread, customer, listing, viewings, deal.' },
      { id: 's.lead.msg', method: 'POST', path: '/admin/leads/{id}/messages', auth: 'staff', mobile: true, summary: 'Reply: { text }. Push to the customer.' },
      { id: 's.lead.stage', method: 'POST', path: '/admin/leads/{id}/stage', auth: 'staff', mobile: true, summary: '{ stage, reason } (reason required for lost).' },
      { id: 's.lead.assign', method: 'POST', path: '/admin/leads/{id}/assign', auth: 'staff', perm: 'leads.assign', summary: '{ agent_id }.' },
      { id: 's.viewings', method: 'GET', path: '/admin/viewings', auth: 'staff', mobile: true, summary: 'Calendar. PATCH /admin/viewings/{id} { status: confirmed|done|no_show|cancelled, at, notes }.' },
    ],
  },
  {
    group: 'Staff: deals, payments & receipts', portal: 'admin', items: [
      { id: 's.deals', method: 'GET', path: '/admin/deals', auth: 'staff', mobile: true, summary: 'Deals in scope.' },
      { id: 's.deal.create', method: 'POST', path: '/admin/deals', auth: 'staff', perm: 'deals.create', mobile: true, summary: 'Reserve: { listing_id, customer_id, inquiry_id, source, price, scheme, lease_months }. source is taken from the inquiry (website, app, share link, QR); without an inquiry it is required (walk_in, referral, phone, other). Listing → Reserved.' },
      { id: 's.deal.preview', method: 'GET', path: '/admin/deals/{id}/computation', auth: 'staff', mobile: true, summary: 'Live computation with the current settings (commission, agent / manager split, NuevaTech fee, Hope net).',
        response: ok({ value: 9000000, gross: 450000, basis: '5% of the selling price', agent_pct: 65, agent_share: 292500, manager_pct: 5, manager_share: 22500, hope_share: 135000, platform_fee: 22500, platform_basis: '5% of Hope\'s commission', platform_source: 'default', hope_net: 112500 }) },
      { id: 's.deal.close', method: 'POST', path: '/admin/deals/{id}/close', auth: 'staff', perm: 'deals.close', summary: 'Close: locks the computation, listing → Sold / Rented, creates commission vouchers and the NuevaTech platform fee.' },
      { id: 's.deal.cancel', method: 'POST', path: '/admin/deals/{id}/cancel', auth: 'staff', perm: 'deals.cancel', summary: '{ reason }. Listing goes back to Published.' },
      { id: 's.deal.rate', method: 'POST', path: '/admin/deals/{id}/rate', auth: 'staff', perm: 'deals.override_rate', summary: 'Negotiated commission rate for this deal: { rate, reason }.' },
      { id: 's.deal.docs', method: 'PATCH', path: '/admin/deals/{id}/documents', auth: 'staff', mobile: true, summary: 'Document checklist (reservation agreement, deed / lease, IDs, …).' },
      { id: 's.pay.create', method: 'POST', path: '/admin/deals/{id}/payments', auth: 'staff', perm: 'payments.record', mobile: true, summary: 'Record a payment and issue an acknowledgement receipt: { kind, amount, method, ref }. kind = reservation | down_payment | full_payment | deposit | advance | commission | other.' },
      { id: 's.pay.list', method: 'GET', path: '/admin/payments', auth: 'staff', summary: 'Receipts; GET /admin/payments/{id}/receipt → printable PDF.' },
      { id: 's.pay.void', method: 'POST', path: '/admin/payments/{id}/void', auth: 'staff', perm: 'payments.void', summary: '{ reason } (required). The receipt stays, marked VOID.' },
    ],
  },
  {
    group: 'Staff: commissions', portal: 'admin', items: [
      { id: 's.cm.list', method: 'GET', path: '/admin/commissions', auth: 'staff', mobile: true, summary: 'Own commissions (agents) or all (Finance / Owner). Status: waiting for collection → for approval → approved → paid.' },
      { id: 's.cm.approve', method: 'POST', path: '/admin/commissions/{id}/approve', auth: 'staff', perm: 'commissions.approve', summary: 'Approve the payout.' },
      { id: 's.cm.pay', method: 'POST', path: '/admin/commissions/{id}/pay', auth: 'staff', perm: 'commissions.pay', summary: 'Mark as paid: { method, ref }. GET …/{id}/voucher → printable commission voucher.' },
    ],
  },
  {
    group: 'NuevaTech billing (platform fee)', portal: 'admin', items: [
      { id: 'b.fees', method: 'GET', path: '/admin/billing/fees', auth: 'staff', perm: 'billing.view', summary: 'One fee per closed deal: amount, basis, month, status (unbilled → billed → paid).' },
      { id: 'b.statements', method: 'GET', path: '/admin/billing/statements', auth: 'staff', perm: 'billing.view', summary: 'Statements of account from NuevaTech with balance and due date.' },
      { id: 'b.generate', method: 'POST', path: '/admin/billing/statements', auth: 'staff', perm: 'billing.statements', summary: 'Super Admin: issue the statement for a month: { period: "2026-10" } (also automatic on the 1st).' },
      { id: 'b.pay', method: 'POST', path: '/admin/billing/statements/{id}/payments', auth: 'staff', perm: 'billing.pay', summary: 'Owner / Finance: submit the payment with proof (multipart): { amount, method, ref, proof }.' },
      { id: 'b.confirm', method: 'POST', path: '/admin/billing/statements/{id}/confirm', auth: 'staff', perm: 'billing.confirm', summary: 'Super Admin: confirm receipt → NuevaTech official receipt number. POST …/return { reason } if the payment cannot be found.' },
    ],
  },
  {
    group: 'Staff: people, customers, settings, audit', portal: 'admin', items: [
      { id: 's.customers', method: 'GET', path: '/admin/customers', auth: 'staff', perm: 'customers.view', summary: 'Customers with their inquiries, deals and receipts. PATCH, POST …/{id}/unlock, …/{id}/deactivate.' },
      { id: 's.staff', method: 'GET', path: '/admin/staff', auth: 'staff', perm: 'staff.view', summary: 'Staff and agents. POST /admin/staff (invite), PATCH …/{id}, …/{id}/deactivate, …/{id}/unlock { reason }, …/{id}/reset-mfa. Only lower ranks.' },
      { id: 's.teams', method: 'GET', path: '/admin/teams', auth: 'staff', perm: 'staff.view', summary: 'Teams and their Managers. POST / PATCH with staff.manage.' },
      { id: 's.roles', method: 'GET', path: '/admin/roles', auth: 'staff', perm: 'roles.manage', summary: 'Roles with permissions. POST (new role), PATCH /admin/roles/{key} { label, permissions }.' },
      { id: 's.settings', method: 'GET', path: '/admin/settings', auth: 'staff', summary: 'Settings catalog with values. PATCH /admin/settings/{group} (permission per group; secrets write-only; every change audit-logged).' },
      { id: 's.cms', method: 'GET', path: '/admin/cms/{section}', auth: 'staff', perm: 'cms.manage', summary: 'CMS: home, why, testimonials, pages, faqs, announcements, categories, locations, features, templates. PATCH to save.' },
      { id: 's.integrations', method: 'GET', path: '/admin/integrations', auth: 'staff', perm: 'integrations.manage', summary: 'Integrations. PATCH /admin/integrations/{key} { values, on }, POST …/{key}/test.' },
      { id: 's.audit', method: 'GET', path: '/admin/audit', auth: 'staff', perm: 'audit.view', summary: 'Audit log (read-only, never deleted). Filters: actor, event, subject type / id, severity, from, to. /admin/audit/export → CSV.' },
      { id: 's.notif', method: 'GET', path: '/admin/notifications', auth: 'staff', mobile: true, summary: 'Staff inbox. POST /admin/push-token registers the app.' },
    ],
  },
];

export const API_COUNT = API.reduce((a, g) => a + g.items.length, 0);
export const apiById = Object.fromEntries(API.flatMap((g) => g.items.map((i) => [i.id, { ...i, group: g.group, portal: g.portal }])));

// Mobile app screens: what to build, the endpoints each screen uses, and the
// order to build them (M1 first). The docs turn this into the tracking checklist.
export const MOBILE_SCREENS = [
  // [id, app, screen, what it does, endpoints, milestone]
  ['M01', 'Both', 'Splash / app start', 'Read app config; maintenance; force update; go to lock screen if a device key exists', 'app.config', 'M1'],
  ['M02', 'Both', 'Welcome', 'Sign in, create account, browse as guest, staff sign-in link', '—', 'M1'],
  ['M03', 'Customer', 'Sign in', 'Email / mobile + password; lockout messages', 'c.login', 'M1'],
  ['M04', 'Customer', 'Create account + OTP', 'Register, privacy consent, one-time code, resend timer', 'c.register, c.verify, c.resend', 'M1'],
  ['M05', 'Customer', 'Forgot password', 'Code by SMS / email, new password', 'c.forgot', 'M1'],
  ['M06', 'Both', 'Turn on quick sign-in (sheet)', 'Offer PIN / biometrics after the first password sign-in', 'c.device.enable, s.device', 'M1'],
  ['M07', 'Both', 'Set PIN (keypad)', 'Enter + confirm; refuse easy PINs; length from config', 'c.device.enable', 'M1'],
  ['M08', 'Both', 'Lock screen', 'Biometric prompt, PIN keypad, wrong-PIN count, fall back to password', 'c.device.login', 'M1'],
  ['M09', 'Customer', 'Home', 'Hero, search bar, categories, featured, new listings, announcement', 'cms.home, listings.search', 'M1'],
  ['M10', 'Customer', 'Search & filters', 'Buy / rent, category, city, price, bedrooms, sort, infinite scroll', 'listings.search', 'M1'],
  ['M11', 'Customer', 'Listing detail', 'Gallery, price, specs, features, map, agent (contact hidden for guests), share, save, ask, book', 'listings.show, listings.share', 'M1'],
  ['M12', 'Customer', 'Account-required sheet', 'Shown on ACCOUNT_REQUIRED (guest taps ask / save / book)', '—', 'M1'],
  ['M13', 'Customer', 'Deep link handler', 'Open https://…/l/{slug}?ch=… in the app; keep ch as the inquiry source', 'share.resolve, listings.show', 'M1'],
  ['M14', 'Customer', 'Saved listings', 'List, remove', 'c.fav.list, c.fav.add', 'M2'],
  ['M15', 'Customer', 'Messages (inbox + thread)', 'Inquiries with the agent; push opens the thread', 'c.inq.list, c.inq.create, c.inq.show, c.inq.msg', 'M2'],
  ['M16', 'Customer', 'Book a viewing / my viewings', 'Pick day and time; status; cancel', 'c.view.create, c.view.list, c.view.cancel', 'M2'],
  ['M17', 'Customer', 'My deals (tracker)', 'Status steps, documents checklist, amounts paid', 'c.deals, c.deal', 'M2'],
  ['M18', 'Customer', 'Pay online', 'PayMongo checkout in an in-app browser; wait for the push / refresh', 'c.pay', 'M2'],
  ['M19', 'Customer', 'Receipts', 'List and PDF', 'c.receipts', 'M2'],
  ['M20', 'Customer', 'Sell with Hope', 'Submit own property / vehicle with photos; status', 'c.sub.create, c.sub.list', 'M3'],
  ['M21', 'Both', 'Notifications inbox', 'List, mark read, open target screen', 'c.notif, s.notif', 'M2'],
  ['M22', 'Both', 'Profile & security', 'Edit profile, change password, PIN / biometric toggles, signed-in devices, sign out', 'c.me, c.password, c.devices, c.device.disable, c.logout', 'M1'],
  ['M23', 'Customer', 'Privacy requests', 'Copy / correct / delete my data', 'c.privacy', 'M3'],
  ['M24', 'Agent', 'Staff sign-in + authenticator', 'Email + password, 6-digit code or recovery code, remember device', 's.login, s.mfa', 'M2'],
  ['M25', 'Agent', 'Agent home', 'Open leads, viewings today, live listings, commission due', 's.dash', 'M2'],
  ['M26', 'Agent', 'Leads (list + thread)', 'Reply, change stage, schedule viewing', 's.leads, s.lead, s.lead.msg, s.lead.stage, s.viewings', 'M2'],
  ['M27', 'Agent', 'My listings', 'Status, review notes from the Manager, edit, submit', 's.l.list, s.l.show, s.l.update, s.l.submit', 'M2'],
  ['M28', 'Agent', 'New / edit listing', 'Form + camera photos + authority document; submit for approval', 's.l.create, s.l.photos, s.l.docs', 'M2'],
  ['M29', 'Manager', 'Approvals', 'Approve / request changes / reject team listings', 's.approvals, s.l.approve, s.l.changes, s.l.reject', 'M3'],
  ['M30', 'Agent', 'My commissions', 'Vouchers and status', 's.cm.list', 'M3'],
  ['M31', 'Agent', 'Deals & payments (field)', 'Create reservation, record payment, document checklist', 's.deal.create, s.pay.create, s.deal.docs', 'M3'],
];
