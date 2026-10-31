import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ArrowRight } from 'lucide-react';
import { getSession, homeFor } from '@/lib/auth';
import { ROLES, type RoleKey } from '@/lib/roles';
import { LoginForm } from './login-form';

export const metadata: Metadata = { title: 'Sign in' };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; error?: string }> }) {
  const { next, error } = await searchParams;
  const { user, profile } = await getSession();
  if (user) redirect(next && next.startsWith('/') ? next : homeFor(profile?.role));
  // Sent here from a page that needs a login: sign in straight away.
  if (next || error) {
    return (
      <div className="mx-auto grid max-w-md gap-6 py-6">
        <LoginForm next={next} error={error} showDemo={process.env.NEXT_PUBLIC_SHOW_DEMO_LOGINS !== 'false'} />
        <p className="text-center text-[13px] text-ink-2">Not sure which account? <Link href="/login" className="font-semibold text-accent">Choose who you are</Link></p>
      </div>
    );
  }
  return (
    <div className="mx-auto grid max-w-5xl gap-8 py-6">
      <div className="text-center">
        <h1 className="text-[34px] font-bold leading-tight tracking-[-0.02em] sm:text-[42px]">Who’s signing in?</h1>
        <p className="mx-auto mt-2 max-w-xl text-ink-2">Everyone on a project uses REMMO, each with a workspace made for their job. Pick yours.</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {(Object.keys(ROLES) as RoleKey[]).map((k) => { const r = ROLES[k]; return (
          <Link key={k} href={`/login/${k}`} className="card card-lift group grid content-start gap-3 p-5">
            <span className="emoji-badge" aria-hidden>{r.emoji}</span>
            <div><div className="text-[16px] font-bold">{r.title}</div><p className="mt-0.5 text-[13px] leading-snug text-ink-2">{r.who}</p></div>
            <span className="mt-auto inline-flex items-center gap-1 text-[13px] font-semibold text-accent">Sign in <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" /></span>
          </Link>
        ); })}
      </div>
      <p className="text-center text-[13px] text-ink-2">Starting a real estate company? <Link href="/start" className="font-semibold text-accent">Register it on REMMO</Link> · Working with a developer? <Link href="/join" className="font-semibold text-accent">Join with their invite code</Link></p>
    </div>
  );
}
