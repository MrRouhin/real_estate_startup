// POST /api/payments/create-order
//   { plotId }                     → token payment: start_booking() then an order for the token
//   { bookingId, installmentId }   → a later installment on the buyer's own booking
// The amount always comes from the database, never from the app.
import crypto from 'node:crypto';
import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/server';
import { createRazorpayOrder, PAYMENTS_MODE, userClient } from '@/lib/payments';
import { friendly } from '@/lib/actions';

const Body = z.union([
  z.object({ plotId: z.string().uuid() }),
  z.object({ bookingId: z.string().uuid(), installmentId: z.string().uuid() }),
]);

export async function POST(req: Request) {
  const db = await userClient(req);
  const { data: { user } } = await db.auth.getUser();
  if (!user) return Response.json({ error: 'Sign in first.' }, { status: 401 });
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: 'Bad request' }, { status: 400 });

  let booking: { id: string; org_id: string; buyer_id: string; plot_id: string };
  let installment: { id: string; amount: number; label: string };

  if ('plotId' in parsed.data) {
    const { data, error } = await db.rpc('start_booking', { p_plot_id: parsed.data.plotId });
    if (error || !data) return Response.json({ error: friendly(error) }, { status: 409 });
    booking = data;
    const { data: first } = await db.from('payment_schedule').select('id, amount, label').eq('booking_id', data.id).order('sort_order').limit(1).single();
    if (!first) return Response.json({ error: 'No payment schedule for this booking.' }, { status: 500 });
    installment = { ...first, amount: Number(first.amount) };
  } else {
    // RLS: the buyer can only read their own booking and its schedule
    const { data: b } = await db.from('bookings').select('id, org_id, buyer_id, plot_id, status').eq('id', parsed.data.bookingId).maybeSingle();
    if (!b || b.buyer_id !== user.id) return Response.json({ error: 'Booking not found.' }, { status: 404 });
    if (!['confirmed', 'registered', 'handed_over'].includes(b.status)) return Response.json({ error: 'This booking is not active.' }, { status: 409 });
    const { data: inst } = await db.from('payment_schedule').select('id, amount, label, status').eq('id', parsed.data.installmentId).eq('booking_id', b.id).maybeSingle();
    if (!inst || inst.status === 'paid') return Response.json({ error: 'This installment is already paid.' }, { status: 409 });
    booking = b; installment = { ...inst, amount: Number(inst.amount) };
  }

  const admin = createAdminClient();
  // Re-use an open order for the same installment instead of creating duplicates
  const { data: open } = await admin.from('payments').select('razorpay_order_id').eq('installment_id', installment.id).eq('status', 'created').maybeSingle();
  let orderId = open?.razorpay_order_id ?? null;
  if (!orderId) {
    try {
      orderId = PAYMENTS_MODE === 'razorpay'
        ? (await createRazorpayOrder(installment.amount, booking.id, { booking_id: booking.id, installment: installment.label })).id
        : 'order_sim' + crypto.randomBytes(7).toString('hex');
    } catch (e) {
      console.error('order creation failed', { booking: booking.id, e });
      return Response.json({ error: 'The payment gateway is not responding. Try again in a minute.' }, { status: 502 });
    }
    const { error } = await admin.from('payments').insert({
      booking_id: booking.id, installment_id: installment.id, org_id: booking.org_id, buyer_id: booking.buyer_id,
      amount: installment.amount, razorpay_order_id: orderId,
    });
    if (error) return Response.json({ error: friendly(error) }, { status: 500 });
  }
  return Response.json({
    mode: PAYMENTS_MODE, orderId, amount: installment.amount, bookingId: booking.id,
    keyId: PAYMENTS_MODE === 'razorpay' ? process.env.RAZORPAY_KEY_ID : undefined,
  });
}
