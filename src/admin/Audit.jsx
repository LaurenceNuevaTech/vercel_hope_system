import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import Icon from '../lib/icons.jsx';
import { useStore } from '../lib/store.jsx';
import { downloadCsv, fmtDateTime, timeAgo } from '../lib/format.js';
import { Badge, Empty, Modal, Pager } from '../components.jsx';
import { Page } from './AdminApp.jsx';

const sevTone = { critical: 'bad', warning: 'warn', info: 'muted' };
const ICON = { listing: 'layers', deal: 'handshake', payment: 'receipt', settings: 'gear', auth: 'lock', billing: 'crown', inquiry: 'message', viewing: 'calendar', commission: 'wallet', customer: 'user', staff: 'briefcase', role: 'key', integration: 'plug', submission: 'tag', cms: 'palette', privacy: 'shield' };
const iconFor = (e) => ICON[e.event.split('.')[0]] || 'history';

export const subjectLink = (s) => {
  if (!s) return null;
  if (s.type === 'listing') return `/admin/listings/${s.id}`;
  if (s.type === 'deal') return `/admin/deals/${s.id}`;
  if (s.type === 'inquiry') return `/admin/leads/${s.id}`;
  if (s.type === 'statement') return '/admin/billing';
  if (s.type === 'settings') return `/admin/settings/${s.id}`;
  return null;
};

export function Changes({ changes }) {
  if (!changes?.length) return null;
  return (
    <table className="t changes"><thead><tr><th>Field</th><th>Before</th><th>After</th></tr></thead><tbody>
      {changes.map((c) => <tr key={c.field + c.label}><td>{c.label}</td><td className="from">{String(c.from)}</td><td className="to">{String(c.to)}</td></tr>)}
    </tbody></table>
  );
}

/** Vertical history of one record. */
export function Timeline({ entries }) {
  if (!entries.length) return <Empty icon="history" title="No history yet" />;
  return (
    <ol className="timeline">
      {entries.map((a) => (
        <li key={a.id} className={`sev-${a.severity}`}>
          <span className="tl-dot"><Icon name={iconFor(a)} /></span>
          <div>
            <div className="row between"><b>{a.description}</b><span className="mini nowrap">{fmtDateTime(a.at)}</span></div>
            <div className="mini">{a.actor.name}{a.actor.role ? ` (${a.actor.role.replace('_', ' ')})` : ''} · {a.channel} · {a.device} · <span className="mono">{a.event}</span></div>
            <Changes changes={a.changes} />
          </div>
        </li>
      ))}
    </ol>
  );
}

export default function Audit() {
  const { state } = useStore();
  const [q, setQ] = useState('');
  const [area, setArea] = useState('');
  const [sev, setSev] = useState('');
  const [actor, setActor] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState(null);
  const areas = [...new Set(state.audit.map((a) => a.event.split('.')[0]))].sort();
  const rows = useMemo(() => state.audit.filter((a) => {
    if (area && !a.event.startsWith(`${area}.`)) return false;
    if (sev && a.severity !== sev) return false;
    if (actor && a.actor.id !== actor && !(actor === 'guest' && a.actor.type === 'guest') && !(actor === 'customers' && a.actor.type === 'customer')) return false;
    if (from && a.at.slice(0, 10) < from) return false;
    if (to && a.at.slice(0, 10) > to) return false;
    if (q) { const s = q.toLowerCase(); if (!`${a.description} ${a.event} ${a.actor.name} ${a.subject?.label || ''}`.toLowerCase().includes(s)) return false; }
    return true;
  }), [state.audit, q, area, sev, actor, from, to]);
  const per = 40;
  const exportCsv = () => downloadCsv('hope-audit-log.csv', ['When', 'Who', 'Role', 'Event', 'Description', 'Record', 'Changes', 'Severity', 'Channel', 'Device', 'IP'], rows.map((a) => [a.at, a.actor.name, a.actor.role || a.actor.type, a.event, a.description, a.subject?.label || '', (a.changes || []).map((c) => `${c.label}: ${c.from} → ${c.to}`).join('; '), a.severity, a.channel, a.device, a.ip]));
  return (
    <Page title="Audit logs" sub="Who did what and when: listings created / edited / deleted, approvals, payments, settings, sign-ins. Entries cannot be edited or deleted." actions={<button type="button" className="btn ghost" onClick={exportCsv}><Icon name="download" />Export CSV</button>}>
      <div className="card">
        <div className="toolbar">
          <label className="search-box grow"><Icon name="search" /><input value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} placeholder="Search description, listing code, person…" /></label>
          <select className="input" style={{ width: 'auto' }} value={area} onChange={(e) => { setArea(e.target.value); setPage(1); }}><option value="">All areas</option>{areas.map((x) => <option key={x}>{x}</option>)}</select>
          <select className="input" style={{ width: 'auto' }} value={actor} onChange={(e) => { setActor(e.target.value); setPage(1); }}><option value="">Everyone</option>{state.staff.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}<option value="customers">Customers</option><option value="guest">Guests</option></select>
          <select className="input" style={{ width: 'auto' }} value={sev} onChange={(e) => { setSev(e.target.value); setPage(1); }}><option value="">Any severity</option><option value="info">Info</option><option value="warning">Warning</option><option value="critical">Critical</option></select>
          <input className="input" type="date" style={{ width: 'auto' }} value={from} onChange={(e) => setFrom(e.target.value)} title="From" />
          <input className="input" type="date" style={{ width: 'auto' }} value={to} onChange={(e) => setTo(e.target.value)} title="To" />
        </div>
        <div className="mini" style={{ padding: '0 16px 8px' }}>{rows.length.toLocaleString()} entries</div>
        <div className="table-wrap"><table className="t"><thead><tr><th>When</th><th>Who</th><th>What</th><th>Record</th><th>Severity</th></tr></thead><tbody>
          {rows.slice((page - 1) * per, page * per).map((a) => (
            <tr key={a.id} className="click" onClick={() => setOpen(a)}>
              <td className="nowrap"><div>{fmtDateTime(a.at)}</div><div className="mini">{timeAgo(a.at)}</div></td>
              <td><b>{a.actor.name}</b><div className="mini">{a.actor.role ? state.roles[a.actor.role]?.label || a.actor.role : a.actor.type}</div></td>
              <td><div>{a.description}</div><div className="mini mono">{a.event}{a.changes?.length ? ` · ${a.changes.length} field(s) changed` : ''}</div></td>
              <td className="mini">{a.subject?.label || '—'}</td>
              <td><Badge tone={sevTone[a.severity]}>{a.severity}</Badge></td>
            </tr>
          ))}
        </tbody></table></div>
        <Pager page={page} pages={Math.ceil(rows.length / per)} onPage={setPage} />
      </div>
      {open && (
        <Modal title="Audit entry" onClose={() => setOpen(null)} width={640}>
          <dl className="kv">
            <dt>When</dt><dd>{fmtDateTime(open.at)}</dd>
            <dt>Who</dt><dd>{open.actor.name} <span className="mini">({open.actor.type}{open.actor.role ? `, ${open.actor.role}` : ''})</span></dd>
            <dt>Event</dt><dd className="mono">{open.event}</dd>
            <dt>Description</dt><dd>{open.description}</dd>
            <dt>Record</dt><dd>{open.subject ? (subjectLink(open.subject) ? <Link to={subjectLink(open.subject)} onClick={() => setOpen(null)}>{open.subject.label}</Link> : open.subject.label) : '—'}</dd>
            <dt>Channel / device</dt><dd>{open.channel} · {open.device}</dd>
            <dt>IP address</dt><dd className="mono">{open.ip}</dd>
            <dt>Severity</dt><dd><Badge tone={sevTone[open.severity]}>{open.severity}</Badge></dd>
          </dl>
          {open.changes?.length > 0 && <><h4 style={{ marginTop: 16 }}>Changes</h4><Changes changes={open.changes} /></>}
        </Modal>
      )}
    </Page>
  );
}
