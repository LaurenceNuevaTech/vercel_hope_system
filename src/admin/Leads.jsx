import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import Icon from '../lib/icons.jsx';
import { customerName, me, staffName, useStore } from '../lib/store.jsx';
import { can, scope, visible } from '../lib/auth.js';
import { assignLead, replyInquiry, setLeadStage, setViewing } from '../lib/actions.js';
import { overdueLeads } from '../lib/analytics.js';
import { coverPhoto } from '../lib/art.js';
import { LEAD_SOURCES, LEAD_STAGES } from '../lib/catalog.js';
import { fmtDateTime, priceLabel, timeAgo } from '../lib/format.js';
import { Avatar, Badge, Empty, Field, Modal, PromptModal, Tabs } from '../components.jsx';
import { Page } from './AdminApp.jsx';

const st = (k) => LEAD_STAGES.find((s) => s.key === k);

export function Leads() {
  const { state } = useStore();
  const nav = useNavigate();
  const [view, setView] = useState('board');
  const [q, setQ] = useState('');
  const all = visible(state, 'leads', state.inquiries);
  const overdue = new Set(overdueLeads(state, all).map((x) => x.id));
  const rows = all.filter((x) => !q || `${customerName(state, x.customerId)} ${state.listings.find((l) => l.id === x.listingId)?.title}`.toLowerCase().includes(q.toLowerCase())).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  const sc = scope(state, 'leads');
  const Card = ({ x }) => { const l = state.listings.find((y) => y.id === x.listingId); return (
    <Link to={`/admin/leads/${x.id}`} className={`lead-card ${overdue.has(x.id) ? 'late' : ''}`}>
      <div className="row between"><b>{customerName(state, x.customerId)}</b><span className="mini">{timeAgo(x.updatedAt)}</span></div>
      <div className="mini ellipsis">{l?.title}</div>
      <div className="row between"><span className="mini">{LEAD_SOURCES[x.source]}</span>{sc !== 'own' && <span className="mini">{staffName(state, x.agentId).split(' ')[0]}</span>}</div>
      {overdue.has(x.id) && <Badge tone="bad" icon="clock">Reply overdue</Badge>}
    </Link>); };
  return (
    <Page title="Leads & inquiries" sub={`${sc === 'all' ? 'All' : sc === 'team' ? 'Team' : 'Your'} inquiries from the website, the app and share links. Reply within ${state.settings.listings.inquiries.responseHours} hours.`}
      actions={<div className="seg"><button type="button" className={view === 'board' ? 'on' : ''} onClick={() => setView('board')}>Board</button><button type="button" className={view === 'list' ? 'on' : ''} onClick={() => setView('list')}>List</button></div>}>
      <div className="toolbar" style={{ padding: '0 0 12px' }}><label className="search-box grow"><Icon name="search" /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Customer or listing…" /></label></div>
      {view === 'board' ? (
        <div className="board">{LEAD_STAGES.map((s) => { const col = rows.filter((x) => x.stage === s.key); return <div key={s.key} className="board-col"><div className="board-h"><Badge tone={s.tone}>{s.label}</Badge><span className="mini">{col.length}</span></div>{col.slice(0, 30).map((x) => <Card key={x.id} x={x} />)}</div>; })}</div>
      ) : (
        <div className="card table-wrap"><table className="t"><thead><tr><th>Customer</th><th>Listing</th><th>Stage</th><th>Source</th><th>Agent</th><th>Last activity</th></tr></thead><tbody>
          {rows.map((x) => <tr key={x.id} className="click" onClick={() => nav(`/admin/leads/${x.id}`)}><td><b>{customerName(state, x.customerId)}</b>{overdue.has(x.id) && <Badge tone="bad">late</Badge>}</td><td className="ellipsis" style={{ maxWidth: 260 }}>{state.listings.find((l) => l.id === x.listingId)?.title}</td><td><Badge tone={st(x.stage)?.tone}>{st(x.stage)?.label}</Badge></td><td>{LEAD_SOURCES[x.source]}</td><td>{staffName(state, x.agentId)}</td><td className="mini">{timeAgo(x.updatedAt)}</td></tr>)}
        </tbody></table></div>
      )}
    </Page>
  );
}

export function LeadDetail() {
  const { id } = useParams();
  const { state, update, toast } = useStore();
  const [text, setText] = useState('');
  const [modal, setModal] = useState(null);
  const end = useRef(null);
  const q = state.inquiries.find((x) => x.id === id);
  useEffect(() => { end.current?.scrollIntoView({ block: 'end' }); }, [q?.messages.length]);
  if (!q) return <Page title="Lead"><Empty title="Not found" /></Page>;
  const s = me(state);
  const l = state.listings.find((x) => x.id === q.listingId);
  const c = state.customers.find((x) => x.id === q.customerId);
  const views = state.viewings.filter((v) => v.inquiryId === q.id);
  const deal = state.deals.find((d) => d.inquiryId === q.id);
  const send = (e) => { e.preventDefault(); if (!text.trim()) return; update((d) => replyInquiry(d, q.id, text.trim())); setText(''); };
  const quick = ['Hi! Yes, it is still available. When can you view it?', 'I can show it this Saturday at 10 AM. Does that work?', 'The owner is open to offers. What is your budget?', 'I sent you the requirements for bank financing.'];
  return (
    <Page title={c?.name} sub={<>Inquiry about <Link to={`/admin/listings/${l?.id}`}>{l?.code} · {l?.title}</Link></>}
      actions={<>{can(state, 'leads.assign') && <button type="button" className="btn ghost" onClick={() => setModal('assign')}><Icon name="users" />Reassign</button>}{!deal && can(state, 'deals.create') && !['won', 'lost'].includes(q.stage) && <Link to={`/admin/deals?new=${l?.id}&lead=${q.id}`} className="btn"><Icon name="handshake" />Create deal</Link>}{deal && <Link to={`/admin/deals/${deal.id}`} className="btn ghost">Open deal {deal.code}</Link>}</>}>
      <div className="lead-grid">
        <div>
          <div className="stage-bar">{LEAD_STAGES.map((x) => <button type="button" key={x.key} className={q.stage === x.key ? `on ${x.tone}` : ''} onClick={() => (x.key === 'lost' ? setModal('lost') : update((d) => setLeadStage(d, q.id, x.key)))}>{x.label}</button>)}</div>
          <div className="chat card">
            {q.messages.map((m) => <div key={m.id} className={`bubble ${m.from === 'agent' ? 'me' : m.from}`}><div>{m.text}</div><small>{m.from === 'agent' ? staffName(state, m.staffId) : m.from === 'customer' ? c?.name : 'Hope'} · {fmtDateTime(m.at)}</small></div>)}
            <div ref={end} />
          </div>
          <div className="chips" style={{ margin: '10px 0' }}>{quick.map((t) => <button type="button" key={t} className="chip" onClick={() => setText(t)}>{t.slice(0, 34)}…</button>)}</div>
          <form className="chat-in card" onSubmit={send}><input value={text} onChange={(e) => setText(e.target.value)} placeholder="Reply to the customer (sent as push / SMS)…" /><button className="btn" type="submit"><Icon name="send" /></button></form>
          {q.agentId !== s.id && <p className="mini">You are replying as {s.name}. The assigned agent is {staffName(state, q.agentId)}.</p>}
        </div>
        <div className="stack">
          <div className="card card-pad"><div className="row"><Avatar name={c?.name} /><div><b>{c?.name}</b><div className="mini">{c?.email}</div><div className="mini">{c?.mobile}</div></div></div><dl className="kv" style={{ marginTop: 12 }}><dt>Source</dt><dd>{LEAD_SOURCES[q.source]}</dd><dt>Started</dt><dd>{fmtDateTime(q.createdAt)}</dd><dt>First reply</dt><dd>{q.firstReplyAt ? `${Math.max(0, Math.round((new Date(q.firstReplyAt) - new Date(q.createdAt)) / 60000))} min` : <Badge tone="warn">not yet</Badge>}</dd><dt>Agent</dt><dd>{staffName(state, q.agentId)}</dd>{q.lostReason && <><dt>Lost reason</dt><dd>{q.lostReason}</dd></>}</dl></div>
          <Link to={`/admin/listings/${l?.id}`} className="card thread-head" style={{ margin: 0 }}><img src={coverPhoto(l)} alt="" /><div><b>{l?.title}</b><div className="mini">{priceLabel(l)}</div></div></Link>
          <div className="card card-pad"><div className="row between"><h3 style={{ margin: 0 }}>Viewings</h3><button type="button" className="btn ghost xs" onClick={() => setModal('viewing')}><Icon name="plus" />Schedule</button></div>
            {views.length ? views.map((v) => <ViewingRow key={v.id} v={v} />) : <p className="mini">None yet.</p>}</div>
        </div>
      </div>
      {modal === 'lost' && <PromptModal title="Mark as lost" label="Reason" confirm="Mark lost" onClose={() => setModal(null)} onSubmit={(t) => { update((d) => setLeadStage(d, q.id, 'lost', t)); return null; }} />}
      {modal === 'assign' && <AssignLead q={q} onClose={() => setModal(null)} />}
      {modal === 'viewing' && <NewViewing q={q} onClose={() => setModal(null)} onDone={() => toast('Viewing scheduled; the customer was notified.')} />}
    </Page>
  );
}

function AssignLead({ q, onClose }) {
  const { state, update } = useStore();
  const [to, setTo] = useState(q.agentId);
  return <Modal title="Reassign lead" onClose={onClose} width={420} footer={<><button type="button" className="btn ghost" onClick={onClose}>Cancel</button><button type="button" className="btn" onClick={() => { update((d) => assignLead(d, q.id, to)); onClose(); }}>Reassign</button></>}><Field label="Agent"><select value={to} onChange={(e) => setTo(e.target.value)}>{state.staff.filter((x) => ['agent', 'manager'].includes(x.role)).map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</select></Field></Modal>;
}

function NewViewing({ q, onClose, onDone }) {
  const { update } = useStore();
  const [at, setAt] = useState(() => { const d = new Date(Date.now() + 2 * 864e5); d.setHours(10, 0, 0, 0); return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16); });
  return (
    <Modal title="Schedule a viewing" onClose={onClose} width={420} footer={<><button type="button" className="btn ghost" onClick={onClose}>Cancel</button><button type="button" className="btn" onClick={() => { update((d) => { const v = { id: `v${Date.now().toString(36)}`, inquiryId: q.id, listingId: q.listingId, customerId: q.customerId, agentId: q.agentId, at: new Date(at).toISOString(), status: 'requested', notes: '', createdAt: new Date().toISOString() }; d.viewings.unshift(v); setViewing(d, v.id, { status: 'confirmed' }); const x = d.inquiries.find((y) => y.id === q.id); if (['new', 'contacted'].includes(x.stage)) x.stage = 'viewing'; }); onDone(); onClose(); }}>Schedule & confirm</button></>}>
      <Field label="Date & time"><input type="datetime-local" value={at} onChange={(e) => setAt(e.target.value)} /></Field>
    </Modal>
  );
}

function ViewingRow({ v }) {
  const { update } = useStore();
  const tone = { requested: 'warn', confirmed: 'ok', done: 'brand', no_show: 'bad', cancelled: 'muted' };
  return (
    <div className="list-row" style={{ padding: '8px 0' }}>
      <Badge tone={tone[v.status]}>{v.status.replace('_', ' ')}</Badge><span className="grow mini">{fmtDateTime(v.at)}</span>
      {v.status === 'requested' && <button type="button" className="btn ok xs" onClick={() => update((d) => setViewing(d, v.id, { status: 'confirmed' }))}>Confirm</button>}
      {v.status === 'confirmed' && <><button type="button" className="btn ghost xs" onClick={() => update((d) => setViewing(d, v.id, { status: 'done' }))}>Done</button><button type="button" className="btn ghost xs" onClick={() => update((d) => setViewing(d, v.id, { status: 'no_show' }))}>No-show</button></>}
    </div>
  );
}

export function Viewings() {
  const { state } = useStore();
  const [tab, setTab] = useState('upcoming');
  const s = me(state);
  const sc = scope(state, 'leads');
  const mine = state.viewings.filter((v) => sc === 'all' || v.agentId === s.id || (sc === 'team' && state.staff.find((x) => x.id === v.agentId)?.teamId === s.teamId));
  const now = new Date().toISOString();
  const rows = (tab === 'upcoming' ? mine.filter((v) => v.at >= now && ['requested', 'confirmed'].includes(v.status)).sort((a, b) => a.at.localeCompare(b.at)) : tab === 'requests' ? mine.filter((v) => v.status === 'requested') : mine.filter((v) => v.at < now || ['done', 'no_show', 'cancelled'].includes(v.status)).sort((a, b) => b.at.localeCompare(a.at)));
  const days = rows.reduce((a, v) => { const k = v.at.slice(0, 10); (a[k] = a[k] || []).push(v); return a; }, {});
  return (
    <Page title="Viewings" sub="Confirm requests from customers, then mark done or no-show. Customers get a reminder the day before (SMS / push).">
      <div className="card">
        <Tabs value={tab} onChange={setTab} tabs={[{ key: 'upcoming', label: 'Upcoming', count: mine.filter((v) => v.at >= now && ['requested', 'confirmed'].includes(v.status)).length }, { key: 'requests', label: 'Needs confirmation', count: mine.filter((v) => v.status === 'requested').length }, { key: 'past', label: 'Past' }]} />
        {rows.length ? Object.entries(days).map(([d, vs]) => (
          <div key={d}><div className="day-h">{new Date(`${d}T00:00`).toLocaleDateString('en-PH', { weekday: 'long', month: 'long', day: 'numeric' })}</div>
            {vs.map((v) => { const l = state.listings.find((x) => x.id === v.listingId); return <div key={v.id} className="list-row" style={{ padding: '10px 16px' }}><span className="mono" style={{ width: 60 }}>{new Date(v.at).toLocaleTimeString('en-PH', { hour: 'numeric', minute: '2-digit' })}</span><span className="grow"><Link to={`/admin/leads/${v.inquiryId}`}><b>{customerName(state, v.customerId)}</b></Link> · {l?.title}<div className="mini">{l?.city} · {staffName(state, v.agentId)}{v.notes ? ` · ${v.notes}` : ''}</div></span><ViewingRow v={v} /></div>; })}
          </div>
        )) : <Empty icon="calendar" title="Nothing here" />}
      </div>
    </Page>
  );
}
