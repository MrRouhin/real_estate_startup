// Dream-home preview: turn "3BHK duplex with car parking and a garden" into a house that fits
// this plot, with setbacks, floor areas and an indicative build cost. Indicative only: the
// exact setbacks and FAR come from the sanctioned plan and the local authority.

export type Finish = 'basic' | 'standard' | 'premium';
export type HouseSpec = { bedrooms: number; floors: number; parking: boolean; garden: boolean; terrace: boolean; finish: Finish; rental: boolean; vastu: boolean };

export const DEFAULT_SPEC: HouseSpec = { bedrooms: 3, floors: 2, parking: true, garden: false, terrace: true, finish: 'standard', rental: false, vastu: false };

/** Per sq ft build cost in Bengaluru, 2026 (excludes land, interiors, landscaping). */
export const COST_PER_SQFT: Record<Finish, [number, number]> = { basic: [2000, 2400], standard: [2400, 3050], premium: [3150, 4700] };
export const FAR = 1.75;

export function parseHouse(text: string, prev: HouseSpec = DEFAULT_SPEC): HouseSpec {
  const s = text.toLowerCase();
  const r: HouseSpec = { ...prev };
  const bhk = s.match(/(\d)\s*-?\s*bhk|(\d)\s*bed(room)?s?/);
  if (bhk) r.bedrooms = Math.max(1, Math.min(6, Number(bhk[1] || bhk[2])));
  if (/duplex|two[\s-]?(floor|storey|story)|g\s*\+\s*1|2\s*floors?/.test(s)) r.floors = 2;
  if (/triplex|three[\s-]?(floor|storey|story)|g\s*\+\s*2|3\s*floors?/.test(s)) r.floors = 3;
  if (/single[\s-]?(floor|storey|story)|ground floor only|bungalow|g\s*\+\s*0|one floor/.test(s)) r.floors = 1;
  if (/park(ing)?\s*(for|space)|car\s*park|garage|stilt|car/.test(s)) r.parking = true;
  if (/no (car|parking)/.test(s)) r.parking = false;
  if (/garden|lawn|green|backyard|plants/.test(s)) r.garden = true;
  if (/terrace|roof\s*top|sit[\s-]?out/.test(s)) r.terrace = true;
  if (/premium|luxury|italian marble|high[\s-]?end/.test(s)) r.finish = 'premium';
  else if (/basic|budget|economy|simple/.test(s)) r.finish = 'basic';
  else if (/standard|mid/.test(s)) r.finish = 'standard';
  if (/rent(al)?|tenant|let out|income/.test(s)) { r.rental = true; if (r.floors < 2) r.floors = 2; }
  if (/vastu|vaastu/.test(s)) r.vastu = true;
  return r;
}

const FT = 0.3048;

/** Front setback by site depth and side/rear by site area (BBMP-style tables; indicative). */
export function setbacksFt(widthFt: number, depthFt: number) {
  const depthM = depthFt * FT, areaM2 = widthFt * depthFt * FT * FT;
  const frontM = depthM <= 9 ? 1 : depthM <= 12.5 ? 1.5 : depthM <= 18 ? 3 : depthM <= 24 ? 4 : 5;
  const sideM = areaM2 < 90 ? 0.75 : areaM2 <= 300 ? 1 : 1.5;
  const rearM = areaM2 < 90 ? 1 : areaM2 <= 300 ? 1.5 : 2;
  const r = (m: number) => Math.round((m / FT) * 2) / 2;
  return { front: r(frontM), rear: r(rearM), side: r(sideM) };
}

export function dims(plot: { dimensions?: string | null; area_sqft: number | string }) {
  const m = (plot.dimensions || '').match(/(\d+(?:\.\d+)?)\s*[x×*]\s*(\d+(?:\.\d+)?)/i);
  if (m) return { w: Number(m[1]), d: Number(m[2]) };
  const a = Number(plot.area_sqft); const w = Math.round(Math.sqrt(a / 1.33)); return { w, d: Math.round(a / w) };
}

export type HousePlan = {
  plotW: number; plotD: number; setbacks: { front: number; rear: number; side: number };
  footprint: { w: number; d: number; x: number; z: number }; floors: number; perFloor: number; builtUp: number; farUsed: number; farMax: number;
  parking: { w: number; d: number } | null; garden: { w: number; d: number } | null;
  rooms: { floor: number; label: string }[]; cost: { low: number; high: number; perSqft: [number, number] }; months: [number, number]; notes: string[];
};

export function planHouse(plot: { dimensions?: string | null; area_sqft: number | string; facing?: string | null; is_corner?: boolean }, spec: HouseSpec): HousePlan {
  const { w: plotW, d: plotD } = dims(plot);
  const sb = setbacksFt(plotW, plotD);
  const notes: string[] = [];
  let fw = plotW - sb.side * (plot.is_corner ? 3 : 2), fd = plotD - sb.front - sb.rear;
  if (spec.garden) { const g = Math.min(8, Math.round(fd * 0.15)); fd -= g; }
  fw = Math.max(10, fw); fd = Math.max(12, fd);
  const plotArea = plotW * plotD;
  const maxBuilt = Math.floor(plotArea * FAR);
  let floors = spec.floors;
  // a stilt floor for parking is common on small sites; we keep parking in the front setback + porch instead
  const perFloor = Math.round(fw * fd);
  while (floors > 1 && perFloor * floors > maxBuilt * 1.02) floors--;
  if (floors < spec.floors) notes.push(`Limited to ${floors} floor${floors > 1 ? 's' : ''}: ${spec.floors} would exceed the floor-area ratio (≈${FAR} × plot area).`);
  const needed = 450 + spec.bedrooms * 190 + (spec.rental ? 650 : 0);
  if (perFloor * floors < needed * 0.85) notes.push(`${spec.bedrooms} bedrooms on ${perFloor * floors} sq ft will feel tight; consider ${Math.max(1, spec.bedrooms - 1)} BHK or a bigger plot.`);
  const builtUp = perFloor * floors + (spec.terrace ? Math.round(perFloor * 0.12) : 0); // head room / staircase on terrace
  const cost = COST_PER_SQFT[spec.finish];
  const rooms: { floor: number; label: string }[] = [];
  let beds = spec.bedrooms;
  for (let f = 0; f < floors; f++) {
    if (f === 0) { rooms.push({ floor: 0, label: 'Living, dining, kitchen' + (spec.vastu ? ' (kitchen south-east)' : '') }); const b = Math.min(beds, floors > 1 ? 1 : beds); if (b) { rooms.push({ floor: 0, label: `${b} bedroom${b > 1 ? 's' : ''}${floors > 1 ? ' (for parents)' : ''}` }); beds -= b; } }
    else if (spec.rental && f === floors - 1) rooms.push({ floor: f, label: 'Rental unit (1–2 BHK, separate entrance)' });
    else { const b = Math.ceil(beds / Math.max(1, floors - f - (spec.rental ? 1 : 0))); if (b > 0) { rooms.push({ floor: f, label: `${b} bedroom${b > 1 ? 's' : ''}, family lounge` }); beds -= b; } }
  }
  if (beds > 0) rooms.push({ floor: floors - 1, label: `+${beds} bedroom${beds > 1 ? 's' : ''}` });
  if (spec.terrace) rooms.push({ floor: floors, label: 'Open terrace' + (spec.garden ? '' : ' (space for a terrace garden)') });
  if (spec.vastu) notes.push(plot.facing && /east|north/.test(plot.facing) ? `${plot.facing.replace('_', '-')} facing suits a vastu layout: main door ${plot.facing.includes('east') ? 'east' : 'north'}, master bedroom south-west.` : 'For vastu, keep the master bedroom south-west and the kitchen south-east; the main door can face your road with a vastu-compliant position.');
  if (spec.parking && sb.front < 9) notes.push(`Front setback of ${sb.front} ft is short for a car; plan a porch under the first floor or a stilt.`);
  notes.push('Setbacks and floor-area ratio here are indicative (BBMP-style tables). The sanctioned plan from your architect is what counts.');
  return {
    plotW, plotD, setbacks: sb, footprint: { w: fw, d: fd, x: plot.is_corner ? sb.side * 2 : sb.side, z: sb.front },
    floors, perFloor, builtUp, farUsed: Math.round(((perFloor * floors) / plotArea) * 100) / 100, farMax: FAR,
    parking: spec.parking ? { w: Math.min(10, fw * 0.4), d: Math.max(sb.front, 16) } : null,
    garden: spec.garden ? { w: fw, d: Math.min(8, Math.round((plotD - sb.front - sb.rear) * 0.15)) } : null,
    rooms, cost: { low: Math.round((builtUp * cost[0]) / 10000) * 10000, high: Math.round((builtUp * cost[1]) / 10000) * 10000, perSqft: cost },
    months: [6 + floors * 2, 9 + floors * 3], notes,
  };
}
