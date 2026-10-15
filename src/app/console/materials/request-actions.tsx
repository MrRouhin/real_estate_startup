'use client';
import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Check, Loader2, PackageCheck, X } from 'lucide-react';
import { decideRequest, issueRequest } from '../actions';
import { useToast } from '@/components/ui/toast';

export function RequestActions({ id, status, short }: { id: string; status: string; short?: boolean }) {
  const [pending, start] = useTransition();
  const toast = useToast();
  const router = useRouter();
  const run = (f: () => Promise<{ ok: boolean; message?: string; error?: string }>) => start(async () => {
    const r = await f(); toast(r.ok ? r.message! : r.error!, r.ok ? 'success' : 'error'); router.refresh();
  });
  if (pending) return <Loader2 className="ml-auto size-4 animate-spin text-ink-3" />;
  return (
    <div className="flex justify-end gap-1">
      {status === 'requested' && <button className="btn btn-ghost btn-sm" onClick={() => run(() => decideRequest(id, true))}><Check className="size-3.5" />Approve</button>}
      <button className="btn btn-primary btn-sm" onClick={() => run(() => issueRequest(id))} title={short ? 'Not enough in the store yet' : 'Issue from the store'} disabled={short}><PackageCheck className="size-3.5" />Issue</button>
      {status === 'requested' && <button className="btn btn-ghost btn-sm !px-2" aria-label="Reject" onClick={() => run(() => decideRequest(id, false))}><X className="size-3.5" /></button>}
    </div>
  );
}
