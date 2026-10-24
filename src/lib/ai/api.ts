// Auth helpers for the AI route handlers.
import 'server-only';
import { createClient } from '@/lib/supabase/server';

/** Developer staff with their active project, or an error to return. */
export async function requireStaffApi() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Sign in first.', status: 401 } as const;
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  if (!profile || (profile.role !== 'seller' && profile.role !== 'admin')) return { error: 'Developer staff only.', status: 403 } as const;
  const { data: m } = await supabase.from('organization_members').select('org_id').eq('user_id', user.id).limit(1).maybeSingle();
  let orgId = m?.org_id ?? null;
  if (!orgId && profile.role === 'admin') orgId = (await supabase.from('organizations').select('id').order('created_at').limit(1).maybeSingle()).data?.id ?? null;
  if (!orgId) return { error: 'No organization.', status: 403 } as const;
  const { data: projects } = await supabase.from('projects').select('id, name, org_id, layout, site_lat, site_lng, geofence_m, slug, status').eq('org_id', orgId).order('created_at');
  const project = (projects || []).find((p) => p.status === 'ongoing') || (projects || [])[0];
  if (!project) return { error: 'No project yet.', status: 404 } as const;
  return { supabase, user, project };
}
