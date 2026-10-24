// Where a plot sits on the layout: next to which roads, how far from the park and clubhouse.
import { bbox, pathToPoints } from '@/lib/site';
import type { Rect, SiteLayout } from '@/lib/types';

export type PlotGeo = { cx: number; cy: number; box: { x: number; y: number; w: number; h: number } };
export const plotGeo = (shape_path: string | null): PlotGeo | null => {
  const pts = pathToPoints(shape_path);
  if (pts.length < 3) return null;
  const b = bbox(pts);
  return { cx: b.cx, cy: b.cy, box: { x: b.x, y: b.y, w: b.w, h: b.h } };
};

/** Gap between two rectangles (0 when they touch or overlap). */
export function rectGap(a: { x: number; y: number; w: number; h: number }, b: { x: number; y: number; w: number; h: number }) {
  const dx = Math.max(0, Math.max(a.x, b.x) - Math.min(a.x + a.w, b.x + b.w));
  const dy = Math.max(0, Math.max(a.y, b.y) - Math.min(a.y + a.h, b.y + b.h));
  return Math.hypot(dx, dy);
}

/** Metres per layout unit, estimated from the plots' real areas vs their drawn size. */
export function metresPerUnit(plots: { shape_path: string | null; area_sqft: number | string }[]) {
  let real = 0, drawn = 0;
  for (const p of plots) { const g = plotGeo(p.shape_path); if (!g) continue; real += Number(p.area_sqft) * 0.0929; drawn += g.box.w * g.box.h; }
  return drawn > 0 ? Math.sqrt(real / drawn) : 0.3;
}

export type Vicinity = { roads: (Rect & { gap: number })[]; mainRoad: boolean; parkM: number | null; clubhouseM: number | null; tankM: number | null; gateM: number | null; facesPark: boolean };

export function vicinity(g: PlotGeo, layout: SiteLayout, mpu: number): Vicinity {
  const roads = layout.roads.map((r) => ({ ...r, gap: rectGap(g.box, r) })).filter((r) => r.gap < 14).sort((a, b) => a.gap - b.gap);
  const m = (u: number) => Math.round(u * mpu);
  const park = layout.park ? rectGap(g.box, layout.park) : null;
  const club = layout.clubhouse ? rectGap(g.box, layout.clubhouse) : null;
  const tank = layout.water_tank ? Math.hypot(g.cx - layout.water_tank.x, g.cy - layout.water_tank.y) : null;
  const gate = layout.gate ? Math.hypot(g.cx - layout.gate.x, g.cy - layout.gate.y) : null;
  return {
    roads, mainRoad: roads.some((r) => r.main), parkM: park == null ? null : m(park), clubhouseM: club == null ? null : m(club),
    tankM: tank == null ? null : m(tank), gateM: gate == null ? null : m(gate), facesPark: park != null && park < 45,
  };
}
