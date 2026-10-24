'use client';
import { useState } from 'react';
import { ExternalLink } from 'lucide-react';
import { KARNATAKA, loanPlan, ownershipCost } from '@/lib/ai/cost';
import { inr, lakh } from '@/lib/format';

/** True cost of owning the plot (stamp duty, registration…) and a loan EMI planner. */
export function CostPlanner({ price }: { price: number }) {
  const [loanPct, setLoanPct] = useState(75);
  const [rate, setRate] = useState(8.75);
  const [years, setYears] = useState(15);
  const c = ownershipCost(price);
  const l = loanPlan(price, loanPct, rate, years);
  const upfront = l.ownMoney + c.extras;
  const Row = ({ k, v, sub, strong }: { k: string; v: string; sub?: string; strong?: boolean }) => (
    <li className={'flex items-baseline justify-between gap-3 py-1.5 ' + (strong ? 'font-semibold' : '')}><span className={strong ? '' : 'text-ink-2'}>{k}{sub && <span className="block text-[11.5px] font-normal text-ink-3">{sub}</span>}</span><span className="num">{v}</span></li>
  );
  return (
    <div className="grid gap-5 md:grid-cols-2">
      <div>
        <h3 className="mb-1 text-[14px] font-semibold">What you actually pay</h3>
        <ul className="divide-y divide-line text-[13.5px]">
          <Row k="Plot price" v={inr(price)} />
          <Row k={`Stamp duty (${c.stampPct}%)`} v={inr(c.stamp)} sub="standard Karnataka rate; lower slabs may apply under ₹45 L" />
          <Row k="Surcharge and cess" v={inr(c.cess)} sub={`cess + surcharge ≈ ${KARNATAKA.surchargeCessPctOfStamp}% of stamp duty`} />
          <Row k={`Registration (${KARNATAKA.registrationPct}%)`} v={inr(c.registration)} />
          <Row k="Legal check, khata, misc." v={inr(c.misc)} sub="typical, varies" />
          <Row k="Total cost of ownership" v={inr(c.total)} sub={`${c.extrasPct}% over the plot price`} strong />
        </ul>
        <a href="https://kaveri.karnataka.gov.in" target="_blank" rel="noopener" className="mt-2 inline-flex items-center gap-1 text-[12px] font-semibold text-accent">Confirm on Kaveri Online (Govt. of Karnataka)<ExternalLink className="size-3" /></a>
      </div>
      <div className="grid content-start gap-3">
        <h3 className="text-[14px] font-semibold">Loan and EMI</h3>
        {([['Loan amount', loanPct, setLoanPct, 0, 90, 5, `${loanPct}% · ${lakh(l.loan)}`], ['Interest rate', rate, setRate, 7, 12, 0.05, `${rate.toFixed(2)}%`], ['Tenure', years, setYears, 5, 25, 1, `${years} years`]] as const).map(([label, v, set, min, max, step, shown]) => (
          <label key={label} className="grid gap-1 text-[13px]"><span className="flex justify-between"><span className="text-ink-2">{label}</span><b className="num">{shown}</b></span>
            <input type="range" min={min} max={max} step={step} value={v} onChange={(e) => (set as (n: number) => void)(Number(e.target.value))} className="w-full accent-[var(--accent)]" /></label>
        ))}
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-2xl bg-accent-soft p-3 text-accent"><div className="text-[12px]">Monthly EMI</div><div className="num text-[22px] font-bold">{inr(l.emi)}</div></div>
          <div className="rounded-2xl bg-surface-2 p-3"><div className="text-[12px] text-ink-2">Cash you need upfront</div><div className="num text-[22px] font-bold">{lakh(upfront)}</div></div>
        </div>
        <p className="text-[12px] text-ink-3">Total interest over {years} years: <b className="num text-ink-2">{lakh(l.interest)}</b>. Banks usually lend up to 75–80% of the registered value for plots, and many lend on plots only with a construction plan. Rates are illustrative; check with your bank.</p>
      </div>
    </div>
  );
}
