import Link from 'next/link';
import { Star, Truck } from 'lucide-react';
import { requireStaff } from '@/lib/auth';
import { dateTime, lakh, qty } from '@/lib/format';
import { Empty, PageHeader, Section } from '@/components/ui/bits';
import { Item, Stagger, TiltCard } from '@/components/ui/motion';
import { ActionForm, SubmitButton } from '@/components/ui/action-form';
import { LiveRefresh } from '@/components/live-refresh';
import { createVendor, inspectDelivery, recordDelivery } from '../actions';

export const metadata = { title: 'Vendors' };

export default async function Vendors() {
  const { supabase, orgId } = await requireStaff();
  const [{ data: vendors }, { data: dels }, { data: mats }] = await Promise.all([
    supabase.from('vendors').select('*').eq('org_id', orgId).order('company_name'),
    supabase.from('deliveries').select('*, materials(name, unit)').eq('org_id', orgId).order('delivered_at', { ascending: false }),
    supabase.from('materials').select('id, name, unit').eq('org_id', orgId).order('name'),
  ]);
  const pending = (dels || []).filter((d) => d.status === 'pending_inspection');
  return (
    <>
      <LiveRefresh tables={['deliveries']} filter={`org_id=eq.${orgId}`} />
      <PageHeader eyebrow="Site" title="Vendors and deliveries" sub="A delivery adds stock only after the store inspects it. Rejected quantity is kept on record." />
      <Section title={`Waiting for inspection (${pending.length})`}>
        {pending.length === 0 ? <p className="text-[13.5px] text-ink-2">Nothing waiting. New deliveries from vendors show up here.</p> : (
          <div className="grid gap-3 md:grid-cols-2">
            {pending.map((d) => { const mat = d.materials as unknown as { name: string; unit: string }; const v = vendors?.find((x) => x.id === d.vendor_id); return (
              <div key={d.id} className="rounded-2xl border border-held/50 bg-[color-mix(in_srgb,var(--st-held)_7%,var(--surface))] p-4">
                <div className="flex items-start gap-3"><span className="grid size-10 shrink-0 place-items-center rounded-xl bg-held/20 text-warn"><Truck className="size-5" /></span>
                  <div className="min-w-0"><div className="font-semibold">{qty(d.quantity)} {mat.unit} {mat.name}</div>
                    <div className="text-[12.5px] text-ink-2">{v?.company_name} · vehicle <span className="num">{d.vehicle_number || '—'}</span> · invoice <span className="num">{d.invoice_number || '—'}</span></div>
                    <div className="text-[12px] text-ink-3">{d.location} · {dateTime(d.delivered_at)}</div></div></div>
                <ActionForm action={inspectDelivery} className="mt-3 flex flex-wrap items-end gap-2">
                  <input type="hidden" name="id" value={d.id} />
                  <div><label className="label" htmlFor={`a-${d.id}`}>Accepted</label><input id={`a-${d.id}`} name="accepted" className="input num !w-28" defaultValue={Number(d.quantity)} /></div>
                  <div className="min-w-[140px] flex-1"><label className="label" htmlFor={`n-${d.id}`}>Note</label><input id={`n-${d.id}`} name="note" className="input" placeholder="e.g. 10 bags torn" /></div>
                  <SubmitButton pendingText="Saving…">Accept into store</SubmitButton>
                </ActionForm>
              </div>
            ); })}
          </div>
        )}
      </Section>

      {(vendors || []).length === 0 ? <Empty title="No vendors yet" /> : (
        <Stagger className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {vendors!.map((v) => {
            const mine = (dels || []).filter((d) => d.vendor_id === v.id);
            const value = mine.reduce((a, d) => a + Number(d.accepted_qty ?? 0) * Number(d.unit_cost || 0), 0);
            const rej = mine.reduce((a, d) => a + (d.accepted_qty != null ? Number(d.quantity) - Number(d.accepted_qty) : 0), 0);
            const tot = mine.reduce((a, d) => a + Number(d.quantity), 0);
            return (
              <Item key={v.id}>
                <TiltCard className="h-full rounded-[18px]">
                  <Link href={`/console/vendors/${v.id}`} className="card card-lift grid h-full gap-3 p-5">
                    <div className="flex items-start justify-between gap-2"><div className="font-semibold">{v.company_name}</div>
                      {v.rating && <span className="inline-flex items-center gap-1 text-[12.5px]"><Star className="size-3.5 fill-held text-held" />{Number(v.rating).toFixed(1)}</span>}</div>
                    <div className="flex flex-wrap gap-1">{v.categories.map((c) => <span key={c} className="tag capitalize">{c}</span>)}</div>
                    <dl className="grid grid-cols-3 gap-2 text-[12px]">
                      <div><dt className="text-ink-3">Deliveries</dt><dd className="num text-[15px] font-semibold">{mine.length}</dd></div>
                      <div><dt className="text-ink-3">Supplied</dt><dd className="num text-[15px] font-semibold">{lakh(value)}</dd></div>
                      <div><dt className="text-ink-3">Rejected</dt><dd className={'num text-[15px] font-semibold ' + (tot && rej / tot > 0.02 ? 'text-bad' : '')}>{tot ? ((rej / tot) * 100).toFixed(1) : 0}%</dd></div>
                    </dl>
                  </Link>
                </TiltCard>
              </Item>
            );
          })}
        </Stagger>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <Section title="Log a delivery at the gate">
          <ActionForm action={recordDelivery} className="grid grid-cols-2 gap-3">
            <div><label className="label" htmlFor="dv">Vendor</label><select id="dv" name="vendor_id" className="input">{(vendors || []).map((v) => <option key={v.id} value={v.id}>{v.company_name}</option>)}</select></div>
            <div><label className="label" htmlFor="dm">Material</label><select id="dm" name="material_id" className="input">{(mats || []).map((m) => <option key={m.id} value={m.id}>{m.name} ({m.unit})</option>)}</select></div>
            <div><label className="label" htmlFor="dq">Quantity</label><input id="dq" name="quantity" className="input num" required /></div>
            <div><label className="label" htmlFor="dc">Unit cost (₹)</label><input id="dc" name="unit_cost" className="input num" /></div>
            <div><label className="label" htmlFor="dvh">Vehicle number</label><input id="dvh" name="vehicle_number" className="input num" placeholder="KA 01 AB 1234" /></div>
            <div><label className="label" htmlFor="di">Invoice number</label><input id="di" name="invoice_number" className="input num" /></div>
            <div className="col-span-2"><label className="label" htmlFor="dl">Delivered to</label><input id="dl" name="location" className="input" placeholder="Main store" /></div>
            <SubmitButton className="btn btn-primary col-span-2">Log delivery</SubmitButton>
          </ActionForm>
        </Section>
        <Section title="Add vendor">
          <ActionForm action={createVendor} className="grid grid-cols-2 gap-3">
            <div className="col-span-2"><label className="label" htmlFor="vn">Company name</label><input id="vn" name="company_name" className="input" required /></div>
            <div><label className="label" htmlFor="vc">Contact person</label><input id="vc" name="contact_person" className="input" /></div>
            <div><label className="label" htmlFor="vp">Phone</label><input id="vp" name="phone" className="input num" /></div>
            <div><label className="label" htmlFor="vg">GST</label><input id="vg" name="gst_number" className="input num" /></div>
            <div><label className="label" htmlFor="vk">Supplies</label><input id="vk" name="categories" className="input" placeholder="cement, steel" /></div>
            <SubmitButton className="btn btn-outline col-span-2">Add vendor</SubmitButton>
          </ActionForm>
        </Section>
      </div>
    </>
  );
}
