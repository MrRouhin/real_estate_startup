'use client';
import { useEffect, useRef, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, RefreshCw, Sparkles } from 'lucide-react';
import { useToast } from '@/components/ui/toast';
import { runAnalysis } from '@/app/console/ai-actions';

/** Runs the analysis. With `auto`, runs once on mount (used when there are no insights yet or they are stale). */
export function RunAnalysisButton({ auto = false, label = 'Run analysis', className = 'btn btn-primary btn-sm' }: { auto?: boolean; label?: string; className?: string }) {
  const toast = useToast();
  const router = useRouter();
  const [pending, start] = useTransition();
  const fired = useRef(false);
  const run = (quiet = false) => start(async () => {
    const r = await runAnalysis();
    if (!quiet || !r.ok) toast(r.ok ? r.message || 'Done' : r.error || 'Could not run the analysis', r.ok ? 'success' : 'error');
    router.refresh();
  });
  useEffect(() => { if (auto && !fired.current) { fired.current = true; run(true); } }, [auto]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <button className={className} disabled={pending} onClick={() => run()}>
      {pending ? <Loader2 className="size-4 animate-spin" /> : label === 'Run analysis' ? <Sparkles className="size-4" /> : <RefreshCw className="size-4" />}
      {pending ? 'Analysing…' : label}
    </button>
  );
}
