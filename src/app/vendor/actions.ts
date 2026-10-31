'use server';
// Vendor workspace actions. They run as the vendor; the database limits them to the
// vendor's own purchase orders, deliveries and price list.
import { revalidatePath } from 'next/cache';
import { requirePartner } from '@/lib/auth';
import { fail, friendly, numOf, ok, str, type ActionResult } from '@/lib/actions';
import { checkInvoice, fileBytes } from '@/lib/ai/delivery-check';
import { hasServiceKey } from '@/lib/supabase/server';

type A = (prev: ActionResult | null, fd: FormData) => Promise<ActionResult>;
const done = (msg: string) => { revalidatePath('/vendor', 'layout'); return ok(msg); };

export const respondPO: A = async (_, fd) => {
  const { supabase } = await requirePartner('vendor');
  const accept = fd.get('accept') === 'true';
  const { error } = await supabase.rpc('vendor_respond_po', { p_po: str(fd, 'id')!, p_accept: accept, p_promised: str(fd, 'promised_date') ?? undefined, p_note: str(fd, 'note') ?? undefined });
  if (error) return fail(friendly(error));
  return done(accept ? 'Order accepted. The site knows when to expect it.' : 'Order declined');
};

export const dispatchPO: A = async (_, fd) => {
  const { supabase } = await requirePartner('vendor');
  const { error } = await supabase.rpc('vendor_dispatch_po', { p_po: str(fd, 'id')!, p_vehicle: str(fd, 'vehicle_number') ?? '', p_note: str(fd, 'note') ?? undefined });
  if (error) return fail(friendly(error));
  return done('Marked dispatched. The store has been told.');
};

export const recordDelivery: A = async (_, fd) => {
  const { supabase } = await requirePartner('vendor');
  const { data: me } = await supabase.rpc('my_vendor_id');
  if (!me) return fail('This login is not linked to a vendor.');
  const { data: v } = await supabase.from('vendors').select('org_id').eq('id', me).single();
  const poId = str(fd, 'po_id');
  const { data: po } = poId ? await supabase.from('purchase_orders').select('project_id, delivery_location').eq('id', poId).single() : { data: null };
  const project = po?.project_id ?? (await supabase.from('projects').select('id').eq('org_id', v!.org_id).eq('status', 'ongoing').order('created_at').limit(1).single()).data?.id;
  const q = numOf(fd, 'quantity');
  if (!q || q <= 0) return fail('Enter the quantity delivered.');
  const photo = fd.get('photo');
  const photos: string[] = [];
  if (photo instanceof File && photo.size > 0) {
    const path = `${v!.org_id}/deliveries/${Date.now()}-${photo.name.replace(/[^a-z0-9.]+/gi, '-')}`;
    const up = await supabase.storage.from('site').upload(path, photo, { contentType: photo.type });
    if (!up.error) photos.push(path);
  }
  const inv = await fileBytes(fd.get('invoice'));
  let invoicePath: string | null = null;
  if (inv) {
    const path = `${v!.org_id}/invoices/${Date.now()}-${inv.file.name.replace(/[^a-z0-9.]+/gi, '-')}`;
    const up = await supabase.storage.from('site').upload(path, inv.file, { contentType: inv.mediaType });
    if (!up.error) invoicePath = path;
  }
  const { data, error } = await supabase.from('deliveries').insert({
    org_id: v!.org_id, project_id: project!, vendor_id: me, material_id: str(fd, 'material_id')!, quantity: q, unit_cost: numOf(fd, 'unit_cost'),
    vehicle_number: str(fd, 'vehicle_number')?.toUpperCase() ?? null, invoice_number: str(fd, 'invoice_number'), location: str(fd, 'location') ?? po?.delivery_location ?? null,
    photo_paths: photos, invoice_path: invoicePath, po_id: poId,
  }).select('id').single();
  if (error) return fail(friendly(error));
  if (inv && hasServiceKey()) await checkInvoice(supabase, data.id, inv, 'vendor:' + me);
  return done('Delivery logged. The store will inspect it.');
};

export const saveCatalogItem: A = async (_, fd) => {
  const { supabase } = await requirePartner('vendor');
  const { data: me } = await supabase.rpc('my_vendor_id');
  const { data: v } = await supabase.from('vendors').select('org_id').eq('id', me!).single();
  const name = str(fd, 'name'), unit = str(fd, 'unit'), rate = numOf(fd, 'rate');
  if (!name || !unit || rate == null || rate < 0) return fail('Fill in the item, unit and rate.');
  const row = { org_id: v!.org_id, vendor_id: me!, name, unit, rate, brand: str(fd, 'brand'), material_id: str(fd, 'material_id'),
    min_order: numOf(fd, 'min_order'), lead_days: numOf(fd, 'lead_days'), in_stock: fd.get('in_stock') !== 'false', updated_at: new Date().toISOString() };
  const id = str(fd, 'id');
  const { error } = id ? await supabase.from('vendor_catalog').update(row).eq('id', id) : await supabase.from('vendor_catalog').insert(row);
  if (error) return fail(error.code === '23505' ? 'You already list an item with that name.' : friendly(error));
  return done(id ? 'Price updated' : 'Added to your price list');
};

export const deleteCatalogItem: A = async (_, fd) => {
  const { supabase } = await requirePartner('vendor');
  const { error } = await supabase.from('vendor_catalog').delete().eq('id', str(fd, 'id')!);
  if (error) return fail(friendly(error));
  return done('Removed');
};
