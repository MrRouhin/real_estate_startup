'use client';
import { useState } from 'react';
import { CalendarCheck, Loader2, MessageSquare } from 'lucide-react';
import { getBrowserClient } from '@/lib/supabase/client';
import { friendly } from '@/lib/actions';
import { Sheet } from '@/components/ui/sheet';
import { useToast } from '@/components/ui/toast';

/** "Book a site visit / Ask a question" — lands in the developer's CRM as a lead. */
export function EnquiryButton({ projectId, plotId, plotNumber, label = 'Book a site visit', className = 'btn btn-outline', defaults }: {
  projectId: string; plotId?: string; plotNumber?: string; label?: string; className?: string; defaults?: { name?: string | null; phone?: string | null; email?: string | null };
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const toast = useToast();
  const tomorrow = new Date(Date.now() + 86400000); tomorrow.setHours(11, 0, 0, 0);
  const local = new Date(tomorrow.getTime() - tomorrow.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setBusy(true);
    const visit = fd.get('visit') === 'on' && fd.get('visit_at') ? new Date(String(fd.get('visit_at'))).toISOString() : null;
    const { error } = await getBrowserClient().rpc('submit_enquiry', {
      p_project: projectId, p_name: String(fd.get('name') || ''), p_phone: String(fd.get('phone') || ''),
      p_email: String(fd.get('email') || '') || undefined, p_message: String(fd.get('message') || '') || undefined,
      p_plot: plotId, p_visit_at: visit ?? undefined,
    });
    setBusy(false);
    if (error) { toast(friendly(error), 'error'); return; }
    setDone(true);
    toast(visit ? 'Site visit requested. The sales team will confirm on WhatsApp.' : 'Thanks! The sales team will call you shortly.');
  }
  return (
    <>
      <button className={className} onClick={() => { setDone(false); setOpen(true); }}><CalendarCheck className="size-4" />{label}</button>
      <Sheet open={open} onClose={() => setOpen(false)} title={plotNumber ? `Ask about plot ${plotNumber}` : 'Visit the site or ask a question'}>
        {done ? (
          <div className="grid justify-items-center gap-2 py-6 text-center">
            <div className="grid size-12 place-items-center rounded-full bg-accent-soft text-accent"><MessageSquare className="size-5" /></div>
            <div className="font-semibold">Request received</div>
            <p className="text-[13.5px] text-ink-2">The developer’s sales team now has your details and will get in touch.</p>
            <button className="btn btn-ghost mt-2" onClick={() => setOpen(false)}>Close</button>
          </div>
        ) : (
          <form onSubmit={submit} className="grid gap-3">
            <div><label className="label" htmlFor="eq-name">Your name</label><input id="eq-name" name="name" className="input" required minLength={2} defaultValue={defaults?.name || ''} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="label" htmlFor="eq-phone">Mobile</label><input id="eq-phone" name="phone" className="input num" inputMode="tel" required placeholder="98450 12345" defaultValue={defaults?.phone?.replace(/^91/, '') || ''} /></div>
              <div><label className="label" htmlFor="eq-email">Email (optional)</label><input id="eq-email" name="email" type="email" className="input" defaultValue={defaults?.email || ''} /></div>
            </div>
            <div><label className="label" htmlFor="eq-msg">Message</label><textarea id="eq-msg" name="message" rows={2} className="input" defaultValue={plotNumber ? `I'm interested in plot ${plotNumber}.` : ''} /></div>
            <label className="flex items-center gap-2 text-[13.5px]"><input type="checkbox" name="visit" defaultChecked className="size-4 accent-[var(--accent)]" /> Book a site visit</label>
            <div><label className="label" htmlFor="eq-at">Preferred time</label><input id="eq-at" name="visit_at" type="datetime-local" className="input" defaultValue={local} /></div>
            <button className="btn btn-primary mt-1" disabled={busy}>{busy && <Loader2 className="size-4 animate-spin" />}Send request</button>
            <p className="text-[12px] text-ink-3">Your details go only to this project’s developer.</p>
          </form>
        )}
      </Sheet>
    </>
  );
}
