import { requireUser } from '@/lib/auth';
import { date, dateTime, qty, time, todayIST } from '@/lib/format';
import { MILESTONES } from '@/lib/site';
import { Empty, Pill, Section } from '@/components/ui/bits';
import { ProgressBar } from '@/components/ui/motion';
import { ActionForm, SubmitButton } from '@/components/ui/action-form';
import { UsageBars } from '@/components/console/usage-bars';
import { contractorProgress, contractorRequest, contractorUsage, vendorDelivery } from './actions';
import { CheckIn } from './check-in';
import { rollup, STATE_LABEL, wpHealth } from '@/lib/ai/plan';
import { ReportText, SCurve, STATE_COLOR, AISource, CurveLegend } from '@/components/ai/bits';

export default async function Portal() {
  const { supabase, profile, user } = await requireUser('/portal');

  if (profile.role === 'employee') {
    const { data: me } = await supabase.from('employees').select('*').eq('user_id', user.id).maybeSingle();
    if (!me) return <Empty title="Not linked yet">Ask your supervisor to link this login to your employee record.</Empty>;
    const [{ data: project }, { data: att }] = await Promise.all([
      me.project_id ? supabase.from('projects').select('name, site_lat, site_lng, geofence_m, org_id').eq('id', me.project_id).single() : Promise.resolve({ data: null }),
      supabase.from('attendance').select('*').eq('employee_id', me.id).order('work_date', { ascending: false }).limit(14),
    ]);
    const today = (att || []).find((a) => a.work_date === todayIST()) || null;
    return (
      <>
        <div><div className="eyebrow">{me.employee_code} · {me.role_title}</div><h1 className="text-[26px] font-bold">Hi {me.full_name.split(' ')[0]}</h1><p className="text-[13.5px] text-ink-2">{project?.name}</p></div>
        <CheckIn orgId={me.org_id} userId={user.id} today={today ? { in: today.check_in_at, out: today.check_out_at, inside: today.inside_geofence, distance: today.distance_m } : null}
          site={project?.site_lat ? { lat: project.site_lat, lng: project.site_lng!, radius: project.geofence_m } : null} />
        <Section title="My attendance">
          <ul className="divide-y divide-line">
            {(att || []).map((a) => (
              <li key={a.id} className="flex items-center justify-between gap-3 py-2.5 text-[13.5px]">
                <span className="whitespace-nowrap">{date(a.work_date)}</span>
                <span className="num text-ink-2">{time(a.check_in_at)} – {a.check_out_at ? time(a.check_out_at) : '…'}</span>
                <Pill status={a.inside_geofence === false ? 'outside' : 'present'} tone={a.inside_geofence === false ? 'bad' : 'good'} label={a.inside_geofence === false ? 'Outside site' : 'At site'} />
              </li>
            ))}
          </ul>
        </Section>
      </>
    );
  }

  if (profile.role === 'vendor') {
    const { data: vid } = await supabase.rpc('my_vendor_id');
    if (!vid) return <Empty title="Not linked yet">Ask the developer to link this login to your company.</Empty>;
    const [{ data: v }, { data: dels }, { data: mats }, { data: notes }] = await Promise.all([
      supabase.from('vendors').select('*').eq('id', vid).single(),
      supabase.from('deliveries').select('*, materials(name, unit)').eq('vendor_id', vid).order('delivered_at', { ascending: false }).limit(20),
      supabase.from('materials').select('id, name, unit'),
      supabase.from('notifications').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(5),
    ]);
    return (
      <>
        <div><div className="eyebrow">Vendor</div><h1 className="text-[26px] font-bold">{v!.company_name}</h1></div>
        <Section title="Record a delivery">
          <ActionForm action={vendorDelivery} className="grid grid-cols-2 gap-3">
            <div className="col-span-2"><label className="label" htmlFor="m">Material</label><select id="m" name="material_id" className="input">{(mats || []).map((m) => <option key={m.id} value={m.id}>{m.name} ({m.unit})</option>)}</select></div>
            <div><label className="label" htmlFor="q">Quantity delivered</label><input id="q" name="quantity" className="input num" inputMode="decimal" required /></div>
            <div><label className="label" htmlFor="vh">Vehicle number</label><input id="vh" name="vehicle_number" className="input num" placeholder="KA 01 AB 1234" /></div>
            <div><label className="label" htmlFor="inv">Invoice number</label><input id="inv" name="invoice_number" className="input num" placeholder="INV-10234" /></div>
            <div><label className="label" htmlFor="loc">Delivered to</label><input id="loc" name="location" className="input" placeholder="Tower A store" /></div>
            <div><label className="label" htmlFor="vinv">Invoice photo</label><input id="vinv" type="file" name="invoice" accept="image/*" capture="environment" className="input" /></div>
            <div><label className="label" htmlFor="vtruck">Truck / load photo</label><input id="vtruck" type="file" name="photo" accept="image/*" capture="environment" className="input" /></div>
            <p className="col-span-2 text-[12px] text-ink-3">A clear, flat photo of the full invoice speeds up inspection and payment.</p>
            <SubmitButton className="btn btn-primary btn-lg col-span-2">Submit delivery</SubmitButton>
          </ActionForm>
        </Section>
        {(notes || []).length > 0 && <Section title="Updates from the developer"><ul className="grid gap-2">{notes!.map((n) => <li key={n.id} className="text-[13.5px]"><b>{n.title}</b> — {n.body}</li>)}</ul></Section>}
        <Section title="My deliveries">
          <ul className="divide-y divide-line">
            {(dels || []).map((d) => { const m = d.materials as unknown as { name: string; unit: string }; return (
              <li key={d.id} className="flex items-center justify-between gap-3 py-3 text-[13.5px]">
                <div><div className="font-medium">{qty(d.quantity)} {m.unit} {m.name}</div><div className="text-[12px] text-ink-3">{dateTime(d.delivered_at)} · {d.invoice_number}</div>
                  {d.accepted_qty != null && <div className="text-[12px] text-ink-2">Accepted {qty(d.accepted_qty)}{d.inspection_note ? ` · ${d.inspection_note}` : ''}</div>}</div>
                <Pill status={d.status} />
              </li>
            ); })}
          </ul>
        </Section>
      </>
    );
  }

  // contractor
  const { data: cid } = await supabase.rpc('my_contractor_id');
  if (!cid) return <Empty title="Not linked yet">Ask the developer to link this login to your company.</Empty>;
  const [{ data: c }, { data: wps }, { data: usage }, { data: reqs }, { data: mats }, { data: milestones }, { data: crew }, { data: att }, { data: reports }] = await Promise.all([
    supabase.from('contractors').select('*').eq('id', cid).single(),
    supabase.from('work_packages').select('*').eq('contractor_id', cid).order('due_date'),
    supabase.from('contractor_material_usage').select('*').eq('contractor_id', cid),
    supabase.from('material_requests').select('*, materials(name, unit)').eq('contractor_id', cid).order('created_at', { ascending: false }).limit(10),
    supabase.from('materials').select('id, name, unit').order('name'),
    supabase.from('milestones').select('id, key, name'),
    supabase.from('employees').select('id, full_name, employee_code').eq('contractor_id', cid).eq('active', true),
    supabase.from('attendance').select('employee_id, check_in_at, inside_geofence').eq('work_date', todayIST()),
    supabase.from('ai_insights').select('id, kind, title, body, source, created_at').eq('scope', 'contractor').eq('subject_id', cid).eq('shared_with_contractor', true).order('created_at', { ascending: false }).limit(6),
  ]);
  const wpIds = (wps || []).map((w) => w.id);
  const [{ data: points }, { data: plog }] = wpIds.length ? await Promise.all([
    supabase.from('wp_plan_points').select('work_package_id, planned_date, planned_pct').in('work_package_id', wpIds).order('planned_date'),
    supabase.from('wp_progress_log').select('work_package_id, progress, logged_at').in('work_package_id', wpIds).order('logged_at'),
  ]) : [{ data: [] }, { data: [] }];
  const today = todayIST();
  const health = (wps || []).map((w) => wpHealth(w, (points || []).filter((p) => p.work_package_id === w.id), (plog || []).filter((l) => l.work_package_id === w.id), today));
  const roll = rollup(health);
  const latest = (reports || []).find((r) => r.kind === 'weekly_report');
  const ms = Object.fromEntries((milestones || []).map((m) => [m.id, m]));
  const rows = (usage || []).map((x) => ({ material_id: x.material_id!, name: x.name!, unit: x.unit!, issued: Number(x.issued), consumed: Number(x.consumed), wastage: Number(x.wastage), returned: Number(x.returned), at_site: Number(x.at_site), unit_cost: Number(x.unit_cost || 0) }));
  const projectId = wps?.[0]?.project_id;
  const here = new Set((att || []).map((a) => a.employee_id));
  return (
    <>
      <div><div className="eyebrow">Contractor</div><h1 className="text-[26px] font-bold">{c!.company_name}</h1><p className="text-[13.5px] text-ink-2">{(crew || []).filter((e) => here.has(e.id)).length} of {(crew || []).length} crew on site today</p></div>
      <div id="reports" className="grid gap-3 sm:grid-cols-3">
        <div className="card px-4 py-3"><div className="eyebrow">Done</div><div className="num text-[22px] font-semibold">{Math.round(roll.actual)}%</div></div>
        <div className="card px-4 py-3"><div className="eyebrow">Planned by today</div><div className="num text-[22px] font-semibold">{Math.round(roll.planned)}%</div></div>
        <div className="card px-4 py-3"><div className="eyebrow">Status</div><div className="text-[18px] font-semibold" style={{ color: STATE_COLOR[roll.state] }}>{STATE_LABEL[roll.state]}</div></div>
      </div>
      {latest && (
        <Section title={latest.title} action={<span className="flex items-center gap-2 text-[12px] text-ink-3"><AISource source={latest.source} />{date(latest.created_at)}</span>}>
          {latest.body && <ReportText text={latest.body} />}
        </Section>
      )}
      {(reports || []).filter((r) => r.kind !== 'weekly_report').length > 0 && (
        <Section title="Notes from the developer">
          <ul className="grid gap-2">{reports!.filter((r) => r.kind !== 'weekly_report').map((r) => <li key={r.id} className="rounded-xl border border-line p-3 text-[13.5px]"><b>{r.title}</b>{r.body && <div className="mt-0.5 text-ink-2">{r.body}</div>}</li>)}</ul>
        </Section>
      )}
      <Section title="My work">
        <div className="grid gap-4">
          {(wps || []).map((w) => { const m = w.milestone_id ? ms[w.milestone_id] : null; const color = MILESTONES.find((x) => x.key === m?.key)?.color || 'var(--accent)'; const h = health.find((x) => x.id === w.id)!; return (
            <div key={w.id} className="rounded-2xl border border-line p-4">
              <div className="flex items-start justify-between gap-2"><div><div className="font-semibold">{w.title}</div><div className="text-[12px] text-ink-3">Due {date(w.due_date)}{h.state !== 'done' && h.forecast ? ` · at this pace ${date(h.forecast)}` : ''}</div></div>
                <span className="rounded-full px-2 py-0.5 text-[11.5px] font-bold" style={{ color: STATE_COLOR[h.state], background: `color-mix(in srgb, ${STATE_COLOR[h.state]} 13%, transparent)` }}>{STATE_LABEL[h.state]}</span></div>
              <div className="mt-2 flex items-center gap-3"><ProgressBar value={Number(w.progress)} color={color} /><span className="num text-[13px] font-semibold">{Math.round(Number(w.progress))}%</span><span className="num whitespace-nowrap text-[12px] text-ink-3">plan {Math.round(h.planned)}%</span></div>
              {h.state !== 'done' && <details className="mt-2"><summary className="cursor-pointer text-[12.5px] text-ink-3">Plan vs actual chart</summary><div className="mt-2"><SCurve planned={h.curve.planned} actual={h.curve.actual} today={today} forecast={h.forecast} due={h.due} height={130} /><CurveLegend /></div></details>}
              {w.status !== 'completed' && (
                <ActionForm action={contractorProgress} reset={false} className="mt-3 flex flex-wrap items-end gap-2">
                  <input type="hidden" name="id" value={w.id} />
                  <div><label className="label" htmlFor={`p-${w.id}`}>Now at %</label><input id={`p-${w.id}`} name="progress" type="number" min={0} max={100} defaultValue={Math.round(Number(w.progress))} className="input num !w-24" /></div>
                  <div className="min-w-[160px] flex-1"><label className="label" htmlFor={`n-${w.id}`}>What was done</label><input id={`n-${w.id}`} name="note" className="input" /></div>
                  <SubmitButton className="btn btn-primary">Update</SubmitButton>
                </ActionForm>
              )}
            </div>
          ); })}
        </div>
      </Section>
      <Section title="Request material">
        <ActionForm action={contractorRequest} className="grid grid-cols-2 gap-3">
          <div className="col-span-2"><label className="label" htmlFor="rm">Material</label><select id="rm" name="material_id" className="input">{(mats || []).map((m) => <option key={m.id} value={m.id}>{m.name} ({m.unit})</option>)}</select></div>
          <div><label className="label" htmlFor="rq">Quantity</label><input id="rq" name="quantity" className="input num" inputMode="decimal" required /></div>
          <div><label className="label" htmlFor="rd">Needed by</label><input id="rd" name="needed_by" type="date" className="input" /></div>
          <div><label className="label" htmlFor="rw">For work</label><select id="rw" name="work_package_id" className="input"><option value="">—</option>{(wps || []).map((w) => <option key={w.id} value={w.id}>{w.title}</option>)}</select></div>
          <div><label className="label" htmlFor="rl">Location</label><input id="rl" name="location" className="input" placeholder="Tower A" /></div>
          <div className="col-span-2"><label className="label" htmlFor="rp">Purpose</label><input id="rp" name="purpose" className="input" placeholder="Foundation work" /></div>
          <SubmitButton className="btn btn-primary btn-lg col-span-2">Send request</SubmitButton>
        </ActionForm>
        {(reqs || []).length > 0 && (
          <ul className="mt-4 divide-y divide-line border-t border-line">
            {reqs!.map((r) => { const m = r.materials as unknown as { name: string; unit: string }; return (
              <li key={r.id} className="flex items-center justify-between gap-3 py-2.5 text-[13.5px]"><span><span className="num text-ink-3">MR-{String(r.seq).padStart(4, '0')}</span> · {qty(r.quantity)} {m.unit} {m.name}</span><Pill status={r.status} /></li>
            ); })}
          </ul>
        )}
      </Section>
      <Section title="Material at my site">
        {rows.length === 0 ? <p className="text-[13.5px] text-ink-2">Nothing issued to you yet.</p> : (
          <>
            <UsageBars rows={rows} />
            {projectId && (
              <ActionForm action={contractorUsage} className="mt-5 grid grid-cols-2 gap-3 border-t border-line pt-4">
                <input type="hidden" name="project_id" value={projectId} />
                <div className="col-span-2"><label className="label" htmlFor="um">Log today’s use</label><select id="um" name="material_id" className="input">{rows.filter((r) => r.at_site > 0).map((r) => <option key={r.material_id} value={r.material_id}>{r.name} ({qty(r.at_site)} {r.unit} with you)</option>)}</select></div>
                <div><label className="label" htmlFor="uc">Used</label><input id="uc" name="consumed" className="input num" inputMode="decimal" /></div>
                <div><label className="label" htmlFor="uw">Wasted</label><input id="uw" name="wastage" className="input num" inputMode="decimal" /></div>
                <div className="col-span-2"><label className="label" htmlFor="un">Where</label><input id="un" name="note" className="input" /></div>
                <SubmitButton className="btn btn-outline col-span-2">Record usage</SubmitButton>
              </ActionForm>
            )}
          </>
        )}
      </Section>
    </>
  );
}
