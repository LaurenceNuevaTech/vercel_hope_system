import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Icon from '../lib/icons.jsx';
import { audit, meCustomer, notify, useStore } from '../lib/store.jsx';
import { Field } from '../components.jsx';

export default function Sell() {
  const { state, update, toast } = useStore();
  const nav = useNavigate();
  const c = meCustomer(state);
  const [f, setF] = useState({ kind: 'house_lot', purpose: 'sale', title: '', city: state.cms.locations[0], price: '', details: '', authority: true });
  const set = (k) => (e) => setF({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value });
  const submit = (e) => {
    e.preventDefault();
    update((d) => {
      const s = { id: `sb${Date.now().toString(36)}`, customerId: c.id, kind: f.kind, purpose: f.purpose, title: f.title, city: f.city, price: Number(f.price), details: f.details, status: 'new', assignedTo: null, listingId: null, createdAt: new Date().toISOString(), notes: [] };
      d.submissions.unshift(s);
      audit(d, 'submission.created', `${c.name} submitted "${s.title}" to sell / lease with Hope`, { subject: { type: 'submission', id: s.id, label: s.title } });
      d.staff.filter((x) => x.role === 'manager' || x.role === 'admin').forEach((x) => notify(d, { type: 'staff', id: x.id }, 'New owner submission', s.title, '/admin/submissions'));
    });
    toast('Submitted! A Hope manager will assign an agent to contact you.');
    nav('/account/submissions');
  };
  return (
    <div className="wrap page">
      <div className="sell-grid">
        <div>
          <span className="eyebrow dark"><Icon name="tag" size={15} />For owners</span>
          <h1>Sell or lease your property or vehicle with Hope</h1>
          <p className="muted">Tell us about it. A Manager assigns a verified agent who calls you, checks the documents, takes photos and posts the listing after approval. You pay Hope's commission only when it is sold or leased.</p>
          <ol className="sell-steps">
            <li><b>Submit</b> the basic details here.</li>
            <li><b>An agent contacts you</b> within 24 hours and signs an Authority to Sell / Lease with you.</li>
            <li><b>The listing is checked</b> by a Manager and published on the website, the app and social media.</li>
            <li><b>Buyers and tenants inquire</b>; your agent handles viewings, negotiation and documents.</li>
          </ol>
        </div>
        <div className="card card-pad">
          {!c ? (
            <div style={{ textAlign: 'center' }}><div className="gate-ico"><Icon name="lock" /></div><p>Please sign in or create a free account to submit.</p><div className="row" style={{ justifyContent: 'center' }}><Link className="btn" to="/register?next=/sell">Create account</Link><Link className="btn ghost" to="/login?next=/sell">Sign in</Link></div></div>
          ) : (
            <form className="stack" onSubmit={submit}>
              <div className="grid2">
                <Field label="What is it?"><select value={f.kind} onChange={set('kind')}>{state.categories.filter((x) => x.active).map((x) => <option key={x.key} value={x.key}>{x.label}</option>)}</select></Field>
                <Field label="I want to"><select value={f.purpose} onChange={set('purpose')}><option value="sale">Sell</option><option value="rent">Lease / rent out</option></select></Field>
              </div>
              <Field label="Short title"><input value={f.title} onChange={set('title')} placeholder="e.g. 3BR bungalow near the highway" required /></Field>
              <div className="grid2">
                <Field label="Location"><select value={f.city} onChange={set('city')}>{state.cms.locations.map((x) => <option key={x}>{x}</option>)}</select></Field>
                <Field label={f.purpose === 'rent' ? 'Asking rent / month (₱)' : 'Asking price (₱)'}><input type="number" value={f.price} onChange={set('price')} required /></Field>
              </div>
              <Field label="Details" hint="Size, condition, papers, why you are selling."><textarea value={f.details} onChange={set('details')} /></Field>
              <label className="field"><span>Photos (optional)</span><input type="file" accept="image/*" multiple /></label>
              <label className="check"><input type="checkbox" checked={f.authority} onChange={set('authority')} /><span>I am the registered owner or have a Special Power of Attorney.</span></label>
              <button className="btn lg" type="submit" disabled={!f.authority}>Submit to Hope</button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
