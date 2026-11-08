// Formatting and small helpers shared by every screen.

export const peso = (n, opts = {}) => {
  const v = Number(n || 0);
  return `₱${v.toLocaleString('en-PH', { minimumFractionDigits: opts.cents ? 2 : 0, maximumFractionDigits: opts.cents ? 2 : 0 })}`;
};
export const pesoCents = (n) => peso(n, { cents: true });

/** ₱3.2M, ₱850K */
export function pesoShort(n) {
  const v = Number(n || 0);
  if (Math.abs(v) >= 1e9) return `₱${(v / 1e9).toFixed(v % 1e9 ? 2 : 0)}B`;
  if (Math.abs(v) >= 1e6) return `₱${(v / 1e6).toFixed(v >= 1e7 ? 1 : 2).replace(/\.?0+$/, '')}M`;
  if (Math.abs(v) >= 1e3) return `₱${Math.round(v / 1e3)}K`;
  return `₱${Math.round(v)}`;
}

export const priceLabel = (l) => `${peso(l.price)}${l.priceUnit === 'month' ? ' / month' : l.priceUnit === 'day' ? ' / day' : ''}`;
export const priceShort = (l) => `${pesoShort(l.price)}${l.priceUnit === 'month' ? '/mo' : l.priceUnit === 'day' ? '/day' : ''}`;

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export const monthName = (i) => MONTHS[i];

export function fmtDate(iso, withTime = false) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const s = `${MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
  if (!withTime) return s;
  return `${s} · ${d.toLocaleTimeString('en-PH', { hour: 'numeric', minute: '2-digit' })}`;
}
export const fmtDateTime = (iso) => fmtDate(iso, true);
export const fmtMonth = (ym) => { const [y, m] = ym.split('-'); return `${MONTHS[Number(m) - 1]} ${y}`; };
export const ymd = (d) => { const x = new Date(d); return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`; };
export const ym = (d) => ymd(d).slice(0, 7);
export const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
export const daysBetween = (a, b) => Math.round((new Date(b) - new Date(a)) / 86400000);

/** "5 min ago", "3 d ago", "in 2 h" (future); older than 30 days → the date. */
export function timeAgo(iso) {
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return '—';
  const diff = Math.round((Date.now() - t) / 1000);
  const s = Math.abs(diff);
  if (s < 60) return 'just now';
  const v = s < 3600 ? `${Math.floor(s / 60)} min` : s < 86400 ? `${Math.floor(s / 3600)} h` : s < 86400 * 30 ? `${Math.floor(s / 86400)} d` : null;
  if (!v) return fmtDate(iso);
  return diff >= 0 ? `${v} ago` : `in ${v}`;
}

export const uid = (p = 'id') => `${p}_${Math.random().toString(36).slice(2, 9)}${Date.now().toString(36).slice(-3)}`;
export const slugify = (s) => String(s).toLowerCase().normalize('NFKD').replace(/[^\w\s-]/g, '').trim().replace(/[\s_]+/g, '-').replace(/-+/g, '-').slice(0, 60);
export const pad = (n, w = 4) => String(n).padStart(w, '0');
export const initials = (name = '') => name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase();
export const maskEmail = (e = '') => e.replace(/^(.)(.*)(.@.*)$/, (_, a, b, c) => a + '•'.repeat(Math.min(6, b.length)) + c);
export const maskMobile = (m = '') => (m.length > 6 ? `${m.slice(0, 4)}•••${m.slice(-4)}` : m);
export const titleCase = (s = '') => s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
export const sum = (arr, f = (x) => x) => arr.reduce((a, x) => a + (Number(f(x)) || 0), 0);
export const round2 = (n) => Math.round(Number(n) * 100) / 100;

/** Download rows as CSV (Excel opens it). */
export function downloadCsv(filename, headers, rows) {
  const esc = (v) => { const s = String(v ?? ''); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
  const csv = [headers, ...rows].map((r) => r.map(esc).join(',')).join('\r\n');
  const blob = new Blob([`﻿${csv}`], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}

/** Amount in words for receipts: 12500.5 → "Twelve thousand five hundred pesos and 50/100" */
export function amountInWords(n) {
  const ones = ['', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'];
  const tens = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];
  const chunk = (x) => {
    let s = '';
    if (x >= 100) { s += `${ones[Math.floor(x / 100)]} hundred `; x %= 100; }
    if (x >= 20) { s += `${tens[Math.floor(x / 10)]}${x % 10 ? `-${ones[x % 10]}` : ''} `; } else if (x > 0) s += `${ones[x]} `;
    return s;
  };
  const whole = Math.floor(Math.abs(n));
  const cents = Math.round((Math.abs(n) - whole) * 100);
  if (whole === 0) return `Zero pesos${cents ? ` and ${cents}/100` : ''}`;
  const scales = [[1e9, 'billion'], [1e6, 'million'], [1e3, 'thousand']];
  let rest = whole; let out = '';
  for (const [v, w] of scales) if (rest >= v) { out += `${chunk(Math.floor(rest / v))}${w} `; rest %= v; }
  out += chunk(rest);
  out = out.trim().replace(/\s+/g, ' ');
  return `${out.charAt(0).toUpperCase()}${out.slice(1)} pesos${cents ? ` and ${cents}/100` : ' only'}`;
}

/** Seeded random numbers (same sample data on every reset). */
export function rng(seed = 7) {
  let a = seed >>> 0;
  const next = () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  next.int = (min, max) => Math.floor(next() * (max - min + 1)) + min;
  next.pick = (arr) => arr[Math.floor(next() * arr.length)];
  next.chance = (p) => next() < p;
  return next;
}
