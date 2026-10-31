// The matchmaker for apartment projects: requirements come from the same parser as plots
// plus flat-specific words (BHK, floor, view); ranking is deterministic, the model (if on)
// only writes the reply from the ranked facts.
import 'server-only';
import { liveStatus } from '@/lib/site';
import { aiJSON, aiText, type AIResult } from './client';
import { langName, type Lang } from './i18n';
import { describeReq, parseRequirements, type Requirements } from './match';
import type { FlatRow, UnitType } from '@/lib/flats/queries';

export type FlatReq = Requirements & { floorBand?: 'low' | 'mid' | 'high' | null; view?: string | null };
type Turn = { role: 'user' | 'assistant'; content: string };

export function parseFlatRequirements(text: string, prev: FlatReq = {}): FlatReq {
  const s = text.toLowerCase();
  const r: FlatReq = { ...parseRequirements(text, prev) };
  // a plot parser reads "2 BHK" as a minimum size; for flats the BHK itself is the filter
  if (/(\d)\s*bhk/.test(s)) { r.sizeMin = prev.sizeMin ?? null; r.sizeMax = prev.sizeMax ?? null; }
  if (/high(er)? floor|top floor|upper floor|view from (the )?top|ऊपरी मंजिल|ಮೇಲಿನ ಮಹಡಿ/.test(s)) r.floorBand = 'high';
  else if (/low(er)? floor|ground floor|first floor|parents|elderly|senior|lift.*(problem|fail)|नीचे|ಕೆಳಗಿನ/.test(s)) r.floorBand = 'low';
  else if (/middle floor|mid floor/.test(s)) r.floorBand = 'mid';
  if (/pool/.test(s)) r.view = 'pool'; else if (/park|green|garden view/.test(s)) r.view = 'park'; else if (/garden/.test(s)) r.view = 'garden';
  return r;
}

const EXTRACT = `Extract an apartment buyer's requirements from the conversation (English, Hindi, Kannada or mixed).
Money: 1 lakh = 100000, 1 crore = 10000000. Only include what the buyer said; null otherwise.
JSON: {"budgetMin": number|null, "budgetMax": number|null, "bedrooms": number|null, "floorBand": "low"|"mid"|"high"|null, "view": "park"|"pool"|"garden"|"road"|null, "facing": ["north"|"south"|"east"|"west"|"north_east"|"north_west"|"south_east"|"south_west"]|null, "corner": boolean|null, "vastu": boolean|null, "purpose": "home"|"investment"|null}`;

const REPLY = (lang: Lang, project: string) => `You are the friendly home advisor for ${project}, an apartment project in India. Reply in ${langName(lang)}.
Use ONLY the facts in the JSON. Never invent flats, prices, possession dates or returns.
- If requirements are thin, ask ONE short question (budget first, then BHK).
- Otherwise recommend the top 2–3 flats by number with their reasons and be honest about caveats.
- Mention they can walk through any flat in 3D from its page.
- Under 110 words, plain text, bullets "• " allowed. End by offering a site visit or to hold a flat.`;

export function rankFlats(flats: FlatRow[], types: UnitType[], req: FlatReq, demand: Record<string, number> = {}) {
  const T = new Map(types.map((t) => [t.id, t]));
  const maxFloor = Math.max(1, ...flats.map((f) => f.floor ?? 1));
  const band = (f: number) => (f <= Math.ceil(maxFloor / 3) ? 'low' : f <= Math.ceil((2 * maxFloor) / 3) ? 'mid' : 'high');
  const out = flats.filter((f) => liveStatus(f) === 'available').map((f) => {
    const t = f.unit_type_id ? T.get(f.unit_type_id) : undefined;
    let score = 50; const reasons: string[] = []; const caveats: string[] = []; let fits = true;
    const price = f.price, lakhs = Math.round(price / 1e4) / 10;
    if (req.budgetMax) {
      if (price <= req.budgetMax) { score += 25 - Math.min(15, ((req.budgetMax - price) / req.budgetMax) * 40); reasons.push(`₹${lakhs} L, within budget`); }
      else { const over = (price - req.budgetMax) / req.budgetMax; score -= over * 120; caveats.push(`₹${Math.round((price - req.budgetMax) / 1e5)} L over budget`); fits = false; }
    }
    if (req.budgetMin && price < req.budgetMin * 0.85) score -= 6;
    if (req.bedrooms && t) { if (t.bedrooms === req.bedrooms) { score += 22; reasons.push(t.name); } else { score -= 25; caveats.push(`${t.bedrooms} BHK, not ${req.bedrooms}`); fits = false; } }
    else if (t) reasons.push(t.name);
    const fb = band(f.floor ?? 1);
    if (req.floorBand) { if (fb === req.floorBand) { score += 10; reasons.push(`${fb} floor (${f.floor})`); } else score -= 6; }
    if (req.view) { if (f.view === req.view) { score += 10; reasons.push(`${req.view} view`); } else score -= 4; }
    if (req.facing?.length && f.facing) { if (req.facing.includes(f.facing)) { score += 8; reasons.push(`${f.facing.replace('_', '-')}-facing balcony`); } else score -= 3; }
    if (req.corner) { if (f.is_corner) { score += 6; reasons.push('corner flat'); } else score -= 2; }
    if (req.purpose === 'investment' && t) { score += Math.max(0, 8 - (price / Number(t.super_sqft) - 6500) / 100); }
    if ((demand[f.id] || 0) > 3) caveats.push('many buyers are looking at it');
    return { flat: f, score: Math.round(Math.max(0, Math.min(100, score))), reasons, caveats, fits };
  });
  return out.sort((a, b) => b.score - a.score || a.flat.price - b.flat.price);
}

export async function matchFlats(turns: Turn[], flats: FlatRow[], types: UnitType[], lang: Lang, projectName: string, demand: Record<string, number> = {}, prev: FlatReq = {}) {
  const lastUser = [...turns].reverse().find((t) => t.role === 'user')?.content || '';
  let req = parseFlatRequirements(lastUser, prev);
  const results: (AIResult | null)[] = [];
  const ex = await aiJSON<FlatReq>({ system: EXTRACT, maxTokens: 250, temperature: 0, timeoutMs: 12000, messages: [{ role: 'user', content: turns.filter((t) => t.role === 'user').slice(-6).map((t) => t.content).join('\n') }] });
  if (ex) { for (const [k, v] of Object.entries(ex.data)) if (v !== null && v !== undefined && !(Array.isArray(v) && !v.length)) (req as Record<string, unknown>)[k] = v; results.push(ex.result); }
  const enough = !!(req.budgetMax || req.budgetMin || req.bedrooms || req.floorBand || req.view);
  const ranked = rankFlats(flats, types, req, demand);
  const matches = ranked.slice(0, 5).map((r) => ({ id: r.flat.id, plot_number: r.flat.plot_number, price: r.flat.price, area: r.flat.area_sqft, facing: r.flat.facing, is_corner: r.flat.is_corner, score: r.score, reasons: r.reasons, caveats: r.caveats, fits: r.fits }));
  const desc = [describeReq({ ...req, bedrooms: null, sizeMin: null, sizeMax: null }), req.bedrooms ? `${req.bedrooms} BHK` : '', req.floorBand ? `${req.floorBand} floor` : '', req.view ? `${req.view} view` : ''].filter(Boolean).join(', ');
  let reply = !enough ? 'Happy to help you find a flat. What budget do you have in mind, and how many bedrooms?'
    : [`Got it: ${desc}.`, '', ranked.slice(0, 3).every((r) => r.fits) ? 'These fit best:' : 'Closest matches right now:', ...ranked.slice(0, 3).map((r) => `• Flat ${r.flat.plot_number}: ${[...r.reasons.slice(0, 3), ...r.caveats.slice(0, 1)].join(', ')}.`), '', 'Open any flat to walk through it in 3D. Shall I hold one or book a site visit?'].join('\n');
  let source: 'ai' | 'rules' = 'rules';
  const facts = { requirements: desc, enough, flats: matches.slice(0, 3).map((m) => ({ flat: m.plot_number, price_lakh: Math.round(m.price / 1e4) / 10, reasons: m.reasons, caveats: m.caveats, fits_all: m.fits })) };
  const r = await aiText({ system: REPLY(lang, projectName), maxTokens: 400, temperature: 0.4, messages: [...turns.slice(-8), { role: 'user', content: `[facts for your reply, not written by the buyer] ${JSON.stringify(facts)}` }] });
  if (r) { reply = r.text; source = 'ai'; results.push(r); }
  return { reply, requirements: req, matches: enough ? matches : [], source, results };
}
