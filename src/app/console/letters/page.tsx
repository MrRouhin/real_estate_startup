import Link from 'next/link';
import { CheckCircle2, Clock, FileText } from 'lucide-react';
import { requireStaff } from '@/lib/auth';
import { date } from '@/lib/format';
import { letterNo } from '@/lib/numbering';
import { PageHeader, Pill, Section } from '@/components/ui/bits';
import { LiveRefresh } from '@/components/live-refresh';
import { LETTER_KIND } from '@/components/portal/letters';
import { Composer } from './composer';
import { IssueButton } from './issue-button';

export const metadata = { title: 'Letters' };

export default async function Letters() {
  const { supabase, orgId } = await requireStaff();
  const [{ data: letters }, { data: cs }, { data: vs }, { data: es }, { data: wps }, { data: pos }] = await Promise.all([
    supabase.from('letters').select('*').eq('org_id', orgId).order('created_at', { ascending: false }).limit(60),
    supabase.from('contractors').select('id, company_name').eq('org_id', orgId).order('company_name'),
    supabase.from('vendors').select('id, company_name').eq('org_id', orgId).order('company_name'),
    supabase.from('employees').select('id, full_name, employee_code').eq('org_id', orgId).eq('active', true).order('full_name'),
    supabase.from('work_packages').select('id, title, contractor_id').eq('org_id', orgId),
    supabase.from('purchase_orders').select('id, seq, created_at, vendor_id').eq('org_id', orgId).order('created_at', { ascending: false }),
  ]);
  const name = (t: string, id: string) => t === 'contractor' ? cs?.find((c) => c.id === id)?.company_name : t === 'vendor' ? vs?.find((v) => v.id === id)?.company_name : es?.find((e) => e.id === id)?.full_name;
  const counts = { draft: 0, issued: 0, acknowledged: 0 } as Record<string, number>;
  (letters || []).forEach((l) => { counts[l.status] = (counts[l.status] ?? 0) + 1; });
  return (
    <>
      <LiveRefresh tables={['letters']} every={30000} />
      <PageHeader emoji="✉️" title="Letters" sub={`${counts.issued ?? 0} waiting for acknowledgement, ${counts.acknowledged ?? 0} acknowledged, ${counts.draft ?? 0} drafts. Letters are drafted from your site records; you review and issue them.`} />
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
        <Composer contractors={(cs || []).map((c) => ({ id: c.id, label: c.company_name }))} vendors={(vs || []).map((v) => ({ id: v.id, label: v.company_name }))}
          employees={(es || []).map((e) => ({ id: e.id, label: `${e.full_name} (${e.employee_code})` }))}
          workPackages={(wps || []).map((w) => ({ id: w.id, label: w.title, owner: w.contractor_id }))}
          orders={(pos || []).map((p) => ({ id: p.id, label: `PO-${new Date(p.created_at).getFullYear()}-${String(p.seq).padStart(4, '0')}`, owner: p.vendor_id }))} />
        <Section title="Sent and drafts">
          <ul className="divide-y divide-[var(--glass-line)]">
            {(letters || []).map((l) => (
              <li key={l.id} className="flex flex-wrap items-start justify-between gap-2 py-3 text-[13.5px]">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2 text-[12px] text-ink-3"><span className="num">{letterNo(l.seq, l.created_at)}</span><span className="tag">{LETTER_KIND[l.kind] ?? l.kind}</span>{l.source === 'ai' && <span className="tag tag-accent">AI wording</span>}</div>
                  <Link href={`/letters/${l.id}`} className="font-semibold hover:text-accent">{l.subject}</Link>
                  <div className="text-[12px] text-ink-2">To {name(l.recipient_type, l.recipient_id) ?? l.recipient_type} · {date(l.issued_at ?? l.created_at)}{l.ack_note ? ` · reply: “${l.ack_note}”` : ''}</div>
                </div>
                <div className="flex items-center gap-2">
                  {l.status === 'acknowledged' ? <span className="flex items-center gap-1 text-[12.5px] text-good"><CheckCircle2 className="size-4" />Acknowledged</span>
                    : l.status === 'issued' ? <span className="flex items-center gap-1 text-[12.5px] text-warn"><Clock className="size-4" />Awaiting reply</span>
                    : l.status === 'draft' ? <IssueButton id={l.id} /> : <Pill status={l.status} />}
                  <Link href={`/letters/${l.id}`} className="btn btn-ghost btn-sm !px-2" aria-label="Open"><FileText className="size-4" /></Link>
                </div>
              </li>
            ))}
            {(letters || []).length === 0 && <li className="py-3 text-ink-2">No letters yet.</li>}
          </ul>
        </Section>
      </div>
    </>
  );
}
