import { useState } from 'react';
import Icon from '../lib/icons.jsx';
import { audit, me, readPhoto, useStore } from '../lib/store.jsx';
import { passwordProblem } from '../lib/auth.js';
import { fmtDate, fmtDateTime, peso, sum } from '../lib/format.js';
import { Avatar, Badge, Field } from '../components.jsx';
import { Page } from './AdminApp.jsx';
import { Timeline } from './Audit.jsx';

export default function Profile() {
  const { state, update, toast } = useStore();
  const s = me(state);
  const [f, setF] = useState({ name: s.name, phone: s.phone, bio: s.bio || '', photo: s.photo });
  const [pw, setPw] = useState({ cur: '', next: '' });
  const [err, setErr] = useState('');
  const role = state.roles[s.role];
  const trusted = state.trustedDevices.filter((t) => t.staffId === s.id);
  const mine = state.audit.filter((a) => a.actor.id === s.id).slice(0, 15);
  const coms = state.commissions.filter((c) => c.staffId === s.id);
  const deals = state.deals.filter((d) => d.agentId === s.id && d.status === 'closed');
  return (
    <Page title="My profile" sub="Your public agent profile, sign-in security and activity.">
      <div className="editor-grid">
        <div className="stack">
          <div className="card card-pad stack">
            <div className="row"><Avatar name={f.name} photo={f.photo} size="lg" /><div><b style={{ fontSize: 18 }}>{s.name}</b><div className="mini">{role.label}{s.teamId ? ` · ${state.teams.find((t) => t.id === s.teamId)?.name}` : ''} · joined {fmtDate(s.joinedAt)}</div><label className="btn ghost xs" style={{ marginTop: 6 }}><Icon name="upload" />Photo<input type="file" accept="image/*" hidden onChange={async (e) => { try { setF({ ...f, photo: await readPhoto(e.target.files[0], 400) }); } catch (x) { toast(x.message, 'err'); } }} /></label></div></div>
            <div className="grid2"><Field label="Name"><input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></Field><Field label="Mobile (shown to signed-in customers)"><input value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} /></Field></div>
            <Field label="About me (agent page)"><textarea rows={3} value={f.bio} onChange={(e) => setF({ ...f, bio: e.target.value })} /></Field>
            <div><button type="button" className="btn" onClick={() => { update((d) => { const y = d.staff.find((z) => z.id === s.id); const changes = ['name', 'phone', 'bio', 'photo'].filter((k) => y[k] !== f[k]).map((k) => ({ field: k, label: k, from: k === 'photo' ? (y[k] ? 'photo' : 'none') : y[k], to: k === 'photo' ? (f[k] ? 'new photo' : 'none') : f[k] })); Object.assign(y, f); if (changes.length) audit(d, 'staff.profile_updated', `${y.name} updated own profile`, { changes }); }); toast('Saved.'); }}>Save profile</button></div>
          </div>
          <div className="card card-pad stack">
            <h3>Password</h3>
            <div className="grid2"><Field label="Current password"><input type="password" value={pw.cur} onChange={(e) => setPw({ ...pw, cur: e.target.value })} /></Field><Field label="New password"><input type="password" value={pw.next} onChange={(e) => setPw({ ...pw, next: e.target.value })} /></Field></div>
            {err && <div className="note bad">{err}</div>}
            <div><button type="button" className="btn ghost" onClick={() => { if (pw.cur !== (s.password || 'Demo@2026!')) { setErr('Current password is incorrect.'); return; } const p = passwordProblem(state.settings, pw.next); if (p) { setErr(p); return; } update((d) => { d.staff.find((z) => z.id === s.id).password = pw.next; audit(d, 'auth.password_changed', `${s.name} changed the password`, { severity: 'warning' }); }); setErr(''); setPw({ cur: '', next: '' }); toast('Password changed.'); }}>Change password</button></div>
          </div>
          <div className="card card-pad"><h3>My recent activity</h3><Timeline entries={mine} /></div>
        </div>
        <div className="stack">
          <div className="card card-pad stack">
            <h3>Authenticator app</h3>
            <div className="row"><Badge tone={s.mfa?.enabled ? 'ok' : 'warn'} icon="shield">{s.mfa?.enabled ? 'On' : 'Not set up'}</Badge>{s.mfa?.setupAt && <span className="mini">since {fmtDate(s.mfa.setupAt)}</span>}</div>
            <p className="mini">Codes come from Google Authenticator, Microsoft Authenticator or Authy (issuer “{state.settings.security.mfa.issuer}”). Lost your phone? Use a recovery code, or ask a higher rank to reset it.</p>
            <h4 style={{ margin: '6px 0 0' }}>Trusted devices</h4>
            {trusted.length ? trusted.map((t) => <div key={t.createdAt} className="row between"><span className="mini">{t.device.slice(0, 40)}… until {fmtDate(t.expiresAt)}</span><button type="button" className="btn ghost xs" onClick={() => update((d) => { d.trustedDevices = d.trustedDevices.filter((x) => x !== d.trustedDevices.find((y) => y.createdAt === t.createdAt && y.staffId === s.id)); audit(d, 'auth.trusted_device_removed', `${s.name} removed a trusted device`); })}>Remove</button></div>) : <p className="mini">None. The code is asked at every sign-in.</p>}
          </div>
          {(s.role === 'agent' || s.role === 'manager') && (
            <div className="card card-pad"><h3>My numbers</h3><dl className="kv"><dt>Closed deals</dt><dd>{deals.length}</dd><dt>Commission paid</dt><dd>{peso(sum(coms.filter((c) => c.status === 'paid'), (c) => c.net))}</dd><dt>To receive</dt><dd>{peso(sum(coms.filter((c) => c.status !== 'paid'), (c) => c.net))}</dd><dt>Commission share</dt><dd>{s.sharePct ?? state.settings.commission.splits.agentPct}%</dd><dt>License</dt><dd>{s.license || '—'}</dd></dl></div>
          )}
          <div className="card card-pad"><h3>My permissions</h3><p className="mini">Role: <b>{role.label}</b> (rank {role.rank}). {role.description}</p><div className="chips">{(role.perms.includes('*') ? ['everything'] : role.perms).map((p) => <span key={p} className="badge muted mono">{p}</span>)}</div></div>
          <div className="card card-pad"><h3>Last sign-in</h3><p className="mini">{fmtDateTime(s.lastLoginAt)}</p></div>
        </div>
      </div>
    </Page>
  );
}
