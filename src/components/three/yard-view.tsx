'use client';
import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';
import type { YardItem } from './stock-yard';

const StockYard = dynamic(() => import('./stock-yard'), { ssr: false, loading: () => <div className="skeleton h-full w-full" /> });

export function YardView({ items, height = 340 }: { items: YardItem[]; height?: number }) {
  const [dark, setDark] = useState(false);
  const [ok, setOk] = useState(true);
  useEffect(() => {
    setDark(window.matchMedia('(prefers-color-scheme: dark)').matches);
    try { const c = document.createElement('canvas'); setOk(!!(c.getContext('webgl2') || c.getContext('webgl'))); } catch { setOk(false); }
  }, []);
  return (
    <div className="relative overflow-hidden rounded-2xl" style={{ height, background: 'radial-gradient(120% 90% at 50% 0%, color-mix(in srgb, var(--accent) 12%, var(--surface)) 0%, var(--surface-2) 75%)' }}>
      {ok ? <StockYard items={items} dark={dark} /> : <div className="grid h-full place-items-center text-[13px] text-ink-2">3D view needs WebGL. The table below has every number.</div>}
      <div className="pointer-events-none absolute left-3 top-3 rounded-full bg-surface/85 px-3 py-1 text-[12px] font-semibold shadow-sm backdrop-blur">Store yard · height = stock vs reorder level</div>
    </div>
  );
}
