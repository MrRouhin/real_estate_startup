'use client';
import { useState, useTransition } from 'react';
import Link from 'next/link';
import { Check, ChevronDown, Copy, Loader2, Send, X } from 'lucide-react';
import { useToast } from '@/components/ui/toast';
import { decideInsight, shareInsight } from '@/app/console/ai-actions';
import { ReportText, SEVERITY_COLOR, AISource } from './bits';

export type InsightView = {
  id: string; kind: string; scope: string; severity: string; title: string; body: string | null; source: string; status: string;
  suggestion: { action: string; label: string; href?: string; message?: string } | null; shared_with_contractor: boolean; created_at: string;
};

const KIND_LABEL: Record<string, string> = {
  project_brief: 'Briefing', weekly_report: 'Weekly report', wp_behind: 'Schedule', no_baseline: 'Plan', material_overrun: 'Materials', reorder: 'Stock',
  crew_output: 'Crew', checkin: 'Attendance', price_up: 'Pricing', price_incentive: 'Pricing', lead_action: 'Lead', delivery_flag: 'Delivery', photo_check: 'Photo check',
};

/** One insight with its suggested action. Nothing changes until someone presses Apply. */
export function InsightCard({ i, compact = false, defaultOpen = false }: { i: InsightView; compact?: boolean; defaultOpen?: boolean }) {
  const toast = useToast();
  const [pending, start] = useTransition();
  const [open, setOpen] = useState(defaultOpen || !compact);
  const [done, setDone] = useState<string | null>(null);
  const color = SEVERITY_COLOR[i.severity] || 'var(--ink-3)';
  const s = i.suggestion;
  const act = (d: 'apply' | 'dismiss') => start(async () => {
    const r = await decideInsight(i.id, d);
    if (!r.ok) { toast(r.error || 'Could not do that', 'error'); return; }
    toast(r.message || 'Done', 'success');
    if (r.link) window.open(r.link, '_blank', 'noopener');
    if (!(i.kind === 'weekly_report' && d === 'apply')) setDone(d === 'apply' ? 'Applied' : 'Dismissed');
  });
  const share = () => start(async () => { const r = await shareInsight(i.id); toast(r.ok ? r.message || 'Shared' : r.error || 'Could not share', r.ok ? 'success' : 'error'); });
  const long = (i.body || '').length > 220 || (i.body || '').includes('\n');
  if (done) return <div className="card flex items-center gap-2 p-3 text-[13px] text-ink-3"><Check className="size-4 text-good" />{done}: {i.title}</div>;
  return (
    <article className="card relative overflow-hidden p-4 pl-5">
      <span className="absolute inset-y-0 left-0 w-1" style={{ background: color }} />
      <div className="flex flex-wrap items-center gap-2 text-[11.5px]">
        <span className="font-bold uppercase tracking-wide" style={{ color }}>{KIND_LABEL[i.kind] || i.kind}</span>
        <AISource source={i.source} />
        {i.shared_with_contractor && <span className="rounded-full bg-surface-2 px-2 py-0.5 font-semibold text-ink-2">Shared with contractor</span>}
      </div>
      <h3 className="mt-1.5 text-[14.5px] font-semibold leading-snug">{i.title}</h3>
      {i.body && (
        <div className="mt-1.5">
          {open || !long ? <ReportText text={i.body} /> : <p className="line-clamp-2 text-[13.5px] text-ink-2">{i.body.replace(/^##\s.*$/gm, '').replace(/\n+/g, ' ')}</p>}
          {long && <button className="mt-1 inline-flex items-center gap-1 text-[12.5px] font-semibold text-accent" onClick={() => setOpen(!open)}>{open ? 'Show less' : 'Read more'}<ChevronDown className={'size-3.5 transition ' + (open ? 'rotate-180' : '')} /></button>}
        </div>
      )}
      {i.status === 'open' && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {s && s.action === 'review' && s.href && <Link href={s.href} className="btn btn-sm">{s.label}</Link>}
          {s && s.action !== 'review' && !(s.action === 'share_report' && i.shared_with_contractor) && (
            <button className="btn btn-primary btn-sm" disabled={pending} onClick={() => act('apply')}>
              {pending ? <Loader2 className="size-4 animate-spin" /> : s.action === 'share_report' ? <Send className="size-4" /> : <Check className="size-4" />}{s.label}
            </button>
          )}
          {s?.action === 'reorder' && s.message && (
            <button className="btn btn-sm" onClick={() => { navigator.clipboard?.writeText(s.message!).then(() => toast('Order message copied', 'success')).catch(() => toast('Could not copy', 'error')); }}><Copy className="size-4" />Copy order</button>
          )}
          {i.scope === 'contractor' && i.kind !== 'weekly_report' && !i.shared_with_contractor && s?.action !== 'share_report' && (
            <button className="btn btn-sm" disabled={pending} onClick={share}><Send className="size-4" />Share with contractor</button>
          )}
          {i.kind !== 'project_brief' && (s?.action === 'review'
            ? <button className="btn btn-ghost btn-sm" disabled={pending} onClick={() => act('apply')}><Check className="size-4" />Done</button>
            : <button className="btn btn-ghost btn-sm" disabled={pending} onClick={() => act('dismiss')}><X className="size-4" />Dismiss</button>)}
        </div>
      )}
    </article>
  );
}
