import Link from 'next/link';
import { initials } from '@/lib/format';
import { STATUS_COLOR, STATUS_LABEL } from '@/lib/site';
import type { PlotStatus } from '@/lib/types';

const TONE: Record<string, string> = {
  good: 'var(--good)', warn: 'var(--warn)', bad: 'var(--bad)', info: 'var(--st-booked)', muted: 'var(--ink-3)', accent: 'var(--accent)',
};
const STATUS_TONE: Record<string, keyof typeof TONE> = {
  // bookings
  pending_payment: 'warn', confirmed: 'info', registered: 'muted', handed_over: 'good', cancelled: 'muted', refund_due: 'bad',
  // requests / deliveries / packages / modifications
  requested: 'warn', approved: 'info', issued: 'good', rejected: 'bad', pending_inspection: 'warn', accepted: 'good', partially_accepted: 'warn',
  not_started: 'muted', in_progress: 'info', completed: 'good', delayed: 'bad', quoted: 'warn', done: 'good', active: 'good', on_hold: 'warn',
  // leads
  new: 'accent', contacted: 'info', site_visit: 'warn', negotiation: 'warn', won: 'good', lost: 'muted',
  scheduled: 'info', no_show: 'bad', due: 'warn', paid: 'good', overdue: 'bad',
};
const LABEL: Record<string, string> = {
  pending_payment: 'Awaiting payment', confirmed: 'Booked', handed_over: 'Handed over', refund_due: 'Refund due',
  pending_inspection: 'To inspect', partially_accepted: 'Part accepted', site_visit: 'Site visit', no_show: 'No show',
  in_progress: 'In progress', not_started: 'Not started', on_hold: 'On hold',
};

export function Pill({ status, label, tone }: { status: string; label?: string; tone?: keyof typeof TONE }) {
  const color = TONE[tone || STATUS_TONE[status] || 'muted'];
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2 py-0.5 text-[11.5px] font-bold capitalize"
      style={{ color, background: `color-mix(in srgb, ${color} 13%, transparent)` }}>
      <span className="size-1.5 rounded-full" style={{ background: color }} />
      {label || LABEL[status] || status.replace(/_/g, ' ')}
    </span>
  );
}

export function PlotPill({ status }: { status: PlotStatus }) {
  const c = STATUS_COLOR[status];
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2 py-0.5 text-[11.5px] font-bold"
      style={{ color: status === 'held' ? 'var(--warn)' : status === 'sold' ? 'var(--ink-2)' : c, background: `color-mix(in srgb, ${c} 15%, transparent)` }}>
      <span className={'size-1.5 rounded-full ' + (status === 'held' ? 'animate-pulse' : '')} style={{ background: c }} />
      {STATUS_LABEL[status]}
    </span>
  );
}

export function Avatar({ name, size = 32, hue }: { name: string | null | undefined; size?: number; hue?: number }) {
  const h = hue ?? [...(name || 'x')].reduce((a, ch) => a + ch.charCodeAt(0), 0) % 360;
  return (
    <span className="inline-grid shrink-0 place-items-center rounded-full font-semibold text-white"
      style={{ width: size, height: size, fontSize: size * 0.38, background: `linear-gradient(135deg, hsl(${h} 45% 45%), hsl(${(h + 40) % 360} 50% 35%))` }}
      aria-hidden>{initials(name)}</span>
  );
}

export function PageHeader({ eyebrow, title, children, sub }: { eyebrow?: string; title: string; sub?: React.ReactNode; children?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0">
        {eyebrow && <div className="eyebrow mb-1">{eyebrow}</div>}
        <h1 className="text-[26px] font-bold leading-tight">{title}</h1>
        {sub && <div className="mt-1 text-[13.5px] text-ink-2">{sub}</div>}
      </div>
      {children && <div className="flex flex-wrap items-center gap-2">{children}</div>}
    </div>
  );
}

export function Empty({ icon, title, children, href, cta }: { icon?: React.ReactNode; title: string; children?: React.ReactNode; href?: string; cta?: string }) {
  return (
    <div className="grid justify-items-center gap-2 rounded-2xl border border-dashed border-line px-6 py-10 text-center text-ink-2">
      {icon && <div className="text-ink-3">{icon}</div>}
      <div className="font-semibold text-ink">{title}</div>
      {children && <div className="max-w-sm text-[13.5px]">{children}</div>}
      {href && cta && <Link className="btn btn-primary btn-sm mt-1" href={href}>{cta}</Link>}
    </div>
  );
}

export function Stat({ label, children, sub, color }: { label: string; children: React.ReactNode; sub?: React.ReactNode; color?: string }) {
  return (
    <div className="card relative overflow-hidden p-4">
      <div className="eyebrow">{label}</div>
      <div className="num mt-1 text-[24px] font-medium tracking-tight">{children}</div>
      {sub && <div className="mt-0.5 text-[12px] text-ink-3">{sub}</div>}
      {color && <span className="absolute inset-x-0 bottom-0 h-1" style={{ background: color }} />}
    </div>
  );
}

export function Section({ title, children, action, className = '' }: { title: string; children: React.ReactNode; action?: React.ReactNode; className?: string }) {
  return (
    <section className={'card min-w-0 p-4 sm:p-5 ' + className}>
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-[15.5px] font-semibold">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

export function Legend() {
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-[12.5px] text-ink-2">
      {(Object.keys(STATUS_COLOR) as PlotStatus[]).map((s) => (
        <span key={s} className="inline-flex items-center gap-1.5">
          <i className="inline-block size-2.5 rounded-[3px]" style={{ background: STATUS_COLOR[s] }} />{STATUS_LABEL[s]}
        </span>
      ))}
    </div>
  );
}
