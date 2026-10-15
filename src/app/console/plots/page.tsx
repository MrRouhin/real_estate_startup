import { requireStaff } from '@/lib/auth';
import { PageHeader } from '@/components/ui/bits';
import { LiveRefresh } from '@/components/live-refresh';
import { PlotTable } from './table';

export const metadata = { title: 'Plots and prices' };

export default async function PlotsAdmin() {
  const { supabase, project } = await requireStaff();
  const [{ data: plots }, { data: bookings }] = await Promise.all([
    supabase.from('plots').select('*').eq('project_id', project!.id).order('plot_number'),
    supabase.from('bookings').select('plot_id, buyer_id, status, profiles(full_name)').eq('org_id', project!.org_id).in('status', ['confirmed', 'registered', 'handed_over', 'pending_payment']),
  ]);
  const buyerOf = Object.fromEntries((bookings || []).map((b) => [b.plot_id, (b.profiles as unknown as { full_name: string } | null)?.full_name || 'Buyer']));
  return (
    <>
      <LiveRefresh tables={['plots']} filter={`project_id=eq.${project!.id}`} />
      <PageHeader eyebrow={project!.name} title="Plots and prices" sub="Every price change is logged automatically and feeds the buyer’s price history chart. Booked plots keep the price they were booked at." />
      <PlotTable plots={(plots || []).map((p) => ({ ...p, buyer: buyerOf[p.id] ?? null }))} />
    </>
  );
}
