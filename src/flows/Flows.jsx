// Flowcharts and API reference for the mobile developer (and the proposal).
// Each diagram card has data-shot so docs/generator can screenshot it.
import { useState } from 'react';
import { Link } from 'react-router-dom';
import Icon from '../lib/icons.jsx';
import { useStore } from '../lib/store.jsx';
import { API, API_BASE, API_COUNT, ERROR_CODES, HEADERS, MOBILE_SCREENS, PORTALS, PUSH_TYPES, apiById } from '../lib/apiSpec.js';
import { computeDeal } from '../lib/money.js';
import { pesoCents } from '../lib/format.js';
import { Logo } from '../components.jsx';
import { DemoBar } from '../site/SiteApp.jsx';
import { ComputationTable } from '../printables.jsx';

const CW = 186; const X0 = 100; const RH = 96; const Y0 = 46;
const n = (id, col, row, label, sub, kind = 'step', w = 156) => ({ id, x: X0 + col * CW, y: Y0 + row * RH, label, sub, kind, w });

function wrapText(t, max) {
  const words = String(t).split(' '); const lines = []; let cur = '';
  for (const w of words) { if ((`${cur} ${w}`).trim().length > max) { if (cur) lines.push(cur); cur = w; } else cur = `${cur} ${w}`.trim(); }
  if (cur) lines.push(cur);
  return lines;
}

function route(a, b, mode, byId) {
  if (typeof mode === 'function') return mode(byId);
  const dx = b.x - a.x; const dy = b.y - a.y;
  const sgn = (v) => (v >= 0 ? 1 : -1);
  if (mode === 'right' || mode === 'left' || mode === 'top' || mode === 'bottom') {
    if (mode === 'right' || mode === 'left') {
      const s = mode === 'right' ? 1 : -1; const X = s > 0 ? Math.max(a.x + a.w / 2, b.x + b.w / 2) + 26 : Math.min(a.x - a.w / 2, b.x - b.w / 2) - 26;
      return { d: `M${a.x + (s * a.w) / 2},${a.y} H${X} V${b.y} H${b.x + (s * b.w) / 2}`, lx: X, ly: (a.y + b.y) / 2 };
    }
    const s = mode === 'bottom' ? 1 : -1; const Y = s > 0 ? Math.max(a.y + a.h / 2, b.y + b.h / 2) + 22 : Math.min(a.y - a.h / 2, b.y - b.h / 2) - 22;
    return { d: `M${a.x},${a.y + (s * a.h) / 2} V${Y} H${b.x} V${b.y + (s * b.h) / 2}`, lx: (a.x + b.x) / 2, ly: Y };
  }
  if (Math.abs(dy) < 4) { const sx = a.x + (sgn(dx) * a.w) / 2; const tx = b.x - (sgn(dx) * b.w) / 2; return { d: `M${sx},${a.y} H${tx}`, lx: (sx + tx) / 2, ly: a.y }; }
  if (Math.abs(dx) < 4) { const sy = a.y + (sgn(dy) * a.h) / 2; const ty = b.y - (sgn(dy) * b.h) / 2; return { d: `M${a.x},${sy} V${ty}`, lx: a.x, ly: (sy + ty) / 2 }; }
  if (mode === 'hv') { const sx = a.x + (sgn(dx) * a.w) / 2; const ty = b.y - (sgn(dy) * b.h) / 2; return { d: `M${sx},${a.y} H${b.x} V${ty}`, lx: (sx + b.x) / 2, ly: a.y }; }
  if (mode === 'vh') { const sy = a.y + (sgn(dy) * a.h) / 2; const tx = b.x - (sgn(dx) * b.w) / 2; return { d: `M${a.x},${sy} V${b.y} H${tx}`, lx: a.x, ly: (sy + b.y) / 2 }; }
  const sy = a.y + (sgn(dy) * a.h) / 2; const ty = b.y - (sgn(dy) * b.h) / 2; const my = (sy + ty) / 2;
  return { d: `M${a.x},${sy} V${my} H${b.x} V${ty}`, lx: (a.x + b.x) / 2, ly: my };
}

const STYLE = {
  start: { fill: 'var(--brand)', stroke: 'var(--brand)', text: '#fff', rx: 26 },
  actor: { fill: '#172033', stroke: '#172033', text: '#fff', rx: 12 },
  step: { fill: '#fff', stroke: 'var(--brand)', text: 'var(--ink)', rx: 10 },
  decision: { fill: 'var(--accent-50)', stroke: 'var(--accent)', text: 'var(--ink)', rx: 10 },
  end: { fill: 'var(--ok)', stroke: 'var(--ok)', text: '#fff', rx: 26 },
  bad: { fill: 'var(--bad-50)', stroke: 'var(--bad)', text: 'var(--ink)', rx: 10 },
  note: { fill: '#F8FAFC', stroke: '#9AA6B8', text: 'var(--ink-2)', rx: 10, dash: '5 4' },
  api: { fill: '#EEF3F9', stroke: '#5B7FA8', text: 'var(--ink)', rx: 10 },
};

export function Flow({ nodes, edges, groups = [], title }) {
  const byId = {};
  nodes.forEach((x) => {
    const lines = wrapText(x.label, Math.floor(x.w / 7.6));
    const sub = x.sub ? wrapText(x.sub, Math.floor(x.w / 6.2)) : [];
    byId[x.id] = { ...x, lines, subLines: sub, h: 18 + lines.length * 16 + sub.length * 13 + (sub.length ? 4 : 0) };
  });
  const all = Object.values(byId);
  const W = Math.max(...all.map((x) => x.x + x.w / 2), ...groups.map((g) => g.x + g.w)) + 40;
  const H = Math.max(...all.map((x) => x.y + x.h / 2), ...groups.map((g) => g.y + g.h)) + 40;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="flow-svg" role="img" aria-label={title}>
      <defs><marker id="arr" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="#6B778C" /></marker></defs>
      {groups.map((g) => <g key={g.label}><rect x={g.x} y={g.y} width={g.w} height={g.h} rx="14" fill="#F4F7FB" stroke="#D9E1EC" /><text x={g.x + 12} y={g.y + 18} fontSize="11" fontWeight="700" fill="#6B778C" letterSpacing=".06em">{g.label.toUpperCase()}</text></g>)}
      {edges.map(([f, t, label, mode], i) => {
        const a = byId[f]; const b = byId[t];
        if (!a || !b) return null;
        const r = route(a, b, mode, byId);
        return (
          <g key={i}>
            <path d={r.d} fill="none" stroke="#8592A6" strokeWidth="1.6" markerEnd="url(#arr)" strokeDasharray={mode === 'dash' ? '4 4' : undefined} />
            {label && <g><rect x={r.lx - label.length * 3.1 - 5} y={r.ly - 9} width={label.length * 6.2 + 10} height="17" rx="8" fill="#fff" stroke="#E3E8EF" /><text x={r.lx} y={r.ly + 3.5} fontSize="10.5" textAnchor="middle" fill="#364055" fontWeight="600">{label}</text></g>}
          </g>
        );
      })}
      {all.map((x) => {
        const s = STYLE[x.kind] || STYLE.step;
        const top = x.y - x.h / 2;
        return (
          <g key={x.id}>
            <rect x={x.x - x.w / 2} y={top} width={x.w} height={x.h} rx={s.rx} fill={s.fill} stroke={s.stroke} strokeWidth="1.6" strokeDasharray={s.dash} />
            {x.lines.map((l, i) => <text key={i} x={x.x} y={top + 22 + i * 16} fontSize="13" fontWeight="700" textAnchor="middle" fill={s.text}>{l}</text>)}
            {x.subLines.map((l, i) => <text key={`s${i}`} x={x.x} y={top + 22 + x.lines.length * 16 + i * 13 + 1} fontSize="10.5" textAnchor="middle" fill={s.text} opacity=".8" fontFamily={x.kind === 'api' ? 'ui-monospace, Consolas, monospace' : undefined}>{l}</text>)}
          </g>
        );
      })}
    </svg>
  );
}

// ------------------------------------------------------------ diagrams
export const DIAGRAMS = [
  {
    id: 'roles', title: '1. Roles and hierarchy', text: 'NuevaTech (Super Admin) is the third-party provider that runs and supports the system. The Owner heads Hope and sets the business and money rules. Admins run operations; Managers lead teams of Agents and approve their listings. Finance and Content Editor are support roles. Customers have separate accounts. Every role name and permission is editable (Roles & permissions).',
    nodes: [
      n('super', 2.5, 0, 'Super Admin', 'NuevaTech · third-party system provider · support, integrations, confirms the fee payments', 'actor', 250),
      n('owner', 2.5, 1, 'Owner', 'Head of Hope · runs the business, sets commission and NuevaTech fee rules', 'start', 250),
      n('admin', 1, 2, 'Admin', 'operations, listings, people, CMS'), n('fin', 2.5, 2, 'Finance', 'payments, commissions, billing'), n('ed', 4, 2, 'Content Editor', 'website & app content'),
      n('m1', 0.5, 3, 'Manager', 'Team Metro Manila · approves team listings'), n('m2', 2.5, 3, 'Manager', 'Team Cavite & Laguna'),
      n('a1', 0, 4, 'Agent', 'posts listings, leads', 'step', 150), n('a2', 1, 4, 'Agent', '', 'step', 150), n('a3', 2, 4, 'Agent', '', 'step', 150), n('a4', 3, 4, 'Agent', '', 'step', 150),
      n('cust', 4.5, 3.6, 'Customers', 'buyers, tenants, owners · website & app', 'note', 200),
    ],
    edges: [['super', 'owner'], ['owner', 'admin'], ['owner', 'fin'], ['owner', 'ed'], ['admin', 'm1'], ['admin', 'm2'], ['m1', 'a1'], ['m1', 'a2'], ['m2', 'a3'], ['m2', 'a4']],
  },
  {
    id: 'system', title: '2. How the system fits together', text: 'One backend and one database serve the public website, the customer portal, the staff portal and the mobile app (customer and agent modes) through one versioned JSON API. Integrations are plug and play from Settings.',
    nodes: [
      n('web', 0, 0, 'Public website', 'guests & share links'), n('cp', 1, 0, 'Customer portal', 'web'), n('capp', 2, 0, 'Mobile app', 'customer mode'), n('aapp', 3, 0, 'Mobile app', 'agent / manager mode'), n('sp', 4, 0, 'Staff portal', 'all staff roles'),
      n('api', 2, 1.2, 'Hope API /api/v1', '/public · /customer · /admin — JSON envelope, tokens, permissions, audit', 'actor', 820),
      n('m1', 0, 2.5, 'Listings & approvals', '', 'step', 160), n('m2', 1, 2.5, 'Leads & viewings', '', 'step', 160), n('m3', 2, 2.5, 'Deals, payments, receipts', '', 'step', 160), n('m4', 3, 2.5, 'Commissions & NuevaTech billing', '', 'step', 160), n('m5', 4, 2.5, 'CMS, settings, audit, security', '', 'step', 160),
      n('db', 0.5, 3.8, 'Database (MySQL)', 'one source of truth', 'note', 200), n('i1', 2, 3.8, 'PayMongo · Semaphore SMS · Mailjet', '', 'api', 250), n('i2', 3.6, 3.8, 'Firebase push · Google Maps · S3 · Meta', '', 'api', 270),
    ],
    groups: [{ label: 'Integrations (plug and play)', x: X0 + 1.2 * CW, y: Y0 + 3.3 * RH, w: 3.3 * CW, h: 100 }],
    edges: [['web', 'api'], ['cp', 'api'], ['capp', 'api'], ['aapp', 'api'], ['sp', 'api'], ['api', 'm1'], ['api', 'm2'], ['api', 'm3'], ['api', 'm4'], ['api', 'm5']],
  },
  {
    id: 'listing', title: '3. Listing lifecycle (who posts, who approves)', text: 'Agents post; a Manager of the same team (or Admin, Owner, Super Admin) approves. Nobody approves their own listing unless allowed in Settings. Every step and every edited field is written to the audit log. Deleting moves the listing to Trash with a reason (restorable).',
    nodes: [
      n('draft', 0, 0.3, 'Draft', 'agent creates (web or app)', 'start'), n('pend', 1.5, 0.3, 'Pending approval', 'Manager notified', 'decision'), n('pub', 3, 0.3, 'Published', 'website · app · share links', 'end'),
      n('res', 4.5, 0.3, 'Reserved', 'deal created'), n('sold', 4.5, 2, 'Sold / Rented', 'deal closed', 'end'),
      n('chg', 1.5, 2, 'Changes requested', 'reason sent to the agent', 'bad'), n('rej', 0.2, 2, 'Rejected', 'reason required', 'bad'),
      n('arc', 3, 2, 'Archived / Expired', 'taken down or validity ended', 'note'),
      n('trash', 1.5, 3.3, 'Trash', 'any status · reason required · Owner alerted · restore anytime', 'bad', 300),
    ],
    edges: [['draft', 'pend', 'submit'], ['pend', 'pub', 'approve'], ['pub', 'res', 'reserve'], ['res', 'sold', 'close deal'], ['pend', 'chg', 'request changes', (b) => { const q = b.pend; const c = b.chg; const y1 = q.y + q.h / 2; const y2 = c.y - c.h / 2; return { d: `M${q.x},${y1} V${y2}`, lx: q.x, ly: y2 - 22 }; }], ['chg', 'pend', 'edit & resubmit', (b) => { const a = b.chg; const q = b.pend; const x1 = a.x + a.w / 2; const X = x1 + 26; const yb = q.y + q.h / 2; return { d: `M${x1},${a.y} H${X} V${yb + 24} H${q.x + 40} V${yb}`, lx: X, ly: (a.y + yb + 24) / 2 }; }], ['pend', 'rej', 'reject'], ['pub', 'arc', 'archive / expire'], ['arc', 'pub', 'publish again', 'right'], ['res', 'pub', 'deal cancelled', 'top'], ['pub', 'pend', 'price / title / photos edited', 'top']],
  },
  {
    id: 'pipeline', title: '4. From inquiry to closed deal', text: 'Anyone can view; interacting needs an account. The agent answers within the response time, holds viewings and negotiates. A deal reserves the listing; when the documents are done a Manager closes it, which locks the computation and creates the commissions and the NuevaTech fee.',
    nodes: [
      n('g', 0, 0, 'Guest views listing', 'website · app · share link'), n('acc', 1, 0, 'Has an account?', '', 'decision', 150), n('sign', 1, 1, 'Create account', 'mobile + one-time code', 'step', 150),
      n('inq', 2, 0, 'Inquiry · New', 'POST /customer/inquiries', 'api'), n('rep', 3, 0, 'Agent replies', 'Contacted · within 24 h'), n('view', 4, 0, 'Viewing', 'requested → confirmed → done'), n('neg', 5, 0, 'Negotiating', '', 'step', 150),
      n('deal', 5, 1.9, 'Deal · Reserved', 'listing Reserved · reservation receipt', 'start'), n('docs', 4, 1.9, 'Processing documents', 'checklist seen by the customer'), n('close', 3, 1.9, 'Manager closes deal', '', 'decision'),
      n('lock', 2, 1.9, 'Computation locked', 'listing Sold / Rented', 'end'), n('comm', 1, 3.1, 'Commission vouchers', 'paid after Hope collects', 'step'), n('fee', 2.6, 3.1, 'NuevaTech platform fee', 'added to this month', 'step'),
      n('lost', 4.5, 3.1, 'Lost / cancelled', 'reason required · listing back to Published', 'bad', 220),
    ],
    edges: [['g', 'acc'], ['acc', 'inq', 'yes'], ['acc', 'sign', 'no'], ['sign', 'inq', '', 'hv'], ['inq', 'rep'], ['rep', 'view'], ['view', 'neg'], ['neg', 'deal', 'reserve'], ['deal', 'docs'], ['docs', 'close'], ['close', 'lock'], ['lock', 'comm'], ['lock', 'fee'], ['docs', 'lost', 'cancel']],
  },
  {
    id: 'billing', title: '6. NuevaTech billing cycle', text: 'Hope (the company) pays NuevaTech, the third-party system provider, for every successful deal, at the fee the Owner set (default, category rule or per deal). The fee is added automatically when a deal closes (or when Hope collects its commission – setting). NuevaTech issues a monthly Statement of Account; the Owner pays and uploads the proof; the Super Admin confirms and issues the official receipt.',
    nodes: [
      n('c', 0, 0, 'Deal closed', 'by Manager / Owner', 'start'), n('f', 1, 0, 'Platform fee', 'unbilled · basis & rate locked'), n('s', 2, 0, 'Statement of Account', 'on the 1st · Owner & Finance notified', 'actor'),
      n('p', 3, 0, 'Owner / Finance pays', 'bank / GCash + reference + proof', 'api'), n('q', 4, 0, 'NuevaTech confirms?', '', 'decision', 150), n('or', 5, 0, 'Official receipt', 'fees Paid', 'end', 150),
      n('ret', 4, 1.4, 'Returned', 'reason sent to the Owner', 'bad', 150), n('od', 2, 1.4, 'Past due date', 'shown as Overdue on dashboards', 'note'),
    ],
    edges: [['c', 'f'], ['f', 's'], ['s', 'p'], ['p', 'q'], ['q', 'or', 'yes'], ['q', 'ret', 'no'], ['ret', 'p', 'pay again', 'hv'], ['s', 'od', '', 'dash']],
  },
  {
    id: 'staffauth', title: '7. Staff sign-in (password + authenticator), same as SJCMPC', text: 'Staff enter the password, then a 6-digit code from Google / Microsoft Authenticator (or a recovery code). "Remember this device" skips the code for 30 days. Three failures lock the account for 15 minutes; a second lockout within 24 hours flags it until a higher rank unlocks it with a reason. All numbers are in Settings → Security.',
    nodes: [
      n('e', 0, 0, 'Email + password', 'POST /admin/auth/login', 'start'), n('l', 1, 0, 'Locked or flagged?', '', 'decision', 150), n('pw', 2, 0, 'Password correct?', '', 'decision', 150), n('tr', 3, 0, 'Trusted device?', '', 'decision', 150),
      n('code', 4, 0, 'Authenticator code', 'first time: scan QR + save recovery codes', 'api'), n('ok', 5, 0, 'Signed in', 'token + permissions', 'end', 150),
      n('msg', 1, 1.4, 'Show lock message', '', 'bad', 150), n('fail', 2.5, 1.4, 'Count failure', 'password, code or PIN', 'bad', 160),
      n('lk', 2.5, 2.6, 'Locked 15 minutes', 'after 3 failures in 30 min', 'bad', 170), n('fl', 4, 2.6, 'Flagged (hard lock)', '2nd lock in 24 h · Owner & Super Admin alerted', 'bad', 200), n('un', 5.4, 2.6, 'Higher rank unlocks', 'reason required (audit)', 'step', 160),
    ],
    edges: [['e', 'l'], ['l', 'pw', 'no'], ['l', 'msg', 'yes'], ['pw', 'tr', 'yes'], ['pw', 'fail', 'no'], ['tr', 'code', 'no'], ['tr', 'ok', 'yes', 'top'], ['code', 'ok'], ['code', 'fail', 'wrong'], ['fail', 'lk', 'limit'], ['lk', 'fl', 'again'], ['fl', 'un']],
  },
  {
    id: 'mobileauth', title: '8. Mobile app start, PIN and fingerprint / face sign-in', text: 'After a password sign-in the app offers PIN or biometrics. The server returns a random device key once; the app stores it AES-256-GCM encrypted in the Keychain / Keystore (for biometrics, with a key that unlocks only after the face / fingerprint check). The server keeps only an HMAC of the key, tied to the device ID. Wrong PINs count toward the lockout; 5 wrong PINs, 30 days without the password, or a password change revoke the key.',
    nodes: [
      n('st', 0, 0, 'App launch', 'GET /public/app-config', 'start'), n('mt', 1, 0, 'Maintenance or update needed?', '', 'decision', 160), n('key', 2, 0, 'Device key in secure storage?', '', 'decision', 160),
      n('lock', 3, 0, 'Lock screen', 'Face ID / fingerprint, or PIN keypad'), n('dl', 4, 0, 'Device sign-in', 'POST /customer/auth/device/login', 'api'), n('home', 5, 0, 'Home', 'signed in', 'end', 150),
      n('ms', 1, 1.4, 'Maintenance / update screen', 'store link', 'bad', 160), n('wel', 2, 1.4, 'Welcome', 'sign in · register · guest', 'step', 160), n('wr', 4, 1.4, 'Wrong PIN', 'counts toward account lockout', 'bad', 170),
      n('rv', 5.25, 1.4, 'Key revoked', '5 wrong PINs · 30 days · password changed', 'bad', 160),
      n('pw', 2, 2.7, 'Password sign-in', 'POST /customer/auth/login', 'api', 170), n('off', 3, 2.7, 'Offer quick sign-in', 'PIN or Face ID / fingerprint', 'step', 160), n('en', 4.3, 2.7, 'Enable on this phone', 'POST …/device/enable → store key encrypted', 'api', 210),
    ],
    edges: [['st', 'mt'], ['mt', 'key', 'no'], ['mt', 'ms', 'yes'], ['key', 'lock', 'yes'], ['key', 'wel', 'no'], ['lock', 'dl'], ['dl', 'home', 'ok'], ['dl', 'wr', 'wrong PIN'], ['wr', 'rv', 'limit'], ['wel', 'pw'], ['rv', 'pw', 'use password', 'bottom'], ['pw', 'off'], ['off', 'en', 'turn on'], ['en', 'home', '', (b) => { const a = b.en; const h = b.home; const X = b.rv.x + b.rv.w / 2 + 24; return { d: `M${a.x + a.w / 2},${a.y} H${X} V${h.y} H${h.x + h.w / 2}`, lx: X, ly: a.y }; }]],
  },
  {
    id: 'share', title: '9. Share links and the account gate', text: 'Anyone can share a listing. The link is tracked (?ch=facebook, messenger, viber, link, qr). It opens the app if installed (App Links / Universal Links), otherwise the website. Guests see photos, price and city but not the agent\'s number or exact address; asking, saving or booking needs an account. The inquiry keeps the channel, so Analytics shows which shares bring buyers.',
    nodes: [
      n('a', 0, 0, 'Tap Share', 'agent, customer or staff', 'start'), n('api', 1, 0, 'Tracked link', 'POST /public/listings/{id}/share', 'api'), n('post', 2, 0, 'Facebook · Messenger · Viber · QR flyer', '', 'step', 180),
      n('inst', 3, 0, 'App installed?', '', 'decision', 150), n('app', 4, 0, 'Opens in the app', 'deep link /l/{slug}'), n('web', 4, 1.25, 'Opens the website', '/l/{slug}?ch=…'),
      n('g', 5.2, 0.6, 'Guest view', 'contact & exact address hidden', 'note', 170), n('t', 5.2, 2, 'Ask / save / book?', '', 'decision', 160),
      n('acc', 3.9, 2.6, 'Sign in or register', 'ACCOUNT_REQUIRED', 'bad', 170), n('inq', 2.6, 2.6, 'Inquiry', 'source = share channel', 'api', 160), n('ag', 1.3, 2.6, 'Agent notified', 'push + email', 'step', 150), n('an', 0, 2.6, 'Analytics', 'leads by channel', 'end', 140),
    ],
    edges: [['a', 'api'], ['api', 'post'], ['post', 'inst'], ['inst', 'app', 'yes'], ['inst', 'web', 'no', 'vh'], ['app', 'g', '', 'hv'], ['web', 'g', '', 'hv'], ['g', 't'], ['t', 'acc', 'guest', 'vh'], ['acc', 'inq'], ['inq', 'ag'], ['ag', 'an']],
  },
  {
    id: 'submission', title: '10. Owners: “Sell or lease with Hope”', text: 'Owners submit their property or vehicle from the website or app. A Manager assigns an agent, who calls the owner, signs the Authority to Sell / Lease, takes photos and converts the submission into a draft listing, which then follows the normal approval flow.',
    nodes: [
      n('s', 0, 0, 'Owner submits', 'POST /customer/submissions', 'start'), n('m', 1, 0, 'Manager assigns an agent', '', 'decision'), n('c', 2, 0, 'Agent contacts owner', 'Authority to Sell / Lease, photos'),
      n('d', 3, 0, 'Convert to draft listing', ''), n('ap', 4, 0, 'Approval flow', 'diagram 3', 'note'), n('p', 5, 0, 'Published', 'owner notified', 'end', 150), n('x', 1, 1.4, 'Declined', 'reason sent to the owner', 'bad'),
    ],
    edges: [['s', 'm'], ['m', 'c'], ['c', 'd'], ['d', 'ap'], ['ap', 'p'], ['m', 'x', 'decline']],
  },
];

function Computation() {
  const { state } = useStore();
  const sale = { type: 'sale', group: 'property', category: 'house_lot', price: 5000000, unit: 'total' };
  const c = computeDeal(sale, state.settings, { hasManager: true });
  const rent = { type: 'rent', group: 'property', category: 'condo', price: 30000, unit: 'month', leaseMonths: 12 };
  const r = computeDeal(rent, state.settings, { hasManager: true });
  const nodes = [
    n('p', 0, 1, 'Selling price', pesoCents(sale.price), 'start'), n('g', 1.3, 1, 'Hope\'s commission', `${c.basis} = ${pesoCents(c.gross)} · paid by the seller`, 'actor', 200),
    n('a', 2.8, 0, 'Agent share', `${c.agentPct}% = ${pesoCents(c.agentShare)}`), n('m', 2.8, 1, 'Manager override', `${c.managerPct}% = ${pesoCents(c.managerShare)}`), n('h', 2.8, 2, 'Hope\'s share', pesoCents(c.hopeShare), 'step'),
    n('f', 4.2, 2, 'NuevaTech fee', `${c.platformBasis} = ${pesoCents(c.platformFee)}`, 'bad', 190), n('net', 4.2, 0.9, 'Hope net', pesoCents(c.hopeNet), 'end', 170),
  ];
  return (
    <>
      <Flow title="Commission computation" nodes={nodes} edges={[['p', 'g'], ['g', 'a', '', 'vh'], ['g', 'm'], ['g', 'h', '', 'vh'], ['h', 'f', 'Hope pays'], ['h', 'net', '−', 'hv']]} />
      <div className="grid2" style={{ marginTop: 12 }}>
        <div><b>₱5,000,000 house sale</b><ComputationTable c={c} deal={sale} /></div>
        <div><b>₱30,000 / month lease (12 months)</b><ComputationTable c={r} deal={rent} /></div>
      </div>
      <p className="mini">Live numbers from the current Settings (Commission & splits, NuevaTech platform fee). The NuevaTech fee is set by the Owner: a default, rules per category (e.g. vehicles 3%), or a fee on one deal; each can be a percent of Hope's commission, a percent of the deal price or a fixed amount.</p>
    </>
  );
}

function ApiTable({ items, mobileOnly }) {
  return (
    <div className="table-wrap"><table className="t api-t"><thead><tr><th style={{ width: 80 }}>Method</th><th>Endpoint</th><th>What it does</th><th>Access</th></tr></thead><tbody>
      {items.filter((i) => !mobileOnly || i.mobile).map((i) => (
        <tr key={i.id}><td><span className={`m-${i.method.toLowerCase()}`}>{i.method}</span></td><td><code>{i.path}</code>{i.mobile && <span className="badge info" style={{ marginLeft: 6 }}>app</span>}
          {(i.body || i.response) && <details><summary className="mini">Example</summary>{i.body && <pre>{JSON.stringify(i.body, null, 2)}</pre>}{i.response && <pre>{JSON.stringify(i.response, null, 2)}</pre>}</details>}</td>
          <td className="mini" style={{ color: 'var(--ink-2)' }}>{i.summary}</td><td className="mini">{i.auth}{i.perm ? <><br /><code>{i.perm}</code></> : ''}</td></tr>
      ))}
    </tbody></table></div>
  );
}

export default function Flows() {
  const [mobileOnly, setMobileOnly] = useState(false);
  return (
    <>
      <DemoBar />
      <div className="flows">
        <aside className="flows-toc">
          <Logo />
          <p className="mini" style={{ marginTop: 10 }}>For the mobile developer and the proposal. The same diagrams are in <span className="mono">docs/</span>.</p>
          <b className="mini">Flowcharts</b>
          {DIAGRAMS.slice(0, 4).map((d) => <a key={d.id} href={`#${d.id}`}>{d.title}</a>)}
          <a href="#computation">5. Commission computation</a>
          {DIAGRAMS.slice(4).map((d) => <a key={d.id} href={`#${d.id}`}>{d.title}</a>)}
          <b className="mini" style={{ marginTop: 10 }}>API for the app</b>
          <a href="#api">Conventions</a><a href="#screens">Mobile screens tracker</a><a href="#errors">Error codes</a><a href="#push">Push notifications</a><a href="#endpoints">All {API_COUNT} endpoints</a>
          <Link to="/mobile" className="btn soft sm" style={{ marginTop: 12 }}><Icon name="smartphone" />Phone simulator</Link>
        </aside>
        <main className="flows-main">
          <h1>Hope: flowcharts & API</h1>
          <p className="muted">How the system works, step by step. Boxes: <span className="lg-k start">start</span> <span className="lg-k step">step</span> <span className="lg-k decision">decision</span> <span className="lg-k api">API call</span> <span className="lg-k bad">stop / error</span> <span className="lg-k end">result</span></p>
          {DIAGRAMS.slice(0, 4).map((d) => <section key={d.id} id={d.id} className="card flow-card" ><h2>{d.title}</h2><p>{d.text}</p><div className="shot-pad" data-shot={`flow-${d.id}`}><Flow {...d} /></div></section>)}
          <section id="computation" className="card flow-card" ><h2>5. Commission computation</h2><p>Hope's commission is paid by the seller / owner. It is split between the agent, the team Manager and Hope; Hope pays the NuevaTech platform fee out of its share. A deal keeps the rates it had when it was closed.</p><div className="shot-pad" data-shot="flow-computation"><Computation /></div></section>
          {DIAGRAMS.slice(4).map((d) => <section key={d.id} id={d.id} className="card flow-card" ><h2>{d.title}</h2><p>{d.text}</p><div className="shot-pad" data-shot={`flow-${d.id}`}><Flow {...d} /></div></section>)}

          <section id="api" className="card flow-card">
            <h2>API conventions</h2>
            <p>Base URL <code>{API_BASE}</code>. JSON in and out. Same conventions as the SJCMPC backend.</p>
            <div className="grid3">{Object.entries(PORTALS).map(([k, p]) => <div key={k} className="note"><b className="mono">{p.prefix}</b><div className="mini">{p.who}</div></div>)}</div>
            <h3 style={{ marginTop: 16 }}>Headers</h3>
            <table className="t"><tbody>{HEADERS.map(([h, d]) => <tr key={h}><td className="mono nowrap">{h}</td><td className="mini">{d}</td></tr>)}</tbody></table>
            <h3 style={{ marginTop: 16 }}>Response envelope</h3>
            <div className="grid2"><pre className="code">{JSON.stringify({ success: true, message: 'OK', data: { '…': '…' }, meta: { page: 1, per_page: 20, total: 31 } }, null, 2)}</pre><pre className="code">{JSON.stringify({ success: false, message: 'Too many failed sign-in attempts…', error: { code: 'AUTH_LOCKED', details: { minutes_left: 14 } }, errors: null }, null, 2)}</pre></div>
          </section>
          <section id="screens" className="card flow-card">
            <h2>Mobile screens tracker</h2>
            <p>Build in milestone order (M1 → M3). Each screen lists the endpoints it uses (see below). A spreadsheet copy is in <span className="mono">docs/Hope-Mobile-Tracker.csv</span>.</p>
            <div className="table-wrap"><table className="t"><thead><tr><th>#</th><th>App</th><th>Screen</th><th>What it does</th><th>Endpoints</th><th>Milestone</th></tr></thead><tbody>
              {MOBILE_SCREENS.map(([id, app, screen, what, eps, ms]) => <tr key={id}><td className="mono">{id}</td><td>{app}</td><td><b>{screen}</b></td><td className="mini">{what}</td><td className="mini mono">{eps.split(', ').map((e) => (apiById[e] ? `${apiById[e].method} ${apiById[e].path}` : e)).join('\n').split('\n').map((x) => <div key={x}>{x}</div>)}</td><td><span className="badge brand">{ms}</span></td></tr>)}
            </tbody></table></div>
          </section>
          <section id="errors" className="card flow-card">
            <h2>Error codes</h2>
            <p>Switch on <code>error.code</code>, not on the message.</p>
            <table className="t"><thead><tr><th>Code</th><th>HTTP</th><th>What the app should do</th></tr></thead><tbody>{ERROR_CODES.map(([c, h, d]) => <tr key={c}><td className="mono">{c}</td><td>{h}</td><td className="mini">{d}</td></tr>)}</tbody></table>
          </section>
          <section id="push" className="card flow-card">
            <h2>Push notifications (Firebase)</h2>
            <p>Payload: <code>{'{ type, title, body, data }'}</code>. Tapping opens the screen in the last column.</p>
            <table className="t"><thead><tr><th>type</th><th>To</th><th>When</th><th>data</th><th>Opens</th></tr></thead><tbody>{PUSH_TYPES.map(([t, to, w, d, o]) => <tr key={t}><td className="mono">{t}</td><td>{to}</td><td className="mini">{w}</td><td className="mono mini">{d}</td><td className="mini">{o}</td></tr>)}</tbody></table>
          </section>
          <section id="endpoints" className="card flow-card">
            <div className="row between"><h2>All endpoints ({API_COUNT})</h2><label className="check"><input type="checkbox" checked={mobileOnly} onChange={(e) => setMobileOnly(e.target.checked)} />Only what the mobile app uses</label></div>
            {API.map((g) => <div key={g.group} style={{ marginTop: 14 }}><h3>{g.group} <span className="mini mono">{PORTALS[g.portal].prefix}</span></h3><ApiTable items={g.items} mobileOnly={mobileOnly} /></div>)}
          </section>
        </main>
      </div>
    </>
  );
}
