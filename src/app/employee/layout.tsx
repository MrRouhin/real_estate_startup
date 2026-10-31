import type { Metadata } from 'next';
import { requirePartner } from '@/lib/auth';
import { PortalShell } from '@/components/portal/shell';
import { Empty } from '@/components/ui/bits';

export const maxDuration = 60;
export const metadata: Metadata = { title: { default: 'My site work', template: '%s · Site team' } };

export default async function EmployeeLayout({ children }: { children: React.ReactNode }) {
  const { supabase, user, profile } = await requirePartner('employee');
  const [{ data: me }, { data: notes }] = await Promise.all([
    supabase.from('employees').select('id, full_name, employee_code, role_title, contractor_id, contractors(company_name), organizations(name)').eq('user_id', user.id).eq('active', true).maybeSingle(),
    supabase.from('notifications').select('id, title, body, link, read_at, created_at').eq('user_id', user.id).order('created_at', { ascending: false }).limit(12),
  ]);
  const [{ count: tasks }, { count: letters }, { data: prof }] = me ? await Promise.all([
    supabase.from('crew_tasks').select('id', { count: 'exact', head: true }).eq('status', 'open'),
    supabase.from('letters').select('id', { count: 'exact', head: true }).eq('recipient_type', 'employee').eq('recipient_id', me.id).eq('status', 'issued'),
    supabase.from('employee_profiles').select('status').eq('employee_id', me.id).maybeSingle(),
  ]) : [{ count: 0 }, { count: 0 }, { data: null }];
  const employer = (me?.contractors as unknown as { company_name: string } | null)?.company_name ?? (me?.organizations as unknown as { name: string } | null)?.name;
  return (
    <PortalShell role="employee" home="/employee" userId={user.id} now={Date.now()} user={profile.full_name || 'Me'}
      title={me ? `${me.full_name} · ${me.employee_code}` : profile.full_name || 'Site team'} subtitle={me ? `${me.role_title ?? 'Crew'}${employer ? ` · ${employer}` : ''}` : undefined} notes={notes || []}
      nav={[
        { href: '/employee', label: 'Today', icon: 'today', badge: tasks || 0 },
        { href: '/employee/attendance', label: 'Attendance', icon: 'attendance' },
        { href: '/employee/leave', label: 'Leave', icon: 'leave' },
        { href: '/employee/profile', label: 'Profile', icon: 'profile', badge: !prof || prof.status === 'draft' || prof.status === 'needs_changes' ? 1 : 0 },
        { href: '/employee/id-card', label: 'ID card', icon: 'id' },
        { href: '/employee/letters', label: 'Letters', icon: 'letters', badge: letters || 0, mobile: false },
      ]}>
      {me ? children : <Empty title="Your login is not linked yet">Ask your supervisor to link this login to your worker record. Then your attendance, tasks and wages appear here.</Empty>}
    </PortalShell>
  );
}
