'use client';
import { useState } from 'react';
import Link from 'next/link';
import { MessageCircleQuestion } from 'lucide-react';
import { Sheet } from '@/components/ui/sheet';
import { AssistantChat } from './assistant-chat';

/** Floating "Ask your site" assistant for developer staff. */
export function AskSite() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button onClick={() => setOpen(true)} className="btn btn-primary fixed bottom-5 right-5 z-40 !rounded-full shadow-lg" style={{ boxShadow: 'var(--shadow-lg)' }} aria-label="Ask your site">
        <MessageCircleQuestion className="size-5" /><span className="hidden sm:inline">Ask your site</span>
      </button>
      <Sheet open={open} onClose={() => setOpen(false)} title="Ask your site" wide>
        <AssistantChat endpoint="/api/ai/ask"
          greeting="Ask me about schedule, contractors, stock, crew, deliveries, leads or collections. I answer from today's numbers."
          suggestions={['Which work is behind plan?', 'What should I order this week?', 'Any suspicious check-ins?', 'Which leads should we call first?', 'Any problem deliveries?']}
          placeholder="e.g. Will the roads finish before March?"
          renderExtras={(d) => Array.isArray(d.links) && d.links.length ? (
            <div className="flex flex-wrap gap-2">{(d.links as { href: string; label: string }[]).map((l) => <Link key={l.href} href={l.href} onClick={() => setOpen(false)} className="chip">{l.label} →</Link>)}</div>
          ) : null} />
      </Sheet>
    </>
  );
}
