import { useEffect, useState } from 'react';
import { Link, NavLink, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import Icon from '../lib/icons.jsx';
import { audit, me, useStore } from '../lib/store.jsx';
import { can } from '../lib/auth.js';
import { timeAgo } from '../lib/format.js';
import { Avatar, Badge, Logo } from '../components.jsx';
import { DemoBar } from '../site/SiteApp.jsx';
import StaffLogin from './Login.jsx';
import Dashboard from './Dashboard.jsx';
import Analytics from './Analytics.jsx';
import { Approvals, ListingDetail, ListingEditor, Listings, Submissions } from './Listings.jsx';
import { LeadDetail, Leads, Viewings } from './Leads.jsx';
import { Commissions, DealDetail, Deals, Payments } from './Deals.jsx';
import Billing from './Billing.jsx';
import { Customers, Roles, Staff } from './People.jsx';
import Settings from './Settings.jsx';
import Audit from './Audit.jsx';
import Profile from './Profile.jsx';

/** Menu: [path, label, icon, permission check(state) ] */
export function menu(state) {
  const c = (p) => can(state, p);
  const any = (...ps) => ps.some(c);
  const pending = state.listings.filter((l) => l.status === 'pending' && !l.deleted).length;
  return [
    { group: 'Overview', items: [
      ['/admin', 'Dashboard', 'grid', c('dashboard.view')],
      ['/admin/analytics', 'Analytics', 'chart', any('analytics.view', 'analytics.team', 'analytics.platform')],
    ] },
    { group: 'Listings', items: [
      ['/admin/listings', 'Listings', 'layers', any('listings.create', 'listings.view_all', 'listings.view_team')],
      ['/admin/approvals', 'Approvals', 'verified', c('listings.approve'), pending],
      ['/admin/submissions', 'Owner submissions', 'tag', c('submissions.manage'), state.submissions.filter((s) => s.status === 'new').length],
    ] },
    { group: 'Sales', items: [
      ['/admin/leads', 'Leads & inquiries', 'message', true],
      ['/admin/viewings', 'Viewings', 'calendar', c('viewings.manage')],
      ['/admin/deals', 'Deals', 'handshake', any('deals.create', 'deals.view_all')],
      ['/admin/customers', 'Customers', 'users', c('customers.view')],
    ] },
    { group: 'Money', items: [
      ['/admin/payments', 'Payments & receipts', 'receipt', c('payments.record')],
      ['/admin/commissions', 'Commissions', 'wallet', true],
      ['/admin/billing', 'NuevaTech billing', 'crown', c('billing.view')],
    ] },
    { group: 'Administration', items: [
      ['/admin/staff', 'Staff & teams', 'briefcase', c('staff.view')],
      ['/admin/roles', 'Roles & permissions', 'key', c('roles.manage')],
      ['/admin/settings', 'Settings & CMS', 'gear', any('cms.manage', 'settings.manage', 'settings.security', 'integrations.manage', 'billing.view', 'system.maintenance')],
      ['/admin/audit', 'Audit logs', 'history', c('audit.view')],
    ] },
  ].map((g) => ({ ...g, items: g.items.filter((i) => i[3]) })).filter((g) => g.items.length);
}

function Bell({ s }) {
  const { state, update } = useStore();
  const [open, setOpen] = useState(false);
  const nav = useNavigate();
  const list = state.notifications.filter((n) => n.to.type === 'staff' && n.to.id === s.id).slice(0, 12);
  const unread = list.filter((n) => !n.read).length;
  return (
    <div style={{ position: 'relative' }}>
      <button type="button" className="icon-btn" onClick={() => setOpen(!open)} aria-label="Notifications"><Icon name="bell" />{unread > 0 && <i className="bell-n">{unread}</i>}</button>
      {open && (
        <div className="pop card" onMouseLeave={() => setOpen(false)}>
          <div className="row between" style={{ padding: '10px 14px', borderBottom: '1px solid var(--line-2)' }}><b>Notifications</b>{unread > 0 && <button type="button" className="btn link xs" onClick={() => update((d) => d.notifications.forEach((n) => { if (n.to.type === 'staff' && n.to.id === s.id) n.read = true; }))}>Mark all read</button>}</div>
          {list.length ? list.map((n) => <button type="button" key={n.id} className={`pop-row ${n.read ? '' : 'unread'}`} onClick={() => { update((d) => { d.notifications.find((x) => x.id === n.id).read = true; }); setOpen(false); if (n.link) nav(n.link); }}><b>{n.title}</b><span>{n.body}</span><small>{timeAgo(n.at)}</small></button>) : <div className="empty">No notifications</div>}
        </div>
      )}
    </div>
  );
}

export function Page({ title, sub, actions, children }) {
  return (
    <div className="a-page">
      <div className="a-head"><div><h1>{title}</h1>{sub && <p className="muted">{sub}</p>}</div>{actions && <div className="row">{actions}</div>}</div>
      {children}
    </div>
  );
}

export default function AdminApp() {
  const { state, update } = useStore();
  const s = me(state);
  const loc = useLocation();
  const nav = useNavigate();
  const [side, setSide] = useState(false);
  useEffect(() => { setSide(false); window.scrollTo(0, 0); }, [loc.pathname]);

  // Idle timeout (Settings → Security → Sessions).
  useEffect(() => {
    if (!s) return undefined;
    let last = Date.now();
    const bump = () => { last = Date.now(); };
    ['mousemove', 'keydown', 'click'].forEach((e) => window.addEventListener(e, bump));
    const t = setInterval(() => {
      if (Date.now() - last > Number(state.settings.security.sessions.staffIdleMinutes) * 60000) {
        update((d) => { audit(d, 'auth.session_expired', `${s.name} signed out after inactivity`); d.staffSession = null; });
      }
    }, 30000);
    return () => { clearInterval(t); ['mousemove', 'keydown', 'click'].forEach((e) => window.removeEventListener(e, bump)); };
  }, [s?.id, state.settings.security.sessions.staffIdleMinutes, update]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!s) return <><DemoBar /><StaffLogin /></>;
  const maint = state.settings.system.maintenance.on;
  const role = state.roles[s.role];
  const logout = () => { update((d) => { audit(d, 'auth.logout', `${s.name} signed out`); d.staffSession = null; }); nav('/admin'); };

  return (
    <>
      <DemoBar />
      <div className={`admin ${side ? 'side-open' : ''}`}>
        <aside className="a-side">
          <div className="a-brand"><Logo to="/admin" light small /></div>
          <nav>
            {menu(state).map((g) => (
              <div key={g.group} className="a-group"><span>{g.group}</span>
                {g.items.map(([to, label, icon, , count]) => <NavLink key={to} to={to} end={to === '/admin'}><Icon name={icon} />{label}{count > 0 && <i className="a-count">{count}</i>}</NavLink>)}
              </div>
            ))}
          </nav>
          <div className="a-side-f"><Link to="/" target="_blank"><Icon name="globe" />Open website</Link><Link to="/flows" target="_blank"><Icon name="flow" />Flowcharts &amp; API</Link></div>
        </aside>
        <div className="a-main">
          <header className="a-top">
            <button type="button" className="icon-btn a-burger" onClick={() => setSide(!side)} aria-label="Menu"><Icon name="menu" /></button>
            {maint && <Badge tone="warn" icon="wrench">Maintenance mode is on</Badge>}
            <div className="grow" />
            <Bell s={s} />
            <Link to="/admin/profile" className="a-user">
              <Avatar name={s.name} photo={s.photo} size="sm" />
              <span className="hide-sm"><b>{s.name}</b><small>{role?.label}{role?.org === 'NuevaTech' ? ' · NuevaTech' : ''}</small></span>
            </Link>
            <button type="button" className="icon-btn" onClick={logout} title="Sign out" aria-label="Sign out"><Icon name="logout" /></button>
          </header>
          <main>
            <Routes>
              <Route index element={<Dashboard />} />
              <Route path="analytics" element={<Analytics />} />
              <Route path="listings" element={<Listings />} />
              <Route path="listings/new" element={<ListingEditor />} />
              <Route path="listings/:id" element={<ListingDetail />} />
              <Route path="listings/:id/edit" element={<ListingEditor />} />
              <Route path="approvals" element={<Approvals />} />
              <Route path="submissions" element={<Submissions />} />
              <Route path="leads" element={<Leads />} />
              <Route path="leads/:id" element={<LeadDetail />} />
              <Route path="viewings" element={<Viewings />} />
              <Route path="deals" element={<Deals />} />
              <Route path="deals/:id" element={<DealDetail />} />
              <Route path="payments" element={<Payments />} />
              <Route path="commissions" element={<Commissions />} />
              <Route path="billing" element={<Billing />} />
              <Route path="customers" element={<Customers />} />
              <Route path="staff" element={<Staff />} />
              <Route path="roles" element={<Roles />} />
              <Route path="settings" element={<Settings />} />
              <Route path="settings/:group" element={<Settings />} />
              <Route path="audit" element={<Audit />} />
              <Route path="profile" element={<Profile />} />
              <Route path="*" element={<Navigate to="/admin" replace />} />
            </Routes>
          </main>
        </div>
        {side && <div className="a-scrim" onClick={() => setSide(false)} />}
      </div>
    </>
  );
}
