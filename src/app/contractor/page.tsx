import Link from 'next/link';
import { AlertTriangle, ArrowRight, CheckCircle2, ClipboardList, HardHat, Mail, Plus, ReceiptIndianRupee, Users } from 'lucide-react';
import { requirePartner } from '@/lib/auth';
import { date, inr, lakh, todayIST } from '@/lib/format';
import { rollup, STATE_LABEL, wpHealth } from '@/lib/ai/plan';
import { ReportText, AISource, STATE_COLOR } from '@/components/ai/bits';
import { ProgressBar } from '@/components/ui/motion';
import { Section } from '@/components/ui/bits';
import { LiveRefresh } from '@/components/live-refresh';
import { companyCompleteness } from '@/components/portal/company-profile';
import { billNo } from '@/lib/numbering';

export default async function ContractorHome() {
  const { supabase } = await requirePartner('contractor');
  const { data: cid } = await supabase.rpc('my_contractor_id');
  const today = todayIST();
  const [{ data: c }, { data: wps }, { data: crew }, { data: att }, { data: bills }, { data: tasks }, { data: letters }, { data: reqs }, { data: reports }, { data: leave }] = await Promise.all([
    supabase.from('contractors').select('*').eq('id', cid!).single(),
    supabase.from('work_packages').select('*').eq('contractor_id', cid!).order('due_date'),
    supabase.from('employees').select('id, full_name, role_title').eq('contractor_id', cid!).eq('active', true),
    supabase.from('attendance').select('employee_id, check_in_at, inside_geofence').eq('work_date', today),
    supabase.from('contractor_bills').select('id, seq, gross_amount, net_payable, status, created_at, paid_at').eq('contractor_id', cid!).order('created_at', { ascending: false }),
    supabase.from('crew_tasks').select('id, title, status, due_date, priority, employee_id').eq('contractor_id', cid!).neq('status', 'done').order('due_date'),
    supabase.from('letters').select('id, subject, issued_at').eq('recipient_type', 'contractor').eq('recipient_id', cid!).eq('status', 'issued'),
    supabase.from('material_requests').select('id, status').eq('contractor_id', cid!).in('status', ['requested', 'approved']),
    supabase.from('ai_insights').select('id, kind, title, body, source, created_at').eq('scope', 'contractor').eq('subject_id', cid!).eq('shared_with_contractor', true).order('created_at', { ascending: false }).limit(3),
    supabase.from('leave_requests').select('id').eq('status', 'pending'),
  ]);
  const ids = (wps || []).map((w) => w.id);
  const [{ data: points }, { data: plog }] = ids.length ? await Promise.all([
    supabase.from('wp_plan_points').select('work_package_id, planned_date, planned_pct').in('work_package_id', ids).order('planned_date'),
    supabase.from('wp_progress_log').select('work_package_id, progress, logged_at').in('work_package_id', ids).order('logged_at'),
  ]) : [{ data: [] }, { data: [] }];
  const health = (wps || []).map((w) => wpHealth(w, (points || []).filter((p) => p.work_package_id === w.id), (plog || []).filter((l) => l.work_package_id === w.id), today));
  const roll = rollup(health);
  const here = new Set((att || []).map((a) => a.employee_id));
  const onSite = (crew || []).filter((e) => here.has(e.id)).length;
  const paid = (bills || []).filter((b) => b.status === 'paid').reduce((a, b) => a + Number(b.net_payable), 0);
  const pending = (bills || []).filter((b) => ['submitted', 'verified', 'approved'].includes(b.status)).reduce((a, b) => a + Number(b.net_payable), 0);
  const contract = (wps || []).reduce((a, w) => a + Number(w.contract_value || 0), 0);
  const earned = (wps || []).reduce((a, w) => a + Number(w.contract_value || 0) * Number(w.progress) / 100, 0);
  const billed = (bills || []).filter((b) => b.status !== 'rejected').reduce((a, b) => a + Number(b.gross_amount), 0);
  const comp = companyCompleteness(c!, 'contractor');
  const insDays = c?.insurance_valid_till ? Math.round((new Date(c.insurance_valid_till).getTime() - Date.now()) / 86400000) : null;
  const latest = (reports || []).find((r) => r.kind === 'weekly_report');
  const crewName = Object.fromEntries((crew || []).map((e) => [e.id, e.full_name]));

  return (
    <>
      <LiveRefresh tables={['work_packages', 'contractor_bills', 'crew_tasks', 'attendance', 'letters', 'leave_requests']} every={30000} />
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div><div className="eyebrow">Dashboard</div><h1 className="text-[26px] font-bold">Good to see you{c?.contact_person ? `, ${c.contact_person.split(' ')[0]}` : ''}</h1>
          <p className="text-[13.5px] text-ink-2">{onSite} of {(crew || []).length} crew checked in today · {(wps || []).filter((w) => w.status !== 'completed').length} work packages open</p></div>
        <div className="flex flex-wrap gap-2">
          <Link href="/contractor/work#progress" className="btn btn-primary"><HardHat className="size-4" />Log today’s progress</Link>
          <Link href="/contractor/bills#new" className="btn btn-outline"><Plus className="size-4" />Raise a bill</Link>
        </div>
      </div>

      {(letters?.length || (insDays != null && insDays < 30) || comp.pct < 100 || c?.profile_status === 'needs_changes') ? (
        <div className="grid gap-2">
          {(letters || []).map((l) => <Link key={l.id} href={`/letters/${l.id}`} className="flex items-center gap-2 rounded-xl border border-[color-mix(in_srgb,var(--warn)_40%,transparent)] bg-[color-mix(in_srgb,var(--warn)_8%,transparent)] px-3 py-2.5 text-[13.5px]"><Mail className="size-4 shrink-0 text-warn" /><span className="flex-1"><b>Letter to acknowledge:</b> {l.subject}</span><ArrowRight className="size-4" /></Link>)}
          {insDays != null && insDays < 30 && <div className="flex items-center gap-2 rounded-xl bg-[color-mix(in_srgb,var(--bad)_8%,transparent)] px-3 py-2.5 text-[13.5px] text-bad"><AlertTriangle className="size-4" />Workmen compensation insurance {insDays < 0 ? 'has expired' : `expires in ${insDays} days`}. Upload the renewal on your company profile.</div>}
          {c?.profile_status === 'needs_changes' && <Link href="/contractor/profile" className="flex items-center gap-2 rounded-xl bg-[color-mix(in_srgb,var(--bad)_8%,transparent)] px-3 py-2.5 text-[13.5px] text-bad"><AlertTriangle className="size-4" />The developer asked for changes to your company profile: {c.profile_note}</Link>}
          {comp.pct < 100 && c?.profile_status !== 'needs_changes' && <Link href="/contractor/profile" className="flex items-center gap-2 rounded-xl bg-surface-2 px-3 py-2.5 text-[13.5px]"><CheckCircle2 className="size-4 text-accent" /><span className="flex-1">Company profile {comp.pct}% complete. Finish it to get bills paid faster.</span><ArrowRight className="size-4" /></Link>}
        </div>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="card p-4"><div className="eyebrow">Work done</div><div className="num text-[24px] font-semibold">{Math.round(roll.actual)}%</div>
          <div className="text-[12.5px]" style={{ color: STATE_COLOR[roll.state] }}>{STATE_LABEL[roll.state]} · plan {Math.round(roll.planned)}%</div></div>
        <div className="card p-4"><div className="eyebrow">Crew on site</div><div className="num text-[24px] font-semibold">{onSite}<span className="text-[15px] text-ink-3">/{(crew || []).length}</span></div>
          <div className="text-[12.5px] text-ink-2">{(leave || []).length} leave request{(leave || []).length === 1 ? '' : 's'} waiting</div></div>
        <div className="card p-4"><div className="eyebrow">Paid to you</div><div className="num text-[24px] font-semibold">{lakh(paid)}</div>
          <div className="text-[12.5px] text-ink-2">{lakh(pending)} in process</div></div>
        <div className="card p-4"><div className="eyebrow">Still to bill</div><div className="num text-[24px] font-semibold">{lakh(Math.max(0, earned - billed))}</div>
          <div className="text-[12.5px] text-ink-2">of {lakh(contract)} contracts</div></div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
        <Section title="My work packages" action={<Link href="/contractor/work" className="text-[13px] font-semibold text-accent">Open</Link>}>
          <ul className="grid gap-3">
            {(wps || []).map((w) => { const h = health.find((x) => x.id === w.id)!; return (
              <li key={w.id} className="grid gap-1.5">
                <div className="flex items-start justify-between gap-2 text-[13.5px]"><span className="font-semibold">{w.title}</span>
                  <span className="whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-bold" style={{ color: STATE_COLOR[h.state], background: `color-mix(in srgb, ${STATE_COLOR[h.state]} 13%, transparent)` }}>{STATE_LABEL[h.state]}</span></div>
                <div className="flex items-center gap-3"><ProgressBar value={Number(w.progress)} /><span className="num w-10 text-right text-[12.5px] font-semibold">{Math.round(Number(w.progress))}%</span></div>
                <div className="text-[12px] text-ink-3">Due {date(w.due_date)} · contract {inr(w.contract_value)}</div>
              </li>
            ); })}
          </ul>
        </Section>
        <div className="grid content-start gap-5">
          <Section title="Open crew tasks" action={<Link href="/contractor/crew#tasks" className="text-[13px] font-semibold text-accent">Assign</Link>}>
            {(tasks || []).length === 0 ? <p className="text-[13.5px] text-ink-2">No open tasks.</p> : (
              <ul className="grid gap-2">{tasks!.slice(0, 6).map((t) => (
                <li key={t.id} className="flex items-start gap-2 text-[13.5px]"><ClipboardList className={'mt-0.5 size-4 shrink-0 ' + (t.priority === 'high' ? 'text-bad' : 'text-ink-3')} />
                  <span className="flex-1">{t.title}<span className="block text-[12px] text-ink-3">{t.employee_id ? crewName[t.employee_id] : 'Whole crew'} · due {date(t.due_date)}{t.status === 'blocked' ? ' · blocked' : ''}</span></span></li>
              ))}</ul>
            )}
          </Section>
          <Section title="Bills" action={<Link href="/contractor/bills" className="text-[13px] font-semibold text-accent">All bills</Link>}>
            <ul className="grid gap-2 text-[13.5px]">
              {(bills || []).slice(0, 4).map((b) => (
                <li key={b.id} className="flex items-center justify-between gap-2"><span className="flex items-center gap-2"><ReceiptIndianRupee className="size-4 text-ink-3" /><span className="num">{billNo(b.seq, b.created_at)}</span></span>
                  <span className="num">{lakh(b.net_payable)}</span><span className="w-20 text-right text-[12px] capitalize text-ink-2">{b.status}</span></li>
              ))}
              {(bills || []).length === 0 && <li className="text-ink-2">No bills yet.</li>}
            </ul>
          </Section>
          <Section title="Store requests"><p className="text-[13.5px] text-ink-2"><b className="num text-ink">{(reqs || []).length}</b> material requests waiting with the store. <Link href="/contractor/work#materials" className="font-semibold text-accent">Request more</Link></p></Section>
        </div>
      </div>
      {latest && (
        <Section title={latest.title} action={<span className="flex items-center gap-2 text-[12px] text-ink-3"><AISource source={latest.source} />{date(latest.created_at)}</span>}>
          {latest.body && <ReportText text={latest.body} />}
        </Section>
      )}
      <div className="flex items-center gap-2 text-[12.5px] text-ink-3"><Users className="size-4" />Everything here updates live as the developer reviews your work.</div>
    </>
  );
}
