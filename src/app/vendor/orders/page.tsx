import { Check, ClipboardList, Truck, X } from 'lucide-react';
import { requirePartner } from '@/lib/auth';
import { date, inr, qty, todayIST } from '@/lib/format';
import { poNo } from '@/lib/numbering';
import { Empty, Pill, PageHeader } from '@/components/ui/bits';
import { ActionForm, SubmitButton } from '@/components/ui/action-form';
import { LiveRefresh } from '@/components/live-refresh';
import { dispatchPO, respondPO } from '../actions';

export const metadata = { title: 'Purchase orders' };
type Item = { name: string; unit: string; qty: number; rate: number };
const TABS = [['open', 'Open'], ['done', 'Delivered and closed'], ['all', 'All']] as const;

export default async function VendorOrders({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const { tab = 'open' } = await searchParams;
  const { supabase } = await requirePartner('vendor');
  const { data: vid } = await supabase.rpc('my_vendor_id');
  const { data: pos } = await supabase.from('purchase_orders').select('*, projects(name)').eq('vendor_id', vid!).order('created_at', { ascending: false });
  const list = (pos || []).filter((p) => tab === 'all' || (tab === 'open' ? ['issued', 'accepted', 'dispatched'].includes(p.status) : !['issued', 'accepted', 'dispatched'].includes(p.status)));
  const today = todayIST();
  return (
    <>
      <LiveRefresh tables={['purchase_orders']} every={30000} />
      <PageHeader emoji="📋" title="Purchase orders" sub={<>Accept each order with the date you will deliver by, mark it dispatched when the truck leaves, then log the delivery with the invoice.</>} />
      <div className="flex gap-1">{TABS.map(([k, l]) => <a key={k} href={`?tab=${k}`} className={'chip ' + (tab === k ? '!border-accent !bg-accent-soft' : '')} aria-current={tab === k ? 'page' : undefined}>{l}</a>)}</div>
      {list.length === 0 ? <Empty icon={<ClipboardList className="size-6" />} title="No orders here">New purchase orders from the developer appear here the moment they are issued.</Empty> : (
        <ul className="grid gap-4">
          {list.map((p) => { const items = (p.items as unknown as Item[]) || []; return (
            <li key={p.id} className="card grid gap-3 p-5">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div><div className="flex items-center gap-2"><b className="num text-[16px]">{poNo(p.seq, p.created_at)}</b><Pill status={p.status} /></div>
                  <div className="text-[12.5px] text-ink-2">{(p.projects as unknown as { name: string } | null)?.name} · to {p.delivery_location || 'site store'} · issued {date(p.created_at)}{p.required_by ? ` · needed by ${date(p.required_by)}` : ''}</div></div>
                <div className="text-right"><div className="num text-[20px] font-semibold">{inr(p.total)}</div><div className="num text-[11.5px] text-ink-3">{inr(p.subtotal)} + GST {Number(p.gst_pct)}%</div></div>
              </div>
              <div className="scroll-x"><table className="table text-[13px]"><thead><tr><th>Item</th><th className="text-right">Qty</th><th className="text-right">Rate</th><th className="text-right">Amount</th></tr></thead>
                <tbody>{items.map((i, k) => <tr key={k}><td>{i.name}</td><td className="num text-right">{qty(i.qty)} {i.unit}</td><td className="num text-right">{inr(i.rate)}</td><td className="num text-right">{inr(i.qty * i.rate)}</td></tr>)}</tbody></table></div>
              {p.terms && <p className="text-[12.5px] text-ink-2"><b>Terms:</b> {p.terms}</p>}
              {p.vendor_note && <p className="text-[12.5px] text-ink-2"><b>Your note:</b> {p.vendor_note}</p>}
              {p.status === 'issued' && (
                <ActionForm action={respondPO} className="flex flex-wrap items-end gap-2 rounded-xl bg-surface-2 p-3">
                  <input type="hidden" name="id" value={p.id} />
                  <div><label className="label" htmlFor={`pd-${p.id}`}>I will deliver by</label><input id={`pd-${p.id}`} type="date" name="promised_date" min={today} defaultValue={p.required_by ?? ''} className="input" /></div>
                  <div className="min-w-[180px] flex-1"><label className="label" htmlFor={`pn-${p.id}`}>Note to the site</label><input id={`pn-${p.id}`} name="note" className="input" placeholder="e.g. Loading from Hosur depot" /></div>
                  <SubmitButton className="btn btn-primary" name="accept" value="true"><Check className="size-4" />Accept</SubmitButton>
                  <SubmitButton className="btn btn-outline" name="accept" value="false"><X className="size-4" />Decline</SubmitButton>
                </ActionForm>
              )}
              {p.status === 'accepted' && (
                <ActionForm action={dispatchPO} className="flex flex-wrap items-end gap-2 rounded-xl bg-surface-2 p-3">
                  <input type="hidden" name="id" value={p.id} />
                  <div className="text-[13px] text-ink-2">Promised for <b className="text-ink">{date(p.promised_date)}</b></div>
                  <div><label className="label" htmlFor={`v-${p.id}`}>Vehicle number</label><input id={`v-${p.id}`} name="vehicle_number" className="input num uppercase" placeholder="KA 05 MN 4471" /></div>
                  <div className="min-w-[160px] flex-1"><label className="label" htmlFor={`dn-${p.id}`}>Driver / note</label><input id={`dn-${p.id}`} name="note" className="input" placeholder="Driver Manju, 98450 xxxxx" /></div>
                  <SubmitButton className="btn btn-primary"><Truck className="size-4" />Mark dispatched</SubmitButton>
                </ActionForm>
              )}
              {p.status === 'dispatched' && <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-surface-2 p-3 text-[13px]"><span>On the way{p.vehicle_number ? ` in ${p.vehicle_number}` : ''} since {date(p.dispatched_at)}.</span><a href={`/vendor/deliveries?po=${p.id}#new`} className="btn btn-primary btn-sm">Log the delivery</a></div>}
            </li>
          ); })}
        </ul>
      )}
    </>
  );
}
