// Numbers for the dashboards and the Analytics page, computed from the records.
import { LEAD_SOURCES, LEAD_STAGES } from './catalog.js';
import { monthName, sum, ym } from './format.js';

export function lastMonths(n = 12) {
  const now = new Date();
  return Array.from({ length: n }, (_, i) => { const d = new Date(now.getFullYear(), now.getMonth() - (n - 1 - i), 1); return { key: ym(d), label: monthName(d.getMonth()) }; });
}

export function inRange(iso, from, to) {
  if (!iso) return false;
  const t = iso.slice(0, 10);
  return (!from || t >= from) && (!to || t <= to);
}

/** All the figures of a set of deals / leads / listings. */
export function figures(state, { deals, leads, listings }) {
  const closed = deals.filter((d) => d.status === 'closed');
  const months = lastMonths(12);
  const byMonth = months.map((m) => {
    const ds = closed.filter((d) => ym(d.closedAt) === m.key);
    return { ...m, count: ds.length, volume: sum(ds, (d) => (d.type === 'sale' ? d.price : d.computation?.value || 0)), commission: sum(ds, (d) => d.computation?.gross), hopeNet: sum(ds, (d) => d.computation?.hopeNet), fee: sum(ds, (d) => d.computation?.platformFee), sales: ds.filter((d) => d.type === 'sale').length, rentals: ds.filter((d) => d.type === 'rent').length };
  });
  const funnel = LEAD_STAGES.filter((s) => s.key !== 'lost').map((s, i, arr) => [s.label.replace('Closed – won', 'Won'), leads.filter((q) => arr.slice(i).some((x) => x.key === q.stage)).length]);
  const won = leads.filter((q) => q.stage === 'won').length;
  const lost = leads.filter((q) => q.stage === 'lost').length;
  const replied = leads.filter((q) => q.firstReplyAt);
  const avgReplyH = replied.length ? sum(replied, (q) => (new Date(q.firstReplyAt) - new Date(q.createdAt)) / 3600000) / replied.length : 0;
  const daysToClose = closed.map((d) => { const l = state.listings.find((x) => x.id === d.listingId); return l?.publishedAt ? (new Date(d.closedAt) - new Date(l.publishedAt)) / 86400000 : null; }).filter((x) => x != null);
  const sources = Object.entries(LEAD_SOURCES).map(([k, label]) => [label, leads.filter((q) => q.source === k).length]).filter((x) => x[1]).sort((a, b) => b[1] - a[1]);
  const cats = state.categories.map((c) => [c.label, closed.filter((d) => state.listings.find((l) => l.id === d.listingId)?.category === c.key).length]).filter((x) => x[1]).sort((a, b) => b[1] - a[1]);
  const cities = Object.entries(leads.reduce((a, q) => { const c = state.listings.find((l) => l.id === q.listingId)?.city; if (c) a[c] = (a[c] || 0) + 1; return a; }, {})).sort((a, b) => b[1] - a[1]).slice(0, 8);
  const agents = state.staff.filter((s) => ['agent', 'manager'].includes(s.role)).map((s) => {
    const ds = closed.filter((d) => d.agentId === s.id);
    return { id: s.id, name: s.name, deals: ds.length, volume: sum(ds, (d) => d.price * (d.type === 'rent' ? 12 : 1)), commission: sum(ds, (d) => d.computation?.gross), earned: sum(ds, (d) => d.computation?.agentShare), leads: leads.filter((q) => q.agentId === s.id).length, listings: listings.filter((l) => l.agentId === s.id && l.status === 'published').length };
  }).filter((a) => a.deals || a.leads || a.listings).sort((a, b) => b.commission - a.commission);
  return {
    closed, byMonth, funnel, won, lost, conversion: won + lost ? Math.round((won / (won + lost)) * 100) : 0,
    avgReplyH, avgDaysToClose: daysToClose.length ? Math.round(sum(daysToClose) / daysToClose.length) : 0,
    sources, cats, cities, agents,
    totals: { volume: sum(byMonth, (m) => m.volume), commission: sum(byMonth, (m) => m.commission), hopeNet: sum(byMonth, (m) => m.hopeNet), fee: sum(byMonth, (m) => m.fee), deals: closed.length },
  };
}

/** Leads with no agent reply within the response time. */
export function overdueLeads(state, leads) {
  const h = Number(state.settings.listings.inquiries.responseHours);
  return leads.filter((q) => {
    if (['won', 'lost', 'reserved'].includes(q.stage)) return false;
    const last = q.messages[q.messages.length - 1];
    return last?.from === 'customer' && (Date.now() - new Date(last.at)) / 3600000 > h;
  });
}
