'use client';
import { createContext, useCallback, useContext, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle2, AlertTriangle, Info } from 'lucide-react';

type Kind = 'success' | 'error' | 'info';
type Toast = { id: number; text: string; kind: Kind };
const Ctx = createContext<(text: string, kind?: Kind) => void>(() => {});

export function useToast() {
  return useContext(Ctx);
}

export function Toaster({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const push = useCallback((text: string, kind: Kind = 'success') => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t.slice(-3), { id, text, kind }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4200);
  }, []);
  return (
    <Ctx.Provider value={push}>
      {children}
      <div aria-live="polite" className="pointer-events-none fixed inset-x-0 z-[100] flex flex-col items-center gap-2 px-4"
        style={{ bottom: 'calc(env(safe-area-inset-bottom, 0px) + 20px)' }}>
        <AnimatePresence>
          {toasts.map((t) => (
            <motion.div key={t.id} role="status"
              initial={{ opacity: 0, y: 16, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 8, scale: 0.98 }}
              transition={{ type: 'spring', stiffness: 420, damping: 32 }}
              className="pointer-events-auto flex max-w-md items-start gap-2.5 rounded-2xl bg-ink px-4 py-3 text-[13.5px] text-bg shadow-2xl">
              {t.kind === 'success' && <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-available" />}
              {t.kind === 'error' && <AlertTriangle className="mt-0.5 size-4 shrink-0 text-held" />}
              {t.kind === 'info' && <Info className="mt-0.5 size-4 shrink-0" />}
              <span>{t.text}</span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </Ctx.Provider>
  );
}
