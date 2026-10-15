'use client';
import { useMemo, useRef, useState } from 'react';
import { bbox, liveStatus, pathToPoints, STATUS_COLOR } from '@/lib/site';
import type { PlotShape, SiteLayout } from '@/lib/types';

/** The layout plan in 2D: roads, park, clubhouse and one shape per plot. */
export function PlotMap2D({ plots, layout, selectedId, onSelect, matches, className = '', zoomable = false, fill = false }: {
  plots: PlotShape[]; layout: SiteLayout; selectedId?: string | null; onSelect?: (p: PlotShape) => void;
  matches?: (p: PlotShape) => boolean; className?: string; zoomable?: boolean; fill?: boolean;
}) {
  const [vx, vy, vw, vh] = layout.viewBox;
  const [vb, setVb] = useState({ x: vx, y: vy, w: vw, h: vh });
  const drag = useRef<{ x: number; y: number; vb: typeof vb; moved: boolean; w: number } | null>(null);
  const shapes = useMemo(() => plots.map((p) => {
    const pts = pathToPoints(p.shape_path);
    return { p, box: pts.length ? bbox(pts) : null };
  }), [plots]);
  const zoom = (f: number) => setVb((v) => {
    const w = Math.min(vw, Math.max(vw / 4, v.w * f)), h = w * (vh / vw);
    const cx = v.x + v.w / 2, cy = v.y + v.h / 2;
    return { x: Math.min(Math.max(vx, cx - w / 2), vx + vw - w), y: Math.min(Math.max(vy, cy - h / 2), vy + vh - h), w, h };
  });
  return (
    <div className={'relative select-none ' + className} style={{ touchAction: zoomable ? 'none' : undefined }}
      onPointerDown={(e) => { if (zoomable && vb.w < vw) drag.current = { x: e.clientX, y: e.clientY, vb, moved: false, w: e.currentTarget.clientWidth }; }}
      onPointerMove={(e) => {
        const d = drag.current; if (!d) return;
        const k = d.vb.w / d.w, dx = (e.clientX - d.x) * k, dy = (e.clientY - d.y) * k;
        if (Math.abs(dx) + Math.abs(dy) > 3) d.moved = true;
        setVb({ ...d.vb, x: Math.min(Math.max(vx, d.vb.x - dx), vx + vw - d.vb.w), y: Math.min(Math.max(vy, d.vb.y - dy), vy + vh - d.vb.h) });
      }}
      onPointerUp={() => setTimeout(() => { drag.current = null; }, 0)} onPointerLeave={() => { drag.current = null; }}>
      <svg viewBox={`${vb.x} ${vb.y} ${vb.w} ${vb.h}`} className={fill ? 'block h-full w-full' : 'block h-auto w-full'} role="img" aria-label="Site layout with plots coloured by status">
        <defs>
          <pattern id="hatch2d" width="10" height="10" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <rect width="10" height="10" fill={STATUS_COLOR.blocked} fillOpacity="0.25" />
            <line x1="0" y1="0" x2="0" y2="10" stroke={STATUS_COLOR.blocked} strokeWidth="4" />
          </pattern>
        </defs>
        <rect x={vx} y={vy} width={vw} height={vh} fill="color-mix(in srgb, var(--surface-2) 70%, #cdb995 30%)" />
        <rect {...xywh(layout.boundary)} fill="none" stroke="var(--ink-3)" strokeWidth="3" strokeDasharray="14 6" />
        {layout.roads.map((r, i) => <rect key={i} {...xywh(r)} fill="color-mix(in srgb, var(--ink-3) 45%, var(--surface-2))" />)}
        {layout.roads.filter((r) => r.label).map((r, i) => {
          const horizontal = r.w >= r.h, cx = r.x + r.w / 2, cy = r.y + r.h / 2;
          const tx = horizontal ? (r.main ? 280 : cx) : cx, ty = horizontal ? cy : (r.main ? 190 : cy);
          return <text key={i} x={tx} y={ty + 5} textAnchor="middle" fontSize="15" fontFamily="var(--font-mono)" fill="var(--surface)"
            transform={horizontal ? undefined : `rotate(-90 ${tx} ${ty + 5})`}>{r.label}</text>;
        })}
        {layout.park && <>
          <rect {...xywh(layout.park)} rx="6" fill="color-mix(in srgb, var(--st-available) 30%, var(--surface))" />
          <text x={layout.park.x + layout.park.w / 2} y={layout.park.y + 60} textAnchor="middle" fontSize="20" fontWeight="600" fill="var(--ink-2)" fontFamily="var(--font-display)">{layout.park.label}</text>
        </>}
        {layout.clubhouse && <>
          <rect {...xywh(layout.clubhouse)} rx="4" fill="var(--surface)" stroke="var(--ink-3)" />
          <text x={layout.clubhouse.x + layout.clubhouse.w / 2} y={layout.clubhouse.y + layout.clubhouse.h / 2 + 5} textAnchor="middle" fontSize="15" fill="var(--ink-2)">{layout.clubhouse.label}</text>
        </>}
        {layout.water_tank && <circle cx={layout.water_tank.x} cy={layout.water_tank.y} r="12" fill="var(--st-booked)" fillOpacity=".5" stroke="var(--st-booked)" />}
        {layout.gate && <text x={layout.gate.x + 60} y={vh - 4} fontSize="16" fontWeight="600" fill="var(--ink-2)">↑ {layout.gate.label}</text>}
        {layout.north && <g transform={`translate(${layout.north.x} ${layout.north.y})`}>
          <circle r="17" fill="var(--surface)" stroke="var(--ink-3)" /><path d="M0 -11 L5 4 L0 1 L-5 4 Z" fill="var(--ink)" />
          <text y="-22" textAnchor="middle" fontSize="15" fontWeight="700" fill="var(--ink-2)">N</text></g>}
        {shapes.map(({ p, box }) => {
          if (!box) return null;
          const st = liveStatus(p), on = matches ? matches(p) : true, sel = p.id === selectedId;
          const fs = Math.min(26, box.w / 2.6, box.h / 1.6);
          return (
            <g key={p.id} role={onSelect ? 'button' : undefined} tabIndex={onSelect ? 0 : undefined}
              aria-label={`Plot ${p.plot_number}, ${Number(p.area_sqft)} sq ft, ${st}`}
              className={onSelect ? 'cursor-pointer outline-none [&:hover>path]:brightness-110 [&:focus-visible>path]:stroke-[var(--ink)]' : ''}
              onClick={() => { if (!drag.current?.moved && onSelect) onSelect(p); }}
              onKeyDown={(e) => { if ((e.key === 'Enter' || e.key === ' ') && onSelect) { e.preventDefault(); onSelect(p); } }}>
              <path d={p.shape_path!} fill={st === 'blocked' ? 'url(#hatch2d)' : STATUS_COLOR[st]} fillOpacity={on ? 0.9 : 0.15}
                stroke={sel ? 'var(--ink)' : 'var(--surface)'} strokeWidth={sel ? 5 : 2} className={st === 'held' ? 'animate-pulse' : ''} />
              <text x={box.cx} y={box.cy + fs * 0.36} textAnchor="middle" fontSize={fs} fontWeight="600" fontFamily="var(--font-mono)"
                fill={on ? '#fff' : 'var(--ink-3)'} pointerEvents="none">{p.plot_number}</text>
            </g>
          );
        })}
      </svg>
      {zoomable && (
        <div className="absolute bottom-3 right-3 flex flex-col gap-1">
          {[['+', 0.7, 'Zoom in'], ['−', 1 / 0.7, 'Zoom out']].map(([t, f, l]) => (
            <button key={t as string} className="btn btn-outline btn-sm size-8 !p-0 text-base" aria-label={l as string} onClick={() => zoom(f as number)}>{t}</button>
          ))}
          <button className="btn btn-outline btn-sm size-8 !p-0 text-[11px]" aria-label="Reset zoom" onClick={() => setVb({ x: vx, y: vy, w: vw, h: vh })}>1×</button>
        </div>
      )}
    </div>
  );
}
const xywh = (r: { x: number; y: number; w: number; h: number }) => ({ x: r.x, y: r.y, width: r.w, height: r.h });
