// POST /api/ai/ask  { messages: [{role, content}] } → { reply, links, source }
// "Ask your site" for developer staff. Answers from the live analysis of the active project.
import { z } from 'zod';
import { requireStaffApi } from '@/lib/ai/api';
import { loadAnalysis } from '@/lib/ai/analysis';
import { askSite } from '@/lib/ai/ask';
import { logUsage, overLimit } from '@/lib/ai/usage';

export const maxDuration = 60;

const Body = z.object({ messages: z.array(z.object({ role: z.enum(['user', 'assistant']), content: z.string().max(2000) })).min(1).max(20) });

export async function POST(req: Request) {
  const s = await requireStaffApi();
  if ('error' in s) return Response.json({ error: s.error }, { status: s.status });
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: 'Bad request' }, { status: 400 });
  const actor = 'u:' + s.user.id;
  if (await overLimit(actor, 120)) return Response.json({ error: 'That is a lot of questions this hour. Try again in a little while.' }, { status: 429 });
  const msgs = parsed.data.messages;
  const q = msgs[msgs.length - 1]!.content;
  const a = await loadAnalysis(s.supabase, s.project);
  const r = await askSite(a, q, msgs.slice(0, -1));
  await logUsage('ask_site', actor, s.project.org_id, r.result);
  return Response.json({ reply: r.answer, links: r.links, source: r.source });
}
