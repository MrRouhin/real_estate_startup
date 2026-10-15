import Link from 'next/link';
import { Columns3 } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { liveStatus, rate } from '@/lib/site';
import { cap, inr, lakh } from '@/lib/format';
import { Empty, PlotPill } from '@/components/ui/bits';

export const metadata = { title: 'Compare plots' };

export default async function ComparePage({ searchParams }: { searchParams: Promise<{ ids?: string }> }) {
  const { ids } = await searchParams;
  const list = (ids || '').split(',').filter((x) => /^[0-9a-f-]{36}$/.test(x)).slice(0, 3);
  if (!list.length) return <Empty icon={<Columns3 className="size-7" />} title="Nothing to compare yet">Open a plot and tap Compare. You can add up to 3.</Empty>;
  const supabase = await createClient();
  const [{ data: plots }, { data: hist }] = await Promise.all([
    supabase.from('plots').select('*').in('id', list),
    supabase.from('plot_price_history').select('plot_id, price, changed_at').in('plot_id', list).order('changed_at'),
  ]);
  const ps = list.map((id) => plots?.find((p) => p.id === id)).filter(Boolean) as NonNullable<typeof plots>;
  const first = (id: string) => Number(hist?.find((h) => h.plot_id === id)?.price ?? 0);
  const best = (vals: number[], low = true) => vals.indexOf(low ? Math.min(...vals) : Math.max(...vals));
  const rows: [string, (p: (typeof ps)[number]) => React.ReactNode, number[]?, boolean?][] = [
    ['Price', (p) => inr(p.price), ps.map((p) => Number(p.price)), true],
    ['Rate per sq ft', (p) => `₹${rate(p).toLocaleString('en-IN')}`, ps.map(rate), true],
    ['Size', (p) => `${Number(p.area_sqft)} sq ft`, ps.map((p) => Number(p.area_sqft)), false],
    ['Dimensions', (p) => p.dimensions ? `${p.dimensions} ft` : '—'],
    ['Facing', (p) => cap(p.facing)],
    ['Corner', (p) => (p.is_corner ? 'Yes' : 'No')],
    ['Since launch', (p) => first(p.id) ? `+${Math.round((Number(p.price) / first(p.id) - 1) * 100)}%` : '—'],
    ['Token (10%)', (p) => lakh(Number(p.price) * 0.1)],
    ['Status', (p) => <PlotPill status={liveStatus(p)} />],
  ];
  return (
    <div className="grid gap-5">
      <div><div className="eyebrow">Compare</div><h1 className="text-[28px] font-bold">{ps.map((p) => p.plot_number).join(' vs ')}</h1></div>
      <div className="card scroll-x">
        <table className="table min-w-[560px]">
          <thead><tr><th />{ps.map((p) => <th key={p.id} className="!text-[14px] !normal-case !tracking-normal text-ink">{p.plot_number}</th>)}</tr></thead>
          <tbody>
            {rows.map(([label, f, vals, low]) => {
              const b = vals ? best(vals, low) : -1;
              return (
                <tr key={label}><td className="text-ink-2">{label}</td>
                  {ps.map((p, k) => <td key={p.id} className={'num ' + (k === b && ps.length > 1 ? 'font-semibold text-good' : '')}>{f(p)}</td>)}</tr>
              );
            })}
            <tr><td />{ps.map((p) => <td key={p.id}><Link href={`/plots/${p.id}`} className="btn btn-outline btn-sm">Open</Link></td>)}</tr>
          </tbody>
        </table>
      </div>
      <p className="text-[12.5px] text-ink-3">Green marks the better value in each row.</p>
    </div>
  );
}
