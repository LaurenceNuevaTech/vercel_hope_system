import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import Icon from '../lib/icons.jsx';
import { audit, customerName, me, staffName, useStore } from '../lib/store.jsx';
import { can, visible } from '../lib/auth.js';
import { cancelDeal, closeDeal, commissionCollected, createDeal, overrideRate, previewDeal, recordPayment, setCommission, setFeeOverride, voidPayment } from '../lib/actions.js';
import { FEE_METHODS, LEAD_SOURCES, OFFLINE_SOURCES, isSystemSource, sourceLabel } from '../lib/catalog.js';
import { coverPhoto } from '../lib/art.js';
import { COMMISSION_STATUS, DEAL_STATUS, PAYMENT_KINDS } from '../lib/catalog.js';
import { downloadCsv, fmtDate, fmtDateTime, peso, pesoCents, sum } from '../lib/format.js';
import { Badge, Empty, Field, Modal, PromptModal, Tabs } from '../components.jsx';
import { ComputationTable, DealSheetPrint, ReceiptPrint, VoucherPrint } from '../printables.jsx';
import { Page } from './AdminApp.jsx';
import { Timeline } from './Audit.jsx';

export function Deals() {
  const { state } = useStore();
  const nav = useNavigate();
  const [sp, setSp] = useSearchParams();
  const [tab, setTab] = useState('open');
  const rows = visible(state, 'deals', state.deals);
  const f = { open: (d) => ['reserved', 'processing'].includes(d.status), closed: (d) => d.status === 'closed', cancelled: (d) => d.status === 'cancelled' };
  const list = rows.filter(f[tab]).sort((a, b) => (b.closedAt || b.reservedAt).localeCompare(a.closedAt || a.reservedAt));
  const newFor = sp.get('new');
  return (
    <Page title="Deals" sub="Reservations, sales and leases. Closing a deal locks the commission computation and bills the NuevaTech fee." actions={can(state, 'deals.create') && <button type="button" className="btn" onClick={() => setSp({ new: '1' })}><Icon name="plus" />New deal</button>}>
      <div className="card">
        <Tabs value={tab} onChange={setTab} tabs={[{ key: 'open', label: 'Open', count: rows.filter(f.open).length }, { key: 'closed', label: 'Closed', count: rows.filter(f.closed).length }, { key: 'cancelled', label: 'Cancelled', count: rows.filter(f.cancelled).length }]} />
        {list.length ? <div className="table-wrap"><table className="t"><thead><tr><th>Deal</th><th>Buyer / tenant</th><th>Agent</th><th>Source</th><th className="r">Price</th><th className="r">Commission</th><th>Status</th><th>{tab === 'closed' ? 'Closed' : 'Reserved'}</th></tr></thead><tbody>
          {list.map((d) => { const l = state.listings.find((x) => x.id === d.listingId); const c = d.computation || previewDeal(state, d); return (
            <tr key={d.id} className="click" onClick={() => nav(`/admin/deals/${d.id}`)}><td><b className="mono">{d.code}</b><div className="mini ellipsis" style={{ maxWidth: 260 }}>{l?.title}</div></td><td>{customerName(state, d.customerId)}</td><td>{staffName(state, d.agentId)}</td><td><span className={`badge ${isSystemSource(d.source) ? 'info' : 'muted'}`}>{sourceLabel(d.source)}</span></td><td className="r num">{peso(d.price)}{d.type === 'rent' ? '/mo' : ''}</td><td className="r num">{peso(c.gross)}{!d.computation && <div className="mini">preview</div>}</td><td><Badge tone={DEAL_STATUS[d.status].tone}>{DEAL_STATUS[d.status].label}</Badge></td><td className="mini">{fmtDate(d.closedAt || d.reservedAt)}</td></tr>); })}
        </tbody></table></div> : <Empty icon="handshake" title="No deals here" />}
      </div>
      {newFor && <NewDeal listingId={newFor === '1' ? '' : newFor} leadId={sp.get('lead')} onClose={() => setSp({})} onDone={(d) => { setSp({}); nav(`/admin/deals/${d.id}`); }} />}
    </Page>
  );
}

function NewDeal({ listingId, leadId, onClose, onDone }) {
  const { state, update, toast } = useStore();
  const avail = visible(state, 'listings', state.listings).filter((l) => l.status === 'published' && !l.deleted);
  const lead = state.inquiries.find((q) => q.id === leadId);
  const [lid, setLid] = useState(listingId || avail[0]?.id || '');
  const [cid, setCid] = useState(lead?.customerId || '');
  const l = state.listings.find((x) => x.id === lid);
  const [price, setPrice] = useState(l?.price || '');
  const [scheme, setScheme] = useState('Cash');
  const [lease, setLease] = useState(state.settings.deals.terms.leaseMonths);
  const [days, setDays] = useState(3);
  const [src, setSrc] = useState('');
  const [err, setErr] = useState('');
  useEffect(() => { if (l) setPrice(l.price); }, [lid]); // eslint-disable-line react-hooks/exhaustive-deps
  const leads = state.inquiries.filter((q) => q.listingId === lid && !['won', 'lost'].includes(q.stage));
  const matched = (lead?.listingId === lid && lead) || leads.find((q) => q.customerId === cid);
  const source = matched?.source || src;
  const preview = l ? previewDeal(state, { type: l.purpose, group: l.group, category: l.category, source, price: Number(price), unit: l.priceUnit, leaseMonths: lease, days, agentId: l.agentId, managerId: state.teams.find((t) => t.id === l.teamId)?.managerId }) : null;
  return (
    <Modal title="New deal (reservation)" onClose={onClose} width={640} footer={<><button type="button" className="btn ghost" onClick={onClose}>Cancel</button><button type="button" className="btn" disabled={!l || !cid || !source} onClick={() => { const d = update((x) => createDeal(x, { listingId: lid, customerId: cid, inquiryId: matched?.id, source, price, scheme, leaseMonths: lease, days })); if (d.error) { setErr(d.error); return; } toast(`Deal ${d.code} created. ${l.code} is now Reserved.`); onDone(d); }}>Create deal</button></>}>
      <div className="stack">
        <Field label="Listing"><select value={lid} onChange={(e) => setLid(e.target.value)}>{avail.map((x) => <option key={x.id} value={x.id}>{x.code} · {x.title}</option>)}{l && !avail.includes(l) && <option value={l.id}>{l.code} · {l.title}</option>}</select></Field>
        <Field label="Buyer / tenant" hint={leads.length ? `${leads.length} customer(s) inquired about this listing` : 'Customers with an account'}><select value={cid} onChange={(e) => setCid(e.target.value)}><option value="">Choose…</option>{leads.map((q) => <option key={q.id} value={q.customerId}>★ {customerName(state, q.customerId)} (inquired)</option>)}{state.customers.filter((c) => !leads.some((q) => q.customerId === c.id)).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></Field>
        {cid && (matched
          ? <div className="note">Where the buyer came from: <b>{sourceLabel(matched.source)}</b> (taken from the inquiry; it can't be changed). {isSystemSource(matched.source) ? 'This sale came through the system.' : ''}</div>
          : <Field label="Where did this buyer come from?" hint="No inquiry in the system for this buyer. Required: it shows on the deal, the NuevaTech fee line and in Analytics."><select value={src} onChange={(e) => setSrc(e.target.value)}><option value="">Choose…</option><optgroup label="Offline">{OFFLINE_SOURCES.map((k) => <option key={k} value={k}>{LEAD_SOURCES[k]}</option>)}</optgroup><optgroup label="Through the system">{Object.keys(LEAD_SOURCES).filter((k) => !OFFLINE_SOURCES.includes(k)).map((k) => <option key={k} value={k}>{LEAD_SOURCES[k]}</option>)}</optgroup></select></Field>)}
        {err && <div className="note bad">{err}</div>}
        <div className="grid3">
          <Field label={l?.purpose === 'rent' ? `Agreed rent / ${l?.priceUnit === 'day' ? 'day' : 'month'}` : 'Agreed price'}><input type="number" value={price} onChange={(e) => setPrice(e.target.value)} /></Field>
          {l?.purpose === 'sale' ? <Field label="Payment scheme"><select value={scheme} onChange={(e) => setScheme(e.target.value)}>{['Cash', 'Bank financing', 'Pag-IBIG', 'In-house financing'].map((x) => <option key={x}>{x}</option>)}</select></Field>
            : l?.priceUnit === 'day' ? <Field label="Days"><input type="number" value={days} onChange={(e) => setDays(Number(e.target.value))} /></Field> : <Field label="Lease (months)"><input type="number" value={lease} onChange={(e) => setLease(Number(e.target.value))} /></Field>}
        </div>
        {preview && <><h4 style={{ margin: '6px 0 0' }}>Computation preview</h4><ComputationTable c={preview} deal={{ type: l.purpose, price: Number(price), unit: l.priceUnit }} /></>}
      </div>
    </Modal>
  );
}

export function DealDetail() {
  const { id } = useParams();
  const { state, update, toast } = useStore();
  const [modal, setModal] = useState(null);
  const [rc, setRc] = useState(null);
  const [vc, setVc] = useState(null);
  const d = state.deals.find((x) => x.id === id);
  if (!d) return <Page title="Deal"><Empty title="Not found" /></Page>;
  const l = state.listings.find((x) => x.id === d.listingId);
  const c = d.computation || previewDeal(state, d);
  const pays = state.payments.filter((p) => p.dealId === d.id);
  const coms = state.commissions.filter((x) => x.dealId === d.id);
  const fee = state.fees.find((x) => x.dealId === d.id);
  const collected = commissionCollected(state, d.id);
  const open = ['reserved', 'processing'].includes(d.status);
  const history = state.audit.filter((a) => a.subject?.type === 'deal' && a.subject.id === d.id);
  const run = (fn, msg) => { const e = update(fn); if (e) toast(e, 'err'); else toast(msg); };
  return (
    <Page title={`Deal ${d.code}`} sub={<><Link to={`/admin/listings/${l?.id}`}>{l?.title}</Link> · {d.type === 'rent' ? 'Lease' : 'Sale'} · {d.scheme}</>}
      actions={<>
        <button type="button" className="btn ghost" onClick={() => setModal('sheet')}><Icon name="print" />Computation sheet</button>
        {open && can(state, 'payments.record') && <button type="button" className="btn ghost" onClick={() => setModal('pay')}><Icon name="receipt" />Record payment</button>}
        {d.status === 'closed' && can(state, 'payments.record') && collected < c.gross - 0.01 && <button type="button" className="btn ghost" onClick={() => setModal('pay')}><Icon name="receipt" />Record commission collected</button>}
        {open && d.status === 'reserved' && <button type="button" className="btn ghost" onClick={() => run((x) => { const y = x.deals.find((z) => z.id === d.id); y.status = 'processing'; audit(x, 'deal.processing', `${d.code} moved to Processing documents`, { subject: { type: 'deal', id: d.id, label: d.code } }); }, 'Moved to processing.')}>Start documents</button>}
        {open && can(state, 'deals.close') && <button type="button" className="btn ok" onClick={() => setModal('close')}><Icon name="check" />Close deal</button>}
      </>}>
      <div className="row" style={{ marginBottom: 14 }}><Badge tone={DEAL_STATUS[d.status].tone}>{DEAL_STATUS[d.status].label}</Badge><span className="mini">Reserved {fmtDate(d.reservedAt)}{d.closedAt ? ` · closed ${fmtDateTime(d.closedAt)} by ${staffName(state, d.closedBy)}` : ''}</span></div>
      {d.status === 'cancelled' && <div className="note bad" style={{ marginBottom: 14 }}>Cancelled {fmtDateTime(d.cancelledAt)}: {d.cancelReason}</div>}
      <div className="editor-grid">
        <div className="stack">
          <div className="card">
            <div className="card-h"><h3>Computation {d.computation ? <Badge tone="ok" icon="lock">locked at closing</Badge> : <Badge tone="info">live preview with current settings</Badge>}</h3><div className="row">{open && can(state, 'billing.rates') && <button type="button" className="btn ghost sm" onClick={() => setModal('fee')}><Icon name="crown" />{d.feeOverride ? 'NuevaTech fee: set for this deal' : 'NuevaTech fee'}</button>}{open && can(state, 'deals.override_rate') && <button type="button" className="btn ghost sm" onClick={() => setModal('rate')}><Icon name="percent" />{d.rateOverride != null ? `Rate: ${d.rateOverride}` : 'Change rate'}</button>}</div></div>
            <div className="card-b"><ComputationTable c={c} deal={d} /><p className="mini" style={{ marginTop: 8 }}>Hope's commission is paid by the seller / owner. The NuevaTech fee is paid by Hope out of its share (billed monthly). Change the rates in Settings → Commission & splits and NuevaTech platform fee.</p></div>
          </div>
          <div className="card">
            <div className="card-h"><h3>Payments & receipts</h3><span className="mini">Commission collected {peso(collected)} of {peso(c.gross)}</span></div>
            {pays.length ? <div className="table-wrap"><table className="t"><thead><tr><th>Receipt</th><th>Date</th><th>Kind</th><th>From</th><th className="r">Amount</th><th /></tr></thead><tbody>
              {pays.map((p) => <tr key={p.id} style={p.void ? { opacity: 0.55 } : null}><td className="mono nowrap">{p.no}{p.void && <> <Badge tone="bad">void</Badge></>}</td><td className="mini">{fmtDateTime(p.at)}</td><td>{PAYMENT_KINDS[p.kind].label}</td><td>{p.payer}<div className="mini">{p.method}{p.online ? ' · online' : ''}</div></td><td className="r num">{pesoCents(p.amount)}</td><td className="r nowrap"><button type="button" className="btn ghost xs" onClick={() => setRc(p)}><Icon name="print" /></button>{!p.void && can(state, 'payments.void') && <button type="button" className="btn ghost xs" onClick={() => setModal({ void: p })}>Void</button>}</td></tr>)}
            </tbody></table></div> : <Empty icon="receipt" title="No payments yet" />}
          </div>
          {coms.length > 0 && <div className="card"><div className="card-h"><h3>Commissions</h3></div><div className="table-wrap"><table className="t"><tbody>{coms.map((x) => <tr key={x.id}><td className="mono">{x.no}</td><td>{staffName(state, x.staffId)} <span className="mini">({x.role})</span></td><td className="r num">{pesoCents(x.net)}</td><td><Badge tone={COMMISSION_STATUS[x.status].tone}>{COMMISSION_STATUS[x.status].label}</Badge></td><td className="r"><button type="button" className="btn ghost xs" onClick={() => setVc(x)}><Icon name="print" /></button></td></tr>)}</tbody></table></div>{fee && <div className="card-b mini">NuevaTech platform fee: <b>{pesoCents(fee.amount)}</b> ({fee.basis}) · {fee.status}</div>}</div>}
          <div className="card card-pad"><h3>History</h3><Timeline entries={history} /></div>
        </div>
        <div className="stack">
          <div className="card card-pad"><img src={coverPhoto(l)} alt="" style={{ borderRadius: 10, aspectRatio: '16/10', objectFit: 'cover', width: '100%' }} /><dl className="kv" style={{ marginTop: 12 }}><dt>Buyer / tenant</dt><dd>{customerName(state, d.customerId)}</dd><dt>Seller / owner</dt><dd>{d.sellerName}</dd><dt>Source</dt><dd><span className={`badge ${isSystemSource(d.source) ? 'info' : 'muted'}`}>{sourceLabel(d.source)}</span>{d.inquiryId ? <div className="mini">from the inquiry</div> : <div className="mini">entered by staff</div>}</dd><dt>Agent</dt><dd>{staffName(state, d.agentId)}</dd><dt>Manager</dt><dd>{d.managerId ? staffName(state, d.managerId) : '—'}</dd><dt>Price</dt><dd>{peso(d.price)}{d.type === 'rent' ? (d.unit === 'day' ? ' / day' : ' / month') : ''}</dd>{d.leaseMonths && <><dt>Lease</dt><dd>{d.leaseMonths} months</dd></>}</dl></div>
          <div className="card card-pad"><h3>Documents</h3>{d.documents.map((x, i) => <label key={x.name} className="check" style={{ padding: '5px 0' }}><input type="checkbox" checked={x.done} disabled={!open} onChange={(e) => update((s) => { const y = s.deals.find((z) => z.id === d.id); y.documents[i].done = e.target.checked; audit(s, 'deal.document', `${d.code}: ${x.name} ${e.target.checked ? 'received' : 'unchecked'}`, { subject: { type: 'deal', id: d.id, label: d.code } }); })} /><span>{x.name}</span></label>)}<p className="mini">The customer sees this checklist in the portal and the app.</p></div>
          {open && can(state, 'deals.cancel') && <button type="button" className="btn danger ghost" onClick={() => setModal('cancel')}>Cancel deal</button>}
        </div>
      </div>
      {modal === 'sheet' && <DealSheetPrint deal={d} computation={c} onClose={() => setModal(null)} />}
      {modal === 'pay' && <RecordPayment d={d} onClose={() => setModal(null)} onDone={(p) => { setModal(null); setRc(p); }} />}
      {modal === 'close' && (
        <Modal title={`Close ${d.code}?`} onClose={() => setModal(null)} width={560} footer={<><button type="button" className="btn ghost" onClick={() => setModal(null)}>Cancel</button><button type="button" className="btn ok" onClick={() => { run((x) => closeDeal(x, d.id), `Closed. ${l?.code} is now ${d.type === 'rent' ? 'Rented' : 'Sold'}.`); setModal(null); }}>Close deal</button></>}>
          <p>This locks the computation below, marks the listing {d.type === 'rent' ? 'Rented' : 'Sold'}, creates the commission vouchers and adds the NuevaTech platform fee to this month's statement.</p>
          <ComputationTable c={c} deal={d} />
          {d.documents.some((x) => !x.done) && <div className="note warn">Some documents are not checked yet.</div>}
        </Modal>
      )}
      {modal === 'cancel' && <PromptModal title="Cancel deal" label="Reason" danger confirm="Cancel deal" onClose={() => setModal(null)} onSubmit={(t) => update((x) => cancelDeal(x, d.id, t))}><p className="mini">The listing goes back to Published.</p></PromptModal>}
      {modal === 'rate' && <RateModal d={d} onClose={() => setModal(null)} />}
      {modal === 'fee' && <FeeModal d={d} onClose={() => setModal(null)} />}
      {modal?.void && <PromptModal title={`Void ${modal.void.no}`} label="Reason" danger confirm="Void receipt" onClose={() => setModal(null)} onSubmit={(t) => update((x) => voidPayment(x, modal.void.id, t))}><p className="mini">The receipt stays in the records, marked VOID.</p></PromptModal>}
      {rc && <ReceiptPrint payment={rc} onClose={() => setRc(null)} />}
      {vc && <VoucherPrint commission={vc} onClose={() => setVc(null)} />}
    </Page>
  );
}

function FeeModal({ d, onClose }) {
  const { state, update, toast } = useStore();
  const [useRules, setUseRules] = useState(!d.feeOverride);
  const [f, setF] = useState(d.feeOverride || { method: 'commission', rate: state.settings.platform.fee.ratePct, fixed: 0 });
  const [reason, setReason] = useState('');
  const [err, setErr] = useState('');
  const preview = previewDeal(state, { ...d, feeOverride: useRules ? null : { ...f, rate: Number(f.rate), fixed: Number(f.fixed) } });
  return (
    <Modal title={`NuevaTech fee for ${d.code}`} onClose={onClose} width={480} footer={<><button type="button" className="btn ghost" onClick={onClose}>Cancel</button><button type="button" className="btn" onClick={() => { const e = update((x) => setFeeOverride(x, d.id, useRules ? null : { method: f.method, rate: Number(f.rate), fixed: Number(f.fixed) }, reason)); if (e) setErr(e); else { toast('NuevaTech fee updated (audit-logged).'); onClose(); } }}>Save</button></>}>
      <div className="stack">
        <label className="check"><input type="radio" checked={useRules} onChange={() => setUseRules(true)} />Use the fee rules / default</label>
        <label className="check"><input type="radio" checked={!useRules} onChange={() => setUseRules(false)} />Set a fee for this deal only</label>
        {!useRules && <div className="grid2"><Field label="Fee"><select value={f.method} onChange={(e) => setF({ ...f, method: e.target.value })}>{Object.entries(FEE_METHODS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></Field>{f.method === 'fixed' ? <Field label="Amount (₱)"><input type="number" value={f.fixed} onChange={(e) => setF({ ...f, fixed: e.target.value })} /></Field> : <Field label="Rate (%)"><input type="number" step="0.1" value={f.rate} onChange={(e) => setF({ ...f, rate: e.target.value })} /></Field>}</div>}
        <div className="note">NuevaTech fee: <b>{pesoCents(preview.platformFee)}</b> ({preview.platformBasis}) · Hope net {pesoCents(preview.hopeNet)}</div>
        <Field label="Reason (kept in the audit log)"><input value={reason} onChange={(e) => setReason(e.target.value)} /></Field>
        {err && <div className="note bad">{err}</div>}
      </div>
    </Modal>
  );
}

function RateModal({ d, onClose }) {
  const { update, toast } = useStore();
  const [rate, setRate] = useState(d.rateOverride ?? '');
  const [reason, setReason] = useState('');
  const [err, setErr] = useState('');
  return (
    <Modal title="Commission rate for this deal" onClose={onClose} width={440} footer={<><button type="button" className="btn ghost" onClick={onClose}>Cancel</button><button type="button" className="btn" onClick={() => { const e = update((x) => overrideRate(x, d.id, rate, reason)); if (e) setErr(e); else { toast('Rate changed (audit-logged).'); onClose(); } }}>Save</button></>}>
      <div className="stack">
        <Field label={d.type === 'rent' && d.group === 'property' ? 'Months of rent' : 'Rate (%)'} hint="Leave empty to use the default from Settings."><input type="number" step="0.1" value={rate} onChange={(e) => setRate(e.target.value)} /></Field>
        <Field label="Reason (e.g. agreed with the owner)"><input value={reason} onChange={(e) => setReason(e.target.value)} /></Field>
        {err && <div className="note bad">{err}</div>}
      </div>
    </Modal>
  );
}

function RecordPayment({ d, onClose, onDone }) {
  const { state, update, toast } = useStore();
  const c = d.computation || previewDeal(state, d);
  const kinds = d.status === 'closed' ? ['commission'] : d.type === 'rent' ? ['deposit', 'advance', 'commission', 'other'] : ['reservation', 'down_payment', 'full_payment', 'commission', 'other'];
  const [f, setF] = useState({ kind: kinds[0], amount: kinds[0] === 'commission' ? c.gross - commissionCollected(state, d.id) : kinds[0] === 'reservation' ? state.settings.deals.terms.reservationFee : '', method: state.settings.deals.payments.methods[0], ref: '' });
  const [err, setErr] = useState('');
  return (
    <Modal title="Record payment" onClose={onClose} width={460} footer={<><button type="button" className="btn ghost" onClick={onClose}>Cancel</button><button type="button" className="btn" onClick={() => { const r = update((x) => recordPayment(x, d.id, f)); if (r.error) setErr(r.error); else { toast(`Receipt ${r.payment.no} issued.`); onDone(r.payment); } }}>Save & issue receipt</button></>}>
      <div className="stack">
        <Field label="Payment for"><select value={f.kind} onChange={(e) => setF({ ...f, kind: e.target.value, amount: e.target.value === 'commission' ? c.gross - commissionCollected(state, d.id) : f.amount })}>{kinds.map((k) => <option key={k} value={k}>{PAYMENT_KINDS[k].label}</option>)}</select></Field>
        <div className="grid2"><Field label="Amount"><input type="number" value={f.amount} onChange={(e) => setF({ ...f, amount: e.target.value })} /></Field><Field label="Method"><select value={f.method} onChange={(e) => setF({ ...f, method: e.target.value })}>{state.settings.deals.payments.methods.map((m) => <option key={m}>{m}</option>)}</select></Field></div>
        <Field label="Reference no. (bank / GCash / check)"><input value={f.ref} onChange={(e) => setF({ ...f, ref: e.target.value })} /></Field>
        <p className="mini">{f.kind === 'commission' ? `From the seller / owner (${d.sellerName}). Releases the agent commissions when fully collected.` : `From ${customerName(state, d.customerId)}. The customer is notified and sees the receipt in the portal / app.`}</p>
        {err && <div className="note bad">{err}</div>}
      </div>
    </Modal>
  );
}

export function Payments() {
  const { state } = useStore();
  const [rc, setRc] = useState(null);
  const [kind, setKind] = useState('');
  const deals = new Set(visible(state, 'deals', state.deals).map((d) => d.id));
  const rows = state.payments.filter((p) => deals.has(p.dealId) && (!kind || p.kind === kind)).sort((a, b) => b.at.localeCompare(a.at));
  const total = sum(rows.filter((p) => !p.void), (p) => p.amount);
  return (
    <Page title="Payments & receipts" sub="Every amount received, with its acknowledgement receipt." actions={<button type="button" className="btn ghost" onClick={() => downloadCsv('hope-payments.csv', ['Receipt', 'Date', 'Deal', 'Kind', 'Payer', 'Method', 'Ref', 'Amount', 'Void'], rows.map((p) => [p.no, p.at, state.deals.find((d) => d.id === p.dealId)?.code, p.kind, p.payer, p.method, p.ref, p.amount, p.void ? p.void.reason : '']))}><Icon name="download" />CSV</button>}>
      <div className="card">
        <div className="toolbar"><select className="input" style={{ width: 'auto' }} value={kind} onChange={(e) => setKind(e.target.value)}><option value="">All kinds</option>{Object.entries(PAYMENT_KINDS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}</select><span className="grow" /><b>Total {peso(total)}</b></div>
        <div className="table-wrap"><table className="t"><thead><tr><th>Receipt</th><th>Date</th><th>Deal</th><th>Kind</th><th>Payer</th><th className="r">Amount</th><th /></tr></thead><tbody>
          {rows.slice(0, 200).map((p) => <tr key={p.id} style={p.void ? { opacity: 0.55 } : null}><td className="mono nowrap">{p.no}{p.void && <> <Badge tone="bad">void</Badge></>}</td><td className="mini">{fmtDateTime(p.at)}</td><td><Link to={`/admin/deals/${p.dealId}`}>{state.deals.find((d) => d.id === p.dealId)?.code}</Link></td><td>{PAYMENT_KINDS[p.kind].label}</td><td>{p.payer}<div className="mini">{p.method}{p.online ? ' · online' : ''}</div></td><td className="r num">{pesoCents(p.amount)}</td><td className="r"><button type="button" className="btn ghost xs" onClick={() => setRc(p)}><Icon name="print" />Receipt</button></td></tr>)}
        </tbody></table></div>
      </div>
      {rc && <ReceiptPrint payment={rc} onClose={() => setRc(null)} />}
    </Page>
  );
}

export function Commissions() {
  const { state, update, toast } = useStore();
  const s = me(state);
  const [tab, setTab] = useState('open');
  const [vc, setVc] = useState(null);
  const all = can(state, 'commissions.view_all') ? state.commissions : state.commissions.filter((c) => c.staffId === s.id);
  const rows = all.filter((c) => (tab === 'open' ? c.status !== 'paid' : c.status === 'paid')).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const mineOnly = !can(state, 'commissions.view_all');
  return (
    <Page title={mineOnly ? 'My commissions' : 'Commissions'} sub="Created when a deal is closed. Released after Hope collects its commission from the seller, approved by Finance / Owner, then paid with a voucher.">
      <div className="stat-row" style={{ marginBottom: 14 }}>
        {Object.entries(COMMISSION_STATUS).map(([k, v]) => <div key={k} className="stat card"><div><div className="stat-v num">{peso(sum(all.filter((c) => c.status === k), (c) => c.net))}</div><div className="stat-l">{v.label} ({all.filter((c) => c.status === k).length})</div></div></div>)}
      </div>
      <div className="card">
        <Tabs value={tab} onChange={setTab} tabs={[{ key: 'open', label: 'To pay', count: all.filter((c) => c.status !== 'paid').length }, { key: 'paid', label: 'Paid', count: all.filter((c) => c.status === 'paid').length }]} />
        {rows.length ? <div className="table-wrap"><table className="t"><thead><tr><th>Voucher</th><th>Payee</th><th>Deal</th><th className="r">Share</th><th className="r">Tax</th><th className="r">Net</th><th>Status</th><th /></tr></thead><tbody>
          {rows.map((c) => { const d = state.deals.find((x) => x.id === c.dealId); return <tr key={c.id}><td className="mono">{c.no}</td><td>{staffName(state, c.staffId)}<div className="mini">{c.role === 'manager' ? 'Manager override' : 'Agent'}</div></td><td><Link to={`/admin/deals/${c.dealId}`}>{d?.code}</Link><div className="mini">{fmtDate(c.createdAt)}</div></td><td className="r num">{pesoCents(c.gross)}</td><td className="r num">{pesoCents(c.wht)}</td><td className="r num"><b>{pesoCents(c.net)}</b></td><td><Badge tone={COMMISSION_STATUS[c.status].tone}>{COMMISSION_STATUS[c.status].label}</Badge>{c.paidAt && <div className="mini">{fmtDate(c.paidAt)}</div>}</td>
            <td className="r nowrap">{c.status === 'for_approval' && can(state, 'commissions.approve') && <button type="button" className="btn ok xs" onClick={() => { update((x) => setCommission(x, c.id, 'approved')); toast('Approved.'); }}>Approve</button>} {c.status === 'approved' && can(state, 'commissions.pay') && <button type="button" className="btn xs" onClick={() => { update((x) => setCommission(x, c.id, 'paid')); toast('Marked as paid.'); }}>Mark paid</button>} <button type="button" className="btn ghost xs" onClick={() => setVc(c)}><Icon name="print" /></button></td></tr>; })}
        </tbody></table></div> : <Empty icon="wallet" title="Nothing here" />}
      </div>
      {vc && <VoucherPrint commission={vc} onClose={() => setVc(null)} />}
    </Page>
  );
}
