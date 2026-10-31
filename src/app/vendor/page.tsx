import Link from 'next/link';
import { AlertTriangle, ArrowRight, BadgeCheck, CalendarClock, ClipboardList, Truck } from 'lucide-react';
import { requirePartner } from '@/lib/auth';
import { date, inr, lakh, qty } from '@/lib/format';
import { poNo } from '@/lib/numbering';
import { Pill, Section } from '@/components/ui/bits';
import { LiveRefresh } from '@/components/live-refresh';
import { companyCompleteness } from '@/components/portal/company-profile';

type Item = { name: string; unit: string; qty: number; rate: number };

export default async function VendorHome() {
  const { supabase } = await requirePartner('vendor');
  const { data: vid } = await supabase.rpc('my_vendor_id');
  const [{ data: v }, { data: pos }, { data: dels }, { count: items }] = await Promise.all([
    supabase.from('vendors').select('*').eq('id', vid!).single(),
    supabase.from('purchase_orders').select('*').eq('vendor_id', vid!).order('created_at', { ascending: false }),
    supabase.from('deliveries').select('id, quantity, accepted_qty, unit_cost, status, delivered_at, invoice_number, paid_at, materials(name, unit)').eq('vendor_id', vid!).order('delivered_at', { ascending: false }),
    supabase.from('vendor_catalog').select('id', { count: 'exact', head: true }).eq('vendor_id', vid!),
  ]);
  const open = (pos || []).filter((p) => ['issued', 'accepted', 'dispatched'].includes(p.status));
  const toAnswer = (pos || []).filter((p) => p.status === 'issued');
  const upcoming = (pos || []).filter((p) => p.status === 'accepted' || p.status === 'dispatched').sort((a, b) => String(a.promised_date).localeCompare(String(b.promised_date)));
  const value = (d: { accepted_qty: number | null; quantity: number; unit_cost: number | null }) => Number(d.accepted_qty ?? 0) * Number(d.unit_cost ?? 0);
  const unpaid = (dels || []).filter((d) => !d.paid_at && (d.status === 'accepted' || d.status === 'partially_accepted'));
  const paid = (dels || []).filter((d) => d.paid_at);
  const inspected = (dels || []).filter((d) => d.status !== 'pending_inspection');
  const quality = inspected.length ? inspected.reduce((a, d) => a + Number(d.accepted_qty ?? 0), 0) / inspected.reduce((a, d) => a + Number(d.quantity), 0) : null;
  const comp = companyCompleteness(v!, 'vendor');
  const overdue = upcoming.filter((p) => p.promised_date && p.promised_date < new Date().toISOString().slice(0, 10));
  return (
    <>
      <LiveRefresh tables={['purchase_orders', 'deliveries', 'letters']} every={30000} />
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div><div className="eyebrow">Dashboard</div><h1 className="text-[26px] font-bold">{v?.company_name}</h1>
          <p className="text-[13.5px] text-ink-2">{open.length} open orders worth {lakh(open.reduce((a, p) => a + Number(p.total), 0))} · {items ?? 0} items on your price list</p></div>
        <div className="flex flex-wrap gap-2"><Link href="/vendor/deliveries#new" className="btn btn-primary"><Truck className="size-4" />Log a delivery</Link><Link href="/vendor/catalog" className="btn btn-outline">Update prices</Link></div>
      </div>

      {(toAnswer.length > 0 || overdue.length > 0 || comp.pct < 100) && (
        <div className="grid gap-2">
          {toAnswer.map((p) => <Link key={p.id} href="/vendor/orders" className="flex items-center gap-2 rounded-xl border border-[color-mix(in_srgb,var(--warn)_40%,transparent)] bg-[color-mix(in_srgb,var(--warn)_8%,transparent)] px-3 py-2.5 text-[13.5px]"><ClipboardList className="size-4 text-warn" /><span className="flex-1"><b>New order {poNo(p.seq, p.created_at)}</b> for {inr(p.total)}{p.required_by ? `, needed by ${date(p.required_by)}` : ''}. Accept it with a delivery date.</span><ArrowRight className="size-4" /></Link>)}
          {overdue.map((p) => <div key={p.id} className="flex items-center gap-2 rounded-xl bg-[color-mix(in_srgb,var(--bad)_8%,transparent)] px-3 py-2.5 text-[13.5px] text-bad"><AlertTriangle className="size-4" />{poNo(p.seq, p.created_at)} was promised for {date(p.promised_date)}. Update the site on its status.</div>)}
          {comp.pct < 100 && <Link href="/vendor/profile" className="flex items-center gap-2 rounded-xl bg-surface-2 px-3 py-2.5 text-[13.5px]"><BadgeCheck className="size-4 text-accent" /><span className="flex-1">Company profile {comp.pct}% complete. Add bank and GST details to get paid without delays.</span><ArrowRight className="size-4" /></Link>}
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="card p-4"><div className="eyebrow">Open orders</div><div className="num text-[24px] font-semibold">{open.length}</div><div className="text-[12.5px] text-ink-2">{toAnswer.length} waiting for your reply</div></div>
        <div className="card p-4"><div className="eyebrow">Waiting for payment</div><div className="num text-[24px] font-semibold">{lakh(unpaid.reduce((a, d) => a + value(d), 0))}</div><div className="text-[12.5px] text-ink-2">{unpaid.length} accepted deliveries</div></div>
        <div className="card p-4"><div className="eyebrow">Paid so far</div><div className="num text-[24px] font-semibold">{lakh(paid.reduce((a, d) => a + value(d), 0))}</div><div className="text-[12.5px] text-ink-2">{paid.length} invoices</div></div>
        <div className="card p-4"><div className="eyebrow">Accepted at inspection</div><div className="num text-[24px] font-semibold">{quality == null ? '—' : `${Math.round(quality * 1000) / 10}%`}</div><div className="text-[12.5px] text-ink-2">of everything delivered</div></div>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Section title="Coming up" action={<Link href="/vendor/orders" className="text-[13px] font-semibold text-accent">All orders</Link>}>
          {upcoming.length === 0 ? <p className="text-[13.5px] text-ink-2">No deliveries due.</p> : (
            <ul className="divide-y divide-line">
              {upcoming.map((p) => (
                <li key={p.id} className="flex items-start gap-3 py-2.5 text-[13.5px]"><CalendarClock className="mt-0.5 size-4 shrink-0 text-accent" />
                  <div className="flex-1"><b className="num">{poNo(p.seq, p.created_at)}</b> · {((p.items as unknown as Item[]) || []).map((i) => `${qty(i.qty)} ${i.unit} ${i.name}`).join(', ')}
                    <div className="text-[12px] text-ink-3">To {p.delivery_location || 'site store'} · promised {date(p.promised_date)}</div></div>
                  <Pill status={p.status} /></li>
              ))}
            </ul>
          )}
        </Section>
        <Section title="Recent deliveries" action={<Link href="/vendor/deliveries" className="text-[13px] font-semibold text-accent">All deliveries</Link>}>
          <ul className="divide-y divide-line">
            {(dels || []).slice(0, 6).map((d) => { const m = d.materials as unknown as { name: string; unit: string }; return (
              <li key={d.id} className="flex items-center justify-between gap-3 py-2.5 text-[13.5px]">
                <div><div className="font-medium">{qty(d.quantity)} {m?.unit} {m?.name}</div><div className="text-[12px] text-ink-3">{date(d.delivered_at)} · {d.invoice_number || 'no invoice no.'}{d.accepted_qty != null ? ` · accepted ${qty(d.accepted_qty)}` : ''}</div></div>
                {d.paid_at ? <Pill status="paid" tone="good" label="Paid" /> : <Pill status={d.status} />}
              </li>
            ); })}
            {(dels || []).length === 0 && <li className="py-3 text-ink-2">No deliveries yet.</li>}
          </ul>
        </Section>
      </div>
    </>
  );
}
