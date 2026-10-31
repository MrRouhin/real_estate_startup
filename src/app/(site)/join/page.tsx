import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Clock } from 'lucide-react';
import { getSession, homeFor } from '@/lib/auth';
import { date } from '@/lib/format';
import { Pill } from '@/components/ui/bits';
import { JoinForm } from './join-form';

export const metadata: Metadata = { title: 'Join a developer’s team' };

export default async function JoinPage({ searchParams }: { searchParams: Promise<{ code?: string; role?: string }> }) {
  const { code, role } = await searchParams;
  const { supabase, user, profile } = await getSession();
  const linked = profile && ['contractor', 'vendor', 'employee'].includes(profile.role);
  if (linked) redirect(homeFor(profile!.role));
  const { data: mine } = user ? await supabase.from('access_requests').select('id, role, status, note, created_at, organizations(name)').eq('user_id', user.id).order('created_at', { ascending: false }) : { data: null };
  return (
    <div className="mx-auto grid max-w-2xl gap-6 py-6">
      <div className="flex items-start gap-3.5"><span className="emoji-badge" aria-hidden>🤝</span>
        <div><h1 className="text-[30px] font-bold leading-tight tracking-[-0.02em]">Join a developer’s team</h1>
          <p className="mt-1 text-ink-2">Contractors, suppliers and site workers join with the invite code the developer shares. Once they approve, your own workspace opens.</p></div></div>
      {!user ? (
        <div className="card grid gap-3 p-6">
          <p className="text-[14px]">First, create your REMMO account. It takes a minute.</p>
          <div className="grid gap-2 sm:grid-cols-3">
            <Link href="/login/contractor" className="btn btn-outline">👷 Contractor</Link>
            <Link href="/login/vendor" className="btn btn-outline">🚚 Supplier</Link>
            <Link href="/login/employee" className="btn btn-outline">🦺 Site worker</Link>
          </div>
        </div>
      ) : profile?.role === 'seller' || profile?.role === 'admin' ? (
        <div className="card p-6 text-[14px]">You are signed in as developer staff. Share your company’s invite code from <Link href="/console/settings" className="font-semibold text-accent">Console → Settings</Link>.</div>
      ) : (
        <>
          {(mine || []).length > 0 && (
            <div className="card grid gap-2 p-5">
              <h2 className="text-[15px] font-bold">Your requests</h2>
              {mine!.map((r) => (
                <div key={r.id} className="flex flex-wrap items-center justify-between gap-2 text-[13.5px]">
                  <span><b>{(r.organizations as unknown as { name: string } | null)?.name}</b> · as {r.role} · {date(r.created_at)}{r.note ? ` · “${r.note}”` : ''}</span>
                  {r.status === 'pending' ? <span className="flex items-center gap-1 text-warn"><Clock className="size-4" />Waiting for approval</span> : <Pill status={r.status} tone={r.status === 'approved' ? 'good' : 'bad'} />}
                </div>
              ))}
              {mine!.filter((r) => r.status === 'approved').slice(0, 1).map((r) => <Link key={r.id} href={`/${r.role}`} className="btn btn-primary mt-1 w-fit">Open your workspace</Link>)}
            </div>
          )}
          <JoinForm code={code} role={role} me={{ name: profile?.full_name ?? null, phone: profile?.phone ?? null, email: profile?.email ?? null }} />
        </>
      )}
    </div>
  );
}
