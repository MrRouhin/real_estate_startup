// Loads everything the AI features look at for one project and computes the numbers once.
// Works with the signed-in staff client (row-level security applies) or the admin client (cron).
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/database.types';
import { asLayout } from '@/lib/site';
import { crewProductivity, checkinFlags, type CheckinFlag, type CrewProductivity } from './crew';
import { forecastStock, type StockForecast } from './materials';
import { materialVsPlan, rollup, wpHealth, type MaterialVsPlan, type Rollup, type WPHealth } from './plan';
import { scoreLead, type LeadScore } from './leads';
import { priceSuggestions, type PriceSuggestion } from './pricing';
import { deliveryChecks, type DeliveryCheck } from './invoice';

export type DB = SupabaseClient<Database>;

/** Today's date in India (the site's calendar day). */
export const istToday = (now = Date.now()) => new Date(now + 5.5 * 3600_000).toISOString().slice(0, 10);

export type ProjectLite = Pick<Database['public']['Tables']['projects']['Row'], 'id' | 'name' | 'org_id' | 'layout' | 'site_lat' | 'site_lng' | 'geofence_m' | 'slug'>;

export async function loadAnalysis(db: DB, project: ProjectLite, today = istToday()) {
  const orgId = project.org_id, pid = project.id;
  const since30 = new Date(Date.now() - 30 * 86400000).toISOString();
  const since120 = new Date(Date.now() - 140 * 86400000).toISOString();
  const [org, wps, contractors, milestones, usage, stock, moves, requests, vendors, emps, att, leads, acts, visits, plots, events, prices, deliveries, materials, stats, overdue] = await Promise.all([
    db.from('organizations').select('name').eq('id', orgId).maybeSingle(),
    db.from('work_packages').select('*').eq('project_id', pid),
    db.from('contractors').select('id, company_name, contact_person, phone, trade, user_id, status').eq('org_id', orgId),
    db.from('milestones').select('id, key, name, progress, weight').eq('project_id', pid).order('sort_order'),
    db.from('contractor_material_usage').select('*').eq('project_id', pid),
    db.from('material_stock').select('*').eq('project_id', pid),
    db.from('stock_movements').select('material_id, type, quantity, created_at, contractor_id').eq('project_id', pid).gte('created_at', since30),
    db.from('material_requests').select('material_id, quantity, status, contractor_id').eq('project_id', pid).in('status', ['requested', 'approved']),
    db.from('vendors').select('id, company_name, phone, categories, rating, gst_number').eq('org_id', orgId),
    db.from('employees').select('id, full_name, employee_code, contractor_id, daily_wage').eq('org_id', orgId).eq('active', true),
    db.from('attendance').select('employee_id, work_date, lat, lng, distance_m, inside_geofence, selfie_path, check_in_at').eq('org_id', orgId).gte('work_date', new Date(Date.now() - 15 * 86400000).toISOString().slice(0, 10)),
    db.from('leads').select('*').eq('org_id', orgId),
    db.from('lead_activities').select('lead_id, type, created_at').eq('org_id', orgId).gte('created_at', since30),
    db.from('site_visits').select('lead_id, status, scheduled_at, feedback').eq('org_id', orgId),
    db.from('plots').select('id, plot_number, price, area_sqft, facing, is_corner, status, created_at, held_until, shape_path, dimensions').eq('project_id', pid),
    db.from('plot_events').select('plot_id, kind, created_at').eq('project_id', pid).gte('created_at', since30),
    db.from('plot_price_history').select('plot_id, price, changed_at').eq('org_id', orgId).order('changed_at'),
    db.from('deliveries').select('*').eq('project_id', pid).gte('created_at', new Date(Date.now() - 120 * 86400000).toISOString()).order('created_at', { ascending: false }),
    db.from('materials').select('id, name, unit, unit_cost, category').eq('org_id', orgId),
    db.from('project_stats').select('*').eq('project_id', pid).maybeSingle(),
    db.from('payment_schedule').select('amount, due_date, status, booking_id').eq('org_id', orgId).in('status', ['due', 'overdue']),
  ]);
  const wpIds = (wps.data || []).map((w) => w.id);
  const [points, log, budgets] = wpIds.length ? await Promise.all([
    db.from('wp_plan_points').select('work_package_id, planned_date, planned_pct').in('work_package_id', wpIds).order('planned_date'),
    db.from('wp_progress_log').select('work_package_id, progress, logged_at').in('work_package_id', wpIds).gte('logged_at', since120).order('logged_at'),
    db.from('wp_material_budget').select('work_package_id, material_id, planned_qty').in('work_package_id', wpIds),
  ]) : [{ data: [] }, { data: [] }, { data: [] }];

  const pts = points.data || [], lg = log.data || [];
  const health: WPHealth[] = (wps.data || []).map((w) => wpHealth(w, pts.filter((p) => p.work_package_id === w.id), lg.filter((l) => l.work_package_id === w.id), today));
  const projectRoll = rollup(health);
  const cons = contractors.data || [];
  const byContractor = cons.map((c) => ({ contractor: c, items: health.filter((h) => h.contractorId === c.id) }))
    .filter((x) => x.items.length).map((x) => ({ ...x, roll: rollup(x.items) }));
  const msHealth = (milestones.data || []).map((m) => {
    const items = health.filter((h) => h.milestoneId === m.id);
    return { milestone: m, items, roll: items.length ? rollup(items) : null };
  });
  const matVsPlan: MaterialVsPlan[] = materialVsPlan(health, budgets.data || [], usage.data || []);
  const stockF: StockForecast[] = forecastStock(stock.data || [], moves.data || [], requests.data || [], vendors.data || [], new Date(today + 'T12:00:00+05:30'));
  const crew: CrewProductivity[] = crewProductivity(byContractor.map((x) => x.contractor.id), health, lg, emps.data || [], att.data || [], today);
  const flags: CheckinFlag[] = checkinFlags(emps.data || [], att.data || [], today);
  const plotRows = plots.data || [];
  const leadScores: { lead: Database['public']['Tables']['leads']['Row']; s: LeadScore }[] = (leads.data || []).map((l) => ({ lead: l, s: scoreLead(l, acts.data || [], visits.data || [], plotRows) }));
  const pricing: PriceSuggestion[] = priceSuggestions(plotRows, events.data || [], prices.data || []);
  const mats = materials.data || [];
  const dl = deliveries.data || [];
  const deliveryFlags: { delivery: (typeof dl)[number]; check: DeliveryCheck }[] = dl.slice(0, 60).map((d) => ({
    delivery: d, check: deliveryChecks(d, dl, mats.find((m) => m.id === d.material_id) || null, (vendors.data || []).find((v) => v.id === d.vendor_id) || null),
  }));
  const demand: Record<string, number> = {};
  for (const e of events.data || []) demand[e.plot_id] = (demand[e.plot_id] || 0) + 1;
  const overdueRows = (overdue.data || []).filter((i) => i.status === 'overdue' || (i.due_date && i.due_date < today));

  return {
    today, project, orgName: org.data?.name || '', layout: asLayout(project.layout), health, projectRoll, byContractor, msHealth, planPoints: pts, progressLog: lg,
    budgets: budgets.data || [], usage: usage.data || [], matVsPlan, stock: stock.data || [], stockF, crew, flags, employees: emps.data || [],
    attendance: att.data || [], contractors: cons, vendors: vendors.data || [], materials: mats, leadScores, pricing, plots: plotRows, demand,
    deliveries: dl, deliveryFlags, stats: stats.data, overdue: { count: overdueRows.length, amount: overdueRows.reduce((a, i) => a + Number(i.amount), 0) },
    workPackages: wps.data || [],
  };
}

export type Analysis = Awaited<ReturnType<typeof loadAnalysis>>;
