'use client';
import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { useToast } from '@/components/ui/toast';
import { setPublished } from '../ops-actions';

export function PublishToggle({ id, published }: { id: string; published: boolean }) {
  const [pending, start] = useTransition();
  const toast = useToast();
  const router = useRouter();
  return (
    <button className={'btn btn-sm ' + (published ? 'btn-outline' : 'btn-primary')} disabled={pending}
      onClick={() => start(async () => { const r = await setPublished(id, !published); toast(r.ok ? r.message! : r.error!, r.ok ? 'success' : 'error'); router.refresh(); })}>
      {pending ? <Loader2 className="size-4 animate-spin" /> : published ? <EyeOff className="size-4" /> : <Eye className="size-4" />}{published ? 'Unpublish' : 'Publish'}
    </button>
  );
}
