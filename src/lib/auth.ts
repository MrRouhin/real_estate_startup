import { cache } from 'react';
import { redirect } from 'next/navigation';
import { createClient } from './supabase/server';
import type { Profile } from './types';

/** The signed-in user and profile for this request (or null). Cached per request. */
export const getSession = cache(async () => {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { supabase, user: null, profile: null as Profile | null };
  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle();
  return { supabase, user, profile: profile as Profile | null };
});

export async function requireUser(next = '/') {
  const s = await getSession();
  if (!s.user || !s.profile) redirect('/login?next=' + encodeURIComponent(next));
  return s as typeof s & { user: NonNullable<typeof s.user>; profile: Profile };
}

/** Where each role lands after signing in. */
export function homeFor(role: Profile['role'] | null | undefined) {
  switch (role) {
    case 'seller': case 'admin': return '/console';
    case 'contractor': case 'vendor': case 'employee': return '/portal';
    default: return '/me';
  }
}

/** Developer staff (or platform admin) with their organization and active project. */
export const requireStaff = cache(async () => {
  const s = await requireUser('/console');
  if (s.profile.role !== 'seller' && s.profile.role !== 'admin') redirect(homeFor(s.profile.role));
  const { supabase, user } = s;
  const { data: membership } = await supabase
    .from('organization_members').select('org_id, org_role').eq('user_id', user.id).limit(1).maybeSingle();
  let orgId = membership?.org_id ?? null;
  if (!orgId && s.profile.role === 'admin') {
    const { data: anyOrg } = await supabase.from('organizations').select('id').order('created_at').limit(1).maybeSingle();
    orgId = anyOrg?.id ?? null;
  }
  if (!orgId) redirect('/login?error=no-organization');
  const [{ data: org }, { data: projects }] = await Promise.all([
    supabase.from('organizations').select('*').eq('id', orgId).single(),
    supabase.from('projects').select('*').eq('org_id', orgId).order('created_at'),
  ]);
  const project = (projects || []).find((p) => p.status === 'ongoing') || (projects || [])[0] || null;
  return { ...s, org: org!, orgId, orgRole: membership?.org_role ?? 'owner', projects: projects || [], project };
});
