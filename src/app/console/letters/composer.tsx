'use client';
import { useMemo, useState, useTransition } from 'react';
import { Loader2, Send, Sparkles } from 'lucide-react';
import { ActionForm, SubmitButton } from '@/components/ui/action-form';
import { useToast } from '@/components/ui/toast';
import { draftLetterAction, saveLetter } from '../ops-actions';
import type { LetterKind } from '@/lib/ai/letters';

type Opt = { id: string; label: string; owner?: string | null };
const KINDS: { kind: LetterKind; label: string; to: 'contractor' | 'vendor' | 'employee'; emoji: string; ref?: 'wp' | 'po'; hint: string }[] = [
  { kind: 'work_order', label: 'Work order', to: 'contractor', emoji: '📝', ref: 'wp', hint: 'Awards a work package with value, dates and terms.' },
  { kind: 'delay_notice', label: 'Delay notice', to: 'contractor', emoji: '⏱️', ref: 'wp', hint: 'Compares planned and actual progress and asks for a recovery plan.' },
  { kind: 'crew_compliance', label: 'Crew compliance', to: 'contractor', emoji: '🦺', hint: 'Lists unverified workers, missing safety training and insurance gaps.' },
  { kind: 'purchase_order', label: 'Purchase order', to: 'vendor', emoji: '📦', ref: 'po', hint: 'Puts a purchase order on letterhead for the supplier’s records.' },
  { kind: 'appointment', label: 'Appointment', to: 'employee', emoji: '🤝', hint: 'Appoints a worker with role, wage, hours and safety rules.' },
  { kind: 'general', label: 'Other letter', to: 'contractor', emoji: '✉️', hint: 'Write your own; the note becomes the letter.' },
];

export function Composer({ contractors, vendors, employees, workPackages, orders }: { contractors: Opt[]; vendors: Opt[]; employees: Opt[]; workPackages: Opt[]; orders: Opt[] }) {
  const [kind, setKind] = useState<LetterKind>('work_order');
  const K = KINDS.find((k) => k.kind === kind)!;
  const [to, setTo] = useState<'contractor' | 'vendor' | 'employee'>(K.to);
  const recipients = to === 'contractor' ? contractors : to === 'vendor' ? vendors : employees;
  const [rid, setRid] = useState(recipients[0]?.id ?? '');
  const refs = useMemo(() => (K.ref === 'wp' ? workPackages : K.ref === 'po' ? orders : []).filter((r) => !r.owner || r.owner === rid), [K.ref, workPackages, orders, rid]);
  const [ref, setRef] = useState('');
  const [note, setNote] = useState('');
  const [draft, setDraft] = useState<{ subject: string; body: string; source: 'ai' | 'rules' } | null>(null);
  const [pending, start] = useTransition();
  const toast = useToast();
  const pick = (k: LetterKind) => {
    const n = KINDS.find((x) => x.kind === k)!;
    setKind(k); setDraft(null); setRef('');
    if (n.kind !== 'general') { setTo(n.to); const list = n.to === 'contractor' ? contractors : n.to === 'vendor' ? vendors : employees; setRid(list[0]?.id ?? ''); }
  };
  const make = () => start(async () => {
    const r = await draftLetterAction({ kind, recipientType: to, recipientId: rid, refId: ref || refs[0]?.id || null, note: note || null });
    if (!r.ok) { toast(r.error, 'error'); return; }
    setDraft({ subject: r.subject, body: r.body, source: r.source });
  });
  return (
    <div className="card grid content-start gap-4 p-5">
      <h2 className="text-[16px] font-bold">New letter</h2>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {KINDS.map((k) => (
          <button key={k.kind} type="button" onClick={() => pick(k.kind)} aria-pressed={kind === k.kind}
            className={'rounded-2xl border p-3 text-left text-[13px] transition ' + (kind === k.kind ? 'border-accent bg-accent-soft' : 'border-[var(--glass-line)] bg-[var(--glass)] hover:border-[color-mix(in_srgb,var(--accent)_35%,transparent)]')}>
            <span className="text-[18px]" aria-hidden>{k.emoji}</span><div className="font-semibold">{k.label}</div>
          </button>
        ))}
      </div>
      <p className="text-[12.5px] text-ink-2">{K.hint}</p>
      <div className="grid gap-3 sm:grid-cols-2">
        {kind === 'general' && (
          <div><label className="label" htmlFor="lto">To</label><select id="lto" className="input" value={to} onChange={(e) => { const t = e.target.value as typeof to; setTo(t); const list = t === 'contractor' ? contractors : t === 'vendor' ? vendors : employees; setRid(list[0]?.id ?? ''); }}>
            <option value="contractor">A contractor</option><option value="vendor">A supplier</option><option value="employee">A worker</option></select></div>
        )}
        <div><label className="label" htmlFor="lr">Recipient</label><select id="lr" className="input" value={rid} onChange={(e) => { setRid(e.target.value); setRef(''); }}>{recipients.map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}</select></div>
        {K.ref && <div><label className="label" htmlFor="lref">{K.ref === 'wp' ? 'Work package' : 'Purchase order'}</label><select id="lref" className="input" value={ref} onChange={(e) => setRef(e.target.value)}>{refs.length ? refs.map((r) => <option key={r.id} value={r.id}>{r.label}</option>) : <option value="">None for this recipient</option>}</select></div>}
        <div className="sm:col-span-2"><label className="label" htmlFor="ln">{kind === 'general' ? 'What the letter should say' : 'Anything to add (optional)'}</label><textarea id="ln" className="input min-h-[64px]" value={note} onChange={(e) => setNote(e.target.value)} placeholder={kind === 'general' ? 'Site will be closed on 2 November for the Rajyotsava holiday…' : 'e.g. Night shifts allowed till 10 pm'} /></div>
      </div>
      <button type="button" className="btn btn-outline" onClick={make} disabled={pending || !rid}>{pending ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}Draft from records</button>
      {draft && (
        <ActionForm action={saveLetter} onDone={() => { setDraft(null); setNote(''); }} className="grid gap-3 border-t border-[var(--glass-line)] pt-4">
          <input type="hidden" name="kind" value={kind} /><input type="hidden" name="recipient_type" value={to} /><input type="hidden" name="recipient_id" value={rid} />
          <input type="hidden" name="source" value={draft.source} /><input type="hidden" name="ref_id" value={ref || refs[0]?.id || ''} />
          <div className="flex items-center justify-between text-[12px] text-ink-3"><span>Review and edit before issuing.</span><span className="tag">{draft.source === 'ai' ? 'AI wording, facts from records' : 'Template from records'}</span></div>
          <div><label className="label" htmlFor="ls">Subject</label><input id="ls" name="subject" className="input" defaultValue={draft.subject} /></div>
          <div><label className="label" htmlFor="lb">Letter</label><textarea id="lb" name="body" className="input min-h-[300px] font-[inherit] leading-relaxed" defaultValue={draft.body} /></div>
          <div className="flex flex-wrap gap-2">
            <SubmitButton className="btn btn-primary" name="intent" value="issue"><Send className="size-4" />Issue now</SubmitButton>
            <SubmitButton className="btn btn-outline" name="intent" value="draft">Save draft</SubmitButton>
          </div>
        </ActionForm>
      )}
    </div>
  );
}
