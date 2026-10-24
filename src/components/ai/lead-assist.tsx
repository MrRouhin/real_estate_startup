'use client';
import { useState, useTransition } from 'react';
import { Copy, Loader2, MessageCircle, NotebookPen, Sparkles } from 'lucide-react';
import { useToast } from '@/components/ui/toast';
import { draftLeadMessage, summarizeLeadNote } from '@/app/console/ai-actions';
import { LANGS, type Lang } from '@/lib/ai/i18n';
import { AISource } from './bits';

/** WhatsApp follow-up drafted for this lead, and call notes turned into a summary + follow-up date. */
export function LeadAssist({ leadId }: { leadId: string }) {
  const toast = useToast();
  const [pending, start] = useTransition();
  const [draft, setDraft] = useState<{ text: string; source: string; phone?: string } | null>(null);
  const [lang, setLang] = useState<Lang>('en');
  const [notes, setNotes] = useState('');
  const wa = draft?.phone ? `https://wa.me/${draft.phone}?text=${encodeURIComponent(draft.text)}` : null;
  return (
    <div className="grid gap-4">
      <div className="grid gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <button className="btn btn-primary btn-sm" disabled={pending} onClick={() => start(async () => {
            const r = await draftLeadMessage(leadId, lang);
            if (r.ok && r.text) setDraft({ text: r.text, source: r.source || 'rules', phone: r.phone }); else toast(r.error || 'Could not draft', 'error');
          })}>{pending ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}Draft a WhatsApp follow-up</button>
          <select className="input !w-auto !py-1.5 text-[13px]" value={lang} onChange={(e) => setLang(e.target.value as Lang)} aria-label="Language">
            {LANGS.map((l) => <option key={l.id} value={l.id}>{l.label}</option>)}
          </select>
        </div>
        {draft && (
          <div className="grid gap-2 rounded-2xl border border-line p-3">
            <div className="flex items-center justify-between"><span className="text-[12px] font-semibold text-ink-3">Draft — edit before sending</span><AISource source={draft.source} /></div>
            <textarea className="input min-h-[120px] text-[13.5px]" value={draft.text} onChange={(e) => setDraft({ ...draft, text: e.target.value })} aria-label="Draft message" />
            <div className="flex flex-wrap gap-2">
              {wa && <a href={wa} target="_blank" rel="noopener" className="btn btn-sm"><MessageCircle className="size-4" />Open in WhatsApp</a>}
              <button className="btn btn-ghost btn-sm" onClick={() => navigator.clipboard?.writeText(draft.text).then(() => toast('Copied', 'success'))}><Copy className="size-4" />Copy</button>
            </div>
          </div>
        )}
      </div>
      <div className="grid gap-2">
        <label className="label !mb-0" htmlFor={`notes-${leadId}`}>Call notes → summary</label>
        <textarea id={`notes-${leadId}`} className="input min-h-[90px] text-[13.5px]" value={notes} onChange={(e) => setNotes(e.target.value)}
          placeholder="Paste rough notes: wants east facing near park, budget 40-45L, wife worried about water, call back after Diwali in 10 days" />
        <button className="btn btn-sm w-fit" disabled={pending || notes.trim().length < 15} onClick={() => start(async () => {
          const r = await summarizeLeadNote(leadId, notes);
          toast(r.ok ? r.message || 'Logged' : r.error || 'Could not summarise', r.ok ? 'success' : 'error');
          if (r.ok) setNotes('');
        })}>{pending ? <Loader2 className="size-4 animate-spin" /> : <NotebookPen className="size-4" />}Summarise and log</button>
      </div>
    </div>
  );
}
