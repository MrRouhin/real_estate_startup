'use client';
import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { setBookingStatus } from '../../actions';
import { useToast } from '@/components/ui/toast';

export function BookingActions({ id, status }: { id: string; status: string }) {
  const [pending, start] = useTransition();
  const toast = useToast();
  const router = useRouter();
  const run = (s: 'registered' | 'handed_over' | 'cancelled') => start(async () => {
    const r = await setBookingStatus(id, s);
    toast(r.ok ? r.message! : r.error!, r.ok ? 'success' : 'error'); router.refresh();
  });
  return (
    <div className="flex flex-wrap gap-2">
      {pending && <Loader2 className="size-5 animate-spin self-center text-ink-3" />}
      {status === 'confirmed' && <button className="btn btn-primary" disabled={pending} onClick={() => run('registered')}>Mark sale deed registered</button>}
      {status === 'registered' && <button className="btn btn-primary" disabled={pending} onClick={() => run('handed_over')}>Mark handed over</button>}
      {status === 'refund_due' && <button className="btn btn-danger" disabled={pending} onClick={() => run('cancelled')}>Mark refund processed</button>}
    </div>
  );
}
