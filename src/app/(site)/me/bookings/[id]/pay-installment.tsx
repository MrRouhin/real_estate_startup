'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Wallet } from 'lucide-react';
import { SimulatedCheckout, startCheckout, type Order } from '@/components/buyer/checkout';
import { useToast } from '@/components/ui/toast';
import { inr } from '@/lib/format';

export function PayInstallment({ bookingId, installmentId, label, amount, plotNumber, buyer }: {
  bookingId: string; installmentId: string; label: string; amount: number; plotNumber: string; buyer: { name: string; phone: string; email: string };
}) {
  const [busy, setBusy] = useState(false);
  const [sim, setSim] = useState<Order | null>(null);
  const toast = useToast();
  const router = useRouter();
  async function go() {
    setBusy(true);
    try {
      const r = await fetch('/api/payments/create-order', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ bookingId, installmentId }) });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error);
      await startCheckout({ ...j, label: `${label} · plot ${plotNumber}` }, buyer, setSim);
    } catch (e) { toast((e as Error).message, 'error'); } finally { setBusy(false); }
  }
  return (
    <>
      <button className="btn btn-primary mt-3 w-full" onClick={go} disabled={busy}>
        {busy ? <Loader2 className="size-4 animate-spin" /> : <Wallet className="size-4" />}Pay {label.toLowerCase()} · {inr(amount)}
      </button>
      <SimulatedCheckout order={sim} onClose={() => setSim(null)} onPaid={() => { setSim(null); toast('Payment received. Thank you!'); router.refresh(); }} />
    </>
  );
}
