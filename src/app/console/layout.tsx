import type { Metadata } from 'next';
import { requireStaff } from '@/lib/auth';
import { ConsoleShell } from '@/components/console/shell';

// AI checks (photo, invoice, reports) can take a few seconds; allow server actions up to a minute.
export const maxDuration = 60;

export const metadata: Metadata = { title: { default: 'Console', template: '%s · Console' } };

export default async function ConsoleLayout({ children }: { children: React.ReactNode }) {
  const { supabase, org, project, profile, orgId } = await requireStaff();
  const [{ count: newLeads }, { count: toInspect }, { count: requests }, { count: refunds }, { count: mods }, { count: critical }] = await Promise.all([
    supabase.from('leads').select('id', { count: 'exact', head: true }).eq('org_id', orgId).eq('stage', 'new'),
    supabase.from('deliveries').select('id', { count: 'exact', head: true }).eq('org_id', orgId).eq('status', 'pending_inspection'),
    supabase.from('material_requests').select('id', { count: 'exact', head: true }).eq('org_id', orgId).in('status', ['requested', 'approved']),
    supabase.from('bookings').select('id', { count: 'exact', head: true }).eq('org_id', orgId).eq('status', 'refund_due'),
    supabase.from('modification_requests').select('id', { count: 'exact', head: true }).eq('org_id', orgId).eq('status', 'requested'),
    supabase.from('ai_insights').select('id', { count: 'exact', head: true }).eq('org_id', orgId).eq('status', 'open').eq('severity', 'critical'),
  ]);
  return (
    <ConsoleShell org={org.name} project={project ? { name: project.name, slug: project.slug } : null}
      user={{ name: profile.full_name || profile.email || 'Staff', role: profile.role }}
      badges={{ '/console/leads': newLeads || 0, '/console/vendors': toInspect || 0, '/console/materials': requests || 0, '/console/bookings': refunds || 0, '/console/modifications': mods || 0, '/console/insights': critical || 0 }}>
      {children}
    </ConsoleShell>
  );
}
