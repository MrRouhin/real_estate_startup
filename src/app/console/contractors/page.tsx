import Link from 'next/link';
import { AlertTriangle, Hammer, HardHat, Leaf, Route, Star, Users, Zap } from 'lucide-react';
import { requireStaff } from '@/lib/auth';
import { lakh, todayIST } from '@/lib/format';
import { contractorSummary, WASTE_LIMIT } from '@/lib/contractor-stats';
import { Empty, PageHeader, Pill } from '@/components/ui/bits';
import { Item, ProgressRing, Stagger, TiltCard } from '@/components/ui/motion';
import { AddContractor } from './add-contractor';
import type { ContractorUsage } from '@/lib/types';

export const metadata = { title: 'Contractors' };
const TRADE_ICON = { civil: Hammer, roads: Route, electrical: Zap, plumbing: Hammer, landscaping: Leaf, other: HardHat };

export default async function Contractors() {
  const { supabase, orgId } = await requireStaff();
  const [{ data: cs }, { data: wps }, { data: usage }, { data: emps }, { data: att }, { data: reqs }] = await Promise.all([
    supabase.from('contractors').select('*').eq('org_id', orgId).order('company_name'),
    supabase.from('work_packages').select('contractor_id, contract_value, progress, status').eq('org_id', orgId),
    supabase.from('contractor_material_usage').select('*').eq('org_id', orgId),
    supabase.from('employees').select('id, contractor_id').eq('org_id', orgId).eq('active', true),
    supabase.from('attendance').select('employee_id').eq('org_id', orgId).eq('work_date', todayIST()),
    supabase.from('material_requests').select('contractor_id').eq('org_id', orgId).in('status', ['requested', 'approved']),
  ]);
  const present = new Set((att || []).map((a) => a.employee_id));
  const totalValue = (wps || []).reduce((a, w) => a + Number(w.contract_value), 0);
  return (
    <>
      <PageHeader eyebrow="Site" title="Contractors" sub={<>{(cs || []).length} contractors · <b className="num text-ink">{lakh(totalValue)}</b> of work contracted</>}>
        <AddContractor />
      </PageHeader>
      {(cs || []).length === 0 ? <Empty title="No contractors yet">Add the companies doing civil, road, electrical and landscaping work.</Empty> : (
        <Stagger className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {cs!.map((c) => {
            const mine = (wps || []).filter((w) => w.contractor_id === c.id);
            const u = (usage || []).filter((x) => x.contractor_id === c.id) as ContractorUsage[];
            const s = contractorSummary(mine, u);
            const crew = (emps || []).filter((e) => e.contractor_id === c.id);
            const here = crew.filter((e) => present.has(e.id)).length;
            const open = (reqs || []).filter((r) => r.contractor_id === c.id).length;
            const I = TRADE_ICON[c.trade] || HardHat;
            const flagged = u.filter((x) => Number(x.consumed) + Number(x.wastage) > 0 && (Number(x.wastage) / (Number(x.consumed) + Number(x.wastage))) * 100 > WASTE_LIMIT);
            return (
              <Item key={c.id}>
                <TiltCard className="h-full rounded-[18px]">
                  <Link href={`/console/contractors/${c.id}`} className="card card-lift grid h-full gap-4 p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <span className="grid size-11 place-items-center rounded-2xl bg-accent-soft text-accent"><I className="size-5" /></span>
                        <div><div className="font-semibold leading-tight">{c.company_name}</div><div className="text-[12.5px] capitalize text-ink-3">{c.trade} · {c.contract_type.replace('_', ' ')}</div></div>
                      </div>
                      <Pill status={c.status} />
                    </div>
                    <div className="flex items-center gap-4">
                      <ProgressRing value={s.progress} size={64} />
                      <dl className="grid flex-1 grid-cols-2 gap-x-3 gap-y-1 text-[12.5px]">
                        <dt className="text-ink-3">Contract</dt><dd className="num text-right font-medium">{lakh(s.value)}</dd>
                        <dt className="text-ink-3">Material issued</dt><dd className="num text-right font-medium">{lakh(s.issuedValue)}</dd>
                        <dt className="text-ink-3">Wastage</dt><dd className={'num text-right font-semibold ' + (s.wastePct > WASTE_LIMIT ? 'text-bad' : 'text-good')}>{s.wastePct.toFixed(1)}%</dd>
                      </dl>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 border-t border-line pt-3 text-[12px] text-ink-2">
                      {c.rating && <span className="inline-flex items-center gap-1"><Star className="size-3.5 fill-held text-held" />{Number(c.rating).toFixed(1)}</span>}
                      <span className="inline-flex items-center gap-1"><Users className="size-3.5" />{here}/{crew.length} on site</span>
                      <span>{s.active} active package{s.active === 1 ? '' : 's'}</span>
                      {open > 0 && <span className="tag">{open} material request{open > 1 ? 's' : ''}</span>}
                      {s.delayed > 0 && <span className="inline-flex items-center gap-1 font-semibold text-bad"><AlertTriangle className="size-3.5" />{s.delayed} delayed</span>}
                      {flagged.length > 0 && <span className="inline-flex items-center gap-1 font-semibold text-bad"><AlertTriangle className="size-3.5" />High {flagged.map((x) => x.name!.split(' ')[0]!.toLowerCase()).join(', ')} wastage</span>}
                    </div>
                  </Link>
                </TiltCard>
              </Item>
            );
          })}
        </Stagger>
      )}
    </>
  );
}
