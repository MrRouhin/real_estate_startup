// GET /api/cron/insights — daily analysis for every ongoing project (Vercel Cron).
// Vercel sends "Authorization: Bearer <CRON_SECRET>" when CRON_SECRET is set in the project.
import { createAdminClient, hasServiceKey, SERVICE_KEY_MISSING } from '@/lib/supabase/server';
import { runInsights } from '@/lib/ai/run';
import { logUsage } from '@/lib/ai/usage';

export const maxDuration = 60;
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return Response.json({ error: 'Set CRON_SECRET in the hosting settings to enable the daily analysis.' }, { status: 503 });
  if (req.headers.get('authorization') !== `Bearer ${secret}`) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  if (!hasServiceKey()) return Response.json({ error: SERVICE_KEY_MISSING }, { status: 503 });
  const db = createAdminClient();
  const { data: projects } = await db.from('projects').select('id, name, org_id, layout, site_lat, site_lng, geofence_m, slug').eq('status', 'ongoing');
  const out: { project: string; insights?: number; ai?: boolean; error?: string }[] = [];
  for (const p of projects || []) {
    try {
      const r = await runInsights(db, p);
      for (const res of r.results) if (res) await logUsage('insights_cron', 'cron', p.org_id, res);
      out.push({ project: p.name, insights: r.count, ai: r.aiUsed });
    } catch (e) { out.push({ project: p.name, error: (e as Error).message }); }
  }
  return Response.json({ ran: out.length, results: out });
}
