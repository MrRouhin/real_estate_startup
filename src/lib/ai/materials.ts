// Store forecasting: how long each material lasts at the current issue rate, what to reorder,
// how much, and from whom. Pure functions over the stock ledger.

export type StockRow = { material_id: string | null; name: string | null; unit: string | null; category: string | null; in_store: number | string | null; reorder_level: number | string | null; unit_cost: number | string | null };
export type MoveRow = { material_id: string; type: string; quantity: number | string; created_at: string };
export type OpenRequest = { material_id: string; quantity: number | string; status: string };
export type VendorRow = { id: string; company_name: string; phone: string | null; categories: string[] | null; rating: number | string | null };

export type StockForecast = {
  materialId: string; name: string; unit: string; inStore: number; dailyUse: number; daysLeft: number | null;
  openDemand: number; reorderLevel: number; status: 'ok' | 'reorder' | 'short';
  orderQty: number; orderValue: number; vendor: { id: string; name: string; phone: string | null } | null; runOutOn: string | null;
};

const LEAD_DAYS = 7;
const round = (q: number, unit: string) => {
  if (['bags', 'nos', 'm'].includes(unit)) { const step = q > 200 ? 50 : 10; return Math.ceil(q / step) * step; }
  return Math.ceil(q * 2) / 2;
};

export function forecastStock(stock: StockRow[], moves: MoveRow[], requests: OpenRequest[], vendors: VendorRow[], today = new Date()): StockForecast[] {
  const since = today.getTime() - 30 * 86400000;
  return stock.filter((s) => s.material_id).map((s) => {
    const id = s.material_id!, unit = s.unit || '';
    const issued30 = moves.filter((m) => m.material_id === id && m.type === 'issued' && new Date(m.created_at).getTime() >= since).reduce((a, m) => a + Number(m.quantity), 0);
    const dailyUse = issued30 / 30;
    const inStore = Number(s.in_store || 0);
    const openDemand = requests.filter((r) => r.material_id === id && (r.status === 'requested' || r.status === 'approved')).reduce((a, r) => a + Number(r.quantity), 0);
    const daysLeft = dailyUse > 0 ? Math.floor(Math.max(0, inStore - openDemand) / dailyUse) : null;
    const reorderLevel = Number(s.reorder_level || 0);
    const short = openDemand > inStore;
    const reorder = short || inStore <= reorderLevel || (daysLeft != null && daysLeft <= LEAD_DAYS + 3);
    const need = dailyUse * 30 + openDemand + reorderLevel - inStore;
    const orderQty = reorder ? round(Math.max(need, reorderLevel || dailyUse * 14 || 1), unit) : 0;
    const v = vendors.filter((x) => (x.categories || []).includes(s.category || '')).sort((a, b) => Number(b.rating || 0) - Number(a.rating || 0))[0];
    return {
      materialId: id, name: s.name || 'Material', unit, inStore, dailyUse: Math.round(dailyUse * 100) / 100, daysLeft, openDemand, reorderLevel,
      status: short ? 'short' : reorder ? 'reorder' : 'ok', orderQty, orderValue: Math.round(orderQty * Number(s.unit_cost || 0)),
      vendor: v ? { id: v.id, name: v.company_name, phone: v.phone } : null,
      runOutOn: daysLeft != null ? new Date(today.getTime() + daysLeft * 86400000).toISOString().slice(0, 10) : null,
    } satisfies StockForecast;
  }).sort((a, b) => (a.status === b.status ? (a.daysLeft ?? 999) - (b.daysLeft ?? 999) : a.status === 'short' ? -1 : b.status === 'short' ? 1 : a.status === 'reorder' ? -1 : 1));
}

/** A ready-to-send purchase message for WhatsApp or email. */
export function orderMessage(f: StockForecast, projectName: string, org: string) {
  return `Hello ${f.vendor?.name || ''},\n\nPlease quote and supply ${f.orderQty} ${f.unit} of ${f.name} for ${projectName}.`
    + ` We need it at site within ${LEAD_DAYS} days${f.runOutOn ? ` (current stock lasts until about ${new Date(f.runOutOn).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })})` : ''}.`
    + `\n\nPlease share the invoice with vehicle number at dispatch.\n\nThanks,\n${org}`;
}
