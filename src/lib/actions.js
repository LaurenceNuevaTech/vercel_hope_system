// Business actions. Each one runs inside update(draft => ...) and writes the
// audit trail, so the website, the staff portal and the phone simulator behave
// the same (and match the API described in docs/).
import { LISTING_STATUS, PAYMENT_KINDS } from './catalog.js';
import { addDays, pad, slugify, ym } from './format.js';
import { computeDeal } from './money.js';
import { audit, nextNo, notify } from './store.jsx';
import { can, canApprove } from './auth.js';

const subj = (l) => ({ type: 'listing', id: l.id, label: `${l.code} · ${l.title}` });
const dsubj = (d, draft) => ({ type: 'deal', id: d.id, label: `${d.code} · ${draft.listings.find((l) => l.id === d.listingId)?.title || ''}` });
const actorOf = (draft) => draft.staff.find((s) => s.id === draft.staffSession?.staffId);
const fmt = (n) => `₱${Number(n).toLocaleString('en-PH', { maximumFractionDigits: 2 })}`;
const teamManager = (draft, staffId) => {
  const s = draft.staff.find((x) => x.id === staffId);
  return draft.teams.find((t) => t.id === s?.teamId)?.managerId || null;
};

// ---------------------------------------------------------------- listings
const TRACKED = [['title', 'Title'], ['purpose', 'Purpose'], ['category', 'Category'], ['price', 'Price'], ['priceUnit', 'Price unit'], ['negotiable', 'Negotiable'], ['city', 'City'], ['barangay', 'Barangay'], ['address', 'Address'], ['description', 'Description'], ['features', 'Features'], ['specs', 'Details'], ['photos', 'Photos'], ['ownerName', 'Owner'], ['ownerPhone', 'Owner phone'], ['agentId', 'Agent']];
const show = (k, v, draft) => {
  if (k === 'photos') return `${(v || []).length} photo(s)`;
  if (k === 'agentId') return draft.staff.find((s) => s.id === v)?.name || v;
  if (k === 'price') return fmt(v);
  if (Array.isArray(v)) return v.join(', ') || '—';
  if (v && typeof v === 'object') return Object.entries(v).map(([a, b]) => `${a}: ${b}`).join('; ');
  if (typeof v === 'boolean') return v ? 'Yes' : 'No';
  return v === '' || v == null ? '—' : String(v);
};
export function diff(before, after, draft, fields = TRACKED) {
  return fields.filter(([k]) => JSON.stringify(before[k] ?? null) !== JSON.stringify(after[k] ?? null)).map(([k, label]) => ({ field: k, label, from: show(k, before[k], draft), to: show(k, after[k], draft) }));
}

export function saveListing(draft, data, { submit = false } = {}) {
  const a = actorOf(draft);
  const group = draft.categories.find((c) => c.key === data.category)?.group || 'property';
  const w = draft.settings.listings.workflow;
  if (data.id) {
    const l = draft.listings.find((x) => x.id === data.id);
    const before = structuredClone(l);
    Object.assign(l, data, { group, updatedAt: new Date().toISOString(), updatedBy: a.id });
    if (data.agentId && data.agentId !== before.agentId) l.teamId = draft.staff.find((s) => s.id === data.agentId)?.teamId || null;
    const changes = diff(before, l, draft);
    if (changes.length) audit(draft, 'listing.updated', `Updated ${l.code}: ${changes.map((c) => c.label.toLowerCase()).join(', ')}`, { subject: subj(l), changes });
    const sensitive = changes.some((c) => ['price', 'title', 'photos', 'purpose'].includes(c.field));
    if (['published', 'reserved'].includes(before.status) && sensitive && w.requireApproval && w.reapproveOnEdit && !can(draft, 'listings.approve', a)) {
      l.status = 'pending'; l.submittedAt = new Date().toISOString();
      audit(draft, 'listing.resubmitted', `${l.code} needs approval again after editing ${changes.filter((c) => ['price', 'title', 'photos', 'purpose'].includes(c.field)).map((c) => c.label.toLowerCase()).join(', ')}`, { subject: subj(l), severity: 'warning' });
      notifyApprovers(draft, l);
    } else if (submit) submitListing(draft, l.id);
    return l;
  }
  draft.counters.listing += 1;
  const n = draft.counters.listing;
  const l = {
    id: `l${n}${Date.now().toString(36).slice(-3)}`, code: `${w.codePrefix}-${new Date().getFullYear()}-${pad(n)}`, slug: `${slugify(data.title)}-${n}`,
    negotiable: false, features: [], photos: [], specs: {}, artSeed: n * 3 + 1, views: 0, shares: { link: 0, facebook: 0, messenger: 0, viber: 0, qr: 0 }, featured: false,
    authority: { type: 'Exclusive', file: data.authorityFile || '', validUntil: addDays(new Date(), 180).toISOString() },
    ...data, group, agentId: data.agentId || a.id, teamId: draft.staff.find((s) => s.id === (data.agentId || a.id))?.teamId || null,
    status: 'draft', createdAt: new Date().toISOString(), createdBy: a.id, updatedAt: new Date().toISOString(), updatedBy: a.id,
    submittedAt: null, approvedAt: null, approvedBy: null, publishedAt: null, expiresAt: null, review: null, deleted: null,
  };
  draft.listings.unshift(l);
  audit(draft, 'listing.created', `Created listing ${l.code} "${l.title}"`, { subject: subj(l) });
  if (submit) submitListing(draft, l.id);
  return l;
}

function notifyApprovers(draft, l) {
  const mgr = teamManager(draft, l.agentId);
  const to = mgr && mgr !== l.agentId ? [mgr] : draft.staff.filter((s) => ['owner', 'admin'].includes(s.role)).map((s) => s.id);
  to.forEach((id) => notify(draft, { type: 'staff', id }, 'Listing waiting for approval', `${l.code} "${l.title}"`, `/admin/listings/${l.id}`));
}

export function submitListing(draft, id) {
  const l = draft.listings.find((x) => x.id === id);
  const a = actorOf(draft);
  const w = draft.settings.listings.workflow;
  if (!w.requireApproval || (canApprove(draft, l, a) && w.selfApproval)) {
    return approveListing(draft, id, 'Published directly (approval not required).', true);
  }
  l.status = 'pending'; l.submittedAt = new Date().toISOString();
  audit(draft, 'listing.submitted', `Submitted ${l.code} for approval`, { subject: subj(l) });
  notifyApprovers(draft, l);
  return null;
}

export function approveListing(draft, id, note = '', direct = false) {
  const l = draft.listings.find((x) => x.id === id);
  const a = actorOf(draft);
  if (!direct && !canApprove(draft, l, a)) return 'You cannot approve this listing (your own listing, or not your team).';
  const now = new Date().toISOString();
  const from = l.status;
  Object.assign(l, { status: 'published', approvedAt: now, approvedBy: a.id, publishedAt: l.publishedAt || now, expiresAt: addDays(new Date(), draft.settings.listings.workflow.validityDays).toISOString(), review: { decision: 'approved', by: a.id, at: now, note } });
  audit(draft, 'listing.approved', `Approved and published ${l.code}${note ? `: ${note}` : ''}`, { subject: subj(l), changes: [{ field: 'status', label: 'Status', from: LISTING_STATUS[from]?.label || from, to: 'Published' }] });
  if (l.agentId !== a.id) notify(draft, { type: 'staff', id: l.agentId }, 'Listing approved', `${l.code} is now live.`, `/admin/listings/${l.id}`);
  return null;
}

export function reviewListing(draft, id, decision, note) {
  const l = draft.listings.find((x) => x.id === id);
  const a = actorOf(draft);
  if (!canApprove(draft, l, a)) return 'You cannot review this listing.';
  if (!note?.trim()) return 'Please write the reason so the agent knows what to fix.';
  const now = new Date().toISOString();
  const from = l.status;
  l.status = decision === 'reject' ? 'rejected' : 'changes';
  l.review = { decision: decision === 'reject' ? 'rejected' : 'changes', by: a.id, at: now, note };
  audit(draft, decision === 'reject' ? 'listing.rejected' : 'listing.changes_requested', `${decision === 'reject' ? 'Rejected' : 'Requested changes on'} ${l.code}: ${note}`, { subject: subj(l), severity: 'warning', changes: [{ field: 'status', label: 'Status', from: LISTING_STATUS[from]?.label, to: LISTING_STATUS[l.status].label }] });
  notify(draft, { type: 'staff', id: l.agentId }, decision === 'reject' ? 'Listing rejected' : 'Changes requested', `${l.code}: ${note}`, `/admin/listings/${l.id}`);
  return null;
}

export function setListingStatus(draft, id, status, reason = '') {
  const l = draft.listings.find((x) => x.id === id);
  const from = l.status;
  l.status = status; l.updatedAt = new Date().toISOString();
  if (status === 'published' && from === 'expired') l.expiresAt = addDays(new Date(), draft.settings.listings.workflow.validityDays).toISOString();
  audit(draft, `listing.${status === 'published' ? 'republished' : status}`, `${l.code} → ${LISTING_STATUS[status].label}${reason ? `: ${reason}` : ''}`, { subject: subj(l), changes: [{ field: 'status', label: 'Status', from: LISTING_STATUS[from]?.label, to: LISTING_STATUS[status].label }] });
}

export function deleteListing(draft, id, reason) {
  if (!reason?.trim()) return 'A reason is required. It is kept in the audit log.';
  const l = draft.listings.find((x) => x.id === id);
  const a = actorOf(draft);
  l.deleted = { at: new Date().toISOString(), by: a.id, reason };
  audit(draft, 'listing.deleted', `Moved ${l.code} to Trash: ${reason}`, { subject: subj(l), severity: 'warning' });
  if (draft.settings.security.alerts.bigDelete) draft.staff.filter((s) => s.role === 'owner' && s.id !== a.id).forEach((s) => notify(draft, { type: 'staff', id: s.id }, 'Listing deleted', `${a.name} deleted ${l.code}: ${reason}`, '/admin/audit'));
  return null;
}

export function restoreListing(draft, id) {
  const l = draft.listings.find((x) => x.id === id);
  l.deleted = null;
  audit(draft, 'listing.restored', `Restored ${l.code} from Trash`, { subject: subj(l) });
}

export function toggleFeatured(draft, id) {
  const l = draft.listings.find((x) => x.id === id);
  l.featured = !l.featured;
  audit(draft, l.featured ? 'listing.featured' : 'listing.unfeatured', `${l.featured ? 'Featured' : 'Removed from featured'}: ${l.code}`, { subject: subj(l), changes: [{ field: 'featured', label: 'Featured', from: l.featured ? 'No' : 'Yes', to: l.featured ? 'Yes' : 'No' }] });
}

export function recordShare(draft, id, channel) {
  const l = draft.listings.find((x) => x.id === id);
  if (!l) return;
  l.shares[channel] = (l.shares[channel] || 0) + 1;
  audit(draft, 'listing.shared', `${l.code} shared via ${channel}`, { subject: subj(l) });
}

// ---------------------------------------------------------------- inquiries & viewings
export function createInquiry(draft, listingId, customerId, text, source = 'web') {
  const l = draft.listings.find((x) => x.id === listingId);
  const c = draft.customers.find((x) => x.id === customerId);
  const existing = draft.inquiries.find((q) => q.listingId === listingId && q.customerId === customerId && !['won', 'lost'].includes(q.stage));
  const now = new Date().toISOString();
  if (existing) {
    existing.messages.push({ id: `m${Date.now()}`, from: 'customer', text, at: now });
    existing.updatedAt = now;
    notify(draft, { type: 'staff', id: existing.agentId }, 'New message', `${c.name}: ${text.slice(0, 80)}`, `/admin/leads/${existing.id}`);
    return existing;
  }
  const q = { id: `q${Date.now().toString(36)}`, listingId, customerId, agentId: l.agentId, teamId: l.teamId, stage: 'new', source, createdAt: now, updatedAt: now, firstReplyAt: null, messages: [{ id: `m${Date.now()}`, from: 'customer', text, at: now }], lostReason: null };
  draft.inquiries.unshift(q);
  audit(draft, 'inquiry.created', `${c.name} sent an inquiry about ${l.code}`, { subject: { type: 'inquiry', id: q.id, label: `${l.code} · ${c.name}` }, channel: source === 'mobile' ? 'mobile' : 'web', actor: { type: 'customer', id: c.id, name: c.name, role: null } });
  notify(draft, { type: 'staff', id: l.agentId }, 'New inquiry', `${c.name} asked about ${l.code}`, `/admin/leads/${q.id}`);
  return q;
}

export function replyInquiry(draft, id, text) {
  const q = draft.inquiries.find((x) => x.id === id);
  const a = actorOf(draft);
  const now = new Date().toISOString();
  q.messages.push({ id: `m${Date.now()}`, from: 'agent', staffId: a.id, text, at: now });
  q.updatedAt = now;
  if (!q.firstReplyAt) q.firstReplyAt = now;
  if (q.stage === 'new') q.stage = 'contacted';
  const l = draft.listings.find((x) => x.id === q.listingId);
  notify(draft, { type: 'customer', id: q.customerId }, `${a.name} replied`, text.slice(0, 90), `/account/inquiries/${q.id}`);
  audit(draft, 'inquiry.replied', `Replied to inquiry on ${l?.code}`, { subject: { type: 'inquiry', id: q.id, label: l?.code } });
}

export function setLeadStage(draft, id, stage, reason = '') {
  const q = draft.inquiries.find((x) => x.id === id);
  const from = q.stage;
  q.stage = stage; q.updatedAt = new Date().toISOString();
  if (stage === 'lost') q.lostReason = reason || 'Not specified';
  audit(draft, 'inquiry.stage', `Lead moved ${from} → ${stage}${reason ? ` (${reason})` : ''}`, { subject: { type: 'inquiry', id: q.id, label: draft.listings.find((l) => l.id === q.listingId)?.code }, changes: [{ field: 'stage', label: 'Stage', from, to: stage }] });
}

export function assignLead(draft, id, agentId) {
  const q = draft.inquiries.find((x) => x.id === id);
  const from = draft.staff.find((s) => s.id === q.agentId)?.name;
  const to = draft.staff.find((s) => s.id === agentId);
  q.agentId = agentId; q.teamId = to.teamId;
  audit(draft, 'inquiry.assigned', `Lead reassigned to ${to.name}`, { subject: { type: 'inquiry', id: q.id, label: draft.listings.find((l) => l.id === q.listingId)?.code }, changes: [{ field: 'agentId', label: 'Agent', from, to: to.name }] });
  notify(draft, { type: 'staff', id: agentId }, 'Lead assigned to you', 'Please reply within the response time.', `/admin/leads/${q.id}`);
}

export function requestViewing(draft, listingId, customerId, at, note = '', source = 'web') {
  const l = draft.listings.find((x) => x.id === listingId);
  const c = draft.customers.find((x) => x.id === customerId);
  const q = createInquiry(draft, listingId, customerId, `I would like to view this on ${new Date(at).toLocaleString('en-PH', { dateStyle: 'medium', timeStyle: 'short' })}.${note ? ` ${note}` : ''}`, source);
  if (['new', 'contacted'].includes(q.stage)) q.stage = 'viewing';
  const v = { id: `v${Date.now().toString(36)}`, inquiryId: q.id, listingId, customerId, agentId: l.agentId, at, status: 'requested', notes: note, createdAt: new Date().toISOString() };
  draft.viewings.unshift(v);
  audit(draft, 'viewing.requested', `${c.name} requested a viewing of ${l.code}`, { subject: { type: 'viewing', id: v.id, label: l.code }, actor: { type: 'customer', id: c.id, name: c.name, role: null }, channel: source === 'mobile' ? 'mobile' : 'web' });
  return v;
}

export function setViewing(draft, id, patch) {
  const v = draft.viewings.find((x) => x.id === id);
  const before = { ...v };
  Object.assign(v, patch);
  const l = draft.listings.find((x) => x.id === v.listingId);
  const changes = diff(before, v, draft, [['status', 'Status'], ['at', 'Date & time'], ['notes', 'Notes']]);
  audit(draft, 'viewing.updated', `Viewing of ${l?.code}: ${changes.map((c) => `${c.label} ${c.to}`).join(', ')}`, { subject: { type: 'viewing', id: v.id, label: l?.code }, changes });
  if (patch.status === 'confirmed') notify(draft, { type: 'customer', id: v.customerId }, 'Viewing confirmed', `${l?.title} · ${new Date(v.at).toLocaleString('en-PH', { dateStyle: 'medium', timeStyle: 'short' })}`, '/account/viewings');
}

// ---------------------------------------------------------------- deals & payments
export function createDeal(draft, data) {
  const a = actorOf(draft);
  const l = draft.listings.find((x) => x.id === data.listingId);
  draft.counters.deal += 1;
  const d = {
    id: `d${Date.now().toString(36)}`, code: `DL-${new Date().getFullYear()}-${pad(draft.counters.deal)}`, listingId: l.id, inquiryId: data.inquiryId || null, customerId: data.customerId,
    agentId: l.agentId, managerId: teamManager(draft, l.agentId), teamId: l.teamId, category: l.category, feeOverride: null, type: l.purpose, group: l.group, price: Number(data.price) || l.price, unit: l.priceUnit,
    leaseMonths: l.purpose === 'rent' && l.priceUnit !== 'day' ? Number(data.leaseMonths) || draft.settings.deals.terms.leaseMonths : null, days: l.priceUnit === 'day' ? Number(data.days) || 1 : null,
    scheme: data.scheme || (l.purpose === 'rent' ? 'Lease' : 'Cash'), status: 'reserved', reservedAt: new Date().toISOString(), closedAt: null, closedBy: null, cancelledAt: null, cancelReason: null, rateOverride: null,
    sellerName: l.ownerName, notes: data.notes || '', createdBy: a?.id || null, createdAt: new Date().toISOString(), computation: null,
    documents: [{ name: 'Reservation agreement', done: false }, { name: l.purpose === 'rent' ? 'Lease contract' : 'Deed of Absolute Sale', done: false }, { name: 'Valid IDs', done: false }, { name: l.purpose === 'rent' ? 'Post-dated checks' : 'Loan approval / proof of funds', done: false }],
  };
  draft.deals.unshift(d);
  const fromStatus = l.status;
  l.status = 'reserved';
  if (d.inquiryId) { const q = draft.inquiries.find((x) => x.id === d.inquiryId); if (q) q.stage = 'reserved'; }
  audit(draft, 'deal.created', `Created deal ${d.code} for ${l.code}`, { subject: dsubj(d, draft) });
  audit(draft, 'listing.reserved', `${l.code} marked Reserved`, { subject: subj(l), changes: [{ field: 'status', label: 'Status', from: LISTING_STATUS[fromStatus]?.label, to: 'Reserved' }] });
  return d;
}

export function previewDeal(draft, d) {
  const agent = draft.staff.find((s) => s.id === d.agentId);
  if (!d.category && d.listingId) d = { ...d, category: draft.listings.find((l) => l.id === d.listingId)?.category };
  return computeDeal(d, draft.settings, { agent, hasManager: !!d.managerId && d.managerId !== d.agentId });
}

export function closeDeal(draft, id) {
  const d = draft.deals.find((x) => x.id === id);
  const a = actorOf(draft);
  if (!can(draft, 'deals.close', a)) return 'You do not have permission to close deals.';
  const l = draft.listings.find((x) => x.id === d.listingId);
  d.computation = previewDeal(draft, d);
  d.status = 'closed'; d.closedAt = new Date().toISOString(); d.closedBy = a.id;
  l.status = d.type === 'rent' ? 'rented' : 'sold';
  if (d.inquiryId) { const q = draft.inquiries.find((x) => x.id === d.inquiryId); if (q) q.stage = 'won'; }
  const c = d.computation;
  audit(draft, 'deal.closed', `Closed ${d.code}: ${d.type === 'rent' ? 'rented' : 'sold'} at ${fmt(d.price)}. Commission ${fmt(c.gross)}; NuevaTech fee ${fmt(c.platformFee)}`, { subject: dsubj(d, draft), changes: [{ field: 'computation', label: 'Computation locked', from: '—', to: `${c.basis}; agent ${c.agentPct}%; fee ${c.platformBasis}` }] });
  // commissions
  const collected = commissionCollected(draft, d.id) >= c.gross - 0.01;
  const status = draft.settings.commission.payout.afterCollection && !collected ? 'pending' : draft.settings.commission.payout.needsApproval ? 'for_approval' : 'approved';
  const parts = [['agent', d.agentId, c.agentShare, c.agentWht, c.agentNet]];
  if (c.managerShare > 0) parts.push(['manager', d.managerId, c.managerShare, c.managerWht, c.managerNet]);
  parts.forEach(([role, sid, gross, wht, net]) => {
    const no = nextNo(draft, 'voucher', draft.settings.brand.documents.voucherPrefix, 5);
    draft.commissions.unshift({ id: `cm${Date.now().toString(36)}${role}`, no, dealId: d.id, staffId: sid, role, gross, wht, net, status, createdAt: d.closedAt, approvedBy: null, approvedAt: null, paidBy: null, paidAt: null });
    notify(draft, { type: 'staff', id: sid }, 'Deal closed', `${l.code} closed. Your ${role === 'manager' ? 'override' : 'commission'}: ${fmt(net)}`, '/admin/commissions');
  });
  // NuevaTech platform fee
  if (draft.settings.platform.fee.trigger === 'closed' || collected) addFee(draft, d);
  return null;
}

function addFee(draft, d) {
  if (draft.fees.some((f) => f.dealId === d.id) || !(d.computation.platformFee > 0)) return;
  draft.fees.unshift({ id: `f${Date.now().toString(36)}`, dealId: d.id, amount: d.computation.platformFee, basis: d.computation.platformBasis, month: ym(new Date()), closedAt: d.closedAt, status: 'unbilled', statementId: null });
  audit(draft, 'billing.fee_added', `Platform fee ${fmt(d.computation.platformFee)} for ${d.code} (${d.computation.platformBasis})`, { subject: dsubj(d, draft) });
}

export function cancelDeal(draft, id, reason) {
  if (!reason?.trim()) return 'A reason is required.';
  const d = draft.deals.find((x) => x.id === id);
  const l = draft.listings.find((x) => x.id === d.listingId);
  d.status = 'cancelled'; d.cancelledAt = new Date().toISOString(); d.cancelReason = reason;
  if (l.status === 'reserved') l.status = 'published';
  if (d.inquiryId) { const q = draft.inquiries.find((x) => x.id === d.inquiryId); if (q) { q.stage = 'lost'; q.lostReason = reason; } }
  audit(draft, 'deal.cancelled', `Cancelled ${d.code}: ${reason}`, { subject: dsubj(d, draft), severity: 'warning' });
  return null;
}

export function overrideRate(draft, id, rate, reason) {
  const d = draft.deals.find((x) => x.id === id);
  if (!reason?.trim()) return 'A reason is required.';
  const from = d.rateOverride;
  d.rateOverride = rate === '' || rate == null ? null : Number(rate);
  audit(draft, 'deal.rate_changed', `Commission rate of ${d.code} changed: ${reason}`, { subject: dsubj(d, draft), severity: 'warning', changes: [{ field: 'rateOverride', label: 'Commission rate', from: from ?? 'default', to: d.rateOverride ?? 'default' }] });
  return null;
}

/** Owner: NuevaTech fee for one deal (before closing). override = { method, rate, fixed } or null to use the rules. */
export function setFeeOverride(draft, id, override, reason) {
  if (!reason?.trim()) return 'A reason is required.';
  const d = draft.deals.find((x) => x.id === id);
  const show = (o) => (!o ? 'rules / default' : o.method === 'fixed' ? `fixed ₱${Number(o.fixed).toLocaleString()}` : `${o.rate}% of ${o.method === 'price' ? 'the deal price' : "Hope's commission"}`);
  const from = show(d.feeOverride);
  d.feeOverride = override;
  audit(draft, 'billing.fee_override', `NuevaTech fee for ${d.code} set to ${show(override)}: ${reason}`, { subject: dsubj(d, draft), severity: 'warning', changes: [{ field: 'feeOverride', label: 'NuevaTech fee', from, to: show(override) }] });
  return null;
}

/** Owner: save the NuevaTech fee rules (audit-logged with before / after). */
export function saveFeeRules(draft, rules) {
  const show = (r) => `${r.label}: ${r.categories.length ? r.categories.join(', ') : 'all categories'}, ${r.purpose}, ${r.method === 'fixed' ? `fixed ₱${Number(r.fixed).toLocaleString()}` : `${r.rate}% of ${r.method === 'price' ? 'price' : 'commission'}`}${r.active ? '' : ' (off)'}`;
  const before = (draft.settings.platform.rules || []).map(show).join(' | ') || 'none';
  draft.settings.platform.rules = rules;
  audit(draft, 'settings.fee_rules', 'Changed the NuevaTech fee rules', { subject: { type: 'settings', id: 'platform', label: 'NuevaTech fee rules' }, severity: 'warning', changes: [{ field: 'platform.rules', label: 'Fee rules', from: before, to: rules.map(show).join(' | ') || 'none' }] });
}

export const commissionCollected = (draft, dealId) => draft.payments.filter((p) => p.dealId === dealId && p.kind === 'commission' && !p.void).reduce((a, p) => a + p.amount, 0);

export function recordPayment(draft, dealId, data, { online = false, customer = null } = {}) {
  const d = draft.deals.find((x) => x.id === dealId);
  const a = actorOf(draft);
  const amount = Number(data.amount);
  if (!(amount > 0)) return { error: 'Enter the amount.' };
  const no = nextNo(draft, 'receipt', draft.settings.brand.documents.receiptPrefix, 6);
  const c = draft.customers.find((x) => x.id === d.customerId);
  const p = { id: `p${Date.now().toString(36)}`, no, dealId, customerId: data.kind === 'commission' ? null : d.customerId, payer: data.kind === 'commission' ? d.sellerName : c?.name, kind: data.kind, amount, method: data.method, ref: data.ref || '', at: new Date().toISOString(), receivedBy: online ? null : a?.id, online, void: null };
  draft.payments.unshift(p);
  audit(draft, 'payment.recorded', `Receipt ${no}: ${fmt(amount)} ${PAYMENT_KINDS[data.kind].label.toLowerCase()} for ${d.code}${online ? ' (paid online)' : ''}`, { subject: dsubj(d, draft), actor: customer ? { type: 'customer', id: customer.id, name: customer.name, role: null } : undefined, channel: online ? 'web' : 'admin' });
  if (p.customerId) notify(draft, { type: 'customer', id: p.customerId }, 'Payment received', `${fmt(amount)} · receipt ${no}`, '/account/deals');
  // Commission collected: release waiting commissions / bill the platform fee.
  if (data.kind === 'commission' && d.status === 'closed' && commissionCollected(draft, d.id) >= (d.computation?.gross || 0) - 0.01) {
    draft.commissions.filter((x) => x.dealId === d.id && x.status === 'pending').forEach((x) => { x.status = draft.settings.commission.payout.needsApproval ? 'for_approval' : 'approved'; });
    addFee(draft, d);
  }
  return { payment: p };
}

export function voidPayment(draft, id, reason) {
  if (draft.settings.deals.payments.voidReason && !reason?.trim()) return 'A reason is required to void a receipt.';
  const p = draft.payments.find((x) => x.id === id);
  const a = actorOf(draft);
  p.void = { at: new Date().toISOString(), by: a.id, reason };
  audit(draft, 'payment.voided', `Voided receipt ${p.no} (${fmt(p.amount)}): ${reason}`, { subject: { type: 'payment', id: p.id, label: p.no }, severity: 'warning' });
  if (draft.settings.security.alerts.bigDelete) draft.staff.filter((s) => s.role === 'owner' && s.id !== a.id).forEach((s) => notify(draft, { type: 'staff', id: s.id }, 'Receipt voided', `${a.name} voided ${p.no}: ${reason}`, '/admin/payments'));
  return null;
}

// ---------------------------------------------------------------- commissions
export function setCommission(draft, id, status) {
  const cm = draft.commissions.find((x) => x.id === id);
  const a = actorOf(draft);
  const from = cm.status;
  cm.status = status;
  if (status === 'approved') { cm.approvedBy = a.id; cm.approvedAt = new Date().toISOString(); }
  if (status === 'paid') { cm.paidBy = a.id; cm.paidAt = new Date().toISOString(); if (!cm.approvedBy) { cm.approvedBy = a.id; cm.approvedAt = cm.paidAt; } }
  const who = draft.staff.find((s) => s.id === cm.staffId)?.name;
  audit(draft, `commission.${status}`, `${status === 'paid' ? 'Paid' : 'Approved'} commission ${cm.no} for ${who}: ${fmt(cm.net)}`, { subject: { type: 'commission', id: cm.id, label: cm.no }, changes: [{ field: 'status', label: 'Status', from, to: status }] });
  if (status === 'paid') notify(draft, { type: 'staff', id: cm.staffId }, 'Commission paid', `${cm.no}: ${fmt(cm.net)}`, '/admin/commissions');
}

// ---------------------------------------------------------------- NuevaTech billing
export function generateStatement(draft, month) {
  const items = draft.fees.filter((f) => f.month === month && f.status === 'unbilled');
  if (!items.length) return { error: 'No unbilled fees for that month.' };
  draft.counters.statement += 1;
  const total = Math.round(items.reduce((a, f) => a + f.amount, 0) * 100) / 100;
  const st = { id: `st${Date.now().toString(36)}`, no: `SOA-${month}${draft.statements.some((s) => s.no === `SOA-${month}`) ? `-${draft.counters.statement}` : ''}`, period: month, feeIds: items.map((f) => f.id), total, issuedAt: new Date().toISOString(), dueAt: addDays(new Date(), draft.settings.platform.billing.dueDays).toISOString(), status: 'issued', payments: [], confirmedAt: null, confirmedBy: null, receiptNo: null };
  items.forEach((f) => { f.status = 'billed'; f.statementId = st.id; });
  draft.statements.push(st);
  audit(draft, 'billing.statement_issued', `Issued ${st.no} to Hope: ${fmt(total)} (${items.length} deal${items.length === 1 ? '' : 's'})`, { subject: { type: 'statement', id: st.id, label: st.no } });
  draft.staff.filter((s) => s.role === 'owner' || s.role === 'finance').forEach((s) => notify(draft, { type: 'staff', id: s.id }, 'NuevaTech statement issued', `${st.no}: ${fmt(total)} due ${new Date(st.dueAt).toLocaleDateString('en-PH')}`, '/admin/billing'));
  return { statement: st };
}

export function submitStatementPayment(draft, id, data) {
  const st = draft.statements.find((x) => x.id === id);
  const a = actorOf(draft);
  if (!(Number(data.amount) > 0)) return 'Enter the amount paid.';
  st.payments.push({ id: `sp${Date.now().toString(36)}`, amount: Number(data.amount), method: data.method, ref: data.ref, proof: data.proof || null, at: new Date().toISOString(), by: a.id, note: data.note || '' });
  st.status = 'submitted';
  audit(draft, 'billing.payment_submitted', `Submitted payment ${fmt(data.amount)} for ${st.no} (${data.method}${data.ref ? ` ${data.ref}` : ''})`, { subject: { type: 'statement', id: st.id, label: st.no } });
  draft.staff.filter((s) => s.role === 'super_admin').forEach((s) => notify(draft, { type: 'staff', id: s.id }, 'Payment submitted by Hope', `${st.no}: ${fmt(data.amount)}`, '/admin/billing'));
  return null;
}

export function confirmStatement(draft, id) {
  const st = draft.statements.find((x) => x.id === id);
  const a = actorOf(draft);
  st.status = 'paid'; st.confirmedAt = new Date().toISOString(); st.confirmedBy = a.id;
  st.receiptNo = nextNo(draft, 'ntReceipt', 'NT-OR', 5);
  draft.fees.filter((f) => f.statementId === st.id).forEach((f) => { f.status = 'paid'; });
  audit(draft, 'billing.payment_confirmed', `Confirmed payment for ${st.no}; receipt ${st.receiptNo}`, { subject: { type: 'statement', id: st.id, label: st.no } });
  draft.staff.filter((s) => s.role === 'owner' || s.role === 'finance').forEach((s) => notify(draft, { type: 'staff', id: s.id }, 'Payment confirmed by NuevaTech', `${st.no} · receipt ${st.receiptNo}`, '/admin/billing'));
}

export function rejectStatementPayment(draft, id, reason) {
  const st = draft.statements.find((x) => x.id === id);
  st.status = 'issued';
  audit(draft, 'billing.payment_returned', `Payment for ${st.no} was not confirmed: ${reason}`, { subject: { type: 'statement', id: st.id, label: st.no }, severity: 'warning' });
  draft.staff.filter((s) => s.role === 'owner').forEach((s) => notify(draft, { type: 'staff', id: s.id }, 'Payment not confirmed', `${st.no}: ${reason}`, '/admin/billing'));
}

export const statementStatus = (st) => (st.status === 'issued' && new Date(st.dueAt) < new Date() ? 'overdue' : st.status);

// ---------------------------------------------------------------- settings
export function saveSettingsGroup(draft, groupDef, values) {
  const before = draft.settings[groupDef.key];
  const changes = [];
  for (const s of groupDef.sections) {
    for (const f of s.fields) {
      const a = before[s.key][f.key]; const b = values[s.key][f.key];
      if (JSON.stringify(a) !== JSON.stringify(b)) {
        const show = (v) => (f.type === 'secret' ? '••••••' : f.type === 'image' ? (v ? 'image' : 'none') : f.type === 'toggle' ? (v ? 'On' : 'Off') : f.type === 'percent' ? `${v}%` : Array.isArray(v) ? v.join(', ') : String(v ?? '—').slice(0, 80));
        changes.push({ field: `${groupDef.key}.${s.key}.${f.key}`, label: `${s.label} → ${f.label}`, from: show(a), to: show(b) });
      }
    }
  }
  if (!changes.length) return 0;
  draft.settings[groupDef.key] = values;
  audit(draft, 'settings.updated', `Changed ${groupDef.label}: ${changes.map((c) => c.label.split(' → ')[1]).join(', ')}`, { subject: { type: 'settings', id: groupDef.key, label: groupDef.label }, changes, severity: ['security', 'platform', 'commission'].includes(groupDef.key) ? 'warning' : 'info' });
  return changes.length;
}
