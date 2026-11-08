// Printable documents (Print / save as PDF from the browser):
// acknowledgement receipt, commission voucher, deal computation sheet,
// NuevaTech statement of account and NuevaTech official receipt.
import { useStore, staffName, customerName } from './lib/store.jsx';
import { PAYMENT_KINDS } from './lib/catalog.js';
import { amountInWords, fmtDate, fmtDateTime, fmtMonth, pesoCents } from './lib/format.js';
import { LogoMark, PrintModal } from './components.jsx';

function HopeHead({ title, no, date }) {
  const { state } = useStore();
  const b = state.settings.brand;
  return (
    <div className="print-head">
      <div className="row" style={{ alignItems: 'flex-start' }}>
        <LogoMark logo={b.identity.logo} size={44} />
        <div><b style={{ fontSize: 16 }}>{b.company.legalName}</b><div className="mini" style={{ fontStyle: 'italic' }}>{b.identity.slogan}</div><div className="mini">{b.company.address}</div><div className="mini">{b.company.phone} · {b.company.email} · TIN {b.company.tin}</div><div className="mini">{b.company.license}</div></div>
      </div>
      <div style={{ textAlign: 'right' }}><h2>{title}</h2><div className="mono" style={{ fontSize: 14, fontWeight: 700 }}>{no}</div><div className="mini">{date}</div></div>
    </div>
  );
}

function NuevaHead({ title, no, date }) {
  const { state } = useStore();
  return (
    <div className="print-head" style={{ borderColor: '#1877F2' }}>
      <div className="row" style={{ alignItems: 'center' }}>
        <svg viewBox="0 0 100 110" width="40" height="44" aria-hidden="true"><path d="M0 0h22l15 20H22v90H0zM28 28h14l30 38v26h-14L28 54zM78 0h22v110H78L62 90h16z" fill="#1877F2" /></svg>
        <div><b style={{ fontSize: 16, letterSpacing: '.06em' }}>NUEVA TECHNOLOGY</b><div className="mini">System provider of {state.settings.brand.identity.fullName}</div></div>
      </div>
      <div style={{ textAlign: 'right' }}><h2>{title}</h2><div className="mono" style={{ fontSize: 14, fontWeight: 700 }}>{no}</div><div className="mini">{date}</div></div>
    </div>
  );
}

export function ReceiptPrint({ payment, onClose }) {
  const { state } = useStore();
  const d = state.deals.find((x) => x.id === payment.dealId);
  const l = state.listings.find((x) => x.id === d?.listingId);
  const b = state.settings.brand.documents;
  return (
    <PrintModal title={`Receipt ${payment.no}`} onClose={onClose}>
      <div className="print-doc">
        {payment.void && <div className="void-stamp">VOID</div>}
        <HopeHead title="Acknowledgement Receipt" no={payment.no} date={fmtDateTime(payment.at)} />
        <p>Received from <b>{payment.payer}</b> the amount of <b>{amountInWords(payment.amount)}</b> (<b>{pesoCents(payment.amount)}</b>) as <b>{PAYMENT_KINDS[payment.kind]?.label.toLowerCase()}</b> for:</p>
        <table><tbody>
          <tr><th style={{ width: '32%' }}>Transaction</th><td>{d?.code} · {d?.type === 'rent' ? 'Lease' : 'Sale'}</td></tr>
          <tr><th>Property / vehicle</th><td>{l?.title} ({l?.code})</td></tr>
          <tr><th>Location</th><td>{l?.address}</td></tr>
          <tr><th>Payment method</th><td>{payment.method}{payment.ref ? ` · Ref. ${payment.ref}` : ''}{payment.online ? ' · paid online' : ''}</td></tr>
          <tr><th>Agent</th><td>{staffName(state, d?.agentId)}</td></tr>
        </tbody></table>
        {payment.void && <p className="err-text">Voided {fmtDateTime(payment.void.at)} by {staffName(state, payment.void.by)}: {payment.void.reason}</p>}
        <p className="mini">{b.receiptNote}</p>
        <div className="print-sign"><div>{payment.receivedBy ? staffName(state, payment.receivedBy) : 'Online payment (PayMongo)'}<br />Received by</div><div>{b.signatory}<br />{b.signatoryTitle}</div></div>
      </div>
    </PrintModal>
  );
}

export function VoucherPrint({ commission, onClose }) {
  const { state } = useStore();
  const d = state.deals.find((x) => x.id === commission.dealId);
  const l = state.listings.find((x) => x.id === d?.listingId);
  const c = d?.computation;
  const s = state.staff.find((x) => x.id === commission.staffId);
  return (
    <PrintModal title={`Commission voucher ${commission.no}`} onClose={onClose}>
      <div className="print-doc">
        <HopeHead title="Commission Voucher" no={commission.no} date={fmtDate(commission.paidAt || commission.createdAt)} />
        <table><tbody>
          <tr><th style={{ width: '32%' }}>Payee</th><td>{s?.name} · {commission.role === 'manager' ? 'Manager override' : 'Agent commission'}</td></tr>
          <tr><th>Deal</th><td>{d?.code} · {l?.title}</td></tr>
          <tr><th>Deal price</th><td>{pesoCents(d?.price)}{d?.type === 'rent' ? ' / month' : ''}</td></tr>
          <tr><th>Hope commission</th><td>{pesoCents(c?.gross)} ({c?.basis})</td></tr>
          <tr><th>Share</th><td>{commission.role === 'manager' ? c?.managerPct : c?.agentPct}% = {pesoCents(commission.gross)}</td></tr>
          <tr><th>Less withholding tax</th><td>{pesoCents(commission.wht)}</td></tr>
          <tr><th>Net payable</th><td><b>{pesoCents(commission.net)}</b> · {amountInWords(commission.net)}</td></tr>
          <tr><th>Status</th><td>{commission.status === 'paid' ? `Paid ${fmtDateTime(commission.paidAt)}` : commission.status}</td></tr>
        </tbody></table>
        <div className="print-sign"><div>{commission.approvedBy ? staffName(state, commission.approvedBy) : ''}<br />Approved by</div><div>{s?.name}<br />Received by</div></div>
      </div>
    </PrintModal>
  );
}

export function ComputationTable({ c, deal }) {
  if (!c) return null;
  return (
    <table className="t calc-table"><tbody>
      <tr><td>Deal price</td><td className="r num">{pesoCents(deal.price)}{deal.type === 'rent' ? (deal.unit === 'day' ? ' / day' : ' / month') : ''}</td></tr>
      {deal.type === 'rent' && <tr><td>Contract value</td><td className="r num">{pesoCents(c.value)}</td></tr>}
      <tr className="hl"><td><b>Hope's commission</b> <span className="mini">({c.basis}, paid by the seller / owner)</span></td><td className="r num"><b>{pesoCents(c.gross)}</b></td></tr>
      <tr><td>– Agent share ({c.agentPct}%)</td><td className="r num">{pesoCents(c.agentShare)}</td></tr>
      {c.managerShare > 0 && <tr><td>– Manager override ({c.managerPct}%)</td><td className="r num">{pesoCents(c.managerShare)}</td></tr>}
      <tr><td>= Hope's share</td><td className="r num">{pesoCents(c.hopeShare)}</td></tr>
      <tr><td>– NuevaTech platform fee <span className="mini">({c.platformBasis})</span></td><td className="r num">{pesoCents(c.platformFee)}</td></tr>
      <tr className="hl"><td><b>= Hope net</b></td><td className="r num"><b>{pesoCents(c.hopeNet)}</b></td></tr>
      {c.whtPct > 0 && <tr><td className="mini" colSpan={2}>Withholding tax {c.whtPct}% deducted from payouts: agent {pesoCents(c.agentWht)}{c.managerShare > 0 ? `, manager ${pesoCents(c.managerWht)}` : ''}.</td></tr>}
    </tbody></table>
  );
}

export function DealSheetPrint({ deal, computation, onClose }) {
  const { state } = useStore();
  const l = state.listings.find((x) => x.id === deal.listingId);
  return (
    <PrintModal title={`Deal ${deal.code}`} onClose={onClose}>
      <div className="print-doc">
        <HopeHead title="Deal Computation Sheet" no={deal.code} date={deal.closedAt ? `Closed ${fmtDate(deal.closedAt)}` : 'Preview (not closed)'} />
        <table><tbody>
          <tr><th style={{ width: '32%' }}>Property / vehicle</th><td>{l?.title} ({l?.code})</td></tr>
          <tr><th>Buyer / tenant</th><td>{customerName(state, deal.customerId)}</td></tr>
          <tr><th>Seller / owner</th><td>{deal.sellerName}</td></tr>
          <tr><th>Agent / Manager</th><td>{staffName(state, deal.agentId)}{deal.managerId ? ` / ${staffName(state, deal.managerId)}` : ''}</td></tr>
          <tr><th>Scheme</th><td>{deal.scheme}{deal.leaseMonths ? ` · ${deal.leaseMonths} months` : ''}</td></tr>
        </tbody></table>
        <ComputationTable c={computation} deal={deal} />
        {!deal.closedAt && <p className="mini">Preview with the current settings. The rates are locked when the deal is closed.</p>}
        <div className="print-sign"><div>{staffName(state, deal.agentId)}<br />Prepared by</div><div>{deal.closedBy ? staffName(state, deal.closedBy) : ''}<br />Approved by</div></div>
      </div>
    </PrintModal>
  );
}

export function StatementPrint({ statement, onClose }) {
  const { state } = useStore();
  const pf = state.settings.platform;
  const fees = state.fees.filter((f) => statement.feeIds.includes(f.id));
  const paid = statement.payments.reduce((a, p) => a + p.amount, 0);
  return (
    <PrintModal title={`Statement ${statement.no}`} onClose={onClose} width={720}>
      <div className="print-doc">
        <NuevaHead title="Statement of Account" no={statement.no} date={`Issued ${fmtDate(statement.issuedAt)}`} />
        <div className="row between" style={{ alignItems: 'flex-start' }}>
          <div><div className="mini">Bill to</div><b>{state.settings.brand.company.legalName}</b><div className="mini">{state.settings.brand.company.address}</div></div>
          <div style={{ textAlign: 'right' }}><div className="mini">Period</div><b>{fmtMonth(statement.period)}</b><div className="mini">Due {fmtDate(statement.dueAt)}</div></div>
        </div>
        <table>
          <thead><tr><th>Deal</th><th>Closed</th><th>Property / vehicle</th><th>Basis</th><th className="r">Fee</th></tr></thead>
          <tbody>
            {fees.map((f) => { const d = state.deals.find((x) => x.id === f.dealId); const l = state.listings.find((x) => x.id === d?.listingId); return <tr key={f.id}><td className="mono">{d?.code}</td><td>{fmtDate(f.closedAt)}</td><td>{l?.title}</td><td>{f.basis}</td><td className="r">{pesoCents(f.amount)}</td></tr>; })}
            <tr><td colSpan={4} className="r"><b>Total due</b></td><td className="r"><b>{pesoCents(statement.total)}</b></td></tr>
            {paid > 0 && <tr><td colSpan={4} className="r">Payments received</td><td className="r">{pesoCents(paid)}</td></tr>}
          </tbody>
        </table>
        <p className="mini" style={{ whiteSpace: 'pre-line' }}>Pay to: {pf.billing.payee}{'\n'}{pf.billing.bank}</p>
        <p className="mini">{pf.billing.note}</p>
      </div>
    </PrintModal>
  );
}

export function NuevaReceiptPrint({ statement, onClose }) {
  const { state } = useStore();
  const pay = statement.payments[statement.payments.length - 1];
  return (
    <PrintModal title={`NuevaTech receipt ${statement.receiptNo}`} onClose={onClose}>
      <div className="print-doc">
        <NuevaHead title="Official Receipt" no={statement.receiptNo} date={fmtDateTime(statement.confirmedAt)} />
        <p>Received from <b>{state.settings.brand.company.legalName}</b> the amount of <b>{amountInWords(pay?.amount || statement.total)}</b> (<b>{pesoCents(pay?.amount || statement.total)}</b>) in payment of the platform fees for <b>{fmtMonth(statement.period)}</b> under statement <b>{statement.no}</b>.</p>
        <table><tbody>
          <tr><th style={{ width: '32%' }}>Method</th><td>{pay?.method} {pay?.ref ? `· Ref. ${pay.ref}` : ''}</td></tr>
          <tr><th>Submitted by</th><td>{staffName(state, pay?.by)} · {fmtDateTime(pay?.at)}</td></tr>
          <tr><th>Confirmed by</th><td>{staffName(state, statement.confirmedBy)} (Nueva Technology)</td></tr>
          <tr><th>Deals covered</th><td>{statement.feeIds.length}</td></tr>
        </tbody></table>
        <div className="print-sign"><div>{staffName(state, statement.confirmedBy)}<br />Nueva Technology</div><div>{staffName(state, pay?.by)}<br />{state.settings.brand.identity.fullName}</div></div>
      </div>
    </PrintModal>
  );
}
