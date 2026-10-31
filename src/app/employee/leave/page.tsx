import { Palmtree, X } from 'lucide-react';
import { requirePartner } from '@/lib/auth';
import { date, todayIST } from '@/lib/format';
import { Pill, Section, PageHeader } from '@/components/ui/bits';
import { ActionForm, SubmitButton } from '@/components/ui/action-form';
import { LiveRefresh } from '@/components/live-refresh';
import { askLeave, cancelLeave } from '../actions';

export const metadata = { title: 'Leave' };
const KIND = { casual: '🌤️ Casual', sick: '🤒 Sick', emergency: '🚨 Emergency', festival: '🪔 Festival' } as const;

export default async function EmployeeLeave() {
  const { supabase, user } = await requirePartner('employee');
  const { data: me } = await supabase.from('employees').select('id').eq('user_id', user.id).eq('active', true).single();
  const { data: leave } = await supabase.from('leave_requests').select('*').eq('employee_id', me!.id).order('from_date', { ascending: false });
  const year = todayIST().slice(0, 4);
  const taken = (leave || []).filter((l) => l.status === 'approved' && l.from_date.startsWith(year)).reduce((a, l) => a + (new Date(l.to_date).getTime() - new Date(l.from_date).getTime()) / 86400000 + 1, 0);
  return (
    <>
      <LiveRefresh tables={['leave_requests']} every={30000} />
      <PageHeader emoji="🌴" title="Leave" sub={<>Ask at least a few days ahead when you can. Your supervisor gets it right away and you are notified of the decision.</>} />
      <div className="grid gap-5 lg:grid-cols-[360px_minmax(0,1fr)]">
        <Section title="Ask for leave">
          <ActionForm action={askLeave} className="grid grid-cols-2 gap-3">
            <div><label className="label" htmlFor="lf">From</label><input id="lf" type="date" name="from_date" min={todayIST()} className="input" required /></div>
            <div><label className="label" htmlFor="lt">To</label><input id="lt" type="date" name="to_date" min={todayIST()} className="input" /></div>
            <div className="col-span-2"><label className="label" htmlFor="lk">Type</label><select id="lk" name="kind" className="input">{Object.entries(KIND).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></div>
            <div className="col-span-2"><label className="label" htmlFor="lr">Reason</label><input id="lr" name="reason" className="input" placeholder="Going home for a wedding" /></div>
            <SubmitButton className="btn btn-primary col-span-2"><Palmtree className="size-4" />Send request</SubmitButton>
          </ActionForm>
          <p className="mt-3 text-[12.5px] text-ink-3">{taken} day{taken === 1 ? '' : 's'} of approved leave in {year}.</p>
        </Section>
        <Section title="My requests">
          <ul className="divide-y divide-line">
            {(leave || []).map((l) => (
              <li key={l.id} className="flex flex-wrap items-center justify-between gap-2 py-3 text-[13.5px]">
                <div><div className="font-medium">{KIND[l.kind as keyof typeof KIND] ?? l.kind} · {date(l.from_date)}{l.to_date !== l.from_date ? ` → ${date(l.to_date)}` : ''}</div>
                  <div className="text-[12px] text-ink-3">{l.reason}{l.decision_note ? ` · “${l.decision_note}”` : ''}</div></div>
                <div className="flex items-center gap-2">
                  <Pill status={l.status} tone={l.status === 'approved' ? 'good' : l.status === 'rejected' ? 'bad' : l.status === 'pending' ? 'warn' : 'muted'} label={l.status === 'rejected' ? 'Declined' : undefined} />
                  {l.status === 'pending' && <ActionForm action={cancelLeave}><input type="hidden" name="id" value={l.id} /><SubmitButton className="btn btn-ghost btn-sm"><X className="size-4" />Withdraw</SubmitButton></ActionForm>}
                </div>
              </li>
            ))}
            {(leave || []).length === 0 && <li className="py-3 text-ink-2">No leave requests yet.</li>}
          </ul>
        </Section>
      </div>
    </>
  );
}
