'use server';
import { revalidatePath } from 'next/cache';
import { requireUser } from '@/lib/auth';
import { fail, friendly, ok, str, type ActionResult } from '@/lib/actions';

export async function saveMyProfile(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const { supabase, user } = await requireUser('/me/profile');
  const pin = str(fd, 'pincode');
  if (pin && !/^[1-9]\d{5}$/.test(pin)) return fail('Enter a 6-digit PIN code.');
  const dob = str(fd, 'date_of_birth');
  if (dob && Date.now() - new Date(dob).getTime() < 18 * 365.25 * 86400000) return fail('Property buyers must be 18 or older.');
  const { error } = await supabase.from('profiles').update({
    full_name: str(fd, 'full_name'), email: str(fd, 'email'), address: str(fd, 'address'), city: str(fd, 'city'), pincode: pin,
    date_of_birth: dob, occupation: str(fd, 'occupation'), preferred_language: str(fd, 'preferred_language'),
  }).eq('id', user.id);
  if (error) return fail(friendly(error));
  revalidatePath('/me', 'layout');
  return ok('Profile saved');
}

/** The browser uploads the ID to the private kyc bucket first; this records it for review. */
export async function submitKyc(idType: string, idNumber: string, path: string): Promise<ActionResult> {
  const { supabase } = await requireUser('/me/profile');
  const { error } = await supabase.rpc('submit_my_kyc', { p_id_type: idType, p_id_number: idNumber, p_doc_path: path });
  if (error) {
    const m: Record<string, string> = { BAD_ID_NUMBER: 'Enter the ID number shown on the document.', BAD_DOCUMENT: 'Upload the document again.', ALREADY_VERIFIED: 'Your ID is already verified.' };
    return fail(m[error.message] ?? friendly(error));
  }
  revalidatePath('/me', 'layout');
  return ok('ID sent for verification. We kept only the last 4 characters of the number.');
}
