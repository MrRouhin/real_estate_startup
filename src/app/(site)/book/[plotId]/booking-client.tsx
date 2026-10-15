'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Check, FileUp, Loader2, Lock, ShieldCheck, Timer } from 'lucide-react';
import { getBrowserClient } from '@/lib/supabase/client';
import { markKycSubmitted } from '@/app/actions';
import { useToast } from '@/components/ui/toast';
import { SimulatedCheckout, startCheckout, type Order } from '@/components/buyer/checkout';
import { cap, inr, lakh } from '@/lib/format';

type PlanStep = { label: string; pct: number; note?: string };

export function BookingClient({ plot, project, developer, heldUntil, tokenPct, plan, kyc, userId, paymentsMode, buyer }: {
  plot: { id: string; number: string; price: number; area: number; facing: string | null; dims: string | null };
  project: { name: string; slug: string }; developer: string; heldUntil: string; tokenPct: number; plan: PlanStep[];
  kyc: string; userId: string; paymentsMode: 'razorpay' | 'simulated'; buyer: { name: string; phone: string; email: string };
}) {
  const router = useRouter();
  const toast = useToast();
  const [left, setLeft] = useState(() => new Date(heldUntil).getTime() - Date.now());
  const [kycState, setKyc] = useState(kyc);
  const [file, setFile] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [agree, setAgree] = useState(false);
  const [busy, setBusy] = useState(false);
  const [sim, setSim] = useState<Order | null>(null);
  useEffect(() => { const t = setInterval(() => setLeft(new Date(heldUntil).getTime() - Date.now()), 1000); return () => clearInterval(t); }, [heldUntil]);
  const expired = left <= 0;
  const mm = String(Math.max(0, Math.floor(left / 60000))).padStart(2, '0'), ss = String(Math.max(0, Math.floor((left % 60000) / 1000))).padStart(2, '0');
  const token = Math.round(plot.price * tokenPct / 100);
  const kycDone = kycState === 'verified' || kycState === 'submitted';

  async function upload(f: File) {
    if (f.size > 5 * 1024 * 1024) { toast('That file is over 5 MB. Use a smaller photo or PDF.', 'error'); return; }
    setUploading(true);
    const ext = (f.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '');
    const path = `${userId}/id-${Date.now()}.${ext}`;
    const { error } = await getBrowserClient().storage.from('kyc').upload(path, f, { upsert: true, contentType: f.type || undefined });
    if (error) { setUploading(false); toast(error.message, 'error'); return; }
    const r = await markKycSubmitted(path);
    setUploading(false);
    if (!r.ok) { toast(r.error!, 'error'); return; }
    setFile(f.name); setKyc('submitted'); toast(r.message!);
  }

  async function pay() {
    setBusy(true);
    try {
      const r = await fetch('/api/payments/create-order', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ plotId: plot.id }) });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || 'Could not start the payment.');
      await startCheckout({ ...j, label: `Token for plot ${plot.number}` }, buyer, setSim);
    } catch (e) {
      toast((e as Error).message, 'error');
    } finally { setBusy(false); }
  }

  return (
    <div className="mx-auto grid max-w-5xl gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
      <div className="grid content-start gap-5">
        <div><div className="eyebrow">{project.name}</div><h1 className="text-[28px] font-bold">Book plot {plot.number}</h1></div>
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
          className={'flex items-center justify-between gap-4 rounded-2xl border p-4 ' + (expired ? 'border-bad/40 bg-[color-mix(in_srgb,var(--bad)_8%,transparent)]' : 'border-held/50 bg-[color-mix(in_srgb,var(--st-held)_12%,var(--surface))]')}>
          <div className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-full bg-held/20 text-warn [animation:var(--animate-pulse-ring)]"><Timer className="size-5" /></span>
            <div><div className="font-semibold">{expired ? 'Your hold ended' : `Plot ${plot.number} is held for you`}</div>
              <div className="text-[12.5px] text-ink-2">{expired ? 'Go back and hold it again if it’s still free.' : 'No one else can book it until the timer ends.'}</div></div>
          </div>
          <div className="num text-[28px] font-semibold" role="timer" aria-live="off" suppressHydrationWarning>{`${mm}:${ss}`}</div>
        </motion.div>

        <section className="card p-5">
          <h2 className="mb-3 font-semibold">1. Verify your identity</h2>
          {kycDone ? (
            <div className="flex items-center gap-2 text-[14px] font-medium text-good"><Check className="size-5" />{file ? `${file} uploaded — under review` : kycState === 'verified' ? 'ID verified' : 'ID received — under review'}</div>
          ) : (
            <>
              <p className="mb-3 text-[13.5px] text-ink-2">Upload your PAN card or Aadhaar. It goes to private storage that only you and {developer}’s verification team can open.</p>
              <label className="btn btn-outline cursor-pointer">
                {uploading ? <Loader2 className="size-4 animate-spin" /> : <FileUp className="size-4" />}{uploading ? 'Uploading…' : 'Upload photo or PDF'}
                <input type="file" accept="image/*,application/pdf" className="sr-only" disabled={uploading} onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
              </label>
            </>
          )}
        </section>

        <section className="card p-5">
          <h2 className="mb-3 font-semibold">2. Payment plan</h2>
          <ol className="divide-y divide-line">
            {plan.map((s, k) => {
              const amt = k === 0 ? token : Math.round(plot.price * s.pct / 100);
              return (
                <li key={s.label} className="flex items-center justify-between gap-3 py-2.5">
                  <div className="flex items-center gap-3">
                    <span className={'grid size-7 place-items-center rounded-full text-[12px] font-bold ' + (k === 0 ? 'bg-accent text-accent-ink' : 'bg-surface-2 text-ink-2')}>{k + 1}</span>
                    <div><div className="text-[14px] font-medium">{s.label} <span className="text-ink-3">({k === 0 ? tokenPct : s.pct}%)</span></div><div className="text-[12px] text-ink-3">{s.note}</div></div>
                  </div>
                  <span className="num font-medium">{lakh(amt)}</span>
                </li>
              );
            })}
          </ol>
        </section>
      </div>

      <aside className="card grid content-start gap-4 p-5 lg:sticky lg:top-24">
        <h2 className="font-semibold">Summary</h2>
        <dl className="grid gap-2 text-[13.5px]">
          {[['Plot', `${plot.number} · ${plot.area} sq ft`], ['Facing', cap(plot.facing)], ['Plot price', inr(plot.price)]].map(([k, v]) => (
            <div key={k} className="flex justify-between gap-3"><dt className="text-ink-2">{k}</dt><dd className="num font-medium">{v}</dd></div>
          ))}
          <div className="flex justify-between gap-3 border-t border-dashed border-line pt-2 text-[15px]"><dt className="font-semibold">Pay now</dt><dd className="num font-semibold text-accent">{inr(token)}</dd></div>
        </dl>
        <label className="flex items-start gap-2 text-[12.5px] text-ink-2">
          <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} className="mt-0.5 size-4 accent-[var(--accent)]" />
          I agree the token is refundable as per the developer’s cancellation policy until the agreement for sale is signed.
        </label>
        <button className="btn btn-primary btn-lg" disabled={!kycDone || !agree || busy || expired} onClick={pay}>
          {busy ? <Loader2 className="size-4 animate-spin" /> : <Lock className="size-4" />}Pay {inr(token)}
        </button>
        {(!kycDone || !agree) && !expired && <p className="text-center text-[12px] text-ink-3">Upload your ID and tick the box to continue.</p>}
        <p className="flex items-center gap-1.5 text-[12px] text-ink-3"><ShieldCheck className="size-4 shrink-0" />{paymentsMode === 'razorpay' ? 'Payments by Razorpay: UPI, cards, netbanking.' : 'Demo mode: payments are simulated, no money moves.'}</p>
      </aside>
      <SimulatedCheckout order={sim} onClose={() => setSim(null)} onPaid={(id) => { setSim(null); router.push(`/me/bookings/${id}?paid=1`); }} />
    </div>
  );
}
