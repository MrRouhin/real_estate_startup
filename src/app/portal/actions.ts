'use server';
// Site-portal actions for contractors, vendors and employees. Each runs as the
// signed-in person; the database checks they only touch their own records.
import { revalidatePath } from 'next/cache';
import { requireUser } from '@/lib/auth';
import { fail, friendly, numOf, ok, str, type ActionResult } from '@/lib/actions';
import { checkInvoice, fileBytes } from '@/lib/ai/delivery-check';
import { hasServiceKey } from '@/lib/supabase/server';

type A = (prev: ActionResult | null, fd: FormData) => Promise<ActionResult>;

export const contractorProgress: A = async (_, fd) => {
  const { supabase } = await requireUser('/portal');
  const { error } = await supabase.rpc('update_work_progress', { p_package: str(fd, 'id')!, p_progress: numOf(fd, 'progress') ?? 0, p_note: str(fd, 'note') ?? undefined });
  if (error) return fail(friendly(error));
  revalidatePath('/portal');
  return ok('Progress sent to the developer');
};

export const contractorRequest: A = async (_, fd) => {
  const { supabase } = await requireUser('/portal');
  const { data: me } = await supabase.rpc('my_contractor_id');
  if (!me) return fail('This login is not linked to a contractor.');
  const { data: c } = await supabase.from('contractors').select('org_id').eq('id', me).single();
  const { data: pr } = await supabase.from('projects').select('id').eq('org_id', c!.org_id).eq('status', 'ongoing').limit(1).single();
  const q = numOf(fd, 'quantity');
  if (!q || q <= 0) return fail('Enter the quantity you need.');
  const { error } = await supabase.from('material_requests').insert({
    org_id: c!.org_id, project_id: pr!.id, contractor_id: me, material_id: str(fd, 'material_id')!, quantity: q,
    purpose: str(fd, 'purpose'), location: str(fd, 'location'), needed_by: str(fd, 'needed_by'), work_package_id: str(fd, 'work_package_id'),
  });
  if (error) return fail(friendly(error));
  revalidatePath('/portal');
  return ok('Request sent to the store');
};

export const contractorUsage: A = async (_, fd) => {
  const { supabase } = await requireUser('/portal');
  const { data: me } = await supabase.rpc('my_contractor_id');
  const { error } = await supabase.rpc('record_site_usage', {
    p_project: str(fd, 'project_id')!, p_contractor: me!, p_material: str(fd, 'material_id')!,
    p_consumed: numOf(fd, 'consumed') ?? 0, p_wastage: numOf(fd, 'wastage') ?? 0, p_note: str(fd, 'note') ?? undefined,
  });
  if (error) return fail(friendly(error));
  revalidatePath('/portal');
  return ok('Usage recorded');
};

export const vendorDelivery: A = async (_, fd) => {
  const { supabase } = await requireUser('/portal');
  const { data: me } = await supabase.rpc('my_vendor_id');
  if (!me) return fail('This login is not linked to a vendor.');
  const { data: v } = await supabase.from('vendors').select('org_id').eq('id', me).single();
  const { data: pr } = await supabase.from('projects').select('id').eq('org_id', v!.org_id).eq('status', 'ongoing').limit(1).single();
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
    org_id: v!.org_id, project_id: pr!.id, vendor_id: me, material_id: str(fd, 'material_id')!, quantity: q,
    vehicle_number: str(fd, 'vehicle_number'), invoice_number: str(fd, 'invoice_number'), location: str(fd, 'location'), photo_paths: photos,
    invoice_path: invoicePath,
  }).select('id').single();
  if (error) return fail(friendly(error));
  // the store's AI check of the invoice photo is written by the server (vendors cannot write it themselves)
  if (inv && hasServiceKey()) await checkInvoice(supabase, data.id, inv, 'vendor:' + me);
  revalidatePath('/portal');
  return ok('Delivery logged. The store will inspect it.');
};

export async function employeeCheckIn(lat: number | null, lng: number | null, selfiePath: string | null, note: string | null): Promise<ActionResult> {
  const { supabase } = await requireUser('/portal');
  const { data, error } = await supabase.rpc('check_in', { p_lat: lat ?? undefined, p_lng: lng ?? undefined, p_selfie: selfiePath ?? undefined, p_note: note ?? undefined } as never);
  if (error) return fail(friendly(error));
  revalidatePath('/portal');
  const a = data as unknown as { inside_geofence: boolean | null; distance_m: number | null };
  return ok(a.inside_geofence === false ? `Checked in, but you are ${a.distance_m} m from the site. Your supervisor will see this.` : a.inside_geofence ? 'Checked in at site. Have a safe day!' : 'Checked in (no location shared).');
}

export async function employeeCheckOut(note: string | null): Promise<ActionResult> {
  const { supabase } = await requireUser('/portal');
  const { error } = await supabase.rpc('check_out', { p_note: note ?? undefined });
  if (error) return fail(friendly(error));
  revalidatePath('/portal');
  return ok('Checked out. See you tomorrow.');
}
