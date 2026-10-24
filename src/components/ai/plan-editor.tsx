'use client';
import { useState, useTransition } from 'react';
import { Loader2, Plus, Trash2, Wand2 } from 'lucide-react';
import { useToast } from '@/components/ui/toast';
import { generateBaseline, saveBudget, savePlan } from '@/app/console/ai-actions';

type Pt = { planned_date: string; planned_pct: number };

/** Edit a work package's baseline: planned % by date, plus the planned quantity (BOQ). */
export function PlanEditor({ wpId, points, plannedQty, qtyUnit }: { wpId: string; points: Pt[]; plannedQty: number | null; qtyUnit: string | null }) {
  const toast = useToast();
  const [rows, setRows] = useState<Pt[]>(points.length ? points : []);
  const [q, setQ] = useState(plannedQty != null ? String(plannedQty) : '');
  const [unit, setUnit] = useState(qtyUnit || '');
  const [pending, start] = useTransition();
  const set = (i: number, k: keyof Pt, v: string) => setRows((r) => r.map((x, j) => (j === i ? { ...x, [k]: k === 'planned_pct' ? Number(v) : v } : x)));
  return (
    <div className="grid gap-3">
      <div className="grid gap-1.5">
        <div className="grid grid-cols-[1fr_90px_36px] gap-2 text-[11.5px] font-semibold uppercase tracking-wide text-ink-3"><span>Date</span><span>Planned %</span><span /></div>
        {rows.map((r, i) => (
          <div key={i} className="grid grid-cols-[1fr_90px_36px] gap-2">
            <input type="date" className="input !py-1.5" value={r.planned_date} onChange={(e) => set(i, 'planned_date', e.target.value)} aria-label="Date" />
            <input type="number" min={0} max={100} step={0.5} className="input num !py-1.5" value={r.planned_pct} onChange={(e) => set(i, 'planned_pct', e.target.value)} aria-label="Planned percent" />
            <button className="btn btn-ghost !p-2" onClick={() => setRows(rows.filter((_, j) => j !== i))} aria-label="Remove point"><Trash2 className="size-4" /></button>
          </div>
        ))}
        {!rows.length && <p className="text-[12.5px] text-ink-3">No baseline yet. Generate one from the start and due dates, then adjust.</p>}
      </div>
      <div className="flex flex-wrap gap-2">
        <button className="btn btn-sm" onClick={() => setRows([...rows, { planned_date: rows.at(-1)?.planned_date || new Date().toISOString().slice(0, 10), planned_pct: Math.min(100, (rows.at(-1)?.planned_pct ?? 0) + 10) }])}><Plus className="size-4" />Add point</button>
        <button className="btn btn-sm" disabled={pending} onClick={() => start(async () => { const r = await generateBaseline(wpId); if (r.ok && r.points) setRows(r.points); else toast(r.error || 'Could not generate', 'error'); })}><Wand2 className="size-4" />Generate S-curve</button>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div><label className="label">Planned quantity</label><input className="input num" inputMode="decimal" value={q} onChange={(e) => setQ(e.target.value)} placeholder="2400" /></div>
        <div><label className="label">Unit</label><input className="input" value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="m of road" /></div>
      </div>
      <button className="btn btn-primary" disabled={pending} onClick={() => start(async () => {
        const r = await savePlan(wpId, rows, { planned_qty: q ? Number(q) : null, qty_unit: unit || null });
        toast(r.ok ? r.message || 'Saved' : r.error || 'Could not save', r.ok ? 'success' : 'error');
      })}>{pending && <Loader2 className="size-4 animate-spin" />}Save baseline</button>
    </div>
  );
}

/** Planned material for a work package, so usage can be compared with the work done. */
export function BudgetEditor({ wpId, materials, budgets }: { wpId: string; materials: { id: string; name: string; unit: string }[]; budgets: { material_id: string; planned_qty: number }[] }) {
  const toast = useToast();
  const [pending, start] = useTransition();
  const [mat, setMat] = useState(materials.find((m) => !budgets.some((b) => b.material_id === m.id))?.id || materials[0]?.id || '');
  const [qty, setQty] = useState('');
  const save = (materialId: string, v: number | null) => start(async () => { const r = await saveBudget(wpId, materialId, v); toast(r.ok ? r.message || 'Saved' : r.error || 'Could not save', r.ok ? 'success' : 'error'); if (r.ok) setQty(''); });
  return (
    <div className="grid gap-2">
      {budgets.length > 0 && (
        <ul className="grid gap-1 text-[13px]">
          {budgets.map((b) => { const m = materials.find((x) => x.id === b.material_id); return (
            <li key={b.material_id} className="flex items-center justify-between gap-2"><span>{m?.name}</span>
              <span className="flex items-center gap-1"><span className="num">{b.planned_qty.toLocaleString('en-IN')} {m?.unit}</span>
                <button className="btn btn-ghost !p-1.5" disabled={pending} onClick={() => save(b.material_id, null)} aria-label={`Remove ${m?.name}`}><Trash2 className="size-3.5" /></button></span></li>
          ); })}
        </ul>
      )}
      <div className="flex flex-wrap items-end gap-2">
        <div className="min-w-[160px] flex-1"><label className="label">Material</label><select className="input" value={mat} onChange={(e) => setMat(e.target.value)}>{materials.map((m) => <option key={m.id} value={m.id}>{m.name} ({m.unit})</option>)}</select></div>
        <div className="w-28"><label className="label">For the whole job</label><input className="input num" inputMode="decimal" value={qty} onChange={(e) => setQty(e.target.value)} /></div>
        <button className="btn btn-outline" disabled={pending || !mat || !Number(qty)} onClick={() => save(mat, Number(qty))}>{pending ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}Set</button>
      </div>
    </div>
  );
}
