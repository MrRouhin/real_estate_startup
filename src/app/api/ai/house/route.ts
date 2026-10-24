// POST /api/ai/house  { plotId, text?, spec? } → { spec, plan, reply, source }
// Dream-home preview: a house that fits this plot, with an indicative build cost.
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { aiJSON } from '@/lib/ai/client';
import { DEFAULT_SPEC, parseHouse, planHouse, type HouseSpec } from '@/lib/ai/house';
import { actorFor, logUsage, overLimit } from '@/lib/ai/usage';

export const maxDuration = 30;

const Spec = z.object({
  bedrooms: z.number().int().min(1).max(6), floors: z.number().int().min(1).max(3), parking: z.boolean(), garden: z.boolean(), terrace: z.boolean(),
  finish: z.enum(['basic', 'standard', 'premium']), rental: z.boolean(), vastu: z.boolean(),
});
const Body = z.object({ plotId: z.string().uuid(), text: z.string().max(600).optional(), spec: Spec.optional() });

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: 'Bad request' }, { status: 400 });
  const db = await createClient();
  const { data: { user } } = await db.auth.getUser();
  const { data: plot } = await db.from('plots').select('id, org_id, dimensions, area_sqft, facing, is_corner').eq('id', parsed.data.plotId).maybeSingle();
  if (!plot) return Response.json({ error: 'Plot not found.' }, { status: 404 });
  let spec: HouseSpec = parsed.data.spec || DEFAULT_SPEC, source: 'ai' | 'rules' = 'rules';
  if (parsed.data.text) {
    spec = parseHouse(parsed.data.text, spec);
    const actor = actorFor(req, user?.id);
    if (!(await overLimit(actor, 40))) {
      const r = await aiJSON<Partial<HouseSpec>>({
        system: `Turn a home buyer's description of the house they want into a spec (they may write in English, Hindi or Kannada). Only change what they mention; keep the rest.
JSON shape: {"bedrooms": 1-6, "floors": 1-3, "parking": boolean, "garden": boolean, "terrace": boolean, "finish": "basic"|"standard"|"premium", "rental": boolean, "vastu": boolean}`,
        messages: [{ role: 'user', content: `Current spec: ${JSON.stringify(spec)}\nBuyer says: ${parsed.data.text}` }], maxTokens: 200, temperature: 0, timeoutMs: 10000,
      });
      if (r) { const ok = Spec.partial().safeParse(r.data); if (ok.success) { spec = { ...spec, ...ok.data }; source = 'ai'; } }
      await logUsage('dream_home', actor, plot.org_id, r?.result ?? null);
    }
  }
  const plan = planHouse(plot, spec);
  return Response.json({ spec, plan, source });
}
