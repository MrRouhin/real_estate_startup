'use server';
// Site employee actions. They run as the employee; the database limits them to their own
// attendance, tasks, leave and profile.
import { revalidatePath } from 'next/cache';
import { requirePartner } from '@/lib/auth';
import { fail, friendly, ok, str, type ActionResult } from '@/lib/actions';

type A = (prev: ActionResult | null, fd: FormData) => Promise<ActionResult>;
const done = (msg: string) => { revalidatePath('/employee', 'layout'); return ok(msg); };

export async function employeeCheckIn(lat: number | null, lng: number | null, selfiePath: string | null, note: string | null): Promise<ActionResult> {
  const { supabase } = await requirePartner('employee');
  const { data, error } = await supabase.rpc('check_in', { p_lat: lat ?? undefined, p_lng: lng ?? undefined, p_selfie: selfiePath ?? undefined, p_note: note ?? undefined } as never);
  if (error) return fail(friendly(error));
  revalidatePath('/employee', 'layout');
  const a = data as unknown as { inside_geofence: boolean | null; distance_m: number | null };
  return ok(a.inside_geofence === false ? `Checked in, but you are ${a.distance_m} m from the site. Your supervisor will see this.` : a.inside_geofence ? 'Checked in at site. Have a safe day!' : 'Checked in (no location shared).');
}

export async function employeeCheckOut(note: string | null): Promise<ActionResult> {
  const { supabase } = await requirePartner('employee');
  const { error } = await supabase.rpc('check_out', { p_note: note ?? undefined });
  if (error) return fail(friendly(error));
  revalidatePath('/employee', 'layout');
  return ok('Checked out. See you tomorrow.');
}

export const updateTask: A = async (_, fd) => {
  const { supabase } = await requirePartner('employee');
  const status = str(fd, 'status')!;
  const { error } = await supabase.rpc('update_crew_task', { p_task: str(fd, 'id')!, p_status: status, p_note: str(fd, 'note') ?? undefined });
  if (error) return fail(friendly(error));
  return done(status === 'done' ? 'Marked done. Well done!' : status === 'blocked' ? 'Your supervisor will see it is blocked' : 'Reopened');
};

export const askLeave: A = async (_, fd) => {
  const { supabase } = await requirePartner('employee');
  const from = str(fd, 'from_date'), to = str(fd, 'to_date') ?? from;
  if (!from) return fail('Pick the first day of leave.');
  if (to! < from) return fail('The last day must be on or after the first day.');
  const { error } = await supabase.rpc('request_leave', { p_from: from, p_to: to!, p_kind: str(fd, 'kind') ?? 'casual', p_reason: str(fd, 'reason') ?? undefined });
  if (error) return fail(friendly(error));
  return done('Leave requested. You will get a notification when it is decided.');
};

export const cancelLeave: A = async (_, fd) => {
  const { supabase } = await requirePartner('employee');
  const { error } = await supabase.rpc('cancel_my_leave', { p_leave: str(fd, 'id')! });
  if (error) return fail(friendly(error));
  return done('Leave request withdrawn');
};

/** Profile wizard: every step saves; the last step sends it for verification. */
export async function saveEmployeeProfile(p: Record<string, unknown>, submit: boolean): Promise<ActionResult> {
  const { supabase } = await requirePartner('employee');
  const clean = { ...p };
  if (typeof clean.id_number === 'string') { clean.id_last4 = clean.id_number.replace(/\s/g, '').slice(-4); delete clean.id_number; } // only the last 4 are stored
  if (typeof clean.bank_account === 'string') { if (clean.bank_account) clean.bank_last4 = clean.bank_account.replace(/\D/g, '').slice(-4); delete clean.bank_account; }
  const { error } = await supabase.rpc('save_my_employee_profile', { p: clean as never, p_submit: submit });
  if (error) return fail(friendly(error));
  revalidatePath('/employee', 'layout');
  return ok(submit ? 'Sent to your supervisor for verification' : 'Saved');
}

export async function uploadEmployeePhoto(fd: FormData): Promise<ActionResult> {
  const { supabase, user } = await requirePartner('employee');
  const f = fd.get('photo');
  if (!(f instanceof File) || f.size === 0) return fail('Choose a photo.');
  if (f.size > 5 * 1024 * 1024) return fail('Use a photo under 5 MB.');
  const { data: e } = await supabase.from('employees').select('org_id').eq('user_id', user.id).single();
  const path = `${e!.org_id}/people/${user.id}-${Date.now()}.${(f.type.split('/')[1] || 'jpg').replace('jpeg', 'jpg')}`;
  const up = await supabase.storage.from('site').upload(path, f, { contentType: f.type });
  if (up.error) return fail(up.error.message);
  const { error } = await supabase.rpc('save_my_employee_profile', { p: { photo_path: path } as never, p_submit: false });
  if (error) return fail(friendly(error));
  revalidatePath('/employee', 'layout');
  return ok('Photo updated');
}
