import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import Icon from '../lib/icons.jsx';
import { audit, categoryLabel, meCustomer, useStore } from '../lib/store.jsx';
import { createInquiry, requestViewing } from '../lib/actions.js';
import { listingPhotos } from '../lib/art.js';
import { addDays, fmtDate, peso, priceLabel } from '../lib/format.js';
import { Avatar, Badge, Empty, Gallery, ListingCard, Modal, Pager, ShareModal } from '../components.jsx';
import { AccountGate, Calculator } from './SiteApp.jsx';

const source = () => { try { return sessionStorage.getItem('hope-src') || 'web'; } catch { return 'web'; } };

/** Save / unsave a listing; guests see the account gate. */
export function useFavourite() {
  const { state, update, toast } = useStore();
  const cust = meCustomer(state);
  const [gateOpen, setGate] = useState(false);
  const isFav = (id) => !!cust?.favourites.includes(id);
  const toggle = (l) => {
    if (!cust) { setGate(true); return; }
    update((d) => {
      const c = d.customers.find((x) => x.id === cust.id);
      const on = c.favourites.includes(l.id);
      c.favourites = on ? c.favourites.filter((x) => x !== l.id) : [l.id, ...c.favourites];
    });
    toast(isFav(l.id) ? 'Removed from saved listings.' : 'Saved. Find it in your account.');
  };
  return { isFav, toggle, gate: gateOpen ? <AccountGate reason="save listings" onClose={() => setGate(false)} /> : null };
}

export function Browse() {
  const { state } = useStore();
  const [sp, setSp] = useSearchParams();
  const [page, setPage] = useState(1);
  const { isFav, toggle, gate } = useFavourite();
  const f = Object.fromEntries(sp.entries());
  const set = (k, v) => { const n = new URLSearchParams(sp); if (v) n.set(k, v); else n.delete(k); setSp(n, { replace: true }); setPage(1); };
  const cats = state.categories.filter((c) => c.active && (!f.group || c.group === f.group));
  const rows = useMemo(() => {
    let r = state.listings.filter((l) => ['published', 'reserved'].includes(l.status) && !l.deleted);
    if (f.purpose) r = r.filter((l) => l.purpose === f.purpose);
    if (f.group) r = r.filter((l) => l.group === f.group);
    if (f.category) r = r.filter((l) => l.category === f.category);
    if (f.city) r = r.filter((l) => l.city === f.city);
    if (f.beds) r = r.filter((l) => (l.specs.bedrooms || 0) >= Number(f.beds));
    if (f.min) r = r.filter((l) => l.price >= Number(f.min));
    if (f.max) r = r.filter((l) => l.price <= Number(f.max));
    if (f.q) { const q = f.q.toLowerCase(); r = r.filter((l) => `${l.title} ${l.description} ${l.city} ${l.barangay} ${l.features.join(' ')} ${Object.values(l.specs).join(' ')}`.toLowerCase().includes(q)); }
    const sort = f.sort || 'newest';
    r = [...r].sort((a, b) => (sort === 'price_asc' ? a.price - b.price : sort === 'price_desc' ? b.price - a.price : sort === 'popular' ? b.views - a.views : (b.publishedAt || '').localeCompare(a.publishedAt || '')));
    return r;
  }, [state.listings, sp]);
  const per = 12;
  const pages = Math.max(1, Math.ceil(rows.length / per));
  const title = f.group === 'vehicle' ? 'Vehicles' : f.purpose === 'rent' ? 'For rent' : f.purpose === 'sale' ? 'For sale' : 'All listings';

  return (
    <div className="wrap page">
      <div className="sec-h"><div><h1>{title}</h1><p className="muted">{rows.length} result{rows.length === 1 ? '' : 's'}</p></div>
        <select className="input" style={{ width: 'auto' }} value={f.sort || 'newest'} onChange={(e) => set('sort', e.target.value)}><option value="newest">Newest</option><option value="price_asc">Price: low to high</option><option value="price_desc">Price: high to low</option><option value="popular">Most viewed</option></select>
      </div>
      <div className="filters card">
        <div className="chips">
          {[['', 'All'], ['sale', 'For sale'], ['rent', 'For rent']].map(([k, t]) => <button type="button" key={k} className={`chip ${(f.purpose || '') === k ? 'on' : ''}`} onClick={() => set('purpose', k)}>{t}</button>)}
          <span style={{ width: 10 }} />
          {[['', 'Everything'], ['property', 'Property'], ['vehicle', 'Vehicles']].map(([k, t]) => <button type="button" key={k} className={`chip ${(f.group || '') === k ? 'on' : ''}`} onClick={() => { const n = new URLSearchParams(sp); if (k) n.set('group', k); else n.delete('group'); n.delete('category'); setSp(n, { replace: true }); }}>{t}</button>)}
        </div>
        <div className="filter-row">
          <label className="search-box grow"><Icon name="search" /><input defaultValue={f.q} placeholder="Keyword, barangay, model…" onKeyDown={(e) => { if (e.key === 'Enter') set('q', e.target.value); }} onBlur={(e) => set('q', e.target.value)} /></label>
          <select className="input" value={f.category || ''} onChange={(e) => set('category', e.target.value)}><option value="">Any type</option>{cats.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}</select>
          <select className="input" value={f.city || ''} onChange={(e) => set('city', e.target.value)}><option value="">Any location</option>{state.cms.locations.map((c) => <option key={c}>{c}</option>)}</select>
          {f.group !== 'vehicle' && <select className="input" value={f.beds || ''} onChange={(e) => set('beds', e.target.value)}><option value="">Any bedrooms</option>{[1, 2, 3, 4].map((n) => <option key={n} value={n}>{n}+ bedrooms</option>)}</select>}
          <input className="input" type="number" placeholder="Min ₱" defaultValue={f.min} onBlur={(e) => set('min', e.target.value)} />
          <input className="input" type="number" placeholder="Max ₱" defaultValue={f.max} onBlur={(e) => set('max', e.target.value)} />
        </div>
      </div>
      {rows.length ? <div className="lgrid">{rows.slice((page - 1) * per, page * per).map((l) => <ListingCard key={l.id} listing={l} fav={isFav(l.id)} onFav={toggle} />)}</div> : <Empty icon="search" title="No listings match">Try another location or fewer filters.</Empty>}
      <Pager page={page} pages={pages} onPage={setPage} />
      {gate}
    </div>
  );
}

function Spec({ icon, label, value }) {
  if (value == null || value === '') return null;
  return <div className="spec"><Icon name={icon} /><span>{label}</span><b>{value}</b></div>;
}

export function ListingPage() {
  const { slug } = useParams();
  const { state, update, toast } = useStore();
  const nav = useNavigate();
  const cust = meCustomer(state);
  const l = state.listings.find((x) => x.slug === slug);
  const [share, setShare] = useState(false);
  const [gate, setGate] = useState(null);
  const [ask, setAsk] = useState(false);
  const [view, setView] = useState(false);
  const { isFav, toggle, gate: favGate } = useFavourite();
  const counted = useRef(false);
  useEffect(() => {
    if (l && !counted.current) { counted.current = true; update((d) => { const x = d.listings.find((y) => y.id === l.id); if (x) x.views += 1; }); }
  }, [l, update]);

  if (!l || l.deleted || !['published', 'reserved', 'sold', 'rented'].includes(l.status)) return <div className="wrap page"><Empty icon="search" title="This listing is not available">It may have been taken down. <Link to="/listings">Browse other listings</Link></Empty></div>;
  const sh = state.settings.listings.sharing;
  if (!cust && !sh.guestCanView) return <div className="wrap page"><Empty icon="lock" title="Sign in to view listings"><Link to={`/login?next=/l/${l.slug}`}>Sign in</Link></Empty></div>;
  const agent = state.staff.find((s) => s.id === l.agentId);
  const s = l.specs || {};
  const closed = ['sold', 'rented'].includes(l.status);
  const myInquiry = cust && state.inquiries.find((q) => q.listingId === l.id && q.customerId === cust.id);
  const similar = state.listings.filter((x) => x.id !== l.id && x.category === l.category && x.purpose === l.purpose && ['published'].includes(x.status) && !x.deleted).slice(0, 4);
  const need = (reason, fn) => () => (cust ? fn() : setGate(reason));

  return (
    <div className="wrap page">
      <div className="crumbs"><Link to="/listings">Listings</Link><Icon name="next" size={14} /><Link to={`/listings?category=${l.category}`}>{categoryLabel(state, l.category)}</Link><Icon name="next" size={14} /><span>{l.code}</span></div>
      {!cust && <div className="note" style={{ marginBottom: 14 }}><b>You are viewing as a guest.</b> Create a free account to message the agent, save this listing or book a viewing.</div>}
      <div className="ldetail">
        <div>
          <Gallery photos={listingPhotos(l)} />
          <div className="card card-pad" style={{ marginTop: 16 }}>
            <h3>Details</h3>
            <div className="spec-grid">
              {l.group === 'vehicle' ? (<>
                <Spec icon="car" label="Make / model" value={`${s.make} ${s.model}`} /><Spec icon="calendar" label="Year" value={s.year} /><Spec icon="gauge" label="Mileage" value={s.mileage != null ? `${Number(s.mileage).toLocaleString()} km` : null} />
                <Spec icon="gears" label="Transmission" value={s.transmission} /><Spec icon="fuel" label="Fuel" value={s.fuel} /><Spec icon="tag" label="Body" value={s.bodyType} /><Spec icon="palette" label="Color" value={s.color} />
              </>) : (<>
                <Spec icon="bed" label="Bedrooms" value={s.bedrooms === 0 ? 'Studio' : s.bedrooms} /><Spec icon="bath" label="Bathrooms" value={s.bathrooms} /><Spec icon="area" label="Floor area" value={s.floorArea ? `${s.floorArea} sqm` : null} />
                <Spec icon="land" label="Lot area" value={s.lotArea ? `${s.lotArea} sqm` : null} /><Spec icon="car" label="Parking" value={s.parking} /><Spec icon="building" label="Floor" value={s.floorLevel} /><Spec icon="home" label="Furnishing" value={s.furnishing} /><Spec icon="file" label="Zoning" value={s.zoning} />
              </>)}
            </div>
            <h3 style={{ marginTop: 18 }}>Description</h3>
            <p style={{ whiteSpace: 'pre-line' }}>{l.description}</p>
            {l.features.length > 0 && <><h3>Features</h3><div className="chips">{l.features.map((x) => <span key={x} className="chip"><Icon name="check" />{x}</span>)}</div></>}
            <h3 style={{ marginTop: 18 }}>Location</h3>
            <p><Icon name="pin" size={15} /> {cust || sh.guestSeesAddress ? l.address : `Brgy. ${l.barangay}, ${l.city}`}{!cust && !sh.guestSeesAddress && <span className="mini"> · exact address after you sign in</span>}</p>
            <div className="map-ph"><Icon name="map" /><span>{state.integrations.maps.on ? 'Map' : 'The map appears here once Google Maps is connected (Settings → Integrations).'}</span></div>
          </div>
          {l.group === 'property' && l.purpose === 'sale' && <div className="card card-pad" style={{ marginTop: 16 }}><h3>Estimate your monthly amortization</h3><Calculator initialPrice={l.price} /></div>}
        </div>
        <aside className="ld-side">
          <div className="card card-pad sticky">
            <div className="row" style={{ gap: 6, marginBottom: 6 }}><Badge tone={l.purpose === 'rent' ? 'info' : 'solid'}>{l.purpose === 'rent' ? 'For Rent' : 'For Sale'}</Badge>{l.status === 'reserved' && <Badge tone="accent">Reserved</Badge>}{closed && <Badge tone="brand">{l.status === 'sold' ? 'Sold' : 'Rented'}</Badge>}<Badge tone="ok" icon="verified">Verified</Badge></div>
            <h1 className="ld-title">{l.title}</h1>
            <div className="ld-price">{priceLabel(l)}</div>
            <div className="mini">{l.negotiable ? 'Negotiable · ' : ''}{l.code} · listed {fmtDate(l.publishedAt)}</div>
            <div className="stack" style={{ marginTop: 14 }}>
              {!closed && <button type="button" className="btn lg" onClick={need('message the agent', () => setAsk(true))}><Icon name="message" />{myInquiry ? 'Message the agent' : 'Ask the agent'}</button>}
              {!closed && <button type="button" className="btn soft lg" onClick={need('book a viewing', () => setView(true))}><Icon name="calendar" />Book a viewing</button>}
              <div className="row" style={{ gap: 8 }}>
                <button type="button" className="btn ghost grow" onClick={() => toggle(l)}><Icon name="heart" />{isFav(l.id) ? 'Saved' : 'Save'}</button>
                <button type="button" className="btn ghost grow" onClick={() => setShare(true)}><Icon name="share" />Share</button>
              </div>
              {myInquiry && <Link to={`/account/inquiries/${myInquiry.id}`} className="mini">You already asked about this · open conversation</Link>}
            </div>
            <hr />
            <div className="row" style={{ gap: 12 }}>
              <Avatar name={agent?.name} photo={agent?.photo} />
              <div className="grow"><Link to={`/agents/${agent?.id}`}><b>{agent?.name}</b></Link><div className="mini">Hope account specialist</div></div>
            </div>
            <div className="mini" style={{ marginTop: 8 }}>{cust || sh.guestSeesContact ? <><Icon name="phone" size={14} /> {agent?.phone}</> : <><Icon name="lock" size={14} /> Contact number visible after you sign in</>}</div>
          </div>
        </aside>
      </div>
      {similar.length > 0 && <><h2 style={{ marginTop: 30 }}>Similar listings</h2><div className="lgrid">{similar.map((x) => <ListingCard key={x.id} listing={x} fav={isFav(x.id)} onFav={toggle} />)}</div></>}
      {share && <ShareModal listing={l} onClose={() => setShare(false)} />}
      {gate && <AccountGate reason={gate} onClose={() => setGate(null)} />}
      {favGate}
      {ask && <AskModal listing={l} onClose={() => setAsk(false)} onSent={(q) => { setAsk(false); toast('Message sent. The agent will reply here and in the app.'); nav(`/account/inquiries/${q.id}`); }} />}
      {view && <ViewingModal listing={l} onClose={() => setView(false)} onDone={() => { setView(false); toast('Viewing requested. You will be notified when the agent confirms.'); nav('/account/viewings'); }} />}
    </div>
  );
}

function AskModal({ listing, onClose, onSent }) {
  const { state, update } = useStore();
  const cust = meCustomer(state);
  const agent = state.staff.find((x) => x.id === listing.agentId);
  const [text, setText] = useState('Hi! Is this still available? I would like to know more.');
  return (
    <Modal title="Ask the agent" onClose={onClose} width={480} footer={<><button type="button" className="btn ghost" onClick={onClose}>Cancel</button><button type="button" className="btn" disabled={!text.trim()} onClick={() => { const q = update((d) => createInquiry(d, listing.id, cust.id, text.trim(), source())); onSent(q); }}><Icon name="send" />Send</button></>}>
      <p className="mini">About <b>{listing.title}</b> ({listing.code}). Your name, email and mobile are shared with {agent?.name}.</p>
      <textarea className="input" value={text} onChange={(e) => setText(e.target.value)} rows={4} autoFocus />
      <div className="chips" style={{ marginTop: 8 }}>{['Is the price negotiable?', 'Can I view this weekend?', 'Is bank financing possible?', 'Are pets allowed?'].map((t) => <button type="button" key={t} className="chip" onClick={() => setText(t)}>{t}</button>)}</div>
    </Modal>
  );
}

function ViewingModal({ listing, onClose, onDone }) {
  const { state, update } = useStore();
  const cust = meCustomer(state);
  const agent = state.staff.find((x) => x.id === listing.agentId);
  const [date, setDate] = useState(addDays(new Date(), 2).toISOString().slice(0, 10));
  const [time, setTime] = useState('10:00');
  const [note, setNote] = useState('');
  return (
    <Modal title="Book a viewing" onClose={onClose} width={460} footer={<><button type="button" className="btn ghost" onClick={onClose}>Cancel</button><button type="button" className="btn" onClick={() => { update((d) => { requestViewing(d, listing.id, cust.id, new Date(`${date}T${time}`).toISOString(), note, source()); audit(d, 'viewing.requested.web', 'Viewing requested on the website', { subject: { type: 'listing', id: listing.id, label: listing.code } }); }); onDone(); }}><Icon name="calendar" />Request viewing</button></>}>
      <p className="mini">{listing.title} · {listing.city}. {agent?.name} will confirm or suggest another time.</p>
      <div className="grid2">
        <label className="field"><span>Date</span><input type="date" value={date} min={new Date().toISOString().slice(0, 10)} onChange={(e) => setDate(e.target.value)} /></label>
        <label className="field"><span>Time</span><select value={time} onChange={(e) => setTime(e.target.value)}>{['09:00', '10:00', '11:00', '13:00', '14:00', '15:00', '16:00', '17:00'].map((t) => <option key={t}>{t}</option>)}</select></label>
      </div>
      <label className="field" style={{ marginTop: 10 }}><span>Note for the agent (optional)</span><input value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Family of 4, bringing my parents" /></label>
      <p className="mini" style={{ marginTop: 10 }}>{peso(listing.price)}{listing.priceUnit === 'month' ? ' / month' : ''}</p>
    </Modal>
  );
}
