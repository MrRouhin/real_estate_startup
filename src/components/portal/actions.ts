'use server';
// Actions shared by the contractor, vendor and employee workspaces. Each runs as the
// signed-in person; the database functions check that they act only on their own records.
import { revalidatePath } from 'next/cache';
import { requireUser } from '@/lib/auth';
import { fail, friendly, ok, str, type ActionResult } from '@/lib/actions';

export async function acknowledgeLetter(id: string, note: string): Promise<ActionResult> {
  const { supabase } = await requireUser('/');
  const { error } = await supabase.rpc('acknowledge_letter', { p_letter: id, p_note: note.trim() || undefined });
  if (error) return fail(friendly(error));
  revalidatePath('/', 'layout');
  return ok('Acknowledged. The developer can see your reply.');
}

/** Company profile for contractors and vendors. `submit` sends it for verification. */
export async function saveCompanyProfile(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const { supabase } = await requireUser('/');
  const keys = ['contact_person', 'phone', 'email', 'address', 'gst_number', 'pan', 'license_number', 'insurance_policy', 'insurance_valid_till', 'team_size', 'upi_id', 'bank_ifsc', 'bank_last4', 'delivery_regions'];
  const p: Record<string, unknown> = Object.fromEntries(keys.map((k) => [k, str(fd, k) ?? '']));
  const cats = str(fd, 'categories');
  if (cats != null) p.categories = cats.split(',').map((x) => x.trim()).filter(Boolean);
  const acct = str(fd, 'bank_account');
  if (acct) p.bank_last4 = acct.replace(/\D/g, '').slice(-4); // only the last 4 digits are ever stored
  const submit = fd.get('intent') === 'submit';
  const { error } = await supabase.rpc('save_my_company_profile', { p: p as never, p_submit: submit });
  if (error) return fail(friendly(error));
  revalidatePath('/', 'layout');
  return ok(submit ? 'Sent for verification. The developer will review it.' : 'Saved');
}
