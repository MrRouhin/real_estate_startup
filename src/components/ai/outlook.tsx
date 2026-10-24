// Price outlook as a fan of scenarios, with every assumption written out. Server-safe.
import { Check, CircleHelp, X } from 'lucide-react';
import type { CheckItem, Outlook } from '@/lib/ai/outlook';
import { lakh } from '@/lib/format';

export function OutlookFan({ price, o, height = 200 }: { price: number; o: Outlook; height?: number }) {
  const W = 600, H = height, L = 56, R = 70, T = 14, B = 26;
  const maxY = Math.max(...o.curve.map((c) => c.high)) * 1.03, minY = Math.min(price, ...o.curve.map((c) => c.low)) * 0.97;
  const years = Math.max(...o.rows.map((r) => r.years));
  const x = (t: number) => L + (t / years) * (W - L - R);
  const y = (v: number) => T + (1 - (v - minY) / (maxY - minY)) * (H - T - B);
  const line = (k: 'low' | 'base' | 'high') => o.curve.map((c, i) => `${i ? 'L' : 'M'}${x(c.t).toFixed(1)},${y(c[k]).toFixed(1)}`).join(' ');
  const band = line('high') + ' ' + [...o.curve].reverse().map((c) => `L${x(c.t).toFixed(1)},${y(c.low).toFixed(1)}`).join(' ') + 'Z';
  const last = o.rows[o.rows.length - 1]!;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label={`Scenario range for ${years} years: ${lakh(last.low)} to ${lakh(last.high)}`}>
      {o.rows.map((r) => <g key={r.years}><line x1={x(r.years)} x2={x(r.years)} y1={T} y2={H - B} stroke="var(--line)" strokeDasharray="3 4" />
        <text x={x(r.years)} y={H - 8} fontSize="10.5" fill="var(--ink-3)" textAnchor="middle">{r.years} yr</text></g>)}
      <text x={x(0)} y={H - 8} fontSize="10.5" fill="var(--ink-3)" textAnchor="middle">today</text>
      <path d={band} fill="var(--accent)" fillOpacity=".12" />
      <path d={line('low')} fill="none" stroke="var(--accent)" strokeOpacity=".45" strokeWidth="1.5" strokeDasharray="4 4" />
      <path d={line('high')} fill="none" stroke="var(--accent)" strokeOpacity=".45" strokeWidth="1.5" strokeDasharray="4 4" />
      <path d={line('base')} fill="none" stroke="var(--accent)" strokeWidth="2.5" />
      <circle cx={x(0)} cy={y(price)} r="4" fill="var(--accent)" />
      <text x={L - 6} y={y(price) + 4} fontSize="10.5" fill="var(--ink-2)" textAnchor="end">{lakh(price)}</text>
      {[['high', last.high], ['base', last.base], ['low', last.low]].map(([k, v]) => (
        <text key={k as string} x={x(years) + 6} y={y(v as number) + 4} fontSize="10.5" fill={k === 'base' ? 'var(--accent)' : 'var(--ink-3)'} fontWeight={k === 'base' ? 700 : 400}>{lakh(v as number)}</text>
      ))}
    </svg>
  );
}

export function OutlookTable({ o }: { o: Outlook }) {
  return (
    <table className="table text-[13px]">
      <thead><tr><th>In</th><th className="r">Cautious (≈{o.lowRate}%/yr)</th><th className="r">Middle (≈{o.baseRate}%/yr)</th><th className="r">Strong (≈{o.highRate}%/yr)</th></tr></thead>
      <tbody>{o.rows.map((r) => <tr key={r.years}><td>{r.years} year{r.years > 1 ? 's' : ''}</td><td className="r num">{lakh(r.low)}</td><td className="r num font-semibold">{lakh(r.base)}</td><td className="r num">{lakh(r.high)}</td></tr>)}</tbody>
    </table>
  );
}

export function Checklist({ items }: { items: CheckItem[] }) {
  return (
    <ul className="grid gap-2">
      {items.map((c) => {
        const I = c.ok === true ? Check : c.ok === false ? X : CircleHelp;
        const color = c.ok === true ? 'var(--good)' : c.ok === false ? 'var(--bad)' : 'var(--warn)';
        return (
          <li key={c.id} className="flex gap-2.5 text-[13px]">
            <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full" style={{ background: `color-mix(in srgb, ${color} 15%, transparent)`, color }}><I className="size-3.5" /></span>
            <span><b>{c.label}</b><span className="block text-ink-2">{c.detail}</span></span>
          </li>
        );
      })}
    </ul>
  );
}
