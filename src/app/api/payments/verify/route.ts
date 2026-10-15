// POST /api/payments/verify — the object Razorpay Checkout returns on success.
// Gives the buyer an instant confirmation; the webhook does the same job as a backup.
import { z } from 'zod';
import { createAdminClient, hasServiceKey, SERVICE_KEY_MISSING } from '@/lib/supabase/server';
import { hmacMatches, userClient } from '@/lib/payments';

const Body = z.object({ razorpay_order_id: z.string(), razorpay_payment_id: z.string(), razorpay_signature: z.string() });

export async function POST(req: Request) {
  if (!hasServiceKey()) return Response.json({ error: SERVICE_KEY_MISSING }, { status: 503 });
  const db = await userClient(req);
  const { data: { user } } = await db.auth.getUser();
  if (!user) return Response.json({ error: 'Sign in first.' }, { status: 401 });
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: 'Bad request' }, { status: 400 });
  const { razorpay_order_id: o, razorpay_payment_id: p, razorpay_signature: s } = parsed.data;
  if (!hmacMatches(`${o}|${p}`, s, process.env.RAZORPAY_KEY_SECRET || '')) return Response.json({ error: 'Signature check failed.' }, { status: 400 });
  const { data: mine } = await db.from('payments').select('id').eq('razorpay_order_id', o).maybeSingle();
  if (!mine) return Response.json({ error: 'Not your order.' }, { status: 403 });
  const { data: booking, error } = await createAdminClient().rpc('mark_payment_paid', { p_order_id: o, p_payment_id: p });
  if (error || !booking) return Response.json({ error: 'Could not confirm the payment.' }, { status: 500 });
  return Response.json({ bookingId: booking.id, status: booking.status });
}
