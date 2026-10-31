import Link from 'next/link';
import { notFound } from 'next/navigation';
import { AlertTriangle, ArrowLeft, Building2, CalendarClock, CheckCircle2, Circle, HardHat, KeyRound, TrendingUp } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { getSession } from '@/lib/auth';
import { liveStatus } from '@/lib/site';
import { cap, date, inr, lakh } from '@/lib/format';
import { friendly } from '@/lib/actions';
import { asFlat, asTower, asUnitType, FLAT_FIELDS, projectPlan, projectPricing } from '@/lib/flats/queries';
import { mirrorLayout, type Layout } from '@/lib/flats/layout';
import { FACING_DEG } from '@/lib/flats/tower';
import { FLOOR_STAGE, floorForecast, floorStage, ordinal, planStatus, priceBreakup, rentalYield, towerPace, towerPercent, unitLabel } from '@/lib/flats/tower';
import { priceOutlook, propertyChecklist } from '@/lib/ai/outlook';
import type { ProjectSummary } from '@/lib/ai/nearby';
import { FlatTour } from '@/components/flats/flat-tour';
import { FloorPlan } from '@/components/flats/floor-plan';
import { TowerView } from '@/components/three/tower-view';
import { PriceChart } from '@/components/charts/price-chart';
import { PlotPill } from '@/components/ui/bits';
import { EnquiryButton } from '@/components/buyer/enquiry';
import { CompareBar, CompareToggle } from '@/components/buyer/compare-toggle';
import { SubmitButton } from '@/components/ui/action-form';
import { LiveRefresh } from '@/components/live-refresh';
import { holdPlot } from '@/app/actions';
import { Checklist, OutlookFan, OutlookTable } from '@/components/ai/outlook';
import { CostPlanner } from '@/components/ai/cost-planner';
import { TrackView } from '@/components/ai/track-view';

const VIEW_LABEL: Record<string, string> = { park: 'Park view', pool: 'Pool view', garden: 'Garden view', road: 'Road view' };

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data } = await supabase.from('plots').select('plot_number').eq('id', id).maybeSingle();
  return { title: data ? `Flat ${data.plot_number}` : 'Flat' };
}

export default async function FlatPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ error?: string }> }) {
  const { id } = await params;
  const { error } = await searchParams;
  const supabase = await createClient();
  const { data: row } = await supabase.from('plots').select(FLAT_FIELDS).eq('id', id).maybeSingle();
  if (!row || row.kind !== 'flat' || !row.tower_id || !row.unit_type_id) notFound();
  const flat = asFlat(row as Record<string, unknown>);
  const [{ data: project }, { data: t }, { data: u }, { data: history }, { data: snaps }, { profile }] = await Promise.all([
    supabase.from('projects').select('*').eq('id', flat.project_id).single(),
    supabase.from('towers').select('*').eq('id', flat.tower_id!).single(),
    supabase.from('unit_types').select('*').eq('id', flat.unit_type_id!).single(),
    supabase.from('plot_price_history').select('price, changed_at').eq('plot_id', id).order('changed_at'),
    supabase.from('construction_updates').select('id, title, body, created_at, tower_snapshot').eq('tower_id', flat.tower_id!).order('created_at', { ascending: false }),
    getSession(),
  ]);
  if (!project || !t || !u) notFound();
  const [{ data: org }, { data: factors }, { data: docs }, { data: stats }, doneRes, { data: towerFlats }, { data: allTypes }] = await Promise.all([
    supabase.from('organizations').select('name, phone, gst_number, token_percent, is_verified, payment_plan').eq('id', flat.org_id).single(),
    supabase.from('market_factors').select('label, kind, status, impact_pct, value, expected_year, source').eq('project_id', flat.project_id).order('sort_order'),
    supabase.from('documents').select('category').eq('project_id', flat.project_id).eq('visibility', 'public'),
    supabase.from('project_stats').select('total_plots, booked, sold').eq('project_id', flat.project_id).maybeSingle(),
    supabase.from('projects').select('id', { count: 'exact', head: true }).eq('org_id', flat.org_id).eq('status', 'completed'),
    supabase.from('plots').select(FLAT_FIELDS).eq('tower_id', flat.tower_id!),
    supabase.from('unit_types').select('id, code, name, layout').eq('project_id', flat.project_id),
  ]);
  const tower = asTower(t as Record<string, unknown>), type = asUnitType(u as Record<string, unknown>);
  const floor = flat.floor ?? 1;
  const pricing = projectPricing(project);
  const plan = projectPlan(project, org?.payment_plan);
  const pace = towerPace(tower, (snaps || []).map((s) => ({ created_at: s.created_at, tower_snapshot: s.tower_snapshot })));
  const stage = floorStage(tower, floor);
  const fc = floorForecast(tower, floor, pace);
  const steps = planStatus(plan, tower, pace, null);
  const pb = priceBreakup(flat, type, pricing);
  const rentF = (factors || []).find((f) => f.kind === 'rent');
  const ry = rentalYield(flat.price, type.super_sqft, rentF?.value == null ? null : Number(rentF.value), pricing?.maintenance);
  const outlook = priceOutlook(flat.price, history || [], factors || []);
  const sum = project.ai_summary as unknown as ProjectSummary | null;
  const avail = (towerFlats || []).map((p) => asFlat(p as Record<string, unknown>)).filter((p) => liveStatus(p) === 'available');
  const checklist = propertyChecklist({
    rera: project.rera_number, approvals: (docs || []).filter((d) => d.category === 'approval' || d.category === 'rera').length,
    legal: (docs || []).filter((d) => d.category === 'legal').length, health: sum ? { planned: sum.planned, actual: sum.actual, state: sum.state, forecast: sum.forecast } : null,
    soldShare: stats ? (Number(stats.booked) + Number(stats.sold)) / Math.max(1, Number(stats.total_plots)) : 0,
    completedProjects: doneRes.count ?? 0, verifiedDeveloper: !!org?.is_verified,
    plotRate: pb.effectiveRate, avgRate: avail.length ? avail.reduce((a, p) => a + p.price / p.area_sqft, 0) / avail.length : pb.effectiveRate,
  });
  const status = liveStatus(flat);
  const first = Number(history?.[0]?.price ?? flat.price);
  const gain = Math.round((flat.price / first - 1) * 100);
  const tokenPct = Math.min(Number(org?.token_percent ?? 10), 10);
  const token = Math.round((flat.price * tokenPct) / 100);
  const label = unitLabel(flat);
  const pct = towerPercent(tower);
  const possession = project.possession_date ? new Date(project.possession_date) : null;
  const yearsToKeys = possession ? Math.max(0.5, (possession.getTime() - Date.now()) / (365.25 * 86400000)) : 2;
  const dueBeforeKeys = steps.filter((s) => s.label !== 'On possession').reduce((a, s) => a + s.pct, 0);
  const reachedPct = steps.filter((s) => s.reached).reduce((a, s) => a + s.pct, 0);
  const latest = snaps?.[0];
  const S = FLOOR_STAGE[stage];

  return (
    <div className="grid gap-6">
      <LiveRefresh tables={['plots', 'towers']} filter={`id=eq.${flat.id}`} every={20000} />
      <Link href={`/projects/${project.slug}/flats`} className="inline-flex w-fit items-center gap-1 text-[13px] text-ink-2 hover:text-ink"><ArrowLeft className="size-4" />Back to {project.name}</Link>

      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="eyebrow">{project.name} · {tower.name} · {ordinal(floor)} floor</div>
          <h1 className="font-display text-[40px] font-bold leading-none sm:text-[48px]">{label}</h1>
          <div className="mt-2 flex flex-wrap gap-1.5">
            <span className="tag">{type.name}</span><span className="tag num">{type.carpet_sqft} sq ft carpet</span><span className="tag num">{type.super_sqft} sq ft super</span>
            {flat.facing && <span className="tag">{cap(flat.facing.replace('_', ' '))}-facing balcony</span>}
            {flat.view && <span className="tag">{VIEW_LABEL[flat.view] ?? cap(flat.view)}</span>}
            {flat.is_corner && <span className="tag tag-accent">Corner flat</span>}
          </div>
        </div>
        <div className="text-right">
          <PlotPill status={status} />
          <div className="num mt-1 text-[30px] font-semibold">{inr(flat.price)}</div>
          <div className="flex items-center justify-end gap-3 text-[13px] text-ink-2"><span className="num">₹{pb.effectiveRate.toLocaleString('en-IN')}/sq ft</span>
            {gain > 0 && <span className="inline-flex items-center gap-1 font-semibold text-good"><TrendingUp className="size-4" />+{gain}% since launch</span>}</div>
        </div>
      </div>

      {error && <div className="flex gap-2 rounded-xl bg-[color-mix(in_srgb,var(--warn)_12%,transparent)] p-3 text-[13.5px] text-warn"><AlertTriangle className="mt-0.5 size-4 shrink-0" />{friendly({ message: error })}</div>}

      <FlatTour layout={type.layout} mirror={flat.mirror} facing={flat.facing} floor={floor} view={flat.view} stageToday={stage}
        forecast={{ structure: fc.slab, masonry: fc.masonry, services: fc.services, ready: fc.ready }} unitLabel={label} />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.3fr)_minmax(320px,0.7fr)]">
        <section className="card grid content-start gap-4 p-5">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-[18px] font-bold">Your floor on site today</h2>
            {latest && <span className="text-[12px] text-ink-3">Last site update {date(latest.created_at)}</span>}
          </div>
          <div className="grid gap-4 md:grid-cols-[220px_minmax(0,1fr)]">
            <div className="overflow-hidden rounded-2xl border border-line">
              <TowerView tower={tower} flats={(towerFlats || []).map((p) => asFlat(p as Record<string, unknown>))} types={(allTypes || []).map((x) => ({ id: x.id, layout: x.layout as unknown as Layout }))} selectedId={flat.id} height={300} compact />
            </div>
            <div className="grid content-start gap-3">
              <div className="flex items-start gap-3 rounded-2xl bg-surface-2 p-3">
                <HardHat className="mt-0.5 size-5 shrink-0 text-accent" />
                <div className="text-[13.5px]"><div className="font-semibold">{ordinal(floor)} floor: {S.label}</div><p className="text-ink-2">{S.now}</p>
                  {stage !== 'ready' && <p className="mt-1 text-ink-3">Next: {S.next}</p>}</div>
              </div>
              <ul className="grid gap-1.5 text-[13.5px]">
                {([['Slab cast', fc.slab, stage !== 'not_started'], ['Walls up', fc.masonry, ['masonry', 'services', 'ready'].includes(stage)], ['Electrical and plumbing', fc.services, ['services', 'ready'].includes(stage)], ['Interiors done', fc.ready, stage === 'ready'], ['Whole tower finished', fc.tower, false]] as const).map(([k, d, done]) => (
                  <li key={k} className="flex items-center justify-between gap-3">
                    <span className="flex items-center gap-2">{done ? <CheckCircle2 className="size-4 text-good" /> : <Circle className="size-4 text-ink-3" />}{k}</span>
                    <span className="num text-ink-2">{done ? 'Done' : d ? `~${d.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}` : 'Done'}</span>
                  </li>
                ))}
              </ul>
              <div>
                <div className="mb-1 flex justify-between text-[12.5px]"><span className="text-ink-2">{tower.name}: {tower.slabs_cast} of {tower.floors} slabs cast</span><b className="num">{pct}%</b></div>
                <div className="h-2 overflow-hidden rounded-full bg-surface-2"><div className="h-full rounded-full bg-accent" style={{ width: `${pct}%` }} /></div>
              </div>
              {possession && <div className="flex items-center gap-2 text-[13px] text-ink-2"><KeyRound className="size-4" />Promised possession <b className="text-ink">{date(possession)}</b>{project.rera_number && <span className="text-ink-3">· RERA {project.rera_number}</span>}</div>}
              <p className="text-[12px] text-ink-3">Dates are estimates from the tower’s actual pace in recent site updates, not promises. They move as work speeds up or slows down.</p>
            </div>
          </div>
        </section>

        <section className="card grid content-start gap-3 p-5">
          <div className="flex items-center justify-between text-[13.5px]"><span className="text-ink-2">Booking amount ({tokenPct}%)</span><b className="num">{inr(token)}</b></div>
          <form action={holdPlot}>
            <input type="hidden" name="plotId" value={flat.id} />
            <SubmitButton className="btn btn-primary btn-lg w-full" disabled={status !== 'available'} pendingText="Holding flat…">
              {status === 'available' ? 'Book this flat' : status === 'held' ? 'Someone is booking this flat' : 'Not available'}
            </SubmitButton>
          </form>
          <div className="grid grid-cols-2 gap-2">
            <EnquiryButton projectId={flat.project_id} plotId={flat.id} plotNumber={flat.plot_number} label="Ask / visit" className="btn btn-outline"
              defaults={{ name: profile?.full_name, phone: profile?.phone, email: profile?.email }} />
            <CompareToggle id={flat.id} number={flat.plot_number} />
          </div>
          <h3 className="mt-2 text-[15px] font-bold">How the price is built</h3>
          <ul className="divide-y divide-line text-[13.5px]">
            {[
              ['Base rate', `₹${pb.base.toLocaleString('en-IN')}/sq ft`],
              [`Floor rise (${ordinal(floor)} floor)`, pb.floorRise ? `+₹${pb.floorRise.toLocaleString('en-IN')}/sq ft` : '—'],
              [flat.view ? `${VIEW_LABEL[flat.view] ?? cap(flat.view)} premium` : 'Location premium', pb.plc ? `+₹${pb.plc}/sq ft` : '—'],
              ['Corner premium', pb.corner ? `+₹${pb.corner}/sq ft` : '—'],
              [`× ${pb.sq.toLocaleString('en-IN')} sq ft super area`, inr(pb.list)],
              ...(pb.revision ? [['Price revisions since launch', `${pb.revision > 0 ? '+' : ''}${pb.revision}%`]] : []),
              ['Car parking', `${pricing?.car_parks?.[String(type.bedrooms)] ?? 1} covered, included`],
              ['Maintenance (after handover)', pricing?.maintenance ? `₹${pricing.maintenance}/sq ft a month` : '—'],
              ['Stamp duty and registration', 'Extra, at registration'],
            ].map(([k, v]) => <li key={k} className="flex justify-between gap-3 py-1.5"><span className="text-ink-2">{k}</span><span className="num font-medium">{v}</span></li>)}
          </ul>
          <div className="flex items-start gap-3 rounded-2xl bg-surface-2 p-3">
            <Building2 className="mt-0.5 size-5 text-accent" />
            <div className="text-[13px]"><div className="font-semibold">{org?.name}</div><div className="text-ink-2">{org?.is_verified ? 'Verified developer' : 'Developer'} · {org?.phone}</div><div className="num text-[11.5px] text-ink-3">GST {org?.gst_number}</div></div>
          </div>
        </section>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.3fr)_minmax(320px,0.7fr)]">
        <section className="card grid content-start gap-3 p-5">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-[18px] font-bold">Pay as the building rises</h2>
            <span className="text-[12.5px] text-ink-2">Construction-linked plan · {reachedPct}% of stages already reached in {tower.name}</span>
          </div>
          <p className="text-[13px] text-ink-2">You pay each part only when that stage is actually built. If you book today, the stages already done fall due together; the rest wait for the site.</p>
          <div className="scroll-x">
            <table className="table text-[13px]">
              <thead><tr><th>Stage</th><th className="text-right">Share</th><th className="text-right">Amount</th><th className="text-right">When</th></tr></thead>
              <tbody>
                {steps.map((s, i) => (
                  <tr key={i}>
                    <td><div className="flex items-center gap-2">{s.reached ? <CheckCircle2 className="size-4 shrink-0 text-good" /> : <CalendarClock className="size-4 shrink-0 text-ink-3" />}<span>{s.label}{s.note && <span className="block text-[11.5px] text-ink-3">{s.note}</span>}</span></div></td>
                    <td className="num text-right">{s.pct}%</td>
                    <td className="num text-right">{inr((flat.price * s.pct) / 100)}</td>
                    <td className="num whitespace-nowrap text-right text-ink-2">{i === 0 ? 'At booking' : s.reached ? 'Due on booking' : s.expected ? `~${s.expected.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}` : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-[12px] text-ink-3">{dueBeforeKeys}% is paid during construction and the rest at handover. Expected dates come from the current pace on site.</p>
        </section>

        <section className="card grid content-start gap-3 p-5">
          <h2 className="text-[18px] font-bold">As an investment</h2>
          {ry ? (
            <ul className="divide-y divide-line text-[13.5px]">
              <li className="flex justify-between gap-3 py-1.5"><span className="text-ink-2">Expected rent after handover</span><b className="num">{inr(ry.rent)}/month</b></li>
              <li className="flex justify-between gap-3 py-1.5"><span className="text-ink-2">Gross rental yield</span><b className="num">{ry.gross}%</b></li>
              <li className="flex justify-between gap-3 py-1.5"><span className="text-ink-2">Net yield<span className="block text-[11.5px] text-ink-3">after maintenance, a month empty and upkeep</span></span><b className="num">{ry.net}%</b></li>
              <li className="flex justify-between gap-3 py-1.5"><span className="text-ink-2">Price at launch → today</span><span className="num">{lakh(first)} → {lakh(flat.price)}</span></li>
              <li className="flex justify-between gap-3 py-1.5"><span className="text-ink-2">Years until keys</span><span className="num">{yearsToKeys.toFixed(1)}</span></li>
            </ul>
          ) : <p className="text-[13px] text-ink-2">The developer has not published a rent assumption for this area yet.</p>}
          {rentF && <p className="text-[12px] text-ink-3">Rent assumption: ₹{Number(rentF.value)}/sq ft a month on super area{rentF.source ? ` (${rentF.source})` : ''}. Rents vary; check current listings nearby.</p>}
          <div className="mt-1 grid gap-2 rounded-2xl bg-surface-2 p-3 text-[12.5px]">
            <div className="font-semibold">Smaller ways in</div>
            {avail.filter((p) => p.id !== flat.id).sort((a, b) => a.price - b.price).slice(0, 3).map((p) => (
              <Link key={p.id} href={`/flats/${p.id}`} className="flex justify-between gap-2 hover:text-accent"><span>Flat {p.plot_number} · {ordinal(p.floor ?? 1)} floor</span><span className="num">{lakh(p.price)}</span></Link>
            ))}
          </div>
        </section>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.3fr)_minmax(320px,0.7fr)]">
        <section className="card grid content-start gap-3 p-5">
          <div className="flex flex-wrap items-baseline justify-between gap-2"><h2 className="text-[18px] font-bold">Price outlook: a range, not a promise</h2>
            <span className="text-[12px] text-ink-3">Scenarios from stated assumptions</span></div>
          <OutlookFan price={flat.price} o={outlook} />
          <div className="scroll-x"><OutlookTable o={outlook} /></div>
          <details className="text-[13px]"><summary className="cursor-pointer font-semibold">How this is worked out</summary>
            <ul className="mt-2 grid gap-1.5 text-ink-2">{outlook.assumptions.map((a, i) => <li key={i}>• {a}</li>)}</ul>
          </details>
          <p className="text-[12px] text-ink-3">This is not investment advice and not a valuation. Prices can fall as well as rise, under-construction flats can be delayed, and resale takes time and costs money.</p>
        </section>
        <section className="card grid content-start gap-3 p-5">
          <h2 className="text-[18px] font-bold">Price history</h2>
          <PriceChart now={Date.now()} points={(history || []).map((h) => ({ t: h.changed_at, price: Number(h.price) }))} height={180} />
          <h3 className="mt-2 text-[15px] font-bold">Before you buy</h3>
          <Checklist items={checklist} />
        </section>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.3fr)_minmax(320px,0.7fr)]">
        <section className="card p-5">
          <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2"><h2 className="text-[18px] font-bold">Floor plan</h2><span className="text-[12.5px] text-ink-2">{type.name} · {type.carpet_sqft} sq ft carpet · {type.builtup_sqft} built-up · {type.super_sqft} super</span></div>
          <FloorPlan layout={flat.mirror ? mirrorLayout(type.layout) : type.layout} facingDeg={FACING_DEG[flat.facing || 'east']} className="w-full" />
          {type.description && <p className="mt-2 text-[13px] text-ink-2">{type.description}</p>}
        </section>
        <section className="card grid content-start gap-3 p-5">
          <h2 className="text-[18px] font-bold">Amenities</h2>
          <ul className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-[13px]">{((project.amenities as string[] | null) || []).map((a) => <li key={a} className="flex items-center gap-1.5"><CheckCircle2 className="size-3.5 shrink-0 text-good" />{a}</li>)}</ul>
          <p className="text-[12px] text-ink-3">Carpet area is the usable floor inside your walls (as defined by RERA). Super area adds walls, balcony and a share of lobbies and the clubhouse; prices are quoted on super area.</p>
        </section>
      </div>
      <section className="card p-5">
        <h2 className="mb-3 text-[18px] font-bold">True cost and EMI</h2>
        <CostPlanner price={flat.price} />
      </section>
      <TrackView plotId={flat.id} />
      <CompareBar />
    </div>
  );
}
