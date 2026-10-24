// Delivery red flags (rules) plus the AI invoice read, shown on the inspection card.
import { AlertTriangle, CheckCircle2, Info } from 'lucide-react';
import type { CheckFlag } from '@/lib/ai/invoice';
import type { AICheck } from '@/lib/ai/delivery-check';
import { AISource } from './bits';

const ICON = { critical: AlertTriangle, warn: AlertTriangle, info: Info } as const;
const COLOR = { critical: 'var(--bad)', warn: 'var(--warn)', info: 'var(--ink-3)' } as const;

export function DeliveryFlags({ rules, ai }: { rules: CheckFlag[]; ai: AICheck | null }) {
  const aiFlags = ai?.flags || [];
  const all = [...aiFlags, ...rules.filter((r) => !aiFlags.some((a) => a.id === r.id))];
  const serious = all.filter((f) => f.severity !== 'info');
  return (
    <div className="mt-3 grid gap-1.5 rounded-xl border border-line bg-surface p-2.5">
      <div className="flex items-center justify-between gap-2 text-[11.5px] font-bold uppercase tracking-wide text-ink-3">
        <span>Gate checks</span>{ai?.source === 'ai' ? <AISource source="ai" /> : <AISource source="rules" />}
      </div>
      {serious.length === 0 && <div className="flex items-center gap-1.5 text-[12.5px] text-good"><CheckCircle2 className="size-3.5" />{ai?.source === 'ai' ? 'Invoice matches what was entered.' : 'No red flags in the entered details.'}</div>}
      {all.map((f) => { const I = ICON[f.severity]; return (
        <div key={f.id} className="flex gap-1.5 text-[12.5px]"><I className="mt-0.5 size-3.5 shrink-0" style={{ color: COLOR[f.severity] }} />
          <span><b style={{ color: COLOR[f.severity] }}>{f.label}.</b> <span className="text-ink-2">{f.detail}</span></span></div>
      ); })}
      {ai?.read && ai.source === 'ai' && (
        <div className="text-[11.5px] text-ink-3">Invoice says: {[ai.read.invoice_number && `#${ai.read.invoice_number}`, ai.read.invoice_date, ai.read.vehicle_number, ai.read.total != null && `total ₹${Number(ai.read.total).toLocaleString('en-IN')}`].filter(Boolean).join(' · ')}</div>
      )}
      {ai?.note && <div className="text-[11.5px] text-ink-3">{ai.note}</div>}
    </div>
  );
}
