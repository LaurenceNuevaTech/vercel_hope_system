import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, Navigate, Route, Routes, useNavigate, useParams } from 'react-router-dom';
import Icon from '../lib/icons.jsx';
import { audit, meCustomer, staffName, useStore } from '../lib/store.jsx';
import { createInquiry, recordPayment } from '../lib/actions.js';
import { coverPhoto } from '../lib/art.js';
import { DEAL_STATUS, LEAD_STAGES, PAYMENT_KINDS } from '../lib/catalog.js';
import { fmtDate, fmtDateTime, peso, priceLabel, timeAgo } from '../lib/format.js';
import { passwordProblem } from '../lib/auth.js';
import { Avatar, Badge, Empty, Field, ListingCard, Modal } from '../components.jsx';
import { ReceiptPrint } from '../printables.jsx';

const NAV = [
  ['', 'Overview', 'grid'], ['saved', 'Saved', 'heart'], ['inquiries', 'Messages', 'message'], ['viewings', 'Viewings', 'calendar'],
  ['deals', 'My deals & receipts', 'receipt'], ['submissions', 'Sell with Hope', 'tag'], ['notifications', 'Notifications', 'bell'], ['profile', 'Profile & security', 'shield'],
];

export default function Account() {
  const { state, update } = useStore();
  const nav = useNavigate();
  const c = meCustomer(state);
  if (!c) return <Navigate to="/login?next=/account" replace />;
  const unread = state.notifications.filter((n) => n.to.type === 'customer' && n.to.id === c.id && !n.read).length;
  const logout = () => { update((d) => { audit(d, 'auth.logout', `${c.name} signed out`); d.customerSession = null; }); nav('/'); };
  return (
    <div className="wrap page acct">
      <aside className="acct-nav card">
        <div className="row" style={{ padding: '6px 6px 12px' }}><Avatar name={c.name} /><div className="grow"><b>{c.name}</b><div className="mini">{c.email}</div></div></div>
        {NAV.map(([to, label, icon]) => <NavLink key={to} to={`/account${to ? `/${to}` : ''}`} end={!to}><Icon name={icon} />{label}{to === 'notifications' && unread > 0 && <i className="dot-n">{unread}</i>}</NavLink>)}
        <button type="button" onClick={logout}><Icon name="logout" />Sign out</button>
      </aside>
      <section className="acct-main">
        <Routes>
          <Route index element={<Overview c={c} />} />
          <Route path="saved" element={<Saved c={c} />} />
          <Route path="inquiries" element={<Inquiries c={c} />} />
          <Route path="inquiries/:id" element={<Thread c={c} />} />
          <Route path="viewings" element={<Viewings c={c} />} />
          <Route path="deals" element={<Deals c={c} />} />
          <Route path="submissions" element={<Submissions c={c} />} />
          <Route path="notifications" element={<Notifications c={c} />} />
          <Route path="profile" element={<Profile c={c} />} />
        </Routes>
      </section>
    </div>
  );
}

function Overview({ c }) {
  const { state } = useStore();
  const inq = state.inquiries.filter((q) => q.customerId === c.id);
  const views = state.viewings.filter((v) => v.customerId === c.id && new Date(v.at) > new Date() && !['cancelled'].includes(v.status));
  const deals = state.deals.filter((d) => d.customerId === c.id);
  return (
    <>
      <h1>Hi, {c.name.split(' ')[0]}!</h1>
      <div className="stat-row">
        <Link to="/account/saved" className="stat card"><div className="stat-ico"><Icon name="heart" /></div><div><div className="stat-v">{c.favourites.length}</div><div className="stat-l">Saved listings</div></div></Link>
        <Link to="/account/inquiries" className="stat card"><div className="stat-ico"><Icon name="message" /></div><div><div className="stat-v">{inq.filter((q) => !['won', 'lost'].includes(q.stage)).length}</div><div className="stat-l">Open conversations</div></div></Link>
        <Link to="/account/viewings" className="stat card"><div className="stat-ico"><Icon name="calendar" /></div><div><div className="stat-v">{views.length}</div><div className="stat-l">Upcoming viewings</div></div></Link>
        <Link to="/account/deals" className="stat card"><div className="stat-ico"><Icon name="handshake" /></div><div><div className="stat-v">{deals.length}</div><div className="stat-l">Deals</div></div></Link>
      </div>
      {views[0] && (() => { const v = views[0]; const l = state.listings.find((x) => x.id === v.listingId); return <div className="card card-pad" style={{ marginTop: 16 }}><div className="row between"><div><Badge tone={v.status === 'confirmed' ? 'ok' : 'warn'}>{v.status === 'confirmed' ? 'Confirmed' : 'Waiting for the agent'}</Badge><h3 style={{ margin: '8px 0 2px' }}>Next viewing: {l?.title}</h3><div className="muted">{fmtDateTime(v.at)} · {staffName(state, v.agentId)}</div></div><Link to="/account/viewings" className="btn ghost sm">Details</Link></div></div>; })()}
      <h2 style={{ marginTop: 24 }}>Saved listings</h2>
      {c.favourites.length ? <div className="lgrid">{c.favourites.slice(0, 3).map((id) => state.listings.find((l) => l.id === id)).filter(Boolean).map((l) => <ListingCard key={l.id} listing={l} />)}</div> : <Empty icon="heart" title="Nothing saved yet"><Link to="/listings">Browse listings</Link></Empty>}
    </>
  );
}

function Saved({ c }) {
  const { state, update } = useStore();
  const list = c.favourites.map((id) => state.listings.find((l) => l.id === id)).filter(Boolean);
  return (
    <>
      <h1>Saved listings</h1>
      {list.length ? <div className="lgrid">{list.map((l) => <ListingCard key={l.id} listing={l} fav onFav={() => update((d) => { const x = d.customers.find((y) => y.id === c.id); x.favourites = x.favourites.filter((i) => i !== l.id); })} />)}</div> : <Empty icon="heart" title="Nothing saved yet"><Link to="/listings">Browse listings</Link></Empty>}
    </>
  );
}

const stage = (k) => LEAD_STAGES.find((s) => s.key === k);

function Inquiries({ c }) {
  const { state } = useStore();
  const list = state.inquiries.filter((q) => q.customerId === c.id).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  return (
    <>
      <h1>Messages with agents</h1>
      {list.length ? <div className="card">{list.map((q) => { const l = state.listings.find((x) => x.id === q.listingId); const last = q.messages[q.messages.length - 1]; return (
        <Link key={q.id} to={`/account/inquiries/${q.id}`} className="inbox-row">
          <img src={coverPhoto(l)} alt="" />
          <div className="grow"><div className="row between"><b>{l?.title}</b><span className="mini">{timeAgo(q.updatedAt)}</span></div><div className="mini">{staffName(state, q.agentId)} · <Badge tone={stage(q.stage)?.tone}>{stage(q.stage)?.label}</Badge></div><div className="ellipsis">{last.from === 'customer' ? 'You: ' : ''}{last.text}</div></div>
        </Link>); })}</div> : <Empty icon="message" title="No messages yet">Open a listing and tap “Ask the agent”.</Empty>}
    </>
  );
}

function Thread({ c }) {
  const { id } = useParams();
  const { state, update } = useStore();
  const [text, setText] = useState('');
  const end = useRef(null);
  const q = state.inquiries.find((x) => x.id === id && x.customerId === c.id);
  useEffect(() => { end.current?.scrollIntoView({ block: 'end' }); }, [q?.messages.length]);
  if (!q) return <Empty title="Conversation not found" />;
  const l = state.listings.find((x) => x.id === q.listingId);
  const agent = state.staff.find((s) => s.id === q.agentId);
  const send = (e) => { e.preventDefault(); if (!text.trim()) return; update((d) => createInquiry(d, q.listingId, c.id, text.trim(), 'web')); setText(''); };
  return (
    <>
      <div className="row between"><Link to="/account/inquiries" className="btn link"><Icon name="left" />All messages</Link><Badge tone={stage(q.stage)?.tone}>{stage(q.stage)?.label}</Badge></div>
      <Link to={`/l/${l?.slug}`} className="thread-head card"><img src={coverPhoto(l)} alt="" /><div><b>{l?.title}</b><div className="mini">{priceLabel(l)} · {l?.code}</div></div></Link>
      <div className="chat card">
        {q.messages.map((m) => <div key={m.id} className={`bubble ${m.from === 'customer' ? 'me' : m.from}`}><div>{m.text}</div><small>{m.from === 'agent' ? agent?.name : m.from === 'system' ? 'Hope' : 'You'} · {fmtDateTime(m.at)}</small></div>)}
        <div ref={end} />
      </div>
      <form className="chat-in card" onSubmit={send}><input value={text} onChange={(e) => setText(e.target.value)} placeholder={`Message ${agent?.name}…`} /><button className="btn" type="submit"><Icon name="send" /></button></form>
      <p className="mini">Tip: open the staff portal as <b>{agent?.email}</b> in another tab to reply as the agent.</p>
    </>
  );
}

function Viewings({ c }) {
  const { state, update, toast } = useStore();
  const list = state.viewings.filter((v) => v.customerId === c.id).sort((a, b) => b.at.localeCompare(a.at));
  const tone = { requested: 'warn', confirmed: 'ok', done: 'brand', no_show: 'bad', cancelled: 'muted' };
  return (
    <>
      <h1>Viewings</h1>
      {list.length ? <div className="card">{list.map((v) => { const l = state.listings.find((x) => x.id === v.listingId); const future = new Date(v.at) > new Date(); return (
        <div key={v.id} className="inbox-row">
          <img src={coverPhoto(l)} alt="" />
          <div className="grow"><b>{l?.title}</b><div className="mini">{fmtDateTime(v.at)} · {staffName(state, v.agentId)}</div>{v.notes && <div className="mini">{v.notes}</div>}</div>
          <div className="row" style={{ gap: 6 }}><Badge tone={tone[v.status]}>{v.status === 'requested' ? 'Waiting for agent' : v.status.replace('_', ' ')}</Badge>{future && ['requested', 'confirmed'].includes(v.status) && <button type="button" className="btn ghost xs" onClick={() => { update((d) => { const x = d.viewings.find((y) => y.id === v.id); x.status = 'cancelled'; audit(d, 'viewing.cancelled', `${c.name} cancelled the viewing of ${l?.code}`, { subject: { type: 'viewing', id: v.id, label: l?.code } }); }); toast('Viewing cancelled.'); }}>Cancel</button>}</div>
        </div>); })}</div> : <Empty icon="calendar" title="No viewings yet" />}
    </>
  );
}

function Deals({ c }) {
  const { state } = useStore();
  const [rc, setRc] = useState(null);
  const [pay, setPay] = useState(null);
  const deals = state.deals.filter((d) => d.customerId === c.id);
  const receipts = state.payments.filter((p) => p.customerId === c.id).sort((a, b) => b.at.localeCompare(a.at));
  return (
    <>
      <h1>My deals & receipts</h1>
      {deals.length === 0 && <Empty icon="handshake" title="No deals yet">When you reserve, your agent creates the deal and it appears here.</Empty>}
      <div className="stack">
        {deals.map((d) => {
          const l = state.listings.find((x) => x.id === d.listingId);
          const paid = state.payments.filter((p) => p.dealId === d.id && p.customerId && !p.void).reduce((a, p) => a + p.amount, 0);
          const steps = ['reserved', 'processing', 'closed'];
          const at = d.status === 'cancelled' ? -1 : steps.indexOf(d.status);
          const canPay = state.settings.deals.payments.onlinePayments && state.integrations.paymongo.on && d.status !== 'closed' && d.status !== 'cancelled';
          return (
            <div key={d.id} className="card">
              <div className="card-h"><div className="row"><img src={coverPhoto(l)} alt="" style={{ width: 56, height: 42, borderRadius: 8, objectFit: 'cover' }} /><div><b>{l?.title}</b><div className="mini">{d.code} · {d.type === 'rent' ? 'Lease' : 'Purchase'} · {d.scheme}</div></div></div><Badge tone={DEAL_STATUS[d.status].tone}>{DEAL_STATUS[d.status].label}</Badge></div>
              <div className="card-b">
                {d.status !== 'cancelled' ? <div className="tracker">{['Reserved', 'Documents', d.type === 'rent' ? 'Move-in' : 'Turnover'].map((t, i) => <div key={t} className={i <= at ? 'on' : ''}><span>{i < at || d.status === 'closed' ? <Icon name="check" /> : i + 1}</span>{t}</div>)}</div> : <div className="note bad">Cancelled: {d.cancelReason}</div>}
                <div className="grid3" style={{ marginTop: 14 }}>
                  <div><div className="mini">Price</div><b>{peso(d.price)}{d.type === 'rent' ? ' / month' : ''}</b></div>
                  <div><div className="mini">Paid through Hope</div><b>{peso(paid)}</b></div>
                  <div><div className="mini">Agent</div><b>{staffName(state, d.agentId)}</b></div>
                </div>
                {d.documents?.length > 0 && <div className="doc-list">{d.documents.map((x) => <span key={x.name} className={x.done ? 'done' : ''}><Icon name={x.done ? 'check' : 'clock'} />{x.name}</span>)}</div>}
                {canPay && <button type="button" className="btn accent" style={{ marginTop: 12 }} onClick={() => setPay(d)}><Icon name="card" />Pay online</button>}
              </div>
            </div>
          );
        })}
      </div>
      <h2 style={{ marginTop: 24 }}>Receipts</h2>
      {receipts.length ? <div className="card table-wrap"><table className="t"><thead><tr><th>Receipt</th><th>Date</th><th>For</th><th className="r">Amount</th><th /></tr></thead><tbody>
        {receipts.map((p) => <tr key={p.id}><td className="mono">{p.no}{p.void && <Badge tone="bad">Void</Badge>}</td><td>{fmtDate(p.at)}</td><td>{PAYMENT_KINDS[p.kind].label} · {state.deals.find((d) => d.id === p.dealId)?.code}</td><td className="r num">{peso(p.amount)}</td><td className="r"><button type="button" className="btn ghost xs" onClick={() => setRc(p)}><Icon name="print" />View</button></td></tr>)}
      </tbody></table></div> : <Empty icon="receipt" title="No receipts yet" />}
      {rc && <ReceiptPrint payment={rc} onClose={() => setRc(null)} />}
      {pay && <PayOnline deal={pay} c={c} onClose={() => setPay(null)} />}
    </>
  );
}

/** Simulated PayMongo checkout. */
export function PayOnline({ deal, c, onClose, onPaid }) {
  const { state, update, toast } = useStore();
  const l = state.listings.find((x) => x.id === deal.listingId);
  const paidKinds = state.payments.filter((p) => p.dealId === deal.id && !p.void).map((p) => p.kind);
  const kinds = deal.type === 'rent' ? ['deposit', 'advance'] : ['reservation', 'down_payment'];
  const [kind, setKind] = useState(kinds.find((k) => !paidKinds.includes(k)) || kinds[1]);
  const def = { reservation: state.settings.deals.terms.reservationFee, down_payment: Math.round(deal.price * 0.1), deposit: deal.price * state.settings.deals.terms.depositMonths, advance: deal.price * state.settings.deals.terms.advanceMonths }[kind];
  const [amount, setAmount] = useState(def);
  const [method, setMethod] = useState('GCash');
  const [step, setStep] = useState('form');
  useEffect(() => setAmount(def), [kind]); // eslint-disable-line react-hooks/exhaustive-deps
  const pay = () => {
    setStep('processing');
    setTimeout(() => {
      const r = update((d) => recordPayment(d, deal.id, { kind, amount, method: 'Online (PayMongo)', ref: `pi_${Math.random().toString(36).slice(2, 10)}` }, { online: true, customer: c }));
      setStep('done');
      toast(`Paid ${peso(amount)} via ${method}. Receipt ${r.payment.no} issued.`);
      onPaid?.(r.payment);
    }, 1200);
  };
  return (
    <Modal title="Pay online" onClose={onClose} width={440}>
      {step === 'done' ? <div style={{ textAlign: 'center' }}><div className="gate-ico ok"><Icon name="check" /></div><h3>Payment successful</h3><p className="muted">The receipt is in your account and was sent by email / SMS.</p><button type="button" className="btn" onClick={onClose}>Done</button></div> : (
        <div className="stack">
          <div className="paymongo"><b>PayMongo checkout</b><span className="mini">test mode</span></div>
          <div className="mini">{l?.title} · {deal.code}</div>
          <Field label="Payment for"><select value={kind} onChange={(e) => setKind(e.target.value)}>{kinds.map((k) => <option key={k} value={k}>{PAYMENT_KINDS[k].label}{paidKinds.includes(k) ? ' (paid)' : ''}</option>)}</select></Field>
          <Field label="Amount"><input type="number" value={amount} onChange={(e) => setAmount(Number(e.target.value))} /></Field>
          <div className="chips">{['GCash', 'Maya', 'Card', 'Online banking'].map((m) => <button type="button" key={m} className={`chip ${method === m ? 'on' : ''}`} onClick={() => setMethod(m)}>{m}</button>)}</div>
          <button type="button" className="btn accent lg" disabled={step === 'processing' || !(amount > 0)} onClick={pay}>{step === 'processing' ? 'Processing…' : `Pay ${peso(amount)}`}</button>
          <p className="mini">In the real system this opens PayMongo's secure page; the webhook confirms the payment and issues the receipt automatically.</p>
        </div>
      )}
    </Modal>
  );
}

function Submissions({ c }) {
  const { state } = useStore();
  const list = state.submissions.filter((s) => s.customerId === c.id);
  const tone = { new: 'info', assigned: 'warn', listed: 'ok', declined: 'bad' };
  return (
    <>
      <div className="row between"><h1>Sell or lease with Hope</h1><Link to="/sell" className="btn"><Icon name="plus" />New submission</Link></div>
      {list.length ? <div className="card">{list.map((s) => <div key={s.id} className="inbox-row"><span className="cat-ico"><Icon name={state.categories.find((x) => x.key === s.kind)?.icon || 'home'} /></span><div className="grow"><b>{s.title}</b><div className="mini">{s.city} · {peso(s.price)} · submitted {fmtDate(s.createdAt)}</div>{s.assignedTo && <div className="mini">Agent: {staffName(state, s.assignedTo)}</div>}</div><Badge tone={tone[s.status]}>{s.status}</Badge></div>)}</div> : <Empty icon="tag" title="Nothing submitted yet" />}
    </>
  );
}

function Notifications({ c }) {
  const { state, update } = useStore();
  const list = state.notifications.filter((n) => n.to.type === 'customer' && n.to.id === c.id);
  useEffect(() => { if (list.some((n) => !n.read)) update((d) => d.notifications.forEach((n) => { if (n.to.type === 'customer' && n.to.id === c.id) n.read = true; })); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <>
      <h1>Notifications</h1>
      {list.length ? <div className="card">{list.map((n) => <Link key={n.id} to={n.link || '#'} className="inbox-row"><span className={`cat-ico ${n.read ? '' : 'unread'}`}><Icon name="bell" /></span><div className="grow"><b>{n.title}</b><div className="mini">{n.body}</div></div><span className="mini">{timeAgo(n.at)}</span></Link>)}</div> : <Empty icon="bell" title="No notifications" />}
    </>
  );
}

function Profile({ c }) {
  const { state, update, toast } = useStore();
  const [f, setF] = useState({ name: c.name, mobile: c.mobile });
  const [pw, setPw] = useState({ cur: '', next: '' });
  const [err, setErr] = useState('');
  const creds = state.deviceCredentials.filter((d) => d.owner.type === 'customer' && d.owner.id === c.id && !d.revokedAt);
  return (
    <>
      <h1>Profile & security</h1>
      <div className="card card-pad stack">
        <h3>Profile</h3>
        <div className="grid2"><Field label="Name"><input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></Field><Field label="Mobile"><input value={f.mobile} onChange={(e) => setF({ ...f, mobile: e.target.value })} /></Field></div>
        <Field label="Email" hint="Contact Hope to change your email."><input value={c.email} disabled /></Field>
        <div><button type="button" className="btn" onClick={() => { update((d) => { const x = d.customers.find((y) => y.id === c.id); const changes = [['name', 'Name'], ['mobile', 'Mobile']].filter(([k]) => x[k] !== f[k]).map(([k, label]) => ({ field: k, label, from: x[k], to: f[k] })); Object.assign(x, f); if (changes.length) audit(d, 'customer.updated', `${x.name} updated the profile`, { changes, subject: { type: 'customer', id: x.id, label: x.name } }); }); toast('Profile saved.'); }}>Save</button></div>
      </div>
      <div className="card card-pad stack" style={{ marginTop: 16 }}>
        <h3>Change password</h3>
        <div className="grid2"><Field label="Current password"><input type="password" value={pw.cur} onChange={(e) => setPw({ ...pw, cur: e.target.value })} /></Field><Field label="New password"><input type="password" value={pw.next} onChange={(e) => setPw({ ...pw, next: e.target.value })} /></Field></div>
        {err && <div className="note bad">{err}</div>}
        <div><button type="button" className="btn" onClick={() => {
          if (pw.cur !== (c.password || 'Demo@2026!')) { setErr('The current password is incorrect.'); return; }
          const p = passwordProblem(state.settings, pw.next); if (p) { setErr(p); return; }
          update((d) => { const x = d.customers.find((y) => y.id === c.id); x.password = pw.next; d.deviceCredentials.filter((k) => k.owner.type === 'customer' && k.owner.id === c.id && !k.revokedAt).forEach((k) => { k.revokedAt = new Date().toISOString(); k.revokedReason = 'password_changed'; }); audit(d, 'auth.password_changed', `${x.name} changed the password; PIN / biometric sign-in turned off on all phones`, { severity: 'warning' }); });
          setErr(''); setPw({ cur: '', next: '' }); toast('Password changed. PIN / biometric sign-in on your phones was turned off.');
        }}>Change password</button></div>
      </div>
      <div className="card card-pad" style={{ marginTop: 16 }}>
        <h3>PIN & fingerprint / face sign-in</h3>
        <p className="muted">Turned on in the Hope phone app, per phone. <Link to="/mobile">Open the phone simulator</Link>.</p>
        {creds.length ? creds.map((k) => <div key={k.id} className="row between" style={{ padding: '8px 0', borderTop: '1px solid var(--line-2)' }}><span><Icon name={k.method === 'pin' ? 'key' : 'fingerprint'} /> {k.method === 'pin' ? 'PIN' : 'Biometrics'} · {k.deviceName}</span><button type="button" className="btn ghost xs" onClick={() => update((d) => { const x = d.deviceCredentials.find((y) => y.id === k.id); x.revokedAt = new Date().toISOString(); x.revokedReason = 'turned_off_web'; audit(d, 'auth.device_sign_in_disabled', `${k.method} sign-in turned off from the website (${k.deviceName})`); })}>Turn off</button></div>) : <p className="mini">Not turned on on any phone.</p>}
      </div>
      <div className="card card-pad" style={{ marginTop: 16 }}>
        <h3>Your data (Data Privacy Act)</h3>
        <p className="muted">Request a copy, correction or deletion of your personal data.</p>
        <div className="row"><button type="button" className="btn ghost" onClick={() => { update((d) => audit(d, 'privacy.request', `${c.name} requested a copy of personal data`)); toast('Request sent. Hope will reply within 15 days.'); }}>Request a copy</button><button type="button" className="btn ghost danger" onClick={() => { update((d) => audit(d, 'privacy.request', `${c.name} requested deletion of the account`, { severity: 'warning' })); toast('Deletion request sent.'); }}>Delete my account</button></div>
      </div>
    </>
  );
}
