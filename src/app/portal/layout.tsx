import Link from 'next/link';
import { redirect } from 'next/navigation';
import { requireUser, homeFor } from '@/lib/auth';
import { Logo } from '@/components/logo';
import { Avatar } from '@/components/ui/bits';

export const metadata = { title: 'Site portal' };

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const { profile } = await requireUser('/portal');
  if (!['contractor', 'vendor', 'employee'].includes(profile.role)) redirect(homeFor(profile.role));
  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-30 border-b border-line bg-bg/85 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-3xl items-center gap-3 px-4">
          <Link href="/portal" className="mr-auto flex items-center gap-2"><Logo size={26} /><span className="font-display text-[16px] font-bold">Site portal</span></Link>
          <span className="flex items-center gap-2 text-[13px]"><Avatar name={profile.full_name} size={28} /><span className="hidden sm:inline">{profile.full_name}</span></span>
          <form action="/auth/signout" method="post"><button className="btn btn-ghost btn-sm">Sign out</button></form>
        </div>
      </header>
      <main className="mx-auto grid max-w-3xl gap-5 px-4 py-5" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 32px)' }}>{children}</main>
    </div>
  );
}
