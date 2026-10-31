import Link from 'next/link';
import { requireStaff } from '@/lib/auth';
import { date, lakh } from '@/lib/format';
import { Empty, PageHeader, Pill } from '@/components/ui/bits';
import { ProgressBar } from '@/components/ui/motion';
import { LiveRefresh } from '@/components/live-refresh';

export const metadata = { title: 'Bookings' };

export default async function Bookings({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const { status } = await searchParams;
  const { supabase, orgId } = await requireStaff();
  let q = supabase.from('booking_balances').select('*').eq('org_id', orgId);
  if (status) q = q.eq('status', status as 'confirmed'); else q = q.neq('status', 'cancelled');
  const { data: rows } = await q;
  const ids = (rows || []).map((r) => r.booking_id!);
  const [{ data: books }, { data: plots }, { data: buyers }] = await Promise.all([
    ids.length ? supabase.from('bookings').select('id, created_at').in('id', ids) : Promise.resolve({ data: [] as { id: string; created_at: string }[] }),
    supabase.from('plots').select('id, plot_number').eq('org_id', orgId),
    supabase.from('profiles').select('id, full_name, phone'),
  ]);
  const when = Object.fromEntries((books || []).map((b) => [b.id, b.created_at]));
  const plotNo = Object.fromEntries((plots || []).map((p) => [p.id, p.plot_number]));
  const buyer = Object.fromEntries((buyers || []).map((p) => [p.id, p.full_name]));
  const list = (rows || []).sort((a, b) => +new Date(when[b.booking_id!] || 0) - +new Date(when[a.booking_id!] || 0));
  const tabs = [['', 'Active'], ['pending_payment', 'Awaiting payment'], ['confirmed', 'Booked'], ['registered', 'Registered'], ['refund_due', 'Refund due']];
  const total = list.reduce((a, r) => a + Number(r.total_amount), 0), paid = list.reduce((a, r) => a + Number(r.amount_paid), 0);
  return (
    <>
      <LiveRefresh tables={['bookings', 'payments']} filter={`org_id=eq.${orgId}`} />
      <PageHeader emoji="🔑" eyebrow="Sales" title="Bookings" sub={<>Sales value <b className="num text-ink">{lakh(total)}</b> · collected <b className="num text-ink">{lakh(paid)}</b> ({total ? Math.round((paid / total) * 100) : 0}%)</>} />
      <div className="flex flex-wrap gap-1">{tabs.map(([v, l]) => <Link key={v} href={v ? `?status=${v}` : '?'} className="chip" aria-pressed={(status || '') === v}>{l}</Link>)}</div>
      {list.length === 0 ? <Empty title="No bookings here" /> : (
        <div className="card scroll-x">
          <table className="table min-w-[820px]">
            <thead><tr><th>Plot</th><th>Buyer</th><th>Status</th><th className="r">Price</th><th>Collected</th><th className="r">Balance</th><th>Booked</th></tr></thead>
            <tbody>
              {list.map((r) => {
                const pct = (Number(r.amount_paid) / Number(r.total_amount)) * 100;
                return (
                  <tr key={r.booking_id} className="cursor-pointer">
                    <td><Link href={`/console/bookings/${r.booking_id}`} className="num font-semibold text-accent hover:underline">{plotNo[r.plot_id!]}</Link></td>
                    <td>{buyer[r.buyer_id!] || '—'}</td>
                    <td><Pill status={r.status!} /></td>
                    <td className="r num">{lakh(r.total_amount)}</td>
                    <td className="min-w-[160px]"><div className="flex items-center gap-2"><ProgressBar value={pct} color="var(--good)" className="h-1.5" /><span className="num w-9 text-[12px] text-ink-3">{Math.round(pct)}%</span></div></td>
                    <td className="r num">{lakh(r.balance)}</td>
                    <td className="text-ink-2">{date(when[r.booking_id!])}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
