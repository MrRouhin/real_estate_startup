import type { Metadata } from 'next';
import { requirePartner } from '@/lib/auth';
import { PortalShell } from '@/components/portal/shell';
import { Empty } from '@/components/ui/bits';

export const maxDuration = 60;
export const metadata: Metadata = { title: { default: 'Contractor workspace', template: '%s · Contractor' } };

export default async function ContractorLayout({ children }: { children: React.ReactNode }) {
  const { supabase, user, profile } = await requirePartner('contractor');
  const { data: cid } = await supabase.rpc('my_contractor_id');
  const [{ data: c }, { data: notes }, { count: letters }, { count: leave }, { count: review }] = await Promise.all([
    cid ? supabase.from('contractors').select('company_name, trade, org_id, organizations(name)').eq('id', cid).single() : Promise.resolve({ data: null }),
    supabase.from('notifications').select('id, title, body, link, read_at, created_at').eq('user_id', user.id).order('created_at', { ascending: false }).limit(12),
    cid ? supabase.from('letters').select('id', { count: 'exact', head: true }).eq('recipient_type', 'contractor').eq('recipient_id', cid).eq('status', 'issued') : Promise.resolve({ count: 0 }),
    supabase.from('leave_requests').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
    supabase.from('employee_profiles').select('employee_id', { count: 'exact', head: true }).eq('status', 'submitted'),
  ]);
  const org = (c?.organizations as unknown as { name: string } | null)?.name;
  return (
    <PortalShell role="contractor" home="/contractor" userId={user.id} now={Date.now()} user={profile.full_name || profile.email || 'Contractor'}
      title={c?.company_name || 'Contractor'} subtitle={org ? `Working for ${org}` : undefined} notes={notes || []}
      nav={[
        { href: '/contractor', label: 'Dashboard', icon: 'gauge' },
        { href: '/contractor/work', label: 'Work', icon: 'work' },
        { href: '/contractor/crew', label: 'Crew', icon: 'crew', badge: (leave || 0) + (review || 0) },
        { href: '/contractor/bills', label: 'Bills', icon: 'bills' },
        { href: '/contractor/letters', label: 'Letters', icon: 'letters', badge: letters || 0 },
        { href: '/contractor/profile', label: 'Company', icon: 'profile', mobile: false },
      ]}>
      {cid ? children : <Empty title="Your login is not linked yet">Ask the developer to link this login to your company. Once linked, your work, crew and bills appear here.</Empty>}
    </PortalShell>
  );
}
