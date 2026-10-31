import { Sparkles } from 'lucide-react';
import { requireStaff } from '@/lib/auth';
import { aiEnabled, aiModelName } from '@/lib/ai/client';
import { STATE_LABEL, type WPState } from '@/lib/ai/plan';
import type { ProjectSummary } from '@/lib/ai/nearby';
import { ago, date } from '@/lib/format';
import { Empty, PageHeader, Section } from '@/components/ui/bits';
import { Tabs } from '@/components/ui/tabs';
import { ProgressBar } from '@/components/ui/motion';
import { AISource, ReportText, STATE_COLOR } from '@/components/ai/bits';
import { InsightCard, type InsightView } from '@/components/ai/insight-card';
import { RunAnalysisButton } from '@/components/ai/run-button';

export const metadata = { title: 'AI insights' };

const GROUPS: { id: string; label: string; kinds: string[] }[] = [
  { id: 'site', label: 'Schedule', kinds: ['wp_behind', 'no_baseline'] },
  { id: 'materials', label: 'Materials', kinds: ['material_overrun', 'reorder'] },
  { id: 'crew', label: 'Crew', kinds: ['crew_output', 'checkin'] },
  { id: 'deliveries', label: 'Deliveries & photos', kinds: ['delivery_flag', 'photo_check'] },
  { id: 'sales', label: 'Sales & pricing', kinds: ['lead_action', 'price_up', 'price_incentive'] },
];
const RANK: Record<string, number> = { critical: 0, warn: 1, good: 2, info: 3 };

export default async function InsightsPage() {
  const { supabase, project } = await requireStaff();
  if (!project) return <Empty title="No project yet" />;
  const [{ data: open }, { data: history }] = await Promise.all([
    supabase.from('ai_insights').select('*').eq('project_id', project.id).eq('status', 'open').order('created_at', { ascending: false }),
    supabase.from('ai_insights').select('id, title, kind, status, decided_at, profiles:decided_by(full_name)').eq('project_id', project.id).neq('status', 'open').order('decided_at', { ascending: false }).limit(15),
  ]);
  const all = (open || []) as unknown as InsightView[];
  const brief = all.find((i) => i.kind === 'project_brief');
  const reports = all.filter((i) => i.kind === 'weekly_report');
  const rest = all.filter((i) => i.kind !== 'project_brief' && i.kind !== 'weekly_report').sort((a, b) => (RANK[a.severity] ?? 9) - (RANK[b.severity] ?? 9));
  const stale = !brief || Date.now() - new Date(brief.created_at).getTime() > 12 * 3600_000;
  const sum = project.ai_summary as unknown as ProjectSummary | null;
  const on = aiEnabled();
  const counts = { critical: rest.filter((i) => i.severity === 'critical').length, warn: rest.filter((i) => i.severity === 'warn').length };

  const list = (items: InsightView[]) => items.length ? <div className="grid gap-3 lg:grid-cols-2">{items.map((i) => <InsightCard key={i.id} i={i} compact />)}</div>
    : <p className="py-6 text-center text-[13.5px] text-ink-3">Nothing here right now.</p>;

  return (
    <>
      <PageHeader emoji="✨" eyebrow="Intelligence" title="AI insights"
        sub={<>REMMO reads the plan, progress, stores, attendance, deliveries and sales every day. <b className="text-ink">It suggests; you decide.</b> Nothing changes until someone presses Apply.</>}>
        <span className="chip" title={on ? `Model: ${aiModelName()}` : 'Add ANTHROPIC_API_KEY in the hosting settings for plain-language reports, photo and invoice reading, and chat.'}>
          <Sparkles className="size-3.5" />{on ? `AI on · ${aiModelName()}` : 'Rules only (no AI key)'}
        </span>
        <RunAnalysisButton auto={stale} />
      </PageHeader>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
        <Section title={brief ? brief.title : 'Today’s briefing'} action={brief ? <span className="flex items-center gap-2 text-[12px] text-ink-3"><AISource source={brief.source} />{ago(brief.created_at)}</span> : null}>
          {brief?.body ? <ReportText text={brief.body} /> : <p className="text-[13.5px] text-ink-2">Running the first analysis…</p>}
        </Section>
        <Section title="Plan vs actual">
          {sum ? (
            <div className="grid gap-3">
              <div className="flex items-end justify-between gap-3">
                <div><div className="num text-[30px] font-medium leading-none">{Math.round(sum.actual)}%</div><div className="mt-1 text-[12.5px] text-ink-3">done vs <b className="text-ink-2">{Math.round(sum.planned)}%</b> planned by today</div></div>
                <span className="rounded-full px-2.5 py-1 text-[12px] font-bold" style={{ color: STATE_COLOR[sum.state], background: `color-mix(in srgb, ${STATE_COLOR[sum.state]} 13%, transparent)` }}>{STATE_LABEL[sum.state]}</span>
              </div>
              <div className="relative"><ProgressBar value={sum.actual} /><span className="absolute top-[-3px] h-[14px] w-0.5 rounded bg-ink" style={{ left: `${Math.min(100, sum.planned)}%` }} title="Planned by today" /></div>
              <ul className="grid gap-1.5 text-[13px]">
                {Object.entries(sum.milestones).map(([k, m]) => (
                  <li key={k} className="flex items-center justify-between gap-2">
                    <span className="capitalize text-ink-2">{k.replace('_', ' ')}</span>
                    <span className="flex items-center gap-2"><span className="num">{Math.round(m.actual)}% / {Math.round(m.planned)}%</span>
                      <i className="size-2 rounded-full" style={{ background: STATE_COLOR[m.state as WPState] }} title={STATE_LABEL[m.state as WPState]} /></span>
                  </li>
                ))}
              </ul>
              {sum.forecast && <p className="text-[12.5px] text-ink-3">At the current pace the last package finishes around <b className="text-ink-2">{date(sum.forecast)}</b>.</p>}
            </div>
          ) : <p className="text-[13.5px] text-ink-2">Shown after the first analysis.</p>}
        </Section>
      </div>

      <Section title={`Needs a decision · ${rest.length}`} action={<span className="text-[12px] text-ink-3">{counts.critical} critical · {counts.warn} warnings</span>}>
        <Tabs tabs={[
          { id: 'all', label: `All (${rest.length})`, content: list(rest) },
          ...GROUPS.map((g) => { const items = rest.filter((i) => g.kinds.includes(i.kind)); return { id: g.id, label: `${g.label} (${items.length})`, content: list(items) }; }),
        ]} />
      </Section>

      <Section title="Weekly contractor reports" action={<span className="text-[12px] text-ink-3">Share a report and the contractor sees it in their portal</span>}>
        {reports.length ? <div className="grid gap-3 lg:grid-cols-2">{reports.map((i) => <InsightCard key={i.id} i={i} compact />)}</div>
          : <p className="text-[13.5px] text-ink-3">Reports appear after the analysis runs.</p>}
      </Section>

      {(history || []).length > 0 && (
        <Section title="Decision history">
          <ul className="grid min-w-0 gap-1.5 text-[13px]">
            {history!.map((h) => {
              const who = (h.profiles as unknown as { full_name: string | null } | null)?.full_name;
              return <li key={h.id} className="flex min-w-0 flex-wrap items-center justify-between gap-x-2 border-b border-line/60 pb-1.5 last:border-0">
                <span className="min-w-0 max-w-full truncate"><b className={h.status === 'applied' ? 'text-good' : 'text-ink-3'}>{h.status === 'applied' ? 'Applied' : 'Dismissed'}</b> · {h.title}</span>
                <span className="text-[12px] text-ink-3">{who ? who + ' · ' : ''}{ago(h.decided_at)}</span>
              </li>;
            })}
          </ul>
        </Section>
      )}
    </>
  );
}
