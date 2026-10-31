import { BadgeCheck, Clock } from 'lucide-react';
import { requireStaff } from '@/lib/auth';
import { PageHeader, Section } from '@/components/ui/bits';
import { ActionForm, SubmitButton } from '@/components/ui/action-form';
import { CopyInvite } from '../people/copy-invite';
import { saveOrgSettings } from '../ops-actions';
import { PublishToggle } from './publish-toggle';

export const metadata = { title: 'Settings' };

export default async function Settings() {
  const { org, projects, orgRole } = await requireStaff();
  const can = orgRole === 'owner' || orgRole === 'manager';
  const F = ({ n, l, v, ...rest }: { n: string; l: string; v: string | number | null | undefined } & React.InputHTMLAttributes<HTMLInputElement>) => (
    <div><label className="label" htmlFor={n}>{l}</label><input id={n} name={n} defaultValue={v ?? ''} className="input" disabled={!can} {...rest} /></div>
  );
  return (
    <>
      <PageHeader emoji="⚙️" title="Settings" sub="Your company details appear on letters, purchase orders and buyers’ booking papers." />
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.3fr)_minmax(300px,1fr)]">
        <ActionForm action={saveOrgSettings} reset={false} className="card grid gap-3 p-5 sm:grid-cols-2">
          <div className="flex items-center justify-between gap-2 sm:col-span-2"><h2 className="text-[16px] font-bold">Company</h2>
            {org.is_verified ? <span className="flex items-center gap-1 text-[12.5px] font-semibold text-good"><BadgeCheck className="size-4" />Verified on REMMO</span> : <span className="flex items-center gap-1 text-[12.5px] font-semibold text-warn"><Clock className="size-4" />Verification pending</span>}</div>
          <div className="sm:col-span-2"><F n="name" l="Registered name" v={org.name} required /></div>
          <F n="phone" l="Phone" v={org.phone} /><F n="email" l="Email" v={org.email} type="email" />
          <F n="gst_number" l="GSTIN" v={org.gst_number} className="input num uppercase" /><F n="website" l="Website" v={org.website} />
          <div className="sm:col-span-2"><F n="address" l="Office address" v={org.address} /></div>
          <F n="signatory_name" l="Letters signed by" v={org.signatory_name} /><F n="signatory_title" l="Their title" v={org.signatory_title} />
          <F n="token_percent" l="Booking amount (% of price, up to 10)" v={Number(org.token_percent)} type="number" min={1} max={10} step={0.5} />
          {can ? <SubmitButton className="btn btn-primary sm:col-span-2">Save</SubmitButton> : <p className="text-[12.5px] text-ink-3 sm:col-span-2">Only owners and managers can change these.</p>}
        </ActionForm>
        <div className="grid content-start gap-5">
          <Section title="Invite code"><p className="text-[13px] text-ink-2">Contractors, suppliers and workers join with this code.</p><CopyInvite code={org.invite_code ?? ''} /></Section>
          <Section title="Projects">
            <ul className="grid gap-2">{projects.map((p) => (
              <li key={p.id} className="flex items-center justify-between gap-2 text-[13.5px]"><span><b>{p.name}</b><span className="block text-[12px] capitalize text-ink-3">{p.kind === 'apartments' ? 'Apartments' : 'Plotted layout'} · {p.status}</span></span><PublishToggle id={p.id} published={p.is_published} /></li>
            ))}</ul>
            {!org.is_verified && <p className="mt-3 text-[12px] text-ink-3">Published projects become visible to buyers once REMMO verifies your company’s RERA and GST details.</p>}
          </Section>
        </div>
      </div>
    </>
  );
}
