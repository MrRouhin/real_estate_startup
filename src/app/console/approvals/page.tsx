import Link from 'next/link';
import { BadgeCheck, Check, X } from 'lucide-react';
import { requireStaff } from '@/lib/auth';
import { date, inr } from '@/lib/format';
import { billNo } from '@/lib/numbering';
import { Avatar, Empty, PageHeader, Section } from '@/components/ui/bits';
import { ActionForm, SubmitButton } from '@/components/ui/action-form';
import { LiveRefresh } from '@/components/live-refresh';
import { decideAccess, decideBill, reviewCompany, reviewEmployee, reviewKyc } from '../ops-actions';

export const metadata = { title: 'Approvals' };
const NEXT: Record<string, { status: string; label: string }> = {
  submitted: { status: 'verified', label: 'Verify measurement' }, verified: { status: 'approved', label: 'Approve for payment' }, approved: { status: 'paid', label: 'Mark paid' },
};

export default async function Approvals() {
  const { supabase, orgId } = await requireStaff();
  const [{ data: bills }, { data: access }, { data: kyc }, { data: emps }, { data: cos }, { data: vens }, { data: contractors }] = await Promise.all([
    supabase.from('contractor_bills').select('*, contractors(company_name), work_packages(title, contract_value, progress)').eq('org_id', orgId).in('status', ['submitted', 'verified', 'approved']).order('created_at'),
    supabase.from('access_requests').select('*').eq('org_id', orgId).eq('status', 'pending').order('created_at'),
    supabase.from('profiles').select('id, full_name, email, phone, id_type, id_last4, kyc_doc_path, kyc_submitted_at').eq('kyc_status', 'submitted').order('kyc_submitted_at'),
    supabase.from('employee_profiles').select('*, employees(full_name, employee_code, role_title, contractor_id)').eq('org_id', orgId).eq('status', 'submitted'),
    supabase.from('contractors').select('id, company_name, gst_number, pan, license_number, insurance_policy, insurance_valid_till, bank_ifsc, bank_last4, upi_id, profile_updated_at').eq('org_id', orgId).eq('profile_status', 'submitted'),
    supabase.from('vendors').select('id, company_name, gst_number, pan, categories, delivery_regions, bank_ifsc, bank_last4, upi_id, profile_updated_at').eq('org_id', orgId).eq('profile_status', 'submitted'),
    supabase.from('contractors').select('id, company_name').eq('org_id', orgId).order('company_name'),
  ]);
  const kycDocs = await Promise.all((kyc || []).map(async (k) => (k.kyc_doc_path ? (await supabase.storage.from('kyc').createSignedUrl(k.kyc_doc_path, 900)).data?.signedUrl ?? null : null)));
  const total = (bills || []).length + (access || []).length + (kyc || []).length + (emps || []).length + (cos || []).length + (vens || []).length;
  return (
    <>
      <LiveRefresh tables={['contractor_bills', 'access_requests', 'profiles', 'employee_profiles', 'contractors', 'vendors']} every={30000} />
      <PageHeader emoji="📥" title="Approvals" sub={total ? `${total} things waiting for you. Each decision notifies the person straight away.` : 'Nothing waiting. New bills, sign-ups and profiles land here the moment they are sent.'} />
      {total === 0 && <Empty emoji="✅" title="All clear">Bills, KYC, join requests and partner profiles show up here when they need you.</Empty>}

      {(bills || []).length > 0 && (
        <Section title={`Contractor bills (${bills!.length})`}>
          <ul className="grid gap-3">
            {bills!.map((b) => { const wp = b.work_packages as unknown as { title: string; contract_value: number; progress: number } | null; const n = NEXT[b.status]!; return (
              <li key={b.id} className="rounded-2xl border border-[var(--glass-line)] p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div><div className="flex items-center gap-2"><b className="num">{billNo(b.seq, b.created_at)}</b><span className="tag capitalize">{b.status}</span></div>
                    <div className="text-[13px] text-ink-2">{(b.contractors as unknown as { company_name: string }).company_name} · {wp?.title}{b.invoice_number ? ` · their ref ${b.invoice_number}` : ''}</div>
                    {b.note && <div className="text-[12.5px] text-ink-3">{b.note}</div>}</div>
                  <div className="text-right"><div className="num text-[18px] font-semibold">{inr(b.net_payable)}</div><div className="num text-[11.5px] text-ink-3">gross {inr(b.gross_amount)} · work {Math.round(Number(wp?.progress ?? 0))}% done</div></div>
                </div>
                <ActionForm action={decideBill} className="mt-3 flex flex-wrap items-end gap-2">
                  <input type="hidden" name="id" value={b.id} />
                  {n.status === 'paid' && <div><label className="label" htmlFor={`ref-${b.id}`}>UTR / cheque no.</label><input id={`ref-${b.id}`} name="ref" className="input num !w-44" required /></div>}
                  <div className="min-w-[160px] flex-1"><label className="label" htmlFor={`bn-${b.id}`}>Note to the contractor</label><input id={`bn-${b.id}`} name="note" className="input" placeholder={n.status === 'verified' ? 'Measured with the site engineer' : ''} /></div>
                  <SubmitButton className="btn btn-primary" name="status" value={n.status}><Check className="size-4" />{n.label}</SubmitButton>
                  {b.status !== 'approved' && <SubmitButton className="btn btn-outline" name="status" value="rejected"><X className="size-4" />Return</SubmitButton>}
                </ActionForm>
              </li>
            ); })}
          </ul>
        </Section>
      )}

      <div className="grid gap-5 lg:grid-cols-2">
        {(access || []).length > 0 && (
          <Section title={`Asking to join (${access!.length})`}>
            <ul className="grid gap-3">
              {access!.map((a) => (
                <li key={a.id} className="rounded-2xl border border-[var(--glass-line)] p-4 text-[13.5px]">
                  <div className="flex items-center gap-2"><Avatar name={a.full_name} size={30} /><div><b>{a.full_name}</b> <span className="tag capitalize">{a.role === 'vendor' ? 'supplier' : a.role}</span><div className="text-[12px] text-ink-3">{[a.company_name, a.trade, a.phone, a.email].filter(Boolean).join(' · ')}</div></div></div>
                  {a.message && <p className="mt-1 text-ink-2">“{a.message}”</p>}
                  <ActionForm action={decideAccess} className="mt-2 flex flex-wrap items-end gap-2">
                    <input type="hidden" name="id" value={a.id} />
                    {a.role === 'employee' && <div><label className="label" htmlFor={`c-${a.id}`}>Works for</label><select id={`c-${a.id}`} name="contractor_id" className="input"><option value="">Our own staff</option>{(contractors || []).map((c) => <option key={c.id} value={c.id}>{c.company_name}</option>)}</select></div>}
                    <input name="note" className="input min-w-[120px] flex-1" placeholder="Note (optional)" aria-label="Note" />
                    <SubmitButton className="btn btn-primary btn-sm" name="approve" value="true"><Check className="size-4" />Approve</SubmitButton>
                    <SubmitButton className="btn btn-outline btn-sm" name="approve" value="false">Decline</SubmitButton>
                  </ActionForm>
                </li>
              ))}
            </ul>
          </Section>
        )}
        {(kyc || []).length > 0 && (
          <Section title={`Buyer KYC (${kyc!.length})`}>
            <ul className="grid gap-3">
              {kyc!.map((k, i) => (
                <li key={k.id} className="rounded-2xl border border-[var(--glass-line)] p-4 text-[13.5px]">
                  <div className="flex flex-wrap items-center justify-between gap-2"><div><b>{k.full_name || k.email || k.phone}</b><div className="text-[12px] text-ink-3">{k.id_type ? `${k.id_type} ending ${k.id_last4}` : 'ID uploaded at booking'} · sent {date(k.kyc_submitted_at)}</div></div>
                    {kycDocs[i] && <a href={kycDocs[i]!} target="_blank" rel="noreferrer" className="btn btn-outline btn-sm">Open document</a>}</div>
                  <ActionForm action={reviewKyc} className="mt-2 flex flex-wrap gap-2">
                    <input type="hidden" name="user_id" value={k.id} />
                    <input name="note" className="input min-w-[140px] flex-1" placeholder="Reason if sending back" aria-label="Note" />
                    <SubmitButton className="btn btn-primary btn-sm" name="approve" value="true"><BadgeCheck className="size-4" />Verify</SubmitButton>
                    <SubmitButton className="btn btn-outline btn-sm" name="approve" value="false">Send back</SubmitButton>
                  </ActionForm>
                </li>
              ))}
            </ul>
          </Section>
        )}
        {[...(cos || []).map((c) => ({ ...c, kind: 'contractor' as const })), ...(vens || []).map((v) => ({ ...v, kind: 'vendor' as const }))].length > 0 && (
          <Section title="Company profiles to verify">
            <ul className="grid gap-3">
              {[...(cos || []).map((c) => ({ ...c, kind: 'contractor' as const })), ...(vens || []).map((v) => ({ ...v, kind: 'vendor' as const }))].map((c) => (
                <li key={c.id} className="rounded-2xl border border-[var(--glass-line)] p-4 text-[13px]">
                  <div className="flex items-center justify-between gap-2"><b>{c.company_name}</b><span className="tag">{c.kind === 'vendor' ? 'Supplier' : 'Contractor'}</span></div>
                  <dl className="mt-1 grid grid-cols-2 gap-x-3 gap-y-0.5 text-[12.5px]">
                    <dt className="text-ink-3">GSTIN</dt><dd className="num">{c.gst_number || '—'}</dd><dt className="text-ink-3">PAN</dt><dd className="num">{c.pan || '—'}</dd>
                    {'license_number' in c && <><dt className="text-ink-3">Licence</dt><dd>{c.license_number || '—'}</dd><dt className="text-ink-3">Insurance till</dt><dd>{date(c.insurance_valid_till)}</dd></>}
                    {'categories' in c && <><dt className="text-ink-3">Supplies</dt><dd>{(c.categories || []).join(', ')}</dd></>}
                    <dt className="text-ink-3">Paid to</dt><dd className="num">{c.upi_id || (c.bank_ifsc ? `${c.bank_ifsc} ••${c.bank_last4}` : '—')}</dd>
                  </dl>
                  <ActionForm action={reviewCompany} className="mt-2 flex flex-wrap gap-2">
                    <input type="hidden" name="id" value={c.id} /><input type="hidden" name="kind" value={c.kind} />
                    <input name="note" className="input min-w-[120px] flex-1" placeholder="What to change (if any)" aria-label="Note" />
                    <SubmitButton className="btn btn-primary btn-sm" name="status" value="verified"><BadgeCheck className="size-4" />Verify</SubmitButton>
                    <SubmitButton className="btn btn-outline btn-sm" name="status" value="needs_changes">Ask for changes</SubmitButton>
                  </ActionForm>
                </li>
              ))}
            </ul>
          </Section>
        )}
        {(emps || []).length > 0 && (
          <Section title={`Worker profiles (${emps!.length})`} action={<Link href="/console/people" className="text-[13px] font-semibold text-accent">All people</Link>}>
            <ul className="grid gap-3">
              {emps!.map((p) => { const e = p.employees as unknown as { full_name: string; employee_code: string; role_title: string | null }; return (
                <li key={p.employee_id} className="rounded-2xl border border-[var(--glass-line)] p-4 text-[13px]">
                  <div className="flex items-center gap-2"><Avatar name={e.full_name} size={28} /><b>{e.full_name}</b><span className="num text-ink-3">{e.employee_code}</span></div>
                  <div className="mt-1 text-[12.5px] text-ink-2">{p.trade || e.role_title} · born {date(p.date_of_birth)} · {p.id_type ? `${p.id_type} ••${p.id_last4}` : 'no ID'} · {p.safety_trained ? 'safety trained' : 'no safety training'}</div>
                  <ActionForm action={reviewEmployee} className="mt-2 flex flex-wrap gap-2">
                    <input type="hidden" name="employee_id" value={p.employee_id} />
                    <input name="note" className="input min-w-[120px] flex-1" placeholder="Note" aria-label="Note" />
                    <SubmitButton className="btn btn-primary btn-sm" name="status" value="verified"><BadgeCheck className="size-4" />Verify</SubmitButton>
                    <SubmitButton className="btn btn-outline btn-sm" name="status" value="needs_changes">Ask for changes</SubmitButton>
                  </ActionForm>
                </li>
              ); })}
            </ul>
          </Section>
        )}
      </div>
    </>
  );
}
