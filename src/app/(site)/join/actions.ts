'use server';
import { revalidatePath } from 'next/cache';
import { requireUser } from '@/lib/auth';
import { fail, friendly, ok, str, type ActionResult } from '@/lib/actions';

export async function lookupInvite(code: string): Promise<{ id: string; name: string } | null> {
  const { supabase } = await requireUser('/join');
  const { data } = await supabase.rpc('org_by_invite', { p_code: code.trim().toUpperCase() });
  const row = (data as { id: string; name: string }[] | null)?.[0];
  return row ?? null;
}

export async function requestToJoin(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const { supabase, profile } = await requireUser('/join');
  const code = str(fd, 'code')?.toUpperCase();
  if (!code) return fail('Enter the invite code from your developer.');
  const { data } = await supabase.rpc('org_by_invite', { p_code: code });
  const org = (data as { id: string; name: string }[] | null)?.[0];
  if (!org) return fail('That invite code is not right. Check it with the developer.');
  const role = str(fd, 'role');
  if (role !== 'contractor' && role !== 'vendor' && role !== 'employee') return fail('Choose how you work with the developer.');
  const full = str(fd, 'full_name') ?? profile.full_name;
  if (!full) return fail('Enter your name.');
  const { error } = await supabase.from('access_requests').insert({
    org_id: org.id, role, full_name: full, phone: str(fd, 'phone') ?? profile.phone, email: str(fd, 'email') ?? profile.email,
    company_name: str(fd, 'company_name'), trade: str(fd, 'trade'), gst_number: str(fd, 'gst_number')?.toUpperCase() ?? null,
    categories: (str(fd, 'categories') ?? '').split(',').map((x) => x.trim().toLowerCase()).filter(Boolean), message: str(fd, 'message'),
  });
  if (error) return fail(error.code === '23505' ? `You have already asked to join ${org.name} in this role.` : friendly(error));
  revalidatePath('/join');
  return ok(`Request sent to ${org.name}. You will be notified when they approve it.`);
}
