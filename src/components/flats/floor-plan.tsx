'use client';
// 2D floor plan drawn from the same layout data as the 3D tour: walls, windows, door swings,
// furniture, room names with sizes, a north arrow, and (in the tour) where you are standing.
import { useMemo } from 'react';
import { buildWalls, footprintRect, resolveOpenings, roomSize, roomSqft, type Layout, type RoomKind } from '@/lib/flats/layout';

const FILL: Record<RoomKind, string> = {
  living: '#f4efe6', bedroom: '#eef1ea', kitchen: '#f3ece4', bath: '#e6eef1', balcony: '#e9efe3', foyer: '#f4efe6', passage: '#f4efe6', dress: '#eef1ea', utility: '#ecebe6',
};

export function FloorPlan({ layout: L, facingDeg, pose, active, onRoom, furniture = true, labels = true, compact = false, className }: {
  layout: Layout; /** compass bearing the balcony side (+y) faces */ facingDeg?: number;
  pose?: { x: number; y: number; yaw: number; fov?: number } | null; active?: string | null;
  onRoom?: (id: string) => void; furniture?: boolean; labels?: boolean; compact?: boolean; className?: string;
}) {
  const walls = useMemo(() => buildWalls(L), [L]);
  const ops = useMemo(() => resolveOpenings(L), [L]);
  const pad = compact ? 0.35 : 0.9;
  const fs = compact ? 0.42 : 0.3;
  // north direction in plan coordinates (y down): balcony (+y) faces `northDeg`
  const nd = facingDeg == null ? null : { x: Math.sin((facingDeg * Math.PI) / 180), y: Math.cos((facingDeg * Math.PI) / 180) };
  return (
    <svg viewBox={`${-pad} ${-pad} ${L.w + pad * 2} ${L.d + pad * 2}`} className={className} role="img" aria-label="Floor plan">
      {L.rooms.map((r) => (
        <rect key={r.id} x={r.x} y={r.y} width={r.w} height={r.d} fill={active === r.id ? '#d6efe9' : FILL[r.kind]}
          style={{ cursor: onRoom ? 'pointer' : undefined, transition: 'fill .2s' }} onClick={onRoom ? () => onRoom(r.id) : undefined} />
      ))}
      {furniture && L.furniture.map((f, i) => {
        const b = footprintRect(f);
        if (!b || f.type === 'plant' || f.type === 'floor_lamp') return null;
        return <rect key={i} x={b.x0} y={b.y0} width={b.x1 - b.x0} height={b.y1 - b.y0} rx={0.06} fill="none" stroke="#b8b0a2" strokeWidth={0.025} pointerEvents="none" />;
      })}
      {walls.map((p, i) => {
        if (p.bottom > 0) return null;
        const t = p.thickness, a = p.fixed + p.offset - t / 2;
        const rect = p.axis === 'x' ? { x: p.from, y: a, width: p.to - p.from, height: t } : { x: a, y: p.from, width: t, height: p.to - p.from };
        const low = p.top < 1.5; // under a window, or a balcony railing
        return low
          ? <g key={i} pointerEvents="none"><rect {...rect} fill="#ffffff" stroke="#5b6b73" strokeWidth={0.02} />
              {p.axis === 'x' ? <line x1={p.from} x2={p.to} y1={a + t / 2} y2={a + t / 2} stroke="#5b6b73" strokeWidth={0.02} /> : <line y1={p.from} y2={p.to} x1={a + t / 2} x2={a + t / 2} stroke="#5b6b73" strokeWidth={0.02} />}</g>
          : <rect key={i} {...rect} fill="#24302d" pointerEvents="none" />;
      })}
      {ops.filter((o) => o.type === 'door' || o.type === 'entry').map((o, i) => {
        const w = o.to - o.from, r0 = L.rooms.find((r) => r.id === o.rooms[0]);
        const into = r0 ? ((o.axis === 'x' ? r0.y + r0.d / 2 : r0.x + r0.w / 2) > o.fixed ? 1 : -1) : 1;
        const hx = o.axis === 'x' ? o.from : o.fixed, hy = o.axis === 'x' ? o.fixed : o.from;
        const ex = o.axis === 'x' ? o.from : o.fixed + into * w, ey = o.axis === 'x' ? o.fixed + into * w : o.from;
        const cx = o.axis === 'x' ? o.to : o.fixed, cy = o.axis === 'x' ? o.fixed : o.to;
        const sweep = o.axis === 'x' ? (into > 0 ? 1 : 0) : (into > 0 ? 0 : 1);
        return (
          <g key={i} pointerEvents="none">
            <line x1={hx} y1={hy} x2={ex} y2={ey} stroke="#24302d" strokeWidth={0.035} />
            <path d={`M ${cx} ${cy} A ${w} ${w} 0 0 ${sweep} ${ex} ${ey}`} fill="none" stroke="#7d8a86" strokeWidth={0.02} strokeDasharray="0.06 0.05" />
          </g>
        );
      })}
      {ops.filter((o) => o.type === 'slider').map((o, i) => (
        <g key={'s' + i} pointerEvents="none">
          {o.axis === 'x'
            ? <><line x1={o.from} x2={(o.from + o.to) / 2 + 0.1} y1={o.fixed - 0.03} y2={o.fixed - 0.03} stroke="#5b6b73" strokeWidth={0.03} /><line x1={(o.from + o.to) / 2 - 0.1} x2={o.to} y1={o.fixed + 0.03} y2={o.fixed + 0.03} stroke="#5b6b73" strokeWidth={0.03} /></>
            : <><line y1={o.from} y2={(o.from + o.to) / 2 + 0.1} x1={o.fixed - 0.03} x2={o.fixed - 0.03} stroke="#5b6b73" strokeWidth={0.03} /><line y1={(o.from + o.to) / 2 - 0.1} y2={o.to} x1={o.fixed + 0.03} x2={o.fixed + 0.03} stroke="#5b6b73" strokeWidth={0.03} /></>}
        </g>
      ))}
      {!compact && ops.filter((o) => o.type === 'entry').map((o, i) => {
        const mx = (o.from + o.to) / 2;
        return <text key={'e' + i} x={mx} y={o.fixed - 0.22} textAnchor="middle" fontSize={fs * 0.8} fill="#0f766e" fontWeight={700} pointerEvents="none">ENTRY ↓</text>;
      })}
      {labels && L.rooms.filter((r) => r.kind !== 'passage').map((r) => {
        const small = r.w < 2.3 || r.d < 1.6;
        return (
          <g key={'t' + r.id} pointerEvents="none">
            <text x={r.x + r.w / 2} y={r.y + r.d / 2 - (compact || small ? 0 : fs * 0.3)} textAnchor="middle" dominantBaseline="middle" fontSize={small ? fs * 0.78 : fs} fontWeight={650} fill="#1d2b28">
              {compact ? r.name.replace(' bedroom', '').replace('Common bathroom', 'Bath').replace('Master bathroom', 'Bath').replace('Living and dining', 'Living') : r.name}
            </text>
            {!compact && !small && <text x={r.x + r.w / 2} y={r.y + r.d / 2 + fs * 0.85} textAnchor="middle" dominantBaseline="middle" fontSize={fs * 0.78} fill="#55635f">{roomSize(r)} · {roomSqft(r)} sq ft</text>}
          </g>
        );
      })}
      {nd && (
        <g transform={`translate(${L.w + pad * 0.45} ${-pad * 0.45})`} pointerEvents="none">
          <circle r={pad * 0.36} fill="#ffffff" stroke="#c9d1cf" strokeWidth={0.02} />
          {(() => { const s = pad * 0.24, b = pad * 0.1; return <path d={`M ${nd.x * s} ${nd.y * s} L ${-nd.y * b - nd.x * s * 0.55} ${nd.x * b - nd.y * s * 0.55} L ${nd.y * b - nd.x * s * 0.55} ${-nd.x * b - nd.y * s * 0.55} Z`} fill="#c2410c" />; })()}
          <text x={-nd.x * pad * 0.2} y={-nd.y * pad * 0.2} textAnchor="middle" dominantBaseline="middle" fontSize={fs * 0.6} fontWeight={700} fill="#c2410c">N</text>
        </g>
      )}
      {pose && (() => {
        const half = (((pose.fov ?? 62) * 1.25) / 2) * (Math.PI / 180), R = compact ? 2.2 : 1.6;
        const p1 = { x: pose.x + Math.sin(pose.yaw - half) * R, y: pose.y + Math.cos(pose.yaw - half) * R };
        const p2 = { x: pose.x + Math.sin(pose.yaw + half) * R, y: pose.y + Math.cos(pose.yaw + half) * R };
        return (
          <g pointerEvents="none">
            <path d={`M ${pose.x} ${pose.y} L ${p1.x} ${p1.y} A ${R} ${R} 0 0 0 ${p2.x} ${p2.y} Z`} fill="#0f766e" opacity={0.22} />
            <circle cx={pose.x} cy={pose.y} r={compact ? 0.28 : 0.2} fill="#0f766e" stroke="#fff" strokeWidth={0.06} />
          </g>
        );
      })()}
    </svg>
  );
}
