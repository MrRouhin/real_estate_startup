// POST /api/ai/docs  { projectId, messages, lang } → { reply, passages, source }
// Answers from the project's documents. Search runs as the caller, so a buyer only ever
// sees public passages plus their own agreement.
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { answerFromDocs } from '@/lib/ai/docs';
import { actorFor, logUsage, overLimit } from '@/lib/ai/usage';

export const maxDuration = 60;

const Body = z.object({
  projectId: z.string().uuid(), lang: z.enum(['en', 'hi', 'kn']).default('en'),
  messages: z.array(z.object({ role: z.enum(['user', 'assistant']), content: z.string().max(1500) })).min(1).max(20),
});

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: 'Bad request' }, { status: 400 });
  const { projectId, lang, messages } = parsed.data;
  const db = await createClient();
  const { data: { user } } = await db.auth.getUser();
  const actor = actorFor(req, user?.id);
  if (await overLimit(actor, 40)) return Response.json({ error: 'You have asked a lot of questions this hour. Please try again later.' }, { status: 429 });
  const { data: project } = await db.from('projects').select('id, name, org_id').eq('id', projectId).maybeSingle();
  if (!project) return Response.json({ error: 'Project not found.' }, { status: 404 });
  const q = messages[messages.length - 1]!.content;
  const r = await answerFromDocs(db, project, q, lang, messages.slice(0, -1));
  await logUsage('doc_qa', actor, project.org_id, r.result);
  return Response.json({
    reply: r.answer, source: r.source,
    passages: r.passages.map((p) => ({ n: p.n, title: p.title, heading: p.heading, excerpt: p.content.slice(0, 320), mine: p.visibility === 'buyer' })),
  });
}
