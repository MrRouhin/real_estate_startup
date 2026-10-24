// POST /api/ai/match  { projectId, messages, lang, state? } → { reply, matches, state, source }
// The buyer's plot matchmaker. Public (rate-limited); reads only what any visitor can see.
import { z } from 'zod';
import { createAdminClient, createClient, hasServiceKey } from '@/lib/supabase/server';
import { PLOT_FIELDS } from '@/lib/queries';
import { asLayout } from '@/lib/site';
import { matchmake } from '@/lib/ai/matchmaker';
import { actorFor, logUsage, overLimit } from '@/lib/ai/usage';

export const maxDuration = 60;

const Req = z.object({
  budgetMin: z.number().nullish(), budgetMax: z.number().nullish(), sizeMin: z.number().nullish(), sizeMax: z.number().nullish(),
  facing: z.array(z.string()).nullish(), corner: z.boolean().nullish(), vastu: z.boolean().nullish(), nearPark: z.boolean().nullish(),
  mainRoad: z.boolean().nullish(), quiet: z.boolean().nullish(), nearClubhouse: z.boolean().nullish(), purpose: z.enum(['home', 'investment']).nullish(), bedrooms: z.number().nullish(),
}).partial();
const Body = z.object({
  projectId: z.string().uuid(), lang: z.enum(['en', 'hi', 'kn']).default('en'), state: Req.nullish(),
  messages: z.array(z.object({ role: z.enum(['user', 'assistant']), content: z.string().max(1500) })).min(1).max(24),
});

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: 'Bad request' }, { status: 400 });
  const { projectId, lang, messages, state } = parsed.data;
  const db = await createClient();
  const { data: { user } } = await db.auth.getUser();
  const actor = actorFor(req, user?.id);
  if (await overLimit(actor, 40)) return Response.json({ error: 'You have sent a lot of messages. Please try again in a little while, or call the sales team.' }, { status: 429 });
  const [{ data: project }, { data: plots }] = await Promise.all([
    db.from('projects').select('id, name, org_id, layout').eq('id', projectId).maybeSingle(),
    db.from('plots').select(PLOT_FIELDS).eq('project_id', projectId),
  ]);
  if (!project) return Response.json({ error: 'Project not found.' }, { status: 404 });
  let demand: Record<string, number> = {};
  if (hasServiceKey()) {
    const { data: ev } = await createAdminClient().from('plot_events').select('plot_id').eq('project_id', projectId).gte('created_at', new Date(Date.now() - 30 * 86400000).toISOString());
    demand = (ev || []).reduce((a, e) => ({ ...a, [e.plot_id]: (a[e.plot_id] || 0) + 1 }), {} as Record<string, number>);
  }
  const r = await matchmake(messages, plots || [], asLayout(project.layout), lang, project.name, demand, (state || {}) as never);
  await Promise.all(r.matches.slice(0, 3).map((m) => db.rpc('track_plot_event', { p_plot: m.id, p_kind: 'match' })));
  for (const res of r.results) await logUsage('matchmaker', actor, project.org_id, res);
  if (!r.results.length) await logUsage('matchmaker', actor, project.org_id, null);
  return Response.json({ reply: r.reply, matches: r.matches, state: r.requirements, source: r.source });
}
