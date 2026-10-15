import Link from 'next/link';
import { AlertTriangle } from 'lucide-react';
import { requireStaff } from '@/lib/auth';
import { date, inr, lakh, qty } from '@/lib/format';
import { PageHeader, Pill, Section } from '@/components/ui/bits';
import { AnimatedNumber, Item, Stagger } from '@/components/ui/motion';
import { YardView } from '@/components/three/yard-view';
import { ActionForm, SubmitButton } from '@/components/ui/action-form';
import { LiveRefresh } from '@/components/live-refresh';
import { createMaterial, recordOpening } from '../actions';
import { RequestActions } from './request-actions';

export const metadata = { title: 'Materials' };

const MOVE_TONE = { opening: 'muted', received: 'good', rejected: 'bad', issued: 'info', consumed: 'accent', wastage: 'bad', returned: 'info' } as const;

export default async function Materials() {
  const { supabase, orgId, project } = await requireStaff();
  const monthStart = new Date(); monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0);
  const [{ data: stock }, { data: reqs }, { data: moves }, { data: monthWaste }] = await Promise.all([
    supabase.from('material_stock').select('*').eq('project_id', project!.id).order('name'),
    supabase.from('material_requests').select('*, materials(name, unit), contractors(company_name)').eq('org_id', orgId).in('status', ['requested', 'approved']).order('created_at'),
    supabase.from('stock_movements').select('*, materials(name, unit), contractors(company_name), vendors(company_name)').eq('project_id', project!.id).order('created_at', { ascending: false }).limit(40),
    supabase.from('stock_movements').select('quantity, materials(unit_cost)').eq('project_id', project!.id).eq('type', 'wastage').gte('created_at', monthStart.toISOString()),
  ]);
  const items = (stock || []).map((m) => ({ id: m.material_id!, name: m.name!, unit: m.unit!, category: m.category!, in_store: Number(m.in_store), reorder_level: Number(m.reorder_level), at_site: Number(m.at_site), unit_cost: Number(m.unit_cost || 0), consumed: Number(m.consumed), wastage: Number(m.wastage), received: Number(m.received) }));
  const value = items.reduce((a, m) => a + m.in_store * m.unit_cost, 0);
  const low = items.filter((m) => m.in_store < m.reorder_level);
  const wasteVal = (monthWaste || []).reduce((a, w) => a + Number(w.quantity) * Number((w.materials as unknown as { unit_cost: number }).unit_cost || 0), 0);
  const inStore = Object.fromEntries(items.map((m) => [m.id, m.in_store]));

  return (
    <>
      <LiveRefresh tables={['material_requests', 'deliveries']} filter={`org_id=eq.${orgId}`} />
      <PageHeader eyebrow="Site" title="Materials and stores" sub="Stock is never typed in: it is worked out from every delivery, issue, use and wastage entry." />
      <Stagger className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Item className="card p-4"><div className="eyebrow">Stock value in store</div><div className="num mt-1 text-[24px] font-medium">{lakh(value)}</div></Item>
        <Item className="card p-4"><div className="eyebrow">Below reorder level</div><div className={'num mt-1 text-[24px] font-medium ' + (low.length ? 'text-bad' : '')}><AnimatedNumber value={low.length} /></div><div className="truncate text-[12px] text-ink-3">{low.map((m) => m.name).join(', ') || 'All healthy'}</div></Item>
        <Item className="card p-4"><div className="eyebrow">Open requests</div><div className="num mt-1 text-[24px] font-medium"><AnimatedNumber value={(reqs || []).length} /></div></Item>
        <Item className="card p-4"><div className="eyebrow">Wasted this month</div><div className="num mt-1 text-[24px] font-medium">{inr(wasteVal)}</div></Item>
      </Stagger>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
        <YardView items={items} height={380} />
        <Section title="Requests waiting for the store" action={<span className="text-[12px] text-ink-3">Issue is blocked when the store is short</span>}>
          {(reqs || []).length === 0 ? <p className="text-[13.5px] text-ink-2">No open requests.</p> : (
            <ul className="grid gap-3">
              {reqs!.map((r) => { const mat = r.materials as unknown as { name: string; unit: string }; const short = (inStore[r.material_id] ?? 0) < Number(r.quantity); return (
                <li key={r.id} className="rounded-2xl border border-line p-3">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div><div className="text-[14px] font-semibold">{qty(r.quantity)} {mat.unit} {mat.name}</div>
                      <div className="text-[12.5px] text-ink-2">{(r.contractors as unknown as { company_name: string }).company_name} · {r.purpose}{r.location ? ` · ${r.location}` : ''}{r.needed_by ? ` · by ${date(r.needed_by)}` : ''}</div></div>
                    <Pill status={r.status} />
                  </div>
                  {short && <div className="mt-2 flex items-center gap-1.5 text-[12.5px] font-medium text-bad"><AlertTriangle className="size-3.5" />Store has only {qty(inStore[r.material_id] ?? 0)} {mat.unit}. Accept a delivery first.</div>}
                  <div className="mt-2"><RequestActions id={r.id} status={r.status} short={short} /></div>
                </li>
              ); })}
            </ul>
          )}
        </Section>
      </div>

      <Section title="Stock by material">
        <div className="scroll-x -mx-4 sm:-mx-5">
          <table className="table min-w-[860px]">
            <thead><tr><th>Material</th><th className="r">In store</th><th className="r">Reorder at</th><th className="r">At site</th><th className="r">Received</th><th className="r">Used</th><th className="r">Wasted</th><th className="r">Value in store</th></tr></thead>
            <tbody>{items.map((m) => (
              <tr key={m.id}>
                <td><div className="font-medium">{m.name}</div><div className="text-[11.5px] capitalize text-ink-3">{m.category}</div></td>
                <td className={'r num font-semibold ' + (m.in_store < m.reorder_level ? 'text-bad' : '')}>{qty(m.in_store)} <span className="font-normal text-ink-3">{m.unit}</span></td>
                <td className="r num text-ink-3">{qty(m.reorder_level)}</td>
                <td className="r num">{qty(m.at_site)}</td>
                <td className="r num text-ink-2">{qty(m.received)}</td>
                <td className="r num text-ink-2">{qty(m.consumed)}</td>
                <td className={'r num ' + (m.consumed + m.wastage > 0 && m.wastage / (m.consumed + m.wastage) > 0.05 ? 'font-semibold text-bad' : 'text-ink-2')}>{qty(m.wastage)}</td>
                <td className="r num">{inr(m.in_store * m.unit_cost)}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      </Section>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <Section title="Ledger" action={<Link href="/console/vendors" className="btn btn-ghost btn-sm">Deliveries</Link>}>
          <ul className="max-h-[460px] divide-y divide-line overflow-y-auto">
            {(moves || []).map((m) => { const mat = m.materials as unknown as { name: string; unit: string }; const who = (m.contractors as unknown as { company_name: string } | null)?.company_name || (m.vendors as unknown as { company_name: string } | null)?.company_name; return (
              <li key={m.id} className="grid grid-cols-[96px_1fr_auto] items-center gap-3 py-2 text-[13px]">
                <Pill status={m.type} tone={MOVE_TONE[m.type]} />
                <span className="min-w-0 truncate"><b className="font-medium">{mat.name}</b>{who ? <span className="text-ink-2"> · {who}</span> : ''}{m.note ? <span className="text-ink-3"> · {m.note}</span> : ''}</span>
                <span className="num whitespace-nowrap text-right text-ink-2">{m.type === 'issued' || m.type === 'consumed' || m.type === 'wastage' ? '−' : '+'}{qty(m.quantity)} {mat.unit}<div className="text-[11px] text-ink-3">{date(m.created_at)}</div></span>
              </li>
            ); })}
          </ul>
        </Section>
        <div className="grid content-start gap-6">
          <Section title="Record opening stock">
            <ActionForm action={recordOpening} className="grid gap-3">
              <div><label className="label" htmlFor="om">Material</label><select id="om" name="material_id" className="input">{items.map((m) => <option key={m.id} value={m.id}>{m.name} ({m.unit})</option>)}</select></div>
              <div className="grid grid-cols-2 gap-3"><div><label className="label" htmlFor="oq">Quantity</label><input id="oq" name="qty" className="input num" required /></div>
                <div><label className="label" htmlFor="on">Note</label><input id="on" name="note" className="input" placeholder="Physical count" /></div></div>
              <SubmitButton className="btn btn-outline">Add to store</SubmitButton>
            </ActionForm>
          </Section>
          <Section title="New material">
            <ActionForm action={createMaterial} className="grid grid-cols-2 gap-3">
              <div className="col-span-2"><label className="label" htmlFor="mn">Name</label><input id="mn" name="name" className="input" placeholder="Bitumen VG-30" required /></div>
              <div><label className="label" htmlFor="mc">Category</label><select id="mc" name="category" className="input">{['cement', 'steel', 'aggregate', 'masonry', 'pipes', 'electrical', 'finishing', 'other'].map((c) => <option key={c} value={c}>{c}</option>)}</select></div>
              <div><label className="label" htmlFor="mu">Unit</label><input id="mu" name="unit" className="input" placeholder="drums" required /></div>
              <div><label className="label" htmlFor="mr">Reorder at</label><input id="mr" name="reorder_level" className="input num" /></div>
              <div><label className="label" htmlFor="mcost">Unit cost (₹)</label><input id="mcost" name="unit_cost" className="input num" /></div>
              <SubmitButton className="btn btn-outline col-span-2">Add material</SubmitButton>
            </ActionForm>
          </Section>
        </div>
      </div>
    </>
  );
}
