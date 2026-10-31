'use client';
import { useRouter } from 'next/navigation';
import { ActionForm, SubmitButton } from '@/components/ui/action-form';
import { createCompany } from './actions';

export function StartForm({ email }: { email: string }) {
  const router = useRouter();
  return (
        <ActionForm action={createCompany} reset={false} onDone={(r) => r.id && router.push(r.id)} className="card grid gap-3 p-6">
      <h2 className="text-[20px] font-bold">Your company</h2>
      <div><label className="label" htmlFor="n">Registered name</label><input id="n" name="name" className="input" required placeholder="Rao Homes Pvt Ltd" /></div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div><label className="label" htmlFor="p">Office phone</label><input id="p" name="phone" className="input num" inputMode="tel" /></div>
        <div><label className="label" htmlFor="e">Sales email</label><input id="e" name="email" type="email" className="input" defaultValue={email} /></div>
        <div><label className="label" htmlFor="g">GSTIN</label><input id="g" name="gst_number" className="input num uppercase" placeholder="29ABCDE1234F1Z5" /></div>
        <div><label className="label" htmlFor="w">Website (optional)</label><input id="w" name="website" className="input" placeholder="raohomes.in" /></div>
      </div>
      <div><label className="label" htmlFor="a">Office address</label><textarea id="a" name="address" className="input min-h-[70px]" /></div>
      <div><label className="label" htmlFor="t">Your title (for letters you sign)</label><input id="t" name="signatory_title" className="input" defaultValue="Director" /></div>
      <SubmitButton className="btn btn-primary btn-lg mt-1" pendingText="Creating…">Create company and add a project</SubmitButton>
      <p className="text-[12px] text-ink-3">You become the owner and can invite colleagues later. Nothing is public until you publish a project and we verify the company.</p>
    </ActionForm>
  );
}
