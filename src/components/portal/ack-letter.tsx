'use client';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Check, Loader2 } from 'lucide-react';
import { useToast } from '@/components/ui/toast';
import { acknowledgeLetter } from './actions';

export function AckLetter({ id }: { id: string }) {
  const [note, setNote] = useState('');
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const toast = useToast();
  const router = useRouter();
  if (!open) return <button className="btn btn-primary btn-sm" onClick={() => setOpen(true)}><Check className="size-4" />Acknowledge</button>;
  return (
    <div className="flex w-full flex-wrap items-center gap-2">
      <input className="input min-w-[180px] flex-1 !py-1.5 text-[13px]" placeholder="Reply (optional), e.g. Received, will comply" value={note} onChange={(e) => setNote(e.target.value)} maxLength={300} />
      <button className="btn btn-primary btn-sm" disabled={pending} onClick={() => start(async () => {
        const r = await acknowledgeLetter(id, note);
        if (r.ok) { toast(r.message || 'Acknowledged'); router.refresh(); } else toast(r.error || 'Could not acknowledge', 'error');
      })}>{pending ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}Confirm</button>
    </div>
  );
}
