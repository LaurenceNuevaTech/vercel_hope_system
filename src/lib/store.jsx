import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { DATA_VERSION, defaultState } from './seed.js';

// The simulator has no server: the whole "database" is one object saved in this
// browser's localStorage, shared by the website, the customer portal, the staff
// portal and the phone simulator (open them in two tabs and they stay in sync).
const KEY = 'hope-simulator';

function load() {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.version === DATA_VERSION) return parsed;
    }
  } catch {
    // Storage blocked or corrupt: fall back to the sample data.
  }
  return defaultState();
}

const StoreContext = createContext(null);

export function StoreProvider({ children }) {
  const [state, setState] = useState(load);
  const [toasts, setToasts] = useState([]);
  const [storageError, setStorageError] = useState(false);
  const skipSave = useRef(false);

  useEffect(() => {
    if (skipSave.current) { skipSave.current = false; return undefined; }
    const t = setTimeout(() => {
      try { window.localStorage.setItem(KEY, JSON.stringify(state)); setStorageError(false); } catch { setStorageError(true); }
    }, 150);
    return () => clearTimeout(t);
  }, [state]);

  useEffect(() => {
    const onStorage = (e) => {
      if (e.key !== KEY || !e.newValue) return;
      try {
        const next = JSON.parse(e.newValue);
        if (next.version === DATA_VERSION) { skipSave.current = true; current.current = next; setState(next); }
      } catch { /* ignore */ }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  // Brand colours from the CMS.
  useEffect(() => {
    const root = document.documentElement.style;
    const { primary, accent } = state.settings.brand.identity;
    root.setProperty('--brand', primary);
    root.setProperty('--brand-d', mix(primary, '#000000', 0.32));
    root.setProperty('--brand-50', mix(primary, '#ffffff', 0.92));
    root.setProperty('--brand-100', mix(primary, '#ffffff', 0.82));
    root.setProperty('--accent', accent);
    root.setProperty('--accent-d', mix(accent, '#000000', 0.25));
    root.setProperty('--accent-50', mix(accent, '#ffffff', 0.88));
    // Readable text on the accent colour, links and the dark sidebar, whatever colours Hope picks.
    root.setProperty('--on-accent', luminance(accent) > 0.3 ? '#161616' : '#ffffff');
    root.setProperty('--link', luminance(primary) < 0.03 ? mix(accent, '#000000', 0.38) : primary);
    root.setProperty('--side', mix(primary, '#000000', 0.45));
  }, [state.settings.brand.identity]);

  // update(recipe): the recipe edits a copy of the state and may return a value.
  const current = useRef(state);
  current.current = state;
  const update = useCallback((recipe) => {
    const next = structuredClone(current.current);
    const result = recipe(next);
    current.current = next;
    setState(next);
    return result;
  }, []);

  const toast = useCallback((text, kind = 'ok') => {
    const id = Math.random();
    setToasts((t) => [...t, { id, text, kind }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), kind === 'code' ? 12000 : 4200);
  }, []);

  const reset = useCallback(() => {
    try { window.localStorage.removeItem(KEY); } catch { /* ignore */ }
    const fresh = defaultState();
    current.current = fresh;
    setState(fresh);
  }, []);

  const value = useMemo(() => ({ state, update, toast, reset, storageError }), [state, update, toast, reset, storageError]);

  return (
    <StoreContext.Provider value={value}>
      {children}
      <div className="toasts" role="status">
        {toasts.map((t) => <div key={t.id} className={`toast toast-${t.kind}`}>{t.text}</div>)}
      </div>
    </StoreContext.Provider>
  );
}

export const useStore = () => useContext(StoreContext);

export const me = (state) => (state.staffSession ? state.staff.find((s) => s.id === state.staffSession.staffId) : null);
export const meCustomer = (state) => (state.customerSession ? state.customers.find((c) => c.id === state.customerSession.customerId) : null);
export const staffName = (state, id) => state.staff.find((s) => s.id === id)?.name || '—';
export const customerName = (state, id) => state.customers.find((c) => c.id === id)?.name || '—';
export const listingById = (state, id) => state.listings.find((l) => l.id === id);
export const categoryLabel = (state, key) => state.categories.find((c) => c.key === key)?.label || key;

const IPS = ['112.198.24.17', '49.145.10.88', '180.190.33.2', '203.177.45.9'];
function deviceName() {
  const ua = navigator.userAgent;
  const b = /Edg\//.test(ua) ? 'Edge' : /Chrome\//.test(ua) ? 'Chrome' : /Safari\//.test(ua) ? 'Safari' : /Firefox\//.test(ua) ? 'Firefox' : 'Browser';
  const o = /Windows/.test(ua) ? 'Windows' : /iPhone|iPad/.test(ua) ? 'iPhone' : /Android/.test(ua) ? 'Android' : /Mac/.test(ua) ? 'macOS' : 'Linux';
  return `${b} · ${o}`;
}

/**
 * Add an audit entry inside an update() recipe. Audit entries are never edited or deleted.
 * opts: { subject: {type,id,label}, changes: [{field,label,from,to}], severity, actor, channel }
 */
export function audit(draft, event, description, opts = {}) {
  let actor = opts.actor;
  if (!actor) {
    const s = draft.staffSession && draft.staff.find((x) => x.id === draft.staffSession.staffId);
    const c = draft.customerSession && draft.customers.find((x) => x.id === draft.customerSession.customerId);
    actor = s ? { type: 'staff', id: s.id, name: s.name, role: s.role } : c ? { type: 'customer', id: c.id, name: c.name, role: null } : { type: 'guest', id: null, name: 'Guest', role: null };
  }
  draft.audit.unshift({
    id: `a${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`,
    at: new Date().toISOString(), actor, event, description, severity: opts.severity || 'info',
    subject: opts.subject || null, changes: opts.changes || null,
    ip: IPS[0], device: opts.device || draft.__device || deviceName(), channel: opts.channel || draft.__channel || (actor.type === 'staff' ? 'admin' : 'web'),
  });
  if (draft.audit.length > 3000) draft.audit.length = 3000;
}

/** Notify a staff member or customer (in-app inbox; push / SMS / email when the integrations are on). */
export function notify(draft, to, title, body, link = '') {
  draft.notifications.unshift({ id: `n${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`, to, title, body, link, at: new Date().toISOString(), read: false });
  if (draft.notifications.length > 400) draft.notifications.length = 400;
}

/** Next document number: nextNo(draft, 'receipt', 'AR', 6) → AR-000124 */
export function nextNo(draft, counter, prefix, width = 5) {
  draft.counters[counter] = (draft.counters[counter] || 0) + 1;
  return `${prefix}-${String(draft.counters[counter]).padStart(width, '0')}`;
}

// ---- colour helpers
function hexToRgb(hex) {
  const h = String(hex || '#000000').replace('#', '');
  const n = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
const toHex = (rgb) => `#${rgb.map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('')}`;
export function luminance(hex) { const [r, g, b] = hexToRgb(hex).map((v) => { const c = v / 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; }); return 0.2126 * r + 0.7152 * g + 0.0722 * b; }
export function mix(a, b, t) { const x = hexToRgb(a); const y = hexToRgb(b); return toHex(x.map((v, i) => v + (y[i] - v) * t)); }

/** Downscale an uploaded photo and return it as a data URL (keeps the browser storage small). */
export function readPhoto(file, max = 1200) {
  return new Promise((resolve, reject) => {
    if (!file || !file.type.startsWith('image/')) { reject(new Error('Please choose a photo (JPG, PNG or WebP).')); return; }
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Could not read the file.'));
    reader.onload = () => {
      if (file.type === 'image/svg+xml') { resolve(reader.result); return; }
      const img = new Image();
      img.onerror = () => reject(new Error('This photo format is not supported by the browser.'));
      img.onload = () => {
        const scale = Math.min(1, max / Math.max(img.width, img.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL(file.type === 'image/png' ? 'image/png' : 'image/jpeg', 0.8));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}
