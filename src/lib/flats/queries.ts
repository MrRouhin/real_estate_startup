import 'server-only';
import type { createClient } from '@/lib/supabase/server';
import type { Layout } from './layout';
import type { PlanStep, Pricing, Snapshot, TowerLike } from './tower';

type ServerSupabase = Awaited<ReturnType<typeof createClient>>;

export const FLAT_FIELDS = 'id, plot_number, status, area_sqft, facing, is_corner, price, held_until, project_id, org_id, kind, tower_id, floor, stack, unit_type_id, view, mirror' as const;

export type Tower = TowerLike & { position: { x: number; z: number; rot: number } | null; floor_height_m: number; sort_order: number };
export type UnitType = {
  id: string; code: string; name: string; bedrooms: number; bathrooms: number; balconies: number;
  carpet_sqft: number; builtup_sqft: number; super_sqft: number; base_rate: number; layout: Layout; description: string | null;
};
export type FlatRow = {
  id: string; plot_number: string; status: 'available' | 'held' | 'booked' | 'sold' | 'blocked'; area_sqft: number; facing: string | null; is_corner: boolean;
  price: number; held_until: string | null; project_id: string; org_id: string; kind: string; tower_id: string | null; floor: number | null; stack: number | null;
  unit_type_id: string | null; view: string | null; mirror: boolean;
};

const num = (v: unknown) => Number(v ?? 0);

export function asTower(t: Record<string, unknown>): Tower {
  return { ...(t as unknown as Tower), floors: num(t.floors), units_per_floor: num(t.units_per_floor), slabs_cast: num(t.slabs_cast), floor_height_m: num(t.floor_height_m) || 3, sort_order: num(t.sort_order) };
}
export function asUnitType(u: Record<string, unknown>): UnitType {
  return { ...(u as unknown as UnitType), carpet_sqft: num(u.carpet_sqft), builtup_sqft: num(u.builtup_sqft), super_sqft: num(u.super_sqft), base_rate: num(u.base_rate) };
}
export function asFlat(p: Record<string, unknown>): FlatRow {
  return { ...(p as unknown as FlatRow), price: num(p.price), area_sqft: num(p.area_sqft), floor: p.floor == null ? null : num(p.floor), stack: p.stack == null ? null : num(p.stack) };
}

/** Towers, unit types, flats and per-tower construction history for an apartment project. */
export async function loadApartments(supabase: ServerSupabase, projectId: string) {
  const [{ data: towers }, { data: types }, { data: flats }, { data: updates }] = await Promise.all([
    supabase.from('towers').select('*').eq('project_id', projectId).order('sort_order'),
    supabase.from('unit_types').select('*').eq('project_id', projectId).order('code'),
    supabase.from('plots').select(FLAT_FIELDS).eq('project_id', projectId).eq('kind', 'flat').order('plot_number'),
    supabase.from('construction_updates').select('id, title, body, created_at, tower_id, tower_snapshot, progress_percent, photo_paths')
      .eq('project_id', projectId).not('tower_id', 'is', null).order('created_at', { ascending: false }),
  ]);
  const T = (towers || []).map((t) => asTower(t as Record<string, unknown>));
  const snaps: Record<string, Snapshot[]> = {};
  for (const u of updates || []) if (u.tower_id) (snaps[u.tower_id] ||= []).push({ created_at: u.created_at, tower_snapshot: u.tower_snapshot });
  return {
    towers: T,
    types: (types || []).map((u) => asUnitType(u as Record<string, unknown>)),
    flats: (flats || []).map((p) => asFlat(p as Record<string, unknown>)),
    updates: updates || [],
    snaps,
  };
}

export const projectPlan = (p: { payment_plan?: unknown } | null, orgPlan?: unknown) => ((p?.payment_plan ?? orgPlan ?? []) as PlanStep[]);
export const projectPricing = (p: { pricing?: unknown } | null) => (p?.pricing ?? null) as Pricing | null;
