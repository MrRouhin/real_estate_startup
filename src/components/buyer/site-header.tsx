import Link from 'next/link';
import { Bell, LayoutDashboard, LogIn, HardHat } from 'lucide-react';
import { getSession, homeFor } from '@/lib/auth';
import { Avatar } from '@/components/ui/bits';
import { Logo } from '@/components/logo';

export async function SiteHeader() {
  const { supabase, user, profile } = await getSession();
  let unread = 0;
  if (user) {
    const { count } = await supabase.from('notifications').select('id', { count: 'exact', head: true }).eq('user_id', user.id).is('read_at', null);
    unread = count || 0;
  }
  const staff = profile && (profile.role === 'seller' || profile.role === 'admin');
  const partner = profile && ['contractor', 'vendor', 'employee'].includes(profile.role);
  return (
    <header className="sticky z-40 border-b border-line/70 bg-bg/80 backdrop-blur-xl" style={{ top: 'env(safe-area-inset-top, 0px)' }}>
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-3 px-4 sm:px-6" style={{ paddingLeft: 'max(16px, env(safe-area-inset-left))', paddingRight: 'max(16px, env(safe-area-inset-right))' }}>
        <Link href="/" className="mr-auto flex items-center gap-2.5"><Logo /><span className="font-display text-[19px] font-bold tracking-tight">Plotline</span></Link>
        <nav className="flex items-center gap-1.5 sm:gap-2">
          <Link href="/#projects" className="btn btn-ghost btn-sm hidden !bg-transparent sm:inline-flex">Projects</Link>
          {user ? (
            <>
              {staff && <Link href="/console" className="btn btn-outline btn-sm"><LayoutDashboard className="size-4" /><span className="hidden sm:inline">Console</span></Link>}
              {partner && <Link href="/portal" className="btn btn-outline btn-sm"><HardHat className="size-4" /><span className="hidden sm:inline">Site portal</span></Link>}
              {!staff && !partner && <Link href="/me" className="btn btn-ghost btn-sm !bg-transparent">My property</Link>}
              <Link href={homeFor(profile?.role) === '/me' ? '/me#alerts' : homeFor(profile?.role)} className="btn btn-ghost btn-sm relative !p-2" aria-label={`Notifications (${unread} unread)`}>
                <Bell className="size-[18px]" />
                {unread > 0 && <span className="absolute -right-0.5 -top-0.5 grid min-w-[17px] place-items-center rounded-full bg-bad px-1 text-[10px] font-bold text-white">{unread}</span>}
              </Link>
              <form action="/auth/signout" method="post" className="flex items-center gap-2">
                <span title={profile?.full_name || ''}><Avatar name={profile?.full_name || user.email} size={30} /></span>
                <button className="btn btn-ghost btn-sm hidden !bg-transparent sm:inline-flex" type="submit">Sign out</button>
              </form>
            </>
          ) : (
            <Link href="/login" className="btn btn-primary btn-sm"><LogIn className="size-4" />Sign in</Link>
          )}
        </nav>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="mt-20 border-t border-line">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-8 text-[13px] text-ink-3 sm:px-6">
        <div className="flex items-center gap-2"><Logo size={22} /><span className="font-display font-semibold text-ink-2">Plotline</span> · Plots you can watch being built</div>
        <div>Every project shows its RERA number. Payments are processed by Razorpay.</div>
      </div>
    </footer>
  );
}
