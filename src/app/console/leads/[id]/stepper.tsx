'use client';
import { useState, useTransition } from 'react';
import { motion } from 'framer-motion';
import { Check } from 'lucide-react';
import { moveLead } from '../../actions';
import { useToast } from '@/components/ui/toast';
import type { LeadStage } from '@/lib/types';

const FLOW: { key: LeadStage; label: string }[] = [
  { key: 'new', label: 'New' }, { key: 'contacted', label: 'Contacted' }, { key: 'site_visit', label: 'Site visit' },
  { key: 'negotiation', label: 'Negotiation' }, { key: 'won', label: 'Booked' },
];

export function StageStepper({ id, stage, lostReason }: { id: string; stage: LeadStage; lostReason: string | null }) {
  const [cur, setCur] = useState(stage);
  const [pending, start] = useTransition();
  const toast = useToast();
  const idx = FLOW.findIndex((s) => s.key === cur);
  const go = (to: LeadStage, why?: string) => start(async () => {
    const prev = cur; setCur(to);
    const r = await moveLead(id, to, why);
    if (!r.ok) { setCur(prev); toast(r.error!, 'error'); } else toast('Stage updated');
  });
  return (
    <div className="card flex flex-wrap items-center gap-3 p-3" aria-busy={pending}>
      <ol className="flex flex-1 items-center gap-1 overflow-x-auto">
        {FLOW.map((s, i) => {
          const done = cur !== 'lost' && i < idx, on = s.key === cur;
          return (
            <li key={s.key} className="flex flex-1 items-center gap-1">
              <button onClick={() => go(s.key)} disabled={on || s.key === 'won'} title={s.key === 'won' ? 'Moves to Booked automatically when the buyer pays' : `Move to ${s.label}`}
                className={'relative flex w-full items-center justify-center gap-1.5 whitespace-nowrap rounded-xl px-3 py-2 text-[13px] font-semibold transition-colors ' + (on ? 'text-accent-ink' : done ? 'text-accent' : 'text-ink-3 hover:bg-surface-2')}>
                {on && <motion.span layoutId="stage-pill" className="absolute inset-0 rounded-xl bg-accent" transition={{ type: 'spring', stiffness: 400, damping: 32 }} />}
                <span className="relative flex items-center gap-1.5">{done && <Check className="size-3.5" />}{s.label}</span>
              </button>
              {i < FLOW.length - 1 && <span className={'h-0.5 w-4 shrink-0 rounded ' + (done ? 'bg-accent' : 'bg-line')} />}
            </li>
          );
        })}
      </ol>
      {cur === 'lost' ? (
        <span className="flex items-center gap-2 text-[13px] text-ink-2">Lost{lostReason ? `: ${lostReason}` : ''}<button className="btn btn-ghost btn-sm" onClick={() => go('new')}>Reopen</button></span>
      ) : cur !== 'won' && (
        <button className="btn btn-danger btn-sm" onClick={() => go('lost', 'Closed from lead page')}>Mark lost</button>
      )}
    </div>
  );
}
