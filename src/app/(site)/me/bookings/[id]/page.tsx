import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, Check, FileText, PartyPopper, Wrench } from 'lucide-react';
import { requireUser } from '@/lib/auth';
import { loadSite } from '@/lib/queries';
import { asLayout } from '@/lib/site';
import { date, inr, lakh } from '@/lib/format';
import { SiteView } from '@/components/three/site-view';
import { Empty, Pill } from '@/components/ui/bits';
import { ProgressRing } from '@/components/ui/motion';
import { ActionForm, SubmitButton } from '@/components/ui/action-form';
import { LiveRefresh } from '@/components/live-refresh';
import { requestModification, respondToQuote } from '@/app/actions';
import { PayInstallment } from './pay-installment';

export default async function BookingPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ paid?: string }> }) {
  const { id } = await params;
  const { paid } = await searchParams;
  const { supabase, user, profile } = await requireUser(`/me/bookings/${id}`);
  const { data: b } = await supabase.from('bookings').select('*').eq('id', id).maybeSingle();
  if (!b || (b.buyer_id !== user.id && profile.role === 'buyer')) notFound();
  const { data: plot } = await supabase.from('plots').select('*').eq('id', b.plot_id).single();
  const [{ data: project }, { data: sched }, { data: pays }, { data: docs }, { data: mods }, site] = await Promise.all([
    supabase.from('projects').select('*').eq('id', plot!.project_id).single(),
    supabase.from('payment_schedule').select('*').eq('booking_id', id).order('sort_order'),
    supabase.from('payments').select('*').eq('booking_id', id).eq('status', 'paid').order('paid_at'),
    supabase.from('documents').select('*').or(`booking_id.eq.${id},and(visibility.eq.public,project_id.eq.${plot!.project_id})`).order('created_at'),
    supabase.from('modification_requests').select('*').eq('booking_id', id).order('created_at', { ascending: false }),
    loadSite(supabase, plot!.project_id),
  ]);
  const docsSigned = await Promise.all((docs || []).map(async (d) => ({ ...d, url: (await supabase.storage.from('documents').createSignedUrl(d.storage_path, 600)).data?.signedUrl })));
  const paidTotal = (pays || []).reduce((a, p) => a + Number(p.amount), 0);
  const total = Number(b.total_amount);
  const next = (sched || []).find((s) => s.status !== 'paid');
  const agreementPaid = (sched || [])[1]?.status === 'paid';
  const steps: [string, boolean][] = [
    ['Booked', true], ['Agreement for sale', agreementPaid], ['Sale deed registered', ['registered', 'handed_over'].includes(b.status)], ['Handed over', b.status === 'handed_over'],
  ];
  const nowIdx = steps.findIndex(([, d]) => !d);

  return (
    <div className="grid gap-6">
      <LiveRefresh tables={['payments', 'modification_requests']} filter={`booking_id=eq.${id}`} />
      <LiveRefresh tables={['bookings']} filter={`id=eq.${id}`} />
      <Link href="/me" className="inline-flex w-fit items-center gap-1 text-[13px] text-ink-2 hover:text-ink"><ArrowLeft className="size-4" />My property</Link>
      {paid && b.status === 'confirmed' && (
        <div className="card flex items-center gap-4 border-good/40 bg-[color-mix(in_srgb,var(--good)_8%,var(--surface))] p-5 [animation:var(--animate-rise)]">
          <span className="grid size-12 shrink-0 place-items-center rounded-full bg-good text-white"><PartyPopper className="size-6" /></span>
          <div><div className="text-[18px] font-bold">Plot {plot!.plot_number} is yours</div><div className="text-[13.5px] text-ink-2">Payment received. The plot is now marked booked on everyone’s map and your receipt is in Documents.</div></div>
        </div>
      )}
      {b.status === 'refund_due' && <div className="card border-bad/40 p-4 text-[14px] text-bad">Your payment arrived after the hold ended and another buyer booked this plot. The developer will refund it in full.</div>}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className="grid content-start gap-4">
          <div className="flex items-start justify-between gap-3">
            <div><div className="eyebrow">{project!.name} · booking BK-{b.id.slice(0, 8).toUpperCase()}</div><h1 className="font-display text-[34px] font-bold leading-tight">Plot {plot!.plot_number}</h1></div>
            <Pill status={b.status} />
          </div>
          <div className="card grid grid-cols-[auto_1fr] items-center gap-5 p-5">
            <ProgressRing value={(paidTotal / total) * 100} size={88} stroke={8} color="var(--good)" />
            <dl className="grid grid-cols-3 gap-3 text-[13px]">
              <div><dt className="text-ink-3">Price</dt><dd className="num text-[16px] font-semibold">{lakh(total)}</dd></div>
              <div><dt className="text-ink-3">Paid</dt><dd className="num text-[16px] font-semibold text-good">{lakh(paidTotal)}</dd></div>
              <div><dt className="text-ink-3">Balance</dt><dd className="num text-[16px] font-semibold">{lakh(total - paidTotal)}</dd></div>
            </dl>
          </div>
          <section className="card p-5">
            <h2 className="mb-2 font-semibold">Payment schedule</h2>
            <ol className="divide-y divide-line">
              {(sched || []).map((s) => (
                <li key={s.id} className="flex items-center justify-between gap-3 py-2.5">
                  <div><div className="text-[14px] font-medium">{s.label}</div><div className="text-[12px] text-ink-3">{s.due_note}{s.due_date ? ` · due ${date(s.due_date)}` : ''}</div></div>
                  <div className="text-right"><div className="num font-medium">{inr(s.amount)}</div>{s.status === 'paid' ? <span className="text-[12px] font-semibold text-good">Paid</span> : <span className="text-[12px] text-ink-3">Due</span>}</div>
                </li>
              ))}
            </ol>
            {next && b.status === 'confirmed' && b.buyer_id === user.id && (
              <PayInstallment bookingId={b.id} installmentId={next.id} label={next.label} amount={Number(next.amount)} plotNumber={plot!.plot_number}
                buyer={{ name: profile.full_name || '', phone: profile.phone || '', email: profile.email || '' }} />
            )}
          </section>
        </div>
        <div className="grid content-start gap-4">
          <div className="overflow-hidden rounded-[22px] border border-line">
            <SiteView plots={site.plots} layout={asLayout(project!.layout)} progress={site.progress} selectedId={plot!.id} height={340} zoom="close" />
          </div>
          <section className="card p-5">
            <h2 className="mb-3 font-semibold">Where things stand</h2>
            <ol className="grid">
              {steps.map(([label, done], k) => (
                <li key={label} className="relative grid grid-cols-[26px_1fr] gap-3 pb-4 last:pb-0">
                  {k < steps.length - 1 && <span className="absolute left-[12px] top-6 h-[calc(100%-18px)] w-0.5 bg-line" />}
                  <span className={'grid size-[26px] place-items-center rounded-full border-2 ' + (done ? 'border-accent bg-accent text-accent-ink' : k === nowIdx ? 'border-accent bg-surface' : 'border-line bg-surface')}>{done && <Check className="size-3.5" />}</span>
                  <div><div className="text-[14px] font-medium">{label}</div><div className="text-[12px] text-ink-3">{done ? 'Done' : k === nowIdx ? 'Next step' : 'Later'}</div></div>
                </li>
              ))}
            </ol>
          </section>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="card p-5">
          <h2 className="mb-2 flex items-center gap-2 font-semibold"><FileText className="size-5 text-accent" />Documents</h2>
          <ul className="divide-y divide-line">
            {docsSigned.map((d) => (
              <li key={d.id} className="flex items-center justify-between gap-3 py-2.5">
                <div><div className="text-[14px] font-medium">{d.title}</div><div className="text-[12px] text-ink-3">{d.visibility === 'buyer' ? 'Only you can see this' : 'Project document'}</div></div>
                {d.url ? <a className="btn btn-ghost btn-sm" href={d.url} target="_blank" rel="noreferrer">Open</a> : <span className="text-[12px] text-ink-3">—</span>}
              </li>
            ))}
          </ul>
        </section>
        <section className="card p-5">
          <h2 className="mb-2 flex items-center gap-2 font-semibold"><Wrench className="size-5 text-accent" />Changes to your plot</h2>
          {(mods || []).length === 0 ? <p className="mb-3 text-[13.5px] text-ink-2">Want a gate, a wall or another change? Ask here and the developer will send a quote.</p> : (
            <ul className="mb-4 grid gap-3">
              {mods!.map((m) => (
                <li key={m.id} className="rounded-2xl border border-line p-3">
                  <div className="flex items-center justify-between gap-2"><span className="num text-[12px] text-ink-3">MOD-{m.seq}</span><Pill status={m.status} /></div>
                  <div className="mt-1 text-[14px]">{m.requirement}</div>
                  {m.quoted_cost != null && <div className="mt-1 text-[13px] text-ink-2">Quote <b className="num text-ink">{inr(m.quoted_cost)}</b>{m.deadline ? ` · ready by ${date(m.deadline)}` : ''}</div>}
                  {m.status === 'quoted' && b.buyer_id === user.id && (
                    <div className="mt-2 flex gap-2">
                      <ActionForm action={respondToQuote} reset={false}><input type="hidden" name="id" value={m.id} /><input type="hidden" name="approve" value="yes" /><SubmitButton className="btn btn-primary btn-sm">Approve quote</SubmitButton></ActionForm>
                      <ActionForm action={respondToQuote} reset={false}><input type="hidden" name="id" value={m.id} /><input type="hidden" name="approve" value="no" /><SubmitButton className="btn btn-ghost btn-sm">Decline</SubmitButton></ActionForm>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
          {b.buyer_id === user.id && ['confirmed', 'registered', 'handed_over'].includes(b.status) ? (
            <ActionForm action={requestModification} className="grid gap-2">
              <input type="hidden" name="bookingId" value={b.id} />
              <label className="label" htmlFor="req">Request a change</label>
              <textarea id="req" name="requirement" className="input" rows={2} placeholder="e.g. Add a 12 ft sliding gate on the road side" required minLength={5} />
              <SubmitButton className="btn btn-outline w-fit" pendingText="Sending…">Send request</SubmitButton>
            </ActionForm>
          ) : (mods || []).length === 0 && <Empty title="Available after booking" />}
        </section>
      </div>
    </div>
  );
}
