'use client';
import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Pause, Play, Radio } from 'lucide-react';
import { SiteView } from './site-view';
import { MILESTONES } from '@/lib/site';
import { date } from '@/lib/format';
import type { PlotShape, Progress, SiteLayout } from '@/lib/types';

export type TimelineUpdate = {
  id: string; title: string; body: string | null; created_at: string;
  progress_percent: number | null; snapshot: Progress | null; milestone_key?: string | null;
};

/** 3D site that replays construction history: scrub or press play to watch it get built. */
export function ConstructionTimeline({ plots, layout, current, updates, height = 460, compact = false }: {
  plots: PlotShape[]; layout: SiteLayout; current: Progress; updates: TimelineUpdate[]; height?: number | string; compact?: boolean;
}) {
  const steps = useMemo(() => [...updates].sort((a, b) => +new Date(a.created_at) - +new Date(b.created_at)), [updates]);
  const last = steps.length; // index `last` = live state
  const [i, setI] = useState(last);
  const [playing, setPlaying] = useState(false);
  useEffect(() => { setI(steps.length); }, [steps.length]);
  useEffect(() => {
    if (!playing) return;
    const t = setTimeout(() => {
      setI((v) => {
        if (v >= last) { setPlaying(false); return last; }
        return v + 1;
      });
    }, i === -1 ? 900 : 1500);
    return () => clearTimeout(t);
  }, [playing, i, last]);

  const live = i >= last;
  const step = i >= 0 && i < last ? steps[i] : null;
  const progress: Progress = live ? current : i < 0 ? {} : (step?.snapshot || {});
  const overall = live
    ? weighted(current)
    : i < 0 ? 0 : Number(step?.progress_percent ?? 0);

  const overlay = (
    <div className="pointer-events-none absolute inset-x-3 bottom-3 z-10 flex flex-col gap-2 sm:inset-x-4 sm:bottom-4">
      <AnimatePresence mode="wait">
        <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.25 }}
          className="pointer-events-auto max-w-md rounded-2xl border border-line bg-surface/90 p-3.5 shadow-lg backdrop-blur-md">
          <div className="flex items-center justify-between gap-3">
            <span className="eyebrow flex items-center gap-1.5">
              {live ? <><Radio className="size-3.5 text-bad" /> Live today</> : i < 0 ? 'Before construction' : date(step!.created_at)}
            </span>
            <span className="num text-[15px] font-semibold">{overall.toFixed(0)}%</span>
          </div>
          <div className="mt-1 text-[14px] font-semibold leading-snug">
            {live ? 'Where the site stands now' : i < 0 ? 'Bare land, cleared and surveyed' : step!.title}
          </div>
          {!compact && step?.body && !live && <p className="mt-0.5 line-clamp-2 text-[12.5px] text-ink-2">{step.body}</p>}
          {!compact && (
            <div className="mt-2.5 grid grid-cols-7 gap-1.5">
              {MILESTONES.map((m) => {
                const v = Number(progress[m.key] ?? 0);
                return (
                  <div key={m.key} title={`${m.label}: ${v.toFixed(0)}%`}>
                    <div className="h-1.5 overflow-hidden rounded-full bg-surface-2">
                      <motion.div className="h-full rounded-full" style={{ background: m.color }} animate={{ width: `${v}%` }} transition={{ duration: 0.8 }} />
                    </div>
                    <div className="mt-1 truncate text-[10px] text-ink-3">{m.label}</div>
                  </div>
                );
              })}
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );

  return (
    <div className="overflow-hidden rounded-[22px] border border-line bg-surface shadow-sm">
      <SiteView plots={plots} layout={layout} progress={progress} height={height} overlay={overlay} autoRotate />
      <div className="flex items-center gap-3 border-t border-line px-3 py-2.5 sm:px-4">
        <button className="btn btn-primary btn-sm shrink-0 !rounded-full !px-3" onClick={() => { if (!playing && i >= last) setI(-1); setPlaying((p) => !p); }}
          aria-label={playing ? 'Pause replay' : 'Replay construction'}>
          {playing ? <Pause className="size-4" /> : <Play className="size-4" />}{playing ? 'Pause' : 'Replay'}
        </button>
        <div className="relative min-w-0 flex-1">
          <input type="range" min={-1} max={last} value={i} onChange={(e) => { setPlaying(false); setI(Number(e.target.value)); }}
            className="w-full accent-[var(--accent)]" aria-label="Construction timeline" />
          <div className="pointer-events-none absolute inset-x-[7px] top-[19px] hidden justify-between sm:flex">
            {[-1, ...steps.map((_, k) => k), last].map((k) => <span key={k} className={'h-1.5 w-px ' + (k <= i ? 'bg-accent' : 'bg-line')} />)}
          </div>
        </div>
        <span className="hidden shrink-0 text-[12px] text-ink-3 sm:inline">{steps.length} updates</span>
      </div>
    </div>
  );
}

const WEIGHTS: Record<string, number> = { compound_wall: 1, roads: 3, drains: 2, electrical: 2, water_tank: 1, park: 1, clubhouse: 1.5 };
function weighted(p: Progress) {
  let s = 0, w = 0;
  for (const [k, wt] of Object.entries(WEIGHTS)) { if (k in p) { s += wt * Number(p[k as keyof Progress] ?? 0); w += wt; } }
  return w ? s / w : 0;
}
