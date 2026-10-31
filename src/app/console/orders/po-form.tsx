'use client';
import { useState } from 'react';
import { Plus, Send, Trash2 } from 'lucide-react';
import { ActionForm, SubmitButton } from '@/components/ui/action-form';
import { inr } from '@/lib/format';
import { createPurchaseOrder } from '../ops-actions';

type Row = { material: string; name: string; unit: string; qty: string; rate: string };
type Cat = { vendor: string; material: string | null; name: string; unit: string; rate: number; inStock: boolean; lead: number | null };

export function PoForm({ vendors, materials, catalog, requests }: { vendors: { id: string; label: string }[]; materials: { id: string; name: string; unit: string; rate: number }[]; catalog: Cat[]; requests: { id: string; label: string; material: string; qty: number }[] }) {
  const [vendor, setVendor] = useState(vendors[0]?.id ?? '');
  const [rows, setRows] = useState<Row[]>([{ material: '', name: '', unit: '', qty: '', rate: '' }]);
  const set = (i: number, patch: Partial<Row>) => setRows((r) => r.map((x, k) => (k === i ? { ...x, ...patch } : x)));
  const priceFor = (materialId: string) => catalog.filter((c) => c.vendor === vendor && c.material === materialId).sort((a, b) => a.rate - b.rate)[0];
  const best = (materialId: string) => catalog.filter((c) => c.material === materialId && c.inStock).sort((a, b) => a.rate - b.rate)[0];
  const pickMaterial = (i: number, id: string) => { const m = materials.find((x) => x.id === id); const c = priceFor(id); set(i, { material: id, name: c?.name ?? m?.name ?? '', unit: c?.unit ?? m?.unit ?? '', rate: String(c?.rate ?? m?.rate ?? '') }); };
  const subtotal = rows.reduce((a, r) => a + (Number(r.qty) || 0) * (Number(r.rate) || 0), 0);
  const vendorItems = catalog.filter((c) => c.vendor === vendor);
  return (
    <ActionForm action={createPurchaseOrder} onDone={() => setRows([{ material: '', name: '', unit: '', qty: '', rate: '' }])} className="card grid content-start gap-4 p-5">
      <h2 className="text-[16px] font-bold">New purchase order</h2>
      <div className="grid gap-3 sm:grid-cols-2">
        <div><label className="label" htmlFor="pv">Supplier</label><select id="pv" name="vendor_id" className="input" value={vendor} onChange={(e) => setVendor(e.target.value)}>{vendors.map((v) => <option key={v.id} value={v.id}>{v.label}</option>)}</select>
          <p className="mt-1 text-[11.5px] text-ink-3">{vendorItems.length ? `${vendorItems.length} items on their price list` : 'No price list yet'}</p></div>
        <div><label className="label" htmlFor="pmr">For store request (optional)</label><select id="pmr" name="material_request_id" className="input" onChange={(e) => { const r = requests.find((x) => x.id === e.target.value); if (r) { pickMaterial(0, r.material); set(0, { qty: String(r.qty) }); } }}><option value="">—</option>{requests.map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}</select></div>
      </div>
      <div className="grid gap-2">
        {rows.map((r, i) => { const b = r.material ? best(r.material) : null; const mine = r.material ? priceFor(r.material) : null; return (
          <div key={i} className="grid grid-cols-[1fr_76px_90px_32px] gap-2 rounded-2xl bg-[var(--glass)] p-2 sm:grid-cols-[1.4fr_1fr_76px_90px_32px]">
            <select aria-label="Material" className="input !py-1.5 text-[13px]" value={r.material} onChange={(e) => pickMaterial(i, e.target.value)} name="item_material">
              <option value="">Material…</option>{materials.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}</select>
            <input aria-label="Item name" name="item_name" className="input hidden !py-1.5 text-[13px] sm:block" value={r.name} onChange={(e) => set(i, { name: e.target.value })} placeholder="Description" />
            <input aria-label="Quantity" name="item_qty" className="input num !py-1.5 text-[13px]" value={r.qty} onChange={(e) => set(i, { qty: e.target.value })} placeholder={`Qty${r.unit ? ` (${r.unit})` : ''}`} inputMode="decimal" />
            <input aria-label="Rate" name="item_rate" className="input num !py-1.5 text-[13px]" value={r.rate} onChange={(e) => set(i, { rate: e.target.value })} placeholder="Rate" inputMode="decimal" />
            <input type="hidden" name="item_unit" value={r.unit} />
            <button type="button" className="btn btn-ghost btn-sm !px-1.5" onClick={() => setRows((x) => x.filter((_, k) => k !== i))} disabled={rows.length === 1} aria-label="Remove item"><Trash2 className="size-4" /></button>
            {b && (!mine || b.rate < mine.rate) && <p className="col-span-full text-[11.5px] text-warn">Lowest listed rate is {inr(b.rate)}/{b.unit} from another supplier{b.lead != null ? `, ${b.lead}-day lead` : ''}.</p>}
          </div>
        ); })}
        <button type="button" className="btn btn-ghost btn-sm w-fit" onClick={() => setRows((r) => [...r, { material: '', name: '', unit: '', qty: '', rate: '' }])}><Plus className="size-4" />Add item</button>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <div><label className="label" htmlFor="prb">Needed by</label><input id="prb" type="date" name="required_by" className="input" /></div>
        <div><label className="label" htmlFor="ploc">Deliver to</label><input id="ploc" name="delivery_location" className="input" placeholder="Tower A store" /></div>
        <div><label className="label" htmlFor="pgst">GST %</label><select id="pgst" name="gst_pct" className="input" defaultValue="18"><option>18</option><option>28</option><option>12</option><option>5</option><option>0</option></select></div>
        <div className="sm:col-span-3"><label className="label" htmlFor="pterm">Terms</label><input id="pterm" name="terms" className="input" defaultValue="Payment 30 days from accepted delivery. Test certificate with each lot." /></div>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[var(--glass-line)] pt-3"><span className="text-[13px] text-ink-2">Before GST <b className="num text-ink">{inr(subtotal)}</b></span>
        <SubmitButton className="btn btn-primary" pendingText="Sending…"><Send className="size-4" />Send to supplier</SubmitButton></div>
    </ActionForm>
  );
}
