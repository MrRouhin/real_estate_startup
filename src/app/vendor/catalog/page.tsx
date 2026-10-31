import { Store, Trash2 } from 'lucide-react';
import { requirePartner } from '@/lib/auth';
import { date, inr, qty } from '@/lib/format';
import { Section, PageHeader } from '@/components/ui/bits';
import { ActionForm, SubmitButton } from '@/components/ui/action-form';
import { deleteCatalogItem, saveCatalogItem } from '../actions';

export const metadata = { title: 'Price list' };

export default async function VendorCatalog() {
  const { supabase } = await requirePartner('vendor');
  const { data: vid } = await supabase.rpc('my_vendor_id');
  const [{ data: items }, { data: mats }] = await Promise.all([
    supabase.from('vendor_catalog').select('*').eq('vendor_id', vid!).order('name'),
    supabase.from('materials').select('id, name, unit').order('name'),
  ]);
  return (
    <>
      <PageHeader emoji="🏷️" title="What you supply, at what price" sub={<>The developer’s store compares your rates when it raises purchase orders. Keep prices and stock current to win more orders.</>} />
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
        <Section title={`${(items || []).length} items`}>
          <ul className="divide-y divide-line">
            {(items || []).map((i) => (
              <li key={i.id} className="py-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div><div className="font-semibold">{i.name}{i.brand && <span className="font-normal text-ink-2"> · {i.brand}</span>}</div>
                    <div className="text-[12px] text-ink-3">{i.min_order ? `min ${qty(i.min_order)} ${i.unit} · ` : ''}{i.lead_days != null ? `${i.lead_days} day lead time · ` : ''}updated {date(i.updated_at)}</div></div>
                  <div className="flex items-center gap-2"><span className="num text-[16px] font-semibold">{inr(i.rate)}<span className="text-[12px] font-normal text-ink-3">/{i.unit}</span></span>
                    <span className={'tag ' + (i.in_stock ? 'tag-accent' : '')}>{i.in_stock ? 'In stock' : 'Out of stock'}</span></div>
                </div>
                <details className="mt-1"><summary className="cursor-pointer text-[12.5px] font-semibold text-accent">Edit</summary>
                  <div className="mt-2 flex flex-wrap items-end gap-2">
                    <ActionForm action={saveCatalogItem} reset={false} className="flex flex-wrap items-end gap-2">
                      <input type="hidden" name="id" value={i.id} /><input type="hidden" name="name" value={i.name} /><input type="hidden" name="unit" value={i.unit} /><input type="hidden" name="brand" value={i.brand ?? ''} /><input type="hidden" name="material_id" value={i.material_id ?? ''} />
                      <div><label className="label" htmlFor={`r-${i.id}`}>Rate</label><input id={`r-${i.id}`} name="rate" defaultValue={i.rate} className="input num !w-28" /></div>
                      <div><label className="label" htmlFor={`m-${i.id}`}>Min order</label><input id={`m-${i.id}`} name="min_order" defaultValue={i.min_order ?? ''} className="input num !w-24" /></div>
                      <div><label className="label" htmlFor={`l-${i.id}`}>Lead days</label><input id={`l-${i.id}`} name="lead_days" defaultValue={i.lead_days ?? ''} className="input num !w-20" /></div>
                      <div><label className="label" htmlFor={`s-${i.id}`}>Stock</label><select id={`s-${i.id}`} name="in_stock" defaultValue={String(i.in_stock)} className="input"><option value="true">In stock</option><option value="false">Out of stock</option></select></div>
                      <SubmitButton className="btn btn-primary btn-sm">Save</SubmitButton>
                    </ActionForm>
                    <ActionForm action={deleteCatalogItem}><input type="hidden" name="id" value={i.id} /><SubmitButton className="btn btn-ghost btn-sm text-bad"><Trash2 className="size-4" />Remove</SubmitButton></ActionForm>
                  </div>
                </details>
              </li>
            ))}
            {(items || []).length === 0 && <li className="py-3 text-[13.5px] text-ink-2">Your price list is empty. Add your first item.</li>}
          </ul>
        </Section>
        <Section title="Add an item">
          <ActionForm action={saveCatalogItem} className="grid grid-cols-2 gap-3">
            <div className="col-span-2"><label className="label" htmlFor="cn">Item</label><input id="cn" name="name" className="input" required placeholder="Cement OPC 53" /></div>
            <div><label className="label" htmlFor="cb">Brand</label><input id="cb" name="brand" className="input" placeholder="UltraTech" /></div>
            <div><label className="label" htmlFor="cu">Unit</label><input id="cu" name="unit" className="input" required placeholder="bag" list="units" /></div>
            <datalist id="units">{['bag', 'tonne', 'cu m', 'kg', 'nos', 'sq m', 'm', 'litre'].map((u) => <option key={u} value={u} />)}</datalist>
            <div><label className="label" htmlFor="cr">Rate (₹)</label><input id="cr" name="rate" className="input num" required inputMode="decimal" /></div>
            <div><label className="label" htmlFor="cm">Min order</label><input id="cm" name="min_order" className="input num" inputMode="decimal" /></div>
            <div><label className="label" htmlFor="cl">Lead time (days)</label><input id="cl" name="lead_days" className="input num" inputMode="numeric" /></div>
            <div><label className="label" htmlFor="cmat">Matches site material</label><select id="cmat" name="material_id" className="input"><option value="">—</option>{(mats || []).map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}</select></div>
            <SubmitButton className="btn btn-primary col-span-2"><Store className="size-4" />Add to price list</SubmitButton>
          </ActionForm>
        </Section>
      </div>
    </>
  );
}
