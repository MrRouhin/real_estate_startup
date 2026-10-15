import { requireStaff } from '@/lib/auth';
import { PageHeader } from '@/components/ui/bits';
import { LiveRefresh } from '@/components/live-refresh';
import { LeadBoard } from './board';
import { AddLead } from './add-lead';

export const metadata = { title: 'Leads' };

export default async function LeadsPage() {
  const { supabase, orgId } = await requireStaff();
  const [{ data: leads }, { data: staff }, { data: visits }] = await Promise.all([
    supabase.from('leads').select('id, full_name, phone, source, stage, budget_min, budget_max, preferred_size, next_follow_up_at, assigned_to, lost_reason, updated_at, created_at, plots(plot_number)')
      .eq('org_id', orgId).order('updated_at', { ascending: false }),
    supabase.from('organization_members').select('user_id, profiles(full_name)').eq('org_id', orgId),
    supabase.from('site_visits').select('lead_id, scheduled_at, status').eq('org_id', orgId).eq('status', 'scheduled'),
  ]);
  const people = (staff || []).map((m) => ({ id: m.user_id, name: (m.profiles as unknown as { full_name: string } | null)?.full_name || 'Staff' }));
  const nextVisit = Object.fromEntries((visits || []).map((v) => [v.lead_id, v.scheduled_at]));
  const rows = (leads || []).map((l) => ({
    ...l, plot: (l.plots as unknown as { plot_number: string } | null)?.plot_number ?? null,
    owner: people.find((p) => p.id === l.assigned_to)?.name ?? null, visit: nextVisit[l.id] ?? null,
  }));
  const open = rows.filter((l) => !['won', 'lost'].includes(l.stage));
  const pipeline = open.reduce((a, l) => a + Number(l.budget_max || l.budget_min || 0), 0);
  return (
    <>
      <LiveRefresh tables={['leads']} filter={`org_id=eq.${orgId}`} />
      <PageHeader eyebrow="CRM" title="Leads pipeline"
        sub={<><b className="num text-ink">{open.length}</b> open leads · <b className="num text-ink">₹{(pipeline / 1e7).toFixed(2)} Cr</b> in budgets · drag a card to move it</>}>
        <AddLead people={people} />
      </PageHeader>
      <LeadBoard leads={rows} people={people} now={Date.now()} />
    </>
  );
}
