import Link from 'next/link';
import { BadgeCheck, Bell, Building2, KeyRound } from 'lucide-react';
import { requireUser } from '@/lib/auth';
import { ago, lakh } from '@/lib/format';
import { resolveLink } from '@/lib/links';
import { Empty, PageHeader, Pill } from '@/components/ui/bits';
import { Item, ProgressBar, Stagger } from '@/components/ui/motion';
import { LiveRefresh } from '@/components/live-refresh';
import { markAllRead } from '@/app/actions';

export const metadata = { title: 'My home' };

export default async function MePage() {
  const { supabase, user, profile } = await requireUser('/me');
  const [{ data: bookings }, { data: notes }] = await Promise.all([
    supabase.from('bookings').select('*, plots(id, kind, floor, plot_number, area_sqft, facing, project_id, projects(name, slug, progress_percent))')
      .eq('buyer_id', user.id).neq('status', 'cancelled').order('created_at', { ascending: false }),
    supabase.from('notifications').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(20),
  ]);
  const ids = (bookings || []).map((b) => b.id);
  const { data: paid } = ids.length ? await supabase.from('payments').select('booking_id, amount').in('booking_id', ids).eq('status', 'paid') : { data: [] };
  const paidBy = (id: string) => (paid || []).filter((p) => p.booking_id === id).reduce((a, p) => a + Number(p.amount), 0);
  const unread = (notes || []).filter((n) => !n.read_at).length;
  const kycLabel: Record<string, string> = { not_started: 'Not started', submitted: 'Under review', verified: 'Verified', rejected: 'Needs attention' };

  return (
    <div className="grid gap-8">
      <LiveRefresh tables={['notifications']} filter={`user_id=eq.${user.id}`} />
      <LiveRefresh tables={['bookings']} filter={`buyer_id=eq.${user.id}`} />
      <PageHeader emoji="🔑" title={`Hi ${profile.full_name?.split(' ')[0] || 'there'}`} sub="Your homes, payments and every update from the site.">
        <Link href="/me/profile" className={'btn btn-sm ' + (profile.kyc_status === 'verified' ? 'btn-outline' : 'btn-primary')}><BadgeCheck className="size-4" />{profile.kyc_status === 'verified' ? 'Profile' : `KYC: ${kycLabel[profile.kyc_status] || profile.kyc_status}`}</Link>
      </PageHeader>
      <section>
        <h2 className="mb-3 flex items-center gap-2 text-[18px] font-bold"><KeyRound className="size-5 text-accent" />Your homes and plots</h2>
        {(bookings || []).length === 0 ? (
          <Empty emoji="🏡" title="Nothing booked yet" href="/#projects" cta="Browse projects">When you book a flat or a plot, its payments, documents and construction progress show up here.</Empty>
        ) : (
          <Stagger className="grid gap-4 md:grid-cols-2">
            {bookings!.map((b) => {
              const plot = b.plots as unknown as { id: string; kind: string; floor: number | null; plot_number: string; area_sqft: number; facing: string; projects: { name: string; slug: string; progress_percent: number } };
              const p = paidBy(b.id), total = Number(b.total_amount);
              return (
                <Item key={b.id}>
                  <Link href={`/me/bookings/${b.id}`} className="card card-lift grid gap-3 p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div><div className="text-[12px] text-ink-3">{plot.projects.name}</div><div className="font-display text-[26px] font-bold leading-tight">{plot.kind === 'flat' ? 'Flat' : 'Plot'} {plot.plot_number}</div></div>
                      <Pill status={b.status} />
                    </div>
                    <div className="flex justify-between text-[13px]"><span className="text-ink-2">Paid <b className="num text-ink">{lakh(p)}</b> of {lakh(total)}</span><span className="num text-ink-3">{Math.round((p / total) * 100)}%</span></div>
                    <ProgressBar value={(p / total) * 100} color="var(--good)" />
                    <div className="flex items-center gap-2 text-[12.5px] text-ink-2"><Building2 className="size-4" />{plot.kind === 'flat' ? 'Project' : 'Site'} {Math.round(Number(plot.projects.progress_percent))}% built</div>
                  </Link>
                  {plot.kind === 'flat' && <Link href={`/flats/${plot.id}`} className="btn btn-outline btn-sm mt-2 w-full">🏠 Walk through your flat in 3D and see your floor today</Link>}
                </Item>
              );
            })}
          </Stagger>
        )}
      </section>
      <section id="alerts" className="scroll-mt-24">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 text-[18px] font-bold"><Bell className="size-5 text-accent" />Notifications {unread > 0 && <span className="tag tag-accent">{unread} new</span>}</h2>
          {unread > 0 && <form action={markAllRead}><button className="btn btn-ghost btn-sm">Mark all read</button></form>}
        </div>
        {(notes || []).length === 0 ? <Empty title="No notifications yet" /> : (
          <ul className="card divide-y divide-line">
            {notes!.map((n) => {
              const href = resolveLink(n.link, profile.role);
              const inner = (
                <div className="flex items-start gap-3 p-4">
                  <span className={'mt-1.5 size-2 shrink-0 rounded-full ' + (n.read_at ? 'bg-transparent' : 'bg-accent')} />
                  <div className="min-w-0 flex-1"><div className="font-semibold">{n.title}</div>{n.body && <div className="text-[13.5px] text-ink-2">{n.body}</div>}</div>
                  <span className="shrink-0 text-[12px] text-ink-3">{ago(n.created_at)}</span>
                </div>
              );
              return <li key={n.id}>{href ? <Link href={href} className="block hover:bg-surface-2/50">{inner}</Link> : inner}</li>;
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
