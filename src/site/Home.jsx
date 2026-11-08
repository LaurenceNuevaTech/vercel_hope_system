import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Icon from '../lib/icons.jsx';
import { meCustomer, useStore } from '../lib/store.jsx';
import { Avatar, ListingCard } from '../components.jsx';
import { useFavourite } from './Listings.jsx';

export default function Home() {
  const { state } = useStore();
  const nav = useNavigate();
  const [purpose, setPurpose] = useState('sale');
  const [cat, setCat] = useState('');
  const [city, setCity] = useState('');
  const [q, setQ] = useState('');
  const { isFav, toggle, gate } = useFavourite();
  const cms = state.cms;
  const live = state.listings.filter((l) => ['published', 'reserved'].includes(l.status) && !l.deleted);
  const featured = live.filter((l) => l.featured).slice(0, 6);
  const brandNew = live.filter((l) => l.condition === 'brand_new').sort((a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0)).slice(0, 8);
  const rentals = live.filter((l) => l.purpose === 'rent').slice(0, 4);
  const vehicles = live.filter((l) => l.group === 'vehicle' && l.purpose === 'sale').slice(0, 4);
  const cats = state.categories.filter((c) => c.active);
  const closed = state.deals.filter((d) => d.status === 'closed').length;
  const agents = state.staff.filter((s) => s.role === 'agent' && s.status === 'active');
  const cust = meCustomer(state);

  const search = (e) => {
    e.preventDefault();
    const p = new URLSearchParams({ purpose, ...(cat ? { category: cat } : {}), ...(city ? { city } : {}), ...(q ? { q } : {}) });
    nav(`/listings?${p}`);
  };

  return (
    <>
      <section className="hero">
        <div className="wrap hero-in">
          <div className="hero-text">
            <span className="eyebrow"><Icon name="sparkle" size={15} />{state.settings.brand.identity.slogan}</span>
            <h1>{cms.home.heroTitle}</h1>
            <p>{cms.home.heroSubtitle}</p>
          </div>
          <form className="hero-search card" onSubmit={search}>
            <div className="seg">
              {[['sale', 'Buy'], ['rent', 'Rent']].map(([k, t]) => <button type="button" key={k} className={purpose === k ? 'on' : ''} onClick={() => setPurpose(k)}>{t}</button>)}
            </div>
            <div className="hs-fields">
              <label className="field"><span>Looking for</span><select value={cat} onChange={(e) => setCat(e.target.value)}><option value="">Any type</option>{cats.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}</select></label>
              <label className="field"><span>Location</span><select value={city} onChange={(e) => setCity(e.target.value)}><option value="">Anywhere</option>{cms.locations.map((c) => <option key={c}>{c}</option>)}</select></label>
              <label className="field"><span>Keyword</span><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="e.g. pool, corner, Fortuner" /></label>
              <button className="btn accent lg" type="submit"><Icon name="search" />Search</button>
            </div>
          </form>
          {cms.home.showStats && (
            <div className="hero-stats">
              <div><b>{live.length}</b><span>active listings</span></div>
              <div><b>{agents.length}</b><span>verified agents</span></div>
              <div><b>{closed}</b><span>deals closed in 12 months</span></div>
            </div>
          )}
        </div>
      </section>

      <section className="wrap sec">
        <div className="cat-grid">
          {cats.map((c) => {
            const n = live.filter((l) => l.category === c.key).length;
            return <Link key={c.key} to={`/listings?category=${c.key}`} className="cat-card"><span><Icon name={c.icon} /></span><b>{c.label}</b><small>{n} listing{n === 1 ? '' : 's'}</small></Link>;
          })}
        </div>
      </section>

      {brandNew.length > 0 && (
        <section className="wrap sec">
          <div className="sec-h"><div><h2>Brand-new homes and cars</h2><p className="muted">Ready-for-occupancy homes from developers and 2026 units from dealers, with warranty and financing.</p></div><Link to="/listings?cond=brand_new" className="btn ghost sm">All brand new<Icon name="right" /></Link></div>
          <div className="lgrid">{brandNew.map((l) => <ListingCard key={l.id} listing={l} fav={isFav(l.id)} onFav={toggle} />)}</div>
        </section>
      )}

      {featured.length > 0 && (
        <section className="wrap sec">
          <div className="sec-h"><div><h2>Featured listings</h2><p className="muted">Hand-picked by the Hope team.</p></div><Link to="/listings" className="btn ghost sm">View all<Icon name="right" /></Link></div>
          <div className="lgrid">{featured.map((l) => <ListingCard key={l.id} listing={l} fav={isFav(l.id)} onFav={toggle} />)}</div>
        </section>
      )}

      <section className="wrap sec">
        <div className="sec-h"><div><h2>For rent</h2><p className="muted">Condos, houses and spaces ready to move in.</p></div><Link to="/listings?purpose=rent" className="btn ghost sm">All rentals<Icon name="right" /></Link></div>
        <div className="lgrid">{rentals.map((l) => <ListingCard key={l.id} listing={l} fav={isFav(l.id)} onFav={toggle} />)}</div>
      </section>

      <section className="wrap sec">
        <div className="sec-h"><div><h2>Cars and motorcycles</h2><p className="muted">Brand-new units from dealers and quality pre-owned vehicles with complete papers.</p></div><Link to="/listings?group=vehicle" className="btn ghost sm">All vehicles<Icon name="right" /></Link></div>
        <div className="lgrid">{vehicles.map((l) => <ListingCard key={l.id} listing={l} fav={isFav(l.id)} onFav={toggle} />)}</div>
      </section>

      <section className="sec band">
        <div className="wrap">
          <h2 style={{ textAlign: 'center' }}>How it works</h2>
          <div className="steps">
            {[['search', 'Browse', 'View any listing, even from a shared link. No account needed.'], ['message', 'Ask the agent', 'Create a free account to message the agent and save listings.'], ['calendar', 'Book a viewing', 'Pick a schedule; the agent confirms and you get a reminder.'], ['receipt', 'Reserve', 'Pay the reservation fee in the app or at the office and get a receipt.'], ['key', 'Move in / drive home', 'Track the documents until turnover in your account.']].map(([i, t, d], k) => (
              <div key={t} className="step"><span className="step-n">{k + 1}</span><Icon name={i} /><b>{t}</b><p>{d}</p></div>
            ))}
          </div>
        </div>
      </section>

      <section className="wrap sec">
        <div className="why-grid">
          {cms.why.map((w) => <div key={w.title} className="why card"><span><Icon name={w.icon} /></span><b>{w.title}</b><p>{w.text}</p></div>)}
        </div>
      </section>

      <section className="wrap sec">
        <div className="cta card">
          <div><h2>{cms.home.ctaTitle}</h2><p>{cms.home.ctaText}</p></div>
          <Link to="/sell" className="btn accent lg">Sell or lease with Hope<Icon name="right" /></Link>
        </div>
      </section>

      <section className="wrap sec">
        <h2>What clients say</h2>
        <div className="why-grid">{cms.testimonials.map((t) => <figure key={t.name} className="quote card"><blockquote>“{t.text}”</blockquote><figcaption><Avatar name={t.name} size="sm" /><span><b>{t.name}</b><small>{t.where}</small></span></figcaption></figure>)}</div>
      </section>

      <section className="wrap sec">
        <div className="sec-h"><div><h2>Meet our agents</h2></div><Link to="/agents" className="btn ghost sm">All agents<Icon name="right" /></Link></div>
        <div className="agent-strip">{agents.map((a) => <Link key={a.id} to={`/agents/${a.id}`} className="agent-chip"><Avatar name={a.name} photo={a.photo} /><span><b>{a.name}</b><small>{state.teams.find((t) => t.id === a.teamId)?.name}</small></span></Link>)}</div>
      </section>

      {!cust && (
        <section className="wrap sec">
          <div className="app-cta card">
            <div><h2>Get the Hope app</h2><p>Sign in with your PIN or fingerprint / face, get viewing reminders, chat with your agent and pay online.</p><div className="row"><Link to="/mobile" className="btn"><Icon name="smartphone" />Try the app simulator</Link></div></div>
            <div className="app-cta-phone"><Icon name="fingerprint" size={64} /></div>
          </div>
        </section>
      )}
      {gate}
    </>
  );
}
