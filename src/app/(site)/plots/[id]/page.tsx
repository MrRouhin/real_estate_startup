import Link from 'next/link';
import { notFound } from 'next/navigation';
import { AlertTriangle, ArrowLeft, Building2, TrendingUp } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { getSession } from '@/lib/auth';
import { loadSite } from '@/lib/queries';
import { asLayout, liveStatus, rate } from '@/lib/site';
import { cap, inr, lakh } from '@/lib/format';
import { friendly } from '@/lib/actions';
import { SiteView } from '@/components/three/site-view';
import { PriceChart } from '@/components/charts/price-chart';
import { PlotPill } from '@/components/ui/bits';
import { Item, Stagger } from '@/components/ui/motion';
import { EnquiryButton } from '@/components/buyer/enquiry';
import { CompareBar, CompareToggle } from '@/components/buyer/compare-toggle';
import { SubmitButton } from '@/components/ui/action-form';
import { LiveRefresh } from '@/components/live-refresh';
import { holdPlot } from '@/app/actions';

export default async function PlotPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ error?: string }> }) {
  const { id } = await params;
  const { error } = await searchParams;
  const supabase = await createClient();
  const { data: plot } = await supabase.from('plots').select('*').eq('id', id).maybeSingle();
  if (!plot) notFound();
  const [{ data: project }, { data: history }, site, { profile }] = await Promise.all([
    supabase.from('projects').select('*').eq('id', plot.project_id).single(),
    supabase.from('plot_price_history').select('price, changed_at').eq('plot_id', id).order('changed_at'),
    loadSite(supabase, plot.project_id),
    getSession(),
  ]);
  const { data: org } = await supabase.from('organizations').select('name, phone, gst_number, token_percent').eq('id', plot.org_id).single();
  const status = liveStatus(plot);
  const first = Number(history?.[0]?.price ?? plot.price);
  const gain = Math.round((Number(plot.price) / first - 1) * 100);
  const token = Math.round(Number(plot.price) * Math.min(Number(org?.token_percent ?? 10), 10) / 100);
  const road = plot.facing && (/[A]/.test(plot.plot_number) && plot.facing === 'south' || /[C]/.test(plot.plot_number) && plot.facing === 'north') ? '40 ft' : '30 ft';

  return (
    <div className="grid gap-6">
      <LiveRefresh tables={['plots']} filter={`id=eq.${plot.id}`} every={15000} />
      <Link href={`/projects/${project!.slug}/plots`} className="inline-flex w-fit items-center gap-1 text-[13px] text-ink-2 hover:text-ink"><ArrowLeft className="size-4" />Back to the plot map</Link>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.3fr)_minmax(320px,0.7fr)]">
        <div className="overflow-hidden rounded-[22px] border border-line">
          <SiteView plots={site.plots} layout={asLayout(project!.layout)} progress={site.progress} selectedId={plot.id} height="min(58vh, 500px)" zoom="close" autoRotate />
        </div>
        <Stagger className="grid content-start gap-4">
          <Item className="flex items-start justify-between gap-3">
            <div><div className="eyebrow">{project!.name} · Block {plot.plot_number[0]}</div><h1 className="font-display text-[44px] font-bold leading-none">{plot.plot_number}</h1></div>
            <PlotPill status={status} />
          </Item>
          <Item>
            <div className="num text-[30px] font-semibold">{inr(plot.price)}</div>
            <div className="flex items-center gap-3 text-[13px] text-ink-2"><span className="num">₹{rate(plot).toLocaleString('en-IN')}/sq ft</span>
              {gain > 0 && <span className="inline-flex items-center gap-1 font-semibold text-good"><TrendingUp className="size-4" />+{gain}% since launch</span>}</div>
          </Item>
          <Item className="flex flex-wrap gap-1.5">
            <span className="tag num">{Number(plot.area_sqft)} sq ft</span>{plot.dimensions && <span className="tag num">{plot.dimensions} ft</span>}
            <span className="tag">{cap(plot.facing)} facing</span><span className="tag">{road} road</span>{plot.is_corner && <span className="tag tag-accent">Corner plot</span>}
          </Item>
          {error && (
            <Item className="flex gap-2 rounded-xl bg-[color-mix(in_srgb,var(--warn)_12%,transparent)] p-3 text-[13.5px] text-warn"><AlertTriangle className="mt-0.5 size-4 shrink-0" />{friendly({ message: error })}</Item>
          )}
          <Item className="card grid gap-3 p-4">
            <div className="flex items-center justify-between text-[13.5px]"><span className="text-ink-2">Token to book ({Math.min(Number(org?.token_percent ?? 10), 10)}%)</span><b className="num">{inr(token)}</b></div>
            <form action={holdPlot}>
              <input type="hidden" name="plotId" value={plot.id} />
              <SubmitButton className="btn btn-primary btn-lg w-full" disabled={status !== 'available'} pendingText="Holding plot…">
                {status === 'available' ? 'Book this plot' : status === 'held' ? 'Someone is booking this plot' : 'Not available'}
              </SubmitButton>
            </form>
            <div className="grid grid-cols-2 gap-2">
              <EnquiryButton projectId={plot.project_id} plotId={plot.id} plotNumber={plot.plot_number} label="Ask / visit" className="btn btn-outline"
                defaults={{ name: profile?.full_name, phone: profile?.phone, email: profile?.email }} />
              <CompareToggle id={plot.id} number={plot.plot_number} />
            </div>
          </Item>
        </Stagger>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.3fr)_minmax(320px,0.7fr)]">
        <section className="card p-5">
          <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2"><h2 className="text-[18px] font-bold">Price history</h2>
            <span className="text-[13px] text-ink-2">{lakh(first)} at launch → {lakh(plot.price)} today</span></div>
          <PriceChart now={Date.now()} points={(history || []).map((h) => ({ t: h.changed_at, price: Number(h.price) }))} />
          <p className="mt-2 text-[12px] text-ink-3">These are the developer’s published prices. Past prices don’t predict future value.</p>
        </section>
        <section className="card grid content-start gap-4 p-5">
          <h2 className="text-[18px] font-bold">What the price includes</h2>
          <ul className="divide-y divide-line text-[13.5px]">
            {[
              ['Base rate', `₹${Math.round(Number(plot.price) / Number(plot.area_sqft) / (1 + (plot.is_corner ? 0.08 : 0) + (plot.facing === 'east' ? 0.05 : 0))).toLocaleString('en-IN')}/sq ft`],
              ['Corner premium', plot.is_corner ? '+8%' : '—'], ['East-facing premium', plot.facing === 'east' ? '+5%' : '—'],
              ['Development charges', 'Included'], ['Registration and stamp duty', 'Extra, paid at registration'],
            ].map(([k, v]) => <li key={k} className="flex justify-between gap-3 py-2"><span className="text-ink-2">{k}</span><span className="num font-medium">{v}</span></li>)}
          </ul>
          <div className="flex items-start gap-3 rounded-2xl bg-surface-2 p-3">
            <Building2 className="mt-0.5 size-5 text-accent" />
            <div className="text-[13px]"><div className="font-semibold">{org?.name}</div><div className="text-ink-2">Verified developer · {org?.phone}</div><div className="num text-[11.5px] text-ink-3">GST {org?.gst_number}</div></div>
          </div>
        </section>
      </div>
      <CompareBar />
    </div>
  );
}
