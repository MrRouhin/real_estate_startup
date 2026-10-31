import type { Metadata } from 'next';
import { requirePartner } from '@/lib/auth';
import { PortalShell } from '@/components/portal/shell';
import { Empty } from '@/components/ui/bits';

export const maxDuration = 60;
export const metadata: Metadata = { title: { default: 'Vendor workspace', template: '%s · Vendor' } };

export default async function VendorLayout({ children }: { children: React.ReactNode }) {
  const { supabase, user, profile } = await requirePartner('vendor');
  const { data: vid } = await supabase.rpc('my_vendor_id');
  const [{ data: v }, { data: notes }, { count: newPOs }, { count: letters }] = await Promise.all([
    vid ? supabase.from('vendors').select('company_name, organizations(name)').eq('id', vid).single() : Promise.resolve({ data: null }),
    supabase.from('notifications').select('id, title, body, link, read_at, created_at').eq('user_id', user.id).order('created_at', { ascending: false }).limit(12),
    vid ? supabase.from('purchase_orders').select('id', { count: 'exact', head: true }).eq('vendor_id', vid).eq('status', 'issued') : Promise.resolve({ count: 0 }),
    vid ? supabase.from('letters').select('id', { count: 'exact', head: true }).eq('recipient_type', 'vendor').eq('recipient_id', vid).eq('status', 'issued') : Promise.resolve({ count: 0 }),
  ]);
  const org = (v?.organizations as unknown as { name: string } | null)?.name;
  return (
    <PortalShell role="vendor" home="/vendor" userId={user.id} now={Date.now()} user={profile.full_name || profile.email || 'Vendor'}
      title={v?.company_name || 'Vendor'} subtitle={org ? `Supplying ${org}` : undefined} notes={notes || []}
      nav={[
        { href: '/vendor', label: 'Dashboard', icon: 'gauge' },
        { href: '/vendor/orders', label: 'Orders', icon: 'orders', badge: newPOs || 0 },
        { href: '/vendor/deliveries', label: 'Deliveries', icon: 'deliveries' },
        { href: '/vendor/invoices', label: 'Payments', icon: 'invoices' },
        { href: '/vendor/catalog', label: 'Price list', icon: 'catalog' },
        { href: '/vendor/letters', label: 'Letters', icon: 'letters', badge: letters || 0, mobile: false },
        { href: '/vendor/profile', label: 'Company', icon: 'profile', mobile: false },
      ]}>
      {vid ? children : <Empty title="Your login is not linked yet">Ask the developer to link this login to your company. Once linked, purchase orders and payments appear here.</Empty>}
    </PortalShell>
  );
}
