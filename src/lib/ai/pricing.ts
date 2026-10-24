// Price suggestions from demand signals: views, compares, matches, enquiries, holds and how fast
// similar plots sold. Suggestions only — staff apply them with one click.

export type PlotRow = { id: string; plot_number: string; price: number | string; area_sqft: number | string; facing: string | null; is_corner: boolean; status: string; created_at: string };
export type EventRow = { plot_id: string; kind: string; created_at: string };
export type PriceRow = { plot_id: string; changed_at: string };

export type PriceSuggestion = {
  plotId: string; plotNumber: string; price: number; newPrice: number; changePct: number; demand: number; segmentDemand: number;
  signals: { views: number; enquiries: number; holds: number; compares: number }; reason: string; direction: 'up' | 'hold' | 'incentive';
};

const W: Record<string, number> = { view: 1, compare: 2, match: 2, enquiry: 6, hold: 8 };
const seg = (p: PlotRow) => `${Number(p.area_sqft)}`;

export function priceSuggestions(plots: PlotRow[], events: EventRow[], prices: PriceRow[], now = Date.now()): PriceSuggestion[] {
  const since = now - 30 * 86400000;
  const recent = events.filter((e) => new Date(e.created_at).getTime() >= since);
  const demand = new Map<string, number>(), sig = new Map<string, PriceSuggestion['signals']>();
  for (const e of recent) {
    demand.set(e.plot_id, (demand.get(e.plot_id) || 0) + (W[e.kind] || 0));
    const s = sig.get(e.plot_id) || { views: 0, enquiries: 0, holds: 0, compares: 0 };
    if (e.kind === 'view') s.views++; else if (e.kind === 'enquiry') s.enquiries++; else if (e.kind === 'hold') s.holds++; else s.compares++;
    sig.set(e.plot_id, s);
  }
  const avail = plots.filter((p) => p.status === 'available');
  const segments = new Map<string, PlotRow[]>();
  for (const p of plots) segments.set(seg(p), [...(segments.get(seg(p)) || []), p]);
  const out: PriceSuggestion[] = [];
  for (const p of avail) {
    const peers = (segments.get(seg(p)) || []).filter((x) => x.status === 'available');
    const segDemand = peers.reduce((a, x) => a + (demand.get(x.id) || 0), 0) / Math.max(1, peers.length);
    const d = demand.get(p.id) || 0;
    const segSold = (segments.get(seg(p)) || []).filter((x) => x.status === 'booked' || x.status === 'sold').length / Math.max(1, (segments.get(seg(p)) || []).length);
    const lastChange = prices.filter((x) => x.plot_id === p.id).map((x) => new Date(x.changed_at).getTime()).sort().at(-1) ?? new Date(p.created_at).getTime();
    const daysSinceChange = (now - lastChange) / 86400000;
    const price = Number(p.price);
    const s = sig.get(p.id) || { views: 0, enquiries: 0, holds: 0, compares: 0 };
    let changePct = 0, direction: PriceSuggestion['direction'] = 'hold', reason = '';
    if (d >= Math.max(30, segDemand * 1.6) && (s.enquiries + s.holds) >= 2) {
      changePct = segSold >= 0.4 ? 4 : 3; direction = 'up';
      reason = `${s.views} views, ${s.enquiries} enquir${s.enquiries === 1 ? 'y' : 'ies'} and ${s.holds} hold${s.holds === 1 ? '' : 's'} in 30 days, ${(d / Math.max(1, segDemand)).toFixed(1)}× the interest in similar ${Number(p.area_sqft)} sq ft plots${segSold >= 0.4 ? `, and ${Math.round(segSold * 100)}% of that size is already sold` : ''}.`;
    } else if (d <= segDemand * 0.45 && daysSinceChange > 20) {
      direction = 'incentive';
      reason = `Little interest (${s.views} views, no enquiries) compared with similar plots. Instead of cutting the list price, try a time-bound offer (e.g. free registration support) and feature it in the matchmaker.`;
    } else continue;
    const newPrice = Math.round((price * (1 + changePct / 100)) / 1000) * 1000;
    out.push({ plotId: p.id, plotNumber: p.plot_number, price, newPrice, changePct, demand: d, segmentDemand: Math.round(segDemand), signals: s, reason, direction });
  }
  return out.sort((a, b) => (a.direction === b.direction ? b.demand - a.demand : a.direction === 'up' ? -1 : 1));
}
