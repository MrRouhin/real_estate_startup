import { AlertTriangle, BadgeCheck, Clock, ShieldCheck } from 'lucide-react';
import { ActionForm, SubmitButton } from '@/components/ui/action-form';
import { date } from '@/lib/format';
import { saveCompanyProfile } from './actions';

type Company = {
  company_name: string; contact_person: string | null; phone: string | null; email: string | null; address: string | null; gst_number: string | null; pan: string | null;
  upi_id: string | null; bank_ifsc: string | null; bank_last4: string | null; profile_status: string; profile_note: string | null; profile_updated_at: string | null;
  license_number?: string | null; insurance_policy?: string | null; insurance_valid_till?: string | null; team_size?: number | null; trade?: string | null;
  categories?: string[] | null; delivery_regions?: string | null;
};

const STATUS = {
  draft: { label: 'Not sent yet', icon: Clock, cls: 'text-ink-2 bg-surface-2' },
  submitted: { label: 'With the developer for checks', icon: Clock, cls: 'text-warn bg-[color-mix(in_srgb,var(--warn)_12%,transparent)]' },
  verified: { label: 'Verified', icon: BadgeCheck, cls: 'text-good bg-[color-mix(in_srgb,var(--good)_12%,transparent)]' },
  needs_changes: { label: 'Needs changes', icon: AlertTriangle, cls: 'text-bad bg-[color-mix(in_srgb,var(--bad)_10%,transparent)]' },
} as const;

/** How complete a company profile is, for the progress ring and the checklist. */
export function companyCompleteness(c: Company, kind: 'contractor' | 'vendor') {
  const items: [string, boolean][] = [
    ['Contact person and phone', !!(c.contact_person && c.phone)], ['Office address', !!c.address], ['GSTIN', !!c.gst_number], ['PAN', !!c.pan],
    ['Bank or UPI for payments', !!((c.bank_ifsc && c.bank_last4) || c.upi_id)],
    ...(kind === 'contractor'
      ? [['Trade licence', !!c.license_number], ['Insurance (workmen compensation)', !!(c.insurance_policy && c.insurance_valid_till)], ['Team size', !!c.team_size]] as [string, boolean][]
      : [['What you supply', !!c.categories?.length], ['Where you deliver', !!c.delivery_regions]] as [string, boolean][]),
  ];
  return { items, pct: Math.round((items.filter((i) => i[1]).length / items.length) * 100) };
}

export function CompanyProfileForm({ c, kind }: { c: Company; kind: 'contractor' | 'vendor' }) {
  const st = STATUS[(c.profile_status as keyof typeof STATUS) || 'draft'] ?? STATUS.draft;
  const comp = companyCompleteness(c, kind);
  const insExpiring = kind === 'contractor' && c.insurance_valid_till && new Date(c.insurance_valid_till).getTime() - Date.now() < 30 * 86400000;
  const F = ({ name, label, value, type = 'text', placeholder, hint, mono, span }: { name: string; label: string; value?: string | number | null; type?: string; placeholder?: string; hint?: string; mono?: boolean; span?: boolean }) => (
    <div className={span ? 'sm:col-span-2' : ''}><label className="label" htmlFor={name}>{label}</label>
      <input id={name} name={name} type={type} defaultValue={value ?? ''} placeholder={placeholder} className={'input ' + (mono ? 'num uppercase' : '')} />
      {hint && <p className="mt-1 text-[11.5px] text-ink-3">{hint}</p>}</div>
  );
  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_300px]">
      <ActionForm action={saveCompanyProfile} reset={false} className="card grid gap-5 p-5">
        <div className={'flex items-start gap-2 rounded-xl px-3 py-2.5 text-[13px] ' + st.cls}>
          <st.icon className="mt-0.5 size-4 shrink-0" />
          <div><b>{st.label}</b>{c.profile_updated_at && <span className="text-ink-3"> · updated {date(c.profile_updated_at)}</span>}{c.profile_note && <div className="mt-0.5">Developer’s note: {c.profile_note}</div>}</div>
        </div>
        <fieldset className="grid gap-3 sm:grid-cols-2">
          <legend className="mb-2 text-[15px] font-bold">Company and contact</legend>
          <div className="sm:col-span-2"><div className="label">Company</div><div className="input bg-surface-2 text-ink-2">{c.company_name}{c.trade ? ` · ${c.trade}` : ''}</div></div>
          <F name="contact_person" label="Contact person" value={c.contact_person} />
          <F name="phone" label="Phone" value={c.phone} type="tel" placeholder="98450 12345" />
          <F name="email" label="Email" value={c.email} type="email" />
          {kind === 'contractor' ? <F name="team_size" label="Team size (people)" value={c.team_size} type="number" /> : <F name="delivery_regions" label="Where you deliver" value={c.delivery_regions} placeholder="Bengaluru North, Hosur, Devanahalli" />}
          <F name="address" label="Office address" value={c.address} span />
          {kind === 'vendor' && <F name="categories" label="What you supply (comma separated)" value={(c.categories || []).join(', ')} placeholder="cement, steel, sand" span />}
        </fieldset>
        <fieldset className="grid gap-3 sm:grid-cols-2">
          <legend className="mb-2 text-[15px] font-bold">Tax and compliance</legend>
          <F name="gst_number" label="GSTIN" value={c.gst_number} mono placeholder="29ABCDE1234F1Z5" />
          <F name="pan" label="PAN" value={c.pan} mono placeholder="ABCDE1234F" />
          {kind === 'contractor' && <>
            <F name="license_number" label="Contractor licence number" value={c.license_number} />
            <F name="insurance_policy" label="Workmen compensation policy" value={c.insurance_policy} />
            <F name="insurance_valid_till" label="Insurance valid till" value={c.insurance_valid_till} type="date" hint={insExpiring ? 'Expires within 30 days. Renew it to keep working on site.' : undefined} />
          </>}
        </fieldset>
        <fieldset className="grid gap-3 sm:grid-cols-2">
          <legend className="mb-2 text-[15px] font-bold">Where we pay you</legend>
          <F name="bank_ifsc" label="Bank IFSC" value={c.bank_ifsc} mono placeholder="HDFC0001234" />
          <F name="bank_account" label={c.bank_last4 ? `Account number (now ending ${c.bank_last4})` : 'Account number'} placeholder="Only the last 4 digits are kept" type="password" hint="We keep only the last 4 digits, to match payments. Never share full numbers in chat." />
          <F name="upi_id" label="UPI ID (optional)" value={c.upi_id} placeholder="company@okhdfc" />
          <input type="hidden" name="bank_last4" value={c.bank_last4 ?? ''} />
        </fieldset>
        <div className="flex flex-wrap gap-2 border-t border-line pt-4">
          <SubmitButton className="btn btn-outline" name="intent" value="save" pendingText="Saving…">Save draft</SubmitButton>
          <SubmitButton className="btn btn-primary" name="intent" value="submit" pendingText="Sending…">Save and send for verification</SubmitButton>
        </div>
      </ActionForm>
      <aside className="card grid content-start gap-3 p-5">
        <div className="flex items-center gap-2 font-semibold"><ShieldCheck className="size-5 text-accent" />Profile checklist</div>
        <div className="flex items-center gap-3"><div className="h-2 flex-1 overflow-hidden rounded-full bg-surface-2"><div className="h-full rounded-full bg-accent" style={{ width: `${comp.pct}%` }} /></div><b className="num text-[13px]">{comp.pct}%</b></div>
        <ul className="grid gap-1.5 text-[13px]">
          {comp.items.map(([k, done]) => <li key={k} className={'flex items-center gap-2 ' + (done ? 'text-ink' : 'text-ink-3')}>{done ? <BadgeCheck className="size-4 text-good" /> : <span className="ml-0.5 size-3 rounded-full border-2 border-line" />}{k}</li>)}
        </ul>
        <p className="text-[12px] text-ink-3">A verified profile gets bills and invoices paid faster. Editing a verified profile sends it back for a quick re-check.</p>
      </aside>
    </div>
  );
}
