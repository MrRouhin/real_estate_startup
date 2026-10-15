// Shared knowledge about plots, statuses and the site plan, used by both the
// 2D map and the 3D scene so they always agree.
import type { MilestoneKey, PlotShape, PlotStatus, Progress, SiteLayout } from './types';

export const STATUS_COLOR: Record<PlotStatus, string> = {
  available: '#2f9e5c',
  held: '#e0a21b',
  booked: '#3a67d4',
  sold: '#8b939b',
  blocked: '#d2504b',
};
export const STATUS_LABEL: Record<PlotStatus, string> = {
  available: 'Available', held: 'Being booked', booked: 'Booked', sold: 'Sold', blocked: 'Blocked',
};

/** A held plot whose hold ran out is effectively available (the database frees it every minute). */
export function liveStatus(p: Pick<PlotShape, 'status' | 'held_until'>): PlotStatus {
  if (p.status === 'held' && p.held_until && new Date(p.held_until).getTime() < Date.now()) return 'available';
  return p.status;
}

export const MILESTONES: { key: MilestoneKey; label: string; color: string }[] = [
  { key: 'compound_wall', label: 'Compound wall', color: '#b08d57' },
  { key: 'roads', label: 'Roads', color: '#4b5563' },
  { key: 'drains', label: 'Drains', color: '#2b7a9b' },
  { key: 'electrical', label: 'Street lights', color: '#e0a21b' },
  { key: 'water_tank', label: 'Water tank', color: '#3a67d4' },
  { key: 'park', label: 'Park', color: '#2f9e5c' },
  { key: 'clubhouse', label: 'Clubhouse', color: '#8b5cf6' },
];

export function progressFromMilestones(ms: { key: string; progress: number | string }[]): Progress {
  const out: Progress = {};
  for (const m of ms) out[m.key as MilestoneKey] = Number(m.progress);
  return out;
}

/** Parse an SVG path made of M/L/H/V/Z (absolute or relative) into polygon points. */
export function pathToPoints(d: string | null | undefined): [number, number][] {
  if (!d) return [];
  const tokens = d.match(/[MLHVZmlhvz]|-?\d*\.?\d+(?:e-?\d+)?/g) || [];
  const pts: [number, number][] = [];
  let x = 0, y = 0, cmd = 'M', i = 0;
  const num = () => Number(tokens[i++]);
  while (i < tokens.length) {
    const t = tokens[i]!;
    if (/[MLHVZmlhvz]/.test(t)) { cmd = t; i++; if (cmd === 'Z' || cmd === 'z') continue; }
    switch (cmd) {
      case 'M': case 'L': x = num(); y = num(); pts.push([x, y]); if (cmd === 'M') cmd = 'L'; break;
      case 'm': case 'l': x += num(); y += num(); pts.push([x, y]); if (cmd === 'm') cmd = 'l'; break;
      case 'H': x = num(); pts.push([x, y]); break;
      case 'h': x += num(); pts.push([x, y]); break;
      case 'V': y = num(); pts.push([x, y]); break;
      case 'v': y += num(); pts.push([x, y]); break;
      default: i++;
    }
  }
  if (pts.length > 1) {
    const [a, b] = [pts[0]!, pts[pts.length - 1]!];
    if (a[0] === b[0] && a[1] === b[1]) pts.pop();
  }
  return pts;
}

export function bbox(points: [number, number][]) {
  const xs = points.map((p) => p[0]), ys = points.map((p) => p[1]);
  const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys);
  return { x: minX, y: minY, w: maxX - minX, h: maxY - minY, cx: (minX + maxX) / 2, cy: (minY + maxY) / 2 };
}

export const DEFAULT_LAYOUT: SiteLayout = {
  viewBox: [0, 0, 1000, 700],
  boundary: { x: 20, y: 20, w: 960, h: 660 },
  roads: [],
};

export function asLayout(raw: unknown): SiteLayout {
  if (raw && typeof raw === 'object' && 'boundary' in (raw as object)) return raw as SiteLayout;
  return DEFAULT_LAYOUT;
}

export type PlotFilter = { size?: number | null; facing?: string | null; corner?: boolean; available?: boolean; maxPrice?: number | null };
export function matchesFilter(p: PlotShape, f: PlotFilter) {
  return (!f.size || Number(p.area_sqft) === f.size)
    && (!f.facing || p.facing === f.facing)
    && (!f.corner || p.is_corner)
    && (!f.available || liveStatus(p) === 'available')
    && (!f.maxPrice || Number(p.price) <= f.maxPrice);
}

export const rate = (p: { price: number | string; area_sqft: number | string }) => Math.round(Number(p.price) / Number(p.area_sqft));
