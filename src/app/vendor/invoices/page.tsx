import { requirePartner } from '@/lib/auth';
import { date, inr, qty } from '@/lib/format';
import { Pill, PageHeader } from '@/components/ui/bits';
import { LiveRefresh } from '@/components/live-refresh';

export const metadata = { title: 'Payments' };

export default async function VendorInvoices() {
  const { supabase } = await requirePartner('vendor');
  const { data: vid } = await supabase.rpc('my_vendor_id');
  const { data: dels } = await supabase.from('deliveries').select('*, materials(name, unit)').eq('vendor_id', vid!).neq('status', 'rejected').order('delivered_at', { ascending: false });
  const val = (d: { accepted_qty: number | null; quantity: number; unit_cost: number | null; status: string }) => Number(d.status === 'pending_inspection' ? d.quantity : d.accepted_qty ?? 0) * Number(d.unit_cost ?? 0);
  const groups = {
    inspection: (dels || []).filter((d) => d.status === 'pending_inspection'),
    due: (dels || []).filter((d) => d.status !== 'pending_inspection' && !d.paid_at),
    paid: (dels || []).filter((d) => d.paid_at),
  };
  const due30 = groups.due.filter((d) => Date.now() - new Date(d.inspected_at ?? d.delivered_at).getTime() > 30 * 86400000);
  return (
    <>
      <LiveRefresh tables={['deliveries']} every={30000} />
      <PageHeader emoji="💳" title="Invoices and payments" sub={<>Payment is due 30 days after the store accepts a delivery. Each payment shows its bank reference.</>} />
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="card p-4"><div className="eyebrow">Being inspected</div><div className="num text-[24px] font-semibold">{inr(groups.inspection.reduce((a, d) => a + val(d), 0))}</div><div className="text-[12.5px] text-ink-2">{groups.inspection.length} deliveries</div></div>
        <div className="card p-4"><div className="eyebrow">Accepted, to be paid</div><div className="num text-[24px] font-semibold">{inr(groups.due.reduce((a, d) => a + val(d), 0))}</div><div className="text-[12.5px] text-ink-2">{due30.length ? <span className="text-bad">{due30.length} past 30 days</span> : 'none overdue'}</div></div>
        <div className="card p-4"><div className="eyebrow">Paid</div><div className="num text-[24px] font-semibold">{inr(groups.paid.reduce((a, d) => a + val(d), 0))}</div><div className="text-[12.5px] text-ink-2">{groups.paid.length} invoices</div></div>
      </div>
      <div className="card scroll-x p-2">
        <table className="table text-[13px]">
          <thead><tr><th>Invoice</th><th>Material</th><th className="text-right">Accepted</th><th className="text-right">Amount</th><th>Delivered</th><th>Status</th><th>Payment</th></tr></thead>
          <tbody>
            {(dels || []).map((d) => { const m = d.materials as unknown as { name: string; unit: string }; return (
              <tr key={d.id}>
                <td className="num">{d.invoice_number || '—'}</td><td>{m.name}</td>
                <td className="num text-right">{d.accepted_qty != null ? `${qty(d.accepted_qty)} / ${qty(d.quantity)}` : qty(d.quantity)} {m.unit}</td>
                <td className="num text-right">{d.unit_cost ? inr(val(d)) : '—'}</td>
                <td className="whitespace-nowrap">{date(d.delivered_at)}</td>
                <td>{d.paid_at ? <Pill status="paid" tone="good" label="Paid" /> : <Pill status={d.status} />}</td>
                <td className="num whitespace-nowrap text-ink-2">{d.paid_at ? `${date(d.paid_at)} · ${d.payment_ref}` : d.status === 'pending_inspection' ? '—' : `due ${date(new Date(new Date(d.inspected_at ?? d.delivered_at).getTime() + 30 * 86400000))}`}</td>
              </tr>
            ); })}
          </tbody>
        </table>
      </div>
    </>
  );
}
