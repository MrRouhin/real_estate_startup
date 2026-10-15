'use client';
import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { setModificationStatus } from '../actions';
import { useToast } from '@/components/ui/toast';

export function ModStatus({ id, status }: { id: string; status: string }) {
  const [pending, start] = useTransition();
  const toast = useToast();
  const router = useRouter();
  const next = status === 'approved' ? 'in_progress' : 'done';
  return (
    <button className="btn btn-primary w-fit" disabled={pending} onClick={() => start(async () => {
      const r = await setModificationStatus(id, next); toast(r.ok ? r.message! : r.error!, r.ok ? 'success' : 'error'); router.refresh();
    })}>{status === 'approved' ? 'Start work' : 'Mark done'}</button>
  );
}
