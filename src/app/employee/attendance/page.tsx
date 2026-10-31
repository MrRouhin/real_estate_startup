import { requirePartner } from '@/lib/auth';
import { inr, time, todayIST } from '@/lib/format';
import { Section, PageHeader } from '@/components/ui/bits';
import { LiveRefresh } from '@/components/live-refresh';

export const metadata = { title: 'Attendance and wages' };

export default async function EmployeeAttendance({ searchParams }: { searchParams: Promise<{ m?: string }> }) {
  const { m } = await searchParams;
  const { supabase, user } = await requirePartner('employee');
  const { data: me } = await supabase.from('employees').select('id, daily_wage, full_name').eq('user_id', user.id).eq('active', true).single();
  const today = todayIST();
  const month = /^\d{4}-\d{2}$/.test(m ?? '') ? m! : today.slice(0, 7);
  const [y, mo] = month.split('-').map(Number) as [number, number];
  const first = new Date(Date.UTC(y, mo - 1, 1)), daysIn = new Date(Date.UTC(y, mo, 0)).getUTCDate();
  const end = `${month}-${String(daysIn).padStart(2, '0')}`;
  const [{ data: att }, { data: leave }] = await Promise.all([
    supabase.from('attendance').select('*').eq('employee_id', me!.id).gte('work_date', `${month}-01`).lte('work_date', end),
    supabase.from('leave_requests').select('from_date, to_date, kind').eq('employee_id', me!.id).eq('status', 'approved').lte('from_date', end).gte('to_date', `${month}-01`),
  ]);
  const by = new Map((att || []).map((a) => [a.work_date, a]));
  const wage = Number(me!.daily_wage || 0);
  const hours = (att || []).reduce((a, x) => a + (x.check_out_at ? (new Date(x.check_out_at).getTime() - new Date(x.check_in_at).getTime()) / 3600000 : 0), 0);
  const prev = new Date(Date.UTC(y, mo - 2, 1)).toISOString().slice(0, 7), next = new Date(Date.UTC(y, mo, 1)).toISOString().slice(0, 7);
  const lead = (first.getUTCDay() + 6) % 7; // Monday first
  return (
    <>
      <LiveRefresh tables={['attendance']} every={30000} />
      <PageHeader emoji="📅" title="Attendance and wages" sub={<>Every check-in counts as a paid day at ₹{wage}/day. Your contractor pays wages; this is your own record.</>} />
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="card p-4"><div className="eyebrow">Days worked</div><div className="num text-[26px] font-semibold">{(att || []).length}</div></div>
        <div className="card p-4"><div className="eyebrow">Hours on site</div><div className="num text-[26px] font-semibold">{Math.round(hours)}</div></div>
        <div className="card p-4"><div className="eyebrow">Wages earned</div><div className="num text-[26px] font-semibold">{inr((att || []).length * wage)}</div></div>
      </div>
      <Section title={first.toLocaleDateString('en-IN', { month: 'long', year: 'numeric', timeZone: 'UTC' })}
        action={<div className="flex gap-1"><a className="btn btn-ghost btn-sm" href={`?m=${prev}`}>← Prev</a>{month < today.slice(0, 7) && <a className="btn btn-ghost btn-sm" href={`?m=${next}`}>Next →</a>}</div>}>
        <div className="grid grid-cols-7 gap-1.5 text-center text-[11px] text-ink-3">{['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => <div key={d}>{d}</div>)}</div>
        <div className="mt-1 grid grid-cols-7 gap-1.5">
          {Array.from({ length: lead }, (_, i) => <div key={'x' + i} />)}
          {Array.from({ length: daysIn }, (_, i) => {
            const d = `${month}-${String(i + 1).padStart(2, '0')}`, a = by.get(d), lv = (leave || []).find((l) => l.from_date <= d && l.to_date >= d), future = d > today;
            return (
              <div key={d} title={a ? `${time(a.check_in_at)} – ${a.check_out_at ? time(a.check_out_at) : '…'}` : lv ? `On ${lv.kind} leave` : ''}
                className={'grid aspect-square content-center rounded-xl text-[12px] ' + (a ? (a.inside_geofence === false ? 'bg-[color-mix(in_srgb,var(--warn)_25%,transparent)]' : 'bg-[color-mix(in_srgb,var(--good)_22%,transparent)]') : lv ? 'bg-[color-mix(in_srgb,var(--st-booked)_16%,transparent)]' : future ? 'opacity-40' : 'bg-surface-2')}>
                <span className={'num font-semibold ' + (d === today ? 'text-accent' : '')}>{i + 1}</span>
                <span className="text-[13px]">{a ? '✅' : lv ? '🏖️' : ''}</span>
              </div>
            );
          })}
        </div>
        <p className="mt-3 text-[12px] text-ink-3">✅ worked (amber if checked in away from site) · 🏖️ approved leave</p>
      </Section>
    </>
  );
}
