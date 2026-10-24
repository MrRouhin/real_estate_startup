// "Ask your site": answer staff questions from a compact snapshot of the analysis.
// With an AI key the model answers from the snapshot only; without it a keyword router
// picks the right numbers.
import 'server-only';
import type { Analysis } from './analysis';
import { aiText, type AIResult } from './client';
import { STATE_LABEL } from './plan';

const d = (s: string | null | undefined) => (s ? new Date(s).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—');
const L = (n: number) => `₹${(n / 1e5).toFixed(1)} L`;

export function snapshot(a: Analysis) {
  const cname = (id: string) => a.contractors.find((c) => c.id === id)?.company_name || '';
  return {
    today: a.today, project: a.project.name,
    overall: { planned_pct: a.projectRoll.planned, actual_pct: a.projectRoll.actual, state: STATE_LABEL[a.projectRoll.state], forecast_finish: a.projectRoll.forecast },
    work_packages: a.health.map((w) => ({ title: w.title, contractor: cname(w.contractorId), planned: w.planned, actual: w.actual, state: STATE_LABEL[w.state], due: w.due, forecast: w.forecast, points_per_week: Math.round(w.velocity * 70) / 10, value: w.value })),
    contractors: a.byContractor.map((c) => ({ name: c.contractor.company_name, trade: c.contractor.trade, planned: c.roll.planned, actual: c.roll.actual, state: STATE_LABEL[c.roll.state] })),
    material_vs_plan: a.matVsPlan.map((m) => ({ contractor: cname(m.contractorId), material: m.name, used: m.used, expected: m.expected, unit: m.unit, overrun_pct: m.overrunPct })),
    stock: a.stockF.map((s) => ({ material: s.name, in_store: s.inStore, unit: s.unit, per_day: s.dailyUse, days_left: s.daysLeft, status: s.status, suggested_order: s.orderQty, vendor: s.vendor?.name ?? null })),
    crew_last_7_days: a.crew.map((c) => ({ contractor: cname(c.contractorId), person_days: c.personDays7, progress_gain_points: c.gain7, wages: c.wages7 })),
    checkin_flags: a.flags.map((f) => f.title),
    deliveries_flagged: a.deliveryFlags.filter((x) => !x.check.ok).slice(0, 8).map((x) => ({ vendor: a.vendors.find((v) => v.id === x.delivery.vendor_id)?.company_name, material: a.materials.find((m) => m.id === x.delivery.material_id)?.name, status: x.delivery.status, flags: x.check.flags.map((f) => f.label) })),
    sales: { ...(a.stats || {}), overdue_instalments: a.overdue.count, overdue_amount: a.overdue.amount },
    leads: a.leadScores.filter((l) => l.s.band !== 'closed').sort((x, y) => y.s.score - x.s.score).slice(0, 12).map((l) => ({ name: l.lead.full_name, stage: l.lead.stage, score: l.s.score, band: l.s.band, next_action: l.s.action.label })),
    pricing_suggestions: a.pricing.map((p) => ({ plot: p.plotNumber, direction: p.direction, change_pct: p.changePct, reason: p.reason })),
  };
}

const SYSTEM = `You are the site and sales analyst inside a real estate developer's dashboard (India, plotted layout).
Answer the staff member's question using ONLY the JSON snapshot. Quote the numbers. If the snapshot does not have the answer, say what is missing.
Be brief: under 120 words, bullets ("• ") when listing. End with one concrete next step when useful.
Never invent people, amounts or dates.`;

export const ASK_LINKS: Record<string, { href: string; label: string }> = {
  site: { href: '/console/insights', label: 'AI insights' }, contractors: { href: '/console/contractors', label: 'Contractors' },
  stock: { href: '/console/materials', label: 'Materials' }, crew: { href: '/console/employees', label: 'Employees' },
  leads: { href: '/console/leads', label: 'Leads' }, plots: { href: '/console/plots', label: 'Plots' },
  vendors: { href: '/console/vendors', label: 'Vendors' }, bookings: { href: '/console/bookings', label: 'Bookings' },
};

function topicOf(q: string): (keyof typeof ASK_LINKS)[] {
  const s = q.toLowerCase(), t: (keyof typeof ASK_LINKS)[] = [];
  if (/behind|delay|late|schedule|plan|progress|finish|on track|contractor|road|drain|tank|club|park|light|wall/.test(s)) t.push('site');
  if (/material|stock|cement|steel|tmt|sand|aggregate|pipe|cable|order|reorder|run out|wastage|overrun/.test(s)) t.push('stock');
  if (/crew|worker|labou?r|attendance|check.?in|wage|employee|fake|proxy/.test(s)) t.push('crew');
  if (/lead|follow|call|hot|buyer|enquir|customer|visit/.test(s)) t.push('leads');
  if (/price|pricing|demand|plot|sell|sold|available|inventory/.test(s)) t.push('plots');
  if (/deliver|invoice|vendor|truck|bill|gst/.test(s)) t.push('vendors');
  if (/payment|collect|due|overdue|instal|money|cash|booking/.test(s)) t.push('bookings');
  return t.length ? t : ['site'];
}

export function answerRules(a: Analysis, q: string) {
  const topics = topicOf(q);
  const cname = (id: string) => a.contractors.find((c) => c.id === id)?.company_name || '';
  const out: string[] = [];
  for (const t of topics.slice(0, 2)) {
    if (t === 'site') {
      out.push(`Overall: ${Math.round(a.projectRoll.actual)}% done vs ${Math.round(a.projectRoll.planned)}% planned (${STATE_LABEL[a.projectRoll.state].toLowerCase()}).`);
      const bad = a.health.filter((w) => w.state === 'behind' || w.state === 'at_risk').sort((x, y) => x.variance - y.variance);
      for (const w of bad.slice(0, 4)) out.push(`• ${w.title} (${cname(w.contractorId)}): ${Math.round(w.actual)}% vs ${Math.round(w.planned)}%${w.forecast ? `, finishes ${d(w.forecast)} at this pace` : ''}.`);
      if (!bad.length) out.push('• Every work package is on or ahead of plan.');
    } else if (t === 'stock') {
      const low = a.stockF.filter((s) => s.status !== 'ok');
      out.push(low.length ? 'Materials to order:' : 'Stock is fine for the next 10 days.');
      for (const s of low.slice(0, 4)) out.push(`• ${s.name}: ${s.inStore} ${s.unit} left${s.daysLeft != null ? ` (~${s.daysLeft} days)` : ''}; order ${s.orderQty}${s.vendor ? ` from ${s.vendor.name}` : ''}.`);
      for (const m of a.matVsPlan.filter((x) => x.overrunPct > 8).slice(0, 2)) out.push(`• ${cname(m.contractorId)} used ${m.overrunPct}% more ${m.name} than planned.`);
    } else if (t === 'crew') {
      for (const c of a.crew) out.push(`• ${cname(c.contractorId)}: ${c.personDays7} person-days, +${c.gain7} points this week.`);
      for (const f of a.flags.slice(0, 3)) out.push(`• ⚠ ${f.title}.`);
    } else if (t === 'leads') {
      const top = a.leadScores.filter((l) => l.s.band !== 'closed').sort((x, y) => y.s.score - x.s.score).slice(0, 5);
      out.push('Leads to act on first:');
      for (const l of top) out.push(`• ${l.lead.full_name} (${l.s.band}, ${l.s.score}): ${l.s.action.label}.`);
    } else if (t === 'plots') {
      if (a.stats) out.push(`${a.stats.available} available, ${a.stats.booked} booked, ${a.stats.sold} sold of ${a.stats.total_plots}.`);
      for (const p of a.pricing.slice(0, 3)) out.push(`• ${p.plotNumber}: ${p.direction === 'up' ? `demand supports +${p.changePct}%` : 'low interest; try an offer'}.`);
    } else if (t === 'vendors') {
      const f = a.deliveryFlags.filter((x) => !x.check.ok);
      out.push(f.length ? `${f.length} recent deliveries have flags:` : 'No delivery red flags.');
      for (const x of f.slice(0, 4)) out.push(`• ${a.vendors.find((v) => v.id === x.delivery.vendor_id)?.company_name}: ${x.check.flags.map((g) => g.label).join(', ')}.`);
    } else if (t === 'bookings') {
      out.push(a.overdue.count ? `${a.overdue.count} instalments overdue, ${L(a.overdue.amount)} in total.` : 'No overdue instalments.');
      if (a.stats) out.push(`Collected so far: ${L(Number(a.stats.amount_collected || 0))}.`);
    }
  }
  return { answer: out.join('\n'), links: topics.slice(0, 2).map((t) => ASK_LINKS[t]!) };
}

export async function askSite(a: Analysis, question: string, history: { role: 'user' | 'assistant'; content: string }[]): Promise<{ answer: string; links: { href: string; label: string }[]; source: 'ai' | 'rules'; result: AIResult | null }> {
  const rules = answerRules(a, question);
  const r = await aiText({ system: SYSTEM, maxTokens: 450, temperature: 0.1, messages: [{ role: 'user', content: 'Snapshot:\n' + JSON.stringify(snapshot(a)) }, { role: 'assistant', content: 'Got it. Ask me anything about the site.' }, ...history.slice(-6), { role: 'user', content: question }] });
  return r ? { answer: r.text, links: rules.links, source: 'ai', result: r } : { ...rules, source: 'rules', result: null };
}
