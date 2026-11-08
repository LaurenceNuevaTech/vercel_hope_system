import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import Icon from '../lib/icons.jsx';
import { audit, categoryLabel, customerName, me, notify, readPhoto, staffName, useStore } from '../lib/store.jsx';
import { can, canApprove, scope, visible } from '../lib/auth.js';
import { approveListing, deleteListing, restoreListing, reviewListing, saveListing, setListingStatus, submitListing, toggleFeatured } from '../lib/actions.js';
import { coverPhoto, listingPhotos } from '../lib/art.js';
import { LEAD_STAGES, LISTING_STATUS, PURPOSES } from '../lib/catalog.js';
import { fmtDate, fmtDateTime, peso, priceLabel, sum, timeAgo } from '../lib/format.js';
import { Badge, Empty, Field, Gallery, ListingStatus, Modal, PromptModal, ShareModal, Tabs } from '../components.jsx';
import { Page } from './AdminApp.jsx';
import { Timeline } from './Audit.jsx';

export function Listings() {
  const { state } = useStore();
  const nav = useNavigate();
  const [tab, setTab] = useState('all');
  const [q, setQ] = useState('');
  const [agent, setAgent] = useState('');
  const [cat, setCat] = useState('');
  const all = visible(state, 'listings', state.listings);
  const live = all.filter((l) => !l.deleted);
  const tabs = [
    ['all', 'All', (l) => true], ['published', 'Published', (l) => l.status === 'published'], ['review', 'In review', (l) => ['pending', 'changes'].includes(l.status)],
    ['draft', 'Drafts', (l) => l.status === 'draft'], ['reserved', 'Reserved', (l) => l.status === 'reserved'], ['closed', 'Sold / rented', (l) => ['sold', 'rented'].includes(l.status)],
    ['other', 'Rejected / archived', (l) => ['rejected', 'archived', 'expired'].includes(l.status)],
  ];
  const fn = tabs.find((t) => t[0] === tab)?.[2];
  let rows = tab === 'trash' ? all.filter((l) => l.deleted) : live.filter(fn);
  if (q) { const s = q.toLowerCase(); rows = rows.filter((l) => `${l.code} ${l.title} ${l.city} ${l.ownerName}`.toLowerCase().includes(s)); }
  if (agent) rows = rows.filter((l) => l.agentId === agent);
  if (cat) rows = rows.filter((l) => l.category === cat);
  rows = [...rows].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  const sc = scope(state, 'listings');
  return (
    <Page title="Listings" sub={sc === 'all' ? 'All listings' : sc === 'team' ? 'Your team\'s listings' : 'Your listings'} actions={can(state, 'listings.create') && <Link to="/admin/listings/new" className="btn"><Icon name="plus" />New listing</Link>}>
      <div className="card">
        <Tabs value={tab} onChange={setTab} tabs={[...tabs.map(([k, label, f]) => ({ key: k, label, count: live.filter(f).length })), ...(can(state, 'listings.delete') || sc !== 'own' ? [{ key: 'trash', label: 'Trash', icon: 'trash', count: all.filter((l) => l.deleted).length }] : [])]} />
        <div className="toolbar">
          <label className="search-box grow"><Icon name="search" /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Code, title, city, owner…" /></label>
          {sc !== 'own' && <select className="input" style={{ width: 'auto' }} value={agent} onChange={(e) => setAgent(e.target.value)}><option value="">All agents</option>{state.staff.filter((s) => ['agent', 'manager'].includes(s.role) && (sc === 'all' || s.teamId === me(state).teamId)).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select>}
          <select className="input" style={{ width: 'auto' }} value={cat} onChange={(e) => setCat(e.target.value)}><option value="">All categories</option>{state.categories.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}</select>
        </div>
        {rows.length ? (
          <div className="table-wrap"><table className="t"><thead><tr><th>Listing</th><th>Category</th><th className="r">Price</th><th>Agent</th><th>Status</th><th className="r">Views</th><th>Updated</th></tr></thead><tbody>
            {rows.map((l) => (
              <tr key={l.id} className="click" onClick={() => nav(`/admin/listings/${l.id}`)}>
                <td><div className="row" style={{ flexWrap: 'nowrap' }}><img src={coverPhoto(l)} alt="" className="thumb" /><div><b className="ellipsis" style={{ display: 'block', maxWidth: 300 }}>{l.title}</b><span className="mini mono">{l.code}</span> {l.featured && <Badge tone="accent" icon="star">Featured</Badge>}</div></div></td>
                <td>{categoryLabel(state, l.category)}<div className="mini">{PURPOSES[l.purpose]}</div></td>
                <td className="r num nowrap">{priceLabel(l)}</td>
                <td>{staffName(state, l.agentId)}</td>
                <td><ListingStatus listing={l} />{l.deleted && <div className="mini">{l.deleted.reason}</div>}</td>
                <td className="r num">{l.views.toLocaleString()}</td>
                <td className="mini nowrap">{timeAgo(l.updatedAt)}</td>
              </tr>
            ))}
          </tbody></table></div>
        ) : <Empty icon="layers" title="No listings here" />}
      </div>
    </Page>
  );
}

const EMPTY = { title: '', purpose: 'sale', category: 'house_lot', price: '', priceUnit: 'total', negotiable: true, city: '', barangay: '', address: '', description: '', features: [], specs: {}, photos: [], ownerName: '', ownerPhone: '', authorityFile: '' };

export function ListingEditor() {
  const { id } = useParams();
  const { state, update, toast } = useStore();
  const nav = useNavigate();
  const s = me(state);
  const existing = id ? state.listings.find((l) => l.id === id) : null;
  const [f, setF] = useState(() => (existing ? { ...structuredClone(existing), photos: existing.photos.length ? existing.photos : [] } : { ...EMPTY, city: state.cms.locations[0], agentId: s.id }));
  const [err, setErr] = useState('');
  const cat = state.categories.find((c) => c.key === f.category);
  const group = cat?.group || 'property';
  const set = (k, v) => setF((x) => ({ ...x, [k]: v }));
  const spec = (k, v) => setF((x) => ({ ...x, specs: { ...x.specs, [k]: v } }));
  const w = state.settings.listings.workflow;
  const canPick = can(state, 'listings.reassign') || can(state, 'listings.edit_any');
  if (existing && !(can(state, 'listings.edit_any') || existing.agentId === s.id || (scope(state, 'listings') === 'team' && existing.teamId === s.teamId))) return <Page title="Edit listing"><Empty icon="lock" title="You can only edit your own listings" /></Page>;

  const addPhotos = async (files) => {
    const max = Number(w.maxPhotos);
    try {
      const imgs = await Promise.all([...files].slice(0, Math.max(0, max - f.photos.length)).map((x) => readPhoto(x)));
      set('photos', [...f.photos, ...imgs]);
    } catch (e) { toast(e.message, 'err'); }
  };
  const save = (submit) => {
    if (!f.title.trim() || !(Number(f.price) > 0) || !f.city) { setErr('Title, price and location are required.'); return; }
    const photosCount = f.photos.length || (existing ? listingPhotos(existing).length : 0);
    if (submit && photosCount < Number(w.minPhotos)) { setErr(`Add at least ${w.minPhotos} photo(s) before submitting.`); return; }
    if (submit && w.requireAuthority && !(f.authorityFile || existing?.authority?.file)) { setErr('Upload the owner\'s Authority to Sell / Lease before submitting (Listing rules).'); return; }
    const data = { ...f, price: Number(f.price), priceUnit: f.purpose === 'sale' ? 'total' : f.priceUnit === 'total' ? 'month' : f.priceUnit };
    if (existing && !f.photos.length) data.photos = existing.photos;
    if (data.authorityFile) data.authority = { ...(existing?.authority || { type: 'Exclusive' }), file: data.authorityFile, validUntil: existing?.authority?.validUntil || new Date(Date.now() + 180 * 864e5).toISOString() };
    delete data.authorityFile;
    const l = update((d) => saveListing(d, data, { submit }));
    toast(submit ? (l.status === 'published' ? 'Published.' : 'Submitted for approval. Your Manager was notified.') : 'Saved.');
    nav(`/admin/listings/${l.id}`);
  };

  const featureList = group === 'vehicle' ? state.cms.vehicleFeatures : state.cms.propertyFeatures;
  return (
    <Page title={existing ? `Edit ${existing.code}` : 'New listing'} sub={w.requireApproval ? 'Listings are checked by a Manager before they go live.' : 'Listings are published right away.'}
      actions={<><Link to={existing ? `/admin/listings/${existing.id}` : '/admin/listings'} className="btn ghost">Cancel</Link><button type="button" className="btn ghost" onClick={() => save(false)}>Save draft</button>{(!existing || ['draft', 'changes', 'rejected'].includes(existing.status)) && <button type="button" className="btn" onClick={() => save(true)}><Icon name="send" />{w.requireApproval ? 'Submit for approval' : 'Publish'}</button>}{existing && ['published', 'reserved', 'pending'].includes(existing.status) && <button type="button" className="btn" onClick={() => save(false)}><Icon name="check" />Save changes</button>}</>}>
      {existing?.review && existing.status === 'changes' && <div className="note warn" style={{ marginBottom: 14 }}><b>Changes requested by {staffName(state, existing.review.by)}:</b> {existing.review.note}</div>}
      {existing && ['published', 'reserved'].includes(existing.status) && w.reapproveOnEdit && !can(state, 'listings.approve') && <div className="note" style={{ marginBottom: 14 }}>Changing the price, title, purpose or photos sends this listing back for approval. Every change is recorded in the audit log.</div>}
      {err && <div className="note bad" style={{ marginBottom: 14 }}>{err}</div>}
      <div className="editor-grid">
        <div className="stack">
          <div className="card card-pad stack">
            <h3>Basics</h3>
            <Field label="Title"><input value={f.title} onChange={(e) => set('title', e.target.value)} placeholder="e.g. 3BR House & Lot near the highway" /></Field>
            <div className="grid3">
              <Field label="Category"><select value={f.category} onChange={(e) => set('category', e.target.value)}>{state.categories.filter((c) => c.active).map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}</select></Field>
              <Field label="Purpose"><select value={f.purpose} onChange={(e) => set('purpose', e.target.value)}><option value="sale">For sale</option><option value="rent">For rent</option></select></Field>
              <Field label={f.purpose === 'rent' ? 'Rent' : 'Price'}><input type="number" value={f.price} onChange={(e) => set('price', e.target.value)} /></Field>
            </div>
            <div className="row">
              {f.purpose === 'rent' && <select className="input" style={{ width: 'auto' }} value={f.priceUnit === 'day' ? 'day' : 'month'} onChange={(e) => set('priceUnit', e.target.value)}><option value="month">per month</option><option value="day">per day</option></select>}
              <label className="check"><input type="checkbox" checked={f.negotiable} onChange={(e) => set('negotiable', e.target.checked)} />Negotiable</label>
            </div>
            <Field label="Description"><textarea rows={5} value={f.description} onChange={(e) => set('description', e.target.value)} /></Field>
          </div>
          <div className="card card-pad stack">
            <h3>{group === 'vehicle' ? 'Vehicle details' : 'Property details'}</h3>
            {group === 'vehicle' ? (
              <div className="grid3">
                {[['make', 'Make'], ['model', 'Model'], ['year', 'Year', 'number'], ['mileage', 'Mileage (km)', 'number'], ['color', 'Color']].map(([k, label, type]) => <Field key={k} label={label}><input type={type || 'text'} value={f.specs[k] ?? ''} onChange={(e) => spec(k, type ? Number(e.target.value) : e.target.value)} /></Field>)}
                <Field label="Transmission"><select value={f.specs.transmission || ''} onChange={(e) => spec('transmission', e.target.value)}><option value="" />{['Automatic', 'Manual', 'CVT'].map((x) => <option key={x}>{x}</option>)}</select></Field>
                <Field label="Fuel"><select value={f.specs.fuel || ''} onChange={(e) => spec('fuel', e.target.value)}><option value="" />{['Gasoline', 'Diesel', 'Hybrid', 'Electric'].map((x) => <option key={x}>{x}</option>)}</select></Field>
                <Field label="Body type"><select value={f.specs.bodyType || ''} onChange={(e) => spec('bodyType', e.target.value)}><option value="" />{['Sedan', 'Hatchback', 'SUV', 'MPV', 'Pickup', 'Van', 'Scooter', 'Underbone', 'Big bike'].map((x) => <option key={x}>{x}</option>)}</select></Field>
              </div>
            ) : (
              <div className="grid3">
                {[['bedrooms', 'Bedrooms'], ['bathrooms', 'Bathrooms'], ['floorArea', 'Floor area (sqm)'], ['lotArea', 'Lot area (sqm)'], ['parking', 'Parking slots'], ['floorLevel', 'Floor level']].map(([k, label]) => <Field key={k} label={label}><input type="number" value={f.specs[k] ?? ''} onChange={(e) => spec(k, e.target.value === '' ? undefined : Number(e.target.value))} /></Field>)}
                <Field label="Furnishing"><select value={f.specs.furnishing || ''} onChange={(e) => spec('furnishing', e.target.value)}><option value="" />{['Unfurnished', 'Semi-furnished', 'Fully furnished'].map((x) => <option key={x}>{x}</option>)}</select></Field>
                <Field label="Zoning / title"><input value={f.specs.zoning || ''} onChange={(e) => spec('zoning', e.target.value)} placeholder="Residential, TCT…" /></Field>
              </div>
            )}
            <div><div className="field"><span>Features</span></div><div className="chips" style={{ marginTop: 6 }}>{featureList.map((x) => <button type="button" key={x} className={`chip ${f.features.includes(x) ? 'on' : ''}`} onClick={() => set('features', f.features.includes(x) ? f.features.filter((y) => y !== x) : [...f.features, x])}>{x}</button>)}</div></div>
          </div>
          <div className="card card-pad stack">
            <h3>Photos <span className="mini">({f.photos.length || (existing ? `${listingPhotos(existing).length} sample` : 0)} / {w.maxPhotos})</span></h3>
            <div className="photo-grid">
              {(f.photos.length ? f.photos : existing ? listingPhotos(existing) : []).map((p, i) => <div key={i} className="photo-tile"><img src={p} alt="" />{f.photos.length > 0 && <button type="button" onClick={() => set('photos', f.photos.filter((_, k) => k !== i))} aria-label="Remove"><Icon name="x" /></button>}{i === 0 && <span>Cover</span>}</div>)}
              <label className="photo-add"><Icon name="upload" /><span>Add photos</span><input type="file" accept="image/*" multiple hidden onChange={(e) => addPhotos(e.target.files)} /></label>
            </div>
            <p className="mini">In the real system photos go to file storage (Amazon S3 when connected) and can be reordered. Sample listings use drawn placeholder photos.</p>
          </div>
        </div>
        <div className="stack">
          <div className="card card-pad stack">
            <h3>Location</h3>
            <Field label="City / area"><select value={f.city} onChange={(e) => set('city', e.target.value)}>{state.cms.locations.map((c) => <option key={c}>{c}</option>)}</select></Field>
            <Field label="Barangay"><input value={f.barangay} onChange={(e) => set('barangay', e.target.value)} /></Field>
            <Field label="Exact address" hint={state.settings.listings.sharing.guestSeesAddress ? 'Shown to everyone.' : 'Shown only to signed-in customers.'}><input value={f.address} onChange={(e) => set('address', e.target.value)} /></Field>
          </div>
          <div className="card card-pad stack">
            <h3>Owner & authority</h3>
            <p className="mini">Private: never shown to customers.</p>
            <Field label="Owner name"><input value={f.ownerName} onChange={(e) => set('ownerName', e.target.value)} /></Field>
            <Field label="Owner phone"><input value={f.ownerPhone} onChange={(e) => set('ownerPhone', e.target.value)} /></Field>
            <Field label={`Authority to Sell / Lease${state.settings.listings.workflow.requireAuthority ? ' (required)' : ''}`} hint={existing?.authority?.file ? `On file: ${existing.authority.file}` : ''}><input type="file" accept=".pdf,image/*" onChange={(e) => set('authorityFile', e.target.files[0]?.name || '')} /></Field>
          </div>
          {canPick && (
            <div className="card card-pad stack">
              <h3>Agent</h3>
              <Field label="Listing agent"><select value={f.agentId} onChange={(e) => set('agentId', e.target.value)}>{state.staff.filter((x) => ['agent', 'manager', 'owner', 'admin'].includes(x.role) && x.status === 'active').map((x) => <option key={x.id} value={x.id}>{x.name} · {state.roles[x.role].label}</option>)}</select></Field>
            </div>
          )}
        </div>
      </div>
    </Page>
  );
}

export function ListingDetail() {
  const { id } = useParams();
  const { state, update, toast } = useStore();
  const nav = useNavigate();
  const s = me(state);
  const [tab, setTab] = useState('overview');
  const [modal, setModal] = useState(null);
  const l = state.listings.find((x) => x.id === id);
  if (!l) return <Page title="Listing"><Empty title="Not found" /></Page>;
  const mine = l.agentId === s.id;
  const canEdit = can(state, 'listings.edit_any') || mine || (scope(state, 'listings') === 'team' && l.teamId === s.teamId);
  const approver = canApprove(state, l);
  const history = state.audit.filter((a) => (a.subject?.type === 'listing' && a.subject.id === l.id) || (a.subject?.type === 'inquiry' && state.inquiries.find((q) => q.id === a.subject.id)?.listingId === l.id));
  const leads = state.inquiries.filter((q) => q.listingId === l.id);
  const totalShares = sum(Object.values(l.shares));
  const run = (fn, msg) => { const e = update(fn); if (e) toast(e, 'err'); else if (msg) toast(msg); };

  return (
    <Page title={l.title} sub={<><span className="mono">{l.code}</span> · {categoryLabel(state, l.category)} · {PURPOSES[l.purpose]} · {priceLabel(l)}</>}
      actions={<>
        {['published', 'reserved'].includes(l.status) && !l.deleted && <a className="btn ghost" href={`/l/${l.slug}`} target="_blank" rel="noreferrer"><Icon name="eye" />Public page</a>}
        {['published', 'reserved'].includes(l.status) && !l.deleted && <button type="button" className="btn ghost" onClick={() => setModal('share')}><Icon name="share" />Share</button>}
        {canEdit && !l.deleted && !['sold', 'rented'].includes(l.status) && <Link to={`/admin/listings/${l.id}/edit`} className="btn ghost"><Icon name="edit" />Edit</Link>}
        {mine && ['draft', 'changes', 'rejected'].includes(l.status) && !l.deleted && <button type="button" className="btn" onClick={() => run((d) => submitListing(d, l.id), 'Submitted for approval.')}><Icon name="send" />Submit</button>}
      </>}>
      <div className="row" style={{ marginBottom: 14, gap: 8 }}>
        <ListingStatus listing={l} />{l.featured && <Badge tone="accent" icon="star">Featured</Badge>}<span className="mini">Agent: <b>{staffName(state, l.agentId)}</b> · created {fmtDate(l.createdAt)} by {staffName(state, l.createdBy)}{l.approvedBy ? ` · approved by ${staffName(state, l.approvedBy)} ${fmtDate(l.approvedAt)}` : ''}</span>
      </div>
      {l.deleted && <div className="note bad" style={{ marginBottom: 14 }}><b>In Trash.</b> Deleted by {staffName(state, l.deleted.by)} on {fmtDateTime(l.deleted.at)}: {l.deleted.reason} {can(state, 'listings.delete') && <button type="button" className="btn ghost xs" onClick={() => run((d) => restoreListing(d, l.id), 'Restored.')}>Restore</button>}</div>}
      {l.status === 'pending' && !l.deleted && (
        <div className="note warn approve-bar" style={{ marginBottom: 14 }}>
          <span><b>Waiting for approval</b> since {timeAgo(l.submittedAt || l.updatedAt)}. {!approver && (mine ? 'Another Manager / Admin must approve your listing.' : 'Your Manager will review it.')}</span>
          {approver && <span className="row"><button type="button" className="btn ok sm" onClick={() => setModal('approve')}><Icon name="check" />Approve</button><button type="button" className="btn ghost sm" onClick={() => setModal('changes')}>Request changes</button><button type="button" className="btn danger ghost sm" onClick={() => setModal('reject')}>Reject</button></span>}
        </div>
      )}
      {l.review && l.status !== 'pending' && l.review.decision !== 'approved' && <div className={`note ${l.review.decision === 'rejected' ? 'bad' : 'warn'}`} style={{ marginBottom: 14 }}><b>{l.review.decision === 'rejected' ? 'Rejected' : 'Changes requested'} by {staffName(state, l.review.by)}</b> ({fmtDateTime(l.review.at)}): {l.review.note}</div>}

      <Tabs value={tab} onChange={setTab} tabs={[{ key: 'overview', label: 'Overview' }, { key: 'leads', label: 'Inquiries', count: leads.length }, { key: 'history', label: 'History', icon: 'history', count: history.length }]} />
      <div style={{ marginTop: 16 }}>
        {tab === 'overview' && (
          <div className="editor-grid">
            <div className="stack">
              <Gallery photos={listingPhotos(l)} />
              <div className="card card-pad"><h3>Description</h3><p style={{ whiteSpace: 'pre-line' }}>{l.description}</p><div className="chips">{l.features.map((x) => <span key={x} className="chip">{x}</span>)}</div></div>
            </div>
            <div className="stack">
              <div className="card card-pad"><h3>Details</h3><dl className="kv">{Object.entries(l.specs).filter(([, v]) => v !== undefined && v !== '').flatMap(([k, v]) => [<dt key={`${k}t`}>{k.replace(/([A-Z])/g, ' $1').toLowerCase()}</dt>, <dd key={`${k}d`}>{String(v)}</dd>])}<dt>Address</dt><dd>{l.address}</dd><dt>Owner</dt><dd>{l.ownerName} · {l.ownerPhone}</dd><dt>Authority</dt><dd>{l.authority?.type} · {l.authority?.file || '—'} (until {fmtDate(l.authority?.validUntil)})</dd><dt>Valid until</dt><dd>{fmtDate(l.expiresAt)}</dd></dl></div>
              <div className="card card-pad"><h3>Performance</h3><dl className="kv"><dt>Views</dt><dd>{l.views.toLocaleString()}</dd><dt>Shares</dt><dd>{totalShares} <span className="mini">(Facebook {l.shares.facebook}, Messenger {l.shares.messenger}, link {l.shares.link}, Viber {l.shares.viber}, QR {l.shares.qr})</span></dd><dt>Inquiries</dt><dd>{leads.length}</dd><dt>Viewings</dt><dd>{state.viewings.filter((v) => v.listingId === l.id).length}</dd></dl></div>
              {!l.deleted && (
                <div className="card card-pad stack">
                  <h3>Actions</h3>
                  {can(state, 'listings.feature') && ['published', 'reserved'].includes(l.status) && <button type="button" className="btn ghost" onClick={() => run((d) => toggleFeatured(d, l.id), l.featured ? 'Removed from featured.' : 'Featured on the homepage.')}><Icon name="star" />{l.featured ? 'Remove from featured' : 'Feature on homepage'}</button>}
                  {canEdit && l.status === 'published' && <button type="button" className="btn ghost" onClick={() => setModal('archive')}><Icon name="box" />Take down (archive)</button>}
                  {canEdit && ['archived', 'expired'].includes(l.status) && <button type="button" className="btn ghost" onClick={() => run((d) => setListingStatus(d, l.id, 'published', 'Put back online'), 'Published again.')}><Icon name="refresh" />Publish again</button>}
                  {can(state, 'listings.reassign') && <button type="button" className="btn ghost" onClick={() => setModal('reassign')}><Icon name="users" />Reassign agent</button>}
                  {can(state, 'listings.delete') && <button type="button" className="btn danger ghost" onClick={() => setModal('delete')}><Icon name="trash" />Delete (move to Trash)</button>}
                  {['published', 'reserved'].includes(l.status) && can(state, 'deals.create') && <Link to={`/admin/deals?new=${l.id}`} className="btn soft"><Icon name="handshake" />Create deal / reservation</Link>}
                </div>
              )}
            </div>
          </div>
        )}
        {tab === 'leads' && (leads.length ? <div className="card">{leads.map((q) => <Link key={q.id} to={`/admin/leads/${q.id}`} className="list-row"><Badge tone={LEAD_STAGES.find((x) => x.key === q.stage)?.tone}>{LEAD_STAGES.find((x) => x.key === q.stage)?.label}</Badge><b>{customerName(state, q.customerId)}</b><span className="grow ellipsis mini">{q.messages[q.messages.length - 1].text}</span><span className="mini">{timeAgo(q.updatedAt)}</span></Link>)}</div> : <Empty icon="message" title="No inquiries yet" />)}
        {tab === 'history' && <div className="card card-pad"><p className="mini">Every create, edit (field by field), approval, share, status change and deletion of this listing. Audit entries cannot be changed or deleted.</p><Timeline entries={history} /></div>}
      </div>

      {modal === 'share' && <ShareModal listing={l} onClose={() => setModal(null)} />}
      {modal === 'approve' && <PromptModal title="Approve and publish" label="Note (optional)" required={false} confirm="Approve" onClose={() => setModal(null)} onSubmit={(t) => { const e = update((d) => approveListing(d, l.id, t)); if (!e) toast('Approved and published.'); return e; }} />}
      {modal === 'changes' && <PromptModal title="Request changes" label="What should the agent fix?" placeholder="e.g. Please add brighter photos and the floor area." confirm="Send back" onClose={() => setModal(null)} onSubmit={(t) => { const e = update((d) => reviewListing(d, l.id, 'changes', t)); if (!e) toast('Sent back to the agent.'); return e; }} />}
      {modal === 'reject' && <PromptModal title="Reject listing" label="Reason" danger confirm="Reject" onClose={() => setModal(null)} onSubmit={(t) => { const e = update((d) => reviewListing(d, l.id, 'reject', t)); if (!e) toast('Rejected.'); return e; }} />}
      {modal === 'archive' && <PromptModal title="Take down this listing" label="Reason" confirm="Archive" onClose={() => setModal(null)} onSubmit={(t) => { update((d) => setListingStatus(d, l.id, 'archived', t)); toast('Archived.'); return null; }} />}
      {modal === 'delete' && <PromptModal title="Delete listing" label="Reason (kept in the audit log)" danger confirm="Move to Trash" onClose={() => setModal(null)} onSubmit={(t) => { const e = update((d) => deleteListing(d, l.id, t)); if (!e) { toast('Moved to Trash. It can be restored.'); nav('/admin/listings'); } return e; }}><p className="mini">The listing disappears from the website and app. {state.settings.security.alerts.bigDelete ? 'The Owner is notified.' : ''}</p></PromptModal>}
      {modal === 'reassign' && <ReassignModal l={l} onClose={() => setModal(null)} />}
    </Page>
  );
}

function ReassignModal({ l, onClose }) {
  const { state, update, toast } = useStore();
  const [to, setTo] = useState(l.agentId);
  return (
    <Modal title="Reassign listing" onClose={onClose} width={420} footer={<><button type="button" className="btn ghost" onClick={onClose}>Cancel</button><button type="button" className="btn" onClick={() => { update((d) => { saveListing(d, { id: l.id, agentId: to }); notify(d, { type: 'staff', id: to }, 'Listing assigned to you', `${l.code} ${l.title}`, `/admin/listings/${l.id}`); }); toast('Reassigned.'); onClose(); }}>Reassign</button></>}>
      <Field label="New agent"><select value={to} onChange={(e) => setTo(e.target.value)}>{state.staff.filter((x) => ['agent', 'manager'].includes(x.role) && x.status === 'active').map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</select></Field>
      <p className="mini" style={{ marginTop: 8 }}>Open inquiries stay with the current agent unless reassigned in Leads.</p>
    </Modal>
  );
}

export function Approvals() {
  const { state, update, toast } = useStore();
  const [modal, setModal] = useState(null);
  const s = me(state);
  const rows = state.listings.filter((l) => l.status === 'pending' && !l.deleted && (scope(state, 'listings') === 'all' || l.teamId === s.teamId));
  return (
    <Page title="Approvals" sub="Listings submitted by agents. Check the photos, price and the owner's authority before publishing.">
      {rows.length ? <div className="approve-grid">{rows.map((l) => {
        const ok = canApprove(state, l);
        return (
          <div key={l.id} className="card approve-card">
            <img src={coverPhoto(l)} alt="" />
            <div className="card-b stack" style={{ gap: 6 }}>
              <div className="row between"><span className="mono mini">{l.code}</span><span className="mini">{timeAgo(l.submittedAt || l.createdAt)}</span></div>
              <Link to={`/admin/listings/${l.id}`}><b>{l.title}</b></Link>
              <div className="mini">{categoryLabel(state, l.category)} · {l.city} · <b>{priceLabel(l)}</b></div>
              <div className="mini">By {staffName(state, l.agentId)} · authority: {l.authority?.file || <span className="err-text">missing</span>}</div>
              {ok ? <div className="row" style={{ marginTop: 6 }}><button type="button" className="btn ok sm" onClick={() => { const e = update((d) => approveListing(d, l.id, '')); toast(e || 'Approved and published.', e ? 'err' : 'ok'); }}><Icon name="check" />Approve</button><button type="button" className="btn ghost sm" onClick={() => setModal({ l, kind: 'changes' })}>Changes</button><button type="button" className="btn danger ghost sm" onClick={() => setModal({ l, kind: 'reject' })}>Reject</button></div>
                : <div className="mini note">{l.agentId === s.id ? 'Your own listing: another approver must review it.' : 'Outside your team.'}</div>}
            </div>
          </div>
        );
      })}</div> : <div className="card"><Empty icon="verified" title="Nothing to approve">All caught up.</Empty></div>}
      {modal && <PromptModal title={modal.kind === 'reject' ? 'Reject listing' : 'Request changes'} label={modal.kind === 'reject' ? 'Reason' : 'What should the agent fix?'} danger={modal.kind === 'reject'} confirm={modal.kind === 'reject' ? 'Reject' : 'Send back'} onClose={() => setModal(null)} onSubmit={(t) => update((d) => reviewListing(d, modal.l.id, modal.kind === 'reject' ? 'reject' : 'changes', t))} />}
    </Page>
  );
}

export function Submissions() {
  const { state, update, toast } = useStore();
  const nav = useNavigate();
  const [assign, setAssign] = useState(null);
  const [decline, setDecline] = useState(null);
  const tone = { new: 'info', assigned: 'warn', listed: 'ok', declined: 'bad' };
  return (
    <Page title="Owner submissions" sub="Properties and vehicles submitted by owners through “Sell with Hope”. Assign an agent to call the owner, then convert to a draft listing.">
      <div className="card">
        {state.submissions.length ? <div className="table-wrap"><table className="t"><thead><tr><th>Submission</th><th>Owner</th><th className="r">Asking</th><th>Status</th><th>Agent</th><th /></tr></thead><tbody>
          {state.submissions.map((sb) => { const c = state.customers.find((x) => x.id === sb.customerId); return (
            <tr key={sb.id}><td><b>{sb.title}</b><div className="mini">{categoryLabel(state, sb.kind)} · {sb.purpose === 'rent' ? 'Lease' : 'Sell'} · {sb.city} · {fmtDate(sb.createdAt)}</div><div className="mini">{sb.details}</div>{sb.notes.map((n) => <div key={n.at} className="mini">↳ {staffName(state, n.by)}: {n.text}</div>)}</td>
              <td>{c?.name}<div className="mini">{c?.mobile}</div></td><td className="r num">{peso(sb.price)}</td><td><Badge tone={tone[sb.status]}>{sb.status}</Badge></td><td>{sb.assignedTo ? staffName(state, sb.assignedTo) : '—'}</td>
              <td className="r nowrap">{['new', 'assigned'].includes(sb.status) && <><button type="button" className="btn ghost xs" onClick={() => setAssign(sb)}>Assign</button> <button type="button" className="btn soft xs" onClick={() => {
                const l = update((d) => { const x = d.submissions.find((y) => y.id === sb.id); const listing = saveListing(d, { title: sb.title, purpose: sb.purpose, category: sb.kind, price: sb.price, priceUnit: sb.purpose === 'rent' ? 'month' : 'total', city: sb.city, barangay: '', address: '', description: sb.details, features: [], specs: {}, photos: [], ownerName: c?.name, ownerPhone: c?.mobile, agentId: sb.assignedTo || d.staffSession.staffId }); x.status = 'listed'; x.listingId = listing.id; return listing; });
                toast('Draft listing created from the submission.'); nav(`/admin/listings/${l.id}/edit`);
              }}>Convert</button> <button type="button" className="btn danger ghost xs" onClick={() => setDecline(sb)}>Decline</button></>}{sb.listingId && <Link to={`/admin/listings/${sb.listingId}`} className="btn link xs">Listing</Link>}</td></tr>); })}
        </tbody></table></div> : <Empty icon="tag" title="No submissions" />}
      </div>
      {assign && <AssignModal sb={assign} onClose={() => setAssign(null)} />}
      {decline && <PromptModal title="Decline submission" label="Reason (sent to the owner)" danger confirm="Decline" onClose={() => setDecline(null)} onSubmit={(t) => { update((d) => { const x = d.submissions.find((y) => y.id === decline.id); x.status = 'declined'; x.notes.push({ at: new Date().toISOString(), by: d.staffSession.staffId, text: `Declined: ${t}` }); audit(d, 'submission.declined', `Declined owner submission "${x.title}": ${t}`, { subject: { type: 'submission', id: x.id, label: x.title }, severity: 'warning' }); notify(d, { type: 'customer', id: x.customerId }, 'About your submission', t, '/account/submissions'); }); return null; }} />}
    </Page>
  );
}

function AssignModal({ sb, onClose }) {
  const { state, update, toast } = useStore();
  const [to, setTo] = useState(sb.assignedTo || '');
  return (
    <Modal title="Assign an agent" onClose={onClose} width={420} footer={<><button type="button" className="btn ghost" onClick={onClose}>Cancel</button><button type="button" className="btn" disabled={!to} onClick={() => { update((d) => { const x = d.submissions.find((y) => y.id === sb.id); x.status = 'assigned'; x.assignedTo = to; x.notes.push({ at: new Date().toISOString(), by: d.staffSession.staffId, text: `Assigned to ${staffName(d, to)}.` }); audit(d, 'submission.assigned', `Assigned "${x.title}" to ${staffName(d, to)}`, { subject: { type: 'submission', id: x.id, label: x.title } }); notify(d, { type: 'staff', id: to }, 'Owner submission assigned to you', x.title, '/admin/submissions'); notify(d, { type: 'customer', id: x.customerId }, 'An agent will contact you', `${staffName(d, to)} will call you about "${x.title}".`, '/account/submissions'); }); toast('Assigned.'); onClose(); }}>Assign</button></>}>
      <Field label="Agent"><select value={to} onChange={(e) => setTo(e.target.value)}><option value="">Choose…</option>{state.staff.filter((x) => x.role === 'agent' && x.status === 'active').map((x) => <option key={x.id} value={x.id}>{x.name} · {state.teams.find((t) => t.id === x.teamId)?.name}</option>)}</select></Field>
    </Modal>
  );
}
