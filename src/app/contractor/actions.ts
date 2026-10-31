'use server';
// Contractor workspace actions. They run as the contractor; database functions limit them
// to the contractor's own work packages and crew.
import { revalidatePath } from 'next/cache';
import { requirePartner } from '@/lib/auth';
import { fail, friendly, numOf, ok, str, type ActionResult } from '@/lib/actions';

type A = (prev: ActionResult | null, fd: FormData) => Promise<ActionResult>;
const done = (msg: string) => { revalidatePath('/contractor', 'layout'); return ok(msg); };

export const raiseBill: A = async (_, fd) => {
  const { supabase } = await requirePartner('contractor');
  const gross = numOf(fd, 'gross_amount');
  if (!gross || gross <= 0) return fail('Enter the bill amount before tax.');
  const { error } = await supabase.rpc('submit_contractor_bill', { p: {
    work_package_id: str(fd, 'work_package_id'), gross_amount: gross, gst_pct: numOf(fd, 'gst_pct') ?? 18,
    period_from: str(fd, 'period_from'), period_to: str(fd, 'period_to'), invoice_number: str(fd, 'invoice_number'), note: str(fd, 'note'),
  } as never });
  if (error) return fail(friendly(error));
  return done('Bill sent to the developer for verification');
};

export const saveWorker: A = async (_, fd) => {
  const { supabase } = await requirePartner('contractor');
  const { error } = await supabase.rpc('contractor_save_employee', { p: {
    id: str(fd, 'id'), full_name: str(fd, 'full_name'), phone: str(fd, 'phone'), role_title: str(fd, 'role_title'), daily_wage: numOf(fd, 'daily_wage'),
    active: fd.get('active') == null ? undefined : fd.get('active') === 'true',
  } as never });
  if (error) return fail(friendly(error));
  return done(str(fd, 'id') ? 'Worker updated' : 'Worker added to your crew');
};

export const reviewWorker: A = async (_, fd) => {
  const { supabase } = await requirePartner('contractor');
  const status = str(fd, 'status');
  const { error } = await supabase.rpc('review_employee_profile', { p_employee: str(fd, 'employee_id')!, p_status: status!, p_note: str(fd, 'note') ?? undefined });
  if (error) return fail(friendly(error));
  return done(status === 'verified' ? 'Profile verified' : 'Sent back with your note');
};

export const assignTask: A = async (_, fd) => {
  const { supabase } = await requirePartner('contractor');
  const title = str(fd, 'title');
  if (!title || title.length < 3) return fail('Write what needs doing.');
  const { error } = await supabase.rpc('contractor_assign_task', { p: {
    employee_id: str(fd, 'employee_id'), work_package_id: str(fd, 'work_package_id'), title, details: str(fd, 'details'), due_date: str(fd, 'due_date'), priority: str(fd, 'priority') ?? 'normal',
  } as never });
  if (error) return fail(friendly(error));
  return done('Task assigned');
};

export const setTaskStatus: A = async (_, fd) => {
  const { supabase } = await requirePartner('contractor');
  const { error } = await supabase.rpc('update_crew_task', { p_task: str(fd, 'id')!, p_status: str(fd, 'status')!, p_note: str(fd, 'note') ?? undefined });
  if (error) return fail(friendly(error));
  return done('Task updated');
};

export const markAttendance: A = async (_, fd) => {
  const { supabase } = await requirePartner('contractor');
  const { error } = await supabase.rpc('mark_crew_attendance', { p_employee: str(fd, 'employee_id')!, p_date: str(fd, 'date')!, p_present: fd.get('present') === 'true', p_note: str(fd, 'note') ?? undefined });
  if (error) return fail(friendly(error));
  return done(fd.get('present') === 'true' ? 'Marked present' : 'Marked absent');
};

export const decideLeave: A = async (_, fd) => {
  const { supabase } = await requirePartner('contractor');
  const approve = fd.get('approve') === 'true';
  const { error } = await supabase.rpc('decide_leave', { p_leave: str(fd, 'id')!, p_approve: approve, p_note: str(fd, 'note') ?? undefined });
  if (error) return fail(friendly(error));
  return done(approve ? 'Leave approved' : 'Leave declined');
};

export const logProgress: A = async (_, fd) => {
  const { supabase } = await requirePartner('contractor');
  const { error } = await supabase.rpc('update_work_progress', { p_package: str(fd, 'id')!, p_progress: numOf(fd, 'progress') ?? 0, p_note: str(fd, 'note') ?? undefined });
  if (error) return fail(friendly(error));
  return done('Progress sent to the developer');
};

export const requestMaterial: A = async (_, fd) => {
  const { supabase } = await requirePartner('contractor');
  const { data: me } = await supabase.rpc('my_contractor_id');
  if (!me) return fail('This login is not linked to a contractor.');
  const wpId = str(fd, 'work_package_id');
  const { data: wp } = wpId ? await supabase.from('work_packages').select('org_id, project_id').eq('id', wpId).single() : { data: null };
  const { data: c } = await supabase.from('contractors').select('org_id').eq('id', me).single();
  const project = wp?.project_id ?? (await supabase.from('projects').select('id').eq('org_id', c!.org_id).eq('status', 'ongoing').order('created_at').limit(1).single()).data?.id;
  const q = numOf(fd, 'quantity');
  if (!q || q <= 0) return fail('Enter the quantity you need.');
  const { error } = await supabase.from('material_requests').insert({
    org_id: c!.org_id, project_id: project!, contractor_id: me, material_id: str(fd, 'material_id')!, quantity: q,
    purpose: str(fd, 'purpose'), location: str(fd, 'location'), needed_by: str(fd, 'needed_by'), work_package_id: wpId,
  });
  if (error) return fail(friendly(error));
  return done('Request sent to the store');
};

export const logUsage: A = async (_, fd) => {
  const { supabase } = await requirePartner('contractor');
  const { data: me } = await supabase.rpc('my_contractor_id');
  const { error } = await supabase.rpc('record_site_usage', {
    p_project: str(fd, 'project_id')!, p_contractor: me!, p_material: str(fd, 'material_id')!,
    p_consumed: numOf(fd, 'consumed') ?? 0, p_wastage: numOf(fd, 'wastage') ?? 0, p_note: str(fd, 'note') ?? undefined,
  });
  if (error) return fail(friendly(error));
  return done('Usage recorded');
};
