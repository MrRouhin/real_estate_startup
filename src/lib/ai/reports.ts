// Weekly contractor reports and the owner's daily briefing. The rules version is built from
// the numbers; with an AI key the model rewrites it in plain language — using only those numbers.
import 'server-only';
import type { Analysis } from './analysis';
import { aiText, type AIResult } from './client';
import { STATE_LABEL, type WPHealth } from './plan';

const L = (n: number) => `₹${(n / 1e5).toFixed(1)} L`;
const d = (s: string | null) => (s ? new Date(s).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—');
const pct = (n: number) => `${Math.round(n)}%`;
const pts = (n: number) => `${n} point${n === 1 ? '' : 's'}`;

export type ContractorFacts = ReturnType<typeof contractorFacts>;

export function contractorFacts(a: Analysis, contractorId: string) {
  const c = a.byContractor.find((x) => x.contractor.id === contractorId);
  if (!c) return null;
  const mats = a.matVsPlan.filter((m) => m.contractorId === contractorId);
  const crew = a.crew.find((x) => x.contractorId === contractorId) || null;
  const open = c.items.filter((w) => w.state !== 'done');
  return {
    contractorId, contractor: c.contractor.company_name, today: a.today, roll: c.roll,
    packages: c.items.map((w) => ({
      title: w.title, state: STATE_LABEL[w.state], planned: w.planned, actual: w.actual, variance: w.variance, due: w.due, forecast: w.forecast,
      daysLate: w.daysLate, pacePerWeek: Math.round(w.velocity * 70) / 10,
      qty: w.plannedQty ? `${w.doneQty?.toLocaleString('en-IN')} of ${w.plannedQty.toLocaleString('en-IN')} ${w.qtyUnit || ''}` : null,
      neededPerWeek: w.due && w.state !== 'done' ? neededPerWeek(w, a.today) : null,
    })),
    materials: mats.map((m) => ({ name: m.name, unit: m.unit, used: m.used, expected: m.expected, overrunPct: m.overrunPct, extraCost: m.extraCost })),
    crew: crew ? { personDays7: crew.personDays7, gain7: crew.gain7, gainPrev7: crew.gainPrev7, wages7: crew.wages7, earned7: crew.earned7 } : null,
    openCount: open.length,
  };
}

function neededPerWeek(w: WPHealth, today: string) {
  const days = (new Date(w.due!).getTime() - new Date(today).getTime()) / 86400000;
  if (days <= 0) return null;
  return Math.round(((100 - w.actual) / days) * 70) / 10;
}

/** Plain report from the numbers. Lines starting with "• " render as bullets; "## " as headings. */
export function contractorReportRules(f: NonNullable<ContractorFacts>) {
  const lines: string[] = [];
  const v = Math.round((f.roll.actual - f.roll.planned) * 10) / 10;
  lines.push(`${f.contractor} is ${pct(f.roll.actual)} done against ${pct(f.roll.planned)} planned by today (${v >= 0 ? '+' : ''}${v} points, value-weighted). Status: ${STATE_LABEL[f.roll.state].toLowerCase()}.`);
  const good = f.packages.filter((p) => p.state === 'Ahead of plan' || p.state === 'On track' || p.state === 'Done');
  const bad = f.packages.filter((p) => p.state === 'Behind plan' || p.state === 'At risk');
  if (good.length) { lines.push('', '## Going well'); for (const p of good) lines.push(`• ${p.title}: ${pct(p.actual)} vs ${pct(p.planned)} planned${p.qty ? ` (${p.qty})` : ''}.`); }
  if (bad.length) {
    lines.push('', '## Behind plan');
    for (const p of bad) lines.push(`• ${p.title}: ${pct(p.actual)} vs ${pct(p.planned)} planned. Moving ${pts(p.pacePerWeek)} a week${p.neededPerWeek ? `, needs ${pts(p.neededPerWeek)} a week to finish by ${d(p.due)}` : ''}. ${p.forecast ? `At this pace it finishes ${d(p.forecast)}${p.daysLate && p.daysLate > 0 ? ` (${p.daysLate} days late)` : ''}.` : 'No progress recently, so no finish date can be forecast.'}`);
  }
  const over = f.materials.filter((m) => m.overrunPct > 8);
  if (f.materials.length) {
    lines.push('', '## Materials');
    if (over.length) for (const m of over) lines.push(`• ${m.name}: used ${m.used} ${m.unit}, the plan expects ${m.expected} for the work done (${m.overrunPct > 0 ? '+' : ''}${m.overrunPct}%${m.extraCost ? `, ≈ ₹${m.extraCost.toLocaleString('en-IN')} extra` : ''}).`);
    else lines.push('• Material use is within plan.');
  }
  if (f.crew) {
    lines.push('', '## Crew');
    lines.push(`• ${f.crew.personDays7} person-days on site in 7 days (wages ≈ ₹${f.crew.wages7.toLocaleString('en-IN')}); weighted progress +${f.crew.gain7} points (previous week +${f.crew.gainPrev7}).`);
  }
  const asks: string[] = [];
  for (const p of bad.slice(0, 2)) asks.push(p.neededPerWeek ? `Share a recovery plan for ${p.title}: ${pts(p.neededPerWeek)} a week is needed.` : `Confirm a new finish date for ${p.title}.`);
  for (const m of over.slice(0, 1)) asks.push(`Explain the extra ${m.name} use and reduce wastage.`);
  if (f.crew && f.crew.personDays7 >= 12 && f.crew.gain7 < 1) asks.push('Crew is on site but progress has stalled: check for a blocker (materials, drawings, approvals).');
  if (asks.length) { lines.push('', '## This week'); for (const x of asks) lines.push(`• ${x}`); }
  return lines.join('\n');
}

const REPORT_SYSTEM = `You write the weekly progress report a real estate developer sends to a contractor at an Indian plotted-layout site.
Use ONLY the facts in the JSON. Never invent numbers, dates, names or reasons. Round sensibly.
Tone: direct, fair, specific; credit what is going well. Simple English (many readers use English as a second language).
Format exactly:
first line: a 1–2 sentence summary
then sections with "## " headings: "Going well", "Behind plan" (omit if nothing), "Materials" (omit if no data), "Crew" (omit if no data), "This week" (max 3 bullets of concrete asks).
Bullets start with "• ". Max 220 words.`;

export async function contractorReport(a: Analysis, contractorId: string, useAI: boolean): Promise<{ title: string; body: string; source: 'ai' | 'rules'; facts: ContractorFacts; result: AIResult | null } | null> {
  const f = contractorFacts(a, contractorId);
  if (!f) return null;
  const title = `Weekly report: ${f.contractor} — ${pct(f.roll.actual)} done vs ${pct(f.roll.planned)} planned`;
  const rules = contractorReportRules(f);
  if (!useAI) return { title, body: rules, source: 'rules', facts: f, result: null };
  const r = await aiText({ system: REPORT_SYSTEM, messages: [{ role: 'user', content: JSON.stringify(f) }], maxTokens: 700, temperature: 0.2 });
  return r ? { title, body: r.text, source: 'ai', facts: f, result: r } : { title, body: rules, source: 'rules', facts: f, result: null };
}

/** Facts for the owner's briefing: site, stock, sales, money. */
export function briefFacts(a: Analysis) {
  const behind = a.health.filter((w) => w.state === 'behind' || w.state === 'at_risk').sort((x, y) => x.variance - y.variance);
  const hot = a.leadScores.filter((l) => l.s.band === 'hot').sort((x, y) => y.s.score - x.s.score);
  const urgent = a.leadScores.filter((l) => l.s.action.urgency === 'now' && l.s.band !== 'closed');
  return {
    today: a.today, project: a.project.name,
    site: { planned: a.projectRoll.planned, actual: a.projectRoll.actual, state: STATE_LABEL[a.projectRoll.state], forecast: a.projectRoll.forecast, behind: behind.slice(0, 3).map((w) => ({ title: w.title, actual: w.actual, planned: w.planned, forecast: w.forecast, due: w.due })) },
    stock: a.stockF.filter((s) => s.status !== 'ok').slice(0, 4).map((s) => ({ name: s.name, status: s.status, daysLeft: s.daysLeft, orderQty: s.orderQty, unit: s.unit })),
    materialOverruns: a.matVsPlan.filter((m) => m.overrunPct > 8).slice(0, 3).map((m) => ({ name: m.name, contractor: a.contractors.find((c) => c.id === m.contractorId)?.company_name, overrunPct: m.overrunPct })),
    checkinFlags: a.flags.length,
    deliveriesFlagged: a.deliveryFlags.filter((x) => !x.check.ok && x.delivery.status === 'pending_inspection').length,
    sales: { available: a.stats?.available ?? null, booked: a.stats?.booked ?? null, sold: a.stats?.sold ?? null, hotLeads: hot.length, callNow: urgent.slice(0, 3).map((l) => l.lead.full_name) },
    pricing: a.pricing.filter((p) => p.direction === 'up').slice(0, 3).map((p) => ({ plot: p.plotNumber, changePct: p.changePct })),
    collections: { overdueCount: a.overdue.count, overdueAmount: a.overdue.amount },
  };
}

export function briefRules(f: ReturnType<typeof briefFacts>) {
  const lines: string[] = [];
  const v = Math.round((f.site.actual - f.site.planned) * 10) / 10;
  lines.push(`Site is ${pct(f.site.actual)} done vs ${pct(f.site.planned)} planned (${v >= 0 ? '+' : ''}${v} points)${f.site.forecast ? `; development forecast to finish ${d(f.site.forecast)}` : ''}.`);
  for (const w of f.site.behind) lines.push(`• ${w.title} is behind: ${pct(w.actual)} vs ${pct(w.planned)}${w.forecast ? `, finishing ${d(w.forecast)} at this pace` : ''}.`);
  for (const s of f.stock.slice(0, 2)) lines.push(`• ${s.name}: ${s.status === 'short' ? 'open requests exceed stock' : `${s.daysLeft ?? '?'} days left`}; order ${s.orderQty} ${s.unit}.`);
  for (const m of f.materialOverruns.slice(0, 1)) lines.push(`• ${m.contractor} is using ${m.overrunPct}% more ${m.name} than the plan expects.`);
  if (f.deliveriesFlagged) lines.push(`• ${f.deliveriesFlagged} deliver${f.deliveriesFlagged > 1 ? 'ies' : 'y'} waiting for inspection ${f.deliveriesFlagged > 1 ? 'have' : 'has'} red flags.`);
  if (f.checkinFlags) lines.push(`• ${f.checkinFlags} suspicious check-in pattern${f.checkinFlags > 1 ? 's' : ''} in attendance.`);
  if (f.sales.callNow.length) lines.push(`• Call now: ${f.sales.callNow.join(', ')}.`);
  if (f.pricing.length) lines.push(`• Demand is high on ${f.pricing.map((p) => p.plot).join(', ')}: a ${f.pricing[0]!.changePct}% price rise is suggested.`);
  if (f.collections.overdueCount) lines.push(`• ${f.collections.overdueCount} instalment${f.collections.overdueCount > 1 ? 's' : ''} overdue (${L(f.collections.overdueAmount)}).`);
  return lines.join('\n');
}

const BRIEF_SYSTEM = `You write a morning briefing for the owner of a real estate development company in India.
Use ONLY the JSON facts; never invent numbers or names. Lead with the single most important thing.
Format: one opening sentence, then at most 6 bullets starting with "• ", most urgent first, each with a concrete action. Max 130 words.`;

export async function projectBrief(a: Analysis, useAI: boolean) {
  const f = briefFacts(a);
  const rules = briefRules(f);
  if (!useAI) return { body: rules, source: 'rules' as const, result: null, facts: f };
  const r = await aiText({ system: BRIEF_SYSTEM, messages: [{ role: 'user', content: JSON.stringify(f) }], maxTokens: 450, temperature: 0.2 });
  return r ? { body: r.text, source: 'ai' as const, result: r, facts: f } : { body: rules, source: 'rules' as const, result: null, facts: f };
}
