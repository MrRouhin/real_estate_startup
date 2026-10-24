// Crew vs output, and check-ins that look wrong. Pure functions.
import type { WPHealth } from './plan';
import { dayNum } from './plan';

export type AttRow = { employee_id: string; work_date: string; lat: number | null; lng: number | null; distance_m: number | null; inside_geofence: boolean | null; selfie_path: string | null; check_in_at: string };
export type EmpRow = { id: string; full_name: string; employee_code: string; contractor_id: string | null; daily_wage: number | string | null };
export type ProgLog = { work_package_id: string; logged_at: string; progress: number | string };

export type CrewProductivity = {
  contractorId: string; personDays7: number; personDaysPrev7: number; gain7: number; gainPrev7: number;
  earned7: number; wages7: number; perTenDays: number | null; flag: boolean; note: string;
};

/** Value-weighted progress gained by a contractor between two days, from the progress log. */
function progressAt(log: ProgLog[], wpId: string, day: number) {
  const pts = log.filter((l) => l.work_package_id === wpId).map((l) => [dayNum(l.logged_at), Number(l.progress)] as const).sort((a, b) => a[0] - b[0]);
  let v = 0; for (const [d, p] of pts) { if (d <= day) v = p; else break; } return v;
}

export function crewProductivity(contractorIds: string[], health: WPHealth[], log: ProgLog[], emps: EmpRow[], att: AttRow[], todayStr: string): CrewProductivity[] {
  const today = dayNum(todayStr);
  return contractorIds.map((cid) => {
    const crew = new Map(emps.filter((e) => e.contractor_id === cid).map((e) => [e.id, e]));
    const days = (from: number, to: number) => att.filter((a) => crew.has(a.employee_id) && dayNum(a.work_date) > from && dayNum(a.work_date) <= to);
    const a7 = days(today - 7, today), p7 = days(today - 14, today - 7);
    const wps = health.filter((h) => h.contractorId === cid && h.state !== 'done');
    const value = wps.reduce((s, w) => s + w.value, 0) || 1;
    const gain = (from: number, to: number) => wps.reduce((s, w) => s + (Math.max(0, (to === today ? w.actual : progressAt(log, w.id, to)) - progressAt(log, w.id, from)) * w.value), 0) / value;
    const gain7 = Math.round(gain(today - 7, today) * 10) / 10, gainPrev7 = Math.round(gain(today - 14, today - 7) * 10) / 10;
    const earned7 = Math.round(wps.reduce((s, w) => s + ((Math.max(0, w.actual - progressAt(log, w.id, today - 7))) / 100) * w.value, 0));
    const wages7 = Math.round(a7.reduce((s, a) => s + Number(crew.get(a.employee_id)?.daily_wage || 0), 0));
    const perTenDays = a7.length ? Math.round((gain7 / a7.length) * 100) / 10 : null;
    const flag = a7.length >= 12 && gain7 < 1 && wps.length > 0;
    const note = a7.length === 0 ? 'No crew check-ins in the last 7 days.'
      : `${a7.length} person-days on site in the last 7 days; weighted progress moved ${gain7} points (previous week ${gainPrev7}).`;
    return { contractorId: cid, personDays7: a7.length, personDaysPrev7: p7.length, gain7, gainPrev7, earned7, wages7, perTenDays, flag, note };
  });
}

export type CheckinFlag = { kind: 'outside' | 'same_spot' | 'selfie_reuse'; employeeIds: string[]; title: string; detail: string; severity: 'warn' | 'critical' };

/** Patterns that suggest proxy or fake check-ins. */
export function checkinFlags(emps: EmpRow[], att: AttRow[], todayStr: string): CheckinFlag[] {
  const today = dayNum(todayStr);
  const recent = att.filter((a) => dayNum(a.work_date) > today - 14);
  const name = (id: string) => emps.find((e) => e.id === id)?.full_name || 'Someone';
  const out: CheckinFlag[] = [];
  // repeatedly outside the geofence
  const outside = new Map<string, AttRow[]>();
  for (const a of recent) if (a.inside_geofence === false) outside.set(a.employee_id, [...(outside.get(a.employee_id) || []), a]);
  for (const [id, rows] of outside) {
    const far = Math.max(...rows.map((r) => r.distance_m || 0));
    out.push({ kind: 'outside', employeeIds: [id], severity: rows.length >= 2 ? 'critical' : 'warn',
      title: `${name(id)} checked in outside the site ${rows.length} time${rows.length > 1 ? 's' : ''}`,
      detail: `In the last 14 days, up to ${(far / 1000).toFixed(1)} km away. Ask for a site photo or switch them to supervisor check-in.` });
  }
  // the exact same far-away coordinates used by different people / days (shared or spoofed location)
  const spots = new Map<string, AttRow[]>();
  for (const a of recent) if (a.lat != null && a.lng != null && a.inside_geofence === false) {
    const k = `${Number(a.lat).toFixed(5)},${Number(a.lng).toFixed(5)}`; spots.set(k, [...(spots.get(k) || []), a]);
  }
  for (const [k, rows] of spots) {
    const people = [...new Set(rows.map((r) => r.employee_id))];
    if (rows.length >= 3 && people.length >= 2) out.push({ kind: 'same_spot', employeeIds: people, severity: 'critical',
      title: `${people.length} people checked in from the exact same spot off-site`,
      detail: `${rows.length} check-ins at ${k} (${people.map(name).join(', ')}). Identical GPS points usually mean one phone checking in for others, or a fake location app.` });
  }
  // the same selfie file reused
  const selfies = new Map<string, AttRow[]>();
  for (const a of recent) if (a.selfie_path) selfies.set(a.selfie_path, [...(selfies.get(a.selfie_path) || []), a]);
  for (const [, rows] of selfies) if (rows.length > 1) out.push({ kind: 'selfie_reuse', employeeIds: [...new Set(rows.map((r) => r.employee_id))], severity: 'critical',
    title: `Same selfie used for ${rows.length} check-ins`, detail: `${name(rows[0]!.employee_id)}: the photo file was reused.` });
  return out;
}
