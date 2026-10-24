'use client';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft, ArrowRight, Compass, CornerDownRight, Ruler, SlidersHorizontal, Sparkles, X } from 'lucide-react';
import { AssistantChat } from '@/components/ai/assistant-chat';
import { SiteView } from '@/components/three/site-view';
import { Legend, PlotPill } from '@/components/ui/bits';
import { CompareToggle } from '@/components/buyer/compare-toggle';
import { liveStatus, matchesFilter, rate, type PlotFilter } from '@/lib/site';
import { cap, inr, lakh } from '@/lib/format';
import { holdPlot } from '@/app/actions';
import { SubmitButton } from '@/components/ui/action-form';
import type { PlotShape, Progress, SiteLayout } from '@/lib/types';

type P = PlotShape & { dimensions: string | null };

type AIMatch = { id: string; plot_number: string; price: number; area: number; facing: string | null; score: number; reasons: string[]; caveats: string[]; fits: boolean };

export function PlotExplorer({ project, plots, layout, progress, openAI = false }: { project: { id: string; name: string; slug: string }; plots: P[]; layout: SiteLayout; progress: Progress; openAI?: boolean }) {
  const [f, setF] = useState<PlotFilter>({ available: false });
  const [sel, setSel] = useState<string | null>(null);
  const [mode, setMode] = useState<'chat' | 'plot'>(openAI ? 'chat' : 'plot');
  const [aiIds, setAiIds] = useState<string[] | null>(null);
  const prices = plots.map((p) => Number(p.price));
  const minP = Math.min(...prices), maxP = Math.max(...prices);
  const match = useMemo(() => (aiIds ? (p: PlotShape) => aiIds.includes(p.id) : (p: PlotShape) => matchesFilter(p, f)), [f, aiIds]);
  const pick = (id: string) => { setSel(id); setMode('plot'); };
  const shown = plots.filter((p) => match(p) && liveStatus(p) === 'available').length;
  const selected = plots.find((p) => p.id === sel) || null;
  const sizes = [...new Set(plots.map((p) => Number(p.area_sqft)))].sort((a, b) => a - b);
  const facings = [...new Set(plots.map((p) => p.facing).filter(Boolean))] as string[];
  const toggle = <K extends keyof PlotFilter>(k: K, v: PlotFilter[K]) => setF((x) => ({ ...x, [k]: x[k] === v ? (typeof v === 'boolean' ? false : null) : v }));
  const active = !!(f.size || f.facing || f.corner || f.available || f.maxPrice);

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <Link href={`/projects/${project.slug}`} className="inline-flex items-center gap-1 text-[13px] text-ink-2 hover:text-ink"><ArrowLeft className="size-4" />{project.name}</Link>
          <h1 className="text-[28px] font-bold">Find your plot</h1>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="text-[14px] text-ink-2"><b className="num text-[18px] text-ink">{shown}</b> {aiIds ? 'AI matches' : 'available plots match'}</div>
          <button className={'btn ' + (mode === 'chat' ? 'btn-primary' : 'btn-outline')} onClick={() => setMode(mode === 'chat' ? 'plot' : 'chat')}><Sparkles className="size-4" />{mode === 'chat' ? 'Hide matchmaker' : 'AI matchmaker'}</button>
        </div>
      </div>
      {aiIds && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-accent-soft px-4 py-2.5 text-[13.5px] text-accent">
          <span><Sparkles className="mr-1 inline size-4" />The map shows the matchmaker’s picks for you. Other plots are dimmed.</span>
          <button className="btn btn-ghost btn-sm !text-accent" onClick={() => setAiIds(null)}><X className="size-3.5" />Show all plots</button>
        </div>
      )}

      <div className="card flex flex-wrap items-center gap-2 p-3">
        <SlidersHorizontal className="ml-1 size-4 text-ink-3" />
        <button className="chip" aria-pressed={!!f.available} onClick={() => toggle('available', true)}>Available only</button>
        <span className="mx-1 h-5 w-px bg-line" />
        {sizes.map((s) => <button key={s} className="chip" aria-pressed={f.size === s} onClick={() => toggle('size', s)}><Ruler className="size-3.5" />{s} sq ft</button>)}
        <span className="mx-1 h-5 w-px bg-line" />
        {facings.map((fc) => <button key={fc} className="chip" aria-pressed={f.facing === fc} onClick={() => toggle('facing', fc)}><Compass className="size-3.5" />{cap(fc)}</button>)}
        <button className="chip" aria-pressed={!!f.corner} onClick={() => toggle('corner', true)}><CornerDownRight className="size-3.5" />Corner</button>
        <label className="ml-auto flex items-center gap-2 text-[13px] text-ink-2">
          Budget up to <b className="num text-ink">{lakh(f.maxPrice || maxP)}</b>
          <input type="range" min={minP} max={maxP} step={50000} value={f.maxPrice || maxP} onChange={(e) => setF((x) => ({ ...x, maxPrice: Number(e.target.value) >= maxP ? null : Number(e.target.value) }))}
            className="w-32 accent-[var(--accent)]" aria-label="Maximum price" />
        </label>
        {active && <button className="btn btn-ghost btn-sm" onClick={() => setF({})}><X className="size-3.5" />Clear</button>}
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="overflow-hidden rounded-[22px] border border-line">
          <SiteView plots={plots} layout={layout} progress={progress} matches={match} selectedId={sel} onSelect={(p) => setSel(p.id)} labels
            height="min(70vh, 620px)" autoRotate={false} zoom="close" />
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line bg-surface px-4 py-2.5">
            <Legend /><span className="text-[12px] text-ink-3">Drag to rotate · scroll or pinch to zoom · tap a plot</span>
          </div>
        </div>

        <div className={mode === 'chat' ? 'card grid content-start gap-3 p-4 lg:sticky lg:top-24' : 'hidden'}>
          <div className="flex items-center justify-between gap-2"><div className="flex items-center gap-2 font-semibold"><Sparkles className="size-4 text-accent" />Plot matchmaker</div>
            <button className="btn btn-ghost btn-sm !p-1.5" onClick={() => setMode('plot')} aria-label="Close matchmaker"><X className="size-4" /></button></div>
          <AssistantChat endpoint="/api/ai/match" extra={{ projectId: project.id }} languages height="min(46dvh, 420px)"
            greeting={'Tell me what you are looking for — budget, size, facing, near the park, vastu, for a home or an investment. Hindi or Kannada is fine too.'}
            suggestions={['East facing under 35 lakh', '30x40 near the park', 'Corner plot for investment', 'Vastu plot, quiet street, 40-50 L']}
            placeholder="e.g. 1200 sq ft east facing under 32 lakh"
            onResult={(d) => { const m = (d.matches as AIMatch[] | undefined) || []; if (m.length) { setAiIds(m.map((x) => x.id)); setSel(m[0]!.id); } }}
            renderExtras={(d) => { const m = (d.matches as AIMatch[] | undefined) || []; return m.length ? (
              <div className="grid gap-1.5">{m.slice(0, 4).map((x) => (
                <button key={x.id} onClick={() => pick(x.id)} className="rounded-xl border border-line bg-surface p-2.5 text-left text-[12.5px] transition-colors hover:border-accent">
                  <div className="flex items-center justify-between gap-2"><b className="text-[14px]">{x.plot_number}</b><span className="num font-semibold">{lakh(x.price)}</span></div>
                  <div className="text-ink-2">{x.reasons.slice(0, 3).join(' · ')}</div>
                  {x.caveats[0] && <div className="text-warn">{x.caveats[0]}</div>}
                  <div className="mt-1 flex items-center gap-1.5"><span className="h-1 w-16 overflow-hidden rounded-full bg-surface-2"><span className="block h-full rounded-full bg-accent" style={{ width: `${x.score}%` }} /></span><span className="num text-[11px] text-ink-3">match {x.score}</span></div>
                </button>
              ))}</div>
            ) : null; }} />
          <p className="text-[11.5px] text-ink-3">Picks are ranked from the real plot data. Prices and availability are live.</p>
        </div>
        <AnimatePresence mode="wait">
          {mode === 'chat' ? null : selected ? (
            <motion.aside key={selected.id} initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} transition={{ type: 'spring', stiffness: 300, damping: 28 }}
              className="card grid content-start gap-4 p-5 lg:sticky lg:top-24">
              <div className="flex items-start justify-between gap-3">
                <div><div className="eyebrow">Plot</div><div className="font-display text-[34px] font-bold leading-none">{selected.plot_number}</div></div>
                <PlotPill status={liveStatus(selected)} />
              </div>
              <div>
                <div className="num text-[26px] font-semibold">{inr(selected.price)}</div>
                <div className="num text-[13px] text-ink-3">₹{rate(selected).toLocaleString('en-IN')} per sq ft</div>
              </div>
              <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-line bg-line text-[13px]">
                {[['Size', `${Number(selected.area_sqft)} sq ft`], ['Dimensions', selected.dimensions ? `${selected.dimensions} ft` : '—'], ['Facing', cap(selected.facing)], ['Corner', selected.is_corner ? 'Yes' : 'No']].map(([k, v]) => (
                  <div key={k} className="bg-surface p-3"><dt className="text-[11.5px] text-ink-3">{k}</dt><dd className="font-semibold">{v}</dd></div>
                ))}
              </dl>
              <div className="rounded-xl bg-accent-soft p-3 text-[13px] text-accent">Token to book: <b className="num">{inr(Math.round(Number(selected.price) * 0.1))}</b> (10%)</div>
              <div className="grid grid-cols-2 gap-2">
                <Link href={`/plots/${selected.id}`} className="btn btn-outline">Details <ArrowRight className="size-4" /></Link>
                <CompareToggle id={selected.id} number={selected.plot_number} />
              </div>
              <form action={holdPlot}>
                <input type="hidden" name="plotId" value={selected.id} />
                <SubmitButton className="btn btn-primary btn-lg w-full" disabled={liveStatus(selected) !== 'available'} pendingText="Holding plot…">
                  {liveStatus(selected) === 'available' ? 'Book this plot' : liveStatus(selected) === 'held' ? 'Someone is booking this' : 'Not available'}
                </SubmitButton>
              </form>
              <p className="text-[12px] text-ink-3">Booking holds the plot for 15 minutes while you verify your ID and pay.</p>
              {aiIds && <button className="btn btn-ghost btn-sm" onClick={() => setMode('chat')}><Sparkles className="size-4" />Back to the matchmaker</button>}
            </motion.aside>
          ) : (
            <motion.aside key="none" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="card paper grid content-center justify-items-center gap-2 p-8 text-center">
              <div className="grid size-12 place-items-center rounded-2xl bg-accent-soft text-accent"><Compass className="size-6" /></div>
              <div className="font-semibold">Tap a plot on the map</div>
              <p className="text-[13.5px] text-ink-2">Its price, size and facing show up here. Green plots are free to book right now.</p>
              <button className="btn btn-primary mt-2" onClick={() => setMode('chat')}><Sparkles className="size-4" />Or tell the AI what you need</button>
            </motion.aside>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
