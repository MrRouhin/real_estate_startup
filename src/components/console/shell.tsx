'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import { Boxes, Building2, ExternalLink, FileText, Gauge, HardHat, KanbanSquare, Map, Package, Sparkles, Truck, Users, Wallet, Wrench } from 'lucide-react';
import { Logo } from '@/components/logo';
import { Avatar } from '@/components/ui/bits';
import { AskSite } from '@/components/ai/ask-site';

const NAV = [
  { group: null, items: [{ href: '/console', label: 'Overview', icon: Gauge }, { href: '/console/insights', label: 'AI insights', icon: Sparkles }] },
  { group: 'Sales', items: [
    { href: '/console/leads', label: 'Leads (CRM)', icon: KanbanSquare },
    { href: '/console/plots', label: 'Plots and prices', icon: Map },
    { href: '/console/bookings', label: 'Bookings', icon: Wallet },
    { href: '/console/modifications', label: 'Modifications', icon: Wrench },
  ] },
  { group: 'Site', items: [
    { href: '/console/construction', label: 'Construction', icon: Building2 },
    { href: '/console/contractors', label: 'Contractors', icon: HardHat },
    { href: '/console/materials', label: 'Materials', icon: Boxes },
    { href: '/console/vendors', label: 'Vendors', icon: Truck },
    { href: '/console/employees', label: 'Employees', icon: Users },
  ] },
  { group: 'Files', items: [{ href: '/console/documents', label: 'Documents', icon: FileText }] },
];

export function ConsoleShell({ children, org, project, user, badges }: {
  children: React.ReactNode; org: string; project: { name: string; slug: string } | null; user: { name: string; role: string };
  badges: Record<string, number>;
}) {
  const path = usePathname();
  const active = (href: string) => (href === '/console' ? path === href : path.startsWith(href));
  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[248px_minmax(0,1fr)]">
      {/* the wrapper paints the sidebar column full height; the aside itself stays pinned while the page scrolls */}
      <div className="contents lg:block lg:border-r lg:border-line lg:bg-surface">
      <aside className="sticky top-0 z-30 border-b border-line bg-surface lg:h-dvh lg:border-b-0">
        <div className="flex items-center gap-2.5 px-4 py-3.5 lg:px-5 lg:py-5">
          <Logo size={28} /><div className="min-w-0"><div className="font-display text-[16px] font-bold leading-tight">Plotline</div><div className="truncate text-[11.5px] text-ink-3">{org}</div></div>
        </div>
        <nav className="no-scrollbar flex gap-1 overflow-x-auto px-3 pb-2.5 lg:block lg:h-[calc(100dvh-150px)] lg:overflow-y-auto lg:px-3 lg:pb-4" aria-label="Console">
          {NAV.map((g) => (
            <div key={g.group || 'top'} className="contents lg:block">
              {g.group && <div className="eyebrow hidden px-3 pb-1.5 pt-4 lg:block">{g.group}</div>}
              {g.items.map((it) => {
                const on = active(it.href);
                const I = it.icon;
                return (
                  <Link key={it.href} href={it.href} aria-current={on ? 'page' : undefined}
                    className={'relative flex shrink-0 items-center gap-2.5 rounded-xl px-3 py-2 text-[13.5px] font-semibold transition-colors ' + (on ? 'text-accent' : 'text-ink-2 hover:bg-surface-2 hover:text-ink')}>
                    {on && <motion.span layoutId="nav-pill" className="absolute inset-0 -z-0 rounded-xl bg-accent-soft" transition={{ type: 'spring', stiffness: 420, damping: 34 }} />}
                    <I className="relative size-[17px]" /><span className="relative whitespace-nowrap">{it.label}</span>
                    {badges[it.href] ? <span className="relative ml-auto rounded-full bg-bad px-1.5 text-[10.5px] font-bold text-white">{badges[it.href]}</span> : null}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>
        <div className="hidden border-t border-line px-4 py-3 lg:flex lg:items-center lg:gap-2.5">
          <Avatar name={user.name} size={32} />
          <div className="min-w-0 flex-1"><div className="truncate text-[13px] font-semibold">{user.name}</div><div className="text-[11.5px] capitalize text-ink-3">{user.role === 'admin' ? 'Platform admin' : 'Developer staff'}</div></div>
          <form action="/auth/signout" method="post"><button className="btn btn-ghost btn-sm !px-2 text-[12px]">Sign out</button></form>
        </div>
      </aside>
      </div>
      <div className="min-w-0">
        <div className="flex items-center justify-between gap-3 border-b border-line/70 bg-bg/80 px-4 py-2.5 backdrop-blur sm:px-6">
          <div className="flex min-w-0 items-center gap-2 text-[13px]"><Package className="size-4 text-ink-3" /><span className="truncate font-semibold">{project?.name || 'No project yet'}</span></div>
          <div className="flex items-center gap-2">
            {project && <Link href={`/projects/${project.slug}`} target="_blank" className="btn btn-ghost btn-sm !bg-transparent"><ExternalLink className="size-4" /><span className="hidden sm:inline">Buyer view</span></Link>}
            <form action="/auth/signout" method="post" className="lg:hidden"><button className="btn btn-ghost btn-sm">Sign out</button></form>
          </div>
        </div>
        <motion.main key={path} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.28, ease: [0.2, 0.7, 0.2, 1] }}
          className="mx-auto grid max-w-[1400px] gap-6 px-4 py-6 sm:px-6 lg:px-8">
          {children}
        </motion.main>
        <AskSite />
      </div>
    </div>
  );
}
