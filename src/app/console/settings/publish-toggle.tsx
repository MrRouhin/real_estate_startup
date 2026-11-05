'use client';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { useToast } from '@/components/ui/toast';
import { setPublished } from '../ops-actions';

/** Publishing is one click; hiding a live project from buyers asks first. */
export function PublishToggle({ id, name, published }: { id: string; name: string; published: boolean }) {
  const [pending, start] = useTransition();
  const [confirming, setConfirming] = useState(false);
  const toast = useToast();
  const router = useRouter();

  const run = (publish: boolean) => start(async () => {
    const r = await setPublished(id, publish);
    toast(r.ok ? r.message! : r.error!, r.ok ? 'success' : 'error');
    setConfirming(false);
    router.refresh();
  });

  if (confirming) {
    return (
      <span className="flex flex-wrap items-center justify-end gap-2" role="group" aria-label={`Confirm hiding ${name}`}>
        <span className="text-[12.5px] text-ink-2">Hide {name} from all buyers?</span>
        <button className="btn btn-sm btn-danger" disabled={pending} onClick={() => run(false)} autoFocus>
          {pending ? <Loader2 className="size-4 animate-spin" /> : <EyeOff className="size-4" />}Yes, unpublish
        </button>
        <button className="btn btn-sm btn-ghost" disabled={pending} onClick={() => setConfirming(false)}>Cancel</button>
      </span>
    );
  }

  return (
    <button className={'btn btn-sm ' + (published ? 'btn-outline' : 'btn-primary')} disabled={pending}
      onClick={() => (published ? setConfirming(true) : run(true))}>
      {pending ? <Loader2 className="size-4 animate-spin" /> : published ? <EyeOff className="size-4" /> : <Eye className="size-4" />}{published ? 'Unpublish' : 'Publish'}
    </button>
  );
}
