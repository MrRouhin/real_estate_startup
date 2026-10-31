import type { Metadata } from 'next';
import { requireStaff } from '@/lib/auth';
import { ConsoleShell } from '@/components/console/shell';

// AI checks (photo, invoice, reports) can take a few seconds; allow server actions up to a minute.
export const maxDuration = 60;

export const metadata: Metadata = { title: { default: 'Console', template: '%s · Console' } };

export default async function ConsoleLayout({ children }: { children: React.ReactNode }) {
  const { supabase, org, project, projects, profile, orgId } = await requireStaff();
  const [{ count: newLeads }, { count: toInspect }, { count: requests }, { count: refunds }, { count: mods }, { count: critical }] = await Promise.all([
    supabase.from('leads').select('id', { count: 'exact', head: true }).eq('org_id', orgId).eq('stage', 'new'),
    supabase.from('deliveries').select('id', { count: 'exact', head: true }).eq('org_id', orgId).eq('status', 'pending_inspection'),
    supabase.from('material_requests').select('id', { count: 'exact', head: true }).eq('org_id', orgId).in('status', ['requested', 'approved']),
    supabase.from('bookings').select('id', { count: 'exact', head: true }).eq('org_id', orgId).eq('status', 'refund_due'),
    supabase.from('modification_requests').select('id', { count: 'exact', head: true }).eq('org_id', orgId).eq('status', 'requested'),
    supabase.from('ai_insights').select('id', { count: 'exact', head: true }).eq('org_id', orgId).eq('status', 'open').eq('severity', 'critical'),
  ]);
  const [{ count: bills }, { count: access }, { count: kyc }, { count: profs }] = await Promise.all([
    supabase.from('contractor_bills').select('id', { count: 'exact', head: true }).eq('org_id', orgId).in('status', ['submitted', 'verified', 'approved']),
    supabase.from('access_requests').select('id', { count: 'exact', head: true }).eq('org_id', orgId).eq('status', 'pending'),
    supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('kyc_status', 'submitted'),
    supabase.from('employee_profiles').select('employee_id', { count: 'exact', head: true }).eq('org_id', orgId).eq('status', 'submitted'),
  ]);
  return (
    <ConsoleShell org={org.name} project={project ? { id: project.id, name: project.name, slug: project.slug, kind: project.kind, is_published: project.is_published } : null}
      projects={projects.map((p) => ({ id: p.id, name: p.name }))}
      user={{ name: profile.full_name || profile.email || 'Staff', role: profile.role }}
      badges={{ '/console/leads': newLeads || 0, '/console/vendors': toInspect || 0, '/console/materials': requests || 0, '/console/bookings': refunds || 0, '/console/modifications': mods || 0, '/console/insights': critical || 0, '/console/approvals': (bills || 0) + (access || 0) + (kyc || 0) + (profs || 0) }}>
      {children}
    </ConsoleShell>
  );
}
