'use client';
import { motion } from 'framer-motion';
import { useState } from 'react';
import { lakh } from '@/lib/format';

/** Vertical bars with value labels; the last bar is highlighted. */
export function Bars({ data, unit = 'count', height = 180, color = 'var(--st-booked)' }: {
  data: { label: string; value: number }[]; unit?: 'count' | 'lakh'; height?: number; color?: string;
}) {
  const format = (n: number) => (unit === 'lakh' ? (n ? lakh(n).replace('₹', '') : '') : String(n));
  const [hover, setHover] = useState<number | null>(null);
  const W = 640, H = height, L = 8, B = 26, T = 22;
  const max = Math.max(1, ...data.map((d) => d.value));
  const bw = (W - L * 2) / data.length;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="block h-auto w-full" role="img" aria-label={data.map((d) => `${d.label}: ${format(d.value)}`).join(', ')}>
      <line x1={L} x2={W - L} y1={H - B} y2={H - B} stroke="var(--line)" />
      {data.map((d, i) => {
        const h = (d.value / max) * (H - B - T), x = L + i * bw + bw * 0.18, w = bw * 0.64, last = i === data.length - 1;
        return (
          <g key={d.label + i} onPointerEnter={() => setHover(i)} onPointerLeave={() => setHover(null)}>
            <rect x={L + i * bw} y={0} width={bw} height={H} fill="transparent" />
            <motion.rect x={x} width={w} rx={6} fill={last ? 'var(--accent)' : color} fillOpacity={last || hover === i ? 1 : 0.55}
              initial={{ y: H - B, height: 0 }} animate={{ y: H - B - h, height: Math.max(h, d.value ? 2 : 0) }}
              transition={{ duration: 0.8, delay: i * 0.05, ease: [0.2, 0.7, 0.2, 1] }} />
            {d.value > 0 && <text x={x + w / 2} y={H - B - h - 6} textAnchor="middle" fontSize="11.5" fontWeight="600" fill="var(--ink)" fontFamily="var(--font-mono)">{format(d.value)}</text>}
            <text x={x + w / 2} y={H - 8} textAnchor="middle" fontSize="11.5" fill="var(--ink-3)">{d.label}</text>
          </g>
        );
      })}
    </svg>
  );
}

/** Sales funnel: each stage as wide as its count relative to the first. */
export function Funnel({ stages }: { stages: { label: string; value: number; color: string }[] }) {
  const max = Math.max(1, ...stages.map((s) => s.value));
  return (
    <div className="grid gap-2">
      {stages.map((s, i) => {
        const prev = i > 0 ? stages[i - 1]!.value : null;
        return (
          <div key={s.label} className="grid grid-cols-[110px_1fr_auto] items-center gap-3 text-[13px]">
            <span className="truncate text-ink-2">{s.label}</span>
            <div className="h-7 overflow-hidden rounded-lg bg-surface-2">
              <motion.div className="flex h-full items-center rounded-lg px-2 text-[12px] font-semibold text-white" style={{ background: s.color }}
                initial={{ width: 0 }} animate={{ width: `${Math.max(6, (s.value / max) * 100)}%` }}
                transition={{ duration: 0.9, delay: i * 0.08, ease: [0.2, 0.7, 0.2, 1] }}>
                <span className="num">{s.value}</span>
              </motion.div>
            </div>
            <span className="num w-12 text-right text-[11.5px] text-ink-3">{prev ? `${Math.round((s.value / prev) * 100)}%` : ''}</span>
          </div>
        );
      })}
    </div>
  );
}
