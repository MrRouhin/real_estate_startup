import 'server-only';
import crypto from 'node:crypto';
import { createAdminClient, hasServiceKey } from '@/lib/supabase/server';
import type { AIResult } from './client';

/** A privacy-safe actor id for rate limiting: the user id, or a hash of the caller's IP. */
export function actorFor(req: Request, userId?: string | null) {
  if (userId) return 'u:' + userId;
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || req.headers.get('x-real-ip') || 'unknown';
  return 'ip:' + crypto.createHash('sha256').update(ip + (process.env.SUPABASE_SERVICE_ROLE_KEY || '')).digest('hex').slice(0, 16);
}

/** Public AI endpoints allow a fair number of messages per hour per visitor. */
export async function overLimit(actor: string, perHour = 40) {
  if (!hasServiceKey()) return false;
  const since = new Date(Date.now() - 3600_000).toISOString();
  const { count } = await createAdminClient().from('ai_usage').select('id', { count: 'exact', head: true }).eq('actor', actor).gte('created_at', since);
  return (count || 0) >= perHour;
}

export async function logUsage(feature: string, actor: string, orgId: string | null, r: AIResult | null) {
  if (!hasServiceKey()) return;
  await createAdminClient().from('ai_usage').insert({
    feature, actor, org_id: orgId, model: r?.model ?? 'rules', input_tokens: r?.inputTokens ?? null, output_tokens: r?.outputTokens ?? null,
  });
}
