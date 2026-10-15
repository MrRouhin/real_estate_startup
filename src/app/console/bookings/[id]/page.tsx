import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, FileUp } from 'lucide-react';
import { requireStaff } from '@/lib/auth';
import { date, inr, lakh, phone } from '@/lib/format';
import { Pill, Section } from '@/components/ui/bits';
import { ProgressRing } from '@/components/ui/motion';
import { ActionForm, SubmitButton } from '@/components/ui/action-form';
import { uploadDocument } from '../../actions';
import { BookingActions } from './booking-actions';

export default async function BookingAdmin({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase } = await requireStaff();
  const { data: b } = await supabase.from('bookings').select('*').eq('id', id).maybeSingle();
  if (!b) notFound();
  const [{ data: plot }, { data: buyer }, { data: sched }, { data: pays }, { data: docs }, { data: mods }] = await Promise.all([
    supabase.from('plots').select('*').eq('id', b.plot_id).single(),
    supabase.from('profiles').select('*').eq('id', b.buyer_id).single(),
    supabase.from('payment_schedule').select('*').eq('booking_id', id).order('sort_order'),
    supabase.from('payments').select('*').eq('booking_id', id).order('created_at'),
    supabase.from('documents').select('*').eq('booking_id', id).order('created_at'),
    supabase.from('modification_requests').select('*').eq('booking_id', id),
  ]);
  const paid = (pays || []).filter((p) => p.status === 'paid').reduce((a, p) => a + Number(p.amount), 0);
  return (
    <>
      <Link href="/console/bookings" className="inline-flex w-fit items-center gap-1 text-[13px] text-ink-2 hover:text-ink"><ArrowLeft className="size-4" />Bookings</Link>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div><div className="eyebrow">Booked {date(b.created_at)}</div><h1 className="text-[28px] font-bold">Plot {plot!.plot_number} · {buyer?.full_name}</h1>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-[13.5px] text-ink-2"><Pill status={b.status} /><span className="num">{phone(buyer?.phone)}</span><span>· {buyer?.email}</span><span className="tag">KYC {buyer?.kyc_status.replace('_', ' ')}</span></div></div>
        <BookingActions id={b.id} status={b.status} />
      </div>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <Section title="Money">
          <div className="mb-4 flex items-center gap-5">
            <ProgressRing value={(paid / Number(b.total_amount)) * 100} size={84} stroke={8} color="var(--good)" />
            <dl className="grid grid-cols-3 gap-4 text-[13px]">
              <div><dt className="text-ink-3">Price</dt><dd className="num text-[16px] font-semibold">{lakh(b.total_amount)}</dd></div>
              <div><dt className="text-ink-3">Collected</dt><dd className="num text-[16px] font-semibold text-good">{lakh(paid)}</dd></div>
              <div><dt className="text-ink-3">Balance</dt><dd className="num text-[16px] font-semibold">{lakh(Number(b.total_amount) - paid)}</dd></div>
            </dl>
          </div>
          <table className="table">
            <thead><tr><th>Installment</th><th className="r">Amount</th><th>Due</th><th>Status</th></tr></thead>
            <tbody>{(sched || []).map((s) => <tr key={s.id}><td>{s.label}</td><td className="r num">{inr(s.amount)}</td><td className="text-ink-2">{s.due_date ? date(s.due_date) : s.due_note}</td><td><Pill status={s.status} /></td></tr>)}</tbody>
          </table>
        </Section>
        <div className="grid content-start gap-6">
          <Section title="Payments received">
            {(pays || []).length === 0 ? <p className="text-[13.5px] text-ink-2">No payments yet.</p> : (
              <table className="table"><tbody>{pays!.map((p) => (
                <tr key={p.id}><td className="num text-[12px]">{p.razorpay_payment_id || p.razorpay_order_id}</td><td className="r num">{inr(p.amount)}</td><td><Pill status={p.status} /></td><td className="text-ink-2">{p.paid_at ? date(p.paid_at) : '—'}</td></tr>
              ))}</tbody></table>
            )}
          </Section>
          <Section title="Buyer documents">
            <ul className="mb-3 divide-y divide-line">{(docs || []).map((d) => <li key={d.id} className="py-2 text-[13.5px]">{d.title} <span className="text-[12px] text-ink-3">· {date(d.created_at)}</span></li>)}</ul>
            <ActionForm action={uploadDocument} className="flex flex-wrap items-end gap-2">
              <input type="hidden" name="booking_id" value={b.id} /><input type="hidden" name="category" value="agreement" />
              <div><label className="label" htmlFor="dt">Title</label><input id="dt" name="title" className="input" placeholder="Agreement for sale" /></div>
              <label className="btn btn-outline cursor-pointer"><FileUp className="size-4" />Choose file<input type="file" name="file" accept="application/pdf,image/*" className="sr-only" required /></label>
              <SubmitButton pendingText="Uploading…">Share with buyer</SubmitButton>
            </ActionForm>
          </Section>
          {(mods || []).length > 0 && (
            <Section title="Modification requests" action={<Link href="/console/modifications" className="btn btn-ghost btn-sm">Manage</Link>}>
              <ul className="grid gap-2">{mods!.map((m) => <li key={m.id} className="flex items-center justify-between gap-2 text-[13.5px]"><span>MOD-{m.seq}: {m.requirement}</span><Pill status={m.status} /></li>)}</ul>
            </Section>
          )}
        </div>
      </div>
    </>
  );
}
