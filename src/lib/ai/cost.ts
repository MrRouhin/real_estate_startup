// True cost of owning a plot in Karnataka, and loan EMI. Rates are estimates: they change,
// so the page links buyers to the official Kaveri calculator to confirm before registration.
// Standard rates as published in 2025–26: stamp duty 5%, registration 2% (raised from 1% on
// 31 Aug 2025), cess 10% of stamp duty and surcharge 2–3% of stamp duty. Some sources list
// lower stamp-duty slabs for properties under ₹45 L; we use the standard 5% so the estimate
// errs on the high side.

export const KARNATAKA = {
  stampSlabs: [{ upTo: Infinity, pct: 5 }],
  surchargeCessPctOfStamp: 13, // cess 10% + surcharge 3% (rural) of the stamp duty
  registrationPct: 2,
  legalAndMisc: 25000,
};

export function stampDutyPct(price: number) {
  return KARNATAKA.stampSlabs.find((s) => price <= s.upTo)!.pct;
}

export function ownershipCost(price: number) {
  const stampPct = stampDutyPct(price);
  const stamp = Math.round((price * stampPct) / 100);
  const cess = Math.round((stamp * KARNATAKA.surchargeCessPctOfStamp) / 100);
  const registration = Math.round((price * KARNATAKA.registrationPct) / 100);
  const misc = KARNATAKA.legalAndMisc;
  const extras = stamp + cess + registration + misc;
  return { stampPct, stamp, cess, registration, misc, extras, total: price + extras, extrasPct: Math.round((extras / price) * 1000) / 10 };
}

export function emi(principal: number, annualRatePct: number, years: number) {
  const r = annualRatePct / 1200, n = Math.round(years * 12);
  if (principal <= 0 || n <= 0) return 0;
  if (r === 0) return Math.round(principal / n);
  return Math.round((principal * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1));
}

export function loanPlan(price: number, loanPct: number, ratePct: number, years: number) {
  const loan = Math.round((price * loanPct) / 100);
  const m = emi(loan, ratePct, years);
  const totalPaid = m * years * 12;
  return { loan, ownMoney: price - loan, emi: m, interest: Math.max(0, totalPaid - loan), totalPaid };
}
