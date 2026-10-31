import QRCode from 'qrcode';
import { BadgeCheck, Clock, Droplet, Phone } from 'lucide-react';
import { requirePartner } from '@/lib/auth';
import { PageHeader } from '@/components/ui/bits';
import { date } from '@/lib/format';
import { Logo } from '@/components/logo';
import { PrintButton } from '@/app/letters/[id]/print-button';

export const metadata = { title: 'Site ID card' };

export default async function EmployeeIdCard() {
  const { supabase, user } = await requirePartner('employee');
  const { data: me } = await supabase.from('employees').select('id, full_name, employee_code, role_title, org_id, contractor_id, contractors(company_name), organizations(name, phone), projects(name)').eq('user_id', user.id).eq('active', true).single();
  const { data: p } = await supabase.from('employee_profiles').select('status, blood_group, emergency_name, emergency_phone, photo_path, verified_at, safety_trained').eq('employee_id', me!.id).maybeSingle();
  const photo = p?.photo_path ? (await supabase.storage.from('site').createSignedUrl(p.photo_path, 600)).data?.signedUrl ?? null : null;
  const org = me!.organizations as unknown as { name: string; phone: string | null };
  const employer = (me!.contractors as unknown as { company_name: string } | null)?.company_name;
  const project = (me!.projects as unknown as { name: string } | null)?.name;
  // the QR holds only the worker code and the developer, enough for a gate guard to look the person up
  const qr = await QRCode.toString(`REMMO:${me!.employee_code}:${me!.id.slice(0, 8)}`, { type: 'svg', margin: 0, color: { dark: '#0e2a26', light: '#ffffff00' } });
  const verified = p?.status === 'verified';
  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-3 print:hidden">
        <PageHeader emoji="🪪" title="Site ID card" sub={<>Show this at the gate. Print it or keep it on your phone.</>} />
        <PrintButton />
      </div>
      <div className="mx-auto w-full max-w-[380px] overflow-hidden rounded-[26px] border border-line bg-white text-[#1d2b28] shadow-[0_30px_60px_-25px_rgba(14,42,38,.45)]">
        <div className="relative bg-[linear-gradient(135deg,#0e5d63,#14857f_55%,#2f9e5c)] px-5 pb-14 pt-4 text-white">
          <div className="flex items-center justify-between"><div className="flex items-center gap-2"><Logo size={26} /><span className="font-display text-[15px] font-bold tracking-[0.08em]">REMMO</span></div>
            <span className={'flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold ' + (verified ? 'bg-white/20' : 'bg-[#f0b43a] text-black')}>{verified ? <><BadgeCheck className="size-3.5" />Verified</> : <><Clock className="size-3.5" />Not verified</>}</span></div>
          <div className="mt-1 text-[12px] text-white/80">{org.name}{project ? ` · ${project}` : ''}</div>
        </div>
        <div className="-mt-11 grid justify-items-center gap-1 px-5 pb-5 text-center">
          <div className="size-24 overflow-hidden rounded-[22px] border-4 border-white bg-[#eef1ee] shadow-md">{photo ? <img src={photo} alt="" className="size-full object-cover" /> : <div className="grid size-full place-items-center text-[40px]">🧑‍🔧</div>}</div>
          <div className="mt-1 text-[20px] font-bold">{me!.full_name}</div>
          <div className="text-[13px] text-[#55635f]">{me!.role_title}{employer ? ` · ${employer}` : ''}</div>
          <div className="num mt-1 rounded-lg bg-[#eef4f2] px-2 py-0.5 text-[13px] font-semibold tracking-wider">{me!.employee_code}</div>
          <div className="mt-3 grid w-full grid-cols-[1fr_auto] items-center gap-3 text-left text-[12px]">
            <dl className="grid gap-1">
              <div className="flex items-center gap-1.5"><Droplet className="size-3.5 text-[#c0392b]" /><dt className="text-[#7d8a86]">Blood</dt><dd className="font-semibold">{p?.blood_group || '—'}</dd></div>
              <div className="flex items-center gap-1.5"><Phone className="size-3.5 text-[#0e5d63]" /><dt className="text-[#7d8a86]">Emergency</dt><dd className="font-semibold">{p?.emergency_phone ? `${p.emergency_name ?? ''} ${p.emergency_phone}` : '—'}</dd></div>
              <div className="flex items-center gap-1.5"><BadgeCheck className="size-3.5 text-[#2f9e5c]" /><dt className="text-[#7d8a86]">Safety</dt><dd className="font-semibold">{p?.safety_trained ? 'Trained' : 'Pending'}</dd></div>
              {verified && <div className="text-[11px] text-[#7d8a86]">Verified {date(p?.verified_at)}</div>}
            </dl>
            <div className="size-24 [&_svg]:size-full" dangerouslySetInnerHTML={{ __html: qr }} />
          </div>
          <div className="mt-3 w-full border-t border-[#e3e8e6] pt-2 text-[10.5px] text-[#7d8a86]">If found, please call {org.phone || 'the site office'}.</div>
        </div>
      </div>
    </>
  );
}
