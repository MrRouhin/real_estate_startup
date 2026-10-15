// POST /api/webhooks/razorpay — Razorpay's server calls this; it is the source of truth for money.
// Razorpay Dashboard → Webhooks: URL https://<your-domain>/api/webhooks/razorpay,
// secret = RAZORPAY_WEBHOOK_SECRET, events: payment.captured, payment.failed.
import { createAdminClient } from '@/lib/supabase/server';
import { hmacMatches, toPaise } from '@/lib/payments';

type Evt = { event: string; payload: { payment?: { entity: { id: string; order_id: string; amount: number } } } };

export async function POST(req: Request) {
  const raw = await req.text(); // signature covers the raw body
  if (!hmacMatches(raw, req.headers.get('x-razorpay-signature') || '', process.env.RAZORPAY_WEBHOOK_SECRET || '')) {
    return new Response('bad signature', { status: 400 });
  }
  const evt = JSON.parse(raw) as Evt;
  const pay = evt.payload.payment?.entity;
  if (!pay?.order_id) return new Response('ignored');
  const db = createAdminClient();
  const { data: rec } = await db.from('payments').select('id, amount, status').eq('razorpay_order_id', pay.order_id).maybeSingle();
  if (!rec) return new Response('unknown order'); // not ours: 200 so Razorpay stops retrying

  if (evt.event === 'payment.captured') {
    if (pay.amount !== toPaise(rec.amount)) { console.error('amount mismatch', pay.order_id); return new Response('amount mismatch'); }
    const { error } = await db.rpc('mark_payment_paid', { p_order_id: pay.order_id, p_payment_id: pay.id });
    if (error) return new Response('retry', { status: 500 }); // 5xx → Razorpay retries later
  }
  if (evt.event === 'payment.failed' && rec.status === 'created') {
    await db.from('payments').update({ status: 'failed' }).eq('id', rec.id);
  }
  return new Response('ok');
}
