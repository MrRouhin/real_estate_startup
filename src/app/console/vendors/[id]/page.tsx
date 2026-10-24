import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, Phone, Star } from 'lucide-react';
import { requireStaff } from '@/lib/auth';
import { dateTime, inr, lakh, qty } from '@/lib/format';
import { Pill, Section } from '@/components/ui/bits';
import { Bars } from '@/components/charts/bars';
import { ActionForm, SubmitButton } from '@/components/ui/action-form';
import { linkLogin } from '../../actions';
import { deliveryChecks } from '@/lib/ai/invoice';

export default async function VendorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase } = await requireStaff();
  const { data: v } = await supabase.from('vendors').select('*').eq('id', id).maybeSingle();
  if (!v) notFound();
  const [{ data: dels }, { data: mats }] = await Promise.all([
    supabase.from('deliveries').select('*, materials(name, unit)').eq('vendor_id', id).order('delivered_at', { ascending: false }),
    supabase.from('materials').select('id, name, unit, unit_cost').eq('org_id', v.org_id),
  ]);
  const months: { key: string; label: string; value: number }[] = [];
  for (let i = 5; i >= 0; i--) { const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - i); months.push({ key: `${d.getFullYear()}-${d.getMonth()}`, label: d.toLocaleDateString('en-IN', { month: 'short' }), value: 0 }); }
  (dels || []).forEach((d) => { const t = new Date(d.delivered_at); const m = months.find((x) => x.key === `${t.getFullYear()}-${t.getMonth()}`); if (m) m.value += Number(d.accepted_qty ?? 0) * Number(d.unit_cost || 0); });
  const total = months.reduce((a, m) => a + m.value, 0);
  return (
    <>
      <Link href="/console/vendors" className="inline-flex w-fit items-center gap-1 text-[13px] text-ink-2 hover:text-ink"><ArrowLeft className="size-4" />Vendors</Link>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div><div className="eyebrow">{v.categories.join(' · ')}</div><h1 className="text-[28px] font-bold">{v.company_name}</h1>
          <div className="mt-1 flex flex-wrap items-center gap-3 text-[13px] text-ink-2">{v.contact_person}{v.phone && <span className="inline-flex items-center gap-1"><Phone className="size-3.5" />{v.phone}</span>}
            {v.rating && <span className="inline-flex items-center gap-1"><Star className="size-3.5 fill-held text-held" />{Number(v.rating).toFixed(1)}</span>}{v.gst_number && <span className="num text-[12px]">GST {v.gst_number}</span>}</div></div>
      </div>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
        <Section title={`Supplied in the last 6 months · ${lakh(total)}`}><Bars data={months} unit="lakh" color="var(--accent)" /></Section>
        <Section title="Deliveries">
          <div className="scroll-x -mx-4 sm:-mx-5">
            <table className="table min-w-[640px]">
              <thead><tr><th>When</th><th>Material</th><th className="r">Delivered</th><th className="r">Accepted</th><th className="r">Value</th><th>Status</th></tr></thead>
              <tbody>{(dels || []).map((d) => { const m = d.materials as unknown as { name: string; unit: string }; return (
                <tr key={d.id}><td className="text-ink-2">{dateTime(d.delivered_at)}<div className="num text-[11px] text-ink-3">{d.invoice_number} · {d.vehicle_number}</div>
                  {deliveryChecks(d, dels || [], (mats || []).find((x) => x.id === d.material_id) || null, v).flags.filter((f) => f.severity !== 'info').map((f) => <div key={f.id} className={'text-[11px] font-semibold ' + (f.severity === 'critical' ? 'text-bad' : 'text-warn')}>⚠ {f.label}</div>)}</td>
                  <td>{m.name}</td><td className="r num">{qty(d.quantity)} {m.unit}</td><td className="r num">{d.accepted_qty != null ? qty(d.accepted_qty) : '—'}</td>
                  <td className="r num">{d.accepted_qty != null ? inr(Number(d.accepted_qty) * Number(d.unit_cost || 0)) : '—'}</td><td><Pill status={d.status} /></td></tr>
              ); })}</tbody>
            </table>
          </div>
        </Section>
      </div>
      <details className="card p-5">
        <summary className="cursor-pointer text-[14px] font-semibold">Portal login {v.user_id ? '· linked' : '· not linked'}</summary>
        <ActionForm action={linkLogin} className="mt-3 flex flex-wrap items-end gap-2">
          <input type="hidden" name="kind" value="vendor" /><input type="hidden" name="id" value={v.id} />
          <div><label className="label" htmlFor="le">Login email</label><input id="le" name="email" type="email" className="input" placeholder={v.email || ''} /></div>
          <SubmitButton className="btn btn-outline">Link login</SubmitButton>
        </ActionForm>
      </details>
    </>
  );
}
