'use client';
import { useState, useTransition } from 'react';
import { BadgeCheck, Loader2 } from 'lucide-react';
import { ActionForm, SubmitButton } from '@/components/ui/action-form';
import { lookupInvite, requestToJoin } from './actions';

const TRADES = [['civil', 'Civil / structure'], ['electrical', 'Electrical'], ['plumbing', 'Plumbing'], ['roads', 'Roads'], ['landscaping', 'Landscaping'], ['other', 'Other']];

export function JoinForm({ code: initialCode, role: initialRole, me }: { code?: string; role?: string; me: { name: string | null; phone: string | null; email: string | null } }) {
  const [code, setCode] = useState(initialCode ?? '');
  const [org, setOrg] = useState<string | null>(null);
  const [role, setRole] = useState(initialRole === 'vendor' || initialRole === 'employee' ? initialRole : 'contractor');
  const [checking, start] = useTransition();
  const check = (c: string) => { if (c.trim().length >= 4) start(async () => { const o = await lookupInvite(c); setOrg(o?.name ?? ''); }); };
  return (
    <ActionForm action={requestToJoin} className="card grid gap-4 p-6">
      <div>
        <label className="label" htmlFor="code">Invite code</label>
        <div className="flex gap-2">
          <input id="code" name="code" className="input num uppercase tracking-[0.2em]" value={code} onChange={(e) => { setCode(e.target.value); setOrg(null); }} onBlur={(e) => check(e.target.value)} placeholder="GVDEMO26" required />
          <button type="button" className="btn btn-outline" onClick={() => check(code)} disabled={checking}>{checking ? <Loader2 className="size-4 animate-spin" /> : 'Check'}</button>
        </div>
        {org && <p className="mt-1.5 flex items-center gap-1 text-[13px] font-semibold text-good"><BadgeCheck className="size-4" />{org}</p>}
        {org === '' && <p className="mt-1.5 text-[13px] text-bad">No developer has this code. Check it with them.</p>}
      </div>
      <fieldset>
        <legend className="label">I work as a</legend>
        <div className="grid grid-cols-3 gap-2">
          {([['contractor', '👷', 'Contractor'], ['vendor', '🚚', 'Supplier'], ['employee', '🦺', 'Site worker']] as const).map(([k, e, l]) => (
            <label key={k} className={'card cursor-pointer p-3 text-center text-[13px] font-semibold transition ' + (role === k ? '!border-accent ring-2 ring-[var(--accent-soft)]' : '')}>
              <input type="radio" name="role" value={k} checked={role === k} onChange={() => setRole(k)} className="sr-only" />
              <span className="block text-[22px]" aria-hidden>{e}</span>{l}
            </label>
          ))}
        </div>
      </fieldset>
      <div className="grid gap-3 sm:grid-cols-2">
        <div><label className="label" htmlFor="fn">Your name</label><input id="fn" name="full_name" className="input" defaultValue={me.name ?? ''} required /></div>
        <div><label className="label" htmlFor="ph">Mobile</label><input id="ph" name="phone" className="input num" defaultValue={me.phone ?? ''} inputMode="tel" /></div>
        {role !== 'employee' && <>
          <div><label className="label" htmlFor="cn">Company name</label><input id="cn" name="company_name" className="input" required /></div>
          <div><label className="label" htmlFor="gst">GSTIN (optional)</label><input id="gst" name="gst_number" className="input num uppercase" placeholder="29ABCDE1234F1Z5" /></div>
        </>}
        {role === 'contractor' && <div><label className="label" htmlFor="tr">Trade</label><select id="tr" name="trade" className="input">{TRADES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></div>}
        {role === 'employee' && <div><label className="label" htmlFor="tr2">Your trade</label><input id="tr2" name="trade" className="input" placeholder="Mason, electrician, helper…" /></div>}
        {role === 'vendor' && <div className="sm:col-span-2"><label className="label" htmlFor="cat">What you supply</label><input id="cat" name="categories" className="input" placeholder="cement, steel, sand" /></div>}
        <div className="sm:col-span-2"><label className="label" htmlFor="msg">Message to the developer (optional)</label><input id="msg" name="message" className="input" placeholder="Working on Tower B MEP since August" /></div>
      </div>
      <SubmitButton className="btn btn-primary btn-lg" pendingText="Sending…">Ask to join</SubmitButton>
    </ActionForm>
  );
}
