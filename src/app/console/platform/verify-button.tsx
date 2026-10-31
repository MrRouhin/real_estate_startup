'use client';
import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { BadgeCheck, Loader2 } from 'lucide-react';
import { useToast } from '@/components/ui/toast';
import { verifyCompany } from '../ops-actions';

export function VerifyButton({ id, verified }: { id: string; verified: boolean }) {
  const [pending, start] = useTransition();
  const toast = useToast();
  const router = useRouter();
  return (
    <button className={'btn btn-sm ' + (verified ? 'btn-outline' : 'btn-primary')} disabled={pending}
      onClick={() => start(async () => { const r = await verifyCompany(id, !verified); toast(r.ok ? r.message! : r.error!, r.ok ? 'success' : 'error'); router.refresh(); })}>
      {pending ? <Loader2 className="size-4 animate-spin" /> : <BadgeCheck className="size-4" />}{verified ? 'Remove verification' : 'Verify company'}
    </button>
  );
}
