import { BadgeCheck, CalendarDays, Check, ClipboardList, HeartPulse, Languages, Phone, ShieldCheck, UserPlus, X } from 'lucide-react';
import { requirePartner } from '@/lib/auth';
import { date, inr, todayIST } from '@/lib/format';
import { Avatar, Pill, Section, PageHeader } from '@/components/ui/bits';
import { ActionForm, SubmitButton } from '@/components/ui/action-form';
import { LiveRefresh } from '@/components/live-refresh';
import { assignTask, decideLeave, markAttendance, reviewWorker, saveWorker, setTaskStatus } from '../actions';

export const metadata = { title: 'Crew' };

const PROFILE_TONE: Record<string, 'good' | 'warn' | 'bad' | 'muted'> = { verified: 'good', submitted: 'warn', needs_changes: 'bad', draft: 'muted' };
const PROFILE_LABEL: Record<string, string> = { verified: 'Verified', submitted: 'To review', needs_changes: 'Changes asked', draft: 'Incomplete' };
const days = (n: number) => Array.from({ length: n }, (_, i) => { const d = new Date(Date.now() + 5.5 * 3600000 - (n - 1 - i) * 86400000); return d.toISOString().slice(0, 10); });

export default async function ContractorCrew() {
  const { supabase } = await requirePartner('contractor');
  const { data: cid } = await supabase.rpc('my_contractor_id');
  const week = days(7), today = todayIST(), monthStart = today.slice(0, 8) + '01';
  const [{ data: crew }, { data: profiles }, { data: att }, { data: leave }, { data: tasks }, { data: wps }] = await Promise.all([
    supabase.from('employees').select('*').eq('contractor_id', cid!).order('active', { ascending: false }).order('full_name'),
    supabase.from('employee_profiles').select('*'),
    supabase.from('attendance').select('employee_id, work_date, check_in_at, check_out_at, inside_geofence, work_note').gte('work_date', week[0]! < monthStart ? week[0]! : monthStart),
    supabase.from('leave_requests').select('*').order('created_at', { ascending: false }).limit(30),
    supabase.from('crew_tasks').select('*').eq('contractor_id', cid!).order('status').order('due_date').limit(40),
    supabase.from('work_packages').select('id, title').eq('contractor_id', cid!),
  ]);
  const active = (crew || []).filter((e) => e.active);
  const prof = new Map((profiles || []).map((p) => [p.employee_id, p]));
  const name = Object.fromEntries((crew || []).map((e) => [e.id, e.full_name]));
  const present = (id: string, d: string) => (att || []).find((a) => a.employee_id === id && a.work_date === d);
  const monthDays = (id: string) => (att || []).filter((a) => a.employee_id === id && a.work_date >= monthStart).length;
  const toReview = active.filter((e) => prof.get(e.id)?.status === 'submitted');
  const pendingLeave = (leave || []).filter((l) => l.status === 'pending');
  const wageBill = active.reduce((a, e) => a + monthDays(e.id) * Number(e.daily_wage || 0), 0);

  return (
    <>
      <LiveRefresh tables={['employees', 'attendance', 'leave_requests', 'crew_tasks', 'employee_profiles']} every={30000} />
      <div className="flex flex-wrap items-end justify-between gap-3">
        <PageHeader emoji="👷" title="My crew" sub={<>{active.length} active · {active.filter((e) => present(e.id, today)).length} on site today · wages this month so far <b className="num text-ink">{inr(wageBill)}</b></>} />
        <a href="#add" className="btn btn-primary"><UserPlus className="size-4" />Add a worker</a>
      </div>

      {(toReview.length > 0 || pendingLeave.length > 0) && (
        <div className="grid gap-5 lg:grid-cols-2">
          {toReview.length > 0 && (
            <Section title={`Profiles to review (${toReview.length})`}>
              <ul className="grid gap-3">
                {toReview.map((e) => { const p = prof.get(e.id)!; return (
                  <li key={e.id} className="rounded-xl border border-line p-3">
                    <div className="flex items-center gap-2"><Avatar name={e.full_name} size={30} /><div><div className="font-semibold">{e.full_name}</div><div className="text-[12px] text-ink-3">{e.employee_code} · {p.trade || e.role_title}</div></div></div>
                    <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-[12.5px]">
                      <dt className="text-ink-3">Born</dt><dd>{date(p.date_of_birth)}</dd>
                      <dt className="text-ink-3">From</dt><dd>{[p.city, p.home_state].filter(Boolean).join(', ') || '—'}</dd>
                      <dt className="text-ink-3">ID</dt><dd className="num">{p.id_type ? `${p.id_type} ••••${p.id_last4}` : '—'}</dd>
                      <dt className="text-ink-3">Emergency</dt><dd>{p.emergency_name ? `${p.emergency_name} (${p.emergency_relation})` : '—'}</dd>
                      <dt className="text-ink-3">Experience</dt><dd>{p.experience_years ?? '—'} yrs · {(p.skills || []).join(', ')}</dd>
                      <dt className="text-ink-3">Safety</dt><dd>{p.safety_trained ? `Trained ${date(p.safety_training_date)}` : 'Not trained yet'}</dd>
                      <dt className="text-ink-3">Paid to</dt><dd className="num">{p.upi_id || (p.bank_ifsc ? `${p.bank_ifsc} ••${p.bank_last4}` : '—')}</dd>
                    </dl>
                    <ActionForm action={reviewWorker} className="mt-2 flex flex-wrap gap-2">
                      <input type="hidden" name="employee_id" value={e.id} />
                      <input name="note" className="input min-w-[160px] flex-1 !py-1.5 text-[13px]" placeholder="Note (needed if asking for changes)" />
                      <SubmitButton className="btn btn-primary btn-sm" name="status" value="verified"><BadgeCheck className="size-4" />Verify</SubmitButton>
                      <SubmitButton className="btn btn-outline btn-sm" name="status" value="needs_changes">Ask for changes</SubmitButton>
                    </ActionForm>
                  </li>
                ); })}
              </ul>
            </Section>
          )}
          {pendingLeave.length > 0 && (
            <Section title={`Leave requests (${pendingLeave.length})`}>
              <ul className="grid gap-3">
                {pendingLeave.map((l) => (
                  <li key={l.id} className="rounded-xl border border-line p-3 text-[13.5px]">
                    <div className="flex items-start justify-between gap-2"><div><b>{name[l.employee_id] ?? 'Worker'}</b><div className="text-ink-2">{date(l.from_date)} → {date(l.to_date)} · <span className="capitalize">{l.kind}</span></div>{l.reason && <div className="text-ink-3">“{l.reason}”</div>}</div><CalendarDays className="size-4 text-ink-3" /></div>
                    <ActionForm action={decideLeave} className="mt-2 flex flex-wrap gap-2">
                      <input type="hidden" name="id" value={l.id} />
                      <input name="note" className="input min-w-[140px] flex-1 !py-1.5 text-[13px]" placeholder="Note (optional)" />
                      <SubmitButton className="btn btn-primary btn-sm" name="approve" value="true"><Check className="size-4" />Approve</SubmitButton>
                      <SubmitButton className="btn btn-outline btn-sm" name="approve" value="false"><X className="size-4" />Decline</SubmitButton>
                    </ActionForm>
                  </li>
                ))}
              </ul>
            </Section>
          )}
        </div>
      )}

      <Section title="Attendance this week">
        <div className="scroll-x">
          <table className="table text-[13px]">
            <thead><tr><th>Worker</th>{week.map((d) => <th key={d} className="text-center">{new Date(d).toLocaleDateString('en-IN', { weekday: 'short' })}<span className="block text-[10.5px] font-normal text-ink-3">{d.slice(8)}</span></th>)}<th className="text-right">Month</th><th className="text-right">Earned</th></tr></thead>
            <tbody>
              {active.map((e) => (
                <tr key={e.id}>
                  <td><div className="font-medium">{e.full_name}</div><div className="text-[11.5px] text-ink-3">{e.role_title} · ₹{Number(e.daily_wage || 0)}/day</div></td>
                  {week.map((d) => { const a = present(e.id, d), onLeave = (leave || []).some((l) => l.employee_id === e.id && l.status === 'approved' && l.from_date <= d && l.to_date >= d); return (
                    <td key={d} className="text-center" title={a ? (a.work_note || (a.inside_geofence === false ? 'Checked in away from site' : 'Checked in')) : onLeave ? 'On leave' : 'Absent'}>
                      {a ? <span className={'inline-grid size-6 place-items-center rounded-md text-[11px] font-bold text-white ' + (a.inside_geofence === false ? 'bg-warn' : a.work_note?.startsWith('Marked') ? 'bg-[#6b8f7d]' : 'bg-good')}>P</span>
                        : onLeave ? <span className="inline-grid size-6 place-items-center rounded-md bg-[color-mix(in_srgb,var(--st-booked)_18%,transparent)] text-[11px] font-bold text-[var(--st-booked)]">L</span>
                        : <span className="inline-grid size-6 place-items-center rounded-md bg-surface-2 text-[11px] text-ink-3">–</span>}
                    </td>
                  ); })}
                  <td className="num text-right">{monthDays(e.id)} d</td>
                  <td className="num text-right">{inr(monthDays(e.id) * Number(e.daily_wage || 0))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-[12px] text-ink-3">P = present (green: checked in at site; amber: away from site; grey-green: marked by you). L = approved leave.</p>
        <ActionForm action={markAttendance} className="mt-3 flex flex-wrap items-end gap-2 border-t border-line pt-3">
          <div><label className="label" htmlFor="ae">Mark for a day the phone wasn’t used</label><select id="ae" name="employee_id" className="input">{active.map((e) => <option key={e.id} value={e.id}>{e.full_name}</option>)}</select></div>
          <div><label className="label" htmlFor="ad">Date</label><input id="ad" type="date" name="date" defaultValue={today} min={week[0]} max={today} className="input" /></div>
          <div className="min-w-[140px] flex-1"><label className="label" htmlFor="an">Note</label><input id="an" name="note" className="input" placeholder="Phone not charged" /></div>
          <SubmitButton className="btn btn-primary" name="present" value="true">Present</SubmitButton>
          <SubmitButton className="btn btn-outline" name="present" value="false">Absent</SubmitButton>
        </ActionForm>
      </Section>

      <div id="tasks" className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
        <Section title="Assign a task">
          <ActionForm action={assignTask} className="grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2"><label className="label" htmlFor="tt">Task</label><input id="tt" name="title" className="input" required placeholder="Shuttering check before pour" /></div>
            <div><label className="label" htmlFor="te">For</label><select id="te" name="employee_id" className="input"><option value="">Whole crew</option>{active.map((e) => <option key={e.id} value={e.id}>{e.full_name}</option>)}</select></div>
            <div><label className="label" htmlFor="tw">Work package</label><select id="tw" name="work_package_id" className="input"><option value="">—</option>{(wps || []).map((w) => <option key={w.id} value={w.id}>{w.title}</option>)}</select></div>
            <div><label className="label" htmlFor="td">Due</label><input id="td" type="date" name="due_date" min={today} defaultValue={today} className="input" /></div>
            <div><label className="label" htmlFor="tp">Priority</label><select id="tp" name="priority" className="input" defaultValue="normal"><option value="high">High</option><option value="normal">Normal</option><option value="low">Low</option></select></div>
            <div className="sm:col-span-2"><label className="label" htmlFor="tx">Details</label><textarea id="tx" name="details" className="input min-h-[70px]" placeholder="What, where, and any safety point" /></div>
            <SubmitButton className="btn btn-primary sm:col-span-2"><ClipboardList className="size-4" />Assign</SubmitButton>
          </ActionForm>
        </Section>
        <Section title="Tasks">
          <ul className="divide-y divide-line">
            {(tasks || []).map((t) => (
              <li key={t.id} className="flex items-start gap-3 py-2.5 text-[13.5px]">
                <span className={'mt-1 size-2.5 shrink-0 rounded-full ' + (t.status === 'done' ? 'bg-good' : t.status === 'blocked' ? 'bg-bad' : t.priority === 'high' ? 'bg-warn' : 'bg-ink-3')} />
                <div className="min-w-0 flex-1">
                  <div className={t.status === 'done' ? 'text-ink-3 line-through' : 'font-medium'}>{t.title}</div>
                  <div className="text-[12px] text-ink-3">{t.employee_id ? name[t.employee_id] : 'Whole crew'} · due {date(t.due_date)}{t.done_note ? ` · “${t.done_note}”` : ''}</div>
                </div>
                <ActionForm action={setTaskStatus} className="shrink-0">
                  <input type="hidden" name="id" value={t.id} />
                  {t.status === 'done' ? <SubmitButton className="btn btn-ghost btn-sm" name="status" value="open">Reopen</SubmitButton> : <SubmitButton className="btn btn-outline btn-sm" name="status" value="done"><Check className="size-4" />Done</SubmitButton>}
                </ActionForm>
              </li>
            ))}
            {(tasks || []).length === 0 && <li className="py-3 text-[13.5px] text-ink-2">No tasks yet.</li>}
          </ul>
        </Section>
      </div>

      <Section title="Crew roster">
        <ul className="grid gap-3 md:grid-cols-2">
          {(crew || []).map((e) => { const p = prof.get(e.id); const st = p?.status ?? 'draft'; return (
            <li key={e.id} className={'rounded-2xl border border-line p-3 ' + (e.active ? '' : 'opacity-60')}>
              <div className="flex items-start gap-3">
                <Avatar name={e.full_name} size={36} />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2"><b>{e.full_name}</b><Pill status={st} tone={PROFILE_TONE[st]} label={PROFILE_LABEL[st]} />{!e.active && <span className="tag">Inactive</span>}{e.user_id && <span className="tag">Has app login</span>}</div>
                  <div className="text-[12.5px] text-ink-2">{e.employee_code} · {e.role_title || 'Crew'} · ₹{Number(e.daily_wage || 0)}/day</div>
                  <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-[12px] text-ink-3">
                    {e.phone && <span className="flex items-center gap-1"><Phone className="size-3" />{e.phone}</span>}
                    {p?.blood_group && <span className="flex items-center gap-1"><HeartPulse className="size-3" />{p.blood_group}</span>}
                    {p?.languages?.length ? <span className="flex items-center gap-1"><Languages className="size-3" />{p.languages.join(', ')}</span> : null}
                    {p?.safety_trained && <span className="flex items-center gap-1 text-good"><ShieldCheck className="size-3" />Safety trained</span>}
                  </div>
                </div>
              </div>
              <details className="mt-2">
                <summary className="cursor-pointer text-[12.5px] font-semibold text-accent">Edit</summary>
                <ActionForm action={saveWorker} reset={false} className="mt-2 grid grid-cols-2 gap-2">
                  <input type="hidden" name="id" value={e.id} />
                  <input name="full_name" defaultValue={e.full_name} className="input col-span-2" aria-label="Name" />
                  <input name="role_title" defaultValue={e.role_title ?? ''} className="input" placeholder="Trade" aria-label="Trade" />
                  <input name="daily_wage" defaultValue={e.daily_wage ?? ''} className="input num" placeholder="Daily wage" aria-label="Daily wage" />
                  <input name="phone" defaultValue={e.phone ?? ''} className="input num" placeholder="Phone" aria-label="Phone" />
                  <select name="active" defaultValue={String(e.active)} className="input" aria-label="Status"><option value="true">Active</option><option value="false">Inactive</option></select>
                  <SubmitButton className="btn btn-outline btn-sm col-span-2">Save</SubmitButton>
                </ActionForm>
              </details>
            </li>
          ); })}
        </ul>
      </Section>

      <Section title="Add a worker" className="scroll-mt-20" >
        <div id="add" />
        <ActionForm action={saveWorker} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div><label className="label" htmlFor="wn">Full name</label><input id="wn" name="full_name" className="input" required /></div>
          <div><label className="label" htmlFor="wr">Trade</label><input id="wr" name="role_title" className="input" placeholder="Bar bender" list="trades" /></div>
          <div><label className="label" htmlFor="ww">Daily wage (₹)</label><input id="ww" name="daily_wage" className="input num" inputMode="numeric" placeholder="750" /></div>
          <div><label className="label" htmlFor="wp">Mobile</label><input id="wp" name="phone" className="input num" inputMode="tel" placeholder="98450 12345" /></div>
          <datalist id="trades">{['Mason', 'Bar bender', 'Carpenter (shuttering)', 'Electrician', 'Plumber', 'Helper', 'Welder', 'Painter', 'Tile layer', 'Supervisor'].map((t) => <option key={t} value={t} />)}</datalist>
          <SubmitButton className="btn btn-primary sm:col-span-2 lg:col-span-4"><UserPlus className="size-4" />Add to crew</SubmitButton>
          <p className="text-[12px] text-ink-3 sm:col-span-2 lg:col-span-4">Workers must be 18 or older. To give a worker their own app login, the developer links it after they join with your company’s invite code.</p>
        </ActionForm>
      </Section>
    </>
  );
}
