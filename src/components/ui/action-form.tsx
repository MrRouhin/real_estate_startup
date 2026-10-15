'use client';
import { useActionState, useRef } from 'react';
import { useFormStatus } from 'react-dom';
import { Loader2 } from 'lucide-react';
import { useToast } from './toast';
import type { ActionResult } from '@/lib/actions';

/**
 * Form bound to a server action. The toast is raised as soon as the action returns
 * (from the app-level toaster), so it still shows when the refreshed page removes this form.
 */
export function ActionForm({ action, children, className, onDone, reset = true }: {
  action: (prev: ActionResult | null, fd: FormData) => Promise<ActionResult>;
  children: React.ReactNode; className?: string; onDone?: (r: ActionResult) => void; reset?: boolean;
}) {
  const toast = useToast();
  const ref = useRef<HTMLFormElement>(null);
  const [, formAction] = useActionState(async (prev: ActionResult | null, fd: FormData) => {
    let r: ActionResult;
    try { r = await action(prev, fd); } catch { r = { ok: false, error: 'Something went wrong. Check your connection and try again.' }; }
    if (r.ok) { if (r.message) toast(r.message, 'success'); if (reset) ref.current?.reset(); onDone?.(r); }
    else toast(r.error || 'Something went wrong. Try again.', 'error');
    return r;
  }, null);
  return <form ref={ref} action={formAction} className={className}>{children}</form>;
}

export function SubmitButton({ children, className = 'btn btn-primary', pendingText, disabled, name, value }: { children: React.ReactNode; className?: string; pendingText?: string; disabled?: boolean; name?: string; value?: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className={className} disabled={pending || disabled} name={name} value={value}>
      {pending && <Loader2 className="size-4 animate-spin" />}
      {pending && pendingText ? pendingText : children}
    </button>
  );
}
