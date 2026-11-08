// Phone simulator: shows how the Hope mobile app works (customer and agent),
// including PIN and fingerprint / face sign-in. The endpoints behind each step are
// documented in /flows (no API details are shown on this page).
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import Icon from '../lib/icons.jsx';
import { audit, useStore } from '../lib/store.jsx';
import { can, checkMfa, checkPassword, ensureCanAttempt, pinProblem, recordFailure } from '../lib/auth.js';
import { approveListing, createInquiry, recordShare, replyInquiry, requestViewing, reviewListing, saveListing } from '../lib/actions.js';
import { coverPhoto, listingPhotos } from '../lib/art.js';
import { DEMO_MFA, DEMO_PASSWORD, DEMO_PIN, LEAD_STAGES, LISTING_STATUS } from '../lib/catalog.js';
import { fmtDate, fmtDateTime, peso, priceLabel, priceShort, timeAgo } from '../lib/format.js';
import { Avatar, Badge, LogoMark, shareUrl } from '../components.jsx';
import { DemoBar } from '../site/SiteApp.jsx';
import { PayOnline } from '../site/Account.jsx';

const newDevice = () => ({ deviceId: `dev-${Math.random().toString(36).slice(2, 10)}`, deviceName: 'iPhone 15 (simulator)', platform: 'ios', session: null, keystore: {}, keyOwner: null });

export default function MobileSim() {
  const { state, update } = useStore();
  const [route, setRoute] = useState({ name: 'splash' });
  const [stack, setStack] = useState([]);
  const [sheet, setSheet] = useState(null);
  const [bioPrompt, setBioPrompt] = useState(null);
  const phone = state.phone || newDevice();
  useEffect(() => { if (!state.phone) update((d) => { d.phone = newDevice(); }); }, [state.phone, update]);

  // Marks where the real app calls the API (endpoints are documented in /flows). Nothing is shown here.
  const api = () => {};
  const go = (name, params = {}) => { setStack((s) => [...s, route]); setRoute({ name, params }); };
  const back = () => setStack((s) => { const p = s[s.length - 1]; if (p) setRoute(p); return s.slice(0, -1); });
  const reset = (name, params = {}) => { setStack([]); setRoute({ name, params }); };
  const setPhone = (fn) => update((d) => { d.phone = d.phone || newDevice(); fn(d.phone, d); });
  /** Run an action as the phone's signed-in user, with the audit channel "mobile". */
  const asUser = (fn) => update((d) => {
    const s = d.phone?.session; const keepS = d.staffSession; const keepC = d.customerSession;
    if (s?.type === 'staff') d.staffSession = { staffId: s.id }; if (s?.type === 'customer') d.customerSession = { customerId: s.id };
    d.__channel = 'mobile'; d.__device = `Hope app · ${d.phone.deviceName}`;
    try { return fn(d); } finally { d.staffSession = keepS; d.customerSession = keepC; delete d.__channel; delete d.__device; }
  });

  const user = phone.session?.type === 'customer' ? state.customers.find((c) => c.id === phone.session.id) : phone.session?.type === 'staff' ? state.staff.find((s) => s.id === phone.session.id) : null;
  const ctx = { state, phone, user, api, go, back, reset, setPhone, asUser, setSheet, setBioPrompt, route, canBack: stack.length > 0 };

  const relaunch = () => {
    api('app.config', { note: 'App opened: check maintenance, minimum version, sign-in options' });
    const hasKey = phone.keystore.pin || phone.keystore.biometric;
    reset(hasKey ? 'lock' : phone.session ? 'home' : 'welcome');
    setSheet(null);
  };
  useEffect(() => { if (route.name === 'splash' && state.phone) { const t = setTimeout(relaunch, 900); return () => clearTimeout(t); } return undefined; }, [route.name, state.phone]); // eslint-disable-line react-hooks/exhaustive-deps

  const creds = state.deviceCredentials.filter((c) => c.deviceId === phone.deviceId);
  return (
    <>
      <DemoBar />
      <div className="msim">
        <div className="msim-left">
          <div className="msim-tools">
            <button type="button" className="btn ghost sm" onClick={() => { setRoute({ name: 'splash' }); setStack([]); setSheet(null); }}><Icon name="refresh" />Close & reopen app</button>
            <button type="button" className="btn ghost sm" onClick={() => { setPhone((p, d) => { d.deviceCredentials.filter((c) => c.deviceId === p.deviceId && !c.revokedAt).forEach((c) => { c.revokedAt = new Date().toISOString(); c.revokedReason = 'app_uninstalled'; }); Object.assign(p, newDevice()); }); setRoute({ name: 'splash' }); setStack([]); }}><Icon name="trash" />Uninstall app</button>
          </div>
          <div className="phone">
            <div className="phone-notch" />
            <div className="phone-status"><span>9:41</span><span className="row" style={{ gap: 4 }}><Icon name="activity" size={12} /><Icon name="wallet" size={12} /></span></div>
            <div className="phone-screen">
              <Screen ctx={ctx} />
              {sheet && <div className="m-sheet-bg" onClick={() => setSheet(null)}><div className="m-sheet" onClick={(e) => e.stopPropagation()}>{sheet}</div></div>}
              {bioPrompt && <BioPrompt {...bioPrompt} onClose={() => setBioPrompt(null)} />}
            </div>
            <div className="phone-home" />
          </div>
          <p className="mini" style={{ textAlign: 'center', maxWidth: 380 }}>Device ID <span className="mono">{phone.deviceId}</span>. Changes made here appear on the website and staff portal (same data).</p>
        </div>
        <div className="msim-right">
          <div className="card card-pad row between">
            <div><h3 style={{ margin: 0 }}>How the app works</h3><p className="mini" style={{ margin: '4px 0 0' }}>Step-by-step flowcharts and the API reference for the mobile developer.</p></div>
            <Link to="/flows" className="btn soft sm"><Icon name="flow" />Flowcharts &amp; full API</Link>
          </div>
          <div className="card card-pad">
            <h3>This phone's secure storage (Keychain / Keystore)</h3>
            <dl className="kv">
              <dt>Signed in</dt><dd>{user ? `${user.name} (${phone.session.type})` : 'No'}</dd>
              <dt>PIN key</dt><dd>{phone.keystore.pin ? <span className="mono">{phone.keystore.pin.secret.slice(0, 10)}… (AES-GCM)</span> : '—'}</dd>
              <dt>Biometric key</dt><dd>{phone.keystore.biometric ? <span className="mono">{phone.keystore.biometric.secret.slice(0, 10)}… (unlocks after face / fingerprint)</span> : '—'}</dd>
            </dl>
            <h4 style={{ margin: '12px 0 6px' }}>Server: device credentials for this phone</h4>
            {creds.length ? creds.map((c) => <div key={c.id} className="mini row between" style={{ padding: '4px 0', borderTop: '1px solid var(--line-2)' }}><span>{c.method} · {c.owner.type} {c.owner.id} · failed {c.failed}</span><Badge tone={c.revokedAt ? 'bad' : 'ok'}>{c.revokedAt ? `revoked: ${c.revokedReason}` : `valid until ${fmtDate(c.expiresAt)}`}</Badge></div>) : <p className="mini">None. The server stores only an HMAC of each key, tied to the device ID.</p>}
          </div>
          <div className="card card-pad">
            <h3>Try these</h3>
            <ol className="mini try">
              <li>Sign in as <b>customer@demo.test</b> / <span className="mono">{DEMO_PASSWORD}</span>, turn on a PIN (e.g. <span className="mono">{DEMO_PIN}</span>) and biometrics.</li>
              <li>Press <b>Close & reopen app</b>: the lock screen asks for the face / fingerprint or the PIN.</li>
              <li>Enter wrong PINs: each counts toward the account lockout ({state.settings.security.lockout.maxAttempts} → locked {state.settings.security.lockout.lockMinutes} min, same rule as passwords); after {state.settings.security.device.maxPinAttempts} wrong PINs the PIN key is revoked and the password is needed. Reset the data to try again.</li>
              <li>Browse as a guest, open a listing, tap <b>Ask</b>: the app asks you to create an account.</li>
              <li>Agent app: <b>Staff / agent sign-in</b> → agent@hope.test, code <span className="mono">{DEMO_MFA}</span>: leads, replies, new listing → goes to approval. manager@hope.test can approve from the phone.</li>
            </ol>
          </div>
        </div>
      </div>
    </>
  );
}

function BioPrompt({ title, onOk, onFail, onClose }) {
  const [st, setSt] = useState('scan');
  return (
    <div className="bio-bg">
      <div className="bio">
        <div className={`bio-ico ${st}`}><Icon name={st === 'fail' ? 'x' : st === 'ok' ? 'check' : 'face'} size={46} /></div>
        <b>{st === 'fail' ? 'Not recognized' : 'Face ID'}</b>
        <span>{title}</span>
        <div className="bio-btns">
          <button type="button" onClick={() => { setSt('ok'); setTimeout(() => { onClose(); onOk(); }, 450); }}>Simulate match</button>
          <button type="button" onClick={() => { setSt('fail'); setTimeout(() => { onClose(); onFail?.(); }, 650); }}>Simulate no match</button>
          <button type="button" onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

function Screen({ ctx }) {
  const { route, state } = ctx;
  if (state.settings.system.maintenance.on && route.name !== 'splash') return <div className="m-center"><LogoMark size={60} logo={state.settings.brand.identity.logo} /><h3>Under maintenance</h3><p className="mini">{state.settings.system.maintenance.message}</p></div>;
  const S = SCREENS[route.name] || Splash;
  return <S ctx={ctx} {...route.params} />;
}

function Splash({ ctx }) {
  const b = ctx.state.settings.brand.identity;
  return <div className="m-splash"><LogoMark size={96} logo={b.logo} light /><b>{b.name}</b><small>{b.tagline}</small><i>{b.slogan}</i></div>;
}

function Top({ ctx, title, right }) {
  return <div className="m-top">{ctx.canBack ? <button type="button" className="m-icon" onClick={ctx.back} aria-label="Back"><Icon name="left" /></button> : <span style={{ width: 34 }} />}<b>{title}</b>{right || <span style={{ width: 34 }} />}</div>;
}

function Welcome({ ctx }) {
  const b = ctx.state.settings.brand.identity;
  return (
    <div className="m-welcome">
      <div className="m-welcome-art"><LogoMark size={96} logo={b.logo} light /><h2>{b.fullName}</h2><i>{b.slogan}</i><p>Homes, condos, lots and vehicles from verified agents.</p></div>
      <div className="m-pad stack">
        <button type="button" className="btn lg block" onClick={() => ctx.go('login')}>Sign in</button>
        <button type="button" className="btn soft lg block" onClick={() => ctx.go('register')}>Create account</button>
        <button type="button" className="btn link block" onClick={() => { ctx.api('cms.home'); ctx.reset('home'); }}>Browse as guest</button>
        <button type="button" className="btn link block mini" onClick={() => ctx.go('staffLogin')}><Icon name="briefcase" />Staff / agent sign-in</button>
      </div>
    </div>
  );
}

function Login({ ctx }) {
  const [login, setLogin] = useState('customer@demo.test');
  const [pw, setPw] = useState(DEMO_PASSWORD);
  const [err, setErr] = useState('');
  const submit = () => {
    const res = ctx.asUser((d) => {
      const c = d.customers.find((x) => x.email === login.trim().toLowerCase() || x.mobile.replace(/\s/g, '') === login.replace(/\s/g, ''));
      if (!c) return { err: 'The email / mobile or password is incorrect.', code: 'AUTH_INVALID_CREDENTIALS' };
      const blocked = ensureCanAttempt(d, c);
      if (blocked) return { err: blocked, code: c.status === 'flagged' ? 'AUTH_FLAGGED' : 'AUTH_LOCKED' };
      if (!checkPassword(c, pw)) return { err: recordFailure(d, c, 'password', 'mobile'), code: 'AUTH_INVALID_CREDENTIALS' };
      c.failed = 0; c.lastLoginAt = new Date().toISOString();
      d.phone.session = { type: 'customer', id: c.id, at: new Date().toISOString() };
      audit(d, 'auth.login', `${c.name} signed in (app, password)`, { actor: { type: 'customer', id: c.id, name: c.name, role: null } });
      return { ok: true };
    });
    if (res.err) { setErr(res.err); ctx.api('c.login', { status: res.code === 'AUTH_INVALID_CREDENTIALS' ? 401 : 423, body: { login, password: '••••••••' }, response: { success: false, message: res.err, error: { code: res.code } } }); return; }
    ctx.api('c.login', { body: { login, password: '••••••••' } });
    ctx.reset('home');
    offerQuickSignIn(ctx);
  };
  return (
    <div className="m-page">
      <Top ctx={ctx} title="Sign in" />
      <div className="m-pad stack">
        <label className="field"><span>Email or mobile</span><input value={login} onChange={(e) => setLogin(e.target.value)} /></label>
        <label className="field"><span>Password</span><input type="password" value={pw} onChange={(e) => setPw(e.target.value)} /></label>
        {err && <div className="note bad">{err}</div>}
        <button type="button" className="btn lg block" onClick={submit}>Sign in</button>
        <p className="mini">Sample: customer@demo.test / {DEMO_PASSWORD}</p>
      </div>
    </div>
  );
}

function offerQuickSignIn(ctx) {
  const d = ctx.state.settings.security.device;
  if (!d.pin && !d.biometric) return;
  if (ctx.phone.session?.type === 'staff' && !d.staffApp) return;
  setTimeout(() => ctx.setSheet(<QuickSignInSheet ctx={ctx} />), 300);
}

function QuickSignInSheet({ ctx }) {
  const d = ctx.state.settings.security.device;
  return (
    <div className="stack" style={{ textAlign: 'center' }}>
      <div className="m-big-ico"><Icon name="fingerprint" size={40} /></div>
      <b>Sign in faster next time</b>
      <p className="mini">Use a {d.pinLength}-digit PIN or your face / fingerprint instead of the password. You can change this in Profile → Security.</p>
      {d.biometric && <button type="button" className="btn block" onClick={() => { ctx.setSheet(null); enableBiometric(ctx); }}><Icon name="face" />Use Face ID / fingerprint</button>}
      {d.pin && <button type="button" className="btn soft block" onClick={() => { ctx.setSheet(null); ctx.go('setPin'); }}><Icon name="key" />Set a PIN</button>}
      <button type="button" className="btn link block" onClick={() => ctx.setSheet(null)}>Not now</button>
    </div>
  );
}

function enableDevice(ctx, method, pin) {
  const secret = Array.from(crypto.getRandomValues(new Uint8Array(24))).map((b) => b.toString(16).padStart(2, '0')).join('');
  ctx.setPhone((p, d) => {
    const days = Number(d.settings.security.device.passwordEveryDays);
    d.deviceCredentials.filter((c) => c.deviceId === p.deviceId && c.method === method && !c.revokedAt).forEach((c) => { c.revokedAt = new Date().toISOString(); c.revokedReason = 'replaced'; });
    const cred = { id: `dc${Date.now().toString(36)}`, owner: { type: p.session.type, id: p.session.id }, method, deviceId: p.deviceId, deviceName: p.deviceName, platform: p.platform, secret, pin: method === 'pin' ? pin : null, failed: 0, createdAt: new Date().toISOString(), expiresAt: days > 0 ? new Date(Date.now() + days * 864e5).toISOString() : null, revokedAt: null, revokedReason: null, lastUsedAt: null };
    d.deviceCredentials.push(cred);
    p.keystore[method] = { credentialId: cred.id, secret };
    p.keyOwner = { ...p.session };
    const who = p.session.type === 'customer' ? d.customers.find((c) => c.id === p.session.id) : d.staff.find((s) => s.id === p.session.id);
    audit(d, 'auth.device_sign_in_enabled', `${method === 'pin' ? 'PIN' : 'Biometric'} sign-in turned on (${p.deviceName})`, { actor: { type: p.session.type, id: who.id, name: who.name, role: who.role || null }, channel: 'mobile' });
  });
  ctx.api(ctx.phone.session?.type === 'staff' ? 's.device' : 'c.device.enable', { body: { method, password: '••••••••', ...(method === 'pin' ? { pin: '••••••' } : {}) }, response: { success: true, data: { device_secret: `${secret.slice(0, 12)}… (store encrypted, shown once)`, credential: { method, device_name: ctx.phone.deviceName } } } });
}

function enableBiometric(ctx) {
  ctx.setBioPrompt({ title: 'Confirm to turn on Face ID sign-in', onOk: () => enableDevice(ctx, 'biometric') });
}

function Keypad({ len, value, onChange, onDone, extra }) {
  const press = (k) => { if (k === 'del') onChange(value.slice(0, -1)); else if (value.length < len) { const v = value + k; onChange(v); if (v.length === len) setTimeout(() => onDone(v), 150); } };
  return (
    <div>
      <div className="pin-dots">{Array.from({ length: len }, (_, i) => <i key={i} className={i < value.length ? 'on' : ''} />)}</div>
      <div className="keypad">{['1', '2', '3', '4', '5', '6', '7', '8', '9', 'x', '0', 'del'].map((k) => k === 'x' ? (extra || <span key={k} />) : <button type="button" key={k} onClick={() => press(k)}>{k === 'del' ? <Icon name="backspace" /> : k}</button>)}</div>
    </div>
  );
}

function SetPin({ ctx }) {
  const len = Number(ctx.state.settings.security.device.pinLength);
  const [first, setFirst] = useState(null);
  const [v, setV] = useState('');
  const [err, setErr] = useState('');
  const done = (pin) => {
    if (!first) {
      const p = pinProblem(ctx.state.settings, pin);
      if (p) { setErr(p); setV(''); return; }
      setFirst(pin); setV(''); setErr('');
    } else if (pin !== first) { setErr('PINs do not match. Try again.'); setFirst(null); setV(''); } else { enableDevice(ctx, 'pin', pin); ctx.back(); }
  };
  return (
    <div className="m-page">
      <Top ctx={ctx} title="Set PIN" />
      <div className="m-pad" style={{ textAlign: 'center' }}>
        <p><b>{first ? 'Enter the PIN again' : `Choose a ${len}-digit PIN`}</b></p>
        <p className="mini">{ctx.state.settings.security.device.blockSimple ? 'Not the same digit or a sequence (e.g. 111111, 123456).' : ''}</p>
        {err && <div className="note bad">{err}</div>}
        <Keypad len={len} value={v} onChange={setV} onDone={done} />
      </div>
    </div>
  );
}

function deviceLogin(ctx, method, pin) {
  const key = ctx.phone.keystore[method];
  const res = ctx.asUser((d) => {
    const cred = d.deviceCredentials.find((c) => c.id === key.credentialId && c.secret === key.secret && c.deviceId === d.phone.deviceId);
    if (!cred) return { code: 'AUTH_INVALID_CREDENTIALS', err: 'Unknown device key.' };
    if (cred.revokedAt || (cred.expiresAt && new Date(cred.expiresAt) < new Date())) {
      delete d.phone.keystore[method];
      return { code: 'DEVICE_SIGN_IN_OFF', err: `Please sign in with your password. You can turn ${method === 'pin' ? 'PIN' : 'face / fingerprint'} sign-in on again afterwards.`, off: true };
    }
    const acc = cred.owner.type === 'customer' ? d.customers.find((c) => c.id === cred.owner.id) : d.staff.find((s) => s.id === cred.owner.id);
    const blocked = ensureCanAttempt(d, acc);
    if (blocked) return { code: 'AUTH_LOCKED', err: blocked };
    if (method === 'pin' && pin !== cred.pin) {
      cred.failed += 1;
      const max = Number(d.settings.security.device.maxPinAttempts);
      let revoked = false;
      if (cred.failed >= max) { cred.revokedAt = new Date().toISOString(); cred.revokedReason = 'too_many_wrong_pins'; delete d.phone.keystore.pin; revoked = true; audit(d, 'auth.device_sign_in_revoked', `PIN sign-in turned off on ${d.phone.deviceName} after ${max} wrong PINs`, { severity: 'warning', actor: { type: 'system', id: null, name: 'System', role: null } }); }
      const msg = recordFailure(d, acc, 'pin', 'mobile');
      return { code: 'PIN_INVALID', err: revoked ? `Too many wrong PINs. PIN sign-in was turned off on this phone. ${msg}` : msg, revoked, left: max - cred.failed };
    }
    cred.failed = 0; cred.lastUsedAt = new Date().toISOString(); acc.failed = 0; acc.lastLoginAt = new Date().toISOString();
    d.phone.session = { ...cred.owner, at: new Date().toISOString() };
    audit(d, 'auth.login', `${acc.name} signed in (app, ${method === 'pin' ? 'PIN' : 'face / fingerprint'})`, { actor: { type: cred.owner.type, id: acc.id, name: acc.name, role: acc.role || null } });
    return { ok: true };
  });
  const id = ctx.phone.keyOwner?.type === 'staff' ? 's.device' : 'c.device.login';
  if (res.ok) { ctx.api(id, { body: { method, device_secret: `${key.secret.slice(0, 12)}…`, ...(pin ? { pin: '••••••' } : {}) }, response: { success: true, data: { token: 'eyJ…', expires_in: 2592000 } }, note: 'Sign in with the device key from secure storage' }); ctx.reset('home'); }
  else ctx.api(id, { status: res.code === 'PIN_INVALID' || res.code === 'DEVICE_SIGN_IN_OFF' ? 401 : 423, body: { method, device_secret: `${key.secret.slice(0, 12)}…`, ...(pin ? { pin: '••••••' } : {}) }, response: { success: false, message: res.err, error: { code: res.code, details: res.revoked != null ? { revoked: res.revoked, attempts_left: res.left } : {} } } });
  return res;
}

function Lock({ ctx }) {
  const { phone, state } = ctx;
  const len = Number(state.settings.security.device.pinLength);
  const [mode, setMode] = useState(phone.keystore.biometric ? 'bio' : 'pin');
  const [v, setV] = useState('');
  const [err, setErr] = useState('');
  const owner = phone.keyOwner?.type === 'staff' ? state.staff.find((s) => s.id === phone.keyOwner.id) : state.customers.find((c) => c.id === phone.keyOwner?.id);
  const tried = useRef(false);
  const bio = () => ctx.setBioPrompt({ title: `Sign in to ${state.settings.brand.identity.name}`, onOk: () => { const r = deviceLogin(ctx, 'biometric'); if (r.err) setErr(r.err); }, onFail: () => setErr('Face / fingerprint not recognized. Try again or use your PIN.') });
  useEffect(() => { if (mode === 'bio' && phone.keystore.biometric && !tried.current) { tried.current = true; setTimeout(bio, 400); } }, []); // eslint-disable-line react-hooks/exhaustive-deps
  if (!phone.keystore.pin && !phone.keystore.biometric) {
    return <div className="m-center"><Icon name="lock" size={40} /><p>{err || 'Quick sign-in is off on this phone.'}</p><button type="button" className="btn" onClick={() => ctx.reset(phone.keyOwner?.type === 'staff' ? 'staffLogin' : 'login')}>Sign in with password</button></div>;
  }
  return (
    <div className="m-lock">
      <Avatar name={owner?.name} size="lg" />
      <b>Welcome back, {owner?.name.split(' ')[0]}</b>
      {err && <div className="note bad" style={{ margin: '8px 16px' }}>{err}</div>}
      {mode === 'pin' && phone.keystore.pin ? (
        <Keypad len={len} value={v} onChange={setV} onDone={(pin) => { setV(''); const r = deviceLogin(ctx, 'pin', pin); if (r.err) setErr(r.err); }} extra={phone.keystore.biometric ? <button type="button" key="bio" onClick={bio}><Icon name="face" /></button> : null} />
      ) : (
        <div className="stack" style={{ marginTop: 24 }}>
          <button type="button" className="m-bio-btn" onClick={bio}><Icon name="face" size={44} /><span>Tap to use Face ID</span></button>
          {phone.keystore.pin && <button type="button" className="btn link" onClick={() => setMode('pin')}>Use PIN</button>}
        </div>
      )}
      <button type="button" className="btn link mini" onClick={() => ctx.reset(phone.keyOwner?.type === 'staff' ? 'staffLogin' : 'login')}>Use password instead</button>
    </div>
  );
}

function Register({ ctx }) {
  const [step, setStep] = useState(1);
  const [f, setF] = useState({ name: '', email: '', mobile: '', password: DEMO_PASSWORD });
  const [code, setCode] = useState('');
  return (
    <div className="m-page">
      <Top ctx={ctx} title="Create account" />
      <div className="m-pad stack">
        {step === 1 ? <>
          {[['name', 'Full name'], ['email', 'Email'], ['mobile', 'Mobile number'], ['password', 'Password']].map(([k, l]) => <label key={k} className="field"><span>{l}</span><input type={k === 'password' ? 'password' : 'text'} value={f[k]} onChange={(e) => setF({ ...f, [k]: e.target.value })} /></label>)}
          <label className="check mini"><input type="checkbox" defaultChecked />I agree to the terms and privacy notice</label>
          <button type="button" className="btn lg block" disabled={!f.name || !f.email || !f.mobile} onClick={() => { ctx.api('c.register', { body: { ...f, password: '••••••••', accept_privacy: true } }); setStep(2); }}>Continue</button>
        </> : <>
          <p>Enter the code sent to <b>{f.mobile}</b>.</p>
          <div className="note">SMS: Your Hope code is <b className="mono">246810</b>.</div>
          <input className="input otp-in" value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))} />
          <button type="button" className="btn lg block" disabled={code !== '246810'} onClick={() => {
            ctx.asUser((d) => { const c = { id: `c${Date.now().toString(36)}`, name: f.name, email: f.email.toLowerCase(), mobile: f.mobile, password: f.password, status: 'active', verified: true, createdAt: new Date().toISOString(), favourites: [], failed: 0, lockedUntil: null, lockCount: 0, lastLockAt: null, source: 'mobile', lastLoginAt: new Date().toISOString() }; d.customers.unshift(c); d.phone.session = { type: 'customer', id: c.id }; audit(d, 'customer.registered', `${c.name} created an account in the app`, { actor: { type: 'customer', id: c.id, name: c.name, role: null } }); });
            ctx.api('c.verify', { body: { challenge_token: 'otp_…', code } }); ctx.reset('home'); offerQuickSignIn(ctx);
          }}>Verify</button>
        </>}
      </div>
    </div>
  );
}

function StaffLogin({ ctx }) {
  const [email, setEmail] = useState('agent@hope.test');
  const [pw, setPw] = useState(DEMO_PASSWORD);
  const [code, setCode] = useState('');
  const [step, setStep] = useState(1);
  const [err, setErr] = useState('');
  const pass = () => {
    const res = ctx.asUser((d) => {
      const s = d.staff.find((x) => x.email === email.trim().toLowerCase());
      if (!s) return { err: 'The email or password is incorrect.' };
      const b = ensureCanAttempt(d, s); if (b) return { err: b };
      if (!checkPassword(s, pw)) return { err: recordFailure(d, s, 'password', 'mobile') };
      return { ok: true };
    });
    ctx.api('s.login', { body: { email, password: '••••••••' }, ...(res.err ? { status: 401, response: { success: false, message: res.err, error: { code: 'AUTH_INVALID_CREDENTIALS' } } } : {}) });
    if (res.err) setErr(res.err); else { setErr(''); setStep(2); }
  };
  const mfa = () => {
    const res = ctx.asUser((d) => {
      const s = d.staff.find((x) => x.email === email.trim().toLowerCase());
      if (!checkMfa(code)) return { err: recordFailure(d, s, 'mfa', 'mobile') };
      s.failed = 0; s.lastLoginAt = new Date().toISOString(); d.phone.session = { type: 'staff', id: s.id };
      audit(d, 'auth.login', `${s.name} signed in (app, password + authenticator code)`, { actor: { type: 'staff', id: s.id, name: s.name, role: s.role } });
      return { ok: true };
    });
    ctx.api('s.mfa', { body: { challenge_token: 'mfa_…', code, remember_device: true }, ...(res.err ? { status: 401, response: { success: false, message: res.err, error: { code: 'MFA_INVALID' } } } : {}) });
    if (res.err) setErr(res.err); else { ctx.reset('home'); offerQuickSignIn(ctx); }
  };
  return (
    <div className="m-page">
      <Top ctx={ctx} title="Staff sign-in" />
      <div className="m-pad stack">
        {step === 1 ? <>
          <label className="field"><span>Email</span><input value={email} onChange={(e) => setEmail(e.target.value)} /></label>
          <label className="field"><span>Password</span><input type="password" value={pw} onChange={(e) => setPw(e.target.value)} /></label>
          <div className="chips">{['agent@hope.test', 'manager@hope.test', 'agent4@hope.test'].map((e) => <button type="button" key={e} className="chip" onClick={() => setEmail(e)}>{e}</button>)}</div>
          {err && <div className="note bad">{err}</div>}
          <button type="button" className="btn lg block" onClick={pass}>Continue</button>
        </> : <>
          <div className="row"><span className="mfa-ico"><Icon name="shield" /></span><p className="mini" style={{ margin: 0 }}>Enter the 6-digit code from your authenticator app (demo: {DEMO_MFA}).</p></div>
          <input className="input otp-in" value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))} autoFocus />
          {err && <div className="note bad">{err}</div>}
          <button type="button" className="btn lg block" onClick={mfa}>Verify</button>
        </>}
      </div>
    </div>
  );
}

// ------------------------------------------------------------ main app (tabs)
function Tabs({ ctx, active }) {
  const staff = ctx.phone.session?.type === 'staff';
  const tabs = staff
    ? [['home', 'Home', 'grid'], ['leads', 'Leads', 'message'], ['myListings', 'Listings', 'layers'], ...(can(ctx.state, 'listings.approve', ctx.user) ? [['approvals', 'Approve', 'verified']] : []), ['profile', 'Profile', 'user']]
    : [['home', 'Home', 'home'], ['browse', 'Search', 'search'], ['saved', 'Saved', 'heart'], ['inbox', 'Messages', 'message'], ['profile', 'Profile', 'user']];
  return <nav className="m-tabs">{tabs.map(([k, l, i]) => <button type="button" key={k} className={active === k ? 'on' : ''} onClick={() => ctx.reset(k)}><Icon name={i} /><span>{l}</span></button>)}</nav>;
}

function Shell({ ctx, tab, title, right, children }) {
  return <div className="m-page"><div className="m-top"><b style={{ marginLeft: 8 }}>{title}</b>{right || <span />}</div><div className="m-body">{children}</div><Tabs ctx={ctx} active={tab} /></div>;
}

function needAccount(ctx, reason) {
  ctx.api('c.inq.create', { status: 401, response: { success: false, message: 'Please sign in or create an account.', error: { code: 'ACCOUNT_REQUIRED' } }, note: `Guest tried to ${reason}` });
  ctx.setSheet(<div className="stack" style={{ textAlign: 'center' }}><div className="m-big-ico"><Icon name="lock" size={36} /></div><b>Create a free account</b><p className="mini">Guests can view listings. To {reason}, please sign in or create an account.</p><button type="button" className="btn block" onClick={() => { ctx.setSheet(null); ctx.go('register'); }}>Create account</button><button type="button" className="btn soft block" onClick={() => { ctx.setSheet(null); ctx.go('login'); }}>Sign in</button></div>);
}

function MCard({ l, ctx }) {
  return <button type="button" className="m-card" onClick={() => { ctx.api('listings.show'); ctx.go('listing', { id: l.id }); }}><img src={coverPhoto(l)} alt="" /><div><b>{priceShort(l)}</b><span>{l.title}</span><small>{l.condition === 'brand_new' ? '✦ Brand new · ' : l.condition === 'pre_selling' ? 'Pre-selling · ' : ''}{l.city}</small></div></button>;
}

function Home({ ctx }) {
  const { state, user, phone } = ctx;
  if (phone.session?.type === 'staff') return <AgentHome ctx={ctx} />;
  const live = state.listings.filter((l) => ['published', 'reserved'].includes(l.status) && !l.deleted);
  return (
    <Shell ctx={ctx} tab="home" title={user ? `Hi, ${user.name.split(' ')[0]}` : state.settings.brand.identity.fullName} right={!user && <button type="button" className="btn xs" onClick={() => ctx.go('login')}>Sign in</button>}>
      <div className="m-hero"><b>{state.cms.home.heroTitle.split('—')[0]}</b><button type="button" className="m-search" onClick={() => ctx.reset('browse')}><Icon name="search" />Search location, type, keyword</button></div>
      <div className="m-cats">{state.categories.filter((c) => c.active).map((c) => <button type="button" key={c.key} onClick={() => ctx.reset('browse', { category: c.key })}><span><Icon name={c.icon} /></span>{c.label}</button>)}</div>
      <h4 className="m-h">Featured</h4>
      <div className="m-hscroll">{live.filter((l) => l.featured).map((l) => <MCard key={l.id} l={l} ctx={ctx} />)}</div>
      <h4 className="m-h">New listings</h4>
      <div className="m-list">{live.slice(0, 6).map((l) => <MCard key={l.id} l={l} ctx={ctx} />)}</div>
    </Shell>
  );
}

function Browse({ ctx, category }) {
  const { state } = ctx;
  const [q, setQ] = useState('');
  const [p, setP] = useState('');
  const [cat, setCat] = useState(category || '');
  useEffect(() => { ctx.api('listings.search', { note: `GET /public/listings?${new URLSearchParams({ ...(p ? { purpose: p } : {}), ...(cat ? { category: cat } : {}), ...(q ? { q } : {}) })}` }); }, [p, cat]); // eslint-disable-line react-hooks/exhaustive-deps
  const rows = state.listings.filter((l) => ['published', 'reserved'].includes(l.status) && !l.deleted && (!p || l.purpose === p) && (!cat || l.category === cat) && (!q || `${l.title} ${l.city}`.toLowerCase().includes(q.toLowerCase())));
  return (
    <Shell ctx={ctx} tab="browse" title="Search">
      <div className="m-pad" style={{ paddingBottom: 0 }}>
        <label className="search-box"><Icon name="search" /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Keyword or city" /></label>
        <div className="chips" style={{ margin: '8px 0', flexWrap: 'nowrap', overflowX: 'auto' }}>{[['', 'All'], ['sale', 'Buy'], ['rent', 'Rent']].map(([k, t]) => <button type="button" key={k} className={`chip ${p === k ? 'on' : ''}`} onClick={() => setP(k)}>{t}</button>)}<select className="chip" value={cat} onChange={(e) => setCat(e.target.value)}><option value="">Any type</option>{state.categories.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}</select></div>
        <div className="mini">{rows.length} results</div>
      </div>
      <div className="m-list">{rows.map((l) => <MCard key={l.id} l={l} ctx={ctx} />)}</div>
    </Shell>
  );
}

function ListingScreen({ ctx, id }) {
  const { state, user, phone } = ctx;
  const l = state.listings.find((x) => x.id === id);
  const [i, setI] = useState(0);
  if (!l) return null;
  const photos = listingPhotos(l);
  const agent = state.staff.find((s) => s.id === l.agentId);
  const cust = phone.session?.type === 'customer' ? user : null;
  const fav = cust?.favourites.includes(l.id);
  const share = () => ctx.setSheet(
    <div className="stack"><b>Share</b><div className="m-share">{[['facebook', 'Facebook', 'facebook'], ['messenger', 'Messenger', 'messenger'], ['viber', 'Viber', 'phone'], ['link', 'Copy link', 'link'], ['qr', 'QR code', 'qr']].map(([ch, t, ic]) => <button type="button" key={ch} onClick={() => { ctx.asUser((d) => recordShare(d, l.id, ch)); ctx.api('listings.share', { body: { channel: ch }, response: { success: true, data: { url: shareUrl(l, ch) } } }); ctx.setSheet(null); }}><Icon name={ic} />{t}</button>)}</div><p className="mini">The app calls the share endpoint for a tracked link, then opens the phone's share sheet. Anyone can open it; asking needs an account.</p></div>,
  );
  return (
    <div className="m-page">
      <div className="m-gallery"><img src={photos[i]} alt="" onClick={() => setI((i + 1) % photos.length)} /><button type="button" className="m-icon over" onClick={ctx.back} aria-label="Back"><Icon name="left" /></button><span className="m-count">{i + 1}/{photos.length}</span></div>
      <div className="m-body m-pad">
        <div className="row" style={{ gap: 6 }}><Badge tone={l.purpose === 'rent' ? 'info' : 'solid'}>{l.purpose === 'rent' ? 'For rent' : 'For sale'}</Badge>{l.status === 'reserved' && <Badge tone="accent">Reserved</Badge>}{l.condition === 'brand_new' && <Badge tone="gold">Brand new</Badge>}{l.condition === 'pre_selling' && <Badge tone="info">Pre-selling</Badge>}</div>
        <h3 style={{ margin: '8px 0 2px' }}>{l.title}</h3>
        <div className="m-price">{priceLabel(l)}</div>
        <div className="mini"><Icon name="pin" size={13} /> {cust || state.settings.listings.sharing.guestSeesAddress ? l.address : `Brgy. ${l.barangay}, ${l.city}`}</div>
        <div className="m-specs">{Object.entries(l.specs).filter(([, v]) => v !== undefined && v !== '').slice(0, 6).map(([k, v]) => <span key={k}><small>{k.replace(/([A-Z])/g, ' $1')}</small><b>{String(v)}</b></span>)}</div>
        <p className="mini">{l.description}</p>
        <div className="row" style={{ marginTop: 8 }}><Avatar name={agent?.name} size="sm" /><div className="grow"><b>{agent?.name}</b><div className="mini">{cust ? agent?.phone : 'Sign in to see the number'}</div></div></div>
      </div>
      <div className="m-actions">
        <button type="button" className="m-icon" onClick={() => { if (!cust) { needAccount(ctx, 'save listings'); return; } ctx.asUser((d) => { const c = d.customers.find((x) => x.id === cust.id); c.favourites = fav ? c.favourites.filter((x) => x !== l.id) : [l.id, ...c.favourites]; }); ctx.api('c.fav.add', { note: fav ? 'DELETE /customer/favourites/{id}' : 'POST /customer/favourites/{id}' }); }}><Icon name="heart" style={fav ? { fill: '#E0245E', color: '#E0245E' } : null} /></button>
        <button type="button" className="m-icon" onClick={share}><Icon name="share" /></button>
        <button type="button" className="btn soft grow" onClick={() => (cust ? ctx.go('book', { id: l.id }) : needAccount(ctx, 'book a viewing'))}>Book viewing</button>
        <button type="button" className="btn grow" onClick={() => { if (!cust) { needAccount(ctx, 'message the agent'); return; } const q = ctx.asUser((d) => createInquiry(d, l.id, cust.id, 'Hi! Is this still available?', 'mobile')); ctx.api('c.inq.create', { body: { listing_id: l.id, message: 'Hi! Is this still available?', source: 'mobile' } }); ctx.go('thread', { id: q.id }); }}>Ask</button>
      </div>
    </div>
  );
}

function Book({ ctx, id }) {
  const [day, setDay] = useState(2);
  const [time, setTime] = useState('10:00');
  const l = ctx.state.listings.find((x) => x.id === id);
  return (
    <div className="m-page"><Top ctx={ctx} title="Book a viewing" />
      <div className="m-pad stack">
        <b>{l.title}</b>
        <div className="m-days">{[1, 2, 3, 4, 5, 6].map((n) => { const d = new Date(Date.now() + n * 864e5); return <button type="button" key={n} className={day === n ? 'on' : ''} onClick={() => setDay(n)}><small>{d.toLocaleDateString('en-PH', { weekday: 'short' })}</small><b>{d.getDate()}</b></button>; })}</div>
        <div className="chips">{['09:00', '10:00', '13:00', '15:00', '17:00'].map((t) => <button type="button" key={t} className={`chip ${time === t ? 'on' : ''}`} onClick={() => setTime(t)}>{t}</button>)}</div>
        <button type="button" className="btn lg block" onClick={() => { const at = new Date(Date.now() + day * 864e5); const [h, m] = time.split(':'); at.setHours(+h, +m, 0, 0); ctx.asUser((d) => requestViewing(d, id, ctx.user.id, at.toISOString(), '', 'mobile')); ctx.api('c.view.create', { body: { listing_id: id, at: at.toISOString(), note: '' } }); ctx.back(); ctx.setSheet(<div style={{ textAlign: 'center' }}><div className="m-big-ico ok"><Icon name="check" size={36} /></div><b>Viewing requested</b><p className="mini">You'll get a push notification when the agent confirms, and a reminder the day before.</p></div>); }}>Request viewing</button>
      </div>
    </div>
  );
}

function Saved({ ctx }) {
  const { state, user } = ctx;
  if (!user) return <Shell ctx={ctx} tab="saved" title="Saved"><GuestBox ctx={ctx} what="save listings" /></Shell>;
  return <Shell ctx={ctx} tab="saved" title="Saved"><div className="m-list">{user.favourites.map((id) => state.listings.find((l) => l.id === id)).filter(Boolean).map((l) => <MCard key={l.id} l={l} ctx={ctx} />)}</div></Shell>;
}

function GuestBox({ ctx, what }) {
  return <div className="m-center"><Icon name="lock" size={36} /><p>Sign in to {what}.</p><button type="button" className="btn" onClick={() => ctx.go('login')}>Sign in</button><button type="button" className="btn link" onClick={() => ctx.go('register')}>Create account</button></div>;
}

function Inbox({ ctx }) {
  const { state, user } = ctx;
  useEffect(() => { if (user) ctx.api('c.inq.list'); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  if (!user) return <Shell ctx={ctx} tab="inbox" title="Messages"><GuestBox ctx={ctx} what="message agents" /></Shell>;
  const rows = state.inquiries.filter((q) => q.customerId === user.id).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  return <Shell ctx={ctx} tab="inbox" title="Messages">{rows.map((q) => { const l = state.listings.find((x) => x.id === q.listingId); return <button type="button" key={q.id} className="m-row" onClick={() => ctx.go('thread', { id: q.id })}><img src={coverPhoto(l)} alt="" /><div><b>{l?.title}</b><small>{q.messages[q.messages.length - 1].text}</small></div><small>{timeAgo(q.updatedAt)}</small></button>; })}</Shell>;
}

function Thread({ ctx, id }) {
  const { state, phone } = ctx;
  const [text, setText] = useState('');
  const q = state.inquiries.find((x) => x.id === id);
  const end = useRef(null);
  useEffect(() => { end.current?.scrollIntoView({ block: 'end' }); }, [q?.messages.length]);
  if (!q) return null;
  const staff = phone.session?.type === 'staff';
  const l = state.listings.find((x) => x.id === q.listingId);
  const send = () => {
    if (!text.trim()) return;
    if (staff) { ctx.asUser((d) => replyInquiry(d, q.id, text.trim())); ctx.api('s.lead.msg', { body: { text } }); } else { ctx.asUser((d) => createInquiry(d, q.listingId, q.customerId, text.trim(), 'mobile')); ctx.api('c.inq.msg', { body: { text } }); }
    setText('');
  };
  return (
    <div className="m-page"><Top ctx={ctx} title={staff ? state.customers.find((c) => c.id === q.customerId)?.name : state.staff.find((s) => s.id === q.agentId)?.name} />
      <div className="m-mini-listing"><img src={coverPhoto(l)} alt="" /><span>{l?.title}<small>{priceShort(l)}</small></span></div>
      {staff && <div className="chips m-pad" style={{ paddingBottom: 0, flexWrap: 'nowrap', overflowX: 'auto' }}>{LEAD_STAGES.filter((s) => s.key !== 'won').map((s) => <button type="button" key={s.key} className={`chip ${q.stage === s.key ? 'on' : ''}`} onClick={() => { ctx.asUser((d) => { const x = d.inquiries.find((y) => y.id === q.id); x.stage = s.key; audit(d, 'inquiry.stage', `Lead stage → ${s.key} (app)`); }); ctx.api('s.lead.stage', { body: { stage: s.key } }); }}>{s.label}</button>)}</div>}
      <div className="m-body m-chat">{q.messages.map((m) => <div key={m.id} className={`bubble ${(staff ? m.from === 'agent' : m.from === 'customer') ? 'me' : m.from}`}><div>{m.text}</div><small>{fmtDateTime(m.at)}</small></div>)}<div ref={end} /></div>
      <div className="m-input"><input value={text} onChange={(e) => setText(e.target.value)} placeholder="Message…" onKeyDown={(e) => e.key === 'Enter' && send()} /><button type="button" className="m-icon" onClick={send}><Icon name="send" /></button></div>
    </div>
  );
}

function Profile({ ctx }) {
  const { state, user, phone } = ctx;
  const [pay, setPay] = useState(null);
  if (!user) return <Shell ctx={ctx} tab="profile" title="Profile"><GuestBox ctx={ctx} what="see your account" /></Shell>;
  const dev = state.settings.security.device;
  const staff = phone.session.type === 'staff';
  const toggle = (method, on) => {
    if (on) { if (method === 'pin') ctx.go('setPin'); else enableBiometric(ctx); return; }
    ctx.setPhone((p, d) => { const k = p.keystore[method]; const c = d.deviceCredentials.find((x) => x.id === k?.credentialId); if (c) { c.revokedAt = new Date().toISOString(); c.revokedReason = 'turned_off'; } delete p.keystore[method]; audit(d, 'auth.device_sign_in_disabled', `${method} sign-in turned off (${p.deviceName})`, { channel: 'mobile', actor: { type: p.session.type, id: user.id, name: user.name, role: user.role || null } }); });
    ctx.api('c.device.disable', { note: `DELETE /customer/auth/device/${method}` });
  };
  const deals = staff ? [] : state.deals.filter((d) => d.customerId === user.id);
  const receipts = staff ? [] : state.payments.filter((p) => p.customerId === user.id);
  return (
    <Shell ctx={ctx} tab="profile" title="Profile">
      <div className="m-pad row"><Avatar name={user.name} size="lg" /><div><b>{user.name}</b><div className="mini">{user.email}</div>{staff && <Badge tone="brand">{state.roles[user.role].label}</Badge>}</div></div>
      {!staff && <>
        <h4 className="m-h">My deals</h4>
        {deals.length ? deals.map((d) => { const l = state.listings.find((x) => x.id === d.listingId); return <div key={d.id} className="m-row"><img src={coverPhoto(l)} alt="" /><div><b>{l?.title}</b><small>{d.code} · {d.status}</small></div>{['reserved', 'processing'].includes(d.status) && state.integrations.paymongo.on && <button type="button" className="btn xs" onClick={() => { ctx.api('c.pay', { body: { kind: d.type === 'rent' ? 'deposit' : 'reservation', amount: 20000 } }); setPay(d); }}>Pay</button>}</div>; }) : <p className="mini m-pad">No deals yet.</p>}
        <h4 className="m-h">Receipts</h4>
        {receipts.slice(0, 5).map((p) => <div key={p.id} className="m-row"><span className="m-ico"><Icon name="receipt" /></span><div><b>{p.no}</b><small>{fmtDate(p.at)} · {p.kind.replace('_', ' ')}</small></div><b>{peso(p.amount)}</b></div>)}
      </>}
      <h4 className="m-h">Security</h4>
      {(!staff || dev.staffApp) && <>
        {dev.pin && <div className="m-row"><span className="m-ico"><Icon name="key" /></span><div><b>PIN sign-in</b><small>{phone.keystore.pin ? 'On for this phone' : 'Off'}</small></div><label className="switch"><input type="checkbox" checked={!!phone.keystore.pin} onChange={(e) => toggle('pin', e.target.checked)} /><i /></label></div>}
        {dev.biometric && <div className="m-row"><span className="m-ico"><Icon name="face" /></span><div><b>Face ID / fingerprint</b><small>{phone.keystore.biometric ? 'On for this phone' : 'Off'}</small></div><label className="switch"><input type="checkbox" checked={!!phone.keystore.biometric} onChange={(e) => toggle('biometric', e.target.checked)} /><i /></label></div>}
      </>}
      <div className="m-pad"><button type="button" className="btn ghost block" onClick={() => { ctx.api(staff ? 's.logout' : 'c.logout'); ctx.setPhone((p) => { p.session = null; }); ctx.reset(phone.keystore.pin || phone.keystore.biometric ? 'lock' : 'welcome'); }}><Icon name="logout" />Sign out</button>
        <p className="mini">Signing out keeps PIN / biometrics for next time. Changing the password turns them off on every phone.</p></div>
      {pay && <PayOnline deal={pay} c={user} onClose={() => setPay(null)} onPaid={() => ctx.api('webhook', { note: 'PayMongo webhook → receipt issued, push sent' })} />}
    </Shell>
  );
}

// ------------------------------------------------------------ agent app
function AgentHome({ ctx }) {
  const { state, user } = ctx;
  useEffect(() => { ctx.api('s.dash'); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const leads = state.inquiries.filter((q) => q.agentId === user.id && !['won', 'lost'].includes(q.stage));
  const views = state.viewings.filter((v) => v.agentId === user.id && new Date(v.at) > new Date() && ['requested', 'confirmed'].includes(v.status));
  const com = state.commissions.filter((c) => c.staffId === user.id && c.status !== 'paid');
  const mine = state.listings.filter((l) => l.agentId === user.id && !l.deleted);
  return (
    <Shell ctx={ctx} tab="home" title={`Hi, ${user.name.split(' ')[0]}`} right={<button type="button" className="btn xs" onClick={() => ctx.go('newListing')}><Icon name="plus" />Listing</button>}>
      <div className="m-stats">
        <button type="button" onClick={() => ctx.reset('leads')}><b>{leads.length}</b><small>open leads</small></button>
        <div><b>{views.length}</b><small>viewings</small></div>
        <button type="button" onClick={() => ctx.reset('myListings')}><b>{mine.filter((l) => l.status === 'published').length}</b><small>live listings</small></button>
        <div><b>{peso(com.reduce((a, c) => a + c.net, 0))}</b><small>commission due</small></div>
      </div>
      <h4 className="m-h">Upcoming viewings</h4>
      {views.slice(0, 4).map((v) => <div key={v.id} className="m-row"><span className="m-ico"><Icon name="calendar" /></span><div><b>{state.customers.find((c) => c.id === v.customerId)?.name}</b><small>{fmtDateTime(v.at)} · {state.listings.find((l) => l.id === v.listingId)?.title}</small></div><Badge tone={v.status === 'confirmed' ? 'ok' : 'warn'}>{v.status}</Badge></div>)}
      <h4 className="m-h">Latest leads</h4>
      {leads.slice(0, 5).map((q) => <button type="button" key={q.id} className="m-row" onClick={() => ctx.go('thread', { id: q.id })}><Avatar name={state.customers.find((c) => c.id === q.customerId)?.name} size="sm" /><div><b>{state.customers.find((c) => c.id === q.customerId)?.name}</b><small>{q.messages[q.messages.length - 1].text}</small></div><small>{timeAgo(q.updatedAt)}</small></button>)}
    </Shell>
  );
}

function Leads({ ctx }) {
  const { state, user } = ctx;
  useEffect(() => { ctx.api('s.leads'); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const rows = state.inquiries.filter((q) => q.agentId === user.id).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  return <Shell ctx={ctx} tab="leads" title="My leads">{rows.map((q) => <button type="button" key={q.id} className="m-row" onClick={() => ctx.go('thread', { id: q.id })}><Avatar name={state.customers.find((c) => c.id === q.customerId)?.name} size="sm" /><div><b>{state.customers.find((c) => c.id === q.customerId)?.name}</b><small>{state.listings.find((l) => l.id === q.listingId)?.title}</small></div><Badge tone={LEAD_STAGES.find((s) => s.key === q.stage)?.tone}>{q.stage}</Badge></button>)}</Shell>;
}

function MyListings({ ctx }) {
  const { state, user } = ctx;
  useEffect(() => { ctx.api('s.l.list'); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const rows = state.listings.filter((l) => l.agentId === user.id && !l.deleted).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  return <Shell ctx={ctx} tab="myListings" title="My listings" right={<button type="button" className="btn xs" onClick={() => ctx.go('newListing')}><Icon name="plus" />New</button>}>{rows.map((l) => <div key={l.id} className="m-row"><img src={coverPhoto(l)} alt="" /><div><b>{l.title}</b><small>{l.code} · {priceShort(l)}</small>{l.review && l.status === 'changes' && <small style={{ color: 'var(--warn)' }}>{l.review.note}</small>}</div><Badge tone={LISTING_STATUS[l.status].tone}>{LISTING_STATUS[l.status].label}</Badge></div>)}</Shell>;
}

function NewListing({ ctx }) {
  const { state } = ctx;
  const [f, setF] = useState({ title: '', category: 'condo', purpose: 'sale', price: '', city: state.cms.locations[0] });
  const submit = () => {
    const l = ctx.asUser((d) => saveListing(d, { ...f, price: Number(f.price), priceUnit: f.purpose === 'rent' ? 'month' : 'total', barangay: '', address: '', description: 'Posted from the Hope app.', features: [], specs: {}, photos: [], ownerName: '', ownerPhone: '', authorityFile: 'Authority-to-Sell.pdf' }, { submit: true }));
    ctx.api('s.l.create', { body: { ...f, price: Number(f.price), submit: true }, response: { success: true, data: { id: l.id, code: l.code, status: l.status } } });
    ctx.api('s.l.photos', { note: 'Photos are uploaded after the listing is created (multipart).' });
    ctx.reset('myListings');
    ctx.setSheet(<div style={{ textAlign: 'center' }}><div className="m-big-ico ok"><Icon name="send" size={34} /></div><b>{l.status === 'published' ? 'Published' : 'Sent for approval'}</b><p className="mini">{l.code}. Your Manager was notified and will review it.</p></div>);
  };
  return (
    <div className="m-page"><Top ctx={ctx} title="New listing" />
      <div className="m-pad stack m-body">
        <label className="field"><span>Title</span><input value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} /></label>
        <div className="grid2" style={{ gridTemplateColumns: '1fr 1fr' }}><label className="field"><span>Category</span><select value={f.category} onChange={(e) => setF({ ...f, category: e.target.value })}>{state.categories.filter((c) => c.active).map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}</select></label><label className="field"><span>Purpose</span><select value={f.purpose} onChange={(e) => setF({ ...f, purpose: e.target.value })}><option value="sale">Sale</option><option value="rent">Rent</option></select></label></div>
        <label className="field"><span>Price</span><input type="number" value={f.price} onChange={(e) => setF({ ...f, price: e.target.value })} /></label>
        <label className="field"><span>City</span><select value={f.city} onChange={(e) => setF({ ...f, city: e.target.value })}>{state.cms.locations.map((c) => <option key={c}>{c}</option>)}</select></label>
        <label className="photo-add" style={{ aspectRatio: 'auto', padding: 18 }}><Icon name="image" />Take / choose photos<input type="file" accept="image/*" capture="environment" multiple hidden /></label>
        <button type="button" className="btn lg block" disabled={!f.title || !f.price} onClick={submit}>Submit for approval</button>
      </div>
    </div>
  );
}

function Approvals({ ctx }) {
  const { state, user } = ctx;
  useEffect(() => { ctx.api('s.approvals'); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const rows = state.listings.filter((l) => l.status === 'pending' && !l.deleted && (can(state, 'listings.view_all', user) || l.teamId === user.teamId));
  return (
    <Shell ctx={ctx} tab="approvals" title="Approvals">
      {rows.length ? rows.map((l) => (
        <div key={l.id} className="m-approve"><img src={coverPhoto(l)} alt="" /><b>{l.title}</b><small>{l.code} · {priceShort(l)} · {state.staff.find((s) => s.id === l.agentId)?.name}</small>
          {l.agentId === user.id ? <small>Your own listing: another approver must review it.</small> : <div className="row"><button type="button" className="btn ok sm grow" onClick={() => { ctx.asUser((d) => approveListing(d, l.id, 'Approved in the app')); ctx.api('s.l.approve', { body: { note: 'Approved in the app' } }); }}>Approve</button><button type="button" className="btn ghost sm grow" onClick={() => { ctx.asUser((d) => reviewListing(d, l.id, 'changes', 'Please add more photos.')); ctx.api('s.l.changes', { body: { reason: 'Please add more photos.' } }); }}>Changes</button></div>}
        </div>
      )) : <div className="m-center"><Icon name="verified" size={36} /><p>All caught up.</p></div>}
    </Shell>
  );
}

const SCREENS = { splash: Splash, welcome: Welcome, login: Login, register: Register, staffLogin: StaffLogin, setPin: SetPin, lock: Lock, home: Home, browse: Browse, listing: ListingScreen, book: Book, saved: Saved, inbox: Inbox, thread: Thread, profile: Profile, leads: Leads, myListings: MyListings, newListing: NewListing, approvals: Approvals };
