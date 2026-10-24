// Buyer matchmaker: turn what a buyer says into requirements, then rank the available plots
// with reasons. The ranking is deterministic; the AI (when on) only extracts requirements
// from free text and writes the reply.
import { liveStatus, rate } from '@/lib/site';
import type { PlotShape, SiteLayout } from '@/lib/types';
import { metresPerUnit, plotGeo, vicinity, type Vicinity } from './geo';
import { t, type Lang } from './i18n';

export type Requirements = {
  budgetMin?: number | null; budgetMax?: number | null;
  sizeMin?: number | null; sizeMax?: number | null;
  facing?: string[] | null; corner?: boolean | null; vastu?: boolean | null;
  nearPark?: boolean | null; mainRoad?: boolean | null; quiet?: boolean | null; nearClubhouse?: boolean | null;
  purpose?: 'home' | 'investment' | null; bedrooms?: number | null;
};

const FACINGS: [RegExp, string][] = [
  [/north[\s-]?east|ಈಶಾನ್ಯ|उत्तर[\s-]?पूर्व/, 'north_east'], [/north[\s-]?west|ವಾಯವ್ಯ|उत्तर[\s-]?पश्चिम/, 'north_west'],
  [/south[\s-]?east|ಆಗ್ನೇಯ|दक्षिण[\s-]?पूर्व/, 'south_east'], [/south[\s-]?west|ನೈಋತ್ಯ|दक्षिण[\s-]?पश्चिम/, 'south_west'],
  [/\beast\b|ಪೂರ್ವ|पूर्व/, 'east'], [/\bwest\b|ಪಶ್ಚಿಮ|पश्चिम/, 'west'], [/\bnorth\b|ಉತ್ತರ|उत्तर/, 'north'], [/\bsouth\b|ದಕ್ಷಿಣ|दक्षिण/, 'south'],
];

function money(n: number, unit: string) {
  return /cr|crore|करोड़|ಕೋಟಿ/.test(unit) ? n * 1e7 : n * 1e5;
}

/** Rules-based requirement extraction (English plus common Hindi/Kannada words). */
export function parseRequirements(text: string, prev: Requirements = {}): Requirements {
  const s = ' ' + text.toLowerCase().replace(/,(?=\d{2,3}\b)/g, '') + ' ';
  const r: Requirements = { ...prev };
  const U = '(lakhs?|lacs?|l\\b|cr\\b|crores?|लाख|करोड़|ಲಕ್ಷ|ಕೋಟಿ)';
  const range = s.match(new RegExp(`(\\d+(?:\\.\\d+)?)\\s*(?:${U})?\\s*(?:-|to|and|से|ರಿಂದ)\\s*(\\d+(?:\\.\\d+)?)\\s*${U}`));
  const single = s.match(new RegExp(`(under|below|within|max(?:imum)?|upto|up to|less than|around|about|approx|above|over|more than|at least|तक|ಒಳಗೆ)?\\s*₹?\\s*(\\d+(?:\\.\\d+)?)\\s*${U}`));
  const rupees = s.match(/₹\s*(\d{6,9})|\b(\d{6,9})\s*(?:rs|rupees)/);
  if (range) {
    const unit = range[4] || range[2] || 'lakh';
    r.budgetMin = money(Number(range[1]), range[2] || unit); r.budgetMax = money(Number(range[3]), unit);
  } else if (single) {
    const v = money(Number(single[2]), single[3]!);
    const after = s.slice((single.index ?? 0) + single[0].length, (single.index ?? 0) + single[0].length + 12);
    const q = single[1] || (/^\s*(तक|ಒಳಗೆ|max|or less|maximum)/.test(after) ? 'under' : '');
    if (/above|over|more than|at least/.test(q)) { r.budgetMin = v; r.budgetMax = null; }
    else if (/around|about|approx/.test(q)) { r.budgetMin = v * 0.9; r.budgetMax = v * 1.1; }
    else { r.budgetMax = v; if (!/under|below|within|max|upto|up to|less|तक|ಒಳಗೆ/.test(q)) r.budgetMin = v * 0.75; }
  } else if (rupees) { r.budgetMax = Number(rupees[1] || rupees[2]); r.budgetMin = r.budgetMax * 0.75; }

  const dims = s.match(/(\d{2})\s*(?:x|×|\*|by)\s*(\d{2,3})\b/);
  const sqft = s.match(/(\d{3,4})\s*(?:sq\.?\s*ft|sqft|sft|square\s*feet|sq\s*feet)/);
  if (dims) { const a = Number(dims[1]) * Number(dims[2]); r.sizeMin = a * 0.95; r.sizeMax = a * 1.05; }
  else if (sqft) { const a = Number(sqft[1]); r.sizeMin = a * 0.9; r.sizeMax = a * 1.1; }
  if (/\b(big|large|spacious)\b/.test(s) && !r.sizeMin) r.sizeMin = 1500;
  if (/\b(small|compact)\b/.test(s) && !r.sizeMax) r.sizeMax = 1250;
  const bhk = s.match(/(\d)\s*bhk/);
  if (bhk) { r.bedrooms = Number(bhk[1]); if (!r.sizeMin) r.sizeMin = r.bedrooms >= 4 ? 2000 : r.bedrooms === 3 ? 1200 : 1000; }

  const facing = FACINGS.filter(([re]) => re.test(s)).map(([, f]) => f);
  const simple = facing.filter((f) => !f.includes('_'));
  const compound = facing.filter((f) => f.includes('_'));
  if (compound.length || simple.length) r.facing = compound.length ? compound : simple;
  if (/vastu|vaastu|वास्तु|ವಾಸ್ತು/.test(s)) { r.vastu = true; if (!r.facing) r.facing = ['east', 'north', 'north_east']; }
  if (/corner|कॉर्नर|ಮೂಲೆ/.test(s)) r.corner = true;
  if (/park|garden|green|पार्क|बगीचा|ಪಾರ್ಕ್|ಉದ್ಯಾನ/.test(s)) r.nearPark = true;
  if (/main road|40\s*ft|wide road|मुख्य सड़क|ಮುಖ್ಯ ರಸ್ತೆ/.test(s)) r.mainRoad = true;
  if (/quiet|peaceful|calm|silent|away from (the )?(main )?road|शांत|ಶಾಂತ/.test(s)) { r.quiet = true; r.mainRoad = false; }
  if (/club\s?house|gym|pool|क्लब|ಕ್ಲಬ್/.test(s)) r.nearClubhouse = true;
  if (/invest|apprecia|resale|returns|rental|निवेश|ಹೂಡಿಕೆ/.test(s)) r.purpose = 'investment';
  else if (/\b(live|family|build|home|house|stay|kids|parents)\b|घर|परिवार|ಮನೆ|ಕುಟುಂಬ/.test(s)) r.purpose = r.purpose || 'home';
  return r;
}

export type PlotForMatch = PlotShape & { dimensions?: string | null; project_id?: string };
export type Ranked = { plot: PlotForMatch; score: number; reasons: string[]; caveats: string[]; vicinity: Vicinity | null; fits: boolean };

const FACE = (f: string | null) => (f || '').replace('_', '-');

export function rankPlots(plots: PlotForMatch[], layout: SiteLayout, req: Requirements, demand: Record<string, number> = {}): Ranked[] {
  const mpu = metresPerUnit(plots);
  const avail = plots.filter((p) => liveStatus(p) === 'available');
  const avgRate = avail.reduce((a, p) => a + rate(p), 0) / Math.max(1, avail.length);
  // the most points a plot could earn for what was asked, so 100 means "everything you asked for"
  const best = Math.max(1, (req.budgetMax ? 25 : 0) + (req.sizeMin || req.sizeMax ? 18 : 0) + (req.facing?.length ? 14 : 0) + (req.corner ? 12 : 0)
    + (req.nearPark ? 15 : 0) + (req.mainRoad ? 10 : 0) + (req.quiet ? 10 : 0) + (req.nearClubhouse ? 8 : 0) + (req.purpose === 'investment' ? 8 : 0));
  return avail.map((p) => {
    const g = plotGeo(p.shape_path);
    const v = g ? vicinity(g, layout, mpu) : null;
    const price = Number(p.price), area = Number(p.area_sqft);
    let score = 0; let fits = true;
    const reasons: string[] = [], caveats: string[] = [];
    if (req.budgetMax) {
      if (price <= req.budgetMax) { score += 25; reasons.push(`within budget (₹${(price / 1e5).toFixed(1)} L)`); }
      else if (price <= req.budgetMax * 1.06) { score += 5; caveats.push(`₹${((price - req.budgetMax) / 1e5).toFixed(1)} L over budget`); }
      else { score -= 45; fits = false; caveats.push(`₹${((price - req.budgetMax) / 1e5).toFixed(1)} L over budget`); }
    }
    if (req.budgetMin && price < req.budgetMin * 0.8) { score -= 6; caveats.push('smaller than your budget allows'); }
    if (req.sizeMin || req.sizeMax) {
      const okMin = !req.sizeMin || area >= req.sizeMin, okMax = !req.sizeMax || area <= req.sizeMax;
      if (okMin && okMax) { score += 18; reasons.push(`${area.toLocaleString('en-IN')} sq ft${p.dimensions ? ` (${p.dimensions})` : ''}`); }
      else { score -= 14; fits = false; caveats.push(`${area.toLocaleString('en-IN')} sq ft${okMin ? ' (larger than asked)' : ' (smaller than asked)'}`); }
    }
    if (req.facing?.length) {
      if (req.facing.includes(p.facing || '')) { score += 14; reasons.push(`${FACE(p.facing)} facing${req.vastu ? ' (vastu-preferred)' : ''}`); }
      else { score -= 8; if (!req.vastu) fits = false; caveats.push(`${FACE(p.facing)} facing`); }
    }
    if (req.corner) { if (p.is_corner) { score += 12; reasons.push('corner plot'); } else { score -= 6; caveats.push('not a corner plot'); } }
    if (v && req.nearPark) {
      if (v.facesPark) { score += 15; reasons.push(`faces the park (${v.parkM} m)`); }
      else if ((v.parkM ?? 999) < 60) { score += 8; reasons.push(`${v.parkM} m from the park`); }
      else caveats.push(`${v.parkM} m from the park`);
    }
    if (v && req.mainRoad) { if (v.mainRoad) { score += 10; reasons.push('on the 40 ft main road'); } else caveats.push('on a 30 ft road'); }
    if (v && req.quiet) { if (!v.mainRoad) { score += 10; reasons.push('quiet inner road'); } else { score -= 6; caveats.push('on the main road (busier)'); } }
    if (v && req.nearClubhouse && v.clubhouseM != null) { if (v.clubhouseM < 70) { score += 8; reasons.push(`${v.clubhouseM} m to the clubhouse`); } }
    const r = rate(p);
    if (r < avgRate * 0.97) { score += 4; reasons.push(`good value at ₹${r.toLocaleString('en-IN')}/sq ft`); }
    if (req.purpose === 'investment') {
      if (p.is_corner) score += 4; if (v?.mainRoad) score += 4;
      if ((demand[p.id] || 0) > 15) { score += 4; reasons.push('one of the most viewed plots'); }
    }
    if (req.purpose === 'home' && v?.facesPark && !req.nearPark) { score += 4; reasons.push('faces the park'); }
    return { plot: p, score: Math.max(0, Math.min(100, Math.round((100 * score) / best))), raw: score, reasons, caveats, vicinity: v, fits };
  }).sort((a, b) => b.raw - a.raw || Number(a.plot.price) - Number(b.plot.price)).map(({ raw: _raw, ...r }) => r);
}

export const hasEnough = (r: Requirements) => !!(r.budgetMax || r.budgetMin || r.sizeMin || r.sizeMax || r.facing?.length || r.corner || r.nearPark);

export function describeReq(r: Requirements) {
  const bits: string[] = [];
  if (r.budgetMin && r.budgetMax) bits.push(`₹${(r.budgetMin / 1e5).toFixed(0)}–${(r.budgetMax / 1e5).toFixed(0)} L`);
  else if (r.budgetMax) bits.push(`up to ₹${(r.budgetMax / 1e5).toFixed(0)} L`);
  else if (r.budgetMin) bits.push(`from ₹${(r.budgetMin / 1e5).toFixed(0)} L`);
  if (r.sizeMin && r.sizeMax) bits.push(`${Math.round(r.sizeMin / 50) * 50}–${Math.round(r.sizeMax / 50) * 50} sq ft`);
  else if (r.sizeMin) bits.push(`${Math.round(r.sizeMin / 50) * 50}+ sq ft`);
  if (r.facing?.length) bits.push(r.facing.map(FACE).join('/') + ' facing');
  if (r.corner) bits.push('corner'); if (r.nearPark) bits.push('near the park'); if (r.mainRoad) bits.push('main road'); if (r.quiet) bits.push('quiet street');
  if (r.nearClubhouse) bits.push('near the clubhouse'); if (r.bedrooms) bits.push(`${r.bedrooms} BHK house`); if (r.purpose) bits.push(r.purpose === 'investment' ? 'investment' : 'to build a home');
  return bits.join(', ');
}

/** The rules-based reply (used when no AI key is set). */
export function fallbackReply(req: Requirements, ranked: Ranked[], lang: Lang) {
  if (!hasEnough(req)) return t('askMore', lang);
  const top = ranked.slice(0, 3);
  const allFit = top.length > 0 && top.every((x) => x.fits);
  const lines = [`${t('understood', lang)}: ${describeReq(req)}.`, '', allFit ? t('matchesIntro', lang) : t('closest', lang)];
  for (const x of top) lines.push(`• ${x.plot.plot_number}: ${[...x.reasons.slice(0, 3), ...x.caveats.slice(0, 1)].join(', ')}.`);
  if (!req.budgetMax && !req.budgetMin) lines.push('', t('askBudget', lang));
  else lines.push('', t('next', lang));
  if (lang !== 'en') lines.push(t('englishOnly', lang));
  return lines.join('\n');
}
