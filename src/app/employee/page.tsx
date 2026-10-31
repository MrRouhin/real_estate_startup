import Link from 'next/link';
import { AlertTriangle, ArrowRight, Check, HardHat, ShieldCheck, Sun } from 'lucide-react';
import { requirePartner } from '@/lib/auth';
import { date, todayIST } from '@/lib/format';
import { Section } from '@/components/ui/bits';
import { ActionForm, SubmitButton } from '@/components/ui/action-form';
import { LiveRefresh } from '@/components/live-refresh';
import { CheckIn } from './check-in';
import { updateTask } from './actions';

const TIPS = [
  'Wear your helmet and safety shoes before you enter the site.',
  'Clip your harness to a fixed point when working above 2 metres.',
  'Never stand under a load being lifted by the crane.',
  'Drink water every hour. Take shade breaks between 12 and 3.',
  'Report loose scaffolding or open shafts to your supervisor at once.',
  'Keep walkways clear of rods, nails and shuttering plates.',
  'Switch off and tag electrical tools before changing blades or bits.',
];

export default async function EmployeeToday() {
  const { supabase, user } = await requirePartner('employee');
  const { data: me } = await supabase.from('employees').select('*').eq('user_id', user.id).eq('active', true).single();
  const today = todayIST();
  const [{ data: project }, { data: att }, { data: tasks }, { data: prof }, { data: leave }] = await Promise.all([
    me!.project_id ? supabase.from('projects').select('name, site_lat, site_lng, geofence_m').eq('id', me!.project_id).single() : Promise.resolve({ data: null }),
    supabase.from('attendance').select('*').eq('employee_id', me!.id).order('work_date', { ascending: false }).limit(31),
    supabase.from('crew_tasks').select('*').order('status').order('due_date').limit(20),
    supabase.from('employee_profiles').select('status, review_note').eq('employee_id', me!.id).maybeSingle(),
    supabase.from('leave_requests').select('from_date, to_date, status').eq('employee_id', me!.id).eq('status', 'approved').gte('to_date', today),
  ]);
  const t = (att || []).find((a) => a.work_date === today) || null;
  const monthDays = (att || []).filter((a) => a.work_date.slice(0, 7) === today.slice(0, 7)).length;
  const open = (tasks || []).filter((x) => x.status !== 'done');
  const doneToday = (tasks || []).filter((x) => x.status === 'done' && x.done_at && x.done_at.slice(0, 10) === today);
  const tip = TIPS[new Date().getDate() % TIPS.length];
  const onLeave = (leave || []).find((l) => l.from_date <= today && l.to_date >= today);
  return (
    <>
      <LiveRefresh tables={['crew_tasks', 'attendance', 'leave_requests']} every={30000} />
      <div><div className="eyebrow">{new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}</div>
        <h1 className="text-[26px] font-bold">Hi {me!.full_name.split(' ')[0]}</h1><p className="text-[13.5px] text-ink-2">{project?.name}{monthDays ? ` · ${monthDays} days worked this month` : ''}</p></div>
      {(!prof || prof.status === 'draft' || prof.status === 'needs_changes') && (
        <Link href="/employee/profile" className="flex items-center gap-2 rounded-xl border border-[color-mix(in_srgb,var(--warn)_40%,transparent)] bg-[color-mix(in_srgb,var(--warn)_8%,transparent)] px-3 py-2.5 text-[13.5px]">
          <AlertTriangle className="size-4 shrink-0 text-warn" /><span className="flex-1">{prof?.status === 'needs_changes' ? `Your supervisor asked for changes: ${prof.review_note}` : 'Finish your profile so your supervisor can verify you for site work and wages.'}</span><ArrowRight className="size-4" />
        </Link>
      )}
      {onLeave ? <div className="card p-5 text-[14px]">You are on approved leave today. Enjoy your time off!</div> : (
        <CheckIn orgId={me!.org_id} userId={user.id} today={t ? { in: t.check_in_at, out: t.check_out_at, inside: t.inside_geofence, distance: t.distance_m } : null}
          site={project?.site_lat ? { lat: project.site_lat, lng: project.site_lng!, radius: project.geofence_m } : null} />
      )}
      <div className="flex items-start gap-3 rounded-2xl bg-[color-mix(in_srgb,var(--good)_10%,transparent)] p-4"><ShieldCheck className="mt-0.5 size-5 shrink-0 text-good" /><div><div className="text-[12px] font-bold uppercase tracking-wide text-good">Safety first</div><p className="text-[14px]">{tip}</p></div></div>
      <Section title={`My tasks${open.length ? ` (${open.length})` : ''}`} action={doneToday.length ? <span className="flex items-center gap-1 text-[12.5px] text-good"><Check className="size-4" />{doneToday.length} done today</span> : undefined}>
        {open.length === 0 ? <p className="flex items-center gap-2 text-[13.5px] text-ink-2"><Sun className="size-4" />No open tasks. Check with your supervisor.</p> : (
          <ul className="grid gap-3">
            {open.map((x) => (
              <li key={x.id} className={'rounded-2xl border p-3 ' + (x.priority === 'high' ? 'border-[color-mix(in_srgb,var(--bad)_35%,transparent)]' : 'border-line')}>
                <div className="flex items-start gap-2"><HardHat className={'mt-0.5 size-4 shrink-0 ' + (x.priority === 'high' ? 'text-bad' : 'text-ink-3')} />
                  <div className="min-w-0 flex-1"><div className="font-semibold">{x.title}</div>{x.details && <p className="text-[13px] text-ink-2">{x.details}</p>}
                    <div className="text-[12px] text-ink-3">{x.employee_id ? 'For you' : 'For the whole crew'} · due {date(x.due_date)}{x.priority === 'high' ? ' · high priority' : ''}{x.status === 'blocked' ? ' · marked blocked' : ''}</div></div></div>
                <ActionForm action={updateTask} className="mt-2 flex flex-wrap gap-2">
                  <input type="hidden" name="id" value={x.id} />
                  <input name="note" className="input min-w-[150px] flex-1 !py-1.5 text-[13px]" placeholder="Note (optional)" />
                  <SubmitButton className="btn btn-primary btn-sm" name="status" value="done"><Check className="size-4" />Done</SubmitButton>
                  {x.status !== 'blocked' && <SubmitButton className="btn btn-outline btn-sm" name="status" value="blocked">Can’t do it</SubmitButton>}
                </ActionForm>
              </li>
            ))}
          </ul>
        )}
      </Section>
    </>
  );
}
