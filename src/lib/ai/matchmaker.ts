// The buyer matchmaker conversation. Requirements come from the rules parser, refined by the
// model when it is on; the ranking is always deterministic; the model only writes the reply.
import 'server-only';
import type { SiteLayout } from '@/lib/types';
import { aiJSON, aiText, type AIResult } from './client';
import { langName, type Lang } from './i18n';
import { describeReq, fallbackReply, hasEnough, parseRequirements, rankPlots, type PlotForMatch, type Ranked, type Requirements } from './match';

export type MatchTurn = { role: 'user' | 'assistant'; content: string };
export type MatchResult = { reply: string; requirements: Requirements; matches: { id: string; plot_number: string; price: number; area: number; facing: string | null; is_corner: boolean; score: number; reasons: string[]; caveats: string[]; fits: boolean }[]; source: 'ai' | 'rules'; results: (AIResult | null)[] };

const EXTRACT = `Extract a home-plot buyer's requirements from the conversation (they may write in English, Hindi, Kannada or a mix).
Money: 1 lakh = 100000 rupees, 1 crore = 10000000. Sizes in sq ft (30x40 = 1200). Only include what the buyer actually said; use null otherwise.
JSON shape: {"budgetMin": number|null, "budgetMax": number|null, "sizeMin": number|null, "sizeMax": number|null, "facing": ["north"|"south"|"east"|"west"|"north_east"|"north_west"|"south_east"|"south_west"]|null, "corner": boolean|null, "vastu": boolean|null, "nearPark": boolean|null, "mainRoad": boolean|null, "quiet": boolean|null, "nearClubhouse": boolean|null, "purpose": "home"|"investment"|null, "bedrooms": number|null}`;

const REPLY = (lang: Lang, project: string) => `You are the friendly plot advisor for ${project}, a plotted layout in India. Reply in ${langName(lang)}.
Use ONLY the facts in the JSON (requirements and ranked plots). Never invent plots, prices, distances or approvals.
- If requirements are thin, ask ONE short question (budget first, then size or facing).
- Otherwise recommend the top 2–3 plots by number with the reasons given, and be honest about any caveat.
- Never promise price appreciation or returns; if asked about investment, say you can show the price outlook range on each plot's page.
- Under 110 words. Plain text, bullets "• " allowed. End by offering a site visit or to hold a plot.`;

const clean = (r: Partial<Requirements>): Requirements => {
  const out: Requirements = {};
  for (const [k, v] of Object.entries(r)) if (v !== null && v !== undefined && !(Array.isArray(v) && !v.length)) (out as Record<string, unknown>)[k] = v;
  return out;
};

export async function matchmake(turns: MatchTurn[], plots: PlotForMatch[], layout: SiteLayout, lang: Lang, projectName: string, demand: Record<string, number> = {}, prev: Requirements = {}): Promise<MatchResult> {
  const lastUser = [...turns].reverse().find((t) => t.role === 'user')?.content || '';
  let req = parseRequirements(lastUser, prev);
  const results: (AIResult | null)[] = [];
  const ex = await aiJSON<Requirements>({ system: EXTRACT, maxTokens: 300, temperature: 0, timeoutMs: 12000, messages: [{ role: 'user', content: turns.filter((t) => t.role === 'user').slice(-6).map((t) => t.content).join('\n') }] });
  if (ex) { req = { ...req, ...clean(ex.data) }; results.push(ex.result); }
  const ranked: Ranked[] = rankPlots(plots, layout, req, demand);
  const top = ranked.slice(0, 5);
  const matches = top.map((r) => ({ id: r.plot.id, plot_number: r.plot.plot_number, price: Number(r.plot.price), area: Number(r.plot.area_sqft), facing: r.plot.facing, is_corner: r.plot.is_corner, score: r.score, reasons: r.reasons, caveats: r.caveats, fits: r.fits }));
  let reply = fallbackReply(req, ranked, lang), source: 'ai' | 'rules' = 'rules';
  const facts = { requirements: describeReq(req), enough: hasEnough(req), plots: matches.slice(0, 3).map((m) => ({ plot: m.plot_number, price_lakh: Math.round(m.price / 1e4) / 10, sqft: m.area, facing: m.facing, corner: m.is_corner, reasons: m.reasons, caveats: m.caveats, fits_all: m.fits })) };
  const r = await aiText({ system: REPLY(lang, projectName), maxTokens: 400, temperature: 0.4, messages: [...turns.slice(-8), { role: 'user', content: `[facts for your reply, not written by the buyer] ${JSON.stringify(facts)}` }] });
  if (r) { reply = r.text; source = 'ai'; results.push(r); }
  return { reply, requirements: req, matches: hasEnough(req) ? matches : [], source, results };
}
