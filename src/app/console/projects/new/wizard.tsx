'use client';
import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft, ArrowRight, Check, Loader2, Plus, Trash2 } from 'lucide-react';
import { useToast } from '@/components/ui/toast';
import { FloorPlan } from '@/components/flats/floor-plan';
import { TEMPLATES, type TemplateKey } from '@/lib/flats/templates';
import { lakh } from '@/lib/format';
import { createProject } from '../../ops-actions';

type Tower = { code: string; floors: number; stacks: string[]; frontFacing: string; rot: number };
const FACINGS = ['east', 'north', 'south', 'west', 'north_east', 'south_east'];

export function NewProjectWizard({ welcome }: { welcome: boolean }) {
  const [step, setStep] = useState(0);
  const [kind, setKind] = useState<'plots' | 'apartments'>('apartments');
  const [b, setB] = useState({ name: '', city: 'Bengaluru', address: '', description: '', rera: '', possession: '', publish: false });
  const [g, setG] = useState({ blocks: 3, rows: 4, perRow: 8, widthFt: 30, depthFt: 40, rate: 2600, cornerPct: 8, eastPct: 5 });
  const [types, setTypes] = useState<{ code: string; template: TemplateKey; rate: number; on: boolean }[]>([
    { code: '2BHK', template: '2bhk', rate: 6400, on: true }, { code: '3BHK', template: '3bhk', rate: 6250, on: true },
  ]);
  const [towers, setTowers] = useState<Tower[]>([{ code: 'A', floors: 14, stacks: ['3BHK', '2BHK', '2BHK', '3BHK'], frontFacing: 'east', rot: 90 }]);
  const [pricing, setPricing] = useState({ floorRise: 35, plc: 150, corner: 75 });
  const [pending, start] = useTransition();
  const toast = useToast();
  const router = useRouter();
  const onTypes = types.filter((t) => t.on);
  const steps = ['What are you building?', 'Project details', kind === 'plots' ? 'Plots' : 'Towers and flats', 'Review'];

  const summary = useMemo(() => {
    if (kind === 'plots') {
      const n = g.blocks * g.rows * g.perRow, area = g.widthFt * g.depthFt, low = area * g.rate, high = low * (1 + g.cornerPct / 100);
      return { count: n, low, high, label: `${n} plots of ${area} sq ft` };
    }
    let n = 0, low = Infinity, high = 0;
    for (const t of towers) for (let f = 1; f <= t.floors; f++) for (const code of t.stacks) {
      const ty = types.find((x) => x.code === code); if (!ty) continue;
      const T = TEMPLATES[ty.template];
      const p = T.super * (ty.rate + pricing.floorRise * (f - 1)); n++; low = Math.min(low, p); high = Math.max(high, p * 1.04 + T.super * (pricing.plc + pricing.corner));
    }
    return { count: n, low: n ? low : 0, high, label: `${n} flats in ${towers.length} tower${towers.length === 1 ? '' : 's'}` };
  }, [kind, g, towers, types, pricing]);

  const valid = step === 1 ? b.name.trim().length >= 3 : step === 2 ? (kind === 'plots' ? summary.count > 0 && summary.count <= 600 : onTypes.length > 0 && towers.length > 0 && towers.every((t) => t.code && t.floors > 0 && t.floors <= 60 && t.stacks.length > 0 && t.stacks.every((s) => onTypes.some((x) => x.code === s))) && summary.count <= 2000) : true;
  const create = () => start(async () => {
    const r = await createProject({ kind, ...b, possession: b.possession || null, plots: kind === 'plots' ? g : undefined, towers: kind === 'apartments' ? towers : undefined,
      types: kind === 'apartments' ? onTypes.map(({ code, template, rate }) => ({ code, template, rate })) : undefined, pricing });
    if (!r.ok) { toast(r.error || 'Could not create the project', 'error'); return; }
    toast(r.message || 'Project created');
    router.push('/console');
    router.refresh();
  });
  const setTower = (i: number, p: Partial<Tower>) => setTowers((ts) => ts.map((t, k) => (k === i ? { ...t, ...p } : t)));

  return (
    <div className="grid gap-5">
      {welcome && <div className="glass rounded-[22px] p-4 text-[14px]">🎉 Your company is set up. Add your first project; you can change everything later.</div>}
      <ol className="flex flex-wrap gap-2">
        {steps.map((s, i) => (
          <li key={s} className={'flex items-center gap-2 rounded-full px-3 py-1.5 text-[12.5px] font-semibold ' + (i === step ? 'bg-accent text-[var(--accent-ink)]' : i < step ? 'bg-accent-soft text-accent' : 'glass text-ink-3')}>
            {i < step ? <Check className="size-3.5" /> : <span className="num">{i + 1}</span>}{s}
          </li>
        ))}
      </ol>
      <AnimatePresence mode="wait">
        <motion.div key={step} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.2 }} className="card grid gap-4 p-5 sm:p-6">
          {step === 0 && (
            <div className="grid gap-3 sm:grid-cols-2">
              {([['apartments', '🏢', 'Apartments', 'Towers with floors and flats. You get a 3D tower view, a 3D walk-through of every flat, and construction-linked payments.'],
                ['plots', '🗺️', 'Plotted layout', 'A gated layout of plots. You get a 3D site map that grows as roads, drains and amenities are built.']] as const).map(([k, e, t, d]) => (
                <button key={k} type="button" onClick={() => setKind(k)} aria-pressed={kind === k}
                  className={'rounded-[20px] border p-5 text-left transition ' + (kind === k ? 'border-accent bg-accent-soft' : 'border-[var(--glass-line)] bg-[var(--glass)] hover:border-[color-mix(in_srgb,var(--accent)_35%,transparent)]')}>
                  <span className="text-[30px]" aria-hidden>{e}</span><div className="mt-1 text-[17px] font-bold">{t}</div><p className="mt-1 text-[13px] text-ink-2">{d}</p>
                </button>
              ))}
            </div>
          )}
          {step === 1 && (
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2"><label className="label" htmlFor="pn">Project name</label><input id="pn" className="input" value={b.name} onChange={(e) => setB({ ...b, name: e.target.value })} placeholder={kind === 'apartments' ? 'Rao Residency' : 'Rao Gardens'} autoFocus /></div>
              <div><label className="label" htmlFor="pc">City</label><input id="pc" className="input" value={b.city} onChange={(e) => setB({ ...b, city: e.target.value })} /></div>
              <div><label className="label" htmlFor="pr">RERA number</label><input id="pr" className="input num" value={b.rera} onChange={(e) => setB({ ...b, rera: e.target.value })} placeholder="PRM/KA/RERA/1251/…" /></div>
              <div className="sm:col-span-2"><label className="label" htmlFor="pa">Site address</label><input id="pa" className="input" value={b.address} onChange={(e) => setB({ ...b, address: e.target.value })} /></div>
              <div className="sm:col-span-2"><label className="label" htmlFor="pd">Describe it to buyers</label><textarea id="pd" className="input min-h-[80px]" value={b.description} onChange={(e) => setB({ ...b, description: e.target.value })} placeholder="Two towers of 2 and 3 BHK homes around a central park, 10 minutes from the airport road…" /></div>
              <div><label className="label" htmlFor="pp">Promised possession</label><input id="pp" type="date" className="input" value={b.possession} onChange={(e) => setB({ ...b, possession: e.target.value })} /></div>
            </div>
          )}
          {step === 2 && kind === 'plots' && (
            <div className="grid gap-3 sm:grid-cols-4">
              {([['blocks', 'Blocks'], ['rows', 'Rows per block'], ['perRow', 'Plots per row'], ['widthFt', 'Plot width (ft)'], ['depthFt', 'Plot depth (ft)'], ['rate', 'Base rate (₹/sq ft)'], ['cornerPct', 'Corner premium %']] as const).map(([k, l]) => (
                <div key={k}><label className="label" htmlFor={k}>{l}</label><input id={k} type="number" className="input num" value={g[k]} min={1} onChange={(e) => setG({ ...g, [k]: Number(e.target.value) })} /></div>
              ))}
              <p className="text-[13px] text-ink-2 sm:col-span-4">The layout is drawn as a simple grid you can refine later. Plot numbers run A-01, A-02… per block.</p>
            </div>
          )}
          {step === 2 && kind === 'apartments' && (
            <div className="grid gap-5">
              <div>
                <div className="mb-2 text-[14px] font-bold">Flat types</div>
                <div className="grid gap-3 md:grid-cols-2">
                  {types.map((t, i) => { const T = TEMPLATES[t.template]; return (
                    <div key={t.code} className={'rounded-[18px] border p-3 ' + (t.on ? 'border-accent bg-[var(--glass)]' : 'border-[var(--glass-line)] opacity-60')}>
                      <label className="flex items-center justify-between gap-2 text-[14px] font-semibold"><span>{T.name} <span className="font-normal text-ink-3">· {T.carpet} carpet / {T.super} super sq ft</span></span>
                        <input type="checkbox" checked={t.on} onChange={(e) => setTypes((ts) => ts.map((x, k) => (k === i ? { ...x, on: e.target.checked } : x)))} className="size-4 accent-[var(--accent)]" /></label>
                      <div className="my-2 rounded-xl bg-surface-2 p-1"><FloorPlan layout={T.layout} furniture labels compact /></div>
                      <label className="flex items-center gap-2 text-[13px]">Base rate ₹<input type="number" className="input num !w-28 !py-1" value={t.rate} onChange={(e) => setTypes((ts) => ts.map((x, k) => (k === i ? { ...x, rate: Number(e.target.value) } : x)))} />/sq ft</label>
                    </div>
                  ); })}
                </div>
              </div>
              <div>
                <div className="mb-2 flex items-center justify-between"><span className="text-[14px] font-bold">Towers</span>
                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => setTowers((ts) => [...ts, { code: String.fromCharCode(65 + ts.length), floors: 12, stacks: ['2BHK', '2BHK', '2BHK', '2BHK'], frontFacing: 'south', rot: 0 }])}><Plus className="size-4" />Add tower</button></div>
                <div className="grid gap-3">
                  {towers.map((t, i) => (
                    <div key={i} className="grid gap-3 rounded-[18px] border border-[var(--glass-line)] bg-[var(--glass)] p-3 sm:grid-cols-[80px_90px_1fr_150px_36px] sm:items-end">
                      <div><label className="label" htmlFor={`tc-${i}`}>Tower</label><input id={`tc-${i}`} className="input num uppercase" value={t.code} maxLength={2} onChange={(e) => setTower(i, { code: e.target.value.toUpperCase() })} /></div>
                      <div><label className="label" htmlFor={`tf-${i}`}>Floors</label><input id={`tf-${i}`} type="number" min={1} max={60} className="input num" value={t.floors} onChange={(e) => setTower(i, { floors: Number(e.target.value) })} /></div>
                      <div><div className="label">Flats on each floor, left to right</div>
                        <div className="flex flex-wrap items-center gap-1.5">{t.stacks.map((s, k) => (
                          <select key={k} aria-label={`Flat ${k + 1}`} className="input !w-auto !py-1.5 text-[13px]" value={s} onChange={(e) => setTower(i, { stacks: t.stacks.map((x, j) => (j === k ? e.target.value : x)) })}>{onTypes.map((ty) => <option key={ty.code}>{ty.code}</option>)}</select>
                        ))}
                          <button type="button" className="btn btn-ghost btn-sm !px-2" onClick={() => setTower(i, { stacks: [...t.stacks, onTypes[0]?.code ?? '2BHK'] })} disabled={t.stacks.length >= 8} aria-label="Add a flat per floor"><Plus className="size-4" /></button>
                          <button type="button" className="btn btn-ghost btn-sm !px-2" onClick={() => setTower(i, { stacks: t.stacks.slice(0, -1) })} disabled={t.stacks.length <= 1} aria-label="Remove a flat per floor">−</button></div></div>
                      <div><label className="label" htmlFor={`tff-${i}`}>Front balconies face</label><select id={`tff-${i}`} className="input" value={t.frontFacing} onChange={(e) => setTower(i, { frontFacing: e.target.value })}>{FACINGS.map((f) => <option key={f} value={f}>{f.replace('_', ' ')}</option>)}</select></div>
                      <button type="button" className="btn btn-ghost btn-sm !px-2" onClick={() => setTowers((ts) => ts.filter((_, k) => k !== i))} disabled={towers.length === 1} aria-label="Remove tower"><Trash2 className="size-4" /></button>
                    </div>
                  ))}
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                <div><label className="label" htmlFor="fr">Floor rise (₹/sq ft per floor)</label><input id="fr" type="number" className="input num" value={pricing.floorRise} onChange={(e) => setPricing({ ...pricing, floorRise: Number(e.target.value) })} /></div>
                <div><label className="label" htmlFor="plc">Park-view premium (₹/sq ft)</label><input id="plc" type="number" className="input num" value={pricing.plc} onChange={(e) => setPricing({ ...pricing, plc: Number(e.target.value) })} /></div>
                <div><label className="label" htmlFor="cp">Corner premium (₹/sq ft)</label><input id="cp" type="number" className="input num" value={pricing.corner} onChange={(e) => setPricing({ ...pricing, corner: Number(e.target.value) })} /></div>
              </div>
            </div>
          )}
          {step === 3 && (
            <div className="grid gap-3 text-[14px]">
              <div className="flex items-center gap-3"><span className="emoji-badge" aria-hidden>{kind === 'apartments' ? '🏢' : '🗺️'}</span><div><div className="text-[18px] font-bold">{b.name}</div><div className="text-ink-2">{b.city}{b.rera ? ` · RERA ${b.rera}` : ' · RERA number not added yet'}</div></div></div>
              <div className="grid gap-2 sm:grid-cols-3">
                <div className="rounded-2xl bg-[var(--glass)] p-3"><div className="text-[12px] text-ink-3">Inventory</div><div className="font-semibold">{summary.label}</div></div>
                <div className="rounded-2xl bg-[var(--glass)] p-3"><div className="text-[12px] text-ink-3">Price range</div><div className="num font-semibold">{lakh(summary.low)} to {lakh(summary.high)}</div></div>
                <div className="rounded-2xl bg-[var(--glass)] p-3"><div className="text-[12px] text-ink-3">Payment plan</div><div className="font-semibold">{kind === 'apartments' ? 'Construction-linked, 8 stages' : 'Company plan'}</div></div>
              </div>
              <label className="flex items-start gap-2 rounded-2xl border border-[var(--glass-line)] p-3"><input type="checkbox" className="mt-1 size-4 accent-[var(--accent)]" checked={b.publish} onChange={(e) => setB({ ...b, publish: e.target.checked })} />
                <span><b>Publish to buyers now</b><span className="block text-[13px] text-ink-2">Leave this off to set prices and upload documents first. You can publish any time from Settings.</span></span></label>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
      <div className="flex justify-between gap-2">
        <button type="button" className="btn btn-ghost" onClick={() => setStep((s) => s - 1)} disabled={step === 0 || pending}><ArrowLeft className="size-4" />Back</button>
        {step < 3
          ? <button type="button" className="btn btn-primary" onClick={() => setStep((s) => s + 1)} disabled={!valid}>Next<ArrowRight className="size-4" /></button>
          : <button type="button" className="btn btn-primary" onClick={create} disabled={pending}>{pending ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}Create project</button>}
      </div>
    </div>
  );
}
