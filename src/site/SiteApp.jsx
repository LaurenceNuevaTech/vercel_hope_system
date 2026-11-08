import { useEffect, useMemo, useState } from 'react';
import { Link, NavLink, Route, Routes, useLocation, useNavigate, useParams } from 'react-router-dom';
import Icon from '../lib/icons.jsx';
import { meCustomer, useStore } from '../lib/store.jsx';
import { Avatar, Empty, ListingCard, Logo, LogoMark, Modal } from '../components.jsx';
import { peso } from '../lib/format.js';
import Home from './Home.jsx';
import { Browse, ListingPage } from './Listings.jsx';
import { CustomerLogin, CustomerRegister, ForgotPassword } from './Auth.jsx';
import Account from './Account.jsx';
import Sell from './Sell.jsx';

export function DemoBar() {
  return (
    <div className="demo-bar">
      <span><b style={{ color: '#fff' }}>Simulator</b> · sample data saved in this browser only</span>
      <Link to="/">Website</Link><Link to="/account">Customer portal</Link><Link to="/admin">Staff portal</Link><Link to="/mobile">Phone app</Link><Link to="/flows">Flowcharts &amp; API</Link>
    </div>
  );
}

function Header() {
  const { state } = useStore();
  const cust = meCustomer(state);
  const [open, setOpen] = useState(false);
  const loc = useLocation();
  useEffect(() => setOpen(false), [loc.pathname]);
  const unread = cust ? state.notifications.filter((n) => n.to.type === 'customer' && n.to.id === cust.id && !n.read).length : 0;
  const ann = state.cms.announcements.find((a) => a.active && a.audience !== 'staff');
  return (
    <>
      {ann && <div className="ann-bar"><Icon name="sparkle" size={15} />{ann.text}{ann.link && <Link to={ann.link}>Learn more</Link>}</div>}
      <header className="site-h">
        <div className="wrap site-h-in">
          <Logo />
          <nav className={`site-nav ${open ? 'open' : ''}`}>
            <NavLink to="/listings?purpose=sale">Buy</NavLink>
            <NavLink to="/listings?purpose=rent">Rent</NavLink>
            <NavLink to="/listings?group=vehicle">Vehicles</NavLink>
            <NavLink to="/sell">Sell with Hope</NavLink>
            <NavLink to="/agents">Agents</NavLink>
            <NavLink to="/calculator">Loan calculator</NavLink>
          </nav>
          <div className="row" style={{ gap: 8 }}>
            {cust ? (
              <Link to="/account" className="acct-pill"><Avatar name={cust.name} size="sm" /><span className="hide-sm">{cust.name.split(' ')[0]}</span>{unread > 0 && <i className="dot-n">{unread}</i>}</Link>
            ) : (
              <><Link to="/login" className="btn ghost sm">Sign in</Link><Link to="/register" className="btn sm hide-sm">Create account</Link></>
            )}
            <button type="button" className="icon-btn show-sm" onClick={() => setOpen(!open)} aria-label="Menu"><Icon name="menu" /></button>
          </div>
        </div>
      </header>
    </>
  );
}

function Footer() {
  const { state } = useStore();
  const c = state.settings.brand.company;
  return (
    <footer className="site-f">
      <div className="wrap site-f-grid">
        <div>
          <Logo light />
          <p className="slogan" style={{ marginTop: 12 }}>{state.settings.brand.identity.slogan}</p>
          <p style={{ opacity: 0.8 }}>{c.legalName}<br />{c.license}</p>
        </div>
        <div><h4>Explore</h4><Link to="/listings?purpose=sale">Properties for sale</Link><Link to="/listings?purpose=rent">For rent</Link><Link to="/listings?group=vehicle">Vehicles</Link><Link to="/agents">Our agents</Link></div>
        <div><h4>Company</h4><Link to="/p/about">About Hope</Link><Link to="/faq">FAQs</Link><Link to="/p/terms">Terms of use</Link><Link to="/p/privacy">Privacy notice</Link></div>
        <div><h4>Contact</h4><span>{c.address}</span><span>{c.phone}</span><span>{c.email}</span><span>{c.hours}</span></div>
      </div>
      <div className="wrap site-f-bottom"><span>© {new Date().getFullYear()} {state.settings.brand.identity.fullName}</span><span>System by <b>Nueva Technology</b></span></div>
    </footer>
  );
}

function Maintenance() {
  const { state } = useStore();
  return (
    <div className="maint">
      <LogoMark size={64} logo={state.settings.brand.identity.logo} />
      <h1>We'll be right back</h1>
      <p>{state.settings.system.maintenance.message}</p>
      <Link to="/admin" className="btn ghost">Staff sign-in</Link>
    </div>
  );
}

function Agents() {
  const { state } = useStore();
  const agents = state.staff.filter((s) => ['agent', 'manager', 'owner'].includes(s.role) && s.status === 'active');
  return (
    <div className="wrap page">
      <h1>Our account specialists</h1>
      <p className="muted">Licensed and trained agents in Metro Manila, Cavite and Laguna.</p>
      <div className="agent-grid">
        {agents.map((a) => {
          const n = state.listings.filter((l) => l.agentId === a.id && ['published', 'reserved'].includes(l.status) && !l.deleted).length;
          return (
            <Link key={a.id} to={`/agents/${a.id}`} className="agent-card card">
              <Avatar name={a.name} photo={a.photo} size="lg" />
              <b>{a.name}</b>
              <span className="mini">{a.role === 'agent' ? 'Account Specialist' : a.title}{a.teamId ? ` · ${state.teams.find((t) => t.id === a.teamId)?.name}` : ''}</span>
              <span className="badge brand">{n} active listing{n === 1 ? '' : 's'}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

function AgentProfile() {
  const { id } = useParams();
  const { state } = useStore();
  const cust = meCustomer(state);
  const a = state.staff.find((s) => s.id === id);
  if (!a) return <div className="wrap page"><Empty title="Agent not found" /></div>;
  const list = state.listings.filter((l) => l.agentId === a.id && ['published', 'reserved'].includes(l.status) && !l.deleted);
  const closed = state.deals.filter((d) => d.agentId === a.id && d.status === 'closed').length;
  const showPhone = cust || state.settings.listings.sharing.guestSeesContact;
  return (
    <div className="wrap page">
      <div className="card card-pad row" style={{ gap: 18, alignItems: 'center' }}>
        <Avatar name={a.name} photo={a.photo} size="lg" />
        <div className="grow"><h1 style={{ marginBottom: 2 }}>{a.name}</h1><div className="muted">{a.role === 'agent' ? 'Account Specialist' : a.title}{a.license ? ` · ${a.license}` : ''}</div><p style={{ margin: '8px 0 0' }}>{a.bio}</p></div>
        <div style={{ textAlign: 'right' }}><div className="badge ok"><Icon name="verified" />Verified</div><div className="mini" style={{ marginTop: 6 }}>{closed} closed deals</div><div style={{ marginTop: 6, fontWeight: 600 }}>{showPhone ? a.phone : <Link to={`/login?next=/agents/${a.id}`}>Sign in to see the number</Link>}</div></div>
      </div>
      <h2 style={{ marginTop: 26 }}>Listings</h2>
      {list.length ? <div className="lgrid">{list.map((l) => <ListingCard key={l.id} listing={l} />)}</div> : <Empty title="No active listings" />}
    </div>
  );
}

function CmsPage() {
  const { slug } = useParams();
  const { state } = useStore();
  const p = state.cms.pages.find((x) => x.slug === slug);
  if (!p) return <div className="wrap page"><Empty title="Page not found" /></div>;
  return <div className="wrap page narrow"><h1>{p.title}</h1>{p.body.split('\n').filter(Boolean).map((t, i) => <p key={i}>{t}</p>)}</div>;
}

function Faq() {
  const { state } = useStore();
  return (
    <div className="wrap page narrow">
      <h1>Frequently asked questions</h1>
      <div className="stack" style={{ marginTop: 16 }}>{state.cms.faqs.map((f) => <details key={f.q} className="faq card"><summary>{f.q}</summary><p>{f.a}</p></details>)}</div>
    </div>
  );
}

/** Home loan / car loan calculator (amortization). */
export function Calculator({ initialPrice }) {
  const [price, setPrice] = useState(initialPrice || 5000000);
  const [down, setDown] = useState(20);
  const [rate, setRate] = useState(7.5);
  const [years, setYears] = useState(20);
  const loan = price * (1 - down / 100);
  const r = rate / 100 / 12; const n = years * 12;
  const monthly = r ? (loan * r) / (1 - (1 + r) ** -n) : loan / n;
  return (
    <div className="calc">
      <div className="grid2">
        <label className="field"><span>Price</span><input type="number" value={price} onChange={(e) => setPrice(Number(e.target.value))} /></label>
        <label className="field"><span>Down payment: {down}%</span><input type="range" min="0" max="80" value={down} onChange={(e) => setDown(Number(e.target.value))} /></label>
        <label className="field"><span>Interest rate per year (%)</span><input type="number" step="0.1" value={rate} onChange={(e) => setRate(Number(e.target.value))} /></label>
        <label className="field"><span>Term: {years} years</span><input type="range" min="1" max="30" value={years} onChange={(e) => setYears(Number(e.target.value))} /></label>
      </div>
      <div className="calc-out">
        <div><span>Monthly amortization</span><b>{peso(Math.round(monthly))}</b></div>
        <div><span>Down payment</span><b>{peso(price - loan)}</b></div>
        <div><span>Loan amount</span><b>{peso(loan)}</b></div>
        <div><span>Total interest</span><b>{peso(Math.round(monthly * n - loan))}</b></div>
      </div>
      <p className="mini">Estimate only. Banks and Pag-IBIG set the final rate and term.</p>
    </div>
  );
}

function CalculatorPage() {
  return <div className="wrap page narrow"><h1>Loan calculator</h1><p className="muted">Estimate the monthly amortization of a house, condo or car loan.</p><div className="card card-pad"><Calculator /></div></div>;
}

/** Shown when a guest tries to ask, save, book or reserve. */
export function AccountGate({ reason, onClose }) {
  const nav = useNavigate();
  const loc = useLocation();
  const next = encodeURIComponent(loc.pathname + loc.search);
  return (
    <Modal title="Create a free account" onClose={onClose} width={420}>
      <div style={{ textAlign: 'center' }}>
        <div className="gate-ico"><Icon name="lock" /></div>
        <p>You can view every listing as a guest. To <b>{reason}</b>, please sign in or create a free account.</p>
        <div className="stack">
          <button type="button" className="btn lg" onClick={() => nav(`/register?next=${next}`)}>Create account</button>
          <button type="button" className="btn ghost lg" onClick={() => nav(`/login?next=${next}`)}>I have an account</button>
        </div>
        <p className="mini" style={{ marginTop: 12 }}>Your details are shared only with the agent handling your inquiry.</p>
      </div>
    </Modal>
  );
}

export default function SiteApp() {
  const { state } = useStore();
  const loc = useLocation();
  useEffect(() => { window.scrollTo(0, 0); }, [loc.pathname]);
  // Share-link attribution: ?ch=facebook is remembered for the next inquiry.
  useEffect(() => { const ch = new URLSearchParams(loc.search).get('ch'); if (ch) { try { sessionStorage.setItem('hope-src', ch); } catch { /* ignore */ } } }, [loc.search]);
  const maint = state.settings.system.maintenance.on;
  const content = useMemo(() => (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/listings" element={<Browse />} />
      <Route path="/l/:slug" element={<ListingPage />} />
      <Route path="/agents" element={<Agents />} />
      <Route path="/agents/:id" element={<AgentProfile />} />
      <Route path="/sell" element={<Sell />} />
      <Route path="/calculator" element={<CalculatorPage />} />
      <Route path="/faq" element={<Faq />} />
      <Route path="/p/:slug" element={<CmsPage />} />
      <Route path="/login" element={<CustomerLogin />} />
      <Route path="/register" element={<CustomerRegister />} />
      <Route path="/forgot" element={<ForgotPassword />} />
      <Route path="/account/*" element={<Account />} />
      <Route path="*" element={<div className="wrap page"><Empty title="Page not found"><Link to="/">Go to the homepage</Link></Empty></div>} />
    </Routes>
  ), []);
  return (
    <div className="site">
      <DemoBar />
      {maint ? <Maintenance /> : <><Header /><main>{content}</main><Footer /></>}
    </div>
  );
}
