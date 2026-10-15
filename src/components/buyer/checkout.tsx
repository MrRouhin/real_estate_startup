'use client';
// Payment: Razorpay Checkout in production, a clearly-labelled simulator in
// PAYMENTS_MODE=simulated so the whole flow can be demoed without a merchant account.
import { useState } from 'react';
import { CreditCard, Landmark, Loader2, ShieldCheck, Smartphone } from 'lucide-react';
import { Sheet } from '@/components/ui/sheet';
import { inr } from '@/lib/format';

export type Order = { mode: 'razorpay' | 'simulated'; orderId: string; amount: number; keyId?: string; bookingId: string; label: string };

declare global { interface Window { Razorpay?: new (o: Record<string, unknown>) => { open: () => void; on: (e: string, f: (r: unknown) => void) => void } } }

function loadScript() {
  return new Promise<boolean>((resolve) => {
    if (window.Razorpay) return resolve(true);
    const s = document.createElement('script');
    s.src = 'https://checkout.razorpay.com/v1/checkout.js';
    s.onload = () => resolve(true); s.onerror = () => resolve(false);
    document.body.appendChild(s);
  });
}

/** Opens the right checkout for the order and resolves with the confirmed booking (or an error). */
export async function startCheckout(order: Order, buyer: { name: string; phone: string; email: string }, openSim: (o: Order) => void): Promise<void> {
  if (order.mode === 'simulated') { openSim(order); return; }
  const ok = await loadScript();
  if (!ok || !window.Razorpay) throw new Error('Could not load Razorpay Checkout. Check your connection.');
  await new Promise<void>((resolve, reject) => {
    const rz = new window.Razorpay!({
      key: order.keyId, order_id: order.orderId, amount: order.amount * 100, currency: 'INR',
      name: 'Plotline', description: order.label,
      prefill: { name: buyer.name, contact: buyer.phone, email: buyer.email }, theme: { color: '#0e5d63' },
      handler: async (resp: Record<string, string>) => {
        const r = await fetch('/api/payments/verify', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(resp) });
        if (r.ok) { resolve(); window.location.href = `/me/bookings/${order.bookingId}?paid=1`; } else reject(new Error((await r.json()).error || 'Verification failed'));
      },
      modal: { ondismiss: () => reject(new Error('Payment cancelled. Your plot stays held until the timer runs out.')) },
    });
    rz.open();
  });
}

export function SimulatedCheckout({ order, onClose, onPaid }: { order: Order | null; onClose: () => void; onPaid: (bookingId: string) => void }) {
  const [method, setMethod] = useState<'upi' | 'card' | 'bank'>('upi');
  const [stage, setStage] = useState<'form' | 'paying' | 'failed'>('form');
  const [err, setErr] = useState('');
  async function pay(outcome: 'success' | 'failure') {
    if (!order) return;
    setStage('paying'); setErr('');
    await new Promise((r) => setTimeout(r, 1200));
    const r = await fetch('/api/payments/simulate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ orderId: order.orderId, outcome, method }) });
    const j = await r.json().catch(() => ({}));
    if (!r.ok || outcome === 'failure') { setErr(j.error || 'The bank declined the payment. No money was taken.'); setStage('failed'); return; }
    onPaid(j.bookingId || order.bookingId);
  }
  return (
    <Sheet open={!!order} onClose={() => { setStage('form'); onClose(); }} title="Secure checkout">
      {order && (
        <div className="grid gap-4">
          <div className="rounded-2xl bg-ink p-4 text-bg">
            <div className="flex items-center justify-between text-[12px] opacity-80"><span>{order.label}</span><span className="rounded-full bg-white/15 px-2 py-0.5">Test mode · simulated</span></div>
            <div className="num mt-1 text-[28px] font-semibold">{inr(order.amount)}</div>
            <div className="num mt-1 text-[11px] opacity-60">Order {order.orderId}</div>
          </div>
          {stage === 'form' && (
            <>
              <div className="grid grid-cols-3 gap-2">
                {([['upi', Smartphone, 'UPI'], ['card', CreditCard, 'Card'], ['bank', Landmark, 'Netbanking']] as const).map(([k, I, l]) => (
                  <button key={k} className={'btn btn-sm flex-col !gap-1 !py-3 ' + (method === k ? 'btn-outline !border-accent !bg-accent-soft text-accent' : 'btn-outline')} onClick={() => setMethod(k)} aria-pressed={method === k}>
                    <I className="size-5" />{l}</button>
                ))}
              </div>
              {method === 'upi' && <div><label className="label" htmlFor="vpa">UPI ID</label><input id="vpa" className="input num" defaultValue="success@razorpay" /></div>}
              {method === 'card' && <div><label className="label" htmlFor="cc">Card number (test)</label><input id="cc" className="input num" defaultValue="4111 1111 1111 1111" readOnly /></div>}
              {method === 'bank' && <div><label className="label" htmlFor="bank">Bank</label><select id="bank" className="input"><option>State Bank of India</option><option>HDFC Bank</option><option>ICICI Bank</option><option>Canara Bank</option></select></div>}
              <button className="btn btn-primary btn-lg" onClick={() => pay('success')}>Pay {inr(order.amount)}</button>
              <div className="flex justify-between"><button className="btn btn-ghost btn-sm" onClick={onClose}>Cancel</button>
                <button className="btn btn-ghost btn-sm" onClick={() => pay('failure')}>Simulate a failed payment</button></div>
            </>
          )}
          {stage === 'paying' && <div className="grid justify-items-center gap-3 py-8"><Loader2 className="size-9 animate-spin text-accent" /><span className="text-ink-2">Confirming with the bank…</span></div>}
          {stage === 'failed' && (
            <div className="grid gap-3"><div className="font-semibold text-bad">Payment failed</div><p className="text-[13.5px] text-ink-2">{err} Your plot stays held until the timer ends, so you can try again.</p>
              <button className="btn btn-primary" onClick={() => setStage('form')}>Try again</button></div>
          )}
          <p className="flex items-center gap-1.5 text-[12px] text-ink-3"><ShieldCheck className="size-4" />With real keys this opens Razorpay. Card details never touch this app.</p>
        </div>
      )}
    </Sheet>
  );
}
