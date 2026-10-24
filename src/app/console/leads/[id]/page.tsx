import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, CalendarCheck, Mail, MessageCircle, Phone, PhoneCall, StickyNote } from 'lucide-react';
import { requireStaff } from '@/lib/auth';
import { dateTime, lakh, phone, ago } from '@/lib/format';
import { Avatar, Pill, Section } from '@/components/ui/bits';
import { ActionForm, SubmitButton } from '@/components/ui/action-form';
import { logLeadActivity, scheduleVisit, updateLead, updateVisit } from '../../actions';
import { StageStepper } from './stepper';
import { scoreLead } from '@/lib/ai/leads';
import { parseRequirements, rankPlots } from '@/lib/ai/match';
import { asLayout } from '@/lib/site';
import { LeadAssist } from '@/components/ai/lead-assist';
import { AISource } from '@/components/ai/bits';

const ICON = { note: StickyNote, call: PhoneCall, whatsapp: MessageCircle, email: Mail, site_visit: CalendarCheck, stage_change: ArrowLeft, enquiry: MessageCircle, system: StickyNote };

export default async function LeadPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, orgId, project } = await requireStaff();
  const { data: lead } = await supabase.from('leads').select('*').eq('id', id).maybeSingle();
  if (!lead) notFound();
  const [{ data: acts }, { data: visits }, { data: staff }, { data: plots }] = await Promise.all([
    supabase.from('lead_activities').select('*').eq('lead_id', id).order('created_at', { ascending: false }),
    supabase.from('site_visits').select('*').eq('lead_id', id).order('scheduled_at', { ascending: false }),
    supabase.from('organization_members').select('user_id, profiles(full_name)').eq('org_id', orgId),
    supabase.from('plots').select('id, plot_number, status, price, area_sqft, facing, is_corner, held_until, shape_path, dimensions').eq('project_id', project!.id).order('plot_number'),
  ]);
  const sc = scoreLead(lead, acts || [], visits || [], plots || []);
  const req = parseRequirements([lead.message, lead.preferred_facing?.replace('_', ' '), lead.preferred_size ? `${lead.preferred_size} sq ft` : '', ...(acts || []).filter((a) => a.type !== 'system' && a.type !== 'stage_change').slice(0, 6).map((a) => a.body)].filter(Boolean).join('. '),
    { budgetMin: lead.budget_min, budgetMax: lead.budget_max });
  const fits = rankPlots(plots || [], asLayout(project!.layout), req).filter((r) => r.fits).slice(0, 3);
  const people = (staff || []).map((m) => ({ id: m.user_id, name: (m.profiles as unknown as { full_name: string } | null)?.full_name || 'Staff' }));
  const interested = plots?.find((p) => p.id === lead.interested_plot_id);
  const localDT = (iso: string | null) => (iso ? new Date(new Date(iso).getTime() + 5.5 * 3600000).toISOString().slice(0, 16) : '');
  const wa = `https://wa.me/${lead.phone}?text=${encodeURIComponent(`Hi ${lead.full_name.split(' ')[0]}, this is from ${project?.name}. `)}`;

  return (
    <>
      <Link href="/console/leads" className="inline-flex w-fit items-center gap-1 text-[13px] text-ink-2 hover:text-ink"><ArrowLeft className="size-4" />Pipeline</Link>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <Avatar name={lead.full_name} size={56} />
          <div><h1 className="text-[26px] font-bold leading-tight">{lead.full_name}</h1>
            <div className="mt-0.5 flex flex-wrap items-center gap-2 text-[13.5px] text-ink-2"><span className="num">{phone(lead.phone)}</span>{lead.email && <span>· {lead.email}</span>}<span className="tag capitalize">{lead.source.replace('_', ' ')}</span><span>· added {ago(lead.created_at)}</span></div></div>
        </div>
        <div className="flex flex-wrap gap-2">
          <a href={`tel:+${lead.phone}`} className="btn btn-outline"><Phone className="size-4" />Call</a>
          <a href={wa} target="_blank" rel="noreferrer" className="btn btn-outline"><MessageCircle className="size-4" />WhatsApp</a>
        </div>
      </div>
      <StageStepper id={lead.id} stage={lead.stage} lostReason={lead.lost_reason} />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
        <Section title="Timeline">
          <ActionForm action={logLeadActivity} className="mb-4 grid gap-2 rounded-2xl border border-line p-3">
            <input type="hidden" name="lead_id" value={lead.id} />
            <textarea name="body" className="input" rows={2} placeholder="What happened? e.g. Called, shared price list, wants east facing" required />
            <div className="flex flex-wrap items-center gap-2">
              <select name="type" className="input !w-auto" aria-label="Activity type" defaultValue="call">
                <option value="call">Call</option><option value="whatsapp">WhatsApp</option><option value="email">Email</option><option value="note">Note</option>
              </select>
              <SubmitButton className="btn btn-primary btn-sm">Log it</SubmitButton>
            </div>
          </ActionForm>
          <ol className="relative grid gap-3 border-l-2 border-line pl-5">
            {(acts || []).map((a) => {
              const I = ICON[a.type as keyof typeof ICON] || StickyNote;
              return (
                <li key={a.id} className="relative">
                  <span className="absolute -left-[31px] top-0.5 grid size-5 place-items-center rounded-full border border-line bg-surface text-accent"><I className="size-3" /></span>
                  <div className="text-[12px] capitalize text-ink-3">{a.type.replace('_', ' ')} · {dateTime(a.created_at)}</div>
                  <div className="text-[13.5px]">{a.body}</div>
                </li>
              );
            })}
          </ol>
        </Section>

        <div className="grid content-start gap-6">
          <Section title="AI sales assistant" action={<AISource source="rules" />}>
            {sc.band !== 'closed' && (
              <div className="mb-4 grid gap-3">
                <div className="flex items-center gap-3">
                  <span className={'grid size-14 shrink-0 place-items-center rounded-2xl text-[20px] font-bold ' + (sc.band === 'hot' ? 'bg-[color-mix(in_srgb,var(--bad)_13%,transparent)] text-bad' : sc.band === 'warm' ? 'bg-[color-mix(in_srgb,var(--warn)_13%,transparent)] text-warn' : 'bg-surface-2 text-ink-3')}><span className="num">{sc.score}</span></span>
                  <div><div className="text-[12px] font-bold uppercase tracking-wide text-ink-3">{sc.band} lead · next best action</div>
                    <div className="font-semibold">{sc.action.label}</div><div className="text-[12.5px] text-ink-2">{sc.action.detail}</div></div>
                </div>
                <details className="text-[12.5px]"><summary className="cursor-pointer text-ink-3">Why this score</summary>
                  <ul className="mt-1.5 grid gap-0.5">{sc.points.map((p, i) => <li key={i} className="flex justify-between gap-2"><span className="text-ink-2">{p.label}</span><span className={'num font-semibold ' + (p.pts >= 0 ? 'text-good' : 'text-bad')}>{p.pts > 0 ? '+' : ''}{p.pts}</span></li>)}</ul>
                </details>
                {fits.length > 0 && (
                  <div><div className="mb-1 text-[12px] font-semibold text-ink-3">Plots that fit what they asked for</div>
                    <ul className="grid gap-1.5">{fits.map((f) => (
                      <li key={f.plot.id} className="flex items-start justify-between gap-2 rounded-xl border border-line p-2 text-[12.5px]">
                        <span><b>{f.plot.plot_number}</b> · {f.reasons.slice(0, 3).join(', ')}</span><span className="num shrink-0 font-semibold">{lakh(f.plot.price)}</span></li>
                    ))}</ul></div>
                )}
              </div>
            )}
            <LeadAssist leadId={lead.id} />
          </Section>
          <Section title="Site visits">
            <ul className="mb-3 grid gap-2">
              {(visits || []).map((v) => (
                <li key={v.id} className="rounded-xl border border-line p-3">
                  <div className="flex items-center justify-between gap-2"><span className="text-[13.5px] font-medium">{dateTime(v.scheduled_at)}</span><Pill status={v.status} /></div>
                  {v.feedback && <div className="mt-1 text-[12.5px] text-ink-2">{v.feedback}</div>}
                  {v.status === 'scheduled' && (
                    <ActionForm action={updateVisit} className="mt-2 flex flex-wrap gap-2" reset={false}>
                      <input type="hidden" name="id" value={v.id} />
                      <input name="feedback" className="input !w-48 !py-1.5 text-[13px]" placeholder="Feedback (optional)" />
                      <SubmitButton className="btn btn-primary btn-sm" name="status" value="completed">Visited</SubmitButton>
                      <SubmitButton className="btn btn-ghost btn-sm" name="status" value="no_show">No show</SubmitButton>
                    </ActionForm>
                  )}
                </li>
              ))}
            </ul>
            <ActionForm action={scheduleVisit} className="flex flex-wrap items-end gap-2">
              <input type="hidden" name="lead_id" value={lead.id} />
              <div><label className="label" htmlFor="sv">New visit</label><input id="sv" name="scheduled_at" type="datetime-local" className="input" required /></div>
              <SubmitButton className="btn btn-outline">Schedule</SubmitButton>
            </ActionForm>
          </Section>

          <Section title="Requirements">
            <ActionForm action={updateLead} reset={false} className="grid grid-cols-2 gap-3">
              <input type="hidden" name="id" value={lead.id} />
              <div><label className="label" htmlFor="b1">Budget from</label><input id="b1" name="budget_min" className="input num" defaultValue={lead.budget_min ?? ''} /></div>
              <div><label className="label" htmlFor="b2">Budget to</label><input id="b2" name="budget_max" className="input num" defaultValue={lead.budget_max ?? ''} /></div>
              <div><label className="label" htmlFor="ps">Size (sq ft)</label><input id="ps" name="preferred_size" className="input num" defaultValue={lead.preferred_size ?? ''} /></div>
              <div><label className="label" htmlFor="pf">Facing</label>
                <select id="pf" name="preferred_facing" className="input" defaultValue={lead.preferred_facing ?? ''}><option value="">Any</option>{['east', 'west', 'north', 'south'].map((f) => <option key={f} value={f}>{f[0]!.toUpperCase() + f.slice(1)}</option>)}</select></div>
              <div className="col-span-2"><label className="label" htmlFor="ip">Interested in</label>
                <select id="ip" name="interested_plot_id" className="input" defaultValue={lead.interested_plot_id ?? ''}><option value="">No plot yet</option>
                  {(plots || []).map((p) => <option key={p.id} value={p.id} disabled={p.status !== 'available' && p.id !== lead.interested_plot_id}>{p.plot_number} · {lakh(p.price)} · {p.status}</option>)}</select></div>
              <div><label className="label" htmlFor="ow">Owner</label>
                <select id="ow" name="assigned_to" className="input" defaultValue={lead.assigned_to ?? ''}>{people.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></div>
              <div><label className="label" htmlFor="nf">Next follow-up</label><input id="nf" name="next_follow_up_at" type="datetime-local" className="input" defaultValue={localDT(lead.next_follow_up_at)} /></div>
              <div className="col-span-2"><label className="label" htmlFor="em">Email</label><input id="em" name="email" type="email" className="input" defaultValue={lead.email ?? ''} /></div>
              <SubmitButton className="btn btn-primary col-span-2">Save</SubmitButton>
            </ActionForm>
            {interested && <Link href={`/plots/${interested.id}`} target="_blank" className="btn btn-ghost btn-sm mt-3">See plot {interested.plot_number} as the buyer does</Link>}
          </Section>
        </div>
      </div>
    </>
  );
}
