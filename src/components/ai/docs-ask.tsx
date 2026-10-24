'use client';
import { useState } from 'react';
import { FileSearch } from 'lucide-react';
import { Sheet } from '@/components/ui/sheet';
import { AssistantChat } from './assistant-chat';

type Passage = { n: number; title: string; heading: string | null; excerpt: string; mine: boolean };

function Sources({ d }: { d: Record<string, unknown> }) {
  const ps = (d.passages as Passage[] | undefined) || [];
  if (!ps.length) return null;
  return (
    <details className="text-[12px]"><summary className="cursor-pointer text-ink-3">Sources ({ps.length})</summary>
      <ul className="mt-1.5 grid gap-1.5">{ps.map((p) => (
        <li key={p.n} className="rounded-xl border border-line bg-surface p-2">
          <div className="font-semibold">[{p.n}] {p.title}{p.heading ? ` — ${p.heading}` : ''} {p.mine && <span className="tag tag-accent ml-1">your agreement</span>}</div>
          <div className="mt-0.5 text-ink-2">{p.excerpt}{p.excerpt.length >= 320 ? '…' : ''}</div>
        </li>
      ))}</ul>
    </details>
  );
}

/** Ask the project's documents (and, for a buyer, their own agreement). Answers quote the source. */
export function DocsChat({ projectId, mine = false, height }: { projectId: string; mine?: boolean; height?: string }) {
  return (
    <AssistantChat endpoint="/api/ai/docs" extra={{ projectId }} languages height={height}
      greeting={mine ? 'Ask anything about your agreement, payments, possession, refunds or approvals. I answer only from the documents and quote them.' : 'Ask about booking, payment plans, cancellation, approvals, possession or amenities. I answer only from the project documents.'}
      suggestions={mine ? ['What if I cancel?', 'When is the handover?', 'What is my payment schedule?', 'What happens if there is a delay?'] : ['What is the cancellation policy?', 'Is the layout approved?', 'When is possession?', 'Can I get a home loan?']}
      placeholder="e.g. What happens if the developer is late?" renderExtras={(d) => <Sources d={d} />} />
  );
}

export function DocsAskButton({ projectId }: { projectId: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button className="btn btn-outline btn-sm" onClick={() => setOpen(true)}><FileSearch className="size-4" />Ask the documents</button>
      <Sheet open={open} onClose={() => setOpen(false)} title="Ask the documents" wide><DocsChat projectId={projectId} /></Sheet>
    </>
  );
}
