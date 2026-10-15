'use client';
import { motion } from 'framer-motion';
import { useState } from 'react';
import { date, lakh } from '@/lib/format';

/** Step chart of a plot's published price list over time, with hover read-out. */
/** `now` (ms) is passed from the server so the server and browser draw the same chart. */
export function PriceChart({ points, now, height = 220 }: { points: { t: string; price: number }[]; now: number; height?: number }) {
  const W = 640, H = height, L = 58, R = 18, T = 18, B = 30;
  const pts = [...points].sort((a, b) => +new Date(a.t) - +new Date(b.t));
  const [hover, setHover] = useState<number | null>(null);
  if (pts.length === 0) return null;
  const t0 = +new Date(pts[0]!.t), t1 = Math.max(now, +new Date(pts.at(-1)!.t));
  const vals = pts.map((p) => p.price);
  const lo = Math.min(...vals) * 0.94, hi = Math.max(...vals) * 1.04;
  const X = (t: number) => L + ((t - t0) / (t1 - t0 || 1)) * (W - L - R);
  const Y = (v: number) => T + (1 - (v - lo) / (hi - lo || 1)) * (H - T - B);
  let d = '';
  pts.forEach((p, i) => { const x = X(+new Date(p.t)), y = Y(p.price); d += i === 0 ? `M${x} ${y}` : `H${x}V${y}`; });
  d += `H${X(t1)}`;
  const area = d + `V${H - B}H${X(t0)}Z`;
  const ticks = [0.15, 0.55, 0.92].map((f) => lo + (hi - lo) * f);
  const years: number[] = [];
  const IST = 5.5 * 3600000, yearOf = (t: number) => new Date(t + IST).getUTCFullYear();
  for (let y = yearOf(t0); y <= yearOf(t1); y++) { const t = Date.UTC(y, 0, 1) - IST; if (t > t0 && t < t1) years.push(t); }
  const last = pts.at(-1)!;
  const h = hover != null ? pts[hover]! : null;
  return (
    <div className="relative">
      <svg viewBox={`0 0 ${W} ${H}`} className="block h-auto w-full" role="img" aria-label={`Price history from ${lakh(pts[0]!.price)} to ${lakh(last.price)}`}
        onPointerMove={(e) => {
          const r = e.currentTarget.getBoundingClientRect();
          const t = t0 + (((e.clientX - r.left) / r.width) * W - L) / (W - L - R) * (t1 - t0);
          let k = 0; pts.forEach((p, i) => { if (+new Date(p.t) <= t) k = i; }); setHover(k);
        }} onPointerLeave={() => setHover(null)}>
        <defs>
          <linearGradient id="pc-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--accent)" stopOpacity=".28" /><stop offset="100%" stopColor="var(--accent)" stopOpacity="0" />
          </linearGradient>
        </defs>
        {ticks.map((v, i) => (
          <g key={i}>
            <line x1={L} x2={W - R} y1={Y(v)} y2={Y(v)} stroke="var(--line)" />
            <text x={L - 8} y={Y(v) + 4} textAnchor="end" fontSize="11.5" fill="var(--ink-3)" fontFamily="var(--font-mono)">{lakh(v).replace('₹', '')}</text>
          </g>
        ))}
        {years.map((t) => <text key={t} x={X(t)} y={H - 8} textAnchor="middle" fontSize="11.5" fill="var(--ink-3)" fontFamily="var(--font-mono)">{yearOf(t + 1)}</text>)}
        <motion.path d={area} fill="url(#pc-fill)" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 1, delay: 0.5 }} />
        <motion.path d={d} fill="none" stroke="var(--accent)" strokeWidth="2.6" strokeLinejoin="round"
          initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1.4, ease: [0.2, 0.7, 0.2, 1] }} />
        <circle cx={X(t1)} cy={Y(last.price)} r="5" fill="var(--accent)" stroke="var(--surface)" strokeWidth="2.5" />
        {h && <g>
          <line x1={X(+new Date(h.t))} x2={X(+new Date(h.t))} y1={T} y2={H - B} stroke="var(--ink-3)" strokeDasharray="3 3" />
          <circle cx={X(+new Date(h.t))} cy={Y(h.price)} r="4.5" fill="var(--surface)" stroke="var(--accent)" strokeWidth="2.5" />
        </g>}
      </svg>
      {h && (
        <div className="pointer-events-none absolute left-3 top-2 rounded-lg bg-ink px-2.5 py-1.5 text-[12px] text-bg shadow-lg">
          <div className="num font-semibold">{lakh(h.price)}</div><div className="opacity-70">from {date(h.t)}</div>
        </div>
      )}
    </div>
  );
}
