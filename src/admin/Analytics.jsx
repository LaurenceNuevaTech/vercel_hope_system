import { useMemo, useState } from 'react';
import Icon from '../lib/icons.jsx';
import { me, useStore } from '../lib/store.jsx';
import { scope, visible } from '../lib/auth.js';
import { figures } from '../lib/analytics.js';
import { LISTING_STATUS } from '../lib/catalog.js';
import { downloadCsv, peso, pesoShort, sum } from '../lib/format.js';
import { Stat } from '../components.jsx';
import { BarList, Columns, Funnel, LineChart, SERIES } from './charts.jsx';
import { Page } from './AdminApp.jsx';

export default function Analytics() {
  const { state } = useStore();
  const s = me(state);
  const [team, setTeam] = useState('');
  const [agent, setAgent] = useState('');
  const [purpose, setPurpose] = useState('');
  const [group, setGroup] = useState('');
  const sc = scope(state, 'deals');

  const data = useMemo(() => {
    const keep = (r) => {
      const l = state.listings.find((x) => x.id === (r.listingId || r.id));
      if (team && r.teamId !== team) return false;
      if (agent && r.agentId !== agent) return false;
      if (purpose && (l?.purpose || r.type) !== purpose) return false;
      if (group && l?.group !== group) return false;
      return true;
    };
    const deals = visible(state, 'deals', state.deals).filter(keep);
    const leads = visible(state, 'leads', state.inquiries).filter(keep);
    const listings = visible(state, 'listings', state.listings.filter((l) => !l.deleted)).filter(keep);
    return { deals, leads, listings, f: figures(state, { deals, leads, listings }) };
  }, [state, team, agent, purpose, group]);
  const { f, listings, leads } = data;
  const months = f.byMonth.map((m) => m.label);
  const agents = state.staff.filter((x) => ['agent', 'manager'].includes(x.role) && (sc === 'all' || x.teamId === s.teamId));
  const t = state.traffic;
  const topViewed = [...listings].filter((l) => ['published', 'reserved'].includes(l.status)).sort((a, b) => b.views - a.views).slice(0, 8);
  const topShared = [...listings].map((l) => [l.title, sum(Object.values(l.shares))]).sort((a, b) => b[1] - a[1]).slice(0, 6);
  const shareCh = ['facebook', 'messenger', 'link', 'viber', 'qr'].map((k) => [k[0].toUpperCase() + k.slice(1), sum(listings, (l) => l.shares[k] || 0)]);

  const exportCsv = () => downloadCsv('hope-analytics-by-month.csv', ['Month', 'Closed deals', 'Sales', 'Rentals', 'Sales volume', 'Hope commission', 'NuevaTech fee', 'Hope net'], f.byMonth.map((m) => [m.key, m.count, m.sales, m.rentals, m.volume, m.commission, m.fee, m.hopeNet]));
  const exportAgents = () => downloadCsv('hope-agents.csv', ['Agent', 'Active listings', 'Leads', 'Closed deals', 'Volume', 'Commission (Hope)', 'Agent share'], f.agents.map((a) => [a.name, a.listings, a.leads, a.deals, a.volume, a.commission, a.earned]));

  return (
    <Page title="Analytics" sub={`${sc === 'all' ? 'Whole company' : state.teams.find((x) => x.id === s.teamId)?.name || 'Own'} · last 12 months`} actions={<><button type="button" className="btn ghost" onClick={exportCsv}><Icon name="download" />Excel / CSV</button><button type="button" className="btn ghost" onClick={() => window.print()}><Icon name="print" />Print</button></>}>
      <div className="card filters-a">
        {sc === 'all' && <select className="input" value={team} onChange={(e) => setTeam(e.target.value)}><option value="">All teams</option>{state.teams.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</select>}
        <select className="input" value={agent} onChange={(e) => setAgent(e.target.value)}><option value="">All agents</option>{agents.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</select>
        <select className="input" value={purpose} onChange={(e) => setPurpose(e.target.value)}><option value="">Sale and rent</option><option value="sale">Sale</option><option value="rent">Rent</option></select>
        <select className="input" value={group} onChange={(e) => setGroup(e.target.value)}><option value="">Property and vehicles</option><option value="property">Property</option><option value="vehicle">Vehicles</option></select>
      </div>
      <div className="stat-row">
        <Stat icon="trend" label="Sales volume" value={pesoShort(f.totals.volume)} sub={`${f.totals.deals} closed deals`} />
        <Stat icon="percent" tone="ok" label="Hope commission" value={peso(f.totals.commission)} sub={`Net ${peso(f.totals.hopeNet)}`} />
        <Stat icon="crown" tone="accent" label="NuevaTech fees" value={peso(f.totals.fee)} />
        <Stat icon="handshake" tone="info" label="Lead conversion" value={`${f.conversion}%`} sub={`${f.won} won · ${f.lost} lost`} />
        <Stat icon="clock" tone="warn" label="Avg. first reply" value={`${f.avgReplyH.toFixed(1)} h`} sub={`Avg. ${f.avgDaysToClose} days listing → close`} />
      </div>
      <div className="dash-grid">
        <div className="card span2"><div className="card-h"><h3>Sales volume per month</h3></div><div className="card-b"><Columns data={f.byMonth.map((m) => [m.label, Math.round(m.volume)])} format={pesoShort} height={220} /></div></div>
        <div className="card"><div className="card-h"><h3>Lead funnel</h3></div><div className="card-b"><Funnel data={f.funnel} /></div></div>
        <div className="card span2"><div className="card-h"><h3>Where the commission goes</h3><div className="legend"><span><i style={{ background: SERIES[0] }} />Commission</span><span><i style={{ background: SERIES[2] }} />Hope net</span><span><i style={{ background: SERIES[1] }} />NuevaTech fee</span></div></div>
          <div className="card-b"><LineChart labels={months} series={[{ name: 'Commission', color: SERIES[0], values: f.byMonth.map((m) => Math.round(m.commission)) }, { name: 'Hope net', color: SERIES[2], values: f.byMonth.map((m) => Math.round(m.hopeNet)) }, { name: 'NuevaTech fee', color: SERIES[1], values: f.byMonth.map((m) => Math.round(m.fee)) }]} format={pesoShort} height={240} /></div></div>
        <div className="card"><div className="card-h"><h3>Lead sources</h3><span className="mini">incl. share links</span></div><div className="card-b"><BarList data={f.sources} labelWidth={120} /></div></div>
        <div className="card"><div className="card-h"><h3>Closed deals by category</h3></div><div className="card-b"><BarList data={f.cats} labelWidth={110} color={SERIES[2]} /></div></div>
        <div className="card"><div className="card-h"><h3>Inquiries by location</h3></div><div className="card-b"><BarList data={f.cities} labelWidth={140} color={SERIES[3]} /></div></div>
        <div className="card"><div className="card-h"><h3>Shares by channel</h3></div><div className="card-b"><BarList data={shareCh} labelWidth={90} color={SERIES[1]} /></div></div>
        <div className="card"><div className="card-h"><h3>Listings by status</h3></div><div className="card-b"><BarList data={Object.entries(LISTING_STATUS).map(([k, v]) => [v.label, listings.filter((l) => l.status === k).length]).filter((x) => x[1])} labelWidth={130} color={SERIES[5]} /></div></div>
        <div className="card span2"><div className="card-h"><h3>Website & app traffic (30 days)</h3><div className="legend"><span><i style={{ background: SERIES[0] }} />Website visits</span><span><i style={{ background: SERIES[2] }} />App opens</span></div></div>
          <div className="card-b"><LineChart labels={t.map((x) => x.date.slice(5))} series={[{ name: 'Visits', color: SERIES[0], values: t.map((x) => x.visits) }, { name: 'App opens', color: SERIES[2], values: t.map((x) => x.appOpens) }]} height={200} />
            <div className="mini">Sign-ups (30 days): <b>{sum(t, (x) => x.signups)}</b> · Shares: <b>{sum(t, (x) => x.shares)}</b> · Sample numbers; the real system reads them from Google Analytics and the app.</div></div></div>
        <div className="card"><div className="card-h"><h3>Most viewed listings</h3></div><div className="card-b"><BarList data={topViewed.map((l) => [l.title, l.views])} labelWidth={170} /></div></div>
        <div className="card"><div className="card-h"><h3>Most shared listings</h3></div><div className="card-b"><BarList data={topShared} labelWidth={170} color={SERIES[1]} /></div></div>
      </div>
      <div className="card" style={{ marginTop: 16 }}>
        <div className="card-h"><h3>Agent performance</h3><button type="button" className="btn ghost sm" onClick={exportAgents}><Icon name="download" />CSV</button></div>
        <div className="table-wrap"><table className="t"><thead><tr><th>#</th><th>Agent</th><th className="r">Live listings</th><th className="r">Leads</th><th className="r">Closed</th><th className="r">Conversion</th><th className="r">Volume</th><th className="r">Hope commission</th><th className="r">Agent share</th></tr></thead><tbody>
          {f.agents.map((a, i) => { const al = leads.filter((q) => q.agentId === a.id); const w = al.filter((q) => q.stage === 'won').length; const lo = al.filter((q) => q.stage === 'lost').length; return <tr key={a.id}><td>{i + 1}</td><td><b>{a.name}</b></td><td className="r num">{a.listings}</td><td className="r num">{a.leads}</td><td className="r num">{a.deals}</td><td className="r num">{w + lo ? Math.round((w / (w + lo)) * 100) : 0}%</td><td className="r num">{pesoShort(a.volume)}</td><td className="r num">{peso(a.commission)}</td><td className="r num">{peso(a.earned)}</td></tr>; })}
        </tbody></table></div>
      </div>
      <div className="card" style={{ marginTop: 16 }}>
        <div className="card-h"><h3>Per month</h3></div>
        <div className="table-wrap"><table className="t"><thead><tr><th>Month</th><th className="r">Deals</th><th className="r">Sales</th><th className="r">Rentals</th><th className="r">Volume</th><th className="r">Commission</th><th className="r">NuevaTech fee</th><th className="r">Hope net</th></tr></thead><tbody>
          {[...f.byMonth].reverse().map((m) => <tr key={m.key}><td>{m.label} {m.key.slice(0, 4)}</td><td className="r num">{m.count}</td><td className="r num">{m.sales}</td><td className="r num">{m.rentals}</td><td className="r num">{peso(m.volume)}</td><td className="r num">{peso(m.commission)}</td><td className="r num">{peso(m.fee)}</td><td className="r num">{peso(m.hopeNet)}</td></tr>)}
        </tbody></table></div>
      </div>
    </Page>
  );
}
