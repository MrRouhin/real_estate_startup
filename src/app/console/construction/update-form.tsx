'use client';
import { useState } from 'react';
import { ImagePlus } from 'lucide-react';
import { ActionForm, SubmitButton } from '@/components/ui/action-form';
import { MILESTONES } from '@/lib/site';
import { postUpdate } from '../actions';

export function UpdateForm({ milestones }: { milestones: { id: string; key: string; name: string; progress: number }[] }) {
  const [mid, setMid] = useState(milestones.find((m) => m.progress < 100)?.id || milestones[0]?.id || '');
  const m = milestones.find((x) => x.id === mid);
  const [pct, setPct] = useState(Math.min(100, Math.round((m?.progress ?? 0) + 10)));
  const color = MILESTONES.find((x) => x.key === m?.key)?.color || 'var(--accent)';
  return (
    <ActionForm action={postUpdate} className="grid gap-3" onDone={() => setPct((p) => Math.min(100, p + 5))}>
      <div><label className="label" htmlFor="ms">Milestone</label>
        <select id="ms" name="milestone_id" className="input" value={mid} onChange={(e) => { setMid(e.target.value); const n = milestones.find((x) => x.id === e.target.value); setPct(Math.min(100, Math.round((n?.progress ?? 0) + 10))); }}>
          {milestones.map((x) => <option key={x.id} value={x.id}>{x.name} (now {Math.round(x.progress)}%)</option>)}
        </select></div>
      <div>
        <label className="label" htmlFor="mp">New progress: <b className="num" style={{ color }}>{pct}%</b> <span className="font-normal text-ink-3">(was {Math.round(m?.progress ?? 0)}%)</span></label>
        <input id="mp" name="milestone_progress" type="range" min={0} max={100} value={pct} onChange={(e) => setPct(Number(e.target.value))} className="w-full" style={{ accentColor: color }} />
        <div className="relative h-2 overflow-hidden rounded-full bg-surface-2">
          <div className="absolute inset-y-0 left-0 rounded-full opacity-40" style={{ width: `${m?.progress ?? 0}%`, background: color }} />
          <div className="absolute inset-y-0 left-0 rounded-full transition-[width]" style={{ width: `${pct}%`, background: color }} />
        </div>
      </div>
      <div><label className="label" htmlFor="ut">Title</label><input id="ut" name="title" className="input" placeholder="Asphalting of the 40 ft main road started" required /></div>
      <div><label className="label" htmlFor="ub">Details for buyers</label><textarea id="ub" name="body" rows={3} className="input" placeholder="What changed on site this week" /></div>
      <label className="btn btn-outline w-fit cursor-pointer"><ImagePlus className="size-4" />Add a site photo<input type="file" name="photo" accept="image/*" className="sr-only" /></label>
      <SubmitButton pendingText="Posting…">Post update and notify buyers</SubmitButton>
      <p className="text-[12px] text-ink-3">The 3D view animates to the new state as soon as it’s posted.</p>
    </ActionForm>
  );
}
