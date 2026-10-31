'use client';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft, ArrowRight, BedDouble, Building, Compass, Eye, Layers, SlidersHorizontal, Sparkles, X } from 'lucide-react';
import { TowerView } from '@/components/three/tower-view';
import type { TowerData } from '@/components/three/tower-scene';
import { FloorPlan } from '@/components/flats/floor-plan';
import { Legend, PlotPill } from '@/components/ui/bits';
import { CompareToggle } from '@/components/buyer/compare-toggle';
import { SubmitButton } from '@/components/ui/action-form';
import { AssistantChat } from '@/components/ai/assistant-chat';
import { holdPlot } from '@/app/actions';
import { liveStatus, STATUS_COLOR } from '@/lib/site';
import { cap, inr, lakh } from '@/lib/format';
import { mirrorLayout, type Layout } from '@/lib/flats/layout';
import { FACING_DEG, FLOOR_STAGE, floorStage, ordinal } from '@/lib/flats/tower';
import type { FlatRow, UnitType } from '@/lib/flats/queries';

type Filter = { bhk?: number | null; tower?: string | null; band?: 'low' | 'mid' | 'high' | null; view?: string | null; available?: boolean; maxPrice?: number | null };
const VIEW: Record<string, string> = { park: 'Park', pool: 'Pool', garden: 'Garden', road: 'Road' };
type AIMatch = { id: string; plot_number: string; price: number; score: number; reasons: string[]; caveats: string[] };

export function FlatExplorer({ project, towers, types, flats, openAI = false }: {
  project: { id: string; name: string; slug: string }; towers: TowerData[]; types: UnitType[]; flats: FlatRow[]; openAI?: boolean;
}) {
  const [f, setF] = useState<Filter>({});
  const [sel, setSel] = useState<string | null>(null);
  const [aiIds, setAiIds] = useState<string[] | null>(null);
  const [chat, setChat] = useState(openAI);
  const typeById = useMemo(() => new Map(types.map((t) => [t.id, t])), [types]);
  const prices = flats.map((p) => p.price);
  const minP = Math.min(...prices), maxP = Math.max(...prices);
  const maxFloor = Math.max(...towers.map((t) => t.floors));
  const band = (fl: number) => (fl <= Math.ceil(maxFloor / 3) ? 'low' : fl <= Math.ceil((2 * maxFloor) / 3) ? 'mid' : 'high');
  const match = useMemo(() => {
    if (aiIds) return (p: { id: string }) => aiIds.includes(p.id);
    return (p: { id: string }) => {
      const x = flats.find((q) => q.id === p.id); if (!x) return false;
      const t = x.unit_type_id ? typeById.get(x.unit_type_id) : null;
      if (f.bhk && t?.bedrooms !== f.bhk) return false;
      if (f.tower && x.tower_id !== f.tower) return false;
      if (f.band && band(x.floor ?? 1) !== f.band) return false;
      if (f.view && x.view !== f.view) return false;
      if (f.available && liveStatus(x) !== 'available') return false;
      if (f.maxPrice && x.price > f.maxPrice) return false;
      return true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [f, aiIds, flats, typeById]);
  const shown = flats.filter((p) => match(p) && liveStatus(p) === 'available').length;
  const selected = flats.find((p) => p.id === sel) || null;
  const selType = selected?.unit_type_id ? typeById.get(selected.unit_type_id) : null;
  const selTower = selected ? towers.find((t) => t.id === selected.tower_id) : null;
  const toggle = <K extends keyof Filter>(k: K, v: Filter[K]) => setF((x) => ({ ...x, [k]: x[k] === v ? (typeof v === 'boolean' ? false : null) : v }));
  const active = Object.values(f).some(Boolean);
  const bhks = [...new Set(types.map((t) => t.bedrooms))].sort();
  const views = [...new Set(flats.map((p) => p.view).filter(Boolean))] as string[];

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <Link href={`/projects/${project.slug}`} className="inline-flex items-center gap-1 text-[13px] text-ink-2 hover:text-ink"><ArrowLeft className="size-4" />{project.name}</Link>
          <h1 className="text-[28px] font-bold">Find your flat</h1>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="text-[14px] text-ink-2"><b className="num text-[18px] text-ink">{shown}</b> {aiIds ? 'AI matches available' : 'available flats match'}</div>
          <button className={'btn ' + (chat ? 'btn-primary' : 'btn-outline')} onClick={() => setChat(!chat)}><Sparkles className="size-4" />{chat ? 'Hide matchmaker' : 'AI matchmaker'}</button>
        </div>
      </div>
      {aiIds && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-accent-soft px-4 py-2.5 text-[13.5px] text-accent">
          <span><Sparkles className="mr-1 inline size-4" />Showing the matchmaker’s picks. Other flats are dimmed.</span>
          <button className="btn btn-ghost btn-sm !text-accent" onClick={() => setAiIds(null)}><X className="size-3.5" />Show all flats</button>
        </div>
      )}

      <div className="card flex flex-wrap items-center gap-2 p-3">
        <SlidersHorizontal className="ml-1 size-4 text-ink-3" />
        <button className="chip" aria-pressed={!!f.available} onClick={() => toggle('available', true)}>Available only</button>
        <span className="mx-1 h-5 w-px bg-line" />
        {bhks.map((b) => <button key={b} className="chip" aria-pressed={f.bhk === b} onClick={() => toggle('bhk', b)}><BedDouble className="size-3.5" />{b} BHK</button>)}
        <span className="mx-1 h-5 w-px bg-line" />
        {towers.map((t) => <button key={t.id} className="chip" aria-pressed={f.tower === t.id} onClick={() => toggle('tower', t.id)}><Building className="size-3.5" />{t.name}</button>)}
        <span className="mx-1 h-5 w-px bg-line" />
        {(['low', 'mid', 'high'] as const).map((b) => <button key={b} className="chip" aria-pressed={f.band === b} onClick={() => toggle('band', b)}><Layers className="size-3.5" />{cap(b)} floors</button>)}
        <span className="mx-1 h-5 w-px bg-line" />
        {views.map((v) => <button key={v} className="chip" aria-pressed={f.view === v} onClick={() => toggle('view', v)}><Eye className="size-3.5" />{VIEW[v] ?? cap(v)} view</button>)}
        <label className="ml-auto flex items-center gap-2 text-[13px] text-ink-2">
          Budget up to <b className="num text-ink">{lakh(f.maxPrice || maxP)}</b>
          <input type="range" min={minP} max={maxP} step={50000} value={f.maxPrice || maxP} onChange={(e) => setF((x) => ({ ...x, maxPrice: Number(e.target.value) >= maxP ? null : Number(e.target.value) }))}
            className="w-32 accent-[var(--accent)]" aria-label="Maximum price" />
        </label>
        {active && <button className="btn btn-ghost btn-sm" onClick={() => setF({})}><X className="size-3.5" />Clear</button>}
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="grid content-start gap-4">
          <div className="overflow-hidden rounded-[22px] border border-line">
            <TowerView towers={towers} flats={flats} types={types} selectedId={sel} onSelect={setSel} matches={match} initialMode="status" height="min(66vh, 580px)" />
            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line bg-surface px-4 py-2.5">
              <Legend /><span className="text-[12px] text-ink-3">Drag to rotate · scroll to zoom · tap a flat · “On site” shows each floor as built today</span>
            </div>
          </div>
          {/* stacking plan: every flat at a glance */}
          <div className="grid gap-4 md:grid-cols-2">
            {towers.map((t) => (
              <section key={t.id} className="card p-4">
                <div className="mb-2 flex items-baseline justify-between gap-2"><h2 className="font-bold">{t.name}</h2><span className="num text-[12px] text-ink-3">{t.slabs_cast}/{t.floors} slabs cast</span></div>
                <div className="grid gap-1" style={{ gridTemplateColumns: `28px repeat(${t.units_per_floor}, minmax(0, 1fr))` }}>
                  {Array.from({ length: t.floors }, (_, i) => t.floors - i).map((fl) => (
                    <div key={fl} className="contents">
                      <div className="num grid place-items-center text-[10.5px] text-ink-3" title={FLOOR_STAGE[floorStage(t as never, fl)].label}>{fl}</div>
                      {Array.from({ length: t.units_per_floor }, (_, s) => s + 1).map((s) => {
                        const x = flats.find((p) => p.tower_id === t.id && p.floor === fl && p.stack === s);
                        if (!x) return <div key={s} />;
                        const st = liveStatus(x), on = match(x), isSel = x.id === sel;
                        return (
                          <button key={s} onClick={() => setSel(x.id)} title={`Flat ${x.plot_number} · ${st} · ${lakh(x.price)}`}
                            className={'num truncate rounded-md px-1 py-1 text-[10.5px] font-semibold transition ' + (isSel ? 'ring-2 ring-[#f0b43a] ring-offset-1 ring-offset-surface' : '')}
                            style={{ background: on ? STATUS_COLOR[st] : 'var(--surface-2)', color: on ? '#fff' : 'var(--ink-3)', opacity: on ? 1 : 0.7 }}>
                            {x.plot_number.split('-')[1]}<span className="hidden font-normal opacity-80 xl:inline"> · {(x.price / 1e5).toFixed(0)}L</span>
                          </button>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </div>
        </div>

        <div className="grid content-start gap-4 lg:sticky lg:top-24">
          {chat && (
            <div className="card grid content-start gap-3 p-4">
              <div className="flex items-center justify-between gap-2"><div className="flex items-center gap-2 font-semibold"><Sparkles className="size-4 text-accent" />Flat matchmaker</div>
                <button className="btn btn-ghost btn-sm !p-1.5" onClick={() => setChat(false)} aria-label="Close matchmaker"><X className="size-4" /></button></div>
              <AssistantChat endpoint="/api/ai/match" extra={{ projectId: project.id }} languages height="min(40dvh, 360px)"
                greeting={'Tell me what you need: budget, BHK, floor, view, for living or for rent. Hindi or Kannada is fine too.'}
                suggestions={['2 BHK under 90 lakh', '3 BHK high floor with park view', 'Best rental yield', 'East facing, low floor for parents']}
                placeholder="e.g. 2 BHK pool view under 92 lakh"
                onResult={(d) => { const m = (d.matches as AIMatch[] | undefined) || []; if (m.length) { setAiIds(m.map((x) => x.id)); setSel(m[0]!.id); } }}
                renderExtras={(d) => { const m = (d.matches as AIMatch[] | undefined) || []; return m.length ? (
                  <div className="grid gap-1.5">{m.slice(0, 4).map((x) => (
                    <button key={x.id} onClick={() => setSel(x.id)} className="rounded-xl border border-line bg-surface p-2.5 text-left text-[12.5px] transition-colors hover:border-accent">
                      <div className="flex items-center justify-between gap-2"><b className="text-[14px]">Flat {x.plot_number}</b><span className="num font-semibold">{lakh(x.price)}</span></div>
                      <div className="text-ink-2">{x.reasons.slice(0, 3).join(' · ')}</div>
                      {x.caveats[0] && <div className="text-warn">{x.caveats[0]}</div>}
                    </button>
                  ))}</div>
                ) : null; }} />
            </div>
          )}
          <AnimatePresence mode="wait">
            {selected && selType ? (
              <motion.aside key={selected.id} initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} transition={{ type: 'spring', stiffness: 300, damping: 28 }}
                className="card grid content-start gap-3 p-5">
                <div className="flex items-start justify-between gap-3">
                  <div><div className="eyebrow">{selTower?.name} · {ordinal(selected.floor ?? 1)} floor</div><div className="font-display text-[32px] font-bold leading-none">Flat {selected.plot_number}</div></div>
                  <PlotPill status={liveStatus(selected)} />
                </div>
                <div>
                  <div className="num text-[24px] font-semibold">{inr(selected.price)}</div>
                  <div className="num text-[13px] text-ink-3">{selType.name} · ₹{Math.round(selected.price / selType.super_sqft).toLocaleString('en-IN')}/sq ft super</div>
                </div>
                <div className="rounded-xl border border-line bg-surface-2 p-2">
                  <FloorPlan layout={selected.mirror ? mirrorLayout(selType.layout as Layout) : (selType.layout as Layout)} facingDeg={FACING_DEG[selected.facing || 'east']} furniture labels compact />
                </div>
                <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-line bg-line text-[13px]">
                  {[['Carpet', `${selType.carpet_sqft} sq ft`], ['Super', `${selType.super_sqft} sq ft`], ['Balcony faces', cap((selected.facing || '').replace('_', ' '))], ['View', VIEW[selected.view || ''] ?? '—'],
                    ['Floor today', selTower ? FLOOR_STAGE[floorStage(selTower as never, selected.floor ?? 1)].label : '—'], ['Corner', selected.is_corner ? 'Yes' : 'No']].map(([k, v]) => (
                    <div key={k} className="bg-surface p-2.5"><dt className="text-[11px] text-ink-3">{k}</dt><dd className="font-semibold">{v}</dd></div>
                  ))}
                </dl>
                <Link href={`/flats/${selected.id}`} className="btn btn-primary"><Compass className="size-4" />3D tour, site progress and prices <ArrowRight className="size-4" /></Link>
                <div className="grid grid-cols-2 gap-2">
                  <form action={holdPlot}>
                    <input type="hidden" name="plotId" value={selected.id} />
                    <SubmitButton className="btn btn-outline w-full" disabled={liveStatus(selected) !== 'available'} pendingText="Holding…">
                      {liveStatus(selected) === 'available' ? 'Book now' : 'Not available'}
                    </SubmitButton>
                  </form>
                  <CompareToggle id={selected.id} number={selected.plot_number} />
                </div>
              </motion.aside>
            ) : (
              <motion.aside key="none" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="card paper grid content-center justify-items-center gap-2 p-8 text-center">
                <div className="grid size-12 place-items-center rounded-2xl bg-accent-soft text-accent"><Building className="size-6" /></div>
                <div className="font-semibold">Tap a flat on a tower or in the grid</div>
                <p className="text-[13.5px] text-ink-2">See its plan, price and how far its floor has been built. Green flats are free to book right now.</p>
              </motion.aside>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
