'use server';
import { requireUser } from '@/lib/auth';
import { fail, friendly, ok, str, type ActionResult } from '@/lib/actions';

export async function createCompany(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const { supabase } = await requireUser('/start');
  const { error } = await supabase.rpc('create_my_organization', { p: {
    name: str(fd, 'name'), phone: str(fd, 'phone'), email: str(fd, 'email'), gst_number: str(fd, 'gst_number'), address: str(fd, 'address'), website: str(fd, 'website'), signatory_title: str(fd, 'signatory_title'),
  } as never });
  if (error) {
    const m: Record<string, string> = { ALREADY_IN_A_COMPANY: 'You are already part of a developer company. Open the console.', HAS_BOOKINGS: 'This account has bookings as a buyer. Use a separate work email for your company.', NAME_REQUIRED: 'Enter your company’s registered name.' };
    return fail(m[error.message] ?? friendly(error));
  }
  return ok('Company created. Now add your first project.', '/console/projects/new?welcome=1');
}
