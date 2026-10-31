import Link from 'next/link';
import { ArrowRight, Box, Building, CalendarCheck, HardHat, LineChart, Radio, ShieldCheck, Smartphone, Users, Wallet } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { loadSite } from '@/lib/queries';
import { loadApartments } from '@/lib/flats/queries';
import { asLayout, liveStatus, STATUS_COLOR } from '@/lib/site';
import { lakh } from '@/lib/format';
import { SiteView } from '@/components/three/site-view';
import { TowerView } from '@/components/three/tower-view';
import { PlotMap2D } from '@/components/plot-map';
import { AnimatedNumber, Item, ProgressBar, Stagger, TiltCard } from '@/components/ui/motion';

export const dynamic = 'force-dynamic';

type Apts = Awaited<ReturnType<typeof loadApartments>>;

/** A tiny stacking plan: every flat as a coloured cell, tower by tower. */
function StackThumb({ d }: { d: Apts }) {
  return (
    <div className="absolute inset-0 flex items-end justify-center gap-6 p-5">
      {d.towers.map((t) => (
        <div key={t.id} className="grid gap-[3px]" style={{ gridTemplateColumns: `repeat(${t.units_per_floor}, 14px)` }}>
          {Array.from({ length: t.floors }, (_, i) => t.floors - i).flatMap((fl) => Array.from({ length: t.units_per_floor }, (_, s) => {
            const f = d.flats.find((x) => x.tower_id === t.id && x.floor === fl && x.stack === s + 1);
            return <span key={`${fl}-${s}`} className="h-[7px] rounded-[2px]" style={{ background: f ? STATUS_COLOR[liveStatus(f)] : 'var(--surface-2)', opacity: fl > t.slabs_cast ? 0.35 : 1 }} />;
          }))}
        </div>
      ))}
    </div>
  );
}

export default async function Home() {
  const supabase = await createClient();
  const { data: projects } = await supabase.from('projects').select('*, organizations(name, is_demo)').eq('is_published', true).order('created_at');
  const list = projects || [];
  const [sites, apts] = await Promise.all([
    Promise.all(list.map((p) => (p.kind === 'apartments' ? Promise.resolve(null) : loadSite(supabase, p.id)))),
    Promise.all(list.map((p) => (p.kind === 'apartments' ? loadApartments(supabase, p.id) : Promise.resolve(null)))),
  ]);
  const aptIdx = apts.findIndex((a) => a && a.flats.length > 0);
  const plotIdx = sites.findIndex((s) => s && s.plots.length > 0);
  const hero = list[aptIdx >= 0 ? aptIdx : Math.max(0, plotIdx)];
  const heroApt = aptIdx >= 0 ? apts[aptIdx]! : null;
  const heroSite = !heroApt && plotIdx >= 0 ? sites[plotIdx]! : null;
  const units = list.map((_, i) => (apts[i]?.flats ?? sites[i]?.plots ?? []) as unknown as { status: "available" | "held" | "booked" | "sold" | "blocked"; held_until: string | null; price: number | string }[]);
  const totalUnits = units.reduce((a, u) => a + u.length, 0);
  const available = units.reduce((a, u) => a + u.filter((x) => liveStatus(x) === 'available').length, 0);
  const totalUpdates = sites.reduce((a, s) => a + (s?.updates.length ?? 0), 0) + apts.reduce((a, d) => a + (d?.updates.length ?? 0), 0);
  const plotsHref = plotIdx >= 0 ? `/projects/${list[plotIdx]!.slug}/plots` : null;

  return (
    <div className="grid gap-16">
      {/* Hero */}
      <section className="relative grid items-center gap-8 overflow-x-clip pt-2 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:overflow-visible">
        <Stagger className="relative z-10 grid gap-5">
          <Item><span className="tag tag-accent"><Radio className="size-3.5" /> Live from the site</span></Item>
          <Item><h1 className="text-[clamp(36px,5.6vw,62px)] font-bold leading-[1.02] tracking-[-0.03em]">Walk through your home before it’s built.</h1></Item>
          <Item><p className="max-w-lg text-[17px] leading-relaxed text-ink-2">Pick a flat or a plot in 3D, step inside the finished home, see how far your floor has been built today, and pay only as the building rises.</p></Item>
          <Item className="flex flex-wrap gap-3">
            {heroApt && hero && <Link href={`/projects/${hero.slug}/flats`} className="btn btn-primary btn-lg"><Building className="size-4" />Explore flats in 3D</Link>}
            {plotsHref && <Link href={plotsHref} className={'btn btn-lg ' + (heroApt ? 'btn-outline' : 'btn-primary')}><Box className="size-4" />Open the plot map</Link>}
          </Item>
          <Item className="flex flex-wrap gap-x-6 gap-y-2 pt-1 text-[13px] text-ink-2">
            <span className="flex items-center gap-1.5"><ShieldCheck className="size-4 text-good" /> RERA number on every project</span>
            <span className="flex items-center gap-1.5"><Wallet className="size-4 text-good" /> Booking amount capped at 10%</span>
            <span className="flex items-center gap-1.5"><Smartphone className="size-4 text-good" /> Works on any phone</span>
          </Item>
        </Stagger>
        {hero && (heroApt || heroSite) && (
          <div className="relative">
            <div className="absolute -inset-3 -z-10 rounded-[40px] bg-[radial-gradient(60%_60%_at_60%_40%,color-mix(in_srgb,var(--accent)_22%,transparent),transparent)] sm:-inset-6" />
            <div className="overflow-hidden rounded-[28px] border border-[var(--glass-border)] shadow-[var(--shadow-lg)]">
              {heroApt ? <TowerView towers={heroApt.towers} flats={heroApt.flats} types={heroApt.types} height="min(62vh, 520px)" initialMode="construction" />
                : <SiteView plots={heroSite!.plots} layout={asLayout(hero.layout)} progress={heroSite!.progress} height="min(62vh, 520px)" toggle={false} autoRotate />}
            </div>
            <div className="pointer-events-none absolute left-3 top-3 flex flex-wrap gap-2">
              <span className="glass rounded-full px-3 py-1.5 text-[12.5px] font-semibold">{hero.name}</span>
              <span className="glass rounded-full px-3 py-1.5 text-[12.5px] font-semibold"><span className="num">{Math.round(Number(hero.progress_percent))}%</span> built</span>
            </div>
          </div>
        )}
      </section>

      {/* Live numbers */}
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[['Projects live', list.length], ['Homes and plots listed', totalUnits], ['Available right now', available], ['Site updates posted', totalUpdates]].map(([label, n]) => (
          <div key={label as string} className="card p-5">
            <div className="num text-[30px] font-medium"><AnimatedNumber value={n as number} /></div>
            <div className="text-[13px] text-ink-2">{label}</div>
          </div>
        ))}
      </section>

      {/* Projects */}
      <section id="projects" className="scroll-mt-24">
        <div className="mb-5"><h2 className="text-[30px] font-bold tracking-[-0.02em]">Open for booking</h2><p className="text-ink-2">Every price, document and progress update here comes straight from the developer.</p></div>
        <Stagger className="grid gap-5 md:grid-cols-2">
          {list.map((p, i) => {
            const u = units[i]!;
            const avail = u.filter((x) => liveStatus(x) === 'available');
            const from = avail.length ? Math.min(...avail.map((x) => Number(x.price))) : null;
            const org = p.organizations as unknown as { name: string; is_demo: boolean } | null;
            const isApt = p.kind === 'apartments';
            return (
              <Item key={p.id}>
                <TiltCard className="h-full rounded-[22px]">
                  <Link href={`/projects/${p.slug}`} className="card card-lift block h-full overflow-hidden !rounded-[22px]">
                    <div className="relative h-52 overflow-hidden border-b border-[var(--glass-line)] bg-[color-mix(in_srgb,var(--surface-2)_60%,transparent)]">
                      {isApt && apts[i] ? <StackThumb d={apts[i]!} />
                        : sites[i] && sites[i]!.plots.length > 0 ? <PlotMap2D plots={sites[i]!.plots} layout={asLayout(p.layout)} fill className="absolute inset-0 p-3" />
                        : <div className="grid h-full place-items-center text-center text-ink-2"><div><HardHat className="mx-auto mb-2 size-7 text-accent" /><div className="font-semibold">Layout coming soon</div></div></div>}
                      <div className="absolute left-3 top-3 flex gap-1.5">
                        <span className="glass rounded-full px-2.5 py-1 text-[11.5px] font-semibold">{isApt ? '🏢 Apartments' : '🗺️ Plots'}</span>
                        {org?.is_demo && <span className="glass rounded-full px-2.5 py-1 text-[11.5px] font-semibold text-ink-2">Sample project</span>}
                      </div>
                    </div>
                    <div className="grid gap-3 p-5">
                      <div className="flex items-start justify-between gap-3">
                        <div><h3 className="text-[19px] font-semibold">{p.name}</h3><div className="text-[13.5px] text-ink-2">{p.city} · {org?.name}</div></div>
                        {from && <div className="text-right"><div className="text-[11.5px] text-ink-3">from</div><div className="num text-[17px] font-semibold">{lakh(from)}</div></div>}
                      </div>
                      {u.length > 0 ? (
                        <>
                          <div className="flex items-center justify-between text-[12.5px] text-ink-2"><span>{Math.round(Number(p.progress_percent))}% {isApt ? 'built' : 'developed'}</span><span><b className="num text-available">{avail.length}</b> of {u.length} {isApt ? 'flats' : 'plots'} available</span></div>
                          <ProgressBar value={Number(p.progress_percent)} />
                        </>
                      ) : <p className="text-[13.5px] text-ink-2">{p.description}</p>}
                      {p.rera_number && <div className="num text-[11.5px] text-ink-3">RERA {p.rera_number}</div>}
                    </div>
                  </Link>
                </TiltCard>
              </Item>
            );
          })}
        </Stagger>
      </section>

      {/* How it works */}
      <section className="grid gap-5 lg:grid-cols-[0.8fr_1.2fr] lg:items-center">
        <div><h2 className="text-[30px] font-bold tracking-[-0.02em]">From browsing to your keys</h2>
          <p className="mt-2 text-ink-2">No brokers in the middle and no surprises. Prices, documents and progress are the developer’s own, published here.</p></div>
        <ol className="grid gap-3 sm:grid-cols-3">
          {[
            [Box, 'Explore in 3D', 'Filter by budget, size, floor and view. Walk through any flat, finished and furnished.'],
            [CalendarCheck, 'Hold and book', 'Your pick is held for 15 minutes while you verify your ID and pay the booking amount online.'],
            [LineChart, 'Follow it to handover', 'See your floor being built, pay each stage as it is reached, and keep every document in one place.'],
          ].map(([Icon, t, d], k) => {
            const I = Icon as typeof Box;
            return (
              <li key={k} className="card relative overflow-hidden p-5">
                <span className="num absolute right-4 top-3 text-[40px] font-semibold text-[color-mix(in_srgb,var(--ink-3)_25%,transparent)]">{k + 1}</span>
                <I className="size-6 text-accent" /><div className="mt-3 font-semibold">{t as string}</div><p className="mt-1 text-[13.5px] text-ink-2">{d as string}</p>
              </li>
            );
          })}
        </ol>
      </section>

      {/* For developers */}
      <section className="card relative overflow-hidden p-6 sm:p-10">
        <div className="grid gap-8 lg:grid-cols-2 lg:items-center">
          <div>
            <h2 className="text-[30px] font-bold tracking-[-0.02em]">For developers: sales, site and every partner in one place</h2>
            <p className="mt-2 max-w-lg text-ink-2">List projects in minutes, then run leads, bookings, towers, materials and payments on the same live data your buyers see. Contractors, suppliers and site workers each get their own workspace.</p>
            <div className="mt-5 flex flex-wrap gap-2"><Link href="/start" className="btn btn-primary">List your project <ArrowRight className="size-4" /></Link><Link href="/login/developer" className="btn btn-outline">Try the demo console</Link></div>
          </div>
          <ul className="grid gap-3 sm:grid-cols-2">
            {[
              [Users, 'CRM and AI matchmaking', 'Enquiries become leads; buyers get matched to the right flat or plot.'],
              [Wallet, 'Construction-linked payments', 'Stages fall due automatically as slabs are cast and work is done.'],
              [HardHat, 'Contractors and bills', 'Work orders, daily progress, crews and running bills with approvals.'],
              [Radio, 'Suppliers and site team', 'Purchase orders, deliveries, attendance and leave, all live.'],
            ].map(([Icon, t, d]) => { const I = Icon as typeof Box; return (
              <li key={t as string} className="rounded-2xl border border-[var(--glass-line)] bg-[var(--glass)] p-4"><I className="size-5 text-accent" /><div className="mt-2 font-semibold">{t as string}</div><p className="text-[13px] text-ink-2">{d as string}</p></li>
            ); })}
          </ul>
        </div>
      </section>
    </div>
  );
}
