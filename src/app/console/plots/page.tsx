import { requireStaff } from '@/lib/auth';
import { PageHeader } from '@/components/ui/bits';
import { LiveRefresh } from '@/components/live-refresh';
import { PlotTable } from './table';
import { Section } from '@/components/ui/bits';
import { AISource } from '@/components/ai/bits';
import { InsightCard, type InsightView } from '@/components/ai/insight-card';
import { RunAnalysisButton } from '@/components/ai/run-button';

export const metadata = { title: 'Plots and prices' };

export default async function PlotsAdmin() {
  const { supabase, project } = await requireStaff();
  const [{ data: plots }, { data: bookings }, { data: events }, { data: priceIns }] = await Promise.all([
    supabase.from('plots').select('*').eq('project_id', project!.id).order('plot_number'),
    supabase.from('bookings').select('plot_id, buyer_id, status, profiles(full_name)').eq('org_id', project!.org_id).in('status', ['confirmed', 'registered', 'handed_over', 'pending_payment']),
    supabase.from('plot_events').select('plot_id, kind').eq('project_id', project!.id).gte('created_at', new Date(Date.now() - 30 * 86400000).toISOString()),
    supabase.from('ai_insights').select('*').eq('project_id', project!.id).eq('status', 'open').in('kind', ['price_up', 'price_incentive']).order('severity'),
  ]);
  const demand = new Map<string, { views: number; compares: number; matches: number; enquiries: number; holds: number; index: number }>();
  const W: Record<string, number> = { view: 1, compare: 2, match: 2, enquiry: 6, hold: 8 };
  for (const e of events || []) {
    const d = demand.get(e.plot_id) || { views: 0, compares: 0, matches: 0, enquiries: 0, holds: 0, index: 0 };
    if (e.kind === 'view') d.views++; else if (e.kind === 'compare') d.compares++; else if (e.kind === 'match') d.matches++; else if (e.kind === 'enquiry') d.enquiries++; else if (e.kind === 'hold') d.holds++;
    d.index += W[e.kind] || 0; demand.set(e.plot_id, d);
  }
  const top = [...demand.entries()].map(([id, d]) => ({ plot: (plots || []).find((p) => p.id === id), ...d })).filter((x) => x.plot && x.plot.status === 'available').sort((a, b) => b.index - a.index).slice(0, 8);
  const maxIdx = Math.max(1, ...top.map((t) => t.index));
  const buyerOf = Object.fromEntries((bookings || []).map((b) => [b.plot_id, (b.profiles as unknown as { full_name: string } | null)?.full_name || 'Buyer']));
  return (
    <>
      <LiveRefresh tables={['plots']} filter={`project_id=eq.${project!.id}`} />
      <PageHeader eyebrow={project!.name} title="Plots and prices" sub="Every price change is logged automatically and feeds the buyer’s price history chart. Booked plots keep the price they were booked at." />
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
        <Section title="Pricing suggestions" action={<RunAnalysisButton label="Refresh" className="btn btn-ghost btn-sm" />}>
          {(priceIns || []).length ? <div className="grid gap-3">{(priceIns as unknown as InsightView[]).map((i) => <InsightCard key={i.id} i={i} />)}</div>
            : <p className="text-[13.5px] text-ink-2">No price changes suggested right now. Suggestions appear when a plot gets clearly more (or less) interest than similar plots.</p>}
          <p className="mt-3 text-[12px] text-ink-3">Suggestions never change a price by themselves. Booked plots keep the price they were booked at.</p>
        </Section>
        <Section title="Demand · last 30 days" action={<AISource source="rules" />}>
          {top.length === 0 ? <p className="text-[13.5px] text-ink-2">No buyer activity recorded yet.</p> : (
            <ul className="grid gap-2 text-[13px]">{top.map((t) => (
              <li key={t.plot!.id} className="grid grid-cols-[52px_1fr_auto] items-center gap-3">
                <b>{t.plot!.plot_number}</b>
                <span className="h-2 overflow-hidden rounded-full bg-surface-2"><span className="block h-full rounded-full bg-accent" style={{ width: `${(t.index / maxIdx) * 100}%` }} /></span>
                <span className="num text-[12px] text-ink-3">{t.views} views · {t.enquiries} enq · {t.holds} holds</span>
              </li>
            ))}</ul>
          )}
          <p className="mt-3 text-[12px] text-ink-3">Views, comparisons and matchmaker picks come from the buyer site (no personal data); enquiries and holds from the CRM and bookings.</p>
        </Section>
      </div>
      <PlotTable plots={(plots || []).map((p) => ({ ...p, buyer: buyerOf[p.id] ?? null }))} />
    </>
  );
}
