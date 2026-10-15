'use server';
// Buyer-side server actions. Every call runs as the signed-in user, so
// row-level security and the database functions enforce the rules.
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createAdminClient, createClient } from '@/lib/supabase/server';
import { fail, friendly, ok, str, type ActionResult } from '@/lib/actions';

export async function holdPlot(formData: FormData) {
  const plotId = String(formData.get('plotId'));
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=${encodeURIComponent('/plots/' + plotId)}`);
  const { error } = await supabase.rpc('hold_plot', { p_plot_id: plotId });
  if (error) redirect(`/plots/${plotId}?error=${encodeURIComponent(error.message)}`);
  redirect(`/book/${plotId}`);
}

/** After the browser uploads the ID file to the private kyc bucket, mark KYC as submitted. */
export async function markKycSubmitted(path: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return fail('Sign in first.');
  if (!path.startsWith(user.id + '/')) return fail('Upload the document to your own folder.');
  const admin = createAdminClient(); // profiles.kyc_status is not user-editable on purpose
  const { error } = await admin.from('profiles').update({ kyc_status: 'submitted' }).eq('id', user.id).in('kyc_status', ['not_started', 'rejected']);
  if (error) return fail(friendly(error));
  return ok('ID received. You can pay the token now.');
}

export async function requestModification(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return fail('Sign in first.');
  const bookingId = str(fd, 'bookingId'), text = str(fd, 'requirement');
  if (!bookingId || !text || text.length < 5) return fail('Describe the change you want (at least a few words).');
  const { data: b } = await supabase.from('bookings').select('org_id').eq('id', bookingId).single();
  if (!b) return fail('Booking not found.');
  const { error } = await supabase.from('modification_requests').insert({ org_id: b.org_id, booking_id: bookingId, buyer_id: user.id, requirement: text });
  if (error) return fail(friendly(error));
  revalidatePath(`/me/bookings/${bookingId}`);
  return ok('Request sent. The developer will share a quote.');
}

export async function respondToQuote(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const supabase = await createClient();
  const id = str(fd, 'id'), approve = str(fd, 'approve') === 'yes';
  const { data, error } = await supabase.rpc('respond_to_quote', { p_request: id!, p_approve: approve });
  if (error) return fail(friendly(error));
  revalidatePath(`/me/bookings/${data.booking_id}`);
  return ok(approve ? 'Quote approved. Work will be scheduled.' : 'Quote declined.');
}

export async function markAllRead(): Promise<void> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  await supabase.from('notifications').update({ read_at: new Date().toISOString() }).eq('user_id', user.id).is('read_at', null);
  revalidatePath('/me');
}
