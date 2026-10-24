import Link from 'next/link';
import { notFound } from 'next/navigation';
import { AlertTriangle, ArrowLeft, Mail, Phone, Star } from 'lucide-react';
import { requireStaff } from '@/lib/auth';
import { date, inr, lakh, qty, time, todayIST } from '@/lib/format';
import { contractorSummary, WASTE_LIMIT } from '@/lib/contractor-stats';
import { MILESTONES } from '@/lib/site';
import { Avatar, Empty, Pill, Section } from '@/components/ui/bits';
import { ProgressBar, ProgressRing } from '@/components/ui/motion';
import { Tabs } from '@/components/ui/tabs';
import { ActionForm, SubmitButton } from '@/components/ui/action-form';
import { UsageBars } from '@/components/console/usage-bars';
import { RequestActions } from '../../materials/request-actions';
import { createWorkPackage, linkLogin, recordUsage, updateProgress } from '../../actions';
import type { ContractorUsage } from '@/lib/types';
import { materialVsPlan, rollup, STATE_LABEL, wpHealth } from '@/lib/ai/plan';
import { AISource, CurveLegend, SCurve, STATE_COLOR } from '@/components/ai/bits';
import { BudgetEditor, PlanEditor } from '@/components/ai/plan-editor';
import { InsightCard, type InsightView } from '@/components/ai/insight-card';

export default async function ContractorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, project } = await requireStaff();
  const { data: c } = await supabase.from('contractors').select('*').eq('id', id).maybeSingle();
  if (!c) notFound();
  const [{ data: wps }, { data: usage }, { data: reqs }, { data: crew }, { data: att }, { data: milestones }, { data: stock }, { data: moves }, { data: allMaterials }, { data: insights }] = await Promise.all([
    supabase.from('work_packages').select('*').eq('contractor_id', id).order('due_date'),
    supabase.from('contractor_material_usage').select('*').eq('contractor_id', id),
    supabase.from('material_requests').select('*, materials(name, unit)').eq('contractor_id', id).order('created_at', { ascending: false }).limit(20),
    supabase.from('employees').select('*').eq('contractor_id', id).eq('active', true).order('employee_code'),
    supabase.from('attendance').select('employee_id, check_in_at, inside_geofence').eq('work_date', todayIST()),
    supabase.from('milestones').select('id, key, name').eq('project_id', project!.id),
    supabase.from('material_stock').select('material_id, in_store').eq('project_id', project!.id),
    supabase.from('stock_movements').select('id, type, quantity, created_at, note, materials(name, unit)').eq('contractor_id', id).order('created_at', { ascending: false }).limit(25),
    supabase.from('materials').select('id, name, unit').eq('org_id', c.org_id).order('name'),
    supabase.from('ai_insights').select('*').eq('scope', 'contractor').eq('subject_id', id).eq('status', 'open').order('created_at', { ascending: false }),
  ]);
  const wpIds = (wps || []).map((w) => w.id);
  const [{ data: points }, { data: plog }, { data: budgets }] = wpIds.length ? await Promise.all([
    supabase.from('wp_plan_points').select('work_package_id, planned_date, planned_pct').in('work_package_id', wpIds).order('planned_date'),
    supabase.from('wp_progress_log').select('work_package_id, progress, logged_at').in('work_package_id', wpIds).order('logged_at'),
    supabase.from('wp_material_budget').select('work_package_id, material_id, planned_qty').in('work_package_id', wpIds),
  ]) : [{ data: [] }, { data: [] }, { data: [] }];
  const today = todayIST();
  const health = (wps || []).map((w) => wpHealth(w, (points || []).filter((p) => p.work_package_id === w.id), (plog || []).filter((l) => l.work_package_id === w.id), today));
  const roll = rollup(health);
  const mvp = materialVsPlan(health, budgets || [], (usage || []) as never);
  const report = (insights || []).find((i) => i.kind === 'weekly_report') as unknown as InsightView | undefined;
  const otherInsights = (insights || []).filter((i) => i.kind !== 'weekly_report') as unknown as InsightView[];
  const u = (usage || []) as ContractorUsage[];
  const s = contractorSummary(wps || [], u);
  const inStore = Object.fromEntries((stock || []).map((x) => [x.material_id, Number(x.in_store)]));
  const here = new Map((att || []).map((a) => [a.employee_id, a]));
  const rows = u.map((x) => ({ material_id: x.material_id!, name: x.name!, unit: x.unit!, issued: Number(x.issued), consumed: Number(x.consumed), wastage: Number(x.wastage), returned: Number(x.returned), at_site: Number(x.at_site), unit_cost: Number(x.unit_cost || 0) }));
  const ms = Object.fromEntries((milestones || []).map((m) => [m.id, m]));
  const overLimit = rows.map((r) => ({ ...r, pct: r.consumed + r.wastage > 0 ? (r.wastage / (r.consumed + r.wastage)) * 100 : 0 })).filter((r) => r.pct > WASTE_LIMIT);

  const work = (
    <div className="grid gap-4">
      {(wps || []).length === 0 && <Empty title="No work packages yet" />}
      {(wps || []).map((w) => {
        const m = w.milestone_id ? ms[w.milestone_id] : null;
        const color = MILESTONES.find((x) => x.key === m?.key)?.color || 'var(--accent)';
        return (
          <div key={w.id} className="card grid gap-3 p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div><div className="font-semibold">{w.title}</div>
                <div className="text-[12.5px] text-ink-3">{m && <span className="mr-2 font-medium" style={{ color }}>{m.name}</span>}{lakh(w.contract_value)} · {date(w.start_date)} → {date(w.due_date)}</div></div>
              <Pill status={w.status} />
            </div>
            <div className="flex items-center gap-3"><ProgressBar value={Number(w.progress)} color={color} /><span className="num w-11 text-right text-[13px] font-semibold">{Math.round(Number(w.progress))}%</span></div>
            {w.status !== 'completed' && (
              <ActionForm action={updateProgress} reset={false} className="flex flex-wrap items-end gap-2">
                <input type="hidden" name="id" value={w.id} />
                <div><label className="label" htmlFor={`p-${w.id}`}>Progress %</label><input id={`p-${w.id}`} name="progress" type="number" min={0} max={100} defaultValue={Math.round(Number(w.progress))} className="input num !w-24" /></div>
                <div className="min-w-[200px] flex-1"><label className="label" htmlFor={`n-${w.id}`}>Note</label><input id={`n-${w.id}`} name="note" className="input" placeholder="What was done" /></div>
                <SubmitButton className="btn btn-outline">Save</SubmitButton>
              </ActionForm>
            )}
          </div>
        );
      })}
      <details className="card p-5">
        <summary className="cursor-pointer font-semibold">Add a work package</summary>
        <ActionForm action={createWorkPackage} className="mt-4 grid gap-3 sm:grid-cols-2">
          <input type="hidden" name="contractor_id" value={c.id} />
          <div className="sm:col-span-2"><label className="label" htmlFor="wt">Title</label><input id="wt" name="title" className="input" required placeholder="Asphalt for 30 ft roads" /></div>
          <div><label className="label" htmlFor="wm">Milestone</label><select id="wm" name="milestone_id" className="input"><option value="">None</option>{(milestones || []).map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}</select></div>
          <div><label className="label" htmlFor="wv">Contract value (₹)</label><input id="wv" name="contract_value" className="input num" /></div>
          <div><label className="label" htmlFor="ws">Start</label><input id="ws" name="start_date" type="date" className="input" /></div>
          <div><label className="label" htmlFor="wd">Due</label><input id="wd" name="due_date" type="date" className="input" /></div>
          <SubmitButton className="btn btn-primary sm:col-span-2">Add work package</SubmitButton>
        </ActionForm>
      </details>
    </div>
  );


  const plan = (
    <div className="grid gap-5">
      <div className="grid gap-3 sm:grid-cols-4">
        {[['Done', `${Math.round(roll.actual)}%`, ''], ['Planned by today', `${Math.round(roll.planned)}%`, ''], ['Schedule index', roll.spi != null ? roll.spi.toFixed(2) : '—', roll.spi != null && roll.spi < 0.9 ? 'text-bad' : 'text-good'], ['Status', STATE_LABEL[roll.state], '']].map(([l, v, cl]) => (
          <div key={l} className="card px-4 py-3"><div className="eyebrow">{l}</div><div className={'num text-[19px] font-semibold ' + cl} style={l === 'Status' ? { color: STATE_COLOR[roll.state] } : undefined}>{v}</div></div>
        ))}
      </div>
      {report && <InsightCard i={report} compact />}
      {otherInsights.map((i) => <InsightCard key={i.id} i={i} compact />)}
      {health.map((h) => {
        const w = (wps || []).find((x) => x.id === h.id)!;
        const pts = (points || []).filter((p) => p.work_package_id === w.id).map((p) => ({ planned_date: p.planned_date, planned_pct: Number(p.planned_pct) }));
        const b = (budgets || []).filter((x) => x.work_package_id === w.id).map((x) => ({ material_id: x.material_id, planned_qty: Number(x.planned_qty) }));
        const need = h.due && h.state !== 'done' ? Math.max(0, (100 - h.actual) / Math.max(1, (new Date(h.due).getTime() - new Date(today).getTime()) / 86400000)) * 7 : null;
        return (
          <div key={h.id} className="card grid gap-4 p-5 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
            <div className="grid content-start gap-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div><div className="font-semibold">{h.title}</div><div className="text-[12.5px] text-ink-3">{date(w.start_date)} → {date(w.due_date)}{!pts.length && ' · default S-curve (no baseline)'}</div></div>
                <span className="rounded-full px-2.5 py-0.5 text-[12px] font-bold" style={{ color: STATE_COLOR[h.state], background: `color-mix(in srgb, ${STATE_COLOR[h.state]} 13%, transparent)` }}>{STATE_LABEL[h.state]}</span>
              </div>
              <SCurve planned={h.curve.planned} actual={h.curve.actual} today={today} forecast={h.forecast} due={h.due} />
              <CurveLegend />
              <dl className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-[13px] sm:grid-cols-4">
                <div><dt className="text-ink-3">Actual / plan</dt><dd className="num font-semibold">{Math.round(h.actual)}% / {Math.round(h.planned)}%</dd></div>
                <div><dt className="text-ink-3">Pace</dt><dd className="num font-semibold">{(h.velocity * 7).toFixed(1)} pts/week</dd></div>
                <div><dt className="text-ink-3">Needed</dt><dd className="num font-semibold">{need != null ? `${need.toFixed(1)} pts/week` : '—'}</dd></div>
                <div><dt className="text-ink-3">Forecast finish</dt><dd className={'num font-semibold ' + ((h.daysLate ?? 0) > 7 ? 'text-bad' : '')}>{h.state === 'done' ? 'Done' : h.forecast ? date(h.forecast) : 'stalled'}</dd></div>
                {h.plannedQty != null && <div className="col-span-2"><dt className="text-ink-3">Quantity done</dt><dd className="num font-semibold">{(h.doneQty ?? 0).toLocaleString('en-IN')} of {h.plannedQty.toLocaleString('en-IN')} {h.qtyUnit}</dd></div>}
              </dl>
            </div>
            <div className="grid content-start gap-4">
              <details className="rounded-2xl border border-line p-3" open={!pts.length && h.state !== 'done'}>
                <summary className="cursor-pointer text-[13.5px] font-semibold">Baseline plan {pts.length ? `(${pts.length} points)` : ''}</summary>
                <div className="mt-3"><PlanEditor wpId={w.id} points={pts} plannedQty={w.planned_qty != null ? Number(w.planned_qty) : null} qtyUnit={w.qty_unit} /></div>
              </details>
              <details className="rounded-2xl border border-line p-3">
                <summary className="cursor-pointer text-[13.5px] font-semibold">Material budget {b.length ? `(${b.length})` : ''}</summary>
                <div className="mt-3"><BudgetEditor wpId={w.id} materials={allMaterials || []} budgets={b} /></div>
              </details>
            </div>
          </div>
        );
      })}
      {mvp.length > 0 && (
        <Section title="Material used vs what the work done needs" action={<AISource source="rules" />}>
          <div className="scroll-x"><table className="table min-w-[560px]">
            <thead><tr><th>Material</th><th className="r">Used</th><th className="r">Plan for work done</th><th className="r">Difference</th><th className="r">Extra cost</th></tr></thead>
            <tbody>{mvp.map((m) => (
              <tr key={m.materialId}><td>{m.name}</td><td className="r num">{qty(m.used)} {m.unit}</td><td className="r num">{qty(m.expected)} {m.unit}</td>
                <td className={'r num font-semibold ' + (m.overrunPct > 8 ? 'text-bad' : m.overrunPct < -8 ? 'text-warn' : 'text-good')}>{m.overrunPct > 0 ? '+' : ''}{m.overrunPct}%</td>
                <td className="r num">{m.extraCost ? inr(m.extraCost) : '—'}</td></tr>
            ))}</tbody>
          </table></div>
          <p className="mt-2 text-[12px] text-ink-3">Plan for work done = material budget × progress. Using much less than planned can also mean progress was over-reported.</p>
        </Section>
      )}
    </div>
  );

  const materials = (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
      <Section title="Material issued vs used">
        {rows.length === 0 ? <p className="text-[13.5px] text-ink-2">Nothing issued yet.</p> : <UsageBars rows={rows} limit={WASTE_LIMIT} />}
      </Section>
      <div className="grid content-start gap-6">
        <Section title="Record site usage">
          {rows.length === 0 ? <p className="text-[13.5px] text-ink-2">Issue material first.</p> : (
            <ActionForm action={recordUsage} className="grid gap-3">
              <input type="hidden" name="contractor_id" value={c.id} />
              <div><label className="label" htmlFor="um">Material</label>
                <select id="um" name="material_id" className="input">{rows.filter((r) => r.at_site > 0).map((r) => <option key={r.material_id} value={r.material_id}>{r.name} ({qty(r.at_site)} {r.unit} at site)</option>)}</select></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="label" htmlFor="uc">Used</label><input id="uc" name="consumed" className="input num" inputMode="decimal" /></div>
                <div><label className="label" htmlFor="uw">Wasted</label><input id="uw" name="wastage" className="input num" inputMode="decimal" /></div>
              </div>
              <div><label className="label" htmlFor="un">Where / what</label><input id="un" name="note" className="input" placeholder="Drain walls, Block C" /></div>
              <SubmitButton>Record usage</SubmitButton>
            </ActionForm>
          )}
        </Section>
        <Section title="Ledger for this contractor">
          <ul className="max-h-72 divide-y divide-line overflow-y-auto text-[13px]">
            {(moves || []).map((m) => { const mat = m.materials as unknown as { name: string; unit: string }; return (
              <li key={m.id} className="flex items-center justify-between gap-2 py-2"><span><Pill status={m.type} tone={m.type === 'wastage' ? 'bad' : m.type === 'issued' ? 'info' : m.type === 'consumed' ? 'good' : 'muted'} /> <span className="ml-1">{mat.name}</span></span>
                <span className="num text-ink-2">{qty(m.quantity)} {mat.unit} · {date(m.created_at)}</span></li>
            ); })}
          </ul>
        </Section>
      </div>
    </div>
  );

  const requests = (
    <div className="card scroll-x">
      {(reqs || []).length === 0 ? <div className="p-5"><Empty title="No material requests" /></div> : (
        <table className="table min-w-[760px]">
          <thead><tr><th>Request</th><th>Material</th><th className="r">Qty</th><th className="r">In store</th><th>For</th><th>Status</th><th /></tr></thead>
          <tbody>{reqs!.map((r) => { const mat = r.materials as unknown as { name: string; unit: string }; const short = (inStore[r.material_id] ?? 0) < Number(r.quantity); return (
            <tr key={r.id}>
              <td className="num">MR-{String(r.seq).padStart(4, '0')}<div className="text-[11.5px] text-ink-3">{date(r.created_at)}</div></td>
              <td>{mat.name}</td><td className="r num">{qty(r.quantity)} {mat.unit}</td>
              <td className={'r num ' + (short && r.status !== 'issued' ? 'font-semibold text-bad' : 'text-ink-2')}>{qty(inStore[r.material_id] ?? 0)}</td>
              <td className="max-w-[220px] text-ink-2">{r.purpose}{r.needed_by ? ` · by ${date(r.needed_by)}` : ''}</td>
              <td><Pill status={r.status} /></td>
              <td className="r">{['requested', 'approved'].includes(r.status) && <RequestActions id={r.id} status={r.status} short={short} />}</td>
            </tr>); })}</tbody>
        </table>
      )}
    </div>
  );

  const team = (
    <div className="grid gap-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {(crew || []).map((e) => { const a = here.get(e.id); return (
          <div key={e.id} className="card flex items-center gap-3 p-4">
            <Avatar name={e.full_name} size={40} />
            <div className="min-w-0 flex-1"><div className="truncate font-semibold">{e.full_name}</div><div className="text-[12px] text-ink-3">{e.employee_code} · {e.role_title}</div></div>
            {a ? <span className={'text-right text-[12px] font-semibold ' + (a.inside_geofence === false ? 'text-bad' : 'text-good')}>{a.inside_geofence === false ? 'Outside site' : 'On site'}<div className="num font-normal text-ink-3">{time(a.check_in_at)}</div></span>
              : <span className="text-[12px] text-ink-3">Not in</span>}
          </div>
        ); })}
      </div>
      {(crew || []).length === 0 && <Empty title="No crew linked" href="/console/employees" cta="Add employees" />}
    </div>
  );

  return (
    <>
      <Link href="/console/contractors" className="inline-flex w-fit items-center gap-1 text-[13px] text-ink-2 hover:text-ink"><ArrowLeft className="size-4" />Contractors</Link>
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
        <div className="flex items-center gap-4">
          <ProgressRing value={s.progress} size={78} stroke={7} />
          <div>
            <div className="eyebrow capitalize">{c.trade} · {c.contract_type.replace('_', ' ')}</div>
            <h1 className="text-[28px] font-bold leading-tight">{c.company_name}</h1>
            <div className="mt-1 flex flex-wrap items-center gap-3 text-[13px] text-ink-2">
              {c.contact_person && <span>{c.contact_person}</span>}
              {c.phone && <a className="inline-flex items-center gap-1 hover:text-accent" href={`tel:${c.phone.replace(/\s/g, '')}`}><Phone className="size-3.5" />{c.phone}</a>}
              {c.email && <span className="inline-flex items-center gap-1"><Mail className="size-3.5" />{c.email}</span>}
              {c.rating && <span className="inline-flex items-center gap-1"><Star className="size-3.5 fill-held text-held" />{Number(c.rating).toFixed(1)}</span>}
              {c.gst_number && <span className="num text-[12px]">GST {c.gst_number}</span>}
            </div>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {[['Contract', lakh(s.value), ''], ['Material issued', lakh(s.issuedValue), ''], ['Wastage', `${s.wastePct.toFixed(1)}%`, s.wastePct > WASTE_LIMIT ? 'text-bad' : 'text-good']].map(([l, v, cl]) => (
            <div key={l} className="card px-4 py-3"><div className="eyebrow">{l}</div><div className={'num text-[19px] font-semibold ' + cl}>{v}</div></div>
          ))}
        </div>
      </div>
      {overLimit.length > 0 && (
        <div className="flex items-start gap-2 rounded-2xl border border-bad/30 bg-[color-mix(in_srgb,var(--bad)_8%,transparent)] p-4 text-[13.5px]">
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-bad" />
          <span>{overLimit.map((r, i) => (
            <span key={r.material_id}>{i > 0 && '; '}<b>{r.name} wastage is {r.pct.toFixed(1)}%</b> ({inr(r.wastage * r.unit_cost)})</span>
          ))}, above the {WASTE_LIMIT}% limit. Check the Materials tab and the crew’s usage logs.</span>
        </div>
      )}
      <Tabs tabs={[
        { id: 'plan', label: <span className="inline-flex items-center gap-1.5">Plan vs actual <i className="size-2 rounded-full" style={{ background: STATE_COLOR[roll.state] }} /></span>, content: plan },
        { id: 'work', label: `Work packages (${(wps || []).length})`, content: work },
        { id: 'materials', label: 'Materials', content: materials },
        { id: 'requests', label: `Requests (${(reqs || []).filter((r) => r.status !== 'issued' && r.status !== 'rejected').length} open)`, content: requests },
        { id: 'team', label: `Crew (${(crew || []).length})`, content: team },
      ]} />
      <details className="card p-5">
        <summary className="cursor-pointer text-[14px] font-semibold">Portal login {c.user_id ? '· linked' : '· not linked'}</summary>
        <p className="mt-2 text-[13px] text-ink-2">Link the contractor’s login so they can update progress, request material and record usage from their phone.</p>
        <ActionForm action={linkLogin} className="mt-3 flex flex-wrap items-end gap-2">
          <input type="hidden" name="kind" value="contractor" /><input type="hidden" name="id" value={c.id} />
          <div><label className="label" htmlFor="le">Login email</label><input id="le" name="email" type="email" className="input" placeholder={c.email || 'name@company.com'} /></div>
          <SubmitButton className="btn btn-outline">Link login</SubmitButton>
        </ActionForm>
      </details>
    </>
  );
}
