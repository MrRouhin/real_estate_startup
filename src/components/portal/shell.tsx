'use client';
// Shared frame for the contractor, vendor and employee workspaces: a sidebar on desktop,
// a bottom tab bar on phones, a notification bell and the person's role badge.
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Bell, BookOpen, CalendarDays, ClipboardList, CreditCard, FileText, Gauge, HardHat, IdCard, Mail, Package, Palmtree, ReceiptIndianRupee, Store,
  Truck, User, Users, Wrench, type LucideIcon,
} from 'lucide-react';
import { Logo } from '@/components/logo';
import { Avatar } from '@/components/ui/bits';
import { ago } from '@/lib/format';
import { resolveLink } from '@/lib/links';
import { markAllRead } from '@/app/actions';
import { LiveRefresh } from '@/components/live-refresh';

const ICONS: Record<string, LucideIcon> = {
  gauge: Gauge, work: HardHat, crew: Users, bills: ReceiptIndianRupee, letters: Mail, profile: User, orders: ClipboardList, deliveries: Truck,
  invoices: CreditCard, catalog: Store, today: Gauge, attendance: CalendarDays, leave: Palmtree, id: IdCard, materials: Package, tasks: Wrench, docs: FileText, book: BookOpen,
};
export type NavItem = { href: string; label: string; icon: keyof typeof ICONS; badge?: number; mobile?: boolean };
type Note = { id: string; title: string; body: string | null; link: string | null; read_at: string | null; created_at: string };

const ROLE_TONE: Record<string, { label: string; color: string }> = {
  contractor: { label: 'Contractor', color: '#b4530a' },
  vendor: { label: 'Vendor', color: '#3a67d4' },
  employee: { label: 'Site team', color: '#2f9e5c' },
};

export function PortalShell({ role, home, nav, title, subtitle, user, notes, userId, now, children }: {
  role: 'contractor' | 'vendor' | 'employee'; home: string; nav: NavItem[]; title: string; subtitle?: string;
  user: string; notes: Note[]; userId: string; now: number; children: React.ReactNode;
}) {
  const path = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const active = (href: string) => (href === home ? path === href : path.startsWith(href));
  const unread = notes.filter((n) => !n.read_at).length;
  const tone = ROLE_TONE[role]!;
  useEffect(() => {
    const close = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);
  const mobileNav = nav.filter((n) => n.mobile !== false).slice(0, 5);
  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[244px_minmax(0,1fr)]">
      <LiveRefresh tables={['notifications']} filter={`user_id=eq.${userId}`} />
      <div className="hidden lg:block lg:border-r lg:border-line lg:bg-surface">
        <aside className="sticky top-0 flex h-dvh flex-col">
          <Link href={home} className="flex items-center gap-2.5 px-5 py-5">
            <Logo size={28} />
            <div className="min-w-0"><div className="font-display text-[16px] font-bold leading-tight tracking-[0.06em]">REMMO</div>
              <div className="text-[11.5px] font-semibold" style={{ color: tone.color }}>{tone.label} workspace</div></div>
          </Link>
          <nav className="flex-1 overflow-y-auto px-3 pb-4" aria-label="Workspace">
            {nav.map((it) => {
              const on = active(it.href), I = ICONS[it.icon] ?? Gauge;
              return (
                <Link key={it.href} href={it.href} aria-current={on ? 'page' : undefined}
                  className={'relative flex items-center gap-2.5 rounded-xl px-3 py-2 text-[13.5px] font-semibold transition-colors ' + (on ? 'text-accent' : 'text-ink-2 hover:bg-surface-2 hover:text-ink')}>
                  {on && <motion.span layoutId="portal-pill" className="absolute inset-0 -z-0 rounded-xl bg-accent-soft" transition={{ type: 'spring', stiffness: 420, damping: 34 }} />}
                  <I className="relative size-[17px]" /><span className="relative">{it.label}</span>
                  {it.badge ? <span className="relative ml-auto rounded-full bg-bad px-1.5 text-[10.5px] font-bold text-white">{it.badge}</span> : null}
                </Link>
              );
            })}
          </nav>
          <div className="flex items-center gap-2.5 border-t border-line px-4 py-3">
            <Avatar name={user} size={32} />
            <div className="min-w-0 flex-1"><div className="truncate text-[13px] font-semibold">{user}</div><div className="truncate text-[11.5px] text-ink-3">{title}</div></div>
            <form action="/auth/signout" method="post"><button className="btn btn-ghost btn-sm !px-2 text-[12px]">Sign out</button></form>
          </div>
        </aside>
      </div>
      <div className="min-w-0">
        <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-line/70 bg-bg/85 px-4 py-2.5 backdrop-blur-xl sm:px-6">
          <Link href={home} className="flex items-center gap-2 lg:hidden"><Logo size={26} /></Link>
          <div className="min-w-0 flex-1">
            <div className="truncate text-[14px] font-semibold">{title}</div>
            {subtitle && <div className="truncate text-[11.5px] text-ink-3">{subtitle}</div>}
          </div>
          <span className="hidden rounded-full px-2 py-0.5 text-[11px] font-bold sm:inline" style={{ color: tone.color, background: `color-mix(in srgb, ${tone.color} 12%, transparent)` }}>{tone.label}</span>
          <div ref={ref} className="relative">
            <button className="btn btn-ghost btn-sm relative !px-2" onClick={() => setOpen((o) => !o)} aria-label={`Notifications${unread ? `, ${unread} unread` : ''}`} aria-expanded={open}>
              <Bell className="size-[18px]" />
              {unread > 0 && <span className="num absolute -right-0.5 -top-0.5 grid min-w-[17px] place-items-center rounded-full bg-bad px-1 text-[10px] font-bold text-white">{unread}</span>}
            </button>
            {open && (
              <div className="absolute right-0 top-11 z-40 w-[min(360px,calc(100vw-24px))] overflow-hidden rounded-2xl border border-line bg-surface shadow-[var(--shadow)]">
                <div className="flex items-center justify-between border-b border-line px-4 py-2.5">
                  <b className="text-[13.5px]">Notifications</b>
                  {unread > 0 && <form action={async () => { await markAllRead(); router.refresh(); }}><button className="text-[12px] font-semibold text-accent">Mark all read</button></form>}
                </div>
                <ul className="max-h-[60vh] divide-y divide-line overflow-y-auto">
                  {notes.length === 0 && <li className="px-4 py-6 text-center text-[13px] text-ink-3">Nothing yet.</li>}
                  {notes.map((n) => {
                    const href = resolveLink(n.link, role);
                    const body = <><div className="flex items-start gap-2"><span className={'mt-1.5 size-2 shrink-0 rounded-full ' + (n.read_at ? 'bg-transparent' : 'bg-accent')} />
                      <div className="min-w-0"><div className="text-[13px] font-semibold">{n.title}</div>{n.body && <div className="line-clamp-2 text-[12.5px] text-ink-2">{n.body}</div>}
                        <div className="text-[11px] text-ink-3">{ago(n.created_at, now)}</div></div></div></>;
                    return <li key={n.id}>{href ? <Link href={href} onClick={() => setOpen(false)} className="block px-4 py-2.5 hover:bg-surface-2">{body}</Link> : <div className="px-4 py-2.5">{body}</div>}</li>;
                  })}
                </ul>
              </div>
            )}
          </div>
          <form action="/auth/signout" method="post" className="lg:hidden"><button className="btn btn-ghost btn-sm !px-2 text-[12px]">Sign out</button></form>
        </header>
        <motion.main key={path} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25, ease: [0.2, 0.7, 0.2, 1] }}
          className="mx-auto grid max-w-[1180px] gap-5 px-4 py-5 sm:px-6 lg:px-8 lg:py-7" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 92px)' }}>
          {children}
        </motion.main>
      </div>
      {/* phone tab bar */}
      <nav className="fixed inset-x-0 bottom-0 z-40 grid border-t border-line bg-surface/95 backdrop-blur lg:hidden" style={{ gridTemplateColumns: `repeat(${mobileNav.length}, minmax(0, 1fr))`, paddingBottom: 'env(safe-area-inset-bottom, 0px)' }} aria-label="Workspace tabs">
        {mobileNav.map((it) => {
          const on = active(it.href), I = ICONS[it.icon] ?? Gauge;
          return (
            <Link key={it.href} href={it.href} aria-current={on ? 'page' : undefined} className={'relative grid justify-items-center gap-0.5 py-2 text-[10.5px] font-semibold ' + (on ? 'text-accent' : 'text-ink-3')}>
              <I className="size-5" /><span className="truncate">{it.label}</span>
              {it.badge ? <span className="absolute right-[22%] top-1 size-2 rounded-full bg-bad" /> : null}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
