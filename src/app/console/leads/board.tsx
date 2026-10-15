'use client';
import Link from 'next/link';
import { useEffect, useMemo, useState, useTransition } from 'react';
import { DndContext, PointerSensor, KeyboardSensor, useDraggable, useDroppable, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import { AnimatePresence, motion } from 'framer-motion';
import { CalendarClock, Flame, Phone, Search } from 'lucide-react';
import { moveLead } from '../actions';
import { useToast } from '@/components/ui/toast';
import { Sheet } from '@/components/ui/sheet';
import { Avatar } from '@/components/ui/bits';
import { ago, dateTime, lakh, phone } from '@/lib/format';
import type { LeadStage } from '@/lib/types';

export type BoardLead = {
  id: string; full_name: string; phone: string; source: string; stage: LeadStage; budget_min: number | null; budget_max: number | null;
  preferred_size: number | null; next_follow_up_at: string | null; assigned_to: string | null; updated_at: string; created_at: string;
  plot: string | null; owner: string | null; visit: string | null; lost_reason: string | null;
};
const STAGES: { key: LeadStage; label: string; color: string }[] = [
  { key: 'new', label: 'New', color: 'var(--accent)' },
  { key: 'contacted', label: 'Contacted', color: 'var(--st-booked)' },
  { key: 'site_visit', label: 'Site visit', color: 'var(--st-held)' },
  { key: 'negotiation', label: 'Negotiation', color: '#c2410c' },
  { key: 'won', label: 'Booked', color: 'var(--good)' },
  { key: 'lost', label: 'Lost', color: 'var(--ink-3)' },
];

/** Hot = recent activity + a visit or negotiation; cold = untouched for a week. */
function temperature(l: BoardLead, now: number) {
  const days = (now - new Date(l.updated_at).getTime()) / 86400000;
  if (['won', 'lost'].includes(l.stage)) return null;
  if ((l.stage === 'negotiation' || l.visit) && days < 5) return 'hot';
  if (days > 7) return 'cold';
  return 'warm';
}

export function LeadBoard({ leads, people, now: serverNow }: { leads: BoardLead[]; people: { id: string; name: string }[]; now: number }) {
  const [items, setItems] = useState(leads);
  const [now, setNow] = useState(serverNow);
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 60000); return () => clearInterval(t); }, []);
  const [q, setQ] = useState('');
  const [owner, setOwner] = useState('');
  const [lost, setLost] = useState<{ id: string; prev: LeadStage } | null>(null);
  const [reason, setReason] = useState('Budget too low');
  const [, start] = useTransition();
  const toast = useToast();
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }), useSensor(KeyboardSensor));
  useEffect(() => { setItems(leads); }, [leads]);
  const shown = useMemo(() => items.filter((l) => (!q || (l.full_name + l.phone).toLowerCase().includes(q.toLowerCase())) && (!owner || l.assigned_to === owner)), [items, q, owner]);

  function move(id: string, stage: LeadStage, why?: string) {
    const prev = items.find((l) => l.id === id)?.stage;
    if (!prev || prev === stage) return;
    const at = Date.now(); setNow(at);
    setItems((xs) => xs.map((l) => (l.id === id ? { ...l, stage, updated_at: new Date(at).toISOString() } : l)));
    start(async () => {
      const r = await moveLead(id, stage, why);
      if (!r.ok) { setItems((xs) => xs.map((l) => (l.id === id ? { ...l, stage: prev } : l))); toast(r.error!, 'error'); }
      else toast(`Moved to ${STAGES.find((s) => s.key === stage)!.label}`);
    });
  }
  function onEnd(e: DragEndEvent) {
    const id = String(e.active.id), to = e.over?.id as LeadStage | undefined;
    if (!to) return;
    if (to === 'lost') { const prev = items.find((l) => l.id === id)!.stage; if (prev !== 'lost') setLost({ id, prev }); return; }
    move(id, to);
  }

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <label className="relative"><Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-3" />
          <input className="input !w-64 !pl-9" placeholder="Search name or phone" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search leads" /></label>
        <select className="input !w-auto" value={owner} onChange={(e) => setOwner(e.target.value)} aria-label="Filter by owner">
          <option value="">Everyone’s leads</option>{people.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </div>
      <DndContext sensors={sensors} onDragEnd={onEnd}>
        <div className="scroll-x -mx-1 pb-3">
          <div className="grid min-w-[1180px] grid-cols-6 gap-3 px-1">
            {STAGES.map((s) => {
              const col = shown.filter((l) => l.stage === s.key);
              const sum = col.reduce((a, l) => a + Number(l.budget_max || l.budget_min || 0), 0);
              return (
                <Column key={s.key} id={s.key} label={s.label} color={s.color} count={col.length} sum={sum}>
                  <AnimatePresence initial={false}>
                    {col.map((l) => <Card key={l.id} lead={l} now={now} />)}
                  </AnimatePresence>
                </Column>
              );
            })}
          </div>
        </div>
      </DndContext>
      <Sheet open={!!lost} onClose={() => setLost(null)} title="Why was this lead lost?">
        <div className="grid gap-3">
          {['Budget too low', 'Bought in another project', 'Location not suitable', 'Not reachable', 'Loan not approved'].map((r) => (
            <label key={r} className="flex items-center gap-2 text-[14px]"><input type="radio" name="reason" checked={reason === r} onChange={() => setReason(r)} className="accent-[var(--accent)]" />{r}</label>
          ))}
          <button className="btn btn-primary mt-2" onClick={() => { if (lost) move(lost.id, 'lost', reason); setLost(null); }}>Mark as lost</button>
        </div>
      </Sheet>
    </div>
  );
}

function Column({ id, label, color, count, sum, children }: { id: string; label: string; color: string; count: number; sum: number; children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <section ref={setNodeRef} className={'flex min-h-[420px] flex-col rounded-2xl border p-2 transition-colors ' + (isOver ? 'border-accent bg-accent-soft/50' : 'border-line bg-surface-2/50')} aria-label={`${label} column`}>
      <header className="flex items-center justify-between gap-2 px-2 pb-2 pt-1">
        <span className="flex items-center gap-2 text-[13px] font-semibold"><i className="size-2.5 rounded-full" style={{ background: color }} />{label}<span className="num text-ink-3">{count}</span></span>
        {sum > 0 && <span className="num text-[11.5px] text-ink-3">{lakh(sum)}</span>}
      </header>
      <div className="grid content-start gap-2">{children}</div>
    </section>
  );
}

function Card({ lead: l, now }: { lead: BoardLead; now: number }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: l.id });
  const t = temperature(l, now);
  const overdue = l.next_follow_up_at && new Date(l.next_follow_up_at).getTime() < now && !['won', 'lost'].includes(l.stage);
  return (
    <motion.div layout initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.96 }}
      ref={setNodeRef} {...attributes} {...listeners}
      style={{ transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0) rotate(${isDragging ? 2 : 0}deg)` : undefined, zIndex: isDragging ? 50 : undefined }}
      className={'cursor-grab touch-none rounded-xl border bg-surface p-3 text-[13px] active:cursor-grabbing ' + (isDragging ? 'border-accent shadow-2xl' : 'border-line shadow-sm hover:border-accent/40')}>
      <div className="flex items-start justify-between gap-2">
        <Link href={`/console/leads/${l.id}`} className="font-semibold leading-tight hover:text-accent" onPointerDown={(e) => e.stopPropagation()}>{l.full_name}</Link>
        {t === 'hot' && <span className="inline-flex items-center gap-0.5 rounded-full bg-[color-mix(in_srgb,var(--bad)_14%,transparent)] px-1.5 text-[10.5px] font-bold text-bad"><Flame className="size-3" />Hot</span>}
        {t === 'cold' && <span className="rounded-full bg-surface-2 px-1.5 text-[10.5px] font-semibold text-ink-3">Cold</span>}
      </div>
      <div className="mt-1 flex items-center gap-1 text-[12px] text-ink-3"><Phone className="size-3" />{phone(l.phone)}</div>
      <div className="mt-2 flex flex-wrap gap-1">
        {(l.budget_min || l.budget_max) && <span className="tag num">{l.budget_min ? lakh(l.budget_min) : ''}{l.budget_min && l.budget_max ? '–' : ''}{l.budget_max ? lakh(l.budget_max) : ''}</span>}
        {l.plot && <span className="tag tag-accent">{l.plot}</span>}
        <span className="tag capitalize">{l.source.replace('_', ' ')}</span>
      </div>
      {l.lost_reason && l.stage === 'lost' && <div className="mt-1.5 text-[11.5px] text-ink-3">{l.lost_reason}</div>}
      <div className="mt-2.5 flex items-center justify-between gap-2 border-t border-line pt-2 text-[11.5px]">
        {l.visit ? <span className="flex items-center gap-1 font-medium text-warn"><CalendarClock className="size-3.5" />{dateTime(l.visit)}</span>
          : overdue ? <span className="font-semibold text-bad">Follow-up overdue</span>
          : <span className="text-ink-3">{ago(l.updated_at, now)}</span>}
        {l.owner && <span title={l.owner}><Avatar name={l.owner} size={20} /></span>}
      </div>
    </motion.div>
  );
}
