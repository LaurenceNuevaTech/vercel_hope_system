import { useEffect, useState } from 'react';
import { NavLink, useNavigate, useParams } from 'react-router-dom';
import Icon, { ICON_NAMES } from '../lib/icons.jsx';
import { audit, readPhoto, useStore } from '../lib/store.jsx';
import { can } from '../lib/auth.js';
import { saveSettingsGroup } from '../lib/actions.js';
import { computeDeal } from '../lib/money.js';
import { INTEGRATIONS, SETTINGS } from '../lib/catalog.js';
import { fmtDateTime } from '../lib/format.js';
import { Badge, Field, LogoMark, ResetDataButton, Switch } from '../components.jsx';
import { ComputationTable } from '../printables.jsx';
import { Page } from './AdminApp.jsx';

const CMS = [
  ['cms-home', 'Homepage', 'home'], ['cms-categories', 'Categories', 'layers'], ['cms-locations', 'Locations & features', 'pin'],
  ['cms-pages', 'Pages & FAQs', 'file'], ['cms-announcements', 'Announcements', 'sparkle'], ['cms-templates', 'Message templates', 'mail'],
];

export default function Settings() {
  const { group } = useParams();
  const { state } = useStore();
  const nav = useNavigate();
  const c = (p) => can(state, p);
  const cfg = SETTINGS.filter((g) => c(g.perm) || (g.viewPerm && c(g.viewPerm)));
  const cms = c('cms.manage') ? CMS : [];
  const first = cms[0]?.[0] || cfg[0]?.key || 'integrations';
  useEffect(() => { if (!group) nav(`/admin/settings/${first}`, { replace: true }); }, [group, first, nav]);
  const g = SETTINGS.find((x) => x.key === group);
  return (
    <Page title="Settings & CMS" sub="Everything here is editable without a programmer. Every change is recorded in the audit log.">
      <div className="settings">
        <nav className="card set-nav">
          {cms.length > 0 && <span className="set-h">Website & app content (CMS)</span>}
          {cms.map(([k, label, icon]) => <NavLink key={k} to={`/admin/settings/${k}`}><Icon name={icon} />{label}</NavLink>)}
          <span className="set-h">Configuration</span>
          {cfg.map((x) => <NavLink key={x.key} to={`/admin/settings/${x.key}`}><Icon name={x.icon} />{x.label}</NavLink>)}
          {c('integrations.manage') && <NavLink to="/admin/settings/integrations"><Icon name="plug" />Integrations</NavLink>}
          <NavLink to="/admin/settings/data"><Icon name="database" />Demo data</NavLink>
        </nav>
        <div>
          {g && <SettingsGroup key={g.key} g={g} readOnly={!c(g.perm)} />}
          {group === 'cms-home' && <CmsHome />}
          {group === 'cms-categories' && <CmsCategories />}
          {group === 'cms-locations' && <CmsLists />}
          {group === 'cms-pages' && <CmsPages />}
          {group === 'cms-announcements' && <CmsAnnouncements />}
          {group === 'cms-templates' && <CmsTemplates />}
          {group === 'integrations' && <Integrations />}
          {group === 'data' && <DemoData />}
        </div>
      </div>
    </Page>
  );
}

function FieldInput({ f, value, onChange, disabled }) {
  if (f.type === 'toggle') return <Switch checked={value} onChange={onChange} disabled={disabled} label={f.label} />;
  if (f.type === 'select') return <select className="input" value={value} disabled={disabled} onChange={(e) => onChange(e.target.value)}>{Object.entries(f.choices).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>;
  if (f.type === 'textarea') return <textarea className="input" rows={3} value={value} disabled={disabled} onChange={(e) => onChange(e.target.value)} />;
  if (f.type === 'color') return <div className="row"><input type="color" value={value} disabled={disabled} onChange={(e) => onChange(e.target.value)} style={{ width: 44, height: 36, border: 0, background: 'none' }} /><input className="input mono" style={{ width: 110 }} value={value} disabled={disabled} onChange={(e) => onChange(e.target.value)} /></div>;
  if (f.type === 'image') return <div className="row"><LogoMark logo={value} size={44} /><input type="file" accept="image/*" disabled={disabled} onChange={async (e) => { try { onChange(await readPhoto(e.target.files[0], 400)); } catch { /* ignore */ } }} />{value && <button type="button" className="btn ghost xs" disabled={disabled} onClick={() => onChange(null)}>Remove</button>}</div>;
  if (f.type === 'list') return <textarea className="input" rows={3} value={(value || []).join('\n')} disabled={disabled} onChange={(e) => onChange(e.target.value.split('\n').map((x) => x.trim()).filter(Boolean))} placeholder="One per line" />;
  const num = ['number', 'percent', 'money'].includes(f.type);
  return (
    <div className="row" style={{ flexWrap: 'nowrap' }}>
      {f.type === 'money' && <span className="muted">₱</span>}
      <input className="input" type={num ? 'number' : 'text'} step={f.type === 'percent' ? '0.1' : undefined} value={value ?? ''} disabled={disabled} onChange={(e) => onChange(num ? (e.target.value === '' ? '' : Number(e.target.value)) : e.target.value)} style={num ? { maxWidth: 140 } : null} />
      {f.type === 'percent' && <span className="muted">%</span>}{f.unit && <span className="mini nowrap">{f.unit}</span>}
    </div>
  );
}

function SettingsGroup({ g, readOnly }) {
  const { state, update, toast } = useStore();
  const [v, setV] = useState(() => structuredClone(state.settings[g.key]));
  const dirty = JSON.stringify(v) !== JSON.stringify(state.settings[g.key]);
  const save = () => { const n = update((d) => saveSettingsGroup(d, g, v)); toast(n ? `Saved ${n} change(s). Recorded in the audit log.` : 'No changes.'); };
  const preview = (g.key === 'commission' || g.key === 'platform') && (() => {
    const s2 = structuredClone(state.settings); s2[g.key] = v;
    const sale = { type: 'sale', group: 'property', category: 'house_lot', price: 5000000, unit: 'total' };
    const rent = { type: 'rent', group: 'property', category: 'condo', price: 30000, unit: 'month', leaseMonths: 12 };
    return { sale: computeDeal(sale, s2, { hasManager: true }), rent: computeDeal(rent, s2, { hasManager: true }), saleDeal: sale, rentDeal: rent };
  })();
  return (
    <div className="stack">
      <div className="card card-pad"><div className="row between"><div><h2 style={{ margin: 0 }}>{g.label}</h2><p className="muted" style={{ margin: '4px 0 0' }}>{g.description}</p></div>{readOnly ? <Badge tone="muted" icon="lock">View only</Badge> : <button type="button" className="btn" disabled={!dirty} onClick={save}><Icon name="check" />Save changes</button>}</div></div>
      <div className={preview ? 'set-split' : ''}>
        <div className="stack">
          {g.sections.map((s) => (
            <div key={s.key} className="card">
              <div className="card-h"><h3>{s.label}</h3></div>
              <div className="card-b set-fields">
                {s.fields.map((f) => (
                  <div key={f.key} className={`set-field ${f.type === 'toggle' ? 'inline' : ''}`}>
                    <div><b>{f.label}</b>{f.description && <small>{f.description}</small>}</div>
                    <FieldInput f={f} value={v[s.key][f.key]} disabled={readOnly} onChange={(x) => setV((o) => ({ ...o, [s.key]: { ...o[s.key], [f.key]: x } }))} />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
        {preview && (
          <div className="stack sticky-top">
            <div className="card"><div className="card-h"><h3>Example: ₱5,000,000 house sale</h3><Badge tone="info">live</Badge></div><div className="card-b"><ComputationTable c={preview.sale} deal={preview.saleDeal} /></div></div>
            <div className="card"><div className="card-h"><h3>Example: ₱30,000 / month lease</h3></div><div className="card-b"><ComputationTable c={preview.rent} deal={preview.rentDeal} /></div></div>
            <p className="mini">Deals already closed keep the rates they were closed with.</p>
          </div>
        )}
      </div>
      {dirty && !readOnly && <div className="save-bar card"><span>You have unsaved changes.</span><button type="button" className="btn ghost sm" onClick={() => setV(structuredClone(state.settings[g.key]))}>Discard</button><button type="button" className="btn sm" onClick={save}>Save</button></div>}
    </div>
  );
}

/** Generic editable list of objects. */
function ListEditor({ items, fields, onChange, addLabel = 'Add', blank }) {
  const set = (i, k, val) => onChange(items.map((x, j) => (j === i ? { ...x, [k]: val } : x)));
  const move = (i, d) => { const n = [...items]; const [x] = n.splice(i, 1); n.splice(i + d, 0, x); onChange(n); };
  return (
    <div className="stack">
      {items.map((it, i) => (
        <div key={i} className="list-ed">
          <div className="list-ed-f" style={{ gridTemplateColumns: fields.map((f) => f.w || '1fr').join(' ') }}>
            {fields.map((f) => (
              <label key={f.key} className="field"><span>{f.label}</span>
                {f.type === 'textarea' ? <textarea rows={3} value={it[f.key] || ''} onChange={(e) => set(i, f.key, e.target.value)} />
                  : f.type === 'toggle' ? <Switch checked={!!it[f.key]} onChange={(val) => set(i, f.key, val)} />
                    : f.type === 'select' ? <select value={it[f.key]} onChange={(e) => set(i, f.key, e.target.value)} disabled={f.lockFor?.(it)}>{f.choices.map((c) => <option key={c[0]} value={c[0]}>{c[1]}</option>)}</select>
                      : <input value={it[f.key] || ''} onChange={(e) => set(i, f.key, e.target.value)} disabled={f.lockFor?.(it)} />}
              </label>
            ))}
          </div>
          <div className="list-ed-a">
            <button type="button" className="icon-btn" disabled={i === 0} onClick={() => move(i, -1)} aria-label="Up"><Icon name="up" /></button>
            <button type="button" className="icon-btn" disabled={i === items.length - 1} onClick={() => move(i, 1)} aria-label="Down"><Icon name="down" /></button>
            <button type="button" className="icon-btn" onClick={() => onChange(items.filter((_, j) => j !== i))} aria-label="Remove"><Icon name="trash" /></button>
          </div>
        </div>
      ))}
      <div><button type="button" className="btn ghost sm" onClick={() => onChange([...items, { ...blank }])}><Icon name="plus" />{addLabel}</button></div>
    </div>
  );
}

function CmsCard({ title, sub, onSave, dirty, children }) {
  return (
    <div className="card">
      <div className="card-h"><div><h3>{title}</h3>{sub && <div className="mini">{sub}</div>}</div><button type="button" className="btn sm" disabled={!dirty} onClick={onSave}><Icon name="check" />Save</button></div>
      <div className="card-b">{children}</div>
    </div>
  );
}

function useCms(path) {
  const { state, update, toast } = useStore();
  const [v, setV] = useState(() => structuredClone(path.split('.').reduce((o, k) => o[k], state)));
  const original = path.split('.').reduce((o, k) => o[k], state);
  const dirty = JSON.stringify(v) !== JSON.stringify(original);
  const save = (label) => {
    update((d) => {
      const keys = path.split('.'); const last = keys.pop(); const obj = keys.reduce((o, k) => o[k], d);
      obj[last] = v;
      audit(d, 'cms.updated', `Updated ${label}`, { subject: { type: 'cms', id: path, label } });
    });
    toast(`${label} saved and published.`);
  };
  return [v, setV, dirty, save];
}

function CmsHome() {
  const [home, setHome, d1, s1] = useCms('cms.home');
  const [why, setWhy, d2, s2] = useCms('cms.why');
  const [tst, setTst, d3, s3] = useCms('cms.testimonials');
  const icons = ICON_NAMES.map((n) => [n, n]);
  return (
    <div className="stack">
      <CmsCard title="Hero & call to action" sub="Top of the homepage and the app home screen" dirty={d1} onSave={() => s1('Homepage hero')}>
        <div className="stack">
          <Field label="Headline"><input value={home.heroTitle} onChange={(e) => setHome({ ...home, heroTitle: e.target.value })} /></Field>
          <Field label="Sub-headline"><textarea rows={2} value={home.heroSubtitle} onChange={(e) => setHome({ ...home, heroSubtitle: e.target.value })} /></Field>
          <label className="check"><input type="checkbox" checked={home.showStats} onChange={(e) => setHome({ ...home, showStats: e.target.checked })} />Show live numbers (listings, agents, deals)</label>
          <div className="grid2"><Field label="Sell banner title"><input value={home.ctaTitle} onChange={(e) => setHome({ ...home, ctaTitle: e.target.value })} /></Field><Field label="Sell banner text"><input value={home.ctaText} onChange={(e) => setHome({ ...home, ctaText: e.target.value })} /></Field></div>
        </div>
      </CmsCard>
      <CmsCard title="Why choose Hope" dirty={d2} onSave={() => s2('Why choose Hope')}><ListEditor items={why} onChange={setWhy} blank={{ icon: 'star', title: '', text: '' }} fields={[{ key: 'icon', label: 'Icon', type: 'select', choices: icons, w: '140px' }, { key: 'title', label: 'Title', w: '1fr' }, { key: 'text', label: 'Text', w: '2fr' }]} /></CmsCard>
      <CmsCard title="Testimonials" dirty={d3} onSave={() => s3('Testimonials')}><ListEditor items={tst} onChange={setTst} blank={{ name: '', where: '', text: '' }} fields={[{ key: 'name', label: 'Name', w: '1fr' }, { key: 'where', label: 'Deal', w: '1fr' }, { key: 'text', label: 'Quote', type: 'textarea', w: '2fr' }]} /></CmsCard>
    </div>
  );
}

function CmsCategories() {
  const { state } = useStore();
  const [v, setV, dirty, save] = useCms('categories');
  const used = (k) => state.listings.some((l) => l.category === k);
  return (
    <CmsCard title="Categories" sub="What can be listed. Categories in use cannot change their key or group; switch them off instead of deleting." dirty={dirty} onSave={() => save('Categories')}>
      <ListEditor items={v} onChange={setV} addLabel="Add category" blank={{ key: '', label: '', group: 'property', icon: 'home', active: true }} fields={[
        { key: 'label', label: 'Name', w: '1.4fr' }, { key: 'key', label: 'Key', w: '1fr', lockFor: (it) => used(it.key) },
        { key: 'group', label: 'Group', type: 'select', choices: [['property', 'Property'], ['vehicle', 'Vehicle']], w: '120px', lockFor: (it) => used(it.key) },
        { key: 'icon', label: 'Icon', type: 'select', choices: ICON_NAMES.map((n) => [n, n]), w: '130px' }, { key: 'active', label: 'On', type: 'toggle', w: '60px' },
      ]} />
    </CmsCard>
  );
}

function StringList({ title, sub, path }) {
  const [v, setV, dirty, save] = useCms(path);
  return <CmsCard title={title} sub={sub} dirty={dirty} onSave={() => save(title)}><textarea className="input" rows={8} value={v.join('\n')} onChange={(e) => setV(e.target.value.split('\n'))} onBlur={() => setV(v.map((x) => x.trim()).filter(Boolean))} /><p className="mini">One per line.</p></CmsCard>;
}

function CmsLists() {
  return (
    <div className="stack">
      <StringList title="Locations" sub="Cities / areas in search filters and the listing form" path="cms.locations" />
      <div className="grid2" style={{ alignItems: 'start' }}>
        <StringList title="Property features" path="cms.propertyFeatures" />
        <StringList title="Vehicle features" path="cms.vehicleFeatures" />
      </div>
    </div>
  );
}

function CmsPages() {
  const [pages, setPages, d1, s1] = useCms('cms.pages');
  const [faqs, setFaqs, d2, s2] = useCms('cms.faqs');
  return (
    <div className="stack">
      <CmsCard title="Pages" sub="About, Terms, Privacy notice (website /p/{slug} and the app)" dirty={d1} onSave={() => s1('Pages')}><ListEditor items={pages} onChange={setPages} addLabel="Add page" blank={{ slug: '', title: '', body: '' }} fields={[{ key: 'title', label: 'Title', w: '1fr' }, { key: 'slug', label: 'Address /p/…', w: '140px' }, { key: 'body', label: 'Text', type: 'textarea', w: '2.4fr' }]} /></CmsCard>
      <CmsCard title="FAQs" dirty={d2} onSave={() => s2('FAQs')}><ListEditor items={faqs} onChange={setFaqs} addLabel="Add question" blank={{ q: '', a: '' }} fields={[{ key: 'q', label: 'Question', w: '1fr' }, { key: 'a', label: 'Answer', type: 'textarea', w: '2fr' }]} /></CmsCard>
    </div>
  );
}

function CmsAnnouncements() {
  const [v, setV, dirty, save] = useCms('cms.announcements');
  return <CmsCard title="Announcements" sub="Banner on the website / app, or a notice on the staff dashboard" dirty={dirty} onSave={() => save('Announcements')}><ListEditor items={v} onChange={setV} addLabel="Add announcement" blank={{ id: `an${Date.now()}`, text: '', link: '', audience: 'all', active: true }} fields={[{ key: 'text', label: 'Text', w: '2fr' }, { key: 'link', label: 'Link', w: '1fr' }, { key: 'audience', label: 'Show to', type: 'select', choices: [['all', 'Everyone'], ['web', 'Website'], ['app', 'App'], ['staff', 'Staff']], w: '120px' }, { key: 'active', label: 'On', type: 'toggle', w: '60px' }]} /></CmsCard>;
}

function CmsTemplates() {
  const [v, setV, dirty, save] = useCms('cms.templates');
  return (
    <CmsCard title="Message templates" sub="Wording of every SMS, email and push notification. Words starting with : are filled in (e.g. :customer, :listing, :amount)." dirty={dirty} onSave={() => save('Message templates')}>
      <div className="stack">{v.map((t, i) => (
        <div key={t.key} className="list-ed" style={{ display: 'block' }}>
          <div className="row between"><b>{t.label}</b><span className="mono mini">{t.key}</span></div>
          <div className="chips" style={{ margin: '6px 0' }}>{['sms', 'email', 'push'].map((ch) => <button type="button" key={ch} className={`chip ${t.channels.includes(ch) ? 'on' : ''}`} onClick={() => setV(v.map((x, j) => (j === i ? { ...x, channels: x.channels.includes(ch) ? x.channels.filter((y) => y !== ch) : [...x.channels, ch] } : x)))}>{ch.toUpperCase()}</button>)}</div>
          <textarea className="input" rows={2} value={t.body} onChange={(e) => setV(v.map((x, j) => (j === i ? { ...x, body: e.target.value } : x)))} />
        </div>
      ))}</div>
    </CmsCard>
  );
}

function Integrations() {
  const { state, update, toast } = useStore();
  return (
    <div className="stack">
      <div className="card card-pad"><h2 style={{ margin: 0 }}>Integrations (plug and play)</h2><p className="muted" style={{ margin: '4px 0 0' }}>Enter the keys, press Test, then switch on. Secrets are write-only (masked) and encrypted in the real system. Switching off falls back safely (e.g. no SMS → codes shown in the log on test servers).</p></div>
      <div className="int-grid">
        {INTEGRATIONS.map((it) => <IntegrationCard key={it.key} it={it} cur={state.integrations[it.key]} update={update} toast={toast} />)}
      </div>
    </div>
  );
}

function IntegrationCard({ it, cur, update, toast }) {
  const [vals, setVals] = useState(() => ({ ...cur.values }));
  const [testing, setTesting] = useState(false);
  const filled = it.fields.every(([k, label, type]) => type === 'select' || /optional|not needed/i.test(label) || (vals[k] || '').trim() || (type === 'secret' && cur.values[k]));
  const test = () => {
    setTesting(true);
    setTimeout(() => {
      const ok = filled;
      update((d) => {
        const x = d.integrations[it.key];
        x.values = Object.fromEntries(Object.entries(vals).map(([k, v]) => [k, it.fields.find((f) => f[0] === k)?.[2] === 'secret' && v && !v.startsWith('••') ? `••••••••${v.slice(-4)}` : v]));
        x.test = { ok, at: new Date().toISOString(), message: ok ? `Connected to ${it.label}.` : 'Missing or invalid keys.' };
        audit(d, 'integration.tested', `Tested ${it.label}: ${ok ? 'OK' : 'failed'}`, { subject: { type: 'integration', id: it.key, label: it.label }, severity: ok ? 'info' : 'warning' });
      });
      setVals((v) => Object.fromEntries(Object.entries(v).map(([k, val]) => [k, it.fields.find((f) => f[0] === k)?.[2] === 'secret' && val && !val.startsWith('••') ? `••••••••${val.slice(-4)}` : val])));
      setTesting(false);
      toast(ok ? `${it.label}: test successful.` : `${it.label}: fill in all keys first.`, ok ? 'ok' : 'err');
    }, 900);
  };
  const toggle = (on) => {
    if (on && !cur.test?.ok) { toast('Run a successful test before switching on.', 'err'); return; }
    update((d) => { d.integrations[it.key].on = on; audit(d, on ? 'integration.enabled' : 'integration.disabled', `${on ? 'Switched on' : 'Switched off'} ${it.label} (${it.kind})`, { subject: { type: 'integration', id: it.key, label: it.label }, severity: 'warning' }); });
  };
  return (
    <div className={`card int-card ${cur.on ? 'on' : ''}`}>
      <div className="card-h"><div className="row"><span className="int-ico"><Icon name={it.icon} /></span><div><b>{it.label}</b><div className="mini">{it.kind}</div></div></div><Switch checked={cur.on} onChange={toggle} label={`Switch ${it.label}`} /></div>
      <div className="card-b stack">
        <p className="mini" style={{ margin: 0 }}>{it.description}</p>
        {it.fields.map(([k, label, type, ph, choices]) => (type === 'select' ? <Field key={k} label={label}><select value={vals[k] || Object.keys(choices)[0]} onChange={(e) => setVals({ ...vals, [k]: e.target.value })}>{Object.entries(choices).map(([ck, cv]) => <option key={ck} value={ck}>{cv}</option>)}</select></Field> : <Field key={k} label={label}><input type={type === 'secret' ? 'password' : 'text'} className={type === 'secret' ? 'mono' : ''} value={vals[k] || ''} placeholder={ph} onFocus={(e) => { if (type === 'secret' && (vals[k] || '').startsWith('••')) setVals({ ...vals, [k]: '' }); e.target.select(); }} onChange={(e) => setVals({ ...vals, [k]: e.target.value })} /></Field>))}
        <div className="row between">{cur.test ? <Badge tone={cur.test.ok ? 'ok' : 'bad'}>{cur.test.ok ? 'Test OK' : 'Test failed'} · {fmtDateTime(cur.test.at)}</Badge> : <span className="mini">Not tested</span>}<button type="button" className="btn ghost sm" onClick={test} disabled={testing}>{testing ? 'Testing…' : 'Save & test'}</button></div>
      </div>
    </div>
  );
}

function DemoData() {
  const { state } = useStore();
  const download = () => { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' })); a.download = 'hope-simulator-data.json'; a.click(); };
  return (
    <div className="stack">
      <div className="card card-pad stack">
        <h2 style={{ margin: 0 }}>Demo data</h2>
        <p className="muted">This simulator has no server. All data lives in this browser (localStorage) and is shared by the website, customer portal, staff portal and phone simulator. Other people who open the link start from the same sample data.</p>
        <div className="row"><ResetDataButton className="btn danger" label="Reset all demo data" /><button type="button" className="btn ghost" onClick={download}><Icon name="download" />Download data (JSON)</button></div>
        <dl className="kv"><dt>Sample data created</dt><dd>{fmtDateTime(state.seededAt)}</dd><dt>Listings</dt><dd>{state.listings.length}</dd><dt>Deals</dt><dd>{state.deals.length}</dd><dt>Audit entries</dt><dd>{state.audit.length}</dd></dl>
      </div>
    </div>
  );
}
