import Link from 'next/link';
import { CheckCircle2, FileText, Mail } from 'lucide-react';
import type { createClient } from '@/lib/supabase/server';
import { date } from '@/lib/format';
import { Empty, Pill } from '@/components/ui/bits';
import { AckLetter } from './ack-letter';
import { letterNo } from '@/lib/numbering';

export const LETTER_KIND: Record<string, string> = {
  crew_compliance: 'Crew compliance', work_order: 'Work order', delay_notice: 'Delay notice', appointment: 'Appointment letter',
  purchase_order: 'Purchase order', general: 'Letter',
};

/** Letters sent to this contractor, vendor or employee, newest first, with acknowledgement. */
export async function LettersInbox({ supabase, recipientType, recipientId }: {
  supabase: Awaited<ReturnType<typeof createClient>>; recipientType: 'contractor' | 'vendor' | 'employee'; recipientId: string;
}) {
  const { data: letters } = await supabase.from('letters').select('id, seq, kind, subject, body, status, issued_at, acknowledged_at, ack_note, created_at')
    .eq('recipient_type', recipientType).eq('recipient_id', recipientId).in('status', ['issued', 'acknowledged']).order('issued_at', { ascending: false });
  if (!letters?.length) return <Empty icon={<Mail className="size-6" />} title="No letters yet">Work orders, notices and appointment letters from the developer appear here.</Empty>;
  return (
    <ul className="grid gap-3">
      {letters.map((l) => (
        <li key={l.id} className="card grid gap-2 p-4">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2 text-[12px] text-ink-3"><span className="num">{letterNo(l.seq, l.created_at)}</span><span className="tag">{LETTER_KIND[l.kind] ?? 'Letter'}</span><span>{date(l.issued_at)}</span></div>
              <div className="mt-1 text-[15px] font-semibold">{l.subject}</div>
            </div>
            {l.status === 'acknowledged' ? <Pill status="acknowledged" tone="good" label="Acknowledged" /> : <Pill status="issued" tone="warn" label="Needs your reply" />}
          </div>
          <p className="line-clamp-3 whitespace-pre-line text-[13.5px] text-ink-2">{l.body}</p>
          <div className="flex flex-wrap items-center gap-2">
            <Link href={`/letters/${l.id}`} className="btn btn-outline btn-sm"><FileText className="size-4" />Open and print</Link>
            {l.status === 'issued' ? <AckLetter id={l.id} /> : <span className="flex items-center gap-1 text-[12.5px] text-good"><CheckCircle2 className="size-4" />Acknowledged {date(l.acknowledged_at)}{l.ack_note ? `: “${l.ack_note}”` : ''}</span>}
          </div>
        </li>
      ))}
    </ul>
  );
}
