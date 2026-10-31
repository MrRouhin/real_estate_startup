import { requirePartner } from '@/lib/auth';
import { dateTime, inr, qty } from '@/lib/format';
import { poNo } from '@/lib/numbering';
import { Pill, Section, PageHeader } from '@/components/ui/bits';
import { ActionForm, SubmitButton } from '@/components/ui/action-form';
import { LiveRefresh } from '@/components/live-refresh';
import { recordDelivery } from '../actions';

export const metadata = { title: 'Deliveries' };
type Item = { material_id?: string; name: string; unit: string; qty: number; rate: number };

export default async function VendorDeliveries({ searchParams }: { searchParams: Promise<{ po?: string }> }) {
  const { po } = await searchParams;
  const { supabase } = await requirePartner('vendor');
  const { data: vid } = await supabase.rpc('my_vendor_id');
  const [{ data: dels }, { data: mats }, { data: pos }] = await Promise.all([
    supabase.from('deliveries').select('*, materials(name, unit)').eq('vendor_id', vid!).order('delivered_at', { ascending: false }).limit(40),
    supabase.from('materials').select('id, name, unit').order('name'),
    supabase.from('purchase_orders').select('id, seq, created_at, items, delivery_location, status').eq('vendor_id', vid!).in('status', ['accepted', 'dispatched']),
  ]);
  const chosen = (pos || []).find((p) => p.id === po) ?? null;
  const first = chosen ? ((chosen.items as unknown as Item[]) || [])[0] : null;
  return (
    <>
      <LiveRefresh tables={['deliveries']} every={30000} />
      <PageHeader emoji="🚚" title="Deliveries" sub={<>Log each truck when it reaches the site. The store inspects it and you see the accepted quantity here.</>} />
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_400px]">
        <Section title="My deliveries">
          <ul className="divide-y divide-line">
            {(dels || []).map((d) => { const m = d.materials as unknown as { name: string; unit: string }; return (
              <li key={d.id} className="flex items-start justify-between gap-3 py-3 text-[13.5px]">
                <div><div className="font-medium">{qty(d.quantity)} {m.unit} {m.name}</div>
                  <div className="text-[12px] text-ink-3">{dateTime(d.delivered_at)} · {d.invoice_number || 'no invoice no.'}{d.vehicle_number ? ` · ${d.vehicle_number}` : ''}{d.location ? ` · ${d.location}` : ''}</div>
                  {d.accepted_qty != null && <div className="text-[12.5px] text-ink-2">Accepted {qty(d.accepted_qty)} {m.unit}{d.unit_cost ? ` · ${inr(Number(d.accepted_qty) * Number(d.unit_cost))}` : ''}{d.inspection_note ? ` · “${d.inspection_note}”` : ''}</div>}</div>
                {d.paid_at ? <Pill status="paid" tone="good" label="Paid" /> : <Pill status={d.status} />}
              </li>
            ); })}
            {(dels || []).length === 0 && <li className="py-3 text-ink-2">No deliveries yet.</li>}
          </ul>
        </Section>
        <Section title="Log a delivery">
          <div id="new" className="scroll-mt-24" />
          <ActionForm action={recordDelivery} className="grid grid-cols-2 gap-3">
            <div className="col-span-2"><label className="label" htmlFor="dpo">Against order</label>
              <select id="dpo" name="po_id" className="input" defaultValue={chosen?.id ?? ''}><option value="">No order (direct supply)</option>{(pos || []).map((p) => <option key={p.id} value={p.id}>{poNo(p.seq, p.created_at)} · {((p.items as unknown as Item[]) || []).map((i) => i.name).join(', ')}</option>)}</select></div>
            <div className="col-span-2"><label className="label" htmlFor="m">Material</label><select id="m" name="material_id" className="input" defaultValue={first?.material_id ?? undefined}>{(mats || []).map((m) => <option key={m.id} value={m.id}>{m.name} ({m.unit})</option>)}</select></div>
            <div><label className="label" htmlFor="q">Quantity</label><input id="q" name="quantity" className="input num" inputMode="decimal" required defaultValue={first?.qty ?? ''} /></div>
            <div><label className="label" htmlFor="uc">Rate (₹ per unit)</label><input id="uc" name="unit_cost" className="input num" inputMode="decimal" defaultValue={first?.rate ?? ''} /></div>
            <div><label className="label" htmlFor="vh">Vehicle number</label><input id="vh" name="vehicle_number" className="input num uppercase" placeholder="KA 01 AB 1234" /></div>
            <div><label className="label" htmlFor="inv">Invoice number</label><input id="inv" name="invoice_number" className="input num" placeholder="INV-10234" /></div>
            <div className="col-span-2"><label className="label" htmlFor="loc">Delivered to</label><input id="loc" name="location" className="input" placeholder={chosen?.delivery_location || 'Tower A store'} /></div>
            <div><label className="label" htmlFor="vinv">Invoice photo</label><input id="vinv" type="file" name="invoice" accept="image/*,application/pdf" capture="environment" className="input" /></div>
            <div><label className="label" htmlFor="vtruck">Load photo</label><input id="vtruck" type="file" name="photo" accept="image/*" capture="environment" className="input" /></div>
            <p className="col-span-2 text-[12px] text-ink-3">A clear photo of the full invoice lets the store check it automatically and pay you sooner.</p>
            <SubmitButton className="btn btn-primary btn-lg col-span-2" pendingText="Uploading…">Submit delivery</SubmitButton>
          </ActionForm>
        </Section>
      </div>
    </>
  );
}
