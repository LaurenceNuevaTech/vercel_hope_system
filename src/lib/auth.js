// Sign-in rules (same as the SJCMPC system) and permission checks.
//   1. every wrong password / authenticator code / PIN counts; failures older than the window are forgotten
//   2. reaching the limit locks the account for the lock duration (even the right password is refused)
//   3. locking again within the flag window flags the account: a hard lock until a higher rank unlocks it
import { DEMO_MFA, DEMO_PASSWORD } from './catalog.js';
import { audit, notify } from './store.jsx';

export function lockState(acc, now = Date.now()) {
  if (acc.status === 'flagged') return 'flagged';
  if (acc.status === 'deactivated') return 'deactivated';
  if (acc.lockedUntil && new Date(acc.lockedUntil).getTime() > now) return 'locked';
  return 'active';
}

export const minutesLeft = (acc) => Math.max(1, Math.ceil((new Date(acc.lockedUntil).getTime() - Date.now()) / 60000));

/** Returns an error message or null. Mutates draft. */
export function ensureCanAttempt(draft, acc) {
  const s = lockState(acc);
  const lock = draft.settings.security.lockout;
  if (s === 'flagged') {
    audit(draft, 'auth.login.blocked', `Sign-in refused: ${acc.email} is flagged`, { actor: { type: 'guest', id: null, name: 'Guest', role: null }, severity: 'warning' });
    return lock.flaggedMessage;
  }
  if (s === 'deactivated') return 'This account is deactivated. Please contact Hope.';
  if (s === 'locked') {
    audit(draft, 'auth.login.blocked', `Sign-in refused: ${acc.email} is locked`, { actor: { type: 'guest', id: null, name: 'Guest', role: null }, severity: 'warning' });
    return lock.lockedMessage.replace(':minutes', minutesLeft(acc));
  }
  if (acc.lockedUntil) acc.lockedUntil = null;
  return null;
}

/** Count a failed attempt; returns the message to show. kind: password | mfa | pin | otp */
export function recordFailure(draft, acc, kind = 'password', channel = 'admin') {
  const lock = draft.settings.security.lockout;
  const now = Date.now();
  const max = Number(lock.maxAttempts);
  const guest = { type: 'guest', id: null, name: 'Guest', role: null };
  if (acc.lastFailedAt && now - new Date(acc.lastFailedAt).getTime() > Number(lock.windowMinutes) * 60000) acc.failed = 0;
  acc.failed = (acc.failed || 0) + 1;
  acc.lastFailedAt = new Date(now).toISOString();
  const what = { password: 'Incorrect password', mfa: 'Incorrect authenticator code', pin: 'Incorrect PIN', otp: 'Incorrect one-time code' }[kind];
  audit(draft, 'auth.login.failed', `${what} for ${acc.email}`, { actor: guest, severity: 'warning', channel });

  if (acc.failed < max) {
    const left = max - acc.failed;
    const noun = kind === 'password' ? 'email or password' : kind === 'pin' ? 'PIN' : 'code';
    return `The ${noun} you entered is incorrect.${lock.showRemaining ? ` ${left} attempt${left === 1 ? '' : 's'} left before the account is locked.` : ''}`;
  }

  const recent = acc.lastLockAt && now - new Date(acc.lastLockAt).getTime() < Number(lock.flagWindowHours) * 3600000;
  acc.lockCount = recent ? (acc.lockCount || 0) + 1 : 1;
  acc.lastLockAt = new Date(now).toISOString();
  acc.failed = 0;

  if (acc.lockCount >= Number(lock.flagAfterLocks)) {
    acc.status = 'flagged';
    acc.flaggedAt = new Date(now).toISOString();
    acc.lockedUntil = null;
    audit(draft, 'auth.account.flagged', `${acc.email} flagged for suspicious sign-in activity. Owner and Super Admin alerted.`, { actor: { type: 'system', id: null, name: 'System', role: null }, severity: 'critical' });
    if (draft.settings.security.alerts.flagged) {
      draft.staff.filter((s) => ['super_admin', 'owner'].includes(s.role)).forEach((s) => notify(draft, { type: 'staff', id: s.id }, 'Account flagged', `${acc.email} was flagged after repeated failed sign-ins.`, '/admin/staff'));
    }
    return lock.flaggedMessage;
  }
  acc.lockedUntil = new Date(now + Number(lock.lockMinutes) * 60000).toISOString();
  audit(draft, 'auth.account.locked', `${acc.email} locked for ${lock.lockMinutes} minutes`, { actor: { type: 'system', id: null, name: 'System', role: null }, severity: 'warning' });
  return lock.lockedMessage.replace(':minutes', lock.lockMinutes);
}

export const checkPassword = (acc, pw) => pw === (acc.password || DEMO_PASSWORD);
export const checkMfa = (code) => String(code).replace(/\s/g, '') === DEMO_MFA;

/** Password policy from Settings → Security. Returns an error or null. */
export function passwordProblem(settings, pw) {
  const p = settings.security.password;
  if (pw.length < Number(p.minLength)) return `Use at least ${p.minLength} characters.`;
  if (p.mixedCase && !(/[a-z]/.test(pw) && /[A-Z]/.test(pw))) return 'Use upper and lower case letters.';
  if (p.numbers && !/\d/.test(pw)) return 'Add a number.';
  if (p.symbols && !/[^A-Za-z0-9]/.test(pw)) return 'Add a symbol (e.g. ! @ #).';
  return null;
}

/** PIN rules from Settings → Security → PIN & biometric. */
export function pinProblem(settings, pin) {
  const d = settings.security.device;
  const len = Number(d.pinLength);
  if (!new RegExp(`^\\d{${len}}$`).test(pin)) return `The PIN must be ${len} digits.`;
  if (d.blockSimple && (new Set(pin).size === 1 || '01234567890'.includes(pin) || '09876543210'.includes(pin))) return 'Choose a PIN that is harder to guess (not the same digit or a sequence).';
  return null;
}

// ---------------------------------------------------------------- permissions
export function can(state, perm, who) {
  const s = who || (state.staffSession && state.staff.find((x) => x.id === state.staffSession.staffId));
  if (!s) return false;
  const perms = state.roles[s.role]?.perms || [];
  return perms.includes('*') || perms.includes(perm);
}

export const rank = (state, role) => state.roles[role]?.rank ?? 0;

/** 'all' | 'team' | 'own' – how much of an area the signed-in staff member sees. */
export function scope(state, area, who) {
  const s = who || state.staff.find((x) => x.id === state.staffSession?.staffId);
  if (!s) return 'own';
  const c = (p) => can(state, p, s);
  if (area === 'listings') return c('listings.view_all') ? 'all' : c('listings.view_team') ? 'team' : 'own';
  if (area === 'leads') return c('leads.view_all') ? 'all' : c('leads.view_team') ? 'team' : 'own';
  if (area === 'deals') return c('deals.view_all') ? 'all' : (c('listings.view_team') || c('leads.view_team')) ? 'team' : 'own';
  if (area === 'commissions') return c('commissions.view_all') ? 'all' : 'own';
  return 'own';
}

/** Filter records (with agentId / teamId) to what the signed-in staff member may see. */
export function visible(state, area, rows) {
  const s = state.staff.find((x) => x.id === state.staffSession?.staffId);
  if (!s) return [];
  const sc = scope(state, area, s);
  if (sc === 'all') return rows;
  if (sc === 'team') return rows.filter((r) => r.agentId === s.id || r.staffId === s.id || (s.teamId && r.teamId === s.teamId));
  return rows.filter((r) => r.agentId === s.id || r.staffId === s.id || r.createdBy === s.id);
}

/** May `actor` approve this listing? Managers: own team; never your own unless allowed in Settings. */
export function canApprove(state, listing, actor) {
  const a = actor || state.staff.find((x) => x.id === state.staffSession?.staffId);
  if (!a || !can(state, 'listings.approve', a)) return false;
  if (listing.agentId === a.id && !state.settings.listings.workflow.selfApproval && a.role !== 'super_admin') return false;
  if (scope(state, 'listings', a) === 'team') return listing.teamId === a.teamId;
  return true;
}

/** Who may manage / unlock whom: a higher rank, never yourself. Super Admins only by Super Admins. */
export function canManage(state, actor, target) {
  if (!actor || !target || actor.id === target.id) return false;
  if (target.role === 'super_admin') return actor.role === 'super_admin';
  return rank(state, actor.role) > rank(state, target.role);
}
