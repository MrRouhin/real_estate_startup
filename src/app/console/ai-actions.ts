'use server';
// AI actions in the developer console. The AI only suggests; these actions carry out a
// suggestion once a person approves it, and record who decided.
import { revalidatePath } from 'next/cache';
import { requireStaff } from '@/lib/auth';
import { fail, friendly, ok, type ActionResult } from '@/lib/actions';
import { runInsights, type Suggestion } from '@/lib/ai/run';
import { logUsage } from '@/lib/ai/usage';
import { aiEnabled } from '@/lib/ai/client';
import { dayNum, fromDayNum, plannedAt } from '@/lib/ai/plan';
import { scoreLead } from '@/lib/ai/leads';
import { rankPlots, parseRequirements } from '@/lib/ai/match';
import { asLayout } from '@/lib/site';
import { draftFollowUpAI, summarizeCall } from '@/lib/ai/crm';
import type { Lang } from '@/lib/ai/i18n';

const R = (p: string) => revalidatePath(p, 'layout');

export async function runAnalysis(): Promise<ActionResult> {
  const { supabase, project, orgId, user } = await requireStaff();
  if (!project) return fail('No project selected.');
  try {
    const r = await runInsights(supabase, project);
    for (const res of r.results) if (res) await logUsage('insights', 'u:' + user.id, orgId, res);
    R('/console');
    return ok(`Analysis done: ${r.count} insight${r.count === 1 ? '' : 's'}${r.aiUsed ? ` (AI wrote ${r.aiCalls} report${r.aiCalls === 1 ? '' : 's'})` : ''}`);
  } catch (e) {
    return fail('Could not run the analysis: ' + (e as Error).message);
  }
}

/** A baseline from start to due: one point a month on an S-curve. */
function baselinePoints(start: string, due: string) {
  const s = dayNum(start), e = dayNum(due);
  const pts: { planned_date: string; planned_pct: number }[] = [];
  const steps = Math.max(2, Math.min(18, Math.round((e - s) / 30)));
  for (let i = 0; i <= steps; i++) {
    const d = Math.round(s + ((e - s) * i) / steps);
    pts.push({ planned_date: fromDayNum(d), planned_pct: Math.round(plannedAt([], start, due, d) * 10) / 10 });
  }
  return pts;
}

export async function decideInsight(id: string, decision: 'apply' | 'dismiss'): Promise<ActionResult & { link?: string }> {
  const { supabase, user, orgId } = await requireStaff();
  const { data: ins } = await supabase.from('ai_insights').select('*').eq('id', id).single();
  if (!ins) return fail('That insight no longer exists. Run the analysis again.');
  if (ins.status !== 'open') return fail('Already decided.');
  let message = 'Dismissed. It will not be raised again this week.';
  let link: string | undefined;
  if (decision === 'apply') {
    const s = ins.suggestion as Suggestion | null;
    if (!s) return fail('Nothing to apply.');
    switch (s.action) {
      case 'create_baseline': {
        const { data: w } = await supabase.from('work_packages').select('id, start_date, due_date').eq('id', s.work_package_id).single();
        if (!w?.start_date || !w.due_date) return fail('Set the start and due dates first.');
        const { error } = await supabase.from('wp_plan_points').upsert(baselinePoints(w.start_date, w.due_date).map((p) => ({ ...p, org_id: orgId, work_package_id: w.id })), { onConflict: 'work_package_id,planned_date' });
        if (error) return fail(friendly(error));
        message = 'Baseline created. Adjust it on the contractor’s Plan tab.';
        break;
      }
      case 'mark_delayed': {
        const { error } = await supabase.from('work_packages').update({ status: 'delayed' }).eq('id', s.work_package_id).neq('status', 'completed');
        if (error) return fail(friendly(error));
        message = 'Marked as delayed on the dashboard.';
        break;
      }
      case 'set_price': {
        const { error } = await supabase.from('plots').update({ price: s.price }).eq('id', s.plot_id).in('status', ['available', 'held', 'blocked']);
        if (error) return fail(friendly(error));
        message = 'Price updated and logged to the price history.';
        break;
      }
      case 'reorder': {
        const phone = (s.phone || '').replace(/\D/g, '');
        link = phone ? `https://wa.me/${phone.length === 10 ? '91' + phone : phone}?text=${encodeURIComponent(s.message)}` : undefined;
        message = link ? 'Order drafted. WhatsApp opens with the message.' : 'Order drafted. Copy the message to send it.';
        break;
      }
      case 'share_report': {
        let target = ins.kind === 'weekly_report' || (ins.scope === 'contractor' && ins.subject_id === s.contractor_id) ? ins.id : null;
        if (!target) {
          const { data: rep } = await supabase.from('ai_insights').select('id').eq('kind', 'weekly_report').eq('subject_id', s.contractor_id).eq('status', 'open').order('created_at', { ascending: false }).limit(1).maybeSingle();
          target = rep?.id ?? null;
        }
        if (!target) return fail('No weekly report for this contractor yet. Run the analysis first.');
        const { error } = await supabase.rpc('share_ai_insight', { p_insight: target });
        if (error) return fail(friendly(error));
        if (target !== ins.id && ins.scope === 'contractor') await supabase.rpc('share_ai_insight', { p_insight: ins.id });
        message = 'Shared. The contractor sees it in their portal.';
        if (ins.kind === 'weekly_report') { R('/console'); return ok(message); } // a shared report stays open (it is the current report)
        break;
      }
      case 'set_follow_up': {
        const t = new Date(Date.now() + 5.5 * 3600_000); t.setUTCDate(t.getUTCDate() + 1); t.setUTCHours(4, 30, 0, 0); // 10:00 IST tomorrow
        const { error } = await supabase.from('leads').update({ next_follow_up_at: t.toISOString() }).eq('id', s.lead_id);
        if (error) return fail(friendly(error));
        await supabase.from('lead_activities').insert({ org_id: orgId, lead_id: s.lead_id, type: 'note', body: `Next step (AI suggestion, approved): ${s.note}` });
        message = 'Follow-up set for tomorrow 10 am.';
        break;
      }
      case 'review':
        message = 'Marked as reviewed.';
        break;
    }
  }
  const { error } = await supabase.from('ai_insights').update({ status: decision === 'apply' ? 'applied' : 'dismissed', decided_by: user.id, decided_at: new Date().toISOString() }).eq('id', id);
  if (error) return fail(friendly(error));
  R('/console');
  return { ...ok(decision === 'apply' ? message || 'Done' : message), link };
}

export async function shareInsight(id: string): Promise<ActionResult> {
  const { supabase } = await requireStaff();
  const { error } = await supabase.rpc('share_ai_insight', { p_insight: id });
  if (error) return fail(friendly(error));
  R('/console');
  return ok('Shared with the contractor');
}

// ---------------- Baseline plan editor ----------------
export async function savePlan(workPackageId: string, points: { planned_date: string; planned_pct: number }[], qty: { planned_qty: number | null; qty_unit: string | null }): Promise<ActionResult> {
  const { supabase, orgId } = await requireStaff();
  const clean = points.filter((p) => /^\d{4}-\d{2}-\d{2}$/.test(p.planned_date) && p.planned_pct >= 0 && p.planned_pct <= 100)
    .sort((a, b) => a.planned_date.localeCompare(b.planned_date));
  for (let i = 1; i < clean.length; i++) if (clean[i]!.planned_pct < clean[i - 1]!.planned_pct) return fail('Planned % must not go down over time.');
  if (new Set(clean.map((p) => p.planned_date)).size !== clean.length) return fail('Each date can appear only once.');
  const { data: w } = await supabase.from('work_packages').select('contractor_id').eq('id', workPackageId).single();
  if (!w) return fail('Work package not found.');
  const del = await supabase.from('wp_plan_points').delete().eq('work_package_id', workPackageId);
  if (del.error) return fail(friendly(del.error));
  if (clean.length) {
    const { error } = await supabase.from('wp_plan_points').insert(clean.map((p) => ({ ...p, org_id: orgId, work_package_id: workPackageId })));
    if (error) return fail(friendly(error));
  }
  const up = await supabase.from('work_packages').update({ planned_qty: qty.planned_qty && qty.planned_qty > 0 ? qty.planned_qty : null, qty_unit: qty.qty_unit || null }).eq('id', workPackageId);
  if (up.error) return fail(friendly(up.error));
  R(`/console/contractors/${w.contractor_id}`);
  return ok(clean.length ? `Baseline saved (${clean.length} points)` : 'Baseline cleared: progress is judged on a default S-curve');
}

export async function generateBaseline(workPackageId: string): Promise<{ ok: boolean; error?: string; points?: { planned_date: string; planned_pct: number }[] }> {
  const { supabase } = await requireStaff();
  const { data: w } = await supabase.from('work_packages').select('start_date, due_date').eq('id', workPackageId).single();
  if (!w?.start_date || !w.due_date) return { ok: false, error: 'Set start and due dates on the package first.' };
  return { ok: true, points: baselinePoints(w.start_date, w.due_date) };
}

export async function saveBudget(workPackageId: string, materialId: string, plannedQty: number | null): Promise<ActionResult> {
  const { supabase, orgId } = await requireStaff();
  const { data: w } = await supabase.from('work_packages').select('contractor_id').eq('id', workPackageId).single();
  if (!w) return fail('Work package not found.');
  const res = plannedQty && plannedQty > 0
    ? await supabase.from('wp_material_budget').upsert({ org_id: orgId, work_package_id: workPackageId, material_id: materialId, planned_qty: plannedQty }, { onConflict: 'work_package_id,material_id' })
    : await supabase.from('wp_material_budget').delete().eq('work_package_id', workPackageId).eq('material_id', materialId);
  if (res.error) return fail(friendly(res.error));
  R(`/console/contractors/${w.contractor_id}`);
  return ok(plannedQty ? 'Material budget saved' : 'Budget removed');
}

// ---------------- CRM ----------------
export async function draftLeadMessage(leadId: string, lang: Lang = 'en'): Promise<{ ok: boolean; text?: string; source?: 'ai' | 'rules'; error?: string; phone?: string }> {
  const { supabase, orgId, project, profile, user } = await requireStaff();
  const [{ data: lead }, { data: acts }, { data: visits }, { data: plots }] = await Promise.all([
    supabase.from('leads').select('*').eq('id', leadId).single(),
    supabase.from('lead_activities').select('lead_id, type, created_at, body').eq('lead_id', leadId).order('created_at', { ascending: false }).limit(8),
    supabase.from('site_visits').select('lead_id, status, scheduled_at, feedback').eq('lead_id', leadId),
    project ? supabase.from('plots').select('id, plot_number, price, area_sqft, facing, is_corner, status, held_until, shape_path, dimensions').eq('project_id', project.id) : Promise.resolve({ data: [] as never[] }),
  ]);
  if (!lead) return { ok: false, error: 'Lead not found.' };
  const s = scoreLead(lead, acts || [], visits || [], plots || []);
  const req = parseRequirements([lead.message, lead.preferred_facing, lead.preferred_size ? `${lead.preferred_size} sq ft` : ''].filter(Boolean).join(' '), { budgetMin: lead.budget_min, budgetMax: lead.budget_max });
  const ranked = rankPlots(plots || [], asLayout(project?.layout), req).slice(0, 2);
  const r = await draftFollowUpAI(lead, s, ranked.map((x) => ({ plot_number: x.plot.plot_number, price: Number(x.plot.price), area: Number(x.plot.area_sqft), facing: x.plot.facing, reasons: x.reasons })),
    profile.full_name?.split(' ')[0] || 'Team', project?.name || 'our project', (acts || []).filter((a) => a.type !== 'system').map((a) => a.body), lang);
  if (r.result) await logUsage('lead_draft', 'u:' + user.id, orgId, r.result);
  return { ok: true, text: r.text, source: r.source, phone: lead.phone };
}

export async function summarizeLeadNote(leadId: string, notes: string): Promise<ActionResult> {
  const { supabase, orgId, user } = await requireStaff();
  if (!notes || notes.trim().length < 15) return fail('Paste or type the call notes first (a few sentences).');
  const r = await summarizeCall(notes);
  if (r.result) await logUsage('call_summary', 'u:' + user.id, orgId, r.result);
  const d = r.data;
  const body = [`Call summary${r.source === 'ai' ? ' (AI)' : ''}: ${d.summary}`, d.budget ? `Budget: ${d.budget}` : '', d.wants?.length ? `Wants: ${d.wants.join(', ')}` : '',
    d.objections?.length ? `Concerns: ${d.objections.join(', ')}` : '', d.next_step ? `Next: ${d.next_step}` : ''].filter(Boolean).join('\n');
  const { error } = await supabase.from('lead_activities').insert({ org_id: orgId, lead_id: leadId, type: 'call', body });
  if (error) return fail(friendly(error));
  if (d.follow_up_in_days && d.follow_up_in_days > 0 && d.follow_up_in_days < 60) {
    const t = new Date(Date.now() + d.follow_up_in_days * 86400000); t.setUTCHours(4, 30, 0, 0);
    await supabase.from('leads').update({ next_follow_up_at: t.toISOString() }).eq('id', leadId);
  }
  await supabase.from('leads').update({ stage: 'contacted' }).eq('id', leadId).eq('stage', 'new');
  R(`/console/leads/${leadId}`);
  return ok(d.follow_up_in_days ? `Summary logged; follow-up set in ${d.follow_up_in_days} day${d.follow_up_in_days > 1 ? 's' : ''}` : 'Summary logged');
}

export async function aiStatus() {
  return { enabled: aiEnabled() };
}
