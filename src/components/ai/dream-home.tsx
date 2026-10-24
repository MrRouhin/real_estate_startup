'use client';
import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';
import { Loader2, Wand2 } from 'lucide-react';
import { DEFAULT_SPEC, type HousePlan, type HouseSpec } from '@/lib/ai/house';
import { lakh } from '@/lib/format';
import { AISource } from './bits';

const HouseScene = dynamic(() => import('@/components/three/house-scene'), { ssr: false, loading: () => <div className="skeleton absolute inset-0" /> });

/** Describe a house in words (or tap options) and see it on this plot with a build-cost range. */
export function DreamHome({ plotId, facing }: { plotId: string; facing: string | null }) {
  const [spec, setSpec] = useState<HouseSpec>(DEFAULT_SPEC);
  const [plan, setPlan] = useState<HousePlan | null>(null);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [source, setSource] = useState('rules');
  const [dark, setDark] = useState(false);
  async function load(body: { text?: string; spec?: HouseSpec }) {
    setBusy(true);
    try {
      const r = await fetch('/api/ai/house', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ plotId, ...body }) });
      const j = await r.json();
      if (r.ok) { setSpec(j.spec); setPlan(j.plan); setSource(j.source); }
    } finally { setBusy(false); }
  }
  useEffect(() => { load({ spec: DEFAULT_SPEC }); setDark(window.matchMedia('(prefers-color-scheme: dark)').matches); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const set = (p: Partial<HouseSpec>) => { const s = { ...spec, ...p }; setSpec(s); load({ spec: s }); };
  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
      <div className="relative h-[340px] overflow-hidden rounded-2xl border border-line" style={{ background: 'radial-gradient(120% 90% at 50% 0%, color-mix(in srgb, var(--accent) 12%, var(--surface)) 0%, var(--surface-2) 70%)' }}>
        {plan && <HouseScene plan={plan} facing={facing} finish={spec.finish} dark={dark} />}
        {busy && <div className="absolute right-3 top-3 rounded-full bg-surface/90 p-1.5"><Loader2 className="size-4 animate-spin" /></div>}
        <div className="pointer-events-none absolute bottom-2 left-3 text-[11px] text-ink-3">Drag to rotate · illustrative massing, not an architectural plan</div>
      </div>
      <div className="grid content-start gap-3">
        <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); if (text.trim()) load({ text, spec }); }}>
          <input className="input flex-1" value={text} onChange={(e) => setText(e.target.value)} placeholder="e.g. 3BHK duplex with car parking and a small garden" aria-label="Describe your house" />
          <button className="btn btn-primary !px-3" disabled={busy || !text.trim()} aria-label="Design it"><Wand2 className="size-4" /></button>
        </form>
        <div className="flex flex-wrap gap-1.5">
          {[1, 2, 3, 4].map((b) => <button key={b} className="chip" aria-pressed={spec.bedrooms === b} onClick={() => set({ bedrooms: b })}>{b} BHK</button>)}
          <span className="mx-0.5 h-5 w-px self-center bg-line" />
          {[1, 2, 3].map((f) => <button key={f} className="chip" aria-pressed={spec.floors === f} onClick={() => set({ floors: f })}>{f === 1 ? 'Ground' : f === 2 ? 'G+1' : 'G+2'}</button>)}
          <button className="chip" aria-pressed={spec.parking} onClick={() => set({ parking: !spec.parking })}>Car parking</button>
          <button className="chip" aria-pressed={spec.garden} onClick={() => set({ garden: !spec.garden })}>Garden</button>
          <button className="chip" aria-pressed={spec.rental} onClick={() => set({ rental: !spec.rental })}>Rental floor</button>
          <button className="chip" aria-pressed={spec.vastu} onClick={() => set({ vastu: !spec.vastu })}>Vastu</button>
          {(['basic', 'standard', 'premium'] as const).map((f) => <button key={f} className="chip capitalize" aria-pressed={spec.finish === f} onClick={() => set({ finish: f })}>{f}</button>)}
        </div>
        {plan && (
          <>
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-2xl bg-accent-soft p-3 text-accent"><div className="text-[12px]">Indicative build cost</div><div className="num text-[19px] font-bold">{lakh(plan.cost.low)}–{lakh(plan.cost.high)}</div><div className="num text-[11px]">₹{plan.cost.perSqft[0].toLocaleString('en-IN')}–{plan.cost.perSqft[1].toLocaleString('en-IN')}/sq ft</div></div>
              <div className="rounded-2xl bg-surface-2 p-3"><div className="text-[12px] text-ink-2">Built-up area</div><div className="num text-[19px] font-bold">{plan.builtUp.toLocaleString('en-IN')} sq ft</div><div className="num text-[11px] text-ink-3">{plan.floors} floor{plan.floors > 1 ? 's' : ''} · {plan.perFloor.toLocaleString('en-IN')} sq ft each</div></div>
            </div>
            <dl className="grid grid-cols-3 gap-2 text-[12px]">
              <div><dt className="text-ink-3">Setbacks (ft)</dt><dd className="num font-semibold">F {plan.setbacks.front} · R {plan.setbacks.rear} · S {plan.setbacks.side}</dd></div>
              <div><dt className="text-ink-3">Floor-area ratio</dt><dd className="num font-semibold">{plan.farUsed} of {plan.farMax}</dd></div>
              <div><dt className="text-ink-3">Build time</dt><dd className="num font-semibold">{plan.months[0]}–{plan.months[1]} months</dd></div>
            </dl>
            <ul className="grid gap-0.5 text-[12.5px]">{plan.rooms.map((r, i) => <li key={i}><b className="text-ink-3">{r.floor === 0 ? 'Ground' : r.floor >= plan.floors ? 'Roof' : `Floor ${r.floor}`}:</b> {r.label}</li>)}</ul>
            <ul className="grid gap-1 text-[12px] text-ink-3">{plan.notes.map((n, i) => <li key={i}>• {n}</li>)}</ul>
            <div><AISource source={source} /></div>
          </>
        )}
      </div>
    </div>
  );
}
