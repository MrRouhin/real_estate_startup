import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, CheckCircle2 } from 'lucide-react';
import { requireUser, homeFor } from '@/lib/auth';
import { date } from '@/lib/format';
import { letterNo } from '@/lib/numbering';
import { Logo } from '@/components/logo';
import { AckLetter } from '@/components/portal/ack-letter';
import { LETTER_KIND } from '@/components/portal/letters';
import { PrintButton } from './print-button';

export const metadata = { title: 'Letter' };

export default async function LetterPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, profile } = await requireUser(`/letters/${id}`);
  const { data: l } = await supabase.from('letters').select('*').eq('id', id).maybeSingle();
  if (!l) notFound();
  const [{ data: org }, { data: project }, recipient] = await Promise.all([
    supabase.from('organizations').select('name, address, gst_number, phone, email, website, signatory_name, signatory_title').eq('id', l.org_id).single(),
    l.project_id ? supabase.from('projects').select('name, address, rera_number').eq('id', l.project_id).single() : Promise.resolve({ data: null }),
    (async () => {
      if (l.recipient_type === 'contractor') { const { data } = await supabase.from('contractors').select('company_name, contact_person, address, gst_number').eq('id', l.recipient_id).maybeSingle(); return data ? { name: data.company_name, attn: data.contact_person, address: data.address, gst: data.gst_number } : null; }
      if (l.recipient_type === 'vendor') { const { data } = await supabase.from('vendors').select('company_name, contact_person, address, gst_number').eq('id', l.recipient_id).maybeSingle(); return data ? { name: data.company_name, attn: data.contact_person, address: data.address, gst: data.gst_number } : null; }
      const { data } = await supabase.from('employees').select('full_name, employee_code, role_title').eq('id', l.recipient_id).maybeSingle();
      return data ? { name: data.full_name, attn: `${data.employee_code} · ${data.role_title ?? ''}`, address: null, gst: null } : null;
    })(),
  ]);
  const isRecipient = (l.recipient_type === profile.role) && l.status === 'issued';
  const back = homeFor(profile.role);
  return (
    <div className="min-h-dvh bg-surface-2 py-6 print:bg-white print:py-0">
      <div className="mx-auto mb-4 flex max-w-[820px] flex-wrap items-center justify-between gap-2 px-4 print:hidden">
        <Link href={profile.role === 'seller' || profile.role === 'admin' ? '/console/letters' : `${back}/letters`} className="inline-flex items-center gap-1 text-[13px] text-ink-2 hover:text-ink"><ArrowLeft className="size-4" />Back</Link>
        <div className="flex items-center gap-2">{isRecipient && <AckLetter id={l.id} />}<PrintButton /></div>
      </div>
      <article className="paper mx-auto max-w-[820px] bg-white p-8 text-[14px] leading-relaxed text-[#1d2b28] shadow-[var(--shadow)] sm:p-12 print:max-w-none print:p-0 print:shadow-none">
        <header className="flex items-start justify-between gap-4 border-b-2 border-[#0e5d63] pb-4">
          <div className="flex items-center gap-3"><Logo size={40} /><div><div className="text-[20px] font-bold">{org?.name}</div>
            <div className="text-[12px] text-[#55635f]">{org?.address}</div>
            <div className="num text-[11.5px] text-[#55635f]">{[org?.gst_number && `GSTIN ${org.gst_number}`, org?.phone, org?.email, org?.website].filter(Boolean).join(' · ')}</div></div></div>
          <div className="text-right text-[12px]"><div className="num font-semibold">{letterNo(l.seq, l.created_at)}</div><div>{date(l.issued_at ?? l.created_at)}</div>
            <div className="mt-1 inline-block rounded bg-[#e7f3f1] px-1.5 py-0.5 text-[11px] font-semibold text-[#0e5d63]">{LETTER_KIND[l.kind] ?? 'Letter'}</div></div>
        </header>
        <section className="mt-6 text-[13.5px]">
          <div className="text-[#55635f]">To</div>
          <div className="font-semibold">{recipient?.name}</div>
          {recipient?.attn && <div>Attn: {recipient.attn}</div>}
          {recipient?.address && <div className="whitespace-pre-line">{recipient.address}</div>}
          {recipient?.gst && <div className="num text-[12px]">GSTIN {recipient.gst}</div>}
        </section>
        {project && <div className="mt-4 text-[13px]"><b>Project:</b> {project.name}{project.rera_number ? ` (RERA ${project.rera_number})` : ''}</div>}
        <h1 className="mt-4 text-[16px] font-bold">Subject: {l.subject}</h1>
        <div className="mt-4 whitespace-pre-line">{l.body}</div>
        <footer className="mt-10 grid gap-8 sm:grid-cols-2">
          <div><div className="text-[12px] text-[#55635f]">For {org?.name}</div><div className="mt-10 border-t border-[#c9d1cf] pt-1"><div className="font-semibold">{org?.signatory_name || 'Authorised signatory'}</div><div className="text-[12px]">{org?.signatory_title}</div></div></div>
          <div><div className="text-[12px] text-[#55635f]">Acknowledged by the recipient</div>
            {l.status === 'acknowledged' ? <div className="mt-3 flex items-start gap-2 rounded-lg bg-[#e8f5ee] p-2 text-[12.5px] text-[#1f7a46]"><CheckCircle2 className="mt-0.5 size-4 shrink-0" />Acknowledged electronically on {date(l.acknowledged_at)}{l.ack_note ? `: “${l.ack_note}”` : ''}</div>
              : <div className="mt-10 border-t border-[#c9d1cf] pt-1 text-[12px] text-[#55635f]">Signature and date</div>}</div>
        </footer>
        <p className="mt-8 border-t border-[#e3e8e6] pt-2 text-[10.5px] text-[#7d8a86]">Issued through REMMO. {l.source === 'ai' ? 'Drafted with AI from site records and reviewed by the developer before issue.' : ''}</p>
      </article>
    </div>
  );
}
