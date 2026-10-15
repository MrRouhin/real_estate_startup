import { requireStaff } from '@/lib/auth';
import { date, inr } from '@/lib/format';
import { Empty, PageHeader, Pill } from '@/components/ui/bits';
import { ActionForm, SubmitButton } from '@/components/ui/action-form';
import { quoteModification } from '../actions';
import { ModStatus } from './mod-status';

export const metadata = { title: 'Modifications' };

export default async function Modifications() {
  const { supabase, orgId } = await requireStaff();
  const [{ data: mods }, { data: contractors }, { data: plots }, { data: people }] = await Promise.all([
    supabase.from('modification_requests').select('*, bookings(plot_id)').eq('org_id', orgId).order('created_at', { ascending: false }),
    supabase.from('contractors').select('id, company_name').eq('org_id', orgId).eq('status', 'active'),
    supabase.from('plots').select('id, plot_number').eq('org_id', orgId),
    supabase.from('profiles').select('id, full_name'),
  ]);
  const plotNo = Object.fromEntries((plots || []).map((p) => [p.id, p.plot_number]));
  const name = Object.fromEntries((people || []).map((p) => [p.id, p.full_name]));
  const cName = Object.fromEntries((contractors || []).map((c) => [c.id, c.company_name]));
  return (
    <>
      <PageHeader eyebrow="Sales" title="Buyer modification requests" sub="Buyer asks → you quote → buyer approves the cost → work is assigned. Nothing starts before the buyer approves." />
      {(mods || []).length === 0 ? <Empty title="No requests yet" /> : (
        <div className="grid gap-4 md:grid-cols-2">
          {mods!.map((m) => (
            <article key={m.id} className="card grid gap-3 p-5">
              <div className="flex items-center justify-between gap-2">
                <span className="num text-[12px] text-ink-3">MOD-{m.seq} · Plot {plotNo[(m.bookings as unknown as { plot_id: string }).plot_id]} · {name[m.buyer_id]}</span>
                <Pill status={m.status} />
              </div>
              <div className="text-[15px] font-medium">{m.requirement}</div>
              <div className="text-[12.5px] text-ink-3">Requested {date(m.created_at)}{m.buyer_approved_at ? ` · approved ${date(m.buyer_approved_at)}` : ''}</div>
              {m.quoted_cost != null && <div className="text-[13.5px]">Quote <b className="num">{inr(m.quoted_cost)}</b>{m.deadline ? ` · by ${date(m.deadline)}` : ''}{m.contractor_id ? ` · ${cName[m.contractor_id] || ''}` : ''}</div>}
              {['requested', 'quoted'].includes(m.status) && (
                <ActionForm action={quoteModification} reset={false} className="grid grid-cols-2 gap-2 rounded-xl bg-surface-2 p-3">
                  <input type="hidden" name="id" value={m.id} />
                  <div><label className="label" htmlFor={`c-${m.id}`}>Cost (₹)</label><input id={`c-${m.id}`} name="quoted_cost" className="input num" defaultValue={m.quoted_cost ?? ''} required /></div>
                  <div><label className="label" htmlFor={`d-${m.id}`}>Ready by</label><input id={`d-${m.id}`} name="deadline" type="date" className="input" defaultValue={m.deadline ?? ''} /></div>
                  <div className="col-span-2"><label className="label" htmlFor={`k-${m.id}`}>Contractor</label>
                    <select id={`k-${m.id}`} name="contractor_id" className="input" defaultValue={m.contractor_id ?? ''}><option value="">Assign later</option>{(contractors || []).map((c) => <option key={c.id} value={c.id}>{c.company_name}</option>)}</select></div>
                  <SubmitButton className="btn btn-primary col-span-2">{m.status === 'quoted' ? 'Update quote' : 'Send quote to buyer'}</SubmitButton>
                </ActionForm>
              )}
              {['approved', 'in_progress'].includes(m.status) && <ModStatus id={m.id} status={m.status} />}
            </article>
          ))}
        </div>
      )}
    </>
  );
}
