import Link from 'next/link';
import { ArrowRight, Box, CalendarCheck, HardHat, LineChart, Radio, ShieldCheck, Smartphone, Users, Wallet } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { loadSite } from '@/lib/queries';
import { asLayout, liveStatus } from '@/lib/site';
import { lakh } from '@/lib/format';
import { SiteView } from '@/components/three/site-view';
import { PlotMap2D } from '@/components/plot-map';
import { AnimatedNumber, Item, ProgressBar, Stagger, TiltCard } from '@/components/ui/motion';

export const dynamic = 'force-dynamic';

export default async function Home() {
  const supabase = await createClient();
  const { data: projects } = await supabase.from('projects').select('*').eq('is_published', true).order('created_at');
  const list = projects || [];
  const sites = await Promise.all(list.map((p) => loadSite(supabase, p.id)));
  const heroIdx = Math.max(0, sites.findIndex((s) => s.plots.length > 0));
  const hero = list[heroIdx];
  const heroSite = sites[heroIdx];
  const available = heroSite?.plots.filter((p) => liveStatus(p) === 'available').length ?? 0;
  const totalPlots = sites.reduce((a, s) => a + s.plots.length, 0);
  const totalUpdates = sites.reduce((a, s) => a + s.updates.length, 0);

  return (
    <div className="grid gap-16">
      {/* Hero */}
      <section className="relative grid items-center gap-8 overflow-x-clip pt-2 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:overflow-visible">
        <Stagger className="relative z-10 grid gap-5">
          <Item><span className="tag tag-accent"><Radio className="size-3.5" /> Live construction tracking</span></Item>
          <Item><h1 className="text-[clamp(34px,5.4vw,58px)] font-bold leading-[1.02] tracking-tight">Pick your plot in 3D.<br /><span className="text-accent">Watch it get built.</span></h1></Item>
          <Item><p className="max-w-lg text-[16.5px] leading-relaxed text-ink-2">See every plot’s live status, compare prices, hold the one you like for 15 minutes and pay the token online. After that, follow every road, drain and street light as it goes in.</p></Item>
          <Item className="flex flex-wrap gap-3">
            {hero && <Link href={`/projects/${hero.slug}`} className="btn btn-primary btn-lg">Explore {hero.name} <ArrowRight className="size-4" /></Link>}
            {hero && <Link href={`/projects/${hero.slug}/plots`} className="btn btn-outline btn-lg"><Box className="size-4" /> Open the 3D plot map</Link>}
          </Item>
          <Item className="flex flex-wrap gap-x-6 gap-y-2 pt-1 text-[13px] text-ink-2">
            <span className="flex items-center gap-1.5"><ShieldCheck className="size-4 text-good" /> RERA number on every project</span>
            <span className="flex items-center gap-1.5"><Wallet className="size-4 text-good" /> Token capped at 10%</span>
            <span className="flex items-center gap-1.5"><Smartphone className="size-4 text-good" /> Works on any phone</span>
          </Item>
        </Stagger>
        {hero && heroSite && (
          <div className="relative">
            <div className="absolute -inset-3 -z-10 rounded-[40px] sm:-inset-6 bg-[radial-gradient(60%_60%_at_60%_40%,color-mix(in_srgb,var(--accent)_22%,transparent),transparent)]" />
            <div className="overflow-hidden rounded-[28px] border border-line shadow-[var(--shadow-lg)]">
              <SiteView plots={heroSite.plots} layout={asLayout(hero.layout)} progress={heroSite.progress} height="min(62vh, 520px)" toggle={false} autoRotate
                overlay={
                  <div className="pointer-events-none absolute bottom-3 left-3 flex flex-wrap gap-2">
                    <span className="rounded-full bg-surface/90 px-3 py-1.5 text-[12.5px] font-semibold shadow backdrop-blur"><span className="num">{Math.round(Number(hero.progress_percent))}%</span> built</span>
                    <span className="rounded-full bg-surface/90 px-3 py-1.5 text-[12.5px] font-semibold shadow backdrop-blur"><span className="num text-available">{available}</span> plots available</span>
                  </div>
                } />
            </div>
          </div>
        )}
      </section>

      {/* Live numbers */}
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          ['Projects live', list.length], ['Plots on the map', totalPlots], ['Plots available now', available], ['Construction updates', totalUpdates],
        ].map(([label, n]) => (
          <div key={label as string} className="card paper p-5">
            <div className="num text-[30px] font-medium"><AnimatedNumber value={n as number} /></div>
            <div className="text-[13px] text-ink-2">{label}</div>
          </div>
        ))}
      </section>

      {/* Projects */}
      <section id="projects" className="scroll-mt-24">
        <div className="mb-5 flex items-end justify-between gap-3">
          <div><div className="eyebrow">Projects</div><h2 className="text-[28px] font-bold">Open for booking</h2></div>
        </div>
        <Stagger className="grid gap-5 md:grid-cols-2">
          {list.map((p, i) => {
            const s = sites[i]!;
            const avail = s.plots.filter((x) => liveStatus(x) === 'available');
            const from = avail.length ? Math.min(...avail.map((x) => Number(x.price))) : null;
            return (
              <Item key={p.id}>
                <TiltCard className="h-full rounded-[22px]">
                  <Link href={`/projects/${p.slug}`} className="card card-lift block h-full overflow-hidden !rounded-[22px]">
                    <div className="relative h-52 overflow-hidden border-b border-line bg-surface-2">
                      {s.plots.length > 0 ? (
                        <PlotMap2D plots={s.plots} layout={asLayout(p.layout)} fill className="absolute inset-0 p-3" />
                      ) : (
                        <div className="paper grid h-full place-items-center text-center text-ink-2"><div><HardHat className="mx-auto mb-2 size-7 text-accent" /><div className="font-semibold">Layout coming soon</div></div></div>
                      )}
                      <span className="tag absolute left-3 top-3 !bg-surface/90 capitalize shadow-sm backdrop-blur">{p.status}</span>
                    </div>
                    <div className="grid gap-3 p-5">
                      <div className="flex items-start justify-between gap-3">
                        <div><h3 className="text-[19px] font-semibold">{p.name}</h3><div className="text-[13.5px] text-ink-2">{p.city}</div></div>
                        {from && <div className="text-right"><div className="text-[11.5px] text-ink-3">from</div><div className="num text-[17px] font-semibold">{lakh(from)}</div></div>}
                      </div>
                      {s.plots.length > 0 ? (
                        <>
                          <div className="flex items-center justify-between text-[12.5px] text-ink-2"><span>{Math.round(Number(p.progress_percent))}% developed</span><span><b className="num text-available">{avail.length}</b> of {s.plots.length} available</span></div>
                          <ProgressBar value={Number(p.progress_percent)} />
                        </>
                      ) : <p className="text-[13.5px] text-ink-2">{p.description}</p>}
                      <div className="num text-[11.5px] text-ink-3">RERA {p.rera_number}</div>
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
        <div><div className="eyebrow">How booking works</div><h2 className="mt-1 text-[28px] font-bold">From browsing to your plot in three steps</h2>
          <p className="mt-2 text-ink-2">No brokers in the middle and no surprises. Prices, documents and progress are the developer’s own, published here.</p></div>
        <ol className="grid gap-3 sm:grid-cols-3">
          {[
            [Box, 'Explore in 3D', 'Filter by size, facing and budget. Every plot shows its live status and price history.'],
            [CalendarCheck, 'Hold and pay the token', 'Your plot is held for 15 minutes while you verify your ID and pay 10% online.'],
            [LineChart, 'Track it to handover', 'Payments, documents and every construction update in one place.'],
          ].map(([Icon, t, d], k) => {
            const I = Icon as typeof Box;
            return (
              <li key={k} className="card relative overflow-hidden p-5">
                <span className="num absolute right-4 top-3 text-[40px] font-semibold text-surface-2">{k + 1}</span>
                <I className="size-6 text-accent" /><div className="mt-3 font-semibold">{t as string}</div><p className="mt-1 text-[13.5px] text-ink-2">{d as string}</p>
              </li>
            );
          })}
        </ol>
      </section>

      {/* For developers */}
      <section className="card paper relative overflow-hidden p-6 sm:p-10">
        <div className="grid gap-8 lg:grid-cols-2 lg:items-center">
          <div>
            <div className="eyebrow">For developers</div>
            <h2 className="mt-1 text-[28px] font-bold">Sales, site and stores in one console</h2>
            <p className="mt-2 max-w-lg text-ink-2">Leads pipeline, bookings and collections, contractors and their material use, vendor deliveries and geofenced attendance, all on the same live data your buyers see.</p>
            <Link href="/login" className="btn btn-primary mt-5">Open the developer console <ArrowRight className="size-4" /></Link>
          </div>
          <ul className="grid gap-3 sm:grid-cols-2">
            {[
              [Users, 'CRM pipeline', 'Every app enquiry becomes a lead with follow-ups and site visits.'],
              [Wallet, 'Collections', 'Installments, receipts and refunds tracked per booking.'],
              [HardHat, 'Contractors', 'Work packages, progress and material used vs wasted.'],
              [Radio, 'Site attendance', 'Selfie check-ins checked against the site geofence.'],
            ].map(([Icon, t, d]) => { const I = Icon as typeof Box; return (
              <li key={t as string} className="rounded-2xl border border-line bg-surface p-4"><I className="size-5 text-accent" /><div className="mt-2 font-semibold">{t as string}</div><p className="text-[13px] text-ink-2">{d as string}</p></li>
            ); })}
          </ul>
        </div>
      </section>
    </div>
  );
}
