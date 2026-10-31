import { requirePartner } from '@/lib/auth';
import { date, inr, qty, todayIST } from '@/lib/format';
import { MILESTONES } from '@/lib/site';
import { Pill, Section, PageHeader } from '@/components/ui/bits';
import { ProgressBar } from '@/components/ui/motion';
import { ActionForm, SubmitButton } from '@/components/ui/action-form';
import { UsageBars } from '@/components/console/usage-bars';
import { LiveRefresh } from '@/components/live-refresh';
import { STATE_LABEL, wpHealth } from '@/lib/ai/plan';
import { SCurve, STATE_COLOR, CurveLegend } from '@/components/ai/bits';
import { logProgress, logUsage, requestMaterial } from '../actions';

export const metadata = { title: 'Work' };

export default async function ContractorWork() {
  const { supabase } = await requirePartner('contractor');
  const { data: cid } = await supabase.rpc('my_contractor_id');
  const [{ data: wps }, { data: usage }, { data: reqs }, { data: mats }, { data: milestones }, { data: projects }] = await Promise.all([
    supabase.from('work_packages').select('*').eq('contractor_id', cid!).order('due_date'),
    supabase.from('contractor_material_usage').select('*').eq('contractor_id', cid!),
    supabase.from('material_requests').select('*, materials(name, unit)').eq('contractor_id', cid!).order('created_at', { ascending: false }).limit(15),
    supabase.from('materials').select('id, name, unit').order('name'),
    supabase.from('milestones').select('id, key, name'),
    supabase.from('projects').select('id, name'),
  ]);
  const ids = (wps || []).map((w) => w.id);
  const [{ data: points }, { data: plog }] = ids.length ? await Promise.all([
    supabase.from('wp_plan_points').select('work_package_id, planned_date, planned_pct').in('work_package_id', ids).order('planned_date'),
    supabase.from('wp_progress_log').select('work_package_id, progress, logged_at, note').in('work_package_id', ids).order('logged_at'),
  ]) : [{ data: [] }, { data: [] }];
  const today = todayIST();
  const health = (wps || []).map((w) => wpHealth(w, (points || []).filter((p) => p.work_package_id === w.id), (plog || []).filter((l) => l.work_package_id === w.id), today));
  const ms = Object.fromEntries((milestones || []).map((m) => [m.id, m]));
  const pname = Object.fromEntries((projects || []).map((p) => [p.id, p.name]));
  const rows = (usage || []).map((x) => ({ material_id: x.material_id!, name: x.name!, unit: x.unit!, issued: Number(x.issued), consumed: Number(x.consumed), wastage: Number(x.wastage), returned: Number(x.returned), at_site: Number(x.at_site), unit_cost: Number(x.unit_cost || 0) }));
  const projectId = wps?.[0]?.project_id;
  return (
    <>
      <LiveRefresh tables={['work_packages', 'material_requests', 'stock_movements']} every={30000} />
      <PageHeader emoji="🏗️" title="Work packages and materials" sub={<>Log progress at the end of each day. The developer sees it live, and it decides how much you can bill.</>} />

      <section id="progress" className="grid gap-4">
        {(wps || []).map((w) => {
          const m = w.milestone_id ? ms[w.milestone_id] : null, color = MILESTONES.find((x) => x.key === m?.key)?.color || 'var(--accent)';
          const h = health.find((x) => x.id === w.id)!;
          const log = (plog || []).filter((l) => l.work_package_id === w.id).slice(-4).reverse();
          return (
            <div key={w.id} className="card grid gap-3 p-5">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div><div className="text-[16px] font-semibold">{w.title}</div>
                  <div className="text-[12.5px] text-ink-3">{pname[w.project_id] ?? ''} · due {date(w.due_date)} · contract {inr(w.contract_value)}{h.state !== 'done' && h.forecast ? ` · at this pace ${date(h.forecast)}` : ''}</div></div>
                <span className="rounded-full px-2 py-0.5 text-[11.5px] font-bold" style={{ color: STATE_COLOR[h.state], background: `color-mix(in srgb, ${STATE_COLOR[h.state]} 13%, transparent)` }}>{STATE_LABEL[h.state]}</span>
              </div>
              {w.scope && <p className="text-[13px] text-ink-2">{w.scope}</p>}
              <div className="flex items-center gap-3"><ProgressBar value={Number(w.progress)} color={color} /><span className="num text-[13px] font-semibold">{Math.round(Number(w.progress))}%</span><span className="num whitespace-nowrap text-[12px] text-ink-3">plan {Math.round(h.planned)}%</span></div>
              {h.state !== 'done' && <details><summary className="cursor-pointer text-[12.5px] text-ink-3">Plan vs actual chart</summary><div className="mt-2"><SCurve planned={h.curve.planned} actual={h.curve.actual} today={today} forecast={h.forecast} due={h.due} height={140} /><CurveLegend /></div></details>}
              {w.status !== 'completed' && (
                <ActionForm action={logProgress} reset={false} className="flex flex-wrap items-end gap-2 rounded-xl bg-surface-2 p-3">
                  <input type="hidden" name="id" value={w.id} />
                  <div><label className="label" htmlFor={`p-${w.id}`}>Now at %</label><input id={`p-${w.id}`} name="progress" type="number" min={0} max={100} step={0.5} defaultValue={Math.round(Number(w.progress))} className="input num !w-24" /></div>
                  <div className="min-w-[200px] flex-1"><label className="label" htmlFor={`n-${w.id}`}>What was done today</label><input id={`n-${w.id}`} name="note" className="input" placeholder="e.g. Slab 12 reinforcement 60% tied" /></div>
                  <SubmitButton className="btn btn-primary">Update</SubmitButton>
                </ActionForm>
              )}
              {log.length > 0 && <ul className="grid gap-1 text-[12.5px] text-ink-2">{log.map((l, i) => <li key={i} className="flex gap-2"><span className="num w-24 shrink-0 text-ink-3">{date(l.logged_at)}</span><span className="num w-12 shrink-0">{Math.round(Number(l.progress))}%</span><span>{l.note}</span></li>)}</ul>}
            </div>
          );
        })}
      </section>

      <div id="materials" className="grid gap-5 lg:grid-cols-2">
        <Section title="Request material from the store">
          <ActionForm action={requestMaterial} className="grid grid-cols-2 gap-3">
            <div className="col-span-2"><label className="label" htmlFor="rm">Material</label><select id="rm" name="material_id" className="input">{(mats || []).map((m) => <option key={m.id} value={m.id}>{m.name} ({m.unit})</option>)}</select></div>
            <div><label className="label" htmlFor="rq">Quantity</label><input id="rq" name="quantity" className="input num" inputMode="decimal" required /></div>
            <div><label className="label" htmlFor="rd">Needed by</label><input id="rd" name="needed_by" type="date" className="input" min={today} /></div>
            <div><label className="label" htmlFor="rw">For work</label><select id="rw" name="work_package_id" className="input"><option value="">—</option>{(wps || []).map((w) => <option key={w.id} value={w.id}>{w.title}</option>)}</select></div>
            <div><label className="label" htmlFor="rl">Location</label><input id="rl" name="location" className="input" placeholder="Tower A, level 12" /></div>
            <div className="col-span-2"><label className="label" htmlFor="rp">Purpose</label><input id="rp" name="purpose" className="input" placeholder="Slab 12 casting" /></div>
            <SubmitButton className="btn btn-primary col-span-2">Send request</SubmitButton>
          </ActionForm>
          {(reqs || []).length > 0 && (
            <ul className="mt-4 divide-y divide-line border-t border-line">
              {reqs!.map((r) => { const m = r.materials as unknown as { name: string; unit: string }; return (
                <li key={r.id} className="flex items-center justify-between gap-3 py-2.5 text-[13.5px]"><span><span className="num text-ink-3">MR-{String(r.seq).padStart(4, '0')}</span> · {qty(r.quantity)} {m.unit} {m.name}<span className="block text-[11.5px] text-ink-3">{date(r.created_at)}{r.needed_by ? ` · needed ${date(r.needed_by)}` : ''}</span></span><Pill status={r.status} /></li>
              ); })}
            </ul>
          )}
        </Section>
        <Section title="Material with my team">
          {rows.length === 0 ? <p className="text-[13.5px] text-ink-2">Nothing issued to you yet.</p> : (
            <>
              <UsageBars rows={rows} />
              {projectId && (
                <ActionForm action={logUsage} className="mt-5 grid grid-cols-2 gap-3 border-t border-line pt-4">
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
      </div>
    </>
  );
}
