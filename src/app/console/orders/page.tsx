import { requireStaff } from '@/lib/auth';
import { date, inr, qty } from '@/lib/format';
import { poNo } from '@/lib/numbering';
import { PageHeader, Pill, Section } from '@/components/ui/bits';
import { ActionForm, SubmitButton } from '@/components/ui/action-form';
import { LiveRefresh } from '@/components/live-refresh';
import { markDeliveryPaid } from '../ops-actions';
import { PoForm } from './po-form';

export const metadata = { title: 'Purchase orders' };
type Item = { name: string; unit: string; qty: number; rate: number };

export default async function Orders() {
  const { supabase, orgId } = await requireStaff();
  const [{ data: pos }, { data: vendors }, { data: mats }, { data: catalog }, { data: dues }, { data: reqs }] = await Promise.all([
    supabase.from('purchase_orders').select('*, vendors(company_name)').eq('org_id', orgId).order('created_at', { ascending: false }).limit(50),
    supabase.from('vendors').select('id, company_name').eq('org_id', orgId).order('company_name'),
    supabase.from('materials').select('id, name, unit, unit_cost').eq('org_id', orgId).order('name'),
    supabase.from('vendor_catalog').select('vendor_id, material_id, name, unit, rate, in_stock, lead_days').eq('org_id', orgId),
    supabase.from('deliveries').select('id, quantity, accepted_qty, unit_cost, invoice_number, inspected_at, delivered_at, vendors(company_name), materials(name, unit)').eq('org_id', orgId).in('status', ['accepted', 'partially_accepted']).is('paid_at', null).order('inspected_at'),
    supabase.from('material_requests').select('id, seq, quantity, material_id, materials(name, unit)').eq('org_id', orgId).eq('status', 'approved'),
  ]);
  const openValue = (pos || []).filter((p) => ['issued', 'accepted', 'dispatched'].includes(p.status)).reduce((a, p) => a + Number(p.total), 0);
  const dueValue = (dues || []).reduce((a, d) => a + Number(d.accepted_qty ?? 0) * Number(d.unit_cost ?? 0), 0);
  return (
    <>
      <LiveRefresh tables={['purchase_orders', 'deliveries']} every={30000} />
      <PageHeader emoji="📦" title="Purchase orders" sub={`${inr(openValue)} on open orders · ${inr(dueValue)} owed to suppliers for accepted deliveries.`} />
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
        <PoForm vendors={(vendors || []).map((v) => ({ id: v.id, label: v.company_name }))} materials={(mats || []).map((m) => ({ id: m.id, name: m.name, unit: m.unit, rate: Number(m.unit_cost || 0) }))}
          catalog={(catalog || []).map((c) => ({ vendor: c.vendor_id, material: c.material_id, name: c.name, unit: c.unit, rate: Number(c.rate), inStock: c.in_stock, lead: c.lead_days }))}
          requests={(reqs || []).map((r) => { const m = r.materials as unknown as { name: string; unit: string }; return { id: r.id, label: `MR-${String(r.seq).padStart(4, '0')} · ${qty(r.quantity)} ${m.unit} ${m.name}`, material: r.material_id, qty: Number(r.quantity) }; })} />
        <div className="grid content-start gap-5">
          <Section title="Orders">
            <ul className="divide-y divide-[var(--glass-line)]">
              {(pos || []).map((p) => (
                <li key={p.id} className="py-3 text-[13.5px]">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div><b className="num">{poNo(p.seq, p.created_at)}</b> · {(p.vendors as unknown as { company_name: string }).company_name}
                      <div className="text-[12px] text-ink-3">{((p.items as unknown as Item[]) || []).map((i) => `${qty(i.qty)} ${i.unit} ${i.name}`).join(', ')}</div>
                      <div className="text-[12px] text-ink-3">issued {date(p.created_at)}{p.promised_date ? ` · promised ${date(p.promised_date)}` : p.required_by ? ` · needed ${date(p.required_by)}` : ''}{p.vehicle_number ? ` · ${p.vehicle_number}` : ''}{p.vendor_note ? ` · “${p.vendor_note}”` : ''}</div></div>
                    <div className="text-right"><div className="num font-semibold">{inr(p.total)}</div><Pill status={p.status} /></div>
                  </div>
                </li>
              ))}
              {(pos || []).length === 0 && <li className="py-3 text-ink-2">No orders yet.</li>}
            </ul>
          </Section>
          <Section title="Supplier payments due">
            <ul className="divide-y divide-[var(--glass-line)]">
              {(dues || []).map((d) => { const m = d.materials as unknown as { name: string; unit: string }; const v = d.vendors as unknown as { company_name: string }; const amt = Number(d.accepted_qty ?? 0) * Number(d.unit_cost ?? 0); const overdue = Date.now() - new Date(d.inspected_at ?? d.delivered_at).getTime() > 30 * 86400000; return (
                <li key={d.id} className="flex flex-wrap items-end justify-between gap-2 py-3 text-[13.5px]">
                  <div><b>{v.company_name}</b> · {qty(d.accepted_qty)} {m.unit} {m.name}<div className={'text-[12px] ' + (overdue ? 'text-bad' : 'text-ink-3')}>invoice {d.invoice_number || '—'} · accepted {date(d.inspected_at)}{overdue ? ' · over 30 days' : ''}</div></div>
                  <ActionForm action={markDeliveryPaid} className="flex items-center gap-2"><input type="hidden" name="id" value={d.id} /><span className="num font-semibold">{inr(amt)}</span>
                    <input name="ref" className="input num !w-36 !py-1.5 text-[13px]" placeholder="UTR" required aria-label="Payment reference" /><SubmitButton className="btn btn-primary btn-sm">Paid</SubmitButton></ActionForm>
                </li>
              ); })}
              {(dues || []).length === 0 && <li className="py-3 text-ink-2">Nothing owed right now.</li>}
            </ul>
          </Section>
        </div>
      </div>
    </>
  );
}
