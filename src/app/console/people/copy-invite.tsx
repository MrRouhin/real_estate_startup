'use client';
import { useState } from 'react';
import { Check, Copy, Link2 } from 'lucide-react';

export function CopyInvite({ code }: { code: string }) {
  const [copied, setCopied] = useState<'code' | 'link' | null>(null);
  const copy = async (what: 'code' | 'link') => {
    const text = what === 'code' ? code : `${window.location.origin}/join?code=${encodeURIComponent(code)}`;
    try { await navigator.clipboard.writeText(text); setCopied(what); setTimeout(() => setCopied(null), 1800); } catch { /* clipboard blocked */ }
  };
  return (
    <div className="mt-3 grid gap-2">
      <div className="num rounded-2xl border border-dashed border-[color-mix(in_srgb,var(--accent)_40%,transparent)] bg-accent-soft py-3 text-center text-[24px] font-semibold tracking-[0.3em] text-accent">{code || '—'}</div>
      <div className="grid grid-cols-2 gap-2">
        <button className="btn btn-outline btn-sm" onClick={() => copy('code')}>{copied === 'code' ? <Check className="size-4" /> : <Copy className="size-4" />}Copy code</button>
        <button className="btn btn-outline btn-sm" onClick={() => copy('link')}>{copied === 'link' ? <Check className="size-4" /> : <Link2 className="size-4" />}Copy link</button>
      </div>
    </div>
  );
}
