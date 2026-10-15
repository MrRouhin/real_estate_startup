'use client';
import { useState } from 'react';
import { UserPlus } from 'lucide-react';
import { Sheet } from '@/components/ui/sheet';
import { ActionForm, SubmitButton } from '@/components/ui/action-form';
import { createLead } from '../actions';

export function AddLead({ people }: { people: { id: string; name: string }[] }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button className="btn btn-primary" onClick={() => setOpen(true)}><UserPlus className="size-4" />Add lead</button>
      <Sheet open={open} onClose={() => setOpen(false)} title="Add a lead">
        <ActionForm action={createLead} onDone={() => setOpen(false)} className="grid gap-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2"><label className="label" htmlFor="ln">Name</label><input id="ln" name="full_name" className="input" required /></div>
            <div><label className="label" htmlFor="lp">Mobile</label><input id="lp" name="phone" className="input num" required inputMode="tel" placeholder="98450 12345" /></div>
            <div><label className="label" htmlFor="le">Email</label><input id="le" name="email" type="email" className="input" /></div>
            <div><label className="label" htmlFor="ls">Source</label>
              <select id="ls" name="source" className="input" defaultValue="walk_in">
                {[['walk_in', 'Walk-in'], ['referral', 'Referral'], ['portal', 'Property portal'], ['social', 'Social media'], ['broker', 'Broker'], ['website', 'Website']].map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select></div>
            <div><label className="label" htmlFor="la">Owner</label>
              <select id="la" name="assigned_to" className="input">{people.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></div>
            <div><label className="label" htmlFor="bmin">Budget from (₹)</label><input id="bmin" name="budget_min" className="input num" inputMode="numeric" placeholder="2500000" /></div>
            <div><label className="label" htmlFor="bmax">Budget to (₹)</label><input id="bmax" name="budget_max" className="input num" inputMode="numeric" placeholder="3500000" /></div>
            <div><label className="label" htmlFor="sz">Plot size (sq ft)</label><input id="sz" name="preferred_size" className="input num" inputMode="numeric" placeholder="1200" /></div>
            <div><label className="label" htmlFor="fu">Next follow-up</label><input id="fu" name="next_follow_up_at" type="datetime-local" className="input" /></div>
            <div className="col-span-2"><label className="label" htmlFor="lm">Notes</label><textarea id="lm" name="message" className="input" rows={2} /></div>
          </div>
          <SubmitButton pendingText="Adding…">Add lead</SubmitButton>
        </ActionForm>
      </Sheet>
    </>
  );
}
