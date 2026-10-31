import Link from 'next/link';
import { Box, Building, CalendarClock, CheckCircle2, KeyRound, MapPin, ShieldCheck, Sparkles } from 'lucide-react';
import type { createClient } from '@/lib/supabase/server';
import { loadApartments, projectPlan } from '@/lib/flats/queries';
import { STAGE_LABEL, STAGE_WEIGHT, stagesOf, towerPace, towerPercent, floorForecast, type StageKey } from '@/lib/flats/tower';
import { liveStatus } from '@/lib/site';
import { date, lakh } from '@/lib/format';
import { TowerView } from '@/components/three/tower-view';
import { FloorPlan } from '@/components/flats/floor-plan';
import { EnquiryButton } from '@/components/buyer/enquiry';
import { Item, ProgressBar, ProgressRing, Stagger } from '@/components/ui/motion';

type Project = { id: string; name: string; slug: string; city: string; description: string | null; rera_number: string | null; progress_percent: number | string; possession_date: string | null; amenities: string[] | null; payment_plan: unknown };

/** The top of an apartment project's page: towers in 3D, availability, tower progress, floor plans. */
export async function ApartmentOverview({ supabase, project, profile }: { supabase: Awaited<ReturnType<typeof createClient>>; project: Project; profile: { full_name: string | null; phone: string | null; email: string | null } | null }) {
  const d = await loadApartments(supabase, project.id);
  const avail = d.flats.filter((f) => liveStatus(f) === 'available');
  const from = avail.length ? Math.min(...avail.map((f) => f.price)) : null;
  const plan = projectPlan(project);
  return (
    <>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.55fr)_minmax(300px,0.75fr)]">
        <div className="overflow-hidden rounded-[22px] border border-line">
          <TowerView towers={d.towers} flats={d.flats} types={d.types} height="min(64vh, 560px)" />
        </div>
        <Stagger className="grid content-start gap-4">
          <Item>
            <div className="eyebrow flex items-center gap-1.5"><MapPin className="size-3.5" />{project.city} · Apartments</div>
            <h1 className="mt-1 text-[32px] font-bold leading-tight">{project.name}</h1>
            <p className="mt-2 text-[14.5px] leading-relaxed text-ink-2">{project.description}</p>
          </Item>
          <Item className="card grid grid-cols-[auto_1fr] items-center gap-4 p-4">
            <ProgressRing value={Number(project.progress_percent)} size={72} stroke={7} />
            <div><div className="font-semibold">Construction progress</div>
              <div className="text-[13px] text-ink-2">{d.updates[0] ? <>Last update {date(d.updates[0].created_at)}: {d.updates[0].title}</> : 'Work starting soon'}</div></div>
          </Item>
          <Item className="grid grid-cols-3 gap-2">
            {[['Available', avail.length, 'text-available'], ['Total flats', d.flats.length, ''], ['From', from ? lakh(from) : '—', '']].map(([l, v, c]) => (
              <div key={l as string} className="rounded-2xl bg-surface-2 p-3"><div className={'num text-[17px] font-semibold ' + c}>{v}</div><div className="text-[12px] text-ink-3">{l}</div></div>
            ))}
          </Item>
          <Item className="grid gap-2 rounded-2xl border border-line p-3 text-[13px]">
            <div className="flex items-center gap-2"><ShieldCheck className="size-5 shrink-0 text-good" /><div><div className="font-semibold">RERA registered</div><div className="num text-[12px] text-ink-2">{project.rera_number}</div></div></div>
            {project.possession_date && <div className="flex items-center gap-2"><KeyRound className="size-5 shrink-0 text-accent" /><div><div className="font-semibold">Possession promised</div><div className="text-[12px] text-ink-2">{date(project.possession_date)}</div></div></div>}
          </Item>
          <Item className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
            <Link href={`/projects/${project.slug}/flats`} className="btn btn-primary btn-lg"><Box className="size-4" />Explore flats in 3D</Link>
            <Link href={`/projects/${project.slug}/flats?ai=1`} className="btn btn-outline btn-lg"><Sparkles className="size-4" />Find my flat with AI</Link>
            <EnquiryButton projectId={project.id} className="btn btn-outline btn-lg" defaults={{ name: profile?.full_name, phone: profile?.phone, email: profile?.email }} />
          </Item>
        </Stagger>
      </div>

      <section>
        <h2 className="mb-3 text-[20px] font-bold">Towers on site</h2>
        <div className="grid gap-4 md:grid-cols-2">
          {d.towers.map((t) => {
            const s = stagesOf(t), pct = towerPercent(t), pace = towerPace(t, d.snaps[t.id] || []), fc = floorForecast(t, t.floors, pace);
            const tf = d.flats.filter((f) => f.tower_id === t.id), ta = tf.filter((f) => liveStatus(f) === 'available').length;
            return (
              <div key={t.id} className="card grid gap-3 p-5">
                <div className="flex items-start justify-between gap-3">
                  <div><div className="flex items-center gap-2 text-[17px] font-bold"><Building className="size-5 text-accent" />{t.name}</div>
                    <div className="text-[13px] text-ink-2">{t.floors} floors · {t.units_per_floor} flats a floor · {ta} of {tf.length} available</div></div>
                  <ProgressRing value={pct} size={56} stroke={6}><span className="num text-[12px] font-semibold">{Math.round(pct)}%</span></ProgressRing>
                </div>
                <ul className="grid gap-2 text-[12.5px]">
                  {(Object.keys(STAGE_WEIGHT) as StageKey[]).map((k) => (
                    <li key={k} className="grid grid-cols-[150px_1fr_42px] items-center gap-2">
                      <span className="text-ink-2">{STAGE_LABEL[k]}</span><ProgressBar value={s[k]} className="h-1.5" /><span className="num text-right">{Math.round(s[k])}%</span>
                    </li>
                  ))}
                </ul>
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-[12.5px] text-ink-2">
                  <span className="flex items-center gap-1"><CheckCircle2 className="size-3.5 text-good" />{t.slabs_cast} of {t.floors} slabs cast</span>
                  {fc.slab && <span className="flex items-center gap-1"><CalendarClock className="size-3.5" />Roof slab ~{fc.slab.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}</span>}
                  {t.expected_completion && <span className="flex items-center gap-1"><KeyRound className="size-3.5" />Developer’s target {date(t.expected_completion)}</span>}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-[20px] font-bold">Floor plans</h2>
        <div className="grid gap-4 md:grid-cols-2">
          {d.types.map((ty) => {
            const of = d.flats.filter((f) => f.unit_type_id === ty.id);
            const av = of.filter((f) => liveStatus(f) === 'available').sort((a, b) => a.price - b.price);
            return (
              <div key={ty.id} className="card grid gap-3 p-5">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h3 className="text-[17px] font-bold">{ty.name}</h3>
                  <span className="num text-[13px] text-ink-2">{ty.carpet_sqft} sq ft carpet · {ty.super_sqft} super</span>
                </div>
                <div className="rounded-2xl border border-line bg-surface-2 p-2"><FloorPlan layout={ty.layout} className="w-full" /></div>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-[13px] text-ink-2">{av.length} available{av[0] ? <> · from <b className="num text-ink">{lakh(av[0].price)}</b></> : ''}</span>
                  {av[0] && <Link href={`/flats/${av[0].id}`} className="btn btn-outline btn-sm"><Box className="size-4" />Walk through it in 3D</Link>}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
        <section className="card p-5">
          <h2 className="mb-1 text-[18px] font-bold">Pay as the building rises</h2>
          <p className="mb-3 text-[13px] text-ink-2">A construction-linked plan: each part falls due only when that stage is built and certified.</p>
          <ol className="grid gap-1.5 text-[13px]">
            {plan.map((s, i) => <li key={i} className="flex justify-between gap-3"><span><span className="num mr-2 text-ink-3">{i + 1}.</span>{s.label}</span><b className="num">{s.pct}%</b></li>)}
          </ol>
        </section>
        <section className="card p-5">
          <h2 className="mb-3 text-[18px] font-bold">Amenities</h2>
          <ul className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-[13px]">{(project.amenities || []).map((a) => <li key={a} className="flex items-center gap-1.5"><CheckCircle2 className="size-3.5 shrink-0 text-good" />{a}</li>)}</ul>
        </section>
      </div>
    </>
  );
}
