'use client';
import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Sheet } from '@/components/ui/sheet';
import { ActionForm, SubmitButton } from '@/components/ui/action-form';
import { createContractor } from '../actions';

export function AddContractor() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button className="btn btn-primary" onClick={() => setOpen(true)}><Plus className="size-4" />Add contractor</button>
      <Sheet open={open} onClose={() => setOpen(false)} title="Add contractor" wide>
        <ActionForm action={createContractor} onDone={() => setOpen(false)} className="grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2"><label className="label" htmlFor="cn">Company name</label><input id="cn" name="company_name" className="input" required /></div>
          <div><label className="label" htmlFor="cp">Contact person</label><input id="cp" name="contact_person" className="input" /></div>
          <div><label className="label" htmlFor="ph">Phone</label><input id="ph" name="phone" className="input num" /></div>
          <div><label className="label" htmlFor="em">Email</label><input id="em" name="email" type="email" className="input" /></div>
          <div><label className="label" htmlFor="gst">GST / registration</label><input id="gst" name="gst_number" className="input num" /></div>
          <div><label className="label" htmlFor="tr">Trade</label>
            <select id="tr" name="trade" className="input">{['civil', 'roads', 'electrical', 'plumbing', 'landscaping', 'other'].map((t) => <option key={t} value={t}>{t[0]!.toUpperCase() + t.slice(1)}</option>)}</select></div>
          <div><label className="label" htmlFor="ct">Contract type</label>
            <select id="ct" name="contract_type" className="input">{[['item_rate', 'Item rate'], ['lump_sum', 'Lump sum'], ['labour_only', 'Labour only'], ['turnkey', 'Turnkey']].map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></div>
          <div className="sm:col-span-2"><label className="label" htmlFor="ad">Address</label><input id="ad" name="address" className="input" /></div>
          <SubmitButton className="btn btn-primary sm:col-span-2" pendingText="Adding…">Add contractor</SubmitButton>
        </ActionForm>
      </Sheet>
    </>
  );
}
