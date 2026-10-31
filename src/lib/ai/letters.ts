// Formal letters to contractors, suppliers and site employees. The facts come from the
// records (work packages, crew profiles, purchase orders); a template writes the letter, and
// when a model is configured it polishes the wording without changing any fact or number.
import 'server-only';
import { aiText, type AIResult } from './client';

export type LetterKind = 'work_order' | 'crew_compliance' | 'delay_notice' | 'purchase_order' | 'appointment' | 'general';
export type LetterFacts = {
  org: { name: string; signatory: string | null; title: string | null };
  project?: { name: string; rera?: string | null } | null;
  recipient: { name: string; attn?: string | null };
  workPackage?: { title: string; scope: string | null; value: number | null; start: string | null; due: string | null; progress: number; planned?: number; forecast?: string | null } | null;
  crew?: { total: number; unverified: string[]; noSafety: string[]; insuranceTill: string | null } | null;
  po?: { number: string; items: { name: string; unit: string; qty: number; rate: number }[]; total: number; requiredBy: string | null; location: string | null; terms: string | null } | null;
  employee?: { code: string; role: string | null; wage: number | null; employer: string | null; start: string } | null;
  note?: string | null;
  replyBy: string;
};

const inr = (n: number) => '₹' + Math.round(n).toLocaleString('en-IN');
const d = (s: string | null | undefined) => (s ? new Date(s).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }) : '—');

export function letterTemplate(kind: LetterKind, f: LetterFacts): { subject: string; body: string } {
  const sign = `\n\nYours faithfully,\nFor ${f.org.name}`;
  const proj = f.project ? `${f.project.name}${f.project.rera ? ` (RERA ${f.project.rera})` : ''}` : 'our project';
  const greet = `Dear ${f.recipient.attn || f.recipient.name},`;
  const extra = f.note ? `\n\n${f.note.trim()}` : '';
  switch (kind) {
    case 'work_order': {
      const w = f.workPackage!;
      return {
        subject: `Work order: ${w.title}`,
        body: `${greet}\n\nWe are pleased to award you the following work at ${proj}.\n\nWork: ${w.title}\n${w.scope ? `Scope: ${w.scope}\n` : ''}Contract value: ${w.value ? inr(w.value) + ' (exclusive of GST)' : 'as per the agreed rates'}\nStart: ${d(w.start)}\nCompletion: ${d(w.due)}\n\nTerms:\n1. Work shall follow the approved drawings, specifications and the site engineer’s instructions.\n2. Running bills shall be raised through REMMO against measured progress. 5% retention and statutory TDS will be deducted; retention is released after the defect liability period.\n3. All workers must be 18 or older, registered with verified profiles, and wear protective equipment at all times.\n4. Workmen compensation insurance must stay valid for the full period of work.\n5. Materials are issued from the site store against requests; wastage beyond norms will be recovered.\n\nPlease acknowledge this work order by ${d(f.replyBy)}.${extra}${sign}`,
      };
    }
    case 'crew_compliance': {
      const c = f.crew!;
      const lines = [
        c.unverified.length ? `• ${c.unverified.length} worker profile${c.unverified.length > 1 ? 's are' : ' is'} not verified: ${c.unverified.slice(0, 8).join(', ')}${c.unverified.length > 8 ? '…' : ''}` : '',
        c.noSafety.length ? `• ${c.noSafety.length} worker${c.noSafety.length > 1 ? 's have' : ' has'} no recorded safety training: ${c.noSafety.slice(0, 8).join(', ')}${c.noSafety.length > 8 ? '…' : ''}` : '',
        c.insuranceTill && new Date(c.insuranceTill) < new Date(Date.now() + 30 * 86400000) ? `• Workmen compensation insurance ${new Date(c.insuranceTill) < new Date() ? 'expired' : 'expires'} on ${d(c.insuranceTill)}` : '',
      ].filter(Boolean);
      return {
        subject: 'Crew compliance: action needed',
        body: `${greet}\n\nOur review of your crew records for ${proj} found the following:\n\n${lines.length ? lines.join('\n') : '• No gaps found. Thank you for keeping your records current.'}\n\nOf your ${c.total} active workers, only verified and safety-trained workers may work on site from ${d(f.replyBy)}. Please complete the profiles and training records in your REMMO workspace before that date.${extra}${sign}`,
      };
    }
    case 'delay_notice': {
      const w = f.workPackage!;
      return {
        subject: `Notice of delay: ${w.title}`,
        body: `${greet}\n\nAs per the agreed schedule, ${w.title} at ${proj} should have reached ${Math.round(w.planned ?? 0)}% by today. The recorded progress is ${Math.round(w.progress)}%.${w.forecast ? ` At the current pace the work would finish around ${d(w.forecast)}, against the agreed completion of ${d(w.due)}.` : ''}\n\nPlease submit a recovery plan by ${d(f.replyBy)}, stating the additional crew, shifts or equipment you will deploy and the revised weekly targets. Continued delay may attract the liquidated damages set out in the work order.${extra}${sign}`,
      };
    }
    case 'purchase_order': {
      const p = f.po!;
      const rows = p.items.map((i) => `• ${i.name}: ${i.qty} ${i.unit} at ${inr(i.rate)} per ${i.unit} = ${inr(i.qty * i.rate)}`).join('\n');
      return {
        subject: `Purchase order ${p.number}`,
        body: `${greet}\n\nPlease supply the following for ${proj}:\n\n${rows}\n\nTotal including GST: ${inr(p.total)}\nDeliver to: ${p.location || 'site store'}\nRequired by: ${d(p.requiredBy)}\n${p.terms ? `Terms: ${p.terms}\n` : ''}\nEvery delivery is inspected at the store; only accepted quantity is paid. Please accept this order with your delivery date in REMMO by ${d(f.replyBy)}.${extra}${sign}`,
      };
    }
    case 'appointment': {
      const e = f.employee!;
      return {
        subject: `Appointment as ${e.role || 'site worker'}`,
        body: `${greet}\n\nWe are pleased to appoint you as ${e.role || 'site worker'} (worker code ${e.code}) at ${proj}${e.employer ? `, working with ${e.employer}` : ''}, from ${d(e.start)}.\n\nWage: ${e.wage ? inr(e.wage) + ' per day worked' : 'as agreed'}, paid for each day recorded through check-in at site.\nHours: 9 am to 6 pm with a one-hour break; overtime only when approved.\nSafety: helmet, safety shoes and, above 2 metres, a harness are compulsory. Report any unsafe condition to your supervisor.\nLeave: request leave in the REMMO app in advance wherever possible.\n\nPlease acknowledge this letter in the app by ${d(f.replyBy)}.${extra}${sign}`,
      };
    }
    default:
      return { subject: f.note?.split('\n')[0]?.slice(0, 80) || 'Letter', body: `${greet}\n\n${f.note || ''}${sign}` };
  }
}

/** Template first; a model, if configured, only improves the wording. Returns the source used. */
export async function draftLetter(kind: LetterKind, f: LetterFacts): Promise<{ subject: string; body: string; source: 'ai' | 'rules'; result?: AIResult }> {
  const t = letterTemplate(kind, f);
  const r = await aiText({
    system: 'You edit formal business letters for an Indian real estate developer. Improve clarity and tone (firm, courteous, plain English). Keep every fact, name, number, date and term exactly as given. Do not add new obligations, amounts or dates. Keep the greeting and the sign-off lines. Reply with the letter body only.',
    messages: [{ role: 'user', content: `Subject: ${t.subject}\n\n${t.body}` }], maxTokens: 900, temperature: 0.2,
  });
  const text = r?.text?.trim();
  // keep the AI text only if it kept the key figures
  const figures = (t.body.match(/₹[\d,]+|\d{1,2} \w+ \d{4}/g) || []).slice(0, 6);
  if (text && text.length > 120 && figures.every((x) => text.includes(x))) return { subject: t.subject, body: text.replace(/^Subject:.*\n+/i, ''), source: 'ai', result: r! };
  return { ...t, source: 'rules' };
}
