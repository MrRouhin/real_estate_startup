import { CheckCircle2, Circle, FileText, ReceiptIndianRupee, XCircle } from 'lucide-react';
import { requirePartner } from '@/lib/auth';
import { date, inr, lakh, todayIST } from '@/lib/format';
import { Section, PageHeader } from '@/components/ui/bits';
import { ProgressBar } from '@/components/ui/motion';
import { ActionForm, SubmitButton } from '@/components/ui/action-form';
import { LiveRefresh } from '@/components/live-refresh';
import { raiseBill } from '../actions';
import { billNo } from '@/lib/numbering';

export const metadata = { title: 'Bills' };
const STEPS = ['submitted', 'verified', 'approved', 'paid'] as const;
const STEP_LABEL = { submitted: 'Submitted', verified: 'Measured and verified', approved: 'Approved for payment', paid: 'Paid' } as const;

export default async function ContractorBills() {
  const { supabase } = await requirePartner('contractor');
  const { data: cid } = await supabase.rpc('my_contractor_id');
  const [{ data: wps }, { data: bills }] = await Promise.all([
    supabase.from('work_packages').select('id, title, contract_value, progress, status').eq('contractor_id', cid!).order('title'),
    supabase.from('contractor_bills').select('*').eq('contractor_id', cid!).order('created_at', { ascending: false }),
  ]);
  const wpTitle = Object.fromEntries((wps || []).map((w) => [w.id, w.title]));
  const billedOn = (id: string) => (bills || []).filter((b) => b.work_package_id === id && b.status !== 'rejected').reduce((a, b) => a + Number(b.gross_amount), 0);
  const totals = {
    paid: (bills || []).filter((b) => b.status === 'paid').reduce((a, b) => a + Number(b.net_payable), 0),
    process: (bills || []).filter((b) => ['submitted', 'verified', 'approved'].includes(b.status)).reduce((a, b) => a + Number(b.net_payable), 0),
    retention: (bills || []).filter((b) => b.status !== 'rejected').reduce((a, b) => a + Number(b.gross_amount) * Number(b.retention_pct) / 100, 0),
  };
  return (
    <>
      <LiveRefresh tables={['contractor_bills', 'work_packages']} every={30000} />
      <PageHeader emoji="🧾" title="Running-account bills" sub={<>Bill the work you have done. The developer measures it, approves it and pays it; you see each step here as it happens.</>} />
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="card p-4"><div className="eyebrow">Paid to you</div><div className="num text-[24px] font-semibold">{inr(totals.paid)}</div></div>
        <div className="card p-4"><div className="eyebrow">In process</div><div className="num text-[24px] font-semibold">{inr(totals.process)}</div></div>
        <div className="card p-4"><div className="eyebrow">Retention held (5%)</div><div className="num text-[24px] font-semibold">{inr(totals.retention)}</div><div className="text-[12px] text-ink-3">Released after the defect liability period</div></div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_380px]">
        <Section title="Your bills">
          {(bills || []).length === 0 ? <p className="text-[13.5px] text-ink-2">No bills yet. Raise your first one from the form.</p> : (
            <ul className="grid gap-3">
              {bills!.map((b) => {
                const idx = STEPS.indexOf(b.status as (typeof STEPS)[number]);
                return (
                  <li key={b.id} className="rounded-2xl border border-line p-4">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div><div className="flex items-center gap-2"><ReceiptIndianRupee className="size-4 text-accent" /><b className="num">{billNo(b.seq, b.created_at)}</b>{b.invoice_number && <span className="num text-[12px] text-ink-3">your ref {b.invoice_number}</span>}</div>
                        <div className="text-[12.5px] text-ink-2">{b.work_package_id ? wpTitle[b.work_package_id] : ''}{b.period_from ? ` · ${date(b.period_from)} – ${date(b.period_to)}` : ''}</div></div>
                      <div className="text-right"><div className="num text-[18px] font-semibold">{inr(b.net_payable)}</div><div className="num text-[11.5px] text-ink-3">gross {inr(b.gross_amount)} + GST {Number(b.gst_pct)}% − retention {Number(b.retention_pct)}% − TDS {Number(b.tds_pct)}%</div></div>
                    </div>
                    {b.note && <p className="mt-1 text-[13px] text-ink-2">{b.note}</p>}
                    {b.status === 'rejected' ? (
                      <div className="mt-2 flex items-start gap-2 rounded-xl bg-[color-mix(in_srgb,var(--bad)_8%,transparent)] px-3 py-2 text-[13px] text-bad"><XCircle className="mt-0.5 size-4 shrink-0" />Returned {date(b.decided_at)}{b.decision_note ? `: ${b.decision_note}` : ''}</div>
                    ) : (
                      <ol className="mt-3 grid grid-cols-4 gap-1">
                        {STEPS.map((s, i) => (
                          <li key={s} className="grid gap-1">
                            <div className={'h-1.5 rounded-full ' + (i <= idx ? 'bg-good' : 'bg-surface-2')} />
                            <div className={'flex items-center gap-1 text-[11px] ' + (i <= idx ? 'font-semibold text-ink' : 'text-ink-3')}>{i <= idx ? <CheckCircle2 className="size-3 shrink-0 text-good" /> : <Circle className="size-3 shrink-0" />}<span className="truncate">{STEP_LABEL[s]}</span></div>
                          </li>
                        ))}
                      </ol>
                    )}
                    <div className="mt-2 text-[12px] text-ink-3">Raised {date(b.created_at)}{b.decision_note && b.status !== 'rejected' ? ` · developer: “${b.decision_note}”` : ''}{b.paid_at ? ` · paid ${date(b.paid_at)}, ref ${b.payment_ref}` : ''}</div>
                  </li>
                );
              })}
            </ul>
          )}
        </Section>
        <div className="grid content-start gap-5">
          <Section title="Raise a bill">
            <div id="new" className="scroll-mt-24" />
            <ActionForm action={raiseBill} className="grid gap-3">
              <div><label className="label" htmlFor="bw">Work package</label><select id="bw" name="work_package_id" className="input" required>{(wps || []).map((w) => <option key={w.id} value={w.id}>{w.title}</option>)}</select></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="label" htmlFor="bf">From</label><input id="bf" type="date" name="period_from" className="input" /></div>
                <div><label className="label" htmlFor="bt">To</label><input id="bt" type="date" name="period_to" className="input" max={todayIST()} defaultValue={todayIST()} /></div>
              </div>
              <div className="grid grid-cols-[1fr_96px] gap-3">
                <div><label className="label" htmlFor="ba">Amount before tax (₹)</label><input id="ba" name="gross_amount" className="input num" inputMode="numeric" required placeholder="7,15,000" /></div>
                <div><label className="label" htmlFor="bg">GST %</label><select id="bg" name="gst_pct" className="input" defaultValue="18"><option value="18">18</option><option value="12">12</option><option value="5">5</option><option value="0">0</option></select></div>
              </div>
              <div><label className="label" htmlFor="bi">Your invoice number</label><input id="bi" name="invoice_number" className="input num" placeholder="ABC/RA/04" /></div>
              <div><label className="label" htmlFor="bn">Work covered</label><textarea id="bn" name="note" className="input min-h-[70px]" placeholder="Slabs 7 to 11 incl. shuttering and reinforcement" /></div>
              <SubmitButton className="btn btn-primary" pendingText="Sending…"><FileText className="size-4" />Send bill</SubmitButton>
              <p className="text-[12px] text-ink-3">5% retention and 1% TDS are deducted as per your contract. A bill can’t take your total past the verified progress.</p>
            </ActionForm>
          </Section>
          <Section title="Billing room by work">
            <ul className="grid gap-3 text-[13px]">
              {(wps || []).map((w) => { const earned = Number(w.contract_value || 0) * Number(w.progress) / 100, billed = billedOn(w.id); return (
                <li key={w.id} className="grid gap-1">
                  <div className="flex justify-between gap-2"><span className="font-medium">{w.title}</span><span className="num text-ink-2">{Math.round(Number(w.progress))}% done</span></div>
                  <ProgressBar value={earned ? Math.min(100, (billed / earned) * 100) : 0} className="h-1.5" />
                  <div className="num text-[11.5px] text-ink-3">billed {lakh(billed)} of {lakh(earned)} earned · room {lakh(Math.max(0, earned - billed))}</div>
                </li>
              ); })}
            </ul>
          </Section>
        </div>
      </div>
    </>
  );
}
