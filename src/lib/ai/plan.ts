// Plan vs actual: where each work package should be today (from its baseline plan),
// where it is, how fast it is moving, and when it will really finish.
// Pure functions: the numbers here are what every AI report is allowed to say.

const DAY = 86400000;
export const dayNum = (d: string | Date) => Math.floor(new Date(typeof d === 'string' && d.length === 10 ? d + 'T00:00:00Z' : d).getTime() / DAY);
export const fromDayNum = (n: number) => new Date(n * DAY).toISOString().slice(0, 10);

export type PlanPoint = { planned_date: string; planned_pct: number | string };
export type LogPoint = { logged_at: string; progress: number | string };
export type WPLike = {
  id: string; title: string; contractor_id: string; milestone_id: string | null; status: string;
  progress: number | string; start_date: string | null; due_date: string | null; contract_value: number | string;
  planned_qty?: number | string | null; qty_unit?: string | null;
};

export type WPState = 'done' | 'ahead' | 'on_track' | 'at_risk' | 'behind' | 'not_started';
export const STATE_LABEL: Record<WPState, string> = {
  done: 'Done', ahead: 'Ahead of plan', on_track: 'On track', at_risk: 'At risk', behind: 'Behind plan', not_started: 'Not started',
};
export const STATE_TONE: Record<WPState, 'good' | 'info' | 'warn' | 'bad' | 'muted'> = {
  done: 'good', ahead: 'good', on_track: 'info', at_risk: 'warn', behind: 'bad', not_started: 'muted',
};

const smooth = (t: number) => { const x = Math.max(0, Math.min(1, t)); return x * x * (3 - 2 * x); };

/** Planned % on a given day: the baseline points if there are any, else an S-curve from start to due. */
export function plannedAt(points: PlanPoint[], start: string | null, due: string | null, day: number): number {
  const pts = points.map((p) => [dayNum(p.planned_date), Number(p.planned_pct)] as const).sort((a, b) => a[0] - b[0]);
  if (pts.length >= 2) {
    if (day <= pts[0]![0]) return pts[0]![1];
    for (let i = 1; i < pts.length; i++) {
      const [d1, v1] = pts[i]!, [d0, v0] = pts[i - 1]!;
      if (day <= d1) return v0 + ((v1 - v0) * (day - d0)) / Math.max(1, d1 - d0);
    }
    return Math.max(pts[pts.length - 1]![1], due && day >= dayNum(due) ? 100 : 0);
  }
  if (!start || !due) return 0;
  const s = dayNum(start), e = dayNum(due);
  return 100 * smooth((day - s) / Math.max(1, e - s));
}

/** Percentage points per day over the recent window (falls back to the average since start). */
export function velocity(log: LogPoint[], progressNow: number, start: string | null, today: number, windowDays = 21): number {
  const pts = log.map((l) => [dayNum(l.logged_at), Number(l.progress)] as const).sort((a, b) => a[0] - b[0]);
  const recent = pts.filter(([d]) => d >= today - windowDays);
  const before = [...pts].reverse().find(([d]) => d < today - windowDays);
  if (recent.length >= 1 && (before || recent.length >= 2)) {
    const [d0, v0] = before ?? recent[0]!;
    const [d1, v1] = [today, progressNow];
    if (d1 > d0) return Math.max(0, (v1 - v0) / (d1 - d0));
  }
  if (start) { const days = today - dayNum(start); if (days > 0) return Math.max(0, progressNow / days); }
  return 0;
}

/**
 * Forecast finish with the earned-schedule method: find the day the plan expected today's
 * progress (ES), compare it with the time actually taken, and stretch the planned duration by
 * that ratio. Unlike a straight-line pace it respects S-shaped plans (slow start, fast middle).
 * Stalled work (no recent progress) gets no forecast; with no plan dates, the recent pace is used.
 */
export function forecastFinish(points: PlanPoint[], start: string | null, due: string | null, actual: number, vel: number, today: number): number | null {
  if (vel < 0.02) return null;
  if (!start || !due) return today + Math.ceil((100 - actual) / vel);
  const s = dayNum(start), e = dayNum(due);
  const elapsed = today - s;
  if (elapsed <= 0) return e;
  let es = s;
  const horizon = Math.max(e, today) + 1;
  for (let d = s; d <= horizon; d++) { if (plannedAt(points, start, due, d) >= actual) { es = d; break; } es = d; }
  const spiT = (es - s) / elapsed;
  if (spiT < 0.05) return today + Math.ceil((100 - actual) / vel);
  const byPlan = s + Math.ceil((e - s) / spiT);
  // never forecast sooner than the recent pace physically allows at twice the speed
  return Math.max(byPlan, today + Math.ceil((100 - actual) / (vel * 2)));
}

export type WPHealth = {
  id: string; title: string; contractorId: string; milestoneId: string | null; value: number;
  planned: number; actual: number; variance: number; spi: number | null; velocity: number;
  forecast: string | null; due: string | null; daysLate: number | null; state: WPState;
  doneQty: number | null; plannedQty: number | null; qtyUnit: string | null;
  curve: { planned: [string, number][]; actual: [string, number][] };
};

export function wpHealth(w: WPLike, points: PlanPoint[], log: LogPoint[], todayStr: string): WPHealth {
  const today = dayNum(todayStr);
  const actual = Number(w.progress);
  const planned = Math.round(plannedAt(points, w.start_date, w.due_date, today) * 10) / 10;
  const vel = velocity(log, actual, w.start_date, today);
  const forecastDay = actual >= 100 ? null : forecastFinish(points, w.start_date, w.due_date, actual, vel, today);
  const due = w.due_date;
  let daysLate: number | null = null;
  if (actual < 100 && due) daysLate = forecastDay != null ? forecastDay - dayNum(due) : Math.max(0, today - dayNum(due)) + 365;
  const variance = Math.round((actual - planned) * 10) / 10;
  let state: WPState;
  if (actual >= 100) state = 'done';
  else if (actual === 0 && planned < 1) state = 'not_started';
  else if ((due && today > dayNum(due)) || variance <= -15 || (daysLate ?? 0) > 30) state = 'behind';
  else if (variance <= -5 || (daysLate ?? 0) > 7) state = 'at_risk';
  else if (variance >= 5) state = 'ahead';
  else state = 'on_track';

  // curve for charts: planned at regular steps, actual from the log
  const s = w.start_date ? dayNum(w.start_date) : today - 60;
  const e = Math.max(due ? dayNum(due) : today + 60, forecastDay ?? 0, today);
  const plannedCurve: [string, number][] = [];
  const steps = 24;
  for (let i = 0; i <= steps; i++) { const d = Math.round(s + ((e - s) * i) / steps); plannedCurve.push([fromDayNum(d), Math.round(plannedAt(points, w.start_date, due, d) * 10) / 10]); }
  const actualCurve: [string, number][] = log.map((l) => [String(l.logged_at).slice(0, 10), Number(l.progress)] as [string, number])
    .sort((a, b) => a[0].localeCompare(b[0]));
  if (!actualCurve.length || actualCurve[actualCurve.length - 1]![1] !== actual) actualCurve.push([todayStr, actual]);
  if (w.start_date && (!actualCurve.length || actualCurve[0]![0] > w.start_date)) actualCurve.unshift([w.start_date, 0]);

  const pq = w.planned_qty != null ? Number(w.planned_qty) : null;
  return {
    id: w.id, title: w.title, contractorId: w.contractor_id, milestoneId: w.milestone_id, value: Number(w.contract_value),
    planned, actual, variance, spi: planned > 0.5 ? Math.round((actual / planned) * 100) / 100 : null,
    velocity: Math.round(vel * 1000) / 1000, forecast: forecastDay != null ? fromDayNum(forecastDay) : null, due,
    daysLate, state, doneQty: pq != null ? Math.round((pq * actual) / 100) : null, plannedQty: pq, qtyUnit: w.qty_unit ?? null,
    curve: { planned: plannedCurve, actual: actualCurve },
  };
}

export type Rollup = { value: number; planned: number; actual: number; spi: number | null; behind: number; atRisk: number; forecast: string | null; state: WPState };

/** Value-weighted roll-up for a contractor or the whole project. */
export function rollup(items: WPHealth[]): Rollup {
  const value = items.reduce((a, w) => a + (w.value || 1), 0) || 1;
  const planned = items.reduce((a, w) => a + w.planned * (w.value || 1), 0) / value;
  const actual = items.reduce((a, w) => a + w.actual * (w.value || 1), 0) / value;
  const open = items.filter((w) => w.state !== 'done');
  const forecasts = open.map((w) => w.forecast).filter(Boolean) as string[];
  const behind = items.filter((w) => w.state === 'behind').length, atRisk = items.filter((w) => w.state === 'at_risk').length;
  const variance = actual - planned;
  // one late package makes the whole contract "at risk"; the roll-up is "behind" only when the weighted gap is large
  const state: WPState = open.length === 0 ? 'done' : variance <= -10 ? 'behind' : behind > 0 || atRisk > 0 || variance <= -4 ? 'at_risk' : variance >= 5 ? 'ahead' : 'on_track';
  return {
    value, planned: Math.round(planned * 10) / 10, actual: Math.round(actual * 10) / 10,
    spi: planned > 0.5 ? Math.round((actual / planned) * 100) / 100 : null, behind, atRisk,
    forecast: forecasts.length && forecasts.length === open.length ? forecasts.sort().at(-1)! : forecasts.sort().at(-1) ?? null, state,
  };
}

export type BudgetRow = { work_package_id: string; material_id: string; planned_qty: number | string };
export type UsageRow = { contractor_id: string | null; material_id: string | null; name: string | null; unit: string | null; consumed: number | string | null; wastage: number | string | null; unit_cost: number | string | null };
export type MaterialVsPlan = { contractorId: string; materialId: string; name: string; unit: string; expected: number; used: number; budget: number; overrunPct: number; extraCost: number };

/** Material used so far vs what the plan says the work done so far should have needed. */
export function materialVsPlan(health: WPHealth[], budgets: BudgetRow[], usage: UsageRow[]): MaterialVsPlan[] {
  const byWp = new Map(health.map((h) => [h.id, h]));
  const expected = new Map<string, { expected: number; budget: number }>();
  for (const b of budgets) {
    const h = byWp.get(b.work_package_id); if (!h) continue;
    const key = h.contractorId + '|' + b.material_id;
    const cur = expected.get(key) || { expected: 0, budget: 0 };
    cur.expected += (Number(b.planned_qty) * h.actual) / 100; cur.budget += Number(b.planned_qty);
    expected.set(key, cur);
  }
  const out: MaterialVsPlan[] = [];
  for (const u of usage) {
    if (!u.contractor_id || !u.material_id) continue;
    const e = expected.get(u.contractor_id + '|' + u.material_id); if (!e || e.expected <= 0) continue;
    const used = Number(u.consumed || 0) + Number(u.wastage || 0);
    const overrunPct = Math.round(((used - e.expected) / e.expected) * 1000) / 10;
    out.push({
      contractorId: u.contractor_id, materialId: u.material_id, name: u.name || 'Material', unit: u.unit || '',
      expected: Math.round(e.expected * 100) / 100, used: Math.round(used * 100) / 100, budget: e.budget, overrunPct,
      extraCost: Math.max(0, Math.round((used - e.expected) * Number(u.unit_cost || 0))),
    });
  }
  return out.sort((a, b) => b.overrunPct - a.overrunPct);
}
