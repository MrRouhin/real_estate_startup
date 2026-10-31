'use client';
import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Send } from 'lucide-react';
import { useToast } from '@/components/ui/toast';
import { issueLetter } from '../ops-actions';

export function IssueButton({ id }: { id: string }) {
  const [pending, start] = useTransition();
  const toast = useToast();
  const router = useRouter();
  return <button className="btn btn-primary btn-sm" disabled={pending} onClick={() => start(async () => { const r = await issueLetter(id); toast(r.ok ? r.message! : r.error!, r.ok ? 'success' : 'error'); router.refresh(); })}>{pending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}Issue</button>;
}
