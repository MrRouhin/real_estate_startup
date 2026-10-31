// Tower construction, per-floor status, forecasts, construction-linked payments, flat pricing
// and rental yield. Pure functions shared by the buyer pages, the console and the 3D views.

export type Stages = Partial<Record<'foundation' | 'structure' | 'masonry' | 'mep' | 'finishing' | 'facade', number>>;
export type TowerLike = { id: string; code: string; name: string; floors: number; units_per_floor: number; slabs_cast: number; stages: Stages | unknown; expected_completion: string | null; position?: unknown; floor_height_m?: number | string };
export type Snapshot = { created_at: string; tower_snapshot: unknown };

export const STAGE_LABEL = { foundation: 'Foundation', structure: 'Structure (slabs)', masonry: 'Blockwork and plaster', mep: 'Electrical and plumbing', finishing: 'Flooring and finishing', facade: 'Facade and paint' } as const;
export const STAGE_WEIGHT = { foundation: 10, structure: 35, masonry: 15, mep: 15, finishing: 20, facade: 5 } as const;
export type StageKey = keyof typeof STAGE_WEIGHT;

export const stagesOf = (t: TowerLike): Required<Stages> => {
  const s = (t.stages || {}) as Stages;
  return { foundation: Number(s.foundation ?? 0), structure: Number(s.structure ?? (100 * t.slabs_cast) / t.floors), masonry: Number(s.masonry ?? 0), mep: Number(s.mep ?? 0), finishing: Number(s.finishing ?? 0), facade: Number(s.facade ?? 0) };
};
export const towerPercent = (t: TowerLike) => {
  const s = stagesOf(t);
  return Math.round((Object.keys(STAGE_WEIGHT) as StageKey[]).reduce((a, k) => a + s[k] * STAGE_WEIGHT[k], 0)) / 100;
};

/** How many floors have each stage done (work moves bottom-up). */
export function floorsDone(t: TowerLike) {
  const s = stagesOf(t);
  return { slabs: t.slabs_cast, masonry: Math.floor((t.floors * s.masonry) / 100), mep: Math.floor((t.floors * s.mep) / 100), finishing: Math.floor((t.floors * s.finishing) / 100), facade: Math.floor((t.floors * s.facade) / 100) };
}

export type FloorStage = 'not_started' | 'structure' | 'masonry' | 'services' | 'ready';
export const FLOOR_STAGE: Record<FloorStage, { label: string; now: string; next: string; pct: number }> = {
  not_started: { label: 'Not started', now: 'The slab for this floor has not been cast yet.', next: 'Slab casting', pct: 0 },
  structure: { label: 'Slab cast', now: 'The floor slab and columns are in place. The flat is open concrete for now.', next: 'Blockwork walls', pct: 35 },
  masonry: { label: 'Walls up', now: 'Blockwork walls are built and being plastered. Door and window openings are visible.', next: 'Electrical and plumbing', pct: 55 },
  services: { label: 'Services in', now: 'Wiring conduits and plumbing are in. Walls are plastered; floors are screeded.', next: 'Flooring, doors and windows', pct: 75 },
  ready: { label: 'Interiors done', now: 'Flooring, doors, windows and paint are done on this floor.', next: 'Handover', pct: 100 },
};

export function floorStage(t: TowerLike, floor: number): FloorStage {
  const d = floorsDone(t);
  if (floor > d.slabs) return 'not_started';
  if (floor <= d.finishing) return 'ready';
  if (floor <= d.mep) return 'services';
  if (floor <= d.masonry) return 'masonry';
  return 'structure';
}

/** Pace of each stage (percent or slabs per day) from the tower's update history; falls back to sensible defaults. */
export function towerPace(t: TowerLike, snaps: Snapshot[], today = new Date()) {
  const pts = snaps.map((s) => ({ t: new Date(s.created_at).getTime(), s: s.tower_snapshot as { slabs_cast?: number; stages?: Stages } | null }))
    .filter((p) => p.s).sort((a, b) => a.t - b.t);
  const now = { t: today.getTime(), slabs: t.slabs_cast, st: stagesOf(t) };
  const first = pts[0];
  const days = first ? Math.max(14, (now.t - first.t) / 86400000) : 0;
  const rate = (k: StageKey, fallback: number) => {
    if (!first) return fallback;
    const was = Number(first.s?.stages?.[k] ?? 0), is = now.st[k];
    const r = (is - was) / days;
    return r > 0.01 ? r : fallback;
  };
  const slabRate = first ? Math.max(0.01, (now.slabs - Number(first.s?.slabs_cast ?? now.slabs)) / days) : 1 / 28;
  return {
    slabsPerDay: slabRate > 0.0101 ? slabRate : 1 / 28,
    pctPerDay: { masonry: rate('masonry', 0.18), mep: rate('mep', 0.15), finishing: rate('finishing', 0.12), facade: rate('facade', 0.1), foundation: 1, structure: (100 / t.floors) * (slabRate || 1 / 28) } as Record<StageKey, number>,
  };
}

const addDays = (d: Date, n: number) => new Date(d.getTime() + Math.max(0, n) * 86400000);

/** When will this floor reach each stage, at the current pace. */
export function floorForecast(t: TowerLike, floor: number, pace: ReturnType<typeof towerPace>, today = new Date()) {
  const d = floorsDone(t), s = stagesOf(t);
  const atPct = (k: 'masonry' | 'mep' | 'finishing', floorsNeeded: number) => {
    const pctNeeded = (100 * floorsNeeded) / t.floors;
    return s[k] >= pctNeeded ? null : addDays(today, (pctNeeded - s[k]) / pace.pctPerDay[k]);
  };
  return {
    slab: floor <= d.slabs ? null : addDays(today, (floor - d.slabs) / pace.slabsPerDay),
    masonry: atPct('masonry', floor), services: atPct('mep', floor), ready: atPct('finishing', floor),
    tower: s.finishing >= 100 ? null : addDays(today, (100 - s.finishing) / pace.pctPerDay.finishing),
  };
}

export type PlanStep = { label: string; pct: number; note?: string; days?: number; stage?: StageKey; slab?: number | 'top' };
export type StepStatus = { label: string; pct: number; note?: string; reached: boolean; expected: Date | null };

/** Construction-linked plan: which stages are reached in this tower and when the rest are expected. */
export function planStatus(plan: PlanStep[], t: TowerLike, pace: ReturnType<typeof towerPace>, bookedAt: Date | null, today = new Date()): StepStatus[] {
  const s = stagesOf(t);
  return plan.map((p, i) => {
    if (i === 0) return { ...p, reached: true, expected: null };
    if (p.days != null) { const due = bookedAt ? addDays(bookedAt, p.days) : null; return { ...p, reached: !!due && due <= today, expected: due }; }
    if (p.slab != null) {
      const n = p.slab === 'top' ? t.floors : Math.min(p.slab, t.floors);
      return { ...p, reached: t.slabs_cast >= n, expected: t.slabs_cast >= n ? null : addDays(today, (n - t.slabs_cast) / pace.slabsPerDay) };
    }
    if (p.stage) {
      const v = s[p.stage];
      return { ...p, reached: v >= 100, expected: v >= 100 ? null : addDays(today, (100 - v) / (pace.pctPerDay[p.stage] || 0.1)) };
    }
    // possession: after finishing
    return { ...p, reached: false, expected: s.finishing >= 100 ? today : addDays(today, (100 - s.finishing) / pace.pctPerDay.finishing + 45) };
  });
}

export type Pricing = { floor_rise?: number; plc?: Record<string, number>; corner?: number; maintenance?: number; car_parks?: Record<string, number> };

/** Price build-up of a flat: base rate, floor rise, preferred location, corner. */
export function priceBreakup(unit: { floor: number | null; view: string | null; is_corner: boolean; price: number | string }, type: { super_sqft: number | string; base_rate: number | string }, pricing: Pricing | null) {
  const sq = Number(type.super_sqft), base = Number(type.base_rate);
  const fr = (pricing?.floor_rise ?? 0) * Math.max(0, (unit.floor ?? 1) - 1);
  const plc = pricing?.plc?.[unit.view || ''] ?? 0, corner = unit.is_corner ? pricing?.corner ?? 0 : 0;
  const rate = base + fr + plc + corner;
  const list = Math.round((sq * rate) / 1000) * 1000;
  const price = Number(unit.price);
  return { sq, base, floorRise: fr, plc, corner, rate, list, price, revision: list > 0 ? Math.round(((price - list) / list) * 1000) / 10 : 0, effectiveRate: Math.round(price / sq) };
}

/** Gross and net rental yield from a stated rent assumption (₹ per sq ft per month, on super area). */
export function rentalYield(price: number, superSqft: number, rentPerSqft: number | null, maintenancePerSqft = 3.5) {
  if (!rentPerSqft) return null;
  const rent = Math.round((rentPerSqft * superSqft) / 500) * 500;
  const gross = (rent * 12) / price;
  const net = (rent * 11 - maintenancePerSqft * superSqft * 12 - rent * 0.5) / price; // one month vacancy, half a month for repairs and brokerage
  return { rent, gross: Math.round(gross * 1000) / 10, net: Math.round(net * 1000) / 10, maintenance: Math.round(maintenancePerSqft * superSqft) };
}

export const unitLabel = (p: { kind?: string | null; plot_number: string }) => (p.kind === 'flat' ? `Flat ${p.plot_number}` : `Plot ${p.plot_number}`);
export const ordinal = (n: number) => { const s = ['th', 'st', 'nd', 'rd'], v = n % 100; return n + (s[(v - 20) % 10] || s[v] || s[0]!); };
export const FACING_DEG: Record<string, number> = { north: 0, north_east: 45, east: 90, south_east: 135, south: 180, south_west: 225, west: 270, north_west: 315 };
