import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getSession, homeFor } from '@/lib/auth';
import { LoginForm } from './login-form';

export const metadata: Metadata = { title: 'Sign in' };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; error?: string }> }) {
  const { next, error } = await searchParams;
  const { user, profile } = await getSession();
  if (user) redirect(next && next.startsWith('/') ? next : homeFor(profile?.role));
  return (
    <div className="mx-auto grid max-w-5xl gap-10 py-6 lg:grid-cols-[1fr_1fr] lg:items-center">
      <div className="hidden lg:block">
        <div className="eyebrow">Plotline</div>
        <h1 className="mt-1 text-[38px] font-bold leading-tight">One login for buyers, developers and the site team.</h1>
        <p className="mt-3 max-w-md text-ink-2">Buyers sign in with their mobile number. Developer staff, contractors, vendors and site employees use email. Everyone lands on the screen made for their role.</p>
      </div>
      <LoginForm next={next} error={error} showDemo={process.env.NEXT_PUBLIC_SHOW_DEMO_LOGINS !== 'false'} />
    </div>
  );
}
