'use client';
import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

/** Tabs whose panels are rendered on the server and swapped on the client. */
export function Tabs({ tabs, initial }: { tabs: { id: string; label: React.ReactNode; content: React.ReactNode }[]; initial?: string }) {
  const [cur, setCur] = useState(initial || tabs[0]?.id);
  return (
    <div className="grid gap-4">
      <div role="tablist" className="no-scrollbar flex gap-1 overflow-x-auto border-b border-line">
        {tabs.map((t) => (
          <button key={t.id} role="tab" aria-selected={cur === t.id} onClick={() => setCur(t.id)}
            className={'relative whitespace-nowrap px-3 pb-2.5 pt-1 text-[14px] font-semibold transition-colors ' + (cur === t.id ? 'text-ink' : 'text-ink-3 hover:text-ink-2')}>
            {t.label}
            {cur === t.id && <motion.span layoutId="tab-underline" className="absolute inset-x-1 -bottom-px h-0.5 rounded bg-accent" />}
          </button>
        ))}
      </div>
      <AnimatePresence mode="wait">
        <motion.div key={cur} role="tabpanel" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }}>
          {tabs.find((t) => t.id === cur)?.content}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
