import { AlertTriangle, BadgeCheck, Clock } from 'lucide-react';
import { requirePartner } from '@/lib/auth';
import { PageHeader } from '@/components/ui/bits';
import { date } from '@/lib/format';
import { ProfileWizard } from './wizard';
import { PhotoUpload } from './photo';

export const metadata = { title: 'My profile' };

export default async function EmployeeProfile() {
  const { supabase, user } = await requirePartner('employee');
  const { data: me } = await supabase.from('employees').select('id, phone').eq('user_id', user.id).eq('active', true).single();
  const { data: p } = await supabase.from('employee_profiles').select('*').eq('employee_id', me!.id).maybeSingle();
  const photo = p?.photo_path ? (await supabase.storage.from('site').createSignedUrl(p.photo_path, 600)).data?.signedUrl ?? null : null;
  const st = p?.status ?? 'draft';
  return (
    <>
      <PageHeader emoji="🙋" title="My profile" sub={<>Five short steps. Your supervisor verifies it before you are cleared for site work and wages.</>} />
      <div className={'flex items-start gap-2 rounded-xl px-3 py-2.5 text-[13.5px] ' + (st === 'verified' ? 'bg-[color-mix(in_srgb,var(--good)_12%,transparent)] text-good' : st === 'needs_changes' ? 'bg-[color-mix(in_srgb,var(--bad)_10%,transparent)] text-bad' : st === 'submitted' ? 'bg-[color-mix(in_srgb,var(--warn)_12%,transparent)] text-warn' : 'bg-surface-2 text-ink-2')}>
        {st === 'verified' ? <BadgeCheck className="mt-0.5 size-4 shrink-0" /> : st === 'needs_changes' ? <AlertTriangle className="mt-0.5 size-4 shrink-0" /> : <Clock className="mt-0.5 size-4 shrink-0" />}
        <div>{st === 'verified' ? `Verified ${date(p?.verified_at)}. You are cleared for site work.` : st === 'submitted' ? `Sent ${date(p?.submitted_at)}. Waiting for your supervisor.` : st === 'needs_changes' ? `Changes asked: ${p?.review_note ?? ''}` : 'Not sent yet.'}</div>
      </div>
      <div className="grid gap-5 lg:grid-cols-[220px_minmax(0,1fr)]">
        <PhotoUpload url={photo} />
        <ProfileWizard initial={p as never} phone={me!.phone} />
      </div>
    </>
  );
}
