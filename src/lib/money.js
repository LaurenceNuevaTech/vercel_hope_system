// How a deal's money is computed. Used by Deals, the commission calculator,
// the flowcharts and the documentation, so the numbers always agree.
//
//   1. Hope's commission (paid by the seller / owner)
//        sale:            price × rate (property 5%, vehicle 3%)
//        property rent:   monthly rent × N months (1)
//        vehicle rental:  total rental × rate (10%)
//   2. Split of that commission
//        agent share      = commission × agent % (60%, or the agent's own share)
//        manager override = commission × manager % (5%) when the agent has a Manager
//        Hope's share     = commission − agent − manager
//   3. NuevaTech platform fee (paid by Hope out of its share), set by the Owner:
//        per-deal override → first matching fee rule (category + sale / rent) → default
//        each: percent of Hope's commission | percent of the deal price | fixed per deal
//   4. Hope net = Hope's share − platform fee
//   5. Withholding tax on agent / manager payouts (optional)

import { round2 } from './format.js';

export function dealValue(deal) {
  if (deal.type === 'sale') return Number(deal.price) || 0;
  if (deal.unit === 'day') return (Number(deal.price) || 0) * (Number(deal.days) || 1);
  return (Number(deal.price) || 0) * (Number(deal.leaseMonths) || 12);
}

/** Which NuevaTech fee applies to a deal: { method, rate, fixed, source } */
export function feeFor(deal, settings) {
  const f = settings.platform.fee;
  if (f.enabled === false) return { method: 'none', rate: 0, fixed: 0, source: 'NuevaTech fee switched off' };
  if (deal.feeOverride) return { ...deal.feeOverride, source: 'set for this deal' };
  const rule = (settings.platform.rules || []).find((r) => r.active && (!r.categories?.length || r.categories.includes(deal.category)) && (r.purpose === 'any' || r.purpose === deal.type));
  if (rule) return { method: rule.method, rate: Number(rule.rate), fixed: Number(rule.fixed), source: `rule "${rule.label}"` };
  return { method: f.method, rate: Number(f.ratePct), fixed: Number(deal.type === 'sale' ? f.fixedSale : f.fixedRent), source: 'default' };
}

/**
 * deal: { type: 'sale'|'rent', group: 'property'|'vehicle', category, price, unit, leaseMonths, days, rateOverride, feeOverride, agentId }
 * settings: state.settings     agent: staff record (own share)     hasManager: boolean
 */
export function computeDeal(deal, settings, { agent, hasManager } = {}) {
  const c = settings.commission;
  const value = dealValue(deal);
  const price = Number(deal.price) || 0;
  let gross; let basis; let rate = null;

  if (deal.type === 'sale') {
    rate = deal.rateOverride ?? (deal.group === 'vehicle' ? c.rates.saleVehiclePct : c.rates.salePropertyPct);
    gross = (price * rate) / 100;
    basis = `${rate}% of the selling price`;
  } else if (deal.group === 'property' && deal.unit !== 'day') {
    const months = deal.rateOverride ?? c.rates.rentPropertyMonths;
    gross = price * months;
    basis = `${months} month(s) of rent`;
    rate = months;
  } else {
    rate = deal.rateOverride ?? c.rates.rentVehiclePct;
    gross = (value * rate) / 100;
    basis = `${rate}% of the total rental`;
  }
  gross = round2(gross);

  const agentPct = c.splits.perAgentShare && agent?.sharePct != null && agent.sharePct !== '' ? Number(agent.sharePct) : Number(c.splits.agentPct);
  const managerPct = c.splits.managerOn && hasManager ? Number(c.splits.managerPct) : 0;
  const agentShare = round2((gross * agentPct) / 100);
  const managerShare = round2((gross * managerPct) / 100);
  const hopeShare = round2(gross - agentShare - managerShare);

  const fee = feeFor(deal, settings);
  let platformFee; let platformBasis;
  if (fee.method === 'none') { platformFee = 0; platformBasis = 'no fee (switched off)'; }
  else if (fee.method === 'price') { platformFee = (value * fee.rate) / 100; platformBasis = `${fee.rate}% of the deal price`; }
  else if (fee.method === 'fixed') { platformFee = fee.fixed; platformBasis = 'fixed fee'; }
  else { platformFee = (gross * fee.rate) / 100; platformBasis = `${fee.rate}% of Hope's commission`; }
  platformBasis += fee.source === 'default' ? '' : ` · ${fee.source}`;
  platformFee = round2(platformFee);

  const wht = c.payout.withholdingOn ? Number(c.payout.withholdingPct) : 0;
  return {
    value, gross, basis, rate,
    agentPct, agentShare, agentWht: round2((agentShare * wht) / 100), agentNet: round2(agentShare - (agentShare * wht) / 100),
    managerPct, managerShare, managerWht: round2((managerShare * wht) / 100), managerNet: round2(managerShare - (managerShare * wht) / 100),
    hopeShare, platformMethod: fee.method, platformRate: fee.method === 'fixed' ? null : fee.rate, platformSource: fee.source, platformFee, platformBasis,
    hopeNet: round2(hopeShare - platformFee),
    whtPct: wht,
    computedAt: new Date().toISOString(),
  };
}
