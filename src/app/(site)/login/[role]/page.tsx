import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { ArrowLeft, Check } from 'lucide-react';
import { getSession, homeFor } from '@/lib/auth';
import { isRoleKey, ROLES } from '@/lib/roles';
import { LoginForm } from '../login-form';

export async function generateMetadata({ params }: { params: Promise<{ role: string }> }): Promise<Metadata> {
  const { role } = await params;
  return { title: isRoleKey(role) ? `Sign in · ${ROLES[role].title}` : 'Sign in' };
}

export default async function RoleLogin({ params }: { params: Promise<{ role: string }> }) {
  const { role } = await params;
  if (!isRoleKey(role)) notFound();
  const { user, profile } = await getSession();
  if (user) redirect(homeFor(profile?.role));
  const r = ROLES[role];
  return (
    <div className="mx-auto grid max-w-5xl gap-10 py-6 lg:grid-cols-[1fr_1fr] lg:items-center">
      <div>
        <Link href="/login" className="inline-flex items-center gap-1 text-[13px] text-ink-2 hover:text-ink"><ArrowLeft className="size-4" />Choose a different role</Link>
        <div className="mt-4 flex items-center gap-3"><span className="emoji-badge !size-14 !rounded-[18px] !text-[28px]" aria-hidden>{r.emoji}</span>
          <h1 className="text-[34px] font-bold leading-tight tracking-[-0.02em]">{r.title}</h1></div>
        <p className="mt-3 max-w-md text-[15px] text-ink-2">{r.who}</p>
        <ul className="mt-5 grid max-w-md gap-2.5">
          {r.can.map((c) => <li key={c} className="flex items-start gap-2.5 text-[14px]"><span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-accent-soft text-accent"><Check className="size-3.5" /></span>{c}</li>)}
        </ul>
        {role !== 'buyer' && role !== 'developer' && <p className="mt-5 max-w-md text-[13px] text-ink-3">Your developer links your account after you join with their invite code, so you only ever see your own work.</p>}
      </div>
      <LoginForm role={role} showDemo={process.env.NEXT_PUBLIC_SHOW_DEMO_LOGINS !== 'false'} />
    </div>
  );
}
