import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import QRCode from 'qrcode';
import Icon from './lib/icons.jsx';
import { useStore, categoryLabel } from './lib/store.jsx';
import { recordShare } from './lib/actions.js';
import { coverPhoto } from './lib/art.js';
import { LISTING_STATUS } from './lib/catalog.js';
import { initials, priceLabel, priceShort } from './lib/format.js';

/** Hope mark: a roof over an "H". Replaced by the uploaded logo (Settings → Company & branding). */
export function LogoMark({ size = 38, logo, light }) {
  if (logo) return <span className="logo-mark img" style={{ width: size, height: size }}><img src={logo} alt="" /></span>;
  return (
    <span className="logo-mark" style={{ width: size, height: size, background: light ? '#fff' : 'var(--brand)' }}>
      <svg viewBox="0 0 64 64" width={size} height={size} aria-hidden="true">
        <path d="M13 30 32 14l19 16" fill="none" stroke="var(--accent)" strokeWidth="5.5" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M22 28v22M42 28v22M22 39h20" fill="none" stroke={light ? 'var(--brand)' : '#fff'} strokeWidth="5.5" strokeLinecap="round" />
      </svg>
    </span>
  );
}

export function Logo({ to = '/', light, small }) {
  const { state } = useStore();
  const b = state.settings.brand.identity;
  return (
    <Link to={to} className="logo" style={{ color: light ? '#fff' : 'var(--ink)' }}>
      <LogoMark logo={b.logo} light={light} size={small ? 32 : 38} />
      <span><b>{b.name}</b><small>{b.tagline}</small></span>
    </Link>
  );
}

export function Modal({ title, onClose, children, footer, width = 560 }) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose?.(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <div className="modal-bg" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose?.(); }}>
      <div className="modal" style={{ maxWidth: width }} role="dialog" aria-modal="true" aria-label={title}>
        <div className="modal-h"><h3>{title}</h3><button type="button" className="icon-btn" onClick={onClose} aria-label="Close"><Icon name="x" /></button></div>
        <div className="modal-b">{children}</div>
        {footer && <div className="modal-f">{footer}</div>}
      </div>
    </div>
  );
}

/** Ask for a reason / note before an action. onSubmit(text) returns an error or null. */
export function PromptModal({ title, label, placeholder, confirm = 'Confirm', danger, required = true, onSubmit, onClose, children }) {
  const [text, setText] = useState('');
  const [err, setErr] = useState('');
  const go = () => {
    if (required && !text.trim()) { setErr('This is required. It is kept in the audit log.'); return; }
    const e = onSubmit(text.trim());
    if (e) setErr(e); else onClose();
  };
  return (
    <Modal title={title} onClose={onClose} width={480} footer={<><button type="button" className="btn ghost" onClick={onClose}>Cancel</button><button type="button" className={`btn ${danger ? 'danger' : ''}`} onClick={go}>{confirm}</button></>}>
      {children}
      <label className="field"><span>{label}</span><textarea autoFocus value={text} onChange={(e) => { setText(e.target.value); setErr(''); }} placeholder={placeholder} /></label>
      {err && <p className="err-text" style={{ marginTop: 8 }}>{err}</p>}
    </Modal>
  );
}

export function Field({ label, hint, error, children, style }) {
  return <label className={`field ${error ? 'err' : ''}`} style={style}><span>{label}</span>{children}{hint && <small>{hint}</small>}{error && <small className="err-text">{error}</small>}</label>;
}

export function Switch({ checked, onChange, disabled, label }) {
  return <label className="switch" title={label}><input type="checkbox" checked={!!checked} disabled={disabled} onChange={(e) => onChange(e.target.checked)} aria-label={label} /><i /></label>;
}

export function Tabs({ tabs, value, onChange }) {
  return (
    <div className="tabs" role="tablist">
      {tabs.map((t) => <button type="button" role="tab" aria-selected={value === t.key} key={t.key} className={value === t.key ? 'on' : ''} onClick={() => onChange(t.key)}>{t.icon && <Icon name={t.icon} />}{t.label}{t.count != null && <span className="count">{t.count}</span>}</button>)}
    </div>
  );
}

export function Empty({ icon = 'inbox', title, children }) {
  return <div className="empty"><Icon name={icon} /><b style={{ color: 'var(--ink-2)' }}>{title}</b>{children && <div className="mini" style={{ marginTop: 4 }}>{children}</div>}</div>;
}

export function Badge({ tone = 'muted', icon, children }) {
  return <span className={`badge ${tone}`}>{icon && <Icon name={icon} />}{children}</span>;
}

export function ListingStatus({ listing }) {
  if (listing.deleted) return <Badge tone="bad" icon="trash">In Trash</Badge>;
  const s = LISTING_STATUS[listing.status] || { label: listing.status, tone: 'muted' };
  return <Badge tone={s.tone}>{s.label}</Badge>;
}

export function Avatar({ name, photo, size = '' }) {
  const hue = [...(name || '?')].reduce((a, c) => a + c.charCodeAt(0), 0) % 360;
  return <span className={`avatar ${size}`} style={{ background: `hsl(${hue} 45% 42%)` }}>{photo ? <img src={photo} alt="" /> : initials(name)}</span>;
}

export function Stat({ label, value, sub, icon, tone = 'brand', to }) {
  const inner = (
    <>
      <div className="stat-ico" data-tone={tone}><Icon name={icon} /></div>
      <div><div className="stat-v num">{value}</div><div className="stat-l">{label}</div>{sub && <div className="mini">{sub}</div>}</div>
    </>
  );
  return to ? <Link to={to} className="stat card">{inner}</Link> : <div className="stat card">{inner}</div>;
}

export function QR({ text, size = 180 }) {
  const [src, setSrc] = useState('');
  useEffect(() => { QRCode.toDataURL(text, { width: size * 2, margin: 1, color: { dark: '#172033', light: '#ffffff' } }).then(setSrc).catch(() => setSrc('')); }, [text, size]);
  return src ? <img src={src} alt="QR code" width={size} height={size} style={{ width: size, height: size }} /> : <div style={{ width: size, height: size, background: '#f1f3f6' }} />;
}

export const shareUrl = (l, ch) => `${window.location.origin}/l/${l.slug}${ch ? `?ch=${ch}` : ''}`;

/** Share a listing publicly: link, Facebook, Messenger, Viber, QR, printable flyer. */
export function ShareModal({ listing, onClose }) {
  const { state, update, toast } = useStore();
  const [flyer, setFlyer] = useState(false);
  const allowed = state.settings.listings.sharing.publicShare;
  const count = (ch) => update((d) => recordShare(d, listing.id, ch));
  const open = (ch, url) => { count(ch); window.open(url, '_blank', 'noopener'); };
  const copy = () => { count('link'); navigator.clipboard?.writeText(shareUrl(listing, 'link')); toast('Link copied. Anyone with the link can view the listing.'); };
  const u = encodeURIComponent;
  if (flyer) return <FlyerModal listing={listing} onClose={() => setFlyer(false)} />;
  return (
    <Modal title="Share this listing" onClose={onClose} width={560}>
      {!allowed ? <div className="note warn">Public sharing is switched off in Settings → Listing rules.</div> : (
        <div className="stack">
          <div className="share-preview">
            <img src={coverPhoto(listing)} alt="" />
            <div><small>{window.location.host.toUpperCase()}</small><b>{listing.title}</b><span>{priceLabel(listing)} · {listing.city} · {state.settings.brand.identity.fullName}</span></div>
          </div>
          <div className="mini">Guests who open the link can <b>view</b> the listing. To ask, save, book a viewing or reserve they must create an account. Each channel is tracked, so inquiries show where they came from.</div>
          <div className="share-grid">
            <button type="button" className="share-btn" onClick={copy}><Icon name="link" />Copy link</button>
            <button type="button" className="share-btn" style={{ '--c': '#1877F2' }} onClick={() => open('facebook', `https://www.facebook.com/sharer/sharer.php?u=${u(shareUrl(listing, 'facebook'))}`)}><Icon name="facebook" />Facebook</button>
            <button type="button" className="share-btn" style={{ '--c': '#0084FF' }} onClick={() => open('messenger', `https://www.facebook.com/dialog/send?link=${u(shareUrl(listing, 'messenger'))}&app_id=0&redirect_uri=${u(shareUrl(listing))}`)}><Icon name="messenger" />Messenger</button>
            <button type="button" className="share-btn" style={{ '--c': '#7360F2' }} onClick={() => open('viber', `viber://forward?text=${u(`${listing.title} ${shareUrl(listing, 'viber')}`)}`)}><Icon name="phone" />Viber</button>
            <button type="button" className="share-btn" onClick={() => open('link', `mailto:?subject=${u(listing.title)}&body=${u(shareUrl(listing, 'link'))}`)}><Icon name="mail" />Email</button>
            <button type="button" className="share-btn" onClick={() => { count('qr'); setFlyer(true); }}><Icon name="print" />Flyer + QR</button>
          </div>
          <div className="row" style={{ alignItems: 'flex-start', gap: 16 }}>
            <QR text={shareUrl(listing, 'qr')} size={120} />
            <div className="grow"><b>QR code</b><div className="mini">For tarpaulins, flyers and open houses. Scanning opens the listing (or the Hope app if installed) and is counted as "QR / flyer".</div>
              <div className="search-box" style={{ marginTop: 8 }}><input readOnly value={shareUrl(listing)} onFocus={(e) => e.target.select()} /></div></div>
          </div>
        </div>
      )}
    </Modal>
  );
}

function FlyerModal({ listing, onClose }) {
  const { state } = useStore();
  const b = state.settings.brand;
  const agent = state.staff.find((s) => s.id === listing.agentId);
  return (
    <PrintModal title="Printable flyer" onClose={onClose} width={640}>
      <div className="print-doc">
        <div className="print-head"><div className="row"><LogoMark logo={b.identity.logo} /><div><b style={{ fontSize: 18 }}>{b.identity.fullName}</b><div className="mini">{b.company.phone} · {b.company.facebook}</div></div></div><Badge tone="brand">{listing.purpose === 'rent' ? 'FOR RENT' : 'FOR SALE'}</Badge></div>
        <img src={coverPhoto(listing)} alt="" style={{ width: '100%', aspectRatio: '16/9', objectFit: 'cover', borderRadius: 10 }} />
        <h2 style={{ marginTop: 12 }}>{listing.title}</h2>
        <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--brand)', margin: '4px 0 8px' }}>{priceLabel(listing)}</div>
        <div className="row between" style={{ alignItems: 'flex-end' }}>
          <div><div>{listing.city}{listing.barangay ? ` · Brgy. ${listing.barangay}` : ''}</div><div className="mini">{listing.code}</div><p style={{ marginTop: 8 }}>Contact: <b>{agent?.name}</b> · {agent?.phone}</p></div>
          <div style={{ textAlign: 'center' }}><QR text={shareUrl(listing, 'qr')} size={130} /><div className="mini">Scan to view</div></div>
        </div>
      </div>
    </PrintModal>
  );
}

export function PrintModal({ title, onClose, children, width = 640 }) {
  return (
    <Modal title={title} onClose={onClose} width={width} footer={<><button type="button" className="btn ghost" onClick={onClose}>Close</button><button type="button" className="btn" onClick={() => window.print()}><Icon name="print" />Print / save as PDF</button></>}>
      <div className="print-area" style={{ position: 'relative' }}>{children}</div>
    </Modal>
  );
}

export function ListingCard({ listing, onFav, fav, to }) {
  const { state } = useStore();
  const s = listing.specs || {};
  const facts = listing.group === 'vehicle'
    ? [['gauge', `${(s.mileage || 0).toLocaleString()} km`], ['gears', s.transmission], ['fuel', s.fuel]]
    : [s.bedrooms != null && ['bed', s.bedrooms === 0 ? 'Studio' : `${s.bedrooms} bed`], s.bathrooms != null && ['bath', `${s.bathrooms} bath`], (s.floorArea || s.lotArea) && ['area', `${s.floorArea || s.lotArea} sqm`]].filter(Boolean);
  return (
    <article className="lcard">
      <Link to={to || `/l/${listing.slug}`} className="lcard-img">
        <img src={coverPhoto(listing)} alt="" loading="lazy" />
        <span className="lcard-tags"><Badge tone={listing.purpose === 'rent' ? 'info' : 'solid'}>{listing.purpose === 'rent' ? 'For Rent' : 'For Sale'}</Badge>{listing.status === 'reserved' && <Badge tone="accent">Reserved</Badge>}{listing.featured && <Badge tone="accent" icon="star">Featured</Badge>}</span>
      </Link>
      {onFav && <button type="button" className={`fav ${fav ? 'on' : ''}`} onClick={() => onFav(listing)} aria-label={fav ? 'Remove from saved' : 'Save'}><Icon name="heart" /></button>}
      <div className="lcard-b">
        <div className="lcard-price">{priceShort(listing)}</div>
        <Link to={to || `/l/${listing.slug}`} className="lcard-title">{listing.title}</Link>
        <div className="mini row" style={{ gap: 4 }}><Icon name="pin" size={14} />{listing.city} · {categoryLabel(state, listing.category)}</div>
        <div className="lcard-facts">{facts.map(([i, t]) => <span key={i}><Icon name={i} />{t}</span>)}</div>
      </div>
    </article>
  );
}

/** Sample accounts box for the sign-in pages. onPick(email). */
export function DemoCredentials({ accounts, onPick, password, extra }) {
  return (
    <div className="creds">
      <h4><Icon name="key" />Sample accounts (click to fill)</h4>
      <div style={{ display: 'grid', gap: 2 }}>
        {accounts.map((a) => <button type="button" key={a.email} className="cred" onClick={() => onPick(a.email)}><span><b>{a.label}</b> <span className="mini">{a.note}</span></span><span className="mono">{a.email}</span></button>)}
      </div>
      <div className="mini" style={{ marginTop: 8 }}>Password <b className="mono">{password}</b>{extra}</div>
    </div>
  );
}

export function ResetDataButton({ className = 'btn ghost sm', label = 'Reset all demo data' }) {
  const { reset, toast } = useStore();
  const [ask, setAsk] = useState(false);
  return (
    <>
      <button type="button" className={className} onClick={() => setAsk(true)}><Icon name="refresh" />{label}</button>
      {ask && (
        <Modal title="Reset all demo data?" onClose={() => setAsk(false)} width={440} footer={<><button type="button" className="btn ghost" onClick={() => setAsk(false)}>Cancel</button><button type="button" className="btn danger" onClick={() => { reset(); setAsk(false); toast('Demo data restored. Everyone is signed out.'); }}>Reset</button></>}>
          <p>Every change made in this browser (listings, deals, settings, CMS, accounts, phone simulator) is removed and the sample data is loaded again. Everyone is signed out.</p>
        </Modal>
      )}
    </>
  );
}

export function Gallery({ photos }) {
  const [i, setI] = useState(0);
  const [full, setFull] = useState(false);
  return (
    <div className="gallery">
      <button type="button" className="gallery-main" onClick={() => setFull(true)}><img src={photos[i]} alt="" /><span className="gallery-count"><Icon name="image" />{i + 1} / {photos.length}</span></button>
      <div className="gallery-thumbs">{photos.map((p, k) => <button type="button" key={k} className={k === i ? 'on' : ''} onClick={() => setI(k)}><img src={p} alt="" /></button>)}</div>
      {full && (
        <div className="lightbox" onClick={() => setFull(false)} role="dialog" aria-label="Photo">
          <button type="button" className="lb-nav l" onClick={(e) => { e.stopPropagation(); setI((i - 1 + photos.length) % photos.length); }} aria-label="Previous"><Icon name="left" /></button>
          <img src={photos[i]} alt="" onClick={(e) => e.stopPropagation()} />
          <button type="button" className="lb-nav r" onClick={(e) => { e.stopPropagation(); setI((i + 1) % photos.length); }} aria-label="Next"><Icon name="next" /></button>
        </div>
      )}
    </div>
  );
}

export function Pager({ page, pages, onPage }) {
  if (pages <= 1) return null;
  return (
    <div className="row" style={{ justifyContent: 'center', padding: 12 }}>
      <button type="button" className="btn ghost sm" disabled={page <= 1} onClick={() => onPage(page - 1)}><Icon name="left" />Prev</button>
      <span className="mini">Page {page} of {pages}</span>
      <button type="button" className="btn ghost sm" disabled={page >= pages} onClick={() => onPage(page + 1)}>Next<Icon name="next" /></button>
    </div>
  );
}
