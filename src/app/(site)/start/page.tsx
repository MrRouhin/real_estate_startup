import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import { StartForm } from './start-form';

export const metadata: Metadata = { title: 'List your projects on REMMO' };

const WHAT = [
  ['🏢', 'Sell', 'Plotted layouts and apartment towers with live availability, 3D walk-throughs, bookings and payments.'],
  ['🏗️', 'Build', 'Construction progress by tower and floor, materials, deliveries and site attendance, all live.'],
  ['🤝', 'Run your partners', 'Contractors, suppliers and workers in their own workspaces. Bills, orders and letters with a paper trail.'],
] as const;

export default async function StartPage() {
  const { supabase, user, profile } = await getSession();
  if (profile && (profile.role === 'seller' || profile.role === 'admin')) {
    const { count } = await supabase.from('organization_members').select('org_id', { count: 'exact', head: true }).eq('user_id', user!.id);
    if (count) redirect('/console');
  }
  const partner = profile && ['contractor', 'vendor', 'employee'].includes(profile.role);
  return (
    <div className="mx-auto grid max-w-5xl gap-10 py-6 lg:grid-cols-[1.05fr_1fr] lg:items-start">
      <div>
        <h1 className="text-[38px] font-bold leading-[1.08] tracking-[-0.025em] sm:text-[46px]">Run every project from one place.</h1>
        <p className="mt-3 max-w-lg text-[16px] text-ink-2">Register your company, add a project in a few minutes, and invite your team. Buyers see your projects once we have checked your RERA and GST details.</p>
        <div className="mt-6 grid gap-3">
          {WHAT.map(([e, t, d]) => (
            <div key={t} className="flex items-start gap-3"><span className="emoji-badge !size-11" aria-hidden>{e}</span><div><div className="font-semibold">{t}</div><p className="text-[13.5px] text-ink-2">{d}</p></div></div>
          ))}
        </div>
      </div>
      {!user ? (
        <div className="card grid gap-3 p-6">
          <h2 className="text-[20px] font-bold">Start with your account</h2>
          <p className="text-[14px] text-ink-2">Use your work email. You’ll register the company right after.</p>
          <Link href="/login/developer" className="btn btn-primary btn-lg">Create a developer account</Link>
          <p className="text-[12.5px] text-ink-3">Want to look around first? Sign in with the demo developer account on the same page.</p>
        </div>
      ) : partner ? (
        <div className="card p-6 text-[14px]">This login belongs to a partner workspace. Use a separate account to register a developer company.</div>
      ) : (
        <StartForm email={profile?.email ?? ''} />
      )}
    </div>
  );
}
