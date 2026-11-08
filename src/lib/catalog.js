// Fixed lists of the system: categories, statuses, permissions, default roles,
// the Settings catalog (every rule the administrators can change) and the
// plug-and-play integrations. The docs generator reads this file too.

export const DEMO_PASSWORD = 'Demo@2026!';
export const DEMO_MFA = '123456';
export const DEMO_OTP = '246810';
export const DEMO_PIN = '135790';

// ---------------------------------------------------------------- listings
export const GROUPS = { property: 'Property', vehicle: 'Vehicle' };

export const DEFAULT_CATEGORIES = [
  { key: 'house_lot', label: 'House & Lot', group: 'property', icon: 'home', active: true },
  { key: 'condo', label: 'Condominium', group: 'property', icon: 'building', active: true },
  { key: 'townhouse', label: 'Townhouse', group: 'property', icon: 'home', active: true },
  { key: 'lot', label: 'Lot', group: 'property', icon: 'land', active: true },
  { key: 'commercial', label: 'Commercial', group: 'property', icon: 'store', active: true },
  { key: 'car', label: 'Car', group: 'vehicle', icon: 'car', active: true },
  { key: 'motorcycle', label: 'Motorcycle', group: 'vehicle', icon: 'bike', active: true },
];

export const PURPOSES = { sale: 'For Sale', rent: 'For Rent' };

export const LISTING_STATUS = {
  draft: { label: 'Draft', tone: 'muted', note: 'Being prepared by the agent. Not visible to the public.' },
  pending: { label: 'Pending approval', tone: 'warn', note: 'Submitted; waiting for a Manager (or higher) to review.' },
  changes: { label: 'Changes requested', tone: 'warn', note: 'Returned to the agent with comments.' },
  published: { label: 'Published', tone: 'ok', note: 'Visible on the website, the app and through share links.' },
  reserved: { label: 'Reserved', tone: 'info', note: 'A buyer / tenant has reserved it. Still visible, marked Reserved.' },
  sold: { label: 'Sold', tone: 'brand', note: 'Deal closed (sale).' },
  rented: { label: 'Rented', tone: 'brand', note: 'Deal closed (rent).' },
  rejected: { label: 'Rejected', tone: 'bad', note: 'Declined by the approver, with a reason.' },
  expired: { label: 'Expired', tone: 'muted', note: 'Passed the listing validity; the agent can renew it.' },
  archived: { label: 'Archived', tone: 'muted', note: 'Taken down (e.g. owner withdrew).' },
};

export const LEAD_STAGES = [
  { key: 'new', label: 'New', tone: 'info' },
  { key: 'contacted', label: 'Contacted', tone: 'info' },
  { key: 'viewing', label: 'Viewing', tone: 'warn' },
  { key: 'negotiating', label: 'Negotiating', tone: 'warn' },
  { key: 'reserved', label: 'Reserved', tone: 'brand' },
  { key: 'won', label: 'Closed – won', tone: 'ok' },
  { key: 'lost', label: 'Closed – lost', tone: 'bad' },
];

export const LEAD_SOURCES = { web: 'Website', mobile: 'Mobile app', facebook: 'Facebook share', messenger: 'Messenger share', viber: 'Viber share', qr: 'QR / flyer', referral: 'Referral', walk_in: 'Walk-in' };

export const DEAL_STATUS = {
  reserved: { label: 'Reserved', tone: 'info' },
  processing: { label: 'Processing documents', tone: 'warn' },
  closed: { label: 'Closed', tone: 'ok' },
  cancelled: { label: 'Cancelled', tone: 'bad' },
};

export const PAYMENT_KINDS = {
  reservation: { label: 'Reservation fee', from: 'buyer' },
  down_payment: { label: 'Down payment', from: 'buyer' },
  full_payment: { label: 'Full payment', from: 'buyer' },
  deposit: { label: 'Security deposit', from: 'buyer' },
  advance: { label: 'Advance rent', from: 'buyer' },
  commission: { label: 'Commission from seller / owner', from: 'seller' },
  other: { label: 'Other', from: 'buyer' },
};

export const PAYMENT_METHODS = ['Cash', 'Bank transfer', 'GCash', 'Maya', 'Check', 'Online (PayMongo)'];

export const COMMISSION_STATUS = {
  pending: { label: 'Waiting for collection', tone: 'muted' },
  for_approval: { label: 'For approval', tone: 'warn' },
  approved: { label: 'Approved – to pay', tone: 'info' },
  paid: { label: 'Paid', tone: 'ok' },
};

export const STATEMENT_STATUS = {
  issued: { label: 'Issued – unpaid', tone: 'warn' },
  submitted: { label: 'Payment submitted', tone: 'info' },
  paid: { label: 'Paid', tone: 'ok' },
  overdue: { label: 'Overdue', tone: 'bad' },
};

// ---------------------------------------------------------------- permissions
export const PERMISSIONS = [
  { group: 'Dashboard & analytics', items: [
    ['dashboard.view', 'See the dashboard'],
    ['analytics.view', 'Analytics of the whole company'],
    ['analytics.team', 'Analytics of own team only'],
    ['analytics.platform', 'Platform analytics (NuevaTech: all fees, usage, health)'],
  ] },
  { group: 'Listings', items: [
    ['listings.create', 'Create listings (own)'],
    ['listings.view_all', 'See every listing'],
    ['listings.view_team', 'See listings of own team'],
    ['listings.edit_any', 'Edit any listing'],
    ['listings.approve', 'Approve / reject / request changes'],
    ['listings.feature', 'Feature listings on the homepage'],
    ['listings.delete', 'Delete listings (to Trash) and restore'],
    ['listings.reassign', 'Reassign a listing to another agent'],
    ['submissions.manage', 'Handle "Sell with Hope" submissions from owners'],
  ] },
  { group: 'Leads & viewings', items: [
    ['leads.view_all', 'See every inquiry / lead'],
    ['leads.view_team', 'See leads of own team'],
    ['leads.assign', 'Assign / reassign leads'],
    ['viewings.manage', 'Schedule and update viewings'],
  ] },
  { group: 'Deals & payments', items: [
    ['deals.create', 'Create deals (reservations)'],
    ['deals.view_all', 'See every deal'],
    ['deals.close', 'Close deals (locks the computation)'],
    ['deals.cancel', 'Cancel deals'],
    ['deals.override_rate', 'Change the commission rate of a deal'],
    ['payments.record', 'Record payments and issue receipts'],
    ['payments.void', 'Void receipts'],
  ] },
  { group: 'Commissions', items: [
    ['commissions.view_all', 'See every commission'],
    ['commissions.approve', 'Approve commission payouts'],
    ['commissions.pay', 'Mark commissions as paid (voucher)'],
  ] },
  { group: 'NuevaTech billing', items: [
    ['billing.view', 'See platform fees and statements'],
    ['billing.pay', 'Submit payments to NuevaTech'],
    ['billing.confirm', 'Confirm payments and issue NuevaTech receipts'],
    ['billing.rates', 'Set the NuevaTech fee rules (default, per category, per deal)'],
    ['billing.statements', 'Generate statements of account'],
  ] },
  { group: 'Customers', items: [
    ['customers.view', 'See customers'],
    ['customers.manage', 'Edit, deactivate, unlock customers'],
  ] },
  { group: 'People & access', items: [
    ['staff.view', 'See staff and agents'],
    ['staff.manage', 'Add, edit, deactivate, unlock staff (lower rank only)'],
    ['roles.manage', 'Edit roles and permissions'],
  ] },
  { group: 'Content & settings', items: [
    ['cms.manage', 'Edit website / app content (CMS)'],
    ['settings.manage', 'Edit business rules (commission, listings, deals)'],
    ['settings.security', 'Edit security settings'],
    ['integrations.manage', 'Set up integrations (keys, test, switch on)'],
    ['system.maintenance', 'Maintenance mode'],
    ['audit.view', 'See audit logs'],
  ] },
];

export const ALL_PERMISSIONS = PERMISSIONS.flatMap((g) => g.items.map(([k]) => k));

export const DEFAULT_ROLES = {
  super_admin: {
    label: 'Super Admin', rank: 100, system: true, org: 'NuevaTech',
    description: 'NuevaTech, the third-party system provider: technical support, integrations, security and maintenance. Issues the platform-fee statements and confirms Hope\'s payments. Does not run Hope\'s business; every action is audit-logged.',
    perms: ['*'],
  },
  owner: {
    label: 'Owner', rank: 90, system: true, org: 'Hope',
    description: 'Head of Hope and the highest business role. Sees everything in the company, approves, closes deals, sets the commission and NuevaTech fee rules, pays the NuevaTech statements, manages people and settings.',
    perms: ALL_PERMISSIONS.filter((p) => !['analytics.platform', 'billing.confirm', 'billing.statements', 'analytics.team', 'listings.view_team', 'leads.view_team'].includes(p)),
  },
  admin: {
    label: 'Admin', rank: 80, system: false, org: 'Hope',
    description: 'Runs the daily operations: listings, leads, deals, customers, content. No security or role changes.',
    perms: ['dashboard.view', 'analytics.view', 'listings.create', 'listings.view_all', 'listings.edit_any', 'listings.approve', 'listings.feature', 'listings.delete', 'listings.reassign', 'submissions.manage', 'leads.view_all', 'leads.assign', 'viewings.manage', 'deals.create', 'deals.view_all', 'deals.close', 'deals.cancel', 'payments.record', 'commissions.view_all', 'billing.view', 'customers.view', 'customers.manage', 'staff.view', 'staff.manage', 'cms.manage', 'audit.view'],
  },
  manager: {
    label: 'Manager', rank: 60, system: false, org: 'Hope',
    description: 'Leads a team of agents. Approves the team\'s listings, assigns leads, closes the team\'s deals.',
    perms: ['dashboard.view', 'analytics.team', 'listings.create', 'listings.view_team', 'listings.approve', 'listings.reassign', 'submissions.manage', 'leads.view_team', 'leads.assign', 'viewings.manage', 'deals.create', 'deals.close', 'payments.record', 'customers.view', 'staff.view'],
  },
  finance: {
    label: 'Finance', rank: 50, system: false, org: 'Hope',
    description: 'Payments, receipts, commission payouts and the NuevaTech statements.',
    perms: ['dashboard.view', 'analytics.view', 'listings.view_all', 'deals.view_all', 'payments.record', 'payments.void', 'commissions.view_all', 'commissions.approve', 'commissions.pay', 'billing.view', 'billing.pay', 'customers.view'],
  },
  editor: {
    label: 'Content Editor', rank: 40, system: false, org: 'Hope',
    description: 'Website and app content only (homepage, pages, FAQs, announcements).',
    perms: ['dashboard.view', 'cms.manage', 'listings.view_all', 'listings.feature'],
  },
  agent: {
    label: 'Agent', rank: 30, system: true, org: 'Hope',
    description: 'Posts listings (approved by a Manager), answers inquiries, schedules viewings, creates deals. Sees only own work.',
    perms: ['dashboard.view', 'listings.create', 'viewings.manage', 'deals.create', 'payments.record'],
  },
};

// ---------------------------------------------------------------- settings
// Values live in state.settings[group][section][key]. Field types:
// text, textarea, number, percent, money, toggle, select, color, image, list, secret.
// `perm` = permission needed to change the group.

export const SETTINGS = [
  {
    key: 'brand', label: 'Company & branding', icon: 'palette', perm: 'cms.manage', kind: 'cms',
    description: 'Name, logo, colours and company details used on the website, the app, receipts and statements.',
    sections: [
      { key: 'identity', label: 'Name & logo', fields: [
        { key: 'name', label: 'System name (short)', type: 'text', default: 'Hope' },
        { key: 'tagline', label: 'Tagline under the name', type: 'text', default: 'Account Specialist' },
        { key: 'slogan', label: 'Slogan', type: 'text', default: 'Making your dreams turn into reality.' },
        { key: 'fullName', label: 'Full name', type: 'text', default: 'Hope Account Specialist' },
        { key: 'logo', label: 'Logo (PNG / SVG, square)', type: 'image', default: '/brand/hope-mark-192.png', description: 'Shown in the header, the app, receipts and statements. Remove to use the simple built-in mark.' },
        { key: 'primary', label: 'Main colour', type: 'color', default: '#161616' },
        { key: 'accent', label: 'Accent colour (gold)', type: 'color', default: '#D4A72C' },
      ] },
      { key: 'company', label: 'Company details', fields: [
        { key: 'legalName', label: 'Registered business name', type: 'text', default: 'Hope Account Specialist Realty & Brokerage' },
        { key: 'license', label: 'License numbers (DHSUD / PRC)', type: 'text', default: 'PRC Real Estate Broker Lic. No. 0000000 · DHSUD Reg. No. 0000' },
        { key: 'tin', label: 'TIN', type: 'text', default: '000-000-000-000' },
        { key: 'address', label: 'Office address', type: 'text', default: 'Unit 3B, Hope Building, Aguinaldo Highway, Imus, Cavite' },
        { key: 'phone', label: 'Phone / mobile', type: 'text', default: '0917 000 4673' },
        { key: 'email', label: 'Email', type: 'text', default: 'hello@hope.example' },
        { key: 'facebook', label: 'Facebook page', type: 'text', default: 'facebook.com/hopeaccountspecialist' },
        { key: 'hours', label: 'Office hours', type: 'text', default: 'Mon–Sat, 8:00 AM – 6:00 PM' },
      ] },
      { key: 'documents', label: 'Receipts & printouts', fields: [
        { key: 'receiptPrefix', label: 'Acknowledgement receipt prefix', type: 'text', default: 'AR' },
        { key: 'voucherPrefix', label: 'Commission voucher prefix', type: 'text', default: 'CV' },
        { key: 'signatory', label: 'Authorized signatory', type: 'text', default: 'Esperanza Dela Cruz' },
        { key: 'signatoryTitle', label: 'Signatory title', type: 'text', default: 'Owner' },
        { key: 'receiptNote', label: 'Note at the bottom of receipts', type: 'textarea', default: 'This is an acknowledgement receipt for the amount received on behalf of the transaction stated above. Keep this for your records.' },
      ] },
    ],
  },
  {
    key: 'commission', label: 'Commission & splits', icon: 'percent', perm: 'settings.manage',
    description: 'How Hope\'s commission is computed and split. A deal keeps the rates it had when it was closed.',
    sections: [
      { key: 'rates', label: 'Hope\'s commission (paid by the seller / owner)', fields: [
        { key: 'salePropertyPct', label: 'Property sale', type: 'percent', default: 5, description: 'Percent of the selling price.' },
        { key: 'saleVehiclePct', label: 'Vehicle sale', type: 'percent', default: 3, description: 'Percent of the selling price.' },
        { key: 'rentPropertyMonths', label: 'Property rent', type: 'number', unit: 'month(s) of rent', default: 1, description: 'Usually one month for a one-year lease.' },
        { key: 'rentVehiclePct', label: 'Vehicle rental', type: 'percent', default: 10, description: 'Percent of the total rental.' },
      ] },
      { key: 'splits', label: 'Split of the commission', fields: [
        { key: 'agentPct', label: 'Agent share', type: 'percent', default: 60, description: 'Of Hope\'s commission. An agent can have an own share (Staff → edit).' },
        { key: 'managerOn', label: 'Pay the team Manager an override', type: 'toggle', default: true },
        { key: 'managerPct', label: 'Manager override', type: 'percent', default: 5, description: 'Of Hope\'s commission, for deals of the Manager\'s team.' },
        { key: 'perAgentShare', label: 'Allow a different share per agent', type: 'toggle', default: true },
      ] },
      { key: 'payout', label: 'Payout of agent commissions', fields: [
        { key: 'afterCollection', label: 'Release only after Hope collected its commission', type: 'toggle', default: true },
        { key: 'needsApproval', label: 'Finance / Owner approves each payout', type: 'toggle', default: true },
        { key: 'withholdingOn', label: 'Deduct withholding tax', type: 'toggle', default: false },
        { key: 'withholdingPct', label: 'Withholding tax rate', type: 'percent', default: 10 },
      ] },
    ],
  },
  {
    key: 'platform', label: 'NuevaTech platform fee', icon: 'crown', perm: 'billing.rates', viewPerm: 'billing.view',
    description: 'What Hope pays NuevaTech (the third-party system provider) for each successful deal. The Owner sets it: the default here, rules per category in NuevaTech billing → Fee rules, and an override per deal. A deal keeps the fee it had when it was closed.',
    sections: [
      { key: 'fee', label: 'Default fee per closed deal', fields: [
        { key: 'enabled', label: 'Charge the NuevaTech fee', type: 'toggle', default: true, description: 'Off: no fee is added when deals close (e.g. during a free period).' },
        { key: 'method', label: 'Computed as', type: 'select', default: 'commission', choices: { commission: 'Percent of Hope\'s commission', price: 'Percent of the deal price', fixed: 'Fixed amount per deal' } },
        { key: 'ratePct', label: 'Default rate', type: 'percent', default: 5, description: 'Used when no fee rule matches the deal. Set by the Owner (3% – 5% discussed).' },
        { key: 'fixedSale', label: 'Fixed fee – sale', type: 'money', default: 5000 },
        { key: 'fixedRent', label: 'Fixed fee – rent', type: 'money', default: 1000 },
        { key: 'trigger', label: 'Fee becomes billable when', type: 'select', default: 'closed', choices: { closed: 'The deal is closed', collected: 'Hope has collected its commission' } },
      ] },
      { key: 'billing', label: 'Statement of account', fields: [
        { key: 'cycle', label: 'Billing cycle', type: 'select', default: 'monthly', choices: { monthly: 'Monthly', per_deal: 'Per deal' } },
        { key: 'dueDays', label: 'Payment due', type: 'number', unit: 'days after the statement', default: 15 },
        { key: 'payee', label: 'Pay to', type: 'text', default: 'Nueva Technology' },
        { key: 'bank', label: 'Bank details', type: 'textarea', default: 'BPI · Nueva Technology · 0000-0000-00\nGCash · 0917 000 0000' },
        { key: 'note', label: 'Note on statements', type: 'textarea', default: 'Platform fee for successful transactions recorded in the Hope system. Please send the proof of payment through Billing → Pay.' },
      ] },
    ],
  },
  {
    key: 'listings', label: 'Listing rules', icon: 'layers', perm: 'settings.manage',
    description: 'Approval, validity, photos and what guests see on shared links.',
    sections: [
      { key: 'workflow', label: 'Posting & approval', fields: [
        { key: 'requireApproval', label: 'Agents\' listings need approval before publishing', type: 'toggle', default: true },
        { key: 'selfApproval', label: 'Allow approving your own listing', type: 'toggle', default: false, description: 'Off: a different Manager / Admin must approve.' },
        { key: 'reapproveOnEdit', label: 'Editing price, title or photos of a published listing needs approval again', type: 'toggle', default: true },
        { key: 'validityDays', label: 'Listing validity', type: 'number', unit: 'days', default: 90 },
        { key: 'minPhotos', label: 'Minimum photos', type: 'number', unit: 'photos', default: 1 },
        { key: 'maxPhotos', label: 'Maximum photos', type: 'number', unit: 'photos', default: 12 },
        { key: 'requireAuthority', label: 'Require the owner\'s Authority to Sell / Lease', type: 'toggle', default: true },
        { key: 'codePrefix', label: 'Listing code prefix', type: 'text', default: 'HP' },
      ] },
      { key: 'sharing', label: 'Public pages & share links', fields: [
        { key: 'publicShare', label: 'Listings can be shared publicly (link, Facebook, Messenger, Viber, QR)', type: 'toggle', default: true },
        { key: 'guestCanView', label: 'Guests (no account) can view listings', type: 'toggle', default: true },
        { key: 'guestSeesContact', label: 'Guests can see the agent\'s phone number', type: 'toggle', default: false, description: 'Off: guests must create an account to contact or ask.' },
        { key: 'guestSeesAddress', label: 'Guests can see the exact address', type: 'toggle', default: false, description: 'Off: only the city / barangay is shown.' },
        { key: 'trackShares', label: 'Track which share link brought each inquiry', type: 'toggle', default: true },
      ] },
      { key: 'inquiries', label: 'Inquiries', fields: [
        { key: 'autoAssign', label: 'Assign new inquiries to the listing\'s agent', type: 'toggle', default: true },
        { key: 'responseHours', label: 'Agent must reply within', type: 'number', unit: 'hours', default: 24, description: 'Late replies show on the dashboard and are escalated to the Manager.' },
        { key: 'autoCloseDays', label: 'Close inactive leads after', type: 'number', unit: 'days', default: 60 },
      ] },
    ],
  },
  {
    key: 'deals', label: 'Deals & payments', icon: 'handshake', perm: 'settings.manage',
    description: 'Reservations, rent terms and receipts.',
    sections: [
      { key: 'terms', label: 'Defaults', fields: [
        { key: 'reservationFee', label: 'Default reservation fee (sale)', type: 'money', default: 20000 },
        { key: 'reservationDays', label: 'Reservation valid for', type: 'number', unit: 'days', default: 30 },
        { key: 'depositMonths', label: 'Rent: security deposit', type: 'number', unit: 'months', default: 2 },
        { key: 'advanceMonths', label: 'Rent: advance', type: 'number', unit: 'months', default: 1 },
        { key: 'leaseMonths', label: 'Rent: default lease', type: 'number', unit: 'months', default: 12 },
      ] },
      { key: 'payments', label: 'Payments & receipts', fields: [
        { key: 'methods', label: 'Accepted payment methods', type: 'list', default: PAYMENT_METHODS },
        { key: 'voidReason', label: 'Voiding a receipt requires a reason', type: 'toggle', default: true },
        { key: 'onlinePayments', label: 'Customers can pay online in the portal / app (needs PayMongo)', type: 'toggle', default: true },
      ] },
    ],
  },
  {
    key: 'security', label: 'Security', icon: 'shield', perm: 'settings.security',
    description: 'Same protections as the SJCMPC system: lockout, authenticator codes, PIN & biometrics.',
    sections: [
      { key: 'lockout', label: 'Login lockout', fields: [
        { key: 'maxAttempts', label: 'Failed attempts before lock', type: 'number', unit: 'attempts', default: 3 },
        { key: 'windowMinutes', label: 'Count failures within', type: 'number', unit: 'minutes', default: 30 },
        { key: 'lockMinutes', label: 'Temporary lock', type: 'number', unit: 'minutes', default: 15 },
        { key: 'flagAfterLocks', label: 'Flag as suspicious after', type: 'number', unit: 'lockouts', default: 2 },
        { key: 'flagWindowHours', label: 'Lockout window', type: 'number', unit: 'hours', default: 24 },
        { key: 'showRemaining', label: 'Tell users how many attempts remain', type: 'toggle', default: true },
        { key: 'lockedMessage', label: 'Temporary lock message', type: 'textarea', default: 'Too many failed sign-in attempts. Your account is locked for :minutes minute(s). Please try again later.' },
        { key: 'flaggedMessage', label: 'Flagged account message', type: 'textarea', default: 'This account has been flagged for suspicious sign-in activity and is locked. Please contact the Owner or a higher-ranking officer to unlock it.' },
      ] },
      { key: 'mfa', label: 'Authenticator app (staff)', fields: [
        { key: 'required', label: 'Require an authenticator code for all staff', type: 'toggle', default: true },
        { key: 'issuer', label: 'Name shown in the authenticator app', type: 'text', default: 'Hope' },
        { key: 'rememberDays', label: 'Remember a trusted device for', type: 'number', unit: 'days', default: 30 },
        { key: 'recoveryCodes', label: 'Recovery codes issued', type: 'number', unit: 'codes', default: 8 },
      ] },
      { key: 'password', label: 'Password policy', fields: [
        { key: 'minLength', label: 'Minimum length', type: 'number', unit: 'characters', default: 10 },
        { key: 'mixedCase', label: 'Require upper and lower case', type: 'toggle', default: true },
        { key: 'numbers', label: 'Require a number', type: 'toggle', default: true },
        { key: 'symbols', label: 'Require a symbol', type: 'toggle', default: true },
      ] },
      { key: 'sessions', label: 'Sessions', fields: [
        { key: 'staffIdleMinutes', label: 'Staff idle timeout', type: 'number', unit: 'minutes', default: 30 },
        { key: 'staffMaxHours', label: 'Staff session maximum', type: 'number', unit: 'hours', default: 12 },
        { key: 'customerDays', label: 'Customer session (web / app)', type: 'number', unit: 'days', default: 30 },
        { key: 'singleSession', label: 'One active session per staff account', type: 'toggle', default: false },
      ] },
      { key: 'otp', label: 'One-time codes (customers)', fields: [
        { key: 'channel', label: 'Send codes by', type: 'select', default: 'sms', choices: { sms: 'SMS', email: 'Email' } },
        { key: 'length', label: 'Code length', type: 'number', unit: 'digits', default: 6 },
        { key: 'expiryMinutes', label: 'Code valid for', type: 'number', unit: 'minutes', default: 5 },
        { key: 'resendSeconds', label: 'Wait before a new code', type: 'number', unit: 'seconds', default: 60 },
      ] },
      { key: 'device', label: 'PIN & biometric sign-in (mobile app)', fields: [
        { key: 'pin', label: 'Allow PIN sign-in', type: 'toggle', default: true },
        { key: 'biometric', label: 'Allow fingerprint / face sign-in', type: 'toggle', default: true },
        { key: 'pinLength', label: 'PIN length', type: 'select', default: '6', choices: { 4: '4 digits', 6: '6 digits' } },
        { key: 'maxPinAttempts', label: 'Turn off PIN on the device after wrong PINs', type: 'number', unit: 'attempts', default: 5 },
        { key: 'passwordEveryDays', label: 'Ask for the password again after', type: 'number', unit: 'days (0 = never)', default: 30 },
        { key: 'blockSimple', label: 'Refuse easy PINs (111111, 123456)', type: 'toggle', default: true },
        { key: 'staffApp', label: 'Staff can also use PIN / biometrics in the app (after the authenticator code)', type: 'toggle', default: true },
      ] },
      { key: 'alerts', label: 'Security alerts', fields: [
        { key: 'flagged', label: 'Alert the Owner and Super Admin when an account is flagged', type: 'toggle', default: true },
        { key: 'newDevice', label: 'Email the user on sign-in from a new device', type: 'toggle', default: true },
        { key: 'bigDelete', label: 'Alert the Owner when a listing or receipt is deleted / voided', type: 'toggle', default: true },
      ] },
    ],
  },
  {
    key: 'system', label: 'System & maintenance', icon: 'wrench', perm: 'system.maintenance',
    description: 'Maintenance mode and app versions.',
    sections: [
      { key: 'maintenance', label: 'Maintenance mode', fields: [
        { key: 'on', label: 'Maintenance mode', type: 'toggle', default: false, description: 'Website and app show the message below. Staff portal stays open for Super Admin and Owner.' },
        { key: 'message', label: 'Message', type: 'textarea', default: 'We are improving Hope. We will be back shortly. For urgent concerns call 0917 000 4673.' },
      ] },
      { key: 'uploads', label: 'File uploads', fields: [
        { key: 'maxPhotoMb', label: 'Largest photo', type: 'number', unit: 'MB', default: 10 },
        { key: 'maxDocMb', label: 'Largest document', type: 'number', unit: 'MB', default: 20 },
        { key: 'docTypes', label: 'Allowed document types', type: 'text', default: 'pdf, jpg, png' },
        { key: 'resizePx', label: 'Resize photos to at most', type: 'number', unit: 'px (long side)', default: 2000 },
        { key: 'watermark', label: 'Add the Hope logo as a watermark on listing photos', type: 'toggle', default: true },
        { key: 'privateDocs', label: 'Keep IDs, titles and authority documents private (signed links that expire)', type: 'toggle', default: true },
      ] },
      { key: 'app', label: 'Mobile app', fields: [
        { key: 'minVersion', label: 'Minimum app version (older apps must update)', type: 'text', default: '1.0.0' },
        { key: 'latestVersion', label: 'Latest app version', type: 'text', default: '1.0.0' },
        { key: 'storeAndroid', label: 'Google Play link', type: 'text', default: 'https://play.google.com/store/apps/details?id=com.hope.app' },
        { key: 'storeIos', label: 'App Store link', type: 'text', default: 'https://apps.apple.com/app/hope/id0000000000' },
      ] },
    ],
  },
];

// NuevaTech fee rules (Owner, NuevaTech billing → Fee rules). The first active rule that
// matches the deal's category and purpose wins; otherwise the default fee above applies.
//   method: commission (percent of Hope's commission) | price (percent of the deal price) | fixed
export const DEFAULT_FEE_RULES = [
  { id: 'fr1', label: 'Vehicles', categories: ['car', 'motorcycle'], purpose: 'any', method: 'commission', rate: 3, fixed: 0, active: true },
  { id: 'fr2', label: 'Rentals', categories: [], purpose: 'rent', method: 'fixed', rate: 0, fixed: 1000, active: false },
];
export const FEE_METHODS = { commission: 'Percent of Hope\'s commission', price: 'Percent of the deal price', fixed: 'Fixed amount' };

/** Default values of the whole Settings catalog. */
export function defaultSettings() {
  const out = {};
  for (const g of SETTINGS) {
    out[g.key] = {};
    for (const s of g.sections) {
      out[g.key][s.key] = {};
      for (const f of s.fields) out[g.key][s.key][f.key] = Array.isArray(f.default) ? [...f.default] : f.default;
    }
  }
  out.platform.rules = DEFAULT_FEE_RULES.map((r) => ({ ...r, categories: [...r.categories] }));
  return out;
}

// ---------------------------------------------------------------- integrations
export const INTEGRATIONS = [
  { key: 'paymongo', label: 'PayMongo', kind: 'Online payments', icon: 'card', description: 'Customers pay reservation fees and balances online (GCash, Maya, cards). Webhook confirms the payment and issues the receipt.',
    fields: [['publicKey', 'Public key', 'text', 'pk_live_…'], ['secretKey', 'Secret key', 'secret', 'sk_live_…'], ['webhookSecret', 'Webhook signing secret', 'secret', 'whsk_…']] },
  { key: 'sms', label: 'Semaphore', kind: 'SMS', icon: 'message', description: 'One-time codes, viewing reminders and payment notices by SMS.',
    fields: [['apiKey', 'API key', 'secret', ''], ['sender', 'Sender name', 'text', 'HOPE']] },
  { key: 'email', label: 'Mailjet', kind: 'Email', icon: 'mail', description: 'Account emails, receipts and statements.',
    fields: [['apiKey', 'API key', 'secret', ''], ['apiSecret', 'Secret key', 'secret', ''], ['from', 'From address', 'text', 'no-reply@hope.example']] },
  { key: 'push', label: 'Firebase Cloud Messaging', kind: 'Push notifications', icon: 'bell', description: 'Push notifications to the Android and iOS app.',
    fields: [['projectId', 'Project ID', 'text', 'hope-app'], ['serviceAccount', 'Service account JSON', 'secret', '{ … }']] },
  { key: 'maps', label: 'Google Maps', kind: 'Maps', icon: 'map', description: 'Map pins on listings, location search and the "near me" filter.',
    fields: [['apiKey', 'API key', 'secret', 'AIza…']] },
  { key: 'storage', label: 'S3 file storage', kind: 'File storage (S3-compatible)', icon: 'database', description: 'Listing photos, documents (Authority to Sell, IDs, titles) and receipt PDFs. Works with Amazon S3 or any S3-compatible service. Without it, files stay on the server; once on, new files go to the bucket and old ones can be moved.',
    fields: [['provider', 'Provider', 'select', '', { aws: 'Amazon S3', r2: 'Cloudflare R2', spaces: 'DigitalOcean Spaces', wasabi: 'Wasabi', other: 'Other S3-compatible' }], ['endpoint', 'Endpoint (not needed for Amazon S3)', 'text', 'https://<account>.r2.cloudflarestorage.com'], ['bucket', 'Bucket', 'text', 'hope-files'], ['region', 'Region', 'text', 'ap-southeast-1'], ['accessKey', 'Access key ID', 'secret', ''], ['secretKey', 'Secret access key', 'secret', ''], ['publicUrl', 'Public URL / CDN for photos (optional)', 'text', 'https://cdn.hope.example'], ['prefix', 'Folder prefix', 'text', 'hope/']] },
  { key: 'facebook', label: 'Facebook / Meta', kind: 'Sharing', icon: 'facebook', description: 'Share previews (Open Graph) and the Messenger share button.',
    fields: [['appId', 'App ID', 'text', ''], ['pageId', 'Page ID', 'text', '']] },
  { key: 'analytics', label: 'Google Analytics 4', kind: 'Web analytics', icon: 'chart', description: 'Visitor statistics of the public website.',
    fields: [['measurementId', 'Measurement ID', 'text', 'G-XXXXXXX']] },
];

// ---------------------------------------------------------------- CMS
export const DEFAULT_CMS = {
  home: {
    heroTitle: 'Find your next home, condo or car — with an agent you can trust.',
    heroSubtitle: 'Buy, sell or rent through verified Hope account specialists. Every listing is checked before it goes live.',
    showStats: true,
    ctaTitle: 'Selling or leasing out your property or car?',
    ctaText: 'Submit it to Hope. A verified agent will contact you, check the documents and post it for you.',
  },
  why: [
    { icon: 'verified', title: 'Verified listings', text: 'A Manager checks every listing and the owner\'s authority before it is published.' },
    { icon: 'users', title: 'Licensed agents', text: 'Our account specialists guide you from viewing to signing.' },
    { icon: 'receipt', title: 'Official receipts', text: 'Every payment you make gets a receipt you can view and print in your account.' },
    { icon: 'shield', title: 'Safe and private', text: 'Your contact details are shared only with the agent handling your inquiry.' },
  ],
  testimonials: [
    { name: 'Joanna P.', text: 'Our agent answered every question and the receipts were all in the app. Smooth from viewing to turnover.', where: 'Bought a house in Imus' },
    { name: 'Mark D.', text: 'Found a condo near work in two weeks. The viewing schedule and reminders helped a lot.', where: 'Rented a condo in BGC' },
    { name: 'Rhea S.', text: 'Sold my SUV through Hope. They handled the inquiries so I didn\'t have to.', where: 'Sold a car' },
  ],
  locations: ['Imus, Cavite', 'Bacoor, Cavite', 'Dasmariñas, Cavite', 'Silang, Cavite', 'Tagaytay, Cavite', 'Santa Rosa, Laguna', 'Biñan, Laguna', 'Calamba, Laguna', 'Taguig (BGC)', 'Makati', 'Pasig', 'Quezon City', 'Mandaluyong', 'Parañaque', 'Muntinlupa (Alabang)', 'Las Piñas'],
  propertyFeatures: ['Swimming pool', 'Gym', 'Garden', 'Balcony', 'Maid\'s room', 'Gated community', '24/7 security', 'Near school', 'Near mall', 'Pet friendly', 'Fully furnished', 'Semi-furnished', 'Parking slot', 'Clubhouse', 'Flood-free'],
  vehicleFeatures: ['Casa maintained', 'First owner', 'Complete papers', 'Low mileage', 'Dashcam', 'Reverse camera', 'Push start', 'Leather seats', 'New tires', 'Financing available'],
  pages: [
    { slug: 'about', title: 'About Hope', body: 'Hope Account Specialist helps families and businesses buy, sell and rent homes, condominiums, lots, commercial spaces and vehicles.\n\nOur agents are trained account specialists. Every listing is reviewed by a Manager before it is published, and every payment is receipted in the system.' },
    { slug: 'terms', title: 'Terms of use', body: 'By using the Hope website and app you agree to provide true information in inquiries and submissions. Listings are posted by Hope agents on behalf of owners; prices and availability may change without notice until a reservation is made.' },
    { slug: 'privacy', title: 'Privacy notice', body: 'Hope processes your personal data in line with the Data Privacy Act of 2012 (RA 10173). Your contact details are used only to answer your inquiries and process your transactions, and are shared only with the agent handling them. You can request a copy, correction or deletion of your data in your account.' },
  ],
  faqs: [
    { q: 'Do I need an account to view listings?', a: 'No. Anyone can view listings and shared links. To ask a question, save a listing, book a viewing or reserve, you need a free account.' },
    { q: 'How do I reserve a property?', a: 'Book a viewing with the agent, then reserve with the reservation fee. You get an acknowledgement receipt in your account right away.' },
    { q: 'Can Hope sell my property or car?', a: 'Yes. Use "Sell with Hope" to submit it. An agent will contact you, check the documents and post the listing after approval.' },
    { q: 'Who pays the agent\'s commission?', a: 'The seller / owner pays Hope\'s commission, as agreed in the Authority to Sell or Lease. Buyers and tenants do not pay a commission.' },
  ],
  announcements: [
    { id: 'an1', text: 'New: book viewings and pay reservation fees in the Hope app.', link: '/mobile', active: true, audience: 'all' },
  ],
  templates: [
    { key: 'inquiry_received', label: 'New inquiry (to agent)', channels: ['push', 'email'], body: 'New inquiry from :customer about :listing.' },
    { key: 'inquiry_reply', label: 'Agent replied (to customer)', channels: ['push'], body: ':agent replied to your inquiry about :listing.' },
    { key: 'viewing_confirmed', label: 'Viewing confirmed', channels: ['sms', 'push'], body: 'Hi :customer, your viewing of :listing is confirmed on :date at :time with :agent.' },
    { key: 'viewing_reminder', label: 'Viewing reminder (day before)', channels: ['sms', 'push'], body: 'Reminder: viewing of :listing tomorrow at :time. Agent: :agent (:agent_phone).' },
    { key: 'listing_approved', label: 'Listing approved (to agent)', channels: ['push', 'email'], body: 'Your listing :listing was approved and is now live.' },
    { key: 'listing_changes', label: 'Changes requested (to agent)', channels: ['push', 'email'], body: ':approver asked for changes on :listing: :reason' },
    { key: 'payment_received', label: 'Payment received (to customer)', channels: ['sms', 'email', 'push'], body: 'We received :amount for :listing. Receipt :receipt is in your Hope account.' },
    { key: 'deal_closed', label: 'Deal closed (to agent)', channels: ['push'], body: 'Congratulations! :listing is closed. Your commission: :amount.' },
    { key: 'statement_issued', label: 'NuevaTech statement issued (to Owner)', channels: ['email'], body: 'Statement :statement for :period is ready: :amount due on :due.' },
    { key: 'otp', label: 'One-time code', channels: ['sms', 'email'], body: 'Your Hope code is :code. It expires in :minutes minutes. Never share this code.' },
  ],
};
