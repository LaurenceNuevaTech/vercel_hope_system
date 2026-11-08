import { useState } from 'react';
import { Link } from 'react-router-dom';
import Icon from '../lib/icons.jsx';
import { audit, me, notify, useStore } from '../lib/store.jsx';
import { can, canManage, lockState, rank } from '../lib/auth.js';
import { PERMISSIONS } from '../lib/catalog.js';
import { fmtDate, fmtDateTime, peso, sum, timeAgo } from '../lib/format.js';
import { Avatar, Badge, Empty, Field, Modal, PromptModal, Switch, Tabs } from '../components.jsx';
import { Page } from './AdminApp.jsx';

const lockTone = { active: 'ok', locked: 'warn', flagged: 'bad', deactivated: 'muted' };

export function Staff() {
  const { state, update, toast } = useStore();
  const s = me(state);
  const [edit, setEdit] = useState(null);
  const [unlock, setUnlock] = useState(null);
  const [team, setTeam] = useState(null);
  const manage = can(state, 'staff.manage');
  const order = Object.entries(state.roles).sort((a, b) => b[1].rank - a[1].rank).map(([k]) => k);
  const rows = [...state.staff].sort((a, b) => order.indexOf(a.role) - order.indexOf(b.role));
  return (
    <Page title="Staff & teams" sub="Hierarchy: Super Admin (NuevaTech) → Owner → Admin → Manager → Agent, plus Finance and Content Editor. You can manage only lower ranks." actions={manage && <button type="button" className="btn" onClick={() => setEdit({})}><Icon name="plus" />Add staff</button>}>
      <div className="team-grid">
        {state.teams.map((t) => { const agents = state.staff.filter((x) => x.teamId === t.id && x.role === 'agent'); const closed = state.deals.filter((d) => d.teamId === t.id && d.status === 'closed'); return (
          <div key={t.id} className="card card-pad">
            <div className="row between"><h3 style={{ margin: 0 }}>{t.name}</h3>{manage && <button type="button" className="btn ghost xs" onClick={() => setTeam(t)}><Icon name="edit" /></button>}</div>
            <div className="mini">{t.area}</div>
            <div className="row" style={{ marginTop: 10 }}><Avatar name={state.staff.find((x) => x.id === t.managerId)?.name} size="sm" /><span><b>{state.staff.find((x) => x.id === t.managerId)?.name}</b> <span className="mini">Manager</span></span></div>
            <div className="avatars">{agents.map((a) => <span key={a.id} title={a.name}><Avatar name={a.name} size="sm" /></span>)}<span className="mini">{agents.length} agents · {closed.length} closed deals</span></div>
          </div>); })}
        {manage && <button type="button" className="card card-pad add-team" onClick={() => setTeam({})}><Icon name="plus" />New team</button>}
      </div>
      <div className="card" style={{ marginTop: 16 }}>
        <div className="table-wrap"><table className="t"><thead><tr><th>Name</th><th>Role</th><th>Team</th><th>Sign-in</th><th>Last sign-in</th><th /></tr></thead><tbody>
          {rows.map((x) => { const ls = lockState(x); const can2 = canManage(state, s, x); return (
            <tr key={x.id}><td><div className="row" style={{ flexWrap: 'nowrap' }}><Avatar name={x.name} size="sm" /><div><b>{x.name}</b>{x.id === s.id && <Badge tone="brand">you</Badge>}<div className="mini">{x.email}</div></div></div></td>
              <td><Badge tone={x.role === 'super_admin' ? 'accent' : x.role === 'owner' ? 'brand' : 'muted'}>{state.roles[x.role]?.label}</Badge>{x.sharePct != null && <div className="mini">own share {x.sharePct}%</div>}</td>
              <td className="mini">{state.teams.find((t) => t.id === x.teamId)?.name || '—'}</td>
              <td><Badge tone={lockTone[ls]}>{ls}</Badge>{x.mfa?.enabled ? <div className="mini"><Icon name="shield" size={12} /> authenticator on</div> : <div className="mini">authenticator not set up</div>}</td>
              <td className="mini">{x.lastLoginAt ? timeAgo(x.lastLoginAt) : '—'}</td>
              <td className="r nowrap">{can2 && manage && <>
                {['locked', 'flagged'].includes(ls) && <button type="button" className="btn ok xs" onClick={() => setUnlock(x)}><Icon name="unlock" />Unlock</button>}{' '}
                <button type="button" className="btn ghost xs" onClick={() => setEdit(x)}>Edit</button>
              </>}</td></tr>); })}
        </tbody></table></div>
      </div>
      {edit && <StaffEditor x={edit} onClose={() => setEdit(null)} />}
      {team && <TeamEditor t={team} onClose={() => setTeam(null)} />}
      {unlock && <PromptModal title={`Unlock ${unlock.name}`} label="Reason (kept in the audit log)" confirm="Unlock" onClose={() => setUnlock(null)} onSubmit={(t) => { update((d) => { const y = d.staff.find((z) => z.id === unlock.id); const from = lockState(y); Object.assign(y, { status: y.status === 'flagged' ? 'active' : y.status, lockedUntil: null, failed: 0, lockCount: 0 }); audit(d, 'auth.account.unlocked', `Unlocked ${y.email}: ${t}`, { severity: 'warning', subject: { type: 'staff', id: y.id, label: y.name }, changes: [{ field: 'status', label: 'Sign-in', from, to: 'active' }] }); }); toast('Unlocked.'); return null; }} />}
    </Page>
  );
}

function StaffEditor({ x, onClose }) {
  const { state, update, toast } = useStore();
  const s = me(state);
  const isNew = !x.id;
  const [f, setF] = useState({ name: x.name || '', email: x.email || '', phone: x.phone || '', role: x.role || 'agent', teamId: x.teamId || '', license: x.license || '', sharePct: x.sharePct ?? '', status: x.status || 'active', title: x.title || '' });
  const roles = Object.entries(state.roles).filter(([, r]) => r.rank < rank(state, s.role) || s.role === 'super_admin');
  const save = () => {
    if (!f.name || !f.email) return;
    update((d) => {
      if (isNew) {
        const n = { id: `u${Date.now().toString(36)}`, ...f, sharePct: f.sharePct === '' ? null : Number(f.sharePct), teamId: f.teamId || null, mfa: { enabled: false }, failed: 0, lockedUntil: null, lockCount: 0, lastLockAt: null, bio: '', photo: null, joinedAt: new Date().toISOString(), lastLoginAt: null };
        d.staff.push(n);
        audit(d, 'staff.created', `Added ${n.name} as ${d.roles[n.role].label} (invitation sent to ${n.email})`, { subject: { type: 'staff', id: n.id, label: n.name } });
      } else {
        const y = d.staff.find((z) => z.id === x.id);
        const next = { ...f, sharePct: f.sharePct === '' ? null : Number(f.sharePct), teamId: f.teamId || null };
        const changes = Object.keys(next).filter((k) => String(y[k] ?? '') !== String(next[k] ?? '')).map((k) => ({ field: k, label: k, from: k === 'role' ? d.roles[y[k]]?.label : y[k] ?? '—', to: k === 'role' ? d.roles[next[k]]?.label : next[k] ?? '—' }));
        Object.assign(y, next);
        if (changes.length) audit(d, 'staff.updated', `Updated ${y.name}: ${changes.map((c) => c.label).join(', ')}`, { subject: { type: 'staff', id: y.id, label: y.name }, changes, severity: changes.some((c) => ['role', 'status'].includes(c.field)) ? 'warning' : 'info' });
        if (f.status === 'deactivated' && d.staffSession?.staffId === y.id) d.staffSession = null;
      }
    });
    toast(isNew ? `Invitation sent. ${f.name} sets a password and the authenticator at first sign-in.` : 'Saved.');
    onClose();
  };
  return (
    <Modal title={isNew ? 'Add staff' : `Edit ${x.name}`} onClose={onClose} width={560} footer={<>{!isNew && <button type="button" className="btn ghost" style={{ marginRight: 'auto' }} onClick={() => { update((d) => { const y = d.staff.find((z) => z.id === x.id); y.mfa = { enabled: false }; d.trustedDevices = d.trustedDevices.filter((t) => t.staffId !== y.id); audit(d, 'auth.mfa_reset', `Reset the authenticator of ${y.name}; set up again at next sign-in`, { severity: 'warning', subject: { type: 'staff', id: y.id, label: y.name } }); }); toast('Authenticator reset.'); onClose(); }}><Icon name="shield" />Reset authenticator</button>}<button type="button" className="btn ghost" onClick={onClose}>Cancel</button><button type="button" className="btn" onClick={save}>{isNew ? 'Send invitation' : 'Save'}</button></>}>
      <div className="stack">
        <div className="grid2"><Field label="Name"><input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></Field><Field label="Email"><input value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></Field></div>
        <div className="grid2"><Field label="Role"><select value={f.role} onChange={(e) => setF({ ...f, role: e.target.value })}>{roles.map(([k, r]) => <option key={k} value={k}>{r.label}</option>)}</select></Field><Field label="Team"><select value={f.teamId} onChange={(e) => setF({ ...f, teamId: e.target.value })}><option value="">No team</option>{state.teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</select></Field></div>
        <div className="grid2"><Field label="Phone"><input value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} /></Field><Field label="PRC / license no."><input value={f.license} onChange={(e) => setF({ ...f, license: e.target.value })} /></Field></div>
        <div className="grid2">
          <Field label="Own commission share (%)" hint={`Empty = default ${state.settings.commission.splits.agentPct}%`}><input type="number" value={f.sharePct} onChange={(e) => setF({ ...f, sharePct: e.target.value })} disabled={!state.settings.commission.splits.perAgentShare} /></Field>
          {!isNew && <Field label="Status"><select value={f.status} onChange={(e) => setF({ ...f, status: e.target.value })}><option value="active">Active</option><option value="deactivated">Deactivated</option></select></Field>}
        </div>
      </div>
    </Modal>
  );
}

function TeamEditor({ t, onClose }) {
  const { state, update } = useStore();
  const [f, setF] = useState({ name: t.name || '', area: t.area || '', managerId: t.managerId || '' });
  return (
    <Modal title={t.id ? 'Edit team' : 'New team'} onClose={onClose} width={460} footer={<><button type="button" className="btn ghost" onClick={onClose}>Cancel</button><button type="button" className="btn" onClick={() => { update((d) => { if (t.id) { Object.assign(d.teams.find((x) => x.id === t.id), f); audit(d, 'team.updated', `Updated team ${f.name}`); } else { d.teams.push({ id: `t${Date.now().toString(36)}`, ...f }); audit(d, 'team.created', `Created team ${f.name}`); } const m = d.staff.find((x) => x.id === f.managerId); if (m && t.id) m.teamId = t.id; }); onClose(); }}>Save</button></>}>
      <div className="stack"><Field label="Name"><input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></Field><Field label="Area"><input value={f.area} onChange={(e) => setF({ ...f, area: e.target.value })} /></Field><Field label="Manager"><select value={f.managerId} onChange={(e) => setF({ ...f, managerId: e.target.value })}><option value="">Choose…</option>{state.staff.filter((x) => x.role === 'manager').map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</select></Field></div>
    </Modal>
  );
}

export function Customers() {
  const { state, update, toast } = useStore();
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(null);
  const rows = state.customers.filter((c) => !q || `${c.name} ${c.email} ${c.mobile}`.toLowerCase().includes(q.toLowerCase()));
  const c = open && state.customers.find((x) => x.id === open);
  return (
    <Page title="Customers" sub="Buyers, tenants and owners with an account (website and app).">
      <div className="card">
        <div className="toolbar"><label className="search-box grow"><Icon name="search" /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Name, email, mobile…" /></label><span className="mini">{rows.length} customers</span></div>
        <div className="table-wrap"><table className="t"><thead><tr><th>Customer</th><th>Mobile</th><th className="r">Inquiries</th><th className="r">Deals</th><th>Joined</th><th>Status</th></tr></thead><tbody>
          {rows.map((x) => <tr key={x.id} className="click" onClick={() => setOpen(x.id)}><td><b>{x.name}</b><div className="mini">{x.email}</div></td><td>{x.mobile}</td><td className="r num">{state.inquiries.filter((i) => i.customerId === x.id).length}</td><td className="r num">{state.deals.filter((d) => d.customerId === x.id).length}</td><td className="mini">{fmtDate(x.createdAt)} · {x.source}</td><td><Badge tone={lockTone[lockState(x)]}>{lockState(x)}</Badge></td></tr>)}
        </tbody></table></div>
      </div>
      {c && (
        <Modal title={c.name} onClose={() => setOpen(null)} width={640} footer={can(state, 'customers.manage') && <>{['locked', 'flagged'].includes(lockState(c)) && <button type="button" className="btn ok" onClick={() => { update((d) => { const y = d.customers.find((z) => z.id === c.id); Object.assign(y, { status: 'active', lockedUntil: null, failed: 0, lockCount: 0 }); audit(d, 'auth.account.unlocked', `Unlocked customer ${y.email}`, { severity: 'warning' }); }); toast('Unlocked.'); }}>Unlock</button>}<button type="button" className="btn ghost" onClick={() => { update((d) => { const y = d.customers.find((z) => z.id === c.id); y.status = y.status === 'deactivated' ? 'active' : 'deactivated'; audit(d, `customer.${y.status}`, `${y.status === 'deactivated' ? 'Deactivated' : 'Reactivated'} customer ${y.email}`, { severity: 'warning' }); }); }}>{c.status === 'deactivated' ? 'Reactivate' : 'Deactivate'}</button></>}>
          <dl className="kv"><dt>Email</dt><dd>{c.email}</dd><dt>Mobile</dt><dd>{c.mobile}</dd><dt>Joined</dt><dd>{fmtDateTime(c.createdAt)} ({c.source})</dd><dt>Last sign-in</dt><dd>{c.lastLoginAt ? fmtDateTime(c.lastLoginAt) : '—'}</dd><dt>Saved listings</dt><dd>{c.favourites.length}</dd><dt>Paid through Hope</dt><dd>{peso(sum(state.payments.filter((p) => p.customerId === c.id && !p.void), (p) => p.amount))}</dd></dl>
          <h4 style={{ marginTop: 16 }}>Inquiries</h4>
          {state.inquiries.filter((i) => i.customerId === c.id).map((i) => <Link key={i.id} to={`/admin/leads/${i.id}`} className="list-row" onClick={() => setOpen(null)}><Badge>{i.stage}</Badge><span className="grow ellipsis">{state.listings.find((l) => l.id === i.listingId)?.title}</span></Link>)}
          <h4 style={{ marginTop: 16 }}>Deals</h4>
          {state.deals.filter((d) => d.customerId === c.id).map((d) => <Link key={d.id} to={`/admin/deals/${d.id}`} className="list-row" onClick={() => setOpen(null)}><span className="mono">{d.code}</span><span className="grow ellipsis">{state.listings.find((l) => l.id === d.listingId)?.title}</span><Badge>{d.status}</Badge></Link>)}
        </Modal>
      )}
    </Page>
  );
}

export function Roles() {
  const { state, update, toast } = useStore();
  const s = me(state);
  const keys = Object.entries(state.roles).sort((a, b) => b[1].rank - a[1].rank).map(([k]) => k);
  const [sel, setSel] = useState('manager');
  const [adding, setAdding] = useState(false);
  const r = state.roles[sel];
  const editable = sel !== 'super_admin' && (sel !== 'owner' || s.role === 'super_admin') && r.rank < rank(state, s.role);
  const toggle = (perm, on) => update((d) => {
    const role = d.roles[sel];
    role.perms = on ? [...new Set([...role.perms, perm])] : role.perms.filter((p) => p !== perm);
    audit(d, 'role.updated', `${on ? 'Gave' : 'Removed'} "${perm}" ${on ? 'to' : 'from'} ${role.label}`, { severity: 'warning', subject: { type: 'role', id: sel, label: role.label }, changes: [{ field: perm, label: perm, from: on ? 'off' : 'on', to: on ? 'on' : 'off' }] });
  });
  return (
    <Page title="Roles & permissions" sub="Who can do what. Rename roles, change their permissions or add new ones. Super Admin always has everything." actions={<button type="button" className="btn" onClick={() => setAdding(true)}><Icon name="plus" />New role</button>}>
      <div className="roles-grid">
        <div className="card">
          {keys.map((k) => { const x = state.roles[k]; return <button type="button" key={k} className={`role-row ${sel === k ? 'on' : ''}`} onClick={() => setSel(k)}><span><b>{x.label}</b><small>{x.org} · rank {x.rank}</small></span><span className="mini">{state.staff.filter((y) => y.role === k).length}</span></button>; })}
        </div>
        <div className="card">
          <div className="card-h"><div><h3>{r.label}</h3><div className="mini">{r.description}</div></div>{!editable && <Badge tone="muted" icon="lock">{sel === 'super_admin' ? 'All permissions' : 'Only a higher rank can edit'}</Badge>}</div>
          {editable && <div className="card-b grid2" style={{ borderBottom: '1px solid var(--line-2)' }}>
            <Field label="Name shown"><input value={r.label} onChange={(e) => update((d) => { d.roles[sel].label = e.target.value; })} onBlur={() => update((d) => audit(d, 'role.renamed', `Role ${sel} renamed to "${r.label}"`))} /></Field>
            <Field label="Description"><input value={r.description} onChange={(e) => update((d) => { d.roles[sel].description = e.target.value; })} /></Field>
          </div>}
          <div className="card-b">
            {PERMISSIONS.map((g) => (
              <div key={g.group} className="perm-group"><h4>{g.group}</h4>
                {g.items.map(([k, label]) => { const on = r.perms.includes('*') || r.perms.includes(k); return <label key={k} className="perm-row"><span>{label}<small className="mono">{k}</small></span><Switch checked={on} disabled={!editable || (k.startsWith('billing.') && ['billing.confirm', 'billing.rates', 'billing.statements'].includes(k) && s.role !== 'super_admin')} onChange={(v) => toggle(k, v)} /></label>; })}
              </div>
            ))}
          </div>
        </div>
      </div>
      {adding && <NewRole onClose={() => setAdding(false)} onDone={(k) => { setSel(k); toast('Role added. Choose its permissions.'); }} />}
    </Page>
  );
}

function NewRole({ onClose, onDone }) {
  const { update } = useStore();
  const [f, setF] = useState({ label: '', rank: 45, copy: 'agent' });
  return (
    <Modal title="New role" onClose={onClose} width={440} footer={<><button type="button" className="btn ghost" onClick={onClose}>Cancel</button><button type="button" className="btn" disabled={!f.label} onClick={() => { const k = f.label.toLowerCase().replace(/\W+/g, '_'); update((d) => { d.roles[k] = { label: f.label, rank: Number(f.rank), system: false, org: 'Hope', description: '', perms: [...d.roles[f.copy].perms] }; audit(d, 'role.created', `Created role ${f.label} (copied from ${d.roles[f.copy].label})`, { severity: 'warning' }); }); onDone(k); onClose(); }}>Create</button></>}>
      <div className="stack"><Field label="Name (e.g. Team Leader, Secretary)"><input value={f.label} onChange={(e) => setF({ ...f, label: e.target.value })} /></Field><div className="grid2"><Field label="Rank (1–89)" hint="Higher ranks manage lower ones."><input type="number" value={f.rank} onChange={(e) => setF({ ...f, rank: e.target.value })} /></Field><Field label="Start from"><select value={f.copy} onChange={(e) => setF({ ...f, copy: e.target.value })}>{['admin', 'manager', 'finance', 'editor', 'agent'].map((k) => <option key={k} value={k}>{k}</option>)}</select></Field></div></div>
    </Modal>
  );
}

