// POST /api/payments/simulate — ONLY when PAYMENTS_MODE=simulated.
// Plays the part of Razorpay so the full booking flow can be demoed without a merchant account.
import crypto from 'node:crypto';
import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/server';
import { PAYMENTS_MODE, userClient } from '@/lib/payments';

const Body = z.object({ orderId: z.string(), outcome: z.enum(['success', 'failure']), method: z.string().optional() });

export async function POST(req: Request) {
  if (PAYMENTS_MODE !== 'simulated') return Response.json({ error: 'Simulated payments are switched off.' }, { status: 403 });
  const db = await userClient(req);
  const { data: { user } } = await db.auth.getUser();
  if (!user) return Response.json({ error: 'Sign in first.' }, { status: 401 });
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: 'Bad request' }, { status: 400 });
  const { data: mine } = await db.from('payments').select('id, buyer_id').eq('razorpay_order_id', parsed.data.orderId).maybeSingle();
  if (!mine || mine.buyer_id !== user.id) return Response.json({ error: 'Not your order.' }, { status: 403 });
  if (parsed.data.outcome === 'failure') {
    // Like Razorpay, a failed attempt leaves the order open so the buyer can retry it
    return Response.json({ error: 'The bank declined the payment. No money was taken.' }, { status: 402 });
  }
  const { data: booking, error } = await createAdminClient().rpc('mark_payment_paid', { p_order_id: parsed.data.orderId, p_payment_id: 'pay_sim' + crypto.randomBytes(7).toString('hex') });
  if (error || !booking) return Response.json({ error: error?.message || 'Could not confirm.' }, { status: 500 });
  return Response.json({ bookingId: booking.id, status: booking.status });
}
