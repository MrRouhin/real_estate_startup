import { AlertTriangle, MapPin, UserPlus } from 'lucide-react';
import { requireStaff } from '@/lib/auth';
import { time, todayIST } from '@/lib/format';
import { Avatar, PageHeader, Section } from '@/components/ui/bits';
import { AnimatedNumber, Item, Stagger } from '@/components/ui/motion';
import { ActionForm, SubmitButton } from '@/components/ui/action-form';
import { LiveRefresh } from '@/components/live-refresh';
import { createEmployee, linkLogin } from '../actions';

export const metadata = { title: 'Employees' };

export default async function Employees() {
  const { supabase, orgId } = await requireStaff();
  const days: string[] = [];
  for (let i = 13; i >= 0; i--) days.push(new Date(Date.now() + 5.5 * 3600000 - i * 86400000).toISOString().slice(0, 10));
  const [{ data: emps }, { data: att }, { data: cs }] = await Promise.all([
    supabase.from('employees').select('*').eq('org_id', orgId).eq('active', true).order('employee_code'),
    supabase.from('attendance').select('employee_id, work_date, check_in_at, check_out_at, inside_geofence, distance_m, work_note').eq('org_id', orgId).gte('work_date', days[0]!),
    supabase.from('contractors').select('id, company_name').eq('org_id', orgId),
  ]);
  const today = todayIST();
  const cName = Object.fromEntries((cs || []).map((c) => [c.id, c.company_name]));
  const key = (e: string, d: string) => `${e}|${d}`;
  const byKey = new Map((att || []).map((a) => [key(a.employee_id, a.work_date), a]));
  const present = (emps || []).filter((e) => byKey.has(key(e.id, today)));
  const outside = present.filter((e) => byKey.get(key(e.id, today))!.inside_geofence === false);
  const late = present.filter((e) => { const t = new Date(byKey.get(key(e.id, today))!.check_in_at); return t.getUTCHours() * 60 + t.getUTCMinutes() + 330 > 9 * 60 + 30; });
  const wageToday = present.reduce((a, e) => a + Number(e.daily_wage || 0), 0);
  const groups = new Map<string, typeof emps>();
  (emps || []).forEach((e) => { const g = e.contractor_id ? cName[e.contractor_id] || 'Contractor' : 'Developer staff'; groups.set(g, [...(groups.get(g) || []), e]); });

  return (
    <>
      <LiveRefresh tables={['attendance']} filter={`org_id=eq.${orgId}`} />
      <PageHeader eyebrow="Site" title="Employees and attendance" sub="Workers check in from their phone with a selfie. Check-ins farther than the site geofence are flagged." />
      <Stagger className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Item className="card p-4"><div className="eyebrow">On site today</div><div className="num mt-1 text-[26px] font-medium"><AnimatedNumber value={present.length} /><span className="text-[15px] text-ink-3"> / {(emps || []).length}</span></div></Item>
        <Item className="card p-4"><div className="eyebrow">Outside geofence</div><div className={'num mt-1 text-[26px] font-medium ' + (outside.length ? 'text-bad' : '')}><AnimatedNumber value={outside.length} /></div></Item>
        <Item className="card p-4"><div className="eyebrow">Arrived after 9:30</div><div className="num mt-1 text-[26px] font-medium"><AnimatedNumber value={late.length} /></div></Item>
        <Item className="card p-4"><div className="eyebrow">Wages for today</div><div className="num mt-1 text-[26px] font-medium">₹{wageToday.toLocaleString('en-IN')}</div></Item>
      </Stagger>

      <Section title="Today">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {(emps || []).map((e) => { const a = byKey.get(key(e.id, today)); return (
            <div key={e.id} className={'flex items-center gap-3 rounded-2xl border p-3 ' + (a ? (a.inside_geofence === false ? 'border-bad/40 bg-[color-mix(in_srgb,var(--bad)_6%,transparent)]' : 'border-line') : 'border-dashed border-line opacity-70')}>
              <div className="relative"><Avatar name={e.full_name} size={38} />{a && <span className={'absolute -bottom-0.5 -right-0.5 size-3 rounded-full border-2 border-surface ' + (a.inside_geofence === false ? 'bg-bad' : 'bg-good')} />}</div>
              <div className="min-w-0 flex-1"><div className="truncate text-[13.5px] font-semibold">{e.full_name}</div><div className="truncate text-[11.5px] text-ink-3">{e.employee_code} · {e.role_title}</div></div>
              <div className="text-right text-[12px]">{a ? <><div className="num font-semibold">{time(a.check_in_at)}</div>
                {a.inside_geofence === false ? <div className="flex items-center gap-1 font-semibold text-bad"><AlertTriangle className="size-3" />{a.distance_m} m</div> : <div className="flex items-center gap-1 text-good"><MapPin className="size-3" />site</div>}</> : <span className="text-ink-3">Not in</span>}</div>
            </div>
          ); })}
        </div>
      </Section>

      <Section title="Last 14 days">
        <div className="scroll-x">
          <table className="min-w-[760px] border-separate border-spacing-[3px] text-[12px]">
            <thead><tr><th className="text-left font-semibold text-ink-3" />{days.map((d) => <th key={d} className="num w-7 font-normal text-ink-3">{Number(d.slice(8))}</th>)}<th className="pl-2 text-right font-semibold text-ink-3">Days</th></tr></thead>
            <tbody>
              {[...groups.entries()].map(([g, list]) => [
                <tr key={g}><td colSpan={days.length + 2} className="pt-3 text-[11px] font-semibold uppercase tracking-wider text-ink-3">{g}</td></tr>,
                ...list!.map((e) => (
                  <tr key={e.id}>
                    <td className="whitespace-nowrap pr-3 text-[13px]">{e.full_name}</td>
                    {days.map((d) => { const a = byKey.get(key(e.id, d)); const sun = new Date(d + 'T12:00:00Z').getUTCDay() === 0;
                      return <td key={d} title={a ? `${d}: in ${time(a.check_in_at)}${a.inside_geofence === false ? ' (outside site)' : ''}` : sun ? 'Sunday' : `${d}: absent`}
                        className={'h-6 rounded-[5px] ' + (a ? (a.inside_geofence === false ? 'bg-bad' : 'bg-good') : sun ? 'bg-transparent' : 'bg-surface-2')} />; })}
                    <td className="num pl-2 text-right">{days.filter((d) => byKey.has(key(e.id, d))).length}</td>
                  </tr>
                )),
              ])}
            </tbody>
          </table>
        </div>
        <div className="mt-3 flex gap-4 text-[12px] text-ink-2"><span className="inline-flex items-center gap-1.5"><i className="size-2.5 rounded-sm bg-good" />Present at site</span><span className="inline-flex items-center gap-1.5"><i className="size-2.5 rounded-sm bg-bad" />Checked in outside the site</span><span className="inline-flex items-center gap-1.5"><i className="size-2.5 rounded-sm bg-surface-2" />Absent</span></div>
      </Section>

      <div className="grid gap-6 lg:grid-cols-2">
        <Section title="Add employee" action={<UserPlus className="size-4 text-ink-3" />}>
          <ActionForm action={createEmployee} className="grid grid-cols-2 gap-3">
            <div><label className="label" htmlFor="ec">Employee code</label><input id="ec" name="employee_code" className="input num" placeholder="EMP-1050" required /></div>
            <div><label className="label" htmlFor="en">Full name</label><input id="en" name="full_name" className="input" required /></div>
            <div><label className="label" htmlFor="er">Role</label><input id="er" name="role_title" className="input" placeholder="Mason" /></div>
            <div><label className="label" htmlFor="ep">Phone</label><input id="ep" name="phone" className="input num" /></div>
            <div><label className="label" htmlFor="ek">Works for</label><select id="ek" name="contractor_id" className="input"><option value="">Developer (own staff)</option>{(cs || []).map((c) => <option key={c.id} value={c.id}>{c.company_name}</option>)}</select></div>
            <div><label className="label" htmlFor="ew">Daily wage (₹)</label><input id="ew" name="daily_wage" className="input num" /></div>
            <SubmitButton className="btn btn-primary col-span-2">Add employee</SubmitButton>
          </ActionForm>
        </Section>
        <Section title="Give an employee a check-in login">
          <ActionForm action={linkLogin} className="grid gap-3">
            <input type="hidden" name="kind" value="employee" />
            <div><label className="label" htmlFor="le">Employee</label><select id="le" name="id" className="input">{(emps || []).map((e) => <option key={e.id} value={e.id}>{e.employee_code} · {e.full_name}{e.user_id ? ' (linked)' : ''}</option>)}</select></div>
            <div><label className="label" htmlFor="lm">Their login email</label><input id="lm" name="email" type="email" className="input" placeholder="They sign up first, then you link it" /></div>
            <SubmitButton className="btn btn-outline">Link login</SubmitButton>
          </ActionForm>
        </Section>
      </div>
    </>
  );
}
