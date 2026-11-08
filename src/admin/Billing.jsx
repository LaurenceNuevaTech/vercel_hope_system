import { useState } from 'react';
import { Link } from 'react-router-dom';
import Icon from '../lib/icons.jsx';
import { readPhoto, staffName, useStore } from '../lib/store.jsx';
import { can } from '../lib/auth.js';
import { confirmStatement, generateStatement, rejectStatementPayment, saveFeeRules, statementStatus, submitStatementPayment } from '../lib/actions.js';
import { FEE_METHODS, STATEMENT_STATUS, isSystemSource, sourceLabel } from '../lib/catalog.js';
import { computeDeal } from '../lib/money.js';
import { fmtDate, fmtDateTime, fmtMonth, peso, pesoCents, sum, ym } from '../lib/format.js';
import { Badge, Empty, Field, Modal, PromptModal, Stat, Tabs } from '../components.jsx';
import { NuevaReceiptPrint, StatementPrint } from '../printables.jsx';
import { Page } from './AdminApp.jsx';

export default function Billing() {
  const { state, update, toast } = useStore();
  const [tab, setTab] = useState('statements');
  const [print, setPrint] = useState(null);
  const [pay, setPay] = useState(null);
  const [ret, setRet] = useState(null);
  const pf = state.settings.platform.fee;
  const isNueva = can(state, 'billing.confirm');
  const statements = [...state.statements].sort((a, b) => b.period.localeCompare(a.period));
  const unpaid = statements.filter((s) => s.status !== 'paid');
  const thisYear = String(new Date().getFullYear());
  const paidYtd = sum(statements.filter((s) => s.status === 'paid' && s.confirmedAt?.startsWith(thisYear)), (s) => s.total);
  const unbilledMonths = [...new Set(state.fees.filter((f) => f.status === 'unbilled').map((f) => f.month))].sort();
  const unbilled = sum(state.fees.filter((f) => f.status === 'unbilled'), (f) => f.amount);
  const method = pf.enabled === false ? 'switched off' : pf.method === 'commission' ? `${pf.ratePct}% of Hope's commission` : pf.method === 'price' ? `${pf.ratePct}% of the deal price` : `fixed ${peso(pf.fixedSale)} per sale / ${peso(pf.fixedRent)} per rental`;
  const rulesOn = (state.settings.platform.rules || []).filter((r) => r.active).length;

  return (
    <Page title="NuevaTech billing" sub={`NuevaTech is the third-party system provider. Hope pays a platform fee for every successful deal, set by the Owner: default ${method}${rulesOn ? ` with ${rulesOn} category rule(s)` : ''}. Paid from Hope's share, not the agent's. Billed monthly.`}
      actions={<Link to="/admin/settings/platform" className="btn ghost"><Icon name="gear" />{can(state, 'billing.rates') ? 'Default fee' : 'View fee'}</Link>}>
      <div className="stat-row">
        <Stat icon="receipt" tone={unpaid.length ? 'warn' : 'ok'} label="Unpaid statements" value={peso(sum(unpaid, (s) => s.total))} sub={unpaid.map((s) => s.no).join(', ') || 'All paid'} />
        <Stat icon="clock" tone="info" label={`Unbilled (${fmtMonth(ym(new Date()))} so far)`} value={peso(unbilled)} sub={`${state.fees.filter((f) => f.status === 'unbilled').length} closed deal(s)`} />
        <Stat icon="check" tone="ok" label={`Paid in ${thisYear}`} value={peso(paidYtd)} />
        <Stat icon="crown" tone="accent" label="All fees (12 months)" value={peso(sum(state.fees, (f) => f.amount))} sub={`${state.fees.length} deals`} />
      </div>
      {isNueva && unbilledMonths.length > 0 && (
        <div className="note" style={{ margin: '14px 0' }}>
          <b>Super Admin:</b> statements are issued automatically on the 1st of each month. Issue one now:{' '}
          {unbilledMonths.map((m) => <button type="button" key={m} className="btn soft xs" style={{ marginLeft: 6 }} onClick={() => { const r = update((d) => generateStatement(d, m)); toast(r.error || `Statement ${r.statement.no} issued to Hope.`, r.error ? 'err' : 'ok'); }}>Issue {fmtMonth(m)}</button>)}
        </div>
      )}
      <div className="card" style={{ marginTop: 14 }}>
        <Tabs value={tab} onChange={setTab} tabs={[{ key: 'statements', label: 'Statements of account', count: statements.length }, { key: 'fees', label: 'Fee per deal', count: state.fees.length }, { key: 'rules', label: 'Fee rules', count: rulesOn }, { key: 'how', label: 'How it works' }]} />
        {tab === 'rules' && <FeeRules />}
        {tab === 'statements' && (statements.length ? <div className="table-wrap"><table className="t"><thead><tr><th>Statement</th><th>Period</th><th className="r">Deals</th><th className="r">Amount</th><th>Due</th><th>Status</th><th /></tr></thead><tbody>
          {statements.map((s) => { const st = statementStatus(s); const last = s.payments[s.payments.length - 1]; return (
            <tr key={s.id}><td className="mono"><b>{s.no}</b></td><td>{fmtMonth(s.period)}</td><td className="r num">{s.feeIds.length}</td><td className="r num"><b>{pesoCents(s.total)}</b></td><td className="mini">{fmtDate(s.dueAt)}</td>
              <td><Badge tone={STATEMENT_STATUS[st].tone}>{STATEMENT_STATUS[st].label}</Badge>{last && <div className="mini">{last.method} {last.ref} · {staffName(state, last.by)}</div>}{s.receiptNo && <div className="mini">Receipt {s.receiptNo}</div>}</td>
              <td className="r nowrap">
                <button type="button" className="btn ghost xs" onClick={() => setPrint({ s, kind: 'soa' })}><Icon name="print" />SOA</button>{' '}
                {['issued'].includes(s.status) && can(state, 'billing.pay') && <button type="button" className="btn xs" onClick={() => setPay(s)}>Pay</button>}{' '}
                {s.status === 'submitted' && isNueva && <><button type="button" className="btn ok xs" onClick={() => { update((d) => confirmStatement(d, s.id)); toast('Payment confirmed; receipt issued to Hope.'); }}>Confirm</button> <button type="button" className="btn ghost xs" onClick={() => setRet(s)}>Return</button></>}
                {s.status === 'paid' && <button type="button" className="btn ghost xs" onClick={() => setPrint({ s, kind: 'or' })}><Icon name="receipt" />Receipt</button>}
              </td></tr>); })}
        </tbody></table></div> : <Empty icon="crown" title="No statements yet" />)}
        {tab === 'fees' && <div className="table-wrap"><table className="t"><thead><tr><th>Deal</th><th>Closed</th><th>Property / vehicle</th><th>Source</th><th>Basis</th><th className="r">Fee</th><th>Status</th></tr></thead><tbody>
          {[...state.fees].sort((a, b) => b.closedAt.localeCompare(a.closedAt)).map((f) => { const d = state.deals.find((x) => x.id === f.dealId); const l = state.listings.find((x) => x.id === d?.listingId); return <tr key={f.id}><td><Link to={`/admin/deals/${d?.id}`} className="mono">{d?.code}</Link></td><td className="mini">{fmtDate(f.closedAt)}</td><td className="ellipsis" style={{ maxWidth: 260 }}>{l?.title}</td><td><span className={`badge ${isSystemSource(f.source || d?.source) ? 'info' : 'muted'}`}>{sourceLabel(f.source || d?.source)}</span></td><td className="mini">{f.basis}</td><td className="r num">{pesoCents(f.amount)}</td><td><Badge tone={f.status === 'paid' ? 'ok' : f.status === 'billed' ? 'warn' : 'info'}>{f.status}</Badge></td></tr>; })}
        </tbody></table></div>}
        {tab === 'how' && (
          <div className="card-b how">
            <ol>
              <li><b>A deal is closed</b> by a Manager / Admin / Owner. The system computes Hope's commission and locks the rates.</li>
              <li><b>The platform fee is added</b> to the current month. Which fee: the one set on the deal by the Owner, else the first matching <b>fee rule</b> (category, sale / rent), else the default ({method}). Setting “Fee becomes billable when”: {pf.trigger === 'closed' ? 'the deal is closed' : 'Hope has collected its commission'}.</li>
              <li><b>On the 1st</b>, NuevaTech issues a <b>Statement of Account</b> for last month's fees; the Owner and Finance are notified (email + in-app). Due in {state.settings.platform.billing.dueDays} days.</li>
              <li><b>The Owner / Finance pays</b> (bank / GCash) and submits the reference and proof here.</li>
              <li><b>The Super Admin confirms</b> the payment; NuevaTech's official receipt is issued and printable. Unconfirmed payments can be returned with a reason.</li>
            </ol>
            <p className="mini">The Owner sets the fee (default in Settings → NuevaTech platform fee, rules in the Fee rules tab, or per deal on the deal page) and can switch it off. Every change is audit-logged and applies only to deals closed afterwards; closed deals keep their fee.</p>
          </div>
        )}
      </div>
      {print?.kind === 'soa' && <StatementPrint statement={print.s} onClose={() => setPrint(null)} />}
      {print?.kind === 'or' && <NuevaReceiptPrint statement={print.s} onClose={() => setPrint(null)} />}
      {pay && <PayStatement s={pay} onClose={() => setPay(null)} />}
      {ret && <PromptModal title="Return payment" label="Reason (sent to the Owner)" confirm="Return" danger onClose={() => setRet(null)} onSubmit={(t) => { update((d) => rejectStatementPayment(d, ret.id, t)); return null; }} />}
    </Page>
  );
}

function FeeRules() {
  const { state, update, toast } = useStore();
  const editable = can(state, 'billing.rates');
  const [rules, setRules] = useState(() => structuredClone(state.settings.platform.rules || []));
  const dirty = JSON.stringify(rules) !== JSON.stringify(state.settings.platform.rules || []);
  const set = (i, k, v) => setRules(rules.map((r, j) => (j === i ? { ...r, [k]: v } : r)));
  const move = (i, d) => { const n = [...rules]; const [x] = n.splice(i, 1); n.splice(i + d, 0, x); setRules(n); };
  const example = (r) => {
    const cat = r.categories[0] || 'house_lot';
    const group = state.categories.find((c) => c.key === cat)?.group || 'property';
    const purpose = r.purpose === 'rent' ? 'rent' : 'sale';
    const price = purpose === 'rent' ? (group === 'vehicle' ? 3500 : 30000) : group === 'vehicle' ? 1000000 : 5000000;
    const s2 = structuredClone(state.settings); s2.platform.rules = [{ ...r, active: true }];
    const c = computeDeal({ type: purpose, group, category: cat, price, unit: purpose === 'rent' ? (group === 'vehicle' ? 'day' : 'month') : 'total', leaseMonths: 12, days: 5 }, s2, { hasManager: true });
    return `${purpose === 'rent' ? 'Rent' : 'Sale'} ${peso(price)}${purpose === 'rent' ? (group === 'vehicle' ? '/day ×5' : '/mo') : ''}: commission ${peso(c.gross)} → fee ${pesoCents(c.platformFee)}`;
  };
  return (
    <div className="card-b stack">
      <div className="note">The <b>Owner</b> decides what NuevaTech gets. The first <b>active</b> rule that matches a deal's category and sale / rent is used; deals that match no rule use the <a href="/admin/settings/platform">default fee</a>. The Owner can also set the fee on a single deal before closing it (deal page). Changes apply to deals closed afterwards.</div>
      {rules.map((r, i) => (
        <div key={r.id} className={`list-ed ${r.active ? '' : 'off'}`}>
          <div className="list-ed-f" style={{ gridTemplateColumns: '1fr 1.4fr 120px 1.3fr 110px 60px' }}>
            <Field label="Rule name"><input value={r.label} disabled={!editable} onChange={(e) => set(i, 'label', e.target.value)} /></Field>
            <div className="field"><span>Categories (none = all)</span><div className="chips">{state.categories.map((c) => <button type="button" key={c.key} disabled={!editable} className={`chip ${r.categories.includes(c.key) ? 'on' : ''}`} onClick={() => set(i, 'categories', r.categories.includes(c.key) ? r.categories.filter((x) => x !== c.key) : [...r.categories, c.key])}>{c.label}</button>)}</div></div>
            <Field label="Deals"><select value={r.purpose} disabled={!editable} onChange={(e) => set(i, 'purpose', e.target.value)}><option value="any">Sale & rent</option><option value="sale">Sale</option><option value="rent">Rent</option></select></Field>
            <Field label="Fee"><select value={r.method} disabled={!editable} onChange={(e) => set(i, 'method', e.target.value)}>{Object.entries(FEE_METHODS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></Field>
            {r.method === 'fixed' ? <Field label="Amount (₱)"><input type="number" value={r.fixed} disabled={!editable} onChange={(e) => set(i, 'fixed', Number(e.target.value))} /></Field> : <Field label="Rate (%)"><input type="number" step="0.1" value={r.rate} disabled={!editable} onChange={(e) => set(i, 'rate', Number(e.target.value))} /></Field>}
            <label className="field"><span>On</span><input type="checkbox" checked={r.active} disabled={!editable} onChange={(e) => set(i, 'active', e.target.checked)} style={{ width: 20, height: 20 }} /></label>
          </div>
          {editable && <div className="list-ed-a"><button type="button" className="icon-btn" disabled={i === 0} onClick={() => move(i, -1)} aria-label="Up"><Icon name="up" /></button><button type="button" className="icon-btn" disabled={i === rules.length - 1} onClick={() => move(i, 1)} aria-label="Down"><Icon name="down" /></button><button type="button" className="icon-btn" onClick={() => setRules(rules.filter((_, j) => j !== i))} aria-label="Remove"><Icon name="trash" /></button></div>}
          <div className="mini rule-ex">Example · {example(r)}</div>
        </div>
      ))}
      {editable ? (
        <div className="row"><button type="button" className="btn ghost sm" onClick={() => setRules([...rules, { id: `fr${Date.now().toString(36)}`, label: 'New rule', categories: [], purpose: 'any', method: 'commission', rate: 5, fixed: 0, active: true }])}><Icon name="plus" />Add rule</button><span className="grow" />{dirty && <button type="button" className="btn ghost sm" onClick={() => setRules(structuredClone(state.settings.platform.rules || []))}>Discard</button>}<button type="button" className="btn sm" disabled={!dirty} onClick={() => { update((d) => saveFeeRules(d, rules)); toast('Fee rules saved. Recorded in the audit log.'); }}><Icon name="check" />Save rules</button></div>
      ) : <div className="mini"><Icon name="lock" size={13} /> Only the Owner (permission billing.rates) changes the fee rules.</div>}
    </div>
  );
}

function PayStatement({ s, onClose }) {
  const { state, update, toast } = useStore();
  const [f, setF] = useState({ amount: s.total, method: 'Bank transfer', ref: '', proof: null, note: '' });
  const [err, setErr] = useState('');
  return (
    <Modal title={`Pay ${s.no}`} onClose={onClose} width={480} footer={<><button type="button" className="btn ghost" onClick={onClose}>Cancel</button><button type="button" className="btn" onClick={() => { if (!f.ref.trim()) { setErr('Enter the reference number.'); return; } const e = update((d) => submitStatementPayment(d, s.id, f)); if (e) setErr(e); else { toast('Payment submitted. NuevaTech will confirm it.'); onClose(); } }}>Submit payment</button></>}>
      <div className="stack">
        <div className="note" style={{ whiteSpace: 'pre-line' }}>Pay to {state.settings.platform.billing.payee}{'\n'}{state.settings.platform.billing.bank}</div>
        <div className="grid2"><Field label="Amount"><input type="number" value={f.amount} onChange={(e) => setF({ ...f, amount: e.target.value })} /></Field><Field label="Method"><select value={f.method} onChange={(e) => setF({ ...f, method: e.target.value })}>{['Bank transfer', 'GCash', 'Check', 'Cash'].map((m) => <option key={m}>{m}</option>)}</select></Field></div>
        <Field label="Reference number"><input value={f.ref} onChange={(e) => setF({ ...f, ref: e.target.value })} /></Field>
        <Field label="Proof of payment (photo / screenshot)"><input type="file" accept="image/*" onChange={async (e) => { try { setF({ ...f, proof: await readPhoto(e.target.files[0], 900) }); } catch (x) { setErr(x.message); } }} /></Field>
        {f.proof && <img src={f.proof} alt="" style={{ maxHeight: 140, borderRadius: 8 }} />}
        {err && <div className="note bad">{err}</div>}
      </div>
    </Modal>
  );
}

