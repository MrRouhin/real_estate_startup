// Price outlook as a range with stated assumptions, plus a property checklist.
// Deliberately no single "will be worth" number and no buy/don't-buy verdict:
// RERA advertising rules forbid promising returns, and honest ranges are more useful anyway.

export type Factor = { label: string; kind: string; status: string; impact_pct: number | string; expected_year: number | null; source: string | null };
export type HistoryPoint = { changed_at: string; price: number | string };

export type Outlook = {
  history: { cagr: number | null; from: string | null; to: string | null; points: number };
  /** effective yearly rates over the longest horizon, for each scenario */
  baseRate: number; lowRate: number; highRate: number;
  rows: { years: number; low: number; base: number; high: number }[];
  curve: { t: number; low: number; base: number; high: number }[];
  factors: { label: string; status: string; weight: number; contribution: number; years: number; expected_year: number | null; source: string | null }[];
  assumptions: string[];
};

const WEIGHT: Record<string, number> = { existing: 0, under_construction: 0.6, planned: 0.3 };

/**
 * Scenario range for a plot's value. Core growth blends the project's own price-list growth
 * (damped: early-phase increases rarely last) with the long-run trend for the area. Each
 * infrastructure project adds its uplift only until about two years after it is due, then it
 * is "priced in" — it is a step up, not growth forever.
 */
export function priceOutlook(price: number, history: HistoryPoint[], factors: Factor[], years = [1, 3, 5], now = new Date()): Outlook {
  const pts = history.map((h) => ({ t: new Date(h.changed_at).getTime(), p: Number(h.price) })).sort((a, b) => a.t - b.t);
  let cagr: number | null = null;
  if (pts.length >= 2) {
    const yrs = (pts.at(-1)!.t - pts[0]!.t) / (365.25 * 86400000);
    if (yrs >= 0.4 && pts[0]!.p > 0) cagr = Math.pow(pts.at(-1)!.p / pts[0]!.p, 1 / yrs) - 1;
  }
  const trend = Number(factors.find((f) => f.kind === 'trend')?.impact_pct ?? 6) / 100;
  const own = cagr == null ? trend : Math.min(cagr, 0.12);
  const core = Math.max(0.02, Math.min(0.11, 0.35 * own + 0.65 * trend));
  const thisYear = now.getFullYear();
  const infra = factors.filter((f) => f.kind === 'infrastructure').map((f) => {
    const w = WEIGHT[f.status] ?? 0;
    const horizon = f.expected_year ? Math.max(1, f.expected_year - thisYear + 2) : 3;
    return { label: f.label, status: f.status, weight: w, contribution: (Number(f.impact_pct) / 100) * w, years: horizon, expected_year: f.expected_year, source: f.source };
  });
  const lowCore = Math.max(-0.02, core - 0.045), highCore = core + 0.03;
  const valueAt = (t: number, c: number) => price * Math.pow(1 + c, t) * infra.reduce((m, f) => m * Math.pow(1 + f.contribution, Math.min(t, f.years)), 1);
  const round = (v: number) => Math.round(v / 10000) * 10000;
  const maxY = Math.max(...years);
  const eff = (c: number) => Math.round((Math.pow(valueAt(maxY, c) / price, 1 / maxY) - 1) * 1000) / 10;
  const curve = Array.from({ length: maxY * 4 + 1 }, (_, i) => i / 4).map((t) => ({ t, low: valueAt(t, lowCore), base: valueAt(t, core), high: valueAt(t, highCore) }));
  const infraNow = infra.filter((f) => f.contribution > 0);
  return {
    history: { cagr: cagr == null ? null : Math.round(cagr * 1000) / 10, from: pts[0] ? new Date(pts[0].t).toISOString() : null, to: pts.at(-1) ? new Date(pts.at(-1)!.t).toISOString() : null, points: pts.length },
    baseRate: eff(core), lowRate: eff(lowCore), highRate: eff(highCore),
    rows: years.map((y) => ({ years: y, low: round(valueAt(y, lowCore)), base: round(valueAt(y, core)), high: round(valueAt(y, highCore)) })),
    curve, factors: infra,
    assumptions: [
      cagr != null ? `This project's own price list has risen about ${(cagr * 100).toFixed(1)}% a year since launch. Early-phase increases rarely last, so it gets 35% weight (capped at 12%).` : 'No price history yet, so the long-run trend is used.',
      `Long-run trend for plotted land in the area: ${(trend * 100).toFixed(1)}% a year (65% weight). Core growth: ${(core * 100).toFixed(1)}% a year.`,
      infraNow.length ? `Infrastructure adds a one-time step-up spread over a few years: ${infraNow.map((f) => `${f.label} +${(f.contribution * 100).toFixed(1)}%/yr for ${f.years} yr`).join('; ')}. Projects under construction count at 60% of their expected effect, planned ones at 30%; existing ones are already in today's price.` : '',
      `Cautious and strong cases move core growth by −4.5 and +3 points. Over ${maxY} years that works out to ${eff(lowCore)}%, ${eff(core)}% and ${eff(highCore)}% a year.`,
      'Resale also depends on demand at the time, the condition of the layout, and costs of selling (brokerage, stamp duty for the next buyer).',
    ].filter(Boolean),
  };
}

export type CheckItem = { id: string; label: string; ok: boolean | null; detail: string };

export function propertyChecklist(input: {
  rera: string | null; approvals: number; legal: number; health: { planned?: number; actual?: number; state?: string; forecast?: string | null } | null;
  soldShare: number; completedProjects: number; verifiedDeveloper: boolean; plotRate: number; avgRate: number;
}): CheckItem[] {
  const reraOk = !!input.rera && !/applied|pending/i.test(input.rera);
  const h = input.health;
  const onSchedule = h?.state ? ['on_track', 'ahead', 'done'].includes(h.state) : null;
  return [
    { id: 'rera', label: 'RERA registered', ok: reraOk, detail: reraOk ? `Registration ${input.rera}. Check it on the Karnataka RERA website.` : 'Not registered yet. Do not pay more than a refundable token until it is.' },
    { id: 'approvals', label: 'Layout approval and land conversion on file', ok: input.approvals > 0, detail: input.approvals > 0 ? `${input.approvals} approval document${input.approvals > 1 ? 's' : ''} in the Documents section.` : 'Ask for the approved layout plan and conversion order.' },
    { id: 'title', label: 'Title documents shared', ok: input.legal > 0, detail: input.legal > 0 ? 'Title deed and encumbrance certificate are available. Have a lawyer check them.' : 'Ask for the title deed and encumbrance certificate.' },
    { id: 'schedule', label: 'Construction on schedule', ok: onSchedule, detail: h && h.actual != null && h.planned != null
      ? `${Math.round(h.actual)}% done vs ${Math.round(h.planned)}% planned by today${h.forecast ? `; development forecast to finish around ${new Date(h.forecast).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}` : ''}.`
      : 'No schedule data yet.' },
    { id: 'developer', label: 'Developer track record', ok: input.verifiedDeveloper ? (input.completedProjects > 0 ? true : null) : false, detail: input.verifiedDeveloper
      ? input.completedProjects > 0 ? `${input.completedProjects} completed project${input.completedProjects > 1 ? 's' : ''} on REMMO.` : 'Verified developer; no completed projects on REMMO yet. Visit their earlier sites.'
      : 'Developer not verified yet.' },
    { id: 'demand', label: 'Demand in the project (resale ease)', ok: input.soldShare >= 0.3 ? true : input.soldShare >= 0.15 ? null : false, detail: `${Math.round(input.soldShare * 100)}% of plots already booked or sold.` },
    { id: 'value', label: 'Price vs the rest of the project', ok: input.plotRate <= input.avgRate * 1.05 ? true : null, detail: `₹${input.plotRate.toLocaleString('en-IN')}/sq ft vs project average ₹${Math.round(input.avgRate).toLocaleString('en-IN')}/sq ft${input.plotRate > input.avgRate * 1.05 ? ' (premium for location or corner)' : ''}.` },
  ];
}
