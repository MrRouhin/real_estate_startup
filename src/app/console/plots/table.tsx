'use client';
import { useState, useTransition } from 'react';
import { FileUp, Lock, Pencil, Search, TrendingUp, Unlock } from 'lucide-react';
import { ActionForm, SubmitButton } from '@/components/ui/action-form';
import { PlotPill } from '@/components/ui/bits';
import { Sheet } from '@/components/ui/sheet';
import { useToast } from '@/components/ui/toast';
import { importPlots, revisePrices, setPlotPrice, togglePlotBlock } from '../actions';
import { liveStatus, rate } from '@/lib/site';
import { cap, inr, lakh } from '@/lib/format';
import type { Plot, PlotStatus } from '@/lib/types';

type Row = Plot & { buyer: string | null };

export function PlotTable({ plots }: { plots: Row[] }) {
  const [q, setQ] = useState('');
  const [status, setStatus] = useState<PlotStatus | 'all'>('all');
  const [edit, setEdit] = useState<Row | null>(null);
  const [revise, setRevise] = useState(false);
  const [csv, setCsv] = useState(false);
  const [, start] = useTransition();
  const toast = useToast();
  const rows = plots.filter((p) => (status === 'all' || liveStatus(p) === status) && (!q || p.plot_number.toLowerCase().includes(q.toLowerCase())));
  const counts = plots.reduce<Record<string, number>>((a, p) => { const s = liveStatus(p); a[s] = (a[s] || 0) + 1; return a; }, {});
  const unsoldValue = plots.filter((p) => ['available', 'held', 'blocked'].includes(liveStatus(p))).reduce((a, p) => a + Number(p.price), 0);

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <label className="relative"><Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-3" />
          <input className="input !w-48 !pl-9" placeholder="Plot number" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search plots" /></label>
        <div className="flex flex-wrap gap-1">
          {(['all', 'available', 'held', 'booked', 'sold', 'blocked'] as const).map((s) => (
            <button key={s} className="chip" aria-pressed={status === s} onClick={() => setStatus(s)}>{cap(s)} <span className="num opacity-70">{s === 'all' ? plots.length : counts[s] || 0}</span></button>
          ))}
        </div>
        <div className="ml-auto flex gap-2">
          <button className="btn btn-outline" onClick={() => setCsv(true)}><FileUp className="size-4" />Import CSV</button>
          <button className="btn btn-primary" onClick={() => setRevise(true)}><TrendingUp className="size-4" />Price revision</button>
        </div>
      </div>
      <div className="card scroll-x max-h-[70vh] overflow-y-auto">
        <table className="table min-w-[860px]">
          <thead><tr><th>Plot</th><th>Status</th><th className="r">Size</th><th>Facing</th><th className="r">Price</th><th className="r">₹/sq ft</th><th>Buyer</th><th /></tr></thead>
          <tbody>
            {rows.map((p) => {
              const st = liveStatus(p);
              return (
                <tr key={p.id}>
                  <td className="num font-semibold">{p.plot_number}{p.is_corner && <span className="tag ml-2 !text-[10.5px]">corner</span>}</td>
                  <td><PlotPill status={st} /></td>
                  <td className="r num">{Number(p.area_sqft)}</td>
                  <td>{cap(p.facing)}</td>
                  <td className="r num font-medium">{inr(p.price)}</td>
                  <td className="r num text-ink-2">{rate(p).toLocaleString('en-IN')}</td>
                  <td className="text-ink-2">{p.buyer || '—'}</td>
                  <td className="r whitespace-nowrap">
                    {['available', 'held', 'blocked'].includes(st) && <button className="btn btn-ghost btn-sm" onClick={() => setEdit(p)}><Pencil className="size-3.5" />Price</button>}
                    {(st === 'available' || st === 'blocked') && (
                      <button className="btn btn-ghost btn-sm" onClick={() => start(async () => { const r = await togglePlotBlock(p.id, st === 'available'); toast(r.ok ? r.message! : r.error!, r.ok ? 'success' : 'error'); })}>
                        {st === 'available' ? <><Lock className="size-3.5" />Block</> : <><Unlock className="size-3.5" />Release</>}</button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <Sheet open={!!edit} onClose={() => setEdit(null)} title={`Change price of ${edit?.plot_number}`}>
        {edit && (
          <ActionForm action={setPlotPrice} onDone={() => setEdit(null)} className="grid gap-3">
            <input type="hidden" name="id" value={edit.id} />
            <p className="text-[13.5px] text-ink-2">Current price <b className="num text-ink">{inr(edit.price)}</b> (₹{rate(edit).toLocaleString('en-IN')}/sq ft for {Number(edit.area_sqft)} sq ft).</p>
            <div><label className="label" htmlFor="np">New price (₹)</label><input id="np" name="price" className="input num text-[18px]" defaultValue={Number(edit.price)} inputMode="numeric" autoFocus /></div>
            <SubmitButton>Save new price</SubmitButton>
          </ActionForm>
        )}
      </Sheet>

      <Sheet open={revise} onClose={() => setRevise(false)} title="Price revision">
        <ActionForm action={revisePrices} onDone={() => setRevise(false)} className="grid gap-3">
          <p className="text-[13.5px] text-ink-2">Raises every unsold plot (available, being booked or blocked). Unsold stock is worth <b className="num text-ink">{lakh(unsoldValue)}</b> today.</p>
          <div className="grid grid-cols-5 gap-2">
            {[2, 3, 5, 8, 10].map((x) => (
              <label key={x} className="cursor-pointer"><input type="radio" name="pct" value={x} defaultChecked={x === 5} className="peer sr-only" />
                <span className="chip w-full justify-center peer-checked:border-ink peer-checked:bg-ink peer-checked:text-bg">+{x}%</span></label>
            ))}
          </div>
          <SubmitButton pendingText="Revising…">Apply revision</SubmitButton>
        </ActionForm>
      </Sheet>

      <Sheet open={csv} onClose={() => setCsv(false)} title="Import plots from CSV" wide>
        <ActionForm action={importPlots} onDone={() => setCsv(false)} className="grid gap-3">
          <p className="text-[13.5px] text-ink-2">Paste rows from Excel saved as CSV. First line is the header. New plots appear on the map once their outline is added to the layout.</p>
          <textarea name="csv" rows={8} className="input num text-[12.5px]" defaultValue={'plot_number,area_sqft,dimensions,facing,is_corner,price\nE01,1200,30x40,east,yes,2980000\nE02,1500,30x50,east,no,3620000'} />
          <SubmitButton pendingText="Importing…">Import plots</SubmitButton>
        </ActionForm>
      </Sheet>
    </div>
  );
}
