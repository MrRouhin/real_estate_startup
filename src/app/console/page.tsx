import Link from 'next/link';
import { AlertTriangle, ArrowRight, CalendarClock, Package, PhoneCall, Truck, Users } from 'lucide-react';
import { requireStaff } from '@/lib/auth';
import { loadSite } from '@/lib/queries';
import { asLayout, STATUS_COLOR, STATUS_LABEL } from '@/lib/site';
import { dateTime, lakh, todayIST } from '@/lib/format';
import { SiteView } from '@/components/three/site-view';
import { Bars, Funnel } from '@/components/charts/bars';
import { ActivityFeed } from '@/components/console/feed';
import { AnimatedNumber, Item, Stagger } from '@/components/ui/motion';
import { Empty, PageHeader, Section } from '@/components/ui/bits';
import { LiveRefresh } from '@/components/live-refresh';
import type { PlotStatus } from '@/lib/types';

export const metadata = { title: 'Overview' };

export default async function Overview() {
  const { supabase, orgId, project, profile } = await requireStaff();
  if (!project) return <Empty title="No project yet">Ask the platform admin to create your first project.</Empty>;
  const since = new Date(); since.setMonth(since.getMonth() - 7); since.setDate(1);
  const in7 = new Date(Date.now() + 7 * 86400000).toISOString();
  const [stats, balances, leads, pays, feed, visits, followUps, emps, att, deliveries, requests, stock, site] = await Promise.all([
    supabase.from('project_stats').select('*').eq('project_id', project.id).single(),
    supabase.from('booking_balances').select('balance, status').eq('org_id', orgId).in('status', ['confirmed', 'registered', 'handed_over']),
    supabase.from('leads').select('stage').eq('org_id', orgId),
    supabase.from('payments').select('amount, paid_at').eq('org_id', orgId).eq('status', 'paid').gte('paid_at', since.toISOString()),
    supabase.from('activity_log').select('id, kind, message, created_at').eq('org_id', orgId).order('created_at', { ascending: false }).limit(14),
    supabase.from('site_visits').select('id, scheduled_at, lead_id, leads(full_name, phone)').eq('org_id', orgId).eq('status', 'scheduled').gte('scheduled_at', new Date().toISOString()).lte('scheduled_at', in7).order('scheduled_at').limit(5),
    supabase.from('leads').select('id, full_name, next_follow_up_at, stage').eq('org_id', orgId).not('stage', 'in', '(won,lost)').lte('next_follow_up_at', new Date(Date.now() + 86400000).toISOString()).order('next_follow_up_at').limit(5),
    supabase.from('employees').select('id', { count: 'exact', head: true }).eq('org_id', orgId).eq('active', true),
    supabase.from('attendance').select('inside_geofence').eq('org_id', orgId).eq('work_date', todayIST()),
    supabase.from('deliveries').select('id', { count: 'exact', head: true }).eq('org_id', orgId).eq('status', 'pending_inspection'),
    supabase.from('material_requests').select('id', { count: 'exact', head: true }).eq('org_id', orgId).in('status', ['requested', 'approved']),
    supabase.from('material_stock').select('name, in_store, reorder_level, unit').eq('project_id', project.id),
    loadSite(supabase, project.id),
  ]);
  const s = stats.data!;
  const outstanding = (balances.data || []).reduce((a, b) => a + Number(b.balance), 0);
  const stageCount = (st: string) => (leads.data || []).filter((l) => l.stage === st).length;
  const months: { key: string; label: string; value: number }[] = [];
  for (let i = 7; i >= 0; i--) { const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - i); months.push({ key: `${d.getFullYear()}-${d.getMonth()}`, label: d.toLocaleDateString('en-IN', { month: 'short' }), value: 0 }); }
  (pays.data || []).forEach((p) => { const d = new Date(p.paid_at!); const m = months.find((x) => x.key === `${d.getFullYear()}-${d.getMonth()}`); if (m) m.value += Number(p.amount); });
  const low = (stock.data || []).filter((m) => Number(m.in_store) < Number(m.reorder_level));
  const present = (att.data || []).length, outside = (att.data || []).filter((a) => a.inside_geofence === false).length;
  const sellable = Number(s.total_plots) - (site.plots.filter((p) => p.status === 'blocked').length);
  const statusSegs: [PlotStatus, number][] = [['sold', Number(s.sold)], ['booked', Number(s.booked)], ['held', Number(s.held)], ['available', Number(s.available)], ['blocked', Number(s.total_plots) - Number(s.sold) - Number(s.booked) - Number(s.held) - Number(s.available)]];

  const hourIST = new Date(Date.now() + 5.5 * 3600000).getUTCHours();
  return (
    <>
      <LiveRefresh tables={['activity_log', 'plots', 'payments', 'leads']} filter={`org_id=eq.${orgId}`} />
      <PageHeader eyebrow={new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'Asia/Kolkata' })}
        title={`Good ${hourIST < 12 ? 'morning' : hourIST < 17 ? 'afternoon' : 'evening'}, ${profile.full_name?.split(' ')[0] || 'team'}`}
        sub={<>{project.name} is <b className="num text-ink">{Math.round(Number(project.progress_percent))}%</b> developed with <b className="num text-ink">{s.available}</b> plots on sale.</>} />

      <Stagger className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        {[
          ['Available', Number(s.available), `of ${sellable} on sale`, STATUS_COLOR.available],
          ['Being booked', Number(s.held), '15-minute holds', STATUS_COLOR.held],
          ['Booked', Number(s.booked), 'token paid', STATUS_COLOR.booked],
          ['Sold', Number(s.sold), 'registered', STATUS_COLOR.sold],
        ].map(([l, v, sub, c]) => (
          <Item key={l as string} className="card relative overflow-hidden p-4">
            <div className="eyebrow">{l}</div><div className="num mt-1 text-[26px] font-medium"><AnimatedNumber value={v as number} /></div>
            <div className="text-[12px] text-ink-3">{sub}</div><span className="absolute inset-x-0 bottom-0 h-1" style={{ background: c as string }} />
          </Item>
        ))}
        <Item className="card p-4"><div className="eyebrow">Collected</div><div className="num mt-1 text-[26px] font-medium">{lakh(s.amount_collected)}</div><div className="text-[12px] text-ink-3">all time</div></Item>
        <Item className="card p-4"><div className="eyebrow">Outstanding</div><div className="num mt-1 text-[26px] font-medium">{lakh(outstanding)}</div><div className="text-[12px] text-ink-3">due from buyers</div></Item>
      </Stagger>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]">
        <div className="card overflow-hidden">
          <SiteView plots={site.plots} layout={asLayout(project.layout)} progress={site.progress} height={380} autoRotate />
          <div className="border-t border-line p-4">
            <div className="flex h-3 gap-0.5 overflow-hidden rounded-full" role="img" aria-label="Inventory by status">
              {statusSegs.filter(([, n]) => n > 0).map(([st, n]) => <span key={st} style={{ flex: n, background: STATUS_COLOR[st] }} title={`${STATUS_LABEL[st]}: ${n}`} />)}
            </div>
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[12.5px] text-ink-2">
              {statusSegs.map(([st, n]) => <span key={st} className="inline-flex items-center gap-1.5"><i className="size-2.5 rounded-[3px]" style={{ background: STATUS_COLOR[st] }} />{STATUS_LABEL[st]} <b className="num text-ink">{n}</b></span>)}
            </div>
          </div>
        </div>
        <Section title="Live activity" action={<span className="flex items-center gap-1.5 text-[12px] text-ink-3"><span className="size-2 animate-pulse rounded-full bg-good" />Live</span>}>
          <div className="max-h-[420px] overflow-y-auto pr-1"><ActivityFeed items={feed.data || []} /></div>
        </Section>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Section title="Sales funnel" action={<Link href="/console/leads" className="btn btn-ghost btn-sm">Open CRM <ArrowRight className="size-3.5" /></Link>}>
          <Funnel stages={[
            { label: 'All leads', value: (leads.data || []).length, color: 'var(--accent)' },
            { label: 'Contacted', value: (leads.data || []).filter((l) => l.stage !== 'new').length - stageCount('lost'), color: 'var(--st-booked)' },
            { label: 'Site visit', value: stageCount('site_visit') + stageCount('negotiation') + stageCount('won'), color: 'var(--st-held)' },
            { label: 'Negotiation', value: stageCount('negotiation') + stageCount('won'), color: '#c2410c' },
            { label: 'Booked', value: stageCount('won'), color: 'var(--good)' },
          ]} />
        </Section>
        <Section title="Collections by month" className="lg:col-span-2">
          <Bars data={months} unit="lakh" />
        </Section>
      </div>

      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
        <Section title="On site today">
          <div className="flex items-end gap-2"><span className="num text-[34px] font-medium"><AnimatedNumber value={present} /></span><span className="pb-2 text-ink-2">of {emps.count || 0} checked in</span></div>
          {outside > 0 && <p className="mt-1 flex items-center gap-1.5 text-[13px] text-bad"><AlertTriangle className="size-4" />{outside} checked in outside the site</p>}
          <Link href="/console/employees" className="btn btn-ghost btn-sm mt-3"><Users className="size-4" />Attendance</Link>
        </Section>
        <Section title="Stores">
          <ul className="grid gap-2 text-[13.5px]">
            <li className="flex items-center justify-between"><span className="flex items-center gap-2"><Truck className="size-4 text-ink-3" />Deliveries to inspect</span><b className="num">{deliveries.count || 0}</b></li>
            <li className="flex items-center justify-between"><span className="flex items-center gap-2"><Package className="size-4 text-ink-3" />Material requests open</span><b className="num">{requests.count || 0}</b></li>
            <li className="flex items-center justify-between"><span className="flex items-center gap-2"><AlertTriangle className="size-4 text-bad" />Below reorder level</span><b className="num text-bad">{low.length}</b></li>
          </ul>
          {low.length > 0 && <p className="mt-2 text-[12px] text-ink-3">{low.map((m) => m.name).join(', ')}</p>}
          <Link href="/console/materials" className="btn btn-ghost btn-sm mt-3">Open stores</Link>
        </Section>
        <Section title="Site visits this week">
          {(visits.data || []).length === 0 ? <p className="text-[13.5px] text-ink-2">None scheduled.</p> : (
            <ul className="grid gap-2">{visits.data!.map((v) => {
              const l = v.leads as unknown as { full_name: string } | null;
              return <li key={v.id}><Link href={`/console/leads/${v.lead_id}`} className="flex items-center justify-between gap-2 text-[13.5px] hover:text-accent"><span className="flex items-center gap-2"><CalendarClock className="size-4 text-ink-3" />{l?.full_name}</span><span className="text-[12px] text-ink-3">{dateTime(v.scheduled_at)}</span></Link></li>;
            })}</ul>
          )}
        </Section>
        <Section title="Follow-ups due">
          {(followUps.data || []).length === 0 ? <p className="text-[13.5px] text-ink-2">All caught up.</p> : (
            <ul className="grid gap-2">{followUps.data!.map((l) => (
              <li key={l.id}><Link href={`/console/leads/${l.id}`} className="flex items-center justify-between gap-2 text-[13.5px] hover:text-accent">
                <span className="flex items-center gap-2"><PhoneCall className="size-4 text-ink-3" />{l.full_name}</span>
                <span className={'text-[12px] ' + (new Date(l.next_follow_up_at!) < new Date() ? 'font-semibold text-bad' : 'text-ink-3')}>{new Date(l.next_follow_up_at!) < new Date() ? 'overdue' : dateTime(l.next_follow_up_at)}</span></Link></li>
            ))}</ul>
          )}
        </Section>
      </div>
    </>
  );
}
