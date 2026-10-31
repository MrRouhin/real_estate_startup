import Link from 'next/link';
import { BadgeCheck, Clock, HardHat, Truck, Users } from 'lucide-react';
import { requireStaff } from '@/lib/auth';
import { date, todayIST } from '@/lib/format';
import { Avatar, PageHeader, Pill, Section } from '@/components/ui/bits';
import { LiveRefresh } from '@/components/live-refresh';
import { CopyInvite } from './copy-invite';

export const metadata = { title: 'People' };
const TONE: Record<string, 'good' | 'warn' | 'bad' | 'muted'> = { verified: 'good', submitted: 'warn', needs_changes: 'bad', draft: 'muted' };
const LABEL: Record<string, string> = { verified: 'Verified', submitted: 'To review', needs_changes: 'Changes asked', draft: 'Incomplete' };

export default async function People({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams;
  const { supabase, orgId, org } = await requireStaff();
  const [{ data: cs }, { data: vs }, { data: es }, { data: profs }, { data: att }, { data: members }] = await Promise.all([
    supabase.from('contractors').select('*').eq('org_id', orgId).order('company_name'),
    supabase.from('vendors').select('*').eq('org_id', orgId).order('company_name'),
    supabase.from('employees').select('*').eq('org_id', orgId).eq('active', true).order('full_name'),
    supabase.from('employee_profiles').select('employee_id, status, safety_trained, trade').eq('org_id', orgId),
    supabase.from('attendance').select('employee_id').eq('org_id', orgId).eq('work_date', todayIST()),
    supabase.from('organization_members').select('user_id, org_role, profiles(full_name, email)').eq('org_id', orgId),
  ]);
  const pm = new Map((profs || []).map((p) => [p.employee_id, p]));
  const here = new Set((att || []).map((a) => a.employee_id));
  const match = (s: string) => !q || s.toLowerCase().includes(q.toLowerCase());
  const crewOf = (cid: string) => (es || []).filter((e) => e.contractor_id === cid);
  const own = (es || []).filter((e) => !e.contractor_id);
  const verified = (es || []).filter((e) => pm.get(e.id)?.status === 'verified').length;
  return (
    <>
      <LiveRefresh tables={['contractors', 'vendors', 'employees', 'employee_profiles']} every={30000} />
      <PageHeader emoji="🪪" title="People" sub={`${(cs || []).length} contractors, ${(vs || []).length} suppliers and ${(es || []).length} workers. ${verified} workers verified, ${here.size} on site today.`}>
        <form className="flex gap-2"><input name="q" defaultValue={q} className="input !w-56" placeholder="Search by name" aria-label="Search people" /><button className="btn btn-outline">Search</button></form>
      </PageHeader>
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="grid content-start gap-5">
          <Section title="Contractors and their crews">
            <ul className="grid gap-3">
              {(cs || []).filter((c) => match(c.company_name) || crewOf(c.id).some((e) => match(e.full_name))).map((c) => { const crew = crewOf(c.id); return (
                <li key={c.id} className="rounded-2xl border border-[var(--glass-line)] p-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5"><span className="emoji-badge !size-10 !text-[19px]" aria-hidden>👷</span><div>
                      <Link href={`/console/contractors/${c.id}`} className="font-semibold hover:text-accent">{c.company_name}</Link>
                      <div className="text-[12px] capitalize text-ink-3">{c.trade} · {c.contact_person} · {c.phone}{c.user_id ? '' : ' · no login yet'}</div></div></div>
                    <Pill status={c.profile_status} tone={TONE[c.profile_status]} label={LABEL[c.profile_status]} />
                  </div>
                  {crew.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {crew.filter((e) => match(e.full_name) || match(c.company_name)).map((e) => { const p = pm.get(e.id); return (
                        <span key={e.id} className="inline-flex items-center gap-1.5 rounded-full border border-[var(--glass-line)] bg-[var(--glass)] py-0.5 pl-0.5 pr-2 text-[12px]" title={`${e.employee_code} · ${LABEL[p?.status ?? 'draft']}`}>
                          <Avatar name={e.full_name} size={20} />{e.full_name}
                          {p?.status === 'verified' ? <BadgeCheck className="size-3.5 text-good" /> : <Clock className="size-3.5 text-ink-3" />}
                          {here.has(e.id) && <span className="size-1.5 rounded-full bg-good" title="On site today" />}
                        </span>
                      ); })}
                    </div>
                  )}
                  <div className="mt-2 text-[12px] text-ink-3">{crew.length} workers · {crew.filter((e) => pm.get(e.id)?.status === 'verified').length} verified · {crew.filter((e) => here.has(e.id)).length} on site today{c.insurance_valid_till ? ` · insurance till ${date(c.insurance_valid_till)}` : ''}</div>
                </li>
              ); })}
            </ul>
          </Section>
          <div className="grid gap-5 md:grid-cols-2">
            <Section title="Suppliers">
              <ul className="divide-y divide-[var(--glass-line)]">
                {(vs || []).filter((v) => match(v.company_name)).map((v) => (
                  <li key={v.id} className="flex items-center justify-between gap-2 py-2.5 text-[13.5px]">
                    <div className="flex items-center gap-2"><Truck className="size-4 text-ink-3" /><div><Link href={`/console/vendors/${v.id}`} className="font-medium hover:text-accent">{v.company_name}</Link><div className="text-[12px] text-ink-3">{(v.categories || []).join(', ')}</div></div></div>
                    <Pill status={v.profile_status} tone={TONE[v.profile_status]} label={LABEL[v.profile_status]} />
                  </li>
                ))}
              </ul>
            </Section>
            <Section title="Our own staff on site">
              {own.length === 0 ? <p className="text-[13px] text-ink-2">Everyone on site works through a contractor.</p> : (
                <ul className="divide-y divide-[var(--glass-line)]">{own.filter((e) => match(e.full_name)).map((e) => (
                  <li key={e.id} className="flex items-center justify-between gap-2 py-2.5 text-[13.5px]"><span className="flex items-center gap-2"><Avatar name={e.full_name} size={24} />{e.full_name}<span className="text-[12px] text-ink-3">{e.role_title}</span></span>
                    <Pill status={pm.get(e.id)?.status ?? 'draft'} tone={TONE[pm.get(e.id)?.status ?? 'draft']} label={LABEL[pm.get(e.id)?.status ?? 'draft']} /></li>
                ))}</ul>
              )}
            </Section>
          </div>
        </div>
        <div className="grid content-start gap-5">
          <Section title="Invite people">
            <p className="text-[13px] text-ink-2">Share this code. Contractors, suppliers and workers sign up, enter it, and you approve them under Approvals.</p>
            <CopyInvite code={org.invite_code ?? ''} />
            <div className="mt-3 grid grid-cols-3 gap-2 text-center text-[11.5px]">
              <div className="rounded-xl bg-[var(--glass)] p-2"><HardHat className="mx-auto size-4 text-accent" />Contractors</div>
              <div className="rounded-xl bg-[var(--glass)] p-2"><Truck className="mx-auto size-4 text-accent" />Suppliers</div>
              <div className="rounded-xl bg-[var(--glass)] p-2"><Users className="mx-auto size-4 text-accent" />Workers</div>
            </div>
          </Section>
          <Section title="Developer team">
            <ul className="grid gap-2">{(members || []).map((m) => { const p = m.profiles as unknown as { full_name: string | null; email: string | null } | null; return (
              <li key={m.user_id} className="flex items-center gap-2 text-[13px]"><Avatar name={p?.full_name || p?.email} size={26} /><span className="flex-1 truncate">{p?.full_name || p?.email}</span><span className="tag capitalize">{m.org_role}</span></li>
            ); })}</ul>
          </Section>
          <Link href="/console/letters" className="card card-lift flex items-center gap-3 p-4 text-[13.5px]"><span className="emoji-badge !size-10 !text-[19px]" aria-hidden>✉️</span><span><b>Send a letter</b><span className="block text-ink-2">Work orders, compliance notices, appointments</span></span></Link>
        </div>
      </div>
    </>
  );
}
