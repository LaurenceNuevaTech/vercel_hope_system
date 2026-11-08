import { Link } from 'react-router-dom';
import Icon from '../lib/icons.jsx';
import { me, staffName, customerName, useStore } from '../lib/store.jsx';
import { can, scope, visible } from '../lib/auth.js';
import { figures, overdueLeads } from '../lib/analytics.js';
import { statementStatus } from '../lib/actions.js';
import { fmtDateTime, fmtMonth, peso, pesoShort, sum, timeAgo, ym } from '../lib/format.js';
import { Badge, Empty, Stat } from '../components.jsx';
import { BarList, Funnel, LineChart, SERIES } from './charts.jsx';
import { Page } from './AdminApp.jsx';

export default function Dashboard() {
  const { state } = useStore();
  const s = me(state);
  const role = state.roles[s.role];
  const c = (p) => can(state, p);
  const deals = visible(state, 'deals', state.deals);
  const leads = visible(state, 'leads', state.inquiries);
  const listings = visible(state, 'listings', state.listings.filter((l) => !l.deleted));
  const f = figures(state, { deals, leads, listings });
  const thisMonth = f.byMonth[f.byMonth.length - 1];
  const overdue = overdueLeads(state, leads);
  const pendingApprovals = state.listings.filter((l) => l.status === 'pending' && !l.deleted && (scope(state, 'listings') === 'all' || l.teamId === s.teamId) && l.agentId !== s.id);
  const sc = scope(state, 'deals');
  const viewingsSoon = state.viewings.filter((v) => (sc === 'all' || v.agentId === s.id || (sc === 'team' && state.staff.find((x) => x.id === v.agentId)?.teamId === s.teamId)) && new Date(v.at) > new Date() && ['requested', 'confirmed'].includes(v.status)).sort((a, b) => a.at.localeCompare(b.at));
  const myComm = state.commissions.filter((x) => x.staffId === s.id);
  const unpaidStatements = state.statements.filter((x) => x.status !== 'paid');
  const balance = sum(unpaidStatements, (x) => x.total);
  const unbilled = sum(state.fees.filter((x) => x.status === 'unbilled'), (x) => x.amount);
  const recent = state.audit.filter((a) => sc === 'all' || a.actor.id === s.id).slice(0, 8);
  const scopeLabel = sc === 'all' ? 'Whole company' : sc === 'team' ? state.teams.find((t) => t.id === s.teamId)?.name : 'Your own work';
  const months = f.byMonth.map((m) => m.label);
  const isPlatform = c('analytics.platform');

  return (
    <Page title={`Good day, ${s.name.split(' ')[0]}`} sub={`${role.label} dashboard · ${scopeLabel}`}
      actions={c('listings.create') && <Link to="/admin/listings/new" className="btn"><Icon name="plus" />New listing</Link>}>

      {isPlatform && (
        <>
          <div className="sec-label"><Icon name="crown" />NuevaTech platform</div>
          <div className="stat-row">
            <Stat icon="crown" tone="accent" label="Platform fees (12 months)" value={peso(f.totals.fee)} to="/admin/billing" />
            <Stat icon="clock" tone="warn" label="Unbilled (this month)" value={peso(unbilled)} sub="Statement on the 1st" to="/admin/billing" />
            <Stat icon="receipt" tone={balance ? 'bad' : 'ok'} label="Hope's unpaid balance" value={peso(balance)} sub={`${unpaidStatements.length} statement(s)`} to="/admin/billing" />
            <Stat icon="users" tone="info" label="Accounts" value={`${state.staff.length} staff · ${state.customers.length} customers`} />
          </div>
          <div className="card" style={{ marginTop: 14 }}>
            <div className="card-h"><h3>Platform fee per month</h3><span className="mini">{state.settings.platform.fee.method === 'commission' ? `${state.settings.platform.fee.ratePct}% of Hope's commission` : state.settings.platform.fee.method === 'price' ? `${state.settings.platform.fee.ratePct}% of the deal price` : 'Fixed per deal'}</span></div>
            <div className="card-b"><LineChart labels={months} series={[{ name: 'Fee', color: SERIES[1], values: f.byMonth.map((m) => Math.round(m.fee)) }]} format={pesoShort} height={200} /></div>
          </div>
          {state.statements.some((x) => x.status === 'submitted') && <div className="note warn" style={{ marginTop: 14 }}><b>Hope submitted a payment.</b> Confirm it in <Link to="/admin/billing">NuevaTech billing</Link> to issue the receipt.</div>}
          <div className="sec-label" style={{ marginTop: 22 }}><Icon name="building" />Hope (client) – everything below is the Owner's view</div>
        </>
      )}

      {s.role === 'agent' || sc === 'own' ? (
        <div className="stat-row">
          <Stat icon="layers" label="My live listings" value={listings.filter((l) => l.status === 'published').length} sub={`${listings.filter((l) => ['pending', 'changes'].includes(l.status)).length} in review · ${listings.filter((l) => l.status === 'draft').length} drafts`} to="/admin/listings" />
          <Stat icon="message" tone="info" label="Open leads" value={leads.filter((q) => !['won', 'lost'].includes(q.stage)).length} sub={overdue.length ? `${overdue.length} waiting for your reply` : 'All answered'} to="/admin/leads" />
          <Stat icon="calendar" tone="accent" label="Upcoming viewings" value={viewingsSoon.length} to="/admin/viewings" />
          <Stat icon="wallet" tone="ok" label="Commission to receive" value={peso(sum(myComm.filter((x) => x.status !== 'paid'), (x) => x.net))} sub={`Paid this year ${peso(sum(myComm.filter((x) => x.status === 'paid'), (x) => x.net))}`} to="/admin/commissions" />
        </div>
      ) : (
        <div className="stat-row">
          <Stat icon="trend" label={`Sales volume · ${thisMonth.label}`} value={pesoShort(thisMonth.volume)} sub={`${thisMonth.count} closed deal(s)`} to="/admin/analytics" />
          <Stat icon="percent" tone="ok" label={`Hope commission · ${thisMonth.label}`} value={peso(thisMonth.commission)} sub={`Net after splits & fee ${peso(thisMonth.hopeNet)}`} to="/admin/analytics" />
          <Stat icon="verified" tone="warn" label="Waiting for approval" value={pendingApprovals.length} to="/admin/approvals" />
          <Stat icon="message" tone={overdue.length ? 'bad' : 'info'} label="Leads waiting for a reply" value={overdue.length} sub={`${leads.filter((q) => q.stage === 'new').length} new leads`} to="/admin/leads" />
          {c('billing.view') && !isPlatform && <Stat icon="crown" tone="accent" label="Due to NuevaTech" value={peso(balance)} sub={unpaidStatements[0] ? `${unpaidStatements[0].no} · due ${new Date(unpaidStatements[0].dueAt).toLocaleDateString('en-PH')}` : 'Nothing due'} to="/admin/billing" />}
        </div>
      )}

      <div className="dash-grid">
        {sc !== 'own' && (
          <div className="card span2">
            <div className="card-h"><h3>Sales volume and commission (12 months)</h3><Link to="/admin/analytics" className="btn link sm">Analytics</Link></div>
            <div className="card-b"><LineChart labels={months} series={[{ name: 'Commission', color: SERIES[0], values: f.byMonth.map((m) => Math.round(m.commission)) }, { name: 'Hope net', color: SERIES[2], values: f.byMonth.map((m) => Math.round(m.hopeNet)) }]} format={pesoShort} height={230} /></div>
          </div>
        )}
        <div className="card">
          <div className="card-h"><h3>Lead funnel</h3><span className="mini">Conversion {f.conversion}%</span></div>
          <div className="card-b"><Funnel data={f.funnel} /></div>
        </div>
        {pendingApprovals.length > 0 && c('listings.approve') && (
          <div className="card">
            <div className="card-h"><h3>Waiting for your approval</h3><Link to="/admin/approvals" className="btn link sm">Open</Link></div>
            {pendingApprovals.slice(0, 5).map((l) => <Link key={l.id} to={`/admin/listings/${l.id}`} className="list-row"><span className="mono mini">{l.code}</span><span className="grow ellipsis">{l.title}</span><span className="mini">{staffName(state, l.agentId)}</span></Link>)}
          </div>
        )}
        <div className="card">
          <div className="card-h"><h3>Upcoming viewings</h3><Link to="/admin/viewings" className="btn link sm">All</Link></div>
          {viewingsSoon.length ? viewingsSoon.slice(0, 5).map((v) => { const l = state.listings.find((x) => x.id === v.listingId); return <div key={v.id} className="list-row"><Badge tone={v.status === 'confirmed' ? 'ok' : 'warn'}>{v.status}</Badge><span className="grow ellipsis"><b>{customerName(state, v.customerId)}</b> · {l?.title}</span><span className="mini nowrap">{fmtDateTime(v.at)}</span></div>; }) : <Empty icon="calendar" title="No upcoming viewings" />}
        </div>
        {overdue.length > 0 && (
          <div className="card">
            <div className="card-h"><h3>Waiting for a reply</h3><Badge tone="bad">over {state.settings.listings.inquiries.responseHours} h</Badge></div>
            {overdue.slice(0, 5).map((q) => <Link key={q.id} to={`/admin/leads/${q.id}`} className="list-row"><span className="grow ellipsis"><b>{customerName(state, q.customerId)}</b> · {q.messages[q.messages.length - 1].text}</span><span className="mini nowrap">{timeAgo(q.updatedAt)}</span></Link>)}
          </div>
        )}
        {sc !== 'own' && (
          <div className="card">
            <div className="card-h"><h3>Top agents (12 months)</h3></div>
            <div className="card-b"><BarList data={f.agents.slice(0, 6).map((a) => [a.name, Math.round(a.commission)])} format={pesoShort} labelWidth={130} /></div>
          </div>
        )}
        {s.role === 'agent' && (
          <div className="card">
            <div className="card-h"><h3>My closed deals per month</h3></div>
            <div className="card-b"><LineChart labels={months} series={[{ name: 'Deals', color: SERIES[0], values: f.byMonth.map((m) => m.count) }]} height={180} /></div>
          </div>
        )}
        {c('billing.view') && !isPlatform && (
          <div className="card">
            <div className="card-h"><h3>NuevaTech statements</h3><Link to="/admin/billing" className="btn link sm">Billing</Link></div>
            {state.statements.slice(-4).reverse().map((st) => { const t = statementStatus(st); return <div key={st.id} className="list-row"><span className="mono mini">{st.no}</span><span className="grow">{fmtMonth(st.period)}</span><b className="num">{peso(st.total)}</b><Badge tone={t === 'paid' ? 'ok' : t === 'overdue' ? 'bad' : t === 'submitted' ? 'info' : 'warn'}>{t}</Badge></div>; })}
            <div className="list-row"><span className="grow mini">This month so far (unbilled, {ym(new Date())})</span><b className="num">{peso(unbilled)}</b></div>
          </div>
        )}
        {s.role === 'editor' && (
          <div className="card">
            <div className="card-h"><h3>Content</h3></div>
            <div className="card-b stack"><Link to="/admin/settings/cms-home" className="btn ghost">Homepage</Link><Link to="/admin/settings/cms-pages" className="btn ghost">Pages & FAQs</Link><Link to="/admin/settings/cms-announcements" className="btn ghost">Announcements</Link></div>
          </div>
        )}
        <div className="card span2">
          <div className="card-h"><h3>Recent activity</h3>{c('audit.view') && <Link to="/admin/audit" className="btn link sm">Audit logs</Link>}</div>
          {recent.map((a) => <div key={a.id} className="list-row"><Badge tone={a.severity === 'critical' ? 'bad' : a.severity === 'warning' ? 'warn' : 'muted'}>{a.event}</Badge><span className="grow ellipsis">{a.description}</span><span className="mini nowrap">{a.actor.name} · {timeAgo(a.at)}</span></div>)}
        </div>
      </div>
    </Page>
  );
}
