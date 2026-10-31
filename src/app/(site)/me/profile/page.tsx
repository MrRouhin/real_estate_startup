import { requireUser } from '@/lib/auth';
import { PageHeader } from '@/components/ui/bits';
import { ActionForm, SubmitButton } from '@/components/ui/action-form';
import { LiveRefresh } from '@/components/live-refresh';
import { saveMyProfile } from './actions';
import { KycCard } from './kyc-card';

export const metadata = { title: 'My profile' };

export default async function MyProfile() {
  const { user, profile } = await requireUser('/me/profile');
  const p = profile as typeof profile & { address: string | null; city: string | null; pincode: string | null; date_of_birth: string | null; occupation: string | null; preferred_language: string | null; id_type: string | null; id_last4: string | null; kyc_note: string | null };
  return (
    <div className="grid gap-6">
      <LiveRefresh tables={['profiles']} filter={`id=eq.${user.id}`} />
      <PageHeader emoji="🙋" title="My profile" sub="Your details go on booking papers and agreements. Keep them as they appear on your ID." />
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.2fr)_minmax(320px,1fr)]">
        <ActionForm action={saveMyProfile} reset={false} className="card grid gap-3 p-5 sm:grid-cols-2">
          <h2 className="text-[16px] font-bold sm:col-span-2">Personal details</h2>
          <div className="sm:col-span-2"><label className="label" htmlFor="fn">Full name (as on ID)</label><input id="fn" name="full_name" className="input" defaultValue={p.full_name ?? ''} required /></div>
          <div><label className="label" htmlFor="ph">Mobile</label><input id="ph" className="input num bg-surface-2" value={p.phone ?? 'Add by signing in with OTP'} readOnly /></div>
          <div><label className="label" htmlFor="em">Email</label><input id="em" name="email" type="email" className="input" defaultValue={p.email ?? ''} /></div>
          <div><label className="label" htmlFor="dob">Date of birth</label><input id="dob" name="date_of_birth" type="date" className="input" defaultValue={p.date_of_birth ?? ''} /></div>
          <div><label className="label" htmlFor="oc">Occupation</label><input id="oc" name="occupation" className="input" defaultValue={p.occupation ?? ''} placeholder="Software engineer" /></div>
          <div className="sm:col-span-2"><label className="label" htmlFor="ad">Address for letters</label><textarea id="ad" name="address" className="input min-h-[70px]" defaultValue={p.address ?? ''} /></div>
          <div><label className="label" htmlFor="ci">City</label><input id="ci" name="city" className="input" defaultValue={p.city ?? ''} /></div>
          <div><label className="label" htmlFor="pin">PIN code</label><input id="pin" name="pincode" className="input num" inputMode="numeric" maxLength={6} defaultValue={p.pincode ?? ''} /></div>
          <div className="sm:col-span-2"><label className="label" htmlFor="la">Preferred language</label><select id="la" name="preferred_language" className="input" defaultValue={p.preferred_language ?? 'English'}>{['English', 'Hindi', 'Kannada', 'Tamil', 'Telugu', 'Malayalam', 'Marathi', 'Bengali'].map((l) => <option key={l}>{l}</option>)}</select></div>
          <SubmitButton className="btn btn-primary sm:col-span-2">Save details</SubmitButton>
        </ActionForm>
        <KycCard userId={user.id} status={p.kyc_status} idType={p.id_type} last4={p.id_last4} note={p.kyc_note} />
      </div>
    </div>
  );
}
