// "Near your plot": the parts of the layout that matter to one buyer (their road, its drain and
// lights, the park and clubhouse if close), with progress and whether each is on plan.
import type { SiteLayout } from '@/lib/types';
import { plotGeo, metresPerUnit, vicinity } from './geo';
import { STATE_LABEL, type WPState } from './plan';

export type MilestoneHealth = { planned: number; actual: number; state: WPState; forecast: string | null; due: string | null };
export type ProjectSummary = {
  updated_at: string; today: string; planned: number; actual: number; state: WPState; forecast: string | null; behind: number; atRisk: number;
  milestones: Record<string, MilestoneHealth>;
};

export type NearItem = { key: string; label: string; distance: string | null; progress: number; state: WPState | null; stateLabel: string | null; forecast: string | null; why: string };

const month = (d: string | null) => d ? new Date(d).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' }) : null;

export function nearPlot(
  plot: { shape_path: string | null; area_sqft: number | string },
  allPlots: { shape_path: string | null; area_sqft: number | string }[],
  layout: SiteLayout, milestones: { key: string; name: string; progress: number | string }[], summary: ProjectSummary | null,
) {
  const g = plotGeo(plot.shape_path);
  if (!g) return null;
  const v = vicinity(g, layout, metresPerUnit(allPlots));
  const ms = new Map(milestones.map((m) => [m.key, m]));
  const item = (key: string, label: string, distance: string | null, why: string): NearItem | null => {
    const m = ms.get(key); if (!m) return null;
    const h = summary?.milestones?.[key] ?? null;
    return { key, label, distance, progress: Number(m.progress), state: h?.state ?? null, stateLabel: h ? STATE_LABEL[h.state] : null, forecast: h?.forecast ?? null, why };
  };
  const road = v.mainRoad ? 'the 40 ft main road' : 'the 30 ft road';
  const items = [
    item('roads', `Road in front of your plot (${v.mainRoad ? '40 ft main road' : '30 ft road'})`, null, 'Your access and the first thing a bank valuer sees.'),
    item('drains', 'Storm water drain along your road', null, 'Keeps your plot dry in the monsoon.'),
    item('electrical', 'Street lights and power cabling', null, 'Needed before you can apply for a power connection.'),
    item('water_tank', 'Overhead water tank', v.tankM != null ? `${v.tankM} m away` : null, 'Supplies water to every plot.'),
    v.parkM != null && v.parkM <= 160 ? item('park', v.facesPark ? 'The park your plot faces' : 'Central park', `${v.parkM} m away`, v.facesPark ? 'Park-facing plots usually resell faster.' : 'Close enough to walk.') : null,
    v.clubhouseM != null && v.clubhouseM <= 260 ? item('clubhouse', 'Clubhouse', `${v.clubhouseM} m away`, 'Gym, hall and pool for residents.') : null,
    item('compound_wall', 'Compound wall and gate', v.gateM != null ? `gate ${v.gateM} m away` : null, 'Security for the whole layout.'),
  ].filter(Boolean) as NearItem[];

  const roads = items.find((i) => i.key === 'roads'), drains = items.find((i) => i.key === 'drains');
  const behind = items.filter((i) => i.state === 'behind' || i.state === 'at_risk');
  const SHORT: Record<string, string> = { roads: 'your road', drains: 'the drain', electrical: 'the street lights', water_tank: 'the water tank', park: 'the park', clubhouse: 'the clubhouse', compound_wall: 'the compound wall' };
  const list = (xs: string[]) => xs.length <= 1 ? xs.join('') : xs.slice(0, -1).join(', ') + ' and ' + xs.at(-1);
  const latest = behind.map((b) => b.forecast).filter(Boolean).sort().at(-1) ?? null;
  const parts = [
    roads ? `${road[0]!.toUpperCase() + road.slice(1)} in front of your plot is ${Math.round(roads.progress)}% done${drains ? ` and its drain ${Math.round(drains.progress)}%` : ''}.` : '',
    behind.length ? `${(s => s[0]!.toUpperCase() + s.slice(1))(list(behind.map((b) => SHORT[b.key] || b.label)))} ${behind.length > 1 ? 'are' : 'is'} running behind plan${latest ? `; at the current pace ${behind.length > 1 ? 'the last of these finishes' : 'it finishes'} around ${month(latest)}` : ''}.` : summary ? 'Everything near your plot is on plan.' : '',
  ].filter(Boolean);
  return { items, headline: parts.join(' '), vicinity: v };
}
