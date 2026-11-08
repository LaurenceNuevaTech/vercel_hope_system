import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import Icon from '../lib/icons.jsx';
import { audit, useStore } from '../lib/store.jsx';
import { checkPassword, ensureCanAttempt, passwordProblem, recordFailure } from '../lib/auth.js';
import { DEMO_OTP, DEMO_PASSWORD } from '../lib/catalog.js';
import { DemoCredentials, Field, ResetDataButton } from '../components.jsx';

const CUSTOMER_DEMOS = [
  { label: 'Ana Cruz', note: 'saved listings, inquiries, viewing, receipts', email: 'customer@demo.test' },
  { label: 'Joanna Perez', note: 'has a reservation', email: 'joanna.perez@mail.test' },
  { label: 'Mark Dizon', note: 'past buyer', email: 'mark.dizon@mail.test' },
];

function AuthShell({ title, sub, children, side }) {
  return (
    <div className="auth-page wrap">
      <div className="auth-card card">
        <h1>{title}</h1>
        {sub && <p className="muted">{sub}</p>}
        {children}
      </div>
      {side && <div className="auth-side">{side}</div>}
    </div>
  );
}

export function CustomerLogin() {
  const { state, update, toast } = useStore();
  const nav = useNavigate();
  const [sp] = useSearchParams();
  const [login, setLogin] = useState('');
  const [pw, setPw] = useState('');
  const [err, setErr] = useState('');
  const next = sp.get('next') || '/account';

  const submit = (e) => {
    e.preventDefault();
    const res = update((d) => {
      const key = login.trim().toLowerCase().replace(/\s/g, '');
      const c = d.customers.find((x) => x.email.toLowerCase() === key || x.mobile.replace(/\s/g, '') === key);
      if (!c) { audit(d, 'auth.login.failed', `Unknown customer ${login}`, { severity: 'warning', channel: 'web' }); return 'The email / mobile or password is incorrect.'; }
      const blocked = ensureCanAttempt(d, c);
      if (blocked) return blocked;
      if (!checkPassword(c, pw)) return recordFailure(d, c, 'password', 'web');
      c.failed = 0; c.lastLoginAt = new Date().toISOString();
      d.customerSession = { customerId: c.id, at: new Date().toISOString() };
      audit(d, 'auth.login', `${c.name} signed in (website)`, { actor: { type: 'customer', id: c.id, name: c.name, role: null }, channel: 'web' });
      return null;
    });
    if (res) setErr(res); else { toast('Welcome back!'); nav(next); }
  };

  return (
    <AuthShell title="Sign in" sub="Ask agents, save listings, book viewings and see your receipts."
      side={<><DemoCredentials accounts={CUSTOMER_DEMOS} password={DEMO_PASSWORD} onPick={(e) => { setLogin(e); setPw(DEMO_PASSWORD); setErr(''); }} extra=" · One-time code for new accounts: " /><span className="mono mini"> {DEMO_OTP}</span>
        <div className="note" style={{ marginTop: 12 }}>Lockout test: 3 wrong passwords lock the account for 15 minutes; a second lockout within 24 hours flags it (Settings → Security).</div>
        <div style={{ marginTop: 12 }}><ResetDataButton /></div></>}>
      <form className="stack" onSubmit={submit}>
        <Field label="Email or mobile number"><input value={login} onChange={(e) => setLogin(e.target.value)} autoComplete="username" required /></Field>
        <Field label="Password"><input type="password" value={pw} onChange={(e) => setPw(e.target.value)} autoComplete="current-password" required /></Field>
        {err && <div className="note bad">{err}</div>}
        <button className="btn lg" type="submit">Sign in</button>
        <div className="row between mini"><Link to="/forgot">Forgot password?</Link><span>New here? <Link to={`/register${sp.get('next') ? `?next=${encodeURIComponent(next)}` : ''}`}>Create an account</Link></span></div>
        <div className="mini" style={{ textAlign: 'center' }}>On the phone app you can also sign in with a PIN or fingerprint / face. <Link to="/mobile">Try it</Link></div>
      </form>
    </AuthShell>
  );
}

export function CustomerRegister() {
  const { state, update, toast } = useStore();
  const nav = useNavigate();
  const [sp] = useSearchParams();
  const [f, setF] = useState({ name: '', email: '', mobile: '', password: '', privacy: false });
  const [step, setStep] = useState('form');
  const [code, setCode] = useState('');
  const [err, setErr] = useState('');
  const set = (k) => (e) => setF({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value });
  const next = sp.get('next') || '/account';

  const submit = (e) => {
    e.preventDefault();
    if (state.customers.some((c) => c.email.toLowerCase() === f.email.trim().toLowerCase())) { setErr('This email already has an account. Please sign in.'); return; }
    const p = passwordProblem(state.settings, f.password);
    if (p) { setErr(p); return; }
    if (!f.privacy) { setErr('Please accept the privacy notice.'); return; }
    setErr(''); setStep('otp');
    toast(`SMS to ${f.mobile}: Your Hope code is ${DEMO_OTP}. It expires in ${state.settings.security.otp.expiryMinutes} minutes.`, 'code');
  };
  const verify = (e) => {
    e.preventDefault();
    if (code.trim() !== DEMO_OTP) { setErr('The code is incorrect.'); return; }
    update((d) => {
      const c = { id: `c${Date.now().toString(36)}`, name: f.name.trim(), email: f.email.trim().toLowerCase(), mobile: f.mobile.trim(), password: f.password, status: 'active', verified: true, createdAt: new Date().toISOString(), favourites: [], failed: 0, lockedUntil: null, lockCount: 0, lastLockAt: null, source: 'web', lastLoginAt: new Date().toISOString() };
      d.customers.unshift(c);
      d.customerSession = { customerId: c.id, at: new Date().toISOString() };
      audit(d, 'customer.registered', `${c.name} created an account (mobile verified)`, { actor: { type: 'customer', id: c.id, name: c.name, role: null }, channel: 'web' });
    });
    toast('Account created. Welcome to Hope!');
    nav(next);
  };

  if (step === 'otp') {
    return (
      <AuthShell title="Enter the code" sub={`We sent a ${state.settings.security.otp.length}-digit code to ${f.mobile}.`} side={<div className="note">Demo: the SMS appears as a green message at the bottom of the screen. Code <b className="mono">{DEMO_OTP}</b>.</div>}>
        <form className="stack" onSubmit={verify}>
          <Field label="One-time code"><input className="otp-in" value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))} inputMode="numeric" autoFocus /></Field>
          {err && <div className="note bad">{err}</div>}
          <button className="btn lg" type="submit">Verify and create account</button>
          <button type="button" className="btn link" onClick={() => toast(`SMS: Your Hope code is ${DEMO_OTP}.`, 'code')}>Send a new code</button>
        </form>
      </AuthShell>
    );
  }
  return (
    <AuthShell title="Create your free account" sub="Message agents, save listings, book viewings and pay online." side={<div className="note">Password rules come from Settings → Security → Password policy (now: at least {state.settings.security.password.minLength} characters with upper / lower case, a number and a symbol). Example: <span className="mono">{DEMO_PASSWORD}</span></div>}>
      <form className="stack" onSubmit={submit}>
        <Field label="Full name"><input value={f.name} onChange={set('name')} required /></Field>
        <div className="grid2">
          <Field label="Email"><input type="email" value={f.email} onChange={set('email')} required /></Field>
          <Field label="Mobile number"><input value={f.mobile} onChange={set('mobile')} placeholder="09XX XXX XXXX" required /></Field>
        </div>
        <Field label="Password"><input type="password" value={f.password} onChange={set('password')} required /></Field>
        <label className="check"><input type="checkbox" checked={f.privacy} onChange={set('privacy')} /><span>I agree to the <Link to="/p/terms" target="_blank">terms</Link> and the <Link to="/p/privacy" target="_blank">privacy notice</Link> (Data Privacy Act of 2012).</span></label>
        {err && <div className="note bad">{err}</div>}
        <button className="btn lg" type="submit">Continue<Icon name="right" /></button>
        <div className="mini" style={{ textAlign: 'center' }}>Already have an account? <Link to="/login">Sign in</Link></div>
      </form>
    </AuthShell>
  );
}

export function ForgotPassword() {
  const { toast } = useStore();
  const [sent, setSent] = useState(false);
  return (
    <AuthShell title="Reset your password" sub="We will send a one-time code to your mobile number or email.">
      {sent ? <div className="note ok">If the account exists, a code was sent. In the real system you enter it with a new password; PIN and biometric sign-in on your phones are turned off for safety.</div> : (
        <form className="stack" onSubmit={(e) => { e.preventDefault(); setSent(true); toast(`SMS: Your Hope reset code is ${DEMO_OTP}.`, 'code'); }}>
          <Field label="Email or mobile number"><input required /></Field>
          <button className="btn lg" type="submit">Send code</button>
        </form>
      )}
      <p className="mini" style={{ marginTop: 12 }}><Link to="/login">Back to sign in</Link></p>
    </AuthShell>
  );
}
