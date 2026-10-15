'use client';
import { motion } from 'framer-motion';
import { qty, inr } from '@/lib/format';

export type UsageRow = { material_id: string; name: string; unit: string; issued: number; consumed: number; wastage: number; returned: number; at_site: number; unit_cost: number };

/** Each material issued to a contractor split into used, wasted, returned and still at site. */
export function UsageBars({ rows, limit = 5 }: { rows: UsageRow[]; limit?: number }) {
  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap gap-4 text-[12px] text-ink-2">
        {[['Used', 'var(--accent)'], ['Wasted', 'var(--bad)'], ['Returned', 'var(--st-booked)'], ['Still at site', 'var(--line)']].map(([l, c]) => (
          <span key={l} className="inline-flex items-center gap-1.5"><i className="size-2.5 rounded-sm" style={{ background: c }} />{l}</span>
        ))}
      </div>
      {rows.map((r, i) => {
        const tot = Math.max(r.issued, 0.0001);
        const wpct = r.consumed + r.wastage > 0 ? (r.wastage / (r.consumed + r.wastage)) * 100 : 0;
        const segs = [[r.consumed, 'var(--accent)'], [r.wastage, 'var(--bad)'], [r.returned, 'var(--st-booked)'], [r.at_site, 'var(--line)']] as const;
        let acc = 0;
        return (
          <div key={r.material_id} className="grid gap-1.5">
            <div className="flex flex-wrap items-baseline justify-between gap-2 text-[13px]">
              <span className="font-semibold">{r.name}</span>
              <span className="text-ink-2"><span className="num">{qty(r.issued)}</span> {r.unit} issued ·
                <span className={'num ml-1 font-semibold ' + (wpct > limit ? 'text-bad' : 'text-good')}>{wpct.toFixed(1)}% wasted</span>
                {r.wastage > 0 && r.unit_cost > 0 && <span className="ml-1 text-ink-3">({inr(r.wastage * r.unit_cost)})</span>}</span>
            </div>
            <div className="relative h-4 overflow-hidden rounded-full bg-surface-2" role="img" aria-label={`${r.name}: used ${qty(r.consumed)}, wasted ${qty(r.wastage)}, at site ${qty(r.at_site)} ${r.unit}`}>
              {segs.map(([v, c], k) => {
                const left = (acc / tot) * 100; acc += v;
                return <motion.span key={k} className="absolute inset-y-0" style={{ left: `${left}%`, background: c }}
                  initial={{ width: 0 }} animate={{ width: `${(v / tot) * 100}%` }} transition={{ duration: 0.8, delay: i * 0.06 + k * 0.12 }} />;
              })}
            </div>
            <div className="num flex gap-4 text-[11.5px] text-ink-3"><span>used {qty(r.consumed)}</span><span>wasted {qty(r.wastage)}</span>{r.returned > 0 && <span>returned {qty(r.returned)}</span>}<span>at site {qty(r.at_site)}</span></div>
          </div>
        );
      })}
    </div>
  );
}
