import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireUser } from '@/lib/auth';
import { holdPlot } from '@/app/actions';
import { SubmitButton } from '@/components/ui/action-form';
import { Empty } from '@/components/ui/bits';
import { BookingClient } from './booking-client';

export const metadata = { title: 'Book' };

type PlanStep = { label: string; pct: number; note?: string };

export default async function BookPage({ params }: { params: Promise<{ plotId: string }> }) {
  const { plotId } = await params;
  const { supabase, user, profile } = await requireUser(`/book/${plotId}`);
  const { data: plot } = await supabase.from('plots').select('*').eq('id', plotId).maybeSingle();
  if (!plot) notFound();
  const [{ data: project }, { data: org }] = await Promise.all([
    supabase.from('projects').select('name, slug, payment_plan, kind').eq('id', plot.project_id).single(),
    supabase.from('organizations').select('name, token_percent, payment_plan').eq('id', plot.org_id).single(),
  ]);
  const U = plot.kind === 'flat' ? 'Flat' : 'Plot', u = U.toLowerCase();
  const back = plot.kind === 'flat' ? `/projects/${project!.slug}/flats` : `/projects/${project!.slug}/plots`;
  const mine = plot.status === 'held' && plot.held_by === user.id && plot.held_until && new Date(plot.held_until).getTime() > Date.now();

  if (!mine) {
    const free = plot.status === 'available' || (plot.status === 'held' && plot.held_until && new Date(plot.held_until).getTime() < Date.now());
    return (
      <div className="mx-auto max-w-lg py-6">
        <Empty emoji="⏳" title={free ? 'Your hold has ended' : `${U} ${plot.plot_number} isn’t available`}>
          {free ? `Holds last 15 minutes. The ${u} is still free, so you can hold it again.` : `Another buyer is booking or has booked it. Pick another ${u}.`}
        </Empty>
        <div className="mt-4 flex justify-center gap-2">
          {free && <form action={holdPlot}><input type="hidden" name="plotId" value={plot.id} /><SubmitButton pendingText="Holding…">Hold {u} {plot.plot_number} again</SubmitButton></form>}
          <Link href={back} className="btn btn-outline">Back to {plot.kind === 'flat' ? 'the towers' : 'the map'}</Link>
        </div>
      </div>
    );
  }

  const tokenPct = Math.min(Number(org?.token_percent ?? 10), 10);
  const plan = ((project?.payment_plan ?? org?.payment_plan) as PlanStep[] | null) || [];
  return (
    <BookingClient
      plot={{ id: plot.id, number: plot.plot_number, price: Number(plot.price), area: Number(plot.area_sqft), facing: plot.facing, dims: plot.dimensions, kind: plot.kind === 'flat' ? 'flat' : 'plot' }}
      project={{ name: project!.name, slug: project!.slug }} developer={org?.name || ''}
      heldUntil={plot.held_until!} tokenPct={tokenPct} plan={plan}
      kyc={profile.kyc_status} userId={user.id} paymentsMode={process.env.PAYMENTS_MODE === 'razorpay' ? 'razorpay' : 'simulated'}
      buyer={{ name: profile.full_name || '', phone: profile.phone || '', email: profile.email || user.email || '' }} />
  );
}
