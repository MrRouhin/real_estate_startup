// The analysis run: computes everything, writes insights (alerts, reports, suggestions) and the
// public project health. Re-running replaces the open insights; applied and dismissed ones stay
// as history, and anything dismissed in the last 7 days is not raised again.
import 'server-only';
import type { Json } from '@/lib/database.types';
import { loadAnalysis, type Analysis, type DB, type ProjectLite } from './analysis';
import { aiEnabled } from './client';
import { orderMessage } from './materials';
import { STATE_LABEL } from './plan';
import type { ProjectSummary } from './nearby';
import { contractorReport, projectBrief } from './reports';

export type InsightDraft = {
  scope: 'project' | 'contractor' | 'work_package' | 'material' | 'crew' | 'vendor' | 'lead' | 'plot';
  subject_id: string | null; kind: string; severity: 'good' | 'info' | 'warn' | 'critical'; title: string; body: string;
  data?: Record<string, unknown>; suggestion?: Suggestion | null; source?: 'rules' | 'ai';
};

export type Suggestion =
  | { action: 'create_baseline'; work_package_id: string; label: string }
  | { action: 'mark_delayed'; work_package_id: string; label: string; expected?: string | null }
  | { action: 'set_price'; plot_id: string; price: number; label: string }
  | { action: 'reorder'; material_id: string; qty: number; unit: string; vendor_id: string | null; phone: string | null; message: string; label: string }
  | { action: 'share_report'; contractor_id: string; label: string }
  | { action: 'set_follow_up'; lead_id: string; note: string; label: string }
  | { action: 'review'; href: string; label: string };

const d = (s: string | null | undefined) => (s ? new Date(s).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—');

export const RUN_KINDS = ['project_brief', 'weekly_report', 'wp_behind', 'no_baseline', 'material_overrun', 'reorder', 'crew_output', 'checkin', 'price_up', 'price_incentive', 'lead_action', 'delivery_flag'];

export function draftInsights(a: Analysis): InsightDraft[] {
  const out: InsightDraft[] = [];
  const cname = (id: string) => a.contractors.find((c) => c.id === id)?.company_name || 'Contractor';
  const hasPlan = new Set(a.planPoints.map((p) => p.work_package_id));

  for (const w of a.health) {
    const wp = a.workPackages.find((x) => x.id === w.id)!;
    if (!hasPlan.has(w.id) && w.state !== 'done' && wp.start_date && wp.due_date)
      out.push({ scope: 'work_package', subject_id: w.id, kind: 'no_baseline', severity: 'info', title: `No baseline plan for "${w.title}"`,
        body: `Without a plan, progress can only be judged against a straight S-curve from ${d(wp.start_date)} to ${d(wp.due_date)}. Create a baseline so reports compare against what was agreed.`,
        suggestion: { action: 'create_baseline', work_package_id: w.id, label: 'Create a monthly baseline' } });
    if (w.state === 'behind' || w.state === 'at_risk') {
      const weekly = Math.round(w.velocity * 70) / 10;
      out.push({
        scope: 'work_package', subject_id: w.id, kind: 'wp_behind', severity: w.state === 'behind' ? 'critical' : 'warn',
        title: `${w.title}: ${Math.round(w.actual)}% done vs ${Math.round(w.planned)}% planned`,
        body: `${cname(w.contractorId)} is ${Math.abs(w.variance)} point${Math.abs(w.variance) === 1 ? '' : 's'} ${w.variance < 0 ? 'behind' : 'ahead of'} plan, moving ${weekly} point${weekly === 1 ? '' : 's'} a week. ${w.forecast ? `At this pace it finishes ${d(w.forecast)}${w.due ? ` against a due date of ${d(w.due)}` : ''}.` : 'There has been no recent progress, so no finish date can be forecast.'}`,
        data: { planned: w.planned, actual: w.actual, forecast: w.forecast, due: w.due, contractor_id: w.contractorId },
        suggestion: wp.status !== 'delayed' && w.state === 'behind' ? { action: 'mark_delayed', work_package_id: w.id, expected: w.forecast, label: 'Mark as delayed on the dashboard' } : { action: 'share_report', contractor_id: w.contractorId, label: `Send the weekly report to ${cname(w.contractorId)}` },
      });
    }
  }
  for (const m of a.matVsPlan.filter((x) => x.overrunPct > 8)) {
    out.push({ scope: 'contractor', subject_id: m.contractorId, kind: 'material_overrun', severity: m.overrunPct > 20 ? 'critical' : 'warn',
      title: `${cname(m.contractorId)} used ${m.overrunPct}% more ${m.name} than planned`,
      body: `${m.used} ${m.unit} used; the plan expects ${m.expected} ${m.unit} for the work done so far${m.extraCost ? ` (≈ ₹${m.extraCost.toLocaleString('en-IN')} extra)` : ''}. Check wastage records and site storage.`,
      data: { material_id: m.materialId, ...m }, suggestion: { action: 'share_report', contractor_id: m.contractorId, label: 'Share with the contractor' } });
  }
  for (const s of a.stockF.filter((x) => x.status !== 'ok')) {
    out.push({ scope: 'material', subject_id: s.materialId, kind: 'reorder', severity: s.status === 'short' ? 'critical' : 'warn',
      title: s.status === 'short' ? `${s.name}: open requests exceed stock` : `${s.name}: about ${s.daysLeft ?? 0} days of stock left`,
      body: `${s.inStore} ${s.unit} in store, using ${s.dailyUse} a day${s.openDemand ? `, ${s.openDemand} requested` : ''}. Order ${s.orderQty} ${s.unit}${s.vendor ? ` from ${s.vendor.name}` : ''} (≈ ₹${s.orderValue.toLocaleString('en-IN')}) to cover the next month with a 7-day lead time.`,
      data: { ...s }, suggestion: { action: 'reorder', material_id: s.materialId, qty: s.orderQty, unit: s.unit, vendor_id: s.vendor?.id ?? null, phone: s.vendor?.phone ?? null, message: orderMessage(s, a.project.name, a.orgName), label: s.vendor ? `Send order to ${s.vendor.name}` : 'Draft the order' } });
  }
  for (const c of a.crew.filter((x) => x.flag)) {
    out.push({ scope: 'contractor', subject_id: c.contractorId, kind: 'crew_output', severity: 'warn', title: `${cname(c.contractorId)}: crew on site, little progress`,
      body: `${c.note} Wages for the week ≈ ₹${c.wages7.toLocaleString('en-IN')} against ≈ ₹${c.earned7.toLocaleString('en-IN')} of work value completed. Check for a blocker (materials, drawings, rain) or idle crew.`,
      data: { ...c }, suggestion: { action: 'share_report', contractor_id: c.contractorId, label: 'Ask the contractor to explain' } });
  }
  const singles = a.flags.filter((f) => f.kind === 'outside' && f.severity === 'warn');
  for (const f of a.flags.filter((x) => !singles.includes(x))) {
    out.push({ scope: 'crew', subject_id: f.employeeIds[0] ?? null, kind: 'checkin', severity: f.severity, title: f.title, body: f.detail, data: { ...f }, suggestion: { action: 'review', href: '/console/employees', label: 'Review attendance' } });
  }
  if (singles.length) {
    const names = singles.map((f) => f.title.replace(/ checked in outside.*/, ''));
    out.push({ scope: 'crew', subject_id: null, kind: 'checkin', severity: 'info', title: `${singles.length} ${singles.length > 1 ? 'people' : 'person'} checked in outside the site once`,
      body: `${names.join(', ')}. One-off cases are usually a weak GPS fix at the gate; watch for repeats.`, data: { employee_ids: singles.flatMap((f) => f.employeeIds) }, suggestion: { action: 'review', href: '/console/employees', label: 'Review attendance' } });
  }
  for (const p of a.pricing) {
    out.push(p.direction === 'up'
      ? { scope: 'plot', subject_id: p.plotId, kind: 'price_up', severity: 'good', title: `${p.plotNumber}: demand supports +${p.changePct}%`, body: p.reason + ` Suggested price ₹${(p.newPrice / 1e5).toFixed(2)} L (now ₹${(p.price / 1e5).toFixed(2)} L).`,
        data: { ...p }, suggestion: { action: 'set_price', plot_id: p.plotId, price: p.newPrice, label: `Raise to ₹${(p.newPrice / 1e5).toFixed(2)} L` } }
      : { scope: 'plot', subject_id: p.plotId, kind: 'price_incentive', severity: 'info', title: `${p.plotNumber}: low interest`, body: p.reason, data: { ...p }, suggestion: { action: 'review', href: '/console/plots', label: 'Open plots' } });
  }
  const urgent = a.leadScores.filter((l) => l.s.band !== 'closed' && (l.s.action.urgency === 'now' || (l.s.band === 'hot' && l.s.action.urgency === 'today')))
    .sort((x, y) => y.s.score - x.s.score).slice(0, 6);
  for (const { lead, s } of urgent) {
    out.push({ scope: 'lead', subject_id: lead.id, kind: 'lead_action', severity: s.band === 'hot' ? 'warn' : 'info', title: `${lead.full_name} (${s.band}, ${s.score}): ${s.action.label}`,
      body: s.action.detail, data: { score: s.score, band: s.band, points: s.points }, suggestion: { action: 'set_follow_up', lead_id: lead.id, note: s.action.label, label: 'Schedule follow-up for tomorrow 10 am' } });
  }
  for (const { delivery, check } of a.deliveryFlags.filter((x) => !x.check.ok && x.delivery.status === 'pending_inspection')) {
    const worst = check.flags.find((f) => f.severity === 'critical') || check.flags[0]!;
    const v = a.vendors.find((x) => x.id === delivery.vendor_id), m = a.materials.find((x) => x.id === delivery.material_id);
    out.push({ scope: 'vendor', subject_id: delivery.vendor_id, kind: 'delivery_flag', severity: check.flags.some((f) => f.severity === 'critical') ? 'critical' : 'warn',
      title: `Delivery ${delivery.seq ? '#' + delivery.seq : ''} from ${v?.company_name || 'vendor'}: ${worst.label}`.replace('  ', ' '),
      body: `${Number(delivery.quantity)} ${m?.unit || ''} of ${m?.name || 'material'}. ${check.flags.map((f) => f.label).join('; ')}. Check before accepting.`,
      data: { delivery_id: delivery.id, flags: check.flags }, suggestion: { action: 'review', href: `/console/vendors/${delivery.vendor_id}`, label: 'Open the delivery' } });
  }
  return out;
}

export function projectSummary(a: Analysis): ProjectSummary {
  const milestones: ProjectSummary['milestones'] = {};
  for (const m of a.msHealth) {
    if (!m.roll) continue;
    const dues = m.items.map((i) => i.due).filter(Boolean) as string[];
    milestones[m.milestone.key] = { planned: m.roll.planned, actual: m.roll.actual, state: m.roll.state, forecast: m.roll.forecast, due: dues.sort().at(-1) ?? null };
  }
  return { updated_at: new Date().toISOString(), today: a.today, planned: a.projectRoll.planned, actual: a.projectRoll.actual, state: a.projectRoll.state, forecast: a.projectRoll.forecast, behind: a.projectRoll.behind, atRisk: a.projectRoll.atRisk, milestones };
}

export async function runInsights(db: DB, project: ProjectLite, opts: { useAI?: boolean } = {}) {
  const a = await loadAnalysis(db, project);
  const useAI = (opts.useAI ?? true) && aiEnabled();
  const drafts = draftInsights(a);
  const [brief, ...reports] = await Promise.all([
    projectBrief(a, useAI),
    ...a.byContractor.filter((c) => c.roll.state !== 'done').slice(0, 8).map((c) => contractorReport(a, c.contractor.id, useAI)),
  ]);
  drafts.unshift({ scope: 'project', subject_id: project.id, kind: 'project_brief', severity: a.projectRoll.state === 'behind' ? 'warn' : 'info', title: `Briefing for ${new Date(a.today).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'short' })}`, body: brief.body, data: { facts: brief.facts }, source: brief.source });
  for (const r of reports) if (r && r.facts) {
    const facts = r.facts;
    const cid = facts.contractorId;
    drafts.push({ scope: 'contractor', subject_id: cid, kind: 'weekly_report', severity: facts.roll.state === 'behind' ? 'warn' : facts.roll.state === 'at_risk' ? 'info' : 'good', title: r.title, body: r.body, data: { facts, state: STATE_LABEL[facts.roll.state] }, source: r.source, suggestion: { action: 'share_report', contractor_id: cid, label: 'Share with the contractor' } });
  }

  // respect recent decisions
  const since = new Date(Date.now() - 7 * 86400000).toISOString();
  const { data: recent } = await db.from('ai_insights').select('kind, subject_id, status').eq('project_id', project.id).eq('status', 'dismissed').gte('decided_at', since);
  const dismissed = new Set((recent || []).map((r) => r.kind + '|' + r.subject_id));
  const rows = drafts.filter((x) => x.kind === 'project_brief' || x.kind === 'weekly_report' || !dismissed.has(x.kind + '|' + x.subject_id)).map((x) => ({
    org_id: project.org_id, project_id: project.id, scope: x.scope, subject_id: x.subject_id, kind: x.kind, severity: x.severity,
    title: x.title.slice(0, 200), body: x.body, data: (x.data || {}) as NonNullable<Json>, suggestion: (x.suggestion || null) as Json, source: x.source || 'rules',
  }));
  // keep the shared state of weekly reports that were already sent this week
  const { data: shared } = await db.from('ai_insights').select('subject_id').eq('project_id', project.id).eq('kind', 'weekly_report').eq('shared_with_contractor', true).eq('status', 'open');
  await db.from('ai_insights').delete().eq('project_id', project.id).eq('status', 'open').in('kind', RUN_KINDS);
  const sharedSet = new Set((shared || []).map((s) => s.subject_id));
  const { error } = await db.from('ai_insights').insert(rows.map((r) => ({ ...r, shared_with_contractor: r.kind === 'weekly_report' && sharedSet.has(r.subject_id) })));
  if (error) throw new Error(error.message);
  await db.from('projects').update({ ai_summary: projectSummary(a) as unknown as Json }).eq('id', project.id);
  return { count: rows.length, aiUsed: useAI, aiCalls: (brief.result ? 1 : 0) + reports.filter((r) => r?.result).length, results: [brief.result, ...reports.map((r) => r?.result ?? null)] };
}
