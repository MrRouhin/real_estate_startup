import { AlertTriangle, BadgeIndianRupee, Box, CalendarCheck, Hammer, Info, KeyRound, Megaphone, Tag, Truck, UserPlus, UserRoundCheck } from 'lucide-react';
import { ago } from '@/lib/format';

const KIND: Record<string, { icon: typeof Info; color: string }> = {
  held: { icon: KeyRound, color: 'var(--st-held)' }, booked: { icon: KeyRound, color: 'var(--st-booked)' },
  paid: { icon: BadgeIndianRupee, color: 'var(--good)' }, price: { icon: Tag, color: 'var(--accent)' },
  lead: { icon: UserPlus, color: 'var(--accent)' }, visit: { icon: CalendarCheck, color: 'var(--st-held)' },
  update: { icon: Megaphone, color: 'var(--accent)' }, delivery: { icon: Truck, color: 'var(--st-booked)' },
  stock: { icon: Box, color: 'var(--ink-2)' }, attendance: { icon: UserRoundCheck, color: 'var(--good)' },
  alert: { icon: AlertTriangle, color: 'var(--bad)' }, info: { icon: Hammer, color: 'var(--ink-3)' },
};

export function ActivityFeed({ items }: { items: { id: number; kind: string; message: string; created_at: string }[] }) {
  if (!items.length) return <p className="text-[13.5px] text-ink-2">Nothing yet. Activity from sales and the site shows up here as it happens.</p>;
  return (
    <ol className="grid">
      {items.map((e, i) => {
        const k = KIND[e.kind] || KIND.info!;
        const I = k.icon;
        return (
          <li key={e.id} className="grid grid-cols-[30px_1fr_auto] items-start gap-3 border-b border-line py-2.5 last:border-0" style={{ animation: `rise .4s ${i * 0.03}s both` }}>
            <span className="grid size-[30px] place-items-center rounded-full" style={{ background: `color-mix(in srgb, ${k.color} 14%, transparent)`, color: k.color }}><I className="size-4" /></span>
            <span className="pt-1 text-[13.5px] leading-snug">{e.message}</span>
            <span className="whitespace-nowrap pt-1 text-[11.5px] text-ink-3">{ago(e.created_at)}</span>
          </li>
        );
      })}
    </ol>
  );
}
